// 스키장 날씨 → 날짜별 요약과 "가기 좋은 날" 점수. 검증: node scripts/check-ski.ts
// 예보 정규화는 에버랜드 플래너의 normalizeForecast(MET Norway, 겹치는 강수 구간 제거)를 그대로 쓴다.
import { normalizeForecast, crowdOf, type Forecast, type VisitDay } from '../everland/planner.ts'
import { seoulDay } from '../everland/model.ts'
import { getKoreanHolidays } from '../../utils/koreanHolidays.ts'

const HOUR = 3600000
export interface SkiDay { date: string; low: number; high: number; rain: number; snow: number; wind: number; coverage: number }

/** 09~17시(KST) 슬로프 운영 시간대 요약. 6시간 미만 자료인 날(오늘 남은 시간, 예보 끝)은 뺀다.
 *  강수는 기호에 snow/sleet 가 있거나 기온 0℃ 이하면 눈, 아니면 비로 나눈다. */
export function skiDays(forecast: Forecast, now = Date.now()): SkiDay[] {
  const today = seoulDay(now), dates = [...new Set(forecast.slots.map(s => seoulDay(Date.parse(s.start))))].sort()
  return dates.filter(d => d >= today).flatMap(date => {
    const start = Date.parse(`${date}T09:00:00+09:00`), end = Date.parse(`${date}T17:00:00+09:00`)
    if (end <= now) return []
    const slots = forecast.slots.filter(s => Date.parse(s.start) < end && Date.parse(s.end) > start)
    const share = (s: Forecast['slots'][number]) => Math.max(0, Math.min(end, Date.parse(s.end)) - Math.max(start, Date.parse(s.start)))
    const coverage = slots.reduce((sum, s) => sum + share(s), 0) / HOUR
    if (coverage < 6) return []
    let rain = 0, snow = 0
    for (const s of slots) {
      const mm = s.rain * share(s) / (Date.parse(s.end) - Date.parse(s.start))
      if (/snow|sleet/.test(s.symbol) || s.temperature <= 0) snow += mm; else rain += mm
    }
    const r1 = (n: number) => Math.round(n * 10) / 10
    return [{ date, low: r1(Math.min(...slots.map(s => s.temperature))), high: r1(Math.max(...slots.map(s => s.temperature))), rain: r1(rain), snow: r1(snow), wind: r1(Math.max(...slots.map(s => s.wind))), coverage }]
  })
}

export interface SkiScore { score: number; crowd: VisitDay['crowd']; weekday: number; holiday: boolean; caution: boolean; reasons: string[] }
/** 날씨 60% + 요일·공휴일 혼잡 40%. 비는 설질을 망치고, 강풍은 리프트 운행을 멈출 수 있어 크게 깎는다. */
export function skiScore(d: SkiDay): SkiScore {
  const weekday = new Date(`${d.date}T00:00:00Z`).getUTCDay()
  const holiday = getKoreanHolidays(Number(d.date.slice(0, 4))).some(h => h.date === d.date)
  const crowd = crowdOf(weekday, holiday)
  const weather = Math.max(0, Math.min(100, 100 - Math.min(50, d.rain * 15) - Math.max(0, d.wind - 8) * 6
    - Math.max(0, -12 - d.low) * 3 - Math.max(0, d.high - 3) * 5 + Math.min(10, d.snow * 2)))
  const caution = d.rain >= 3 || d.wind >= 14
  const score = Math.min(caution ? 45 : 100, Math.round(weather * 0.6 + (crowd === 'low' ? 90 : crowd === 'medium' ? 60 : 30) * 0.4))
  const reasons = [d.rain >= 0.5 ? 'rain' : d.snow >= 1 ? 'snow' : 'dry']
  if (d.wind >= 10) reasons.push('wind')
  if (d.low <= -12) reasons.push('cold')
  if (d.high >= 5) reasons.push('mild')
  reasons.push(holiday ? 'holiday' : crowd === 'high' ? 'weekend' : crowd === 'medium' ? 'friday' : 'weekday')
  return { score, crowd, weekday, holiday, caution, reasons }
}

export interface SkiForecast { issuedAt: string; fetchedAt: string; resorts: Record<string, SkiDay[]> }
export const metToSkiDays = (raw: unknown, now = Date.now()) => skiDays(normalizeForecast(raw, now), now)
