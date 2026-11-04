import { getKoreanHolidays } from '../../utils/koreanHolidays.ts'
import { seoulDay } from './model.ts'
import { parks, type ParkId, type VisitArea } from '../theme-parks/config.ts'

export type Profile = 'balanced' | 'family' | 'rides'
export type Scope = 'all' | 'weekend'
export interface WeatherSlot { start: string; end: string; temperature: number; wind: number; rain: number; symbol: string }
export interface Forecast { issuedAt: string; fetchedAt: string; slots: WeatherSlot[] }
export interface VisitDay {
  date: string; weekday: number; holiday: boolean; low: number; high: number; wind: number; rain: number
  coverage: number; coarse: boolean; slots: WeatherSlot[]; crowd: 'low' | 'medium' | 'high'
  weatherScore: number; score: number; caution: boolean; reasons: string[]; tentative: boolean
}
const hour = 3600000
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const record = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {}

/** MET intervals are accumulated rain, not probability. Select the shortest available
 * interval and discard overlaps so 1h/6h forecasts cannot be counted twice. */
export function normalizeForecast(raw: unknown, now = Date.now()): Forecast {
  const props = record(record(raw).properties), meta = record(props.meta), units = record(meta.units)
  if (units.air_temperature !== 'celsius' || units.wind_speed !== 'm/s' || units.precipitation_amount !== 'mm') throw new Error('Unexpected forecast units')
  const issuedAt = String(meta.updated_at)
  if (!Number.isFinite(Date.parse(issuedAt)) || Date.parse(issuedAt) > now + hour) throw new Error('Invalid forecast issue time')
  const points = Array.isArray(props.timeseries) ? props.timeseries : []
  const slots: WeatherSlot[] = []
  let previousEnd = 0
  for (const rawPoint of [...points].sort((a,b) => String(record(a).time).localeCompare(String(record(b).time)))) {
    const point = record(rawPoint), data = record(point.data), details = record(record(data.instant).details)
    const start = Date.parse(String(point.time))
    if (!Number.isFinite(start) || start < previousEnd || start > now + 12 * 24 * hour) continue
    const duration = [1,6,12].find(h => data[`next_${h}_hours`] !== undefined)
    if (!duration) continue
    const next = record(data[`next_${duration}_hours`]), rain = record(next.details).precipitation_amount
    const temperature = details.air_temperature, wind = details.wind_speed
    if (!finite(temperature) || temperature < -60 || temperature > 60 || !finite(wind) || wind < 0 || wind > 100 || !finite(rain) || rain < 0 || rain > 1000) continue
    previousEnd = start + duration * hour
    slots.push({ start:new Date(start).toISOString(), end:new Date(previousEnd).toISOString(), temperature, wind, rain, symbol:String(record(next.summary).symbol_code ?? 'unknown') })
  }
  if (!slots.length) throw new Error('Empty forecast')
  return { issuedAt, fetchedAt:new Date(now).toISOString(), slots }
}

export function forecastFresh(forecast: Forecast | null, now: number) {
  return !!forecast && now - Date.parse(forecast.issuedAt) <= 24 * hour && now - Date.parse(forecast.fetchedAt) <= 24 * hour
}

export function visitDays(forecast: Forecast | null, profile: Profile = 'balanced', now = Date.now(), park: ParkId = 'everland', area: VisitArea = 'all'): VisitDay[] {
  if (!forecast || !forecastFresh(forecast, now)) return []
  const today = seoulDay(now), dates = new Set<string>()
  forecast.slots.forEach(s => { dates.add(seoulDay(Date.parse(s.start))); dates.add(seoulDay(Date.parse(s.end) - 1)) })
  const holidayDates = new Set([...new Set([...dates].map(d => Number(d.slice(0,4))))].flatMap(y => getKoreanHolidays(y).map(h => h.date)))
  return [...dates].sort().filter(d => d >= today).flatMap(date => {
    const start = Date.parse(`${date}T10:00:00+09:00`), end = Date.parse(`${date}T18:00:00+09:00`)
    if (end <= now) return []
    const slots = forecast.slots.filter(s => Date.parse(s.start) < end && Date.parse(s.end) > start)
    const coverage = slots.reduce((sum,s) => sum + Math.max(0, Math.min(end,Date.parse(s.end)) - Math.max(start,Date.parse(s.start))),0) / hour
    // A full day needs at least six forecast hours. Today's incomplete forecast is
    // visible only in the explanation; never promoted as a full-day recommendation.
    if (coverage < 6) return []
    const low = Math.min(...slots.map(s=>s.temperature)), high = Math.max(...slots.map(s=>s.temperature)), wind = Math.max(...slots.map(s=>s.wind))
    const rain = slots.reduce((sum,s) => sum + s.rain * Math.max(0,Math.min(end,Date.parse(s.end))-Math.max(start,Date.parse(s.start))) / (Date.parse(s.end)-Date.parse(s.start)),0)
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay(), holiday = holidayDates.has(date)
    const crowd = holiday || weekday === 6 || weekday === 0 ? 'high' : weekday === 5 ? 'medium' : 'low'
    const cold = Math.max(0, (profile === 'family' ? 14 : 10) - low), hot = Math.max(0, high - (profile === 'family' ? 27 : 29))
    const indoor = parks[park].indoor && area==='indoor'
    const storm = slots.some(s => /thunder/.test(s.symbol)), caution = indoor ? storm || rain>=20 || wind>=15 : storm || rain >= 8 || wind >= 9 || low < 0 || high >= 33
    const penalty = cold*3 + hot*5 + Math.min(55,rain*(profile === 'rides' ? 10 : 8)) + Math.max(0,wind-4)*5 + (storm ? 50 : 0)
    const weatherScore = Math.max(0,Math.round(100 - penalty*(indoor?.3:1)))
    const weight = indoor ? (profile==='family'?.5:.4) : profile === 'family' ? .85 : profile === 'rides' ? .8 : .7
    const crowdScore = crowd === 'low' ? 90 : crowd === 'medium' ? 60 : 30
    const score = Math.min(caution ? (indoor?65:45) : 100, Math.round(weatherScore * weight + crowdScore * (1-weight)))
    const reasons = [rain < .5 ? 'dry' : rain < 3 ? 'lightRain' : 'rain', low >= 14 && high <= 27 ? 'comfortable' : low < 14 ? 'cold' : 'hot', holiday ? 'holiday' : crowd === 'high' ? 'weekend' : crowd === 'medium' ? 'friday' : 'weekday']
    if (wind >= 7) reasons.push('wind')
    if (storm) reasons.push('storm')
    if (indoor) reasons.unshift('indoor')
    const coarse = slots.some(s => Date.parse(s.end)-Date.parse(s.start) > hour)
    const tentative = Date.parse(`${date}T00:00:00+09:00`) - Date.parse(`${today}T00:00:00+09:00`) >= 5*24*hour
    return [{ date, weekday, holiday, low, high, rain:Math.round(rain*10)/10, wind, coverage, coarse, slots, crowd, weatherScore, score, caution, reasons, tentative }]
  })
}

export function recommended(days: VisitDay[], scope: Scope) {
  return days.filter(d => scope === 'all' || d.weekday === 0 || d.weekday === 6 || d.holiday).sort((a,b)=>b.score-a.score || a.date.localeCompare(b.date)).slice(0,3)
}
