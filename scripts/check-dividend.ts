// 배당금 계산기 회귀 체크: node scripts/check-dividend.ts
import {
  atSource, effRate, requiredInvestment, finCheck, maxAmountUnder, hdTax, highDividend, isaAccount, pensionAccount, reinvest,
  isFreq, FIN_THRESHOLD,
} from '../src/utils/dividend.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) }
}
const near = (a: number, b: number, tol: number, msg: string) => { if (!(Math.abs(a - b) <= tol)) { fail++; console.log('FAIL', msg, a, '!~', b) } }

// ── 원천징수 15.4% (소득세 14% + 지방소득세 1.4%) ──
// 1억 × 5% = 500만 → 소득세 70만, 지방세 7만, 세후 423만
eq(atSource(5_000_000), { gross: 5_000_000, foreign: 0, income: 700_000, local: 70_000, total: 770_000, net: 4_230_000 }, '국내 500만')
// 10원 미만 버림: 12,345 × 14% = 1,728.3 → 1,720 / 지방세 172 → 170
eq(atSource(12_345), { gross: 12_345, foreign: 0, income: 1_720, local: 170, total: 1_890, net: 10_455 }, '10원 미만 절사')
eq(atSource(0).total, 0, '0원')
eq(atSource(-5).net, 0, '음수 입력')
eq(atSource(NaN).net, 0, 'NaN 입력')
eq(atSource(1e13).income, 1_400_000_000_000, '1조 배당 소득세')

// ── 해외주식: 외국 세금만큼 국내 원천징수에서 차감, 외국이 더 많으면 0 (소득세법 §129④) ──
eq(atSource(1_000_000, 15), { gross: 1_000_000, foreign: 150_000, income: 0, local: 0, total: 150_000, net: 850_000 }, '미국 15%')
eq(atSource(1_000_000, 10), { gross: 1_000_000, foreign: 100_000, income: 40_000, local: 4_000, total: 144_000, net: 856_000 }, '외국 10%')
eq(atSource(1_000_000, 0).total, 154_000, '외국 0% = 국내와 같음')
eq(atSource(1_000_000, 200).foreign, 1_000_000, '외국 세율 100% 상한')
near(effRate(), 0.154, 1e-12, '국내 실효 15.4%')
near(effRate(15), 0.15, 1e-12, '미국 실효 15%')
near(effRate(10), 0.144, 1e-12, '외국 10% 실효 14.4%')

// ── 목표 역산: 월 100만 세후, 5% ──
const req = requiredInvestment(1_000_000, 5)!
eq(req.gross, Math.ceil(12_000_000 / 0.846), '필요 세전 연 배당')
eq(req.amount, Math.ceil(req.gross * 20), '필요 투자금 = 세전 ÷ 5%')
eq(atSource(Math.floor(req.amount * 5 / 100)).net >= 12_000_000, true, '역산 투자금이면 목표 이상')
eq(requiredInvestment(1_000_000, 0), null, '수익률 0')
eq(requiredInvestment(0, 5), { gross: 0, amount: 0 }, '목표 0')
const reqUs = requiredInvestment(1_000_000, 4, 15)!
eq(atSource(Math.floor(reqUs.amount * 4 / 100), 15).net >= 12_000_000 - 1, true, '해외 역산')

// ── 금융소득 2천만원 기준 (2천만 '이하'는 분리과세) ──
eq(finCheck(20_000_000, 0).over, false, '정확히 2천만 = 분리과세')
eq(finCheck(20_000_001, 0).over, true, '2천만 1원 초과')
eq(finCheck(15_000_000, 8_000_000).excess, 3_000_000, '다른 금융소득 합산')
eq(finCheck(15_000_000, 8_000_000, true).over, false, '고배당 분리과세분은 기준에서 제외')
eq(finCheck(15_000_000, 8_000_000, true).nhis, true, '건보는 전체 합계로 판단(보수적)')
eq(finCheck(10_000_000, 0).nhis, false, '정확히 1천만 = 건보 미반영')
eq(finCheck(10_000_001, 0).nhis, true, '1천만 초과 건보 반영')
eq(maxAmountUnder(FIN_THRESHOLD, 0, 5), 400_000_000, '5%면 4억까지')
eq(maxAmountUnder(FIN_THRESHOLD, 25_000_000, 5), 0, '이미 기준 초과')
eq(maxAmountUnder(FIN_THRESHOLD, 0, 0), null, '수익률 0')
eq(finCheck(Math.floor(maxAmountUnder(FIN_THRESHOLD, 3_000_000, 3.3)! * 3.3 / 100), 3_000_000).over, false, '최대 투자금이면 기준 이하')

// ── 고배당 분리과세 세율 구간 (조특법 §104의27②) ──
eq(hdTax(20_000_000), 2_800_000, '2천만 14%')
eq(hdTax(300_000_000), 58_800_000, '3억 = 280만 + 2.8억×20%')
eq(hdTax(5_000_000_000), 1_233_800_000, '50억 = 5,880만 + 47억×25%')
eq(hdTax(6_000_000_000), 1_233_800_000 + 300_000_000, '60억 = 12억3,380만 + 10억×30%')
eq(hdTax(30_000_000), 2_800_000 + 2_000_000, '3천만')
eq(hdTax(0), 0, '0원')
const hd = highDividend(30_000_000)
eq([hd.income, hd.local, hd.total, hd.withheld, hd.extra], [4_800_000, 480_000, 5_280_000, 4_620_000, 660_000], '3천만 분리과세·추가 납부')
eq(highDividend(10_000_000).extra, 0, '2천만 이하 추가 없음')
eq(highDividend(10_000_000).total, atSource(10_000_000).total, '2천만 이하 = 원천징수')

// ── ISA: 3년 순이익 비과세 200만(서민형 400만) 초과 9.9% ──
// 연 500만 × 3년 = 1,500만 → 과세 1,300만 × 9% = 117만 + 11.7만 → 연평균 42.9만
const isa = isaAccount(5_000_000, 100_000_000)
eq([isa.termTax, isa.perYearTax, isa.overflow], [1_287_000, 429_000, 0], 'ISA 일반형')
eq(isaAccount(5_000_000, 100_000_000, true).termTax, 1_089_000, 'ISA 서민형 (1,100만×9.9%)')
eq(isaAccount(500_000, 10_000_000).termTax, 0, 'ISA 비과세 한도 안')
const isaBig = isaAccount(10_000_000, 200_000_000) // 절반만 ISA
eq([isaBig.inGross, isaBig.overflow, isaBig.outsideTax], [5_000_000, 100_000_000, 770_000], 'ISA 1억 초과분은 일반 계좌')
eq(isaAccount(0, 0).perYearNet, 0, 'ISA 0원')

// ── 연금계좌 ──
eq(pensionAccount(5_000_000), { under70: 275_000, under80: 220_000, over80: 165_000, other: 825_000 }, '연금 5.5/4.4/3.3/16.5%')

// ── 재투자 ──
const flat = reinvest({ amount: 100_000_000, yieldPct: 5, freq: 'annual', growthPct: 0, taxRate: effRate(), years: [1, 5] })
near(flat[0].value, 104_230_000, 1e-3, '연 1회 1년 후')
near(flat[1].value, 100_000_000 * Math.pow(1.0423, 5), 1e-3, '연 1회 5년 복리')
near(flat[1].noReinvest, 4_230_000 * 5, 1e-3, '재투자 안 하면 5년 누적')
const monthly = reinvest({ amount: 100_000_000, yieldPct: 5, freq: 'monthly', growthPct: 0, taxRate: effRate(), years: [1] })
near(monthly[0].value, 100_000_000 * Math.pow(1 + 0.05 * 0.846 / 12, 12), 1e-3, '월 재투자 복리')
eq(monthly[0].value > flat[0].value, true, '월 재투자가 연 1회보다 큼')
const grow = reinvest({ amount: 100_000_000, yieldPct: 5, freq: 'annual', growthPct: 10, taxRate: effRate(), years: [2] })
near(grow[0].noReinvest, 4_230_000 + 4_230_000 * 1.1, 1e-3, '배당 성장 10%')
eq(reinvest({ amount: 0, yieldPct: 5, freq: 'monthly', growthPct: 0, taxRate: 0.154, years: [5, 10, 20] }).map((r) => r.value), [0, 0, 0], '투자금 0')
eq(reinvest({ amount: 1e13, yieldPct: 100, freq: 'monthly', growthPct: 999, taxRate: 0, years: [20] }).every((r) => Number.isFinite(r.value)), true, '극단값도 유한')
eq(reinvest({ amount: 1, yieldPct: 5, freq: 'monthly', growthPct: 0, taxRate: 0.154, years: [] }), [], '기간 없음')

eq([isFreq('monthly'), isFreq('toString'), isFreq(null)], [true, false, false], '주기 검증')

if (fail) { console.log(`${fail} failed`); process.exit(1) }
console.log('check-dividend: all passed')
