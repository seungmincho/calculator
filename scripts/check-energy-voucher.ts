// node scripts/check-energy-voucher.ts (Node 24) — 2026 에너지바우처 금액·판정 회귀 체크
// 기대값: 에너지바우처 누리집 지원금액 표·물어보세요(1102·131), 정책브리핑(2026-06-17) — 2026-11-07 확인
import assert from 'node:assert/strict'
import {
  AMOUNT, APPLY_PERIOD, USE_PERIOD, SUMMER, WINTER, judgeVoucher, summerClosed, methodFor, sizeOf, type VoucherInput,
} from '../src/utils/energyVoucher.ts'

// 원문 금액표(블로그의 2인 412,200·3인 532,900 은 틀린 값)
assert.deepEqual([1, 2, 3, 4].map((n) => AMOUNT[n as 1].total), [295_200, 407_500, 532_700, 701_300], '연간 총액')
assert.deepEqual([1, 2, 3, 4].map((n) => AMOUNT[n as 1].summerOnly), [40_700, 58_800, 75_800, 102_000], '하절기만(괄호)')
assert.deepEqual(APPLY_PERIOD, { start: '2026-06-15', end: '2026-12-31' }, '신청 기간')
assert.deepEqual(USE_PERIOD, { start: '2026-07-01', end: '2027-05-31' }, '사용기간')
assert.equal(SUMMER.end, '2026-09-30'); assert.equal(WINTER.card, '2026-10-03'); assert.equal(WINTER.virtual, '2026-10-01')

const base: VoucherInput = { benefits: ['livelihood'], traits: ['senior'], size: 1, winterOther: 'none', facility: false }
const j = (p: Partial<VoucherInput>) => judgeVoucher({ ...base, ...p })

// 기본값(생계급여 + 노인 + 1인) = 대상·총액
assert.deepEqual([j({}).status, j({}).amount], ['eligible', 295_200])
assert.equal(j({ size: 4 }).amount, 701_300); assert.equal(j({ size: 7 }).amount, 701_300, '4인 이상은 같은 금액')
assert.equal(j({ size: 0 }).size, 1); assert.equal(sizeOf(2.5), 2)
// 수급 종류는 무엇이든 하나면 충족, 특성은 여러 명이어도 세대당 1개(금액은 세대원 수로만)
for (const b of ['medical', 'housing', 'education'] as const) assert.equal(j({ benefits: [b] }).status, 'eligible', b)
assert.equal(j({ traits: ['senior', 'infant', 'disabled'], size: 3 }).amount, 532_700, '특성 여러 개여도 금액 동일')

// 판정 경계
assert.deepEqual([j({ benefits: [] }).status, j({ benefits: [] }).reasons, j({ benefits: [] }).amount], ['ineligible', ['noIncome'], 0], '수급 종류 없음')
assert.deepEqual(j({ traits: [] }).reasons, ['noTrait'], '특성 없음')
assert.deepEqual(j({ benefits: [], traits: [] }).reasons, ['noIncome', 'noTrait'], '둘 다 없으면 이유 둘')
assert.deepEqual([j({ facility: true }).status, j({ facility: true }).reasons], ['ineligible', ['facility']], '보장시설 제외')
assert.equal(j({ facility: true, winterOther: 'coalCoupon' }).status, 'ineligible', '제외가 중복보다 먼저')

// 동절기 중복(긴급복지 연료비·연탄쿠폰·연탄전환 바우처) → 하절기 몫만, 하절기 사용기간
for (const w of ['emergency', 'coalCoupon', 'coalSwitch'] as const) {
  const r = j({ winterOther: w, size: 2 })
  assert.deepEqual([r.status, r.amount, r.full, r.period.end], ['summerOnly', 58_800, 407_500, '2026-09-30'], w)
}
assert.equal(j({}).period.end, '2027-05-31')
assert.equal(summerClosed('2026-09-30'), false); assert.equal(summerClosed('2026-10-01'), true, '10/1부터 하절기 신청 불가')

// 사용 방식: 지역난방은 요금차감만, 등유·LPG·연탄은 국민행복카드만
assert.deepEqual((['electric', 'gas', 'district', 'kerosene', 'lpg', 'coal'] as const).map(methodFor), ['virtual', 'virtual', 'virtual', 'card', 'card', 'card'])

console.log('check-energy-voucher: all passed')
