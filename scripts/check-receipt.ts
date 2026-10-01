// 영수증 작성기 회귀 체크: node scripts/check-receipt.ts
import { totals, statement, presetSubject, presetItems, bizStatus, cashReceiptDuty, overProofLimit, PURPOSES } from '../src/utils/receipt.ts'
import { nextDocNumber } from '../src/utils/invoiceDoc.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => { if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) } }

const items = [{ name: 'A', qty: 2, price: 15_000 }, { name: 'B', qty: 1, price: 3_000 }]

// 부가세 없음: 합계 = 수량×단가 합
const n = totals(true, items, 0, 'none')
eq([n.supply, n.vat, n.sum, n.total, n.mismatch], [33_000, 0, 33_000, 33_000, false], '부가세 없음')
eq(n.lines.map((l) => l.amount), [30_000, 3_000], '행 금액')

// 별도: 세액 = 품목별 10% 절사
const e = totals(true, items, 0, 'excl')
eq([e.supply, e.vat, e.total], [33_000, 3_300, 36_300], '부가세 별도')

// 포함: 합계 그대로, 세액 = 합계/11 절사
const i = totals(true, [{ name: 'X', qty: 1, price: 110_000 }], 0, 'incl')
eq([i.supply, i.vat, i.total], [100_000, 10_000, 110_000], '부가세 포함')
const i2 = totals(true, [{ name: 'X', qty: 1, price: 10_001 }], 0, 'incl')
eq([i2.supply + i2.vat, i2.total], [10_001, 10_001], '포함가 끝수: 합계 불변')

// 영수 금액 직접 입력: 다르면 불일치, 같으면 정상
eq(totals(true, items, 30_000, 'none').mismatch, true, '불일치')
eq(totals(true, items, 30_000, 'none').total, 30_000, '용지 금액 = 직접 입력값')
eq(totals(true, items, 33_000, 'none').mismatch, false, '일치')

// 금액만 모드: amount 한 줄, 불일치 검사 없음
const m = totals(false, items, 1_000_000, 'none')
eq([m.total, m.mismatch, m.lines.length], [1_000_000, false, 1], '금액만')
eq(totals(false, [], 100_000, 'excl').total, 110_000, '금액만 + 별도')
eq(totals(false, [], 0, 'none').total, 0, '금액 0')

// 문구
eq(statement('rent', '2026년 10월분 월세·관리비'), '위 금액을 2026년 10월분 월세·관리비 명목으로 정히 영수합니다.', '월세 문구')
eq(statement('money', '금전').includes('틀림없이 받았음을 확인'), true, '금전 수령 문구')
eq(statement('general', '').includes('명목으로 정히 영수'), true, '빈 명목도 문장 유지')
eq(presetSubject('rent', '2026-10-01'), '2026년 10월분 월세·관리비', '월세 명목')
eq(presetSubject('dues', ''), '회비', '날짜 없음(서버 렌더)')
for (const p of PURPOSES) {
  const x = presetItems(p, '2026-10-01')
  eq(totals(x.useItems, x.items, x.amount, 'none').total > 0, true, `프리셋 ${p} 기본 금액 > 0`)
}
eq(presetItems('rent', '').items[0].name, '월세', '날짜 없을 때 품목명')

// 사업자번호 (check-business-number와 같은 예시: 국세청 124-81-00998 유효)
eq(bizStatus(''), 'none', '사업자번호 없음')
eq(bizStatus('124-81-00998'), 'valid', '유효 번호')
eq(bizStatus('124-81-00999'), 'invalid', '검증번호 오류')
eq(bizStatus('124-81'), 'invalid', '자릿수 부족')

// 현금영수증 의무(10만원 이상, 경계 포함) · 적격증빙 3만원 초과(경계 제외)
eq([cashReceiptDuty(true, 'cash', 100_000), cashReceiptDuty(true, 'cash', 99_999), cashReceiptDuty(false, 'cash', 500_000), cashReceiptDuty(true, 'transfer', 500_000), cashReceiptDuty(true, 'card', 500_000)], [true, false, false, true, false], '현금영수증 의무')
eq([overProofLimit(30_000), overProofLimit(30_001)], [false, true], '3만원 경계')

// 영수증 번호
eq(nextDocNumber('2026-10-01'), '20261001-001', '영수증 번호')

if (fail) { console.log(`${fail} failed`); process.exit(1) }
console.log('check-receipt: all passed')
