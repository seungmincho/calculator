'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  Copy,
  Check,
  Download,
  Upload,
  Trash2,
  Minimize2,
  Maximize2,
  BookOpen,
  Palette,
  Image as ImageIcon,
  FileCode,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Eye,
  Settings,
  BarChart3,
  Replace,
} from 'lucide-react'

// ── Types ──

interface OptimizationOptions {
  removeComments: boolean
  removeMetadata: boolean
  removeWhitespace: boolean
  removeEmptyGroups: boolean
  shortenHexColors: boolean
  removeDefaultAttrs: boolean
  removeXmlDeclaration: boolean
  minify: boolean
}

interface SvgStats {
  elements: number
  originalSize: number
  optimizedSize: number
  ratio: number
}

interface ColorEntry {
  color: string
  count: number
}

// ── Helpers ──

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function shortenHex(hex: string): string {
  const m = hex.match(/^#([0-9a-fA-F])\1([0-9a-fA-F])\2([0-9a-fA-F])\3$/i)
  if (m) return `#${m[1]}${m[2]}${m[3]}`
  return hex
}

const DEFAULT_ATTRS: Record<string, Record<string, string>> = {
  svg: { version: '1.1', 'xmlns:xlink': 'http://www.w3.org/1999/xlink' },
  path: { fill: 'none', stroke: 'none', 'fill-rule': 'nonzero', 'clip-rule': 'nonzero', 'stroke-miterlimit': '4', 'stroke-dasharray': 'none', 'stroke-dashoffset': '0', 'stroke-linecap': 'butt', 'stroke-linejoin': 'miter', 'stroke-opacity': '1', 'fill-opacity': '1', opacity: '1' },
  circle: { cx: '0', cy: '0' },
  rect: { x: '0', y: '0', rx: '0', ry: '0' },
  line: { x1: '0', y1: '0', x2: '0', y2: '0' },
  g: { opacity: '1' },
}

function optimizeSvg(input: string, options: OptimizationOptions): string {
  let svg = input

  // Remove XML declaration
  if (options.removeXmlDeclaration) {
    svg = svg.replace(/<\?xml[^?]*\?>\s*/gi, '')
  }

  // Remove comments
  if (options.removeComments) {
    svg = svg.replace(/<!--[\s\S]*?-->/g, '')
  }

  // Remove metadata
  if (options.removeMetadata) {
    svg = svg.replace(/<metadata[\s\S]*?<\/metadata>/gi, '')
    svg = svg.replace(/<title[\s\S]*?<\/title>/gi, '')
    svg = svg.replace(/<desc[\s\S]*?<\/desc>/gi, '')
    // Remove editor-specific attributes
    svg = svg.replace(/\s+(inkscape|sodipodi|xmlns:inkscape|xmlns:sodipodi|xmlns:rdf|xmlns:cc|xmlns:dc):[^\s=]*="[^"]*"/gi, '')
    svg = svg.replace(/\s+data-name="[^"]*"/gi, '')
  }

  // Remove empty groups
  if (options.removeEmptyGroups) {
    // Iteratively remove empty <g> elements
    let prev = ''
    while (prev !== svg) {
      prev = svg
      svg = svg.replace(/<g[^>]*>\s*<\/g>/gi, '')
    }
  }

  // Shorten hex colors
  if (options.shortenHexColors) {
    svg = svg.replace(/#([0-9a-fA-F])\1([0-9a-fA-F])\2([0-9a-fA-F])\3/gi, (_, r, g, b) => `#${r}${g}${b}`)
  }

  // Remove default attribute values
  if (options.removeDefaultAttrs) {
    for (const [tag, attrs] of Object.entries(DEFAULT_ATTRS)) {
      for (const [attr, defaultVal] of Object.entries(attrs)) {
        // Use a function to find and remove default attrs from specific elements
        const tagRegex = new RegExp(`(<${tag}\\b)([^>]*?)\\s+${attr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}="${defaultVal}"`, 'gi')
        svg = svg.replace(tagRegex, '$1$2')
      }
    }
  }

  // Remove unnecessary whitespace between tags
  if (options.removeWhitespace) {
    svg = svg.replace(/>\s+</g, '><')
    svg = svg.replace(/\s{2,}/g, ' ')
  }

  // Minify
  if (options.minify) {
    svg = svg.replace(/\n/g, '')
    svg = svg.replace(/\r/g, '')
    svg = svg.replace(/\t/g, '')
    svg = svg.replace(/>\s+</g, '><')
    svg = svg.replace(/\s{2,}/g, ' ')
    // Remove space before closing bracket
    svg = svg.replace(/\s+>/g, '>')
    svg = svg.replace(/\s+\/>/g, '/>')
  }

  return svg.trim()
}

function extractColors(svgText: string): ColorEntry[] {
  const colorMap = new Map<string, number>()
  // Match hex colors
  const hexMatches = svgText.match(/#[0-9a-fA-F]{3,8}/g) || []
  for (const c of hexMatches) {
    const normalized = c.toLowerCase()
    colorMap.set(normalized, (colorMap.get(normalized) || 0) + 1)
  }
  // Match rgb/rgba colors
  const rgbMatches = svgText.match(/rgba?\([^)]+\)/gi) || []
  for (const c of rgbMatches) {
    const normalized = c.toLowerCase().replace(/\s/g, '')
    colorMap.set(normalized, (colorMap.get(normalized) || 0) + 1)
  }
  // Match named colors in fill/stroke attributes
  const namedColorMatches = svgText.match(/(?:fill|stroke|color|stop-color)\s*[:=]\s*"?([a-zA-Z]+)"?/gi) || []
  for (const match of namedColorMatches) {
    const parts = match.match(/[:=]\s*"?([a-zA-Z]+)"?/i)
    if (parts && parts[1] && !['none', 'url', 'inherit', 'currentColor', 'transparent'].includes(parts[1])) {
      const named = parts[1].toLowerCase()
      // Validate it's a known CSS color by checking common ones
      const knownColors = ['red', 'blue', 'green', 'black', 'white', 'yellow', 'orange', 'purple', 'pink', 'gray', 'grey', 'brown', 'cyan', 'magenta', 'lime', 'navy', 'teal', 'olive', 'maroon', 'aqua', 'silver', 'gold', 'coral', 'tomato', 'salmon', 'khaki', 'violet', 'indigo', 'beige', 'ivory', 'linen', 'wheat', 'tan', 'peru', 'sienna', 'chocolate', 'firebrick', 'crimson', 'darkred', 'darkgreen', 'darkblue', 'steelblue', 'royalblue', 'dodgerblue', 'deepskyblue', 'lightblue', 'skyblue', 'slategray']
      if (knownColors.includes(named)) {
        colorMap.set(named, (colorMap.get(named) || 0) + 1)
      }
    }
  }
  return Array.from(colorMap.entries())
    .map(([color, count]) => ({ color, count }))
    .sort((a, b) => b.count - a.count)
}

function countElements(svgText: string): number {
  const matches = svgText.match(/<[a-zA-Z][^/]*?>/g)
  return matches ? matches.length : 0
}

function getSvgDimensions(svgText: string): { width: string; height: string; viewBox: string } {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgText, 'image/svg+xml')
  const svg = doc.querySelector('svg')
  if (!svg) return { width: '', height: '', viewBox: '' }
  return {
    width: svg.getAttribute('width') || '',
    height: svg.getAttribute('height') || '',
    viewBox: svg.getAttribute('viewBox') || '',
  }
}

// ── Component ──

export default function SvgEditor() {
  const t = useTranslations('svgEditor')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // SVG state
  const [svgCode, setSvgCode] = useState('')
  const [optimizedCode, setOptimizedCode] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [previewZoom, setPreviewZoom] = useState(100)
  const [showOptimized, setShowOptimized] = useState(false)
  const [activeTab, setActiveTab] = useState<'editor' | 'optimize' | 'export' | 'color'>('editor')

  // Optimization options
  const [optOptions, setOptOptions] = useState<OptimizationOptions>({
    removeComments: true,
    removeMetadata: true,
    removeWhitespace: true,
    removeEmptyGroups: true,
    shortenHexColors: true,
    removeDefaultAttrs: true,
    removeXmlDeclaration: true,
    minify: false,
  })

  // Export options
  const [exportFormat, setExportFormat] = useState<'svg' | 'png' | 'jpeg'>('png')
  const [exportScale, setExportScale] = useState(2)
  const [jpegQuality, setJpegQuality] = useState(90)

  // Color replacement
  const [findColor, setFindColor] = useState('')
  const [replaceColor, setReplaceColor] = useState('#000000')

  // Size adjustment
  const [newWidth, setNewWidth] = useState('')
  const [newHeight, setNewHeight] = useState('')
  const [newViewBox, setNewViewBox] = useState('')

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  // ── Clipboard ──
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

  // ── Stats ──
  const stats: SvgStats = useMemo(() => {
    const originalSize = new Blob([svgCode]).size
    const optimizedSize = new Blob([optimizedCode || svgCode]).size
    return {
      elements: countElements(svgCode),
      originalSize,
      optimizedSize: optimizedCode ? optimizedSize : originalSize,
      ratio: optimizedCode && originalSize > 0 ? Math.round((1 - optimizedSize / originalSize) * 100) : 0,
    }
  }, [svgCode, optimizedCode])

  // ── Colors ──
  const colors = useMemo(() => extractColors(svgCode), [svgCode])

  // ── Dimensions ──
  const dimensions = useMemo(() => getSvgDimensions(svgCode), [svgCode])

  useEffect(() => {
    if (svgCode) {
      setNewWidth(dimensions.width)
      setNewHeight(dimensions.height)
      setNewViewBox(dimensions.viewBox)
    }
  }, [dimensions, svgCode])

  // ── File handling ──
  const handleFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith('.svg') && file.type !== 'image/svg+xml') return
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      setSvgCode(text)
      setOptimizedCode('')
      setShowOptimized(false)
    }
    reader.readAsText(file)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  // ── Optimize ──
  const handleOptimize = useCallback(() => {
    if (!svgCode.trim()) return
    const result = optimizeSvg(svgCode, optOptions)
    setOptimizedCode(result)
    setShowOptimized(true)
  }, [svgCode, optOptions])

  // ── Color replacement ──
  const handleColorReplace = useCallback(() => {
    if (!findColor.trim() || !svgCode.trim()) return
    const escaped = findColor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(escaped, 'gi')
    const newCode = svgCode.replace(regex, replaceColor)
    setSvgCode(newCode)
    setOptimizedCode('')
    setShowOptimized(false)
  }, [svgCode, findColor, replaceColor])

  // ── Size adjustment ──
  const handleSizeChange = useCallback(() => {
    if (!svgCode.trim()) return
    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(svgCode, 'image/svg+xml')
      const svg = doc.querySelector('svg')
      if (!svg) return

      if (newWidth) svg.setAttribute('width', newWidth)
      else svg.removeAttribute('width')

      if (newHeight) svg.setAttribute('height', newHeight)
      else svg.removeAttribute('height')

      if (newViewBox) svg.setAttribute('viewBox', newViewBox)

      const serializer = new XMLSerializer()
      const result = serializer.serializeToString(svg)
      setSvgCode(result)
      setOptimizedCode('')
      setShowOptimized(false)
    } catch {
      // Invalid SVG - ignore
    }
  }, [svgCode, newWidth, newHeight, newViewBox])

  // ── Export ──
  const handleExport = useCallback(() => {
    const code = showOptimized && optimizedCode ? optimizedCode : svgCode
    if (!code.trim()) return

    if (exportFormat === 'svg') {
      const blob = new Blob([code], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'image.svg'
      a.click()
      URL.revokeObjectURL(url)
      return
    }

    // PNG/JPEG via Canvas
    const svgBlob = new Blob([code], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)
    const img = new window.Image()
    img.onload = () => {
      const w = img.naturalWidth || img.width || 300
      const h = img.naturalHeight || img.height || 150
      const canvas = document.createElement('canvas')
      canvas.width = w * exportScale
      canvas.height = h * exportScale
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      if (exportFormat === 'jpeg') {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }

      ctx.scale(exportScale, exportScale)
      ctx.drawImage(img, 0, 0, w, h)

      const mimeType = exportFormat === 'png' ? 'image/png' : 'image/jpeg'
      const quality = exportFormat === 'jpeg' ? jpegQuality / 100 : undefined

      canvas.toBlob((blob) => {
        if (!blob) return
        const blobUrl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = blobUrl
        a.download = `image.${exportFormat}`
        a.click()
        URL.revokeObjectURL(blobUrl)
      }, mimeType, quality)

      URL.revokeObjectURL(url)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
    }
    img.src = url
  }, [svgCode, optimizedCode, showOptimized, exportFormat, exportScale, jpegQuality])

  // ── Reset ──
  const handleReset = useCallback(() => {
    setSvgCode('')
    setOptimizedCode('')
    setShowOptimized(false)
    setPreviewZoom(100)
    setFindColor('')
    setReplaceColor('#000000')
    setNewWidth('')
    setNewHeight('')
    setNewViewBox('')
  }, [])

  // ── Line count ──
  const lineCount = useMemo(() => {
    const displayCode = showOptimized && optimizedCode ? optimizedCode : svgCode
    if (!displayCode) return 0
    return displayCode.split('\n').length
  }, [svgCode, optimizedCode, showOptimized])

  const displayCode = showOptimized && optimizedCode ? optimizedCode : svgCode

  // ── Check if SVG is valid ──
  const isValidSvg = useMemo(() => {
    if (!svgCode.trim()) return false
    return /<svg[\s>]/i.test(svgCode)
  }, [svgCode])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Drag & Drop / File Input */}
      {!svgCode && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
            isDragging
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
              : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">{t('dropzone.title')}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('dropzone.subtitle')}</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".svg,image/svg+xml"
            onChange={handleFileInput}
            className="hidden"
          />
        </div>
      )}

      {/* Tab Navigation */}
      {svgCode && (
        <div className="flex flex-wrap gap-2">
          {(['editor', 'optimize', 'export', 'color'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {tab === 'editor' && <FileCode className="w-4 h-4" />}
              {tab === 'optimize' && <Settings className="w-4 h-4" />}
              {tab === 'export' && <Download className="w-4 h-4" />}
              {tab === 'color' && <Palette className="w-4 h-4" />}
              {t(`tabs.${tab}`)}
            </button>
          ))}
          <div className="flex-1" />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <Upload className="w-4 h-4" />
            {t('upload')}
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            {t('reset')}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".svg,image/svg+xml"
            onChange={handleFileInput}
            className="hidden"
          />
        </div>
      )}

      {/* Main Grid: Editor + Preview */}
      {svgCode && activeTab === 'editor' && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left: Code Editor */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {showOptimized ? t('optimizedCode') : t('svgCode')}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {lineCount} {t('lines')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {optimizedCode && (
                  <button
                    onClick={() => setShowOptimized(!showOptimized)}
                    className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <Eye className="w-3 h-3" />
                    {showOptimized ? t('showOriginal') : t('showOptimized')}
                  </button>
                )}
                <button
                  onClick={() => copyToClipboard(displayCode, 'code')}
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  {copiedId === 'code' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                  {copiedId === 'code' ? t('copied') : t('copy')}
                </button>
              </div>
            </div>
            <div className="relative">
              <div className="flex">
                {/* Line numbers */}
                <div className="flex-shrink-0 select-none text-right pr-3 pl-3 py-3 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 text-xs text-gray-400 dark:text-gray-600 font-mono leading-5 overflow-hidden">
                  {Array.from({ length: lineCount || 1 }, (_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>
                {/* Textarea */}
                <textarea
                  value={displayCode}
                  onChange={(e) => {
                    setSvgCode(e.target.value)
                    if (showOptimized) {
                      setShowOptimized(false)
                      setOptimizedCode('')
                    }
                  }}
                  readOnly={showOptimized}
                  className="flex-1 p-3 font-mono text-xs leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none focus:outline-none min-h-[400px] w-full"
                  spellCheck={false}
                  placeholder={t('placeholder')}
                />
              </div>
            </div>
          </div>

          {/* Right: Preview + Stats */}
          <div className="space-y-4">
            {/* Preview */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
              <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('preview')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewZoom(Math.max(25, previewZoom - 25))}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
                    title={t('zoomOut')}
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[3rem] text-center">{previewZoom}%</span>
                  <button
                    onClick={() => setPreviewZoom(Math.min(500, previewZoom + 25))}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
                    title={t('zoomIn')}
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPreviewZoom(100)}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
                    title={t('resetZoom')}
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div
                ref={previewRef}
                className="min-h-[300px] max-h-[400px] overflow-auto p-4 bg-[repeating-conic-gradient(#e5e7eb_0%_25%,transparent_0%_50%)] dark:bg-[repeating-conic-gradient(#374151_0%_25%,transparent_0%_50%)] bg-[length:20px_20px]"
              >
                {isValidSvg ? (
                  <div
                    style={{ transform: `scale(${previewZoom / 100})`, transformOrigin: 'top left' }}
                    dangerouslySetInnerHTML={{ __html: displayCode }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full min-h-[200px] text-gray-400 dark:text-gray-500">
                    {t('invalidSvg')}
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('statistics')}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400">{t('stats.elements')}</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">{stats.elements}</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400">{t('stats.originalSize')}</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">{formatBytes(stats.originalSize)}</div>
                </div>
                {optimizedCode && (
                  <>
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                      <div className="text-xs text-gray-500 dark:text-gray-400">{t('stats.optimizedSize')}</div>
                      <div className="text-lg font-semibold text-green-600 dark:text-green-400">{formatBytes(stats.optimizedSize)}</div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                      <div className="text-xs text-gray-500 dark:text-gray-400">{t('stats.reduction')}</div>
                      <div className={`text-lg font-semibold ${stats.ratio > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
                        {stats.ratio > 0 ? `-${stats.ratio}%` : `${stats.ratio}%`}
                      </div>
                    </div>
                  </>
                )}
              </div>
              {/* Dimensions */}
              {isValidSvg && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">{t('stats.width')}: </span>
                      <span className="font-medium text-gray-900 dark:text-white">{dimensions.width || 'auto'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">{t('stats.height')}: </span>
                      <span className="font-medium text-gray-900 dark:text-white">{dimensions.height || 'auto'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">viewBox: </span>
                      <span className="font-medium text-gray-900 dark:text-white">{dimensions.viewBox || 'none'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Optimize Tab */}
      {svgCode && activeTab === 'optimize' && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Options */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('optimizeOptions')}</h2>
              {(Object.keys(optOptions) as (keyof OptimizationOptions)[]).map((key) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={optOptions[key]}
                    onChange={(e) => setOptOptions((prev) => ({ ...prev, [key]: e.target.checked }))}
                    className="accent-blue-600 w-4 h-4"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t(`opt.${key}`)}</span>
                </label>
              ))}
              <button
                onClick={handleOptimize}
                disabled={!svgCode.trim()}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Minimize2 className="w-4 h-4 inline mr-2" />
                {t('optimize')}
              </button>

              {/* Size Adjustment */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('sizeAdjust')}</h3>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">{t('stats.width')}</label>
                  <input
                    type="text"
                    value={newWidth}
                    onChange={(e) => setNewWidth(e.target.value)}
                    placeholder="e.g. 200, 100%"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">{t('stats.height')}</label>
                  <input
                    type="text"
                    value={newHeight}
                    onChange={(e) => setNewHeight(e.target.value)}
                    placeholder="e.g. 200, 100%"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">viewBox</label>
                  <input
                    type="text"
                    value={newViewBox}
                    onChange={(e) => setNewViewBox(e.target.value)}
                    placeholder="e.g. 0 0 100 100"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={handleSizeChange}
                  disabled={!isValidSvg}
                  className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Maximize2 className="w-4 h-4 inline mr-2" />
                  {t('applySize')}
                </button>
              </div>
            </div>
          </div>

          {/* Right: Before / After */}
          <div className="lg:col-span-2 space-y-4">
            {optimizedCode ? (
              <>
                {/* Before / After Sizes */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{t('stats.originalSize')}</div>
                      <div className="text-lg font-semibold text-gray-900 dark:text-white">{formatBytes(stats.originalSize)}</div>
                    </div>
                    <div className="text-2xl text-gray-300 dark:text-gray-600">&rarr;</div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{t('stats.optimizedSize')}</div>
                      <div className="text-lg font-semibold text-green-600 dark:text-green-400">{formatBytes(stats.optimizedSize)}</div>
                    </div>
                    <div className={`text-xl font-bold ${stats.ratio > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}>
                      {stats.ratio > 0 ? `-${stats.ratio}%` : `${stats.ratio}%`}
                    </div>
                  </div>
                </div>

                {/* Optimized Code */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                  <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('optimizedCode')}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyToClipboard(optimizedCode, 'optimized')}
                        className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        {copiedId === 'optimized' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                        {copiedId === 'optimized' ? t('copied') : t('copy')}
                      </button>
                      <button
                        onClick={() => {
                          setSvgCode(optimizedCode)
                          setOptimizedCode('')
                          setShowOptimized(false)
                        }}
                        className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                      >
                        {t('applyToEditor')}
                      </button>
                    </div>
                  </div>
                  <pre className="p-4 overflow-auto max-h-[400px] text-xs font-mono text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-900">
                    {optimizedCode}
                  </pre>
                </div>
              </>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
                <Settings className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <p className="text-gray-500 dark:text-gray-400">{t('optimizeHint')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Export Tab */}
      {svgCode && activeTab === 'export' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('exportSettings')}</h2>

              {/* Format */}
              <div>
                <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t('exportFormat')}</label>
                <div className="flex gap-2 mt-2">
                  {(['svg', 'png', 'jpeg'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setExportFormat(fmt)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                        exportFormat === fmt
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {fmt.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scale */}
              {exportFormat !== 'svg' && (
                <div>
                  <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t('exportScale')}</label>
                  <div className="flex gap-2 mt-2">
                    {[1, 2, 3, 4].map((s) => (
                      <button
                        key={s}
                        onClick={() => setExportScale(s)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                          exportScale === s
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* JPEG Quality */}
              {exportFormat === 'jpeg' && (
                <div>
                  <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                    {t('jpegQuality')}: {jpegQuality}%
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={jpegQuality}
                    onChange={(e) => setJpegQuality(Number(e.target.value))}
                    className="w-full mt-2 accent-blue-600"
                  />
                </div>
              )}

              {/* Use optimized */}
              {optimizedCode && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showOptimized}
                    onChange={(e) => setShowOptimized(e.target.checked)}
                    className="accent-blue-600 w-4 h-4"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t('useOptimized')}</span>
                </label>
              )}

              <button
                onClick={handleExport}
                disabled={!isValidSvg}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Download className="w-4 h-4 inline mr-2" />
                {t('download')} {exportFormat.toUpperCase()}
              </button>
            </div>
          </div>

          {/* Preview */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
              <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('exportPreview')}</span>
                {exportFormat !== 'svg' && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {t('exportResolution')}: {exportScale}x
                  </span>
                )}
              </div>
              <div className="min-h-[300px] overflow-auto p-4 bg-[repeating-conic-gradient(#e5e7eb_0%_25%,transparent_0%_50%)] dark:bg-[repeating-conic-gradient(#374151_0%_25%,transparent_0%_50%)] bg-[length:20px_20px]">
                {isValidSvg ? (
                  <div dangerouslySetInnerHTML={{ __html: displayCode }} />
                ) : (
                  <div className="flex items-center justify-center h-full min-h-[200px] text-gray-400 dark:text-gray-500">
                    {t('invalidSvg')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Color Tab */}
      {svgCode && activeTab === 'color' && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Color Replace */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('colorReplace')}</h2>

              <div>
                <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t('findColor')}</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    value={findColor}
                    onChange={(e) => setFindColor(e.target.value)}
                    placeholder="#ff0000"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="color"
                    value={findColor.startsWith('#') && (findColor.length === 4 || findColor.length === 7) ? (findColor.length === 4 ? `#${findColor[1]}${findColor[1]}${findColor[2]}${findColor[2]}${findColor[3]}${findColor[3]}` : findColor) : '#000000'}
                    onChange={(e) => setFindColor(e.target.value)}
                    className="w-10 h-10 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t('replaceWith')}</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    value={replaceColor}
                    onChange={(e) => setReplaceColor(e.target.value)}
                    placeholder="#00ff00"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="color"
                    value={replaceColor.startsWith('#') && replaceColor.length === 7 ? replaceColor : '#000000'}
                    onChange={(e) => setReplaceColor(e.target.value)}
                    className="w-10 h-10 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                  />
                </div>
              </div>

              <button
                onClick={handleColorReplace}
                disabled={!findColor.trim() || !isValidSvg}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Replace className="w-4 h-4 inline mr-2" />
                {t('replaceAll')}
              </button>
            </div>
          </div>

          {/* Right: Detected Colors */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('detectedColors')}</h2>
              {colors.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {colors.map((entry, i) => (
                    <button
                      key={`${entry.color}-${i}`}
                      onClick={() => setFindColor(entry.color)}
                      className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer text-left"
                    >
                      <div
                        className="w-8 h-8 rounded border border-gray-200 dark:border-gray-600 flex-shrink-0"
                        style={{ backgroundColor: entry.color }}
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-mono text-gray-900 dark:text-white truncate">{entry.color}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {entry.count}x
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('noColors')}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          {t('guide.title')}
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{t('guide.features.title')}</h3>
            <ul className="space-y-1">
              {(t.raw('guide.features.items') as string[]).map((item, i) => (
                <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">&#8226;</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{t('guide.tips.title')}</h3>
            <ul className="space-y-1">
              {(t.raw('guide.tips.items') as string[]).map((item, i) => (
                <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">&#8226;</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Hidden canvas for export */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
