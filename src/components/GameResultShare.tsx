'use client'

import { useState, useCallback, useEffect, useId, useRef } from 'react'
import { Share2, Copy, Check, X } from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/gameResultShare'

interface GameResultShareProps {
  gameName: string
  result: 'win' | 'loss' | 'draw'
  difficulty: string
  moves?: number
  score?: string
  url?: string
}

const EMOJI = { win: '🏆', draw: '🤝', loss: '😤' } as const

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
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const openerRef = useRef<HTMLButtonElement>(null)

  const resultText = t(result)
  const shareUrl = url || 'https://toolhub.ai.kr/games'
  const shareText = [
    `${EMOJI[result]} ${gameName} - ${resultText}!`,
    `${t('difficultyLabel')}: ${difficulty}`,
    moves ? `${t('movesLabel')}: ${moves}` : null,
    score ? `${t('scoreLabel')}: ${score}` : null,
    '',
    `${shareUrl} ${t('challenge')}`,
    t('hashtags'),
  ].filter(v => v !== null).join('\n')

  // 모달: 열리면 첫 버튼에 포커스, Tab/Shift+Tab은 안에서 순환, ESC로 닫기, 닫히면 공유 버튼으로 포커스 복귀
  useEffect(() => {
    if (!showShare) return
    const dialog = dialogRef.current
    const opener = openerRef.current
    dialog?.querySelector<HTMLElement>('button')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setShowShare(false); return }
      if (e.key !== 'Tab' || !dialog) return
      const items = dialog.querySelectorAll<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])')
      if (!items.length) return
      const first = items[0], last = items[items.length - 1]
      const active = document.activeElement
      if (!dialog.contains(active) || (e.shiftKey && active === first) || (!e.shiftKey && active === last)) {
        e.preventDefault()
        if (e.shiftKey) last.focus()
        else first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      opener?.focus()
    }
  }, [showShare])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareText)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = shareText
      textarea.style.position = 'fixed'
      textarea.style.left = '-999999px'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [shareText])

  const handleNativeShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `${gameName} - ${resultText}`, text: shareText, url: shareUrl })
      } catch {
        // user cancelled or error
      }
    } else {
      setShowShare(true)
    }
  }, [gameName, resultText, shareText, shareUrl])

  const handleTwitterShare = useCallback(() => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, '_blank', 'noopener')
  }, [shareText])

  return (
    <>
      <button
        ref={openerRef}
        type="button"
        onClick={handleNativeShare}
        aria-haspopup="dialog"
        className="ui-btn min-h-12 py-3 px-6"
      >
        <Share2 className="w-5 h-5" aria-hidden />
        {t('share')}
      </button>

      {showShare && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => e.target === e.currentTarget && setShowShare(false)}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="ui-card shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 id={titleId} className="text-lg font-bold text-fg">{t('shareTitle')}</h3>
              <button
                type="button"
                onClick={() => setShowShare(false)}
                aria-label={t('close')}
                className="p-2 -mr-2 text-faint hover:text-sub hover:bg-soft rounded-lg"
              >
                <X className="w-5 h-5" aria-hidden />
              </button>
            </div>

            {/* 미리보기 */}
            <div className="bg-subtle rounded-xl p-4 text-sm text-body whitespace-pre-line font-mono">
              {shareText}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center justify-center gap-2 min-h-11 py-2.5 px-4 bg-soft hover:bg-subtle text-body rounded-xl transition-colors text-sm font-medium"
              >
                {copied ? <Check className="w-4 h-4 text-primary" aria-hidden /> : <Copy className="w-4 h-4" aria-hidden />}
                <span aria-live="polite">{copied ? t('copied') : t('copy')}</span>
              </button>
              <button
                type="button"
                onClick={handleTwitterShare}
                className="flex items-center justify-center gap-2 min-h-11 py-2.5 px-4 bg-black hover:bg-gray-800 text-white rounded-xl transition-colors text-sm font-medium"
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
