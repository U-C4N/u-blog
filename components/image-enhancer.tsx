'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { enhanceImage, hasWebGpuSupport, checkWebGpuReady } from '@/lib/enhancer/processor'
import type { EnhanceOptions, EnhanceProgress } from '@/lib/enhancer/types'
import { DEFAULT_OPTIONS } from '@/lib/enhancer/types'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Aperture,
  ArrowLeftRight,
  Cpu,
  Download,
  Loader2,
  Search,
  Sparkles,
  Zap,
} from 'lucide-react'

const MAX_FILE_SIZE = 25 * 1024 * 1024
const LENS_DIAMETER = 220
const LENS_RADIUS = LENS_DIAMETER / 2
const LENS_ZOOM = 3

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatRuntime(ms: number): string {
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(2)} s`
}

function safeName(filename: string): string {
  return filename.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9-_]+/g, '-')
}

function containedRect(cW: number, cH: number, iW: number, iH: number) {
  const cAspect = cW / cH
  const iAspect = iW / iH
  if (iAspect > cAspect) {
    const rW = cW, rH = cW / iAspect
    return { x: 0, y: (cH - rH) / 2, w: rW, h: rH }
  }
  const rH = cH, rW = cH * iAspect
  return { x: (cW - rW) / 2, y: 0, w: rW, h: rH }
}

// ── Animation Variants ────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const childVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ImageEnhancer() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [file, setFile] = useState<File | null>(null)
  const [sourceUrl, setSourceUrl] = useState<string | null>(null)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [resultBlob, setResultBlob] = useState<Blob | null>(null)
  const [resultDims, setResultDims] = useState<{ w: number; h: number } | null>(null)
  const [srcDims, setSrcDims] = useState<{ w: number; h: number } | null>(null)

  const [scale, setScale] = useState<1 | 2 | 4>(DEFAULT_OPTIONS.scale)
  const [sharpen, setSharpen] = useState(DEFAULT_OPTIONS.sharpen)
  const [denoise, setDenoise] = useState(DEFAULT_OPTIONS.denoise)
  const [brightness, setBrightness] = useState(DEFAULT_OPTIONS.brightness)
  const [contrast, setContrast] = useState(DEFAULT_OPTIONS.contrast)
  const [saturation, setSaturation] = useState(DEFAULT_OPTIONS.saturation)
  const [format, setFormat] = useState<'png' | 'jpeg'>(DEFAULT_OPTIONS.format)
  const [jpegQuality, setJpegQuality] = useState(DEFAULT_OPTIONS.quality)

  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('Ready')
  const [error, setError] = useState<string | null>(null)
  const [engine, setEngine] = useState<'webgpu' | 'cpu' | null>(null)
  const [runtimeMs, setRuntimeMs] = useState<number | null>(null)
  const [webGpuReady, setWebGpuReady] = useState(false)
  const [webGpuChecked, setWebGpuChecked] = useState(false)

  const [isDragOver, setIsDragOver] = useState(false)

  // Slider compare
  const [sliderPos, setSliderPos] = useState(50)
  const [dragging, setDragging] = useState(false)
  const compareRef = useRef<HTMLDivElement>(null)

  // Magnifier
  const [lensPos, setLensPos] = useState<{ rx: number; ry: number } | null>(null)
  const [showLens, setShowLens] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const canRun = Boolean(file) && !processing
  const canDownload = Boolean(resultBlob) && !processing

  // ── WebGPU Check ───────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const ready = hasWebGpuSupport() ? await checkWebGpuReady() : false
      if (!cancelled) { setWebGpuReady(ready); setWebGpuChecked(true) }
    })()
    return () => { cancelled = true }
  }, [])

  // ── File Handling ──────────────────────────────────────────────────────────
  const clearResult = useCallback(() => {
    setResultBlob(null)
    setResultUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null })
    setResultDims(null)
    setRuntimeMs(null)
    setEngine(null)
    setProgress(0)
    setProgressLabel('Ready')
  }, [])

  const onSelectFile = useCallback((next: File) => {
    if (!next.type.startsWith('image/')) { setError('Please upload PNG, JPG, or WEBP images only.'); return }
    if (next.size > MAX_FILE_SIZE) { setError('File size must be under 25 MB.'); return }
    setError(null)
    setFile(next)
    clearResult()
    setSourceUrl(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(next) })
    void createImageBitmap(next).then(bmp => { setSrcDims({ w: bmp.width, h: bmp.height }); bmp.close() })
  }, [clearResult])

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) onSelectFile(f)
  }, [onSelectFile])

  // ── Process ────────────────────────────────────────────────────────────────
  const processImage = useCallback(async () => {
    if (!file || processing) return
    setProcessing(true); setError(null); clearResult()
    setProgress(2); setProgressLabel('Starting')
    try {
      const opts: EnhanceOptions = { scale, sharpen, denoise, brightness, contrast, saturation, format, quality: jpegQuality }
      const onProg = (p: EnhanceProgress) => { setProgress(p.percent); setProgressLabel(p.label) }
      const result = await enhanceImage(file, opts, onProg)
      setResultBlob(result.blob)
      setResultUrl(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(result.blob) })
      setResultDims({ w: result.width, h: result.height }); setEngine(result.engine)
      setRuntimeMs(result.elapsedMs); setProgress(100); setProgressLabel('Done')
      const g = (window as unknown as Record<string, unknown>).gtag as ((...a: unknown[]) => void) | undefined
      g?.('event', 'tool_action', { tool_name: 'image-enhancer', scale, engine: result.engine, format })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Enhancement failed. Try another image.')
      setProgressLabel('Failed')
    } finally { setProcessing(false) }
  }, [file, processing, clearResult, scale, sharpen, denoise, brightness, contrast, saturation, format, jpegQuality])

  // ── Download ───────────────────────────────────────────────────────────────
  const downloadResult = useCallback(() => {
    if (!resultBlob || !file) return
    const url = URL.createObjectURL(resultBlob)
    const a = document.createElement('a')
    a.href = url; a.download = `${safeName(file.name)}-enhanced-${scale}x.${format}`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [file, resultBlob, scale, format])

  // ── Reset ──────────────────────────────────────────────────────────────────
  const resetSettings = useCallback(() => {
    setScale(DEFAULT_OPTIONS.scale); setSharpen(DEFAULT_OPTIONS.sharpen)
    setDenoise(DEFAULT_OPTIONS.denoise); setBrightness(DEFAULT_OPTIONS.brightness)
    setContrast(DEFAULT_OPTIONS.contrast); setSaturation(DEFAULT_OPTIONS.saturation)
    setFormat(DEFAULT_OPTIONS.format); setJpegQuality(DEFAULT_OPTIONS.quality)
  }, [])

  // ── Slider Compare ─────────────────────────────────────────────────────────
  const updateSlider = useCallback((clientX: number) => {
    const rect = compareRef.current?.getBoundingClientRect()
    if (!rect) return
    setSliderPos(Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)))
  }, [])

  useEffect(() => {
    if (!dragging) return
    const onMove = (e: PointerEvent) => updateSlider(e.clientX)
    const onUp = () => setDragging(false)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp) }
  }, [dragging, updateSlider])

  // ── Cleanup (split so each URL is only revoked when *it* changes) ────────
  useEffect(() => () => {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl)
  }, [sourceUrl])

  useEffect(() => () => {
    if (resultUrl) URL.revokeObjectURL(resultUrl)
  }, [resultUrl])

  // ── Computed ───────────────────────────────────────────────────────────────
  const outputDimLabel = useMemo(() => {
    if (!srcDims) return null
    const w = srcDims.w * scale, h = srcDims.h * scale
    return { w, h, is4k: w >= 3840 || h >= 2160 }
  }, [srcDims, scale])

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <motion.div
      className="space-y-10"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <motion.div variants={childVariants} className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2.5 text-xl font-semibold tracking-tight">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Image Enhancer
            </h2>
            <p className="mt-2 max-w-[64ch] text-sm text-muted-foreground leading-relaxed">
              GPU-accelerated image upscaling and enhancement. Lanczos3 resampling, smart sharpening, noise reduction, and color correction — entirely in your browser.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-wider',
              webGpuReady
                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                : 'bg-muted text-muted-foreground',
            )}>
              {webGpuReady ? <Zap className="h-3 w-3" /> : <Cpu className="h-3 w-3" />}
              {!webGpuChecked ? 'Checking...' : webGpuReady ? 'WebGPU' : 'CPU Fallback'}
            </span>
            {outputDimLabel?.is4k && (
              <span className="inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/5 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-amber-700 dark:text-amber-300">
                4K Output
              </span>
            )}
          </div>
        </div>
        <Separator className="bg-foreground/5" />
      </motion.div>

      {/* ── Upload Zone — Darkroom Canvas ─────────────────────────────── */}
      <motion.div variants={childVariants}>
        <input
          ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) onSelectFile(f); e.currentTarget.value = '' }}
        />

        <AnimatePresence mode="wait">
          {!file ? (
            <motion.div
              key="upload-empty"
              layout
              role="button" tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onDrop={onDrop}
              onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
              onDragLeave={() => setIsDragOver(false)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click() } }}
              whileHover={{ scale: 1.005 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={cn(
                'group relative min-h-[280px] cursor-pointer rounded-xl border border-dashed transition-colors duration-300 focus:outline-none',
                'bg-[repeating-conic-gradient(hsl(var(--muted))_0%_25%,transparent_0%_50%)] bg-[length:24px_24px]',
                isDragOver
                  ? 'border-amber-500/60 shadow-[0_0_40px_-12px_rgba(245,158,11,0.2)]'
                  : 'border-foreground/10 hover:border-amber-500/30',
              )}
            >
              {/* Warm radial glow on hover */}
              <div className={cn(
                'absolute inset-0 rounded-xl transition-opacity duration-500',
                'bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.06),transparent_70%)]',
                isDragOver ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
              )} />

              <div className="relative flex h-full min-h-[280px] flex-col items-center justify-center gap-4 text-center">
                <Aperture className="h-12 w-12 text-muted-foreground/50 transition-colors duration-300 group-hover:text-amber-500/60" />
                <div>
                  <p className="text-[11px] font-light uppercase tracking-[0.2em] text-muted-foreground">
                    Drop your image here or click to upload
                  </p>
                  <p className="mt-1.5 text-[10px] uppercase tracking-wider text-muted-foreground/50">
                    PNG, JPG, WEBP up to 25 MB
                  </p>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="upload-loaded"
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
              className="flex h-16 items-center gap-4 rounded-xl border border-foreground/8 bg-muted/20 px-4"
              role="button" tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onDrop={onDrop}
              onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
              onDragLeave={() => setIsDragOver(false)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click() } }}
            >
              {sourceUrl && (
                <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border border-foreground/8">
                  <img src={sourceUrl} alt="Thumbnail" className="h-full w-full object-cover" />
                </div>
              )}
              <div className="flex flex-1 items-center gap-3 overflow-hidden">
                <span className="truncate text-sm font-medium">{file.name}</span>
                <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                  {srcDims && `${srcDims.w}x${srcDims.h}`}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                  {formatSize(file.size)}
                </span>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
                Click to replace
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Settings Panel — Asymmetric 2-Column ─────────────────────── */}
      <motion.div variants={childVariants}>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Controls Column */}
          <div className="space-y-8 lg:col-span-7">
            {/* Upscale */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  Upscale
                </span>
                <Separator className="flex-1 bg-foreground/5" />
              </div>
              <div className="relative flex rounded-lg border border-foreground/8 bg-muted/10 p-1">
                {([1, 2, 4] as const).map(s => (
                  <button key={s} type="button" onClick={() => setScale(s)}
                    className="relative z-10 flex-1 rounded-md px-3 py-2 text-center text-sm font-medium transition-colors">
                    {scale === s && (
                      <motion.div
                        layoutId="scale-bg"
                        className="absolute inset-0 rounded-md bg-amber-500/10"
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      />
                    )}
                    <span className={cn('relative', scale === s ? 'text-amber-700 dark:text-amber-300' : 'text-muted-foreground')}>
                      {s === 1 ? 'None' : `${s}x`}
                    </span>
                  </button>
                ))}
              </div>
              {outputDimLabel && (
                <p className="text-[10px] font-mono tabular-nums text-muted-foreground">
                  Output: {outputDimLabel.w}x{outputDimLabel.h}{outputDimLabel.is4k && ' (4K+)'}
                </p>
              )}
            </div>

            {/* Format */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  Output Format
                </span>
                <Separator className="flex-1 bg-foreground/5" />
              </div>
              <div className="relative flex w-full max-w-[200px] rounded-lg border border-foreground/8 bg-muted/10 p-1">
                {(['png', 'jpeg'] as const).map(f => (
                  <button key={f} type="button" onClick={() => setFormat(f)}
                    className="relative z-10 flex-1 rounded-md px-3 py-1.5 text-center text-xs font-medium uppercase transition-colors">
                    {format === f && (
                      <motion.div
                        layoutId="format-bg"
                        className="absolute inset-0 rounded-md bg-amber-500/10"
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      />
                    )}
                    <span className={cn('relative', format === f ? 'text-amber-700 dark:text-amber-300' : 'text-muted-foreground')}>
                      {f}
                    </span>
                  </button>
                ))}
              </div>

              <AnimatePresence>
                {format === 'jpeg' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between text-xs">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Quality</Label>
                        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{Math.round(jpegQuality * 100)}%</span>
                      </div>
                      <Slider
                        min={0.5} max={1} step={0.01} value={[jpegQuality]}
                        onValueChange={v => setJpegQuality(v[0] ?? 0.92)}
                        className="[&_[role=slider]]:border-amber-500 [&_[role=slider]]:h-3.5 [&_[role=slider]]:w-3.5 [&>span:first-child]:h-1 [&>span:first-child>span]:bg-amber-500 [&>span:first-child]:bg-foreground/8"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Detail */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  Detail
                </span>
                <Separator className="flex-1 bg-foreground/5" />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Sharpen</span>
                    <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{sharpen}</span>
                  </div>
                  <Slider
                    min={0} max={100} step={1} value={[sharpen]}
                    onValueChange={v => setSharpen(v[0] ?? 30)}
                    className="[&_[role=slider]]:border-amber-500 [&_[role=slider]]:h-3.5 [&_[role=slider]]:w-3.5 [&>span:first-child]:h-1 [&>span:first-child>span]:bg-amber-500 [&>span:first-child]:bg-foreground/8"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Noise Reduction</span>
                    <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{denoise}</span>
                  </div>
                  <Slider
                    min={0} max={100} step={1} value={[denoise]}
                    onValueChange={v => setDenoise(v[0] ?? 0)}
                    className="[&_[role=slider]]:border-amber-500 [&_[role=slider]]:h-3.5 [&_[role=slider]]:w-3.5 [&>span:first-child]:h-1 [&>span:first-child>span]:bg-amber-500 [&>span:first-child]:bg-foreground/8"
                  />
                </div>
              </div>
            </div>

            {/* Color */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  Color
                </span>
                <Separator className="flex-1 bg-foreground/5" />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {([
                  ['Brightness', brightness, setBrightness] as const,
                  ['Contrast', contrast, setContrast] as const,
                  ['Saturation', saturation, setSaturation] as const,
                ]).map(([label, value, setter]) => (
                  <div key={label} className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
                      <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{value > 0 ? `+${value}` : value}</span>
                    </div>
                    <Slider
                      min={-50} max={50} step={1} value={[value]}
                      onValueChange={v => setter(v[0] ?? 0)}
                      className="[&_[role=slider]]:border-amber-500 [&_[role=slider]]:h-3.5 [&_[role=slider]]:w-3.5 [&>span:first-child]:h-1 [&>span:first-child>span]:bg-amber-500 [&>span:first-child]:bg-foreground/8"
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={resetSettings}
                  className="text-[11px] text-muted-foreground/60 transition-colors hover:text-foreground"
                >
                  Reset all
                </button>
              </div>
            </div>
          </div>

          {/* Preview Column */}
          <div className="lg:col-span-5">
            <div className="sticky top-6 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  Preview
                </span>
                <Separator className="flex-1 bg-foreground/5" />
              </div>
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-foreground/8 bg-[repeating-conic-gradient(hsl(var(--muted))_0%_25%,transparent_0%_50%)] bg-[length:16px_16px]">
                {sourceUrl ? (
                  <>
                    <img src={sourceUrl} alt="Source preview" className="h-full w-full object-contain" />
                    {outputDimLabel && (
                      <div className="absolute bottom-3 right-3 rounded-lg bg-background/80 px-2.5 py-1 text-[10px] font-mono tabular-nums text-muted-foreground backdrop-blur-sm">
                        {outputDimLabel.w} x {outputDimLabel.h}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground/40">
                    No image loaded
                  </div>
                )}
              </div>
              {/* Metadata chips */}
              {file && (
                <div className="flex flex-wrap gap-2">
                  {srcDims && (
                    <span className="rounded-md bg-muted/30 px-2 py-0.5 text-[10px] font-mono tabular-nums text-muted-foreground">
                      {srcDims.w}x{srcDims.h}
                    </span>
                  )}
                  <span className="rounded-md bg-muted/30 px-2 py-0.5 text-[10px] font-mono tabular-nums text-muted-foreground">
                    {formatSize(file.size)}
                  </span>
                  <span className="rounded-md bg-muted/30 px-2 py-0.5 text-[10px] font-mono uppercase tabular-nums text-muted-foreground">
                    {file.type.split('/')[1]}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <Separator className="bg-foreground/5" />

      {/* ── Action Bar — Command Strip ────────────────────────────────── */}
      <motion.div variants={childVariants} className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            onClick={processImage}
            disabled={!canRun}
            className={cn(
              'h-12 w-full rounded-xl bg-foreground text-background sm:w-auto sm:max-w-xs sm:flex-1',
              'hover:bg-foreground/90 disabled:bg-foreground/20',
            )}
          >
            {processing ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enhancing...</>
            ) : (
              <>
                <motion.span
                  className="mr-2 inline-flex"
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Sparkles className="h-4 w-4" />
                </motion.span>
                Enhance Image
              </>
            )}
          </Button>
          <Button
            onClick={downloadResult}
            variant="outline"
            disabled={!canDownload}
            className="h-12 rounded-xl sm:w-auto"
          >
            <Download className="mr-2 h-4 w-4" />Download {format.toUpperCase()}
          </Button>
        </div>

        {/* Result metadata */}
        {(runtimeMs !== null || engine || resultDims || resultBlob) && (
          <p className="font-mono text-[10px] text-muted-foreground">
            {[
              runtimeMs !== null && formatRuntime(runtimeMs),
              engine && `Engine: ${engine}`,
              resultDims && `${resultDims.w}x${resultDims.h}`,
              resultBlob && formatSize(resultBlob.size),
            ].filter(Boolean).join(' \u00b7 ')}
          </p>
        )}

        {/* Progress */}
        {(processing || progress > 0) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-muted-foreground">{progressLabel}</span>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">{progress}%</span>
            </div>
            <div className="h-0.5 w-full overflow-hidden rounded-full bg-foreground/5">
              <motion.div
                className="h-full bg-amber-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ type: 'spring', stiffness: 100, damping: 20 }}
              />
            </div>
          </div>
        )}

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/40">
          All processing happens locally in your browser. No images are uploaded to any server.
        </p>
      </motion.div>

      {/* ── Comparison Section — Unified Tabs ─────────────────────────── */}
      {sourceUrl && resultUrl && (
        <motion.div
          variants={childVariants}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <Separator className="mb-10 bg-foreground/5" />

          <Tabs defaultValue="slider" className="space-y-6">
            <TabsList className="h-auto gap-0 rounded-none border-b border-foreground/8 bg-transparent p-0">
              {[
                { value: 'slider', label: 'Slider' },
                { value: 'magnifier', label: 'Magnifier' },
                { value: 'side-by-side', label: 'Side by Side' },
              ].map(tab => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground shadow-none transition-colors data-[state=active]:border-b-amber-500 data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Slider Compare */}
            <TabsContent value="slider" className="mt-6">
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div
                  ref={compareRef}
                  className="relative aspect-[16/10] cursor-col-resize overflow-hidden rounded-xl border border-foreground/8 bg-black/5 select-none"
                  onPointerDown={e => { setDragging(true); updateSlider(e.clientX) }}
                >
                  {/* After (full, background) */}
                  <img src={resultUrl} alt="Enhanced" className="absolute inset-0 h-full w-full object-contain" draggable={false} />

                  {/* Before (clipped from left) */}
                  <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}>
                    <img src={sourceUrl} alt="Original" className="absolute inset-0 h-full w-full object-contain" draggable={false} />
                  </div>

                  {/* Divider handle */}
                  <div className="absolute top-0 bottom-0 z-20 -ml-px" style={{ left: `${sliderPos}%` }}>
                    <div className="h-full w-[2px] bg-white shadow-[0_0_8px_rgba(0,0,0,0.4)]" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/80 bg-background/70 shadow-xl backdrop-blur-md transition-transform hover:scale-110">
                      <ArrowLeftRight className="h-4 w-4" />
                    </div>
                  </div>

                  {/* Labels */}
                  <div className="absolute left-3 top-3 z-10">
                    <span className="rounded-md bg-amber-900/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-100 backdrop-blur-sm">
                      Before
                    </span>
                  </div>
                  <div className="absolute right-3 top-3 z-10">
                    <span className="rounded-md bg-amber-900/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-100 backdrop-blur-sm">
                      After
                    </span>
                  </div>
                </div>
              </motion.div>
            </TabsContent>

            {/* Magnifier Compare */}
            <TabsContent value="magnifier" className="mt-6">
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                {srcDims && (
                  <div className="space-y-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
                      Hover over either image to zoom in. Both lenses move together.
                    </p>
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <MagnifierCard
                        label="BEFORE"
                        src={sourceUrl}
                        imgW={srcDims.w}
                        imgH={srcDims.h}
                        lensRel={lensPos}
                        showLens={showLens}
                        onEnter={() => setShowLens(true)}
                        onLeave={() => { setShowLens(false); setLensPos(null) }}
                        onMove={setLensPos}
                      />
                      <MagnifierCard
                        label="AFTER"
                        src={resultUrl}
                        imgW={srcDims.w}
                        imgH={srcDims.h}
                        lensRel={lensPos}
                        showLens={showLens}
                        onEnter={() => setShowLens(true)}
                        onLeave={() => { setShowLens(false); setLensPos(null) }}
                        onMove={setLensPos}
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            </TabsContent>

            {/* Side by Side */}
            <TabsContent value="side-by-side" className="mt-6">
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  <div className="space-y-2">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Source</span>
                    <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-foreground/8 bg-[repeating-conic-gradient(hsl(var(--muted))_0%_25%,transparent_0%_50%)] bg-[length:16px_16px]">
                      <img src={sourceUrl} alt="Source image" className="h-full w-full object-contain" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Enhanced</span>
                      {runtimeMs !== null && (
                        <span className="font-mono text-[10px] tabular-nums text-muted-foreground">{formatRuntime(runtimeMs)}</span>
                      )}
                    </div>
                    <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-foreground/8 bg-[repeating-conic-gradient(hsl(var(--muted))_0%_25%,transparent_0%_50%)] bg-[length:16px_16px]">
                      <img src={resultUrl} alt="Enhanced output" className="h-full w-full object-contain" />
                    </div>
                  </div>
                </div>
              </motion.div>
            </TabsContent>
          </Tabs>
        </motion.div>
      )}

      {/* Side-by-Side when no result yet — source only */}
      {sourceUrl && !resultUrl && (
        <motion.div variants={childVariants}>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="space-y-2">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Source</span>
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-foreground/8 bg-[repeating-conic-gradient(hsl(var(--muted))_0%_25%,transparent_0%_50%)] bg-[length:16px_16px]">
                <img src={sourceUrl} alt="Source image" className="h-full w-full object-contain" />
              </div>
            </div>
            <div className="space-y-2">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Enhanced Output</span>
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-foreground/8 bg-[repeating-conic-gradient(hsl(var(--muted))_0%_25%,transparent_0%_50%)] bg-[length:16px_16px]">
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground/40">
                  Enhance an image to see the result
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

// ── Magnifier Card ──────────────────────────────────────────────────────────

interface MagnifierCardProps {
  label: string
  src: string
  imgW: number
  imgH: number
  lensRel: { rx: number; ry: number } | null
  showLens: boolean
  onEnter: () => void
  onLeave: () => void
  onMove: (pos: { rx: number; ry: number }) => void
}

function MagnifierCard({ label, src, imgW, imgH, lensRel, showLens, onEnter, onLeave, onMove }: MagnifierCardProps) {
  const localRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState<{ w: number; h: number } | null>(null)

  useEffect(() => {
    const el = localRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      if (entry) {
        const { width, height } = entry.contentRect
        setContainerSize({ w: width, h: height })
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const handleMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = localRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const cW = rect.width, cH = rect.height
    const img = containedRect(cW, cH, imgW, imgH)

    const px = e.clientX - rect.left
    const py = e.clientY - rect.top

    const rx = Math.max(0, Math.min(1, (px - img.x) / img.w))
    const ry = Math.max(0, Math.min(1, (py - img.y) / img.h))
    onMove({ rx, ry })
  }, [imgW, imgH, onMove])

  const localLens = useMemo(() => {
    if (!lensRel || !containerSize) return null
    const img = containedRect(containerSize.w, containerSize.h, imgW, imgH)
    return {
      x: img.x + lensRel.rx * img.w,
      y: img.y + lensRel.ry * img.h,
      imgRect: img,
    }
  }, [lensRel, imgW, imgH, containerSize])

  const bgCalc = useMemo(() => {
    if (!localLens) return null
    const { imgRect } = localLens
    const bgW = imgRect.w * LENS_ZOOM
    const bgH = imgRect.h * LENS_ZOOM
    const relX = localLens.x - imgRect.x
    const relY = localLens.y - imgRect.y
    return {
      bgSize: `${bgW}px ${bgH}px`,
      bgPos: `${-relX * LENS_ZOOM + LENS_RADIUS}px ${-relY * LENS_ZOOM + LENS_RADIUS}px`,
    }
  }, [localLens])

  const isAfter = label === 'AFTER'

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className={cn(
          'text-[10px] font-semibold uppercase tracking-wider',
          isAfter ? 'text-amber-600 dark:text-amber-400' : 'text-stone-500 dark:text-stone-400',
        )}>
          {label}
        </span>
        {showLens && <span className="text-[10px] text-muted-foreground">{LENS_ZOOM}x zoom</span>}
      </div>

      <div
        ref={localRef}
        className="relative aspect-[4/3] cursor-crosshair overflow-hidden rounded-xl border border-foreground/8 bg-[repeating-conic-gradient(hsl(var(--muted))_0%_25%,transparent_0%_50%)] bg-[length:16px_16px]"
        onPointerEnter={onEnter}
        onPointerLeave={onLeave}
        onPointerMove={handleMove}
      >
        <img src={src} alt={label} className="h-full w-full object-contain" draggable={false} />

        {showLens && localLens && bgCalc && (
          <div
            className="pointer-events-none absolute z-30"
            style={{
              left: localLens.x - LENS_RADIUS,
              top: localLens.y - LENS_RADIUS,
              width: LENS_DIAMETER,
              height: LENS_DIAMETER,
            }}
          >
            <div
              className={cn(
                'absolute inset-0 rounded-full border-[3px] shadow-[0_4px_24px_rgba(0,0,0,0.35)]',
                isAfter ? 'border-amber-400/80' : 'border-white/90',
              )}
              style={{
                backgroundImage: `url(${src})`,
                backgroundSize: bgCalc.bgSize,
                backgroundPosition: bgCalc.bgPos,
                backgroundRepeat: 'no-repeat',
              }}
            />

            <div className="absolute -top-7 left-1/2 -translate-x-1/2">
              <span className={cn(
                'whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-lg',
                isAfter ? 'bg-amber-600 text-white' : 'bg-stone-700 text-stone-100',
              )}>
                {label}
              </span>
            </div>

            <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/30" />
            <div className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-white/30" />
            <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/80 bg-white/40" />
          </div>
        )}

        {!showLens && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-2 rounded-full bg-background/80 px-4 py-2 shadow-lg backdrop-blur-sm">
              <Search className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Hover to zoom</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
