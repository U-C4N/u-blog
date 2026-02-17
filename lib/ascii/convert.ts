import type { AsciiConvertOptions, AsciiConvertResult, AsciiJobStage } from './types'

export const CANCELLED_ERROR = 'JOB_CANCELLED'

interface ConvertStageSettings {
  stage: AsciiJobStage
  outputWidth: number
  useGammaLuminance: boolean
  useDithering: boolean
}

interface ConvertCallbacks {
  onProgress?: (percent: number) => void
  shouldAbort?: () => boolean
}

function clamp01(value: number) {
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

function sanitizeCharset(charset: string) {
  const raw = charset.trim().length > 0 ? charset : '@%#*+=-:. '
  return raw.length < 2 ? `${raw} ` : raw
}

function safeOutputWidth(value: number) {
  if (!Number.isFinite(value)) return 120
  return Math.max(24, Math.min(1800, Math.round(value)))
}

function safeAspect(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 0.5
  return Math.max(0.2, Math.min(1, value))
}

function safeAlphaThreshold(value: number) {
  if (!Number.isFinite(value)) return 0.08
  return Math.max(0, Math.min(1, value))
}

function safeContrast(value: number | undefined) {
  if (!Number.isFinite(value)) return 1
  return Math.max(0.4, Math.min(2.2, Number(value)))
}

function safeBrightness(value: number | undefined) {
  if (!Number.isFinite(value)) return 0
  return Math.max(-0.5, Math.min(0.5, Number(value)))
}

function applyToneAdjust(luminance: number, contrast: number, brightness: number) {
  return clamp01(((luminance - 0.5) * contrast) + 0.5 + brightness)
}

function srgbToLinear(channel: number) {
  const normalized = channel / 255
  if (normalized <= 0.04045) return normalized / 12.92
  return ((normalized + 0.055) / 1.055) ** 2.4
}

function throwIfCancelled(shouldAbort?: () => boolean) {
  if (shouldAbort?.()) {
    throw new Error(CANCELLED_ERROR)
  }
}

function withRowProgress(
  row: number,
  totalRows: number,
  startPercent: number,
  endPercent: number,
  onProgress?: (percent: number) => void,
) {
  if (!onProgress) return
  const ratio = (row + 1) / totalRows
  const next = Math.round(startPercent + ratio * (endPercent - startPercent))
  onProgress(next)
}

function createSampledImageData(bitmap: ImageBitmap, width: number, height: number) {
  const canvas = new OffscreenCanvas(width, height)
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) {
    throw new Error('Could not initialize canvas context for ASCII conversion.')
  }

  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(bitmap, 0, 0, width, height)
  return context.getImageData(0, 0, width, height)
}

function computeTargetSize(bitmap: ImageBitmap, requestedWidth: number, charAspect: number) {
  const width = Math.max(1, Math.min(safeOutputWidth(requestedWidth), bitmap.width))
  const height = Math.max(1, Math.round((bitmap.height / bitmap.width) * width * charAspect))
  return { width, height }
}

function extractLuminanceMap(
  imageData: ImageData,
  width: number,
  height: number,
  useGammaLuminance: boolean,
  alphaThreshold: number,
  contrast: number,
  brightness: number,
  onProgress?: (percent: number) => void,
  shouldAbort?: () => boolean,
) {
  const pixels = imageData.data
  const map = new Float32Array(width * height)
  const opaqueMask = new Uint8Array(width * height)
  const progressStep = Math.max(1, Math.floor(height / 24))

  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * width
    for (let x = 0; x < width; x += 1) {
      const index = rowOffset + x
      const pixelOffset = index * 4
      const r = pixels[pixelOffset]
      const g = pixels[pixelOffset + 1]
      const b = pixels[pixelOffset + 2]
      const alpha = pixels[pixelOffset + 3] / 255

      if (alpha <= alphaThreshold) {
        map[index] = 1
        opaqueMask[index] = 0
        continue
      }

      const baseLuminance = useGammaLuminance
        ? (0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b))
        : ((0.299 * r + 0.587 * g + 0.114 * b) / 255)

      // Composite semi-transparent edges on white to avoid dark halos.
      const composited = (baseLuminance * alpha) + (1 - alpha)
      map[index] = applyToneAdjust(composited, contrast, brightness)
      opaqueMask[index] = 1
    }

    if (y % progressStep === 0 || y === height - 1) {
      withRowProgress(y, height, 0, 40, onProgress)
      throwIfCancelled(shouldAbort)
    }
  }

  return { map, opaqueMask }
}

function mapLuminanceWithoutDither(
  luminance: Float32Array,
  opaqueMask: Uint8Array,
  width: number,
  height: number,
  charset: string,
  invert: boolean,
  onProgress?: (percent: number) => void,
  shouldAbort?: () => boolean,
) {
  const levels = charset.length - 1
  const lines = new Array<string>(height)
  const progressStep = Math.max(1, Math.floor(height / 24))

  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * width
    let line = ''
    for (let x = 0; x < width; x += 1) {
      const index = rowOffset + x
      if (opaqueMask[index] === 0) {
        line += ' '
        continue
      }

      let value = luminance[index]
      if (invert) value = 1 - value
      const charIndex = Math.max(0, Math.min(levels, Math.round(value * levels)))
      line += charset[charIndex]
    }
    lines[y] = line

    if (y % progressStep === 0 || y === height - 1) {
      withRowProgress(y, height, 40, 100, onProgress)
      throwIfCancelled(shouldAbort)
    }
  }

  return lines.join('\n')
}

function mapLuminanceWithDither(
  luminance: Float32Array,
  opaqueMask: Uint8Array,
  width: number,
  height: number,
  charset: string,
  invert: boolean,
  onProgress?: (percent: number) => void,
  shouldAbort?: () => boolean,
) {
  const levels = charset.length - 1
  const lines = new Array<string>(height)
  const progressStep = Math.max(1, Math.floor(height / 24))
  const work = new Float32Array(luminance)

  for (let i = 0; i < work.length; i += 1) {
    if (opaqueMask[i] === 0) {
      work[i] = 1
      continue
    }

    if (invert) {
      work[i] = 1 - work[i]
    }
  }

  for (let y = 0; y < height; y += 1) {
    let line = ''
    const rowOffset = y * width

    for (let x = 0; x < width; x += 1) {
      const index = rowOffset + x

      if (opaqueMask[index] === 0) {
        line += ' '
        continue
      }

      const oldValue = clamp01(work[index])
      const quantizedIndex = Math.max(0, Math.min(levels, Math.round(oldValue * levels)))
      const quantizedValue = quantizedIndex / levels
      const error = oldValue - quantizedValue

      line += charset[quantizedIndex]

      if (x + 1 < width && opaqueMask[index + 1] === 1) {
        work[index + 1] = clamp01(work[index + 1] + (error * 7) / 16)
      }
      if (y + 1 < height) {
        const nextRow = index + width
        if (x > 0 && opaqueMask[nextRow - 1] === 1) {
          work[nextRow - 1] = clamp01(work[nextRow - 1] + (error * 3) / 16)
        }
        if (opaqueMask[nextRow] === 1) {
          work[nextRow] = clamp01(work[nextRow] + (error * 5) / 16)
        }
        if (x + 1 < width && opaqueMask[nextRow + 1] === 1) {
          work[nextRow + 1] = clamp01(work[nextRow + 1] + error / 16)
        }
      }
    }

    lines[y] = line

    if (y % progressStep === 0 || y === height - 1) {
      withRowProgress(y, height, 40, 100, onProgress)
      throwIfCancelled(shouldAbort)
    }
  }

  return lines.join('\n')
}

export function convertBitmapToAscii(
  bitmap: ImageBitmap,
  options: AsciiConvertOptions,
  stageSettings: ConvertStageSettings,
  callbacks: ConvertCallbacks = {},
): AsciiConvertResult {
  const startedAt = performance.now()
  const charset = sanitizeCharset(options.charset)
  const charAspect = safeAspect(options.charAspect)
  const alphaThreshold = safeAlphaThreshold(options.alphaThreshold)
  const contrast = safeContrast(options.contrast)
  const brightness = safeBrightness(options.brightness)
  const { width, height } = computeTargetSize(bitmap, stageSettings.outputWidth, charAspect)

  throwIfCancelled(callbacks.shouldAbort)
  const imageData = createSampledImageData(bitmap, width, height)
  throwIfCancelled(callbacks.shouldAbort)

  const { map: luminance, opaqueMask } = extractLuminanceMap(
    imageData,
    width,
    height,
    stageSettings.useGammaLuminance,
    alphaThreshold,
    contrast,
    brightness,
    callbacks.onProgress,
    callbacks.shouldAbort,
  )

  const text = stageSettings.useDithering
    ? mapLuminanceWithDither(
      luminance,
      opaqueMask,
      width,
      height,
      charset,
      options.invert,
      callbacks.onProgress,
      callbacks.shouldAbort,
    )
    : mapLuminanceWithoutDither(
      luminance,
      opaqueMask,
      width,
      height,
      charset,
      options.invert,
      callbacks.onProgress,
      callbacks.shouldAbort,
    )

  return {
    text,
    width,
    height,
    stage: stageSettings.stage,
    elapsedMs: Math.round(performance.now() - startedAt),
  }
}
