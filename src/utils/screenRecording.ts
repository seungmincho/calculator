export type ScreenRecordingPhase = 'idle' | 'preparing' | 'audioChoice' | 'recording' | 'paused' | 'stopping'
export type ScreenRecordingAudio = 'none' | 'system' | 'mic' | 'both'
export type ScreenRecordingQuality = 'high' | 'medium' | 'low'
export interface ScreenRecordingConfig { quality: ScreenRecordingQuality; fps: 30 | 60; audio: ScreenRecordingAudio }
export interface ScreenRecordingActualAudio { system: boolean; mic: boolean }
export type ScreenRecordingFailure = 'unsupported' | 'permissionDenied' | 'displayEnded' | 'initialization' | 'recording' | 'empty' | 'format' | 'stopTimeout' | 'resultFailed'
export const SCREEN_RECORDING_QUALITY = {
  high: { width: 1920, height: 1080, bitrate: 8_000_000 },
  medium: { width: 1280, height: 720, bitrate: 4_000_000 },
  low: { width: 854, height: 480, bitrate: 1_500_000 },
} as const
export const SCREEN_RECORDING_MIME_TYPES = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8,opus', 'video/webm;codecs=vp8', 'video/webm'] as const
export function selectScreenRecordingMime(supports: (type: string) => boolean): string | null {
  for (const mime of SCREEN_RECORDING_MIME_TYPES) { try { if (supports(mime)) return mime } catch { /* Check the remaining declared types. */ } }
  return null
}
export function screenRecordingExtension(mime: string): 'webm' | 'mp4' | null {
  const base = mime.split(';', 1)[0].trim().toLowerCase()
  return base === 'video/webm' ? 'webm' : base === 'video/mp4' ? 'mp4' : null
}
export function isScreenRecordingConfig(value: ScreenRecordingConfig): boolean {
  return !!value && Object.hasOwn(SCREEN_RECORDING_QUALITY, value.quality) && [30, 60].includes(value.fps) && ['none', 'system', 'mic', 'both'].includes(value.audio)
}

export interface ScreenRecordingClock { elapsedMs: number; runningSince: number | null; observedAt: number }
const monotonic = (clock: ScreenRecordingClock, now: number) => Number.isFinite(now) ? Math.max(clock.observedAt, now) : clock.observedAt
export function createScreenRecordingClock(now: number): ScreenRecordingClock {
  const start = Number.isFinite(now) ? Math.max(0, now) : 0
  return { elapsedMs: 0, runningSince: start, observedAt: start }
}
export function sampleScreenRecordingClock(clock: ScreenRecordingClock, now: number): number {
  return clock.elapsedMs + (clock.runningSince === null ? 0 : Math.max(0, monotonic(clock, now) - clock.runningSince))
}
export function pauseScreenRecordingClock(clock: ScreenRecordingClock, now: number): ScreenRecordingClock {
  const observedAt = monotonic(clock, now)
  return { elapsedMs: sampleScreenRecordingClock(clock, observedAt), runningSince: null, observedAt }
}
export function resumeScreenRecordingClock(clock: ScreenRecordingClock, now: number): ScreenRecordingClock {
  if (clock.runningSince !== null) return clock
  const observedAt = monotonic(clock, now)
  return { ...clock, runningSince: observedAt, observedAt }
}
export interface ScreenRecordingResult {
  id: number
  blob: Blob
  url: string
  name: string
  mime: string
  elapsedMs: number
  createdAt: number
  config: ScreenRecordingConfig
  audio: ScreenRecordingActualAudio
}
export interface ScreenRecordingState {
  phase: ScreenRecordingPhase
  generation: number
  config: ScreenRecordingConfig | null
  clock: ScreenRecordingClock | null
  elapsedMs: number
  audio: ScreenRecordingActualAudio
  micDenied: boolean
  error: ScreenRecordingFailure | null
  result: ScreenRecordingResult | null
}
export type ScreenRecordingAction =
  | { type: 'prepare'; generation: number; config: ScreenRecordingConfig }
  | { type: 'audioChoice'; generation: number; audio: ScreenRecordingActualAudio }
  | { type: 'started'; generation: number; now: number; audio: ScreenRecordingActualAudio; micDenied: boolean }
  | { type: 'tick' | 'pause' | 'resume' | 'stop'; generation: number; now: number }
  | { type: 'cancel'; generation: number }
  | { type: 'fail'; generation: number; error: ScreenRecordingFailure }
  | { type: 'complete'; generation: number; result: ScreenRecordingResult }
  | { type: 'deleteResult' }
export function initialScreenRecordingState(): ScreenRecordingState {
  return { phase: 'idle', generation: 0, config: null, clock: null, elapsedMs: 0, audio: { system: false, mic: false }, micDenied: false, error: null, result: null }
}
export function reduceScreenRecording(state: ScreenRecordingState, action: ScreenRecordingAction): ScreenRecordingState {
  if (action.type === 'deleteResult') return state.result ? { ...state, result: null } : state
  if (action.type === 'prepare') {
    if (state.phase !== 'idle' || !Number.isSafeInteger(action.generation) || action.generation <= state.generation || !isScreenRecordingConfig(action.config)) return state
    return { ...state, phase: 'preparing', generation: action.generation, config: { ...action.config }, clock: null, elapsedMs: 0, audio: { system: false, mic: false }, micDenied: false, error: null }
  }
  if (action.generation !== state.generation || state.phase === 'idle') return state
  if (action.type === 'cancel' || action.type === 'fail') return { ...state, phase: 'idle', clock: null, error: action.type === 'fail' ? action.error : null }
  if (action.type === 'audioChoice') return state.phase === 'preparing' ? { ...state, phase: 'audioChoice', audio: { ...action.audio }, micDenied: true } : state
  if (action.type === 'started') {
    if (state.phase !== 'preparing' && state.phase !== 'audioChoice') return state
    return { ...state, phase: 'recording', clock: createScreenRecordingClock(action.now), elapsedMs: 0, audio: { ...action.audio }, micDenied: action.micDenied }
  }
  if (action.type === 'complete') {
    const result = action.result
    if (state.phase !== 'stopping' || result.id !== action.generation || !result.blob.size || !result.url || !result.name || !screenRecordingExtension(result.mime) || screenRecordingExtension(result.blob.type) !== screenRecordingExtension(result.mime) || !isScreenRecordingConfig(result.config) || !Number.isFinite(result.elapsedMs) || result.elapsedMs < 0) return state
    return { ...state, phase: 'idle', clock: null, result: { ...result, config: { ...result.config }, audio: { ...result.audio } }, error: null }
  }
  if (!state.clock) return state
  if (action.type === 'tick') return state.phase === 'recording' ? { ...state, clock: { ...state.clock, observedAt: monotonic(state.clock, action.now) }, elapsedMs: Math.max(state.elapsedMs, sampleScreenRecordingClock(state.clock, action.now)) } : state
  if (action.type === 'pause' || action.type === 'stop') {
    if (action.type === 'pause' ? state.phase !== 'recording' : !['recording', 'paused'].includes(state.phase)) return state
    const clock = pauseScreenRecordingClock(state.clock, action.now)
    return { ...state, phase: action.type === 'pause' ? 'paused' : 'stopping', clock, elapsedMs: clock.elapsedMs }
  }
  return action.type === 'resume' && state.phase === 'paused' ? { ...state, phase: 'recording', clock: resumeScreenRecordingClock(state.clock, action.now) } : state
}
export function screenRecordingTime(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map(value => String(value).padStart(2, '0')).join(':')
}
