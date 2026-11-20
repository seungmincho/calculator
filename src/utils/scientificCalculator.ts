// 공학용 계산기 — 식 문자열을 토큰으로 자르고 재귀 하강으로 바로 계산한다(eval 없음).
// 우선순위(낮음 → 높음): + − · × ÷ · nPr nCr · 생략된 곱셈(2π, 3(4+5)) · 단항 − · ^(오른쪽 결합) · 후위 ! % · 괄호·함수·수
// 그래서 −2^2 = −4, 2^3^2 = 512, 1÷2π = 1÷(2π) (구글·카시오와 같음)

export type Angle = 'deg' | 'rad'
export type CalcError = 'syntax' | 'paren' | 'divZero' | 'domain' | 'undefined' | 'overflow'
export type CalcResult = { ok: true; value: number } | { ok: false; error: CalcError }

export const MAX_EXPR = 300
export const HISTORY_MAX = 20
export const HISTORY_KEY = 'toolhub-scientific-calculator-history-v1'
export const SETTINGS_KEY = 'toolhub-scientific-calculator-settings-v1'

const FNS = ['asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh', 'sqrt', 'cbrt', 'sin', 'cos', 'tan', 'log', 'abs', 'exp', 'ln'] as const
type Fn = (typeof FNS)[number] | 'log2'
type Tok =
  | { t: 'num'; v: number }
  | { t: 'op'; v: '+' | '-' | '*' | '/' | '^' | '!' | '%' | 'P' | 'C' }
  | { t: 'lp' } | { t: 'rp' }
  | { t: 'fn'; v: Fn }
  | { t: 'const'; v: 'pi' | 'e' | 'ans' }

class CalcErr extends Error {
  code: CalcError
  constructor(code: CalcError) { super(code); this.code = code }
}
const fail = (code: CalcError): never => { throw new CalcErr(code) }
const chk = (v: number) => (Number.isFinite(v) ? v : fail(Number.isNaN(v) ? 'domain' : 'overflow'))

const SYMBOLS: Record<string, Tok> = {
  '+': { t: 'op', v: '+' }, '-': { t: 'op', v: '-' }, '−': { t: 'op', v: '-' }, '–': { t: 'op', v: '-' },
  '*': { t: 'op', v: '*' }, '×': { t: 'op', v: '*' }, '·': { t: 'op', v: '*' }, '/': { t: 'op', v: '/' }, '÷': { t: 'op', v: '/' },
  '^': { t: 'op', v: '^' }, '!': { t: 'op', v: '!' }, '%': { t: 'op', v: '%' }, 'P': { t: 'op', v: 'P' }, 'C': { t: 'op', v: 'C' },
  '(': { t: 'lp' }, ')': { t: 'rp' }, 'π': { t: 'const', v: 'pi' }, '√': { t: 'fn', v: 'sqrt' }, '∛': { t: 'fn', v: 'cbrt' },
}
// 긴 이름부터: 'pie' → pi·e, 'exp' 는 e·xp 가 아니라 exp
const NAMES = [...FNS, 'ans', 'pi', 'e'].sort((a, b) => b.length - a.length)

export function tokenize(src: string): Tok[] {
  const out: Tok[] = []
  let i = 0
  while (i < src.length) {
    const c = src[i]
    if (/\s/.test(c)) { i++; continue }
    if (/[\d.]/.test(c)) {
      const m = /^(\d*\.?\d*)(?:[eE]([+\-−]?\d+))?/.exec(src.slice(i))!
      // 'e' 뒤에 숫자가 없으면(2e) 지수가 아니라 상수 e 와의 곱
      const body = m[1]
      if (body === '.' || body === '') fail('syntax')
      const exp = m[2] ? m[2].replace('−', '-') : null
      out.push({ t: 'num', v: Number(exp === null ? body : `${body}e${exp}`) })
      i += m[0].length
      continue
    }
    if (src.startsWith('log₂', i) || src.startsWith('log2(', i)) { out.push({ t: 'fn', v: 'log2' }); i += 4; continue }
    // 대문자 P·C 는 nPr·nCr, E 는 지수 자리에서만 뜻이 있다(혼자 오면 잘못된 식)
    if (/[a-zA-Z]/.test(c) && c !== 'P' && c !== 'C' && c !== 'E') {
      const rest = src.slice(i).toLowerCase()
      const name = NAMES.find((n) => rest.startsWith(n)) ?? fail('syntax')
      out.push(name === 'pi' || name === 'e' || name === 'ans' ? { t: 'const', v: name } : { t: 'fn', v: name as Fn })
      i += name.length
      continue
    }
    out.push(SYMBOLS[c] ?? fail('syntax'))
    i++
  }
  return out
}

const RAD = Math.PI / 180
const mod = (x: number, m: number) => ((x % m) + m) % m
/** 도 단위 sin: 30°·90° 배수는 정확한 값 */
function sinDeg(d: number) {
  const r = mod(d, 360)
  if (r % 90 === 0) return [0, 1, 0, -1][r / 90]
  if (r === 30 || r === 150) return 0.5
  if (r === 210 || r === 330) return -0.5
  return Math.sin(r * RAD)
}
function tanDeg(d: number) {
  const r = mod(d, 180)
  if (r === 90) return fail('undefined')
  return r === 0 ? 0 : r === 45 ? 1 : r === 135 ? -1 : Math.tan(r * RAD)
}
/** 라디안: sin(π) = 1.2e-16 같은 부동소수 찌꺼기를 0 으로. |x|≥1 일 때만이라 sin(1e-20) 같은 진짜 작은 값은 남는다 */
const snap = (y: number, x: number) => (Math.abs(x) >= 1 && Math.abs(y) < Math.abs(x) * 1e-15 ? 0 : y)
/** 도 변환 찌꺼기 제거: asin(0.5) = 30.000000000000004 → 30 */
const p15 = (v: number) => Number(v.toPrecision(15))
const isInt = (x: number) => Math.abs(x - Math.round(x)) < 1e-9

function factorial(x: number) {
  if (x < 0 || !isInt(x) || x > 170) fail('domain')
  let r = 1
  for (let k = 2; k <= Math.round(x); k++) r *= k
  return r
}
function perm(n: number, r: number, comb: boolean) {
  if (n < 0 || r < 0 || !isInt(n) || !isInt(r) || r > n) fail('domain')
  n = Math.round(n); r = Math.round(r)
  if (comb) r = Math.min(r, n - r)
  let v = 1
  for (let k = 0; k < r; k++) v = comb ? (v * (n - k)) / (k + 1) : v * (n - k)
  return chk(comb ? Math.round(v) : v)
}
function pow(b: number, e: number) {
  if (b === 0 && e < 0) fail('divZero')
  return chk(Math.pow(b, e))
}

function applyFn(f: Fn, x: number, angle: Angle): number {
  const deg = angle === 'deg'
  switch (f) {
    case 'sin': return deg ? sinDeg(x) : snap(Math.sin(x), x)
    case 'cos': return deg ? sinDeg(x + 90) : snap(Math.cos(x), x)
    case 'tan': {
      if (deg) return tanDeg(x)
      const c = snap(Math.cos(x), x)
      return c === 0 ? fail('undefined') : snap(Math.sin(x), x) / c
    }
    case 'asin': case 'acos': {
      if (x < -1 || x > 1) fail('domain')
      const r = f === 'asin' ? Math.asin(x) : Math.acos(x)
      return deg ? p15(r / RAD) : r
    }
    case 'atan': return deg ? p15(Math.atan(x) / RAD) : Math.atan(x)
    case 'sinh': return chk(Math.sinh(x))
    case 'cosh': return chk(Math.cosh(x))
    case 'tanh': return Math.tanh(x)
    case 'log': case 'ln': case 'log2':
      if (x <= 0) fail('domain')
      return f === 'log' ? Math.log10(x) : f === 'ln' ? Math.log(x) : Math.log2(x)
    case 'sqrt': return x < 0 ? fail('domain') : Math.sqrt(x)
    case 'cbrt': return Math.cbrt(x)
    case 'abs': return Math.abs(x)
    case 'exp': return chk(Math.exp(x))
  }
}

function parse(toks: Tok[], angle: Angle, ans: number): number {
  let i = 0
  const peek = () => toks[i]
  const isOp = (...ops: string[]) => peek()?.t === 'op' && ops.includes((peek() as { v: string }).v)
  // 닫는 괄호가 모자라면 식 끝에서 닫은 것으로 본다
  const close = () => { if (peek()?.t === 'rp') i++; else if (peek()) fail('syntax') }

  const expr = (): number => {
    let v = term()
    while (isOp('+', '-')) {
      const op = (toks[i++] as { v: string }).v
      v = chk(op === '+' ? v + term() : v - term())
    }
    return v
  }
  const term = (): number => {
    let v = combo()
    while (isOp('*', '/')) {
      const op = (toks[i++] as { v: string }).v
      const r = combo()
      if (op === '/' && r === 0) fail('divZero')
      v = chk(op === '*' ? v * r : v / r)
    }
    return v
  }
  const combo = (): number => {
    let v = implicit()
    while (isOp('P', 'C')) {
      const op = (toks[i++] as { v: string }).v
      v = perm(v, implicit(), op === 'C')
    }
    return v
  }
  // 2π, 3(4+5), (1+2)(3+4), 2sin(30). 숫자 바로 뒤 숫자(π2 · (2)3)는 잘못된 식
  const implicit = (): number => {
    let v = unary()
    while (peek() && (peek().t === 'lp' || peek().t === 'fn' || peek().t === 'const')) v = chk(v * unary())
    return v
  }
  const unary = (): number => {
    if (isOp('-')) { i++; return -unary() }
    if (isOp('+')) { i++; return unary() }
    return power()
  }
  const power = (): number => {
    const b = postfix()
    if (isOp('^')) { i++; return pow(b, unary()) }
    return b
  }
  const postfix = (): number => {
    let v = primary()
    while (isOp('!', '%')) v = (toks[i++] as { v: string }).v === '!' ? factorial(v) : v / 100
    return v
  }
  const primary = (): number => {
    const tk = toks[i++]
    if (!tk) return fail('syntax')
    switch (tk.t) {
      case 'num': return chk(tk.v)
      case 'const': return tk.v === 'pi' ? Math.PI : tk.v === 'e' ? Math.E : ans
      case 'lp': { const v = expr(); close(); return v }
      case 'fn': {
        if (peek()?.t === 'lp') { i++; const v = expr(); close(); return applyFn(tk.v, v, angle) }
        return applyFn(tk.v, unary(), angle)
      }
      default: return fail('syntax')
    }
  }

  const v = expr()
  if (i < toks.length) fail(toks[i].t === 'rp' ? 'paren' : 'syntax')
  return v
}

export function evaluate(src: string, angle: Angle = 'deg', ans = 0): CalcResult {
  try {
    if (!src.trim() || src.length > MAX_EXPR) return { ok: false, error: 'syntax' }
    const v = parse(tokenize(src), angle, ans)
    return { ok: true, value: v === 0 ? 0 : v } // -0 → 0
  } catch (e) {
    return { ok: false, error: e instanceof CalcErr ? e.code : 'syntax' } // 깊은 괄호의 RangeError 등
  }
}

/** 유효숫자 12자리로 반올림(0.1+0.2 → 0.3). 1e15 이상·1e-6 미만은 1.5E+20 꼴. grouping 이면 정수부에 쉼표 */
export function formatNumber(x: number, grouping = false): string {
  if (x === 0) return '0'
  const a = Math.abs(x)
  if (a >= 1e15 || a < 1e-6) {
    const [m, e] = x.toExponential(11).split('e')
    return `${m.replace(/\.?0+$/, '')}E${e}`
  }
  const s = String(Number.isInteger(x) ? x : Number(x.toPrecision(12)))
  if (!grouping) return s
  const [int, frac] = s.split('.')
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (frac ? `.${frac}` : '')
}

const TAIL_TOKEN = /(?:asin|acos|atan|sinh|cosh|tanh|sqrt|cbrt|sin|cos|tan|log₂|log|abs|exp|ln)\($|Ans$/
/** 지우기: 'sin(' · 'Ans' 는 한 번에 */
export function backspace(s: string) {
  const cut = s.replace(TAIL_TOKEN, '')
  return cut === s ? s.slice(0, -1) : cut
}

/** 공유 링크용: Ans 를 그 값으로 바꿔 받는 사람도 같은 결과가 나오게 */
export const inlineAns = (s: string, ans: number) => s.replace(/Ans/g, `(${formatNumber(ans)})`)

export type HistoryItem = { expr: string; result: string }
export function parseHistory(raw: string | null): HistoryItem[] {
  try {
    const v: unknown = JSON.parse(raw ?? '[]')
    if (!Array.isArray(v)) return []
    return v.filter((h): h is HistoryItem => typeof h?.expr === 'string' && typeof h?.result === 'string' && h.expr.length <= MAX_EXPR)
      .slice(0, HISTORY_MAX)
  } catch { return [] }
}
