import type { EnhanceOptions, EnhanceResult, ProgressCallback } from './types'

type TransformersModule = typeof import('@huggingface/transformers')
type ImageToImagePipeline = import('@huggingface/transformers').ImageToImagePipelineType
type RawImage = import('@huggingface/transformers').RawImage

type AiBackend = 'webgpu' | 'wasm'
type PipelineLoader = (
  task: 'image-to-image',
  model: string,
  options: {
    device: AiBackend
    dtype: 'q4f16' | 'q8'
    progress_callback: ReturnType<typeof createLoaderProgressReporter>
  },
) => Promise<ImageToImagePipeline>

type LoaderProgress =
  | { status: 'initiate' | 'download' | 'done'; file?: string }
  | { status: 'progress'; progress?: number; file?: string }
  | { status: 'ready' }

const AI_MODEL_ID = 'Xenova/swin2SR-realworld-sr-x4-64-bsrgan-psnr'
const MODEL_SCALE = 4
const TILE_CORE_SIZE = 192
const TILE_CONTEXT = 24

let transformersModulePromise: Promise<TransformersModule> | null = null
const pipelineCache = new Map<AiBackend, Promise<ImageToImagePipeline>>()

interface TilePlan {
  coreLeft: number
  coreTop: number
  coreWidth: number
  coreHeight: number
  cropLeft: number
  cropTop: number
  cropWidth: number
  cropHeight: number
  innerLeft: number
  innerTop: number
}

function hasBrowserWebGpu(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

function updateProgress(callback: ProgressCallback | undefined, percent: number, label: string) {
  callback?.({ percent, label })
}

function createLoaderProgressReporter(callback: ProgressCallback | undefined) {
  return (info: LoaderProgress) => {
    if (!callback) return

    if (info.status === 'ready') {
      updateProgress(callback, 30, 'AI model ready')
      return
    }

    if (info.status === 'progress' && typeof info.progress === 'number') {
      const bounded = Math.max(0, Math.min(100, info.progress))
      updateProgress(callback, 6 + Math.round(bounded * 0.22), `Downloading model${info.file ? `: ${info.file}` : ''}`)
      return
    }

    const label = info.status === 'done'
      ? `Cached ${info.file ?? 'model asset'}`
      : `Preparing ${info.file ?? 'AI model'}`
    updateProgress(callback, info.status === 'done' ? 28 : 8, label)
  }
}

async function getTransformersModule(): Promise<TransformersModule> {
  if (!transformersModulePromise) {
    transformersModulePromise = import('@huggingface/transformers').then((mod) => {
      mod.env.allowRemoteModels = true
      mod.env.allowLocalModels = false
      if (mod.env.backends.onnx.wasm) {
        mod.env.backends.onnx.wasm.proxy = false
      }
      if (mod.env.backends.onnx.webgpu) {
        mod.env.backends.onnx.webgpu.powerPreference = 'high-performance'
      }
      return mod
    })
  }

  return transformersModulePromise
}

async function loadPipeline(backend: AiBackend, callback?: ProgressCallback): Promise<ImageToImagePipeline> {
  let cached = pipelineCache.get(backend)
  if (!cached) {
    cached = (async () => {
      const transformers = await getTransformersModule()
      const loadPipelineForImage = transformers.pipeline as PipelineLoader
      return loadPipelineForImage('image-to-image', AI_MODEL_ID, {
        device: backend,
        dtype: backend === 'webgpu' ? 'q4f16' : 'q8',
        progress_callback: createLoaderProgressReporter(callback),
      })
    })()
    pipelineCache.set(backend, cached)
  }

  try {
    return await cached
  } catch (error) {
    pipelineCache.delete(backend)
    throw error
  }
}

async function getPipelineWithFallback(callback?: ProgressCallback): Promise<{ pipeline: ImageToImagePipeline; backend: AiBackend }> {
  if (hasBrowserWebGpu()) {
    try {
      return {
        pipeline: await loadPipeline('webgpu', callback),
        backend: 'webgpu',
      }
    } catch {
      updateProgress(callback, 8, 'WebGPU model unavailable, trying WASM fallback')
    }
  }

  return {
    pipeline: await loadPipeline('wasm', callback),
    backend: 'wasm',
  }
}

function buildTilePlans(width: number, height: number): TilePlan[] {
  const tiles: TilePlan[] = []

  for (let top = 0; top < height; top += TILE_CORE_SIZE) {
    const coreHeight = Math.min(TILE_CORE_SIZE, height - top)

    for (let left = 0; left < width; left += TILE_CORE_SIZE) {
      const coreWidth = Math.min(TILE_CORE_SIZE, width - left)
      const cropLeft = Math.max(0, left - TILE_CONTEXT)
      const cropTop = Math.max(0, top - TILE_CONTEXT)
      const cropRight = Math.min(width, left + coreWidth + TILE_CONTEXT)
      const cropBottom = Math.min(height, top + coreHeight + TILE_CONTEXT)

      tiles.push({
        coreLeft: left,
        coreTop: top,
        coreWidth,
        coreHeight,
        cropLeft,
        cropTop,
        cropWidth: cropRight - cropLeft,
        cropHeight: cropBottom - cropTop,
        innerLeft: left - cropLeft,
        innerTop: top - cropTop,
      })
    }
  }

  return tiles
}

async function rawImageFromTile(transformers: TransformersModule, sourceCanvas: HTMLCanvasElement, tile: TilePlan): Promise<RawImage> {
  const tileCanvas = createCanvas(tile.cropWidth, tile.cropHeight)
  const context = tileCanvas.getContext('2d')

  if (!context) {
    throw new Error('Failed to create tile canvas.')
  }

  context.drawImage(
    sourceCanvas,
    tile.cropLeft,
    tile.cropTop,
    tile.cropWidth,
    tile.cropHeight,
    0,
    0,
    tile.cropWidth,
    tile.cropHeight,
  )

  return transformers.RawImage.fromCanvas(tileCanvas)
}

async function encodeCanvas(canvas: HTMLCanvasElement, options: EnhanceOptions): Promise<Blob> {
  const targetCanvas = options.format === 'jpeg'
    ? (() => {
        const flattened = createCanvas(canvas.width, canvas.height)
        const context = flattened.getContext('2d')
        if (!context) {
          throw new Error('Failed to flatten output canvas.')
        }
        context.fillStyle = '#ffffff'
        context.fillRect(0, 0, flattened.width, flattened.height)
        context.drawImage(canvas, 0, 0)
        return flattened
      })()
    : canvas

  return new Promise<Blob>((resolve, reject) => {
    targetCanvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Encoding AI output failed.'))),
      `image/${options.format}`,
      options.format === 'jpeg' ? options.quality : undefined,
    )
  })
}

export async function enhanceImageWithAI(
  file: File,
  options: EnhanceOptions,
  onProgress?: ProgressCallback,
): Promise<EnhanceResult> {
  if (options.scale === 1) {
    throw new Error('AI Upscale requires 2x or 4x output.')
  }

  const start = performance.now()
  updateProgress(onProgress, 2, 'Preparing AI upscaler')

  const [{ pipeline, backend }, transformers] = await Promise.all([
    getPipelineWithFallback(onProgress),
    getTransformersModule(),
  ])

  updateProgress(onProgress, 32, 'Reading source image')

  const source = await transformers.RawImage.read(file)
  const sourceCanvas = source.toCanvas() as HTMLCanvasElement
  const outputCanvas = createCanvas(source.width * options.scale, source.height * options.scale)
  const outputContext = outputCanvas.getContext('2d')

  if (!outputContext) {
    throw new Error('Failed to initialize output canvas.')
  }

  outputContext.imageSmoothingEnabled = true
  outputContext.imageSmoothingQuality = 'high'

  const tiles = buildTilePlans(source.width, source.height)
  const totalTiles = tiles.length
  const tiled = totalTiles > 1

  updateProgress(onProgress, 36, tiled ? `Running tiled AI upscale (${totalTiles} tiles)` : 'Running AI upscale')

  for (let index = 0; index < totalTiles; index += 1) {
    const tile = tiles[index]
    const rawTile = await rawImageFromTile(transformers, sourceCanvas, tile)
    const enhanced = await pipeline(rawTile)
    const enhancedTile = Array.isArray(enhanced) ? enhanced[0] : enhanced
    const enhancedCanvas = enhancedTile.toCanvas() as HTMLCanvasElement

    const srcX = tile.innerLeft * MODEL_SCALE
    const srcY = tile.innerTop * MODEL_SCALE
    const srcW = tile.coreWidth * MODEL_SCALE
    const srcH = tile.coreHeight * MODEL_SCALE
    const dstX = tile.coreLeft * options.scale
    const dstY = tile.coreTop * options.scale
    const dstW = tile.coreWidth * options.scale
    const dstH = tile.coreHeight * options.scale

    outputContext.drawImage(
      enhancedCanvas,
      srcX,
      srcY,
      srcW,
      srcH,
      dstX,
      dstY,
      dstW,
      dstH,
    )

    const tileProgress = 36 + Math.round(((index + 1) / totalTiles) * 56)
    updateProgress(
      onProgress,
      tileProgress,
      tiled ? `AI upscale tile ${index + 1}/${totalTiles}` : 'Finishing AI upscale',
    )
  }

  updateProgress(onProgress, 94, 'Encoding output')

  const blob = await encodeCanvas(outputCanvas, options)

  updateProgress(onProgress, 100, 'Done')

  return {
    blob,
    width: outputCanvas.width,
    height: outputCanvas.height,
    engine: backend,
    elapsedMs: Math.round(performance.now() - start),
    modeUsed: 'ai',
    tiled,
  }
}
