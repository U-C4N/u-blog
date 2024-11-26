'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Edit2, Trash2, ArrowLeft, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { supabase, type Post } from '@/lib/supabase/config'

export default function PostsPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPosts()
  }, [])

  async function fetchPosts() {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setPosts(data || [])
    } catch (err: any) {
      console.error('Error fetching posts:', err)
      setError(err.message || 'Failed to load posts')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', id)

      if (error) throw error
      setPosts(posts.filter(post => post.id !== id))
    } catch (err: any) {
      console.error('Error deleting post:', err)
      alert('Failed to delete post')
    }
  }

  if (isLoading) {
    return (
      <main className="max-w-[1000px] mx-auto px-6 py-16">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="space-y-4">
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-[1000px] mx-auto px-6 py-16">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/adminos/dashboard"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <h1 className="text-2xl font-bold">Blog Posts</h1>
        </div>
        
        <Link
          href="/adminos/dashboard/posts/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Post
        </Link>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 mb-6 text-sm text-destructive bg-destructive/10 rounded-md">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {posts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No posts yet. Create your first post!</p>
        </div>
      ) : (
        <div className="bg-card rounded-lg border">
          <div className="grid grid-cols-[1fr,100px,100px,100px] gap-4 p-4 border-b font-medium text-sm text-muted-foreground">
            <div>Title</div>
            <div>Status</div>
            <div>Created</div>
            <div className="text-right">Actions</div>
          </div>
          
          {posts.map((post) => (
            <div
              key={post.id}
              className="grid grid-cols-[1fr,100px,100px,100px] gap-4 p-4 border-b last:border-0 items-center text-sm"
            >
              <div className="font-medium">{post.title}</div>
              <div>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                  post.published 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {post.published ? 'Published' : 'Draft'}
                </span>
              </div>
              <div className="text-muted-foreground">
                {new Date(post.created_at).toLocaleDateString()}
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => router.push(`/adminos/dashboard/posts/${post.id}`)}
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(post.id)}
                  className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}