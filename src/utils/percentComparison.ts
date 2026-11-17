import { parseNum, percentOf, ratio, change, discount, originalPrice, chainRate, vatSplit } from './percent.ts'

export const PERCENT_COMPARISON_LIMIT = 6
export type PercentCard = 'of' | 'ratio' | 'change' | 'discount' | 'reverse' | 'chain' | 'pp' | 'vat'
export type PercentField = 'a' | 'b' | 'p' | 'w' | 'f' | 't' | 'dp' | 'dr' | 'rs' | 'rr' | 'cp' | 'x' | 'y' | 'v'
export type PercentValues = Readonly<Record<PercentField, string>>
export type PercentUnit = '' | '%' | '%p'
export type PercentError = 'empty' | 'invalid' | 'zeroBase' | 'negative' | 'rateRange' | 'rate100' | 'overflow'
export const PERCENT_FIELDS: Readonly<Record<PercentCard, readonly PercentField[]>> = Object.freeze({
  of: Object.freeze(['a', 'b'] as const), ratio: Object.freeze(['p', 'w'] as const), change: Object.freeze(['f', 't'] as const),
  discount: Object.freeze(['dp', 'dr'] as const), reverse: Object.freeze(['rs', 'rr'] as const), chain: Object.freeze(['cp'] as const),
  pp: Object.freeze(['x', 'y'] as const), vat: Object.freeze(['v'] as const),
})
export const PERCENT_FIELD_LABELS: Readonly<Record<PercentField, string>> = Object.freeze({ a: 'of.a', b: 'of.p', p: 'ratio.part', w: 'ratio.whole', f: 'change.from', t: 'change.to', dp: 'discount.price', dr: 'discount.rate', rs: 'reverse.sale', rr: 'reverse.rate', cp: 'chain.price', x: 'pp.before', y: 'pp.after', v: 'vat.total' })
export type PercentEvaluation = { ok: true; value: number; unit: PercentUnit } | { ok: false; error: PercentError }
const error = (error: PercentError): PercentEvaluation => ({ ok: false, error })
const finite = (value: number, unit: PercentUnit, ...related: (number | null)[]): PercentEvaluation =>
  [value, ...related].every(n => n === null || Number.isFinite(n)) ? { ok: true, value, unit } : error('overflow')

/** Validate raw inputs and all displayed numeric outputs using the existing formulas unchanged. */
export function evaluatePercentCard(kind: PercentCard, values: PercentValues, chain: readonly string[]): PercentEvaluation {
  if (kind === 'chain') {
    if (!chain.length || chain.length > 5) return error('invalid')
    if (chain.some(raw => !raw.trim())) return error('empty')
    const rates = chain.map(parseNum)
    if (rates.some(n => n === null || !Number.isFinite(n))) return error('invalid')
    const valid = rates as number[]
    if (valid.some(n => n < 0 || n > 100)) return error('rateRange')
    const value = chainRate(valid), price = values.cp.trim() ? parseNum(values.cp) : null
    // Price remains optional as in the original card; only an actually displayed price participates.
    const finalPrice = price !== null && price >= 0 ? price * (1 - value / 100) : null
    return finite(value, '%', finalPrice)
  }
  const fields = PERCENT_FIELDS[kind]
  if (fields.some(key => !values[key].trim())) return error('empty')
  const parsed = fields.map(key => parseNum(values[key]))
  if (parsed.some(n => n === null || !Number.isFinite(n))) return error('invalid')
  const [a, b] = parsed as number[]
  switch (kind) {
    case 'of': return finite(percentOf(a, b), '')
    case 'ratio': { const value = ratio(a, b); return value === null ? error('zeroBase') : finite(value, '%') }
    case 'change': { const result = change(a, b); return result.pct === null ? error('zeroBase') : finite(result.pct, '%', result.diff) }
    case 'discount': {
      if (a < 0) return error('negative')
      if (b < 0 || b > 100) return error('rateRange')
      const result = discount(a, b); return finite(result.sale, '', result.off)
    }
    case 'reverse': {
      if (a < 0) return error('negative')
      if (b < 0) return error('rateRange')
      const value = originalPrice(a, b); return value === null ? error('rate100') : finite(value, '', value - a)
    }
    case 'pp': return finite(b - a, '%p', change(a, b).pct)
    case 'vat': { const result = vatSplit(a); return finite(result.supply, '', result.vat) }
  }
}

export interface PercentSnapshot {
  readonly id: string
  readonly kind: PercentCard
  readonly inputs: readonly Readonly<{ key: PercentField; raw: string }>[]
  readonly chain: readonly string[]
  readonly decimals: number
  readonly korean: boolean
  readonly value: number
  readonly unit: PercentUnit
  readonly main: string
  readonly formula: string
}
export interface PercentSnapshotDraft {
  kind: PercentCard; values: PercentValues; chain: readonly string[]; decimals: number; korean: boolean
  main: string; formula: string
}
export function createPercentSnapshot(draft: PercentSnapshotDraft, id: string): { ok: true; snapshot: PercentSnapshot } | { ok: false; error: PercentError } {
  if (!id || !Number.isInteger(draft.decimals) || draft.decimals < 0 || draft.decimals > 4 || typeof draft.korean !== 'boolean' || !draft.main || !draft.formula) return { ok: false, error: 'invalid' }
  const result = evaluatePercentCard(draft.kind, draft.values, draft.chain)
  if (!result.ok) return result
  return { ok: true, snapshot: Object.freeze({ id, kind: draft.kind,
    inputs: Object.freeze(PERCENT_FIELDS[draft.kind].map(key => Object.freeze({ key, raw: draft.values[key] }))),
    chain: Object.freeze(draft.kind === 'chain' ? [...draft.chain] : []), decimals: draft.decimals, korean: draft.korean,
    value: result.value, unit: result.unit, main: draft.main, formula: draft.formula,
  }) }
}
function identity(item: PercentSnapshot): string {
  return JSON.stringify([item.kind, item.inputs, item.chain, item.decimals, item.korean, item.value, item.unit, item.main, item.formula])
}
export function addPercentSnapshot(items: readonly PercentSnapshot[], snapshot: PercentSnapshot): { ok: true; items: readonly PercentSnapshot[] } | { ok: false; error: 'duplicate' | 'limit' } {
  if (items.some(item => item.id === snapshot.id || identity(item) === identity(snapshot))) return { ok: false, error: 'duplicate' }
  if (items.length >= PERCENT_COMPARISON_LIMIT) return { ok: false, error: 'limit' }
  return { ok: true, items: Object.freeze([...items, snapshot]) }
}
export function removePercentSnapshot(items: readonly PercentSnapshot[], id: string): readonly PercentSnapshot[] {
  return Object.freeze(items.filter(item => item.id !== id))
}
export type PercentTranslator = (key: string, values?: Record<string, string | number>) => string
/** Plain text only. Preserve every raw value and formula, without CSV/spreadsheet coercion. */
export function percentComparisonText(items: readonly PercentSnapshot[], t: PercentTranslator): string {
  if (!items.length) return ''
  return [t('comparison.title'), t('comparison.memoryOnly'), ...items.map((item, index) => [
    '', `${index + 1}. ${t(`${item.kind}.title`)}`, `${t('comparison.result')}: ${item.main}`,
    ...item.inputs.map(input => `${t(PERCENT_FIELD_LABELS[input.key])}: ${input.raw}`),
    ...item.chain.map((raw, n) => `${t('chain.step', { n: n + 1 })}: ${raw}`),
    `${t('settings.decimals')}: ${item.decimals}`, `${t('settings.koUnit')}: ${t(item.korean ? 'comparison.on' : 'comparison.off')}`,
    `${t('comparison.formula')}: ${item.formula}`,
  ].join('\n'))].join('\n')
}

/** Only the existing calculator-owned query keys change. Caller retains history.state. */
export function percentStateUrl(currentUrl: string, values: PercentValues, defaults: PercentValues, chain: readonly string[], defaultChain: readonly string[], decimals: number, defaultDecimals: number, korean: boolean): string {
  const url = new URL(currentUrl)
  for (const key of Object.keys(defaults) as PercentField[]) { url.searchParams.delete(key); if (values[key] !== defaults[key]) url.searchParams.set(key, values[key]) }
  for (const key of ['c', 'd', 'k']) url.searchParams.delete(key)
  if (chain.join(',') !== defaultChain.join(',')) url.searchParams.set('c', chain.join(','))
  if (decimals !== defaultDecimals) url.searchParams.set('d', String(decimals))
  if (korean) url.searchParams.set('k', '1')
  return url.toString()
}
