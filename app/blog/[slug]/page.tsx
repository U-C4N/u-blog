import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { supabase, type Post } from '@/lib/supabase/config'

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

  return {
    title: post?.title || 'Blog Post',
    description: post?.content?.slice(0, 160) || 'Read this interesting blog post',
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

  return (
    <div className="max-w-[1000px] mx-auto px-6 py-16">
      <article className="max-w-[700px] mx-auto">
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
          <time>{new Date(post.created_at).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
          })}</time>
          <span>•</span>
          <span>{wordCount} words</span>
          <span>•</span>
          <span>{readingTime} min read</span>
        </div>

        <div className="prose prose-lg prose-neutral dark:prose-invert max-w-none">
          <ReactMarkdown>{post.content}</ReactMarkdown>
        </div>
      </article>
    </div>
  )
}