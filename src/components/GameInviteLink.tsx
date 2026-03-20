'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Copy, Check, Share2, Link } from 'lucide-react'

interface GameInviteLinkProps {
  peerId: string | null
  gameSlug?: string
  gameTitle?: string
}

export default function GameInviteLink({ peerId, gameSlug, gameTitle }: GameInviteLinkProps) {
  const t = useTranslations('gameInvite')
  const [linkCopied, setLinkCopied] = useState(false)

  const getShareUrl = () => {
    if (!peerId) return ''
    const url = new URL(window.location.origin + window.location.pathname)
    if (gameSlug) url.searchParams.set('game', gameSlug)
    url.searchParams.set('join', peerId)
    return url.toString()
  }

  const handleCopyLink = async () => {
    const url = getShareUrl()
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
    } catch { /* ignore */ }
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const handleShare = async () => {
    const url = getShareUrl()
    if (!url) return
    if (navigator.share) {
      try {
        await navigator.share({
          title: gameTitle || t('defaultTitle'),
          text: t('shareText'),
          url,
        })
      } catch { /* cancelled */ }
    } else {
      handleCopyLink()
    }
  }

  return (
    <div className="bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 mb-4">
      <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 mb-2 flex items-center gap-1.5">
        <Link className="w-4 h-4" />
        {t('inviteLink')}
      </p>
      <div className="flex items-center gap-2">
        <p className="flex-1 font-mono text-xs sm:text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 break-all select-all border border-gray-200 dark:border-gray-700">
          {peerId ? getShareUrl() : 'Loading...'}
        </p>
        <button
          onClick={handleCopyLink}
          className="flex-shrink-0 p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all"
          disabled={!peerId}
          title={t('copyLink')}
        >
          {linkCopied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
        </button>
        <button
          onClick={handleShare}
          className="flex-shrink-0 p-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-all"
          disabled={!peerId}
          title={t('shareButton')}
        >
          <Share2 className="w-5 h-5" />
        </button>
      </div>
      {linkCopied && (
        <p className="text-xs text-green-600 dark:text-green-400 mt-2">{t('linkCopied')}</p>
      )}
    </div>
  )
}
