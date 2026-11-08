// 자녀세액공제 계산기(/child-tax-credit) 전용 로직. 공제액·세금은 yearEndTax.ts(연말정산 계산기와 같은 함수)로 계산.
// 회귀 체크: node scripts/check-child-tax-credit.ts
// 근거 (2026-11-08 casenote.kr 조문, law.go.kr 개정문 확인):
//   소득세법 §59의2① 기본공제 대상 자녀(입양자·위탁아동 포함)·손자녀로서 13세 이상: 1명 25만, 2명 55만, 3명부터 55만 + 2명 초과 1명당 40만
//   §59의2③ 그해 출산·입양 신고한 공제대상자녀(손자녀는 없음): 첫째 30만, 둘째 50만, 셋째 이상 70만
//   부칙(법률 제21548호, 2026.4.21) §2 ① 8세→13세 개정은 2026 과세기간분부터 ② 2026·2027·2028·2029년분은 9·10·11·12세 이상
//     ③ 2017년 출생 자녀·손자녀에는 ②를 적용하지 않음 → 본칙 13세 → 2030 귀속부터
//   §53⑤ §50①3·§59의2 나이는 과세기간 중 하루라도 해당되면 충족 → 출생연도로 판정(나이 = 귀속연도 − 출생연도)
//   §50①3나 기본공제 직계비속·입양자 20세 이하, 장애인은 나이 제한 없음
// 확인 못 함: 위탁아동·손자녀의 시행령 요건(양육 기간 등) — dependentDeduction.ts처럼 직계비속과 같은 20세 이하로 판정
import { childCredit, birthCredit, itemTaxSaving, TAX_YEAR, type YetInput } from './yearEndTax.ts'

export const RELATIONS = ['child', 'grandchild', 'foster'] as const
export type Relation = (typeof RELATIONS)[number]
export interface Kid { rel: Relation; born: number; disabled: boolean }

/** 부칙 §2② 연도별 대상 나이. 2025 귀속까지는 개정 전 본칙 8세, 2030 귀속부터 본칙 13세 */
const TRANSITION: Record<number, number> = { 2026: 9, 2027: 10, 2028: 11, 2029: 12 }
export const minAge = (year: number) => (year <= 2025 ? 8 : TRANSITION[year] ?? 13)
export const EXCLUDED_BORN = 2017 // 부칙 §2③

/** year 귀속 자녀세액공제 나이 요건 */
export function ageOk(born: number, year: number) {
  const age = year - born
  return born === EXCLUDED_BORN && TRANSITION[year] ? age >= 13 : age >= minAge(year)
}
/** §50 기본공제 나이: 20세 이하, 장애인은 무관 */
export const basicOk = (k: Kid, year = TAX_YEAR) => k.born <= year && (k.disabled || k.born >= year - 20)
export const creditOk = (k: Kid, year = TAX_YEAR) => basicOk(k, year) && ageOk(k.born, year)
/** year 귀속 대상 출생연도 상한 (이 해 이전 출생이면 나이 요건 충족) */
export function bornBy(year: number) {
  let b = year
  while (!ageOk(b, year)) b--
  return b
}

/** 올해 판정 이유: ok 대상 / over 20세 초과 / y2017 부칙 제외 / newborn 올해 출생 / young 아직 나이 안 됨 */
export type Reason = 'ok' | 'over' | 'y2017' | 'newborn' | 'young'
export function reasonOf(k: Kid): Reason {
  if (!basicOk(k)) return 'over'
  if (creditOk(k)) return 'ok'
  if (k.born === EXCLUDED_BORN) return 'y2017'
  return k.born === TAX_YEAR ? 'newborn' : 'young'
}

/** 올해부터 대상이 되는 귀속연도 from ~ 마지막 to(20세, 장애인이면 null = 계속). 대상 기간이 없으면 from = null */
export function span(k: Kid) {
  const to = k.disabled ? null : k.born + 20
  let from = TAX_YEAR
  while (!creditOk(k, from) && (to === null || from <= to)) from++
  return { from: to !== null && from > to ? null : from, to }
}

/** 자녀 목록 → yearEndTax 입력 (kidsUnder8 = 기본공제 자녀 중 자녀세액공제 제외 인원) */
export function toInput(kids: Kid[], birth: number): Partial<YetInput> {
  const basic = kids.filter((k) => basicOk(k))
  return { children: basic.length, kidsUnder8: basic.filter((k) => !creditOk(k)).length, disabled: basic.filter((k) => k.disabled).length, birth }
}

/** none 공제 없음 / noTax 낼 세금이 원래 0 / partial 결정세액 한도로 일부만 / full 공제액(+지방소득세 10%)만큼 그대로 줄어듦.
 *  자녀세액공제는 표준세액공제와 함께 받으므로(yearEndTax common) standard·swap 상태는 없다 */
export type Status = 'none' | 'noTax' | 'partial' | 'full'

export function analyze(salary: number, kids: Kid[], birth: number) {
  const x = toInput(kids, birth)
  const basic = x.children!
  const eligible = basic - x.kidsUnder8!
  const child = childCredit(eligible)
  const born = birthCredit(birth)
  const credit = child + born
  // 같은 가족에서 자녀세액공제만 뺀 상태(모두 제외 인원, 출산 0) → 넣은 상태
  const { before, saving } = itemTaxSaving({ salary, ...x, kidsUnder8: basic, birth: 0 }, x)
  const status: Status = credit === 0 ? 'none' : before.determined === 0 ? 'noTax' : saving + 2 < Math.floor(credit * 1.1) ? 'partial' : 'full'
  return { rows: kids.map((k) => ({ reason: reasonOf(k), ...span(k) })), basic, eligible, child, born, credit, saving, status, tax: before.totalTax, input: x }
}

/** 맞벌이: 기본공제 대상 자녀를 누가 받을지 모든 조합 → 두 사람 세금(지방소득세 포함) 합이 가장 적은 배분.
 *  자녀 기본공제 150만·장애인 200만·자녀세액공제가 함께 따라간다. 각자 다른 공제가 없다고 본 근사 (dependentDeduction couple과 같음).
 *  ponytail: 출산·입양 공제는 가장 어린 자녀를 받는 쪽 — 큰아이를 입양했다면 실제와 다를 수 있음 */
export const MAX_KIDS = 8 // 2^8 조합
export function couple(salary: number, spouseSalary: number, kids: Kid[], birth: number) {
  const idx = kids.map((_, i) => i).filter((i) => basicOk(kids[i]))
  const youngest = idx.reduce((a, i) => (a < 0 || kids[i].born > kids[a].born ? i : a), -1)
  const tax = (s: number, list: number[], mine: boolean) => {
    const b = (youngest < 0 ? mine : list.includes(youngest)) ? birth : 0
    return itemTaxSaving({ salary: s }, toInput(list.map((i) => kids[i]), b)).after.totalTax
  }
  const plans = Array.from({ length: 1 << idx.length }, (_, mask) => {
    const sp = idx.filter((_, j) => mask & (1 << j))
    const me = tax(salary, idx.filter((i) => !sp.includes(i)), true)
    const spouse = tax(spouseSalary, sp, false)
    return { toSpouse: kids.map((_, i) => sp.includes(i)), me, spouse, total: me + spouse, moved: sp.length }
  })
  const allMe = plans[0]
  const allSpouse = plans[plans.length - 1]
  // 같은 세금이면 덜 옮기는 쪽
  const best = plans.reduce((a, p) => (p.total < a.total || (p.total === a.total && p.moved < a.moved) ? p : a))
  return { allMe, allSpouse, best, gain: allMe.total - best.total, split: best.moved > 0 && best.moved < idx.length }
}

// ── 페이지 예시 (page.tsx 본문·FAQ와 계산기 기본값, check 스크립트가 숫자 고정) ──
export const kid = (born: number, rel: Relation = 'child', disabled = false): Kid => ({ rel, born, disabled })
export const EXAMPLES = {
  /** 첫 화면: 총급여 5,000만, 2014·2018년생 자녀 2명 → 2014년생만 대상 */
  d: { salary: 50_000_000, kids: [kid(2014), kid(2018)], birth: 0 },
  /** 3명: 총급여 6,000만, 2010·2012·2015년생 */
  three: { salary: 60_000_000, kids: [kid(2010), kid(2012), kid(2015)], birth: 0 },
  /** 결정세액 한도: 총급여 3,000만 + three의 자녀 3명 */
  low: { salary: 30_000_000 },
  /** 출산: 총급여 5,000만, 2016년생 첫째 + 올해 태어난 둘째 */
  birth: { salary: 50_000_000, kids: [kid(2016), kid(TAX_YEAR)], birth: 2 },
  /** 맞벌이: 총급여 4,000만 + 배우자 8,000만, 2012·2014년생 → 모두 배우자 앞으로 */
  c: { salary: 40_000_000, spouseSalary: 80_000_000, kids: [kid(2012), kid(2014)], birth: 0 },
  /** 맞벌이: 둘 다 3,000만, 2010·2012년생 → 1명씩 나누기 */
  split: { salary: 30_000_000, spouseSalary: 30_000_000, kids: [kid(2010), kid(2012)], birth: 0 },
}
