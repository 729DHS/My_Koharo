---
title: JLC Foundation Board PWM LED Demo
link: jlc-pwm-led-demo
date: 2026-04-02 22:38:52
description: JLC Foundation Board PWM LED demo, using the onboard PB8 LED.
tags:
  - STM32
  - Embedded
  - Foundation Board
categories:
  - [笔记, STM32]
---

# PWM LED Control Project Documentation

## 1. Project Overview

This project is an LED brightness control example based on the STM32F407 microcontroller. It uses PWM (Pulse Width Modulation) technology to achieve dynamic LED brightness adjustment. The project is developed using the STM32 HAL library, uses the TIM10 timer to generate PWM signals, controls LED brightness by changing the duty cycle, and implements an LED breathing light effect.

## 2. Technical Framework

### 2.1 Hardware Platform
- Microcontroller: STM32F407
- Timer: TIM10
- PWM Output Pin: TIM10_CH1

### 2.2 Software Architecture
- Development Environment: STM32CubeMX + VScode
- Library: STM32 HAL library
- Code Structure: Standard STM32 HAL project structure

## 3. Code Structure Analysis

### 3.1 Header Files
```c
#include "main.h"
```
Includes the main header file, which defines the basic configuration and function declarations of the STM32 HAL library.

### 3.2 Variable Definitions
```c
TIM_HandleTypeDef htim10;
```
Defines the handle for the TIM10 timer, used for timer operations.

### 3.3 Constant Definitions
```c
static const uint16_t LED_PWM_DUTY_MAX = 60000U;   // PWM maximum duty cycle value
static const uint16_t LED_PWM_DUTY_MIN = 0U;       // PWM minimum duty cycle value
static const uint16_t LED_FADE_STEPS = 70U;        // Breathing light fade steps
static const uint32_t LED_FADE_STEP_MS = 8U;        // Delay time per step (milliseconds)
static const uint32_t LED_PEAK_HOLD_MS = 160U;     // Maximum brightness hold time (milliseconds)
static const uint32_t LED_VALLEY_HOLD_MS = 120U;   // Minimum brightness hold time (milliseconds)
```
These constants define various parameters for the LED breathing light effect, including PWM duty cycle range, fade steps, and timing parameters.

### 3.4 Function Prototypes
```c
void SystemClock_Config(void);              // System clock configuration
static void MX_GPIO_Init(void);             // GPIO initialization
static void MX_TIM10_Init(void);            // TIM10 timer initialization
static void LED_SetBrightness(uint16_t duty);      // Set LED brightness
static void LED_GentleFade(uint16_t start_duty, uint16_t end_duty);  // LED fade effect
```

## 4. Main Function Implementation

### 4.1 Main Function
```c
int main(void)
{
  // System initialization
  HAL_Init();
  SystemClock_Config();

  // Peripheral initialization
  MX_GPIO_Init();
  MX_TIM10_Init();

  // Start PWM output
  if (HAL_TIM_PWM_Start(&htim10, TIM_CHANNEL_1) != HAL_OK)
  {
    Error_Handler();
  }
  LED_SetBrightness(LED_PWM_DUTY_MIN);

  // Main loop
  while (1)
  {
    LED_GentleFade(LED_PWM_DUTY_MIN, LED_PWM_DUTY_MAX);
    HAL_Delay(LED_PEAK_HOLD_MS);
    LED_GentleFade(LED_PWM_DUTY_MAX, LED_PWM_DUTY_MIN);
    HAL_Delay(LED_VALLEY_HOLD_MS);
  }
}
```
The main function first performs system initialization, then configures GPIO and TIM10 timer, and starts PWM output. In the main loop, the LED breathing light mode is achieved through the LED_GentleFade function to create smooth brightness transitions.

### 4.2 System Clock Configuration
```c
void SystemClock_Config(void)
{
  RCC_OscInitTypeDef RCC_OscInitStruct = {0};
  RCC_ClkInitTypeDef RCC_ClkInitStruct = {0};

  // Configure main internal regulator output voltage
  __HAL_RCC_PWR_CLK_ENABLE();
  __HAL_PWR_VOLTAGESCALING_CONFIG(PWR_REGULATOR_VOLTAGE_SCALE1);

  // Initialize RCC oscillator
  RCC_OscInitStruct.OscillatorType = RCC_OSCILLATORTYPE_HSE;
  RCC_OscInitStruct.HSEState = RCC_HSE_ON;
  RCC_OscInitStruct.PLL.PLLState = RCC_PLL_ON;
  RCC_OscInitStruct.PLL.PLLSource = RCC_PLLSOURCE_HSE;
  RCC_OscInitStruct.PLL.PLLM = 4;
  RCC_OscInitStruct.PLL.PLLN = 168;
  RCC_OscInitStruct.PLL.PLLP = RCC_PLLP_DIV2;
  RCC_OscInitStruct.PLL.PLLQ = 4;
  if (HAL_RCC_OscConfig(&RCC_OscInitStruct) != HAL_OK)
  {
    Error_Handler();
  }

  // Initialize CPU, AHB, and APB bus clocks
  RCC_ClkInitStruct.ClockType = RCC_CLOCKTYPE_HCLK|RCC_CLOCKTYPE_SYSCLK
                              |RCC_CLOCKTYPE_PCLK1|RCC_CLOCKTYPE_PCLK2;
  RCC_ClkInitStruct.SYSCLKSource = RCC_SYSCLKSOURCE_PLLCLK;
  RCC_ClkInitStruct.AHBCLKDivider = RCC_SYSCLK_DIV1;
  RCC_ClkInitStruct.APB1CLKDivider = RCC_HCLK_DIV4;
  RCC_ClkInitStruct.APB2CLKDivider = RCC_HCLK_DIV2;

  if (HAL_RCC_ClockConfig(&RCC_ClkInitStruct, FLASH_LATENCY_5) != HAL_OK)
  {
    Error_Handler();
  }
}
```
The system clock configuration function uses HSE (external high-speed clock) as the PLL clock source and generates a 168MHz system clock through PLL multiplication. It configures clock dividers for CPU, AHB, and APB buses, achieving clock distribution for the entire system.

### 4.3 TIM10 Timer Initialization
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
  sConfigOC.Pulse = LED_PWM_DUTY_MAX;
  sConfigOC.OCPolarity = TIM_OCPOLARITY_HIGH;
  sConfigOC.OCFastMode = TIM_OCFAST_DISABLE;
  if (HAL_TIM_PWM_ConfigChannel(&htim10, &sConfigOC, TIM_CHANNEL_1) != HAL_OK)
  {
    Error_Handler();
  }
  HAL_TIM_MspPostInit(&htim10);
}
```
The TIM10 timer initialization function configures the timer's basic parameters and PWM output channel. Key parameters include:
- Prescaler: 0
- Counter Mode: Up counting
- Auto-reload Value (Period): 65535
- PWM Mode: PWM1 mode
- Output Polarity: Active high

### 4.4 GPIO Initialization
```c
static void MX_GPIO_Init(void)
{
  /* GPIO Ports Clock Enable */
  __HAL_RCC_GPIOH_CLK_ENABLE();
  __HAL_RCC_GPIOA_CLK_ENABLE();
  __HAL_RCC_GPIOB_CLK_ENABLE();
}
```
The GPIO initialization function enables GPIO port clocks to provide clock support for the PWM output pin.

### 4.5 LED Brightness Setting Function
```c
static void LED_SetBrightness(uint16_t duty)
{
  __HAL_TIM_SET_COMPARE(&htim10, TIM_CHANNEL_1, duty);
}
```
The LED_SetBrightness function changes the PWM duty cycle by setting the comparison register (CCR) value of TIM10 channel 1, thereby controlling LED brightness. Higher duty cycle means brighter LED; lower duty cycle means dimmer LED.

### 4.6 LED Fade Effect Function
```c
static void LED_GentleFade(uint16_t start_duty, uint16_t end_duty)
{
  const int32_t delta = (int32_t)end_duty - start_duty;

  for (uint16_t step = 0; step <= LED_FADE_STEPS; ++step)
  {
    const uint16_t duty = (uint16_t)(start_duty + (delta * step) / LED_FADE_STEPS);
    LED_SetBrightness(duty);
    HAL_Delay(LED_FADE_STEP_MS);
  }
}
```
The LED_GentleFade function implements smooth LED brightness fading. It starts from the initial duty cycle value and gradually changes to the target duty cycle value, with brief delays between each step. By adjusting LED_FADE_STEPS and LED_FADE_STEP_MS parameters, the speed and smoothness of the fade can be changed.

### 4.7 Error Handler Function
```c
void Error_Handler(void)
{
  /* User can add his own implementation to report the HAL error return state */
  __disable_irq();
  while (1)
  {
  }
}
```
The error handler function is called when an error occurs. It disables interrupts and enters an infinite loop to prevent the system from continuing to run.

## 5. Technical Details

### 5.1 PWM Principle
PWM (Pulse Width Modulation) is a technique that controls a signal by changing the pulse width. In LED control, the PWM duty cycle (ratio of high-level time to the entire period) determines the LED's average brightness. Higher duty cycle means brighter LED; lower duty cycle means dimmer LED.

### 5.2 TIM10 Timer Configuration
TIM10 is a 16-bit timer on the STM32F407 with the following features:
- 16-bit auto-reload counter
- Up to 4 independent channels (IC, OC, or PWM)
- Programmable prescaler
- Repetition counter

In this project, TIM10 is configured in PWM mode using channel 1 for PWM output. The timer clock is 84MHz (APB2 bus clock), prescaler is 0, and auto-reload value is 65535, so the PWM frequency is:
PWM frequency = Timer clock / (Prescaler + 1) / (Auto-reload value + 1) = 84MHz / 1 / 65536 ≈ 1281Hz

### 5.3 Breathing Light Effect Implementation
The breathing light effect is achieved through the LED_GentleFade function, which fades LED brightness from minimum to maximum and back from maximum to minimum. The fade process is divided into multiple steps with brief delays between each step, creating a smooth brightness change effect.

The number of fade steps and the delay time per step determine the speed and smoothness of the breathing light. More steps and longer delay per step result in a smoother but slower breathing light effect; fewer steps and shorter delays result in a more pronounced but faster effect.

### 5.4 STM32 HAL Library Usage
This project is developed using the STM32 HAL library, which provides rich functions and structures that simplify peripheral configuration and usage. For example:
- HAL_Init(): Initialize the HAL library
- HAL_RCC_OscConfig(): Configure system clock source
- HAL_RCC_ClockConfig(): Configure system clocks
- HAL_TIM_Base_Init(): Initialize timer basic functions
- HAL_TIM_PWM_Init(): Initialize timer PWM functions
- HAL_TIM_PWM_Start(): Start PWM output
- __HAL_TIM_SET_COMPARE(): Set timer comparison value

### 5.5 Code Structure and Comment Standards
This project follows the code structure generated by STM32CubeMX, using specific comment markers for user code areas, such as:
- /* USER CODE BEGIN Header */ and /* USER CODE END Header */
- /* USER CODE BEGIN Includes */ and /* USER CODE END Includes */
- /* USER CODE BEGIN 2 */ and /* USER CODE END 2 */
- /* USER CODE BEGIN 3 */ and /* USER CODE END 3 */
- /* USER CODE BEGIN 4 */ and /* USER CODE END 4 */

This structure ensures that user code is not overwritten when regenerating code, improving code maintainability.

## 6. Project Features

1. **Modular Design**: LED control functionality is encapsulated in independent functions, making it easy to maintain and extend.
2. **Parameterized Configuration**: Constants are used to define breathing light effect parameters for easy adjustment.
3. **Error Handling**: Basic error handling mechanism is implemented.
4. **Code Standards**: Follows STM32 HAL library code standards and comment style.
5. **Scalability**: The code structure is clear, making it easy to add new features or modify existing ones.

## 7. Application Scenarios

The PWM LED control technology implemented in this project can be applied to various scenarios:
- LED lighting control
- Indicator brightness adjustment
- Decorative lighting effects
- Backlight brightness adjustment
- Signal light control

## 8. Summary

This project demonstrates how to use the STM32F407 timer's PWM function to achieve LED brightness control and breathing light effects. Through reasonable timer parameter configuration and writing control functions, smooth LED brightness adjustment is achieved. The code structure is clear, follows STM32 HAL library standards, and has good maintainability and scalability. This example can serve as a reference for learning STM32 timer PWM functions and LED control technology.