// 전기요금 회귀 체크: node scripts/check-electricity-bill.ts
import { calcBill, seasonOf, applianceKwh, boundaryTip, pctChange } from '../src/utils/electricityBill.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => { if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) } }

// 한전 발표 2024년 8월 주택 평균: 363kWh → 63,610원 (당시 기금 3.2%) — 계산 순서·절사 규칙 검증
eq(calcBill(363, { season: 'summer', fundRate: 0.032 }).total, 63610, '2024-08 하계 363kWh 한전 평균')

// 기타 계절 350kWh 저압: 기본 1,600 + 전력량 56,190 + 기후 3,150 + 연료 1,750 = 62,690 → VAT 6,269, 기금 1,690 → 70,640
const b350 = calcBill(350)
eq([b350.tier, b350.base, b350.energy, b350.climate, b350.fuel, b350.subtotal, b350.vat, b350.fund, b350.total],
  [2, 1600, 56190, 3150, 1750, 62690, 6269, 1690, 70640], '기타 350kWh')
eq(calcBill(500).total, 126160, '기타 500kWh (3구간)')
eq(calcBill(400).total, 83530, '기타 400kWh (2구간 끝)')
eq(calcBill(410).total, 93570, '기타 410kWh (3구간: 기본요금 7,300)')
eq(calcBill(0).total, 1020, '0kWh = 기본 910 + VAT 91 + 기금 20')
eq(calcBill(-5).kwh, 0, '음수 → 0'); eq(calcBill(NaN).total, 1020, 'NaN → 0kWh')
eq(calcBill(350.4).kwh, 350, 'kWh 정수 반올림')

// 하계 300/450 구간
eq(calcBill(350, { season: 'summer' }).rows.map((r) => r.kwh), [300, 50, 0], '하계 350 구간 분해')
eq(calcBill(300, { season: 'summer' }).tier, 1, '하계 300 = 1구간')

// 슈퍼유저: 하계·동계 1,000kWh 초과분 736.2원, 기타 계절은 미적용
const s = calcBill(1100, { season: 'summer' })
eq([s.isSuper, s.energy, s.subtotal, s.vat, s.fund, s.total], [true, 310825, 333525, 33353, 9000, 375870], '하계 1100kWh 슈퍼유저')
eq(calcBill(1100, { season: 'winter' }).isSuper, true, '동계 슈퍼유저')
eq([calcBill(1100).isSuper, calcBill(1100).subtotal], [false, 304730], '기타 1100kWh 슈퍼유저 없음')
eq(calcBill(1000, { season: 'summer' }).isSuper, false, '1000kWh 정확히는 미적용')

// 고압: 기본 1,260 + 전력량 47,100 + 3,150 + 1,750 = 53,260 → 60,010
eq(calcBill(350, { voltage: 'high' }).total, 60010, '고압 350kWh')
eq(calcBill(1100, { voltage: 'high', season: 'summer' }).rows[3].rate, 593.3, '고압 슈퍼유저 단가')

// 복지할인
eq(calcBill(350, { welfare: 'disabled', month: 10 }).total, 52610, '장애인 기타 계절 16,000원 한도')
eq(calcBill(350, { welfare: 'disabled', month: 6 }).discount, 20000, '복지 여름(6~8월) 20,000원 한도')
eq(calcBill(350, { welfare: 'family', month: 10 }).discount, 16000, '다자녀 30% → 16,000 한도')
eq(calcBill(150, { welfare: 'family', month: 10 }).total, 16560, '다자녀 150kWh 30% (6,303원)')
eq(calcBill(50, { welfare: 'nearPoor', month: 10 }).total, 0, '할인이 요금보다 크면 0원')
eq(calcBill(350, { welfare: 'lifeSupport' }).discount, 18807, '생명유지장치 30% 한도 없음')

// 계절·가전·안내
eq([1, 2, 3, 6, 7, 8, 9, 11, 12].map(seasonOf), ['winter', 'winter', 'normal', 'normal', 'summer', 'summer', 'normal', 'normal', 'winter'], 'seasonOf')
eq(applianceKwh(1000, 8, 30), 240, '에어컨 1kW 8시간 30일 = 240kWh')
eq(applianceKwh(1000, 30, 40), 744, '시간·일수 상한 24h·31일')
eq(boundaryTip(410), { kind: 'above', tier: 3, over: 10, save: 10040 }, '경계 10kWh 초과 안내')
eq(boundaryTip(390), { kind: 'below', tier: 3, left: 10 }, '경계 직전 안내')
eq(boundaryTip(300), null, '경계와 먼 사용량')
eq([pctChange(110, 100), pctChange(5, 0)], [10, null], 'pctChange')

console.log(fail ? `${fail} FAILED` : 'all electricity-bill checks passed', { b350: b350.total, summer1100: s.total })
process.exit(fail ? 1 : 0)
