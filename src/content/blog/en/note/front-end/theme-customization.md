---
title: Theme Customization Guide
link: theme-customization
catalog: true
draft: true
date: 2024-01-03 00:00:00
description: Learn how to customize the appearance of astro-koharu, including colors, layouts, and animation effects.
tags:
  - Customization
  - CSS
  - Tailwind
categories:
  - [笔记, 前端]
cover: /img/cover/3.webp
---

This article introduces how to customize the appearance and styles of astro-koharu.

## Nested Category 说明

This article uses a nested category `[笔记, 前端]`, which creates a hierarchical relationship:

- URL: `/categories/note/front-end`
- Breadcrumb: 笔记 -> 前端

Configure it in the frontmatter like this:

```yaml
categories:
  - [笔记, 前端]
```

## Color Customization

### CSS Variables

Theme colors are defined via CSS variables, located in `src/styles/index.css`:

```css
:root {
  --primary-color: #ff6b9d;
  --secondary-color: #7dd3fc;
  /* ... more variables */
}

.dark {
  --primary-color: #f472b6;
  --secondary-color: #38bdf8;
}
```

### Tailwind Configuration

Edit `tailwind.config.ts` to customize the theme:

```typescript
export default {
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary-color)',
        secondary: 'var(--secondary-color)',
      },
    },
  },
};
```

## Layout Adjustment

### Content Width

Adjust layout constants in `src/constants/layout.ts`:

```typescript
export const LAYOUT = {
  maxWidth: '1200px',
  sidebarWidth: '300px',
  contentPadding: '1.5rem',
};
```

### Responsive Breakpoints

The theme uses Tailwind's default breakpoints:

| Breakpoint | Width | Use Case |
|------------|-------|----------|
| sm | 640px | Small phones |
| md | 768px | Tablets |
| lg | 1024px | Desktops |
| xl | 1280px | Large screens |

## Animation Effects

### Motion Configuration

Animations use the Motion library, configuration is located in `src/constants/anim/`:

```typescript
// spring.ts - Spring animations
export const springConfig = {
  stiffness: 100,
  damping: 10,
};

// variants.ts - Animation variants
export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};
```

### Disabling Animations

For users who prefer reduced motion, the theme automatically responds to the `prefers-reduced-motion` media query.

## Christmas Effects

The theme includes optional Christmas effects, configured in `site-config.ts`:

```typescript
export const christmasConfig = {
  enabled: false,  // Set to true to enable
  features: {
    snowfall: true,        // Snowfall
    christmasColorScheme: true,  // Christmas color scheme
    christmasHat: true,    // Christmas hat
  },
};
```

## Summary

By modifying the above configurations, you can easily create a blog with your own style. If you have any questions, feel free to open an issue on GitHub.