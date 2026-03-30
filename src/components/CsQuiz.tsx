'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  BookOpen, Check, X, ChevronLeft, ChevronRight,
  RotateCcw, Share2, Clock, Trophy, Target,
} from 'lucide-react'
import { CS_QUIZ_QUESTIONS, type QuizCategory, type QuizDifficulty, type QuizQuestion } from '@/data/csQuizQuestions'
import { CS_QUIZ_QUESTIONS_V2_PART1 } from '@/data/csQuizQuestionsV2'
import { CS_QUIZ_QUESTIONS_V2_PART2 } from '@/data/csQuizQuestionsV2b'
import GuideSection from '@/components/GuideSection'

const ALL_QUESTIONS: QuizQuestion[] = [...CS_QUIZ_QUESTIONS, ...CS_QUIZ_QUESTIONS_V2_PART1, ...CS_QUIZ_QUESTIONS_V2_PART2]

type Phase = 'select' | 'quiz' | 'result'
type AnswerRecord = { selected: number | null; correct: boolean | null }

const CATEGORIES: (QuizCategory | 'all')[] = ['all', 'dataStructures', 'algorithms', 'network', 'os', 'database', 'architecture', 'softwareEngineering', 'security', 'linux', 'web']
const CATEGORY_ICONS: Record<QuizCategory | 'all', string> = {
  all: '📚',
  dataStructures: '📊',
  algorithms: '🔄',
  network: '🌐',
  os: '💻',
  database: '🗄️',
  architecture: '🔧',
  softwareEngineering: '⚙️',
  security: '🔒',
  linux: '🐧',
  web: '🌍',
}

const DIFFICULTIES: QuizDifficulty[] = ['beginner', 'intermediate', 'advanced']
const DIFF_COLORS: Record<QuizDifficulty, { bg: string; ring: string; text: string }> = {
  beginner: { bg: 'bg-green-50 dark:bg-green-900/30', ring: 'ring-green-500', text: 'text-green-700 dark:text-green-300' },
  intermediate: { bg: 'bg-yellow-50 dark:bg-yellow-900/30', ring: 'ring-yellow-500', text: 'text-yellow-700 dark:text-yellow-300' },
  advanced: { bg: 'bg-red-50 dark:bg-red-900/30', ring: 'ring-red-500', text: 'text-red-700 dark:text-red-300' },
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function getGrade(pct: number): string {
  if (pct >= 90) return 'A'
  if (pct >= 80) return 'B'
  if (pct >= 70) return 'C'
  if (pct >= 60) return 'D'
  return 'F'
}

const GRADE_COLORS: Record<string, string> = {
  A: 'bg-green-500',
  B: 'bg-blue-500',
  C: 'bg-yellow-500',
  D: 'bg-orange-500',
  F: 'bg-red-500',
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function CsQuiz() {
  const t = useTranslations('csQuiz')

  // --- Phase ---
  const [phase, setPhase] = useState<Phase>('select')

  // --- Selection ---
  const [selectedCategory, setSelectedCategory] = useState<QuizCategory | 'all' | null>(null)
  const [selectedDifficulty, setSelectedDifficulty] = useState<QuizDifficulty | null>(null)

  // --- Quiz state ---
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<AnswerRecord[]>([])
  const [showExplanation, setShowExplanation] = useState(false)

  // --- Timer ---
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // --- Clipboard ---
  const [copied, setCopied] = useState(false)

  // --- URL params on mount ---
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const cat = params.get('cat')
    const diff = params.get('diff')
    if (cat && CATEGORIES.includes(cat as QuizCategory | 'all')) {
      setSelectedCategory(cat as QuizCategory | 'all')
    }
    if (diff && DIFFICULTIES.includes(diff as QuizDifficulty)) {
      setSelectedDifficulty(diff as QuizDifficulty)
    }
  }, [])

  // --- Count questions for a selection ---
  const questionCount = useMemo(() => {
    if (!selectedCategory || !selectedDifficulty) return 0
    return ALL_QUESTIONS.filter(q => {
      const catMatch = selectedCategory === 'all' || q.category === selectedCategory
      const diffMatch = q.difficulty === selectedDifficulty
      return catMatch && diffMatch
    }).length
  }, [selectedCategory, selectedDifficulty])

  // --- Start quiz ---
  const startQuiz = useCallback(() => {
    if (!selectedCategory || !selectedDifficulty) return
    const filtered = ALL_QUESTIONS.filter(q => {
      const catMatch = selectedCategory === 'all' || q.category === selectedCategory
      return catMatch && q.difficulty === selectedDifficulty
    })
    const shuffled = shuffleArray(filtered)
    setQuestions(shuffled)
    setAnswers(shuffled.map(() => ({ selected: null, correct: null })))
    setCurrentIndex(0)
    setShowExplanation(false)
    setElapsed(0)
    setPhase('quiz')

    // Update URL
    const url = new URL(window.location.href)
    url.searchParams.set('cat', selectedCategory)
    url.searchParams.set('diff', selectedDifficulty)
    window.history.replaceState({}, '', url)

    // Start timer
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => setElapsed(prev => prev + 1), 1000)
  }, [selectedCategory, selectedDifficulty])

  // --- Clean up timer ---
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  // --- Select answer ---
  const selectAnswer = useCallback((optionIndex: number) => {
    if (!questions[currentIndex]) return
    const existing = answers[currentIndex]
    if (existing.selected !== null) return // already answered

    const correct = questions[currentIndex].correctIndex === optionIndex
    const newAnswers = [...answers]
    newAnswers[currentIndex] = { selected: optionIndex, correct }
    setAnswers(newAnswers)
    setShowExplanation(true)
  }, [questions, currentIndex, answers])

  // --- Navigation ---
  const goNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setShowExplanation(answers[currentIndex + 1]?.selected !== null)
    }
  }, [currentIndex, questions.length, answers])

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
      setShowExplanation(answers[currentIndex - 1]?.selected !== null)
    }
  }, [currentIndex, answers])

  const showResults = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    setPhase('result')
  }, [])

  // --- Keyboard support ---
  useEffect(() => {
    if (phase !== 'quiz') return
    const handler = (e: KeyboardEvent) => {
      if (e.key >= '1' && e.key <= '4') {
        selectAnswer(parseInt(e.key) - 1)
      } else if (e.key === 'Enter') {
        if (showExplanation) {
          if (currentIndex === questions.length - 1) showResults()
          else goNext()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [phase, selectAnswer, showExplanation, currentIndex, questions.length, goNext, showResults])

  // --- Results computation ---
  const correctCount = answers.filter(a => a.correct === true).length
  const incorrectCount = answers.filter(a => a.correct === false).length
  const unansweredCount = answers.filter(a => a.selected === null).length
  const totalCount = questions.length
  const percentage = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0
  const grade = getGrade(percentage)

  // --- Wrong answers ---
  const wrongAnswers = questions.map((q, i) => ({ question: q, answer: answers[i], index: i })).filter(x => x.answer.correct === false)

  // --- Retry ---
  const retryQuiz = useCallback(() => {
    const shuffled = shuffleArray(questions)
    setQuestions(shuffled)
    setAnswers(shuffled.map(() => ({ selected: null, correct: null })))
    setCurrentIndex(0)
    setShowExplanation(false)
    setElapsed(0)
    setPhase('quiz')
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => setElapsed(prev => prev + 1), 1000)
  }, [questions])

  const retryWrongOnly = useCallback(() => {
    const wrongQs = questions.filter((_, i) => answers[i].correct === false)
    if (wrongQs.length === 0) return
    const shuffled = shuffleArray(wrongQs)
    setQuestions(shuffled)
    setAnswers(shuffled.map(() => ({ selected: null, correct: null })))
    setCurrentIndex(0)
    setShowExplanation(false)
    setElapsed(0)
    setPhase('quiz')
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => setElapsed(prev => prev + 1), 1000)
  }, [questions, answers])

  const backToSelect = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    setPhase('select')
    setQuestions([])
    setAnswers([])
    setCurrentIndex(0)
    setShowExplanation(false)
    setElapsed(0)
  }, [])

  // --- Share ---
  const shareResult = useCallback(async () => {
    const catLabel = selectedCategory === 'all' ? t('categories.all') : t(`categories.${selectedCategory}`)
    const diffLabel = t(`difficulties.${selectedDifficulty}`)
    const text = `CS 기초 퀴즈 결과: ${correctCount}/${totalCount} (${percentage}%)\n${catLabel} | ${diffLabel}\nhttps://toolhub.ai.kr/cs-quiz/`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'CS 퀴즈 결과', text })
        return
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [selectedCategory, selectedDifficulty, correctCount, totalCount, percentage, t])

  // --- Wrong answer review toggle ---
  const [wrongReviewOpen, setWrongReviewOpen] = useState(true)

  // ========================================================================
  // RENDER: Phase 1 — Selection
  // ========================================================================
  if (phase === 'select') {
    return (
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            {t('title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
        </div>

        {/* Category Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('selectCategory')}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {CATEGORIES.map(cat => {
              const isAll = cat === 'all'
              const count = isAll
                ? ALL_QUESTIONS.length
                : ALL_QUESTIONS.filter(q => q.category === cat).length
              const selected = selectedCategory === cat
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    selected
                      ? 'border-blue-500 ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 bg-white dark:bg-gray-800'
                  }`}
                >
                  <span className="text-2xl">{CATEGORY_ICONS[cat]}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {isAll ? t('categories.all') : t(`categories.${cat}`)}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    {isAll ? t('categories.allDesc') : t(`categories.${cat}Desc`)}
                  </span>
                  <span className="absolute top-2 right-2 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full px-2 py-0.5">
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Difficulty Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('selectDifficulty')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {DIFFICULTIES.map(diff => {
              const selected = selectedDifficulty === diff
              const colors = DIFF_COLORS[diff]
              const count = selectedCategory
                ? ALL_QUESTIONS.filter(q => {
                    const catMatch = selectedCategory === 'all' || q.category === selectedCategory
                    return catMatch && q.difficulty === diff
                  }).length
                : 0
              return (
                <button
                  key={diff}
                  onClick={() => setSelectedDifficulty(diff)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    selected
                      ? `border-transparent ${colors.ring} ring-2 ${colors.bg}`
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                  }`}
                >
                  <span className={`text-base font-semibold ${colors.text}`}>
                    {t(`difficulties.${diff}`)}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    {t(`difficulties.${diff}Desc`)}
                  </span>
                  {selectedCategory && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {count} {t('questionsUnit')}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Start Button */}
        <div className="flex justify-center">
          <button
            onClick={startQuiz}
            disabled={!selectedCategory || !selectedDifficulty || questionCount === 0}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg px-8 py-3 font-medium hover:from-indigo-700 hover:to-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-lg"
          >
            {t('startQuiz')} {questionCount > 0 && `(${questionCount}${t('questionsUnit')})`}
          </button>
        </div>

        <GuideSection namespace="csQuiz" />
      </div>
    )
  }

  // ========================================================================
  // RENDER: Phase 2 — Quiz
  // ========================================================================
  if (phase === 'quiz' && questions.length > 0) {
    const q = questions[currentIndex]
    const ans = answers[currentIndex]
    const answered = ans.selected !== null
    const isLast = currentIndex === questions.length - 1
    const prefixes = ['A', 'B', 'C', 'D']

    return (
      <div className="space-y-6">
        {/* Top Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <Clock className="w-4 h-4" />
              <span>{formatTime(elapsed)}</span>
            </div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {currentIndex + 1} / {questions.length}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <Target className="w-4 h-4" />
              <span>{correctCount}/{answers.filter(a => a.selected !== null).length}</span>
            </div>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((answers.filter(a => a.selected !== null).length) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="mb-6">
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
              {t('questionLabel')} {currentIndex + 1}
            </span>
            <p className="text-lg font-semibold text-gray-900 dark:text-white mt-2">{q.question}</p>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {q.options.map((option, i) => {
              let cls = 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600'
              if (answered) {
                if (i === q.correctIndex) {
                  cls = 'border-green-500 bg-green-50 dark:bg-green-900/30'
                } else if (i === ans.selected && !ans.correct) {
                  cls = 'border-red-500 bg-red-50 dark:bg-red-900/30'
                } else {
                  cls = 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 opacity-60'
                }
              } else if (ans.selected === i) {
                cls = 'border-blue-500 ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/30'
              }

              return (
                <button
                  key={i}
                  onClick={() => selectAnswer(i)}
                  disabled={answered}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${cls}`}
                >
                  <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    answered && i === q.correctIndex
                      ? 'bg-green-500 text-white'
                      : answered && i === ans.selected && !ans.correct
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}>
                    {answered && i === q.correctIndex ? <Check className="w-4 h-4" /> : answered && i === ans.selected && !ans.correct ? <X className="w-4 h-4" /> : prefixes[i]}
                  </span>
                  <span className="text-gray-900 dark:text-white text-sm">{option}</span>
                </button>
              )
            })}
          </div>

          {/* Feedback + Explanation */}
          {answered && showExplanation && (
            <div className="mt-6 space-y-3">
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                ans.correct
                  ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                  : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
              }`}>
                {ans.correct ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                {ans.correct ? t('correct') : t('incorrect')}
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-sm text-blue-800 dark:text-blue-200">
                {q.explanation}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Navigation */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
          {/* Dot indicators */}
          <div className="flex flex-wrap gap-1.5 justify-center mb-4">
            {questions.map((_, i) => {
              let dotCls = 'bg-gray-300 dark:bg-gray-600'
              if (i === currentIndex) dotCls = 'bg-indigo-500 ring-2 ring-indigo-300'
              else if (answers[i].correct === true) dotCls = 'bg-green-500'
              else if (answers[i].correct === false) dotCls = 'bg-red-500'
              return (
                <button
                  key={i}
                  onClick={() => { setCurrentIndex(i); setShowExplanation(answers[i]?.selected !== null) }}
                  className={`w-3 h-3 rounded-full transition-all ${dotCls}`}
                  aria-label={`${t('questionLabel')} ${i + 1}`}
                />
              )
            })}
          </div>

          {/* Prev / Next */}
          <div className="flex justify-between items-center">
            <button
              onClick={goPrev}
              disabled={currentIndex === 0}
              className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed px-3 py-2"
            >
              <ChevronLeft className="w-4 h-4" />
              {t('prevQuestion')}
            </button>

            {isLast ? (
              <button
                onClick={showResults}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg px-6 py-2 text-sm font-medium hover:from-indigo-700 hover:to-purple-700 transition-all"
              >
                {t('showResult')}
              </button>
            ) : (
              <button
                onClick={goNext}
                className="flex items-center gap-1 text-sm bg-indigo-600 text-white rounded-lg px-4 py-2 hover:bg-indigo-700 transition-all"
              >
                {t('nextQuestion')}
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ========================================================================
  // RENDER: Phase 3 — Results
  // ========================================================================
  if (phase === 'result') {
    return (
      <div className="space-y-6">
        {/* Score Summary */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl shadow-lg p-8 text-center text-white">
          <Trophy className="w-12 h-12 mx-auto mb-4 opacity-80" />
          <div className="text-5xl font-bold mb-2">
            {correctCount} / {totalCount}
          </div>
          <div className="text-2xl font-medium opacity-90 mb-4">{percentage}%</div>
          <div className="inline-flex items-center gap-2">
            <span className={`${GRADE_COLORS[grade]} text-white text-xl font-bold px-4 py-1.5 rounded-full`}>
              {grade}
            </span>
            <span className="text-sm opacity-80">{t(`grades.${grade}`)}</span>
          </div>
          <div className="mt-4 flex items-center justify-center gap-2 text-sm opacity-80">
            <Clock className="w-4 h-4" />
            {t('time')}: {formatTime(elapsed)}
          </div>
        </div>

        {/* Stats Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm text-gray-600 dark:text-gray-300">{t('correctLabel')}</span>
              </div>
              <span className="text-2xl font-bold text-green-600 dark:text-green-400">{correctCount}</span>
            </div>
            <div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm text-gray-600 dark:text-gray-300">{t('incorrectLabel')}</span>
              </div>
              <span className="text-2xl font-bold text-red-600 dark:text-red-400">{incorrectCount}</span>
            </div>
            <div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="w-3 h-3 rounded-full bg-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-300">{t('unansweredLabel')}</span>
              </div>
              <span className="text-2xl font-bold text-gray-600 dark:text-gray-400">{unansweredCount}</span>
            </div>
          </div>
        </div>

        {/* Wrong Answer Review */}
        {wrongAnswers.length > 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <button
              onClick={() => setWrongReviewOpen(!wrongReviewOpen)}
              className="flex items-center justify-between w-full text-left"
            >
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('wrongReview')} ({wrongAnswers.length})
              </h2>
              <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${wrongReviewOpen ? 'rotate-90' : ''}`} />
            </button>
            {wrongReviewOpen && (
              <div className="mt-4 space-y-4">
                {wrongAnswers.map(({ question: wq, answer: wa }) => (
                  <div key={wq.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">{wq.question}</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <span className="text-red-600 dark:text-red-400">
                          {t('yourAnswer')}: {wq.options[wa.selected!]}
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-green-600 dark:text-green-400">
                          {t('correctAnswer')}: {wq.options[wq.correctIndex]}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-xs text-blue-800 dark:text-blue-200">
                      {wq.explanation}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl shadow-lg p-8 text-center">
            <div className="text-4xl mb-3">🎉</div>
            <p className="text-lg font-semibold text-green-700 dark:text-green-300">{t('perfectScore')}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={retryQuiz}
            className="flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-xl px-4 py-3 text-sm font-medium hover:bg-indigo-700 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            {t('retry')}
          </button>
          <button
            onClick={retryWrongOnly}
            disabled={wrongAnswers.length === 0}
            className="flex items-center justify-center gap-2 bg-orange-600 text-white rounded-xl px-4 py-3 text-sm font-medium hover:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <X className="w-4 h-4" />
            {t('retryWrong')}
          </button>
          <button
            onClick={backToSelect}
            className="flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl px-4 py-3 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
          >
            <BookOpen className="w-4 h-4" />
            {t('otherCategory')}
          </button>
          <button
            onClick={shareResult}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-2 font-medium hover:from-blue-700 hover:to-indigo-700 transition-all"
          >
            {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            {copied ? t('copied') : t('share')}
          </button>
        </div>

        <GuideSection namespace="csQuiz" />
      </div>
    )
  }

  // Fallback
  return null
}
