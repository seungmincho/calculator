// 숫자 ↔ 한글/한자/영문 금액 표기 (순수 함수). 체크: node scripts/check-number-to-korean.ts

export interface ParsedNum {
  neg: boolean
  int: string // 선행 0 없는 정수부 ('0' 가능)
  frac: string // 소수부 (뒤 0 제거, 없으면 '')
}

export const MAX_DIGITS = 20 // 경 단위 (10^20 - 1)

const KO_DIGITS = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구']
const KO_SMALL = ['', '십', '백', '천']
const KO_LARGE = ['', '만', '억', '조', '경']
// 갖은자 (위변조 방지용 대서 숫자)
const CN_DIGITS = ['', '壹', '貳', '參', '肆', '伍', '陸', '柒', '捌', '玖']
const CN_SMALL = ['', '拾', '佰', '仟']
const CN_LARGE = ['', '萬', '億', '兆', '京']

const EN_ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
const EN_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
const EN_SCALES = ['', 'thousand', 'million', 'billion', 'trillion', 'quadrillion', 'quintillion']
const EN_DIGIT = ['zero', ...EN_ONES.slice(1, 10)]

const KO_NUM: Record<string, number> = { 영: 0, 공: 0, 일: 1, 이: 2, 삼: 3, 사: 4, 오: 5, 육: 6, 륙: 6, 칠: 7, 팔: 8, 구: 9 }
const KO_SMALL_UNIT: Record<string, number> = { 십: 10, 백: 100, 천: 1000 }
const KO_LARGE_UNIT: Record<string, number> = { 만: 1e4, 억: 1e8, 조: 1e12, 경: 1e16 }

function groupsOf(numStr: string, size: number): string[] {
  const s = numStr.replace(/^0+/, '')
  const out: string[] = []
  for (let i = s.length; i > 0; i -= size) out.unshift(s.slice(Math.max(0, i - size), i))
  return out
}

export function commafy(numStr: string): string {
  return (numStr.replace(/^0+/, '') || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/** "1,234,500원", "-12.5", "3억 5천만", "일금 오만원정" → ParsedNum. 인식 불가·20자리 초과 → null */
export function parseAmount(raw: string): ParsedNum | null {
  let s = raw.replace(/[\s,₩원정整圓]/g, '').replace(/^(일금|금|金)/, '')
  const neg = /^[-−]/.test(s)
  if (neg) s = s.slice(1)
  let int: string, frac: string
  const m = s.match(/^(\d*)(?:\.(\d*))?$/)
  if (m && /\d/.test(s)) {
    int = m[1].replace(/^0+/, '') || '0'
    frac = (m[2] ?? '').replace(/0+$/, '')
  } else {
    const v = parseKorean(s)
    if (v === null) return null
    int = String(v)
    frac = ''
  }
  if (int.length > MAX_DIGITS) return null
  return { neg: neg && (int !== '0' || frac !== ''), int, frac }
}

// ponytail: Number 기반 → 9천조(2^53) 초과 한글 입력은 null. 숫자 입력은 문자열 경로라 20자리까지 정확.
function parseKorean(s: string): number | null {
  if (!s || !/^([\d.]+|[영공일이삼사오육륙칠팔구십백천만억조경])+$/.test(s)) return null
  const tokens = s.match(/\d+(?:\.\d+)?|[^\d]/g) ?? []
  let total = 0, section = 0
  let cur: number | null = null
  for (const tk of tokens) {
    if (/^\d/.test(tk)) cur = parseFloat(tk)
    else if (tk in KO_NUM) cur = KO_NUM[tk]
    else if (tk in KO_SMALL_UNIT) { section += (cur ?? 1) * KO_SMALL_UNIT[tk]; cur = null }
    else if (tk in KO_LARGE_UNIT) {
      section += cur ?? 0
      total += (section || 1) * KO_LARGE_UNIT[tk]
      section = 0; cur = null
    } else return null
  }
  total += section + (cur ?? 0)
  const r = Math.round(total)
  return Number.isSafeInteger(r) ? r : null
}

export function addDigits(a: string, b: string): string {
  return (BigInt(a || '0') + BigInt(b)).toString()
}

/** omitOne: 읽기용 — 십/백/천 앞 '일'과 '일만'의 '일' 생략 (억·조·경은 유지) */
function readInt(int: string, digits: string[], small: string[], large: string[], omitOne: boolean, sep: string): string {
  const groups = groupsOf(int, 4)
  const parts: string[] = []
  groups.forEach((g, idx) => {
    const gv = parseInt(g, 10)
    if (!gv) return
    const li = groups.length - 1 - idx
    let str = ''
    for (let p = 3; p >= 0; p--) {
      const d = Math.floor(gv / 10 ** p) % 10
      if (!d) continue
      str += (p > 0 && omitOne && d === 1 ? '' : digits[d]) + small[p]
    }
    if (omitOne && gv === 1 && li === 1) str = ''
    parts.push(str + large[li])
  })
  return parts.join(sep)
}

const isAmount = (p: ParsedNum) => !p.neg && !p.frac && p.int !== '0'

/** 한글 읽기: 123 → 백이십삼, 10000 → 만, 0 → 영, -1.5 → 마이너스 일점오 */
export function toKoreanReading(p: ParsedNum, spacing = false): string {
  const intPart = p.int === '0' ? '영' : readInt(p.int, KO_DIGITS, KO_SMALL, KO_LARGE, true, spacing ? ' ' : '')
  const fracPart = p.frac ? '점' + [...p.frac].map((d) => (d === '0' ? '영' : KO_DIGITS[+d])).join('') : ''
  return (p.neg ? '마이너스 ' : '') + intPart + fracPart
}

/** 수표·계약서용: 금 일만원정 ('일' 생략 없음). 소수·음수·0 → '' */
export function toKoreanFormal(p: ParsedNum, prefix = '금 ', spacing = false): string {
  if (!isAmount(p)) return ''
  return `${prefix}${readInt(p.int, KO_DIGITS, KO_SMALL, KO_LARGE, false, spacing ? ' ' : '')}원정`
}

/** 한자 갖은자: 金 壹萬貳仟圓整 */
export function toHanja(p: ParsedNum): string {
  if (!isAmount(p)) return ''
  return `金 ${readInt(p.int, CN_DIGITS, CN_SMALL, CN_LARGE, false, '')}圓整`
}

/** 숫자+한글 혼용: 1억 2,345만 6,789원 */
export function toMixed(p: ParsedNum): string {
  const sign = p.neg ? '-' : ''
  if (p.frac || p.int === '0') return `${sign}${commafy(p.int)}${p.frac ? '.' + p.frac : ''}원`
  const groups = groupsOf(p.int, 4)
  const parts = groups
    .map((g, idx) => (parseInt(g, 10) ? commafy(g) + KO_LARGE[groups.length - 1 - idx] : ''))
    .filter(Boolean)
  return `${sign}${parts.join(' ')}원`
}

function group3English(n: number): string {
  const h = Math.floor(n / 100), rest = n % 100
  let r = h ? EN_ONES[h] + ' hundred' + (rest ? ' ' : '') : ''
  if (rest) r += rest < 20 ? EN_ONES[rest] : EN_TENS[Math.floor(rest / 10)] + (rest % 10 ? '-' + EN_ONES[rest % 10] : '')
  return r
}

export function toEnglish(p: ParsedNum): string {
  const groups = groupsOf(p.int, 3)
  const parts: string[] = []
  groups.forEach((g, idx) => {
    const gv = parseInt(g, 10)
    const si = groups.length - 1 - idx
    if (gv) parts.push(group3English(gv) + (EN_SCALES[si] ? ' ' + EN_SCALES[si] : ''))
  })
  let s = parts.join(' ') || 'zero'
  if (p.frac) s += ' point ' + [...p.frac].map((d) => EN_DIGIT[+d]).join(' ')
  if (p.neg) s = 'minus ' + s
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** URL/표시용 정규 문자열: -1234.5 */
export function canonical(p: ParsedNum): string {
  return (p.neg ? '-' : '') + p.int + (p.frac ? '.' + p.frac : '')
}
