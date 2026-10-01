// 이사 비용 추정 (순수 함수). 금액 단위: 만원.
//
// ⚠ 공식 요금표가 아님. 이사 요금은 신고·인가제가 아니라 업체 자율이라 공공 요금표가 없다.
// 아래 표는 2025~2026년 이사 중개 플랫폼·업체 공개 견적 범위를 참고한 '시장 참고 추정'이며
// min/typ/max 범위로만 쓴다. 시세가 바뀌면 이 파일의 표만 고치면 된다.
// 검증: scripts/check-moving-cost.ts
import { solarToLunar } from './lunarCalendar.ts'
import { getKoreanHolidays } from './koreanHolidays.ts'

export type MoveType = 'truck' | 'regular' | 'semi' | 'full'
export type Access = 'elevator' | 'stairs' | 'ladder'
export type Piano = 'none' | 'upright' | 'grand'
export interface Range { min: number; typ: number; max: number }

export const MOVE_TYPES: MoveType[] = ['truck', 'regular', 'semi', 'full']
export const ACCESS: Access[] = ['elevator', 'stairs', 'ladder']

const R = (min: number, typ: number, max: number): Range => ({ min, typ, max })
const add = (...rs: Range[]): Range => rs.reduce((a, b) => R(a.min + b.min, a.typ + b.typ, a.max + b.max), R(0, 0, 0))
const mul = (a: Range, b: Range): Range => R(a.min * b.min, a.typ * b.typ, a.max * b.max)
const k = (a: Range, n: number): Range => R(a.min * n, a.typ * n, a.max * n)
const round = (a: Range): Range => R(Math.round(a.min), Math.round(a.typ), Math.round(a.max))
const ZERO = R(0, 0, 0)

// 평수 구간 → 통상 차량 규모(업계 관행: 원룸 1톤, 투룸 2.5톤, 20평대 5톤 …) + 포장이사 기본비
// (시내 20km 미만 · 엘리베이터 · 비수기 평일 기준). vf = 차량 규모 계수(2.5톤 1대 = 1)
export const SIZE_TIERS = [
  { maxPyeong: 8, ton: '1t', vf: 0.6, base: R(45, 60, 80) },
  { maxPyeong: 15, ton: '2.5t', vf: 1, base: R(80, 110, 150) },
  { maxPyeong: 25, ton: '5t', vf: 1.5, base: R(140, 180, 230) },
  { maxPyeong: 35, ton: '5t+2.5t', vf: 2, base: R(200, 250, 320) },
  { maxPyeong: 45, ton: '5t×2', vf: 2.5, base: R(280, 340, 420) },
  { maxPyeong: Infinity, ton: '5t×2+', vf: 3, base: R(350, 430, 550) },
]
const OVER_55_PER_PYEONG = R(6, 8, 10)

// 포장이사 대비 비율 (용달 = 차량+기사 운반 위주, 일반 = 포장은 본인·운반은 업체, 반포장 = 주방·가구는 업체)
export const TYPE_FACTOR: Record<MoveType, Range> = {
  truck: R(0.25, 0.3, 0.4),
  regular: R(0.45, 0.52, 0.6),
  semi: R(0.65, 0.72, 0.8),
  full: R(1, 1, 1),
}

// 거리 추가비 (2.5톤 1대 기준, vf 곱함)
const DISTANCE: { maxKm: number; r: Range }[] = [
  { maxKm: 20, r: ZERO },
  { maxKm: 50, r: R(8, 12, 18) },
  { maxKm: 100, r: R(15, 22, 32) },
  { maxKm: 200, r: R(28, 40, 55) },
  { maxKm: 300, r: R(40, 55, 75) },
  { maxKm: Infinity, r: R(55, 75, 100) },
]
const STAIRS_PER_FLOOR = R(2, 3, 5) // 3층부터 층당 (vf 곱함)
const LADDER: { maxFloor: number; r: Range }[] = [ // 한쪽(출발 또는 도착) 1회
  { maxFloor: 5, r: R(10, 13, 16) },
  { maxFloor: 10, r: R(15, 20, 25) },
  { maxFloor: 15, r: R(22, 28, 35) },
  { maxFloor: Infinity, r: R(28, 35, 45) },
]
const PIANO: Record<Piano, Range> = { none: ZERO, upright: R(10, 15, 20), grand: R(25, 35, 50) }
const STORAGE_HANDLING = R(0.3, 0.4, 0.5) // 보관이사: 보관창고 상하차 1회 추가 (기본비 대비)
const STORAGE_PER_DAY = R(0.8, 1, 1.5) // 보관료 (vf 곱함)
const AC_PER_UNIT = R(12, 18, 25) // 벽걸이 이전설치(탈착+설치, 기본 배관). 스탠드·2in1은 더 비쌈
const CLEAN_PER_PYEONG = R(1.2, 1.5, 2) // 입주청소
const CLEAN_MIN = R(12, 15, 20)
const WASTE_PER_ITEM = R(0.5, 1, 2) // 대형폐기물 배출 수수료 (지자체·품목별 상이)

// 수요 할증 (이사 업체 비용 부분에만 곱함)
const PEAK = R(0.1, 0.2, 0.3) // 3·9월 (봄·가을 이사철 정점)
const SHOULDER = R(0.05, 0.1, 0.15) // 2·4·10월
const WEEKEND = R(0.05, 0.1, 0.2) // 토·일·공휴일
const SON = R(0.05, 0.1, 0.2) // 손없는날
const MONTH_END = R(0, 0.05, 0.1) // 말일 포함 마지막 3일 (잔금·계약 만료 몰림)

export function sizeTier(pyeong: number) {
  const i = SIZE_TIERS.findIndex(s => pyeong <= s.maxPyeong)
  const tier = SIZE_TIERS[i]
  const base = pyeong > 55 ? add(tier.base, k(OVER_55_PER_PYEONG, pyeong - 55)) : tier.base
  return { idx: i, ton: tier.ton, vf: tier.vf, base }
}

/** 음력 끝자리 9·0일(9·10·19·20·29·30일) = 손없는날 */
export function isSonEomneun(lunarDay: number): boolean {
  return lunarDay % 10 === 9 || lunarDay % 10 === 0
}

export interface DayInfo {
  date: string
  day: number
  dow: number // 0=일
  lunar: { month: number; day: number; isLeap: boolean } | null
  son: boolean
  weekend: boolean
  holiday: string | null
  monthEnd: boolean
  season: 'peak' | 'shoulder' | 'off'
  factor: Range // 수요 할증 계수 (1 = 할증 없음)
}

const pad = (n: number) => String(n).padStart(2, '0')
export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

export function dayInfo(date: string): DayInfo | null {
  const [y, m, d] = date.split('-').map(Number)
  if (!y || !m || !d) return null
  const utc = new Date(Date.UTC(y, m - 1, d))
  if (utc.getUTCMonth() !== m - 1) return null
  const dow = utc.getUTCDay()
  const lunar = solarToLunar(y, m, d)
  const son = !!lunar && isSonEomneun(lunar.day)
  const h = getKoreanHolidays(y).find(x => x.date === date)
  const holiday = h ? h.nameKey : null
  const weekend = dow === 0 || dow === 6 || !!holiday
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const monthEnd = d > last - 3
  const season = m === 3 || m === 9 ? 'peak' : m === 2 || m === 4 || m === 10 ? 'shoulder' : 'off'
  let factor = R(1, 1, 1)
  const bump = (p: Range) => { factor = mul(factor, add(R(1, 1, 1), p)) }
  if (season === 'peak') bump(PEAK)
  if (season === 'shoulder') bump(SHOULDER)
  if (weekend) bump(WEEKEND)
  if (son) bump(SON)
  if (monthEnd) bump(MONTH_END)
  return {
    date, day: d, dow,
    lunar: lunar ? { month: lunar.month, day: lunar.day, isLeap: lunar.isLeap } : null,
    son, weekend, holiday, monthEnd, season, factor,
  }
}

/** 해당 월의 모든 날 (달력용) */
export function monthDays(year: number, month: number): DayInfo[] {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const out: DayInfo[] = []
  for (let d = 1; d <= last; d++) out.push(dayInfo(`${year}-${pad(month)}-${pad(d)}`)!)
  return out
}

export interface Side { floor: number; access: Access }
export interface MoveInput {
  pyeong: number
  type: MoveType
  km: number
  from: Side
  to: Side
  storageDays: number
  ac: number
  piano: Piano
  clean: boolean
  waste: number
  date?: string
}

export type LineKey = 'base' | 'storage' | 'distance' | 'access' | 'premium' | 'piano' | 'ac' | 'clean' | 'waste'

function sideCost(s: Side, vf: number): Range {
  if (s.access === 'ladder') return LADDER.find(l => s.floor <= l.maxFloor)!.r
  if (s.access === 'stairs' && s.floor > 2) return k(STAIRS_PER_FLOOR, (s.floor - 2) * vf)
  return ZERO
}

export function estimate(inp: MoveInput) {
  const tier = sizeTier(inp.pyeong)
  const vf = tier.vf
  const base = mul(tier.base, TYPE_FACTOR[inp.type])
  const storage = inp.storageDays > 0
    ? add(mul(base, STORAGE_HANDLING), k(STORAGE_PER_DAY, inp.storageDays * vf))
    : ZERO
  const distance = k(DISTANCE.find(x => inp.km < x.maxKm)!.r, vf)
  const access = add(sideCost(inp.from, vf), sideCost(inp.to, vf))
  const moving = add(base, storage, distance, access)
  const day = inp.date ? dayInfo(inp.date) : null
  const factor = day?.factor ?? R(1, 1, 1)
  const premium = add(mul(moving, factor), k(moving, -1))
  const piano = PIANO[inp.piano]
  const ac = k(AC_PER_UNIT, inp.ac)
  const cleanRaw = k(CLEAN_PER_PYEONG, inp.pyeong)
  const clean = inp.clean ? R(Math.max(cleanRaw.min, CLEAN_MIN.min), Math.max(cleanRaw.typ, CLEAN_MIN.typ), Math.max(cleanRaw.max, CLEAN_MIN.max)) : ZERO
  const waste = k(WASTE_PER_ITEM, inp.waste)

  const lines: { key: LineKey; group: 'mover' | 'extra'; r: Range }[] = (
    [
      ['base', 'mover', base], ['storage', 'mover', storage], ['distance', 'mover', distance],
      ['access', 'mover', access], ['premium', 'mover', premium], ['piano', 'mover', piano],
      ['ac', 'extra', ac], ['clean', 'extra', clean], ['waste', 'extra', waste],
    ] as const
  ).map(([key, group, r]) => ({ key, group, r: round(r) }))

  const mover = round(add(moving, premium, piano))
  const extra = round(add(ac, clean, waste))
  const total = add(mover, extra)

  const warnings: string[] = []
  if (inp.type === 'truck' && inp.pyeong > 15) warnings.push('truckLarge')
  if ([inp.from, inp.to].some(s => s.access === 'stairs' && s.floor >= 5)) warnings.push('stairsHigh')
  if ([inp.from, inp.to].some(s => s.access === 'ladder' && s.floor > 20)) warnings.push('ladderHigh')

  return { ton: tier.ton, tierIdx: tier.idx, lines, mover, extra, total, day, warnings }
}

/** 업체 견적 비교 (0·빈칸 제외) */
export function quoteStats(quotes: number[]) {
  const q = quotes.filter(n => Number.isFinite(n) && n > 0)
  if (!q.length) return null
  const min = Math.min(...q)
  const max = Math.max(...q)
  const avg = Math.round(q.reduce((a, b) => a + b, 0) / q.length)
  return { count: q.length, min, max, avg, minIdx: quotes.indexOf(min) }
}

/** 체크리스트 단계 = 이사일 기준 오프셋 (ko.json checklist.phases 순서와 같아야 함) */
export const CHECKLIST_OFFSETS = [-30, -14, -7, -1, 0, 14]
