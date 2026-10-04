// 일용직 세금 계산기 회귀 체크: node scripts/check-daily-wage-tax.ts
import { calcDailyWageTax, chunks, compare33, dayIncomeTax, socialEstimate } from '../src/utils/dailyWageTax.ts'

let fail = 0
const eq = (name: string, got: unknown, want: unknown) => {
  const ok = Array.isArray(want) ? JSON.stringify(got) === JSON.stringify(want) : got === want
  if (!ok) { fail++; console.log('FAIL', name, got, '!=', want) }
}
const one = (wage: number, extra: Partial<Parameters<typeof calcDailyWageTax>[0]> = {}) =>
  calcDailyWageTax({ wage, days: 1, mode: 'day', ...extra })

// 15만원 이하 → 과세분 없음
eq('150k tax', one(150_000).incomeTax, 0)
eq('100k tax', one(100_000).incomeTax, 0)
// 187,000 → 일 세액 999원, 소액부징수로 0원 / 188,000 → 1,026원
eq('187k dayTax', dayIncomeTax(187_000), 999)
eq('187k exempt', one(187_000).incomeTax, 0)
eq('187k exempted', one(187_000).exempted, 999)
eq('187,037 still exempt', one(187_037).incomeTax, 0)
eq('187,038 taxed', one(187_038).incomeTax, 1_000)
eq('188k tax', one(188_000).incomeTax, 1_026)
eq('188k local', one(188_000).localTax, 102)
// 200,000 → 소득세 1,350원 + 지방세 135원, 고용보험 1,800원
const r200 = one(200_000)
eq('200k tax', r200.incomeTax, 1_350)
eq('200k local', r200.localTax, 135)
eq('200k ei', r200.employment, 1_800)
eq('200k net', r200.net, 200_000 - 1_350 - 135 - 1_800)
// 300,000 → 150,000 × 2.7% = 4,050원, 지방세 405원
const r300 = one(300_000)
eq('300k tax', r300.incomeTax, 4_050)
eq('300k local', r300.localTax, 405)
eq('300k ei', r300.employment, 2_700)

// 지급 단위 합산: 187,000원 × 20일
eq('daily pay exempt', calcDailyWageTax({ wage: 187_000, days: 20, mode: 'day' }).incomeTax, 0)
const lump = calcDailyWageTax({ wage: 187_000, days: 20, mode: 'month' })
eq('lump tax', lump.incomeTax, 19_980)
eq('lump local', lump.localTax, 1_998)
eq('lump payments', lump.payments, 1)
eq('lumpTax from daily', calcDailyWageTax({ wage: 187_000, days: 20, mode: 'day' }).lumpTax, 19_980)
// 주급: 일 세액 270원(160,000) × 주 3일 = 810 → 면제, 주 4일 = 1,080 → 징수
eq('160k dayTax', dayIncomeTax(160_000), 270)
eq('week 3d exempt', calcDailyWageTax({ wage: 160_000, days: 12, mode: 'week', weekDays: 3 }).incomeTax, 0)
const w4 = calcDailyWageTax({ wage: 160_000, days: 10, mode: 'week', weekDays: 4 })
eq('chunks 10/4', chunks(10, 4), [4, 4, 2])
eq('week 4d tax', w4.incomeTax, 1_080 * 2) // 마지막 2일분 540원은 면제
eq('week 4d local', w4.localTax, 108 * 2)
eq('week 4d exempted', w4.exempted, 540)
// 일당 200,000 × 20일 월말 일괄
const m20 = calcDailyWageTax({ wage: 200_000, days: 20, mode: 'month' })
eq('20d gross', m20.gross, 4_000_000)
eq('20d tax', m20.incomeTax, 27_000)
eq('20d local', m20.localTax, 2_700)
eq('20d ei', m20.employment, 36_000)
eq('20d net', m20.net, 3_934_300)
eq('20d perDay net', m20.perDay.net, 196_715)

// 비과세 식대: 하루 1만원 × 20일 = 20만원 한도 내, 과세 190,000
const meal = calcDailyWageTax({ wage: 200_000, days: 20, mode: 'day', meal: 10_000 })
eq('meal taxableDay', meal.taxableDay, 190_000)
eq('meal tax', meal.incomeTax, 1_080 * 20)
eq('meal ei base', meal.employment, Math.floor(3_800_000 * 0.009 / 10) * 10)
// 한도: 하루 2만원 × 20일 → 하루 1만원까지만
eq('meal cap', calcDailyWageTax({ wage: 200_000, days: 20, mode: 'day', meal: 20_000 }).meal, 10_000)
// 고용보험 끄기, 입력 정리
eq('ei off', calcDailyWageTax({ wage: 200_000, days: 1, mode: 'day', employment: false }).employment, 0)
eq('days clamp', calcDailyWageTax({ wage: 200_000, days: 0, mode: 'day' }).days, 1)
eq('days max', calcDailyWageTax({ wage: 200_000, days: 99, mode: 'day' }).days, 31)
eq('NaN wage', calcDailyWageTax({ wage: NaN, days: 5, mode: 'day' }).net, 0)

// 3.3% 비교: 4,000,000 → 120,000 + 12,000
const c = compare33(4_000_000, m20.incomeTax + m20.localTax)
eq('33 total', c.total, 132_000)
eq('33 diff', c.diff, 132_000 - 29_700)

// 국민연금·건강보험 참고 추정 (2026 요율)
const s = socialEstimate(4_000_000)
eq('pension', s.pension, 190_000)
eq('health', s.health, 143_800)
eq('care', s.care, 18_890)
eq('pension floor', socialEstimate(200_000).pension, Math.floor(410_000 * 0.0475 / 10) * 10)

if (fail) { console.log(`${fail} failed`); process.exit(1) }
console.log('daily-wage-tax: all ok')
