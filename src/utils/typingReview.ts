import { customTypingStatuses, updateCustomTypingAttempt, type CustomTypingAttempt } from './customTyping.ts'
import type { Lang } from './typingTest.ts'

export const TYPING_REVIEW_LIMITS = { source: 10_000, fragment: 1000, page: 20 } as const
export interface TypingReviewFragment {
  readonly id: string
  readonly number: number
  readonly start: number
  readonly end: number
  readonly text: string
  readonly errors: readonly number[]
}
export interface TypingReviewSnapshot {
  readonly id: number
  readonly target: string
  readonly lang: Lang
  readonly errors: readonly number[]
  readonly fragments: readonly TypingReviewFragment[]
}
export class TypingReviewError extends Error {
  readonly code: 'invalidSource' | 'invalidIndex' | 'invalidId' | 'invalidSnapshot' | 'fragmentMissing' | 'fragmentTooLong'
  constructor(code: TypingReviewError['code']) { super(code); this.name = 'TypingReviewError'; this.code = code }
}
const snapshots = new WeakSet<TypingReviewSnapshot>()
function sourceUnits(target: string): string[] {
  if (typeof target !== 'string' || target.length > TYPING_REVIEW_LIMITS.source * 2) throw new TypingReviewError('invalidSource')
  const units = [...target]
  if (!units.length || units.length > TYPING_REVIEW_LIMITS.source) throw new TypingReviewError('invalidSource')
  return units
}
function indices(values: readonly number[], length: number): number[] {
  if (!Array.isArray(values) || values.length > length || values.some(value => !Number.isInteger(value) || value < 0 || value >= length)) throw new TypingReviewError('invalidIndex')
  return [...new Set(values)].sort((a, b) => a - b)
}

/** Call with the existing input handler's normalized typed value. Never finalize a timed-out IME composition. */
export function collectTypingReviewErrors(previous: readonly number[], target: string, typed: string, composing: boolean): readonly number[] {
  const units = sourceUnits(target), found = indices(previous, units.length)
  if (typeof typed !== 'string' || typeof composing !== 'boolean') throw new TypingReviewError('invalidSource')
  if (!composing) {
    const known = new Set(found)
    customTypingStatuses(target, [...typed.slice(0, units.length * 2)].slice(0, units.length).join(''), false).forEach((status, index) => { if (status === 'wrong') known.add(index) })
    return Object.freeze([...known].sort((a, b) => a - b))
  }
  return Object.freeze(found)
}

/** Source offsets are code points. Only overlapping ranges merge; equal words at other positions stay separate. */
export function captureTypingReview(id: number, target: string, lang: Lang, errors: readonly number[]): TypingReviewSnapshot {
  if (!Number.isSafeInteger(id) || id < 1) throw new TypingReviewError('invalidId')
  if (lang !== 'ko' && lang !== 'en') throw new TypingReviewError('invalidSource')
  const units = sourceUnits(target), positions = indices(errors, units.length)
  const groups: { start: number; end: number; space: boolean }[] = [], owners: number[] = []
  for (let start = 0; start < units.length;) {
    const space = /\s/u.test(units[start]); let end = start + 1
    while (end < units.length && /\s/u.test(units[end]) === space) end++
    const group = groups.length; groups.push({ start, end, space })
    for (let index = start; index < end; index++) owners[index] = group
    start = end
  }
  const ranges = positions.map(index => {
    const owner = owners[index], group = groups[owner]
    return group.space ? { start: groups[owner - 1]?.start ?? group.start, end: groups[owner + 1]?.end ?? group.end } : { start: group.start, end: group.end }
  }).sort((a, b) => a.start - b.start || a.end - b.end)
  const joined: { start: number; end: number }[] = []
  for (const range of ranges) {
    const previous = joined.at(-1)
    if (previous && range.start < previous.end) previous.end = Math.max(previous.end, range.end)
    else joined.push({ ...range })
  }
  let errorIndex = 0
  const fragments = joined.map((range, index): TypingReviewFragment => {
    const found: number[] = []
    while (errorIndex < positions.length && positions[errorIndex] < range.end) {
      if (positions[errorIndex] >= range.start) found.push(positions[errorIndex])
      errorIndex++
    }
    return Object.freeze({ id: `${id}:${range.start}:${range.end}`, number: index + 1, ...range, text: units.slice(range.start, range.end).join(''), errors: Object.freeze(found) })
  })
  const snapshot = Object.freeze({ id, target, lang, errors: Object.freeze(positions), fragments: Object.freeze(fragments) })
  snapshots.add(snapshot)
  return snapshot
}

/** Review snippets can be one character; the original custom passage's ten-character minimum is unchanged. */
export function createTypingReviewAttempt(snapshot: TypingReviewSnapshot, fragmentId: string): CustomTypingAttempt {
  if (!snapshots.has(snapshot)) throw new TypingReviewError('invalidSnapshot')
  const fragment = snapshot.fragments.find(item => item.id === fragmentId)
  if (!fragment) throw new TypingReviewError('fragmentMissing')
  if (fragment.end - fragment.start > TYPING_REVIEW_LIMITS.fragment) throw new TypingReviewError('fragmentTooLong')
  return { target: fragment.text, lang: snapshot.lang, typed: '', startedAt: null, composing: false, reached: 0, mistakes: {}, result: null }
}

/** Reuse existing completion/scoring, while temporary IME alternatives never enter review's error history. */
export function updateTypingReviewAttempt(previous: CustomTypingAttempt, input: string, composing: boolean, now: number): CustomTypingAttempt {
  const next = updateCustomTypingAttempt(previous, input.slice(0, previous.target.length * 2), composing, now)
  return next !== previous && composing ? { ...next, mistakes: previous.mistakes } : next
}
