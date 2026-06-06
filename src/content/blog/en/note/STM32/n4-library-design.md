---
title: STM32 Library Design Notes
link: stm32-library-design-note
date: 2025-12-30 00:00:00
description: STM32 driver library and abstraction layer design, handle encapsulation and conditional compilation practices.
tags:
  - STM32
  - Library Design
  - HAL
  - Embedded
categories:
  - [笔记, STM32]
---

# Library Design

Generally speaking, library ease-of-use is inversely correlated with complexity. When designing a **highly abstracted, easy-to-use library**, design patterns and three-layer architecture encapsulation need to be considered.

## Handle-based Object Encapsulation

In object-oriented programming, we use classes or structs to define the objects we operate on. Here is some SPI code from the STM32 HAL library:

```c
typedef struct __SPI_HandleTypeDef
{
  SPI_TypeDef                *Instance;      /*!< SPI registers base address               */
  SPI_InitTypeDef            Init;           /*!< SPI communication parameters             */
  const uint8_t              *pTxBuffPtr;    /*!< Pointer to SPI Tx transfer Buffer        */
  uint16_t                   TxXferSize;     /*!< SPI Tx Transfer size                     */
  __IO uint16_t              TxXferCount;    /*!< SPI Tx Transfer Counter                  */
  uint8_t                    *pRxBuffPtr;    /*!< Pointer to SPI Rx transfer Buffer        */
  uint16_t                   RxXferSize;     /*!< SPI Rx Transfer size                     */
  __IO uint16_t              RxXferCount;    /*!< SPI Rx Transfer Counter                  */
  void (*RxISR)(struct __SPI_HandleTypeDef *hspi);   /*!< function pointer on Rx ISR       */
  void (*TxISR)(struct __SPI_HandleTypeDef *hspi);   /*!< function pointer on Tx ISR       */
  DMA_HandleTypeDef          *hdmatx;        /*!< SPI Tx DMA Handle parameters             */
  DMA_HandleTypeDef          *hdmarx;        /*!< SPI Rx DMA Handle parameters             */
  HAL_LockTypeDef            Lock;           /*!< Locking object                           */
  __IO HAL_SPI_StateTypeDef  State;          /*!< SPI communication state                  */
  __IO uint32_t              ErrorCode;      /*!< SPI Error code                           */
#if (USE_HAL_SPI_REGISTER_CALLBACKS == 1U)
  void (* TxCpltCallback)(struct __SPI_HandleTypeDef *hspi);             /*!< SPI Tx Completed callback          */
  void (* RxCpltCallback)(struct __SPI_HandleTypeDef *hspi);             /*!< SPI Rx Completed callback          */
  void (* TxRxCpltCallback)(struct __SPI_HandleTypeDef *hspi);           /*!< SPI TxRx Completed callback        */
  void (* TxHalfCpltCallback)(struct __SPI_HandleTypeDef *hspi);         /*!< SPI Tx Half Completed callback     */
  void (* RxHalfCpltCallback)(struct __SPI_HandleTypeDef *hspi);         /*!< SPI Rx Half Completed callback     */
  void (* TxRxHalfCpltCallback)(struct __SPI_HandleTypeDef *hspi);       /*!< SPI TxRx Half Completed callback   */
  void (* ErrorCallback)(struct __SPI_HandleTypeDef *hspi);              /*!< SPI Error callback                 */
  void (* AbortCpltCallback)(struct __SPI_HandleTypeDef *hspi);          /*!< SPI Abort callback                 */
  void (* MspInitCallback)(struct __SPI_HandleTypeDef *hspi);            /*!< SPI Msp Init callback              */
  void (* MspDeInitCallback)(struct __SPI_HandleTypeDef *hspi);          /*!< SPI Msp DeInit callback            */
#endif  /* USE_HAL_SPI_REGISTER_CALLBACKS */
} SPI_HandleTypeDef;
```

From the code above, we can see that the HAL library encapsulates all required SPI parameters in the `SPI_HandleTypeDef` struct. Another example is the Standard Peripheral Library's GPIO initialization struct:

```c
typedef struct
{
  uint16_t GPIO_Pin;
  GPIOSpeed_TypeDef GPIO_Speed;
  GPIOMode_TypeDef GPIO_Mode;
}GPIO_InitTypeDef;

typedef enum
{
  GPIO_Speed_10MHz = 1,
  GPIO_Speed_2MHz,
  GPIO_Speed_50MHz
}GPIOSpeed_TypeDef;
#define IS_GPIO_SPEED(SPEED) (((SPEED) == GPIO_Speed_10MHz) || ((SPEED) == GPIO_Speed_2MHz) || \
                              ((SPEED) == GPIO_Speed_50MHz))

typedef enum
{ GPIO_Mode_AIN = 0x0,
  GPIO_Mode_IN_FLOATING = 0x04,
  GPIO_Mode_IPD = 0x28,
  GPIO_Mode_IPU = 0x48,
  GPIO_Mode_Out_OD = 0x14,
  GPIO_Mode_Out_PP = 0x10,
  GPIO_Mode_AF_OD = 0x1C,
  GPIO_Mode_AF_PP = 0x18
}GPIOMode_TypeDef;
```

The above is object encapsulation. Structs and enums are commonly used, but for non-embedded especially modern C++ code, typedef structs are not used; instead, classes and class enums are preferred.

## HAL Design and Conditional Compilation

Here is some Standard Library code:

```c
#ifdef CMSIS_NVIC_VIRTUAL
  #ifndef CMSIS_NVIC_VIRTUAL_HEADER_FILE
    #define CMSIS_NVIC_VIRTUAL_HEADER_FILE "cmsis_nvic_virtual.h"
  #endif
  #include CMSIS_NVIC_VIRTUAL_HEADER_FILE
#else
  #define NVIC_SetPriorityGrouping    __NVIC_SetPriorityGrouping
  #define NVIC_GetPriorityGrouping    __NVIC_GetPriorityGrouping
  #define NVIC_EnableIRQ              __NVIC_EnableIRQ
  #define NVIC_GetEnableIRQ           __NVIC_GetEnableIRQ
  #define NVIC_DisableIRQ             __NVIC_DisableIRQ
  #define NVIC_GetPendingIRQ          __NVIC_GetPendingIRQ
  #define NVIC_SetPendingIRQ          __NVIC_SetPendingIRQ
  #define NVIC_ClearPendingIRQ        __NVIC_ClearPendingIRQ
  #define NVIC_GetActive              __NVIC_GetActive
  #define NVIC_SetPriority            __NVIC_SetPriority
  #define NVIC_GetPriority            __NVIC_GetPriority
  #define NVIC_SystemReset            __NVIC_SystemReset
#endif /* CMSIS_NVIC_VIRTUAL */
```

Another example:

```c
#ifdef SYSCLK_FREQ_HSE
  static void SetSysClockToHSE(void);
#elif defined SYSCLK_FREQ_24MHz
  static void SetSysClockTo24(void);
#elif defined SYSCLK_FREQ_36MHz
  static void SetSysClockTo36(void);
#elif defined SYSCLK_FREQ_48MHz
  static void SetSysClockTo48(void);
#elif defined SYSCLK_FREQ_56MHz
  static void SetSysClockTo56(void);
#elif defined SYSCLK_FREQ_72MHz
  static void SetSysClockTo72(void);
#endif
```

This pattern of conditional compilation, macro detection, and platform-specific adaptation is commonly used in HAL design. The benefit is flexible configuration with pre-adapted platforms for quick porting. You only need to select the macros you need, or they can even be auto-detected, then conditional compilation handles the rest.

Of course, this pattern is for achieving subsequent black-boxing and unifying our library functions. Although it requires more code upfront, it becomes much easier to use later.

## Additional Code from High Abstraction and Defensive Programming

When code is highly encapsulated, we need to write additional automation configuration code for operations that would otherwise require manual intervention. Furthermore, to reserve room for more advanced operations, we need to keep our own original low-level operation functions.

Assume we implemented highly encapsulated, intelligent, automated GPIO configuration using our own library. The trade-off is that some operations we might want to do become unavailable, such as setting the IO pin to very high frequency. Or due to peripheral constraints, a complete initialization set configured by the library no longer works, and we must configure it ourselves. But since we're using our own library, we still need to expose low-level operations.

### Defensive Programming

Still using the Standard Library as an example:

```c
void GPIO_SetBits(GPIO_TypeDef* GPIOx, uint16_t GPIO_Pin)
{
  /* Check the parameters */
  assert_param(IS_GPIO_ALL_PERIPH(GPIOx));
  assert_param(IS_GPIO_PIN(GPIO_Pin));

  GPIOx->BSRR = GPIO_Pin;
}
```

The `assert_param` macro is defensive programming - a validation function that checks if input parameters are legal, otherwise directly enters hardfault. Even for the simplest Set operation, the IO port number legality is validated.

Another example is mutex locks and atomic operations, which are typical defensive programming techniques that ensure the program runs in a complete state and guarantees runtime environment safety.

### Callback Functions and Decoupling

Why do abstract library functions need callbacks?

First, let's understand what this question means.

Simply put, abstract libraries need to pass variable logic ("what to do when an event occurs") between different layers, but the library itself neither wants nor should care about specific business logic. Therefore, it provides a "hook point" (callback) for the upper layer to inject behavior.

- **Decoupling responsibilities**: The low-level library only handles event detection and process scheduling; the upper layer injects callbacks for business decisions. The two are independent, reducing coupling.
- **Eliminating active polling**: Without callbacks, the upper layer can only poll peripheral status; with callbacks, the library triggers passively at interrupt/task switching points, saving CPU and reducing latency.
- **Reusability and testability**: The same library code can be reused across different projects/modules by simply replacing callback implementations; during testing, fake callbacks can be injected to isolate hardware dependencies.
- **State machine closure**: The common HAL pattern "configure -> start -> event callback -> cleanup", callbacks provide an exit for the state machine, allowing the framework to correctly end or proceed to the next step.
- **Extensibility**: When additional processing (statistics, logging, security checks) is needed, adding or replacing callbacks completes it without modifying the library itself.

Callback usage notes:
- Callbacks should be as short and reentrant as possible, avoiding time-consuming or blocking operations in interrupt context.
- Understand callback timing and thread/interrupt context, otherwise races are easily introduced.
- Have fallback strategies for callback errors (return codes or error hooks) to avoid hiding failures.