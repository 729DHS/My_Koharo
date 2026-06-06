---
title: "STM32 SimpleFOC Position Servo: From Zero to Stable, Full Record of 2 Hard Bug Fixes"
link: stm32-simplefoc-debug-journal
catalog: true
date: 2026-06-01 10:30:00
description: "Complete process of building a position servo system with STM32F103 + SimpleFOC Mini + AS5600. From uint16_t integer overflow to PID Reset transient spike, each bug's investigation and fix is documented."
tags:
  - STM32
  - FOC
  - Motor Control
  - PID
  - Embedded
  - Debug
  - AS5600
categories:
  - 笔记
  - STM32
---

## 1. Project Background

> Building a FOC position servo system from scratch using STM32F103C8T6 (Blue Pill) to drive a 2804 gimbal motor.

The "from scratch" here doesn't start from the SimpleFOC library — it starts from CubeMX-generated HAL code, with hand-written FOC core algorithm, PID controller, encoder driver, and serial command parsing. The entire development cycle took about two weeks, with **debugging taking 80% of the time**.

End result: motor holds position rock-solid, pushed two turns and released, it returns along the same path. PID parameters adjustable online with no transient spikes. Behind this: 2 real bug localizations and fixes — plus records of several "thought this was the root cause" false leads.

### Hardware Architecture

```plain
STM32F103C8T6 (72MHz)
├── TIM1 CH1/CH2/CH3 (PA8/PA9/PA10) → SimpleFOC Mini IN1/IN2/IN3
├── PA11 GPIO OUT → SimpleFOC Mini ENABLE
├── I2C1 PB8(SCL) / PB9(SDA) → AS5600 magnetic encoder (0x36)
├── USART1 PB6(TX) / PB7(RX) → USB-TTL (115200 8N1)
└── TIM2 (1098Hz interrupt) → Control loop tick
```

- **MCU**: STM32F103C8T6, 72MHz, 64KB Flash, 20KB RAM
- **Driver**: SimpleFOC Mini (3-phase half-bridge)
- **Encoder**: AS5600 12-bit magnetic encoder (I2C interface)
- **Motor**: 2804 gimbal motor, 12-slot 14-pole (7 pole pairs), low resistance

### Software Architecture

```plain
main loop (110Hz)
  ├─ TIM2 interrupt → foc_tick flag
  ├─ Sensor read → AS5600 (software I2C)
  ├─ Angle unwrapping → single-turn absolute → cumulative angle
  ├─ PID control → D-on-measurement + low-pass filter
  ├─ SVPWM → three-phase sine wave (center-aligned PWM)
  └─ UART command parsing → ? T90 Kp0.1 ...
```

---

## 2. False Lead: Hardware I2C Freeze?

### Symptom

Motor runs normally for 30~60 seconds, then suddenly "loses power" — encoder reading freezes at a certain value, rotating the motor by hand produces no corrective torque, and auto-print stops. Recovery after power cycle, repeats after running for a while.

### Investigation

- `D` command (encoder diagnostics) showed a **different value** than the `?` status command during one failure — `?` reported Raw=1445, `D` reported Raw=4030. Ruled out encoder hardware fault.
- I2C error count stayed at 0 — HAL didn't report errors, but returned stale register values, suggesting the I2C peripheral may have entered a "fake success" state.
- Checking STM32F103 Errata: **I2C peripheral can freeze in BUSY state under specific bus timing conditions**, software cannot recover via normal means, only peripheral reset works.

### Attempted Fix

```c
// When readings stay unchanged for 100 consecutive times, try resetting I2C peripheral
__HAL_RCC_I2C1_FORCE_RESET();
__HAL_RCC_I2C1_RELEASE_RESET();
HAL_I2C_Init(&hi2c1);
```

### Result

After switching to software I2C, the problem persisted. The real root cause was later found to be **uint16_t tick overflow** — after fixing that, everything stabilized. The software I2C changes were kept (more reliable), but I2C itself **was not the root cause of this symptom**.

> **Lesson**: One symptom can have multiple "suspects." Fixing A doesn't mean you fixed it. When you can't confirm the root cause, look for the most directly reproducible clue first (time pattern).

---

## 3. False Lead: PID Positive Feedback?

### Symptom

After power-on, motor doesn't hold position, rotates continuously. Sending `T90` causes motor to accelerate instead of stopping.

### Investigation

Checked PID setpoint/measurement parameter passing — logic seemed possibly wrong.

### Result

Actual code inspection revealed **PID sign parameters were not inverted** — this wasn't a real bug. The real cause of the symptom was also uint16_t tick overflow — the control loop wasn't running at all.

> **Lesson**: Without trace tools, it's easy to interpret "not running" as "running wrong." First confirm whether code is actually executing, then analyze runtime behavior.

---

## 4. False Lead: Stack Overflow?

### Symptom

Motor "dies" every few tens of seconds — auto-print stops, motor 吸附在磁极位 (stuck at magnetic pole position), serial commands unresponsive.

### Investigation

- Checked stack size: `_Min_Stack_Size = 0x400` (only 1KB) in `STM32F103XX_FLASH.ld`
- `snprintf` + `%f` pulls in `_printf_float`, single call chain stack consumption >700 bytes
- Tried expanding stack to 2KB + changing large buffers to static

### Result

Problem persisted after changes. Real root cause was still uint16_t tick overflow.

> **Lesson**: In embedded, `snprintf` + `%f` does eat stack, but that wasn't the issue here. Hypothesis + fix + verify — don't keep trusting a fix that isn't working.

---

## 5. Bug #1 — uint16_t Tick Overflow + C Integer Promotion Trap

> This is the bug that actually solved the problem. After fixing it, the system ran stably.

### Symptom

Motor "freezes" every ~60 seconds — auto-print stops, motor unresponsive, but serial commands **still work**. Observed tick_count wrapping from 65535 back to 0 (uint16_t overflow), exactly matching the failure timestamps.

### Root Cause Analysis

This is an obscure bug caused by **C language Integer Promotion rules**:

```c
volatile uint16_t tick_count = 0;
static uint16_t last_ctrl_tick = 65530;

// What you see:
if (tick_count - last_ctrl_tick >= 10)

// What the compiler actually generates:
// uint16_t - uint16_t → promoted to signed int (32-bit)
if ((int)tick_count - (int)last_ctrl_tick >= 10)
//  When tick_count wraps to 0:
//  (int)0 - (int)65530 = -65530
//  -65530 >= 10 ? → false → control update never fires!
```

C11 Standard §6.3.1.1: when `uint16_t` (narrower than `int`) participates in arithmetic, it's first promoted to `int` (signed). **The unsigned wrap-around behavior is destroyed during promotion**.

This is a very subtle bug — the code logic looks correct (unsigned subtraction naturally wraps), but the compiler turns it into signed arithmetic, producing a negative number on overflow, making the comparison 永远不成立 (never true).

### Fix

Change `tick_count` and related variables to `uint32_t`:

```c
volatile uint32_t tick_count = 0;       // Overflows in 49 days, won't trigger during runtime
static uint32_t last_ctrl_tick = 0;
static uint32_t print_tick = 0;
```

On 32-bit ARM, `uint32_t` = `unsigned int`, same rank as `signed int`. C standard's "usual arithmetic conversions" specify **unsigned wins when ranks are equal**, so `uint32_t - uint32_t` stays in unsigned domain. This is the **principle fix** — not just delaying overflow, but ensuring subtraction always happens in unsigned domain.

> **Lesson**: In embedded C, subtraction of `uint8_t` and `uint16_t` is **unreliable** — either cast strongly `(uint16_t)(a - b)`, or use `uint32_t` directly. This bug took two days to locate at the compiler level. **Confirmed effective fix: change uint16_t to uint32_t**.

---

## 6. Bug #2 — PID_Reset D Term Velocity Spike

> This bug is real too — it causes transient shock when adjusting PID parameters.

### Symptom

Sending `kp0` (set Kp to 0) via serial, motor suddenly kicks hard and flies out. After that, even restoring Kp, the motor has drifted to an unknown position.

### Root Cause

`PID_Reset` clears `prev_measurement` to zero. In the next control cycle:

```plain
velocity = (measurement - 0) / 0.009s
         = (155° - 0°) / 0.009s
         = 17,200°/s

D_out = -Kd × 300 →瞬间饱和 → motor gets kicked by 40% duty cycle
```

### Fix: Sentinel Value

```c
#define PID_MEAS_UNINIT (-1e10f)  // Legal angle 0~2π can never be here

void PID_Init(...) {
    pid->prev_measurement = PID_MEAS_UNINIT;
}

void PID_Reset(...) {
    pid->integral = 0.0f;
    pid->prev_measurement = PID_MEAS_UNINIT;  // Sentinel
    // deriv_filtered not cleared, first frame D skipped, re-accumulate from zero
}

float PID_Update(...) {
    if (pid->prev_measurement < -1e9f) {
        // First frame → skip D, just record current value
        pid->prev_measurement = measurement;
        D_out = 0.0f;
    } else {
        // Normal D calculation
    }
}
```

**Effect: No transient shock when adjusting PID parameters**.

> **Lesson**: Reset functions cannot blindly zero everything. Any stateful variable must use a sentinel value to mark "uninitialized" state during Reset.

---

## 7. Lessons Summary

| # | Issue | Category | Conclusion |
|---|-------|----------|------------|
| 1 | I2C BUSY | False lead | Changed to software I2C, but root cause was uint16_t overflow |
| 2 | PID sign | False lead | Parameters actually not inverted; real cause was control loop not running |
| 3 | Stack overflow | False lead | Expanded stack, but root cause was still uint16_t overflow |
| 4 | **uint16_t integer promotion** | **Real bug** | **Confirmed fix: change to uint32_t** |
| 5 | **PID Reset D spike** | **Real bug** | **Confirmed fix: sentinel value** |

Both real bugs were traced to root cause and fixed. The three "suspects" were actually **symptoms' side effects rather than root causes** — when uint16_t overflow caused the control loop to stop, all "control not working" manifestations were mistakenly thought to have independent root causes.

**Not finding the root cause means not truly fixed.** The same symptom may have multiple people shouting about it, but you can only trust the first (most timely) clue — time patterns are the best debug information.

---

> Full source code: [GitHub - simpleFOC_1](https://github.com/729DHS/simplefoc_mini_STM32_demo)