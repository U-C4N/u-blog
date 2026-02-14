import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { supabase, type Post } from '@/lib/supabase/config'
import { env } from '@/env.mjs'

export const dynamic = 'force-dynamic'

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
  const { data: postsRaw, error } = await supabase
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

  // Veritabanından gelen nullable değerleri Post tipine uygun hale getir
  const posts: Post[] = (postsRaw || []).map((post) => ({
    ...post,
    content: post.content ?? '',
    published: post.published ?? false,
    tags: post.tags ?? undefined,
    meta_title: post.meta_title ?? undefined,
    meta_description: post.meta_description ?? undefined,
    canonical_url: post.canonical_url ?? undefined,
    og_image_url: post.og_image_url ?? undefined,
    noindex: post.noindex ?? undefined,
    translations: post.translations ? (post.translations as { [key: string]: { title: string; content: string; slug: string } }) : undefined
  }))

  // Use toSorted() for immutable sorting
  const years = Array.from(new Set(posts.map(post =>
    new Date(post.created_at).getFullYear()
  ))).toSorted((a, b) => b - a)

  const structuredData = generateBlogListingStructuredData(posts)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <main className="max-w-[1000px] mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="max-w-[700px]">
          {/* Header */}
          <div className="mb-14 animate-fade-in-up stagger-1">
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 text-[15px] text-muted-foreground hover:text-foreground transition-all duration-200 mb-8 group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
              Index
            </Link>
            
            <h1 className="text-[24px] font-semibold mb-2 tracking-tight">Writing</h1>
            <p className="text-[15px] text-muted-foreground">
              Thoughts on technology, design, and life
            </p>
          </div>

          {posts?.length === 0 ? (
            <div className="animate-fade-in-up stagger-2 flex flex-col items-center justify-center py-20 text-center">
              <div className="w-3 h-3 gradient-dot rounded-full mb-4 opacity-40" />
              <p className="text-muted-foreground text-[15px]">No posts yet.</p>
            </div>
          ) : (
            <div className="animate-fade-in-up stagger-2">
              <div className="space-y-14">
                {years.map((year, yearIndex) => {
                  const yearPosts = posts.filter(post => new Date(post.created_at).getFullYear() === year)
                  return (
                    <section 
                      key={year} 
                      className={`relative animate-fade-in-up stagger-${Math.min(yearIndex + 2, 8)}`}
                    >
                      {/* Year marker — big gradient dot with line down to posts */}
                      <div className="relative flex items-center gap-4 mb-5">
                        <div className="absolute left-[7px] top-[15px] bottom-0 w-px bg-border" />
                        <div className="w-[15px] h-[15px] gradient-dot rounded-full border-[3px] border-background shadow-sm z-10 shrink-0" />
                        <h2 className="text-[17px] font-semibold tracking-tight">{year}</h2>
                        <div className="flex-1 h-px bg-border/50" />
                      </div>

                      {/* Posts — continuous line clipped at last dot */}
                      <div className="relative space-y-1">
                        <div className="absolute left-[7px] top-0 bottom-[18px] w-px bg-border" />
                        {yearPosts.map((post, postIndex) => (
                          <div key={post.id} className="relative group blog-post-item">
                            {/* Post dot */}
                            <div className="absolute left-[3px] top-[18px] w-[9px] h-[9px] rounded-full bg-foreground/70 border-2 border-background z-10 transition-all duration-300 group-hover:scale-[1.6] group-hover:bg-foreground" />

                            {/* Post content */}
                            <div className="ml-8">
                              <Link 
                                href={`/blog/${post.slug}`}
                                className="block p-3 -mx-3 rounded-lg hover:bg-muted/40 transition-colors duration-200"
                              >
                                <div className="flex items-baseline justify-between gap-4">
                                  <span className="text-[15px] font-medium leading-snug">
                                    {post.title}
                                  </span>
                                  <time 
                                    dateTime={post.created_at}
                                    className="text-[13px] text-muted-foreground whitespace-nowrap shrink-0"
                                  >
                                    {new Date(post.created_at).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                    })}
                                  </time>
                                </div>
                                {post.tags && post.tags.length > 0 && (
                                  <div className="flex gap-1.5 mt-2">
                                    {post.tags.slice(0, 2).map((tag: string) => (
                                      <span 
                                        key={tag} 
                                        className="text-[11px] px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground"
                                      >
                                        #{tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  )
}