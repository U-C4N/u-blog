'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, AlertCircle, Eye, Edit2, Image as ImageIcon, Loader2, Music, ImagePlus, Link as LinkIcon, EyeOff, Sparkles, Globe, Plus } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
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

// Hoisted regex patterns (created once, reused everywhere)
const SLUG_PATTERN = /[^a-z0-9]+/g
const SLUG_TRIM_PATTERN = /(^-|-$)/g
const WORD_SPLIT_PATTERN = /\s+/

// Utility function for generating slugs (uses hoisted patterns)
const generateSlug = (text: string): string => {
  return text.toLowerCase().replace(SLUG_PATTERN, '-').replace(SLUG_TRIM_PATTERN, '')
}

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
  const [currentLanguage, setCurrentLanguage] = useState(initialPost.language_code || 'en')
  const [translations, setTranslations] = useState<{ [key: string]: { title: string; content: string; slug: string } }>(initialPost.translations || {})
  const [showLanguageSelector, setShowLanguageSelector] = useState(false)
  const [originalTitle, setOriginalTitle] = useState(initialPost.title)
  const [originalContent, setOriginalContent] = useState(initialPost.content)
  const [customSlug, setCustomSlug] = useState(initialPost.slug || '')
  const [isSlugTouched, setIsSlugTouched] = useState(false)

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
      noindex !== Boolean(initialPost.noindex) ||
      customSlug !== (initialPost.slug || '')
    ) {
      setIsDirty(true)
    } else {
      setIsDirty(false)
    }
  }, [title, content, isPublished, initialPost, customSlug, tagsInput, metaTitle, metaDescription, canonicalUrl, ogImageUrl, noindex])

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

  // Memoize stats to avoid recalculating on every render
  // Cache split result to avoid duplicate operation
  const stats = useMemo(() => {
    const words = content.trim().split(WORD_SPLIT_PATTERN)
    const wordCount = words.length
    return {
      words: wordCount,
      readingTime: Math.ceil(wordCount / 200)
    }
  }, [content])

  // Auto-generate slug from title unless manually touched
  useEffect(() => {
    if (!isSlugTouched && title) {
      setCustomSlug(generateSlug(title))
    }
  }, [title, isSlugTouched])

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow hyphens in manual input, but still trim leading/trailing
    const value = e.target.value
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(SLUG_TRIM_PATTERN, '')
    setCustomSlug(value)
    setIsSlugTouched(true)
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
      
      // Save current content to translations before submitting
      let finalTranslations = { ...translations }
      if (currentLanguage !== 'en') {
        finalTranslations[currentLanguage] = {
          title: title,
          content: sanitizedContent,
          slug: customSlug || generateSlug(title)
        }
      }

      // Prepare update payload with explicit typing
      const updatePayload: Partial<Post> = {
        title: currentLanguage === 'en' ? title : originalTitle,
        content: currentLanguage === 'en' ? sanitizedContent : originalContent,
        slug: currentLanguage === 'en' ? (customSlug || generateSlug(title)) : initialPost.slug,
        published: isPublished,
        tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
        meta_title: metaTitle || title,
        meta_description: metaDescription,
        canonical_url: canonicalUrl,
        og_image_url: ogImageUrl || undefined,
        noindex,
        language_code: 'en',
        translations: finalTranslations,
        updated_at: new Date().toISOString()
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('posts')
        .update(updatePayload)
        .eq('id', initialPost.id)
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
    if (!canonicalTouched) {
      const slug = generateSlug(title)
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

  const handleLanguageSwitch = useCallback((newLanguage: string) => {
    // Save current content to translations if not the original language
    if (currentLanguage !== 'en') {
      setTranslations(prev => ({
        ...prev,
        [currentLanguage]: {
          title: title,
          content: content,
          slug: generateSlug(title)
        }
      }))
    } else {
      // Update original content if we're switching from original language
      setOriginalTitle(title)
      setOriginalContent(content)
    }

    // Load content for new language
    if (newLanguage === 'en') {
      setTitle(originalTitle)
      setContent(originalContent)
    } else if (translations[newLanguage]) {
      setTitle(translations[newLanguage].title)
      setContent(translations[newLanguage].content)
    } else {
      // Start with empty content for new translation
      setTitle('')
      setContent('')
    }

    setCurrentLanguage(newLanguage)
  }, [currentLanguage, title, content, originalTitle, originalContent, translations])

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <form onSubmit={handleSubmit} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm border border-border/50 rounded-xl shadow-sm mb-8">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <Link 
                href="/adminos/dashboard/posts"
                onClick={(e) => {
                  if (isDirty && !confirm('You have unsaved changes. Are you sure you want to leave?')) {
                    e.preventDefault()
                  }
                }}
                className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-200 hover:gap-3"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Posts
              </Link>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsPreview(!isPreview)}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isPreview 
                      ? 'bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-300'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300'
                  }`}
                >
                  {isPreview ? (
                    <>
                      <Edit2 className="w-4 h-4" />
                      Edit Mode
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      Preview
                    </>
                  )}
                </button>

                <div className="flex items-center gap-3 bg-muted/50 px-3 py-2 rounded-lg">
                  <input
                    type="checkbox"
                    id="published"
                    checked={isPublished}
                    onChange={handlePublishedChange}
                    className="w-4 h-4 rounded border-2 border-gray-300 text-green-600 focus:ring-green-500 focus:ring-2"
                  />
                  <label htmlFor="published" className="text-sm font-medium text-foreground">
                    Published {isDirty && <span className="text-orange-500">*</span>}
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isSaving || !isDirty}
                  className={`inline-flex items-center gap-2 px-6 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                    isSaving || !isDirty
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
                      : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
                  }`}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {isDirty ? 'Save Changes' : 'Saved'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <div>
                <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">Error</h3>
                <p className="text-sm text-red-700 dark:text-red-400 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 space-y-6">
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-border/50 rounded-xl shadow-sm overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={title}
                      onChange={handleTitleChange}
                      placeholder="Enter your post title..."
                      className="w-full text-3xl sm:text-4xl font-bold bg-transparent border-none outline-none placeholder:text-muted-foreground/40 text-foreground"
                    />
                    <div className="mt-4 space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                          <LinkIcon className="w-4 h-4" />
                          URL Slug
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={customSlug}
                            onChange={handleSlugChange}
                            placeholder="url-slug-buraya-gelecek"
                            className="flex-1 px-3 py-2 bg-background/50 border border-border/50 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all duration-200"
                          />
                          {isSlugTouched && (
                            <button
                              type="button"
                              onClick={() => {
                                setIsSlugTouched(false)
                                const autoSlug = generateSlug(title)
                                setCustomSlug(autoSlug)
                              }}
                              className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          <span className="opacity-60">{typeof window !== 'undefined' ? window.location.origin : ''}/blog/</span>
                          <span className="font-mono text-foreground">{customSlug || 'url-slug'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => setShowLanguageSelector(!showLanguageSelector)}
                    className="flex-shrink-0 inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:from-purple-200 hover:to-pink-200 transition-all duration-200 text-sm font-medium"
                  >
                    <Globe className="w-4 h-4" />
                    {currentLanguage.toUpperCase()}
                  </button>
                </div>
                {showLanguageSelector && (
                  <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200/50 dark:border-purple-700/50 rounded-xl">
                    <h4 className="font-semibold text-sm text-purple-900 dark:text-purple-100 mb-3">Language Versions</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {['en', 'tr', 'de', 'fr', 'es'].map((lang) => (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => handleLanguageSwitch(lang)}
                          className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-all duration-200 ${
                            currentLanguage === lang
                              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                              : 'bg-white/60 dark:bg-gray-800/60 text-purple-700 dark:text-purple-300 hover:bg-white dark:hover:bg-gray-800 border border-purple-200/50 dark:border-purple-700/50'
                          }`}
                        >
                          {lang.toUpperCase()}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newLang = prompt('Enter language code (e.g., zh, ja, ko):')
                        if (newLang && newLang.length === 2) {
                          setCurrentLanguage(newLang.toLowerCase())
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white/60 dark:bg-gray-800/60 text-purple-600 dark:text-purple-400 hover:bg-white dark:hover:bg-gray-800 rounded-lg border border-purple-200/50 dark:border-purple-700/50 transition-all duration-200 font-medium"
                    >
                      <Plus className="w-3 h-3" />
                      Add Language
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Stats Card */}
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-border/50 rounded-xl shadow-sm">
              <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="font-medium">{stats.words} words</span>
                    </div>
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="font-medium">{stats.readingTime} min read</span>
                    </div>
                    {isDirty && (
                      <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                        <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                        <span className="font-medium">Unsaved changes</span>
                      </div>
                    )}
                  </div>
                  <div className="text-xs">
                    {isConnected ? (
                      <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                        Connected
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                        Disconnected
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Content Editor Card */}
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-border/50 rounded-xl shadow-sm overflow-hidden">
              {isPreview ? (
                <div className="p-6">
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
                </div>
              ) : (
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
                  
                  <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-border/50 rounded-lg p-2 shadow-lg">
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
                        className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all duration-200 cursor-pointer font-medium ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
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
                        className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-all duration-200 cursor-pointer font-medium ${isAudioUploading ? 'opacity-50 pointer-events-none' : ''}`}
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
                </div>
              )}
            </div>
          </div>

          {/* Right Column - SEO & Settings */}
          <div className="space-y-6">
            {/* Tags */}
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-border/50 rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-b border-green-200/50 dark:border-green-700/50">
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
                  placeholder="ai, react, nextjs, tutorial"
                  className="w-full px-3 py-2.5 bg-background/50 border border-border/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500/30 transition-all duration-200"
                />
                <p className="text-xs text-muted-foreground mt-2">Separate tags with commas</p>
              </div>
            </div>

            {/* SEO Settings */}
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-border/50 rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-blue-200/50 dark:border-blue-700/50">
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
                    placeholder="Custom SEO title"
                    className="w-full px-3 py-2.5 bg-background/50 border border-border/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Meta Description</label>
                  <textarea
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    rows={3}
                    placeholder="Brief summary for search engines"
                    className="w-full px-3 py-2.5 bg-background/50 border border-border/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 transition-all duration-200 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Canonical URL</label>
                  <input
                    type="url"
                    value={canonicalUrl}
                    onChange={(e) => { setCanonicalUrl(e.target.value); setCanonicalTouched(true) }}
                    placeholder="https://.../blog/slug"
                    className="w-full px-3 py-2.5 bg-background/50 border border-border/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 transition-all duration-200"
                  />
                </div>
              </div>
            </div>

            {/* Open Graph Image */}
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-border/50 rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 border-b border-pink-200/50 dark:border-pink-700/50">
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
                    className="flex-1 px-3 py-2.5 bg-background/50 border border-border/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500/30 transition-all duration-200"
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
                      className={`inline-flex items-center gap-1.5 px-3 py-2.5 text-sm bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 rounded-lg hover:bg-pink-200 dark:hover:bg-pink-900/50 transition-all duration-200 cursor-pointer font-medium ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                      Upload
                    </label>
                  </div>
                </div>
                {ogImageUrl && (
                  <div className="mt-3">
                    <Image src={ogImageUrl} alt="OG preview" width={400} height={128} className="w-full h-32 rounded-lg border object-cover" />
                  </div>
                )}
              </div>
            </div>

            {/* Privacy Settings */}
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-border/50 rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20 border-b border-gray-200/50 dark:border-gray-700/50">
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
          </div>
        </div>
      </form>
    </div>
  )
}