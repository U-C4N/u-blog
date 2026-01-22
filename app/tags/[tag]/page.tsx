import type { Metadata } from 'next'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/config'
import { env } from '@/env.mjs'

type PageParams = Promise<{ tag: string }>

type Props = { params: PageParams }

export async function generateStaticParams() {
  const { data: posts } = await supabase
    .from('posts')
    .select('tags')
    .eq('published', true)
  const tags = new Set<string>()
  ;(posts || []).forEach(p => (p.tags || []).forEach((t: string) => tags.add(t)))
  return Array.from(tags).map(tag => ({ tag }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tag } = await params
  return {
    title: `#${tag} posts`,
    description: `Posts tagged with ${tag}`,
    alternates: { canonical: `${env.NEXT_PUBLIC_SITE_URL}/tags/${encodeURIComponent(tag)}` },
  }
}

export default async function TagPage({ params }: Props) {
  const { tag } = await params
  // Filter in database using 'cs' (contains) operator instead of fetching all and filtering in memory
  const { data: filtered } = await supabase
    .from('posts')
    .select('*')
    .eq('published', true)
    .contains('tags', [tag])
    .order('created_at', { ascending: false })

  const posts = filtered || []

  return (
    <main className="max-w-[1000px] mx-auto px-6 py-16">
      <h1 className="text-2xl font-bold mb-6">#{tag}</h1>
      {posts.length === 0 ? (
        <p className="text-muted-foreground">No posts for this tag.</p>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <div key={post.id} className="flex items-baseline justify-between gap-8">
              <Link href={`/blog/${post.slug}`} className="text-[15px] hover:underline">{post.title}</Link>
              <time dateTime={post.created_at} className="text-[15px] text-muted-foreground whitespace-nowrap">
                {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </time>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}


