'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, AlertCircle, Eye, Edit2, Image as ImageIcon, Loader2, Music, ImagePlus, Link as LinkIcon, EyeOff, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { getSupabaseBrowser, type Post } from '../../../../../lib/supabase/config'
import DOMPurify from 'dompurify'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw' // Added import for rehypeRaw
import 'katex/dist/katex.min.css' // KaTeX CSS
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import dynamic from 'next/dynamic'

// Dynamic import for MDEditor
const MDEditor = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => mod.default),
  { ssr: false }
)

interface EditPostFormProps {
  initialPost: Post
}

const checkSupabaseConnection = async () => {
  const supabase = getSupabaseBrowser()
  const { data, error } = await supabase.from('posts').select('count').single()
  if (error) throw new Error('Supabase connection failed')
  return true
}

const validateTitle = (title: string) => {
  if (title.length < 3) throw new Error('Title must be at least 3 characters')
  if (title.length > 100) throw new Error('Title must be less than 100 characters')
  return true
}

const validateContent = (content: string) => {
  if (content.length < 10) throw new Error('Content must be at least 10 characters')
  if (content.length > 50000) throw new Error('Content must be less than 50000 characters')
  return true
}

const sanitizeContent = (content: string): string => {
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'strong', 'em', 'code', 'pre', 'blockquote', 'audio'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'controls', 'src']
  })
}

export function EditPostForm({ initialPost }: EditPostFormProps) {
  const router = useRouter()
  const [title, setTitle] = useState(initialPost.title)
  const [content, setContent] = useState(initialPost.content)
  const [isPublished, setIsPublished] = useState(initialPost.published)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [isPreview, setIsPreview] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isAudioUploading, setIsAudioUploading] = useState(false)
  const [isSEOGenerating, setIsSEOGenerating] = useState(false)
  const [canonicalTouched, setCanonicalTouched] = useState(false)
  const [tagsInput, setTagsInput] = useState((initialPost.tags || []).join(', '))
  const [metaTitle, setMetaTitle] = useState(initialPost.meta_title || initialPost.title)
  const [metaDescription, setMetaDescription] = useState(initialPost.meta_description || '')
  const [canonicalUrl, setCanonicalUrl] = useState(initialPost.canonical_url || '')
  const [ogImageUrl, setOgImageUrl] = useState(initialPost.og_image_url || '')
  const [noindex, setNoindex] = useState(Boolean(initialPost.noindex))

  // Unsaved changes kontrolü
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  // Form değişikliklerini takip et
  useEffect(() => {
    if (
      title !== initialPost.title ||
      content !== initialPost.content ||
      isPublished !== initialPost.published ||
      tagsInput !== (initialPost.tags || []).join(', ') ||
      metaTitle !== (initialPost.meta_title || initialPost.title) ||
      metaDescription !== (initialPost.meta_description || '') ||
      canonicalUrl !== (initialPost.canonical_url || '') ||
      ogImageUrl !== (initialPost.og_image_url || '') ||
      noindex !== Boolean(initialPost.noindex)
    ) {
      setIsDirty(true)
    } else {
      setIsDirty(false)
    }
  }, [title, content, isPublished, initialPost])

  useEffect(() => {
    const init = async () => {
      try {
        await checkSupabaseConnection()
        setIsConnected(true)
      } catch (err: any) {
        console.error('Initialization error:', err)
        setError(err.message)
      }
    }
    init()
  }, [])

  const stats = {
    words: content.trim().split(/\s+/).length,
    readingTime: Math.ceil(content.trim().split(/\s+/).length / 200)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isConnected) {
      setError('Please wait for connection to be established')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      // Validasyon
      validateTitle(title)
      validateContent(content)
      
      // Content sanitization
      const sanitizedContent = sanitizeContent(content)
      
      const supabase = getSupabaseBrowser()
      console.log('Updating post:', { title, content: sanitizedContent, isPublished, id: initialPost.id })
      
      const { data, error } = await supabase
        .from('posts')
        .update({
          title,
          content: sanitizedContent,
          published: isPublished,
          tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
          meta_title: metaTitle || title,
          meta_description: metaDescription,
          canonical_url: canonicalUrl,
          og_image_url: ogImageUrl || null,
          noindex,
          updated_at: new Date().toISOString()
        })
        .eq('id', initialPost.id)
        .select('*')
        .select('*')

      if (error) {
        console.error('Supabase error details:', error)
        throw error
      }

      console.log('Update response:', data)
      try {
        fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(`${window.location.origin}/sitemap.xml`)}`)
      } catch {}
      router.refresh()
      router.push('/adminos/dashboard/posts')
    } catch (err: any) {
      console.error('Error updating post:', {
        message: err.message,
        details: err.details,
        hint: err.hint,
        code: err.code
      })
      setError(`Failed to update post: ${err.message || 'Unknown error'}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value)
  }

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
  }

  const handlePublishedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsPublished(e.target.checked)
  }

  // Auto-canonical unless touched
  useEffect(() => {
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
    if (!canonicalTouched) {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
      setCanonicalUrl(baseUrl ? `${baseUrl}/blog/${slug}` : `/blog/${slug}`)
    }
  }, [title, canonicalTouched])

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
      const supabase = getSupabaseBrowser()
      
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
      const { data: publicData } = supabase
        .storage
        .from('blog-images')
        .getPublicUrl(`posts/${fileName}`)
      const publicUrl = (publicData as any)?.publicUrl || publicData?.publicUrl

      // Insert markdown image at cursor position
      const imageMarkdown = `![${file.name}](${publicUrl})`
      const textarea = document.querySelector('textarea.w-md-editor-text-input') as HTMLTextAreaElement
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
  }, [content])

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
      const supabase = getSupabaseBrowser()
      
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
      const { data: publicData } = supabase
        .storage
        .from('blog-images')  // Using existing images bucket
        .getPublicUrl(`audio/${fileName}`)
      const publicUrl = (publicData as any)?.publicUrl || publicData?.publicUrl

      // Insert audio player markdown at cursor position
      const audioMarkdown = `<audio controls src="${publicUrl}"></audio>`
      const textarea = document.querySelector('textarea.w-md-editor-text-input') as HTMLTextAreaElement
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
  }, [content])

  const handleOgImageUpload = useCallback(async (file: File) => {
    if (!file) return
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a valid image file (JPEG, PNG, GIF, or WebP)')
      return
    }
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      setError('Image size should be less than 5MB')
      return
    }
    setIsUploading(true)
    setError(null)
    try {
      const supabase = getSupabaseBrowser()
      const fileExt = file.name.split('.').pop()
      const fileName = `og-${Math.random().toString(36).substring(2)}.${fileExt}`
      const { error } = await supabase.storage.from('blog-images').upload(`og/${fileName}`, file, { cacheControl: '3600', upsert: false })
      if (error) throw error
      const { data: publicData } = supabase.storage.from('blog-images').getPublicUrl(`og/${fileName}`)
      setOgImageUrl(((publicData as any)?.publicUrl || (publicData as any)?.publicUrl) as string)
    } catch (err: any) {
      console.error('Error uploading OG image:', err)
      setError(err.message || 'Failed to upload OG image')
    } finally {
      setIsUploading(false)
    }
  }, [])

  const handleSEOGenerate = useCallback(async () => {
    if (!title || !content) {
      setError('Please provide title and content before using A.C.S.I')
      return
    }
    setIsSEOGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/seo-autocomplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      })
      if (!res.ok) throw new Error('A.C.S.I request failed')
      const data = await res.json()
      if (data.metaTitle) setMetaTitle(data.metaTitle)
      if (data.metaDescription) setMetaDescription(data.metaDescription)
      if (Array.isArray(data.tags)) setTagsInput(data.tags.join(', '))
      if (typeof data.noindex === 'boolean') setNoindex(data.noindex)
    } catch (e: any) {
      setError(e.message || 'Failed to auto-complete SEO info')
    } finally {
      setIsSEOGenerating(false)
    }
  }, [title, content])

  return (
    <form onSubmit={handleSubmit} className="max-w-[1000px] mx-auto px-6 py-16">
      <div className="max-w-[700px] mx-auto">
        <div className="flex items-center justify-between mb-12">
          <Link 
            href="/adminos/dashboard/posts"
            onClick={(e) => {
              if (isDirty && !confirm('You have unsaved changes. Are you sure you want to leave?')) {
                e.preventDefault()
              }
            }}
            className="inline-flex items-center gap-2 text-[15px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Posts
          </Link>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsPreview(!isPreview)}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-primary/10 text-primary hover:bg-primary/20 rounded-md transition-colors"
            >
              {isPreview ? (
                <>
                  <Edit2 className="w-4 h-4" />
                  Edit
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  Preview
                </>
              )}
            </button>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="published"
                checked={isPublished}
                onChange={handlePublishedChange}
                className="w-4 h-4 rounded border-gray-300"
              />
              <label htmlFor="published" className="text-[15px] text-muted-foreground">
                Published {isDirty && '*'}
              </label>
            </div>

            <button
              type="submit"
              disabled={isSaving || !isDirty}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : isDirty ? 'Save*' : 'Save'}
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
              onChange={handleTitleChange}
              placeholder="Post title"
              className="w-full text-[40px] font-bold bg-transparent border-none outline-none placeholder:text-muted-foreground/50"
            />
            {title && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <LinkIcon className="w-3 h-3" />
                Slug: <span className="font-mono">{title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}</span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 text-[15px] text-muted-foreground">
            <span>{stats.words} words</span>
            <span>•</span>
            <span>{stats.readingTime} min read</span>
            {isDirty && <span>• Unsaved changes</span>}
          </div>

          {isPreview ? (
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <link
                rel="stylesheet"
                href="https://cdn.jsdelivr.net/npm/katex@0.16.0/dist/katex.min.css"
              />
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeRaw, rehypeKatex]}
              >
                {content}
              </ReactMarkdown>
            </div>
          ) : (
            <>
              <div className="relative" data-color-mode="dark">
                <MDEditor
                  value={content}
                  onChange={(value) => setContent(value || '')}
                  preview="edit"
                  height={500}
                  className="bg-transparent border-none"
                  previewOptions={{
                    remarkPlugins: [remarkGfm, remarkMath],
                    rehypePlugins: [rehypeRaw, rehypeKatex],
                    components: {
                      table: (props) => (
                        <div className="overflow-x-auto my-4">
                          <table className="border-collapse w-full" {...props} />
                        </div>
                      ),
                      thead: (props) => <thead className="bg-muted/30" {...props} />,
                      tr: (props) => <tr className="border-b border-muted" {...props} />,
                      th: (props) => <th className="py-2 px-4 text-left font-semibold" {...props} />,
                      td: (props) => <td className="py-2 px-4" {...props} />
                    }
                  }}
                />
                
                <div className="absolute bottom-4 right-4 flex gap-2">
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
              <button
                type="button"
                onClick={handleSEOGenerate}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors disabled:opacity-50"
                disabled={isSEOGenerating}
                title="Auto-Completer SEO Info"
              >
                {isSEOGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                A.C.S.I
              </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">Tags (comma-separated)</label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="ai, react, nextjs"
              className="w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">Meta Title</label>
            <input
              type="text"
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
              placeholder="Custom SEO title (optional)"
              className="w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-muted-foreground mb-2">Meta Description</label>
            <textarea
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              rows={3}
              placeholder="Brief summary for search engines"
              className="w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">Canonical URL</label>
            <input
              type="url"
              value={canonicalUrl}
              onChange={(e) => { setCanonicalUrl(e.target.value); setCanonicalTouched(true) }}
              placeholder="https://.../blog/slug"
              className="w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">Open Graph Image URL</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={ogImageUrl}
                onChange={(e) => setOgImageUrl(e.target.value)}
                placeholder="https://.../image.png"
                className="flex-1 px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <div className="relative">
                <input
                  type="file"
                  id="og-upload"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleOgImageUpload(file)
                    e.target.value = ''
                  }}
                />
                <label
                  htmlFor="og-upload"
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm bg-transparent text-muted-foreground rounded-md hover:bg-muted transition-colors cursor-pointer ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                  {isUploading ? 'Uploading...' : 'Upload'}
                </label>
              </div>
            </div>
            {ogImageUrl && (
              <img src={ogImageUrl} alt="OG preview" className="mt-2 h-24 rounded border object-cover" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="noindex"
              checked={noindex}
              onChange={(e) => setNoindex(e.target.checked)}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="noindex" className="text-sm text-muted-foreground inline-flex items-center gap-1">
              <EyeOff className="w-4 h-4" /> Noindex this post
            </label>
          </div>
        </div>
      </div>
    </form>
  )
}