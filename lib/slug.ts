const SLUG_PATTERN = /[^a-z0-9]+/g
const SLUG_TRIM_PATTERN = /(^-|-$)/g

export function generateSlug(text: string): string {
  return text.toLowerCase().replace(SLUG_PATTERN, '-').replace(SLUG_TRIM_PATTERN, '')
}

export function normalizeManualSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(SLUG_TRIM_PATTERN, '')
}
