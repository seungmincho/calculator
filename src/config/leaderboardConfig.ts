export type ScoreType = 'lower_better' | 'higher_better'

export interface GameLeaderboardConfig {
  gameType: string
  scoreType: ScoreType
  difficulties: string[]
  scoreUnit: string
  formatScore: (score: number) => string
  validate: (score: number, difficulty: string) => boolean
  minDurationMs?: number
}

export const LEADERBOARD_CONFIGS: Record<string, GameLeaderboardConfig> = {
  minesweeper: {
    gameType: 'minesweeper',
    scoreType: 'lower_better',
    difficulties: ['beginner', 'intermediate', 'expert'],
    scoreUnit: 'sec',
    formatScore: (s) => `${s}s`,
    validate: (score, difficulty) => {
      const mins: Record<string, number> = { beginner: 1, intermediate: 10, expert: 30 }
      return score >= (mins[difficulty] ?? 1) && score <= 999
    },
    minDurationMs: 1000,
  },
  sudoku: {
    gameType: 'sudoku',
    scoreType: 'lower_better',
    difficulties: ['easy', 'medium', 'hard', 'expert'],
    scoreUnit: 'sec',
    formatScore: (s) => {
      const m = Math.floor(s / 60)
      const sec = s % 60
      return m > 0 ? `${m}m ${sec}s` : `${s}s`
    },
    validate: (score, difficulty) => {
      const mins: Record<string, number> = { easy: 15, medium: 30, hard: 60, expert: 90 }
      return score >= (mins[difficulty] ?? 10) && score <= 3600
    },
    minDurationMs: 15000,
  },
  tetris: {
    gameType: 'tetris',
    scoreType: 'higher_better',
    difficulties: ['default'],
    scoreUnit: 'points',
    formatScore: (s) => s.toLocaleString(),
    validate: (score) => score >= 0 && score <= 999999,
    minDurationMs: 5000,
  },
  snakeGame: {
    gameType: 'snake_game',
    scoreType: 'higher_better',
    difficulties: ['slow', 'normal', 'fast'],
    scoreUnit: 'points',
    formatScore: (s) => s.toLocaleString(),
    validate: (score) => score >= 1 && score <= 9999,
    minDurationMs: 2000,
  },
  game2048: {
    gameType: 'game_2048',
    scoreType: 'higher_better',
    difficulties: ['default'],
    scoreUnit: 'points',
    formatScore: (s) => s.toLocaleString(),
    validate: (score) => score >= 0 && score <= 999999,
    minDurationMs: 5000,
  },
  memoryGame: {
    gameType: 'memory_game',
    scoreType: 'lower_better',
    difficulties: ['easy', 'normal', 'hard', 'expert'],
    scoreUnit: 'sec',
    formatScore: (s) => `${s}s`,
    validate: (score, difficulty) => {
      const mins: Record<string, number> = { easy: 3, normal: 5, hard: 8, expert: 12 }
      return score >= (mins[difficulty] ?? 3) && score <= 300
    },
    minDurationMs: 3000,
  },
  reactionTest: {
    gameType: 'reaction_test',
    scoreType: 'lower_better',
    difficulties: ['default'],
    scoreUnit: 'ms',
    formatScore: (s) => `${s}ms`,
    validate: (score) => score >= 100 && score <= 1000,
    minDurationMs: 10000,
  },
  numberBaseball: {
    gameType: 'number_baseball',
    scoreType: 'lower_better',
    difficulties: ['3digit', '4digit'],
    scoreUnit: 'attempts',
    formatScore: (s) => `${s}`,
    validate: (score) => score >= 1 && score <= 30,
    minDurationMs: 2000,
  },
  koreanWordle: {
    gameType: 'korean_wordle',
    scoreType: 'lower_better',
    difficulties: ['default'],
    scoreUnit: 'guesses',
    formatScore: (s) => `${s}/6`,
    validate: (score) => score >= 1 && score <= 6,
    minDurationMs: 5000,
  },
}
