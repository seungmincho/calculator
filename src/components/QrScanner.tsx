'use client'

import { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/qrScanner'
import { Camera, Image as ImageIcon, Copy, Check, ExternalLink, Trash2, ScanLine, QrCode } from 'lucide-react'
import { glassCard, glassInset } from '@/lib/glass'
import QrBatchScanner from '@/components/QrBatchScanner'
import QrCopyRecovery from '@/components/QrCopyRecovery'
import { copyQrText } from '@/utils/qrClipboard'
import { QR_SCAN_HISTORY_KEY, readQrScanHistory, writeQrScanHistory, withQrHistoryLock, type QrHistoryRead, type QrHistoryError } from '@/utils/qrScanHistory'

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
  const [imageMode, setImageMode] = useState<'single' | 'batch'>('single')
  const [batchVisited, setBatchVisited] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState<string | null>(null)
  const [resultType, setResultType] = useState<string>('text')
  const [history, setHistory] = useState<ScanResult[]>([])
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isBrowserSupported, setIsBrowserSupported] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [historyError, setHistoryError] = useState<QrHistoryError | null>(null)
  const [copyRecovery, setCopyRecovery] = useState<{ id: string; text: string } | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationRef = useRef<number | null>(null)
  const detectorRef = useRef<BarcodeDetector | null>(null)
  const mounted = useRef(false), cameraGeneration = useRef(0), cameraRunning = useRef(false), copyGeneration = useRef(0), imageGeneration = useRef(0)
  const imageReader = useRef<FileReader | null>(null), imageElement = useRef<HTMLImageElement | null>(null)
  const historySnapshot = useRef<QrHistoryRead>({ ok: false, error: 'unavailable' })
  const refreshHistory = useCallback(() => {
    copyGeneration.current++; setCopiedId(null); setCopyRecovery(null)
    let result: QrHistoryRead
    try { result = readQrScanHistory(window.localStorage) } catch { result = { ok: false, error: 'unavailable' } }
    historySnapshot.current = result
    if (result.ok) { setHistory(result.items); setHistoryError(null) } else setHistoryError(result.error)
  }, [])

  // Load history from localStorage
  useEffect(() => {
    let active = true
    queueMicrotask(() => { if (active) refreshHistory() })
    const changed = (event: StorageEvent) => {
      if (event.key !== null && event.key !== QR_SCAN_HISTORY_KEY) return
      if (historySnapshot.current.ok && event.key !== null && historySnapshot.current.raw === event.newValue) return
      copyGeneration.current++; setCopiedId(null); setCopyRecovery(null)
      historySnapshot.current = { ok: false, error: 'conflict' }; setHistoryError('conflict')
    }
    window.addEventListener('storage', changed)
    return () => { active = false; window.removeEventListener('storage', changed) }
  }, [refreshHistory])

  // Check browser support
  useEffect(() => {
    let active = true
    void (async () => {
      try {
        if (!('BarcodeDetector' in window) || typeof BarcodeDetector.getSupportedFormats !== 'function' || !(await BarcodeDetector.getSupportedFormats()).includes('qr_code')) throw new Error('unsupported')
        const detector = new BarcodeDetector({ formats: ['qr_code'] })
        if (active) { detectorRef.current = detector; setIsBrowserSupported(true) }
      } catch { if (active) { detectorRef.current = null; setIsBrowserSupported(false) } }
    })()
    return () => { active = false }
  }, [])

  // Cleanup camera on unmount
  useLayoutEffect(() => {
    mounted.current = true
    return () => {
      // These are live cancellation counters, not captured DOM nodes.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      mounted.current = false; cameraGeneration.current++; cameraRunning.current = false; copyGeneration.current++; imageGeneration.current++
      imageReader.current?.abort(); if (imageElement.current) { imageElement.current.onload = null; imageElement.current.onerror = null; imageElement.current.src = '' }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  const addToHistory = useCallback(async (content: string, type: string) => {
    const previous = historySnapshot.current
    if (!previous.ok) { setHistoryError(previous.error); return }
    try {
      const result = await withQrHistoryLock(() => mounted.current ? writeQrScanHistory(previous, [{ content, type, timestamp: Date.now() }, ...previous.items.filter(item => item.content !== content)].slice(0, 20), window.localStorage) : null)
      if (!mounted.current || !result) return
      historySnapshot.current = result
      if (result.ok) { setHistory(result.items); setHistoryError(null) } else setHistoryError(result.error)
    } catch { if (mounted.current) setHistoryError('unavailable') }
  }, [])

  const handleScanSuccess = useCallback((content: string) => {
    copyGeneration.current++; setCopiedId(null); setCopyRecovery(null)
    const type = detectContentType(content)
    setScanResult(content)
    setResultType(type)
    void addToHistory(content, type)
    setIsScanning(false)
    cameraGeneration.current++; cameraRunning.current = false

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
    if (!videoRef.current || !canvasRef.current || !detectorRef.current || !cameraRunning.current) {
      return
    }

    const video = videoRef.current
    const generation = cameraGeneration.current
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
      if (!mounted.current || generation !== cameraGeneration.current || !cameraRunning.current) return
      if (barcodes.length > 0) {
        handleScanSuccess(barcodes[0].rawValue)
        return
      }
    } catch (error) {
      console.error('Detection error:', error)
    }

    if (mounted.current && generation === cameraGeneration.current && cameraRunning.current) animationRef.current = requestAnimationFrame(scanFrame)
  }, [handleScanSuccess])

  const startCamera = async () => {
    if (!isBrowserSupported) {
      setCameraError('unsupported')
      return
    }

    setCameraError(null)
    setScanResult(null)
    copyGeneration.current++; setCopiedId(null); setCopyRecovery(null)
    const request = ++cameraGeneration.current

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      if (!mounted.current || request !== cameraGeneration.current || !videoRef.current) { stream.getTracks().forEach(track => track.stop()); return }

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        cameraRunning.current = true
        setIsScanning(true)

        videoRef.current.onloadedmetadata = () => {
          if (request !== cameraGeneration.current || !cameraRunning.current) return
          void videoRef.current?.play().catch(() => { if (mounted.current && request === cameraGeneration.current) setCameraError('permission') })
          scanFrame()
        }
      }
    } catch (error) {
      if (!mounted.current || request !== cameraGeneration.current) return
      console.error('Camera error:', error)
      setCameraError('permission')
      setIsScanning(false)
    }
  }

  const stopCamera = () => {
    cameraGeneration.current++; cameraRunning.current = false
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

  const cancelSingleImage = () => {
    imageGeneration.current++; imageReader.current?.abort(); imageReader.current = null
    if (imageElement.current) { imageElement.current.onload = null; imageElement.current.onerror = null; imageElement.current.src = ''; imageElement.current = null }
    copyGeneration.current++; setCopiedId(null); setCopyRecovery(null)
  }
  const openBatch = () => { stopCamera(); cancelSingleImage(); setActiveTab('image'); setImageMode('batch'); setBatchVisited(true); setScanResult(null) }

  const scanImageFile = async (file: File) => {
    if (!isBrowserSupported || !detectorRef.current || !canvasRef.current) {
      return
    }

    setScanResult(null)
    cancelSingleImage()
    const request = imageGeneration.current
    const current = () => mounted.current && request === imageGeneration.current

    const img = new Image()
    const reader = new FileReader()
    imageReader.current = reader; imageElement.current = img

    reader.onload = (e) => {
      if (!current() || !e.target?.result) return
      img.src = e.target.result as string
    }

    img.onload = async () => {
      if (!current()) return
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)

      try {
        const barcodes = await detectorRef.current!.detect(canvas)
        if (!current()) return
        if (barcodes.length > 0) {
          handleScanSuccess(barcodes[0].rawValue)
        } else {
          setScanResult('')
          setResultType('text')
        }
      } catch (error) {
        if (!current()) return
        console.error('Image scan error:', error)
        setScanResult('')
      }
    }
    reader.onerror = img.onerror = () => { if (current()) setScanResult('') }

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
    const request = ++copyGeneration.current, current = () => mounted.current && request === copyGeneration.current
    setCopiedId(null); setCopyRecovery(null)
    const copied = await copyQrText(text, current)
    if (!current() || copied === null) return
    if (copied) { setCopiedId(id); setTimeout(() => { if (current()) setCopiedId(null) }, 2000) }
    else setCopyRecovery({ id, text })
  }

  const clearHistory = async () => {
    const previous = historySnapshot.current
    try {
      const result = await withQrHistoryLock(() => mounted.current ? writeQrScanHistory(previous, [], window.localStorage) : null)
      if (!mounted.current || !result) return
      historySnapshot.current = result
      if (result.ok) { setHistory([]); setHistoryError(null); copyGeneration.current++; setCopyRecovery(null); setCopiedId(null) } else setHistoryError(result.error)
    } catch { if (mounted.current) setHistoryError('unavailable') }
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
      url: 'bg-primary-soft text-primary',
      email: 'bg-primary-soft text-primary',
      phone: 'bg-primary-soft text-primary',
      wifi: 'bg-primary-soft text-primary',
      vcard: 'bg-primary-soft text-primary',
      text: 'bg-soft text-sub'
    }
    return colorMap[type] || colorMap.text
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      {/* Browser Support Warning */}
      {!isBrowserSupported && (
        <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <QrCode className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                {t('unsupported.title')}
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">{t('batch.nativeUnavailable')}</p>
              <button type="button" onClick={openBatch} className="ui-btn-soft mt-3 min-h-11 px-3 py-2 text-sm">{t('batch.open')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Tab Bar */}
      <div className="flex space-x-2 border-b border-line">
        <button
          onClick={() => {
            setActiveTab('camera')
            stopCamera()
            cancelSingleImage()
            setScanResult(null)
          }}
          className={`px-6 py-3 font-medium rounded-t-lg transition-colors ${
            activeTab === 'camera'
              ? 'bg-primary text-white'
              : 'bg-soft text-body hover:bg-subtle'
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
            cancelSingleImage()
            setScanResult(null)
          }}
          className={`px-6 py-3 font-medium rounded-t-lg transition-colors ${
            activeTab === 'image'
              ? 'bg-primary text-white'
              : 'bg-soft text-body hover:bg-subtle'
          }`}
        >
          <div className="flex items-center space-x-2">
            <ImageIcon className="w-5 h-5" />
            <span>{t('scanImage')}</span>
          </div>
        </button>
      </div>

      {/* Scanner Section */}
      <div className={`${glassCard} ${glassInset} p-6`}>
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
                  <div className="relative w-64 h-64 border-4 border-primary rounded-lg">
                    <div className="absolute top-0 left-0 w-full h-1 bg-primary animate-scan" />
                    <ScanLine className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 text-primary animate-pulse" />
                  </div>
                </div>
              )}

              {/* Placeholder when not scanning */}
              {!isScanning && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Camera className="w-16 h-16 text-gray-500 mx-auto mb-2" />
                    <p className="text-gray-400">{t('cameraHint')}</p>
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
                  className="ui-btn rounded-lg px-6 py-3 font-medium disabled:cursor-not-allowed transition-all"
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
            <div role="group" aria-label={t('batch.mode')} className="flex gap-2">
              <button type="button" aria-pressed={imageMode === 'single'} onClick={() => { cancelSingleImage(); setImageMode('single'); setScanResult(null) }} className={`min-h-11 flex-1 rounded-xl px-3 py-2 text-sm font-medium ${imageMode === 'single' ? 'bg-primary text-white' : 'bg-soft text-body'}`}>{t('batch.single')}</button>
              <button type="button" aria-pressed={imageMode === 'batch'} onClick={openBatch} className={`min-h-11 flex-1 rounded-xl px-3 py-2 text-sm font-medium ${imageMode === 'batch' ? 'bg-primary text-white' : 'bg-soft text-body'}`}>{t('batch.multipleMode')}</button>
            </div>
            {imageMode === 'single' && <>
            {/* Image Upload Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                isDragging
                  ? 'border-primary bg-primary-soft'
                  : 'border-line-strong hover:border-primary'
              }`}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={!isBrowserSupported}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <ImageIcon className="w-16 h-16 text-faint mx-auto mb-4" />
              <p className="text-lg font-medium text-body mb-2">
                {t('uploadImage')}
              </p>
              <p className="text-sm text-muted">
                {t('dragDrop')}
              </p>
            </div>

            <canvas ref={canvasRef} className="hidden" />
            </>}
          </div>
        )}
      </div>
      {batchVisited && <div hidden={activeTab !== 'image' || imageMode !== 'batch'} className="ui-card min-w-0 p-4 sm:p-6"><QrBatchScanner active={activeTab === 'image' && imageMode === 'batch'} /></div>}

      {/* Scan Result */}
      {scanResult !== null && (
        <div className={`${glassCard} ${glassInset} p-6`}>
          <h2 className="text-xl font-semibold text-fg mb-4">
            {t('result')}
          </h2>

          {scanResult === '' ? (
            <div className="text-center py-8">
              <QrCode className="w-12 h-12 text-faint mx-auto mb-2" />
              <p className="text-muted">{t('noQrFound')}</p>
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
              <div className="bg-subtle rounded-lg p-4">
                <p className="text-sm font-mono text-fg break-all whitespace-pre-wrap">
                  {scanResult}
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => copyToClipboard(scanResult, 'result')}
                  className="flex items-center space-x-2 bg-soft hover:bg-subtle text-body rounded-lg px-4 py-2 font-medium transition-colors"
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
                    className="ui-btn flex items-center rounded-lg px-4 py-2 font-medium transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>{t('openLink')}</span>
                  </a>
                )}

                {resultType === 'email' && (
                  <a
                    href={scanResult}
                    className="ui-btn flex items-center rounded-lg px-4 py-2 font-medium transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>{t('openEmail')}</span>
                  </a>
                )}

                {resultType === 'phone' && (
                  <a
                    href={scanResult}
                    className="ui-btn flex items-center rounded-lg px-4 py-2 font-medium transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>{t('callPhone')}</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {copyRecovery && <QrCopyRecovery text={copyRecovery.text} onRetry={() => { void copyToClipboard(copyRecovery.text, copyRecovery.id) }} onClose={() => { copyGeneration.current++; setCopyRecovery(null) }} />}
      {historyError && <div className="ui-card space-y-3 p-4"><p role="alert" className="text-sm text-body">{t(`batch.historyErrors.${historyError}`)}</p><button type="button" onClick={refreshHistory} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('batch.refreshHistory')}</button></div>}
      {/* History */}
      {history.length > 0 && (
        <div className={`${glassCard} ${glassInset} p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-fg">
              {t('history')}
            </h2>
            <button
              onClick={() => { void clearHistory() }}
              className="flex min-h-11 items-center space-x-2 text-body transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-sm font-medium">{t('clearHistory')}</span>
            </button>
          </div>

          <div className="space-y-3">
            {history.map((item, index) => (
              <div
                key={index}
                className="bg-subtle rounded-lg p-4 hover:bg-soft transition-colors"
              >
                <div className="flex items-start justify-between space-x-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getTypeBadgeColor(item.type)}`}>
                        {getTypeLabel(item.type)}
                      </span>
                      <span className="text-xs text-muted">
                        {new Date(item.timestamp).toLocaleString('ko-KR')}
                      </span>
                    </div>
                    <p className="text-sm font-mono text-fg break-all line-clamp-2">
                      {item.content}
                    </p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(item.content, `history-${index}`)}
                    aria-label={`${t('copy')} ${index + 1}`}
                    className="min-h-11 min-w-11 flex-shrink-0 p-2 rounded-lg bg-track hover:bg-line-strong transition-colors"
                  >
                    {copiedId === `history-${index}` ? (
                      <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-sub" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Guide Section */}
      <div className={`${glassCard} ${glassInset} p-6`}>
        <h2 className="text-xl font-semibold text-fg mb-6 flex items-center">
          {t('guide.title')}
        </h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-fg mb-3">
              {t('guide.howTo.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.howTo.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start space-x-2 text-sub">
                  <span className="text-primary mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-fg mb-3">
              {t('guide.tips.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.tips.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start space-x-2 text-sub">
                  <span className="text-primary mt-1">•</span>
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
