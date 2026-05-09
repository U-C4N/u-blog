import { supabase } from '@/lib/supabase/config'
import { siteUrl, toAbsoluteSiteUrl } from '@/lib/site'

export const revalidate = 600

const FEED_LIMIT = 50

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '&':
        return '&amp;'
      case "'":
        return '&apos;'
      case '"':
        return '&quot;'
      default:
        return c
    }
  })
}

function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#*_~>-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function GET() {
  const { data: postsRaw } = await supabase
    .from('posts')
    .select('slug, title, content, meta_description, created_at, updated_at, tags, og_image_url, canonical_url, language_code, noindex, published')
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(FEED_LIMIT * 2)

  const posts = (postsRaw || []).filter((p) => !p.noindex).slice(0, FEED_LIMIT)

  const items = posts
    .map((post) => {
      const url = toAbsoluteSiteUrl(`/blog/${post.slug}`)
      const fallbackDesc = stripMarkdown(post.content || '').slice(0, 280)
      const description = post.meta_description || (fallbackDesc ? `${fallbackDesc}...` : post.title)
      const pubDate = new Date(post.created_at).toUTCString()
      const tagsXml = (post.tags || []).map((t: string) => `      <category>${escapeXml(t)}</category>`).join('\n')
      const enclosure = post.og_image_url
        ? `      <enclosure url="${escapeXml(post.og_image_url)}" type="image/png" length="0"/>`
        : ''
      const langTag = post.language_code ? `      <dc:language>${escapeXml(post.language_code)}</dc:language>` : ''
      return [
        '    <item>',
        `      <title>${escapeXml(post.title)}</title>`,
        `      <link>${escapeXml(url)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(url)}</guid>`,
        `      <pubDate>${pubDate}</pubDate>`,
        `      <description>${escapeXml(description)}</description>`,
        `      <dc:creator>Umutcan Edizaslan</dc:creator>`,
        langTag,
        tagsXml,
        enclosure,
        '    </item>',
      ]
        .filter((line) => line.length > 0)
        .join('\n')
    })
    .join('\n')

  const lastBuildDate = new Date(posts[0]?.updated_at || posts[0]?.created_at || Date.now()).toUTCString()
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:dc="http://purl.org/dc/elements/1.1/"
     xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>U-BLOG — Umutcan Edizaslan</title>
    <link>${escapeXml(siteUrl)}</link>
    <description>AI engineering notes, developer tools, and technical articles by Umutcan Edizaslan.</description>
    <language>en-US</language>
    <atom:link href="${escapeXml(toAbsoluteSiteUrl('/feed.xml'))}" rel="self" type="application/rss+xml"/>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <generator>Next.js App Router</generator>
${items}
  </channel>
</rss>`

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600',
    },
  })
}
