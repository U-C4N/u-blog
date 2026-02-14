import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { ReactNode } from 'react'

interface ProjectLinkProps {
  href: string
  title: string
  description: string
  external?: boolean
  icon?: ReactNode
}

export function ProjectLink({ href, title, description, external, icon }: ProjectLinkProps) {
  return (
    <Link
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className="block group"
    >
      <div className="glass-strong flex items-center gap-4 p-4 rounded-2xl glass-hover transition-all duration-300">
        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center glass rounded-xl text-muted-foreground group-hover:text-foreground transition-colors">
          {icon}
        </div>
        <div>
          <div className="flex items-center gap-1">
            <h3 className="font-medium text-[15px] group-hover:text-primary transition-colors">
              {title}
            </h3>
            {external && <ExternalLink className="w-3 h-3 text-muted-foreground" />}
          </div>
          <p className="text-[14px] text-muted-foreground mt-0.5 line-clamp-3">
            {description}
          </p>
        </div>
      </div>
    </Link>
  )
}