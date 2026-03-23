'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import DOMPurify from 'isomorphic-dompurify'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  buildWordCompatibleHtmlDocument,
  detectConverterFormat,
  downloadBlob,
  formatFileSize,
  FORMAT_LABELS,
  getConverterTargets,
  getFileBasename,
  getImageDimensionsFromFile,
  IMAGE_FORMAT_MIME,
  isImageFormat,
  markdownToHtml,
  rasterFileToSvgBlob,
  rasterizeToBlob,
  stripHtml,
  type ConverterFormat,
  type ImageExportFormat,
} from '@/lib/tool-media'
import { cn } from '@/lib/utils'
import {
  ArrowRightLeft,
  Download,
  FileCog,
  Loader2,
  Sparkles,
  UploadCloud,
} from 'lucide-react'

type OutputView = 'image' | 'text' | 'html' | 'pdf' | 'download'

type ConversionResult = {
  blob: Blob
  filename: string
  view: OutputView
  summary: string
  previewUrl?: string
  textPreview?: string
  htmlPreview?: string
}

type SourceSnapshot = {
  previewUrl?: string
  textPreview?: string
  note?: string
}

type PdfJsModule = typeof import('pdfjs-dist/legacy/build/pdf.mjs')

const MAX_FILE_SIZE = 30 * 1024 * 1024
const ACCEPTED_EXTENSIONS = '.png,.jpg,.jpeg,.webp,.svg,.pdf,.docx,.doc,.txt,.html,.htm,.md,.markdown'

let pdfJsModulePromise: Promise<PdfJsModule> | null = null

async function loadPdfJs() {
  if (!pdfJsModulePromise) {
    pdfJsModulePromise = import('pdfjs-dist/legacy/build/pdf.mjs').then((module) => {
      module.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).toString()
      return module
    })
  }

  return pdfJsModulePromise
}

function textToHtml(text: string): string {
  const sections = text
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((section) => section.trim())
    .filter(Boolean)

  if (sections.length === 0) {
    return '<p></p>'
  }

  return sections
    .map((section) => `<p>${section.split('\n').map(escapeHtml).join('<br>')}</p>`)
    .join('\n')
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildPreviewText(value: string, limit = 1800): string {
  return value.length > limit ? `${value.slice(0, limit).trimEnd()}\n\n...` : value
}

function looksLikeHtmlWordDoc(value: string): boolean {
  return /<(html|body|div|p|h1|h2|h3|ul|ol|li|table)\b/i.test(value)
}

function blockifyHtml(html: string) {
  const documentNode = new DOMParser().parseFromString(html, 'text/html')
  const descriptors: Array<{ kind: 'heading1' | 'heading2' | 'heading3' | 'list' | 'code' | 'paragraph'; text: string }> = []

  const collect = (node: Element) => {
    const text = (node.textContent ?? '').trim()
    if (!text) return

    switch (node.tagName.toLowerCase()) {
      case 'h1':
        descriptors.push({ kind: 'heading1', text })
        return
      case 'h2':
        descriptors.push({ kind: 'heading2', text })
        return
      case 'h3':
        descriptors.push({ kind: 'heading3', text })
        return
      case 'ul':
      case 'ol':
        node.querySelectorAll(':scope > li').forEach((item) => {
          const itemText = item.textContent?.trim()
          if (itemText) descriptors.push({ kind: 'list', text: itemText })
        })
        return
      case 'pre':
      case 'code':
        descriptors.push({ kind: 'code', text })
        return
      default:
        descriptors.push({ kind: 'paragraph', text })
    }
  }

  Array.from(documentNode.body.children).forEach(collect)

  if (descriptors.length === 0) {
    const fallback = documentNode.body.textContent?.trim()
    if (fallback) descriptors.push({ kind: 'paragraph', text: fallback })
  }

  return descriptors
}

async function htmlToMarkdown(html: string): Promise<string> {
  const { default: TurndownService } = await import('turndown')
  const service = new TurndownService({
    codeBlockStyle: 'fenced',
    headingStyle: 'atx',
  })

  return service.turndown(html).trim()
}

async function prepareDocumentSource(file: File, format: Extract<ConverterFormat, 'docx' | 'doc' | 'txt' | 'html' | 'md'>) {
  const baseTitle = getFileBasename(file.name)

  if (format === 'txt') {
    const text = await file.text()
    return {
      title: baseTitle,
      text,
      html: textToHtml(text),
      markdown: text,
      note: 'Plain text stays structure-first across PDF, DOC and DOCX exports.',
    }
  }

  if (format === 'md') {
    const markdown = await file.text()
    const html = DOMPurify.sanitize(markdownToHtml(markdown), { USE_PROFILES: { html: true } })
    return {
      title: baseTitle,
      text: stripHtml(html),
      html,
      markdown,
      note: 'Markdown headings and lists are preserved as simplified structure.',
    }
  }

  if (format === 'html') {
    const rawHtml = await file.text()
    const html = DOMPurify.sanitize(rawHtml, { USE_PROFILES: { html: true } })
    return {
      title: baseTitle,
      text: stripHtml(html),
      html,
      markdown: await htmlToMarkdown(html),
      note: 'HTML is sanitized before export so previews stay safe.',
    }
  }

  if (format === 'docx') {
    const mammoth = await import('mammoth')
    const arrayBuffer = await file.arrayBuffer()
    const htmlResult = await mammoth.convertToHtml({ arrayBuffer })
    const rawTextResult = await mammoth.extractRawText({ arrayBuffer })
    const html = DOMPurify.sanitize(htmlResult.value, { USE_PROFILES: { html: true } })

    return {
      title: baseTitle,
      text: rawTextResult.value.trim(),
      html,
      markdown: await htmlToMarkdown(html),
      note: 'DOCX import keeps document structure, but complex office layout is intentionally simplified.',
    }
  }

  const rawDoc = await file.text()
  if (!looksLikeHtmlWordDoc(rawDoc)) {
    throw new Error('Legacy binary DOC import is not supported in a browser-only flow. Use DOCX, PDF, TXT, HTML, Markdown, or DOC files exported from this tool.')
  }

  const html = DOMPurify.sanitize(rawDoc, { USE_PROFILES: { html: true } })
  return {
    title: baseTitle,
    text: stripHtml(html),
    html,
    markdown: await htmlToMarkdown(html),
    note: 'DOC import works for Word-compatible HTML documents, not binary legacy .doc files.',
  }
}

async function createDocxBlobFromHtml(html: string, title: string): Promise<Blob> {
  const { Document, HeadingLevel, Packer, Paragraph, TextRun } = await import('docx')
  const blocks = blockifyHtml(html)

  const children = blocks.map((block) => {
    if (block.kind === 'heading1') {
      return new Paragraph({ text: block.text, heading: HeadingLevel.HEADING_1 })
    }
    if (block.kind === 'heading2') {
      return new Paragraph({ text: block.text, heading: HeadingLevel.HEADING_2 })
    }
    if (block.kind === 'heading3') {
      return new Paragraph({ text: block.text, heading: HeadingLevel.HEADING_3 })
    }
    if (block.kind === 'list') {
      return new Paragraph({ text: `• ${block.text}` })
    }
    if (block.kind === 'code') {
      return new Paragraph({
        children: [new TextRun({ text: block.text, font: 'Consolas' })],
      })
    }

    return new Paragraph({ text: block.text })
  })

  const documentNode = new Document({
    sections: [{ children }],
    title,
  })

  return Packer.toBlob(documentNode)
}

function wrapLine(text: string, maxWidth: number, measure: (candidate: string) => number) {
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

function toPlainArrayBuffer(view: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(view.byteLength)
  new Uint8Array(buffer).set(view)
  return buffer
}

async function createPdfFromText(text: string, title: string): Promise<Blob> {
  const { PDFDocument, StandardFonts } = await import('pdf-lib')
  const pdfDocument = await PDFDocument.create()
  pdfDocument.setTitle(title)

  const font = await pdfDocument.embedFont(StandardFonts.Helvetica)
  const pageSize = { width: 595.28, height: 841.89 }
  const margin = 48
  const fontSize = 11
  const lineHeight = 16
  const maxWidth = pageSize.width - margin * 2

  let page = pdfDocument.addPage([pageSize.width, pageSize.height])
  let cursorY = pageSize.height - margin

  const ensureRoom = (requiredLines = 1) => {
    if (cursorY - lineHeight * requiredLines < margin) {
      page = pdfDocument.addPage([pageSize.width, pageSize.height])
      cursorY = pageSize.height - margin
    }
  }

  const paragraphs = text.replace(/\r/g, '').split('\n')
  for (const paragraph of paragraphs) {
    const normalized = paragraph.trim()
    const lines = wrapLine(normalized || ' ', maxWidth, (candidate) => font.widthOfTextAtSize(candidate, fontSize))
    ensureRoom(lines.length + 1)

    for (const line of lines) {
      page.drawText(line, {
        x: margin,
        y: cursorY,
        font,
        size: fontSize,
      })
      cursorY -= lineHeight
    }

    cursorY -= 5
  }

  const pdfBytes = await pdfDocument.save()
  return new Blob([toPlainArrayBuffer(pdfBytes)], { type: 'application/pdf' })
}

async function createPdfFromImage(file: File, format: ImageExportFormat): Promise<Blob> {
  const { PDFDocument } = await import('pdf-lib')
  const pdfDocument = await PDFDocument.create()

  const imageDims = await getImageDimensionsFromFile(file)
  const portrait = imageDims.height >= imageDims.width
  const pageWidth = portrait ? 595.28 : 841.89
  const pageHeight = portrait ? 841.89 : 595.28
  const page = pdfDocument.addPage([pageWidth, pageHeight])
  const margin = 36
  const maxWidth = pageWidth - margin * 2
  const maxHeight = pageHeight - margin * 2

  let bytes = new Uint8Array(await file.arrayBuffer())
  let embeddedImage

  if (format === 'png') {
    embeddedImage = await pdfDocument.embedPng(bytes)
  } else if (format === 'jpg') {
    embeddedImage = await pdfDocument.embedJpg(bytes)
  } else {
    const fallbackPng = await rasterizeToBlob(file, {
      width: imageDims.width,
      height: imageDims.height,
      format: 'png',
    })
    bytes = new Uint8Array(await fallbackPng.arrayBuffer())
    embeddedImage = await pdfDocument.embedPng(bytes)
  }

  const scale = Math.min(maxWidth / imageDims.width, maxHeight / imageDims.height)
  const drawWidth = imageDims.width * scale
  const drawHeight = imageDims.height * scale

  page.drawImage(embeddedImage, {
    x: (pageWidth - drawWidth) / 2,
    y: (pageHeight - drawHeight) / 2,
    width: drawWidth,
    height: drawHeight,
  })

  const pdfBytes = await pdfDocument.save()
  return new Blob([toPlainArrayBuffer(pdfBytes)], { type: 'application/pdf' })
}

async function convertPdfToText(file: File): Promise<string> {
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

  return pages.join('\n\n')
}

async function convertPdfToImages(file: File, targetFormat: Exclude<ImageExportFormat, 'svg'>) {
  const { default: JSZip } = await import('jszip')
  const pdfJs = await loadPdfJs()
  const documentTask = pdfJs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) })
  const pdfDocument = await documentTask.promise
  const extension = targetFormat
  const baseName = getFileBasename(file.name)
  const blobs: Blob[] = []

  for (let pageIndex = 1; pageIndex <= pdfDocument.numPages; pageIndex += 1) {
    const page = await pdfDocument.getPage(pageIndex)
    const viewport = page.getViewport({ scale: 2 })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)

    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Canvas rendering is not available')
    }

    await page.render({ canvas, canvasContext: context, viewport }).promise
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((nextBlob) => {
        if (!nextBlob) {
          reject(new Error('Failed to render PDF page'))
          return
        }
        resolve(nextBlob)
      }, IMAGE_FORMAT_MIME[targetFormat], targetFormat === 'jpg' ? 0.92 : 0.9)
    })

    blobs.push(blob)
  }

  if (blobs.length === 1) {
    return {
      blob: blobs[0],
      filename: `${baseName}.${extension}`,
      previewBlob: blobs[0],
      summary: 'Rendered the first page as a single image.',
    }
  }

  const zip = new JSZip()
  blobs.forEach((blob, index) => {
    zip.file(`${baseName}-page-${index + 1}.${extension}`, blob)
  })

  return {
    blob: await zip.generateAsync({ type: 'blob' }),
    filename: `${baseName}-${extension}-pages.zip`,
    previewBlob: blobs[0],
    summary: `Rendered ${blobs.length} PDF pages and packed them into a ZIP archive.`,
  }
}

async function createSourceSnapshot(file: File, format: ConverterFormat): Promise<SourceSnapshot> {
  if (isImageFormat(format)) {
    return {
      previewUrl: URL.createObjectURL(file),
      note: 'Image source preview',
    }
  }

  if (format === 'txt' || format === 'md' || format === 'html') {
    const text = await file.text()
    return {
      textPreview: buildPreviewText(format === 'html' ? stripHtml(DOMPurify.sanitize(text, { USE_PROFILES: { html: true } })) : text),
    }
  }

  if (format === 'doc') {
    const text = await file.text()
    return {
      textPreview: buildPreviewText(looksLikeHtmlWordDoc(text) ? stripHtml(DOMPurify.sanitize(text, { USE_PROFILES: { html: true } })) : 'Legacy DOC import needs a Word-compatible HTML document.'),
      note: looksLikeHtmlWordDoc(text) ? 'DOC source preview' : 'Legacy binary DOC import is not supported.',
    }
  }

  if (format === 'docx') {
    return {
      note: 'DOCX preview is generated during conversion to keep the initial load light.',
    }
  }

  if (format === 'pdf') {
    return {
      note: 'PDF image exports render every page. Text export extracts page text in order.',
    }
  }

  return {}
}

export default function FileConverter() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [file, setFile] = useState<File | null>(null)
  const [sourceFormat, setSourceFormat] = useState<ConverterFormat | null>(null)
  const [targetFormat, setTargetFormat] = useState<ConverterFormat | null>(null)
  const [sourceSnapshot, setSourceSnapshot] = useState<SourceSnapshot>({})
  const [result, setResult] = useState<ConversionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isWorking, setIsWorking] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)

  const targets = useMemo(() => {
    return sourceFormat ? getConverterTargets(sourceFormat) : []
  }, [sourceFormat])

  const resultPreviewUrl = result?.previewUrl
  const sourcePreviewUrl = sourceSnapshot.previewUrl

  const setNextResult = useCallback((nextResult: ConversionResult | null) => {
    setResult((previous) => {
      if (previous?.previewUrl) URL.revokeObjectURL(previous.previewUrl)
      return nextResult
    })
  }, [])

  const setNextSourceSnapshot = useCallback((nextSnapshot: SourceSnapshot) => {
    setSourceSnapshot((previous) => {
      if (previous.previewUrl) URL.revokeObjectURL(previous.previewUrl)
      return nextSnapshot
    })
  }, [])

  const applyFile = useCallback(async (nextFile: File) => {
    if (nextFile.size > MAX_FILE_SIZE) {
      setError('File size must stay under 30 MB.')
      return
    }

    const format = detectConverterFormat(nextFile)
    if (!format) {
      setError('Unsupported file. Try PNG, JPG, WEBP, SVG, PDF, DOCX, DOC, TXT, HTML or Markdown.')
      return
    }

    const nextTargets = getConverterTargets(format)

    setFile(nextFile)
    setSourceFormat(format)
    setTargetFormat(nextTargets[0] ?? null)
    setError(null)
    setNextResult(null)

    try {
      const snapshot = await createSourceSnapshot(nextFile, format)
      setNextSourceSnapshot(snapshot)
    } catch (reason) {
      setNextSourceSnapshot({})
      setError(reason instanceof Error ? reason.message : 'Failed to prepare source preview.')
    }
  }, [setNextResult, setNextSourceSnapshot])

  const runConversion = useCallback(async () => {
    if (!file || !sourceFormat || !targetFormat) return

    setIsWorking(true)
    setError(null)

    try {
      let nextResult: ConversionResult
      const baseName = getFileBasename(file.name)

      if (isImageFormat(sourceFormat)) {
        const imageDims = await getImageDimensionsFromFile(file)

        if (targetFormat === 'pdf') {
          const pdfBlob = await createPdfFromImage(file, sourceFormat)
          nextResult = {
            blob: pdfBlob,
            filename: `${baseName}.pdf`,
            view: 'pdf',
            previewUrl: URL.createObjectURL(pdfBlob),
            summary: 'Packed the image into a single PDF page.',
          }
        } else if (targetFormat === 'svg') {
          const svgBlob = sourceFormat === 'svg'
            ? new Blob([await file.text()], { type: 'image/svg+xml' })
            : await rasterFileToSvgBlob(file, imageDims.width, imageDims.height)

          nextResult = {
            blob: svgBlob,
            filename: `${baseName}.svg`,
            view: 'image',
            previewUrl: URL.createObjectURL(svgBlob),
            summary: sourceFormat === 'svg'
              ? 'Kept the SVG document intact.'
              : 'Wrapped the raster image in an SVG document for broader design-tool compatibility.',
          }
        } else if (isImageFormat(targetFormat)) {
          const imageBlob = await rasterizeToBlob(file, {
            width: imageDims.width,
            height: imageDims.height,
            format: targetFormat,
            quality: targetFormat === 'jpg' ? 0.92 : 0.9,
            background: targetFormat === 'jpg' ? '#ffffff' : null,
          })

          nextResult = {
            blob: imageBlob,
            filename: `${baseName}.${targetFormat}`,
            view: 'image',
            previewUrl: URL.createObjectURL(imageBlob),
            summary: `Converted ${sourceFormat.toUpperCase()} to ${targetFormat.toUpperCase()} in-browser.`,
          }
        } else {
          throw new Error('This conversion pair is not available.')
        }
      } else if (sourceFormat === 'pdf') {
        if (targetFormat === 'txt') {
          const text = await convertPdfToText(file)
          const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
          nextResult = {
            blob,
            filename: `${baseName}.txt`,
            view: 'text',
            textPreview: buildPreviewText(text),
            summary: 'Extracted page text from the PDF.',
          }
        } else if (targetFormat === 'png' || targetFormat === 'jpg' || targetFormat === 'webp') {
          const imageResult = await convertPdfToImages(file, targetFormat)
          nextResult = {
            blob: imageResult.blob,
            filename: imageResult.filename,
            view: 'image',
            previewUrl: URL.createObjectURL(imageResult.previewBlob),
            summary: imageResult.summary,
          }
        } else {
          throw new Error('PDF can export to PNG, JPG, WEBP or TXT only.')
        }
      } else {
        const prepared = await prepareDocumentSource(file, sourceFormat)

        if (targetFormat === 'txt') {
          const blob = new Blob([prepared.text], { type: 'text/plain;charset=utf-8' })
          nextResult = {
            blob,
            filename: `${baseName}.txt`,
            view: 'text',
            textPreview: buildPreviewText(prepared.text),
            summary: prepared.note ?? 'Converted document content to plain text.',
          }
        } else if (targetFormat === 'html') {
          const blob = new Blob([prepared.html], { type: 'text/html;charset=utf-8' })
          nextResult = {
            blob,
            filename: `${baseName}.html`,
            view: 'html',
            htmlPreview: prepared.html,
            summary: prepared.note ?? 'Generated a browser-safe HTML export.',
          }
        } else if (targetFormat === 'md') {
          const blob = new Blob([prepared.markdown], { type: 'text/markdown;charset=utf-8' })
          nextResult = {
            blob,
            filename: `${baseName}.md`,
            view: 'text',
            textPreview: buildPreviewText(prepared.markdown),
            summary: 'Converted the document to Markdown.',
          }
        } else if (targetFormat === 'pdf') {
          const pdfBlob = await createPdfFromText(prepared.text, prepared.title)
          nextResult = {
            blob: pdfBlob,
            filename: `${baseName}.pdf`,
            view: 'pdf',
            previewUrl: URL.createObjectURL(pdfBlob),
            summary: 'Rendered a clean, text-first PDF export.',
          }
        } else if (targetFormat === 'docx') {
          const docxBlob = await createDocxBlobFromHtml(prepared.html, prepared.title)
          nextResult = {
            blob: docxBlob,
            filename: `${baseName}.docx`,
            view: 'download',
            textPreview: buildPreviewText(prepared.text),
            summary: 'Built a DOCX file with simplified headings, paragraphs and lists.',
          }
        } else if (targetFormat === 'doc') {
          const wordHtml = buildWordCompatibleHtmlDocument(prepared.html, prepared.title)
          const docBlob = new Blob([wordHtml], { type: 'application/msword' })
          nextResult = {
            blob: docBlob,
            filename: `${baseName}.doc`,
            view: 'download',
            textPreview: buildPreviewText(prepared.text),
            summary: 'Exported a Word-compatible DOC file based on HTML, which is the most reliable browser-side path.',
          }
        } else {
          throw new Error('This conversion pair is not available.')
        }
      }

      setNextResult(nextResult)

      const gtag = (window as unknown as Record<string, unknown>).gtag as ((...args: unknown[]) => void) | undefined
      gtag?.('event', 'tool_action', {
        tool_name: 'converter',
        source_format: sourceFormat,
        target_format: targetFormat,
      })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Conversion failed.')
    } finally {
      setIsWorking(false)
    }
  }, [file, setNextResult, sourceFormat, targetFormat])

  const downloadResult = useCallback(() => {
    if (!result) return
    downloadBlob(result.blob, result.filename)
  }, [result])

  useEffect(() => {
    return () => {
      if (sourcePreviewUrl) URL.revokeObjectURL(sourcePreviewUrl)
      if (resultPreviewUrl) URL.revokeObjectURL(resultPreviewUrl)
    }
  }, [resultPreviewUrl, sourcePreviewUrl])

  const helperNote = useMemo(() => {
    if (!sourceFormat || !targetFormat) {
      return 'Choose a file to see the conversion options.'
    }

    if (sourceFormat === 'pdf' && (targetFormat === 'png' || targetFormat === 'jpg' || targetFormat === 'webp')) {
      return 'Single-page PDFs download as one image. Multi-page PDFs download as a ZIP with one image per page.'
    }

    if (targetFormat === 'doc') {
      return 'DOC export is HTML-based for maximum browser compatibility. That keeps Word support high without requiring a server.'
    }

    if (sourceFormat === 'docx' || sourceFormat === 'doc') {
      return 'Office document conversions prioritize structure and content, not perfect desktop Word layout reproduction.'
    }

    return 'All conversions happen locally in your browser. Nothing is uploaded.'
  }, [sourceFormat, targetFormat])

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-border/60">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <FileCog className="h-5 w-5" />
                Universal Converter
              </CardTitle>
              <CardDescription className="mt-2 max-w-[64ch]">
                Convert between image, PDF and lightweight document formats without leaving the browser.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">PDF</Badge>
              <Badge variant="secondary">DOCX</Badge>
              <Badge variant="secondary">DOC</Badge>
              <Badge variant="outline">PNG</Badge>
              <Badge variant="outline">JPG</Badge>
              <Badge variant="outline">SVG</Badge>
              <Badge variant="outline">WEBP</Badge>
              <Badge variant="outline">TXT</Badge>
              <Badge variant="outline">HTML</Badge>
              <Badge variant="outline">MD</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            className="hidden"
            onChange={(event) => {
              const selected = event.target.files?.[0]
              if (selected) void applyFile(selected)
              event.currentTarget.value = ''
            }}
          />

          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onDrop={(event) => {
              event.preventDefault()
              setIsDragOver(false)
              const dropped = event.dataTransfer.files?.[0]
              if (dropped) void applyFile(dropped)
            }}
            onDragOver={(event) => {
              event.preventDefault()
              setIsDragOver(true)
            }}
            onDragLeave={() => setIsDragOver(false)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                fileInputRef.current?.click()
              }
            }}
            className={cn(
              'rounded-2xl border border-dashed p-6 transition-colors',
              'bg-gradient-to-br from-muted/30 via-background to-muted/10',
              isDragOver ? 'border-primary/60 bg-primary/5' : 'border-border/70 hover:border-primary/40',
            )}
          >
            <div className="flex flex-col items-center justify-center gap-3 text-center">
              <UploadCloud className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="font-medium">Drop a file here or click to upload</p>
                <p className="text-sm text-muted-foreground">PDF, DOCX, DOC, TXT, HTML, Markdown, PNG, JPG, WEBP, SVG</p>
              </div>
              {file && (
                <Badge variant="outline" className="max-w-full truncate">
                  {file.name} · {formatFileSize(file.size)}
                </Badge>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/60 bg-muted/15 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Source</p>
                <p className="mt-2 text-lg font-semibold">
                  {sourceFormat ? FORMAT_LABELS[sourceFormat] : 'No file yet'}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {file ? 'Detected from file type and extension.' : 'Upload a file to unlock target formats.'}
                </p>
              </div>

              <div className="space-y-2 rounded-2xl border border-border/60 bg-muted/15 p-4">
                <p className="text-sm font-medium">Target format</p>
                <Select
                  value={targetFormat ?? undefined}
                  onValueChange={(value) => setTargetFormat(value as ConverterFormat)}
                  disabled={!sourceFormat || targets.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a target format" />
                  </SelectTrigger>
                  <SelectContent>
                    {targets.map((target) => (
                      <SelectItem key={target} value={target}>
                        {FORMAT_LABELS[target]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Available pairs are limited to the conversions that remain reliable without server processing.
                </p>
              </div>
            </div>

            <Card className="border-border/60 bg-muted/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Conversion logic</CardTitle>
                <CardDescription>{helperNote}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {targets.length > 0 ? (
                    targets.map((target) => (
                      <Badge key={target} variant={target === targetFormat ? 'default' : 'outline'}>
                        {target.toUpperCase()}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="secondary">Load a file first</Badge>
                  )}
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border border-border/60 bg-background px-3 py-2">
                    <p className="text-muted-foreground">Source</p>
                    <p className="mt-1 font-medium">{sourceFormat ? sourceFormat.toUpperCase() : '—'}</p>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-background px-3 py-2">
                    <p className="text-muted-foreground">Target</p>
                    <p className="mt-1 font-medium">{targetFormat ? targetFormat.toUpperCase() : '—'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => void runConversion()} disabled={!file || !sourceFormat || !targetFormat || isWorking} className="min-w-[170px]">
              {isWorking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Converting...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Convert now
                </>
              )}
            </Button>
            <Button onClick={downloadResult} variant="outline" disabled={!result || isWorking}>
              <Download className="mr-2 h-4 w-4" />
              Download result
            </Button>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            The tool is intentionally browser-first. That means privacy stays high, while some legacy office edge cases are simplified instead of delegated to a server.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">Source snapshot</CardTitle>
              {sourceFormat && <Badge variant="outline">{sourceFormat.toUpperCase()}</Badge>}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border/60 bg-[linear-gradient(45deg,#f8fafc_25%,transparent_25%),linear-gradient(-45deg,#f8fafc_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f8fafc_75%),linear-gradient(-45deg,transparent_75%,#f8fafc_75%)] bg-[length:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0]">
              {sourceSnapshot.previewUrl ? (
                <img src={sourceSnapshot.previewUrl} alt="Source preview" className="h-full w-full object-contain" />
              ) : sourceSnapshot.textPreview ? (
                <div className="h-full overflow-auto p-4">
                  <pre className="whitespace-pre-wrap text-sm text-foreground/90">{sourceSnapshot.textPreview}</pre>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
                  {sourceSnapshot.note ?? 'Upload a supported file to inspect it here.'}
                </div>
              )}
            </div>
            {sourceSnapshot.note && (
              <p className="text-xs text-muted-foreground">{sourceSnapshot.note}</p>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">Converted output</CardTitle>
              {result ? (
                <Badge variant="outline">
                  {result.filename.endsWith('.zip') ? 'ZIP' : formatFileSize(result.blob.size)}
                </Badge>
              ) : (
                <Badge variant="secondary">Waiting for conversion</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border/60 bg-background">
              {!result ? (
                <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
                  Choose a target format and run the conversion to inspect the output here.
                </div>
              ) : result.view === 'image' && result.previewUrl ? (
                <img src={result.previewUrl} alt="Converted preview" className="h-full w-full object-contain" />
              ) : result.view === 'pdf' && result.previewUrl ? (
                <iframe src={result.previewUrl} title="PDF preview" className="h-full w-full" />
              ) : result.view === 'html' && result.htmlPreview ? (
                <div
                  className="prose prose-sm max-w-none p-4 text-foreground"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(result.htmlPreview, { USE_PROFILES: { html: true } }) }}
                />
              ) : result.textPreview ? (
                <div className="h-full overflow-auto p-4">
                  <pre className="whitespace-pre-wrap text-sm text-foreground/90">{result.textPreview}</pre>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
                  This output format is download-first. Use the button above to grab the generated file.
                </div>
              )}
            </div>

            {result && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="rounded-xl border border-border/60 bg-muted/15 px-3 py-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Summary</p>
                  <p className="mt-1 text-sm text-foreground/90">{result.summary}</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/15 px-3 py-2 text-right">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">File</p>
                  <p className="mt-1 text-sm font-medium">{result.filename}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 bg-muted/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowRightLeft className="h-4 w-4" />
            Suggested pairs
          </CardTitle>
          <CardDescription>
            PNG/JPG/SVG to PDF for handoff, PDF to image ZIP for page assets, DOCX to HTML/Markdown for web publishing, and TXT/HTML to DOCX when you need a lightweight office export.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-border/60 bg-background px-4 py-3">
            <p className="text-sm font-medium">Image workflows</p>
            <p className="mt-1 text-sm text-muted-foreground">PNG, JPG, WEBP and SVG can become PDF or switch between web-friendly image formats.</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background px-4 py-3">
            <p className="text-sm font-medium">PDF workflows</p>
            <p className="mt-1 text-sm text-muted-foreground">PDF pages render to PNG/JPG/WEBP and can also extract text cleanly to TXT.</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background px-4 py-3">
            <p className="text-sm font-medium">Document workflows</p>
            <p className="mt-1 text-sm text-muted-foreground">DOCX, DOC, HTML, TXT and Markdown convert through sanitized, structure-first exports.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
