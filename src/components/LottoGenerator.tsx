'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Sparkles, RefreshCw, Share2, Check, Save, BarChart3, Search, TrendingUp, Database, Activity, Filter, Shield, Zap, AlertCircle, CheckCircle, X, Trophy, Target } from 'lucide-react'
import CalculationHistory from './CalculationHistory'
import FeedbackWidget from './FeedbackWidget'
import PDFExport from './PDFExport'
import { useCalculationHistory } from '@/hooks/useCalculationHistory'
import { useTranslations } from 'next-intl'
import dynamic from 'next/dynamic'
const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false })
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
  // Stats tab removed - using collapsible details instead
  const [searchRound, setSearchRound] = useState('')
  const [searchResult, setSearchResult] = useState<WinningNumber | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [winningHistory, setWinningHistory] = useState<WinningNumber[]>([])
  const [numberStats, setNumberStats] = useState<NumberStatistics[]>([])

  // 당첨 확인 관련 상태
  const [checkNumbers, setCheckNumbers] = useState<string[]>(['', '', '', '', '', ''])
  const [checkResult, setCheckResult] = useState<{
    matchedNumbers: number[]
    matchedBonus: boolean
    prize: string
    prizeRank: number
  } | null>(null)
  const [isOcrProcessing, setIsOcrProcessing] = useState(false)
  const [ocrError, setOcrError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  // 당첨번호 조회 (로컬 데이터 우선, 없으면 API 호출)
  const searchWinningNumber = async (round: string) => {
    if (!round || isNaN(parseInt(round))) return

    setIsSearching(true)
    setSearchResult(null)

    try {
      const roundNo = parseInt(round)

      // 1. 먼저 로컬 데이터에서 찾기
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
        // 2. 로컬에 없으면 API로 직접 조회
        const { fetchLottoData } = await import('@/utils/lottoUpdater')
        const apiData = await fetchLottoData(roundNo)

        if (apiData) {
          const result: WinningNumber = {
            round: apiData.drwNo,
            drawDate: apiData.drwNoDate,
            numbers: [
              apiData.drwtNo1,
              apiData.drwtNo2,
              apiData.drwtNo3,
              apiData.drwtNo4,
              apiData.drwtNo5,
              apiData.drwtNo6
            ].sort((a, b) => a - b),
            bonusNumber: apiData.bnusNo
          }
          setSearchResult(result)
        } else {
          setSearchResult(null)
        }
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
      } catch {
        // ignore invalid excluded numbers param
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

  // 번호 색상 결정 - 실제 로또 공과 동일한 색상
  const getNumberColor = (number: number) => {
    if (number <= 10) return 'lotto-ball-yellow'
    if (number <= 20) return 'lotto-ball-blue'
    if (number <= 30) return 'lotto-ball-red'
    if (number <= 40) return 'lotto-ball-gray'
    return 'lotto-ball-green'
  }

  // 번호에 맞는 그라데이션 색상
  const getNumberGradient = (number: number) => {
    if (number <= 10) return 'from-yellow-400 via-yellow-500 to-amber-600'
    if (number <= 20) return 'from-blue-400 via-blue-500 to-blue-700'
    if (number <= 30) return 'from-red-400 via-red-500 to-red-700'
    if (number <= 40) return 'from-gray-500 via-gray-600 to-gray-800'
    return 'from-green-400 via-green-500 to-green-700'
  }

  // 당첨 확인 - 번호 입력 핸들러
  const handleCheckNumberChange = (index: number, value: string) => {
    const numValue = value.replace(/[^0-9]/g, '')
    if (numValue === '' || (parseInt(numValue) >= 1 && parseInt(numValue) <= 45)) {
      const newNumbers = [...checkNumbers]
      newNumbers[index] = numValue
      setCheckNumbers(newNumbers)
      setCheckResult(null)
    }
  }

  // 당첨 확인 - 번호 체크
  const checkWinningNumbers = () => {
    const userNumbers = checkNumbers
      .map(n => parseInt(n))
      .filter(n => !isNaN(n) && n >= 1 && n <= 45)

    if (userNumbers.length !== 6) {
      return
    }

    // 중복 체크
    if (new Set(userNumbers).size !== 6) {
      return
    }

    // 비교 대상 당첨번호 (검색 결과 또는 최신 회차)
    const targetWinning = searchResult || latestWinning
    if (!targetWinning) {
      return
    }

    const matchedNumbers = userNumbers.filter(n => targetWinning.numbers.includes(n))
    const matchedBonus = userNumbers.includes(targetWinning.bonusNumber)

    let prize = ''
    let prizeRank = 0

    if (matchedNumbers.length === 6) {
      prize = t('winChecker.prizes.first')
      prizeRank = 1
    } else if (matchedNumbers.length === 5 && matchedBonus) {
      prize = t('winChecker.prizes.second')
      prizeRank = 2
    } else if (matchedNumbers.length === 5) {
      prize = t('winChecker.prizes.third')
      prizeRank = 3
    } else if (matchedNumbers.length === 4) {
      prize = t('winChecker.prizes.fourth')
      prizeRank = 4
    } else if (matchedNumbers.length === 3) {
      prize = t('winChecker.prizes.fifth')
      prizeRank = 5
    } else {
      prize = t('winChecker.prizes.none')
      prizeRank = 0
    }

    setCheckResult({
      matchedNumbers,
      matchedBonus,
      prize,
      prizeRank
    })
  }

  // 당첨 확인 초기화
  const resetCheckNumbers = () => {
    setCheckNumbers(['', '', '', '', '', ''])
    setCheckResult(null)
    setOcrError(null)
  }

  // OCR 이미지 처리
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsOcrProcessing(true)
    setOcrError(null)
    setCheckResult(null)

    try {
      // Tesseract.js 동적 임포트
      const { createWorker } = await import('tesseract.js')

      const worker = await createWorker('kor+eng')

      const { data: { text } } = await worker.recognize(file)
      await worker.terminate()

      // 숫자 추출 (1-45 범위만)
      const numbers = text.match(/\b([1-9]|[1-3][0-9]|4[0-5])\b/g)

      if (numbers && numbers.length >= 6) {
        // 중복 제거하고 처음 6개 사용
        const uniqueNumbers = [...new Set(numbers.map(n => parseInt(n)))]
          .filter(n => n >= 1 && n <= 45)
          .slice(0, 6)
          .sort((a, b) => a - b)

        if (uniqueNumbers.length === 6) {
          setCheckNumbers(uniqueNumbers.map(n => n.toString()))
        } else {
          setOcrError(t('winChecker.ocr.notEnoughNumbers'))
        }
      } else {
        setOcrError(t('winChecker.ocr.noNumbersFound'))
      }
    } catch (error) {
      console.error('OCR 처리 오류:', error)
      setOcrError(t('winChecker.ocr.error'))
    } finally {
      setIsOcrProcessing(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* 간소화된 헤더 */}
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

      {/* 메인 생성 영역 - 버튼 바로 보이게 */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
        {/* 빠른 생성 버튼들 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <button
            onClick={generateLottoNumbers}
            disabled={isGenerating}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 px-4 rounded-xl font-bold hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex flex-col items-center gap-1"
          >
            {isGenerating ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Sparkles className="w-6 h-6" />
            )}
            <span className="text-sm">{isGenerating ? t('generating') : t('generate')}</span>
          </button>

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
            className="bg-gradient-to-r from-red-500 to-orange-500 text-white py-4 px-4 rounded-xl font-bold hover:from-red-600 hover:to-orange-600 transition-all transform hover:scale-[1.02] shadow-lg flex flex-col items-center gap-1"
          >
            <Zap className="w-6 h-6" />
            <span className="text-sm">{t('hotNumbers')}</span>
          </button>

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
            className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-4 px-4 rounded-xl font-bold hover:from-blue-600 hover:to-cyan-600 transition-all transform hover:scale-[1.02] shadow-lg flex flex-col items-center gap-1"
          >
            <Shield className="w-6 h-6" />
            <span className="text-sm">{t('coldNumbers')}</span>
          </button>

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
            className="bg-gradient-to-r from-green-500 to-emerald-500 text-white py-4 px-4 rounded-xl font-bold hover:from-green-600 hover:to-emerald-600 transition-all transform hover:scale-[1.02] shadow-lg flex flex-col items-center gap-1"
          >
            <BarChart3 className="w-6 h-6" />
            <span className="text-sm">{t('generateBalanced')}</span>
          </button>
        </div>

        {/* 결과 표시 영역 */}
        {generatedSets.length > 0 ? (
          <div className="space-y-4">
            {generatedSets.map((set, index) => (
              <div key={index} className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl p-6 border border-purple-200 dark:border-purple-700">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                    {numberOfSets > 1 ? `${index + 1}${t('gameNumber')}` : t('result.title')}
                  </span>
                  {index === 0 && (
                    <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      {getMethodName(set.generateMethod)}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap justify-center gap-3 mb-4">
                  {set.numbers.map((number, numberIndex) => (
                    <div
                      key={numberIndex}
                      className={`lotto-ball lotto-ball-animated w-12 h-12 text-lg ${getNumberColor(number)}`}
                      style={{ animationDelay: `${numberIndex * 0.1}s` }}
                    >
                      {number}
                    </div>
                  ))}
                  {set.bonusNumber && index === 0 && (
                    <>
                      <span className="flex items-center text-gray-400 text-xl">+</span>
                      <div className={`lotto-ball lotto-ball-animated w-12 h-12 text-lg ${getNumberColor(set.bonusNumber)} ring-2 ring-purple-300`}
                        style={{ animationDelay: '0.7s' }}
                      >
                        {set.bonusNumber}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}

            {/* 공유/저장 버튼 */}
            <div className="flex gap-2">
              <button
                onClick={handleShare}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 px-4 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 transition-colors"
              >
                {isCopied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                {isCopied ? tCommon('copied') : t('result.share')}
              </button>
              {showSaveButton && (
                <button
                  onClick={handleSaveCalculation}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 px-4 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {tCommon('save')}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-8 text-center">
            <Sparkles className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">{t('placeholder')}</p>
          </div>
        )}

        {/* 상세 설정 (접을 수 있게) */}
        <details className="mt-6">
          <summary className="cursor-pointer text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 flex items-center gap-2">
            <Filter className="w-4 h-4" />
            {t('settings.title')}
          </summary>
          <div className="mt-4 space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            {/* 생성 방식 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('settings.method')}
              </label>
              <div className="flex flex-wrap gap-2">
                {(['random', 'statistics', 'mixed'] as const).map((method) => (
                  <button
                    key={method}
                    onClick={() => {
                      setGenerateMethod(method)
                      updateURL({ method })
                    }}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      generateMethod === method
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {t(`methods.${method}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* 게임 수 */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('settings.numberOfSets')}
              </label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(num => (
                  <button
                    key={num}
                    onClick={() => {
                      setNumberOfSets(num)
                      updateURL({ sets: num.toString() })
                    }}
                    className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                      numberOfSets === num
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* 제외 번호 */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('settings.excludeNumbers')} {excludedNumbers.length > 0 && `(${excludedNumbers.length})`}
                </label>
                {excludedNumbers.length > 0 && (
                  <button
                    onClick={clearExcludedNumbers}
                    className="text-xs text-purple-600 hover:text-purple-700"
                  >
                    {tCommon('clear')}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-9 gap-1.5">
                {Array.from({ length: 45 }, (_, i) => i + 1).map(number => (
                  <button
                    key={number}
                    onClick={() => toggleExcludeNumber(number)}
                    className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                      excludedNumbers.includes(number)
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {number}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </details>
      </div>

      {/* 당첨 확인 섹션 */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          {t('winChecker.title')}
        </h2>

        {/* 비교 대상 당첨번호 - 상단에 표시 */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
              {searchResult ? (
                <>{searchResult.round}회차 ({searchResult.drawDate})</>
              ) : latestWinning ? (
                <>{latestWinning.round}회차 ({latestWinning.drawDate})</>
              ) : (
                <>{t('winChecker.noWinningData')}</>
              )}
            </span>
            <span className="text-xs text-gray-500">{t('winChecker.comparingWith')}</span>
          </div>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {(searchResult || latestWinning)?.numbers.map((number, index) => (
              <div
                key={index}
                className={`lotto-ball w-10 h-10 text-sm ${getNumberColor(number)}`}
              >
                {number}
              </div>
            ))}
            {(searchResult || latestWinning) && (
              <>
                <span className="text-gray-400 text-lg mx-1">+</span>
                <div className={`lotto-ball w-10 h-10 text-sm ${getNumberColor((searchResult || latestWinning)!.bonusNumber)} ring-2 ring-purple-300`}>
                  {(searchResult || latestWinning)!.bonusNumber}
                </div>
              </>
            )}
          </div>
        </div>

        {/* 내 번호 입력 + 확인 버튼 */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mb-4">
          <div className="flex gap-1.5 flex-wrap justify-center">
            {checkNumbers.map((num, index) => (
              <input
                key={index}
                type="text"
                inputMode="numeric"
                value={num}
                onChange={(e) => handleCheckNumberChange(index, e.target.value)}
                placeholder={String(index + 1)}
                className="w-11 h-11 text-center text-lg font-bold border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                maxLength={2}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={checkWinningNumbers}
              disabled={checkNumbers.filter(n => n !== '').length !== 6}
              className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-2.5 px-5 rounded-lg hover:from-yellow-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold transition-all whitespace-nowrap"
            >
              <Target className="w-4 h-4" />
              {t('winChecker.checkButton')}
            </button>
            <button
              onClick={resetCheckNumbers}
              className="p-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 확인 결과 */}
        {checkResult ? (
          <div className={`rounded-xl p-5 text-center ${
            checkResult.prizeRank === 1 ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white' :
            checkResult.prizeRank === 2 ? 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800' :
            checkResult.prizeRank === 3 ? 'bg-gradient-to-r from-orange-400 to-amber-600 text-white' :
            checkResult.prizeRank >= 4 ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white' :
            'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}>
            <div className="text-2xl font-bold mb-1">
              {checkResult.prizeRank > 0 ? `🎉 ${checkResult.prize}` : checkResult.prize}
            </div>
            <div className="text-sm opacity-90">
              {t('winChecker.matched')}: {checkResult.matchedNumbers.length}개
              {checkResult.matchedBonus && ` + ${t('winChecker.bonus')}`}
            </div>
            {checkResult.matchedNumbers.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mt-3">
                {checkResult.matchedNumbers.map((num, idx) => (
                  <div
                    key={idx}
                    className={`lotto-ball w-9 h-9 text-sm ${getNumberColor(num)} ring-2 ring-white/50`}
                  >
                    {num}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-3">
            {t('winChecker.enterNumbers')}
          </div>
        )}
      </div>

      {/* 당첨번호 조회 섹션 */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-green-600" />
          {t('winningNumbers')}
        </h2>

        <div className="grid md:grid-cols-2 gap-6">
          {/* 회차 검색 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('searchRound')}</h3>
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
                      className={`lotto-ball w-10 h-10 text-sm ${getNumberColor(number)}`}
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
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('latestDrawing')}</h3>
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
                      {dataStats.latestDraw}회차
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
                        className={`lotto-ball w-10 h-10 text-sm ${getNumberColor(number)}`}
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
      
      {/* 통계 정보 (간소화) */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
        <details>
          <summary className="cursor-pointer text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            {t('statisticsRecommendation')}
          </summary>
          <div className="mt-4 space-y-4">
            {/* 번호별 출현 빈도 차트 */}
            <ReactECharts option={{
              tooltip: { trigger: 'axis' },
              grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
              xAxis: { type: 'category', data: numberStats.slice(0, 20).map(d => d.number), axisLabel: { rotate: 45, fontSize: 10 } },
              yAxis: { type: 'value', axisLabel: { fontSize: 10 } },
              series: [{
                type: 'bar',
                data: numberStats.slice(0, 20).map((d, index) => ({
                  value: d.frequency,
                  itemStyle: { color: index < 6 ? '#EF4444' : '#3B82F6' }
                })),
                barWidth: '70%',
                itemStyle: { borderRadius: [4, 4, 0, 0] }
              }]
            }} style={{ height: '150px' }} />

            {/* 핫/콜드 번호 나란히 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-red-700 dark:text-red-300 mb-2 flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  {t('hotNumbers')} TOP 6
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {numberStats.slice(0, 6).map((stat) => (
                    <div key={stat.number} className={`lotto-ball w-8 h-8 text-xs ${getNumberColor(stat.number)}`}>
                      {stat.number}
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 rotate-180" />
                  {t('coldNumbers')} 6
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {numberStats.slice(-6).reverse().map((stat) => (
                    <div key={stat.number} className={`lotto-ball w-8 h-8 text-xs ${getNumberColor(stat.number)}`}>
                      {stat.number}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 통계 요약 */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {Math.max(...numberStats.map(s => s.frequency))}회
                </div>
                <div className="text-xs text-gray-500">최다 출현</div>
              </div>
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {Math.min(...numberStats.map(s => s.frequency))}회
                </div>
                <div className="text-xs text-gray-500">최소 출현</div>
              </div>
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {(numberStats.reduce((sum, s) => sum + s.frequency, 0) / 45).toFixed(0)}회
                </div>
                <div className="text-xs text-gray-500">평균 출현</div>
              </div>
            </div>
          </div>
        </details>
      </div>

      {/* 이용 가이드 (간소화) */}
      <details className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-6">
        <summary className="cursor-pointer text-lg font-bold text-gray-900 dark:text-white">
          🎯 {t('guide.title')}
        </summary>
        <div className="mt-4 grid md:grid-cols-3 gap-4 text-sm">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
              {t('guide.methodsTitle')}
            </h4>
            <ul className="space-y-1 text-gray-600 dark:text-gray-400">
              <li>• {t('guide.methods.0')}</li>
              <li>• {t('guide.methods.1')}</li>
              <li>• {t('guide.methods.2')}</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
              {t('guide.tipsTitle')}
            </h4>
            <ul className="space-y-1 text-gray-600 dark:text-gray-400">
              <li>• {t('guide.tips.0')}</li>
              <li>• {t('guide.tips.1')}</li>
              <li>• {t('guide.tips.2')}</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
              {t('guide.remindersTitle')}
            </h4>
            <ul className="space-y-1 text-gray-600 dark:text-gray-400">
              <li>• {t('guide.reminders.0')}</li>
              <li>• {t('guide.reminders.1')}</li>
              <li>• {t('guide.reminders.2')}</li>
            </ul>
          </div>
        </div>
      </details>

      {/* 당첨 확률 (간소화) */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('stats.title')}</span>
          <div className="flex gap-4 text-xs">
            <span className="text-green-600">1등 1:8,145,060</span>
            <span className="text-blue-600">2등 1:1,357,510</span>
            <span className="text-purple-600">3등 1:35,724</span>
          </div>
        </div>
      </div>

{/* Animation styles moved to globals.css */}
      
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