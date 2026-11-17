export type TranslationMessages = Record<string, unknown>
export interface TranslationLoadContext { retry: boolean }
export type TranslationLoader = (context?: TranslationLoadContext) => Promise<TranslationMessages>
export type TranslationResourceStatus = 'idle' | 'loading' | 'ready' | 'failed'
export interface TranslationResourceSnapshot {
  ko: TranslationMessages
  en: TranslationMessages | null
  status: TranslationResourceStatus
  revision: number
}
export interface TranslationResource {
  getSnapshot: () => TranslationResourceSnapshot
  subscribe: (listener: () => void) => () => void
  load: (options?: { retry?: boolean }) => Promise<void>
  replace: (ko: TranslationMessages, loadEn?: TranslationLoader) => void
  retain: () => () => void
}

// Only mounted English consumers retain resources. Visiting a tool in Korean does
// not make that tool part of a later global retry or failure message.
const activeResources = new Set<TranslationResource>()
const failureListeners = new Set<() => void>()
let activeFailureCount = 0

function publishFailureCount() {
  const next = [...activeResources].filter(resource => resource.getSnapshot().status === 'failed').length
  if (next === activeFailureCount) return
  activeFailureCount = next
  for (const listener of failureListeners) listener()
}

export const getActiveTranslationFailureCount = () => activeFailureCount
export const getServerTranslationFailureCount = () => 0
export function subscribeTranslationFailures(listener: () => void) {
  failureListeners.add(listener)
  return () => { failureListeners.delete(listener) }
}

/** Explicit user action only; loaded/inactive resources are never fetched again. */
export async function retryActiveTranslations(): Promise<void> {
  await Promise.all([...activeResources]
    .filter(resource => resource.getSnapshot().status === 'failed')
    .map(resource => resource.load({ retry: true })))
}

const messagesObject = (value: unknown): value is TranslationMessages => value !== null && typeof value === 'object' && !Array.isArray(value)

/** React-free loading state. A rejected loader is handled and cannot poison retries. */
export function createTranslationResource(initialKo: TranslationMessages, initialLoader?: TranslationLoader): TranslationResource {
  let snapshot: TranslationResourceSnapshot = { ko: initialKo, en: null, status: 'idle', revision: 0 }
  let loader = initialLoader
  let epoch = 0
  let pending: Promise<void> | null = null
  let retainCount = 0
  const listeners = new Set<() => void>()
  const publish = (next: TranslationResourceSnapshot) => {
    snapshot = next
    publishFailureCount()
    for (const listener of listeners) listener()
  }

  const resource: TranslationResource = {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    load(options = {}) {
      if (pending) return pending
      if (!loader || snapshot.status === 'ready' || (snapshot.status === 'failed' && !options.retry)) return Promise.resolve()
      const requestEpoch = epoch
      const requestLoader = loader
      const failedRetry = snapshot.status === 'failed' && options.retry === true
      const task: Promise<void> = Promise.resolve().then(() => requestLoader({ retry: failedRetry })).then(messages => {
        if (requestEpoch !== epoch) return
        if (!messagesObject(messages)) throw new Error('Invalid translation catalogue')
        if (pending === task) pending = null
        // Revision identifies the source/loader, not loading progress. A successful
        // catalogue has its own object identity for translation memoization.
        publish({ ...snapshot, en: messages, status: 'ready' })
      }).catch(() => {
        if (requestEpoch !== epoch) return
        if (pending === task) pending = null
        publish({ ...snapshot, en: null, status: 'failed' })
      }).finally(() => {
        if (pending === task) pending = null
      })
      pending = task
      publish({ ...snapshot, status: 'loading' })
      return task
    },
    replace(ko, loadEn) {
      if (ko === snapshot.ko && loadEn === loader) return
      epoch++
      pending = null
      loader = loadEn
      publish({ ko, en: null, status: 'idle', revision: snapshot.revision + 1 })
    },
    retain() {
      retainCount++
      if (retainCount === 1) { activeResources.add(resource); publishFailureCount() }
      let retained = true
      return () => {
        if (!retained) return
        retained = false
        retainCount--
        if (retainCount === 0) { activeResources.delete(resource); publishFailureCount() }
      }
    },
  }
  return resource
}
