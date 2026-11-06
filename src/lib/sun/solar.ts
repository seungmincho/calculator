// Sunrise equation (Wikipedia "Sunrise equation", NOAA-style terms). About ±1 minute at
// Korean latitudes: checked against KASI's announced 2026-01-01 sunrise times (scripts/check-sun.ts).
const RAD = Math.PI / 180
const DAY = 86400000
const KST = 9 * 3600000

export interface SunTimes {
  /** Epoch ms; null only where the sun never reaches the altitude (not in Korea). */
  sunrise: number | null; sunset: number | null; noon: number
  dawn: number | null; dusk: number | null           // civil twilight, sun 6° below horizon
  goldenEnd: number | null; goldenStart: number | null // sun 6° above horizon
  dayLength: number | null                            // ms between sunrise and sunset
}

/** `date` is a KST calendar date (YYYY-MM-DD). Longitude east positive. Elevation (m) only
 * moves sunrise/sunset (horizon dip); a sea-level horizon is assumed. */
export function sunTimes(date: string, lat: number, lon: number, elevation = 0): SunTimes {
  const [y, m, d] = date.split('-').map(Number)
  // Days since 2000-01-01 12:00 UTC for this date's noon; transit then falls on the same KST date.
  const n = Math.round(Date.UTC(y, m - 1, d, 12) / DAY + 2440587.5 - 2451545)
  const jStar = n - lon / 360
  const M = (357.5291 + 0.98560028 * jStar) % 360
  const C = 1.9148 * Math.sin(M * RAD) + 0.02 * Math.sin(2 * M * RAD) + 0.0003 * Math.sin(3 * M * RAD)
  const L = (M + C + 180 + 102.9372) % 360
  const transit = 2451545 + jStar + 0.0053 * Math.sin(M * RAD) - 0.0069 * Math.sin(2 * L * RAD)
  const dec = Math.asin(Math.sin(L * RAD) * Math.sin(23.4397 * RAD))
  const ms = (jd: number) => (jd - 2440587.5) * DAY
  const around = (altitude: number): [number, number] | null => {
    const cos = (Math.sin(altitude * RAD) - Math.sin(lat * RAD) * Math.sin(dec)) / (Math.cos(lat * RAD) * Math.cos(dec))
    if (cos < -1 || cos > 1) return null
    const w = Math.acos(cos) / RAD / 360
    return [ms(transit - w), ms(transit + w)]
  }
  // -0.833° = refraction (34′) + solar semi-diameter; the top edge touches the horizon.
  const horizon = around(-0.833 - 2.076 * Math.sqrt(Math.max(0, elevation)) / 60), civil = around(-6), golden = around(6)
  return {
    sunrise: horizon?.[0] ?? null, sunset: horizon?.[1] ?? null, noon: ms(transit),
    dawn: civil?.[0] ?? null, dusk: civil?.[1] ?? null, goldenEnd: golden?.[0] ?? null, goldenStart: golden?.[1] ?? null,
    dayLength: horizon ? horizon[1] - horizon[0] : null,
  }
}

/** HH:MM in KST, rounded to the nearest minute (KASI publishes rounded minutes). */
export function kstTime(ms: number | null): string {
  if (ms == null) return '—'
  const t = new Date(Math.round(ms / 60000) * 60000 + KST)
  return `${String(t.getUTCHours()).padStart(2, '0')}:${String(t.getUTCMinutes()).padStart(2, '0')}`
}
/** KST calendar date of an instant. */
export const kstDate = (ms: number) => new Date(ms + KST).toISOString().slice(0, 10)
/** The next New Year's Day in KST (today when it is January 1st). */
export function newYearTarget(now: number): string {
  const today = kstDate(now)
  return today.endsWith('-01-01') ? today : `${Number(today.slice(0, 4)) + 1}-01-01`
}
/** All KST dates of a month. */
export function monthDates(month: string): string[] {
  const [y, m] = month.split('-').map(Number), length = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return Array.from({ length }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)
}
