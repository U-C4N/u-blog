import type { Profile } from '@/lib/supabase/config'
import { Ornament } from './ornament'

function splitName(full: string): [string, string] {
  const parts = full.trim().split(/\s+/)
  if (parts.length === 0) return ['', '']
  if (parts.length === 1) return [parts[0].toUpperCase(), '']
  const first = parts[0].toUpperCase()
  const rest = parts.slice(1).join(' ').toUpperCase()
  return [first, rest]
}

function splitSubtitle(subtitle: string): string[] {
  return subtitle
    .split(/\s*(?:~|—|·|\||,)\s*/)
    .map((s) => s.trim())
    .filter(Boolean)
}

type Props = { profile: Profile }

export function Hero({ profile }: Props) {
  const [firstName, lastName] = splitName(profile.name)
  const subtitleParts = splitSubtitle(profile.subtitle)
  const tagLabel = profile.title || 'Mr.Creator'

  return (
    <section
      id="about"
      className="relative w-full overflow-hidden"
      style={{ minHeight: 'clamp(620px, 92vh, 880px)' }}
    >
      {/* Left-side rotated tagline */}
      <div
        aria-hidden
        className="hidden lg:flex absolute left-4 xl:left-8 top-1/2 -translate-y-1/2 origin-center items-center gap-3 -rotate-90 select-none z-30"
      >
        <span className="gold-divider w-10 inline-block" />
        <span className="serif-display text-[10px] tracking-[0.5em] classical-ink-muted uppercase whitespace-nowrap">
          Discipline · Focus · Impact
        </span>
        <span className="gold-divider w-10 inline-block" />
      </div>

      {/* Right-side rotated tagline */}
      <div
        aria-hidden
        className="hidden lg:flex absolute right-4 xl:right-8 top-1/2 -translate-y-1/2 origin-center items-center gap-3 rotate-90 select-none z-30"
      >
        <span className="gold-divider w-10 inline-block" />
        <span className="serif-body italic text-[10px] tracking-[0.42em] classical-ink-muted uppercase whitespace-nowrap">
          Excellence is not an act, but an art
        </span>
        <span className="gold-divider w-10 inline-block" />
      </div>

      {/* Bust — positioned at right side of arch; veil sits at page root */}
      <div className="absolute left-[72%] -translate-x-1/2 bottom-0 z-[60] h-[60%] sm:h-[62%] lg:h-[64%] cursor-pointer classical-fade-up classical-delay-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hope-optimized.webp"
          alt={profile.name}
          width={1323}
          height={1612}
          fetchPriority="high"
          className="bust-marble bust-trigger h-full w-auto drop-shadow-[0_24px_36px_rgba(31,27,23,0.15)]"
        />
      </div>

      {/* Foreground content — positioned at LEFT, left-aligned within block */}
      <div className="absolute top-[14%] sm:top-[15%] lg:top-[16%] left-6 sm:left-10 lg:left-[10%] flex flex-col items-start text-left max-w-[640px] z-20 pointer-events-none">
        {/* Pretitle: // MR.CREATOR </> with gold brackets, ink label */}
        <div className="flex items-center gap-3 sm:gap-4 classical-fade-up">
          <span className="gold-divider w-10 sm:w-14 inline-block" />
          <p className="serif-body italic text-[11px] sm:text-[12px] tracking-[0.5em] uppercase whitespace-nowrap">
            <span className="gold-text">//&nbsp;</span>
            <span className="classical-ink">{tagLabel}</span>
            <span className="gold-text">&nbsp;{'</>'}</span>
          </p>
          <span className="gold-divider w-10 sm:w-14 inline-block" />
        </div>

        {/* Massive name — UMUTCAN BLACK ink, EDIZASLAN gold */}
        <h1 className="serif-display leading-[0.88] tracking-[0.03em] mt-4 sm:mt-5 classical-fade-up classical-delay-1">
          <span className="block text-[clamp(48px,7.5vw,108px)] font-medium classical-ink">
            {firstName}
          </span>
          {lastName && (
            <span className="block text-[clamp(48px,7.5vw,108px)] font-medium -mt-1 gold-text">
              {lastName}
            </span>
          )}
        </h1>

        {/* Subtitle */}
        <p className="mt-5 serif-display text-[11px] sm:text-[12px] tracking-[0.38em] uppercase classical-ink classical-fade-up classical-delay-2">
          {subtitleParts.map((part, i) => (
            <span key={part}>
              {part}
              {i < subtitleParts.length - 1 && (
                <span className="classical-ink-muted mx-3 font-light">━</span>
              )}
            </span>
          ))}
        </p>

        {/* Gold divider line under subtitle */}
        <span className="gold-divider w-[min(280px,40vw)] mt-3 classical-fade-up classical-delay-4" />
      </div>
    </section>
  )
}
