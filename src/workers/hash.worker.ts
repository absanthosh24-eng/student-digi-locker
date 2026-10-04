declare function importScripts(...urls: string[]): void
importScripts('https://cdn.jsdelivr.net/npm/hash-wasm@4.11.0/dist/sha256.umd.min.js')

declare const hashwasm: any

self.onmessage = async (e: MessageEvent) => {
  const file: File = e.data.file
  const CHUNK_SIZE = 10 * 1024 * 1024 // 10MB chunk for hashing
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
  
  try {
    const hasher = await hashwasm.createSHA256()
    hasher.init()

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE
      const end = Math.min(start + CHUNK_SIZE, file.size)
      const blob = file.slice(start, end)
      
      const buffer = await blob.arrayBuffer()
      hasher.update(new Uint8Array(buffer))

      self.postMessage({
        type: 'progress',
        progress: Math.round(((i + 1) / totalChunks) * 100)
      })
    }

    const hash = hasher.digest()
    self.postMessage({ type: 'complete', hash })
  } catch (error) {
    self.postMessage({ type: 'error', error: String(error) })
  }
}
