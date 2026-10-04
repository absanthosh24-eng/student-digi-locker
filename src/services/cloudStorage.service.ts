import { auth } from '@/lib/firebase'

const WORKER_URL = 'http://localhost:8787'

async function getAuthHeaders() {
  const user = auth.currentUser
  if (!user) throw new Error('Not authenticated')
  const token = await user.getIdToken()
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
}

export async function initUpload(fileId: string, fileSize: number, contentType: string) {
  const headers = await getAuthHeaders()
  const res = await fetch(`${WORKER_URL}/api/upload/init`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ fileId, fileSize, contentType })
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{ uploadId: string, storageKey: string, chunkSize: number }>
}

export async function presignPart(fileId: string, uploadId: string, partNumber: number) {
  const headers = await getAuthHeaders()
  const res = await fetch(`${WORKER_URL}/api/upload/presign-part`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ fileId, uploadId, partNumber })
  })
  if (!res.ok) throw new Error(await res.text())
  return (await res.json() as { url: string }).url
}

export async function completeUpload(fileId: string, uploadId: string, parts: { partNumber: number, etag: string }[]) {
  const headers = await getAuthHeaders()
  const res = await fetch(`${WORKER_URL}/api/upload/complete`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ fileId, uploadId, parts })
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{ success: boolean, storageKey: string }>
}

export async function abortUpload(fileId: string, uploadId: string) {
  const headers = await getAuthHeaders()
  const res = await fetch(`${WORKER_URL}/api/upload/abort`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ fileId, uploadId })
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{ success: boolean }>
}

export async function getDownloadUrl(fileId: string, inline = false) {
  const headers = await getAuthHeaders()
  // Content-Type is not needed for GET, but safe to include
  const res = await fetch(`${WORKER_URL}/api/download/${fileId}${inline ? '?inline=true' : ''}`, {
    method: 'GET',
    headers: { 'Authorization': headers.Authorization }
  })
  if (!res.ok) throw new Error(await res.text())
  return (await res.json() as { url: string }).url
}

export async function deleteObject(fileId: string) {
  const headers = await getAuthHeaders()
  const res = await fetch(`${WORKER_URL}/api/object/${fileId}`, {
    method: 'DELETE',
    headers: { 'Authorization': headers.Authorization }
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{ success: boolean }>
}

export async function getShareAccessUrl(docId: string, action: 'preview' | 'download' = 'preview') {
  let authHeader = ''
  try {
     const headers = await getAuthHeaders()
     authHeader = headers.Authorization
  } catch (e) {
     // User might not be logged in, that's fine for public links
  }
  
  const headersObj: Record<string, string> = {}
  if (authHeader) {
     headersObj['Authorization'] = authHeader
  }

  const res = await fetch(`${WORKER_URL}/api/share/${docId}?action=${action}`, {
    method: 'GET',
    headers: headersObj
  })
  
  if (!res.ok) throw new Error(await res.text())
  
  const data = await res.json() as { fileName: string; permission: string; expiresAt?: string; url: string }
  return data
}
