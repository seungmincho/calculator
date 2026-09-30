// 주식 매매 손익·평단가·목표가·미국주식 양도세 계산 (순수 함수)
// 수수료·세금은 원 미만 절사(증권사마다 10원 미만 절사 등 차이가 있을 수 있음).

export type Market = 'kospi' | 'kosdaq' | 'konex' | 'etf'

/** 2026-01-01 양도분부터 (증권거래세법 시행령 개정). 코스피는 거래세 0.05% + 농어촌특별세 0.15% */
export const SELL_TAX: Record<Market, { tx: number; farm: number }> = {
  kospi: { tx: 0.0005, farm: 0.0015 },
  kosdaq: { tx: 0.002, farm: 0 },
  konex: { tx: 0.001, farm: 0 },
  etf: { tx: 0, farm: 0 }, // 국내 상장 ETF 매도는 증권거래세 면제
}
export const MARKETS = Object.keys(SELL_TAX) as Market[]
export const sellTaxRate = (m: Market) => SELL_TAX[m].tx + SELL_TAX[m].farm

/** 해외주식 양도소득세: 20% + 지방소득세 2%, 연 250만원 기본공제 */
export const US_TAX_RATE = 0.2
export const US_DEDUCTION = 2_500_000

const n = (v: number) => (Number.isFinite(v) && v > 0 ? v : 0)

/** KRX 호가단위(2023.1.25~, 코스피·코스닥 공통). ETF는 2,000원 이상 5원 */
export function tickSize(price: number, market: Market = 'kospi'): number {
  if (market === 'etf') return price < 2000 ? 1 : 5
  if (price < 2000) return 1
  if (price < 5000) return 5
  if (price < 20000) return 10
  if (price < 50000) return 50
  if (price < 200000) return 100
  if (price < 500000) return 500
  return 1000
}
/** 호가단위로 올림 */
export function tickUp(price: number, market: Market = 'kospi'): number {
  const p = Math.ceil(price)
  const t = tickSize(p, market)
  return Math.ceil(p / t) * t
}

export interface TradeInput { buy: number; sell: number; qty: number; feePct: number; market: Market }

export function trade({ buy, sell, qty, feePct, market }: TradeInput) {
  buy = n(buy); sell = n(sell); qty = Math.floor(n(qty))
  const f = n(feePct) / 100
  const buyAmount = buy * qty
  const sellAmount = sell * qty
  const buyFee = Math.floor(buyAmount * f)
  const sellFee = Math.floor(sellAmount * f)
  const txTax = Math.floor(sellAmount * SELL_TAX[market].tx)
  const farmTax = Math.floor(sellAmount * SELL_TAX[market].farm)
  const tax = txTax + farmTax
  const cost = buyAmount + buyFee
  const proceeds = sellAmount - sellFee - tax
  const profit = proceeds - cost
  return {
    buyAmount, sellAmount, buyFee, sellFee, txTax, farmTax, tax, cost, proceeds, profit,
    grossProfit: sellAmount - buyAmount,
    returnPct: cost > 0 ? (profit / cost) * 100 : 0,
    grossPct: buyAmount > 0 ? ((sell - buy) / buy) * 100 : 0,
    totalCost: buyFee + sellFee + tax,
  }
}

/** 순수익 ≥ 목표(원)가 되는 최소 매도가(원 단위, 호가 미반영) */
function minSellFor(target: number, i: Omit<TradeInput, 'sell'>): number {
  const qty = Math.floor(n(i.qty))
  if (!qty || !n(i.buy)) return 0
  const k = 1 - n(i.feePct) / 100 - sellTaxRate(i.market)
  if (k <= 0) return 0
  const cost = trade({ ...i, sell: 0 }).cost
  let p = Math.ceil((cost + target) / (qty * k))
  // 절사 때문에 연속식보다 조금 낮은 가격에서도 목표를 넘을 수 있음 → 내려가며 확인
  while (p > 1 && trade({ ...i, sell: p - 1 }).profit >= target) p--
  while (trade({ ...i, sell: p }).profit < target) p++
  return p
}

/** 손익분기 매도가: 수수료·세금 빼고 손실이 없는 최소 가격 (price) + 호가단위 반영 (tick) */
export function breakeven(i: Omit<TradeInput, 'sell'>) {
  const price = minSellFor(0, i)
  return { price, tick: price ? tickUp(price, i.market) : 0 }
}

/** 목표 순수익률(%, 수수료·세금 반영)에 필요한 매도가 */
export function targetSell(i: Omit<TradeInput, 'sell'>, targetPct: number) {
  const cost = trade({ ...i, sell: 0 }).cost
  const price = minSellFor(Math.ceil((cost * targetPct) / 100), i)
  return { price, tick: price ? tickUp(price, i.market) : 0 }
}

export interface Lot { price: number; qty: number }

/** 분할 매수 평균단가 (수수료 제외, 증권사 앱 표시 방식) */
export function averagePrice(lots: Lot[]) {
  let qty = 0, amount = 0
  for (const l of lots) { const q = Math.floor(n(l.qty)); qty += q; amount += n(l.price) * q }
  return { qty, amount, avg: qty ? amount / qty : 0 }
}

/**
 * 현재가(cur)로 몇 주 더 사야 평단이 target이 되는지.
 * 물타기(cur < target < avg) 또는 불타기(avg < target < cur)만 가능, 그 외 null.
 */
export function sharesToTarget(avg: number, qty: number, cur: number, target: number) {
  if (!(avg > 0 && qty > 0 && cur > 0 && target > 0)) return null
  const down = cur < target && target < avg
  const up = avg < target && target < cur
  if (!down && !up) return null
  // (avg*qty + cur*x) / (qty + x) = target → x = qty(avg - target)/(target - cur)
  // 물타기는 평단이 target 이하가 되도록 올림, 불타기는 target 이하로 유지하도록 내림
  const exact = (qty * (avg - target)) / (target - cur)
  const add = down ? Math.ceil(exact - 1e-9) : Math.floor(exact + 1e-9)
  if (add <= 0) return null
  return { add, amount: add * cur, newAvg: (avg * qty + cur * add) / (qty + add), newQty: qty + add }
}

export interface UsInput {
  buy: number; sell: number; qty: number // USD
  buyFx: number; sellFx: number // 원/달러
  feePct: number // 매매 수수료 %
  otherGain?: number // 같은 해 다른 해외주식 손익(원)
}

/** 해외주식 양도세(지방세 포함), 원 미만 절사 */
export function usTax(annualGain: number) {
  const base = Math.max(0, Math.floor(annualGain) - US_DEDUCTION)
  const income = Math.floor(base * US_TAX_RATE)
  const local = Math.floor(income * 0.1)
  return { base, income, local, total: income + local }
}

export function usTrade({ buy, sell, qty, buyFx, sellFx, feePct, otherGain = 0 }: UsInput) {
  buy = n(buy); sell = n(sell); qty = n(qty); buyFx = n(buyFx); sellFx = n(sellFx)
  const f = n(feePct) / 100
  const buyUsd = buy * qty, sellUsd = sell * qty
  const buyFeeUsd = buyUsd * f, sellFeeUsd = sellUsd * f
  const buyKrw = Math.floor(buyUsd * buyFx)
  const sellKrw = Math.floor(sellUsd * sellFx)
  const feeKrw = Math.floor(buyFeeUsd * buyFx) + Math.floor(sellFeeUsd * sellFx)
  const gain = sellKrw - buyKrw - feeKrw // 양도차익 (필요경비 = 수수료)
  const priceGain = Math.round((sell - buy) * qty * buyFx) // 주가 변동분(매수 환율 기준)
  const fxGain = sellKrw - buyKrw - priceGain // 환율 변동분
  // 이 거래가 늘린 세금 = (다른 손익 + 이번) 세금 − (다른 손익만) 세금
  const withThis = usTax(otherGain + gain)
  const tax = withThis.total - usTax(otherGain).total
  const net = gain - tax
  const cost = buyKrw + Math.floor(buyFeeUsd * buyFx)
  const netUsd = sellUsd - sellFeeUsd - buyUsd - buyFeeUsd
  return {
    buyUsd, sellUsd, buyFeeUsd, sellFeeUsd, buyKrw, sellKrw, feeKrw, gain, priceGain, fxGain,
    tax, taxDetail: withThis, net,
    returnPct: cost > 0 ? (net / cost) * 100 : 0,
    preTaxPct: cost > 0 ? (gain / cost) * 100 : 0,
    usdPct: buyUsd + buyFeeUsd > 0 ? (netUsd / (buyUsd + buyFeeUsd)) * 100 : 0,
    // 세전 손익 0이 되는 매도가(USD, 매도 환율 기준)
    breakevenUsd: qty && sellFx && f < 1 ? cost / (qty * sellFx * (1 - f)) : 0,
  }
}
