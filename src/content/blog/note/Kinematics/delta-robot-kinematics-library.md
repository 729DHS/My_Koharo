---
title: Delta 并联机器人 — 从零搭建运动学库
link: delta-robot-kinematics-library
date: 2026-05-15 07:00:00
description: 记录 Delta 并联机器人的运动学推导、MATLAB 验证和 C++ 库实现过程。静平台半径 115mm，驱动臂 125mm，从动臂 338mm，动平台直径 150mm。
tags:
  - robot
  - STM32
  - kinematics
  - Delta
categories:
  - [笔记, Kinematics]
---

最近把 Delta 并联机器人的运动学库写完了，记录一下过程和关键数据。

## 机械参数

| 参数 | 值 | 说明 |
|------|-----|------|
| Rb | 115 mm | 静平台半径（中心到电机轴） |
| Re | 75 mm | 动平台半径（中心到球铰，150/2） |
| L1 | 125 mm | 驱动臂（大臂）长度 |
| L2 | 338 mm | 从动臂（小臂/拉杆）长度 |

## 运动学核心

### 逆解 (IK)

给定末端位置 `(x, y, z)`，求三个电机角度 `θ₁, θ₂, θ₃`。

对每个支链，将问题转换到局部坐标系，简化为平面 2R 连杆逆运动学：

```plain
x_local·sin(θ) - z_local·cos(θ) = (d² + L1² - L2²) / (2·L1)
```

解为：
```plain
θ = φ + π/2 + α
```
其中 `φ = atan2(z_local, x_local)`，`α = acos((L1² + d² - L2²) / (2·L1·d))`。

关键细节：从动臂在旋转平面外的投影要处理为有效长度 `L2_eff = sqrt(L2² - y_local²)`。

### 正解 (FK)

给定 `θ₁, θ₂, θ₃`，求末端位置。用牛顿迭代法求解三球交汇点，收敛到误差 < 1e-6 mm。

## MATLAB 验证结果

用 MATLAB 验证 IK→FK 一致性，**在所有测试点误差均为 0.0000 mm**。

### 工作空间

扫描范围 20mm 网格，共 5928 个可达点：

| Z (mm) | 最大半径 (mm) |
|--------|--------------|
| -460 | 14 |
| -440 | 103 |
| -400 | 192 |
| -360 | 247 |
| -300 ~ -200 | 247 |
| -100 | 247 |

工作空间呈穹顶形，Z 范围约 -460 ~ -100 mm，最大水平半径约 250mm。

## 代码组织


```plain
deltarobot/
├── inc/
│   ├── delta_common.h        → 向量、角度、工具
│   ├── delta_param.h         → 机械参数结构体
│   ├── delta_kinematics.h    → IK/FK/雅可比
│   ├── delta_trajectory.h    → 轨迹规划（插补+S曲线）
│   └── delta_control.h       → 三轴协调控制接口
├── src/
│   ├── delta_kinematics.cpp
│   ├── delta_trajectory.cpp
│   └── delta_control.cpp
├── scripts/
│   ├── verify_delta.m         → 运动学验证 + 工作空间计算
│   └── workspace.m            → 工作空间可视化
└── README.md
```

## 下一步

- 在 STM32F407 上跑通 IK 计算
- 配合步进电机 DRV8825/TMC2209 做开环位置控制
- 后来再加编码器闭环
