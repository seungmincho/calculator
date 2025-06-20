'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { GitBranch, Play, RefreshCw, Share2, Check, Save, Users, Target } from 'lucide-react'
import CalculationHistory from './CalculationHistory'
import { useCalculationHistory } from '@/hooks/useCalculationHistory'
import { useTranslations } from 'next-intl'

interface LadderResult {
  participants: string[]
  outcomes: string[]
  results: { [key: string]: string }
  timestamp: number
}

interface LadderLine {
  fromIndex: number
  toIndex: number
  position: number
}

interface ParticipantInfo {
  name: string
  animal: string
}

interface AnimationState {
  participantIndex: number
  currentLevel: number
  currentPosition: number
  isMoving: boolean
}

export default function LadderGame() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('ladder')
  const tCommon = useTranslations('common')
  
  // 동물 아이콘 목록
  const animalIcons = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦄']
  
  const [participants, setParticipants] = useState<ParticipantInfo[]>([
    { name: '참가자1', animal: '🐶' },
    { name: '참가자2', animal: '🐱' },
    { name: '참가자3', animal: '🐭' }
  ])
  const [outcomes, setOutcomes] = useState<string[]>(['결과1', '결과2', '결과3'])
  const [ladderLines, setLadderLines] = useState<LadderLine[]>([])
  const [ladderComplexity, setLadderComplexity] = useState<number>(3) // 1: 단순, 2: 보통, 3: 복잡, 4: 매우복잡
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentAnimations, setCurrentAnimations] = useState<AnimationState[]>([])
  const [currentParticipantIndex, setCurrentParticipantIndex] = useState<number>(-1)
  const [results, setResults] = useState<{ [key: string]: string }>({})
  const [showResults, setShowResults] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [showSaveButton, setShowSaveButton] = useState(false)
  const [animationSpeed, setAnimationSpeed] = useState<number>(1500)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number | undefined>(undefined)
  const { histories, saveCalculation, removeHistory, clearHistories, loadFromHistory } = useCalculationHistory('ladder')

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

  // 참가자 추가
  const addParticipant = () => {
    if (participants.length < 8) {
      const availableAnimals = animalIcons.filter(
        animal => !participants.some(p => p.animal === animal)
      )
      const randomAnimal = availableAnimals.length > 0 
        ? availableAnimals[Math.floor(Math.random() * availableAnimals.length)]
        : animalIcons[participants.length % animalIcons.length]
      
      const newParticipant = { 
        name: `참가자${participants.length + 1}`, 
        animal: randomAnimal 
      }
      const newParticipants = [...participants, newParticipant]
      const newOutcomes = [...outcomes, `결과${outcomes.length + 1}`]
      setParticipants(newParticipants)
      setOutcomes(newOutcomes)
      updateURL({
        participants: JSON.stringify(newParticipants.map(p => ({ name: p.name, animal: p.animal }))),
        outcomes: JSON.stringify(newOutcomes)
      })
    }
  }

  // 참가자 제거
  const removeParticipant = (index: number) => {
    if (participants.length > 2) {
      const newParticipants = participants.filter((_, i) => i !== index)
      const newOutcomes = outcomes.filter((_, i) => i !== index)
      setParticipants(newParticipants)
      setOutcomes(newOutcomes)
      updateURL({
        participants: JSON.stringify(newParticipants.map(p => ({ name: p.name, animal: p.animal }))),
        outcomes: JSON.stringify(newOutcomes)
      })
    }
  }

  // 참가자 이름 변경
  const updateParticipant = (index: number, value: string) => {
    const updated = [...participants]
    updated[index] = { ...updated[index], name: value }
    setParticipants(updated)
    updateURL({
      participants: JSON.stringify(updated.map(p => ({ name: p.name, animal: p.animal })))
    })
  }

  // 참가자 동물 변경
  const updateParticipantAnimal = (index: number, animal: string) => {
    const updated = [...participants]
    updated[index] = { ...updated[index], animal }
    setParticipants(updated)
    updateURL({
      participants: JSON.stringify(updated.map(p => ({ name: p.name, animal: p.animal })))
    })
  }

  // 결과 변경
  const updateOutcome = (index: number, value: string) => {
    const updated = [...outcomes]
    updated[index] = value
    setOutcomes(updated)
    updateURL({
      outcomes: JSON.stringify(updated)
    })
  }

  // 사다리 생성
  const generateLadder = () => {
    const lines: LadderLine[] = []
    const ladderHeight = Math.max(8, 6 + ladderComplexity * 2) // 복잡도에 따른 높이
    const participantCount = participants.length
    
    // 복잡도에 따른 연결 확률
    const complexityFactors = {
      1: 0.25, // 단순: 25% 확률
      2: 0.4,  // 보통: 40% 확률  
      3: 0.6,  // 복잡: 60% 확률
      4: 0.8   // 매우복잡: 80% 확률
    }
    
    const connectionProbability = complexityFactors[ladderComplexity as keyof typeof complexityFactors] || 0.5
    
    for (let level = 0; level < ladderHeight; level++) {
      const usedPositions = new Set<number>()
      
      for (let i = 0; i < participantCount - 1; i++) {
        if (!usedPositions.has(i) && !usedPositions.has(i + 1)) {
          const shouldConnect = Math.random() < connectionProbability
          
          if (shouldConnect) {
            lines.push({
              fromIndex: i,
              toIndex: i + 1,
              position: level
            })
            usedPositions.add(i)
            usedPositions.add(i + 1)
          }
        }
      }
    }
    
    setLadderLines(lines)
    setShowResults(false)
    setResults({})
    setCurrentAnimations([])
    setCurrentParticipantIndex(-1)
  }

  // 한 참가자의 경로 계산
  const calculateParticipantPath = (participantIndex: number): number[] => {
    const path = [participantIndex]
    let currentPosition = participantIndex
    const maxLevel = Math.max(...ladderLines.map(line => line.position), 0)
    
    for (let level = 0; level <= maxLevel; level++) {
      const levelLines = ladderLines.filter(line => line.position === level)
      
      for (const line of levelLines) {
        if (line.fromIndex === currentPosition) {
          currentPosition = line.toIndex
          break
        } else if (line.toIndex === currentPosition) {
          currentPosition = line.fromIndex
          break
        }
      }
      path.push(currentPosition)
    }
    
    return path
  }

  // 사다리 타기 실행 (한 명씩 부드러운 애니메이션)
  const playLadder = (startFromParticipant = 0) => {
    if (isPlaying) return
    
    setIsPlaying(true)
    setShowResults(false)
    setCurrentAnimations([])
    setCurrentParticipantIndex(startFromParticipant)
    
    // 모든 참가자의 경로 미리 계산
    const allPaths: number[][] = []
    participants.forEach((_, index) => {
      allPaths.push(calculateParticipantPath(index))
    })
    
    // 순차적으로 각 참가자 애니메이션
    const animateParticipant = (participantIndex: number) => {
      if (participantIndex >= participants.length) {
        // 모든 애니메이션 완료
        const finalResults: { [key: string]: string } = {}
        participants.forEach((participant, index) => {
          const finalPosition = allPaths[index][allPaths[index].length - 1]
          finalResults[participant.name] = outcomes[finalPosition]
        })
        
        setResults(finalResults)
        setShowResults(true)
        setIsPlaying(false)
        setShowSaveButton(true)
        setCurrentParticipantIndex(-1)
        return
      }
      
      setCurrentParticipantIndex(participantIndex)
      const participantPath = allPaths[participantIndex]
      let currentStep = 0
      
      // 부드러운 애니메이션을 위한 함수
      const animateStep = () => {
        if (currentStep < participantPath.length) {
          // 현재 위치와 다음 위치 계산
          const currentPos = participantPath[currentStep]
          const nextPos = currentStep < participantPath.length - 1 ? participantPath[currentStep + 1] : currentPos
          
          // 부드러운 이동을 위한 중간 단계들 생성
          const steps = 20 // 각 레벨당 20단계로 부드럽게
          let subStep = 0
          
          const smoothMove = () => {
            if (subStep <= steps) {
              const progress = subStep / steps
              const interpolatedPosition = currentPos + (nextPos - currentPos) * progress
              
              setCurrentAnimations([{
                participantIndex,
                currentLevel: currentStep + progress,
                currentPosition: interpolatedPosition,
                isMoving: true
              }])
              
              subStep++
              // requestAnimationFrame 사용으로 더 부드러운 애니메이션
              const delay = (animationSpeed / participantPath.length) / steps
              setTimeout(smoothMove, Math.max(16, delay)) // 최소 60fps 보장
            } else {
              currentStep++
              setTimeout(animateStep, 100) // 레벨 간 짧은 휴식
            }
          }
          
          smoothMove()
        } else {
          // 이 참가자 애니메이션 완료, 다음 참가자로
          setCurrentAnimations([])
          setTimeout(() => animateParticipant(participantIndex + 1), 500)
        }
      }
      
      setTimeout(animateStep, 300)
    }
    
    setTimeout(() => animateParticipant(startFromParticipant), 500)
  }

  // 결과만 바로 보기
  const showResultsOnly = () => {
    if (isPlaying) return
    
    // 모든 참가자의 경로 계산
    const finalResults: { [key: string]: string } = {}
    participants.forEach((participant, index) => {
      const finalPosition = calculateParticipantPath(index)
      const lastPosition = finalPosition[finalPosition.length - 1]
      finalResults[participant.name] = outcomes[lastPosition]
    })
    
    setResults(finalResults)
    setShowResults(true)
    setShowSaveButton(true)
  }

  // 사다리 그리기 (실시간 애니메이션)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const renderFrame = () => {
      const width = canvas.width
      const height = canvas.height
      const participantCount = participants.length
      const columnWidth = width / (participantCount + 1)
      const maxLevel = Math.max(...ladderLines.map(line => line.position), 9)
      const levelHeight = (height - 100) / (maxLevel + 3) // 여유 공간 확보
      
      // 캔버스 클리어
      ctx.clearRect(0, 0, width, height)
      
      // 세로선 그리기 (사다리 기둥)
      ctx.strokeStyle = '#6B7280'
      ctx.lineWidth = 3
      
      for (let i = 0; i < participantCount; i++) {
        const x = columnWidth * (i + 1)
        ctx.beginPath()
        ctx.moveTo(x, levelHeight * 1.5)
        ctx.lineTo(x, height - levelHeight * 1.5)
        ctx.stroke()
      }
      
      // 가로선 그리기 (사다리 연결선)
      ctx.strokeStyle = '#3B82F6'
      ctx.lineWidth = 3
      
      ladderLines.forEach((line: LadderLine) => {
        const y = levelHeight * (line.position + 2.5)
        const x1 = columnWidth * (line.fromIndex + 1)
        const x2 = columnWidth * (line.toIndex + 1)
        
        ctx.beginPath()
        ctx.moveTo(x1, y)
        ctx.lineTo(x2, y)
        ctx.stroke()
        
        // 연결점에 작은 원 그리기
        ctx.beginPath()
        ctx.arc(x1, y, 3, 0, 2 * Math.PI)
        ctx.fillStyle = '#3B82F6'
        ctx.fill()
        
        ctx.beginPath()
        ctx.arc(x2, y, 3, 0, 2 * Math.PI)
        ctx.fill()
      })
      
      // 현재 애니메이션 중인 참가자 표시 (부드러운 렌더링)
      if (isPlaying && currentAnimations.length > 0) {
        currentAnimations.forEach((animation: AnimationState) => {
        const participant = participants[animation.participantIndex]
        const x = columnWidth * (animation.currentPosition + 1)
        const y = levelHeight * (animation.currentLevel + 1.5)
        
        // 부드러운 그림자 효과
        ctx.save()
        ctx.shadowColor = 'rgba(59, 130, 246, 0.5)'
        ctx.shadowBlur = 15
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 2
        
        // 강조 효과 (빛나는 원 - 애니메이션에 따라 크기 변화)
        const pulseScale = 1 + Math.sin(Date.now() * 0.01) * 0.1
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 25 * pulseScale)
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.4)')
        gradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.2)')
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0)')
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(x, y, 25 * pulseScale, 0, 2 * Math.PI)
        ctx.fill()
        
        ctx.restore()
        
        // 동물 아이콘 그리기 (약간의 바운스 효과)
        const bounceOffset = Math.sin(Date.now() * 0.015) * 2
        ctx.font = '26px serif'
        ctx.textAlign = 'center'
        ctx.fillStyle = '#000000'
        ctx.fillText(participant.animal, x, y + 8 + bounceOffset)
        
        // 현재 참가자 이름 표시 (부드러운 페이드 효과)
        if (animation.participantIndex === currentParticipantIndex) {
          const alpha = 0.8 + Math.sin(Date.now() * 0.01) * 0.2
          ctx.font = 'bold 14px Arial'
          ctx.fillStyle = `rgba(31, 41, 55, ${alpha})`
          ctx.textAlign = 'center'
          
          // 텍스트 배경
          const textWidth = ctx.measureText(participant.name).width
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.9})`
          ctx.fillRect(x - textWidth/2 - 8, y - 35, textWidth + 16, 20)
          ctx.strokeStyle = `rgba(59, 130, 246, ${alpha})`
          ctx.lineWidth = 1
          ctx.strokeRect(x - textWidth/2 - 8, y - 35, textWidth + 16, 20)
          
          ctx.fillStyle = `rgba(31, 41, 55, ${alpha})`
          ctx.fillText(participant.name, x, y - 22)
        }
        
        // 이동 궤적 표시
        if (animation.currentLevel > 0) {
          ctx.strokeStyle = 'rgba(34, 197, 94, 0.6)'
          ctx.lineWidth = 3
          ctx.setLineDash([5, 5])
          
          const prevLevel = Math.floor(animation.currentLevel)
          const prevX = columnWidth * (calculateParticipantPath(animation.participantIndex)[prevLevel] + 1)
          const prevY = levelHeight * (prevLevel + 1.5)
          
          ctx.beginPath()
          ctx.moveTo(prevX, prevY)
          ctx.lineTo(x, y)
          ctx.stroke()
          ctx.setLineDash([])
        }
        })
      }
    
    // 완료된 참가자들의 경로 표시 (희미하게)
    if (isPlaying && currentParticipantIndex > 0) {
      for (let i = 0; i < currentParticipantIndex; i++) {
        const path = calculateParticipantPath(i)
        const participant = participants[i]
        
        // 경로 선 그리기
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.3)'
        ctx.lineWidth = 2
        ctx.setLineDash([5, 5])
        
        ctx.beginPath()
        for (let j = 0; j < path.length - 1; j++) {
          const x1 = columnWidth * (path[j] + 1)
          const y1 = levelHeight * (j + 1.5)
          const x2 = columnWidth * (path[j + 1] + 1)
          const y2 = levelHeight * (j + 2.5)
          
          if (j === 0) {
            ctx.moveTo(x1, y1)
          }
          ctx.lineTo(x2, y2)
        }
        ctx.stroke()
        ctx.setLineDash([])
        
        // 최종 위치에 동물 아이콘 (작게)
        const finalPosition = path[path.length - 1]
        const finalX = columnWidth * (finalPosition + 1)
        const finalY = height - levelHeight * 1.2
        
        ctx.font = '16px serif'
        ctx.textAlign = 'center'
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
        ctx.fillText(participant.animal, finalX, finalY + 5)
      }
    }
      
    // 애니메이션이 진행 중일 때만 지속적으로 리렌더링
      if (isPlaying && currentAnimations.length > 0) {
        animationFrameRef.current = requestAnimationFrame(renderFrame)
      }
    }
    
    renderFrame()
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [participants, ladderLines, currentAnimations, isPlaying, currentParticipantIndex, ladderComplexity])

  // URL에서 초기값 로드
  useEffect(() => {
    const participantsParam = searchParams.get('participants')
    const outcomesParam = searchParams.get('outcomes')
    const complexityParam = searchParams.get('complexity')
    const speedParam = searchParams.get('speed')

    if (participantsParam) {
      try {
        const parsedParticipants = JSON.parse(participantsParam)
        if (Array.isArray(parsedParticipants)) {
          setParticipants(parsedParticipants)
        }
      } catch (err) {
        console.warn('Failed to parse participants from URL:', err)
      }
    }

    if (outcomesParam) {
      try {
        const parsedOutcomes = JSON.parse(outcomesParam)
        if (Array.isArray(parsedOutcomes)) {
          setOutcomes(parsedOutcomes)
        }
      } catch (err) {
        console.warn('Failed to parse outcomes from URL:', err)
      }
    }

    if (complexityParam) {
      const complexity = parseInt(complexityParam)
      if ([1, 2, 3, 4].includes(complexity)) {
        setLadderComplexity(complexity)
      }
    }

    if (speedParam) {
      const speed = parseInt(speedParam)
      if ([3000, 1500, 800].includes(speed)) {
        setAnimationSpeed(speed)
      }
    }
  }, [searchParams])

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

  const handleSaveCalculation = () => {
    if (Object.keys(results).length === 0) return
    
    saveCalculation(
      {
        participants: [...participants],
        outcomes: [...outcomes],
        ladderComplexity,
        ladderLinesCount: ladderLines.length,
        playedAt: new Date().toISOString()
      },
      {
        results: { ...results },
        participantCount: participants.length
      }
    )
    
    setShowSaveButton(false)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* 헤더 */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-600 to-blue-600 rounded-full text-white mb-4">
          <GitBranch className="w-8 h-8" />
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
          onLoadHistory={(historyId: string) => {
            const inputs = loadFromHistory(historyId)
            if (inputs) {
              setParticipants(inputs.participants || [
                { name: '참가자1', animal: '🐶' },
                { name: '참가자2', animal: '🐱' },
                { name: '참가자3', animal: '🐭' }
              ])
              setOutcomes(inputs.outcomes || ['결과1', '결과2', '결과3'])
              setLadderComplexity(inputs.ladderComplexity || 3)
              generateLadder()
            }
          }}
          onRemoveHistory={removeHistory}
          onClearHistories={clearHistories}
          formatResult={(history: any) => {
            if (!history.inputs || !history.result) return '빈 기록'
            const participantCount = history.result.participantCount || 0
            const resultsCount = Object.keys(history.result.results || {}).length
            return `참가자 ${participantCount}명, 결과 ${resultsCount}개`
          }}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* 설정 패널 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
            <Users className="w-6 h-6 mr-2 text-green-600" />
            {t('settings.title')}
          </h2>

          <div className="space-y-6">
            {/* 참가자 설정 */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('settings.participants')} ({participants.length}명)
                </label>
                <button
                  onClick={addParticipant}
                  disabled={participants.length >= 8}
                  className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('settings.addParticipant')}
                </button>
              </div>
              <div className="space-y-2">
                {participants.map((participant, index) => (
                  <div key={index} className="flex space-x-2">
                    <select
                      value={participant.animal}
                      onChange={(e) => updateParticipantAnimal(index, e.target.value)}
                      className="w-16 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-center"
                    >
                      {animalIcons.map(animal => (
                        <option key={animal} value={animal}>{animal}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={participant.name}
                      onChange={(e) => updateParticipant(index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder={`참가자 ${index + 1}`}
                    />
                    {participants.length > 2 && (
                      <button
                        onClick={() => removeParticipant(index)}
                        className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        {tCommon('delete')}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 결과 설정 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {t('settings.outcomes')}
              </label>
              <div className="space-y-2">
                {outcomes.map((outcome, index) => (
                  <input
                    key={index}
                    type="text"
                    value={outcome}
                    onChange={(e) => updateOutcome(index, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder={`결과 ${index + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* 사다리 복잡도 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('settings.complexity')}
              </label>
              <select
                value={ladderComplexity}
                onChange={(e) => {
                  const value = parseInt(e.target.value)
                  setLadderComplexity(value)
                  updateURL({ complexity: value.toString() })
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value={1}>{t('settings.complexities.simple')} (25%)</option>
                <option value={2}>{t('settings.complexities.normal')} (40%)</option>
                <option value={3}>{t('settings.complexities.complex')} (60%)</option>
                <option value={4}>{t('settings.complexities.veryComplex')} (80%)</option>
              </select>
            </div>

            {/* 애니메이션 속도 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('settings.speed')}
              </label>
              <select
                value={animationSpeed}
                onChange={(e) => {
                  const value = parseInt(e.target.value)
                  setAnimationSpeed(value)
                  updateURL({ speed: value.toString() })
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value={3000}>{t('settings.speeds.slow')}</option>
                <option value={1500}>{t('settings.speeds.normal')}</option>
                <option value={800}>{t('settings.speeds.fast')}</option>
              </select>
            </div>

            {/* 버튼들 */}
            <div className="space-y-3">
              <button
                onClick={generateLadder}
                disabled={isPlaying}
                className="w-full bg-gradient-to-r from-green-600 to-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-green-700 hover:to-blue-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <div className="flex items-center justify-center space-x-2">
                  <RefreshCw className="w-5 h-5" />
                  <span>{t('generateLadder')}</span>
                </div>
              </button>

              {ladderLines.length > 0 && (
                <button
                  onClick={() => playLadder()}
                  disabled={isPlaying}
                  className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-orange-700 hover:to-red-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isPlaying ? (
                    <div className="flex items-center justify-center space-x-2">
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>{t('playing')}</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <Play className="w-5 h-5" />
                      <span>{t('startGame')}</span>
                    </div>
                  )}
                </button>
              )}

              {ladderLines.length > 0 && (
                <button
                  onClick={showResultsOnly}
                  disabled={isPlaying}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <Target className="w-5 h-5" />
                    <span>결과만 보기</span>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 사다리 및 결과 */}
        <div className="space-y-6">
          {/* 사다리 그래픽 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
              <GitBranch className="w-6 h-6 mr-2 text-green-600" />
              {t('ladder.title')}
            </h3>
            
            {/* 참가자 이름과 동물 아이콘 */}
            <div className="flex justify-around mb-4">
              {participants.map((participant, index) => (
                <div key={index} className="text-center">
                  <button
                    onClick={() => ladderLines.length > 0 && playLadder(index)}
                    disabled={isPlaying || ladderLines.length === 0}
                    className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-2 rounded-lg text-sm font-medium flex flex-col items-center space-y-1 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={ladderLines.length > 0 ? `${participant.name}부터 시작` : '먼저 사다리를 생성하세요'}
                  >
                    <span className="text-lg">{participant.animal}</span>
                    <span>{participant.name}</span>
                  </button>
                </div>
              ))}
            </div>

            {/* 사다리 캔버스 */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-4">
              <canvas
                ref={canvasRef}
                width={Math.max(400, participants.length * 80)}
                height={300}
                className="w-full h-auto max-w-full"
                style={{ maxHeight: '300px' }}
              />
            </div>

            {/* 결과 이름 */}
            <div className="flex justify-around">
              {outcomes.map((outcome, index) => (
                <div key={index} className="text-center">
                  <div className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-3 py-2 rounded-lg text-sm font-medium">
                    {outcome}
                  </div>
                </div>
              ))}
            </div>

            {ladderLines.length === 0 && (
              <div className="text-center py-8">
                <GitBranch className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  {t('ladder.placeholder')}
                </p>
              </div>
            )}
          </div>

          {/* 결과 */}
          {showResults && Object.keys(results).length > 0 && (
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/30 dark:to-orange-900/30 rounded-2xl shadow-lg p-8 border-2 border-yellow-200 dark:border-yellow-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                <Target className="w-6 h-6 mr-2 text-orange-600" />
                {t('result.title')}
              </h3>
              
              <div className="space-y-3 mb-6">
                {Object.entries(results).map(([participant, outcome]: [string, string]) => (
                  <div key={participant} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg shadow">
                    <span className="font-medium text-gray-900 dark:text-white">{participant}</span>
                    <span className="text-lg">→</span>
                    <span className="font-bold text-orange-600 bg-orange-100 dark:bg-orange-900/50 px-3 py-1 rounded">
                      {outcome}
                    </span>
                  </div>
                ))}
              </div>

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
              {t('guide.usageTitle')}
            </h4>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              <li>• {t('guide.usage.0')}</li>
              <li>• {t('guide.usage.1')}</li>
              <li>• {t('guide.usage.2')}</li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.examplesTitle')}
            </h4>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              <li>• {t('guide.examples.0')}</li>
              <li>• {t('guide.examples.1')}</li>
              <li>• {t('guide.examples.2')}</li>
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
        </div>
      </div>
    </div>
  )
}