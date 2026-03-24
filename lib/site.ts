import { env } from '@/env.mjs'

const DEFAULT_SITE_URL = 'https://uc4n.com'
const INVALID_CANONICAL_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  'yoursite.com',
  'www.yoursite.com',
])

function normalizeAbsoluteUrl(value: string): string {
  const url = new URL(value)
  url.hash = ''

  if (!url.pathname) {
    url.pathname = '/'
  }

  if (url.pathname !== '/' && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.slice(0, -1)
  }

  return url.toString()
}

function normalizeSiteUrl(value?: string | null): string {
  try {
    return normalizeAbsoluteUrl(value || DEFAULT_SITE_URL)
  } catch {
    return DEFAULT_SITE_URL
  }
}

export const siteUrl = normalizeSiteUrl(env.NEXT_PUBLIC_SITE_URL)

const siteHost = new URL(siteUrl).hostname.toLowerCase()

export function toAbsoluteSiteUrl(pathOrUrl: string): string {
  return normalizeAbsoluteUrl(new URL(pathOrUrl, `${siteUrl}/`).toString())
}

export function isManagedSiteUrl(candidate?: string | null): boolean {
  if (!candidate) return false

  try {
    const url = new URL(candidate)
    const host = url.hostname.toLowerCase()

    if (INVALID_CANONICAL_HOSTS.has(host)) {
      return false
    }

    return host === siteHost || host.endsWith(`.${siteHost}`)
  } catch {
    return false
  }
}

export function resolveCanonicalUrl(candidate: string | null | undefined, fallbackPath: string): string {
  if (isManagedSiteUrl(candidate)) {
    return normalizeAbsoluteUrl(candidate!)
  }

  return toAbsoluteSiteUrl(fallbackPath)
}
