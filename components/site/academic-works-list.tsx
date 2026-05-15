export type AcademicItem = {
  title: string
  year?: number | string
  href?: string
  external?: boolean
}

type Props = {
  title: string
  items: AcademicItem[]
  emptyHint?: string
}

export function AcademicWorksList({ title, items, emptyHint }: Props) {
  return (
    <section>
      <header className="mb-5">
        <h2 className="serif-display text-[13px] tracking-[0.4em] uppercase classical-ink">
          {title}
        </h2>
        <span className="block gold-divider mt-2 w-20" />
      </header>
      {items.length === 0 && emptyHint ? (
        <p className="serif-body italic text-sm classical-ink-muted">{emptyHint}</p>
      ) : (
        <ul className="flex flex-col">
          {items.map((it, i) => {
            const row = (
              <div className="flex items-baseline gap-3 py-2.5">
                <span
                  aria-hidden
                  className="w-1.5 h-1.5 rounded-full shrink-0 translate-y-[-1px]"
                  style={{ backgroundColor: 'hsl(var(--gold))' }}
                />
                <p className="classical-sans text-[13.5px] classical-ink flex-1 leading-snug">
                  {it.title}
                </p>
                {it.year !== undefined && (
                  <span className="classical-sans text-[13px] gold-text tabular-nums shrink-0">
                    {it.year}
                  </span>
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
                    className="block transition-colors hover:[&_p]:text-[hsl(var(--gold))]"
                  >
                    {row}
                  </a>
                </li>
              )
            }
            return (
              <li key={i}>
                {row}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
