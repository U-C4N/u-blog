import { Ornament } from './ornament'

export function RoyalDivider({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-4 py-4 ${className}`}>
      <span className="gold-divider flex-1" />
      <span className="gold-text">
        <Ornament variant="diamond" />
      </span>
      <span className="gold-divider flex-1" />
    </div>
  )
}
