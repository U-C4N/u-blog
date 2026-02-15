import type { Metadata } from 'next'
import ToolPageLayout from '@/components/tool-page-layout'
import BackgroundRemover from '@/components/background-remover'
import { env } from '@/env.mjs'

const title = 'Background Remover'
const description = 'Free online AI background remover. Remove image backgrounds automatically in-browser and export transparent PNG.'

export const metadata: Metadata = {
  title: `${title} | Tools | U-BLOG`,
  description,
  keywords: ['background remover', 'remove image background', 'transparent png', 'ai image tool', 'online photo editor'],
  openGraph: {
    type: 'website',
    title: `${title} | Tools | U-BLOG`,
    description,
    url: `${env.NEXT_PUBLIC_SITE_URL}/tools/background-remove`,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${title} | Tools | U-BLOG`,
    description,
  },
  alternates: {
    canonical: `${env.NEXT_PUBLIC_SITE_URL}/tools/background-remove`,
  },
}

export default function BackgroundRemovePage() {
  return (
    <ToolPageLayout
      title={title}
      description="Remove image backgrounds automatically with fast, browser-side AI processing."
      jsonLd={{
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: title,
        applicationCategory: 'MultimediaApplication',
        operatingSystem: 'Web Browser',
        description,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      }}
      breadcrumbItems={[
        { label: 'Tools', href: '/tools' },
        { label: title, href: '/tools/background-remove', active: true },
      ]}
    >
      <BackgroundRemover />
    </ToolPageLayout>
  )
}
