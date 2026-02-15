'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { Cpu, Download, Loader2, Sparkles, UploadCloud, WandSparkles, Zap } from 'lucide-react'

type PresetKey = 'fast' | 'balanced' | 'quality'

const PRESETS: Array<{
  id: PresetKey
  title: string
  description: string
  model: 'isnet_quint8' | 'isnet_fp16' | 'isnet'
}> = [
  {
    id: 'fast',
    title: 'Fast',
    description: 'Small model, quickest output',
    model: 'isnet_quint8',
  },
  {
    id: 'balanced',
    title: 'Balanced',
    description: 'Best speed/quality ratio',
    model: 'isnet_fp16',
  },
  {
    id: 'quality',
    title: 'High Quality',
    description: 'Best edges, slower processing',
    model: 'isnet',
  },
]

type BackgroundRemovalModule = typeof import('@imgly/background-removal')

let modulePromise: Promise<BackgroundRemovalModule> | null = null

const checkerboardStyle = {
  backgroundColor: '#f8fafc',
  backgroundImage:
    'linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)',
  backgroundSize: '20px 20px',
  backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0',
} as const

function getBackgroundRemovalModule() {
  if (!modulePromise) {
    modulePromise = import('@imgly/background-removal')
  }
  return modulePromise
}

function friendlyProgressStep(step: string) {
  if (step.includes('fetch')) return 'Downloading model assets'
  if (step.includes('decode')) return 'Decoding image'
  if (step.includes('encode')) return 'Encoding transparent image'
  if (step.includes('segment') || step.includes('inference')) return 'Running segmentation'
  return 'Preparing runtime'
}

function formatRuntime(ms: number) {
  if (ms < 1000) return `${ms} ms`
  return `${(ms / 1000).toFixed(2)} s`
}

function safeBaseName(filename: string) {
  return filename.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9-_]+/g, '-')
}

export default function BackgroundRemover() {
  const [file, setFile] = useState<File | null>(null)
  const [sourcePreview, setSourcePreview] = useState<string | null>(null)
  const [resultBlob, setResultBlob] = useState<Blob | null>(null)
  const [resultPreview, setResultPreview] = useState<string | null>(null)
  const [preset, setPreset] = useState<PresetKey>('balanced')
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('Ready')
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isWarmingUp, setIsWarmingUp] = useState(false)
  const [runtimeMs, setRuntimeMs] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const progressRef = useRef<Record<string, number>>({})

  const hasWebGpu = useMemo(() => {
    if (typeof navigator === 'undefined') return false
    return 'gpu' in navigator
  }, [])

  const selectedPreset = useMemo(() => PRESETS.find((item) => item.id === preset) ?? PRESETS[1], [preset])
  const canRun = Boolean(file) && !isProcessing
  const canDownload = Boolean(resultBlob) && !isProcessing

  const clearResult = useCallback(() => {
    setResultBlob(null)
    setResultPreview((previous) => {
      if (previous) URL.revokeObjectURL(previous)
      return null
    })
  }, [])

  const onSelectFile = useCallback(
    (nextFile: File) => {
      if (!nextFile.type.startsWith('image/')) {
        setError('Please upload PNG, JPG, or WEBP image files only.')
        return
      }

      setError(null)
      setFile(nextFile)
      setRuntimeMs(null)
      setProgress(0)
      setProgressLabel('Image loaded')
      clearResult()
      setSourcePreview((previous) => {
        if (previous) URL.revokeObjectURL(previous)
        return URL.createObjectURL(nextFile)
      })
    },
    [clearResult],
  )

  const onUploadChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const uploaded = event.target.files?.[0]
      if (uploaded) onSelectFile(uploaded)
      event.currentTarget.value = ''
    },
    [onSelectFile],
  )

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      const dropped = event.dataTransfer.files?.[0]
      if (dropped) onSelectFile(dropped)
    },
    [onSelectFile],
  )

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }, [])

  const processImage = useCallback(async () => {
    if (!file || isProcessing) return

    setIsProcessing(true)
    setError(null)
    clearResult()
    setProgress(0)
    setProgressLabel('Starting model')
    setRuntimeMs(null)
    progressRef.current = {}

    const startedAt = performance.now()

    try {
      const imageModule = await getBackgroundRemovalModule()

      const result = await imageModule.removeBackground(file, {
        device: hasWebGpu ? 'gpu' : 'cpu',
        model: selectedPreset.model,
        proxyToWorker: true,
        output: {
          format: 'image/png',
          quality: 1,
        },
        progress: (step, current, total) => {
          progressRef.current[step] = total > 0 ? current / total : 0
          const ratios = Object.values(progressRef.current)
          const aggregate = ratios.length > 0 ? ratios.reduce((sum, value) => sum + value, 0) / ratios.length : 0
          setProgress(Math.min(99, Math.max(1, Math.round(aggregate * 100))))
          setProgressLabel(friendlyProgressStep(step))
        },
      })

      setResultBlob(result)
      setResultPreview((previous) => {
        if (previous) URL.revokeObjectURL(previous)
        return URL.createObjectURL(result)
      })
      setRuntimeMs(Math.round(performance.now() - startedAt))
      setProgress(100)
      setProgressLabel('Done')

      const g = (window as unknown as Record<string, unknown>).gtag as ((...args: unknown[]) => void) | undefined
      g?.('event', 'tool_action', {
        tool_name: 'background-remove',
        quality_preset: selectedPreset.id,
        execution: hasWebGpu ? 'gpu' : 'cpu',
      })
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Background removal failed. Try another image or preset.'
      setError(message)
      setProgressLabel('Failed')
    } finally {
      setIsProcessing(false)
    }
  }, [clearResult, file, hasWebGpu, isProcessing, selectedPreset.id, selectedPreset.model])

  const downloadResult = useCallback(() => {
    if (!resultBlob || !file) return

    const url = URL.createObjectURL(resultBlob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${safeBaseName(file.name)}-no-bg.png`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }, [file, resultBlob])

  useEffect(() => {
    let cancelled = false
    const warmupTimer = window.setTimeout(async () => {
      setIsWarmingUp(true)
      try {
        const imageModule = await getBackgroundRemovalModule()
        await imageModule.preload({
          device: hasWebGpu ? 'gpu' : 'cpu',
          model: 'isnet_fp16',
          proxyToWorker: true,
        })
      } catch {
        // Ignore preload errors and continue with on-demand loading.
      } finally {
        if (!cancelled) setIsWarmingUp(false)
      }
    }, 400)

    return () => {
      cancelled = true
      window.clearTimeout(warmupTimer)
    }
  }, [hasWebGpu])

  useEffect(() => {
    return () => {
      if (sourcePreview) URL.revokeObjectURL(sourcePreview)
      if (resultPreview) URL.revokeObjectURL(resultPreview)
    }
  }, [resultPreview, sourcePreview])

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden border-border/60">
        <CardHeader className="relative pb-4">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.20),transparent_50%),radial-gradient(circle_at_bottom_right,hsl(var(--accent)/0.18),transparent_60%)]" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <WandSparkles className="h-5 w-5" />
                AI Background Remover
              </CardTitle>
              <CardDescription className="mt-2 max-w-[60ch]">
                Upload an image, remove the background in-browser, and export a transparent PNG instantly.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={hasWebGpu ? 'default' : 'secondary'} className="gap-1">
                {hasWebGpu ? <Zap className="h-3 w-3" /> : <Cpu className="h-3 w-3" />}
                {hasWebGpu ? 'WebGPU' : 'CPU'}
              </Badge>
              <Badge variant="outline">{isWarmingUp ? 'Warming up model' : 'Ready'}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={onUploadChange}
          />

          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                fileInputRef.current?.click()
              }
            }}
            className={cn(
              'group relative rounded-xl border border-dashed border-border/80 p-6 transition-colors focus:outline-none',
              'bg-gradient-to-br from-muted/30 via-background to-muted/10 hover:border-primary/45 hover:from-muted/45',
            )}
          >
            <div className="flex flex-col items-center justify-center gap-3 text-center">
              <UploadCloud className="h-9 w-9 text-muted-foreground transition-colors group-hover:text-foreground" />
              <div>
                <p className="font-medium">Drop your image here or click to upload</p>
                <p className="text-sm text-muted-foreground">PNG, JPG, WEBP supported</p>
              </div>
              {file && (
                <Badge variant="outline" className="max-w-full truncate">
                  {file.name}
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Quality preset</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {PRESETS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPreset(item.id)}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-left transition-colors',
                    preset === item.id
                      ? 'border-primary bg-primary/6'
                      : 'border-border/70 bg-background hover:border-primary/30 hover:bg-muted/40',
                  )}
                >
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={processImage} disabled={!canRun} className="min-w-[180px]">
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Remove Background
                </>
              )}
            </Button>
            <Button onClick={downloadResult} variant="outline" disabled={!canDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download PNG
            </Button>
          </div>

          {(isProcessing || progress > 0) && (
            <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">{progressLabel}</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            First run downloads model files to browser cache. Later runs are much faster.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Source</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-border/60" style={checkerboardStyle}>
              {sourcePreview ? (
                <img src={sourcePreview} alt="Uploaded source image" className="h-full w-full object-contain" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Upload an image to preview</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">Transparent Output</CardTitle>
              {runtimeMs !== null && <Badge variant="outline">{formatRuntime(runtimeMs)}</Badge>}
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-border/60" style={checkerboardStyle}>
              {resultPreview ? (
                <img src={resultPreview} alt="Background removed output" className="h-full w-full object-contain" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Process image to generate transparent result
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
