import 'fake-indexeddb/auto'
import {
  saveLocalFile,
  getLocalFile,
  deleteLocalFile,
  checkLocalFileExists,
  getStorageInfo,
} from '../src/services/localFileStorage.service'

describe('localFileStorage', () => {
  const fileId = 'test-file-123'
  let mockEstimate

  beforeEach(() => {
    // Reset IndexedDB
    indexedDB = new (require('fake-indexeddb').IDBFactory)()
    
    // Mock navigator.storage
    mockEstimate = jest.fn().mockResolvedValue({
      quota: 5000000000,
      usage: 1000000,
    })
    Object.defineProperty(global, 'navigator', {
      value: {
        storage: {
          estimate: mockEstimate,
        },
      },
      configurable: true,
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  test('getStorageInfo returns estimated quota', async () => {
    const info = await getStorageInfo()
    expect(info.supported).toBe(true)
    expect(info.quota).toBe(5000000000)
    expect(info.available).toBe(4999000000)
  })

  test('save and retrieve arbitrary MIME type file', async () => {
    const content = new Blob(['hello world'], { type: 'text/plain' })
    await saveLocalFile(fileId, content)
    
    const exists = await checkLocalFileExists(fileId)
    expect(exists).toBe(true)

    const retrieved = await getLocalFile(fileId)
    expect(retrieved).toBeInstanceOf(Blob)
    expect(retrieved.type).toBe('text/plain')
    expect(await retrieved.text()).toBe('hello world')
  })

  test('replace file correctly overwrites existing', async () => {
    const oldContent = new Blob(['old'], { type: 'text/plain' })
    await saveLocalFile(fileId, oldContent)
    
    const newContent = new Blob(['new content'], { type: 'text/plain' })
    await saveLocalFile(fileId, newContent)

    const retrieved = await getLocalFile(fileId)
    expect(await retrieved.text()).toBe('new content')
  })

  test('delete file removes it from IndexedDB', async () => {
    const content = new Blob(['to be deleted'])
    await saveLocalFile(fileId, content)
    expect(await checkLocalFileExists(fileId)).toBe(true)

    await deleteLocalFile(fileId)
    expect(await checkLocalFileExists(fileId)).toBe(false)
    
    await expect(getLocalFile(fileId)).rejects.toThrow('File not found')
  })

  test('missing local file handling throws correct error', async () => {
    await expect(getLocalFile('non-existent')).rejects.toThrow('File not found on this device')
  })

  test('insufficient quota handling throws error and prevents save', async () => {
    // Mock 0 available space
    mockEstimate.mockResolvedValue({
      quota: 1000,
      usage: 1000, // 0 available
    })

    const largeFile = new Blob(['x'.repeat(500)]) // 500 bytes

    await expect(saveLocalFile('large-file', largeFile))
      .rejects.toThrow('Not enough storage available on this device for this file.')
      
    expect(await checkLocalFileExists('large-file')).toBe(false)
  })
})
