'use client'

/**
 * Synchronous i18n replacement for next-intl.
 *
 * Uses static import of ko.json — no async loading, no Provider needed.
 * Drop-in compatible with next-intl's useTranslations API:
 *   - t('key')
 *   - t('nested.key')
 *   - t('key', { var: value })   ← {var} interpolation
 *   - t.raw('key')               ← returns raw value (array/object)
 *
 * To re-enable multi-language support in the future:
 *   1. Import enMessages from ko.json sibling
 *   2. Read language from LanguageContext
 *   3. Select messages by language
 */

import koMessages from '../../messages/ko.json'

const messages: Record<string, unknown> = koMessages as Record<string, unknown>

function getNestedValue(obj: Record<string, unknown>, key: string): unknown {
  if (!key.includes('.')) return obj[key]
  return key.split('.').reduce<unknown>((acc, k) => {
    if (acc == null || typeof acc !== 'object') return undefined
    return (acc as Record<string, unknown>)[k]
  }, obj)
}

function interpolate(str: string, vars: Record<string, unknown>): string {
  return str.replace(/\{(\w+)\}/g, (_, k) =>
    vars[k] != null ? String(vars[k]) : `{${k}}`
  )
}

type TranslationFn = {
  (key: string, vars?: Record<string, unknown>): string
  raw: (key: string) => unknown
}

// Generic type parameter T is for next-intl TypeScript API compatibility only
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useTranslations<T extends string = string>(namespace?: string): TranslationFn {
  const ns = (namespace ? (messages[namespace] ?? {}) : messages) as Record<string, unknown>

  function t(key: string, vars?: Record<string, unknown>): string {
    const val = getNestedValue(ns, key)
    if (typeof val !== 'string') return key
    return vars ? interpolate(val, vars) : val
  }

  t.raw = (key: string): unknown => getNestedValue(ns, key)

  return t
}
