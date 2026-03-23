import type { Metadata } from 'next'
import ToolPageLayout from '@/components/tool-page-layout'
import ImageResizer from '@/components/image-resizer'
import { env } from '@/env.mjs'

const title = 'Image Resizer'
const description = 'Resize SVG, PNG, JPG and WEBP images online by exact width and height. Export browser-side without uploading files.'

export const metadata: Metadata = {
  title: `${title} | Tools | U-BLOG`,
  description,
  keywords: [
    'image resizer',
    'svg resizer',
    'png resizer',
    'jpg resizer',
    'resize image by width height',
    'webp resize online',
  ],
  openGraph: {
    type: 'website',
    title: `${title} | Tools | U-BLOG`,
    description,
    url: `${env.NEXT_PUBLIC_SITE_URL}/tools/resizer`,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${title} | Tools | U-BLOG`,
    description,
  },
  alternates: {
    canonical: `${env.NEXT_PUBLIC_SITE_URL}/tools/resizer`,
  },
}

export default function ResizerPage() {
  return (
    <ToolPageLayout
      title={title}
      description="Dial in precise width and height values, keep aspect ratio when needed, and export in the format that fits your workflow."
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
        { label: title, href: '/tools/resizer', active: true },
      ]}
    >
      <ImageResizer />
    </ToolPageLayout>
  )
}
