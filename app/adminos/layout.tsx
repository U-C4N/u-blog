import { Inter } from 'next/font/google'
import { Background } from '@/components/background'

const inter = Inter({ subsets: ['latin'] })

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={`${inter.className} bg-background/80 text-foreground antialiased min-h-screen`}>
      <Background />
      {children}
    </div>
  )
}