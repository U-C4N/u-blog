import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import MarkdownPreview from '@/components/markdown-preview'

export const metadata: Metadata = {
  title: 'Markdown Preview | Tools | U-BLOG',
  description: 'Preview your markdown content with live editing',
}

export default function MarkdownPreviewPage() {
  return (
    <main className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12 sm:py-20">
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
          Markdown Preview
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground">
          Preview and edit your markdown content in real time.
        </p>
      </header>

      <MarkdownPreview />
    </main>
  )
}
