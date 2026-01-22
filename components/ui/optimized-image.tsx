import Image, { ImageProps } from 'next/image'
import { cn } from '@/lib/utils'

type OptimizedImageProps = Omit<ImageProps, 'alt'> & {
  alt: string // Making alt required
  className?: string
  fallbackText?: string
}

export function OptimizedImage({
  alt,
  className,
  fallbackText,
  ...props
}: OptimizedImageProps) {
  return (
    <div className={cn("relative", className)}>
      <Image
        alt={alt}
        loading="lazy" // Ensure lazy loading
        className={className} // Pass className to Image component
        {...props}
        onError={(e) => {
          // Handle image loading errors
          const target = e.target as HTMLImageElement
          if (target) {
            target.style.display = 'none'
            // Create a fallback element
            const fallback = document.createElement('div')
            fallback.className = cn('bg-muted flex items-center justify-center', className || '')
            fallback.style.width = '100%'
            fallback.style.height = '100%'
            fallback.innerText = fallbackText || alt || 'Image'
            target.parentNode?.appendChild(fallback)
          }
        }}
      />
    </div>
  )
} 