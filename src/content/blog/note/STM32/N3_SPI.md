---
title: STM32 SPI 笔记
link: stm32-spi-note
date: 2026-03-25 15:00:00
description: STM32 SPI 通信基础与实践笔记。
tags:
  - STM32
  - SPI
  - 嵌入式
categories:
  - [笔记, STM32]
---

# STM32 SPI 笔记

## SPI 简介

SPI（Serial Peripheral Interface）是一种**同步串行通信接口**，由摩托罗拉公司提出。

### 特点
- 全双工通信
- 主从模式（Master/Slave）
- 同步时钟（SCK）
- 高速传输（可达数十 Mbps）

### 信号线
| 信号 | 全称 | 说明 |
|------|------|------|
| SCK | Serial Clock | 时钟信号，由主机产生 |
| MOSI | Master Out Slave In | 主机输出/从机输入 |
| MISO | Master In Slave Out | 主机输入/从机输出 |
| NSS/CS | Chip Select | 片选信号，低电平有效 |

## 2. STM32 SPI 工作模式

## SPI 工作模式

| 模式 | CPOL | CPHA | 采样边沿 |
|------|------|------|----------|
| 0 | 0 | 0 | 第一个上升沿 |
| 1 | 0 | 1 | 第一个下降沿 |
| 2 | 1 | 0 | 第二个上升沿 |
| 3 | 1 | 1 | 第二个下降沿 |

- **CPOL**：时钟极性（空闲时电平）
- **CPHA**：时钟相位（采样时刻）



## HAL 库配置示例

### 初始化代码

```c
// SPI 句柄定义
SPI_HandleTypeDef hspi1;

// SPI 初始化配置
void MX_SPI1_Init(void)
{
    hspi1.Instance = SPI1;
    hspi1.Init.Mode = SPI_MODE_MASTER;
    hspi1.Init.Direction = SPI_DIRECTION_2LINES;
    hspi1.Init.DataSize = SPI_DATASIZE_8BIT;
    hspi1.Init.CLKPolarity = SPI_POLARITY_LOW;
    hspi1.Init.CLKPhase = SPI_PHASE_1EDGE;
    hspi1.Init.NSS = SPI_NSS_SOFT;
    hspi1.Init.BaudRatePrescaler = SPI_BAUDRATEPRESCALER_16;
    hspi1.Init.FirstBit = SPI_FIRSTBIT_MSB;
    hspi1.Init.TIMode = SPI_TIMODE_DISABLE;
    hspi1.Init.CRCCalculation = SPI_CRCCALCULATION_DISABLE;
    hspi1.Init.CRCPolynomial = 10;
    
    if (HAL_SPI_Init(&hspi1) != HAL_OK)
    {
        // 初始化错误处理
        Error_Handler();
    }
}
```

### 数据收发函数

```c
// 单字节发送
HAL_SPI_Transmit(&hspi1, &txData, 1, HAL_MAX_DELAY);

// 单字节接收
HAL_SPI_Receive(&hspi1, &rxData, 1, HAL_MAX_DELAY);

// 全双工收发
HAL_SPI_TransmitReceive(&hspi1, txBuffer, rxBuffer, size, HAL_MAX_DELAY);

// 中断方式发送
HAL_SPI_Transmit_IT(&hspi1, txBuffer, size);

// DMA 方式发送
HAL_SPI_Transmit_DMA(&hspi1, txBuffer, size);
```


## 常见问题

| 问题 | 可能原因 | 解决方案 |
|------|----------|----------|
| 通信无数据 | 片选未拉低 | 检查 `NSS` 引脚配置 |
| 数据错位 | 时钟模式不匹配 | 确认主从 `CPOL/CPHA` 一致 |
| 速率过低 | 分频系数过大 | 调整 `BaudRatePrescaler` |
| 接收数据固定 | 未先发送时钟 | SPI 需先发数据产生时钟 |


// TODO :

- [ ] 补充示波器波形图
- [ ] 添加实际项目应用场景
- [ ] 记录调试过程中遇到的问题及解决方案

