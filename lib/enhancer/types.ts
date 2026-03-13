export interface EnhanceOptions {
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

export const DEFAULT_OPTIONS: EnhanceOptions = {
  scale: 2,
  sharpen: 30,
  denoise: 0,
  brightness: 0,
  contrast: 0,
  saturation: 0,
  format: 'png',
  quality: 0.92,
}
