import type { Metadata } from 'next'
import ToolPageLayout from '@/components/tool-page-layout'
import MarkdownPreview from '@/components/markdown-preview'
import { env } from '@/env.mjs'

const title = 'Markdown Preview'
const description = 'Free online Markdown preview tool with live editing. Write and render Markdown in real time.'

export const metadata: Metadata = {
  title: `${title} | Tools | U-BLOG`,
  description,
  keywords: ['markdown preview', 'markdown editor', 'live markdown', 'markdown renderer', 'online markdown tool'],
  openGraph: {
    type: 'website',
    title: `${title} | Tools | U-BLOG`,
    description,
    url: `${env.NEXT_PUBLIC_SITE_URL}/tools/markdown-preview`,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${title} | Tools | U-BLOG`,
    description,
  },
  alternates: {
    canonical: `${env.NEXT_PUBLIC_SITE_URL}/tools/markdown-preview`,
  },
}

export default function MarkdownPreviewPage() {
  return (
    <ToolPageLayout
      title={title}
      description="Preview and edit your markdown content in real time."
      jsonLd={{
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: title,
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'Web Browser',
        description,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      }}
      breadcrumbItems={[
        { label: 'Tools', href: '/tools' },
        { label: title, href: '/tools/markdown-preview', active: true },
      ]}
    >
      <MarkdownPreview />
    </ToolPageLayout>
  )
}
