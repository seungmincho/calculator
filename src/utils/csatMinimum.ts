// 수능최저 세부 조건 계산 — 탐구 반영 방식·반영 영역·필수 영역·한국사 기준 (회귀 체크: scripts/check-csat-minimum.ts).
// 등급은 csatGradeSummary 의 행(가채점 추정 등급)을 그대로 쓴다. 대학별 충족 판정이 아니라 참고 계산.
import { summarizeCsatRawGrades } from './csatGradeSummary.ts'
import type { CsatScoreSnapshot } from './csatScoreRecords.ts'
import type { CutKey } from './csatGrade.ts'

export type MinArea = 'kor' | 'math' | 'eng' | 'inq'
export const MIN_AREAS: MinArea[] = ['kor', 'math', 'eng', 'inq']
/** 탐구: 상위 1과목 / 2과목 평균 소수 절사 / 반올림 / 소수 그대로 */
export type InqMode = 'top1' | 'avgFloor' | 'avgRound' | 'avg'
export const INQ_MODES: InqMode[] = ['top1', 'avgFloor', 'avgRound', 'avg']

export interface MinimumRule { areas: number; maxSum: number; inq: InqMode; pool: MinArea[]; required: MinArea[]; hist: number | null }
export const DEFAULT_MIN_RULE: MinimumRule = { areas: 3, maxSum: 7, inq: 'top1', pool: [...MIN_AREAS], required: [], hist: null }

export interface MinimumArea { id: MinArea; grade: number; subjects: CutKey[] }
export interface MinimumResult {
  status: 'within' | 'over' | 'needsInput' | 'invalidCondition'
  sum: number | null
  over: number | null
  used: MinimumArea[]
  /** 계산에 필요한데 유효한 등급이 없는 영역 */
  missing: MinArea[]
  hist: { max: number; grade: number | null; ok: boolean | null } | null
}

const r2 = (v: number) => Math.round(v * 100) / 100

export function isValidRule(r: MinimumRule): boolean {
  return [2, 3, 4].includes(r.areas) && Number.isInteger(r.maxSum) && r.maxSum >= r.areas && r.maxSum <= r.areas * 9
    && INQ_MODES.includes(r.inq) && r.pool.length >= r.areas && r.required.length <= r.areas
    && r.required.every(a => r.pool.includes(a)) && (r.hist === null || (Number.isInteger(r.hist) && r.hist >= 1 && r.hist <= 9))
}

/** 영역별 등급. 탐구는 방식에 따라 1과목 최고 또는 서로 다른 2과목 평균(둘 다 있어야 함). */
export function areaGrades(snapshot: CsatScoreSnapshot, inq: InqMode): Partial<Record<MinArea, MinimumArea>> {
  const { rows, duplicateInquiry, inquiryConflict } = summarizeCsatRawGrades(snapshot)
  const out: Partial<Record<MinArea, MinimumArea>> = {}
  for (const id of ['kor', 'math', 'eng'] as const) {
    const row = rows.find(x => x.id === id)!
    if (row.status === 'valid') out[id] = { id, grade: row.grade, subjects: row.cut ? [row.cut] : [] }
  }
  if (inquiryConflict) return out
  const inqRows = rows.filter(x => (x.id === 'inq1' || x.id === 'inq2') && x.status === 'valid')
  const distinct = duplicateInquiry ? inqRows.slice(0, 1) : inqRows
  const list = distinct.flatMap(x => (x.status === 'valid' && x.cut ? [{ grade: x.grade, cut: x.cut }] : []))
  if (inq === 'top1') {
    const best = [...list].sort((a, b) => a.grade - b.grade)[0]
    if (best) out.inq = { id: 'inq', grade: best.grade, subjects: [best.cut] }
  } else if (list.length === 2) {
    const avg = (list[0].grade + list[1].grade) / 2
    out.inq = { id: 'inq', grade: inq === 'avgFloor' ? Math.floor(avg) : inq === 'avgRound' ? Math.round(avg) : avg, subjects: list.map(x => x.cut) }
  }
  return out
}

export function evaluateMinimum(snapshot: CsatScoreSnapshot, rule: MinimumRule): MinimumResult {
  const histRow = summarizeCsatRawGrades(snapshot).rows.find(x => x.id === 'hist')!
  const histGrade = histRow.status === 'valid' ? histRow.grade : null
  const hist = rule.hist === null ? null : { max: rule.hist, grade: histGrade, ok: histGrade === null ? null : histGrade <= rule.hist }
  if (!isValidRule(rule)) return { status: 'invalidCondition', sum: null, over: null, used: [], missing: [], hist }

  const grades = areaGrades(snapshot, rule.inq)
  const missingRequired = rule.required.filter(a => !grades[a])
  const rest = rule.pool.filter(a => !rule.required.includes(a) && grades[a]).map(a => grades[a]!).sort((a, b) => a.grade - b.grade)
  const need = rule.areas - rule.required.length
  if (missingRequired.length || rest.length < need) {
    const missing = rule.pool.filter(a => !grades[a])
    return { status: 'needsInput', sum: null, over: null, used: [], missing, hist }
  }
  const used = [...rule.required.map(a => grades[a]!), ...rest.slice(0, need)]
  const sum = r2(used.reduce((s, a) => s + a.grade, 0))
  const over = r2(Math.max(0, sum - rule.maxSum))
  if (hist && hist.ok === null) return { status: 'needsInput', sum, over, used, missing: [], hist }
  const ok = sum <= rule.maxSum && (hist === null || hist.ok === true)
  return { status: ok ? 'within' : 'over', sum, over, used, missing: [], hist }
}

// URL: 기본값이면 키를 쓰지 않는다. 영역은 k·m·e·i 글자로.
const LETTER: Record<MinArea, string> = { kor: 'k', math: 'm', eng: 'e', inq: 'i' }
const toLetters = (a: MinArea[]) => MIN_AREAS.filter(x => a.includes(x)).map(x => LETTER[x]).join('')
const fromLetters = (s: string | null): MinArea[] | null => {
  if (s === null) return null
  const a = MIN_AREAS.filter(x => s.includes(LETTER[x]))
  return s.split('').every(c => 'kmei'.includes(c)) ? a : null
}

/** minInq·minPool·minReq·minHist 만 다룬다(minN·minSum 은 기존 코드). */
export function ruleExtrasToQuery(r: MinimumRule): Record<string, string | null> {
  return {
    minInq: r.inq === 'top1' ? null : r.inq,
    minPool: r.pool.length === 4 ? null : toLetters(r.pool),
    minReq: r.required.length ? toLetters(r.required) : null,
    minHist: r.hist === null ? null : String(r.hist),
  }
}

export function ruleExtrasFromQuery(get: (k: string) => string | null): Pick<MinimumRule, 'inq' | 'pool' | 'required' | 'hist'> {
  const inq = get('minInq') as InqMode | null
  const pool = fromLetters(get('minPool'))
  const required = fromLetters(get('minReq')) ?? []
  const h = Number(get('minHist'))
  const p = pool && pool.length ? pool : [...MIN_AREAS]
  return {
    inq: inq && INQ_MODES.includes(inq) ? inq : 'top1',
    pool: p,
    required: required.filter(a => p.includes(a)),
    hist: Number.isInteger(h) && h >= 1 && h <= 9 ? h : null,
  }
}
