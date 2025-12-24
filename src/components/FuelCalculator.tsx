'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  Car,
  Fuel,
  Calculator,
  MapPin,
  DollarSign,
  TrendingDown,
  Copy,
  Check,
  Download,
  Clock,
  Zap,
  Edit3,
  Save,
  X,
  FileText,
  Shield,
  TrendingUp,
  Wrench,
  BookOpen,
  ExternalLink,
  Plus,
  Trash2,
  Upload
} from 'lucide-react'
import { useCalculationHistory } from '@/hooks/useCalculationHistory'
import CalculationHistory from '@/components/CalculationHistory'
import { safeStorage, STORAGE_KEYS } from '@/utils/localStorage'

interface FuelCalculation {
  distance: number
  fuelConsumption: number
  fuelCost: number
  depreciationCost: number
  totalCost: number
  costPerKm: number
}

interface VehicleType {
  id: string
  category: '경차' | '소형차' | '중형차' | '대형차' | 'SUV' | '승합차' | '화물차'
  efficiency: number // km/L
  depreciation: number // 원/km
}

interface VehicleSettings {
  vehicleType: string
  fuelType: 'gasoline' | 'diesel' | 'lpg'
  customEfficiency: number
  useCustomEfficiency: boolean
  fuelPrices: {
    gasoline: number
    diesel: number
    lpg: number
  }
  savedAt: string
}

interface DrivingLogEntry {
  id: string
  date: string
  distance: number
  tollFee: number
  parkingFee: number
  memo: string
}

const FuelCalculator = () => {
  const t = useTranslations('fuelCalculator')
  const tc = useTranslations('common')

  // Tab state
  const [activeTab, setActiveTab] = useState<'calculator' | 'drivingLog'>('calculator')

  // Calculator state
  const [distance, setDistance] = useState<number>(0)
  const [vehicleType, setVehicleType] = useState<string>('compact')
  const [fuelType, setFuelType] = useState<'gasoline' | 'diesel' | 'lpg'>('gasoline')
  const [customEfficiency, setCustomEfficiency] = useState<number>(0)
  const [useCustomEfficiency, setUseCustomEfficiency] = useState(false)
  const [calculation, setCalculation] = useState<FuelCalculation | null>(null)
  const [isCopied, setIsCopied] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [fuelPrices, setFuelPrices] = useState({
    gasoline: 1600,
    diesel: 1400,
    lpg: 900
  })
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [isEditingPrices, setIsEditingPrices] = useState(false)
  const [tempPrices, setTempPrices] = useState(fuelPrices)

  // Vehicle settings state
  const [hasVehicleSettings, setHasVehicleSettings] = useState(false)
  const [settingsFeedback, setSettingsFeedback] = useState<string | null>(null)

  // Driving log state
  const [drivingLogs, setDrivingLogs] = useState<DrivingLogEntry[]>([])
  const [newLogEntry, setNewLogEntry] = useState<Omit<DrivingLogEntry, 'id'>>({
    date: new Date().toISOString().slice(0, 10),
    distance: 0,
    tollFee: 0,
    parkingFee: 0,
    memo: ''
  })

  // Calculation history hook
  const {
    histories,
    isLoading: historyLoading,
    saveCalculation,
    removeHistory,
    clearHistories,
    loadFromHistory
  } = useCalculationHistory('fuel')

  // 차종별 연비 및 감가상각비 데이터
  const vehicleTypes: Record<string, VehicleType> = useMemo(() => ({
    light: {
      id: 'light',
      category: '경차',
      efficiency: 16.0,
      depreciation: 80
    },
    compact: {
      id: 'compact',
      category: '소형차',
      efficiency: 14.5,
      depreciation: 100
    },
    midsize: {
      id: 'midsize',
      category: '중형차',
      efficiency: 12.0,
      depreciation: 130
    },
    fullsize: {
      id: 'fullsize',
      category: '대형차',
      efficiency: 10.5,
      depreciation: 160
    },
    suv: {
      id: 'suv',
      category: 'SUV',
      efficiency: 9.5,
      depreciation: 180
    },
    van: {
      id: 'van',
      category: '승합차',
      efficiency: 8.5,
      depreciation: 200
    },
    truck: {
      id: 'truck',
      category: '화물차',
      efficiency: 7.0,
      depreciation: 250
    }
  }), [])

  // Load vehicle settings and driving logs on mount
  useEffect(() => {
    // Load vehicle settings
    const savedSettings = safeStorage.getItem(STORAGE_KEYS.VEHICLE_SETTINGS)
    if (savedSettings) {
      setHasVehicleSettings(true)
    }

    // Load driving logs
    const savedLogs = safeStorage.getItem(STORAGE_KEYS.DRIVING_LOG)
    if (savedLogs) {
      try {
        const parsed = JSON.parse(savedLogs)
        setDrivingLogs(parsed)
      } catch (e) {
        console.warn('Failed to parse driving logs:', e)
      }
    }
  }, [])

  // 연비 조정
  const getAdjustedEfficiency = useCallback((baseEfficiency: number, fuel: string): number => {
    switch (fuel) {
      case 'diesel':
        return baseEfficiency * 1.18
      case 'lpg':
        return baseEfficiency * 0.9
      default:
        return baseEfficiency
    }
  }, [])

  // 유류비 계산
  const calculateFuelCost = useCallback(() => {
    if (distance <= 0) {
      setCalculation(null)
      return
    }

    const selectedVehicle = vehicleTypes[vehicleType]
    const efficiency = useCustomEfficiency && customEfficiency > 0
      ? customEfficiency
      : getAdjustedEfficiency(selectedVehicle.efficiency, fuelType)

    const fuelPrice = fuelPrices[fuelType]
    const fuelConsumption = distance / efficiency
    const fuelCost = fuelConsumption * fuelPrice
    const depreciationCost = distance * selectedVehicle.depreciation
    const totalCost = fuelCost + depreciationCost
    const costPerKm = totalCost / distance

    const result: FuelCalculation = {
      distance,
      fuelConsumption,
      fuelCost,
      depreciationCost,
      totalCost,
      costPerKm
    }

    setCalculation(result)
  }, [distance, vehicleType, fuelType, customEfficiency, useCustomEfficiency, fuelPrices, vehicleTypes, getAdjustedEfficiency])

  // Manual fuel price editing
  const startEditingPrices = useCallback(() => {
    setTempPrices(fuelPrices)
    setIsEditingPrices(true)
  }, [fuelPrices])

  const savePrices = useCallback(() => {
    setFuelPrices(tempPrices)
    setLastUpdated(new Date())
    setIsEditingPrices(false)
  }, [tempPrices])

  const cancelEditingPrices = useCallback(() => {
    setTempPrices(fuelPrices)
    setIsEditingPrices(false)
  }, [fuelPrices])

  // Vehicle settings functions
  const saveVehicleSettings = useCallback(() => {
    const settings: VehicleSettings = {
      vehicleType,
      fuelType,
      customEfficiency,
      useCustomEfficiency,
      fuelPrices,
      savedAt: new Date().toISOString()
    }

    const success = safeStorage.setItem(STORAGE_KEYS.VEHICLE_SETTINGS, JSON.stringify(settings))
    if (success) {
      setHasVehicleSettings(true)
      setSettingsFeedback(t('vehicleSettings.saved'))
      setTimeout(() => setSettingsFeedback(null), 2000)
    }
  }, [vehicleType, fuelType, customEfficiency, useCustomEfficiency, fuelPrices, t])

  const loadVehicleSettings = useCallback(() => {
    const savedSettings = safeStorage.getItem(STORAGE_KEYS.VEHICLE_SETTINGS)
    if (savedSettings) {
      try {
        const settings: VehicleSettings = JSON.parse(savedSettings)
        setVehicleType(settings.vehicleType)
        setFuelType(settings.fuelType)
        setCustomEfficiency(settings.customEfficiency)
        setUseCustomEfficiency(settings.useCustomEfficiency)
        setFuelPrices(settings.fuelPrices)
        setSettingsFeedback(t('vehicleSettings.loaded'))
        setTimeout(() => setSettingsFeedback(null), 2000)
      } catch (e) {
        console.warn('Failed to load vehicle settings:', e)
      }
    } else {
      setSettingsFeedback(t('vehicleSettings.noSaved'))
      setTimeout(() => setSettingsFeedback(null), 2000)
    }
  }, [t])

  const deleteVehicleSettings = useCallback(() => {
    if (window.confirm(t('vehicleSettings.confirmDelete'))) {
      safeStorage.removeItem(STORAGE_KEYS.VEHICLE_SETTINGS)
      setHasVehicleSettings(false)
      setSettingsFeedback(t('vehicleSettings.deleted'))
      setTimeout(() => setSettingsFeedback(null), 2000)
    }
  }, [t])

  // Load calculation from history
  const handleLoadFromHistory = useCallback((historyId: string) => {
    const inputs = loadFromHistory(historyId)
    if (inputs) {
      setDistance(inputs.distance || 0)
      setVehicleType(inputs.vehicleType || 'compact')
      setFuelType(inputs.fuelType || 'gasoline')
      setCustomEfficiency(inputs.customEfficiency || 0)
      setUseCustomEfficiency(inputs.useCustomEfficiency || false)
      if (inputs.fuelPrices) {
        setFuelPrices(inputs.fuelPrices)
      }
    }
  }, [loadFromHistory])

  // Format history result for display
  const formatHistoryResult = useCallback((result: Record<string, unknown>) => {
    const totalCost = result.totalCost as number | undefined
    return `총 비용: ${totalCost?.toLocaleString() || '0'}원`
  }, [])

  // Manual save calculation
  const handleSaveCalculation = useCallback(() => {
    if (!calculation || distance <= 0) return

    const inputs = {
      distance,
      vehicleType,
      fuelType,
      customEfficiency: useCustomEfficiency ? customEfficiency : 0,
      useCustomEfficiency,
      fuelPrices,
      totalCost: calculation.totalCost
    }

    const resultData = {
      totalCost: calculation.totalCost,
      fuelCost: calculation.fuelCost,
      depreciationCost: calculation.depreciationCost,
      costPerKm: calculation.costPerKm,
      fuelConsumption: calculation.fuelConsumption
    }

    const success = saveCalculation(inputs, resultData)
    if (success) {
      setIsSaved(true)
      setTimeout(() => setIsSaved(false), 2000)
    }
  }, [calculation, distance, vehicleType, fuelType, customEfficiency, useCustomEfficiency, fuelPrices, saveCalculation])

  // Driving log functions
  const addDrivingLogEntry = useCallback(() => {
    if (newLogEntry.distance <= 0) return

    const entry: DrivingLogEntry = {
      ...newLogEntry,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
    }

    const updatedLogs = [entry, ...drivingLogs]
    setDrivingLogs(updatedLogs)
    safeStorage.setItem(STORAGE_KEYS.DRIVING_LOG, JSON.stringify(updatedLogs))

    // Reset form
    setNewLogEntry({
      date: new Date().toISOString().slice(0, 10),
      distance: 0,
      tollFee: 0,
      parkingFee: 0,
      memo: ''
    })
  }, [newLogEntry, drivingLogs])

  const removeDrivingLogEntry = useCallback((id: string) => {
    const updatedLogs = drivingLogs.filter(log => log.id !== id)
    setDrivingLogs(updatedLogs)
    safeStorage.setItem(STORAGE_KEYS.DRIVING_LOG, JSON.stringify(updatedLogs))
  }, [drivingLogs])

  const clearAllDrivingLogs = useCallback(() => {
    if (window.confirm(t('drivingLog.export.confirmClear'))) {
      setDrivingLogs([])
      safeStorage.removeItem(STORAGE_KEYS.DRIVING_LOG)
    }
  }, [t])

  // Calculate fuel cost for a driving log entry
  const calculateLogFuelCost = useCallback((logDistance: number): number => {
    const selectedVehicle = vehicleTypes[vehicleType]
    const efficiency = useCustomEfficiency && customEfficiency > 0
      ? customEfficiency
      : getAdjustedEfficiency(selectedVehicle.efficiency, fuelType)
    const fuelConsumption = logDistance / efficiency
    return Math.round(fuelConsumption * fuelPrices[fuelType])
  }, [vehicleType, fuelType, customEfficiency, useCustomEfficiency, fuelPrices, vehicleTypes, getAdjustedEfficiency])

  // Calculate driving log summary
  const logSummary = useMemo(() => {
    const totalDistance = drivingLogs.reduce((sum, log) => sum + log.distance, 0)
    const totalTollFee = drivingLogs.reduce((sum, log) => sum + log.tollFee, 0)
    const totalParkingFee = drivingLogs.reduce((sum, log) => sum + log.parkingFee, 0)
    const totalFuelCost = drivingLogs.reduce((sum, log) => sum + calculateLogFuelCost(log.distance), 0)
    const grandTotal = totalTollFee + totalParkingFee + totalFuelCost

    return {
      totalDistance,
      totalTollFee,
      totalParkingFee,
      totalFuelCost,
      grandTotal
    }
  }, [drivingLogs, calculateLogFuelCost])

  // Export driving logs to CSV
  const exportToCSV = useCallback(() => {
    if (drivingLogs.length === 0) return

    const headers = ['날짜', '거리(km)', '통행료(원)', '주차비(원)', '연료비(원)', '총비용(원)', '메모']
    const rows = drivingLogs.map(log => {
      const fuelCost = calculateLogFuelCost(log.distance)
      const total = log.tollFee + log.parkingFee + fuelCost
      return [
        log.date,
        log.distance.toString(),
        log.tollFee.toString(),
        log.parkingFee.toString(),
        fuelCost.toString(),
        total.toString(),
        `"${log.memo.replace(/"/g, '""')}"`
      ]
    })

    // Add summary row
    rows.push([
      '합계',
      logSummary.totalDistance.toString(),
      logSummary.totalTollFee.toString(),
      logSummary.totalParkingFee.toString(),
      logSummary.totalFuelCost.toString(),
      logSummary.grandTotal.toString(),
      ''
    ])

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `주행일지_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }, [drivingLogs, logSummary, calculateLogFuelCost])

  // 거리나 차종이 변경될 때마다 자동 계산
  useEffect(() => {
    calculateFuelCost()
  }, [calculateFuelCost])

  // 결과 복사
  const copyResult = useCallback(async () => {
    if (!calculation) return

    const selectedVehicle = vehicleTypes[vehicleType]
    const efficiency = useCustomEfficiency && customEfficiency > 0
      ? customEfficiency
      : getAdjustedEfficiency(selectedVehicle.efficiency, fuelType)

    const resultText = `
${t('title')} 결과

📍 주행거리: ${distance.toLocaleString()}km
🚗 차종: ${selectedVehicle.category} (${efficiency.toFixed(1)}km/L)
⛽ 연료: ${t(`fuelTypes.${fuelType}`)} (${fuelPrices[fuelType].toLocaleString()}원/L)

💰 계산 결과:
- 연료 소모량: ${calculation.fuelConsumption.toFixed(2)}L
- 연료비: ${calculation.fuelCost.toLocaleString()}원
- 감가상각비: ${calculation.depreciationCost.toLocaleString()}원
- 총 비용: ${calculation.totalCost.toLocaleString()}원
- km당 비용: ${calculation.costPerKm.toFixed(0)}원/km

생성일시: ${new Date().toLocaleString('ko-KR')}
출처: 툴허브 (https://toolhub.ai.kr/fuel-calculator)
    `.trim()

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(resultText)
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = resultText
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
      }
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }, [calculation, distance, vehicleType, fuelType, customEfficiency, useCustomEfficiency, fuelPrices, vehicleTypes, getAdjustedEfficiency, t])

  // 결과 다운로드
  const downloadResult = useCallback(() => {
    if (!calculation) return

    const selectedVehicle = vehicleTypes[vehicleType]
    const efficiency = useCustomEfficiency && customEfficiency > 0
      ? customEfficiency
      : getAdjustedEfficiency(selectedVehicle.efficiency, fuelType)

    const content = `유류비 계산서

계산 일시: ${new Date().toLocaleString('ko-KR')}

=== 입력 정보 ===
주행거리: ${distance.toLocaleString()}km
차종: ${selectedVehicle.category}
연비: ${efficiency.toFixed(1)}km/L
연료종류: ${t(`fuelTypes.${fuelType}`)}
연료단가: ${fuelPrices[fuelType].toLocaleString()}원/L

=== 계산 결과 ===
연료 소모량: ${calculation.fuelConsumption.toFixed(2)}L
연료비: ${calculation.fuelCost.toLocaleString()}원
감가상각비: ${calculation.depreciationCost.toLocaleString()}원
총 비용: ${calculation.totalCost.toLocaleString()}원
km당 비용: ${calculation.costPerKm.toFixed(0)}원/km

=== 비고 ===
- 연료비는 ${lastUpdated.toLocaleDateString('ko-KR')} 기준 유가 적용
- 감가상각비는 차종별 평균값 적용
- 실제 비용과 차이가 있을 수 있음

출처: 툴허브 유류비 계산기 (https://toolhub.ai.kr/fuel-calculator)`

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `유류비계산서_${new Date().toISOString().slice(0, 10)}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }, [calculation, distance, vehicleType, fuelType, customEfficiency, useCustomEfficiency, fuelPrices, vehicleTypes, getAdjustedEfficiency, lastUpdated, t])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('description')}
          </p>
        </div>
        <CalculationHistory
          histories={histories}
          isLoading={false}
          onLoadHistory={handleLoadFromHistory}
          onRemoveHistory={removeHistory}
          onClearHistories={clearHistories}
          formatResult={formatHistoryResult}
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('calculator')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'calculator'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Calculator className="w-4 h-4" />
            <span>{t('tabs.calculator')}</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('drivingLog')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'drivingLog'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4" />
            <span>{t('tabs.drivingLog')}</span>
            {drivingLogs.length > 0 && (
              <span className="bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300 px-2 py-0.5 rounded-full text-xs">
                {drivingLogs.length}
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Calculator Tab */}
      {activeTab === 'calculator' && (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* 입력 패널 */}
          <div className="lg:col-span-1 space-y-6">
            {/* 주행 정보 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <div className="flex items-center space-x-2 mb-4">
                <MapPin className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {t('input.tripInfo')}
                </h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('input.distance')} (km)
                  </label>
                  <input
                    type="number"
                    value={distance || ''}
                    onChange={(e) => setDistance(Number(e.target.value))}
                    placeholder="100"
                    min="0"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* 차량 정보 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Car className="w-5 h-5 text-green-600" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {t('input.vehicleInfo')}
                  </h2>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('input.vehicleType')}
                  </label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    {Object.entries(vehicleTypes).map(([key, vehicle]) => (
                      <option key={key} value={key}>
                        {vehicle.category} ({vehicle.efficiency}km/L)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('input.fuelType')}
                  </label>
                  <select
                    value={fuelType}
                    onChange={(e) => setFuelType(e.target.value as 'gasoline' | 'diesel' | 'lpg')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="gasoline">{t('fuelTypes.gasoline')} ({fuelPrices.gasoline.toLocaleString()}원/L)</option>
                    <option value="diesel">{t('fuelTypes.diesel')} ({fuelPrices.diesel.toLocaleString()}원/L)</option>
                    <option value="lpg">{t('fuelTypes.lpg')} ({fuelPrices.lpg.toLocaleString()}원/L)</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      id="customEfficiency"
                      checked={useCustomEfficiency}
                      onChange={(e) => setUseCustomEfficiency(e.target.checked)}
                      className="mr-2"
                    />
                    <label htmlFor="customEfficiency" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('input.customEfficiency')}
                    </label>
                  </div>
                  {useCustomEfficiency && (
                    <input
                      type="number"
                      value={customEfficiency || ''}
                      onChange={(e) => setCustomEfficiency(Number(e.target.value))}
                      placeholder="12.5"
                      min="1"
                      max="30"
                      step="0.1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  )}
                </div>

                {/* Vehicle Settings Buttons */}
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={saveVehicleSettings}
                      className="flex items-center space-x-1 px-3 py-1.5 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-800 transition-colors"
                    >
                      <Save className="w-3 h-3" />
                      <span>{t('vehicleSettings.save')}</span>
                    </button>
                    <button
                      onClick={loadVehicleSettings}
                      className="flex items-center space-x-1 px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800 transition-colors"
                    >
                      <Upload className="w-3 h-3" />
                      <span>{t('vehicleSettings.load')}</span>
                    </button>
                    {hasVehicleSettings && (
                      <button
                        onClick={deleteVehicleSettings}
                        className="flex items-center space-x-1 px-3 py-1.5 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>{t('vehicleSettings.delete')}</span>
                      </button>
                    )}
                  </div>
                  {settingsFeedback && (
                    <p className="mt-2 text-xs text-green-600 dark:text-green-400">{settingsFeedback}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Manual Fuel Prices */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Fuel className="w-5 h-5 text-orange-600" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {t('opinet.title')}
                  </h2>
                </div>
                {!isEditingPrices ? (
                  <button
                    onClick={startEditingPrices}
                    className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
                    title="유가 수정"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="flex space-x-1">
                    <button
                      onClick={savePrices}
                      className="p-2 text-green-600 hover:text-green-700 transition-colors"
                      title="저장"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      onClick={cancelEditingPrices}
                      className="p-2 text-red-600 hover:text-red-700 transition-colors"
                      title="취소"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{t('fuelTypes.gasoline')}</span>
                  {isEditingPrices ? (
                    <input
                      type="number"
                      value={tempPrices.gasoline}
                      onChange={(e) => setTempPrices(prev => ({ ...prev, gasoline: Number(e.target.value) }))}
                      className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      min="1000"
                      max="3000"
                    />
                  ) : (
                    <span className="font-medium">{fuelPrices.gasoline.toLocaleString()}원/L</span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{t('fuelTypes.diesel')}</span>
                  {isEditingPrices ? (
                    <input
                      type="number"
                      value={tempPrices.diesel}
                      onChange={(e) => setTempPrices(prev => ({ ...prev, diesel: Number(e.target.value) }))}
                      className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      min="1000"
                      max="3000"
                    />
                  ) : (
                    <span className="font-medium">{fuelPrices.diesel.toLocaleString()}원/L</span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{t('fuelTypes.lpg')}</span>
                  {isEditingPrices ? (
                    <input
                      type="number"
                      value={tempPrices.lpg}
                      onChange={(e) => setTempPrices(prev => ({ ...prev, lpg: Number(e.target.value) }))}
                      className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      min="500"
                      max="2000"
                    />
                  ) : (
                    <span className="font-medium">{fuelPrices.lpg.toLocaleString()}원/L</span>
                  )}
                </div>

                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-1 text-xs text-gray-500 mb-3">
                    <Clock className="w-3 h-3" />
                    <span>최종 수정: {lastUpdated.toLocaleTimeString('ko-KR')}</span>
                  </div>

                  {/* OPINET Link */}
                  <a
                    href="https://www.opinet.co.kr/user/dopospdrg/dopOsPdrgSelect.do"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center space-x-2 w-full px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span className="text-sm font-medium">{t('opinet.checkPrice')}</span>
                  </a>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                    {t('opinet.linkDescription')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 결과 패널 */}
          <div className="lg:col-span-2 space-y-6">
            {calculation ? (
              <>
                {/* 계산 결과 */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-2">
                      <Calculator className="w-5 h-5 text-purple-600" />
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {t('result.title')}
                      </h2>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleSaveCalculation}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                          isSaved
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-purple-600 hover:bg-purple-700 text-white'
                        }`}
                      >
                        {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                        <span>{isSaved ? '저장완료' : tc('save')}</span>
                      </button>
                      <button
                        onClick={copyResult}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                          isCopied
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        <span>{tc('copy')}</span>
                      </button>
                      <button
                        onClick={downloadResult}
                        className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        <span>{tc('export')}</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <DollarSign className="w-5 h-5 text-blue-600" />
                          <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                            {t('result.totalCost')}
                          </span>
                        </div>
                        <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                          {Math.round(calculation.totalCost).toLocaleString()}원
                        </p>
                      </div>

                      <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <Fuel className="w-5 h-5 text-green-600" />
                          <span className="text-sm font-medium text-green-800 dark:text-green-200">
                            {t('result.fuelCost')}
                          </span>
                        </div>
                        <p className="text-xl font-bold text-green-900 dark:text-green-100">
                          {Math.round(calculation.fuelCost).toLocaleString()}원
                        </p>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          {calculation.fuelConsumption.toFixed(2)}L
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-orange-50 dark:bg-orange-950 p-4 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <TrendingDown className="w-5 h-5 text-orange-600" />
                          <span className="text-sm font-medium text-orange-800 dark:text-orange-200">
                            {t('result.depreciationCost')}
                          </span>
                        </div>
                        <p className="text-xl font-bold text-orange-900 dark:text-orange-100">
                          {Math.round(calculation.depreciationCost).toLocaleString()}원
                        </p>
                      </div>

                      <div className="bg-purple-50 dark:bg-purple-950 p-4 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <Zap className="w-5 h-5 text-purple-600" />
                          <span className="text-sm font-medium text-purple-800 dark:text-purple-200">
                            {t('result.costPerKm')}
                          </span>
                        </div>
                        <p className="text-xl font-bold text-purple-900 dark:text-purple-100">
                          {calculation.costPerKm.toFixed(0)}원/km
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 상세 내역 */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    {t('result.breakdown')}
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">{t('result.distance')}</span>
                      <span className="font-medium">{calculation.distance.toLocaleString()}km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">{t('result.efficiency')}</span>
                      <span className="font-medium">
                        {(useCustomEfficiency && customEfficiency > 0
                          ? customEfficiency
                          : getAdjustedEfficiency(vehicleTypes[vehicleType].efficiency, fuelType)
                        ).toFixed(1)}km/L
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">{t('result.fuelPrice')}</span>
                      <span className="font-medium">{fuelPrices[fuelType].toLocaleString()}원/L</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">{t('result.depreciationRate')}</span>
                      <span className="font-medium">{vehicleTypes[vehicleType].depreciation.toLocaleString()}원/km</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
                <Car className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  {t('placeholder')}
                </p>
              </div>
            )}

            {/* Calculation History */}
            <CalculationHistory
              histories={histories}
              isLoading={historyLoading}
              onLoadHistory={handleLoadFromHistory}
              onRemoveHistory={removeHistory}
              onClearHistories={clearHistories}
              formatResult={formatHistoryResult}
            />
          </div>
        </div>
      )}

      {/* Driving Log Tab */}
      {activeTab === 'drivingLog' && (
        <div className="space-y-6">
          {/* Add Entry Form */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {t('drivingLog.addEntry')}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {t('drivingLog.date')}
                </label>
                <input
                  type="date"
                  value={newLogEntry.date}
                  onChange={(e) => setNewLogEntry(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {t('drivingLog.distance')}
                </label>
                <input
                  type="number"
                  value={newLogEntry.distance || ''}
                  onChange={(e) => setNewLogEntry(prev => ({ ...prev, distance: Number(e.target.value) }))}
                  placeholder={t('drivingLog.form.placeholder.distance')}
                  min="0"
                  step="0.1"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {t('drivingLog.tollFee')}
                </label>
                <input
                  type="number"
                  value={newLogEntry.tollFee || ''}
                  onChange={(e) => setNewLogEntry(prev => ({ ...prev, tollFee: Number(e.target.value) }))}
                  placeholder={t('drivingLog.form.placeholder.tollFee')}
                  min="0"
                  step="100"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {t('drivingLog.parkingFee')}
                </label>
                <input
                  type="number"
                  value={newLogEntry.parkingFee || ''}
                  onChange={(e) => setNewLogEntry(prev => ({ ...prev, parkingFee: Number(e.target.value) }))}
                  placeholder={t('drivingLog.form.placeholder.parkingFee')}
                  min="0"
                  step="100"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {t('drivingLog.memo')}
                </label>
                <input
                  type="text"
                  value={newLogEntry.memo}
                  onChange={(e) => setNewLogEntry(prev => ({ ...prev, memo: e.target.value }))}
                  placeholder={t('drivingLog.form.placeholder.memo')}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={addDrivingLogEntry}
                disabled={newLogEntry.distance <= 0}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>{t('drivingLog.addEntry')}</span>
              </button>
            </div>
          </div>

          {/* Log Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('drivingLog.title')}
              </h2>
              <div className="flex space-x-2">
                {drivingLogs.length > 0 && (
                  <>
                    <button
                      onClick={exportToCSV}
                      className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      <Download className="w-4 h-4" />
                      <span>{t('drivingLog.export.csv')}</span>
                    </button>
                    <button
                      onClick={clearAllDrivingLogs}
                      className="flex items-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>{t('drivingLog.export.clear')}</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {drivingLogs.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">{t('drivingLog.noEntries')}</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{t('drivingLog.addFirst')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-2 font-medium text-gray-600 dark:text-gray-400">{t('drivingLog.date')}</th>
                      <th className="text-right py-3 px-2 font-medium text-gray-600 dark:text-gray-400">{t('drivingLog.distance')}</th>
                      <th className="text-right py-3 px-2 font-medium text-gray-600 dark:text-gray-400">{t('drivingLog.tollFee')}</th>
                      <th className="text-right py-3 px-2 font-medium text-gray-600 dark:text-gray-400">{t('drivingLog.parkingFee')}</th>
                      <th className="text-right py-3 px-2 font-medium text-gray-600 dark:text-gray-400">{t('drivingLog.fuelCost')}</th>
                      <th className="text-right py-3 px-2 font-medium text-gray-600 dark:text-gray-400">{t('drivingLog.totalCost')}</th>
                      <th className="text-left py-3 px-2 font-medium text-gray-600 dark:text-gray-400">{t('drivingLog.memo')}</th>
                      <th className="py-3 px-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {drivingLogs.map((log) => {
                      const fuelCost = calculateLogFuelCost(log.distance)
                      const total = log.tollFee + log.parkingFee + fuelCost
                      return (
                        <tr key={log.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                          <td className="py-3 px-2">{log.date}</td>
                          <td className="py-3 px-2 text-right">{log.distance.toLocaleString()}km</td>
                          <td className="py-3 px-2 text-right">{log.tollFee.toLocaleString()}원</td>
                          <td className="py-3 px-2 text-right">{log.parkingFee.toLocaleString()}원</td>
                          <td className="py-3 px-2 text-right text-green-600 dark:text-green-400">{fuelCost.toLocaleString()}원</td>
                          <td className="py-3 px-2 text-right font-medium">{total.toLocaleString()}원</td>
                          <td className="py-3 px-2 text-gray-500 dark:text-gray-400 max-w-[150px] truncate">{log.memo}</td>
                          <td className="py-3 px-2">
                            <button
                              onClick={() => removeDrivingLogEntry(log.id)}
                              className="p-1 text-red-500 hover:text-red-700 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 dark:bg-gray-700/50 font-medium">
                      <td className="py-3 px-2">{t('drivingLog.summary.title')}</td>
                      <td className="py-3 px-2 text-right">{logSummary.totalDistance.toLocaleString()}km</td>
                      <td className="py-3 px-2 text-right">{logSummary.totalTollFee.toLocaleString()}원</td>
                      <td className="py-3 px-2 text-right">{logSummary.totalParkingFee.toLocaleString()}원</td>
                      <td className="py-3 px-2 text-right text-green-600 dark:text-green-400">{logSummary.totalFuelCost.toLocaleString()}원</td>
                      <td className="py-3 px-2 text-right text-blue-600 dark:text-blue-400 font-bold">{logSummary.grandTotal.toLocaleString()}원</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Summary Card */}
          {drivingLogs.length > 0 && (
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
              <h3 className="text-lg font-semibold mb-4">{t('drivingLog.summary.title')}</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <p className="text-blue-100 text-sm">{t('drivingLog.summary.totalDistance')}</p>
                  <p className="text-2xl font-bold">{logSummary.totalDistance.toLocaleString()}km</p>
                </div>
                <div>
                  <p className="text-blue-100 text-sm">{t('drivingLog.summary.totalTollFee')}</p>
                  <p className="text-2xl font-bold">{logSummary.totalTollFee.toLocaleString()}원</p>
                </div>
                <div>
                  <p className="text-blue-100 text-sm">{t('drivingLog.summary.totalParkingFee')}</p>
                  <p className="text-2xl font-bold">{logSummary.totalParkingFee.toLocaleString()}원</p>
                </div>
                <div>
                  <p className="text-blue-100 text-sm">{t('drivingLog.summary.totalFuelCost')}</p>
                  <p className="text-2xl font-bold">{logSummary.totalFuelCost.toLocaleString()}원</p>
                </div>
                <div>
                  <p className="text-blue-100 text-sm">{t('drivingLog.summary.grandTotal')}</p>
                  <p className="text-3xl font-bold">{logSummary.grandTotal.toLocaleString()}원</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Guide Content - Only show on calculator tab */}
      {activeTab === 'calculator' && (
        <div className="mt-16 space-y-12">
          {/* Business Expense Guide */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                {t('businessExpense.title')}
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                {t('businessExpense.subtitle')}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Accurate Calculation */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Calculator className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {t('businessExpense.features.accurate.title')}
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  {t('businessExpense.features.accurate.description')}
                </p>
                <ul className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {t(`businessExpense.features.accurate.points.${i}.title`)}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {t(`businessExpense.features.accurate.points.${i}.content`)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Legal Compliance */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                    <Shield className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {t('businessExpense.features.legal.title')}
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  {t('businessExpense.features.legal.description')}
                </p>
                <ul className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {t(`businessExpense.features.legal.points.${i}.title`)}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {t(`businessExpense.features.legal.points.${i}.content`)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Practical Tools */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {t('businessExpense.features.practical.title')}
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  {t('businessExpense.features.practical.description')}
                </p>
                <ul className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {t(`businessExpense.features.practical.points.${i}.title`)}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {t(`businessExpense.features.practical.points.${i}.content`)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Expense Rules */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <BookOpen className="w-8 h-8 text-indigo-600" />
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {t('expenseRules.title')}
                </h2>
              </div>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                {t('expenseRules.description')}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Personal Car */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {t('expenseRules.personalCar.title')}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  {t('expenseRules.personalCar.description')}
                </p>
                <ul className="space-y-2">
                  {[0, 1, 2, 3].map((i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {t(`expenseRules.personalCar.details.${i}`)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Company Car */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {t('expenseRules.companyCar.title')}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  {t('expenseRules.companyCar.description')}
                </p>
                <ul className="space-y-2">
                  {[0, 1, 2, 3].map((i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {t(`expenseRules.companyCar.details.${i}`)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Cost Optimization */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-8">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <TrendingUp className="w-8 h-8 text-green-600" />
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {t('costOptimization.title')}
                </h2>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Fuel Efficiency */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                    <Fuel className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {t('costOptimization.fuelEfficiency.title')}
                  </h3>
                </div>
                <div className="space-y-4">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <div className="font-medium text-gray-900 dark:text-white mb-1">
                        {t(`costOptimization.fuelEfficiency.methods.${i}.title`)}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {t(`costOptimization.fuelEfficiency.methods.${i}.content`)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Maintenance */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
                    <Wrench className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {t('costOptimization.maintenance.title')}
                  </h3>
                </div>
                <div className="space-y-4">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <div className="font-medium text-gray-900 dark:text-white mb-1">
                        {t(`costOptimization.maintenance.tips.${i}.title`)}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {t(`costOptimization.maintenance.tips.${i}.content`)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FuelCalculator
