'use client'

import { useMemo } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import koShared from '../../../messages/generated/ko/shared.json'
import enShared from '../../../messages/generated/en/shared.json'
import { createTranslations } from './translationLookup'

const koTranslations = createTranslations(koShared)
const enTranslations = createTranslations(enShared)

export function useTranslations(namespace?: string) {
  const { language } = useLanguage()
  return useMemo(
    () => (language === 'en' ? enTranslations : koTranslations)(namespace),
    [language, namespace],
  )
}
