import {
  collection, doc, setDoc, getDocs,
  updateDoc, query, where, orderBy,
  serverTimestamp, Timestamp, getDoc
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { ShareRecord, SharePermission } from '@/types'

function timestampToDate(v: unknown): Date {
  if (v instanceof Timestamp) return v.toDate()
  if (v instanceof Date) return v
  return new Date()
}

function docToShare(id: string, data: Record<string, unknown>): ShareRecord {
  return {
    id,
    fileId: (data.fileId as string) ?? '',
    fileName: (data.fileName as string) ?? '',
    ownerId: (data.ownerId as string) ?? '',
    ownerEmail: (data.ownerEmail as string) ?? '',
    shareType: (data.shareType as ShareRecord['shareType']) ?? 'link',
    permission: (data.permission as SharePermission) ?? 'view',
    recipientId: data.recipientId as string | undefined,
    recipientEmail: data.recipientEmail as string | undefined,
    recipientName: data.recipientName as string | undefined,
    linkToken: data.linkToken as string | undefined,
    requiresLogin: (data.requiresLogin as boolean) ?? false,
    expiresAt: data.expiresAt ? timestampToDate(data.expiresAt) : null,
    status: (data.status as ShareRecord['status']) ?? 'active',
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
  }
}

function generateToken(): string {
  return crypto.randomUUID().replace(/-/g, '')
}

export async function shareWithAccount(
  uid: string,
  userEmail: string,
  fileId: string,
  fileName: string,
  recipientEmail: string,
  options: { permission: SharePermission; expiresAt?: Date | null; storageMode?: 'local' | 'cloud' }
): Promise<ShareRecord> {
  const shareId = crypto.randomUUID()
  const cleanEmail = recipientEmail.trim().toLowerCase()
  
  if (cleanEmail === userEmail.toLowerCase()) {
    throw new Error('You cannot share a file with yourself.')
  }

  const shareData = {
    fileId, 
    fileName,
    ownerId: uid,
    ownerEmail: userEmail,
    shareType: 'account',
    permission: options.permission,
    recipientEmail: cleanEmail,
    expiresAt: options.expiresAt ?? null,
    status: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    storageMode: options.storageMode,
  }
  
  await setDoc(doc(db, 'shares', shareId), shareData)
  
  return { id: shareId, ...shareData, createdAt: new Date(), updatedAt: new Date() } as ShareRecord
}

export async function createShareLink(
  uid: string,
  userEmail: string,
  fileId: string,
  fileName: string,
  options: { permission: SharePermission; expiresAt?: Date | null; requiresLogin?: boolean; storageMode?: 'local' | 'cloud' }
): Promise<ShareRecord> {
  const shareId = crypto.randomUUID()
  const linkToken = generateToken()
  const compositeId = `${shareId}_${linkToken}`
  const shareData = {
    fileId, 
    fileName,
    ownerId: uid,
    ownerEmail: userEmail,
    shareType: 'link',
    permission: options.permission,
    linkToken,
    requiresLogin: options.requiresLogin ?? false,
    expiresAt: options.expiresAt ?? null,
    status: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    storageMode: options.storageMode,
  }
  
  await setDoc(doc(db, 'shares', compositeId), shareData)
  
  return { id: compositeId, ...shareData, createdAt: new Date(), updatedAt: new Date() } as ShareRecord
}

export async function getSharedByMe(uid: string): Promise<ShareRecord[]> {
  const q = query(
    collection(db, 'shares'), 
    where('ownerId', '==', uid),
    orderBy('createdAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => docToShare(d.id, d.data() as Record<string, unknown>))
}

export async function getSharedWithMe(userEmail: string): Promise<ShareRecord[]> {
  const q = query(
    collection(db, 'shares'), 
    where('recipientEmail', '==', userEmail.toLowerCase()),
    orderBy('createdAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => docToShare(d.id, d.data() as Record<string, unknown>))
}

export async function revokeShare(uid: string, shareId: string): Promise<void> {
  // Security rules ensure only the owner can update this document
  await updateDoc(doc(db, 'shares', shareId), {
    status: 'revoked', 
    updatedAt: serverTimestamp(),
  })
}

export async function getShareDetails(shareId: string, token?: string | null): Promise<ShareRecord | null> {
  const docId = token ? `${shareId}_${token}` : shareId
  const snap = await getDoc(doc(db, 'shares', docId))
  if (!snap.exists()) return null
  return docToShare(snap.id, snap.data() as Record<string, unknown>)
}
