---
title: STM32 库设计笔记2
link: stm32-library-design2
date: 2026年5月14日 00:05:13
description: STM32 驱动库面向对象程序设计,从硬编码到多态的演化之路
tags:
  - STM32
  - 库设计
  - HAL
  - 嵌入式
categories:
  - [笔记, STM32]
---


## 第一阶段：新手村——硬编码

### 场景

我们有一个小车的底盘控制程序，需要控制两个直流电机。

### 代码

```c
// 新手写法：每次用到就写具体操作
void main(void) {
    // 左轮前进
    HAL_GPIO_WritePin(GPIOA, GPIO_PIN_0, GPIO_PIN_SET);
    __HAL_TIM_SET_COMPARE(&htim2, TIM_CHANNEL_1, 500);
    
    HAL_Delay(1000);
    
    // 右轮前进
    HAL_GPIO_WritePin(GPIOA, GPIO_PIN_1, GPIO_PIN_SET);
    __HAL_TIM_SET_COMPARE(&htim3, TIM_CHANNEL_1, 500);
    
    HAL_Delay(1000);
    
    // 停止左轮
    HAL_GPIO_WritePin(GPIOA, GPIO_PIN_0, GPIO_PIN_RESET);
    __HAL_TIM_SET_COMPARE(&htim2, TIM_CHANNEL_1, 0);
    
    // 停止右轮
    HAL_GPIO_WritePin(GPIOA, GPIO_PIN_1, GPIO_PIN_RESET);
    __HAL_TIM_SET_COMPARE(&htim3, TIM_CHANNEL_1, 0);
}
```

### 问题

1. **代码重复**：每个操作都要写一堆寄存器/库函数
2. **不可移植**：换 MCU 要改所有文件
3. **不可读**：看代码不知道是在“控制电机”，只知道在“操作 GPIO 和 PWM”
4. **不可维护**：要改电机逻辑，需要找遍所有调用的地方

### 核心痛点

> **业务逻辑（让车前进）和硬件操作（拉高 GPIO、写 PWM）混在一起**

---

## 第二阶段：函数封装（把重复代码收起来）

### 思路

把硬件操作包成函数，上层调用函数名，不看内部实现。

### 代码

```c
// motor_hw.c - 硬件操作封装
void motor_left_forward(uint16_t speed) {
    HAL_GPIO_WritePin(GPIOA, GPIO_PIN_0, GPIO_PIN_SET);
    __HAL_TIM_SET_COMPARE(&htim2, TIM_CHANNEL_1, speed);
}

void motor_left_stop(void) {
    HAL_GPIO_WritePin(GPIOA, GPIO_PIN_0, GPIO_PIN_RESET);
    __HAL_TIM_SET_COMPARE(&htim2, TIM_CHANNEL_1, 0);
}

void motor_right_forward(uint16_t speed) {
    HAL_GPIO_WritePin(GPIOA, GPIO_PIN_1, GPIO_PIN_SET);
    __HAL_TIM_SET_COMPARE(&htim3, TIM_CHANNEL_1, speed);
}

void motor_right_stop(void) {
    HAL_GPIO_WritePin(GPIOA, GPIO_PIN_1, GPIO_PIN_RESET);
    __HAL_TIM_SET_COMPARE(&htim3, TIM_CHANNEL_1, 0);
}

// main.c - 业务逻辑变清晰了
void main(void) {
    motor_left_forward(500);
    motor_right_forward(500);
    HAL_Delay(1000);
    motor_left_stop();
    motor_right_stop();
}
```

### 优点

- 代码可读性提升
- 硬件操作集中在一个文件，换 MCU 只改这个文件

### 新问题

1. **函数泛滥**：每个动作一个函数（左转、右转、前进、后退、带加速度...），函数数量爆炸
2. **参数不统一**：有的函数用 `uint16_t speed`，有的用 `float duty`
3. **扩展性差**：增加新电机需要写 4 个新函数

---

## 第三阶段：传参驱动（用参数代替函数名）

### 思路

不要为每个动作单独写函数，而是写一个“通用函数”，用参数区分动作。

### 代码

```c
// 用一个函数代替多个
void motor_control(uint8_t id, uint8_t action, int16_t speed) {
    switch(id) {
        case 0:  // 左轮
            if (action == FORWARD) {
                HAL_GPIO_WritePin(GPIOA, GPIO_PIN_0, GPIO_PIN_SET);
                __HAL_TIM_SET_COMPARE(&htim2, TIM_CHANNEL_1, speed);
            } else if (action == STOP) {
                HAL_GPIO_WritePin(GPIOA, GPIO_PIN_0, GPIO_PIN_RESET);
                __HAL_TIM_SET_COMPARE(&htim2, TIM_CHANNEL_1, 0);
            }
            break;
        case 1:  // 右轮
            // 类似...
            break;
    }
}

// 使用
motor_control(0, FORWARD, 500);
motor_control(1, FORWARD, 500);
HAL_Delay(1000);
motor_control(0, STOP, 0);
motor_control(1, STOP, 0);
```

### 优点

- 函数数量从 `电机数 × 动作数` 减少到 1 个
- 新增动作只需加 `case`，不用加函数

### 新问题

1. **参数越来越多**：要支持加速度？加参数 `uint8_t accel`；要支持方向？加参数 `uint8_t dir`... 参数列表越来越长
2. **类型不安全**：`action` 参数传错值（传了 255 而不是 FORWARD），编译器不报错
3. **可读性变差**：`motor_control(0, 1, 500)` 是什么意思？要看文档或函数定义

### 进化：用结构体传参

```c
// 把多个参数打包成一个结构体
typedef struct {
    uint8_t motor_id;      // 0=左轮, 1=右轮
    uint8_t action;        // FORWARD, BACKWARD, STOP
    int16_t speed;         // -1000 ~ 1000
    uint8_t accel_rate;    // 0-10
    uint32_t duration_ms;  // 持续时间
} MotorCommand_t;

void motor_control(MotorCommand_t* cmd) {
    // 根据 cmd 里的字段执行
}

// 使用
MotorCommand_t cmd = {.motor_id=0, .action=FORWARD, .speed=500, .accel_rate=5, .duration_ms=1000};
motor_control(&cmd);
```

### 优点

- 参数清晰，有字段名
- 扩展参数只需改结构体，不用改函数签名

---

## 第四阶段：状态机 + 非阻塞（让 CPU 能干别的事）

### 问题

前面的写法都是**阻塞**的：`HAL_Delay(1000)` 会让 CPU 傻等 1 秒，啥也不能做。

### 思路

把“等待”变成“周期性检查”：每次调用只做一小步，然后返回。主循环不断调用，直到完成。

### 代码

```c
typedef struct {
    int16_t target_speed;
    int16_t current_speed;
    uint32_t start_time;
    uint32_t duration;
    uint8_t is_active;
} MotorState_t;

MotorState_t motors[2];

void motor_start(uint8_t id, int16_t speed, uint32_t ms) {
    motors[id].target_speed = speed;
    motors[id].duration = ms;
    motors[id].start_time = get_tick_ms();  // 获取当前时间
    motors[id].is_active = 1;
}

void motor_update(void) {
    for (int i = 0; i < 2; i++) {
        if (!motors[i].is_active) continue;
        
        uint32_t elapsed = get_tick_ms() - motors[i].start_time;
        
        if (elapsed >= motors[i].duration) {
            // 时间到，停止
            motors[i].is_active = 0;
            set_pwm(i, 0);
        } else {
            // 还在运行中
            set_pwm(i, motors[i].target_speed);
        }
    }
}

// 主循环（非阻塞）
void main(void) {
    motor_start(0, 500, 1000);  // 左轮转1秒
    motor_start(1, 500, 1000);  // 右轮转1秒
    
    while (1) {
        motor_update();  // 每10ms调用一次
        
        // 这10ms间隙可以做其他事
        read_sensors();
        check_emergency();
        
        delay_ms(10);
    }
}
```

### 核心变化

| 阻塞式 | 非阻塞式 |
|--------|----------|
| `HAL_Delay(1000)` | `motor_start(..., 1000)` + 主循环轮询 |
| CPU 空转 1 秒 | CPU 每 10ms 检查一次，其他时间干活 |
| 只能顺序执行动作 | 可以同时处理多个任务 |

---

## 第五阶段：结构体封装多实例（为多态做准备）

### 问题

目前每个电机是全局状态，要加新电机需要手动复制粘贴代码。

### 思路

把电机相关的数据和方法打包成一个结构体，用指针操作。

### 代码

```c
// 电机"类"
typedef struct Motor_t {
    // 属性（数据）
    int16_t target_speed;
    int16_t current_speed;
    uint32_t start_time;
    uint32_t duration;
    uint8_t is_active;
    uint8_t id;
    
    // 方法（函数指针）
    void (*start)(struct Motor_t* self, int16_t speed, uint32_t ms);
    void (*update)(struct Motor_t* self);
} Motor_t;

// 方法实现
void motor_start_impl(Motor_t* self, int16_t speed, uint32_t ms) {
    self->target_speed = speed;
    self->duration = ms;
    self->start_time = get_tick_ms();
    self->is_active = 1;
}

void motor_update_impl(Motor_t* self) {
    if (!self->is_active) return;
    
    if (get_tick_ms() - self->start_time >= self->duration) {
        self->is_active = 0;
        set_pwm(self->id, 0);
    } else {
        set_pwm(self->id, self->target_speed);
    }
}

// 创建实例
Motor_t left_motor = {
    .id = 0,
    .start = motor_start_impl,
    .update = motor_update_impl,
};

Motor_t right_motor = {
    .id = 1,
    .start = motor_start_impl,
    .update = motor_update_impl,
};

// 使用
void main(void) {
    left_motor.start(&left_motor, 500, 1000);
    right_motor.start(&right_motor, 500, 1000);
    
    while (1) {
        left_motor.update(&left_motor);
        right_motor.update(&right_motor);
        delay_ms(10);
    }
}
```

### 关键点：`self` 指针

每个方法第一个参数都是 `self`，指向调用它的实例。这样同一个 `motor_update_impl` 函数可以操作不同的电机数据。

---

## 第六阶段：硬件抽象（换 MCU 不改上层代码）

### 问题

目前 `set_pwm()` 函数里还是直接调用 HAL 库，换 MCU 需要改这个函数内部。

### 思路

把硬件操作也抽象成操作表（函数指针集合），上层只调用操作表，不直接调用 HAL。

### 代码

```c
// 硬件操作表（抽象层）
typedef struct {
    void (*pwm_set)(uint8_t channel, uint16_t duty);
    uint32_t (*get_tick)(void);
    void (*delay_ms)(uint32_t ms);
} Hardware_t;

// STM32 实现
static void stm32_pwm_set(uint8_t ch, uint16_t duty) {
    __HAL_TIM_SET_COMPARE(&htim2, TIM_CHANNEL_1 + ch, duty);
}

static uint32_t stm32_get_tick(void) {
    return HAL_GetTick();
}

Hardware_t STM32_Hardware = {
    .pwm_set = stm32_pwm_set,
    .get_tick = stm32_get_tick,
    .delay_ms = HAL_Delay,
};

// 上层代码依赖抽象，不依赖具体
Hardware_t* HW = &STM32_Hardware;  // 换平台只改这一行

// 电机控制代码改为
void motor_update_impl(Motor_t* self) {
    // ...
    HW->pwm_set(self->id, self->target_speed);
}
```

### 效果

| 平台 | 需要改的代码 |
|------|-------------|
| STM32 | `stm32_pwm_set` 等函数的实现 |
| ESP32 | 写一套 `esp32_pwm_set` 等函数，然后 `HW = &ESP32_Hardware` |
| 模拟测试 | 写一套 mock 函数，在 PC 上跑 |

**上层业务逻辑（电机控制、底盘控制）一行代码都不用改！**

---

## 第七阶段：多态（同一个接口，不同行为）

### 场景

现在有两种电机：
- **直流电机**：需要 PID 闭环控制
- **步进电机**：需要发脉冲控制

### 问题

它们的行为完全不同，但我们希望上层能用统一的接口：`motor_update()`

### 解决方案：操作表 + 派生结构体

```c
// ========== 第一步：定义通用接口 ==========
typedef struct Motor_t Motor_t;
typedef struct {
    void (*update)(Motor_t* self);
    void (*set_speed)(Motor_t* self, int16_t speed);
} MotorOps_t;

struct Motor_t {
    MotorOps_t* ops;  // 操作表（告诉怎么操作）
    uint8_t id;
    // 其他通用属性...
};

// ========== 第二步：实现直流电机 ==========
typedef struct {
    Motor_t base;           // 继承通用部分
    int16_t target_speed;
    int16_t current_speed;
    float kp, ki, kd;       // PID参数
} DCMotor_t;

static void dc_update(Motor_t* self) {
    DCMotor_t* dc = (DCMotor_t*)self;
    // PID 计算
    int16_t error = dc->target_speed - dc->current_speed;
    int16_t output = error * dc->kp;
    HW->pwm_set(self->id, output);
}

static void dc_set_speed(Motor_t* self, int16_t speed) {
    DCMotor_t* dc = (DCMotor_t*)self;
    dc->target_speed = speed;
}

static MotorOps_t dc_ops = {
    .update = dc_update,
    .set_speed = dc_set_speed,
};

// ========== 第三步：实现步进电机 ==========
typedef struct {
    Motor_t base;           // 继承通用部分
    int32_t target_steps;
    int32_t current_steps;
} StepperMotor_t;

static void stepper_update(Motor_t* self) {
    StepperMotor_t* stepper = (StepperMotor_t*)self;
    if (stepper->current_steps < stepper->target_steps) {
        // 发一个脉冲
        HW->gpio_toggle(self->id);
        stepper->current_steps++;
    }
}

static void stepper_set_speed(Motor_t* self, int16_t speed) {
    StepperMotor_t* stepper = (StepperMotor_t*)self;
    stepper->target_steps = speed;  // 这里 speed 实际表示步数
}

static MotorOps_t stepper_ops = {
    .update = stepper_update,
    .set_speed = stepper_set_speed,
};

// ========== 第四步：创建对象 ==========
DCMotor_t dc_motor_obj = {
    .base = { .ops = &dc_ops, .id = 0 },
    .target_speed = 0,
    .kp = 1.5,
};

StepperMotor_t stepper_obj = {
    .base = { .ops = &stepper_ops, .id = 1 },
    .target_steps = 0,
};

Motor_t* motors[2] = {
    (Motor_t*)&dc_motor_obj,
    (Motor_t*)&stepper_obj,
};

// ========== 第五步：统一调用 ==========
void main(void) {
    motors[0]->ops->set_speed(motors[0], 500);
    motors[1]->ops->set_speed(motors[1], 1000);
    
    while (1) {
        for (int i = 0; i < 2; i++) {
            motors[i]->ops->update(motors[i]);  // 同一个调用，不同行为！
        }
        delay_ms(10);
    }
}
```

### 多态的魔力

```plain
motors[0]（直流电机）:
    motors[0]->ops->update → 执行 dc_update() → PID 计算 → 设 PWM

motors[1]（步进电机）:
    motors[1]->ops->update → 执行 stepper_update() → 发脉冲 → 走一步
```

**同样的代码 `motors[i]->ops->update(motors[i])`，做的是完全不同的事情！**

---

## 总结：架构演化路线图

| 阶段 | 核心思想 | 关键代码特征 | 解决的问题 |
|------|----------|-------------|-----------|
| 1. 硬编码 | 写到哪算哪 | 寄存器操作散落各处 | 无 |
| 2. 函数封装 | 硬件操作打包 | `motor_left_forward()` | 可读性、集中修改 |
| 3. 传参驱动 | 用参数区分行为 | `motor_control(id, action, speed)` | 减少函数数量 |
| 4. 非阻塞 | 状态机 + 轮询 | `motor_start()` + `motor_update()` | CPU 不空转 |
| 5. 多实例 | 结构体封装 | `Motor_t` + `self` 指针 | 支持多个对象 |
| 6. 硬件抽象 | 操作表 | `Hardware_t` + 函数指针 | 跨平台移植 |
| 7. 多态 | 每个对象有自己的操作表 | `MotorOps_t` + 派生结构体 | 同一接口，不同行为 |

---

## 最后：什么时候用哪种？

| 项目规模 | 推荐阶段 | 理由 |
|----------|----------|------|
| 1-2 个文件，个人玩具 | 阶段 2-3 | 够用，不折腾 |
| 多个模块，团队开发 | 阶段 4-5 | 可维护性重要 |
| 需要换平台的产品 | 阶段 6 | 硬件抽象是刚需 |
| 有多种设备类型（电机、灯、传感器） | 阶段 7 | 多态让扩展变得简单 |

---
