// 차용증 계산 회귀 체크: node scripts/check-iou.ts
import { amountText, maskId, krDate, mergeSaved, docFileName, EMPTY_PARTY } from '../src/utils/document.ts'
import { schedule, payDates, withholding, giftInterestGap, giftFreePrincipal, overMaxRate } from '../src/utils/iou.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => { if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) } }

// 지급일: 다음 달부터 매월 N일, 말일 보정, 마지막 = 변제기일
eq(payDates('2026-01-15', '2026-04-15', 15), ['2026-02-15', '2026-03-15', '2026-04-15'], '매월 15일 3회')
eq(payDates('2026-01-31', '2026-04-30', 31), ['2026-02-28', '2026-03-31', '2026-04-30'], '31일 → 2월 말일')
eq(payDates('2026-01-10', '2026-04-20', 10), ['2026-02-10', '2026-03-10', '2026-04-20'], '마지막 회차 = 변제기일')
eq(payDates('2026-01-10', '2026-01-25', 10), ['2026-01-25'], '한 달 안 = 1회')

// 원리금균등: 1,200만원 연 6% 12개월 → 월 1,032,797원(표준 공식), 총이자 ≈ 393,564
const a = schedule(12_000_000, 6, '2026-01-01', '2027-01-01', 'annuity', 1)
eq(a.rows.length, 12, '원리금균등 12회')
eq(a.rows[0].payment, 1_032_797, '원리금균등 월 납입')
eq(a.rows[0].interest, 60_000, '1회차 이자 = 잔액×0.5%')
eq(a.rows.at(-1)!.balance, 0, '원리금균등 잔액 0')
eq(Math.abs(a.totalInterest - 393_564) <= 6, true, `원리금균등 총이자 ${a.totalInterest}`)
eq(a.rows.reduce((s, r) => s + r.principal, 0), 12_000_000, '원금 합 = 대여금')

// 원금균등: 원금 100만원씩, 이자 체감 60,000 → 5,000
const p = schedule(12_000_000, 6, '2026-01-01', '2027-01-01', 'equalPrincipal', 1)
eq(p.rows.map(r => r.principal), Array(12).fill(1_000_000), '원금균등 원금')
eq([p.rows[0].interest, p.rows[11].interest], [60_000, 5_000], '원금균등 이자 체감')
eq(p.totalInterest, 390_000, '원금균등 총이자 = 6% × (12+…+1)/12 × 100만')

// 만기일시: 매월 이자만, 마지막에 원금
const b = schedule(10_000_000, 5, '2026-10-01', '2027-10-01', 'bullet', 1)
eq(b.rows.length, 12, '일시상환 12회 이자')
eq(b.rows[0], { no: 1, date: '2026-11-01', principal: 0, interest: 41_667, payment: 41_667, balance: 10_000_000 }, '일시 1회차')
eq(b.rows.at(-1)!.principal, 10_000_000, '만기 원금')
eq(b.totalInterest, 41_667 * 12, '일시 총이자')
eq(b.totalPayment, 10_000_000 + 41_667 * 12, '일시 총상환')

// 무이자 일시: 한 번만
const z = schedule(5_000_000, 0, '2026-10-01', '2027-04-01', 'bullet', 1)
eq(z.rows.map(r => [r.date, r.payment]), [['2027-04-01', 5_000_000]], '무이자 일시 1회')
// 무이자 분할: 원금만 나눔
eq(schedule(3_000_000, 0, '2026-10-01', '2027-01-01', 'annuity', 1).rows.map(r => r.payment), [1_000_000, 1_000_000, 1_000_000], '무이자 분할')

// 잘못된 입력
eq(schedule(1_000_000, 5, '2026-10-01', '2026-10-01', 'bullet', 1).rows, [], '변제기일 = 차용일 → 빈 표')
eq(schedule(0, 5, '2026-10-01', '2027-10-01', 'bullet', 1).rows, [], '0원 → 빈 표')

// 이자 상한 (이자제한법 연 20%)
eq([overMaxRate(20), overMaxRate(20.01), overMaxRate(0)], [false, true, false], '20% 상한')

// 원천징수 27.5%: 이자 1,000,000 → 소득세 250,000 + 지방세 25,000
eq(withholding(1_000_000), { income: 250_000, local: 25_000, total: 275_000 }, '원천징수 27.5%')
eq(withholding(41_667), { income: 10_410, local: 1_040, total: 11_450 }, '10원 미만 절사')

// 증여 이자 차액 (4.6%, 1천만원)
eq(giftInterestGap(200_000_000, 0), { gap: 9_200_000, taxable: false }, '2억 무이자 = 920만 < 1천만')
eq(giftInterestGap(300_000_000, 0), { gap: 13_800_000, taxable: true }, '3억 무이자 = 1,380만 과세')
eq(giftInterestGap(300_000_000, 2).taxable, false, '3억 2% = 780만')
eq(giftInterestGap(300_000_000, 5).gap, 0, '4.6% 이상 = 차액 0')
eq(giftFreePrincipal(0), 217_391_304, '무이자 한도 ≈ 2억 1,739만')
eq(giftInterestGap(giftFreePrincipal(0), 0).taxable, false, '한도 금액은 비과세')
eq(giftInterestGap(giftFreePrincipal(0) + 1, 0).taxable, true, '한도 +1원은 과세')

// 문서 공통 헬퍼
eq(amountText(10_000_000), '금 일천만원정 (₩10,000,000)', '금액 한글·숫자 병기')
eq([maskId({ idFront: '900101', idBack1: '1' }), maskId({ idFront: '900101', idBack1: '' }), maskId({ idFront: '', idBack1: '1' })], ['900101-1******', '900101-*******', ''], '주민번호 마스킹')
eq(krDate('2026-10-01'), '2026년 10월 1일', '한국식 날짜')
eq(docFileName('차용증', ' 홍 길동 ', '2026-10-01'), '차용증_홍길동_2026-10-01', '파일명')
eq(mergeSaved({ a: 1, p: { ...EMPTY_PARTY }, l: [] as number[] }, { a: 2, p: { name: 'x' }, l: [1], junk: 3 }), { a: 2, p: { ...EMPTY_PARTY, name: 'x' }, l: [1] }, '저장값 병합')
eq(mergeSaved({ a: 1 }, { a: 'bad' }), { a: 1 }, '타입 다른 저장값 무시')

if (fail) { console.log(`${fail} failed`); process.exit(1) }
console.log('check-iou: all passed')
