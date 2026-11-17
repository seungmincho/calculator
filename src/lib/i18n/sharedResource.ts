import koShared from '../../../messages/generated/ko/shared.json'
import { createTranslationResource, type TranslationLoadContext, type TranslationMessages } from './translationResource'
import { loadTranslationFallback } from './translationFetch'
import { retryCatalogs } from './generatedRetryCatalogs'

let english: Promise<TranslationMessages> | null = null
export function loadEnShared(context?: TranslationLoadContext): Promise<TranslationMessages> {
  if (!english) {
    english = (context?.retry
      ? loadTranslationFallback(retryCatalogs.shared.url, retryCatalogs.shared.namespaces)
      : import('../../../messages/generated/en/shared.json').then(module => module.default)).catch(error => {
      english = null
      throw error
    })
  }
  return english
}

export const sharedTranslationResource = createTranslationResource(koShared, loadEnShared)
