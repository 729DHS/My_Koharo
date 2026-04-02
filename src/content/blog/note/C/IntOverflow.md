---
# 必填：文章标题
title: 整形溢出_IntegerOverflow

# 可选：固定链接 slug（建议小写 + 短横线，发布后尽量不要改）
link: int_overflow

# 必填：发布时间（建议格式：YYYY-MM-DD HH:mm:ss）
date: 2026-04-02 21:02:17

# 可选：文章摘要（用于列表和 SEO）
description: 整形溢出是常见的编程错误,在嵌入式这种资源受限场景尤其常见,本文讲述解决方式

# 可选：封面图（public 目录下的路径）
# cover: /img/cover/1.webp

# 可选：标签（可写多个）
tags:
  - C语言
  - STM32

# 可选：分类
# 单层示例：
# categories:
#   - 随笔
#
# 嵌套示例（推荐）：
# categories:
#   - [笔记, 前端]
# 注意：分类名必须在 config/site.yaml 的 categoryMap 中有映射
categories:
  - [笔记, C语言]

# 可选：置顶（默认 false，不置顶）
sticky: false

# 可选：草稿（默认 false，发布）
draft: false

# 可选：是否生成目录
catalog: true

# 可选：是否启用数学公式渲染（内容含公式时再开）
math: true

# 可选：是否启用练习题渲染（内容含 quiz 语法时再开）
# quiz: true
---


# 整数溢出 (Integer Overflow) 技术笔记

## 📌 核心概念

**整数溢出**是指算术运算的结果超出了数据类型所能表示的数值范围。
- **无符号整数溢出**：在 C/C++ 标准中是**合法**的，结果会发生**回绕 (Wrap-around)**，即从最大值跳变到最小值（或反之），导致逻辑错误。
- **有符号整数溢出**：属于**未定义行为 (Undefined Behavior)**，可能导致程序崩溃、计算错误或安全漏洞。

> **示例类型范围**：`uint16_t` (16 位无符号整数) 的取值范围为 `0 ~ 65535` ($2^{16} - 1$)。

---

## 🔍 典型场景分析：PWM 占空比渐变

在嵌入式开发中，计算两个无符号整数的差值（如 PWM 占空比的变化量）是常见场景。若处理不当，极易引发溢出。

### ❌ 错误做法：直接相减
当 `end_duty < start_duty` 时，无符号减法会导致向下溢出。

```c
uint16_t start = 1000;
uint16_t end = 500;

// 错误做法
uint16_t delta1 = end - start; 
// 500 - 1000 = -500
// 但 uint16_t 不能存负数，会自动回绕：65536 - 500 = 65036（完全错误）
```
这就是**典型的无符号整数溢出**。

```c
// 正确做法
int32_t delta2 = (int32_t)end - start; 
// 先把 end 强转为 32位有符号整数，运算结果也是有符号数
// 可以正常存储负数，结果 = -500（正确）
```

---

## 🛡️ 常见防溢出技巧

### 1. **类型提升（Type Promotion）**
```c
// 加法溢出防护
uint16_t a = 60000, b = 60000;
uint32_t sum = (uint32_t)a + b;  // 提升到32位再相加
if (sum > 65535) {
    // 处理溢出
}

// 乘法溢出防护
uint16_t x = 1000, y = 1000;
uint32_t product = (uint32_t)x * y;  // 1,000,000 不会溢出32位
```

### 2. **预检查（Pre-check）**
```c
uint16_t add_with_check(uint16_t a, uint16_t b) {
    if (a > UINT16_MAX - b) {
        // 会溢出，返回最大值或报错
        return UINT16_MAX;
    }
    return a + b;
}

// 乘法预检查
uint16_t mul_with_check(uint16_t a, uint16_t b) {
    if (a != 0 && b > UINT16_MAX / a) {
        return UINT16_MAX;  // 溢出
    }
    return a * b;
}
```

### 3. **使用更大的中间类型**
```c
// 你的代码中的例子
const int32_t delta = (int32_t)end_duty - start_duty;

// 后续计算
uint16_t duty = (uint16_t)(start_duty + (delta * step) / LED_FADE_STEPS);
//                   ^^^^^ 最终转回 uint16_t
//                   delta * step 最大约 60000 * 70 = 4.2M < 2^31，安全
```

### 4. **饱和运算（Saturation）**
```c
uint16_t saturated_add(uint16_t a, uint16_t b) {
    uint32_t result = (uint32_t)a + b;
    return (result > UINT16_MAX) ? UINT16_MAX : (uint16_t)result;
}

// 用于PWM占空比限制
uint16_t duty = saturated_add(current_duty, increment);
```

### 5. **使用编译器内置溢出检查（GCC/Clang）**
```c
#include <stdint.h>

int32_t multiply_with_overflow_check(int32_t a, int32_t b) {
    int32_t result;
    if (__builtin_mul_overflow(a, b, &result)) {
        // 溢出发生了
        return INT32_MAX;
    }
    return result;
}

// 检查加法
int32_t add_with_overflow_check(int32_t a, int32_t b) {
    int32_t result;
    if (__builtin_add_overflow(a, b, &result)) {
        return INT32_MAX;
    }
    return result;
}
```

### 6. **定时器场景的特殊技巧**
```c
// 处理定时器计数器溢出（常见于编码器、输入捕获）
static uint16_t last_count = 0;
static uint16_t overflow_count = 0;

void timer_irq_handler(void) {
    uint16_t current_count = TIM2->CNT;
    
    // 检测向下溢出（递减计数）
    if (current_count > last_count) {
        overflow_count++;  // 处理溢出
    }
    
    // 计算实际32位计数值
    uint32_t real_count = (overflow_count << 16) | current_count;
    
    last_count = current_count;
}
```

---

## 🎯 你的代码中的完整防溢出分析

```c
static void LED_GentleFade(uint16_t start_duty, uint16_t end_duty)
{
    const int32_t delta = (int32_t)end_duty - start_duty;  // ✅ 防止减法溢出
    
    for (uint16_t step = 0; step <= LED_FADE_STEPS; ++step)
    {
        // 危险计算：(delta * step) / LED_FADE_STEPS
        // delta 最大 60000, step 最大 70 → 乘积 4.2M
        // int32_t 最大 2.1B，所以安全
        const uint16_t duty = (uint16_t)(start_duty + (delta * step) / LED_FADE_STEPS);
        //            ^^^^^ 最终结果范围 0~60000，转回 uint16_t 安全
        
        LED_SetBrightness(duty);
        HAL_Delay(LED_FADE_STEP_MS);
    }
}
```

**潜在风险（已避免）：**
- 如果 `LED_FADE_STEPS` 改成 1000，`delta * step` 最大 60M，仍然安全
- 如果 `LED_PWM_DUTY_MAX` 改成 600000（超过 uint16_t），代码会出问题

---

## 📋 最佳实践总结

| 场景 | 推荐技巧 |
|------|---------|
| **减法可能导致负数** | 提升到有符号类型 `(int32_t)a - b` |
| **两个小整数相加** | 提升到更大类型 `(uint32_t)a + b` |
| **乘法可能溢出** | 预检查 `if (a > MAX / b)` |
| **循环累加** | 使用更大类型累加，最后再截断 |
| **时间差值计算** | 使用无符号减法（利用回绕特性）配合溢出标志 |
| **PID/滤波计算** | 使用浮点或定点数并做饱和处理 |

---

## 🔧 实用工具宏

```c
// 安全加法宏（饱和）
#define SAFE_ADD_U16(a, b) ((uint16_t)(((uint32_t)(a) + (b)) > UINT16_MAX ? UINT16_MAX : ((a) + (b))))

// 安全减法（带符号提升）
#define SAFE_SUB_U16(a, b) ((int32_t)(a) - (int32_t)(b))

// 检查加法是否溢出
#define ADD_OVERFLOW_U16(a, b) (((uint32_t)(a) + (b)) > UINT16_MAX)

// 使用示例
uint16_t pwm = 60000;
uint16_t inc = 10000;

if (ADD_OVERFLOW_U16(pwm, inc)) {
    pwm = UINT16_MAX;  // 饱和到最大值
} else {
    pwm += inc;
}
```