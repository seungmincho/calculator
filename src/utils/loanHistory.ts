// 대출 이력 입력 복원. 빈 값·손상된 값과 정상적인 0을 구분한다.
export interface LoanHistoryState {
  mode: 'calc' | 'rev'
  am: number
  pay: number
  r: number
  t: number
  m: 'equalPayment' | 'equalPrincipal' | 'bullet'
  gr: number
  inc: number
  ex: number
}

export const LEGACY_TYPE: Record<string, Partial<LoanHistoryState>> = {
  'equal-payment': { m: 'equalPayment' },
  'equal-principal': { m: 'equalPrincipal' },
  'interest-only': { m: 'bullet' },
  balloon: { m: 'equalPayment', gr: 24 },
}

function number(value: unknown, max: number): number | undefined {
  if (typeof value !== 'number' && typeof value !== 'string') return undefined
  const text = typeof value === 'string' ? value.replace(/,/g, '').trim() : ''
  if (typeof value === 'string' && !text) return undefined
  const n = typeof value === 'number' ? value : Number(text)
  return Number.isFinite(n) && n >= 0 && n <= max ? n : undefined
}

export function saveLoanHistory(state: LoanHistoryState, principal: number) {
  return {
    loanAmount: String(principal), interestRate: String(state.r), loanTerm: String(state.t),
    method: state.m, grace: state.gr, mode: state.mode, pay: state.pay,
    inc: state.inc, ex: state.ex,
  }
}

export function restoreLoanHistory(input: Record<string, unknown>, current: LoanHistoryState): LoanHistoryState {
  const legacy = Array.isArray(input.selectedTypes) ? LEGACY_TYPE[String(input.selectedTypes[0])] : undefined
  const next = { ...current, ...legacy, mode: input.mode === 'rev' ? 'rev' as const : 'calc' as const }
  const amount = number(input.loanAmount, Number.MAX_SAFE_INTEGER)
  const term = number(input.loanTerm, 50)
  const rate = number(input.interestRate, 100)
  if (amount !== undefined && amount > 0) next.am = amount / 1e4
  if (term !== undefined && term > 0) next.t = term
  if (rate !== undefined && rate < 100) next.r = rate
  for (const key of ['pay', 'inc', 'ex'] as const) {
    const value = number(input[key], Number.MAX_SAFE_INTEGER / 1e4)
    if (value !== undefined) next[key] = value
  }
  if (input.method === 'equalPayment' || input.method === 'equalPrincipal' || input.method === 'bullet') next.m = input.method
  const grace = number(input.grace, Math.round(next.t * 12) - 1)
  if (grace !== undefined && Number.isInteger(grace)) next.gr = grace
  return next
}
