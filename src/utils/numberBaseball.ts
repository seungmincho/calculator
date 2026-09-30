// 숫자야구 순수 로직: 판정 · 후보 필터링 · 오늘의 숫자 · 통계 · 공유 그리드
// 회귀 체크: node scripts/check-number-baseball.ts
import { dayNumber, msToNextDay, computeStats as computeDayStats } from './hangman.ts'

export { dayNumber, msToNextDay }

export interface Score { s: number; b: number }

/** 스트라이크/볼 판정 (서로 다른 숫자 전제) */
export function score(secret: string, guess: string): Score {
  let s = 0, b = 0
  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === secret[i]) s++
    else if (secret.includes(guess[i])) b++
  }
  return { s, b }
}

/** 표준 규칙: 서로 다른 숫자, allowZero면 0도 어느 자리든 가능 */
export function allCandidates(len: number, allowZero: boolean): string[] {
  const digits = allowZero ? '0123456789' : '123456789'
  const out: string[] = []
  const walk = (cur: string) => {
    if (cur.length === len) { out.push(cur); return }
    for (const d of digits) if (!cur.includes(d)) walk(cur + d)
  }
  walk('')
  return out
}

/** 지금까지의 판정과 모순 없는 후보만 남김 */
export const filterCandidates = (cands: string[], history: { guess: string; s: number; b: number }[]) =>
  cands.filter(c => history.every(h => { const r = score(c, h.guess); return r.s === h.s && r.b === h.b }))

/** 입력 검증: null = 통과 */
export function validateGuess(guess: string, len: number, allowZero: boolean, tried: string[]):
  null | 'incomplete' | 'duplicate' | 'zero' | 'repeat' {
  if (guess.length !== len || !/^\d+$/.test(guess)) return 'incomplete'
  if (new Set(guess).size !== len) return 'duplicate'
  if (!allowZero && guess.includes('0')) return 'zero'
  if (tried.includes(guess)) return 'repeat'
  return null
}

// ── 오늘의 숫자 (KST, 모두 같은 숫자) ─────────────────────────────────────
export const DAILY = { len: 4, allowZero: false, max: 10 } as const

function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let x = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

let pool: string[] | null = null
const cycleCache = new Map<number, string[]>()
/** 후보 3,024개를 한 바퀴 돌 때까지 중복 없음 (주기마다 다른 순서) */
export function dailyAnswer(day: number): string {
  pool ??= allCandidates(DAILY.len, DAILY.allowZero)
  const n = pool.length
  const cycle = Math.floor((day - 1) / n)
  let order = cycleCache.get(cycle)
  if (!order) {
    order = [...pool]
    const rnd = mulberry32(0xba5e + cycle * 7919)
    for (let k = n - 1; k > 0; k--) {
      const r = Math.floor(rnd() * (k + 1))
      ;[order[k], order[r]] = [order[r], order[k]]
    }
    cycleCache.set(cycle, order)
  }
  return order[(((day - 1) % n) + n) % n]
}

export function randomAnswer(len: number, allowZero: boolean, rnd = Math.random) {
  const c = allCandidates(len, allowZero)
  return c[Math.floor(rnd() * c.length)]
}

// ── 진행 상태 · 통계 ──────────────────────────────────────────────────────
/** guesses: 제출한 추측, peeks: 비용을 내고 본 후보(1개당 시도 1회 차감), memo: 숫자 0~9별 ' '|'x'|'o'|'?' */
export interface Play { guesses: string[]; peeks: string[]; memo?: string }
export type DailyRecords = Record<number, Play>

/** 사용한 시도 = 추측 + 후보 보기 */
export const usedTries = (p: Play) => p.guesses.length + p.peeks.length

/** max = 0 이면 무제한 */
export function status(secret: string, p: Play, max: number): 'playing' | 'won' | 'lost' {
  if (p.guesses[p.guesses.length - 1] === secret) return 'won'
  return max > 0 && usedTries(p) >= max ? 'lost' : 'playing'
}

/** 플레이 수·승률·연속·시도 분포(1..max). 연속 계산은 hangman과 같은 로직 재사용 */
export function computeStats(records: DailyRecords, today: number) {
  const mapped = Object.fromEntries(Object.entries(records).map(([d, p]) => {
    const st = status(dailyAnswer(Number(d)), p, DAILY.max)
    return [d, { guesses: p.guesses, wrong: usedTries(p) - 1, status: st }]
  }))
  // dist[k] = k+1회 만에 맞힌 날 수
  return computeDayStats(mapped, today, DAILY.max)
}

/** 판정 그리드: S=🟩 B=🟨 아웃=⬜ (숫자·위치는 드러내지 않음) */
export const gridRow = (r: Score, len: number) => '🟩'.repeat(r.s) + '🟨'.repeat(r.b) + '⬜'.repeat(len - r.s - r.b)

export function shareText(header: string, secret: string, p: Play, url: string) {
  const rows = p.guesses.map(g => gridRow(score(secret, g), secret.length))
  return [header, ...rows, url].join('\n')
}

/** 메모 순환: 빈칸 → ❌ → ⭕ → ? → 빈칸 */
const MEMO_CYCLE = [' ', 'x', 'o', '?']
export function cycleMemo(memo: string | undefined, digit: number) {
  const m = (memo ?? ' '.repeat(10)).padEnd(10, ' ').split('')
  m[digit] = MEMO_CYCLE[(MEMO_CYCLE.indexOf(m[digit]) + 1) % MEMO_CYCLE.length]
  return m.join('')
}
