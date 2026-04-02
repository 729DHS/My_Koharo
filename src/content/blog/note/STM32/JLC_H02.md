---
title: 嘉立创筑基派PWM_LED_demo
link: jlc-pwm-led-demo
date: 2026-04-02 22:38:52
description: 嘉立创筑基派PWM点灯DEMO,使用筑基板自带PB8 LED
tags:
  - STM32
  - 嵌入式
  - 筑基派
categories:
  - [笔记, STM32]
---

# PWM LED 控制项目文档

## 1. 项目概述

本项目是一个基于 STM32F407 微控制器的 LED 亮度控制示例，通过 PWM(脉冲宽度调制)技术实现 LED 亮度的动态调节。项目采用 STM32 HAL 库开发，使用 TIM10 定时器生成 PWM 信号，通过改变占空比来控制 LED 的亮度，并实现 LED 呼吸灯效果。

## 2. 技术框架

### 2.1 硬件平台
- 微控制器: STM32F407
- 定时器: TIM10
- PWM 输出引脚: TIM10_CH1

### 2.2 软件架构
- 开发环境: STM32CubeMX + VScode
- 库函数: STM32 HAL 库
- 代码结构: 标准 STM32 HAL 项目结构

## 3. 代码结构分析

### 3.1 头文件和包含部分
```c
#include "main.h"
```
包含了主头文件，其中定义了 STM32 HAL 库的基本配置和函数声明。

### 3.2 变量定义
```c
TIM_HandleTypeDef htim10;
```
定义了 TIM10 定时器的句柄，用于定时器操作。

### 3.3 常量定义
```c
static const uint16_t LED_PWM_DUTY_MAX = 60000U;   // PWM最大占空比值
static const uint16_t LED_PWM_DUTY_MIN = 0U;       // PWM最小占空比值
static const uint16_t LED_FADE_STEPS = 70U;        // 呼吸灯渐变步数
static const uint32_t LED_FADE_STEP_MS = 8U;        // 每步延迟时间(毫秒)
static const uint32_t LED_PEAK_HOLD_MS = 160U;     // 最亮保持时间(毫秒)
static const uint32_t LED_VALLEY_HOLD_MS = 120U;   // 最暗保持时间(毫秒)
```
这些常量定义了 LED 呼吸灯效果的各种参数，包括 PWM 占空比范围、渐变步数和时间参数。

### 3.4 函数原型
```c
void SystemClock_Config(void);              // 系统时钟配置
static void MX_GPIO_Init(void);             // GPIO初始化
static void MX_TIM10_Init(void);            // TIM10定时器初始化
static void LED_SetBrightness(uint16_t duty);      // 设置LED亮度
static void LED_GentleFade(uint16_t start_duty, uint16_t end_duty);  // LED渐变效果
```

## 4. 主要功能实现

### 4.1 主函数
```c
int main(void)
{
  // 系统初始化
  HAL_Init();
  SystemClock_Config();

  // 外设初始化
  MX_GPIO_Init();
  MX_TIM10_Init();

  // 启动PWM输出
  if (HAL_TIM_PWM_Start(&htim10, TIM_CHANNEL_1) != HAL_OK)
  {
    Error_Handler();
  }
  LED_SetBrightness(LED_PWM_DUTY_MIN);

  // 主循环
  while (1)
  {
    LED_GentleFade(LED_PWM_DUTY_MIN, LED_PWM_DUTY_MAX);
    HAL_Delay(LED_PEAK_HOLD_MS);
    LED_GentleFade(LED_PWM_DUTY_MAX, LED_PWM_DUTY_MIN);
    HAL_Delay(LED_VALLEY_HOLD_MS);
  }
}
```
主函数首先进行系统初始化，然后配置 GPIO 和 TIM10 定时器，启动 PWM 输出。在主循环中，通过 LED_GentleFade 函数实现 LED 亮度的渐变效果，形成呼吸灯模式。

### 4.2 系统时钟配置
```c
void SystemClock_Config(void)
{
  RCC_OscInitTypeDef RCC_OscInitStruct = {0};
  RCC_ClkInitTypeDef RCC_ClkInitStruct = {0};

  // 配置主内部稳压器输出电压
  __HAL_RCC_PWR_CLK_ENABLE();
  __HAL_PWR_VOLTAGESCALING_CONFIG(PWR_REGULATOR_VOLTAGE_SCALE1);

  // 初始化RCC振荡器
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

  // 初始化CPU、AHB和APB总线时钟
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
系统时钟配置函数使用 HSE(外部高速时钟)作为 PLL 时钟源，通过 PLL 倍频生成 168MHz 的系统时钟。配置了 CPU、AHB 和 APB 总线的时钟分频系数，实现了整个系统的时钟分配。

### 4.3 TIM10 定时器初始化
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
TIM10 定时器初始化函数配置了定时器的基本参数和 PWM 输出通道。关键参数包括：
- 预分频器(Prescaler): 0
- 计数模式: 向上计数
- 自动重装载值(Period): 65535
- PWM 模式: PWM1 模式
- 输出极性: 高电平有效

### 4.4 GPIO 初始化
```c
static void MX_GPIO_Init(void)
{
  /* GPIO Ports Clock Enable */
  __HAL_RCC_GPIOH_CLK_ENABLE();
  __HAL_RCC_GPIOA_CLK_ENABLE();
  __HAL_RCC_GPIOB_CLK_ENABLE();
}
```
GPIO 初始化函数使能了 GPIO 端口时钟，为 PWM 输出引脚提供时钟支持。

### 4.5 LED 亮度设置函数
```c
static void LED_SetBrightness(uint16_t duty)
{
  __HAL_TIM_SET_COMPARE(&htim10, TIM_CHANNEL_1, duty);
}
```
LED_SetBrightness 函数通过设置 TIM10 通道 1 的比较寄存器(CCR)值来改变 PWM 占空比，从而控制 LED 亮度。占空比越大，LED 越亮；占空比越小，LED 越暗。

### 4.6 LED 渐变效果函数
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
LED_GentleFade 函数实现了 LED 亮度的平滑渐变效果。它从起始占空比值开始，逐步改变到目标占空比值，每步之间有短暂的延迟。通过调整 LED_FADE_STEPS 和 LED_FADE_STEP_MS 参数，可以改变渐变的速度和平滑度。

### 4.7 错误处理函数
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
错误处理函数在发生错误时被调用，它会禁用中断并进入无限循环，防止系统继续运行。

## 5. 技术细节

### 5.1 PWM 原理
PWM(Pulse Width Modulation，脉冲宽度调制)是一种通过改变脉冲宽度来控制信号的技术。在 LED 控制中，PWM 的占空比(高电平时间与整个周期的比值)决定了 LED 的平均亮度。占空比越高，LED 越亮；占空比越低，LED 越暗。

### 5.2 TIM10 定时器配置
TIM10 是 STM32F407 上的一个 16 位定时器，具有以下特点：
- 16 位自动重装载计数器
- 多达 4 个独立通道(IC、OC 或 PWM)
- 可编程预分频器
- 重复计数器

在本项目中，TIM10 配置为 PWM 模式，使用通道 1 输出 PWM 信号。定时器时钟为 84MHz(APB2 总线时钟)，预分频器为 0，自动重装载值为 65535，因此 PWM 频率为：
PWM 频率 = 定时器时钟 / (预分频器+1) / (自动重装载值+1) = 84MHz / 1 / 65536 ≈ 1281Hz

### 5.3 呼吸灯效果实现
呼吸灯效果是通过 LED_GentleFade 函数实现的，它将 LED 亮度从最小值渐变到最大值，再从最大值渐变回最小值。渐变过程分为多个步骤，每步之间有短暂的延迟，形成平滑的亮度变化效果。

渐变步数和每步延迟时间决定了呼吸灯的速度和平滑度。步数越多，每步延迟时间越长，呼吸灯效果越平滑但速度越慢；反之则效果越明显但速度越快。

### 5.4 STM32 HAL 库使用
本项目使用 STM32 HAL 库进行开发，HAL 库提供了丰富的函数和结构体，简化了外设的配置和使用。例如：
- HAL_Init(): 初始化 HAL 库
- HAL_RCC_OscConfig(): 配置系统时钟源
- HAL_RCC_ClockConfig(): 配置系统时钟
- HAL_TIM_Base_Init(): 初始化定时器基本功能
- HAL_TIM_PWM_Init(): 初始化定时器 PWM 功能
- HAL_TIM_PWM_Start(): 启动 PWM 输出
- __HAL_TIM_SET_COMPARE(): 设置定时器比较值

### 5.5 代码结构和注释规范
本项目遵循 STM32CubeMX 生成的代码结构，使用特定的注释标记用户代码区域，如：
- /* USER CODE BEGIN Header */ 和 /* USER CODE END Header */
- /* USER CODE BEGIN Includes */ 和 /* USER CODE END Includes */
- /* USER CODE BEGIN 2 */ 和 /* USER CODE END 2 */
- /* USER CODE BEGIN 3 */ 和 /* USER CODE END 3 */
- /* USER CODE BEGIN 4 */ 和 /* USER CODE END 4 */

这种结构使得在重新生成代码时，用户代码不会被覆盖，提高了代码的可维护性。

## 6. 项目特点

1. **模块化设计**: 将 LED 控制功能封装为独立函数，便于维护和扩展。
2. **参数化配置**: 使用常量定义呼吸灯效果参数，便于调整。
3. **错误处理**: 实现了基本的错误处理机制。
4. **代码规范**: 遵循 STM32 HAL 库的代码规范和注释风格。
5. **可扩展性**: 代码结构清晰，便于添加新的功能或修改现有功能。

## 7. 应用场景

本项目实现的 PWM LED 控制技术可以应用于多种场景：
- LED 照明控制
- 指示灯亮度调节
- 装饰灯效果
- 背光亮度调节
- 信号灯控制

## 8. 总结

本项目展示了如何使用 STM32F407 的定时器 PWM 功能实现 LED 亮度控制和呼吸灯效果。通过合理配置定时器参数和编写控制函数，实现了 LED 亮度的平滑调节。代码结构清晰，遵循 STM32 HAL 库的规范，具有良好的可维护性和可扩展性。该示例可以作为学习 STM32 定时器 PWM 功能和 LED 控制技术的参考。
