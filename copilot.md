# 新手也能用的文章关系网说明（astro-koharu）

更新时间：2026-04-02
适用范围：本仓库根目录站点（非 cms 子项目）

---

## 0. 先看结论（一句话版）

一篇文章是否正常，核心看这 6 个东西：

1. 文件放在哪里（文件夹路径）
2. 标题写什么（title）
3. 页面网址用什么（link）
4. 文章分到哪类（categories）
5. 打了哪些标签（tags）
6. 分类映射是否在配置里存在（config/site.yaml 的 categoryMap）

记住：
- 标签不需要提前注册。
- 分类必须提前在 categoryMap 里有映射。
- link 建议全小写 + 短横线，且全站唯一。

---

## 1. 6 个概念到底是什么关系

## 1.1 文件夹路径（物理位置）

示例：
- src/content/blog/note/STM32/J1.md

作用：
- 主要是你自己管理文件方便。
- 当你没有写 link 时，系统会用“文件路径推导 slug”来生成文章 URL。

不作用于：
- 分类归属（分类看 frontmatter 的 categories，不看文件夹名）。
- 标签归属（标签看 frontmatter 的 tags）。

## 1.2 title（文章标题）

示例：
- title: 嘉立创筑基派点灯 DEMO

作用：
- 页面显示标题、SEO 标题的一部分。

不作用于：
- URL。
- 分类。
- 标签。

## 1.3 link（文章 URL slug）

示例：
- link: jlc-blink-demo-1

作用：
- 直接决定文章地址后半段。
- 最终文章地址是 /post/<link>。

关键规则：
- 建议只用小写英文字母、数字、短横线。
- 不要大写，不要空格，不要中文。
- 必须全站唯一（重复会造成路由冲突风险）。
- 发布后尽量不要改（改了旧链接会失效）。

未填写 link 时：
- 系统会回退到文件路径推导的 slug。

## 1.4 网站文章网址（最终 URL）

默认语言（zh）示例：
- /post/jlc-blink-demo-1

非默认语言（如 en）示例：
- /en/post/jlc-blink-demo-1

谁决定它：
- 文章页路由模板 + link（优先）或文件路径推导 slug（兜底）。

## 1.5 categories（分类）

示例（推荐二级分类）：
- categories:
  - [笔记, STM32]

作用：
- 文章归类、分类页聚合、面包屑分类导航。

关键规则：
- 这里写的是“分类中文名”，不是 slug。
- 分类名必须能在 config/site.yaml 的 categoryMap 中找到。
- 不在 categoryMap 的分类，会导致分类链接异常或聚合不正确。

## 1.6 tags（标签）

示例：
- tags:
  - STM32
  - GPIO
  - 嵌入式

作用：
- 标签页聚合、标签检索。

关键规则：
- tag 不需要在任何配置预注册。
- 系统会自动收集所有文章 tag 并生成标签页。
- 系统按小写做匹配；建议你自己保持命名一致，避免同义分裂。

---

## 2. 真正的“控制台”在哪些文件

1. 文章内容与 frontmatter：
- src/content/blog/**/*.md

2. 分类映射（必须）：
- config/site.yaml
- 关键字段：categoryMap

3. 文章 URL 生成逻辑：
- src/lib/content/locale.ts
- 关键函数：getPostSlug（优先 link）

4. 文章详情路由：
- src/pages/post/[...slug].astro

5. 分类页路由：
- src/pages/categories/[...slug].astro

6. 标签页路由：
- src/pages/tags/[tag].astro

7. 标签规范化逻辑：
- src/lib/content/tags.ts

---

## 3. 新建文章时，标准流程（照做就行）

## 第 1 步：新建 md 文件

你可以放在任何你顺手的目录下，例如：
- src/content/blog/note/STM32/xxx.md

建议：
- 文件名用于管理，不用于展示。
- 别用奇怪空格和超长文件名。

## 第 2 步：写 frontmatter（最小可用）

直接套这个：

```yaml
---
title: 这里写标题
link: 这里写全小写slug
date: 2026-04-02 12:00:00
description: 一句话摘要
tags:
  - 标签A
  - 标签B
categories:
  - [笔记, 你的分类名]
---
```

## 第 3 步：检查分类是否已映射

去 config/site.yaml 找 categoryMap。

如果你用了 categories:
- [笔记, 新分类]

那 categoryMap 至少要有：
- 笔记: note
- 新分类: xxxxx

右侧 slug 规则：
- 小写英文/数字/短横线。

## 第 4 步：新标签不用额外配置

tags 直接写就行，不用改 site.yaml。

## 第 5 步：本地验证

运行：
- pnpm dev

检查：
- 文章页是否能打开。
- 分类页是否只显示该分类文章。
- 标签页是否出现新标签。

## 第 6 步：若改了 config/site.yaml，重启 dev

YAML 配置变更后，建议重启开发服务再看结果。

---

## 4. 你问的三个“新增”场景，分别怎么做

## 4.1 新文件夹（最简单）

场景：你想新建目录 src/content/blog/note/MCU/。

你要做：
1. 建目录、放文章。
2. frontmatter 正常写。

你不用做：
- 不需要因为新文件夹去改 categoryMap。

提醒：
- 文件夹名不会自动变成分类名。

## 4.2 新分类（必须多做一步）

场景：文章里要写 categories:
- [笔记, ESP32]

你必须做：
1. 在 config/site.yaml 的 categoryMap 新增：
   - ESP32: esp32
2. 文章里 categories 用中文名 ESP32，不是 esp32。

可选：
1. 想在首页卡片展示，再去 featuredCategories 加：
   - link: note/esp32
   - label: ESP32

## 4.3 新 tag（最省事）

场景：你想加 tags: [筑基派]

你要做：
1. 直接写到文章 tags 里。

你不用做：
- 不用改 categoryMap。
- 不用改任何标签配置文件。

建议：
- 统一写法，避免“STM32/stm32/Stm32”三种混用。

---

## 5. 最容易踩坑的 10 个错误（含修复）

1. 错误：categories 写 slug（如 note、stm32）
- 修复：categories 必须写中文名（如 笔记、STM32）。

2. 错误：新增分类但没加 categoryMap 映射
- 修复：在 config/site.yaml 增加 分类名: slug。

3. 错误：link 用了大写或空格
- 修复：改为全小写短横线风格。

4. 错误：两个文章用了同一个 link
- 修复：保证 link 全站唯一。

5. 错误：把文件夹名当分类名
- 修复：分类只看 frontmatter 的 categories。

6. 错误：改了 site.yaml 不重启 dev
- 修复：重启开发服务后再验证。

7. 错误：标签大小写乱写导致看起来像重复
- 修复：统一团队写法（建议全大写缩写或首字母风格固定）。

8. 错误：发布后频繁改 link
- 修复：发布前定好 slug，发布后尽量不改。

9. 错误：description 空着导致列表摘要质量差
- 修复：建议每篇写一句清晰摘要。

10. 错误：标题和 H1 完全不一致，维护时混乱
- 修复：保持 title 与正文 H1 语义一致。

---

## 6. 一份可复制的“新文章模板”

```markdown
---
title: STM32 定时器点灯实验
link: stm32-timer-blink-demo
date: 2026-04-02 20:00:00
description: 使用 TIM 中断实现 LED 周期闪烁的最小示例。
tags:
  - STM32
  - TIM
  - 嵌入式
categories:
  - [笔记, STM32]
---

# STM32 定时器点灯实验

正文从这里开始。
```

---

## 7. 排错顺序（3 分钟版）

1. 先看文章 frontmatter 有没有拼写错误。
2. 再看 categories 里的中文名是否都在 categoryMap 存在。
3. 再看 link 是否小写且唯一。
4. 再重启 pnpm dev。
5. 再分别打开文章页、分类页、标签页确认。

---

## 8. 速查表（记不住就看这里）

- 想改文章网址：改 link。
- 想改文章显示标题：改 title。
- 想让文章进某分类：改 categories，并确保 categoryMap 有映射。
- 想新增标签：直接改 tags。
- 想按主题整理文件：改文件夹路径（仅影响管理，不直接决定分类）。

---

## 9. 给未来自己的维护建议

1. 先定分类体系，再批量写文章，别边写边改 categoryMap。
2. 每篇文章都写 link，避免后续因移动文件夹导致兜底 slug 改变。
3. 建立标签命名白名单（例如 STM32、FreeRTOS、GPIO），保持统一。
4. 改 site.yaml 后立刻重启开发服务做一次点击检查。

如果你是第一次接手这个仓库，严格按本文件第 3 节流程走，基本不会翻车。
