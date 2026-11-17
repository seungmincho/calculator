export const WHITE_NOISE_TYPES = ['white', 'pink', 'brown', 'rain', 'wind', 'wave'] as const
export const WHITE_NOISE_TIMERS = [0, 5, 10, 15, 30, 60] as const
export const WHITE_NOISE_FADE_MS = 30_000
export type WhiteNoiseType = typeof WHITE_NOISE_TYPES[number]
export type WhiteNoiseTimer = typeof WHITE_NOISE_TIMERS[number]
export interface WhiteNoiseSettings { type: WhiteNoiseType; volume: number; timerMinutes: WhiteNoiseTimer; fade: boolean }
export interface WhiteNoiseClock { wallMs: number; monotonicMs: number }
export interface WhiteNoiseDeadline { wallEnd: number; monotonicEnd: number; durationMs: number }
export const DEFAULT_WHITE_NOISE: Readonly<WhiteNoiseSettings> = Object.freeze({ type: 'white', volume: 50, timerMinutes: 0, fade: false })
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
export function isWhiteNoiseSettings(value: unknown): value is WhiteNoiseSettings {
  return object(value) && Object.keys(value).length === 4 && ['type', 'volume', 'timerMinutes', 'fade'].every(key => Object.hasOwn(value, key))
    && WHITE_NOISE_TYPES.includes(value.type as WhiteNoiseType) && WHITE_NOISE_TIMERS.includes(value.timerMinutes as WhiteNoiseTimer)
    && typeof value.volume === 'number' && Number.isInteger(value.volume) && value.volume >= 0 && value.volume <= 100 && typeof value.fade === 'boolean'
}
export function cloneWhiteNoiseSettings(value: unknown): WhiteNoiseSettings {
  if (!isWhiteNoiseSettings(value)) throw new Error('invalidSettings')
  return { type: value.type, volume: value.volume, timerMinutes: value.timerMinutes, fade: value.fade }
}
function checkClock(clock: WhiteNoiseClock) {
  if (![clock.wallMs, clock.monotonicMs].every(value => Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER - 3_600_000)) throw new Error('invalidClock')
}
export function createWhiteNoiseDeadline(minutes: WhiteNoiseTimer, clock: WhiteNoiseClock): WhiteNoiseDeadline | null {
  checkClock(clock)
  if (!WHITE_NOISE_TIMERS.includes(minutes)) throw new Error('invalidTimer')
  const durationMs = minutes * 60_000
  return durationMs ? { wallEnd: clock.wallMs + durationMs, monotonicEnd: clock.monotonicMs + durationMs, durationMs } : null
}
/** Wall time catches sleeping clocks; monotonic time prevents a wall-clock rollback extending playback. */
export function remainingWhiteNoiseMs(deadline: WhiteNoiseDeadline | null, clock: WhiteNoiseClock): number | null {
  checkClock(clock)
  return deadline === null ? null : Math.max(0, Math.min(deadline.durationMs, deadline.wallEnd - clock.wallMs, deadline.monotonicEnd - clock.monotonicMs))
}
export interface WhiteNoiseAudioPlan { at: number; gain: number; holdUntil: number | null; stopAt: number | null; fade: boolean }
/** A native AudioParam schedule, not a JS interval fade. Muted playback still has a deadline. */
export function whiteNoiseAudioPlan(settings: WhiteNoiseSettings, remainingMs: number | null, audioTime: number): WhiteNoiseAudioPlan {
  if (!isWhiteNoiseSettings(settings) || !Number.isFinite(audioTime) || audioTime < 0 || (remainingMs !== null && (!Number.isFinite(remainingMs) || remainingMs < 0))) throw new Error('invalidAudioPlan')
  const fade = settings.fade && remainingMs !== null
  const gain = settings.volume / 100 * (fade ? Math.min(1, remainingMs! / WHITE_NOISE_FADE_MS) : 1)
  return { at: audioTime, gain, holdUntil: fade ? audioTime + Math.max(0, remainingMs! - WHITE_NOISE_FADE_MS) / 1000 : null, stopAt: remainingMs === null ? null : audioTime + remainingMs / 1000, fade }
}
