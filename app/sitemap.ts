import { MetadataRoute } from 'next'
import { supabase } from '@/lib/supabase/config'
import { env } from '@/env.mjs'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = env.NEXT_PUBLIC_SITE_URL

  const { data: posts } = await supabase
    .from('posts')
    .select('slug, updated_at, published, noindex')

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/blog`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/prompts`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/privacy`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/tags`, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${baseUrl}/tools`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/tools/markdown-preview`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/tools/glsl-previewer`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/tools/threejs-previewer`, changeFrequency: 'monthly', priority: 0.6 },
  ]

  const postRoutes: MetadataRoute.Sitemap = (posts || [])
    .filter(p => p.published && !p.noindex)
    .map(p => ({
      url: `${baseUrl}/blog/${p.slug}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : undefined,
      changeFrequency: 'weekly',
      priority: 0.7,
    }))

  return [...staticRoutes, ...postRoutes]
}


