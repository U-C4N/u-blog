import type { AsciiConvertOptions, AsciiConvertResult, AsciiJobStage } from './types'

export interface AsciiWorkerConvertRequest {
  type: 'convert'
  id: string
  file: File
  options: AsciiConvertOptions
}

export interface AsciiWorkerCancelRequest {
  type: 'cancel'
  id: string
}

export type AsciiWorkerRequest = AsciiWorkerConvertRequest | AsciiWorkerCancelRequest

export interface AsciiWorkerProgress {
  type: 'progress'
  id: string
  stage: AsciiJobStage
  percent: number
  stagePercent: number
}

export interface AsciiWorkerResult {
  type: 'result'
  id: string
  result: AsciiConvertResult
}

export interface AsciiWorkerError {
  type: 'error'
  id: string
  message: string
}

export interface AsciiWorkerCancelled {
  type: 'cancelled'
  id: string
}

export type AsciiWorkerResponse =
  | AsciiWorkerProgress
  | AsciiWorkerResult
  | AsciiWorkerError
  | AsciiWorkerCancelled
