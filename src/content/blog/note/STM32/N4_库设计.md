---
title: STM32 库设计笔记
link: stm32-library-design
date: 2025-12-30 00:00:00
description: STM32 驱动库与抽象层设计、句柄封装与条件编译实践。
tags:
  - STM32
  - 库设计
  - HAL
  - 嵌入式
categories:
  - [笔记, STM32]
---

# 库设计

一般而言,库的易用性和复杂度负相关,在设计**高度抽象的易用性库**时,需要考虑设计模式和三层架构封装

## 句柄化与对象封装
在面对对象编程中,我们用类或结构体来完成定义我们所操作的对象
以下是 STM32 HAL 库的一段 SPI 代码
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
从上代码中可见,HAL 库为了封装 SPI,用这个 SPI__HandleType 结构体把所需全部参数封装
- 再比如标准库的 GPIO 初始化结构体
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
以上是对对象的封装,常见还是用到结构体跟 enum 枚举,但是对于非嵌入式尤其是现代 C++而言,不使用 typedef 结构体,一般使用类和类枚举

## HAL 设计与条件编译
来看一段标准库代码
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
再比如
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
这种条件编译和检测宏定义然后看人下菜的模式,经常用于 HAL 设计,好处就是,可以灵活配置,已经对接好了各种可以快速移植的平台,你只需要选择你需要的宏定义甚至可以自动识别宏定义,然后条件编译

当然,我们这种模式是为了实现后续的黑盒化,统一我们的库函数什么的,虽然前期写的痛苦代码较多,但是后期使用方便.


## 高度抽象带来的额外代码和防御性编程
当我们代码高度封装,就会出现我们为了实现这些本需要我们自己操作的内容,需要额外写自动化配置的多余代码,甚至还需要为了预留更高级的操作,我们还需要保留自己的一份原始底层操作函数代码
假设我们用自己的库实现了高度封装高度智能自动化的 GPIO 配置,但是这样的代价就是有些操作我们不能做,比如让 IO 口频率很高,或者因为外设原因,原本库中配置好的一套初始化就不能用了,我们只能自己配置,但是这个时候我们用的是自己的库,所以还是需要预留底层操作

### 防御性编程
仍然是标准库的案例:
```c
void GPIO_SetBits(GPIO_TypeDef* GPIOx, uint16_t GPIO_Pin)
{
  /* Check the parameters */
  assert_param(IS_GPIO_ALL_PERIPH(GPIOx));
  assert_param(IS_GPIO_PIN(GPIO_Pin));
  
  GPIOx->BSRR = GPIO_Pin;
}
```

这个 assert_param 宏就是防御性编程,这是一个检验的函数用于检验传入参数是否合法,否则直接进入 hardfault,在这里即使是最简单的 Set 操作,也检验了 IO 端口号的合法性
再比如说互斥锁和原子操作,就是典型的防御性编程,保证程序运行时至少是完全在运行的,保证运行环境安全性.

### 回调函数与解耦
为什么抽象库函数需要回调?
首先我们理解这个问题是什么意思
简单说,抽象库需要在不同层间传递“当事件发生时要做什么”的可变逻辑,但库本身又不想也不应关心具体业务,于是提供一个“挂钩点”(回调)让上层注入行为。
- **解耦职责**: 底层库只负责检测事件、调度流程,上层注入的回调负责业务决策,两者互不依赖,降低耦合。
- **消除主动轮询**: 没有回调时,上层只能轮询查询外设状态;有了回调,库在中断/任务切换点被动触发,既省 CPU 又降低延迟。
- **复用与可测试性**: 同一套库代码可以被不同项目/模块复用,只需更换回调实现即可;测试时也能用假回调注入,隔离硬件依赖。
- **状态机闭环**: HAL 里常见的“配置->启动->事件回调->收尾”模式,回调为状态机提供了出口,让框架能够正确结束或继续下一步。
- **扩展性**: 当需要额外处理(统计、日志、安全检查)时,增加或替换回调就能完成,无需修改库本体。

回调的使用注意点:
- 回调应尽量短小可重入,避免在中断上下文里做耗时或阻塞操作。
- 明确回调的调用时机与线程/中断上下文,否则容易出现竞态。
- 对回调错误要有兜底策略(返回码或错误钩子),避免隐藏故障。