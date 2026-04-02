---
title: STM32 定时器笔记
link: stm32-timer-note
date: 2025-12-31 00:00:00
description: STM32 定时器基础、CubeMX 配置与常见模式实践记录。
tags:
  - STM32
  - TIM
  - 定时器
  - 嵌入式
categories:
  - [笔记, STM32]
math: true
---
# 定时器



---
## 定时器基础知识
基础构成
- 时钟来源: 内部 APB 时钟/ETR 外部时钟/内部触发 ITR；定时器时钟频率 = 定时器输入时钟 ÷ (PSC+1)。
- 计数器 CNT: 16/32 位向上、向下或中心对齐计数模式；溢出或到达 ARR 触发更新事件。
- 预分频 PSC: 将输入时钟再分频，减少计数速度；更新事件才会装载新 PSC。
- 自动重装载 ARR: 计数上限或下限，决定周期；开启预装载时（ARPE）在更新事件同步装载。

关键模式
- 单脉冲模式(One Pulse): 响应一次触发产生有限脉冲，常用于测距等。
- 输出比较/定时输出: CCRx 与 CNT 比较，匹配时产生事件，可配置翻转/置位/清零。
- PWM: 由 ARR 设周期，CCR 设占空比；上升沿/下降沿对齐或中心对齐可减小谐波。
- 输入捕获: 捕获外部边沿时间戳到 CCR，结合 PSC/ARR 可测频率或脉宽。
- 编码器模式: 两路正交输入解码位移/速度；选择 TI1/TI2 极性、滤波。
- 基础定时: 部分定时器（如 TIM6/7）仅生成更新事件驱动 DAC 或触发。

事件与中断/DMA
- 更新事件 UEV: CNT 到 ARR 或方向翻转时触发；可触发中断或 DMA，常用来做“心跳”。
- 触发输出 TRGO: 可配置为 UEV/OCxREF/OCxREF 清零，用于驱动 ADC、DAC、另一个定时器。
- 中断: 更新 UIE、捕获比较 CCxIE、触发 TIE、突破 BDTR 故障；注意在 NVIC 和寄存器同时开启。
- DMA: 可把更新或捕获比较事件搬运 ARR/CCR 数据，适合连续波形更新。

输出相关细节
- CCR 预装载: PWM 时建议开 OCxPE，避免更新窗口撕裂；在更新事件同步写入。
- 极性: 可配置 CHx 极性高/低，PWM 互补输出(CHxN)需高级定时器并设置死区时间 BDTR.DTG。
- 刹车/死区: 高级定时器支持刹车输入 BKIN、死区插入、输出使能 MOE，保障功率驱动安全。

输入滤波与时序
- 数字滤波: ICF 位可设采样次数与分频，滤除毛刺；过强滤波会增加响应延迟。
- 边沿选择: CCxP/CCxNP 选择上升/下降/双边沿；双边沿测频时需注意计数翻倍。

常用公式
- 计数时钟 $f_{cnt} = \dfrac{f_{tim}}{PSC+1}$
- 更新频率 $f_{update} = \dfrac{f_{cnt}}{ARR+1}$
- PWM 频率 $f_{pwm} = \dfrac{f_{tim}}{(PSC+1)(ARR+1)}$

实用小贴士
- 修改 PSC/ARR/CCR 后若开预装载，需等待一次更新事件才生效，可手动 UG 产生。
- 中心对齐模式下计数往返一次算一个周期，实际频率为对齐模式的 2 倍计数范围。
- 多定时器级联时，用 TRGO/ITR 做主从同步，避免相位漂移。


## CubeMX 配置
CubeMX 配置 STM32F103C8 定时器界面:

![TIM_1](/img/Note/STM32/N5_TIM_1.webp)

选项卡:
- Slave mode:
  - Disable
  - External Clock Mode 1
  - Reset Mode
  - Gate Mode
  - Trigger Mode
- Tigger Source:
  - Disable
  - ITR0
  - ITR1
  - ITR2
  - ITR3
  - ETR1
  - Tl1_ED
  - Tl1FP1
- Clock Source:
  - Disable
  - Internal Clock
  - ETR2
- Channel1/2/3/4:
  - Disable
  - Input Capture direct mode
  - Input Capture indirect mode
  - Input Capture tiggered by TRC
  - Output Compare No Output
  - Output Compare CH1/2/3/4
  - PWM Generation No Output
  - PWM Generation CH1/2/3/4
- Combine Channels:
  - Disable
  - Encoder Mode
  - PWM Input on CH1
  - PWM Input on CH2
  - XOR ON/HALL Sensor Mode
- [ ] Use ETR as Clearing Source
- [ ] XOR activation
- [ ] One Pulse Mode


--- 

## CubeMX 配置选项解读


### Slave Mode (从模式选择)
用于设定当前定时器如何响应来自其他定时器或外部引脚的触发信号。
* `Disable`: **禁用从模式**。定时器独立运行，仅受自身控制寄存器支配。
* `External Clock Mode 1`: **外部时钟模式 1**。计数器 CNT 不再由内部时钟驱动，而是由选定的触发源（如 TIx 或 ETR）的边沿驱动。常用于“外部脉冲计数”。
* `Reset Mode`: **复位模式**。当选定的触发信号出现上升沿时，CNT 计数器立即清零并重新开始计数。常用于“清除计数器”或“同步相位”。
* `Gate Mode`: **门控模式**。触发信号为高电平时，CNT 正常计数；信号为低电平时，CNT 停止计数。常用于“测量高电平持续时间”。
* `Trigger Mode`: **触发模式**。在触发信号的上升沿启动计数器运行。注意：启动后，计数器会一直运行，直到手动停止。常用于“延迟启动”。
### Trigger Source (触发源选择)
决定谁来触发上述的“从模式”动作。
* `ITR0/1/2/3`: **内部触发输入**。来源于其他定时器的 TRGO 输出。具体对应关系需查阅芯片手册的 *TIMx internal trigger connection* 表。常用于“定时器级联（主从模式）”。
* `ETR1`: **外部触发输入**。信号通过外部引脚 ETR 进入，经过极性、预分频和滤波后作为触发源。
* `TI1_ED`: **通道 1 边沿检测**（Edge Detector）。TI1 的上升沿和下降沿都会产生触发。
* `TI1FP1 / TI2FP2`: **滤波后的通道信号**。即来自输入引脚 CH1/CH2 且经过滤波和极性选择后的信号。
### Clock Source (时钟源)
决定计数器 CNT 计数的脉冲来源。
* `Internal Clock`: **内部时钟**。默认选项，使用来自 APB 预分频器处理后的内部时钟信号。
* `ETR2`: **外部时钟模式 2**。使用 ETR 引脚作为时钟源。与 External Clock Mode 1 的区别在于 ETR2 使用专用路径，不占用从模式控制器。
### Channel 1/2/3/4 (通道模式)
* `Input Capture direct mode`: **直接输入捕获**。物理引脚 CHx 的信号连接到对应的 CCRx 寄存器。用于“测频”或“测脉宽”。
* `Input Capture indirect mode`: **间接输入捕获**。物理引脚 CHx 的信号连接到**相邻**的 CCRy 寄存器（如 CH1 连接到 CCR2）。常用于“PWM 输入模式”，即一个引脚信号同时测量周期和占空比。
* `Output Compare No Output`: **输出比较（无输出）**。CNT 与 CCR 匹配时产生中断或事件，但不翻转物理引脚电平。常用于“软件定时执行任务”。
* `Output Compare CHx`: **输出比较**。匹配时翻转物理引脚电平。
* `PWM Generation CHx`: **PWM 输出**。根据 ARR 和 CCR 的值在引脚上生成脉冲宽度调制信号。
### Combine Channels (组合通道)
* `Encoder Mode`: **编码器模式**。利用 TI1 和 TI2 两个通道的正交信号自动增减 CNT。用于“电机测速”或“旋钮位置检测”。
* `PWM Input on CH1/2`: **PWM 输入模式**。自动占用两个捕获寄存器，一个测周期，一个测占空比。
* `XOR ON/HALL Sensor Mode`: **异或/霍尔传感器模式**。将 CH1/2/3 的输入进行异或运算后再接入触发控制器。常用于“直流无刷电机（BLDC）的换向控制”。
### 其他勾选项
* `Use ETR as Clearing Source`: **使用 ETR 作为清除源**。当 ETR 信号为高时，强制清零输出参考信号（OCxREF）。常用于“过流保护”。
* `XOR activation`: **异或激活**。开启通道间的异或逻辑。
* `One Pulse Mode`: **单脉冲模式**。计数器在发生一次溢出（Update 事件）后自动停止（设置 CR1 寄存器的 OPM 位）。

## PWM Generation 选项解读
![](/img/Note/STM32/N5_TIM_2.webp)

### **一、时钟与计数基准（决定 PWM 频率）**
| 配置项 | 作用 | 关键公式/逻辑 | 典型设置 |
| :--- | :--- | :--- | :--- |
| **TIMx_CLK** | 定时器内核时钟源 | `TIMx_CLK = APBx_CLK × (APB预分频≠1 ? 2 : 1)` | 查时钟树，F103 通常 72MHz |
| **Prescaler (PSC)** | **分频计数器时钟** | `计数频率 = TIMx_CLK / (PSC+1)` | 设 PSC 使计数频率≈1MHz（精度与范围平衡） |
| **Counter Period (ARR)** | **决定 PWM 周期（频率）** | `PWM频率 = 计数频率 / (ARR+1)` | 根据目标频率计算：`ARR = (计数频率/目标频率) - 1` |
| **Counter Mode** | 计数方向 | `Up`（0→ARR）、`Down`（ARR→0）、`Center` | 电机控制常用`Up`，三相驱动用`Center` |
| **auto-reload preload** | ARR 更新方式 | `Enable`：修改 ARR 后需更新事件才生效；`Disable`：立即生效 | **建议 Enable**，避免调频时波形突变 |


### **二、PWM 输出控制（决定波形形状）**
| 配置项 | 作用 | 关键逻辑 | 典型设置 |
| :--- | :--- | :--- | :--- |
| **Pulse (CCR)** | **决定 PWM 占空比** | `占空比 = CCR / (ARR+1)` | 动态调占空比时直接改此值 |
| **Mode** | PWM 工作模式 | `PWM mode 1`：CNT<CCR 有效；`PWM mode 2`：CNT≥CCR 有效 | 根据硬件“有效电平”选，常用模式 1 |
| **CH Polarity** | 通道极性 | `High`：有效电平为高；`Low`：有效电平为低 | 匹配驱动电路（如高电平驱动电机选`High`） |
| **Output compare preload** | CCR 更新方式 | `Enable`：修改 CCR 后需更新事件才生效；`Disable`：立即生效 | **建议 Enable**，避免调占空比时跳变 |
| **Fast Mode** | 快速响应模式 | 绕过影子寄存器，强制立即更新输出 | 默认`Disable`，仅需极快响应时启用 |

### **三、高级定时器特有（驱动 H 桥电机必须）**
| 配置项 | 作用 | 关键逻辑 | 典型设置 |
| :--- | :--- | :--- | :--- |
| **Break Input** | 刹车信号输入 | 外部刹车信号有效时，强制关闭 PWM 输出 | 接硬件保护电路（如过流检测） |
| **Dead Time** | **死区时间** | 防止 H 桥上下管同时导通，设置互补输出的延迟 | 根据 MOS 管开关时间计算，通常 1~10μs |
| **Complementary Output** | 互补输出通道 | 与主通道反相，用于驱动 H 桥的另一个管子 | 必须与主通道配合使用 |

### **四、动态调频关键操作流程**
当需要**实时改变 PWM 频率**（如步进电机加减速）时，必须按此顺序操作：
```c
1. HAL_TIM_PWM_Stop(&htim, TIM_CHANNEL_1);  // ① 先停止PWM输出
2. htim.Instance->ARR = new_arr;            // ② 更新ARR（新频率）
3. // ③ 按比例更新CCR，保持占空比不变：
   new_ccr = (new_arr + 1) * old_ccr / (old_arr + 1);
   __HAL_TIM_SET_COMPARE(&htim, TIM_CHANNEL_1, new_ccr);
4. HAL_TIM_PWM_Start(&htim, TIM_CHANNEL_1); // ④ 重新启动PWM
```
**核心原则**：改频率时**必须同步调整 CCR**，否则占空比会突变，导致电机扭矩波动甚至失步。

---

### **五、速查：不同定时器选型**
| 类型 | 代表 | 适合场景 | 注意 |
| :--- | :--- | :--- | :--- |
| **基本定时器** | TIM6, TIM7 | 纯时基（如 DAC 触发、简单延时） | **无输出引脚**，不能直接输出 PWM |
| **通用定时器** | TIM2~TIM5 | 普通 PWM 输出、输入捕获、编码器 | 步进电机驱动常用，但**无死区功能** |
| **高级定时器** | TIM1, TIM8 | 三相电机驱动、H 桥控制 | **必须配置死区时间**，防止烧管 |

---

### **一句话总结**
- **PSC + ARR = 频率**（PSC 定内部时钟，ARR 定周期）
- **CCR = 占空比**（占空比 = CCR/(ARR+1)）
- **Polarity + Mode = 有效电平逻辑**
- **动态调频时：停 PWM → 改 ARR → 按比例改 CCR → 启 PWM**
- **驱动 H 桥必选高级定时器 + 配置死区**

> 提示：在 STM32CubeMX 中配置时，**先设 PSC 和 ARR 得到目标频率，再设 CCR 得到占空比，最后根据硬件电路选择极性和模式**。高级定时器务必在“Break and Dead Time”选项卡中设置死区时间。