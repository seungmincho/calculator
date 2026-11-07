// 윷놀이 규칙과 AI(순수 함수). 화면: components/games/YutNoriAI.tsx(흐름) · components/YutNoriBoard.tsx(말판).
// 회귀 체크: node scripts/check-yut-nori.ts
//
// 말판 자리 번호(29개)
//   바깥 0~19: 0 참먹이(출발·도착, 오른쪽 아래) → 1~5 오른쪽 변을 올라 5 모(오른쪽 위)
//              → 6~10 윗변을 왼쪽으로 10 뒷모(왼쪽 위) → 11~15 왼쪽 변을 내려 15 찌모(왼쪽 아래) → 16~19 아랫변.
//   대각선:    20·21 모→방, 22 방(가운데), 23·24 방→찌모, 25·26 뒷모→방, 27·28 방→참먹이.
//
// 고른 규칙(널리 쓰는 규칙)
//   - 윷가락 4개가 저마다 1/2 확률로 배(평평한 면)가 위로 온다고 본다. 배 개수 1 도·2 개·3 걸·4 윷·0 모.
//     빽도: 표시한 가락(0번) 하나만 배가 나오면 -1(1/16). 빽도 규칙을 끄면 이 경우도 도.
//   - 윷·모는 한 번 더 던지고, 잡아도 한 번 더 던진다. 던질 횟수가 남아 있으면 먼저 다 던진 뒤 옮긴다.
//     모인 윷은 아무 말에나 아무 순서로 나눠 쓴다.
//   - 모·뒷모·방에 '멈추면' 다음부터 대각선(지름길)으로 간다. 방에 멈추면 참먹이 쪽,
//     모에서 들어와 방을 지나치면 그대로 찌모 쪽. 빽도로 그 자리에 와도 멈춘 것으로 친다.
//   - 나기: 참먹이를 '지나야' 난다. 참먹이에 딱 멈추면 판에 남고, 다음에 무엇이 나오든(도 이상) 난다.
//   - 빽도는 지나온 길로 한 칸 뒤. 도 자리에서 빽도면 참먹이로 간다. 대기 말은 빽도로 못 움직인다.
//   - 남은 윷을 하나도 쓸 수 없으면(빽도뿐인데 판에 말이 없음) 버리고 차례를 넘긴다.
//   - 한 사람이 말을 모두 내면 끝난다. ponytail: 2~4등은 가리지 않음, 순위전이 필요하면 winner 를 배열로.

export type Throw = -1 | 1 | 2 | 3 | 4 | 5
/** 0 바깥길 · 1 모 대각선(방을 지나 찌모로) · 2 모→방→참먹이 · 3 뒷모→방→참먹이 */
export type Route = 0 | 1 | 2 | 3
/** idx: 길 위 위치. HOME 대기, DONE 남. 대기 말은 route 0. */
export interface Piece { route: Route; idx: number }

export const HOME = -1
export const DONE = 99
export const STATION_COUNT = 29

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i)
export const ROUTES: readonly (readonly number[])[] = [
  [...range(1, 19), 0],
  [...range(1, 5), 20, 21, 22, 23, 24, ...range(15, 19), 0],
  [...range(1, 5), 20, 21, 22, 27, 28, 0],
  [...range(1, 10), 25, 26, 22, 27, 28, 0],
]

export interface YutState {
  pieces: Piece[][]  // [사람][말]
  turn: number
  pool: Throw[]      // 던져 놓고 아직 안 쓴 윷
  throws: number     // 더 던질 횟수
  backdo: boolean
  winner: number | null
}

export interface Move { piece: number; throwIdx: number; to: Piece }

export interface MoveEvent {
  player: number
  moved: number                // 함께 옮긴 말 수(업기 포함, 도착해서 업은 말 제외)
  from: number | null          // 자리 번호, 대기 말이면 null
  to: number | null            // 자리 번호, 났으면 null
  finished: number             // 이번에 난 말 수
  captured: { player: number; count: number }[]
  stacked: number              // 도착 자리에서 업은 내 말 수
  shortcut: boolean            // 모·뒷모·방에 멈춰 다음부터 지름길
}

export const isOnBoard = (p: Piece) => p.idx !== HOME && p.idx !== DONE
export const stationOf = (p: Piece): number | null => (isOnBoard(p) ? ROUTES[p.route][p.idx] : null)

// 모·뒷모·방에 멈추면 지름길로 갈아탄다. 갈아타는 길은 그 자리까지 같은 칸을 지나므로 idx 는 그대로.
function settleRoute(route: Route, idx: number): Route {
  const s = ROUTES[route][idx]
  if (route === 0 && s === 5) return 1
  if (route === 0 && s === 10) return 3
  if (route === 1 && s === 22) return 2
  return route
}

/** 말 하나가 윷 t 로 가는 곳. 못 가면 null. */
export function dest(p: Piece, t: Throw): Piece | null {
  if (p.idx === DONE) return null
  if (t === -1) {
    if (p.idx === HOME) return null
    if (p.idx === 0) return { route: 0, idx: ROUTES[0].length - 1 } // 도에서 빽도 → 참먹이
    return { route: settleRoute(p.route, p.idx - 1), idx: p.idx - 1 }
  }
  const idx = p.idx + t // 대기(-1)도 같은 식: 도면 idx 0(1번 자리)
  if (idx >= ROUTES[p.route].length) return { route: p.route, idx: DONE }
  return { route: settleRoute(p.route, idx), idx }
}

export function newGame(players: number, perPlayer: number, backdo = true): YutState {
  return {
    pieces: Array.from({ length: players }, () => Array.from({ length: perPlayer }, () => ({ route: 0 as Route, idx: HOME }))),
    turn: 0, pool: [], throws: 1, backdo, winner: null,
  }
}

/** 배(평평한 면)가 위인 가락 → 윷 결과. flat[0] 이 빽도 표시 가락. */
export function sticksResult(flat: readonly boolean[], backdo: boolean): Throw {
  const n = flat.filter(Boolean).length
  if (n === 0) return 5
  if (n === 1 && backdo && flat[0]) return -1
  return n as Throw
}

export function throwSticks(backdo: boolean, rng: () => number = Math.random) {
  const flat = [0, 1, 2, 3].map(() => rng() < 0.5)
  return { flat, value: sticksResult(flat, backdo) }
}

/** 가락 16가지 경우를 세어 낸 확률 */
export function throwProbs(backdo: boolean): Record<Throw, number> {
  const p: Record<Throw, number> = { [-1]: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<Throw, number>
  for (let m = 0; m < 16; m++) p[sticksResult([0, 1, 2, 3].map(i => !!(m & (1 << i))), backdo)] += 1 / 16
  return p
}

/** 지금 둘 수 있는 수. 던질 횟수가 남았으면 없음. 같은 윷·같은 자리(업힌 말, 대기 말)는 하나로. */
export function legalMoves(s: YutState): Move[] {
  if (s.winner !== null || s.throws > 0) return []
  const out: Move[] = []
  const seenThrow = new Set<Throw>()
  s.pool.forEach((t, throwIdx) => {
    if (seenThrow.has(t)) return
    seenThrow.add(t)
    const seenSpot = new Set<number>()
    s.pieces[s.turn].forEach((p, piece) => {
      if (p.idx === DONE) return
      const spot = stationOf(p) ?? -1
      if (seenSpot.has(spot)) return
      seenSpot.add(spot)
      const to = dest(p, t)
      if (to) out.push({ piece, throwIdx, to })
    })
  })
  return out
}

// 던질 것도, 쓸 수 있는 윷도 없으면 다음 사람에게
function settle(s: YutState): YutState {
  if (s.winner !== null || s.throws > 0) return s
  if (s.pool.length > 0 && legalMoves(s).length > 0) return s
  return { ...s, turn: (s.turn + 1) % s.pieces.length, pool: [], throws: 1 }
}

export function applyThrow(s: YutState, t: Throw): YutState {
  if (s.winner !== null || s.throws <= 0) return s
  return settle({ ...s, pool: [...s.pool, t], throws: s.throws - 1 + (t >= 4 ? 1 : 0) })
}

export function applyMove(s: YutState, m: Move): { state: YutState; event: MoveEvent } {
  const pieces = s.pieces.map(row => row.map(p => ({ ...p })))
  const me = s.turn
  const mine = pieces[me]
  const lead = mine[m.piece]
  const from = stationOf(lead)
  const group = from === null ? [m.piece] : mine.flatMap((p, i) => (stationOf(p) === from ? [i] : []))
  const to = m.to
  const toStation = to.idx === DONE ? null : ROUTES[to.route][to.idx]
  const event: MoveEvent = {
    player: me, moved: group.length, from, to: toStation, finished: to.idx === DONE ? group.length : 0,
    captured: [], stacked: 0, shortcut: toStation !== null && to.route !== lead.route,
  }
  if (toStation !== null) {
    mine.forEach((p, i) => {
      if (!group.includes(i) && stationOf(p) === toStation) { Object.assign(p, to); event.stacked++ }
    })
    pieces.forEach((row, pl) => {
      if (pl === me) return
      const hit = row.filter(p => stationOf(p) === toStation)
      hit.forEach(p => Object.assign(p, { route: 0, idx: HOME }))
      if (hit.length) event.captured.push({ player: pl, count: hit.length })
    })
  }
  group.forEach(i => Object.assign(mine[i], to))
  const state: YutState = {
    ...s, pieces,
    pool: s.pool.filter((_, i) => i !== m.throwIdx),
    throws: s.throws + (event.captured.length ? 1 : 0),
    winner: mine.every(p => p.idx === DONE) ? me : null,
  }
  return { state: settle(state), event }
}

// ── AI ──────────────────────────────────────────────────────────────────────

/** 나기까지 남은 칸(대기 말은 바깥길 기준 21) */
const remaining = (p: Piece) => (p.idx === DONE ? 0 : ROUTES[p.route].length - p.idx)

/** 다른 사람 말이 다음 한 번(도~모, 빽도)으로 이 자리에 올 수 있나 */
function threatened(s: YutState, station: number, me: number): boolean {
  const throws: Throw[] = s.backdo ? [-1, 1, 2, 3, 4, 5] : [1, 2, 3, 4, 5]
  return s.pieces.some((row, pl) => pl !== me && row.some(p => throws.some(t => {
    const d = dest(p, t)
    return !!d && d.idx !== DONE && ROUTES[d.route][d.idx] === station
  })))
}

function scoreMove(s: YutState, m: Move): number {
  const { state, event } = applyMove(s, m)
  const lead = s.pieces[s.turn][m.piece]
  let sc = event.captured.reduce((a, c) => a + c.count, 0) * 100
  sc += event.finished * 50
  sc += event.stacked * 15
  if (event.shortcut) sc += 20
  sc += (remaining(lead) - remaining(m.to)) * 2 * event.moved
  if (event.to !== null && threatened(state, event.to, s.turn)) sc -= 30 * (event.moved + event.stacked)
  if (event.from !== null && threatened(s, event.from, s.turn)) sc += 20 * event.moved
  return sc
}

export type AILevel = 'easy' | 'normal' | 'hard'

/** 잡기 > 나기 > 지름길·업기 > 안전한 자리 순으로 점수를 매기는 한 수짜리 휴리스틱.
 *  ponytail: 앞을 내다보지 않음(기댓값 탐색은 필요해지면). 쉬움·보통은 가끔 아무 수나 둔다. */
export function aiMove(s: YutState, level: AILevel = 'normal', rng: () => number = Math.random): Move | null {
  const moves = legalMoves(s)
  if (!moves.length) return null
  const noise = level === 'easy' ? 0.5 : level === 'normal' ? 0.15 : 0
  if (rng() < noise) return moves[Math.floor(rng() * moves.length)]
  let best = moves[0]
  let bestScore = -Infinity
  for (const m of moves) {
    const sc = scoreMove(s, m)
    if (sc > bestScore) { best = m; bestScore = sc }
  }
  return best
}
