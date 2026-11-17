'use client'

import koGovernment from '../../../messages/generated/ko/governmentSubsidy.json'
import koYouthRent from '../../../messages/generated/ko/youthRentSubsidy.json'
import { createLazyEnTranslations } from './navigation'
import { loadTranslationFallback } from './translationFetch'
import { retryCatalogs } from './generatedRetryCatalogs'

export const useTranslations = createLazyEnTranslations({ ...koGovernment, ...koYouthRent }, context =>
  Promise.all([
    context?.retry
      ? loadTranslationFallback(retryCatalogs.governmentSubsidy.url, retryCatalogs.governmentSubsidy.namespaces)
      : import('../../../messages/generated/en/governmentSubsidy.json').then(module => module.default),
    context?.retry
      ? loadTranslationFallback(retryCatalogs.youthRentSubsidy.url, retryCatalogs.youthRentSubsidy.namespaces)
      : import('../../../messages/generated/en/youthRentSubsidy.json').then(module => module.default),
  ]).then(([g, y]) => ({ ...g, ...y })))
