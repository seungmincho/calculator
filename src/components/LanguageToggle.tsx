'use client'

import { useState, useSyncExternalStore } from 'react'
import { Languages } from 'lucide-react'
import { useLanguage, type Language } from '@/contexts/LanguageContext'
import { useTranslations } from '@/lib/i18n/navigation'
import { getActiveTranslationFailureCount, getServerTranslationFailureCount, retryActiveTranslations, subscribeTranslationFailures } from '@/lib/i18n/translationResource'

const LANGUAGES: { code: Language; name: string }[] = [{ code: 'ko', name: '한국어' }, { code: 'en', name: 'English' }]

export default function LanguageToggle() {
  const [isOpen, setIsOpen] = useState(false)
  const { language, changeLanguage } = useLanguage()
  const t = useTranslations('common')
  const failures = useSyncExternalStore(subscribeTranslationFailures, getActiveTranslationFailureCount, getServerTranslationFailureCount)
  const currentLanguage = LANGUAGES.find(item => item.code === language) ?? LANGUAGES[0]
  const showFailure = language === 'en' && failures > 0

  return (
    <div data-language-toggle className="relative">
      <button type="button" aria-label={currentLanguage.name} aria-expanded={isOpen} onClick={() => setIsOpen(open => !open)} className="flex min-h-11 min-w-11 items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-sm text-sub hover:bg-soft">
        <Languages className="w-4 h-4" aria-hidden="true" />
        <span className="hidden xl:inline">{currentLanguage.name}</span>
        <span className="xl:hidden">{currentLanguage.code.toUpperCase()}</span>
      </button>
      {(isOpen || showFailure) && <div className={`z-50 mt-1 max-w-[calc(100vw-2rem)] bg-surface rounded-xl shadow-xl border border-line p-1 ${showFailure ? 'fixed top-14 left-4 right-4 w-auto sm:absolute sm:top-full sm:left-auto sm:right-0 sm:w-72' : 'absolute top-full right-0 w-40'}`}>
        {isOpen && LANGUAGES.map(item => <button type="button" key={item.code} onClick={() => { changeLanguage(item.code); setIsOpen(false) }} aria-pressed={language === item.code} className={`w-full min-h-11 px-3 py-2 text-left text-sm rounded-lg ${language === item.code ? 'bg-primary text-white' : 'text-body hover:bg-soft'}`}>
          {item.name}
        </button>)}
        {showFailure && <div data-translation-retry className="p-3 space-y-3">
          <p role="status" className="text-sm text-body">{t('translationLoadFailed')}</p>
          <button type="button" onClick={() => { void retryActiveTranslations() }} className="ui-btn-soft min-h-11 w-full px-3 py-2 text-sm">{t('retryTranslations')}</button>
        </div>}
      </div>}
      {isOpen && <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />}
    </div>
  )
}
