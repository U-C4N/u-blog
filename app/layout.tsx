import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Background } from '@/components/background'
import { Providers } from '@/components/providers'
import { Analytics } from '@/components/analytics'
import { env } from '@/env.mjs'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
})

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

// Generate structured data for organization
function generateOrganizationStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Umutcan Edizaslan',
    url: env.NEXT_PUBLIC_SITE_URL,
    sameAs: [
      'https://github.com/umutcanadizaslan',
      'https://twitter.com/ucnzaslan',
      'https://linkedin.com/in/umutcanedizaslan'
    ],
    jobTitle: 'Software Engineer',
    worksFor: {
      '@type': 'Organization',
      name: 'U-BLOG'
    },
    description: 'Software Engineer and AI Master\'s Student. Thoughts on technology, design, and life.'
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const structuredData = generateOrganizationStructuredData()

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className={`${inter.className} bg-background/80 text-foreground antialiased min-h-screen`}>
        <Background />
        <Providers>
          {children}
        </Providers>
        <Analytics />
      </body>
    </html>
  )
}