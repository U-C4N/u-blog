export type ImageExportFormat = 'png' | 'jpg' | 'webp' | 'svg'
export type ConverterFormat = 'png' | 'jpg' | 'webp' | 'svg' | 'pdf' | 'docx' | 'doc' | 'txt' | 'html' | 'md'

const FILE_EXTENSION_PATTERN = /\.[^.]+$/
const FILE_SAFE_PATTERN = /[^a-z0-9-_]+/gi
const MARKDOWN_LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/g

export const IMAGE_FORMAT_MIME: Record<ImageExportFormat, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
  svg: 'image/svg+xml',
}

export const FORMAT_LABELS: Record<ConverterFormat, string> = {
  png: 'PNG image',
  jpg: 'JPG image',
  webp: 'WEBP image',
  svg: 'SVG graphic',
  pdf: 'PDF document',
  docx: 'DOCX document',
  doc: 'DOC document',
  txt: 'Plain text',
  html: 'HTML document',
  md: 'Markdown file',
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() ?? ''
}

export function getFileBasename(filename: string): string {
  const raw = filename.replace(FILE_EXTENSION_PATTERN, '').replace(FILE_SAFE_PATTERN, '-')
  return raw.replace(/^-+|-+$/g, '') || 'file'
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

export function isImageFormat(format: ConverterFormat): format is ImageExportFormat {
  return format === 'png' || format === 'jpg' || format === 'webp' || format === 'svg'
}

export function detectConverterFormat(file: File): ConverterFormat | null {
  const extension = getFileExtension(file.name)
  const mime = file.type.toLowerCase()

  if (mime === 'image/png' || extension === 'png') return 'png'
  if (mime === 'image/jpeg' || extension === 'jpg' || extension === 'jpeg') return 'jpg'
  if (mime === 'image/webp' || extension === 'webp') return 'webp'
  if (mime === 'image/svg+xml' || extension === 'svg') return 'svg'
  if (mime === 'application/pdf' || extension === 'pdf') return 'pdf'
  if (
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    extension === 'docx'
  ) {
    return 'docx'
  }
  if (mime === 'application/msword' || extension === 'doc') return 'doc'
  if (mime === 'text/plain' || extension === 'txt') return 'txt'
  if (mime === 'text/html' || extension === 'html' || extension === 'htm') return 'html'
  if (mime === 'text/markdown' || extension === 'md' || extension === 'markdown') return 'md'

  return null
}

export function getConverterTargets(sourceFormat: ConverterFormat): ConverterFormat[] {
  switch (sourceFormat) {
    case 'png':
    case 'jpg':
    case 'webp':
    case 'svg':
      return ['png', 'jpg', 'webp', 'svg', 'pdf']
    case 'pdf':
      return ['png', 'jpg', 'webp', 'txt']
    case 'docx':
      return ['html', 'txt', 'md', 'pdf', 'doc']
    case 'doc':
      return ['html', 'txt', 'md', 'pdf', 'docx']
    case 'txt':
      return ['html', 'md', 'pdf', 'doc', 'docx']
    case 'html':
      return ['txt', 'md', 'pdf', 'doc', 'docx']
    case 'md':
      return ['html', 'txt', 'pdf', 'doc', 'docx']
    default:
      return []
  }
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'))
    reader.readAsDataURL(blob)
  })
}

export async function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Failed to decode image'))
    image.src = src
  })
}

export async function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Canvas export failed'))
        return
      }
      resolve(blob)
    }, mimeType, quality)
  })
}

export async function rasterizeToBlob(
  input: Blob | string,
  options: {
    width: number
    height: number
    format: Exclude<ImageExportFormat, 'svg'>
    quality?: number
    background?: string | null
  },
): Promise<Blob> {
  const mimeType = IMAGE_FORMAT_MIME[options.format]
  const canvas = document.createElement('canvas')
  canvas.width = options.width
  canvas.height = options.height

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Canvas is not available in this browser')
  }

  if (options.background) {
    context.fillStyle = options.background
    context.fillRect(0, 0, canvas.width, canvas.height)
  } else {
    context.clearRect(0, 0, canvas.width, canvas.height)
  }

  if (typeof input === 'string') {
    const image = await loadImageElement(input)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
  } else if (input.type === 'image/svg+xml') {
    const url = URL.createObjectURL(input)
    try {
      const image = await loadImageElement(url)
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
    } finally {
      URL.revokeObjectURL(url)
    }
  } else {
    const bitmap = await createImageBitmap(input)
    try {
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    } finally {
      bitmap.close()
    }
  }

  return canvasToBlob(canvas, mimeType, options.quality)
}

function parseSvgLength(value: string | null): number | null {
  if (!value) return null
  const parsed = Number.parseFloat(value.replace(/px$/i, '').trim())
  return Number.isFinite(parsed) ? parsed : null
}

export function parseSvgDimensions(svgMarkup: string): { width: number; height: number; viewBox?: string } | null {
  const documentNode = new DOMParser().parseFromString(svgMarkup, 'image/svg+xml')
  const svg = documentNode.documentElement

  if (!svg || svg.nodeName.toLowerCase() !== 'svg') {
    return null
  }

  const width = parseSvgLength(svg.getAttribute('width'))
  const height = parseSvgLength(svg.getAttribute('height'))
  const viewBox = svg.getAttribute('viewBox') ?? undefined

  if (width && height) {
    return { width, height, viewBox }
  }

  if (viewBox) {
    const [, , boxWidth, boxHeight] = viewBox.split(/[\s,]+/).map(Number)
    if (Number.isFinite(boxWidth) && Number.isFinite(boxHeight)) {
      return {
        width: boxWidth,
        height: boxHeight,
        viewBox,
      }
    }
  }

  return null
}

export function resizeSvgMarkup(svgMarkup: string, width: number, height: number): string {
  const documentNode = new DOMParser().parseFromString(svgMarkup, 'image/svg+xml')
  const svg = documentNode.documentElement

  if (!svg || svg.nodeName.toLowerCase() !== 'svg') {
    throw new Error('Invalid SVG document')
  }

  if (!svg.getAttribute('xmlns')) {
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  }

  if (!svg.getAttribute('viewBox')) {
    const current = parseSvgDimensions(svgMarkup)
    svg.setAttribute('viewBox', `0 0 ${current?.width ?? width} ${current?.height ?? height}`)
  }

  svg.setAttribute('width', String(width))
  svg.setAttribute('height', String(height))
  svg.setAttribute('preserveAspectRatio', svg.getAttribute('preserveAspectRatio') ?? 'xMidYMid meet')

  return new XMLSerializer().serializeToString(documentNode)
}

export async function getImageDimensionsFromFile(file: File): Promise<{ width: number; height: number }> {
  if (file.type === 'image/svg+xml' || getFileExtension(file.name) === 'svg') {
    const text = await file.text()
    const parsed = parseSvgDimensions(text)
    if (parsed) {
      return {
        width: parsed.width,
        height: parsed.height,
      }
    }
  }

  const bitmap = await createImageBitmap(file)
  try {
    return { width: bitmap.width, height: bitmap.height }
  } finally {
    bitmap.close()
  }
}

export async function rasterFileToSvgBlob(file: Blob, width: number, height: number): Promise<Blob> {
  const dataUrl = await blobToDataUrl(file)
  const svgMarkup = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<image href="${dataUrl}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" />`,
    '</svg>',
  ].join('')

  return new Blob([svgMarkup], { type: 'image/svg+xml' })
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function stripHtml(html: string): string {
  const documentNode = new DOMParser().parseFromString(html, 'text/html')
  const text = documentNode.body.textContent ?? ''
  return text.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim()
}

export function markdownToHtml(markdown: string): string {
  const blocks = markdown
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)

  return blocks
    .map((block) => {
      if (block.startsWith('### ')) return `<h3>${escapeHtml(block.slice(4))}</h3>`
      if (block.startsWith('## ')) return `<h2>${escapeHtml(block.slice(3))}</h2>`
      if (block.startsWith('# ')) return `<h1>${escapeHtml(block.slice(2))}</h1>`

      if (/^(-|\*)\s+/m.test(block)) {
        const items = block
          .split('\n')
          .map((line) => line.replace(/^(-|\*)\s+/, '').trim())
          .filter(Boolean)
          .map((line) => `<li>${inlineMarkdownToHtml(line)}</li>`)
          .join('')
        return `<ul>${items}</ul>`
      }

      return `<p>${inlineMarkdownToHtml(block)}</p>`
    })
    .join('\n')
}

function inlineMarkdownToHtml(value: string): string {
  return escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(MARKDOWN_LINK_PATTERN, '<a href="$2">$1</a>')
    .replace(/\n/g, '<br>')
}

export function buildWordCompatibleHtmlDocument(bodyHtml: string, title: string): string {
  return [
    '<!DOCTYPE html>',
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">',
    '<head>',
    '<meta charset="utf-8" />',
    `<title>${escapeHtml(title)}</title>`,
    '<style>body{font-family:Calibri,Arial,sans-serif;font-size:12pt;line-height:1.5;margin:32px;}h1,h2,h3{margin:0 0 12px;}p{margin:0 0 12px;}ul{margin:0 0 12px 20px;}code,pre{font-family:Consolas,monospace;white-space:pre-wrap;}</style>',
    '</head>',
    `<body>${bodyHtml}</body>`,
    '</html>',
  ].join('')
}
