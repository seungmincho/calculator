// 택시 요금 계산 (순수 로직). 회귀 체크: node scripts/check-taxi-fare.ts

export type RegionKey =
  | 'seoul' | 'gyeonggi' | 'incheon'
  | 'busan' | 'daegu' | 'daejeon' | 'gwangju' | 'ulsan'
  | 'sejong' | 'gangwon' | 'chungbuk' | 'chungnam'
  | 'jeonbuk' | 'jeonnam' | 'gyeongbuk' | 'gyeongnam' | 'jeju'
export type TaxiType = 'regular' | 'deluxe' | 'jumbo'
export type Traffic = 'smooth' | 'normal' | 'heavy'

export interface RegionRate {
  base: number        // 기본요금 (원)
  baseDist: number    // 기본거리 (m)
  unitDist: number    // 거리요금 단위거리 (m)
  unitFare: number    // 거리요금 (원)
  timeUnit: number    // 시간요금 단위 (초)
  timeFare: number    // 시간요금 (원)
  nightStart: number  // 심야 시작 시각 (시)
  nightEnd: number    // 심야 종료 시각 (시, 익일)
  deepStart: number | null // 최고할증 구간 시작 (시)
  deepEnd: number | null   // 최고할증 구간 종료 (시, 익일)
  nightRate: number   // 일반 심야할증율
  deepRate: number    // 최고 심야할증율
  outRate: number     // 시계외 할증율
}

// 2026년 9월 기준 시도별 중형택시 요율 (지자체별 변동 가능 — 실제 요율은 관할 시·도 확인)
// 검증: 서울 4,800/1.6km(2023.2~) · 대구 4,500/1.7km/125m(2025.1~) · 제주 4,300/2km(2024.7~) · 전남 4,300/2km
// 예정: 전남 22개 시군 4,800/1.7km(2026.11~12 시행 추진), 대구 5,200~5,600(2027 초 용역안)
export const REGION_RATES: Record<RegionKey, RegionRate> = {
  seoul:     { base: 4800, baseDist: 1600, unitDist: 131, unitFare: 100, timeUnit: 30, timeFare: 100, nightStart: 22, nightEnd: 4, deepStart: 23, deepEnd: 2, nightRate: 0.2, deepRate: 0.4, outRate: 0.2 },
  gyeonggi:  { base: 4800, baseDist: 1600, unitDist: 131, unitFare: 100, timeUnit: 30, timeFare: 100, nightStart: 23, nightEnd: 4, deepStart: null, deepEnd: null, nightRate: 0.3, deepRate: 0.3, outRate: 0.2 },
  incheon:   { base: 4800, baseDist: 1600, unitDist: 131, unitFare: 100, timeUnit: 30, timeFare: 100, nightStart: 22, nightEnd: 4, deepStart: 23, deepEnd: 2, nightRate: 0.2, deepRate: 0.4, outRate: 0.3 },
  busan:     { base: 4800, baseDist: 2000, unitDist: 132, unitFare: 100, timeUnit: 30, timeFare: 100, nightStart: 23, nightEnd: 4, deepStart: 23, deepEnd: 2, nightRate: 0.2, deepRate: 0.3, outRate: 0.3 },
  daegu:     { base: 4500, baseDist: 1700, unitDist: 125, unitFare: 100, timeUnit: 30, timeFare: 100, nightStart: 23, nightEnd: 4, deepStart: null, deepEnd: null, nightRate: 0.2, deepRate: 0.2, outRate: 0.2 },
  daejeon:   { base: 4300, baseDist: 1800, unitDist: 133, unitFare: 100, timeUnit: 30, timeFare: 100, nightStart: 23, nightEnd: 4, deepStart: null, deepEnd: null, nightRate: 0.2, deepRate: 0.2, outRate: 0.3 },
  gwangju:   { base: 4300, baseDist: 1600, unitDist: 131, unitFare: 100, timeUnit: 30, timeFare: 100, nightStart: 23, nightEnd: 4, deepStart: null, deepEnd: null, nightRate: 0.2, deepRate: 0.2, outRate: 0.2 },
  ulsan:     { base: 4300, baseDist: 2000, unitDist: 132, unitFare: 100, timeUnit: 30, timeFare: 100, nightStart: 23, nightEnd: 4, deepStart: null, deepEnd: null, nightRate: 0.2, deepRate: 0.2, outRate: 0.2 },
  sejong:    { base: 4000, baseDist: 2000, unitDist: 132, unitFare: 100, timeUnit: 30, timeFare: 100, nightStart: 23, nightEnd: 4, deepStart: null, deepEnd: null, nightRate: 0.2, deepRate: 0.2, outRate: 0.2 },
  gangwon:   { base: 4000, baseDist: 2000, unitDist: 132, unitFare: 100, timeUnit: 30, timeFare: 100, nightStart: 23, nightEnd: 4, deepStart: null, deepEnd: null, nightRate: 0.2, deepRate: 0.2, outRate: 0.2 },
  chungbuk:  { base: 4000, baseDist: 2000, unitDist: 132, unitFare: 100, timeUnit: 30, timeFare: 100, nightStart: 23, nightEnd: 4, deepStart: null, deepEnd: null, nightRate: 0.2, deepRate: 0.2, outRate: 0.2 },
  chungnam:  { base: 4000, baseDist: 2000, unitDist: 132, unitFare: 100, timeUnit: 30, timeFare: 100, nightStart: 23, nightEnd: 4, deepStart: null, deepEnd: null, nightRate: 0.2, deepRate: 0.2, outRate: 0.2 },
  jeonbuk:   { base: 4000, baseDist: 2000, unitDist: 132, unitFare: 100, timeUnit: 30, timeFare: 100, nightStart: 23, nightEnd: 4, deepStart: null, deepEnd: null, nightRate: 0.2, deepRate: 0.2, outRate: 0.2 },
  jeonnam:   { base: 4300, baseDist: 2000, unitDist: 132, unitFare: 100, timeUnit: 30, timeFare: 100, nightStart: 23, nightEnd: 4, deepStart: null, deepEnd: null, nightRate: 0.2, deepRate: 0.2, outRate: 0.2 },
  gyeongbuk: { base: 4500, baseDist: 1700, unitDist: 131, unitFare: 100, timeUnit: 30, timeFare: 100, nightStart: 23, nightEnd: 4, deepStart: null, deepEnd: null, nightRate: 0.2, deepRate: 0.2, outRate: 0.2 },
  gyeongnam: { base: 4000, baseDist: 2000, unitDist: 132, unitFare: 100, timeUnit: 30, timeFare: 100, nightStart: 23, nightEnd: 4, deepStart: null, deepEnd: null, nightRate: 0.2, deepRate: 0.2, outRate: 0.2 },
  jeju:      { base: 4300, baseDist: 2000, unitDist: 131, unitFare: 100, timeUnit: 30, timeFare: 100, nightStart: 23, nightEnd: 4, deepStart: null, deepEnd: null, nightRate: 0.2, deepRate: 0.2, outRate: 0.2 },
}

// 모범/대형 택시 프리미엄 요율 (전국 유사 — 지역별 세부 요율은 관할 확인)
export const PREMIUM = { base: 7000, baseDist: 3000, unitDist: 151, unitFare: 200, timeUnit: 36, timeFare: 200 }

export const REGION_GROUPS: { groupKey: string; regions: RegionKey[] }[] = [
  { groupKey: 'metro', regions: ['seoul', 'gyeonggi', 'incheon'] },
  { groupKey: 'city', regions: ['busan', 'daegu', 'daejeon', 'gwangju', 'ulsan'] },
  { groupKey: 'province', regions: ['sejong', 'gangwon', 'chungbuk', 'chungnam', 'jeonbuk', 'jeonnam', 'gyeongbuk', 'gyeongnam', 'jeju'] },
]
export const REGION_KEYS = REGION_GROUPS.flatMap((g) => g.regions)
export const TAXI_TYPES: TaxiType[] = ['regular', 'deluxe', 'jumbo']

// 교통 상황별 도심 평균 주행속도 (km/h) — 소요 시간 자동 추정용 가정치
export const TRAFFIC_SPEED: Record<Traffic, number> = { smooth: 30, normal: 20, heavy: 13 }
// 이 속도로 달렸을 때보다 더 걸린 시간 = 저속(시속 15km 이하)·정차 구간으로 간주
// ponytail: 평균속도 휴리스틱. 실제 미터는 순간속도로 거리/시간 병산 — 경로 API 붙이면 대체.
const CRUISE_KMH = 30

export const estimateMinutes = (km: number, traffic: Traffic) =>
  km > 0 ? Math.max(1, Math.round((km / TRAFFIC_SPEED[traffic]) * 60)) : 0

export function getSchedule(region: RegionKey, type: TaxiType): RegionRate {
  const r = REGION_RATES[region]
  if (type === 'regular') return r
  const sched: RegionRate = { ...r, ...PREMIUM }
  // 모범택시는 심야할증 없음
  if (type === 'deluxe') Object.assign(sched, { nightRate: 0, deepRate: 0, deepStart: null, deepEnd: null })
  return sched
}

const inWindow = (start: number, end: number, h: number) =>
  start < end ? h >= start && h < end : h >= start || h < end

// 탑승 시각에 적용되는 심야할증율
export function nightRateFor(hour: number, s: RegionRate): number {
  if (s.nightRate === 0 && s.deepRate === 0) return 0
  if (!inWindow(s.nightStart, s.nightEnd, hour)) return 0
  if (s.deepStart != null && s.deepEnd != null && inWindow(s.deepStart, s.deepEnd, hour)) return s.deepRate
  return s.nightRate
}

export interface FareResult {
  base: number
  distanceFare: number
  timeFare: number
  metered: number
  nightRate: number
  nightSurcharge: number
  outRate: number
  outSurcharge: number
  total: number
}

export function computeFare(distanceKm: number, timeMin: number, hour: number, region: RegionKey, type: TaxiType, outOfCity: boolean): FareResult {
  const s = getSchedule(region, type)
  const km = Math.max(0, distanceKm)
  const extraDist = Math.max(0, km * 1000 - s.baseDist)
  const distanceFare = Math.floor(extraDist / s.unitDist) * s.unitFare
  const slowSec = Math.max(0, timeMin * 60 - (km / CRUISE_KMH) * 3600)
  const timeFare = Math.floor(slowSec / s.timeUnit) * s.timeFare
  const metered = s.base + distanceFare + timeFare
  const nightRate = nightRateFor(hour, s)
  const outRate = outOfCity ? s.outRate : 0
  const nightSurcharge = Math.floor(metered * nightRate)
  const outSurcharge = Math.floor(metered * outRate)
  const total = metered + nightSurcharge + outSurcharge
  return { base: s.base, distanceFare, timeFare, metered, nightRate, nightSurcharge, outRate, outSurcharge, total }
}

// N명이 나눠 낼 때 1인당 금액 (10원 단위 올림 — 모자라지 않게)
export const perPerson = (total: number, n: number) => Math.ceil(total / Math.max(1, n) / 10) * 10
