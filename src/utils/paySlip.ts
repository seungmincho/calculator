/**
 * 급여명세서(임금명세서) 계산 (PaySlip). 회귀 체크: node scripts/check-pay-slip.ts
 *
 * 근거: 근로기준법 제48조②·시행령 제27조의2(기재사항: 항목별 금액·계산방법·연장/야간/휴일 시간수·공제내역),
 *       제56조(연장·야간·휴일 50% 가산, 휴일 8시간 초과 100%), 시행령 제7조 별표1(상시 4명 이하 제56조 미적용),
 *       소득세법 시행령 제17조의2(식대 월 20만원)·제12조3호(자가운전보조금 월 20만원), 소득세법 제12조3호러목(출산·보육수당 월 20만원),
 *       소득세 = 근로소득 간이세액표(wageTaxTable.ts), 최저임금 2026 시간급 10,320원(월 209시간 2,156,880원), 4대보험 요율은 insuranceRates.ts
 */
import { MIN_WAGE_2026 } from './workHours.ts'
import { monthlyDeduction } from './weeklyHolidayPay.ts'
import { withholding33 } from './salesCommission.ts'
import { wageTax } from './wageTaxTable.ts'
import { INSURANCE, pct } from './insuranceRates.ts'

export { MIN_WAGE_2026 }

export type RowType = 'meal' | 'car' | 'child' | 'bonus' | 'other'
export const ROW_TYPES: RowType[] = ['meal', 'car', 'child', 'bonus', 'other']
/** 비과세 월 한도 (같은 종류 여러 행이면 합산 한도) */
export const TAX_FREE_LIMIT: Partial<Record<RowType, number>> = { meal: 200_000, car: 200_000, child: 200_000 }

export interface PayRow {
  type: RowType
  name: string
  amount: number
  taxFree: boolean
  method: string
}

export type DedKey = 'pension' | 'health' | 'care' | 'employment' | 'incomeTax' | 'localTax'
export const DED_KEYS: DedKey[] = ['pension', 'health', 'care', 'employment', 'incomeTax', 'localTax']

export interface PayInput {
  mode: 'ins' | 'biz' // 4대보험 근로자 / 3.3% 사업소득
  small: boolean // 상시 5인 미만 → 가산수당 미적용
  wageType: 'monthly' | 'hourly'
  base: number // 월 기본급 또는 시급
  workHours: number // 시급제: 이번 달 근로시간
  holidayHours: number // 시급제: 이번 달 유급 주휴시간
  monthHours: number // 월급제: 통상시급 산정 기준시간 (주 40시간 = 209)
  ordinary: number // 통상시급 직접 입력 (0 = 자동)
  ot: number // 연장 시간
  night: number // 야간 시간 (22~06)
  hol: number // 휴일 8시간 이내
  hol8: number // 휴일 8시간 초과분
  rows: PayRow[]
  dependents: number // 공제대상가족 (본인 포함)
  children: number // 8~20세 자녀
  taxPct: number // 간이세액 80 / 100 / 120 %
  insBase: number // 4대보험 보수월액 직접 입력 (0 = 자동)
  ded: Record<DedKey, number | null> // null = 자동
  extraDeds: { name: string; amount: number }[]
}

export interface Line {
  key: string
  name: string
  amount: number
  taxFree: number // 이 중 비과세 금액
  method: string
  manual?: boolean
}

const floor10 = (n: number) => Math.floor(n / 10 + 1e-9) * 10
export const fmt = (n: number) => Math.round(n).toLocaleString('ko-KR')
const hrs = (n: number) => String(Math.round(n * 100) / 100)

export const ROW_NAME: Record<RowType, string> = { meal: '식대', car: '자가운전보조금', child: '출산·보육수당', bonus: '상여금', other: '기타수당' }

export function ordinaryHourly(i: PayInput): number {
  if (i.ordinary > 0) return i.ordinary
  if (i.wageType === 'hourly') return i.base
  return i.monthHours > 0 ? Math.round(i.base / i.monthHours) : 0
}

/** 가산 배율: 5인 미만은 연장·휴일 1배(실근로분만), 야간 가산 없음 */
export const premiums = (small: boolean) =>
  small ? { ot: 1, night: 0, hol: 1, hol8: 1 } : { ot: 1.5, night: 0.5, hol: 1.5, hol8: 2 }

export function computePay(i: PayInput) {
  const biz = i.mode === 'biz'
  const h = ordinaryHourly(i)
  const r = premiums(i.small)
  const pay: Line[] = []
  const add = (key: string, name: string, amount: number, method: string) => {
    if (amount > 0) pay.push({ key, name, amount, taxFree: 0, method })
  }

  if (i.wageType === 'hourly') {
    add('base', '기본급', Math.floor(i.base * i.workHours), `시급 ${fmt(i.base)}원 × ${hrs(i.workHours)}시간`)
    add('weekly', '주휴수당', Math.floor(i.base * i.holidayHours), `시급 ${fmt(i.base)}원 × 주휴 ${hrs(i.holidayHours)}시간`)
  } else {
    add('base', '기본급', i.base, i.ordinary > 0 ? `월 정액 (통상시급 ${fmt(h)}원)` : `월 정액 (통상시급 ${fmt(h)}원 = 기본급 ÷ ${hrs(i.monthHours)}시간)`)
  }
  const note = i.small ? ' (5인 미만, 가산 미적용)' : ''
  const prem = (key: string, name: string, label: string, hours: number, rate: number) =>
    hours > 0 && rate > 0 && add(key, name, Math.floor(h * hours * rate), `통상시급 ${fmt(h)}원 × ${label} ${hrs(hours)}시간 × ${rate}${note}`)
  prem('ot', '연장근로수당', '연장', i.ot, r.ot)
  prem('night', '야간근로수당', '야간', i.night, r.night)
  prem('hol', '휴일근로수당', '휴일', i.hol, r.hol)
  prem('hol8', '휴일근로수당(8시간 초과)', '휴일 8시간 초과', i.hol8, r.hol8)

  // 수당·상여 행: 비과세는 종류별 한도까지, 넘는 부분은 과세
  const left: Partial<Record<RowType, number>> = { ...TAX_FREE_LIMIT }
  const excess: { name: string; limit: number; excess: number }[] = []
  i.rows.forEach((row, idx) => {
    if (!(row.amount > 0)) return
    const name = row.name.trim() || ROW_NAME[row.type]
    let taxFree = 0
    if (row.taxFree && !biz) {
      const lim = left[row.type]
      taxFree = lim === undefined ? row.amount : Math.min(row.amount, lim)
      if (lim !== undefined) {
        left[row.type] = lim - taxFree
        if (row.amount > taxFree) excess.push({ name, limit: TAX_FREE_LIMIT[row.type]!, excess: row.amount - taxFree })
      }
    }
    pay.push({ key: `row${idx}`, name, amount: row.amount, taxFree, method: row.method.trim() })
  })

  const gross = pay.reduce((s, l) => s + l.amount, 0)
  const taxFree = pay.reduce((s, l) => s + l.taxFree, 0)
  const taxable = gross - taxFree

  // 4대보험 보수월액: 기본급·주휴 + 고정 수당(상여 제외)의 과세분. 연장·야간·휴일·상여는 고용보험에만 반영
  const regular = pay
    .filter((l) => l.key === 'base' || l.key === 'weekly' || (l.key.startsWith('row') && i.rows[Number(l.key.slice(3))].type !== 'bonus'))
    .reduce((s, l) => s + l.amount - l.taxFree, 0)
  const insBase = i.insBase > 0 ? i.insBase : regular
  const pensionBase = Math.min(INSURANCE.pensionMonthlyCap, Math.max(INSURANCE.pensionMonthlyFloor, insBase))
  const pensionClamp: 'floor' | 'cap' | null =
    biz || insBase <= 0 ? null : insBase < INSURANCE.pensionMonthlyFloor ? 'floor' : insBase > INSURANCE.pensionMonthlyCap ? 'cap' : null

  const auto: Record<DedKey, number> = { pension: 0, health: 0, care: 0, employment: 0, incomeTax: 0, localTax: 0 }
  const method: Record<DedKey, string> = { pension: '', health: '', care: '', employment: '', incomeTax: '', localTax: '' }
  if (biz) {
    const w = withholding33(gross)
    auto.incomeTax = w.incomeTax
    auto.localTax = w.localTax
    method.incomeTax = `지급액 ${fmt(gross)}원 × 3%`
    method.localTax = '사업소득세 × 10%'
  } else {
    const d = insBase > 0 ? monthlyDeduction(insBase, 'ins') : { pension: 0, health: 0, care: 0 }
    auto.pension = d.pension
    auto.health = d.health
    auto.care = d.care
    auto.employment = monthlyDeduction(taxable, 'ins').employment
    auto.incomeTax = wageTax(taxable, i.dependents, i.children, i.taxPct)
    auto.localTax = floor10(auto.incomeTax * 0.1)
    method.pension = `기준소득월액 ${fmt(pensionBase)}원 × ${pct(INSURANCE.pensionRate)}`
    method.health = `보수월액 ${fmt(insBase)}원 × ${pct(INSURANCE.healthRate)}`
    method.care = `건강보험료 × ${pct(INSURANCE.longTermCareRate)}`
    method.employment = `과세 임금 ${fmt(taxable)}원 × ${pct(INSURANCE.employmentRate)}`
    method.incomeTax = `근로소득 간이세액표 (공제대상가족 ${i.dependents}명${i.children > 0 ? `, 8~20세 자녀 ${i.children}명` : ''}${i.taxPct !== 100 ? `, ${i.taxPct}%` : ''})`
    method.localTax = '소득세 × 10%'
  }

  const DED_NAME: Record<DedKey, string> = {
    pension: '국민연금',
    health: '건강보험',
    care: '장기요양보험',
    employment: '고용보험',
    incomeTax: biz ? '사업소득세' : '소득세',
    localTax: '지방소득세',
  }
  const keys: DedKey[] = biz ? ['incomeTax', 'localTax'] : DED_KEYS
  const ded: Line[] = []
  for (const k of keys) {
    const manual = i.ded[k] !== null && i.ded[k] !== undefined
    const amount = manual ? (i.ded[k] as number) : auto[k]
    if (amount > 0) ded.push({ key: k, name: DED_NAME[k], amount, taxFree: 0, method: manual ? '직접 입력' : method[k], manual })
  }
  i.extraDeds.forEach((d, idx) => {
    if (d.amount > 0) ded.push({ key: `ded${idx}`, name: d.name.trim() || '기타공제', amount: d.amount, taxFree: 0, method: '' })
  })
  const totalDed = ded.reduce((s, l) => s + l.amount, 0)

  // 최저임금: 시급제는 시급, 월급제는 (기본급 + 매월 지급 수당 — 상여·자가운전보조금 제외) ÷ 기준시간
  const forMin = i.wageType === 'hourly' ? i.base : i.base + i.rows.filter((x) => x.type !== 'bonus' && x.type !== 'car').reduce((s, x) => s + (x.amount || 0), 0)
  const minHourly = i.wageType === 'hourly' ? i.base : i.monthHours > 0 ? forMin / i.monthHours : 0
  const required = i.wageType === 'hourly' ? MIN_WAGE_2026 : MIN_WAGE_2026 * i.monthHours
  const minWage = { hourly: Math.floor(minHourly), ok: minHourly >= MIN_WAGE_2026, required, shortfall: Math.max(0, Math.ceil(required - forMin)) }

  const missingMethod = i.rows.filter((x) => x.amount > 0 && !x.method.trim()).map((x) => x.name.trim() || ROW_NAME[x.type])

  return { ordinary: h, pay, ded, gross, taxFree, taxable, insBase, auto, totalDed, net: gross - totalDed, excess, pensionClamp, minWage, missingMethod }
}

export type PayResult = ReturnType<typeof computePay>
