import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

interface ProjectLinkProps {
  href: string
  title: string
  description: string
  external?: boolean
  icon?: React.ReactNode
}

export function ProjectLink({ href, title, description, external, icon }: ProjectLinkProps) {
  return (
    <div>
      <Link 
        href={href} 
        className="group inline-flex items-center gap-2 font-medium hover:underline mb-2"
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
      >
        {icon}
        {title}
        {external && <ArrowUpRight className="w-3.5 h-3.5" />}
      </Link>
      <p className="text-[15px] text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}