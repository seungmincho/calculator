// 바코드 생성기 순수 로직: 형식별 검증·GS1 체크디지트·일련번호·목록 파싱·A4 라벨 시트 배치·색 대비
// 회귀 체크: node scripts/check-barcode.ts

export const FORMATS = ['CODE128', 'EAN13', 'EAN8', 'UPC', 'CODE39', 'ITF14'] as const
export type Format = (typeof FORMATS)[number]
export const FORMAT_NAME: Record<Format, string> = {
  CODE128: 'CODE128', EAN13: 'EAN-13', EAN8: 'EAN-8', UPC: 'UPC-A', CODE39: 'CODE39', ITF14: 'ITF-14',
}
/** 형식을 바꿨는데 기존 값이 안 맞을 때 넣는 예시 (EAN/UPC/ITF는 체크디지트 뺀 길이 → 자동 계산을 보여줌) */
export const SAMPLE: Record<Format, string> = {
  CODE128: 'TOOLHUB-0001', EAN13: '400638133393', EAN8: '9638507', UPC: '03600029145', CODE39: 'ITEM-0001', ITF14: '1001234567890',
}
/** GS1 형식의 전체 자릿수(체크디지트 포함) */
export const GS1_LEN: Partial<Record<Format, number>> = { EAN13: 13, EAN8: 8, UPC: 12, ITF14: 14 }
export const MAX_LEN = 80
export const MAX_ITEMS = 1000

/** GS1 체크디지트(EAN-13·EAN-8·UPC-A·ITF-14 공통): 체크 자리 바로 앞부터 왼쪽으로 가중치 3,1,3,1… */
export function gs1CheckDigit(body: string): number {
  let sum = 0
  for (let i = 0; i < body.length; i++) sum += +body[body.length - 1 - i] * (i % 2 ? 1 : 3)
  return (10 - (sum % 10)) % 10
}

export type BarcodeError = 'empty' | 'digits' | 'length' | 'check' | 'ascii' | 'code39' | 'tooLong'
export interface Checked {
  ok: boolean
  /** 실제로 인코딩할 값 (체크디지트 추가·CODE39 대문자 변환 반영) */
  value: string
  error?: BarcodeError
  /** check 오류일 때 올바른 전체 번호 */
  expected?: string
  /** 체크디지트를 자동으로 붙였으면 그 숫자 */
  added?: number
}

export function checkValue(format: Format, raw: string): Checked {
  const v = raw.trim()
  if (!v) return { ok: false, value: v, error: 'empty' }
  const n = GS1_LEN[format]
  if (n) {
    if (!/^\d+$/.test(v)) return { ok: false, value: v, error: 'digits' }
    if (v.length === n - 1) { const d = gs1CheckDigit(v); return { ok: true, value: v + d, added: d } }
    if (v.length !== n) return { ok: false, value: v, error: 'length' }
    const d = gs1CheckDigit(v.slice(0, -1))
    return +v[n - 1] === d ? { ok: true, value: v } : { ok: false, value: v, error: 'check', expected: v.slice(0, -1) + d }
  }
  if (v.length > MAX_LEN) return { ok: false, value: v, error: 'tooLong' }
  if (format === 'CODE39') {
    const u = v.toUpperCase()
    return /^[0-9A-Z\-. $/+%]+$/.test(u) ? { ok: true, value: u } : { ok: false, value: v, error: 'code39' }
  }
  return /^[\x20-\x7E]+$/.test(v) ? { ok: true, value: v } : { ok: false, value: v, error: 'ascii' }
}

/** GS1 접두어 안내: 880 = 한국, 978·979 = 도서(ISBN). ITF-14는 첫 자리(포장 단위) 다음 3자리 */
export function gs1Prefix(format: Format, value: string): 'kr' | 'isbn' | null {
  const p = format === 'EAN13' ? value.slice(0, 3) : format === 'ITF14' ? value.slice(1, 4) : ''
  return p === '880' ? 'kr' : p === '978' || p === '979' ? 'isbn' : null
}

/** 일련번호: 접두어 + (시작번호부터 count개, pad자리 0 채우기) */
export function serial(prefix: string, start: number, count: number, pad: number): string[] {
  const c = Math.max(0, Math.min(MAX_ITEMS, Math.floor(count)))
  return Array.from({ length: c }, (_, i) => prefix + String(start + i).padStart(pad, '0'))
}

/** 여러 줄 붙여넣기/CSV: 한 줄 = "코드[,|탭]라벨". 빈 줄 무시, 바깥 따옴표 제거.
 *  ponytail: 쉼표가 들어간 코드는 지원 안 함(첫 쉼표·탭에서 자름) — 필요하면 탭 구분으로 붙여넣기 */
export function parseBulk(text: string): { line: number; code: string; label: string }[] {
  const unq = (s: string) => s.trim().replace(/^"(.*)"$/, '$1').replace(/""/g, '"')
  const out: { line: number; code: string; label: string }[] = []
  text.split(/\r?\n/).forEach((l, i) => {
    if (!l.trim()) return
    const k = l.search(/[\t,]/)
    out.push({ line: i + 1, code: unq(k < 0 ? l : l.slice(0, k)), label: k < 0 ? '' : unq(l.slice(k + 1)) })
  })
  return out
}

// ── A4 라벨 시트 (mm) ──
export const PAGE = { w: 210, h: 297 }
/** 흔한 A4 라벨지 칸 수 (열×행) — 특정 제품 규격 아님, 여백·간격은 포장 표기대로 입력 */
export const SHEET_PRESETS: readonly [number, number][] = [[2, 5], [2, 7], [3, 7], [3, 8], [3, 10], [4, 10], [5, 13]]
export interface SheetLayout { cols: number; rows: number; top: number; side: number; gapX: number; gapY: number }

const r1 = (v: number) => Math.round(v * 10) / 10
/** 한 칸 크기: (용지 − 여백×2 − 간격×(칸−1)) ÷ 칸 수. 0 이하면 배치 불가 */
export function labelSize(l: SheetLayout): { w: number; h: number } {
  return {
    w: r1((PAGE.w - 2 * l.side - (l.cols - 1) * l.gapX) / l.cols),
    h: r1((PAGE.h - 2 * l.top - (l.rows - 1) * l.gapY) / l.rows),
  }
}
/** 페이지 안 idx번째 칸(왼→오, 위→아래)의 좌상단 좌표 */
export function cellPos(l: SheetLayout, idx: number): { x: number; y: number } {
  const { w, h } = labelSize(l)
  const c = idx % l.cols, r = Math.floor(idx / l.cols)
  return { x: r1(l.side + c * (w + l.gapX)), y: r1(l.top + r * (h + l.gapY)) }
}
/** 쓰던 라벨지의 앞 skip칸을 비우고 페이지별로 나눔 (빈 칸 = null) */
export function paginate<T>(items: T[], perPage: number, skip = 0): (T | null)[][] {
  const s = Math.max(0, Math.min(perPage - 1, Math.floor(skip)))
  const all: (T | null)[] = [...Array<null>(s).fill(null), ...items]
  const pages: (T | null)[][] = []
  for (let i = 0; i < all.length; i += perPage) pages.push(all.slice(i, i + perPage))
  return pages
}

// ── 색 대비 (WCAG 상대 휘도) ──
const lum = (hex: string) => {
  const n = parseInt(hex.replace('#', ''), 16)
  const ch = [16, 8, 0].map((s) => { const c = ((n >> s) & 255) / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 })
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
}
/** 바·배경 대비 경고: 바가 더 밝으면 inverted, 대비 4.5:1 미만이면 low */
export function contrastWarning(bar: string, bg: string): { ratio: number; warn: 'inverted' | 'low' | null } {
  const a = lum(bar), b = lum(bg)
  const ratio = Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 10) / 10
  return { ratio, warn: a >= b ? 'inverted' : ratio < 4.5 ? 'low' : null }
}
