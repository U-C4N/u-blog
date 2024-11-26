interface SectionProps {
  title: string
  children: React.ReactNode
}

export function Section({ title, children }: SectionProps) {
  return (
    <section>
      <h3 className="text-[17px] font-medium mb-6">{title}</h3>
      <div className="space-y-8">
        {children}
      </div>
    </section>
  )
}