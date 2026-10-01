// 테트리스 엔진 회귀 체크: node scripts/check-tetris.ts
import {
  COLS, ROWS, LOCK_DELAY, createBag, tryRotate, emptyBoard, clearFullRows, detectTSpin, scoreClear,
  gravityMs, levelFor, newGame, move, rotate, hardDrop, holdPiece, step, cells, dropDistance, type Board, type PieceType,
} from '../src/utils/tetrisEngine.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) }
}
// 결정적 RNG
const seeded = (s: number) => () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648)
// 아래부터 그림 문자열로 보드 채우기 ('#' 채움, '.' 빈칸)
const boardFrom = (rows: string[]): Board => {
  const b = emptyBoard()
  rows.forEach((r, i) => [...r].forEach((ch, x) => { if (ch === '#') b[ROWS - rows.length + i][x] = 'J' }))
  return b
}

// 7-bag: 매 7개마다 7종 모두
const rng = seeded(42)
for (let i = 0; i < 5; i++) eq([...createBag(rng)].sort(), ['I', 'J', 'L', 'O', 'S', 'T', 'Z'], `bag ${i}`)
const g0 = newGame(seeded(7))
const seq: PieceType[] = [g0.piece!.type]
for (let i = 0; i < 13; i++) { seq.push(g0.queue[0]); g0.queue.shift(); if (g0.queue.length < 7) g0.queue.push(...createBag(g0.rng)) }
eq([...seq.slice(0, 7)].sort(), ['I', 'J', 'L', 'O', 'S', 'T', 'Z'], 'first 7 = one bag')
eq([...seq.slice(7, 14)].sort(), ['I', 'J', 'L', 'O', 'S', 'T', 'Z'], 'second 7 = one bag')

// 스폰: 가운데(왼쪽 치우침) x=3, 한 칸 내려와 맨 윗줄(y=2)에 보임
const gs = newGame(seeded(1))
eq(gs.piece!.x, 3, 'spawn x')
eq(Math.max(...cells(gs.piece!.type, 0, gs.piece!.x, gs.piece!.y).map(c => c[1])) >= 2, true, 'spawn visible')

// SRS: 벽에 붙은 세로 I → 가로 회전은 킥으로 성공 (L 상태 칸 = x+1, R 상태 칸 = x+2)
const b = emptyBoard()
eq(tryRotate(b, { type: 'I', x: -1, y: 10, rot: 3 }, 1)?.piece.x, 0, 'I L>0 left wall kick (+1)')
eq(tryRotate(b, { type: 'I', x: 7, y: 10, rot: 1 }, -1)?.piece.x, 6, 'I R>0 right wall kick (-1)') // R 상태 칸 x=9
eq(tryRotate(b, { type: 'T', x: 4, y: 10, rot: 0 }, 1)?.kick, 0, 'T free rotation kick 0')
eq(tryRotate(b, { type: 'T', x: 8, y: 10, rot: 3 }, 1)?.piece.x, 7, 'T L>0 right wall kick')
eq(tryRotate(b, { type: 'O', x: 3, y: 10, rot: 0 }, 1)?.piece.x, 3, 'O rotates in place')

// TST/TSD 슬롯: T-스핀 더블 판정 (킥 0)
const tsd = boardFrom([
  '##.......#',
  '#...######',
  '##.#######',
])
// T 아래 방향(rot 2), 중심 (2, ROWS-2)
const tp = { type: 'T' as const, x: 1, y: ROWS - 3, rot: 2 }
eq(cells('T', 2, tp.x, tp.y).every(([x, y]) => tsd[y][x] === null), true, 'tsd slot fits')
eq(detectTSpin(tsd, tp, 0), 'full', 'TSD detected')
eq(detectTSpin(tsd, tp, -1), 'none', 'no rotation → no tspin')
eq(detectTSpin(emptyBoard(), { type: 'T', x: 4, y: 10, rot: 2 }, 0), 'none', 'open air no tspin')
// 미니: 바닥에 납작(rot 0, 꼭지 위), 아래 코너 2개 + 위 한쪽만
const mini = boardFrom(['#.........', '..........'])
eq(detectTSpin(mini, { type: 'T', x: 0, y: ROWS - 2, rot: 0 }, 1), 'mini', 'mini tspin')
eq(detectTSpin(mini, { type: 'T', x: 0, y: ROWS - 2, rot: 0 }, 4), 'full', '5th kick upgrades mini')

// 줄 지우기
const full = boardFrom(['##########', '#########.', '##########'])
const cl = clearFullRows(full)
eq(cl.cleared, 2, 'clear 2 rows')
eq(cl.board[ROWS - 1].filter(Boolean).length, 9, 'remaining row drops to bottom')
eq(cl.board.length, ROWS, 'board height kept')

// 점수
eq(scoreClear(1, 'none', 1, false, 0).points, 100, 'single')
eq(scoreClear(4, 'none', 2, false, 0).points, 1600, 'tetris lv2')
eq(scoreClear(4, 'none', 1, true, 0).points, 1200, 'b2b tetris ×1.5')
eq(scoreClear(2, 'full', 1, false, 0).points, 1200, 'tsd')
eq(scoreClear(2, 'full', 1, true, 0).points, 1800, 'b2b tsd')
eq(scoreClear(1, 'none', 1, true, 0).b2b, false, 'single never b2b')
eq(scoreClear(1, 'none', 3, false, 2).points, 300 + 300, 'combo 2 at lv3: 100*3 + 50*2*3')
eq(scoreClear(0, 'full', 1, false, -1).points, 400, 'tspin no lines')
eq(scoreClear(0, 'none', 5, false, -1).points, 0, 'no clear')

// 레벨·중력 곡선
eq(levelFor(0), 1, 'level 1'); eq(levelFor(9), 1, 'level 1 at 9'); eq(levelFor(10), 2, 'level 2'); eq(levelFor(35), 4, 'level 4')
eq(Math.round(gravityMs(1)), 1000, 'gravity lv1')
eq(Math.round(gravityMs(2)), 793, 'gravity lv2')
eq(Math.round(gravityMs(10)), 64, 'gravity lv10')
eq(gravityMs(30) === gravityMs(20), true, 'gravity capped at 20')

// 락 딜레이: 땅에 닿아도 0.5초 전엔 안 굳음, 이동하면 리셋, 15회 후엔 리셋 안 됨
const gl = newGame(seeded(3))
gl.piece!.y += dropDistance(gl.board, gl.piece!)
step(gl, LOCK_DELAY - 10, false)
eq(gl.stats.pieces, 0, 'not locked before delay')
move(gl, 1) || move(gl, -1)
step(gl, LOCK_DELAY - 10, false)
eq(gl.stats.pieces, 0, 'move resets lock timer')
for (let i = 0; i < 30; i++) { if (!move(gl, i % 2 ? 1 : -1)) move(gl, i % 2 ? -1 : 1); step(gl, 40, false) }
eq(gl.stats.pieces, 1, 'locks after 15 resets')

// 하드 드롭: 칸당 2점 + 즉시 락
const gh = newGame(seeded(5))
const d = dropDistance(gh.board, gh.piece!)
hardDrop(gh)
eq([gh.score, gh.stats.pieces], [d * 2, 1], 'hard drop score + lock')

// 홀드: 한 번만, 락 후 다시 가능
const gH = newGame(seeded(9))
const t1 = gH.piece!.type
eq(holdPiece(gH), true, 'hold ok'); eq(gH.hold, t1, 'held type')
eq(holdPiece(gH), false, 'hold blocked until lock')
hardDrop(gH)
eq(holdPiece(gH), true, 'hold after lock')

// 테트리스 실제 플레이: 왼쪽 9칸 4줄 채우고 I를 오른쪽 끝 세로로 하드 드롭
const gt = newGame(seeded(11))
for (let y = ROWS - 4; y < ROWS; y++) for (let x = 0; x < COLS - 1; x++) gt.board[y][x] = 'L'
gt.piece = { type: 'I', x: 3, y: 1, rot: 0 }
rotate(gt, 1) // R 상태: 칸 x = piece.x + 2
while (move(gt, 1)) { /* 오른쪽 끝까지 */ }
hardDrop(gt)
eq([gt.lines, gt.stats.tetrises, gt.board[ROWS - 1].every(c => c === null)], [4, 1, true], 'tetris clears 4 rows')
eq(gt.events.includes('tetris'), true, 'tetris event')

// 게임 오버: 숨은 구역(위 2줄)에서만 굳으면 락 아웃
const go = newGame(seeded(13))
for (let y = 2; y < ROWS; y++) for (let x = 1; x < COLS; x++) go.board[y][x] = 'Z'
go.piece = { type: 'O', x: 3, y: 0, rot: 0 }
hardDrop(go)
eq(go.over, true, 'lock out → game over')
eq(go.events.includes('gameover'), true, 'gameover event')

if (fail) { console.log(`${fail} failed`); process.exit(1) }
console.log('check-tetris: all passed')
