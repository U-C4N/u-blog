import type { Metadata } from 'next'
import ToolPageLayout from '@/components/tool-page-layout'
import FileMerger from '@/components/file-merger'
import { env } from '@/env.mjs'

const title = 'File Merger'
const description = 'Merge TXT, PDF, DOC and DOCX files into a single document. Auto-detects each format, lets you reorder pieces, and stitches everything together in your browser.'

export const metadata: Metadata = {
  title: `${title} | Tools | U-BLOG`,
  description,
  keywords: [
    'merge pdf',
    'combine pdf',
    'merge docx',
    'merge doc',
    'merge txt files',
    'pdf merger',
    'docx merger',
    'document merge',
    'combine files',
  ],
  openGraph: {
    type: 'website',
    title: `${title} | Tools | U-BLOG`,
    description,
    url: `${env.NEXT_PUBLIC_SITE_URL}/tools/merge`,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${title} | Tools | U-BLOG`,
    description,
  },
  alternates: {
    canonical: `${env.NEXT_PUBLIC_SITE_URL}/tools/merge`,
  },
}

export default function MergePage() {
  return (
    <ToolPageLayout
      title={title}
      description="Drop in TXT, PDF, DOC or DOCX files, reorder them with drag-and-drop or arrows, then click Merge. Format detection is automatic; everything runs locally — zero upload, fully private."
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
        { label: title, href: '/tools/merge', active: true },
      ]}
    >
      <FileMerger />
    </ToolPageLayout>
  )
}
