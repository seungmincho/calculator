export type SpeakingPreparationSeconds = 0 | 3 | 5

export function isSpeakingPreparationSeconds(value: unknown): value is SpeakingPreparationSeconds {
  return value === 0 || value === 3 || value === 5
}

/** The caller supplies performance.now(), never a count of interval callbacks. */
export function createSpeakingPreparation(seconds: SpeakingPreparationSeconds, now: number) {
  if (!isSpeakingPreparationSeconds(seconds) || !Number.isFinite(now)) throw new Error('invalidPreparation')
  const deadline = now + seconds * 1000
  let observed = now, active = true
  return {
    advance(time: number): { remaining: number; start: boolean } {
      if (!active) return { remaining: 0, start: false }
      if (Number.isFinite(time)) observed = Math.max(observed, time)
      const remaining = Math.max(0, Math.ceil((deadline - observed) / 1000))
      if (remaining === 0) { active = false; return { remaining: 0, start: true } }
      return { remaining, start: false }
    },
    cancel() { active = false },
  }
}
