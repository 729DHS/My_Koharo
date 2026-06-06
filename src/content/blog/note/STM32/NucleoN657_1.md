---
title: "STM32N657X0H3Q Nucleo 开发板开发记录"
link: stm32n657-nucleo-dev-log
date: 2026-06-07 00:00:00
description: "STM32N657X0H3Q Nucleo 开发板调试记录，涵盖 SRAM 调试、XSPI XIP 模式、FSBL Load & Run 模式配置与签名烧录流程。"
tags:
  - STM32
  - STM32N6
  - 嵌入式
  - 调试
categories:
  - [笔记, STM32]
---

# STM32N657X0H3Q Nucleo 开发板开发记录

> 这破板子真服了——又是什么 TrustZone、又是 FSBL、又是 OTP，怎么这么难……

---

## 一、调试记录

### 第一次调试：SRAM 模式

第一次当然顺其自然，想着按照以往 F1 跟 F4 的经验，直接在 CubeMX 里面配置项目，然后加载到 VS Code 进行调试。不过神奇的是，**其实是可以调试的**。

但是它运行不了，Reset 之后代码直接消失不见了。从现在来看应该是在调试的时候用的是 SRAM 模式，直接加载到 SRAM 之后进行的运行。好处是能直接看到结果，可以调试，但问题就是它其实完全没有记住代码。记住代码这个过程其实是需要让它记到 Flash 里面去配置这个 XSPI 的。

> **踩坑**：NUCLEO-N657X0-Q **没有内部 Flash**，代码必须存放在外部 XSPI Flash 中。调试模式下加载到 SRAM 后，Reset 一旦断电代码就没了，这就是为什么 Reset 后代码"消失"了。

### XSPI + XIP 模式尝试

XIP 模式意思就是 Execute In Place，直接在外部 Nor Flash 里面进行运行程序，也就是说 SRAM 其实是没有进行任何工作的。XSPI 的意思是这个板子、这个芯片它的一个特殊的 SPI 协议，它用于和外部这个 Nor Flash 进行通信，配置过程还挺复杂的。

然后进行了 XSPI 的尝试，但是完全不能做，不知道是哪里出问题了，有源源不断的问题，下载代码和调试全都是报错。而且官方论坛这个帖子是根据 DK 版进行配置的，我不太清楚 DK 版跟 New Clone 板子是否有什么区别，所以还是放弃了。

> **踩坑**：XIP 模式配置极其复杂，需要：
>1. 配置 Memory-Mapped Mode，让 CPU 能直接总线访问外部 Flash
> 2. 外部 Flash 的 .stldr 加载器文件（STM32CubeProgrammer 需要加载正确的 External Loader）
> 3. 正确的 linker 脚本（`STM32N657XX_ROMxspi*.ld`）
> 4. 签名时需要加上 `-align` 参数
>
> DK 版（开发套件）和 NUCLEO 板的配置可能有差异，官方教程按照 DK 版来，很多配置在 NUCLEO 板上不适用。

### LRUN 模式：成功

LRUN 模式就是 Load and Run，它是通过 FSBL 以及 Application 进行配合。FSBL 进行初始化，并把 Application 的代码转移到 SRAM。我的理解是，把 PC 指针最后在进入死循环之前就转移到了 Application。所以需要注意的是，**死循环是不会执行的**。我把亮灯放到了死循环之前，进入 Application 之前。

![alt text](/img/Note/STM32/NucleoN657_1_1.png)

然后倒是挺顺利的，直接编译烧录。编译完之后给它加签名，加签名之后直接各自烧录就可以了。理论上来说应该是先去烧录 FSBL，再去烧录 Application 的。不过实际上它板载的程序应该是 LRUN 模式，所以不管烧哪个进行替换其实都完全可以的。因为这只不过是 FSBL 的指针问题，Application 是各自的程序，其实没有什么区别。

![alt text](/img/Note/STM32/NucleoN657_1_2.png)

还有需要注意的是，在烧录的时候需要选择外部存储设置，也就是那个 STLDR 文件，选择它这个板子对应的设置，然后才能进行烧录。我在烧录的时候它最后弹出来了内核被锁定，之前以及会弹出一个写入保护 PROTECTION，不太清楚是为什么。

![alt text](/img/Note/STM32/NucleoN657_1_3.png)

> **踩坑**：烧录时弹出"内核被锁定"（Core locked）或者"写入保护 PROTECTION"，通常是 Option Bytes 配置问题。可以尝试：
> 1. 按住 Reset 再烧录
> 2. 使用 Mass Erase 擦除整片芯片
> 3. 检查 BOOT 跳线是否正确设置（DEV 模式下 BOOT1 = 2-3）
>
> 另外，烧录前需要在 CubeProgrammer 中加载正确的 External Loader（.stldr 文件），否则无法识别外部 Flash。

---

## 二、硬件平台与关键概念

### 2.1 芯片与开发板

- **芯片**：STM32N657X0H3QU
- **开发板**：NUCLEO-N657X0-Q (MB1940)
- **架构**：ARM Cortex-M55 with Helium (MVE) + TrustZone
- **主频**：600 MHz
- **Flash**：**无内部 Flash**，依赖外部 XSPI Nor Flash
- **RAM**：2MB AXISRAM (0x3400_0000 ~ 0x3420_0000)

STM32N6 与以往 F1/F4 系列最大的区别在于：

1. **无内部 Flash**：代码必须存放在外部 XSPI Flash 中
2. **TrustZone**：安全世界与非安全世界隔离，需要正确配置 RIF
3. **双域架构**：Secure 域和 Non-Secure 域分离
4. **OTP Fuses**：一次性可编程熔丝，用于配置高速模式
5. **FSBL 机制**：First Stage Boot Loader

### 2.2 LED 引脚

| LED 颜色 | 引脚 | 备注 |
|---------|------|------|
| 绿色 LED | PG.00 (LED_GREEN) | Appli 主循环控制 |
| 蓝色 LED | PG.08 (LED_BLUE) | Appli 主循环控制 |
| 红色 LED | PG.10 (LED_RED) | FSBL 调试指示 |

> **勘误**：之前笔记把 PG.08 写成黄色，实际是蓝色（LED_BLUE）。NUCLEO-N657X0-Q 板上丝印标注的颜色和 BSP 定义一致。 |

### 2.3 启动模式（Boot Pin）

板上 Boot 引脚有 3 个位置（排针 1、2、3），通过跳线帽选择：

#### Boot 引脚配置

| 引脚 | 排针 1-2 短路 | 排针 2-3 短路 |
|------|--------------|--------------|
| **BOOT0** | 0（低电平） | 1（高电平） |
| **BOOT1** | 0（低电平） | 1（高电平） |

#### 启动模式

| 模式 | BOOT0 | BOOT1 | 说明 |
|------|-------|-------|------|
| **DEV（调试）** | **任意**（0 或 1 都可以） | **1**（排针 2-3 短路） | IDE 加载程序到 RAM，可源码调试 |
| **Boot from Flash** | **0**（排针 1-2 短路） | **0**（排针 1-2 短路） | 从外部 XSPI Flash 启动，独立运行 |
| **Reserved** | 1 | 0 | 保留 |
| **System ROM** | 0 | 0 | 芯片内置 ROM（一般不用） |

> **注意**：DEV 模式下 BOOT0 任意，**只要求 BOOT1 = 1**（跳线帽接 2-3）。

### 2.4 Boot ROM 启动顺序

STM32N6 芯片上电后，Boot ROM 按以下顺序查找可启动代码：

| 顺序 | 地址 | 说明 |
|------|------|------|
| 1 | `0x7000 0000` | **首选**：外部 XSPI Flash（FSBL 或带 header 的程序） |
| 2 | 内部 ROM | 芯片出厂自带的 BootLoader（如有） |
| 3 | RAM | 如果其他地方都没有，尝试从 RAM 启动 |

> **注意**：地址 `0x7000 0000` 是外部 Flash 的**镜像起始地址**，实际物理 Flash 通过 XSPI 接口访问。带签名的程序放在这里，Boot ROM 才能识别并加载。

### 2.5 名词解释

| 缩写 | 全称 | 含义 |
|------|------|------|
| LRUN | Load & Run | 代码从外部 Flash 复制到内部 RAM 后执行 |
| XIP | eXecute In Place | 代码直接在外部 Flash 原地执行，不复制到 RAM |
| XSPI | eXtended SPI | ST 的串行外设接口协议，用于与外部 Flash 通信 |
| FSBL | First Stage Boot Loader | 第一阶段引导加载程序 |
| OTP | One-Time Programmable | 一次性可编程熔丝 |

### 2.6 链接文件命名规则

格式：`ROM在哪里_RUN_RAM在哪里`

| 链接文件 | 含义 |
|---------|------|
| `STM32N657XX_LRUN` | Appli 放在内部 RAM（由 FSBL 加载） |
| `STM32N657XX_ROMxspi1` | Appli 在外部 XSPI1 Flash，原地执行 |
| `STM32N657XX_ROMxspi2` | Appli 在外部 XSPI2 Flash，原地执行 |
| `STM32N657XX_LRUN_RAMxspi2` | Appli 放 RAM，但从 XSPI2 的 Flash 加载 |
| `STM32N657XX_ROMxspi1_RAMxspi3` | Appli 在 XSPI1，RAM 用 XSPI3 |

---

## 三、FSBL Load & Run 模式

### 3.1 架构概述

FSBL LRUN 模式将系统分为两个独立的子项目：

| 子项目 | 职责 | 运行位置 |
|--------|------|----------|
| **FSBL** | 初始化 OTP、配置 XSPI2、读取并复制 Appli、跳转执行 | 内部 RAM (0x3400_0000) |
| **Appli** | 用户应用程序，控制 LED 等外设 | 内部 RAM (0x3400_0400) |

### 3.2 FSBL 代码分析

FSBL 的核心代码在 `FSBL/Src/main.c`：

```c
int main(void)
{
    SCB_EnableICache();
    SCB_EnableDCache();
    HAL_Init();
    SystemClock_Config();  // 配置 600MHz 系统时钟

    // OTP 配置（第一次必须）
#ifndef NO_OTP_FUSE
    if(OTP_Config() != 0){
        Error_Handler();
    }
#endif

    MX_GPIO_Init(); // 初始化 LED (PG.10)
    MX_XSPI2_Init(); // 初始化 XSPI2 接口
    MX_EXTMEM_Init();
    BOOT_Application();   // 复制 Appli 到 RAM 并跳转

    while (1) { __NOP(); }  // 永远不会执行到这里
}
```

**FSBL 执行流程**：

1. **使能缓存**：ICache + DCache
2. **配置时钟**：600MHz 主频
3. **OTP 配置**：设置 VDDIO3_HSLV 等熔丝（仅第一次需要）
4. **初始化 GPIO**：配置 LED 引脚 PG.10（调试用）
5. **初始化 XSPI2**：与外部 Flash 通信
6. **初始化外部存储**：`MX_EXTMEM_Init()`
7. **跳转执行**：`BOOT_Application()` 复制 Appli 到 RAM 并跳转

### 3.3 OTP 配置详解

`OTP_Config()` 函数配置 VDDIO3_HSLV 熔丝位：

```c
#define BSEC_HW_CONFIG_ID    124U
#define BSEC_HWS_HSLV_VDDIO3 (1U<<15)  // VDDIO3 高速模式使能
```

> ⚠️ **注意**：OTP 熔丝**一次写入，不可逆**，配置前请确认。第一次烧录时需要禁用 `NO_OTP_FUSE` 宏。

### 3.4 Appli 代码分析

Appli 的代码在 `Appli/Src/main.c`：

```c
int main(void)
{
    SystemCoreClockUpdate();
    MPU_Config();
    SCB_EnableICache();
    SCB_EnableDCache();
    HAL_Init();
    BSP_LED_Init(LED_GREEN);
    SystemIsolation_Config();  // 配置 RIF 资源隔离
    MX_GPIO_Init();

    while (1)
    {
        HAL_GPIO_TogglePin(GPIOG, GPIO_PIN_0);  // 绿色 LED
        HAL_GPIO_TogglePin(GPIOG, GPIO_PIN_8);  // 蓝色 LED
        HAL_Delay(750);
    }
}
```

Appli 中的 `SystemIsolation_Config()` 配置 TrustZone 资源隔离：

```c
static void SystemIsolation_Config(void)
{
    __HAL_RCC_RIFSC_CLK_ENABLE();
    HAL_GPIO_ConfigPinAttributes(GPIOG, GPIO_PIN_0, GPIO_PIN_SEC|GPIO_PIN_NPRIV);
    HAL_GPIO_ConfigPinAttributes(GPIOG, GPIO_PIN_8, GPIO_PIN_SEC|GPIO_PIN_NPRIV);
    HAL_GPIO_ConfigPinAttributes(GPIOG, GPIO_PIN_10, GPIO_PIN_SEC|GPIO_PIN_NPRIV);
}
```

### 3.5 跳过 FSBL 直接运行 Appli

如果满足以下条件之一，可以**跳过 FSBL 直接烧录 Appli**：

- OTP 已经配置好（VDDIO3_HSLV 已设置）
- 芯片出厂自带 FSBL 在 `0x7000 0000`
- Boot ROM 支持直接从 `0x7010 0000` 加载

**操作步骤**：
1. 签名 Appli：`Appli-trusted.bin`
2. 烧录到 `0x7010 0000`
3. Reset，芯片会从外部 Flash 启动

> **踩坑**：如果芯片没有自带 FSBL 且 Boot ROM 不支持直接加载，跳过 FSBL 会导致芯片找不到可执行代码而停住。

---

## 四、编译配置

### 4.1 工具链

| 工具 | 路径 |
|------|------|
| GCC ARM Compiler | `C:\Users\Q\AppData\Local\stm32cube\bundles\gnu-tools-for-stm32\14.3.1+st.2` |
| STM32Cube Firmware | `C:\Users\Q\STM32Cube\Repository\STM32Cube_FW_N6_V1.3.0\` |
| Signing Tool | `C:\APPS\Programmer\bin\STM32_SigningTool_CLI.exe` |

### 4.2 编译命令

```bash
cd build/Debug
cube-cmake --build . --target clean
cube-cmake --build . --target all
```

### 4.3 CMake POST_BUILD 配置（自动签名）

```cmake
find_program(OBJCOPY arm-none-eabi-objcopy PATHS
    C:/Users/Q/AppData/Local/stm32cube/bundles/gnu-tools-for-stm32/14.3.1+st.2/bin
    NO_DEFAULT_PATH
)

add_custom_command(TARGET ${CMAKE_PROJECT_NAME} POST_BUILD
    COMMAND ${OBJCOPY} -O binary $<TARGET_FILE:${CMAKE_PROJECT_NAME}> 
            ${CMAKE_BINARY_DIR}/${CMAKE_PROJECT_NAME}.bin
    COMMENT "Generating binary"
)

add_custom_command(TARGET ${CMAKE_PROJECT_NAME} POST_BUILD
    COMMAND ${OBJCOPY} -O ihex $<TARGET_FILE:${CMAKE_PROJECT_NAME}> 
            ${CMAKE_BINARY_DIR}/${CMAKE_PROJECT_NAME}.hex
    COMMENT "Generating HEX"
)

# 自动签名（编译后自动执行，无需手动签名）
find_program(SIGNING_TOOL C:/APPS/Programmer/bin/STM32_SigningTool_CLI.exe)
add_custom_command(TARGET ${CMAKE_PROJECT_NAME} POST_BUILD
    COMMAND ${SIGNING_TOOL} -bin ${CMAKE_BINARY_DIR}/${CMAKE_PROJECT_NAME}.bin 
            -nk -of 0x80000000 -t fsbl
            -o ${CMAKE_BINARY_DIR}/${CMAKE_PROJECT_NAME}-trusted.bin 
            -hv 2.3 -align -s
    COMMENT "Signing ${CMAKE_PROJECT_NAME}.bin"
)
```

### 4.4 NO_OTP_FUSE 宏配置

FSBL 的编译宏在 `FSBL/mx-generated.cmake` 中定义：

```cmake
set(MX_Defines_Syms 
    USE_HAL_DRIVER 
    STM32N657xx 
    NO_OTP_FUSE # 注释掉此行以启用 OTP 配置
)
```

| 配置 | 说明 |
|------|------|
| 禁用 `NO_OTP_FUSE` | 第一次烧录时必须，FSBL 会自动配置 OTP 熔丝 |
| 启用 `NO_OTP_FUSE` | 后续开发使用，跳过 OTP 配置步骤 |

### 4.5 编译产物

| 文件 | 位置 |
|------|------|
| FSBL.elf / .bin / .hex | `FSBL/build/Template_FSBL_LRUN_FSBL.*` |
| Appli.elf / .bin / .hex | `Appli/build/Template_FSBL_LRUN_Appli.*` |
| FSBL-trusted.bin | `FSBL/build/Template_FSBL_LRUN_FSBL-trusted.bin` |
| Appli-trusted.bin | `Appli/build/Template_FSBL_LRUN_Appli-trusted.bin` |

---

## 五、签名与烧录

### 5.1 为什么要签名

STM32N6 的外部 Flash 存储了关键固件，芯片的 Boot ROM 只会加载**带有正确签名 Header** 的镜像。签名工具为 .bin 文件添加一个 V2.3 格式的头部。

### 5.2 签名命令（手动）

```powershell
# Appli 签名
& "C:\APPS\Programmer\bin\STM32_SigningTool_CLI.exe" `
    -bin "C:\APPS\COPRO\MCU\CUBEMX\N6_MX\Template_FSBL_LRUN\Appli\build\Template_FSBL_LRUN_Appli.bin" `
    -nk -of 0x80000000 -t fsbl `
    -o "C:\APPS\COPRO\MCU\CUBEMX\N6_MX\Template_FSBL_LRUN\Appli\build\Template_FSBL_LRUN_Appli-trusted.bin" `
    -hv 2.3 -align -s

# FSBL 签名
& "C:\APPS\Programmer\bin\STM32_SigningTool_CLI.exe" `
    -bin "C:\APPS\COPRO\MCU\CUBEMX\N6_MX\Template_FSBL_LRUN\FSBL\build\Template_FSBL_LRUN_FSBL.bin" `
    -nk -of 0x80000000 -t fsbl `
    -o "C:\APPS\COPRO\MCU\CUBEMX\N6_MX\Template_FSBL_LRUN\FSBL\build\Template_FSBL_LRUN_FSBL-trusted.bin" `
    -hv 2.3 -align -s
```

### 5.3 签名参数说明

| 参数 | 说明 |
|------|------|
| `-bin` | 输入的 .bin 文件路径 |
| `-nk` | No Key，开发模式，不做真正签名验证 |
| `-of 0x80000000` | Option flags 地址偏移 |
| `-t fsbl` | Binary type：FSBL 类型 |
| `-hv 2.3` | Header version（N6 必须用 2.3） |
| `-align` | **必须加**，payload 对齐到 0x400 |
| `-s` | 静默模式，不弹出覆盖确认提示 |

### 5.4 烧录地址

| 文件 | 地址 |
|------|------|
| `Appli-trusted.bin` | `0x7010_0000` |
| `FSBL-trusted.bin` | `0x7000_0000`（可选） |

### 5.5 烧录后现象

| 阶段 | 现象 |
|------|------|
| FSBL 初始化 | 红灯（PG.10）闪烁 3 次 |
| 跳转 Appli | 绿灯（PG.00）和蓝灯（PG.08）交替闪烁 |

### 5.6 External Loader (.stldr)

烧录外部 XSPI Flash 时，CubeProgrammer 需要加载对应的 External Loader 文件：

| 开发板 | Loader 文件 |
|--------|-------------|
| NUCLEO-N657X0-Q | `NUCLEO_N657X0_Q.stldr`（通常在 CubeProgrammer 安装目录下） |

**位置**：通常在 `C:\Program Files\STMicroelectronics\STM32Cube\STM32CubeProgrammer\ExternalLoader\` 下。

> **踩坑**：如果不加载正确的 .stldr 文件，CubeProgrammer 无法识别外部 Flash，烧录时会报错或无法写入。

---

## 六、调试方法

### 6.1 DEV 模式调试（推荐）

1. 设置 BOOT1 = 2-3（DEV 模式）
2. IDE 加载 `FSBL/build/Template_FSBL_LRUN_FSBL.elf` 到 RAM
3. 在 Appli 代码打断点
4. Debug/Run
5. FSBL 运行 → 加载 Appli → 断点生效

### 6.2 Flash 模式

无法源码调试，只能靠 LED / UART / ITM。

---

## 七、项目文件结构

```plain
Template_FSBL_LRUN/
├── CLAUDE.md              # 项目说明文档
├── SKILL.md              # 技能文档
├── README.md              # 官方说明
├── Template_FSBL_LRUN.ioc # CubeMX 配置文件
│
├── FSBL/                  # FSBL 子项目
│   ├── Src/
│   │   ├── main.c         # FSBL 主程序
│   │   ├── extmem.c       # 外部存储初始化
│   ├── Inc/
│   │   ├── main.h
│   │   └── extmem.h
│   ├── mx-generated.cmake # 编译宏定义
│   ├── CMakeLists.txt
│   └── STM32N657XX_LRUN.ld
│
├── Appli/                 # Appli 子项目
│   ├── Src/
│   │   ├── main.c # Appli 主程序
│   ├── Inc/
│   │   ├── main.h
│   │   └── stm32n6xx_nucleo_conf.h
│   ├── mx-generated.cmake
│   ├── CMakeLists.txt
│   └── STM32N657XX_LRUN.ld
│
├── Drivers/               # HAL 驱动（项目内）
├── Secure_nsclib/          # 安全非安全调用库
├── gcc-arm-none-eabi.cmake # 工具链配置
└── mx-generated.cmake       # 主 CMake 配置
```

---

## 八、参考文献

### ST 官方社区帖子

- [How to create an STM32N6 FSBL Load and Run](https://community.st.com/t5/stm32-mcus/how-to-create-an-stm32n6-fsbl-load-and-run/ta-p/768206)
- [Nucleo-N657X0-Q unable to upload code](https://community.st.com/t5/stm32cubeide-mcus/nucleo-n657x0-q-unable-to-upload-code/m-p/876582)
- [Debugging program in external flash XIP mode STM32N6](https://community.st.com/t5/stm32cubeide-mcus/debugging-program-in-external-flash-xip-mode-stm32n6/m-p/794285)
- [How to debug STM32N6 using STM32CubeIDE](https://community.st.com/t5/stm32-mcus/how-to-debug-stm32n6-using-stm32cubeide/tac-p/898644)
- [How to execute code from external serial NOR](https://community.st.com/t5/stm32-mcus/how-to-execute-code-from-the-external-serial-nor-using-the/ta-p/771048)
- [How to build an AI application from scratch on the Nucleo-N657X0](https://community.st.com/t5/stm32-mcus/how-to-build-an-ai-application-from-scratch-on-the-nucleo-n657x0/ta-p/828502)
- [STM32N6570-DK LRUN project does not boot](https://community.st.com/t5/stm32-mcus-embedded-software/stm32n6570-dk-lrun-project-does-not-boot/m-p/874078)
- [How to build an AI application from scratch on the STM32N6570-DK](https://community.st.com/t5/stm32-mcus/how-to-build-an-ai-application-from-scratch-on-the-stm32n6570-dk/ta-p/825591)

### ST 官方 PDF

- rm0486 — STM32N657xx ARM-based 32-bit MCUs
- um3234 — How to proceed with Boot ROM on STM32N6 MCUs
- an6265 — Getting started with STM32N6 MCUs in STM32CubeIDE
- an5967 — Getting started with hardware development for STM32N6 MCUs
- um3249 — Getting started with STM32CubeN6 for STM32N6 series
- pm0273 — STM32 Cortex-M55 MCUs Programming Manual
- Nucleo-N657X0-Q 原理图 (en.mb1940-n657x0q-c02-schematic)
- um3417 — STM32N6 Nucleo144 board MB1940

---

## 九、常见问题速查

| 现象 | 可能原因 | 解决方法 |
|------|----------|----------|
| 烧录报错"内核被锁定" | Option Bytes 锁定 | 按住 Reset 再烧录，或 Mass Erase |
| 烧录报错"写入保护" | 读保护 RDP 开启 | 使用 Mass Erase 擦除 |
| Flash 模式不运行 | 没有 `-align` 签名 | 重新签名，加 `-align` |
| Flash 模式不运行 | OTP 未配置 | 第一次禁用 NO_OTP_FUSE，让 FSBL 配置 OTP |
| 芯片无响应 | 调试器断开 | 按 Reset，重新连接 |
| 调试时断点不生效 | 用了 Flash 模式 | 切回 DEV 模式，BOOT1=2-3 |
| 编译后无 .bin 文件 | CMakeLists.txt 缺少 post-build | 添加 objcopy 命令 |
| 签名报"binary not found" | PowerShell 引号问题 | 用 `& "..."` 或在 CMD 里运行 |