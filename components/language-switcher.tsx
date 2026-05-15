'use client'

import { useState } from 'react'
import { Globe, ChevronDown } from 'lucide-react'
import Link from 'next/link'

interface LanguageSwitcherProps {
  currentLanguage?: string
  availableLanguages?: { code: string; slug: string; title: string }[]
  baseSlug: string
}

export function LanguageSwitcher({
  currentLanguage = 'en',
  availableLanguages = [],
}: LanguageSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (availableLanguages.length === 0) {
    return null
  }

  const currentLangName = currentLanguage.toUpperCase()

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-3 py-1.5 serif-display text-[11px] tracking-[0.28em] uppercase classical-ink-muted hover:gold-text transition-colors border rounded-sm"
        style={{ borderColor: 'hsl(var(--ink) / 0.15)' }}
      >
        <Globe className="w-3.5 h-3.5" strokeWidth={1.6} />
        <span>{currentLangName}</span>
        <ChevronDown
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          strokeWidth={1.6}
        />
      </button>

      {isOpen && (
        <div
          className="absolute top-full mt-2 right-0 bg-white border rounded-sm shadow-md z-20 min-w-[180px] overflow-hidden"
          style={{ borderColor: 'hsl(var(--ink) / 0.12)' }}
        >
          {availableLanguages.map((lang) => {
            const isActive = lang.code === currentLanguage
            return (
              <Link
                key={lang.code}
                href={`/blog/${lang.slug}`}
                className="block px-4 py-3 hover:bg-[hsl(var(--cream)/0.6)] transition-colors border-b last:border-0"
                style={{ borderColor: 'hsl(var(--ink) / 0.06)' }}
                onClick={() => setIsOpen(false)}
              >
                <div className="flex items-center justify-between">
                  <span className="serif-display text-[11px] tracking-[0.32em] uppercase classical-ink">
                    {lang.code.toUpperCase()}
                  </span>
                  {isActive && (
                    <span
                      aria-hidden
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: 'hsl(var(--gold))' }}
                    />
                  )}
                </div>
                <div className="serif-body italic text-[12px] classical-ink-muted mt-1 truncate">
                  {lang.title}
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setIsOpen(false)}
          aria-hidden
        />
      )}
    </div>
  )
}
