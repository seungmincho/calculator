'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Download, RotateCcw, Upload, Type, Image as ImageIcon, BookOpen } from 'lucide-react'

type WatermarkType = 'text' | 'image'
type Position = 'topLeft' | 'topCenter' | 'topRight' | 'middleLeft' | 'center' | 'middleRight' | 'bottomLeft' | 'bottomCenter' | 'bottomRight'
type FontFamily = 'sans-serif' | 'serif' | 'monospace'

export default function ImageWatermark() {
  const t = useTranslations('imageWatermark')

  // Source image
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Watermark settings
  const [watermarkType, setWatermarkType] = useState<WatermarkType>('text')
  const [text, setText] = useState('Sample Watermark')
  const [fontSize, setFontSize] = useState(48)
  const [fontFamily, setFontFamily] = useState<FontFamily>('sans-serif')
  const [fontColor, setFontColor] = useState('#ffffff')
  const [bold, setBold] = useState(false)
  const [watermarkImage, setWatermarkImage] = useState<HTMLImageElement | null>(null)
  const [watermarkSize, setWatermarkSize] = useState(20) // percentage of source image width

  // Common options
  const [position, setPosition] = useState<Position>('bottomRight')
  const [opacity, setOpacity] = useState(50)
  const [rotation, setRotation] = useState(0)
  const [tileMode, setTileMode] = useState(false)
  const [margin, setMargin] = useState(20)

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const watermarkInputRef = useRef<HTMLInputElement>(null)

  const positions: Position[] = [
    'topLeft', 'topCenter', 'topRight',
    'middleLeft', 'center', 'middleRight',
    'bottomLeft', 'bottomCenter', 'bottomRight',
  ]

  // Calculate watermark position coordinates
  const getPositionCoords = useCallback((
    pos: Position,
    canvasW: number,
    canvasH: number,
    wmW: number,
    wmH: number,
    marginPx: number
  ): { x: number; y: number } => {
    const positions: Record<Position, { x: number; y: number }> = {
      topLeft: { x: marginPx + wmW / 2, y: marginPx + wmH / 2 },
      topCenter: { x: canvasW / 2, y: marginPx + wmH / 2 },
      topRight: { x: canvasW - marginPx - wmW / 2, y: marginPx + wmH / 2 },
      middleLeft: { x: marginPx + wmW / 2, y: canvasH / 2 },
      center: { x: canvasW / 2, y: canvasH / 2 },
      middleRight: { x: canvasW - marginPx - wmW / 2, y: canvasH / 2 },
      bottomLeft: { x: marginPx + wmW / 2, y: canvasH - marginPx - wmH / 2 },
      bottomCenter: { x: canvasW / 2, y: canvasH - marginPx - wmH / 2 },
      bottomRight: { x: canvasW - marginPx - wmW / 2, y: canvasH - marginPx - wmH / 2 },
    }
    return positions[pos]
  }, [])

  // Draw watermark on a canvas context
  const drawWatermark = useCallback((
    ctx: CanvasRenderingContext2D,
    canvasW: number,
    canvasH: number,
    scaleFactor: number
  ) => {
    ctx.globalAlpha = opacity / 100

    const scaledFontSize = fontSize * scaleFactor
    const scaledMargin = margin * scaleFactor
    const rotationRad = (rotation * Math.PI) / 180

    if (watermarkType === 'text' && text.trim()) {
      const fontWeight = bold ? 'bold ' : ''
      ctx.font = `${fontWeight}${scaledFontSize}px ${fontFamily}`
      ctx.fillStyle = fontColor
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      const metrics = ctx.measureText(text)
      const textWidth = metrics.width
      const textHeight = scaledFontSize

      if (tileMode) {
        // Tile mode: repeat watermark across entire image
        const spacingX = textWidth + scaledMargin * 2
        const spacingY = textHeight + scaledMargin * 2
        // Extend range to cover rotated area
        const diagonal = Math.sqrt(canvasW * canvasW + canvasH * canvasH)

        ctx.save()
        ctx.translate(canvasW / 2, canvasH / 2)
        ctx.rotate(rotationRad)

        for (let y = -diagonal; y < diagonal; y += spacingY) {
          for (let x = -diagonal; x < diagonal; x += spacingX) {
            ctx.fillText(text, x, y)
          }
        }
        ctx.restore()
      } else {
        // Single watermark at specified position
        const coords = getPositionCoords(position, canvasW, canvasH, textWidth, textHeight, scaledMargin)
        ctx.save()
        ctx.translate(coords.x, coords.y)
        ctx.rotate(rotationRad)
        ctx.fillText(text, 0, 0)
        ctx.restore()
      }
    } else if (watermarkType === 'image' && watermarkImage) {
      const wmW = (canvasW * watermarkSize) / 100
      const wmH = (wmW * watermarkImage.height) / watermarkImage.width

      if (tileMode) {
        const spacingX = wmW + scaledMargin * 2
        const spacingY = wmH + scaledMargin * 2
        const diagonal = Math.sqrt(canvasW * canvasW + canvasH * canvasH)

        ctx.save()
        ctx.translate(canvasW / 2, canvasH / 2)
        ctx.rotate(rotationRad)

        for (let y = -diagonal; y < diagonal; y += spacingY) {
          for (let x = -diagonal; x < diagonal; x += spacingX) {
            ctx.drawImage(watermarkImage, x - wmW / 2, y - wmH / 2, wmW, wmH)
          }
        }
        ctx.restore()
      } else {
        const coords = getPositionCoords(position, canvasW, canvasH, wmW, wmH, scaledMargin)
        ctx.save()
        ctx.translate(coords.x, coords.y)
        ctx.rotate(rotationRad)
        ctx.drawImage(watermarkImage, -wmW / 2, -wmH / 2, wmW, wmH)
        ctx.restore()
      }
    }

    ctx.globalAlpha = 1
  }, [watermarkType, text, fontSize, fontFamily, fontColor, bold, watermarkImage, watermarkSize, position, opacity, rotation, tileMode, margin, getPositionCoords])

  // Render preview onto the preview canvas
  const renderPreview = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container || !sourceImage) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Calculate preview dimensions to fit container
    const maxWidth = container.clientWidth - 48 // account for padding
    const maxHeight = 600
    let width = sourceImage.width
    let height = sourceImage.height

    if (width > maxWidth) {
      height = (height * maxWidth) / width
      width = maxWidth
    }
    if (height > maxHeight) {
      width = (width * maxHeight) / height
      height = maxHeight
    }

    canvas.width = width
    canvas.height = height

    // Draw source image
    ctx.drawImage(sourceImage, 0, 0, width, height)

    // Draw watermark (scaleFactor = preview / original)
    const scaleFactor = width / sourceImage.width
    drawWatermark(ctx, width, height, scaleFactor)
  }, [sourceImage, drawWatermark])

  // Re-render preview whenever settings change
  useEffect(() => {
    renderPreview()
  }, [renderPreview])

  // Handle source image upload
  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        setSourceImage(img)
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }, [])

  // Handle watermark image upload
  const handleWatermarkImageSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        setWatermarkImage(img)
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }, [])

  // Drag & drop handlers
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  // Download at original resolution
  const handleDownload = useCallback(() => {
    if (!sourceImage) return

    const offscreen = document.createElement('canvas')
    offscreen.width = sourceImage.width
    offscreen.height = sourceImage.height

    const ctx = offscreen.getContext('2d')
    if (!ctx) return

    ctx.drawImage(sourceImage, 0, 0)
    drawWatermark(ctx, sourceImage.width, sourceImage.height, 1)

    offscreen.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `watermarked-${Date.now()}.png`
      a.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  }, [sourceImage, drawWatermark])

  // Reset all settings
  const handleReset = useCallback(() => {
    setSourceImage(null)
    setWatermarkType('text')
    setText('Sample Watermark')
    setFontSize(48)
    setFontFamily('sans-serif')
    setFontColor('#ffffff')
    setBold(false)
    setWatermarkImage(null)
    setWatermarkSize(20)
    setPosition('bottomRight')
    setOpacity(50)
    setRotation(0)
    setTileMode(false)
    setMargin(20)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (watermarkInputRef.current) watermarkInputRef.current.value = ''
  }, [])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Controls Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-5">
            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('upload')}
              </label>
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('uploadDragDrop')}</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileSelect(file)
                  }}
                />
              </div>
            </div>

            {/* Watermark Type */}
            {!!sourceImage && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('watermarkType')}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setWatermarkType('text')}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                        watermarkType === 'text'
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <Type className="w-4 h-4" />
                      {t('textType')}
                    </button>
                    <button
                      onClick={() => setWatermarkType('image')}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                        watermarkType === 'image'
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <ImageIcon className="w-4 h-4" />
                      {t('imageType')}
                    </button>
                  </div>
                </div>

                {/* Text Watermark Options */}
                {watermarkType === 'text' && (
                  <>
                    {/* Text Input */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('text')}
                      </label>
                      <input
                        type="text"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder={t('textPlaceholder')}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Font Size */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('fontSize')}: {fontSize}px
                      </label>
                      <input
                        type="range"
                        min={10}
                        max={200}
                        value={fontSize}
                        onChange={(e) => setFontSize(Number(e.target.value))}
                        className="w-full accent-blue-600"
                      />
                    </div>

                    {/* Font Family */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('fontFamily')}
                      </label>
                      <select
                        value={fontFamily}
                        onChange={(e) => setFontFamily(e.target.value as FontFamily)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="sans-serif">Sans-serif</option>
                        <option value="serif">Serif</option>
                        <option value="monospace">Monospace</option>
                      </select>
                    </div>

                    {/* Font Color */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('fontColor')}
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={fontColor}
                          onChange={(e) => setFontColor(e.target.value)}
                          className="w-10 h-10 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={fontColor}
                          onChange={(e) => setFontColor(e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>
                    </div>

                    {/* Bold */}
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="bold-toggle"
                        checked={bold}
                        onChange={(e) => setBold(e.target.checked)}
                        className="accent-blue-600 w-4 h-4"
                      />
                      <label htmlFor="bold-toggle" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                        {t('bold')}
                      </label>
                    </div>
                  </>
                )}

                {/* Image Watermark Options */}
                {watermarkType === 'image' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('watermarkImage')}
                      </label>
                      <div
                        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
                        onClick={() => watermarkInputRef.current?.click()}
                      >
                        {watermarkImage ? (
                          <div className="flex items-center justify-center gap-2">
                            <ImageIcon className="w-5 h-5 text-green-500" />
                            <span className="text-sm text-green-600 dark:text-green-400">
                              {t('watermarkImageUpload')}
                            </span>
                          </div>
                        ) : (
                          <>
                            <Upload className="w-8 h-8 mx-auto text-gray-400 mb-1" />
                            <p className="text-sm text-gray-600 dark:text-gray-400">{t('watermarkImageUpload')}</p>
                          </>
                        )}
                        <input
                          ref={watermarkInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleWatermarkImageSelect(file)
                          }}
                        />
                      </div>
                    </div>

                    {/* Watermark Size */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('watermarkSize')}: {watermarkSize}%
                      </label>
                      <input
                        type="range"
                        min={5}
                        max={80}
                        value={watermarkSize}
                        onChange={(e) => setWatermarkSize(Number(e.target.value))}
                        className="w-full accent-blue-600"
                      />
                    </div>
                  </>
                )}

                {/* Common Options Divider */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-5">
                  {/* Position Grid */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('position')}
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {positions.map((pos) => (
                        <button
                          key={pos}
                          onClick={() => setPosition(pos)}
                          disabled={tileMode}
                          className={`px-2 py-2 rounded text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                            position === pos && !tileMode
                              ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          {t(`positions.${pos}`)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Opacity */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('opacity')}: {opacity}%
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={100}
                      value={opacity}
                      onChange={(e) => setOpacity(Number(e.target.value))}
                      className="w-full accent-blue-600"
                    />
                  </div>

                  {/* Rotation */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('rotation')}: {rotation}&deg;
                    </label>
                    <input
                      type="range"
                      min={-180}
                      max={180}
                      value={rotation}
                      onChange={(e) => setRotation(Number(e.target.value))}
                      className="w-full accent-blue-600"
                    />
                  </div>

                  {/* Tile Mode */}
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="tile-toggle"
                      checked={tileMode}
                      onChange={(e) => setTileMode(e.target.checked)}
                      className="accent-blue-600 w-4 h-4"
                    />
                    <label htmlFor="tile-toggle" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                      {t('tileMode')}
                    </label>
                  </div>

                  {/* Margin */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('margin')}: {margin}px
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={margin}
                      onChange={(e) => setMargin(Number(e.target.value))}
                      className="w-full accent-blue-600"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
                  <button
                    onClick={handleDownload}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    {t('download')}
                  </button>
                  <button
                    onClick={handleReset}
                    className="w-full flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-3 font-medium transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    {t('reset')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-2" ref={containerRef}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('preview')}</h2>
            {!sourceImage ? (
              <div className="flex flex-col items-center justify-center h-96 text-gray-400">
                <ImageIcon className="w-24 h-24 mb-4" />
                <p className="text-lg">{t('noImage')}</p>
              </div>
            ) : (
              <div className="overflow-auto flex justify-center">
                <canvas
                  ref={canvasRef}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg"
                  style={{
                    maxWidth: '100%',
                    background: 'repeating-conic-gradient(#e5e7eb 0% 25%, transparent 0% 50%) 50% / 16px 16px',
                  }}
                />
              </div>
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

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
              {t('guide.features.title')}
            </h3>
            <ul className="space-y-2 text-gray-600 dark:text-gray-300">
              {(t.raw('guide.features.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
              {t('guide.tips.title')}
            </h3>
            <ul className="space-y-2 text-gray-600 dark:text-gray-300">
              {(t.raw('guide.tips.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start gap-2">
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
