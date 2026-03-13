import type { EnhanceOptions, ProgressCallback } from './types'

// ─── WGSL Shaders ────────────────────────────────────────────────────────────

const UPSCALE_SHADER = /* wgsl */ `
struct Params {
  src_w: u32, src_h: u32,
  dst_w: u32, dst_h: u32,
}

@group(0) @binding(0) var src: texture_2d<f32>;
@group(0) @binding(1) var dst: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(2) var<uniform> p: Params;

fn lanczos3(x: f32) -> f32 {
  let ax = abs(x);
  if (ax < 0.0001) { return 1.0; }
  if (ax >= 3.0)   { return 0.0; }
  let px = 3.14159265358979 * x;
  return (sin(px) / px) * (sin(px / 3.0) / (px / 3.0));
}

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= p.dst_w || gid.y >= p.dst_h) { return; }

  let sx = (f32(gid.x) + 0.5) * f32(p.src_w) / f32(p.dst_w) - 0.5;
  let sy = (f32(gid.y) + 0.5) * f32(p.src_h) / f32(p.dst_h) - 0.5;
  let ix = i32(floor(sx));
  let iy = i32(floor(sy));

  var col = vec4<f32>(0.0);
  var ws  = 0.0;

  for (var dy = -2; dy <= 3; dy++) {
    let wy = lanczos3(sy - f32(iy + dy));
    let cy = clamp(iy + dy, 0, i32(p.src_h) - 1);
    for (var dx = -2; dx <= 3; dx++) {
      let wx = lanczos3(sx - f32(ix + dx));
      let cx = clamp(ix + dx, 0, i32(p.src_w) - 1);
      let w  = wx * wy;
      col += textureLoad(src, vec2<i32>(cx, cy), 0) * w;
      ws  += w;
    }
  }
  if (ws > 0.0) { col /= ws; }
  textureStore(dst, vec2<i32>(i32(gid.x), i32(gid.y)), clamp(col, vec4<f32>(0.0), vec4<f32>(1.0)));
}
`

const SHARPEN_SHADER = /* wgsl */ `
struct Params { w: u32, h: u32, amount: f32, radius: f32 }

@group(0) @binding(0) var src: texture_2d<f32>;
@group(0) @binding(1) var dst: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(2) var<uniform> p: Params;

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= p.w || gid.y >= p.h) { return; }
  let co = vec2<i32>(i32(gid.x), i32(gid.y));
  let center = textureLoad(src, co, 0);
  let r  = i32(p.radius);
  let s2 = p.radius * p.radius * 0.5;

  var blur = vec4<f32>(0.0);
  var ws   = 0.0;
  for (var dy = -r; dy <= r; dy++) {
    for (var dx = -r; dx <= r; dx++) {
      let sc = vec2<i32>(clamp(co.x + dx, 0, i32(p.w) - 1),
                         clamp(co.y + dy, 0, i32(p.h) - 1));
      let d = f32(dx * dx + dy * dy);
      let wt = exp(-d / (2.0 * s2));
      blur += textureLoad(src, sc, 0) * wt;
      ws   += wt;
    }
  }
  blur /= ws;

  var out = center + p.amount * (center - blur);
  out = clamp(out, vec4<f32>(0.0), vec4<f32>(1.0));
  out.a = center.a;
  textureStore(dst, co, out);
}
`

const DENOISE_SHADER = /* wgsl */ `
struct Params { w: u32, h: u32, strength: f32, _p: f32 }

@group(0) @binding(0) var src: texture_2d<f32>;
@group(0) @binding(1) var dst: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(2) var<uniform> p: Params;

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= p.w || gid.y >= p.h) { return; }
  let co = vec2<i32>(i32(gid.x), i32(gid.y));
  let center = textureLoad(src, co, 0);

  var acc = vec4<f32>(0.0);
  var ws  = 0.0;
  let sig_s = 2.0;
  let sig_r = max(p.strength, 0.01);

  for (var dy = -2; dy <= 2; dy++) {
    for (var dx = -2; dx <= 2; dx++) {
      let sc = vec2<i32>(clamp(co.x + dx, 0, i32(p.w) - 1),
                         clamp(co.y + dy, 0, i32(p.h) - 1));
      let s = textureLoad(src, sc, 0);
      let sd = f32(dx * dx + dy * dy);
      let cd = dot(center.rgb - s.rgb, center.rgb - s.rgb);
      let wt = exp(-sd / (2.0 * sig_s * sig_s)) * exp(-cd / (2.0 * sig_r * sig_r));
      acc += s * wt;
      ws  += wt;
    }
  }
  acc /= ws;
  acc.a = center.a;
  textureStore(dst, co, acc);
}
`

const COLOR_SHADER = /* wgsl */ `
struct Params {
  w: u32, h: u32, brightness: f32, contrast: f32,
  saturation: f32, _p1: f32, _p2: f32, _p3: f32,
}

@group(0) @binding(0) var src: texture_2d<f32>;
@group(0) @binding(1) var dst: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(2) var<uniform> p: Params;

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= p.w || gid.y >= p.h) { return; }
  let co = vec2<i32>(i32(gid.x), i32(gid.y));
  var c = textureLoad(src, co, 0);

  // brightness
  c = vec4<f32>(c.rgb + vec3<f32>(p.brightness), c.a);
  // contrast
  c = vec4<f32>((c.rgb - 0.5) * p.contrast + 0.5, c.a);
  // saturation
  let g = dot(c.rgb, vec3<f32>(0.299, 0.587, 0.114));
  c = vec4<f32>(mix(vec3<f32>(g), c.rgb, p.saturation), c.a);
  textureStore(dst, co, clamp(c, vec4<f32>(0.0), vec4<f32>(1.0)));
}
`

// ─── WebGPU Engine ───────────────────────────────────────────────────────────

let gpuDevicePromise: Promise<GPUDevice | null> | null = null

export function hasWebGpuSupport(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator
}

function getGPUDevice(): Promise<GPUDevice | null> {
  if (!gpuDevicePromise) {
    gpuDevicePromise = (async () => {
      if (!hasWebGpuSupport()) return null
      try {
        const adapter = await navigator.gpu.requestAdapter()
        if (!adapter) return null
        const device = await adapter.requestDevice({
          requiredLimits: {
            maxTextureDimension2D: adapter.limits.maxTextureDimension2D,
            maxBufferSize: adapter.limits.maxBufferSize,
            maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
          },
        })
        device.lost.then(() => { gpuDevicePromise = null })
        return device
      } catch { return null }
    })()
  }
  return gpuDevicePromise
}

export async function checkWebGpuReady(): Promise<boolean> {
  return (await getGPUDevice()) !== null
}

async function runGpuFilter(
  device: GPUDevice,
  inputData: ImageData,
  outW: number,
  outH: number,
  shaderCode: string,
  uniformData: ArrayBuffer,
): Promise<ImageData> {
  const inW = inputData.width
  const inH = inputData.height

  const maxDim = device.limits.maxTextureDimension2D
  if (inW > maxDim || inH > maxDim || outW > maxDim || outH > maxDim) {
    throw new Error(`Texture dimensions exceed GPU limit (${maxDim}px)`)
  }

  const resources: { destroy(): void }[] = []
  try {
    const inputTex = device.createTexture({
      size: [inW, inH],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    })
    resources.push(inputTex)
    device.queue.writeTexture(
      { texture: inputTex },
      inputData.data,
      { bytesPerRow: inW * 4 },
      [inW, inH],
    )

    const outputTex = device.createTexture({
      size: [outW, outH],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC,
    })
    resources.push(outputTex)

    const uBufSize = Math.max(16, Math.ceil(uniformData.byteLength / 16) * 16)
    const uniformBuf = device.createBuffer({
      size: uBufSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })
    resources.push(uniformBuf)
    device.queue.writeBuffer(uniformBuf, 0, uniformData)

    const module = device.createShaderModule({ code: shaderCode })
    const pipeline = device.createComputePipeline({
      layout: 'auto',
      compute: { module, entryPoint: 'main' },
    })

    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: inputTex.createView() },
        { binding: 1, resource: outputTex.createView() },
        { binding: 2, resource: { buffer: uniformBuf } },
      ],
    })

    const encoder = device.createCommandEncoder()
    const pass = encoder.beginComputePass()
    pass.setPipeline(pipeline)
    pass.setBindGroup(0, bindGroup)
    pass.dispatchWorkgroups(Math.ceil(outW / 8), Math.ceil(outH / 8))
    pass.end()

    const bytesPerRow = Math.ceil(outW * 4 / 256) * 256
    const readBuf = device.createBuffer({
      size: bytesPerRow * outH,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    })
    resources.push(readBuf)
    encoder.copyTextureToBuffer(
      { texture: outputTex },
      { buffer: readBuf, bytesPerRow },
      [outW, outH],
    )
    device.queue.submit([encoder.finish()])

    await readBuf.mapAsync(GPUMapMode.READ)
    const mapped = new Uint8Array(readBuf.getMappedRange())
    const result = new ImageData(outW, outH)
    for (let y = 0; y < outH; y++) {
      result.data.set(
        mapped.subarray(y * bytesPerRow, y * bytesPerRow + outW * 4),
        y * outW * 4,
      )
    }
    readBuf.unmap()

    return result
  } finally {
    for (const r of resources) r.destroy()
  }
}

// ─── CPU Fallbacks ───────────────────────────────────────────────────────────

function canvasUpscale(source: ImageBitmap, targetW: number, targetH: number): ImageData {
  const canvas = document.createElement('canvas')
  canvas.width = targetW
  canvas.height = targetH
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, targetW, targetH)
  return ctx.getImageData(0, 0, targetW, targetH)
}

function bitmapToImageData(source: ImageBitmap): ImageData {
  const canvas = document.createElement('canvas')
  canvas.width = source.width
  canvas.height = source.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(source, 0, 0)
  return ctx.getImageData(0, 0, source.width, source.height)
}

function cpuGaussian5x5(data: Uint8ClampedArray, w: number, h: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(data.length)
  const k = [1, 4, 6, 4, 1, 4, 16, 24, 16, 4, 6, 24, 36, 24, 6, 4, 16, 24, 16, 4, 1, 4, 6, 4, 1]
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0, ki = 0
      for (let dy = -2; dy <= 2; dy++) {
        const sy = Math.max(0, Math.min(h - 1, y + dy))
        for (let dx = -2; dx <= 2; dx++) {
          const sx = Math.max(0, Math.min(w - 1, x + dx))
          const i = (sy * w + sx) * 4
          const wt = k[ki++]
          r += data[i] * wt
          g += data[i + 1] * wt
          b += data[i + 2] * wt
        }
      }
      const oi = (y * w + x) * 4
      out[oi] = r >> 8
      out[oi + 1] = g >> 8
      out[oi + 2] = b >> 8
      out[oi + 3] = data[oi + 3]
    }
  }
  return out
}

function cpuSharpen(img: ImageData, amount: number): ImageData {
  const blurred = cpuGaussian5x5(img.data, img.width, img.height)
  const result = new ImageData(img.width, img.height)
  const src = img.data
  const dst = result.data
  for (let i = 0; i < src.length; i += 4) {
    dst[i] = Math.max(0, Math.min(255, src[i] + amount * (src[i] - blurred[i])))
    dst[i + 1] = Math.max(0, Math.min(255, src[i + 1] + amount * (src[i + 1] - blurred[i + 1])))
    dst[i + 2] = Math.max(0, Math.min(255, src[i + 2] + amount * (src[i + 2] - blurred[i + 2])))
    dst[i + 3] = src[i + 3]
  }
  return result
}

function cpuDenoise(img: ImageData, strength: number): ImageData {
  const w = img.width, h = img.height
  const src = img.data
  const result = new ImageData(w, h)
  const dst = result.data
  const sigR2 = 2 * strength * strength

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ci = (y * w + x) * 4
      const cr = src[ci] / 255, cg = src[ci + 1] / 255, cb = src[ci + 2] / 255
      let ar = 0, ag = 0, ab = 0, ws = 0

      for (let dy = -2; dy <= 2; dy++) {
        const sy = Math.max(0, Math.min(h - 1, y + dy))
        for (let dx = -2; dx <= 2; dx++) {
          const sx = Math.max(0, Math.min(w - 1, x + dx))
          const si = (sy * w + sx) * 4
          const sr = src[si] / 255, sg = src[si + 1] / 255, sb = src[si + 2] / 255
          const sd = dx * dx + dy * dy
          const cd = (cr - sr) ** 2 + (cg - sg) ** 2 + (cb - sb) ** 2
          const wt = Math.exp(-sd / 8) * Math.exp(-cd / Math.max(sigR2, 0.001))
          ar += sr * wt; ag += sg * wt; ab += sb * wt; ws += wt
        }
      }
      dst[ci] = Math.round((ar / ws) * 255)
      dst[ci + 1] = Math.round((ag / ws) * 255)
      dst[ci + 2] = Math.round((ab / ws) * 255)
      dst[ci + 3] = src[ci + 3]
    }
  }
  return result
}

function cpuColorAdjust(img: ImageData, brightness: number, contrast: number, saturation: number): ImageData {
  const result = new ImageData(img.width, img.height)
  const src = img.data
  const dst = result.data
  for (let i = 0; i < src.length; i += 4) {
    let r = src[i] / 255, g = src[i + 1] / 255, b = src[i + 2] / 255
    r += brightness; g += brightness; b += brightness
    r = (r - 0.5) * contrast + 0.5
    g = (g - 0.5) * contrast + 0.5
    b = (b - 0.5) * contrast + 0.5
    const gray = 0.299 * r + 0.587 * g + 0.114 * b
    r = gray + (r - gray) * saturation
    g = gray + (g - gray) * saturation
    b = gray + (b - gray) * saturation
    dst[i] = Math.max(0, Math.min(255, Math.round(r * 255)))
    dst[i + 1] = Math.max(0, Math.min(255, Math.round(g * 255)))
    dst[i + 2] = Math.max(0, Math.min(255, Math.round(b * 255)))
    dst[i + 3] = src[i + 3]
  }
  return result
}

// ─── Main Pipeline ───────────────────────────────────────────────────────────

/**
 * Pack values into a uniform buffer with explicit type layout.
 * @param fmt - type format string: 'u' = u32, 'f' = f32 (e.g. 'uuff')
 * @param vals - numeric values matching the format
 */
function makeUniform(fmt: string, vals: number[]): ArrayBuffer {
  const size = Math.max(16, Math.ceil(vals.length * 4 / 16) * 16)
  const buf = new ArrayBuffer(size)
  const dv = new DataView(buf)
  vals.forEach((v, i) => {
    if (fmt[i] === 'u') dv.setUint32(i * 4, v, true)
    else dv.setFloat32(i * 4, v, true)
  })
  return buf
}

export async function enhanceImage(
  file: File,
  options: EnhanceOptions,
  onProgress?: ProgressCallback,
): Promise<{ blob: Blob; width: number; height: number; engine: 'webgpu' | 'cpu'; elapsedMs: number }> {
  const t0 = performance.now()
  const report = (percent: number, label: string) => onProgress?.({ percent, label })
  report(2, 'Loading image')

  const bitmap = await createImageBitmap(file)
  const srcW = bitmap.width
  const srcH = bitmap.height
  const dstW = srcW * options.scale
  const dstH = srcH * options.scale

  const device = await getGPUDevice()
  let engine: 'webgpu' | 'cpu' = device ? 'webgpu' : 'cpu'
  let imageData: ImageData

  // ── Step 1: Upscale ──────────────────────────────────────────────────────
  if (options.scale > 1) {
    report(8, `Upscaling ${options.scale}x (${dstW}x${dstH})`)

    if (device) {
      try {
        if (options.scale === 4) {
          // Two-pass: 2x → sharpen → 2x for better detail
          const midW = srcW * 2, midH = srcH * 2
          const srcData = bitmapToImageData(bitmap)
          const mid = await runGpuFilter(device, srcData, midW, midH, UPSCALE_SHADER,
            makeUniform('uuuu', [srcW, srcH, midW, midH]))

          // Light sharpen between passes
          const midSharpened = await runGpuFilter(device, mid, midW, midH, SHARPEN_SHADER,
            makeUniform('uuff', [midW, midH, 0.4, 2.0]))

          imageData = await runGpuFilter(device, midSharpened, dstW, dstH, UPSCALE_SHADER,
            makeUniform('uuuu', [midW, midH, dstW, dstH]))
        } else {
          const srcData = bitmapToImageData(bitmap)
          imageData = await runGpuFilter(device, srcData, dstW, dstH, UPSCALE_SHADER,
            makeUniform('uuuu', [srcW, srcH, dstW, dstH]))
        }
      } catch {
        engine = 'cpu'
        imageData = canvasUpscale(bitmap, dstW, dstH)
      }
    } else {
      if (options.scale === 4) {
        const midW = srcW * 2, midH = srcH * 2
        const midCanvas = document.createElement('canvas')
        midCanvas.width = midW
        midCanvas.height = midH
        const midCtx = midCanvas.getContext('2d')!
        midCtx.imageSmoothingEnabled = true
        midCtx.imageSmoothingQuality = 'high'
        midCtx.drawImage(bitmap, 0, 0, midW, midH)
        const midBitmap = await createImageBitmap(midCanvas)
        imageData = canvasUpscale(midBitmap, dstW, dstH)
        midBitmap.close()
      } else {
        imageData = canvasUpscale(bitmap, dstW, dstH)
      }
    }
  } else {
    imageData = bitmapToImageData(bitmap)
  }
  bitmap.close()

  // ── Step 2: Sharpen ──────────────────────────────────────────────────────
  if (options.sharpen > 0) {
    report(40, 'Sharpening')
    const amount = (options.sharpen / 100) * 2.0
    const w = imageData.width, h = imageData.height

    if (device && engine === 'webgpu') {
      try {
        imageData = await runGpuFilter(device, imageData, w, h, SHARPEN_SHADER,
          makeUniform('uuff', [w, h, amount, 2.0]))
      } catch { imageData = cpuSharpen(imageData, amount) }
    } else {
      imageData = cpuSharpen(imageData, amount)
    }
  }

  // ── Step 3: Denoise ──────────────────────────────────────────────────────
  if (options.denoise > 0) {
    report(58, 'Reducing noise')
    const strength = (options.denoise / 100) * 0.35
    const w = imageData.width, h = imageData.height

    if (device && engine === 'webgpu') {
      try {
        imageData = await runGpuFilter(device, imageData, w, h, DENOISE_SHADER,
          makeUniform('uuff', [w, h, strength, 0]))
      } catch { imageData = cpuDenoise(imageData, strength) }
    } else {
      imageData = cpuDenoise(imageData, strength)
    }
  }

  // ── Step 4: Color ────────────────────────────────────────────────────────
  const hasColor = options.brightness !== 0 || options.contrast !== 0 || options.saturation !== 0
  if (hasColor) {
    report(75, 'Adjusting colors')
    const bright = options.brightness / 100
    const cont = 1 + options.contrast / 50
    const sat = 1 + options.saturation / 50
    const w = imageData.width, h = imageData.height

    if (device && engine === 'webgpu') {
      try {
        imageData = await runGpuFilter(device, imageData, w, h, COLOR_SHADER,
          makeUniform('uuffffff', [w, h, bright, cont, sat, 0, 0, 0]))
      } catch { imageData = cpuColorAdjust(imageData, bright, cont, sat) }
    } else {
      imageData = cpuColorAdjust(imageData, bright, cont, sat)
    }
  }

  // ── Step 5: Encode ───────────────────────────────────────────────────────
  report(92, 'Encoding output')
  const canvas = document.createElement('canvas')
  canvas.width = imageData.width
  canvas.height = imageData.height
  const ctx = canvas.getContext('2d')!
  ctx.putImageData(imageData, 0, 0)

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Encoding failed'))),
      `image/${options.format}`,
      options.format === 'jpeg' ? options.quality : undefined,
    )
  })

  report(100, 'Done')
  return {
    blob,
    width: imageData.width,
    height: imageData.height,
    engine,
    elapsedMs: Math.round(performance.now() - t0),
  }
}
