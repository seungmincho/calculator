'use client'

import { useState, useEffect } from 'react'
import { Activity, Calculator, Target, Utensils, Zap, Share2, Check, Save, TrendingUp } from 'lucide-react'
import CalculationHistory from './CalculationHistory'
import { useCalculationHistory } from '@/hooks/useCalculationHistory'
import { useTranslations } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'

interface CalorieResult {
  bmr: number // 기초대사율
  tdee: number // 활동대사율
  goalCalories: number // 목표 칼로리
  weightChangePerWeek: number // 주당 체중 변화량
  timeToGoal: number // 목표 달성까지 주수
}

type Gender = 'male' | 'female'
type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'veryActive'
type Goal = 'loseFast' | 'loseModerate' | 'loseSlow' | 'maintain' | 'gainSlow' | 'gainModerate' | 'gainFast'
type BMRFormula = 'mifflin' | 'harris'

export default function CalorieCalculator() {
  const t = useTranslations('calorie')
  const tCommon = useTranslations('common')
  const [height, setHeight] = useState<string>('')
  const [weight, setWeight] = useState<string>('')
  const [age, setAge] = useState<string>('')
  const [gender, setGender] = useState<Gender>('male')
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate')
  const [goal, setGoal] = useState<Goal>('maintain')
  const [bmrFormula, setBmrFormula] = useState<BMRFormula>('mifflin')
  const [targetWeight, setTargetWeight] = useState<string>('')
  const [result, setResult] = useState<CalorieResult | null>(null)
  const [isCopied, setIsCopied] = useState(false)
  const [showSaveButton, setShowSaveButton] = useState(false)
  
  const { histories, saveCalculation, removeHistory, clearHistories, loadFromHistory } = useCalculationHistory('calorie')
  const router = useRouter()
  const searchParams = useSearchParams()

  const calculateCalories = () => {
    const h = parseFloat(height)
    const w = parseFloat(weight)
    const a = parseFloat(age)
    const tw = parseFloat(targetWeight) || w

    if (!h || !w || !a || h <= 0 || w <= 0 || a <= 0) return

    // BMR 계산 (Mifflin-St Jeor vs Harris-Benedict)
    let bmr: number
    if (bmrFormula === 'mifflin') {
      // Mifflin-St Jeor 공식 (더 정확)
      if (gender === 'male') {
        bmr = 10 * w + 6.25 * h - 5 * a + 5
      } else {
        bmr = 10 * w + 6.25 * h - 5 * a - 161
      }
    } else {
      // Harris-Benedict 공식
      if (gender === 'male') {
        bmr = 88.362 + (13.397 * w) + (4.799 * h) - (5.677 * a)
      } else {
        bmr = 447.593 + (9.247 * w) + (3.098 * h) - (4.330 * a)
      }
    }

    // 활동 수준에 따른 TDEE 계산
    const activityMultipliers = {
      sedentary: 1.2,     // 거의 운동 안함
      light: 1.375,       // 가벼운 운동 (주 1-3회)
      moderate: 1.55,     // 보통 운동 (주 3-5회)
      active: 1.725,      // 활발한 운동 (주 6-7회)
      veryActive: 1.9     // 매우 활발 (하루 2회 또는 강도 높은 운동)
    }

    const tdee = bmr * activityMultipliers[activityLevel]

    // 목표에 따른 칼로리 조정
    const goalAdjustments = {
      loseFast: -1000,     // 주당 1kg 감량
      loseModerate: -750,  // 주당 0.75kg 감량
      loseSlow: -500,      // 주당 0.5kg 감량
      maintain: 0,         // 체중 유지
      gainSlow: 300,       // 주당 0.5kg 증량
      gainModerate: 500,   // 주당 0.75kg 증량
      gainFast: 750        // 주당 1kg 증량
    }

    const goalCalories = tdee + goalAdjustments[goal]

    // 주당 체중 변화량 (kg)
    const weightChangePerWeek = Math.abs(goalAdjustments[goal]) / 1000

    // 목표 달성까지 예상 기간 (주)
    const weightDifference = Math.abs(tw - w)
    const timeToGoal = weightChangePerWeek > 0 ? weightDifference / weightChangePerWeek : 0

    const calculationResult = {
      bmr,
      tdee,
      goalCalories,
      weightChangePerWeek,
      timeToGoal
    }

    setResult(calculationResult)
    setShowSaveButton(true)
  }

  useEffect(() => {
    if (height && weight && age) {
      calculateCalories()
      updateURL({
        height,
        weight,
        age,
        gender,
        activityLevel,
        goal,
        bmrFormula,
        targetWeight: targetWeight || '0'
      })
    }
  }, [height, weight, age, gender, activityLevel, goal, bmrFormula, targetWeight])

  // URL 파라미터에서 입력값 복원 (초기 로드시에만)
  useEffect(() => {
    const heightParam = searchParams.get('height')
    if (!heightParam) return

    const weightParam = searchParams.get('weight')
    const ageParam = searchParams.get('age')
    const genderParam = searchParams.get('gender')
    const activityParam = searchParams.get('activityLevel')
    const goalParam = searchParams.get('goal')
    const formulaParam = searchParams.get('bmrFormula')
    const targetWeightParam = searchParams.get('targetWeight')

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
    if (activityParam && ['sedentary', 'light', 'moderate', 'active', 'veryActive'].includes(activityParam)) {
      setActivityLevel(activityParam as ActivityLevel)
    }
    if (goalParam && ['loseFast', 'loseModerate', 'loseSlow', 'maintain', 'gainSlow', 'gainModerate', 'gainFast'].includes(goalParam)) {
      setGoal(goalParam as Goal)
    }
    if (formulaParam && ['mifflin', 'harris'].includes(formulaParam)) {
      setBmrFormula(formulaParam as BMRFormula)
    }
    if (targetWeightParam && /^\d+(\.\d+)?$/.test(targetWeightParam) && targetWeightParam !== '0') {
      setTargetWeight(targetWeightParam)
    }
  }, [])

  const formatNumber = (num: number, decimals: number = 0) => {
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
    const tw = parseFloat(targetWeight) || 0
    
    saveCalculation(
      {
        height: h,
        weight: w,
        age: a,
        gender,
        activityLevel,
        goal,
        bmrFormula,
        targetWeight: tw
      },
      {
        bmr: result.bmr,
        tdee: result.tdee,
        goalCalories: result.goalCalories,
        weightChangePerWeek: result.weightChangePerWeek,
        timeToGoal: result.timeToGoal
      }
    )
    
    setShowSaveButton(false)
  }

  const getGoalColor = (goalType: Goal) => {
    if (goalType.includes('lose')) return 'text-blue-600'
    if (goalType.includes('gain')) return 'text-orange-600'
    return 'text-green-600'
  }

  const getGoalBgColor = (goalType: Goal) => {
    if (goalType.includes('lose')) return 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-600'
    if (goalType.includes('gain')) return 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-600'
    return 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-600'
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* 헤더 */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-600 rounded-full text-white mb-4">
          <Utensils className="w-8 h-8" />
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
              setActivityLevel(inputs.activityLevel || 'moderate')
              setGoal(inputs.goal || 'maintain')
              setBmrFormula(inputs.bmrFormula || 'mifflin')
              setTargetWeight(inputs.targetWeight?.toString() || '')
            }
          }}
          onRemoveHistory={removeHistory}
          onClearHistories={clearHistories}
          formatResult={(history: any) => {
            if (!history.inputs || !history.result) return t('history.empty')
            const goalCalories = history.result.goalCalories || 0
            const goal = history.inputs.goal || 'maintain'
            return t('history.format', { goalCalories: formatNumber(goalCalories, 0), goal: t(`input.goals.${goal}`) })
          }}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* 입력 폼 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
            <Calculator className="w-6 h-6 mr-2 text-orange-600" />
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
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

            {/* 활동 수준 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('input.activityLevel')}
              </label>
              <select
                value={activityLevel}
                onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="sedentary">{t('input.activities.sedentary')}</option>
                <option value="light">{t('input.activities.light')}</option>
                <option value="moderate">{t('input.activities.moderate')}</option>
                <option value="active">{t('input.activities.active')}</option>
                <option value="veryActive">{t('input.activities.veryActive')}</option>
              </select>
            </div>

            {/* 목표 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('input.goal')}
              </label>
              <select
                value={goal}
                onChange={(e) => setGoal(e.target.value as Goal)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="loseFast">{t('input.goals.loseFast')}</option>
                <option value="loseModerate">{t('input.goals.loseModerate')}</option>
                <option value="loseSlow">{t('input.goals.loseSlow')}</option>
                <option value="maintain">{t('input.goals.maintain')}</option>
                <option value="gainSlow">{t('input.goals.gainSlow')}</option>
                <option value="gainModerate">{t('input.goals.gainModerate')}</option>
                <option value="gainFast">{t('input.goals.gainFast')}</option>
              </select>
            </div>

            {/* 목표 체중 (선택사항) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('input.targetWeight')}
              </label>
              <input
                type="number"
                value={targetWeight}
                onChange={(e) => setTargetWeight(e.target.value)}
                placeholder={t('input.targetWeightPlaceholder')}
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('input.targetWeightNote')}
              </p>
            </div>

            {/* BMR 공식 선택 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('input.bmrFormula')}
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={bmrFormula === 'mifflin'}
                    onChange={() => setBmrFormula('mifflin')}
                    className="mr-2"
                  />
                  {t('input.formulas.mifflin')}
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={bmrFormula === 'harris'}
                    onChange={() => setBmrFormula('harris')}
                    className="mr-2"
                  />
                  {t('input.formulas.harris')}
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
              <div className={`rounded-2xl shadow-lg p-8 border-2 ${getGoalBgColor(goal)}`}>
                <h3 className="text-xl font-bold mb-6 flex items-center text-gray-900 dark:text-white">
                  <Target className="w-6 h-6 mr-2" />
                  {t('result.title')}
                </h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-white dark:bg-gray-700 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {formatNumber(result.bmr, 0)}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">{t('result.bmr')}</div>
                    </div>
                    <div className="text-center p-4 bg-white dark:bg-gray-700 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {formatNumber(result.tdee, 0)}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">{t('result.tdee')}</div>
                    </div>
                  </div>
                  
                  <div className="text-center p-6 bg-white dark:bg-gray-700 rounded-lg">
                    <div className={`text-3xl font-bold ${getGoalColor(goal)}`}>
                      {formatNumber(result.goalCalories, 0)}
                    </div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white mt-2">
                      {t('result.goalCalories')}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      {t(`input.goals.${goal}`)}
                    </div>
                  </div>

                  {result.timeToGoal > 0 && targetWeight && (
                    <div className="border-t border-gray-300 dark:border-gray-600 pt-4">
                      <div className="flex justify-between items-center py-2">
                        <span className="text-gray-800 dark:text-gray-200">{t('result.weightChangePerWeek')}</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {formatNumber(result.weightChangePerWeek, 1)}kg
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center py-2">
                        <span className="text-gray-800 dark:text-gray-200">{t('result.timeToGoal')}</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {formatNumber(result.timeToGoal, 0)}주
                        </span>
                      </div>
                    </div>
                  )}

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

              {/* 상세 정보 */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                  {t('result.details')}
                </h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 dark:text-gray-300">{t('result.bmrFormula')}</span>
                    <span className="text-gray-800 dark:text-gray-200 font-medium">
                      {t(`input.formulas.${bmrFormula}`)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 dark:text-gray-300">{t('result.activityMultiplier')}</span>
                    <span className="text-gray-800 dark:text-gray-200 font-medium">
                      {t(`input.activities.${activityLevel}`)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 dark:text-gray-300">{t('result.calorieAdjustment')}</span>
                    <span className="text-gray-800 dark:text-gray-200 font-medium">
                      {goal.includes('lose') ? '-' : goal === 'maintain' ? '±' : '+'}{Math.abs(result.goalCalories - result.tdee)} kcal/일
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {!result && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8 text-center">
              <Utensils className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                {t('placeholder')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 칼로리 가이드 */}
      <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-8">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          💡 {t('guide.title')}
        </h3>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.bmrTitle')}
            </h4>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              <li>• {t('guide.bmr.0')}</li>
              <li>• {t('guide.bmr.1')}</li>
              <li>• {t('guide.bmr.2')}</li>
              <li>• {t('guide.bmr.3')}</li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.calorieTitle')}
            </h4>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              <li>• {t('guide.calorie.0')}</li>
              <li>• {t('guide.calorie.1')}</li>
              <li>• {t('guide.calorie.2')}</li>
              <li>• {t('guide.calorie.3')}</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 음식 칼로리 참고표 */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
          <Utensils className="w-6 h-6 mr-2 text-green-600" />
          {t('foodCalories.title')}
        </h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">{t('foodCalories.staples')}</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>{t('foodCalories.items.rice')}</span>
                <span className="font-medium">300 kcal</span>
              </div>
              <div className="flex justify-between">
                <span>{t('foodCalories.items.ramen')}</span>
                <span className="font-medium">500 kcal</span>
              </div>
              <div className="flex justify-between">
                <span>{t('foodCalories.items.kimbap')}</span>
                <span className="font-medium">550 kcal</span>
              </div>
              <div className="flex justify-between">
                <span>{t('foodCalories.items.bread')}</span>
                <span className="font-medium">80 kcal</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">{t('foodCalories.proteins')}</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>{t('foodCalories.items.chicken')}</span>
                <span className="font-medium">165 kcal</span>
              </div>
              <div className="flex justify-between">
                <span>{t('foodCalories.items.egg')}</span>
                <span className="font-medium">70 kcal</span>
              </div>
              <div className="flex justify-between">
                <span>{t('foodCalories.items.tofu')}</span>
                <span className="font-medium">80 kcal</span>
              </div>
              <div className="flex justify-between">
                <span>{t('foodCalories.items.milk')}</span>
                <span className="font-medium">130 kcal</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">{t('foodCalories.snacks')}</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>{t('foodCalories.items.apple')}</span>
                <span className="font-medium">80 kcal</span>
              </div>
              <div className="flex justify-between">
                <span>{t('foodCalories.items.banana')}</span>
                <span className="font-medium">90 kcal</span>
              </div>
              <div className="flex justify-between">
                <span>{t('foodCalories.items.almond')}</span>
                <span className="font-medium">60 kcal</span>
              </div>
              <div className="flex justify-between">
                <span>{t('foodCalories.items.chocolate')}</span>
                <span className="font-medium">50 kcal</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 운동 칼로리 소모표 */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
          <Activity className="w-6 h-6 mr-2 text-red-500" />
          {t('exerciseCalories.title')}
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">{t('exerciseCalories.cardio')}</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>{t('exerciseCalories.items.walking')}</span>
                <span className="font-medium">150 kcal</span>
              </div>
              <div className="flex justify-between">
                <span>{t('exerciseCalories.items.jogging')}</span>
                <span className="font-medium">300 kcal</span>
              </div>
              <div className="flex justify-between">
                <span>{t('exerciseCalories.items.cycling')}</span>
                <span className="font-medium">250 kcal</span>
              </div>
              <div className="flex justify-between">
                <span>{t('exerciseCalories.items.swimming')}</span>
                <span className="font-medium">350 kcal</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">{t('exerciseCalories.strength')}</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>{t('exerciseCalories.items.weight')}</span>
                <span className="font-medium">180 kcal</span>
              </div>
              <div className="flex justify-between">
                <span>{t('exerciseCalories.items.yoga')}</span>
                <span className="font-medium">120 kcal</span>
              </div>
              <div className="flex justify-between">
                <span>{t('exerciseCalories.items.stairs')}</span>
                <span className="font-medium">300 kcal</span>
              </div>
              <div className="flex justify-between">
                <span>{t('exerciseCalories.items.jumprope')}</span>
                <span className="font-medium">400 kcal</span>
              </div>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
          {t('exerciseCalories.note')}
        </p>
      </div>
    </div>
  )
}