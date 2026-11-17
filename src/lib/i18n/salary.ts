'use client'

import shared from '../../../messages/generated/ko/shared.json'
import messages from '../../../messages/generated/ko/salary.json'
import { createLazyEnTranslations, loadEnShared } from './navigation'
import { loadTranslationFallback } from './translationFetch'
import { retryCatalogs } from './generatedRetryCatalogs'

export const useTranslations = createLazyEnTranslations({ ...shared, ...messages }, context =>
  Promise.all([loadEnShared(context), context?.retry
    ? loadTranslationFallback(retryCatalogs.salary.url, retryCatalogs.salary.namespaces)
    : import('../../../messages/generated/en/salary.json').then(module => module.default)]).then(([s, m]) => ({ ...s, ...m })))
