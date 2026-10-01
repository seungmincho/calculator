/**
 * 가계부·예산 계산기 순수 로직. BudgetCalculator가 사용, scripts/check-budget.ts로 회귀 체크.
 * 금액은 모두 원(정수), 월 단위.
 */

export const CATEGORY_IDS = [
  'housing', 'food', 'transport', 'communication', 'insurance', 'medical',
  'education', 'leisure', 'clothing', 'social', 'other', 'emergency', 'savings',
] as const
export type CatId = typeof CATEGORY_IDS[number]
export type Amounts = Record<CatId, number>

/** 50/30/20 기준 성격. 저축 = 비상금 + 저축·투자 */
export const CAT_TYPE: Record<CatId, 'need' | 'want' | 'saving'> = {
  housing: 'need', food: 'need', transport: 'need', communication: 'need', insurance: 'need', medical: 'need',
  education: 'want', leisure: 'want', clothing: 'want', social: 'want', other: 'want',
  emergency: 'saving', savings: 'saving',
}
/** 월 1회 빠져나가는 고정비 (하루 예산 계산에서 제외) */
export const FIXED: CatId[] = ['housing', 'communication', 'insurance', 'education']
const SAVING: CatId[] = ['emergency', 'savings']
/** 하루 예산 대상: 고정비·저축이 아닌 변동 생활비 */
export const VARIABLE: CatId[] = CATEGORY_IDS.filter(c => !FIXED.includes(c) && !SAVING.includes(c))

export const DEFAULT_INCOME = 3_000_000
/** 월 실수령 300만 1인 가구 예시 */
export const DEFAULT_PLAN: Amounts = {
  housing: 600_000, food: 500_000, transport: 150_000, communication: 80_000, insurance: 150_000, medical: 50_000,
  education: 100_000, leisure: 200_000, clothing: 100_000, social: 100_000, other: 70_000,
  emergency: 200_000, savings: 500_000,
}

export type RuleId = 'r503020' | 'fourAccounts' | 'rookie'
export type BucketId = 'need' | 'want' | 'saving' | 'fixed' | 'living' | 'reserve' | 'invest'
export interface Bucket { id: BucketId; pct: number; cats: CatId[]; saving: boolean }

const byType = (ty: 'need' | 'want' | 'saving') => CATEGORY_IDS.filter(c => CAT_TYPE[c] === ty)
export const RULES: Record<RuleId, Bucket[]> = {
  r503020: [
    { id: 'need', pct: 50, cats: byType('need'), saving: false },
    { id: 'want', pct: 30, cats: byType('want'), saving: false },
    { id: 'saving', pct: 20, cats: byType('saving'), saving: true },
  ],
  // 통장 쪼개기: 급여(고정비)·소비(생활비)·예비(비상금)·투자. 비율은 예시
  fourAccounts: [
    { id: 'fixed', pct: 30, cats: FIXED, saving: false },
    { id: 'living', pct: 40, cats: VARIABLE, saving: false },
    { id: 'reserve', pct: 10, cats: ['emergency'], saving: true },
    { id: 'invest', pct: 20, cats: ['savings'], saving: true },
  ],
  // 사회초년생: 저축 50%
  rookie: [
    { id: 'need', pct: 30, cats: byType('need'), saving: false },
    { id: 'want', pct: 20, cats: byType('want'), saving: false },
    { id: 'saving', pct: 50, cats: byType('saving'), saving: true },
  ],
}
export const isRule = (x: unknown): x is RuleId => typeof x === 'string' && x in RULES

const toWon = (v: unknown) => {
  const n = typeof v === 'string' ? Number(v.replace(/[^0-9]/g, '')) : Number(v)
  return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), 1e12) : 0
}
export const sumOf = (a: Partial<Amounts>, ids: readonly CatId[] = CATEGORY_IDS) => ids.reduce((s, c) => s + (a[c] ?? 0), 0)

/** 저장값/예전 프리셋(expenses: [{id, amount}]) → Amounts. 모르는 키는 버림 */
export function normalizeAmounts(x: unknown): Amounts {
  const out = Object.fromEntries(CATEGORY_IDS.map(c => [c, 0])) as Amounts
  if (Array.isArray(x)) {
    for (const e of x) if (e && (CATEGORY_IDS as readonly string[]).includes(e.id)) out[e.id as CatId] = toWon(e.amount)
  } else if (x && typeof x === 'object') {
    for (const c of CATEGORY_IDS) out[c] = toWon((x as Record<string, unknown>)[c])
  }
  return out
}

export type Verdict = 'over' | 'low' | 'fair' | 'good' | 'great'

/** 통별 목표 금액. 반올림 오차는 마지막 통에 몰아 합계 = 수입 */
export function bucketTargets(income: number, rule: RuleId) {
  const bs = RULES[rule]
  const t = bs.map(b => Math.round(income * b.pct / 100))
  t[t.length - 1] = income - t.slice(0, -1).reduce((x, y) => x + y, 0)
  return t
}

export function analyze(income: number, plan: Amounts, rule: RuleId) {
  const spend = sumOf(plan) - sumOf(plan, SAVING)
  const saving = sumOf(plan, SAVING)
  const allocated = spend + saving
  const unallocated = income - allocated
  const pct = (v: number) => (income > 0 ? (v / income) * 100 : 0)
  const savingsRate = pct(saving)
  const verdict: Verdict = income <= 0 || allocated > income ? 'over'
    : savingsRate < 10 ? 'low' : savingsRate < 20 ? 'fair' : savingsRate < 30 ? 'good' : 'great'
  const targets = bucketTargets(Math.max(0, income), rule)
  const buckets = RULES[rule].map((b, i) => {
    const actual = sumOf(plan, b.cats)
    const actualPct = pct(actual)
    const diff = actualPct - b.pct
    // ±5%p는 허용. 지출 통은 넘치면, 저축 통은 모자라면 경고
    const warn = b.saving ? diff < -5 : diff > 5
    return { ...b, target: targets[i], actual, actualPct, diff, warn }
  })
  return {
    spend, saving, allocated, unallocated, savingsRate, verdict, buckets,
    need: sumOf(plan, byType('need')),
    /** 남는 돈까지 저축하면 */
    potentialRate: pct(saving + Math.max(0, unallocated)),
    /** 이자 제외 단순 누적 */
    year1: saving * 12,
    year3: saving * 36,
  }
}

/** 규칙 비율대로 수입을 나눠 채운다. 통 안에서는 현재 계획 비율(전부 0이면 기본 예시 비율)로 배분, 1만원 단위 */
export function fillByRule(income: number, plan: Amounts, rule: RuleId): Amounts {
  const out = { ...plan }
  if (income <= 0) return out
  const targets = bucketTargets(income, rule)
  for (const [i, b] of RULES[rule].entries()) {
    const target = targets[i]
    const base = sumOf(plan, b.cats) > 0 ? plan : DEFAULT_PLAN
    const w = sumOf(base, b.cats)
    let used = 0
    for (const c of b.cats) { out[c] = Math.floor((target * base[c] / w) / 10_000) * 10_000; used += out[c] }
    const top = b.cats.reduce((m, c) => (base[c] > base[m] ? c : m), b.cats[0])
    out[top] += target - used
  }
  return out
}

export const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
export function shiftMonth(key: string, delta: number) {
  const [y, m] = key.split('-').map(Number)
  return monthKey(new Date(y, m - 1 + delta, 1))
}
export const isMonthKey = (k: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(k)

/**
 * 한 달 계획 대비 실제. today = 'YYYY-MM-DD'.
 * 하루 예산 = 남은 변동 생활비 ÷ 오늘 포함 남은 일수 (100원 단위 내림).
 */
export function monthStatus(plan: Amounts, actual: Partial<Amounts>, key: string, today: string) {
  const [y, m] = key.split('-').map(Number)
  const dim = new Date(y, m, 0).getDate()
  const tk = today.slice(0, 7)
  const phase: 'past' | 'current' | 'future' = key < tk ? 'past' : key > tk ? 'future' : 'current'
  const spendIds = CATEGORY_IDS.filter(c => !SAVING.includes(c))
  const planned = sumOf(plan, spendIds)
  const spent = sumOf(actual, spendIds)
  const varPlanned = sumOf(plan, VARIABLE)
  const varSpent = sumOf(actual, VARIABLE)
  const day = Number(today.slice(8, 10))
  const daysLeft = phase === 'current' ? dim - day + 1 : phase === 'future' ? dim : 0
  const daily = daysLeft > 0 ? Math.floor(Math.max(0, varPlanned - varSpent) / daysLeft / 100) * 100 : 0
  // 오늘까지 써도 되는 변동비 (일할)
  const paceLimit = phase === 'current' ? Math.round(varPlanned * day / dim) : varPlanned
  return {
    phase, dim, daysLeft, planned, spent, left: planned - spent,
    varPlanned, varSpent, daily, paceLimit,
    fast: phase === 'current' && varSpent > paceLimit,
    savedPlan: sumOf(plan, SAVING), saved: sumOf(actual, SAVING),
  }
}

/** 비상금 목표 = 월 필수 지출 × months. monthsToGoal: 매달 비상금 계획액으로 모을 때 (계획 0이면 null) */
export function emergencyGoal(monthlyNeed: number, months: number, balance: number, monthly: number) {
  const target = monthlyNeed * months
  const short = Math.max(0, target - balance)
  return {
    target,
    progress: target > 0 ? Math.min(100, (balance / target) * 100) : 0,
    short,
    monthsToGoal: short === 0 ? 0 : monthly > 0 ? Math.ceil(short / monthly) : null,
  }
}

/** 월별 기록 CSV (계획은 현재 계획 기준). header·label은 화면 언어로 받는다 */
export function toCSV(months: Record<string, Partial<Amounts>>, plan: Amounts, header: string[], label: (c: CatId) => string) {
  const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s)
  const lines = [header.map(esc).join(',')]
  for (const k of Object.keys(months).sort()) {
    for (const c of CATEGORY_IDS) lines.push([k, label(c), String(plan[c]), String(months[k][c] ?? 0)].map(esc).join(','))
  }
  return lines.join('\n')
}

/** 저장된 월별 기록 정리: 잘못된 키·음수 제거 */
export function normalizeMonths(x: unknown): Record<string, Partial<Amounts>> {
  const out: Record<string, Partial<Amounts>> = {}
  if (!x || typeof x !== 'object') return out
  for (const [k, v] of Object.entries(x as Record<string, unknown>)) {
    if (!isMonthKey(k) || !v || typeof v !== 'object') continue
    const a: Partial<Amounts> = {}
    for (const c of CATEGORY_IDS) { const n = toWon((v as Record<string, unknown>)[c]); if (n) a[c] = n }
    out[k] = a
  }
  return out
}

/** URL → 계획. 계획 관련 파라미터가 하나도 없으면 null. 예전 링크(salary·exp_*)와 호환 */
export function readParams(get: (k: string) => string | null) {
  const has = ['salary', 'annual', 'sideIncome', 'otherIncome', ...CATEGORY_IDS.map(c => `exp_${c}`)].some(k => get(k) != null)
  if (!has) return null
  const anyExp = CATEGORY_IDS.some(c => get(`exp_${c}`) != null)
  const amounts = normalizeAmounts(Object.fromEntries(CATEGORY_IDS.map(c => [c, get(`exp_${c}`) ?? 0])))
  const annual = toWon(get('annual'))
  const rule = get('rule')
  return {
    mode: annual > 0 ? 'annual' as const : 'net' as const,
    salary: get('salary') != null ? toWon(get('salary')) : DEFAULT_INCOME,
    annual,
    sideIncome: toWon(get('sideIncome')),
    otherIncome: toWon(get('otherIncome')),
    amounts: anyExp ? amounts : { ...DEFAULT_PLAN },
    rule: isRule(rule) ? rule : null,
  }
}
