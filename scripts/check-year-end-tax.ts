// 연말정산 회귀 체크: node scripts/check-year-end-tax.ts
import assert from 'node:assert/strict'
import {
  earnedIncomeDeduction, progressiveTax, earnedIncomeCredit, childCredit, birthCredit, cardDeduction, cardLimits,
  housingDeduction, pensionCredit, insuranceCredit, medicalCredit, educationCredit, donationCredit, hometownCredit,
  rentCredit, calc, tips, DEFAULT_INPUT, type YetInput,
  annualize, annualSpend, cardThresholdGap, q4Strategy, pensionTopUp, pensionRate, DEADLINE, cardTaxSaving,
} from '../src/utils/yearEndTax.ts'

const M = { special: 0, general: 0, premature: 0, infertility: 0 }
const S0 = { credit: 0, debit: 0, culture: 0, market: 0, transport: 0 }

// ── 근로소득공제 구간·한도 ──
assert.equal(earnedIncomeDeduction(5_000_000), 3_500_000)
assert.equal(earnedIncomeDeduction(50_000_000), 12_250_000)
assert.equal(earnedIncomeDeduction(100_000_000), 14_750_000)
assert.equal(earnedIncomeDeduction(1_000_000_000), 20_000_000)

// ── 세율표: 누진공제 방식이 구간 경계에서 연속 ──
assert.deepEqual([14e6, 50e6, 88e6, 150e6, 300e6, 500e6, 1e9].map(progressiveTax),
  [840_000, 6_240_000, 15_360_000, 37_060_000, 94_060_000, 174_060_000, 384_060_000])
assert.equal(progressiveTax(0), 0)

// ── 근로소득세액공제 한도 (총급여 3,300만 / 7,000만 / 1.2억 경계) ──
assert.equal(earnedIncomeCredit(1_300_000, 30_000_000), 715_000)
assert.equal(earnedIncomeCredit(5_000_000, 33_000_000), 740_000)
assert.equal(earnedIncomeCredit(5_000_000, 70_000_000), 660_000)
assert.equal(earnedIncomeCredit(5_000_000, 70_200_000), 560_000) // 66만 − 20만/2
assert.equal(earnedIncomeCredit(5_000_000, 80_000_000), 500_000)
assert.equal(earnedIncomeCredit(9_000_000, 130_000_000), 200_000)

// ── 자녀·출산 ──
assert.deepEqual([0, 1, 2, 3, 4].map(childCredit), [0, 250_000, 550_000, 950_000, 1_350_000])
assert.deepEqual([0, 1, 2, 3, 5].map(birthCredit), [0, 300_000, 500_000, 700_000, 700_000])

// ── 신용카드: 25% 문턱은 신용카드부터, 한도·추가한도 ──
let c = cardDeduction(50_000_000, { ...S0, credit: 20_000_000 })
assert.equal(c.threshold, 12_500_000); assert.equal(c.total, 1_125_000)
c = cardDeduction(50_000_000, { ...S0, credit: 12_500_000, debit: 10_000_000, market: 2_000_000, transport: 1_000_000 })
assert.deepEqual([c.parts.debit, c.parts.market, c.parts.transport, c.basic, c.extra], [3_000_000, 800_000, 400_000, 3_000_000, 1_200_000])
c = cardDeduction(50_000_000, { ...S0, credit: 12_500_000, debit: 10_000_000, market: 2_000_000, transport: 1_000_000 }, 2)
assert.deepEqual([c.basic, c.extra], [4_000_000, 200_000]) // 자녀 2명 → 기본한도 +100만
assert.deepEqual(cardLimits(80_000_000, 3), { basic: 3_000_000, extra: 2_000_000 }) // 7천만 초과: 250 + 25×2
c = cardDeduction(80_000_000, { ...S0, credit: 20_000_000, debit: 20_000_000, culture: 1_000_000 })
assert.equal(c.parts.culture, 0); assert.equal(c.total, 2_500_000) // 7천만 초과 문화비 = 신용카드 취급, 기본한도
c = cardDeduction(50_000_000, { ...S0, debit: 10_000_000 })
assert.equal(c.total, 0); assert.equal(c.shortfall, 2_500_000)

// ── 주택자금 ──
assert.equal(housingDeduction(50_000_000, 5_000_000, 0), 1_200_000)
assert.equal(housingDeduction(50_000_000, 3_000_000, 10_000_000), 4_000_000)
assert.equal(housingDeduction(70_000_001, 3_000_000, 0), 0)

// ── 세액공제 한도 ──
assert.equal(pensionCredit(55_000_000, 7_000_000, 3_000_000), 1_350_000)
assert.equal(pensionCredit(55_000_001, 3_000_000, 10_000_000), 1_080_000)
assert.equal(insuranceCredit(2_000_000), 120_000)
assert.equal(medicalCredit(50_000_000, { ...M, general: 1_000_000, special: 2_000_000 }), 225_000)
assert.equal(medicalCredit(50_000_000, { ...M, general: 10_000_000 }), 1_050_000)
assert.equal(medicalCredit(50_000_000, { ...M, infertility: 2_000_000 }), 150_000)
assert.equal(medicalCredit(50_000_000, { ...M, premature: 1_000_000, infertility: 2_000_000 }), 450_000) // 문턱은 미숙아부터 차감 → 난임 150만 × 30%
assert.equal(educationCredit(5_000_000, 5_000_000, 12_000_000, 1), 2_550_000)
assert.equal(donationCredit(2_000_000, 37_750_000), 300_000)
assert.equal(donationCredit(15_000_000, 37_750_000), 1_897_500) // 근로소득금액 30% 한도 11,325,000
assert.deepEqual([100_000, 200_000, 300_000].map(hometownCredit), [90_909, 130_909, 145_909])
// 조특법 §58① 현행: 20만 초과분은 2천만까지 15% 단일 ('1천만 초과 30%' 구간 없음)
assert.equal(hometownCredit(20_000_000), 90_909 + 40_000 + 2_970_000)
assert.equal(hometownCredit(30_000_000), hometownCredit(20_000_000)) // 연 2천만 한도
assert.equal(rentCredit(50_000_000, 12_000_000), 1_700_000)
assert.equal(rentCredit(80_000_000, 12_000_000), 1_500_000)
assert.equal(rentCredit(80_000_001, 12_000_000), 0)

// ── 기본값 전체 흐름: 총급여 5,000만 1인 ──
const r = calc({ ...DEFAULT_INPUT, prepaid: 3_000_000 })
assert.equal(r.card.total, 990_000)
assert.equal(r.healthEmp, 2_483_690)
assert.equal(r.taxBase, 30_401_310)
assert.equal(r.computedTax, 3_300_196)
assert.equal(r.credits.earned, 660_000)
assert.equal(r.standard, false)
assert.equal(r.std.determined, 2_882_750) // 표준세액공제 쪽이 더 불리
assert.equal(r.determined, 2_640_196)
assert.equal(r.refund, 359_800 + 35_980)

// 공제 없으면 표준세액공제 13만이 유리할 수 있음
const noIns = calc({ ...DEFAULT_INPUT, healthEmp: 0 })
assert.equal(noIns.standard, true)
assert.equal(noIns.determined, noIns.special.determined - 130_000)

// 결정세액은 0 미만 불가, 세액공제 초과분 소멸
const low = calc({ ...DEFAULT_INPUT, salary: 20_000_000, rent: 10_000_000, prepaid: 100_000 })
assert.equal(low.determined, 0)
assert.equal(low.refund, 110_000)

// 중소기업 취업자 감면 90%, 200만 한도 + 근로소득세액공제 감면비율만큼 축소
const sme = calc({ ...DEFAULT_INPUT, sme: true })
assert.equal(sme.reduction, 2_000_000)
assert.equal(sme.credits.earned, Math.floor(660_000 * (1 - 2_000_000 / 3_300_196)))
assert.equal(sme.determined, 3_300_196 - 2_000_000 - sme.credits.earned)

// ── 시뮬레이터: 연금 100만 추가 = 15% + 지방세 1.5% ──
const tp = tips({ ...DEFAULT_INPUT, prepaid: 3_000_000 })
const p100 = tp.find((x) => x.id === 'pension100')!
assert.ok(Math.abs(p100.gain - 165_000) <= 20, `pension100 ${p100.gain}`)
for (let i = 1; i < tp.length; i++) assert.ok(tp[i - 1].gain >= tp[i].gain)
assert.ok(tips({ ...DEFAULT_INPUT, salary: 15_000_000 }).every((x) => x.gain === 0)) // 결정세액 0 → 추가 환급 없음

// ── 미리보기: 1~9월 실적 ×12/9, 25% 문턱까지 남은 금액 ──
assert.equal(annualize(7_500_000), 10_000_000)
assert.equal(annualize(450_000, 9), 600_000)
assert.equal(annualize(100, 9), 133)
assert.equal(annualize(1_000_000, 0), 0)
assert.deepEqual(annualSpend({ ...S0, credit: 9_000_000, transport: 450_000 }),
  { ...S0, credit: 12_000_000, transport: 600_000 })
assert.deepEqual(annualSpend({ ...S0, credit: 9_000_000 }, { ...S0, credit: 1_000_000, debit: 2_000_000 }),
  { ...S0, credit: 10_000_000, debit: 2_000_000 }) // 10~12월 직접 입력
assert.equal(cardThresholdGap(50_000_000, 10_000_000), 2_500_000)
assert.equal(cardThresholdGap(50_000_000, 12_500_000), 0)
assert.equal(cardThresholdGap(50_000_000, 20_000_000), 0)
assert.equal(cardDeduction(50_000_000, { ...S0, credit: 10_000_000 }).shortfall, cardThresholdGap(50_000_000, 10_000_000))

// ── 10~12월 카드 전략 ──
// 신용 1,400만(문턱 1,250만 초과) → 10~12월 신용 350만을 체크로: 공제 +22.5만 × 15% 구간 × 1.1
let q = q4Strategy({ ...DEFAULT_INPUT, credit: 14_000_000, debit: 3_000_000 }, 3_500_000)
assert.equal(q.kind, 'switch'); assert.equal(q.moved, 3_500_000)
assert.ok(Math.abs(q.gain - 225_000 * 0.165) <= 20, `q4 switch ${q.gain}`)
q = q4Strategy(DEFAULT_INPUT, 2_500_000) // 신용 1,000만 < 문턱 → 신용은 전부 문턱에 흡수, 바꿔도 같음
assert.deepEqual([q.kind, q.gain], ['balanced', 0])
q = q4Strategy({ ...DEFAULT_INPUT, credit: 5_000_000, debit: 0, transport: 0 }, 1_000_000)
assert.deepEqual([q.kind, q.gap, q.gain], ['short', 7_500_000, 0])
q = q4Strategy({ ...DEFAULT_INPUT, credit: 40_000_000, debit: 10_000_000 }, 10_000_000) // 기본한도 300만 소진
assert.deepEqual([q.kind, q.gain], ['maxed', 0])
assert.equal(q4Strategy({ ...DEFAULT_INPUT, credit: 14_000_000 }, 99_000_000).moved, 14_000_000) // 연간 신용카드 이상 못 옮김

// ── 연금저축·IRP 남은 한도 채우기: 총급여 5,500만 이하 16.5%, 초과 13.2% (지방세 포함) ──
assert.deepEqual([pensionRate(55_000_000), pensionRate(55_000_001)], [0.15, 0.12])
let pt = pensionTopUp({ ...DEFAULT_INPUT, prepaid: 3_000_000 })
assert.equal(pt.room, 9_000_000); assert.ok(Math.abs(pt.gain - 1_485_000) <= 20, `topup ${pt.gain}`)
pt = pensionTopUp({ ...DEFAULT_INPUT, salary: 60_000_000, pensionSavings: 6_000_000, irp: 2_000_000 })
assert.equal(pt.room, 1_000_000); assert.ok(Math.abs(pt.gain - 132_000) <= 20, `topup13.2 ${pt.gain}`)
assert.equal(pensionTopUp({ ...DEFAULT_INPUT, pensionSavings: 7_000_000, irp: 1_000_000 }).room, 2_000_000) // 연금저축 600 초과분은 한도에 안 셈
assert.deepEqual(pensionTopUp({ ...DEFAULT_INPUT, pensionSavings: 6_000_000, irp: 3_000_000 }), { room: 0, gain: 0 })
assert.equal(pensionTopUp({ ...DEFAULT_INPUT, salary: 15_000_000 }).gain, 0) // 결정세액 0 → 늘지 않음
// tips의 한도 채우기와 같은 값
assert.equal(tips({ ...DEFAULT_INPUT, prepaid: 3_000_000 }).find((x) => x.id === 'pensionMax')!.gain,
  pensionTopUp({ ...DEFAULT_INPUT, prepaid: 3_000_000 }).gain)
assert.deepEqual(DEADLINE, { yearEnd: '2026-12-31', simplified: '2027-01-15' })

// ── netSalary.ts와 교차검증: 특별공제 없는 경우 산출·결정세액 일치 ──
try {
  const { build } = await import('esbuild')
  const path = new URL('../src/utils/netSalary.ts', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')
  const { outputFiles: [out] } = await build({ entryPoints: [path], bundle: true, format: 'esm', write: false, logLevel: 'silent' })
  const { calculateNetSalary } = await import('data:text/javascript;base64,' + Buffer.from(out.text).toString('base64'))
  for (const salary of [24e6, 38e6, 50e6, 72e6, 95e6, 150e6]) {
    for (const [spouse, children] of [[false, 0], [true, 2]] as const) {
      const x: YetInput = { ...DEFAULT_INPUT, salary, spouse, children, healthEmp: 0, credit: 0, debit: 0, transport: 0 }
      const n = calculateNetSalary(salary, { nonTaxableMonthly: 0, dependents: 1 + (spouse ? 1 : 0) + children, children })
      assert.equal(calc(x).special.determined, n.taxInfo.annualTaxEstimate, `netSalary ${salary}/${children}`)
    }
  }
} catch (e) {
  if ((e as { code?: string }).code === 'ERR_MODULE_NOT_FOUND') console.log('esbuild 없음 — netSalary 교차검증 생략')
  else throw e
}

// ── /card-deduction 절세액: 공제액 × 한계세율(지방세 포함) ──
assert.equal(cardTaxSaving(50_000_000, { ...S0, credit: 20_000_000 }), 185_625)      // 1,125,000 × 16.5%
assert.equal(cardTaxSaving(100_000_000, { ...S0, credit: 40_000_000, debit: 10_000_000 }), 660_000) // 한도 250만 × 26.4%
assert.equal(cardTaxSaving(50_000_000, { ...S0, credit: 10_000_000 }), 0)            // 25% 문턱 미달
assert.equal(cardDeduction(50_000_000, { ...S0, credit: 12_500_000, debit: 7_500_000 }).total, 2_250_000) // /card-deduction 페이지 예시

console.log('check-year-end-tax OK')
