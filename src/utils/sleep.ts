// 수면 계산기 순수 로직. 시각은 "자정 기준 분"(0~1439), 날짜 넘김은 day 오프셋으로 표현.

export const DAY = 1440
export const CYCLE = { def: 90, min: 80, max: 110 } // 평균 약 90분, 개인·주기별 편차 큼
export const LATENCY = { def: 15, min: 0, max: 60 } // 정상 입면 잠복기 10~20분

/** 권장 수면 시간(시간). NSF 2015 (Hirshkowitz et al., Sleep Health 1:40-43) */
export const AGES = {
  newborn: [14, 17], infant: [12, 15], toddler: [11, 14], preschool: [10, 13],
  school: [9, 11], teen: [8, 10], adult: [7, 9], senior: [7, 8],
} as const
export type AgeKey = keyof typeof AGES
/** 계산 대상(주기 계산이 의미 있는 연령) */
export const AGE_SELECT: AgeKey[] = ['school', 'teen', 'adult', 'senior']

export const CAFFEINE_CUTOFF_H = 6 // Drake et al. 2013, J Clin Sleep Med 9(11):1195

const mod = (m: number) => ((m % DAY) + DAY) % DAY
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export function parseHM(s: string | null | undefined): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s ?? '')
  if (!m) return null
  const h = +m[1], mi = +m[2]
  return h < 24 && mi < 60 ? h * 60 + mi : null
}

export function fmtHM(min: number): string {
  const m = mod(Math.round(min))
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/** 12시간제: { pm, hm } (0시 → 12:xx AM) */
export function fmt12(min: number): { pm: boolean; hm: string } {
  const m = mod(Math.round(min))
  const h = Math.floor(m / 60)
  return { pm: h >= 12, hm: `${h % 12 === 0 ? 12 : h % 12}:${String(m % 60).padStart(2, '0')}` }
}

export interface Opt {
  cycles: number
  sleepMin: number // 실제 수면(주기 × 길이)
  time: number     // 결과 시각 (0~1439)
  day: number      // 기준 시각 대비 날짜 오프셋 (취침: 0 또는 -1, 기상: 0 또는 +1…)
  inRange: boolean // 연령 권장 범위 이내
  short: boolean   // 권장 최소 미달
}

/** 보여줄 주기 수: 3 ~ max(6, 권장 최대 시간에 들어가는 주기 수), 최대 8 */
export function cycleList(age: AgeKey, cycle: number): number[] {
  const hi = Math.min(8, Math.max(6, Math.floor((AGES[age][1] * 60) / cycle)))
  const out: number[] = []
  for (let c = hi; c >= 3; c--) out.push(c)
  return out
}

function mk(cycles: number, cycle: number, abs: number, age: AgeKey): Opt {
  const sleepMin = cycles * cycle
  const [lo, hi] = AGES[age]
  return {
    cycles, sleepMin, time: mod(abs), day: Math.floor(abs / DAY),
    inRange: sleepMin >= lo * 60 && sleepMin <= hi * 60, short: sleepMin < lo * 60,
  }
}

/** 기상 시각 → 취침 시각들 (잠드는 시간만큼 먼저 누워야 함) */
export function bedtimes(wake: number, cycle: number, latency: number, age: AgeKey): Opt[] {
  return cycleList(age, cycle).map((c) => mk(c, cycle, wake - c * cycle - latency, age))
}

/** 취침 시각 → 기상 시각들 */
export function wakeTimes(bed: number, cycle: number, latency: number, age: AgeKey): Opt[] {
  return cycleList(age, cycle).map((c) => mk(c, cycle, bed + latency + c * cycle, age))
}

/** 낮잠: 10·20분(깊은 잠 전), 1주기. 누운 시각 기준 기상 시각 */
export function naps(start: number, cycle: number, latency: number) {
  return [10, 20, cycle].map((len) => {
    const abs = start + latency + len
    return { len, time: mod(abs), day: Math.floor(abs / DAY), full: len === cycle }
  })
}

/** 기상 모드: 다음 기상(now 이후 가장 가까운 wake) 기준으로 이 취침 시각이 이미 지났는가 */
export function isPast(now: number, wake: number, opt: Opt, latency: number): boolean {
  const wakeAbs = wake > now ? wake : wake + DAY
  const bedAbs = wakeAbs - opt.sleepMin - latency
  return bedAbs < now
}

/** 수면 부채: 목표 대비 부족 합(과수면은 상계하지 않음), 입력된 날만 */
export function sleepDebt(hours: (number | null)[], target: number) {
  const vals = hours.filter((h): h is number => h != null && h >= 0)
  const deficit = vals.reduce((s, h) => s + Math.max(0, target - h), 0)
  const avg = vals.length ? vals.reduce((s, h) => s + h, 0) / vals.length : 0
  return { days: vals.length, deficit, avg }
}

export const caffeineCutoff = (bed: number) => mod(bed - CAFFEINE_CUTOFF_H * 60)
