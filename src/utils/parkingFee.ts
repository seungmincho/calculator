/**
 * 주차 요금 계산 (순수 함수). 회귀 체크: node scripts/check-parking-fee.ts
 *
 * 모델: 기본시간/기본요금 + 추가 단위/요금, 일 최대(입차 기준 24시간마다),
 * 회차(이 시간 이내 출차 시 전액 무료), 무료시간(+ 구매 금액별 무료), 야간·주말 할인율, 차량 할인율.
 * 순서: 회차 → 무료시간 차감 → 단위별 요금(야간·주말 할인) → 24시간별 일 최대 → 차량 할인 → 10원 미만 절사
 */

export interface ReceiptTier { amount: number; min: number }

export interface FeeRule {
  baseMin: number      // 기본 시간 (0이면 기본 구간 없음)
  baseFee: number      // 기본 요금
  unitMin: number      // 추가 단위 (분)
  unitFee: number      // 추가 단위 요금
  dailyMax: number     // 일 최대 (0 = 없음)
  graceMin: number     // 회차 시간: 총 주차 시간이 이 이하면 0원
  freeMin: number      // 기본 무료 시간 (앞에서 차감)
  tiers: ReceiptTier[] // 구매 금액별 추가 무료 시간 (가장 큰 해당 구간 1개)
  spend: number        // 구매 금액
  nightStart: number   // 야간 시작 시 (0~23)
  nightEnd: number     // 야간 종료 시 (0~23)
  nightPct: number     // 야간 할인율 % (0 = 야간 요율 없음, 100 = 무료)
  weekendPct: number   // 주말(토·일) 할인율 %
}

/** 입차 시점: 요일(0=일) + 자정부터 분 */
export interface Start { dow: number; mod: number }

export interface FeeResult {
  total: number        // 총 주차 시간(분)
  free: number         // 적용된 무료 시간(분)
  charged: number      // 과금 시간(분)
  grace: boolean       // 회차로 무료
  baseFee: number      // 기본 구간 요금(야간·주말 할인 반영)
  extraUnits: number   // 추가 단위 개수
  extraFee: number     // 추가 요금(야간·주말 할인 반영)
  timeSaving: number   // 야간·주말 할인액
  capSaving: number    // 일 최대로 줄어든 금액
  capDays: number      // 일 최대가 적용된 날 수
  discount: number     // 차량 할인액
  fee: number          // 최종 요금
}

const clamp = (n: number, lo: number, hi = Infinity) => Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : lo))

export function effectiveFree(r: FeeRule): number {
  const tier = r.tiers.filter((x) => x.amount > 0 && r.spend >= x.amount).reduce((m, x) => Math.max(m, x.min), 0)
  return clamp(r.freeMin, 0) + clamp(tier, 0)
}

/** 입차 후 offset분 시점의 야간·주말 할인율(%) — 둘 다 해당하면 큰 쪽 */
export function timePct(r: FeeRule, start: Start, offset: number): number {
  const abs = start.mod + offset
  const day = (((start.dow + Math.floor(abs / 1440)) % 7) + 7) % 7
  const tod = ((abs % 1440) + 1440) % 1440
  const s = r.nightStart * 60, e = r.nightEnd * 60
  const night = r.nightPct > 0 && s !== e && (s < e ? tod >= s && tod < e : tod >= s || tod < e)
  const weekend = r.weekendPct > 0 && (day === 0 || day === 6)
  return clamp(Math.max(night ? r.nightPct : 0, weekend ? r.weekendPct : 0), 0, 100)
}

export function calcFee(r: FeeRule, totalMin: number, start: Start, discountPct = 0): FeeResult {
  const total = Math.max(0, Math.round(totalMin))
  const free = effectiveFree(r)
  const zero: FeeResult = { total, free: Math.min(free, total), charged: 0, grace: false, baseFee: 0, extraUnits: 0, extraFee: 0, timeSaving: 0, capSaving: 0, capDays: 0, discount: 0, fee: 0 }
  if (total === 0) return zero
  if (total <= clamp(r.graceMin, 0)) return { ...zero, grace: true }
  const charged = Math.max(0, total - free)
  if (charged === 0) return zero

  const baseMin = clamp(r.baseMin, 0), unitMin = clamp(r.unitMin, 1)
  const perDay = new Map<number, number>()
  let baseFee = 0, extraFee = 0, extraUnits = 0, timeSaving = 0
  const add = (offset: number, fee: number, isBase: boolean) => {
    const f = fee * (1 - timePct(r, start, offset) / 100)
    timeSaving += fee - f
    if (isBase) baseFee += f; else { extraFee += f; extraUnits++ }
    const d = Math.floor(offset / 1440)
    perDay.set(d, (perDay.get(d) ?? 0) + f)
  }
  if (baseMin > 0) add(free, clamp(r.baseFee, 0), true)
  const extraMin = Math.max(0, charged - baseMin)
  const units = Math.ceil(extraMin / unitMin)
  for (let i = 0; i < units; i++) add(free + baseMin + i * unitMin, clamp(r.unitFee, 0), false)

  let raw = 0, capped = 0, capDays = 0
  for (const v of perDay.values()) {
    raw += v
    if (r.dailyMax > 0 && v > r.dailyMax) { capped += r.dailyMax; capDays++ } else capped += v
  }
  const disc = clamp(discountPct, 0, 100)
  const fee = Math.floor(Math.round(capped * (100 - disc)) / 1000) * 10
  return {
    total, free, charged, grace: false,
    baseFee: Math.round(baseFee), extraUnits, extraFee: Math.round(extraFee), timeSaving: Math.round(timeSaving),
    capSaving: Math.round(raw - capped), capDays, discount: Math.round(capped - fee), fee,
  }
}

/** 지금(total분)보다 요금이 처음 오르는 시점: { after: 몇 분 뒤, fee } — 7일 안에 없으면 null */
export function nextIncrease(r: FeeRule, totalMin: number, start: Start, discountPct = 0): { after: number; fee: number } | null {
  const total = Math.max(0, Math.round(totalMin))
  const now = calcFee(r, total, start, discountPct).fee
  const free = effectiveFree(r), baseMin = clamp(r.baseMin, 0), unitMin = clamp(r.unitMin, 1)
  // 요금은 과금 시간이 (기본 경계 또는 단위 경계)를 1분 넘는 순간, 또는 회차/무료 경계 직후에만 바뀐다
  const firstCharge = Math.max(clamp(r.graceMin, 0), free) + 1
  let m = total + 1
  for (let guard = 0; guard < 5000 && m <= total + 7 * 1440; guard++) {
    if (m < firstCharge) m = firstCharge
    const fee = calcFee(r, m, start, discountPct).fee
    if (fee > now) return { after: m - total, fee }
    const c = m - free // 과금 시간
    m = c <= baseMin ? free + baseMin + 1 : free + baseMin + Math.ceil((c - baseMin) / unitMin) * unitMin + 1
    if (m <= total) m = total + 1
  }
  return null
}

/** 누적표: 기본시간·1시간 간격 지점마다 요금 (마지막은 실제 주차 시간) */
export function timeline(r: FeeRule, totalMin: number, start: Start, discountPct = 0): { min: number; fee: number }[] {
  const total = Math.max(0, Math.round(totalMin))
  const step = total <= 180 ? 30 : total <= 720 ? 60 : total <= 2880 ? 180 : 720
  const marks = new Set<number>()
  for (let m = step; m < total; m += step) marks.add(m)
  if (r.baseMin > 0 && r.baseMin < total) marks.add(r.baseMin)
  marks.add(total)
  return [...marks].sort((a, b) => a - b).map((min) => ({ min, fee: calcFee(r, min, start, discountPct).fee }))
}

/** 'YYYY-MM-DDTHH:mm' → 입차 시점 (로컬 시각 그대로, Date 파싱 없이) */
export function parseLocal(s: string): { start: Start; epochMin: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(s)
  if (!m) return null
  const [y, mo, d, h, mi] = m.slice(1).map(Number)
  const days = Math.floor(Date.UTC(y, mo - 1, d) / 86400000)
  if (!Number.isFinite(days) || h > 23 || mi > 59) return null
  return { start: { dow: (((days + 4) % 7) + 7) % 7, mod: h * 60 + mi }, epochMin: days * 1440 + h * 60 + mi }
}

/** 두 시각 사이 분 (출차가 입차보다 이르면 null) */
export function minutesBetween(a: string, b: string): number | null {
  const x = parseLocal(a), y = parseLocal(b)
  if (!x || !y || y.epochMin <= x.epochMin) return null
  return y.epochMin - x.epochMin
}

/** 입차 시점 + offset분의 시각 'HH:mm' (+일수) */
export function clockAt(start: Start, offset: number): { hhmm: string; plusDays: number } {
  const abs = start.mod + offset
  const tod = ((abs % 1440) + 1440) % 1440
  return { hhmm: `${String(Math.floor(tod / 60)).padStart(2, '0')}:${String(tod % 60).padStart(2, '0')}`, plusDays: Math.floor(abs / 1440) }
}

const NO_TIME = { nightStart: 22, nightEnd: 8, nightPct: 0, weekendPct: 0 }
const NONE = { dailyMax: 0, graceMin: 0, freeMin: 0, tiers: [] as ReceiptTier[], spend: 0 }

/**
 * 프리셋. seoul1~3: 서울시 공영주차장 급지별 5분 요금(서울시 교통정보 '서울시 공영주차장 현황', 2026-07-30 기준).
 * 개별 주차장은 급지 요금 × 공시지가 변수라 실제와 다를 수 있음. 나머지는 '예시'.
 */
export const PRESETS = {
  seoul1: { baseMin: 5, baseFee: 500, unitMin: 5, unitFee: 500, ...NONE, ...NO_TIME },
  seoul2: { baseMin: 5, baseFee: 250, unitMin: 5, unitFee: 250, ...NONE, ...NO_TIME },
  seoul3: { baseMin: 5, baseFee: 150, unitMin: 5, unitFee: 150, ...NONE, ...NO_TIME },
  private: { baseMin: 30, baseFee: 3000, unitMin: 10, unitFee: 1000, ...NONE, dailyMax: 30000, graceMin: 10, ...NO_TIME },
  mart: { baseMin: 10, baseFee: 1000, unitMin: 10, unitFee: 1000, ...NONE, graceMin: 10, tiers: [{ amount: 20000, min: 60 }, { amount: 50000, min: 120 }], spend: 30000, ...NO_TIME },
  office: { baseMin: 30, baseFee: 2000, unitMin: 10, unitFee: 500, ...NONE, dailyMax: 20000, graceMin: 10, nightStart: 19, nightEnd: 8, nightPct: 50, weekendPct: 50 },
} satisfies Record<string, FeeRule>

export type PresetKey = keyof typeof PRESETS
export const SEOUL_SOURCE = 'https://news.seoul.go.kr/traffic/?p=26877'

// ── URL 직렬화: 숫자 13개 + 영수증 구간 3쌍, '_' 구분 ──
const KEYS = ['baseMin', 'baseFee', 'unitMin', 'unitFee', 'dailyMax', 'graceMin', 'freeMin', 'spend', 'nightStart', 'nightEnd', 'nightPct', 'weekendPct'] as const

export function encodeRule(r: FeeRule): string {
  const t = [0, 1, 2].flatMap((i) => [r.tiers[i]?.amount ?? 0, r.tiers[i]?.min ?? 0])
  return [...KEYS.map((k) => r[k]), ...t].map((n) => Math.round(n)).join('_')
}

export function decodeRule(s: string | null): FeeRule | null {
  if (!s) return null
  const n = s.split('_').map(Number)
  if (n.length !== KEYS.length + 6 || n.some((x) => !Number.isFinite(x) || x < 0)) return null
  const r = Object.fromEntries(KEYS.map((k, i) => [k, n[i]])) as Omit<FeeRule, 'tiers'>
  const tiers: ReceiptTier[] = []
  for (let i = 0; i < 3; i++) { const a = n[KEYS.length + i * 2], m = n[KEYS.length + i * 2 + 1]; if (a > 0 || m > 0) tiers.push({ amount: a, min: m }) }
  return { ...r, unitMin: Math.max(1, r.unitMin), nightStart: r.nightStart % 24, nightEnd: r.nightEnd % 24, nightPct: Math.min(100, r.nightPct), weekendPct: Math.min(100, r.weekendPct), tiers }
}
