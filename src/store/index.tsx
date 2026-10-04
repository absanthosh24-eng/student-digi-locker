import React from 'react'
import { AuthProvider, useAuth } from './AuthContext'
import { ToastProvider, useToast } from './ToastContext'
import { UploadProvider, useUpload } from './UploadContext'
import { PreferencesProvider, usePreferences } from './PreferencesContext'

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <PreferencesProvider>
      <AuthProvider>
        <ToastProvider>
          <UploadProvider>{children}</UploadProvider>
        </ToastProvider>
      </AuthProvider>
    </PreferencesProvider>
  )
}

export { useAuth } from './AuthContext'
export { useToast } from './ToastContext'
export { useUpload } from './UploadContext'
export { usePreferences } from './PreferencesContext'
