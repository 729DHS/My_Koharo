---
title: STM32 Keil RTE 与 RTOS 笔记
link: stm32-keil-rte-rtos
date: 2025-12-28 00:00:00
description: STM32 在 Keil RTE 环境下的项目创建与 FreeRTOS API 基础记录。
tags:
    - STM32
    - RTOS
    - FreeRTOS
    - Keil
categories:
  - [笔记, STM32]
---

# Keil+RTE 环境创建

打开 Keil,New uVision Project,选择芯片 STM32f103C8T6,默认弹出 RTE 窗口

如图,进行 Std 标准库创建时,选择以下基础内容:
CMSIS --> CORE 这是链接 ARM 芯片的核心
Device --> Startup 这是芯片启动必须链接的
其他可以不需要
但是使用标准库操作 STM32 时,还需要
Device --> StdPeriph Drivers 下的内容
如 RCC,GPIO,I2C 等,选择后出现黄色报错,点击界面最左下角的 Resolve 即可,会自动寻找依赖项选择,如 Framework

这样最基础的 Std 库项目创建完成,其他跟普通的创建项目没有区别
创建主函数,写个简单 demo,点击 Options for Target,也就是常说的魔术棒
点击 C/C++(AC6)进行宏定义设置
对于 103C8 需要写 STM32F10X_MD
对于标准库需要写 USD_STDPERIPH_DRIVER
以及对于 AC6+CMSIS 6.X 版本,需要加入 IP=IPR
对 CMSIS 5.X 则不需要

想知道自己库的版本,或者对版本和库进行管理,点击 RTE 图标旁边的 Pack Installer 即可

# 对于 FreeRTOS 的一些知识
FreeRTOS 的 API 分为两个版本,一个是原生,一个是 CMSIS 版 API,CMSIS 对原生函数名等进行改写

## 原生 API
遵循一套独特的命名约定，函数名通常包含返回类型。

以下是原生例程

```c
#include "stm32f10x.h"
#include "stm32f10x_conf.h"
#include <stdio.h>
#include "FreeRTOS.h"
#include "task.h"

volatile uint32_t g_counter = 0;  // 简单计数器，LED和UART共享

void LED_Init(void) {
    GPIO_InitTypeDef gpio;
    RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOC, ENABLE);
    gpio.GPIO_Pin = GPIO_Pin_13;
    gpio.GPIO_Mode = GPIO_Mode_Out_PP;
    gpio.GPIO_Speed = GPIO_Speed_2MHz;
    GPIO_Init(GPIOC, &gpio);
}

void USART1_Init(void) {
    GPIO_InitTypeDef gpio; USART_InitTypeDef usart;
    RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOA | RCC_APB2Periph_USART1, ENABLE);
    gpio.GPIO_Pin = GPIO_Pin_9;  gpio.GPIO_Mode = GPIO_Mode_AF_PP;      gpio.GPIO_Speed = GPIO_Speed_50MHz; GPIO_Init(GPIOA, &gpio);
    gpio.GPIO_Pin = GPIO_Pin_10; gpio.GPIO_Mode = GPIO_Mode_IN_FLOATING;                               GPIO_Init(GPIOA, &gpio);
    usart.USART_BaudRate = 115200; usart.USART_WordLength = USART_WordLength_8b; usart.USART_StopBits = USART_StopBits_1;
    usart.USART_Parity = USART_Parity_No; usart.USART_HardwareFlowControl = USART_HardwareFlowControl_None; usart.USART_Mode = USART_Mode_Tx | USART_Mode_Rx;
    USART_Init(USART1, &usart); USART_Cmd(USART1, ENABLE);
}

int fputc(int ch, FILE *f) {
    USART_SendData(USART1, (uint8_t)ch);
    while (USART_GetFlagStatus(USART1, USART_FLAG_TXE) == RESET);
    return ch;
}

static void USART1_SendChar(char c) {
    USART_SendData(USART1, c);
    while (USART_GetFlagStatus(USART1, USART_FLAG_TXE) == RESET);
}

static void USART1_SendString(const char *s) {
    while (*s) USART1_SendChar(*s++);  // 简单同步发送，不做缓冲
}

void LedTask(void *param) {
    while (1) {
        GPIO_ResetBits(GPIOC, GPIO_Pin_13);  // LED on
        vTaskDelay(pdMS_TO_TICKS(500));
        GPIO_SetBits(GPIOC, GPIO_Pin_13);    // LED off
        vTaskDelay(pdMS_TO_TICKS(500));
    }
}

void UartTask(void *param) {
    char buf[16]; uint32_t val; int i;
    while (1) {
        g_counter++; val = g_counter; i = 0;
        if (val == 0) { buf[i++] = '0'; }
        else {
            char tmp[10]; int j = 0;
            while (val) { tmp[j++] = (val % 10) + '0'; val /= 10; } // 反转收集数字
            while (j--) buf[i++] = tmp[j];                         // 再反转得到正序
        }
        buf[i] = '\0';
        USART1_SendString(buf); USART1_SendString("\r\n");      // 发送计数值
        vTaskDelay(pdMS_TO_TICKS(1000));
    }
}

int main(void) {
    SystemInit();                 // HAL/CMSIS 启动
    LED_Init(); USART1_Init();    // 硬件初始化
    xTaskCreate(LedTask, "LED", 128, NULL, 1, NULL);   // 低栈闪灯
    xTaskCreate(UartTask, "UART", 512, NULL, 1, NULL); // 串口打印任务
    vTaskStartScheduler();        // 启动调度
    while (1) { /* should never reach */ }
}

```


以下是 CMSIS V2 例程

```c
#include "stm32f10x.h"
#include "cmsis_os2.h"
#include <stdio.h>

volatile uint32_t g_counter = 0;    // LED 线程自增计数，UART读取
osThreadId_t ledTaskHandle;         // LED 线程句柄
osThreadId_t uartTaskHandle;        // UART 线程句柄

static void LED_Task(void *argument);   // 闪灯任务
static void UART_Task(void *argument);  // 串口打印任务
static void USART1_Init(void);
static void USART1_SendChar(char c);
static void USART1_SendString(const char *s);

static void LED_Task(void *argument) {
    GPIO_InitTypeDef gpio;
    RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOC, ENABLE);
    gpio.GPIO_Pin = GPIO_Pin_13; gpio.GPIO_Mode = GPIO_Mode_Out_PP; gpio.GPIO_Speed = GPIO_Speed_50MHz; GPIO_Init(GPIOC, &gpio);
    GPIO_SetBits(GPIOC, GPIO_Pin_13);  // 默认灭
    for (;;) {
        GPIO_ResetBits(GPIOC, GPIO_Pin_13); g_counter++; osDelay(500);
        GPIO_SetBits(GPIOC, GPIO_Pin_13);    osDelay(500);
    }
}

static void UART_Task(void *argument) {
    char buf[64];
    USART1_Init();  // 独立初始化串口
    for (;;) {
        snprintf(buf, sizeof(buf), "Hello RTOS, g_counter = %lu\r\n", g_counter);
        USART1_SendString(buf);  // 直接同步发送
        osDelay(1000);
    }
}

static void USART1_Init(void) {
    GPIO_InitTypeDef gpio; USART_InitTypeDef usart;
    RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOA | RCC_APB2Periph_USART1, ENABLE);
    gpio.GPIO_Pin = GPIO_Pin_9;  gpio.GPIO_Mode = GPIO_Mode_AF_PP;      gpio.GPIO_Speed = GPIO_Speed_50MHz; GPIO_Init(GPIOA, &gpio);
    gpio.GPIO_Pin = GPIO_Pin_10; gpio.GPIO_Mode = GPIO_Mode_IN_FLOATING;                               GPIO_Init(GPIOA, &gpio);
    usart.USART_BaudRate = 115200; usart.USART_WordLength = USART_WordLength_8b; usart.USART_StopBits = USART_StopBits_1;
    usart.USART_Parity = USART_Parity_No; usart.USART_Mode = USART_Mode_Tx; usart.USART_HardwareFlowControl = USART_HardwareFlowControl_None;
    USART_Init(USART1, &usart); USART_Cmd(USART1, ENABLE);
}

static void USART1_SendChar(char c) {
    USART_SendData(USART1, c);
    while (USART_GetFlagStatus(USART1, USART_FLAG_TXE) == RESET);
}

static void USART1_SendString(const char *s) {
    while (*s) USART1_SendChar(*s++);  // 简单轮询方式
}

int main(void) {
    NVIC_PriorityGroupConfig(NVIC_PriorityGroup_4);
    osKernelInitialize();
    ledTaskHandle = osThreadNew(LED_Task, NULL, NULL);   // 创建闪灯线程
    uartTaskHandle = osThreadNew(UART_Task, NULL, NULL); // 创建串口线程
    osKernelStart();                                    // 启动调度器
    while (1) {}                                        // 不应返回
}

```

# 杂谈

需要注意的是在 RTOS 里要避免 newLib,比如 Stdio.h,printf,这些函数库对于 RTOS 并不友好

## 为什么 Newlib 对 RTOS “不友好”？
A. 重入性 (Reentrancy) 风险
这是最致命的问题。printf、malloc、strtok 等函数通常使用全局变量或静态缓冲区。
冲突： 如果任务 A 正在调用 printf 打印一半，此时更高优先级的任务 B 抢占了 CPU 也调用 printf，全局缓冲区的数据就会被污染，甚至导致硬件异常。
Newlib 的补救： Newlib 提供了一个 struct _reent 结构体，但 RTOS 必须为每个任务都分配一个这样的结构体并在任务切换时进行切换，这会极大增加内存开销。

B. 栈空间的“大胃王”
printf 是一个非常复杂的函数，它需要处理各种格式化、浮动溢出和内部缓存。
内存占用： 调用一次标准 printf 可能会瞬间消耗几百甚至上千字节的栈空间。
后果： 在 RTOS 中，每个任务的栈大小是有限的（通常设为 128 或 256 字），直接调用 printf 极易引发 Stack Overflow。

C. 线程安全与 Lock
Newlib 的某些函数内部会尝试调用 __malloc_lock 和 __malloc_unlock。如果这些底层的锁函数没有被正确映射到 RTOS 的信号量或互斥量上，系统就会死锁或产生竞态。

总结：RTOS 的“避坑手册”
1. 禁止在中断 (ISR) 中调用 printf： 这几乎 100% 会导致系统挂死。
2. 谨慎对待浮点数： %f 格式化极其消耗性能和栈空间。
3. 检查栈大小： 如果必须用标准库，请务必调大任务栈（Stack Size）。
4. 配置 Newlib-nano： 在 STM32CubeIDE 等编译器中，勾选 --specs=nano.specs，它可以大幅缩减标准库体积，但依然不能完全解决线程安全问题。

## Cortex-M 上的原子操作小结
- 8/16/32 位对齐的读写在 Cortex-M3/M4 上天然原子（单总线周期），但非对齐或跨字宽访问就不原子。
- 禁中断法：短临界区可用 `__disable_irq()` / `__enable_irq()` 包裹，或 FreeRTOS 的 `taskENTER_CRITICAL`/`taskEXIT_CRITICAL`；注意临界区越短越好。
- 自旋原子指令：Cortex-M3+ 支持 `LDREX`/`STREX` 形成原子操作，CMSIS 提供封装：
    - `__LDREXW` / `__STREXW`：32 位独占读写，用于自定义无锁结构。
    - `__CLREX`：清除独占标记，避免意外占用。
- 内存屏障：
    - `__DMB()` 数据内存屏障，保证访存顺序（典型用在共享变量标志位前后）。
    - `__DSB()` 数据同步屏障，确保之前的访存完成后才继续；常见于外设寄存器配置完成后。
    - `__ISB()` 指令同步屏障，刷新流水线，常用于切换栈/向量表后。
- 原子加减建议：
    - C11 `stdatomic` 若编译器/库支持，可用 `atomic_fetch_add` 等，底层会用 LDREX/STREX。
    - 否则用禁中断或基于 `__LDREXW`/`__STREXW` 的循环实现 `atomic_inc`/`atomic_dec`。
- FreeRTOS 场景：
    - 任务间优先用队列/信号量/互斥量；ISR 到任务用中断安全 API（以 `FromISR` 结尾）。
    - 若仅是简单计数且在任务上下文，可用 `taskENTER_CRITICAL` 包裹；在 ISR 中则禁用更低优先级中断或用 `ulPortSetInterruptMask`/`vPortClearInterruptMask`（端口相关）。