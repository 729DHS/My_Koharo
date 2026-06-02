---
title: STM32 SimpleFOC 位置伺服：从零到稳，2个Hard Bug的排查与修复全记录
link: stm32-simplefoc-debug-journal
catalog: true
date: 2026-06-01 10:30:00
description: STM32F103 + SimpleFOC Mini + AS5600 构建位置伺服系统的完整过程。从 uint16_t 整型溢出到 PID Reset 瞬态冲击，逐个记录排查过程与修复方案。
tags:
  - STM32
  - FOC
  - 电机控制
  - PID
  - 嵌入式
  - 调试
  - AS5600
categories:
  - [笔记, STM32]
---

## 一、项目背景

> 用 STM32F103C8T6 (Blue Pill) 从零搭建一个 FOC 位置伺服系统，驱动 2804 云台电机。

这套系统的"从零"不是从 SimpleFOC 库开始——而是从 CubeMX 生成的 HAL 代码开始，手写 FOC 核心算法、PID 控制器、编码器驱动、串口命令解析。整个开发周期约两周，其中**调试占了 80% 的时间**。

最终效果：电机锁位稳如磐石，推两圈松手原路倒两圈回来，PID 参数可在线调节无瞬态冲击。而这背后，是 2 个真实 bug 的定位与修复——以及几个"以为是根因"的误报记录。

### 硬件架构

```plain
STM32F103C8T6 (72MHz)
├── TIM1 CH1/CH2/CH3 (PA8/PA9/PA10) → SimpleFOC Mini IN1/IN2/IN3
├── PA11 GPIO OUT → SimpleFOC Mini ENABLE
├── I2C1 PB8(SCL) / PB9(SDA) → AS5600 磁编码器 (0x36)
├── USART1 PB6(TX) / PB7(RX) → USB-TTL (115200 8N1)
└── TIM2 (1098Hz 中断) → 控制循环节拍
```

- **MCU**: STM32F103C8T6, 72MHz, 64KB Flash, 20KB RAM
- **驱动板**: SimpleFOC Mini (3 路半桥)
- **编码器**: AS5600 12-bit 磁编码器 (I2C 接口)
- **电机**: 2804 云台电机, 12 槽 14 极 (7 极对), 低内阻

### 软件架构

```plain
main loop (110Hz)
  ├─ TIM2 中断 → foc_tick 标志
  ├─ 传感器读取 → AS5600 (软 I2C)
  ├─ 角度展开 → 单圈绝对值 → 累计角度
  ├─ PID 控制 → D-on-measurement + 低通滤波
  ├─ SVPWM → 三相正弦波 (中心对齐 PWM)
  └─ UART 命令解析 → ? T90 Kp0.1 ...
```

---

## 二、误报：硬件 I2C 卡死？

### 现象

电机正常运行 30~60 秒后突然"失力"——编码器读数冻结在某一个值，用手转电机完全无回正力矩，串口自动打印也停了。断电重插恢复，运行一段时间又复现。

### 排查过程

- `D` 命令（编码器诊断）在某次故障中读出了和 `?` 状态命令**不同的值**——`?` 报 Raw=1445, `D` 报 Raw=4030。排除编码器硬件故障。
- I2C Err 始终为 0——HAL 没有报错，但返回的是旧寄存器值，说明 I2C 外设可能进入了"假成功"状态。
- 查阅 STM32F103 Errata：**I2C 外设在特定总线时序下会卡死在 BUSY 状态**，软件无法通过正常方式恢复，只能复位外设。

### 尝试过的修复

```c
// 检测到读数连续 100 次不变时，尝试复位 I2C 外设
__HAL_RCC_I2C1_FORCE_RESET();
__HAL_RCC_I2C1_RELEASE_RESET();
HAL_I2C_Init(&hi2c1);
```

### 结果

改完软 I2C 之后，问题依然存在。后续发现真正的根因是 **uint16_t tick 溢出**，改了之后就稳定了。软件 I2C 的改动留下了（更可靠），但 I2C 本身**不是这个症状的根因**。

> **教训**: 一个症状可能有多个"嫌疑人"，改了 A 不代表修好了。当无法确认根因时，先找最直接的可重现线索（时间规律）。

---

## 三、误报：PID 正反馈？

### 现象

上电后电机不锁位，持续旋转。发 `T90` 后电机加速跑而不是停下来。

### 排查过程

检查 PID 的 setpoint/measurement 传参——逻辑看起来可能有问题。

### 结果

实际检查代码后发现 **PID 符号传参本身没有反转**，这并不是真正的 bug。症状的真正原因同样是 uint16_t tick 溢出——控制循环根本没在跑。

> **教训**: 在没有 trace 工具的情况下，容易把"没跑"当成"跑错了"。先确认代码是否真的在运行，再分析运行时的行为。

---

## 四、误报：栈溢出？

### 现象

电机每隔几十秒"突然死机"——自动打印停，电机吸附在磁极位，串口命令也没反应。

### 排查过程

- 检查栈大小：`STM32F103XX_FLASH.ld` 中 `_Min_Stack_Size = 0x400`（仅 1KB）
- `snprintf` + `%f` 会拉入 `_printf_float`，单条调用链栈消耗 >700 字节
- 尝试扩栈到 2KB + 大 buf 改 static

### 结果

改了之后问题依然存在。真正的根因依然是 uint16_t tick 溢出。

> **教训**: 嵌入式里 `snprintf` + `%f` 确实吃栈，但这题里不是它干的。猜测 + 修 + 验证，而不是修完没效果还接着信。

---

## 五、Bug #1 — uint16_t Tick 溢出 + C 整型提升陷阱

> 这是真正解决问题的那个 bug。改了之后系统稳定运行。

### 现象

电机每隔约 60 秒就"卡死"——自动打印停，电机不响应，但串口命令**还能处理**。观察到 tick_count 从 65535 跳回 0（uint16_t 溢出），和故障时间点完全吻合。

### 根因分析

这是 **C 语言的整型提升规则（Integer Promotion）** 导致的隐蔽 bug：

```c
volatile uint16_t tick_count = 0;
static uint16_t last_ctrl_tick = 65530;

// 你看到的：
if (tick_count - last_ctrl_tick >= 10)

// 编译器实际生成的：
// uint16_t - uint16_t → 提升为 signed int (32-bit)
if ((int)tick_count - (int)last_ctrl_tick >= 10)
//  当 tick_count 溢出归零时:
//  (int)0 - (int)65530 = -65530
//  -65530 >= 10 ? → false → 控制更新不再触发！
```

C11 标准 §6.3.1.1：当 `uint16_t`（比 `int` 窄）参与算术运算时，先提升为 `int`（有符号）。**无符号环绕特性在提升过程中被破坏了**。

这是一个非常隐蔽的 bug——代码逻辑看起来正确（无符号减法天然支持环绕），但编译器把它变成了有符号运算，溢出时得到负数，比较永远不成立。

### 修复

将 `tick_count` 和相关变量改为 `uint32_t`：

```c
volatile uint32_t tick_count = 0;       // 49 天溢出, 不再在运行时触发
static uint32_t last_ctrl_tick = 0;
static uint32_t print_tick = 0;
```

在 32 位 ARM 上, `uint32_t` = `unsigned int`, 与 `signed int` 同级。C 标准的 "usual arithmetic conversions" 规定**同级时 unsigned 优先**，所以 `uint32_t - uint32_t` 保持在无符号域。这才是**原理修复**——不是推迟溢出，而是保证减法永远在无符号域完成。

> **教训**: 嵌入式 C 中, `uint8_t` 和 `uint16_t` 的减法**不可信**——要么强转 `(uint16_t)(a - b)`, 要么直接用 `uint32_t`。这个 bug 花了两天才定位到编译器层面。**确认有效的修复：把 uint16_t 改成 uint32_t**。

---

## 六、Bug #2 — PID_Reset 后 D 项速度尖峰

> 这个 bug 也是真实存在的，调 PID 参数时会触发瞬态冲击。

### 现象

串口发 `kp0`（把 Kp 设为 0），电机突然猛踹一脚飞出去。之后即使恢复 Kp，电机已漂到未知位置。

### 根因

`PID_Reset` 将 `prev_measurement` 清零。下一个控制周期：

```plain
velocity = (measurement - 0) / 0.009s
         = (155° - 0°) / 0.009s
         = 17,200°/s

D_out = -Kd × 300 → 瞬间饱和 → 电机被 40% 占空比猛踹一脚
```

### 修复：哨兵值

```c
#define PID_MEAS_UNINIT (-1e10f)  // 合法角度 0~2π 不可能在此

void PID_Init(...) {
    pid->prev_measurement = PID_MEAS_UNINIT;
}

void PID_Reset(...) {
    pid->integral = 0.0f;
    pid->prev_measurement = PID_MEAS_UNINIT;  // 哨兵
    // deriv_filtered 不清零, 首帧 D 被跳过, 从零重新累积
}

float PID_Update(...) {
    if (pid->prev_measurement < -1e9f) {
        // 首帧 → 跳过 D, 仅记录当前值
        pid->prev_measurement = measurement;
        D_out = 0.0f;
    } else {
        // 正常 D 计算
    }
}
```

**效果：调 PID 参数不再产生瞬态冲击**。

> **教训**: Reset 函数不能盲清零。任何有记忆性的状态量在 Reset 时都要用哨兵值标记"未初始化"状态。

---

## 七、教训总结

| # | 问题 | 类别 | 结论 |
|---|-----|------|------|
| 1 | I2C BUSY | 误报 | 改了软 I2C，但症状的根因是 uint16_t 溢出 |
| 2 | PID 符号 | 误报 | 传参实际没有反转；真正原因是控制循环没有跑 |
| 3 | 栈溢出 | 误报 | 改了大 buf/扩了栈，但根因还是 uint16_t 溢出 |
| 4 | **uint16_t 整型提升** | **真实 bug** | **确认有效修复：改为 uint32_t** |
| 5 | **PID Reset D 尖峰** | **真实 bug** | **确认有效修复：哨兵值** |

两个真实 bug 都定位到了根因并修复。三个"嫌疑人"其实是**症状的副产品**而非根因——当 uint16_t 溢出导致控制循环停止时，所有"控制不工作"的表现都会被误认为各自有独立的根因。

**不找到根因就不算修好。** 同一个症状可能有多个人在喊，但你只能信第一个（最准时）的线索——时间规律是最好的 debug 信息。

---

> 完整源码：[GitHub - simpleFOC_1](https://github.com/729DHS/simplefoc_mini_STM32_demo)  
