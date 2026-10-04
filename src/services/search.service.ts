// ============================================================
// SEARCH SERVICE — Client-side search over Firestore file metadata
// ============================================================
//
// Architecture:
//   - All files are loaded via the existing subscribeToFiles real-time listener
//   - This service performs client-side filtering, scoring, and ranking
//   - Searchable text from AI metadata is included when available
//   - No external search engine; no cross-user queries
// ============================================================

import type { LockerFile, FileCategory, SearchFilters, SearchResult, FileType } from '@/types'
import { getFileType, getMimeTypeLabel } from '@/utils'

// ── Search Configuration ──────────────────────────────────────────────────────

const RELEVANCE_WEIGHTS = {
  exactNameMatch: 100,
  nameStartsWith: 80,
  nameContains: 60,
  folderNameMatch: 40,
  categoryMatch: 30,
  mimeTypeMatch: 20,
  aiMetadataMatch: 50,
  searchableTextMatch: 45,
} as const

// ── Main Search Function ──────────────────────────────────────────────────────

export interface AdvancedSearchFilters extends SearchFilters {
  fileTypeFilter?: FileType | ''
  sortField?: 'name' | 'size' | 'uploadedAt' | 'category' | 'relevance'
  sortDirection?: 'asc' | 'desc'
}

export interface AdvancedSearchResult extends SearchResult {
  matchReasons: string[]
}

/**
 * Performs a full client-side search across the user's loaded file metadata.
 * This function is pure: no Firestore calls, no side effects.
 * The UI passes in the already-subscribed files array.
 */
export function searchFiles(
  files: LockerFile[],
  filters: AdvancedSearchFilters
): AdvancedSearchResult[] {
  const query = (filters.query ?? '').trim().toLowerCase()
  const hasQuery = query.length > 0

  // Step 1: Apply structural filters (non-text)
  let candidates = files.filter(f => {
    // Category filter
    if (filters.category && f.category !== filters.category) return false

    // Folder filter
    if (filters.folderId !== undefined && filters.folderId !== '') {
      if (filters.folderId === '__root__') {
        // Root = no folder assigned
        if (f.folderId) return false
      } else {
        if (f.folderId !== filters.folderId) return false
      }
    }

    // File type filter
    if (filters.fileTypeFilter) {
      if (getFileType(f.mimeType) !== filters.fileTypeFilter) return false
    }

    // Date range filter
    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom)
      from.setHours(0, 0, 0, 0)
      if (f.uploadedAt < from) return false
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo)
      to.setHours(23, 59, 59, 999)
      if (f.uploadedAt > to) return false
    }

    return true
  })

  // Step 2: Score each candidate against the text query
  let results: AdvancedSearchResult[] = candidates.map(file => {
    let relevance = 0
    const matchedFields: string[] = []
    const matchReasons: string[] = []

    if (!hasQuery) {
      // No text query — all structurally-matched files pass
      return { file, relevance: 0, matchedFields: [], matchReasons: [] }
    }

    const nameLower = file.name.toLowerCase()

    // Exact filename match
    if (nameLower === query) {
      relevance += RELEVANCE_WEIGHTS.exactNameMatch
      matchedFields.push('name')
      matchReasons.push('Exact filename match')
    } else if (nameLower.startsWith(query)) {
      relevance += RELEVANCE_WEIGHTS.nameStartsWith
      matchedFields.push('name')
      matchReasons.push('Matched in filename')
    } else if (nameLower.includes(query)) {
      relevance += RELEVANCE_WEIGHTS.nameContains
      matchedFields.push('name')
      matchReasons.push('Matched in filename')
    }

    // Folder name match
    if (file.folderName && file.folderName.toLowerCase().includes(query)) {
      relevance += RELEVANCE_WEIGHTS.folderNameMatch
      matchedFields.push('folderName')
      matchReasons.push('Matched in folder name')
    }

    // Category match
    if (file.category.toLowerCase().includes(query)) {
      relevance += RELEVANCE_WEIGHTS.categoryMatch
      matchedFields.push('category')
      matchReasons.push('Matched in category')
    }

    // MIME type / file type label match
    const typeLabel = getMimeTypeLabel(file.mimeType).toLowerCase()
    if (typeLabel.includes(query) || file.mimeType.toLowerCase().includes(query)) {
      relevance += RELEVANCE_WEIGHTS.mimeTypeMatch
      matchedFields.push('mimeType')
      matchReasons.push('Matched in file type')
    }

    // AI metadata fields
    if (file.aiMetadata) {
      const ai = file.aiMetadata
      const aiFields = [
        ai.documentType,
        ai.suggestedCategory,
        ai.suggestedFileName,
        ...(ai.extractedDates ?? []),
      ].filter(Boolean)

      for (const field of aiFields) {
        if (field!.toLowerCase().includes(query)) {
          relevance += RELEVANCE_WEIGHTS.aiMetadataMatch
          matchedFields.push('aiMetadata')
          matchReasons.push('Matched in document metadata')
          break // Only count AI metadata once
        }
      }
    }

    // Searchable text (from AI document processing, when available)
    const searchableText = (file as any).searchableText as string | undefined
    if (searchableText && searchableText.toLowerCase().includes(query)) {
      relevance += RELEVANCE_WEIGHTS.searchableTextMatch
      matchedFields.push('searchableText')
      matchReasons.push('Matched in document text')
    }

    return { file, relevance, matchedFields, matchReasons }
  })

  // Step 3: If there's a text query, filter out zero-relevance results
  if (hasQuery) {
    results = results.filter(r => r.relevance > 0)
  }

  // Step 4: Sort
  const sortField = filters.sortField ?? (hasQuery ? 'relevance' : 'uploadedAt')
  const sortDir = filters.sortDirection ?? (sortField === 'relevance' ? 'desc' : 'desc')
  const dirMultiplier = sortDir === 'asc' ? 1 : -1

  results.sort((a, b) => {
    if (sortField === 'relevance') {
      return (b.relevance - a.relevance) || (b.file.uploadedAt.getTime() - a.file.uploadedAt.getTime())
    }
    if (sortField === 'name') return a.file.name.localeCompare(b.file.name) * dirMultiplier
    if (sortField === 'size') return (a.file.size - b.file.size) * dirMultiplier
    if (sortField === 'category') return a.file.category.localeCompare(b.file.category) * dirMultiplier
    // uploadedAt (default)
    return (a.file.uploadedAt.getTime() - b.file.uploadedAt.getTime()) * dirMultiplier
  })

  return results
}

// ── Filter State Helpers ──────────────────────────────────────────────────────

export function createEmptyFilters(): AdvancedSearchFilters {
  return {
    query: '',
    category: undefined,
    folderId: undefined,
    fileTypeFilter: '',
    dateFrom: undefined,
    dateTo: undefined,
    sortField: 'uploadedAt',
    sortDirection: 'desc',
  }
}

export function hasActiveFilters(filters: AdvancedSearchFilters): boolean {
  return !!(
    filters.query ||
    filters.category ||
    (filters.folderId !== undefined && filters.folderId !== '') ||
    filters.fileTypeFilter ||
    filters.dateFrom ||
    filters.dateTo
  )
}

export function countActiveFilters(filters: AdvancedSearchFilters): number {
  let count = 0
  if (filters.query) count++
  if (filters.category) count++
  if (filters.folderId !== undefined && filters.folderId !== '') count++
  if (filters.fileTypeFilter) count++
  if (filters.dateFrom || filters.dateTo) count++
  return count
}

// ── File Type Options ─────────────────────────────────────────────────────────

export const FILE_TYPE_OPTIONS: { value: FileType | ''; label: string }[] = [
  { value: '', label: 'All types' },
  { value: 'pdf', label: 'PDF' },
  { value: 'image', label: 'Images' },
  { value: 'video', label: 'Videos' },
  { value: 'audio', label: 'Audio' },
  { value: 'document', label: 'Documents' },
  { value: 'spreadsheet', label: 'Spreadsheets' },
  { value: 'presentation', label: 'Presentations' },
  { value: 'archive', label: 'Archives' },
  { value: 'other', label: 'Other' },
]
