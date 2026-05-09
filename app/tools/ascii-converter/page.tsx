import type { Metadata } from 'next'
import ToolPageLayout from '@/components/tool-page-layout'
import AsciiConverter from '@/components/ascii-converter'
import { env } from '@/env.mjs'

const title = 'ASCII Converter'
const description = 'Convert PNG and JPG images to ASCII text in your browser. Standard mode outputs dithered 4K text; the experimental GPU mode runs a single WebGPU compute pass on a monospace-aspect-corrected grid, picking each glyph from tone and Sobel-orientation banks — no CPU per-pixel loops.'

export const metadata: Metadata = {
  title: `${title} | Tools | U-BLOG`,
  description,
  keywords: ['ascii converter', '1:1 ascii', 'webgpu ascii', 'gpu ascii generator', 'png to ascii', 'transparent png ascii', 'jpg to ascii', 'image to text art', 'ascii art generator', 'fast ascii converter'],
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
      description="Upload PNG/JPG. Standard mode produces dithered 4K ASCII via a Web Worker. Experimental GPU mode resamples the image to a monospace-aspect-correct grid, then runs a single WebGPU compute pass — each cell picks a glyph from tone and Sobel-orientation banks on the GPU."
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
