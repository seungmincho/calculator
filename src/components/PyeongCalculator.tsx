'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { Ruler, Copy, Check, RotateCcw, BookOpen, Home, Link, ChevronDown, ChevronUp } from 'lucide-react'

type ConversionMode = 'pyeongToMeter' | 'meterToPyeong'

const PYEONG_TO_M2 = 3.305785
const PYEONG_TO_FT2 = 35.5832

const QUICK_VALUES = [5, 8, 10, 15, 18, 20, 24, 25, 30, 32, 34, 40, 50, 60]

interface RoomSize {
  name: string
  min: number
  max: number
  color: string
  bgColor: string
  darkBgColor: string
}

// Quick reference table rows: [label, pyeong, m2]
const QUICK_REF_ROWS: [string, number, number][] = [
  ['10평', 10, 33.06],
  ['20평', 20, 66.12],
  ['25평', 25, 82.64],
  ['30평', 30, 99.17],
  ['33평', 33, 109.09],
  ['40평', 40, 132.23],
  ['50평', 50, 165.29],
  ['59㎡', 17.85, 59],
  ['84㎡', 25.42, 84],
]

export default function PyeongCalculator() {
  const t = useTranslations('pyeongCalculator')
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // Initialise from URL params
  const initialMode = (searchParams.get('from') === 'sqm' ? 'meterToPyeong' : 'pyeongToMeter') as ConversionMode
  const initialValue = searchParams.get('value') ?? '24'

  const [mode, setMode] = useState<ConversionMode>(initialMode)
  const [inputValue, setInputValue] = useState<string>(initialValue)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [refTableOpen, setRefTableOpen] = useState(false)

  // Track whether we are the first render so we do not push URL on mount
  const isFirstRender = useRef(true)

  // Sync URL params whenever mode / inputValue changes (skip first render)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    const params = new URLSearchParams(searchParams.toString())
    params.set('value', inputValue)
    params.set('from', mode === 'pyeongToMeter' ? 'pyeong' : 'sqm')
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [inputValue, mode]) // eslint-disable-line react-hooks/exhaustive-deps

  const copyToClipboard = useCallback(async (text: string, id: string) => {
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
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }, [])

  const copyCurrentURL = useCallback(() => {
    copyToClipboard(window.location.href, 'link')
  }, [copyToClipboard])

  const { pyeong, m2, ft2 } = useMemo(() => {
    const num = parseFloat(inputValue) || 0

    if (mode === 'pyeongToMeter') {
      return {
        pyeong: num,
        m2: num * PYEONG_TO_M2,
        ft2: num * PYEONG_TO_FT2
      }
    } else {
      return {
        pyeong: num / PYEONG_TO_M2,
        m2: num,
        ft2: num * (PYEONG_TO_FT2 / PYEONG_TO_M2)
      }
    }
  }, [inputValue, mode])

  const roomSizes: RoomSize[] = useMemo(() => [
    {
      name: t('sizes.studio'),
      min: 5,
      max: 8,
      color: 'text-pink-600 dark:text-pink-400',
      bgColor: 'bg-pink-50',
      darkBgColor: 'dark:bg-pink-950'
    },
    {
      name: t('sizes.small'),
      min: 15,
      max: 20,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50',
      darkBgColor: 'dark:bg-blue-950'
    },
    {
      name: t('sizes.medium'),
      min: 25,
      max: 34,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50',
      darkBgColor: 'dark:bg-green-950'
    },
    {
      name: t('sizes.large'),
      min: 40,
      max: 60,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50',
      darkBgColor: 'dark:bg-purple-950'
    }
  ], [t])

  const handleQuickValue = (value: number) => {
    setInputValue(value.toString())
  }

  const handleReset = () => {
    setInputValue('24')
  }

  const maxPyeongForComparison = Math.max(pyeong, 60)

  // Visual size comparison: scale largest ref box to MAX_BOX_PX
  const MAX_BOX_PX = 160
  const REF_PYEONG = 33 // baseline: 33평 apartment
  const currentSidePx = Math.min(
    Math.sqrt((pyeong / REF_PYEONG)) * MAX_BOX_PX,
    MAX_BOX_PX * 2
  )
  const refSidePx = MAX_BOX_PX

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Ruler className="w-7 h-7 text-blue-600" />
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Panel: Settings */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
            {/* Mode Tabs */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                변환 모드
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setMode('pyeongToMeter')}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    mode === 'pyeongToMeter'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {t('pyeongToSqm')}
                </button>
                <button
                  onClick={() => setMode('meterToPyeong')}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    mode === 'meterToPyeong'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {t('sqmToPyeong')}
                </button>
              </div>
            </div>

            {/* Input Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {mode === 'pyeongToMeter' ? t('inputPyeong') : t('inputSqm')}
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                  step="0.01"
                />
                <button
                  onClick={handleReset}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  title={t('reset')}
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Value Buttons */}
            {mode === 'pyeongToMeter' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('quickValues')}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {QUICK_VALUES.map((value) => (
                    <button
                      key={value}
                      onClick={() => handleQuickValue(value)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        parseFloat(inputValue) === value
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Formula Display */}
            <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                변환 공식
              </h3>
              <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                <p>{t('formula')}</p>
              </div>
            </div>

            {/* Copy Link Button */}
            <button
              onClick={copyCurrentURL}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
            >
              {copiedId === 'link' ? (
                <>
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-green-600 dark:text-green-400">링크 복사됨!</span>
                </>
              ) : (
                <>
                  <Link className="w-4 h-4" />
                  <span>링크 복사</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Panel: Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Result Cards */}
          <div className="grid md:grid-cols-3 gap-4">
            {/* Pyeong Result */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium opacity-90">{t('pyeong')}</span>
                <button
                  onClick={() => copyToClipboard(pyeong.toFixed(2), 'pyeong')}
                  className="p-1.5 hover:bg-white/20 rounded transition-colors"
                  title={t('copy')}
                >
                  {copiedId === 'pyeong' ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              <div className="text-3xl font-bold mb-1">
                {pyeong.toFixed(2)}
              </div>
              <div className="text-sm opacity-90">{t('pyeong')}</div>
            </div>

            {/* Square Meter Result */}
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium opacity-90">{t('sqm')}</span>
                <button
                  onClick={() => copyToClipboard(m2.toFixed(2), 'm2')}
                  className="p-1.5 hover:bg-white/20 rounded transition-colors"
                  title={t('copy')}
                >
                  {copiedId === 'm2' ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              <div className="text-3xl font-bold mb-1">
                {m2.toFixed(2)}
              </div>
              <div className="text-sm opacity-90">{t('sqm')}</div>
            </div>

            {/* Square Feet Result */}
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium opacity-90">{t('sqft')}</span>
                <button
                  onClick={() => copyToClipboard(ft2.toFixed(2), 'ft2')}
                  className="p-1.5 hover:bg-white/20 rounded transition-colors"
                  title={t('copy')}
                >
                  {copiedId === 'ft2' ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              <div className="text-3xl font-bold mb-1">
                {ft2.toFixed(2)}
              </div>
              <div className="text-sm opacity-90">{t('sqft')}</div>
            </div>
          </div>

          {/* Visual Size Comparison (CSS squares) */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              면적 시각화
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
              기준: 33평 (109㎡) 아파트 대비 현재 면적
            </p>
            <div className="flex items-end gap-6 flex-wrap">
              {/* Current area square */}
              <div className="flex flex-col items-center gap-2">
                <div
                  className="bg-blue-500/20 dark:bg-blue-400/20 border-2 border-blue-500 dark:border-blue-400 rounded-md transition-all duration-300 flex items-center justify-center"
                  style={{ width: `${currentSidePx}px`, height: `${currentSidePx}px`, minWidth: '20px', minHeight: '20px' }}
                >
                  <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 text-center px-1">
                    {pyeong.toFixed(1)}평
                  </span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">현재</span>
              </div>

              {/* Reference square (33평) */}
              <div className="flex flex-col items-center gap-2">
                <div
                  className="bg-gray-200 dark:bg-gray-600 border-2 border-gray-400 dark:border-gray-500 rounded-md flex items-center justify-center"
                  style={{ width: `${refSidePx}px`, height: `${refSidePx}px` }}
                >
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 text-center px-1">
                    33평<br/>(기준)
                  </span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">기준</span>
              </div>

              {/* Ratio label */}
              <div className="flex flex-col justify-center">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {((pyeong / REF_PYEONG) * 100).toFixed(0)}%
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">33평 대비</p>
              </div>
            </div>

            {/* Bar chart comparison */}
            <div className="mt-6 space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    현재 값
                  </span>
                  <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                    {pyeong.toFixed(2)} {t('pyeong')}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-4 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min((pyeong / maxPyeongForComparison) * 100, 100)}%` }}
                  />
                </div>
              </div>

              {roomSizes.map((room) => {
                const avgPyeong = (room.min + room.max) / 2
                return (
                  <div key={room.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {room.name}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-500">
                        {avgPyeong.toFixed(0)} {t('pyeong')}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-gray-400 dark:bg-gray-500 h-2 rounded-full"
                        style={{ width: `${Math.min((avgPyeong / maxPyeongForComparison) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Room Size Reference */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Home className="w-5 h-5 text-blue-600" />
              {t('roomSize')}
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {roomSizes.map((room) => (
                <div
                  key={room.name}
                  className={`${room.bgColor} ${room.darkBgColor} rounded-lg p-4 border-2 ${
                    pyeong >= room.min && pyeong <= room.max
                      ? 'border-blue-500 dark:border-blue-400'
                      : 'border-transparent'
                  }`}
                >
                  <div className={`font-semibold ${room.color} mb-2`}>
                    {room.name}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {room.min}-{room.max} {t('pyeong')}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-500">
                    {(room.min * PYEONG_TO_M2).toFixed(1)}-{(room.max * PYEONG_TO_M2).toFixed(1)} {t('sqm')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Reference Table (collapsible) */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <button
          onClick={() => setRefTableOpen((v) => !v)}
          className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <span className="text-lg font-semibold text-gray-900 dark:text-white">
            자주 쓰는 평수 변환표
          </span>
          {refTableOpen ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>

        {refTableOpen && (
          <div className="px-6 pb-6">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              클릭하면 해당 값으로 바로 계산합니다.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 pr-4 font-semibold text-gray-700 dark:text-gray-300">구분</th>
                    <th className="text-right py-2 px-4 font-semibold text-blue-700 dark:text-blue-300">평 (坪)</th>
                    <th className="text-right py-2 pl-4 font-semibold text-green-700 dark:text-green-300">제곱미터 (㎡)</th>
                  </tr>
                </thead>
                <tbody>
                  {QUICK_REF_ROWS.map(([label, p, m]) => {
                    const isActive =
                      mode === 'pyeongToMeter'
                        ? Math.abs(parseFloat(inputValue) - p) < 0.01
                        : Math.abs(parseFloat(inputValue) - m) < 0.01
                    return (
                      <tr
                        key={label}
                        onClick={() => {
                          if (label.endsWith('㎡')) {
                            setMode('meterToPyeong')
                            setInputValue(String(m))
                          } else {
                            setMode('pyeongToMeter')
                            setInputValue(String(p))
                          }
                        }}
                        className={`border-b border-gray-100 dark:border-gray-700 cursor-pointer transition-colors ${
                          isActive
                            ? 'bg-blue-50 dark:bg-blue-950'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <td className="py-2.5 pr-4 font-medium text-gray-800 dark:text-gray-200">{label}</td>
                        <td className="py-2.5 px-4 text-right text-blue-700 dark:text-blue-300 font-mono">{p}</td>
                        <td className="py-2.5 pl-4 text-right text-green-700 dark:text-green-300 font-mono">{m}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-blue-600" />
          {t('guide.title')}
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {/* What is Pyeong */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
              {t('guide.what.title')}
            </h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              {(t.raw('guide.what.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Reference */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
              {t('guide.reference.title')}
            </h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              {(t.raw('guide.reference.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-green-600 dark:text-green-400 mt-0.5">•</span>
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
