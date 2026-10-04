import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Upload, CheckCircle, AlertCircle, Trash2, ChevronDown, ChevronUp, Sparkles, FileText, Check, Calendar, AlertTriangle } from 'lucide-react'
import { useUpload, useAuth, useToast, usePreferences } from '@/store'
import { ProgressBar, Badge, Select, Button, Input } from '@/components/ui'
import { CATEGORIES, cn, formatBytes, getFileExtension } from '@/utils'
import { FileCategory, UploadItem } from '@/types'
import { analyzeDocument } from '@/services/documentIntelligence.service'
import { uploadFile, replaceFile, checkDuplicate, checkNameConflict, saveCloudFileMetadata } from '@/services/files.service'
import { hashFile, validateFile } from '@/utils'
import { CloudUploadEngine } from '@/services/cloudUpload.service'
import Modal, { ConfirmationDialog } from '@/components/ui/Modal'

function statusIcon(status: UploadItem['status']) {
  if (status === 'complete') return <CheckCircle className="h-4 w-4 text-success" />
  if (status === 'error') return <AlertCircle className="h-4 w-4 text-danger" />
  if (status === 'cancelled') return <X className="h-4 w-4 text-gray-500" />
  if (['uploading', 'hashing', 'preparing', 'completing', 'checking_duplicate'].includes(status)) {
    return <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
  }
  if (status === 'analyzing') return <Sparkles className="h-4 w-4 text-ai animate-pulse-soft" />
  return null
}

function statusLabel(status: UploadItem['status']): string {
  const labels: Record<UploadItem['status'], string> = {
    pending: 'Pending',
    hashing: 'Hashing...',
    analyzing: 'Analyzing...',
    checking_duplicate: 'Checking duplicates...',
    preparing: 'Preparing upload...',
    uploading: 'Uploading...',
    paused: 'Paused',
    completing: 'Completing...',
    complete: 'Completed',
    error: 'Failed',
    duplicate: 'Duplicate found',
    cancelled: 'Cancelled',
  }
  return labels[status] ?? status
}

function AIReviewPanel({ item, onConfirm, onDismiss }: { item: UploadItem, onConfirm: (name: string, category: FileCategory) => void, onDismiss: () => void }) {
  const result = item.aiResult!
  const [name, setName] = useState(result.suggestedFileName || item.name)
  const [category, setCategory] = useState<FileCategory>(result.suggestedCategory || 'Uncategorized')

  return (
    <div className="bg-ai-muted/50 border border-ai-border rounded-xl p-3 mt-2 space-y-3">
      <div className="flex items-center gap-1.5 text-ai mb-1">
        <Sparkles className="h-4 w-4" />
        <h4 className="text-[0.7rem] font-bold uppercase tracking-wide">Document Intelligence</h4>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-white p-2 rounded-lg border border-surface-border flex flex-col gap-0.5">
          <span className="text-gray-400 text-[0.65rem] uppercase">Detected Type</span>
          <span className="font-medium text-gray-900">{result.documentType}</span>
        </div>
        <div className="bg-white p-2 rounded-lg border border-surface-border flex flex-col gap-0.5">
          <span className="text-gray-400 text-[0.65rem] uppercase">Confidence</span>
          <span className="font-medium text-purple-700">{result.categoryConfidence}%</span>
        </div>
      </div>

      {result.extractedDates && result.extractedDates.length > 0 && (
        <div className="flex items-center gap-1.5 text-[0.65rem] text-gray-600 bg-white px-2 py-1.5 rounded border border-surface-border">
          <Calendar className="h-3 w-3 text-primary" />
          <span>Dates found: <span className="font-medium text-gray-900">{result.extractedDates.join(', ')}</span></span>
        </div>
      )}

      {result.extractionStatus === 'completed' && result.isSearchable && (
        <div className="flex items-center gap-1.5 text-[0.65rem] text-success bg-success-muted/50 px-2 py-1.5 rounded border border-green-100">
          <FileText className="h-3 w-3" />
          <span>Text extracted for advanced search</span>
        </div>
      )}

      {(result.extractionStatus === 'partial' || result.extractionStatus === 'unsupported' || result.extractionStatus === 'failed') && (
        <div className="flex items-center gap-1.5 text-[0.65rem] text-warning bg-warning-muted/50 px-2 py-1.5 rounded border border-yellow-100">
          <AlertTriangle className="h-3 w-3" />
          <span>{result.extractionError || 'Text extraction unavailable'}</span>
        </div>
      )}

      <div className="space-y-2 pt-1 border-t border-surface-border/50">
        <div className="space-y-1">
          <label className="text-[0.65rem] text-gray-500 font-medium">Suggested Filename</label>
          <Input value={name} onChange={e => setName(e.target.value)} className="h-7 text-xs px-2" />
        </div>
        <div className="space-y-1">
          <label className="text-[0.65rem] text-gray-500 font-medium">Suggested Category</label>
          <Select
            options={CATEGORIES.map(c => ({ value: c, label: c }))}
            value={category}
            onChange={e => setCategory(e.target.value as FileCategory)}
            className="h-7 text-xs px-2 py-0"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" size="sm" onClick={onDismiss} className="text-xs h-7">Dismiss</Button>
        <Button variant="primary" size="sm" onClick={() => onConfirm(name, category)} className="text-xs h-7" leftIcon={<Check className="h-3 w-3" />}>Confirm & Save</Button>
      </div>
    </div>
  )
}

function UploadItemRow({ item }: { item: UploadItem }) {
  const { updateItem, removeItem } = useUpload()
  const ext = getFileExtension(item.file.name)

  const handleConfirmAI = (name: string, category: FileCategory) => {
    updateItem(item.id, {
      name,
      category,
      aiAccepted: true,
      status: 'pending' // Ready for upload
    })
  }

  const handleDismissAI = () => {
    updateItem(item.id, {
      aiAccepted: true,
      status: 'pending' // Ready for upload
    })
  }

  const needsReview = item.status === 'paused' && item.aiResult && !item.aiAccepted

  return (
    <div className={cn("border rounded-xl p-3 space-y-2.5 bg-white transition-colors", needsReview ? "border-ai-border shadow-sm ring-1 ring-ai-border/50" : "border-surface-border")}>
      <div className="flex items-start gap-2.5">
        <div className="w-9 h-9 rounded-lg bg-primary-muted flex items-center justify-center flex-shrink-0">
          <span className="text-[0.6rem] font-bold text-primary">{ext}</span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-900 truncate">{item.name}</p>
          <p className="text-[0.65rem] text-gray-400">{formatBytes(item.file.size)}</p>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {statusIcon(item.status)}
          <button
            onClick={() => removeItem(item.id)}
            className="p-1 rounded text-gray-400 hover:text-danger transition-colors"
            aria-label="Remove"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {needsReview && (
        <AIReviewPanel item={item} onConfirm={handleConfirmAI} onDismiss={handleDismissAI} />
      )}

      {!needsReview && item.status === 'pending' && (
        <Select
          options={CATEGORIES.map(c => ({ value: c, label: c }))}
          value={item.category}
          onChange={e => updateItem(item.id, { category: e.target.value as FileCategory })}
          className="text-xs py-1.5"
        />
      )}

      {item.status === 'uploading' && (
        <ProgressBar value={item.progress} size="sm" showLabel />
      )}

      <p className={cn(
        'text-[0.65rem] font-medium',
        item.status === 'complete' ? 'text-success' :
        item.status === 'error' ? 'text-danger' : 'text-gray-400'
      )}>
        {statusLabel(item.status)}
        {item.error && ` — ${item.error}`}
      </p>
    </div>
  )
}

// Ensure Input supports bsSize if used
const OriginalInput = Input
const InputWithSize = (props: any) => <OriginalInput {...props} />

export default function UploadQueuePanel() {
  const { items, isQueueOpen, closeQueue, clearCompleted, updateItem } = useUpload()
  const { user } = useAuth()
  const { showSuccess, showError } = useToast()
  const { prefs } = usePreferences()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [uploading, setUploading] = useState(false)

  type DecisionType = 'cancel' | 'upload_anyway' | 'replace' | 'open'
  type Conflict = {
    type: 'duplicate' | 'replace'
    item: UploadItem
    existingFile: any
    resolve: (val: DecisionType) => void
  }
  const [conflicts, setConflicts] = useState<Conflict[]>([])

  if (!isQueueOpen || items.length === 0) return null

  // A file is ready to upload if it is pending and has either been AI-reviewed or AI is skipped/failed
  const pendingItemsToUpload = items.filter(i => i.status === 'pending')
  const pendingItemsToAnalyze = items.filter(i => i.status === 'pending' && !i.aiResult && !i.aiAccepted)
  const pendingItemsReadyToUpload = items.filter(i => i.status === 'pending' && (i.aiAccepted || i.aiResult === null)) // null implies failed analysis

  const completedItems = items.filter(i => ['complete', 'cancelled', 'error'].includes(i.status))
  
  // Is any item currently analyzing or uploading?
  const isWorking = items.some(i => ['analyzing', 'uploading'].includes(i.status))

  const askUserDecision = (type: 'duplicate' | 'replace', item: UploadItem, existingFile: any): Promise<DecisionType> => {
    return new Promise(resolve => {
      setConflicts(prev => [...prev, { type, item, existingFile, resolve }])
    })
  }

  const processUploadPipeline = async () => {
    if (!user) return
    setUploading(true)

    // Phase 1: AI Analysis (process files that need it and pause them for review)
    let needsReviewCount = 0
    await Promise.all(pendingItemsToAnalyze.map(async (item) => {
      const validErr = validateFile(item.file)
      if (validErr) {
        updateItem(item.id, { status: 'error', error: validErr })
        return
      }

      updateItem(item.id, { status: 'analyzing' })
      try {
        const aiResult = await analyzeDocument(item.file)
        if (!prefs.aiSuggestionsEnabled) {
           // Auto-accept AI results if user prefers not to review manually
           updateItem(item.id, {
             aiResult,
             name: aiResult.suggestedFileName || item.name,
             category: aiResult.suggestedCategory || item.category,
             aiAccepted: true,
             status: 'pending'
           })
        } else {
          updateItem(item.id, {
            aiResult,
            status: 'paused', // Pause to wait for user confirmation
          })
          needsReviewCount++
        }
      } catch {
        // Fallback silently and proceed to upload
        updateItem(item.id, { status: 'pending', aiAccepted: true })
      }
    }))

    if (needsReviewCount > 0) {
      setUploading(false)
      if (collapsed) setCollapsed(false)
      // We stop here to let the user review the AI suggestions
      return
    }

    // Phase 2: Upload Files (process files that are ready)
    await Promise.all(pendingItemsReadyToUpload.map(async (item) => {
      // Duplicate / Replace checks
      try {
        updateItem(item.id, { status: 'hashing', progress: 0 })
        const hash = await hashFile(item.file, (pct) => updateItem(item.id, { progress: pct, status: 'hashing' }))
        updateItem(item.id, { status: 'checking_duplicate' })
        const dup = await checkDuplicate(user.uid, hash)
        
        let shouldUpload = true
        let finalHash = hash
        
        if (dup) {
          updateItem(item.id, { status: 'duplicate' })
          const decision = await askUserDecision('duplicate', item, dup)
          
          if (decision === 'cancel') {
            updateItem(item.id, { status: 'cancelled' })
            return
          } else if (decision === 'open') {
            updateItem(item.id, { status: 'cancelled' })
            navigate('/files')
            return
          } else if (decision === 'upload_anyway') {
            shouldUpload = true
          }
        } else {
          const nameConflict = await checkNameConflict(user.uid, item.name, item.folderId)
          if (nameConflict) {
            updateItem(item.id, { status: 'duplicate' }) // Uses yellow icon
            const decision = await askUserDecision('replace', item, nameConflict)
            
            if (decision === 'cancel') {
              updateItem(item.id, { status: 'cancelled' })
              return
            } else if (decision === 'replace') {
              updateItem(item.id, { status: 'uploading', progress: 10 })
              const refreshedItem = items.find((i: UploadItem) => i.id === item.id) ?? item
              
              const baseMetadata = {
                 name: refreshedItem.name,
                 category: refreshedItem.category,
                 folderId: refreshedItem.folderId,
                 folderName: refreshedItem.folderName,
                 hash: finalHash,
                 aiMetadata: refreshedItem.aiResult ? {
                   documentType: refreshedItem.aiResult.documentType,
                   suggestedCategory: refreshedItem.aiResult.suggestedCategory,
                   categoryConfidence: refreshedItem.aiResult.categoryConfidence,
                   suggestedFileName: refreshedItem.aiResult.suggestedFileName,
                   extractedDates: refreshedItem.aiResult.extractedDates,
                   isSearchable: refreshedItem.aiResult.isSearchable,
                   processedAt: refreshedItem.aiResult.processedAt,
                 } : undefined,
                 searchableText: refreshedItem.aiResult?.searchableText,
              }
              
              // @ts-ignore
              await replaceFile(user.uid, nameConflict.id, item.file, baseMetadata)
              updateItem(item.id, { status: 'complete', progress: 100 })
              return
            }
          }
        }

        if (shouldUpload) {
          updateItem(item.id, { status: 'uploading', progress: 10 })
          const refreshedItem = items.find((i: UploadItem) => i.id === item.id) ?? item
          
          const baseMetadata = {
             name: refreshedItem.name,
             category: refreshedItem.category,
             folderId: refreshedItem.folderId,
             folderName: refreshedItem.folderName,
             hash: finalHash,
             aiMetadata: refreshedItem.aiResult ? {
               documentType: refreshedItem.aiResult.documentType,
               suggestedCategory: refreshedItem.aiResult.suggestedCategory,
               categoryConfidence: refreshedItem.aiResult.categoryConfidence,
               suggestedFileName: refreshedItem.aiResult.suggestedFileName,
               extractedDates: refreshedItem.aiResult.extractedDates,
               isSearchable: refreshedItem.aiResult.isSearchable,
               processedAt: refreshedItem.aiResult.processedAt,
             } : undefined,
             searchableText: refreshedItem.aiResult?.searchableText,
          }
          
          // @ts-ignore
          const engine = new CloudUploadEngine(item.file, item.id, (progress, uploadedBytes, state) => {
            updateItem(item.id, { progress, uploadedBytes, totalBytes: item.file.size, status: state as any })
          })
          await engine.start()
          await saveCloudFileMetadata(user.uid, item.id, `users/${user.uid}/files/${item.id}`, item.file, baseMetadata)
          updateItem(item.id, { status: 'complete', progress: 100 })
        }
      } catch (err) {
        updateItem(item.id, { status: 'error', error: (err as Error).message })
      }
    }))

    setUploading(false)
    if (pendingItemsReadyToUpload.length > 0) {
      showSuccess('Upload complete', `Processed files in queue.`)
      if (prefs.postUploadBehavior === 'my-files') {
        closeQueue()
        navigate('/files')
      }
    }
  }

  const activeConflict = conflicts[0]
  const handleConflictDecision = (decision: DecisionType) => {
    if (activeConflict) {
      activeConflict.resolve(decision)
      setConflicts(prev => prev.slice(1))
    }
  }

  const hasReviewItems = items.some(i => i.status === 'paused' && i.aiResult && !i.aiAccepted)
  const actionButtonText = hasReviewItems ? 'Review files before upload' : `Upload ${pendingItemsToUpload.length} file${pendingItemsToUpload.length !== 1 ? 's' : ''}`
  
  return (
    <>
      {activeConflict && (
        <Modal
          isOpen={!!activeConflict}
          onClose={() => handleConflictDecision('cancel')}
          title={activeConflict.type === 'duplicate' ? 'This file already exists' : 'File Name Conflict'}
          size="lg"
        >
          <div className="space-y-6">
            {activeConflict.type === 'duplicate' ? (
              <>
                <p className="text-sm text-gray-600">
                  An identical file already exists in your locker. What would you like to do?
                </p>
                <div className="bg-gray-50 border border-surface-border rounded-xl p-4 space-y-2">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Existing File Details</h4>
                  <div className="grid grid-cols-[80px_1fr] gap-y-2 text-sm">
                    <span className="text-gray-500">Name:</span>
                    <span className="font-medium text-gray-900 truncate">{activeConflict.existingFile.name}</span>
                    <span className="text-gray-500">Size:</span>
                    <span className="font-medium text-gray-900">{formatBytes(activeConflict.existingFile.size)}</span>
                    <span className="text-gray-500">Date:</span>
                    <span className="font-medium text-gray-900">{new Date(activeConflict.existingFile.uploadedAt).toLocaleDateString()}</span>
                    <span className="text-gray-500">Folder:</span>
                    <span className="font-medium text-gray-900">{activeConflict.existingFile.folderName || 'Root'}</span>
                    <span className="text-gray-500">Category:</span>
                    <span className="font-medium text-gray-900">{activeConflict.existingFile.category}</span>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button variant="ghost" onClick={() => handleConflictDecision('cancel')}>Cancel</Button>
                  <Button variant="secondary" onClick={() => handleConflictDecision('open')}>Open Existing File</Button>
                  <Button variant="primary" onClick={() => handleConflictDecision('upload_anyway')}>Upload Anyway</Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-600">
                  A file with the name "{activeConflict.item.name}" already exists in this location. Do you want to replace it?
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 border border-surface-border rounded-xl p-4 space-y-2">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Existing File</h4>
                    <div className="flex flex-col gap-1 text-sm">
                      <span className="text-gray-500">Size: <span className="text-gray-900 font-medium">{formatBytes(activeConflict.existingFile.size)}</span></span>
                      <span className="text-gray-500">Date: <span className="text-gray-900 font-medium">{new Date(activeConflict.existingFile.uploadedAt).toLocaleDateString()}</span></span>
                      <span className="text-gray-500">Folder: <span className="text-gray-900 font-medium">{activeConflict.existingFile.folderName || 'Root'}</span></span>
                      <span className="text-gray-500">Category: <span className="text-gray-900 font-medium">{activeConflict.existingFile.category}</span></span>
                    </div>
                  </div>
                  <div className="bg-primary-muted/30 border border-primary-muted rounded-xl p-4 space-y-2">
                    <h4 className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">New File</h4>
                    <div className="flex flex-col gap-1 text-sm">
                      <span className="text-primary-dark">Size: <span className="font-medium">{formatBytes(activeConflict.item.file.size)}</span></span>
                      <span className="text-primary-dark">Date: <span className="font-medium">Just now</span></span>
                      <span className="text-primary-dark">Folder: <span className="font-medium">{activeConflict.item.folderName || 'Root'}</span></span>
                      <span className="text-primary-dark">Category: <span className="font-medium">{activeConflict.item.category}</span></span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button variant="ghost" onClick={() => handleConflictDecision('cancel')}>Cancel</Button>
                  <Button variant="primary" onClick={() => handleConflictDecision('replace')}>Replace File</Button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* Panel */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 lg:left-auto lg:translate-x-0 lg:right-6 z-[100] w-[340px] shadow-dialog rounded-2xl bg-white border border-surface-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-surface-border">
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-gray-900">
              Upload Queue <span className="text-gray-400 font-normal">({items.length})</span>
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setCollapsed(c => !c)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
              {collapsed ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            <button onClick={closeQueue} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {!collapsed && (
          <>
            {/* Items */}
            <div className="max-h-[400px] overflow-y-auto scrollbar-thin p-3 space-y-2 bg-gray-50/50">
              {items.map(item => <UploadItemRow key={item.id} item={item} />)}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 px-4 py-3 border-t border-surface-border bg-gray-50">
              {completedItems.length > 0 && !hasReviewItems && pendingItemsToUpload.length === 0 && (
                <Button size="sm" variant="ghost" onClick={clearCompleted} leftIcon={<Trash2 className="h-3.5 w-3.5" />} fullWidth>
                  Clear done
                </Button>
              )}
              {pendingItemsToUpload.length > 0 && (
                <Button
                  size="sm"
                  variant="primary"
                  fullWidth
                  disabled={hasReviewItems} // Must review all files before uploading
                  isLoading={uploading || isWorking}
                  onClick={processUploadPipeline}
                  leftIcon={hasReviewItems ? undefined : <Upload className="h-3.5 w-3.5" />}
                >
                  {actionButtonText}
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}
