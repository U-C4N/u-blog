'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { supabase, type Post } from '@/lib/supabase/config'

export default function BlogPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPosts() {
      try {
        const { data, error } = await supabase
          .from('posts')
          .select('*')
          .eq('published', true)
          .order('created_at', { ascending: false })

        if (error) throw error
        setPosts(data || [])
      } catch (err: any) {
        console.error('Error fetching posts:', err)
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPosts()
  }, [])

  const years = Array.from(new Set(posts.map(post => 
    new Date(post.created_at).getFullYear()
  ))).sort((a, b) => b - a)

  if (isLoading) {
    return (
      <main className="max-w-[1000px] mx-auto px-6 py-16">
        <div className="max-w-[650px]">
          <div className="animate-pulse space-y-8">
            <div className="h-6 bg-muted rounded w-32" />
            <div className="space-y-4">
              <div className="h-4 bg-muted rounded w-full" />
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-5/6" />
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="max-w-[1000px] mx-auto px-6 py-16">
        <div className="max-w-[650px]">
          <div className="text-destructive">
            <p>Failed to load posts: {error}</p>
          </div>
        </div>
      </main>
    )
  }

  return (
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

        {posts.length === 0 ? (
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
                      <div key={post.id} className="flex items-baseline justify-between gap-8">
                        <Link 
                          href={`/blog/${post.slug}`}
                          className="text-[15px] hover:underline"
                        >
                          {post.title}
                        </Link>
                        <span className="text-[15px] text-muted-foreground whitespace-nowrap">
                          {new Date(post.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
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
  )
}