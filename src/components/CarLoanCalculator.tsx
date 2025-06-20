'use client'

import { useState, useEffect } from 'react'
import { Car, Calculator, Percent, Calendar, DollarSign, TrendingUp, Share2, Check, Save } from 'lucide-react'
import CalculationHistory from './CalculationHistory'
import { useCalculationHistory } from '@/hooks/useCalculationHistory'
import { useTranslations } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'

interface CarLoanResult {
  monthlyPayment: number
  totalPayment: number
  totalInterest: number
  monthlyBreakdown: Array<{
    month: number
    payment: number
    principal: number
    interest: number
    balance: number
  }>
}

export default function CarLoanCalculator() {
  let t: any;
  try {
    t = useTranslations('carLoan')
  } catch (error) {
    console.error('Translation error:', error)
    // Fallback function
    t = (key: string) => key
  }
  const [carPrice, setCarPrice] = useState<string>('')
  const [downPayment, setDownPayment] = useState<string>('')
  const [loanTerm, setLoanTerm] = useState<string>('60')
  const [interestRate, setInterestRate] = useState<string>('4.5')
  const [result, setResult] = useState<CarLoanResult | null>(null)
  const [isCopied, setIsCopied] = useState(false)
  const [showSaveButton, setShowSaveButton] = useState(false)
  
  const { histories, saveCalculation, removeHistory, clearHistories, loadFromHistory } = useCalculationHistory('car-loan')
  const router = useRouter()
  const searchParams = useSearchParams()

  const calculateCarLoan = () => {
    const price = parseFloat(carPrice)
    const down = parseFloat(downPayment) || 0
    const term = parseInt(loanTerm)
    const rate = parseFloat(interestRate)

    if (!price || !term || !rate || price <= 0) return

    const loanAmount = price - down
    if (loanAmount <= 0) return

    const monthlyRate = rate / 100 / 12
    const monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, term)) / (Math.pow(1 + monthlyRate, term) - 1)
    const totalPayment = monthlyPayment * term
    const totalInterest = totalPayment - loanAmount

    // 월별 상환 내역 계산
    const monthlyBreakdown: Array<{
      month: number
      payment: number
      principal: number
      interest: number
      balance: number
    }> = []

    let balance = loanAmount
    for (let month = 1; month <= term; month++) {
      const interestPayment = balance * monthlyRate
      const principalPayment = monthlyPayment - interestPayment
      balance -= principalPayment

      monthlyBreakdown.push({
        month,
        payment: monthlyPayment,
        principal: principalPayment,
        interest: interestPayment,
        balance: Math.max(0, balance)
      })
    }

    const calculationResult = {
      monthlyPayment,
      totalPayment,
      totalInterest,
      monthlyBreakdown
    }

    setResult(calculationResult)
    setShowSaveButton(true)

    // 계산 기록은 저장 버튼을 눌렀을 때만 저장하도록 제거
  }

  useEffect(() => {
    if (carPrice && loanTerm && interestRate) {
      calculateCarLoan()
      updateURL({
        carPrice: carPrice.replace(/,/g, ''),
        downPayment: downPayment || '0',
        loanTerm,
        interestRate
      })
    }
  }, [carPrice, downPayment, loanTerm, interestRate])

  // URL 파라미터에서 입력값 복원 (초기 로드시에만)
  useEffect(() => {
    const priceParam = searchParams.get('carPrice')
    if (!priceParam) return // URL 파라미터가 없으면 복원하지 않음
    
    const downParam = searchParams.get('downPayment')
    const termParam = searchParams.get('loanTerm')
    const rateParam = searchParams.get('interestRate')

    if (priceParam && /^\d+$/.test(priceParam)) {
      setCarPrice(new Intl.NumberFormat('ko-KR').format(Number(priceParam)))
    }
    if (downParam && /^\d+$/.test(downParam) && downParam !== '0') {
      setDownPayment(new Intl.NumberFormat('ko-KR').format(Number(downParam)))
    }
    if (termParam && /^\d+$/.test(termParam)) {
      setLoanTerm(termParam)
    }
    if (rateParam && /^\d+(\.\d+)?$/.test(rateParam)) {
      setInterestRate(rateParam)
    }
  }, []) // 의존성 배열을 빈 배열로 변경하여 초기 로드시에만 실행

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(Math.round(amount))
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
    
    const price = parseFloat(carPrice)
    const down = parseFloat(downPayment) || 0
    const term = parseInt(loanTerm)
    const rate = parseFloat(interestRate)
    
    saveCalculation(
      {
        carPrice: price,
        downPayment: down,
        loanTerm: term,
        interestRate: rate
      },
      {
        monthlyPayment: result.monthlyPayment,
        totalPayment: result.totalPayment,
        totalInterest: result.totalInterest
      }
    )
    
    setShowSaveButton(false)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* 헤더 */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full text-white mb-4">
          <Car className="w-8 h-8" />
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
              setCarPrice(inputs.carPrice.toString())
              setDownPayment(inputs.downPayment?.toString() || '')
              setLoanTerm(inputs.loanTerm.toString())
              setInterestRate(inputs.interestRate.toString())
            }
          }}
          onRemoveHistory={removeHistory}
          onClearHistories={clearHistories}
          formatResult={(history: any) => {
            if (!history.inputs || !history.result) return '계산 정보 없음'
            const carPrice = history.inputs.carPrice || 0
            const monthlyPayment = history.result.monthlyPayment || 0
            return `차량가격: ${formatCurrency(carPrice)}원, 월납입금: ${formatCurrency(monthlyPayment)}원`
          }}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* 입력 폼 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
            <Calculator className="w-6 h-6 mr-2 text-blue-600" />
            할부 정보 입력
          </h2>

          <div className="space-y-6">
            {/* 차량 가격 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Car className="w-4 h-4 inline mr-1" />
                차량 가격 (원)
              </label>
              <input
                type="text"
                value={carPrice}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '')
                  setCarPrice(value)
                }}
                placeholder="30000000"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-lg"
              />
              {carPrice && (
                <p className="text-sm text-gray-500 mt-1">
                  {formatCurrency(parseFloat(carPrice))}원
                </p>
              )}
            </div>

            {/* 선수금 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <DollarSign className="w-4 h-4 inline mr-1" />
                선수금 (원)
              </label>
              <input
                type="text"
                value={downPayment}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '')
                  setDownPayment(value)
                }}
                placeholder="3000000"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-lg"
              />
              {downPayment && (
                <p className="text-sm text-gray-500 mt-1">
                  {formatCurrency(parseFloat(downPayment))}원
                </p>
              )}
            </div>

            {/* 할부 기간 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                할부 기간 (개월)
              </label>
              <select
                value={loanTerm}
                onChange={(e) => setLoanTerm(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-lg"
              >
                <option value="12">12개월 (1년)</option>
                <option value="24">24개월 (2년)</option>
                <option value="36">36개월 (3년)</option>
                <option value="48">48개월 (4년)</option>
                <option value="60">60개월 (5년)</option>
                <option value="72">72개월 (6년)</option>
                <option value="84">84개월 (7년)</option>
              </select>
            </div>

            {/* 금리 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Percent className="w-4 h-4 inline mr-1" />
                연 금리 (%)
              </label>
              <input
                type="number"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                step="0.1"
                min="0"
                max="30"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-lg"
              />
            </div>
          </div>
        </div>

        {/* 결과 */}
        <div className="space-y-6">
          {result && (
            <>
              {/* 주요 결과 */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-lg p-8 text-white">
                <h3 className="text-xl font-bold mb-6 flex items-center">
                  <TrendingUp className="w-6 h-6 mr-2" />
                  할부 계산 결과
                </h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-white/20">
                    <span className="text-blue-100">월 납입금</span>
                    <span className="text-2xl font-bold">
                      {formatCurrency(result.monthlyPayment)}원
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center py-3 border-b border-white/20">
                    <span className="text-blue-100">총 납입금</span>
                    <span className="text-xl font-semibold">
                      {formatCurrency(result.totalPayment)}원
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center py-3">
                    <span className="text-blue-100">총 이자</span>
                    <span className="text-xl font-semibold text-yellow-200">
                      {formatCurrency(result.totalInterest)}원
                    </span>
                  </div>

                  {/* 공유/저장 버튼 */}
                  <div className="flex space-x-2 mt-4">
                    <button
                      onClick={handleShare}
                      className="inline-flex items-center space-x-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-white transition-colors"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>복사됨!</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-4 h-4" />
                          <span>결과 공유</span>
                        </>
                      )}
                    </button>
                    
                    {showSaveButton && (
                      <button
                        onClick={handleSaveCalculation}
                        className="inline-flex items-center space-x-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-white transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        <span>저장</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 할부 정보 요약 */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                  할부 정보 요약
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">차량 가격</span>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(parseFloat(carPrice))}원
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">선수금</span>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(parseFloat(downPayment) || 0)}원
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">할부 원금</span>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(parseFloat(carPrice) - (parseFloat(downPayment) || 0))}원
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">할부 기간</span>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {loanTerm}개월
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {!result && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8 text-center">
              <Car className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                차량 가격과 할부 조건을 입력하면<br />
                할부 계산 결과가 표시됩니다
              </p>
            </div>
          )}
        </div>
      </div>


      {/* 할부 가이드 */}
      <div className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-8">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          💡 자동차 할부 가이드
        </h3>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              할부 선택 시 고려사항
            </h4>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              <li>• 월 소득의 30% 이내로 월납입금 설정</li>
              <li>• 선수금이 많을수록 월납입금 감소</li>
              <li>• 할부 기간이 길수록 총 이자 증가</li>
              <li>• 금리 비교를 통한 최적 조건 선택</li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              할부 금리 현황 (2024년 기준)
            </h4>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              <li>• 신차 할부: 연 3~7%</li>
              <li>• 중고차 할부: 연 5~10%</li>
              <li>• 캐피탈 할부: 연 7~15%</li>
              <li>• 은행 자동차대출: 연 3~6%</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}