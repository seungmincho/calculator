'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Clock, Check, Eye, RotateCcw, ChevronRight, BookOpen } from 'lucide-react'

// ── Types ──
interface ClueData {
  number: number
  row: number
  col: number
  answer: string
  clue: string
}

interface CrosswordPuzzle {
  id: number
  size: number
  grid: string[][] // '' = black cell, character = solution
  clues: {
    across: ClueData[]
    down: ClueData[]
  }
}

type Direction = 'across' | 'down'

// ── Puzzle Data (10 puzzles with real Korean words) ──
const PUZZLES: CrosswordPuzzle[] = [
  // Puzzle 1: 7x7 - 과일과 자연
  {
    id: 1, size: 7,
    grid: [
      ['사','과','','바','나','나',''],
      ['랑','','','','','무',''],
      ['','학','교','','','지',''],
      ['','','부','','','개',''],
      ['가','족','','친','구','',''],
      ['','','','','름','',''],
      ['','','','','다','리',''],
    ],
    clues: {
      across: [
        { number: 1, row: 0, col: 0, answer: '사과', clue: '빨갛고 달콤한 과일' },
        { number: 2, row: 0, col: 3, answer: '바나나', clue: '노란색 열대 과일' },
        { number: 3, row: 2, col: 1, answer: '학교', clue: '학생들이 배우는 장소' },
        { number: 4, row: 4, col: 0, answer: '가족', clue: '부모와 자녀로 이루어진 집단' },
        { number: 5, row: 4, col: 3, answer: '친구', clue: '가깝게 사귀는 사람' },
        { number: 6, row: 6, col: 3, answer: '다리', clue: '강을 건너는 구조물' },
      ],
      down: [
        { number: 1, row: 0, col: 0, answer: '사랑', clue: '마음 깊이 좋아하는 감정' },
        { number: 7, row: 0, col: 5, answer: '나무지개', clue: '비 온 뒤 하늘에 뜨는 일곱 빛깔 (나_____)' },
        { number: 3, row: 2, col: 2, answer: '교부', clue: '서류를 내어 줌' },
        { number: 8, row: 4, col: 4, answer: '구름다리', clue: '높은 곳에 걸린 다리 (3글자)' },
      ],
    },
  },
  // Puzzle 2: 7x7 - 음식과 생활
  {
    id: 2, size: 7,
    grid: [
      ['김','치','','','비','빔','밥'],
      ['','마','','','','',''],
      ['','음','','수','박','',''],
      ['','','','영','','',''],
      ['떡','볶','이','화','','',''],
      ['','','','','','',''],
      ['','','','','','',''],
    ],
    clues: {
      across: [
        { number: 1, row: 0, col: 0, answer: '김치', clue: '배추를 소금에 절여 양념한 한국 전통 음식' },
        { number: 2, row: 0, col: 4, answer: '비빔밥', clue: '밥에 나물과 고추장을 넣어 비벼 먹는 음식' },
        { number: 3, row: 2, col: 3, answer: '수박', clue: '여름에 먹는 크고 둥근 과일' },
        { number: 4, row: 4, col: 0, answer: '떡볶이', clue: '떡을 고추장 양념에 볶은 길거리 음식' },
      ],
      down: [
        { number: 5, row: 0, col: 1, answer: '치마음', clue: '치___: 마음씨' },
        { number: 6, row: 2, col: 3, answer: '수영화', clue: '물에서 하는 운동 + 영___: 화면 예술' },
      ],
    },
  },
  // Puzzle 3: 7x7 - 동물과 자연
  {
    id: 3, size: 7,
    grid: [
      ['고','양','이','','','',''],
      ['래','','','','','',''],
      ['','','호','랑','이','',''],
      ['','','','','미','',''],
      ['','토','끼','','소','나','무'],
      ['','','','','','',''],
      ['','','','','','',''],
    ],
    clues: {
      across: [
        { number: 1, row: 0, col: 0, answer: '고양이', clue: '야옹 하고 우는 반려동물' },
        { number: 2, row: 2, col: 2, answer: '호랑이', clue: '줄무늬가 있는 큰 고양이과 동물' },
        { number: 3, row: 4, col: 1, answer: '토끼', clue: '귀가 긴 귀여운 동물' },
        { number: 4, row: 4, col: 4, answer: '소나무', clue: '사계절 푸른 침엽수' },
      ],
      down: [
        { number: 1, row: 0, col: 0, answer: '고래', clue: '바다에서 가장 큰 포유류' },
        { number: 5, row: 2, col: 4, answer: '이미소', clue: '이__: 이미 + __소: 웃음' },
      ],
    },
  },
  // Puzzle 4: 7x7 - 계절과 날씨
  {
    id: 4, size: 7,
    grid: [
      ['봄','','여','름','','',''],
      ['','','','','','',''],
      ['가','을','','겨','울','',''],
      ['','','','','산','',''],
      ['구','두','','','바','람',''],
      ['','','','','','',''],
      ['','','','','','',''],
    ],
    clues: {
      across: [
        { number: 1, row: 0, col: 0, answer: '봄', clue: '꽃이 피는 계절' },
        { number: 2, row: 0, col: 2, answer: '여름', clue: '가장 더운 계절' },
        { number: 3, row: 2, col: 0, answer: '가을', clue: '단풍이 드는 계절' },
        { number: 4, row: 2, col: 3, answer: '겨울', clue: '눈이 내리는 추운 계절' },
        { number: 5, row: 4, col: 0, answer: '구두', clue: '정장에 신는 신발' },
        { number: 6, row: 4, col: 4, answer: '바람', clue: '공기가 이동하는 현상' },
      ],
      down: [
        { number: 7, row: 2, col: 4, answer: '울산바', clue: '울___: 경상남도 광역시' },
        { number: 5, row: 4, col: 0, answer: '구', clue: '아홉' },
      ],
    },
  },
  // Puzzle 5: 7x7 - 직업과 사회
  {
    id: 5, size: 7,
    grid: [
      ['의','사','','간','호','사',''],
      ['','','','','','자',''],
      ['선','생','님','','','동',''],
      ['','','','','','차',''],
      ['경','찰','','소','방','관',''],
      ['','','','','','',''],
      ['','','','','','',''],
    ],
    clues: {
      across: [
        { number: 1, row: 0, col: 0, answer: '의사', clue: '병을 치료하는 사람' },
        { number: 2, row: 0, col: 3, answer: '간호사', clue: '환자를 돌보는 의료인' },
        { number: 3, row: 2, col: 0, answer: '선생님', clue: '학교에서 가르치는 분' },
        { number: 4, row: 4, col: 0, answer: '경찰', clue: '범죄를 예방하고 잡는 공무원' },
        { number: 5, row: 4, col: 3, answer: '소방관', clue: '불을 끄는 사람' },
      ],
      down: [
        { number: 6, row: 0, col: 5, answer: '사자동차', clue: '사___: 네 바퀴 탈것' },
      ],
    },
  },
  // Puzzle 6: 7x7 - 학교생활
  {
    id: 6, size: 7,
    grid: [
      ['수','학','','과','학','',''],
      ['','','','','교','',''],
      ['영','어','','체','육','',''],
      ['','','','','','',''],
      ['국','어','','미','술','',''],
      ['','','','','','',''],
      ['','','','','','',''],
    ],
    clues: {
      across: [
        { number: 1, row: 0, col: 0, answer: '수학', clue: '숫자와 도형을 배우는 과목' },
        { number: 2, row: 0, col: 3, answer: '과학', clue: '자연 현상을 탐구하는 과목' },
        { number: 3, row: 2, col: 0, answer: '영어', clue: '세계 공용어를 배우는 과목' },
        { number: 4, row: 2, col: 3, answer: '체육', clue: '운동하는 과목' },
        { number: 5, row: 4, col: 0, answer: '국어', clue: '한국어를 배우는 과목' },
        { number: 6, row: 4, col: 3, answer: '미술', clue: '그림을 그리는 과목' },
      ],
      down: [
        { number: 7, row: 0, col: 4, answer: '학교육', clue: '학___: 배움의 장소 + ___육: 가르침' },
      ],
    },
  },
  // Puzzle 7: 7x7 - 교통과 이동
  {
    id: 7, size: 7,
    grid: [
      ['자','전','거','','','',''],
      ['동','','','','','',''],
      ['차','','비','행','기','',''],
      ['','','','','차','',''],
      ['기','차','','버','스','',''],
      ['','','','','','',''],
      ['','','','','','',''],
    ],
    clues: {
      across: [
        { number: 1, row: 0, col: 0, answer: '자전거', clue: '페달을 밟아 타는 두 바퀴 탈것' },
        { number: 2, row: 2, col: 2, answer: '비행기', clue: '하늘을 나는 탈것' },
        { number: 3, row: 4, col: 0, answer: '기차', clue: '레일 위를 달리는 긴 탈것' },
        { number: 4, row: 4, col: 3, answer: '버스', clue: '많은 사람이 타는 대중교통' },
      ],
      down: [
        { number: 1, row: 0, col: 0, answer: '자동차', clue: '엔진으로 달리는 네 바퀴 탈것' },
        { number: 5, row: 2, col: 4, answer: '기차', clue: '레일 위를 달리는 탈것 (세로)' },
      ],
    },
  },
  // Puzzle 8: 7x7 - 감정과 표현
  {
    id: 8, size: 7,
    grid: [
      ['행','복','','기','쁨','',''],
      ['','','','','','',''],
      ['슬','픔','','화','남','',''],
      ['','','','','','',''],
      ['놀','라','움','','두','려','움'],
      ['','','','','','',''],
      ['','','','','','',''],
    ],
    clues: {
      across: [
        { number: 1, row: 0, col: 0, answer: '행복', clue: '만족하고 즐거운 상태' },
        { number: 2, row: 0, col: 3, answer: '기쁨', clue: '좋은 일이 있을 때의 감정' },
        { number: 3, row: 2, col: 0, answer: '슬픔', clue: '마음이 아프고 괴로운 감정' },
        { number: 4, row: 2, col: 3, answer: '화남', clue: '분노를 느끼는 상태' },
        { number: 5, row: 4, col: 0, answer: '놀라움', clue: '예상 밖의 일에 느끼는 감정' },
        { number: 6, row: 4, col: 4, answer: '두려움', clue: '무서움을 느끼는 감정' },
      ],
      down: [],
    },
  },
  // Puzzle 9: 7x7 - 집과 가구
  {
    id: 9, size: 7,
    grid: [
      ['침','대','','거','실','',''],
      ['','','','','','',''],
      ['부','엌','','창','문','',''],
      ['','','','','','',''],
      ['의','자','','책','상','',''],
      ['','','','','','',''],
      ['','','','','','',''],
    ],
    clues: {
      across: [
        { number: 1, row: 0, col: 0, answer: '침대', clue: '잠을 자는 가구' },
        { number: 2, row: 0, col: 3, answer: '거실', clue: '온 가족이 모이는 방' },
        { number: 3, row: 2, col: 0, answer: '부엌', clue: '음식을 만드는 공간' },
        { number: 4, row: 2, col: 3, answer: '창문', clue: '빛과 공기가 들어오는 곳' },
        { number: 5, row: 4, col: 0, answer: '의자', clue: '앉는 가구' },
        { number: 6, row: 4, col: 3, answer: '책상', clue: '공부하는 가구' },
      ],
      down: [],
    },
  },
  // Puzzle 10: 7x7 - 색깔과 모양
  {
    id: 10, size: 7,
    grid: [
      ['빨','강','','노','랑','',''],
      ['','','','','','',''],
      ['파','랑','','초','록','',''],
      ['','','','','','',''],
      ['보','라','','하','양','',''],
      ['','','','','','',''],
      ['','','','','','',''],
    ],
    clues: {
      across: [
        { number: 1, row: 0, col: 0, answer: '빨강', clue: '사과, 딸기의 색깔' },
        { number: 2, row: 0, col: 3, answer: '노랑', clue: '바나나, 병아리의 색깔' },
        { number: 3, row: 2, col: 0, answer: '파랑', clue: '하늘, 바다의 색깔' },
        { number: 4, row: 2, col: 3, answer: '초록', clue: '풀, 나뭇잎의 색깔' },
        { number: 5, row: 4, col: 0, answer: '보라', clue: '빨강과 파랑을 섞은 색깔' },
        { number: 6, row: 4, col: 3, answer: '하양', clue: '눈, 구름의 색깔' },
      ],
      down: [],
    },
  },
]

// ── Helper: get daily puzzle index ──
function getDailyPuzzleIndex(): number {
  const now = new Date()
  const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate()
  return seed % PUZZLES.length
}

// ── Helper: build cell number map ──
function buildNumberMap(puzzle: CrosswordPuzzle): Map<string, number> {
  const map = new Map<string, number>()
  const allClues = [...puzzle.clues.across, ...puzzle.clues.down]
  for (const c of allClues) {
    const key = `${c.row},${c.col}`
    if (!map.has(key)) {
      map.set(key, c.number)
    }
  }
  return map
}

// ── Helper: get cells belonging to a clue word ──
function getClueCells(clue: ClueData, direction: Direction): [number, number][] {
  const cells: [number, number][] = []
  for (let i = 0; i < clue.answer.length; i++) {
    if (direction === 'across') {
      cells.push([clue.row, clue.col + i])
    } else {
      cells.push([clue.row + i, clue.col])
    }
  }
  return cells
}

export default function Crossword() {
  const t = useTranslations('crossword')

  // ── State ──
  const [puzzleIndex, setPuzzleIndex] = useState(getDailyPuzzleIndex)
  const puzzle = PUZZLES[puzzleIndex]
  const [userGrid, setUserGrid] = useState<string[][]>([])
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null)
  const [direction, setDirection] = useState<Direction>('across')
  const [wrongCells, setWrongCells] = useState<Set<string>>(new Set())
  const [revealedCells, setRevealedCells] = useState<Set<string>>(new Set())
  const [completed, setCompleted] = useState(false)
  const [time, setTime] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [checkedOnce, setCheckedOnce] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)

  const numberMap = useMemo(() => buildNumberMap(puzzle), [puzzle])

  // ── Initialize user grid ──
  const initGrid = useCallback(() => {
    const g: string[][] = []
    for (let r = 0; r < puzzle.size; r++) {
      g[r] = []
      for (let c = 0; c < puzzle.size; c++) {
        g[r][c] = ''
      }
    }
    setUserGrid(g)
    setSelectedCell(null)
    setDirection('across')
    setWrongCells(new Set())
    setRevealedCells(new Set())
    setCompleted(false)
    setTime(0)
    setIsRunning(false)
    setCheckedOnce(false)
  }, [puzzle])

  useEffect(() => {
    initGrid()
  }, [initGrid])

  // ── Timer ──
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (isRunning && !completed) {
      interval = setInterval(() => setTime(t => t + 1), 1000)
    }
    return () => { if (interval) clearInterval(interval) }
  }, [isRunning, completed])

  const formatTime = useCallback((s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }, [])

  // ── Find which clue the selected cell belongs to ──
  const activeClue = useMemo(() => {
    if (!selectedCell) return null
    const [sr, sc] = selectedCell
    const clues = direction === 'across' ? puzzle.clues.across : puzzle.clues.down
    for (const clue of clues) {
      const cells = getClueCells(clue, direction)
      if (cells.some(([r, c]) => r === sr && c === sc)) {
        return { clue, direction }
      }
    }
    // Try other direction
    const otherDir: Direction = direction === 'across' ? 'down' : 'across'
    const otherClues = otherDir === 'across' ? puzzle.clues.across : puzzle.clues.down
    for (const clue of otherClues) {
      const cells = getClueCells(clue, otherDir)
      if (cells.some(([r, c]) => r === sr && c === sc)) {
        return { clue, direction: otherDir }
      }
    }
    return null
  }, [selectedCell, direction, puzzle])

  // ── Active word cells ──
  const activeWordCells = useMemo(() => {
    if (!activeClue) return new Set<string>()
    const cells = getClueCells(activeClue.clue, activeClue.direction)
    return new Set(cells.map(([r, c]) => `${r},${c}`))
  }, [activeClue])

  // ── Is cell a valid (non-black) cell ──
  const isValidCell = useCallback((r: number, c: number) => {
    return r >= 0 && r < puzzle.size && c >= 0 && c < puzzle.size && puzzle.grid[r][c] !== ''
  }, [puzzle])

  // ── Cell click ──
  const handleCellClick = useCallback((r: number, c: number) => {
    if (!isValidCell(r, c)) return
    if (!isRunning && !completed) setIsRunning(true)

    if (selectedCell && selectedCell[0] === r && selectedCell[1] === c) {
      // Toggle direction on same cell
      setDirection(d => d === 'across' ? 'down' : 'across')
    } else {
      setSelectedCell([r, c])
    }
    setWrongCells(new Set())
  }, [isValidCell, selectedCell, isRunning, completed])

  // ── Handle keyboard input ──
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!selectedCell || completed) return
    const [sr, sc] = selectedCell

    if (e.key === 'Tab') {
      e.preventDefault()
      setDirection(d => d === 'across' ? 'down' : 'across')
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      for (let r = sr - 1; r >= 0; r--) {
        if (isValidCell(r, sc)) { setSelectedCell([r, sc]); return }
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      for (let r = sr + 1; r < puzzle.size; r++) {
        if (isValidCell(r, sc)) { setSelectedCell([r, sc]); return }
      }
      return
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      for (let c = sc - 1; c >= 0; c--) {
        if (isValidCell(sr, c)) { setSelectedCell([sr, c]); return }
      }
      return
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      for (let c = sc + 1; c < puzzle.size; c++) {
        if (isValidCell(sr, c)) { setSelectedCell([sr, c]); return }
      }
      return
    }

    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault()
      if (userGrid[sr]?.[sc]) {
        setUserGrid(prev => {
          const ng = prev.map(row => [...row])
          ng[sr][sc] = ''
          return ng
        })
      } else {
        // Move back
        if (direction === 'across') {
          for (let c = sc - 1; c >= 0; c--) {
            if (isValidCell(sr, c)) { setSelectedCell([sr, c]); break }
          }
        } else {
          for (let r = sr - 1; r >= 0; r--) {
            if (isValidCell(r, sc)) { setSelectedCell([r, sc]); break }
          }
        }
      }
      return
    }

    // Korean character input
    if (e.key.length === 1 && /[가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z]/.test(e.key)) {
      // We handle this via onInput/composition for Korean IME
      return
    }
  }, [selectedCell, completed, isValidCell, userGrid, direction, puzzle.size])

  // ── Handle input (for Korean IME) ──
  const handleInput = useCallback((char: string) => {
    if (!selectedCell || completed) return
    if (!isRunning) setIsRunning(true)
    const [sr, sc] = selectedCell

    setUserGrid(prev => {
      const ng = prev.map(row => [...row])
      ng[sr][sc] = char
      return ng
    })
    setWrongCells(new Set())

    // Move to next cell in current direction
    if (direction === 'across') {
      for (let c = sc + 1; c < puzzle.size; c++) {
        if (isValidCell(sr, c)) { setSelectedCell([sr, c]); return }
      }
    } else {
      for (let r = sr + 1; r < puzzle.size; r++) {
        if (isValidCell(r, sc)) { setSelectedCell([r, sc]); return }
      }
    }
  }, [selectedCell, completed, isRunning, direction, puzzle.size, isValidCell])

  // ── Check completion ──
  useEffect(() => {
    if (!userGrid.length || completed) return
    let allFilled = true
    let allCorrect = true
    for (let r = 0; r < puzzle.size; r++) {
      for (let c = 0; c < puzzle.size; c++) {
        if (puzzle.grid[r][c] !== '') {
          if (!userGrid[r]?.[c]) {
            allFilled = false
          } else if (userGrid[r][c] !== puzzle.grid[r][c]) {
            allCorrect = false
          }
        }
      }
    }
    if (allFilled && allCorrect) {
      setCompleted(true)
      setIsRunning(false)
    }
  }, [userGrid, puzzle, completed])

  // ── Check answers ──
  const handleCheck = useCallback(() => {
    const wrong = new Set<string>()
    for (let r = 0; r < puzzle.size; r++) {
      for (let c = 0; c < puzzle.size; c++) {
        if (puzzle.grid[r][c] !== '' && userGrid[r]?.[c] && userGrid[r][c] !== puzzle.grid[r][c]) {
          wrong.add(`${r},${c}`)
        }
      }
    }
    setWrongCells(wrong)
    setCheckedOnce(true)
  }, [puzzle, userGrid])

  // ── Reveal current word ──
  const handleRevealWord = useCallback(() => {
    if (!activeClue) return
    const cells = getClueCells(activeClue.clue, activeClue.direction)
    setUserGrid(prev => {
      const ng = prev.map(row => [...row])
      const newRevealed = new Set(revealedCells)
      for (const [r, c] of cells) {
        ng[r][c] = puzzle.grid[r][c]
        newRevealed.add(`${r},${c}`)
      }
      setRevealedCells(newRevealed)
      return ng
    })
  }, [activeClue, puzzle, revealedCells])

  // ── Reset ──
  const handleReset = useCallback(() => {
    initGrid()
  }, [initGrid])

  // ── Change puzzle ──
  const handleChangePuzzle = useCallback((idx: number) => {
    setPuzzleIndex(idx)
  }, [])

  // ── Hidden input for Korean IME ──
  const hiddenInputRef = useRef<HTMLInputElement>(null)
  const composingRef = useRef(false)

  const focusInput = useCallback(() => {
    hiddenInputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (selectedCell) {
      focusInput()
    }
  }, [selectedCell, focusInput])

  // ── Render ──
  if (!userGrid.length) return null

  const cellSize = puzzle.size <= 7 ? 'w-10 h-10 sm:w-12 sm:h-12' : 'w-9 h-9 sm:w-11 sm:h-11'
  const fontSize = puzzle.size <= 7 ? 'text-lg sm:text-xl' : 'text-base sm:text-lg'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Controls bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Timer */}
          <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
            <Clock className="w-4 h-4" />
            <span className="font-mono text-sm">{formatTime(time)}</span>
          </div>

          <div className="flex-1" />

          {/* Puzzle selector */}
          <select
            value={puzzleIndex}
            onChange={e => handleChangePuzzle(Number(e.target.value))}
            className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {PUZZLES.map((p, i) => (
              <option key={p.id} value={i}>
                {i === getDailyPuzzleIndex() ? `${t('daily')} (#${p.id})` : `${t('puzzle')} #${p.id}`}
              </option>
            ))}
          </select>

          {/* Check */}
          <button
            onClick={handleCheck}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-800 transition-colors"
          >
            <Check className="w-4 h-4" />
            {t('check')}
          </button>

          {/* Reveal word */}
          <button
            onClick={handleRevealWord}
            disabled={!activeClue}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors disabled:opacity-50"
          >
            <Eye className="w-4 h-4" />
            {t('revealWord')}
          </button>

          {/* Reset */}
          <button
            onClick={handleReset}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            {t('reset')}
          </button>
        </div>
      </div>

      {/* Win banner */}
      {completed && (
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl p-4 text-center">
          <p className="text-lg font-bold text-green-800 dark:text-green-200">
            {t('congratulations')}
          </p>
          <p className="text-sm text-green-700 dark:text-green-300 mt-1">
            {t('completedIn', { time: formatTime(time) })}
          </p>
        </div>
      )}

      {/* Main content: grid + clues */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Grid */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6">
            {/* Active clue display */}
            {activeClue && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <span className="font-bold text-blue-800 dark:text-blue-200">
                  {activeClue.clue.number}{activeClue.direction === 'across' ? t('acrossShort') : t('downShort')}
                </span>
                <span className="ml-2 text-blue-700 dark:text-blue-300">{activeClue.clue.clue}</span>
              </div>
            )}

            {/* Hidden input for Korean IME */}
            <input
              ref={hiddenInputRef}
              type="text"
              className="absolute opacity-0 w-0 h-0 pointer-events-none"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              onCompositionStart={() => { composingRef.current = true }}
              onCompositionEnd={(e) => {
                composingRef.current = false
                const val = e.currentTarget.value
                if (val) {
                  // Take the last composed character
                  const lastChar = val[val.length - 1]
                  handleInput(lastChar)
                  e.currentTarget.value = ''
                }
              }}
              onInput={(e) => {
                if (composingRef.current) return
                const val = (e.target as HTMLInputElement).value
                if (val) {
                  const lastChar = val[val.length - 1]
                  if (/[가-힣]/.test(lastChar)) {
                    handleInput(lastChar)
                  }
                  (e.target as HTMLInputElement).value = ''
                }
              }}
              onKeyDown={handleKeyDown}
            />

            {/* Grid */}
            <div
              ref={gridRef}
              className="inline-grid gap-0 border-2 border-gray-800 dark:border-gray-400"
              style={{ gridTemplateColumns: `repeat(${puzzle.size}, 1fr)` }}
              onClick={focusInput}
              role="grid"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Tab') {
                  e.preventDefault()
                  setDirection(d => d === 'across' ? 'down' : 'across')
                }
              }}
            >
              {Array.from({ length: puzzle.size }, (_, r) =>
                Array.from({ length: puzzle.size }, (_, c) => {
                  const isBlack = puzzle.grid[r][c] === ''
                  const isSelected = selectedCell?.[0] === r && selectedCell?.[1] === c
                  const isInWord = activeWordCells.has(`${r},${c}`)
                  const isWrong = wrongCells.has(`${r},${c}`)
                  const isRevealed = revealedCells.has(`${r},${c}`)
                  const cellNum = numberMap.get(`${r},${c}`)
                  const value = userGrid[r]?.[c] || ''

                  return (
                    <div
                      key={`${r}-${c}`}
                      className={`
                        ${cellSize} relative border border-gray-300 dark:border-gray-600 cursor-pointer select-none
                        ${isBlack ? 'bg-gray-800 dark:bg-gray-950 cursor-default' : ''}
                        ${!isBlack && isSelected ? 'ring-2 ring-blue-500 ring-inset z-10 bg-blue-100 dark:bg-blue-800' : ''}
                        ${!isBlack && !isSelected && isInWord ? 'bg-blue-50 dark:bg-blue-900/40' : ''}
                        ${!isBlack && !isSelected && !isInWord ? 'bg-white dark:bg-gray-800' : ''}
                        ${isWrong ? 'bg-red-100 dark:bg-red-900/50' : ''}
                        ${isRevealed && !isSelected ? 'bg-green-50 dark:bg-green-900/30' : ''}
                      `}
                      onClick={() => !isBlack && handleCellClick(r, c)}
                      role="gridcell"
                      aria-label={isBlack ? 'black' : `row ${r + 1} col ${c + 1}`}
                    >
                      {/* Cell number */}
                      {cellNum && !isBlack && (
                        <span className="absolute top-0 left-0.5 text-[8px] sm:text-[10px] font-bold text-gray-600 dark:text-gray-400 leading-none">
                          {cellNum}
                        </span>
                      )}
                      {/* Value */}
                      {!isBlack && (
                        <span className={`
                          absolute inset-0 flex items-center justify-center font-semibold
                          ${fontSize}
                          ${isWrong ? 'text-red-600 dark:text-red-400' : isRevealed ? 'text-green-700 dark:text-green-400' : 'text-gray-900 dark:text-white'}
                        `}>
                          {value}
                        </span>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              {t('hint')}
            </p>
          </div>
        </div>

        {/* Clues */}
        <div className="lg:col-span-2 space-y-4">
          {/* Across clues */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <ChevronRight className="w-5 h-5" />
              {t('across')}
            </h2>
            <div className="space-y-2">
              {puzzle.clues.across.map(clue => {
                const isActive = activeClue?.clue.number === clue.number && activeClue.direction === 'across'
                return (
                  <button
                    key={`a-${clue.number}`}
                    onClick={() => {
                      setSelectedCell([clue.row, clue.col])
                      setDirection('across')
                      if (!isRunning && !completed) setIsRunning(true)
                      focusInput()
                    }}
                    className={`
                      w-full text-left px-3 py-2 rounded-lg text-sm transition-colors
                      ${isActive
                        ? 'bg-blue-100 dark:bg-blue-800 text-blue-900 dark:text-blue-100'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }
                    `}
                  >
                    <span className="font-bold mr-2">{clue.number}.</span>
                    {clue.clue}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Down clues */}
          {puzzle.clues.down.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <ChevronRight className="w-5 h-5 rotate-90" />
                {t('down')}
              </h2>
              <div className="space-y-2">
                {puzzle.clues.down.map(clue => {
                  const isActive = activeClue?.clue.number === clue.number && activeClue.direction === 'down'
                  return (
                    <button
                      key={`d-${clue.number}`}
                      onClick={() => {
                        setSelectedCell([clue.row, clue.col])
                        setDirection('down')
                        if (!isRunning && !completed) setIsRunning(true)
                        focusInput()
                      }}
                      className={`
                        w-full text-left px-3 py-2 rounded-lg text-sm transition-colors
                        ${isActive
                          ? 'bg-blue-100 dark:bg-blue-800 text-blue-900 dark:text-blue-100'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }
                      `}
                    >
                      <span className="font-bold mr-2">{clue.number}.</span>
                      {clue.clue}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Guide */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              {t('guide.title')}
            </h2>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              {(t.raw('guide.items') as string[]).map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">&#8226;</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
