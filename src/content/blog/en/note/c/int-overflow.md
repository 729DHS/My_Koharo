---
title: Integer Overflow
link: int-overflow
date: 2026-04-02 21:02:17
description: Integer overflow is a common programming error, especially prevalent in resource-constrained embedded scenarios. This article discusses solutions.
tags:
  - C language
  - STM32
categories:
  - [笔记, C语言]
sticky: false
draft: false
catalog: true
math: true
---


# Integer Overflow Technical Notes

## Core Concepts

**Integer overflow** occurs when the result of an arithmetic operation exceeds the representable range of the data type.
- **Unsigned integer overflow**: In C/C++ standards, this is **legal**, and the result undergoes **wrap-around** — jumping from the maximum value to the minimum (or vice versa), causing logical errors.
- **Signed integer overflow**: This is **undefined behavior (UB)**, which may cause program crashes, calculation errors, or security vulnerabilities.

> **Example type ranges**: The range of `uint16_t` (16-bit unsigned integer) is `0 ~ 65535` ($2^{16} - 1$).

---

## Typical Scenario Analysis: PWM Duty Cycle Gradient

In embedded development, calculating the difference between two unsigned integers (such as PWM duty cycle variation) is a common scenario. If handled improperly, overflow is highly likely to occur.

### Incorrect Approach: Direct Subtraction
When `end_duty < start_duty`, unsigned subtraction causes underflow.

```c
uint16_t start = 1000;
uint16_t end = 500;

// Incorrect approach
uint16_t delta1 = end - start; 
// 500 - 1000 = -500
// But uint16_t cannot store negative numbers, it wraps automatically: 65536 - 500 = 65036 (completely wrong)
```
This is a **typical unsigned integer overflow**.

```c
// Correct approach
int32_t delta2 = (int32_t)end - start; 
// First cast end to 32-bit signed integer, the result is also signed
// Can now store negative numbers, result = -500 (correct)
```

---

## Common Overflow Prevention Techniques

### 1. Type Promotion
```c
// Addition overflow protection
uint16_t a = 60000, b = 60000;
uint32_t sum = (uint32_t)a + b;  // Promote to 32-bit before adding
if (sum > 65535) {
    // Handle overflow
}

// Multiplication overflow protection
uint16_t x = 1000, y = 1000;
uint32_t product = (uint32_t)x * y;  // 1,000,000 won't overflow 32-bit
```

### 2. Pre-check
```c
uint16_t add_with_check(uint16_t a, uint16_t b) {
    if (a > UINT16_MAX - b) {
        // Will overflow, return max value or throw error
        return UINT16_MAX;
    }
    return a + b;
}

// Multiplication pre-check
uint16_t mul_with_check(uint16_t a, uint16_t b) {
    if (a != 0 && b > UINT16_MAX / a) {
        return UINT16_MAX;  // Overflow
    }
    return a * b;
}
```

### 3. Use Larger Intermediate Types
```c
// Example from your code
const int32_t delta = (int32_t)end_duty - start_duty;

// Subsequent calculation
uint16_t duty = (uint16_t)(start_duty + (delta * step) / LED_FADE_STEPS);
//                   ^^^^^ Convert back to uint16_t in the end
//                   delta * step max approx 60000 * 70 = 4.2M< 2^31, safe
```

### 4. Saturation Arithmetic
```c
uint16_t saturated_add(uint16_t a, uint16_t b) {
    uint32_t result = (uint32_t)a + b;
    return (result > UINT16_MAX) ? UINT16_MAX : (uint16_t)result;
}

// For PWM duty cycle limiting
uint16_t duty = saturated_add(current_duty, increment);
```

### 5. Compiler Built-in Overflow Checks (GCC/Clang)
```c
#include <stdint.h>

int32_t multiply_with_overflow_check(int32_t a, int32_t b) {
    int32_t result;
    if (__builtin_mul_overflow(a, b, &result)) {
        // Overflow occurred
        return INT32_MAX;
    }
    return result;
}

// Check addition
int32_t add_with_overflow_check(int32_t a, int32_t b) {
    int32_t result;
    if (__builtin_add_overflow(a, b, &result)) {
        return INT32_MAX;
    }
    return result;
}
```

### 6. Special Techniques for Timer Scenarios
```c
// Handling timer counter overflow (common in encoders, input capture)
static uint16_t last_count = 0;
static uint16_t overflow_count = 0;

void timer_irq_handler(void) {
    uint16_t current_count = TIM2->CNT;
    
    // Detect underflow (decrementing count)
    if (current_count > last_count) {
        overflow_count++;  // Handle overflow
    }
    
    // Calculate actual 32-bit count value
    uint32_t real_count = (overflow_count << 16) | current_count;
    
    last_count = current_count;
}
```

---

## Complete Overflow Prevention Analysis of Your Code

```c
static void LED_GentleFade(uint16_t start_duty, uint16_t end_duty)
{
    const int32_t delta = (int32_t)end_duty - start_duty;  // Prevent subtraction overflow
    
    for (uint16_t step = 0; step <= LED_FADE_STEPS; ++step)
    {
        // Dangerous calculation: (delta * step) / LED_FADE_STEPS
        // delta max 60000, step max 70 → product 4.2M
        // int32_t max 2.1B, so it's safe
        const uint16_t duty = (uint16_t)(start_duty + (delta * step) / LED_FADE_STEPS);
        //            ^^^^^ Final result range 0~60000, converting back to uint16_t is safe
        
        LED_SetBrightness(duty);
        HAL_Delay(LED_FADE_STEP_MS);
    }
}
```

**Potential risks (already avoided):**
- If `LED_FADE_STEPS` is changed to 1000, `delta * step` max is 60M, still safe
- If `LED_PWM_DUTY_MAX` is changed to 600000 (exceeding uint16_t), the code will have problems

---

## Best Practices Summary

| Scenario | Recommended Technique |
|------|---------|
| **Subtraction may result in negative** | Promote to signed type `(int32_t)a - b` |
| **Adding two small integers** | Promote to larger type `(uint32_t)a + b` |
| **Multiplication may overflow** | Pre-check `if (a > MAX / b)` |
| **Loop accumulation** | Use larger type for accumulation, truncate at the end |
| **Time difference calculation** | Use unsigned subtraction (leveraging wrap-around) with overflow flag |
| **PID/filter calculation** | Use floating point or fixed point with saturation |

---

## Utility Macros

```c
// Safe addition macro (saturation)
#define SAFE_ADD_U16(a, b) ((uint16_t)(((uint32_t)(a) + (b)) > UINT16_MAX ? UINT16_MAX : ((a) + (b))))

// Safe subtraction (with type promotion)
#define SAFE_SUB_U16(a, b) ((int32_t)(a) - (int32_t)(b))

// Check if addition overflows
#define ADD_OVERFLOW_U16(a, b) (((uint32_t)(a) + (b)) > UINT16_MAX)

// Usage example
uint16_t pwm = 60000;
uint16_t inc = 10000;

if (ADD_OVERFLOW_U16(pwm, inc)) {
    pwm = UINT16_MAX;  // Saturate to max value
} else {
    pwm += inc;
}
```