// 김장 적기: 기상청 기준(하루 평균기온 4℃ 이하, 최저기온 0℃ 이하)을 MET Norway 예보에 적용한다.
// 평년 날짜는 웨더아이(2019-11-05) "평년 김장 시기" 표 — https://weatheri.co.kr/board/board03_read.php?id=293
export const REGIONS = [
  { id: 'seoul', lat: 37.571, lon: 126.966, normal: [11, 29] },
  { id: 'incheon', lat: 37.478, lon: 126.625, normal: [12, 1] },
  { id: 'suwon', lat: 37.272, lon: 126.985, normal: [11, 26] },
  { id: 'chuncheon', lat: 37.903, lon: 127.736, normal: [11, 17] },
  { id: 'gangneung', lat: 37.752, lon: 128.891, normal: [12, 12] },
  { id: 'daejeon', lat: 36.372, lon: 127.372, normal: [12, 1] },
  { id: 'seosan', lat: 36.777, lon: 126.494, normal: [11, 28] },
  { id: 'cheongju', lat: 36.639, lon: 127.441, normal: [11, 27] },
  { id: 'jeonju', lat: 35.841, lon: 127.117, normal: [12, 3] },
  { id: 'gwangju', lat: 35.173, lon: 126.892, normal: [12, 11] },
  { id: 'mokpo', lat: 34.817, lon: 126.381, normal: [12, 25] },
  { id: 'yeosu', lat: 34.739, lon: 127.741, normal: [12, 30] },
  { id: 'daegu', lat: 35.878, lon: 128.653, normal: [12, 5] },
  { id: 'ulsan', lat: 35.582, lon: 129.335, normal: [12, 22] },
  { id: 'busan', lat: 35.105, lon: 129.032, normal: [1, 2] },
] as const
export type RegionId = typeof REGIONS[number]['id']
export const isRegion = (v: unknown): v is RegionId => REGIONS.some(r => r.id === v)
export interface DayTemp { date: string; mean: number; min: number; max: number }
export interface KimjangForecast { issuedAt: string; fetchedAt: string; regions: Partial<Record<RegionId, DayTemp[]>> }

const HOUR = 3600000
const kstDay = (t: number) => new Date(t + 9 * HOUR).toISOString().slice(0, 10)
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > -60 && v < 60

/** MET compact → KST daily mean/min/max. Each instant temperature holds until the next point
 * (1h near term, 6h later); 6-hour min/max extremes are included when given.
 * Days with under 18 forecast hours (today's remainder, forecast end) are dropped. */
export function dailyTemps(raw: unknown): DayTemp[] {
  const props = (raw as { properties?: { meta?: { units?: Record<string, string> }; timeseries?: unknown[] } })?.properties
  if (props?.meta?.units?.air_temperature !== 'celsius' || !Array.isArray(props.timeseries)) throw new Error('Unexpected forecast format')
  type Point = { time?: string; data?: { instant?: { details?: { air_temperature?: unknown } }; next_6_hours?: { details?: { air_temperature_min?: unknown; air_temperature_max?: unknown } } } }
  const points = (props.timeseries as Point[]).map(p => ({ t: Date.parse(String(p?.time)), temp: p?.data?.instant?.details?.air_temperature, six: p?.data?.next_6_hours?.details }))
    .filter((p): p is typeof p & { temp: number } => Number.isFinite(p.t) && num(p.temp)).sort((a, b) => a.t - b.t)
  const days = new Map<string, { sum: number; hours: number; min: number; max: number }>()
  const day = (d: string) => days.get(d) ?? days.set(d, { sum: 0, hours: 0, min: Infinity, max: -Infinity }).get(d)!
  points.forEach((p, i) => {
    const end = Math.min(points[i + 1]?.t ?? p.t + HOUR, p.t + 6 * HOUR)
    for (let h = p.t; h < end; h += HOUR) { const d = day(kstDay(h)); d.sum += p.temp; d.hours++ }
    const d = day(kstDay(p.t)); d.min = Math.min(d.min, p.temp); d.max = Math.max(d.max, p.temp)
    const mid = day(kstDay(p.t + 3 * HOUR))
    if (num(p.six?.air_temperature_min)) mid.min = Math.min(mid.min, p.six.air_temperature_min)
    if (num(p.six?.air_temperature_max)) mid.max = Math.max(mid.max, p.six.air_temperature_max)
  })
  const r1 = (n: number) => Math.round(n * 10) / 10
  return [...days].filter(([, d]) => d.hours >= 18).sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => ({ date, mean: r1(d.sum / d.hours), min: r1(d.min), max: r1(d.max) }))
}

export const fits = (d: DayTemp) => d.mean <= 4 && d.min <= 0
/** First day of three consecutive fitting days ("유지"), or null within the forecast range. */
export function entryDay(days: DayTemp[]): string | null {
  for (let i = 0; i + 2 < days.length; i++) if (fits(days[i]) && fits(days[i + 1]) && fits(days[i + 2])) return days[i].date
  return null
}
