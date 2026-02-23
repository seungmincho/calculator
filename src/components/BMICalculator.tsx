'use client'

import { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Activity, Calculator, Heart, Scale, TrendingUp, Share2, Check, Save } from 'lucide-react'
import CalculationHistory from './CalculationHistory'
import { useCalculationHistory } from '@/hooks/useCalculationHistory'
import { useTranslations } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false })

interface BMIResult {
  bmi: number
  category: string
  categoryKorean: string
  idealWeightMin: number
  idealWeightMax: number
  weightDifference: number
  healthRisk: string
}

type Gender = 'male' | 'female'
type AgeGroup = 'adult' | 'elderly' // 성인/노인 구분

export default function BMICalculator() {
  const t = useTranslations('bmi')
  const [height, setHeight] = useState<string>('')
  const [weight, setWeight] = useState<string>('')
  const [age, setAge] = useState<string>('')
  const [gender, setGender] = useState<Gender>('male')
  const [result, setResult] = useState<BMIResult | null>(null)
  const [isCopied, setIsCopied] = useState(false)
  const [showSaveButton, setShowSaveButton] = useState(false)
  
  const { histories, saveCalculation, removeHistory, clearHistories, loadFromHistory } = useCalculationHistory('bmi')
  const router = useRouter()
  const searchParams = useSearchParams()

  const calculateBMI = () => {
    const h = parseFloat(height) / 100 // cm to m
    const w = parseFloat(weight)
    const ageNum = parseFloat(age) || 30

    if (!h || !w || h <= 0 || w <= 0) return

    const bmi = w / (h * h)
    const ageGroup: AgeGroup = ageNum >= 65 ? 'elderly' : 'adult'
    
    // BMI 분류 (WHO 기준, 아시아인 기준 적용)
    let category: string
    let categoryKorean: string
    let healthRisk: string

    if (ageGroup === 'elderly') {
      // 노인의 경우 기준이 약간 완화됨
      if (bmi < 22) {
        category = 'underweight'
        categoryKorean = '저체중'
        healthRisk = '영양부족 위험'
      } else if (bmi < 25) {
        category = 'normal'
        categoryKorean = '정상'
        healthRisk = '건강'
      } else if (bmi < 27) {
        category = 'overweight'
        categoryKorean = '과체중'
        healthRisk = '약간 위험'
      } else if (bmi < 30) {
        category = 'obese1'
        categoryKorean = '비만 1단계'
        healthRisk = '위험'
      } else {
        category = 'obese2'
        categoryKorean = '비만 2단계'
        healthRisk = '고위험'
      }
    } else {
      // 성인 기준 (아시아인 기준)
      if (bmi < 18.5) {
        category = 'underweight'
        categoryKorean = '저체중'
        healthRisk = '영양부족 위험'
      } else if (bmi < 23) {
        category = 'normal'
        categoryKorean = '정상'
        healthRisk = '건강'
      } else if (bmi < 25) {
        category = 'overweight'
        categoryKorean = '과체중'
        healthRisk = '약간 위험'
      } else if (bmi < 30) {
        category = 'obese1'
        categoryKorean = '비만 1단계'
        healthRisk = '위험'
      } else {
        category = 'obese2'
        categoryKorean = '비만 2단계 이상'
        healthRisk = '고위험'
      }
    }

    // 이상 체중 범위 계산 (BMI 18.5-22.9 기준)
    const minBMI = ageGroup === 'elderly' ? 22 : 18.5
    const maxBMI = ageGroup === 'elderly' ? 25 : 22.9
    
    const idealWeightMin = minBMI * h * h
    const idealWeightMax = maxBMI * h * h
    const weightDifference = w - ((idealWeightMin + idealWeightMax) / 2)

    const calculationResult = {
      bmi,
      category,
      categoryKorean,
      idealWeightMin,
      idealWeightMax,
      weightDifference,
      healthRisk
    }

    setResult(calculationResult)
    setShowSaveButton(true)
  }

  useEffect(() => {
    if (height && weight) {
      calculateBMI()
      updateURL({
        height,
        weight,
        age: age || '0',
        gender
      })
    }
  }, [height, weight, age, gender])

  // URL 파라미터에서 입력값 복원 (초기 로드시에만)
  useEffect(() => {
    const heightParam = searchParams.get('height')
    if (!heightParam) return // URL 파라미터가 없으면 복원하지 않음
    
    const weightParam = searchParams.get('weight')
    const ageParam = searchParams.get('age')
    const genderParam = searchParams.get('gender')

    if (heightParam && /^\d+(\.\d+)?$/.test(heightParam)) {
      setHeight(heightParam)
    }
    if (weightParam && /^\d+(\.\d+)?$/.test(weightParam)) {
      setWeight(weightParam)
    }
    if (ageParam && /^\d+$/.test(ageParam) && ageParam !== '0') {
      setAge(ageParam)
    }
    if (genderParam && ['male', 'female'].includes(genderParam)) {
      setGender(genderParam as Gender)
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
        // Fallback for older browsers
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
    const ageNum = parseFloat(age) || 0
    
    saveCalculation(
      {
        height: h,
        weight: w,
        age: ageNum,
        gender
      },
      {
        bmi: result.bmi,
        category: result.category,
        categoryKorean: result.categoryKorean,
        idealWeightMin: result.idealWeightMin,
        idealWeightMax: result.idealWeightMax,
        weightDifference: result.weightDifference,
        healthRisk: result.healthRisk
      }
    )
    
    setShowSaveButton(false)
  }

  const getBMIColor = (category: string) => {
    switch (category) {
      case 'underweight': return 'text-blue-600'
      case 'normal': return 'text-green-600'
      case 'overweight': return 'text-yellow-600'
      case 'obese1': return 'text-orange-600'
      case 'obese2': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getBMIBgColor = (category: string) => {
    switch (category) {
      case 'underweight': return 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-600'
      case 'normal': return 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-600'
      case 'overweight': return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-600'
      case 'obese1': return 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-600'
      case 'obese2': return 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-600'
      default: return 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600'
    }
  }

  const bmiGaugeOption = useMemo(() => {
    if (!result) return {}
    return {
      series: [{
        type: 'gauge',
        min: 10,
        max: 40,
        splitNumber: 6,
        axisLine: {
          lineStyle: {
            width: 20,
            color: [
              [0.283, '#3B82F6'],   // 10-18.5: Underweight
              [0.433, '#10B981'],   // 18.5-23: Normal
              [0.5, '#F59E0B'],     // 23-25: Overweight
              [0.667, '#F97316'],   // 25-30: Obese
              [1, '#EF4444'],       // 30-40: Severely Obese
            ]
          }
        },
        pointer: { width: 5, length: '60%', itemStyle: { color: 'auto' } },
        axisTick: { distance: -20, length: 6, lineStyle: { color: '#fff', width: 1 } },
        splitLine: { distance: -25, length: 20, lineStyle: { color: '#fff', width: 2 } },
        axisLabel: { distance: 30, fontSize: 11, color: '#6B7280' },
        detail: {
          valueAnimation: true,
          formatter: (value: number) => `${value.toFixed(1)}`,
          fontSize: 28,
          fontWeight: 'bold',
          offsetCenter: [0, '70%'],
          color: 'auto',
        },
        data: [{ value: Math.round(result.bmi * 10) / 10 }]
      }]
    }
  }, [result])

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
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
          onLoadHistory={(historyId) => {
            const inputs = loadFromHistory(historyId)
            if (inputs) {
              setHeight(inputs.height?.toString() || '')
              setWeight(inputs.weight?.toString() || '')
              setAge(inputs.age?.toString() || '')
              setGender(inputs.gender || 'male')
            }
          }}
          onRemoveHistory={removeHistory}
          onClearHistories={clearHistories}
          formatResult={(history: any) => {
            if (!history.inputs || !history.result) return t('history.empty')
            const height = history.inputs.height || 0
            const weight = history.inputs.weight || 0
            const bmi = history.result.bmi || 0
            return t('history.format', { height, weight, bmi: formatNumber(bmi, 1) })
          }}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* 입력 폼 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
            <Calculator className="w-6 h-6 mr-2 text-pink-600" />
            {t('input.title')}
          </h2>

          <div className="space-y-6">
            {/* 키 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Scale className="w-4 h-4 inline mr-1" />
                {t('input.height')}
              </label>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder={t('input.heightPlaceholder')}
                step="0.1"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-lg"
              />
            </div>

            {/* 몸무게 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Activity className="w-4 h-4 inline mr-1" />
                {t('input.weight')}
              </label>
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder={t('input.weightPlaceholder')}
                step="0.1"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-lg"
              />
            </div>

            {/* 나이 (선택사항) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('input.age')}
              </label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder={t('input.agePlaceholder')}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-lg"
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('input.ageNote')}
              </p>
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
          </div>
        </div>

        {/* 결과 */}
        <div className="space-y-6">
          {result && (
            <>
              {/* 주요 결과 */}
              <div className={`rounded-2xl shadow-lg p-8 border-2 ${getBMIBgColor(result.category)}`}>
                <h3 className="text-xl font-bold mb-6 flex items-center text-gray-900 dark:text-white">
                  <TrendingUp className="w-6 h-6 mr-2" />
                  {t('result.title')}
                </h3>
                
                <div className="space-y-4">
                  <div className="text-center">
                    <div className={`text-4xl font-bold ${getBMIColor(result.category)}`}>
                      {formatNumber(result.bmi, 1)}
                    </div>
                    <div className={`text-lg font-semibold mt-2 ${getBMIColor(result.category)}`}>
                      {result.categoryKorean}
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                      {result.healthRisk}
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-300 dark:border-gray-600 pt-4">
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-800 dark:text-gray-200">{t('result.idealWeightRange')}</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {formatNumber(result.idealWeightMin, 1)} - {formatNumber(result.idealWeightMax, 1)}kg
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-800 dark:text-gray-200">{t('result.weightDifference')}</span>
                      <span className={`font-semibold ${result.weightDifference > 0 ? 'text-red-600' : result.weightDifference < 0 ? 'text-blue-600' : 'text-green-600'}`}>
                        {result.weightDifference > 0 ? '+' : ''}{formatNumber(result.weightDifference, 1)}kg
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
                          <span>{t('common.copied')}</span>
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
                        <span>{t('common.save')}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* BMI 게이지 차트 */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                <ReactECharts option={bmiGaugeOption} style={{ height: '280px' }} />
              </div>

              {/* BMI 단계별 설명 */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                  {t('classification.title')}
                </h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-blue-600 font-medium">{t('categories.underweight')}</span>
                      <span className="text-gray-500 text-xs ml-2">(Underweight)</span>
                    </div>
                    <span className="text-gray-800 dark:text-gray-200 font-medium">18.5 미만</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-green-600 font-medium">{t('categories.normal')}</span>
                      <span className="text-gray-500 text-xs ml-2">(Normal)</span>
                    </div>
                    <span className="text-gray-800 dark:text-gray-200 font-medium">18.5 - 22.9</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-yellow-600 font-medium">{t('categories.overweight')}</span>
                      <span className="text-gray-500 text-xs ml-2">(Overweight)</span>
                    </div>
                    <span className="text-gray-800 dark:text-gray-200 font-medium">23.0 - 24.9</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-orange-600 font-medium">{t('categories.obese1')}</span>
                      <span className="text-gray-500 text-xs ml-2">(Obese Class I)</span>
                    </div>
                    <span className="text-gray-800 dark:text-gray-200 font-medium">25.0 - 29.9</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-red-600 font-medium">{t('categories.obese2')}</span>
                      <span className="text-gray-500 text-xs ml-2">(Obese Class II+)</span>
                    </div>
                    <span className="text-gray-800 dark:text-gray-200 font-medium">30.0 이상</span>
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
              <Heart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                {t('placeholder')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* BMI 건강 가이드 */}
      <div className="bg-gradient-to-br from-pink-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-8">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          💡 {t('guide.title')}
        </h3>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.meaningTitle')}
            </h4>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              <li>• {t('guide.meaning.0')}</li>
              <li>• {t('guide.meaning.1')}</li>
              <li>• {t('guide.meaning.2')}</li>
              <li>• {t('guide.meaning.3')}</li>
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

      {/* BMI 관련 추가 콘텐츠 */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* BMI 계산기 활용법 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
            <Calculator className="w-6 h-6 mr-2 text-pink-600" />
            {t('usage.title')}
          </h3>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-pink-100 dark:bg-pink-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-pink-600 font-bold text-sm">1</span>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{t('usage.steps.1.title')}</h4>
                <p className="text-gray-600 dark:text-gray-300 text-sm">{t('usage.steps.1.content')}</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-pink-100 dark:bg-pink-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-pink-600 font-bold text-sm">2</span>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{t('usage.steps.2.title')}</h4>
                <p className="text-gray-600 dark:text-gray-300 text-sm">{t('usage.steps.2.content')}</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-pink-100 dark:bg-pink-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-pink-600 font-bold text-sm">3</span>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{t('usage.steps.3.title')}</h4>
                <p className="text-gray-600 dark:text-gray-300 text-sm">{t('usage.steps.3.content')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 체중 관리 팁 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
            <Heart className="w-6 h-6 mr-2 text-red-500" />
            {t('healthTips.title')}
          </h3>
          <div className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-l-4 border-green-500">
              <h4 className="font-semibold text-green-800 dark:text-green-400 mb-2">🥗 {t('healthTips.diet.title')}</h4>
              <p className="text-green-700 dark:text-green-300 text-sm">{t('healthTips.diet.content')}</p>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-500">
              <h4 className="font-semibold text-blue-800 dark:text-blue-400 mb-2">🏃‍♂️ {t('healthTips.exercise.title')}</h4>
              <p className="text-blue-700 dark:text-blue-300 text-sm">{t('healthTips.exercise.content')}</p>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border-l-4 border-purple-500">
              <h4 className="font-semibold text-purple-800 dark:text-purple-400 mb-2">😴 {t('healthTips.sleep.title')}</h4>
              <p className="text-purple-700 dark:text-purple-300 text-sm">{t('healthTips.sleep.content')}</p>
            </div>
            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border-l-4 border-orange-500">
              <h4 className="font-semibold text-orange-800 dark:text-orange-400 mb-2">💧 {t('healthTips.water.title')}</h4>
              <p className="text-orange-700 dark:text-orange-300 text-sm">{t('healthTips.water.content')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* BMI와 질병 위험도 */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
          <TrendingUp className="w-6 h-6 mr-2 text-yellow-600" />
          BMI와 건강 위험도
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-600">
                <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">BMI 범위</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">분류</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">질병 위험도</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">주요 관심사</th>
              </tr>
            </thead>
            <tbody className="text-gray-700 dark:text-gray-300">
              <tr className="border-b border-gray-100 dark:border-gray-700">
                <td className="py-3 px-4">18.5 미만</td>
                <td className="py-3 px-4"><span className="text-blue-600 font-medium">저체중</span></td>
                <td className="py-3 px-4">증가</td>
                <td className="py-3 px-4">영양실조, 골다공증, 면역력 저하</td>
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                <td className="py-3 px-4">18.5 - 22.9</td>
                <td className="py-3 px-4"><span className="text-green-600 font-medium">정상</span></td>
                <td className="py-3 px-4">최저</td>
                <td className="py-3 px-4">건강한 상태 유지</td>
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                <td className="py-3 px-4">23.0 - 24.9</td>
                <td className="py-3 px-4"><span className="text-yellow-600 font-medium">과체중</span></td>
                <td className="py-3 px-4">약간 증가</td>
                <td className="py-3 px-4">생활습관 개선 필요</td>
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                <td className="py-3 px-4">25.0 - 29.9</td>
                <td className="py-3 px-4"><span className="text-orange-600 font-medium">비만 1단계</span></td>
                <td className="py-3 px-4">증가</td>
                <td className="py-3 px-4">당뇨, 고혈압, 심혈관 질환</td>
              </tr>
              <tr>
                <td className="py-3 px-4">30.0 이상</td>
                <td className="py-3 px-4"><span className="text-red-600 font-medium">비만 2단계</span></td>
                <td className="py-3 px-4">고위험</td>
                <td className="py-3 px-4">대사증후군, 관절질환, 수면무호흡증</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
          * 개인차가 있을 수 있으며, 정확한 진단은 의료진과 상담하시기 바랍니다.
        </p>
      </div>
    </div>
  )
}