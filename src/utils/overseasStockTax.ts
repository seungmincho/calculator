// 해외주식 양도세 계산기(/overseas-stock-tax) 순수 함수. 세액은 stock.ts usTax(주식 계산기와 같은 함수).
// 회귀 체크: node scripts/check-overseas-stock-tax.ts
// 근거(2026-11-08 확인):
//   국세청 「2025년 신고안내 해외주식과 세금(개인투자자용)」(2025.5): 세율 20%(해외상장 중소내국법인 10%), 기본공제 국내·국외주식 합산 연 250만원,
//     국내 대주주·비상장 주식과 손익통산(2020.1.1 양도분~), 예정신고 없이 다음 해 5월 확정신고(소법 §105①),
//     원화 환산 = 양도대금 입금일·취득대금 출금일(결제일)의 기준환율·재정환율, 선입선출 원칙(소령 §162⑤)·증권사 이동평균법 인정
//   소득세법 §94①3호다목 과세 대상, §102① 주식등은 별도 그룹(결손금 다른 그룹과 합산 안 함), §103① 그룹별 연 250만원, §110① 다음 해 5월 1일~31일
//   지방세법 §103의3①11호 양도소득 개인지방소득세 1천분의 20 (= 소득세의 10%)
//   소득세법 §97의2① 배우자·직계존비속에게 증여받은 주식등을 1년 안에 양도하면 증여자 취득가액
//   조세특례제한법 §91의26 국내시장복귀계좌(RIA) — 이 계산기에는 반영하지 않음(안내만)
import { usTax, US_DEDUCTION } from './stock.ts'

export interface Position { name: string; sold: boolean; cost: number; value: number }

export const DEDUCTION = US_DEDUCTION // 연 250만원
export const FEE = '0.25' // 매매 수수료 %(예시). 문자열 = 입력칸 값
export const MAX = 1_000_000_000_000
export const MAX_ROWS = 20

// 기본값 = 페이지 예시. 판 종목 이익 + 보유 중 손실·이익 → 첫 화면에 세금·손실 정리 결과가 보이게
export const DEFAULT_ROWS: Position[] = [
  { name: '엔비디아', sold: true, cost: 15_000_000, value: 25_000_000 },
  { name: '테슬라', sold: false, cost: 12_000_000, value: 8_000_000 },
  { name: '애플', sold: false, cost: 10_000_000, value: 13_000_000 },
]
export const EXAMPLES = {
  d: DEFAULT_ROWS,
  // 판 이익이 250만원보다 적을 때 → 공제 채우기
  fill: [
    { name: '마이크로소프트', sold: true, cost: 4_000_000, value: 5_000_000 },
    { name: '애플', sold: false, cost: 10_000_000, value: 13_000_000 },
  ] as Position[],
}

const pos = (v: number) => (Number.isFinite(v) && v > 0 ? v : 0)
export const feeRate = (feePct: string) => Math.min(pos(Number(feePct)), 5) / 100

/** 수수료(매수·매도 양쪽 필요경비) 뺀 손익. 보유 중이면 지금 판다고 보고 계산 */
export function gainOf(p: Position, f: number) {
  const cost = pos(p.cost), value = pos(p.value)
  return value - cost - Math.floor(cost * f) - Math.floor(value * f)
}

export function analyze(rows: Position[], feePct: string = FEE) {
  const f = feeRate(feePct)
  const items = rows.map((p) => ({ ...p, gain: gainOf(p, f) }))
  const sum = (xs: { gain: number }[]) => xs.reduce((a, x) => a + x.gain, 0)
  const held = items.filter((x) => !x.sold)

  const realized = sum(items.filter((x) => x.sold))
  const tax = usTax(realized)
  const used = Math.min(Math.max(realized, 0), DEDUCTION)

  // 1) 손익통산: 250만원 넘는 이익만큼만 손실 실현(남는 손실은 다음 해로 이월되지 않음). 큰 손실부터
  const need = Math.max(0, realized - DEDUCTION)
  let left = need
  const harvest = held.filter((x) => x.gain < 0).sort((a, b) => a.gain - b.gain).flatMap((x) => {
    const use = Math.min(left, -x.gain)
    if (use <= 0) return []
    left -= use
    return [{ name: x.name, use, sell: Math.ceil((pos(x.value) * use) / -x.gain), full: use === -x.gain }]
  })
  const harvested = need - left
  const afterLoss = realized - harvested
  const taxAfterLoss = usTax(afterLoss).total

  // 2) 공제 채우기: 남은 공제(순손실이면 그만큼 더)까지 이익 실현 후 재매수 → 매수가 상승. 큰 이익부터
  const room = Math.max(0, DEDUCTION - realized)
  left = room
  const fill = held.filter((x) => x.gain > 0).sort((a, b) => b.gain - a.gain).flatMap((x) => {
    const gain = Math.min(left, x.gain)
    if (gain <= 0) return []
    left -= gain
    return [{ name: x.name, gain, sell: Math.floor((pos(x.value) * gain) / x.gain), full: gain === x.gain }]
  })
  const filled = room - left
  // 나중에 250만원을 넘는 이익으로 팔 때 덜 내는 세금(최대)
  const futureSaving = usTax(DEDUCTION + filled).total
  const fillFees = fill.reduce((a, x) => a + 2 * Math.floor(x.sell * f), 0) // 매도 + 재매수

  const allGain = realized + sum(held)
  return {
    items, realized, tax, used, need,
    harvest, harvested, afterLoss, taxAfterLoss, lossSaving: tax.total - taxAfterLoss, heldLoss: -sum(held.filter((x) => x.gain < 0)),
    room, fill, filled, futureSaving, fillFees, heldGain: sum(held.filter((x) => x.gain > 0)),
    allGain, taxAll: usTax(allGain).total,
    status: (realized <= 0 ? 'loss' : realized <= DEDUCTION ? 'within' : 'taxed') as 'loss' | 'within' | 'taxed',
  }
}

// ── URL: r = 이름~s|h~매수금액~매도·평가금액 을 | 로 이음 ──
const clean = (s: string) => s.replace(/[~|]/g, '').trim().slice(0, 30)
export const encodeRows = (rows: Position[]) => rows.map((p) => [clean(p.name), p.sold ? 's' : 'h', pos(p.cost), pos(p.value)].join('~')).join('|')
export function decodeRows(v: string | null): Position[] | null {
  if (!v) return null
  const rows = v.split('|').slice(0, MAX_ROWS).map((r) => r.split('~')).flatMap(([name = '', s, c, val]) => {
    const num = (x?: string) => (x && /^\d{1,13}$/.test(x) ? Math.min(Number(x), MAX) : null)
    const cost = num(c), value = num(val)
    return (s === 's' || s === 'h') && cost !== null && value !== null ? [{ name: clean(name), sold: s === 's', cost, value }] : []
  })
  return rows.length ? rows : null
}
export const parseFee = (v: string | null) => (v && /^\d{1,2}(\.\d{1,3})?$/.test(v) && Number(v) <= 5 ? v : null)
