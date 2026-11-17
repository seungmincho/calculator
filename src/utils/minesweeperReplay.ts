import { PRESETS, neighbors, openCell, isWon, type Layout, type Mark, type Preset } from './minesweeper.ts'

export type MinesweeperDifficulty = Preset | 'custom'
export type MinesweeperRoundStatus = 'ready' | 'playing' | 'won' | 'lost'
export interface ClassicReplaySource {
  readonly difficulty: MinesweeperDifficulty
  readonly w: number
  readonly h: number
  readonly mines: number
  readonly first: number
  readonly noGuessFailed: boolean
  readonly mine: readonly boolean[]
  readonly count: readonly number[]
}
export interface ClassicPractice {
  w: number
  h: number
  mines: number
  layout: Layout
  open: boolean[]
  marks: Mark[]
  status: 'ready' | 'won'
  boom: number
  start: number
  end: number
  clicks: number
  noGuessFailed: boolean
  first: number
  practice: true
  replaySource: ClassicReplaySource
}
const difficultyKnown = (value: unknown): value is MinesweeperDifficulty => typeof value === 'string' && (value === 'custom' || Object.hasOwn(PRESETS, value))
const whole = (value: number, min: number, max: number) => Number.isSafeInteger(value) && value >= min && value <= max

/** This is a bounded in-memory snapshot, not a saved-game or URL format. */
export function isClassicReplaySource(source: ClassicReplaySource): boolean {
  if (!source || !difficultyKnown(source.difficulty) || !whole(source.w, 5, 30) || !whole(source.h, 5, 24)) return false
  const length = source.w * source.h
  if (!whole(source.mines, 1, length - 9) || !whole(source.first, 0, length - 1) || typeof source.noGuessFailed !== 'boolean') return false
  if (!Array.isArray(source.mine) || !Array.isArray(source.count) || source.mine.length !== length || source.count.length !== length) return false
  let mines = 0
  for (let index = 0; index < length; index++) {
    if (typeof source.mine[index] !== 'boolean' || !whole(source.count[index], 0, 8)) return false
    if (source.mine[index]) mines++
    if (source.count[index] !== neighbors(source.w, source.h, index).filter(neighbor => source.mine[neighbor]).length) return false
  }
  if (mines !== source.mines || source.mine[source.first]) return false
  if (source.difficulty !== 'custom') {
    const preset = PRESETS[source.difficulty]
    if (preset.w !== source.w || preset.h !== source.h || preset.mines !== source.mines) return false
  }
  return true
}

export function cloneClassicReplaySource(source: ClassicReplaySource): ClassicReplaySource {
  if (!isClassicReplaySource(source)) throw new Error('invalidClassicReplaySource')
  return Object.freeze({ difficulty: source.difficulty, w: source.w, h: source.h, mines: source.mines, first: source.first, noGuessFailed: source.noGuessFailed,
    mine: Object.freeze([...source.mine]), count: Object.freeze([...source.count]),
  })
}

/** Capture exactly the generated layout and the first safe cell; never run the generator again. */
export function captureClassicReplaySource(layout: Layout, first: number, difficulty: MinesweeperDifficulty, noGuessFailed: boolean): ClassicReplaySource {
  if (!layout || !Array.isArray(layout.mine)) throw new Error('invalidClassicReplaySource')
  return cloneClassicReplaySource({ difficulty, w: layout.w, h: layout.h, mines: layout.mine.filter(Boolean).length, first, noGuessFailed, mine: layout.mine, count: layout.count })
}

export function createClassicPractice(source: ClassicReplaySource): ClassicPractice {
  const replaySource = cloneClassicReplaySource(source)
  const { w, h, mines, first, noGuessFailed } = replaySource
  const layout: Layout = { w, h, mine: [...replaySource.mine], count: [...replaySource.count] }
  const open = new Array<boolean>(w * h).fill(false), marks = new Array<Mark>(w * h).fill(0)
  openCell(layout, open, marks, first)
  return { w, h, mines, layout, open, marks, status: isWon(layout, open) ? 'won' : 'ready', boom: -1, start: 0, end: 0, clicks: 0, noGuessFailed, first, practice: true, replaySource }
}

export function canPracticeClassic(mode: 'classic' | 'daily', status: MinesweeperRoundStatus, source: ClassicReplaySource | null): boolean {
  return mode === 'classic' && (status === 'won' || status === 'lost') && !!source && isClassicReplaySource(source)
}

export interface MinesweeperRoundContext {
  generation: number
  mode: 'classic' | 'daily'
  difficulty: MinesweeperDifficulty
  practice: boolean
  status: MinesweeperRoundStatus
  start: number
  end: number
}
export interface MinesweeperScoreEligibility {
  readonly generation: number
  readonly difficulty: Preset
  readonly ms: number
  readonly seconds: number
}

/** Gate recordGameResult and every result-derived persistence path before calling them. */
export function shouldRecordMinesweeperResult(round: MinesweeperRoundContext): boolean {
  return round.practice === false && (round.mode === 'classic' || round.mode === 'daily') && (round.status === 'won' || round.status === 'lost')
}
export function isCurrentMinesweeperInput(expected: number, current: number): boolean {
  return whole(expected, 0, Number.MAX_SAFE_INTEGER) && expected === current
}

/** The parent's modal must retain this snapshot and recheck it against the current round. */
export function createMinesweeperScoreEligibility(round: MinesweeperRoundContext): MinesweeperScoreEligibility | null {
  if (!shouldRecordMinesweeperResult(round) || round.mode !== 'classic' || round.status !== 'won' || round.difficulty === 'custom' || !difficultyKnown(round.difficulty)) return null
  if (!whole(round.generation, 0, Number.MAX_SAFE_INTEGER) || !whole(round.start, 1, Number.MAX_SAFE_INTEGER) || !whole(round.end, round.start, Number.MAX_SAFE_INTEGER)) return null
  const ms = round.end - round.start
  return Object.freeze({ generation: round.generation, difficulty: round.difficulty, ms, seconds: Math.max(1, Math.ceil(ms / 1000)) })
}
export function canSubmitMinesweeperScore(eligible: MinesweeperScoreEligibility | null, round: MinesweeperRoundContext): boolean {
  if (!eligible) return false
  const current = createMinesweeperScoreEligibility(round)
  return !!current && current.generation === eligible.generation && current.difficulty === eligible.difficulty && current.ms === eligible.ms && current.seconds === eligible.seconds
}
