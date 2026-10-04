import { useState, useEffect } from 'react'
import { X, Download, FileText } from 'lucide-react'
import { LockerFile } from '@/types'
import { formatBytes, formatDate, getFileType, cn } from '@/utils'
import { Button, Badge } from '@/components/ui'
import { CATEGORY_COLORS } from '@/utils'
import { getLocalFile } from '@/services/localFileStorage.service'
import { getDownloadUrl } from '@/services/cloudStorage.service'
import { downloadLockerFile } from '@/services/files.service'

interface PreviewModalProps {
  file: LockerFile
  onClose: () => void
}

function PDFPreview({ url }: { url: string }) {
  return (
    <iframe src={url} className="w-full h-full rounded-lg border border-surface-border" title="PDF Preview" />
  )
}

function ImagePreview({ url, name }: { url: string; name: string }) {
  return (
    <img src={url} alt={name} className="max-w-full max-h-full object-contain rounded-lg" />
  )
}

function VideoPreview({ url }: { url: string }) {
  return <video src={url} controls className="max-w-full max-h-full rounded-lg" />
}

function AudioPreview({ url }: { url: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <div className="w-24 h-24 bg-primary-muted rounded-full flex items-center justify-center">
        🎵
      </div>
      <audio src={url} controls className="w-64" />
    </div>
  )
}

function UnsupportedPreview({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
      <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center border border-surface-border">
        <FileText className="h-10 w-10 text-gray-300" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700">Preview unavailable</p>
        <p className="text-xs text-gray-400 mt-1">This file type cannot be previewed in the browser.</p>
      </div>
    </div>
  )
}

export default function PreviewModal({ file, onClose }: PreviewModalProps) {
  const fileType = getFileType(file.mimeType)
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let url: string | null = null
    let isMounted = true
    setIsLoading(true)

    async function load() {
      try {
        if (file.storageMode === 'cloud') {
          url = await getDownloadUrl(file.id, true) // true for inline
          if (isMounted) setObjectUrl(url)
        } else {
          const blob = await getLocalFile(file.id)
          url = URL.createObjectURL(blob)
          if (isMounted) setObjectUrl(url)
        }
      } catch (err) {
        console.error('Failed to load file preview:', err)
        if (isMounted) setLoadError(true)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    load()

    return () => {
      isMounted = false
      if (url && file.storageMode !== 'cloud') URL.revokeObjectURL(url)
    }
  }, [file.id, file.storageMode])

  return (
    <div className="fixed inset-0 z-50 flex items-stretch">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative ml-auto flex flex-col w-full max-w-5xl bg-white shadow-dialog animate-slide-up">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-border flex-shrink-0">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{file.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge className={cn('text-[0.6rem]', CATEGORY_COLORS[file.category])}>{file.category}</Badge>
              <span className="text-xs text-gray-400">{formatBytes(file.size)}</span>
              <span className="text-xs text-gray-400">·</span>
              <span className="text-xs text-gray-400">{formatDate(file.uploadedAt)}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {objectUrl && (
              <Button size="sm" variant="secondary" leftIcon={<Download className="h-3.5 w-3.5" />} onClick={() => downloadLockerFile(file)}>
                Download
              </Button>
            )}
            <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Preview area */}
        <div className="flex-1 overflow-auto p-6 bg-gray-50 flex items-center justify-center">
          {isLoading && <div className="text-gray-400 text-sm">Loading file from device storage...</div>}
          {loadError && (
            <div className="text-red-500 text-sm flex flex-col items-center gap-2">
              <FileText className="h-8 w-8 opacity-50" />
              <span>File not found on this device. (Hackathon Mode: Bytes are stored locally)</span>
            </div>
          )}
          
          {!isLoading && !loadError && objectUrl && (
            <>
              {fileType === 'pdf' && <PDFPreview url={objectUrl} />}
              {fileType === 'image' && <ImagePreview url={objectUrl} name={file.name} />}
              {fileType === 'video' && <VideoPreview url={objectUrl} />}
              {fileType === 'audio' && <AudioPreview url={objectUrl} />}
              {!['pdf', 'image', 'video', 'audio'].includes(fileType) && <UnsupportedPreview name={file.name} />}
            </>
          )}
        </div>

        {/* AI metadata footer */}
        {file.aiMetadata && (
          <div className="flex-shrink-0 border-t border-surface-border px-5 py-3 bg-ai-muted">
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-ai text-xs">✨</span>
                <span className="text-xs font-medium text-ai">AI Intelligence</span>
              </div>
              {file.aiMetadata.documentType && (
                <div><span className="text-xs text-gray-500">Type:</span> <span className="text-xs font-medium text-gray-800">{file.aiMetadata.documentType}</span></div>
              )}
              {file.aiMetadata.suggestedCategory && (
                <div>
                  <span className="text-xs text-gray-500">Suggested:</span>{' '}
                  <span className="text-xs font-medium text-gray-800">{file.aiMetadata.suggestedCategory}</span>
                  {file.aiMetadata.categoryConfidence && (
                    <span className="text-xs text-gray-400 ml-1">({file.aiMetadata.categoryConfidence}%)</span>
                  )}
                </div>
              )}
              {file.aiMetadata.isSearchable && (
                <Badge variant="ai" className="text-[0.6rem]">Searchable text</Badge>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
