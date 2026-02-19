'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Eye, ChevronLeft, ChevronRight, SkipForward, RotateCcw, BookOpen } from 'lucide-react'

interface TestPlate {
  number: number
  bgColors: string[]
  numColors: string[]
}

const TEST_PLATES: TestPlate[] = [
  { number: 12, bgColors: ['#7cb342', '#8bc34a', '#9ccc65', '#aed581'], numColors: ['#e57373', '#ef5350', '#f44336', '#e53935'] },
  { number: 8, bgColors: ['#66bb6a', '#81c784', '#a5d6a7', '#c8e6c9'], numColors: ['#ff8a65', '#ff7043', '#ff5722', '#f4511e'] },
  { number: 29, bgColors: ['#9ccc65', '#aed581', '#c5e1a5', '#dcedc8'], numColors: ['#ff6f60', '#e64a19', '#d84315', '#bf360c'] },
  { number: 5, bgColors: ['#26a69a', '#4db6ac', '#80cbc4', '#b2dfdb'], numColors: ['#ff7961', '#ff5252', '#ff1744', '#d50000'] },
  { number: 3, bgColors: ['#66bb6a', '#81c784', '#a5d6a7', '#c8e6c9'], numColors: ['#ffb74d', '#ffa726', '#ff9800', '#fb8c00'] },
  { number: 15, bgColors: ['#9ccc65', '#aed581', '#c5e1a5', '#dcedc8'], numColors: ['#ef5350', '#e53935', '#d32f2f', '#c62828'] },
  { number: 74, bgColors: ['#4db6ac', '#80cbc4', '#b2dfdb', '#e0f2f1'], numColors: ['#ff6e40', '#ff5722', '#f4511e', '#e64a19'] },
  { number: 6, bgColors: ['#81c784', '#a5d6a7', '#c8e6c9', '#e8f5e9'], numColors: ['#ff8a80', '#ff5252', '#ff1744', '#d50000'] },
  { number: 45, bgColors: ['#7cb342', '#8bc34a', '#9ccc65', '#aed581'], numColors: ['#ff9e80', '#ff6e40', '#ff5722', '#f4511e'] },
  { number: 2, bgColors: ['#66bb6a', '#81c784', '#a5d6a7', '#c8e6c9'], numColors: ['#ffab91', '#ff8a65', '#ff7043', '#ff5722'] }
]

export default function ColorBlindTest() {
  const t = useTranslations('colorBlindTest')
  const [currentPlate, setCurrentPlate] = useState(0)
  const [answers, setAnswers] = useState<(string | null)[]>(Array(TEST_PLATES.length).fill(null))
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [testComplete, setTestComplete] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const drawPlate = useCallback((plateIndex: number) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const plate = TEST_PLATES[plateIndex]
    const width = canvas.width
    const height = canvas.height
    const centerX = width / 2
    const centerY = height / 2
    const radius = Math.min(width, height) / 2 - 20

    ctx.clearRect(0, 0, width, height)

    const numberStr = plate.number.toString()
    const dots: { x: number; y: number; color: string; size: number; isNumber: boolean }[] = []

    const isInsideNumber = (x: number, y: number): boolean => {
      ctx.font = 'bold 120px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const metrics = ctx.measureText(numberStr)
      const textWidth = metrics.width
      const textHeight = 120
      const textX = centerX - textWidth / 2
      const textY = centerY - textHeight / 2

      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = 'black'
      ctx.fillText(numberStr, centerX, centerY)

      const imageData = ctx.getImageData(x, y, 1, 1)
      return imageData.data[3] > 128
    }

    for (let i = 0; i < 800; i++) {
      const angle = Math.random() * Math.PI * 2
      const r = Math.random() * radius
      const x = centerX + r * Math.cos(angle)
      const y = centerY + r * Math.sin(angle)
      const distFromCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2)

      if (distFromCenter > radius) continue

      const size = 3 + Math.random() * 5
      const isNum = isInsideNumber(Math.floor(x), Math.floor(y))
      const colorPalette = isNum ? plate.numColors : plate.bgColors
      const color = colorPalette[Math.floor(Math.random() * colorPalette.length)]

      dots.push({ x, y, color, size, isNumber: isNum })
    }

    ctx.clearRect(0, 0, width, height)

    dots.forEach(dot => {
      ctx.fillStyle = dot.color
      ctx.beginPath()
      ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2)
      ctx.fill()
    })
  }, [])

  useEffect(() => {
    if (!testComplete) {
      drawPlate(currentPlate)
    }
  }, [currentPlate, testComplete, drawPlate])

  const handleNext = () => {
    const newAnswers = [...answers]
    newAnswers[currentPlate] = currentAnswer || null
    setAnswers(newAnswers)

    if (currentPlate < TEST_PLATES.length - 1) {
      setCurrentPlate(currentPlate + 1)
      setCurrentAnswer(answers[currentPlate + 1] || '')
    } else {
      setTestComplete(true)
    }
  }

  const handlePrevious = () => {
    const newAnswers = [...answers]
    newAnswers[currentPlate] = currentAnswer || null
    setAnswers(newAnswers)

    if (currentPlate > 0) {
      setCurrentPlate(currentPlate - 1)
      setCurrentAnswer(answers[currentPlate - 1] || '')
    }
  }

  const handleSkip = () => {
    const newAnswers = [...answers]
    newAnswers[currentPlate] = null
    setAnswers(newAnswers)

    if (currentPlate < TEST_PLATES.length - 1) {
      setCurrentPlate(currentPlate + 1)
      setCurrentAnswer(answers[currentPlate + 1] || '')
    } else {
      setTestComplete(true)
    }
  }

  const handleRestart = () => {
    setCurrentPlate(0)
    setAnswers(Array(TEST_PLATES.length).fill(null))
    setCurrentAnswer('')
    setTestComplete(false)
  }

  const calculateResults = () => {
    let correct = 0
    let wrong = 0
    let skipped = 0

    answers.forEach((answer, index) => {
      if (answer === null) {
        skipped++
      } else if (parseInt(answer) === TEST_PLATES[index].number) {
        correct++
      } else {
        wrong++
      }
    })

    const score = Math.round((correct / TEST_PLATES.length) * 100)
    let classification = ''
    if (score >= 80) {
      classification = t('result.normal')
    } else if (score >= 60) {
      classification = t('result.mild')
    } else {
      classification = t('result.moderate')
    }

    return { correct, wrong, skipped, score, classification }
  }

  if (testComplete) {
    const results = calculateResults()

    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-2 mb-6">
            <Eye className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('result.title')}
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4">
              <div className="text-sm text-green-600 dark:text-green-400 mb-1">{t('result.correct')}</div>
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">{results.correct}</div>
            </div>
            <div className="bg-red-50 dark:bg-red-950 rounded-lg p-4">
              <div className="text-sm text-red-600 dark:text-red-400 mb-1">{t('result.wrong')}</div>
              <div className="text-2xl font-bold text-red-700 dark:text-red-300">{results.wrong}</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('result.skipped')}</div>
              <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">{results.skipped}</div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
              <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">{t('result.score')}</div>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{results.score}%</div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-6 mb-6">
            <p className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
              {results.classification}
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {t('result.disclaimer')}
            </p>
          </div>

          <div className="space-y-3">
            {TEST_PLATES.map((plate, index) => {
              const answer = answers[index]
              const isCorrect = answer !== null && parseInt(answer) === plate.number
              const isSkipped = answer === null

              return (
                <div
                  key={index}
                  className={`flex items-center justify-between p-4 rounded-lg ${
                    isSkipped
                      ? 'bg-gray-50 dark:bg-gray-700'
                      : isCorrect
                      ? 'bg-green-50 dark:bg-green-950'
                      : 'bg-red-50 dark:bg-red-950'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('plate')} {index + 1}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {t('yourAnswer')}: {answer || '-'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {isSkipped ? t('result.skipped') : isCorrect ? t('result.correct') : `${t('result.wrong')} (${plate.number})`}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          <button
            onClick={handleRestart}
            className="w-full mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            {t('restart')}
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            {t('guide.title')}
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                {t('guide.about.title')}
              </h3>
              <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300">
                {(t.raw('guide.about.items') as string[]).map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                {t('guide.types.title')}
              </h3>
              <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300">
                {(t.raw('guide.types.items') as string[]).map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Eye className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('plate')} {currentPlate + 1} {t('of')} {TEST_PLATES.length}
            </h2>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {answers.filter(a => a !== null).length} / {TEST_PLATES.length}
          </div>
        </div>

        <div className="flex flex-col items-center mb-6">
          <canvas
            ref={canvasRef}
            width={400}
            height={400}
            className="max-w-full h-auto rounded-lg shadow-md"
          />
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('instruction')}
            </label>
            <input
              type="text"
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              placeholder={t('answerPlaceholder')}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-center text-2xl font-semibold"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={handlePrevious}
              disabled={currentPlate === 0}
              className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300 rounded-lg px-4 py-3 font-medium transition-all flex items-center justify-center gap-2"
            >
              <ChevronLeft className="w-5 h-5" />
              {t('previous')}
            </button>

            <button
              onClick={handleSkip}
              className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-3 font-medium transition-all flex items-center justify-center gap-2"
            >
              <SkipForward className="w-5 h-5" />
              {t('skip')}
            </button>

            <button
              onClick={handleNext}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2"
            >
              {currentPlate === TEST_PLATES.length - 1 ? t('submit') : t('next')}
              {currentPlate < TEST_PLATES.length - 1 && <ChevronRight className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="mt-6">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentPlate + 1) / TEST_PLATES.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          {t('guide.title')}
        </h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.about.title')}
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300">
              {(t.raw('guide.about.items') as string[]).map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.types.title')}
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300">
              {(t.raw('guide.types.items') as string[]).map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
