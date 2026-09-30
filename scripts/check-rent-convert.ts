// 전월세 전환 회귀 체크: node scripts/check-rent-convert.ts
import assert from 'node:assert/strict'
import { legalCapRate, jeonseToWolse, wolseToJeonse, rentCreditRate, housingCost, breakevenRate, renewalCap, BASE_RATE } from '../src/utils/rentConvert.ts'

// 법정 상한: 기준금리 + 2%p, 최대 10%
assert.equal(legalCapRate(BASE_RATE.rate), 5)
assert.equal(legalCapRate(9), 10)

// 전세 3억 → 보증금 1억 월세, 5%: 2억 × 5% ÷ 12 = 833,333
assert.equal(jeonseToWolse(300_000_000, 100_000_000, 5), 833_333)
assert.equal(jeonseToWolse(100_000_000, 200_000_000, 5), 0)
assert.equal(jeonseToWolse(300_000_000, 0, 0), 0)
// 역변환: 1억 + 75만 × 12 ÷ 5% = 2.8억, 왕복 일치
assert.equal(wolseToJeonse(100_000_000, 750_000, 5), 280_000_000)
assert.equal(jeonseToWolse(280_000_000, 100_000_000, 5), 750_000)
assert.equal(wolseToJeonse(50_000_000, 500_000, 0), 50_000_000)

// 세액공제율 경계
assert.equal(rentCreditRate(55_000_000, true), 0.17)
assert.equal(rentCreditRate(55_000_001, true), 0.15)
assert.equal(rentCreditRate(80_000_000, true), 0.15)
assert.equal(rentCreditRate(80_000_001, true), 0)
assert.equal(rentCreditRate(40_000_000, false), 0)

// 비용: 전세 3억, 내 돈 1억 → 대출 2억 × 4% × 2년 = 1,600만, 기회비용 1억 × 3% × 2 = 600만
const base = { years: 2, cash: 100_000_000, creditRate: 0.17 }
const rates = { loanRate: 4, depositRate: 3 }
const j = housingCost({ ...base, ...rates, deposit: 300_000_000, monthlyRent: 0 })
assert.deepEqual([j.loan, j.interest, j.opportunity, j.net], [200_000_000, 16_000_000, 6_000_000, 22_000_000])
// 월세 보증금 1억, 83만 3,333 × 24 = 19,999,992, 공제 17% (한도 내)
const w = housingCost({ ...base, ...rates, deposit: 100_000_000, monthlyRent: 833_333 })
assert.equal(w.rent, 19_999_992)
assert.equal(w.credit, Math.round(9_999_996 * 0.17 * 2))
assert.equal(w.net, 6_000_000 + 19_999_992 - w.credit)
// 공제 한도 1,000만/년
assert.equal(housingCost({ ...base, ...rates, deposit: 0, monthlyRent: 2_000_000 }).credit, 3_400_000)

// 손익분기 대출금리: 공제 없으면 전환율(5%)과 같아야 함
const nj = { ...base, creditRate: 0, deposit: 300_000_000, monthlyRent: 0 }
const nw = { ...base, creditRate: 0, deposit: 100_000_000, monthlyRent: 833_333 }
assert.ok(Math.abs(breakevenRate(nj, nw, rates, 'loanRate')! - 5) < 0.01)
// 공제 17%면 분기점이 낮아짐: 5% × 0.83 = 4.15%
assert.ok(Math.abs(breakevenRate({ ...nj, creditRate: 0.17 }, { ...nw, creditRate: 0.17 }, rates, 'loanRate')! - 4.15) < 0.01)
// 같은 조건이면 해 없음
assert.equal(breakevenRate(nj, nj, rates, 'loanRate'), null)
// 내 돈으로 전액 가능 → 예금금리 분기점
assert.ok(Math.abs(breakevenRate({ ...nj, cash: 5e8 }, { ...nw, cash: 5e8 }, rates, 'depositRate')! - 5) < 0.01)

// 갱신 5%: 전세 4억 → 4.2억
assert.equal(renewalCap(400_000_000, 0, 5).maxDepositOnly, 420_000_000)
// 보증금 1억 + 월세 100만(5%): 환산 3.4억, 여유 1,700만 → 보증금만 1.17억 / 월세만 100만 + 70,833
const r = renewalCap(100_000_000, 1_000_000, 5)
assert.deepEqual([r.converted, r.maxDepositOnly, r.maxRentOnly], [340_000_000, 117_000_000, 1_070_833])

console.log('check-rent-convert: all passed')
