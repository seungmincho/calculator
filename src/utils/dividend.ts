// 배당금 계산기 — 세후 배당·금융소득 2천만원 기준·고배당 분리과세·계좌 비교·재투자. 회귀 체크: node scripts/check-dividend.ts
// 금액 단위: 원. 기준일 2026-11-07, 국가법령정보센터(law.go.kr) 현행 조문:
//   소득세법(시행 2026.7.1) · 조세특례제한법(시행 2026.9.18) · 같은 법 시행령(2026.9.18) · 지방세법(2026.7.1) ·
//   지방세특례제한법(2026.6.2) · 국민건강보험법 시행령(2026.10.1)·시행규칙(2026.9.28).
// 미반영(정확히 계산할 수 없어 화면 안내만): 종합과세 때 추가 세금(다른 소득·공제·그로스업·배당세액공제·비교과세에 좌우),
//   ISA 손실 통산·중도해지 추징, 사적연금 1,500만원 초과분 과세, 국내 상장 해외 ETF의 외국납부세액 처리.

const floor10 = (n: number) => Math.floor(Math.max(0, n) / 10) * 10 // 국고금관리법 §47: 10원 미만 버림
const pctOf = (n: number, p: number) => Math.floor((n * p) / 100 + 1e-6)
const clampPct = (p: number) => Math.min(100, Math.max(0, p || 0))

// ── 세율·기준 (출처 확인 2026-11-07) ──
/** 배당소득 원천징수 14% — 소득세법 §129①2호나 https://www.law.go.kr/법령/소득세법/제129조 */
export const DIV_RATE = 14
/** 지방소득세 특별징수 = 원천징수 소득세의 10% — 지방세법 §103의13① https://www.law.go.kr/법령/지방세법/제103조의13 */
export const LOCAL_RATE = 10
/** 이자·배당 합계 2천만원 이하면 분리과세로 끝, 넘으면 종합과세 — 소득세법 §14③6호 https://www.law.go.kr/법령/소득세법/제14조 */
export const FIN_THRESHOLD = 20_000_000
/** 분리과세 금융소득 1천만원 이하면 건보 소득월액(지역)·보수 외 소득월액(직장)에 넣지 않음, 넘으면 전액 —
 *  국민건강보험법 시행규칙 §44① 단서 https://www.law.go.kr/법령/국민건강보험법시행규칙/제44조 */
export const NHIS_FIN = 10_000_000
/** 직장가입자 보수 외 소득이 연 2천만원 넘으면 소득월액보험료 — 국민건강보험법 시행령 §41④ https://www.law.go.kr/법령/국민건강보험법시행령/제41조 */
export const NHIS_EXTRA = 20_000_000
/** 그로스업 10% — 소득세법 §17③ 단서(종합과세 때 2천만원 초과 국내 법인 배당에 더함, 같은 금액 §56 배당세액공제). 설명용 */
export const GROSS_UP = 10

/** ISA — 조세특례제한법 §91의18 https://www.law.go.kr/법령/조세특례제한법/제91조의18
 *  ② 비과세 200만원(서민형·농어민 400만원) ① 초과분 9% 분리과세(종합소득 합산 안 함) ③4 계약기간 3년 이상
 *  ③5 총납입 1억원, 연 2천만원×(1+경과연수, 최대 4)−누적납입 ⑥ 해지일에 원천징수.
 *  §129의2①: 직전 3개 과세기간 중 1회라도 금융소득종합과세 대상자면 가입·연장 불가. 지방소득세 0.9%는 지방세법 §103의13 */
export const ISA = { exempt: 2_000_000, exemptLow: 4_000_000, rate: 9, total: 100_000_000, annual: 20_000_000, years: 3 }

/** 연금계좌(연금저축·IRP) — 연금수령 원천징수: 70세 미만 5%, 80세 미만 4%, 80세 이상 3% (소득세법 §129①5의2가),
 *  연금외수령(기타소득) 15% (§129①6호나·§21①21호), 사적연금 연 1,500만원 이하 분리과세 (§14③9호다),
 *  연금저축계좌 납입 연 1,800만원·증권사는 집합투자증권(펀드·ETF)만 (소득세법 시행령 §40의2①1호나·②1호가),
 *  연금수령 = 55세 이후·가입 5년 경과 (시행령 §40의2③) */
export const PENSION = { under70: 5, under80: 4, over80: 3, other: 15, sepCap: 15_000_000, annual: 18_000_000 }

/** 고배당기업 배당 분리과세 세율 — 조세특례제한법 §104의27② (2025.12.23 신설) https://www.law.go.kr/법령/조세특례제한법/제104조의27
 *  2천만 이하 14% / 3억 이하 280만+초과분 20% / 50억 이하 5,880만+25% / 초과 12억3,380만+30%.
 *  지방소득세 = 이 세율의 10% (지방세특례제한법 §167의6). 2026.1.1 이후 받는 배당부터(부칙 §23),
 *  2028.12.31이 속하는 사업연도 배당까지. 신청: 다음 해 종합소득세 확정신고 때 분리과세신청서(조특법 시행령 §104의24⑥).
 *  이 배당은 2천만원 종합과세 기준 판단에서 빠진다(국세청 보도자료 2026.3.9
 *  https://www.nts.go.kr/nts/na/ntt/selectNttInfo.do?mi=2201&bbsId=1028&nttSn=1349597). 지급 때 원천징수는 일반 배당과 같은 §129 14% */
export const HD_TABLE = [
  { upTo: 20_000_000, base: 0, rate: 14 },
  { upTo: 300_000_000, base: 2_800_000, rate: 20 },
  { upTo: 5_000_000_000, base: 58_800_000, rate: 25 },
  { upTo: Infinity, base: 1_233_800_000, rate: 30 },
] as const

// ── 지급 주기 ──
export const FREQS = { monthly: 12, quarterly: 4, semiannual: 2, annual: 1 } as const
export type Freq = keyof typeof FREQS
export const FREQ_LIST: Freq[] = ['monthly', 'quarterly', 'semiannual', 'annual']
export const isFreq = (s: unknown): s is Freq => FREQ_LIST.includes(s as Freq)

/** 받을 때 떼는 세금. foreignPct = 해외주식의 외국 원천징수세율(%), null = 국내.
 *  해외: 국내 세액 = 14% − 외국에서 낸 세금, 외국 세금이 더 많으면 0 (소득세법 §129④) */
export function atSource(gross: number, foreignPct: number | null = null) {
  const g = Math.max(0, Math.floor(gross || 0))
  const foreign = foreignPct == null ? 0 : Math.floor((g * clampPct(foreignPct)) / 100)
  const income = floor10(pctOf(g, DIV_RATE) - foreign)
  const local = floor10((income * LOCAL_RATE) / 100)
  const total = foreign + income + local
  return { gross: g, foreign, income, local, total, net: g - total }
}

/** 실효 원천징수율(소수). 국내 0.154, 미국 15% → 0.15, 중국 10% → 0.144 */
export function effRate(foreignPct: number | null = null): number {
  const f = foreignPct == null ? 0 : clampPct(foreignPct) / 100
  return f + Math.max(0, DIV_RATE / 100 - f) * (1 + LOCAL_RATE / 100)
}

/** 월 세후 목표 → 필요한 세전 연 배당·투자금. 배당수익률 0 이하면 null */
export function requiredInvestment(monthlyNet: number, yieldPct: number, foreignPct: number | null = null) {
  if (!(yieldPct > 0)) return null
  const m = Math.max(0, monthlyNet || 0)
  const gross = Math.ceil((m * 12) / (1 - effRate(foreignPct)) - 1e-6)
  return { gross, amount: Math.ceil((gross * 100) / Math.min(100, yieldPct) - 1e-6) }
}

/** 2천만원 종합과세·1천만원 건보 기준. separated = 이 종목을 고배당 분리과세 신청(기준에서 빠짐) */
export function finCheck(thisDiv: number, otherFin: number, separated = false) {
  const d = Math.max(0, thisDiv || 0), o = Math.max(0, otherFin || 0)
  const counted = (separated ? 0 : d) + o
  const total = d + o
  return {
    total, counted,
    over: counted > FIN_THRESHOLD,
    excess: Math.max(0, counted - FIN_THRESHOLD),
    room: Math.max(0, FIN_THRESHOLD - counted),
    // ponytail: 고배당 분리과세분을 건보 소득에 넣는지 공단 안내가 없어 포함해 본다
    nhis: total > NHIS_FIN,
    nhisRoom: Math.max(0, NHIS_FIN - total),
  }
}

/** 기준(limit) 안에 머무는 최대 투자금. 다른 금융소득이 이미 기준 이상이면 0 */
export const maxAmountUnder = (limit: number, otherFin: number, yieldPct: number) =>
  yieldPct > 0 ? Math.floor((Math.max(0, limit - Math.max(0, otherFin || 0)) * 100) / Math.min(100, yieldPct) + 1e-6) : null

/** 고배당 분리과세 산출세액(소득세, 지방세 제외) */
export function hdTax(dividend: number): number {
  const d = Math.max(0, Math.floor(dividend || 0))
  let lower = 0
  for (const b of HD_TABLE) {
    if (d <= b.upTo) return b.base + pctOf(d - lower, b.rate)
    lower = b.upTo
  }
  return 0 // 도달 안 함(마지막 구간 Infinity)
}

/** 고배당 분리과세를 신청했을 때. 2천만원 이하면 세율 14%라 원천징수와 같다 */
export function highDividend(gross: number) {
  const g = Math.max(0, Math.floor(gross || 0))
  const income = hdTax(g)
  const local = Math.floor((income * LOCAL_RATE) / 100) // 지방세특례제한법 §167의6
  const withheld = atSource(g).total
  const separate = g > FIN_THRESHOLD
  const total = separate ? income + local : withheld
  return { income, local, total, withheld, extra: Math.max(0, total - withheld), net: g - total, separate }
}

/** ISA 3년(의무기간) 기준 연평균. 투자금 중 총납입한도 1억원을 넘는 몫은 일반 계좌로 본다 */
export function isaAccount(annualGross: number, amount: number, low = false, years: number = ISA.years) {
  const g = Math.max(0, Math.floor(annualGross || 0))
  const y = Math.max(1, Math.floor(years))
  const share = amount > ISA.total ? ISA.total / amount : 1
  const inGross = Math.floor(g * share)
  const profit = inGross * y
  const exempt = low ? ISA.exemptLow : ISA.exempt
  const income = floor10(pctOf(Math.max(0, profit - exempt), ISA.rate))
  const local = floor10((income * LOCAL_RATE) / 100)
  const outside = atSource(g - inGross)
  const perYearTax = (income + local) / y + outside.total
  return {
    inGross, overflow: Math.max(0, amount - ISA.total), exempt,
    termTax: income + local, outsideTax: outside.total,
    perYearTax, perYearNet: g - perYearTax,
  }
}

/** 연금계좌: 계좌 안 배당은 과세 이연, 꺼낼 때 세금(지방소득세 10% 포함) */
export function pensionAccount(annualGross: number) {
  const g = Math.max(0, Math.floor(annualGross || 0))
  const at = (rate: number) => { const income = floor10(pctOf(g, rate)); return income + floor10((income * LOCAL_RATE) / 100) }
  return { under70: at(PENSION.under70), under80: at(PENSION.under80), over80: at(PENSION.over80), other: at(PENSION.other) }
}

export interface ReinvestInput {
  amount: number
  yieldPct: number
  freq: Freq
  growthPct: number // 주당 배당금 연 성장률(%). 주가는 그대로
  taxRate: number // 소수 (effRate)
  years: number[]
}

/** 세후 배당을 받을 때마다 같은 가격으로 재투자. 주가 고정, 주당 배당금만 해마다 growth% 증가.
 *  ponytail: 주가 변동·종합과세 진입·수수료·환율 미반영 */
export function reinvest(p: ReinvestInput) {
  const n = FREQS[p.freq]
  const y0 = clampPct(p.yieldPct) / 100
  const g = Math.min(30, Math.max(0, p.growthPct || 0)) / 100
  const keep = 1 - Math.min(1, Math.max(0, p.taxRate))
  const start = Math.max(0, p.amount || 0)
  const want = new Set(p.years.filter((y) => y > 0 && y <= 100).map(Math.floor))
  const maxY = Math.max(0, ...want)
  let value = start, noReinvest = 0
  const rows: { year: number; value: number; monthlyNet: number; noReinvest: number }[] = []
  for (let yr = 0; yr < maxY; yr++) {
    const rate = y0 * Math.pow(1 + g, yr)
    let yearNet = 0
    for (let k = 0; k < n; k++) { const net = ((value * rate) / n) * keep; yearNet += net; value += net }
    noReinvest += start * rate * keep
    if (want.has(yr + 1)) rows.push({ year: yr + 1, value, monthlyNet: yearNet / 12, noReinvest })
  }
  return rows
}
