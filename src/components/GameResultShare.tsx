'use client'

import { useState, useCallback } from 'react'
import { Share2, Copy, Check, X } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface GameResultShareProps {
  gameName: string
  result: 'win' | 'loss' | 'draw'
  difficulty: string
  moves?: number
  score?: string
  url?: string
}

export default function GameResultShare({
  gameName,
  result,
  difficulty,
  moves,
  score,
  url,
}: GameResultShareProps) {
  const t = useTranslations('gameResultShare')
  const [showShare, setShowShare] = useState(false)
  const [copied, setCopied] = useState(false)

  const getEmoji = () => {
    if (result === 'win') return '🏆'
    if (result === 'draw') return '🤝'
    return '😤'
  }

  const getResultText = () => {
    if (result === 'win') return 'WIN'
    if (result === 'draw') return 'DRAW'
    return 'LOSE'
  }

  const shareText = [
    `${getEmoji()} ${gameName} - ${getResultText()}!`,
    `${t('difficultyLabel')}: ${difficulty}`,
    moves ? `${t('movesLabel')}: ${moves}` : null,
    score ? `${t('scoreLabel')}: ${score}` : null,
    '',
    `${url || 'https://toolhub.ai.kr/games'} ${t('challenge')}`,
    t('hashtags'),
  ].filter(Boolean).join('\n')

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
      const textarea = document.createElement('textarea')
      textarea.value = shareText
      textarea.style.position = 'fixed'
      textarea.style.left = '-999999px'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [shareText])

  const handleNativeShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${gameName} - ${getResultText()}`,
          text: shareText,
          url: url || 'https://toolhub.ai.kr/games',
        })
      } catch {
        // user cancelled or error
      }
    } else {
      setShowShare(true)
    }
  }, [gameName, shareText, url])

  const handleTwitterShare = useCallback(() => {
    const tweetText = encodeURIComponent(shareText)
    window.open(`https://twitter.com/intent/tweet?text=${tweetText}`, '_blank')
  }, [shareText])

  return (
    <>
      <button
        onClick={handleNativeShare}
        className="flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-medium rounded-xl transition-all"
      >
        <Share2 className="w-5 h-5" />
        {t('share')}
      </button>

      {/* 공유 모달 */}
      {showShare && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onKeyDown={(e) => e.key === 'Escape' && setShowShare(false)}
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('shareTitle')}</h3>
              <button
                onClick={() => setShowShare(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 미리보기 */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line font-mono">
              {shareText}
            </div>

            {/* 공유 버튼들 */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleCopy}
                className="flex items-center justify-center gap-2 py-2.5 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl transition-all text-sm font-medium"
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                {copied ? t('copied') : t('copy')}
              </button>
              <button
                onClick={handleTwitterShare}
                className="flex items-center justify-center gap-2 py-2.5 px-4 bg-black hover:bg-gray-800 text-white rounded-xl transition-all text-sm font-medium"
              >
                {t('xPost')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
