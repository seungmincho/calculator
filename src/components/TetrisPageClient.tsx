'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Gamepad2, Users } from 'lucide-react'
import Tetris from './Tetris'
import TetrisMultiplayer from './TetrisMultiplayer'

type Mode = 'solo' | 'multi'

export default function TetrisPageClient() {
  const t = useTranslations('tetris')
  const [mode, setMode] = useState<Mode>('solo')
  const [joinPeerId, setJoinPeerId] = useState<string | null>(null)

  // URL ?join=PEER_ID 파라미터 감지 → 자동 멀티모드 진입
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const joinId = params.get('join')
    if (joinId) {
      setJoinPeerId(joinId)
      setMode('multi')
      // URL에서 join 파라미터 제거 (뒤로가기 시 재접속 방지)
      const url = new URL(window.location.href)
      url.searchParams.delete('join')
      window.history.replaceState({}, '', url.toString())
    }
  }, [])

  const handleModeChange = (newMode: Mode) => {
    setJoinPeerId(null)
    setMode(newMode)
  }

  return (
    <div className="space-y-6">
      {/* Mode selector */}
      <div className="flex justify-center">
        <div className="inline-flex bg-white dark:bg-gray-800 rounded-xl shadow-lg p-1 gap-1">
          <button
            onClick={() => handleModeChange('solo')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all text-sm ${
              mode === 'solo'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
            {t('multi.soloMode')}
          </button>
          <button
            onClick={() => handleModeChange('multi')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all text-sm ${
              mode === 'multi'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Users className="w-4 h-4" />
            {t('multi.multiMode')}
          </button>
        </div>
      </div>

      {/* Content */}
      {mode === 'solo' ? <Tetris /> : <TetrisMultiplayer joinPeerId={joinPeerId} />}
    </div>
  )
}
