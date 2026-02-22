'use client'

import { useState, useCallback, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Share2, Link as LinkIcon, Check, X as XIcon } from 'lucide-react'
import { menuConfig, categoryKeys } from '@/config/menuConfig'

export default function ToolShareButton() {
  const pathname = usePathname()
  const t = useTranslations()
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  // Find current tool info
  const cleanPath = pathname.replace(/\/$/, '') || '/'

  let currentTool: { label: string; description: string } | null = null
  for (const catKey of categoryKeys) {
    const found = menuConfig[catKey].items.find((item) => item.href === cleanPath)
    if (found) {
      currentTool = {
        label: t(found.labelKey),
        description: t(found.descriptionKey),
      }
      break
    }
  }

  const shareUrl = `https://toolhub.ai.kr${cleanPath}`
  const shareTitle = currentTool ? `${currentTool.label} | 툴허브` : ''
  const shareText = currentTool?.description || ''

  const handleNativeShare = useCallback(async () => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl })
      } catch {
        // User cancelled
      }
    } else {
      setIsOpen(true)
    }
  }, [shareTitle, shareText, shareUrl])

  const handleCopyLink = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = shareUrl
        textarea.style.position = 'fixed'
        textarea.style.left = '-999999px'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
    }
  }, [shareUrl])

  const shareToX = useCallback(() => {
    const url = `https://x.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=400')
  }, [shareTitle, shareUrl])

  const shareToKakao = useCallback(() => {
    const kakaoUrl = `https://story.kakao.com/share?url=${encodeURIComponent(shareUrl)}`
    window.open(kakaoUrl, '_blank', 'noopener,noreferrer,width=600,height=400')
  }, [shareUrl])

  // Close on outside click or Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleClick = () => setIsOpen(false)
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false) }
    document.addEventListener('click', handleClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('click', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  // Don't render on home page or if tool not found
  if (!currentTool || cleanPath === '/') return null

  return (
    <div className="fixed bottom-20 right-4 z-40">
      {/* Share menu popup */}
      {isOpen && (
        <div
          className="absolute bottom-14 right-0 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-3 min-w-[180px] animate-in fade-in slide-in-from-bottom-2"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 px-2">
            {t('common.share')}
          </div>
          <button
            onClick={shareToX}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            X (Twitter)
          </button>
          <button
            onClick={shareToKakao}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3C6.477 3 2 6.463 2 10.691c0 2.726 1.807 5.119 4.533 6.48l-.926 3.388c-.082.3.27.547.523.37l3.95-2.62c.637.09 1.287.137 1.92.137 5.523 0 10-3.463 10-7.755C22 6.463 17.523 3 12 3z" />
            </svg>
            KakaoStory
          </button>
          <button
            onClick={handleCopyLink}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <LinkIcon className="w-4 h-4" />
            )}
            {copied ? t('common.copied') || '복사됨' : t('common.copyLink') || '링크 복사'}
          </button>
        </div>
      )}

      {/* FAB button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          if (typeof navigator.share === 'function') {
            handleNativeShare()
          } else {
            setIsOpen(!isOpen)
          }
        }}
        className="w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        aria-label={t('common.share')}
      >
        <Share2 className="w-5 h-5" />
      </button>
    </div>
  )
}
