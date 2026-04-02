---
title: STM32 GPIO 笔记
link: stm32-gpio-note
date: 2026-03-25 15:00:00
description: STM32 GPIO 配置、模式、HAL 函数与低功耗实践笔记。
tags:
  - STM32
  - 嵌入式
categories:
  - [笔记, STM32]
---

# STM32 GPIO 笔记

## CubeMX 中的 GPIO 配置选项

在 STM32CubeMX 中配置 GPIO 时，主要选项包括：

- **Pin Mode (引脚模式)**: 选择引脚的功能，如 Input (输入), Output (输出), Analog (模拟), Alternate Function (复用功能)。
- **GPIO output level (GPIO 输出电平)**: 设置初始输出电平，High (高) 或 Low (低)。
- **GPIO mode (GPIO 模式)**: 选择输出类型，Push-Pull (推挽) 或 Open-Drain (开漏)。
- **GPIO Pull-up/Pull-down (GPIO 上拉/下拉)**: No pull-up and no pull-down (无上拉下拉), Pull-up (上拉), Pull-down (下拉)。
- **Maximum output speed (最大输出速度)**: Low (低), Medium (中), High (高), Very High (很高)。
- **User Label (用户标签)**: 为引脚添加自定义名称，便于代码中引用。

## GPIO 模式 (Modes)

GPIO 有多种模式，以下是中英文对照：

- **Input Floating (输入浮空)**: 引脚浮空输入，无内部上拉或下拉。
- **Input Pull-up (输入上拉)**: 引脚输入，上拉到 VCC。
- **Input Pull-down (输入下拉)**: 引脚输入，下拉到 GND。
- **Output Push-Pull (输出推挽)**: 输出模式，能驱动高低电平。
- **Output Open-Drain (输出开漏)**: 输出模式，只能拉低电平，需要外部上拉。
- **Alternate Function Push-Pull (复用推挽)**: 复用功能，如 UART、SPI 等，推挽输出。
- **Alternate Function Open-Drain (复用开漏)**: 复用功能，开漏输出。
- **Analog (模拟)**: 用于 ADC/DAC，无数字功能。

## HAL 库函数用法

STM32 HAL 库提供了简化的 GPIO 操作函数：

- **HAL_GPIO_ReadPin(GPIOx, GPIO_PIN_x)**: 读取指定 GPIO 引脚的状态，返回 GPIO_PIN_SET 或 GPIO_PIN_RESET。
  - 示例: `if (HAL_GPIO_ReadPin(GPIOA, GPIO_PIN_0) == GPIO_PIN_SET) { ... }`

- **HAL_GPIO_WritePin(GPIOx, GPIO_PIN_x, GPIO_PIN_SET/RESET)**: 设置 GPIO 引脚的输出电平。
  - 示例: `HAL_GPIO_WritePin(GPIOA, GPIO_PIN_1, GPIO_PIN_SET);`

- **HAL_GPIO_TogglePin(GPIOx, GPIO_PIN_x)**: 翻转 GPIO 引脚的输出电平。
  - 示例: `HAL_GPIO_TogglePin(GPIOA, GPIO_PIN_2);`

## 对照标准库 (Standard Peripheral Library)

HAL 库是对标准库的封装，提供了更易用的接口。以下是对照：

- **HAL_GPIO_ReadPin** 对应标准库的 **GPIO_ReadInputDataBit** 或 **GPIO_ReadOutputDataBit**。
  - 标准库: `uint8_t GPIO_ReadInputDataBit(GPIO_TypeDef* GPIOx, uint16_t GPIO_Pin);`

- **HAL_GPIO_WritePin** 对应标准库的 **GPIO_SetBits** 和 **GPIO_ResetBits**。
  - 标准库: `void GPIO_SetBits(GPIO_TypeDef* GPIOx, uint16_t GPIO_Pin);`
  - `void GPIO_ResetBits(GPIO_TypeDef* GPIOx, uint16_t GPIO_Pin);`

- **HAL_GPIO_TogglePin** 在标准库中需要手动实现，或使用位操作。
  - 标准库无直接对应，通常用: `GPIOx->ODR ^= GPIO_Pin;`

HAL 库更抽象，兼容性更好，而标准库更底层，效率更高但复杂。

## GPIO 模式详细作用

- **Analog (模拟) 模式**: 用于连接模拟外设，如 ADC (模数转换器) 或 DAC (数模转换器)。在该模式下，引脚不进行数字输入/输出，而是直接传递模拟信号到内部 ADC/DAC 模块，用于测量电压或输出模拟电压。常用于传感器输入或音频输出。

- **Alternate Function (复用功能) 模式**: 允许 GPIO 引脚被其他外设复用，如 UART、SPI、I2C、PWM 等通信或定时器功能。此时，引脚不再作为通用 GPIO 使用，而是由相应外设控制，用于数据传输、时钟信号等。选择 Push-Pull 或 Open-Drain 取决于外设需求，例如 I2C 常使用 Open-Drain。
## GPIO 省电
如果 IO 不使用,可以配置为模拟模式(analog mode),这样引脚就不会产生电流消耗,从而降低功耗。

## JTAG/SWD 引脚注意事项
上电/复位早期 SWJ（SWD+JTAG）接口默认启用，相关管脚可能出现短暂跳变；不应在系统初始化前让这些引脚直接驱动敏感负载。

- 仅使用 SWD 时：可在初始化早期禁用 JTAG，释放额外管脚（如 JTDI/TDI、JTDO/TDO、JTMS/TMS、NJTRST）。释放后，这些引脚可以像普通 GPIO 一样配置为输入、输出或复用。
- 实务建议：在禁用/重映射前，先将这些引脚配置为输入并配合合适的上拉/下拉；完成释放后再统一设置目标模式和初始输出电平，避免上电瞬间的误动作。
- Trace/ITM：若未使用串行调试输出（SWO/JTDO），建议保持禁用或配置为输入，避免外部误触发。

示例（F1 系）：
- HAL：保留 SWD、禁用 JTAG：`__HAL_AFIO_REMAP_SWJ_NOJTAG();`；完全禁用 SWJ：`__HAL_AFIO_REMAP_SWJ_DISABLE();`
- 标准库：保留 SWD、禁用 JTAG：`GPIO_PinRemapConfig(GPIO_Remap_SWJ_JTAGDisable, ENABLE);`；完全禁用 SWJ：`GPIO_PinRemapConfig(GPIO_Remap_SWJ_Disable, ENABLE);`

不同系列芯片的具体禁用/重映射方法可能不同，请参考该系列的参考手册与 HAL/LL 宏说明。

## 各系列差异简表

- F1（STM32F1）
  - 配置位置：AFIO 重映射。
  - 保留 SWD、禁用 JTAG：`__HAL_AFIO_REMAP_SWJ_NOJTAG();`
    - 标准库：`GPIO_PinRemapConfig(GPIO_Remap_SWJ_JTAGDisable, ENABLE);`
  - 完全禁用 SWJ：`__HAL_AFIO_REMAP_SWJ_DISABLE();`
    - 标准库：`GPIO_PinRemapConfig(GPIO_Remap_SWJ_Disable, ENABLE);`
  - 释放后：将 `PA15/PB3/PB4` 等按需配置为 GPIO 输入/输出/复用。

- F4（STM32F4）
  - 配置位置：CubeMX 中 `System Core -> SYS -> Debug` 选择；代码层无 AFIO 宏。
  - 推荐：选择 `Serial Wire`（保留 SWD，释放 JTAG 仅用的管脚）；`No Debug` 会释放包括 `PA13/PA14` 在内的所有调试引脚，慎用。
  - 常见管脚：SWDIO `PA13`、SWCLK `PA14`；JTAG 仅用：`PA15 (JTDI)`、`PB3 (JTDO/SWO)`、`PB4 (NJTRST)`。
  - 释放后示例（适用于 F4/L4/H7，仅示意）：

```C
// 在早期初始化阶段，将 JTAG 仅用的管脚设为安全模式（输入）或目标模式
GPIO_InitTypeDef GPIO_InitStruct = {0};
__HAL_RCC_GPIOA_CLK_ENABLE();
__HAL_RCC_GPIOB_CLK_ENABLE();

GPIO_InitStruct.Mode = GPIO_MODE_INPUT;   // 或 GPIO_MODE_OUTPUT_PP 等
GPIO_InitStruct.Pull = GPIO_NOPULL;       // 视外部电路选择 PULLUP/PULLDOWN

GPIO_InitStruct.Pin = GPIO_PIN_15;        // PA15: JTDI（SWD 模式下可用作普通 GPIO）
HAL_GPIO_Init(GPIOA, &GPIO_InitStruct);

GPIO_InitStruct.Pin = GPIO_PIN_3 | GPIO_PIN_4; // PB3: JTDO/SWO, PB4: NJTRST
HAL_GPIO_Init(GPIOB, &GPIO_InitStruct);
```

- L4（STM32L4）
  - 配置位置与 F4 类似：通过 CubeMX `SYS -> Debug` 选择 SWD/JTAG/禁用。
  - 管脚分配基本与 F4 一致（具体型号可能略有差异），SWD：`PA13/PA14`；JTAG 仅用：`PA15/PB3/PB4`。
  - 若启用 Trace/ITM，`PB3 (SWO)` 会被占用；未使用时建议设为输入或禁用。

- H7（STM32H7）
  - 配置位置与 F4/L4 类似：CubeMX `SYS -> Debug`；部分双核器件（M7+M4）有独立调试端口，需按器件手册确认。
  - 管脚：SWD 保留 `PA13/PA14`；JTAG 仅用常见 `PA15/PB3/PB4`；Trace/SWO 使用 `PB3`。
  - 禁用或释放策略与 F4/L4 相同：未用 Trace 时保持 `PB3` 禁用或输入，避免误触发。

备注：以上管脚为常见映射，具体以器件数据手册/CubeMX 引脚视图为准；释放调试引脚会影响在线调试能力，请在量产或对引脚有严格需求时谨慎处理。