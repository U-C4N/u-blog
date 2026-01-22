import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { supabase, type Post } from '@/lib/supabase/config'
import { env } from '@/env.mjs'

export const revalidate = 3600 // Revalidate every hour

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Thoughts on technology, design, and life by Umutcan Edizaslan',
  keywords: ['blog', 'technology', 'design', 'software engineering', 'AI'],
  openGraph: {
    type: 'website',
    url: `${env.NEXT_PUBLIC_SITE_URL}/blog`,
    title: 'Blog | U-BLOG',
    description: 'Thoughts on technology, design, and life by Umutcan Edizaslan',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog | U-BLOG',
    description: 'Thoughts on technology, design, and life by Umutcan Edizaslan',
  },
  alternates: {
    canonical: `${env.NEXT_PUBLIC_SITE_URL}/blog`,
  }
}

// Generate structured data for blog page
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
      url: `${env.NEXT_PUBLIC_SITE_URL}/blog/${post.slug}`
    }))
  }
}

export default async function BlogPage() {
  const { data: posts, error } = await supabase
    .from('posts')
    .select('*')
    .eq('published', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching posts:', error)
    return (
      <main className="max-w-[1000px] mx-auto px-6 py-16">
        <div className="max-w-[650px]">
          <div className="text-destructive">
            <p>Failed to load posts: {error.message}</p>
          </div>
        </div>
      </main>
    )
  }

  // Use toSorted() for immutable sorting
  const years = Array.from(new Set((posts || []).map(post =>
    new Date(post.created_at).getFullYear()
  ))).toSorted((a, b) => b - a)

  const structuredData = generateBlogListingStructuredData(posts || [])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <main className="max-w-[1000px] mx-auto px-6 py-16">
        <div className="max-w-[650px]">
          <div className="mb-12">
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 text-[15px] text-muted-foreground hover:text-foreground transition-colors mb-8"
            >
              <ArrowLeft className="w-4 h-4" />
              Index
            </Link>
            
            <h1 className="text-[22px] font-medium mb-2">Writing</h1>
            <p className="text-[15px] text-muted-foreground">
              Thoughts on technology, design, and life
            </p>
          </div>

          {posts?.length === 0 ? (
            <p className="text-muted-foreground">No posts yet.</p>
          ) : (
            <div className="space-y-12">
              {years.map(year => (
                <section key={year}>
                  <h2 className="text-[17px] font-medium mb-6">{year}</h2>
                  <div className="space-y-4">
                    {posts
                      .filter(post => new Date(post.created_at).getFullYear() === year)
                      .map(post => (
                        <div key={post.id} className="flex items-baseline justify-between gap-8 blog-post-item">
                          <Link 
                            href={`/blog/${post.slug}`}
                            className="text-[15px] hover:underline"
                          >
                            {post.title}
                          </Link>
                          {post.tags && post.tags.length > 0 && (
                            <div className="flex gap-2 mr-auto ml-4">
                              {post.tags.slice(0,2).map((tag: string) => (
                                <Link key={tag} href={`/tags/${encodeURIComponent(tag)}`} className="text-xs px-2 py-0.5 rounded bg-muted hover:bg-muted/80">#{tag}</Link>
                              ))}
                            </div>
                          )}
                          <time 
                            dateTime={post.created_at}
                            className="text-[15px] text-muted-foreground whitespace-nowrap"
                          >
                            {new Date(post.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </time>
                        </div>
                      ))
                    }
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  )
}