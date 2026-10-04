'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import koGovernment from '../../../messages/generated/ko/governmentSubsidy.json'
import enGovernment from '../../../messages/generated/en/governmentSubsidy.json'
import koYouthRent from '../../../messages/generated/ko/youthRentSubsidy.json'
import enYouthRent from '../../../messages/generated/en/youthRentSubsidy.json'
import { createTranslations } from './translationLookup'

const koTranslations = createTranslations({ ...koGovernment, ...koYouthRent })
const enTranslations = createTranslations({ ...enGovernment, ...enYouthRent })

export function useTranslations(namespace?: string) {
  const { language } = useLanguage()
  const translate = language === 'en' ? enTranslations : koTranslations
  return translate(namespace)
}
