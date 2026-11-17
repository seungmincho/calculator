import { DEFAULT_WHITE_NOISE, cloneWhiteNoiseSettings, createWhiteNoiseDeadline, remainingWhiteNoiseMs, whiteNoiseAudioPlan,
  type WhiteNoiseSettings, type WhiteNoiseClock, type WhiteNoiseDeadline } from '../../utils/whiteNoise.ts'
import type { WhiteNoiseAudio } from './audio.ts'

export type WhiteNoiseFailure = 'invalidSettings' | 'startFailed' | 'resumeFailed' | 'prepareTimeout' | 'audioFailed'
export interface WhiteNoiseState {
  phase: 'idle' | 'preparing' | 'playing' | 'suspended' | 'error'
  settings: WhiteNoiseSettings
  remainingMs: number | null
  deadline: WhiteNoiseDeadline | null
  error: WhiteNoiseFailure | null
  generation: number
}
export interface WhiteNoisePorts {
  clock: () => WhiteNoiseClock
  createAudio: (type: WhiteNoiseSettings['type']) => WhiteNoiseAudio
  every: (callback: () => void, ms: number) => () => void
  after: (callback: () => void, ms: number) => () => void
  onReturn: (callback: () => void) => () => void
}
type Attempt = { id: number; audio: WhiteNoiseAudio | null; deadline: WhiteNoiseDeadline | null; cleanups: Set<() => void>; watchdog: (() => void) | null; started: boolean; released: boolean }

/** One active owner; only an explicit start/change/resume may create or resume audio. */
export function createWhiteNoiseSession(ports: WhiteNoisePorts, onChange: (state: WhiteNoiseState) => void) {
  let state: WhiteNoiseState = { phase: 'idle', settings: { ...DEFAULT_WHITE_NOISE }, remainingMs: 0, deadline: null, error: null, generation: 0 }
  let attempt: Attempt | null = null, sequence = 0, disposed = false
  const snapshot = (): WhiteNoiseState => ({ ...state, settings: { ...state.settings }, deadline: state.deadline ? { ...state.deadline } : null })
  const emit = (change: Partial<WhiteNoiseState>) => { state = { ...state, ...change }; if (!disposed) onChange(snapshot()) }
  const current = (item: Attempt) => !disposed && attempt === item && !item.released
  const release = (item: Attempt) => {
    if (item.released) return
    item.released = true
    if (attempt === item) attempt = null
    for (const cleanup of item.cleanups) { try { cleanup() } catch { /* Release all owned resources. */ } }
    item.cleanups.clear(); item.watchdog = null
    try { item.audio?.release() } catch { /* Already silent/released. */ }
  }
  const fail = (item: Attempt, error: WhiteNoiseFailure) => { if (current(item)) { release(item); emit({ phase: 'error', error, deadline: null, remainingMs: 0 }) } }
  const stop = () => {
    if (disposed) return
    if (attempt) release(attempt)
    emit({ phase: 'idle', deadline: null, remainingMs: 0, error: null, generation: ++sequence })
  }
  const remaining = (item: Attempt) => {
    const value = remainingWhiteNoiseMs(item.deadline, ports.clock())
    return value === null ? null : Math.min(value, state.remainingMs ?? value)
  }
  const refresh = (item: Attempt, reschedule = false): boolean => {
    if (!current(item)) return false
    try {
      const left = remaining(item)
      if (left === 0) { stop(); return false }
      const nativeState = item.audio?.state()
      if (nativeState === 'closed') { fail(item, 'audioFailed'); return false }
      const phase = !item.started || state.phase === 'preparing' ? state.phase : nativeState === 'running' ? 'playing' : 'suspended'
      if (reschedule && item.started && state.phase !== 'preparing') item.audio!.schedule(whiteNoiseAudioPlan(state.settings, left, item.audio!.time()))
      emit({ remainingMs: left, phase })
      return current(item)
    } catch { fail(item, 'audioFailed'); return false }
  }
  const own = (item: Attempt, cleanup: () => void) => { if (current(item)) item.cleanups.add(cleanup); else cleanup() }
  const runResume = async (item: Attempt) => {
    if (!current(item) || !item.audio || !refresh(item)) return
    try {
      const cancelTimeout = ports.after(() => fail(item, 'prepareTimeout'), 10_000)
      item.watchdog = cancelTimeout; own(item, cancelTimeout)
      if (!current(item)) return
      await item.audio.resume()
      if (!current(item)) return
      cancelTimeout(); item.cleanups.delete(cancelTimeout); item.watchdog = null
      if (!refresh(item)) return
      if (item.audio.state() !== 'running') { fail(item, 'resumeFailed'); return }
      const left = remaining(item)
      if (left === 0) { stop(); return }
      const plan = whiteNoiseAudioPlan(state.settings, left, item.audio.time())
      if (item.started) item.audio.schedule(plan)
      else { item.audio.start(plan); item.started = true }
      if (current(item)) emit({ phase: 'playing', remainingMs: remaining(item), error: null })
    } catch { fail(item, item.started ? 'resumeFailed' : 'startFailed') }
  }
  const launch = (settings: WhiteNoiseSettings, deadline: WhiteNoiseDeadline | null) => {
    if (disposed) return
    if (attempt) release(attempt)
    const item: Attempt = { id: ++sequence, audio: null, deadline, cleanups: new Set(), watchdog: null, started: false, released: false }
    attempt = item
    emit({ settings, phase: 'preparing', deadline, remainingMs: remainingWhiteNoiseMs(deadline, ports.clock()), error: null, generation: item.id })
    if (!current(item) || !refresh(item)) return
    try {
      item.audio = ports.createAudio(settings.type)
      if (!current(item)) { item.audio.release(); return }
      own(item, item.audio.onState(() => { refresh(item, true) }))
      own(item, item.audio.onEnded(() => {
        if (!current(item)) return
        // Native scheduled stop may fire just before the display clock rounds to zero.
        if (item.deadline && remaining(item)! <= 100) stop()
        else fail(item, 'audioFailed')
      }))
      own(item, ports.every(() => { refresh(item) }, 250))
      own(item, ports.onReturn(() => { refresh(item, true) }))
      void runResume(item)
    } catch { fail(item, 'startFailed') }
  }
  return {
    getSnapshot: snapshot,
    start(value: WhiteNoiseSettings) {
      if (disposed) return
      try { const settings = cloneWhiteNoiseSettings(value); launch(settings, createWhiteNoiseDeadline(settings.timerMinutes, ports.clock())) }
      catch { if (attempt) release(attempt); emit({ phase: 'error', error: 'invalidSettings', deadline: null, remainingMs: 0 }) }
    },
    change(value: WhiteNoiseSettings) {
      if (disposed) return
      const settings = cloneWhiteNoiseSettings(value), previous = state.settings, item = attempt
      if (!item) { emit({ settings, error: null, phase: 'idle' }); return }
      if (settings.timerMinutes !== previous.timerMinutes) { launch(settings, createWhiteNoiseDeadline(settings.timerMinutes, ports.clock())); return }
      if (!refresh(item)) { emit({ settings }); return }
      if (settings.type !== previous.type) { launch(settings, item.deadline); return }
      emit({ settings }); if (current(item)) refresh(item, true)
    },
    resume() {
      const item = attempt
      if (!item || state.phase !== 'suspended' || !refresh(item)) return
      try { item.audio!.mute() } catch { fail(item, 'resumeFailed'); return }
      emit({ phase: 'preparing', error: null })
      if (current(item)) void runResume(item)
    },
    stop,
    dispose() { if (disposed) return; disposed = true; if (attempt) release(attempt); sequence++ },
  }
}
