'use client'

import { Twitter, Instagram, Share2, Check } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

interface SocialShareProps {
  title: string
  url: string
}

export function SocialShare({ title, url }: SocialShareProps) {
  const [copied, setCopied] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const handleCopy = () => {
    navigator.clipboard.writeText(`${title} ${url}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Share post"
        className="inline-flex items-center gap-2 px-3 py-1.5 serif-display text-[11px] tracking-[0.28em] uppercase classical-ink-muted hover:gold-text transition-colors border rounded-sm"
        style={{ borderColor: 'hsl(var(--ink) / 0.15)' }}
      >
        <Share2 className="w-3.5 h-3.5" strokeWidth={1.6} />
        <span>Share</span>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 flex flex-col gap-2 bg-white border rounded-sm shadow-md z-20 p-3 min-w-[180px]"
          style={{ borderColor: 'hsl(var(--ink) / 0.12)' }}
        >
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-3 py-2 classical-sans text-[13px] classical-ink hover:bg-[hsl(var(--cream)/0.6)] hover:gold-text transition-colors rounded-sm"
          >
            <Twitter className="w-4 h-4" strokeWidth={1.6} />
            <span>Twitter</span>
          </a>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-3 px-3 py-2 classical-sans text-[13px] classical-ink hover:bg-[hsl(var(--cream)/0.6)] hover:gold-text transition-colors rounded-sm text-left"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 gold-text" strokeWidth={1.8} />
                <span className="gold-text">Link copied</span>
              </>
            ) : (
              <>
                <Instagram className="w-4 h-4" strokeWidth={1.6} />
                <span>Copy link</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
