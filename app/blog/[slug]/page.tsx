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
import 'katex/dist/katex.min.css' // KaTeX CSS
import { supabase, type Post } from '@/lib/supabase/config'
import { env } from '@/env.mjs'
import { SocialShare } from '@/components/social-share'
import { SEOBreadcrumb } from '@/components/ui/seo-breadcrumb'
import { RelatedPosts } from '@/components/related-posts'
import { LanguageSwitcher } from '@/components/language-switcher'

export const dynamic = 'force-dynamic'

type PageParams = Promise<{
  slug: string
}>

type Props = {
  params: PageParams
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

// React.cache for per-request deduplication (shared between generateMetadata and page)
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

  return data
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params
  // Use cached getPost to deduplicate with page component
  const post = await getPost(resolvedParams.slug)

  if (!post) {
    return {
      title: 'Post Not Found',
      description: 'The requested blog post could not be found.',
    }
  }

  // Extract a plain text excerpt from the markdown content
  const excerpt = post.content
    .replace(/\#+\s/g, '') // Remove markdown headings
    .replace(/\*\*|\*|\_\_|\_|\~\~|\`/g, '') // Remove bold, italic, strikethrough, code
    .replace(/\!\[.*?\]\(.*?\)/g, '') // Remove images
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Replace links with just their text
    .replace(/\n/g, ' ') // Replace newlines with spaces
    .slice(0, 200) // Take first 200 chars
    .trim() + '...' // Add ellipsis

  return {
    title: post.meta_title || post.title,
    description: post.meta_description || excerpt,
    keywords: post.tags || ['blog', 'article', 'technology'],
    authors: [{ name: 'Umutcan Edizaslan' }],
    robots: post.noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      type: 'article',
      url: `${env.NEXT_PUBLIC_SITE_URL}/blog/${post.slug}`,
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
      canonical: post.canonical_url || `${env.NEXT_PUBLIC_SITE_URL}/blog/${post.slug}`,
    }
  }
}

// Generate structured data for blog post
function generateBlogStructuredData(post: Post, wordCount: number, readingTime: number) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.content.slice(0, 200).replace(/\n/g, ' ').trim() + '...',
    author: {
      '@type': 'Person',
      name: 'Umutcan Edizaslan',
    },
    datePublished: post.created_at,
    dateModified: post.updated_at || post.created_at,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${env.NEXT_PUBLIC_SITE_URL}/blog/${post.slug}`,
    },
    wordCount: wordCount,
    timeRequired: `PT${readingTime}M`,
  }
}

export default async function Page({ params }: Props) {
  const resolvedParams = await params
  const post = await getPost(resolvedParams.slug)

  if (!post) {
    return (
      <div className="max-w-[1000px] mx-auto px-6 py-16">
        <div className="max-w-[700px] mx-auto">
          <div className="text-destructive">
            <h1 className="text-2xl font-bold mb-4">Post Not Found</h1>
            <p className="mb-6">The requested post could not be found.</p>
            <Link 
              href="/blog"
              className="text-primary hover:underline"
            >
              Back to Blog
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const wordCount = post.content.trim().split(/\s+/).length
  const readingTime = Math.ceil(wordCount / 200)
  const structuredData = generateBlogStructuredData(post, wordCount, readingTime)

  // Breadcrumb items for this post
  const breadcrumbItems = [
    { label: 'Blog', href: '/blog' },
    { label: post.title, href: `/blog/${post.slug}`, active: true }
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <article className="max-w-3xl mx-auto">
            <div className="mb-8">
              <SEOBreadcrumb items={breadcrumbItems} />
            </div>

            <Link 
              href="/blog" 
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-200 mb-8 group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
              Back to Articles
            </Link>

            <div className="flex items-start justify-between mb-8">
              <div className="flex-1 pr-6">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight text-foreground tracking-tight">
                  {post.title}
                </h1>
              </div>
              <div className="flex-shrink-0">
                <LanguageSwitcher
                  currentLanguage={post.language_code || 'en'}
                  availableLanguages={post.translations ? Object.entries(post.translations).map(([code, translation]) => ({
                    code,
                    slug: translation.slug,
                    title: translation.title
                  })) : []}
                  baseSlug={post.slug}
                />
              </div>
            </div>

            {/* Article Meta Information */}
            <div className="bg-muted/30 rounded-2xl p-6 mb-12 border border-border/50">
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <time dateTime={post.created_at} className="font-medium">
                    {new Date(post.created_at).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </time>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="font-medium">{wordCount} words</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span className="font-medium">{readingTime} min read</span>
                </div>
                
                <div className="ml-auto flex items-center gap-3">
                  <SocialShare 
                    title={post.title}
                    url={`${env.NEXT_PUBLIC_SITE_URL}/blog/${post.slug}`}
                  />
                </div>
              </div>
              
              {post.tags && post.tags.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border/30">
                  <div className="flex flex-wrap gap-2">
                    {post.tags.slice(0, 5).map(tag => (
                      <Link 
                        key={tag} 
                        href={`/tags/${encodeURIComponent(tag)}`} 
                        className="inline-flex items-center px-3 py-1 text-xs font-medium bg-background/60 hover:bg-background text-foreground rounded-full border border-border/50 hover:border-border transition-all duration-200"
                      >
                        #{tag}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Article Content */}
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-2xl border border-border/50 shadow-sm overflow-hidden mb-12">
              <div className="p-8 lg:p-12">
                <div className="prose prose-lg prose-neutral dark:prose-invert max-w-none">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeRaw, rehypeKatex]}
                    components={{
                      h1: ({children, ...props}) => (
                        <h1 className="text-3xl font-bold mb-6 mt-8 text-foreground leading-tight" {...props}>
                          {children}
                        </h1>
                      ),
                      h2: ({children, ...props}) => (
                        <h2 className="text-2xl font-semibold mb-4 mt-8 text-foreground leading-tight" {...props}>
                          {children}
                        </h2>
                      ),
                      h3: ({children, ...props}) => (
                        <h3 className="text-xl font-semibold mb-3 mt-6 text-foreground leading-tight" {...props}>
                          {children}
                        </h3>
                      ),
                      p: ({children, ...props}) => (
                        <p className="text-base leading-relaxed mb-6 text-foreground/90 font-normal" {...props}>
                          {children}
                        </p>
                      ),
                      ul: ({children, ...props}) => (
                        <ul className="mb-6 space-y-2 pl-6" {...props}>
                          {children}
                        </ul>
                      ),
                      ol: ({children, ...props}) => (
                        <ol className="mb-6 space-y-2 pl-6" {...props}>
                          {children}
                        </ol>
                      ),
                      li: ({children, ...props}) => (
                        <li className="text-foreground/90 leading-relaxed" {...props}>
                          {children}
                        </li>
                      ),
                      blockquote: ({children, ...props}) => (
                        <blockquote className="border-l-4 border-primary/30 pl-6 py-2 my-8 bg-muted/30 rounded-r-lg italic text-foreground/80" {...props}>
                          {children}
                        </blockquote>
                      ),
                      code: ({children, ...props}) => (
                        <code className="bg-muted/60 px-2 py-1 rounded text-sm font-mono text-foreground" {...props}>
                          {children}
                        </code>
                      ),
                      pre: ({children, ...props}) => (
                        <pre className="bg-muted/40 p-4 rounded-xl overflow-x-auto my-6 border border-border/30" {...props}>
                          {children}
                        </pre>
                      ),
                      img: ({src, alt}) => (
                        <div className="my-8">
                          <Image
                            src={typeof src === 'string' ? src : ''}
                            alt={alt || ''} 
                            width={800}
                            height={400}
                            className="w-full rounded-xl border border-border/30 shadow-sm" 
                          />
                          {alt && (
                            <p className="text-center text-sm text-muted-foreground mt-2 italic">{alt}</p>
                          )}
                        </div>
                      ),
                      table: props => (
                        <div className="overflow-x-auto my-8 rounded-lg border border-border/30">
                          <table className="border-collapse w-full bg-background/50" {...props} />
                        </div>
                      ),
                      thead: props => <thead className="bg-muted/50" {...props} />,
                      tr: props => <tr className="border-b border-border/20" {...props} />,
                      th: props => <th className="py-3 px-4 text-left font-semibold text-foreground" {...props} />,
                      td: props => <td className="py-3 px-4 text-foreground/90" {...props} />,
                      audio: props => (
                        <div className="my-8 p-4 bg-muted/30 rounded-xl border border-border/30">
                          <audio
                            controls
                            className="w-full"
                            src={props.src}
                            {...props}
                          />
                        </div>
                      ),
                      a: ({children, href, ...props}) => (
                        <a 
                          href={href} 
                          className="text-primary hover:text-primary/80 underline decoration-primary/30 hover:decoration-primary/60 transition-colors font-medium"
                          {...props}
                        >
                          {children}
                        </a>
                      )
                    }}
                  >
                    {post.content}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
            {/* All Tags Section */}
            {post.tags && post.tags.length > 5 && (
              <div className="bg-muted/20 rounded-2xl p-6 mb-12 border border-border/30">
                <h3 className="text-lg font-semibold mb-4 text-foreground">Related Topics</h3>
                <div className="flex flex-wrap gap-2">
                  {post.tags.map(tag => (
                    <Link 
                      key={tag} 
                      href={`/tags/${encodeURIComponent(tag)}`} 
                      className="inline-flex items-center px-3 py-2 text-sm font-medium bg-background hover:bg-muted text-foreground rounded-lg border border-border/50 hover:border-border transition-all duration-200 hover:shadow-sm"
                    >
                      #{tag}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            
            {/* Related Posts - wrapped in Suspense for streaming */}
            <div className="mt-16 pt-8">
              {post.tags && post.tags.length > 0 && (
                <div className="bg-gradient-to-r from-muted/20 to-muted/10 rounded-2xl p-8 border border-border/30">
                  <Suspense fallback={
                    <div className="animate-pulse">
                      <div className="h-6 bg-muted rounded w-32 mb-4"></div>
                      <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="border-b border-border pb-4">
                            <div className="h-5 bg-muted rounded w-3/4 mb-2"></div>
                            <div className="h-4 bg-muted rounded w-1/4"></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  }>
                    <RelatedPosts
                      currentPostId={post.id}
                      currentPostTags={post.tags}
                      className=""
                    />
                  </Suspense>
                </div>
              )}
            </div>
          </article>
        </div>
      </div>
    </>
  )
}