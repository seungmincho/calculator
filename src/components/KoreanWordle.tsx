'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { BarChart3, HelpCircle, Share2, Check, X, Copy, Twitter } from 'lucide-react'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import LeaderboardPanel from '@/components/LeaderboardPanel'
import NameInputModal from '@/components/NameInputModal'

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

type JamoStatus = 'correct' | 'present' | 'absent' | 'empty'
type GameStatus = 'playing' | 'won' | 'lost'

interface JamoCell {
  jamo: string
  status: JamoStatus
}

interface GuessRow {
  word: string
  syllables: {
    char: string
    jamos: JamoCell[]
  }[]
  revealed: boolean
}

interface GameStats {
  gamesPlayed: number
  gamesWon: number
  currentStreak: number
  maxStreak: number
  guessDistribution: number[] // index 0 = 1st try, ..., index 5 = 6th try
  lastPlayedDate: string
}

// ═══════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════

const MAX_GUESSES = 6
const WORD_LENGTH = 2
const STATS_KEY = 'koreanWordle_stats'
const GAME_STATE_KEY = 'koreanWordle_gameState'

// Korean jamo tables
const CHOSUNG = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']
const JUNGSUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ']
const JONGSUNG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']

// Compound vowel combos
const COMPOUND_VOWELS: Record<string, Record<string, string>> = {
  'ㅗ': { 'ㅏ': 'ㅘ', 'ㅐ': 'ㅙ', 'ㅣ': 'ㅚ' },
  'ㅜ': { 'ㅓ': 'ㅝ', 'ㅔ': 'ㅞ', 'ㅣ': 'ㅟ' },
  'ㅡ': { 'ㅣ': 'ㅢ' },
}

// Compound jongseong combos
const COMPOUND_JONG: Record<string, Record<string, string>> = {
  'ㄱ': { 'ㅅ': 'ㄳ' },
  'ㄴ': { 'ㅈ': 'ㄵ', 'ㅎ': 'ㄶ' },
  'ㄹ': { 'ㄱ': 'ㄺ', 'ㅁ': 'ㄻ', 'ㅂ': 'ㄼ', 'ㅅ': 'ㄽ', 'ㅌ': 'ㄾ', 'ㅍ': 'ㄿ', 'ㅎ': 'ㅀ' },
  'ㅂ': { 'ㅅ': 'ㅄ' },
}

// Decompose compound jongseong
const DECOMPOSE_JONG: Record<string, [string, string]> = {
  'ㄳ': ['ㄱ', 'ㅅ'], 'ㄵ': ['ㄴ', 'ㅈ'], 'ㄶ': ['ㄴ', 'ㅎ'],
  'ㄺ': ['ㄹ', 'ㄱ'], 'ㄻ': ['ㄹ', 'ㅁ'], 'ㄼ': ['ㄹ', 'ㅂ'],
  'ㄽ': ['ㄹ', 'ㅅ'], 'ㄾ': ['ㄹ', 'ㅌ'], 'ㄿ': ['ㄹ', 'ㅍ'],
  'ㅀ': ['ㄹ', 'ㅎ'], 'ㅄ': ['ㅂ', 'ㅅ'],
}

// Keyboard layout
const KEYBOARD_ROW_1 = ['ㅂ','ㅈ','ㄷ','ㄱ','ㅅ','ㅛ','ㅕ','ㅑ','ㅐ','ㅔ']
const KEYBOARD_ROW_2 = ['ㅁ','ㄴ','ㅇ','ㄹ','ㅎ','ㅗ','ㅓ','ㅏ','ㅣ']
const KEYBOARD_ROW_3_JAMO = ['ㅋ','ㅌ','ㅊ','ㅍ','ㅠ','ㅜ','ㅡ']

// Shift jamo (doubled consonants + compound vowels)
const SHIFT_MAP: Record<string, string> = {
  'ㅂ': 'ㅃ', 'ㅈ': 'ㅉ', 'ㄷ': 'ㄸ', 'ㄱ': 'ㄲ', 'ㅅ': 'ㅆ',
  'ㅐ': 'ㅒ', 'ㅔ': 'ㅖ',
}

// consonant/vowel classification
const CHO_SET = new Set(CHOSUNG)
const JUNG_SET = new Set(JUNGSUNG)
const JONG_MAP: Record<string, number> = {}
JONGSUNG.forEach((j, i) => { JONG_MAP[j] = i })
const CHO_MAP: Record<string, number> = {}
CHOSUNG.forEach((c, i) => { CHO_MAP[c] = i })
const JUNG_MAP: Record<string, number> = {}
JUNGSUNG.forEach((v, i) => { JUNG_MAP[v] = i })

function isConsonant(jamo: string): boolean { return CHO_SET.has(jamo) }
function isVowel(jamo: string): boolean { return JUNG_SET.has(jamo) }

// ═══════════════════════════════════════════════════════════
// Korean character utilities
// ═══════════════════════════════════════════════════════════

function isHangulSyllable(ch: string): boolean {
  const code = ch.charCodeAt(0)
  return code >= 0xAC00 && code <= 0xD7A3
}

function decomposeKorean(char: string): string[] {
  const code = char.charCodeAt(0) - 0xAC00
  if (code < 0 || code > 11171) return [char]
  const cho = Math.floor(code / (21 * 28))
  const jung = Math.floor((code % (21 * 28)) / 28)
  const jong = code % 28
  const result = [CHOSUNG[cho], JUNGSUNG[jung]]
  if (jong > 0) result.push(JONGSUNG[jong])
  return result
}

function composeHangul(cho: number, jung: number, jong: number): string {
  return String.fromCharCode(0xAC00 + (cho * 21 + jung) * 28 + jong)
}

function decomposeWord(word: string): string[] {
  const result: string[] = []
  for (const ch of word) {
    result.push(...decomposeKorean(ch))
  }
  return result
}

/** Decompose word into per-syllable jamo arrays */
function decomposeWordBySyllable(word: string): string[][] {
  const result: string[][] = []
  for (const ch of word) {
    result.push(decomposeKorean(ch))
  }
  return result
}

// ═══════════════════════════════════════════════════════════
// Hangul virtual keyboard input state machine
// ═══════════════════════════════════════════════════════════

interface HangulState {
  chars: string[]   // completed characters
  cho: number       // current chosung index, -1 if none
  jung: number      // current jungseong index, -1 if none
  jong: number      // current jongseong index, -1 if none
  jongJamo: string  // actual jamo string of current jongseong
}

function createEmptyHangulState(): HangulState {
  return { chars: [], cho: -1, jung: -1, jong: -1, jongJamo: '' }
}

function flushHangulState(state: HangulState): HangulState {
  const newChars = [...state.chars]
  if (state.cho >= 0 && state.jung >= 0) {
    newChars.push(composeHangul(state.cho, state.jung, state.jong >= 0 ? state.jong : 0))
  } else if (state.cho >= 0) {
    newChars.push(CHOSUNG[state.cho])
  } else if (state.jung >= 0) {
    newChars.push(JUNGSUNG[state.jung])
  }
  return { chars: newChars, cho: -1, jung: -1, jong: -1, jongJamo: '' }
}

function getCurrentText(state: HangulState): string {
  let text = state.chars.join('')
  if (state.cho >= 0 && state.jung >= 0) {
    text += composeHangul(state.cho, state.jung, state.jong >= 0 ? state.jong : 0)
  } else if (state.cho >= 0) {
    text += CHOSUNG[state.cho]
  } else if (state.jung >= 0) {
    text += JUNGSUNG[state.jung]
  }
  return text
}

function addJamo(state: HangulState, jamo: string): HangulState {
  const s = { ...state, chars: [...state.chars] }

  if (isConsonant(jamo)) {
    if (s.cho < 0) {
      s.cho = CHO_MAP[jamo] ?? -1
    } else if (s.jung < 0) {
      // Previous chosung is standalone
      s.chars.push(CHOSUNG[s.cho])
      s.cho = CHO_MAP[jamo] ?? -1
    } else if (s.jong < 0) {
      // Have cho+jung, add jong
      if (JONG_MAP[jamo] !== undefined && JONG_MAP[jamo] > 0) {
        s.jong = JONG_MAP[jamo]
        s.jongJamo = jamo
      } else {
        const flushed = flushHangulState(s)
        return { ...flushed, cho: CHO_MAP[jamo] ?? -1 }
      }
    } else {
      // Already have jong - try compound
      if (COMPOUND_JONG[s.jongJamo]?.[jamo]) {
        const compound = COMPOUND_JONG[s.jongJamo][jamo]
        s.jong = JONG_MAP[compound]
        s.jongJamo = compound
      } else {
        const flushed = flushHangulState(s)
        return { ...flushed, cho: CHO_MAP[jamo] ?? -1 }
      }
    }
  } else if (isVowel(jamo)) {
    if (s.cho < 0 && s.jung < 0) {
      // Standalone vowel
      s.chars.push(jamo)
    } else if (s.cho >= 0 && s.jung < 0) {
      s.jung = JUNG_MAP[jamo]
    } else if (s.cho >= 0 && s.jung >= 0 && s.jong < 0) {
      // Try compound vowel
      const curVowel = JUNGSUNG[s.jung]
      if (COMPOUND_VOWELS[curVowel]?.[jamo]) {
        s.jung = JUNG_MAP[COMPOUND_VOWELS[curVowel][jamo]]
      } else {
        const flushed = flushHangulState(s)
        flushed.chars.push(jamo)
        return flushed
      }
    } else if (s.cho >= 0 && s.jung >= 0 && s.jong >= 0) {
      // Split jongseong
      if (DECOMPOSE_JONG[s.jongJamo]) {
        const [first, second] = DECOMPOSE_JONG[s.jongJamo]
        s.jong = JONG_MAP[first]
        s.jongJamo = first
        const flushed = flushHangulState(s)
        return { ...flushed, cho: CHO_MAP[second] ?? -1, jung: JUNG_MAP[jamo] }
      } else {
        const prevJong = s.jongJamo
        s.jong = -1
        s.jongJamo = ''
        const flushed = flushHangulState(s)
        return { ...flushed, cho: CHO_MAP[prevJong] ?? -1, jung: JUNG_MAP[jamo] }
      }
    } else {
      const flushed = flushHangulState(s)
      flushed.chars.push(jamo)
      return flushed
    }
  }
  return s
}

function removeLastJamo(state: HangulState): HangulState {
  const s = { ...state, chars: [...state.chars] }

  // If we have a composing syllable, peel back one layer
  if (s.jong >= 0) {
    // Remove jongseong (or decompose compound)
    if (DECOMPOSE_JONG[s.jongJamo]) {
      const [first] = DECOMPOSE_JONG[s.jongJamo]
      s.jong = JONG_MAP[first]
      s.jongJamo = first
    } else {
      s.jong = -1
      s.jongJamo = ''
    }
    return s
  }
  if (s.jung >= 0) {
    // Try decomposing compound vowel
    const curVowel = JUNGSUNG[s.jung]
    // Check if it's a compound vowel that can be reduced
    for (const [base, combos] of Object.entries(COMPOUND_VOWELS)) {
      for (const [, compound] of Object.entries(combos)) {
        if (compound === curVowel) {
          s.jung = JUNG_MAP[base]
          return s
        }
      }
    }
    s.jung = -1
    return s
  }
  if (s.cho >= 0) {
    s.cho = -1
    return s
  }
  // Remove last completed char
  if (s.chars.length > 0) {
    const lastChar = s.chars[s.chars.length - 1]
    s.chars.pop()
    // Decompose the last char back into the composing state
    if (isHangulSyllable(lastChar)) {
      const jamos = decomposeKorean(lastChar)
      s.cho = CHO_MAP[jamos[0]] ?? -1
      s.jung = JUNG_MAP[jamos[1]] ?? -1
      if (jamos.length > 2) {
        s.jong = JONG_MAP[jamos[2]] ?? 0
        s.jongJamo = jamos[2]
      }
    }
    return s
  }
  return s
}

// ═══════════════════════════════════════════════════════════
// Word list (~300 common 2-syllable Korean words)
// ═══════════════════════════════════════════════════════════

const WORD_LIST: string[] = [
  // Emotions & Abstract
  '사랑','행복','우정','희망','자유','평화','건강','미래','감사','용기',
  '지혜','인내','노력','열정','보람','감동','기쁨','슬픔','분노','공포',
  '걱정','설렘','그리','외로','허무','겸손','성실','정직','배려','존경',
  // Family & People
  '가족','친구','이웃','동생','언니','오빠','누나','아빠','엄마','부모',
  '아들','딸내','형제','자매','부부','선생','학생','아기','어른','사람',
  // Nature
  '하늘','구름','바람','나무','강물','산길','들판','꽃잎','바다','태양',
  '달빛','별빛','눈꽃','비옷','안개','무지','번개','폭풍','이슬','서리',
  // Seasons & Time
  '아침','저녁','오늘','내일','어제','새벽','봄날','여름','가을','겨울',
  '시간','세월','낮잠','밤길','주말','휴일','계절','올해','작년','순간',
  // Mind & Thought
  '마음','생각','감정','기억','추억','꿈속','상상','의지','신념','양심',
  '고민','판단','결심','직감','영감','통찰','깨달','반성','명상','집중',
  // Achievement
  '성공','도전','변화','성장','목표','최선','결과','실력','능력','재능',
  '발전','진보','혁신','창조','업적','승리','달성','완성','극복','돌파',
  // Places
  '서울','부산','대구','인천','광주','대전','울산','제주','수원','전주',
  '경주','춘천','포항','거제','여수','속초','강릉','안동','목포','통영',
  // Food & Drink
  '커피','국수','김치','된장','라면','치킨','피자','사과','딸기','포도',
  '수박','참외','바나','귤빛','호박','감자','고구','양파','당근','시금',
  // Education & Study
  '학교','교실','공부','시험','성적','과목','수업','숙제','독서','글자',
  '문장','단어','질문','답변','선택','토론','발표','논문','연구','실험',
  // Activities
  '여행','음악','영화','운동','요리','산책','등산','수영','축구','야구',
  '농구','테니','골프','달리','춤추','노래','그림','사진','낚시','캠핑',
  // Home & Life
  '공원','거리','마을','도시','시장','병원','약국','은행','우체','경찰',
  '소방','도서','미술','박물','놀이','식당','카페','백화','편의','슈퍼',
  // Work & Career
  '직장','회사','사무','업무','회의','출근','퇴근','월급','보너','연봉',
  '취업','면접','이력','경력','승진','부서','팀장','사장','직원','동료',
  // Technology
  '컴퓨','휴대','인터','게임','로봇','과학','기술','발명','디자','프로',
  '소프','하드','데이','네트','보안','코딩','앱개','웹사','클라','서버',
  // Body & Health
  '머리','가슴','허리','어깨','무릎','발목','손목','눈동','입술','볼빛',
  // Space & Universe
  '우주','지구','은하','행성','위성','혜성','소행','천체','궤도','광년',
  // Misc Common Words
  '소리','빛깔','향기','맛집','온기','냉기','습기','전기','자기','물결',
  '파도','해변','석양','일출','황혼','여명','노을','새싹','열매','뿌리',
  '줄기','가지','잔디','이끼','숲길','계곡','폭포','동굴','절벽','봉우',
  '언덕','평야','초원','사막','오아','빙하','화산','온천','해류','조류',
]

// Build a Set for O(1) validity check
const WORD_SET = new Set(WORD_LIST)

// ═══════════════════════════════════════════════════════════
// Daily word selection (deterministic based on date)
// ═══════════════════════════════════════════════════════════

function getDailyWord(): string {
  const today = new Date()
  const epoch = new Date(2024, 0, 1) // Jan 1, 2024
  const dayIndex = Math.floor((today.getTime() - epoch.getTime()) / (1000 * 60 * 60 * 24))
  // Simple hash for deterministic but shuffled selection
  const hash = ((dayIndex * 2654435761) >>> 0) % WORD_LIST.length
  return WORD_LIST[hash]
}

function getTodayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ═══════════════════════════════════════════════════════════
// Jamo-level feedback algorithm
// ═══════════════════════════════════════════════════════════

/**
 * Evaluates a guess against the answer at the jamo level.
 * Returns an array of JamoCell per syllable.
 *
 * Algorithm:
 * 1. Decompose both answer and guess into flat jamo arrays with positional indices.
 * 2. First pass: mark exact matches (correct).
 * 3. Second pass: for unmatched guess jamo, check if they exist in unmatched answer jamo (present).
 * 4. Remaining are absent.
 */
function evaluateGuess(guess: string, answer: string): JamoCell[][] {
  const guessSyllables = decomposeWordBySyllable(guess)
  const answerSyllables = decomposeWordBySyllable(answer)

  // Flatten with position indices
  const guessFlat: { jamo: string; syllIdx: number; jamoIdx: number }[] = []
  const answerFlat: { jamo: string; syllIdx: number; jamoIdx: number }[] = []

  guessSyllables.forEach((jamos, si) => {
    jamos.forEach((j, ji) => {
      guessFlat.push({ jamo: j, syllIdx: si, jamoIdx: ji })
    })
  })
  answerSyllables.forEach((jamos, si) => {
    jamos.forEach((j, ji) => {
      answerFlat.push({ jamo: j, syllIdx: si, jamoIdx: ji })
    })
  })

  // Result statuses for each guess jamo (by flat index)
  const statuses: JamoStatus[] = new Array(guessFlat.length).fill('absent')
  const answerUsed: boolean[] = new Array(answerFlat.length).fill(false)
  const guessUsed: boolean[] = new Array(guessFlat.length).fill(false)

  // Pass 1: Exact matches (same syllable position and jamo position)
  for (let gi = 0; gi < guessFlat.length; gi++) {
    for (let ai = 0; ai < answerFlat.length; ai++) {
      if (
        !answerUsed[ai] && !guessUsed[gi] &&
        guessFlat[gi].jamo === answerFlat[ai].jamo &&
        guessFlat[gi].syllIdx === answerFlat[ai].syllIdx &&
        guessFlat[gi].jamoIdx === answerFlat[ai].jamoIdx
      ) {
        statuses[gi] = 'correct'
        answerUsed[ai] = true
        guessUsed[gi] = true
      }
    }
  }

  // Pass 2: Present (jamo exists but wrong position)
  for (let gi = 0; gi < guessFlat.length; gi++) {
    if (guessUsed[gi]) continue
    for (let ai = 0; ai < answerFlat.length; ai++) {
      if (!answerUsed[ai] && guessFlat[gi].jamo === answerFlat[ai].jamo) {
        statuses[gi] = 'present'
        answerUsed[ai] = true
        guessUsed[gi] = true
        break
      }
    }
  }

  // Map flat statuses back to per-syllable structure
  const result: JamoCell[][] = []
  let flatIdx = 0
  guessSyllables.forEach((jamos) => {
    const syllResult: JamoCell[] = []
    jamos.forEach((j) => {
      syllResult.push({ jamo: j, status: statuses[flatIdx] })
      flatIdx++
    })
    result.push(syllResult)
  })

  return result
}

// ═══════════════════════════════════════════════════════════
// Stats persistence
// ═══════════════════════════════════════════════════════════

function loadStats(): GameStats {
  if (typeof window === 'undefined') {
    return { gamesPlayed: 0, gamesWon: 0, currentStreak: 0, maxStreak: 0, guessDistribution: [0,0,0,0,0,0], lastPlayedDate: '' }
  }
  try {
    const raw = localStorage.getItem(STATS_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { gamesPlayed: 0, gamesWon: 0, currentStreak: 0, maxStreak: 0, guessDistribution: [0,0,0,0,0,0], lastPlayedDate: '' }
}

function saveStats(stats: GameStats) {
  try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)) } catch { /* ignore */ }
}

interface SavedGameState {
  date: string
  guesses: string[]
  gameStatus: GameStatus
  answer: string
  hardMode: boolean
}

function loadGameState(): SavedGameState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(GAME_STATE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.date === getTodayKey()) return parsed
    }
  } catch { /* ignore */ }
  return null
}

function saveGameState(state: SavedGameState) {
  try { localStorage.setItem(GAME_STATE_KEY, JSON.stringify(state)) } catch { /* ignore */ }
}

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

export default function KoreanWordle() {
  const t = useTranslations('koreanWordle')

  // Game state
  const [answer] = useState<string>(() => getDailyWord())
  const [guesses, setGuesses] = useState<string[]>([])
  const [gameStatus, setGameStatus] = useState<GameStatus>('playing')
  const [hardMode, setHardMode] = useState(false)
  const [hangulState, setHangulState] = useState<HangulState>(createEmptyHangulState())

  // UI state
  const [showHelp, setShowHelp] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [stats, setStats] = useState<GameStats>(loadStats)
  const [toast, setToast] = useState<string | null>(null)
  const [copiedShare, setCopiedShare] = useState(false)
  const [shakeRow, setShakeRow] = useState(-1)
  const [revealingRow, setRevealingRow] = useState(-1)
  const [bounceRow, setBounceRow] = useState(-1)
  // Streak at the moment the game ended (before reset on loss)
  const [endStreak, setEndStreak] = useState<{ value: number; wasLost: boolean } | null>(null)

  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const boardRef = useRef<HTMLDivElement>(null)

  const leaderboard = useLeaderboard('koreanWordle', undefined)
  const [showNameModal, setShowNameModal] = useState(false)
  const gameStartTimeRef = useRef<number>(Date.now())

  // Current input text from hangul state machine
  const currentInput = getCurrentText(hangulState)

  // Detect if current input has incomplete jamo (standalone consonants/vowels)
  const hasIncompleteJamo = useMemo(() => {
    if (!currentInput) return false
    for (const ch of currentInput) {
      if (!isHangulSyllable(ch)) return true
    }
    return false
  }, [currentInput])

  // ── Load saved game state on mount ──
  useEffect(() => {
    const saved = loadGameState()
    const s = loadStats()
    if (saved) {
      setGuesses(saved.guesses)
      setGameStatus(saved.gameStatus)
      setHardMode(saved.hardMode)
      if (saved.gameStatus === 'won') {
        setEndStreak({ value: s.currentStreak, wasLost: false })
      } else if (saved.gameStatus === 'lost') {
        // streak was already reset on loss — show 0 broken (no banner if was already 0)
        setEndStreak({ value: 0, wasLost: false })
      }
    } else {
      // First time today - check if user has never played (show help)
      if (s.gamesPlayed === 0) {
        setShowHelp(true)
      }
    }
    setStats(s)
  }, [])

  // ── Save game state on changes ──
  useEffect(() => {
    if (guesses.length > 0 || gameStatus !== 'playing') {
      saveGameState({
        date: getTodayKey(),
        guesses,
        gameStatus,
        answer,
        hardMode,
      })
    }
  }, [guesses, gameStatus, answer, hardMode])

  // ── Win detection for leaderboard ──
  useEffect(() => {
    if (gameStatus === 'won') {
      if (leaderboard.checkQualifies(guesses.length)) {
        setShowNameModal(true)
      }
      leaderboard.fetchLeaderboard()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameStatus])

  const handleLeaderboardSubmit = useCallback(async (name: string) => {
    const duration = Date.now() - gameStartTimeRef.current
    await leaderboard.submitScore(guesses.length, name, duration)
    leaderboard.savePlayerName(name)
    setShowNameModal(false)
  }, [leaderboard, guesses.length])

  // ── Toast helper ──
  const showToast = useCallback((msg: string, duration = 2000) => {
    setToast(msg)
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    toastTimeoutRef.current = setTimeout(() => setToast(null), duration)
  }, [])

  // ── Keyboard status map (for coloring keyboard keys) ──
  const keyboardStatuses = useMemo(() => {
    const map: Record<string, JamoStatus> = {}
    guesses.forEach(guess => {
      const evaluation = evaluateGuess(guess, answer)
      evaluation.forEach(syllJamos => {
        syllJamos.forEach(({ jamo, status }) => {
          const existing = map[jamo]
          // Priority: correct > present > absent
          if (!existing || status === 'correct' || (status === 'present' && existing !== 'correct')) {
            map[jamo] = status
          }
        })
      })
    })
    return map
  }, [guesses, answer])

  // ── Hard mode validation ──
  const validateHardMode = useCallback((word: string): string | null => {
    if (!hardMode || guesses.length === 0) return null

    // Get the last guess's evaluation
    const lastGuess = guesses[guesses.length - 1]
    const lastEval = evaluateGuess(lastGuess, answer)
    const wordJamos = decomposeWordBySyllable(word)

    // Check all 'correct' jamo are in the same position
    let flatIdx = 0
    const lastSyllables = decomposeWordBySyllable(lastGuess)
    for (let si = 0; si < lastSyllables.length; si++) {
      for (let ji = 0; ji < lastEval[si].length; ji++) {
        if (lastEval[si][ji].status === 'correct') {
          if (!wordJamos[si] || wordJamos[si][ji] !== lastEval[si][ji].jamo) {
            return t('hardModeCorrect', { jamo: lastEval[si][ji].jamo })
          }
        }
        flatIdx++
      }
    }

    // Check all 'present' jamo are used somewhere
    for (let si = 0; si < lastEval.length; si++) {
      for (const cell of lastEval[si]) {
        if (cell.status === 'present') {
          const allJamos = decomposeWord(word)
          if (!allJamos.includes(cell.jamo)) {
            return t('hardModePresent', { jamo: cell.jamo })
          }
        }
      }
    }

    return null
  }, [hardMode, guesses, answer, t])

  // ── Submit guess ──
  const submitGuess = useCallback(() => {
    if (gameStatus !== 'playing') return

    // Flush current hangul state to get final text
    const flushed = flushHangulState(hangulState)
    const word = flushed.chars.join('')

    if (word.length !== WORD_LENGTH) {
      showToast(t('notEnoughLetters'))
      setShakeRow(guesses.length)
      setTimeout(() => setShakeRow(-1), 600)
      return
    }

    // Check all chars are valid Hangul syllables
    for (const ch of word) {
      if (!isHangulSyllable(ch)) {
        showToast(t('invalidChars'))
        setShakeRow(guesses.length)
        setTimeout(() => setShakeRow(-1), 600)
        return
      }
    }

    // Check word is in list
    if (!WORD_SET.has(word)) {
      showToast(t('notInList'))
      setShakeRow(guesses.length)
      setTimeout(() => setShakeRow(-1), 600)
      return
    }

    // Hard mode check
    const hardModeError = validateHardMode(word)
    if (hardModeError) {
      showToast(hardModeError)
      setShakeRow(guesses.length)
      setTimeout(() => setShakeRow(-1), 600)
      return
    }

    const rowIdx = guesses.length
    const newGuesses = [...guesses, word]
    setGuesses(newGuesses)
    setHangulState(createEmptyHangulState())

    // Reveal animation
    setRevealingRow(rowIdx)
    const revealDuration = 600 // ms for flip

    setTimeout(() => {
      setRevealingRow(-1)

      // Check win/loss
      if (word === answer) {
        setBounceRow(rowIdx)
        setTimeout(() => setBounceRow(-1), 1500)

        setGameStatus('won')
        const newStats = { ...stats }
        newStats.gamesPlayed++
        newStats.gamesWon++
        newStats.currentStreak++
        if (newStats.currentStreak > newStats.maxStreak) {
          newStats.maxStreak = newStats.currentStreak
        }
        newStats.guessDistribution[rowIdx]++
        newStats.lastPlayedDate = getTodayKey()
        setStats(newStats)
        saveStats(newStats)
        setEndStreak({ value: newStats.currentStreak, wasLost: false })

        setTimeout(() => {
          showToast(t('winMessages.' + Math.min(rowIdx, 5)), 3000)
          setTimeout(() => setShowStats(true), 1500)
        }, 300)
      } else if (newGuesses.length >= MAX_GUESSES) {
        setGameStatus('lost')
        const prevStreak = stats.currentStreak
        const newStats = { ...stats }
        newStats.gamesPlayed++
        newStats.currentStreak = 0
        newStats.lastPlayedDate = getTodayKey()
        setStats(newStats)
        saveStats(newStats)
        setEndStreak({ value: prevStreak, wasLost: true })

        setTimeout(() => {
          showToast(answer, 4000)
          setTimeout(() => setShowStats(true), 2000)
        }, 300)
      }
    }, revealDuration)
  }, [hangulState, guesses, gameStatus, answer, stats, showToast, validateHardMode, t])

  // ── Handle virtual keyboard press ──
  const handleKeyPress = useCallback((key: string) => {
    if (gameStatus !== 'playing') return

    if (key === 'Enter') {
      submitGuess()
      return
    }
    if (key === 'Backspace') {
      setHangulState(prev => removeLastJamo(prev))
      return
    }

    // Check if adding this jamo would exceed the max character length
    const nextState = addJamo(hangulState, key)
    const nextText = getCurrentText(nextState)
    if (nextText.length > WORD_LENGTH) {
      return
    }

    setHangulState(nextState)
  }, [gameStatus, hangulState, submitGuess])

  // ── Physical keyboard support ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showHelp || showStats) return
      if (gameStatus !== 'playing') return

      if (e.key === 'Enter') {
        e.preventDefault()
        submitGuess()
        return
      }
      if (e.key === 'Backspace') {
        e.preventDefault()
        setHangulState(prev => removeLastJamo(prev))
        return
      }

      // Map physical keyboard to jamo
      const ENG_TO_KOR: Record<string, string> = {
        'q': 'ㅂ', 'w': 'ㅈ', 'e': 'ㄷ', 'r': 'ㄱ', 't': 'ㅅ',
        'y': 'ㅛ', 'u': 'ㅕ', 'i': 'ㅑ', 'o': 'ㅐ', 'p': 'ㅔ',
        'a': 'ㅁ', 's': 'ㄴ', 'd': 'ㅇ', 'f': 'ㄹ', 'g': 'ㅎ',
        'h': 'ㅗ', 'j': 'ㅓ', 'k': 'ㅏ', 'l': 'ㅣ',
        'z': 'ㅋ', 'x': 'ㅌ', 'c': 'ㅊ', 'v': 'ㅍ',
        'b': 'ㅠ', 'n': 'ㅜ', 'm': 'ㅡ',
        'Q': 'ㅃ', 'W': 'ㅉ', 'E': 'ㄸ', 'R': 'ㄲ', 'T': 'ㅆ',
        'O': 'ㅒ', 'P': 'ㅖ',
      }

      const jamo = ENG_TO_KOR[e.key]
      if (jamo) {
        e.preventDefault()
        handleKeyPress(jamo)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [gameStatus, showHelp, showStats, submitGuess, handleKeyPress])

  // ── Build share text ──
  const buildShareText = useCallback((): string => {
    const dayNumber = Math.floor((new Date().getTime() - new Date(2024, 0, 1).getTime()) / (1000 * 60 * 60 * 24))
    const guessCount = gameStatus === 'won' ? guesses.length : 'X'
    let text = `${t('shareTitle')} #${dayNumber} ${guessCount}/${MAX_GUESSES}\n\n`
    guesses.forEach(guess => {
      const evaluation = evaluateGuess(guess, answer)
      const line = evaluation.map(syllJamos =>
        syllJamos.map(({ status }) => {
          if (status === 'correct') return '🟩'
          if (status === 'present') return '🟨'
          return '⬛'
        }).join('')
      ).join(' ')
      text += line + '\n'
    })
    text += `\ntoolhub.ai.kr/korean-wordle`
    return text
  }, [gameStatus, guesses, answer, t])

  // ── Build emoji grid only (for display) ──
  const buildEmojiGrid = useCallback((): string => {
    return guesses.map(guess => {
      const evaluation = evaluateGuess(guess, answer)
      return evaluation.map(syllJamos =>
        syllJamos.map(({ status }) => {
          if (status === 'correct') return '🟩'
          if (status === 'present') return '🟨'
          return '⬛'
        }).join('')
      ).join(' ')
    }).join('\n')
  }, [guesses, answer])

  // ── Copy to clipboard ──
  const copyToClipboard = useCallback(async (text: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.left = '-999999px'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      return true
    } catch {
      return false
    }
  }, [])

  // ── Share results ──
  const shareResults = useCallback(async () => {
    if (gameStatus === 'playing') return
    const shareText = buildShareText()

    if (navigator.share) {
      try {
        await navigator.share({ text: shareText })
        return
      } catch {
        // user cancelled or share failed — fall through to clipboard
      }
    }

    const ok = await copyToClipboard(shareText)
    setCopiedShare(true)
    setTimeout(() => setCopiedShare(false), 2000)
    showToast(ok ? t('shared') : t('copyFailed'))
  }, [gameStatus, buildShareText, copyToClipboard, showToast, t])

  // ── Copy only (explicit clipboard button) ──
  const copyShare = useCallback(async () => {
    if (gameStatus === 'playing') return
    const shareText = buildShareText()
    const ok = await copyToClipboard(shareText)
    setCopiedShare(true)
    setTimeout(() => setCopiedShare(false), 2000)
    showToast(ok ? t('shared') : t('copyFailed'))
  }, [gameStatus, buildShareText, copyToClipboard, showToast, t])

  // ── Share on X/Twitter ──
  const shareOnTwitter = useCallback(() => {
    if (gameStatus === 'playing') return
    const shareText = buildShareText()
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }, [gameStatus, buildShareText])

  // ── Share on KakaoTalk ──
  const shareOnKakao = useCallback(() => {
    const url = `https://sharer.kakao.com/talk/friends/picker/link?url=${encodeURIComponent('https://toolhub.ai.kr/korean-wordle')}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }, [])

  // ── Build display rows ──
  const displayRows = useMemo(() => {
    const rows: GuessRow[] = []

    // Completed guesses
    guesses.forEach((guess, idx) => {
      const evaluation = evaluateGuess(guess, answer)
      const syllables = [...guess].map((ch, si) => ({
        char: ch,
        jamos: evaluation[si] || [],
      }))
      rows.push({ word: guess, syllables, revealed: idx !== revealingRow })
    })

    // Current input row
    if (guesses.length < MAX_GUESSES && gameStatus === 'playing') {
      const inputText = currentInput
      const syllables: GuessRow['syllables'] = []

      for (let i = 0; i < WORD_LENGTH; i++) {
        if (i < inputText.length) {
          const ch = inputText[i]
          const jamos = isHangulSyllable(ch)
            ? decomposeKorean(ch).map(j => ({ jamo: j, status: 'empty' as JamoStatus }))
            : [{ jamo: ch, status: 'empty' as JamoStatus }]
          syllables.push({ char: ch, jamos })
        } else {
          syllables.push({ char: '', jamos: [] })
        }
      }
      rows.push({ word: inputText, syllables, revealed: false })
    }

    // Empty remaining rows
    const remaining = MAX_GUESSES - rows.length
    for (let i = 0; i < remaining; i++) {
      const syllables: GuessRow['syllables'] = []
      for (let j = 0; j < WORD_LENGTH; j++) {
        syllables.push({ char: '', jamos: [] })
      }
      rows.push({ word: '', syllables, revealed: false })
    }

    return rows
  }, [guesses, answer, currentInput, revealingRow, gameStatus])

  // ── Render ──

  const getStatusColor = (status: JamoStatus, isText = false): string => {
    switch (status) {
      case 'correct':
        return isText ? 'text-white' : 'bg-green-500 dark:bg-green-600'
      case 'present':
        return isText ? 'text-white' : 'bg-yellow-500 dark:bg-yellow-600'
      case 'absent':
        return isText ? 'text-white' : 'bg-gray-500 dark:bg-gray-600'
      default:
        return isText ? 'text-gray-900 dark:text-white' : 'bg-white dark:bg-gray-700'
    }
  }

  const getStatusBorder = (status: JamoStatus): string => {
    switch (status) {
      case 'correct': return 'border-green-500 dark:border-green-600'
      case 'present': return 'border-yellow-500 dark:border-yellow-600'
      case 'absent': return 'border-gray-500 dark:border-gray-600'
      default: return 'border-gray-300 dark:border-gray-600'
    }
  }

  const getKeyColor = (jamo: string): string => {
    const status = keyboardStatuses[jamo]
    switch (status) {
      case 'correct': return 'bg-green-500 dark:bg-green-600 text-white border-green-500'
      case 'present': return 'bg-yellow-500 dark:bg-yellow-600 text-white border-yellow-500'
      case 'absent': return 'bg-gray-400 dark:bg-gray-700 text-white border-gray-400 dark:border-gray-700'
      default: return 'bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white border-gray-300 dark:border-gray-500'
    }
  }

  // Win rate percentage
  const winRate = stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0
  const maxDistribution = Math.max(...stats.guessDistribution, 1)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            {t('title')}
          </h1>
          <div className="flex items-center gap-2">
            {/* Hard mode toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={hardMode}
                onChange={(e) => {
                  if (guesses.length > 0 && e.target.checked) {
                    showToast(t('hardModeAfterStart'))
                    return
                  }
                  setHardMode(e.target.checked)
                }}
                className="accent-blue-600 w-4 h-4"
                disabled={guesses.length > 0 && !hardMode}
              />
              <span className="text-gray-600 dark:text-gray-400">{t('hardMode')}</span>
            </label>
            <button
              onClick={() => setShowHelp(true)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label={t('howToPlay')}
            >
              <HelpCircle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={() => setShowStats(true)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label={t('statistics')}
            >
              <BarChart3 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
          <div className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-3 rounded-lg shadow-xl font-bold text-sm">
            {toast}
          </div>
        </div>
      )}

      {/* Game Board */}
      <div ref={boardRef} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6">
        <div className="flex flex-col items-center gap-2">
          {displayRows.map((row, rowIdx) => {
            const isRevealing = revealingRow === rowIdx
            const isShaking = shakeRow === rowIdx
            const isBouncing = bounceRow === rowIdx

            return (
              <div
                key={rowIdx}
                className={`flex gap-3 sm:gap-4 ${isShaking ? 'animate-shake' : ''} ${isBouncing ? 'animate-bounce-cells' : ''}`}
              >
                {row.syllables.map((syll, cellIdx) => {
                  const hasContent = syll.char !== ''
                  const isGuessed = rowIdx < guesses.length
                  const overallStatus: JamoStatus = isGuessed && syll.jamos.length > 0
                    ? (syll.jamos.every(j => j.status === 'correct') ? 'correct'
                      : syll.jamos.some(j => j.status === 'correct' || j.status === 'present') ? 'present'
                      : 'absent')
                    : 'empty'

                  const isIncompleteJamo = !isGuessed && hasContent && !isHangulSyllable(syll.char)

                  return (
                    <div key={cellIdx} className="flex flex-col items-center gap-1">
                      {/* Main syllable cell */}
                      <div
                        className={`
                          w-16 h-16 sm:w-20 sm:h-20
                          flex items-center justify-center
                          border-2 rounded-lg text-2xl sm:text-3xl font-bold
                          transition-all duration-300
                          ${isIncompleteJamo ? 'border-amber-400 dark:border-amber-500 scale-105' : ''}
                          ${hasContent && !isGuessed && !isIncompleteJamo ? 'border-gray-500 dark:border-gray-400 scale-105' : ''}
                          ${isGuessed && row.revealed
                            ? `${getStatusColor(overallStatus)} ${getStatusBorder(overallStatus)} text-white`
                            : `${hasContent ? (isIncompleteJamo ? 'border-amber-400 dark:border-amber-500' : 'border-gray-400 dark:border-gray-500') : 'border-gray-200 dark:border-gray-700'} text-gray-900 dark:text-white`
                          }
                          ${isRevealing ? 'animate-flip-cell' : ''}
                        `}
                        style={isRevealing ? { animationDelay: `${cellIdx * 300}ms` } : undefined}
                      >
                        {syll.char}
                      </div>

                      {/* Jamo breakdown below the cell */}
                      {isGuessed && row.revealed && syll.jamos.length > 0 && (
                        <div className="flex gap-0.5">
                          {syll.jamos.map((jamoCell, ji) => (
                            <div
                              key={ji}
                              className={`
                                w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center
                                rounded text-[10px] sm:text-xs font-bold
                                ${getStatusColor(jamoCell.status)} ${jamoCell.status !== 'empty' ? 'text-white' : ''}
                              `}
                            >
                              {jamoCell.jamo}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Preview jamo for current input (not yet guessed) */}
                      {!isGuessed && hasContent && syll.jamos.length > 0 && (
                        <div className="flex gap-0.5">
                          {syll.jamos.map((jamoCell, ji) => (
                            <div
                              key={ji}
                              className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded text-[10px] sm:text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                            >
                              {jamoCell.jamo}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>

        {/* Hint for incomplete jamo */}
        {hasIncompleteJamo && gameStatus === 'playing' && (
          <p className="text-center text-sm text-amber-600 dark:text-amber-400 mt-3 animate-pulse">
            {t('needVowelHint')}
          </p>
        )}
      </div>

      {/* Result Card — shown when game ends */}
      {gameStatus !== 'playing' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 sm:p-6 space-y-4">
          {/* Header row: result label + guess count */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {gameStatus === 'won' ? t('resultWon') : t('resultLost')}
            </h2>
            <span className="text-2xl font-bold text-gray-500 dark:text-gray-400">
              {gameStatus === 'won' ? guesses.length : 'X'}/{MAX_GUESSES}
            </span>
          </div>

          {/* Emoji grid */}
          <div className="font-mono text-base leading-relaxed whitespace-pre bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
            {buildEmojiGrid()}
          </div>

          {/* Answer reveal on loss */}
          {gameStatus === 'lost' && (
            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
              {t('answerWas')} <span className="font-bold text-gray-900 dark:text-white text-base">{answer}</span>
            </p>
          )}

          {/* Streak emphasis */}
          {endStreak && endStreak.wasLost && endStreak.value >= 2 && (
            <div className="bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-800 rounded-lg px-4 py-3 text-center text-sm font-medium text-orange-700 dark:text-orange-300">
              {t('streakLost', { count: endStreak.value })}
            </div>
          )}
          {endStreak && !endStreak.wasLost && endStreak.value >= 2 && (
            <div className="bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 rounded-lg px-4 py-3 text-center text-sm font-medium text-green-700 dark:text-green-300">
              {t('streakContinued', { count: endStreak.value })}
            </div>
          )}

          {/* Share buttons row */}
          <div className="flex flex-wrap gap-2 justify-center">
            {/* Copy to clipboard */}
            <button
              onClick={copyShare}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium transition-colors"
            >
              {copiedShare ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              {copiedShare ? t('shared') : t('copyResult')}
            </button>

            {/* Web Share API (mobile native) */}
            {typeof navigator !== 'undefined' && !!navigator.share && (
              <button
                onClick={shareResults}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-100 dark:bg-blue-900/50 hover:bg-blue-200 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 text-sm font-medium transition-colors"
              >
                <Share2 className="w-4 h-4" />
                {t('shareNative')}
              </button>
            )}

            {/* X/Twitter */}
            <button
              onClick={shareOnTwitter}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-black dark:bg-gray-900 hover:bg-gray-800 dark:hover:bg-black text-white text-sm font-medium transition-colors"
            >
              <Twitter className="w-4 h-4" />
              {t('shareTwitter')}
            </button>

            {/* KakaoTalk */}
            <button
              onClick={shareOnKakao}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-yellow-400 hover:bg-yellow-500 text-gray-900 text-sm font-medium transition-colors"
            >
              <span className="text-base leading-none font-bold">K</span>
              {t('shareKakao')}
            </button>
          </div>
        </div>
      )}

      {/* Virtual Keyboard */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-3 sm:p-4">
        <div className="flex flex-col items-center gap-1.5">
          {/* Row 1 */}
          <div className="flex gap-1 sm:gap-1.5">
            {KEYBOARD_ROW_1.map(jamo => (
              <button
                key={jamo}
                onClick={() => handleKeyPress(jamo)}
                className={`
                  w-8 h-10 sm:w-10 sm:h-12 flex items-center justify-center
                  rounded-md text-sm sm:text-base font-bold
                  border transition-colors duration-150
                  active:scale-95
                  ${getKeyColor(jamo)}
                `}
              >
                {jamo}
              </button>
            ))}
          </div>

          {/* Row 2 */}
          <div className="flex gap-1 sm:gap-1.5">
            {KEYBOARD_ROW_2.map(jamo => (
              <button
                key={jamo}
                onClick={() => handleKeyPress(jamo)}
                className={`
                  w-8 h-10 sm:w-10 sm:h-12 flex items-center justify-center
                  rounded-md text-sm sm:text-base font-bold
                  border transition-colors duration-150
                  active:scale-95
                  ${getKeyColor(jamo)}
                `}
              >
                {jamo}
              </button>
            ))}
          </div>

          {/* Row 3 */}
          <div className="flex gap-1 sm:gap-1.5">
            <button
              onClick={() => handleKeyPress('Enter')}
              className="px-2 sm:px-4 h-10 sm:h-12 flex items-center justify-center rounded-md text-xs sm:text-sm font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-none active:scale-95 transition-transform"
            >
              {t('enter')}
            </button>
            {KEYBOARD_ROW_3_JAMO.map(jamo => (
              <button
                key={jamo}
                onClick={() => handleKeyPress(jamo)}
                className={`
                  w-8 h-10 sm:w-10 sm:h-12 flex items-center justify-center
                  rounded-md text-sm sm:text-base font-bold
                  border transition-colors duration-150
                  active:scale-95
                  ${getKeyColor(jamo)}
                `}
              >
                {jamo}
              </button>
            ))}
            <button
              onClick={() => handleKeyPress('Backspace')}
              className="px-2 sm:px-4 h-10 sm:h-12 flex items-center justify-center rounded-md text-sm font-bold bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-500 active:scale-95 transition-transform"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
                <line x1="18" y1="9" x2="12" y2="15" />
                <line x1="12" y1="9" x2="18" y2="15" />
              </svg>
            </button>
          </div>

          {/* Shift keys row (doubled consonants) */}
          <div className="flex gap-1 sm:gap-1.5 mt-1">
            <span className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center mr-1">Shift</span>
            {Object.entries(SHIFT_MAP).map(([base, shifted]) => (
              <button
                key={shifted}
                onClick={() => handleKeyPress(shifted)}
                className={`
                  w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center
                  rounded-md text-xs sm:text-sm font-bold
                  border transition-colors duration-150
                  active:scale-95
                  ${getKeyColor(shifted)}
                `}
                title={`Shift+${base}`}
              >
                {shifted}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowHelp(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('helpTitle')}</h2>
              <button onClick={() => setShowHelp(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
              <p>{t('helpDesc')}</p>

              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">{t('helpExampleTitle')}</h3>

                {/* Example: correct */}
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 flex items-center justify-center rounded bg-green-500 text-white text-xs font-bold">ㄱ</div>
                  <span>{t('helpCorrect')}</span>
                </div>

                {/* Example: present */}
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 flex items-center justify-center rounded bg-yellow-500 text-white text-xs font-bold">ㅏ</div>
                  <span>{t('helpPresent')}</span>
                </div>

                {/* Example: absent */}
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 flex items-center justify-center rounded bg-gray-500 text-white text-xs font-bold">ㅎ</div>
                  <span>{t('helpAbsent')}</span>
                </div>
              </div>

              {/* Input guide */}
              <div className="bg-amber-50 dark:bg-amber-950 rounded-lg p-3 space-y-2">
                <p className="font-semibold text-amber-800 dark:text-amber-300">{t('helpInputTitle')}</p>
                <p className="text-amber-700 dark:text-amber-400">{t('helpInputDesc')}</p>
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <span className="font-mono bg-amber-100 dark:bg-amber-900 px-1.5 py-0.5 rounded text-xs">ㅅ</span>
                  <span>+</span>
                  <span className="font-mono bg-amber-100 dark:bg-amber-900 px-1.5 py-0.5 rounded text-xs">ㅏ</span>
                  <span>=</span>
                  <span className="font-mono bg-amber-100 dark:bg-amber-900 px-1.5 py-0.5 rounded text-xs font-bold">사</span>
                  <span className="text-xs ml-1">{t('helpInputExample')}</span>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3 space-y-1">
                <p className="font-semibold text-blue-800 dark:text-blue-300">{t('helpJamoTitle')}</p>
                <p className="text-blue-700 dark:text-blue-400">{t('helpJamo')}</p>
              </div>

              <p className="text-gray-500 dark:text-gray-400 text-xs">{t('helpKeyboard')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Modal */}
      {showStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowStats(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('statistics')}</h2>
              <button onClick={() => setShowStats(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.gamesPlayed}</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">{t('played')}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{winRate}</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">{t('winRate')}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.currentStreak}</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">{t('currentStreak')}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.maxStreak}</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">{t('maxStreak')}</div>
              </div>
            </div>

            {/* Guess distribution */}
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('guessDistribution')}</h3>
            <div className="space-y-1 mb-6">
              {stats.guessDistribution.map((count, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gray-600 dark:text-gray-400 w-3">{idx + 1}</span>
                  <div className="flex-1 flex items-center">
                    <div
                      className={`h-5 rounded-sm flex items-center justify-end px-1.5 text-xs font-bold text-white ${
                        gameStatus === 'won' && guesses.length === idx + 1
                          ? 'bg-green-500 dark:bg-green-600'
                          : 'bg-gray-400 dark:bg-gray-600'
                      }`}
                      style={{ width: `${Math.max((count / maxDistribution) * 100, count > 0 ? 8 : 4)}%`, minWidth: count > 0 ? '24px' : '8px' }}
                    >
                      {count}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Share button */}
            {gameStatus !== 'playing' && (
              <button
                onClick={shareResults}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg px-4 py-3 font-bold hover:from-green-600 hover:to-emerald-700 transition-all"
              >
                {copiedShare ? <Check className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
                {copiedShare ? t('shared') : t('share')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <LeaderboardPanel leaderboard={leaderboard} />
      <NameInputModal
        isOpen={showNameModal}
        onSubmit={handleLeaderboardSubmit}
        onClose={() => setShowNameModal(false)}
        score={guesses.length}
        formatScore={leaderboard.config?.formatScore ?? ((s) => `${s}/6`)}
        defaultName={leaderboard.savedPlayerName}
      />

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <HelpCircle className="w-5 h-5" />
          {t('guide.title')}
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{t('guide.rules.title')}</h3>
            <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              {(t.raw('guide.rules.items') as string[]).map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-blue-500 shrink-0">{'>'}</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{t('guide.tips.title')}</h3>
            <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              {(t.raw('guide.tips.items') as string[]).map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-green-500 shrink-0">{'>'}</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }

        @keyframes flip-cell {
          0% { transform: rotateX(0deg); }
          45% { transform: rotateX(90deg); }
          55% { transform: rotateX(90deg); }
          100% { transform: rotateX(0deg); }
        }
        .animate-flip-cell {
          animation: flip-cell 0.6s ease-in-out both;
        }

        @keyframes bounce-cells {
          0%, 20% { transform: translateY(0); }
          40% { transform: translateY(-20px); }
          50% { transform: translateY(5px); }
          60% { transform: translateY(-10px); }
          80% { transform: translateY(2px); }
          100% { transform: translateY(0); }
        }
        .animate-bounce-cells {
          animation: bounce-cells 1s ease;
        }

        @keyframes fade-in {
          from { opacity: 0; transform: translate(-50%, -10px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  )
}
