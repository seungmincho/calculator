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
  longFrom?: number   // 장거리 요율 시작 거리 (m). 이후 거리요금 단위당 longFare 원 (제주 20km~, 전남 9km~)
  longFare?: number
  comboCap?: number   // 심야+시계외 중복 할증 상한 (전남 40%, 대전 50%)
  premium?: Partial<Omit<RegionRate, 'premium'>> // 모범·대형이 전국 기본(PREMIUM)과 다른 지역
}

// 2026-10-04 기준 시도별 중형택시 요율. 도 지역은 시·군마다 달라 도청 소재지·대표 시 값 (실제 요율은 관할 시·군 확인)
// 출처(지자체 고시·보도자료): 서울 news.seoul.go.kr/traffic/archives/1659 · 경기(고양) goyang.go.kr · 인천 incheon.go.kr/traffic/TR010201
//   부산 busan.go.kr/nbtnewsBU/1565618(2023.6.1) · 대구 뉴스룸 aid=269959(2025.2.22) · 대전 daejeon.go.kr menuSeq=3308 + 2026.3.16 할증 개편
//   광주 gwangju.go.kr seq=20841(2025.10.22) · 울산 ulsan.go.kr(2025.3.10) · 세종 보도자료(2024.8.1, 기본거리 1.5km는 2022 보도자료)
//   강원(원주 2024.8.5) · 충남(천안, transport.chungnam.go.kr 2025.7 표) · 전북(전주 2023.8.1) · 전남(여수·나주 2023.11.1)
//   경북(구미, 128m) · 경남(창원 2026.7.1) · 제주 jeju.go.kr/traffic/bus/taxifee.htm(2024.7.1)
// 미확인(기존 값 유지): 충북 기본거리·단위·심야, 대구 시간요금·중복할증 상한, 충남 심야 시간대, 경북·강원·제주 시계외
// 예정: 전남 4,800/1.7km(2026.11~12 확정 예정), 대전 기본요금 하반기 결정, 충북 4,500~4,800 검토
export const REGION_RATES: Record<RegionKey, RegionRate> = {
  seoul:     { base: 4800, baseDist: 1600, unitDist: 131, unitFare: 100, timeUnit: 30, timeFare: 100, nightStart: 22, nightEnd: 4, deepStart: 23, deepEnd: 2, nightRate: 0.2, deepRate: 0.4, outRate: 0.2 },
  gyeonggi:  { base: 4800, baseDist: 1600, unitDist: 131, unitFare: 100, timeUnit: 30, timeFare: 100, nightStart: 23, nightEnd: 4, deepStart: null, deepEnd: null, nightRate: 0.3, deepRate: 0.3, outRate: 0.2, premium: { unitDist: 144, timeUnit: 35, outRate: 0 } },
  incheon:   { base: 4800, baseDist: 1600, unitDist: 135, unitFare: 100, timeUnit: 33, timeFare: 100, nightStart: 22, nightEnd: 4, deepStart: 23, deepEnd: 2, nightRate: 0.2, deepRate: 0.4, outRate: 0.3 },
  busan:     { base: 4800, baseDist: 2000, unitDist: 132, unitFare: 100, timeUnit: 33, timeFare: 100, nightStart: 23, nightEnd: 4, deepStart: 0, deepEnd: 2, nightRate: 0.2, deepRate: 0.3, outRate: 0.3, premium: { base: 7500, unitDist: 140, timeUnit: 33 } },
  daegu:     { base: 4500, baseDist: 1700, unitDist: 125, unitFare: 100, timeUnit: 30, timeFare: 100, nightStart: 23, nightEnd: 4, deepStart: 0, deepEnd: 2, nightRate: 0.2, deepRate: 0.3, outRate: 0.35 },
  daejeon:   { base: 4300, baseDist: 1800, unitDist: 132, unitFare: 100, timeUnit: 33, timeFare: 100, nightStart: 23, nightEnd: 4, deepStart: 0, deepEnd: 2, nightRate: 0.2, deepRate: 0.3, outRate: 0.3, comboCap: 0.5 },
  gwangju:   { base: 4800, baseDist: 1700, unitDist: 132, unitFare: 100, timeUnit: 32, timeFare: 100, nightStart: 23, nightEnd: 4, deepStart: 0, deepEnd: 2, nightRate: 0.2, deepRate: 0.3, outRate: 0.35, premium: { base: 5400, baseDist: 1700, unitDist: 149 } },
  ulsan:     { base: 4500, baseDist: 2000, unitDist: 125, unitFare: 100, timeUnit: 30, timeFare: 100, nightStart: 22, nightEnd: 4, deepStart: null, deepEnd: null, nightRate: 0.2, deepRate: 0.2, outRate: 0.3 },
  sejong:    { base: 4000, baseDist: 1500, unitDist: 97, unitFare: 100, timeUnit: 29, timeFare: 100, nightStart: 22, nightEnd: 4, deepStart: null, deepEnd: null, nightRate: 0.3, deepRate: 0.3, outRate: 0.3 },
  gangwon:   { base: 4600, baseDist: 2000, unitDist: 131, unitFare: 100, timeUnit: 31, timeFare: 100, nightStart: 23, nightEnd: 4, deepStart: 0, deepEnd: 2, nightRate: 0.2, deepRate: 0.3, outRate: 0.2 },
  chungbuk:  { base: 4000, baseDist: 2000, unitDist: 132, unitFare: 100, timeUnit: 30, timeFare: 100, nightStart: 23, nightEnd: 4, deepStart: null, deepEnd: null, nightRate: 0.2, deepRate: 0.2, outRate: 0.2 },
  chungnam:  { base: 4000, baseDist: 1400, unitDist: 110, unitFare: 100, timeUnit: 30, timeFare: 100, nightStart: 23, nightEnd: 4, deepStart: null, deepEnd: null, nightRate: 0.3, deepRate: 0.3, outRate: 0.32 },
  jeonbuk:   { base: 4300, baseDist: 2000, unitDist: 134, unitFare: 100, timeUnit: 32, timeFare: 100, nightStart: 0, nightEnd: 4, deepStart: null, deepEnd: null, nightRate: 0.2, deepRate: 0.2, outRate: 0.5 },
  jeonnam:   { base: 4300, baseDist: 2000, unitDist: 130, unitFare: 100, timeUnit: 30, timeFare: 100, nightStart: 0, nightEnd: 4, deepStart: null, deepEnd: null, nightRate: 0.2, deepRate: 0.2, outRate: 0.35, longFrom: 9000, longFare: 140, comboCap: 0.4 },
  gyeongbuk: { base: 4500, baseDist: 1700, unitDist: 128, unitFare: 100, timeUnit: 30, timeFare: 100, nightStart: 23, nightEnd: 4, deepStart: null, deepEnd: null, nightRate: 0.2, deepRate: 0.2, outRate: 0.2 },
  gyeongnam: { base: 4600, baseDist: 2000, unitDist: 128, unitFare: 100, timeUnit: 30, timeFare: 100, nightStart: 22, nightEnd: 4, deepStart: null, deepEnd: null, nightRate: 0.2, deepRate: 0.2, outRate: 0.3 },
  jeju:      { base: 4300, baseDist: 2000, unitDist: 126, unitFare: 100, timeUnit: 31, timeFare: 100, nightStart: 23, nightEnd: 4, deepStart: null, deepEnd: null, nightRate: 0.2, deepRate: 0.2, outRate: 0.2, longFrom: 20000, longFare: 120 },
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
  // 모범·대형: 중형과 같은 심야 시간대에 20% 단일 할증, 시계외 20% (서울·인천·경기·광주 고시)
  return {
    ...r, ...PREMIUM,
    deepStart: null, deepEnd: null, nightRate: 0.2, deepRate: 0.2, outRate: 0.2,
    longFrom: undefined, longFare: undefined, comboCap: undefined,
    ...r.premium,
  }
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
  const units = Math.floor(extraDist / s.unitDist)
  // ponytail: 장거리 요율은 거리요금에만 적용 (전남은 9km 초과 시간요금도 140원 — 저속 구간 비중이 작아 생략)
  const longUnits = s.longFrom != null && s.longFare != null ? Math.max(0, units - Math.floor(Math.max(0, s.longFrom - s.baseDist) / s.unitDist)) : 0
  const distanceFare = units * s.unitFare + longUnits * ((s.longFare ?? s.unitFare) - s.unitFare)
  const slowSec = Math.max(0, timeMin * 60 - (km / CRUISE_KMH) * 3600)
  const timeFare = Math.floor(slowSec / s.timeUnit) * s.timeFare
  const metered = s.base + distanceFare + timeFare
  const nightRate = nightRateFor(hour, s)
  const outRate = outOfCity ? (s.comboCap != null ? Math.max(0, Math.min(s.outRate, s.comboCap - nightRate)) : s.outRate) : 0
  const nightSurcharge = Math.floor(metered * nightRate)
  const outSurcharge = Math.floor(metered * outRate)
  const total = metered + nightSurcharge + outSurcharge
  return { base: s.base, distanceFare, timeFare, metered, nightRate, nightSurcharge, outRate, outSurcharge, total }
}

// N명이 나눠 낼 때 1인당 금액 (10원 단위 올림 — 모자라지 않게)
export const perPerson = (total: number, n: number) => Math.ceil(total / Math.max(1, n) / 10) * 10
