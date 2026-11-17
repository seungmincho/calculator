'use client'

import { useState, useEffect, useRef } from 'react'
import { Download, X, Smartphone } from 'lucide-react'
import { useDialog } from '@/hooks/useDialog'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/pwa'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const t = useTranslations('pwa')
  const common = useTranslations('common')
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') return

    let active = true
    let showTimer: ReturnType<typeof setTimeout> | undefined
    const installed = !!window.matchMedia && window.matchMedia('(display-mode: standalone)').matches
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window)
    queueMicrotask(() => {
      if (!active) return
      if (installed) setIsInstalled(true)
      setIsIOS(isIOSDevice)
    })
    if (installed) return () => { active = false }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
      
      // Don't show immediately, wait for user interaction or after some time
      clearTimeout(showTimer)
      showTimer = setTimeout(() => {
        let dismissed = false
        try { dismissed = !!window.localStorage.getItem('pwa-install-dismissed') } catch { /* An optional preference must not stop the prompt. */ }
        if (active && !isInstalled && !dismissed) {
          setShowInstallPrompt(true)
        }
      }, 10000) // Show after 10 seconds
    }

    // Listen for app installed
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setShowInstallPrompt(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      active = false
      clearTimeout(showTimer)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [isInstalled])

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // For iOS or when prompt is not available, show instructions
      if (isIOS) {
        alert(t('ios.alert'))
      }
      return
    }

    try {
      deferredPrompt.prompt()
      const choiceResult = await deferredPrompt.userChoice
      
      if (choiceResult.outcome === 'accepted') {
        setShowInstallPrompt(false)
      }
      
      setDeferredPrompt(null)
    } catch (error) {
      console.error('Install prompt failed:', error)
    }
  }

  const handleDismiss = () => {
    setShowInstallPrompt(false)
    try { window.localStorage.setItem('pwa-install-dismissed', 'true') } catch { /* Dismissal still works for this visit. */ }
  }

  const dialogRef = useRef<HTMLDivElement>(null)
  useDialog(!isInstalled && showInstallPrompt, handleDismiss, dialogRef)

  // Don't show if already installed or dismissed
  if (isInstalled || !showInstallPrompt) {
    return null
  }

  return (
    <>
      {/* Floating Install Button */}
      <div className="fixed bottom-20 md:bottom-4 right-4 z-40">
        <button
          id="install-button"
          onClick={handleInstallClick}
          className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-label={t('install.ariaLabel')}
        >
          <Download className="w-6 h-6" />
        </button>
      </div>

      {/* Install Prompt Modal */}
      <div className="fixed inset-0 bg-black/50 z-40 flex items-end sm:items-center justify-center p-4">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="install-prompt-title"
          className="bg-surface rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-md shadow-2xl"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center">
              <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full mr-3">
                <Smartphone className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 id="install-prompt-title" className="text-lg font-semibold text-fg">
                  {t('install.title') || '앱으로 설치하기'}
                </h3>
                <p className="text-sm text-sub">
                  {t('install.subtitle') || '더 빠르고 편리하게 이용하세요'}
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              aria-label={common('close')}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex items-center text-sm text-sub">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              {t('benefits.offline') || '오프라인에서도 사용 가능'}
            </div>
            <div className="flex items-center text-sm text-sub">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              {t('benefits.fast') || '빠른 로딩 속도'}
            </div>
            <div className="flex items-center text-sm text-sub">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              {t('benefits.homescreen') || '홈 화면에서 바로 실행'}
            </div>
            <div className="flex items-center text-sm text-sub">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              {t('benefits.storage') || '데이터 절약'}
            </div>
          </div>

          {isIOS ? (
            <div className="space-y-3 mb-6">
              <p className="text-sm text-sub font-medium">
                {t('ios.title')}
              </p>
              <div className="bg-soft p-3 rounded-lg text-sm space-y-1">
                <p>{t('ios.step1')}</p>
                <p>{t('ios.step2')}</p>
                <p>{t('ios.step3')}</p>
              </div>
            </div>
          ) : null}

          <div className="flex gap-3">
            <button
              onClick={handleDismiss}
              className="flex-1 px-4 py-2 text-sub border border-line-strong rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {t('install.later') || '나중에'}
            </button>
            <button
              onClick={handleInstallClick}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <Download className="w-4 h-4 mr-2" />
              {t('install.now') || '지금 설치'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
