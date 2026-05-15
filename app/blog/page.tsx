import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { supabase, type Post } from '@/lib/supabase/config'
import { resolveCanonicalUrl, toAbsoluteSiteUrl } from '@/lib/site'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Writing',
  description: 'Thoughts on technology, design, and life by Umutcan Edizaslan',
  keywords: ['blog', 'technology', 'design', 'software engineering', 'AI'],
  openGraph: {
    type: 'website',
    url: toAbsoluteSiteUrl('/blog'),
    title: 'Writing | U-BLOG',
    description: 'Thoughts on technology, design, and life by Umutcan Edizaslan',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Writing | U-BLOG',
    description: 'Thoughts on technology, design, and life by Umutcan Edizaslan',
  },
  alternates: {
    canonical: toAbsoluteSiteUrl('/blog'),
  }
}

const FALLBACK_CONTACT_EMAIL = 'contact@uc4n.com'

function generateBlogListingStructuredData(posts: Post[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    headline: 'U-BLOG - Thoughts on technology, design, and life',
    author: {
      '@type': 'Person',
      name: 'Umutcan Edizaslan'
    },
    blogPost: posts.map(post => ({
      '@type': 'BlogPosting',
      headline: post.title,
      datePublished: post.created_at,
      dateModified: post.updated_at || post.created_at,
      url: resolveCanonicalUrl(post.canonical_url, `/blog/${post.slug}`)
    }))
  }
}

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']

function formatRomanMonth(date: Date): string {
  const monthIdx = date.getMonth()
  return ROMAN_NUMERALS[monthIdx] ?? `${monthIdx + 1}`
}

export default async function BlogPage() {
  const [postsRes, profileRes] = await Promise.allSettled([
    supabase
      .from('posts')
      .select('*')
      .eq('published', true)
      .order('created_at', { ascending: false }),
    supabase.from('profiles').select('social_links').limit(1).maybeSingle(),
  ])

  const postsRaw = postsRes.status === 'fulfilled' ? postsRes.value.data || [] : []
  const fetchError = postsRes.status === 'fulfilled' ? postsRes.value.error : null

  const posts: Post[] = postsRaw.map((post) => ({
    ...post,
    content: post.content ?? '',
    published: post.published ?? false,
    tags: post.tags ?? undefined,
    meta_title: post.meta_title ?? undefined,
    meta_description: post.meta_description ?? undefined,
    canonical_url: post.canonical_url ?? undefined,
    og_image_url: post.og_image_url ?? undefined,
    noindex: post.noindex ?? undefined,
    translations: post.translations
      ? (post.translations as { [key: string]: { title: string; content: string; slug: string } })
      : undefined,
  }))

  const social = (() => {
    if (
      profileRes.status === 'fulfilled' &&
      profileRes.value.data?.social_links &&
      typeof profileRes.value.data.social_links === 'object' &&
      !Array.isArray(profileRes.value.data.social_links)
    ) {
      const links = profileRes.value.data.social_links as Record<string, unknown>
      return {
        twitter: typeof links.twitter === 'string' ? links.twitter : undefined,
        linkedin: typeof links.linkedin === 'string' ? links.linkedin : undefined,
        github: typeof links.github === 'string' ? links.github : undefined,
        email: typeof links.email === 'string' ? links.email : undefined,
      }
    }
    return undefined
  })()

  const contactEmail = social?.email || FALLBACK_CONTACT_EMAIL

  const years = Array.from(
    new Set(posts.map((post) => new Date(post.created_at).getFullYear()))
  ).toSorted((a, b) => b - a)

  const structuredData = generateBlogListingStructuredData(posts)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* Full-page marble background — scoped to /blog */}
      <div
        aria-hidden
        className="fixed inset-0 -z-20"
        style={{
          backgroundImage: "url('/bg.webp')",
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
          backgroundColor: 'hsl(var(--cream))',
        }}
      />
      {/* Cream wash over marble so type stays readable */}
      <div
        aria-hidden
        className="fixed inset-0 -z-10"
        style={{ backgroundColor: 'hsl(var(--cream) / 0.55)' }}
      />

      <SiteNav contactEmail={contactEmail} />

      <main className="relative classical-ink min-h-screen">
        {/* ── Header band ───────────────────────────────────────────── */}
        <section className="relative w-full pt-28 sm:pt-32 lg:pt-36 pb-10 sm:pb-14">
          <div className="max-w-6xl mx-auto px-6 sm:px-10">
            <Link
              href="/"
              className="classical-fade-up inline-flex items-center gap-2 serif-display text-[11px] tracking-[0.32em] uppercase classical-ink-muted hover:gold-text transition-colors group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform duration-300" strokeWidth={1.6} />
              Return to Index
            </Link>

            <div className="mt-10 sm:mt-14 grid grid-cols-1 lg:grid-cols-[1fr_auto] items-end gap-8 lg:gap-16">
              <div>
                {/* Pretitle */}
                <div className="flex items-center gap-3 sm:gap-4 classical-fade-up classical-delay-1">
                  <span className="gold-divider w-10 sm:w-14 inline-block" />
                  <p className="serif-body italic text-[11px] sm:text-[12px] tracking-[0.5em] uppercase whitespace-nowrap">
                    <span className="gold-text">//&nbsp;</span>
                    <span className="classical-ink">Codex</span>
                    <span className="gold-text">&nbsp;{'</>'}</span>
                  </p>
                </div>

                {/* Big title */}
                <h1 className="serif-display leading-[0.92] tracking-[0.03em] mt-5 classical-fade-up classical-delay-2">
                  <span className="block text-[clamp(48px,8vw,108px)] font-medium classical-ink">
                    WRITING
                  </span>
                </h1>

                {/* Subtitle */}
                <p className="mt-4 serif-body italic text-[15px] sm:text-[17px] classical-ink-muted classical-fade-up classical-delay-3">
                  Essays, field notes, and reflections on technology, design, and life.
                </p>
                <span className="gold-divider w-[min(280px,40vw)] mt-4 inline-block classical-fade-up classical-delay-4" />
              </div>

              {/* Right-side count badge */}
              {posts.length > 0 && (
                <div className="hidden lg:flex flex-col items-end gap-2 classical-fade-up classical-delay-4">
                  <span className="serif-display text-[10px] tracking-[0.42em] uppercase classical-ink-muted">
                    Volume
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="serif-display text-[44px] leading-none font-medium gold-text tabular-nums">
                      {posts.length.toString().padStart(2, '0')}
                    </span>
                    <span className="serif-body italic text-[14px] classical-ink-muted">
                      {posts.length === 1 ? 'entry' : 'entries'}
                    </span>
                  </div>
                  <span className="gold-divider w-20" />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Body — white parchment panel ──────────────────────────── */}
        <div className="relative bg-white border-t border-[hsl(var(--ink)/0.06)]">
          <div className="max-w-6xl mx-auto px-6 sm:px-10 py-12 lg:py-16">
            {fetchError ? (
              <p className="serif-body italic text-[15px] text-destructive">
                Failed to load posts: {fetchError.message}
              </p>
            ) : posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center classical-fade-up">
                <span
                  className="w-2 h-2 rounded-full mb-5"
                  style={{ backgroundColor: 'hsl(var(--gold))' }}
                  aria-hidden
                />
                <p className="serif-body italic text-[15px] classical-ink-muted">
                  The chronicle is silent for now.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-[180px_1fr] gap-10 lg:gap-16">
                {/* Left rail — year nav (sticky on desktop) */}
                <aside className="hidden lg:block">
                  <div className="sticky top-28">
                    <h2 className="serif-display text-[12px] tracking-[0.4em] uppercase classical-ink mb-3">
                      Annals
                    </h2>
                    <span className="block gold-divider w-16 mb-5" />
                    <ul className="flex flex-col gap-2">
                      {years.map((year) => {
                        const count = posts.filter(
                          (post) => new Date(post.created_at).getFullYear() === year
                        ).length
                        return (
                          <li key={year}>
                            <a
                              href={`#year-${year}`}
                              className="group flex items-baseline justify-between gap-3 py-1.5 classical-sans transition-colors hover:[&_span]:gold-text"
                            >
                              <span className="serif-display text-[14px] tracking-[0.18em] classical-ink tabular-nums">
                                {year}
                              </span>
                              <span className="classical-sans text-[11px] classical-ink-muted tabular-nums">
                                {count.toString().padStart(2, '0')}
                              </span>
                            </a>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                </aside>

                {/* Posts column */}
                <div className="space-y-14 lg:space-y-16">
                  {years.map((year, yearIndex) => {
                    const yearPosts = posts.filter(
                      (post) => new Date(post.created_at).getFullYear() === year
                    )
                    return (
                      <section
                        key={year}
                        id={`year-${year}`}
                        className={`classical-fade-up ${yearIndex === 0 ? '' : 'classical-delay-' + Math.min(yearIndex + 1, 5)}`}
                      >
                        {/* Year header */}
                        <header className="flex items-baseline gap-4 mb-6">
                          <h2 className="serif-display text-[28px] sm:text-[32px] font-medium classical-ink tabular-nums leading-none">
                            {year}
                          </h2>
                          <span
                            aria-hidden
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: 'hsl(var(--gold))' }}
                          />
                          <span className="serif-body italic text-[12px] classical-ink-muted">
                            {yearPosts.length === 1 ? 'one entry' : `${yearPosts.length} entries`}
                          </span>
                          <span className="flex-1 gold-divider-soft" />
                        </header>

                        {/* Posts list */}
                        <ul className="flex flex-col">
                          {yearPosts.map((post) => {
                            const d = new Date(post.created_at)
                            const day = d.getDate().toString().padStart(2, '0')
                            const month = formatRomanMonth(d)
                            return (
                              <li
                                key={post.id}
                                className="group border-t border-[hsl(var(--ink)/0.08)] last:border-b blog-post-item"
                              >
                                <Link
                                  href={`/blog/${post.slug}`}
                                  className="block py-5 sm:py-6 transition-colors hover:bg-[hsl(var(--cream)/0.5)] -mx-3 px-3 rounded-sm"
                                >
                                  <div className="grid grid-cols-[auto_1fr_auto] items-baseline gap-4 sm:gap-6">
                                    {/* Roman date */}
                                    <div className="flex items-baseline gap-1.5 shrink-0 min-w-[78px]">
                                      <span className="serif-display text-[18px] sm:text-[20px] classical-ink tabular-nums leading-none">
                                        {day}
                                      </span>
                                      <span className="serif-display text-[11px] tracking-[0.2em] gold-text leading-none">
                                        {month}
                                      </span>
                                    </div>

                                    {/* Title + tags */}
                                    <div className="min-w-0">
                                      <h3 className="classical-sans text-[15px] sm:text-[16px] font-medium classical-ink leading-snug group-hover:gold-text transition-colors">
                                        {post.title}
                                      </h3>
                                      {post.tags && post.tags.length > 0 && (
                                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                                          {post.tags.slice(0, 3).map((tag) => (
                                            <span
                                              key={tag}
                                              className="serif-body italic text-[12px] classical-ink-muted"
                                            >
                                              <span className="gold-text mr-0.5">·</span>
                                              {tag}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>

                                    {/* Read arrow */}
                                    <span
                                      aria-hidden
                                      className="classical-sans text-[12px] tracking-[0.2em] uppercase gold-text shrink-0 hidden sm:inline-flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      Read
                                      <span className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
                                    </span>
                                  </div>
                                </Link>
                              </li>
                            )
                          })}
                        </ul>
                      </section>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <SiteFooter
          social={social}
          contactEmail={contactEmail}
          ownerName="Umutcan Edizaslan"
          initial="U"
        />
      </main>
    </>
  )
}
