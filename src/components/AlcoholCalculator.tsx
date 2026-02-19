'use client'

import { useState, useMemo, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Wine, Plus, Trash2, AlertTriangle, Clock, BookOpen, Calculator } from 'lucide-react'

interface Drink {
  id: string
  type: 'soju' | 'beer' | 'wine' | 'makgeolli' | 'whiskey' | 'custom'
  amount: number
  alcoholPercent: number
}

const DRINK_PRESETS = {
  soju: { alcoholPercent: 16.5, defaultAmount: 50 },
  beer: { alcoholPercent: 4.5, defaultAmount: 355 },
  wine: { alcoholPercent: 13, defaultAmount: 150 },
  makgeolli: { alcoholPercent: 6, defaultAmount: 300 },
  whiskey: { alcoholPercent: 40, defaultAmount: 45 },
  custom: { alcoholPercent: 5, defaultAmount: 100 },
}

const QUICK_ADD_PRESETS = [
  { type: 'soju' as const, amount: 50, key: 'sojuGlass' },
  { type: 'soju' as const, amount: 360, key: 'sojuBottle' },
  { type: 'beer' as const, amount: 355, key: 'beerGlass' },
  { type: 'beer' as const, amount: 500, key: 'beerBottle' },
  { type: 'wine' as const, amount: 150, key: 'wineGlass' },
]

export default function AlcoholCalculator() {
  const t = useTranslations('alcoholCalculator')

  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [weight, setWeight] = useState<number>(70)
  const [drinks, setDrinks] = useState<Drink[]>([])
  const [drinkingDuration, setDrinkingDuration] = useState<number>(2)
  const [timeSinceDrinking, setTimeSinceDrinking] = useState<number>(0)
  const [showResult, setShowResult] = useState(false)

  const addDrink = useCallback((type: Drink['type'], customAmount?: number) => {
    const preset = DRINK_PRESETS[type]
    const newDrink: Drink = {
      id: Date.now().toString() + Math.random(),
      type,
      amount: customAmount ?? preset.defaultAmount,
      alcoholPercent: preset.alcoholPercent,
    }
    setDrinks(prev => [...prev, newDrink])
  }, [])

  const removeDrink = useCallback((id: string) => {
    setDrinks(prev => prev.filter(d => d.id !== id))
  }, [])

  const updateDrink = useCallback((id: string, field: keyof Drink, value: any) => {
    setDrinks(prev => prev.map(d => {
      if (d.id !== id) return d
      const updated = { ...d, [field]: value }
      if (field === 'type' && value !== 'custom') {
        const preset = DRINK_PRESETS[value as Drink['type']]
        updated.alcoholPercent = preset.alcoholPercent
        updated.amount = preset.defaultAmount
      }
      return updated
    }))
  }, [])

  const { peakBAC, currentBAC, soberTimeHours, status } = useMemo(() => {
    if (drinks.length === 0 || weight <= 0) {
      return { peakBAC: 0, currentBAC: 0, soberTimeHours: 0, status: 'sober' as const }
    }

    // Calculate total alcohol in grams
    const totalAlcohol = drinks.reduce((sum, drink) => {
      return sum + (drink.amount * (drink.alcoholPercent / 100) * 0.7894)
    }, 0)

    // Body water ratio
    const bodyWaterRatio = gender === 'male' ? 0.68 : 0.55

    // Peak BAC using Widmark formula
    const peakBAC = (totalAlcohol / (weight * bodyWaterRatio * 1000)) * 100

    // Current BAC after metabolism (0.015% per hour)
    const currentBAC = Math.max(0, peakBAC - (timeSinceDrinking * 0.015))

    // Time until sober
    const soberTimeHours = currentBAC / 0.015

    // Determine status
    let status: 'sober' | 'buzzed' | 'drunk' | 'veryDrunk' | 'dangerous'
    if (currentBAC === 0) status = 'sober'
    else if (currentBAC < 0.03) status = 'buzzed'
    else if (currentBAC < 0.08) status = 'drunk'
    else if (currentBAC < 0.15) status = 'veryDrunk'
    else status = 'dangerous'

    return { peakBAC, currentBAC, soberTimeHours, status }
  }, [drinks, weight, gender, timeSinceDrinking])

  const handleCalculate = () => {
    setShowResult(true)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sober': return 'text-green-600 dark:text-green-400'
      case 'buzzed': return 'text-yellow-600 dark:text-yellow-400'
      case 'drunk': return 'text-orange-600 dark:text-orange-400'
      case 'veryDrunk': return 'text-red-600 dark:text-red-400'
      case 'dangerous': return 'text-red-700 dark:text-red-300'
      default: return 'text-gray-600 dark:text-gray-400'
    }
  }

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'sober': return 'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200'
      case 'buzzed': return 'bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-200'
      case 'drunk': return 'bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-200'
      case 'veryDrunk': return 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200'
      case 'dangerous': return 'bg-red-200 dark:bg-red-900 text-red-900 dark:text-red-100'
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
    }
  }

  const getWarningBgColor = (status: string) => {
    if (status === 'dangerous' || status === 'veryDrunk') {
      return 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
    } else if (status === 'drunk') {
      return 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800'
    } else if (status === 'buzzed') {
      return 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800'
    }
    return 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800'
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Panel - Input */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
            {/* Gender Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('gender')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setGender('male')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    gender === 'male'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {t('male')}
                </button>
                <button
                  onClick={() => setGender('female')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    gender === 'female'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {t('female')}
                </button>
              </div>
            </div>

            {/* Weight Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('weight')}
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(Math.max(0, Number(e.target.value)))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  min="0"
                  step="1"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                  kg
                </span>
              </div>
            </div>

            {/* Drinks List */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('drinks')}
                </label>
                <button
                  onClick={() => addDrink('soju')}
                  className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  <Plus className="w-3 h-3" />
                  {t('addDrink')}
                </button>
              </div>

              {drinks.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                  주류를 추가해주세요
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {drinks.map((drink) => (
                    <div key={drink.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <select
                          value={drink.type}
                          onChange={(e) => updateDrink(drink.id, 'type', e.target.value)}
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
                        >
                          <option value="soju">{t('drinkTypes.soju')}</option>
                          <option value="beer">{t('drinkTypes.beer')}</option>
                          <option value="wine">{t('drinkTypes.wine')}</option>
                          <option value="makgeolli">{t('drinkTypes.makgeolli')}</option>
                          <option value="whiskey">{t('drinkTypes.whiskey')}</option>
                          <option value="custom">{t('drinkTypes.custom')}</option>
                        </select>
                        <button
                          onClick={() => removeDrink(drink.id)}
                          className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-600 dark:text-gray-400">
                            {t('amount')}
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              value={drink.amount}
                              onChange={(e) => updateDrink(drink.id, 'amount', Number(e.target.value))}
                              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
                              min="0"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400">
                              ml
                            </span>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 dark:text-gray-400">
                            {t('alcoholPercent')}
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              value={drink.alcoholPercent}
                              onChange={(e) => updateDrink(drink.id, 'alcoholPercent', Number(e.target.value))}
                              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
                              min="0"
                              max="100"
                              step="0.1"
                              disabled={drink.type !== 'custom'}
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400">
                              %
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Add Buttons */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                빠른 추가
              </label>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_ADD_PRESETS.map((preset) => (
                  <button
                    key={preset.key}
                    onClick={() => addDrink(preset.type, preset.amount)}
                    className="px-3 py-2 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                  >
                    {t(`drinkUnits.${preset.key}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Timing Inputs */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('drinkingDuration')}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={drinkingDuration}
                    onChange={(e) => setDrinkingDuration(Math.max(0, Number(e.target.value)))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    min="0"
                    step="0.5"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                    {t('hours')}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('timeSinceDrinking')}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={timeSinceDrinking}
                    onChange={(e) => setTimeSinceDrinking(Math.max(0, Number(e.target.value)))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    min="0"
                    step="0.5"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                    {t('hours')}
                  </span>
                </div>
              </div>
            </div>

            {/* Calculate Button */}
            <button
              onClick={handleCalculate}
              disabled={drinks.length === 0}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Calculator className="w-5 h-5" />
              {t('calculate')}
            </button>
          </div>
        </div>

        {/* Right Panel - Results */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
            {!showResult || drinks.length === 0 ? (
              <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                주류를 추가하고 계산해주세요
              </div>
            ) : (
              <>
                {/* BAC Display */}
                <div className="text-center">
                  <div className={`inline-flex flex-col items-center justify-center w-48 h-48 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 shadow-lg ${getStatusColor(status)}`}>
                    <div className="text-5xl font-bold">
                      {currentBAC.toFixed(3)}%
                    </div>
                    <div className="text-sm mt-2 opacity-75">
                      {t('bac')}
                    </div>
                  </div>
                  <div className={`inline-block mt-4 px-4 py-2 rounded-full text-sm font-medium ${getStatusBgColor(status)}`}>
                    {t(status)}
                  </div>
                </div>

                {/* Legal Limits Visual */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('legal')}
                  </h3>

                  {/* 0.03% Limit */}
                  <div>
                    <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                      <span>{t('driveLimit')}</span>
                      <span>0.03%</span>
                    </div>
                    <div className="relative h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="absolute h-full bg-yellow-500 transition-all duration-500"
                        style={{ width: `${Math.min(100, (currentBAC / 0.03) * 100)}%` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-900 dark:text-white">
                        {currentBAC >= 0.03 ? '초과' : '이내'}
                      </div>
                    </div>
                  </div>

                  {/* 0.08% Limit */}
                  <div>
                    <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                      <span>{t('driveRevoke')}</span>
                      <span>0.08%</span>
                    </div>
                    <div className="relative h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="absolute h-full bg-red-500 transition-all duration-500"
                        style={{ width: `${Math.min(100, (currentBAC / 0.08) * 100)}%` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-900 dark:text-white">
                        {currentBAC >= 0.08 ? '초과' : '이내'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sober Time */}
                <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {t('soberTime')}
                      </div>
                      <div className="text-xl font-bold text-gray-900 dark:text-white">
                        {currentBAC === 0
                          ? t('sober')
                          : `${soberTimeHours.toFixed(1)}시간`
                        }
                      </div>
                    </div>
                  </div>
                </div>

                {/* Warning */}
                <div className={`border-2 rounded-xl p-4 ${getWarningBgColor(status)}`}>
                  <div className="flex gap-3">
                    <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {t('warning')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Peak BAC Info */}
                {timeSinceDrinking > 0 && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
                    최고 BAC: {peakBAC.toFixed(3)}%
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-6 h-6" />
          {t('guide.title')}
        </h2>

        <div className="space-y-6">
          {/* Formula */}
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">
              {t('guide.formula.title')}
            </h3>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2 text-sm text-gray-700 dark:text-gray-300">
              {(t.raw('guide.formula.items') as string[]).map((item, idx) => (
                <p key={idx}>• {item}</p>
              ))}
            </div>
          </div>

          {/* Factors */}
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">
              {t('guide.factors.title')}
            </h3>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2 text-sm text-gray-700 dark:text-gray-300">
              {(t.raw('guide.factors.items') as string[]).map((item, idx) => (
                <p key={idx}>• {item}</p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
