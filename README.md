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

*Glassmorphism UI · AI-powered SEO · Developer Tools · Markdown Editor · Multi-language Support*

</div>

---

## Overview

U-Blog is a full-featured personal website and blogging platform with a glassmorphism design language. It ships with an admin dashboard, markdown editor with media uploads, AI-powered SEO tooling, interactive developer tools (GLSL shaders, Three.js 3D scenes), and a public-facing portfolio page — all backed by Supabase.

---

## Features

### Content & Editor
- **Markdown editor** with live preview, word count, and reading time stats
- **Image upload** (JPEG, PNG, GIF, WebP — max 5 MB) to Supabase Storage
- **Audio upload** (MP3, WAV, OGG — max 20 MB) with inline `<audio>` player
- **LaTeX math rendering** via remark-math + rehype-katex
- **Syntax highlighting** for code blocks
- **OG Image upload** with preview for social sharing
- **DOMPurify** sanitization for XSS protection

### Admin Dashboard
- **Post CRUD** — create, edit, delete with publish/draft workflow
- **Profile management** — name, title, bio, social links, SEO meta fields
- **AI Prompts manager** — curate and showcase prompt collections
- **Buildings manager** — academic works and projects
- **GitHub repos integration** — select repositories to showcase on homepage
- **Supabase Auth** login with session management and logout

### SEO & AI
- **A.C.S.I** *(Auto-Completer SEO Info)* — one-click AI-generated meta title, description, and tags via Groq API
- **Google SERP preview** — real-time search result preview in the editor sidebar
- **Smart SEO suggestions** — heading hierarchy, alt text, internal link analysis
- **Per-post SEO fields** — meta title, description, canonical URL, OG image, noindex toggle
- **JSON-LD structured data** — WebSite, Person, Blog, BlogPosting, BreadcrumbList schemas
- **OpenGraph & Twitter Card** metadata on every page
- **Dynamic `sitemap.xml`** and **`robots.txt`** — auto-generated from published posts
- **Google sitemap ping** on post publish

### Developer Tools
- **GLSL Shader Previewer** — WebGL fragment shader editor with real-time rendering and uniform controls
- **Three.js Previewer** — 3D scene editor powered by Monaco code editor
- **Markdown Preview** — full-featured markdown editor with responsive split layout

### Public Pages
- **Homepage** — portfolio with profile, academic works, open-source projects timeline, featured prompt card, explore navigation, and social links
- **Blog** — timeline view grouped by year with tag badges
- **Blog Post** — full article with breadcrumbs, social share, related posts, language switcher, and reading stats
- **Tags** — browse all tags with post counts, filter by tag
- **Prompts** — public prompt collection with one-click copy
- **Privacy** page

### Design & Performance
- **Glassmorphism UI** — custom glass, shimmer, glow, and float CSS utilities
- **Gradient background** with animated color orbs and grain texture overlay
- **Staggered fade-in animations** for page sections
- **Dark mode** support via CSS custom properties
- **`content-visibility: auto`** for virtualized list rendering
- **Optimized barrel imports** for lucide-react, date-fns, react-syntax-highlighter
- **Outfit** Google Font with `display: swap`
- **Standalone output** mode for container deployments

---

## Tech Stack

| Layer | Technology |
|:------|:-----------|
| **Framework** | Next.js 16 (App Router, Server Components) |
| **Runtime** | React 19 |
| **Language** | TypeScript 5.9 |
| **Database** | Supabase (PostgreSQL) |
| **Storage** | Supabase Storage (`blog-images`) |
| **Auth** | Supabase Auth (email/password, SSR middleware) |
| **Styling** | Tailwind CSS v4 + `@tailwindcss/typography` |
| **UI Components** | shadcn/ui (50+ Radix UI primitives) |
| **Code Editor** | Monaco Editor (`@monaco-editor/react`) |
| **Markdown** | React Markdown + remark-gfm + rehype-raw |
| **Math** | remark-math + rehype-katex |
| **3D Graphics** | Three.js |
| **Animation** | Framer Motion |
| **Charts** | Recharts |
| **Forms** | React Hook Form + Zod |
| **AI** | OpenAI SDK · Groq API |
| **Env Validation** | `@t3-oss/env-nextjs` |

---

## Getting Started

### Prerequisites

- **Node.js 18+** (see `.nvmrc`)
- A [Supabase](https://supabase.com) project with the required tables (see [Database Schema](#database-schema))

### Installation

```bash
git clone https://github.com/U-C4N/u-blog.git
cd u-blog
npm install
```

### Environment Variables

Create a `.env.local` file in the project root:

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Optional — AI & Search features
NEXT_PUBLIC_DEEPSEEK_API_KEY=   # AI features
GROQ_API_KEY=                    # A.C.S.I SEO auto-complete
TAVILY_API_KEY=                  # Server-side search
```

| Variable | Required | Description |
|:---------|:--------:|:------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key |
| `NEXT_PUBLIC_SITE_URL` | Yes | Your site's public URL |
| `NEXT_PUBLIC_DEEPSEEK_API_KEY` | No | DeepSeek API key for AI features |
| `GROQ_API_KEY` | No | Groq API key for A.C.S.I SEO tool |
| `TAVILY_API_KEY` | No | Tavily API key for server-side search |

### Development

```bash
npm run dev       # Start development server (http://localhost:3000)
npm run build     # Create production build
npm run start     # Start production server
npm run lint      # Run ESLint
```

---

## Project Structure

```
u-blog/
├── app/
│   ├── adminos/                    # Admin panel (auth-protected)
│   │   ├── login/                  # Admin login page
│   │   └── dashboard/
│   │       ├── posts/              # Post list, create new, edit [id]
│   │       ├── profile/            # Profile settings
│   │       ├── prompts/            # AI prompts manager
│   │       └── buildings/          # Academic works manager
│   ├── blog/
│   │   ├── page.tsx                # Blog listing (timeline by year)
│   │   └── [slug]/page.tsx         # Individual blog post
│   ├── tags/
│   │   ├── page.tsx                # All tags overview
│   │   └── [tag]/page.tsx          # Posts filtered by tag
│   ├── tools/
│   │   ├── glsl-previewer/         # GLSL shader editor
│   │   ├── threejs-previewer/      # Three.js 3D scene editor
│   │   └── markdown-preview/       # Markdown editor
│   ├── prompts/                    # Public prompts collection
│   ├── privacy/                    # Privacy policy
│   ├── api/
│   │   ├── revalidate/             # On-demand ISR revalidation
│   │   └── seo-autocomplete/       # A.C.S.I AI endpoint
│   ├── layout.tsx                  # Root layout (Outfit font, SEO, JSON-LD)
│   ├── page.tsx                    # Homepage / portfolio
│   ├── sitemap.ts                  # Dynamic sitemap generation
│   ├── robots.ts                   # Robots.txt generation
│   └── globals.css                 # Glassmorphism & animation utilities
├── components/
│   ├── ui/                         # 50+ shadcn/ui components
│   ├── background.tsx              # Animated gradient orb background
│   ├── glsl-canvas.tsx             # WebGL shader renderer
│   ├── glsl-editor.tsx             # GLSL code editor
│   ├── threejs-canvas.tsx          # Three.js 3D canvas
│   ├── threejs-editor.tsx          # Three.js code editor
│   ├── markdown-preview.tsx        # Markdown preview component
│   ├── serp-preview.tsx            # Google SERP preview widget
│   ├── seo-suggestions.tsx         # Smart SEO suggestions panel
│   ├── language-switcher.tsx       # Multi-language post switcher
│   ├── social-share.tsx            # Social sharing buttons
│   ├── related-posts.tsx           # Related posts by tags
│   └── ...                         # Other shared components
├── lib/
│   └── supabase/
│       ├── config.ts               # Supabase client + TypeScript types
│       └── database.types.ts       # Auto-generated DB types
├── middleware.ts                    # Auth guard + visit analytics
├── env.mjs                         # Environment validation (t3-env)
├── next.config.js                  # Next.js config (standalone, optimizations)
├── package.json
└── tsconfig.json
```

---

## Database Schema

| Table | Purpose |
|:------|:--------|
| `posts` | Blog posts — title, slug, content, tags, SEO fields, translations, publish status |
| `profiles` | User profile — name, title, bio, social links, SEO meta, GitHub token |
| `buildings` | Academic works and projects with ordering |
| `github_repos` | GitHub repositories with selection toggle for homepage showcase |
| `prompts` | AI prompt collection — title, content, optional image |
| `visits` | Page visit analytics — pathname tracking via middleware |

All tables have **Row Level Security (RLS)** enabled with policies for public reads and authenticated writes.

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
