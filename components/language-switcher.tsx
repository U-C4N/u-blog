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
  baseSlug 
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
        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-muted/20 hover:bg-muted/30 rounded-md transition-colors"
      >
        <Globe className="w-4 h-4" />
        <span>{currentLangName}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1 right-0 bg-background border border-border rounded-md shadow-lg z-10 min-w-[120px]">
          {availableLanguages.map((lang) => (
            <Link
              key={lang.code}
              href={`/blog/${lang.slug}`}
              className={`block px-3 py-2 text-sm hover:bg-muted/30 transition-colors first:rounded-t-md last:rounded-b-md ${
                lang.code === currentLanguage ? 'bg-muted/20 font-medium' : ''
              }`}
              onClick={() => setIsOpen(false)}
            >
              <div className="flex items-center justify-between">
                <span>{lang.code.toUpperCase()}</span>
                {lang.code === currentLanguage && (
                  <div className="w-2 h-2 bg-primary rounded-full" />
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5 truncate">
                {lang.title}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Backdrop to close dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}
