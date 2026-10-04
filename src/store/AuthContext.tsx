import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import type { UserProfile } from '@/types'

// ============================================================
// CONTEXT TYPE
// ============================================================

interface AuthContextType {
  /** The raw Firebase Auth user object, or null when signed out. */
  user: User | null
  /** The Firestore UserProfile document for the authenticated user, or null. */
  userProfile: UserProfile | null
  /** True while the initial auth state and profile are still being resolved. */
  loading: boolean
  /** Shortcut derived from user.emailVerified – always false when signed out. */
  isEmailVerified: boolean
}

// ============================================================
// CONTEXT
// ============================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// ============================================================
// PROVIDER
// ============================================================

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // Hold a reference to the Firestore unsubscribe fn so we can clean it up
  // whenever the auth user changes without creating stale closures.
  const profileUnsubRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    // Subscribe to Firebase Auth state changes.
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      // Always tear down any existing Firestore subscription first.
      if (profileUnsubRef.current) {
        profileUnsubRef.current()
        profileUnsubRef.current = null
      }

      if (firebaseUser) {
        setUser(firebaseUser)

        // Subscribe to the user's Firestore profile document in real-time so
        // that any backend updates (storage quota, display name, etc.) are
        // reflected immediately without a page reload.
        const profileRef = doc(db, 'users', firebaseUser.uid)
        const unsubProfile = onSnapshot(
          profileRef,
          (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data()

              const profile: UserProfile = {
                uid: firebaseUser.uid,
                email: data.email ?? firebaseUser.email ?? '',
                displayName: data.displayName ?? firebaseUser.displayName ?? '',
                phoneNumber: data.phoneNumber,
                collegeName: data.collegeName,
                rollNumber: data.rollNumber,
                department: data.department,
                yearOfStudy: data.yearOfStudy,
                photoURL: data.photoURL ?? firebaseUser.photoURL ?? undefined,
                emailVerified: data.emailVerified ?? firebaseUser.emailVerified,
                createdAt: data.createdAt?.toDate?.() ?? new Date(),
                updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
                storageUsed: data.storageUsed ?? 0,
                storageLimit: data.storageLimit ?? 5 * 1024 * 1024 * 1024,
              }
              setUserProfile(profile)
            } else {
              setUserProfile(null)
            }
            setLoading(false)
          },
          (error) => {
            console.error('[AuthContext] Firestore profile snapshot error:', error)
            setUserProfile(null)
            setLoading(false)
          },
        )

        // Remote Session Invalidation
        const sessionId = localStorage.getItem('sessionId')
        let unsubSession = () => {}
        if (sessionId) {
          unsubSession = onSnapshot(doc(db, 'users', firebaseUser.uid, 'loginActivity', sessionId), (snap) => {
             if (snap.exists() && snap.data().status === 'inactive') {
               auth.signOut()
             }
          })
        }

        profileUnsubRef.current = () => {
           unsubProfile()
           unsubSession()
        }
      } else {
        // User signed out – clear all state.
        setUser(null)
        setUserProfile(null)
        setLoading(false)
      }
    })

    return () => {
      unsubAuth()
      if (profileUnsubRef.current) {
        profileUnsubRef.current()
      }
    }
  }, [])

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    isEmailVerified: user?.emailVerified ?? false,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ============================================================
// HOOK
// ============================================================

/**
 * Returns the current auth context.
 * Must be used inside <AuthProvider>.
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
