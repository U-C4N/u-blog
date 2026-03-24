import type { Metadata } from 'next'
import { toAbsoluteSiteUrl } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Prompts',
  description: 'A curated collection of reusable AI prompts and workflows by Umutcan Edizaslan.',
  alternates: {
    canonical: toAbsoluteSiteUrl('/prompts'),
  },
}

export default function PromptsLayout({ children }: { children: React.ReactNode }) {
  return children
}
