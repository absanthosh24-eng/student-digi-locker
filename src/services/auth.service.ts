import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  updateEmail,
  updatePassword,
  deleteUser,
  AuthError,
} from 'firebase/auth'
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { UserProfile } from '@/types'

// ============================================================
// ERROR MAPPING
// ============================================================

function mapAuthError(error: AuthError): string {
  switch (error.code) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.'
    case 'auth/invalid-email':
      return 'Please enter a valid email address.'
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.'
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Your account has been temporarily locked.'
    case 'auth/user-disabled':
      return 'This account has been disabled.'
    case 'auth/requires-recent-login':
      return 'Please log out and log in again to perform this action.'
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection.'
    default:
      return 'An unexpected error occurred. Please try again.'
  }
}

// ============================================================
// AUTH OPERATIONS
// ============================================================

export async function registerUser(
  email: string,
  password: string,
  displayName: string,
  extraData?: Partial<UserProfile>
): Promise<void> {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(cred.user, { displayName })

    const profile: Partial<UserProfile> = {
      uid: cred.user.uid,
      email,
      displayName,
      emailVerified: false,
      storageUsed: 0,
      storageLimit: 5 * 1024 * 1024 * 1024, // 5GB
      ...extraData,
    }

    await setDoc(doc(db, 'users', cred.user.uid), {
      ...profile,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    const sessionId = crypto.randomUUID()
    localStorage.setItem('sessionId', sessionId)
    await setDoc(doc(db, 'users', cred.user.uid, 'loginActivity', sessionId), {
      sessionId,
      device: navigator.userAgent,
      loggedInAt: serverTimestamp(),
      status: 'active'
    })

    await sendEmailVerification(cred.user)
  } catch (err) {
    throw new Error(mapAuthError(err as AuthError))
  }
}

export async function loginUser(email: string, password: string): Promise<void> {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password)
    const sessionId = crypto.randomUUID()
    localStorage.setItem('sessionId', sessionId)
    await setDoc(doc(db, 'users', cred.user.uid, 'loginActivity', sessionId), {
      sessionId,
      device: navigator.userAgent,
      loggedInAt: serverTimestamp(),
      status: 'active'
    })
  } catch (err) {
    throw new Error(mapAuthError(err as AuthError))
  }
}

export async function logoutUser(): Promise<void> {
  const uid = auth.currentUser?.uid
  const sessionId = localStorage.getItem('sessionId')
  
  if (uid && sessionId) {
    await updateDoc(doc(db, 'users', uid, 'loginActivity', sessionId), {
      status: 'inactive',
      loggedOutAt: serverTimestamp()
    }).catch(() => {}) // Ignore errors if offline/deleted
  }
  
  localStorage.removeItem('sessionId')
  await signOut(auth)
}

export async function sendVerificationEmail(): Promise<void> {
  if (!auth.currentUser) throw new Error('No user logged in.')
  try {
    await sendEmailVerification(auth.currentUser)
  } catch (err) {
    throw new Error(mapAuthError(err as AuthError))
  }
}

export async function sendPasswordReset(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email)
  } catch (err) {
    throw new Error(mapAuthError(err as AuthError))
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return null
  const data = snap.data()
  return {
    ...data,
    createdAt: data.createdAt?.toDate?.() ?? new Date(),
    updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
  } as UserProfile
}

export function subscribeToUserProfile(
  uid: string,
  callback: (profile: UserProfile | null) => void
): () => void {
  return onSnapshot(doc(db, 'users', uid), (snap) => {
    if (!snap.exists()) {
      callback(null)
      return
    }
    const data = snap.data()
    callback({
      ...data,
      createdAt: data.createdAt?.toDate?.() ?? new Date(),
      updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
    } as UserProfile)
  })
}

export async function updateUserProfile(
  uid: string,
  data: Partial<Omit<UserProfile, 'uid' | 'createdAt'>>
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    ...data,
    updatedAt: serverTimestamp(),
  })

  if (auth.currentUser && (data.displayName || data.photoURL)) {
    await updateProfile(auth.currentUser, {
      displayName: data.displayName,
      photoURL: data.photoURL,
    })
  }
}

export async function changeEmail(newEmail: string): Promise<void> {
  if (!auth.currentUser) throw new Error('No user logged in.')
  try {
    await updateEmail(auth.currentUser, newEmail)
    await auth.currentUser.reload()
    await auth.currentUser.getIdToken(true) // Force token refresh so claims update
    await updateDoc(doc(db, 'users', auth.currentUser.uid), {
      email: newEmail,
      emailVerified: false,
      updatedAt: serverTimestamp(),
    })
    await setDoc(doc(db, 'users', auth.currentUser.uid, 'securityActivity', Date.now().toString()), {
      type: 'email_change',
      description: 'Email changed to ' + newEmail,
      createdAt: serverTimestamp(),
    })
    await sendEmailVerification(auth.currentUser)
  } catch (err) {
    throw new Error(mapAuthError(err as AuthError))
  }
}

export async function changePassword(newPassword: string): Promise<void> {
  if (!auth.currentUser) throw new Error('No user logged in.')
  try {
    await updatePassword(auth.currentUser, newPassword)
    // Log security event
    await setDoc(doc(db, 'users', auth.currentUser.uid, 'securityActivity', Date.now().toString()), {
      type: 'password_change',
      description: 'Password changed',
      createdAt: serverTimestamp(),
    })
  } catch (err) {
    throw new Error(mapAuthError(err as AuthError))
  }
}

export async function deleteAccount(): Promise<void> {
  if (!auth.currentUser) throw new Error('No user logged in.')
  const uid = auth.currentUser.uid
  try {
    await deleteDoc(doc(db, 'users', uid))
    await deleteUser(auth.currentUser)
  } catch (err) {
    throw new Error(mapAuthError(err as AuthError))
  }
}
