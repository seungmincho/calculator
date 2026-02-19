'use client'

import { useState, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Globe, Copy, Check, RefreshCw, MapPin, Wifi, BookOpen, Server } from 'lucide-react'

interface IPData {
  ip: string
  ipv6?: string
  city?: string
  region?: string
  country?: string
  country_name?: string
  timezone?: string
  isp?: string
  org?: string
  asn?: string
  latitude?: number
  longitude?: number
}

export default function IpChecker() {
  const t = useTranslations('ipChecker')
  const [ipData, setIpData] = useState<IPData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

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

  const fetchIPData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch IPv4
      const ipv4Response = await fetch('https://api.ipify.org?format=json')
      const ipv4Data = await ipv4Response.json()
      const ipv4 = ipv4Data.ip

      // Try to fetch IPv6 (might fail if not supported)
      let ipv6: string | undefined
      try {
        const ipv6Response = await fetch('https://api64.ipify.org?format=json')
        const ipv6Data = await ipv6Response.json()
        if (ipv6Data.ip !== ipv4) {
          ipv6 = ipv6Data.ip
        }
      } catch {
        // IPv6 not available
      }

      // Fetch geolocation data using IPv4
      const geoResponse = await fetch(`https://ipapi.co/${ipv4}/json/`)
      const geoData = await geoResponse.json()

      if (geoData.error) {
        throw new Error(geoData.reason || 'Failed to fetch geolocation data')
      }

      setIpData({
        ip: ipv4,
        ipv6,
        city: geoData.city,
        region: geoData.region,
        country: geoData.country,
        country_name: geoData.country_name,
        timezone: geoData.timezone,
        isp: geoData.org,
        org: geoData.org,
        asn: geoData.asn,
        latitude: geoData.latitude,
        longitude: geoData.longitude,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch IP data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchIPData()
  }, [fetchIPData])

  const copyAllInfo = useCallback(() => {
    if (!ipData) return

    const allInfo = [
      `${t('myIp')}:`,
      `IPv4: ${ipData.ip}`,
      ipData.ipv6 ? `IPv6: ${ipData.ipv6}` : '',
      '',
      `${t('location')}:`,
      ipData.city ? `${t('city')}: ${ipData.city}` : '',
      ipData.region ? `${t('region')}: ${ipData.region}` : '',
      ipData.country_name ? `${t('country')}: ${ipData.country_name} (${ipData.country})` : '',
      ipData.timezone ? `${t('timezone')}: ${ipData.timezone}` : '',
      ipData.latitude && ipData.longitude ? `좌표: ${ipData.latitude}, ${ipData.longitude}` : '',
      '',
      `${t('network')}:`,
      ipData.isp ? `${t('isp')}: ${ipData.isp}` : '',
      ipData.org ? `${t('org')}: ${ipData.org}` : '',
      ipData.asn ? `${t('asn')}: ${ipData.asn}` : '',
    ].filter(Boolean).join('\n')

    copyToClipboard(allInfo, 'all')
  }, [ipData, t, copyToClipboard])

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
        </div>

        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <RefreshCw className="w-12 h-12 text-blue-600 animate-spin" />
            <p className="text-gray-600 dark:text-gray-400">{t('loading')}</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex flex-col items-center gap-4 py-8">
            <Globe className="w-12 h-12 text-red-600" />
            <p className="text-red-600 dark:text-red-400 text-center">{error}</p>
            <button
              onClick={fetchIPData}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-6 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              {t('retry')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!ipData) return null

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
        </div>
        <button
          onClick={fetchIPData}
          className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2 font-medium transition-all flex items-center gap-2"
        >
          <RefreshCw className="w-5 h-5" />
          {t('refresh')}
        </button>
      </div>

      {/* Main Cards Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* IP Address Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-100 dark:bg-blue-900 rounded-lg p-3">
              <Globe className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('myIp')}
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">{t('ipv4')}</span>
                <button
                  onClick={() => copyToClipboard(ipData.ip, 'ipv4')}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  {copiedId === 'ipv4' ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 break-all">
                {ipData.ip}
              </p>
            </div>

            {ipData.ipv6 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">{t('ipv6')}</span>
                  <button
                    onClick={() => copyToClipboard(ipData.ipv6!, 'ipv6')}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    {copiedId === 'ipv6' ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-lg font-mono text-gray-700 dark:text-gray-300 break-all">
                  {ipData.ipv6}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Location Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-green-100 dark:bg-green-900 rounded-lg p-3">
              <MapPin className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('location')}
            </h2>
          </div>

          <div className="space-y-3">
            {ipData.city && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">{t('city')}</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-900 dark:text-white font-medium">{ipData.city}</span>
                  <button
                    onClick={() => copyToClipboard(ipData.city!, 'city')}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    {copiedId === 'city' ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {ipData.region && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">{t('region')}</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-900 dark:text-white font-medium">{ipData.region}</span>
                  <button
                    onClick={() => copyToClipboard(ipData.region!, 'region')}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    {copiedId === 'region' ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {ipData.country_name && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">{t('country')}</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-900 dark:text-white font-medium">
                    {ipData.country_name} ({ipData.country})
                  </span>
                  <button
                    onClick={() => copyToClipboard(`${ipData.country_name} (${ipData.country})`, 'country')}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    {copiedId === 'country' ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {ipData.timezone && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">{t('timezone')}</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-900 dark:text-white font-medium">{ipData.timezone}</span>
                  <button
                    onClick={() => copyToClipboard(ipData.timezone!, 'timezone')}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    {copiedId === 'timezone' ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {ipData.latitude && ipData.longitude && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">좌표</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-900 dark:text-white font-medium font-mono text-sm">
                    {ipData.latitude.toFixed(4)}, {ipData.longitude.toFixed(4)}
                  </span>
                  <button
                    onClick={() => copyToClipboard(`${ipData.latitude}, ${ipData.longitude}`, 'coords')}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    {copiedId === 'coords' ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Network Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-purple-100 dark:bg-purple-900 rounded-lg p-3">
              <Wifi className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('network')}
            </h2>
          </div>

          <div className="space-y-3">
            {ipData.isp && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">{t('isp')}</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-900 dark:text-white font-medium text-right">{ipData.isp}</span>
                  <button
                    onClick={() => copyToClipboard(ipData.isp!, 'isp')}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    {copiedId === 'isp' ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {ipData.org && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">{t('org')}</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-900 dark:text-white font-medium text-right">{ipData.org}</span>
                  <button
                    onClick={() => copyToClipboard(ipData.org!, 'org')}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    {copiedId === 'org' ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {ipData.asn && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">{t('asn')}</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-900 dark:text-white font-medium font-mono">{ipData.asn}</span>
                  <button
                    onClick={() => copyToClipboard(ipData.asn!, 'asn')}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    {copiedId === 'asn' ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Copy All Button */}
      <div className="flex justify-center">
        <button
          onClick={copyAllInfo}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-8 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center gap-2"
        >
          {copiedId === 'all' ? (
            <>
              <Check className="w-5 h-5" />
              {t('copied')}
            </>
          ) : (
            <>
              <Copy className="w-5 h-5" />
              {t('copyAll')}
            </>
          )}
        </button>
      </div>

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-blue-600" />
          {t('guide.title')}
        </h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
              {t('guide.whatIsIp.title')}
            </h3>
            <ul className="space-y-2 text-gray-600 dark:text-gray-300">
              {(t.raw('guide.whatIsIp.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Server className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
              {t('guide.whyCheck.title')}
            </h3>
            <ul className="space-y-2 text-gray-600 dark:text-gray-300">
              {(t.raw('guide.whyCheck.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Globe className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
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
