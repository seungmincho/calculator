// 결혼비용 계산 회귀 체크: node scripts/check-wedding.ts
import {
  buildDefaultItems, computeTotals, congratsTotal, guestEconomics, splitTotals, defaultSplit,
  encodeState, decodeState, schedule, addDays, DEFAULT_GUEST_GROUPS, type WeddingItem,
} from '../src/utils/wedding.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) }
}
const set = (items: WeddingItem[], id: string, patch: Partial<WeddingItem>) =>
  items.map(i => i.id === id ? { ...i, ...patch } : i)

// 서울 기본값: 예식장 = 대관 300 + 식대 7×250 + 주례 30 + 폐백 30
const seoul = buildDefaultItems('seoul')
const T = computeTotals(seoul)
eq(T.categories.venue.budget, 300 + 7 * 250 + 30 + 30, '예식장 합계(식대×하객)')
eq(T.housing, 20000 + 500 + 300 + 200, '신혼집 합계')
eq(T.exHousing, T.effective - T.housing, '신혼집 제외')
eq(T.effective, T.budget, '실제 미입력 → 예산 기준')

// 실제 금액 1개만 입력해도 나머지는 예산 유지 (예전엔 총액이 그 1개로 붕괴)
const one = set(seoul, 'makeup', { actual: 100 })
const T1 = computeTotals(one)
eq(T1.effective, T.effective + 20, '실제 1개 입력 시 차액만 반영')
eq(T1.actual, 100, '실제 합계')

// 식대 실제 입력은 1인당 × 하객 수
eq(computeTotals(set(seoul, 'mealPerPerson', { actual: 8 })).categories.venue.effective, 300 + 8 * 250 + 60, '식대 실제 ×하객')

// 제외 항목, 하객 수 제외 시 식대 0
eq(computeTotals(set(seoul, 'deposit', { included: false })).housing, 1000, '보증금 제외')
eq(computeTotals(set(seoul, 'guestCount', { included: false })).categories.venue.budget, 360, '하객 수 제외 → 식대 0')

// 축의금
eq(congratsTotal(DEFAULT_GUEST_GROUPS), 60 * 5 + 40 * 10 + 10 * 30 + 40 * 10 + 100 * 10, '축의금 합계')
const ge = guestEconomics(DEFAULT_GUEST_GROUPS, seoul)
eq([ge.envelopes, ge.diners, ge.mealTotal], [250, 250, 1750], '봉투·식사 인원·식대')
eq(ge.margin, 2400 - 1750, '축의금 − 식대')
eq(Number(ge.avgGift.toFixed(2)), 9.6, '평균 축의금')
eq(ge.breakEvenGift, 7, '본전 축의금 = 식대 (인원 같을 때)')
const ge2 = guestEconomics(DEFAULT_GUEST_GROUPS, set(seoul, 'guestCount', { budget: 300 }))
eq(ge2.breakEvenGift, 7 * 300 / 250, '동반 인원 있으면 본전 축의금 ↑')

// 양가 분담
const sp = defaultSplit()
const s1 = splitTotals(sp, T)
eq(s1.total, T.effective, '항목별 분담 합 = 총액')
eq(s1.groom - s1.bride, T.categories.ham.effective, '함은 신랑측')
eq(splitTotals({ ...sp, mode: 'ratio', ratio: 60 }, T).groom, Math.round(T.effective * 0.6), '비율 60%')
eq(splitTotals({ ...sp, mode: 'amount', groomAmount: 100, brideAmount: 50 }, T), { groom: 100, bride: 50, total: 150 }, '금액')

// URL 왕복
const state = {
  region: 'regional' as const,
  items: set(set(buildDefaultItems('regional'), 'ibaji', { included: false }), 'flights', { actual: 250 }),
  guests: [{ id: 'x', name: 'friend', count: 12, perPerson: 10 }],
  split: { ...sp, mode: 'ratio' as const, ratio: 70, itemSplits: { ...sp.itemSplits, housing: 'groom' as const } },
  date: '2027-05-15',
}
const enc = encodeState(state)
const dec = decodeState(k => enc[k] ?? null)!
eq(dec.region, 'regional', 'URL 지역')
eq(dec.items.map(i => [i.budget, i.actual, i.included]), state.items.map(i => [i.budget, i.actual, i.included]), 'URL 항목')
eq(dec.guests.map(g => [g.name, g.count, g.perPerson]), [['friend', 12, 10]], 'URL 하객')
eq([dec.split.mode, dec.split.ratio, dec.split.itemSplits.housing], ['ratio', 70, 'groom'], 'URL 분담')
eq(dec.date, '2027-05-15', 'URL 날짜')
eq(decodeState(k => ({ region: 'seoul', tab: 'split' } as Record<string, string>)[k] ?? null), null, '옛 링크(region/tab) → null')
eq(decodeState(k => ({ b: '1.2', d: 'abc', gg: 'hacker-5-5' } as Record<string, string>)[k] ?? null)!.guests[0].name, 'friend', '잘못된 그룹명 방어')

// 일정
eq(addDays('2027-03-01', -1), '2027-02-28', '날짜 빼기 평년')
eq(addDays('2028-03-01', -1), '2028-02-29', '날짜 빼기 윤년')
const sc = schedule('2027-05-15', '2026-10-01')
eq(sc.find(s => s.id === 'venue')!.due, addDays('2027-05-15', -270), '예식장 계약 시점')
eq(sc.find(s => s.id === 'payment')!.left, 226 - 7, '남은 일수')

if (fail) { console.log(`${fail} FAILED`); process.exit(1) }
console.log('wedding OK')
