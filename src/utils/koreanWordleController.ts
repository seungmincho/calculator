import { MAX_GUESSES, VALID, dailyAnswer, isSyllable, hardModeError, statusOf, type WordLen } from './koreanWordle.ts'
import { wordleDate } from './koreanWordleStorage.ts'

export interface WordleRoundInput { mode: 'daily' | 'practice'; day?: number; answer: string; len: WordLen; guesses: readonly string[]; hard: boolean; startedAt: number }
export interface WordleRound extends WordleRoundInput { readonly id: number; readonly guesses: readonly string[] }
export interface WordleRevealToken { readonly view: number; readonly submission: number }
export interface WordleCompletion { readonly round: WordleRound; readonly status: 'won' | 'lost'; readonly finishedAt: number; readonly duration: number }
export interface WordleTimerPort { set: (run: () => void, ms: number) => unknown; clear: (id: unknown) => void }
export type WordleSubmit = { ok: true; round: WordleRound; row: number; reveal: WordleRevealToken; completion: WordleCompletion | null }
  | { ok: false; error: 'inactive' | 'busy' | 'ended' | 'notEnoughLetters' | 'needVowelHint' | 'notInList' | 'hardCorrect' | 'hardPresent'; jamo?: string }
const nativeTimers: WordleTimerPort = { set: (run, ms) => setTimeout(run, ms), clear: id => clearTimeout(id as ReturnType<typeof setTimeout>) }
const freezeRound = (input: WordleRoundInput, id: number): WordleRound => Object.freeze({ ...input, id, guesses: Object.freeze([...input.guesses]) })

/** Semantic completion and visible animation have deliberately separate ownership. */
export function createWordleRoundController(timers: WordleTimerPort = nativeTimers) {
  let alive = true, sequence = 0, view = 0, submission = 0, timerSequence = 0
  let round: WordleRound | null = null, revealing: WordleRevealToken | null = null
  const scheduled = new Map<string, { id: unknown; token: number }>(), completed = new WeakSet<WordleCompletion>(), claimed = new WeakSet<WordleCompletion>()
  const clearTimers = () => { for (const item of scheduled.values()) timers.clear(item.id); scheduled.clear() }
  const changeView = () => { view++; revealing = null; clearTimers() }
  return {
    begin(input: WordleRoundInput): WordleRound {
      if (!alive || ![2, 3].includes(input.len) || !VALID[input.len]?.has(input.answer) || !Number.isFinite(input.startedAt) || typeof input.hard !== 'boolean') throw new Error('invalidRound')
      if (input.mode !== 'daily' && input.mode !== 'practice' || input.mode === 'daily' && (input.len !== 2 || input.day === undefined || !wordleDate(input.day) || dailyAnswer(input.day) !== input.answer)) throw new Error('invalidRound')
      if (!Array.isArray(input.guesses) || input.guesses.length > MAX_GUESSES || !input.guesses.every((guess, index) => VALID[input.len].has(guess) && (guess !== input.answer || index === input.guesses.length - 1))) throw new Error('invalidRound')
      changeView(); round = freezeRound(input, ++sequence); return round
    },
    getSnapshot: () => ({ round, view, revealing: revealing !== null }),
    submit(word: string, now: number): WordleSubmit {
      if (!alive || !round || !Number.isFinite(now)) return { ok: false, error: 'inactive' }
      if (revealing) return { ok: false, error: 'busy' }
      if (statusOf([...round.guesses], round.answer) !== 'playing') return { ok: false, error: 'ended' }
      const chars = [...word]
      if (chars.length < round.len) return { ok: false, error: 'notEnoughLetters' }
      if (!chars.every(isSyllable)) return { ok: false, error: 'needVowelHint' }
      if (!VALID[round.len].has(word)) return { ok: false, error: 'notInList' }
      if (round.hard && round.guesses.length) {
        const error = hardModeError(round.guesses[round.guesses.length - 1], round.answer, word)
        if (error) return { ok: false, error: error.kind === 'correct' ? 'hardCorrect' : 'hardPresent', jamo: error.jamo }
      }
      round = freezeRound({ ...round, guesses: [...round.guesses, word] }, round.id)
      revealing = Object.freeze({ view, submission: ++submission })
      const status = statusOf([...round.guesses], round.answer)
      const completion: WordleCompletion | null = status === 'playing' ? null : Object.freeze({ round, status, finishedAt: now, duration: Math.max(0, now - round.startedAt) })
      if (completion) completed.add(completion)
      return { ok: true, round, row: round.guesses.length - 1, reveal: revealing, completion }
    },
    claimCompletion(completion: WordleCompletion): WordleCompletion | null {
      if (!alive || !completed.has(completion) || claimed.has(completion)) return null
      claimed.add(completion); return completion
    },
    current(token: WordleRevealToken) { return alive && token.view === view && token === revealing },
    finishReveal(token: WordleRevealToken) { if (!alive || token.view !== view || token !== revealing) return false; revealing = null; return true },
    later(channel: string, ms: number, run: () => void) {
      if (!alive) return
      const previous = scheduled.get(channel); if (previous) timers.clear(previous.id)
      const token = ++timerSequence, capturedView = view
      const id = timers.set(() => { if (!alive || view !== capturedView || scheduled.get(channel)?.token !== token) return; scheduled.delete(channel); run() }, Math.max(0, ms))
      scheduled.set(channel, { id, token })
    },
    leave() { changeView(); round = null },
    dispose() { alive = false; changeView(); round = null },
  }
}

export function createWordleCopyGuard() {
  let alive = true, revision = 0
  return { begin: () => ++revision, current: (token: number) => alive && token === revision, invalidate: () => { revision++ }, dispose: () => { alive = false; revision++ } }
}
export interface WordleClipboardPort { writeText?: (text: string) => Promise<void>; fallback: (text: string) => boolean }
function legacyCopy(text: string): boolean {
  const active = document.activeElement, field = document.createElement('textarea')
  field.value = text; field.readOnly = true; field.style.position = 'fixed'; field.style.left = '-9999px'
  try { document.body.appendChild(field); field.focus(); field.select(); field.setSelectionRange(0, text.length); return document.execCommand('copy') === true }
  finally { field.remove(); try { if (active instanceof HTMLElement) active.focus({ preventScroll: true }) } catch { /* Focus failure does not change the copy outcome. */ } }
}
export async function copyWordleText(text: string, current: () => boolean, port?: WordleClipboardPort): Promise<'copied' | 'failed' | 'stale'> {
  if (!current()) return 'stale'
  try { const write = port ? port.writeText : navigator.clipboard?.writeText ? (value: string) => navigator.clipboard.writeText(value) : undefined; if (write) { await write(text); return current() ? 'copied' : 'stale' } } catch { /* A newer request owns the shared clipboard. */ }
  if (!current()) return 'stale'
  try { const copied = port ? port.fallback(text) : legacyCopy(text); return current() ? copied === true ? 'copied' : 'failed' : 'stale' }
  catch { return current() ? 'failed' : 'stale' }
}
