'use client'

import { useState, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Car, Clock, Settings, BookOpen, Calculator, RotateCcw } from 'lucide-react'

interface FeeSettings {
  baseFee: number
  baseMinutes: number
  additionalFee: number
  additionalMinutes: number
  freeMinutes: number
  dailyMax: number
}

type ParkingType = 'public' | 'private' | 'apartment'

const presetConfigs: Record<string, FeeSettings> = {
  publicSeoul: {
    baseFee: 300,
    baseMinutes: 5,
    additionalFee: 300,
    additionalMinutes: 5,
    freeMinutes: 0,
    dailyMax: 30000,
  },
  privateAvg: {
    baseFee: 2000,
    baseMinutes: 30,
    additionalFee: 1000,
    additionalMinutes: 10,
    freeMinutes: 0,
    dailyMax: 50000,
  },
  department: {
    baseFee: 1000,
    baseMinutes: 10,
    additionalFee: 1000,
    additionalMinutes: 10,
    freeMinutes: 60,
    dailyMax: 0,
  },
}

export default function ParkingFee() {
  const t = useTranslations('parkingFee')
  const [parkingType, setParkingType] = useState<ParkingType>('public')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [manualHours, setManualHours] = useState(2)
  const [manualMinutes, setManualMinutes] = useState(30)
  const [useManualInput, setUseManualInput] = useState(true)
  const [settings, setSettings] = useState<FeeSettings>(presetConfigs.publicSeoul)

  const applyPreset = useCallback((presetKey: string) => {
    setSettings(presetConfigs[presetKey])
  }, [])

  const handleReset = useCallback(() => {
    setStartTime('')
    setEndTime('')
    setManualHours(2)
    setManualMinutes(30)
    setUseManualInput(true)
    setSettings(presetConfigs.publicSeoul)
    setParkingType('public')
  }, [])

  const updateSetting = useCallback((key: keyof FeeSettings, value: number) => {
    setSettings(prev => ({ ...prev, [key]: Math.max(0, value) }))
  }, [])

  const result = useMemo(() => {
    let totalMinutes = 0

    if (useManualInput) {
      totalMinutes = manualHours * 60 + manualMinutes
    } else {
      if (!startTime || !endTime) return null
      const start = new Date(startTime)
      const end = new Date(endTime)
      if (end <= start) return null
      totalMinutes = Math.floor((end.getTime() - start.getTime()) / 1000 / 60)
    }

    if (totalMinutes <= 0) return null

    // Subtract free time
    const chargedMinutes = Math.max(0, totalMinutes - settings.freeMinutes)

    if (chargedMinutes === 0) {
      return {
        totalMinutes,
        freeMinutes: settings.freeMinutes,
        chargedMinutes: 0,
        baseFee: 0,
        additionalFee: 0,
        totalFee: 0,
        dailyMaxApplied: false,
      }
    }

    // Base fee
    let fee = settings.baseFee

    // Additional fee
    const additionalMinutes = Math.max(0, chargedMinutes - settings.baseMinutes)
    const additionalUnits = Math.ceil(additionalMinutes / settings.additionalMinutes)
    const additionalFeeAmount = additionalUnits * settings.additionalFee

    fee += additionalFeeAmount

    // Apply daily max
    let dailyMaxApplied = false
    if (settings.dailyMax > 0 && fee > settings.dailyMax) {
      fee = settings.dailyMax
      dailyMaxApplied = true
    }

    return {
      totalMinutes,
      freeMinutes: settings.freeMinutes,
      chargedMinutes,
      baseFee: settings.baseFee,
      additionalFee: additionalFeeAmount,
      totalFee: fee,
      dailyMaxApplied,
    }
  }, [useManualInput, manualHours, manualMinutes, startTime, endTime, settings])

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return `${h}${t('hours')} ${m}${t('minutes')}`
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Car className="w-7 h-7" />
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: Settings Panel */}
        <div className="lg:col-span-1 space-y-6">
          {/* Parking Type */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Car className="w-5 h-5" />
              {t('parkingType')}
            </h2>
            <div className="grid grid-cols-1 gap-2">
              {(['public', 'private', 'apartment'] as ParkingType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setParkingType(type)}
                  className={`px-4 py-3 rounded-lg font-medium transition-all ${
                    parkingType === type
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {t(`types.${type}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Time Input */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              {t('duration')}
            </h2>

            {/* Toggle between datetime and manual */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setUseManualInput(true)}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  useManualInput
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                직접 입력
              </button>
              <button
                onClick={() => setUseManualInput(false)}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  !useManualInput
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                시간 선택
              </button>
            </div>

            {useManualInput ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('hours')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={manualHours}
                    onChange={(e) => setManualHours(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('minutes')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={manualMinutes}
                    onChange={(e) => setManualMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('startTime')}
                  </label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('endTime')}
                  </label>
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Reset Button */}
          <button
            onClick={handleReset}
            className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-3 font-medium transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            {t('reset')}
          </button>
        </div>

        {/* Right: Fee Settings & Result */}
        <div className="lg:col-span-2 space-y-6">
          {/* Presets */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('presets.title')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => applyPreset('publicSeoul')}
                className="px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gradient-to-r hover:from-blue-600 hover:to-indigo-600 hover:text-white text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-all"
              >
                {t('presets.publicSeoul')}
              </button>
              <button
                onClick={() => applyPreset('privateAvg')}
                className="px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gradient-to-r hover:from-blue-600 hover:to-indigo-600 hover:text-white text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-all"
              >
                {t('presets.privateAvg')}
              </button>
              <button
                onClick={() => applyPreset('department')}
                className="px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gradient-to-r hover:from-blue-600 hover:to-indigo-600 hover:text-white text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-all"
              >
                {t('presets.department')}
              </button>
            </div>
          </div>

          {/* Fee Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              {t('settings.title')}
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.baseFee')}
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={settings.baseFee}
                  onChange={(e) => updateSetting('baseFee', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.baseMinutes')}
                </label>
                <input
                  type="number"
                  min="1"
                  value={settings.baseMinutes}
                  onChange={(e) => updateSetting('baseMinutes', parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.additionalFee')}
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={settings.additionalFee}
                  onChange={(e) => updateSetting('additionalFee', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.additionalMinutes')}
                </label>
                <input
                  type="number"
                  min="1"
                  value={settings.additionalMinutes}
                  onChange={(e) => updateSetting('additionalMinutes', parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.freeMinutes')}
                </label>
                <input
                  type="number"
                  min="0"
                  value={settings.freeMinutes}
                  onChange={(e) => updateSetting('freeMinutes', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.dailyMax')}
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={settings.dailyMax}
                  onChange={(e) => updateSetting('dailyMax', parseInt(e.target.value) || 0)}
                  placeholder="0 = 제한 없음"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Result */}
          {result && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                {t('result.title')}
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-700 dark:text-gray-300">{t('result.totalTime')}</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatTime(result.totalMinutes)}
                  </span>
                </div>
                {result.freeMinutes > 0 && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-gray-700 dark:text-gray-300">{t('result.freeTime')}</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      {formatTime(result.freeMinutes)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-700 dark:text-gray-300">{t('result.chargedTime')}</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatTime(result.chargedMinutes)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-700 dark:text-gray-300">{t('result.baseFee')}</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {result.baseFee.toLocaleString()}{t('result.won')}
                  </span>
                </div>
                {result.additionalFee > 0 && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-gray-700 dark:text-gray-300">{t('result.additionalFee')}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {result.additionalFee.toLocaleString()}{t('result.won')}
                    </span>
                  </div>
                )}
                {result.dailyMaxApplied && (
                  <div className="py-2 px-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                    <span className="text-sm text-yellow-800 dark:text-yellow-200">
                      ⚠️ {t('result.dailyMax')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center py-3 mt-2 bg-white dark:bg-gray-800 rounded-lg px-4">
                  <span className="text-lg font-bold text-gray-900 dark:text-white">{t('result.total')}</span>
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {result.totalFee.toLocaleString()}{t('result.won')}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-6 h-6" />
          {t('guide.title')}
        </h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.structure.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.structure.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                  <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.tips.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.tips.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                  <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
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
