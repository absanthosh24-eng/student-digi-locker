import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Upload, LayoutList, LayoutGrid, SlidersHorizontal, X, Trash2, FolderInput,
  Search, Filter, Calendar, FileType as FileTypeIcon2, ChevronDown, ChevronUp, Tag,
} from 'lucide-react'
import { useAuth, useUpload, useToast, usePreferences } from '@/store'
import { subscribeToFiles, deleteFile, moveFile } from '@/services/files.service'
import { subscribeToFolders } from '@/services/folders.service'
import {
  searchFiles, createEmptyFilters, hasActiveFilters, countActiveFilters,
  FILE_TYPE_OPTIONS,
  type AdvancedSearchFilters, type AdvancedSearchResult,
} from '@/services/search.service'
import { LockerFile, FileCategory, ViewMode, SortField, SortDirection, Folder, FileType } from '@/types'
import { CATEGORIES, cn, formatBytes, formatDate, getFileExtension, CATEGORY_COLORS, getFileType } from '@/utils'
import { Button, Select, Badge } from '@/components/ui'
import { FileRowSkeleton } from '@/components/ui/Skeleton'
import EmptyState from '@/components/common/EmptyState'
import FileActionsMenu from '@/components/files/FileActionsMenu'
import Modal, { ConfirmationDialog } from '@/components/ui/Modal'
import ShareDialog from '@/components/sharing/ShareDialog'
import PreviewModal from '@/components/preview/PreviewModal'
import RenameDialog from '@/components/files/RenameDialog'

// ── File Type Icon ────────────────────────────────────────────────────────────

function FileTypeIconBox({ mimeType, name }: { mimeType: string; name: string }) {
  const ext = getFileExtension(name)
  const colors: Record<string, string> = {
    'application/pdf': 'bg-red-100 text-red-600',
    'image/': 'bg-purple-100 text-purple-600',
    'video/': 'bg-blue-100 text-blue-600',
    'audio/': 'bg-green-100 text-green-600',
  }
  const colorKey = Object.keys(colors).find(k => mimeType.startsWith(k))
  const color = colorKey ? colors[colorKey] : 'bg-primary-muted text-primary'
  return (
    <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-[0.6rem] font-bold', color)}>
      {ext}
    </div>
  )
}

// ── Search Result Row ─────────────────────────────────────────────────────────

function SearchFileRow({ result, isSelected, onToggleSelect, onPreview, onRename, onShare, onDelete, showMatchReason }: {
  result: AdvancedSearchResult
  isSelected: boolean
  onToggleSelect: (id: string, selected: boolean) => void
  onPreview: (f: LockerFile) => void
  onRename: (f: LockerFile) => void
  onShare: (f: LockerFile) => void
  onDelete: (f: LockerFile) => void
  showMatchReason: boolean
}) {
  const { file, matchReasons } = result
  return (
    <div className={cn("flex items-center gap-3 px-4 py-3 hover:bg-surface-muted transition-colors group cursor-pointer", isSelected && "bg-primary-muted/10")}
      onClick={() => onPreview(file)}>
      <div onClick={e => e.stopPropagation()} className="flex items-center mr-1">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onToggleSelect(file.id, e.target.checked)}
          className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary cursor-pointer"
        />
      </div>
      <FileTypeIconBox mimeType={file.mimeType} name={file.name} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
        <div className="flex items-center gap-2">
          <p className="text-xs text-gray-400 hidden sm:block">{formatBytes(file.size)}</p>
          {showMatchReason && matchReasons.length > 0 && (
            <span className="text-[0.6rem] text-primary bg-primary-muted px-1.5 py-0.5 rounded-full hidden sm:inline-block">
              {matchReasons[0]}
            </span>
          )}
        </div>
      </div>
      {file.folderName && (
        <span className="hidden xl:block text-xs text-gray-400 truncate max-w-[100px]" title={file.folderName}>
          📁 {file.folderName}
        </span>
      )}
      <div className="hidden md:flex">
        <Badge className={cn('text-[0.65rem]', CATEGORY_COLORS[file.category])}>{file.category}</Badge>
      </div>
      <p className="text-xs text-gray-400 hidden lg:block w-24 text-right flex-shrink-0">{formatDate(file.uploadedAt)}</p>
      {file.isShared && <Badge variant="info" dot className="hidden xl:flex">Shared</Badge>}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
        <FileActionsMenu file={file} onPreview={onPreview} onRename={onRename} onShare={onShare} onDelete={onDelete} />
      </div>
    </div>
  )
}

// ── Search Result Grid Card ───────────────────────────────────────────────────

function SearchFileGridCard({ result, isSelected, onToggleSelect, onPreview, onRename, onShare, onDelete, showMatchReason }: {
  result: AdvancedSearchResult
  isSelected: boolean
  onToggleSelect: (id: string, selected: boolean) => void
  onPreview: (f: LockerFile) => void
  onRename: (f: LockerFile) => void
  onShare: (f: LockerFile) => void
  onDelete: (f: LockerFile) => void
  showMatchReason: boolean
}) {
  const { file, matchReasons } = result
  return (
    <div className={cn("bg-white border rounded-xl p-4 hover:shadow-md transition-all cursor-pointer group relative", isSelected ? "border-primary ring-1 ring-primary bg-primary-muted/5" : "border-surface-border")}
      onClick={() => onPreview(file)}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div onClick={e => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => onToggleSelect(file.id, e.target.checked)}
              className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary cursor-pointer mt-1"
            />
          </div>
          <FileTypeIconBox mimeType={file.mimeType} name={file.name} />
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
          <FileActionsMenu file={file} onPreview={onPreview} onRename={onRename} onShare={onShare} onDelete={onDelete} />
        </div>
      </div>
      <p className="text-sm font-medium text-gray-900 truncate mb-1">{file.name}</p>
      <p className="text-xs text-gray-400 mb-2">{formatBytes(file.size)}</p>
      <div className="flex items-center gap-1 flex-wrap">
        <Badge className={cn('text-[0.6rem]', CATEGORY_COLORS[file.category])}>{file.category}</Badge>
        {file.isShared && <Badge variant="info" dot className="text-[0.6rem]">Shared</Badge>}
      </div>
      {showMatchReason && matchReasons.length > 0 && (
        <p className="text-[0.6rem] text-primary mt-2 truncate">{matchReasons[0]}</p>
      )}
    </div>
  )
}

// ── Advanced Filter Panel ─────────────────────────────────────────────────────

function AdvancedFilterPanel({ filters, folders, onUpdate, onClear }: {
  filters: AdvancedSearchFilters
  folders: Folder[]
  onUpdate: (patch: Partial<AdvancedSearchFilters>) => void
  onClear: () => void
}) {
  const categoryOptions = [
    { value: '', label: 'All categories' },
    ...CATEGORIES.map(c => ({ value: c, label: c })),
  ]

  const folderOptions = [
    { value: '', label: 'All folders' },
    { value: '__root__', label: 'Root (My Files)' },
    ...folders.map(f => ({ value: f.id, label: f.name })),
  ]

  const sortOptions = [
    { value: 'relevance', label: 'Relevance' },
    { value: 'uploadedAt', label: 'Date' },
    { value: 'name', label: 'Name' },
    { value: 'size', label: 'Size' },
    { value: 'category', label: 'Category' },
  ]

  const sortDirOptions = [
    { value: 'desc', label: 'Descending' },
    { value: 'asc', label: 'Ascending' },
  ]

  return (
    <div className="bg-white border border-surface-border rounded-xl p-4 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-gray-900">Advanced Filters</h3>
        </div>
        <button
          onClick={onClear}
          className="text-xs text-gray-500 hover:text-danger transition-colors flex items-center gap-1"
        >
          <X className="h-3 w-3" /> Clear all
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Category */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
            <Tag className="h-3 w-3" /> Category
          </label>
          <Select
            options={categoryOptions}
            value={filters.category ?? ''}
            onChange={e => onUpdate({ category: (e.target.value || undefined) as FileCategory | undefined })}
            className="text-xs"
          />
        </div>

        {/* Folder */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
            <FolderInput className="h-3 w-3" /> Folder
          </label>
          <Select
            options={folderOptions}
            value={filters.folderId ?? ''}
            onChange={e => onUpdate({ folderId: e.target.value || undefined })}
            className="text-xs"
          />
        </div>

        {/* File Type */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
            <FileTypeIcon2 className="h-3 w-3" /> File Type
          </label>
          <Select
            options={FILE_TYPE_OPTIONS}
            value={filters.fileTypeFilter ?? ''}
            onChange={e => onUpdate({ fileTypeFilter: (e.target.value || '') as FileType | '' })}
            className="text-xs"
          />
        </div>

        {/* Date Range */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Upload Date
          </label>
          <div className="flex gap-1">
            <input
              type="date"
              value={filters.dateFrom ? new Date(filters.dateFrom).toISOString().split('T')[0] : ''}
              onChange={e => onUpdate({ dateFrom: e.target.value ? new Date(e.target.value) : undefined })}
              className="w-full rounded-lg border border-surface-border bg-white px-2 py-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="From"
            />
            <input
              type="date"
              value={filters.dateTo ? new Date(filters.dateTo).toISOString().split('T')[0] : ''}
              onChange={e => onUpdate({ dateTo: e.target.value ? new Date(e.target.value) : undefined })}
              className="w-full rounded-lg border border-surface-border bg-white px-2 py-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="To"
            />
          </div>
        </div>
      </div>

      {/* Sort controls */}
      <div className="flex items-center gap-3 pt-1 border-t border-surface-border">
        <span className="text-xs text-gray-500">Sort by:</span>
        <Select
          options={sortOptions}
          value={filters.sortField ?? 'uploadedAt'}
          onChange={e => onUpdate({ sortField: e.target.value as AdvancedSearchFilters['sortField'] })}
          className="w-28 text-xs"
        />
        <Select
          options={sortDirOptions}
          value={filters.sortDirection ?? 'desc'}
          onChange={e => onUpdate({ sortDirection: e.target.value as 'asc' | 'desc' })}
          className="w-28 text-xs"
        />
      </div>

      {/* Active filter pills */}
      {hasActiveFilters(filters) && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {filters.query && (
            <FilterPill label={`"${filters.query}"`} onRemove={() => onUpdate({ query: '' })} />
          )}
          {filters.category && (
            <FilterPill label={filters.category} onRemove={() => onUpdate({ category: undefined })} />
          )}
          {filters.folderId && (
            <FilterPill
              label={filters.folderId === '__root__' ? 'Root' : (folders.find(f => f.id === filters.folderId)?.name ?? 'Folder')}
              onRemove={() => onUpdate({ folderId: undefined })}
            />
          )}
          {filters.fileTypeFilter && (
            <FilterPill
              label={FILE_TYPE_OPTIONS.find(o => o.value === filters.fileTypeFilter)?.label ?? filters.fileTypeFilter}
              onRemove={() => onUpdate({ fileTypeFilter: '' })}
            />
          )}
          {(filters.dateFrom || filters.dateTo) && (
            <FilterPill
              label={`${filters.dateFrom ? formatDate(filters.dateFrom) : '…'} – ${filters.dateTo ? formatDate(filters.dateTo) : '…'}`}
              onRemove={() => onUpdate({ dateFrom: undefined, dateTo: undefined })}
            />
          )}
        </div>
      )}
    </div>
  )
}

function FilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary-muted text-primary text-[0.65rem] font-medium">
      {label}
      <button onClick={onRemove} className="hover:text-danger transition-colors">
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MyFilesPage() {
  const { user } = useAuth()
  const { addFiles } = useUpload()
  const { showSuccess, showError } = useToast()
  const [searchParams] = useSearchParams()
  const [files, setFiles] = useState<LockerFile[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(true)
  const { prefs } = usePreferences()
  const [viewMode, setViewMode] = useState<ViewMode>(prefs.defaultView)

  const [fileToDelete, setFileToDelete] = useState<LockerFile | null>(null)
  const [fileToShare, setFileToShare] = useState<LockerFile | null>(null)
  const [fileToPreview, setFileToPreview] = useState<LockerFile | null>(null)
  const [fileToRename, setFileToRename] = useState<LockerFile | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Bulk state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBulkDelete, setShowBulkDelete] = useState(false)
  const [showBulkMove, setShowBulkMove] = useState(false)
  const [bulkProcessing, setBulkProcessing] = useState(false)
  const [selectedMoveFolder, setSelectedMoveFolder] = useState<string>('')

  // Advanced search state
  const [filters, setFilters] = useState<AdvancedSearchFilters>(() => ({
    ...createEmptyFilters(),
    sortField: prefs.defaultSort,
    query: searchParams.get('q') ?? '',
  }))
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  const updateFilters = useCallback((patch: Partial<AdvancedSearchFilters>) => {
    setFilters(prev => ({ ...prev, ...patch }))
  }, [])

  const clearAllFilters = useCallback(() => {
    setFilters(createEmptyFilters())
  }, [])

  useEffect(() => {
    if (!user) return
    const unsub = subscribeToFiles(user.uid, (allFiles) => {
      setFiles(allFiles)
      setLoading(false)
    })
    return unsub
  }, [user])

  useEffect(() => {
    if (!user) return
    const unsub = subscribeToFolders(user.uid, (allFolders) => {
      setFolders(allFolders)
    })
    return unsub
  }, [user])

  // Search results via service
  const searchResults = useMemo(() =>
    searchFiles(files, filters),
    [files, filters]
  )

  const hasQuery = !!filters.query
  const activeFilterCount = countActiveFilters(filters)
  const isFiltered = hasActiveFilters(filters)

  const visibleIds = useMemo(() => new Set(searchResults.map(r => r.file.id)), [searchResults])
  const visibleSelectedCount = searchResults.filter(r => selectedIds.has(r.file.id)).length
  const allVisibleSelected = searchResults.length > 0 && visibleSelectedCount === searchResults.length

  const handleToggleSelect = useCallback((id: string, selected: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (selected) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  const handleToggleSelectAll = useCallback((selected: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (selected) {
        searchResults.forEach(r => next.add(r.file.id))
      } else {
        searchResults.forEach(r => next.delete(r.file.id))
      }
      return next
    })
  }, [searchResults])

  const handleDelete = async () => {
    if (!fileToDelete || !user) return
    setDeleting(true)
    try {
      await deleteFile(user.uid, fileToDelete.id)
      showSuccess('File deleted', `"${fileToDelete.name}" moved to Recycle Bin.`)
      setFileToDelete(null)
    } catch {
      showError('Delete failed', 'Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  const handleBulkDelete = async () => {
    if (!user) return
    setBulkProcessing(true)
    const ids = Array.from(selectedIds)
    const results = await Promise.allSettled(ids.map(id => deleteFile(user.uid, id)))
    const failed = results.filter(r => r.status === 'rejected')

    if (failed.length === 0) {
      showSuccess('Files deleted', `${ids.length} files moved to Recycle Bin.`)
      setSelectedIds(new Set())
    } else if (failed.length === ids.length) {
      showError('Delete failed', 'Could not delete files.')
    } else {
      showError('Partial success', `${failed.length} of ${ids.length} files could not be deleted.`)
      const successfulIds = new Set(results.map((r, i) => r.status === 'fulfilled' ? ids[i] : null).filter(Boolean))
      setSelectedIds(prev => new Set(Array.from(prev).filter(id => !successfulIds.has(id))))
    }
    setBulkProcessing(false)
    setShowBulkDelete(false)
  }

  const handleBulkMove = async () => {
    if (!user) return
    setBulkProcessing(true)
    const targetFolder = folders.find(f => f.id === selectedMoveFolder)
    const folderName = targetFolder ? targetFolder.name : undefined
    const folderId = selectedMoveFolder === 'root' ? undefined : (selectedMoveFolder || undefined)

    const ids = Array.from(selectedIds)
    const results = await Promise.allSettled(ids.map(id => moveFile(user.uid, id, folderId, folderName)))
    const failed = results.filter(r => r.status === 'rejected')

    if (failed.length === 0) {
      showSuccess('Files moved', `${ids.length} files successfully moved.`)
      setSelectedIds(new Set())
    } else if (failed.length === ids.length) {
      showError('Move failed', 'Could not move files.')
    } else {
      showError('Partial success', `${failed.length} of ${ids.length} files could not be moved.`)
      const successfulIds = new Set(results.map((r, i) => r.status === 'fulfilled' ? ids[i] : null).filter(Boolean))
      setSelectedIds(prev => new Set(Array.from(prev).filter(id => !successfulIds.has(id))))
    }
    setBulkProcessing(false)
    setShowBulkMove(false)
  }

  const fileInput = useCallback((el: HTMLInputElement | null) => {
    if (!el) return
    el.onchange = (e) => {
      const target = e.target as HTMLInputElement
      const selected = Array.from(target.files ?? [])
      if (selected.length) addFiles(selected)
      target.value = ''
    }
  }, [addFiles])

  const moveFolderOptions = [
    { value: 'root', label: 'Root (My Files)' },
    ...folders.map(f => ({ value: f.id, label: f.name }))
  ]

  return (
    <div className="p-5 lg:p-7 max-w-6xl mx-auto space-y-4">
      {/* Header / Bulk Actions */}
      {selectedIds.size > 0 ? (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-primary-muted/10 border border-primary/20 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedIds(new Set())} className="p-1.5 hover:bg-white rounded-lg transition-colors">
              <X className="h-5 w-5 text-gray-600" />
            </button>
            <span className="font-semibold text-primary">{selectedIds.size} file{selectedIds.size !== 1 ? 's' : ''} selected</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" leftIcon={<FolderInput className="h-4 w-4" />} onClick={() => setShowBulkMove(true)}>
              Move
            </Button>
            <Button variant="danger" size="sm" leftIcon={<Trash2 className="h-4 w-4" />} onClick={() => setShowBulkDelete(true)}>
              Delete
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-h1 text-gray-900">My Files</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {isFiltered
                ? `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''} found`
                : `${files.length} file${files.length !== 1 ? 's' : ''}`
              }
            </p>
          </div>
          <label className="cursor-pointer">
            <input ref={fileInput} type="file" multiple className="hidden" />
            <Button leftIcon={<Upload className="h-4 w-4" />}>Upload Files</Button>
          </label>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="search"
            placeholder="Search files, content, metadata…"
            value={filters.query}
            onChange={e => updateFilters({ query: e.target.value })}
            className="w-full rounded-lg border border-surface-border bg-white pl-9 pr-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <button
          onClick={() => setShowAdvancedFilters(prev => !prev)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors',
            showAdvancedFilters || isFiltered
              ? 'border-primary bg-primary-muted text-primary'
              : 'border-surface-border bg-white text-gray-500 hover:bg-gray-50'
          )}
        >
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">Filters</span>
          {activeFilterCount > 0 && (
            <span className="bg-primary text-white text-[0.6rem] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
          {showAdvancedFilters ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        <div className="flex rounded-lg border border-surface-border overflow-hidden">
          <button
            onClick={() => setViewMode('list')}
            className={cn('p-2 transition-colors', viewMode === 'list' ? 'bg-primary text-white' : 'bg-white text-gray-500 hover:bg-gray-50')}
            aria-label="List view"
          >
            <LayoutList className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={cn('p-2 transition-colors', viewMode === 'grid' ? 'bg-primary text-white' : 'bg-white text-gray-500 hover:bg-gray-50')}
            aria-label="Grid view"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>

        {isFiltered && (
          <button
            onClick={clearAllFilters}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-danger transition-colors"
          >
            <X className="h-3.5 w-3.5" /> Clear all
          </button>
        )}
      </div>

      {/* Advanced Filters Panel */}
      {showAdvancedFilters && (
        <AdvancedFilterPanel
          filters={filters}
          folders={folders}
          onUpdate={updateFilters}
          onClear={clearAllFilters}
        />
      )}

      {/* Results */}
      {loading ? (
        <div className="bg-white rounded-xl border border-surface-border divide-y divide-surface-border">
          {[...Array(6)].map((_, i) => <FileRowSkeleton key={i} />)}
        </div>
      ) : searchResults.length === 0 ? (
        <EmptyState
          icon={<SlidersHorizontal className="h-6 w-6" />}
          title={isFiltered ? 'No matching files' : 'No files yet'}
          description={isFiltered
            ? 'Try adjusting your search or filters.'
            : 'Upload your first file to get started.'
          }
          action={isFiltered
            ? { label: 'Clear all filters', onClick: clearAllFilters }
            : undefined}
        />
      ) : viewMode === 'list' ? (
        <div className="bg-white rounded-xl border border-surface-border overflow-hidden">
          {/* Table header */}
          <div className="flex items-center gap-3 px-4 py-2 bg-surface-muted border-b border-surface-border">
            <div className="flex items-center mr-1">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={(e) => handleToggleSelectAll(e.target.checked)}
                className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary cursor-pointer"
              />
            </div>
            <div className="w-9 flex-shrink-0" />
            <p className="flex-1 text-xs font-medium text-gray-500">Name</p>
            <p className="hidden md:block text-xs font-medium text-gray-500 w-24">Category</p>
            <p className="hidden lg:block text-xs font-medium text-gray-500 w-24 text-right">Date</p>
            <div className="w-9 flex-shrink-0" />
          </div>
          <div className="divide-y divide-surface-border">
            {searchResults.map(r => (
              <SearchFileRow key={r.file.id} result={r}
                isSelected={selectedIds.has(r.file.id)}
                onToggleSelect={handleToggleSelect}
                onPreview={setFileToPreview}
                onRename={setFileToRename}
                onShare={setFileToShare}
                onDelete={setFileToDelete}
                showMatchReason={hasQuery}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {searchResults.length > 0 && (
            <div className="col-span-full mb-1 flex items-center gap-2 pl-1">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={(e) => handleToggleSelectAll(e.target.checked)}
                className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary cursor-pointer"
              />
              <span className="text-sm text-gray-500">Select all</span>
            </div>
          )}
          {searchResults.map(r => (
            <SearchFileGridCard key={r.file.id} result={r}
              isSelected={selectedIds.has(r.file.id)}
              onToggleSelect={handleToggleSelect}
              onPreview={setFileToPreview}
              onRename={setFileToRename}
              onShare={setFileToShare}
              onDelete={setFileToDelete}
              showMatchReason={hasQuery}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <ConfirmationDialog
        isOpen={!!fileToDelete}
        title="Delete File"
        description={`Are you sure you want to delete "${fileToDelete?.name}"?`}
        consequence="The file will be moved to Recycle Bin and permanently deleted after 30 days."
        primaryLabel="Move to Recycle Bin"
        isLoading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setFileToDelete(null)}
      />

      <ConfirmationDialog
        isOpen={showBulkDelete}
        title={`Delete ${selectedIds.size} files`}
        description={`Are you sure you want to delete ${selectedIds.size} selected files?`}
        consequence="They will be moved to the Recycle Bin and permanently deleted after 30 days."
        primaryLabel="Move to Recycle Bin"
        isLoading={bulkProcessing}
        onConfirm={handleBulkDelete}
        onCancel={() => setShowBulkDelete(false)}
      />

      <Modal
        isOpen={showBulkMove}
        onClose={() => setShowBulkMove(false)}
        title={`Move ${selectedIds.size} files`}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Select a destination folder for the selected files.</p>
          <Select
            options={moveFolderOptions}
            value={selectedMoveFolder}
            onChange={(e) => setSelectedMoveFolder(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowBulkMove(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleBulkMove} isLoading={bulkProcessing}>Move Files</Button>
          </div>
        </div>
      </Modal>

      {fileToShare && (
        <ShareDialog file={fileToShare} onClose={() => setFileToShare(null)} />
      )}

      {fileToPreview && (
        <PreviewModal file={fileToPreview} onClose={() => setFileToPreview(null)} />
      )}

      {fileToRename && (
        <RenameDialog file={fileToRename} onClose={() => setFileToRename(null)} />
      )}
    </div>
  )
}
