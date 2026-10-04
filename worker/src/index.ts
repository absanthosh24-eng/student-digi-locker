import { createRemoteJWKSet, jwtVerify, SignJWT, importPKCS8 } from 'jose'
import { S3Client, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export interface Env {
  BUCKET: R2Bucket
  FIREBASE_PROJECT_ID: string
  R2_ACCOUNT_ID: string
  R2_ACCESS_KEY_ID: string
  R2_SECRET_ACCESS_KEY: string
  FIRESTORE_SERVICE_ACCOUNT?: string
}

const MAX_FILE_SIZE = 5368709120 // 5 GB in bytes
const CHUNK_SIZE = 10 * 1024 * 1024 // 10 MB chunks recommended

// ── Auth & Validation Helpers ────────────────────────────────────────────────

async function verifyFirebaseToken(authHeader: string | null, projectId: string): Promise<{ uid: string; email: string | undefined }> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('401:Missing or invalid Authorization header')
  }
  const token = authHeader.split('Bearer ')[1]
  const JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'))
  
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    })
    return { uid: payload.user_id as string, email: payload.email as string | undefined }
  } catch (error) {
    throw new Error('401:Invalid token signature or expired')
  }
}

async function verifyFirestoreOwnership(env: Env, uid: string, fileId: string, authHeader: string) {
  const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${uid}/files/${fileId}`
  const response = await fetch(url, {
    headers: { Authorization: authHeader }
  })
  if (!response.ok) {
    if (response.status === 404) throw new Error('404:File metadata not found')
    throw new Error('403:Authorization failure or permission denied')
  }
  return await response.json()
}

function getObjectKey(uid: string, fileId: string): string {
  if (!/^[a-zA-Z0-9_-]+$/.test(fileId)) throw new Error('400:Invalid fileId format')
  return `users/${uid}/files/${fileId}`
}

function getS3Client(env: Env) {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    }
  })
}

// ── JSON Response Helper ──────────────────────────────────────────────────────

const corsHeaders = {
  'Access-Control-Allow-Origin': 'http://localhost:5173',
  'Content-Type': 'application/json'
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders })
}

function errorResponse(err: any) {
  let status = 500
  let message = err.message || 'Internal Server Error'
  if (message.match(/^\d{3}:/)) {
    status = parseInt(message.substring(0, 3))
    message = message.substring(4)
  }
  return new Response(JSON.stringify({ error: message, code: status }), { status, headers: corsHeaders })
}

// ── Router ────────────────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)
    const method = request.method
    const path = url.pathname

    if (method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': 'http://localhost:5173',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      })
    }

    try {
      // 1. Upload Init
      if (method === 'POST' && path === '/api/upload/init') {
        const { uid } = await verifyFirebaseToken(request.headers.get('Authorization'), env.FIREBASE_PROJECT_ID)
        const body = await request.json() as { fileId: string; fileSize: number; contentType: string }
        
        if (!body.fileId || !body.fileSize || !body.contentType) throw new Error('400:Missing required fields')
        if (typeof body.fileSize !== 'number' || body.fileSize <= 0 || isNaN(body.fileSize)) throw new Error('400:Invalid file size')
        if (body.fileSize > MAX_FILE_SIZE) throw new Error(`400:File size exceeds maximum allowed of ${MAX_FILE_SIZE} bytes`)

        const objectKey = getObjectKey(uid, body.fileId)
        const s3 = getS3Client(env)
        
        const command = new CreateMultipartUploadCommand({
          Bucket: 'sdl-dev-bucket',
          Key: objectKey,
          ContentType: body.contentType
        })
        const res = await s3.send(command)
        
        return jsonResponse({
          uploadId: res.UploadId,
          storageKey: objectKey,
          chunkSize: CHUNK_SIZE
        })
      }

      // 2. Presign Part
      if (method === 'POST' && path === '/api/upload/presign-part') {
        const { uid } = await verifyFirebaseToken(request.headers.get('Authorization'), env.FIREBASE_PROJECT_ID)
        const body = await request.json() as { fileId: string; uploadId: string; partNumber: number }
        
        if (!body.fileId || !body.uploadId || !body.partNumber) throw new Error('400:Missing required fields')
        if (body.partNumber < 1 || body.partNumber > 10000) throw new Error('400:Invalid part number')

        const objectKey = getObjectKey(uid, body.fileId)
        const s3 = getS3Client(env)

        // S3 implicitly enforces that the uploadId matches the objectKey
        const command = new UploadPartCommand({
          Bucket: 'sdl-dev-bucket',
          Key: objectKey,
          UploadId: body.uploadId,
          PartNumber: body.partNumber
        })
        const signedUrl = await getSignedUrl(s3, command, { expiresIn: 900 }) // 15 mins
        
        return jsonResponse({ url: signedUrl })
      }

      // 3. Complete Multipart
      if (method === 'POST' && path === '/api/upload/complete') {
        const { uid } = await verifyFirebaseToken(request.headers.get('Authorization'), env.FIREBASE_PROJECT_ID)
        const body = await request.json() as { fileId: string; uploadId: string; parts: { partNumber: number, etag: string }[] }
        
        if (!body.fileId || !body.uploadId || !Array.isArray(body.parts)) throw new Error('400:Missing required fields')
        
        const objectKey = getObjectKey(uid, body.fileId)
        const s3 = getS3Client(env)

        const command = new CompleteMultipartUploadCommand({
          Bucket: 'sdl-dev-bucket',
          Key: objectKey,
          UploadId: body.uploadId,
          MultipartUpload: {
            Parts: body.parts.map(p => ({ PartNumber: p.partNumber, ETag: p.etag }))
          }
        })
        await s3.send(command)
        
        return jsonResponse({ success: true, storageKey: objectKey })
      }

      // 4. Abort Multipart
      if (method === 'POST' && path === '/api/upload/abort') {
        const { uid } = await verifyFirebaseToken(request.headers.get('Authorization'), env.FIREBASE_PROJECT_ID)
        const body = await request.json() as { fileId: string; uploadId: string }
        
        if (!body.fileId || !body.uploadId) throw new Error('400:Missing required fields')
        
        const objectKey = getObjectKey(uid, body.fileId)
        const s3 = getS3Client(env)

        const command = new AbortMultipartUploadCommand({
          Bucket: 'sdl-dev-bucket',
          Key: objectKey,
          UploadId: body.uploadId
        })
        await s3.send(command)
        
        return jsonResponse({ success: true })
      }

      // 5. Download URL
      if (method === 'GET' && path.startsWith('/api/download/')) {
        const authHeader = request.headers.get('Authorization')
        const { uid } = await verifyFirebaseToken(authHeader, env.FIREBASE_PROJECT_ID)
        const fileId = path.split('/').pop()
        if (!fileId) throw new Error('400:Missing fileId')

        // Verify Firestore Ownership explicitly and get metadata
        const doc: any = await verifyFirestoreOwnership(env, uid, fileId, authHeader as string)
        const filename = doc?.fields?.name?.stringValue || doc?.fields?.originalName?.stringValue || fileId
        const mimeType = doc?.fields?.mimeType?.stringValue || 'application/octet-stream'

        const isInline = url.searchParams.get('inline') === 'true'
        // encodeURIComponent to prevent CRLF injection in headers
        const encodedFilename = encodeURIComponent(filename).replace(/['()]/g, escape).replace(/\*/g, '%2A')
        const disposition = isInline ? `inline; filename*=UTF-8''${encodedFilename}` : `attachment; filename*=UTF-8''${encodedFilename}`

        const objectKey = getObjectKey(uid, fileId)
        const s3 = getS3Client(env)

        const command = new GetObjectCommand({
          Bucket: 'sdl-dev-bucket',
          Key: objectKey,
          ResponseContentDisposition: disposition,
          ResponseContentType: mimeType
        })
        const signedUrl = await getSignedUrl(s3, command, { expiresIn: 900 }) // 15 mins
        
        return jsonResponse({ url: signedUrl })
      }

      // 5.5. Share Access URL
      if (method === 'GET' && path.startsWith('/api/share/')) {
        const docId = path.split('/').pop()
        if (!docId) throw new Error('400:Missing share ID')
        
        let uid: string | undefined = undefined
        let email: string | undefined = undefined
        const authHeader = request.headers.get('Authorization')
        if (authHeader) {
          const payload = await verifyFirebaseToken(authHeader, env.FIREBASE_PROJECT_ID).catch(() => ({} as any))
          uid = payload.uid
          email = payload.email
        }

        // 1. Read Share Document (via REST API)
        // Note: For public links, we just query without auth. If the rule allows it (which it does for active, unexpired, requiresLogin=false), it works.
        // Wait, for account shares, it requires auth! So we pass the auth header if present.
        const shareUrl = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/shares/${docId}`
        const shareRes = await fetch(shareUrl, {
           headers: authHeader ? { 'Authorization': authHeader } : {}
        })
        if (!shareRes.ok) {
           if (shareRes.status === 404) throw new Error('404:Share not found or revoked')
           throw new Error('403:Share authorization failed')
        }
        
        const shareDoc = await shareRes.json() as any
        const fields = shareDoc.fields || {}
        
        const status = fields.status?.stringValue
        if (status !== 'active') throw new Error('403:Share is revoked or inactive')
        
        const expiresAt = fields.expiresAt?.timestampValue
        if (expiresAt && new Date(expiresAt) < new Date()) throw new Error('403:Share has expired')
        
        const requiresLogin = fields.requiresLogin?.booleanValue
        if (requiresLogin && !uid) throw new Error('401:Login required to access this share')
        
        const shareType = fields.shareType?.stringValue
        if (shareType === 'account') {
           const recipientEmail = fields.recipientEmail?.stringValue
           if (!email || recipientEmail?.toLowerCase() !== email.toLowerCase()) {
              throw new Error('403:You are not the recipient of this share')
           }
        }
        
        // 2. Fetch File Metadata using Admin Token to bypass rules (since frontend user is not owner)
        const { getFirestoreAdminToken } = await import('./admin.js')
        const adminToken = await getFirestoreAdminToken(env)
        
        const ownerId = fields.ownerId?.stringValue
        const fileId = fields.fileId?.stringValue
        
        const fileUrl = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${ownerId}/files/${fileId}`
        const fileRes = await fetch(fileUrl, {
           headers: { 'Authorization': `Bearer ${adminToken}` }
        })
        
        if (!fileRes.ok) {
           throw new Error('404:Underlying file is missing or unavailable')
        }
        
        const fileDoc = await fileRes.json() as any
        const fileFields = fileDoc.fields || {}
        const filename = fileFields.name?.stringValue || fileFields.originalName?.stringValue || fileId
        const mimeType = fileFields.mimeType?.stringValue || 'application/octet-stream'
        
        const action = url.searchParams.get('action') || 'preview' // preview or download
        const permission = fields.permission?.stringValue
        
        if (action === 'download' && permission !== 'view_download') {
           throw new Error('403:This share does not allow downloads')
        }
        
        const encodedFilename = encodeURIComponent(filename).replace(/['()]/g, escape).replace(/\*/g, '%2A')
        const disposition = action === 'preview' ? `inline; filename*=UTF-8''${encodedFilename}` : `attachment; filename*=UTF-8''${encodedFilename}`
        
        const objectKey = getObjectKey(ownerId, fileId)
        const s3 = getS3Client(env)
        
        const command = new GetObjectCommand({
          Bucket: 'sdl-dev-bucket',
          Key: objectKey,
          ResponseContentDisposition: disposition,
          ResponseContentType: mimeType
        })
        const signedUrl = await getSignedUrl(s3, command, { expiresIn: 900 })
        
        return jsonResponse({
           fileName: filename,
           permission,
           expiresAt,
           url: signedUrl
        })
      }

      // 6. Delete Object
      if (method === 'DELETE' && path.startsWith('/api/object/')) {
        const authHeader = request.headers.get('Authorization')
        const { uid } = await verifyFirebaseToken(authHeader, env.FIREBASE_PROJECT_ID)
        const fileId = path.split('/').pop()
        if (!fileId) throw new Error('400:Missing fileId')

        // Verify Firestore Ownership explicitly
        await verifyFirestoreOwnership(env, uid, fileId, authHeader as string)

        const objectKey = getObjectKey(uid, fileId)
        
        // Native R2 binding delete for speed
        await env.BUCKET.delete(objectKey)
        
        return jsonResponse({ success: true })
      }

      return jsonResponse({ error: 'Not Found', code: 404 }, 404)

    } catch (err: any) {
      return errorResponse(err)
    }
  }
}
