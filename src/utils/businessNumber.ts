// 사업자등록번호 순수 로직 (검증·형식화·구조 해석·일괄 파싱·CSV)

export const WEIGHTS = [1, 3, 7, 1, 3, 7, 1, 3, 5] as const

export const digitsOf = (s: string) => s.replace(/\D/g, '')

/** 입력 중에도 쓰는 점진 형식화: 123 → 123, 12345 → 123-45, 1234567890 → 123-45-67890 (10자리 초과는 잘라냄) */
export function formatBizNo(s: string): string {
  const d = digitsOf(s).slice(0, 10)
  if (d.length <= 3) return d
  if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`
}

export interface CheckSteps { products: number[]; bonus: number; sum: number; expected: number }

/** 국세청 검증번호: Σ(d_i × w_i, i=1..9) + ⌊d9 × 5 / 10⌋ 의 일의 자리를 10에서 뺀 값(10이면 0) */
export function checkSteps(nine: string): CheckSteps {
  const products = WEIGHTS.map((w, i) => Number(nine[i]) * w)
  const bonus = Math.floor((Number(nine[8]) * 5) / 10)
  const sum = products.reduce((a, b) => a + b, 0) + bonus
  return { products, bonus, sum, expected: (10 - (sum % 10)) % 10 }
}

export type Reason = 'empty' | 'short' | 'long' | 'checksum' | 'ok'
export interface Validation { digits: string; formatted: string; valid: boolean; reason: Reason; expected: number | null }

export function validate(s: string): Validation {
  const digits = digitsOf(s)
  const formatted = formatBizNo(digits)
  if (!digits) return { digits, formatted, valid: false, reason: 'empty', expected: null }
  if (digits.length < 10) return { digits, formatted, valid: false, reason: 'short', expected: null }
  if (digits.length > 10) return { digits, formatted, valid: false, reason: 'long', expected: null }
  const { expected } = checkSteps(digits)
  const valid = expected === Number(digits[9])
  return { digits, formatted, valid, reason: valid ? 'ok' : 'checksum', expected }
}

/**
 * 가운데 2자리(구분코드). 출처: 국세일보 2022-11-22 보도(머니맵 고객센터 재게재), 한국경제 2025-08 고인선 칼럼(82/89 종교단체).
 * 88은 영리법인 본점으로 흔히 안내되나 국세청 공식 문서로 직접 확인하지 못함.
 */
export type Category =
  | 'individualTaxable' // 01~79 개인 과세
  | 'individualOther' // 80 아파트관리사무소·다단계판매원 등
  | 'corpHQ' // 81,86,87,88 영리법인 본점
  | 'nonprofit' // 82 비영리법인·법인으로 보는 단체
  | 'government' // 83 국가·지자체·지자체조합
  | 'foreignCorp' // 84 외국법인 본·지점·연락사무소
  | 'corpBranch' // 85 영리법인 지점
  | 'religious' // 89 법인 아닌 종교단체
  | 'individualExempt' // 90~99 개인 면세
  | 'unknown' // 00

export function categoryOf(mid: string): Category {
  const n = Number(mid)
  if (!/^\d{2}$/.test(mid) || n === 0) return 'unknown'
  if (n <= 79) return 'individualTaxable'
  if (n >= 90) return 'individualExempt'
  return ({ 80: 'individualOther', 81: 'corpHQ', 82: 'nonprofit', 83: 'government', 84: 'foreignCorp', 85: 'corpBranch', 86: 'corpHQ', 87: 'corpHQ', 88: 'corpHQ', 89: 'religious' } as const)[n as 80]
}

/** 개인/법인/기타 큰 구분 */
export function entityOf(c: Category): 'individual' | 'corporation' | 'other' {
  if (c === 'individualTaxable' || c === 'individualExempt' || c === 'individualOther') return 'individual'
  if (c === 'corpHQ' || c === 'corpBranch' || c === 'nonprofit' || c === 'foreignCorp') return 'corporation'
  return 'other'
}

export interface Parts { office: string; mid: string; serial: string; check: string; category: Category }
export const partsOf = (digits: string): Parts => {
  const mid = digits.slice(3, 5)
  return { office: digits.slice(0, 3), mid, serial: digits.slice(5, 9), check: digits.slice(9, 10), category: categoryOf(mid) }
}

/** 일괄 입력: 줄바꿈·쉼표·세미콜론·탭 단위로 끊는다(번호 안 공백/하이픈은 허용). 숫자 없는 줄(헤더 등)은 건너뜀 */
export function parseBulk(text: string): (Validation & { input: string; dup: boolean })[] {
  const seen = new Set<string>()
  return text
    .split(/[\n\r,;\t]+/)
    .map(s => s.trim())
    .filter(s => /\d/.test(s))
    .map(input => {
      const v = validate(input)
      const dup = seen.has(v.digits)
      seen.add(v.digits)
      return { ...v, input, dup }
    })
}

const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
/** 엑셀 호환 CSV (BOM + CRLF). 번호는 텍스트로 유지되도록 형식화된 값(하이픈 포함) 사용 */
export const toCsv = (rows: string[][]) => '﻿' + rows.map(r => r.map(csvCell).join(',')).join('\r\n')

// ── 국세청 상태조회 API 응답(공공데이터포털 nts-businessman/v1/status) ──
export interface NtsStatus {
  b_no: string
  b_stt: string // 계속사업자 / 휴업자 / 폐업자 / ''
  b_stt_cd: string // 01 계속, 02 휴업, 03 폐업, '' 미등록
  tax_type: string
  tax_type_cd: string
  end_dt: string // 폐업일 YYYYMMDD
}
export type StatusKind = 'active' | 'suspended' | 'closed' | 'unregistered'
export const statusKind = (s: Pick<NtsStatus, 'b_stt_cd'>): StatusKind =>
  s.b_stt_cd === '01' ? 'active' : s.b_stt_cd === '02' ? 'suspended' : s.b_stt_cd === '03' ? 'closed' : 'unregistered'
export const ymdDots = (s: string) => (/^\d{8}$/.test(s) ? `${s.slice(0, 4)}.${s.slice(4, 6)}.${s.slice(6)}` : '')
