'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import JsBarcode from 'jsbarcode'
import { 
  BarChart3, 
  Copy, 
  Check, 
  Download, 
  Upload,
  AlertTriangle,
  CheckCircle,
  FileText,
  Settings,
  Palette,
  Smartphone
} from 'lucide-react'

interface BarcodeOptions {
  format: string
  width: number
  height: number
  displayValue: boolean
  fontSize: number
  margin: number
  background: string
  lineColor: string
  textAlign: 'left' | 'center' | 'right'
  barcodeAlign: 'left' | 'center' | 'right'
}

interface ValidationResult {
  isValid: boolean
  error?: string
}

const BarcodeGenerator = () => {
  const t = useTranslations('barcodeGenerator')
  const tc = useTranslations('common')
  
  const [barcodeData, setBarcodeData] = useState<string>('')
  const [options, setOptions] = useState<BarcodeOptions>({
    format: 'CODE128',
    width: 2,
    height: 100,
    displayValue: true,
    fontSize: 20,
    margin: 10,
    background: '#ffffff',
    lineColor: '#000000',
    textAlign: 'center',
    barcodeAlign: 'center'
  })
  const [barcodeUrl, setBarcodeUrl] = useState<string>('')
  const [validation, setValidation] = useState<ValidationResult>({ isValid: true })
  const [isCopied, setIsCopied] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Barcode presets
  const presets = {
    product: {
      name: t('presets.product.name'),
      description: t('presets.product.description'),
      options: { format: 'EAN13', width: 2, height: 80, displayValue: true },
      sampleData: '123456789012'
    },
    inventory: {
      name: t('presets.inventory.name'),
      description: t('presets.inventory.description'),
      options: { format: 'CODE128', width: 2, height: 100, displayValue: true },
      sampleData: 'INV-001-2024'
    },
    ticket: {
      name: t('presets.ticket.name'),
      description: t('presets.ticket.description'),
      options: { format: 'CODE39', width: 2, height: 80, displayValue: true },
      sampleData: 'TKT123456'
    },
    logistics: {
      name: t('presets.logistics.name'),
      description: t('presets.logistics.description'),
      options: { format: 'ITF14', width: 2, height: 120, displayValue: true },
      sampleData: '12345678901234'
    }
  }

  // Data validation based on barcode format
  const validateBarcodeData = useCallback((data: string, format: string): ValidationResult => {
    if (!data.trim()) {
      return { isValid: true } // Empty is OK, just no barcode
    }

    try {
      // Use JsBarcode's built-in validation
      const canvas = document.createElement('canvas')
      JsBarcode(canvas, data, { 
        format: format,
        valid: () => {},
      })
      return { isValid: true }
    } catch (error) {
      // Format-specific error messages
      switch (format) {
        case 'EAN13':
          return { isValid: false, error: t('validation.ean13Error') }
        case 'EAN8':
          return { isValid: false, error: t('validation.ean8Error') }
        case 'UPC':
          return { isValid: false, error: t('validation.upcError') }
        case 'CODE39':
          return { isValid: false, error: t('validation.code39Error') }
        case 'pharmacode':
          return { isValid: false, error: t('validation.pharmacodeError') }
        case 'ITF14':
          return { isValid: false, error: t('validation.itf14Error') }
        case 'MSI':
          return { isValid: false, error: t('validation.msiError') }
        default:
          return { isValid: false, error: t('validation.invalidData') }
      }
    }
  }, [t])

  // Generate barcode using JsBarcode
  const generateBarcode = useCallback(async () => {
    if (!barcodeData.trim()) {
      setBarcodeUrl('')
      return
    }

    const validationResult = validateBarcodeData(barcodeData, options.format)
    setValidation(validationResult)
    
    if (!validationResult.isValid) {
      setBarcodeUrl('')
      return
    }

    setIsGenerating(true)
    
    try {
      const canvas = canvasRef.current
      if (!canvas) return

      // Use JsBarcode to generate the barcode
      JsBarcode(canvas, barcodeData, {
        format: options.format,
        width: options.width,
        height: options.height,
        displayValue: options.displayValue,
        fontSize: options.fontSize,
        margin: options.margin,
        background: options.background,
        lineColor: options.lineColor,
        textAlign: options.textAlign,
        textPosition: 'bottom',
        fontOptions: '',
        font: 'monospace'
      })

      // Apply barcode alignment by redrawing on a new canvas
      if (options.barcodeAlign !== 'center') {
        const originalCanvas = canvas
        const alignedCanvas = document.createElement('canvas')
        const originalCtx = originalCanvas.getContext('2d')
        const alignedCtx = alignedCanvas.getContext('2d')
        
        if (!originalCtx || !alignedCtx) return

        // Set aligned canvas size
        alignedCanvas.width = Math.max(originalCanvas.width, 400)
        alignedCanvas.height = originalCanvas.height

        // Clear with background color
        alignedCtx.fillStyle = options.background
        alignedCtx.fillRect(0, 0, alignedCanvas.width, alignedCanvas.height)

        // Calculate position based on alignment
        let drawX = 0
        if (options.barcodeAlign === 'left') {
          drawX = 0
        } else if (options.barcodeAlign === 'right') {
          drawX = alignedCanvas.width - originalCanvas.width
        } else {
          // center or default
          drawX = (alignedCanvas.width - originalCanvas.width) / 2
        }

        // Draw the original barcode on the aligned canvas
        alignedCtx.drawImage(originalCanvas, drawX, 0)

        // Copy back to original canvas
        originalCanvas.width = alignedCanvas.width
        originalCanvas.height = alignedCanvas.height
        originalCtx.clearRect(0, 0, originalCanvas.width, originalCanvas.height)
        originalCtx.drawImage(alignedCanvas, 0, 0)
      }

      // Convert canvas to data URL
      const dataUrl = canvas.toDataURL('image/png')
      setBarcodeUrl(dataUrl)
      
    } catch (error) {
      console.error('Failed to generate barcode:', error)
      setValidation({ isValid: false, error: t('validation.generationError') })
    } finally {
      setIsGenerating(false)
    }
  }, [barcodeData, options, validateBarcodeData, t])

  // Load preset
  const loadPreset = useCallback((presetKey: string) => {
    const preset = presets[presetKey as keyof typeof presets]
    if (preset) {
      setBarcodeData(preset.sampleData)
      setOptions(prev => ({ ...prev, ...preset.options }))
    }
  }, [presets])

  // Copy barcode image to clipboard
  const copyBarcodeToClipboard = useCallback(async () => {
    if (!canvasRef.current || !barcodeUrl) return

    try {
      // Check if clipboard API is available
      if (navigator.clipboard && navigator.clipboard.write) {
        canvasRef.current.toBlob(async (blob) => {
          if (blob) {
            try {
              await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
              ])
              setIsCopied(true)
              setTimeout(() => setIsCopied(false), 2000)
            } catch (clipboardError) {
              console.warn('Image clipboard failed, trying text fallback:', clipboardError)
              // Fallback to text if image copy fails
              if (navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(barcodeUrl)
                setIsCopied(true)
                setTimeout(() => setIsCopied(false), 2000)
              }
            }
          }
        }, 'image/png')
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        // Fallback - copy data URL to text clipboard
        await navigator.clipboard.writeText(barcodeUrl)
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
      } else {
        // Final fallback - create a temporary textarea for older browsers
        const textArea = document.createElement('textarea')
        textArea.value = barcodeUrl
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
      }
    } catch (error) {
      console.error('Failed to copy barcode:', error)
      // Show user-friendly error message
      alert('복사에 실패했습니다. 브라우저가 클립보드 접근을 지원하지 않거나 권한이 없습니다.')
    }
  }, [barcodeUrl])

  // Download barcode
  const downloadBarcode = useCallback(() => {
    if (!barcodeUrl) return

    const link = document.createElement('a')
    link.href = barcodeUrl
    link.download = `barcode-${barcodeData}-${Date.now()}.png`
    link.click()
  }, [barcodeUrl, barcodeData])

  // Auto-generate when data or options change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      generateBarcode()
    }, 300)
    
    return () => clearTimeout(timeoutId)
  }, [generateBarcode])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
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

      {/* Barcode Presets */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Smartphone className="w-5 h-5 text-purple-600" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('presets.title')}
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(presets).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => loadPreset(key)}
              className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-purple-500 dark:hover:border-purple-400 transition-colors text-left"
            >
              <div className="font-medium text-gray-900 dark:text-white mb-1">
                {preset.name}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {preset.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Input Panel */}
        <div className="space-y-6">
          {/* Barcode Data Input */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center space-x-2 mb-4">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('input.title')}
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('input.data')}
                </label>
                <input
                  type="text"
                  value={barcodeData}
                  onChange={(e) => setBarcodeData(e.target.value)}
                  placeholder={t('input.placeholder')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('input.format')}
                </label>
                <select
                  value={options.format}
                  onChange={(e) => setOptions(prev => ({ ...prev, format: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="CODE128">{t('formats.CODE128')}</option>
                  <option value="CODE39">{t('formats.CODE39')}</option>
                  <option value="EAN13">{t('formats.EAN13')}</option>
                  <option value="EAN8">{t('formats.EAN8')}</option>
                  <option value="UPC">{t('formats.UPC')}</option>
                  <option value="ITF14">{t('formats.ITF14')}</option>
                  <option value="MSI">{t('formats.MSI')}</option>
                  <option value="pharmacode">{t('formats.pharmacode')}</option>
                </select>
              </div>

              {/* Validation Status */}
              <div className="flex items-center space-x-2">
                {validation.isValid ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-600 dark:text-green-400">
                      {t('validation.valid')}
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-red-600 dark:text-red-400">
                      {validation.error}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Options Panel */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Settings className="w-5 h-5 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                바코드 옵션
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('input.width')}
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="0.5"
                  value={options.width}
                  onChange={(e) => setOptions(prev => ({ ...prev, width: Number(e.target.value) }))}
                  className="w-full"
                />
                <span className="text-xs text-gray-500">{options.width}px</span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('input.height')}
                </label>
                <input
                  type="range"
                  min="50"
                  max="200"
                  step="10"
                  value={options.height}
                  onChange={(e) => setOptions(prev => ({ ...prev, height: Number(e.target.value) }))}
                  className="w-full"
                />
                <span className="text-xs text-gray-500">{options.height}px</span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('input.background')}
                </label>
                <input
                  type="color"
                  value={options.background}
                  onChange={(e) => setOptions(prev => ({ ...prev, background: e.target.value }))}
                  className="w-full h-10 rounded border border-gray-300 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('input.lineColor')}
                </label>
                <input
                  type="color"
                  value={options.lineColor}
                  onChange={(e) => setOptions(prev => ({ ...prev, lineColor: e.target.value }))}
                  className="w-full h-10 rounded border border-gray-300 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('input.barcodeAlign')}
                </label>
                <select
                  value={options.barcodeAlign}
                  onChange={(e) => setOptions(prev => ({ ...prev, barcodeAlign: e.target.value as 'left' | 'center' | 'right' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="left">{t('input.barcodeAlignLeft')}</option>
                  <option value="center">{t('input.barcodeAlignCenter')}</option>
                  <option value="right">{t('input.barcodeAlignRight')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('input.textAlign')}
                </label>
                <select
                  value={options.textAlign}
                  onChange={(e) => setOptions(prev => ({ ...prev, textAlign: e.target.value as 'left' | 'center' | 'right' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="left">{t('input.textAlignLeft')}</option>
                  <option value="center">{t('input.textAlignCenter')}</option>
                  <option value="right">{t('input.textAlignRight')}</option>
                </select>
              </div>

              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={options.displayValue}
                    onChange={(e) => setOptions(prev => ({ ...prev, displayValue: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {t('input.displayValue')}
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Result Panel */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('result.title')}
              </h2>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={copyBarcodeToClipboard}
                disabled={!barcodeUrl}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{isCopied ? tc('copied') : t('result.copy')}</span>
              </button>
              <button
                onClick={downloadBarcode}
                disabled={!barcodeUrl}
                className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>{t('result.download')}</span>
              </button>
            </div>
          </div>

          {/* Barcode Preview */}
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
            {barcodeUrl ? (
              <div className="space-y-4">
                <img 
                  src={barcodeUrl} 
                  alt={`Barcode: ${barcodeData}`}
                  className="mx-auto max-w-full"
                />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('result.preview')}: {options.format}
                </p>
              </div>
            ) : (
              <div className="py-12">
                <BarChart3 className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  바코드 데이터를 입력하면 미리보기가 표시됩니다
                </p>
              </div>
            )}
          </div>

          {/* Hidden canvas for barcode generation */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
      </div>

      {/* Features Guide */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            {t('features.title')}
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('features.multiFormat.title')}
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {t('features.multiFormat.description')}
            </p>
            <ul className="space-y-2">
              {[0, 1, 2, 3].map((index) => (
                <li key={index} className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {t(`features.multiFormat.details.${index}`)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Palette className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('features.customization.title')}
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {t('features.customization.description')}
            </p>
            <ul className="space-y-2">
              {[0, 1, 2, 3].map((index) => (
                <li key={index} className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {t(`features.customization.details.${index}`)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('features.validation.title')}
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {t('features.validation.description')}
            </p>
            <ul className="space-y-2">
              {[0, 1, 2, 3].map((index) => (
                <li key={index} className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {t(`features.validation.details.${index}`)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Usage Guide */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <FileText className="w-8 h-8 text-indigo-600" />
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t('guide.title')}
            </h2>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            {t('guide.description')}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {t('guide.formats.code128.title')}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {t('guide.formats.code128.description')}
            </p>
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">활용 분야:</div>
              {[0, 1, 2, 3].map((index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {t(`guide.formats.code128.useCases.${index}`)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {t('guide.formats.ean.title')}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {t('guide.formats.ean.description')}
            </p>
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">활용 분야:</div>
              {[0, 1, 2, 3].map((index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {t(`guide.formats.ean.useCases.${index}`)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {t('guide.formats.upc.title')}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {t('guide.formats.upc.description')}
            </p>
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">활용 분야:</div>
              {[0, 1, 2, 3].map((index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {t(`guide.formats.upc.useCases.${index}`)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 grid md:grid-cols-3 gap-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
              {t('guide.tips.printing.title')}
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {t('guide.tips.printing.content')}
            </p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">
              {t('guide.tips.scanning.title')}
            </h4>
            <p className="text-sm text-green-700 dark:text-green-300">
              {t('guide.tips.scanning.content')}
            </p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
            <h4 className="font-semibold text-purple-800 dark:text-purple-200 mb-2">
              {t('guide.tips.format.title')}
            </h4>
            <p className="text-sm text-purple-700 dark:text-purple-300">
              {t('guide.tips.format.content')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BarcodeGenerator