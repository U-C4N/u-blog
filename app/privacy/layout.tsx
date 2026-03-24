import type { Metadata } from 'next'
import { toAbsoluteSiteUrl } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy policy for U-BLOG products and the U-Blog Chrome extension.',
  alternates: {
    canonical: toAbsoluteSiteUrl('/privacy'),
  },
}

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children
}
