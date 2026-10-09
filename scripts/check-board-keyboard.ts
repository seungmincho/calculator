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

console.log(fail ? `${fail} failed` : 'all passed')
if (fail) process.exit(1)
