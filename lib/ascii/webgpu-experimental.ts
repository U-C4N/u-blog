import type { AsciiConvertOptions, AsciiConvertResult } from './types'

interface ExperimentalProgress {
  percent: number
  label: string
}

interface ExperimentalCallbacks {
  onProgress?: (progress: ExperimentalProgress) => void
  shouldAbort?: () => boolean
}

function debugWebGpu(event: string, details?: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  const payload = { at: new Date().toISOString(), event, ...(details ?? {}) }
  const g = window as Window & { __asciiDebugLog?: Array<Record<string, unknown>> }
  if (!g.__asciiDebugLog) g.__asciiDebugLog = []
  g.__asciiDebugLog.push({ scope: 'webgpu', ...payload })
  if (g.__asciiDebugLog.length > 400) g.__asciiDebugLog.shift()
  console.log('[ascii-webgpu]', payload)
}

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
  if (shouldAbort?.()) {
    throw new Error('JOB_CANCELLED')
  }
}

function emitProgress(callbacks: ExperimentalCallbacks, percent: number, label: string) {
  callbacks.onProgress?.({ percent, label })
}

function hashNoise(x: number, y: number) {
  const seed = Math.sin((x * 127.1) + (y * 311.7)) * 43758.5453
  return seed - Math.floor(seed)
}

function pickToneChar(luminance: number, invert: boolean) {
  const TONE_RAMP = ' .,:;irsXA253hMHGS#9B&@'
  const normalized = invert ? luminance : (1 - luminance)
  const index = Math.max(0, Math.min(TONE_RAMP.length - 1, Math.round(normalized * (TONE_RAMP.length - 1))))
  return TONE_RAMP[index]
}

function pickEdgeChar(gx: number, gy: number, edgeStrength: number) {
  const HORIZONTAL_RAMP = ' ._-~=#'
  const VERTICAL_RAMP = " .'|!I#"
  const DIAGONAL_POS_RAMP = ' ./xX#'
  const DIAGONAL_NEG_RAMP = ' .\\xX#'

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
  const safeWidth = Number.isFinite(options.outputWidth) ? Math.round(options.outputWidth) : 220
  const width = Math.max(24, Math.min(safeWidth, bitmap.width))
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

function buildShaderCode() {
  return `
struct Params {
  srcWidth: f32,
  srcHeight: f32,
  gridWidth: f32,
  gridHeight: f32,
}

@group(0) @binding(0) var srcTexture: texture_2d<f32>;
@group(0) @binding(1) var srcSampler: sampler;
@group(0) @binding(2) var<uniform> params: Params;
@group(0) @binding(3) var<storage, read_write> outBuffer: array<vec4<f32>>;

fn luma(color: vec3<f32>) -> f32 {
  return dot(color, vec3<f32>(0.2126, 0.7152, 0.0722));
}

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let x = gid.x;
  let y = gid.y;
  let gw = u32(params.gridWidth);
  let gh = u32(params.gridHeight);
  if (x >= gw || y >= gh) {
    return;
  }

  let uv = vec2<f32>(
    (f32(x) + 0.5) / params.gridWidth,
    (f32(y) + 0.5) / params.gridHeight
  );

  let texel = vec2<f32>(1.0 / params.srcWidth, 1.0 / params.srcHeight);
  let cell = vec2<f32>(1.0 / params.gridWidth, 1.0 / params.gridHeight);

  let c0 = textureSampleLevel(srcTexture, srcSampler, uv, 0.0);
  let c1 = textureSampleLevel(srcTexture, srcSampler, uv + vec2<f32>(-cell.x * 0.26, 0.0), 0.0);
  let c2 = textureSampleLevel(srcTexture, srcSampler, uv + vec2<f32>(cell.x * 0.26, 0.0), 0.0);
  let c3 = textureSampleLevel(srcTexture, srcSampler, uv + vec2<f32>(0.0, -cell.y * 0.26), 0.0);
  let c4 = textureSampleLevel(srcTexture, srcSampler, uv + vec2<f32>(0.0, cell.y * 0.26), 0.0);
  let avg = (c0 + c1 + c2 + c3 + c4) / 5.0;

  let left = textureSampleLevel(srcTexture, srcSampler, uv - vec2<f32>(texel.x * 1.8, 0.0), 0.0);
  let right = textureSampleLevel(srcTexture, srcSampler, uv + vec2<f32>(texel.x * 1.8, 0.0), 0.0);
  let up = textureSampleLevel(srcTexture, srcSampler, uv - vec2<f32>(0.0, texel.y * 1.8), 0.0);
  let down = textureSampleLevel(srcTexture, srcSampler, uv + vec2<f32>(0.0, texel.y * 1.8), 0.0);

  let gx = luma(right.rgb) - luma(left.rgb);
  let gy = luma(down.rgb) - luma(up.rgb);

  let index = (y * gw) + x;
  outBuffer[index] = vec4<f32>(luma(avg.rgb), gx, gy, avg.a);
}
`
}

function getWebGpuApi() {
  const nav = navigator as Navigator & { gpu?: unknown }
  return nav.gpu ? nav.gpu as {
    requestAdapter: () => Promise<{
      requestDevice: () => Promise<unknown>
    } | null>
  } : null
}

let cachedAdapter:
  | {
    requestDevice: () => Promise<unknown>
  }
  | null
  | undefined
let adapterProbePromise:
  | Promise<{
    requestDevice: () => Promise<unknown>
  } | null>
  | null = null

async function requestAdapterCached() {
  if (cachedAdapter !== undefined) return cachedAdapter
  if (adapterProbePromise) return adapterProbePromise

  const gpu = getWebGpuApi()
  if (!gpu) {
    debugWebGpu('adapter_probe', { available: false, reason: 'gpu_api_missing' })
    cachedAdapter = null
    return null
  }

  debugWebGpu('adapter_probe_start')
  adapterProbePromise = gpu
    .requestAdapter()
    .then((adapter) => {
      cachedAdapter = adapter ?? null
      debugWebGpu('adapter_probe_result', { available: Boolean(cachedAdapter) })
      return cachedAdapter
    })
    .catch(() => {
      debugWebGpu('adapter_probe_error')
      cachedAdapter = null
      return null
    })
    .finally(() => {
      adapterProbePromise = null
    })

  return adapterProbePromise
}

export function hasWebGpuSupport() {
  return typeof navigator !== 'undefined' && Boolean(getWebGpuApi())
}

export async function hasUsableWebGpuAdapter() {
  if (typeof navigator === 'undefined') return false
  const adapter = await requestAdapterCached()
  return Boolean(adapter)
}

export async function convertToAsciiWebGpu(
  file: File,
  options: AsciiConvertOptions,
  callbacks: ExperimentalCallbacks = {},
): Promise<AsciiConvertResult> {
  const startedAt = performance.now()
  let sourceBitmap: ImageBitmap | null = null
  let bitmap: ImageBitmap | null = null

  try {
    debugWebGpu('conversion_start', { fileName: file.name, sizeBytes: file.size, outputWidth: options.outputWidth })
    emitProgress(callbacks, 4, 'Initializing WebGPU')
    throwIfCancelled(callbacks.shouldAbort)

    if (!getWebGpuApi()) {
      throw new Error('WebGPU is not available in this browser.')
    }

    const adapter = await requestAdapterCached()
    if (!adapter) {
      debugWebGpu('conversion_abort_no_adapter')
      throw new Error('No compatible WebGPU adapter found.')
    }

    const device = await (adapter as { requestDevice: () => Promise<unknown> }).requestDevice() as {
      createTexture: (...args: unknown[]) => unknown
      createBuffer: (...args: unknown[]) => unknown
      createSampler: (...args: unknown[]) => unknown
      createBindGroupLayout: (...args: unknown[]) => unknown
      createBindGroup: (...args: unknown[]) => unknown
      createShaderModule: (...args: unknown[]) => unknown
      createPipelineLayout: (...args: unknown[]) => unknown
      createComputePipeline: (...args: unknown[]) => unknown
      createCommandEncoder: (...args: unknown[]) => unknown
      queue: {
        copyExternalImageToTexture: (...args: unknown[]) => void
        writeBuffer: (...args: unknown[]) => void
        submit: (...args: unknown[]) => void
      }
      destroy?: () => void
    }

    emitProgress(callbacks, 12, 'Decoding source image')
    sourceBitmap = await createImageBitmap(file)
    throwIfCancelled(callbacks.shouldAbort)

    bitmap = await downscaleBitmapIfNeeded(sourceBitmap, options.maxInputDimension)
    if (bitmap !== sourceBitmap) {
      sourceBitmap.close()
      sourceBitmap = null
    }

    const { width: gridWidth, height: gridHeight } = computeTargetSize(bitmap, options)
    const textureUsage = (globalThis as unknown as { GPUTextureUsage: Record<string, number> }).GPUTextureUsage
    const bufferUsage = (globalThis as unknown as { GPUBufferUsage: Record<string, number> }).GPUBufferUsage
    const mapMode = (globalThis as unknown as { GPUMapMode: Record<string, number> }).GPUMapMode

    if (!textureUsage || !bufferUsage || !mapMode) {
      throw new Error('WebGPU constants are unavailable in this environment.')
    }

    const outputElementCount = gridWidth * gridHeight
    const outputBufferSize = outputElementCount * 4 * 4

    emitProgress(callbacks, 26, 'Uploading texture to GPU')
    throwIfCancelled(callbacks.shouldAbort)

    const texture = device.createTexture({
      size: { width: bitmap.width, height: bitmap.height },
      format: 'rgba8unorm',
      usage: textureUsage.TEXTURE_BINDING | textureUsage.COPY_DST,
    })

    device.queue.copyExternalImageToTexture(
      { source: bitmap },
      { texture: texture as object },
      { width: bitmap.width, height: bitmap.height },
    )

    const outputBuffer = device.createBuffer({
      size: outputBufferSize,
      usage: bufferUsage.STORAGE | bufferUsage.COPY_SRC,
    })

    const readBuffer = device.createBuffer({
      size: outputBufferSize,
      usage: bufferUsage.COPY_DST | bufferUsage.MAP_READ,
    })

    const uniformBuffer = device.createBuffer({
      size: 16,
      usage: bufferUsage.UNIFORM | bufferUsage.COPY_DST,
    })
    device.queue.writeBuffer(uniformBuffer as object, 0, new Float32Array([
      bitmap.width,
      bitmap.height,
      gridWidth,
      gridHeight,
    ]))

    const bindGroupLayout = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: 4, texture: { sampleType: 'float' } },
        { binding: 1, visibility: 4, sampler: { type: 'filtering' } },
        { binding: 2, visibility: 4, buffer: { type: 'uniform' } },
        { binding: 3, visibility: 4, buffer: { type: 'storage' } },
      ],
    })

    const sampler = device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
      addressModeU: 'clamp-to-edge',
      addressModeV: 'clamp-to-edge',
    })

    const bindGroup = device.createBindGroup({
      layout: bindGroupLayout as object,
      entries: [
        { binding: 0, resource: (texture as { createView: () => unknown }).createView() },
        { binding: 1, resource: sampler as object },
        { binding: 2, resource: { buffer: uniformBuffer as object } },
        { binding: 3, resource: { buffer: outputBuffer as object } },
      ],
    })

    const shaderModule = device.createShaderModule({ code: buildShaderCode() })
    const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout as object] })
    const pipeline = device.createComputePipeline({
      layout: pipelineLayout as object,
      compute: {
        module: shaderModule as object,
        entryPoint: 'main',
      },
    })

    emitProgress(callbacks, 44, 'Running edge-aware GPU synthesis')
    throwIfCancelled(callbacks.shouldAbort)

    const commandEncoder = device.createCommandEncoder()
    const computePass = (commandEncoder as { beginComputePass: () => unknown }).beginComputePass() as {
      setPipeline: (pipeline: object) => void
      setBindGroup: (index: number, bindGroup: object) => void
      dispatchWorkgroups: (x: number, y: number) => void
      end: () => void
    }

    computePass.setPipeline(pipeline as object)
    computePass.setBindGroup(0, bindGroup as object)
    computePass.dispatchWorkgroups(Math.ceil(gridWidth / 8), Math.ceil(gridHeight / 8))
    computePass.end()

    ;(commandEncoder as { copyBufferToBuffer: (...args: unknown[]) => void }).copyBufferToBuffer(
      outputBuffer as object,
      0,
      readBuffer as object,
      0,
      outputBufferSize,
    )

    device.queue.submit([((commandEncoder as { finish: () => unknown }).finish()) as object])
    emitProgress(callbacks, 68, 'Reading GPU buffer')
    throwIfCancelled(callbacks.shouldAbort)

    await (readBuffer as { mapAsync: (mode: number) => Promise<void> }).mapAsync(mapMode.READ)
    const mapped = (readBuffer as { getMappedRange: () => ArrayBuffer }).getMappedRange()
    const snapshot = mapped.slice(0)
    ;(readBuffer as { unmap: () => void }).unmap()

    emitProgress(callbacks, 82, 'Building ASCII glyph field')
    throwIfCancelled(callbacks.shouldAbort)

    const floats = new Float32Array(snapshot)
    const alphaThreshold = Number.isFinite(options.alphaThreshold) ? Math.max(0, Math.min(1, options.alphaThreshold)) : 0.08
    const contrast = safeContrast(options.contrast)
    const brightness = safeBrightness(options.brightness)
    const edgeBoost = safeEdgeBoost(options.edgeBoost)
    const lines = new Array<string>(gridHeight)

    for (let y = 0; y < gridHeight; y += 1) {
      let row = ''
      for (let x = 0; x < gridWidth; x += 1) {
        const base = ((y * gridWidth) + x) * 4
        const luminance = applyToneAdjust(clamp01(floats[base]), contrast, brightness)
        const gx = floats[base + 1]
        const gy = floats[base + 2]
        const alpha = clamp01(floats[base + 3])

        if (alpha <= alphaThreshold) {
          row += ' '
          continue
        }

        const edgeStrength = Math.min(1, Math.hypot(gx, gy) * 7.5 * edgeBoost)
        const noise = (hashNoise(x, y) - 0.5) * 0.06
        const contrastBoost = (edgeStrength * 0.2 * edgeBoost) - 0.06
        const corrected = clamp01(luminance + noise + contrastBoost)
        const toneChar = pickToneChar(corrected, options.invert)

        if (edgeStrength > (0.22 / Math.max(0.75, edgeBoost))) {
          const edgeChar = pickEdgeChar(gx, gy, Math.min(1, 0.26 + (edgeStrength * 0.9)))
          row += edgeStrength > 0.36 ? edgeChar : toneChar
        } else {
          row += toneChar
        }
      }
      lines[y] = row

      if (y % Math.max(1, Math.floor(gridHeight / 16)) === 0 || y === gridHeight - 1) {
        const ratio = (y + 1) / gridHeight
        emitProgress(callbacks, Math.round(82 + (ratio * 17)), 'Rendering ASCII text')
        throwIfCancelled(callbacks.shouldAbort)
      }
    }

    emitProgress(callbacks, 100, 'Done')
    debugWebGpu('conversion_success', {
      gridWidth,
      gridHeight,
      elapsedMs: Math.round(performance.now() - startedAt),
    })
    return {
      text: lines.join('\n'),
      width: gridWidth,
      height: gridHeight,
      stage: 'final',
      elapsedMs: Math.round(performance.now() - startedAt),
    }
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : 'Unknown WebGPU conversion failure'
    debugWebGpu('conversion_error', { message })
    throw reason
  } finally {
    bitmap?.close()
    sourceBitmap?.close()
  }
}
