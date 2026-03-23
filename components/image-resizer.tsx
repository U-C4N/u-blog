'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import {
  downloadBlob,
  formatFileSize,
  getFileBasename,
  getImageDimensionsFromFile,
  IMAGE_FORMAT_MIME,
  parseSvgDimensions,
  rasterFileToSvgBlob,
  rasterizeToBlob,
  resizeSvgMarkup,
  type ImageExportFormat,
} from '@/lib/tool-media'
import {
  Download,
  ImagePlus,
  Loader2,
  Lock,
  MoveHorizontal,
  MoveVertical,
  ScanLine,
  Sparkles,
  UploadCloud,
} from 'lucide-react'

const MAX_FILE_SIZE = 20 * 1024 * 1024
const SUPPORTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']

const OUTPUT_OPTIONS: Array<{ value: ImageExportFormat; label: string; note: string }> = [
  { value: 'png', label: 'PNG', note: 'Lossless export with alpha support.' },
  { value: 'jpg', label: 'JPG', note: 'Good for smaller files. Transparent areas flatten to white.' },
  { value: 'webp', label: 'WEBP', note: 'Efficient web delivery with smaller file sizes.' },
  { value: 'svg', label: 'SVG', note: 'Vector output for SVG inputs or a wrapped raster export.' },
]

function clampDimension(value: number) {
  return Math.max(1, Math.min(12000, Math.round(value)))
}

function inferImageFormat(file: File): ImageExportFormat {
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/webp') return 'webp'
  if (file.type === 'image/svg+xml') return 'svg'
  return 'jpg'
}

export default function ImageResizer() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [file, setFile] = useState<File | null>(null)
  const [sourceUrl, setSourceUrl] = useState<string | null>(null)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [resultBlob, setResultBlob] = useState<Blob | null>(null)
  const [sourceFormat, setSourceFormat] = useState<ImageExportFormat>('png')
  const [sourceDims, setSourceDims] = useState<{ width: number; height: number } | null>(null)
  const [targetWidth, setTargetWidth] = useState(0)
  const [targetHeight, setTargetHeight] = useState(0)
  const [outputFormat, setOutputFormat] = useState<ImageExportFormat>('png')
  const [keepAspectRatio, setKeepAspectRatio] = useState(true)
  const [quality, setQuality] = useState(92)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const aspectRatio = useMemo(() => {
    if (!sourceDims) return 1
    return sourceDims.width / sourceDims.height
  }, [sourceDims])

  const canProcess = Boolean(file && sourceDims && targetWidth > 0 && targetHeight > 0 && !isProcessing)
  const canDownload = Boolean(resultBlob && !isProcessing)

  const selectedOutput = OUTPUT_OPTIONS.find((option) => option.value === outputFormat) ?? OUTPUT_OPTIONS[0]

  const setPreviewResult = useCallback((blob: Blob | null) => {
    setResultBlob(blob)
    setResultUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous)
      return blob ? URL.createObjectURL(blob) : null
    })
  }, [])

  const resetResult = useCallback(() => {
    setPreviewResult(null)
    setError(null)
  }, [setPreviewResult])

  const applyFile = useCallback(async (nextFile: File) => {
    if (!SUPPORTED_TYPES.includes(nextFile.type)) {
      setError('PNG, JPG, WEBP or SVG files only.')
      return
    }

    if (nextFile.size > MAX_FILE_SIZE) {
      setError('File size must stay under 20 MB.')
      return
    }

    try {
      const dims = await getImageDimensionsFromFile(nextFile)
      const nextFormat = inferImageFormat(nextFile)

      setFile(nextFile)
      setSourceFormat(nextFormat)
      setSourceDims(dims)
      setTargetWidth(clampDimension(dims.width))
      setTargetHeight(clampDimension(dims.height))
      setOutputFormat(nextFormat)
      setQuality(92)
      setError(null)
      resetResult()

      setSourceUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous)
        return URL.createObjectURL(nextFile)
      })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Failed to read image dimensions.')
    }
  }, [resetResult])

  const handleWidthChange = useCallback((value: string) => {
    const nextWidth = clampDimension(Number(value) || 1)
    setTargetWidth(nextWidth)
    if (keepAspectRatio && sourceDims) {
      setTargetHeight(clampDimension(nextWidth / aspectRatio))
    }
  }, [aspectRatio, keepAspectRatio, sourceDims])

  const handleHeightChange = useCallback((value: string) => {
    const nextHeight = clampDimension(Number(value) || 1)
    setTargetHeight(nextHeight)
    if (keepAspectRatio && sourceDims) {
      setTargetWidth(clampDimension(nextHeight * aspectRatio))
    }
  }, [aspectRatio, keepAspectRatio, sourceDims])

  const handleResize = useCallback(async () => {
    if (!file || !sourceDims) return

    setIsProcessing(true)
    setError(null)

    try {
      let nextBlob: Blob

      if (outputFormat === 'svg') {
        if (sourceFormat === 'svg') {
          const svgMarkup = resizeSvgMarkup(await file.text(), targetWidth, targetHeight)
          nextBlob = new Blob([svgMarkup], { type: IMAGE_FORMAT_MIME.svg })
        } else {
          nextBlob = await rasterFileToSvgBlob(file, targetWidth, targetHeight)
        }
      } else {
        nextBlob = await rasterizeToBlob(file, {
          width: targetWidth,
          height: targetHeight,
          format: outputFormat,
          quality: quality / 100,
          background: outputFormat === 'jpg' ? '#ffffff' : null,
        })
      }

      setPreviewResult(nextBlob)

      const gtag = (window as unknown as Record<string, unknown>).gtag as ((...args: unknown[]) => void) | undefined
      gtag?.('event', 'tool_action', {
        tool_name: 'resizer',
        source_format: sourceFormat,
        output_format: outputFormat,
        width: targetWidth,
        height: targetHeight,
      })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Resize failed. Try another format.')
    } finally {
      setIsProcessing(false)
    }
  }, [file, outputFormat, quality, setPreviewResult, sourceDims, sourceFormat, targetHeight, targetWidth])

  const handleDownload = useCallback(() => {
    if (!file || !resultBlob) return
    downloadBlob(resultBlob, `${getFileBasename(file.name)}-${targetWidth}x${targetHeight}.${outputFormat}`)
  }, [file, outputFormat, resultBlob, targetHeight, targetWidth])

  const handleReset = useCallback(() => {
    if (!sourceDims) return
    setTargetWidth(clampDimension(sourceDims.width))
    setTargetHeight(clampDimension(sourceDims.height))
    setOutputFormat(sourceFormat)
    setQuality(92)
    resetResult()
  }, [resetResult, sourceDims, sourceFormat])

  useEffect(() => {
    return () => {
      if (sourceUrl) URL.revokeObjectURL(sourceUrl)
      if (resultUrl) URL.revokeObjectURL(resultUrl)
    }
  }, [resultUrl, sourceUrl])

  const helperNote = useMemo(() => {
    if (outputFormat === 'svg' && sourceFormat !== 'svg') {
      return 'SVG export wraps your raster file in an SVG container. It stays editable as a document, but it does not magically vectorize the image.'
    }

    if (outputFormat === 'jpg') {
      return 'JPG does not keep transparency, so transparent pixels are flattened onto white.'
    }

    if (sourceFormat === 'svg' && outputFormat === 'svg') {
      return 'SVG to SVG keeps the artwork as vector markup while updating width and height cleanly.'
    }

    return selectedOutput.note
  }, [outputFormat, selectedOutput.note, sourceFormat])

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-border/60">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <ScanLine className="h-5 w-5" />
                Image Resizer
              </CardTitle>
              <CardDescription className="mt-2 max-w-[62ch]">
                Resize SVG, PNG, JPG and WEBP files by exact width and height. Everything runs in your browser.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Width / Height</Badge>
              <Badge variant="outline">Browser-side</Badge>
              <Badge variant="outline">SVG aware</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
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
                <p className="font-medium">Drop an image here or click to upload</p>
                <p className="text-sm text-muted-foreground">SVG, PNG, JPG, WEBP up to 20 MB</p>
              </div>
              {file && (
                <Badge variant="outline" className="max-w-full truncate">
                  {file.name} · {formatFileSize(file.size)}
                </Badge>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr]">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="resize-width" className="flex items-center gap-2">
                  <MoveHorizontal className="h-4 w-4" />
                  Width
                </Label>
                <Input
                  id="resize-width"
                  type="number"
                  min={1}
                  max={12000}
                  value={targetWidth || ''}
                  onChange={(event) => handleWidthChange(event.target.value)}
                  disabled={!file}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="resize-height" className="flex items-center gap-2">
                  <MoveVertical className="h-4 w-4" />
                  Height
                </Label>
                <Input
                  id="resize-height"
                  type="number"
                  min={1}
                  max={12000}
                  value={targetHeight || ''}
                  onChange={(event) => handleHeightChange(event.target.value)}
                  disabled={!file}
                />
              </div>

              <div className="space-y-2">
                <Label>Output format</Label>
                <Select value={outputFormat} onValueChange={(value) => setOutputFormat(value as ImageExportFormat)} disabled={!file}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OUTPUT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Keep aspect ratio
                </Label>
                <div className="flex h-10 items-center justify-between rounded-md border border-input bg-background px-3">
                  <span className="text-sm text-muted-foreground">
                    {sourceDims ? `${sourceDims.width}:${sourceDims.height}` : 'Load a file'}
                  </span>
                  <Switch checked={keepAspectRatio} onCheckedChange={setKeepAspectRatio} disabled={!file} />
                </div>
              </div>
            </div>

            <Card className="border-border/60 bg-muted/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Output tuning</CardTitle>
                <CardDescription>{helperNote}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <Label className="text-sm">Compression quality</Label>
                    <span className="text-muted-foreground">{quality}%</span>
                  </div>
                  <Slider
                    value={[quality]}
                    min={30}
                    max={100}
                    step={1}
                    onValueChange={(value) => setQuality(value[0] ?? 92)}
                    disabled={!file || outputFormat === 'png' || outputFormat === 'svg'}
                  />
                  <p className="text-xs text-muted-foreground">
                    Used for JPG and WEBP exports. PNG and SVG ignore this value.
                  </p>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border border-border/60 bg-background px-3 py-2">
                    <p className="text-muted-foreground">Source</p>
                    <p className="mt-1 font-medium uppercase">{sourceFormat}</p>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-background px-3 py-2">
                    <p className="text-muted-foreground">Target</p>
                    <p className="mt-1 font-medium uppercase">
                      {targetWidth && targetHeight ? `${targetWidth} × ${targetHeight}` : '—'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleResize} disabled={!canProcess} className="min-w-[170px]">
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resizing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Resize image
                </>
              )}
            </Button>
            <Button onClick={handleDownload} variant="outline" disabled={!canDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            <Button onClick={handleReset} variant="ghost" disabled={!file || isProcessing}>
              Reset
            </Button>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            JPG exports flatten transparency. SVG exports from raster files stay browser-friendly, but they do not reconstruct real vectors.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">Source</CardTitle>
              {sourceDims && (
                <Badge variant="outline">
                  {sourceDims.width} × {sourceDims.height}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border/60 bg-[linear-gradient(45deg,#f8fafc_25%,transparent_25%),linear-gradient(-45deg,#f8fafc_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f8fafc_75%),linear-gradient(-45deg,transparent_75%,#f8fafc_75%)] bg-[length:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0]">
              {sourceUrl ? (
                <img src={sourceUrl} alt="Source preview" className="h-full w-full object-contain" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Upload an image to preview
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">Resized Output</CardTitle>
              {resultBlob ? (
                <Badge variant="outline">
                  {formatFileSize(resultBlob.size)}
                </Badge>
              ) : (
                <Badge variant="secondary">Ready when you are</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border/60 bg-[linear-gradient(45deg,#f8fafc_25%,transparent_25%),linear-gradient(-45deg,#f8fafc_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f8fafc_75%),linear-gradient(-45deg,transparent_75%,#f8fafc_75%)] bg-[length:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0]">
              {resultUrl ? (
                <img src={resultUrl} alt="Resized preview" className="h-full w-full object-contain" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Resize the image to generate output
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border/60 bg-muted/15 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Format</p>
                <p className="mt-1 font-medium uppercase">{outputFormat}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/15 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Width</p>
                <p className="mt-1 font-medium">{targetWidth || '—'}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/15 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Height</p>
                <p className="mt-1 font-medium">{targetHeight || '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 bg-muted/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ImagePlus className="h-4 w-4" />
            Best fit
          </CardTitle>
          <CardDescription>
            Use PNG for clean transparency, JPG for lightweight photos, WEBP for modern web delivery, and SVG when you want document-level scaling.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
