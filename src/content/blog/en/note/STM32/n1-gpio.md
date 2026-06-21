---
title: STM32 GPIO Notes
link: stm32-gpio-note
date: 2026-03-25 15:00:00
description: STM32 GPIO configuration, modes, HAL functions, and low-power practices notes.
tags:
  - STM32
  - Embedded
categories:
  - [笔记, STM32]
---

# STM32 GPIO Notes

## GPIO Configuration Options in CubeMX

When configuring GPIO in STM32CubeMX, the main options include:

- **Pin Mode**: Select the pin's function, such as Input, Output, Analog, or Alternate Function.
- **GPIO output level**: Set the initial output level, High or Low.
- **GPIO mode**: Select the output type, Push-Pull or Open-Drain.
- **GPIO Pull-up/Pull-down**: No pull-up and no pull-down, Pull-up, or Pull-down.
- **Maximum output speed**: Low, Medium, High, or Very High.
- **User Label**: Add a custom name to the pin for easy reference in code.

## GPIO Modes

GPIO has multiple modes:

- **Input Floating**: Pin floating input without internal pull-up or pull-down.
- **Input Pull-up**: Pin input pulled up to VCC.
- **Input Pull-down**: Pin input pulled down to GND.
- **Output Push-Pull**: Output mode that can drive both high and low levels.
- **Output Open-Drain**: Output mode that can only pull low; requires external pull-up.
- **Alternate Function Push-Pull**: Alternate function such as UART, SPI, etc., push-pull output.
- **Alternate Function Open-Drain**: Alternate function, open-drain output.
- **Analog**: Used for ADC/DAC with no digital functionality.

## HAL Library Function Usage

The STM32 HAL library provides simplified GPIO operation functions:

- **HAL_GPIO_ReadPin(GPIOx, GPIO_PIN_x)**: Reads the specified GPIO pin state, returns GPIO_PIN_SET or GPIO_PIN_RESET.
  - Example: `if (HAL_GPIO_ReadPin(GPIOA, GPIO_PIN_0) == GPIO_PIN_SET) { ... }`

- **HAL_GPIO_WritePin(GPIOx, GPIO_PIN_x, GPIO_PIN_SET/RESET)**: Sets the output level of a GPIO pin.
  - Example: `HAL_GPIO_WritePin(GPIOA, GPIO_PIN_1, GPIO_PIN_SET);`

- **HAL_GPIO_TogglePin(GPIOx, GPIO_PIN_x)**: Toggles the output level of a GPIO pin.
  - Example: `HAL_GPIO_TogglePin(GPIOA, GPIO_PIN_2);`

## Comparison with Standard Peripheral Library

The HAL library is an abstraction of the Standard Peripheral Library, providing a more user-friendly interface. Here is the comparison:

- **HAL_GPIO_ReadPin** corresponds to Standard Library's **GPIO_ReadInputDataBit** or **GPIO_ReadOutputDataBit**.
  - Standard Library: `uint8_t GPIO_ReadInputDataBit(GPIO_TypeDef* GPIOx, uint16_t GPIO_Pin);`

- **HAL_GPIO_WritePin** corresponds to Standard Library's **GPIO_SetBits** and **GPIO_ResetBits**.
  - Standard Library: `void GPIO_SetBits(GPIO_TypeDef* GPIOx, uint16_t GPIO_Pin);`
  - `void GPIO_ResetBits(GPIO_TypeDef* GPIOx, uint16_t GPIO_Pin);`

- **HAL_GPIO_TogglePin** requires manual implementation in the Standard Library, or use bit manipulation.
  - No direct equivalent in Standard Library; commonly used: `GPIOx->ODR ^= GPIO_Pin;`

The HAL library is more abstract and more compatible, while the Standard Library is more low-level and more efficient but more complex.

## Detailed GPIO Mode Functions

- **Analog Mode**: Used to connect analog peripherals such as ADC (Analog-to-Digital Converter) or DAC (Digital-to-Analog Converter). In this mode, the pin does not perform digital input/output but directly passes analog signals to the internal ADC/DAC module for voltage measurement or analog voltage output. Commonly used for sensor input or audio output.

- **Alternate Function Mode**: Allows GPIO pins to be multiplexed by other peripherals such as UART, SPI, I2C, PWM, and other communication or timer functions. At this time, the pin is no longer used as a general GPIO but is controlled by the corresponding peripheral for data transmission, clock signals, etc. Whether to choose Push-Pull or Open-Drain depends on the peripheral requirements; for example, I2C often uses Open-Drain.

## GPIO Power Saving
If an IO is not in use, it can be configured to analog mode, so the pin will not consume current, thereby reducing power consumption.

## JTAG/SWD Pin Considerations
Early in the power-on/reset phase, the SWJ (SWD+JTAG) interface is enabled by default, and related pins may exhibit brief transients. These pins should not directly drive sensitive loads before system initialization.

- When using only SWD: The JTAG can be disabled early in initialization to release additional pins (such as JTDI/TDI, JTDO/TDO, JTMS/TMS, NJTRST). After release, these pins can be configured as regular GPIO input, output, or alternate function.
- Practical advice: Before disabling/remapping, configure these pins as input with appropriate pull-up/pull-down; only set the target mode and initial output level after release is complete to avoid misoperation at power-on.
- Trace/ITM: If serial debug output (SWO/JTDO) is not used, it is recommended to keep it disabled or configure it as input to avoid external triggering.

Examples (F1 series):
- HAL: Keep SWD, disable JTAG: `__HAL_AFIO_REMAP_SWJ_NOJTAG();`; Fully disable SWJ: `__HAL_AFIO_REMAP_SWJ_DISABLE();`
- Standard Library: Keep SWD, disable JTAG: `GPIO_PinRemapConfig(GPIO_Remap_SWJ_JTAGDisable, ENABLE);`; Fully disable SWJ: `GPIO_PinRemapConfig(GPIO_Remap_SWJ_Disable, ENABLE);`

The specific disable/remap methods may differ for different series chips. Please refer to the series reference manual and HAL/LL macro documentation.

## Series Differences Summary

- F1 (STM32F1)
  - Configuration location: AFIO remap.
  - Keep SWD, disable JTAG: `__HAL_AFIO_REMAP_SWJ_NOJTAG();`
    - Standard Library: `GPIO_PinRemapConfig(GPIO_Remap_SWJ_JTAGDisable, ENABLE);`
  - Fully disable SWJ: `__HAL_AFIO_REMAP_SWJ_DISABLE();`
    - Standard Library: `GPIO_PinRemapConfig(GPIO_Remap_SWJ_Disable, ENABLE);`
  - After release: Configure `PA15/PB3/PB4` as GPIO input/output/alternate function as needed.

- F4 (STM32F4)
  - Configuration location: In CubeMX `System Core -> SYS -> Debug` selection; no AFIO macros at code level.
  - Recommended: Select `Serial Wire` (keep SWD, release JTAG-only pins); `No Debug` releases all debug pins including `PA13/PA14`. Use with caution.
  - Common pins: SWDIO `PA13`, SWCLK `PA14`; JTAG-only: `PA15 (JTDI)`, `PB3 (JTDO/SWO)`, `PB4 (NJTRST)`.
  - After release example (applicable to F4/L4/H7, for reference only):

```c
// In early initialization phase, set JTAG-only pins to safe mode (input) or target mode
GPIO_InitTypeDef GPIO_InitStruct = {0};
__HAL_RCC_GPIOA_CLK_ENABLE();
__HAL_RCC_GPIOB_CLK_ENABLE();

GPIO_InitStruct.Mode = GPIO_MODE_INPUT;   // or GPIO_MODE_OUTPUT_PP, etc.
GPIO_InitStruct.Pull = GPIO_NOPULL;       // choose PULLUP/PULLDOWN based on external circuit

GPIO_InitStruct.Pin = GPIO_PIN_15;        // PA15: JTDI (can be used as regular GPIO in SWD mode)
HAL_GPIO_Init(GPIOA, &GPIO_InitStruct);

GPIO_InitStruct.Pin = GPIO_PIN_3 | GPIO_PIN_4; // PB3: JTDO/SWO, PB4: NJTRST
HAL_GPIO_Init(GPIOB, &GPIO_InitStruct);
```

- L4 (STM32L4)
  - Configuration location similar to F4: Via CubeMX `SYS -> Debug` select SWD/JTAG/disable.
  - Pin assignment basically consistent with F4 (specific models may vary slightly), SWD: `PA13/PA14`; JTAG-only: `PA15/PB3/PB4`.
  - If Trace/ITM is enabled, `PB3 (SWO)` will be occupied; when not in use, set to input or disable.

- H7 (STM32H7)
  - Configuration location similar to F4/L4: CubeMX `SYS -> Debug`; some dual-core devices (M7+M4) have independent debug ports. Confirm according to device manual.
  - Pins: SWD keeps `PA13/PA14`; JTAG-only common `PA15/PB3/PB4`; Trace/SWO uses `PB3`.
  - Disable or release strategy same as F4/L4: When Trace is not used, keep `PB3` disabled or input to avoid accidental triggering.

Note: The above pins are common mappings. For specific pin assignments, refer to the device datasheet/CubeMX pin view. Releasing debug pins will affect online debugging capability. Please handle with caution when in mass production or having strict pin requirements.