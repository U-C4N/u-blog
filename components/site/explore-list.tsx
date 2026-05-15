import Link from 'next/link'
import { Feather, Sparkles, Tag, Wrench, type LucideIcon } from 'lucide-react'

type ExploreEntry = {
  label: string
  href: string
  icon: LucideIcon
  description: string
  action: string
}

const ENTRIES: ExploreEntry[] = [
  {
    label: 'WRITING',
    href: '/blog',
    icon: Feather,
    description: 'Thoughts on technology, design, and life.',
    action: 'Read essays',
  },
  {
    label: 'PROMPTS',
    href: '/prompts',
    icon: Sparkles,
    description: 'Collection of useful AI prompts.',
    action: 'Browse prompts',
  },
  {
    label: 'TAGS',
    href: '/tags',
    icon: Tag,
    description: 'Browse posts by topic and keyword clusters.',
    action: 'See all tags',
  },
  {
    label: 'TOOLS',
    href: '/tools',
    icon: Wrench,
    description: 'Useful development and productivity tools.',
    action: 'Explore tools',
  },
]

export function ExploreList() {
  return (
    <section>
      <header className="mb-5">
        <h2 className="serif-display text-[13px] tracking-[0.4em] uppercase classical-ink">
          EXPLORE
        </h2>
        <span className="block gold-divider mt-2 w-20" />
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {ENTRIES.map((entry) => {
          const Icon = entry.icon
          return (
            <Link
              key={entry.label}
              href={entry.href}
              className="group flex flex-col items-center text-center border ink-soft-border bg-white/60 hover:bg-white hover:border-[hsl(var(--gold)/0.55)] transition-all duration-300 rounded-md p-4"
            >
              <Icon className="gold-text w-6 h-6" strokeWidth={1.4} />
              <h3 className="serif-display text-[12px] tracking-[0.3em] uppercase classical-ink mt-3 leading-snug">
                {entry.label}
              </h3>
              <p className="classical-sans text-[11.5px] classical-ink-muted mt-1.5 leading-snug">
                {entry.description}
              </p>
              <span className="classical-sans text-[11.5px] gold-text mt-auto pt-3 group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                {entry.action} <span aria-hidden>→</span>
              </span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
