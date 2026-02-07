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
      <div className="flex items-center gap-4 p-4 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border border-white/40 dark:border-gray-700/30 rounded-xl hover:bg-white/70 dark:hover:bg-gray-900/70 hover:border-white/60 dark:hover:border-gray-600/40 hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)] transition-all duration-200">
        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-white/60 dark:bg-gray-800/60 border border-white/50 dark:border-gray-600/30 rounded-xl text-muted-foreground group-hover:text-foreground transition-colors">
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