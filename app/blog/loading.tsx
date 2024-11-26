export default function LoadingBlog() {
  return (
    <main className="max-w-[1000px] mx-auto px-6 py-16">
      <div className="max-w-[650px]">
        <div className="animate-pulse space-y-8">
          <div className="h-6 bg-muted rounded w-32" />
          <div className="space-y-4">
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-5/6" />
          </div>
        </div>
      </div>
    </main>
  )
}