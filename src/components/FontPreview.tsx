'use client'

import { useState, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Copy, Check, BookOpen, Search, Columns, Type, X, AlignLeft, AlignCenter, AlignRight } from 'lucide-react'

interface Font {
  name: string
  category: 'sansSerif' | 'serif' | 'monospace' | 'handwriting' | 'display'
  google: boolean
}

const FONTS: Font[] = [
  // Korean fonts
  { name: 'Noto Sans KR', category: 'sansSerif', google: true },
  { name: 'Pretendard', category: 'sansSerif', google: false },
  { name: 'Nanum Gothic', category: 'sansSerif', google: true },
  { name: 'Nanum Myeongjo', category: 'serif', google: true },
  { name: 'Black Han Sans', category: 'display', google: true },
  { name: 'Jua', category: 'display', google: true },
  { name: 'Gamja Flower', category: 'handwriting', google: true },
  { name: 'Gothic A1', category: 'sansSerif', google: true },
  { name: 'Do Hyeon', category: 'display', google: true },
  { name: 'Nanum Pen Script', category: 'handwriting', google: true },
  { name: 'D2Coding', category: 'monospace', google: false },
  // English/System fonts
  { name: 'Arial', category: 'sansSerif', google: false },
  { name: 'Georgia', category: 'serif', google: false },
  { name: 'Courier New', category: 'monospace', google: false },
  { name: 'Roboto', category: 'sansSerif', google: true },
  { name: 'Open Sans', category: 'sansSerif', google: true },
  { name: 'Lato', category: 'sansSerif', google: true },
  { name: 'Playfair Display', category: 'serif', google: true },
  { name: 'JetBrains Mono', category: 'monospace', google: true },
]

const CATEGORY_MAP: Record<string, Font['category'] | 'all'> = {
  all: 'all',
  sansSerif: 'sansSerif',
  serif: 'serif',
  monospace: 'monospace',
  handwriting: 'handwriting',
  display: 'display',
}

export default function FontPreview() {
  const t = useTranslations('fontPreview')

  const [sampleText, setSampleText] = useState('다람쥐 헌 쳇바퀴에 타고파 The quick brown fox 0123456789')
  const [fontSize, setFontSize] = useState(24)
  const [fontWeight, setFontWeight] = useState(400)
  const [lineHeight, setLineHeight] = useState(1.5)
  const [letterSpacing, setLetterSpacing] = useState(0)
  const [textColor, setTextColor] = useState('#000000')
  const [bgColor, setBgColor] = useState('#ffffff')
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left')
  const [selectedFont, setSelectedFont] = useState<Font>(FONTS[0])
  const [category, setCategory] = useState<'all' | Font['category']>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [compareList, setCompareList] = useState<Font[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [loadedFonts, setLoadedFonts] = useState<Set<string>>(new Set())

  // Load Google Fonts dynamically
  useEffect(() => {
    const fontsToLoad = new Set<string>()

    // Add selected font
    if (selectedFont.google && !loadedFonts.has(selectedFont.name)) {
      fontsToLoad.add(selectedFont.name)
    }

    // Add compare fonts
    compareList.forEach(font => {
      if (font.google && !loadedFonts.has(font.name)) {
        fontsToLoad.add(font.name)
      }
    })

    if (fontsToLoad.size > 0) {
      fontsToLoad.forEach(fontName => {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@100;300;400;500;700;900&display=swap`
        link.id = `font-${fontName.replace(/ /g, '-')}`
        document.head.appendChild(link)
      })

      setLoadedFonts(prev => new Set([...prev, ...fontsToLoad]))
    }
  }, [selectedFont, compareList, loadedFonts])

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

  const copyCSS = useCallback(() => {
    const fallback = selectedFont.category === 'serif' ? 'serif' :
                     selectedFont.category === 'monospace' ? 'monospace' : 'sans-serif'
    const css = `font-family: '${selectedFont.name}', ${fallback};
font-size: ${fontSize}px;
font-weight: ${fontWeight};
line-height: ${lineHeight};
letter-spacing: ${letterSpacing}px;
text-align: ${textAlign};
color: ${textColor};
background-color: ${bgColor};`

    copyToClipboard(css, 'css')
  }, [selectedFont, fontSize, fontWeight, lineHeight, letterSpacing, textAlign, textColor, bgColor, copyToClipboard])

  const filteredFonts = FONTS.filter(font => {
    const matchesCategory = category === 'all' || font.category === category
    const matchesSearch = searchQuery === '' ||
      font.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const toggleCompare = useCallback((font: Font) => {
    setCompareList(prev => {
      const exists = prev.find(f => f.name === font.name)
      if (exists) {
        return prev.filter(f => f.name !== font.name)
      } else if (prev.length < 4) {
        return [...prev, font]
      }
      return prev
    })
  }, [])

  const getFontStyle = (font: Font) => ({
    fontFamily: `'${font.name}', ${
      font.category === 'serif' ? 'serif' :
      font.category === 'monospace' ? 'monospace' : 'sans-serif'
    }`,
    fontSize: `${fontSize}px`,
    fontWeight,
    lineHeight,
    letterSpacing: `${letterSpacing}px`,
    textAlign,
    color: textColor,
    backgroundColor: bgColor,
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Sample Text Input */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <Type className="inline w-4 h-4 mr-1" />
          {t('sampleText')}
        </label>
        <textarea
          value={sampleText}
          onChange={(e) => setSampleText(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 resize-none"
          rows={2}
          placeholder={t('defaultText')}
        />
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Panel: Controls */}
        <div className="lg:col-span-1 space-y-6">
          {/* Font Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              설정
            </h2>

            {/* Font Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('fontSize')}: {fontSize}px
              </label>
              <input
                type="range"
                min="12"
                max="72"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>

            {/* Font Weight */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('fontWeight')}: {fontWeight}
              </label>
              <input
                type="range"
                min="100"
                max="900"
                step="100"
                value={fontWeight}
                onChange={(e) => setFontWeight(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>

            {/* Line Height */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('lineHeight')}: {lineHeight.toFixed(1)}
              </label>
              <input
                type="range"
                min="1"
                max="3"
                step="0.1"
                value={lineHeight}
                onChange={(e) => setLineHeight(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>

            {/* Letter Spacing */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('letterSpacing')}: {letterSpacing}px
              </label>
              <input
                type="range"
                min="-2"
                max="10"
                step="0.5"
                value={letterSpacing}
                onChange={(e) => setLetterSpacing(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>

            {/* Text Alignment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('textAlign')}
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setTextAlign('left')}
                  className={`flex-1 p-2 rounded-lg border ${
                    textAlign === 'left'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <AlignLeft className="w-5 h-5 mx-auto" />
                </button>
                <button
                  onClick={() => setTextAlign('center')}
                  className={`flex-1 p-2 rounded-lg border ${
                    textAlign === 'center'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <AlignCenter className="w-5 h-5 mx-auto" />
                </button>
                <button
                  onClick={() => setTextAlign('right')}
                  className={`flex-1 p-2 rounded-lg border ${
                    textAlign === 'right'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <AlignRight className="w-5 h-5 mx-auto" />
                </button>
              </div>
            </div>

            {/* Colors */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('textColor')}
                </label>
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="w-full h-10 rounded-lg cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('bgColor')}
                </label>
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="w-full h-10 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* Copy CSS Button */}
            <button
              onClick={copyCSS}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 flex items-center justify-center gap-2"
            >
              {copiedId === 'css' ? (
                <>
                  <Check className="w-4 h-4" />
                  {t('copiedCSS')}
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  {t('copyCSS')}
                </>
              )}
            </button>
          </div>

          {/* Category Filter */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              {t('category')}
            </h3>
            <div className="flex flex-wrap gap-2">
              {Object.keys(CATEGORY_MAP).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(CATEGORY_MAP[cat])}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    category === CATEGORY_MAP[cat]
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {t(cat)}
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('search')}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Compare Mode */}
          {compareList.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-950 rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Columns className="w-4 h-4" />
                  {t('compare')} ({compareList.length}/4)
                </h3>
                <button
                  onClick={() => setCompareList([])}
                  className="text-sm text-red-600 dark:text-red-400 hover:underline"
                >
                  {t('clearCompare')}
                </button>
              </div>
              <div className="space-y-2">
                {compareList.map((font) => (
                  <div
                    key={font.name}
                    className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg px-3 py-2"
                  >
                    <span className="text-sm text-gray-900 dark:text-white">{font.name}</span>
                    <button
                      onClick={() => toggleCompare(font)}
                      className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Font List or Compare View */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            {compareList.length === 0 ? (
              /* Font List */
              <>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {t('fonts')} ({filteredFonts.length})
                </h2>
                <div className="space-y-4 max-h-[800px] overflow-y-auto">
                  {filteredFonts.map((font) => (
                    <div
                      key={font.name}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedFont.name === font.name
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedFont(font)}
                            className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
                          >
                            {font.name}
                          </button>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                            {t(font.category)}
                          </span>
                          {!font.google && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                              System
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => toggleCompare(font)}
                          className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                            compareList.find(f => f.name === font.name)
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          <Columns className="w-4 h-4" />
                        </button>
                      </div>
                      <div
                        style={getFontStyle(font)}
                        className="p-4 rounded-lg"
                      >
                        {sampleText}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              /* Compare View */
              <>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Columns className="w-5 h-5" />
                  비교 보기
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {compareList.map((font) => (
                    <div
                      key={font.name}
                      className="p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {font.name}
                          </h3>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {t(font.category)}
                          </span>
                        </div>
                        <button
                          onClick={() => toggleCompare(font)}
                          className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div
                        style={getFontStyle(font)}
                        className="p-4 rounded-lg"
                      >
                        {sampleText}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          {t('guide.title')}
        </h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.usage.title')}
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300">
              {(t.raw('guide.usage.items') as string[]).map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.tips.title')}
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300">
              {(t.raw('guide.tips.items') as string[]).map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
