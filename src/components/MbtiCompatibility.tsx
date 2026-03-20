'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowLeft, Share2, Check, Star, ChevronDown } from 'lucide-react'
import {
  MBTI_TYPES,
  mbtiProfiles,
  compatibilityMatrix,
  getCompatibilityDetail,
  getCompatibilityRatingLabel,
  getCompatibilityRatingColor,
  getCompatibilityEmoji,
  type MbtiType,
  type CompatibilityRating,
} from '@/data/mbtiData'

type View = 'selection' | 'detail'
type Perspective = 'male' | 'female'

function getRatingBgClass(rating: CompatibilityRating): string {
  switch (rating) {
    case 5: return 'bg-green-500'
    case 4: return 'bg-blue-500'
    case 3: return 'bg-purple-500'
    case 2: return 'bg-amber-500'
    case 1: return 'bg-red-500'
  }
}

function getRatingBgLightClass(rating: CompatibilityRating): string {
  switch (rating) {
    case 5: return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
    case 4: return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
    case 3: return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
    case 2: return 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200'
    case 1: return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
  }
}

function StarRating({ rating }: { rating: CompatibilityRating }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`w-4 h-4 ${i <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
        />
      ))}
    </div>
  )
}

export default function MbtiCompatibility() {
  const t = useTranslations('mbtiCompatibility')

  const [view, setView] = useState<View>('selection')
  const [type1, setType1] = useState<MbtiType>('INTJ')
  const [type2, setType2] = useState<MbtiType>('ENFP')
  const [perspective, setPerspective] = useState<Perspective>('male')
  const [hoveredCell, setHoveredCell] = useState<{ r: MbtiType; c: MbtiType } | null>(null)
  const [copied, setCopied] = useState(false)

  // Read URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const p1 = params.get('type1') as MbtiType | null
    const p2 = params.get('type2') as MbtiType | null
    if (p1 && MBTI_TYPES.includes(p1)) setType1(p1)
    if (p2 && MBTI_TYPES.includes(p2)) setType2(p2)
    if (p1 && p2 && MBTI_TYPES.includes(p1) && MBTI_TYPES.includes(p2)) {
      setView('detail')
    }
  }, [])

  const updateURL = useCallback((t1: MbtiType, t2: MbtiType) => {
    const url = new URL(window.location.href)
    url.searchParams.set('type1', t1)
    url.searchParams.set('type2', t2)
    window.history.replaceState({}, '', url.toString())
  }, [])

  const handleAnalyze = useCallback(() => {
    updateURL(type1, type2)
    setView('detail')
  }, [type1, type2, updateURL])

  const handleCellClick = useCallback((row: MbtiType, col: MbtiType) => {
    setType1(row)
    setType2(col)
    updateURL(row, col)
    setView('detail')
  }, [updateURL])

  const handleBack = useCallback(() => {
    setView('selection')
    const url = new URL(window.location.href)
    url.searchParams.delete('type1')
    url.searchParams.delete('type2')
    window.history.replaceState({}, '', url.toString())
  }, [])

  const handleShare = useCallback(async () => {
    const url = new URL(window.location.href)
    url.searchParams.set('type1', type1)
    url.searchParams.set('type2', type2)
    const shareUrl = url.toString()
    try {
      if (navigator.share) {
        await navigator.share({ url: shareUrl })
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } else {
        const ta = document.createElement('textarea')
        ta.value = shareUrl
        ta.style.position = 'fixed'
        ta.style.left = '-999999px'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [type1, type2])

  const detail = getCompatibilityDetail(type1, type2)
  const profile1 = mbtiProfiles[type1]
  const profile2 = mbtiProfiles[type2]
  const rating = compatibilityMatrix[type1][type2]

  const ratingLevelKey = (r: CompatibilityRating) => {
    switch (r) {
      case 5: return 'soulmate'
      case 4: return 'veryGood'
      case 3: return 'good'
      case 2: return 'average'
      case 1: return 'caution'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {view === 'selection' && (
        <>
          {/* Type selector */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="grid sm:grid-cols-2 gap-6">
              {/* Type 1 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('myType')}
                </label>
                <div className="relative">
                  <select
                    value={type1}
                    onChange={e => setType1(e.target.value as MbtiType)}
                    className="w-full appearance-none px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent pr-10"
                  >
                    {MBTI_TYPES.map(type => {
                      const p = mbtiProfiles[type]
                      return (
                        <option key={type} value={type}>
                          {p.emoji} {type} - {p.nickname}
                        </option>
                      )
                    })}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                {/* Preview chip */}
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-2xl">{profile1.emoji}</span>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">{type1} - {profile1.nickname}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{profile1.shortDesc}</div>
                  </div>
                </div>
              </div>

              {/* Type 2 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('partnerType')}
                </label>
                <div className="relative">
                  <select
                    value={type2}
                    onChange={e => setType2(e.target.value as MbtiType)}
                    className="w-full appearance-none px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent pr-10"
                  >
                    {MBTI_TYPES.map(type => {
                      const p = mbtiProfiles[type]
                      return (
                        <option key={type} value={type}>
                          {p.emoji} {type} - {p.nickname}
                        </option>
                      )
                    })}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                {/* Preview chip */}
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-2xl">{profile2.emoji}</span>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">{type2} - {profile2.nickname}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{profile2.shortDesc}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick rating preview */}
            <div className="mt-6 flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getCompatibilityEmoji(rating)}</span>
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{t('rating')}</div>
                  <div className="flex items-center gap-2">
                    <StarRating rating={rating} />
                    <span className={`text-sm font-semibold px-2 py-0.5 rounded-full ${getRatingBgLightClass(rating)}`}>
                      {t(`ratingLevels.${ratingLevelKey(rating)}`)}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleAnalyze}
                className="bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg px-6 py-3 font-medium hover:from-pink-700 hover:to-purple-700 transition-all"
              >
                {t('analyze')}
              </button>
            </div>
          </div>

          {/* 16×16 Matrix */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('matrix')}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('matrixDesc')}</p>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="text-sm text-gray-500 dark:text-gray-400 mr-1">{t('legend')}:</span>
              {([5, 4, 3, 2, 1] as CompatibilityRating[]).map(r => (
                <span key={r} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white ${getRatingBgClass(r)}`}>
                  {getCompatibilityEmoji(r)} {getCompatibilityRatingLabel(r)}
                </span>
              ))}
            </div>

            {/* Scrollable matrix */}
            <div className="overflow-x-auto -mx-2 px-2">
              <div className="inline-block min-w-max">
                {/* Column headers */}
                <div className="flex">
                  <div className="w-16 flex-shrink-0" />
                  {MBTI_TYPES.map(col => {
                    const p = mbtiProfiles[col]
                    return (
                      <div key={col} className="w-10 flex-shrink-0 flex flex-col items-center pb-1">
                        <span className="text-xs">{p.emoji}</span>
                        <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 leading-tight">{col}</span>
                      </div>
                    )
                  })}
                </div>

                {/* Rows */}
                {MBTI_TYPES.map(row => {
                  const rp = mbtiProfiles[row]
                  return (
                    <div key={row} className="flex items-center">
                      {/* Row header */}
                      <div className="w-16 flex-shrink-0 flex items-center gap-1 pr-1">
                        <span className="text-xs">{rp.emoji}</span>
                        <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300">{row}</span>
                      </div>
                      {/* Cells */}
                      {MBTI_TYPES.map(col => {
                        const cellRating = compatibilityMatrix[row][col]
                        const isHovered = hoveredCell?.r === row && hoveredCell?.c === col
                        const isSelected = row === type1 && col === type2
                        return (
                          <div
                            key={col}
                            className="relative w-10 h-10 flex-shrink-0 flex items-center justify-center m-px cursor-pointer rounded-md transition-all"
                            style={{
                              backgroundColor: getCompatibilityRatingColor(cellRating),
                              opacity: isHovered || isSelected ? 1 : 0.75,
                              transform: isHovered || isSelected ? 'scale(1.15)' : 'scale(1)',
                              zIndex: isHovered || isSelected ? 10 : 1,
                              boxShadow: isSelected ? '0 0 0 2px white, 0 0 0 3px ' + getCompatibilityRatingColor(cellRating) : undefined,
                            }}
                            onClick={() => handleCellClick(row, col)}
                            onMouseEnter={() => setHoveredCell({ r: row, c: col })}
                            onMouseLeave={() => setHoveredCell(null)}
                          >
                            <span className="text-[11px] font-bold text-white">{cellRating}</span>
                            {/* Tooltip */}
                            {isHovered && (
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded px-2 py-1 whitespace-nowrap z-20 pointer-events-none">
                                {rp.emoji}{row} + {mbtiProfiles[col].emoji}{col}: {getCompatibilityRatingLabel(cellRating)}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-100" />
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {view === 'detail' && (
        <div className="space-y-6">
          {/* Detail header */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">{t('backToMatrix')}</span>
              </button>
              <button
                onClick={handleShare}
                className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-3 py-2 text-sm transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Share2 className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Share'}
              </button>
            </div>

            {/* Types display */}
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <div className="flex flex-col items-center">
                <span className="text-5xl mb-1">{profile1.emoji}</span>
                <span className="text-xl font-bold text-gray-900 dark:text-white">{type1}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">{profile1.nickname}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-3xl">❤️</span>
                <div className="mt-1 flex flex-col items-center">
                  <StarRating rating={rating} />
                  <span className={`text-sm font-semibold mt-1 px-3 py-0.5 rounded-full ${getRatingBgLightClass(rating)}`}>
                    {t(`ratingLevels.${ratingLevelKey(rating)}`)}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-5xl mb-1">{profile2.emoji}</span>
                <span className="text-xl font-bold text-gray-900 dark:text-white">{type2}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">{profile2.nickname}</span>
              </div>
            </div>

            {/* Summary quote */}
            <div className="mt-4 text-center">
              <p className="text-gray-600 dark:text-gray-300 italic text-base">"{detail.summary}"</p>
            </div>
          </div>

          {/* Perspective tabs */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-2 mb-6">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('perspective')}:</span>
              <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
                <button
                  onClick={() => setPerspective('male')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    perspective === 'male'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  👨 {t('perspectiveMale')}
                </button>
                <button
                  onClick={() => setPerspective('female')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    perspective === 'female'
                      ? 'bg-pink-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  👩 {t('perspectiveFemale')}
                </button>
              </div>
            </div>

            {/* Analysis sections */}
            <div className="grid sm:grid-cols-2 gap-4">
              {/* First impression */}
              <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">💫</span>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{t('firstImpression')}</h3>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {perspective === 'male' ? detail.firstImpression.male : detail.firstImpression.female}
                </p>
              </div>

              {/* Dating strengths */}
              <div className="bg-green-50 dark:bg-green-950 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">💕</span>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{t('datingStrengths')}</h3>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {perspective === 'male' ? detail.datingStrengths.male : detail.datingStrengths.female}
                </p>
              </div>

              {/* Conflict points */}
              <div className="bg-amber-50 dark:bg-amber-950 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">⚡</span>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{t('conflictPoints')}</h3>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {perspective === 'male' ? detail.conflictPoints.male : detail.conflictPoints.female}
                </p>
              </div>

              {/* Advice */}
              <div className="bg-purple-50 dark:bg-purple-950 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">💡</span>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{t('advice')}</h3>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {perspective === 'male' ? detail.advice.male : detail.advice.female}
                </p>
              </div>
            </div>
          </div>

          {/* Type profiles */}
          <div className="grid sm:grid-cols-2 gap-6">
            {[{ profile: profile1, type: type1 }, { profile: profile2, type: type2 }].map(({ profile, type }) => (
              <div key={type} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{profile.emoji}</span>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">{type} - {profile.nickname}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{profile.shortDesc}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">{t('typeProfile')}</div>
                    <div className="flex flex-wrap gap-1">
                      {profile.traits.map(trait => (
                        <span key={trait} className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
                          {trait}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">연애 스타일</div>
                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{profile.loveStyle}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Mini matrix for context + back to full matrix */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('matrix')}</h2>
              <button
                onClick={handleBack}
                className="text-sm text-pink-600 dark:text-pink-400 hover:underline flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" />
                {t('backToMatrix')}
              </button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('matrixDesc')}</p>

            {/* Legend */}
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="text-sm text-gray-500 dark:text-gray-400 mr-1">{t('legend')}:</span>
              {([5, 4, 3, 2, 1] as CompatibilityRating[]).map(r => (
                <span key={r} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white ${getRatingBgClass(r)}`}>
                  {getCompatibilityEmoji(r)} {getCompatibilityRatingLabel(r)}
                </span>
              ))}
            </div>

            {/* Compact scrollable matrix */}
            <div className="overflow-x-auto -mx-2 px-2">
              <div className="inline-block min-w-max">
                <div className="flex">
                  <div className="w-16 flex-shrink-0" />
                  {MBTI_TYPES.map(col => {
                    const p = mbtiProfiles[col]
                    return (
                      <div key={col} className="w-10 flex-shrink-0 flex flex-col items-center pb-1">
                        <span className="text-xs">{p.emoji}</span>
                        <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 leading-tight">{col}</span>
                      </div>
                    )
                  })}
                </div>
                {MBTI_TYPES.map(row => {
                  const rp = mbtiProfiles[row]
                  return (
                    <div key={row} className="flex items-center">
                      <div className="w-16 flex-shrink-0 flex items-center gap-1 pr-1">
                        <span className="text-xs">{rp.emoji}</span>
                        <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300">{row}</span>
                      </div>
                      {MBTI_TYPES.map(col => {
                        const cellRating = compatibilityMatrix[row][col]
                        const isSelected = row === type1 && col === type2
                        return (
                          <div
                            key={col}
                            className="relative w-10 h-10 flex-shrink-0 flex items-center justify-center m-px cursor-pointer rounded-md transition-all hover:scale-110"
                            style={{
                              backgroundColor: getCompatibilityRatingColor(cellRating),
                              opacity: isSelected ? 1 : 0.7,
                              boxShadow: isSelected ? '0 0 0 2px white, 0 0 0 3px ' + getCompatibilityRatingColor(cellRating) : undefined,
                            }}
                            onClick={() => handleCellClick(row, col)}
                          >
                            <span className="text-[11px] font-bold text-white">{cellRating}</span>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
        <p className="text-sm text-yellow-800 dark:text-yellow-200 text-center">{t('disclaimer')}</p>
      </div>

      {/* Guide section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">{t('guide.title')}</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          {/* Rating levels */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{t('guide.rating.title')}</h3>
            <ul className="space-y-2">
              {(t.raw('guide.rating.items') as string[]).map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <span className="text-pink-500 mt-0.5 flex-shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          {/* Usage tips */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{t('guide.tips.title')}</h3>
            <ul className="space-y-2">
              {(t.raw('guide.tips.items') as string[]).map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <span className="text-purple-500 mt-0.5 flex-shrink-0">•</span>
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
