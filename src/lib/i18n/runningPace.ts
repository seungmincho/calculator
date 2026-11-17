'use client'

import messages from '../../../messages/generated/ko/runningPace.json'
import { createLazyEnTranslations } from './navigation'
import { loadTranslationFallback } from './translationFetch'
import { retryCatalogs } from './generatedRetryCatalogs'

export const useTranslations = createLazyEnTranslations(messages, context => context?.retry
  ? loadTranslationFallback(retryCatalogs.runningPace.url, retryCatalogs.runningPace.namespaces)
  : import('../../../messages/generated/en/runningPace.json').then(module => module.default))
