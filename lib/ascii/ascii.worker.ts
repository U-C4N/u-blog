/// <reference lib="webworker" />

import { CANCELLED_ERROR, convertBitmapToAscii } from './convert'
import type { AsciiConvertOptions } from './types'
import type {
  AsciiWorkerConvertRequest,
  AsciiWorkerProgress,
  AsciiWorkerRequest,
  AsciiWorkerResponse,
} from './worker-protocol'

const globalScope = self as unknown as DedicatedWorkerGlobalScope
const cancelledJobs = new Set<string>()

function postMessage(message: AsciiWorkerResponse) {
  globalScope.postMessage(message)
}

function mapStageProgress(stagePercent: number, stage: 'draft' | 'final') {
  const normalized = Math.max(0, Math.min(100, Math.round(stagePercent)))
  if (stage === 'draft') {
    return Math.max(1, Math.min(55, Math.round((normalized / 100) * 55)))
  }
  return Math.max(55, Math.min(100, 55 + Math.round((normalized / 100) * 45)))
}

function emitProgress(id: string, stage: 'draft' | 'final', stagePercent: number) {
  const payload: AsciiWorkerProgress = {
    type: 'progress',
    id,
    stage,
    stagePercent: Math.max(0, Math.min(100, Math.round(stagePercent))),
    percent: mapStageProgress(stagePercent, stage),
  }
  postMessage(payload)
}

function isCancelled(id: string) {
  return cancelledJobs.has(id)
}

async function downscaleIfNeeded(bitmap: ImageBitmap, maxInputDimension: number) {
  if (!Number.isFinite(maxInputDimension) || maxInputDimension <= 0) return bitmap

  const largestDimension = Math.max(bitmap.width, bitmap.height)
  if (largestDimension <= maxInputDimension) return bitmap

  const ratio = maxInputDimension / largestDimension
  const width = Math.max(1, Math.round(bitmap.width * ratio))
  const height = Math.max(1, Math.round(bitmap.height * ratio))

  const canvas = new OffscreenCanvas(width, height)
  const context = canvas.getContext('2d', { willReadFrequently: false })
  if (!context) {
    throw new Error('Failed to initialize worker canvas for downscale.')
  }

  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(bitmap, 0, 0, width, height)

  return createImageBitmap(canvas)
}

function toSafeFinalWidth(options: AsciiConvertOptions) {
  if (!Number.isFinite(options.outputWidth)) return 120
  return Math.max(48, Math.min(1600, Math.round(options.outputWidth)))
}

function toDraftWidth(finalWidth: number) {
  return Math.max(32, Math.min(finalWidth, Math.round(finalWidth * 0.55)))
}

async function handleConvert(message: AsciiWorkerConvertRequest) {
  const { id, file, options } = message
  let bitmap: ImageBitmap | null = null

  try {
    emitProgress(id, 'draft', 1)

    bitmap = await createImageBitmap(file)
    if (isCancelled(id)) throw new Error(CANCELLED_ERROR)

    const scaledBitmap = await downscaleIfNeeded(bitmap, options.maxInputDimension)
    if (scaledBitmap !== bitmap) {
      bitmap.close()
      bitmap = scaledBitmap
    }

    const finalWidth = toSafeFinalWidth(options)
    const draftWidth = toDraftWidth(finalWidth)

    const draftResult = convertBitmapToAscii(
      bitmap,
      options,
      {
        stage: 'draft',
        outputWidth: draftWidth,
        useGammaLuminance: false,
        useDithering: false,
      },
      {
        onProgress: (percent) => emitProgress(id, 'draft', percent),
        shouldAbort: () => isCancelled(id),
      },
    )

    if (isCancelled(id)) throw new Error(CANCELLED_ERROR)
    postMessage({ type: 'result', id, result: draftResult })

    const finalResult = convertBitmapToAscii(
      bitmap,
      options,
      {
        stage: 'final',
        outputWidth: finalWidth,
        useGammaLuminance: true,
        useDithering: options.dither,
      },
      {
        onProgress: (percent) => emitProgress(id, 'final', percent),
        shouldAbort: () => isCancelled(id),
      },
    )

    if (isCancelled(id)) throw new Error(CANCELLED_ERROR)
    postMessage({ type: 'result', id, result: finalResult })
    emitProgress(id, 'final', 100)
  } catch (reason) {
    const messageText = reason instanceof Error ? reason.message : 'ASCII conversion failed in worker.'

    if (messageText === CANCELLED_ERROR || isCancelled(id)) {
      postMessage({ type: 'cancelled', id })
    } else {
      postMessage({ type: 'error', id, message: messageText })
    }
  } finally {
    bitmap?.close()
    cancelledJobs.delete(id)
  }
}

globalScope.onmessage = (event: MessageEvent<AsciiWorkerRequest>) => {
  const message = event.data
  if (!message) return

  if (message.type === 'cancel') {
    cancelledJobs.add(message.id)
    return
  }

  void handleConvert(message)
}

export {}
