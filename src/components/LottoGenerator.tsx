'use client'

import { useState, useEffect } from 'react'
import { Sparkles, RefreshCw, Share2, Check, Save, Dice6, BarChart3, Star } from 'lucide-react'
import CalculationHistory from './CalculationHistory'
import { useCalculationHistory } from '@/hooks/useCalculationHistory'
import { useTranslations } from 'next-intl'

interface LottoResult {
  numbers: number[]
  bonusNumber?: number
  generateMethod: 'random' | 'statistics' | 'mixed'
  excludedNumbers: number[]
  timestamp: number
}

export default function LottoGenerator() {
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

  const { histories, saveCalculation, removeHistory, clearHistories, loadFromHistory } = useCalculationHistory('lotto')

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

  // 완전 랜덤 번호 생성
  const generateRandomNumbers = (exclude: number[] = []): number[] => {
    const availableNumbers = Array.from({ length: 45 }, (_, i) => i + 1)
      .filter(num => !exclude.includes(num))
    
    const selected: number[] = []
    while (selected.length < 6 && availableNumbers.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableNumbers.length)
      const number = availableNumbers.splice(randomIndex, 1)[0]
      selected.push(number)
    }
    
    return selected.sort((a, b) => a - b)
  }

  // 통계 기반 번호 생성
  const generateStatisticsNumbers = (exclude: number[] = []): number[] => {
    const availableNumbers = Array.from({ length: 45 }, (_, i) => i + 1)
      .filter(num => !exclude.includes(num))
    
    // 가중치 기반 선택
    const weightedNumbers: number[] = []
    availableNumbers.forEach(num => {
      const frequency = numberFrequency[num] || 300
      const weight = Math.max(1, Math.floor(frequency / 50))
      for (let i = 0; i < weight; i++) {
        weightedNumbers.push(num)
      }
    })
    
    const selected: number[] = []
    const usedNumbers = new Set<number>()
    
    while (selected.length < 6 && weightedNumbers.length > 0) {
      const randomIndex = Math.floor(Math.random() * weightedNumbers.length)
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
            bonus = remainingNumbers[Math.floor(Math.random() * remainingNumbers.length)]
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
    if (excludedNumbers.includes(number)) {
      setExcludedNumbers(excludedNumbers.filter(n => n !== number))
    } else {
      setExcludedNumbers([...excludedNumbers, number])
    }
  }

  // 제외 번호 초기화
  const clearExcludedNumbers = () => {
    setExcludedNumbers([])
  }

  const formatNumbers = (numbers: number[]) => {
    return numbers.join(', ')
  }

  const handleShare = async () => {
    if (generatedSets.length === 0) return
    
    const numbersText = generatedSets.map((set, index) => 
      `${index + 1}게임: ${formatNumbers(set.numbers)}${set.bonusNumber ? ` (+${set.bonusNumber})` : ''}`
    ).join('\n')
    
    const shareText = `로또 번호 추천\n\n${numbersText}\n\n생성방식: ${getMethodName(generateMethod)}\n\n🍀 행운을 빌어요! - 툴허브`
    
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText)
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
      }
    } catch (err) {
      console.error('Failed to copy text: ', err)
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
                    onChange={(e) => setGenerateMethod(e.target.value as any)}
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
                    onChange={(e) => setGenerateMethod(e.target.value as any)}
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
                    onChange={(e) => setGenerateMethod(e.target.value as any)}
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
                onChange={(e) => setNumberOfSets(parseInt(e.target.value))}
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

            {/* 생성 버튼 */}
            <button
              onClick={generateLottoNumbers}
              disabled={isGenerating}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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
    </div>
  )
}