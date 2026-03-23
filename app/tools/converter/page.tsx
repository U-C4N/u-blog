import type { Metadata } from 'next'
import ToolPageLayout from '@/components/tool-page-layout'
import FileConverter from '@/components/file-converter'
import { env } from '@/env.mjs'

const title = 'File Converter'
const description = 'Convert PDF, DOCX, DOC, PNG, JPG, SVG, WEBP, TXT, HTML and Markdown files online in your browser.'

export const metadata: Metadata = {
  title: `${title} | Tools | U-BLOG`,
  description,
  keywords: [
    'pdf converter',
    'docx converter',
    'image converter',
    'svg to png',
    'pdf to jpg',
    'html to docx',
    'markdown converter',
  ],
  openGraph: {
    type: 'website',
    title: `${title} | Tools | U-BLOG`,
    description,
    url: `${env.NEXT_PUBLIC_SITE_URL}/tools/converter`,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${title} | Tools | U-BLOG`,
    description,
  },
  alternates: {
    canonical: `${env.NEXT_PUBLIC_SITE_URL}/tools/converter`,
  },
}

export default function ConverterPage() {
  return (
    <ToolPageLayout
      title={title}
      description="A browser-first conversion workspace for images, PDFs, and practical document exports. Fast enough for daily use, explicit about the edge cases."
      jsonLd={{
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: title,
        applicationCategory: 'UtilitiesApplication',
        operatingSystem: 'Web Browser',
        description,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      }}
      breadcrumbItems={[
        { label: 'Tools', href: '/tools' },
        { label: title, href: '/tools/converter', active: true },
      ]}
    >
      <FileConverter />
    </ToolPageLayout>
  )
}
