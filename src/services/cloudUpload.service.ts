import * as idb from '@/utils/idb'
import { initUpload, presignPart, completeUpload, abortUpload } from './cloudStorage.service'

const CHUNK_SIZE = 10 * 1024 * 1024 // 10 MB chunks
const MAX_CONCURRENCY = 3
const MAX_RETRIES = 3

export type UploadState = 'preparing' | 'uploading' | 'paused' | 'completing' | 'complete' | 'error' | 'cancelled'

export interface UploadSession {
  fileId: string
  uploadId: string
  fileSize: number
  storageKey: string
  completedParts: { partNumber: number; etag: string }[]
  totalParts: number
}

type OnProgress = (progress: number, uploadedBytes: number, state: UploadState) => void

export class CloudUploadEngine {
  private file: File
  private fileId: string
  private session: UploadSession | null = null
  private state: UploadState = 'preparing'
  private onProgress: OnProgress
  private cancelController: AbortController = new AbortController()
  private isPaused = false

  constructor(file: File, fileId: string, onProgress: OnProgress) {
    this.file = file
    this.fileId = fileId
    this.onProgress = onProgress
  }

  private async loadSession(): Promise<UploadSession | null> {
    return (await idb.get(`upload_session_${this.fileId}`)) as UploadSession | null
  }

  private async saveSession() {
    if (this.session) {
      await idb.set(`upload_session_${this.fileId}`, this.session)
    }
  }

  private async clearSession() {
    await idb.del(`upload_session_${this.fileId}`)
  }

  private emitProgress() {
    if (!this.session) return
    const uploadedParts = this.session.completedParts.length
    const uploadedBytes = Math.min(uploadedParts * CHUNK_SIZE, this.file.size)
    const progress = Math.round((uploadedBytes / this.file.size) * 100)
    this.onProgress(progress, uploadedBytes, this.state)
  }

  async start() {
    try {
      this.isPaused = false
      this.cancelController = new AbortController()

      this.session = await this.loadSession()
      
      if (!this.session) {
        this.state = 'preparing'
        this.emitProgress()
        const init = await initUpload(this.fileId, this.file.size, this.file.type || 'application/octet-stream')
        this.session = {
          fileId: this.fileId,
          uploadId: init.uploadId,
          storageKey: init.storageKey,
          fileSize: this.file.size,
          completedParts: [],
          totalParts: Math.ceil(this.file.size / CHUNK_SIZE)
        }
        await this.saveSession()
      }

      this.state = 'uploading'
      this.emitProgress()
      await this.uploadChunks()

    } catch (err) {
      if (this.isPaused) return
      if (this.cancelController.signal.aborted) {
        this.state = 'cancelled'
        this.emitProgress()
        return
      }
      console.error(err)
      this.state = 'error'
      this.emitProgress()
      throw err
    }
  }

  private async uploadChunks() {
    if (!this.session) return
    
    const partsToUpload = Array.from({ length: this.session.totalParts }, (_, i) => i + 1)
      .filter(p => !this.session!.completedParts.find(c => c.partNumber === p))

    for (let i = 0; i < partsToUpload.length; i += MAX_CONCURRENCY) {
      if (this.isPaused) {
        this.state = 'paused'
        this.emitProgress()
        return
      }
      if (this.cancelController.signal.aborted) return

      const batch = partsToUpload.slice(i, i + MAX_CONCURRENCY)
      
      await Promise.all(batch.map(async (partNum) => {
        let retries = 0
        while (retries < MAX_RETRIES) {
          if (this.isPaused || this.cancelController.signal.aborted) return
          try {
            const start = (partNum - 1) * CHUNK_SIZE
            const end = Math.min(start + CHUNK_SIZE, this.file.size)
            const chunk = this.file.slice(start, end)
            
            const presignedUrl = await presignPart(this.fileId, this.session!.uploadId, partNum)
            
            const res = await fetch(presignedUrl, {
              method: 'PUT',
              body: chunk,
              signal: this.cancelController.signal
            })
            
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            
            const etag = res.headers.get('ETag')
            if (!etag) throw new Error('Missing ETag')
            
            this.session!.completedParts.push({ partNumber: partNum, etag: etag.replace(/"/g, '') })
            await this.saveSession()
            this.emitProgress()
            break
          } catch (e: any) {
            if (e.name === 'AbortError') return
            retries++
            if (retries === MAX_RETRIES) throw e
            await new Promise(r => setTimeout(r, 1000 * retries))
          }
        }
      }))
    }

    if (this.isPaused || this.cancelController.signal.aborted) return
    if (this.session.completedParts.length === this.session.totalParts) {
      await this.finish()
    }
  }

  private async finish() {
    if (!this.session) return
    this.state = 'completing'
    this.emitProgress()

    const sortedParts = [...this.session.completedParts].sort((a, b) => a.partNumber - b.partNumber)
    await completeUpload(this.fileId, this.session.uploadId, sortedParts)
    
    this.state = 'complete'
    this.emitProgress()
    await this.clearSession()
  }

  pause() {
    this.isPaused = true
    this.state = 'paused'
    this.emitProgress()
  }

  resume() {
    if (this.state !== 'paused' && this.state !== 'error') return
    this.start()
  }

  async cancel() {
    this.cancelController.abort()
    this.state = 'cancelled'
    this.emitProgress()
    
    if (this.session) {
      try {
        await abortUpload(this.fileId, this.session.uploadId)
      } catch (e) {
        console.error('Failed to abort on server', e)
      }
      await this.clearSession()
    }
  }
}
