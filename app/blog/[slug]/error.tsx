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
    <div className="max-w-[1000px] mx-auto px-6 py-16">
      <div className="max-w-[700px] mx-auto">
        <div className="text-destructive">
          <h2 className="text-lg font-semibold mb-2">Something went wrong!</h2>
          <p className="mb-4">{error.message}</p>
          <div className="space-x-4">
            <button
              onClick={reset}
              className="text-sm underline hover:no-underline"
            >
              Try again
            </button>
            <Link
              href="/blog"
              className="text-sm underline hover:no-underline"
            >
              Back to Blog
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}