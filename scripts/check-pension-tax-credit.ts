// 연금저축·IRP 세액공제 회귀 체크: node scripts/check-pension-tax-credit.ts
// 페이지(FAQ·본문·예시)에 적힌 숫자는 전부 여기서 확인한다.
import assert from 'node:assert/strict'
import { creditBase, pensionTax, topUp, exitTax, ISA_CAP } from '../src/utils/pensionTaxCredit.ts'

// ── 한도: 연금저축 600, 합산 900, 초과분 ──
assert.deepEqual(
  (({ regular, base, psRoom, room, over }) => ({ regular, base, psRoom, room, over }))(creditBase({ ps: 7_000_000, irp: 3_000_000 })),
  { regular: 9_000_000, base: 9_000_000, psRoom: 0, room: 0, over: 1_000_000 },
)
assert.equal(creditBase({ ps: 0, irp: 12_000_000 }).base, 9_000_000)
assert.equal(creditBase({ ps: 3_000_000, irp: 0 }).room, 6_000_000)

// ── ISA 만기 전환: 전환금액도 납입액 → 일반 한도를 먼저 채우고 +min(10%, 300만) ──
let b = creditBase({ ps: 6_000_000, irp: 3_000_000, isa: 30_000_000 })
assert.equal(b.isaExtra, ISA_CAP); assert.equal(b.base, 12_000_000)
assert.equal(creditBase({ ps: 0, irp: 0, isa: 30_000_000, isaTo: 'irp' }).base, 12_000_000)
assert.equal(creditBase({ ps: 0, irp: 0, isa: 30_000_000, isaTo: 'ps' }).base, 9_000_000) // 연금저축 600 한도
b = creditBase({ ps: 6_000_000, irp: 3_000_000, isa: 10_000_000 })
assert.equal(b.isaExtra, 1_000_000) // 10%
b = creditBase({ ps: 0, irp: 0, isa: 5_000_000, isaTo: 'irp' })
assert.equal(b.base, 5_000_000) // 한도 안에 다 들어가면 실제 납입액이 상한
assert.equal(b.over, 0) // 초과분은 직접 넣은 돈 기준

// ── 공제율 경계 (총급여 5,500만) ──
assert.equal(pensionTax({ salary: 55_000_000, ps: 6_000_000, irp: 3_000_000 }).saving, 1_485_000)
assert.equal(pensionTax({ salary: 55_000_001, ps: 6_000_000, irp: 3_000_000 }).saving, 1_188_000)

// ── 본문 사례 3개 (900만 = 연금저축 600 + IRP 300, 연봉 외 공제 없음) ──
let r = pensionTax({ salary: 35_000_000, ps: 6_000_000, irp: 3_000_000 })
assert.equal(r.nominal, 1_485_000)        // 명목 148만 5천
assert.equal(r.det0, 955_837)             // 결정세액(소득세)
assert.equal(r.taxBefore, 1_051_420)      // 지방소득세 포함 낼 세금
assert.equal(r.saving, 1_051_420)         // 실제 105만 1,420원 (세금 전부)
assert.equal(r.usefulBase, 6_372_247)     // 약 637만원까지만 효과
assert.equal(r.wasted, 2_627_753)
r = pensionTax({ salary: 50_000_000, ps: 6_000_000, irp: 3_000_000 })
assert.equal(r.saving, 1_485_000); assert.equal(r.wasted, 0)
r = pensionTax({ salary: 80_000_000, ps: 6_000_000, irp: 3_000_000 })
assert.equal(r.saving, 1_188_000)
// 연봉 3,500만 + 연금저축 600만만: 99만원 전부 환급 (결정세액 안)
assert.equal(pensionTax({ salary: 35_000_000, ps: 6_000_000, irp: 0 }).saving, 990_000)

// ── ISA 3,000만 전환 (연봉 8,000만, 900만 이미 채움): 1,200만 × 13.2% = 158만 4천, 추가분 39만 6천 ──
r = pensionTax({ salary: 80_000_000, ps: 6_000_000, irp: 3_000_000, isa: 30_000_000 })
assert.equal(r.base, 12_000_000); assert.equal(r.saving, 1_584_000)
assert.equal(r.saving - 1_188_000, 396_000)
assert.equal(pensionTax({ salary: 50_000_000, ps: 6_000_000, irp: 3_000_000, isa: 30_000_000 }).saving - 1_485_000, 495_000)
// ISA 추가분도 결정세액 한도: 연봉 3,500만은 이미 세금 0 → 추가 효과 없음
assert.equal(pensionTax({ salary: 35_000_000, ps: 6_000_000, irp: 3_000_000, isa: 30_000_000 }).saving, 1_051_420)

// ── 기본값 (연봉 5,000만, 연금저축 300만) → 남은 600만 채우면 +99만 ──
const t = topUp({ salary: 50_000_000, ps: 3_000_000, irp: 0 }, 9_000_000)
assert.deepEqual([t.cur.saving, t.amt, t.toPs, t.toIrp, t.gain, t.next.saving], [495_000, 6_000_000, 3_000_000, 3_000_000, 990_000, 1_485_000])
assert.equal(topUp({ salary: 50_000_000, ps: 3_000_000, irp: 0 }, 1_000_000).gain, 165_000)
assert.equal(topUp({ salary: 50_000_000, ps: 6_000_000, irp: 3_000_000 }, 1_000_000).amt, 0) // 한도 소진
// 연봉 3,500만, 연금저축 600만 → IRP 300만 더 넣어도 +61,420원뿐
assert.equal(topUp({ salary: 35_000_000, ps: 6_000_000, irp: 0 }, 3_000_000).gain, 61_420)

// ── 꺼낼 때 세금 (900만 기준) ──
assert.deepEqual(exitTax(9_000_000, 0), { total: 9_000_000, early: 1_485_000, annuity: [495_000, 396_000, 297_000] })
assert.equal(exitTax(9_000_000, 0.1).early, 1_633_500)
assert.equal(1_188_000 - exitTax(9_000_000, 0).early, -297_000) // 연봉 8,000만: 해지 시 29만 7천 손해
assert.equal(1_485_000 - exitTax(9_000_000, 0).early, 0)        // 5,500만 이하: 원금만이면 본전

console.log('check-pension-tax-credit: OK')
