---
title: STM32 Library Design Notes 2
link: stm32-library-design2-note
date: 2026-05-14 00:05:13
description: STM32 driver library object-oriented programming design, the evolution from hardcoding to polymorphism.
tags:
  - STM32
  - Library Design
  - HAL
  - Embedded
categories:
  - [笔记, STM32]
---


## Stage 1: Newbie Village - Hardcoding

### Scenario

We have a small car chassis control program that needs to control two DC motors.

### Code

```c
// Beginner approach: write specific operations each time
void main(void) {
    // Left wheel forward
    HAL_GPIO_WritePin(GPIOA, GPIO_PIN_0, GPIO_PIN_SET);
    __HAL_TIM_SET_COMPARE(&htim2, TIM_CHANNEL_1, 500);

    HAL_Delay(1000);

    // Right wheel forward
    HAL_GPIO_WritePin(GPIOA, GPIO_PIN_1, GPIO_PIN_SET);
    __HAL_TIM_SET_COMPARE(&htim3, TIM_CHANNEL_1, 500);

    HAL_Delay(1000);

    // Stop left wheel
    HAL_GPIO_WritePin(GPIOA, GPIO_PIN_0, GPIO_PIN_RESET);
    __HAL_TIM_SET_COMPARE(&htim2, TIM_CHANNEL_1, 0);

    // Stop right wheel
    HAL_GPIO_WritePin(GPIOA, GPIO_PIN_1, GPIO_PIN_RESET);
    __HAL_TIM_SET_COMPARE(&htim3, TIM_CHANNEL_1, 0);
}
```

### Problems

1. **Code duplication**: Each operation requires writing a bunch of register/library function calls
2. **Not portable**: Changing MCU requires modifying all files
3. **Unreadable**: Looking at the code, you can't tell it's "controlling motors", only that it's "operating GPIO and PWM"
4. **Hard to maintain**: To change motor logic, you need to find all the places it's called

### Core Pain Point

> **Business logic (making the car go forward) is mixed with hardware operations (pulling GPIO high, writing PWM)**

---

## Stage 2: Function Encapsulation (Gathering Repeated Code)

### Concept

Package hardware operations into functions; upper layers call function names without looking at internal implementation.

### Code

```c
// motor_hw.c - Hardware operation encapsulation
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

// main.c - Business logic becomes clearer
void main(void) {
    motor_left_forward(500);
    motor_right_forward(500);
    HAL_Delay(1000);
    motor_left_stop();
    motor_right_stop();
}
```

### Advantages

- Improved code readability
- Hardware operations concentrated in one file, changing MCU only requires modifying this file

### New Problems

1. **Function proliferation**: Each action gets its own function (turn left, turn right, forward, backward, with acceleration...), function count explodes
2. **Inconsistent parameters**: Some functions use `uint16_t speed`, others use `float duty`
3. **Poor extensibility**: Adding a new motor requires writing 4 new functions

---

## Stage 3: Parameter-Driven (Using Parameters Instead of Function Names)

### Concept

Don't write separate functions for each action; instead, write one "generic function" and use parameters to distinguish actions.

### Code

```c
// Use one function instead of multiple
void motor_control(uint8_t id, uint8_t action, int16_t speed) {
    switch(id) {
        case 0:  // Left wheel
            if (action == FORWARD) {
                HAL_GPIO_WritePin(GPIOA, GPIO_PIN_0, GPIO_PIN_SET);
                __HAL_TIM_SET_COMPARE(&htim2, TIM_CHANNEL_1, speed);
            } else if (action == STOP) {
                HAL_GPIO_WritePin(GPIOA, GPIO_PIN_0, GPIO_PIN_RESET);
                __HAL_TIM_SET_COMPARE(&htim2, TIM_CHANNEL_1, 0);
            }
            break;
        case 1:  // Right wheel
            // Similar...
            break;
    }
}

// Usage
motor_control(0, FORWARD, 500);
motor_control(1, FORWARD, 500);
HAL_Delay(1000);
motor_control(0, STOP, 0);
motor_control(1, STOP, 0);
```

### Advantages

- Function count reduced from `motor_count × action_count` to 1
- Adding new actions only requires adding `case`, no new functions needed

### New Problems

1. **Too many parameters**: Want to support acceleration? Add parameter `uint8_t accel`; want to support direction? Add parameter `uint8_t dir`... parameter list keeps growing
2. **Type unsafe**: Passing wrong value for `action` parameter (passing 255 instead of FORWARD), compiler doesn't complain
3. **Poor readability**: What does `motor_control(0, 1, 500)` mean? Need to check documentation or function definition

### Evolution: Using Struct for Parameter Passing

```c
// Pack multiple parameters into one struct
typedef struct {
    uint8_t motor_id;      // 0=left wheel, 1=right wheel
    uint8_t action;        // FORWARD, BACKWARD, STOP
    int16_t speed;         // -1000 ~ 1000
    uint8_t accel_rate;    // 0-10
    uint32_t duration_ms;  // Duration
} MotorCommand_t;

void motor_control(MotorCommand_t* cmd) {
    // Execute based on fields in cmd
}

// Usage
MotorCommand_t cmd = {.motor_id=0, .action=FORWARD, .speed=500, .accel_rate=5, .duration_ms=1000};
motor_control(&cmd);
```

### Advantages

- Clear parameters with field names
- Adding parameters only requires modifying the struct, not the function signature

---

## Stage 4: State Machine + Non-Blocking (Letting the CPU Do Other Things)

### Problem

Previous approaches are all **blocking**: `HAL_Delay(1000)` makes the CPU wait idly for 1 second, doing nothing.

### Concept

Turn "waiting" into "periodic checking": each call does only a small step, then returns. Main loop continuously calls until complete.

### Code

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
    motors[id].start_time = get_tick_ms();  // Get current time
    motors[id].is_active = 1;
}

void motor_update(void) {
    for (int i = 0; i < 2; i++) {
        if (!motors[i].is_active) continue;

        uint32_t elapsed = get_tick_ms() - motors[i].start_time;

        if (elapsed >= motors[i].duration) {
            // Time's up, stop
            motors[i].is_active = 0;
            set_pwm(i, 0);
        } else {
            // Still running
            set_pwm(i, motors[i].target_speed);
        }
    }
}

// Main loop (non-blocking)
void main(void) {
    motor_start(0, 500, 1000);  // Left wheel runs for 1 second
    motor_start(1, 500, 1000);  // Right wheel runs for 1 second

    while (1) {
        motor_update();  // Call every 10ms

        // During these 10ms间隙, can do other things
        read_sensors();
        check_emergency();

        delay_ms(10);
    }
}
```

### Core Changes

| Blocking | Non-Blocking |
|----------|--------------|
| `HAL_Delay(1000)` | `motor_start(..., 1000)` + main loop polling |
| CPU idles for 1 second | CPU checks every 10ms, works on other things the rest of the time |
| Can only execute actions sequentially | Can handle multiple tasks simultaneously |

---

## Stage 5: Struct Encapsulation for Multiple Instances (Preparing for Polymorphism)

### Problem

Currently each motor is global state; adding a new motor requires manual copy-paste of code.

### Concept

Package motor-related data and methods into a struct, operate via pointers.

### Code

```c
// Motor "class"
typedef struct Motor_t {
    // Properties (data)
    int16_t target_speed;
    int16_t current_speed;
    uint32_t start_time;
    uint32_t duration;
    uint8_t is_active;
    uint8_t id;

    // Methods (function pointers)
    void (*start)(struct Motor_t* self, int16_t speed, uint32_t ms);
    void (*update)(struct Motor_t* self);
} Motor_t;

// Method implementations
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

// Create instances
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

// Usage
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

### Key Point: `self` Pointer

Each method's first parameter is `self`, pointing to the instance that called it. This allows the same `motor_update_impl` function to operate on different motor data.

---

## Stage 6: Hardware Abstraction (Changing MCU Without Modifying Upper Layer Code)

### Problem

Currently `set_pwm()` function still directly calls HAL library; changing MCU requires modifying this function's internals.

### Concept

Abstract hardware operations into an operations table (function pointer collection); upper layers only call the operations table, not HAL directly.

### Code

```c
// Hardware operations table (abstraction layer)
typedef struct {
    void (*pwm_set)(uint8_t channel, uint16_t duty);
    uint32_t (*get_tick)(void);
    void (*delay_ms)(uint32_t ms);
} Hardware_t;

// STM32 implementation
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

// Upper layer code depends on abstraction, not concrete implementation
Hardware_t* HW = &STM32_Hardware;  // Change platform by modifying only this line

// Motor control code changed to
void motor_update_impl(Motor_t* self) {
    // ...
    HW->pwm_set(self->id, self->target_speed);
}
```

### Effect

| Platform | Code that needs to change |
|----------|--------------------------|
| STM32 | Implementations of `stm32_pwm_set` and similar functions |
| ESP32 | Write a set of `esp32_pwm_set` and similar functions, then `HW = &ESP32_Hardware` |
| Simulation testing | Write a set of mock functions, run on PC |

**Upper layer business logic (motor control, chassis control) doesn't need a single line of code change!**

---

## Stage 7: Polymorphism (Same Interface, Different Behaviors)

### Scenario

Now we have two types of motors:
- **DC motor**: Needs PID closed-loop control
- **Stepper motor**: Needs pulse signaling control

### Problem

Their behaviors are completely different, but we want the upper layer to use a unified interface: `motor_update()`

### Solution: Operations Table + Derived Structs

```c
// ========== Step 1: Define common interface ==========
typedef struct Motor_t Motor_t;
typedef struct {
    void (*update)(Motor_t* self);
    void (*set_speed)(Motor_t* self, int16_t speed);
} MotorOps_t;

struct Motor_t {
    MotorOps_t* ops;  // Operations table (tells how to operate)
    uint8_t id;
    // Other common properties...
};

// ========== Step 2: Implement DC motor ==========
typedef struct {
    Motor_t base;           // Inherit common part
    int16_t target_speed;
    int16_t current_speed;
    float kp, ki, kd;       // PID parameters
} DCMotor_t;

static void dc_update(Motor_t* self) {
    DCMotor_t* dc = (DCMotor_t*)self;
    // PID calculation
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

// ========== Step 3: Implement stepper motor ==========
typedef struct {
    Motor_t base;           // Inherit common part
    int32_t target_steps;
    int32_t current_steps;
} StepperMotor_t;

static void stepper_update(Motor_t* self) {
    StepperMotor_t* stepper = (StepperMotor_t*)self;
    if (stepper->current_steps < stepper->target_steps) {
        // Send one pulse
        HW->gpio_toggle(self->id);
        stepper->current_steps++;
    }
}

static void stepper_set_speed(Motor_t* self, int16_t speed) {
    StepperMotor_t* stepper = (StepperMotor_t*)self;
    stepper->target_steps = speed;  // Here speed actually represents steps
}

static MotorOps_t stepper_ops = {
    .update = stepper_update,
    .set_speed = stepper_set_speed,
};

// ========== Step 4: Create objects ==========
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

// ========== Step 5: Unified calling ==========
void main(void) {
    motors[0]->ops->set_speed(motors[0], 500);
    motors[1]->ops->set_speed(motors[1], 1000);

    while (1) {
        for (int i = 0; i < 2; i++) {
            motors[i]->ops->update(motors[i]);  // Same call, different behavior!
        }
        delay_ms(10);
    }
}
```

### The Magic of Polymorphism

```plain
motors[0] (DC motor):
    motors[0]->ops->update → executes dc_update() → PID calculation → set PWM

motors[1] (stepper motor):
    motors[1]->ops->update → executes stepper_update() → send pulse → take one step
```

**The same code `motors[i]->ops->update(motors[i])`, but does completely different things!**

---

## Summary: Architecture Evolution Roadmap

| Stage | Core Concept | Key Code Characteristics | Problem Solved |
|------|--------------|--------------------------|----------------|
| 1. Hardcoding | Write wherever needed | Register operations scattered everywhere | None |
| 2. Function encapsulation | Package hardware operations | `motor_left_forward()` | Readability, centralized modification |
| 3. Parameter-driven | Use parameters to distinguish behavior | `motor_control(id, action, speed)` | Reduce function count |
| 4. Non-blocking | State machine + polling | `motor_start()` + `motor_update()` | CPU not idle |
| 5. Multiple instances | Struct encapsulation | `Motor_t` + `self` pointer | Support multiple objects |
| 6. Hardware abstraction | Operations table | `Hardware_t` + function pointers | Cross-platform portability |
| 7. Polymorphism | Each object has its own operations table | `MotorOps_t` + derived structs | Same interface, different behaviors |

---

## Finally: When to Use Which?

| Project Scale | Recommended Stage | Reason |
|---------------|-------------------|--------|
| 1-2 files, personal toy | Stage 2-3 | Sufficient, no over-engineering |
| Multiple modules, team development | Stage 4-5 | Maintainability matters |
| Platform-switching product | Stage 6 | Hardware abstraction is essential |
| Multiple device types (motors, lights, sensors) | Stage 7 | Polymorphism makes extension simple |

---