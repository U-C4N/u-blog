'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle, RotateCcw } from 'lucide-react'

export default function ToolsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Tools error:', error)
  }, [error])

  return (
    <main className="max-w-[1000px] mx-auto px-4 sm:px-6 py-12 sm:py-20">
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="p-4 rounded-full bg-red-950/30 mb-6">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-md">
          An unexpected error occurred while loading this tool. This might be a temporary issue.
        </p>
        <Button onClick={reset} variant="outline" className="flex items-center gap-2">
          <RotateCcw className="w-4 h-4" />
          Try Again
        </Button>
      </div>
    </main>
  )
}
