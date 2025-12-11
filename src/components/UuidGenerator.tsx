'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { 
  RefreshCw, 
  Copy, 
  Check,
  Download,
  Settings,
  Hash,
  Clock,
  Shuffle,
  Zap,
  Info,
  FileDown,
  List,
  Grid3X3
} from 'lucide-react'

interface UuidOptions {
  version: 'v1' | 'v4' | 'v7' | 'nil'
  count: number
  format: 'standard' | 'uppercase' | 'lowercase' | 'compact' | 'braces' | 'urn'
  includeTimestamp: boolean
}

interface GeneratedUuid {
  id: string
  uuid: string
  timestamp?: Date
  version: string
}

const UuidGenerator = () => {
  const t = useTranslations('uuidGenerator')
  const tc = useTranslations('common')
  const [options, setOptions] = useState<UuidOptions>({
    version: 'v4',
    count: 1,
    format: 'standard',
    includeTimestamp: false
  })
  const [generatedUuids, setGeneratedUuids] = useState<GeneratedUuid[]>([])
  const [isCopied, setIsCopied] = useState<{ [key: string]: boolean }>({})
  const [isGenerating, setIsGenerating] = useState(false)

  // UUID v4 generation (Random)
  const generateUuidV4 = useCallback((): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }, [])

  // UUID v1 generation (Timestamp + Node)
  const generateUuidV1 = useCallback((): string => {
    const timestamp = Date.now()
    const timeLow = (timestamp & 0xffffffff).toString(16).padStart(8, '0')
    const timeMid = ((timestamp >>> 32) & 0xffff).toString(16).padStart(4, '0')
    const timeHigh = (0x1000 | ((timestamp >>> 48) & 0x0fff)).toString(16).padStart(4, '0')
    const clockSeq = Math.floor(Math.random() * 0x3fff) | 0x8000
    const node = Array.from({length: 6}, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('')
    
    return `${timeLow}-${timeMid}-${timeHigh}-${clockSeq.toString(16)}-${node}`
  }, [])

  // UUID v7 generation (Timestamp + Random)
  const generateUuidV7 = useCallback((): string => {
    const timestamp = Date.now()
    const timestampHex = timestamp.toString(16).padStart(12, '0')
    const randomA = Math.floor(Math.random() * 0xfff) | 0x7000
    const randomB = Math.floor(Math.random() * 0x3fff) | 0x8000
    const randomC = Math.floor(Math.random() * 0xffffffffffff).toString(16).padStart(12, '0')
    
    return `${timestampHex.slice(0, 8)}-${timestampHex.slice(8)}-${randomA.toString(16)}-${randomB.toString(16)}-${randomC}`
  }, [])

  // Nil UUID generation
  const generateNilUuid = useCallback((): string => {
    return '00000000-0000-0000-0000-000000000000'
  }, [])

  // Format UUID based on selected format
  const formatUuid = useCallback((uuid: string, format: string): string => {
    switch (format) {
      case 'uppercase':
        return uuid.toUpperCase()
      case 'lowercase':
        return uuid.toLowerCase()
      case 'compact':
        return uuid.replace(/-/g, '')
      case 'braces':
        return `{${uuid}}`
      case 'urn':
        return `urn:uuid:${uuid}`
      default:
        return uuid
    }
  }, [])

  // Generate UUIDs based on options
  const generateUuids = useCallback(() => {
    setIsGenerating(true)
    
    setTimeout(() => {
      const newUuids: GeneratedUuid[] = []
      
      for (let i = 0; i < options.count; i++) {
        let uuid: string
        
        switch (options.version) {
          case 'v1':
            uuid = generateUuidV1()
            break
          case 'v7':
            uuid = generateUuidV7()
            break
          case 'nil':
            uuid = generateNilUuid()
            break
          default:
            uuid = generateUuidV4()
        }
        
        const formattedUuid = formatUuid(uuid, options.format)
        
        newUuids.push({
          id: `${Date.now()}-${i}`,
          uuid: formattedUuid,
          timestamp: options.includeTimestamp ? new Date() : undefined,
          version: options.version
        })
      }
      
      setGeneratedUuids(newUuids)
      setIsGenerating(false)
    }, 100)
  }, [options, generateUuidV1, generateUuidV4, generateUuidV7, generateNilUuid, formatUuid])

  // Copy to clipboard
  const copyToClipboard = useCallback(async (text: string, id: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }
      
      setIsCopied(prev => ({ ...prev, [id]: true }))
      setTimeout(() => {
        setIsCopied(prev => ({ ...prev, [id]: false }))
      }, 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
      // Still show success feedback even if there was an error
      setIsCopied(prev => ({ ...prev, [id]: true }))
      setTimeout(() => {
        setIsCopied(prev => ({ ...prev, [id]: false }))
      }, 2000)
    }
  }, [])

  // Copy all UUIDs
  const copyAllUuids = useCallback(async () => {
    const allUuids = generatedUuids.map(item => item.uuid).join('\n')
    await copyToClipboard(allUuids, 'all')
  }, [generatedUuids, copyToClipboard])

  // Download as file
  const downloadUuids = useCallback(() => {
    const content = generatedUuids.map(item => {
      if (options.includeTimestamp && item.timestamp) {
        return `${item.uuid} // ${item.timestamp.toISOString()}`
      }
      return item.uuid
    }).join('\n')
    
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `uuids-${options.version}-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }, [generatedUuids, options])

  // Version information
  const versionInfo = useMemo(() => {
    switch (options.version) {
      case 'v1':
        return {
          icon: Clock,
          description: t('versions.v1.description'),
          useCase: t('versions.v1.useCase')
        }
      case 'v7':
        return {
          icon: Zap,
          description: t('versions.v7.description'),
          useCase: t('versions.v7.useCase')
        }
      case 'nil':
        return {
          icon: Hash,
          description: t('versions.nil.description'),
          useCase: t('versions.nil.useCase')
        }
      default:
        return {
          icon: Shuffle,
          description: t('versions.v4.description'),
          useCase: t('versions.v4.useCase')
        }
    }
  }, [options.version, t])

  const VersionIcon = versionInfo.icon

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('description')}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Settings Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
            <div className="flex items-center space-x-2">
              <Settings className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('settings.title')}
              </h2>
            </div>

            {/* UUID Version */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('settings.version')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['v1', 'v4', 'v7', 'nil'] as const).map((version) => (
                  <button
                    key={version}
                    onClick={() => setOptions(prev => ({ ...prev, version }))}
                    className={`p-3 text-sm rounded-lg border transition-all ${
                      options.version === version
                        ? 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900 dark:border-blue-600 dark:text-blue-200'
                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    <div className="font-medium">UUID {version.toUpperCase()}</div>
                    <div className="text-xs opacity-75 mt-1">
                      {t(`versions.${version}.name`)}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Count */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('settings.count')}
              </label>
              <div className="flex space-x-2">
                {[1, 5, 10, 50, 100].map((count) => (
                  <button
                    key={count}
                    onClick={() => setOptions(prev => ({ ...prev, count }))}
                    className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                      options.count === count
                        ? 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900 dark:border-blue-600 dark:text-blue-200'
                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min="1"
                max="1000"
                value={options.count}
                onChange={(e) => setOptions(prev => ({ ...prev, count: Math.max(1, Math.min(1000, parseInt(e.target.value) || 1)) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder={t('settings.customCount')}
              />
            </div>

            {/* Format */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('settings.format')}
              </label>
              <select
                value={options.format}
                onChange={(e) => setOptions(prev => ({ ...prev, format: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="standard">{t('formats.standard')}</option>
                <option value="uppercase">{t('formats.uppercase')}</option>
                <option value="lowercase">{t('formats.lowercase')}</option>
                <option value="compact">{t('formats.compact')}</option>
                <option value="braces">{t('formats.braces')}</option>
                <option value="urn">{t('formats.urn')}</option>
              </select>
            </div>

            {/* Options */}
            <div className="space-y-3">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={options.includeTimestamp}
                  onChange={(e) => setOptions(prev => ({ ...prev, includeTimestamp: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {t('settings.includeTimestamp')}
                </span>
              </label>
            </div>

            {/* Generate Button */}
            <button
              onClick={generateUuids}
              disabled={isGenerating}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium py-3 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isGenerating ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <RefreshCw className="w-5 h-5" />
              )}
              <span>{isGenerating ? t('generating') : t('generate')}</span>
            </button>
          </div>

          {/* Version Info */}
          <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-6 mt-6">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-200 dark:bg-blue-800 rounded-lg flex items-center justify-center">
                  <VersionIcon className="w-5 h-5 text-blue-700 dark:text-blue-300" />
                </div>
              </div>
              <div>
                <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                  UUID {options.version.toUpperCase()}
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                  {versionInfo.description}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  <strong>{t('versions.useCase')}:</strong> {versionInfo.useCase}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <List className="w-5 h-5 text-green-600" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {t('result.title')}
                </h2>
                {generatedUuids.length > 0 && (
                  <span className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-1 rounded-full text-sm">
                    {generatedUuids.length}
                  </span>
                )}
              </div>
              
              {generatedUuids.length > 0 && (
                <div className="flex space-x-2">
                  <button
                    onClick={copyAllUuids}
                    className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {isCopied['all'] ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    <span className="text-sm">{tc('copy')}</span>
                  </button>
                  <button
                    onClick={downloadUuids}
                    className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span className="text-sm">{tc('export')}</span>
                  </button>
                </div>
              )}
            </div>

            {generatedUuids.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Hash className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 dark:text-gray-400">
                  {t('placeholder')}
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {generatedUuids.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-sm text-gray-900 dark:text-white break-all">
                        {item.uuid}
                      </div>
                      {item.timestamp && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {item.timestamp.toLocaleString()}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => copyToClipboard(item.uuid, item.id)}
                      className="ml-3 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    >
                      {isCopied[item.id] ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Info className="w-5 h-5 text-orange-600" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('guide.title')}
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">
              {t('guide.versionsTitle')}
            </h3>
            <div className="space-y-3">
              {(['v1', 'v4', 'v7', 'nil'] as const).map((version) => (
                <div key={version} className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                  <div>
                    <div className="font-medium text-sm text-gray-900 dark:text-white">
                      UUID {version.toUpperCase()}: {t(`versions.${version}.name`)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {t(`versions.${version}.description`)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">
              {t('guide.useCasesTitle')}
            </h3>
            <div className="space-y-3">
              {[0, 1, 2, 3].map((index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {t(`guide.useCases.${index}`)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UuidGenerator