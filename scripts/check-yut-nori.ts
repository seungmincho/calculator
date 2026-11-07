// 윷놀이 규칙 회귀 체크: node scripts/check-yut-nori.ts
import assert from 'node:assert/strict'
import {
  ROUTES, HOME, DONE, STATION_COUNT, dest, stationOf, newGame, applyThrow, applyMove, legalMoves,
  sticksResult, throwSticks, throwProbs, aiMove, type Piece, type Throw, type YutState,
} from '../src/utils/gameAI/yutNori.ts'

const home: Piece = { route: 0, idx: HOME }
const at = (p: Piece | null) => (p ? (p.idx === DONE ? 'done' : stationOf(p)) : null)
const walk = (p: Piece, ...ts: Throw[]) => ts.reduce<Piece>((q, t) => dest(q, t)!, p)
/** 판을 직접 꾸민다: pos[사람][말] = 자리(route, idx) 또는 HOME/DONE */
const board = (pieces: Piece[][], pool: Throw[], extra: Partial<YutState> = {}): YutState =>
  ({ pieces, turn: 0, pool, throws: 0, backdo: true, winner: null, ...extra })
const onRoute = (route: 0 | 1 | 2 | 3, station: number): Piece => ({ route, idx: ROUTES[route].indexOf(station) })

// 말판: 29자리 모두 쓰이고, 바깥 20 + 대각선 9
assert.equal(new Set(ROUTES.flat()).size, STATION_COUNT)
assert.deepEqual([...new Set(ROUTES.flat())].sort((a, b) => a - b), Array.from({ length: 29 }, (_, i) => i))

// 바깥길: 도~모, 모를 지나치면 바깥으로
assert.equal(at(dest(home, 1)), 1)
assert.equal(at(dest(home, 4)), 4)
assert.equal(at(walk(home, 4, 2)), 6, '모를 지나치면 뒷도')
assert.equal(walk(home, 4, 2).route, 0)

// 지름길: 모에 멈추면 대각선, 방을 지나치면 찌모 쪽
const mo = dest(home, 5)!
assert.equal(at(mo), 5); assert.equal(mo.route, 1, '모에 멈추면 대각선')
assert.equal(at(walk(home, 3, 2)), 5); assert.equal(walk(home, 3, 2).route, 1, '나눠서 모에 멈춰도 대각선')
assert.equal(at(dest(mo, 1)), 20)
assert.equal(at(dest(mo, 4)), 23, '모에서 윷: 방을 지나 찌모 쪽')
assert.equal(at(walk(mo, 4, 2)), 15)
assert.equal(at(walk(mo, 4, 3)), 16, '찌모를 지나 바깥길로')
// 방에 멈추면 참먹이 쪽
const bang = dest(mo, 3)!
assert.equal(at(bang), 22); assert.equal(bang.route, 2)
assert.equal(at(dest(bang, 1)), 27)
assert.equal(at(dest(bang, 3)), 0, '방에서 걸이면 참먹이에 멈춤(아직 안 남)')
assert.equal(at(dest(bang, 4)), 'done', '방에서 윷이면 참먹이를 지나 남')
// 뒷모에 멈추면 대각선 → 방 → 참먹이
assert.equal(at(walk(home, 5, 5)), 24, '모·모: 모에서 대각선으로 방을 지나 찌모 쪽')
assert.equal(at(walk(home, 4, 2, 4)), 10)
assert.equal(walk(home, 4, 2, 4).route, 3, '뒷모에 멈추면 대각선')
const dwimoStop = walk(home, 4, 2, 4)
assert.equal(at(dest(dwimoStop, 3)), 22)
assert.equal(at(dest(dwimoStop, 4)), 27, '뒷모 대각선은 방을 지나 참먹이 쪽')
// 가장 빠른 길 12칸(모 5 + 방 3 + 4), 바깥만 21칸
assert.equal(at(walk(home, 5, 3, 4)), 'done')
assert.equal(at(walk(home, 5, 3, 3)), 0)
assert.equal(at(walk(home, 4, 4, 4, 4, 4)), 0, '바깥 20칸이면 참먹이')
assert.equal(at(walk(home, 4, 4, 4, 4, 4, 1)), 'done')

// 나기: 참먹이를 지나야 남
const nalyut = onRoute(0, 19)
assert.equal(at(dest(nalyut, 1)), 0)
assert.equal(at(dest(nalyut, 2)), 'done')

// 빽도
assert.equal(dest(home, -1), null, '대기 말은 빽도로 못 움직임')
assert.equal(at(dest(onRoute(0, 1), -1)), 0, '도에서 빽도 → 참먹이')
assert.equal(at(walk(onRoute(0, 1), -1, 1)), 'done', '빽도로 간 참먹이에서는 도로도 남')
const back5 = dest(onRoute(0, 6), -1)!
assert.equal(at(back5), 5); assert.equal(back5.route, 1, '빽도로 모에 와도 지름길')
assert.equal(at(dest(onRoute(1, 20), -1)), 5)
const back22 = dest(onRoute(1, 23), -1)!
assert.equal(at(back22), 22); assert.equal(back22.route, 2, '빽도로 방에 와도 참먹이 쪽')
assert.equal(at(dest(onRoute(3, 25), -1)), 10)
assert.equal(at(dest(onRoute(2, 27), -1)), 22)
assert.equal(at(dest(onRoute(1, 16), -1)), 15)

// 던지기 흐름: 윷·모는 한 번 더, 던질 게 남으면 못 옮김
let s = newGame(2, 4)
s = applyThrow(s, 4)
assert.equal(s.throws, 1); assert.equal(legalMoves(s).length, 0, '윷이면 먼저 한 번 더 던짐')
s = applyThrow(s, 5)
assert.equal(s.throws, 1)
s = applyThrow(s, 1)
assert.equal(s.throws, 0); assert.deepEqual(s.pool, [4, 5, 1]); assert.equal(s.turn, 0)
// 모인 윷(윷·모·도)은 아무 순서로: 대기 말 하나에 세 가지 윷 모두 가능
assert.deepEqual(legalMoves(s).map(m => m.throwIdx).sort(), [0, 1, 2])
let r = applyMove(s, legalMoves(s).find(m => m.throwIdx === 2)!) // 도 먼저
assert.deepEqual(r.state.pool, [4, 5]); assert.equal(r.state.turn, 0)
r = applyMove(r.state, legalMoves(r.state).find(m => m.piece === 0 && r.state.pool[m.throwIdx] === 5)!) // 같은 말에 모
assert.equal(stationOf(r.state.pieces[0][0]), 6)
r = applyMove(r.state, legalMoves(r.state).find(m => m.piece === 1)!) // 다른 말에 윷
assert.equal(stationOf(r.state.pieces[0][1]), 4)
assert.equal(r.state.turn, 1, '윷을 다 쓰면 다음 사람'); assert.equal(r.state.throws, 1)

// 빽도인데 판에 말이 없으면 버리고 차례 넘김
s = applyThrow(newGame(2, 4), -1)
assert.equal(s.turn, 1); assert.deepEqual(s.pool, [])
// 윷 + 빽도: 윷으로 말을 올린 뒤엔 빽도를 쓸 수 있음
s = applyThrow(applyThrow(newGame(2, 4), 4), -1)
assert.equal(s.turn, 0); assert.equal(legalMoves(s).filter(m => s.pool[m.throwIdx] === -1).length, 0)
r = applyMove(s, legalMoves(s)[0])
assert.equal(r.state.turn, 0); assert.equal(stationOf(legalMoves(r.state)[0].to), 3)

// 업기: 같은 자리 내 말은 함께 움직이고, 내 말 위에 멈추면 업음
s = board([[onRoute(0, 3), onRoute(0, 3), home, home], [home, home, home, home]], [2])
assert.equal(legalMoves(s).length, 2, '업힌 두 말은 수 하나, 대기 말 하나')
r = applyMove(s, legalMoves(s).find(m => m.piece === 0)!)
assert.equal(r.event.moved, 2)
assert.deepEqual(r.state.pieces[0].slice(0, 2).map(stationOf), [5, 5])
s = board([[onRoute(0, 2), onRoute(0, 4), home, home], [home, home, home, home]], [2])
r = applyMove(s, legalMoves(s).find(m => m.piece === 0)!)
assert.equal(r.event.stacked, 1); assert.deepEqual(r.state.pieces[0].slice(0, 2).map(stationOf), [4, 4])

// 잡기: 상대 말(업힌 것 모두) 대기로, 한 번 더 던짐
s = board([[onRoute(0, 2), home], [onRoute(0, 5), onRoute(1, 5)]], [3, 1])
r = applyMove(s, legalMoves(s).find(m => m.piece === 0 && m.throwIdx === 0)!)
assert.deepEqual(r.event.captured, [{ player: 1, count: 2 }])
assert.ok(r.state.pieces[1].every(p => p.idx === HOME))
assert.equal(r.state.throws, 1, '잡으면 한 번 더'); assert.equal(r.state.turn, 0)
assert.deepEqual(r.state.pool, [1], '남은 윷은 그대로, 먼저 던져야 씀')
assert.equal(legalMoves(r.state).length, 0)
// 지나가는 자리는 안 잡음
s = board([[onRoute(0, 2), home], [onRoute(0, 4), home]], [3])
r = applyMove(s, legalMoves(s).find(m => m.piece === 0)!)
assert.equal(r.event.captured.length, 0); assert.equal(stationOf(r.state.pieces[1][0]), 4)
// 빽도로도 잡음
s = board([[onRoute(0, 5), home], [onRoute(0, 4), home]], [-1])
r = applyMove(s, legalMoves(s).find(m => m.piece === 0)!)
assert.equal(r.event.captured.length, 1)

// 나기와 승리
s = board([[onRoute(0, 19), { route: 0, idx: DONE }], [home, home]], [2])
r = applyMove(s, legalMoves(s)[0])
assert.equal(r.event.finished, 1); assert.equal(r.event.to, null); assert.equal(r.state.winner, 0)
assert.equal(applyThrow(r.state, 1), r.state, '끝난 판은 그대로')

// 확률: 가락 4개 각 1/2
for (const backdo of [true, false]) {
  const p = throwProbs(backdo)
  assert.ok(Math.abs(Object.values(p).reduce((a, b) => a + b, 0) - 1) < 1e-12, '확률 합 1')
  assert.equal(p[2], 6 / 16); assert.equal(p[3], 4 / 16); assert.equal(p[4], 1 / 16); assert.equal(p[5], 1 / 16)
  assert.equal(p[1], backdo ? 3 / 16 : 4 / 16); assert.equal(p[-1], backdo ? 1 / 16 : 0)
}
assert.equal(sticksResult([true, false, false, false], true), -1)
assert.equal(sticksResult([false, true, false, false], true), 1)
assert.equal(sticksResult([true, false, false, false], false), 1)
assert.equal(sticksResult([false, false, false, false], true), 5)
assert.equal(sticksResult([true, true, true, true], true), 4)
assert.deepEqual(throwSticks(true, () => 0.9), { flat: [false, false, false, false], value: 5 })
// 표본 확인(고정 시드): 10만 번 던져 개 비율 ≈ 0.375
let seed = 1
const lcg = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31
let gae = 0
for (let i = 0; i < 100_000; i++) if (throwSticks(true, lcg).value === 2) gae++
assert.ok(Math.abs(gae / 100_000 - 0.375) < 0.01, `개 비율 ${gae / 100_000}`)

// AI: 잡을 수 있으면 잡음, 안 되면 지름길·나기를 고름
s = board([[onRoute(0, 1), onRoute(0, 9)], [onRoute(0, 3), home]], [2])
assert.equal(aiMove(s, 'hard')!.piece, 0, '잡기 우선')
s = board([[onRoute(0, 2), onRoute(0, 12)], [onRoute(0, 18), { route: 0, idx: DONE }]], [3])
assert.equal(stationOf(aiMove(s, 'hard')!.to), 5, '모에 멈춰 지름길')
s = board([[onRoute(0, 18), onRoute(0, 3)], [home, home]], [3])
assert.equal(aiMove(s, 'hard')!.to.idx, DONE, '나기 우선')
assert.equal(aiMove(board([[home], [home]], []), 'hard'), null)
// AI 끼리 끝까지(무한 루프·잘못된 상태 없이 승자가 나옴)
for (let g = 0; g < 50; g++) {
  let st = newGame(2 + (g % 3), g % 2 ? 2 : 4, g % 4 !== 0)
  let steps = 0
  while (st.winner === null && steps++ < 5000) {
    if (st.throws > 0) st = applyThrow(st, throwSticks(st.backdo, lcg).value)
    else st = applyMove(st, aiMove(st, 'normal', lcg)!).state
  }
  assert.notEqual(st.winner, null, `게임 ${g} 끝남`)
  assert.ok(st.pieces[st.winner!].every(p => p.idx === DONE))
}

console.log('yut-nori: all checks passed')
