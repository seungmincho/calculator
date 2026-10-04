// 보유세(재산세+종부세) 회귀 체크: node scripts/check-property-holding-tax.ts
import {
  propertyTax, jongbu, holdingTax, creditRate, splitAmount, progressive, JONGBU_GENERAL, JONGBU_HEAVY,
  jongbuDates, nextBusinessDay, tempDeadlines, compareBill, type Bill,
} from '../src/utils/propertyHoldingTax.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => { if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) } }
const EOK = 100_000_000

// 행안부(korea.kr 2025-04): 1주택 공시 4억 → 비율 44%, 특례세율 → 재산세 172,000원
eq(propertyTax(4 * EOK, true).main, 172_000, '1주택 4억 재산세')
eq(propertyTax(4 * EOK, true, false).total, 172_000 + 34_400, '도시지역분 없으면 본세+교육세')
// 1주택 9억 초과 → 45% + 표준세율: 10억 → 과표 4.5억 → 57만 + 1.5억×0.4%
eq(propertyTax(10 * EOK, true).main, 1_170_000, '1주택 10억 재산세 (특례세율 제외)')
// 다주택 60% 표준세율 (elitelaw 예시): 6억 → 81만, 10억 → 177만
eq([propertyTax(6 * EOK, false).main, propertyTax(10 * EOK, false).main], [810_000, 1_770_000], '다주택 재산세')
// 도시지역분 0.14%, 교육세 20%
const p = propertyTax(10 * EOK, false)
eq([p.urban, p.edu, p.total], [840_000, 354_000, 1_770_000 + 840_000 + 354_000], '도시지역분·교육세')

// 공제할 재산세 산식 (elitelaw 예시, 2021년 종부세 공정시장가액비율 95%·공제 6억 → 과표 9.5억):
// 2,580,000 × (9.5억 × 60% × 0.4%) / (16억 × 60% 표준세율 3,210,000) = 1,832,523
const j21 = jongbu({ total: 16 * EOK, levied: 2_580_000, ratio: 0.6, deduction: 16 * EOK - 9.5 * EOK / 0.6, heavy: false, credit: 0 })
eq(Math.round(j21.propDeduct), 1_832_523, '재산세 공제 산식')

// 국세청 흐름: 1주택 공시 20억 → 과표 (20−12)억×60% = 4.8억, 산출 276만
const h20 = holdingTax({ prices: [20 * EOK], oneHouse: true, age: 50, years: 3, joint: false, share: 50, urban: true, prevTotal: 0 })
eq([h20.jongbu.base, Math.round(h20.jongbu.gross)], [4.8 * EOK, 2_760_000], '1주택 20억 과표·산출세액')
// 공제할 재산세 = 4.8억 × 45% × 0.4% (단일 주택, 상한 없음 → 부과액 = 분모)
eq(Math.round(h20.jongbu.propDeduct), 864_000, '1주택 20억 재산세 공제')
eq(h20.jongbu.tax, 1_896_000, '1주택 20억 종부세'); eq(h20.jongbu.nong, 379_200, '농특세 20%')

// 1주택 12억 이하 → 종부세 0, 다주택 9억 이하 → 0
eq(holdingTax({ prices: [12 * EOK], oneHouse: true, age: 0, years: 0, joint: false, share: 50, urban: true, prevTotal: 0 }).jongbu.total, 0, '1주택 12억 이하')
eq(holdingTax({ prices: [5 * EOK, 4 * EOK], oneHouse: false, age: 0, years: 0, joint: false, share: 50, urban: true, prevTotal: 0 }).jongbu.total, 0, '2주택 합 9억')

// 세액공제: 60/65/70세 20/30/40%, 5/10/15년 20/40/50%, 합산 80% 한도
eq([creditRate(59, 4).total, creditRate(60, 5).total, creditRate(65, 10).total, creditRate(70, 15).total], [0, 0.4, 0.7, 0.8], '세액공제율')
const hc = holdingTax({ prices: [20 * EOK], oneHouse: true, age: 72, years: 16, joint: false, share: 50, urban: true, prevTotal: 0 })
eq(hc.jongbu.tax, Math.floor((2_760_000 - 864_000) * 0.2), '80% 공제 후')

// 3주택 중과는 과표 12억 초과 구간만: 10억은 같고, 20억은 다름
eq(progressive(10 * EOK, JONGBU_HEAVY), progressive(10 * EOK, JONGBU_GENERAL), '과표 12억 이하 동일')
eq(Math.round(progressive(20 * EOK, JONGBU_HEAVY) - progressive(20 * EOK, JONGBU_GENERAL)), 8 * EOK * 0.007, '12~25억 2.0% vs 1.3%')

// 부부 공동명의 공시 18억 50:50 → 각자 9억 공제 → 종부세 0 (택스워치 2025-11)
const j18 = holdingTax({ prices: [18 * EOK], oneHouse: true, age: 50, years: 3, joint: true, share: 50, urban: true, prevTotal: 0 })
eq([j18.jointEach?.total, j18.mode], [0, 'jointEach'], '공동명의 18억')
// 고령·장기보유면 1주택자 특례가 유리: 공시 30억, 70세·15년
const j30 = holdingTax({ prices: [30 * EOK], oneHouse: true, age: 70, years: 15, joint: true, share: 50, urban: true, prevTotal: 0 })
eq(j30.mode, 'jointSpecial', '공동명의 특례 선택')
eq(j30.total, j30.property.total + Math.min(j30.jointEach!.total, j30.jointSpecial!.total), '유리한 쪽 합계')

// 세부담 상한 150%: 작년 재산세+종부세 600만 → 올해 합계 900만 넘는 종부세는 뺌
const capped = holdingTax({ prices: [15 * EOK, 15 * EOK], oneHouse: false, age: 0, years: 0, joint: false, share: 50, urban: true, prevTotal: 6_000_000 })
eq(capped.property.main + capped.jongbu.tax, 9_000_000, '세부담 상한 150%')

// 분납 (종부세법 제20조·시행령 제16조: 본세 250만 초과~500만 이하는 250만 초과분, 500만 초과는 50%)
eq([splitAmount(2_500_000), splitAmount(3_000_000), splitAmount(4_000_000), splitAmount(5_000_000), splitAmount(6_000_000), splitAmount(10_000_000)],
  [0, 500_000, 1_500_000, 2_500_000, 3_000_000, 5_000_000], '분납')
// 재산세 7월·9월 반반, 20만원 이하는 7월 한 번에
eq(h20.schedule.july + h20.schedule.september, h20.property.total, '재산세 7·9월 합')
const small = holdingTax({ prices: [3 * EOK], oneHouse: true, age: 0, years: 0, joint: false, share: 50, urban: false, prevTotal: 0 })
eq(small.schedule.september, 0, '20만원 이하 7월 일괄')

// ── 일정 (국세청 2025: 12/15(월) 납부, 12/12 납부유예 신청, 분납 '26.6.15) ──
eq(jongbuDates(2025), { due: '2025-12-15', deferral: '2025-12-12', split: '2026-06-15', specialFrom: '2025-09-16', specialTo: '2025-09-30' }, '2025 종부세 일정')
// 2026: 12/15 화요일, 납부유예 3일 전 12/12는 토요일 → 12/14(월)
eq(jongbuDates(2026), { due: '2026-12-15', deferral: '2026-12-14', split: '2027-06-15', specialFrom: '2026-09-16', specialTo: '2026-09-30' }, '2026 종부세 일정')
eq(jongbuDates(2029).due, '2029-12-17', '12/15 토요일이면 월요일')
eq(nextBusinessDay('2026-10-03'), '2026-10-06', '개천절(토)·일·대체공휴일 다음')
eq(nextBusinessDay('2026-12-15'), '2026-12-15', '영업일이면 그대로')

// ── 일시적 2주택 처분기한 ──
const td = (d: string, adj: boolean) => tempDeadlines(d, adj).map((x) => `${x.tax}:${x.years}:${x.date}`)
eq(td('2026-10-04', false), ['jongbu:3:2029-10-04', 'capitalGains:3:2029-10-04', 'acquisition:3:2029-10-04'], '비조정 → 모두 3년')
eq(td('2026-07-01', true), ['jongbu:3:2029-07-01', 'capitalGains:3:2029-07-01', 'acquisition:3:2029-07-01'], '2026.8.3 이전 취득 → 3년')
eq(td('2026-09-01', true), ['jongbu:2:2028-09-01', 'capitalGains:2:2028-09-01', 'acquisition:3:2029-09-01'], '8.4 이후 취득: 종부·양도 2년, 취득세는 10.1 이후부터')
eq(td('2026-10-04', true), ['jongbu:2:2028-10-04', 'capitalGains:2:2028-10-04', 'acquisition:2:2028-10-04'], '둘 다 조정 → 2년')
eq(tempDeadlines('2026-10-04', true).map((x) => x.verified), [true, true, false], '취득세는 참고')

// ── 고지서 대조 (h20: 종부세 1,896,000 / 농특세 379,200 / 재산세 합계) ──
const bill = (o: Partial<Bill>): Bill => ({ jongbu: 0, nong: 0, total: 0, july: 0, september: 0, ...o })
eq(compareBill(bill({}), h20), { rows: [], reasons: [] }, '입력 없음')
const same = compareBill(bill({ jongbu: 1_896_000, nong: 379_200, total: 2_275_200, july: h20.schedule.july, september: h20.schedule.september + 500 }), h20)
eq([same.rows.map((r) => r.diff), same.reasons], [[0, 0, 0, 500], []], '같음 (1,000원 이내는 끝수 차이)')
eq(compareBill(bill({ total: 1_775_200 }), h20).reasons, ['price', 'cap', 'credit'], '고지서가 적음')
eq(compareBill(bill({ jongbu: 2_396_000 }), h20).reasons, ['price', 'oneHouse', 'credit', 'propDeduct', 'land'], '고지서가 많음')
eq(compareBill(bill({ july: 100_000 }), h20).reasons, ['price', 'propCap'], '재산세 고지가 적음 (과표상한)')
eq(compareBill(bill({ jongbu: 1 }), capped).reasons, ['price', 'exclude'], '다주택 + 상한 적용됨 → 합산배제 안내, 상한 안내 없음')

if (fail) { console.log(`${fail} failed`); process.exit(1) }
console.log('check-property-holding-tax: all passed')
