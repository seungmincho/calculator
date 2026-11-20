// 정시 환산점수: 수능 점수 × 사용자가 모집요강에서 옮긴 반영 공식 (회귀 체크: node scripts/check-jeongsi-score.ts).
// 대학별 실제 공식은 싣지 않는다(정확성 위험). 템플릿은 예시일 뿐이고 이름도 일반명만 쓴다.
//
// 계산: 영역 값 v = 백분위/100 또는 표준점수/기준 최고점 (가산 %는 여기서 곱한다)
//   비율 영역 점수 = 비율% × v × 만점,  영어(비율 반영) v = 등급 환산점수 / 환산표 최고값
//   총점 = Σ 비율 영역 점수 + 영어 가감점(가산·감산 방식일 때) + 한국사 가산점
// 탐구: 2과목 평균(= 합 / 2과목 기준 합, 정규화하면 같다) 또는 상위 1과목. 과탐 가산은 과목별로 곱한 뒤 고른다.

export type Idx = 'std' | 'pct'
export type InqMode = 'avg2' | 'top1'
export type EngMode = 'ratio' | 'add'
export type MathSel = 'prob' | 'calc' | 'geo'
export type InqType = 'soc' | 'sci'
export type Area = 'kor' | 'math' | 'eng' | 'inq' | 'hist'

/** 키 = URL 파라미터 이름. /csat-grade 등 다른 페이지가 이 이름으로 링크한다. */
export interface Scores {
  k: number; kp: number // 국어 표준점수·백분위
  m: number; mp: number // 수학
  ms: MathSel // 수학 선택과목
  e: number // 영어 등급
  h: number // 한국사 등급
  t1: number; t1p: number; t1s: InqType // 탐구1 표준점수·백분위·사탐/과탐
  t2: number; t2p: number; t2s: InqType
}

export interface Formula {
  idx: Idx
  /** 영역 비율 % [국, 수, 영, 탐]. 영어가 가감점이면 영 칸은 쓰지 않는다 */
  ratio: number[]
  inq: InqMode
  eng: EngMode
  /** 1~9등급. 비율 반영이면 환산점수, 가감점이면 총점에 더할 점수(감점은 음수) */
  engTable: number[]
  /** 1~9등급 한국사 가산점(감점은 음수) */
  histTable: number[]
  /** 수학 미적분·기하 가산 % */
  mathBonus: number
  /** 과탐 가산 % (과목별) */
  sciBonus: number
  /** 총점 만점(가감점 제외) */
  total: number
  /** 표준점수 기준 최고점 [국, 수, 탐(과목당)]. 백분위 반영이면 100 고정이라 쓰지 않는다 */
  base: number[]
}

export interface Part {
  area: Area
  points: number
  /** 비율 영역의 만점(비율 × 만점). 가감점이면 null */
  max: number | null
  /** 가산 %가 붙었는지 */
  bonus: boolean
}

export type Issue = 'ratioSum' | 'engTable'

export interface Result {
  score: number
  parts: Part[]
  ratioSum: number
  issues: Issue[]
}

export const MATH_SELS: MathSel[] = ['prob', 'calc', 'geo']
export const INQ_TYPES: InqType[] = ['soc', 'sci']
export const AREAS: Area[] = ['kor', 'math', 'eng', 'inq', 'hist']

// 점수 범위: 표준점수 0~200, 백분위 0~100, 등급 1~9
export const SCORE_RANGE = {
  k: [0, 200], kp: [0, 100], m: [0, 200], mp: [0, 100], t1: [0, 200], t1p: [0, 100], t2: [0, 200], t2p: [0, 100], e: [1, 9], h: [1, 9],
} as const
type NumScore = keyof typeof SCORE_RANGE

/** 첫 화면 예시 점수(가채점 수준의 표본). URL 에 키가 없으면 이 값 */
export const DEFAULT_SCORES: Scores = {
  k: 128, kp: 91, m: 127, mp: 88, ms: 'prob', e: 2, h: 3,
  t1: 65, t1p: 92, t1s: 'soc', t2: 62, t2p: 85, t2s: 'soc',
}

// 기준 최고점 기본값: 최근 수능 표준점수 최고점(국·수 140~150 안팎, 탐구 과목당 70점대) 근처의 어림값.
// 12/11 성적 발표 뒤 올해 최고점이나 모집요강의 기준 점수로 바꿔 쓰게 한다.
export const DEFAULT_BASE = [150, 150, 80]
const HIST_ADD = [10, 10, 10, 9.5, 9, 8.5, 8, 7.5, 7]

export const TEMPLATES = {
  // 백분위 균등형: 네 영역 25%씩, 영어 등급 환산점수 비율 반영, 한국사 가산
  pct: {
    idx: 'pct', ratio: [25, 25, 25, 25], inq: 'avg2', eng: 'ratio',
    engTable: [100, 95, 90, 80, 70, 60, 50, 40, 30], histTable: HIST_ADD,
    mathBonus: 0, sciBonus: 0, total: 1000, base: DEFAULT_BASE,
  },
  // 표준점수 인문형: 국 40·수 30·탐 30, 영어는 등급별 감점
  hum: {
    idx: 'std', ratio: [40, 30, 0, 30], inq: 'avg2', eng: 'add',
    engTable: [0, -3, -6, -10, -15, -20, -25, -30, -35], histTable: HIST_ADD,
    mathBonus: 0, sciBonus: 0, total: 1000, base: DEFAULT_BASE,
  },
  // 표준점수 자연형: 국 20·수 35·영 15·탐 30, 미적·기하 5%·과탐 5% 가산
  sci: {
    idx: 'std', ratio: [20, 35, 15, 30], inq: 'avg2', eng: 'ratio',
    engTable: [100, 97, 92, 85, 76, 65, 52, 37, 20], histTable: HIST_ADD,
    mathBonus: 5, sciBonus: 5, total: 1000, base: DEFAULT_BASE,
  },
} satisfies Record<string, Formula>
export type TemplateId = keyof typeof TEMPLATES
export const TEMPLATE_IDS = Object.keys(TEMPLATES) as TemplateId[]
export const DEFAULT_TEMPLATE: TemplateId = 'pct'

const round2 = (n: number) => Math.round(n * 100) / 100
export const clamp = (n: number, lo: number, hi: number) => round2(Math.min(hi, Math.max(lo, n)))

// ── 공식 필드: URL 파라미터·개수·범위 (URL·저장값 검증과 입력 clamp 가 같이 쓴다)
export const FORMULA_PARAM = {
  idx: 'fi', ratio: 'fr', inq: 'ft', eng: 'fe', engTable: 'fet', histTable: 'fht', mathBonus: 'fmb', sciBonus: 'fsb', total: 'fn', base: 'fb',
} as const satisfies Record<keyof Formula, string>
type FKey = keyof Formula
const ENUMS = { idx: ['std', 'pct'], inq: ['avg2', 'top1'], eng: ['ratio', 'add'] } as const
/** [개수, 최소, 최대]. 개수 1 = 숫자 하나 */
export const FORMULA_RANGE = {
  ratio: [4, 0, 100], engTable: [9, -1000, 1000], histTable: [9, -1000, 1000],
  mathBonus: [1, 0, 50], sciBonus: [1, 0, 50], total: [1, 1, 10000], base: [3, 1, 200],
} as const

const num = (v: string | null | undefined, lo: number, hi: number): number | null => {
  if (v == null || v.trim() === '') return null
  const n = Number(v)
  return Number.isFinite(n) && n >= lo && n <= hi ? round2(n) : null
}

const enc = (v: Formula[FKey]) => (Array.isArray(v) ? v.join('_') : String(v))

function decField(key: FKey, v: string): Formula[FKey] | null {
  if (key in ENUMS) return (ENUMS[key as keyof typeof ENUMS] as readonly string[]).includes(v) ? (v as Formula[FKey]) : null
  const [n, lo, hi] = FORMULA_RANGE[key as keyof typeof FORMULA_RANGE]
  const xs = v.split('_').map((x) => num(x, lo, hi))
  if (xs.length !== n || xs.some((x) => x === null)) return null
  return n === 1 ? (xs[0] as number) : (xs as number[])
}

const FKEYS = Object.keys(FORMULA_PARAM) as FKey[]
const sameField = (a: Formula, b: Formula, k: FKey) => enc(a[k]) === enc(b[k])
export const sameFormula = (a: Formula, b: Formula) => FKEYS.every((k) => sameField(a, b, k))

/** 템플릿과 똑같으면 그 id, 고쳤으면 null */
export function templateOf(f: Formula): TemplateId | null {
  return TEMPLATE_IDS.find((id) => sameFormula(f, TEMPLATES[id])) ?? null
}

/** localStorage 등 밖에서 온 값 검증. 하나라도 틀리면 null */
export function sanitizeFormula(x: unknown): Formula | null {
  if (!x || typeof x !== 'object') return null
  const out: Partial<Record<FKey, unknown>> = {}
  for (const k of FKEYS) {
    const v = (x as Record<string, unknown>)[k]
    const d = typeof v === 'string' || typeof v === 'number' || Array.isArray(v) ? decField(k, Array.isArray(v) ? v.join('_') : String(v)) : null
    if (d === null) return null
    out[k] = d
  }
  return out as Formula
}

export const cloneFormula = (f: Formula): Formula => ({
  ...f, ratio: [...f.ratio], engTable: [...f.engTable], histTable: [...f.histTable], base: [...f.base],
})

// ── 계산
export function compute(s: Scores, f: Formula): Result {
  const pct = f.idx === 'pct'
  const val = (std: number, p: number, base: number) => (pct ? p / 100 : std / base)
  const mathOn = s.ms !== 'prob' && f.mathBonus > 0
  const sci1 = s.t1s === 'sci' && f.sciBonus > 0
  const sci2 = s.t2s === 'sci' && f.sciBonus > 0
  const up = (on: boolean, b: number) => (on ? 1 + b / 100 : 1)
  const i1 = val(s.t1, s.t1p, f.base[2]) * up(sci1, f.sciBonus)
  const i2 = val(s.t2, s.t2p, f.base[2]) * up(sci2, f.sciBonus)
  // 상위 1과목이면 고른 과목에 가산이 붙었는지만 표시
  const inqV = f.inq === 'avg2' ? (i1 + i2) / 2 : Math.max(i1, i2)
  const inqBonus = f.inq === 'avg2' ? sci1 || sci2 : i1 >= i2 ? sci1 : sci2

  const [rk, rm, re, rt] = f.ratio
  const engIn = f.eng === 'ratio'
  const engMax = Math.max(...f.engTable)
  const part = (area: Area, r: number, v: number, bonus: boolean): Part => ({ area, points: (r / 100) * v * f.total, max: (r / 100) * f.total, bonus })
  const parts: Part[] = [
    part('kor', rk, val(s.k, s.kp, f.base[0]), false),
    part('math', rm, val(s.m, s.mp, f.base[1]) * up(mathOn, f.mathBonus), mathOn),
    engIn ? part('eng', re, engMax > 0 ? f.engTable[s.e - 1] / engMax : 0, false) : { area: 'eng', points: f.engTable[s.e - 1], max: null, bonus: false },
    part('inq', rt, inqV, inqBonus),
    { area: 'hist', points: f.histTable[s.h - 1], max: null, bonus: false },
  ]
  const ratioSum = round2(rk + rm + rt + (engIn ? re : 0))
  const issues: Issue[] = []
  if (Math.abs(ratioSum - 100) > 1e-6) issues.push('ratioSum')
  if (engIn && engMax <= 0) issues.push('engTable')
  return { score: parts.reduce((a, p) => a + p.points, 0), parts, ratioSum, issues }
}

// ── URL: 기본값과 다른 것만 쓴다. 모두 기본이면 빈 문자열
const SCORE_KEYS = Object.keys(DEFAULT_SCORES) as (keyof Scores)[]

export function parseScores(get: (k: string) => string | null): Scores {
  const s = { ...DEFAULT_SCORES }
  for (const k of Object.keys(SCORE_RANGE) as NumScore[]) {
    const [lo, hi] = SCORE_RANGE[k]
    const v = num(get(k), lo, hi)
    if (v !== null && ((k !== 'e' && k !== 'h') || Number.isInteger(v))) s[k] = v
  }
  const ms = get('ms')
  if (ms && (MATH_SELS as string[]).includes(ms)) s.ms = ms as MathSel
  for (const k of ['t1s', 't2s'] as const) {
    const v = get(k)
    if (v && (INQ_TYPES as string[]).includes(v)) s[k] = v as InqType
  }
  return s
}

/** 공식: tpl(기본 템플릿이 아닐 때) + 그 템플릿과 다른 필드만 */
export function parseFormula(get: (k: string) => string | null): Formula {
  const tpl = get('tpl')
  const f = cloneFormula(TEMPLATES[tpl && tpl in TEMPLATES ? (tpl as TemplateId) : DEFAULT_TEMPLATE])
  for (const k of FKEYS) {
    const v = get(FORMULA_PARAM[k])
    const d = v === null ? null : decField(k, v)
    if (d !== null) (f as unknown as Record<FKey, unknown>)[k] = d
  }
  return f
}

export function toQuery(s: Scores, f: Formula): string {
  const q = new URLSearchParams()
  for (const k of SCORE_KEYS) if (s[k] !== DEFAULT_SCORES[k]) q.set(k, String(s[k]))
  // 다른 필드가 가장 적은 템플릿을 기준으로 삼는다(동점이면 앞 템플릿)
  const diff = (id: TemplateId) => FKEYS.filter((k) => !sameField(f, TEMPLATES[id], k))
  const base = TEMPLATE_IDS.reduce((a, b) => (diff(b).length < diff(a).length ? b : a))
  if (base !== DEFAULT_TEMPLATE) q.set('tpl', base)
  for (const k of diff(base)) q.set(FORMULA_PARAM[k], enc(f[k]))
  return q.toString()
}

// ── 저장한 공식 (localStorage)
export const SAVE_KEY = 'toolhub-jeongsi-score-v1'
export const MAX_SAVED = 6
export const NAME_MAX = 40
export const GROUPS = ['ga', 'na', 'da', 'etc'] as const
export type Group = (typeof GROUPS)[number]

export interface Saved {
  name: string
  group: Group
  formula: Formula
}

/** 저장 문자열 → 검증된 목록(틀린 항목은 버리고 최대 6개) */
export function parseSaved(raw: string | null): Saved[] {
  let data: unknown
  try { data = JSON.parse(raw ?? '[]') } catch { return [] }
  if (!Array.isArray(data)) return []
  const out: Saved[] = []
  for (const x of data) {
    if (!x || typeof x !== 'object') continue
    const { name, group, formula } = x as Record<string, unknown>
    const f = sanitizeFormula(formula)
    const n = typeof name === 'string' ? name.trim().slice(0, NAME_MAX) : ''
    if (!f || !n || !(GROUPS as readonly unknown[]).includes(group)) continue
    out.push({ name: n, group: group as Group, formula: f })
    if (out.length === MAX_SAVED) break
  }
  return out
}
