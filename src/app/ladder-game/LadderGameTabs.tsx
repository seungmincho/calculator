'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'

const LadderGame = dynamic(() => import('@/components/LadderGame'), { ssr: false })
const DecisionTools = dynamic(() => import('@/components/DecisionTools'), { ssr: false })

type TabType = 'ladder' | 'roulette' | 'order'

const TABS: { id: TabType; label: string; icon: string }[] = [
  { id: 'ladder', label: '사다리 타기', icon: '🪜' },
  { id: 'roulette', label: '돌림판', icon: '🎯' },
  { id: 'order', label: '순서뽑기', icon: '🔢' },
]

export default function LadderGameTabs() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const t = searchParams.get('tool')
    if (t === 'roulette' || t === 'order') return t
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
      {/* 탭 바 */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex bg-white dark:bg-gray-800 rounded-xl shadow-lg p-1.5 gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <span>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === 'ladder' && <LadderGame />}
      {activeTab === 'roulette' && <DecisionTools initialTab="roulette" />}
      {activeTab === 'order' && <DecisionTools initialTab="order" />}
    </div>
  )
}
