// 국가건강검진 대상 판정 — 순수 함수.
// 근거: 건강검진 실시기준(보건복지부고시 제2026-6호, 2026.1.7.) · 암검진 실시기준(제2025-220호, 2026.1.1.) · 암관리법 시행령 별표1
//       · 국민건강보험공단 건강모아 '일반건강검진/암검진/의료급여 생애전환기검진' 안내 (2026-10 확인)
// 나이 = 검진연도 − 출생연도 (공단·정부 표기: "2025년 56세(1969년생)"). 2년 주기 = 출생연도와 검진연도의 홀짝이 같은 해.

export type Sex = 'm' | 'f'
/** office 직장 사무직 · field 직장 비사무직 · head 지역 세대주 · member 지역 세대원 · dependent 피부양자 · aid 의료급여수급권자 */
export type Member = 'office' | 'field' | 'head' | 'member' | 'dependent' | 'aid'
export const MEMBERS: readonly Member[] = ['office', 'field', 'head', 'member', 'dependent', 'aid']

export type ExtraId =
  | 'lipid' | 'hepB' | 'hepC' | 'pft' | 'bone' | 'cognitive'
  | 'depression' | 'psychosis' | 'lifestyle' | 'physical' | 'plaque'
export type CancerId = 'stomach' | 'colon' | 'liver' | 'breast' | 'cervix' | 'lung'
export const CANCERS: readonly CancerId[] = ['stomach', 'colon', 'liver', 'breast', 'cervix', 'lung']
export const CANCER_CYCLE: Record<CancerId, '2y' | '1y' | '6m'> = {
  stomach: '2y', colon: '1y', liver: '6m', breast: '2y', cervix: '2y', lung: '2y',
}

export interface CheckupInput {
  birthYear: number
  sex: Sex
  member: Member
  year: number
  smoker30?: boolean // 현재 흡연 + 30갑년 이상 (폐암)
  liverRisk?: boolean // 간경변·B형/C형 간염 등 (간암)
}

export interface Extra { id: ExtraId; range?: [number, number] } // range: 그 연령대 중 1회 항목
export interface Cancer { id: CancerId; copay: 'free' | 'ten' } // ten = 10% (보험료 하위 50%는 무료)
export type GeneralKind = 'general' | 'aidTransition' // aidTransition = 의료급여 생애전환기검진(66세+)
export type Reason = 'parity' | 'under20'

export interface CheckupResult {
  age: number
  general: GeneralKind | null
  reason: Reason | null
  extras: Extra[]
  cancers: Cancer[]
  next: number | null // 다음 일반건강검진 대상 연도 (year 이후)
}

export const ageOf = (year: number, birthYear: number) => year - birthYear
export const sameParity = (year: number, birthYear: number) => (year - birthYear) % 2 === 0

/** 일반건강검진(또는 의료급여 생애전환기검진) 대상 여부 */
export function generalOf(i: CheckupInput): { kind: GeneralKind | null; reason: Reason | null } {
  const a = ageOf(i.year, i.birthYear)
  if (i.member === 'field') return { kind: 'general', reason: null } // 비사무직: 매년
  const adultOnly = i.member === 'member' || i.member === 'dependent' || i.member === 'aid'
  if (adultOnly && a < 20) return { kind: null, reason: 'under20' }
  if (!sameParity(i.year, i.birthYear)) return { kind: null, reason: 'parity' }
  // 의료급여: 20~64세 일반건강검진, 66세 이상 의료급여 생애전환기검진 (65세는 홀짝상 대상 연도가 오지 않음)
  return { kind: i.member === 'aid' && a >= 66 ? 'aidTransition' : 'general', reason: null }
}

const DEP_RANGES: [number, number][] = [[35, 39], [40, 49], [50, 59], [60, 69], [70, 79]]

/** 성·연령별 추가 검사 (일반건강검진 대상일 때만) */
export function extrasOf(a: number, sex: Sex, kind: GeneralKind): Extra[] {
  const out: Extra[] = []
  const even = a % 2 === 0
  if (kind === 'aidTransition') {
    if (a === 66) out.push({ id: 'pft' })
    if (sex === 'f' && a === 66) out.push({ id: 'bone' })
    if (even) out.push({ id: 'cognitive' })
    if (a <= 79) out.push({ id: 'depression', range: [66, 79] })
    if (a === 70) out.push({ id: 'lifestyle' })
    if ([66, 70, 80].includes(a)) out.push({ id: 'physical' })
    return out
  }
  if (a % 4 === 0 && (sex === 'm' ? a >= 24 : a >= 40)) out.push({ id: 'lipid' })
  if (a === 40) out.push({ id: 'hepB' })
  if (a === 56) out.push({ id: 'hepC' })
  if (a === 56 || a === 66) out.push({ id: 'pft' })
  if (sex === 'f' && [54, 60, 66].includes(a)) out.push({ id: 'bone' })
  if (a >= 66 && even) out.push({ id: 'cognitive' })
  if (a >= 20 && a <= 34) {
    if (even) out.push({ id: 'depression' }, { id: 'psychosis' })
  } else {
    const r = DEP_RANGES.find(([lo, hi]) => a >= lo && a <= hi)
    if (r) out.push({ id: 'depression', range: r })
  }
  if ([40, 50, 60, 70].includes(a)) out.push({ id: 'lifestyle' })
  if ([66, 70, 80].includes(a)) out.push({ id: 'physical' })
  if (a === 40) out.push({ id: 'plaque' })
  return out
}

/** 국가 암검진 6종. 2년 주기 암은 가입 유형과 무관하게 출생연도 홀짝 기준(비사무직 포함 — 공단 조회로 확인 필요) */
export function cancersOf(i: CheckupInput): Cancer[] {
  const a = ageOf(i.year, i.birthYear)
  const p = sameParity(i.year, i.birthYear)
  const ok: Record<CancerId, boolean> = {
    stomach: p && a >= 40,
    colon: a >= 50,
    liver: a >= 40 && !!i.liverRisk,
    breast: p && i.sex === 'f' && a >= 40,
    cervix: p && i.sex === 'f' && a >= 20,
    lung: p && a >= 54 && a <= 74 && !!i.smoker30,
  }
  return CANCERS.filter((id) => ok[id]).map((id) => ({
    id,
    copay: i.member === 'aid' || id === 'colon' || id === 'cervix' ? 'free' : 'ten',
  }))
}

/** year 다음 해부터 일반건강검진 대상이 되는 첫 연도 */
export function nextGeneralYear(i: CheckupInput): number | null {
  for (let y = i.year + 1; y <= i.year + 40; y++) if (generalOf({ ...i, year: y }).kind) return y
  return null
}

export function checkup(i: CheckupInput): CheckupResult {
  const age = ageOf(i.year, i.birthYear)
  const { kind, reason } = generalOf(i)
  return {
    age,
    general: kind,
    reason,
    extras: kind ? extrasOf(age, i.sex, kind) : [],
    cancers: cancersOf(i),
    next: nextGeneralYear(i),
  }
}

/** 12월 31일까지 남은 날 (today = 'YYYY-MM-DD'). 그해 이전이면 null(아직 시작 전), 지났으면 -1 */
export function daysLeft(year: number, today: string): number | null {
  const [y, m, d] = today.split('-').map(Number)
  if (y < year) return null
  if (y > year) return -1
  return Math.round((Date.UTC(year, 11, 31) - Date.UTC(y, m - 1, d)) / 86_400_000)
}
