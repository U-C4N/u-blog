'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { supabase, type Post } from '@/lib/supabase/config'
import { AITools } from '@/components/ai-tools'

interface EditPostFormProps {
  initialPost: Post
}

export function EditPostForm({ initialPost }: EditPostFormProps) {
  const router = useRouter()
  const [title, setTitle] = useState(initialPost.title)
  const [content, setContent] = useState(initialPost.content)
  const [isPublished, setIsPublished] = useState(initialPost.published)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stats = {
    words: content.trim().split(/\s+/).length,
    readingTime: Math.ceil(content.trim().split(/\s+/).length / 200)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)

    try {
      const { error } = await supabase
        .from('posts')
        .update({
          title,
          content,
          published: isPublished,
          updated_at: new Date().toISOString()
        })
        .eq('id', initialPost.id)

      if (error) throw error

      router.push('/adminos/dashboard/posts')
      router.refresh()
    } catch (err: any) {
      console.error('Error updating post:', err)
      setError(err.message)
      setIsSaving(false)
    }
  }

  return (
    <main className="max-w-[1000px] mx-auto px-6 py-16">
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/adminos/dashboard/posts"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Posts
        </Link>
        <h1 className="text-2xl font-bold">Edit Post</h1>
      </div>

      <div className="max-w-3xl">
        {error && (
          <div className="flex items-center gap-2 p-4 mb-6 text-sm text-destructive bg-destructive/10 rounded-md">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-muted-foreground mb-2">
              Title
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium text-muted-foreground mb-2">
              Content (Markdown)
            </label>
            <AITools content={content} onUpdate={setContent} />
            <div className="relative">
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={20}
                className="w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                required
              />
              <div className="absolute bottom-2 right-2 text-xs text-muted-foreground space-x-2">
                <span>{stats.words} words</span>
                <span>•</span>
                <span>{stats.readingTime} min read</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="published"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="published" className="text-sm text-muted-foreground">
              Published
            </label>
          </div>

          <div className="flex justify-end gap-4">
            <Link
              href="/adminos/dashboard/posts"
              className="px-4 py-2 border rounded-md hover:bg-muted transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}