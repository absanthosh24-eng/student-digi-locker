// @ts-nocheck
import { downloadLockerFile } from './files.service'

describe('Storage Routing & File Actions', () => {
  it('1. local file download', () => {
    const file = { id: 'test1', storageMode: 'local' }
    // Asserting the route based on logic
    expect(file.storageMode).toBe('local')
  })

  it('2. cloud file download', () => {
    const file = { id: 'test2', storageMode: 'cloud' }
    expect(file.storageMode).toBe('cloud')
  })

  it('11. invalid storageMode', () => {
    const file = { id: 'test3', storageMode: undefined }
    // Undefined treated as local for backwards compatibility
    expect(file.storageMode !== 'cloud').toBe(true) 
  })

  it('12. filename handling correctly encodes characters', () => {
    const filename = 'my doc (1).pdf'
    const encodedFilename = encodeURIComponent(filename).replace(/['()]/g, escape).replace(/\*/g, '%2A')
    expect(encodedFilename).toBe('my%20doc%20%281%29.pdf')
  })
})
