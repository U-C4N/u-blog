<div align="center">

# U-Blog

**A modern, open-source blog & personal site platform**

Built with Next.js 16 · React 19 · Supabase · TypeScript

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

<br />

<img src="u-blog.png" alt="U-Blog Screenshot" width="720" />

<br />

*Glassmorphism UI · AI-powered SEO · Browser-side AI tools · Markdown editor · Multi-language support*

</div>

---

## Overview

U-Blog is a full-featured personal site and blogging platform with a glassmorphism design language. It ships with an admin dashboard, a markdown editor with media uploads, AI-powered SEO tooling, nine zero-upload browser tools (image enhancer, ASCII converter, background remover, file converter, file merger, GLSL/Three.js previewers, etc.), and a public-facing portfolio — all backed by Supabase with cookie-based SSR auth.

---

## Features

### Content & editor
- **Markdown editor** with live preview, word count, and reading-time stats
- **Image upload** (JPEG, PNG, GIF, WebP — max 5 MB) to Supabase Storage
- **Audio upload** (MP3, WAV, OGG — max 20 MB) with inline `<audio>` player
- **LaTeX math rendering** via `remark-math` + `rehype-katex`
- **Syntax highlighting** for code blocks
- **OG image upload** with preview for social sharing
- **DOMPurify** sanitization (centralized allow-list in `lib/sanitize.ts`)
- **Multi-language posts** — store translations per locale on a single post row

### Admin dashboard
- **Post CRUD** — create, edit, delete with publish/draft workflow
- **Profile management** — name, title, bio, social links, SEO meta fields
- **AI Prompts manager** — curate and showcase prompt collections
- **Buildings manager** — academic works and projects with ordering
- **GitHub repos integration** — pick which repositories show up on the homepage
- **Supabase Auth** — email/password login with cookie-based SSR sessions and defense-in-depth checks

### SEO & AI
- **A.C.S.I** *(Auto-Completer SEO Info)* — one-click AI-generated meta title, description, and tags via the Groq API
- **Google SERP preview** — real-time search result preview in the editor sidebar
- **Smart SEO suggestions** — heading hierarchy, alt text, internal-link analysis
- **Per-post SEO fields** — meta title, description, canonical URL, OG image, `noindex` toggle
- **JSON-LD structured data** — `WebSite`, `Person`, `Blog`, `BlogPosting`, `BreadcrumbList`
- **OpenGraph & Twitter Card** metadata on every page
- **Dynamic `sitemap.xml`** and **`robots.txt`** — auto-generated from published posts
- **Google sitemap ping** on post publish

### Browser tools (`/tools`)
All tools run **fully in the browser** — zero upload, fully private.

| Tool | Description |
|:-----|:------------|
| **Background Remover** | GPU-accelerated background removal with transparent PNG export |
| **Image Enhancer** | Upscale to 4K with WebGPU + Lanczos3, sharpening, denoise, color correction |
| **ASCII Converter** | PNG/JPG → 4K ASCII text with two-stage processing and transparent PNG support |
| **Image Resizer** | Resize SVG/PNG/JPG/WebP by exact width/height with format conversion |
| **File Converter** | PDF, DOCX, DOC, PNG, JPG, SVG, WebP, TXT, HTML, and Markdown — all browser-side |
| **File Merger** | Combine TXT, PDF, DOC, and DOCX files into a single document — auto-detects formats, drag-to-reorder, exports as PDF / DOCX / TXT |
| **Markdown Preview** | Live markdown editor with split-pane responsive layout |
| **GLSL Shader Previewer** | WebGL fragment-shader editor with real-time rendering and uniforms |
| **Three.js Previewer** | 3D scene editor powered by Monaco code editor |

Coming soon: code formatter, color palette generator, unit converter.

### Public pages
- **Homepage** — portfolio: profile, academic works, open-source timeline, featured prompt, social links
- **Blog** — timeline view grouped by year with tag badges
- **Blog post** — breadcrumbs, social share, related posts, language switcher, reading stats
- **Tags** — browse all tags with post counts; per-tag listing
- **Prompts** — public prompt collection with one-click copy
- **Privacy** — privacy policy

### Design & performance
- **Glassmorphism UI** — custom `.glass`, shimmer, glow, and float CSS utilities
- **Animated gradient background** with color orbs and grain texture overlay
- **Staggered fade-in animations** for page sections
- **Dark mode** via CSS custom properties
- **`content-visibility: auto`** for virtualized list rendering
- **Optimized barrel imports** for `lucide-react`, `date-fns`, `react-syntax-highlighter`
- **Outfit** Google Font with `display: swap`
- **Standalone output** for container deployments

---

## Architecture highlights

- **Cookie-based SSR auth via `@supabase/ssr`** — `proxy.ts` (the Next.js 16 successor to `middleware.ts`) refreshes Supabase sessions through `getAll`/`setAll` cookies. The browser, server, and proxy all share the same auth state, so no more "randomly logged out" bugs.
- **Three Supabase clients, one source of truth**:
  - `lib/supabase/client.ts` — browser singleton (`createBrowserClient`)
  - `lib/supabase/server.ts` — async server client (`createServerClient` + `await cookies()`) for Server Components, Route Handlers, and Server Actions
  - `lib/supabase/config.ts` — anon-key client for public read-only paths (sitemap, public blog) and shared TypeScript types
- **Defense-in-depth admin guard** — proxy redirects unauthenticated `/adminos/*` → `/adminos/login`, the dashboard layout re-checks via `getUser()`, and every server-rendered admin page calls `getUser()` again. No single layer is trusted.
- **Reusable auth helpers** — `lib/supabase/auth.ts` exposes `getAdminSession()` (React-cached), `requireAdmin()` (auto-redirect), and `verifyBearerAdmin()` (legacy Bearer token fallback).
- **Centralized sanitization & slug helpers** — `lib/sanitize.ts` and `lib/slug.ts` replace previously duplicated logic across the new- and edit-post pages.
- **Per-request data deduplication** — `app/blog/[slug]/page.tsx` wraps `getPost` in `React.cache()` so `generateMetadata` and the page share a single Supabase fetch.

---

## Tech stack

| Layer | Technology |
|:------|:-----------|
| **Framework** | Next.js 16 (App Router, React Server Components, Turbopack) |
| **Runtime** | React 19 |
| **Language** | TypeScript 5.9 |
| **Database** | Supabase (PostgreSQL) with Row Level Security |
| **Storage** | Supabase Storage — `blog-images`, `blog-audio` buckets |
| **Auth** | Supabase Auth via `@supabase/ssr` (cookie-based SSR sessions) |
| **Styling** | Tailwind CSS v4 (CSS-based config) + `@tailwindcss/typography` |
| **UI Components** | shadcn/ui · Radix UI primitives |
| **Code editor** | Monaco Editor (`@monaco-editor/react`) |
| **Markdown** | `react-markdown` + `remark-gfm` + `rehype-raw` |
| **Math** | `remark-math` + `rehype-katex` |
| **3D graphics** | Three.js |
| **In-browser AI** | `@huggingface/transformers`, `@imgly/background-removal` (WebGPU + Web Workers) |
| **Animation** | Framer Motion |
| **Charts** | Recharts |
| **Document tooling** | `pdf-lib`, `pdfjs-dist`, `mammoth`, `docx`, `jszip`, `turndown` |
| **AI APIs** | OpenAI SDK · Groq API |
| **Sanitization** | `isomorphic-dompurify` |
| **Env validation** | `@t3-oss/env-nextjs` + `zod` |

---

## Getting started

### Prerequisites

- **Node.js 20** (pinned via `.nvmrc`)
- A [Supabase](https://supabase.com) project with the required tables (see [Database schema](#database-schema)) and the `blog-images` and `blog-audio` storage buckets
- *(Optional)* a [Groq](https://console.groq.com/) API key if you want to use the A.C.S.I SEO auto-complete

### Installation

```bash
git clone https://github.com/U-C4N/u-blog.git
cd u-blog
npm install
```

### Environment variables

Create a `.env.local` file in the project root:

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>

# Recommended (defaults to https://uc4n.com)
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Optional — only needed for the A.C.S.I SEO button
GROQ_API_KEY=

# Declared in env.mjs but currently unused by route code
TAVILY_API_KEY=
NEXT_PUBLIC_DEEPSEEK_API_KEY=
```

| Variable | Required | Description |
|:---------|:--------:|:------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon (publishable) key |
| `NEXT_PUBLIC_SITE_URL` | ⚪ | Public site URL used for canonical/OG URLs (defaults to `https://uc4n.com`) |
| `GROQ_API_KEY` | ⚪ | Required only for `/api/seo-autocomplete` |
| `TAVILY_API_KEY` | ⚪ | Declared in `env.mjs`, currently unused |
| `NEXT_PUBLIC_DEEPSEEK_API_KEY` | ⚪ | Declared in `env.mjs`, currently unused |

`env.mjs` is the source of truth for environment variables. Supabase URL/anon key are read directly from `process.env` because they're needed before validation runs.

### Scripts

```bash
npm run dev       # Dev server on http://localhost:3000 (Turbopack)
npm run build     # Production build (output: standalone) — runs TypeScript checking
npm run start     # Start the standalone build
npx tsc --noEmit  # Type-check only
```

> **No test runner is configured.** Verify changes by running `npm run build` and exercising the affected pages with `npm run dev`.

---

## Project structure

```
u-blog/
├── app/
│   ├── adminos/                          # Admin panel (proxy-guarded)
│   │   ├── login/                        # Admin login (cookie-based session)
│   │   └── dashboard/
│   │       ├── posts/                    # List, new, [id]/edit
│   │       ├── profile/                  # Profile, social links, GitHub repos
│   │       ├── prompts/                  # AI prompts manager
│   │       └── buildings/                # Academic works manager
│   ├── api/
│   │   ├── revalidate/                   # On-demand ISR revalidation (cookie-auth)
│   │   └── seo-autocomplete/             # A.C.S.I Groq endpoint
│   ├── blog/
│   │   ├── page.tsx                      # Blog listing (timeline by year)
│   │   └── [slug]/page.tsx               # Individual blog post
│   ├── tags/                             # All tags + per-tag listing
│   ├── tools/
│   │   ├── ascii-converter/
│   │   ├── background-remove/
│   │   ├── converter/
│   │   ├── glsl-previewer/
│   │   ├── image-enhancer/
│   │   ├── markdown-preview/
│   │   ├── merge/
│   │   ├── resizer/
│   │   └── threejs-previewer/
│   ├── prompts/                          # Public prompts collection
│   ├── privacy/
│   ├── layout.tsx                        # Root layout (Outfit, SEO, JSON-LD)
│   ├── page.tsx                          # Homepage / portfolio
│   ├── sitemap.ts                        # Dynamic sitemap
│   ├── robots.ts                         # robots.txt
│   └── globals.css                       # Glassmorphism & animation utilities
├── components/
│   ├── ui/                               # shadcn/ui primitives
│   ├── glsl-canvas.tsx · glsl-editor.tsx
│   ├── threejs-canvas.tsx · threejs-editor.tsx
│   ├── ascii-converter.tsx
│   ├── markdown-preview.tsx
│   ├── serp-preview.tsx                  # Google SERP preview widget
│   ├── seo-suggestions.tsx               # Smart SEO suggestions panel
│   ├── language-switcher.tsx
│   ├── related-posts.tsx
│   └── ...
├── lib/
│   ├── supabase/
│   │   ├── client.ts                     # Browser client (createBrowserClient)
│   │   ├── server.ts                     # Server client (createServerClient + cookies)
│   │   ├── config.ts                     # Public read-only client + shared types
│   │   ├── auth.ts                       # getAdminSession, requireAdmin, verifyBearerAdmin
│   │   ├── database.types.ts             # Auto-generated DB types
│   │   └── schema.sql                    # Bootstrap schema (out of date — trust types.ts)
│   ├── ascii/                            # ASCII converter (CPU + WebGPU + Worker)
│   ├── enhancer/                         # AI upscaler (HF transformers + Lanczos3)
│   ├── file-merge.ts                     # TXT/PDF/DOC/DOCX merge engine (pdf-lib, mammoth, docx)
│   ├── sanitize.ts                       # DOMPurify wrapper for post content
│   ├── slug.ts                           # generateSlug, normalizeManualSlug
│   ├── site.ts                           # siteUrl, toAbsoluteSiteUrl, resolveCanonicalUrl
│   ├── tools-config.ts                   # Single source for the /tools index
│   ├── tool-media.ts · file-utils.ts     # Canvas/blob/format helpers
│   └── utils.ts
├── hooks/
│   └── use-supabase.ts                   # useSupabaseAuth (cookie-based getUser)
├── proxy.ts                              # Auth guard + visit analytics (Next.js 16)
├── env.mjs                               # Environment validation (t3-env)
├── next.config.js                        # Standalone output, image config
├── package.json
└── tsconfig.json
```

---

## Database schema

| Table | Purpose |
|:------|:--------|
| `posts` | Blog posts — title, slug, content, tags, SEO fields, translations, publish status |
| `profiles` | User profile — name, title, bio, social links, SEO meta, GitHub token |
| `buildings` | Academic works and projects with ordering |
| `github_repos` | GitHub repositories with selection toggle for homepage showcase |
| `prompts` | AI prompt collection — title, content, optional image |
| `visits` | Page-visit analytics — pathname tracking via the proxy |

All tables have **Row Level Security (RLS)** enabled with policies for public reads and authenticated writes.

> ⚠️ `lib/supabase/schema.sql` is the original bootstrap and is out of date relative to the live schema (which includes SEO columns, `language_code`, `translations`, etc.). Trust `lib/supabase/database.types.ts` and regenerate it with `supabase gen types` when the schema changes.

Storage buckets: **`blog-images`** (post images, OG images, prompt covers) and **`blog-audio`** (post audio uploads).

---

## Deployment

The build is configured for **standalone output** (`next.config.js`), so the project is ready for container deployments (Docker, Railway, Fly.io, etc.). For Vercel, the standalone setting is harmless and you can deploy as-is.

`next.config.js` sets `images.unoptimized: true` and `remotePatterns: '**'` — `<Image>` is used for layout/lazy-loading only, not transformation. Don't add `next/image` `loader` configs expecting Vercel-style optimization.

---

## Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Check the [issues page](https://github.com/U-C4N/u-blog/issues) for open tasks.

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built by [Umutcan Edizaslan](https://github.com/U-C4N)**

</div>
