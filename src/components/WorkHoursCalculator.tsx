'use client'

import { useState, useEffect } from 'react'
import { Clock, Calculator, DollarSign, Users, Share2, Check, Save, Calendar } from 'lucide-react'
import CalculationHistory from './CalculationHistory'
import { useCalculationHistory } from '@/hooks/useCalculationHistory'
import { useTranslations } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'

interface WorkHoursResult {
  basicPay: number // 기본급
  overtimePay: number // 연장근로수당 (1.5배)
  nightPay: number // 야간근로수당 (0.5배)
  holidayPay: number // 휴일근로수당 (1.5배)
  weeklyHolidayPay: number // 주휴수당
  totalPay: number // 총 급여
  totalHours: number // 총 근무시간
  overtimeHours: number // 연장근로시간
  nightHours: number // 야간근로시간
  holidayHours: number // 휴일근로시간
}

interface DayWork {
  date: string
  startTime: string
  endTime: string
  breakTime: number // 분 단위
  isHoliday: boolean
}

export default function WorkHoursCalculator() {
  const t = useTranslations('workHours')
  const tCommon = useTranslations('common')
  const [hourlyWage, setHourlyWage] = useState<string>('9860') // 2024년 최저임금
  const [weeklyHours, setWeeklyHours] = useState<string>('40') // 주 소정근로시간
  const [dailyWork, setDailyWork] = useState<DayWork[]>([
    { date: '', startTime: '09:00', endTime: '18:00', breakTime: 60, isHoliday: false }
  ])
  
  const [result, setResult] = useState<WorkHoursResult | null>(null)
  const [isCopied, setIsCopied] = useState(false)
  const [showSaveButton, setShowSaveButton] = useState(false)
  
  const { histories, saveCalculation, removeHistory, clearHistories, loadFromHistory } = useCalculationHistory('workHours')
  const router = useRouter()
  const searchParams = useSearchParams()

  // 근무시간 계산 함수
  const calculateWorkHours = () => {
    const wage = parseFloat(hourlyWage)
    const weeklyStandardHours = parseFloat(weeklyHours)
    
    if (!wage || wage <= 0) return

    let totalHours = 0
    let overtimeHours = 0
    let nightHours = 0
    let holidayHours = 0
    let workDays = 0

    // 각 날짜별 근무시간 계산
    dailyWork.forEach(day => {
      if (!day.date || !day.startTime || !day.endTime) return

      const start = new Date(`${day.date} ${day.startTime}`)
      const end = new Date(`${day.date} ${day.endTime}`)
      
      // 다음날로 넘어가는 경우 처리
      if (end < start) {
        end.setDate(end.getDate() + 1)
      }

      const workMinutes = (end.getTime() - start.getTime()) / (1000 * 60) - day.breakTime
      const dayHours = workMinutes / 60

      if (dayHours <= 0) return

      workDays++
      totalHours += dayHours

      // 휴일근로
      if (day.isHoliday) {
        holidayHours += dayHours
      } else {
        // 일일 8시간 초과시 연장근로
        if (dayHours > 8) {
          overtimeHours += dayHours - 8
        }
      }

      // 야간근로 (22:00 ~ 06:00)
      const nightStart = new Date(`${day.date} 22:00`)
      const nightEnd = new Date(`${day.date} 06:00`)
      nightEnd.setDate(nightEnd.getDate() + 1)

      // 야간시간 겹치는 부분 계산
      const workStart = Math.max(start.getTime(), nightStart.getTime())
      const workEnd = Math.min(end.getTime(), nightEnd.getTime())
      
      if (workEnd > workStart) {
        nightHours += (workEnd - workStart) / (1000 * 60 * 60)
      }
    })

    // 주 40시간 초과시 추가 연장근로
    if (totalHours > weeklyStandardHours) {
      overtimeHours += totalHours - weeklyStandardHours
    }

    // 급여 계산
    const basicHours = totalHours - overtimeHours - holidayHours
    const basicPay = Math.max(0, basicHours) * wage
    const overtimePay = overtimeHours * wage * 1.5 // 연장근로 1.5배
    const nightPay = nightHours * wage * 0.5 // 야간근로 0.5배 추가
    const holidayPay = holidayHours * wage * 1.5 // 휴일근로 1.5배

    // 주휴수당 계산 (주 15시간 이상 근무시)
    let weeklyHolidayPay = 0
    if (totalHours >= 15 && workDays >= 5) {
      const dailyAverage = totalHours / workDays
      weeklyHolidayPay = Math.min(8, dailyAverage) * wage
    }

    const totalPay = basicPay + overtimePay + nightPay + holidayPay + weeklyHolidayPay

    const calculationResult = {
      basicPay,
      overtimePay,
      nightPay,
      holidayPay,
      weeklyHolidayPay,
      totalPay,
      totalHours,
      overtimeHours,
      nightHours,
      holidayHours
    }

    setResult(calculationResult)
    setShowSaveButton(true)
  }

  // 날짜 추가
  const addWorkDay = () => {
    setDailyWork([...dailyWork, { 
      date: '', 
      startTime: '09:00', 
      endTime: '18:00', 
      breakTime: 60, 
      isHoliday: false 
    }])
  }

  // 날짜 삭제
  const removeWorkDay = (index: number) => {
    if (dailyWork.length > 1) {
      setDailyWork(dailyWork.filter((_, i) => i !== index))
    }
  }

  // 날짜별 근무정보 업데이트
  const updateWorkDay = (index: number, field: keyof DayWork, value: string | number | boolean) => {
    const updated = [...dailyWork]
    updated[index] = { ...updated[index], [field]: value }
    setDailyWork(updated)
  }

  useEffect(() => {
    if (hourlyWage && dailyWork.some(day => day.date && day.startTime && day.endTime)) {
      calculateWorkHours()
    }
  }, [hourlyWage, weeklyHours, dailyWork])

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ko-KR').format(Math.round(num))
  }

  const formatHours = (hours: number) => {
    return hours.toFixed(1)
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
    
    const wage = parseFloat(hourlyWage)
    
    saveCalculation(
      {
        hourlyWage: wage,
        weeklyHours: parseFloat(weeklyHours),
        workDays: dailyWork.length,
        totalHours: result.totalHours
      },
      {
        basicPay: result.basicPay,
        overtimePay: result.overtimePay,
        nightPay: result.nightPay,
        holidayPay: result.holidayPay,
        weeklyHolidayPay: result.weeklyHolidayPay,
        totalPay: result.totalPay
      }
    )
    
    setShowSaveButton(false)
  }

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
              setHourlyWage(inputs.hourlyWage?.toString() || '9860')
              setWeeklyHours(inputs.weeklyHours?.toString() || '40')
            }
          }}
          onRemoveHistory={removeHistory}
          onClearHistories={clearHistories}
          formatResult={(history: any) => {
            if (!history.inputs || !history.result) return t('history.empty')
            const totalPay = history.result.totalPay || 0
            const totalHours = history.inputs.totalHours || 0
            return t('history.format', {
              totalPay: formatNumber(totalPay),
              totalHours: formatHours(totalHours)
            })
          }}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* 입력 폼 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
            <Calculator className="w-6 h-6 mr-2 text-blue-600" />
            {t('input.title')}
          </h2>

          <div className="space-y-6">
            {/* 기본 설정 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('input.hourlyWage')}
                </label>
                <input
                  type="number"
                  value={hourlyWage}
                  onChange={(e) => setHourlyWage(e.target.value)}
                  placeholder="9860"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
                <p className="text-xs text-gray-500 mt-1">{t('input.hourlyWageNote')}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('input.weeklyHours')}
                </label>
                <input
                  type="number"
                  value={weeklyHours}
                  onChange={(e) => setWeeklyHours(e.target.value)}
                  placeholder="40"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
                <p className="text-xs text-gray-500 mt-1">{t('input.weeklyHoursNote')}</p>
              </div>
            </div>

            {/* 근무 일정 */}
            <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {t('input.workSchedule')}
                </h3>
                <button
                  onClick={addWorkDay}
                  className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                >
                  {t('input.addDay')}
                </button>
              </div>
              
              <div className="space-y-4">
                {dailyWork.map((day, index) => (
                  <div key={index} className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t('input.date')}
                        </label>
                        <input
                          type="date"
                          value={day.date}
                          onChange={(e) => updateWorkDay(index, 'date', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t('input.startTime')}
                        </label>
                        <input
                          type="time"
                          value={day.startTime}
                          onChange={(e) => updateWorkDay(index, 'startTime', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t('input.endTime')}
                        </label>
                        <input
                          type="time"
                          value={day.endTime}
                          onChange={(e) => updateWorkDay(index, 'endTime', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t('input.breakTime')}
                        </label>
                        <input
                          type="number"
                          value={day.breakTime}
                          onChange={(e) => updateWorkDay(index, 'breakTime', parseInt(e.target.value) || 0)}
                          placeholder="60"
                          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={day.isHoliday}
                            onChange={(e) => updateWorkDay(index, 'isHoliday', e.target.checked)}
                            className="mr-1"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{t('input.holiday')}</span>
                        </label>
                        {dailyWork.length > 1 && (
                          <button
                            onClick={() => removeWorkDay(index)}
                            className="px-2 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                          >
                            {tCommon('delete')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 결과 */}
        <div className="space-y-6">
          {result && (
            <>
              {/* 총 급여 */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-2xl shadow-lg p-8 border-2 border-blue-200 dark:border-blue-700">
                <h3 className="text-xl font-bold mb-6 flex items-center text-gray-900 dark:text-white">
                  <DollarSign className="w-6 h-6 mr-2 text-blue-600" />
                  {t('result.title')}
                </h3>
                
                <div className="text-center mb-6">
                  <div className="text-4xl font-bold text-blue-600 mb-2">
                    {formatNumber(result.totalPay)}원
                  </div>
                  <div className="text-lg text-gray-600 dark:text-gray-300">
                    {t('result.totalHours')}: {formatHours(result.totalHours)}{t('result.hours')}
                  </div>
                </div>

                {/* 공유/저장 버튼 */}
                <div className="flex space-x-2">
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

              {/* 상세 내역 */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                  {t('result.breakdown')}
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-700 dark:text-gray-300">{t('result.basicPay')}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatNumber(result.basicPay)}원
                    </span>
                  </div>
                  
                  {result.overtimePay > 0 && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-700 dark:text-gray-300">
                        {t('result.overtimePay')} ({formatHours(result.overtimeHours)}{t('result.hours')})
                      </span>
                      <span className="font-semibold text-orange-600">
                        +{formatNumber(result.overtimePay)}원
                      </span>
                    </div>
                  )}
                  
                  {result.nightPay > 0 && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-700 dark:text-gray-300">
                        {t('result.nightPay')} ({formatHours(result.nightHours)}{t('result.hours')})
                      </span>
                      <span className="font-semibold text-purple-600">
                        +{formatNumber(result.nightPay)}원
                      </span>
                    </div>
                  )}
                  
                  {result.holidayPay > 0 && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-700 dark:text-gray-300">
                        {t('result.holidayPay')} ({formatHours(result.holidayHours)}{t('result.hours')})
                      </span>
                      <span className="font-semibold text-red-600">
                        +{formatNumber(result.holidayPay)}원
                      </span>
                    </div>
                  )}
                  
                  {result.weeklyHolidayPay > 0 && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-700 dark:text-gray-300">{t('result.weeklyHolidayPay')}</span>
                      <span className="font-semibold text-green-600">
                        +{formatNumber(result.weeklyHolidayPay)}원
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {!result && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8 text-center">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                {t('placeholder')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 근로기준법 가이드 */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-8">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          💼 {t('guide.title')}
        </h3>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.overtimeTitle')}
            </h4>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              <li>• {t('guide.overtime.0')}</li>
              <li>• {t('guide.overtime.1')}</li>
              <li>• {t('guide.overtime.2')}</li>
              <li>• {t('guide.overtime.3')}</li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.allowanceTitle')}
            </h4>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              <li>• {t('guide.allowance.0')}</li>
              <li>• {t('guide.allowance.1')}</li>
              <li>• {t('guide.allowance.2')}</li>
              <li>• {t('guide.allowance.3')}</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 최저임금 정보 */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
          <Users className="w-6 h-6 mr-2 text-green-600" />
          {t('minimumWage.title')}
        </h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-2xl font-bold text-green-600 mb-2">9,860원</div>
            <div className="text-sm text-green-700 dark:text-green-300">{t('minimumWage.2024')}</div>
          </div>
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 mb-2">2,067,920원</div>
            <div className="text-sm text-blue-700 dark:text-blue-300">{t('minimumWage.monthly')}</div>
          </div>
          <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="text-2xl font-bold text-purple-600 mb-2">209시간</div>
            <div className="text-sm text-purple-700 dark:text-purple-300">{t('minimumWage.monthlyHours')}</div>
          </div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 text-center">
          {t('minimumWage.note')}
        </p>
      </div>

      {/* 근로자 권리 정보 */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
          ⚖️ {t('rights.title')}
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">{t('rights.basicTitle')}</h4>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <li>• {t('rights.basic.0')}</li>
              <li>• {t('rights.basic.1')}</li>
              <li>• {t('rights.basic.2')}</li>
              <li>• {t('rights.basic.3')}</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">{t('rights.protectionTitle')}</h4>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <li>• {t('rights.protection.0')}</li>
              <li>• {t('rights.protection.1')}</li>
              <li>• {t('rights.protection.2')}</li>
              <li>• {t('rights.protection.3')}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}