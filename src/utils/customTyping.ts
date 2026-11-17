import { accuracy, correctKeystrokes, diffTyped, perMinute, topMissed, wpm, type CharStatus, type Lang } from './typingTest.ts'

export const CUSTOM_TYPING_MIN = 10
export const CUSTOM_TYPING_MAX = 1000
export interface CustomTypingPreview { text: string; count: number; changed: boolean; error: 'tooShort' | 'tooLong' | null }

/** Normalize only the declared whitespace; never modify the separately held draft or truncate a passage. */
export function prepareCustomTypingText(draft: string): CustomTypingPreview {
  const text = draft.replace(/\r\n?|\n|\t/g, ' ').replace(/ +/g, ' ').replace(/^ +| +$/g, '')
  const count = [...text].length
  return { text, count, changed: text !== draft, error: count < CUSTOM_TYPING_MIN ? 'tooShort' : count > CUSTOM_TYPING_MAX ? 'tooLong' : null }
}

export interface CustomTypingResult {
  lang: Lang
  ms: number
  keys: number
  speed: number
  accuracy: number
  errors: number
  missed: [string, number][]
}
export interface CustomTypingAttempt {
  target: string
  lang: Lang
  typed: string
  startedAt: number | null
  composing: boolean
  reached: number
  mistakes: Record<number, string>
  result: CustomTypingResult | null
}

export function createCustomTypingAttempt(text: string, lang: Lang): CustomTypingAttempt {
  const preview = prepareCustomTypingText(text)
  if (preview.error || (lang !== 'ko' && lang !== 'en')) throw new Error('invalidCustomTypingPassage')
  return { target: preview.text, lang, typed: '', startedAt: null, composing: false, reached: 0, mistakes: {}, result: null }
}

/** diffTyped guesses unfinished Hangul. An explicitly committed input must count a remaining prefix as an error. */
export function customTypingStatuses(target: string, typed: string, composing: boolean): CharStatus[] {
  const statuses = diffTyped(target, typed)
  return composing ? statuses : statuses.map(status => status === 'composing' ? 'wrong' : status)
}

/** The caller supplies monotonic time and explicit composition state. A completed attempt cannot finish twice. */
export function updateCustomTypingAttempt(previous: CustomTypingAttempt, input: string, composing: boolean, now: number): CustomTypingAttempt {
  if (previous.result || !Number.isFinite(now)) return previous
  const target = [...previous.target]
  const typed = [...input.replace(/[\r\n]/g, '')].slice(0, target.length).join('')
  const units = [...typed]
  const startedAt = previous.startedAt ?? (typed ? now : null)
  const statuses = customTypingStatuses(previous.target, typed, composing)
  const mistakes = { ...previous.mistakes }
  statuses.forEach((status, index) => { if (status === 'wrong' && !Object.hasOwn(mistakes, index)) mistakes[index] = units[index] })
  const reached = Math.max(previous.reached, statuses.filter(status => status === 'correct' || status === 'wrong').length)
  let result: CustomTypingResult | null = null
  if (!composing && startedAt !== null && units.length === target.length) {
    const ms = Math.max(1, now - startedAt)
    const keys = correctKeystrokes(previous.target, typed, statuses)
    const errors = Object.keys(mistakes).length
    result = { lang: previous.lang, ms, keys,
      speed: previous.lang === 'ko' ? perMinute(keys, ms) : wpm(statuses.filter(status => status === 'correct').length, ms),
      accuracy: accuracy(reached, errors), errors,
      missed: topMissed(Object.entries(mistakes).map(([index, value]) => [target[Number(index)], value])),
    }
  }
  return { ...previous, typed, startedAt, composing, reached, mistakes, result }
}
