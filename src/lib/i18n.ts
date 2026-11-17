'use client'

import { useSyncExternalStore } from 'react'
import { useResourceTranslations } from './i18n/lazyTranslations'
import { sharedTranslationResource } from './i18n/sharedResource'
import { createTranslationResource, type TranslationLoader, type TranslationMessages, type TranslationResource } from './i18n/translationResource'

// KO is synchronous. Generated namespace modules attach a literal EN import thunk;
// registration never starts that import. Shared/scoped wrappers stay independent.
let korean: TranslationMessages = { ...sharedTranslationResource.getSnapshot().ko }
const resources = new Map<string, { value: unknown; loader?: TranslationLoader; resource: TranslationResource }>()
const emptyResource = createTranslationResource({})
const registryListeners = new Set<() => void>()
const loaderPromises = new WeakMap<TranslationLoader, Promise<TranslationMessages>>()
let revision = 0
const getRevision = () => revision
const subscribe = (listener: () => void) => {
  registryListeners.add(listener)
  return () => { registryListeners.delete(listener) }
}

function sharedLoader(loadEn: TranslationLoader): TranslationLoader {
  return context => {
    let promise = loaderPromises.get(loadEn)
    if (!promise) {
      promise = Promise.resolve().then(() => loadEn(context)).then(messages => {
        if (messages === null || typeof messages !== 'object' || Array.isArray(messages)) throw new Error('Invalid translation catalogue')
        return messages
      }).catch(error => {
        loaderPromises.delete(loadEn)
        throw error
      })
      loaderPromises.set(loadEn, promise)
    }
    return promise
  }
}

export function registerMessages(namespaces: TranslationMessages, loadEn?: TranslationLoader): void {
  let changed = false
  let nextKorean = korean
  for (const [namespace, value] of Object.entries(namespaces)) {
    const previous = resources.get(namespace)
    if (previous && previous.value === value && previous.loader === loadEn) continue
    if (korean[namespace] !== value) nextKorean = { ...nextKorean, [namespace]: value }
    const loader = loadEn ? sharedLoader(loadEn) : undefined
    if (previous) {
      previous.value = value
      previous.loader = loadEn
      previous.resource.replace({ [namespace]: value }, loader)
    } else {
      resources.set(namespace, { value, loader: loadEn, resource: createTranslationResource({ [namespace]: value }, loader) })
    }
    changed = true
  }
  if (!changed) return
  korean = nextKorean
  revision++
  for (const listener of registryListeners) listener()
}

// Generic retained for next-intl API compatibility. Root lookups retain all KO
// keys, while root EN loads shared only; non-shared consumers name their namespace.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useTranslations<T extends string = string>(namespace?: string) {
  useSyncExternalStore(subscribe, getRevision, getRevision)
  const resource = namespace
    ? resources.get(namespace)?.resource ?? (Object.hasOwn(sharedTranslationResource.getSnapshot().ko, namespace) ? sharedTranslationResource : emptyResource)
    : sharedTranslationResource
  return useResourceTranslations(resource, namespace, namespace ? undefined : korean)
}
