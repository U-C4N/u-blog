import DOMPurify from 'isomorphic-dompurify'

const ALLOWED_TAGS = [
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'a', 'strong', 'em',
  'code', 'pre', 'blockquote',
  'audio',
]

const ALLOWED_ATTR = ['href', 'target', 'rel', 'controls', 'src']

export function sanitizePostContent(value: string): string {
  return DOMPurify.sanitize(value, { ALLOWED_TAGS, ALLOWED_ATTR })
}
