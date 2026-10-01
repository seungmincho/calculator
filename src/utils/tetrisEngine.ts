// 솔로 테트리스 엔진 (가이드라인 기준): 7-bag, SRS 회전/월킥, 홀드, 고스트, 락 딜레이(0.5s·15회 리셋),
// T-스핀(3코너), 콤보, 백투백, 하드/소프트 드롭 점수, 레벨별 중력 곡선.
// React 무관 순수 로직 — 상태 객체를 직접 변경한다. 회귀 체크: node scripts/check-tetris.ts

export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L'
export type Board = (PieceType | null)[][]
export interface Piece { type: PieceType; x: number; y: number; rot: number }
export type TSpin = 'none' | 'mini' | 'full'
export type GameEvent = 'lock' | 'clear' | 'tetris' | 'tspin' | 'hold' | 'levelup' | 'gameover'

export const COLS = 10
export const HIDDEN = 2 // 보드 위 숨은 스폰 구역
export const ROWS = 20 + HIDDEN
export const LOCK_DELAY = 500
export const MAX_LOCK_RESETS = 15
export const PIECES: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']

// SRS 회전 상태 0, R, 2, L
const SHAPES: Record<PieceType, number[][][]> = {
  I: [
    [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
    [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
    [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]],
  ],
  O: Array(4).fill([[0,1,1,0],[0,1,1,0],[0,0,0,0]]),
  T: [
    [[0,1,0],[1,1,1],[0,0,0]],
    [[0,1,0],[0,1,1],[0,1,0]],
    [[0,0,0],[1,1,1],[0,1,0]],
    [[0,1,0],[1,1,0],[0,1,0]],
  ],
  S: [
    [[0,1,1],[1,1,0],[0,0,0]],
    [[0,1,0],[0,1,1],[0,0,1]],
    [[0,0,0],[0,1,1],[1,1,0]],
    [[1,0,0],[1,1,0],[0,1,0]],
  ],
  Z: [
    [[1,1,0],[0,1,1],[0,0,0]],
    [[0,0,1],[0,1,1],[0,1,0]],
    [[0,0,0],[1,1,0],[0,1,1]],
    [[0,1,0],[1,1,0],[1,0,0]],
  ],
  J: [
    [[1,0,0],[1,1,1],[0,0,0]],
    [[0,1,1],[0,1,0],[0,1,0]],
    [[0,0,0],[1,1,1],[0,0,1]],
    [[0,1,0],[0,1,0],[1,1,0]],
  ],
  L: [
    [[0,0,1],[1,1,1],[0,0,0]],
    [[0,1,0],[0,1,0],[0,1,1]],
    [[0,0,0],[1,1,1],[1,0,0]],
    [[1,1,0],[0,1,0],[0,1,0]],
  ],
}

// SRS 킥 오프셋 (x 오른쪽+, y 위쪽+) — 키: `${from}>${to}`
const KICKS_JLSTZ: Record<string, [number, number][]> = {
  '0>1': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  '1>0': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
  '1>2': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
  '2>1': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  '2>3': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
  '3>2': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  '3>0': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  '0>3': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
}
const KICKS_I: Record<string, [number, number][]> = {
  '0>1': [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
  '1>0': [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
  '1>2': [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
  '2>1': [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
  '2>3': [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
  '3>2': [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
  '3>0': [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
  '0>3': [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
}

/** 피스가 차지하는 칸 [x, y] (보드 좌표) */
export function cells(type: PieceType, rot: number, x = 0, y = 0): [number, number][] {
  const out: [number, number][] = []
  SHAPES[type][((rot % 4) + 4) % 4].forEach((row, r) => row.forEach((v, c) => { if (v) out.push([x + c, y + r]) }))
  return out
}

/** 미리보기용: 0번 상태의 칸을 (0,0) 기준으로 당긴 것 + 크기 */
export function previewCells(type: PieceType): { cells: [number, number][]; w: number; h: number } {
  const cs = cells(type, 0)
  const minX = Math.min(...cs.map(c => c[0])), minY = Math.min(...cs.map(c => c[1]))
  const moved = cs.map(([x, y]) => [x - minX, y - minY] as [number, number])
  return { cells: moved, w: Math.max(...moved.map(c => c[0])) + 1, h: Math.max(...moved.map(c => c[1])) + 1 }
}

export const emptyBoard = (): Board => Array.from({ length: ROWS }, () => Array(COLS).fill(null))

export function collides(board: Board, type: PieceType, x: number, y: number, rot: number): boolean {
  return cells(type, rot, x, y).some(([cx, cy]) => cx < 0 || cx >= COLS || cy < 0 || cy >= ROWS || board[cy][cx] !== null)
}

export function createBag(rng: () => number = Math.random): PieceType[] {
  const bag = [...PIECES]
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]]
  }
  return bag
}

/** SRS 회전. 성공 시 새 피스와 사용한 킥 번호(0~4) */
export function tryRotate(board: Board, p: Piece, dir: 1 | -1): { piece: Piece; kick: number } | null {
  const to = (p.rot + dir + 4) % 4
  if (p.type === 'O') return { piece: { ...p, rot: to }, kick: 0 }
  const kicks = (p.type === 'I' ? KICKS_I : KICKS_JLSTZ)[`${p.rot}>${to}`]
  for (let k = 0; k < kicks.length; k++) {
    const nx = p.x + kicks[k][0], ny = p.y - kicks[k][1] // 화면 y는 아래가 +
    if (!collides(board, p.type, nx, ny, to)) return { piece: { ...p, x: nx, y: ny, rot: to }, kick: k }
  }
  return null
}

export function dropDistance(board: Board, p: Piece): number {
  let d = 0
  while (!collides(board, p.type, p.x, p.y + d + 1, p.rot)) d++
  return d
}

export function clearFullRows(board: Board): { board: Board; cleared: number } {
  const kept = board.filter(row => row.some(c => c === null))
  const cleared = ROWS - kept.length
  return { board: [...Array.from({ length: cleared }, () => Array(COLS).fill(null)), ...kept], cleared }
}

/** 3-코너 T-스핀 판정. 마지막 동작이 회전이어야 함(lastKick >= 0). 앞 코너 2개 or 5번째 킥 → 정식, 아니면 미니 */
export function detectTSpin(board: Board, p: Piece, lastKick: number): TSpin {
  if (p.type !== 'T' || lastKick < 0) return 'none'
  const filled = ([cx, cy]: [number, number]) => cx < 0 || cx >= COLS || cy >= ROWS || (cy >= 0 && board[cy][cx] !== null)
  const corner: [number, number][] = [[p.x, p.y], [p.x + 2, p.y], [p.x + 2, p.y + 2], [p.x, p.y + 2]] // 좌상·우상·우하·좌하
  const n = corner.filter(filled).length
  if (n < 3) return 'none'
  const front = [[0, 1], [1, 2], [2, 3], [3, 0]][p.rot] // 꼭지가 가리키는 쪽 코너
  return (front.every(i => filled(corner[i])) || lastKick === 4) ? 'full' : 'mini'
}

const LINE_PTS = [0, 100, 300, 500, 800]
const TSPIN_PTS = [400, 800, 1200, 1600]
const MINI_PTS = [100, 200, 400, 400]

/** 줄 클리어 점수 (가이드라인). combo: 이번 클리어까지 포함한 연속 횟수-1 (첫 클리어=0) */
export function scoreClear(lines: number, tspin: TSpin, level: number, b2bBefore: boolean, combo: number) {
  const base = tspin === 'full' ? TSPIN_PTS[lines] : tspin === 'mini' ? MINI_PTS[lines] : LINE_PTS[lines]
  const difficult = lines === 4 || (tspin !== 'none' && lines > 0)
  const b2b = difficult && b2bBefore
  let pts = (b2b ? Math.floor(base * 1.5) : base) * level
  if (lines > 0 && combo > 0) pts += 50 * combo * level
  return { points: pts, difficult, b2b }
}

/** 레벨별 한 칸 낙하 시간(ms): 가이드라인 (0.8-(L-1)*0.007)^(L-1)초, 20레벨에서 고정 */
export function gravityMs(level: number): number {
  const l = Math.min(Math.max(level, 1), 20)
  return Math.pow(0.8 - (l - 1) * 0.007, l - 1) * 1000
}

export const levelFor = (lines: number) => Math.floor(lines / 10) + 1

// ── 게임 상태 ────────────────────────────────────────────────────────────
export interface ClearInfo { lines: number; tspin: TSpin; b2b: boolean; combo: number; points: number }
export interface Game {
  board: Board
  piece: Piece | null
  hold: PieceType | null
  canHold: boolean
  queue: PieceType[]
  rng: () => number
  score: number
  lines: number
  level: number
  combo: number // -1 = 콤보 없음
  b2b: boolean
  over: boolean
  gravityAcc: number
  lockMs: number
  lockResets: number
  lowestY: number
  lastKick: number // 마지막 성공 동작이 회전이면 킥 번호, 아니면 -1
  stats: { pieces: number; tetrises: number; tspins: number; maxCombo: number }
  lastClear: ClearInfo | null
  events: GameEvent[]
}

function refill(g: Game) { while (g.queue.length < 7) g.queue.push(...createBag(g.rng)) }

function spawn(g: Game, type: PieceType) {
  const p: Piece = { type, x: 3, y: 0, rot: 0 }
  g.gravityAcc = 0; g.lockMs = 0; g.lockResets = 0; g.lastKick = -1
  if (collides(g.board, type, p.x, p.y, 0)) { g.piece = null; endGame(g); return }
  if (!collides(g.board, type, p.x, p.y + 1, 0)) p.y++ // 가이드라인: 스폰 즉시 한 칸 낙하
  g.piece = p
  g.lowestY = p.y
}

function endGame(g: Game) { g.over = true; g.events.push('gameover') }

export function newGame(rng: () => number = Math.random): Game {
  const g: Game = {
    board: emptyBoard(), piece: null, hold: null, canHold: true, queue: [], rng,
    score: 0, lines: 0, level: 1, combo: -1, b2b: false, over: false,
    gravityAcc: 0, lockMs: 0, lockResets: 0, lowestY: 0, lastKick: -1,
    stats: { pieces: 0, tetrises: 0, tspins: 0, maxCombo: 0 }, lastClear: null, events: [],
  }
  refill(g)
  spawn(g, g.queue.shift()!)
  return g
}

export const onGround = (g: Game) => !!g.piece && collides(g.board, g.piece.type, g.piece.x, g.piece.y + 1, g.piece.rot)

/** 땅에 닿은 상태에서 이동/회전 성공 시 락 타이머 리셋 (최대 15회) */
function afterManeuver(g: Game) {
  if ((g.lockMs > 0 || onGround(g)) && g.lockResets < MAX_LOCK_RESETS) { g.lockMs = 0; g.lockResets++ }
}

function descend(g: Game): boolean {
  const p = g.piece!
  if (collides(g.board, p.type, p.x, p.y + 1, p.rot)) return false
  p.y++
  g.lastKick = -1
  if (p.y > g.lowestY) { g.lowestY = p.y; g.lockMs = 0; g.lockResets = 0 }
  return true
}

export function move(g: Game, dx: number): boolean {
  const p = g.piece
  if (!p || g.over || collides(g.board, p.type, p.x + dx, p.y, p.rot)) return false
  p.x += dx
  g.lastKick = -1
  afterManeuver(g)
  return true
}

export function rotate(g: Game, dir: 1 | -1): boolean {
  if (!g.piece || g.over) return false
  const r = tryRotate(g.board, g.piece, dir)
  if (!r) return false
  g.piece = r.piece
  g.lastKick = r.kick
  if (g.piece.y > g.lowestY) { g.lowestY = g.piece.y; g.lockMs = 0; g.lockResets = 0 }
  else afterManeuver(g)
  return true
}

export function hardDrop(g: Game) {
  if (!g.piece || g.over) return
  const d = dropDistance(g.board, g.piece)
  if (d > 0) { g.piece.y += d; g.lastKick = -1 }
  g.score += d * 2
  lock(g)
}

export function holdPiece(g: Game): boolean {
  if (!g.piece || g.over || !g.canHold) return false
  const cur = g.piece.type
  const next = g.hold ?? g.queue.shift()!
  g.hold = cur
  g.canHold = false
  refill(g)
  spawn(g, next)
  g.events.push('hold')
  return true
}

function lock(g: Game) {
  const p = g.piece!
  const tspin = detectTSpin(g.board, p, g.lastKick)
  const pc = cells(p.type, p.rot, p.x, p.y)
  for (const [x, y] of pc) g.board[y][x] = p.type
  g.piece = null
  g.stats.pieces++
  g.events.push('lock')

  const { board, cleared } = clearFullRows(g.board)
  g.board = board
  g.combo = cleared > 0 ? g.combo + 1 : -1
  const s = scoreClear(cleared, tspin, g.level, g.b2b, g.combo)
  g.score += s.points
  if (cleared > 0) g.b2b = s.difficult
  if (cleared === 4) g.stats.tetrises++
  if (tspin !== 'none') g.stats.tspins++
  g.stats.maxCombo = Math.max(g.stats.maxCombo, g.combo)
  g.lastClear = cleared > 0 || tspin !== 'none' ? { lines: cleared, tspin, b2b: s.b2b, combo: g.combo, points: s.points } : null
  if (cleared > 0) g.events.push(cleared === 4 ? 'tetris' : tspin !== 'none' ? 'tspin' : 'clear')

  const prevLevel = g.level
  g.lines += cleared
  g.level = levelFor(g.lines)
  if (g.level > prevLevel) g.events.push('levelup')

  if (pc.every(([, y]) => y < HIDDEN)) { endGame(g); return } // 락 아웃: 전부 화면 밖에서 굳음
  g.canHold = true
  refill(g)
  spawn(g, g.queue.shift()!)
}

/** 프레임 진행: 중력(소프트 드롭이면 20배, 칸당 1점) + 락 딜레이 */
export function step(g: Game, dt: number, soft: boolean) {
  if (!g.piece || g.over) return
  const grav = gravityMs(g.level)
  const interval = soft ? Math.min(grav / 20, 50) : grav
  if (!onGround(g)) {
    g.gravityAcc += dt
    while (g.gravityAcc >= interval && descend(g)) {
      g.gravityAcc -= interval
      if (soft) g.score += 1
    }
  }
  if (onGround(g)) {
    g.gravityAcc = 0
    g.lockMs += dt
    if (g.lockMs >= LOCK_DELAY) lock(g)
  }
}

/** 소프트 드롭 즉시 한 칸 (버튼/스와이프용) */
export function softDropOne(g: Game): boolean {
  if (!g.piece || g.over || !descend(g)) return false
  g.score += 1
  return true
}
