import './globals.css'
import type { Metadata } from 'next'
import { Outfit, Cinzel, Cormorant_Garamond, Inter, EB_Garamond, IM_Fell_English, Marcellus_SC } from 'next/font/google'
import { Background } from '@/components/background'
import { Providers } from '@/components/providers'
import { Analytics } from '@/components/analytics'
import { siteUrl } from '@/lib/site'

const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
})

const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-cinzel',
  display: 'swap',
})

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const ebGaramond = EB_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-eb-garamond',
  display: 'swap',
})

const imFellEnglish = IM_Fell_English({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  variable: '--font-im-fell',
  display: 'swap',
})

const marcellusSC = Marcellus_SC({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-marcellus',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
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
    url: siteUrl,
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
    canonical: siteUrl,
  }
}

// Generate WebSite structured data for sitelinks search box
function generateWebSiteStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'U-BLOG',
    url: siteUrl,
    description: 'AI engineering insights, developer tools, and open-source projects by Umutcan Edizaslan.',
    author: {
      '@type': 'Person',
      name: 'Umutcan Edizaslan'
    }
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const structuredData = generateWebSiteStructuredData()

  return (
    <html lang="en" className={`${cinzel.variable} ${cormorant.variable} ${inter.variable} ${ebGaramond.variable} ${imFellEnglish.variable} ${marcellusSC.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="alternate" type="application/rss+xml" href="/feed.xml" title="U-BLOG RSS feed" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className={`${outfit.className} bg-background/80 text-foreground antialiased min-h-screen`}>
        <Background />
        <Providers>
          {children}
        </Providers>
        <Analytics />
      </body>
    </html>
  )
}
