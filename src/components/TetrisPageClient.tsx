'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Gamepad2, Users } from 'lucide-react'
import Tetris from './Tetris'
import TetrisMultiplayer from './TetrisMultiplayer'

type Mode = 'solo' | 'multi'

export default function TetrisPageClient() {
  const t = useTranslations('tetris')
  const [mode, setMode] = useState<Mode>('solo')

  return (
    <div className="space-y-6">
      {/* Mode selector */}
      <div className="flex justify-center">
        <div className="inline-flex bg-white dark:bg-gray-800 rounded-xl shadow-lg p-1 gap-1">
          <button
            onClick={() => setMode('solo')}
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
            onClick={() => setMode('multi')}
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
      {mode === 'solo' ? <Tetris /> : <TetrisMultiplayer />}
    </div>
  )
}
