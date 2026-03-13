import type { Metadata } from 'next'
import ToolPageLayout from '@/components/tool-page-layout'
import ImageEnhancer from '@/components/image-enhancer'
import { env } from '@/env.mjs'

const title = 'Image Enhancer'
const description = 'Upscale images to 4K with GPU-accelerated Lanczos3 resampling, AI-grade sharpening, noise reduction, and color correction — entirely in your browser with WebGPU.'

export const metadata: Metadata = {
  title: `${title} | Tools | U-BLOG`,
  description,
  keywords: [
    'image enhancer', 'image upscaler', '4k upscale', 'webgpu image', 'ai upscaler',
    'lanczos upscale', 'sharpen image', 'denoise image', 'online image enhancer',
    'browser image upscaler', 'free image enhancer', 'image quality enhancer',
  ],
  openGraph: {
    type: 'website',
    title: `${title} | Tools | U-BLOG`,
    description,
    url: `${env.NEXT_PUBLIC_SITE_URL}/tools/image-enhancer`,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${title} | Tools | U-BLOG`,
    description,
  },
  alternates: {
    canonical: `${env.NEXT_PUBLIC_SITE_URL}/tools/image-enhancer`,
  },
}

export default function ImageEnhancerPage() {
  return (
    <ToolPageLayout
      title={title}
      description="GPU-accelerated 4K image upscaling with Lanczos3 resampling, smart sharpening, noise reduction, and color correction. Zero upload, fully private."
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
        { label: title, href: '/tools/image-enhancer', active: true },
      ]}
    >
      <ImageEnhancer />
    </ToolPageLayout>
  )
}
