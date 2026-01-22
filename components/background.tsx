export function Background() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base subtle gradient - warm gray tones */}
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-50 via-neutral-50 to-stone-100 dark:from-zinc-950 dark:via-neutral-950 dark:to-zinc-900" />

      {/* Large gradient mesh blobs - neutral gray tones */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-zinc-400/8 dark:bg-zinc-400/10 rounded-full blur-3xl" />
      <div className="absolute top-1/4 -right-20 w-80 h-80 bg-stone-400/6 dark:bg-neutral-400/8 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-neutral-400/6 dark:bg-zinc-500/8 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-zinc-300/5 dark:bg-stone-400/6 rounded-full blur-2xl" />

      {/* Subtle glow accent - soft white glow in dark mode */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-3xl max-h-96 bg-gradient-radial from-zinc-400/3 to-transparent dark:from-white/3" />
    </div>
  )
}
