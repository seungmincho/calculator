import type { TranslationMessages } from './translationResource'

const catalogues = new Map<string, Promise<TranslationMessages>>()
const object = (value: unknown): value is TranslationMessages => value !== null && typeof value === 'object' && !Array.isArray(value)

/** Only used after an explicit retry of a failed import. Hashed assets avoid stale catalogues. */
export function loadTranslationFallback(url: string, namespaces: readonly string[]): Promise<TranslationMessages> {
  const expected = new Set(namespaces)
  if (!/^\/i18n\/en\/(?:ns\/)?[a-zA-Z0-9_-]+\.[a-f0-9]{16}\.json$/.test(url) || expected.size === 0 || expected.size !== namespaces.length) return Promise.reject(new Error('Invalid translation asset'))
  const key = `${url}|${[...expected].sort().join(',')}`
  const cached = catalogues.get(key)
  if (cached) return cached
  const request: Promise<TranslationMessages> = Promise.resolve().then(() => fetch(url, { cache: 'no-store' })).then(async response => {
    if (!response.ok) throw new Error('Translation request failed')
    const messages: unknown = await response.json()
    if (!object(messages) || Object.keys(messages).length !== expected.size || !Object.keys(messages).every(namespace => expected.has(namespace)) || !namespaces.every(namespace => object(messages[namespace]))) throw new Error('Invalid translation catalogue')
    return messages
  }).catch(error => {
    if (catalogues.get(key) === request) catalogues.delete(key)
    throw error
  })
  catalogues.set(key, request)
  return request
}
