'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, AlertCircle, Image as ImageIcon, Music, Loader2, Link as LinkIcon, ImagePlus, EyeOff, Sparkles } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { getSupabaseBrowser } from '../../../../../lib/supabase/config'
import { SerpPreview } from '@/components/serp-preview'
import { SeoSuggestions } from '@/components/seo-suggestions'

export default function NewPostPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowser()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isPublished, setIsPublished] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isAudioUploading, setIsAudioUploading] = useState(false)
  const [tagsInput, setTagsInput] = useState('')
  const [metaTitle, setMetaTitle] = useState('')
  const [metaDescription, setMetaDescription] = useState('')
  const [canonicalUrl, setCanonicalUrl] = useState('')
  const [ogImageUrl, setOgImageUrl] = useState('')
  const [noindex, setNoindex] = useState(false)
  const [isSEOGenerating, setIsSEOGenerating] = useState(false)
  const [canonicalTouched, setCanonicalTouched] = useState(false)

  const stats = {
    words: content.trim().split(/\s+/).length,
    readingTime: Math.ceil(content.trim().split(/\s+/).length / 200)
  }

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  // Auto-update canonical URL from title/slug unless user manually edits it
  React.useEffect(() => {
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
    if (!canonicalTouched) {
      setCanonicalUrl(baseUrl ? `${baseUrl}/blog/${slug}` : `/blog/${slug}`)
    }
  }, [title, baseUrl, canonicalTouched])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)

    try {
      // Create URL-friendly slug from title and ensure uniqueness
      const baseSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')

      let slug = baseSlug
      try {
        // If slug exists, append incremental suffix -2, -3, ...
        let suffix = 2
        // Check up to 20 variants quickly
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { data: existing } = await supabase
            .from('posts')
            .select('id')
            .eq('slug', slug)
            .limit(1)
          if (!existing || existing.length === 0) break
          slug = `${baseSlug}-${suffix++}`
          if (suffix > 50) break
        }
      } catch {}

      const { error } = await supabase
        .from('posts')
        .insert({
          title,
          slug,
          content,
          published: isPublished,
          tags: tagsInput
            .split(',')
            .map(t => t.trim())
            .filter(Boolean),
          meta_title: metaTitle || title,
          meta_description: metaDescription || content.slice(0, 160).replace(/\n/g, ' ').trim(),
          canonical_url: canonicalUrl || `${baseUrl}/blog/${slug}`,
          og_image_url: ogImageUrl || null,
          noindex,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      // Fire-and-forget ping to Google for sitemap refresh
      try {
        fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(`${baseUrl}/sitemap.xml`)}`)
      } catch {}

      // Revalidate blog pages so new post appears immediately
      try {
        fetch('/api/revalidate', { method: 'POST' })
      } catch {}

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
      const { data: publicData } = supabase
        .storage
        .from('blog-images')
        .getPublicUrl(`posts/${fileName}`)
      const publicUrl = (publicData as any)?.publicUrl || publicData?.publicUrl

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
      const { data: publicData } = supabase
        .storage
        .from('blog-images')  // Using existing images bucket
        .getPublicUrl(`audio/${fileName}`)
      const publicUrl = (publicData as any)?.publicUrl || publicData?.publicUrl

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
      const fileExt = file.name.split('.').pop()
      const fileName = `og-${Math.random().toString(36).substring(2)}.${fileExt}`
      const { error } = await supabase
        .storage
        .from('blog-images')
        .upload(`og/${fileName}`, file, { cacheControl: '3600', upsert: false })
      if (error) throw error
      const { data: publicData } = supabase
        .storage
        .from('blog-images')
        .getPublicUrl(`og/${fileName}`)
      setOgImageUrl((publicData as any)?.publicUrl || publicData?.publicUrl)
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
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Bar */}
      <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border border-white/40 dark:border-gray-700/40 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] mb-8">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/adminos/dashboard/posts"
                className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-200 hover:gap-3"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Posts
              </Link>
              <div className="h-6 w-px bg-border/50" />
              <h1 className="text-xl font-semibold">Create New Post</h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 bg-white/40 dark:bg-gray-800/40 px-3 py-2 rounded-xl border border-white/50 dark:border-gray-600/30">
                <input
                  type="checkbox"
                  id="published"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="w-4 h-4 rounded border-2 border-gray-300 text-green-600 focus:ring-green-500 focus:ring-2"
                />
                <label htmlFor="published" className="text-sm font-medium text-foreground">
                  Publish immediately
                </label>
              </div>

              <Link
                href="/adminos/dashboard/posts"
                className="px-4 py-2 text-sm font-medium bg-white/40 dark:bg-gray-800/40 border border-white/50 dark:border-gray-600/30 rounded-xl hover:bg-white/60 dark:hover:bg-gray-800/60 transition-all duration-200"
              >
                Cancel
              </Link>
              <button
                type="submit"
                form="new-post-form"
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-6 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all duration-200 disabled:opacity-50 shadow-sm hover:shadow-md"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Create Post
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50/80 dark:bg-red-900/20 backdrop-blur-sm border border-red-200/50 dark:border-red-800/50 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        </div>
      )}

      <form id="new-post-form" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Main Content Column */}
          <div className="xl:col-span-2 space-y-6">
            {/* Title Card */}
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-white/40 dark:border-gray-700/30 rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="p-6">
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter your post title..."
                  className="w-full text-3xl sm:text-4xl font-bold bg-transparent border-none outline-none placeholder:text-muted-foreground/40 text-foreground"
                  required
                />
                {title && (
                  <div className="mt-3 text-xs text-muted-foreground flex items-center gap-1">
                    <LinkIcon className="w-3 h-3" />
                    <span className="opacity-60">{typeof window !== 'undefined' ? window.location.origin : ''}/blog/</span>
                    <span className="font-mono text-foreground">{title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Stats Bar */}
            <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm border border-white/40 dark:border-gray-700/30 rounded-xl px-6 py-3">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="font-medium">{stats.words} words</span>
                </div>
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="font-medium">{stats.readingTime} min read</span>
                </div>
              </div>
            </div>

            {/* Content Editor Card */}
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-white/40 dark:border-gray-700/30 rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="relative">
                {/* Toolbar */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/30 dark:border-gray-700/30 bg-white/40 dark:bg-gray-800/40">
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
                      className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-100/80 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all duration-200 cursor-pointer font-medium ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      {isUploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ImageIcon className="w-4 h-4" />
                      )}
                      {isUploading ? 'Uploading...' : 'Image'}
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
                      className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-purple-100/80 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-all duration-200 cursor-pointer font-medium ${isAudioUploading ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      {isAudioUploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Music className="w-4 h-4" />
                      )}
                      {isAudioUploading ? 'Uploading...' : 'Audio'}
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={handleSEOGenerate}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-gradient-to-r from-orange-100 to-yellow-100 dark:from-orange-900/30 dark:to-yellow-900/30 text-orange-700 dark:text-orange-300 rounded-lg hover:from-orange-200 hover:to-yellow-200 dark:hover:from-orange-900/50 dark:hover:to-yellow-900/50 transition-all duration-200 disabled:opacity-50 font-medium"
                    disabled={isSEOGenerating}
                    title="Auto-Complete SEO Info"
                  >
                    {isSEOGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    A.C.S.I
                  </button>
                </div>

                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={24}
                  className="w-full px-6 py-4 bg-transparent border-none focus:outline-none focus:ring-0 font-mono text-sm resize-none"
                  placeholder="Write your content in Markdown..."
                  required
                />
              </div>
            </div>
          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">
            {/* Tags */}
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-white/40 dark:border-gray-700/30 rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-green-50/80 to-emerald-50/80 dark:from-green-900/20 dark:to-emerald-900/20 border-b border-green-200/30 dark:border-green-700/30">
                <h3 className="text-sm font-semibold text-green-800 dark:text-green-200 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Content Tags
                </h3>
              </div>
              <div className="p-4">
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="ai, react, nextjs"
                  className="w-full px-3 py-2.5 bg-white/50 dark:bg-gray-800/50 border border-white/60 dark:border-gray-600/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500/30 backdrop-blur-sm transition-all duration-200"
                />
                <p className="text-xs text-muted-foreground mt-2">Separate tags with commas</p>
              </div>
            </div>

            {/* SEO Settings */}
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-white/40 dark:border-gray-700/30 rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-blue-200/30 dark:border-blue-700/30">
                <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200 flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  SEO Settings
                </h3>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Meta Title</label>
                  <input
                    type="text"
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    placeholder="Custom SEO title (optional)"
                    className="w-full px-3 py-2.5 bg-white/50 dark:bg-gray-800/50 border border-white/60 dark:border-gray-600/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 backdrop-blur-sm transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Meta Description</label>
                  <textarea
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    rows={3}
                    placeholder="Brief summary for search engines"
                    className="w-full px-3 py-2.5 bg-white/50 dark:bg-gray-800/50 border border-white/60 dark:border-gray-600/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 backdrop-blur-sm transition-all duration-200 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Canonical URL</label>
                  <input
                    type="url"
                    value={canonicalUrl}
                    onChange={(e) => { setCanonicalUrl(e.target.value); setCanonicalTouched(true) }}
                    placeholder="https://your-domain.com/blog/my-post"
                    className="w-full px-3 py-2.5 bg-white/50 dark:bg-gray-800/50 border border-white/60 dark:border-gray-600/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 backdrop-blur-sm transition-all duration-200"
                  />
                </div>
              </div>
            </div>

            {/* Open Graph Image */}
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-white/40 dark:border-gray-700/30 rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-pink-50/80 to-rose-50/80 dark:from-pink-900/20 dark:to-rose-900/20 border-b border-pink-200/30 dark:border-pink-700/30">
                <h3 className="text-sm font-semibold text-pink-800 dark:text-pink-200 flex items-center gap-2">
                  <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                  Open Graph Image
                </h3>
              </div>
              <div className="p-4">
                <div className="flex gap-2 mb-3">
                  <input
                    type="url"
                    value={ogImageUrl}
                    onChange={(e) => setOgImageUrl(e.target.value)}
                    placeholder="https://.../image.png"
                    className="flex-1 px-3 py-2.5 bg-white/50 dark:bg-gray-800/50 border border-white/60 dark:border-gray-600/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500/30 backdrop-blur-sm transition-all duration-200"
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
                      className={`inline-flex items-center gap-1.5 px-3 py-2.5 text-sm bg-pink-100/80 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 rounded-xl hover:bg-pink-200 dark:hover:bg-pink-900/50 transition-all duration-200 cursor-pointer font-medium ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                      Upload
                    </label>
                  </div>
                </div>
                {ogImageUrl && (
                  <Image src={ogImageUrl} alt="OG preview" width={400} height={128} className="w-full h-32 rounded-xl border border-white/40 dark:border-gray-700/30 object-cover" />
                )}
              </div>
            </div>

            {/* Privacy Settings */}
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-white/40 dark:border-gray-700/30 rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-gray-50/80 to-slate-50/80 dark:from-gray-900/20 dark:to-slate-900/20 border-b border-gray-200/30 dark:border-gray-700/30">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                  Privacy Settings
                </h3>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="noindex"
                    checked={noindex}
                    onChange={(e) => setNoindex(e.target.checked)}
                    className="w-4 h-4 rounded border-2 border-gray-300 text-gray-600 focus:ring-gray-500 focus:ring-2"
                  />
                  <label htmlFor="noindex" className="text-sm font-medium text-foreground inline-flex items-center gap-2">
                    <EyeOff className="w-4 h-4 text-gray-500" />
                    Hide from search engines (noindex)
                  </label>
                </div>
                <p className="text-xs text-muted-foreground mt-2">When enabled, search engines won&apos;t index this post</p>
              </div>
            </div>

            {/* Google SERP Preview */}
            <SerpPreview
              title={title}
              metaTitle={metaTitle}
              metaDescription={metaDescription}
              slug={title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}
              siteUrl={typeof window !== 'undefined' ? window.location.origin : undefined}
            />

            {/* Smart SEO Suggestions */}
            <SeoSuggestions
              title={title}
              content={content}
              metaTitle={metaTitle}
              metaDescription={metaDescription}
              tags={tagsInput.split(',').map(t => t.trim()).filter(Boolean)}
            />
          </div>
        </div>
      </form>
    </main>
  )
}