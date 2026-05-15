import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Suspense, cache } from 'react'
import { ArrowLeft } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { supabase, type Post } from '@/lib/supabase/config'
import { SocialShare } from '@/components/social-share'
import { RelatedPosts } from '@/components/related-posts'
import { LanguageSwitcher } from '@/components/language-switcher'
import { resolveCanonicalUrl, toAbsoluteSiteUrl } from '@/lib/site'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'

export const revalidate = 3600

type PageParams = Promise<{
  slug: string
}>

type Props = {
  params: PageParams
}

const FALLBACK_CONTACT_EMAIL = 'contact@uc4n.com'

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']

function formatRomanMonth(date: Date): string {
  const monthIdx = date.getMonth()
  return ROMAN_NUMERALS[monthIdx] ?? `${monthIdx + 1}`
}

export async function generateStaticParams() {
  const { data: posts } = await supabase
    .from('posts')
    .select('slug')
    .eq('published', true)

  return (posts || []).map((post) => ({
    slug: post.slug,
  }))
}

const getPost = cache(async (slug: string): Promise<Post | null> => {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) {
    console.error('Error fetching post:', error)
    return null
  }

  if (!data) return null

  const transformedPost: Post = {
    ...data,
    content: data.content ?? '',
    published: data.published ?? false,
    tags: data.tags ?? undefined,
    meta_title: data.meta_title ?? undefined,
    meta_description: data.meta_description ?? undefined,
    canonical_url: data.canonical_url ?? undefined,
    og_image_url: data.og_image_url ?? undefined,
    noindex: data.noindex ?? undefined,
    translations: data.translations ? (data.translations as { [key: string]: { title: string; content: string; slug: string } }) : undefined
  }

  return transformedPost
})

const getContactEmail = cache(async (): Promise<string> => {
  const { data } = await supabase
    .from('profiles')
    .select('social_links')
    .limit(1)
    .maybeSingle()
  if (
    data?.social_links &&
    typeof data.social_links === 'object' &&
    !Array.isArray(data.social_links)
  ) {
    const links = data.social_links as Record<string, unknown>
    if (typeof links.email === 'string' && links.email) return links.email
  }
  return FALLBACK_CONTACT_EMAIL
})

const getSocial = cache(async () => {
  const { data } = await supabase
    .from('profiles')
    .select('social_links')
    .limit(1)
    .maybeSingle()
  if (
    data?.social_links &&
    typeof data.social_links === 'object' &&
    !Array.isArray(data.social_links)
  ) {
    const links = data.social_links as Record<string, unknown>
    return {
      twitter: typeof links.twitter === 'string' ? links.twitter : undefined,
      linkedin: typeof links.linkedin === 'string' ? links.linkedin : undefined,
      github: typeof links.github === 'string' ? links.github : undefined,
      email: typeof links.email === 'string' ? links.email : undefined,
    }
  }
  return undefined
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params
  const post = await getPost(resolvedParams.slug)

  if (!post) {
    return {
      title: 'Post Not Found',
      description: 'The requested blog post could not be found.',
    }
  }

  const excerpt = post.content
    .replace(/\#+\s/g, '')
    .replace(/\*\*|\*|\_\_|\_|\~\~|\`/g, '')
    .replace(/\!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .replace(/\n/g, ' ')
    .slice(0, 200)
    .trim() + '...'

  const canonicalUrl = resolveCanonicalUrl(post.canonical_url, `/blog/${post.slug}`)

  return {
    title: post.meta_title || post.title,
    description: post.meta_description || excerpt,
    keywords: post.tags || ['blog', 'article', 'technology'],
    authors: [{ name: 'Umutcan Edizaslan' }],
    robots: post.noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      type: 'article',
      url: toAbsoluteSiteUrl(`/blog/${post.slug}`),
      title: post.meta_title || post.title,
      description: post.meta_description || excerpt,
      publishedTime: post.created_at,
      modifiedTime: post.updated_at || post.created_at,
      authors: ['Umutcan Edizaslan'],
      tags: post.tags || ['blog', 'article', 'technology'],
      images: post.og_image_url ? [post.og_image_url] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.meta_title || post.title,
      description: post.meta_description || excerpt,
      images: post.og_image_url ? [post.og_image_url] : undefined,
    },
    alternates: {
      canonical: canonicalUrl,
    }
  }
}

function generateBlogStructuredData(post: Post, wordCount: number, readingTime: number, canonicalUrl: string) {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.content.slice(0, 200).replace(/\n/g, ' ').trim() + '...',
    author: {
      '@type': 'Person',
      name: 'Umutcan Edizaslan',
      url: toAbsoluteSiteUrl('/'),
    },
    publisher: {
      '@type': 'Person',
      name: 'Umutcan Edizaslan',
      url: toAbsoluteSiteUrl('/'),
    },
    datePublished: post.created_at,
    dateModified: post.updated_at || post.created_at,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl,
    },
    wordCount,
    timeRequired: `PT${readingTime}M`,
    inLanguage: post.language_code || 'en',
    url: canonicalUrl,
  }
  if (post.og_image_url) data.image = post.og_image_url
  if (post.tags && post.tags.length > 0) data.keywords = post.tags.join(', ')
  return data
}

function generateBreadcrumbStructuredData(post: Post) {
  const base = toAbsoluteSiteUrl('/')
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: base },
      { '@type': 'ListItem', position: 2, name: 'Writing', item: toAbsoluteSiteUrl('/blog') },
      { '@type': 'ListItem', position: 3, name: post.title, item: toAbsoluteSiteUrl(`/blog/${post.slug}`) },
    ],
  }
}

export default async function Page({ params }: Props) {
  const resolvedParams = await params
  const [post, contactEmail, social] = await Promise.all([
    getPost(resolvedParams.slug),
    getContactEmail(),
    getSocial(),
  ])

  if (!post) {
    return (
      <>
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
        <div
          aria-hidden
          className="fixed inset-0 -z-10"
          style={{ backgroundColor: 'hsl(var(--cream) / 0.55)' }}
        />
        <SiteNav contactEmail={contactEmail} />
        <main className="relative classical-ink min-h-screen flex items-center justify-center px-6">
          <div className="text-center max-w-md classical-fade-up">
            <p className="serif-display text-[11px] tracking-[0.4em] uppercase gold-text">
              Codex&nbsp;·&nbsp;Lost Folio
            </p>
            <span className="gold-divider w-24 mx-auto mt-4 inline-block" />
            <h1 className="serif-display text-[44px] sm:text-[56px] font-medium classical-ink mt-6 leading-[0.95]">
              NOT FOUND
            </h1>
            <p className="serif-body italic text-[15px] classical-ink-muted mt-4">
              The chronicle you seek has yet to be inscribed — or has been withdrawn from the shelf.
            </p>
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 mt-8 serif-display text-[11px] tracking-[0.32em] uppercase classical-ink-muted hover:gold-text transition-colors group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform duration-300" strokeWidth={1.6} />
              Return to Codex
            </Link>
          </div>
        </main>
      </>
    )
  }

  const wordCount = post.content.trim().split(/\s+/).length
  const readingTime = Math.ceil(wordCount / 200)
  const canonicalUrl = resolveCanonicalUrl(post.canonical_url, `/blog/${post.slug}`)
  const structuredData = generateBlogStructuredData(post, wordCount, readingTime, canonicalUrl)
  const breadcrumbStructuredData = generateBreadcrumbStructuredData(post)

  const d = new Date(post.created_at)
  const day = d.getDate().toString().padStart(2, '0')
  const month = formatRomanMonth(d)
  const year = d.getFullYear()
  const longDate = d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbStructuredData) }}
      />

      {/* Full-page marble background — scoped to this post */}
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
      <div
        aria-hidden
        className="fixed inset-0 -z-10"
        style={{ backgroundColor: 'hsl(var(--cream) / 0.55)' }}
      />

      <SiteNav contactEmail={contactEmail} />

      <main className="relative classical-ink min-h-screen">
        {/* ── Header band over marble ────────────────────────────── */}
        <section className="relative w-full pt-28 sm:pt-32 lg:pt-36 pb-10 sm:pb-14">
          <div className="max-w-5xl mx-auto px-6 sm:px-10">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <Link
                href="/blog"
                className="classical-fade-up inline-flex items-center gap-2 serif-display text-[11px] tracking-[0.32em] uppercase classical-ink-muted hover:gold-text transition-colors group"
              >
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform duration-300" strokeWidth={1.6} />
                Return to Codex
              </Link>

              {post.translations && Object.keys(post.translations).length > 0 && (
                <div className="classical-fade-up classical-delay-1">
                  <LanguageSwitcher
                    currentLanguage={post.language_code || 'en'}
                    availableLanguages={Object.entries(post.translations).map(([code, translation]) => ({
                      code,
                      slug: translation.slug,
                      title: translation.title,
                    }))}
                    baseSlug={post.slug}
                  />
                </div>
              )}
            </div>

            {/* Pretitle: Roman date marker */}
            <div className="mt-10 sm:mt-14 flex items-center gap-3 sm:gap-4 classical-fade-up classical-delay-1">
              <span className="gold-divider w-10 sm:w-14 inline-block" />
              <p className="serif-body italic text-[11px] sm:text-[12px] tracking-[0.5em] uppercase whitespace-nowrap">
                <span className="gold-text">//&nbsp;</span>
                <span className="classical-ink tabular-nums">
                  {day}&nbsp;·&nbsp;{month}&nbsp;·&nbsp;{year}
                </span>
                <span className="gold-text">&nbsp;{'</>'}</span>
              </p>
            </div>

            {/* Title */}
            <h1 className="serif-display leading-[0.96] tracking-[0.02em] mt-5 classical-fade-up classical-delay-2 text-[clamp(34px,5.2vw,64px)] font-medium classical-ink">
              {post.title}
            </h1>

            <span className="gold-divider w-[min(280px,40vw)] mt-5 inline-block classical-fade-up classical-delay-3" />

            {/* Meta row */}
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 classical-fade-up classical-delay-4">
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: 'hsl(var(--gold))' }}
                />
                <time
                  dateTime={post.created_at}
                  className="serif-body italic text-[13px] sm:text-[14px] classical-ink-muted"
                >
                  {longDate}
                </time>
              </div>
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: 'hsl(var(--gold))' }}
                />
                <span className="serif-body italic text-[13px] sm:text-[14px] classical-ink-muted tabular-nums">
                  {wordCount.toLocaleString()} words
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: 'hsl(var(--gold))' }}
                />
                <span className="serif-body italic text-[13px] sm:text-[14px] classical-ink-muted tabular-nums">
                  {readingTime} min read
                </span>
              </div>

              <div className="ml-auto">
                <SocialShare title={post.title} url={canonicalUrl} />
              </div>
            </div>

            {post.tags && post.tags.length > 0 && (
              <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 classical-fade-up classical-delay-5">
                {post.tags.slice(0, 6).map((tag) => (
                  <Link
                    key={tag}
                    href={`/tags/${encodeURIComponent(tag)}`}
                    className="serif-body italic text-[12px] sm:text-[13px] classical-ink-muted hover:gold-text transition-colors"
                  >
                    <span className="gold-text mr-0.5">·</span>
                    {tag}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Body — white parchment panel ──────────────────────── */}
        <div className="relative bg-white border-t border-[hsl(var(--ink)/0.06)]">
          <div className="max-w-5xl mx-auto px-6 sm:px-10 py-12 lg:py-16">
            <article className="max-w-3xl mx-auto">
              <div className="classical-prose">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeRaw, rehypeKatex]}
                  components={{
                    h1: ({ children, ...props }) => (
                      <h2
                        className="serif-display text-[26px] sm:text-[30px] font-medium classical-ink mt-12 mb-5 leading-tight tracking-[0.02em]"
                        {...props}
                      >
                        {children}
                      </h2>
                    ),
                    h2: ({ children, ...props }) => (
                      <h2
                        className="serif-display text-[22px] sm:text-[26px] font-medium classical-ink mt-10 mb-4 leading-tight tracking-[0.02em]"
                        {...props}
                      >
                        {children}
                      </h2>
                    ),
                    h3: ({ children, ...props }) => (
                      <h3
                        className="serif-display text-[18px] sm:text-[20px] font-medium classical-ink mt-8 mb-3 leading-tight tracking-[0.03em]"
                        {...props}
                      >
                        {children}
                      </h3>
                    ),
                    p: ({ children, ...props }) => (
                      <p
                        className="post-body text-[19px] sm:text-[20px] leading-[1.7] classical-ink mb-6"
                        {...props}
                      >
                        {children}
                      </p>
                    ),
                    ul: ({ children, ...props }) => (
                      <ul className="post-body text-[19px] sm:text-[20px] leading-[1.7] classical-ink mb-6 pl-6 list-disc marker:text-[hsl(var(--gold))] space-y-2" {...props}>
                        {children}
                      </ul>
                    ),
                    ol: ({ children, ...props }) => (
                      <ol className="post-body text-[19px] sm:text-[20px] leading-[1.7] classical-ink mb-6 pl-6 list-decimal marker:text-[hsl(var(--gold))] marker:font-medium space-y-2" {...props}>
                        {children}
                      </ol>
                    ),
                    li: ({ children, ...props }) => (
                      <li className="pl-1" {...props}>
                        {children}
                      </li>
                    ),
                    blockquote: ({ children, ...props }) => (
                      <blockquote
                        className="my-8 pl-6 py-2 border-l-2 post-body italic text-[19px] sm:text-[21px] leading-[1.65] classical-ink-muted"
                        style={{ borderColor: 'hsl(var(--gold))' }}
                        {...props}
                      >
                        {children}
                      </blockquote>
                    ),
                    code: ({ children, ...props }) => (
                      <code
                        className="roman-inline text-[15px] sm:text-[16px] px-1.5 py-0.5 rounded-sm"
                        style={{ backgroundColor: 'hsl(var(--cream))', color: 'hsl(var(--ink))' }}
                        {...props}
                      >
                        {children}
                      </code>
                    ),
                    pre: ({ children, ...props }) => (
                      <div className="roman-tablet my-8">
                        <div className="roman-tablet-header">
                          <span className="gold-divider w-6 inline-block" />
                          <span>Codex</span>
                          <span className="gold-divider w-6 inline-block" />
                        </div>
                        <pre
                          className="roman-tablet-body text-[15px] sm:text-[16px] leading-[1.6] p-5 overflow-x-auto"
                          {...props}
                        >
                          {children}
                        </pre>
                      </div>
                    ),
                    img: ({ src, alt }) => (
                      <figure className="my-10">
                        <Image
                          src={typeof src === 'string' ? src : ''}
                          alt={alt || ''}
                          width={900}
                          height={500}
                          className="w-full rounded-sm border"
                          style={{ borderColor: 'hsl(var(--ink) / 0.08)' }}
                        />
                        {alt && (
                          <figcaption className="text-center serif-body italic text-[13px] classical-ink-muted mt-3">
                            {alt}
                          </figcaption>
                        )}
                      </figure>
                    ),
                    table: (props) => (
                      <div className="overflow-x-auto my-8 border rounded-sm" style={{ borderColor: 'hsl(var(--ink) / 0.08)' }}>
                        <table className="border-collapse w-full" {...props} />
                      </div>
                    ),
                    thead: (props) => (
                      <thead style={{ backgroundColor: 'hsl(var(--cream))' }} {...props} />
                    ),
                    tr: (props) => (
                      <tr className="border-b" style={{ borderColor: 'hsl(var(--ink) / 0.06)' }} {...props} />
                    ),
                    th: (props) => (
                      <th
                        className="py-3 px-4 text-left serif-display text-[11px] tracking-[0.2em] uppercase classical-ink"
                        {...props}
                      />
                    ),
                    td: (props) => (
                      <td className="py-3 px-4 post-body text-[17px] classical-ink" {...props} />
                    ),
                    audio: (props) => (
                      <div
                        className="my-8 p-4 rounded-sm border"
                        style={{ backgroundColor: 'hsl(var(--cream))', borderColor: 'hsl(var(--ink) / 0.08)' }}
                      >
                        <audio controls className="w-full" src={props.src} {...props} />
                      </div>
                    ),
                    a: ({ children, href, ...props }) => (
                      <a
                        href={href}
                        className="gold-text underline decoration-[hsl(var(--gold)/0.4)] hover:decoration-[hsl(var(--gold))] underline-offset-[3px] transition-colors"
                        {...props}
                      >
                        {children}
                      </a>
                    ),
                    hr: () => (
                      <div className="my-12 flex items-center justify-center gap-3">
                        <span className="gold-divider w-24" />
                        <span
                          aria-hidden
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: 'hsl(var(--gold))' }}
                        />
                        <span className="gold-divider w-24" />
                      </div>
                    ),
                  }}
                >
                  {post.content}
                </ReactMarkdown>
              </div>

              {/* Closing ornament */}
              <div className="mt-16 flex items-center justify-center gap-3">
                <span className="gold-divider w-20" />
                <span
                  aria-hidden
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: 'hsl(var(--gold))' }}
                />
                <span className="gold-divider w-20" />
              </div>
              <p className="text-center mt-4 serif-display text-[10px] tracking-[0.42em] uppercase classical-ink-muted">
                Finis
              </p>

              {/* All Tags */}
              {post.tags && post.tags.length > 6 && (
                <div className="mt-14 pt-8 border-t" style={{ borderColor: 'hsl(var(--ink) / 0.06)' }}>
                  <h3 className="serif-display text-[12px] tracking-[0.4em] uppercase classical-ink">
                    Related Topics
                  </h3>
                  <span className="block gold-divider w-16 mt-3 mb-5" />
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {post.tags.map((tag) => (
                      <Link
                        key={tag}
                        href={`/tags/${encodeURIComponent(tag)}`}
                        className="serif-body italic text-[14px] classical-ink-muted hover:gold-text transition-colors"
                      >
                        <span className="gold-text mr-1">·</span>
                        {tag}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Posts */}
              {post.tags && post.tags.length > 0 && (
                <div className="mt-14 pt-8 border-t" style={{ borderColor: 'hsl(var(--ink) / 0.06)' }}>
                  <Suspense
                    fallback={
                      <div className="animate-pulse">
                        <div className="h-4 w-32 mb-5" style={{ backgroundColor: 'hsl(var(--cream))' }} />
                        <div className="space-y-4">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="border-b pb-4" style={{ borderColor: 'hsl(var(--ink) / 0.06)' }}>
                              <div className="h-5 w-3/4 mb-2" style={{ backgroundColor: 'hsl(var(--cream))' }} />
                              <div className="h-4 w-1/4" style={{ backgroundColor: 'hsl(var(--cream))' }} />
                            </div>
                          ))}
                        </div>
                      </div>
                    }
                  >
                    <RelatedPosts currentPostId={post.id} currentPostTags={post.tags} />
                  </Suspense>
                </div>
              )}
            </article>
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
