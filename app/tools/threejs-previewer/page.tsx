import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ThreeJSPreviewer from '@/components/threejs-previewer'

export const metadata: Metadata = {
  title: 'Three.js Previewer | Tools | U-BLOG',
  description: 'Create and preview Three.js scenes with live editing and real-time 3D rendering',
}

export default function ThreeJSPreviewerPage() {
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
          Three.js Previewer
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground">
          Create and preview your Three.js 3D scenes in real-time with live code editing.
        </p>
      </header>

      <ThreeJSPreviewer />
    </main>
  )
}