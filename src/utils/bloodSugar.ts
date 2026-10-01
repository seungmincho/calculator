// 혈당 판정·변환·기록 통계 (순수 함수). 회귀 체크: scripts/check-blood-sugar.ts
// 기준: 대한당뇨병학회 당뇨병 진료지침(2023), ADA Standards of Care (Diagnosis & Classification, Glycemic Goals)

export type Ctx = 'fasting' | 'beforeMeal' | 'afterMeal' | 'bedtime' | 'random'
export const CTXS: Ctx[] = ['fasting', 'beforeMeal', 'afterMeal', 'bedtime', 'random']
export type Unit = 'mg' | 'mmol'
export type Tone = 'danger' | 'warn' | 'ok'

/** 판정 키 — 화면 라벨은 i18n `u.lv.<key>` */
export type LevelKey =
  | 'low2' // < 54: 2단계(임상적으로 의미 있는) 저혈당
  | 'low' // 54–69: 1단계 저혈당
  | 'fNormal' | 'fIFG' | 'fDM' // 공복 8시간+: <100 / 100–125 / ≥126
  | 'pNormal' | 'pIGT' | 'pDM' // 식후 2시간: <140 / 140–199 / ≥200 (진단 기준은 75g OGTT)
  | 'high' // 식전·취침 전·무작위 ≥200
  | 'ok' // 식전·취침 전·무작위 70–199: 진단 기준 없음(참고)

export interface Level { key: LevelKey; tone: Tone }

export const MMOL = 18.016
export const toMmol = (mg: number) => mg / MMOL
export const toMg = (mmol: number) => mmol * MMOL
/** 표시용: mg/dL은 정수, mmol/L은 소수 1자리 */
export const fmt = (mg: number, unit: Unit) => unit === 'mg' ? String(Math.round(mg)) : toMmol(mg).toFixed(1)

export function classify(mg: number, ctx: Ctx): Level {
  if (mg < 54) return { key: 'low2', tone: 'danger' }
  if (mg < 70) return { key: 'low', tone: 'danger' }
  if (ctx === 'fasting') {
    if (mg < 100) return { key: 'fNormal', tone: 'ok' }
    if (mg < 126) return { key: 'fIFG', tone: 'warn' }
    return { key: 'fDM', tone: 'danger' }
  }
  if (ctx === 'afterMeal') {
    if (mg < 140) return { key: 'pNormal', tone: 'ok' }
    if (mg < 200) return { key: 'pIGT', tone: 'warn' }
    return { key: 'pDM', tone: 'danger' }
  }
  return mg >= 200 ? { key: 'high', tone: 'danger' } : { key: 'ok', tone: 'ok' }
}

// ── 당화혈색소 ──
export type A1cKey = 'normal' | 'pre' | 'diabetes'
export function classifyA1c(a1c: number): A1cKey {
  if (a1c < 5.7) return 'normal'
  if (a1c < 6.5) return 'pre'
  return 'diabetes'
}
/** ADAG(Nathan 2008): eAG(mg/dL) = 28.7 × A1c − 46.7 */
export const eAG = (a1c: number) => Math.round((28.7 * a1c - 46.7) * 10) / 10 // 0.1 반올림: 6% → 125.5 → 표시 126 (ADA 표)
export const a1cFromEag = (mg: number) => (mg + 46.7) / 28.7

// ── 입력 범위 ──
export const MIN_MG = 10
export const MAX_MG = 600
export const validMg = (mg: number) => Number.isFinite(mg) && mg >= MIN_MG && mg <= MAX_MG

// ── 기록 ──
export interface SugarRecord {
  id: string
  value: number // mg/dL (기존 저장 형식 유지)
  timing: Ctx
  date: string // YYYY-MM-DD (로컬)
  time: string // HH:mm
  note: string
  createdAt: number
}

/** localStorage 값 정리. 형식은 예전과 같으므로 버리지 않고 보정만 한다. */
export function sanitizeRecords(raw: unknown): SugarRecord[] {
  if (!Array.isArray(raw)) return []
  const out: SugarRecord[] = []
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue
    const o = r as Record<string, unknown>
    const value = Number(o.value)
    if (!Number.isFinite(value) || value <= 0) continue
    const createdAt = Number(o.createdAt) || 0
    const date = typeof o.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.date) ? o.date
      : createdAt ? localDate(new Date(createdAt)) : ''
    if (!date) continue
    out.push({
      id: typeof o.id === 'string' && o.id ? o.id : `${createdAt}-${out.length}`,
      value,
      timing: CTXS.includes(o.timing as Ctx) ? (o.timing as Ctx) : 'random',
      date,
      time: typeof o.time === 'string' && /^\d{2}:\d{2}$/.test(o.time) ? o.time : '00:00',
      note: typeof o.note === 'string' ? o.note : '',
      createdAt,
    })
  }
  return out
}

export const localDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const localTime = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

/** 측정 일시(로컬) → ms */
export const measuredAt = (r: Pick<SugarRecord, 'date' | 'time'>) => new Date(`${r.date}T${r.time}:00`).getTime()

/** 측정 일시 내림차순(최신 먼저) */
export const sortRecords = (rs: SugarRecord[]) => [...rs].sort((a, b) => measuredAt(b) - measuredAt(a) || b.createdAt - a.createdAt)

/** 최근 N일(오늘 포함) 기록 */
export function inPeriod(rs: SugarRecord[], days: number, today: string): SugarRecord[] {
  const end = new Date(`${today}T00:00:00`)
  end.setDate(end.getDate() - (days - 1))
  const from = localDate(end)
  return rs.filter(r => r.date >= from && r.date <= today)
}

export interface Stats {
  count: number
  avg: number
  min: number
  max: number
  byCtx: Partial<Record<Ctx, { avg: number; count: number }>>
  /** CGM 목표 범위 70–180 mg/dL (경계 포함) 기준 비율 % */
  tir: { below: number; inRange: number; above: number }
}

export function stats(rs: SugarRecord[]): Stats | null {
  if (rs.length === 0) return null
  const v = rs.map(r => r.value)
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0)
  const byCtx: Stats['byCtx'] = {}
  for (const c of CTXS) {
    const cv = rs.filter(r => r.timing === c).map(r => r.value)
    if (cv.length) byCtx[c] = { avg: sum(cv) / cv.length, count: cv.length }
  }
  const pct = (n: number) => Math.round((n / v.length) * 1000) / 10
  const below = v.filter(x => x < 70).length
  const above = v.filter(x => x > 180).length
  return {
    count: v.length,
    avg: sum(v) / v.length,
    min: Math.min(...v),
    max: Math.max(...v),
    byCtx,
    tir: { below: pct(below), inRange: pct(v.length - below - above), above: pct(above) },
  }
}

/** CSV 필드 이스케이프 (수식 주입 방지 포함) */
export const csvCell = (s: string) => `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`
