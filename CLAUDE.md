# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

U-Blog is a modern blog platform built with Next.js 16, Supabase, and TypeScript. It features a markdown editor with live preview, admin dashboard, multi-language post support, and developer tools (GLSL shader previewer, Three.js previewer, markdown preview).

## Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Architecture

### App Structure (Next.js App Router)

- `app/` - Next.js App Router pages
  - `adminos/` - Admin dashboard (protected routes)
    - `dashboard/posts/` - Post management (CRUD)
    - `dashboard/profile/` - Profile settings
    - `dashboard/prompts/` - AI prompts management
    - `dashboard/buildings/` - Projects/buildings management
  - `blog/[slug]/` - Public blog post pages
  - `tags/` - Tag-based post filtering
  - `tools/` - Developer tools (GLSL, Three.js, Markdown previewers)
  - `api/seo-autocomplete/` - SEO API endpoint

### Key Directories

- `components/` - React components
  - `ui/` - Radix UI-based shadcn/ui components
  - Feature components: `glsl-editor.tsx`, `threejs-canvas.tsx`, `markdown-preview.tsx`, etc.
- `lib/supabase/` - Supabase client configuration and TypeScript types
  - `config.ts` - Client initialization, type definitions for Post, Profile, Project, Building, Prompt

### Data Layer

- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage (`blog-images`, `blog-audio` buckets)
- **Auth**: Supabase Auth with email/password
- **Client**: Two clients in `lib/supabase/config.ts`:
  - `supabase` - Server-side (no session persistence)
  - `getSupabaseBrowser()` - Client-side (with localStorage persistence)

### Styling

- Tailwind CSS v4 with `@tailwindcss/postcss`
- CSS variables defined in `app/globals.css`
- Utility function: `cn()` from `lib/utils.ts` for class merging

### Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=<supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
NEXT_PUBLIC_SITE_URL=<your-site-url>
```

Optional:
```
NEXT_PUBLIC_DEEPSEEK_API_KEY=<for-ai-features>
TAVILY_API_KEY=<server-side>
GROQ_API_KEY=<server-side>
```

### Path Aliases

`@/*` maps to project root (configured in `tsconfig.json`)

## Key Patterns

- Server components fetch data directly via `supabase` client
- Client components use `getSupabaseBrowser()` for data operations
- Dynamic routes use `params` as a Promise (Next.js 16 pattern): `const resolvedParams = await params`
- Posts support multi-language translations via `translations` JSON field
- SEO metadata is generated per-page using Next.js Metadata API
