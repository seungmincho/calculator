// 캔버스 보드 키보드 커서 회귀 체크: node scripts/check-board-keyboard.ts
import { moveCursor } from '../src/hooks/useBoardKeyboard.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) }
}

// 8x8: 가장자리에서 멈춤, 방향키 아닌 키는 null
eq(moveCursor({ row: 0, col: 0 }, 'ArrowUp', 8, 8), { row: 0, col: 0 }, '위쪽 끝')
eq(moveCursor({ row: 7, col: 7 }, 'ArrowRight', 8, 8), { row: 7, col: 7 }, '오른쪽 끝')
eq(moveCursor({ row: 3, col: 3 }, 'ArrowDown', 8, 8), { row: 4, col: 3 }, '아래로 한 칸')
eq(moveCursor({ row: 3, col: 3 }, 'Enter', 8, 8), null, 'Enter 는 이동 아님')
eq(moveCursor({ row: 0, col: 2 }, 'ArrowLeft', 1, 6), { row: 0, col: 1 }, '만칼라 1x6')

// 도트앤박스 9x9 격자: 점(짝·짝)은 건너뛰고, 시작(0,1)에서 선 40개·박스 16개에 모두 닿아야 한다
const isDot = (r: number, c: number) => r % 2 === 0 && c % 2 === 0
eq(moveCursor({ row: 0, col: 1 }, 'ArrowRight', 9, 9, isDot), { row: 0, col: 3 }, '점 건너뛰기')
eq(moveCursor({ row: 0, col: 1 }, 'ArrowLeft', 9, 9, isDot), { row: 0, col: 1 }, '점 너머가 보드 밖이면 제자리')
const seen = new Set<string>(['0,1'])
const queue = [{ row: 0, col: 1 }]
while (queue.length) {
  const c = queue.shift()!
  for (const k of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) {
    const n = moveCursor(c, k, 9, 9, isDot)!
    const id = `${n.row},${n.col}`
    if (!seen.has(id)) { seen.add(id); queue.push(n) }
  }
}
const cells = [...seen].map(s => s.split(',').map(Number))
eq(cells.filter(([r, c]) => isDot(r, c)).length, 0, '점에 멈추지 않음')
eq(cells.filter(([r, c]) => (r + c) % 2 === 1).length, 40, '선 40개 모두 도달')
eq(cells.filter(([r, c]) => r % 2 === 1 && c % 2 === 1).length, 16, '박스 16개 모두 도달')

// 오목 19x19·오델로 8x8: 가장자리에서 멈춤
eq(moveCursor({ row: 18, col: 18 }, 'ArrowDown', 19, 19), { row: 18, col: 18 }, '오목 아래쪽 끝')
eq(moveCursor({ row: 0, col: 0 }, 'ArrowLeft', 19, 19), { row: 0, col: 0 }, '오목 왼쪽 끝')
eq(moveCursor({ row: 3, col: 3 }, 'ArrowRight', 8, 8), { row: 3, col: 4 }, '오델로 오른쪽 한 칸')

// 커넥트4 1x7: 좌우로 열만 고르고 위아래는 제자리
eq(moveCursor({ row: 0, col: 3 }, 'ArrowUp', 1, 7), { row: 0, col: 3 }, '커넥트4 위는 제자리')
eq(moveCursor({ row: 0, col: 3 }, 'ArrowDown', 1, 7), { row: 0, col: 3 }, '커넥트4 아래는 제자리')
eq(moveCursor({ row: 0, col: 6 }, 'ArrowRight', 1, 7), { row: 0, col: 6 }, '커넥트4 오른쪽 끝')
eq(moveCursor({ row: 0, col: 3 }, 'ArrowLeft', 1, 7), { row: 0, col: 2 }, '커넥트4 왼쪽 한 열')

// 솔리테어 2x7: 윗줄 스톡·웨이스트·(빈칸 0,2)·파운데이션 4, 아랫줄 태블로 7. 빈칸은 건너뛰고 더미 13개에 모두 닿아야 한다
const isGap = (r: number, c: number) => r === 0 && c === 2
eq(moveCursor({ row: 0, col: 1 }, 'ArrowRight', 2, 7, isGap), { row: 0, col: 3 }, '웨이스트 → 첫 파운데이션')
eq(moveCursor({ row: 0, col: 3 }, 'ArrowLeft', 2, 7, isGap), { row: 0, col: 1 }, '첫 파운데이션 → 웨이스트')
eq(moveCursor({ row: 1, col: 2 }, 'ArrowUp', 2, 7, isGap), { row: 1, col: 2 }, '태블로 3열 위는 빈칸이라 제자리')
eq(moveCursor({ row: 0, col: 5 }, 'ArrowDown', 2, 7, isGap), { row: 1, col: 5 }, '파운데이션 → 태블로')
const piles = new Set<string>(['0,0'])
const todo = [{ row: 0, col: 0 }]
while (todo.length) {
  const c = todo.shift()!
  for (const k of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) {
    const n = moveCursor(c, k, 2, 7, isGap)!
    const id = `${n.row},${n.col}`
    if (!piles.has(id)) { piles.add(id); todo.push(n) }
  }
}
eq(piles.has('0,2'), false, '솔리테어 빈칸에 멈추지 않음')
eq(piles.size, 13, '솔리테어 더미 13개 모두 도달')

console.log(fail ? `${fail} failed` : 'all passed')
if (fail) process.exit(1)
