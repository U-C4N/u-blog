import DOMPurify from 'isomorphic-dompurify'
import {
  detectConverterFormat,
  getFileBasename,
  type ConverterFormat,
} from './tool-media'

export type MergeFormat = Extract<ConverterFormat, 'txt' | 'pdf' | 'doc' | 'docx'>

export type MergeOutput = 'pdf' | 'txt' | 'docx'

export interface MergeSourceMeta {
  title: string
  text: string
  pageCount?: number
}

const PREVIEW_LIMIT = 1500

type PdfJsModule = typeof import('pdfjs-dist/legacy/build/pdf.mjs')
let pdfJsModulePromise: Promise<PdfJsModule> | null = null

async function loadPdfJs() {
  if (!pdfJsModulePromise) {
    pdfJsModulePromise = import('pdfjs-dist/legacy/build/pdf.mjs').then((module) => {
      module.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/legacy/build/pdf.worker.mjs',
        import.meta.url,
      ).toString()
      return module
    })
  }
  return pdfJsModulePromise
}

function looksLikeHtmlWordDoc(value: string): boolean {
  return /<(html|body|div|p|h1|h2|h3|ul|ol|li|table)\b/i.test(value)
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

export function detectMergeFormat(file: File): MergeFormat | null {
  const detected = detectConverterFormat(file)
  if (detected === 'txt' || detected === 'pdf' || detected === 'doc' || detected === 'docx') {
    return detected
  }
  return null
}

export async function extractMergeSource(
  file: File,
  format: MergeFormat,
): Promise<MergeSourceMeta> {
  const title = getFileBasename(file.name)

  if (format === 'txt') {
    const text = await file.text()
    return { title, text }
  }

  if (format === 'docx') {
    const mammoth = await import('mammoth')
    const arrayBuffer = await file.arrayBuffer()
    const rawTextResult = await mammoth.extractRawText({ arrayBuffer })
    return { title, text: rawTextResult.value.trim() }
  }

  if (format === 'doc') {
    const raw = await file.text()
    if (!looksLikeHtmlWordDoc(raw)) {
      throw new Error(
        `${file.name}: legacy binary .doc files are not supported in a browser-only flow. ` +
          'Convert to DOCX or PDF first (the File Converter tool can do that).',
      )
    }
    const sanitized = DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } })
    return { title, text: stripHtml(sanitized) }
  }

  // pdf
  const pdfJs = await loadPdfJs()
  const documentTask = pdfJs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) })
  const pdfDocument = await documentTask.promise
  const pages: string[] = []
  for (let pageIndex = 1; pageIndex <= pdfDocument.numPages; pageIndex += 1) {
    const page = await pdfDocument.getPage(pageIndex)
    const textContent = await page.getTextContent()
    const items = textContent.items as Array<{ str?: string }>
    pages.push(items.map((item) => item.str ?? '').join(' ').replace(/\s{2,}/g, ' ').trim())
  }
  return {
    title,
    text: pages.join('\n\n'),
    pageCount: pdfDocument.numPages,
  }
}

export function buildPreviewSnippet(text: string, limit = PREVIEW_LIMIT): string {
  if (text.length <= limit) return text
  return `${text.slice(0, limit).trimEnd()}\n\n…`
}

function toPlainArrayBuffer(view: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(view.byteLength)
  new Uint8Array(buffer).set(view)
  return buffer
}

function wrapLine(
  text: string,
  maxWidth: number,
  measure: (candidate: string) => number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 0) return ['']
  const lines: string[] = []
  let current = words[0]
  for (const word of words.slice(1)) {
    const candidate = `${current} ${word}`
    if (measure(candidate) <= maxWidth) {
      current = candidate
    } else {
      lines.push(current)
      current = word
    }
  }
  lines.push(current)
  return lines
}

export interface MergePiece {
  source: File
  format: MergeFormat
  meta: MergeSourceMeta
}

export async function mergeAsPdf(pieces: MergePiece[], outputTitle: string): Promise<Blob> {
  const { PDFDocument, StandardFonts } = await import('pdf-lib')
  const merged = await PDFDocument.create()
  merged.setTitle(outputTitle)

  const helvetica = await merged.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await merged.embedFont(StandardFonts.HelveticaBold)

  const pageSize = { width: 595.28, height: 841.89 }
  const margin = 48
  const fontSize = 11
  const headingSize = 16
  const lineHeight = 16
  const maxWidth = pageSize.width - margin * 2

  for (let index = 0; index < pieces.length; index += 1) {
    const piece = pieces[index]

    if (piece.format === 'pdf') {
      // PDF: copy all pages directly to keep original layout/fidelity.
      const sourceDoc = await PDFDocument.load(await piece.source.arrayBuffer(), {
        ignoreEncryption: true,
      })
      const copied = await merged.copyPages(sourceDoc, sourceDoc.getPageIndices())
      copied.forEach((page) => merged.addPage(page))
      continue
    }

    // For TXT / DOC / DOCX, render the extracted text onto fresh pages.
    let page = merged.addPage([pageSize.width, pageSize.height])
    let cursorY = pageSize.height - margin

    // Section heading with the file's basename.
    const heading = piece.meta.title || `Document ${index + 1}`
    page.drawText(heading, {
      x: margin,
      y: cursorY,
      font: helveticaBold,
      size: headingSize,
    })
    cursorY -= headingSize + 12

    const paragraphs = piece.meta.text.replace(/\r/g, '').split('\n')
    for (const paragraph of paragraphs) {
      const normalized = paragraph.trim()
      const lines = wrapLine(normalized || ' ', maxWidth, (candidate) =>
        helvetica.widthOfTextAtSize(candidate, fontSize),
      )

      for (const line of lines) {
        if (cursorY - lineHeight < margin) {
          page = merged.addPage([pageSize.width, pageSize.height])
          cursorY = pageSize.height - margin
        }
        page.drawText(line, { x: margin, y: cursorY, font: helvetica, size: fontSize })
        cursorY -= lineHeight
      }
      cursorY -= 5
    }
  }

  const bytes = await merged.save()
  return new Blob([toPlainArrayBuffer(bytes)], { type: 'application/pdf' })
}

export function mergeAsTxt(pieces: MergePiece[]): Blob {
  const sections = pieces.map((piece) => {
    const heading = piece.meta.title || piece.source.name
    const ruler = '='.repeat(Math.max(8, heading.length))
    return `${heading}\n${ruler}\n\n${piece.meta.text.trim()}`
  })
  const combined = sections.join('\n\n\n')
  return new Blob([combined], { type: 'text/plain;charset=utf-8' })
}

export async function mergeAsDocx(pieces: MergePiece[], outputTitle: string): Promise<Blob> {
  const { Document, HeadingLevel, Packer, Paragraph } = await import('docx')

  const children: InstanceType<typeof Paragraph>[] = []
  pieces.forEach((piece, index) => {
    const heading = piece.meta.title || `Document ${index + 1}`
    children.push(new Paragraph({ text: heading, heading: HeadingLevel.HEADING_2 }))
    const lines = piece.meta.text.replace(/\r/g, '').split('\n')
    for (const line of lines) {
      children.push(new Paragraph({ text: line }))
    }
    if (index < pieces.length - 1) {
      children.push(new Paragraph({ text: '' }))
    }
  })

  const doc = new Document({
    sections: [{ children }],
    title: outputTitle,
  })
  return Packer.toBlob(doc)
}
