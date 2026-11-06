// 체감온도 예보: MET Norway(CC BY 4.0) 시간별 기온·10m 풍속 → 앞으로 48시간 + 날짜별 요약.
// 정규화는 에버랜드 플래너 normalizeForecast(겹치는 구간 제거·단위 검사)를 그대로 쓴다. 체감온도 계산은 utils/windChill.
import { normalizeForecast } from '../everland/planner.ts'
import { windChill } from '../../utils/windChill.ts'

/** 기상청 관측소 좌표(철원·대관령은 한파 대표 지점) */
export const CITIES = [
  { id: 'seoul', lat: 37.571, lon: 126.966 }, { id: 'incheon', lat: 37.478, lon: 126.625 }, { id: 'suwon', lat: 37.272, lon: 126.985 },
  { id: 'cheorwon', lat: 38.148, lon: 127.304 }, { id: 'chuncheon', lat: 37.903, lon: 127.736 }, { id: 'daegwallyeong', lat: 37.677, lon: 128.718 },
  { id: 'gangneung', lat: 37.752, lon: 128.891 }, { id: 'daejeon', lat: 36.372, lon: 127.372 }, { id: 'cheongju', lat: 36.639, lon: 127.441 },
  { id: 'jeonju', lat: 35.841, lon: 127.117 }, { id: 'gwangju', lat: 35.173, lon: 126.892 }, { id: 'andong', lat: 36.573, lon: 128.707 },
  { id: 'daegu', lat: 35.878, lon: 128.653 }, { id: 'ulsan', lat: 35.582, lon: 129.335 }, { id: 'busan', lat: 35.105, lon: 129.032 },
  { id: 'jeju', lat: 33.514, lon: 126.530 },
] as const
export type CityId = (typeof CITIES)[number]['id']
export const isCity = (v: unknown): v is CityId => CITIES.some(c => c.id === v)

const HOUR = 3600000
const KST = 9 * HOUR
const kstDate = (ms: number) => new Date(ms + KST).toISOString().slice(0, 10)
const kstHour = (ms: number) => new Date(ms + KST).getUTCHours()
const r1 = (n: number) => Math.round(n * 10) / 10

/** 시각(ISO, 구간 시작) · 기온 ℃ · 풍속 m/s */
export interface HourPoint { at: string; temp: number; wind: number }
/** morningMin = 00~09시 시작 구간의 최저 기온(없으면 null), minWc = 그날 최저 체감온도 */
export interface DaySummary { date: string; morningMin: number | null; min: number; max: number; minWc: number; maxWind: number }
export interface CityForecast { hours: HourPoint[]; days: DaySummary[] }
export interface WindChillForecast { issuedAt: string; fetchedAt: string; cities: Partial<Record<CityId, CityForecast>> }

export function cityForecast(raw: unknown, now = Date.now()): CityForecast & { issuedAt: string } {
  const f = normalizeForecast(raw, now)
  const slots = f.slots.map(s => ({ start: Date.parse(s.start), temp: s.temperature, wind: s.wind })).filter(s => s.start >= now - HOUR)
  const hours = slots.filter(s => s.start < now + 48 * HOUR).map(s => ({ at: new Date(s.start).toISOString(), temp: r1(s.temp), wind: r1(s.wind) }))
  const byDate = new Map<string, typeof slots>()
  for (const s of slots) { const d = kstDate(s.start); byDate.set(d, [...(byDate.get(d) ?? []), s]) }
  const days = [...byDate.entries()].filter(([, ss]) => ss.length >= 3).map(([date, ss]) => {
    const morning = ss.filter(s => kstHour(s.start) <= 9).map(s => s.temp)
    return {
      date, morningMin: morning.length ? r1(Math.min(...morning)) : null,
      min: r1(Math.min(...ss.map(s => s.temp))), max: r1(Math.max(...ss.map(s => s.temp))),
      minWc: r1(Math.min(...ss.map(s => windChill(s.temp, s.wind)))), maxWind: r1(Math.max(...ss.map(s => s.wind))),
    }
  })
  return { issuedAt: f.issuedAt, hours, days }
}
