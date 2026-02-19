'use client'

import { useState, useCallback, useRef, useEffect, DragEvent, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Copy, Check, Download, Upload, Languages, BookOpen, RotateCcw, RotateCw, FileText } from 'lucide-react'

interface WordWithConfidence {
  text: string
  confidence: number
}

const LANGUAGE_OPTIONS = [
  { code: 'kor', labelKey: 'languages.kor' },
  { code: 'eng', labelKey: 'languages.eng' },
  { code: 'jpn', labelKey: 'languages.jpn' },
  { code: 'chi_sim', labelKey: 'languages.chiSim' },
  { code: 'chi_tra', labelKey: 'languages.chiTra' },
]

export default function ImageOcr() {
  const t = useTranslations('imageOcr')

  // State
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [selectedLangs, setSelectedLangs] = useState<string[]>(['kor', 'eng'])
  const [resultText, setResultText] = useState('')
  const [words, setWords] = useState<WordWithConfidence[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [statusText, setStatusText] = useState('')
  const [showConfidence, setShowConfidence] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [rotation, setRotation] = useState(0)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Cleanup object URL on unmount or when image changes
  useEffect(() => {
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl)
      }
    }
  }, [imageUrl])

  // Clipboard paste handler (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          e.preventDefault()
          const file = item.getAsFile()
          if (file) {
            loadImage(file)
          }
          break
        }
      }
    }

    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Create rotated image blob for OCR
  const getRotatedBlob = useCallback((file: File, deg: number): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!
        const swap = deg === 90 || deg === 270
        canvas.width = swap ? img.height : img.width
        canvas.height = swap ? img.width : img.height
        ctx.translate(canvas.width / 2, canvas.height / 2)
        ctx.rotate((deg * Math.PI) / 180)
        ctx.drawImage(img, -img.width / 2, -img.height / 2)
        canvas.toBlob((blob) => resolve(blob!), 'image/png')
      }
      img.src = URL.createObjectURL(file)
    })
  }, [])

  const loadImage = useCallback((file: File) => {
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl)
    }
    const url = URL.createObjectURL(file)
    setImageFile(file)
    setImageUrl(url)
    setResultText('')
    setWords([])
    setProgress(0)
    setStatusText('')
    setRotation(0)
  }, [imageUrl])

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    if (!file.type.startsWith('image/')) return
    loadImage(file)
  }, [loadImage])

  // Drag & Drop handlers
  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files)
  }, [handleFiles])

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  // Language toggle
  const toggleLanguage = useCallback((langCode: string) => {
    setSelectedLangs(prev => {
      if (prev.includes(langCode)) {
        // Don't allow deselecting all
        if (prev.length === 1) return prev
        return prev.filter(l => l !== langCode)
      }
      return [...prev, langCode]
    })
  }, [])

  // OCR recognition
  const handleRecognize = useCallback(async () => {
    if (!imageFile) return

    setIsProcessing(true)
    setProgress(0)
    setStatusText(t('recognizing'))
    setResultText('')
    setWords([])

    try {
      const { createWorker } = await import('tesseract.js')
      const langs = selectedLangs.join('+')
      const worker = await createWorker(langs, undefined, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100))
          }
          setStatusText(m.status)
        },
      })

      // Apply rotation if needed
      const ocrInput = rotation === 0 ? imageFile : await getRotatedBlob(imageFile, rotation)
      const { data } = await worker.recognize(ocrInput)
      setResultText(data.text)

      // Extract word-level confidence from nested structure
      const wordData: WordWithConfidence[] = []
      if (data.blocks) {
        for (const block of data.blocks) {
          for (const paragraph of block.paragraphs) {
            for (const line of paragraph.lines) {
              for (const w of line.words) {
                wordData.push({ text: w.text, confidence: w.confidence })
              }
            }
          }
        }
      }
      setWords(wordData)

      await worker.terminate()
    } catch (error) {
      console.error('OCR error:', error)
      setResultText('')
    } finally {
      setIsProcessing(false)
      setProgress(100)
      setStatusText('')
    }
  }, [imageFile, selectedLangs, rotation, getRotatedBlob, t])

  // Clipboard copy
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

  // Download as TXT
  const handleDownloadTxt = useCallback(() => {
    if (!resultText) return
    const blob = new Blob([resultText], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'ocr-result.txt'
    a.click()
    URL.revokeObjectURL(url)
  }, [resultText])

  // Reset
  const handleReset = useCallback(() => {
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl)
    }
    setImageFile(null)
    setImageUrl(null)
    setResultText('')
    setWords([])
    setProgress(0)
    setStatusText('')
    setShowConfidence(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [imageUrl])

  // Confidence color
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 90) return 'text-green-600 dark:text-green-400'
    if (confidence >= 70) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getConfidenceBg = (confidence: number): string => {
    if (confidence >= 90) return 'bg-green-100 dark:bg-green-900'
    if (confidence >= 70) return 'bg-yellow-100 dark:bg-yellow-900'
    return 'bg-red-100 dark:bg-red-900'
  }

  // Guide arrays
  const featureItems = useMemo(() => {
    try {
      return t.raw('guide.features.items') as string[]
    } catch {
      return []
    }
  }, [t])

  const tipItems = useMemo(() => {
    try {
      return t.raw('guide.tips.items') as string[]
    } catch {
      return []
    }
  }, [t])

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
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-5">
            {/* Upload Area */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                {t('upload')}
              </h2>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleUploadClick}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-500'
                }`}
              >
                <Upload className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('uploadDragDrop')}</p>
                <p className="text-xs text-gray-500 dark:text-gray-500">{t('pasteHint')}</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* Image Preview + Rotation */}
            {imageUrl && (
              <div className="space-y-2">
                <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-full h-auto max-h-48 object-contain"
                    style={{ transform: `rotate(${rotation}deg)` }}
                  />
                </div>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => setRotation((r) => (r + 270) % 360)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
                    title={t('rotateLeft')}
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>90°</span>
                  </button>
                  <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[3rem] text-center">{rotation}°</span>
                  <button
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
                    title={t('rotateRight')}
                  >
                    <RotateCw className="w-4 h-4" />
                    <span>90°</span>
                  </button>
                </div>
              </div>
            )}

            {/* Language Selection */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                <Languages className="w-4 h-4" />
                {t('language')}
              </label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGE_OPTIONS.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => toggleLanguage(lang.code)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      selectedLangs.includes(lang.code)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {t(lang.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                onClick={handleRecognize}
                disabled={!imageFile || isProcessing}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileText className="w-5 h-5" />
                {isProcessing ? t('recognizing') : t('recognize')}
              </button>
              <button
                onClick={handleReset}
                disabled={!imageFile && !resultText}
                className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-3 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-5 h-5" />
                {t('reset')}
              </button>
            </div>

            {/* Progress Bar */}
            {isProcessing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{t('progress')}</span>
                  <span className="text-blue-600 dark:text-blue-400 font-medium">{progress}%</span>
                </div>
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                {statusText && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">{statusText}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            {/* Results Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('result')}
              </h2>
              {resultText && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(resultText, 'result')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
                  >
                    {copiedId === 'result' ? (
                      <>
                        <Check className="w-4 h-4 text-green-600" />
                        <span>{t('copied')}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>{t('copy')}</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleDownloadTxt}
                    className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-sm font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>{t('downloadTxt')}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Result Textarea */}
            {resultText ? (
              <textarea
                value={resultText}
                onChange={(e) => setResultText(e.target.value)}
                rows={12}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 font-mono text-sm resize-y"
              />
            ) : (
              <div className="text-center py-16">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <p className="text-gray-500 dark:text-gray-400">
                  {imageFile ? t('noResult') : t('noImage')}
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  {t('resultPlaceholder')}
                </p>
              </div>
            )}

            {/* Confidence Section */}
            {resultText && words.length > 0 && (
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showConfidence}
                    onChange={(e) => setShowConfidence(e.target.checked)}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('showConfidence')}
                  </span>
                </label>

                {showConfidence && (
                  <div className="mt-3 max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                    <div className="flex flex-wrap gap-1.5">
                      {words.map((word, index) => (
                        <span
                          key={index}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm ${getConfidenceBg(word.confidence)}`}
                          title={`${t('confidence')}: ${word.confidence.toFixed(1)}%`}
                        >
                          <span className="text-gray-900 dark:text-white">{word.text}</span>
                          <span className={`text-xs font-mono ${getConfidenceColor(word.confidence)}`}>
                            {word.confidence.toFixed(0)}%
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-6 h-6" />
          {t('guide.title')}
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Features */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.features.title')}
            </h3>
            <ul className="space-y-2">
              {featureItems.map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
                  <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Tips */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.tips.title')}
            </h3>
            <ul className="space-y-2">
              {tipItems.map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
                  <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
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
