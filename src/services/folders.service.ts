import {
  collection, doc, addDoc, getDoc, getDocs,
  updateDoc, deleteDoc, query, orderBy,
  onSnapshot, serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Folder } from '@/types'

function timestampToDate(v: unknown): Date {
  if (v instanceof Timestamp) return v.toDate()
  if (v instanceof Date) return v
  return new Date()
}

function docToFolder(id: string, data: Record<string, unknown>): Folder {
  return {
    id,
    uid: (data.uid as string) ?? '',
    name: (data.name as string) ?? '',
    parentId: data.parentId as string | undefined,
    category: data.category as Folder['category'],
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
    fileCount: (data.fileCount as number) ?? 0,
  }
}

function foldersRef(uid: string) {
  return collection(db, 'users', uid, 'folders')
}

export async function createFolder(
  uid: string,
  name: string,
  parentId?: string,
  category?: Folder['category']
): Promise<Folder> {
  const ref = await addDoc(foldersRef(uid), {
    uid, name,
    parentId: parentId ?? null,
    category: category ?? null,
    fileCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return { id: ref.id, uid, name, parentId, category, createdAt: new Date(), updatedAt: new Date() }
}

export async function getFolders(uid: string): Promise<Folder[]> {
  const q = query(foldersRef(uid), orderBy('name', 'asc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => docToFolder(d.id, d.data() as Record<string, unknown>))
}

export interface FolderNode extends Folder {
  children: FolderNode[]
}

export function buildFolderTree(folders: Folder[]): FolderNode[] {
  const map = new Map<string, FolderNode>()
  folders.forEach(f => map.set(f.id, { ...f, children: [] }))
  const roots: FolderNode[] = []
  map.forEach(node => {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  })
  return roots
}

export async function renameFolder(uid: string, folderId: string, newName: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'folders', folderId), {
    name: newName, updatedAt: serverTimestamp(),
  })
}

export async function deleteFolder(uid: string, folderId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'folders', folderId))
}

export async function getFolderById(uid: string, folderId: string): Promise<Folder | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'folders', folderId))
  if (!snap.exists()) return null
  return docToFolder(snap.id, snap.data() as Record<string, unknown>)
}

export function subscribeToFolders(uid: string, callback: (folders: Folder[]) => void): () => void {
  const q = query(foldersRef(uid), orderBy('name', 'asc'))
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => docToFolder(d.id, d.data() as Record<string, unknown>)))
  })
}
