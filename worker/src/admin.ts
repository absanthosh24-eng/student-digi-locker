import { SignJWT, importPKCS8 } from 'jose'
import { Env } from './index'

export async function getFirestoreAdminToken(env: Env): Promise<string> {
  if (!env.FIRESTORE_SERVICE_ACCOUNT) throw new Error('500:Server missing FIRESTORE_SERVICE_ACCOUNT')
  const sa = JSON.parse(env.FIRESTORE_SERVICE_ACCOUNT)
  const privateKey = await importPKCS8(sa.private_key, 'RS256')
  
  const jwt = await new SignJWT({
    iss: sa.client_email,
    sub: sa.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    scope: 'https://www.googleapis.com/auth/datastore'
  })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(privateKey)

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  })
  
  if (!response.ok) {
     const text = await response.text()
     throw new Error('500:Failed to get Admin token: ' + text)
  }
  const data: any = await response.json()
  return data.access_token
}
