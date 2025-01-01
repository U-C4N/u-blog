'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, AlertCircle, Eye, Edit2, Image as ImageIcon, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { getSupabaseBrowser, type Post } from '@/lib/supabase/config'
import { AITools } from '@/components/ai-tools'
import DOMPurify from 'dompurify'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import dynamic from 'next/dynamic'

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
    ALLOWED_TAGS: ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'strong', 'em', 'code', 'pre', 'blockquote'],
    ALLOWED_ATTR: ['href', 'target', 'rel']
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
      isPublished !== initialPost.published
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
          updated_at: new Date().toISOString()
        })
        .eq('id', initialPost.id)

      if (error) {
        console.error('Supabase error details:', error)
        throw error
      }

      console.log('Update response:', data)
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

  const handleImageUpload = useCallback(async (file: File) => {
    if (!file) return
    
    setIsUploading(true)
    try {
      const supabase = getSupabaseBrowser()
      
      // Generate unique file name
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
      
      // Upload to Supabase Storage
      console.log('Uploading file:', fileName)
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

      console.log('Upload successful:', data)

      // Get public URL
      const { data: urlData } = supabase
        .storage
        .from('blog-images')
        .getPublicUrl(`posts/${fileName}`)

      if (!urlData.publicUrl) {
        console.error('URL error: Public URL not found')
        throw new Error('Failed to get public URL for uploaded image')
      }

      console.log('Public URL:', urlData.publicUrl)

      // Insert image markdown at cursor position
      const imageMarkdown = `![${file.name}](${urlData.publicUrl})`
      const textarea = document.querySelector('textarea')
      const cursorPos = textarea?.selectionStart || 0
      const textBefore = content.substring(0, cursorPos)
      const textAfter = content.substring(cursorPos)
      setContent(`${textBefore}${imageMarkdown}${textAfter}`)

    } catch (err: any) {
      console.error('Error uploading image:', {
        message: err.message,
        details: err.details,
        code: err.code,
        stack: err.stack
      })
      setError(`Failed to upload image: ${err.message}`)
    } finally {
      setIsUploading(false)
    }
  }, [content])

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
          </div>

          <div className="flex items-center gap-2 text-[15px] text-muted-foreground">
            <span>{stats.words} words</span>
            <span>•</span>
            <span>{stats.readingTime} min read</span>
            {isDirty && <span>• Unsaved changes</span>}
          </div>

          {isPreview ? (
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({node, inline, className, children, ...props}: any) {
                    const match = /language-(\w+)/.exec(className || '')
                    return !inline && match ? (
                      <SyntaxHighlighter
                        style={vscDarkPlus}
                        language={match[1]}
                        PreTag="div"
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code {...props} className={className}>
                        {children}
                      </code>
                    )
                  }
                }}
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
                />
                
                <div className="absolute bottom-4 right-4 flex gap-2">
                  <label
                    htmlFor="image-upload"
                    className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-primary/10 text-primary hover:bg-primary/20 rounded-md transition-colors cursor-pointer ${
                      isUploading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ImageIcon className="w-4 h-4" />
                    )}
                    Add Image
                  </label>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                    className="hidden"
                    disabled={isUploading}
                  />
                </div>
              </div>

              <AITools content={content} onUpdate={setContent} />
            </>
          )}
        </div>
      </div>
    </form>
  )
}