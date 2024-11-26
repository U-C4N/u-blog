export function Background() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-4 h-4 rounded-full bg-blue-500/50 blur-xl" />
      <div className="absolute top-1/3 right-1/3 w-4 h-4 rounded-full bg-blue-500/50 blur-xl" />
      <div className="absolute bottom-1/4 right-1/4 w-4 h-4 rounded-full bg-blue-500/50 blur-xl" />
    </div>
  )
}