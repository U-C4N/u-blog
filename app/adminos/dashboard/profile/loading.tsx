export default function LoadingProfile() {
  return (
    <main className="max-w-[1000px] mx-auto px-6 py-16">
      <div className="animate-pulse">
        <div className="h-8 bg-muted rounded w-48 mb-8" />
        <div className="max-w-2xl space-y-6">
          <div>
            <div className="h-5 bg-muted rounded w-20 mb-2" />
            <div className="h-10 bg-muted rounded w-full" />
          </div>
          <div>
            <div className="h-5 bg-muted rounded w-20 mb-2" />
            <div className="h-10 bg-muted rounded w-full" />
          </div>
          <div>
            <div className="h-5 bg-muted rounded w-20 mb-2" />
            <div className="h-10 bg-muted rounded w-full" />
          </div>
          <div>
            <div className="h-5 bg-muted rounded w-32 mb-4" />
            <div className="space-y-3">
              <div className="h-10 bg-muted rounded w-full" />
              <div className="h-10 bg-muted rounded w-full" />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}