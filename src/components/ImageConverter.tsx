'use client'

import { useState, useCallback, useRef, DragEvent } from 'react'
import { useTranslations } from 'next-intl'
import { Image as ImageIcon, Upload, Download, RefreshCw, BookOpen } from 'lucide-react'

type OutputFormat = 'jpeg' | 'png' | 'webp'

interface ConvertedImage {
  id: string
  originalFile: File
  originalUrl: string
  originalSize: number
  originalWidth: number
  originalHeight: number
  convertedUrl: string
  convertedSize: number
  format: OutputFormat
  quality: number
}

export default function ImageConverter() {
  const t = useTranslations('imageConverter')
  const [images, setImages] = useState<ConvertedImage[]>([])
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('jpeg')
  const [quality, setQuality] = useState(85)
  const [batchMode, setBatchMode] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
  }

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const fileArray = Array.from(files)

    for (const file of fileArray) {
      if (!file.type.startsWith('image/')) continue

      const img = new Image()
      const originalUrl = URL.createObjectURL(file)

      img.onload = async () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.drawImage(img, 0, 0)

        canvas.toBlob(
          (blob) => {
            if (!blob) return

            const convertedUrl = URL.createObjectURL(blob)
            const convertedImage: ConvertedImage = {
              id: `${Date.now()}-${Math.random()}`,
              originalFile: file,
              originalUrl,
              originalSize: file.size,
              originalWidth: img.naturalWidth,
              originalHeight: img.naturalHeight,
              convertedUrl,
              convertedSize: blob.size,
              format: outputFormat,
              quality
            }

            setImages(prev => batchMode ? [...prev, convertedImage] : [convertedImage])
          },
          `image/${outputFormat}`,
          quality / 100
        )
      }

      img.src = originalUrl
    }
  }, [outputFormat, quality, batchMode])

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

  const downloadImage = (image: ConvertedImage) => {
    const a = document.createElement('a')
    a.href = image.convertedUrl
    const originalName = image.originalFile.name.replace(/\.[^/.]+$/, '')
    a.download = `${originalName}.${image.format}`
    a.click()
  }

  const downloadAll = () => {
    images.forEach(image => downloadImage(image))
  }

  const handleReset = () => {
    images.forEach(image => {
      URL.revokeObjectURL(image.originalUrl)
      URL.revokeObjectURL(image.convertedUrl)
    })
    setImages([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleConvert = () => {
    if (fileInputRef.current?.files) {
      handleFiles(fileInputRef.current.files)
    }
  }

  const calculateReduction = (original: number, converted: number): string => {
    const diff = converted - original
    const percent = (diff / original) * 100
    if (percent > 0) {
      return `+${formatFileSize(diff)} (+${percent.toFixed(1)}%)`
    } else {
      return `${formatFileSize(diff)} (${percent.toFixed(1)}%)`
    }
  }

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
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('uploadLabel')}
            </h2>

            {/* Batch Mode Toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setBatchMode(!batchMode)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
              >
                {batchMode ? t('batchMode') : t('singleMode')}
              </button>
            </div>

            {/* Upload Area */}
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
              <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{t('dragDrop')}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500">{t('supportedFormats')}</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple={batchMode}
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>

            {/* Output Format */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('outputFormat')}
              </label>
              <select
                value={outputFormat}
                onChange={(e) => setOutputFormat(e.target.value as OutputFormat)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="jpeg">JPEG</option>
                <option value="png">PNG</option>
                <option value="webp">WebP</option>
              </select>
            </div>

            {/* Quality Slider (only for JPEG/WebP) */}
            {(outputFormat === 'jpeg' || outputFormat === 'webp') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('quality')}: {t('qualityPercent', { value: quality })}
                </label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                onClick={handleConvert}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors flex items-center justify-center gap-2"
              >
                <ImageIcon className="w-5 h-5" />
                {t('convert')}
              </button>
              <button
                onClick={handleReset}
                disabled={images.length === 0}
                className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-3 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                {t('reset')}
              </button>
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('preview')}
              </h2>
              {images.length > 1 && (
                <button
                  onClick={downloadAll}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-2 font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  {t('downloadAll')}
                </button>
              )}
            </div>

            {images.length === 0 ? (
              <div className="text-center py-12">
                <ImageIcon className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <p className="text-gray-500 dark:text-gray-400">{t('dragDrop')}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {images.map((image) => (
                  <div key={image.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
                    {/* Image Comparison */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('original')}
                        </p>
                        <img
                          src={image.originalUrl}
                          alt="Original"
                          className="w-full h-auto rounded-lg border border-gray-200 dark:border-gray-700"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('converted')}
                        </p>
                        <img
                          src={image.convertedUrl}
                          alt="Converted"
                          className="w-full h-auto rounded-lg border border-gray-200 dark:border-gray-700"
                        />
                      </div>
                    </div>

                    {/* File Info */}
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">{t('fileInfo.name')}:</span>
                        <span className="text-gray-900 dark:text-white font-medium">
                          {image.originalFile.name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">{t('fileInfo.format')}:</span>
                        <span className="text-gray-900 dark:text-white font-medium">
                          {image.originalFile.type.split('/')[1].toUpperCase()} → {image.format.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">{t('fileInfo.dimensions')}:</span>
                        <span className="text-gray-900 dark:text-white font-medium">
                          {image.originalWidth} × {image.originalHeight}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">{t('fileInfo.size')}:</span>
                        <span className="text-gray-900 dark:text-white font-medium">
                          {formatFileSize(image.originalSize)} → {formatFileSize(image.convertedSize)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">{t('fileInfo.reduction')}:</span>
                        <span className={`font-medium ${
                          image.convertedSize < image.originalSize
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {calculateReduction(image.originalSize, image.convertedSize)}
                        </span>
                      </div>
                    </div>

                    {/* Download Button */}
                    <button
                      onClick={() => downloadImage(image)}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-2 font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      {t('download')}
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
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-6 h-6" />
          {t('guide.title')}
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Format Features */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.formats.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.formats.items') as string[]).map((item, index) => (
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
              {(t.raw('guide.tips.items') as string[]).map((item, index) => (
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
