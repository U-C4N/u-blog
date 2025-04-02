'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, AlertCircle, Image as ImageIcon, Music, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/config'
import { AITools } from '@/components/ai-tools'

export default function NewPostPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isPublished, setIsPublished] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isAudioUploading, setIsAudioUploading] = useState(false)

  const stats = {
    words: content.trim().split(/\s+/).length,
    readingTime: Math.ceil(content.trim().split(/\s+/).length / 200)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)

    try {
      // Create URL-friendly slug from title
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')

      const { error } = await supabase
        .from('posts')
        .insert({
          title,
          slug,
          content,
          published: isPublished,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      router.push('/adminos/dashboard/posts')
      router.refresh()
    } catch (err: any) {
      console.error('Error creating post:', err)
      setError(err.message)
      setIsSaving(false)
    }
  }

  const handleImageUpload = useCallback(async (file: File) => {
    if (!file) return
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a valid image file (JPEG, PNG, GIF, or WebP)')
      return
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      setError('Image size should be less than 5MB')
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      // Generate unique file name
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
      
      // Upload to Supabase Storage
      const { data, error } = await supabase
        .storage
        .from('blog-images')
        .upload(`posts/${fileName}`, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Upload error:', error)
        throw error
      }

      // Get the public URL
      const { data: { publicUrl } } = supabase
        .storage
        .from('blog-images')
        .getPublicUrl(`posts/${fileName}`)

      // Insert markdown image at cursor position
      const imageMarkdown = `![${file.name}](${publicUrl})`
      const textarea = document.getElementById('content') as HTMLTextAreaElement
      if (textarea) {
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const text = content
        const newText = text.substring(0, start) + imageMarkdown + text.substring(end)
        setContent(newText)
        
        // Set cursor position after the inserted markdown
        setTimeout(() => {
          textarea.focus()
          textarea.setSelectionRange(start + imageMarkdown.length, start + imageMarkdown.length)
        }, 0)
      }
    } catch (err: any) {
      console.error('Error uploading image:', err)
      setError(err.message || 'Failed to upload image')
    } finally {
      setIsUploading(false)
    }
  }, [content]);

  const handleAudioUpload = useCallback(async (file: File) => {
    if (!file) return
    
    // Validate file type
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg']
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a valid audio file (MP3, WAV, or OGG)')
      return
    }

    // Validate file size (max 20MB)
    const maxSize = 20 * 1024 * 1024 // 20MB
    if (file.size > maxSize) {
      setError('Audio size should be less than 20MB')
      return
    }

    setIsAudioUploading(true)
    setError(null)

    try {
      // Generate unique file name
      const fileExt = file.name.split('.').pop()
      const fileName = `audio-${Math.random().toString(36).substring(2)}.${fileExt}`
      
      // Upload to Supabase Storage - using blog-images bucket
      const { data, error } = await supabase
        .storage
        .from('blog-images')  // Using existing images bucket instead of blog-audio
        .upload(`audio/${fileName}`, file, {  // Put in audio subfolder 
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Upload error (detailed):', JSON.stringify(error))
        throw error
      }

      // Get the public URL
      const { data: { publicUrl } } = supabase
        .storage
        .from('blog-images')  // Using existing images bucket
        .getPublicUrl(`audio/${fileName}`)

      // Insert audio player markdown at cursor position
      const audioMarkdown = `<audio controls src="${publicUrl}"></audio>`
      const textarea = document.getElementById('content') as HTMLTextAreaElement
      if (textarea) {
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const text = content
        const newText = text.substring(0, start) + audioMarkdown + text.substring(end)
        setContent(newText)
        
        // Set cursor position after the inserted markdown
        setTimeout(() => {
          textarea.focus()
          textarea.setSelectionRange(start + audioMarkdown.length, start + audioMarkdown.length)
        }, 0)
      }
    } catch (err: any) {
      console.error('Error uploading audio (raw error object):', err)
      setError(err.message || `Failed to upload audio: ${JSON.stringify(err)}`)
    } finally {
      setIsAudioUploading(false)
    }
  }, [content]);

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
        <h1 className="text-2xl font-bold">Create New Post</h1>
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
            <div className="flex items-center gap-2 mb-2">
              <AITools content={content} onUpdate={setContent} />
              
              <div className="relative">
                <input
                  type="file"
                  id="image-upload"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleImageUpload(file)
                    e.target.value = ''
                  }}
                />
                <label
                  htmlFor="image-upload"
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm bg-transparent text-muted-foreground rounded-md hover:bg-muted transition-colors cursor-pointer ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ImageIcon className="w-4 h-4" />
                  )}
                  {isUploading ? 'Uploading...' : 'Add Image'}
                </label>
              </div>
              
              <div className="relative">
                <input
                  type="file"
                  id="audio-upload"
                  accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleAudioUpload(file)
                    e.target.value = ''
                  }}
                />
                <label
                  htmlFor="audio-upload"
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm bg-transparent text-muted-foreground rounded-md hover:bg-muted transition-colors cursor-pointer ${isAudioUploading ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  {isAudioUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Music className="w-4 h-4" />
                  )}
                  {isAudioUploading ? 'Uploading...' : 'Add Audio'}
                </label>
              </div>
            </div>
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
              Publish immediately
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
              {isSaving ? 'Creating...' : 'Create Post'}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}