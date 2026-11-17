import { MAX_DIGITS, addDigits, canonical, commafy, parseAmount } from './numberToKorean.ts'

export const NUMBER_KOREAN_EXAMPLE = '123456789'
export const NUMBER_KOREAN_EXAMPLE_INPUT = '123,456,789'
export interface NumberEditingState {
  raw: string
  composing: boolean
  focused: boolean
  userEdited: boolean
  example: boolean
  urlRestored: boolean
  normalizePending: boolean
  generation: number
}
export type NumberEditingAction =
  | { type: 'hydrate'; params: URLSearchParams }
  | { type: 'change'; raw: string; isComposing?: boolean }
  | { type: 'compositionStart' }
  | { type: 'compositionEnd'; raw: string }
  | { type: 'focus' }
  | { type: 'blur' }
  | { type: 'normalizeDeferred'; generation: number }
  | { type: 'clear' }
  | { type: 'quickAdd'; amount: string }

export function initialNumberEditingState(): NumberEditingState {
  return { raw: NUMBER_KOREAN_EXAMPLE_INPUT, composing: false, focused: false, userEdited: false,
    example: true, urlRestored: false, normalizePending: false, generation: 0 }
}

/** Only the previous numeric formatter's grammar is normalized, never a Korean reading. */
export function formatNumberOnBlur(raw: string): string {
  if (!parseAmount(raw)) return raw
  const compact = raw.replace(/[\s,₩원정]/g, '').replace(/^(일금|금)/, '')
  const numeric = compact.match(/^([-−]?)(\d*)(\.\d*)?$/)
  if (!numeric || !/\d/.test(compact)) return raw
  return numeric[1] + (numeric[2] ? commafy(numeric[2]) : '') + (numeric[3] ?? '')
}

/** Preserve the existing quick-add rule: negative/invalid values start from zero. */
export function addNumberQuickAmount(raw: string, amount: string): string {
  if (!/^\d{1,20}$/.test(amount)) return raw
  const parsed = parseAmount(raw)
  const next = addDigits(parsed && !parsed.neg ? parsed.int : '0', amount)
  return next.length <= MAX_DIGITS ? commafy(next) + (parsed && !parsed.neg && parsed.frac ? '.' + parsed.frac : '') : raw
}

export function reduceNumberEditing(state: NumberEditingState, action: NumberEditingAction): NumberEditingState {
  const advance = (patch: Partial<NumberEditingState>) => ({ ...state, ...patch, generation: state.generation + 1 })
  switch (action.type) {
    case 'hydrate':
      if (state.urlRestored) return state
      if (state.userEdited || state.composing || !action.params.has('n')) return advance({ urlRestored: true })
      return advance({ raw: formatNumberOnBlur(action.params.get('n') ?? ''), example: false, urlRestored: true })
    case 'change':
      return advance({ raw: action.raw, userEdited: true, example: false, composing: state.composing || action.isComposing === true })
    case 'compositionStart':
      return advance({ composing: true, userEdited: true, example: false })
    case 'compositionEnd':
      return advance({ raw: action.raw, composing: false, userEdited: true, example: false })
    case 'focus':
      return advance({ focused: true, normalizePending: false })
    case 'blur':
      return advance({ focused: false, normalizePending: state.composing,
        raw: state.composing ? state.raw : formatNumberOnBlur(state.raw) })
    case 'normalizeDeferred':
      if (state.generation !== action.generation || state.composing || state.focused || !state.normalizePending) return state
      return advance({ raw: formatNumberOnBlur(state.raw), normalizePending: false })
    case 'clear':
      if (state.composing) return state
      return advance({ raw: '', userEdited: true, example: false, normalizePending: false })
    case 'quickAdd': {
      if (state.composing || !/^\d{1,20}$/.test(action.amount)) return state
      const raw = addNumberQuickAmount(state.raw, action.amount)
      return raw === state.raw && state.userEdited && !state.example ? state : advance({ raw, userEdited: true, example: false, normalizePending: false })
    }
  }
}

/** Reading a query is not an edit. Composition must not change the address bar. */
export function numberInputSyncUrl(currentUrl: string, state: NumberEditingState): string | null {
  if (!state.urlRestored || !state.userEdited || state.composing) return null
  const url = new URL(currentUrl), parsed = parseAmount(state.raw)
  if (state.raw === '') url.searchParams.set('n', '')
  else if (parsed) url.searchParams.set('n', canonical(parsed))
  else url.searchParams.delete('n')
  return url.toString()
}

/** Construct from current input, even before the URL-sync effect has run. */
export function numberShareUrl(currentUrl: string, state: NumberEditingState): string | null {
  if (!state.urlRestored || state.composing) return null
  const parsed = parseAmount(state.raw)
  if (!parsed) return null
  const url = new URL(currentUrl)
  url.searchParams.set('n', canonical(parsed))
  return url.toString()
}
