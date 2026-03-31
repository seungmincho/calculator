'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'

const LadderGame = dynamic(() => import('@/components/LadderGame'), { ssr: false })
const DecisionTools = dynamic(() => import('@/components/DecisionTools'), { ssr: false })
const CoinFlip = dynamic(() => import('@/components/CoinFlip'), { ssr: false })
const DiceRoller = dynamic(() => import('@/components/DiceRoller'), { ssr: false })
const TeamDivider = dynamic(() => import('@/components/TeamDivider'), { ssr: false })
const LotteryDraw = dynamic(() => import('@/components/LotteryDraw'), { ssr: false })
const YesNoDecider = dynamic(() => import('@/components/YesNoDecider'), { ssr: false })
const RockPaperScissors = dynamic(() => import('@/components/RockPaperScissors'), { ssr: false })
const RandomNumberPicker = dynamic(() => import('@/components/RandomNumberPicker'), { ssr: false })
const PenaltyRoulette = dynamic(() => import('@/components/PenaltyRoulette'), { ssr: false })
const GameTimer = dynamic(() => import('@/components/GameTimer'), { ssr: false })

type TabType = 'ladder' | 'roulette' | 'order' | 'coin' | 'dice' | 'team' | 'lottery' | 'yesno' | 'rps' | 'number' | 'penalty' | 'timer'

const TABS: { id: TabType; label: string; icon: string }[] = [
  { id: 'ladder', label: '사다리 타기', icon: '🪜' },
  { id: 'roulette', label: '돌림판', icon: '🎯' },
  { id: 'order', label: '순서뽑기', icon: '🔢' },
  { id: 'coin', label: '동전 던지기', icon: '🪙' },
  { id: 'dice', label: '주사위', icon: '🎲' },
  { id: 'team', label: '팀 나누기', icon: '👥' },
  { id: 'lottery', label: '제비뽑기', icon: '🎫' },
  { id: 'yesno', label: 'Yes or No', icon: '⚖️' },
  { id: 'rps', label: '가위바위보', icon: '✊' },
  { id: 'number', label: '숫자 뽑기', icon: '🔢' },
  { id: 'penalty', label: '벌칙 룰렛', icon: '🍺' },
  { id: 'timer', label: '타이머', icon: '⏱️' },
]

const VALID_TABS = new Set<string>(TABS.map(t => t.id))

export default function LadderGameTabs() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const t = searchParams.get('tool')
    if (t && VALID_TABS.has(t)) return t as TabType
    return 'ladder'
  })

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    const url = new URL(window.location.href)
    if (tab === 'ladder') {
      url.searchParams.delete('tool')
    } else {
      url.searchParams.set('tool', tab)
    }
    window.history.replaceState({}, '', url)
  }

  return (
    <div className="relative">
      {/* 글로벌 배경 그라데이션 */}
      <div className="absolute inset-0 -top-8 -mx-4 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-pink-500/10 dark:from-indigo-900/20 dark:via-purple-900/10 dark:to-pink-900/20 rounded-3xl pointer-events-none" />

      <div className="relative z-10">
      {/* 탭 바 — Liquid Glass */}
      <div className="flex justify-center mb-6">
        <div className="w-full overflow-x-auto scrollbar-hide">
          <div
            className="inline-flex rounded-2xl p-1.5 gap-1 min-w-max mx-auto bg-white/30 dark:bg-gray-800/40 backdrop-blur-xl border border-white/30 dark:border-white/10"
            style={{ boxShadow: 'inset 2px 2px 10px rgba(255,255,255,0.15), inset -2px -2px 10px rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.08)' }}
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-white/40 dark:bg-white/15 backdrop-blur-xl text-indigo-700 dark:text-indigo-300 border border-white/40 dark:border-white/20'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-white/20 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
                style={activeTab === tab.id ? { boxShadow: '0 0 15px rgba(99,102,241,0.2), inset 1px 1px 5px rgba(255,255,255,0.2)' } : undefined}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === 'ladder' && <LadderGame />}
      {activeTab === 'roulette' && <DecisionTools initialTab="roulette" />}
      {activeTab === 'order' && <DecisionTools initialTab="order" />}
      {activeTab === 'coin' && <CoinFlip />}
      {activeTab === 'dice' && <DiceRoller />}
      {activeTab === 'team' && <TeamDivider />}
      {activeTab === 'lottery' && <LotteryDraw />}
      {activeTab === 'yesno' && <YesNoDecider />}
      {activeTab === 'rps' && <RockPaperScissors />}
      {activeTab === 'number' && <RandomNumberPicker />}
      {activeTab === 'penalty' && <PenaltyRoulette />}
      {activeTab === 'timer' && <GameTimer />}
      </div>
    </div>
  )
}
