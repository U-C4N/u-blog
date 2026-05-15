import type { SVGProps } from 'react'

type Variant = 'diamond' | 'leaf-pair' | 'rule' | 'footer' | 'sprig' | 'laurel-crown' | 'laurel-emblem'

type Props = SVGProps<SVGSVGElement> & { variant?: Variant; initial?: string }

export function Ornament({ variant = 'diamond', initial = 'U', className, ...rest }: Props) {
  switch (variant) {
    case 'laurel-emblem':
      return (
        <svg viewBox="0 0 80 80" width={80} height={80} aria-hidden className={className} {...rest}>
          {/* Outer thin ring */}
          <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth={0.6} fill="none" opacity={0.35} />
          {/* Left laurel branch */}
          <g stroke="currentColor" strokeWidth={1} fill="none" strokeLinecap="round">
            <path d="M12 40 Q 8 26 18 14" />
            {/* leaves on left branch */}
            <path d="M10 36 Q 4 34 4 30" />
            <path d="M10 32 Q 6 28 2 28" />
            <path d="M12 28 Q 8 24 6 20" />
            <path d="M14 24 Q 10 22 8 18" />
            <path d="M16 20 Q 14 16 12 14" />
            {/* inner small leaves */}
            <path d="M14 38 Q 18 36 20 34" />
            <path d="M14 34 Q 18 32 20 30" />
            <path d="M16 30 Q 20 28 22 26" />
            <path d="M18 26 Q 22 24 24 22" />
          </g>
          {/* Right laurel branch (mirror) */}
          <g stroke="currentColor" strokeWidth={1} fill="none" strokeLinecap="round">
            <path d="M68 40 Q 72 26 62 14" />
            <path d="M70 36 Q 76 34 76 30" />
            <path d="M70 32 Q 74 28 78 28" />
            <path d="M68 28 Q 72 24 74 20" />
            <path d="M66 24 Q 70 22 72 18" />
            <path d="M64 20 Q 66 16 68 14" />
            {/* inner */}
            <path d="M66 38 Q 62 36 60 34" />
            <path d="M66 34 Q 62 32 60 30" />
            <path d="M64 30 Q 60 28 58 26" />
            <path d="M62 26 Q 58 24 56 22" />
          </g>
          {/* Bottom crossing knot */}
          <g stroke="currentColor" strokeWidth={1} fill="none" strokeLinecap="round">
            <path d="M12 40 Q 24 56 40 56 Q 56 56 68 40" />
            <path d="M34 56 Q 40 60 46 56" />
            <circle cx="40" cy="56" r="1.4" fill="currentColor" />
          </g>
          {/* Top opening (small crown gap) */}
          <g stroke="currentColor" strokeWidth={1} fill="none" strokeLinecap="round">
            <path d="M18 14 Q 28 8 40 8 Q 52 8 62 14" />
            <circle cx="40" cy="8" r="1.6" fill="currentColor" />
          </g>
          {/* Center initial */}
          <text
            x="40"
            y="46"
            textAnchor="middle"
            fontFamily="var(--font-cinzel), Georgia, serif"
            fontSize="22"
            fontWeight="500"
            fill="currentColor"
            letterSpacing="0.04em"
          >
            {initial}
          </text>
        </svg>
      )
    case 'diamond':
      return (
        <svg viewBox="0 0 16 16" width={12} height={12} aria-hidden className={className} {...rest}>
          <path
            d="M8 1 L11 8 L8 15 L5 8 Z M2 8 L14 8"
            stroke="currentColor"
            strokeWidth={0.8}
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="8" cy="8" r="1.2" fill="currentColor" />
        </svg>
      )
    case 'leaf-pair':
      return (
        <svg viewBox="0 0 200 24" width={200} height={24} aria-hidden className={className} {...rest}>
          {/* Left vine */}
          <g stroke="currentColor" strokeWidth={0.9} fill="none" strokeLinecap="round">
            <path d="M2 12 Q 30 6 60 12 Q 70 14 86 12" />
            <path d="M14 12 Q 18 7 22 10" />
            <path d="M28 12 Q 32 7 36 10" />
            <path d="M44 12 Q 48 17 52 14" />
            <path d="M62 12 Q 66 7 70 10" />
            <circle cx="86" cy="12" r="1.2" fill="currentColor" />
          </g>
          {/* Right vine (mirrored) */}
          <g stroke="currentColor" strokeWidth={0.9} fill="none" strokeLinecap="round">
            <path d="M198 12 Q 170 6 140 12 Q 130 14 114 12" />
            <path d="M186 12 Q 182 7 178 10" />
            <path d="M172 12 Q 168 7 164 10" />
            <path d="M156 12 Q 152 17 148 14" />
            <path d="M138 12 Q 134 7 130 10" />
            <circle cx="114" cy="12" r="1.2" fill="currentColor" />
          </g>
          {/* Center diamond */}
          <path
            d="M100 6 L104 12 L100 18 L96 12 Z"
            stroke="currentColor"
            strokeWidth={0.9}
            fill="none"
          />
          <circle cx="100" cy="12" r="0.8" fill="currentColor" />
        </svg>
      )
    case 'rule':
      return (
        <svg viewBox="0 0 600 16" width="100%" height={16} aria-hidden preserveAspectRatio="none" className={className} {...rest}>
          <line x1="0" y1="8" x2="280" y2="8" stroke="currentColor" strokeWidth={0.6} opacity={0.55} />
          <line x1="320" y1="8" x2="600" y2="8" stroke="currentColor" strokeWidth={0.6} opacity={0.55} />
          <path
            d="M300 3 L307 8 L300 13 L293 8 Z"
            stroke="currentColor"
            strokeWidth={0.8}
            fill="none"
          />
          <circle cx="300" cy="8" r="0.9" fill="currentColor" />
        </svg>
      )
    case 'sprig':
      return (
        <svg viewBox="0 0 24 80" width={24} height={80} aria-hidden className={className} {...rest}>
          <g stroke="currentColor" strokeWidth={0.8} fill="none" strokeLinecap="round">
            <path d="M12 4 Q 12 40 12 76" />
            <path d="M12 14 Q 6 18 4 24" />
            <path d="M12 24 Q 18 28 20 34" />
            <path d="M12 36 Q 6 40 4 46" />
            <path d="M12 46 Q 18 50 20 56" />
            <path d="M12 58 Q 6 62 4 68" />
            <circle cx="12" cy="4" r="0.9" fill="currentColor" />
            <circle cx="12" cy="76" r="0.9" fill="currentColor" />
          </g>
        </svg>
      )
    case 'laurel-crown':
      return (
        <svg viewBox="0 0 160 80" width={160} height={80} aria-hidden className={className} {...rest}>
          <g stroke="currentColor" strokeWidth={0.9} fill="none" strokeLinecap="round">
            {/* left laurel */}
            <path d="M30 70 Q 16 50 30 26 Q 44 14 70 10" />
            <path d="M30 56 Q 22 56 18 62" />
            <path d="M34 46 Q 26 44 22 48" />
            <path d="M40 36 Q 32 32 28 34" />
            <path d="M50 28 Q 42 22 38 22" />
            <path d="M60 22 Q 54 14 50 12" />
            {/* right laurel */}
            <path d="M130 70 Q 144 50 130 26 Q 116 14 90 10" />
            <path d="M130 56 Q 138 56 142 62" />
            <path d="M126 46 Q 134 44 138 48" />
            <path d="M120 36 Q 128 32 132 34" />
            <path d="M110 28 Q 118 22 122 22" />
            <path d="M100 22 Q 106 14 110 12" />
            {/* center crown */}
            <path d="M70 10 Q 80 4 90 10" />
            <path d="M76 12 Q 80 8 84 12" />
            <circle cx="80" cy="10" r="1.4" fill="currentColor" />
          </g>
        </svg>
      )
    case 'footer':
      return (
        <svg viewBox="0 0 220 120" width={220} height={120} aria-hidden className={className} {...rest}>
          <g stroke="currentColor" strokeWidth={1} fill="none" strokeLinecap="round">
            {/* outer arch */}
            <path d="M30 100 Q 110 30 190 100" />
            {/* inner crown */}
            <path d="M60 96 Q 110 52 160 96" opacity="0.6" />
            {/* center diamond + spire */}
            <path d="M110 24 L116 36 L110 48 L104 36 Z" />
            <line x1="110" y1="14" x2="110" y2="24" />
            <circle cx="110" cy="10" r="2" fill="currentColor" />
            <circle cx="110" cy="36" r="1.4" fill="currentColor" />
            {/* swirl tips */}
            <path d="M30 100 Q 22 96 22 88" />
            <path d="M190 100 Q 198 96 198 88" />
            {/* small leaves */}
            <path d="M70 78 Q 78 70 88 70" />
            <path d="M150 78 Q 142 70 132 70" />
            <path d="M84 60 Q 90 54 98 54" />
            <path d="M136 60 Q 130 54 122 54" />
          </g>
        </svg>
      )
  }
}
