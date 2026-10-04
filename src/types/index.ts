// ============================================================
// ALL APPLICATION TYPES
// ============================================================

export type UserRole = 'student'

export interface UserProfile {
  uid: string
  email: string
  displayName: string
  phoneNumber?: string
  collegeName?: string
  rollNumber?: string
  department?: string
  yearOfStudy?: string
  photoURL?: string
  emailVerified: boolean
  createdAt: Date
  updatedAt: Date
  storageUsed: number // bytes
  storageLimit: number // bytes
}

// ============================================================
// FILE TYPES
// ============================================================

export type FileStatus = 'active' | 'processing' | 'error'
export type FileCategory =
  | 'Education'
  | 'Certificates'
  | 'Identity'
  | 'Finance'
  | 'Projects'
  | 'Personal'
  | 'Uncategorized'

export interface LockerFile {
  id: string
  uid: string
  name: string
  originalName: string
  mimeType: string
  size: number // bytes
  storageUrl: string // never exposed directly to UI
  downloadUrl?: string // signed URL, temporary
  storageMode?: 'local' | 'cloud'
  storageKey?: string
  category: FileCategory
  folderId?: string
  folderName?: string
  uploadedAt: Date
  updatedAt: Date
  status: FileStatus
  isShared: boolean
  sharingStatus?: 'private' | 'shared'
  hash?: string // for duplicate detection
  // AI metadata
  aiMetadata?: AIMetadata
  searchableText?: string
  // Soft delete
  deletedAt?: Date
  autoDeleteAt?: Date // deletedAt + 30 days
}

export interface AIMetadata {
  documentType?: string
  suggestedCategory?: FileCategory
  categoryConfidence?: number // 0-100
  suggestedFileName?: string
  extractedDates?: string[]
  isSearchable?: boolean
  searchableText?: string
  extractionStatus?: 'processing' | 'completed' | 'partial' | 'unsupported' | 'failed'
  extractionError?: string
  processedAt?: Date
}

// ============================================================
// FOLDER TYPES
// ============================================================

export interface Folder {
  id: string
  uid: string
  name: string
  parentId?: string
  category?: FileCategory
  createdAt: Date
  updatedAt: Date
  fileCount?: number
  path?: string[] // breadcrumb
}

// ============================================================
// SHARING TYPES
// ============================================================

export type SharePermission = 'view' | 'view_download'
export type ShareType = 'account' | 'link'
export type ShareStatus = 'active' | 'expired' | 'revoked'

export interface ShareRecord {
  id: string
  fileId: string
  fileName: string
  ownerId: string
  ownerEmail?: string
  shareType: ShareType
  permission: SharePermission
  // For account shares
  recipientId?: string
  recipientEmail?: string
  recipientName?: string
  // For link shares
  linkToken?: string
  requiresLogin?: boolean
  expiresAt?: Date | null
  // Status
  status: ShareStatus
  createdAt: Date
  updatedAt: Date
  storageMode?: 'local' | 'cloud'
}

// ============================================================
// UPLOAD TYPES
// ============================================================

export type UploadStatus =
  | 'pending'
  | 'hashing'
  | 'analyzing' // document intelligence
  | 'checking_duplicate'
  | 'preparing'
  | 'uploading'
  | 'paused'
  | 'completing'
  | 'complete' // equivalent to 'completed'
  | 'error' // equivalent to 'failed'
  | 'duplicate'
  | 'cancelled'

export interface UploadItem {
  id: string
  file: File
  name: string
  category: FileCategory
  folderId?: string
  folderName?: string
  status: UploadStatus
  progress: number // 0-100
  uploadedBytes?: number
  totalBytes?: number
  error?: string
  aiSuggestion?: {
    category: FileCategory
    confidence: number
    documentType?: string
    suggestedFileName?: string
  }
  aiResult?: AIMetadata
  aiAccepted?: boolean
  duplicateInfo?: {
    existingFileId: string
    existingFileName: string
    existingFolderId?: string
    existingFolderName?: string
    existingCategory: FileCategory
  }
}

// ============================================================
// ACTIVITY TYPES
// ============================================================

export interface ActivityEntry {
  id: string
  uid: string
  type:
    | 'upload'
    | 'download'
    | 'delete'
    | 'restore'
    | 'share'
    | 'rename'
    | 'move'
    | 'login'
    | 'password_change'
    | 'email_change'
  description: string
  fileId?: string
  fileName?: string
  metadata?: Record<string, string>
  createdAt: Date
}

export interface LoginSession {
  id: string
  uid: string
  device: string
  browser: string
  os: string
  ipAddress: string
  location?: string
  loginAt: Date
  lastActiveAt: Date
  isCurrentSession: boolean
  status: 'active' | 'expired' | 'terminated'
}

// ============================================================
// SEARCH TYPES
// ============================================================

export interface SearchFilters {
  query: string
  category?: FileCategory
  folderId?: string
  fileType?: string
  dateFrom?: Date
  dateTo?: Date
  sharedOnly?: boolean
}

export interface SearchResult {
  file: LockerFile
  relevance: number
  matchedFields: string[]
}

// ============================================================
// UI TYPES & PREFERENCES
// ============================================================

export type ViewMode = 'list' | 'grid'
export type SortField = 'name' | 'size' | 'uploadedAt' | 'category'
export type SortDirection = 'asc' | 'desc'
export type ThemePreference = 'system' | 'light' | 'dark'

export interface UserPreferences {
  theme: ThemePreference
  defaultView: ViewMode
  defaultSort: SortField | 'relevance'
  compactMode: boolean
  aiSuggestionsEnabled: boolean
  postUploadBehavior: 'stay' | 'my-files'
}

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
}

export interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  description: string
  consequence?: string
  primaryLabel: string
  secondaryLabel?: string
  primaryVariant?: 'danger' | 'primary'
  isLoading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export type FileType = 'pdf' | 'image' | 'video' | 'audio' | 'document' | 'spreadsheet' | 'presentation' | 'archive' | 'other'
