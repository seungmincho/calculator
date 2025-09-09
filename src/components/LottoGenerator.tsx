'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Sparkles, RefreshCw, Share2, Check, Save, Dice6, BarChart3, Star, Search, TrendingUp, Calendar, Award, Database, Activity, Filter, Shield, ChartBar, Zap, AlertCircle, CheckCircle } from 'lucide-react'
import CalculationHistory from './CalculationHistory'
import FeedbackWidget from './FeedbackWidget'
import PDFExport from './PDFExport'
import { useCalculationHistory } from '@/hooks/useCalculationHistory'
import { useTranslations } from 'next-intl'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts'
import { useLottoData } from '@/hooks/useLottoData'

interface LottoResult {
  numbers: number[]
  bonusNumber?: number
  generateMethod: 'random' | 'statistics' | 'mixed'
  excludedNumbers: number[]
  timestamp: number
}

interface WinningNumber {
  round: number
  drawDate: string
  numbers: number[]
  bonusNumber: number
}

interface NumberStatistics {
  number: number
  frequency: number
  lastAppearance: number
  roundsAgo: number
}

export default function LottoGenerator() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('lotto')
  const tCommon = useTranslations('common')
  
  const [generatedNumbers, setGeneratedNumbers] = useState<number[]>([])
  const [bonusNumber, setBonusNumber] = useState<number | null>(null)
  const [generateMethod, setGenerateMethod] = useState<'random' | 'statistics' | 'mixed'>('random')
  const [excludedNumbers, setExcludedNumbers] = useState<number[]>([])
  const [numberOfSets, setNumberOfSets] = useState<number>(1)
  const [generatedSets, setGeneratedSets] = useState<LottoResult[]>([])
  const [isCopied, setIsCopied] = useState(false)
  const [showSaveButton, setShowSaveButton] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeStatsTab, setActiveStatsTab] = useState<'frequency' | 'recent' | 'patterns'>('frequency')
  const [searchRound, setSearchRound] = useState('')
  const [searchResult, setSearchResult] = useState<WinningNumber | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [winningHistory, setWinningHistory] = useState<WinningNumber[]>([])
  const [numberStats, setNumberStats] = useState<NumberStatistics[]>([])

  const { histories, saveCalculation, removeHistory, clearHistories, loadFromHistory } = useCalculationHistory('lotto')
  
  // 새로운 로또 데이터 자동 업데이트 시스템
  const {
    lottoData,
    latestDrawData,
    recentDraws,
    numberStats: autoNumberStats,
    isLoading: dataLoading,
    isUpdating,
    updateStatus,
    dataStats,
    refreshData,
    checkForUpdates,
    getDrawByNumber
  } = useLottoData()

  // 당첨번호 조회 (새로운 시스템 사용)
  const searchWinningNumber = async (round: string) => {
    if (!round || isNaN(parseInt(round))) return
    
    setIsSearching(true)
    
    try {
      const roundNo = parseInt(round)
      const roundData = getDrawByNumber(roundNo)
      
      if (roundData) {
        const result: WinningNumber = {
          round: roundData.drwNo,
          drawDate: roundData.drwNoDate,
          numbers: [
            roundData.drwtNo1,
            roundData.drwtNo2,
            roundData.drwtNo3,
            roundData.drwtNo4,
            roundData.drwtNo5,
            roundData.drwtNo6
          ].sort((a, b) => a - b),
          bonusNumber: roundData.bnusNo
        }
        setSearchResult(result)
      } else {
        setSearchResult(null)
      }
    } catch (error) {
      console.error('당첨번호 조회 실패:', error)
      setSearchResult(null)
    } finally {
      setIsSearching(false)
    }
  }

  // 최신 당첨번호 가져오기 (새로운 시스템에서 자동 관리)
  const [latestWinning, setLatestWinning] = useState<WinningNumber | null>(null)
  
  // 새로운 시스템의 최신 데이터를 latestWinning 상태에 동기화
  useEffect(() => {
    if (latestDrawData) {
      const result: WinningNumber = {
        round: latestDrawData.drwNo,
        drawDate: latestDrawData.drwNoDate,
        numbers: [
          latestDrawData.drwtNo1,
          latestDrawData.drwtNo2,
          latestDrawData.drwtNo3,
          latestDrawData.drwtNo4,
          latestDrawData.drwtNo5,
          latestDrawData.drwtNo6
        ].sort((a, b) => a - b),
        bonusNumber: latestDrawData.bnusNo
      }
      setLatestWinning(result)
    }
  }, [latestDrawData])

  // 번호별 통계 계산
  const calculateNumberStats = (): NumberStatistics[] => {
    const stats: { [key: number]: { count: number, lastRound: number } } = {}
    
    // 초기화
    for (let i = 1; i <= 45; i++) {
      stats[i] = { count: 0, lastRound: 0 }
    }
    
    // 실제 당첨번호 이력이 있으면 사용, 없으면 목 데이터 사용
    const dataToUse = winningHistory.length > 0 ? winningHistory : mockWinningNumbers
    
    // 당첨번호 집계
    dataToUse.forEach(winning => {
      winning.numbers.forEach(num => {
        stats[num].count++
        if (winning.round > stats[num].lastRound) {
          stats[num].lastRound = winning.round
        }
      })
    })
    
    const currentRound = Math.max(...dataToUse.map(w => w.round))
    
    return Object.entries(stats).map(([num, data]) => ({
      number: parseInt(num),
      frequency: data.count,
      lastAppearance: data.lastRound,
      roundsAgo: data.lastRound > 0 ? currentRound - data.lastRound : 999
    })).sort((a, b) => b.frequency - a.frequency)
  }

  // 핫/콜드 번호 생성
  const generateHotNumbers = () => {
    const stats = calculateNumberStats()
    const hotNumbers = stats.slice(0, 15).map(s => s.number)
    return generateNumbersFromPool(hotNumbers)
  }

  const generateColdNumbers = () => {
    const stats = calculateNumberStats()
    const coldNumbers = stats.slice(-15).map(s => s.number)
    return generateNumbersFromPool(coldNumbers)
  }

  const generateNumbersFromPool = (pool: number[]) => {
    const availableNumbers = pool.filter(num => !excludedNumbers.includes(num))
    const selected: number[] = []
    
    while (selected.length < 6 && availableNumbers.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableNumbers.length)
      const number = availableNumbers.splice(randomIndex, 1)[0]
      selected.push(number)
    }
    
    // 부족한 경우 전체 풀에서 추가
    if (selected.length < 6) {
      const remainingPool = Array.from({ length: 45 }, (_, i) => i + 1)
        .filter(num => !selected.includes(num) && !excludedNumbers.includes(num))
      
      while (selected.length < 6 && remainingPool.length > 0) {
        const randomIndex = Math.floor(Math.random() * remainingPool.length)
        const number = remainingPool.splice(randomIndex, 1)[0]
        selected.push(number)
      }
    }
    
    return selected.sort((a, b) => a - b)
  }

  // URL 업데이트 함수
  const updateURL = (newParams: Record<string, string>) => {
    const params = new URLSearchParams(searchParams)
    Object.entries(newParams).forEach(([key, value]) => {
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  // 모의 당첨번호 데이터 (실제 로또 API 연동 시 교체)
  const mockWinningNumbers: WinningNumber[] = [
    { round: 1100, drawDate: '2024-12-21', numbers: [5, 12, 18, 25, 31, 42], bonusNumber: 7 },
    { round: 1099, drawDate: '2024-12-14', numbers: [3, 15, 22, 28, 35, 44], bonusNumber: 11 },
    { round: 1098, drawDate: '2024-12-07', numbers: [8, 14, 21, 29, 36, 43], bonusNumber: 16 },
    { round: 1097, drawDate: '2024-11-30', numbers: [2, 17, 24, 31, 38, 45], bonusNumber: 9 },
    { round: 1096, drawDate: '2024-11-23', numbers: [6, 13, 19, 26, 33, 41], bonusNumber: 4 }
  ]

  // 통계 기반 가중치 (실제 로또 데이터 기반 시뮬레이션)
  const numberFrequency: { [key: number]: number } = {
    1: 320, 2: 315, 3: 310, 4: 325, 5: 318, 6: 312, 7: 328,
    8: 305, 9: 322, 10: 315, 11: 308, 12: 335, 13: 318, 14: 312,
    15: 325, 16: 308, 17: 340, 18: 315, 19: 310, 20: 330, 21: 315,
    22: 308, 23: 325, 24: 318, 25: 312, 26: 335, 27: 320, 28: 315,
    29: 310, 30: 325, 31: 308, 32: 315, 33: 340, 34: 325, 35: 318,
    36: 312, 37: 320, 38: 315, 39: 335, 40: 328, 41: 315, 42: 310,
    43: 325, 44: 318, 45: 312
  }

  // 안전한 난수 생성 (crypto.getRandomValues 사용)
  const getSecureRandomInt = (max: number): number => {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      const array = new Uint32Array(1)
      window.crypto.getRandomValues(array)
      return array[0] % max
    } else {
      // 폴백: 서버사이드나 구형 브라우저용
      return Math.floor(Math.random() * max)
    }
  }

  // 완전 랜덤 번호 생성 (암호화 수준의 난수 사용)
  const generateRandomNumbers = (exclude: number[] = []): number[] => {
    const availableNumbers = Array.from({ length: 45 }, (_, i) => i + 1)
      .filter(num => !exclude.includes(num))
    
    const selected: number[] = []
    while (selected.length < 6 && availableNumbers.length > 0) {
      const randomIndex = getSecureRandomInt(availableNumbers.length)
      const number = availableNumbers.splice(randomIndex, 1)[0]
      selected.push(number)
    }
    
    return selected.sort((a, b) => a - b)
  }

  // 통계 기반 번호 생성
  const generateStatisticsNumbers = (exclude: number[] = []): number[] => {
    const availableNumbers = Array.from({ length: 45 }, (_, i) => i + 1)
      .filter(num => !exclude.includes(num))
    
    // 실제 통계를 기반으로 가중치 계산
    const currentStats = calculateNumberStats()
    const statsMap = currentStats.reduce((acc, stat) => {
      acc[stat.number] = stat.frequency
      return acc
    }, {} as { [key: number]: number })
    
    // 가중치 기반 선택
    const weightedNumbers: number[] = []
    availableNumbers.forEach(num => {
      const frequency = statsMap[num] || 1
      // 빈도수를 가중치로 사용 (최소 1, 최대 빈도수/10)
      const weight = Math.max(1, Math.floor(frequency / 10))
      for (let i = 0; i < weight; i++) {
        weightedNumbers.push(num)
      }
    })
    
    const selected: number[] = []
    const usedNumbers = new Set<number>()
    
    while (selected.length < 6 && weightedNumbers.length > 0) {
      const randomIndex = getSecureRandomInt(weightedNumbers.length)
      const number = weightedNumbers[randomIndex]
      
      if (!usedNumbers.has(number)) {
        selected.push(number)
        usedNumbers.add(number)
      }
      
      // 선택된 번호를 배열에서 모두 제거
      weightedNumbers.splice(randomIndex, 1)
    }
    
    return selected.sort((a, b) => a - b)
  }

  // 혼합 방식 번호 생성
  const generateMixedNumbers = (exclude: number[] = []): number[] => {
    const randomCount = 3
    const statsCount = 3
    
    const randomNums = generateRandomNumbers(exclude).slice(0, randomCount)
    const statsNums = generateStatisticsNumbers([...exclude, ...randomNums]).slice(0, statsCount)
    
    return [...randomNums, ...statsNums].sort((a, b) => a - b)
  }

  // 로또 번호 생성
  const generateLottoNumbers = () => {
    setIsGenerating(true)
    
    setTimeout(() => {
      const sets: LottoResult[] = []
      
      for (let i = 0; i < numberOfSets; i++) {
        let numbers: number[] = []
        
        switch (generateMethod) {
          case 'random':
            numbers = generateRandomNumbers(excludedNumbers)
            break
          case 'statistics':
            numbers = generateStatisticsNumbers(excludedNumbers)
            break
          case 'mixed':
            numbers = generateMixedNumbers(excludedNumbers)
            break
        }
        
        // 보너스 번호 생성 (첫 번째 세트에만)
        let bonus: number | undefined
        if (i === 0) {
          const remainingNumbers = Array.from({ length: 45 }, (_, i) => i + 1)
            .filter(num => !numbers.includes(num) && !excludedNumbers.includes(num))
          if (remainingNumbers.length > 0) {
            bonus = remainingNumbers[getSecureRandomInt(remainingNumbers.length)]
          }
        }
        
        sets.push({
          numbers,
          bonusNumber: bonus,
          generateMethod,
          excludedNumbers: [...excludedNumbers],
          timestamp: Date.now() + i
        })
      }
      
      setGeneratedSets(sets)
      if (sets.length > 0) {
        setGeneratedNumbers(sets[0].numbers)
        setBonusNumber(sets[0].bonusNumber || null)
      }
      setShowSaveButton(true)
      setIsGenerating(false)
    }, 800) // 애니메이션 효과
  }

  // 제외 번호 토글
  const toggleExcludeNumber = (number: number) => {
    let newExcluded: number[]
    if (excludedNumbers.includes(number)) {
      newExcluded = excludedNumbers.filter(n => n !== number)
    } else {
      newExcluded = [...excludedNumbers, number]
    }
    setExcludedNumbers(newExcluded)
    updateURL({ excluded: JSON.stringify(newExcluded) })
  }

  // 제외 번호 초기화
  const clearExcludedNumbers = () => {
    setExcludedNumbers([])
    updateURL({ excluded: '' })
  }

  const formatNumbers = (numbers: number[]) => {
    return numbers.join(', ')
  }

  const handleShare = async () => {
    try {
      const currentUrl = window.location.href
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(currentUrl)
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
      } else {
        // Fallback for older browsers or non-HTTPS
        const textArea = document.createElement('textarea')
        textArea.value = currentUrl
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
      }
    } catch (err) {
      console.error('Failed to copy URL:', err)
    }
  }

  const getMethodName = (method: string) => {
    switch (method) {
      case 'random': return t('methods.random')
      case 'statistics': return t('methods.statistics')
      case 'mixed': return t('methods.mixed')
      default: return t('methods.random')
    }
  }

  const handleSaveCalculation = () => {
    if (generatedSets.length === 0) return
    
    saveCalculation(
      {
        generateMethod,
        excludedNumbers: [...excludedNumbers],
        numberOfSets,
        generatedAt: new Date().toISOString()
      },
      {
        sets: generatedSets,
        totalSets: numberOfSets
      }
    )
    
    setShowSaveButton(false)
  }

  // URL에서 초기값 로드
  useEffect(() => {
    const methodParam = searchParams.get('method')
    const excludedParam = searchParams.get('excluded')
    const setsParam = searchParams.get('sets')

    if (methodParam && ['random', 'statistics', 'mixed'].includes(methodParam)) {
      setGenerateMethod(methodParam as 'random' | 'statistics' | 'mixed')
    }

    if (excludedParam) {
      try {
        const parsedExcluded = JSON.parse(excludedParam)
        if (Array.isArray(parsedExcluded)) {
          setExcludedNumbers(parsedExcluded)
        }
      } catch (err) {
        console.warn('Failed to parse excluded numbers from URL:', err)
      }
    }

    if (setsParam) {
      const sets = parseInt(setsParam)
      if ([1, 2, 3, 4, 5].includes(sets)) {
        setNumberOfSets(sets)
      }
    }
  }, [searchParams])

  // 과거 당첨번호 이력 로드 (lottoData에서 직접 로드)
  const loadWinningHistory = async () => {
    try {
      // lottoData.ts에서 직접 모든 데이터 가져오기
      const { lottoData } = await import('../../public/lottoData')
      
      // 모든 당첨번호를 WinningNumber 형태로 변환
      const winningData: WinningNumber[] = Object.values(lottoData).map((data: any) => ({
        round: data.drwNo,
        drawDate: data.drwNoDate,
        numbers: [
          data.drwtNo1,
          data.drwtNo2,
          data.drwtNo3,
          data.drwtNo4,
          data.drwtNo5,
          data.drwtNo6
        ].sort((a, b) => a - b),
        bonusNumber: data.bnusNo
      }))
      
      // 회차 순서대로 정렬 (최신순)
      winningData.sort((a, b) => b.round - a.round)
      
      setWinningHistory(winningData)
      console.log(`로또 이력 ${winningData.length}회차 로드 완료`)
    } catch (error) {
      console.error('당첨번호 이력 로드 실패:', error)
    }
  }

  // 당첨번호 이력이 변경되면 통계 재계산
  useEffect(() => {
    setNumberStats(calculateNumberStats())
  }, [winningHistory])

  // 초기 데이터 로드 (fetchLatestWinning 제거, 새로운 시스템에서 자동 처리)
  useEffect(() => {
    setWinningHistory(mockWinningNumbers)
    loadWinningHistory() // 과거 당첨번호 이력 로드
  }, [])

  // 번호 색상 결정
  const getNumberColor = (number: number) => {
    if (number <= 10) return 'bg-yellow-500 text-white'
    if (number <= 20) return 'bg-blue-500 text-white'
    if (number <= 30) return 'bg-red-500 text-white'
    if (number <= 40) return 'bg-gray-600 text-white'
    return 'bg-green-500 text-white'
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* 헤더 */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full text-white mb-4">
          <Sparkles className="w-8 h-8" />
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
              setGenerateMethod(inputs.generateMethod || 'random')
              setExcludedNumbers(inputs.excludedNumbers || [])
              setNumberOfSets(inputs.numberOfSets || 1)
            }
          }}
          onRemoveHistory={removeHistory}
          onClearHistories={clearHistories}
          formatResult={(history: any) => {
            if (!history.inputs || !history.result) return t('history.empty')
            const method = getMethodName(history.inputs.generateMethod || 'random')
            const sets = history.result.totalSets || 1
            return t('history.format', { method, sets })
          }}
        />
      </div>

      {/* 당첨번호 조회 섹션 */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
          <Database className="w-6 h-6 mr-2 text-green-600" />
          {t('winningNumbers')}
        </h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* 회차 검색 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('searchRound')}</h3>
            <div className="flex gap-2 mb-4">
              <input
                type="number"
                value={searchRound}
                onChange={(e) => setSearchRound(e.target.value)}
                placeholder={t('searchRoundPlaceholder')}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
              <button
                onClick={() => searchWinningNumber(searchRound)}
                disabled={isSearching || !searchRound}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSearching ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                {t('searchButton')}
              </button>
            </div>
            
            {searchResult && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {t('round')} {searchResult.round} ({searchResult.drawDate})
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {searchResult.numbers.map((number, index) => (
                    <div
                      key={index}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getNumberColor(number)}`}
                    >
                      {number}
                    </div>
                  ))}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {t('bonusNumber')}: <span className="font-bold">{searchResult.bonusNumber}</span>
                </div>
              </div>
            )}
            
            {searchRound && !searchResult && !isSearching && (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {t('noData')}
              </div>
            )}
          </div>
          
          {/* 최신 추첨 */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('latestDrawing')}</h3>
              <div className="flex items-center space-x-2">
                {/* 데이터 상태 표시 */}
                {dataStats && (
                  <div className="flex items-center space-x-1 text-xs">
                    {dataStats.dataUpToDate ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-yellow-500" />
                    )}
                    <span className="text-gray-600 dark:text-gray-400">
                      {dataStats.totalDraws}회차
                    </span>
                  </div>
                )}
                
                {/* 업데이트 버튼 */}
                <button
                  onClick={checkForUpdates}
                  disabled={isUpdating}
                  className="p-1.5 text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="최신 회차 확인"
                >
                  <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
            
            {/* 업데이트 상태 표시 */}
            {updateStatus && (
              <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <div className="flex items-center space-x-2">
                  {isUpdating && <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />}
                  <span className="text-sm text-blue-800 dark:text-blue-200">{updateStatus}</span>
                </div>
              </div>
            )}
            
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 rounded-lg p-4">
              {latestWinning ? (
                <>
                  <div className="text-sm text-purple-600 dark:text-purple-400 mb-2">
                    {t('round')} {latestWinning.round} ({latestWinning.drawDate})
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {latestWinning.numbers.map((number, index) => (
                      <div
                        key={index}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getNumberColor(number)}`}
                      >
                        {number}
                      </div>
                    ))}
                  </div>
                  <div className="text-sm text-purple-600 dark:text-purple-400">
                    {t('bonusNumber')}: <span className="font-bold">{latestWinning.bonusNumber}</span>
                  </div>
                </>
              ) : dataLoading ? (
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                  <div className="text-sm">{t('loading')}</div>
                </div>
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <AlertCircle className="w-6 h-6 mx-auto mb-2" />
                  <div className="text-sm">최신 회차 정보를 불러올 수 없습니다</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* 통계 기반 추천 섹션 */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
          <Activity className="w-6 h-6 mr-2 text-blue-600" />
          {t('statisticsRecommendation')}
        </h2>
        
        {/* 탭 메뉴 */}
        <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          {(['frequency', 'recent', 'patterns'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveStatsTab(tab)}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                activeStatsTab === tab
                  ? 'bg-white dark:bg-gray-600 text-purple-600 dark:text-purple-400 shadow'
                  : 'text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400'
              }`}
            >
              {t(`statisticsTabs.${tab}`)}
            </button>
          ))}
        </div>
        
        {activeStatsTab === 'frequency' && (
          <div>
            {/* 번호별 출현 빈도 차트 */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <ChartBar className="w-5 h-5 mr-2 text-purple-600" />
                번호별 출현 빈도 통계
              </h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={numberStats.slice(0, 20)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="number" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="frequency">
                    {numberStats.slice(0, 20).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index < 6 ? '#EF4444' : '#3B82F6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* 자주 나온 번호 */}
              <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-red-500" />
                  {t('hotNumbers')}
                  <span className="ml-2 text-xs bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 px-2 py-1 rounded-full">
                    TOP 10
                  </span>
                </h3>
                <div className="grid grid-cols-5 gap-3 mb-4">
                  {numberStats.slice(0, 10).map((stat, index) => (
                    <div key={stat.number} className="text-center group">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold mx-auto mb-1 ${getNumberColor(stat.number)} transform transition-transform group-hover:scale-110 shadow-lg`}>
                        {stat.number}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">{stat.frequency}회</div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    const hotNumbers = generateHotNumbers()
                    setGeneratedSets([{
                      numbers: hotNumbers,
                      generateMethod: 'statistics',
                      excludedNumbers: [...excludedNumbers],
                      timestamp: Date.now()
                    }])
                    setGeneratedNumbers(hotNumbers)
                    setShowSaveButton(true)
                  }}
                  className="w-full bg-gradient-to-r from-red-500 to-orange-500 text-white py-3 rounded-lg hover:from-red-600 hover:to-orange-600 transition-all flex items-center justify-center gap-2 shadow-lg transform hover:scale-105"
                >
                  <Zap className="w-4 h-4" />
                  {t('generateBasedOnHot')}
                </button>
              </div>
              
              {/* 적게 나온 번호 */}
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-blue-500 transform rotate-180" />
                  {t('coldNumbers')}
                  <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 px-2 py-1 rounded-full">
                    COLD 10
                  </span>
                </h3>
                <div className="grid grid-cols-5 gap-3 mb-4">
                  {numberStats.slice(-10).reverse().map((stat, index) => (
                    <div key={stat.number} className="text-center group">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold mx-auto mb-1 ${getNumberColor(stat.number)} transform transition-transform group-hover:scale-110 shadow-lg`}>
                        {stat.number}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">{stat.frequency}회</div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    const coldNumbers = generateColdNumbers()
                    setGeneratedSets([{
                      numbers: coldNumbers,
                      generateMethod: 'statistics',
                      excludedNumbers: [...excludedNumbers],
                      timestamp: Date.now()
                    }])
                    setGeneratedNumbers(coldNumbers)
                    setShowSaveButton(true)
                  }}
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all flex items-center justify-center gap-2 shadow-lg transform hover:scale-105"
                >
                  <Shield className="w-4 h-4" />
                  {t('generateBasedOnCold')}
                </button>
              </div>
            </div>
            
            {/* 균형 잡힌 생성 */}
            <button
              onClick={() => {
                const balancedNumbers = generateMixedNumbers(excludedNumbers)
                setGeneratedSets([{
                  numbers: balancedNumbers,
                  generateMethod: 'mixed',
                  excludedNumbers: [...excludedNumbers],
                  timestamp: Date.now()
                }])
                setGeneratedNumbers(balancedNumbers)
                setShowSaveButton(true)
              }}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all flex items-center justify-center gap-2 shadow-xl transform hover:scale-105"
            >
              <BarChart3 className="w-5 h-5" />
              <span className="font-semibold">{t('generateBalanced')}</span>
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full ml-2">HOT + COLD MIX</span>
            </button>

            {/* 통계 정보 요약 */}
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {Math.max(...numberStats.map(s => s.frequency))}회
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">최다 출현</div>
              </div>
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {Math.min(...numberStats.map(s => s.frequency))}회
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">최소 출현</div>
              </div>
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {(numberStats.reduce((sum, s) => sum + s.frequency, 0) / 45).toFixed(0)}회
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">평균 출현</div>
              </div>
            </div>
          </div>
        )}
        
        {activeStatsTab === 'recent' && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{t('recentTrends')} {t('comingSoon')}.</p>
          </div>
        )}
        
        {activeStatsTab === 'patterns' && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{t('patternAnalysis')} {t('comingSoon')}.</p>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* 설정 패널 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
            <Dice6 className="w-6 h-6 mr-2 text-purple-600" />
            {t('settings.title')}
          </h2>

          <div className="space-y-6">
            {/* 생성 방식 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {t('settings.method')}
              </label>
              <div className="grid grid-cols-1 gap-3">
                <label className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                  <input
                    type="radio"
                    value="random"
                    checked={generateMethod === 'random'}
                    onChange={(e) => {
                      const value = e.target.value as 'random' | 'statistics' | 'mixed'
                      setGenerateMethod(value)
                      updateURL({ method: value })
                    }}
                    className="text-purple-600"
                  />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{t('methods.random')}</div>
                    <div className="text-sm text-gray-500">{t('methods.randomDesc')}</div>
                  </div>
                </label>
                
                <label className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                  <input
                    type="radio"
                    value="statistics"
                    checked={generateMethod === 'statistics'}
                    onChange={(e) => {
                      const value = e.target.value as 'random' | 'statistics' | 'mixed'
                      setGenerateMethod(value)
                      updateURL({ method: value })
                    }}
                    className="text-purple-600"
                  />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{t('methods.statistics')}</div>
                    <div className="text-sm text-gray-500">{t('methods.statisticsDesc')}</div>
                  </div>
                </label>
                
                <label className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                  <input
                    type="radio"
                    value="mixed"
                    checked={generateMethod === 'mixed'}
                    onChange={(e) => {
                      const value = e.target.value as 'random' | 'statistics' | 'mixed'
                      setGenerateMethod(value)
                      updateURL({ method: value })
                    }}
                    className="text-purple-600"
                  />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{t('methods.mixed')}</div>
                    <div className="text-sm text-gray-500">{t('methods.mixedDesc')}</div>
                  </div>
                </label>
              </div>
            </div>

            {/* 게임 수 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('settings.numberOfSets')}
              </label>
              <select
                value={numberOfSets}
                onChange={(e) => {
                  const value = parseInt(e.target.value)
                  setNumberOfSets(value)
                  updateURL({ sets: value.toString() })
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                {[1, 2, 3, 4, 5].map(num => (
                  <option key={num} value={num}>{num}{t('settings.sets')}</option>
                ))}
              </select>
            </div>

            {/* 제외 번호 */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('settings.excludeNumbers')}
                </label>
                {excludedNumbers.length > 0 && (
                  <button
                    onClick={clearExcludedNumbers}
                    className="text-sm text-purple-600 hover:text-purple-700"
                  >
                    {tCommon('clear')}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-9 gap-2">
                {Array.from({ length: 45 }, (_, i) => i + 1).map(number => (
                  <button
                    key={number}
                    onClick={() => toggleExcludeNumber(number)}
                    className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                      excludedNumbers.includes(number)
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {number}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">{t('settings.excludeDesc')}</p>
            </div>

            {/* 안전성 표시 */}
            <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Shield className="w-5 h-5 text-green-600" />
                <span className="text-green-800 dark:text-green-200 font-semibold text-sm">
                  암호화 수준 난수 생성
                </span>
              </div>
              <p className="text-xs text-green-700 dark:text-green-300 text-center">
                {typeof window !== 'undefined' && window.crypto ? 
                  'crypto.getRandomValues()를 사용한 안전한 난수 생성' : 
                  '기본 난수 생성기 사용 (서버 환경)'
                }
              </p>
            </div>

            {/* 생성 버튼 */}
            <button
              onClick={generateLottoNumbers}
              disabled={isGenerating}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-xl"
            >
              {isGenerating ? (
                <div className="flex items-center justify-center space-x-2">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>{t('generating')}</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <Sparkles className="w-5 h-5" />
                  <span>{t('generate')}</span>
                  <span className="text-xs bg-white/20 px-2 py-1 rounded-full ml-2">SECURE</span>
                </div>
              )}
            </button>
          </div>
        </div>

        {/* 결과 */}
        <div className="space-y-6">
          {generatedSets.length > 0 && (
            <>
              {generatedSets.map((set, index) => (
                <div key={index} className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 rounded-2xl shadow-lg p-8 border-2 border-purple-200 dark:border-purple-700">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                      <Star className="w-6 h-6 mr-2 text-purple-600" />
                      {numberOfSets > 1 ? `${index + 1}${t('gameNumber')}` : t('result.title')}
                    </h3>
                    {index === 0 && (
                      <span className="text-sm text-purple-600 bg-purple-100 dark:bg-purple-900/50 px-2 py-1 rounded">
                        {getMethodName(set.generateMethod)}
                      </span>
                    )}
                  </div>
                  
                  {/* 메인 번호 */}
                  <div className="flex flex-wrap justify-center gap-3 mb-4">
                    {set.numbers.map((number, numberIndex) => (
                      <div
                        key={numberIndex}
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold shadow-lg transform transition-all duration-300 ${getNumberColor(number)}`}
                        style={{
                          animationDelay: `${numberIndex * 0.1}s`,
                          animation: isGenerating ? 'none' : 'bounceIn 0.6s ease-out forwards'
                        }}
                      >
                        {number}
                      </div>
                    ))}
                  </div>

                  {/* 보너스 번호 */}
                  {set.bonusNumber && index === 0 && (
                    <div className="text-center mb-6">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">{t('result.bonusNumber')}</div>
                      <div className={`inline-flex w-10 h-10 rounded-full items-center justify-center text-lg font-bold border-2 border-dashed ${getNumberColor(set.bonusNumber)} border-current`}>
                        {set.bonusNumber}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* 공유/저장 버튼 */}
              <div className="flex space-x-3">
                <button
                  onClick={handleShare}
                  className="flex-1 inline-flex items-center justify-center space-x-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 transition-colors"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-5 h-5" />
                      <span>{tCommon('copied')}</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-5 h-5" />
                      <span>{t('result.share')}</span>
                    </>
                  )}
                </button>
                
                {showSaveButton && (
                  <button
                    onClick={handleSaveCalculation}
                    className="flex-1 inline-flex items-center justify-center space-x-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    <Save className="w-5 h-5" />
                    <span>{tCommon('save')}</span>
                  </button>
                )}
              </div>
            </>
          )}

          {generatedSets.length === 0 && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8 text-center">
              <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                {t('placeholder')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 이용 가이드 */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-8">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          🎯 {t('guide.title')}
        </h3>
        
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.methodsTitle')}
            </h4>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              <li>• {t('guide.methods.0')}</li>
              <li>• {t('guide.methods.1')}</li>
              <li>• {t('guide.methods.2')}</li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.tipsTitle')}
            </h4>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              <li>• {t('guide.tips.0')}</li>
              <li>• {t('guide.tips.1')}</li>
              <li>• {t('guide.tips.2')}</li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.remindersTitle')}
            </h4>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              <li>• {t('guide.reminders.0')}</li>
              <li>• {t('guide.reminders.1')}</li>
              <li>• {t('guide.reminders.2')}</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 통계 정보 */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
          <BarChart3 className="w-6 h-6 mr-2 text-green-600" />
          {t('stats.title')}
        </h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-2xl font-bold text-green-600 mb-2">1 : 8,145,060</div>
            <div className="text-sm text-green-700 dark:text-green-300">{t('stats.firstPrize')}</div>
          </div>
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 mb-2">1 : 1,357,510</div>
            <div className="text-sm text-blue-700 dark:text-blue-300">{t('stats.secondPrize')}</div>
          </div>
          <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="text-2xl font-bold text-purple-600 mb-2">1 : 35,724</div>
            <div className="text-sm text-purple-700 dark:text-purple-300">{t('stats.thirdPrize')}</div>
          </div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 text-center">
          {t('stats.disclaimer')}
        </p>
      </div>

      <style jsx>{`
        @keyframes bounceIn {
          0% {
            opacity: 0;
            transform: scale(0.3);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
          70% {
            transform: scale(0.9);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
      
      {/* Action buttons - shown when lottery numbers have been generated */}
      {(generatedNumbers.length > 0 || generatedSets.length > 0) && (
        <div className="mt-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <PDFExport
              data={generatedSets.length > 0 ? generatedSets : { numbers: generatedNumbers, bonusNumber, generateMethod, excludedNumbers }}
              calculatorType="lotto"
              title="로또번호 생성 결과"
              className="w-full sm:w-auto"
            />
            <FeedbackWidget 
              calculatorType="lotto"
              className="w-full sm:w-auto max-w-md"
            />
          </div>
        </div>
      )}
    </div>
  )
}