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

type TabType = 'ladder' | 'roulette' | 'order' | 'coin' | 'dice' | 'team' | 'lottery' | 'yesno'

const TABS: { id: TabType; label: string; icon: string }[] = [
  { id: 'ladder', label: '사다리 타기', icon: '🪜' },
  { id: 'roulette', label: '돌림판', icon: '🎯' },
  { id: 'order', label: '순서뽑기', icon: '🔢' },
  { id: 'coin', label: '동전 던지기', icon: '🪙' },
  { id: 'dice', label: '주사위', icon: '🎲' },
  { id: 'team', label: '팀 나누기', icon: '👥' },
  { id: 'lottery', label: '제비뽑기', icon: '🎫' },
  { id: 'yesno', label: 'Yes or No', icon: '⚖️' },
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
    <div>
      {/* 탭 바 - 모바일 스크롤 가능 */}
      <div className="flex justify-center mb-6">
        <div className="w-full overflow-x-auto scrollbar-hide">
          <div className="inline-flex bg-white dark:bg-gray-800 rounded-xl shadow-lg p-1.5 gap-1 min-w-max mx-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
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
    </div>
  )
}
