import { Ornament } from './ornament'

export type TwoColItem = {
  title: string
  description?: string
  href?: string
  external?: boolean
}

type Props = {
  title: string
  items: TwoColItem[]
  emptyHint?: string
}

export function TwoColList({ title, items, emptyHint }: Props) {
  return (
    <section>
      <header className="flex items-center gap-3 mb-7">
        <Ornament variant="diamond" className="gold-text shrink-0" />
        <h2 className="serif-display text-[13px] tracking-[0.45em] uppercase classical-ink">
          {title}
        </h2>
        <span className="gold-divider flex-1" />
      </header>
      {items.length === 0 && emptyHint ? (
        <p className="serif-body italic text-sm classical-ink-muted">{emptyHint}</p>
      ) : (
        <ul className="flex flex-col">
          {items.map((it, i) => {
            const inner = (
              <div className="py-4 border-b ink-soft-border group-hover:border-[hsl(var(--gold)/0.45)] transition-colors">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="serif-display text-[12px] sm:text-[13px] tracking-[0.18em] uppercase classical-ink leading-snug">
                    {it.title}
                  </p>
                </div>
                {it.description && (
                  <p className="serif-body italic text-[14px] classical-ink-muted mt-1.5 leading-relaxed line-clamp-2">
                    {it.description}
                  </p>
                )}
              </div>
            )
            if (it.href) {
              return (
                <li key={i} className="group">
                  <a
                    href={it.href}
                    target={it.external ? '_blank' : undefined}
                    rel={it.external ? 'noopener noreferrer' : undefined}
                  >
                    {inner}
                  </a>
                </li>
              )
            }
            return (
              <li key={i} className="group">
                {inner}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
