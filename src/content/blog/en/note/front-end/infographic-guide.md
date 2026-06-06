---
title: Infographic Guide
link: infographic-guide
draft: true
date: 2026-01-03 12:00:00
description: A detailed guide on how to create beautiful infographics in Markdown using @antv/infographic, with practical examples for various templates.
tags:
  - Infographic
  - Visualization
  - Markdown
categories:
  - [笔记, 前端]
---

This article provides a detailed guide on how to use [@antv/infographic](https://infographic.antv.vision/) to create various beautiful infographics directly in Markdown code blocks.

## What is Infographic

Infographic is a visual representation of data, information, and knowledge. Compared to traditional text descriptions, infographics can convey information more intuitively and attractively.

In this blog, you can use the `infographic` directive directly in Markdown code blocks to create various types of infographics, supporting:

- List displays
- Process explanations
- Data comparisons
- Hierarchical structures
- Statistical charts
- Quadrant analysis
- Relationship diagrams

## Basic Syntax

Use the `infographic` directive in a code block, specifying the template name on the first line, then defining data in a YAML-like syntax:

````markdown
```infographic
infographic <template-name>
data
  title Title
  desc Description
  items
    - label Item Name
      desc Item description
      icon mdi/icon-name
```
````

## List Templates (list-*)

Suitable for displaying information lists, feature lists, tech stacks, etc.

### Grid Badge Card Layout

Use the `list-grid-badge-card` template to display card-style lists:

```infographic
infographic list-grid-badge-card
data
  title Frontend Tech Stack
  desc Modern frontend development commonly used technologies
  items
    - label TypeScript
      desc Type-safe JavaScript superset
      icon mdi/language-typescript
    - label React
      desc JavaScript library for building user interfaces
      icon mdi/react
    - label Astro
      desc Modern static site generator
      icon mdi/rocket-launch
    - label Tailwind CSS
      desc Utility-first CSS framework
      icon mdi/tailwind
    - label Vite
      desc Next-generation frontend build tool
      icon mdi/lightning-bolt
    - label Biome
      desc All-in-one web toolchain
      icon mdi/cog
```

### Candy Style Cards

Use `list-grid-candy-card-lite` for a more interesting card style:

```infographic
infographic list-grid-candy-card-lite
data
  title Blog Features
  items
    - label Dark Mode
      desc Elegant theme switching
      icon mdi/theme-light-dark
    - label Full-text Search
      desc Backend-free search based on Pagefind
      icon mdi/magnify
    - label Markdown Enhancement
      desc Supports GFM, Mermaid, Infographic
      icon mdi/markdown
    - label Smart Recommendations
      desc Article recommendations based on semantic similarity
      icon mdi/brain
```

### Horizontal Arrow List

Use `list-row-horizontal-icon-arrow` to display a linear list:

```infographic
infographic list-row-horizontal-icon-arrow
data
  title Development Process
  items
    - label Requirements Analysis
      icon mdi/clipboard-text
    - label Design Solution
      icon mdi/palette
    - label Coding Implementation
      icon mdi/code-tags
    - label Testing Deployment
      icon mdi/rocket-launch
```

## Sequence/Order Templates (sequence-*)

Suitable for displaying steps, processes, timelines, and other sequential information.

### Zigzag Steps

Use `sequence-zigzag-steps-underline-text` to display process steps:

```infographic
infographic sequence-zigzag-steps-underline-text
data
  title Blog Building Process
  items
    - label Choose Framework
      desc Choose Astro as the static site generator
    - label Design Theme
      desc Design based on the Shoka theme
    - label Develop Features
      desc Implement article system, search, comments and other features
    - label Deploy Online
      desc Use Vercel for automated deployment
```

### Circular Process

Use `sequence-circular-simple` to display a circular process:

```infographic
infographic sequence-circular-simple
data
  title PDCA Cycle
  items
    - label Plan
      desc Make plans
    - label Do
      desc Execute implementation
    - label Check
      desc Inspect and verify
    - label Act
      desc Improve and optimize
```

### Vertical Roadmap

Use `sequence-roadmap-vertical-simple` to display a timeline or roadmap:

```infographic
infographic sequence-roadmap-vertical-simple
data
  title Project Milestones
  items
    - label 2024 Q1
      desc Project kickoff, completed basic architecture
    - label 2024 Q2
      desc Implemented core features, started content migration
    - label 2024 Q3
      desc Optimized performance, added advanced features
    - label 2024 Q4
      desc Officially released, continuous optimization
```

### Pyramid Structure

Use `sequence-pyramid-simple` to display hierarchical progression:

```infographic
infographic sequence-pyramid-simple
data
  title Maslow's Hierarchy of Needs
  items
    - label Self-actualization
    - label Esteem
    - label Social
    - label Safety
    - label Physiological
theme
  palette
    - #8b5cf6
    - #3b82f6
    - #06b6d4
    - #10b981
    - #f59e0b
```

## Comparison Templates (compare-*)

Suitable for binary comparisons, pros and cons analysis, etc.

### Horizontal Binary Comparison

Use `compare-binary-horizontal-simple-fold` for comparison:

```infographic
infographic compare-binary-horizontal-simple-fold
data
  title SSR vs SSG
  items
    - label Server-Side Rendering (SSR)
      children
        - label Real-time Generation
          desc Render pages on each request
        - label Dynamic Content
          desc Suitable for frequently updated content
        - label Server Load
          desc Requires server resources
    - label Static Site Generation (SSG)
      children
        - label Build-time Generation
          desc Pre-generate all pages
        - label Static Content
          desc Suitable for relatively stable content
        - label CDN Friendly
          desc Can be deployed to CDN edge nodes
```

### SWOT Analysis

Use `compare-swot` for SWOT analysis:

```infographic
infographic compare-swot
data
  title Tech Blog SWOT Analysis
  items
    - label Strengths
      children
        - label Technical accumulation
        - label Personal brand
        - label Knowledge沉淀
    - label Weaknesses
      children
        - label Time investment
        - label Continuous update pressure
        - label Low initial traffic
    - label Opportunities
      children
        - label Active tech community
        - label Open source ecosystem growth
        - label Personal growth space
    - label Threats
      children
        - label Content homogenization
        - label Platform competition
        - label Rapid technology iteration
```

## Hierarchy Templates (hierarchy-*)

Suitable for displaying organizational structures, classification systems, and other tree-like relationships.

### System Layered Structure

Use `hierarchy-structure` to display multi-level architecture, perfect for showing system architecture and module layering:

```infographic
infographic hierarchy-structure
data
  title System Layered Structure
  desc Display modules and functional groupings at different levels
  items
    - label Presentation Layer
      children
        - label Mini Program
        - label APP
        - label PAD
        - label Client
        - label WEB
    - label Application Layer
      children
        - label Core Module
          children
            - label Feature 1
            - label Feature 2
            - label Feature 3
            - label Feature 4
            - label Feature 5
            - label Feature 6
        - label Base Module
          children
            - label Feature 1
            - label Feature 2
            - label Feature 3
            - label Feature 4
            - label Feature 5
            - label Feature 6
        - label Other Module
          children
            - label Feature 1
            - label Feature 2
            - label Feature 3
            - label Feature 4
            - label Feature 5
            - label Feature 6
    - label Platform Layer
      children
        - label Module 1
          children
            - label Feature 1
            - label Feature 2
            - label Feature 3
            - label Feature 4
        - label Module 2
          children
            - label Feature 1
            - label Feature 2
            - label Feature 3
            - label Feature 4
        - label Module 3
          children
            - label Feature 1
            - label Feature 2
            - label Feature 3
            - label Feature 4
```

### Tech Style Tree Diagram

Use `hierarchy-tree-tech-style-capsule-item` to display hierarchical structure:

```infographic
infographic hierarchy-tree-tech-style-capsule-item
data
  title Frontend Technology System
  items
    - label Frontend Development
      children
        - label Basic Technologies
          children
            - label HTML
            - label CSS
            - label JavaScript
        - label Frameworks/Libraries
          children
            - label React
            - label Vue
            - label Astro
        - label Engineering
          children
            - label Vite
            - label Webpack
            - label Rollup
```

### Rounded Rectangle Tree Diagram

Use `hierarchy-tree-curved-line-rounded-rect-node` to display hierarchy:

```infographic
infographic hierarchy-tree-curved-line-rounded-rect-node
data
  title Blog Content Categories
  items
    - label Technical Articles
      children
        - label Frontend
          children
            - label React
            - label TypeScript
        - label Backend
          children
            - label Node.js
            - label Database
    - label Life Essays
      children
        - label Yearly Summary
        - label Reading Notes
```

## Chart Templates (chart-*)

Suitable for displaying statistical data and numeric comparisons.

### Column Chart

Use `chart-column-simple` to display data comparison:

```infographic
infographic chart-column-simple
data
  title Monthly Article Publication Statistics
  items
    - label Jan
      value 5
    - label Feb
      value 8
    - label Mar
      value 12
    - label Apr
      value 6
    - label May
      value 10
    - label Jun
      value 15
```

### Bar Chart

Use `chart-bar-plain-text` to display horizontal comparison:

```infographic
infographic chart-bar-plain-text
data
  title Programming Language Usage Ratio
  items
    - label TypeScript
      value 45
    - label JavaScript
      value 25
    - label Python
      value 15
    - label Go
      value 10
    - label Others
      value 5
```

### Pie Chart

Use `chart-pie-plain-text` to display proportional distribution:

```infographic
infographic chart-pie-plain-text
data
  title Traffic Source Distribution
  items
    - label Search Engine
      value 45
    - label Social Media
      value 30
    - label Direct Access
      value 15
    - label External Link
      value 10
```

### Donut Chart

Use `chart-pie-donut-pill-badge` to create a donut chart:

```infographic
infographic chart-pie-donut-pill-badge
data
  title Tech Stack Ratio
  items
    - label Frontend
      value 50
    - label Backend
      value 30
    - label DevOps
      value 20
```

### Line Chart

Use `chart-line-plain-text` to display trends:

```infographic
infographic chart-line-plain-text
data
  title Blog Traffic Trends
  items
    - label Week 1
      value 100
    - label Week 2
      value 150
    - label Week 3
      value 200
    - label Week 4
      value 280
    - label Week 5
      value 350
    - label Week 6
      value 420
```

## Quadrant Analysis (quadrant-*)

Suitable for displaying four-quadrant analysis and priority matrices.

### Simple Card Quadrant

Use `quadrant-quarter-simple-card` for quadrant analysis:

```infographic
infographic quadrant-quarter-simple-card
data
  title Four Quadrant Analysis
  items
    - label Important and Urgent
      desc Directly avoid risks
      illus notify
    - label Important but Not Urgent
      desc Take risk control measures
      illus coffee
    - label Not Important but Urgent
      desc Transfer risk through insurance
      illus diary
    - label Not Important and Not Urgent
      desc Choose to accept risks
      illus invest
```

## Relation Diagrams (relation-*)

Suitable for displaying relationships between elements.

### Circular Icon Relation

Use `relation-circle-icon-badge` to display relationship networks:

```infographic
infographic relation-circle-circular-progress
data
  title Subsidiary Profit Analysis
  desc Financial performance of subsidiaries, year-over-year profit growth
  items
    - label Cloud Computing Subsidiary
      value 25
      desc Annual net profit margin reached 25%, becoming the group's core growth engine
      icon mingcute/cardano-ada-fill
    - label AI Subsidiary
      value 40
      desc Rapid expansion of AI business, year-over-year profit growth of 40%
      icon mingcute/openai-fill
    - label IoT Subsidiary
      value 1000
      desc IoT device shipments exceeded 10 million, steady profit improvement
      icon mingcute/medium-fill
    - label Fintech Subsidiary
      value 18
      desc Digital payment business grew rapidly, net profit margin of 18%
      icon mingcute/paypal-fill
    - label New Energy Subsidiary
      value 50
      desc Green energy projects achieved scaled profitability, enormous growth potential
      icon mingcute/drone-fill
```

## Theme Customization

You can customize the color scheme through the `theme` block:

```infographic
infographic list-grid-badge-card
data
  title Custom Color Scheme Example
  items
    - label Primary Color
      desc Brand primary color
    - label Secondary Color
      desc Accent color
    - label Neutral Color
      desc Background text
theme
  palette
    - #3b82f6
    - #8b5cf6
    - #f97316
    - #06b6d4
    - #10b981
```

## Practical Tips

### 1. Choose the Right Template

Choose the corresponding template based on the type of information to display:

- **List information** -> `list-*`
- **Process steps** -> `sequence-*`
- **Data comparison** -> `compare-*` or `chart-*`
- **Hierarchical relationships** -> `hierarchy-*`
- **Priority analysis** -> `quadrant-*`
- **Relationships** -> `relation-*`

### 2. Use Icons Wisely

Use [Material Design Icons](https://pictogrammers.com/library/mdi/) to make infographics more vivid:

```plain
icon mdi/rocket-launch
icon mdi/heart
icon mdi/lightbulb
icon mdi/chart-line
```

### 3. Control Information Density

- Don't include too many items in each infographic (recommended 3-8)
- Use concise labels and descriptions
- Complex information can be split into multiple infographics

### 4. Pay Attention to Theme Adaptation

Infographics automatically adapt to the blog's dark/light theme switching without additional configuration.

## Summary

Infographic provides powerful visualization capabilities for Markdown documents, making tech blogs, documentation, and notes more vivid and readable. Using various templates wisely can significantly improve the expressiveness and readability of content.

For more templates and detailed documentation, please visit the [Infographic official website](https://infographic.antv.vision/).