// 김장 계산기 회귀 체크: node scripts/check-kimjang.ts
import {
  calc, compareMethods, headsFromKg, kgFromHeads, recommendHeads, ITEMS, DEFAULT_ON, OPTIONAL_IDS,
  type KimjangInput,
} from '../src/utils/kimjang.ts'

let fail = 0
const eq = (name: string, got: unknown, want: unknown, tol = 1e-6) => {
  const ok = typeof want === 'number' ? Math.abs((got as number) - want) <= tol : got === want
  if (!ok) { fail++; console.log('FAIL', name, got, '!=', want) }
}
const qty = (r: ReturnType<typeof calc>, id: string) => r.lines.find((l) => l.id === id)?.qty ?? 0
const AT_ONLY = ['onion', 'mustard', 'dropwort', 'pear'] as const // aT 14품목 중 선택 재료
const base: KimjangInput = { heads: 20, method: 'self', taste: 'basic', enabled: [...AT_ONLY] }

// aT 2024.11.21 바구니: 20포기 직접 절임, 14개 품목 = 204,315원
const r = calc(base)
eq('aT 14 items', r.lines.length, 14)
eq('aT total', r.total, 204_315)
eq('chili 2kg', qty(r, 'chili'), 2)
eq('radish 5', qty(r, 'radish'), 5)

// 스케일 선형성: 10포기 = 절반, 40포기 = 2배 (수량), 비용도 반올림 오차 이내
const r10 = calc({ ...base, heads: 10 }), r40 = calc({ ...base, heads: 40 })
for (const it of ITEMS) {
  if (!r.lines.some((l) => l.id === it.id)) continue
  eq(`half ${it.id}`, qty(r10, it.id), qty(r, it.id) / 2)
  eq(`double ${it.id}`, qty(r40, it.id), qty(r, it.id) * 2)
}
eq('half cost', r10.total, r.total / 2, r.lines.length)
eq('double cost', r40.total, r.total * 2, r.lines.length)
eq('zero heads', calc({ ...base, heads: 0 }).total, 0)
eq('NaN heads', calc({ ...base, heads: NaN }).total, 0)

// kg ↔ 포기: 1포기 2.2kg, 20kg ≈ 9.09포기, 왕복 일치
eq('kg from 20 heads', kgFromHeads(20), 44)
eq('heads from 20kg', headsFromKg(20), 20 / 2.2)
eq('roundtrip', headsFromKg(kgFromHeads(13)), 13)
eq('boxes 20 heads', r.boxes, 2.2)
eq('recommend 4', recommendHeads(4), 20)
eq('recommend 1', recommendHeads(1), 5)

// 절임 방식: 직접 = 배추+소금, 구매 = 절임배추(원/20kg)
const buy = calc({ ...base, method: 'buy' })
eq('buy has no cabbage', buy.lines.some((l) => l.id === 'cabbage' || l.id === 'salt'), false)
eq('buy salted kg', qty(buy, 'saltedCabbage'), 44)
eq('buy salted cost', buy.lines.find((l) => l.id === 'saltedCabbage')!.cost, 88_000) // 44kg × 40,000/20
eq('self no salted', r.lines.some((l) => l.id === 'saltedCabbage'), false)
const cmp = compareMethods(base)
eq('compare self', cmp.self, 204_315)
eq('compare buy', cmp.buy, 204_315 - 60_620 - 11_594 + 88_000)

// 비용 합 = 라인 합, 단가 수정 반영
const edited = calc({ ...base, prices: { chili: 30_000 } })
eq('edited chili', edited.lines.find((l) => l.id === 'chili')!.cost, 60_000)
eq('edited total', edited.total, 204_315 - 56_940 + 60_000)
eq('edited flag', edited.lines.find((l) => l.id === 'chili')!.edited, true)
eq('bad price ignored', calc({ ...base, prices: { chili: -1 } }).total, 204_315)
eq('sum', edited.total, edited.lines.reduce((s, l) => s + l.cost, 0))

// 선택 재료 on/off
const all = calc({ ...base, enabled: OPTIONAL_IDS })
eq('all items self', all.lines.length, ITEMS.length - 1) // 절임배추 제외
eq('oyster cost', all.lines.find((l) => l.id === 'oyster')!.cost, 50_000)
const none = calc({ ...base, enabled: [] })
eq('none count', none.lines.length, 10)
eq('default on excludes oyster', DEFAULT_ON.includes('oyster'), false)
// 농사로: 절인 배추 5kg당 찹쌀가루 42.5g, 설탕 25g → 44kg
const def = calc({ ...base, enabled: DEFAULT_ON })
eq('rice flour', qty(def, 'riceFlour'), 0.374)
eq('sugar', qty(def, 'sugar'), 0.22)

// 맛 조절
eq('salty shrimp', qty(calc({ ...base, taste: 'salty' }), 'shrimpSauce'), 0.8 * 1.3)
eq('mild chili', qty(calc({ ...base, taste: 'mild' }), 'chili'), 1.4)
eq('mild keeps garlic', qty(calc({ ...base, taste: 'mild' }), 'garlic'), 1.3)

// 김치 예상량 = 절임배추 + 양념 (무 1개 1.5kg)
eq('yield', r.yieldKg, 44 + 7.5 + 2 + 1.3 + 0.3 + 0.7 + 0.7 + 0.8 + 1.4 + 0.4 + 1.8 + 0.8 + 1.2)

if (fail) { console.log(`${fail} failed`); process.exit(1) }
console.log('kimjang: all ok')
