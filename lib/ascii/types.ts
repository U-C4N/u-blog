export type AsciiJobStage = 'draft' | 'final'

export interface AsciiConvertOptions {
  outputWidth: number
  charset: string
  invert: boolean
  dither: boolean
  charAspect: number
  maxInputDimension: number
  alphaThreshold: number
  contrast?: number
  brightness?: number
  edgeBoost?: number
}

export interface AsciiConvertResult {
  text: string
  width: number
  height: number
  stage: AsciiJobStage
  elapsedMs: number
}
