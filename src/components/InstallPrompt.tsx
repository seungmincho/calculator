'use client'

import { useState, useEffect } from 'react'
import { Download, X, Smartphone } from 'lucide-react'
import { useTranslations } from 'next-intl'

export default function InstallPrompt() {
  const t = useTranslations()
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') return

    // Check if already installed
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window)
    setIsIOS(isIOSDevice)

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event)
      
      // Don't show immediately, wait for user interaction or after some time
      setTimeout(() => {
        if (!isInstalled && typeof localStorage !== 'undefined' && !localStorage.getItem('pwa-install-dismissed')) {
          setShowInstallPrompt(true)
        }
      }, 10000) // Show after 10 seconds
    }

    // Listen for app installed
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setShowInstallPrompt(false)
      setDeferredPrompt(null)
      console.log('PWA was successfully installed')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [isInstalled])

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // For iOS or when prompt is not available, show instructions
      if (isIOS) {
        alert('iOS 설치 방법:\n1. Safari 공유 버튼 탭\n2. "홈 화면에 추가" 선택\n3. "추가" 버튼 탭')
      }
      return
    }

    try {
      deferredPrompt.prompt()
      const choiceResult = await deferredPrompt.userChoice
      
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt')
        setShowInstallPrompt(false)
      }
      
      setDeferredPrompt(null)
    } catch (error) {
      console.error('Install prompt failed:', error)
    }
  }

  const handleDismiss = () => {
    setShowInstallPrompt(false)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('pwa-install-dismissed', 'true')
    }
  }

  // Don't show if already installed or dismissed
  if (isInstalled || !showInstallPrompt) {
    return null
  }

  return (
    <>
      {/* Floating Install Button */}
      <div className="fixed bottom-4 right-4 z-50">
        <button
          id="install-button"
          onClick={handleInstallClick}
          className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-label="앱 설치"
        >
          <Download className="w-6 h-6" />
        </button>
      </div>

      {/* Install Prompt Modal */}
      <div className="fixed inset-0 bg-black/50 z-40 flex items-end sm:items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-md shadow-2xl">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center">
              <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full mr-3">
                <Smartphone className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('pwa.install.title') || '앱으로 설치하기'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('pwa.install.subtitle') || '더 빠르고 편리하게 이용하세요'}
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              {t('pwa.benefits.offline') || '오프라인에서도 사용 가능'}
            </div>
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              {t('pwa.benefits.fast') || '빠른 로딩 속도'}
            </div>
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              {t('pwa.benefits.homescreen') || '홈 화면에서 바로 실행'}
            </div>
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              {t('pwa.benefits.storage') || '데이터 절약'}
            </div>
          </div>

          {isIOS ? (
            <div className="space-y-3 mb-6">
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                iOS 설치 방법:
              </p>
              <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg text-sm space-y-1">
                <p>1. Safari 하단의 공유 버튼(□↗) 탭</p>
                <p>2. "홈 화면에 추가" 선택</p>
                <p>3. 우상단 "추가" 버튼 탭</p>
              </div>
            </div>
          ) : null}

          <div className="flex gap-3">
            <button
              onClick={handleDismiss}
              className="flex-1 px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {t('pwa.install.later') || '나중에'}
            </button>
            <button
              onClick={handleInstallClick}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <Download className="w-4 h-4 mr-2" />
              {t('pwa.install.now') || '지금 설치'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}