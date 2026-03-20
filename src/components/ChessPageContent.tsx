'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { Monitor, Zap, ChevronRight, Gamepad2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const ChessAI = dynamic(() => import('@/components/games/ChessAI'), { ssr: false })

type Difficulty = 'easy' | 'normal' | 'hard'

export default function ChessPageContent() {
  const t = useTranslations('boardGamePage')
  const [mode, setMode] = useState<'select' | 'ai'>('select')
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')

  if (mode === 'ai') {
    return <ChessAI difficulty={difficulty} onBack={() => setMode('select')} />
  }

  const difficultyOptions: { value: Difficulty; emoji: string; label: string; desc: string; color: string; activeColor: string }[] = [
    { value: 'easy',   emoji: '😊', label: t('easy') || '쉬움',   desc: t('easyDesc') || 'AI가 느리게 반응',   color: 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400',   activeColor: 'border-green-500 bg-green-500 text-white' },
    { value: 'normal', emoji: '🎯', label: t('normal') || '보통', desc: t('normalDesc') || '기본 전략 사용',     color: 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400',   activeColor: 'border-amber-500 bg-amber-500 text-white' },
    { value: 'hard',   emoji: '🔥', label: t('hard') || '어려움', desc: t('hardDesc') || '최적의 수 계산',     color: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400',             activeColor: 'border-red-500 bg-red-500 text-white' },
  ]

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* Game header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-3">
          ♟️
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">체스 (Chess)</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">AI와 대전하는 클래식 체스 게임</p>
      </div>

      {/* Mode selection - AI only */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="font-bold text-gray-900 dark:text-white">{t('selectPlayMode') || '플레이 방식 선택'}</h2>
        </div>
        <div className="p-4 space-y-3">
          <div className="rounded-xl border-2 border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center gap-3 p-4">
              <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                <Monitor className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900 dark:text-white">{t('vsComputer') || '컴퓨터 대전'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('vsComputerDesc') || 'AI와 1인 플레이 · 인터넷 불필요'}</p>
              </div>
            </div>

            <div className="px-4 pb-3 space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <Zap className="w-3.5 h-3.5" />
                <span>{t('difficulty') || '난이도'}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {difficultyOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setDifficulty(opt.value)}
                    className={`py-2 px-2 rounded-xl border-2 text-center transition-all ${
                      difficulty === opt.value ? opt.activeColor : opt.color
                    }`}
                  >
                    <span className="block text-lg">{opt.emoji}</span>
                    <span className="text-xs font-bold">{opt.label}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setMode('ai')}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Monitor className="w-4 h-4" />
                {t('startAI') || 'AI와 대전 시작'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Game center link */}
      <div className="text-center">
        <Link
          href="/games"
          className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <Gamepad2 className="w-4 h-4" />
          {t('moreGames') || '게임 센터에서 더 많은 게임 보기'}
          <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
        </Link>
      </div>
    </div>
  )
}
