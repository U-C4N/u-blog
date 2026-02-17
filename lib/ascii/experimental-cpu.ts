import type { AsciiConvertOptions, AsciiConvertResult } from './types'

interface ExperimentalProgress {
  percent: number
  label: string
}

interface ExperimentalCallbacks {
  onProgress?: (progress: ExperimentalProgress) => void
  shouldAbort?: () => boolean
}

const TONE_RAMP = ' .,:;irsXA253hMHGS#9B&@'
const HORIZONTAL_RAMP = ' ._-~=+#'
const VERTICAL_RAMP = " .'|!I#"
const DIAGONAL_POS_RAMP = ' ./xX#'
const DIAGONAL_NEG_RAMP = ' .\\xX#'

function clamp01(value: number) {
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

function safeContrast(value: number | undefined) {
  if (!Number.isFinite(value)) return 1
  return Math.max(0.4, Math.min(2.2, Number(value)))
}

function safeBrightness(value: number | undefined) {
  if (!Number.isFinite(value)) return 0
  return Math.max(-0.5, Math.min(0.5, Number(value)))
}

function safeEdgeBoost(value: number | undefined) {
  if (!Number.isFinite(value)) return 1
  return Math.max(0.5, Math.min(2.5, Number(value)))
}

function applyToneAdjust(luminance: number, contrast: number, brightness: number) {
  return clamp01(((luminance - 0.5) * contrast) + 0.5 + brightness)
}

function throwIfCancelled(shouldAbort?: () => boolean) {
  if (shouldAbort?.()) throw new Error('JOB_CANCELLED')
}

function emitProgress(callbacks: ExperimentalCallbacks, percent: number, label: string) {
  callbacks.onProgress?.({
    percent: Math.max(0, Math.min(100, Math.round(percent))),
    label,
  })
}

function srgbToLinear(channel: number) {
  const normalized = channel / 255
  if (normalized <= 0.04045) return normalized / 12.92
  return ((normalized + 0.055) / 1.055) ** 2.4
}

function hashNoise(x: number, y: number) {
  const seed = Math.sin((x * 127.1) + (y * 311.7)) * 43758.5453
  return seed - Math.floor(seed)
}

function pickToneChar(luminance: number, invert: boolean) {
  const normalized = invert ? luminance : (1 - luminance)
  const index = Math.max(0, Math.min(TONE_RAMP.length - 1, Math.round(normalized * (TONE_RAMP.length - 1))))
  return TONE_RAMP[index]
}

function pickEdgeChar(gx: number, gy: number, edgeStrength: number) {
  const absX = Math.abs(gx)
  const absY = Math.abs(gy)
  let bank = DIAGONAL_POS_RAMP

  if (absX > absY * 1.35) {
    bank = VERTICAL_RAMP
  } else if (absY > absX * 1.35) {
    bank = HORIZONTAL_RAMP
  } else {
    bank = gx * gy >= 0 ? DIAGONAL_POS_RAMP : DIAGONAL_NEG_RAMP
  }

  const index = Math.max(0, Math.min(bank.length - 1, Math.round(edgeStrength * (bank.length - 1))))
  return bank[index]
}

function computeTargetSize(bitmap: ImageBitmap, options: AsciiConvertOptions) {
  const widthRaw = Number.isFinite(options.outputWidth) ? Math.round(options.outputWidth) : 240
  const width = Math.max(24, Math.min(1600, bitmap.width, widthRaw))
  const safeAspect = Number.isFinite(options.charAspect) && options.charAspect > 0
    ? Math.max(0.2, Math.min(1, options.charAspect))
    : 0.5
  const height = Math.max(1, Math.round((bitmap.height / bitmap.width) * width * safeAspect))
  return { width, height }
}

async function downscaleBitmapIfNeeded(bitmap: ImageBitmap, maxInputDimension: number) {
  if (!Number.isFinite(maxInputDimension) || maxInputDimension <= 0) return bitmap

  const largest = Math.max(bitmap.width, bitmap.height)
  if (largest <= maxInputDimension) return bitmap

  const ratio = maxInputDimension / largest
  const width = Math.max(1, Math.round(bitmap.width * ratio))
  const height = Math.max(1, Math.round(bitmap.height * ratio))
  const canvas = new OffscreenCanvas(width, height)
  const context = canvas.getContext('2d')
  if (!context) return bitmap

  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(bitmap, 0, 0, width, height)
  return createImageBitmap(canvas)
}

function waitForNextTick() {
  return new Promise<void>((resolve) => {
    setTimeout(() => resolve(), 0)
  })
}

export async function convertToAsciiExperimentalCpu(
  file: File,
  options: AsciiConvertOptions,
  callbacks: ExperimentalCallbacks = {},
): Promise<AsciiConvertResult> {
  const startedAt = performance.now()
  let sourceBitmap: ImageBitmap | null = null
  let bitmap: ImageBitmap | null = null

  try {
    emitProgress(callbacks, 3, 'Starting experimental CPU engine')
    throwIfCancelled(callbacks.shouldAbort)

    sourceBitmap = await createImageBitmap(file)
    throwIfCancelled(callbacks.shouldAbort)

    bitmap = await downscaleBitmapIfNeeded(sourceBitmap, options.maxInputDimension)
    if (bitmap !== sourceBitmap) {
      sourceBitmap.close()
      sourceBitmap = null
    }

    const { width, height } = computeTargetSize(bitmap, options)
    emitProgress(callbacks, 10, 'Preparing source sampling')
    throwIfCancelled(callbacks.shouldAbort)

    const canvas = new OffscreenCanvas(width, height)
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) {
      throw new Error('Experimental CPU engine failed to get canvas context.')
    }

    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(bitmap, 0, 0, width, height)
    const imageData = context.getImageData(0, 0, width, height).data

    const alphaThreshold = Number.isFinite(options.alphaThreshold) ? Math.max(0, Math.min(1, options.alphaThreshold)) : 0.08
    const contrast = safeContrast(options.contrast)
    const brightness = safeBrightness(options.brightness)
    const edgeBoost = safeEdgeBoost(options.edgeBoost)
    const luminance = new Float32Array(width * height)
    const opaqueMask = new Uint8Array(width * height)

    const probeStride = Math.max(1, Math.floor(height / 20))
    for (let y = 0; y < height; y += 1) {
      const rowOffset = y * width
      for (let x = 0; x < width; x += 1) {
        const index = rowOffset + x
        const offset = index * 4
        const r = imageData[offset]
        const g = imageData[offset + 1]
        const b = imageData[offset + 2]
        const alpha = imageData[offset + 3] / 255

        if (alpha <= alphaThreshold) {
          luminance[index] = 1
          opaqueMask[index] = 0
          continue
        }

        const base = (0.2126 * srgbToLinear(r)) + (0.7152 * srgbToLinear(g)) + (0.0722 * srgbToLinear(b))
        const composited = (base * alpha) + (1 - alpha)
        luminance[index] = applyToneAdjust(composited, contrast, brightness)
        opaqueMask[index] = 1
      }

      if (y % probeStride === 0 || y === height - 1) {
        const ratio = (y + 1) / height
        emitProgress(callbacks, 10 + (ratio * 30), 'Extracting luminance field')
        throwIfCancelled(callbacks.shouldAbort)
      }
    }

    const gradientsX = new Float32Array(width * height)
    const gradientsY = new Float32Array(width * height)
    const sobelStride = Math.max(1, Math.floor(height / 18))

    const sample = (sx: number, sy: number) => {
      const cx = Math.max(0, Math.min(width - 1, sx))
      const cy = Math.max(0, Math.min(height - 1, sy))
      return luminance[(cy * width) + cx]
    }

    for (let y = 0; y < height; y += 1) {
      const rowOffset = y * width
      for (let x = 0; x < width; x += 1) {
        const index = rowOffset + x
        if (opaqueMask[index] === 0) continue

        const p00 = sample(x - 1, y - 1)
        const p01 = sample(x, y - 1)
        const p02 = sample(x + 1, y - 1)
        const p10 = sample(x - 1, y)
        const p12 = sample(x + 1, y)
        const p20 = sample(x - 1, y + 1)
        const p21 = sample(x, y + 1)
        const p22 = sample(x + 1, y + 1)

        const gx = (-p00 + p02) + (-2 * p10 + 2 * p12) + (-p20 + p22)
        const gy = (-p00 - (2 * p01) - p02) + (p20 + (2 * p21) + p22)
        gradientsX[index] = gx
        gradientsY[index] = gy
      }

      if (y % sobelStride === 0 || y === height - 1) {
        const ratio = (y + 1) / height
        emitProgress(callbacks, 42 + (ratio * 26), 'Computing edge orientation')
        throwIfCancelled(callbacks.shouldAbort)
      }
    }

    const lines = new Array<string>(height)
    const renderStride = Math.max(1, Math.floor(height / 16))
    for (let y = 0; y < height; y += 1) {
      const rowOffset = y * width
      let line = ''

      for (let x = 0; x < width; x += 1) {
        const index = rowOffset + x
        if (opaqueMask[index] === 0) {
          line += ' '
          continue
        }

        const gx = gradientsX[index]
        const gy = gradientsY[index]
        const edgeStrength = Math.min(1, Math.hypot(gx, gy) * 0.95 * edgeBoost)
        const noise = (hashNoise(x, y) - 0.5) * 0.05
        const contrastBoost = (edgeStrength * 0.24 * edgeBoost) - 0.08
        const corrected = clamp01(luminance[index] + noise + contrastBoost)
        const toneChar = pickToneChar(corrected, options.invert)

        if (edgeStrength > (0.22 / Math.max(0.75, edgeBoost))) {
          const edgeChar = pickEdgeChar(gx, gy, Math.min(1, 0.26 + (edgeStrength * 0.9)))
          line += edgeStrength > 0.36 ? edgeChar : toneChar
        } else {
          line += toneChar
        }
      }

      lines[y] = line

      if (y % renderStride === 0 || y === height - 1) {
        const ratio = (y + 1) / height
        emitProgress(callbacks, 70 + (ratio * 30), 'Synthesizing glyph field')
        throwIfCancelled(callbacks.shouldAbort)
      }

      if (y % 24 === 0) {
        await waitForNextTick()
      }
    }

    return {
      text: lines.join('\n'),
      width,
      height,
      stage: 'final',
      elapsedMs: Math.round(performance.now() - startedAt),
    }
  } finally {
    bitmap?.close()
    sourceBitmap?.close()
  }
}
