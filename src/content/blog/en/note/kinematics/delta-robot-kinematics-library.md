---
title: Delta Parallel Robot — Building a Kinematics Library from Scratch
link: delta-robot-kinematics-library
date: 2026-05-15 07:00:00
description: Recording the kinematics derivation, MATLAB verification, and C++ library implementation process for a Delta parallel robot. Static platform radius 115mm, driving arm 125mm, passive arm 338mm, moving platform diameter 150mm.
tags:
  - robot
  - STM32
  - kinematics
  - Delta
categories:
  - [笔记, Kinematics]
---

Recently I finished writing the kinematics library for a Delta parallel robot. Let me record the process and key data.

## Mechanical Parameters

| Parameter | Value | Description |
|------|-----|------|
| Rb | 115 mm | Static platform radius (center to motor shaft) |
| Re | 75 mm | Moving platform radius (center to ball joint, 150/2) |
| L1 | 125 mm | Driving arm (big arm) length |
| L2 | 338 mm | Passive arm (small arm/rod) length |

## Core Kinematics

### Inverse Kinematics (IK)

Given end-effector position `(x, y, z)`, find three motor angles `θ₁, θ₂, θ₃`.

For each leg, transform the problem to a local coordinate system, simplifying to planar 2R linkage inverse kinematics:

```plain
x_local·sin(θ) - z_local·cos(θ) = (d² + L1² - L2²) / (2·L1)
```

Solution:
```plain
θ = φ + π/2 + α
```
where `φ = atan2(z_local, x_local)`, `α = acos((L1² + d² - L2²) / (2·L1·d))`.

Key detail: The projection of the passive arm outside the rotation plane needs to be processed as effective length `L2_eff = sqrt(L2² - y_local²)`.

### Forward Kinematics (FK)

Given `θ₁, θ₂, θ₃`, find end-effector position. Use Newton iteration to solve for the three-sphere intersection point, converging to error < 1e-6 mm.

## MATLAB Verification Results

Verified IK→FK consistency in MATLAB, **error is 0.0000 mm at all test points**.

### Workspace

Scanned with 20mm grid, total 5928 reachable points:

| Z (mm) | Max Radius (mm) |
|--------|--------------|
| -460 | 14 |
| -440 | 103 |
| -400 | 192 |
| -360 | 247 |
| -300 ~ -200 | 247 |
| -100 | 247 |

The workspace is dome-shaped, Z range approximately -460 ~ -100 mm, maximum horizontal radius approximately 250mm.

## Code Organization


```plain
deltarobot/
├── inc/
│   ├── delta_common.h        → vectors, angles, utilities
│   ├── delta_param.h         → mechanical parameter struct
│   ├── delta_kinematics.h    → IK/FK/Jacobian
│   ├── delta_trajectory.h    → trajectory planning (interpolation + S-curve)
│   └── delta_control.h       → three-axis coordinated control interface
├── src/
│   ├── delta_kinematics.cpp
│   ├── delta_trajectory.cpp
│   └── delta_control.cpp
├── scripts/
│   ├── verify_delta.m         → kinematics verification + workspace calculation
│   └── workspace.m            → workspace visualization
└── README.md
```

## Next Steps

- Run IK calculation on STM32F407
- Cooperate with stepper motors DRV8825/TMC2209 for open-loop position control
- Later add encoder for closed-loop