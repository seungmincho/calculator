// 임대수익률 계산기 회귀 체크: node scripts/check-rental-yield.ts
import { acquisitionCosts, calcRental, rentForTarget, priceForTarget, sensitivity, type RentalInput } from '../src/utils/rentalYield.ts'

let fail = 0
const eq = (name: string, got: unknown, want: unknown, tol = 1e-6) => {
  const ok = typeof want === 'number' && typeof got === 'number' ? Math.abs(got - want) <= tol : got === want
  if (!ok) { fail++; console.log('FAIL', name, got, '!=', want) }
}
const ok = (name: string, cond: boolean) => { if (!cond) { fail++; console.log('FAIL', name) } }

// ── A. 오피스텔 2억, 보증금 1천만, 월세 80만, 공실 5%, 수선비 50만, 대출 1억 4.5% 이자만 ──
const A: RentalInput = {
  type: 'officetel', price: 200_000_000, deposit: 10_000_000, rent: 800_000, mgmt: 0, vacancy: 5, repair: 500_000, holdTax: 0, extra: 0,
  loan: 100_000_000, rate: 4.5, repay: 'interest', years: 30, owner: '2', adjusted: false, over85: false,
}
const acqA = acquisitionCosts(A)
eq('A tax 4.6%', acqA.tax, 9_200_000)          // 취득세 8,000,000 + 지방교육세 800,000 + 농특세 400,000
eq('A broker 0.5%+VAT', acqA.broker, 1_100_000)
eq('A misc', acqA.misc, 787_000)               // 채권 1.4억×1.6%×5% = 112,000 + 인지세 75,000 + 법무사 600,000
eq('A acq total', acqA.total, 11_087_000)
const a = calcRental(A)
eq('A surface', a.surface, (9_600_000 / 190_000_000) * 100)
eq('A noi', a.noi, 8_620_000)
eq('A base', a.base, 201_087_000)
eq('A net', a.net, (8_620_000 / 201_087_000) * 100)
eq('A interest', a.interest, 4_500_000)
eq('A payment', a.payment, 375_000)
eq('A cash', a.cash, 101_087_000)
eq('A leveraged', a.leveraged, (4_120_000 / 101_087_000) * 100)
eq('A monthlyCF', a.monthlyCF, 343_333)
eq('A breakEven', a.breakEvenRent, 438_597)    // ceil(5,000,000 / 11.4)
eq('A vacancy loss', a.vacancyLoss, 480_000)

// 역산: 순수익률 5%
const rt = rentForTarget(A, 5)
eq('A rent for 5%', rt, 925_821)               // ceil((0.05 × 201,087,000 + 500,000) / 11.4)
ok('A rent for 5% hits', (calcRental({ ...A, rent: rt! }).net ?? 0) >= 5)
ok('A rent-1 misses', (calcRental({ ...A, rent: rt! - 1 }).net ?? 0) < 5)
const pt = priceForTarget(A, 5)!
ok('A price for 5% ~1.727억', pt > 172_000_000 && pt < 173_500_000)
ok('A price hits 5%', (calcRental({ ...A, price: pt }).net ?? 0) >= 5)
ok('A price+1만 misses', (calcRental({ ...A, price: pt + 10_000 }).net ?? 0) < 5)
eq('target 0 → null', rentForTarget(A, 0), null)

// 민감도: 금리 3.5%·공실 0% → 이자 floor(1억×3.5%/12)=291,666, NOI 9,100,000
const s = sensitivity(A)
eq('sens rate', s[0].rate, 3.5)
eq('sens CF', s[0].cells[0].monthlyCF, Math.round(9_100_000 / 12 - 291_666))
eq('sens center = base', s[1].cells[1].monthlyCF, calcRental({ ...A, vacancy: 5 }).monthlyCF)
eq('sens rate floor 0', sensitivity({ ...A, rate: 0.5 })[0].rate, 0)

// 대출이 실투자금보다 크면 레버리지 수익률 없음
eq('cash<=0 leveraged null', calcRental({ ...A, loan: 250_000_000 }).leveraged, null)
eq('price<=deposit surface null', calcRental({ ...A, deposit: 200_000_000 }).surface, null)

// ── B. 주택 5억, 대출 0, 공실 0 → 레버리지 = 순수익률 ──
const B: RentalInput = { ...A, type: 'house', price: 500_000_000, deposit: 50_000_000, rent: 1_500_000, vacancy: 0, repair: 0, loan: 0 }
const acqB = acquisitionCosts(B)
eq('B tax 1.1%', acqB.tax, 5_500_000)           // 취득세 1% + 지방교육세 0.1%, 85㎡ 이하 농특세 비과세
eq('B broker 0.4%+VAT', acqB.broker, 2_200_000)
eq('B misc', acqB.misc, 1_130_000)             // 채권 3.5억×2.6%×5% = 455,000 + 75,000 + 600,000
const b = calcRental(B)
eq('B surface 4%', b.surface, 4)
eq('B net', b.net, (18_000_000 / 458_830_000) * 100)
eq('B zero loan leveraged = net', b.leveraged, b.net)
eq('B interest 0', b.interest, 0)
eq('B CF', b.monthlyCF, 1_500_000)
eq('B breakEven 0', b.breakEvenRent, 0)
// 조정대상지역 2주택 중과 8% (+ 지방교육세 0.4%, 85㎡ 이하 농특세 비과세)
const heavy = acquisitionCosts({ ...B, adjusted: true })
eq('B heavy tax', heavy.tax, 42_000_000)
eq('B heavy flag', heavy.heavy, true)
eq('B over85 nong', acquisitionCosts({ ...B, over85: true }).tax, 6_500_000) // + 농특세 0.2%

// ── C. 상가 3억, 공실 100%, 원리금균등 1억 5% 20년 ──
const C: RentalInput = {
  ...A, type: 'store', price: 300_000_000, deposit: 30_000_000, rent: 1_500_000, vacancy: 100, mgmt: 100_000, repair: 0, holdTax: 600_000,
  loan: 100_000_000, rate: 5, repay: 'amortize', years: 20,
}
const acqC = acquisitionCosts(C)
eq('C broker 0.9%+VAT', acqC.broker, 2_970_000)
eq('C tax 4.6%', acqC.tax, 13_800_000)
eq('C acq total', acqC.total, 13_800_000 + 2_970_000 + 168_000 + 75_000 + 600_000)
const c = calcRental(C)
eq('C noi', c.noi, -1_800_000)
eq('C payment', c.payment, 659_956)
// 첫해 이자: 원리금균등 직접 계산
let bal = 100_000_000, int12 = 0
for (let n = 0; n < 12; n++) { const it = Math.floor(bal * 0.05 / 12); int12 += it; bal -= 659_956 - it }
eq('C interest', c.interest, int12)
eq('C CF', c.monthlyCF, -150_000 - 659_956)
eq('C breakEven null', c.breakEvenRent, null)
eq('C rentForTarget null', rentForTarget(C, 5), null)
eq('C priceForTarget null', priceForTarget(C, 5), null)
ok('C net negative', (c.net ?? 0) < 0)

// 빈 입력·NaN
const z = calcRental({ ...A, price: NaN, deposit: 0, rent: 0, loan: 0, repair: 0 })
eq('NaN price acq', z.acq.total, 0)
eq('NaN price surface null', z.surface, null)

if (fail) { console.log(`${fail} failed`); process.exit(1) }
console.log('rental-yield: all ok')
