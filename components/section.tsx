interface SectionProps {
  title: string
  children: React.ReactNode
}

export function Section({ title, children }: SectionProps) {
  return (
    <section>
      <h3 className="text-[15px] font-semibold mb-5 text-foreground/85 uppercase tracking-[0.08em] flex items-center gap-2.5">
        <span className="w-1.5 h-1.5 rounded-full gradient-dot shrink-0" />
        {title}
      </h3>
      <div className="space-y-3">
        {children}
      </div>
    </section>
  )
}