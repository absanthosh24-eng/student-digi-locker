import React, { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/store'
import AppShell from '@/components/shell/AppShell'
import PageLoader from '@/components/common/PageLoader'

// Public pages
const LandingPage = lazy(() => import('@/pages/public/LandingPage'))
const LoginPage = lazy(() => import('@/pages/public/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/public/RegisterPage'))
const VerifyEmailPage = lazy(() => import('@/pages/public/VerifyEmailPage'))
const ForgotPasswordPage = lazy(() => import('@/pages/public/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('@/pages/public/ResetPasswordPage'))

// App pages
const DashboardPage = lazy(() => import('@/pages/app/DashboardPage'))
const MyFilesPage = lazy(() => import('@/pages/app/MyFilesPage'))
const FoldersPage = lazy(() => import('@/pages/app/FoldersPage'))
const CategoriesPage = lazy(() => import('@/pages/app/CategoriesPage'))
const SharedWithMePage = lazy(() => import('@/pages/app/SharedWithMePage'))
const SharedByMePage = lazy(() => import('@/pages/app/SharedByMePage'))
const RecycleBinPage = lazy(() => import('@/pages/app/RecycleBinPage'))
const ProfilePage = lazy(() => import('@/pages/app/ProfilePage'))
const SecurityPage = lazy(() => import('@/pages/app/SecurityPage'))
const SettingsPage = lazy(() => import('@/pages/app/SettingsPage'))
const SharedLinkPage = lazy(() => import('@/pages/public/SharedLinkPage'))

// ── Route guards ──────────────────────────────────────────────

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (user) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

// ── Router ────────────────────────────────────────────────────

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/share/:shareId" element={<SharedLinkPage />} />

          {/* Protected app routes */}
          <Route element={<PrivateRoute><AppShell /></PrivateRoute>}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/files" element={<MyFilesPage />} />
            <Route path="/folders" element={<FoldersPage />} />
            <Route path="/folders/:folderId" element={<FoldersPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/categories/:category" element={<CategoriesPage />} />
            <Route path="/shared-with-me" element={<SharedWithMePage />} />
            <Route path="/shared-by-me" element={<SharedByMePage />} />
            <Route path="/recycle-bin" element={<RecycleBinPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/security" element={<SecurityPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
