'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Monitor, ArrowLeftRight, Lock, Unlock, Maximize, BookOpen } from 'lucide-react'

interface Preset {
  name: string
  width: number
  height: number
}

export default function AspectRatio() {
  const t = useTranslations('aspectRatio')
  const [width, setWidth] = useState<string>('1920')
  const [height, setHeight] = useState<string>('1080')
  const [isRatioLocked, setIsRatioLocked] = useState(false)
  const [lockedRatio, setLockedRatio] = useState<number | null>(null)
  const [targetWidth, setTargetWidth] = useState<string>('')
  const [targetHeight, setTargetHeight] = useState<string>('')

  const presets: Preset[] = useMemo(() => [
    { name: t('presets.items.hd'), width: 1280, height: 720 },
    { name: t('presets.items.fullHd'), width: 1920, height: 1080 },
    { name: t('presets.items.qhd'), width: 2560, height: 1440 },
    { name: t('presets.items.uhd4k'), width: 3840, height: 2160 },
    { name: t('presets.items.ultrawide'), width: 2560, height: 1080 },
    { name: t('presets.items.instagram'), width: 1080, height: 1080 },
    { name: t('presets.items.instagramStory'), width: 1080, height: 1920 },
    { name: t('presets.items.youtube'), width: 1280, height: 720 },
    { name: t('presets.items.a4'), width: 2480, height: 3508 },
  ], [t])

  const gcd = useCallback((a: number, b: number): number => {
    return b === 0 ? a : gcd(b, a % b)
  }, [])

  const results = useMemo(() => {
    const w = parseInt(width) || 0
    const h = parseInt(height) || 0

    if (w <= 0 || h <= 0) {
      return null
    }

    const g = gcd(w, h)
    const ratioW = w / g
    const ratioH = h / g
    const decimal = (w / h).toFixed(4)
    const totalPixels = w * h
    const megapixels = (totalPixels / 1000000).toFixed(2)
    let orientation: 'landscape' | 'portrait' | 'square'

    if (w > h) orientation = 'landscape'
    else if (h > w) orientation = 'portrait'
    else orientation = 'square'

    return {
      ratio: `${ratioW}:${ratioH}`,
      decimal,
      totalPixels: totalPixels.toLocaleString(),
      megapixels,
      orientation,
      orientationText: t(`result.${orientation}`),
      width: w,
      height: h,
      ratioValue: w / h,
    }
  }, [width, height, gcd, t])

  const handleSwap = useCallback(() => {
    const temp = width
    setWidth(height)
    setHeight(temp)
  }, [width, height])

  const handleLockToggle = useCallback(() => {
    if (!isRatioLocked && results) {
      setLockedRatio(results.ratioValue)
    }
    setIsRatioLocked(!isRatioLocked)
  }, [isRatioLocked, results])

  const handleWidthChange = useCallback((value: string) => {
    setWidth(value)
    if (isRatioLocked && lockedRatio && value) {
      const w = parseInt(value)
      if (w > 0) {
        const h = Math.round(w / lockedRatio)
        setHeight(h.toString())
      }
    }
  }, [isRatioLocked, lockedRatio])

  const handleHeightChange = useCallback((value: string) => {
    setHeight(value)
    if (isRatioLocked && lockedRatio && value) {
      const h = parseInt(value)
      if (h > 0) {
        const w = Math.round(h * lockedRatio)
        setWidth(w.toString())
      }
    }
  }, [isRatioLocked, lockedRatio])

  const handlePresetClick = useCallback((preset: Preset) => {
    setWidth(preset.width.toString())
    setHeight(preset.height.toString())
    if (isRatioLocked) {
      setLockedRatio(preset.width / preset.height)
    }
  }, [isRatioLocked])

  const resizerResults = useMemo(() => {
    if (!results) return null

    const tw = parseInt(targetWidth)
    const th = parseInt(targetHeight)

    if (tw > 0) {
      const newHeight = Math.round(tw / results.ratioValue)
      return { width: tw, height: newHeight }
    } else if (th > 0) {
      const newWidth = Math.round(th * results.ratioValue)
      return { width: newWidth, height: th }
    }

    return null
  }, [targetWidth, targetHeight, results])

  const visualPreview = useMemo(() => {
    if (!results) return null

    const maxSize = 300
    const aspectRatio = results.width / results.height
    let previewWidth: number
    let previewHeight: number

    if (aspectRatio > 1) {
      previewWidth = maxSize
      previewHeight = maxSize / aspectRatio
    } else {
      previewHeight = maxSize
      previewWidth = maxSize * aspectRatio
    }

    return { width: previewWidth, height: previewHeight }
  }, [results])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Settings Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Monitor className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('calculate')}</h2>
            </div>

            {/* Width Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('width')}
              </label>
              <input
                type="number"
                value={width}
                onChange={(e) => handleWidthChange(e.target.value)}
                placeholder={t('widthPlaceholder')}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Height Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('height')}
              </label>
              <input
                type="number"
                value={height}
                onChange={(e) => handleHeightChange(e.target.value)}
                placeholder={t('heightPlaceholder')}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleSwap}
                className="flex-1 flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              >
                <ArrowLeftRight className="w-4 h-4" />
                {t('swap')}
              </button>
              <button
                onClick={handleLockToggle}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  isRatioLocked
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                {isRatioLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                {isRatioLocked ? t('unlockRatio') : t('lockRatio')}
              </button>
            </div>

            {/* Presets */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('presets.title')}</h3>
              <div className="flex flex-wrap gap-2">
                {presets.map((preset, index) => (
                  <button
                    key={index}
                    onClick={() => handlePresetClick(preset)}
                    className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-3 py-2 text-sm transition-colors"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Results */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">{t('result.title')}</h2>

            {results ? (
              <div className="space-y-6">
                {/* Results Grid */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('result.aspectRatio')}</div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{results.ratio}</div>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('result.decimal')}</div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{results.decimal}</div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-950 rounded-xl p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('result.totalPixels')}</div>
                    <div className="text-xl font-bold text-green-600 dark:text-green-400">{results.totalPixels}</div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-950 rounded-xl p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('result.megapixels')}</div>
                    <div className="text-xl font-bold text-green-600 dark:text-green-400">{results.megapixels} MP</div>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-950 rounded-xl p-4 md:col-span-2">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('result.orientation')}</div>
                    <div className="text-xl font-bold text-purple-600 dark:text-purple-400">{results.orientationText}</div>
                  </div>
                </div>

                {/* Visual Preview */}
                {visualPreview && (
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6 flex items-center justify-center" style={{ minHeight: '340px' }}>
                    <div
                      className="border-4 border-blue-600 dark:border-blue-400 rounded-lg shadow-lg"
                      style={{
                        width: `${visualPreview.width}px`,
                        height: `${visualPreview.height}px`,
                      }}
                    >
                      <div className="w-full h-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-semibold">
                        {results.ratio}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500 dark:text-gray-400 py-12">
                {t('description')}
              </div>
            )}
          </div>

          {/* Ratio-Preserving Resizer */}
          {results && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-2 mb-6">
                <Maximize className="w-5 h-5 text-purple-600" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('resizer.title')}</h2>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('resizer.targetWidth')}
                  </label>
                  <input
                    type="number"
                    value={targetWidth}
                    onChange={(e) => {
                      setTargetWidth(e.target.value)
                      setTargetHeight('')
                    }}
                    min="1"
                    placeholder="1920"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('resizer.targetHeight')}
                  </label>
                  <input
                    type="number"
                    value={targetHeight}
                    onChange={(e) => {
                      setTargetHeight(e.target.value)
                      setTargetWidth('')
                    }}
                    min="1"
                    placeholder="1080"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {resizerResults && (
                <div className="mt-4 bg-purple-50 dark:bg-purple-950 rounded-xl p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('resizer.resultSize')}</div>
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {resizerResults.width} × {resizerResults.height}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-2 mb-6">
          <BookOpen className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('guide.title')}</h2>
        </div>

        <div className="space-y-6">
          {/* Common Ratios */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t('guide.common.title')}</h3>
            <ul className="space-y-2">
              {(t.raw('guide.common.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                  <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Tips */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t('guide.tips.title')}</h3>
            <ul className="space-y-2">
              {(t.raw('guide.tips.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
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
