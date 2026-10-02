// 비밀번호 생성·강도 분석 순수 로직. 난수는 crypto.getRandomValues + rejection sampling(모듈로 편향 없음).
// 생성 방식 = "풀에서 균등 추출 → 필수 종류가 빠지면 통째로 버리고 다시"라서 결과는 유효 집합 위에서 균등,
// 엔트로피 = log2(유효 문자열 개수)를 포함-배제로 정확히 계산한다.

export const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
export const LOWER = 'abcdefghijklmnopqrstuvwxyz'
export const DIGITS = '0123456789'
export const DEFAULT_SYMBOLS = '!@#$%^&*()-_=+[]{};:,.<>?/~'
export const AMBIGUOUS = '0O1lI|'

// ── 난수 ──
const buf = new Uint32Array(256)
let pos = buf.length
function u32(): number {
  if (pos >= buf.length) { globalThis.crypto.getRandomValues(buf); pos = 0 }
  return buf[pos++]
}
/** 0 ≤ n < max 균등 정수 */
export function randomInt(max: number): number {
  if (!Number.isInteger(max) || max <= 0 || max > 2 ** 32) throw new RangeError('max')
  const limit = 2 ** 32 - (2 ** 32 % max) // 이 이상은 버림 → 각 나머지가 정확히 같은 횟수
  let x: number
  do { x = u32() } while (x >= limit)
  return x % max
}
/** Fisher–Yates + randomInt */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) { const j = randomInt(i + 1);[a[i], a[j]] = [a[j], a[i]] }
  return a
}

// ── 랜덤 문자열 ──
export interface PwOptions {
  length: number
  upper: boolean
  lower: boolean
  digits: boolean
  symbols: boolean
  symbolSet: string
  excludeAmbiguous: boolean
  noRepeat: boolean // 같은 문자 연속 금지
}

/** 특수문자 입력값 정리: 영문·숫자·공백·비ASCII 제거, 중복 제거 */
export function cleanSymbols(s: string): string {
  return [...new Set([...s].filter((c) => /[!-/:-@[-`{-~]/.test(c)))].join('')
}

/** 선택된 종류별 문자 집합(서로 겹치지 않음). 각 종류는 최소 1자 포함 필수 */
export function classSets(o: Omit<PwOptions, 'length' | 'noRepeat'>): string[][] {
  const drop = (s: string) => [...s].filter((c) => !(o.excludeAmbiguous && AMBIGUOUS.includes(c)))
  const sets: string[][] = []
  if (o.upper) sets.push(drop(UPPER))
  if (o.lower) sets.push(drop(LOWER))
  if (o.digits) sets.push(drop(DIGITS))
  if (o.symbols) sets.push(drop(cleanSymbols(o.symbolSet)))
  return sets
}

export type PwError = 'noCharType' | 'symbolEmpty' | 'tooShort' | null
export function validate(o: PwOptions): PwError {
  const sets = classSets(o)
  if (!sets.length) return 'noCharType'
  if (sets.some((s) => !s.length)) return 'symbolEmpty'
  if (o.length < sets.length || (o.noRepeat && sets.flat().length < 2)) return 'tooShort'
  return null
}

export function generatePassword(o: PwOptions): string {
  const err = validate(o)
  if (err) throw new Error(err)
  const sets = classSets(o)
  const pool = sets.flat()
  for (let attempt = 0; attempt < 1e6; attempt++) {
    const idx: number[] = []
    for (let i = 0; i < o.length; i++) {
      if (o.noRepeat && i > 0) {
        const r = randomInt(pool.length - 1) // 직전 문자를 뺀 나머지에서 균등
        idx.push(r >= idx[i - 1] ? r + 1 : r)
      } else idx.push(randomInt(pool.length))
    }
    const s = idx.map((i) => pool[i])
    if (sets.every((set) => s.some((c) => set.includes(c)))) return s.join('')
  }
  throw new Error('rejection limit')
}

/** log2(필수 종류를 모두 포함하는 길이 L 문자열 수). sizes = 종류별 문자 수 */
export function validLog2(sizes: number[], L: number, noRepeat: boolean): number {
  const N = sizes.reduce((a, b) => a + b, 0)
  if (N <= 0 || L <= 0) return 0
  // f(a)/f(N): f(a) = a^L 또는 a(a-1)^(L-1)
  const ratio = (a: number) => {
    if (a <= 0) return 0
    if (!noRepeat) return (a / N) ** L
    if (L === 1) return a / N
    return a <= 1 ? 0 : (a / N) * ((a - 1) / (N - 1)) ** (L - 1)
  }
  let sum = 0
  for (let mask = 0; mask < 1 << sizes.length; mask++) {
    let removed = 0, bits = 0
    sizes.forEach((s, i) => { if (mask & (1 << i)) { removed += s; bits++ } })
    sum += (bits % 2 ? -1 : 1) * ratio(N - removed)
  }
  const logF = noRepeat ? Math.log2(N) + (L - 1) * Math.log2(N - 1) : L * Math.log2(N)
  return sum > 0 ? logF + Math.log2(sum) : 0
}

export function passwordEntropy(o: PwOptions): number {
  if (validate(o)) return 0
  return validLog2(classSets(o).map((s) => s.length), o.length, o.noRepeat)
}

// ── 패스프레이즈 ──
export interface PhraseOptions { words: number; separator: string; capitalize: boolean; addNumber: boolean }

export function generatePassphrase(o: PhraseOptions, list: readonly string[]): string {
  const words = Array.from({ length: o.words }, () => {
    const w = list[randomInt(list.length)]
    return o.capitalize ? w[0].toUpperCase() + w.slice(1) : w
  })
  if (o.addNumber) words[randomInt(words.length)] += DIGITS[randomInt(10)]
  return words.join(o.separator)
}

/** 단어는 영문자만이고 구분자·대문자화는 고정이라 단어 선택 + (숫자 1개 × 위치)만 엔트로피 */
export function passphraseEntropy(o: PhraseOptions, listSize: number): number {
  return o.words * Math.log2(listSize) + (o.addNumber ? Math.log2(10 * o.words) : 0)
}

// ── 등급·크랙 시간 ──
export type Grade = 'veryWeak' | 'weak' | 'medium' | 'strong' | 'veryStrong'
export const GRADE_ORDER: Grade[] = ['veryWeak', 'weak', 'medium', 'strong', 'veryStrong']
export function gradeOf(bits: number): Grade {
  return bits < 40 ? 'veryWeak' : bits < 56 ? 'weak' : bits < 72 ? 'medium' : bits < 96 ? 'strong' : 'veryStrong'
}

export const GUESSES_PER_SEC = 1e10 // 오프라인, 빠른 해시를 GPU로 공격하는 가정
export type CrackTime = { unit: 'instant' | 'seconds' | 'minutes' | 'hours' | 'days' | 'years' | 'overMillionYears' | 'overBillionYears'; value: number }
/** 평균 크랙 시간 = 전체 경우의 절반을 시도 */
export function crackTime(bits: number, rate = GUESSES_PER_SEC): CrackTime {
  const s = 2 ** Math.max(bits - 1, 0) / rate
  const y = s / 31_557_600
  if (s < 1) return { unit: 'instant', value: 0 }
  if (s < 60) return { unit: 'seconds', value: Math.round(s) }
  if (s < 3600) return { unit: 'minutes', value: Math.round(s / 60) }
  if (s < 86400) return { unit: 'hours', value: Math.round(s / 3600) }
  if (y < 1) return { unit: 'days', value: Math.round(s / 86400) }
  if (y < 1e6) return { unit: 'years', value: Math.round(y) }
  if (y < 1e9) return { unit: 'overMillionYears', value: 0 }
  return { unit: 'overBillionYears', value: 0 }
}

// ── 내 비밀번호 강도 검사 ──
// 흔한 비밀번호 소량(유출 순위 상위 + 한국에서 흔한 것 + 한글 단어를 영문 자판으로 친 것)
export const COMMON = [
  '123456', '123456789', '12345678', '12345', '1234567', '1234567890', '1234', '111111', '000000', '123123',
  '654321', '666666', '777777', '888888', '121212', '112233', 'password', 'passw0rd', 'qwerty', 'qwerty123',
  'qwer1234', 'qwe123', 'asdf1234', 'asdfgh', 'zxcvbnm', 'qazwsx', '1qaz2wsx', '1q2w3e4r', '1q2w3e4r5t',
  '1q2w3e', 'abc123', 'abcd1234', 'a123456', 'aa123456', 'iloveyou', 'admin', 'admin123', 'letmein', 'welcome',
  'monkey', 'dragon', 'sunshine', 'princess', 'football', 'baseball', 'superman', 'master', 'shadow', 'login',
  'test', 'test123', 'love', 'pass', 'secret', 'samsung', 'korea', 'dkssud', 'tkfkdgo', 'qlalfqjsgh',
]
const KEY_ROWS = ['1234567890', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm']

export type PatternType = 'common' | 'keyboard' | 'sequence' | 'repeat' | 'date' | 'year' | 'phone'
export interface Pattern { type: PatternType; start: number; end: number; token: string }
export interface Analysis {
  length: number
  classes: { upper: boolean; lower: boolean; digit: boolean; symbol: boolean; other: boolean }
  bits: number
  patterns: Pattern[]
  suggestions: string[] // 번역 키
}

const leet = (s: string) => s.replace(/[@4]/g, 'a').replace(/0/g, 'o').replace(/[1!|]/g, 'i').replace(/3/g, 'e').replace(/\$|5/g, 's').replace(/7/g, 't')

function findPatterns(pw: string): Pattern[] {
  const out: Pattern[] = []
  const lower = pw.toLowerCase()
  const add = (type: PatternType, start: number, end: number) => out.push({ type, start, end, token: pw.slice(start, end) })

  // 흔한 비밀번호: 그대로 / 앞뒤 숫자·기호 뗀 핵심 / leet 되돌린 핵심
  const core = lower.replace(/^[\d\W_]+|[\d\W_]+$/g, '')
  const coreStart = core ? lower.indexOf(core) : -1
  if (COMMON.includes(lower)) add('common', 0, pw.length)
  else if (core.length >= 4 && (COMMON.includes(core) || COMMON.includes(leet(core)))) add('common', coreStart, coreStart + core.length)
  else if (lower.length >= 4 && COMMON.includes(leet(lower))) add('common', 0, pw.length)
  else for (const w of COMMON) { // 일부로 포함: mypassword99, qwer1234!kim (leet은 길이 보존이라 위치 그대로)
    if (w.length < 6) continue
    const i = lower.includes(w) ? lower.indexOf(w) : leet(lower).indexOf(w)
    if (i >= 0) add('common', i, i + w.length)
  }

  // 키보드 연속(4자 이상, 정·역방향)
  for (let i = 0; i < lower.length; i++) {
    let best = 0
    for (const row of KEY_ROWS) for (const r of [row, [...row].reverse().join('')]) {
      let n = 0
      while (i + n < lower.length && r.includes(lower.slice(i, i + n + 1))) n++
      best = Math.max(best, n)
    }
    if (best >= 4) { add('keyboard', i, i + best); i += best - 1 }
  }
  // 문자 코드 연속 abc / 321 (3자 이상)
  for (let i = 0; i + 2 < lower.length;) {
    const d = lower.charCodeAt(i + 1) - lower.charCodeAt(i)
    let j = i + 1
    if (d === 1 || d === -1) while (j + 1 < lower.length && lower.charCodeAt(j + 1) - lower.charCodeAt(j) === d) j++
    if (j - i >= 2 && /[a-z0-9]/.test(lower[i])) { add('sequence', i, j + 1); i = j + 1 } else i++
  }
  // 반복: 같은 문자 3번+, 같은 덩어리 2번+
  for (const m of pw.matchAll(/(.)\1{2,}|(.{2,}?)\2+/g)) add('repeat', m.index!, m.index! + m[0].length)
  // 휴대폰 번호, 날짜(YYYYMMDD/YYMMDD), 연도
  for (const m of pw.matchAll(/01[016789][-. ]?\d{3,4}[-. ]?\d{4}/g)) add('phone', m.index!, m.index! + m[0].length)
  for (const m of pw.matchAll(/(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])|(?<!\d)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])(?!\d)/g)) add('date', m.index!, m.index! + m[0].length)
  for (const m of pw.matchAll(/(?<!\d)(?:19[5-9]\d|20[0-4]\d)(?!\d)/g)) add('year', m.index!, m.index! + m[0].length)
  // 휴대폰 안의 날짜·연도처럼 다른 패턴에 완전히 포함된 건 제외
  return out.filter((p, i) => !out.some((q, j) => j !== i && q.start <= p.start && q.end >= p.end && (q.end - q.start > p.end - p.start || j < i)))
}

/** 반복 덩어리 길이: 'abab' → 2 */
const period = (s: string) => { for (let c = 1; c < s.length; c++) if (s.length % c === 0 && s.slice(0, c).repeat(s.length / c) === s) return c; return s.length }

/** 추정치: 패턴 없는 문자는 log2(종류 풀), 패턴 구간은 공격자가 먼저 시도하는 만큼만 */
export function analyzePassword(pw: string): Analysis {
  const chars = [...pw]
  const classes = {
    upper: /[A-Z]/.test(pw), lower: /[a-z]/.test(pw), digit: /\d/.test(pw),
    symbol: /[!-/:-@[-`{-~ ]/.test(pw), other: /[^\x20-\x7e]/.test(pw),
  }
  const pool = (classes.upper ? 26 : 0) + (classes.lower ? 26 : 0) + (classes.digit ? 10 : 0) + (classes.symbol ? 33 : 0) + (classes.other ? 100 : 0)
  const patterns = pw ? findPatterns(pw) : []
  const perChar = pool > 1 ? Math.log2(pool) : 0
  const covered = new Array(pw.length).fill(false)
  let bits = 0
  for (const p of patterns) {
    const len = p.end - p.start
    for (let i = p.start; i < p.end; i++) covered[i] = true
    const c = period(p.token)
    bits += { common: Math.log2(COMMON.length), keyboard: 6 + Math.log2(len), sequence: 6 + Math.log2(len), repeat: c * perChar + Math.log2(len / c), date: 15, year: 7, phone: 20 }[p.type]
  }
  // 덮이지 않은 문자 (pw.length는 UTF-16 길이 → 서로게이트도 1칸씩 세지만 추정치라 무시)
  bits += covered.filter((c) => !c).length * perChar
  bits = Math.min(bits, chars.length * perChar)

  const s: string[] = []
  const has = (t: PatternType) => patterns.some((p) => p.type === t)
  if (has('common')) s.push('common')
  if (chars.length < 12) s.push('length')
  if ([classes.upper, classes.lower, classes.digit, classes.symbol].filter(Boolean).length < 3 && chars.length < 16) s.push('mix')
  if (has('keyboard') || has('sequence')) s.push('sequence')
  if (has('repeat')) s.push('repeat')
  if (has('date') || has('year') || has('phone')) s.push('personal')
  if (bits < 72) s.push('passphrase')
  s.push('manager')
  return { length: chars.length, classes, bits, patterns, suggestions: s }
}
