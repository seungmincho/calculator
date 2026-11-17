'use client'

import shared from '../../../messages/generated/ko/shared.json'
import messages from '../../../messages/generated/ko/fuelCalculator.json'
import { createLazyEnTranslations, loadEnShared } from './navigation'
import { loadTranslationFallback } from './translationFetch'
import { retryCatalogs } from './generatedRetryCatalogs'

export const useTranslations = createLazyEnTranslations({ ...shared, ...messages }, context =>
  Promise.all([loadEnShared(context), context?.retry
    ? loadTranslationFallback(retryCatalogs.fuelCalculator.url, retryCatalogs.fuelCalculator.namespaces)
    : import('../../../messages/generated/en/fuelCalculator.json').then(module => module.default)]).then(([s, m]) => ({ ...s, ...m })))
