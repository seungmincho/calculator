export type TranslationFn = {
  (key: string, vars?: Record<string, unknown>): string
  raw: (key: string) => unknown
}

const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)

function sameShape(value: unknown, fallback: unknown): boolean {
  if (Array.isArray(fallback)) return Array.isArray(value) && value.length === fallback.length && fallback.every((item, index) => sameShape(value[index], item))
  if (object(fallback)) return object(value) && Object.entries(fallback).every(([key, item]) => sameShape(value[key], item))
  return fallback === null ? value === null : typeof value === typeof fallback
}

/** Keep arrays atomic: mixing translated indices can change their meaning. */
export function withTranslationFallback(primary: unknown, fallback: unknown): unknown {
  if (fallback === undefined) return primary
  if (Array.isArray(fallback)) return sameShape(primary, fallback) ? primary : fallback
  if (object(fallback)) {
    if (!object(primary)) return fallback
    return Object.fromEntries([...new Set([...Object.keys(fallback), ...Object.keys(primary)])]
      .map(key => [key, withTranslationFallback(primary[key], fallback[key])]))
  }
  return sameShape(primary, fallback) ? primary : fallback
}

// Pure lookup remains callable outside React, including SSR/data verification.
export function createTranslations(primary: Record<string, unknown>, fallback?: Record<string, unknown>) {
  const messages = (fallback ? withTranslationFallback(primary, fallback) : primary) as Record<string, unknown>
  // Generic retained for compatibility with existing next-intl-style callers.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return function useTranslations<T extends string = string>(namespace?: string): TranslationFn {
    const scope = (namespace ? (messages[namespace] ?? {}) : messages) as Record<string, unknown>
    function lookup(key: string): unknown {
      if (!key.includes('.')) return scope[key]
      return key.split('.').reduce<unknown>((value, part) => {
        if (value == null || typeof value !== 'object') return undefined
        return (value as Record<string, unknown>)[part]
      }, scope)
    }
    function translate(key: string, vars?: Record<string, unknown>): string {
      const value = lookup(key)
      if (typeof value !== 'string') return key
      return vars ? value.replace(/\{(\w+)\}/g, (_, name) => vars[name] != null ? String(vars[name]) : `{${name}}`) : value
    }
    translate.raw = lookup
    return translate
  }
}
