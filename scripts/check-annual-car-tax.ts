// 자동차세 회귀 체크: node scripts/check-annual-car-tax.ts
import { calcAnnual, calcLump, calcProrated, carAge, ageReduction, ageSeries, type CarInput } from '../src/utils/annualCarTax.ts'

let fail = 0
const eq = (name: string, got: unknown, want: unknown) => {
  const ok = typeof want === 'number' ? Math.abs((got as number) - want) < 1e-6 : got === want
  if (!ok) { fail++; console.log('FAIL', name, got, '!=', want) }
}
const base: CarInput = { kind: 'car', use: 'private', cc: 1999, regYear: 2022, regMonth: 3, van: 'small', ton: 1 }
const Y = 2026

// 차령: 1~6월 등록 = 연도차+1, 7~12월 등록 1기 = 연도차, 2기 = +1
eq('age H1 reg', carAge(2026, 2022, 3, 1), 5)
eq('age H2 reg 1기', carAge(2026, 2022, 9, 1), 4)
eq('age H2 reg 2기', carAge(2026, 2022, 9, 2), 5)
eq('red 2y', ageReduction(2), 0)
eq('red 3y', ageReduction(3), 0.05)
eq('red 12y', ageReduction(12), 0.5)
eq('red 20y', ageReduction(20), 0.5)

// 1,999cc 2022.3 등록 → 2026 차령 5년(15%): 1999*200*0.85 = 339,830 → 기분 169,910, 교육세 50,970
let r = calcAnnual(base, Y)
eq('2000 tax', r.tax, 339_820); eq('2000 edu', r.edu, 101_940); eq('2000 total', r.total, 441_760)
// 신차(차령 1~2) 경감 없음: 399,800 → 기분 199,900 / 교육세 59,970
r = calcAnnual({ ...base, regYear: 2025 }, Y)
eq('new total', r.total, 2 * (199_900 + 59_970))
// 경차 998cc: 79,840 + 30% = 103,790
r = calcAnnual({ ...base, cc: 998, regYear: 2026 }, Y)
eq('light', r.total, 2 * (39_920 + 11_970))
// 1,598cc 140원
eq('1600', calcAnnual({ ...base, cc: 1598, regYear: 2026 }, Y).tax, 1598 * 140)
// 전기차 비영업 10만 + 교육세 3만 = 13만, 차령 경감 없음
eq('ev', calcAnnual({ ...base, kind: 'ev', regYear: 2015 }, Y).total, 130_000)
// 영업용 승용 2,000cc 19원, 교육세 없음
eq('biz car', calcAnnual({ ...base, use: 'business', regYear: 2026 }, Y).total, 1999 * 19 - 1999 * 19 % 20)
// 차령 경감은 비영업용 승용만 (지방세법 제127조①2호) — 영업용 10년차도 경감 없음
eq('biz car no age cut', calcAnnual({ ...base, use: 'business', regYear: 2017 }, Y).total, 1999 * 19 - 1999 * 19 % 20)
// 승합·화물 정액, 교육세 없음
eq('van small', calcAnnual({ ...base, kind: 'van' }, Y).total, 65_000)
eq('truck 1t', calcAnnual({ ...base, kind: 'truck' }, Y).total, 28_500)

// 연납 (지방세법 제128조③ 계산식): 1월 = 연세액 × 334/365 × 5%, 6월 = 제2기분 × 5%, 9월 = 제2기분 × 92/184 × 5%
const ev = calcAnnual({ ...base, kind: 'ev' }, Y)
const jan = calcLump(ev, Y, 1)
eq('ev jan tax', jan.tax, 95_420) // 100,000 - 4,575.3 → 95,420
eq('ev jan edu', jan.edu, 28_620)
eq('ev jan pct ~4.58', Math.round(jan.pct * 10) / 10, 4.6)
eq('ev mar tax', calcLump(ev, Y, 3).tax, 96_230) // 100,000 - 100,000×275/365×5%(3,767.1) → 96,232.9
const jun = calcLump(ev, Y, 6)
eq('ev jun tax', jun.tax, 97_500) // 100,000 - 50,000×5%
const sep = calcLump(ev, Y, 9)
eq('ev sep tax', sep.tax, 98_750) // 100,000 - 50,000×92/184×5%
if (!(jan.saved > calcLump(ev, Y, 3).saved && calcLump(ev, Y, 3).saved > jun.saved && jun.saved > sep.saved)) { fail++; console.log('FAIL lump order') }

// 일할: 전기차 2026-01-01~2026-06-30 (181일) → 100,000×181/365 = 49,589 → 49,580
const pr = calcProrated(ev, Y, '2026-01-01', '2026-06-30')
eq('pr days', pr.days, 181); eq('pr tax', pr.tax, 49_580)
eq('pr full year', calcProrated(ev, Y, '2025-05-01', '2027-01-01').tax, 100_000)
eq('pr reversed', calcProrated(ev, Y, '2026-06-01', '2026-05-01').days, 0)

// 차령 추이: 1년차·2년차 경감 0, 12년차 50%, 13년차도 50%
const s = ageSeries(base, Y)
eq('series len', s.length, 13); eq('series 1', s[0].reduction, 0); eq('series 12', s[11].reduction, 0.5); eq('series 13', s[12].reduction, 0.5)

if (fail) { console.log(`${fail} failed`); process.exit(1) }
console.log('annual-car-tax: all ok')
