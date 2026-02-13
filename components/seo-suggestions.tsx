'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronUp, Link as LinkIcon, Image as ImageIcon, Heading, FileText, Lightbulb } from 'lucide-react'
import { getSupabaseBrowser } from '@/lib/supabase/config'

type Severity = 'good' | 'warning' | 'error'

interface SeoCheck {
  label: string
  severity: Severity
  message: string
  category: 'headings' | 'images' | 'content' | 'keywords' | 'links'
}

interface SeoSuggestionsProps {
  title: string
  content: string
  metaTitle: string
  metaDescription: string
  tags: string[]
  currentPostId?: string
}

// Extract keywords from title, splitting on common stop words and short words
function extractKeywords(title: string): string[] {
  const stopWords = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
    'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'between', 'out', 'off', 'over',
    'under', 'again', 'further', 'then', 'once', 'and', 'but', 'or', 'nor',
    'not', 'so', 'yet', 'both', 'each', 'few', 'more', 'most', 'other',
    'some', 'such', 'no', 'only', 'own', 'same', 'than', 'too', 'very',
    'just', 'because', 'how', 'what', 'which', 'who', 'whom', 'this',
    'that', 'these', 'those', 'i', 'me', 'my', 'we', 'our', 'you', 'your',
    'he', 'him', 'his', 'she', 'her', 'it', 'its', 'they', 'them', 'their',
    'about', 'up', 'if', 'when', 'where', 'why', 'all', 'also'
  ])

  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w))
}

function analyzeHeadings(content: string): SeoCheck[] {
  const checks: SeoCheck[] = []
  const headingRegex = /^(#{1,6})\s+(.+)$/gm
  const headings: { level: number; text: string }[] = []

  let match
  while ((match = headingRegex.exec(content)) !== null) {
    headings.push({ level: match[1].length, text: match[2] })
  }

  if (headings.length === 0) {
    checks.push({
      label: 'No headings found',
      severity: 'warning',
      message: 'Add H2/H3 headings to structure your content for better readability and SEO.',
      category: 'headings'
    })
    return checks
  }

  // Check for H1 in content (usually the post title handles H1)
  const h1Count = headings.filter(h => h.level === 1).length
  if (h1Count > 0) {
    checks.push({
      label: `${h1Count} H1 heading${h1Count > 1 ? 's' : ''} in content`,
      severity: 'warning',
      message: 'The post title already serves as H1. Use H2 and H3 for content structure instead.',
      category: 'headings'
    })
  }

  // Check for proper hierarchy (no skipping levels)
  let prevLevel = 1 // Post title is H1
  let hierarchyOk = true
  for (const h of headings) {
    if (h.level === 1) continue
    if (h.level > prevLevel + 1) {
      hierarchyOk = false
      break
    }
    prevLevel = h.level
  }

  if (!hierarchyOk) {
    checks.push({
      label: 'Heading hierarchy has gaps',
      severity: 'warning',
      message: 'Headings skip levels (e.g. H2 to H4). Use sequential levels for proper document outline.',
      category: 'headings'
    })
  } else if (headings.filter(h => h.level !== 1).length > 0) {
    checks.push({
      label: 'Heading hierarchy is correct',
      severity: 'good',
      message: `Found ${headings.length} heading${headings.length !== 1 ? 's' : ''} with proper nesting.`,
      category: 'headings'
    })
  }

  // Check H2 count
  const h2Count = headings.filter(h => h.level === 2).length
  if (h2Count === 0) {
    checks.push({
      label: 'No H2 headings',
      severity: 'warning',
      message: 'Add H2 headings to create main sections. This helps search engines understand your content structure.',
      category: 'headings'
    })
  }

  return checks
}

function analyzeImages(content: string): SeoCheck[] {
  const checks: SeoCheck[] = []
  // Match markdown images: ![alt](url)
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g
  const images: { alt: string; url: string }[] = []

  let match
  while ((match = imageRegex.exec(content)) !== null) {
    images.push({ alt: match[1], url: match[2] })
  }

  if (images.length === 0) {
    checks.push({
      label: 'No images found',
      severity: 'warning',
      message: 'Consider adding images to improve engagement. Posts with images tend to rank better.',
      category: 'images'
    })
    return checks
  }

  const missingAlt = images.filter(img => !img.alt.trim())
  if (missingAlt.length > 0) {
    checks.push({
      label: `${missingAlt.length} image${missingAlt.length !== 1 ? 's' : ''} missing alt text`,
      severity: 'error',
      message: 'Add descriptive alt text to all images. This is critical for accessibility and image SEO.',
      category: 'images'
    })
  }

  const withAlt = images.length - missingAlt.length
  if (withAlt > 0) {
    checks.push({
      label: `${withAlt}/${images.length} images have alt text`,
      severity: missingAlt.length === 0 ? 'good' : 'warning',
      message: missingAlt.length === 0
        ? 'All images have descriptive alt text.'
        : `${missingAlt.length} image${missingAlt.length !== 1 ? 's' : ''} still need alt text.`,
      category: 'images'
    })
  }

  return checks
}

function analyzeContent(content: string, title: string): SeoCheck[] {
  const checks: SeoCheck[] = []
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length

  if (wordCount < 300) {
    checks.push({
      label: `Content is short (${wordCount} words)`,
      severity: 'error',
      message: 'Aim for at least 300 words. Longer, comprehensive content tends to rank better. Consider expanding your post.',
      category: 'content'
    })
  } else if (wordCount < 600) {
    checks.push({
      label: `Content length is okay (${wordCount} words)`,
      severity: 'warning',
      message: 'Good start, but posts with 600+ words generally perform better in search. Consider adding more detail.',
      category: 'content'
    })
  } else if (wordCount < 1500) {
    checks.push({
      label: `Good content length (${wordCount} words)`,
      severity: 'good',
      message: 'Your content length is in a good range for SEO.',
      category: 'content'
    })
  } else {
    checks.push({
      label: `Comprehensive content (${wordCount} words)`,
      severity: 'good',
      message: 'Excellent content length. Long-form content often ranks well for competitive keywords.',
      category: 'content'
    })
  }

  // Check for internal/external links
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
  const links: { text: string; url: string }[] = []
  let match
  while ((match = linkRegex.exec(content)) !== null) {
    // Skip image links (preceded by !)
    const idx = match.index
    if (idx > 0 && content[idx - 1] === '!') continue
    links.push({ text: match[1], url: match[2] })
  }

  if (links.length === 0) {
    checks.push({
      label: 'No links in content',
      severity: 'warning',
      message: 'Add internal or external links to provide additional context and improve SEO authority.',
      category: 'content'
    })
  } else {
    checks.push({
      label: `${links.length} link${links.length !== 1 ? 's' : ''} found`,
      severity: 'good',
      message: 'Content includes links which helps with SEO authority signals.',
      category: 'content'
    })
  }

  // Check if content starts with meaningful text (not just a heading)
  const firstLine = content.trim().split('\n')[0] || ''
  if (firstLine.startsWith('#')) {
    // That's fine, but check if there's a paragraph right after
    const lines = content.trim().split('\n').filter(l => l.trim())
    if (lines.length > 1 && lines[1].startsWith('#')) {
      checks.push({
        label: 'No intro paragraph',
        severity: 'warning',
        message: 'Add an introductory paragraph before your first section. This helps search engines understand the topic.',
        category: 'content'
      })
    }
  }

  return checks
}

function analyzeKeywords(content: string, title: string, metaTitle: string, metaDescription: string, tags: string[]): SeoCheck[] {
  const checks: SeoCheck[] = []
  const keywords = extractKeywords(metaTitle || title)

  if (keywords.length === 0) {
    checks.push({
      label: 'No keywords detected',
      severity: 'warning',
      message: 'Your title may be too short or generic. Use descriptive, keyword-rich titles.',
      category: 'keywords'
    })
    return checks
  }

  const contentLower = content.toLowerCase()
  const foundInContent = keywords.filter(kw => contentLower.includes(kw))
  const missingFromContent = keywords.filter(kw => !contentLower.includes(kw))

  if (foundInContent.length === keywords.length) {
    checks.push({
      label: 'Title keywords appear in content',
      severity: 'good',
      message: `All key terms (${keywords.join(', ')}) are present in your content.`,
      category: 'keywords'
    })
  } else if (missingFromContent.length > 0) {
    checks.push({
      label: `${missingFromContent.length} keyword${missingFromContent.length !== 1 ? 's' : ''} missing from content`,
      severity: 'warning',
      message: `Consider using these terms in your content: ${missingFromContent.join(', ')}`,
      category: 'keywords'
    })
  }

  // Check if keywords appear in meta description
  if (metaDescription) {
    const descLower = metaDescription.toLowerCase()
    const inDesc = keywords.filter(kw => descLower.includes(kw))
    if (inDesc.length === 0) {
      checks.push({
        label: 'No keywords in meta description',
        severity: 'warning',
        message: `Include key terms in your meta description: ${keywords.slice(0, 3).join(', ')}`,
        category: 'keywords'
      })
    } else {
      checks.push({
        label: 'Keywords found in meta description',
        severity: 'good',
        message: `Meta description includes: ${inDesc.join(', ')}`,
        category: 'keywords'
      })
    }
  }

  // Keyword suggestions from tags
  if (tags.length === 0) {
    checks.push({
      label: 'No tags set',
      severity: 'warning',
      message: 'Add tags to help categorize your content and improve discoverability.',
      category: 'keywords'
    })
  } else if (tags.length < 3) {
    checks.push({
      label: `Only ${tags.length} tag${tags.length !== 1 ? 's' : ''} set`,
      severity: 'warning',
      message: 'Consider adding 3-5 tags for better categorization.',
      category: 'keywords'
    })
  } else {
    checks.push({
      label: `${tags.length} tags set`,
      severity: 'good',
      message: `Tags: ${tags.join(', ')}`,
      category: 'keywords'
    })
  }

  return checks
}

const categoryIcons = {
  headings: Heading,
  images: ImageIcon,
  content: FileText,
  keywords: Lightbulb,
  links: LinkIcon,
}

const categoryLabels = {
  headings: 'Heading Structure',
  images: 'Image Alt Text',
  content: 'Content Quality',
  keywords: 'Keywords & Tags',
  links: 'Internal Links',
}

const severityIcons = {
  good: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
}

const severityColors = {
  good: 'text-green-600 dark:text-green-400',
  warning: 'text-yellow-600 dark:text-yellow-400',
  error: 'text-red-600 dark:text-red-400',
}

interface RelatedPost {
  id: string
  title: string
  slug: string
  tags: string[]
}

export function SeoSuggestions({ title, content, metaTitle, metaDescription, tags, currentPostId }: SeoSuggestionsProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [relatedPosts, setRelatedPosts] = useState<RelatedPost[]>([])
  const [loadingPosts, setLoadingPosts] = useState(false)

  // Stable serialization for tags array
  const tagsKey = tags.join(',')

  // Fetch related posts for internal linking suggestions
  useEffect(() => {
    if (tags.length === 0 && !title) return

    const fetchRelated = async () => {
      setLoadingPosts(true)
      try {
        const supabase = getSupabaseBrowser()
        const { data } = await supabase
          .from('posts')
          .select('id, title, slug, tags')
          .eq('published', true)
          .limit(20)

        if (data) {
          // Filter out current post and score by tag overlap
          const scored = data
            .filter(p => p.id !== currentPostId)
            .map(p => {
              const postTags: string[] = Array.isArray(p.tags) ? p.tags : []
              const overlap = postTags.filter(t => tags.includes(t)).length
              // Also check title keyword overlap
              const titleKeywords = extractKeywords(title)
              const titleLower = (p.title || '').toLowerCase()
              const titleOverlap = titleKeywords.filter(kw => titleLower.includes(kw)).length
              return { ...p, tags: postTags, score: overlap * 2 + titleOverlap }
            })
            .filter(p => p.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)

          setRelatedPosts(scored)
        }
      } catch (err) {
        console.error('Failed to fetch related posts:', err)
      } finally {
        setLoadingPosts(false)
      }
    }

    const timeout = setTimeout(fetchRelated, 500)
    return () => clearTimeout(timeout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagsKey, title, currentPostId])

  const checks = useMemo(() => {
    const all: SeoCheck[] = [
      ...analyzeHeadings(content),
      ...analyzeImages(content),
      ...analyzeContent(content, title),
      ...analyzeKeywords(content, title, metaTitle, metaDescription, tags),
    ]
    return all
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, title, metaTitle, metaDescription, tagsKey])

  // Link suggestions check
  const linkChecks = useMemo((): SeoCheck[] => {
    if (loadingPosts) return []
    if (relatedPosts.length === 0) {
      return [{
        label: 'No internal linking opportunities found',
        severity: 'warning' as Severity,
        message: 'Publish more posts with related tags to enable internal linking suggestions.',
        category: 'links' as const,
      }]
    }
    return [{
      label: `${relatedPosts.length} internal linking suggestion${relatedPosts.length !== 1 ? 's' : ''}`,
      severity: 'good' as Severity,
      message: 'Related posts you could link to from your content.',
      category: 'links' as const,
    }]
  }, [relatedPosts, loadingPosts])

  const allChecks = [...checks, ...linkChecks]

  // Group by category
  const grouped = useMemo(() => {
    const map: Record<string, SeoCheck[]> = {}
    for (const check of allChecks) {
      if (!map[check.category]) map[check.category] = []
      map[check.category].push(check)
    }
    return map
  }, [allChecks])

  // Calculate overall score
  const score = useMemo(() => {
    const total = allChecks.length
    if (total === 0) return 0
    const points = allChecks.reduce((sum, c) => {
      if (c.severity === 'good') return sum + 1
      if (c.severity === 'warning') return sum + 0.5
      return sum
    }, 0)
    return Math.round((points / total) * 100)
  }, [allChecks])

  const scoreColor = score >= 80 ? 'text-green-600 dark:text-green-400' : score >= 50 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
  const scoreBg = score >= 80 ? 'from-green-500 to-emerald-500' : score >= 50 ? 'from-yellow-500 to-orange-500' : 'from-red-500 to-pink-500'

  const toggleCategory = (cat: string) => {
    setExpandedCategory(prev => prev === cat ? null : cat)
  }

  return (
    <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-white/40 dark:border-gray-700/30 rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="px-4 py-3 bg-gradient-to-r from-amber-50/80 to-orange-50/80 dark:from-amber-900/20 dark:to-orange-900/20 border-b border-amber-200/30 dark:border-amber-700/30">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200 flex items-center gap-2">
            <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
            SEO Suggestions
          </h3>
          <div className="flex items-center gap-2">
            <div className={`text-xs font-bold ${scoreColor}`}>{score}/100</div>
            <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${scoreBg} transition-all duration-500`}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="divide-y divide-border/30">
        {(['headings', 'images', 'content', 'keywords', 'links'] as const).map(category => {
          const catChecks = grouped[category] || []
          if (catChecks.length === 0) return null

          const Icon = categoryIcons[category]
          const isExpanded = expandedCategory === category
          const worstSeverity = catChecks.some(c => c.severity === 'error')
            ? 'error'
            : catChecks.some(c => c.severity === 'warning')
              ? 'warning'
              : 'good'
          const SeverityIcon = severityIcons[worstSeverity]

          return (
            <div key={category}>
              <button
                type="button"
                onClick={() => toggleCategory(category)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{categoryLabels[category]}</span>
                </div>
                <div className="flex items-center gap-2">
                  <SeverityIcon className={`w-4 h-4 ${severityColors[worstSeverity]}`} />
                  {isExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-3 space-y-2">
                  {catChecks.map((check, i) => {
                    const CheckIcon = severityIcons[check.severity]
                    return (
                      <div key={i} className="flex items-start gap-2.5 pl-6">
                        <CheckIcon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${severityColors[check.severity]}`} />
                        <div>
                          <p className="text-xs font-medium text-foreground">{check.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{check.message}</p>
                        </div>
                      </div>
                    )
                  })}

                  {/* Show related posts for internal linking */}
                  {category === 'links' && relatedPosts.length > 0 && (
                    <div className="pl-6 mt-2 space-y-1.5">
                      <p className="text-xs text-muted-foreground font-medium">Suggested posts to link:</p>
                      {relatedPosts.map(post => (
                        <div key={post.id} className="flex items-center gap-2 text-xs">
                          <LinkIcon className="w-3 h-3 text-blue-500 flex-shrink-0" />
                          <span className="text-foreground truncate">{post.title}</span>
                          <code className="text-[10px] text-muted-foreground bg-muted/50 px-1 py-0.5 rounded flex-shrink-0">
                            /blog/{post.slug}
                          </code>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
