interface SectionProps {
  title: string
  children: React.ReactNode
}

export function Section({ title, children }: SectionProps) {
  return (
    <section>
      <h3 className="text-[17px] font-medium mb-5 text-foreground/80">{title}</h3>
      <div className="space-y-3">
        {children}
      </div>
    </section>
  )
}