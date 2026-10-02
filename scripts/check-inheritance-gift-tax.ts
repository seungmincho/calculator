// 상속세·증여세 회귀 체크: node scripts/check-inheritance-gift-tax.ts
// 기대값은 상증세법 산식(§26 세율, §53 공제, §57 할증, §58·§28 기납부/증여세액공제, §69 신고세액공제 3%)으로 손계산
import { progressiveTax, giftTax, inheritanceTax, financialDeduction, funeralDeduction, splitGift, viaParent, filingDeadline, EOK, type GiftInput, type InheritInput } from '../src/utils/inheritanceGiftTax.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => { if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) } }

// 세율 구간 경계 (누진공제 0/1천만/6천만/1.6억/4.6억)
eq([1, 5, 10, 30, 40].map((e) => progressiveTax(e * EOK)), [1e7, 9e7, 2.4e8, 1.04e9, 1.54e9], '세율 경계')
eq(progressiveTax(499_999), 0, '과세표준 50만 미만 과세 안 함')

const G = (o: Partial<GiftInput>): GiftInput => ({ amount: 0, relation: 'parent', minor: false, marriage: false, prior: 0, ...o })
// 부모 → 성년 자녀 3억: 과표 2.5억, 산출 4,000만, 신고공제 120만 → 3,880만 (흔히 쓰이는 국세청식 예시)
const g3 = giftTax(G({ amount: 3 * EOK }))
eq([g3.base, g3.computed, g3.filingCredit, g3.payable], [2.5 * EOK, 4e7, 1.2e6, 3.88e7], '성년 자녀 3억')
eq(giftTax(G({ amount: EOK })).payable, 4_850_000, '성년 자녀 1억')
eq(giftTax(G({ amount: 5e7 })).payable, 0, '성년 자녀 5천만 비과세')
eq(giftTax(G({ amount: 2e7, minor: true })).payable, 0, '미성년 2천만 비과세')
eq(giftTax(G({ amount: 3e7, minor: true })).payable, 970_000, '미성년 3천만')
eq(giftTax(G({ amount: 1.5 * EOK, marriage: true })).payable, 0, '혼인공제 포함 1.5억 비과세')
eq(giftTax(G({ amount: 2 * EOK, marriage: true })).payable, 4_850_000, '혼인공제 2억')
eq(giftTax(G({ amount: 2 * EOK, relation: 'spouse', marriage: true })).marriageDeduction, 0, '혼인공제는 직계존속만')
eq(giftTax(G({ amount: 6 * EOK, relation: 'spouse' })).payable, 0, '배우자 6억 비과세')
eq(giftTax(G({ amount: 7 * EOK, relation: 'spouse' })).payable, 9_700_000, '배우자 7억')
eq(giftTax(G({ amount: 2e7, relation: 'relative' })).payable, 970_000, '기타친족 2천만')
eq(giftTax(G({ amount: 50_400_000 })).payable, 0, '과표 40만원 → 과세 안 함')
// 세대생략: 조부모 → 성년 손주 1억: 500만 + 30% 150만 = 650만 → 신고공제 19.5만 → 630.5만
eq(giftTax(G({ amount: EOK, relation: 'grandparent' })).payable, 6_305_000, '세대생략 30%')
// 미성년 + 20억 초과: 과표 24.8억 → 8.32억 + 40% 3.328억 = 11.648억 → 신고공제 3,494.4만
const gg = giftTax(G({ amount: 25 * EOK, relation: 'grandparent', minor: true }))
eq([gg.surchargeRate, gg.surcharge, gg.payable], [0.4, 332_800_000, 1_129_856_000], '세대생략 40%')
// 10년 합산: 1억 + 이전 1억 → 과표 1.5억 산출 2,000만, 기납부 500만(한도 666.6만) → 1,500만 → 신고공제 45만
const gp = giftTax(G({ amount: EOK, prior: EOK }))
eq([gp.base, gp.computed, gp.priorCredit, gp.payable], [1.5 * EOK, 2e7, 5e6, 14_550_000], '10년 합산')
// 나눠 주기: 2억을 2명 → 1억씩 485만×2, 10년 간격 2회도 동일
eq(splitGift(G({ amount: 2 * EOK }), 2, 1), 9_700_000, '2명 분산')
eq(splitGift(G({ amount: 2 * EOK }), 1, 2), 9_700_000, '10년 2회')
// 조부모 1억 직접(630.5만) vs 부모 경유: 485만 + (9,515만-5천만=4,515만 → 451.5만 → 437.955 → 4,379,550)
eq(viaParent(G({ amount: EOK, relation: 'grandparent' })), { first: 4_850_000, second: 4_379_550, total: 9_229_550 }, '부모 경유')

const I = (o: Partial<InheritInput>): InheritInput => ({ estate: 0, debts: 0, funeral: 0, bongan: 0, fin: 0, house: 0, spouse: true, spouseMode: 'legal', spouseAmount: 0, children: 2, minorAges: [], elders: 0, preGift: 0, ...o })
eq(financialDeduction(15e6), 15e6, '금융 2천만 이하 전액'); eq(financialDeduction(5e7), 2e7, '금융 최소 2천만')
eq(financialDeduction(5 * EOK), EOK, '금융 20%'); eq(financialDeduction(20 * EOK), 2 * EOK, '금융 최대 2억')
eq(funeralDeduction(0, 0), 5e6, '장례비 최소 500만'); eq(funeralDeduction(15e6, 9e6), 15e6, '장례 1천만 + 봉안 500만')
// 배우자+자녀2, 10억 → 일괄 5억 + 배우자 최소 5억 ≥ 과세가액 → 0
eq(inheritanceTax(I({ estate: 10 * EOK })).payable, 0, '10억 배우자+자녀 비과세')
// 20억: 배우자 법정상속분 1.5/3.5 = 857,142,857 → 과표 637,857,143 → 산출 131,357,142 → 신고공제 3,940,714
const i20 = inheritanceTax(I({ estate: 20 * EOK }))
eq([i20.spouseDeduction, i20.base, i20.computed, i20.payable], [857_142_857, 637_857_143, 131_357_142, 127_416_428], '20억 배우자+자녀2')
eq(inheritanceTax(I({ estate: 20 * EOK, spouseMode: 'min' })).spouseDeduction, 5 * EOK, '배우자 최소 5억')
// 자녀 1명만, 10억, 장례 1,500만+봉안 500만 → 과표 4.85억 → 8,700만 → 8,439만
eq(inheritanceTax(I({ estate: 10 * EOK, spouse: false, children: 1, funeral: 15e6, bongan: 5e6 })).payable, 84_390_000, '자녀만 10억')
// 배우자 단독: 일괄공제 불가(기초 2억), 50억 → 배우자 30억 한도 → 과표 17.95억 → 5.58억 → 5.4126억
const so = inheritanceTax(I({ estate: 50 * EOK, children: 0 }))
eq([so.general, so.spouseDeduction, so.payable], [2 * EOK, 30 * EOK, 541_260_000], '배우자 단독 50억')
// 인적공제: 자녀 6명 중 1·2살 → 3억 + 1.8억 + 1.7억 = 6.5억 → 항목별 8.5억
eq(inheritanceTax(I({ estate: 30 * EOK, children: 6, minorAges: [1, 2] })).general, 8.5 * EOK, '항목별 > 일괄')
// 동거주택 7억 → 6억 한도, 자녀1 15억 → 과표 3.95억 → 6,693만
eq(inheritanceTax(I({ estate: 15 * EOK, spouse: false, children: 1, house: 7 * EOK })).payable, 66_930_000, '동거주택')
// 사전증여 3억(과표 2.5억, 증여세 4천만): 과세가액 8.95억, 과표 3.95억 → 6,900만 − 4,000만 → 신고공제 87만
const pg = inheritanceTax(I({ estate: 6 * EOK, spouse: false, children: 1, preGift: 3 * EOK }))
eq([pg.taxableValue, pg.base, pg.giftCredit, pg.payable], [895_000_000, 395_000_000, 4e7, 28_130_000], '사전증여 합산')
// §24 한도: 3억 + 사전증여 5억 → 한도 7.95억 − 4.5억 = 3.45억 → 공제 5억이 깎임
const cap = inheritanceTax(I({ estate: 3 * EOK, spouse: false, children: 1, preGift: 5 * EOK }))
eq([cap.capped, cap.deduction, cap.base, cap.payable], [true, 3.45 * EOK, 4.5 * EOK, 0], '공제 종합한도')

// 신고기한: 증여 달 말일 + 3개월, 상속 + 6개월, 주말이면 다음 영업일
eq(filingDeadline('2026-01-15', 3), { legal: '2026-04-30', due: '2026-04-30' }, '증여 기한')
eq(filingDeadline('2026-02-10', 3), { legal: '2026-05-31', due: '2026-06-01' }, '일요일 → 월요일')
eq(filingDeadline('2026-07-20', 3), { legal: '2026-10-31', due: '2026-11-02' }, '토요일 → 월요일')
eq(filingDeadline('2026-03-20', 6).legal, '2026-09-30', '상속 6개월')

if (fail) { console.log(`${fail} failed`); process.exit(1) }
console.log('check-inheritance-gift-tax: all passed')
