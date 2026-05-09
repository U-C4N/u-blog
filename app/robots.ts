import { MetadataRoute } from 'next'
import { siteUrl, toAbsoluteSiteUrl } from '@/lib/site'

const ADMIN_DISALLOW = ['/adminos/login/', '/adminos/dashboard/']

const AI_CRAWLERS = [
  'GPTBot',
  'ChatGPT-User',
  'OAI-SearchBot',
  'ClaudeBot',
  'Claude-Web',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
  'cohere-ai',
  'Meta-ExternalAgent',
  'Bytespider',
  'Amazonbot',
  'DuckAssistBot',
  'YouBot',
  'MistralAI-User',
] as const

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ADMIN_DISALLOW },
      ...AI_CRAWLERS.map((agent) => ({
        userAgent: agent,
        allow: '/',
        disallow: ADMIN_DISALLOW,
      })),
    ],
    host: siteUrl,
    sitemap: toAbsoluteSiteUrl('/sitemap.xml'),
  }
}


