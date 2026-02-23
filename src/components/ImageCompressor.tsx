'use client'

import { useState, useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Upload, Download, Image as ImageIcon, Trash2, Settings, RefreshCw, BookOpen, Check } from 'lucide-react'

// ── Types ──

type OutputFormat = 'original' | 'jpeg' | 'png' | 'webp'

interface CompressedImage {
  id: string
  file: File
  originalSize: number
  compressedSize: number
  compressedBlob: Blob | null
  previewUrl: string
  compressedPreviewUrl: string | null
  status: 'pending' | 'processing' | 'done' | 'error'
  error?: string
}

interface CompressionSettings {
  quality: number
  maxWidth: number
  maxHeight: number
  outputFormat: OutputFormat
}

// ── Helpers ──

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

function getMimeType(format: OutputFormat, originalType: string): string {
  switch (format) {
    case 'jpeg': return 'image/jpeg'
    case 'png': return 'image/png'
    case 'webp': return 'image/webp'
    case 'original':
    default:
      // Normalize mime type
      if (originalType === 'image/jpg') return 'image/jpeg'
      return originalType || 'image/jpeg'
  }
}

function getFileExtension(mimeType: string): string {
  switch (mimeType) {
    case 'image/jpeg': return '.jpg'
    case 'image/png': return '.png'
    case 'image/webp': return '.webp'
    default: return '.jpg'
  }
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// ── Component ──

export default function ImageCompressor() {
  const t = useTranslations('imageCompressor')

  // State
  const [images, setImages] = useState<CompressedImage[]>([])
  const [settings, setSettings] = useState<CompressionSettings>({
    quality: 80,
    maxWidth: 0,
    maxHeight: 0,
    outputFormat: 'original',
  })
  const [isDragging, setIsDragging] = useState(false)
  const [isCompressing, setIsCompressing] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── File handling ──

  const addFiles = useCallback((fileList: FileList | File[]) => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    const maxSize = 50 * 1024 * 1024 // 50MB

    const newImages: CompressedImage[] = []

    Array.from(fileList).forEach((file) => {
      if (!validTypes.includes(file.type)) return
      if (file.size > maxSize) return

      const previewUrl = URL.createObjectURL(file)
      newImages.push({
        id: generateId(),
        file,
        originalSize: file.size,
        compressedSize: 0,
        compressedBlob: null,
        previewUrl,
        compressedPreviewUrl: null,
        status: 'pending',
      })
    })

    if (newImages.length > 0) {
      setImages((prev) => [...prev, ...newImages])
    }
  }, [])

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        addFiles(e.target.files)
        // Reset input so same files can be re-selected
        e.target.value = ''
      }
    },
    [addFiles]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files)
      }
    },
    [addFiles]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  // ── Compression ──

  const compressImage = useCallback(
    (image: CompressedImage, compressionSettings: CompressionSettings): Promise<{ blob: Blob; url: string }> => {
      return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            if (!ctx) {
              reject(new Error('Canvas context not available'))
              return
            }

            let { width, height } = img

            // Apply max dimension constraints
            const maxW = compressionSettings.maxWidth
            const maxH = compressionSettings.maxHeight

            if (maxW > 0 && width > maxW) {
              height = Math.round((height * maxW) / width)
              width = maxW
            }
            if (maxH > 0 && height > maxH) {
              width = Math.round((width * maxH) / height)
              height = maxH
            }

            canvas.width = width
            canvas.height = height

            // For JPEG output, fill white background (transparent becomes black otherwise)
            const mimeType = getMimeType(compressionSettings.outputFormat, image.file.type)
            if (mimeType === 'image/jpeg') {
              ctx.fillStyle = '#ffffff'
              ctx.fillRect(0, 0, width, height)
            }

            ctx.drawImage(img, 0, 0, width, height)

            const quality = compressionSettings.quality / 100

            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error('Compression failed'))
                  return
                }
                const url = URL.createObjectURL(blob)
                resolve({ blob, url })
              },
              mimeType,
              // PNG ignores quality param, but we pass it anyway
              mimeType === 'image/png' ? undefined : quality
            )
          } catch (err) {
            reject(err)
          }
        }
        img.onerror = () => reject(new Error('Failed to load image'))
        img.src = image.previewUrl
      })
    },
    []
  )

  const compressSingle = useCallback(
    async (imageId: string) => {
      setImages((prev) =>
        prev.map((img) =>
          img.id === imageId ? { ...img, status: 'processing' as const, compressedBlob: null, compressedPreviewUrl: null } : img
        )
      )

      const image = images.find((img) => img.id === imageId)
      if (!image) return

      try {
        const { blob, url } = await compressImage(image, settings)
        setImages((prev) =>
          prev.map((img) =>
            img.id === imageId
              ? { ...img, status: 'done' as const, compressedSize: blob.size, compressedBlob: blob, compressedPreviewUrl: url }
              : img
          )
        )
      } catch {
        setImages((prev) =>
          prev.map((img) =>
            img.id === imageId ? { ...img, status: 'error' as const, error: 'Compression failed' } : img
          )
        )
      }
    },
    [images, settings, compressImage]
  )

  const compressAll = useCallback(async () => {
    if (images.length === 0) return
    setIsCompressing(true)

    // Mark all as processing
    setImages((prev) =>
      prev.map((img) => ({
        ...img,
        status: 'processing' as const,
        compressedBlob: null,
        compressedPreviewUrl: null,
        compressedSize: 0,
      }))
    )

    // Process sequentially to avoid memory issues
    for (const image of images) {
      try {
        const { blob, url } = await compressImage(image, settings)
        setImages((prev) =>
          prev.map((img) =>
            img.id === image.id
              ? { ...img, status: 'done' as const, compressedSize: blob.size, compressedBlob: blob, compressedPreviewUrl: url }
              : img
          )
        )
      } catch {
        setImages((prev) =>
          prev.map((img) =>
            img.id === image.id ? { ...img, status: 'error' as const, error: 'Compression failed' } : img
          )
        )
      }
    }

    setIsCompressing(false)
  }, [images, settings, compressImage])

  // ── Download ──

  const downloadSingle = useCallback(
    (image: CompressedImage) => {
      if (!image.compressedBlob) return

      const mimeType = getMimeType(settings.outputFormat, image.file.type)
      const ext = getFileExtension(mimeType)
      const baseName = image.file.name.replace(/\.[^/.]+$/, '')
      const fileName = `${baseName}_compressed${ext}`

      const url = URL.createObjectURL(image.compressedBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    },
    [settings.outputFormat]
  )

  const downloadAll = useCallback(() => {
    const doneImages = images.filter((img) => img.status === 'done' && img.compressedBlob)
    doneImages.forEach((image, index) => {
      // Stagger downloads to prevent browser blocking
      setTimeout(() => downloadSingle(image), index * 200)
    })
  }, [images, downloadSingle])

  // ── Remove ──

  const removeImage = useCallback((imageId: string) => {
    setImages((prev) => {
      const image = prev.find((img) => img.id === imageId)
      if (image) {
        URL.revokeObjectURL(image.previewUrl)
        if (image.compressedPreviewUrl) URL.revokeObjectURL(image.compressedPreviewUrl)
      }
      return prev.filter((img) => img.id !== imageId)
    })
  }, [])

  const removeAll = useCallback(() => {
    images.forEach((image) => {
      URL.revokeObjectURL(image.previewUrl)
      if (image.compressedPreviewUrl) URL.revokeObjectURL(image.compressedPreviewUrl)
    })
    setImages([])
  }, [images])

  const resetAll = useCallback(() => {
    removeAll()
    setSettings({
      quality: 80,
      maxWidth: 0,
      maxHeight: 0,
      outputFormat: 'original',
    })
  }, [removeAll])

  // ── Summary stats ──

  const totalOriginal = images.reduce((sum, img) => sum + img.originalSize, 0)
  const totalCompressed = images
    .filter((img) => img.status === 'done')
    .reduce((sum, img) => sum + img.compressedSize, 0)
  const doneCount = images.filter((img) => img.status === 'done').length
  const processingCount = images.filter((img) => img.status === 'processing').length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: Settings panel */}
        <div className="lg:col-span-1 space-y-6">
          {/* Upload area */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                  : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  fileInputRef.current?.click()
                }
              }}
              aria-label={t('dropzone')}
            >
              <Upload className="mx-auto mb-3 text-gray-400 dark:text-gray-500" size={40} />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('dropzone')}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('dropzoneHint')}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('maxFileSize')}</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={handleFileInputChange}
            />
          </div>

          {/* Compression settings */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Settings size={18} />
              {t('settings')}
            </h2>

            {/* Quality slider */}
            <div>
              <label className="flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <span>{t('quality')}</span>
                <span className="text-blue-600 dark:text-blue-400 font-semibold">{settings.quality}%</span>
              </label>
              <input
                type="range"
                min={1}
                max={100}
                value={settings.quality}
                onChange={(e) => setSettings((s) => ({ ...s, quality: Number(e.target.value) }))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1">
                <span>{t('qualityLow')}</span>
                <span>{t('qualityHigh')}</span>
              </div>
            </div>

            {/* Output format */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('format')}
              </label>
              <select
                value={settings.outputFormat}
                onChange={(e) => setSettings((s) => ({ ...s, outputFormat: e.target.value as OutputFormat }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="original">{t('formatOriginal')}</option>
                <option value="jpeg">JPEG</option>
                <option value="png">PNG</option>
                <option value="webp">WebP</option>
              </select>
            </div>

            {/* Max width */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('maxWidth')}
              </label>
              <input
                type="number"
                min={0}
                value={settings.maxWidth || ''}
                placeholder="0 = no limit"
                onChange={(e) => setSettings((s) => ({ ...s, maxWidth: Number(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Max height */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('maxHeight')}
              </label>
              <input
                type="number"
                min={0}
                value={settings.maxHeight || ''}
                placeholder="0 = no limit"
                onChange={(e) => setSettings((s) => ({ ...s, maxHeight: Number(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Action buttons */}
            <div className="space-y-3 pt-2">
              <button
                onClick={compressAll}
                disabled={images.length === 0 || isCompressing}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isCompressing ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    {t('processing')}
                  </>
                ) : (
                  <>
                    <ImageIcon size={18} />
                    {t('compressAll')}
                  </>
                )}
              </button>

              {doneCount > 0 && (
                <button
                  onClick={downloadAll}
                  className="w-full bg-green-600 hover:bg-green-700 text-white rounded-lg px-4 py-3 font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Download size={18} />
                  {t('downloadAll')} ({doneCount})
                </button>
              )}

              {images.length > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={removeAll}
                    className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                  >
                    {t('removeAll')}
                  </button>
                  <button
                    onClick={resetAll}
                    className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-3 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1"
                  >
                    <RefreshCw size={14} />
                    {t('reset')}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Summary stats */}
          {images.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('summary')}</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('totalImages')}</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{images.length}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('originalSize')}</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{formatFileSize(totalOriginal)}</p>
                </div>
                {doneCount > 0 && (
                  <>
                    <div className="bg-green-50 dark:bg-green-950 rounded-lg p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t('compressedSize')}</p>
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">{formatFileSize(totalCompressed)}</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t('savings')}</p>
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {totalOriginal > 0 ? `${Math.round(((totalOriginal - totalCompressed) / totalOriginal) * 100)}%` : '0%'}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Image list */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            {images.length === 0 ? (
              <div className="text-center py-16">
                <ImageIcon className="mx-auto mb-4 text-gray-300 dark:text-gray-600" size={64} />
                <p className="text-gray-500 dark:text-gray-400">{t('noImages')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Progress indicator */}
                {processingCount > 0 && (
                  <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 rounded-lg p-3">
                    <RefreshCw size={16} className="animate-spin" />
                    {t('processing')} ({processingCount}/{images.length})
                  </div>
                )}

                {/* Image cards */}
                {images.map((image) => (
                  <div
                    key={image.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row gap-4">
                      {/* Thumbnail */}
                      <div className="shrink-0">
                        <div className="w-full sm:w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={image.compressedPreviewUrl || image.previewUrl}
                            alt={image.file.name}
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {image.file.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {t('formatLabel')}: {image.file.type.split('/')[1]?.toUpperCase() || 'N/A'}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            {image.status === 'pending' && (
                              <button
                                onClick={() => compressSingle(image.id)}
                                className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-lg transition-colors"
                                title={t('compress')}
                              >
                                <ImageIcon size={16} />
                              </button>
                            )}
                            {image.status === 'done' && image.compressedBlob && (
                              <button
                                onClick={() => downloadSingle(image)}
                                className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950 rounded-lg transition-colors"
                                title={t('download')}
                              >
                                <Download size={16} />
                              </button>
                            )}
                            {image.status === 'processing' && (
                              <RefreshCw size={16} className="animate-spin text-blue-500" />
                            )}
                            <button
                              onClick={() => removeImage(image.id)}
                              className="p-1.5 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
                              title={t('remove')}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        {/* Size comparison */}
                        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                            <p className="text-gray-500 dark:text-gray-400">{t('originalSize')}</p>
                            <p className="font-semibold text-gray-900 dark:text-white">{formatFileSize(image.originalSize)}</p>
                          </div>
                          <div
                            className={`rounded-lg p-2 ${
                              image.status === 'done'
                                ? 'bg-green-50 dark:bg-green-950'
                                : 'bg-gray-50 dark:bg-gray-700'
                            }`}
                          >
                            <p className="text-gray-500 dark:text-gray-400">{t('compressedSize')}</p>
                            <p
                              className={`font-semibold ${
                                image.status === 'done'
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-gray-400 dark:text-gray-500'
                              }`}
                            >
                              {image.status === 'done' ? formatFileSize(image.compressedSize) : '-'}
                            </p>
                          </div>
                          <div
                            className={`rounded-lg p-2 ${
                              image.status === 'done'
                                ? 'bg-blue-50 dark:bg-blue-950'
                                : 'bg-gray-50 dark:bg-gray-700'
                            }`}
                          >
                            <p className="text-gray-500 dark:text-gray-400">{t('compressionRatio')}</p>
                            <p
                              className={`font-semibold ${
                                image.status === 'done'
                                  ? 'text-blue-600 dark:text-blue-400'
                                  : 'text-gray-400 dark:text-gray-500'
                              }`}
                            >
                              {image.status === 'done' && image.originalSize > 0 ? (
                                <>
                                  {image.compressedSize < image.originalSize ? (
                                    <span className="flex items-center gap-0.5">
                                      <Check size={12} />
                                      -{Math.round(((image.originalSize - image.compressedSize) / image.originalSize) * 100)}%
                                    </span>
                                  ) : (
                                    `+${Math.round(((image.compressedSize - image.originalSize) / image.originalSize) * 100)}%`
                                  )}
                                </>
                              ) : (
                                '-'
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Error message */}
                        {image.status === 'error' && (
                          <p className="mt-2 text-xs text-red-500 dark:text-red-400">
                            {image.error || 'Unknown error'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Guide section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen size={20} />
          {t('guide.title')}
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('guide.features.title')}</h3>
            <ul className="space-y-2">
              {(t.raw('guide.features.items') as string[]).map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-blue-500 mt-0.5 shrink-0">*</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('guide.formats.title')}</h3>
            <ul className="space-y-2">
              {(t.raw('guide.formats.items') as string[]).map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-purple-500 mt-0.5 shrink-0">*</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('guide.tips.title')}</h3>
            <ul className="space-y-2">
              {(t.raw('guide.tips.items') as string[]).map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-green-500 mt-0.5 shrink-0">*</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
