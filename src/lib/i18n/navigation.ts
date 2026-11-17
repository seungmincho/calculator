'use client'

import { useResourceTranslations } from './lazyTranslations'
import { sharedTranslationResource } from './sharedResource'

// Keep existing lightweight wrapper imports compatible without importing the registry.
export { createLazyEnTranslations } from './lazyTranslations'
export { loadEnShared } from './sharedResource'
export function useTranslations(namespace?: string) {
  return useResourceTranslations(sharedTranslationResource, namespace)
}
