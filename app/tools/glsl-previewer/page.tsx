import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import GLSLPreviewer from '@/components/glsl-previewer'

export const metadata: Metadata = {
  title: 'GLSL Shader Previewer | Tools | U-BLOG',
  description: 'Create and preview GLSL fragment shaders with live editing and real-time rendering',
}

export default function GLSLPreviewerPage() {
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
          GLSL Shader Previewer
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground">
          Write and preview your GLSL fragment shaders in real-time.
        </p>
      </header>

      <GLSLPreviewer />
    </main>
  )
}
