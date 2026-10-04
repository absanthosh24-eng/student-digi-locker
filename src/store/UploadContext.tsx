import React, { createContext, useCallback, useContext, useState } from 'react'
import { FileCategory, UploadItem, UploadStatus } from '@/types'
import { generateId } from '@/utils'

interface UploadContextType {
  items: UploadItem[]
  isQueueOpen: boolean
  addFiles: (files: File[]) => void
  updateItem: (id: string, updates: Partial<UploadItem>) => void
  removeItem: (id: string) => void
  clearCompleted: () => void
  openQueue: () => void
  closeQueue: () => void
}

const UploadContext = createContext<UploadContextType | null>(null)

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<UploadItem[]>([])
  const [isQueueOpen, setIsQueueOpen] = useState(false)

  const addFiles = useCallback((files: File[]) => {
    const newItems: UploadItem[] = files.map((file) => ({
      id: generateId(),
      file,
      name: file.name,
      category: 'Uncategorized' as FileCategory,
      status: 'pending' as UploadStatus,
      progress: 0,
    }))
    setItems((prev) => [...prev, ...newItems])
    setIsQueueOpen(true)
  }, [])

  const updateItem = useCallback((id: string, updates: Partial<UploadItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)))
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const clearCompleted = useCallback(() => {
    setItems((prev) => prev.filter((item) => !['complete', 'cancelled', 'error'].includes(item.status)))
  }, [])

  const openQueue = useCallback(() => setIsQueueOpen(true), [])
  const closeQueue = useCallback(() => setIsQueueOpen(false), [])

  return (
    <UploadContext.Provider
      value={{ items, isQueueOpen, addFiles, updateItem, removeItem, clearCompleted, openQueue, closeQueue }}
    >
      {children}
    </UploadContext.Provider>
  )
}

export function useUpload(): UploadContextType {
  const ctx = useContext(UploadContext)
  if (!ctx) throw new Error('useUpload must be used within UploadProvider')
  return ctx
}
