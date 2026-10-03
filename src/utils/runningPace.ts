export type RunningMode = 'time' | 'pace'
export type Split = { distanceKm: number; elapsedSeconds: number }
export type RunningResult = {
  distanceKm: number
  finishSeconds: number
  secondsPerKm: number
  speedKmh: number
  splits: Split[]
}

export function parseDistance(value: string): number | null {
  if (!/^(?:\d+)(?:\.\d{1,4})?$/.test(value.trim())) return null
  const distance = Number(value)
  return Number.isFinite(distance) && distance > 0 && distance <= 500 ? distance : null
}

export function parseClock(hours: string, minutes: string, seconds: string): number | null {
  if (![hours, minutes, seconds].every(value => /^\d+$/.test(value.trim()))) return null
  const h = Number(hours), m = Number(minutes), s = Number(seconds)
  if (h > 99 || m >= 60 || s >= 60) return null
  const total = h * 3600 + m * 60 + s
  return total > 0 ? total : null
}

export function parsePace(minutes: string, seconds: string): number | null {
  if (![minutes, seconds].every(value => /^\d+$/.test(value.trim()))) return null
  const m = Number(minutes), s = Number(seconds)
  if (m > 99 || s >= 60) return null
  const total = m * 60 + s
  return total > 0 ? total : null
}

export function calculateRunning(distanceKm: number, mode: RunningMode, valueSeconds: number, splitKm: 1 | 5): RunningResult | null {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0 || distanceKm > 500 ||
      !Number.isFinite(valueSeconds) || valueSeconds <= 0 || ![1, 5].includes(splitKm)) return null
  const finishSeconds = mode === 'time' ? valueSeconds : mode === 'pace' ? distanceKm * valueSeconds : NaN
  if (!Number.isFinite(finishSeconds) || finishSeconds <= 0) return null
  const secondsPerKm = finishSeconds / distanceKm
  const splits: Split[] = []
  for (let mark = splitKm; mark < distanceKm; mark += splitKm) {
    splits.push({ distanceKm: mark, elapsedSeconds: mark * secondsPerKm })
  }
  splits.push({ distanceKm, elapsedSeconds: finishSeconds })
  return { distanceKm, finishSeconds, secondsPerKm, speedKmh: 3600 / secondsPerKm, splits }
}

export function formatClock(rawSeconds: number, forceHours = false): string {
  const total = Math.round(rawSeconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  if (hours || forceHours) return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function formatDistance(distanceKm: number): string {
  return `${distanceKm.toLocaleString('ko-KR', { maximumFractionDigits: 4 })} km`
}
