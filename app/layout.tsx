import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Background } from '@/components/background'
import { Providers } from '@/components/providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'U-BLOG',
  description: 'Software Engineer and AI Master\'s Student',
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