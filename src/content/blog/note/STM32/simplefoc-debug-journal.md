---
title: STM32 SimpleFOC 位置伺服：从零到稳，7个Hard Bug的排查与修复全记录
link: stm32-simplefoc-debug-journal
catalog: true
date: 2026-06-01 10:30:00
description: STM32F103 + SimpleFOC Mini + AS5600 构建位置伺服系统的完整过程。从硬件I2C卡死、PID正反馈、栈溢出到C语言整型提升陷阱，逐个记录7个硬bug的排查根因与修复方案。
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

最终效果：电机锁位稳如磐石，推两圈松手原路倒两圈回来，PID 参数可在线调节无瞬态冲击。而这背后，是 7 个硬 bug 的逐一击破。

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

## 二、Bug #1 — 硬件 I2C 卡死 (BUSY Lockup)

### 现象

电机正常运行 30~60 秒后突然"失力"——编码器读数冻结在某一个值，用手转电机完全无回正力矩，串口自动打印也停了。断电重插恢复，运行一段时间又复现。Debug 单步跟踪发现主循环在 `HAL_I2C_Mem_Read` 中卡死。

### 排查

- `D` 命令（编码器诊断）在某次故障中读出了和 `?` 状态命令**不同的值**——`?` 报 Raw=1445, `D` 报 Raw=4030。排除编码器硬件故障。
- I2C Err 始终为 0——HAL 没有报错，但返回的是旧寄存器值，说明 I2C 外设进入了"假成功"状态。
- 查阅 STM32F103 Errata：**I2C 外设在特定总线时序下会卡死在 BUSY 状态**，软件无法通过正常方式恢复，只能复位外设。

### 尝试过的修复：硬件复位

```c
// 检测到读数连续 100 次不变时，尝试复位 I2C 外设
__HAL_RCC_I2C1_FORCE_RESET();
__HAL_RCC_I2C1_RELEASE_RESET();
HAL_I2C_Init(&hi2c1);
```

**效果：部分改善，但不能根除**。HAL 返回"假成功"时 `raw != 0xFFFF`，所以走不到硬件复位分支。

### 最终修复：软件 GPIO 模拟 I2C

彻底放弃 STM32F1 的硬件 I2C，用 GPIO 位操作（bit-banging）实现 I2C 主机协议。

```c
// soft_i2c.c — 核心操作
#define SCL_H() (GPIOB->BSRR = GPIO_PIN_8)
#define SCL_L() (GPIOB->BRR  = GPIO_PIN_8)
#define SDA_H() (GPIOB->BSRR = GPIO_PIN_9)
#define SDA_L() (GPIOB->BRR  = GPIO_PIN_9)
#define SDA_RD() ((GPIOB->IDR & GPIO_PIN_9) ? 1U : 0U)
```

**性能影响**：每次读 2 字节约 1~1.5ms，控制周期 9ms，CPU 占用 <15%。引脚不变，硬件接线不动。

**效果：彻底解决**。软件 I2C 没有状态机，不存在 BUSY 卡死。

> **教训**: STM32F103 的硬件 I2C 有已知 Errata，在有可靠性要求的场景下建议直接用软件模拟。查 Errata 是第一生产力。

---

## 三、Bug #2 — PID 正反馈（符号反转）

### 现象

上电后电机不锁位，而是持续旋转。发 `T90`（设目标 90°）后电机加速跑，不是停下来。

### 排查

原来的 FOC 位置伺服的计算链路为：

```c
// 旧代码 (有 bug)
float error = motor->target_position - theta_m;
error = normalize_to_pi(error);     // 归一化到 [-π, π]
float torque = PID_Update(&motor->pid, 0.0f, error, motor->dt);
//                                     ^^^  ^^^^^
//                                  setpoint=0, measurement=error
```

而 `PID_Update` 内部做的是 `error = setpoint - measurement = 0 - error = theta_m - target`。符号反了——**误差的正负和力矩方向相反**。

- 实际位置 < 目标 → PID 输出**负**力矩 → 电机往反方向转 → **正反馈**
- 越偏越推，电机永远锁不住

### 修复

```c
// 新代码
float torque = PID_Update(&motor->pid, motor->target_position, theta_m, motor->dt);
//                                     ^^^^^^^^^^^^^^^^^^^^  ^^^^^^
//                                     setpoint=目标           measurement=实测
```

PID 内部直接得到 `error = target - theta_m`, 符号正确。

**效果：电机开始有回正力**。

> **教训**: PID 的 `setpoint` 和 `measurement` 传参在封装后容易搞反，应该做一次单元测试验证符号正确性。

---

## 四、Bug #3 — 栈溢出 → HardFault 死机

### 现象

修复 I2C 和 PID 后，电机仍然每隔几十秒"突然死机"——自动打印停，电机吸附在磁极位（PWM 输出直流电压），串口命令也没反应。

### 根因分析

栈大小：`_Min_Stack_Size = 0x400` (**仅 1KB**)。

调用链栈消耗估算：

```plain
main() 循环
  └─ UART_ParseCommand()
       └─ UART_PrintStatus()
            char buf[384];                    // 384 字节
            snprintf(buf, sizeof(buf), ...)   // _printf_float 内部 ~200 字节
            UART_SendString(...)
              └─ HAL_UART_Transmit(...)       // HAL 内部 ~100 字节
```

**单条调用链 >700 字节**。加上嵌套中断压栈，1KB 栈极易踩穿。溢出后破坏返回地址 → HardFault → 默认 Handler 死循环 → 全停。

### 修复

1. **扩栈**：`STM32F103XX_FLASH.ld` 中 `_Min_Stack_Size = 0x800` (2KB)
2. **大缓冲区移出栈**：`buf[384]`, `buf[96]`, `buf[64]` 全部改为 `static`, 分配在 BSS 段而非栈上

```c
// 之前：每次调用在栈上分配 384 字节
char buf[384];

// 之后：编译时分配在 BSS, 不占用运行时栈
static char buf[384];
```

**效果：不再死机**。但后面发现还有一个更隐蔽的 bug……

> **教训**: 嵌入式开发中慎用 `snprintf` + `%f`（会拉入 `_printf_float` 占用大量栈空间），大缓冲区全部用 `static` 分配。

---

## 五、Bug #4 — uint16_t Tick 溢出 + C 整型提升陷阱

### 现象

修复栈溢出后，电机还是会在**恰好约 60 秒**后"卡死"——自动打印停，电机不响应。但这次串口命令**还能处理**（不像 HardFault 时全死）。

观察到 tick_count 从 65535 跳回 0（uint16_t 溢出），和故障时间点吻合。

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

这是一个非常隐蔽的 bug——代码逻辑看起来正确（无符号减法天然支持环绕），但编译器偷偷把它变成了有符号运算，导致溢出时得到负数，比较永远不成立。

### 修复

将 `tick_count` 和相关变量改为 `uint32_t`：

```c
volatile uint32_t tick_count = 0;       // 49 天溢出, 不再在运行时触发
static uint32_t last_ctrl_tick = 0;
static uint32_t print_tick = 0;
```

在 32 位 ARM 上, `uint32_t` = `unsigned int`, 与 `signed int` 同级。C 标准的 "usual arithmetic conversions" 规定**同级时 unsigned 优先**，所以 `uint32_t - uint32_t` 保持在无符号域。这才是**原理修复**——不是推迟溢出，而是保证减法永远在无符号域完成。

> **教训**: 嵌入式 C 中, `uint8_t` 和 `uint16_t` 的减法**不可信**——要么强转 `(uint16_t)(a - b)`, 要么直接用 `uint32_t`。这个 bug 花了我两天才定位到编译器层面。

---

## 六、Bug #5 — PID_Reset 后 D 项速度尖峰

### 现象

串口发 `kp0`（把 Kp 设为 0），电机突然猛踹一脚飞出去。之后即使恢复 Kp，电机已漂到未知位置。

### 根因

`PID_Reset` 将 `prev_measurement` 清零。下一个控制周期：

```plain
velocity = (measurement - 0) / 0.009s
         = (155° - 0°) / 0.009s
         = 17,200°/s
         = 300 rad/s

D_out = -Kd × 300 = -Kd × 300 → 瞬间饱和
```

D 项一帧内冲到 ±1.0（输出限幅），再被 `voltage_limit` 钳到 ±0.4——电机被 40% 占空比猛踹一脚。

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

> **教训**: Reset 函数不能盲清零。任何有记忆性的状态量（D 项的 prev_measurement、滤波器的历史值）在 Reset 时都要用哨兵值标记"未初始化"状态。

---

## 七、Bug #6 — Kd 增益对量化噪声极度敏感

### 现象

Kd=0.01 时阻尼良好，改为 Kd=0.02 就出现**越抖越凶**的现象——松手后缓慢接近目标，过冲，回调，振幅越来越大，最后剧烈振荡。

### 物理原因

AS5600 是 12-bit 编码器, 1 LSB = 360°/4096 = **0.088°**。控制周期 9ms 下，单个 LSB 噪声产生的假速度为：

```plain
假速度 = 0.088° / 0.009s = 9.7°/s
```

这个假速度经低通滤波后乘上 Kd 成为 D 项输出：

| Kd | 稳态噪声力矩等效 |
|----|---------------|
| 0.01 | 0.04°/s — 不可感知 |
| 0.02 | 0.09°/s — 开始抖动 |
| 0.03 | 0.13°/s — 明显振荡 |

在目标附近真实速度接近 0 时, D 项输出完全来自量化噪声。噪声 → 微动 → 产生新的量化台阶 → 正反馈 → **Limit Cycle**。

### 为什么不是 Kd 越大阻尼越好？

教科书说 D 项 = 阻尼。但教科书假设测量值是连续的。12-bit 离散化在低速段破坏了连续性——D 项看到的是一个"台阶信号"而非"斜坡信号"。

### 解决方案

1. **降低 Kd**：0.01 已足够
2. MATLAB 仿真脚本：`analysis/pid_sim.m` 可视化量化噪声对 D 项的影响
3. 如需要更高 Kd, 需要更强的低通滤波（增大 tau）或使用更高精度编码器 (14-bit+)

> **教训**: 理论公式在离散化后不一定成立。"量化噪声 → D 项 → Limit Cycle" 是伺服系统里的经典问题，在实际项目中会赤裸裸地出现。

---

## 八、Bug #7 — 单圈绝对值跳变导致"绕远路"

### 现象

推电机过 0°/360° 边界后松手，电机不原路返回，而是绕一个大圈（几乎转满 360°）回到目标。

### 根因

AS5600 输出 0~360° 的**当前圈绝对值**。推过 0° 边界时：

```plain
读数: 358° → 359° → 0° → 1° → 2°
PID 看到: error = target(120°) - measurement(2°) = 118°
实际物理: 已经推了 1 整圈, 应该回 478° (120°+360°)
```

PID 不知道跨了圈，选了"最短路径"——但"最短路径"的定义因为跨圈而错了。

### 修复：累计角度追踪

每次传感器读数时，计算与上次的差值：

```c
float delta = angle_now - prev_wrapped;

// 9ms 内物理上不可能转超过半圈 (π rad)
// 如果差值 > π → 一定是跨了 0° 边界
if (delta >  M_PI) delta -= 2 * M_PI;   // 正转跨圈
if (delta < -M_PI) delta += 2 * M_PI;   // 反转跨圈

g_mech_angle_acc += delta;  // 累计角度 (无上限, 可跨多圈)
```

同时，目标角度命令改为"找最近的实例"：

```c
// 从当前累计位置出发, 找最接近 requested 的那个角度
float diff = requested - g_mech_angle_rad;
normalize(&diff);  // 最短路径
motor.target_position = g_mech_angle_acc + diff;
```

**效果：推两圈松手 → 原路倒两圈回来。像发条一样**。

> **教训**: 绝对值传感器需要 unwrap 才能用于闭环。任何时候如果控制量在一个边界处跳变，一定有问题。

---

## 九、最终工具链

### 串口命令体系

| 命令 | 功能 |
|------|------|
| `M0` / `M1` | 开环速度 / 位置伺服 |
| `T<deg>` | 目标角度（自动找最近的实例） |
| `Kp/Ki/Kd<n>` | PID 调参（安全的，无瞬态冲击） |
| `V<0~1>` | 电压限幅 |
| `E1` / `E0` | 使能 / 禁用 |
| `S<rpm>` | 开环转速 |
| `P<n>` | 极对数 |
| `D` | 编码器诊断 (5 样本) |
| `?` | 完整状态 |
| `C` | 切换自动文本打印 |
| `O1` / `O0` | VOFA+ FireWater 可视化输出 |
| `H` | 帮助 |

### VOFA+ 可视化

开启 `O1` 后，VOFA+ 中选 FireWater 协议，4 通道数据流：角度 / 目标 / 误差 / I2C 计数。110Hz 刷新，可实时看到角度阶跃响应曲线。这对于 PID 调参非常有用——一眼就能看出超调、稳态误差和收敛速度。

### IWDG 看门狗 + HardFault 诊断

即使未来出现新 bug，独立看门狗也会在 1 秒内自动复位 MCU。HardFault 发生时串口输出 PC / LR / CFSR / HFSR 寄存器值，可直接从 `.map` 文件定位崩溃函数。

```c
// HardFault_Handler — 直接操作 USART 寄存器输出诊断信息
void HardFault_Handler(void) {
    uint32_t cfsr = SCB->CFSR;   // 可配置故障状态寄存器
    uint32_t hfsr = SCB->HFSR;   // 硬故障状态寄存器
    uint32_t pc  = __get_CONTROL() & 1 ?
                   __get_PSP() : __get_MSP();
    // 通过 USART1 直接输出 (不依赖 HAL)
    USART1->DR = 'H';
    while (!(USART1->SR & USART_SR_TC));
    // ... 输出 PC, LR, CFSR, HFSR ...
}
```

---

## 十、PID 控制器的设计细节

虽然 bug 修完了，但 PID 控制器本身的设计也值得说说。这不是一个简单的教科书 PID，而是做了几个关键工程取舍：

### D-on-Measurement（测量值微分）

传统的 PID 误差微分 `D = Kd * d(error)/dt` 在目标角度阶跃变化时会产生巨大的 D 项尖峰。这里改为对测量值（实际角度）微分，再取负：

```plain
D_out = -Kd * d(measurement)/dt
```

这样目标变化时 D 项不会突变，只有电机实际运动才会产生 D 项输出。

### 一阶低通滤波

对微分后的速度值做低通滤波：

```c
// alpha ≈ dt / (tau + dt)
// tau = 0.008s, dt = 0.009s → alpha ≈ 0.53
pid->deriv_filtered += alpha * (velocity - pid->deriv_filtered);
```

截止频率约 20Hz，有效抑制 AS5600 12-bit 量化产生的高频噪声。

### 条件积分 (Anti-Windup)

当 PID 输出饱和（达到 voltage_limit 限幅）时，积分器停止累积。防止误差持续积分导致大幅度超调。

```c
if (pid->integral > -pid->integral_limit &&
    pid->integral <  pid->integral_limit) {
    pid->integral += Ki * error * dt;
}  // 输出饱和时积分冻结
```

---

## 十一、教训总结

| # | Bug | 类别 | 教训 |
|---|-----|------|------|
| 1 | I2C BUSY | 硬件缺陷 | 查 Errata；软件模拟是最可靠的替代 |
| 2 | PID 符号 | 算法 | 单元测试 setpoint/measurement 的传递 |
| 3 | 栈溢出 | 内存 | 嵌入式慎用 `snprintf` + `%f`；大 buf 用 `static` |
| 4 | uint16_t 溢出 | C 语言 | **uint16_t 减法会被提升为 signed int** — 记在骨子里 |
| 5 | D 尖峰 | 状态管理 | Reset 函数要设哨兵值, 不能盲清零 |
| 6 | 量化噪声 | 信号处理 | 低速段量化噪声主导 D 项 → Limit cycle |
| 7 | 绝对值跳变 | 坐标系统 | 绝对值传感器需要 unwrap 才能用于闭环 |

最后也是最重要的一个教训：**不找到根因就不算修好**。每个 bug 都找到了物理学或 C 语言标准层面的解释——I2C 卡死是 ST Errata，符号反转是算法错误，栈溢出是 linker script，tick 溢出是 C 标准 §6.3.1.1。只有理解"为什么"才不会在同一条沟里翻两次船。

---

> 完整源码：[GitHub - simpleFOC_1](https://github.com/729DHS/STM32_SimpleFOC)  
> 调试日志原文：`docs/debugging-journal.md`  
> MATLAB 量化噪声仿真：`analysis/pid_sim.m`
