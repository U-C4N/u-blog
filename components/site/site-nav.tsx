'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'

type NavItem = { label: string; href: string; anchor: string }

const NAV_ITEMS: NavItem[] = [
  { label: 'HOME', href: '/', anchor: '#about' },
  { label: 'ACADEMIC WORKS', href: '/', anchor: '#academic' },
  { label: 'OPEN SOURCE', href: '/', anchor: '#open-source' },
  { label: 'EXPLORE', href: '/', anchor: '#explore' },
]

type Props = { contactEmail?: string }

export function SiteNav(_props: Props = {}) {
  const pathname = usePathname()
  const isHome = pathname === '/'
  const [activeAnchor, setActiveAnchor] = useState<string>('#about')
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (!isHome) return
    const ids = ['about', 'academic', 'open-source', 'explore']
    const handler = () => {
      let current = '#about'
      const scrollY = window.scrollY
      for (const id of ids) {
        const el = document.getElementById(id)
        if (!el) continue
        const top = el.getBoundingClientRect().top + scrollY
        if (scrollY + 200 >= top) current = `#${id}`
      }
      setActiveAnchor(current)
    }
    handler()
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [isHome])

  useEffect(() => {
    if (!mobileOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [mobileOpen])

  const handleAnchorClick = (anchor: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!isHome) return
    e.preventDefault()
    setMobileOpen(false)
    const el = document.getElementById(anchor.slice(1))
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 80
      window.scrollTo({ top, behavior: 'smooth' })
      history.replaceState(null, '', `/${anchor}`)
    }
  }

  return (
    <header className="absolute top-0 left-0 right-0 z-40 w-full">
      <nav className="max-w-7xl mx-auto px-6 sm:px-10 py-6 sm:py-7 grid grid-cols-[1fr_auto] items-center gap-6">
        {/* Center menu (desktop) */}
        <ul className="hidden lg:flex items-center justify-center gap-8 xl:gap-10">
          {NAV_ITEMS.map((item) => {
            const isActive = isHome && activeAnchor === item.anchor
            const href = isHome ? item.anchor : `${item.href}${item.anchor}`
            return (
              <li key={item.label} className="flex items-center gap-3">
                <a
                  href={href}
                  onClick={handleAnchorClick(item.anchor)}
                  data-active={isActive}
                  className="classical-nav-link serif-display text-[11px] xl:text-xs tracking-[0.28em] text-foreground/80 hover:text-foreground"
                >
                  {item.label}
                </a>
              </li>
            )
          })}
        </ul>

        {/* Right side: mobile burger only */}
        <div className="flex items-center justify-end">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
            className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-full border gold-border classical-ink"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 marble-bg"
            aria-hidden
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-0 classical-frame backdrop-blur-md" aria-hidden />
          <div className="relative z-10 flex flex-col h-full px-8 py-6">
            <div className="flex items-center justify-end">
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMobileOpen(false)}
                className="inline-flex items-center justify-center w-9 h-9 rounded-full border gold-border classical-ink"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ul className="flex flex-col items-center justify-center flex-1 gap-6">
              {NAV_ITEMS.map((item) => {
                const href = isHome ? item.anchor : `${item.href}${item.anchor}`
                return (
                  <li key={item.label}>
                    <a
                      href={href}
                      onClick={handleAnchorClick(item.anchor)}
                      className="serif-display text-base tracking-[0.32em] classical-ink hover:gold-text transition-colors"
                    >
                      {item.label}
                    </a>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}
    </header>
  )
}
