import type { AsciiConvertOptions, AsciiConvertResult } from './types'
import type {
  AsciiWorkerProgress,
  AsciiWorkerRequest,
  AsciiWorkerResponse,
  AsciiWorkerResult,
} from './worker-protocol'

interface AsciiWorkerCallbacks {
  onProgress?: (payload: AsciiWorkerProgress) => void
  onResult?: (payload: AsciiWorkerResult) => void
}

interface PendingJob extends AsciiWorkerCallbacks {
  resolve: (result: AsciiConvertResult) => void
  reject: (reason: Error) => void
}

export interface AsciiWorkerJob {
  id: string
  promise: Promise<AsciiConvertResult>
  cancel: () => void
}

function createJobId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `ascii-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function debugWorker(event: string, details?: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  const payload = { at: new Date().toISOString(), event, ...(details ?? {}) }
  const g = window as Window & { __asciiDebugLog?: Array<Record<string, unknown>> }
  if (!g.__asciiDebugLog) g.__asciiDebugLog = []
  g.__asciiDebugLog.push({ scope: 'worker-client', ...payload })
  if (g.__asciiDebugLog.length > 400) g.__asciiDebugLog.shift()
  console.log('[ascii-worker-client]', payload)
}

export class AsciiWorkerClient {
  private worker: Worker
  private jobs = new Map<string, PendingJob>()

  constructor() {
    this.worker = new Worker(new URL('./ascii.worker.ts', import.meta.url), { type: 'module' })
    debugWorker('worker_constructed')
    this.worker.onmessage = (event: MessageEvent<AsciiWorkerResponse>) => this.handleResponse(event.data)
    this.worker.onerror = (event) => {
      debugWorker('worker_error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      })
      this.failAll('ASCII worker crashed unexpectedly.')
    }
    this.worker.onmessageerror = () => {
      debugWorker('worker_message_error')
      this.failAll('ASCII worker message deserialization failed.')
    }
  }

  convert(file: File, options: AsciiConvertOptions, callbacks: AsciiWorkerCallbacks = {}): AsciiWorkerJob {
    const id = createJobId()
    debugWorker('convert_start', {
      jobId: id,
      fileName: file.name,
      sizeBytes: file.size,
      outputWidth: options.outputWidth,
    })

    const promise = new Promise<AsciiConvertResult>((resolve, reject) => {
      this.jobs.set(id, {
        ...callbacks,
        resolve,
        reject,
      })
    })

    const message: AsciiWorkerRequest = {
      type: 'convert',
      id,
      file,
      options,
    }

    this.worker.postMessage(message)

    return {
      id,
      promise,
      cancel: () => this.cancel(id),
    }
  }

  dispose() {
    debugWorker('dispose', { pendingJobs: this.jobs.size })
    this.failAll('ASCII conversion cancelled.')
    this.worker.terminate()
    this.jobs.clear()
  }

  private cancel(id: string) {
    const pending = this.jobs.get(id)
    if (!pending) return

    debugWorker('cancel', { jobId: id })
    const message: AsciiWorkerRequest = { type: 'cancel', id }
    this.worker.postMessage(message)

    pending.reject(new Error('Conversion cancelled.'))
    this.jobs.delete(id)
  }

  private handleResponse(payload: AsciiWorkerResponse) {
    const pending = this.jobs.get(payload.id)
    if (!pending) return

    if (payload.type === 'progress') {
      pending.onProgress?.(payload)
      return
    }

    if (payload.type === 'result') {
      debugWorker('result', { jobId: payload.id, stage: payload.result.stage })
      pending.onResult?.(payload)
      if (payload.result.stage === 'final') {
        pending.resolve(payload.result)
        this.jobs.delete(payload.id)
      }
      return
    }

    if (payload.type === 'cancelled') {
      debugWorker('cancelled', { jobId: payload.id })
      pending.reject(new Error('Conversion cancelled.'))
      this.jobs.delete(payload.id)
      return
    }

    debugWorker('error', { jobId: payload.id, message: payload.message })
    pending.reject(new Error(payload.message))
    this.jobs.delete(payload.id)
  }

  private failAll(message: string) {
    this.jobs.forEach((pending, id) => {
      pending.reject(new Error(message))
      this.jobs.delete(id)
    })
  }
}
