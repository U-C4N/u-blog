export default function LoadingPost() {
  return (
    <div className="max-w-[1000px] mx-auto px-6 py-16">
      <div className="max-w-[700px] mx-auto">
        <div className="animate-pulse space-y-8">
          <div className="h-6 bg-muted rounded w-32" />
          <div className="space-y-4">
            <div className="h-12 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="h-[300px] bg-muted rounded w-full" />
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded w-full" />
              <div className="h-4 bg-muted rounded w-5/6" />
              <div className="h-4 bg-muted rounded w-4/5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}