// 혈중알코올농도(BAC) 추정 — 위드마크(Widmark) 공식, 순수 로직.
// BAC(%) = 알코올(g) / (체중kg × r × 10) − β × 경과시간(h)
// 보수적(높게 나오는) 가정: 섭취 즉시 100% 흡수, r은 범위의 낮은 값.

export const ETHANOL_DENSITY = 0.789 // g/ml
/** 위드마크 r(체내 분포계수). 흔히 남 0.68~0.70, 여 0.55~0.60 → 낮은 값 사용(BAC 높게). */
export const R = { male: 0.68, female: 0.55 } as const
/** 시간당 감소율 β(%/h). 평균 0.015, 개인차 0.010~0.020. 0 도달 시각은 느린 값(0.010)으로. */
export const BETA = { slow: 0.01, typical: 0.015, fast: 0.02 } as const
/** 도로교통법 제44조④ 운전금지 0.03% 이상 / 시행규칙 별표28 0.03~0.08 정지, 0.08 이상 취소 / 제148조의2 0.2% 이상 가중 */
export const LIMIT = { suspend: 0.03, revoke: 0.08, severe: 0.2 } as const

export type Gender = keyof typeof R

/** 프리셋: ml·도수. 소주 15.7% = 참이슬 후레쉬·처음처럼 2026년 개편 도수. */
export const PRESETS = {
  sojuGlass: { ml: 50, abv: 15.7 },
  sojuBottle: { ml: 360, abv: 15.7 },
  beer500: { ml: 500, abv: 4.5 },
  beerCan: { ml: 355, abv: 4.5 },
  makgeolliBottle: { ml: 750, abv: 6 },
  makgeolliCup: { ml: 150, abv: 6 },
  wineGlass: { ml: 150, abv: 13 },
  wineBottle: { ml: 750, abv: 13 },
  whiskyShot: { ml: 30, abv: 40 },
  highball: { ml: 300, abv: 6 }, // 위스키 45ml(40%) + 탄산수 ≈ 300ml
  somaek: { ml: 200, abv: 7.3 }, // 기본: 소주 50 + 맥주 150 (somaek()으로 재계산)
  custom: { ml: 100, abv: 5 },
} as const
export type Kind = keyof typeof PRESETS
export const KINDS = Object.keys(PRESETS) as Kind[]

export interface Drink {
  kind: Kind
  ml: number
  abv: number
  /** 잔/병 수 */
  n: number
  /** 음주 시작 후 몇 시간째에 마셨는지 */
  t: number
}

export const grams = (ml: number, abv: number) => ml * (abv / 100) * ETHANOL_DENSITY
export const drinkGrams = (d: Drink) => grams(d.ml, d.abv) * d.n
export const totalGrams = (ds: Drink[]) => ds.reduce((s, d) => s + drinkGrams(d), 0)
/** 알코올 g → 섭취 즉시 BAC 상승분(%) */
export const widmark = (g: number, kg: number, r: number) => (kg > 0 && r > 0 ? g / (kg * r * 10) : 0)
/** 소주 360ml(15.7%) 1병 환산 */
export const sojuBottles = (g: number) => g / grams(PRESETS.sojuBottle.ml, PRESETS.sojuBottle.abv)

/** 소맥: 소주 ml + 맥주 ml → 한 잔의 ml·도수 */
export function somaek(sojuMl: number, beerMl: number, sojuAbv: number = PRESETS.sojuBottle.abv, beerAbv: number = PRESETS.beer500.abv) {
  const ml = sojuMl + beerMl
  return { ml, abv: ml > 0 ? Math.round(((sojuMl * sojuAbv + beerMl * beerAbv) / ml) * 10) / 10 : 0 }
}

interface Step { t: number; after: number } // 이 시각 음주 직후 BAC

/** 음주 이벤트별 '직후 BAC' 계산 (이벤트 사이 β로 선형 감소, 0 아래로 안 내려감) */
function steps(ds: Drink[], kg: number, r: number, beta: number): Step[] {
  const ev = new Map<number, number>()
  for (const d of ds) if (d.n > 0 && d.ml > 0 && d.abv > 0) ev.set(Math.max(0, d.t), (ev.get(Math.max(0, d.t)) ?? 0) + drinkGrams(d))
  const out: Step[] = []
  let bac = 0, prev = 0
  for (const t of [...ev.keys()].sort((a, b) => a - b)) {
    bac = Math.max(0, bac - beta * (t - prev)) + widmark(ev.get(t)!, kg, r)
    out.push({ t, after: bac })
    prev = t
  }
  return out
}

/** 시작 후 h시간 시점 BAC(%) */
export function bacAt(ds: Drink[], kg: number, r: number, beta: number, h: number): number {
  let last: Step | undefined
  for (const s of steps(ds, kg, r, beta)) if (s.t <= h) last = s
  return last ? Math.max(0, last.after - beta * (h - last.t)) : 0
}

/** 이 시각 이후로 BAC가 계속 level 이하가 되는 첫 시각(시작 후 h). 음주 없으면 0. */
export function hoursUntil(ds: Drink[], kg: number, r: number, beta: number, level = 0): number {
  const st = steps(ds, kg, r, beta)
  for (let i = st.length - 1; i >= 0; i--) {
    if (st[i].after > level) return st[i].t + (st[i].after - level) / beta
  }
  return 0
}

/** 최고 BAC와 그 시각 */
export function peak(ds: Drink[], kg: number, r: number, beta: number) {
  return steps(ds, kg, r, beta).reduce((m, s) => (s.after > m.bac ? { bac: s.after, t: s.t } : m), { bac: 0, t: 0 })
}

export type Status = 'zero' | 'low' | 'suspend' | 'revoke' | 'severe'
export function status(bac: number): Status {
  if (bac <= 0) return 'zero'
  if (bac < LIMIT.suspend) return 'low' // 0 아니면 운전 금지 권고
  if (bac < LIMIT.revoke) return 'suspend'
  if (bac < LIMIT.severe) return 'revoke'
  return 'severe'
}

/** 차트용 시계열: 시작~끝(h), 간격 step */
export function series(ds: Drink[], kg: number, r: number, until: number, step = 0.25) {
  const pts: { h: number; typical: number; slow: number }[] = []
  for (let h = 0; h <= until + 1e-9; h += step) {
    pts.push({ h: +h.toFixed(4), typical: +bacAt(ds, kg, r, BETA.typical, h).toFixed(4), slow: +bacAt(ds, kg, r, BETA.slow, h).toFixed(4) })
  }
  return pts
}

// ── 시각 ──
export const parseHM = (s: string | null | undefined): number | null => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s ?? '')
  if (!m || +m[1] > 23 || +m[2] > 59) return null
  return +m[1] * 60 + +m[2]
}
export const fmtHM = (min: number) => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}
/** 시작 시각(분) + h시간 → { day: 0=당일,1=다음날.., hm } */
export function clockAt(startMin: number, h: number) {
  const abs = startMin + Math.round(h * 60)
  return { day: Math.floor(abs / 1440), hm: fmtHM(abs) }
}
/** 시작~기준시각 경과(h). 기준이 더 이르면 다음날로 봄. ponytail: 24시간 넘는 술자리는 표현 불가 */
export const elapsedH = (startMin: number, nowMin: number) => (((nowMin - startMin) % 1440) + 1440) % 1440 / 60

// ── URL 인코딩: kind~ml~abv~n~t 를 _ 로 연결 ──
export const encodeDrinks = (ds: Drink[]) => ds.map((d) => [d.kind, d.ml, d.abv, d.n, d.t].join('~')).join('_')
export function decodeDrinks(s: string | null | undefined): Drink[] | null {
  if (!s) return null
  const out: Drink[] = []
  for (const part of s.split('_')) {
    const [k, ml, abv, n, t] = part.split('~')
    const v = [ml, abv, n, t].map(Number)
    if (!KINDS.includes(k as Kind) || v.some((x) => !Number.isFinite(x) || x < 0) || v[1] > 100) continue
    out.push({ kind: k as Kind, ml: v[0], abv: v[1], n: v[2], t: v[3] })
  }
  return out.length ? out.slice(0, 30) : null
}
