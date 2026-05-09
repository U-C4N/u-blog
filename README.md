# u-blog

Personal blog and portfolio platform. Next.js 16 + Supabase + Tailwind v4.
Live at [uc4n.com](https://uc4n.com).

## What's in it

- Markdown editor with live preview, image/audio uploads, KaTeX math, syntax highlighting, DOMPurify sanitization
- Admin dashboard for posts (with per-post SEO fields and translations), profile, prompts, projects, GitHub repos
- Cookie-based SSR auth via `@supabase/ssr` with proxy-level admin guard
- Multi-language posts (translations stored on the same row), language switcher on the post page
- One-click AI meta title/description/tags via Groq (the "A.C.S.I" button in the editor)
- SEO: dynamic `sitemap.xml` and `robots.txt` (with named AI-crawler allowlist), `/feed.xml` RSS, `llms.txt` + `llms-full.txt`, JSON-LD on every page (`WebSite`, `Person`, `BlogPosting`, `BreadcrumbList`), ISR on blog routes

### Browser tools (`/tools`)

All run client-side, no upload.

| Tool | Notes |
|---|---|
| ASCII Converter | Worker pipeline with Floyd-Steinberg dithering, plus an experimental WebGPU 1:1 mode (single compute pass, each pixel → one ASCII char) |
| Image Enhancer | Hugging Face transformers upscaler with Lanczos3 fallback |
| Background Remover | `@imgly/background-removal` (WebGPU + Web Worker) |
| Image Resizer | SVG/PNG/JPG/WebP, exact dimensions, format conversion |
| File Converter | PDF / DOCX / PNG / JPG / SVG / WebP / TXT / HTML / Markdown |
| File Merger | Combine TXT/PDF/DOC/DOCX into a single doc, drag-to-reorder, export as PDF/DOCX/TXT |
| Markdown Preview | Split-pane live editor |
| GLSL Previewer | WebGL fragment-shader playground with uniforms |
| Three.js Previewer | Monaco-driven 3D scene editor |

## Run it

You need Node 20 (pinned via `.nvmrc`), a Supabase project, and `blog-images` + `blog-audio` storage buckets. The Groq key is only needed if you want the SEO auto-complete button.

```bash
git clone https://github.com/U-C4N/u-blog.git
cd u-blog
npm install
npm run dev
```

`.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
GROQ_API_KEY=                # optional, only for /api/seo-autocomplete
```

`env.mjs` (`@t3-oss/env-nextjs`) is the source of truth for env vars. Supabase URL/anon key are read directly from `process.env` because they're needed before validation runs.

## Scripts

```
npm run dev       # Turbopack dev server on http://localhost:3000
npm run build     # production build (output: standalone)
npm run start     # run the standalone build
npx tsc --noEmit  # type check
```

No test runner. Verify with `npm run build` and the dev server.

## Database

Tables: `posts`, `profiles`, `buildings`, `github_repos`, `prompts`, `visits`. RLS is on with public-read / authenticated-write policies. Storage buckets: `blog-images`, `blog-audio`.

`lib/supabase/schema.sql` is the original bootstrap and is **out of date** vs. the live schema (which has SEO columns, `language_code`, `translations`, etc.). Trust `lib/supabase/database.types.ts` and regenerate it with `supabase gen types` when the schema changes.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript 5.9 · Supabase (Postgres + Auth + Storage) · Tailwind v4 · shadcn/ui + Radix · Monaco · Three.js · `@huggingface/transformers` · `@imgly/background-removal` · `pdf-lib` / `mammoth` / `docx` · `react-markdown` + KaTeX · DOMPurify · t3-env

## Deployment

`next.config.js` is set to `output: 'standalone'` for container deploys. `images.unoptimized: true` and `remotePatterns: '**'` — `<Image>` is used for layout and lazy-loading only, not transformation.

## License

MIT
