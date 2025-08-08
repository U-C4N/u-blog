import type { Metadata } from 'next'
import Link from 'next/link'
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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params
  const { data: post } = await supabase
    .from('posts')
    .select('*')
    .eq('slug', resolvedParams.slug)
    .single()

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

async function getPost(slug: string): Promise<Post | null> {
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
      <div className="max-w-[1000px] mx-auto px-6 py-16">
        <article className="max-w-[700px] mx-auto">
          <div className="mb-8">
            <SEOBreadcrumb items={breadcrumbItems} />
          </div>

          <Link 
            href="/blog" 
            className="inline-flex items-center gap-2 text-[15px] text-muted-foreground hover:text-foreground transition-colors mb-12"
          >
            <ArrowLeft className="w-4 h-4" />
            Writing
          </Link>

          <h1 className="text-[40px] font-bold leading-tight mb-4">
            {post.title}
          </h1>

          <div className="flex items-center gap-2 text-[15px] text-muted-foreground mb-12">
            <time dateTime={post.created_at}>{new Date(post.created_at).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}</time>
            <span>•</span>
            <span>{wordCount} words</span>
            <span>•</span>
            <span>{readingTime} min read</span>
            {post.tags && post.tags.length > 0 && (
              <>
                <span>•</span>
                <div className="flex flex-wrap gap-1">
                  {post.tags.slice(0, 3).map(tag => (
                    <Link key={tag} href={`/tags/${encodeURIComponent(tag)}`} className="text-muted-foreground hover:underline">#{tag}</Link>
                  ))}
                </div>
              </>
            )}
            <span>•</span>
            <SocialShare 
              title={post.title}
              url={`${env.NEXT_PUBLIC_SITE_URL}/blog/${post.slug}`}
            />
          </div>

          <div className="prose prose-lg prose-neutral dark:prose-invert max-w-none">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeRaw, rehypeKatex]}
              components={{
                table: props => (
                  <div className="overflow-x-auto my-8">
                    <table className="border-collapse w-full" {...props} />
                  </div>
                ),
                thead: props => <thead className="bg-muted/30" {...props} />,
                tr: props => <tr className="border-b border-muted" {...props} />,
                th: props => <th className="py-2 px-4 text-left font-semibold" {...props} />,
                td: props => <td className="py-2 px-4" {...props} />,
                audio: props => (
                  <div className="my-4">
                    <audio
                      controls
                      className="w-full"
                      src={props.src}
                      {...props}
                    />
                  </div>
                )
              }}
            >
              {post.content}
            </ReactMarkdown>
          </div>
          {post.tags && post.tags.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2">
              {post.tags.map(tag => (
                <Link key={tag} href={`/tags/${encodeURIComponent(tag)}`} className="text-sm px-2 py-1 rounded bg-muted hover:bg-muted/80 transition-colors">
                  #{tag}
                </Link>
              ))}
            </div>
          )}
          
          {/* Related Posts */}
          <div className="mt-16 pt-8 border-t border-border">
            {post.tags && post.tags.length > 0 && (
              <RelatedPosts 
                currentPostId={post.id}
                currentPostTags={post.tags}
                className="mb-12"
              />
            )}
          </div>
        </article>
      </div>
    </>
  )
}