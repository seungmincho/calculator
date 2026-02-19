'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Monitor, Globe, Smartphone, Copy, Check, RefreshCw, BookOpen } from 'lucide-react'

interface ScreenData {
  screenWidth: number
  screenHeight: number
  viewportWidth: number
  viewportHeight: number
  availWidth: number
  availHeight: number
  colorDepth: number
  pixelRatio: number
  orientation: string
  touchscreen: boolean
}

interface BrowserData {
  userAgent: string
  language: string
  languages: string
  cookieEnabled: boolean
  onLine: boolean
  doNotTrack: string | null
}

interface DeviceData {
  platform: string
  cpuCores: number
  memory: number | undefined
  networkType: string | undefined
  maxTouchPoints: number
  deviceType: string
}

export default function ScreenInfo() {
  const t = useTranslations('screenInfo')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [screenData, setScreenData] = useState<ScreenData | null>(null)
  const [browserData, setBrowserData] = useState<BrowserData | null>(null)
  const [deviceData, setDeviceData] = useState<DeviceData | null>(null)

  const detectDeviceInfo = useCallback(() => {
    if (typeof window === 'undefined') return

    // Screen data
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const orientation = viewportWidth > viewportHeight ? 'landscape' : 'portrait'

    setScreenData({
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      viewportWidth,
      viewportHeight,
      availWidth: window.screen.availWidth,
      availHeight: window.screen.availHeight,
      colorDepth: window.screen.colorDepth,
      pixelRatio: window.devicePixelRatio,
      orientation,
      touchscreen: 'ontouchstart' in window,
    })

    // Browser data
    setBrowserData({
      userAgent: navigator.userAgent,
      language: navigator.language,
      languages: navigator.languages.join(', '),
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      doNotTrack: navigator.doNotTrack,
    })

    // Device data
    const maxTouchPoints = navigator.maxTouchPoints
    let deviceType = 'desktop'
    if (maxTouchPoints > 0) {
      if (viewportWidth < 768) {
        deviceType = 'mobile'
      } else if (viewportWidth < 1024) {
        deviceType = 'tablet'
      }
    }

    setDeviceData({
      platform: navigator.platform,
      cpuCores: navigator.hardwareConcurrency,
      memory: (navigator as any).deviceMemory,
      networkType: (navigator as any).connection?.effectiveType,
      maxTouchPoints,
      deviceType,
    })
  }, [])

  useEffect(() => {
    detectDeviceInfo()

    const handleResize = () => {
      if (typeof window === 'undefined') return

      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const orientation = viewportWidth > viewportHeight ? 'landscape' : 'portrait'

      setScreenData(prev => prev ? {
        ...prev,
        viewportWidth,
        viewportHeight,
        orientation,
      } : null)

      // Update device type on resize
      setDeviceData(prev => {
        if (!prev) return null

        let deviceType = 'desktop'
        if (prev.maxTouchPoints > 0) {
          if (viewportWidth < 768) {
            deviceType = 'mobile'
          } else if (viewportWidth < 1024) {
            deviceType = 'tablet'
          }
        }

        return { ...prev, deviceType }
      })
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [detectDeviceInfo])

  const copyToClipboard = useCallback(async (text: string, id: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.left = '-999999px'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }, [])

  const copyAllInfo = useCallback(() => {
    if (!screenData || !browserData || !deviceData) return

    const allInfo = `
=== Screen Information ===
Resolution: ${screenData.screenWidth} x ${screenData.screenHeight}
Viewport: ${screenData.viewportWidth} x ${screenData.viewportHeight}
Available: ${screenData.availWidth} x ${screenData.availHeight}
Color Depth: ${screenData.colorDepth}-bit
Pixel Ratio: ${screenData.pixelRatio}
Orientation: ${screenData.orientation}
Touchscreen: ${screenData.touchscreen ? 'Yes' : 'No'}

=== Browser Information ===
User Agent: ${browserData.userAgent}
Language: ${browserData.language}
Languages: ${browserData.languages}
Cookies: ${browserData.cookieEnabled ? 'Enabled' : 'Disabled'}
Online: ${browserData.onLine ? 'Yes' : 'No'}
Do Not Track: ${browserData.doNotTrack || 'Not set'}

=== Device Information ===
Platform: ${deviceData.platform}
CPU Cores: ${deviceData.cpuCores}
Memory: ${deviceData.memory ? `${deviceData.memory} GB` : 'Unknown'}
Network: ${deviceData.networkType || 'Unknown'}
Max Touch Points: ${deviceData.maxTouchPoints}
Device Type: ${deviceData.deviceType}
`.trim()

    copyToClipboard(allInfo, 'all')
  }, [screenData, browserData, deviceData, copyToClipboard])

  const InfoRow = ({ label, value, id }: { label: string; value: string; id: string }) => (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[200px]" title={value}>
          {value}
        </span>
        <button
          onClick={() => copyToClipboard(value, id)}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          aria-label={`Copy ${label}`}
        >
          {copiedId === id ? (
            <Check className="w-4 h-4 text-green-600" />
          ) : (
            <Copy className="w-4 h-4 text-gray-400" />
          )}
        </button>
      </div>
    </div>
  )

  if (!screenData || !browserData || !deviceData) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={copyAllInfo}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-2 font-medium hover:from-blue-700 hover:to-indigo-700 transition-all"
        >
          {copiedId === 'all' ? (
            <>
              <Check className="w-4 h-4" />
              {t('common.copied')}
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              {t('common.copyAll')}
            </>
          )}
        </button>
        <button
          onClick={detectDeviceInfo}
          className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2 font-medium transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          {t('common.refresh')}
        </button>
      </div>

      {/* Info Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Screen Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-950 rounded-lg">
              <Monitor className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('screen.title')}
            </h2>
          </div>
          <div className="space-y-0">
            <InfoRow
              label={t('screen.resolution')}
              value={`${screenData.screenWidth} x ${screenData.screenHeight}`}
              id="screen-resolution"
            />
            <InfoRow
              label={t('screen.viewport')}
              value={`${screenData.viewportWidth} x ${screenData.viewportHeight}`}
              id="screen-viewport"
            />
            <InfoRow
              label={t('screen.availableSize')}
              value={`${screenData.availWidth} x ${screenData.availHeight}`}
              id="screen-available"
            />
            <InfoRow
              label={t('screen.colorDepth')}
              value={`${screenData.colorDepth}-bit`}
              id="screen-colordepth"
            />
            <InfoRow
              label={t('screen.pixelRatio')}
              value={screenData.pixelRatio.toString()}
              id="screen-pixelratio"
            />
            <InfoRow
              label={t('screen.orientation')}
              value={screenData.orientation}
              id="screen-orientation"
            />
            <InfoRow
              label={t('screen.touchscreen')}
              value={screenData.touchscreen ? t('common.yes') : t('common.no')}
              id="screen-touchscreen"
            />
          </div>
        </div>

        {/* Browser Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 dark:bg-green-950 rounded-lg">
              <Globe className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('browser.title')}
            </h2>
          </div>
          <div className="space-y-0">
            <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {t('browser.userAgent')}
              </span>
              <div className="flex items-center gap-2">
                <span
                  className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[200px]"
                  title={browserData.userAgent}
                >
                  {browserData.userAgent.substring(0, 20)}...
                </span>
                <button
                  onClick={() => copyToClipboard(browserData.userAgent, 'browser-ua')}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  aria-label={`Copy ${t('browser.userAgent')}`}
                >
                  {copiedId === 'browser-ua' ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
            <InfoRow
              label={t('browser.language')}
              value={browserData.language}
              id="browser-language"
            />
            <InfoRow
              label={t('browser.languages')}
              value={browserData.languages}
              id="browser-languages"
            />
            <InfoRow
              label={t('browser.cookiesEnabled')}
              value={browserData.cookieEnabled ? '사용' : '사용 안 함'}
              id="browser-cookies"
            />
            <InfoRow
              label={t('browser.online')}
              value={browserData.onLine ? t('common.yes') : t('common.no')}
              id="browser-online"
            />
            <InfoRow
              label={t('browser.doNotTrack')}
              value={browserData.doNotTrack || '설정 안 함'}
              id="browser-dnt"
            />
          </div>
        </div>

        {/* Device Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-950 rounded-lg">
              <Smartphone className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('device.title')}
            </h2>
          </div>
          <div className="space-y-0">
            <InfoRow
              label={t('device.platform')}
              value={deviceData.platform}
              id="device-platform"
            />
            <InfoRow
              label={t('device.cores')}
              value={deviceData.cpuCores.toString()}
              id="device-cpu"
            />
            <InfoRow
              label={t('device.memory')}
              value={deviceData.memory ? `${deviceData.memory} GB` : t('common.unknown')}
              id="device-memory"
            />
            <InfoRow
              label={t('device.connection')}
              value={deviceData.networkType || t('common.unknown')}
              id="device-network"
            />
            <InfoRow
              label={t('device.maxTouchPoints')}
              value={deviceData.maxTouchPoints.toString()}
              id="device-touch"
            />
            <InfoRow
              label={t('device.deviceType')}
              value={deviceData.deviceType}
              id="device-type"
            />
          </div>
        </div>
      </div>

      {/* Guide */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          {t('guide.title')}
        </h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
              {t('guide.features.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.features.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
                  <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
              {t('guide.usage.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.usage.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
                  <span className="text-green-600 dark:text-green-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
