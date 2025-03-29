import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Background } from '@/components/background'
import { Providers } from '@/components/providers'
import { env } from '@/env.mjs'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'U-BLOG | Umutcan Edizaslan',
    template: '%s | U-BLOG'
  },
  description: 'Software Engineer and AI Master\'s Student. Thoughts on technology, design, and life.',
  keywords: ['Software Engineer', 'AI', 'Blog', 'Technology', 'Web Development', 'Umutcan Edizaslan'],
  authors: [{ name: 'Umutcan Edizaslan' }],
  creator: 'Umutcan Edizaslan',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: env.NEXT_PUBLIC_SITE_URL,
    title: 'U-BLOG | Umutcan Edizaslan',
    description: 'Software Engineer and AI Master\'s Student. Thoughts on technology, design, and life.',
    siteName: 'U-BLOG',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'U-BLOG | Umutcan Edizaslan',
    description: 'Software Engineer and AI Master\'s Student. Thoughts on technology, design, and life.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: env.NEXT_PUBLIC_SITE_URL,
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-background/80 text-foreground antialiased min-h-screen`}>
        <Background />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}