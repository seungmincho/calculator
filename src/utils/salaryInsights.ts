/**
 * 연봉 계산기 결과 부가 지표 (상위 %, 인상 시뮬레이션, 시급 환산). 순수 함수.
 * 세금 계산 자체는 netSalary.ts 그대로 사용 — 여기서 요율/공식을 새로 만들지 않는다.
 */
import { calculateNetSalary, type NetSalaryInput } from './netSalary'

/**
 * 국세청 근로소득 백분위(천분위) 자료 — 2024년 귀속(2025년 연말정산 신고분), 근로소득자 21,078,535명.
 * 연봉 계산기(SalaryCalculator)와 연봉 순위(SalaryRank)가 같이 쓰는 단일 출처. 매년 갱신 시 여기만 수정.
 *
 * 출처: 공공데이터포털 「국세청_근로소득 백분위(천분위) 자료_20251231」 (제공 국세청 국세데이터담당관실,
 *       2026-02-24 등록·2026-05-08 수정, CSV 109행) https://www.data.go.kr/data/15082063/fileData.do
 *       확인일 2026-10-04. 2025년 귀속분은 2027-02 등록 예정이라 이 표가 최신.
 * 아래 배열은 CSV '총급여'(억원) 열 그대로이고, 인원은 분위마다 같다(전체의 1% 또는 0.1%).
 * 국세청은 분위 경계값을 공개하지 않는다 → 분위 평균을 분위 가운데 지점에 놓고 이웃 평균 사이를 선형 보간해 경계를 추정.
 * 갱신: 새 CSV의 총급여 열, NTS_WORKERS(인원 합계), NTS_SOURCE_YEAR만 바꾸고 scripts/check-salary-insights.mjs 실행.
 */
export const NTS_SOURCE_YEAR = 2024
const NTS_WORKERS = 21_078_535
/** 상위 0.1%, 0.2%, … 1.0% 분위의 총급여 합계(억원) */
const NTS_PAY_TOP_PERMILLE = [210647, 92533, 73669, 63579, 57025, 52164, 48661, 45875, 43742, 42059]
/** 상위 2%, 3%, … 100% 분위의 총급여 합계(억원) */
const NTS_PAY_PERCENT = [
  365333, 310222, 276491, 252607, 234741, 220389, 209213, 200197, 192172, 184848,
  178188, 172033, 166247, 160753, 155494, 150669, 146126, 141794, 137731, 133886,
  130268, 126929, 123811, 120711, 117673, 114793, 112010, 109304, 106713, 104281,
  101950, 99856, 97683, 95642, 93643, 91700, 89861, 88155, 86436, 84751,
  83163, 81577, 80070, 78586, 77152, 75900, 74676, 73343, 72021, 70785,
  69529, 68265, 67008, 65782, 64575, 63426, 62467, 61230, 60140, 58958,
  57951, 56836, 55752, 54740, 53596, 52864, 52159, 51212, 50259, 48716,
  47284, 45689, 44044, 42336, 40523, 38743, 37171, 35230, 33380, 31593,
  29762, 27814, 26056, 24654, 22734, 20942, 19255, 17446, 16165, 14618,
  12983, 11291, 9613, 8088, 6429, 4876, 3480, 1932, 450,
]

/** [하위 lo%, 하위 hi%, 1인 평균 총급여(만원)] — 하위 % 오름차순 */
const NTS_BINS: [number, number, number][] = [
  ...NTS_PAY_PERCENT.map((pay, i): [number, number, number] => [98 - i, 99 - i, (pay * 1e6) / NTS_WORKERS]),
  ...NTS_PAY_TOP_PERMILLE.map((pay, i): [number, number, number] => [(999 - i) / 10, (1000 - i) / 10, (pay * 1e7) / NTS_WORKERS]),
].sort((a, b) => a[0] - b[0])

/**
 * [하위 %, 연간 총급여(만원)] — 하위 1~99%, 99.1~99.8% 경계 추정치.
 * 최상위 0.1%는 평균이 극단값에 끌려가 경계를 잡을 수 없어 표는 99.8%(약 3.9억)에서 끝난다.
 */
export const NTS_INCOME_PERCENTILES: [number, number][] = NTS_BINS.slice(0, -2).map(([lo, hi, mean], k): [number, number] => {
  const [lo2, hi2, mean2] = NTS_BINS[k + 1]
  const m1 = (lo + hi) / 2, m2 = (lo2 + hi2) / 2
  return [hi, Math.round(mean + ((hi - m1) / (m2 - m1)) * (mean2 - mean))]
})

/** 연 총급여(원)가 분포표에서 하위 몇 %인지 (선형 보간). 표 최상단 초과 = 남은 구간의 중간 */
export function percentileBelow(grossAnnual: number, table: [number, number][] = NTS_INCOME_PERCENTILES): number {
  const man = grossAnnual / 10000
  const p = table
  if (man <= p[0][1]) return p[0][0] * (Math.max(0, man) / p[0][1])
  const [lp, lv] = p[p.length - 1]
  if (man >= lv) return lp + (100 - lp) / 2
  const i = p.findIndex(([, v], k) => man >= v && man <= p[k + 1][1])
  const [pl, vl] = p[i], [ph, vh] = p[i + 1]
  return pl + ((man - vl) / (vh - vl)) * (ph - pl)
}

/** 하위 % → 상위 % (0.1 단위, 최소 0.1) */
export const toTop = (below: number) => Math.max(0.1, Math.round((100 - below) * 10) / 10)

/** 연 총급여(원) → 국세청 기준 상위 몇 % */
export function topPercent(grossAnnual: number): number {
  return toTop(percentileBelow(grossAnnual))
}

/** 다음 국세청 구간까지: gap원 더 벌면 상위 top%. 표 최상단 이상이면 null */
export function nextMilestone(grossAnnual: number): { gap: number; top: number } | null {
  const row = NTS_INCOME_PERCENTILES.find(([, v]) => v * 10000 > grossAnnual)
  return row ? { gap: row[1] * 10000 - grossAnnual, top: toTop(row[0]) } : null
}

/** [a,b) 만원 구간에 속한 근로자 비율(%) — 분포 곡선용. 같은 보간표에서 파생 */
export function shareBetween(aMan: number, bMan: number): number {
  return percentileBelow(bMan * 10000) - percentileBelow(aMan * 10000)
}

/** 월 소정근로시간 (주 40시간 + 주휴 8시간) × 4.345주 ≈ 209시간 */
export const MONTHLY_HOURS = 209

export function hourlyNet(netMonthly: number): number {
  return Math.floor(netMonthly / MONTHLY_HOURS)
}

/** 연봉 raisePct% 인상 시 실수령 변화. 같은 공제 조건(opt)으로 다시 계산 */
export function simulateRaise(grossAnnual: number, raisePct: number, opt: NetSalaryInput) {
  const before = calculateNetSalary(grossAnnual, opt)
  const newGross = Math.round(grossAnnual * (1 + raisePct / 100))
  const after = calculateNetSalary(newGross, opt)
  if (!before || !after) return null
  const grossGain = newGross - grossAnnual
  const netGain = after.netAnnual - before.netAnnual
  return {
    newGross,
    newNetMonthly: after.netMonthly,
    monthlyGain: after.netMonthly - before.netMonthly,
    netGainPct: (netGain / before.netAnnual) * 100,
    /** 인상분 중 실제로 손에 남는 비율 (%) */
    keepPct: grossGain > 0 ? (netGain / grossGain) * 100 : 0,
  }
}
