export type EnhanceMode = 'ai' | 'classic'
export type EnhanceBackend = 'webgpu' | 'wasm' | 'cpu'

export interface EnhanceOptions {
  mode: EnhanceMode
  scale: 1 | 2 | 4
  sharpen: number       // 0–100
  denoise: number       // 0–100
  brightness: number    // -50 to 50
  contrast: number      // -50 to 50
  saturation: number    // -50 to 50
  format: 'png' | 'jpeg'
  quality: number       // 0.1–1.0 (JPEG only)
}

export interface EnhanceProgress {
  percent: number
  label: string
}

export type ProgressCallback = (progress: EnhanceProgress) => void

export interface EnhanceResult {
  blob: Blob
  width: number
  height: number
  engine: EnhanceBackend
  elapsedMs: number
  modeUsed: EnhanceMode
  tiled?: boolean
  fallbackReason?: string
}

export const DEFAULT_OPTIONS: EnhanceOptions = {
  mode: 'ai',
  scale: 2,
  sharpen: 30,
  denoise: 0,
  brightness: 0,
  contrast: 0,
  saturation: 0,
  format: 'png',
  quality: 0.92,
}
