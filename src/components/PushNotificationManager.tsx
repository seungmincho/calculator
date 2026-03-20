'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, BellOff, X } from 'lucide-react'
import { useTranslations } from 'next-intl'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return new Uint8Array([...rawData].map(c => c.charCodeAt(0)))
}

export default function PushNotificationManager() {
  const t = useTranslations()
  const [isSupported, setIsSupported] = useState(false)
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isInAppBrowser, setIsInAppBrowser] = useState(false)
  const [showBanner, setShowBanner] = useState(false)
  const [permissionState, setPermissionState] = useState<string>('default')

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

  useEffect(() => {
    if (typeof window === 'undefined') return

    const ua = navigator.userAgent
    const ios = /iPad|iPhone|iPod/.test(ua)
    const standalone = window.matchMedia('(display-mode: standalone)').matches
    const kakao = /KAKAOTALK/i.test(ua)
    const naver = /NAVER/i.test(ua)

    setIsIOS(ios)
    setIsStandalone(standalone)
    setIsInAppBrowser(kakao || naver)

    if ('serviceWorker' in navigator && 'PushManager' in window && vapidPublicKey) {
      setIsSupported(true)
      navigator.serviceWorker.ready.then(reg => {
        reg.pushManager.getSubscription().then(sub => {
          setSubscription(sub)
        })
      })

      if ('Notification' in window) {
        setPermissionState(Notification.permission)
      }
    }

    // Show banner after 30 seconds if not subscribed and not dismissed
    const dismissed = localStorage.getItem('pushBannerDismissed')
    if (!dismissed) {
      const timer = setTimeout(() => {
        if (!subscription && 'PushManager' in window && vapidPublicKey) {
          setShowBanner(true)
        }
      }, 30000)
      return () => clearTimeout(timer)
    }
  }, [subscription, vapidPublicKey])

  const subscribe = useCallback(async () => {
    if (!vapidPublicKey) return

    try {
      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      })
      setSubscription(sub)
      setShowBanner(false)

      // Send subscription to backend
      const pushWorkerUrl = process.env.NEXT_PUBLIC_PUSH_WORKER_URL
      if (pushWorkerUrl) {
        await fetch(`${pushWorkerUrl}/subscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sub.toJSON()),
        }).catch(() => {})
      }
    } catch (err) {
      console.error('Push subscription failed:', err)
    }
  }, [vapidPublicKey])

  const unsubscribe = useCallback(async () => {
    if (!subscription) return

    try {
      await subscription.unsubscribe()

      const pushWorkerUrl = process.env.NEXT_PUBLIC_PUSH_WORKER_URL
      if (pushWorkerUrl) {
        await fetch(`${pushWorkerUrl}/unsubscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        }).catch(() => {})
      }

      setSubscription(null)
    } catch (err) {
      console.error('Push unsubscription failed:', err)
    }
  }, [subscription])

  const dismissBanner = useCallback(() => {
    setShowBanner(false)
    localStorage.setItem('pushBannerDismissed', Date.now().toString())
  }, [])

  // Don't render if VAPID key not configured or not supported
  if (!vapidPublicKey || !isSupported) return null

  // iOS not standalone
  if (isIOS && !isStandalone) return null

  // In-app browser (Kakao/Naver)
  if (isInAppBrowser) return null

  // Permission denied
  if (permissionState === 'denied') return null

  // Floating banner for push opt-in
  if (showBanner && !subscription) {
    return (
      <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-50 animate-in slide-in-from-bottom-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {t('pushNotification.title', { defaultValue: '새 도구 알림 받기' })}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('pushNotification.description', { defaultValue: '새로운 도구가 추가되면 알림으로 알려드려요' })}
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={subscribe}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-1.5 font-medium transition-colors"
                >
                  {t('pushNotification.allow', { defaultValue: '알림 허용' })}
                </button>
                <button
                  onClick={dismissBanner}
                  className="text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-3 py-1.5 transition-colors"
                >
                  {t('pushNotification.later', { defaultValue: '나중에' })}
                </button>
              </div>
            </div>
            <button
              onClick={dismissBanner}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
