import { sunTimes } from './solar.ts'
import { SPOTS, type SpotId } from './places.ts'

/** MET Norway covers about 9–10 days; earlier requests return availability only. */
export const FORECAST_DAYS = 9
export interface SpotSky { cloud: number; rain: number | null; gapMinutes: number }
export interface SunriseSky { target: string; available: boolean; from: string; issuedAt?: string; spots: Partial<Record<SpotId, SpotSky>> }

export const skyFrom = (target: string) => new Date(Date.parse(`${target}T00:00:00+09:00`) - FORECAST_DAYS * 86400000 + 9 * 3600000).toISOString().slice(0, 10)
export const skyAvailable = (target: string, now: number) => Date.parse(`${target}T00:00:00+09:00`) - now <= FORECAST_DAYS * 86400000

type Point = { time?: string; data?: { instant?: { details?: { cloud_area_fraction?: unknown } }; next_1_hours?: { details?: { precipitation_amount?: unknown } }; next_6_hours?: { details?: { precipitation_amount?: unknown } } } }
/** Total cloud cover at the forecast point nearest to sunrise (within 3 hours). Total cover is a
 * proxy: low cloud on the eastern horizon matters most, which the compact product does not split. */
export function skyAtSunrise(raw: unknown, sunrise: number): SpotSky | null {
  const series = (raw as { properties?: { timeseries?: Point[] } })?.properties?.timeseries
  if (!Array.isArray(series)) throw new Error('Unexpected forecast format')
  let best: { p: Point; gap: number } | null = null
  for (const p of series) {
    const gap = Math.abs(Date.parse(String(p?.time)) - sunrise)
    if (Number.isFinite(gap) && (!best || gap < best.gap)) best = { p, gap }
  }
  const cloud = best?.p.data?.instant?.details?.cloud_area_fraction
  if (!best || best.gap > 3 * 3600000 || typeof cloud !== 'number' || cloud < 0 || cloud > 100) return null
  const rain = best.p.data?.next_1_hours?.details?.precipitation_amount ?? best.p.data?.next_6_hours?.details?.precipitation_amount
  return { cloud: Math.round(cloud), rain: typeof rain === 'number' && rain >= 0 ? rain : null, gapMinutes: Math.round(best.gap / 60000) }
}

export async function fetchSunriseSky(target: string, now: number, request: typeof fetch = fetch): Promise<SunriseSky> {
  const base = { target, from: skyFrom(target), spots: {} }
  if (!skyAvailable(target, now)) return { ...base, available: false }
  const settled = await Promise.allSettled(SPOTS.map(async s => {
    const res = await request(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${s.lat}&lon=${s.lon}`, {
      signal: AbortSignal.timeout(10000), headers: { 'User-Agent': 'ToolHub/1.0 (+https://toolhub.ai.kr/about/)', Accept: 'application/json' },
    })
    if (!res.ok) throw new Error(`MET HTTP ${res.status}`)
    const json = await res.json() as { properties?: { meta?: { updated_at?: string } } }
    return { id: s.id, sky: skyAtSunrise(json, sunTimes(target, s.lat, s.lon, s.elevation).sunrise!), issuedAt: String(json.properties?.meta?.updated_at ?? '') }
  }))
  const ok = settled.flatMap(r => r.status === 'fulfilled' && r.value.sky ? [r.value] : [])
  return { ...base, available: ok.length > 0, issuedAt: ok.map(o => o.issuedAt).sort()[0], spots: Object.fromEntries(ok.map(o => [o.id, o.sky])) }
}
