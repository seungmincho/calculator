'use client'

import { useState, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'

// ── Korean jamo decomposition ──────────────────────────────────────────────
const CHOSUNG = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']
const JUNGSUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ']
const JONGSUNG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']

function decompose(char: string): string[] {
  const code = char.charCodeAt(0) - 0xAC00
  if (code < 0 || code > 11171) return [char]
  const cho = Math.floor(code / (21 * 28))
  const jung = Math.floor((code % (21 * 28)) / 28)
  const jong = code % 28
  const result = [CHOSUNG[cho], JUNGSUNG[jung]]
  if (jong > 0) result.push(JONGSUNG[jong])
  return result
}

// ── Word bank ──────────────────────────────────────────────────────────────
const WORD_BANK: Record<string, string[]> = {
  animals: ['코끼리','사자','호랑이','기린','펭귄','고양이','강아지','다람쥐','햄스터','앵무새','돌고래','코뿔소','하마','치타','독수리'],
  food:    ['김치찌개','비빔밥','된장찌개','떡볶이','김밥','냉면','삼겹살','불고기','잡채','라면','만두','칼국수','순두부','갈비탕','팥빙수'],
  countries: ['대한민국','일본','중국','미국','영국','프랑스','독일','브라질','호주','캐나다','이탈리아','스페인','인도','멕시코','태국'],
  fruits:  ['사과','바나나','포도','딸기','수박','참외','복숭아','블루베리','키위','망고','자두','체리','레몬','파인애플','귤'],
}

const CATEGORIES = ['animals', 'food', 'countries', 'fruits'] as const
type Category = typeof CATEGORIES[number]

const CONSONANTS = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']
const VOWELS = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ']
const MAX_WRONG = 7

// ── SVG Hangman drawing ────────────────────────────────────────────────────
function HangmanSVG({ wrongCount }: { wrongCount: number }) {
  const isGameOver = wrongCount >= MAX_WRONG
  return (
    <svg
      viewBox="0 0 200 240"
      width="200"
      height="240"
      aria-label={`행맨 그림: 틀린 횟수 ${wrongCount}/${MAX_WRONG}`}
      className="mx-auto"
    >
      {/* Gallows */}
      <line x1="20" y1="230" x2="180" y2="230" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="text-gray-700 dark:text-gray-300" />
      <line x1="60" y1="230" x2="60" y2="20" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="text-gray-700 dark:text-gray-300" />
      <line x1="60" y1="20" x2="130" y2="20" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="text-gray-700 dark:text-gray-300" />
      <line x1="130" y1="20" x2="130" y2="45" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="text-gray-700 dark:text-gray-300" />

      {/* 1: Head */}
      {wrongCount >= 1 && (
        <circle cx="130" cy="60" r="15" stroke="currentColor" strokeWidth="3" fill="none" className="text-red-500" />
      )}

      {/* 2: Body */}
      {wrongCount >= 2 && (
        <line x1="130" y1="75" x2="130" y2="145" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-red-500" />
      )}

      {/* 3: Left arm */}
      {wrongCount >= 3 && (
        <line x1="130" y1="90" x2="105" y2="120" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-red-500" />
      )}

      {/* 4: Right arm */}
      {wrongCount >= 4 && (
        <line x1="130" y1="90" x2="155" y2="120" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-red-500" />
      )}

      {/* 5: Left leg */}
      {wrongCount >= 5 && (
        <line x1="130" y1="145" x2="105" y2="185" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-red-500" />
      )}

      {/* 6: Right leg */}
      {wrongCount >= 6 && (
        <line x1="130" y1="145" x2="155" y2="185" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-red-500" />
      )}

      {/* 7: X eyes (game over face) */}
      {isGameOver && (
        <>
          <line x1="123" y1="54" x2="127" y2="58" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-red-600" />
          <line x1="127" y1="54" x2="123" y2="58" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-red-600" />
          <line x1="133" y1="54" x2="137" y2="58" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-red-600" />
          <line x1="137" y1="54" x2="133" y2="58" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-red-600" />
          <path d="M 122 66 Q 130 62 138 66" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" className="text-red-600" />
        </>
      )}
    </svg>
  )
}

// ── Main component ─────────────────────────────────────────────────────────
export default function Hangman() {
  const t = useTranslations('hangman')

  const [category, setCategory] = useState<Category>('animals')
  const [word, setWord] = useState<string>('')
  const [guessed, setGuessed] = useState<Set<string>>(new Set())
  const [wrongCount, setWrongCount] = useState<number>(0)
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost'>('playing')

  // Compute which jamos are in the word
  const wordJamos = useCallback((w: string): Set<string> => {
    const jamos = new Set<string>()
    for (const ch of w) {
      for (const j of decompose(ch)) {
        jamos.add(j)
      }
    }
    return jamos
  }, [])

  // Check if a character's jamos are all guessed
  const isCharRevealed = useCallback((ch: string, guessedSet: Set<string>): boolean => {
    const jamos = decompose(ch)
    return jamos.every(j => guessedSet.has(j))
  }, [])

  const startNewGame = useCallback((cat: Category) => {
    const words = WORD_BANK[cat]
    const newWord = words[Math.floor(Math.random() * words.length)]
    setWord(newWord)
    setGuessed(new Set())
    setWrongCount(0)
    setGameStatus('playing')
  }, [])

  // Start initial game on mount
  useEffect(() => {
    startNewGame('animals')
  }, [startNewGame])

  const handleCategoryChange = useCallback((cat: Category) => {
    setCategory(cat)
    startNewGame(cat)
  }, [startNewGame])

  const handleGuess = useCallback((jamo: string) => {
    if (gameStatus !== 'playing') return
    if (guessed.has(jamo)) return

    const newGuessed = new Set(guessed)
    newGuessed.add(jamo)
    setGuessed(newGuessed)

    const inWord = wordJamos(word).has(jamo)
    let newWrongCount = wrongCount
    if (!inWord) {
      newWrongCount = wrongCount + 1
      setWrongCount(newWrongCount)
    }

    // Check win: all chars revealed
    const allRevealed = [...word].every(ch => isCharRevealed(ch, newGuessed))
    if (allRevealed) {
      setGameStatus('won')
    } else if (newWrongCount >= MAX_WRONG) {
      setGameStatus('lost')
    }
  }, [gameStatus, guessed, word, wrongCount, wordJamos, isCharRevealed])

  const categoryIcon: Record<Category, string> = {
    animals: '🐾',
    food: '🍜',
    countries: '🌍',
    fruits: '🍎',
  }

  const remainingTries = MAX_WRONG - wrongCount

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Category selector */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('category')}</p>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                category === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {categoryIcon[cat]} {t(`categories.${cat}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Game area */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left: Hangman figure */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 flex flex-col items-center">
          <HangmanSVG wrongCount={wrongCount} />
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('remainingTries')}: <span className={`font-bold text-lg ${remainingTries <= 2 ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>{remainingTries}</span> / {MAX_WRONG}
            </p>
          </div>
        </div>

        {/* Right: Word display + keyboard */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 flex flex-col gap-6">
          {/* Hint */}
          <div className="text-center">
            <span className="inline-block bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-sm font-medium px-3 py-1 rounded-full">
              {t('hint')}: {categoryIcon[category]} {t(`categories.${category}`)}
            </span>
          </div>

          {/* Word display */}
          {word && (
            <div className="flex flex-wrap gap-2 justify-center" aria-label="단어 표시">
              {[...word].map((ch, i) => {
                const revealed = isCharRevealed(ch, guessed)
                return (
                  <div
                    key={i}
                    className={`w-12 h-12 border-b-4 flex items-center justify-center text-xl font-bold transition-all ${
                      revealed
                        ? 'border-blue-500 text-gray-900 dark:text-white'
                        : 'border-gray-400 dark:border-gray-500 text-transparent'
                    }`}
                    aria-label={revealed ? ch : '미공개'}
                  >
                    {revealed ? ch : '_'}
                  </div>
                )
              })}
            </div>
          )}

          {/* Used letters count */}
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
            {t('usedLetters')}: {guessed.size}
          </p>
        </div>
      </div>

      {/* Virtual keyboard */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
        {/* Consonants */}
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">자음</p>
          <div className="flex flex-wrap gap-1.5">
            {CONSONANTS.map((con) => {
              const used = guessed.has(con)
              const isCorrect = used && wordJamos(word).has(con)
              const isWrong = used && !wordJamos(word).has(con)
              return (
                <button
                  key={con}
                  onClick={() => handleGuess(con)}
                  disabled={used || gameStatus !== 'playing'}
                  aria-pressed={used}
                  aria-label={`자음 ${con}${used ? ' (사용됨)' : ''}`}
                  className={`w-10 h-10 rounded-lg text-base font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    isCorrect
                      ? 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 opacity-70 cursor-not-allowed'
                      : isWrong
                      ? 'bg-red-200 dark:bg-red-900 text-red-700 dark:text-red-300 opacity-50 cursor-not-allowed'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-blue-100 dark:hover:bg-blue-900 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer'
                  }`}
                >
                  {con}
                </button>
              )
            })}
          </div>
        </div>

        {/* Vowels */}
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">모음</p>
          <div className="flex flex-wrap gap-1.5">
            {VOWELS.map((vow) => {
              const used = guessed.has(vow)
              const isCorrect = used && wordJamos(word).has(vow)
              const isWrong = used && !wordJamos(word).has(vow)
              return (
                <button
                  key={vow}
                  onClick={() => handleGuess(vow)}
                  disabled={used || gameStatus !== 'playing'}
                  aria-pressed={used}
                  aria-label={`모음 ${vow}${used ? ' (사용됨)' : ''}`}
                  className={`w-10 h-10 rounded-lg text-base font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    isCorrect
                      ? 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 opacity-70 cursor-not-allowed'
                      : isWrong
                      ? 'bg-red-200 dark:bg-red-900 text-red-700 dark:text-red-300 opacity-50 cursor-not-allowed'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-blue-100 dark:hover:bg-blue-900 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer'
                  }`}
                >
                  {vow}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Win/Lose overlay */}
      {gameStatus !== 'playing' && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          role="dialog"
          aria-modal="true"
          aria-label={gameStatus === 'won' ? '게임 승리' : '게임 패배'}
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 mx-4 max-w-sm w-full text-center space-y-4">
            <div className="text-5xl">{gameStatus === 'won' ? '🎉' : '😢'}</div>
            <h2 className={`text-2xl font-bold ${gameStatus === 'won' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {gameStatus === 'won' ? t('won') : t('lost')}
            </h2>
            {gameStatus === 'lost' && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('answer')}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{word}</p>
              </div>
            )}
            <button
              onClick={() => startNewGame(category)}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 transition-all"
            >
              {t('newGame')}
            </button>
          </div>
        </div>
      )}

      {/* New game button (always visible during play) */}
      {gameStatus === 'playing' && (
        <div className="flex justify-center">
          <button
            onClick={() => startNewGame(category)}
            className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-6 py-2 font-medium text-sm transition-colors"
          >
            {t('newGame')}
          </button>
        </div>
      )}

      {/* Guide */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{t('guide.title')}</h2>
        <div>
          <h3 className="text-base font-medium text-gray-700 dark:text-gray-300 mb-2">{t('guide.rules.title')}</h3>
          <ul className="space-y-2">
            {(t.raw('guide.rules.items') as string[]).map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
