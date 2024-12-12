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
      <div className="flex items-center gap-2">
        {icon}
        <div>
          <div className="flex items-center gap-1">
            <h3 className="font-medium text-[15px] group-hover:text-primary transition-colors">
              {title}
            </h3>
            {external && <ExternalLink className="w-3 h-3 text-muted-foreground" />}
          </div>
          <p className="text-[14px] text-muted-foreground mt-1 line-clamp-3">
            {description}
          </p>
        </div>
      </div>
    </Link>
  )
}