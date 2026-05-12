---
name: SEO 上线配置
description: 博客 SEO 配置已完成上线，包含域名、Search Console、sitemap
type: project
---

博客 SEO 基础配置已完成：
- 域名: https://729dhs.site
- Google Search Console: 已通过 HTML meta 标签验证所有权
- Sitemap: `@astrojs/sitemap` v3 生成 `sitemap-index.xml`（不是 `sitemap.xml`），已提交至 Google
- robots.txt: 由 `astro-robots-txt` 自动生成

注意：sitemap 在每次 `pnpm build` 时自动更新，无需手动维护。新增文章后重新部署即可自动收录。

**Why:** 让博客能被搜索引擎收录，这是第一次配置上线。
**How to apply:** 以后处理新建博客相关功能或域名变更时，提醒用户 Search Console 和 sitemap 需要同步更新。
