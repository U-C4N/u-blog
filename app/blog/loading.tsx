export default function LoadingBlog() {
  return (
    <>
      {/* Match the marble bg from the real page so there's no flash */}
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
        {/* Header band */}
        <section className="relative w-full pt-28 sm:pt-32 lg:pt-36 pb-10 sm:pb-14">
          <div className="max-w-6xl mx-auto px-6 sm:px-10 animate-pulse">
            <div className="h-3 w-32 rounded bg-[hsl(var(--ink)/0.08)]" />
            <div className="mt-10 sm:mt-14 space-y-5">
              <div className="h-3 w-44 rounded bg-[hsl(var(--ink)/0.08)]" />
              <div className="h-[clamp(48px,8vw,108px)] w-[60%] max-w-[640px] rounded bg-[hsl(var(--ink)/0.08)]" />
              <div className="h-4 w-[70%] max-w-[480px] rounded bg-[hsl(var(--ink)/0.06)]" />
              <div className="gold-divider w-[min(280px,40vw)]" />
            </div>
          </div>
        </section>

        {/* Body */}
        <div className="relative bg-white border-t border-[hsl(var(--ink)/0.06)]">
          <div className="max-w-6xl mx-auto px-6 sm:px-10 py-12 lg:py-16 animate-pulse">
            <div className="grid grid-cols-1 lg:grid-cols-[180px_1fr] gap-10 lg:gap-16">
              <aside className="hidden lg:block">
                <div className="h-3 w-20 rounded bg-[hsl(var(--ink)/0.08)] mb-3" />
                <span className="block gold-divider w-16 mb-5" />
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex justify-between gap-3">
                      <div className="h-3 w-12 rounded bg-[hsl(var(--ink)/0.08)]" />
                      <div className="h-3 w-6 rounded bg-[hsl(var(--ink)/0.06)]" />
                    </div>
                  ))}
                </div>
              </aside>

              <div className="space-y-14">
                {[0, 1].map((section) => (
                  <section key={section}>
                    <header className="flex items-baseline gap-4 mb-6">
                      <div className="h-7 w-20 rounded bg-[hsl(var(--ink)/0.08)]" />
                      <span
                        aria-hidden
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: 'hsl(var(--gold))' }}
                      />
                      <div className="h-3 w-24 rounded bg-[hsl(var(--ink)/0.06)]" />
                      <span className="flex-1 gold-divider-soft" />
                    </header>
                    <ul className="flex flex-col">
                      {[0, 1, 2, 3].map((i) => (
                        <li
                          key={i}
                          className="border-t border-[hsl(var(--ink)/0.08)] last:border-b py-6"
                        >
                          <div className="grid grid-cols-[auto_1fr_auto] items-baseline gap-6">
                            <div className="h-4 w-16 rounded bg-[hsl(var(--ink)/0.08)]" />
                            <div className="h-4 w-3/4 rounded bg-[hsl(var(--ink)/0.08)]" />
                            <div className="h-3 w-12 rounded bg-[hsl(var(--ink)/0.06)] hidden sm:block" />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
