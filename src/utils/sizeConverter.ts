// 해외 사이즈 변환(신발·옷·반지) — 데이터와 순수 계산. 확인일 CHECKED.
//
// 출처와 쓰는 방식
// | 항목 | 값 | 근거 |
// |---|---|---|
// | 한국 신발 mm | 발길이 mm, 5mm 간격 | ISO 9407 Mondopoint(한국 KS M ISO 9407), 위키백과 Shoe size |
// | 성인 US 남성 | (mm − 180) ÷ 10 → 270mm = 9 | 나이키 남성 표(250~330mm 구간)·아디다스 표 모두 같음 |
// | 성인 US 여성 | (mm − 170) ÷ 10 → 240mm = 7 | 나이키 여성 표·아디다스 표 모두 같음(같은 mm 에서 여성 = 남성 + 1) |
// | 남녀 공용 라벨 | 여성 = 남성 + 1.5 (M 7 / W 8.5) | 나이키 여성 표의 US Men 줄, 위키백과 "common" 척도 |
// | 성인 UK | (mm − 190) ÷ 10 → 270mm = 8 | 나이키 남성(US − 1). 아디다스는 0.5 크고(US − 0.5) 나이키 여성은 0.5 작다 |
// | 성인 EU | (2mm + 100) ÷ 15 를 0.5 단위로 내림 → 270mm = 42.5 | 아디다스는 이 값을 1/3 단위로 표기(42⅔), 나이키 남성 표와 대부분 같음 |
// | 아동 US C/Y | 발길이(in) ≈ (치수 + 9.75) ÷ 3, 13.5C 다음 1Y | 위키백과 Shoe size(미국 아동 척도), 나이키 키즈 표 발길이와 ±7mm 안 |
// | 아동 UK | US − 0.5 (13.5까지 키즈 K, 그다음 성인 1) | 나이키 키즈 표 |
// | 아동 EU | 1.5 × 발길이(cm) + 2 를 0.5 단위 반올림 | 위키백과 Shoe size(ISO/TS 19407 환산), 나이키 키즈 표와 ±0.5 |
// | 남성 상의 | 한국 호칭 = 가슴둘레(cm) | KS K 0050 의 가슴둘레 호칭(원문 미확인), US·EU 는 업계 통용 |
// | 여성 상의 | 44·55·66·77·88 = 가슴 82·85·88·91·94cm | 1981 한국공업진흥청 호칭(디지틀조선 2017-01-11), US·UK·EU·JP 는 업계 통용 |
// | 하의 | 1인치 = 2.54cm | 정의값 |
// | 반지 한국·일본 호수 | 안지름 13.0mm + (호수 − 1) × 1/3mm | 업계 통용 표(국내 판매처 표 9호 15.66·10호 16.00·11호 16.33mm) |
// | 반지 US | 안지름 = 11.63mm + 0.8128mm × 치수 | 위키백과 Ring size (0.032in/치수) |
// | 반지 UK | 둘레 = 40mm + 1.25mm × (글자 순번 − 3), C = 40mm | BS 6820:1987 (위키백과 Ring size) |
// | 반지 EU·ISO | 안쪽 둘레 mm | ISO 8653:2016 |

export const CHECKED = '2026-11-22'

/** 화면 이름은 번역 sources.<id> */
export const SOURCES = {
  wikiShoe: 'https://en.wikipedia.org/wiki/Shoe_size',
  nikeM: 'https://www.nike.com/size-fit/mens-footwear',
  nikeW: 'https://www.nike.com/size-fit/womens-footwear',
  nikeK: 'https://www.nike.com/size-fit/kids-footwear',
  adidas: 'https://www.evo.com/adidas-shoe-size-chart',
  women: 'https://digitalchosun.dizzo.com/site/data/html_dir/2017/01/11/2017011112046.html',
  wikiRing: 'https://en.wikipedia.org/wiki/Ring_size',
  ringKr: 'https://4c-dia.com/article/%EA%B3%B5%EC%A7%80%EC%82%AC%ED%95%AD/1/5/',
  customs: 'https://www.law.go.kr/법령/관세법시행규칙',
} as const

export const TABS = ['m', 'w', 'k', 'mt', 'wt', 'pt', 'r'] as const
export type TabId = (typeof TABS)[number]
export type Group = 'shoe' | 'cloth' | 'ring'
export const GROUPS: Record<Group, readonly TabId[]> = { shoe: ['m', 'w', 'k'], cloth: ['mt', 'wt', 'pt'], ring: ['r'] }
export const groupOf = (t: TabId): Group => (t === 'r' ? 'ring' : t === 'mt' || t === 'wt' || t === 'pt' ? 'cloth' : 'shoe')
export const isTab = (s: string | null): s is TabId => s !== null && (TABS as readonly string[]).includes(s)

/** cells = 화면 표기, x = 같은 표기가 여러 줄일 때 고르는 실제 값, m = 추천·정렬 기준(신발 mm, 옷 cm, 반지 둘레 mm) */
export type Row = { m: number; cells: readonly string[]; x?: readonly number[] }
export type Table = { cols: readonly string[]; rows: readonly Row[]; def: number }

const fmt = (n: number) => String(Math.round(n * 100) / 100)
const round05 = (n: number) => Math.round(n * 2) / 2
const floor05 = (n: number) => Math.floor(n * 2 + 1e-9) / 2
const steps = (a: number, b: number, d: number) => Array.from({ length: Math.round((b - a) / d) + 1 }, (_, i) => a + i * d)
const IN = 25.4

// ── 신발(성인)
export const usMenOf = (mm: number) => (mm - 180) / 10
export const usWomenOf = (mm: number) => (mm - 170) / 10
export const ukOf = (mm: number) => (mm - 190) / 10
export const euOf = (mm: number) => floor05((2 * mm + 100) / 15)
/** 남녀 공용 모델 라벨(M 7 / W 8.5) */
export const unisexW = (usM: number) => usM + 1.5

function adult(lo: number, hi: number, us: (mm: number) => number): Row[] {
  return steps(lo, hi, 5).map((mm) => {
    const x = [mm, us(mm), ukOf(mm), euOf(mm), mm / 10]
    return { m: mm, cells: x.map(fmt), x }
  })
}

// ── 신발(아동): k = 4 ~ 13.5 는 C, 14 ~ 20 은 1Y ~ 7Y
export const kidFoot = (k: number) => ((k + 9.75) / 3) * IN
export const kidLabel = (k: number) => (k < 14 ? `${fmt(k)}C` : `${fmt(k - 13)}Y`)
const kidUk = (k: number) => (k - 0.5 < 14 ? `${fmt(k - 0.5)}K` : fmt(k - 13.5))
const kidRows: Row[] = steps(4, 20, 0.5).map((k) => {
  const foot = kidFoot(k)
  const eu = 1.5 * (foot / 10) + 2
  return {
    m: foot,
    cells: [String(Math.round(foot)), kidLabel(k), kidUk(k), fmt(round05(eu)), fmt(round05(foot / 10))],
    x: [foot, k, k - 0.5, eu, foot / 10],
  }
})

// ── 옷: 업계 통용 표. m = 가슴둘레 구간 위 끝(cm)
const menTop: Row[] = [
  { m: 87, cells: ['85', 'XS', 'XS', '44', '83~87'] },
  { m: 92, cells: ['90', 'S', 'S', '46', '88~92'] },
  { m: 97, cells: ['95', 'M', 'S~M', '48', '93~97'] },
  { m: 102, cells: ['100', 'L', 'M', '50', '98~102'] },
  { m: 107, cells: ['105', 'XL', 'M~L', '52', '103~107'] },
  { m: 112, cells: ['110', 'XXL', 'L', '54', '108~112'] },
]
// 가슴 기준값 ±1.5cm 를 한 호칭으로 본다(1981 호칭은 3cm 간격)
const womenTop: Row[] = [
  { m: 83.5, cells: ['44', 'XS', '0~2', '4~6', '32~34', '5~7', '82'] },
  { m: 86.5, cells: ['55', 'S', '4', '8', '36', '9', '85'] },
  { m: 89.5, cells: ['66', 'M', '6', '10', '38', '11', '88'] },
  { m: 92.5, cells: ['77', 'L', '8~10', '12~14', '40~42', '13', '91'] },
  { m: 95.5, cells: ['88', 'XL', '12~14', '16~18', '44~46', '15~17', '94'] },
]
const pants: Row[] = steps(24, 40, 1).map((inch) => ({ m: inch * 2.54, cells: [String(inch), (inch * 2.54).toFixed(1)], x: [inch, inch * 2.54] }))

// ── 반지
export const ringDia = (ho: number) => 13 + (ho - 1) / 3
export const usRingOf = (dia: number) => (dia - 11.63) / 0.8128
export const ukIndexOf = (circ: number) => 3 + (circ - 40) / 1.25
/** UK 글자. 1 = A … 26 = Z, 그 위는 Z+1, 0.5 는 ½ */
export function ukLetter(idx: number): string {
  const h = round05(idx)
  const whole = Math.floor(h)
  const name = whole <= 26 ? String.fromCharCode(64 + whole) : `Z+${whole - 26}`
  return h > whole ? `${name}½` : name
}
const ringRows: Row[] = steps(1, 30, 1).map((ho) => {
  const dia = ringDia(ho)
  const circ = Math.PI * dia
  const us = usRingOf(dia)
  return {
    m: circ,
    cells: [String(ho), circ.toFixed(1), dia.toFixed(2), fmt(round05(us)), ukLetter(ukIndexOf(circ)), String(Math.round(circ)), String(ho)],
    x: [ho, circ, dia, us, ukIndexOf(circ), circ, ho],
  }
})

const at = (rows: readonly Row[], ci: number, v: string) => rows.findIndex((r) => r.cells[ci] === v)

export const TABLES: Record<TabId, Table> = {
  m: { cols: ['mm', 'usM', 'uk', 'eu', 'jpcm'], rows: adult(220, 330, usMenOf), def: 10 },
  w: { cols: ['mm', 'usW', 'uk', 'eu', 'jpcm'], rows: adult(210, 290, usWomenOf), def: 6 },
  k: { cols: ['foot', 'usK', 'uk', 'eu', 'jpcm'], rows: kidRows, def: at(kidRows, 1, '10C') },
  mt: { cols: ['kr', 'intl', 'us', 'eu', 'chest'], rows: menTop, def: 3 },
  wt: { cols: ['kr', 'intl', 'usW', 'uk', 'eu', 'jp', 'bust'], rows: womenTop, def: 1 },
  pt: { cols: ['inch', 'cm'], rows: pants, def: 6 },
  r: { cols: ['ho', 'circ', 'dia', 'us', 'uk', 'iso', 'jp'], rows: ringRows, def: 11 },
}

/** 한 체계의 선택지(표기마다 한 줄). 같은 표기가 여러 줄이면 실제 값이 표기에 가장 가까운 줄 */
export function options(t: TabId, ci: number): { v: string; i: number }[] {
  const tb = TABLES[t]
  const out = new Map<string, number>()
  tb.rows.forEach((r, i) => {
    const v = r.cells[ci]
    const j = out.get(v)
    if (j === undefined) out.set(v, i)
    else if (r.x && tb.rows[j].x) {
      const want = parseFloat(v)
      if (Math.abs(r.x[ci] - want) < Math.abs(tb.rows[j].x![ci] - want)) out.set(v, i)
    }
  })
  return [...out].map(([v, i]) => ({ v, i }))
}

export const rowOf = (t: TabId, ci: number, v: string) => options(t, ci).find((o) => o.v === v)?.i ?? null

/** 실측값(신발 발길이 mm, 옷 cm, 반지 손가락 둘레 mm) → 그보다 작지 않은 첫 줄. 표보다 한 칸 넘게 작으면 low, 마지막보다 크면 high */
export function recommend(t: TabId, measured: number): { i: number | null; out: 'low' | 'high' | null } {
  const rows = TABLES[t].rows
  if (!Number.isFinite(measured) || measured <= 0) return { i: null, out: null }
  if (measured > rows[rows.length - 1].m + 1e-9) return { i: null, out: 'high' }
  if (measured <= rows[0].m - (rows[1].m - rows[0].m)) return { i: null, out: 'low' }
  return { i: rows.findIndex((r) => r.m >= measured - 1e-9), out: null }
}

// ── 선택 상태와 URL: t 탭, s 체계(열), v 표기
export type State = { t: TabId; s: string; v: string }
export const defaultOf = (t: TabId, s?: string): State => {
  const tb = TABLES[t]
  const col = s && tb.cols.includes(s) ? s : tb.cols[0]
  return { t, s: col, v: tb.rows[tb.def].cells[tb.cols.indexOf(col)] }
}
export const DEFAULT: State = defaultOf('m')

export function parseState(get: (k: string) => string | null): State {
  const t0 = get('t')
  const t = isTab(t0) ? t0 : DEFAULT.t
  const base = defaultOf(t, get('s') ?? undefined)
  const v = get('v')
  return v !== null && rowOf(t, TABLES[t].cols.indexOf(base.s), v) !== null ? { ...base, v } : base
}

/** 기본값과 다른 것만. v 는 그 탭 기본 줄의 같은 체계 표기와 다를 때만 */
export function toQuery(s: State): string {
  const q = new URLSearchParams()
  const d = defaultOf(s.t, s.s)
  if (s.t !== DEFAULT.t) q.set('t', s.t)
  if (s.s !== TABLES[s.t].cols[0]) q.set('s', s.s)
  if (s.v !== d.v) q.set('v', s.v)
  return q.toString()
}

/** 선택한 줄 번호(없으면 기본 줄) */
export const selectedRow = (s: State) => rowOf(s.t, TABLES[s.t].cols.indexOf(s.s), s.v) ?? TABLES[s.t].def
/** 열 키 → 표기 */
export const cellsOf = (t: TabId, i: number): Record<string, string> =>
  Object.fromEntries(TABLES[t].cols.map((c, j) => [c, TABLES[t].rows[i].cells[j]]))
