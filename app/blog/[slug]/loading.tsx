export default function LoadingPost() {
  return (
    <>
      <div
        aria-hidden
        className="fixed inset-0 -z-20"
        style={{
          backgroundImage: "url('/bg.webp')",
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
          backgroundColor: 'hsl(var(--cream))',
        }}
      />
      <div
        aria-hidden
        className="fixed inset-0 -z-10"
        style={{ backgroundColor: 'hsl(var(--cream) / 0.55)' }}
      />

      <main className="relative classical-ink min-h-screen">
        <section className="relative w-full pt-28 sm:pt-32 lg:pt-36 pb-10 sm:pb-14">
          <div className="max-w-5xl mx-auto px-6 sm:px-10">
            <div className="animate-pulse space-y-6">
              <div className="h-3 w-32 rounded-sm" style={{ backgroundColor: 'hsl(var(--ink) / 0.08)' }} />
              <div className="space-y-4 mt-10">
                <div className="h-3 w-48 rounded-sm" style={{ backgroundColor: 'hsl(var(--ink) / 0.08)' }} />
                <div className="h-10 sm:h-14 w-3/4 rounded-sm" style={{ backgroundColor: 'hsl(var(--ink) / 0.08)' }} />
                <div className="h-px w-60 mt-3" style={{ backgroundColor: 'hsl(var(--gold) / 0.4)' }} />
                <div className="flex items-center gap-6 mt-4">
                  <div className="h-3 w-24 rounded-sm" style={{ backgroundColor: 'hsl(var(--ink) / 0.08)' }} />
                  <div className="h-3 w-20 rounded-sm" style={{ backgroundColor: 'hsl(var(--ink) / 0.08)' }} />
                  <div className="h-3 w-20 rounded-sm" style={{ backgroundColor: 'hsl(var(--ink) / 0.08)' }} />
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="relative bg-white border-t border-[hsl(var(--ink)/0.06)]">
          <div className="max-w-5xl mx-auto px-6 sm:px-10 py-12 lg:py-16">
            <div className="max-w-3xl mx-auto animate-pulse space-y-5">
              <div className="h-4 w-full rounded-sm" style={{ backgroundColor: 'hsl(var(--cream))' }} />
              <div className="h-4 w-11/12 rounded-sm" style={{ backgroundColor: 'hsl(var(--cream))' }} />
              <div className="h-4 w-10/12 rounded-sm" style={{ backgroundColor: 'hsl(var(--cream))' }} />
              <div className="h-4 w-full rounded-sm" style={{ backgroundColor: 'hsl(var(--cream))' }} />
              <div className="h-4 w-9/12 rounded-sm" style={{ backgroundColor: 'hsl(var(--cream))' }} />
              <div className="h-[260px] w-full rounded-sm mt-8" style={{ backgroundColor: 'hsl(var(--cream))' }} />
              <div className="h-4 w-full rounded-sm mt-8" style={{ backgroundColor: 'hsl(var(--cream))' }} />
              <div className="h-4 w-10/12 rounded-sm" style={{ backgroundColor: 'hsl(var(--cream))' }} />
              <div className="h-4 w-11/12 rounded-sm" style={{ backgroundColor: 'hsl(var(--cream))' }} />
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
