// 더치페이/N빵 정산 (순수 함수). 회귀 체크: node scripts/check-dutch-pay.ts
// 모델: 사람(가중치) + 지출(금액, 결제자, 나눌 사람). 간단 모드 = 모든 지출을 총무가 결제한 경우.

export interface Person { name: string; weight: number } // weight: 0~9.9, 0.1 단위 (선배 1.5 등)
export interface Expense { name: string; amount: number; payer: number; among: number[] } // among: 나눌 사람 index
export interface Transfer { from: number; to: number; amount: number }
export type RoundDir = 'ceil' | 'floor' | 'round'
export const UNITS = [1, 10, 100, 1000] as const
export const MAX_PEOPLE = 30

const w10 = (w: number) => Math.max(0, Math.round((Number.isFinite(w) ? w : 1) * 10)) // 정수 연산용
const amt = (n: number) => (Number.isFinite(n) && n > 0 ? Math.floor(n) : 0)

/**
 * 한 지출을 가중치대로 원 단위 정수로 나눈다. 합계 = amount 정확히 일치(최대잉여법).
 * 가중치 합이 0이면(모두 0배) 균등 분할.
 */
export function splitExpense(amount: number, weights: number[], among: number[]): number[] {
  const out = weights.map(() => 0)
  const a = amt(amount)
  const idx = [...new Set(among)].filter((i) => i >= 0 && i < weights.length)
  if (!a || !idx.length) return out
  let ws = idx.map((i) => w10(weights[i]))
  if (ws.every((w) => w === 0)) ws = ws.map(() => 1)
  const W = ws.reduce((s, w) => s + w, 0)
  const frac: { i: number; r: number }[] = []
  let used = 0
  idx.forEach((i, k) => {
    const num = a * ws[k]
    out[i] = Math.floor(num / W)
    used += out[i]
    frac.push({ i, r: num % W })
  })
  // 남은 몇 원: 나머지가 큰 순(동률이면 앞사람)
  frac.sort((x, y) => y.r - x.r || x.i - y.i)
  for (let k = 0; k < a - used; k++) out[frac[k % frac.length].i]++
  return out
}

export interface Settlement {
  total: number
  owed: number[] // 각자 부담액(정확, 원 단위)
  paid: number[] // 각자 결제액
  net: number[] // paid - owed (+ 받을 돈, - 보낼 돈)
  transfers: Transfer[]
}

/** 여러 명이 결제한 경우: 순잔액 → 최소 송금(큰 채무자 ↔ 큰 채권자 탐욕 매칭, 최대 n-1건) */
export function settle(people: Person[], expenses: Expense[]): Settlement {
  const n = people.length
  const owed = Array(n).fill(0)
  const paid = Array(n).fill(0)
  const weights = people.map((p) => p.weight)
  let total = 0
  for (const e of expenses) {
    const a = amt(e.amount)
    if (!a || e.payer < 0 || e.payer >= n) continue
    const s = splitExpense(a, weights, e.among)
    if (!s.some((x) => x)) continue // 나눌 사람 없음 → 무시
    total += a
    paid[e.payer] += a
    s.forEach((x, i) => { owed[i] += x })
  }
  const net = paid.map((p, i) => p - owed[i])
  return { total, owed, paid, net, transfers: minTransfers(net) }
}

/** 순잔액(합 0) → 송금 목록. ponytail: 탐욕 매칭은 건수 ≤ n-1 보장, 진짜 최소(NP-hard)는 아님 */
export function minTransfers(net: number[]): Transfer[] {
  const debt = net.map((v, i) => ({ i, v: -v })).filter((x) => x.v > 0)
  const cred = net.map((v, i) => ({ i, v })).filter((x) => x.v > 0)
  const out: Transfer[] = []
  while (debt.length && cred.length) {
    debt.sort((a, b) => b.v - a.v || a.i - b.i)
    cred.sort((a, b) => b.v - a.v || a.i - b.i)
    const d = debt[0], c = cred[0]
    const m = Math.min(d.v, c.v)
    out.push({ from: d.i, to: c.i, amount: m })
    d.v -= m; c.v -= m
    if (!d.v) debt.shift()
    if (!c.v) cred.shift()
  }
  return out
}

const roundTo = (n: number, unit: number, dir: RoundDir) => {
  const u = unit > 0 ? unit : 1
  const q = n / u
  return (dir === 'ceil' ? Math.ceil(q) : dir === 'floor' ? Math.floor(q) : Math.round(q)) * u
}

export interface Simple extends Settlement {
  pay: number[] // 실제로 낼 금액(단위 맞춤). 총무 = total - 나머지 합 (차액 흡수)
  leader: number
  diff: number // 총무 pay - 총무 owed (+ 총무가 더 냄, - 총무가 덜 냄)
}

/**
 * 간단 모드: 총무가 전부 결제, 나머지는 부담액을 unit 단위로 올림/내림해 총무에게 송금.
 * 합계 = total 정확히 일치 — 반올림 차액은 총무가 흡수.
 */
export function simpleSplit(people: Person[], items: { name: string; amount: number; among: number[] }[], leader: number, unit: number, dir: RoundDir): Simple {
  const L = leader >= 0 && leader < people.length ? leader : 0
  const s = settle(people, items.map((it) => ({ ...it, payer: L })))
  const pay = s.owed.map((o, i) => (i === L ? 0 : roundTo(o, unit, dir)))
  pay[L] = s.total - pay.reduce((a, b) => a + b, 0)
  const transfers = pay.map((p, i) => ({ from: i, to: L, amount: p })).filter((x) => x.from !== L && x.amount > 0)
  return { ...s, pay, leader: L, diff: pay[L] - s.owed[L], transfers }
}

// ── URL 공유: base64url(JSON). 계좌번호는 절대 넣지 않음 ──
export interface State {
  mode: 's' | 't' // simple | trip
  title: string
  people: Person[]
  expenses: Expense[] // simple 모드면 payer 무시
  leader: number
  unit: number
  dir: RoundDir
}

const toB64 = (s: string) => {
  let bin = ''
  new TextEncoder().encode(s).forEach((b) => { bin += String.fromCharCode(b) })
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const fromB64 = (s: string) => {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
}
// among ↔ 비트마스크(최대 30명 → 32비트 정수 안)
const toMask = (among: number[]) => among.reduce((m, i) => m | (1 << i), 0) >>> 0
const fromMask = (m: number, n: number) => Array.from({ length: n }, (_, i) => i).filter((i) => (m >>> i) & 1)

export function encodeState(st: State): string {
  const n = st.people.length
  const all = toMask(Array.from({ length: n }, (_, i) => i))
  return toB64(JSON.stringify([
    1, st.mode, st.title, st.leader, st.unit, st.dir,
    st.people.map((p) => (w10(p.weight) === 10 ? p.name : [p.name, w10(p.weight)])),
    st.expenses.map((e) => { const m = toMask(e.among); return m === all ? [e.name, e.amount, e.payer] : [e.name, e.amount, e.payer, m] }),
  ]))
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '')
const int = (v: unknown, lo: number, hi: number, d: number) => (Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi ? (v as number) : d)

/** 신뢰할 수 없는 입력(URL) → 검증된 State. 실패 시 null */
export function decodeState(s: string | null): State | null {
  if (!s) return null
  try {
    const a = JSON.parse(fromB64(s))
    if (!Array.isArray(a) || a[0] !== 1) return null
    const people: Person[] = (Array.isArray(a[6]) ? a[6] : []).slice(0, MAX_PEOPLE).map((p: unknown) =>
      Array.isArray(p) ? { name: str(p[0], 20), weight: int(p[1], 0, 99, 10) / 10 } : { name: str(p, 20), weight: 1 })
    const n = people.length
    if (n < 1) return null
    const all = Array.from({ length: n }, (_, i) => i)
    const expenses: Expense[] = (Array.isArray(a[7]) ? a[7] : []).slice(0, 100).filter(Array.isArray).map((e: unknown[]) => ({
      name: str(e[0], 30),
      amount: int(e[1], 0, 1e11, 0),
      payer: int(e[2], 0, n - 1, 0),
      among: e.length > 3 ? fromMask(int(e[3], 0, 2 ** 32 - 1, 0), n) : all,
    }))
    return {
      mode: a[1] === 't' ? 't' : 's',
      title: str(a[2], 30),
      leader: int(a[3], 0, n - 1, 0),
      unit: (UNITS as readonly number[]).includes(a[4]) ? a[4] : 100,
      dir: a[5] === 'floor' || a[5] === 'round' ? a[5] : 'ceil',
      people,
      expenses,
    }
  } catch {
    return null
  }
}
