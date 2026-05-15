type Props = {
  title: string
  paragraphs: string[]
  emptyHint?: string
}

export function PresentBlock({ title, paragraphs, emptyHint }: Props) {
  return (
    <section>
      <header className="mb-5">
        <h2 className="serif-display text-[13px] tracking-[0.4em] uppercase classical-ink">
          {title}
        </h2>
        <span className="block gold-divider mt-2 w-20" />
      </header>
      {paragraphs.length === 0 && emptyHint ? (
        <p className="serif-body italic text-sm classical-ink-muted">{emptyHint}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {paragraphs.map((p, i) => (
            <p
              key={i}
              className="classical-sans text-[13.5px] leading-[1.55] classical-ink"
            >
              {p}
            </p>
          ))}
        </div>
      )}
    </section>
  )
}
