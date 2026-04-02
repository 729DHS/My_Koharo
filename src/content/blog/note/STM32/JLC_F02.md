---
title: 嘉立创筑基派FreeRTOS编码器+PWM+LED
link: jlc-freertos-endoer-led-demo
date: 2026-04-02 22:48:50
description: 嘉立创筑基派FreeRTOS,使用编码器以及LED,使用筑基板自带PB8 LED,EC11编码器
tags:
  - STM32
  - 嵌入式
  - 筑基派
categories:
  - [笔记, STM32]
---

# EC11 编码器控制 LED 亮度项目

## 1. 项目概述

本项目基于 STM32F407 微控制器和 FreeRTOS 操作系统，实现了使用 EC11 编码器控制 LED 亮度的功能。项目通过三个任务（线程）协同工作，实现了无阻塞的编码器读取、按键检测和 LED 亮度控制。

## 2. 技术框架

### 2.1 硬件平台
- **微控制器**：STM32F407
- **编码器**：EC11 旋转编码器（连接到 PD12 和 PD13）
- **按键**：PC13（编码器自带的按下功能）
- **LED**：PB8（通过 PWM 控制亮度）
- **定时器**：TIM10（用于 PWM 输出）

### 2.2 软件架构
- **开发环境**：STM32CubeMX + VScode
- **操作系统**：FreeRTOS
- **库函数**：STM32 HAL 库
- **代码结构**：标准 STM32 HAL 项目结构 + FreeRTOS 任务管理

## 3. 代码结构分析

### 3.1 头文件和包含部分
```c
#include "main.h"
#include "cmsis_os.h"
```
包含了主头文件和 CMSIS-OS 头文件，其中定义了 STM32 HAL 库的基本配置和 FreeRTOS 的相关函数。

### 3.2 全局变量定义
```c
/* USER CODE BEGIN PV */
uint8_t led_enabled = 1;
uint16_t pwm_duty = 0;
const uint16_t pwm_arr = 65535;
const uint16_t pwm_step = 1000;
/* USER CODE END PV */
```
- `led_enabled`：LED 使能状态（1=开启，0=关闭）
- `pwm_duty`：PWM 占空比（0-65535）
- `pwm_arr`：PWM 自动重载值（定时器周期）
- `pwm_step`：每次旋转编码器的 PWM 变化步长

### 3.3 任务句柄定义
```c
/* USER CODE BEGIN EV */
osThreadId_t EncoderTaskHandle;
osThreadId_t KEYTaskHandle;
osThreadId_t LEDTaskHandle;
/* USER CODE END EV */
```
定义了三个任务的句柄，用于任务管理。

### 3.4 任务函数原型
```c
/* USER CODE BEGIN FunctionPrototypes */
void EncoderTask(void *argument);
void KEYTask(void *argument);
void LEDTask(void *argument);
/* USER CODE END FunctionPrototypes */
```

### 3.5 编码器状态表
```c
const int8_t enc_table[16] = {
    0, -1,  1,  0,
    1,  0,  0, -1,
   -1,  0,  0,  1,
    0,  1, -1,  0
};
```
编码器旋转方向检测的状态表，用于查表法计算旋转方向。

## 4. 主要功能实现

### 4.1 主函数
```c
int main(void)
{
  /* 系统初始化 */
  HAL_Init();
  SystemClock_Config();
  MX_GPIO_Init();
  MX_TIM10_Init();
  MX_FREERTOS_Init();

  /* 启动PWM输出 */
  if (HAL_TIM_PWM_Start(&htim10, TIM_CHANNEL_1) != HAL_OK)
  {
    Error_Handler();
  }

  /* 启动任务调度器 */
  osKernelStart();

  /* 永远不会执行到这里 */
  while (1)
  {
  }
}
```
主函数首先进行系统初始化，然后配置 GPIO、TIM10 定时器和 FreeRTOS，启动 PWM 输出和任务调度器。

### 4.2 任务初始化
```c
void MX_FREERTOS_Init(void)
{
  /* 创建任务 */
  EncoderTaskHandle = osThreadNew(EncoderTask, NULL, &EncoderTask_attributes);
  KEYTaskHandle = osThreadNew(KEYTask, NULL, &KEYTask_attributes);
  LEDTaskHandle = osThreadNew(LEDTask, NULL, &LEDTask_attributes);
}
```
使用`osThreadNew`函数创建三个任务，并设置任务属性。

### 4.3 Encoder 任务
```c
void EncoderTask(void *argument)
{
  static uint8_t enc_last = 0;
  uint8_t enc_current;
  int8_t enc_dir;

  for (;;)
  {
    /* 读取编码器状态 */
    enc_current = ((GPIOE->IDR & GPIO_PIN_12) >> 12) | ((GPIOE->IDR & GPIO_PIN_13) >> 12);
    
    /* 计算旋转方向 */
    enc_dir = enc_table[(enc_last << 2) | enc_current];
    enc_last = enc_current;
    
    /* 根据方向调整PWM占空比 */
    if (enc_dir > 0 && pwm_duty < pwm_arr)
    {
      pwm_duty += pwm_step;
      if (pwm_duty > pwm_arr) pwm_duty = pwm_arr;
    }
    else if (enc_dir < 0 && pwm_duty > 0)
    {
      pwm_duty -= pwm_step;
      if (pwm_duty > pwm_arr) pwm_duty = 0; // 防止溢出
    }
    
    osDelay(10);
  }
}
```
Encoder 任务使用查表法检测编码器旋转方向，并根据方向调整 PWM 占空比。

### 4.4 KEY 任务
```c
void KEYTask(void *argument)
{
  static uint8_t key_state = 0;
  static uint32_t key_time = 0;

  for (;;)
  {
    /* 按键防抖处理 */
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
          /* 切换LED使能状态 */
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
KEY 任务实现了按键的防抖处理，当检测到按键按下时，切换 LED 的使能状态。

### 4.5 LED 任务
```c
void LEDTask(void *argument)
{
  for (;;)
  {
    /* 根据PWM占空比和LED使能状态控制LED亮度 */
    uint16_t out = led_enabled ? (uint16_t)(pwm_arr - pwm_duty) : pwm_arr;
    __HAL_TIM_SET_COMPARE(&htim10, TIM_CHANNEL_1, out);
    
    osDelay(50);
  }
}
```
LED 任务通过 TIM10 的 PWM 输出控制 LED 亮度。由于 PB8 是低电平有效，所以需要将 PWM 占空比取反。

### 4.6 TIM10 定时器初始化
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
TIM10 定时器初始化函数配置了定时器的基本参数和 PWM 输出通道。

### 4.7 GPIO 初始化
```c
static void MX_GPIO_Init(void)
{
  GPIO_InitTypeDef GPIO_InitStruct = {0};

  /* GPIO Ports Clock Enable */
  __HAL_RCC_GPIOC_CLK_ENABLE();
  __HAL_RCC_GPIOD_CLK_ENABLE();
  __HAL_RCC_GPIOB_CLK_ENABLE();

  /* 配置PC13为输入 */
  GPIO_InitStruct.Pin = GPIO_PIN_13;
  GPIO_InitStruct.Mode = GPIO_MODE_INPUT;
  GPIO_InitStruct.Pull = GPIO_PULLUP;
  HAL_GPIO_Init(GPIOC, &GPIO_InitStruct);

  /* 配置PD12和PD13为输入 */
  GPIO_InitStruct.Pin = GPIO_PIN_12|GPIO_PIN_13;
  GPIO_InitStruct.Mode = GPIO_MODE_INPUT;
  GPIO_InitStruct.Pull = GPIO_PULLUP;
  HAL_GPIO_Init(GPIOD, &GPIO_InitStruct);
}
```
GPIO 初始化函数配置了按键和编码器的输入引脚。

## 5. 技术细节

### 5.1 编码器工作原理

EC11 编码器是一种旋转式位置传感器，通过两个输出信号（A 相和 B 相）的相位差来检测旋转方向。当编码器顺时针旋转时，A 相领先 B 相；当编码器逆时针旋转时，B 相领先 A 相。

本项目使用查表法检测旋转方向，通过读取 A 相和 B 相的状态，计算出当前状态码，然后根据上一次的状态码和当前状态码查表得到旋转方向。

### 5.2 PWM 控制原理

PWM（脉冲宽度调制）是一种通过改变脉冲宽度来控制信号的技术。在 LED 控制中，PWM 的占空比（高电平时间与整个周期的比值）决定了 LED 的平均亮度。占空比越高，LED 越亮；占空比越低，LED 越暗。

本项目使用 TIM10 定时器生成 PWM 信号，定时器时钟为 84MHz（APB2 总线时钟），预分频器为 0，自动重装载值为 65535，因此 PWM 频率为：

```plain
PWM频率 = 定时器时钟 / (预分频器+1) / (自动重装载值+1) = 84MHz / 1 / 65536 ≈ 1281Hz
```

### 5.3 FreeRTOS 任务管理

FreeRTOS 是一个开源的实时操作系统，提供了任务管理、队列、信号量等功能。本项目使用 FreeRTOS 的任务管理功能，创建了三个任务：

- **Encoder 任务**：优先级正常，负责读取编码器状态并计算旋转方向
- **KEY 任务**：优先级低，负责检测按键状态
- **LED 任务**：优先级低，负责控制 LED 亮度

任务调度器根据任务优先级和状态，决定哪个任务获得 CPU 控制权。

### 5.4 按键防抖处理

按键在按下和释放时会产生机械抖动，导致多次触发。本项目实现了软件防抖，通过检测按键状态的持续时间来判断按键是否真正被按下。当按键状态持续 50ms 以上时，才认为按键被按下。

### 5.5 任务间通信

当前项目使用全局变量进行任务间通信，Encoder 任务更新`pwm_duty`变量，KEY 任务更新`led_enabled`变量，LED 任务读取这些变量并控制 LED 亮度。

## 6. 工作流程

1. **系统初始化**：
   - 配置系统时钟
   - 初始化 GPIO
   - 初始化 TIM10 定时器
   - 初始化 FreeRTOS

2. **任务创建**：
   - 创建 Encoder 任务
   - 创建 KEY 任务
   - 创建 LED 任务

3. **任务执行**：
   - **Encoder 任务**：
     - 读取编码器状态
     - 计算旋转方向
     - 根据方向调整 PWM 占空比
   - **KEY 任务**：
     - 检测按键状态（带防抖）
     - 当按键按下时，切换 LED 使能状态
   - **LED 任务**：
     - 根据 PWM 占空比和 LED 使能状态控制 LED 亮度

## 7. 代码优化建议

### 7.1 使用队列替代全局变量

当前代码使用全局变量传递数据，建议使用 FreeRTOS 的队列进行任务间通信，提高代码的可靠性和可维护性。例如：

```c
// 创建队列
osMessageQueueId_t pwmQueue = osMessageQueueNew(1, sizeof(uint16_t), NULL);

// 发送消息
osMessageQueuePut(pwmQueue, &pwm_duty, 0, 0);

// 接收消息
osMessageQueueGet(pwmQueue, &pwm_duty, NULL, 0);
```

### 7.2 增加参数配置

可以将 PWM 的步长、按键防抖时间等参数定义为可配置的宏，方便调整：

```c
#define PWM_STEP        1000    // PWM变化步长
#define KEY_DEBOUNCE_MS 50      // 按键防抖时间
#define ENCODER_DELAY   10      // 编码器检测延迟
#define LED_UPDATE_DELAY 50     // LED更新延迟
```

### 7.3 增加错误处理

在关键操作处增加错误处理，提高系统的稳定性：

```c
if (HAL_TIM_PWM_Start(&htim10, TIM_CHANNEL_1) != HAL_OK)
{
  Error_Handler();
}
```

### 7.4 优化任务优先级

根据实际需求调整任务优先级，确保关键任务能够及时响应：

- Encoder 任务：优先级较高，确保及时响应编码器输入
- KEY 任务：优先级中等
- LED 任务：优先级较低，因为亮度更新不需要实时响应

### 7.5 增加状态指示

可以增加 LED 状态指示，例如当 LED 开启时，使用另一个 LED 指示状态：

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

## 8. 测试方法

1. **基本功能测试**：
   - 旋转编码器，观察 LED 亮度变化
   - 按下编码器的按键，观察 LED 的开关状态

2. **性能测试**：
   - 快速旋转编码器，测试系统的响应速度
   - 多次按下按键，测试防抖功能

3. **边界测试**：
   - 旋转编码器到最小亮度，测试是否能正确停止
   - 旋转编码器到最大亮度，测试是否能正确停止

4. **稳定性测试**：
   - 长时间运行，测试系统的稳定性
   - 重复操作，测试系统的可靠性

## 9. 项目结构

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

## 10. 技术要点

1. **FreeRTOS 任务创建与管理**：使用`osThreadNew`创建任务，设置任务优先级和栈大小。

2. **编码器读取算法**：使用查表法实现编码器旋转方向的检测，提高检测速度和准确性。

3. **PWM 控制**：使用 TIM10 的 PWM 模式控制 LED 亮度，实现平滑的亮度调节。

4. **按键防抖**：实现软件防抖，提高按键检测的可靠性。

5. **任务间通信**：当前使用全局变量，建议使用队列进行任务间通信。

6. **STM32 HAL 库使用**：使用 HAL 库函数配置 GPIO、定时器等外设。

7. **代码规范**：遵循 STM32 HAL 库的代码规范和注释风格。

## 11. 项目特点

1. **模块化设计**：将功能分为三个独立的任务，便于维护和扩展。

2. **实时响应**：使用 FreeRTOS 实现实时任务调度，确保编码器输入和按键操作能够及时响应。

3. **平滑控制**：通过 PWM 技术实现 LED 亮度的平滑调节，避免亮度突变。

4. **可靠性**：实现了按键防抖，提高了系统的可靠性。

5. **可扩展性**：代码结构清晰，便于添加新的功能或修改现有功能。

## 12. 应用场景

本项目实现的 EC11 编码器控制 LED 亮度技术可以应用于多种场景：

1. **照明控制**：调节室内灯光亮度
2. **设备参数调节**：调节设备的各种参数，如音量、速度等
3. **仪表盘控制**：控制仪表盘的显示亮度
4. **智能家居**：调节智能灯具的亮度
5. **工业控制**：调节设备的输出功率

## 13. 总结

本项目成功实现了使用 EC11 编码器控制 LED 亮度的功能，通过 FreeRTOS 的任务管理实现了无阻塞的操作。项目结构清晰，代码简洁，功能完整，可以作为学习 FreeRTOS 和 STM32 PWM 控制的参考示例。

通过本项目的学习，可以掌握以下技术：

1. STM32 微控制器的 GPIO 和定时器配置
2. FreeRTOS 任务创建和管理
3. 编码器读取和旋转方向检测
4. PWM 控制技术
5. 按键防抖处理
6. 任务间通信方法

这些技术在嵌入式系统开发中非常实用，可以应用于各种需要用户输入和输出控制的场景。