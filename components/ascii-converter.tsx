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
import { convertToAsciiExperimentalCpu } from '@/lib/ascii/experimental-cpu'
import { convertToAsciiWebGpu, hasUsableWebGpuAdapter, hasWebGpuSupport } from '@/lib/ascii/webgpu-experimental'
import { downloadTextFile } from '@/lib/file-utils'
import { Check, Copy, Cpu, Download, Sparkles, UploadCloud, Zap } from 'lucide-react'

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

type Engine = 'worker' | 'webgpu' | 'cpu'
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

function drawAscii(canvas: HTMLCanvasElement, text: string, grid: { width: number; height: number }, source: { width: number; height: number }) {
  const ctx = canvas.getContext('2d', { alpha: true })
  if (!ctx) return

  canvas.width = source.width
  canvas.height = source.height
  ctx.clearRect(0, 0, source.width, source.height)

  const lines = text.split('\n')
  const cellW = source.width / grid.width
  const cellH = source.height / grid.height
  const fontSize = 14
  const font = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'

  ctx.save()
  ctx.fillStyle = '#0f172a'
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  ctx.font = `${fontSize}px ${font}`
  const m = ctx.measureText('M').width || 8
  ctx.scale(cellW / m, cellH / fontSize)
  for (let y = 0; y < lines.length; y += 1) {
    if (lines[y].trim().length === 0) continue
    ctx.fillText(lines[y], 0, (y + 1) * fontSize)
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

  const runStandard = !experimental || compare
  const runExperimental = experimental || compare
  const experimentalActive = experimental && webGpuReady

  const targetWidth = useMemo(() => {
    const highDetail = runExperimental
    if (!dims) return highDetail ? 320 : 260
    const base = dims.width / (highDetail ? 2.8 : 3.4)
    const proposed = Math.round(base * detailScale)
    const maxWidth = highDetail ? 1600 : 1200
    return Math.max(24, Math.min(maxWidth, dims.width, Math.max(96, proposed)))
  }, [detailScale, dims, runExperimental])

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
      setLabel(`Experimental: ${stage}`)
    }

    if (webGpuReady) {
      try {
        const result = await convertToAsciiWebGpu(source, options, {
          onProgress: (p) => onProgress(p.percent, p.label),
          shouldAbort: () => activeRunRef.current !== rid,
        })
        return { text: result.text, width: result.width, height: result.height, runtimeMs: result.elapsedMs, engine: 'webgpu' as const }
      } catch (reason) {
        const message = reason instanceof Error ? reason.message : 'WebGPU failed'
        if (cancelledError(message)) throw reason
        log('experimental_webgpu_fallback_cpu', { runId: rid, message })
        setWebGpuReady(false)
        setWebGpuChecked(true)
      }
    }

    const cpu = await convertToAsciiExperimentalCpu(source, options, {
      onProgress: (p) => onProgress(p.percent, p.label),
      shouldAbort: () => activeRunRef.current !== rid,
    })
    return { text: cpu.text, width: cpu.width, height: cpu.height, runtimeMs: cpu.elapsedMs, engine: 'cpu' as const }
  }, [options, webGpuReady])

  const run = useCallback((source: File) => {
    if (runStandard && !hasWorker) {
      setError('Browser does not support Web Workers required for standard pass.')
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
  }, [cancelJob, compare, experimental, experimentalActive, experimentalPass, hasWorker, options.outputWidth, runExperimental, runStandard, workerPass])

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
    if (!primaryCanvasRef.current || !current || !dims) return
    drawAscii(primaryCanvasRef.current, current.text, { width: current.width, height: current.height }, dims)
  }, [current, dims])

  useEffect(() => {
    if (!compare || !dims) return
    if (standardCanvasRef.current && standardOut) {
      drawAscii(standardCanvasRef.current, standardOut.text, { width: standardOut.width, height: standardOut.height }, dims)
    }
    if (experimentalCanvasRef.current && experimentalOut) {
      drawAscii(experimentalCanvasRef.current, experimentalOut.text, { width: experimentalOut.width, height: experimentalOut.height }, dims)
    }
  }, [compare, dims, experimentalOut, standardOut])

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
                4K locked, exact canvas output. Experimental mode uses WebGPU when available, otherwise custom CPU fallback. A/B panel compares both.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={hasWorkerAcceleration ? 'default' : 'secondary'} className="gap-1">
                {hasWorkerAcceleration ? <Zap className="h-3 w-3" /> : <Cpu className="h-3 w-3" />}
                {hasWorkerAcceleration ? 'Worker Acceleration' : 'Worker Mode'}
              </Badge>
              <Badge variant="outline">4K Locked</Badge>
              <Badge variant="outline">Exact Canvas Fit</Badge>
              {compare && <Badge variant="outline">A/B Compare</Badge>}
              {experimentalActive && <Badge variant="default">Experimental WebGPU</Badge>}
              {experimental && !experimentalActive && <Badge variant="secondary">Experimental CPU Fallback</Badge>}
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
                <Label htmlFor="exp">Experimental Mode</Label>
                <Switch id="exp" checked={experimental} onCheckedChange={(v) => { setExperimental(v); log('toggle_experimental', { value: v }) }} />
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
                {!webGpuChecked ? 'Checking WebGPU adapter...' : webGpuReady ? 'WebGPU adapter ready.' : 'No WebGPU adapter; CPU experimental fallback active.'}
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
                <Slider min={0.6} max={1.9} step={0.02} value={[edgeBoost]} onValueChange={(v) => setEdgeBoost(v[0] ?? 1)} />
              </div>
              <p className="text-xs font-medium">Charset Preset</p>
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
                <p>Output grid width: {targetWidth} chars</p>
                <p>Input sampling ceiling: {MAX_INPUT_DIMENSION}px</p>
                <p>Primary: {experimental ? (experimentalActive ? 'Experimental WebGPU' : 'Experimental CPU') : 'Standard 4K Worker'}</p>
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
              {current && dims ? <canvas ref={primaryCanvasRef} className="max-h-full max-w-full h-auto w-auto select-none" /> : <div className="text-sm text-slate-700/80">Primary ASCII canvas will appear here</div>}
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
                {standardOut && dims ? <canvas ref={standardCanvasRef} className="max-h-full max-w-full h-auto w-auto select-none" /> : <div className="text-sm text-slate-700/80">Standard output pending...</div>}
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
                {experimentalOut && dims ? <canvas ref={experimentalCanvasRef} className="max-h-full max-w-full h-auto w-auto select-none" /> : <div className="text-sm text-slate-700/80">Experimental output pending...</div>}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
