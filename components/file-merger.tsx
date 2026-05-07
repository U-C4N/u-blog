'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Combine,
  Download,
  FileText,
  Loader2,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { downloadBlob, formatFileSize, getFileBasename } from '@/lib/tool-media'
import {
  buildPreviewSnippet,
  detectMergeFormat,
  extractMergeSource,
  mergeAsDocx,
  mergeAsPdf,
  mergeAsTxt,
  type MergeFormat,
  type MergeOutput,
  type MergeSourceMeta,
} from '@/lib/file-merge'

interface MergePiece {
  id: string
  file: File
  format: MergeFormat
  meta: MergeSourceMeta | null
  status: 'parsing' | 'ready' | 'error'
  error?: string
}

interface MergeResult {
  blob: Blob
  filename: string
  size: number
  format: MergeOutput
  pieceCount: number
}

const ACCEPTED_EXTENSIONS = '.txt,.pdf,.doc,.docx'
const ACCEPTED_LABELS = 'TXT, PDF, DOC, DOCX'
const MAX_FILE_SIZE = 60 * 1024 * 1024 // 60 MB per file
const MAX_PIECES = 25

const FORMAT_LABEL: Record<MergeFormat, string> = {
  txt: 'TXT',
  pdf: 'PDF',
  doc: 'DOC',
  docx: 'DOCX',
}

const OUTPUT_LABEL: Record<MergeOutput, string> = {
  pdf: 'PDF document',
  docx: 'DOCX document',
  txt: 'Plain text (TXT)',
}

const OUTPUT_EXTENSION: Record<MergeOutput, string> = {
  pdf: 'pdf',
  docx: 'docx',
  txt: 'txt',
}

function makePieceId(file: File, index: number): string {
  return `${file.name}-${file.size}-${file.lastModified}-${index}-${Math.random().toString(36).slice(2, 8)}`
}

export default function FileMerger() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pieces, setPieces] = useState<MergePiece[]>([])
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({})
  const [isDragOver, setIsDragOver] = useState(false)
  const [outputFormat, setOutputFormat] = useState<MergeOutput>('pdf')
  const [outputName, setOutputName] = useState('merged-document')
  const [isMerging, setIsMerging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<MergeResult | null>(null)

  const acceptFiles = useCallback(
    async (files: File[]) => {
      if (!files.length) return
      setError(null)
      setResult(null)

      const incoming: MergePiece[] = []
      const issues: string[] = []

      for (const file of files) {
        if (pieces.length + incoming.length >= MAX_PIECES) {
          issues.push(`Maximum of ${MAX_PIECES} files; "${file.name}" was skipped.`)
          continue
        }
        if (file.size > MAX_FILE_SIZE) {
          issues.push(`"${file.name}" exceeds the ${MAX_FILE_SIZE / (1024 * 1024)} MB per-file limit.`)
          continue
        }
        const format = detectMergeFormat(file)
        if (!format) {
          issues.push(`"${file.name}" is not a supported format. Allowed: ${ACCEPTED_LABELS}.`)
          continue
        }
        incoming.push({
          id: makePieceId(file, pieces.length + incoming.length),
          file,
          format,
          meta: null,
          status: 'parsing',
        })
      }

      if (issues.length) {
        setError(issues.join(' '))
      }

      if (!incoming.length) return

      setPieces((prev) => [...prev, ...incoming])

      // Parse each file in parallel; update their status as they finish.
      await Promise.all(
        incoming.map(async (piece) => {
          try {
            const meta = await extractMergeSource(piece.file, piece.format)
            setPieces((prev) =>
              prev.map((existing) =>
                existing.id === piece.id ? { ...existing, meta, status: 'ready' } : existing,
              ),
            )
          } catch (reason) {
            setPieces((prev) =>
              prev.map((existing) =>
                existing.id === piece.id
                  ? {
                      ...existing,
                      status: 'error',
                      error: reason instanceof Error ? reason.message : 'Failed to parse file.',
                    }
                  : existing,
              ),
            )
          }
        }),
      )
    },
    [pieces.length],
  )

  const onSelectClick = () => fileInputRef.current?.click()

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragOver(false)
    const dropped = Array.from(event.dataTransfer.files ?? [])
    void acceptFiles(dropped)
  }

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? [])
    void acceptFiles(selected)
    event.currentTarget.value = ''
  }

  const removePiece = (id: string) => {
    setPieces((prev) => prev.filter((p) => p.id !== id))
    setExpandedIds((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    setResult(null)
  }

  const movePiece = (id: string, direction: -1 | 1) => {
    setPieces((prev) => {
      const index = prev.findIndex((p) => p.id === id)
      if (index === -1) return prev
      const target = index + direction
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      const [moved] = next.splice(index, 1)
      next.splice(target, 0, moved)
      return next
    })
    setResult(null)
  }

  const togglePreview = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const clearAll = () => {
    setPieces([])
    setExpandedIds({})
    setResult(null)
    setError(null)
  }

  const readyPieces = useMemo(
    () => pieces.filter((piece) => piece.status === 'ready' && piece.meta),
    [pieces],
  )

  const hasErrors = useMemo(() => pieces.some((piece) => piece.status === 'error'), [pieces])
  const isParsing = useMemo(() => pieces.some((piece) => piece.status === 'parsing'), [pieces])

  const performMerge = useCallback(async () => {
    if (readyPieces.length < 2) {
      setError('Add at least two files to merge.')
      return
    }
    if (isParsing) {
      setError('Wait for all files to finish parsing before merging.')
      return
    }

    setIsMerging(true)
    setError(null)
    try {
      const sanitizedTitle = (outputName.trim() || 'merged-document').replace(/[^a-z0-9-_\s]/gi, '').trim() || 'merged-document'
      const orderedPieces = readyPieces.map((piece) => ({
        source: piece.file,
        format: piece.format,
        meta: piece.meta!,
      }))

      let blob: Blob
      if (outputFormat === 'pdf') {
        blob = await mergeAsPdf(orderedPieces, sanitizedTitle)
      } else if (outputFormat === 'docx') {
        blob = await mergeAsDocx(orderedPieces, sanitizedTitle)
      } else {
        blob = mergeAsTxt(orderedPieces)
      }

      const filename = `${getFileBasename(sanitizedTitle)}.${OUTPUT_EXTENSION[outputFormat]}`
      setResult({
        blob,
        filename,
        size: blob.size,
        format: outputFormat,
        pieceCount: orderedPieces.length,
      })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Merge failed.')
    } finally {
      setIsMerging(false)
    }
  }, [isParsing, outputFormat, outputName, readyPieces])

  const onDownload = () => {
    if (!result) return
    downloadBlob(result.blob, result.filename)
  }

  // Reset stale results whenever order changes.
  useEffect(() => {
    setResult(null)
  }, [pieces])

  const helperHint = useMemo(() => {
    if (!pieces.length) return 'Drop multiple files at once. Each file is parsed locally — nothing is uploaded.'
    if (hasErrors) return 'One or more files failed to parse. Remove them or try a different format.'
    if (isParsing) return 'Parsing files…'
    if (outputFormat === 'pdf') return 'PDFs keep their original pages; TXT/DOC/DOCX are rendered as fresh pages with each filename as a section heading.'
    if (outputFormat === 'docx') return 'DOCX output keeps document structure as paragraphs; complex layouts are intentionally simplified.'
    return 'TXT output concatenates the extracted text with section headings.'
  }, [hasErrors, isParsing, outputFormat, pieces.length])

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-border/60">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Combine className="h-5 w-5" />
                Merge documents
              </CardTitle>
              <CardDescription className="mt-2 max-w-[64ch]">
                Stitch TXT, PDF, DOC and DOCX together. Format detection is automatic; reorder with arrows, then merge.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">TXT</Badge>
              <Badge variant="secondary">PDF</Badge>
              <Badge variant="secondary">DOC</Badge>
              <Badge variant="secondary">DOCX</Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_EXTENSIONS}
            className="hidden"
            onChange={handleFileInput}
          />

          <div
            role="button"
            tabIndex={0}
            onClick={onSelectClick}
            onDrop={handleDrop}
            onDragOver={(event) => {
              event.preventDefault()
              setIsDragOver(true)
            }}
            onDragLeave={() => setIsDragOver(false)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onSelectClick()
              }
            }}
            className={cn(
              'rounded-2xl border border-dashed p-6 transition-colors cursor-pointer',
              'bg-gradient-to-br from-muted/30 via-background to-muted/10',
              isDragOver ? 'border-primary/60 bg-primary/5' : 'border-border/70 hover:border-primary/40',
            )}
          >
            <div className="flex flex-col items-center justify-center gap-3 text-center">
              <UploadCloud className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="font-medium">Drop files here or click to upload</p>
                <p className="text-sm text-muted-foreground">{ACCEPTED_LABELS} · up to {MAX_FILE_SIZE / (1024 * 1024)} MB each · {MAX_PIECES} files max</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <p className="text-xs text-muted-foreground">{helperHint}</p>
        </CardContent>
      </Card>

      {pieces.length > 0 && (
        <Card className="border-border/60">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg">Order of files</CardTitle>
                <CardDescription className="mt-1">
                  {pieces.length} file{pieces.length === 1 ? '' : 's'} · {readyPieces.length} ready · top is merged first
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={clearAll} className="self-start sm:self-auto">
                <Trash2 className="mr-2 h-4 w-4" />
                Clear all
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {pieces.map((piece, index) => {
              const expanded = !!expandedIds[piece.id]
              const previewText = piece.meta?.text ?? ''
              return (
                <div
                  key={piece.id}
                  className={cn(
                    'rounded-xl border bg-card/40',
                    piece.status === 'error' ? 'border-destructive/40' : 'border-border/60',
                  )}
                >
                  <div className="flex items-start gap-3 px-4 py-3">
                    <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium truncate" title={piece.file.name}>
                          {piece.file.name}
                        </span>
                        <Badge variant="outline" className="uppercase text-[10px]">
                          {FORMAT_LABEL[piece.format]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{formatFileSize(piece.file.size)}</span>
                        {piece.format === 'pdf' && piece.meta?.pageCount !== undefined && (
                          <span className="text-xs text-muted-foreground">· {piece.meta.pageCount} page{piece.meta.pageCount === 1 ? '' : 's'}</span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        {piece.status === 'parsing' && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" /> Parsing…
                          </span>
                        )}
                        {piece.status === 'ready' && (
                          <button
                            type="button"
                            onClick={() => togglePreview(piece.id)}
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                          >
                            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                            {expanded ? 'Hide preview' : 'Show preview'}
                          </button>
                        )}
                        {piece.status === 'error' && (
                          <span className="text-xs text-destructive truncate">{piece.error}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => movePiece(piece.id, -1)}
                        disabled={index === 0}
                        aria-label="Move up"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => movePiece(piece.id, 1)}
                        disabled={index === pieces.length - 1}
                        aria-label="Move down"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removePiece(piece.id)}
                        aria-label="Remove"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {expanded && piece.status === 'ready' && (
                    <div className="border-t border-border/50 bg-muted/20 px-4 py-3">
                      <div className="flex items-center gap-2 mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                        <FileText className="h-3 w-3" />
                        Extracted text preview
                      </div>
                      <pre className="max-h-60 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-muted-foreground">
                        {buildPreviewSnippet(previewText) || <span className="italic">No extractable text — the file may contain only images.</span>}
                      </pre>
                    </div>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      <Card className="border-border/60">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Merge settings</CardTitle>
          <CardDescription className="mt-1">
            Choose how the merged file should be packaged. PDF preserves the original PDF pages exactly; the others render plain text from each source.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="merge-output-format">Output format</Label>
              <Select value={outputFormat} onValueChange={(value) => setOutputFormat(value as MergeOutput)}>
                <SelectTrigger id="merge-output-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(OUTPUT_LABEL) as MergeOutput[]).map((option) => (
                    <SelectItem key={option} value={option}>
                      {OUTPUT_LABEL[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="merge-output-name">Output filename</Label>
              <Input
                id="merge-output-name"
                value={outputName}
                onChange={(event) => setOutputName(event.target.value)}
                placeholder="merged-document"
                maxLength={80}
              />
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {readyPieces.length < 2
                ? `Add ${2 - readyPieces.length} more file${readyPieces.length === 1 ? '' : 's'} to enable merging.`
                : `Ready to merge ${readyPieces.length} file${readyPieces.length === 1 ? '' : 's'} as ${OUTPUT_LABEL[outputFormat]}.`}
            </p>
            <Button
              onClick={performMerge}
              disabled={isMerging || isParsing || readyPieces.length < 2}
              size="lg"
              className="self-stretch sm:self-auto"
            >
              {isMerging ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Merging…
                </>
              ) : (
                <>
                  <Combine className="mr-2 h-4 w-4" />
                  Merge files
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Merged document is ready</CardTitle>
            <CardDescription className="mt-1">
              {result.pieceCount} files combined into a single {FORMAT_LABEL[result.format as MergeFormat] ?? result.format.toUpperCase()} file · {formatFileSize(result.size)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 truncate">
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="font-mono text-sm truncate">{result.filename}</span>
              </div>
              <Button onClick={onDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
