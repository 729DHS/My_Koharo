# 分类配置完整指南

**最后更新时间**：2026-03-27

这是一份关于如何正确配置博客分类系统的详细指南。涵盖分类的定义、文章配置、首页展示，以及常见错误排查。

## 目录

1. [快速开始](#快速开始)
2. [核心概念](#核心概念)
3. [配置步骤](#配置步骤)
4. [案例分析](#案例分析)
5. [规则总结](#规则总结)
6. [常见错误](#常见错误)
7. [检查清单](#检查清单)

---

## 快速开始

### 最简单的三步

```bash
# 1️⃣ 第一步：在 categoryMap 中定义分类映射
# 编辑 config/site.yaml
categoryMap:
  笔记: note
  STM32: stm32     # 中文名 → 小写 slug

# 2️⃣ 第二步：在文章中指定分类
# 编辑 src/content/blog/note/STM32/test.md
categories:
  - [笔记, STM32]  # 分层分类：[父级, 子级]

# 3️⃣ 第三步：重启开发服务器
pnpm dev
```

完了！现在分类就能工作了。

---

## 核心概念

### 四层配置链路

```plain
物理组织   内容指定   系统映射   导航展示
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│文件夹   │ │categories│ categoryMap│featured │
│(/STM32)│→│[笔记,STM32]→│STM32:stm32│Categories│
└────────┘ └────────┘ └────────┘ └────────┘
  (ℹ️可选) (✅必须)  (✅必须)  (可选展示)
```

**哪一层最重要？** ⭐ **categoryMap** 是真理来源，其他两层都要引用它。

### 三个关键概念

| 概念 | 定义 | 用处 | 示例 |
|------|------|------|------|
| **中文分类名** | 你用的真实分类名字 | 在 frontmatter 中写 categories 时使用 | `STM32`、`R`、`RUST` |
| **URL slug** | 小写、URL 友好的标识 | 生成分类链接、在 link 字段中使用 | `stm32`、`r`、`rust` |
| **映射关系** | 连接中文名和 slug | 在 `categoryMap` 中定义 | `STM32: stm32` |

---

## 配置步骤

### 第 1 步：定义所有分类映射（categoryMap）

**位置**：`config/site.yaml`

```yaml
categoryMap:
  # 一级分类（主分类）
  随笔: life
  笔记: note
  工具: tools
  周刊: weekly
  
  # 二级分类（嵌套在笔记下）
  前端: front-end
  STM32: stm32
  R: r
  RUST: rust
  
  # 添加更多分类...
  # 书摘: reading
  # 后端: back-end
```

**关键规则**：
- 左边必须是你**真实使用的中文分类名**
- 右边必须是**小写字母和连字符**的 slug
- 所有分类名都要在这里定义，缺少任何一个会导致分类链接失效

### 第 2 步：在文章 frontmatter 中指定分类

**位置**：各个文章的 `---` frontmatter 块

```markdown
---
title: STM32 开发笔记
link: stm32-keil-rte-rtos
date: 2025-12-28 00:00:00
categories:
  - [笔记, STM32]  # ← 多层分类：[一级, 二级]
  # 或单层：
  # - STM32        # ← 单层分类（对应 categoryMap 中 STM32: stm32）
---
```

**关键规则**：
- 使用 categoryMap 中的**中文名**，不要用 slug
- 分层格式：`[上级, 下级]`，不要写成 `[note, stm32]`
- 一篇文章可以有多个 categories，但通常只用一个

### 第 3 步：(可选) 在首页精选分类中展示

**位置**：`config/site.yaml` 中的 `featuredCategories`

```yaml
featuredCategories:
  # 一级分类示例
  - link: note         # slug（对应 categoryMap 的 笔记: note）
    label: 笔记        # 显示文本（可以是中文，任意）
    image: /img/cover/4.webp
    description: 技术笔记、学习笔记

  # 二级分类示例
  - link: note/stm32   # 二级 slug：上级slug/下级slug（都是小写）
    label: STM32       # 显示文本（可以用大写）
    image: /img/cover/1.webp
    description: STM32 开发相关
```

**关键规则**：
- `link` 必须用 slug（小写），一级一个 `/` 分隔
- `label` 是显示文本，可以用任意大小写
- `image` 路径相对于 `public` 目录
- `description` 是分类描述

### 第 4 步：重启开发服务器

（YAML 配置只在启动时加载）

```bash
pnpm dev
```

---

## 案例分析

### 案例 1：STM32 分类（正确配置）

**需求**：创建 STM32 分类，显示在首页

#### 步骤 1：定义映射

```yaml
# config/site.yaml
categoryMap:
  笔记: note
  STM32: stm32
```

#### 步骤 2：在文章中使用

```markdown
---
# src/content/blog/note/STM32/N2_RTOS.md
title: STM32 Keil RTE 与 RTOS 笔记
categories:
  - [笔记, STM32]  ✅
---
```

#### 步骤 3：首页展示（可选）

```yaml
# config/site.yaml
featuredCategories:
  - link: note/stm32  ✅（对应 categoryMap: STM32: stm32）
    label: STM32
    image: /img/cover/1.webp
    description: STM32 开发相关
```

#### 结果

- 访问 `/categories/note/stm32` → 显示所有 STM32 文章 ✅
- 首页精选分类中显示 STM32 卡片 ✅
- 文章末尾面包屑显示分类导航 ✅

---

### 案例 2：R 语言分类

**需求**：新增 R 语言分类，分层到笔记下

#### 步骤 1：定义映射

```yaml
# config/site.yaml
categoryMap:
  R: r  # ← 新增
```

#### 步骤 2：在文章中使用

```markdown
---
# src/content/blog/note/R/common_function.md
categories:
  - [笔记, R]  # ← 使用中文名
---
```

#### 步骤 3：首页展示

```yaml
# config/site.yaml
featuredCategories:
  - link: note/r  # ← 对应 R: r
    label: R
    image: /img/cover/5.webp
    description: R 语言相关
```

---

### 案例 3：错误的配置（反面教材）

#### ❌ 错误 1：categoryMap 中缺少映射

```yaml
# config/site.yaml - categoryMap
# 缺少 R 的映射！

# 文章中写：
categories:
  - [笔记, R]  # R 没有在 categoryMap 中定义

# 结果：
# - 分类链接生成失败
# - 首页点击这个分类会显示所有「笔记」，不是只显示 R
```

**修复**：在 categoryMap 中添加 `R: r`

#### ❌ 错误 2：categories 中用了 slug 而不是中文名

```markdown
---
categories:
  - [note, r]  # ❌ 不能用 slug！必须是中文名
---
```

**修复**：改成 `- [笔记, R]`

#### ❌ 错误 3：featuredCategories 中的 link 用了大写

```yaml
featuredCategories:
  - link: note/R  # ❌ 大写！应该是小写 slug
```

**修复**：改成 `link: note/r`（小写）

#### ❌ 错误 4：混淆了文件夹名和分类名

```plain
文件结构：src/content/blog/note/Python/test.md
文章中写：categories: [笔记, Python]  ✅ 正确

但如果 Python 没在 categoryMap 中：
categoryMap:
  # Python 没有定义！

结果：分类链接破损
```

**修复**：在 categoryMap 中添加 `Python: python`

---

## 规则总结

### ✅ 必做

| 项目 | 形式 | 例子 |
|------|------|------|
| **categoryMap 左边** | 中文分类名 | `STM32`、`R`、`RUST` |
| **categoryMap 右边** | 小写 slug | `stm32`、`r`、`rust` |
| **文章 categories** | 中文名 | `[笔记, STM32]` |
| **featuredCategories link** | 小写 slug | `note/stm32` |
| **文件夹结构** | 任意（仅物理组织） | `note/STM32/` 或 `note/R/` |

### 🚫 禁止

- ❌ 在 categories 中用 slug：`[note, stm32]`
- ❌ 在 categoryMap 中用大写 slug：`STM32: STM32`
- ❌ 在 featuredCategories link 中用中文：`link: 笔记/STM32`
- ❌ 漏掉任何 categoryMap 映射
- ❌ 在分层分类中只写一级：`[STM32]` （应该 `[笔记, STM32]`）

### 🎯 单层 vs 分层

**单层分类**（一级）：
```yaml
# categoryMap
主分类: slug

# 文章中
categories:
  - 主分类

# 链接
link: slug
```

**分层分类**（二级）：
```yaml
# categoryMap
一级: slug1
二级: slug2

# 文章中
categories:
  - [一级, 二级]

# 链接
link: slug1/slug2
```

---

## 常见错误

### 错误 1：首页精选分类点击后显示所有笔记

**症状**：点击 R 分类，看到的是所有笔记文章，而不仅仅是 R 文章

**原因**：R 没有在 categoryMap 中定义

**诊断步骤**：
```plain
1. 打开 config/site.yaml
2. 搜索 categoryMap
3. 查看是否有 "R: r" 的映射
4. 如果没有，添加它
```

**修复**：
```yaml
categoryMap:
  R: r  # ← 添加这一行
```

---

### 错误 2：分类链接返回 404

**症状**：点击分类后页面 404 或显示空白

**原因**：
- 文章的 categories 名字不在 categoryMap 中
- 或者 categoryMap 中拼写错误

**修复**：
```plain
1. 查看文章的 categories: [笔记, XXX]
2. 确认 XXX 在 categoryMap 中有对应的映射
3. 中文拼写必须完全一致
```

---

### 错误 3：重启后配置还是没生效

**原因**：YAML 配置在服务器启动时读取，修改后需要完全重启

**修复**：
```bash
# 方式 1：完全关闭后重启
Ctrl+C  # 停止当前服务器
pnpm dev  # 重新启动

# 方式 2：使用 --force 标志（如果支持）
pnpm build  # 生产构建会强制重新读取配置
```

---

### 错误 4：文件夹名和分类名不一致

**例子**：
```plain
文件夹：src/content/blog/note/Python/
文章中：categories: [笔记, Java]  ❌ 不匹配
```

**影响**：**没有影响**。文件夹只是物理组织，分类由 frontmatter 决定

**最佳实践**：保持一致便于维护
```plain
文件夹：src/content/blog/note/Python/
文章中：categories: [笔记, Python]  ✅
```

---

## 检查清单

添加新分类时，用这个清单确保配置正确：

### 配置新分类前

- [ ] 确认分类名称（中文）
- [ ] 设计分类 slug（小写）
- [ ] 确定是一级还是多级
- [ ] 如果是多级，确认父级已存在

### 定义映射

- [ ] 在 `config/site.yaml` 的 `categoryMap` 中添加映射
- [ ] 格式：`分类名: slug`（冒号后有空格）
- [ ] 中文拼写和大小写要准确

### 配置文章

- [ ] 编辑文章的 frontmatter
- [ ] 在 `categories` 中使用**中文名**
- [ ] 分层格式：`- [一级, 二级]`
- [ ] 与 categoryMap 中的中文名完全一致

### 配置首页（可选）

- [ ] 在 `config/site.yaml` 的 `featuredCategories` 中添加
- [ ] `link` 使用**小写 slug**
- [ ] 多级分类用 `/` 连接：`一级/二级`
- [ ] `label` 可以随意，通常和中文名相同
- [ ] 提供有效的图片路径

### 验证

- [ ] 执行 `pnpm dev` 重启服务器
- [ ] 访问首页，确认分类卡片出现
- [ ] 点击分类链接，确认只显示该分类的文章
- [ ] 查看文章详情页，面包屑导航显示正确分类

---

## 实用技巧

### 技巧 1：快速统计所有分类

查看当前所有文章使用了哪些分类：

```bash
# 在项目根目录执行
grep -r "categories:" src/content/blog --include="*.md" | \
  sed 's/.*- \[\?//;s/\].*//' | \
  sort | uniq
```

对比 categoryMap 中的映射，找出缺失的映射。

### 技巧 2：批量更新分类名

如果想将某个分类名改为另一个名字（比如 `前端` → `Frontend`）：

首先在 categoryMap 中调整映射（slug 保持不变）：
```yaml
categoryMap:
  Frontend: front-end  # 中文名改了，slug 保持
```

然后全局替换文章中的分类名：
```bash
find src/content/blog -name "*.md" -exec sed -i 's/前端/Frontend/g' {} \;
```

### 技巧 3：分类归档页面

如果需要新建一个专属的分类页面，而不是用默认的 `/categories/...` 路由：

```yaml
# 在 config/site.yaml 的 featuredSeries 中定义
featuredSeries:
  - slug: react-hub      # URL: /react-hub
    categoryName: 前端   # 只显示前端分类的文章
    label: React 学习中心
    description: React 相关的学习笔记与最佳实践
    enabled: true
```

---

## FAQ

**Q：一篇文章可以属于多个分类吗？**

A：可以。在 frontmatter 中添加多个 categories：
```markdown
categories:
  - [笔记, 前端]
  - [笔记, React]
```
但建议保持简洁，通常只用一个分类。

---

**Q：可以有三级或更多层级的分类吗？**

A：理论上可以，但系统目前对多于两层的支持不完整。建议：
- 一级分类：`笔记`、`工具` 等
- 二级分类：`STM32`、`R`、`前端` 等
- 如果需要更细分，用 `tags` 代替

---

**Q：分类 slug 有什么限制吗？**

A：
- 必须小写
- 建议用字母和连字符（`-`）
- 避免特殊字符和空格
- 避免与保留路由冲突：`api`, `_astro`, `rss.xml` 等

---

**Q：修改 categoryMap 后，旧链接会失效吗？**

A：会的。所以建议：
1. 定好分类 slug 后尽量不改
2. 如果非要改，用 HTTP 重定向维护向后兼容

---

**Q：如何隐藏某个分类（不在首页展示但保留文章）？**

A：
```yaml
categoryMap:
  隐藏分类: hidden  # 保持映射定义

# 不在 featuredCategories 中添加它
# 分类链接 /categories/hidden 仍然可访问
```

---

## 总结

分类系统的核心就是四个地方的一致性：

| 位置 | 内容 | 类型 |
|------|------|------|
| **categoryMap** | 映射定义 | 中文 ↔ slug |
| **categories** | 文章分类 | 中文名 |
| **link** | 导航链接 | slug |
| **文件夹** | 物理位置 | 可选，无影响 |

**黄金规则**：
1. 先在 categoryMap 定义好所有分类
2. 文章中用中文名
3. 链接中用小写 slug
4. 重启开发服务器

就这样！简单、清晰、不易出错。

---

**需要帮助？**

- 遇到分类显示问题？检查 categoryMap 中是否有完整映射
- 文章分类链接破损？确认 categories 中的名字与 categoryMap 一致
- 首页精选分类不显示？检查 featuredCategories 中的 link 是否用了小写 slug
