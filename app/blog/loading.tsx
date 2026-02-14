export default function LoadingBlog() {
  return (
    <main className="max-w-[1000px] mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <div className="max-w-[700px]">
        <div className="animate-pulse">
          {/* Header skeleton */}
          <div className="mb-14">
            <div className="h-4 bg-muted rounded w-16 mb-8" />
            <div className="h-7 bg-muted rounded w-28 mb-2" />
            <div className="h-4 bg-muted rounded w-64" />
          </div>
          {/* Timeline skeleton */}
          <div className="relative">
            <div className="absolute left-[7px] top-2 bottom-4 w-px bg-border" />
            <div className="space-y-10">
              {[1, 2].map(section => (
                <div key={section}>
                  <div className="relative flex items-center gap-4 mb-5">
                    <div className="w-[15px] h-[15px] bg-muted rounded-full shrink-0 z-10" />
                    <div className="h-5 bg-muted rounded w-14" />
                    <div className="flex-1 h-px bg-border/50" />
                  </div>
                  <div className="space-y-1">
                    {[1, 2, 3].map(item => (
                      <div key={item} className="relative">
                        <div className="absolute left-[3px] top-[18px] w-[9px] h-[9px] rounded-full bg-muted z-10" />
                        <div className="ml-8 p-3">
                          <div className="flex items-baseline justify-between gap-4">
                            <div className="h-4 bg-muted rounded w-3/4" />
                            <div className="h-3 bg-muted rounded w-16 shrink-0" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
