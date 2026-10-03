export type TranslationFn = {
  (key: string, vars?: Record<string, unknown>): string
  raw: (key: string) => unknown
}

// Preserve the synchronous legacy lookup contract, including missing-key fallback
// and raw array/object values. No provider or asynchronous hydration is required.
export function createTranslations(messages: Record<string, unknown>) {
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
