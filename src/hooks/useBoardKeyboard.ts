'use client'

import { useState, type FocusEvent, type KeyboardEvent } from 'react'

type Cell = { row: number; col: number }

const STEP: Record<string, [number, number]> = {
  ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1],
}

/** 방향키 하나만큼 옮긴 커서. 방향키가 아니면 null, 보드 밖이면 제자리. */
export function moveCursor(
  c: Cell, key: string, rows: number, cols: number, skip?: (row: number, col: number) => boolean,
): Cell | null {
  const step = STEP[key]
  if (!step) return null
  let row = c.row + step[0], col = c.col + step[1]
  if (skip?.(row, col)) { row += step[0]; col += step[1] }
  return row >= 0 && row < rows && col >= 0 && col < cols ? { row, col } : c
}

/**
 * 캔버스 보드 키보드 조작. 보드 요소에 `{...boardProps}` 와 aria-label 을 붙이면 Tab 으로 들어와
 * 방향키로 커서를 옮기고(가장자리에서 멈춤) Enter·Space 로 그 칸을 클릭한 것과 같은 동작을 한다.
 * 방향키 preventDefault 는 보드에 포커스가 있을 때만 걸리므로 페이지 스크롤은 그대로다.
 * `active` 는 키보드로 포커스된 동안만 true → 이때만 커서를 그린다(마우스로 눌러 생긴 포커스엔 안 그림).
 * `skip(row, col)` 이 true 인 칸은 같은 방향으로 한 칸 더 간다(도트앤박스의 점).
 */
export function useBoardKeyboard(
  rows: number,
  cols: number,
  onActivate: (row: number, col: number) => void,
  start: Cell = { row: Math.floor(rows / 2), col: Math.floor(cols / 2) },
  skip?: (row: number, col: number) => boolean,
) {
  const [cursor, setCursor] = useState(start)
  const [active, setActive] = useState(false)

  const boardProps = {
    tabIndex: 0,
    role: 'application',
    onFocus: (e: FocusEvent<HTMLElement>) => setActive(e.currentTarget.matches(':focus-visible')),
    onBlur: () => setActive(false),
    onPointerDown: () => setActive(false),
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      const next = moveCursor(cursor, e.key, rows, cols, skip)
      if (next) {
        e.preventDefault()
        setActive(true)
        setCursor(next)
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        setActive(true)
        onActivate(cursor.row, cursor.col)
      }
    },
  }

  return { cursor, active, boardProps }
}
