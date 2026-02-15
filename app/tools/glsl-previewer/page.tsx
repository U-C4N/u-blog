import type { Metadata } from 'next'
import ToolPageLayout from '@/components/tool-page-layout'
import GLSLPreviewer from '@/components/glsl-previewer'
import { env } from '@/env.mjs'

const title = 'GLSL Shader Previewer'
const description = 'Free online GLSL fragment shader editor with real-time WebGL rendering. Write, preview, and experiment with shaders.'

export const metadata: Metadata = {
  title: `${title} | Tools | U-BLOG`,
  description,
  keywords: ['GLSL editor', 'shader previewer', 'WebGL', 'fragment shader', 'real-time shader', 'Shadertoy'],
  openGraph: {
    type: 'website',
    title: `${title} | Tools | U-BLOG`,
    description,
    url: `${env.NEXT_PUBLIC_SITE_URL}/tools/glsl-previewer`,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${title} | Tools | U-BLOG`,
    description,
  },
  alternates: {
    canonical: `${env.NEXT_PUBLIC_SITE_URL}/tools/glsl-previewer`,
  },
}

export default function GLSLPreviewerPage() {
  return (
    <ToolPageLayout
      title={title}
      description="Write and preview your GLSL fragment shaders in real-time."
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
        { label: title, href: '/tools/glsl-previewer', active: true },
      ]}
    >
      <GLSLPreviewer />
    </ToolPageLayout>
  )
}
