import Link from 'next/link'
import { Fragment } from 'react'
import { ChevronRight, Home } from 'lucide-react'
import { env } from '@/env.mjs'

export type BreadcrumbItem = {
  label: string
  href: string
  active?: boolean
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

export function SEOBreadcrumb({ items, className = '' }: BreadcrumbProps) {
  // Generate structured data for breadcrumbs
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: env.NEXT_PUBLIC_SITE_URL
      },
      ...items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 2,
        name: item.label,
        item: `${env.NEXT_PUBLIC_SITE_URL}${item.href}`
      }))
    ]
  }
  
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <nav aria-label="Breadcrumb" className={`flex items-center text-sm ${className}`}>
        <ol className="flex items-center space-x-2">
          <li>
            <Link 
              href="/" 
              className="flex items-center text-muted-foreground hover:text-foreground transition-colors" 
              aria-label="Home"
            >
              <Home className="h-4 w-4" />
            </Link>
          </li>
          
          {items.map((item, index) => (
            <Fragment key={item.href}>
              <li className="flex items-center">
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </li>
              <li>
                {item.active ? (
                  <span className="font-medium" aria-current="page">
                    {item.label}
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            </Fragment>
          ))}
        </ol>
      </nav>
    </>
  )
} 