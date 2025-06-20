'use client'

import { useState, useEffect } from 'react'
import { Activity, Calculator, Target, Users, Share2, Check, Save } from 'lucide-react'
import CalculationHistory from './CalculationHistory'
import { useCalculationHistory } from '@/hooks/useCalculationHistory'
import { useTranslations } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'

interface BodyFatResult {
  bodyFatPercentage: number // 체지방률 (%)
  fatMass: number // 체지방량 (kg)
  leanMass: number // 근육량 (kg)
  category: string // 체지방률 분류
  healthRisk: string // 건강 위험도
  idealRange: { min: number; max: number } // 이상적인 체지방률 범위
  visceralFatLevel: number // 내장지방 레벨 추정
}

type Gender = 'male' | 'female'
type Formula = 'navy' | 'ymca' | 'covert-bailey'
type AgeGroup = 'young' | 'adult' | 'senior' // 20-39, 40-59, 60+

export default function BodyFatCalculator() {
  const t = useTranslations('bodyFat')
  const tCommon = useTranslations('common')
  const [height, setHeight] = useState<string>('')
  const [weight, setWeight] = useState<string>('')
  const [age, setAge] = useState<string>('')
  const [gender, setGender] = useState<Gender>('male')
  const [formula, setFormula] = useState<Formula>('navy')
  
  // Navy 공식용 측정값
  const [waist, setWaist] = useState<string>('')
  const [neck, setNeck] = useState<string>('')
  const [hip, setHip] = useState<string>('') // 여성용
  
  const [result, setResult] = useState<BodyFatResult | null>(null)
  const [isCopied, setIsCopied] = useState(false)
  const [showSaveButton, setShowSaveButton] = useState(false)
  
  const { histories, saveCalculation, removeHistory, clearHistories, loadFromHistory } = useCalculationHistory('bodyFat')
  const router = useRouter()
  const searchParams = useSearchParams()

  const calculateBodyFat = () => {
    const h = parseFloat(height)
    const w = parseFloat(weight)
    const a = parseFloat(age)
    const waistCm = parseFloat(waist)
    const neckCm = parseFloat(neck)
    const hipCm = parseFloat(hip)

    if (!h || !w || !a || !waistCm || !neckCm || h <= 0 || w <= 0 || a <= 0 || waistCm <= 0 || neckCm <= 0) return
    if (gender === 'female' && (!hipCm || hipCm <= 0)) return

    let bodyFatPercentage: number

    if (formula === 'navy') {
      // Navy 공식 (가장 정확)
      if (gender === 'male') {
        // 남성: 495 / (1.0324 - 0.19077 * log10(waist - neck) + 0.15456 * log10(height)) - 450
        const log10WaistMinusNeck = Math.log10(waistCm - neckCm)
        const log10Height = Math.log10(h)
        bodyFatPercentage = 495 / (1.0324 - 0.19077 * log10WaistMinusNeck + 0.15456 * log10Height) - 450
      } else {
        // 여성: 495 / (1.29579 - 0.35004 * log10(waist + hip - neck) + 0.22100 * log10(height)) - 450
        const log10WaistPlusHipMinusNeck = Math.log10(waistCm + hipCm - neckCm)
        const log10Height = Math.log10(h)
        bodyFatPercentage = 495 / (1.29579 - 0.35004 * log10WaistPlusHipMinusNeck + 0.22100 * log10Height) - 450
      }
    } else if (formula === 'ymca') {
      // YMCA 공식 (간단하지만 덜 정확)
      const bmi = w / ((h / 100) * (h / 100))
      if (gender === 'male') {
        bodyFatPercentage = 1.61 * bmi + 0.13 * a - 12.1
      } else {
        bodyFatPercentage = 1.48 * bmi + 0.16 * a - 7.0
      }
    } else {
      // Covert Bailey 공식
      const bmi = w / ((h / 100) * (h / 100))
      if (gender === 'male') {
        bodyFatPercentage = 1.61 * bmi + 0.13 * a - 12.1
      } else {
        bodyFatPercentage = 1.48 * bmi + 0.16 * a - 7.0
      }
    }

    // 범위 제한
    bodyFatPercentage = Math.max(3, Math.min(50, bodyFatPercentage))

    // 체지방량과 근육량 계산
    const fatMass = (bodyFatPercentage / 100) * w
    const leanMass = w - fatMass

    // 연령대 구분
    const ageGroup: AgeGroup = a < 40 ? 'young' : a < 60 ? 'adult' : 'senior'

    // 체지방률 분류 및 이상적인 범위
    let category: string
    let healthRisk: string
    let idealRange: { min: number; max: number }

    if (gender === 'male') {
      idealRange = ageGroup === 'young' ? { min: 10, max: 18 } : 
                   ageGroup === 'adult' ? { min: 12, max: 20 } : 
                   { min: 14, max: 22 }
      
      if (bodyFatPercentage < 6) {
        category = 'essential'
        healthRisk = t('healthRisks.essential')
      } else if (bodyFatPercentage < idealRange.min) {
        category = 'athletic'
        healthRisk = t('healthRisks.athletic')
      } else if (bodyFatPercentage <= idealRange.max) {
        category = 'fitness'
        healthRisk = t('healthRisks.fitness')
      } else if (bodyFatPercentage < 25) {
        category = 'average'
        healthRisk = t('healthRisks.average')
      } else if (bodyFatPercentage < 30) {
        category = 'overweight'
        healthRisk = t('healthRisks.overweight')
      } else {
        category = 'obese'
        healthRisk = t('healthRisks.obese')
      }
    } else {
      idealRange = ageGroup === 'young' ? { min: 16, max: 24 } : 
                   ageGroup === 'adult' ? { min: 18, max: 26 } : 
                   { min: 20, max: 28 }
      
      if (bodyFatPercentage < 10) {
        category = 'essential'
        healthRisk = t('healthRisks.essential')
      } else if (bodyFatPercentage < idealRange.min) {
        category = 'athletic'
        healthRisk = t('healthRisks.athletic')
      } else if (bodyFatPercentage <= idealRange.max) {
        category = 'fitness'
        healthRisk = t('healthRisks.fitness')
      } else if (bodyFatPercentage < 32) {
        category = 'average'
        healthRisk = t('healthRisks.average')
      } else if (bodyFatPercentage < 38) {
        category = 'overweight'
        healthRisk = t('healthRisks.overweight')
      } else {
        category = 'obese'
        healthRisk = t('healthRisks.obese')
      }
    }

    // 내장지방 레벨 추정 (허리둘레 기반)
    let visceralFatLevel: number
    if (gender === 'male') {
      visceralFatLevel = Math.max(1, Math.min(30, (waistCm - 70) / 3))
    } else {
      visceralFatLevel = Math.max(1, Math.min(30, (waistCm - 60) / 3))
    }

    const calculationResult = {
      bodyFatPercentage,
      fatMass,
      leanMass,
      category,
      healthRisk,
      idealRange,
      visceralFatLevel
    }

    setResult(calculationResult)
    setShowSaveButton(true)
  }

  useEffect(() => {
    if (height && weight && age && waist && neck) {
      if (gender === 'male' || (gender === 'female' && hip)) {
        calculateBodyFat()
        updateURL({
          height,
          weight,
          age,
          gender,
          formula,
          waist,
          neck,
          hip: gender === 'female' ? hip : '0'
        })
      }
    }
  }, [height, weight, age, gender, formula, waist, neck, hip])

  // URL 파라미터에서 입력값 복원 (초기 로드시에만)
  useEffect(() => {
    const heightParam = searchParams.get('height')
    if (!heightParam) return

    const weightParam = searchParams.get('weight')
    const ageParam = searchParams.get('age')
    const genderParam = searchParams.get('gender')
    const formulaParam = searchParams.get('formula')
    const waistParam = searchParams.get('waist')
    const neckParam = searchParams.get('neck')
    const hipParam = searchParams.get('hip')

    if (heightParam && /^\d+(\.\d+)?$/.test(heightParam)) {
      setHeight(heightParam)
    }
    if (weightParam && /^\d+(\.\d+)?$/.test(weightParam)) {
      setWeight(weightParam)
    }
    if (ageParam && /^\d+$/.test(ageParam)) {
      setAge(ageParam)
    }
    if (genderParam && ['male', 'female'].includes(genderParam)) {
      setGender(genderParam as Gender)
    }
    if (formulaParam && ['navy', 'ymca', 'covert-bailey'].includes(formulaParam)) {
      setFormula(formulaParam as Formula)
    }
    if (waistParam && /^\d+(\.\d+)?$/.test(waistParam)) {
      setWaist(waistParam)
    }
    if (neckParam && /^\d+(\.\d+)?$/.test(neckParam)) {
      setNeck(neckParam)
    }
    if (hipParam && /^\d+(\.\d+)?$/.test(hipParam) && hipParam !== '0') {
      setHip(hipParam)
    }
  }, [])

  const formatNumber = (num: number, decimals: number = 1) => {
    return num.toFixed(decimals)
  }

  const updateURL = (newParams: Record<string, string>) => {
    const params = new URLSearchParams(searchParams)
    Object.entries(newParams).forEach(([key, value]) => {
      if (value && value !== '0') {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  const handleShare = async () => {
    if (!result) return
    
    const currentUrl = typeof window !== 'undefined' ? window.location.href : ''

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(currentUrl)
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = currentUrl
        document.body.appendChild(textArea)
        textArea.select()
        try {
          document.execCommand('copy')
          setIsCopied(true)
          setTimeout(() => setIsCopied(false), 2000)
        } catch (fallbackErr) {
          console.error('Fallback copy failed: ', fallbackErr)
        }
        document.body.removeChild(textArea)
      }
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const handleSaveCalculation = () => {
    if (!result) return
    
    const h = parseFloat(height)
    const w = parseFloat(weight)
    const a = parseFloat(age)
    const waistCm = parseFloat(waist)
    const neckCm = parseFloat(neck)
    const hipCm = parseFloat(hip) || 0
    
    saveCalculation(
      {
        height: h,
        weight: w,
        age: a,
        gender,
        formula,
        waist: waistCm,
        neck: neckCm,
        hip: hipCm
      },
      {
        bodyFatPercentage: result.bodyFatPercentage,
        fatMass: result.fatMass,
        leanMass: result.leanMass,
        category: result.category,
        healthRisk: result.healthRisk,
        idealRange: result.idealRange,
        visceralFatLevel: result.visceralFatLevel
      }
    )
    
    setShowSaveButton(false)
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'essential': return 'text-red-600'
      case 'athletic': return 'text-blue-600'
      case 'fitness': return 'text-green-600'
      case 'average': return 'text-yellow-600'
      case 'overweight': return 'text-orange-600'
      case 'obese': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getCategoryBgColor = (category: string) => {
    switch (category) {
      case 'essential': return 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-600'
      case 'athletic': return 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-600'
      case 'fitness': return 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-600'
      case 'average': return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-600'
      case 'overweight': return 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-600'
      case 'obese': return 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-600'
      default: return 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600'
    }
  }

  const getVisceralFatColor = (level: number) => {
    if (level < 10) return 'text-green-600'
    if (level < 15) return 'text-yellow-600'
    if (level < 20) return 'text-orange-600'
    return 'text-red-600'
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* 헤더 */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-600 rounded-full text-white mb-4">
          <Users className="w-8 h-8" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          {t('title')}
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-6">
          {t('description')}
        </p>
        
        {/* 계산 기록 */}
        <CalculationHistory
          histories={histories}
          isLoading={false}
          onLoadHistory={(historyId) => {
            const inputs = loadFromHistory(historyId)
            if (inputs) {
              setHeight(inputs.height?.toString() || '')
              setWeight(inputs.weight?.toString() || '')
              setAge(inputs.age?.toString() || '')
              setGender(inputs.gender || 'male')
              setFormula(inputs.formula || 'navy')
              setWaist(inputs.waist?.toString() || '')
              setNeck(inputs.neck?.toString() || '')
              setHip(inputs.hip?.toString() || '')
            }
          }}
          onRemoveHistory={removeHistory}
          onClearHistories={clearHistories}
          formatResult={(history: any) => {
            if (!history.inputs || !history.result) return t('history.empty')
            const bodyFatPercentage = history.result.bodyFatPercentage || 0
            const category = history.result.category || 'average'
            return t('history.format', { 
              bodyFatPercentage: formatNumber(bodyFatPercentage, 1), 
              category: t(`categories.${category}`)
            })
          }}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* 입력 폼 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
            <Calculator className="w-6 h-6 mr-2 text-purple-600" />
            {t('input.title')}
          </h2>

          <div className="space-y-6">
            {/* 기본 정보 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('input.height')}
                </label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder={t('input.heightPlaceholder')}
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('input.weight')}
                </label>
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder={t('input.weightPlaceholder')}
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('input.age')}
                </label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder={t('input.agePlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            {/* 성별 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('input.gender')}
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={gender === 'male'}
                    onChange={() => setGender('male')}
                    className="mr-2"
                  />
                  {t('input.male')}
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={gender === 'female'}
                    onChange={() => setGender('female')}
                    className="mr-2"
                  />
                  {t('input.female')}
                </label>
              </div>
            </div>

            {/* 계산 공식 선택 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('input.formula')}
              </label>
              <select
                value={formula}
                onChange={(e) => setFormula(e.target.value as Formula)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="navy">{t('input.formulas.navy')}</option>
                <option value="ymca">{t('input.formulas.ymca')}</option>
              </select>
            </div>

            {/* 둘레 측정값 */}
            <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                {t('input.measurements')}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('input.waist')}
                  </label>
                  <input
                    type="number"
                    value={waist}
                    onChange={(e) => setWaist(e.target.value)}
                    placeholder={t('input.waistPlaceholder')}
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t('input.waistNote')}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('input.neck')}
                  </label>
                  <input
                    type="number"
                    value={neck}
                    onChange={(e) => setNeck(e.target.value)}
                    placeholder={t('input.neckPlaceholder')}
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t('input.neckNote')}
                  </p>
                </div>
              </div>

              {/* 여성의 경우 엉덩이 둘레 추가 */}
              {gender === 'female' && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('input.hip')}
                  </label>
                  <input
                    type="number"
                    value={hip}
                    onChange={(e) => setHip(e.target.value)}
                    placeholder={t('input.hipPlaceholder')}
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t('input.hipNote')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 결과 */}
        <div className="space-y-6">
          {result && (
            <>
              {/* 주요 결과 */}
              <div className={`rounded-2xl shadow-lg p-8 border-2 ${getCategoryBgColor(result.category)}`}>
                <h3 className="text-xl font-bold mb-6 flex items-center text-gray-900 dark:text-white">
                  <Target className="w-6 h-6 mr-2" />
                  {t('result.title')}
                </h3>
                
                <div className="space-y-4">
                  <div className="text-center">
                    <div className={`text-4xl font-bold ${getCategoryColor(result.category)}`}>
                      {formatNumber(result.bodyFatPercentage, 1)}%
                    </div>
                    <div className={`text-lg font-semibold mt-2 ${getCategoryColor(result.category)}`}>
                      {t(`categories.${result.category}`)}
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                      {result.healthRisk}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="text-center p-4 bg-white dark:bg-gray-700 rounded-lg">
                      <div className="text-xl font-bold text-red-500">
                        {formatNumber(result.fatMass, 1)}kg
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">{t('result.fatMass')}</div>
                    </div>
                    <div className="text-center p-4 bg-white dark:bg-gray-700 rounded-lg">
                      <div className="text-xl font-bold text-blue-500">
                        {formatNumber(result.leanMass, 1)}kg
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">{t('result.leanMass')}</div>
                    </div>
                  </div>

                  <div className="border-t border-gray-300 dark:border-gray-600 pt-4">
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-800 dark:text-gray-200">{t('result.idealRange')}</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {formatNumber(result.idealRange.min, 0)} - {formatNumber(result.idealRange.max, 0)}%
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-800 dark:text-gray-200">{t('result.visceralFat')}</span>
                      <span className={`font-semibold ${getVisceralFatColor(result.visceralFatLevel)}`}>
                        {formatNumber(result.visceralFatLevel, 0)} {t('result.visceralFatUnit')}
                      </span>
                    </div>
                  </div>

                  {/* 공유/저장 버튼 */}
                  <div className="flex space-x-2 mt-4">
                    <button
                      onClick={handleShare}
                      className="inline-flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg text-gray-700 transition-colors"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>{tCommon('copied')}</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-4 h-4" />
                          <span>{t('result.shareResult')}</span>
                        </>
                      )}
                    </button>
                    
                    {showSaveButton && (
                      <button
                        onClick={handleSaveCalculation}
                        className="inline-flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg text-gray-700 transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        <span>{tCommon('save')}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 체지방률 분류표 */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                  {t('classification.title')}
                </h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-red-600 font-medium">{t('categories.essential')}</span>
                      <span className="text-gray-500 text-xs ml-2">
                        ({gender === 'male' ? '< 6%' : '< 10%'})
                      </span>
                    </div>
                    <span className="text-gray-800 dark:text-gray-200 font-medium">{t('categoryLabels.essential')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-blue-600 font-medium">{t('categories.athletic')}</span>
                      <span className="text-gray-500 text-xs ml-2">
                        ({gender === 'male' ? '6-13%' : '14-20%'})
                      </span>
                    </div>
                    <span className="text-gray-800 dark:text-gray-200 font-medium">{t('categoryLabels.athletic')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-green-600 font-medium">{t('categories.fitness')}</span>
                      <span className="text-gray-500 text-xs ml-2">
                        ({gender === 'male' ? '14-17%' : '21-24%'})
                      </span>
                    </div>
                    <span className="text-gray-800 dark:text-gray-200 font-medium">{t('categoryLabels.fitness')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-yellow-600 font-medium">{t('categories.average')}</span>
                      <span className="text-gray-500 text-xs ml-2">
                        ({gender === 'male' ? '18-24%' : '25-31%'})
                      </span>
                    </div>
                    <span className="text-gray-800 dark:text-gray-200 font-medium">{t('categoryLabels.average')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-orange-600 font-medium">{t('categories.overweight')}</span>
                      <span className="text-gray-500 text-xs ml-2">
                        ({gender === 'male' ? '25-29%' : '32-37%'})
                      </span>
                    </div>
                    <span className="text-gray-800 dark:text-gray-200 font-medium">{t('categoryLabels.overweight')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-red-600 font-medium">{t('categories.obese')}</span>
                      <span className="text-gray-500 text-xs ml-2">
                        ({gender === 'male' ? '30%+' : '38%+'})
                      </span>
                    </div>
                    <span className="text-gray-800 dark:text-gray-200 font-medium">{t('categoryLabels.obese')}</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-3 pt-2 border-t border-gray-200 dark:border-gray-600">
                    {t('classification.note')}
                  </p>
                </div>
              </div>
            </>
          )}

          {!result && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                {t('placeholder')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 체지방률 가이드 */}
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-8">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          💡 {t('guide.title')}
        </h3>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.measurementTitle')}
            </h4>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              <li>• {t('guide.measurement.0')}</li>
              <li>• {t('guide.measurement.1')}</li>
              <li>• {t('guide.measurement.2')}</li>
              <li>• {t('guide.measurement.3')}</li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.managementTitle')}
            </h4>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              <li>• {t('guide.management.0')}</li>
              <li>• {t('guide.management.1')}</li>
              <li>• {t('guide.management.2')}</li>
              <li>• {t('guide.management.3')}</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 측정 방법 가이드 */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
          <Activity className="w-6 h-6 mr-2 text-green-600" />
          {t('measurementGuide.title')}
        </h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">{t('measurementGuide.waist')}</h4>
            <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <p>• {t('measurementGuide.waistTips.0')}</p>
              <p>• {t('measurementGuide.waistTips.1')}</p>
              <p>• {t('measurementGuide.waistTips.2')}</p>
              <p>• {t('measurementGuide.waistTips.3')}</p>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">{t('measurementGuide.neck')}</h4>
            <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <p>• {t('measurementGuide.neckTips.0')}</p>
              <p>• {t('measurementGuide.neckTips.1')}</p>
              <p>• {t('measurementGuide.neckTips.2')}</p>
              <p>• {t('measurementGuide.neckTips.3')}</p>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">{t('measurementGuide.hip')}</h4>
            <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <p>• {t('measurementGuide.hipTips.0')}</p>
              <p>• {t('measurementGuide.hipTips.1')}</p>
              <p>• {t('measurementGuide.hipTips.2')}</p>
              <p>• {t('measurementGuide.hipTips.3')}</p>
            </div>
          </div>
        </div>
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            💡 <strong>{t('measurementGuide.measurementTip')}</strong> {t('measurementGuide.measurementTipText')}
          </p>
        </div>
      </div>
    </div>
  )
}