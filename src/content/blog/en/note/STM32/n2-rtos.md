---
title: STM32 Keil RTE and RTOS Notes
link: stm32-keil-rte-rtos
date: 2025-12-28 00:00:00
description: Notes on project creation in Keil RTE environment for STM32 and FreeRTOS API basics.
tags:
    - STM32
    - RTOS
    - FreeRTOS
    - Keil
categories:
  - [笔记, STM32]
---

# Keil+RTE Environment Setup

Open Keil, New uVision Project, select chip STM32f103C8T6, and the RTE window will pop up by default.

As shown in the figure, when creating a Standard library project, select the following basic content:
CMSIS --> CORE: This is the core that links the ARM chip
Device --> Startup: This is required to link the chip startup
Other items are not required
However, when using the Standard library to operate STM32, you also need:
Device --> StdPeriph Drivers: Content under it
Such as RCC, GPIO, I2C, etc. After selection, a yellow error will appear. Click Resolve in the bottom left corner of the interface, and it will automatically find dependencies and select them, such as Framework

This completes the most basic Std library project creation. Other steps are no different from ordinary project creation.
Create the main function, write a simple demo, click Options for Target, commonly known as the magic wand.
Click C/C++ (AC6) to set macros.
For 103C8, write STM32F10X_MD
For Standard library, write USE_STDPERIPH_DRIVER
Also, for AC6+CMSIS 6.X version, you need to add IP=IPR
For CMSIS 5.X, this is not required

To check your library version or manage versions and libraries, click the Pack Installer next to the RTE icon.

# Some Knowledge About FreeRTOS
FreeRTOS's API has two versions: the native version and the CMSIS version. CMSIS rewrites the native function names, etc.

## Native API
Follows a unique naming convention where function names usually contain return types.

Here is a native example:

```c
#include "stm32f10x.h"
#include "stm32f10x_conf.h"
#include <stdio.h>
#include "FreeRTOS.h"
#include "task.h"

volatile uint32_t g_counter = 0;  // Simple counter, shared by LED and UART

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
    while (*s) USART1_SendChar(*s++);  // Simple synchronous send, no buffering
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
            while (val) { tmp[j++] = (val % 10) + '0'; val /= 10; } // Reverse and collect digits
            while (j--) buf[i++] = tmp[j];                         // Reverse again to get correct order
        }
        buf[i] = '\0';
        USART1_SendString(buf); USART1_SendString("\r\n");      // Send counter value
        vTaskDelay(pdMS_TO_TICKS(1000));
    }
}

int main(void) {
    SystemInit();                 // HAL/CMSIS startup
    LED_Init(); USART1_Init();    // Hardware initialization
    xTaskCreate(LedTask, "LED", 128, NULL, 1, NULL);   // Low-stack LED blink
    xTaskCreate(UartTask, "UART", 512, NULL, 1, NULL); // UART print task
    vTaskStartScheduler();        // Start scheduler
    while (1) { /* should never reach */ }
}

```


Here is a CMSIS V2 example:

```c
#include "stm32f10x.h"
#include "cmsis_os2.h"
#include <stdio.h>

volatile uint32_t g_counter = 0;    // LED thread auto-increment counter, read by UART
osThreadId_t ledTaskHandle;         // LED thread handle
osThreadId_t uartTaskHandle;        // UART thread handle

static void LED_Task(void *argument);   // LED blink task
static void UART_Task(void *argument);  // UART print task
static void USART1_Init(void);
static void USART1_SendChar(char c);
static void USART1_SendString(const char *s);

static void LED_Task(void *argument) {
    GPIO_InitTypeDef gpio;
    RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOC, ENABLE);
    gpio.GPIO_Pin = GPIO_Pin_13; gpio.GPIO_Mode = GPIO_Mode_Out_PP; gpio.GPIO_Speed = GPIO_Speed_50MHz; GPIO_Init(GPIOC, &gpio);
    GPIO_SetBits(GPIOC, GPIO_Pin_13);  // Default off
    for (;;) {
        GPIO_ResetBits(GPIOC, GPIO_Pin_13); g_counter++; osDelay(500);
        GPIO_SetBits(GPIOC, GPIO_Pin_13);    osDelay(500);
    }
}

static void UART_Task(void *argument) {
    char buf[64];
    USART1_Init();  // Initialize UART independently
    for (;;) {
        snprintf(buf, sizeof(buf), "Hello RTOS, g_counter = %lu\r\n", g_counter);
        USART1_SendString(buf);  // Direct synchronous send
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
    while (*s) USART1_SendChar(*s++);  // Simple polling method
}

int main(void) {
    NVIC_PriorityGroupConfig(NVIC_PriorityGroup_4);
    osKernelInitialize();
    ledTaskHandle = osThreadNew(LED_Task, NULL, NULL);   // Create LED thread
    uartTaskHandle = osThreadNew(UART_Task, NULL, NULL); // Create UART thread
    osKernelStart();                                    // Start scheduler
    while (1) {}                                        // Should not return
}

```

# Commentary

An important note is to avoid NewLib in RTOS, such as stdio.h and printf. These function libraries are not friendly to RTOS.

## Why is NewLib "Unfriendly" to RTOS?

A. Reentrancy Risk
This is the most critical issue. Functions like printf, malloc, and strtok typically use global variables or static buffers.
Conflict: If task A is in the middle of printing with printf and a higher-priority task B preempts the CPU and also calls printf, the global buffer data will be corrupted, potentially causing hardware exceptions.
Newlib's remedy: Newlib provides a struct _reent structure, but the RTOS must allocate one such structure for every task and switch them during task context switches, which greatly increases memory overhead.

B. Stack Space "Big Eater"
printf is a very complex function that needs to handle various formatting, floating-point overflow, and internal caching.
Memory consumption: Calling standard printf once can instantly consume hundreds or even thousands of bytes of stack space.
Consequence: In RTOS, each task's stack size is limited (usually set to 128 or 256 words). Directly calling printf can easily cause Stack Overflow.

C. Thread Safety and Locks
Some functions in Newlib internally try to call __malloc_lock and __malloc_unlock. If these underlying lock functions are not correctly mapped to RTOS semaphores or mutexes, the system will deadlock or produce race conditions.

Summary: RTOS "Pitfall Avoidance Guide"
1. Never call printf in an interrupt (ISR): This will almost 100% cause the system to hang.
2. Be cautious with floating-point numbers: %f formatting is extremely performance and stack-space consuming.
3. Check stack size: If you must use the standard library, be sure to increase the task stack size.
4. Configure Newlib-nano: In compilers like STM32CubeIDE, check --specs=nano.specs, which can greatly reduce standard library size, but still cannot completely solve thread safety issues.

## Summary of Atomic Operations on Cortex-M
- Aligned 8/16/32-bit reads/writes are naturally atomic on Cortex-M3/M4 (single bus cycle), but unaligned or cross-word-width access is not atomic.
- Disable interrupt method: Short critical sections can be wrapped with `__disable_irq()` / `__enable_irq()`, or FreeRTOS's `taskENTER_CRITICAL`/`taskEXIT_CRITICAL`; note that critical sections should be as short as possible.
- Spinlock atomic instructions: Cortex-M3+ supports `LDREX`/`STREX` to form atomic operations. CMSIS provides wrappers:
    - `__LDREXW` / `__STREXW`: 32-bit exclusive read/write, used for custom lock-free structures.
    - `__CLREX`: Clear exclusive tag to avoid accidental 占有.
- Memory barriers:
    - `__DMB()`: Data memory barrier, ensures memory access order (typically used before and after shared variable flags).
    - `__DSB()`: Data synchronization barrier, ensures previous memory accesses complete before continuing; commonly seen after peripheral register configuration.
    - `__ISB()`: Instruction synchronization barrier, flushes pipeline, commonly used after switching stack/vector table.
- Atomic add/subtract suggestions:
    - C11 `stdatomic` if compiler/library supports it, can use `atomic_fetch_add`, etc., which will use LDREX/STREX underneath.
    - Otherwise, use interrupt disable or loop implementation based on `__LDREXW`/`__STREXW` to implement `atomic_inc`/`atomic_dec`.
- FreeRTOS scenarios:
    - For inter-task communication, prefer queues/semaphores/mutexes; for ISR to task, use interrupt-safe API (ending with `FromISR`).
    - If it is only simple counting in task context, `taskENTER_CRITICAL` can be used; in ISR, disable lower-priority interrupts or use `ulPortSetInterruptMask`/`vPortClearInterruptMask` (port-specific).