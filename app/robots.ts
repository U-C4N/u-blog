import { MetadataRoute } from 'next'
import { siteUrl, toAbsoluteSiteUrl } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/adminos/login/', '/adminos/dashboard/'],
      },
    ],
    host: siteUrl,
    sitemap: toAbsoluteSiteUrl('/sitemap.xml'),
  }
}


