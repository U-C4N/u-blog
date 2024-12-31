'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { getSupabaseBrowser, type Post } from '@/lib/supabase/config'
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
      const supabase = getSupabaseBrowser()
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

      router.refresh()
      router.push('/adminos/dashboard/posts')
    } catch (err) {
      console.error('Error updating post:', err)
      setError('Failed to update post. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-[1000px] mx-auto px-6 py-16">
      <div className="max-w-[700px] mx-auto">
        <div className="flex items-center justify-between mb-12">
          <Link 
            href="/adminos/dashboard/posts" 
            className="inline-flex items-center gap-2 text-[15px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Posts
          </Link>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="published"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <label htmlFor="published" className="text-[15px] text-muted-foreground">
                Published
              </label>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-destructive bg-destructive/10 px-4 py-3 rounded-md mb-6">
            <AlertCircle className="w-4 h-4" />
            <p className="text-[15px]">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Post title"
              className="w-full text-[40px] font-bold bg-transparent border-none outline-none placeholder:text-muted-foreground/50"
            />
          </div>

          <div className="flex items-center gap-2 text-[15px] text-muted-foreground">
            <span>{stats.words} words</span>
            <span>•</span>
            <span>{stats.readingTime} min read</span>
          </div>

          <div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your post content in markdown..."
              className="w-full h-[500px] bg-transparent border-none outline-none resize-none placeholder:text-muted-foreground/50 text-lg"
            />
          </div>

          <AITools content={content} onUpdate={setContent} />
        </div>
      </div>
    </form>
  )
}