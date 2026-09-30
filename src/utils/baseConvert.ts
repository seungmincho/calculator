// 진법 변환 순수 로직 (BigInt 유리수 → 임의 크기·정확한 소수·순환마디).
// 검증: node scripts/check-base-convert.ts

export interface Rational { num: bigint; den: bigint } // den > 0, 기약분수 아님(표시엔 무관)

const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const PREFIX: Record<number, string> = { 2: '0b', 8: '0o', 16: '0x' }
export const prefixOf = (base: number) => PREFIX[base] ?? ''

const abs = (n: bigint) => (n < BigInt(0) ? -n : n)
const gcd = (a: bigint, b: bigint): bigint => { a = abs(a); b = abs(b); while (b) [a, b] = [b, a % b]; return a }
export const reduce = (r: Rational): Rational => { const g = gcd(r.num, r.den) || BigInt(1); return { num: r.num / g, den: r.den / g } }
export const isInteger = (r: Rational) => r.num % r.den === BigInt(0)
/** 0 방향으로 자른 정수부 */
export const intPart = (r: Rational) => r.num / r.den

/**
 * base 진법 문자열 → 유리수. 허용: 부호, 접두사(해당 진법만: 0b/0o/0x), 공백·_·, 구분자,
 * 소수점, 순환마디 괄호 "0.0(0011)", 끝의 "…"(잘린 표시). 잘못된 입력은 null.
 */
export function parse(text: string, base: number): Rational | null {
  let s = text.replace(/[\s_,]/g, '').replace(/…$/, '').toUpperCase()
  let neg = false
  if (s[0] === '-' || s[0] === '+') { neg = s[0] === '-'; s = s.slice(1) }
  const p = prefixOf(base).toUpperCase()
  if (p && s.startsWith(p)) s = s.slice(2)
  const m = /^([0-9A-Z]*)(?:\.([0-9A-Z]*)(?:\(([0-9A-Z]+)\))?)?$/.exec(s)
  if (!m) return null
  const [, ip, fp = '', rp = ''] = m
  if (!ip && !fp && !rp) return null
  const B = BigInt(base)
  const val = (str: string): bigint | null => {
    let v = BigInt(0)
    for (const ch of str) {
      const d = DIGITS.indexOf(ch)
      if (d < 0 || d >= base) return null
      v = v * B + BigInt(d)
    }
    return v
  }
  const I = val(ip), F = val(fp), R = val(rp)
  if (I === null || F === null || R === null) return null
  // x = I + F/B^k + R/(B^k (B^p - 1))
  const bk = B ** BigInt(fp.length)
  let num: bigint, den: bigint
  if (rp) {
    const bp1 = B ** BigInt(rp.length) - BigInt(1)
    den = bk * bp1
    num = I * den + F * bp1 + R
  } else {
    den = bk
    num = I * den + F
  }
  const r = reduce({ num: neg ? -num : num, den })
  return r
}

export interface Formatted { neg: boolean; int: string; frac: string; rep: string; truncated: boolean }

/** 유리수 → base 진법. 소수부는 순환 감지, maxFrac 자리 넘으면 truncated. */
export function format(r: Rational, base: number, maxFrac = 32): Formatted {
  const B = BigInt(base)
  const neg = r.num < BigInt(0)
  const n = abs(r.num)
  const int = (n / r.den).toString(base).toUpperCase()
  let rem = n % r.den
  const seen = new Map<bigint, number>()
  let digits = ''
  while (rem !== BigInt(0) && digits.length < maxFrac) {
    if (seen.has(rem)) {
      const at = seen.get(rem)!
      return { neg, int, frac: digits.slice(0, at), rep: digits.slice(at), truncated: false }
    }
    seen.set(rem, digits.length)
    rem *= B
    digits += DIGITS[Number(rem / r.den)]
    rem %= r.den
  }
  // 마지막 자리 직후 순환 시작(예: 0.(3) 에서 maxFrac=1)도 잡아냄
  if (rem !== BigInt(0) && seen.has(rem)) {
    const at = seen.get(rem)!
    return { neg, int, frac: digits.slice(0, at), rep: digits.slice(at), truncated: false }
  }
  return { neg, int, frac: digits, rep: '', truncated: rem !== BigInt(0) }
}

export interface ShowOpts { prefix?: boolean; group?: number; sep?: string; maxFrac?: number }

/** 정수부 자릿수 묶기 (오른쪽부터). pad=true면 앞을 0으로 채워 묶음 크기의 배수로. */
export function groupDigits(s: string, size: number, sep = ' ', pad = false): string {
  if (!size || s.length <= size && !pad) return s
  if (pad) s = s.padStart(Math.ceil(s.length / size) * size, '0')
  const out: string[] = []
  for (let i = s.length; i > 0; i -= size) out.unshift(s.slice(Math.max(0, i - size), i))
  return out.join(sep)
}

export function toText(f: Formatted, base: number, o: ShowOpts = {}): string {
  const int = o.group ? groupDigits(f.int, o.group, o.sep ?? ' ', base === 2) : f.int
  const tail = f.frac || f.rep ? '.' + f.frac + (f.rep ? `(${f.rep})` : '') : ''
  return `${f.neg ? '-' : ''}${o.prefix ? prefixOf(base) : ''}${int}${tail}${f.truncated ? '…' : ''}`
}

export const show = (r: Rational, base: number, o: ShowOpts = {}) => toText(format(r, base, o.maxFrac), base, o)

/** 유리수 → JS number (IEEE 754 입력용). 10진 문자열 경유라 반올림은 Number()가 처리. */
export function toNumber(r: Rational): number {
  const f = format(r, 10, 40)
  return Number(`${f.neg ? '-' : ''}${f.int}.${f.frac}${f.rep.repeat(Math.ceil(40 / Math.max(1, f.rep.length)))}`)
}

// ── 부호 있는 정수 (w비트) ──────────────────────────────────────
export const WIDTHS = [8, 16, 32, 64] as const
export const range = (w: number) => {
  const h = BigInt(1) << BigInt(w - 1)
  return { sMin: -h, sMax: h - BigInt(1), uMax: (h << BigInt(1)) - BigInt(1), smMin: -(h - BigInt(1)) }
}
export const mask = (w: number) => (BigInt(1) << BigInt(w)) - BigInt(1)

/** 2의 보수 비트패턴 (범위 밖이면 하위 w비트로 wrap, overflow=true) */
export function twos(v: bigint, w: number) {
  const { sMin, uMax } = range(w)
  return { bits: BigInt.asUintN(w, v), overflow: v < sMin || v > uMax, signedOnly: v < BigInt(0), unsignedOnly: v > range(w).sMax }
}
/** 1의 보수 비트패턴. 표현 불가(범위 밖)면 null */
export function ones(v: bigint, w: number): bigint | null {
  const { smMin, sMax } = range(w)
  if (v < smMin || v > sMax) return null
  return v >= BigInt(0) ? v : ~(-v) & mask(w)
}
/** 부호-크기 비트패턴. 표현 불가면 null */
export function signMag(v: bigint, w: number): bigint | null {
  const { smMin, sMax } = range(w)
  if (v < smMin || v > sMax) return null
  return v >= BigInt(0) ? v : (BigInt(1) << BigInt(w - 1)) | -v
}
/** 같은 비트패턴을 4가지로 해석. 1의 보수·부호-크기는 "-0"이 있어 문자열. */
export function decode(bits: bigint, w: number) {
  const top = (bits >> BigInt(w - 1)) & BigInt(1)
  const low = bits & (mask(w) >> BigInt(1))
  return {
    unsigned: bits,
    twos: BigInt.asIntN(w, bits),
    ones: top ? (low === mask(w - 1) ? '-0' : '-' + (~bits & mask(w)).toString()) : bits.toString(),
    signMag: top ? '-' + low.toString() : low.toString(),
  }
}
export const bitString = (bits: bigint, w: number) => bits.toString(2).padStart(w, '0')

// ── IEEE 754 ───────────────────────────────────────────────────
export type FloatKind = 'zero' | 'subnormal' | 'normal' | 'inf' | 'nan'
export interface Ieee {
  bits: bigint; width: 32 | 64; sign: number; expBits: string; mantBits: string
  expRaw: number; bias: number; exp: number; kind: FloatKind; hex: string
  stored: Rational | null // 실제 저장된 값(정확), inf/nan은 null
}
export function ieee(x: number, width: 32 | 64): Ieee {
  const dv = new DataView(new ArrayBuffer(8))
  let bits: bigint
  if (width === 32) { dv.setFloat32(0, x); bits = BigInt(dv.getUint32(0)) } else { dv.setFloat64(0, x); bits = dv.getBigUint64(0) }
  const eW = width === 32 ? 8 : 11, mW = width === 32 ? 23 : 52
  const bias = (1 << (eW - 1)) - 1
  const s = bitString(bits, width)
  const expRaw = parseInt(s.slice(1, 1 + eW), 2)
  const mant = BigInt('0b' + s.slice(1 + eW))
  const kind: FloatKind = expRaw === (1 << eW) - 1 ? (mant ? 'nan' : 'inf') : expRaw === 0 ? (mant ? 'subnormal' : 'zero') : 'normal'
  let stored: Rational | null = null
  if (kind !== 'inf' && kind !== 'nan') {
    const sig = kind === 'normal' ? (BigInt(1) << BigInt(mW)) | mant : mant
    const e = (kind === 'normal' ? expRaw : 1) - bias - mW // 값 = sig × 2^e
    const num = e >= 0 ? sig << BigInt(e) : sig
    stored = { num: s[0] === '1' ? -num : num, den: e >= 0 ? BigInt(1) : BigInt(1) << BigInt(-e) }
  }
  return {
    bits, width, sign: Number(s[0]), expBits: s.slice(1, 1 + eW), mantBits: s.slice(1 + eW),
    expRaw, bias, exp: kind === 'normal' ? expRaw - bias : kind === 'subnormal' || kind === 'zero' ? 1 - bias : 0,
    kind, hex: bits.toString(16).toUpperCase().padStart(width / 4, '0'), stored,
  }
}
/** "0.1", "-0", "Infinity", "inf", "NaN" 등 → number (빈 값/잘못된 값 null) */
export function parseFloatInput(text: string): number | null {
  const s = text.trim().replace(/[\s_,]/g, '').toLowerCase()
  if (!s) return null
  const m = /^([+-]?)(inf|infinity|∞)$/.exec(s)
  if (m) return m[1] === '-' ? -Infinity : Infinity
  if (s === 'nan') return NaN
  if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/.test(s)) return null
  return Number(s)
}

// ── 풀이 과정 (학습용) ──────────────────────────────────────────
/** 정수 → base: 나눗셈. 나머지를 아래→위로 읽음 */
export function divisionSteps(n: bigint, base: number, limit = 70) {
  const B = BigInt(base)
  const steps: { n: bigint; q: bigint; r: number }[] = []
  n = abs(n)
  while (n > BigInt(0) && steps.length < limit) { steps.push({ n, q: n / B, r: Number(n % B) }); n /= B }
  return { steps, truncated: n > BigInt(0) }
}
/** 소수부 → base: 곱셈. 정수부를 위→아래로 읽음. repeatAt: 순환 시작 단계 */
export function fractionSteps(r: Rational, base: number, limit = 12) {
  const B = BigInt(base)
  let rem = abs(r.num) % r.den
  const steps: { frac: Rational; product: Rational; digit: number }[] = []
  const seen = new Map<bigint, number>()
  while (rem !== BigInt(0) && steps.length < limit) {
    if (seen.has(rem)) return { steps, repeatAt: seen.get(rem)!, truncated: false }
    seen.set(rem, steps.length)
    const p = rem * B
    steps.push({ frac: { num: rem, den: r.den }, product: { num: p, den: r.den }, digit: Number(p / r.den) })
    rem = p % r.den
  }
  return { steps, repeatAt: rem !== BigInt(0) && seen.has(rem) ? seen.get(rem)! : -1, truncated: rem !== BigInt(0) && !seen.has(rem) }
}
/** base 진법 자리값 합: 각 자리 digit × base^power */
export function placeTerms(f: Formatted, base: number) {
  const terms: { digit: number; power: number }[] = []
  const intD = f.int === '0' ? '' : f.int
  ;[...intD].forEach((ch, i) => terms.push({ digit: DIGITS.indexOf(ch), power: intD.length - 1 - i }))
  ;[...f.frac].forEach((ch, i) => terms.push({ digit: DIGITS.indexOf(ch), power: -(i + 1) }))
  return terms
}
/** 2진 → 8/16진 묶음법: 오른쪽부터 3/4비트씩 */
export function groupSteps(binInt: string, bitsPer: 3 | 4) {
  return groupDigits(binInt, bitsPer, ' ', true).split(' ').map((b) => ({ bits: b, digit: DIGITS[parseInt(b, 2)] }))
}

// ── 텍스트 ↔ UTF-8 바이트 ───────────────────────────────────────
export const textToBytes = (s: string) => new TextEncoder().encode(s)
export const bytesToText = (b: Uint8Array) => {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(b) } catch { return null }
}
export const showBytes = (b: Uint8Array, base: 2 | 10 | 16) =>
  [...b].map((x) => base === 16 ? x.toString(16).toUpperCase().padStart(2, '0') : base === 2 ? x.toString(2).padStart(8, '0') : String(x)).join(' ')
/** "48 65 6C" / "0x48,0x65" / "01001000 01100101" → 바이트. base: 2 | 16 */
export function parseBytes(s: string, base: 2 | 16): Uint8Array | null {
  const clean = s.replace(/0x|0b/gi, ' ').trim()
  if (!clean) return new Uint8Array()
  const tokens = clean.split(/[\s,]+/).filter(Boolean)
  const per = base === 16 ? 2 : 8
  const re = base === 16 ? /^[0-9a-f]+$/i : /^[01]+$/
  const parts = tokens.length === 1 && tokens[0].length > per ? tokens[0].match(new RegExp(`.{1,${per}}`, 'g'))! : tokens
  const out: number[] = []
  for (const p of parts) {
    if (!re.test(p) || p.length > per) return null
    out.push(parseInt(p, base))
  }
  return new Uint8Array(out)
}
