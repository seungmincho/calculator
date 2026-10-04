// 김장 재료량·비용 계산 — 순수 함수.
// 기준 바구니: aT(한국농수산식품유통공사) 김장비용 조사, 4인 가족 배추 20포기·14개 품목 수량과 가격
//   (2024.11.21 기준 품목별 공개값, 합계 204,315원 — 2025.11.17 조사 총액 201,151원은 품목별 미공개)
// 찹쌀가루·설탕: 농사로(농촌진흥청) '배추김치 담그기' — 절인 배추 5kg당 찹쌀풀 425g(찹쌀가루:물 = 1:9), 설탕 25g
// 절임배추 1포기 ≈ 2.2kg: 20kg 상자에 배추 8~10포기(산지 판매 기준, 참고)

export type ItemId =
  | 'cabbage' | 'salt' | 'saltedCabbage' | 'radish' | 'chili' | 'garlic' | 'ginger' | 'greenOnion' | 'chives'
  | 'onion' | 'mustard' | 'dropwort' | 'pear' | 'shrimpSauce' | 'fishSauce' | 'riceFlour' | 'sugar' | 'oyster' | 'shrimp'
export type Unit = 'head' | 'ea' | 'kg'
export type Method = 'self' | 'buy'
export type Taste = 'basic' | 'salty' | 'mild'
export const METHODS: readonly Method[] = ['self', 'buy']
export const TASTES: readonly Taste[] = ['basic', 'salty', 'mild']

export const SALTED_KG_PER_HEAD = 2.2 // 참고: 20kg ≈ 9포기
export const BOX_KG = 20
export const BASE_HEADS = 20 // aT 4인 가족 기준
export const HEADS_PER_PERSON = BASE_HEADS / 4
export const AT_TOTAL_2025 = 201_151 // aT 2025.11.17 발표 총액 (참고 표시용)

export interface Item {
  id: ItemId
  unit: Unit
  q20: number // 배추 20포기 기준 수량
  price: number // 기본 단가: 원/unit (per가 있으면 원/per unit)
  per?: number // 단가 기준 수량 (절임배추 = 20kg)
  only?: Method // 이 절임 방식에서만 필요
  optional?: boolean // 켜고 끌 수 있음
  defaultOff?: boolean
  ref?: boolean // 공식 조사값이 아님 → '참고'
  kgPerUnit?: number // 김치 무게 추정용 (무 1개 ≈ 1.5kg, 찹쌀가루 → 풀 10배)
}

// aT 수량·금액으로 단가를 역산 → 20포기에서 합계가 공표값과 정확히 같다
const at = (q20: number, cost20: number) => ({ q20, price: cost20 / q20 })
const SALTED_20 = BASE_HEADS * SALTED_KG_PER_HEAD // 44kg

export const ITEMS: readonly Item[] = [
  { id: 'cabbage', unit: 'head', ...at(20, 60_620), only: 'self' },
  { id: 'salt', unit: 'kg', ...at(6, 11_594), only: 'self' },
  { id: 'saltedCabbage', unit: 'kg', q20: SALTED_20, price: 40_000, per: BOX_KG, only: 'buy', ref: true },
  { id: 'radish', unit: 'ea', ...at(5, 13_280), kgPerUnit: 1.5 },
  { id: 'chili', unit: 'kg', ...at(2, 56_940) },
  { id: 'garlic', unit: 'kg', ...at(1.3, 10_643) },
  { id: 'ginger', unit: 'kg', ...at(0.3, 2_644) },
  { id: 'greenOnion', unit: 'kg', ...at(0.7, 2_235) },
  { id: 'chives', unit: 'kg', ...at(0.7, 5_997) },
  { id: 'onion', unit: 'kg', ...at(0.8, 1_448), optional: true },
  { id: 'mustard', unit: 'kg', ...at(1.4, 5_693), optional: true },
  { id: 'dropwort', unit: 'kg', ...at(0.4, 5_836), optional: true },
  { id: 'pear', unit: 'kg', ...at(1.8, 10_635), optional: true },
  { id: 'shrimpSauce', unit: 'kg', ...at(0.8, 10_961) },
  { id: 'fishSauce', unit: 'kg', ...at(1.2, 5_789) },
  { id: 'riceFlour', unit: 'kg', q20: (SALTED_20 * 42.5) / 5000, price: 8_000, optional: true, ref: true, kgPerUnit: 10 },
  { id: 'sugar', unit: 'kg', q20: (SALTED_20 * 25) / 5000, price: 2_000, optional: true, ref: true },
  { id: 'oyster', unit: 'kg', q20: 2, price: 25_000, optional: true, defaultOff: true, ref: true },
  { id: 'shrimp', unit: 'kg', q20: 0.5, price: 20_000, optional: true, defaultOff: true, ref: true },
]
export const ITEM_IDS = ITEMS.map((x) => x.id)
export const OPTIONAL_IDS = ITEMS.filter((x) => x.optional).map((x) => x.id)
export const DEFAULT_ON = OPTIONAL_IDS.filter((id) => !ITEMS.find((x) => x.id === id)!.defaultOff)

// 맛 조절: 작은 배율만
export const TASTE_MULT: Record<Taste, Partial<Record<ItemId, number>>> = {
  basic: {},
  salty: { shrimpSauce: 1.3, fishSauce: 1.3 },
  mild: { chili: 0.7 },
}

export const headsFromKg = (kg: number) => kg / SALTED_KG_PER_HEAD
export const kgFromHeads = (heads: number) => heads * SALTED_KG_PER_HEAD
export const recommendHeads = (family: number) => Math.max(1, Math.round(family)) * HEADS_PER_PERSON

export interface KimjangInput {
  heads: number
  method: Method
  taste: Taste
  enabled: readonly ItemId[] // 켜진 선택 재료
  prices?: Partial<Record<ItemId, number>> // 사용자 단가
}

export interface Line {
  id: ItemId
  unit: Unit
  qty: number
  price: number
  per: number
  cost: number
  ref: boolean
  edited: boolean
}

export interface KimjangResult {
  lines: Line[]
  total: number
  saltedKg: number
  sauceKg: number // 양념 무게 합 (배추·소금 제외)
  yieldKg: number // 김치 예상량 = 절임배추 + 양념 (참고)
  boxes: number // 20kg 상자 환산
}

export function calc(i: KimjangInput): KimjangResult {
  const heads = Math.max(0, Number.isFinite(i.heads) ? i.heads : 0)
  const scale = heads / BASE_HEADS
  const mult = TASTE_MULT[i.taste] ?? {}
  const lines: Line[] = []
  for (const it of ITEMS) {
    if (it.only && it.only !== i.method) continue
    if (it.optional && !i.enabled.includes(it.id)) continue
    const custom = i.prices?.[it.id]
    const edited = custom != null && Number.isFinite(custom) && custom >= 0
    const price = edited ? custom! : it.price
    const per = it.per ?? 1
    const qty = it.q20 * scale * (mult[it.id] ?? 1)
    lines.push({ id: it.id, unit: it.unit, qty, price, per, cost: Math.round((qty / per) * price), ref: !!it.ref, edited })
  }
  const saltedKg = kgFromHeads(heads)
  const sauceKg = lines
    .filter((l) => l.id !== 'cabbage' && l.id !== 'salt' && l.id !== 'saltedCabbage')
    .reduce((s, l) => s + l.qty * (ITEMS.find((x) => x.id === l.id)!.kgPerUnit ?? 1), 0)
  return {
    lines,
    total: lines.reduce((s, l) => s + l.cost, 0),
    saltedKg,
    sauceKg,
    yieldKg: saltedKg + sauceKg,
    boxes: saltedKg / BOX_KG,
  }
}

/** 직접 절임 vs 절임배추 구매 총액 비교 (나머지 조건 동일) */
export function compareMethods(i: KimjangInput) {
  return { self: calc({ ...i, method: 'self' }).total, buy: calc({ ...i, method: 'buy' }).total }
}
