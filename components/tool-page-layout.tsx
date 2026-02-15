import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SEOBreadcrumb } from '@/components/ui/seo-breadcrumb'

interface BreadcrumbItem {
  label: string
  href: string
  active?: boolean
}

interface ToolPageLayoutProps {
  title: string
  description: string
  children: React.ReactNode
  jsonLd?: Record<string, unknown>
  breadcrumbItems?: BreadcrumbItem[]
}

export default function ToolPageLayout({ title, description, children, jsonLd, breadcrumbItems }: ToolPageLayoutProps) {
  return (
    <main className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12 sm:py-20">
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {breadcrumbItems && (
        <SEOBreadcrumb items={breadcrumbItems} className="mb-6" />
      )}
      <header className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          <Button asChild variant="ghost" size="sm">
            <Link href="/tools" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Tools
            </Link>
          </Button>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">
          {title}
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground">
          {description}
        </p>
      </header>

      {children}
    </main>
  )
}
