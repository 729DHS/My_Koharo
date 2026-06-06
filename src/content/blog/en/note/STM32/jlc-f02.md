---
title: JLC FreeRTOS Encoder + PWM + LED
link: jlc-freertos-encoder-led-demo
date: 2026-04-02 22:48:50
description: JLC Foundation Board FreeRTOS demo using an encoder and LED, with the onboard PB8 LED and EC11 encoder.
tags:
  - STM32
  - Embedded
  - Foundation Board
categories:
  - [笔记, STM32]
---

# EC11 Encoder LED Brightness Control Project

## 1. Project Overview

This project is based on the STM32F407 microcontroller and FreeRTOS operating system, implementing the function of controlling LED brightness using an EC11 encoder. The project uses three tasks (threads) working together to achieve non-blocking encoder reading, button detection, and LED brightness control.

## 2. Technical Framework

### 2.1 Hardware Platform
- **Microcontroller**: STM32F407
- **Encoder**: EC11 rotary encoder (connected to PD12 and PD13)
- **Button**: PC13 (encoder's built-in press function)
- **LED**: PB8 (brightness controlled via PWM)
- **Timer**: TIM10 (for PWM output)

### 2.2 Software Architecture
- **Development Environment**: STM32CubeMX + VScode
- **Operating System**: FreeRTOS
- **Library**: STM32 HAL library
- **Code Structure**: Standard STM32 HAL project structure + FreeRTOS task management

## 3. Code Structure Analysis

### 3.1 Header Files
```c
#include "main.h"
#include "cmsis_os.h"
```
Includes the main header file and CMSIS-OS header file, which define the basic configuration of the STM32 HAL library and FreeRTOS-related functions.

### 3.2 Global Variable Definitions
```c
/* USER CODE BEGIN PV */
uint8_t led_enabled = 1;
uint16_t pwm_duty = 0;
const uint16_t pwm_arr = 65535;
const uint16_t pwm_step = 1000;
/* USER CODE END PV */
```
- `led_enabled`: LED enable state (1=on, 0=off)
- `pwm_duty`: PWM duty cycle (0-65535)
- `pwm_arr`: PWM auto-reload value (timer period)
- `pwm_step`: PWM change step per encoder rotation

### 3.3 Task Handle Definitions
```c
/* USER CODE BEGIN EV */
osThreadId_t EncoderTaskHandle;
osThreadId_t KEYTaskHandle;
osThreadId_t LEDTaskHandle;
/* USER CODE END EV */
```
Defines handles for three tasks, used for task management.

### 3.4 Task Function Prototypes
```c
/* USER CODE BEGIN FunctionPrototypes */
void EncoderTask(void *argument);
void KEYTask(void *argument);
void LEDTask(void *argument);
/* USER CODE END FunctionPrototypes */
```

### 3.5 Encoder State Table
```c
const int8_t enc_table[16] = {
    0, -1,  1,  0,
    1,  0,  0, -1,
   -1, 0,  0,  1,
    0,  1, -1,  0
};
```
The state table for encoder rotation direction detection, used for table-lookup calculation of rotation direction.

## 4. Main Function Implementation

### 4.1 Main Function
```c
int main(void)
{
  /* System Initialization */
  HAL_Init();
  SystemClock_Config();
  MX_GPIO_Init();
  MX_TIM10_Init();
  MX_FREERTOS_Init();

  /* Start PWM Output */
  if (HAL_TIM_PWM_Start(&htim10, TIM_CHANNEL_1) != HAL_OK)
  {
    Error_Handler();
  }

  /* Start Task Scheduler */
  osKernelStart();

  /* Will never execute here */
  while (1)
  {
  }
}
```
The main function first performs system initialization, then configures GPIO, TIM10 timer, and FreeRTOS, and starts PWM output and the task scheduler.

### 4.2 Task Initialization
```c
void MX_FREERTOS_Init(void)
{
  /* Create Tasks */
  EncoderTaskHandle = osThreadNew(EncoderTask, NULL, &EncoderTask_attributes);
  KEYTaskHandle = osThreadNew(KEYTask, NULL, &KEYTask_attributes);
  LEDTaskHandle = osThreadNew(LEDTask, NULL, &LEDTask_attributes);
}
```
Uses the `osThreadNew` function to create three tasks and set task attributes.

### 4.3 Encoder Task
```c
void EncoderTask(void *argument)
{
  static uint8_t enc_last = 0;
  uint8_t enc_current;
  int8_t enc_dir;

  for (;;)
  {
    /* Read encoder state */
    enc_current = ((GPIOE->IDR & GPIO_PIN_12) >> 12) | ((GPIOE->IDR & GPIO_PIN_13) >> 12);

    /* Calculate rotation direction */
    enc_dir = enc_table[(enc_last << 2) | enc_current];
    enc_last = enc_current;

    /* Adjust PWM duty cycle based on direction */
    if (enc_dir > 0 && pwm_duty < pwm_arr)
    {
      pwm_duty += pwm_step;
      if (pwm_duty > pwm_arr) pwm_duty = pwm_arr;
    }
    else if (enc_dir < 0 && pwm_duty > 0)
    {
      pwm_duty -= pwm_step;
      if (pwm_duty > pwm_arr) pwm_duty = 0; // Prevent overflow
    }

    osDelay(10);
  }
}
```
The Encoder task uses a lookup table to detect encoder rotation direction and adjusts the PWM duty cycle accordingly.

### 4.4 KEY Task
```c
void KEYTask(void *argument)
{
  static uint8_t key_state = 0;
  static uint32_t key_time = 0;

  for (;;)
  {
    /* Button debounce processing */
    if (HAL_GPIO_ReadPin(GPIOC, GPIO_PIN_13) == GPIO_PIN_RESET)
    {
      if (key_state == 0)
      {
        key_state = 1;
        key_time = osKernelGetTickCount();
      }
      else if (key_state == 1)
      {
        if (osKernelGetTickCount() - key_time > 50)
        {
          key_state = 2;
          /* Toggle LED enable state */
          led_enabled = !led_enabled;
        }
      }
    }
    else
    {
      key_state = 0;
    }

    osDelay(10);
  }
}
```
The KEY task implements button debounce processing. When a button press is detected, it toggles the LED enable state.

### 4.5 LED Task
```c
void LEDTask(void *argument)
{
  for (;;)
  {
    /* Control LED brightness based on PWM duty cycle and LED enable state */
    uint16_t out = led_enabled ? (uint16_t)(pwm_arr - pwm_duty) : pwm_arr;
    __HAL_TIM_SET_COMPARE(&htim10, TIM_CHANNEL_1, out);

    osDelay(50);
  }
}
```
The LED task controls LED brightness via TIM10 PWM output. Since PB8 is active-low, the PWM duty cycle needs to be inverted.

### 4.6 TIM10 Timer Initialization
```c
static void MX_TIM10_Init(void)
{
  TIM_OC_InitTypeDef sConfigOC = {0};

  htim10.Instance = TIM10;
  htim10.Init.Prescaler = 0;
  htim10.Init.CounterMode = TIM_COUNTERMODE_UP;
  htim10.Init.Period = 65535;
  htim10.Init.ClockDivision = TIM_CLOCKDIVISION_DIV1;
  htim10.Init.AutoReloadPreload = TIM_AUTORELOAD_PRELOAD_DISABLE;
  if (HAL_TIM_Base_Init(&htim10) != HAL_OK)
  {
    Error_Handler();
  }
  if (HAL_TIM_PWM_Init(&htim10) != HAL_OK)
  {
    Error_Handler();
  }
  sConfigOC.OCMode = TIM_OCMODE_PWM1;
  sConfigOC.Pulse = 0;
  sConfigOC.OCPolarity = TIM_OCPOLARITY_HIGH;
  sConfigOC.OCFastMode = TIM_OCFAST_DISABLE;
  if (HAL_TIM_PWM_ConfigChannel(&htim10, &sConfigOC, TIM_CHANNEL_1) != HAL_OK)
  {
    Error_Handler();
  }
  HAL_TIM_MspPostInit(&htim10);
}
```
The TIM10 timer initialization function configures the timer's basic parameters and PWM output channel.

### 4.7 GPIO Initialization
```c
static void MX_GPIO_Init(void)
{
  GPIO_InitTypeDef GPIO_InitStruct = {0};

  /* GPIO Ports Clock Enable */
  __HAL_RCC_GPIOC_CLK_ENABLE();
  __HAL_RCC_GPIOD_CLK_ENABLE();
  __HAL_RCC_GPIOB_CLK_ENABLE();

  /* Configure PC13 as input */
  GPIO_InitStruct.Pin = GPIO_PIN_13;
  GPIO_InitStruct.Mode = GPIO_MODE_INPUT;
  GPIO_InitStruct.Pull = GPIO_PULLUP;
  HAL_GPIO_Init(GPIOC, &GPIO_InitStruct);

  /* Configure PD12 and PD13 as input */
  GPIO_InitStruct.Pin = GPIO_PIN_12|GPIO_PIN_13;
  GPIO_InitStruct.Mode = GPIO_MODE_INPUT;
  GPIO_InitStruct.Pull = GPIO_PULLUP;
  HAL_GPIO_Init(GPIOD, &GPIO_InitStruct);
}
```
The GPIO initialization function configures input pins for the button and encoder.

## 5. Technical Details

### 5.1 Encoder Working Principle

The EC11 encoder is a rotary position sensor that detects rotation direction through the phase difference between two output signals (Phase A and Phase B). When the encoder rotates clockwise, Phase A leads Phase B; when rotating counterclockwise, Phase B leads Phase A.

This project uses a lookup table to detect rotation direction. By reading the states of Phase A and Phase B, it calculates the current state code, then looks up the rotation direction based on the previous state code and current state code.

### 5.2 PWM Control Principle

PWM (Pulse Width Modulation) is a technique that controls a signal by changing the pulse width. In LED control, the PWM duty cycle (ratio of high-level time to the entire period) determines the LED's average brightness. Higher duty cycle means brighter LED; lower duty cycle means dimmer LED.

This project uses the TIM10 timer to generate a PWM signal. The timer clock is 84MHz (APB2 bus clock), prescaler is 0, and auto-reload value is 65535, so the PWM frequency is:

```plain
PWM frequency = Timer clock / (Prescaler + 1) / (Auto-reload value + 1) = 84MHz / 1 / 65536 ≈ 1281Hz
```

### 5.3 FreeRTOS Task Management

FreeRTOS is an open-source real-time operating system that provides task management, queues, semaphores, and other features. This project uses FreeRTOS task management to create three tasks:

- **Encoder Task**: Normal priority, responsible for reading encoder state and calculating rotation direction
- **KEY Task**: Low priority, responsible for detecting button state
- **LED Task**: Low priority, responsible for controlling LED brightness

The task scheduler determines which task gets CPU control based on task priority and state.

### 5.4 Button Debounce Processing

Buttons generate mechanical bouncing when pressed and released, causing multiple triggers. This project implements software debounce by detecting the sustained duration of the button state to determine whether the button is truly pressed. When the button state is sustained for more than 50ms, the button is considered pressed.

### 5.5 Inter-Task Communication

The current project uses global variables for inter-task communication. The Encoder task updates the `pwm_duty` variable, the KEY task updates the `led_enabled` variable, and the LED task reads these variables to control LED brightness.

## 6. Workflow

1. **System Initialization**:
   - Configure system clock
   - Initialize GPIO
   - Initialize TIM10 timer
   - Initialize FreeRTOS

2. **Task Creation**:
   - Create Encoder task
   - Create KEY task
   - Create LED task

3. **Task Execution**:
   - **Encoder Task**:
     - Read encoder state
     - Calculate rotation direction
     - Adjust PWM duty cycle based on direction
   - **KEY Task**:
     - Detect button state (with debounce)
     - Toggle LED enable state when button is pressed
   - **LED Task**:
     - Control LED brightness based on PWM duty cycle and LED enable state

## 7. Code Optimization Suggestions

### 7.1 Use Queues Instead of Global Variables

The current code uses global variables to pass data. It is recommended to use FreeRTOS queues for inter-task communication to improve code reliability and maintainability. For example:

```c
// Create queue
osMessageQueueId_t pwmQueue = osMessageQueueNew(1, sizeof(uint16_t), NULL);

// Send message
osMessageQueuePut(pwmQueue, &pwm_duty, 0, 0);

// Receive message
osMessageQueueGet(pwmQueue, &pwm_duty, NULL, 0);
```

### 7.2 Add Parameter Configuration

Parameters like PWM step size and button debounce time can be defined as configurable macros for easy adjustment:

```c
#define PWM_STEP          1000    // PWM change step
#define KEY_DEBOUNCE_MS   50      // Button debounce time
#define ENCODER_DELAY     10      // Encoder detection delay
#define LED_UPDATE_DELAY  50      // LED update delay
```

### 7.3 Add Error Handling

Add error handling at critical operations to improve system stability:

```c
if (HAL_TIM_PWM_Start(&htim10, TIM_CHANNEL_1) != HAL_OK)
{
  Error_Handler();
}
```

### 7.4 Optimize Task Priority

Adjust task priority according to actual requirements to ensure critical tasks respond in a timely manner:

- Encoder Task: Higher priority to ensure timely response to encoder input
- KEY Task: Medium priority
- LED Task: Lower priority because brightness updates do not require real-time response

### 7.5 Add Status Indicator

A LED status indicator can be added. For example, when the LED is on, use another LED to indicate the status:

```c
if (led_enabled)
{
  HAL_GPIO_WritePin(GPIOB, GPIO_PIN_9, GPIO_PIN_SET);
}
else
{
  HAL_GPIO_WritePin(GPIOB, GPIO_PIN_9, GPIO_PIN_RESET);
}
```

## 8. Testing Methods

1. **Basic Function Test**:
   - Rotate the encoder and observe LED brightness changes
   - Press the encoder's button and observe the LED on/off state

2. **Performance Test**:
   - Quickly rotate the encoder to test system response speed
   - Press the button multiple times to test the debounce function

3. **Boundary Test**:
   - Rotate the encoder to minimum brightness and test whether it stops correctly
   - Rotate the encoder to maximum brightness and test whether it stops correctly

4. **Stability Test**:
   - Run for a long time to test system stability
   - Perform repeated operations to test system reliability

## 9. Project Structure

```plain
FreeRTOS\F02_Encoder_PWM_LED_1\
├── Core\
│   ├── Inc\
│   │   ├── main.h
│   │   └── stm32f4xx_hal_conf.h
│   └── Src\
│       ├── main.c
│       ├── stm32f4xx_hal_msp.c
│       ├── stm32f4xx_it.c
│       └── sysmem.c
├── Drivers\
│   ├── CMSIS\
│   │   ├── Device\
│   │   └── Include\
│   └── STM32F4xx_HAL_Driver\
│       ├── Inc\
│       └── Src\
├── FreeRTOS\
│   ├── CMSIS_RTOS_V2\
│   └── Source\
└── README.md
```

## 10. Key Technical Points

1. **FreeRTOS Task Creation and Management**: Use `osThreadNew` to create tasks and set task priority and stack size.

2. **Encoder Reading Algorithm**: Use a lookup table to implement encoder rotation direction detection, improving detection speed and accuracy.

3. **PWM Control**: Use TIM10 PWM mode to control LED brightness, achieving smooth brightness adjustment.

4. **Button Debounce**: Implement software debounce to improve button detection reliability.

5. **Inter-Task Communication**: Currently uses global variables. It is recommended to use queues for inter-task communication.

6. **STM32 HAL Library Usage**: Use HAL library functions to configure GPIO, timers, and other peripherals.

7. **Code Standards**: Follow STM32 HAL library code standards and comment style.

## 11. Project Features

1. **Modular Design**: Functions are divided into three independent tasks, making it easy to maintain and extend.

2. **Real-time Response**: FreeRTOS achieves real-time task scheduling, ensuring encoder input and button operations respond promptly.

3. **Smooth Control**: PWM technology achieves smooth LED brightness adjustment, avoiding sudden brightness changes.

4. **Reliability**: Button debounce is implemented, improving system reliability.

5. **Scalability**: The code structure is clear, making it easy to add new features or modify existing ones.

## 12. Application Scenarios

The EC11 encoder-controlled LED brightness technology implemented in this project can be applied to various scenarios:

1. **Lighting Control**: Adjust indoor lighting brightness
2. **Device Parameter Adjustment**: Adjust various device parameters such as volume and speed
3. **Dashboard Control**: Control dashboard display brightness
4. **Smart Home**: Adjust smart lamp brightness
5. **Industrial Control**: Adjust device output power

## 13. Summary

This project successfully implements EC11 encoder-controlled LED brightness functionality, achieving non-blocking operation through FreeRTOS task management. The project structure is clear, the code is concise, and the functionality is complete. It can serve as a reference example for learning FreeRTOS and STM32 PWM control.

Through this project, you can master the following technologies:

1. GPIO and timer configuration for STM32 microcontrollers
2. FreeRTOS task creation and management
3. Encoder reading and rotation direction detection
4. PWM control technology
5. Button debounce processing
6. Inter-task communication methods

These technologies are very practical in embedded system development and can be applied to various scenarios requiring user input and output control.