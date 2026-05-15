import Link from 'next/link'
import { Code2, MapPin, Star, type LucideIcon } from 'lucide-react'
import type { GithubRepo } from '@/lib/supabase/config'

function pickBadge(repoName: string): { kind: 'icon'; Icon: LucideIcon } | { kind: 'letter'; letter: string } {
  const n = repoName.toLowerCase()
  if (/(^|[-_ ])map($|[-_ ])|umap/.test(n)) return { kind: 'icon', Icon: MapPin }
  if (/(tool|tools)/.test(n)) return { kind: 'icon', Icon: Code2 }
  return { kind: 'letter', letter: repoName.replace(/^[^a-z0-9]+/i, '').charAt(0).toUpperCase() || 'U' }
}

type Props = {
  repo: GithubRepo
  stars?: number
}

export function OpenSourceCard({ repo, stars }: Props) {
  const badge = pickBadge(repo.repo_name)
  return (
    <Link
      href={repo.repo_url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex flex-col border ink-soft-border bg-white/70 hover:bg-white hover:border-[hsl(var(--gold)/0.55)] transition-all duration-300 rounded-md p-4"
    >
      {/* Branded square logo top-left */}
      <div
        className="w-9 h-9 inline-flex items-center justify-center rounded-md text-white shrink-0"
        style={{ backgroundColor: 'hsl(var(--ink))' }}
        aria-hidden
      >
        {badge.kind === 'icon' ? (
          <badge.Icon className="w-4 h-4" strokeWidth={1.6} />
        ) : (
          <span className="serif-display text-[15px] font-medium leading-none">
            {badge.letter}
          </span>
        )}
      </div>

      {/* Title (mixed-case sans, not tracked uppercase) */}
      <h3 className="classical-sans text-[14px] font-medium classical-ink mt-4 leading-snug">
        {repo.repo_name}
      </h3>

      {/* Description */}
      {repo.description && (
        <p className="classical-sans text-[12px] classical-ink-muted mt-1 leading-snug line-clamp-2">
          {repo.description}
        </p>
      )}

      {/* Star count footer */}
      <div className="mt-auto pt-4 flex items-center gap-1.5">
        <Star className="w-3.5 h-3.5 gold-text fill-[hsl(var(--gold))]" strokeWidth={1.5} />
        <span className="classical-sans text-[12.5px] font-medium classical-ink tabular-nums">
          {stars ?? '—'}
        </span>
      </div>
    </Link>
  )
}
