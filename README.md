# U-Blog v0.2.0

A modern blog platform built with **Next.js 16**, **React 19**, **Supabase**, and **TypeScript**. Features a markdown editor with live preview, admin dashboard, multi-language support, developer tools, and AI-powered SEO optimization.

## Features

### Content Editor
- Markdown with live preview (split-pane and tabbed modes)
- Syntax highlighting for 20+ languages
- Image and audio upload with Supabase Storage
- LaTeX math formula rendering (KaTeX)
- Auto-save with unsaved changes detection
- Word count, reading time, and content stats
- DOMPurify sanitization for XSS protection

### Admin Dashboard
- Post CRUD with publish/draft workflow
- Profile management (bio, social links, SEO meta)
- AI prompts collection manager
- Academic works / projects (buildings) manager
- GitHub repos integration (select repos to showcase)
- Multi-language post translations

### SEO
- Per-post meta title, description, canonical URL, OG image
- JSON-LD structured data (BlogPosting, Person, BreadcrumbList)
- OpenGraph and Twitter Card metadata
- `robots.txt` and `sitemap.xml`
- A.C.S.I (Auto-Completer SEO Info) - AI-powered meta generation via Groq
- Google SERP preview in editor
- Smart SEO suggestions (heading hierarchy, alt text, internal links)
- Noindex toggle per post

### Developer Tools
- **GLSL Shader Previewer** - WebGL fragment shader editor with real-time rendering
- **Three.js Previewer** - 3D scene editor with Monaco code editor
- **Markdown Preview** - Full-featured markdown editor with responsive layout

### Security
- Supabase Auth with email/password
- Row Level Security (RLS) on all tables
- Input sanitization with DOMPurify
- Content length validation (10-50,000 chars)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Runtime | React 19 |
| Language | TypeScript 5.9 |
| Database | Supabase (PostgreSQL 15) |
| Storage | Supabase Storage (`blog-images`, `blog-audio`) |
| Auth | Supabase Auth |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui (Radix UI primitives) |
| Editor | React MD Editor + Monaco Editor |
| 3D | Three.js |
| Math | remark-math + rehype-katex |
| Animation | Framer Motion |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| AI | OpenAI SDK, Groq API |

## Getting Started

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project

### Setup

```bash
git clone https://github.com/U-C4N/u-blog.git
cd u-blog
npm install
```

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Optional:

```env
NEXT_PUBLIC_DEEPSEEK_API_KEY=<for-ai-features>
TAVILY_API_KEY=<server-side-search>
GROQ_API_KEY=<for-acsi-seo-tool>
```

### Run

```bash
npm run dev      # Development server
npm run build    # Production build
npm run start    # Production server
npm run lint     # ESLint
```

## Project Structure

```
app/
  adminos/           # Admin panel (auth-protected)
    dashboard/
      posts/         # Post CRUD (list, new, edit)
      profile/       # Profile settings
      prompts/       # AI prompts manager
      buildings/     # Projects manager
    login/           # Admin login
  blog/[slug]/       # Public blog post pages
  tags/              # Tag-based filtering
  tools/             # Developer tools (GLSL, Three.js, Markdown)
  api/               # API routes
components/
  ui/                # shadcn/ui components
  serp-preview.tsx   # Google SERP preview widget
  seo-suggestions.tsx # Smart SEO suggestions panel
  glsl-editor.tsx    # GLSL shader editor
  threejs-canvas.tsx # Three.js 3D canvas
  markdown-preview.tsx
lib/
  supabase/          # Client config, types, database types
  utils.ts           # Utility functions (cn, etc.)
```

## Database Schema

| Table | Purpose |
|-------|---------|
| `posts` | Blog posts with SEO fields, translations, tags |
| `profiles` | User profile, social links, SEO settings |
| `buildings` | Academic works / projects |
| `github_repos` | GitHub repositories (selectable for showcase) |
| `prompts` | AI prompt collection |
| `visits` | Page visit analytics |

All tables have RLS enabled with appropriate policies for public reads and authenticated writes.

## Contributing

Contributions, issues, and feature requests are welcome! Check the [issues page](https://github.com/U-C4N/u-blog/issues).

## License

MIT - see [LICENSE](LICENSE) for details.
