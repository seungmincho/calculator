'use client'

import { useEffect, useMemo, useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import koShared from '../../../messages/generated/ko/shared.json'
import { createTranslations } from './translationLookup'

const koTranslations = createTranslations(koShared)

// 영어 공통 번역(~44KB)은 영어를 고른 방문자만 받는다. 로드 전에는 한국어로 표시.
let enTranslations: ReturnType<typeof createTranslations> | null = null
let enLoad: Promise<void> | null = null
const loadEn = () => (enLoad ??= import('../../../messages/generated/en/shared.json')
  .then(m => { enTranslations = createTranslations(m.default) }))

export function useTranslations(namespace?: string) {
  const { language } = useLanguage()
  const [enReady, setEnReady] = useState(enTranslations !== null)
  useEffect(() => {
    if (language === 'en' && !enReady) loadEn().then(() => setEnReady(true))
  }, [language, enReady])
  return useMemo(
    () => (language === 'en' && enReady && enTranslations ? enTranslations : koTranslations)(namespace),
    [language, enReady, namespace],
  )
}
