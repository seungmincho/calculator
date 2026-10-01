// 로마 숫자 변환 (순수 로직). 회귀 체크: node scripts/check-roman.ts
// 표준 표기 1~3,999 + 확장 표기(vinculum: 위 줄 = ×1000) 4,000~3,999,999.

export const MAX_STD = 3999
export const MAX_EXT = 3_999_999
export const OVERLINE = '̅'

const TABLE: [number, string][] = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
  [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
  [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
]
const VAL: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 }
const SUBTRACTIVE = new Set(['IV', 'IX', 'XL', 'XC', 'CD', 'CM'])

export const overline = (s: string) => s.split('').map((c) => c + OVERLINE).join('')

function stdRoman(n: number): string {
  let out = ''
  for (const [v, s] of TABLE) while (n >= v) { out += s; n -= v }
  return out
}

/** 1~3,999,999 → 로마 숫자. 4,000 이상은 천의 자리 묶음에 위 줄(U+0305). 범위 밖이면 '' */
export function toRoman(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > MAX_EXT) return ''
  if (n <= MAX_STD) return stdRoman(n)
  return overline(stdRoman(Math.floor(n / 1000))) + stdRoman(n % 1000)
}

export interface Part { value: number; roman: string }

/** 자릿수별 분해: 2026 → MM(2000) + XX(20) + VI(6) */
export function romanParts(n: number): Part[] {
  if (!toRoman(n)) return []
  if (n > MAX_STD) {
    const high = romanParts(Math.floor(n / 1000)).map((p) => ({ value: p.value * 1000, roman: overline(p.roman) }))
    return [...high, ...(n % 1000 ? romanParts(n % 1000) : [])]
  }
  const parts: Part[] = []
  for (let place = 1000; place >= 1; place /= 10) {
    const v = Math.floor(n / place) % 10 * place
    if (v) parts.push({ value: v, roman: stdRoman(v) })
  }
  return parts
}

export type Reason = 'empty' | 'badChar' | 'repeat' | 'repeatFive' | 'badSubtract' | 'overline' | 'order'
  | 'notInteger' | 'zero' | 'tooBig'

export interface RomanParse {
  /** 표준 표기 여부 */
  ok: boolean
  /** 왼쪽부터 규칙대로 읽은 값 (비표준이어도 계산 가능하면 채움, 아니면 0) */
  value: number
  /** value의 표준 표기 ('' = 계산 불가) */
  canonical: string
  reason?: Reason
  /** reason 설명용 (문제 글자/조합) */
  detail?: string
}

// 왼쪽부터: 다음 기호가 더 크면 빼고 아니면 더함
function additive(s: string): number {
  let v = 0
  for (let i = 0; i < s.length; i++) {
    const a = VAL[s[i]], b = VAL[s[i + 1]] ?? 0
    v += a < b ? -a : a
  }
  return v
}

function diagnose(s: string): { reason: Reason; detail: string } | null {
  let m = s.match(/([IXCM])\1{3,}/)
  if (m) return { reason: 'repeat', detail: m[0] }
  m = s.match(/([VLD]).*\1/)
  if (m) return { reason: 'repeatFive', detail: m[1] }
  for (let i = 0; i + 1 < s.length; i++) {
    const pair = s[i] + s[i + 1]
    if (VAL[s[i]] < VAL[s[i + 1]] && !SUBTRACTIVE.has(pair)) return { reason: 'badSubtract', detail: pair }
  }
  return null
}

/** 입력 정리: 공백 제거, 유니코드 로마 숫자(Ⅻ·ⅻ)는 NFKC로 라틴 글자로, 대문자화 */
export const normalizeRoman = (input: string) => input.replace(/\s+/g, '').normalize('NFKC').toUpperCase()

/** 로마 숫자 해석 (엄격 검증 + 비표준이면 이유와 표준형) */
export function parseRoman(input: string): RomanParse {
  const s = normalizeRoman(input)
  const fail = (reason: Reason, detail = ''): RomanParse => ({ ok: false, value: 0, canonical: '', reason, detail })
  if (!s) return fail('empty')
  const bad = [...new Set(s.replace(/[IVXLCDM̅]/g, ''))].join('')
  if (bad) return fail('badChar', bad)

  // 위 줄 붙은 글자(×1000)는 맨 앞에 연속으로만
  const m = s.match(/^((?:[IVXLCDM]̅)*)([IVXLCDM]*)$/)
  if (!m) return fail('overline')
  const high = m[1].replace(/̅/g, ''), low = m[2]
  const value = additive(high) * 1000 + additive(low)
  const canonical = value >= 1 && value <= MAX_EXT ? toRoman(value) : ''
  if (canonical && canonical === s) return { ok: true, value, canonical }
  const d = diagnose(high) ?? diagnose(low) ?? (high && value <= MAX_STD ? { reason: 'overline' as const, detail: '' } : null)
  return { ok: false, value: canonical ? value : 0, canonical, reason: d?.reason ?? 'order', detail: d?.detail ?? '' }
}

export type NumParse = { ok: true; value: number } | { ok: false; reason: Reason }

export function parseNumber(input: string): NumParse {
  const s = input.replace(/[,\s]/g, '')
  if (!s) return { ok: false, reason: 'empty' }
  if (!/^\d+$/.test(s)) return { ok: false, reason: 'notInteger' }
  const n = Number(s)
  if (n === 0) return { ok: false, reason: 'zero' }
  if (n > MAX_EXT) return { ok: false, reason: 'tooBig' }
  return { ok: true, value: n }
}

/** 숫자로 보이는 입력인지 (아니면 로마 숫자로 해석) */
export const looksNumeric = (input: string) => /^[\d,\s.+-]+$/.test(input.trim())

/** 1~12: 유니코드 한 글자(Ⅰ~Ⅻ / ⅰ~ⅻ), 50·100·500·1000도 있음. 없으면 '' */
export function unicodeRoman(n: number, lower = false): string {
  const base = lower ? 0x2170 : 0x2160
  if (n >= 1 && n <= 12) return String.fromCharCode(base + n - 1)
  const idx = { 50: 12, 100: 13, 500: 14, 1000: 15 }[n]
  return idx === undefined ? '' : String.fromCharCode(base + idx)
}

export type DateOrder = 'ymd' | 'mdy' | 'dmy'

/** 'YYYY-MM-DD' → 날짜 로마 숫자. 잘못된 날짜면 null */
export function dateToRoman(date: string, order: DateOrder, sep: string): { roman: string; parts: string[] } | null {
  const m = date.match(/^(\d{1,4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const [y, mo, d] = [+m[1], +m[2], +m[3]]
  const dt = new Date(Date.UTC(2000, mo - 1, d))
  if (y < 1 || mo < 1 || mo > 12 || dt.getUTCMonth() !== mo - 1) return null
  const parts = (order === 'ymd' ? [y, mo, d] : order === 'mdy' ? [mo, d, y] : [d, mo, y]).map(toRoman)
  return { roman: parts.join(sep), parts }
}
