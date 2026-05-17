# Gemini Project Context: astro-koharu

`astro-koharu` is a highly-optimized, feature-rich blog theme built with Astro 5.x, React, and Tailwind CSS. It is designed with a "cute/anime" aesthetic and provides extensive Markdown enhancements, multi-language support (i18n), and a custom CLI for content management.

## Project Overview

- **Core Framework:** Astro 5.x (Static Site Generation / Hybrid)
- **UI Libraries:** React, Tailwind CSS 4, Motion (formerly framer-motion), Lucide React (via Remix Icons)
- **Content System:** Astro Content Collections using Markdown (Remark/Rehype)
- **Search:** Pagefind (headless, static search)
- **AI Features:**
  - AI Article Summarization (via `xsai` and OpenAI-compatible APIs)
  - Semantic Article Recommendation (via `transformers.js` for local vector embeddings)
- **CLI Tool:** `Koharu CLI` (built with Ink) for backups, updates, and content generation.
- **CMS:** A local React-based CMS for managing and editing posts.
- **Style:** "Shoka"-inspired Markdown features (spoilers, rubies,提醒块, etc.)

## Directory Structure

- `src/`: Main source code
  - `components/`: UI components (React and Astro)
  - `content/`: Blog posts and content collection definitions
  - `layouts/`: Astro layouts
  - `lib/`: Utility functions and Markdown plugins (Remark/Rehype)
  - `scripts/`: Content generation scripts (LQIP, summaries, similarities)
- `config/`: Configuration files
  - `site.yaml`: Primary site configuration (metadata, navigation, features)
  - `i18n-content.yaml`: Content-level translations
- `cms/`: Local CMS application (Vite + React)
- `scripts/`: Source code for the `Koharu CLI`
- `public/`: Static assets (images, fonts, etc.)
- `.cache/`: Build-time caches (OG data, AI summaries, etc.)

## Key Commands

### Development & Build
- `pnpm dev`: Start the Astro development server.
- `pnpm build`: Generate the static site for production.
- `pnpm preview`: Preview the locally built production site.
- `pnpm check`: Run Astro's type and sanity check.

### Koharu CLI & Management
- `pnpm koharu`: Open the interactive management CLI.
- `pnpm koharu new post`: Interactively create a new blog post.
- `pnpm koharu backup`: Backup content and configuration.
- `pnpm koharu update`: Update the theme while preserving user content.
- `pnpm cms`: Start the local CMS at `localhost:5173`.

### Asset Generation
- `pnpm generate:all`: Runs the following three scripts:
  - `pnpm generate:lqips`: Generate Low-Quality Image Placeholders.
  - `pnpm generate:summaries`: Generate AI summaries for posts (requires an LLM API).
  - `pnpm generate:similarities`: Generate semantic similarity vectors for related posts.

### Quality Control
- `pnpm lint`: Run Biome for code linting and formatting.
- `pnpm lint-md`: Run lint-md for Markdown content linting.
- `pnpm format`: Format the codebase using Biome.

## Development Conventions

- **Configuration:** Modify `config/site.yaml` for almost all site-wide changes (title, author, menus, feature toggles). Avoid hardcoding values in components where possible.
- **Content:** Blog posts are located in `src/content/blog/`. Frontmatter is strictly validated via Zod in `src/content/config.ts`.
- **Styling:** Uses Tailwind CSS 4. Custom design tokens and animation constants are located in `src/constants/`.
- **Markdown:** Supports Shoka-compatible syntax. Custom plugins for these features are in `src/lib/markdown/`.
- **I18n:** Multi-language support is managed through `config/site.yaml` and `src/i18n/`. Translation files for UI are in `src/i18n/translations/`.
- **Images:** Prefer `.webp` format. Use the `generate:lqips` command to ensure images have smooth loading placeholders.

## Deployment

The project supports Vercel, Netlify, and Docker deployment. It automatically detects the environment and applies the appropriate Astro adapter. For Docker, use the provided `./docker/rebuild.sh` script.
