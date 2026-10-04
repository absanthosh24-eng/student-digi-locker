// ============================================================
// FILES SERVICE — IndexedDB Storage + Firestore file metadata
// ============================================================

import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  onSnapshot,
  serverTimestamp,
  increment,
  Timestamp,
  type QueryConstraint,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { LockerFile, FileCategory, AIMetadata } from '@/types'
import { saveLocalFile, deleteLocalFile, getStorageInfo, getLocalFile } from './localFileStorage.service'
import { getDownloadUrl } from './cloudStorage.service'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timestampToDate(value: unknown): Date {
  if (value instanceof Timestamp) return value.toDate()
  if (value instanceof Date) return value
  if (typeof value === 'number') return new Date(value)
  return new Date()
}

function docToLockerFile(id: string, data: Record<string, unknown>): LockerFile {
  return {
    id,
    uid: (data.uid as string) ?? '',
    name: (data.name as string) ?? '',
    originalName: (data.originalName as string) ?? '',
    mimeType: (data.mimeType as string) ?? '',
    size: (data.size as number) ?? 0,
    storageUrl: (data.storageUrl as string) ?? '',
    downloadUrl: data.downloadUrl as string | undefined,
    category: (data.category as FileCategory) ?? 'Uncategorized',
    folderId: data.folderId as string | undefined,
    folderName: data.folderName as string | undefined,
    uploadedAt: timestampToDate(data.uploadedAt),
    updatedAt: timestampToDate(data.updatedAt),
    status: (data.status as LockerFile['status']) ?? 'active',
    isShared: (data.isShared as boolean) ?? false,
    sharingStatus: (data.sharingStatus as LockerFile['sharingStatus']) ?? 'private',
    hash: data.hash as string | undefined,
    aiMetadata: data.aiMetadata as LockerFile['aiMetadata'],
    searchableText: data.searchableText as string | undefined,
    deletedAt: data.deletedAt ? timestampToDate(data.deletedAt) : undefined,
    autoDeleteAt: data.autoDeleteAt ? timestampToDate(data.autoDeleteAt) : undefined,
  }
}

function filesRef(uid: string) {
  return collection(db, 'users', uid, 'files')
}

function fileRef(uid: string, fileId: string) {
  return doc(db, 'users', uid, 'files', fileId)
}

function recycleBinRef(uid: string) {
  return collection(db, 'users', uid, 'recycleBin')
}

function recycleBinDocRef(uid: string, fileId: string) {
  return doc(db, 'users', uid, 'recycleBin', fileId)
}

// ─── uploadFile ───────────────────────────────────────────────────────────────

/**
 * Saves a file to IndexedDB and creates a Firestore document for metadata.
 * Returns the created LockerFile.
 */
export async function saveCloudFileMetadata(
  uid: string,
  fileId: string,
  storageKey: string,
  file: File,
  metadata: { name: string; category: FileCategory; folderId?: string; folderName?: string; hash?: string; aiMetadata?: AIMetadata; searchableText?: string }
): Promise<LockerFile> {
  const fileDocRef = doc(filesRef(uid), fileId)
  const now = new Date()

  const fileData: Omit<LockerFile, 'id'> = {
    uid,
    name: metadata.name,
    originalName: file.name,
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    category: metadata.category,
    folderId: metadata.folderId || undefined,
    folderName: metadata.folderName || undefined,
    uploadedAt: now,
    updatedAt: now,
    status: 'active',
    hash: metadata.hash,
    aiMetadata: metadata.aiMetadata,
    searchableText: metadata.searchableText,
    storageMode: 'cloud',
    storageKey: storageKey,
    storageUrl: `local:${fileId}`, // Legacy field default
    isShared: false
  }

  await setDoc(fileDocRef, fileData)
  
  return { id: fileId, ...fileData } as LockerFile
}

export async function uploadFile(
  uid: string,
  file: File,
  metadata: { name: string; category: FileCategory; folderId?: string; folderName?: string; hash?: string; aiMetadata?: AIMetadata; searchableText?: string }
): Promise<LockerFile> {
  const fileDocRef = doc(filesRef(uid))
  const fileId = fileDocRef.id

  // 1. Save bytes locally to IndexedDB
  await saveLocalFile(fileId, file)

  // 2. Save metadata to Firestore
  const storagePath = `local:${fileId}`
  const now = new Date()

  const fileData: Omit<LockerFile, 'id'> = {
    uid,
    name: metadata.name,
    originalName: file.name,
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    storageUrl: storagePath,
    downloadUrl: undefined, // No permanent download URL in local storage mode
    category: metadata.category,
    folderId: metadata.folderId,
    folderName: metadata.folderName,
    aiMetadata: metadata.aiMetadata,
    searchableText: metadata.searchableText,
    uploadedAt: now,
    updatedAt: now,
    status: 'active',
    isShared: false,
    sharingStatus: 'private',
    hash: metadata.hash,
  }

  await setDoc(fileDocRef, fileData)

  // 3. Increment local storage usage in user profile
  await updateStorageUsed(uid, file.size)

  return { id: fileId, ...fileData }
}

// ─── replaceFile ──────────────────────────────────────────────────────────────

/**
 * Replaces an existing file by moving the old one to the Recycle Bin 
 * and uploading the new one as active.
 */
export async function replaceFile(
  uid: string,
  oldFileId: string,
  newFile: File,
  metadata: { name: string; category: FileCategory; folderId?: string; folderName?: string; hash?: string; aiMetadata?: AIMetadata; searchableText?: string }
): Promise<LockerFile> {
  // 1. Move old file to Recycle Bin (soft delete)
  await deleteFile(uid, oldFileId)

  // 2. Make new file active by uploading it
  return uploadFile(uid, newFile, metadata)
}

// ─── getFiles ─────────────────────────────────────────────────────────────────

export interface FileFilters {
  category?: FileCategory
  folderId?: string | null
}

export async function getFiles(uid: string, filters?: FileFilters): Promise<LockerFile[]> {
  const constraints: QueryConstraint[] = [where('deletedAt', '==', null)]

  if (filters?.category) {
    constraints.push(where('category', '==', filters.category))
  }
  if (filters?.folderId !== undefined) {
    constraints.push(where('folderId', '==', filters.folderId))
  }
  constraints.push(orderBy('uploadedAt', 'desc'))

  const q = query(filesRef(uid), ...constraints)
  const snap = await getDocs(q)
  return snap.docs.map((d) => docToLockerFile(d.id, d.data() as Record<string, unknown>))
}

// ─── getRecentFiles ───────────────────────────────────────────────────────────

export async function getRecentFiles(uid: string, limitCount: number = 10): Promise<LockerFile[]> {
  const q = query(
    filesRef(uid),
    where('deletedAt', '==', null),
    orderBy('uploadedAt', 'desc'),
    firestoreLimit(limitCount)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => docToLockerFile(d.id, d.data() as Record<string, unknown>))
}

// ─── getFileById ──────────────────────────────────────────────────────────────

export async function getFileById(uid: string, fileId: string): Promise<LockerFile | null> {
  const snap = await getDoc(fileRef(uid, fileId))
  if (!snap.exists()) return null
  return docToLockerFile(snap.id, snap.data() as Record<string, unknown>)
}

// ─── deleteFile ───────────────────────────────────────────────────────────────

export async function deleteFile(uid: string, fileId: string): Promise<void> {
  const now = new Date()
  const autoDeleteAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const fileSnap = await getDoc(fileRef(uid, fileId))
  if (!fileSnap.exists()) throw new Error('File not found.')

  const data = fileSnap.data() as Record<string, unknown>

  await setDoc(recycleBinDocRef(uid, fileId), {
    ...data,
    deletedAt: serverTimestamp(),
    autoDeleteAt,
    updatedAt: serverTimestamp(),
  })

  await updateDoc(fileRef(uid, fileId), {
    deletedAt: serverTimestamp(),
    autoDeleteAt,
    updatedAt: serverTimestamp(),
  })
}

// ─── restoreFile ──────────────────────────────────────────────────────────────

export async function restoreFile(uid: string, fileId: string): Promise<void> {
  await updateDoc(fileRef(uid, fileId), {
    deletedAt: null,
    autoDeleteAt: null,
    updatedAt: serverTimestamp(),
  })
  await deleteDoc(recycleBinDocRef(uid, fileId))
}

// ─── permanentlyDeleteFile ────────────────────────────────────────────────────

export async function permanentlyDeleteFile(uid: string, fileId: string): Promise<void> {
  const fileSnap = await getDoc(fileRef(uid, fileId))
  if (!fileSnap.exists()) throw new Error('File not found.')

  const data = fileSnap.data() as Record<string, unknown>
  
  // 1. Delete bytes locally
  await deleteLocalFile(fileId)

  // 2. Adjust user storage quota
  const size = (data.size as number) ?? 0
  if (size > 0) {
    await updateStorageUsed(uid, -size)
  }

  // 3. Remove Firestore metadata
  await deleteDoc(fileRef(uid, fileId))
  try {
    await deleteDoc(recycleBinDocRef(uid, fileId))
  } catch {
    // ignore
  }
}

// ─── renameFile ───────────────────────────────────────────────────────────────

export async function renameFile(uid: string, fileId: string, newName: string): Promise<void> {
  await updateDoc(fileRef(uid, fileId), {
    name: newName,
    updatedAt: serverTimestamp(),
  })
}

// ─── moveFile ─────────────────────────────────────────────────────────────────

export async function moveFile(
  uid: string,
  fileId: string,
  folderId?: string,
  folderName?: string
): Promise<void> {
  await updateDoc(fileRef(uid, fileId), {
    folderId: folderId ?? null,
    folderName: folderName ?? null,
    updatedAt: serverTimestamp(),
  })
}

// ─── updateFileCategory ───────────────────────────────────────────────────────

export async function updateFileCategory(
  uid: string,
  fileId: string,
  category: FileCategory
): Promise<void> {
  await updateDoc(fileRef(uid, fileId), {
    category,
    updatedAt: serverTimestamp(),
  })
}

// ─── getRecycleBin ────────────────────────────────────────────────────────────

export async function getRecycleBin(uid: string): Promise<LockerFile[]> {
  const q = query(recycleBinRef(uid), orderBy('deletedAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => docToLockerFile(d.id, d.data() as Record<string, unknown>))
}

// ─── checkDuplicate ───────────────────────────────────────────────────────────

export async function checkDuplicate(
  uid: string,
  hash: string
): Promise<LockerFile | null> {
  if (!hash) return null
  const q = query(filesRef(uid), where('hash', '==', hash), where('deletedAt', '==', null))
  const snap = await getDocs(q)
  if (snap.empty) return null
  const first = snap.docs[0]
  return docToLockerFile(first.id, first.data() as Record<string, unknown>)
}

// ─── checkNameConflict ────────────────────────────────────────────────────────

export async function checkNameConflict(
  uid: string,
  name: string,
  folderId?: string | null
): Promise<LockerFile | null> {
  const constraints: QueryConstraint[] = [
    where('name', '==', name),
    where('deletedAt', '==', null)
  ]
  if (folderId) {
    constraints.push(where('folderId', '==', folderId))
  } else {
    constraints.push(where('folderId', '==', null))
  }
  const q = query(filesRef(uid), ...constraints)
  const snap = await getDocs(q)
  if (snap.empty) return null
  return docToLockerFile(snap.docs[0].id, snap.docs[0].data() as Record<string, unknown>)
}

// ─── subscribeToFiles ─────────────────────────────────────────────────────────

export function subscribeToFiles(
  uid: string,
  callback: (files: LockerFile[]) => void,
  filters?: FileFilters
): () => void {
  const constraints: QueryConstraint[] = [where('deletedAt', '==', null)]

  if (filters?.category) {
    constraints.push(where('category', '==', filters.category))
  }
  if (filters?.folderId !== undefined) {
    constraints.push(where('folderId', '==', filters.folderId))
  }

  constraints.push(orderBy('uploadedAt', 'desc'))

  const q = query(filesRef(uid), ...constraints)

  return onSnapshot(
    q,
    (snap) => {
      const files = snap.docs.map((d) =>
        docToLockerFile(d.id, d.data() as Record<string, unknown>)
      )
      callback(files)
    },
    (error) => {
      console.error('[subscribeToFiles] Firestore error:', error)
      callback([])
    }
  )
}

// ─── updateStorageUsed ────────────────────────────────────────────────────────

export async function updateStorageUsed(uid: string, delta: number): Promise<void> {
  const userRef = doc(db, 'users', uid)
  await updateDoc(userRef, {
    storageUsed: increment(delta),
    updatedAt: serverTimestamp(),
  })
}

// ─── downloadLockerFile ───────────────────────────────────────────────────────

export async function downloadLockerFile(file: LockerFile): Promise<void> {
  const isCloud = file.storageMode === 'cloud'
  
  if (isCloud) {
    const url = await getDownloadUrl(file.id)
    const a = document.createElement('a')
    a.href = url
    a.download = file.originalName || file.name || file.id
    document.body.appendChild(a)
    a.click()
    a.remove()
  } else {
    const blob = await getLocalFile(file.id)
    if (!blob) throw new Error('Local file unavailable')
    
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = file.originalName || file.name || file.id
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}
