'use client'

import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { useOptionalLanguage } from '@/contexts/LanguageContext'
import { createTranslations } from './translationLookup'
import { createTranslationResource, type TranslationLoader, type TranslationMessages, type TranslationResource } from './translationResource'

export function useResourceTranslations(resource: TranslationResource, namespace?: string, extraFallback?: TranslationMessages) {
  const preference = useOptionalLanguage()
  const language = preference?.isInitialized ? preference.language : 'ko'
  const snapshot = useSyncExternalStore(resource.subscribe, resource.getSnapshot, resource.getSnapshot)
  const previousLanguage = useRef(language)

  useEffect(() => {
    const retry = previousLanguage.current === 'ko' && language === 'en'
    previousLanguage.current = language
    if (language !== 'en') return
    const release = resource.retain()
    void resource.load({ retry })
    return release
  }, [resource, language, snapshot.revision])

  const primary = language === 'en' && snapshot.en ? snapshot.en : snapshot.ko
  const fallback = extraFallback ?? (primary === snapshot.ko ? undefined : snapshot.ko)
  const lookup = useMemo(() => ({ language, translate: createTranslations(primary, fallback)(namespace) }), [primary, fallback, namespace, language])
  return lookup.translate
}

/** Called at module scope; each factory preserves one resource across hook users. */
export function createLazyEnTranslations(ko: TranslationMessages, loadEn: TranslationLoader) {
  const resource = createTranslationResource(ko, loadEn)
  return function useTranslations(namespace?: string) {
    return useResourceTranslations(resource, namespace)
  }
}
