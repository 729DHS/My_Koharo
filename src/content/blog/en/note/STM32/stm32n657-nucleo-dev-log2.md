---
title: "STM32N657X0H3Q Nucleo VSCode Debug Configuration Guide"
link: stm32n657-nucleo-dev-log2
date: 2026-06-08 11:39:51
description: "STM32N657X0H3Q Nucleo development board VSCode debug configuration guide, resolving LRUN mode debugging issues, with correct launch.json setup and common pitfalls."
tags:
  - STM32
  - STM32N6
  - Embedded
categories:
  - [笔记, STM32]
---

# STM32N657X0H3Q Nucleo VSCode Debug Configuration Guide

---

## Problem Recap

In the previous article, I covered the complete workflow of compiling, signing, and flashing via STM32 Programmer. In LRUN mode, both FSBL and Application can be flashed independently and run correctly. However, one critical issue remained — **source-level debugging in VSCode was not working**.

When starting a debug session, the program would break at a library function around `RETR=Map Memory`. According to ST Community forum tutorials, this breakpoint should allow single-step debugging as usual — but in practice, the debugger disconnected from the board shortly after hitting the break, and the session terminated.

Initially, I suspected TrustZone security domain configuration — perhaps RIF resource isolation was preventing the debugger from accessing the secure state. After systematic troubleshooting, this possibility was ruled out.

## Root Cause Analysis

A careful inspection of `launch.json` revealed the root cause: **the stldr file configuration was wrong**.

I'm using the **New Clone board (NUCLEO-N657X0-Q)**, but the configuration mistakenly referenced settings for the DK board (STM32N6570-DK). The stldr (External Loader) file acts as the bridge between the debugger and external Flash. An incorrect loader means the debugger can't properly access external memory, causing the connection to fail.

### launch.json Configuration Breakdown

After fixing the stldr configuration, other settings were also adjusted. Here's the complete configuration with field explanations:

```jsonc
{
    "version": "0.2.0",
    "configurations": [
        {
            "type": "stlinkgdbtarget",          // Debugger type: ST-Link GDB target
            "request": "launch",
            "name": "NUCLEO-N657X0-Q Debug (FSBL + Appli)",
            "origin": "snippet",
            "cwd": "${workspaceFolder}",
            "preBuild": "${command:st-stm32-ide-debug-launch.build}",   // Build command
            "runEntry": "BOOT_Application",                             // Entry function name
            // SVD file path (replace the path prefix with your actual STM32CubeProgrammer installation directory)
            "svdPath": "...\\STM32CubeProgrammer\\SVD\\STM32N657.svd",
            "imagesAndSymbols": [
                {
                    // Application image: symbol for source mapping, image for flashing
                    "symbolFileName": "${workspaceFolder}/Appli/build/Template_FSBL_LRUN_Appli.elf",
                    "imageFileName": "${workspaceFolder}/Appli/build/Appli-trusted.elf"
                },
                {
                    // FSBL image: both point to the same ELF (FSBL doesn't need a separate trusted file)
                    "symbolFileName": "${workspaceFolder}/FSBL/build/Template_FSBL_LRUN_FSBL.elf",
                    "imageFileName": "${workspaceFolder}/FSBL/build/Template_FSBL_LRUN_FSBL.elf"
                }
            ],
            "serverExtLoader": [
                {
                    // External Loader: NUCLEO-N657X0-Q stldr file (New Clone board, NOT DK board)
                    "loader": "...\\STM32CubeProgrammer\\bin\\ExternalLoader\\MX25UM51245G_STM32N6570-NUCLEO.stldr",
                    "initialize": false
                }
            ]
        }
    ]
}
```

> **Path Note**: The `...\\STM32CubeProgrammer\\` prefix above represents STM32CubeProgrammer's installation directory. Replace it with your actual path, such as `C:\\Program Files\\STMicroelectronics\\STM32Cube\\STM32CubeProgrammer\\` or your custom directory.

### Key Configuration Fields

| Field | Purpose | Notes |
|-------|---------|-------|
| `runEntry` | Debugger entry function | LRUN mode on NUCLEO-N657X0-Q must be `BOOT_Application` |
| `svdPath` | SVD file path providing peripheral register descriptions | Point to the SVD folder under STM32CubeProgrammer |
| `symbolFileName` | ELF symbol file for source-level debugging | Must match compiled binary path |
| `imageFileName` | Flash image | Appli uses `Appli-trusted.elf` (signed), FSBL uses the compiled `.elf` directly |
| `serverExtLoader` | External Flash loader configuration | **Make sure to select the stldr matching your board** |

## Configuration Insights

### FSBL vs Appli ELF Configuration

There's an important distinction between FSBL and Application image configuration:

- **FSBL**: Both `symbolFileName` and `imageFileName` point to the same `.elf` file, because FSBL uses the compiled ELF directly for both debugging and signing
- **Application**: `symbolFileName` points to the compiled ELF (with debug symbols), while `imageFileName` points to `Appli-trusted.elf` (the signed image)

This is because the Application needs to be signed (with a V2.3 Header) to be recognized by Boot ROM or FSBL, while debugging requires the original unstripped ELF for source-code mapping.

### Signing File Notes

The naming convention for signing artifacts was also somewhat confusing in the original configuration. Key distinction:

- `.elf` — Compiler-generated ELF with debug symbols
- `-trusted.elf` — Image file post-signing, with Header added
- `-trusted.bin` — Pure binary post-signing, with Header added

Application uses `Appli-trusted.elf` as its image file, while FSBL doesn't require a separate trusted version.

## Debug Workflow Summary

With the corrected configuration, the complete VSCode debug workflow is:

1. **Ensure BOOT1 = 2-3** (DEV mode)
2. In VSCode, select the `NUCLEO-N657X0-Q Debug (FSBL + Appli)` configuration
3. Set breakpoints in Application code
4. Press F5 to start debugging
5. FSBL runs automatically → loads Appli into SRAM → jumps to execution → breakpoints hit

## Pitfall Summary

| Symptom | Possible Cause | Solution |
|---------|---------------|----------|
| Debug connection drops immediately | stldr mismatch (DK vs New Clone board) | Check and fix `serverExtLoader` stldr path |
| Breakpoint hits library function then exits | Security domain blocking debugger | Check RIF configuration for debug permissions |
| `Appli-trusted.elf` not found | Signed image not generated post-build | Verify CMake POST_BUILD signing script |
| Can't single-step in debug | Symbol file path incorrect | Confirm `symbolFileName` points to the correct `.elf` file |
