'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { retryActiveTranslations } from '@/lib/i18n/translationResource'

export type Language = 'ko' | 'en'
interface LanguageContextType {
  language: Language
  changeLanguage: (newLanguage: Language) => void
  isInitialized: boolean
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)
export const isLanguage = (value: unknown): value is Language => value === 'ko' || value === 'en'
export function initialLanguage(saved: unknown, pathname: string): Language {
  return isLanguage(saved) ? saved : /^\/en(?:\/|$)/.test(pathname) ? 'en' : 'ko'
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('ko')
  const [isInitialized, setIsInitialized] = useState(false)
  const selectedByUser = useRef(false)

  useEffect(() => {
    let active = true
    let saved: string | null = null
    try { saved = window.localStorage.getItem('language') } catch { /* Preference storage is optional. */ }
    const initial = initialLanguage(saved, window.location.pathname)
    queueMicrotask(() => {
      if (!active) return
      if (!selectedByUser.current) setLanguage(initial)
      setIsInitialized(true)
    })
    return () => { active = false }
  }, [])

  const changeLanguage = useCallback((newLanguage: Language) => {
    if (!isLanguage(newLanguage)) return
    selectedByUser.current = true
    setLanguage(newLanguage)
    try { window.localStorage.setItem('language', newLanguage) } catch { /* Keep the in-memory choice. */ }
    // Selecting English again is an explicit retry even when React state is unchanged.
    if (newLanguage === 'en') void retryActiveTranslations()
  }, [])

  const value = useMemo(() => ({ language, changeLanguage, isInitialized }), [language, changeLanguage, isInitialized])
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

/** Generic translators and isolated SSR fixtures can safely default to Korean. */
export const useOptionalLanguage = () => useContext(LanguageContext)
export function useLanguage() {
  const context = useOptionalLanguage()
  if (context === undefined) throw new Error('useLanguage must be used within a LanguageProvider')
  return context
}
