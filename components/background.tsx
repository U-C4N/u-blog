export function Background() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-zinc-50/80 to-stone-100 dark:from-zinc-950 dark:via-neutral-950 dark:to-zinc-900" />

      {/* Colored accent orbs — these give glass cards depth and iridescence */}
      <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full blur-[120px] bg-sky-300/[0.22] dark:bg-sky-500/[0.12]" />
      <div className="absolute top-[30%] -right-24 w-[400px] h-[400px] rounded-full blur-[100px] bg-violet-300/[0.18] dark:bg-violet-500/[0.10]" />
      <div className="absolute -bottom-32 left-[20%] w-[500px] h-[500px] rounded-full blur-[120px] bg-teal-300/[0.16] dark:bg-teal-500/[0.09]" />
      <div className="absolute bottom-[25%] right-[20%] w-[280px] h-[280px] rounded-full blur-[80px] bg-amber-200/[0.14] dark:bg-amber-500/[0.07]" />
      <div className="absolute top-[60%] left-[40%] w-[320px] h-[320px] rounded-full blur-[100px] bg-rose-200/[0.12] dark:bg-rose-500/[0.06]" />

      {/* Central soft glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-4xl max-h-[500px] bg-gradient-radial from-white/[0.04] to-transparent dark:from-white/[0.02]" />

      {/* Subtle grain overlay for texture */}
      <div
        className="absolute inset-0 opacity-[0.018] dark:opacity-[0.035]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '200px 200px',
        }}
      />
    </div>
  )
}
