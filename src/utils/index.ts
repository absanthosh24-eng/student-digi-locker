import { FileCategory, FileType } from '@/types'

// ============================================================
// FORMATTING UTILITIES
// ============================================================

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`
}

export function formatDate(date: Date | string | undefined, options?: Intl.DateTimeFormatOptions): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...options,
  })
}

export function formatRelativeTime(date: Date | string | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  return formatDate(d)
}

export function formatDateTime(date: Date | string | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDaysRemaining(date: Date | string | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diff = d.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  if (days <= 0) return 'Deleting soon'
  if (days === 1) return '1 day remaining'
  return `${days} days remaining`
}

// ============================================================
// FILE TYPE UTILITIES
// ============================================================

export function getFileType(mimeType: string): FileType {
  if (!mimeType) return 'other'
  if (mimeType === 'application/pdf') return 'pdf'
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (
    mimeType.includes('word') ||
    mimeType.includes('document') ||
    mimeType === 'text/plain' ||
    mimeType === 'text/html'
  ) return 'document'
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'text/csv') return 'spreadsheet'
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'presentation'
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar') || mimeType.includes('gz')) return 'archive'
  return 'other'
}

export function getFileExtension(filename: string): string {
  const parts = filename.split('.')
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : 'FILE'
}

export function getMimeTypeLabel(mimeType: string): string {
  const type = getFileType(mimeType)
  const labels: Record<FileType, string> = {
    pdf: 'PDF',
    image: 'Image',
    video: 'Video',
    audio: 'Audio',
    document: 'Document',
    spreadsheet: 'Spreadsheet',
    presentation: 'Presentation',
    archive: 'Archive',
    other: 'File',
  }
  return labels[type]
}

export function isPreviewable(mimeType: string): boolean {
  const type = getFileType(mimeType)
  return ['pdf', 'image', 'video', 'audio'].includes(type)
}

// ============================================================
// CATEGORY UTILITIES
// ============================================================

export const CATEGORIES: FileCategory[] = [
  'Education',
  'Certificates',
  'Identity',
  'Finance',
  'Projects',
  'Personal',
  'Uncategorized',
]

export const CATEGORY_COLORS: Record<FileCategory, string> = {
  Education: 'bg-blue-100 text-blue-700',
  Certificates: 'bg-yellow-100 text-yellow-700',
  Identity: 'bg-green-100 text-green-700',
  Finance: 'bg-purple-100 text-purple-700',
  Projects: 'bg-orange-100 text-orange-700',
  Personal: 'bg-pink-100 text-pink-700',
  Uncategorized: 'bg-gray-100 text-gray-600',
}

export const CATEGORY_BG: Record<FileCategory, string> = {
  Education: 'bg-blue-50',
  Certificates: 'bg-yellow-50',
  Identity: 'bg-green-50',
  Finance: 'bg-purple-50',
  Projects: 'bg-orange-50',
  Personal: 'bg-pink-50',
  Uncategorized: 'bg-gray-50',
}

export const CATEGORY_ICONS: Record<FileCategory, string> = {
  Education: '📚',
  Certificates: '🏆',
  Identity: '🪪',
  Finance: '💳',
  Projects: '🗂️',
  Personal: '👤',
  Uncategorized: '📁',
}

// ============================================================
// STRING UTILITIES
// ============================================================

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 3) + '...'
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// ============================================================
// STORAGE UTILITIES
// ============================================================

export function calculateStoragePercent(used: number, limit: number): number {
  if (limit === 0) return 0
  return Math.min(100, Math.round((used / limit) * 100))
}

export function getStorageColor(percent: number): string {
  if (percent >= 90) return 'text-danger'
  if (percent >= 75) return 'text-warning'
  return 'text-primary'
}

// ============================================================
// HASH UTILITY (for duplicate detection)
// ============================================================

export function hashFile(file: File, onProgress?: (pct: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../workers/hash.worker.ts', import.meta.url), { type: 'module' })
    
    worker.onmessage = (e) => {
      const { type, hash, progress, error } = e.data
      if (type === 'progress' && onProgress) {
        onProgress(progress)
      } else if (type === 'complete') {
        worker.terminate()
        resolve(hash)
      } else if (type === 'error') {
        worker.terminate()
        reject(new Error(error))
      }
    }
    
    worker.onerror = (err) => {
      worker.terminate()
      reject(err)
    }
    
    worker.postMessage({ file })
  })
}

// ============================================================
// VALIDATION
// ============================================================

export const MAX_FILE_SIZE = 5368709120 // 5 GB
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'video/mp4',
  'video/webm',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'application/x-zip-compressed',
]

export function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return `File size exceeds 100MB limit (${formatBytes(file.size)})`
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type) && file.type !== '') {
    return `File type not supported`
  }
  return null
}

// ============================================================
// CLASS NAME UTILITY
// ============================================================

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
