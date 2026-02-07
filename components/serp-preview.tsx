'use client'

import React, { useState, useMemo } from 'react'
import { Monitor, Smartphone } from 'lucide-react'

interface SerpPreviewProps {
  title: string
  metaTitle: string
  metaDescription: string
  slug: string
  siteUrl?: string
}

export function SerpPreview({ title, metaTitle, metaDescription, slug, siteUrl }: SerpPreviewProps) {
  const [view, setView] = useState<'desktop' | 'mobile'>('desktop')

  const displayTitle = metaTitle || title || 'Post Title'
  const displayDescription = metaDescription || 'Add a meta description to control how this post appears in search results.'
  const displayUrl = siteUrl
    ? `${siteUrl}/blog/${slug || 'your-post-slug'}`
    : `yourdomain.com/blog/${slug || 'your-post-slug'}`

  const titleLimit = 60
  const descLimit = 160
  const titleLen = displayTitle.length
  const descLen = displayDescription.length
  const isTitleTruncated = titleLen > titleLimit
  const isDescTruncated = descLen > descLimit

  const truncatedTitle = isTitleTruncated
    ? displayTitle.slice(0, titleLimit) + '...'
    : displayTitle

  const truncatedDesc = isDescTruncated
    ? displayDescription.slice(0, descLimit) + '...'
    : displayDescription

  // Format URL like Google does: domain > path segments
  const formattedUrl = useMemo(() => {
    try {
      const url = new URL(displayUrl.startsWith('http') ? displayUrl : `https://${displayUrl}`)
      const pathParts = url.pathname.split('/').filter(Boolean)
      return `${url.hostname}${pathParts.length > 0 ? ' > ' + pathParts.join(' > ') : ''}`
    } catch {
      return displayUrl
    }
  }, [displayUrl])

  const titleColor = titleLen === 0
    ? 'text-gray-400'
    : titleLen <= 50
      ? 'text-yellow-600 dark:text-yellow-400'
      : titleLen <= titleLimit
        ? 'text-green-600 dark:text-green-400'
        : 'text-red-600 dark:text-red-400'

  const descColor = descLen === 0
    ? 'text-gray-400'
    : descLen < 120
      ? 'text-yellow-600 dark:text-yellow-400'
      : descLen <= descLimit
        ? 'text-green-600 dark:text-green-400'
        : 'text-red-600 dark:text-red-400'

  return (
    <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-white/40 dark:border-gray-700/30 rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="px-4 py-3 bg-gradient-to-r from-indigo-50/80 to-violet-50/80 dark:from-indigo-900/20 dark:to-violet-900/20 border-b border-indigo-200/30 dark:border-indigo-700/30">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-indigo-800 dark:text-indigo-200 flex items-center gap-2">
            <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
            Google SERP Preview
          </h3>
          <div className="flex items-center gap-1 bg-white/60 dark:bg-gray-800/60 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setView('desktop')}
              className={`p-1.5 rounded-md transition-all duration-200 ${
                view === 'desktop'
                  ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              title="Desktop preview"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setView('mobile')}
              className={`p-1.5 rounded-md transition-all duration-200 ${
                view === 'mobile'
                  ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              title="Mobile preview"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Google SERP Result */}
        <div
          className={`bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-4 ${
            view === 'mobile' ? 'max-w-[360px]' : ''
          }`}
        >
          {/* URL line */}
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-300">
                {(() => {
                  try {
                    const url = new URL(displayUrl.startsWith('http') ? displayUrl : `https://${displayUrl}`)
                    return url.hostname.charAt(0).toUpperCase()
                  } catch {
                    return 'U'
                  }
                })()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                {(() => {
                  try {
                    const url = new URL(displayUrl.startsWith('http') ? displayUrl : `https://${displayUrl}`)
                    return url.hostname
                  } catch {
                    return 'yourdomain.com'
                  }
                })()}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 truncate">{formattedUrl}</p>
            </div>
          </div>

          {/* Title */}
          <h3
            className={`font-medium leading-snug mb-1 text-blue-700 dark:text-blue-400 hover:underline cursor-pointer ${
              view === 'mobile' ? 'text-base' : 'text-xl'
            }`}
          >
            {truncatedTitle}
          </h3>

          {/* Description */}
          <p className={`text-gray-600 dark:text-gray-400 leading-relaxed ${
            view === 'mobile' ? 'text-xs' : 'text-sm'
          }`}>
            {truncatedDesc}
          </p>
        </div>

        {/* Character counters */}
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Title length</span>
            <span className={titleColor}>
              {titleLen}/{titleLimit} chars
              {isTitleTruncated && ' (will be truncated)'}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${
                titleLen === 0
                  ? 'bg-gray-300'
                  : titleLen <= 50
                    ? 'bg-yellow-400'
                    : titleLen <= titleLimit
                      ? 'bg-green-500'
                      : 'bg-red-500'
              }`}
              style={{ width: `${Math.min((titleLen / titleLimit) * 100, 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs mt-2">
            <span className="text-muted-foreground">Description length</span>
            <span className={descColor}>
              {descLen}/{descLimit} chars
              {isDescTruncated && ' (will be truncated)'}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${
                descLen === 0
                  ? 'bg-gray-300'
                  : descLen < 120
                    ? 'bg-yellow-400'
                    : descLen <= descLimit
                      ? 'bg-green-500'
                      : 'bg-red-500'
              }`}
              style={{ width: `${Math.min((descLen / descLimit) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
