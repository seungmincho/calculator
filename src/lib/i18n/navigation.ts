'use client'

import { useEffect, useMemo, useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import koShared from '../../../messages/generated/ko/shared.json'
import { createTranslations } from './translationLookup'

type Messages = Record<string, unknown>

// 영어 번역은 영어를 고른 방문자만 받는다(동적 import 라 한국어 첫 로드 번들에 안 들어간다).
// 서버 렌더·첫 렌더는 언제나 한국어(LanguageContext 초기값 'ko')라 hydration 이 어긋나지 않고, 로드 전에도 한국어로 표시한다.
export function createLazyEnTranslations(ko: Messages, loadEnMessages: () => Promise<Messages>) {
  const koTranslations = createTranslations(ko)
  let enTranslations: ReturnType<typeof createTranslations> | null = null
  let enLoad: Promise<void> | null = null
  const loadEn = () => (enLoad ??= loadEnMessages().then(m => { enTranslations = createTranslations(m) }))

  return function useTranslations(namespace?: string) {
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
}

export const loadEnShared = () => import('../../../messages/generated/en/shared.json').then(m => m.default)

// 영어 공통 번역(~57KB)
export const useTranslations = createLazyEnTranslations(koShared, loadEnShared)
