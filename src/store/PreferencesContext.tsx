import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { UserPreferences, ThemePreference, ViewMode, SortField } from '@/types'

const PREF_KEY = 'student_locker_prefs'

const defaultPreferences: UserPreferences = {
  theme: 'system',
  defaultView: 'list',
  defaultSort: 'uploadedAt',
  compactMode: false,
  aiSuggestionsEnabled: true,
  postUploadBehavior: 'stay',
}

interface PreferencesContextType {
  prefs: UserPreferences
  updatePref: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void
}

const PreferencesContext = createContext<PreferencesContextType | null>(null)

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<UserPreferences>(() => {
    try {
      const stored = localStorage.getItem(PREF_KEY)
      if (stored) {
        return { ...defaultPreferences, ...JSON.parse(stored) }
      }
    } catch {
      // ignore parse error
    }
    return defaultPreferences
  })

  // Persist on change
  useEffect(() => {
    localStorage.setItem(PREF_KEY, JSON.stringify(prefs))
  }, [prefs])

  // Apply theme immediately
  useEffect(() => {
    const root = document.documentElement
    
    // Remove existing theme classes
    root.classList.remove('light', 'dark')
    
    if (prefs.theme === 'system') {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (systemDark) root.classList.add('dark')
    } else {
      root.classList.add(prefs.theme)
    }

    // Apply compact mode
    if (prefs.compactMode) {
      root.classList.add('compact')
    } else {
      root.classList.remove('compact')
    }
  }, [prefs.theme, prefs.compactMode])

  // Listen for system theme changes if set to system
  useEffect(() => {
    if (prefs.theme !== 'system') return
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      const root = document.documentElement
      root.classList.remove('light', 'dark')
      if (e.matches) root.classList.add('dark')
    }
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [prefs.theme])

  const updatePref = useCallback(<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    setPrefs(p => ({ ...p, [key]: value }))
  }, [])

  return (
    <PreferencesContext.Provider value={{ prefs, updatePref }}>
      {children}
    </PreferencesContext.Provider>
  )
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext)
  if (!ctx) throw new Error('usePreferences must be used within a PreferencesProvider')
  return ctx
}
