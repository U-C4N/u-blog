import { MetadataRoute } from 'next'
import { supabase } from '@/lib/supabase/config'
import { toAbsoluteSiteUrl } from '@/lib/site'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { data: posts } = await supabase
    .from('posts')
    .select('slug, updated_at, published, noindex')

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: toAbsoluteSiteUrl('/'), changeFrequency: 'weekly', priority: 1 },
    { url: toAbsoluteSiteUrl('/blog'), changeFrequency: 'daily', priority: 0.8 },
    { url: toAbsoluteSiteUrl('/prompts'), changeFrequency: 'weekly', priority: 0.7 },
    { url: toAbsoluteSiteUrl('/privacy'), changeFrequency: 'monthly', priority: 0.5 },
    { url: toAbsoluteSiteUrl('/tags'), changeFrequency: 'weekly', priority: 0.6 },
    { url: toAbsoluteSiteUrl('/tools'), changeFrequency: 'weekly', priority: 0.7 },
    { url: toAbsoluteSiteUrl('/tools/ascii-converter'), changeFrequency: 'monthly', priority: 0.6 },
    { url: toAbsoluteSiteUrl('/tools/markdown-preview'), changeFrequency: 'monthly', priority: 0.6 },
    { url: toAbsoluteSiteUrl('/tools/glsl-previewer'), changeFrequency: 'monthly', priority: 0.6 },
    { url: toAbsoluteSiteUrl('/tools/threejs-previewer'), changeFrequency: 'monthly', priority: 0.6 },
  ]

  const postRoutes: MetadataRoute.Sitemap = (posts || [])
    .filter(p => p.published && !p.noindex)
    .map(p => ({
      url: toAbsoluteSiteUrl(`/blog/${p.slug}`),
      lastModified: p.updated_at ? new Date(p.updated_at) : undefined,
      changeFrequency: 'weekly',
      priority: 0.7,
    }))

  return [...staticRoutes, ...postRoutes]
}


