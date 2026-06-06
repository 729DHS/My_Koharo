---
title: JLC FreeRTOS LED Demo
link: jlc-freertos-led-demo
date: 2026-04-02 22:48:50
description: JLC Foundation Board FreeRTOS LED demo, using the onboard PB8 LED and PB2 LED.
tags:
  - STM32
  - Embedded
  - Foundation Board
categories:
  - [笔记, STM32]
---

# Tutorial: FreeRTOS Multi-Task Basics and GPIO Control

## 0. Experiment Overview
This experiment is a mandatory introduction to Embedded Real-Time Operating Systems (RTOS). By creating two tasks with different priorities to control two LEDs blinking at different frequencies, it visually demonstrates FreeRTOS's **multi-task scheduling**, **priority preemption**, and **time management** mechanisms.

> **Learning Objectives**
> 1. Understand the concept of a FreeRTOS "Task" and how it differs from bare-metal `while(1)`.
> 2. Master the method of configuring FreeRTOS tasks using STM32CubeMX.
> 3. Deeply understand the meaning of each parameter in `osThreadNew` when creating a task.
> 4. Learn to analyze the scheduling behavior of tasks with different priorities.

---

## 1. Prerequisites

### 1.1 What is a FreeRTOS Task?
In a bare-metal program, we typically execute code sequentially within a dead loop `while(1)`. In an RTOS, the program is split into multiple independent "tasks". Each task appears to 独占 CPU, but the OS kernel (Scheduler) rapidly switches between tasks based on **priority** and **time slice**, achieving macroscopic "parallelism".

### 1.2 Hardware Basics
- **MCU**: STM32F407 (Cortex-M4)
- **LED Connections**:
  - **LED1** -> **PB2** (Push-Pull Output)
  - **LED2** -> **PB8** (Push-Pull Output)
- **Clock**: System main frequency 168MHz, SysTick or TIM14 provides the heartbeat tick.

---

## 2. Principle Analysis

### 2.1 Task Priority and Scheduling
This experiment creates two tasks:
- **Task PB2**: Priority `Normal` (higher)
- **Task PB8**: Priority `Low` (lower)

**Scheduling Rules**:
FreeRTOS uses **priority-based preemptive scheduling**.
- When a higher-priority task is ready, the CPU immediately executes it.
- Only when the higher-priority task enters **blocking state** (e.g., calling `osDelay`) does the lower-priority task get a chance to run.
- In this experiment, both tasks spend most of their time in `osDelay` blocking, so they alternate execution without interfering with each other.

### 2.2 Time Delay (`osDelay`)
- `osDelay(1000)`: Means the task is suspended for 1000 system ticks.
- Assuming the system tick frequency is 1000Hz (1ms), the delay time is 1 second.
- **Key Point**: During the delay, this task does not consume CPU resources; the CPU can execute other ready lower-priority tasks. This is the core of efficient multi-tasking.

---

## 3. In-Depth Code Analysis

The following teaching breakdown is based on `Core/Src/main.c`.

### 3.1 Task Attribute Definitions
In the global variable section of `main.c`, the task's "ID card" is defined.