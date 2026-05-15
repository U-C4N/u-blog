'use client'

import Link from 'next/link'
import { ArrowLeft, RotateCcw } from 'lucide-react'

export default function ErrorPost({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <>
      <div
        aria-hidden
        className="fixed inset-0 -z-20"
        style={{
          backgroundImage: "url('/bg.webp')",
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
          backgroundColor: 'hsl(var(--cream))',
        }}
      />
      <div
        aria-hidden
        className="fixed inset-0 -z-10"
        style={{ backgroundColor: 'hsl(var(--cream) / 0.55)' }}
      />

      <main className="relative classical-ink min-h-screen flex items-center justify-center px-6">
        <div className="text-center max-w-md classical-fade-up">
          <p className="serif-display text-[11px] tracking-[0.4em] uppercase gold-text">
            Codex&nbsp;·&nbsp;Disturbance
          </p>
          <span className="gold-divider w-24 mx-auto mt-4 inline-block" />
          <h1 className="serif-display text-[44px] sm:text-[56px] font-medium classical-ink mt-6 leading-[0.95]">
            ERRATUM
          </h1>
          <p className="serif-body italic text-[15px] classical-ink-muted mt-4">
            {error.message || 'An unexpected disturbance occurred while loading this chronicle.'}
          </p>

          <div className="mt-8 flex items-center justify-center gap-6">
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-2 serif-display text-[11px] tracking-[0.32em] uppercase classical-ink-muted hover:gold-text transition-colors group"
            >
              <RotateCcw className="w-3.5 h-3.5 group-hover:-rotate-45 transition-transform duration-300" strokeWidth={1.6} />
              Try again
            </button>
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 serif-display text-[11px] tracking-[0.32em] uppercase classical-ink-muted hover:gold-text transition-colors group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform duration-300" strokeWidth={1.6} />
              Return to Codex
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}
