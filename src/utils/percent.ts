// 퍼센트 계산 순수 로직 (회귀: node scripts/check-percent.ts)

/** 부동소수 잔재 제거: 0.1+0.2 → 0.3 */
export const clean = (n: number): number => (Number.isFinite(n) ? parseFloat(n.toPrecision(12)) : n)

/** 소수 d자리 반올림 (0.5는 0에서 먼 쪽). 1.005 → 1.01 */
export function round(n: number, d: number): number {
  const c = clean(n)
  const s = Math.sign(c)
  const a = Math.abs(c)
  const str = `${a}`
  // 지수표기: 큰 수(1e21)는 소수부 없음, 작은 수(1e-7)는 곱셈 반올림
  if (str.includes('e')) return a >= 1 ? c : s * (Math.round(a * 10 ** d) / 10 ** d) || 0
  const r = Number(`${Math.round(Number(`${str}e${d}`))}e-${d}`)
  return s * r || 0 // -0 → 0
}

const BIG: Record<string, number> = { 조: 1e12, 억: 1e8, 만: 1e4 }
const SMALL: Record<string, number> = { 천: 1e3, 백: 100, 십: 10 }

/**
 * "12,000" "5만" "3.5만" "1억 2천만" "5천원" "15%" "-3" → 숫자. 빈 값/해석 불가 → null
 */
export function parseNum(input: string): number | null {
  let s = input.replace(/[,\s원%]|퍼센트/g, '')
  if (!s) return null
  let sign = 1
  if (/^[-+−]/.test(s)) { if (s[0] !== '+') sign = -1; s = s.slice(1) }
  if (/^(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s)) return sign * Number(s)
  const tokens = s.match(/\d+(?:\.\d+)?|\.\d+|[천백십]|[조억만]/g)
  if (!tokens || tokens.join('') !== s) return null
  let total = 0, section = 0
  let pending: number | null = null
  for (const tk of tokens) {
    if (tk in SMALL) { section += (pending ?? 1) * SMALL[tk]; pending = null }
    else if (tk in BIG) { section += pending ?? 0; total += (section || 1) * BIG[tk]; section = 0; pending = null }
    else { if (pending !== null) return null; pending = Number(tk) }
  }
  return clean(sign * (total + section + (pending ?? 0)))
}

// ── 계산 ── (불가능하면 null)
export const percentOf = (a: number, p: number) => clean((a * p) / 100)
export const ratio = (part: number, whole: number) => (whole === 0 ? null : clean((part / whole) * 100))
/** 증감률: 기준이 음수여도 방향이 맞도록 |from|으로 나눔 */
export const change = (from: number, to: number) => ({
  diff: clean(to - from),
  pct: from === 0 ? null : clean(((to - from) / Math.abs(from)) * 100),
})
export const discount = (price: number, rate: number) => {
  const off = clean((price * rate) / 100)
  return { off, sale: clean(price - off) }
}
/** 할인가·할인율 → 정가 */
export const originalPrice = (sale: number, rate: number) => (rate >= 100 ? null : clean(sale / (1 - rate / 100)))
/** 연속 할인 실효율(%) : 1 − Π(1 − r) */
export const chainRate = (rates: number[]) => clean((1 - rates.reduce((m, r) => m * (1 - r / 100), 1)) * 100)
/** 부가세 10% 포함가 → 공급가·세액 */
export const vatSplit = (total: number) => {
  const supply = clean(total / 1.1)
  return { supply, vat: clean(total - supply) }
}

// ── 표시 ──
/** 소수 최대 d자리, 천단위 콤마 */
export const fmt = (n: number, d: number) => round(n, d).toLocaleString('ko-KR', { maximumFractionDigits: d })

/** 1억 2,345만 6,789 (만 미만은 그대로) */
export function fmtKo(n: number, d: number): string {
  const r = round(n, d)
  const a = Math.abs(r)
  if (a < 1e4) return fmt(r, d)
  const int = Math.trunc(a)
  const frac = round(a - int, d)
  const parts: string[] = []
  let rest = int
  for (const [u, m] of [['조', 1e12], ['억', 1e8], ['만', 1e4]] as const) {
    const q = Math.floor(rest / m)
    if (q) parts.push(`${q.toLocaleString('ko-KR')}${u}`)
    rest -= q * m
  }
  const tail = rest + frac
  if (tail) parts.push(fmt(tail, d))
  return (r < 0 ? '-' : '') + parts.join(' ')
}

// ── 한 줄 입력 해석 ──
export type Query =
  | { kind: 'of'; a: number; p: number }
  | { kind: 'ratio'; part: number; whole: number }
  | { kind: 'change'; from: number; to: number }
  | { kind: 'discount'; price: number; rate: number }
  | { kind: 'reverse'; sale: number; rate: number }

const N = String.raw`([-+]?[\d.,]+(?:\s*[조억만천백십]+)?(?:\s*[\d.,]+\s*[조억만천백십]+)*(?:[\d.,]+)?)\s*원?`
const P = String.raw`\s*(?:%|퍼센트|프로)`
const re = (s: string) => new RegExp(`^\\s*${s}\\s*[?？]?\\s*$`, 'i')

const RULES: [RegExp, (m: number[]) => Query][] = [
  // 할인가 역산: "7만 30% 할인된 가격" / "30% 할인해서 7만"
  [re(`${N}\\s*(?:은|는|이|가)?\\s*${N}${P}\\s*할인(?:된|한)?\\s*(?:가격|값)?\\s*(?:의)?\\s*(?:정가|원가|원래\\s*가격)`), ([s, r]) => ({ kind: 'reverse', sale: s, rate: r })],
  [re(`${N}${P}\\s*할인(?:해서|하면|받아서|된\\s*가격이?)\\s*${N}(?:이면|면)?.*`), ([r, s]) => ({ kind: 'reverse', sale: s, rate: r })],
  // 할인: "12만 30% 할인" "12만에서 30% 세일" "12만 30% off"
  [re(`${N}\\s*(?:에서|의)?\\s*${N}${P}\\s*(?:할인|세일|off|DC|디씨)`), ([p, r]) => ({ kind: 'discount', price: p, rate: r })],
  // 비율: "300은 1200의 몇 %" "300/1200" "what % of"
  [re(`${N}\\s*(?:은|는|이|가)\\s*${N}\\s*(?:의)?\\s*몇\\s*(?:%|퍼센트|프로)`), ([a, b]) => ({ kind: 'ratio', part: a, whole: b })],
  [re(`${N}\\s*(?:is\\s+)?what\\s*(?:%|percent)\\s*of\\s*${N}`), ([a, b]) => ({ kind: 'ratio', part: a, whole: b })],
  [re(`${N}\\s*/\\s*${N}`), ([a, b]) => ({ kind: 'ratio', part: a, whole: b })],
  // X의 Y%: "5만원의 15%" "15% of 50000" "50000 × 15%"
  [re(`${N}\\s*(?:의|x|×|\\*)\\s*${N}${P}\\s*(?:는|은)?`), ([a, p]) => ({ kind: 'of', a, p })],
  [re(`${N}${P}\\s*of\\s*${N}`), ([p, a]) => ({ kind: 'of', a, p })],
  // 증감: "3만→4만" "3만 -> 4만" "3만에서 4만(으로)"
  [re(`${N}\\s*(?:→|->|=>|에서|~)\\s*${N}\\s*(?:으로|로)?(?:\\s*(?:증감률|변화율|상승률|인상률|증가율))?`), ([f, t]) => ({ kind: 'change', from: f, to: t })],
]

export function parseQuery(text: string): Query | null {
  for (const [rx, make] of RULES) {
    const m = text.match(rx)
    if (!m) continue
    const nums = m.slice(1).filter((x) => x !== undefined).map(parseNum)
    if (nums.some((x) => x === null)) continue
    return make(nums as number[])
  }
  return null
}
