'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Trophy, X } from 'lucide-react'

interface NameInputModalProps {
  isOpen: boolean
  onSubmit: (name: string) => void
  onClose: () => void
  score: number
  formatScore: (score: number) => string
  rank?: number | null
  defaultName?: string | null
}

export default function NameInputModal({
  isOpen, onSubmit, onClose, score, formatScore, rank, defaultName
}: NameInputModalProps) {
  const t = useTranslations('leaderboard')
  const [name, setName] = useState(defaultName ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setName(defaultName ?? '')
      setIsSubmitting(false)
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [isOpen, defaultName])

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  const handleSubmit = useCallback(async () => {
    const trimmed = name.trim()
    if (trimmed.length === 0 || isSubmitting) return
    setIsSubmitting(true)
    onSubmit(trimmed.slice(0, 20))
  }, [name, isSubmitting, onSubmit])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/50 mb-3">
            <Trophy className="w-8 h-8 text-yellow-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {t('qualifiedTitle')}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('qualifiedMessage')}
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-5 text-center">
          <div className="text-sm text-gray-500 dark:text-gray-400">{t('yourScore')}</div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
            {formatScore(score)}
          </div>
          {rank && (
            <div className="text-sm font-medium text-blue-600 dark:text-blue-400 mt-1">
              #{rank}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('enterName')}
          </label>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
            maxLength={20}
            placeholder={t('namePlaceholder')}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow text-center text-lg font-medium"
          />

          <button
            onClick={handleSubmit}
            disabled={!name.trim() || isSubmitting}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl px-4 py-3 font-bold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSubmitting ? t('submitting') : t('submit')}
          </button>

          <button
            onClick={onClose}
            className="w-full text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 py-2 transition-colors"
          >
            {t('skip')}
          </button>
        </div>
      </div>
    </div>
  )
}
