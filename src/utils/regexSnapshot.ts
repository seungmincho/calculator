import { captureRegexJob, REGEX_LIMITS, type RegexJob } from './regexEngine.ts'

export const REGEX_URL_KEYS = ['operation', 'pattern', 'flags', 'replacement', 'input', 'transform'] as const
export function createRegexDraft(): RegexJob { return { operation: 'grep', pattern: '', flags: 'g', replacement: '', inputText: '', transform: 'none' } }
export interface RegexUrlRestore { draft: RegexJob; warnings: Array<'malformedEncoding' | 'invalidOperation' | 'invalidTransform' | 'duplicateParameter'> }
/** Legacy pattern/input had an extra encodeURIComponent layer; replacement did not. */
export function restoreRegexUrl(params: URLSearchParams): RegexUrlRestore {
  const draft = createRegexDraft(), warnings: RegexUrlRestore['warnings'] = []
  const warning = (code: RegexUrlRestore['warnings'][number]) => { if (!warnings.includes(code)) warnings.push(code) }
  for (const key of REGEX_URL_KEYS) if (params.getAll(key).length > 1) warning('duplicateParameter')
  const decode = (value: string) => { try { return decodeURIComponent(value) } catch { warning('malformedEncoding'); return value } }
  if (params.has('operation')) { const value = params.get('operation'); if (value === 'grep' || value === 'replace' || value === 'extract') draft.operation = value; else warning('invalidOperation') }
  if (params.has('pattern')) draft.pattern = decode(params.get('pattern') ?? '')
  if (params.has('input')) draft.inputText = decode(params.get('input') ?? '')
  if (params.has('flags')) draft.flags = params.get('flags') ?? '' // An explicit empty string means non-global, not the default g.
  if (params.has('replacement')) draft.replacement = params.get('replacement') ?? ''
  if (params.has('transform')) {
    const value = params.get('transform')
    if (value === 'none' || (value === 'dedupe' && draft.operation === 'grep') || (value === 'uppercaseMatch' && draft.operation === 'replace')) draft.transform = value
    else warning('invalidTransform')
  }
  return { draft, warnings }
}
export type RegexUrlUpdate = { kind: 'ready'; href: string; shareUrl: string } | { kind: 'tooLong' | 'invalidInput' | 'invalidEncoding'; href: string; shareUrl: null }
/** Return a cleaned URL on failure: never leave an older regex snapshot shareable. */
export function updateRegexUrl(href: string, draft: unknown): RegexUrlUpdate {
  const clean = new URL(href)
  for (const key of REGEX_URL_KEYS) clean.searchParams.delete(key)
  let job: Readonly<RegexJob>
  try { job = captureRegexJob(draft) } catch { return { kind: 'invalidInput', href: clean.href, shareUrl: null } }
  const rawLength = job.inputText.length + job.pattern.length + job.replacement.length
  if (rawLength > REGEX_LIMITS.url || clean.href.length > REGEX_LIMITS.url) return { kind: 'tooLong', href: clean.href, shareUrl: null }
  const url = new URL(clean.href)
  try {
    // URLSearchParams otherwise replaces lone surrogates in these singly encoded fields.
    encodeURIComponent(job.replacement); encodeURIComponent(job.flags)
    url.searchParams.set('operation', job.operation); url.searchParams.set('flags', job.flags)
    url.searchParams.set('pattern', encodeURIComponent(job.pattern)); url.searchParams.set('input', encodeURIComponent(job.inputText))
    url.searchParams.set('replacement', job.replacement); url.searchParams.set('transform', job.transform)
  } catch { return { kind: 'invalidEncoding', href: clean.href, shareUrl: null } }
  if (url.href.length > REGEX_LIMITS.url) return { kind: 'tooLong', href: clean.href, shareUrl: null }
  return { kind: 'ready', href: url.href, shareUrl: url.href }
}
/** Identity of all executable input fields; caller revision also distinguishes A→B→A. */
export function regexJobKey(job: Readonly<RegexJob>): string { return JSON.stringify([job.operation, job.pattern, job.flags, job.replacement, job.inputText, job.transform]) }
