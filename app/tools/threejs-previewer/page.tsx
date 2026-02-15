import type { Metadata } from 'next'
import ToolPageLayout from '@/components/tool-page-layout'
import ThreeJSPreviewer from '@/components/threejs-previewer'
import { env } from '@/env.mjs'

const title = 'Three.js Previewer'
const description = 'Free online Three.js 3D scene editor with real-time rendering and live code editing. Build and preview WebGL scenes.'

export const metadata: Metadata = {
  title: `${title} | Tools | U-BLOG`,
  description,
  keywords: ['Three.js editor', '3D previewer', 'WebGL', 'real-time 3D', 'Three.js playground', 'JavaScript 3D'],
  openGraph: {
    type: 'website',
    title: `${title} | Tools | U-BLOG`,
    description,
    url: `${env.NEXT_PUBLIC_SITE_URL}/tools/threejs-previewer`,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${title} | Tools | U-BLOG`,
    description,
  },
  alternates: {
    canonical: `${env.NEXT_PUBLIC_SITE_URL}/tools/threejs-previewer`,
  },
}

export default function ThreeJSPreviewerPage() {
  return (
    <ToolPageLayout
      title={title}
      description="Create and preview your Three.js 3D scenes in real-time with live code editing."
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
        { label: title, href: '/tools/threejs-previewer', active: true },
      ]}
    >
      <ThreeJSPreviewer />
    </ToolPageLayout>
  )
}
