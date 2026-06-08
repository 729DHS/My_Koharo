---
title: "STM32N657X0H3Q Nucleo VSCode 调试配置记录"
link: stm32n657-nucleo-dev-log2
date: 2026-06-08 11:39:51
description: "STM32N657X0H3Q Nucleo 开发板 VSCode 调试配置记录，解决 LRUN 模式下无法调试的问题，包含 launch.json 正确配置方案及常见踩坑总结。"
tags:
  - STM32
  - STM32N6
  - 嵌入式
categories:
  - [笔记, STM32]
---

# STM32N657X0H3Q Nucleo VSCode 调试配置记录

---

## 问题回顾

在前一篇文章中，我已经完成了程序的编译、签名以及使用 STM32 Programmer 下载的完整流程。LRUN 模式下可以分别单独下载 FSBL 和 Application，且均能正常运行。但有一个关键问题未能解决——**无法在 VSCode 中进行源码级调试**。

调试时，程序自动断点停在一个库函数内部，位置在 `RETR=Map Memory` 附近。按照 ST 社区论坛的教程，此处应该能够正常停在断点处并进入单步调试模式。但实际情况并非如此：断点命中后不久，调试器便与板子断开连接，调试会话自动退出。

起初怀疑是安全域（TrustZone）配置导致的问题——是否因为 RIF 资源隔离配置不当，导致调试器无法在安全状态下进行调试？但后来逐步排查后排除了这个可能性。

## 根因分析

仔细检查 `launch.json` 后发现，**stldr 文件配置错误**是导致无法调试的根本原因。

当前使用的是 **New Clone 板（NUCLEO-N657X0-Q）**，但配置文件中误写为 DK 开发板（STM32N6570-DK）的对应设置。stldr（External Loader）文件是调试器与外部 Flash 通信的桥梁，加载器不匹配时调试器无法正确访问外部存储，导致连接失败。

### launch.json 配置详解

修正 stldr 配置后，又对整体配置进行了调整。以下是最终的完整配置及各字段说明：

```jsonc
{
    "version": "0.2.0",
    "configurations": [
        {
            "type": "stlinkgdbtarget",          // 调试器类型：ST-Link GDB 目标
            "request": "launch",
            "name": "NUCLEO-N657X0-Q Debug (FSBL + Appli)",
            "origin": "snippet",
            "cwd": "${workspaceFolder}",
            "preBuild": "${command:st-stm32-ide-debug-launch.build}",   // 编译命令
            "runEntry": "BOOT_Application",                             // 入口函数名
            // SVD 文件路径（请将路径前缀替换为 STM32CubeProgrammer 实际安装目录）
            "svdPath": "...\\STM32CubeProgrammer\\SVD\\STM32N657.svd",
            "imagesAndSymbols": [
                {
                    // Application 镜像：symbol 用于源码映射，image 用于烧录
                    "symbolFileName": "${workspaceFolder}/Appli/build/Template_FSBL_LRUN_Appli.elf",
                    "imageFileName": "${workspaceFolder}/Appli/build/Appli-trusted.elf"
                },
                {
                    // FSBL 镜像：两者都指向同一 ELF（FSBL 无需 separate trusted 文件）
                    "symbolFileName": "${workspaceFolder}/FSBL/build/Template_FSBL_LRUN_FSBL.elf",
                    "imageFileName": "${workspaceFolder}/FSBL/build/Template_FSBL_LRUN_FSBL.elf"
                }
            ],
            "serverExtLoader": [
                {
                    // External Loader：NUCLEO-N657X0-Q 对应的 stldr 文件（New Clone 板，非 DK 板）
                    "loader": "...\\STM32CubeProgrammer\\bin\\ExternalLoader\\MX25UM51245G_STM32N6570-NUCLEO.stldr",
                    "initialize": false
                }
            ]
        }
    ]
}
```

> **路径说明**：上文中 `...\\STM32CubeProgrammer\\` 表示 STM32CubeProgrammer 的安装目录，请替换为你电脑上的实际路径，例如 `C:\\Program Files\\STMicroelectronics\\STM32Cube\\STM32CubeProgrammer\\` 或自行指定的目录。

### 关键配置项说明

| 配置项 | 作用 | 注意事项 |
|--------|------|----------|
| `runEntry` | 指定调试器入口函数 | NUCLEO-N657X0-Q 的 LRUN 模式需设为 `BOOT_Application` |
| `svdPath` | SVD 文件路径，提供外设寄存器描述 | 路径指向 STM32CubeProgrammer 安装目录下的 SVD 文件夹 |
| `symbolFileName` | ELF 符号文件，用于源码级调试 | 需与编译产物路径一致 |
| `imageFileName` | 烧录镜像文件 | Appli 用 `Appli-trusted.elf`（已签名），FSBL 直接用编译生成的 `.elf` |
| `serverExtLoader` | 外部 Flash 加载器配置 | **务必选择与板子匹配的 stldr 文件** |

## 配置要点与经验

### FSBL 与 Appli 的 ELF 配置差异

FSBL 和 Application 的镜像配置有一个值得注意的区别：

- **FSBL**：`symbolFileName` 和 `imageFileName` 都指向同一个 `.elf` 文件，因为 FSBL 直接使用编译生成的 ELF 进行签名和调试
- **Application**：`symbolFileName` 指向编译生成的 ELF（含调试符号），而 `imageFileName` 指向 `Appli-trusted.elf`（签名后的镜像）

这是因为 Application 需要经过签名（添加 V2.3 Header）才能被 Boot ROM 或 FSBL 识别，而调试时需要的是符号未剥离的原始 ELF 文件来映射源码位置。

### 签名相关注意事项

之前的配置中，签名生成的文件名也有一些混乱。关键在于区分：

- `.elf` — 编译器直接生成的 ELF 文件，含调试符号
- `-trusted.elf` — 经签名工具处理后添加了 Header 的镜像文件
- `-trusted.bin` — 经签名工具处理后添加了 Header 的纯二进制文件

Application 使用 `Appli-trusted.elf` 作为镜像文件，而 FSBL 不需要单独生成 trusted 版本。

## 调试流程总结

修正配置后，完整的 VSCode 调试流程如下：

1. **确保 BOOT1 = 2-3**（DEV 模式）
2. 在 VSCode 中选择 `NUCLEO-N657X0-Q Debug (FSBL + Appli)` 配置
3. 在 Application 代码中设置断点
4. 按 F5 启动调试
5. FSBL 自动运行 → 加载 Appli 到 SRAM → 跳转执行 → 断点命中

## 踩坑总结

| 现象 | 可能原因 | 解决方法 |
|------|----------|----------|
| 调试连接后立即断开 | stldr 文件不匹配（DK 板 vs New Clone 板） | 检查并修正 `serverExtLoader` 中的 stldr 路径 |
| 断点停在库函数中后退出 | 安全域配置导致调试器被阻断 | 检查 RIF 配置中调试相关权限 |
| `Appli-trusted.elf` 找不到 | 编译后未正确生成签名镜像 | 检查 CMake POST_BUILD 签名脚本 |
| 调试时无法单步 | 符号文件路径不正确 | 确认 `symbolFileName` 指向正确的 `.elf` 文件 |
