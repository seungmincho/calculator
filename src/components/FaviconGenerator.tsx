'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Upload, Download, Copy, Check, Image, Trash2, BookOpen, FileCode, Smartphone, Monitor, Globe, Crop, Pipette, RotateCcw } from 'lucide-react'

interface FaviconSize {
  width: number
  height: number
  name: string
  category: 'web' | 'apple' | 'android' | 'ms'
  rel: string
  type?: string
}

const FAVICON_SIZES: FaviconSize[] = [
  // Web standard
  { width: 16, height: 16, name: 'favicon-16x16.png', category: 'web', rel: 'icon', type: 'image/png' },
  { width: 32, height: 32, name: 'favicon-32x32.png', category: 'web', rel: 'icon', type: 'image/png' },
  { width: 48, height: 48, name: 'favicon-48x48.png', category: 'web', rel: 'icon', type: 'image/png' },
  { width: 64, height: 64, name: 'favicon-64x64.png', category: 'web', rel: 'icon', type: 'image/png' },
  { width: 96, height: 96, name: 'favicon-96x96.png', category: 'web', rel: 'icon', type: 'image/png' },
  // Apple Touch Icons
  { width: 57, height: 57, name: 'apple-touch-icon-57x57.png', category: 'apple', rel: 'apple-touch-icon' },
  { width: 60, height: 60, name: 'apple-touch-icon-60x60.png', category: 'apple', rel: 'apple-touch-icon' },
  { width: 72, height: 72, name: 'apple-touch-icon-72x72.png', category: 'apple', rel: 'apple-touch-icon' },
  { width: 76, height: 76, name: 'apple-touch-icon-76x76.png', category: 'apple', rel: 'apple-touch-icon' },
  { width: 114, height: 114, name: 'apple-touch-icon-114x114.png', category: 'apple', rel: 'apple-touch-icon' },
  { width: 120, height: 120, name: 'apple-touch-icon-120x120.png', category: 'apple', rel: 'apple-touch-icon' },
  { width: 144, height: 144, name: 'apple-touch-icon-144x144.png', category: 'apple', rel: 'apple-touch-icon' },
  { width: 152, height: 152, name: 'apple-touch-icon-152x152.png', category: 'apple', rel: 'apple-touch-icon' },
  { width: 180, height: 180, name: 'apple-touch-icon-180x180.png', category: 'apple', rel: 'apple-touch-icon' },
  // Android Chrome
  { width: 192, height: 192, name: 'android-chrome-192x192.png', category: 'android', rel: 'icon', type: 'image/png' },
  { width: 512, height: 512, name: 'android-chrome-512x512.png', category: 'android', rel: 'icon', type: 'image/png' },
  // Microsoft
  { width: 70, height: 70, name: 'mstile-70x70.png', category: 'ms', rel: 'msapplication-TileImage' },
  { width: 144, height: 144, name: 'mstile-144x144.png', category: 'ms', rel: 'msapplication-TileImage' },
  { width: 150, height: 150, name: 'mstile-150x150.png', category: 'ms', rel: 'msapplication-TileImage' },
  { width: 310, height: 310, name: 'mstile-310x310.png', category: 'ms', rel: 'msapplication-TileImage' },
  { width: 310, height: 150, name: 'mstile-310x150.png', category: 'ms', rel: 'msapplication-TileImage' },
]

type CategoryFilter = 'all' | 'web' | 'apple' | 'android' | 'ms'
type EditTool = 'none' | 'crop' | 'colorPick'

export default function FaviconGenerator() {
  const t = useTranslations('faviconGenerator')
  const [sourceImage, setSourceImage] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const [generatedFavicons, setGeneratedFavicons] = useState<Map<string, string>>(new Map())
  const [isGenerating, setIsGenerating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>('all')
  const [backgroundColor, setBackgroundColor] = useState('#ffffff')
  const [padding, setPadding] = useState(0)
  const [borderRadius, setBorderRadius] = useState(0)

  // Image editor states
  const [activeEditTool, setActiveEditTool] = useState<EditTool>('none')
  const [cropRect, setCropRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [removeColor, setRemoveColor] = useState<{ r: number; g: number; b: number } | null>(null)
  const [colorThreshold, setColorThreshold] = useState(30)
  const [imageReady, setImageReady] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

  // ── Image loading ──
  useEffect(() => {
    if (!sourceImage) {
      imageRef.current = null
      setImageReady(false)
      return
    }
    setImageReady(false)
    const img = new window.Image()
    img.onload = () => {
      imageRef.current = img
      setImageReady(true)
    }
    img.src = sourceImage
  }, [sourceImage])

  // ── Preview canvas drawing ──
  useEffect(() => {
    const canvas = previewCanvasRef.current
    const img = imageRef.current
    if (!canvas || !img) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0)

    // Draw crop overlay
    if (cropRect && cropRect.w > 0 && cropRect.h > 0) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
      ctx.fillRect(0, 0, canvas.width, cropRect.y)
      ctx.fillRect(0, cropRect.y + cropRect.h, canvas.width, canvas.height - cropRect.y - cropRect.h)
      ctx.fillRect(0, cropRect.y, cropRect.x, cropRect.h)
      ctx.fillRect(cropRect.x + cropRect.w, cropRect.y, canvas.width - cropRect.x - cropRect.w, cropRect.h)

      ctx.strokeStyle = '#3b82f6'
      ctx.lineWidth = Math.max(2, Math.min(canvas.width, canvas.height) / 200)
      ctx.setLineDash([8, 4])
      ctx.strokeRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h)
      ctx.setLineDash([])

      // Size label
      const label = `${Math.round(cropRect.w)} × ${Math.round(cropRect.h)}`
      const fontSize = Math.max(14, Math.min(canvas.width, canvas.height) / 25)
      ctx.font = `bold ${fontSize}px sans-serif`
      const tm = ctx.measureText(label)
      const lx = cropRect.x + (cropRect.w - tm.width) / 2
      const ly = cropRect.y > fontSize + 12 ? cropRect.y - 8 : cropRect.y + cropRect.h + fontSize + 8
      const pad = 6
      ctx.fillStyle = 'rgba(59, 130, 246, 0.85)'
      ctx.beginPath()
      ctx.roundRect(lx - pad, ly - fontSize, tm.width + pad * 2, fontSize + pad, 4)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.fillText(label, lx, ly - 2)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageReady, cropRect])

  // ── Canvas coordinate helper ──
  const getCanvasCoords = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = previewCanvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: Math.round((e.clientX - rect.left) * scaleX),
      y: Math.round((e.clientY - rect.top) * scaleY),
    }
  }, [])

  // ── Canvas pointer handlers ──
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = previewCanvasRef.current
    if (!canvas) return

    const coords = getCanvasCoords(e)
    if (!coords) return

    if (activeEditTool === 'colorPick') {
      const img = imageRef.current
      if (!img) return
      const temp = document.createElement('canvas')
      temp.width = img.naturalWidth
      temp.height = img.naturalHeight
      const tCtx = temp.getContext('2d')
      if (!tCtx) return
      tCtx.drawImage(img, 0, 0)
      const px = Math.max(0, Math.min(coords.x, temp.width - 1))
      const py = Math.max(0, Math.min(coords.y, temp.height - 1))
      const pixel = tCtx.getImageData(px, py, 1, 1).data
      setRemoveColor({ r: pixel[0], g: pixel[1], b: pixel[2] })
      setActiveEditTool('none')
    } else if (activeEditTool === 'crop') {
      canvas.setPointerCapture(e.pointerId)
      setDragStart(coords)
      setIsDragging(true)
      setCropRect(null)
    }
  }, [activeEditTool, getCanvasCoords])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging || !dragStart || activeEditTool !== 'crop') return

    const coords = getCanvasCoords(e)
    if (!coords) return
    const img = imageRef.current
    if (!img) return

    const x = Math.max(0, Math.min(coords.x, img.naturalWidth))
    const y = Math.max(0, Math.min(coords.y, img.naturalHeight))

    setCropRect({
      x: Math.min(dragStart.x, x),
      y: Math.min(dragStart.y, y),
      w: Math.abs(x - dragStart.x),
      h: Math.abs(y - dragStart.y),
    })
  }, [isDragging, dragStart, activeEditTool, getCanvasCoords])

  const handlePointerUp = useCallback(() => {
    if (!isDragging) return
    setIsDragging(false)
    setDragStart(null)
    if (cropRect && (cropRect.w < 5 || cropRect.h < 5)) {
      setCropRect(null)
    }
  }, [isDragging, cropRect])

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

  // ── File handlers ──
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      setSourceImage(ev.target?.result as string)
      setGeneratedFavicons(new Map())
      setCropRect(null)
      setRemoveColor(null)
      setActiveEditTool('none')
    }
    reader.readAsDataURL(file)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      setSourceImage(ev.target?.result as string)
      setGeneratedFavicons(new Map())
      setCropRect(null)
      setRemoveColor(null)
      setActiveEditTool('none')
    }
    reader.readAsDataURL(file)
  }, [])

  // ── Favicon generation ──
  const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  }

  const generateFavicons = useCallback(async () => {
    if (!sourceImage) return
    setIsGenerating(true)

    const img = new window.Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      const results = new Map<string, string>()

      // Determine source area (crop or full image)
      let srcX = 0, srcY = 0, srcW = img.width, srcH = img.height
      if (cropRect) {
        srcX = cropRect.x
        srcY = cropRect.y
        srcW = cropRect.w
        srcH = cropRect.h
      }

      // Prepare draw source (with color removal if needed)
      let drawSource: CanvasImageSource = img
      let drawSrcX = srcX
      let drawSrcY = srcY

      if (removeColor) {
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = srcW
        tempCanvas.height = srcH
        const tempCtx = tempCanvas.getContext('2d')
        if (tempCtx) {
          tempCtx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH)
          const imageData = tempCtx.getImageData(0, 0, srcW, srcH)
          const data = imageData.data
          const { r: tr, g: tg, b: tb } = removeColor
          const thr = colorThreshold

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i + 1], b = data[i + 2]
            const dist = Math.sqrt((r - tr) ** 2 + (g - tg) ** 2 + (b - tb) ** 2)
            if (dist <= thr) {
              data[i + 3] = 0
            } else if (dist <= thr + 30) {
              data[i + 3] = Math.round(data[i + 3] * ((dist - thr) / 30))
            }
          }

          tempCtx.putImageData(imageData, 0, 0)
          drawSource = tempCanvas
          drawSrcX = 0
          drawSrcY = 0
        }
      }

      const drawFavicon = (targetW: number, targetH: number): HTMLCanvasElement => {
        const canvas = document.createElement('canvas')
        canvas.width = targetW
        canvas.height = targetH
        const ctx = canvas.getContext('2d')
        if (!ctx) return canvas

        // Background
        if (backgroundColor !== 'transparent') {
          ctx.fillStyle = backgroundColor
          if (borderRadius > 0) {
            const r = (borderRadius / 100) * Math.min(targetW, targetH) / 2
            roundRect(ctx, 0, 0, targetW, targetH, r)
            ctx.fill()
          } else {
            ctx.fillRect(0, 0, targetW, targetH)
          }
        }

        // Clip with border radius
        if (borderRadius > 0) {
          ctx.save()
          const r = (borderRadius / 100) * Math.min(targetW, targetH) / 2
          roundRect(ctx, 0, 0, targetW, targetH, r)
          ctx.clip()
        }

        // Draw with padding
        const p = (padding / 100) * Math.min(targetW, targetH)
        const drawW = targetW - p * 2
        const drawH = targetH - p * 2

        // Cover mode: maintain aspect ratio, fill target
        const imgRatio = srcW / srcH
        const drawRatio = drawW / drawH
        let sx = drawSrcX, sy = drawSrcY, sw = srcW, sh = srcH

        if (imgRatio > drawRatio) {
          sw = srcH * drawRatio
          sx = drawSrcX + (srcW - sw) / 2
        } else {
          sh = srcW / drawRatio
          sy = drawSrcY + (srcH - sh) / 2
        }

        ctx.drawImage(drawSource, sx, sy, sw, sh, p, p, drawW, drawH)

        if (borderRadius > 0) {
          ctx.restore()
        }

        return canvas
      }

      for (const size of FAVICON_SIZES) {
        const canvas = drawFavicon(size.width, size.height)
        results.set(size.name, canvas.toDataURL('image/png'))
      }

      // Generate ICO (48x48)
      const icoCanvas = drawFavicon(48, 48)
      results.set('favicon.ico', icoCanvas.toDataURL('image/png'))

      setGeneratedFavicons(results)
      setIsGenerating(false)
    }

    img.onerror = () => {
      setIsGenerating(false)
    }

    img.src = sourceImage
  }, [sourceImage, backgroundColor, padding, borderRadius, cropRect, removeColor, colorThreshold])

  const downloadSingle = useCallback((dataUrl: string, filename: string) => {
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [])

  const downloadAll = useCallback(async () => {
    if (generatedFavicons.size === 0) return

    try {
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()

      const faviconFolder = zip.folder('favicons')
      if (!faviconFolder) return

      for (const [name, dataUrl] of generatedFavicons) {
        const base64 = dataUrl.split(',')[1]
        faviconFolder.file(name, base64, { base64: true })
      }

      // Add manifest.json
      const manifest = {
        name: 'My App',
        short_name: 'App',
        icons: [
          { src: '/favicons/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/favicons/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
        theme_color: backgroundColor,
        background_color: backgroundColor,
        display: 'standalone',
      }
      faviconFolder.file('site.webmanifest', JSON.stringify(manifest, null, 2))

      // Add browserconfig.xml
      const browserconfig = `<?xml version="1.0" encoding="utf-8"?>
<browserconfig>
  <msapplication>
    <tile>
      <square70x70logo src="/favicons/mstile-70x70.png"/>
      <square150x150logo src="/favicons/mstile-150x150.png"/>
      <square310x310logo src="/favicons/mstile-310x310.png"/>
      <wide310x150logo src="/favicons/mstile-310x150.png"/>
      <TileColor>${backgroundColor}</TileColor>
    </tile>
  </msapplication>
</browserconfig>`
      faviconFolder.file('browserconfig.xml', browserconfig)

      const blob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'favicons.zip'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      for (const [name, dataUrl] of generatedFavicons) {
        downloadSingle(dataUrl, name)
      }
    }
  }, [generatedFavicons, backgroundColor, downloadSingle])

  const getHtmlCode = useCallback(() => {
    const lines: string[] = [
      '<!-- Favicon -->',
      '<link rel="icon" type="image/png" sizes="16x16" href="/favicons/favicon-16x16.png">',
      '<link rel="icon" type="image/png" sizes="32x32" href="/favicons/favicon-32x32.png">',
      '<link rel="icon" type="image/png" sizes="48x48" href="/favicons/favicon-48x48.png">',
      '<link rel="icon" type="image/png" sizes="96x96" href="/favicons/favicon-96x96.png">',
      '<link rel="icon" href="/favicons/favicon.ico">',
      '',
      '<!-- Apple Touch Icon -->',
      '<link rel="apple-touch-icon" sizes="57x57" href="/favicons/apple-touch-icon-57x57.png">',
      '<link rel="apple-touch-icon" sizes="60x60" href="/favicons/apple-touch-icon-60x60.png">',
      '<link rel="apple-touch-icon" sizes="72x72" href="/favicons/apple-touch-icon-72x72.png">',
      '<link rel="apple-touch-icon" sizes="76x76" href="/favicons/apple-touch-icon-76x76.png">',
      '<link rel="apple-touch-icon" sizes="114x114" href="/favicons/apple-touch-icon-114x114.png">',
      '<link rel="apple-touch-icon" sizes="120x120" href="/favicons/apple-touch-icon-120x120.png">',
      '<link rel="apple-touch-icon" sizes="144x144" href="/favicons/apple-touch-icon-144x144.png">',
      '<link rel="apple-touch-icon" sizes="152x152" href="/favicons/apple-touch-icon-152x152.png">',
      '<link rel="apple-touch-icon" sizes="180x180" href="/favicons/apple-touch-icon-180x180.png">',
      '',
      '<!-- Android Chrome -->',
      '<link rel="icon" type="image/png" sizes="192x192" href="/favicons/android-chrome-192x192.png">',
      '<link rel="icon" type="image/png" sizes="512x512" href="/favicons/android-chrome-512x512.png">',
      '<link rel="manifest" href="/favicons/site.webmanifest">',
      '',
      '<!-- Microsoft -->',
      '<meta name="msapplication-TileColor" content="' + backgroundColor + '">',
      '<meta name="msapplication-TileImage" content="/favicons/mstile-144x144.png">',
      '<meta name="msapplication-config" content="/favicons/browserconfig.xml">',
      '',
      '<!-- Theme Color -->',
      '<meta name="theme-color" content="' + backgroundColor + '">',
    ]
    return lines.join('\n')
  }, [backgroundColor])

  const getNextJsCode = useCallback(() => {
    return `// next.config.ts or layout.tsx metadata
export const metadata: Metadata = {
  icons: {
    icon: [
      { url: '/favicons/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicons/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
      { url: '/favicons/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
    ],
    apple: [
      { url: '/favicons/apple-touch-icon-180x180.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'mask-icon', url: '/favicons/favicon-32x32.png', color: '${backgroundColor}' },
    ],
  },
  manifest: '/favicons/site.webmanifest',
  other: {
    'msapplication-TileColor': '${backgroundColor}',
    'msapplication-config': '/favicons/browserconfig.xml',
  },
}`
  }, [backgroundColor])

  const filteredSizes = activeFilter === 'all'
    ? FAVICON_SIZES
    : FAVICON_SIZES.filter(s => s.category === activeFilter)

  const categoryInfo: Record<CategoryFilter, { icon: React.ReactNode; label: string; count: number }> = {
    all: { icon: <Globe className="w-4 h-4" />, label: t('filter.all'), count: FAVICON_SIZES.length },
    web: { icon: <Monitor className="w-4 h-4" />, label: t('filter.web'), count: FAVICON_SIZES.filter(s => s.category === 'web').length },
    apple: { icon: <Smartphone className="w-4 h-4" />, label: t('filter.apple'), count: FAVICON_SIZES.filter(s => s.category === 'apple').length },
    android: { icon: <Smartphone className="w-4 h-4" />, label: t('filter.android'), count: FAVICON_SIZES.filter(s => s.category === 'android').length },
    ms: { icon: <Monitor className="w-4 h-4" />, label: t('filter.ms'), count: FAVICON_SIZES.filter(s => s.category === 'ms').length },
  }

  const rgbToHex = (r: number, g: number, b: number) =>
    '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: Settings */}
        <div className="lg:col-span-1 space-y-6">
          {/* Upload */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('upload.title')}</h2>

            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
            >
              {sourceImage ? (
                <div className="space-y-3">
                  <img src={sourceImage} alt="Source" className="w-24 h-24 object-contain mx-auto rounded-lg" />
                  <p className="text-sm text-gray-600 dark:text-gray-300 truncate max-w-full" title={fileName}>{fileName}</p>
                  <p className="text-xs text-gray-400">{t('upload.change')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload className="w-10 h-10 mx-auto text-gray-400" />
                  <p className="text-sm text-gray-600 dark:text-gray-300">{t('upload.dragDrop')}</p>
                  <p className="text-xs text-gray-400">{t('upload.formats')}</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {sourceImage && (
              <button
                onClick={() => {
                  setSourceImage(null)
                  setGeneratedFavicons(new Map())
                  setFileName('')
                  setCropRect(null)
                  setRemoveColor(null)
                  setActiveEditTool('none')
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
                className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                {t('upload.remove')}
              </button>
            )}
          </div>

          {/* Image Editor */}
          {sourceImage && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('editor.title')}</h2>

              {/* Toolbar */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveEditTool(activeEditTool === 'crop' ? 'none' : 'crop')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    activeEditTool === 'crop'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <Crop className="w-4 h-4" />
                  {t('editor.crop')}
                </button>
                <button
                  onClick={() => setActiveEditTool(activeEditTool === 'colorPick' ? 'none' : 'colorPick')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    activeEditTool === 'colorPick'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <Pipette className="w-4 h-4" />
                  {t('editor.colorPick')}
                </button>
                {(cropRect || removeColor) && (
                  <button
                    onClick={() => {
                      setCropRect(null)
                      setRemoveColor(null)
                      setActiveEditTool('none')
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    {t('editor.reset')}
                  </button>
                )}
              </div>

              {/* Canvas Preview */}
              <div className="relative">
                <canvas
                  ref={previewCanvasRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  className={`w-full rounded-lg border border-gray-200 dark:border-gray-700 ${
                    activeEditTool !== 'none' ? 'cursor-crosshair' : ''
                  }`}
                  style={{
                    aspectRatio: imageRef.current
                      ? `${imageRef.current.naturalWidth} / ${imageRef.current.naturalHeight}`
                      : '1 / 1',
                    touchAction: 'none',
                  }}
                />
                {/* Tool hints */}
                {activeEditTool === 'crop' && !cropRect && !isDragging && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="bg-black/60 text-white text-xs px-3 py-1.5 rounded-full">
                      {t('editor.cropHint')}
                    </span>
                  </div>
                )}
                {activeEditTool === 'colorPick' && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="bg-black/60 text-white text-xs px-3 py-1.5 rounded-full">
                      {t('editor.colorPickHint')}
                    </span>
                  </div>
                )}
              </div>

              {/* Crop info */}
              {cropRect && cropRect.w > 5 && cropRect.h > 5 && !isDragging && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('editor.cropActive')} ({Math.round(cropRect.w)} × {Math.round(cropRect.h)}px)
                  </span>
                  <button
                    onClick={() => setCropRect(null)}
                    className="text-red-500 hover:text-red-600 dark:text-red-400 text-xs"
                  >
                    {t('editor.cancelCrop')}
                  </button>
                </div>
              )}

              {/* Color removal info */}
              {removeColor && (
                <div className="space-y-3 bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('editor.selectedColor')}
                    </span>
                    <div
                      className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600 shrink-0"
                      style={{ backgroundColor: `rgb(${removeColor.r}, ${removeColor.g}, ${removeColor.b})` }}
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                      {rgbToHex(removeColor.r, removeColor.g, removeColor.b)}
                    </span>
                    <button
                      onClick={() => setRemoveColor(null)}
                      className="text-xs text-red-500 hover:text-red-600 dark:text-red-400 ml-auto"
                    >
                      {t('editor.clearColor')}
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                      {t('editor.colorThreshold')}: {colorThreshold}
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="100"
                      value={colorThreshold}
                      onChange={(e) => setColorThreshold(Number(e.target.value))}
                      className="w-full accent-blue-600"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Options */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('options.title')}</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('options.bgColor')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={backgroundColor === 'transparent' ? '#ffffff' : backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer"
                />
                <input
                  type="text"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
                <button
                  onClick={() => setBackgroundColor('transparent')}
                  className="px-3 py-2 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                >
                  {t('options.transparent')}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('options.padding')}: {padding}%
              </label>
              <input
                type="range"
                min="0"
                max="30"
                value={padding}
                onChange={(e) => setPadding(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('options.borderRadius')}: {borderRadius}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={borderRadius}
                onChange={(e) => setBorderRadius(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={generateFavicons}
            disabled={!sourceImage || isGenerating}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl px-4 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            <Image className="w-5 h-5" />
            {isGenerating ? t('generating') : t('generate')}
          </button>
        </div>

        {/* Right: Results */}
        <div className="lg:col-span-2 space-y-6">
          {generatedFavicons.size > 0 ? (
            <>
              {/* Download All */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t('result.title')} ({generatedFavicons.size} {t('result.files')})
                  </h2>
                  <button
                    onClick={downloadAll}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all font-medium text-sm"
                  >
                    <Download className="w-4 h-4" />
                    {t('result.downloadAll')}
                  </button>
                </div>

                {/* Category filter */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {(Object.keys(categoryInfo) as CategoryFilter[]).map(key => (
                    <button
                      key={key}
                      onClick={() => setActiveFilter(key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        activeFilter === key
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {categoryInfo[key].icon}
                      {categoryInfo[key].label} ({categoryInfo[key].count})
                    </button>
                  ))}
                </div>

                {/* Preview Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {filteredSizes.map(size => {
                    const dataUrl = generatedFavicons.get(size.name)
                    if (!dataUrl) return null
                    return (
                      <div
                        key={size.name}
                        className="group bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
                      >
                        <div className="flex items-center justify-center mb-2 h-16">
                          <img
                            src={dataUrl}
                            alt={size.name}
                            className="max-w-full max-h-full object-contain"
                            style={{
                              width: Math.min(size.width, 64),
                              height: Math.min(size.height, 64),
                              imageRendering: size.width <= 32 ? 'pixelated' : 'auto',
                            }}
                          />
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{size.name}</p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400">{size.width}x{size.height}</p>
                        </div>
                        <button
                          onClick={() => downloadSingle(dataUrl, size.name)}
                          className="mt-2 w-full flex items-center justify-center gap-1 px-2 py-1 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Download className="w-3 h-3" />
                          {t('result.download')}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* HTML Code */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <FileCode className="w-5 h-5 text-blue-600" />
                    {t('code.htmlTitle')}
                  </h2>
                  <button
                    onClick={() => copyToClipboard(getHtmlCode(), 'html')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                  >
                    {copiedId === 'html' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    {copiedId === 'html' ? t('code.copied') : t('code.copy')}
                  </button>
                </div>
                <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs overflow-x-auto leading-relaxed">
                  <code>{getHtmlCode()}</code>
                </pre>
              </div>

              {/* Next.js Code */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <FileCode className="w-5 h-5 text-purple-600" />
                    {t('code.nextjsTitle')}
                  </h2>
                  <button
                    onClick={() => copyToClipboard(getNextJsCode(), 'nextjs')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                  >
                    {copiedId === 'nextjs' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    {copiedId === 'nextjs' ? t('code.copied') : t('code.copy')}
                  </button>
                </div>
                <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs overflow-x-auto leading-relaxed">
                  <code>{getNextJsCode()}</code>
                </pre>
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
              <Image className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">{t('result.empty')}</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{t('result.emptyHint')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Guide */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          {t('guide.title')}
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">{t('guide.sizes.title')}</h3>
            <div className="space-y-2">
              {(t.raw('guide.sizes.items') as string[]).map((item, i) => (
                <p key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  {item}
                </p>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">{t('guide.tips.title')}</h3>
            <div className="space-y-2">
              {(t.raw('guide.tips.items') as string[]).map((item, i) => (
                <p key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">•</span>
                  {item}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
