import type { Metadata } from 'next'
import ToolPageLayout from '@/components/tool-page-layout'
import AsciiConverter from '@/components/ascii-converter'
import { env } from '@/env.mjs'

const title = 'ASCII Converter'
const description = 'Convert PNG and JPG images to 4K-detail ASCII text in your browser with exact-size canvas output, transparent PNG alpha preservation, and an experimental WebGPU mode.'

export const metadata: Metadata = {
  title: `${title} | Tools | U-BLOG`,
  description,
  keywords: ['ascii converter', '4k ascii converter', 'webgpu ascii', 'png to ascii', 'transparent png ascii', 'jpg to ascii', 'image to text art', 'ascii art generator', 'online ascii tool'],
  openGraph: {
    type: 'website',
    title: `${title} | Tools | U-BLOG`,
    description,
    url: `${env.NEXT_PUBLIC_SITE_URL}/tools/ascii-converter`,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${title} | Tools | U-BLOG`,
    description,
  },
  alternates: {
    canonical: `${env.NEXT_PUBLIC_SITE_URL}/tools/ascii-converter`,
  },
}

export default function AsciiConverterPage() {
  return (
    <ToolPageLayout
      title={title}
      description="Upload PNG/JPG and get instant 4K ASCII output with exact-size canvas rendering, transparent pixel-safe conversion, and experimental WebGPU synthesis."
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
        { label: title, href: '/tools/ascii-converter', active: true },
      ]}
    >
      <AsciiConverter />
    </ToolPageLayout>
  )
}
