// 타이어 사이즈 계산 — 규격 해석·외경 비교·하중지수·속도기호·제조일(DOT). 순수 함수만.
//
// 출처(확인일 CHECKED)
// | 항목 | 기관 | URL | 기준일 |
// |------|------|-----|--------|
// | 하중지수 LI 0~257 → kg, 속도기호 B~Y → km/h, 제작시기 표기(주 2자리+연도 2자리), 트레드 깊이 1.6mm 이상 유지 | 국토교통부 「자동차 및 자동차부품의 성능과 기준에 관한 규칙」 제12조제1항·별표 1의2 | SOURCES.rule | 규칙 시행 2026-07-10(국토교통부령 제1602호), 별표 1의2 개정 2021-08-27 |
// | 제조 5년 이상 연 1회 이상 점검, 제조일로부터 최대 10년 권장, DOT 끝 4자리 = 주+연도 | 미쉐린코리아 | SOURCES.michelinAge | 확인일 기준 게시본 |
// | 10년 이상 된 타이어(스페어 포함)는 교체, 법적 한계 1.6mm | 콘티넨탈타이어 코리아 | SOURCES.continental | 확인일 기준 게시본 |
// | 기온 7°C 미만이면 겨울용 타이어 권장 | 미쉐린코리아 FAQ | SOURCES.michelinFaq | 확인일 기준 게시본 |
// | 겨울용 타이어는 영상 7도 이하에서도 쉽게 굳지 않음 | 한국타이어 보도자료(2021-11-25) | SOURCES.hankookWinter | 2021-11-25 |
// | 사이즈 변경: 제조사 승인 사이즈 준수, 일부 국가 직경 -2%~+1.5% 예외, 하중지수·속도등급은 순정보다 낮으면 안 됨 | 미쉐린코리아 | SOURCES.michelinSize | 확인일 기준 게시본 |
// 외경 ±3% 는 업계에서 흔히 쓰는 참고치로 공식 기준 원문을 찾지 못했다 → 화면에서 '참고'로만 쓴다.

export const CHECKED = '2026-11-22'

export const SOURCES = {
  rule: 'https://www.law.go.kr/%EB%B2%95%EB%A0%B9/%EC%9E%90%EB%8F%99%EC%B0%A8%EB%B0%8F%EC%9E%90%EB%8F%99%EC%B0%A8%EB%B6%80%ED%92%88%EC%9D%98%EC%84%B1%EB%8A%A5%EA%B3%BC%EA%B8%B0%EC%A4%80%EC%97%90%EA%B4%80%ED%95%9C%EA%B7%9C%EC%B9%99',
  michelinAge: 'https://www.michelin.co.kr/categories/michelin-tire-story/articles/signs-its-time-to-replace-your-tires',
  michelinFaq: 'https://www.michelin.co.kr/auto/faq-cars',
  michelinSize: 'https://www.michelin.co.kr/auto/advice/tyre-basics/change-tyre-size',
  continental: 'https://www.continental-tires.com/kr/ko/tire-knowledge/replacing-tires.html',
  hankookWinter: 'https://www.hankooktire.com/kr/ko/company/media-list/media-detail.600125.html',
} as const

/** 하중지수 0~257 의 최대 허용 하중(kg). 자동차규칙 별표 1의2 표를 그대로 옮김(인덱스 = LI) */
export const LOAD_KG: readonly number[] = [45,46.2,47.5,48.7,50,51.5,53,54.5,56,58,60,61.5,63,65,67,69,71,73,75,77.5,80,82.5,85,87.5,90,92.5,95,97.5,100,103,106,109,112,115,118,121,125,128,132,136,140,145,150,155,160,165,170,175,180,185,190,195,200,206,212,218,224,230,236,243,250,257,265,272,280,290,300,307,315,325,335,345,355,365,375,387,400,412,425,437,450,462,475,487,500,515,530,545,560,580,600,615,630,650,670,690,710,730,750,775,800,825,850,875,900,925,950,975,1000,1030,1060,1090,1120,1150,1180,1215,1250,1285,1320,1360,1400,1450,1500,1550,1600,1650,1700,1750,1800,1850,1900,1950,2000,2060,2120,2180,2240,2300,2360,2430,2500,2575,2650,2725,2800,2900,3000,3075,3150,3250,3350,3450,3550,3650,3750,3875,4000,4125,4250,4375,4500,4625,4750,4875,5000,5150,5300,5450,5600,5800,6000,6150,6300,6500,6700,6900,7100,7300,7500,7750,8000,8250,8500,8750,9000,9250,9500,9750,10000,10300,10600,10900,11200,11500,11800,12150,12500,12850,13200,13600,14000,14500,15000,15500,16000,16500,17000,17500,18000,18500,19000,19500,20000,20600,21200,21800,22400,23000,23600,24300,25000,25750,26500,27250,28000,29000,30000,30750,31500,32500,33500,34500,35500,36500,37500,38750,40000,41250,42500,43750,45000,46250,47500,48750,50000,51500,53000,54500,56000,58000,60000,61500,63000,65000,67000,69000,71000,73000]

/** 속도기호 → 최대 허용속도(km/h). 별표 1의2 표 순서 그대로. Y 는 "300 또는 300 초과" */
export const SPEED_KMH: Readonly<Record<string, number>> = {
  B: 50, C: 60, D: 65, E: 70, F: 80, G: 90, J: 100, K: 110, L: 120, M: 130, N: 140, P: 150,
  Q: 160, R: 170, S: 180, T: 190, U: 200, H: 210, V: 240, W: 270, Y: 300,
}

export type Size = {
  /** '' | 'P'(미국 승용 P-메트릭) | 'LT'(소형 트럭) | 'T'(응급용) | 'ST'(트레일러) */
  prefix: string
  width: number
  aspect: number
  /** 'R' 레이디얼 | 'ZR' 고속용 레이디얼 | 'D' 바이어스 | 'B' 벨티드 바이어스 | '' 생략 */
  cons: string
  rim: number
  li: number | null
  speed: string | null
  xl: boolean
}

export type ParseErr = 'empty' | 'format' | 'width' | 'aspect' | 'rim' | 'li' | 'speed'

// 접두 · 폭 / 편평비 · 구조 · 림 · (하중지수[/복륜] 속도기호) · XL 등. 구분자는 / - 공백 모두 허용
const RE = /^(P|LT|ST|T)?\s*(\d{3})\s*[/\-\s]\s*(\d{2})\s*(ZR|R|D|B)?\s*[/\-]?\s*(\d{2}(?:\.5)?)C?(?:\s*\(?\s*(\d{2,3})(?:\s*\/\s*\d{2,3})?\s*([A-Z])?\s*\)?)?((?:\s+(?:XL|RF|RFT|C|M\+S|M&S|EXTRA\s*LOAD|REINFORCED|RUN\s*FLAT|3PMSF))*)\s*$/

export function parseSize(input: string): { ok: true; size: Size } | { ok: false; err: ParseErr } {
  const s = input.toUpperCase().replace(/\s+/g, ' ').trim()
  if (!s) return { ok: false, err: 'empty' }
  const m = RE.exec(s)
  if (!m) return { ok: false, err: 'format' }
  const width = +m[2], aspect = +m[3], rim = +m[5]
  if (width < 100 || width > 400) return { ok: false, err: 'width' }
  if (aspect < 20 || aspect > 95) return { ok: false, err: 'aspect' }
  if (rim < 10 || rim > 26) return { ok: false, err: 'rim' }
  const li = m[6] === undefined ? null : +m[6]
  if (li !== null && li >= LOAD_KG.length) return { ok: false, err: 'li' }
  const speed = m[7] ?? null
  if (speed !== null && !(speed in SPEED_KMH)) return { ok: false, err: 'speed' }
  return { ok: true, size: { prefix: m[1] ?? '', width, aspect, cons: m[4] ?? '', rim, li, speed, xl: /XL|EXTRA|REINFORCED/.test(m[8] ?? '') } }
}

/** 공유·표시용 표준 표기: '205/55R16 91V', '225/40ZR18 92Y XL' */
export function formatSize(z: Size): string {
  const svc = z.li !== null ? ` ${z.li}${z.speed ?? ''}` : ''
  return `${z.prefix}${z.width}/${z.aspect}${z.cons || 'R'}${z.rim}${svc}${z.xl ? ' XL' : ''}`
}

export const MM_PER_INCH = 25.4

/** 이론 치수(mm). 사이드월 = 폭 × 편평비/100, 외경 = 림 × 25.4 + 2 × 사이드월, 둘레 = π × 외경 */
export function dims(z: Pick<Size, 'width' | 'aspect' | 'rim'>) {
  const sidewall = (z.width * z.aspect) / 100
  const diameter = z.rim * MM_PER_INCH + 2 * sidewall
  const circumference = Math.PI * diameter
  return { sidewall, diameter, circumference, revsPerKm: 1_000_000 / circumference }
}

/** 외경 차이 구간. tight = 미쉐린이 소개한 일부 국가 예외 범위(-2%~+1.5%), common = 업계 통용 참고치 ±3% */
export type Band = 'tight' | 'common' | 'over'
export const bandOf = (pct: number): Band => (pct >= -2 - 1e-9 && pct <= 1.5 + 1e-9 ? 'tight' : Math.abs(pct) <= 3 + 1e-9 ? 'common' : 'over')

/** a(기준) 대비 b. 속도계는 a 기준으로 맞춰져 있다고 보고, 표시 v km/h 일 때 실제 속도 = v × b외경/a외경 */
export function compare(a: Size, b: Size) {
  const da = dims(a).diameter, db = dims(b).diameter
  const pct = ((db - da) / da) * 100
  return { diffMm: db - da, pct, band: bandOf(pct), actualAt: (v: number) => (v * db) / da }
}

/** 외경이 a 와 가까운 인치업 후보(림 +1·+2, 폭은 같거나 넓게, 편평비 5 단위). 림마다 가까운 순 n 개 */
export function inchUps(a: Size, n = 2) {
  const da = dims(a).diameter
  const out: { rim: number; sizes: { label: string; pct: number }[] }[] = []
  for (const rim of [a.rim + 1, a.rim + 2]) {
    if (rim > 26) break
    const c: { label: string; pct: number }[] = []
    for (let width = a.width; width <= Math.min(a.width + 30, 355); width += 10) {
      for (let aspect = 25; aspect <= 80; aspect += 5) {
        const pct = ((dims({ width, aspect, rim }).diameter - da) / da) * 100
        if (Math.abs(pct) <= 1.5) c.push({ label: `${width}/${aspect}R${rim}`, pct })
      }
    }
    c.sort((x, y) => Math.abs(x.pct) - Math.abs(y.pct))
    out.push({ rim, sizes: c.slice(0, n) })
  }
  return out
}

// ── 제조일(DOT 끝 4자리 = 주 2자리 + 연도 2자리, 2000년부터)
export type DotErr = 'empty' | 'format' | 'week' | 'future' | 'old'
export type DotStatus = 'ok' | 'check' | 'replace'
export const AGE_CHECK = 5 // 미쉐린: 5년 이상 연 1회 이상 점검
export const AGE_REPLACE = 10 // 미쉐린·콘티넨탈: 최대 10년
const YEAR_MS = 365.2425 * 86_400_000

/** today = 오늘 0시(ms). 마지막 숫자 묶음을 쓴다('DOT 4B 2524' → 2524). 3자리는 2000년 이전 표기 */
export function parseDot(input: string, today: number):
  { ok: true; year: number; week: number; month: number; age: number; status: DotStatus } | { ok: false; err: DotErr } {
  const runs = input.match(/\d+/g)
  if (!runs) return { ok: false, err: input.trim() ? 'format' : 'empty' }
  const d = runs[runs.length - 1]
  if (d.length === 3) return { ok: false, err: 'old' }
  if (d.length !== 4) return { ok: false, err: 'format' }
  const week = +d.slice(0, 2), year = 2000 + +d.slice(2)
  if (week < 1 || week > 53) return { ok: false, err: 'week' }
  const made = Date.UTC(year, 0, 1 + (week - 1) * 7)
  if (made > today) return { ok: false, err: 'future' }
  const age = (today - made) / YEAR_MS
  return { ok: true, year, week, month: new Date(made).getUTCMonth() + 1, age, status: age >= AGE_REPLACE ? 'replace' : age >= AGE_CHECK ? 'check' : 'ok' }
}

// ── URL: ?a=…&b=… (표준 표기). 기본값이면 쿼리 없음
export type State = { a: string; b: string }
export const DEFAULT: State = { a: '205/55R16 91V', b: '225/45R17 94W' }

export function parseState(get: (k: string) => string | null): State {
  const pick = (k: keyof State) => {
    const r = parseSize(get(k) ?? '')
    return r.ok ? formatSize(r.size) : DEFAULT[k]
  }
  return { a: pick('a'), b: pick('b') }
}

export function toQuery(s: State): string {
  const q = new URLSearchParams()
  if (s.a !== DEFAULT.a) q.set('a', s.a)
  if (s.b !== DEFAULT.b) q.set('b', s.b)
  return q.toString()
}

/** 자주 쓰는 규격(경차·준중형·중형·SUV) */
export const PRESETS = ['175/60R15', '195/65R15', '205/55R16', '215/55R17', '225/45R17', '235/55R19', '245/45R18'] as const
