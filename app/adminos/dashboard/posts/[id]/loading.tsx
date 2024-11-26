export default function LoadingPost() {
  return (
    <main className="max-w-[1000px] mx-auto px-6 py-16">
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-muted rounded w-48" />
        <div className="max-w-3xl space-y-4">
          <div>
            <div className="h-5 bg-muted rounded w-20 mb-2" />
            <div className="h-10 bg-muted rounded w-full" />
          </div>
          <div>
            <div className="h-5 bg-muted rounded w-32 mb-2" />
            <div className="h-[400px] bg-muted rounded w-full" />
          </div>
          <div className="h-6 bg-muted rounded w-24" />
          <div className="flex justify-end gap-4">
            <div className="h-10 bg-muted rounded w-24" />
            <div className="h-10 bg-muted rounded w-24" />
          </div>
        </div>
      </div>
    </main>
  )
}