export const DISCOUNT_COMPARISON_LIMITS = Object.freeze({ rows: 4, name: 40, unitPrice: 1_000_000_000, quantity: 999, coupon: 1_000_000_000_000, shipping: 10_000_000, urlLength: 256 })
export const DISCOUNT_COMPARISON_PARAM = 'compare'
export const DISCOUNT_COMPARISON_FIELDS = ['unitPrice', 'quantity', 'coupon', 'shipping'] as const
export type DiscountNumericField = typeof DISCOUNT_COMPARISON_FIELDS[number]
export type DiscountConditionField = DiscountNumericField | 'name'
export interface DiscountConditionDraft { readonly id: string; readonly name: string; readonly unitPrice: string; readonly quantity: string; readonly coupon: string; readonly shipping: string }
export interface DiscountConditionNumbers { readonly unitPrice: number; readonly quantity: number; readonly coupon: number; readonly shipping: number }
export interface DiscountConditionResult extends DiscountConditionNumbers {
  readonly subtotal: number; readonly appliedCoupon: number; readonly excessCoupon: number; readonly goodsTotal: number; readonly total: number; readonly unitAverage: number
}
export type DiscountFieldError = 'missing' | 'integer' | 'range' | 'name'
export interface DiscountConditionEvaluation {
  readonly id: string; readonly status: 'ready' | 'missing' | 'invalid'
  readonly errors: Readonly<Partial<Record<DiscountConditionField, DiscountFieldError>>>
  readonly result: Readonly<DiscountConditionResult> | null
}
export interface DiscountComparisonEvaluation {
  readonly rows: readonly DiscountConditionEvaluation[]; readonly validCount: number; readonly totalCount: number; readonly allReady: boolean
  readonly error: 'count' | 'structure' | null; readonly lowestTotalIds: readonly string[]; readonly lowestUnitIds: readonly string[]
}
export interface DiscountComparisonRow extends DiscountConditionResult { readonly id: string; readonly name: string }
export interface DiscountComparisonSnapshot { readonly rows: readonly Readonly<DiscountComparisonRow>[]; readonly lowestTotalIds: readonly string[]; readonly lowestUnitIds: readonly string[] }
const idPattern = /^[A-Za-z0-9_-]{1,80}$/
export function normalizeDiscountConditionName(value: string): string { return value.replace(/\r\n|\r|\n/g, ' ') }
function parseInteger(value: unknown, field: DiscountNumericField): { value: number; error: null } | { value: null; error: DiscountFieldError } {
  if (typeof value !== 'string') return { value: null, error: 'integer' }
  if (!value.trim()) return { value: null, error: 'missing' }
  if (value.length > 32 || !/^\d+$/.test(value)) return { value: null, error: 'integer' }
  const number = Number(value)
  if (!Number.isSafeInteger(number) || number < (field === 'quantity' ? 1 : 0) || number > DISCOUNT_COMPARISON_LIMITS[field]) return { value: null, error: 'range' }
  return { value: number, error: null }
}
/** Only call with the validated integer projection; no displayed rounding participates in comparisons. */
function calculate(numbers: DiscountConditionNumbers): Readonly<DiscountConditionResult> {
  const subtotal = numbers.unitPrice * numbers.quantity, appliedCoupon = Math.min(numbers.coupon, subtotal)
  const goodsTotal = subtotal - appliedCoupon, total = goodsTotal + numbers.shipping
  return Object.freeze({ ...numbers, subtotal, appliedCoupon, excessCoupon: numbers.coupon - appliedCoupon, goodsTotal, total, unitAverage: total / numbers.quantity })
}
export function compareDiscountUnitAmounts(a: Pick<DiscountConditionResult, 'total' | 'quantity'>, b: Pick<DiscountConditionResult, 'total' | 'quantity'>): -1 | 0 | 1 {
  // Maximum checked total * quantity is 998,010,990,000,000, below 2^53.
  const left = a.total * b.quantity, right = b.total * a.quantity
  return left < right ? -1 : left > right ? 1 : 0
}
export function evaluateDiscountComparison(drafts: readonly DiscountConditionDraft[]): DiscountComparisonEvaluation {
  let error: DiscountComparisonEvaluation['error'] = !Array.isArray(drafts) || drafts.length > DISCOUNT_COMPARISON_LIMITS.rows ? 'count' : null
  const used = new Set<string>()
  const rows: DiscountConditionEvaluation[] = (Array.isArray(drafts) ? drafts.slice(0, DISCOUNT_COMPARISON_LIMITS.rows) : []).map((draft: DiscountConditionDraft) => {
    const errors: Partial<Record<DiscountConditionField, DiscountFieldError>> = {}, numbers = {} as Record<DiscountNumericField, number>
    if (!draft || typeof draft !== 'object' || typeof draft.id !== 'string' || !idPattern.test(draft.id) || used.has(draft.id)) error = 'structure'
    used.add(draft?.id)
    if (typeof draft?.name !== 'string' || draft.name.length > 160 || Array.from(normalizeDiscountConditionName(draft.name)).length > DISCOUNT_COMPARISON_LIMITS.name || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(draft.name)) errors.name = 'name'
    for (const field of DISCOUNT_COMPARISON_FIELDS) {
      const parsed = parseInteger(draft?.[field], field)
      if (parsed.error) errors[field] = parsed.error
      else numbers[field] = parsed.value
    }
    const values = Object.values(errors), status = !values.length ? 'ready' : values.some(value => value !== 'missing') ? 'invalid' : 'missing'
    return Object.freeze({ id: draft?.id ?? '', status, errors: Object.freeze(errors), result: status === 'ready' ? calculate(numbers) : null })
  })
  const allReady = !error && rows.length > 0 && rows.every(row => row.status === 'ready')
  let lowestTotalIds: string[] = [], lowestUnitIds: string[] = []
  if (allReady && rows.length >= 2) {
    let bestTotal = rows[0], bestUnit = rows[0]
    for (const row of rows) {
      if (row.result!.total < bestTotal.result!.total) bestTotal = row
      if (compareDiscountUnitAmounts(row.result!, bestUnit.result!) < 0) bestUnit = row
    }
    lowestTotalIds = rows.filter(row => row.result!.total === bestTotal.result!.total).map(row => row.id)
    lowestUnitIds = rows.filter(row => compareDiscountUnitAmounts(row.result!, bestUnit.result!) === 0).map(row => row.id)
  }
  return Object.freeze({ rows: Object.freeze(rows), validCount: rows.filter(row => row.status === 'ready').length, totalCount: Array.isArray(drafts) ? drafts.length : 0, allReady, error, lowestTotalIds: Object.freeze(lowestTotalIds), lowestUnitIds: Object.freeze(lowestUnitIds) })
}
/** No partial export: every existing row must be valid, including its bounded name and unique ID. */
export function captureDiscountComparison(drafts: readonly DiscountConditionDraft[]): DiscountComparisonSnapshot | null {
  const evaluated = evaluateDiscountComparison(drafts)
  if (!evaluated.allReady) return null
  return Object.freeze({ rows: Object.freeze(evaluated.rows.map((row, index) => Object.freeze({ ...row.result!, id: row.id, name: normalizeDiscountConditionName(drafts[index].name) }))), lowestTotalIds: evaluated.lowestTotalIds, lowestUnitIds: evaluated.lowestUnitIds })
}
export function createDiscountComparisonExamples(): DiscountConditionDraft[] {
  return [
    { id: 'condition-1', name: '', unitPrice: '80000', quantity: '1', coupon: '0', shipping: '0' },
    { id: 'condition-2', name: '', unitPrice: '76000', quantity: '1', coupon: '0', shipping: '5000' },
  ]
}
export function createDiscountCondition(id: string, finalPrice?: number): DiscountConditionDraft | null {
  if (!idPattern.test(id)) return null
  if (finalPrice !== undefined && (!Number.isFinite(finalPrice) || finalPrice < 0 || Math.round(finalPrice) > DISCOUNT_COMPARISON_LIMITS.unitPrice)) return null
  return { id, name: '', unitPrice: finalPrice === undefined ? '' : String(Math.round(finalPrice)), quantity: '1', coupon: '0', shipping: '0' }
}
/** Only four numeric tuples are serialized: never names, IDs, outcomes or source discount steps. */
export function encodeDiscountComparison(drafts: readonly DiscountConditionDraft[]): string | null {
  const snapshot = captureDiscountComparison(drafts)
  return snapshot ? `v1:${snapshot.rows.map(row => DISCOUNT_COMPARISON_FIELDS.map(field => String(row[field])).join(',')).join(';')}` : null
}
export type DiscountComparisonDecode = { readonly kind: 'absent' } | { readonly kind: 'invalid' } | { readonly kind: 'ready'; readonly rows: readonly DiscountConditionDraft[] }
export function decodeDiscountComparison(value: unknown): DiscountComparisonDecode {
  if (value === null || value === undefined) return { kind: 'absent' }
  if (typeof value !== 'string' || value.length > DISCOUNT_COMPARISON_LIMITS.urlLength || !value.startsWith('v1:')) return { kind: 'invalid' }
  const tuples = value.slice(3).split(';')
  if (!tuples.length || tuples.length > DISCOUNT_COMPARISON_LIMITS.rows) return { kind: 'invalid' }
  const rows: DiscountConditionDraft[] = []
  for (let index = 0; index < tuples.length; index++) {
    const parts = tuples[index].split(',')
    if (parts.length !== 4) return { kind: 'invalid' }
    const row = { id: `condition-${index + 1}`, name: '', unitPrice: parts[0], quantity: parts[1], coupon: parts[2], shipping: parts[3] }
    rows.push(row)
  }
  const snapshot = captureDiscountComparison(rows)
  if (!snapshot) return { kind: 'invalid' }
  return { kind: 'ready', rows: Object.freeze(snapshot.rows.map(row => Object.freeze({ id: row.id, name: '', unitPrice: String(row.unitPrice), quantity: String(row.quantity), coupon: String(row.coupon), shipping: String(row.shipping) }))) }
}
export function discountComparisonUrl(baseUrl: string, drafts: readonly DiscountConditionDraft[]): string | null {
  const payload = encodeDiscountComparison(drafts)
  if (!payload) return null
  try { const url = new URL(baseUrl); if (url.protocol !== 'https:' && url.protocol !== 'http:') return null; url.searchParams.set(DISCOUNT_COMPARISON_PARAM, payload); return url.href }
  catch { return null }
}

export interface DiscountComparisonTextLabels {
  title: string; formula: string; averageHint: string; sourceHint: string; defaultName: (index: number) => string
  fields: Readonly<Record<DiscountNumericField | 'subtotal' | 'appliedCoupon' | 'excessCoupon' | 'goodsTotal' | 'total' | 'unitAverage', string>>
  lowestTotal: string; lowestUnit: string; none: string; money: (value: number, average?: boolean) => string
}
/** Complete text/TXT rows, unlike the intentionally compact four-row share-card summary. */
export function formatDiscountComparison(snapshot: DiscountComparisonSnapshot, labels: DiscountComparisonTextLabels): string {
  const name = (row: DiscountComparisonRow, index: number) => row.name.trim() ? row.name : labels.defaultName(index + 1)
  const lines = [labels.title, labels.formula, labels.averageHint, labels.sourceHint, '']
  snapshot.rows.forEach((row, index) => {
    lines.push(`[${index + 1}] ${name(row, index)}`)
    for (const field of ['unitPrice', 'quantity', 'coupon', 'subtotal', 'appliedCoupon', 'excessCoupon', 'goodsTotal', 'shipping', 'total', 'unitAverage'] as const) lines.push(`${labels.fields[field]}: ${field === 'quantity' ? row[field] : labels.money(row[field], field === 'unitAverage')}`)
    lines.push('')
  })
  const winners = (ids: readonly string[]) => snapshot.rows.flatMap((row, index) => ids.includes(row.id) ? [`[${index + 1}] ${name(row, index)}`] : []).join(' / ') || labels.none
  lines.push(`${labels.lowestTotal}: ${winners(snapshot.lowestTotalIds)}`, `${labels.lowestUnit}: ${winners(snapshot.lowestUnitIds)}`)
  return lines.join('\n') + '\n'
}
