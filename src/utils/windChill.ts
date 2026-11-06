// 겨울철 체감온도 (기상청 기상자료개방포털, 2026-11-07 확인 — https://data.kma.go.kr/climate/windChill/selectWindChillChart.do?pgmNo=111)
//   체감온도 = 13.12 + 0.6215T − 11.37V^0.16 + 0.3965V^0.16·T   (T: 기온 ℃, V: 10분 평균 풍속 km/h)
//   기온 10℃ 이하·풍속 1.3m/s(4.8km/h) 초과일 때만 산출, 그 밖에는 기온 그대로(포털 계산기와 같게 결과가 기온보다 높으면 기온).
//   단계(포털 지도 범례): −10℃ 이상 관심 · −25 이상 −10 미만 주의 · −45 이상 −25 미만 경고 · −45 미만 위험.
// 한파특보는 기상청이 아침 최저기온·평년값으로 따로 발표한다 — 여기서는 '−12℃ 이하 2일 / −15℃ 이하 2일' 수준인지 참고로만 표시.
// 검증: node scripts/check-wind-chill.ts (포털 '체감온도 산출표'와 대조)

export const MAX_TEMP = 10
export const MIN_WIND_KMH = 4.8
export const msToKmh = (ms: number) => ms * 3.6

export function windChillKmh(t: number, kmh: number): number {
  if (!(t <= MAX_TEMP) || !(kmh > MIN_WIND_KMH)) return t
  const w = Math.pow(kmh, 0.16)
  return Math.min(t, 13.12 + 0.6215 * t - 11.37 * w + 0.3965 * w * t)
}
/** 풍속 m/s 입력 (MET Norway·기상청 예보 단위) */
export const windChill = (t: number, ms: number) => windChillKmh(t, msToKmh(ms))
export const applies = (t: number, ms: number) => t <= MAX_TEMP && msToKmh(ms) > MIN_WIND_KMH

export type Stage = 'none' | 'interest' | 'caution' | 'warning' | 'danger'
export const STAGES: Exclude<Stage, 'none'>[] = ['interest', 'caution', 'warning', 'danger']
/** 체감온도 산출 조건이 아니면 'none' */
export function stageOf(t: number, ms: number): Stage {
  if (!applies(t, ms)) return 'none'
  const wc = windChill(t, ms)
  return wc >= -10 ? 'interest' : wc >= -25 ? 'caution' : wc >= -45 ? 'warning' : 'danger'
}

/** 포털 산출표와 같은 격자: 기온 0 ~ −50℃(5℃ 간격) × 풍속 5 ~ 60km/h(5km/h 간격, 표기 1.4~16.7m/s), 정수 반올림.
 *  같은 식이지만 포털 표는 132칸 중 3칸(−30.48 같은 반올림 경계)이 1℃ 낮게 적혀 있다 — 검사 스크립트가 그 범위를 확인한다. */
export const TABLE_TEMPS = [0, -5, -10, -15, -20, -25, -30, -35, -40, -45, -50]
export const TABLE_WINDS_KMH = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60]
export const tableValue = (t: number, kmh: number) => Math.round(windChillKmh(t, kmh))

/** 한파 참고: 날짜별 아침(00~09시 KST) 최저기온이 −12℃(주의보 기준)·−15℃(경보 기준) 이하로 이틀 이상 이어지는지 */
export type ColdLevel = 'advisory' | 'warning' | null
export function coldRuns(days: { date: string; morningMin: number | null }[]): Record<string, ColdLevel> {
  const out: Record<string, ColdLevel> = {}
  for (const [limit, level] of [[-12, 'advisory'], [-15, 'warning']] as const) {
    for (let i = 0; i < days.length; i++) {
      const cold = (k: number) => days[k] && days[k].morningMin != null && days[k].morningMin! <= limit
      if (cold(i) && (cold(i - 1) || cold(i + 1))) out[days[i].date] = level
    }
  }
  return out
}
