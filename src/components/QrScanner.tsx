'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Camera, Image as ImageIcon, Copy, Check, ExternalLink, Trash2, ScanLine, BookOpen, QrCode } from 'lucide-react'

// Type declaration for BarcodeDetector API
declare class BarcodeDetector {
  constructor(options?: { formats: string[] })
  detect(source: ImageBitmapSource): Promise<Array<{ rawValue: string; format: string; boundingBox: DOMRectReadOnly }>>
  static getSupportedFormats(): Promise<string[]>
}

interface ScanResult {
  content: string
  type: string
  timestamp: number
}

type TabType = 'camera' | 'image'

function detectContentType(text: string): string {
  if (/^https?:\/\//i.test(text)) return 'url'
  if (/^mailto:/i.test(text)) return 'email'
  if (/^tel:/i.test(text)) return 'phone'
  if (/^WIFI:/i.test(text)) return 'wifi'
  if (/^BEGIN:VCARD/i.test(text)) return 'vcard'
  return 'text'
}

export default function QrScanner() {
  const t = useTranslations('qrScanner')
  const [activeTab, setActiveTab] = useState<TabType>('camera')
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState<string | null>(null)
  const [resultType, setResultType] = useState<string>('text')
  const [history, setHistory] = useState<ScanResult[]>([])
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isBrowserSupported, setIsBrowserSupported] = useState(true)
  const [isDragging, setIsDragging] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationRef = useRef<number | null>(null)
  const detectorRef = useRef<BarcodeDetector | null>(null)

  // Load history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('qrScanHistory')
      if (saved) {
        setHistory(JSON.parse(saved))
      }
    } catch (error) {
      console.error('Failed to load history:', error)
    }
  }, [])

  // Check browser support
  useEffect(() => {
    if ('BarcodeDetector' in window) {
      setIsBrowserSupported(true)
      detectorRef.current = new BarcodeDetector({ formats: ['qr_code'] })
    } else {
      setIsBrowserSupported(false)
    }
  }, [])

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  const addToHistory = useCallback((content: string, type: string) => {
    const newResult: ScanResult = {
      content,
      type,
      timestamp: Date.now()
    }
    const newHistory = [newResult, ...history.filter(h => h.content !== content)].slice(0, 20)
    setHistory(newHistory)
    try {
      localStorage.setItem('qrScanHistory', JSON.stringify(newHistory))
    } catch (error) {
      console.error('Failed to save history:', error)
    }
  }, [history])

  const handleScanSuccess = useCallback((content: string) => {
    const type = detectContentType(content)
    setScanResult(content)
    setResultType(type)
    addToHistory(content, type)
    setIsScanning(false)

    // Stop camera
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
  }, [addToHistory])

  const scanFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !detectorRef.current || !isScanning) {
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationRef.current = requestAnimationFrame(scanFrame)
      return
    }

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    try {
      const barcodes = await detectorRef.current.detect(canvas)
      if (barcodes.length > 0) {
        handleScanSuccess(barcodes[0].rawValue)
        return
      }
    } catch (error) {
      console.error('Detection error:', error)
    }

    animationRef.current = requestAnimationFrame(scanFrame)
  }, [isScanning, handleScanSuccess])

  const startCamera = async () => {
    if (!isBrowserSupported) {
      setCameraError('unsupported')
      return
    }

    setCameraError(null)
    setScanResult(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setIsScanning(true)

        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play()
          scanFrame()
        }
      }
    } catch (error) {
      console.error('Camera error:', error)
      setCameraError('permission')
      setIsScanning(false)
    }
  }

  const stopCamera = () => {
    setIsScanning(false)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
  }

  const scanImageFile = async (file: File) => {
    if (!isBrowserSupported || !detectorRef.current || !canvasRef.current) {
      return
    }

    setScanResult(null)

    const img = new Image()
    const reader = new FileReader()

    reader.onload = (e) => {
      if (!e.target?.result) return
      img.src = e.target.result as string
    }

    img.onload = async () => {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)

      try {
        const barcodes = await detectorRef.current!.detect(canvas)
        if (barcodes.length > 0) {
          handleScanSuccess(barcodes[0].rawValue)
        } else {
          setScanResult('')
          setResultType('text')
        }
      } catch (error) {
        console.error('Image scan error:', error)
        setScanResult('')
      }
    }

    reader.readAsDataURL(file)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      scanImageFile(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      scanImageFile(file)
    }
  }

  const copyToClipboard = async (text: string, id: string) => {
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
  }

  const clearHistory = () => {
    setHistory([])
    try {
      localStorage.removeItem('qrScanHistory')
    } catch (error) {
      console.error('Failed to clear history:', error)
    }
  }

  const getTypeLabel = (type: string): string => {
    const typeMap: { [key: string]: string } = {
      url: t('types.url'),
      email: t('types.email'),
      phone: t('types.phone'),
      wifi: t('types.wifi'),
      vcard: t('types.vcard'),
      text: t('types.text')
    }
    return typeMap[type] || t('types.text')
  }

  const getTypeBadgeColor = (type: string): string => {
    const colorMap: { [key: string]: string } = {
      url: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      email: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      phone: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      wifi: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      vcard: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
      text: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    }
    return colorMap[type] || colorMap.text
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Browser Support Warning */}
      {!isBrowserSupported && (
        <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <QrCode className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100">
                브라우저 미지원
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                이 브라우저는 QR코드 스캔 기능을 지원하지 않습니다. Chrome, Edge, Safari 등 최신 브라우저를 사용해주세요.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Bar */}
      <div className="flex space-x-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => {
            setActiveTab('camera')
            stopCamera()
            setScanResult(null)
          }}
          className={`px-6 py-3 font-medium rounded-t-lg transition-colors ${
            activeTab === 'camera'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Camera className="w-5 h-5" />
            <span>{t('scanCamera')}</span>
          </div>
        </button>
        <button
          onClick={() => {
            setActiveTab('image')
            stopCamera()
            setScanResult(null)
          }}
          className={`px-6 py-3 font-medium rounded-t-lg transition-colors ${
            activeTab === 'image'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          <div className="flex items-center space-x-2">
            <ImageIcon className="w-5 h-5" />
            <span>{t('scanImage')}</span>
          </div>
        </button>
      </div>

      {/* Scanner Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        {activeTab === 'camera' ? (
          <div className="space-y-4">
            {/* Camera Preview */}
            <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Scanner Overlay */}
              {isScanning && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-64 h-64 border-4 border-blue-500 rounded-lg">
                    <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 animate-scan" />
                    <ScanLine className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 text-blue-500 animate-pulse" />
                  </div>
                </div>
              )}

              {/* Placeholder when not scanning */}
              {!isScanning && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Camera className="w-16 h-16 text-gray-500 mx-auto mb-2" />
                    <p className="text-gray-400">카메라를 시작하세요</p>
                  </div>
                </div>
              )}
            </div>

            {/* Camera Error */}
            {cameraError && (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-sm text-red-700 dark:text-red-300">
                  {cameraError === 'unsupported'
                    ? t('cameraError')
                    : t('cameraPermission')}
                </p>
              </div>
            )}

            {/* Camera Controls */}
            <div className="flex justify-center">
              {!isScanning ? (
                <button
                  onClick={startCamera}
                  disabled={!isBrowserSupported}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-6 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {t('startCamera')}
                </button>
              ) : (
                <button
                  onClick={stopCamera}
                  className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-6 py-3 font-medium transition-colors"
                >
                  {t('stopCamera')}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Image Upload Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                isDragging
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                  : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
              }`}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={!isBrowserSupported}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <ImageIcon className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('uploadImage')}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('dragDrop')}
              </p>
            </div>

            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}
      </div>

      {/* Scan Result */}
      {scanResult !== null && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {t('result')}
          </h2>

          {scanResult === '' ? (
            <div className="text-center py-8">
              <QrCode className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 dark:text-gray-400">{t('noQrFound')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Type Badge */}
              <div>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getTypeBadgeColor(resultType)}`}>
                  {getTypeLabel(resultType)}
                </span>
              </div>

              {/* Content */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <p className="text-sm font-mono text-gray-900 dark:text-white break-all whitespace-pre-wrap">
                  {scanResult}
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => copyToClipboard(scanResult, 'result')}
                  className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2 font-medium transition-colors"
                >
                  {copiedId === 'result' ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{t('copied')}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>{t('copy')}</span>
                    </>
                  )}
                </button>

                {resultType === 'url' && (
                  <a
                    href={scanResult}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 font-medium transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>{t('openLink')}</span>
                  </a>
                )}

                {resultType === 'email' && (
                  <a
                    href={scanResult}
                    className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white rounded-lg px-4 py-2 font-medium transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>이메일 열기</span>
                  </a>
                )}

                {resultType === 'phone' && (
                  <a
                    href={scanResult}
                    className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg px-4 py-2 font-medium transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>전화 걸기</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('history')}
            </h2>
            <button
              onClick={clearHistory}
              className="flex items-center space-x-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-sm font-medium">{t('clearHistory')}</span>
            </button>
          </div>

          <div className="space-y-3">
            {history.map((item, index) => (
              <div
                key={index}
                className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-850 transition-colors"
              >
                <div className="flex items-start justify-between space-x-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getTypeBadgeColor(item.type)}`}>
                        {getTypeLabel(item.type)}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(item.timestamp).toLocaleString('ko-KR')}
                      </span>
                    </div>
                    <p className="text-sm font-mono text-gray-900 dark:text-white break-all line-clamp-2">
                      {item.content}
                    </p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(item.content, `history-${index}`)}
                    className="flex-shrink-0 p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    {copiedId === `history-${index}` ? (
                      <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
          <BookOpen className="w-5 h-5 mr-2" />
          {t('guide.title')}
        </h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.howTo.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.howTo.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start space-x-2 text-gray-600 dark:text-gray-300">
                  <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.tips.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.tips.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start space-x-2 text-gray-600 dark:text-gray-300">
                  <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* CSS for scanner animation */}
      <style jsx>{`
        @keyframes scan {
          0% {
            top: 0;
          }
          50% {
            top: calc(100% - 4px);
          }
          100% {
            top: 0;
          }
        }
        .animate-scan {
          animation: scan 2s linear infinite;
        }
      `}</style>
    </div>
  )
}
