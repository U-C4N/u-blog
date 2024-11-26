'use client'

export default function ErrorBlog({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="max-w-[1000px] mx-auto px-6 py-16">
      <div className="max-w-[650px]">
        <div className="text-destructive">
          <h2 className="text-lg font-semibold mb-2">Something went wrong!</h2>
          <p className="mb-4">{error.message}</p>
          <button
            onClick={reset}
            className="text-sm underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      </div>
    </main>
  )
}