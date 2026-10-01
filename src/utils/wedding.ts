// 결혼비용 계산기 순수 로직 (단위: 만원). 회귀 체크: scripts/check-wedding.ts

export type Region = 'seoul' | 'regional'
export type SplitMode = 'item' | 'ratio' | 'amount'
export type SplitSide = 'groom' | 'shared' | 'bride'

export const CATEGORY_IDS = ['venue', 'sdm', 'gifts', 'yedan', 'ham', 'honeymoon', 'housing', 'others'] as const
export type CategoryId = typeof CATEGORY_IDS[number]

export interface WeddingItem {
  id: string
  categoryId: string
  budget: number
  actual: number
  note: string
  included: boolean
}

export interface GuestGroup {
  id: string
  name: string
  count: number
  perPerson: number
}

export interface SplitConfig {
  mode: SplitMode
  ratio: number // 신랑측 %
  groomAmount: number
  brideAmount: number
  itemSplits: Record<string, SplitSide>
}

interface ItemDef {
  id: string
  categoryId: CategoryId
  seoulDefault: number
  regionalDefault: number
  isPerPerson?: boolean
  isGuestCount?: boolean
}

// 기본값은 참고·추정치. 식대·대관료·스드메는 한국소비자원 결혼서비스 가격조사(2025) 중간가격 수준에 맞춤
export const ITEM_DEFS: ItemDef[] = [
  { id: 'venueRental', categoryId: 'venue', seoulDefault: 300, regionalDefault: 150 },
  { id: 'mealPerPerson', categoryId: 'venue', seoulDefault: 7, regionalDefault: 5, isPerPerson: true },
  { id: 'guestCount', categoryId: 'venue', seoulDefault: 250, regionalDefault: 200, isGuestCount: true },
  { id: 'officiant', categoryId: 'venue', seoulDefault: 30, regionalDefault: 20 },
  { id: 'pyebaek', categoryId: 'venue', seoulDefault: 30, regionalDefault: 20 },
  { id: 'studioPhoto', categoryId: 'sdm', seoulDefault: 150, regionalDefault: 100 },
  { id: 'dressRental', categoryId: 'sdm', seoulDefault: 150, regionalDefault: 100 },
  { id: 'makeup', categoryId: 'sdm', seoulDefault: 80, regionalDefault: 60 },
  { id: 'weddingVideo', categoryId: 'sdm', seoulDefault: 100, regionalDefault: 60 },
  { id: 'brideGifts', categoryId: 'gifts', seoulDefault: 300, regionalDefault: 200 },
  { id: 'groomGifts', categoryId: 'gifts', seoulDefault: 200, regionalDefault: 100 },
  { id: 'yedanToGroom', categoryId: 'yedan', seoulDefault: 200, regionalDefault: 100 },
  { id: 'yedanToBride', categoryId: 'yedan', seoulDefault: 200, regionalDefault: 100 },
  { id: 'hamCost', categoryId: 'ham', seoulDefault: 50, regionalDefault: 30 },
  { id: 'hamMoney', categoryId: 'ham', seoulDefault: 100, regionalDefault: 50 },
  { id: 'flights', categoryId: 'honeymoon', seoulDefault: 300, regionalDefault: 200 },
  { id: 'accommodation', categoryId: 'honeymoon', seoulDefault: 200, regionalDefault: 100 },
  { id: 'localExpenses', categoryId: 'honeymoon', seoulDefault: 150, regionalDefault: 80 },
  { id: 'deposit', categoryId: 'housing', seoulDefault: 20000, regionalDefault: 10000 },
  { id: 'appliances', categoryId: 'housing', seoulDefault: 500, regionalDefault: 300 },
  { id: 'furniture', categoryId: 'housing', seoulDefault: 300, regionalDefault: 200 },
  { id: 'interior', categoryId: 'housing', seoulDefault: 200, regionalDefault: 100 },
  { id: 'invitations', categoryId: 'others', seoulDefault: 30, regionalDefault: 20 },
  { id: 'returnGifts', categoryId: 'others', seoulDefault: 100, regionalDefault: 50 },
  { id: 'ibaji', categoryId: 'others', seoulDefault: 50, regionalDefault: 30 },
  { id: 'contingency', categoryId: 'others', seoulDefault: 200, regionalDefault: 100 },
]

export const GUEST_GROUP_NAMES = ['colleague', 'friend', 'family', 'relative', 'parentFriend'] as const

export const DEFAULT_GUEST_GROUPS: GuestGroup[] = [
  { id: 'g1', name: 'colleague', count: 60, perPerson: 5 },
  { id: 'g2', name: 'friend', count: 40, perPerson: 10 },
  { id: 'g3', name: 'family', count: 10, perPerson: 30 },
  { id: 'g4', name: 'relative', count: 40, perPerson: 10 },
  { id: 'g5', name: 'parentFriend', count: 100, perPerson: 10 },
]

export const DEFAULT_ITEM_SPLITS: Record<string, SplitSide> = {
  venue: 'shared', sdm: 'shared', gifts: 'shared', yedan: 'shared',
  ham: 'groom', honeymoon: 'shared', housing: 'shared', others: 'shared',
}

export const defaultSplit = (): SplitConfig => ({
  mode: 'item', ratio: 50, groomAmount: 0, brideAmount: 0, itemSplits: { ...DEFAULT_ITEM_SPLITS },
})

export function buildDefaultItems(region: Region): WeddingItem[] {
  return ITEM_DEFS.map(d => ({
    id: d.id, categoryId: d.categoryId,
    budget: region === 'seoul' ? d.seoulDefault : d.regionalDefault,
    actual: 0, note: '', included: true,
  }))
}

const defOf = (id: string) => ITEM_DEFS.find(d => d.id === id)

export function guestCountOf(items: WeddingItem[]): number {
  const gc = items.find(i => i.id === 'guestCount')
  return gc?.included ? gc.budget : 0
}

/** 항목 금액. 식대는 1인당 × 하객 수, 하객 수 자체는 비용 아님. effective = 실제 입력 시 실제, 아니면 예산 */
export function itemCost(item: WeddingItem, guestCount: number) {
  const def = defOf(item.id)
  if (!item.included || def?.isGuestCount) return { budget: 0, actual: 0, effective: 0 }
  const k = def?.isPerPerson ? guestCount : 1
  const budget = item.budget * k
  const actual = item.actual > 0 ? item.actual * k : 0
  return { budget, actual, effective: actual > 0 ? actual : budget }
}

export interface Totals {
  categories: Record<string, { budget: number; actual: number; effective: number }>
  budget: number
  actual: number
  /** 항목별로 실제(있으면)·예산을 합친 현재 기준 총비용 */
  effective: number
  housing: number
  exHousing: number
}

export function computeTotals(items: WeddingItem[]): Totals {
  const gc = guestCountOf(items)
  const categories: Totals['categories'] = {}
  for (const c of CATEGORY_IDS) categories[c] = { budget: 0, actual: 0, effective: 0 }
  for (const it of items) {
    const cat = categories[it.categoryId]
    if (!cat) continue
    const c = itemCost(it, gc)
    cat.budget += c.budget; cat.actual += c.actual; cat.effective += c.effective
  }
  let budget = 0, actual = 0, effective = 0
  for (const c of Object.values(categories)) { budget += c.budget; actual += c.actual; effective += c.effective }
  const housing = categories.housing.effective
  return { categories, budget, actual, effective, housing, exHousing: effective - housing }
}

export function congratsTotal(guests: GuestGroup[]): number {
  return guests.reduce((s, g) => s + g.count * g.perPerson, 0)
}

/** 축의금 vs 식대: 봉투(축의금 낸 사람) 기준 평균, 하객 손익 = 축의금 − 식대 총액 */
export function guestEconomics(guests: GuestGroup[], items: WeddingItem[]) {
  const envelopes = guests.reduce((s, g) => s + g.count, 0)
  const gifts = congratsTotal(guests)
  const meal = items.find(i => i.id === 'mealPerPerson')
  const mealPer = meal?.included ? (meal.actual > 0 ? meal.actual : meal.budget) : 0
  const diners = guestCountOf(items)
  const mealTotal = mealPer * diners
  return {
    envelopes, diners, gifts, mealPer, mealTotal,
    avgGift: envelopes > 0 ? gifts / envelopes : 0,
    /** 축의금 − 식대 총액 (양수 = 식대를 덮고 남음) */
    margin: gifts - mealTotal,
    /** 식사 인원 1명당 받아야 본전인 축의금 = 식대 × (식사 인원 / 봉투 수) */
    breakEvenGift: envelopes > 0 ? (mealPer * diners) / envelopes : 0,
  }
}

export function splitTotals(cfg: SplitConfig, totals: Totals) {
  let groom = 0, bride = 0
  if (cfg.mode === 'ratio') {
    groom = Math.round(totals.effective * cfg.ratio / 100)
    bride = totals.effective - groom
  } else if (cfg.mode === 'amount') {
    groom = cfg.groomAmount; bride = cfg.brideAmount
  } else {
    for (const c of CATEGORY_IDS) {
      const cost = totals.categories[c].effective
      const side = cfg.itemSplits[c] || 'shared'
      if (side === 'groom') groom += cost
      else if (side === 'bride') bride += cost
      else { const h = Math.round(cost / 2); groom += h; bride += cost - h }
    }
  }
  return { groom, bride, total: groom + bride }
}

// ── 준비 일정 (예식일 기준 D-day) ──
export const CHECKLIST: { id: string; d: number }[] = [
  { id: 'meetParents', d: -300 },
  { id: 'budget', d: -300 },
  { id: 'venue', d: -270 },
  { id: 'sdm', d: -240 },
  { id: 'housing', d: -200 },
  { id: 'honeymoon', d: -180 },
  { id: 'photo', d: -120 },
  { id: 'gifts', d: -100 },
  { id: 'appliances', d: -90 },
  { id: 'invitations', d: -60 },
  { id: 'sendInvites', d: -40 },
  { id: 'finalGuests', d: -30 },
  { id: 'ceremony', d: -14 },
  { id: 'payment', d: -7 },
  { id: 'registration', d: 30 },
]

export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d + n))
  return t.toISOString().slice(0, 10)
}

export function daysBetween(from: string, to: string): number {
  const p = (s: string) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d) }
  return Math.round((p(to) - p(from)) / 86400000)
}

export const isIsoDate = (s: string | null | undefined): s is string =>
  !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s))

export function schedule(weddingDate: string, today: string) {
  return CHECKLIST.map(c => {
    const due = addDays(weddingDate, c.d)
    return { ...c, due, left: daysBetween(today, due) }
  })
}


// ── URL 인코딩 ──
const SIDE_CH: Record<SplitSide, string> = { groom: 'g', shared: 's', bride: 'b' }
const CH_SIDE: Record<string, SplitSide> = { g: 'groom', s: 'shared', b: 'bride' }
const n0 = (s: string | undefined) => { const n = parseInt(s ?? '', 10); return isFinite(n) && n >= 0 ? Math.min(n, 999999) : 0 }

export interface UrlState {
  region: Region
  items: WeddingItem[]
  guests: GuestGroup[]
  split: SplitConfig
  date: string
}

export function encodeState(s: UrlState): Record<string, string> {
  const byId = new Map(s.items.map(i => [i.id, i]))
  const b = ITEM_DEFS.map(d => { const i = byId.get(d.id); return i ? `${i.included ? '' : '~'}${i.budget}` : '' }).join('.')
  const a = ITEM_DEFS.map(d => byId.get(d.id)?.actual || 0)
  const out: Record<string, string> = {
    region: s.region,
    b,
    gg: s.guests.map(g => `${g.name}-${g.count}-${g.perPerson}`).join('_'),
    sm: s.split.mode,
  }
  if (a.some(x => x > 0)) out.a = a.join('.')
  if (s.split.mode === 'ratio') out.sr = String(s.split.ratio)
  if (s.split.mode === 'amount') out.sa = `${s.split.groomAmount}.${s.split.brideAmount}`
  out.sp = CATEGORY_IDS.map(c => SIDE_CH[s.split.itemSplits[c] || 'shared']).join('')
  if (s.date) out.d = s.date
  return out
}

/** 공유 링크 복원. b(항목 예산)가 없으면 null (옛 링크 region/tab만 → 기본값 사용) */
export function decodeState(get: (k: string) => string | null): UrlState | null {
  const b = get('b')
  if (!b) return null
  const region: Region = get('region') === 'regional' ? 'regional' : 'seoul'
  const items = buildDefaultItems(region)
  const bs = b.split('.'), as = (get('a') ?? '').split('.')
  ITEM_DEFS.forEach((_, idx) => {
    const raw = bs[idx]
    if (raw === undefined || raw === '') return
    items[idx].included = !raw.startsWith('~')
    items[idx].budget = n0(raw.replace('~', ''))
    items[idx].actual = n0(as[idx])
  })
  const gg = get('gg')
  const guests: GuestGroup[] = gg === null ? DEFAULT_GUEST_GROUPS.map(g => ({ ...g })) : gg.split('_').filter(Boolean).map((p, i) => {
    const [name, c, pp] = p.split('-')
    return { id: `u${i}`, name: (GUEST_GROUP_NAMES as readonly string[]).includes(name) ? name : 'friend', count: n0(c), perPerson: n0(pp) }
  })
  const split = defaultSplit()
  const sm = get('sm')
  if (sm === 'ratio' || sm === 'amount' || sm === 'item') split.mode = sm
  split.ratio = Math.min(100, n0(get('sr') ?? '50'))
  const [ga, ba] = (get('sa') ?? '').split('.')
  split.groomAmount = n0(ga); split.brideAmount = n0(ba)
  const sp = get('sp') ?? ''
  CATEGORY_IDS.forEach((c, i) => { if (CH_SIDE[sp[i]]) split.itemSplits[c] = CH_SIDE[sp[i]] })
  const d = get('d')
  return { region, items, guests, split, date: isIsoDate(d) ? d : '' }
}
