import type { Segment } from './tts.ts'

export interface TtsRepeatSnapshot {
  repeat: boolean
  repeatStart: number
  repeatEnd: number
  repeatCount: number
  repeatGap: number
}
export interface TtsRecovery {
  text: string
  sentenceIndex: number
  sentence: Segment
  generation: number
  pass: number
  settings: TtsRepeatSnapshot
}
export interface TtsRecoveryContext extends TtsRepeatSnapshot {
  text: string
  segments: readonly Segment[]
  generation: number
}

export const isTtsCancellation = (code: string) => code === 'canceled' || code === 'interrupted'

function validContext(context: TtsRecoveryContext, index: number, pass: number): boolean {
  const { segments, repeat, repeatStart, repeatEnd, repeatCount, repeatGap, generation } = context
  if (!Number.isSafeInteger(generation) || generation < 0 || !Number.isInteger(index) || index < 0 || index >= segments.length) return false
  if (!Number.isInteger(pass) || pass < 1 || !Number.isInteger(repeatCount) || repeatCount < 1 || pass > repeatCount) return false
  if (!Number.isInteger(repeatStart) || !Number.isInteger(repeatEnd) || !Number.isFinite(repeatGap) || repeatGap < 0) return false
  if (repeat && (repeatStart < 0 || repeatEnd >= segments.length || repeatEnd < repeatStart || index < repeatStart || index > repeatEnd)) return false
  const sentence = segments[index]
  return Number.isInteger(sentence.start) && Number.isInteger(sentence.end) && sentence.start >= 0 && sentence.end <= context.text.length && sentence.start < sentence.end && !!sentence.text.trim() && context.text.slice(sentence.start, sentence.end) === sentence.text
}

/** Capture only a known sentence from the exact manuscript and repetition configuration. */
export function captureTtsRecovery(context: TtsRecoveryContext, index: number, pass: number): TtsRecovery | null {
  if (!validContext(context, index, pass)) return null
  const { text, generation, repeat, repeatStart, repeatEnd, repeatCount, repeatGap } = context
  const { start, end, text: sentenceText } = context.segments[index]
  return { text, sentenceIndex: index, sentence: { start, end, text: sentenceText }, generation, pass,
    settings: { repeat, repeatStart, repeatEnd, repeatCount, repeatGap } }
}

/** A stale click must never clamp the saved index into a different manuscript or repeat range. */
export function canRetryTtsRecovery(recovery: TtsRecovery | null, context: TtsRecoveryContext): recovery is TtsRecovery {
  if (!recovery || recovery.text !== context.text || recovery.generation !== context.generation || !validContext(context, recovery.sentenceIndex, recovery.pass)) return false
  const { repeat, repeatStart, repeatEnd, repeatCount, repeatGap } = recovery.settings
  if (repeat !== context.repeat || repeatStart !== context.repeatStart || repeatEnd !== context.repeatEnd || repeatCount !== context.repeatCount || repeatGap !== context.repeatGap) return false
  const sentence = context.segments[recovery.sentenceIndex]
  return recovery.sentence.start === sentence.start && recovery.sentence.end === sentence.end && recovery.sentence.text === sentence.text
}
