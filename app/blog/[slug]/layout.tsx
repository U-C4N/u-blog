import { Background } from '@/components/background'

export default function BlogPostLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      <Background />
      {children}
    </div>
  )
}