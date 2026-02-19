'use client'

import { useState, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Copy, Check, BookOpen, Percent, ArrowRightLeft, TrendingUp, PlusCircle, Trash2, RotateCcw } from 'lucide-react'

type Mode = 'basicPercent' | 'whatPercent' | 'change' | 'addSubtract'

interface HistoryItem {
  mode: Mode
  expression: string
  result: string
  timestamp: number
}

export default function PercentCalculator() {
  const t = useTranslations('percentCalculator')
  const [mode, setMode] = useState<Mode>('basicPercent')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])

  // Basic Percent: X의 Y%
  const [basicValue, setBasicValue] = useState('')
  const [basicPercent, setBasicPercent] = useState('')

  // What Percent: X는 Y의 몇%
  const [partValue, setPartValue] = useState('')
  const [wholeValue, setWholeValue] = useState('')

  // Change: 증감률
  const [fromValue, setFromValue] = useState('')
  const [toValue, setToValue] = useState('')

  // Add/Subtract
  const [addSubValue, setAddSubValue] = useState('')
  const [addSubPercent, setAddSubPercent] = useState('')
  const [addSubMode, setAddSubMode] = useState<'add' | 'subtract'>('add')

  const resultRef = useRef<HTMLDivElement>(null)

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

  const formatNumber = (num: number): string => {
    if (Number.isInteger(num)) return num.toLocaleString()
    // 소수점 이하 불필요한 0 제거, 최대 4자리
    const rounded = Math.round(num * 10000) / 10000
    return rounded.toLocaleString(undefined, { maximumFractionDigits: 4 })
  }

  const addToHistory = useCallback((mode: Mode, expression: string, result: string) => {
    setHistory(prev => [{
      mode,
      expression,
      result,
      timestamp: Date.now()
    }, ...prev].slice(0, 20))
  }, [])

  // 기본 퍼센트 계산
  const basicResult = (() => {
    const v = parseFloat(basicValue)
    const p = parseFloat(basicPercent)
    if (isNaN(v) || isNaN(p)) return null
    return v * p / 100
  })()

  // 비율 계산
  const whatPercentResult = (() => {
    const part = parseFloat(partValue)
    const whole = parseFloat(wholeValue)
    if (isNaN(part) || isNaN(whole) || whole === 0) return null
    return (part / whole) * 100
  })()

  // 증감률 계산
  const changeResult = (() => {
    const from = parseFloat(fromValue)
    const to = parseFloat(toValue)
    if (isNaN(from) || isNaN(to) || from === 0) return null
    const change = ((to - from) / Math.abs(from)) * 100
    return { percent: change, difference: to - from }
  })()

  // 추가/차감 계산
  const addSubResult = (() => {
    const v = parseFloat(addSubValue)
    const p = parseFloat(addSubPercent)
    if (isNaN(v) || isNaN(p)) return null
    const amount = v * p / 100
    return {
      addResult: v + amount,
      subtractResult: v - amount,
      amount
    }
  })()

  const handleSaveToHistory = useCallback(() => {
    if (mode === 'basicPercent' && basicResult !== null) {
      addToHistory('basicPercent', `${basicValue}의 ${basicPercent}%`, formatNumber(basicResult))
    } else if (mode === 'whatPercent' && whatPercentResult !== null) {
      addToHistory('whatPercent', `${partValue}는 ${wholeValue}의 ?%`, `${formatNumber(whatPercentResult)}%`)
    } else if (mode === 'change' && changeResult !== null) {
      addToHistory('change', `${fromValue} → ${toValue}`, `${formatNumber(changeResult.percent)}%`)
    } else if (mode === 'addSubtract' && addSubResult !== null) {
      const result = addSubMode === 'add' ? addSubResult.addResult : addSubResult.subtractResult
      const sign = addSubMode === 'add' ? '+' : '-'
      addToHistory('addSubtract', `${addSubValue} ${sign} ${addSubPercent}%`, formatNumber(result))
    }
  }, [mode, basicResult, basicValue, basicPercent, whatPercentResult, partValue, wholeValue, changeResult, fromValue, toValue, addSubResult, addSubValue, addSubPercent, addSubMode, addToHistory])

  const handleReset = useCallback(() => {
    setBasicValue('')
    setBasicPercent('')
    setPartValue('')
    setWholeValue('')
    setFromValue('')
    setToValue('')
    setAddSubValue('')
    setAddSubPercent('')
  }, [])

  const handleQuickPercent = useCallback((percent: number) => {
    if (mode === 'basicPercent') {
      setBasicPercent(String(percent))
    } else if (mode === 'addSubtract') {
      setAddSubPercent(String(percent))
    }
  }, [mode])

  const modeIcons: Record<Mode, React.ReactNode> = {
    basicPercent: <Percent className="w-4 h-4" />,
    whatPercent: <ArrowRightLeft className="w-4 h-4" />,
    change: <TrendingUp className="w-4 h-4" />,
    addSubtract: <PlusCircle className="w-4 h-4" />,
  }

  const modes: Mode[] = ['basicPercent', 'whatPercent', 'change', 'addSubtract']

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* 모드 탭 */}
      <div className="flex flex-wrap gap-2">
        {modes.map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
              mode === m
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
            }`}
          >
            {modeIcons[m]}
            {t(`modes.${m}`)}
          </button>
        ))}
      </div>

      {/* 메인 그리드 */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* 입력 패널 */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t(`${mode}.title`)}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t(`${mode}.description`)}
            </p>

            {/* 기본 퍼센트 */}
            {mode === 'basicPercent' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('basicPercent.valueLabel')}
                  </label>
                  <input
                    type="number"
                    value={basicValue}
                    onChange={(e) => setBasicValue(e.target.value)}
                    placeholder={t('common.placeholder')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('basicPercent.percentLabel')}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={basicPercent}
                      onChange={(e) => setBasicPercent(e.target.value)}
                      placeholder={t('common.placeholder')}
                      className="w-full px-3 py-2 pr-8 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">%</span>
                  </div>
                </div>
              </div>
            )}

            {/* 비율 계산 */}
            {mode === 'whatPercent' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('whatPercent.partLabel')}
                  </label>
                  <input
                    type="number"
                    value={partValue}
                    onChange={(e) => setPartValue(e.target.value)}
                    placeholder={t('common.placeholder')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('whatPercent.wholeLabel')}
                  </label>
                  <input
                    type="number"
                    value={wholeValue}
                    onChange={(e) => setWholeValue(e.target.value)}
                    placeholder={t('common.placeholder')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}

            {/* 증감률 */}
            {mode === 'change' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('change.fromLabel')}
                  </label>
                  <input
                    type="number"
                    value={fromValue}
                    onChange={(e) => setFromValue(e.target.value)}
                    placeholder={t('common.placeholder')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('change.toLabel')}
                  </label>
                  <input
                    type="number"
                    value={toValue}
                    onChange={(e) => setToValue(e.target.value)}
                    placeholder={t('common.placeholder')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}

            {/* 추가/차감 */}
            {mode === 'addSubtract' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('addSubtract.valueLabel')}
                  </label>
                  <input
                    type="number"
                    value={addSubValue}
                    onChange={(e) => setAddSubValue(e.target.value)}
                    placeholder={t('common.placeholder')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('addSubtract.percentLabel')}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={addSubPercent}
                      onChange={(e) => setAddSubPercent(e.target.value)}
                      placeholder={t('common.placeholder')}
                      className="w-full px-3 py-2 pr-8 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">%</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAddSubMode('add')}
                    className={`flex-1 py-2 rounded-lg font-medium text-sm transition-all ${
                      addSubMode === 'add'
                        ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 border-2 border-green-500'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-2 border-transparent'
                    }`}
                  >
                    {t('addSubtract.add')}
                  </button>
                  <button
                    onClick={() => setAddSubMode('subtract')}
                    className={`flex-1 py-2 rounded-lg font-medium text-sm transition-all ${
                      addSubMode === 'subtract'
                        ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 border-2 border-red-500'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-2 border-transparent'
                    }`}
                  >
                    {t('addSubtract.subtract')}
                  </button>
                </div>
              </div>
            )}

            {/* 빠른 퍼센트 버튼 */}
            {(mode === 'basicPercent' || mode === 'addSubtract') && (
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t('common.quickPercent')}</p>
                <div className="flex flex-wrap gap-2">
                  {[5, 10, 15, 20, 25, 30, 50, 75].map((p) => (
                    <button
                      key={p}
                      onClick={() => handleQuickPercent(p)}
                      className="px-3 py-1.5 text-xs font-medium rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                    >
                      {p}%
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 액션 버튼 */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSaveToHistory}
                disabled={
                  (mode === 'basicPercent' && basicResult === null) ||
                  (mode === 'whatPercent' && whatPercentResult === null) ||
                  (mode === 'change' && changeResult === null) ||
                  (mode === 'addSubtract' && addSubResult === null)
                }
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-2.5 font-medium hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm"
              >
                {t('common.calculate')}
              </button>
              <button
                onClick={handleReset}
                className="px-3 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                title={t('common.reset')}
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 활용 팁 */}
          <div className="bg-blue-50 dark:bg-blue-950/50 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-3">{t('common.tipTitle')}</h3>
            <ul className="space-y-2">
              {(t.raw('common.tips') as string[]).map((tip, i) => (
                <li key={i} className="text-xs text-blue-700 dark:text-blue-400 flex items-start gap-2">
                  <span className="mt-0.5 shrink-0">&#8226;</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 결과 패널 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 실시간 결과 */}
          <div ref={resultRef} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('common.result')}</h2>

            {/* 기본 퍼센트 결과 */}
            {mode === 'basicPercent' && (
              <div>
                {basicResult !== null ? (
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl p-6">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                        {formatNumber(parseFloat(basicValue))}{t('basicPercent.resultPrefix')} {basicPercent}{t('basicPercent.resultMiddle')}
                      </p>
                      <div className="flex items-center gap-3">
                        <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                          {formatNumber(basicResult)}
                        </p>
                        <button
                          onClick={() => copyToClipboard(String(Math.round(basicResult * 10000) / 10000), 'basic')}
                          className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                          title={t('common.copy')}
                        >
                          {copiedId === 'basic' ? (
                            <Check className="w-5 h-5 text-green-500" />
                          ) : (
                            <Copy className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* 관련 계산 미리보기 */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[10, 20, 30, 50].map((p) => {
                        const val = parseFloat(basicValue)
                        if (isNaN(val)) return null
                        return (
                          <div key={p} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                            <p className="text-xs text-gray-500 dark:text-gray-400">{p}%</p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                              {formatNumber(val * p / 100)}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <EmptyState />
                )}
              </div>
            )}

            {/* 비율 결과 */}
            {mode === 'whatPercent' && (
              <div>
                {whatPercentResult !== null ? (
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-xl p-6">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                        {formatNumber(parseFloat(partValue))} {t('whatPercent.resultPrefix')} {formatNumber(parseFloat(wholeValue))}{t('whatPercent.resultMiddle')}
                      </p>
                      <div className="flex items-center gap-3">
                        <p className="text-4xl font-bold text-purple-600 dark:text-purple-400">
                          {formatNumber(whatPercentResult)}%
                        </p>
                        <button
                          onClick={() => copyToClipboard(String(Math.round(whatPercentResult * 10000) / 10000), 'whatPercent')}
                          className="p-2 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
                          title={t('common.copy')}
                        >
                          {copiedId === 'whatPercent' ? (
                            <Check className="w-5 h-5 text-green-500" />
                          ) : (
                            <Copy className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* 비율 시각화 바 */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>0%</span>
                        <span>100%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-pink-500 h-4 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                          style={{ width: `${Math.min(whatPercentResult, 100)}%` }}
                        >
                          {whatPercentResult >= 15 && (
                            <span className="text-[10px] font-bold text-white">
                              {formatNumber(whatPercentResult)}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <EmptyState />
                )}
              </div>
            )}

            {/* 증감률 결과 */}
            {mode === 'change' && (
              <div>
                {changeResult !== null ? (
                  <div className="space-y-4">
                    <div className={`rounded-xl p-6 ${
                      changeResult.percent > 0
                        ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30'
                        : changeResult.percent < 0
                          ? 'bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30'
                          : 'bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-950/30 dark:to-slate-950/30'
                    }`}>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                        {formatNumber(parseFloat(fromValue))} {t('change.resultPrefix')} {formatNumber(parseFloat(toValue))} {t('change.resultMiddle')}
                      </p>
                      <div className="flex items-center gap-3">
                        <p className={`text-4xl font-bold ${
                          changeResult.percent > 0
                            ? 'text-green-600 dark:text-green-400'
                            : changeResult.percent < 0
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-gray-600 dark:text-gray-400'
                        }`}>
                          {changeResult.percent > 0 ? '+' : ''}{formatNumber(changeResult.percent)}%
                        </p>
                        <button
                          onClick={() => copyToClipboard(String(Math.round(changeResult.percent * 10000) / 10000), 'change')}
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          title={t('common.copy')}
                        >
                          {copiedId === 'change' ? (
                            <Check className="w-5 h-5 text-green-500" />
                          ) : (
                            <Copy className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                      </div>
                      <p className={`text-sm mt-2 font-medium ${
                        changeResult.percent > 0
                          ? 'text-green-600 dark:text-green-400'
                          : changeResult.percent < 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {changeResult.percent > 0
                          ? t('change.increase')
                          : changeResult.percent < 0
                            ? t('change.decrease')
                            : t('change.noChange')}
                      </p>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t('change.difference')}</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                        {changeResult.difference > 0 ? '+' : ''}{formatNumber(changeResult.difference)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <EmptyState />
                )}
              </div>
            )}

            {/* 추가/차감 결과 */}
            {mode === 'addSubtract' && (
              <div>
                {addSubResult !== null ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* 추가 결과 */}
                      <div className={`rounded-xl p-5 ${
                        addSubMode === 'add'
                          ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 ring-2 ring-green-500/30'
                          : 'bg-gray-50 dark:bg-gray-700/50'
                      }`}>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('addSubtract.addResult')}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {formatNumber(addSubResult.addResult)}
                          </p>
                          <button
                            onClick={() => copyToClipboard(String(Math.round(addSubResult.addResult * 10000) / 10000), 'addResult')}
                            className="p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
                          >
                            {copiedId === 'addResult' ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          (+{formatNumber(addSubResult.amount)})
                        </p>
                      </div>

                      {/* 차감 결과 */}
                      <div className={`rounded-xl p-5 ${
                        addSubMode === 'subtract'
                          ? 'bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 ring-2 ring-red-500/30'
                          : 'bg-gray-50 dark:bg-gray-700/50'
                      }`}>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('addSubtract.subtractResult')}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                            {formatNumber(addSubResult.subtractResult)}
                          </p>
                          <button
                            onClick={() => copyToClipboard(String(Math.round(addSubResult.subtractResult * 10000) / 10000), 'subResult')}
                            className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                          >
                            {copiedId === 'subResult' ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          (-{formatNumber(addSubResult.amount)})
                        </p>
                      </div>
                    </div>

                    {/* 비교 요약 */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">
                          {addSubMode === 'add' ? t('addSubtract.addedAmount') : t('addSubtract.subtractedAmount')}
                        </span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {formatNumber(addSubResult.amount)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <EmptyState />
                )}
              </div>
            )}
          </div>

          {/* 계산 기록 */}
          {history.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('common.history')}</h2>
                <button
                  onClick={() => setHistory([])}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {t('common.clearHistory')}
                </button>
              </div>
              <div className="space-y-2">
                {history.map((item, i) => (
                  <div
                    key={item.timestamp}
                    className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs text-gray-400 dark:text-gray-500 w-5 text-right shrink-0">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{item.expression}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{item.result}</span>
                      <button
                        onClick={() => copyToClipboard(item.result.replace(/,/g, ''), `history-${i}`)}
                        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                      >
                        {copiedId === `history-${i}` ? (
                          <Check className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 가이드 섹션 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          {t('guide.title')}
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {(['basicPercent', 'whatPercent', 'change', 'addSubtract'] as const).map((section) => (
            <div key={section} className="space-y-3">
              <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                {modeIcons[section]}
                {t(`guide.${section}.title`)}
              </h3>
              <ul className="space-y-1.5">
                {(t.raw(`guide.${section}.items`) as string[]).map((item, i) => (
                  <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5 shrink-0">&#8226;</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-12">
      <Percent className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
      <p className="text-gray-400 dark:text-gray-500 text-sm">
        값을 입력하면 실시간으로 결과가 표시됩니다
      </p>
    </div>
  )
}
