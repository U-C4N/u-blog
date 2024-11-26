'use client'

import Link from 'next/link'

export default function ErrorPost({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="max-w-[1000px] mx-auto px-6 py-16">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-2xl font-bold text-destructive mb-4">Something went wrong!</h2>
        <p className="text-muted-foreground mb-6">{error.message}</p>
        <div className="space-x-4">
          <button
            onClick={reset}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Try again
          </button>
          <Link
            href="/adminos/dashboard/posts"
            className="px-4 py-2 border rounded-md hover:bg-muted transition-colors"
          >
            Back to Posts
          </Link>
        </div>
      </div>
    </main>
  )
}