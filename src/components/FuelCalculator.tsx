'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { 
  Car, 
  Fuel, 
  Calculator,
  MapPin,
  Calendar,
  DollarSign,
  TrendingDown,
  Copy,
  Check,
  Download,
  Clock,
  Zap,
  RefreshCw,
  Edit3,
  Save,
  X,
  FileText,
  Shield,
  TrendingUp,
  Wrench,
  Target,
  BookOpen
} from 'lucide-react'
import { useCalculationHistory } from '@/hooks/useCalculationHistory'
import CalculationHistory from '@/components/CalculationHistory'

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

const FuelCalculator = () => {
  const t = useTranslations('fuelCalculator')
  const tc = useTranslations('common')
  
  const [distance, setDistance] = useState<number>(0)
  const [vehicleType, setVehicleType] = useState<string>('compact')
  const [fuelType, setFuelType] = useState<'gasoline' | 'diesel' | 'lpg'>('gasoline')
  const [customEfficiency, setCustomEfficiency] = useState<number>(0)
  const [useCustomEfficiency, setUseCustomEfficiency] = useState(false)
  const [calculation, setCalculation] = useState<FuelCalculation | null>(null)
  const [isCopied, setIsCopied] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [fuelPrices, setFuelPrices] = useState({
    gasoline: 1600, // 원/L
    diesel: 1400,   // 원/L  
    lpg: 900        // 원/L
  })
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [isEditingPrices, setIsEditingPrices] = useState(false)
  const [tempPrices, setTempPrices] = useState(fuelPrices)
  
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
      efficiency: 16.0, // km/L
      depreciation: 80 // 원/km
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

  // 연비 조정 (디젤은 일반적으로 15-20% 더 효율적, LPG는 10% 덜 효율적)
  const getAdjustedEfficiency = useCallback((baseEfficiency: number, fuel: string): number => {
    switch (fuel) {
      case 'diesel':
        return baseEfficiency * 1.18 // 18% 더 효율적
      case 'lpg':
        return baseEfficiency * 0.9  // 10% 덜 효율적
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
    
    // 연료 소모량 (L)
    const fuelConsumption = distance / efficiency
    
    // 연료비 (원)
    const fuelCost = fuelConsumption * fuelPrice
    
    // 감가상각비 (원)
    const depreciationCost = distance * selectedVehicle.depreciation
    
    // 총 비용 (원)
    const totalCost = fuelCost + depreciationCost
    
    // km당 비용 (원/km)
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
  const formatHistoryResult = useCallback((result: any) => {
    return `총 비용: ${result.totalCost?.toLocaleString() || '0'}원`
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
      // Show success feedback
      setIsSaved(true)
      setTimeout(() => setIsSaved(false), 2000)
    }
  }, [calculation, distance, vehicleType, fuelType, customEfficiency, useCustomEfficiency, fuelPrices, saveCalculation])

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
        // Fallback for browsers without clipboard API
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
      // Try fallback method
      try {
        const textArea = document.createElement('textarea')
        textArea.value = resultText
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
      } catch (fallbackError) {
        console.error('Fallback copy failed:', fallbackError)
      }
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
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
          {t('title')}
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          {t('description')}
        </p>
      </div>

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
            <div className="flex items-center space-x-2 mb-4">
              <Car className="w-5 h-5 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('input.vehicleInfo')}
              </h2>
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
            </div>
          </div>

          {/* Manual Fuel Prices */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Fuel className="w-5 h-5 text-orange-600" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  수동 유가 입력
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
                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    min="500"
                    max="2000"
                  />
                ) : (
                  <span className="font-medium">{fuelPrices.lpg.toLocaleString()}원/L</span>
                )}
              </div>
              <div className="pt-2 border-t">
                <div className="flex items-center space-x-1 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>최종 수정: {lastUpdated.toLocaleTimeString('ko-KR')}</span>
                </div>
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
                      className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Copy className="w-4 h-4" />
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
                        {calculation.totalCost.toLocaleString()}원
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
                        {calculation.fuelCost.toLocaleString()}원
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
                        {calculation.depreciationCost.toLocaleString()}원
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

      {/* Guide Content */}
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
                <li className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {t('businessExpense.features.accurate.points.0.title')}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {t('businessExpense.features.accurate.points.0.content')}
                    </div>
                  </div>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {t('businessExpense.features.accurate.points.1.title')}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {t('businessExpense.features.accurate.points.1.content')}
                    </div>
                  </div>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {t('businessExpense.features.accurate.points.2.title')}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {t('businessExpense.features.accurate.points.2.content')}
                    </div>
                  </div>
                </li>
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
                <li className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {t('businessExpense.features.legal.points.0.title')}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {t('businessExpense.features.legal.points.0.content')}
                    </div>
                  </div>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {t('businessExpense.features.legal.points.1.title')}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {t('businessExpense.features.legal.points.1.content')}
                    </div>
                  </div>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {t('businessExpense.features.legal.points.2.title')}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {t('businessExpense.features.legal.points.2.content')}
                    </div>
                  </div>
                </li>
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
                <li className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {t('businessExpense.features.practical.points.0.title')}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {t('businessExpense.features.practical.points.0.content')}
                    </div>
                  </div>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {t('businessExpense.features.practical.points.1.title')}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {t('businessExpense.features.practical.points.1.content')}
                    </div>
                  </div>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {t('businessExpense.features.practical.points.2.title')}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {t('businessExpense.features.practical.points.2.content')}
                    </div>
                  </div>
                </li>
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
                <li className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {t('expenseRules.personalCar.details.0')}
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {t('expenseRules.personalCar.details.1')}
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {t('expenseRules.personalCar.details.2')}
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {t('expenseRules.personalCar.details.3')}
                  </span>
                </li>
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
                <li className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {t('expenseRules.companyCar.details.0')}
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {t('expenseRules.companyCar.details.1')}
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {t('expenseRules.companyCar.details.2')}
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {t('expenseRules.companyCar.details.3')}
                  </span>
                </li>
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
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="font-medium text-gray-900 dark:text-white mb-1">
                    {t('costOptimization.fuelEfficiency.methods.0.title')}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {t('costOptimization.fuelEfficiency.methods.0.content')}
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="font-medium text-gray-900 dark:text-white mb-1">
                    {t('costOptimization.fuelEfficiency.methods.1.title')}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {t('costOptimization.fuelEfficiency.methods.1.content')}
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="font-medium text-gray-900 dark:text-white mb-1">
                    {t('costOptimization.fuelEfficiency.methods.2.title')}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {t('costOptimization.fuelEfficiency.methods.2.content')}
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="font-medium text-gray-900 dark:text-white mb-1">
                    {t('costOptimization.fuelEfficiency.methods.3.title')}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {t('costOptimization.fuelEfficiency.methods.3.content')}
                  </div>
                </div>
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
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="font-medium text-gray-900 dark:text-white mb-1">
                    {t('costOptimization.maintenance.tips.0.title')}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {t('costOptimization.maintenance.tips.0.content')}
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="font-medium text-gray-900 dark:text-white mb-1">
                    {t('costOptimization.maintenance.tips.1.title')}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {t('costOptimization.maintenance.tips.1.content')}
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="font-medium text-gray-900 dark:text-white mb-1">
                    {t('costOptimization.maintenance.tips.2.title')}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {t('costOptimization.maintenance.tips.2.content')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FuelCalculator