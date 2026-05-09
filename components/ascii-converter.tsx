'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { AsciiWorkerClient, type AsciiWorkerJob } from '@/lib/ascii/worker-client'
import type { AsciiConvertOptions } from '@/lib/ascii/types'
import { computeGpuGridSize, convertToAsciiGpu, hasUsableWebGpuAdapter, hasWebGpuSupport, type GpuAsciiOptions } from '@/lib/ascii/gpu-engine'
import { downloadTextFile } from '@/lib/file-utils'
import { Check, Copy, Cpu, Download, Gauge, Sparkles, UploadCloud, Zap } from 'lucide-react'

const DEFAULT_CHARSET = '@%#*+=-:. '
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024
const MAX_INPUT_DIMENSION = 8192
const CHARSET_PRESETS = {
  classic: '@%#*+=-:. ',
  cinematic: '$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/|()1{}[]?-_+~<>i!lI;:,`^. ',
  minimal: '#XOxo:,. ',
} as const

type CharsetPresetKey = keyof typeof CHARSET_PRESETS
type CopyTarget = 'main' | 'standard' | 'experimental'

const checkerStyle = {
  backgroundColor: '#f8fafc',
  backgroundImage:
    'linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)',
  backgroundSize: '18px 18px',
  backgroundPosition: '0 0, 0 9px, 9px -9px, -9px 0',
} as const

type Engine = 'worker' | 'gpu'
type Output = { text: string; width: number; height: number; runtimeMs: number; engine: Engine } | null

function log(event: string, details?: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  const payload = { at: new Date().toISOString(), event, ...(details ?? {}) }
  const w = window as Window & { __asciiDebugLog?: Array<Record<string, unknown>> }
  if (!w.__asciiDebugLog) w.__asciiDebugLog = []
  w.__asciiDebugLog.push(payload)
  if (w.__asciiDebugLog.length > 300) w.__asciiDebugLog.shift()
  console.log('[ascii-converter]', payload)
}

function baseName(filename: string) {
  const base = filename.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9-_]+/g, '-')
  return base || 'ascii-art'
}

function runId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `ascii-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function mapRange(percent: number, start: number, end: number) {
  const clamped = Math.max(0, Math.min(100, percent))
  return Math.round(start + ((clamped / 100) * (end - start)))
}

function cancelledError(message: string) {
  const lowered = message.toLowerCase()
  return lowered.includes('cancelled') || lowered.includes('job_cancelled')
}

async function imageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  try {
    const bitmap = await createImageBitmap(file)
    const dims = { width: bitmap.width, height: bitmap.height }
    bitmap.close()
    return dims
  } catch {
    return null
  }
}

// Browser canvas backing stores fail silently above ~16k px and burn enormous
// amounts of memory before that, so we cap the preview here. The downloaded
// TXT is independent of canvas — it always carries the full grid.
const MAX_CANVAS_DIM = 4096

function drawAscii(canvas: HTMLCanvasElement, text: string, grid: { width: number; height: number }) {
  const ctx = canvas.getContext('2d', { alpha: true })
  if (!ctx) return

  const fontSize = 14
  const font = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
  ctx.font = `${fontSize}px ${font}`
  const cellW = ctx.measureText('M').width || 8
  const lineH = fontSize

  const naturalW = Math.max(1, Math.round(grid.width * cellW))
  const naturalH = Math.max(1, Math.round(grid.height * lineH))
  const fit = Math.min(1, MAX_CANVAS_DIM / Math.max(naturalW, naturalH))
  const targetW = Math.max(1, Math.round(naturalW * fit))
  const targetH = Math.max(1, Math.round(naturalH * fit))
  if (canvas.width !== targetW) canvas.width = targetW
  if (canvas.height !== targetH) canvas.height = targetH
  ctx.clearRect(0, 0, targetW, targetH)

  ctx.save()
  if (fit < 1) ctx.scale(fit, fit)
  ctx.fillStyle = '#0f172a'
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  ctx.font = `${fontSize}px ${font}`
  const lines = text.split('\n')
  const limit = Math.min(grid.height, lines.length)
  for (let y = 0; y < limit; y += 1) {
    if (lines[y].length === 0) continue
    ctx.fillText(lines[y], 0, (y + 1) * lineH)
  }
  ctx.restore()
}

export default function AsciiConverter() {
  const [file, setFile] = useState<File | null>(null)
  const [dims, setDims] = useState<{ width: number; height: number } | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [experimental, setExperimental] = useState(false)
  const [compare, setCompare] = useState(true)
  const [detailScale, setDetailScale] = useState(1)
  const [charAspect, setCharAspect] = useState(0.5)
  const [alphaThreshold, setAlphaThreshold] = useState(0.08)
  const [contrast, setContrast] = useState(1)
  const [brightness, setBrightness] = useState(0)
  const [edgeBoost, setEdgeBoost] = useState(1)
  const [edgeThreshold, setEdgeThreshold] = useState(0.18)
  const [maxSide, setMaxSide] = useState(1024)
  const [invert, setInvert] = useState(false)
  const [dither, setDither] = useState(true)
  const [charsetPreset, setCharsetPreset] = useState<CharsetPresetKey>('classic')
  const [webGpuReady, setWebGpuReady] = useState(false)
  const [webGpuChecked, setWebGpuChecked] = useState(false)
  const [hasWorker, setHasWorker] = useState(false)
  const [hasWorkerAcceleration, setHasWorkerAcceleration] = useState(false)
  const [progress, setProgress] = useState(0)
  const [label, setLabel] = useState('Ready')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedTarget, setCopiedTarget] = useState<CopyTarget | null>(null)
  const [runtimeMs, setRuntimeMs] = useState<number | null>(null)
  const [standardOut, setStandardOut] = useState<Output>(null)
  const [experimentalOut, setExperimentalOut] = useState<Output>(null)

  const clientRef = useRef<AsciiWorkerClient | null>(null)
  const jobRef = useRef<AsciiWorkerJob | null>(null)
  const activeRunRef = useRef('')
  const startRef = useRef(0)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const primaryCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const standardCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const experimentalCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const copyTimerRef = useRef<number | null>(null)

  const experimentalActive = experimental && webGpuReady
  const runStandard = !experimental || compare
  const runExperimental = (experimental || compare) && webGpuReady

  const targetWidth = useMemo(() => {
    if (!dims) return 260
    const proposed = Math.round((dims.width / 3.2) * detailScale)
    return Math.max(24, Math.min(1200, dims.width, Math.max(96, proposed)))
  }, [detailScale, dims])

  const options = useMemo<AsciiConvertOptions>(() => ({
    outputWidth: targetWidth,
    charset: CHARSET_PRESETS[charsetPreset] ?? DEFAULT_CHARSET,
    invert,
    dither,
    charAspect,
    maxInputDimension: MAX_INPUT_DIMENSION,
    alphaThreshold,
    contrast,
    brightness,
    edgeBoost,
  }), [alphaThreshold, brightness, charAspect, charsetPreset, contrast, dither, edgeBoost, invert, targetWidth])

  const gpuOptions = useMemo<GpuAsciiOptions>(() => ({
    maxSide,
    charAspect,
    invert,
    alphaThreshold,
    contrast,
    brightness,
    edgeBoost,
    edgeThreshold,
  }), [alphaThreshold, brightness, charAspect, contrast, edgeBoost, edgeThreshold, invert, maxSide])

  const experimentalGrid = useMemo(() => {
    if (!dims) return null
    return computeGpuGridSize(dims.width, dims.height, maxSide, charAspect)
  }, [charAspect, dims, maxSide])

  const current = experimental ? experimentalOut : standardOut
  const currentText = current?.text ?? ''
  const glyphCount = useMemo(() => currentText.split('\n').reduce((sum, row) => sum + row.length, 0), [currentText])

  const ensureClient = useCallback(() => {
    if (!clientRef.current) clientRef.current = new AsciiWorkerClient()
    return clientRef.current
  }, [])

  const cancelJob = useCallback(() => {
    if (jobRef.current) {
      log('job_cancel', { jobId: jobRef.current.id, runId: activeRunRef.current })
      jobRef.current.cancel()
      jobRef.current = null
    }
  }, [])

  const workerPass = useCallback(async (rid: string, source: File, start: number, end: number) => {
    const client = ensureClient()
    const job = client.convert(source, options, {
      onProgress: (p) => {
        if (activeRunRef.current !== rid || jobRef.current?.id !== p.id) return
        setProgress(mapRange(p.percent, start, end))
        setLabel(p.stage === 'draft' ? 'Standard draft' : 'Standard final')
      },
    })
    jobRef.current = job
    const result = await job.promise
    if (activeRunRef.current !== rid) throw new Error('JOB_CANCELLED')
    return { text: result.text, width: result.width, height: result.height, runtimeMs: result.elapsedMs, engine: 'worker' as const }
  }, [ensureClient, options])

  const experimentalPass = useCallback(async (rid: string, source: File, start: number, end: number) => {
    const onProgress = (percent: number, stage: string) => {
      if (activeRunRef.current !== rid) return
      setProgress(mapRange(percent, start, end))
      setLabel(`Experimental GPU: ${stage}`)
    }

    const result = await convertToAsciiGpu(source, gpuOptions, {
      onProgress: (p) => onProgress(p.percent, p.label),
      shouldAbort: () => activeRunRef.current !== rid,
    })
    return { text: result.text, width: result.width, height: result.height, runtimeMs: result.elapsedMs, engine: 'gpu' as const }
  }, [gpuOptions])

  const run = useCallback((source: File) => {
    if (runStandard && !hasWorker) {
      setError('Browser does not support Web Workers required for standard pass.')
      return
    }
    if (experimental && !compare && !webGpuReady) {
      setError('Experimental GPU mode needs WebGPU. Enable WebGPU in your browser, or turn on A/B Compare to also see Standard output.')
      return
    }

    cancelJob()
    const rid = runId()
    activeRunRef.current = rid
    startRef.current = performance.now()

    setError(null)
    setProcessing(true)
    setProgress(2)
    setLabel('Starting conversion')
    setRuntimeMs(null)
    if (runStandard) setStandardOut(null)
    if (runExperimental) setExperimentalOut(null)

    log('run_start', { rid, runStandard, runExperimental, experimentalRequested: experimental, experimentalActive, compare, targetWidth: options.outputWidth })

    void (async () => {
      try {
        if (runStandard) {
          const standard = await workerPass(rid, source, 0, runExperimental ? 48 : 100)
          if (activeRunRef.current !== rid) return
          setStandardOut(standard)
        }
        if (runExperimental) {
          const exp = await experimentalPass(rid, source, runStandard ? 52 : 0, 100)
          if (activeRunRef.current !== rid) return
          setExperimentalOut(exp)
        }
        if (activeRunRef.current !== rid) return
        setProgress(100)
        setLabel('Done')
        setRuntimeMs(Math.round(performance.now() - startRef.current))
        log('run_success', { rid, durationMs: Math.round(performance.now() - startRef.current) })
      } catch (reason) {
        if (activeRunRef.current !== rid) return
        const message = reason instanceof Error ? reason.message : 'Conversion failed'
        if (!cancelledError(message)) {
          setError(message)
          log('run_error', { rid, message })
        }
      } finally {
        if (activeRunRef.current !== rid) return
        setProcessing(false)
        jobRef.current = null
      }
    })()
  }, [cancelJob, compare, experimental, experimentalActive, experimentalPass, hasWorker, options.outputWidth, runExperimental, runStandard, webGpuReady, workerPass])

  const onFile = useCallback((next: File) => {
    const mimeOk = next.type === 'image/png' || next.type === 'image/jpeg' || next.type === 'image/jpg'
    const extOk = /\.(png|jpe?g)$/i.test(next.name)
    if (!mimeOk && !extOk) return setError('Please upload PNG or JPG files only.')
    if (next.size > MAX_FILE_SIZE_BYTES) return setError('Please upload an image under 20 MB.')

    setError(null)
    setFile(next)
    setDims(null)
    setStandardOut(null)
    setExperimentalOut(null)
    setProgress(0)
    setLabel('Reading metadata')
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(next)
    })
    log('file_selected', { name: next.name, sizeBytes: next.size, experimental, compare })
  }, [compare, experimental])

  const copy = useCallback(async (text: string, target: CopyTarget) => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopiedTarget(target)
      log('copy_success', { target, chars: text.length })
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current)
      copyTimerRef.current = window.setTimeout(() => {
        setCopiedTarget(null)
      }, 1400)
    } catch {
      log('copy_failed', { target })
      setError('Copy failed. Browser clipboard permission is blocked.')
      setCopiedTarget(target)
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current)
      copyTimerRef.current = window.setTimeout(() => {
        setCopiedTarget(null)
      }, 1400)
    }
  }, [])

  const download = useCallback(() => {
    if (!currentText || !file) return
    const suffix = experimental ? 'experimental' : 'standard'
    downloadTextFile(currentText, `${baseName(file.name)}-${suffix}-ascii.txt`, 'text/plain;charset=utf-8')
  }, [currentText, experimental, file])

  useEffect(() => {
    const workerOk = typeof Worker !== 'undefined'
    setHasWorker(workerOk)
    setHasWorkerAcceleration(workerOk && typeof OffscreenCanvas !== 'undefined')
    log('capabilities_worker', { workerOk, offscreen: typeof OffscreenCanvas !== 'undefined' })

    let cancelled = false
    const probe = async () => {
      if (!hasWebGpuSupport()) {
        if (!cancelled) {
          setWebGpuReady(false)
          setWebGpuChecked(true)
        }
        return
      }
      const available = await hasUsableWebGpuAdapter()
      if (!cancelled) {
        setWebGpuReady(available)
        setWebGpuChecked(true)
      }
    }
    void probe()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    if (!file) return
    void imageDimensions(file).then((d) => {
      if (!cancelled && d) setDims(d)
    })
    return () => { cancelled = true }
  }, [file])

  useEffect(() => {
    if (!file || !dims) return
    const t = window.setTimeout(() => run(file), 120)
    return () => window.clearTimeout(t)
  }, [compare, dims, experimental, file, run])

  useEffect(() => {
    if (!primaryCanvasRef.current || !current) return
    drawAscii(primaryCanvasRef.current, current.text, { width: current.width, height: current.height })
  }, [current])

  useEffect(() => {
    if (!compare) return
    if (standardCanvasRef.current && standardOut) {
      drawAscii(standardCanvasRef.current, standardOut.text, { width: standardOut.width, height: standardOut.height })
    }
    if (experimentalCanvasRef.current && experimentalOut) {
      drawAscii(experimentalCanvasRef.current, experimentalOut.text, { width: experimentalOut.width, height: experimentalOut.height })
    }
  }, [compare, experimentalOut, standardOut])

  useEffect(() => () => {
    cancelJob()
    clientRef.current?.dispose()
    if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current)
  }, [cancelJob])

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden border-border/60">
        <CardHeader className="relative pb-4">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.22),transparent_52%),radial-gradient(circle_at_bottom_right,hsl(var(--accent)/0.18),transparent_60%)]" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl"><Sparkles className="h-5 w-5" />PNG/JPG to ASCII</CardTitle>
              <CardDescription className="mt-2 max-w-[66ch]">
                Standard mode: dithered 4K worker. Experimental mode: aspect-correct WebGPU compute — image is resampled to a monospace-friendly grid, then a single compute pass picks each glyph from tone + Sobel-orientation banks. A/B compares the two side by side.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={hasWorkerAcceleration ? 'default' : 'secondary'} className="gap-1">
                {hasWorkerAcceleration ? <Zap className="h-3 w-3" /> : <Cpu className="h-3 w-3" />}
                {hasWorkerAcceleration ? 'Worker Acceleration' : 'Worker Mode'}
              </Badge>
              <Badge variant="outline">Aspect-Correct Grid</Badge>
              <Badge variant="outline">Single Compute Pass</Badge>
              {compare && <Badge variant="outline">A/B Compare</Badge>}
              {experimentalActive && <Badge variant="default" className="gap-1"><Gauge className="h-3 w-3" />Experimental GPU</Badge>}
              {experimental && !webGpuReady && webGpuChecked && <Badge variant="destructive">No WebGPU</Badge>}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/jpg" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.currentTarget.value = '' }} />

          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) onFile(f) }}
            onDragOver={(e) => e.preventDefault()}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click() } }}
            className={cn('group rounded-xl border border-dashed border-border/75 p-7 transition-colors focus:outline-none', 'bg-gradient-to-br from-muted/35 via-background to-muted/10 hover:border-primary/40 hover:from-muted/50')}
          >
            <div className="flex flex-col items-center justify-center gap-3 text-center">
              <UploadCloud className="h-9 w-9 text-muted-foreground transition-colors group-hover:text-foreground" />
              <div>
                <p className="font-medium">Drop PNG or JPG here, or click to upload</p>
                <p className="text-sm text-muted-foreground">Auto conversion starts immediately</p>
              </div>
              {file && <Badge variant="outline">{file.name}</Badge>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 rounded-xl border border-border/60 bg-muted/15 p-4 lg:grid-cols-3">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="exp" className={cn(!webGpuReady && webGpuChecked && 'text-muted-foreground/60')}>Experimental GPU</Label>
                <Switch id="exp" disabled={!webGpuReady && webGpuChecked} checked={experimental && webGpuReady} onCheckedChange={(v) => { setExperimental(v); log('toggle_experimental', { value: v }) }} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="cmp">A/B Compare</Label>
                <Switch id="cmp" checked={compare} onCheckedChange={(v) => { setCompare(v); log('toggle_compare', { value: v }) }} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="invert">Invert Density</Label>
                <Switch id="invert" checked={invert} onCheckedChange={setInvert} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="dither">HQ Dither (Standard)</Label>
                <Switch id="dither" checked={dither} onCheckedChange={setDither} />
              </div>
              <p className="text-xs text-muted-foreground">
                {!webGpuChecked ? 'Probing GPU adapter...' : webGpuReady ? 'High-performance GPU adapter ready. Image is pre-scaled to a monospace-friendly grid; one compute pass, one readback.' : 'No WebGPU adapter on this device. Standard worker mode still works.'}
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Detail</span>
                  <Badge variant="outline">{detailScale.toFixed(2)}x</Badge>
                </div>
                <Slider min={0.6} max={1.8} step={0.02} value={[detailScale]} onValueChange={(v) => setDetailScale(v[0] ?? 1)} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Char Aspect</span>
                  <Badge variant="outline">{charAspect.toFixed(2)}</Badge>
                </div>
                <Slider min={0.32} max={0.78} step={0.01} value={[charAspect]} onValueChange={(v) => setCharAspect(v[0] ?? 0.5)} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Contrast</span>
                  <Badge variant="outline">{contrast.toFixed(2)}x</Badge>
                </div>
                <Slider min={0.55} max={1.85} step={0.01} value={[contrast]} onValueChange={(v) => setContrast(v[0] ?? 1)} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Brightness</span>
                  <Badge variant="outline">{brightness >= 0 ? `+${brightness.toFixed(2)}` : brightness.toFixed(2)}</Badge>
                </div>
                <Slider min={-0.32} max={0.32} step={0.01} value={[brightness]} onValueChange={(v) => setBrightness(v[0] ?? 0)} />
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Alpha Threshold</span>
                  <Badge variant="outline">{alphaThreshold.toFixed(2)}</Badge>
                </div>
                <Slider min={0} max={0.3} step={0.01} value={[alphaThreshold]} onValueChange={(v) => setAlphaThreshold(v[0] ?? 0.08)} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Edge Boost (Experimental)</span>
                  <Badge variant="outline">{edgeBoost.toFixed(2)}x</Badge>
                </div>
                <Slider min={0.6} max={3.0} step={0.05} value={[edgeBoost]} onValueChange={(v) => setEdgeBoost(v[0] ?? 1)} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Edge Threshold (Experimental)</span>
                  <Badge variant="outline">{edgeThreshold.toFixed(2)}</Badge>
                </div>
                <Slider min={0.05} max={0.6} step={0.01} value={[edgeThreshold]} onValueChange={(v) => setEdgeThreshold(v[0] ?? 0.18)} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Max Side (Experimental)</span>
                  <Badge variant="outline">{maxSide}px {maxSide >= 7680 ? '· 8K' : maxSide >= 3840 ? '· 4K' : ''}</Badge>
                </div>
                <Slider min={256} max={8192} step={128} value={[maxSide]} onValueChange={(v) => setMaxSide(v[0] ?? 1024)} />
                {maxSide > 4096 && <p className="text-[11px] text-muted-foreground">Above 4K the preview canvas is downscaled to stay within browser limits — the downloaded TXT keeps full {maxSide}px resolution.</p>}
              </div>
              <p className="text-xs font-medium">Charset Preset (Standard)</p>
              <div className="grid grid-cols-1 gap-2">
                {(Object.keys(CHARSET_PRESETS) as CharsetPresetKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCharsetPreset(key)}
                    className={cn(
                      'rounded-lg border px-3 py-2 text-left text-xs transition-colors',
                      charsetPreset === key
                        ? 'border-primary bg-primary/6'
                        : 'border-border/70 bg-background hover:border-primary/30 hover:bg-muted/40',
                    )}
                  >
                    <p className="font-medium capitalize">{key}</p>
                    <p className="text-muted-foreground truncate">{CHARSET_PRESETS[key]}</p>
                  </button>
                ))}
              </div>
              <div className="space-y-2 text-xs text-muted-foreground">
                <p>Standard grid width: {targetWidth} chars</p>
                {experimentalGrid && <p>Experimental grid: {experimentalGrid.width}×{experimentalGrid.height} ({(experimentalGrid.width * experimentalGrid.height).toLocaleString()} glyphs)</p>}
                <p>Primary: {experimentalActive ? 'Experimental GPU' : 'Standard 4K Worker'}</p>
              </div>
            </div>
          </div>

          {(processing || progress > 0) && (
            <div className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {error && <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</div>}

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={download} disabled={!currentText || processing}>
              <Download className="mr-2 h-4 w-4" />
              Download TXT
            </Button>
            {runtimeMs !== null && <Badge variant="secondary">{runtimeMs} ms</Badge>}
            {dims && <Badge variant="outline">src {dims.width}x{dims.height}</Badge>}
            {current && <Badge variant="outline">grid {current.width}x{current.height}</Badge>}
            {glyphCount > 0 && <Badge variant="outline">{glyphCount} glyphs</Badge>}
            {current && <Badge variant="outline">engine {current.engine}</Badge>}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader className="pb-3"><CardTitle className="text-base">Source</CardTitle></CardHeader>
          <CardContent>
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-border/60" style={checkerStyle}>
              {preview ? <img src={preview} alt="Uploaded source image for ASCII conversion" className="h-full w-full object-contain" /> : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Upload a PNG or JPG image</div>}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">Primary Output</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => copy(currentText, 'main')}
                disabled={!currentText || processing}
                aria-label="Copy primary ASCII output"
              >
                {copiedTarget === 'main' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex h-[30rem] items-center justify-center overflow-hidden rounded-lg border border-border/60 p-3" style={checkerStyle}>
              {current ? <canvas ref={primaryCanvasRef} className="max-h-full max-w-full h-auto w-auto select-none" /> : <div className="text-sm text-slate-700/80">Primary ASCII canvas will appear here</div>}
            </div>
          </CardContent>
        </Card>
      </div>

      {compare && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">A: Standard 4K Worker</CardTitle>
                <div className="flex items-center gap-2">
                  {standardOut && <Badge variant="outline">{standardOut.runtimeMs} ms</Badge>}
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => copy(standardOut?.text ?? '', 'standard')}
                    disabled={!standardOut?.text || processing}
                    aria-label="Copy standard ASCII output"
                  >
                    {copiedTarget === 'standard' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex h-[26rem] items-center justify-center overflow-hidden rounded-lg border border-border/60 p-3" style={checkerStyle}>
                {standardOut ? <canvas ref={standardCanvasRef} className="max-h-full max-w-full h-auto w-auto select-none" /> : <div className="text-sm text-slate-700/80">Standard output pending...</div>}
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">B: Experimental</CardTitle>
                <div className="flex items-center gap-2">
                  {experimentalOut && <Badge variant="outline">{experimentalOut.engine}</Badge>}
                  {experimentalOut && <Badge variant="outline">{experimentalOut.runtimeMs} ms</Badge>}
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => copy(experimentalOut?.text ?? '', 'experimental')}
                    disabled={!experimentalOut?.text || processing}
                    aria-label="Copy experimental ASCII output"
                  >
                    {copiedTarget === 'experimental' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex h-[26rem] items-center justify-center overflow-hidden rounded-lg border border-border/60 p-3" style={checkerStyle}>
                {experimentalOut ? <canvas ref={experimentalCanvasRef} className="max-h-full max-w-full h-auto w-auto select-none" /> : <div className="text-sm text-slate-700/80">Experimental output pending...</div>}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
