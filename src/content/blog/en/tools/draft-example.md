---
title: This Is a Draft
link: draft-example
catalog: true
date: 2024-01-06 00:00:00
description: This is a draft example, only visible in development environment.
tags:
  - Draft
  - Example
categories:
  - 工具
draft: true
---

This is a draft article!

## Draft Feature 说明

Setting `draft: true` marks an article as a draft:

```yaml
---
title: My Draft
draft: true
---
```

## Draft Behavior

### Development Environment (`pnpm dev`)

- ✅ Draft is visible
- ✅ Article card shows "DRAFT" badge in the upper right corner
- ✅ Can normally preview and debug

### Production Build (`pnpm build`)

- ❌ Draft is automatically filtered
- ❌ Won't appear in any article list
- ❌ Won't be indexed by search

## Use Cases

- Long articles in progress
- Content that needs repeated revisions
- Articles temporarily not wanted to be published
- Testing and debugging purposes

## Tip

If you can see this article, you are in the development environment.

When publishing, remember to change `draft: true` to `draft: false` or delete the field entirely.