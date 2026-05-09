import type { AsciiConvertResult } from './types'

// Experimental 1:1 WebGPU ASCII engine.
// Each source pixel becomes exactly one character. A single compute pass
// computes luminance, Sobel gradient, and selects a glyph from one of five
// orientation-specific banks — entirely on the GPU. The CPU only runs:
//   1. Image decode + texture upload
//   2. One mapAsync readback
//   3. UTF-16 materialization via TextDecoder
// No per-pixel JS loops for math, no string concatenation hot path.

const TONE_BANK = ' .,:;!|i*+xX#$@'
const VERT_BANK = " .'!|I#"
const HORIZ_BANK = ' ._-=~+#'
const DIAG_POS_BANK = ' ./xX#'
const DIAG_NEG_BANK = ' .\\xX#'

const BANKS: readonly string[] = [TONE_BANK, VERT_BANK, HORIZ_BANK, DIAG_POS_BANK, DIAG_NEG_BANK]
const BANK_LEVELS = BANKS.map((b) => b.length)
const BANK_CODES: Uint16Array[] = BANKS.map((s) => {
  const arr = new Uint16Array(s.length)
  for (let i = 0; i < s.length; i += 1) arr[i] = s.charCodeAt(i)
  return arr
})

const TRANSPARENT_MARKER = 0xff
const SPACE_CODE = 0x20
const NEWLINE_CODE = 0x0a

export interface GpuAsciiOptions {
  maxSide: number
  invert: boolean
  alphaThreshold: number
  contrast: number
  brightness: number
  edgeBoost: number
  edgeThreshold: number
}

export interface GpuAsciiCallbacks {
  onProgress?: (progress: { percent: number; label: string }) => void
  shouldAbort?: () => boolean
}

interface GpuMinimal {
  requestAdapter(opts?: { powerPreference?: 'low-power' | 'high-performance' }): Promise<GpuAdapterMinimal | null>
}

interface GpuAdapterMinimal {
  requestDevice(desc?: object): Promise<GpuDeviceMinimal>
}

interface GpuQueueMinimal {
  submit(buffers: object[]): void
  writeBuffer(buffer: object, offset: number, data: ArrayBufferView | ArrayBuffer): void
  copyExternalImageToTexture(source: object, destination: object, copySize: object): void
}

interface GpuDeviceMinimal {
  destroy?: () => void
  lost: Promise<{ reason: string; message: string }>
  queue: GpuQueueMinimal
  createTexture(desc: object): GpuTextureMinimal
  createBuffer(desc: object): GpuBufferMinimal
  createBindGroupLayout(desc: object): object
  createBindGroup(desc: object): object
  createShaderModule(desc: object): object
  createPipelineLayout(desc: object): object
  createComputePipeline(desc: object): GpuComputePipelineMinimal
  createCommandEncoder(desc?: object): GpuCommandEncoderMinimal
}

interface GpuTextureMinimal {
  createView(desc?: object): object
  destroy(): void
}

interface GpuBufferMinimal {
  mapAsync(mode: number, offset?: number, size?: number): Promise<void>
  getMappedRange(offset?: number, size?: number): ArrayBuffer
  unmap(): void
  destroy(): void
}

interface GpuComputePipelineMinimal {
  getBindGroupLayout(index: number): object
}

interface GpuCommandEncoderMinimal {
  beginComputePass(desc?: object): {
    setPipeline(pipeline: object): void
    setBindGroup(index: number, group: object): void
    dispatchWorkgroups(x: number, y?: number, z?: number): void
    end(): void
  }
  copyBufferToBuffer(src: object, srcOffset: number, dst: object, dstOffset: number, size: number): void
  finish(): object
}

declare const GPUTextureUsage: { TEXTURE_BINDING: number; COPY_DST: number; STORAGE_BINDING: number; RENDER_ATTACHMENT: number }
declare const GPUBufferUsage: { STORAGE: number; COPY_SRC: number; COPY_DST: number; UNIFORM: number; MAP_READ: number }
declare const GPUMapMode: { READ: number; WRITE: number }
declare const GPUShaderStage: { COMPUTE: number; FRAGMENT: number; VERTEX: number }

let cachedAdapter: GpuAdapterMinimal | null | undefined
let adapterPromise: Promise<GpuAdapterMinimal | null> | null = null
let cachedDevice: GpuDeviceMinimal | null | undefined
let devicePromise: Promise<GpuDeviceMinimal | null> | null = null
let cachedShader: { module: object; layout: object; pipeline: GpuComputePipelineMinimal } | null = null

function debug(event: string, details?: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  const payload = { at: new Date().toISOString(), event, ...(details ?? {}) }
  const w = window as Window & { __asciiDebugLog?: Array<Record<string, unknown>> }
  if (!w.__asciiDebugLog) w.__asciiDebugLog = []
  w.__asciiDebugLog.push({ scope: 'gpu-engine', ...payload })
  if (w.__asciiDebugLog.length > 400) w.__asciiDebugLog.shift()
  console.log('[ascii-gpu]', payload)
}

function getGpuApi(): GpuMinimal | null {
  if (typeof navigator === 'undefined') return null
  const nav = navigator as unknown as { gpu?: GpuMinimal }
  return nav.gpu ?? null
}

export function hasWebGpuSupport(): boolean {
  return Boolean(getGpuApi())
}

async function getAdapter(): Promise<GpuAdapterMinimal | null> {
  if (cachedAdapter !== undefined) return cachedAdapter
  if (adapterPromise) return adapterPromise
  const gpu = getGpuApi()
  if (!gpu) {
    cachedAdapter = null
    return null
  }
  adapterPromise = gpu
    .requestAdapter({ powerPreference: 'high-performance' })
    .then((adapter) => {
      cachedAdapter = adapter ?? null
      debug('adapter_resolved', { available: Boolean(cachedAdapter) })
      return cachedAdapter
    })
    .catch(() => {
      cachedAdapter = null
      return null
    })
    .finally(() => {
      adapterPromise = null
    })
  return adapterPromise
}

export async function hasUsableWebGpuAdapter(): Promise<boolean> {
  return Boolean(await getAdapter())
}

async function getDevice(): Promise<GpuDeviceMinimal | null> {
  if (cachedDevice) return cachedDevice
  if (devicePromise) return devicePromise
  const adapter = await getAdapter()
  if (!adapter) return null
  devicePromise = adapter
    .requestDevice()
    .then((device) => {
      cachedDevice = device
      cachedShader = null
      device.lost
        .then(() => {
          debug('device_lost')
          cachedDevice = null
          cachedShader = null
        })
        .catch(() => {})
      return device
    })
    .catch(() => {
      cachedDevice = null
      return null
    })
    .finally(() => {
      devicePromise = null
    })
  return devicePromise
}

const SHADER_CODE = /* wgsl */ `
struct Params {
  width: u32,
  height: u32,
  invert: u32,
  alphaThreshold: f32,
  contrast: f32,
  brightness: f32,
  edgeBoost: f32,
  edgeThreshold: f32,
  toneLevels: u32,
  vertLevels: u32,
  horizLevels: u32,
  diagPosLevels: u32,
  diagNegLevels: u32,
  pad0: u32,
  pad1: u32,
  pad2: u32,
}

@group(0) @binding(0) var srcTex: texture_2d<f32>;
@group(0) @binding(1) var<uniform> params: Params;
@group(0) @binding(2) var<storage, read_write> outBuf: array<u32>;

fn srgbChannel(c: f32) -> f32 {
  if (c <= 0.04045) {
    return c / 12.92;
  }
  return pow((c + 0.055) / 1.055, 2.4);
}

fn linearLuma(rgb: vec3<f32>) -> f32 {
  let r = srgbChannel(rgb.r);
  let g = srgbChannel(rgb.g);
  let b = srgbChannel(rgb.b);
  return dot(vec3<f32>(r, g, b), vec3<f32>(0.2126, 0.7152, 0.0722));
}

fn whiteCompositeLuma(x: i32, y: i32) -> f32 {
  let cx = clamp(x, 0, i32(params.width) - 1);
  let cy = clamp(y, 0, i32(params.height) - 1);
  let texel = textureLoad(srcTex, vec2<i32>(cx, cy), 0);
  let alpha = texel.a;
  let base = linearLuma(texel.rgb);
  return clamp((base * alpha) + (1.0 - alpha), 0.0, 1.0);
}

fn applyToneAdjust(l: f32, contrast: f32, brightness: f32) -> f32 {
  return clamp(((l - 0.5) * contrast) + 0.5 + brightness, 0.0, 1.0);
}

@compute @workgroup_size(16, 16, 1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let x = gid.x;
  let y = gid.y;
  if (x >= params.width || y >= params.height) {
    return;
  }
  let outIndex = y * params.width + x;
  let center = textureLoad(srcTex, vec2<i32>(i32(x), i32(y)), 0);
  let alpha = center.a;

  if (alpha <= params.alphaThreshold) {
    outBuf[outIndex] = 0xFFFFFFFFu;
    return;
  }

  let baseLuma = linearLuma(center.rgb);
  let composited = clamp((baseLuma * alpha) + (1.0 - alpha), 0.0, 1.0);
  let tone = applyToneAdjust(composited, params.contrast, params.brightness);
  let density = select(1.0 - tone, tone, params.invert == 1u);

  let p00 = whiteCompositeLuma(i32(x) - 1, i32(y) - 1);
  let p01 = whiteCompositeLuma(i32(x),     i32(y) - 1);
  let p02 = whiteCompositeLuma(i32(x) + 1, i32(y) - 1);
  let p10 = whiteCompositeLuma(i32(x) - 1, i32(y));
  let p12 = whiteCompositeLuma(i32(x) + 1, i32(y));
  let p20 = whiteCompositeLuma(i32(x) - 1, i32(y) + 1);
  let p21 = whiteCompositeLuma(i32(x),     i32(y) + 1);
  let p22 = whiteCompositeLuma(i32(x) + 1, i32(y) + 1);

  let gx = (-p00 + p02) + (-2.0 * p10 + 2.0 * p12) + (-p20 + p22);
  let gy = (-p00 - 2.0 * p01 - p02) + (p20 + 2.0 * p21 + p22);
  let edgeMag = clamp(length(vec2<f32>(gx, gy)) * params.edgeBoost, 0.0, 1.0);

  var bankId: u32 = 0u;
  var levelCount: u32 = params.toneLevels;
  var rampPos: f32 = density;

  if (edgeMag > params.edgeThreshold) {
    let absX = abs(gx);
    let absY = abs(gy);
    if (absX > absY * 1.35) {
      bankId = 1u;
      levelCount = params.vertLevels;
    } else if (absY > absX * 1.35) {
      bankId = 2u;
      levelCount = params.horizLevels;
    } else if (gx * gy >= 0.0) {
      bankId = 3u;
      levelCount = params.diagPosLevels;
    } else {
      bankId = 4u;
      levelCount = params.diagNegLevels;
    }
    rampPos = clamp(0.25 + edgeMag * 0.85, 0.0, 1.0);
  }

  let charIdx = u32(round(rampPos * f32(levelCount - 1u)));
  outBuf[outIndex] = (bankId << 24u) | (charIdx & 0xFFFFFFu);
}
`

async function prepareSourceBitmap(file: File, maxSide: number): Promise<{ bitmap: ImageBitmap; width: number; height: number }> {
  const decoded = await createImageBitmap(file, { premultiplyAlpha: 'none' as const })
  const longest = Math.max(decoded.width, decoded.height)
  if (longest <= maxSide) {
    return { bitmap: decoded, width: decoded.width, height: decoded.height }
  }
  try {
    const ratio = maxSide / longest
    const w = Math.max(1, Math.round(decoded.width * ratio))
    const h = Math.max(1, Math.round(decoded.height * ratio))
    const canvas = new OffscreenCanvas(w, h)
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) throw new Error('Could not initialize 2D context for downsampling.')
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(decoded, 0, 0, w, h)
    const downsampled = await createImageBitmap(canvas)
    return { bitmap: downsampled, width: w, height: h }
  } finally {
    decoded.close()
  }
}

function clampN(value: number | undefined, lo: number, hi: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback
  return Math.max(lo, Math.min(hi, Number(value)))
}

function materialize(packed: Uint32Array, width: number, height: number): string {
  const lineLen = width + 1
  const totalCodes = height * lineLen
  const buffer = new ArrayBuffer(totalCodes * 2)
  const codes = new Uint16Array(buffer)

  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * width
    const lineStart = y * lineLen
    for (let x = 0; x < width; x += 1) {
      const v = packed[rowOffset + x]
      let code = SPACE_CODE
      const bankId = v >>> 24
      if (bankId !== TRANSPARENT_MARKER) {
        const safeBank = bankId < BANK_CODES.length ? bankId : 0
        const idx = v & 0xffffff
        const bank = BANK_CODES[safeBank]
        const safeIdx = idx < bank.length ? idx : bank.length - 1
        code = bank[safeIdx]
      }
      codes[lineStart + x] = code
    }
    codes[lineStart + width] = NEWLINE_CODE
  }

  return new TextDecoder('utf-16le').decode(buffer)
}

function ensurePipeline(device: GpuDeviceMinimal): { pipeline: GpuComputePipelineMinimal; layout: object } {
  if (cachedShader) return { pipeline: cachedShader.pipeline, layout: cachedShader.layout }
  const layout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: 'float', viewDimension: '2d' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
    ],
  })
  const module = device.createShaderModule({ code: SHADER_CODE })
  const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [layout] })
  const pipeline = device.createComputePipeline({
    layout: pipelineLayout,
    compute: { module, entryPoint: 'main' },
  })
  cachedShader = { module, layout, pipeline }
  return { pipeline, layout }
}

export async function convertToAsciiGpu(
  file: File,
  options: GpuAsciiOptions,
  callbacks: GpuAsciiCallbacks = {},
): Promise<AsciiConvertResult> {
  const startedAt = performance.now()
  const emit = (percent: number, label: string) => callbacks.onProgress?.({ percent, label })
  const checkAbort = () => {
    if (callbacks.shouldAbort?.()) throw new Error('JOB_CANCELLED')
  }

  emit(2, 'Initializing GPU')
  checkAbort()

  if (!hasWebGpuSupport()) {
    throw new Error('WebGPU is not available in this browser.')
  }

  const device = await getDevice()
  if (!device) throw new Error('No usable WebGPU adapter on this device.')
  if (typeof GPUTextureUsage === 'undefined' || typeof GPUBufferUsage === 'undefined' || typeof GPUMapMode === 'undefined') {
    throw new Error('WebGPU constants are unavailable in this environment.')
  }
  checkAbort()

  emit(8, 'Decoding source image')
  const safeMaxSide = clampN(options.maxSide, 64, 4096, 1024)
  const { bitmap, width, height } = await prepareSourceBitmap(file, safeMaxSide)
  checkAbort()

  let texture: GpuTextureMinimal | null = null
  let outBuffer: GpuBufferMinimal | null = null
  let readBuffer: GpuBufferMinimal | null = null
  let uniformBuffer: GpuBufferMinimal | null = null

  try {
    debug('begin', { width, height, file: file.name })

    emit(20, 'Uploading texture to GPU')
    texture = device.createTexture({
      size: { width, height, depthOrArrayLayers: 1 },
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    }) as GpuTextureMinimal
    device.queue.copyExternalImageToTexture({ source: bitmap }, { texture }, { width, height })
    checkAbort()

    const outBytes = width * height * 4
    outBuffer = device.createBuffer({
      size: outBytes,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    }) as GpuBufferMinimal
    readBuffer = device.createBuffer({
      size: outBytes,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    }) as GpuBufferMinimal

    uniformBuffer = device.createBuffer({
      size: 64,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    }) as GpuBufferMinimal
    const uniformBytes = new ArrayBuffer(64)
    const u32 = new Uint32Array(uniformBytes)
    const f32 = new Float32Array(uniformBytes)
    u32[0] = width
    u32[1] = height
    u32[2] = options.invert ? 1 : 0
    f32[3] = clampN(options.alphaThreshold, 0, 1, 0.08)
    f32[4] = clampN(options.contrast, 0.4, 2.5, 1)
    f32[5] = clampN(options.brightness, -0.5, 0.5, 0)
    f32[6] = clampN(options.edgeBoost, 0.5, 4, 1)
    f32[7] = clampN(options.edgeThreshold, 0, 1, 0.18)
    u32[8] = BANK_LEVELS[0]
    u32[9] = BANK_LEVELS[1]
    u32[10] = BANK_LEVELS[2]
    u32[11] = BANK_LEVELS[3]
    u32[12] = BANK_LEVELS[4]
    device.queue.writeBuffer(uniformBuffer, 0, uniformBytes)

    emit(34, 'Compiling shader')
    const { pipeline, layout } = ensurePipeline(device)
    checkAbort()

    const bindGroup = device.createBindGroup({
      layout,
      entries: [
        { binding: 0, resource: texture.createView() },
        { binding: 1, resource: { buffer: uniformBuffer } },
        { binding: 2, resource: { buffer: outBuffer } },
      ],
    })

    emit(48, 'Dispatching compute')
    const encoder = device.createCommandEncoder()
    const pass = encoder.beginComputePass()
    pass.setPipeline(pipeline as unknown as object)
    pass.setBindGroup(0, bindGroup)
    pass.dispatchWorkgroups(Math.ceil(width / 16), Math.ceil(height / 16))
    pass.end()
    encoder.copyBufferToBuffer(outBuffer, 0, readBuffer, 0, outBytes)
    device.queue.submit([encoder.finish()])
    checkAbort()

    emit(66, 'Reading GPU buffer')
    await readBuffer.mapAsync(GPUMapMode.READ)
    checkAbort()
    const mapped = readBuffer.getMappedRange()
    const packed = new Uint32Array(mapped.slice(0))
    readBuffer.unmap()

    emit(82, 'Materializing characters')
    checkAbort()
    const text = materialize(packed, width, height)

    emit(100, 'Done')
    const elapsedMs = Math.round(performance.now() - startedAt)
    debug('end', { width, height, elapsedMs })
    return { text, width, height, stage: 'final', elapsedMs }
  } finally {
    bitmap.close()
    texture?.destroy()
    outBuffer?.destroy()
    readBuffer?.destroy()
    uniformBuffer?.destroy()
  }
}
