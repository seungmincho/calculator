// 양도소득세 회귀 체크: node scripts/check-capital-gains-tax.ts
import { calcCgt, reportDue, fullYears, simulate, tempPeriod, type CgtInput } from '../src/utils/capitalGainsTax.ts'

let fail = 0
const eq = (name: string, got: unknown, want: unknown) => {
  const ok = typeof want === 'number' ? Math.abs((got as number) - want) < 1e-6 : got === want
  if (!ok) { fail++; console.log('FAIL', name, got, '!=', want) }
}
const E = 100_000_000
const base: CgtInput = {
  kind: 'house', sale: 10 * E, acq: 5 * E, expense: 0, acqDate: '2021-09-01', saleDate: '2026-10-01',
  houses: 1, temp: false, newAcqDate: '', newAdjusted: false, adjusted: false, acqAdjusted: false,
  residence: 0, grace: false,
}
const c = (o: Partial<CgtInput>) => calcCgt({ ...base, ...o })

// 보유기간: 취득일의 n년 뒤 같은 날 = n년
eq('full 2y', fullYears('2024-03-15', '2026-03-15'), 2)
eq('full 1y', fullYears('2024-03-15', '2026-03-14'), 1)

// 1세대 1주택 12억 이하 2년 보유 → 전액 비과세
let r = c({})
eq('1house exempt', r.exempt, 'full'); eq('1house total', r.total, 0)
// 취득 당시 조정지역인데 거주 1년 → 비과세 안 됨, 장특 일반 10%(5년)
r = c({ acqAdjusted: true, residence: 1 })
eq('res fail', r.exempt, 'none'); eq('res fail lthd', r.lthdRate, 0.10)

// 고가주택: 15억/8억/경비 3천만, 8년 보유·5년 거주 → 과세비율 20%, 장특 32%+20%=52%
r = c({ sale: 15 * E, acq: 8 * E, expense: 30_000_000, acqDate: '2018-06-01', residence: 5, acqAdjusted: true })
eq('hv exempt', r.exempt, 'partial'); eq('hv taxable', r.taxableProfit, 134_000_000)
eq('hv lthd rate', r.lthdRate, 0.52); eq('hv lthd', r.lthd, 69_680_000)
eq('hv base', r.base, 61_820_000); eq('hv tax', r.tax, 9_076_800); eq('hv total', r.total, 9_984_480)
// 거주 2.5년 → 거주공제 8%, 거주 1년 → 표1 일반(8년 16%)
eq('res 2.5y 8%', c({ sale: 15 * E, acqDate: '2018-06-01', residence: 2.5 }).lthdResRate, 0.08)
r = c({ sale: 15 * E, acqDate: '2018-06-01', residence: 1 })
eq('res<2 general table', r.lthdTable, 'general'); eq('res<2 general 16%', r.lthdRate, 0.16)
// 장특 최대: 표2 80%, 표1 30%
eq('max 80', c({ sale: 20 * E, acqDate: '2010-01-01', residence: 12 }).lthdRate, 0.8)
eq('max 30', c({ kind: 'land', acqDate: '2006-01-01' }).lthdRate, 0.3)

// 단기 세율: 주택 1년 미만 70%, 2년 미만 60% (1억 차익 → 과표 9,750만)
r = c({ sale: 6 * E, acqDate: '2026-01-01' })
eq('house <1y 70%', r.tax, 68_250_000); eq('house <1y local', r.local, 6_825_000)
eq('house 1~2y 60%', c({ sale: 6 * E, acqDate: '2025-06-01' }).tax, 58_500_000)

// 다주택 중과(2026.5.10~): 조정 2주택 5년, 차익 4억 → 장특 배제, 과표 3.975억 × (40%+20%) − 2,594만
r = c({ houses: 2, sale: 9 * E })
eq('2house nonadj general', r.surcharge, 0); eq('2house nonadj lthd', r.lthdRate, 0.10)
r = c({ houses: 2, sale: 9 * E, adjusted: true })
eq('2house surcharge', r.surcharge, 0.2); eq('2house lthd excluded', r.lthdTable, 'excluded'); eq('2house tax', r.tax, 212_560_000)
eq('3house tax', c({ houses: 3, sale: 9 * E, adjusted: true }).tax, 252_310_000)
eq('grace contract', c({ houses: 2, sale: 9 * E, adjusted: true, grace: true }).tax, 117_060_000)
eq('grace till 5.9', c({ houses: 2, sale: 9 * E, adjusted: true, saleDate: '2026-05-09' }).surcharge, 0)
eq('5.10 surcharge', c({ houses: 2, sale: 9 * E, adjusted: true, saleDate: '2026-05-10' }).surcharge, 0.2)
// 보유 2년 미만은 유예 없음, 단기 60% vs 중과 중 큰 것
eq('2house <2y max', c({ houses: 2, sale: 9 * E, adjusted: true, acqDate: '2025-04-01', saleDate: '2026-05-01' }).tax, 238_500_000)
// 개정안(2027) 시뮬레이션: +5%p
eq('2027 proposal', c({ houses: 2, sale: 9 * E, adjusted: true, surchargeOverride: { two: 0.05, three: 0.1 } }).tax, Math.floor(397_500_000 * 0.45 - 25_940_000))

// 일시적 2주택
const tmp = { houses: 2 as const, temp: true, acqDate: '2020-01-01' }
eq('temp ok', c({ ...tmp, newAcqDate: '2024-03-01' }).exempt, 'full')
eq('temp gap fail', c({ ...tmp, acqDate: '2023-06-01', newAcqDate: '2024-01-01' }).exempt, 'none')
eq('temp late 3y', c({ ...tmp, newAcqDate: '2023-03-01' }).exempt, 'none')
const adjBoth = { adjusted: true, newAdjusted: true, newAcqDate: '2026-08-10' }
eq('period 2y', tempPeriod({ ...adjBoth, saleDate: '2026-10-01' }), 2)
eq('period 3y before 8.4', tempPeriod({ ...adjBoth, newAcqDate: '2026-08-03', saleDate: '2026-10-01' }), 3)
eq('period 3y new nonadj', tempPeriod({ ...adjBoth, newAdjusted: false, saleDate: '2026-10-01' }), 3)
eq('temp 2y fail', c({ ...tmp, ...adjBoth, saleDate: '2028-09-01' }).exempt, 'none')
eq('temp 2y ok', c({ ...tmp, ...adjBoth, saleDate: '2028-08-10' }).exempt, 'full')
eq('temp 3y nonadj new', c({ ...tmp, ...adjBoth, newAdjusted: false, saleDate: '2028-09-01' }).exempt, 'full')

// 분양권 70/60%, 장특 없음
eq('presale <1y', c({ kind: 'presale', sale: 6 * E, acqDate: '2026-01-01' }).tax, 68_250_000)
r = c({ kind: 'presale', sale: 6 * E, acqDate: '2020-01-01' })
eq('presale 1y+', r.tax, 58_500_000); eq('presale no lthd', r.lthdRate, 0)
// 토지 40%(1~2년), 비사업용 토지 +10%p (5년: 장특 10%, 과표 8,750만 × 34% − 576만)
eq('land 1~2y', c({ kind: 'land', sale: 6 * E, acqDate: '2025-06-01' }).tax, 39_000_000)
eq('nonbiz 5y', c({ kind: 'nonbiz', sale: 6 * E }).tax, 23_990_000)
eq('nonbiz <1y max', c({ kind: 'nonbiz', sale: 6 * E, acqDate: '2026-01-01' }).tax, 48_750_000)
// 손실·소액
eq('loss', c({ sale: 4 * E, houses: 2 }).total, 0)
eq('under basic', c({ sale: 5 * E + 2_000_000, houses: 2 }).total, 0)

// 예정신고 기한: 양도 달 말일 + 2개월, 주말이면 다음 영업일
eq('due weekend', reportDue('2026-03-15'), '2026-06-01')
eq('due', reportDue('2026-10-01'), '2026-12-31')
eq('due sat', reportDue('2026-08-20'), '2026-11-02')

// 시뮬레이션: 1년 10개월 보유 1주택 → 2년 되는 날 비과세
const sim = simulate({ ...base, sale: 8 * E, acqDate: '2024-12-01' }, false)
eq('sim first date', sim[0]?.date, '2026-12-01'); eq('sim zero', sim[0]?.total, 0); eq('sim months', sim[0]?.months, 2)
// 조정지역 취득 1주택, 거주 1.5년 계속 거주 → 거주 2년 되는 시점에 비과세
const sim2 = simulate({ ...base, acqAdjusted: true, residence: 1.5 }, true)
eq('sim res date', sim2[0]?.date, '2027-04-01'); eq('sim res total', sim2[0]?.total, 0)

if (fail) { console.log(`${fail} failed`); process.exit(1) }
console.log('check-capital-gains-tax: all passed')
