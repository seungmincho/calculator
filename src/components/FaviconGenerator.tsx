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
  { width: 16, height: 16, name: 'favicon-16x16.png', category: 'web', rel: 'icon', type: 'image/png' },
  { width: 32, height: 32, name: 'favicon-32x32.png', category: 'web', rel: 'icon', type: 'image/png' },
  { width: 48, height: 48, name: 'favicon-48x48.png', category: 'web', rel: 'icon', type: 'image/png' },
  { width: 64, height: 64, name: 'favicon-64x64.png', category: 'web', rel: 'icon', type: 'image/png' },
  { width: 96, height: 96, name: 'favicon-96x96.png', category: 'web', rel: 'icon', type: 'image/png' },
  { width: 57, height: 57, name: 'apple-touch-icon-57x57.png', category: 'apple', rel: 'apple-touch-icon' },
  { width: 60, height: 60, name: 'apple-touch-icon-60x60.png', category: 'apple', rel: 'apple-touch-icon' },
  { width: 72, height: 72, name: 'apple-touch-icon-72x72.png', category: 'apple', rel: 'apple-touch-icon' },
  { width: 76, height: 76, name: 'apple-touch-icon-76x76.png', category: 'apple', rel: 'apple-touch-icon' },
  { width: 114, height: 114, name: 'apple-touch-icon-114x114.png', category: 'apple', rel: 'apple-touch-icon' },
  { width: 120, height: 120, name: 'apple-touch-icon-120x120.png', category: 'apple', rel: 'apple-touch-icon' },
  { width: 144, height: 144, name: 'apple-touch-icon-144x144.png', category: 'apple', rel: 'apple-touch-icon' },
  { width: 152, height: 152, name: 'apple-touch-icon-152x152.png', category: 'apple', rel: 'apple-touch-icon' },
  { width: 180, height: 180, name: 'apple-touch-icon-180x180.png', category: 'apple', rel: 'apple-touch-icon' },
  { width: 192, height: 192, name: 'android-chrome-192x192.png', category: 'android', rel: 'icon', type: 'image/png' },
  { width: 512, height: 512, name: 'android-chrome-512x512.png', category: 'android', rel: 'icon', type: 'image/png' },
  { width: 70, height: 70, name: 'mstile-70x70.png', category: 'ms', rel: 'msapplication-TileImage' },
  { width: 144, height: 144, name: 'mstile-144x144.png', category: 'ms', rel: 'msapplication-TileImage' },
  { width: 150, height: 150, name: 'mstile-150x150.png', category: 'ms', rel: 'msapplication-TileImage' },
  { width: 310, height: 310, name: 'mstile-310x310.png', category: 'ms', rel: 'msapplication-TileImage' },
  { width: 310, height: 150, name: 'mstile-310x150.png', category: 'ms', rel: 'msapplication-TileImage' },
]

type CategoryFilter = 'all' | 'web' | 'apple' | 'android' | 'ms'
type EditTool = 'none' | 'crop' | 'colorPick'

// Checkerboard pattern for transparency preview
const createCheckerPattern = (ctx: CanvasRenderingContext2D, size: number) => {
  const pc = document.createElement('canvas')
  pc.width = size * 2
  pc.height = size * 2
  const pctx = pc.getContext('2d')!
  pctx.fillStyle = '#ffffff'
  pctx.fillRect(0, 0, size * 2, size * 2)
  pctx.fillStyle = '#d1d5db'
  pctx.fillRect(0, 0, size, size)
  pctx.fillRect(size, size, size, size)
  return ctx.createPattern(pc, 'repeat')!
}

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

  // Image editor
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

  // ── Preview canvas drawing (with Color Range preview) ──
  useEffect(() => {
    const canvas = previewCanvasRef.current
    const img = imageRef.current
    if (!canvas || !img) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (removeColor) {
      // Color Range preview: checkerboard + image with color removed
      const checkerSize = Math.max(6, Math.round(Math.min(canvas.width, canvas.height) / 50))
      const pattern = createCheckerPattern(ctx, checkerSize)
      ctx.fillStyle = pattern
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Process color removal
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = canvas.width
      tempCanvas.height = canvas.height
      const tempCtx = tempCanvas.getContext('2d')
      if (tempCtx) {
        tempCtx.drawImage(img, 0, 0)
        const imageData = tempCtx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data
        const { r: tr, g: tg, b: tb } = removeColor
        const thr = colorThreshold
        const thrSq = thr * thr
        const softThr = thr + 30
        const softThrSq = softThr * softThr

        for (let i = 0; i < data.length; i += 4) {
          const dr = data[i] - tr
          const dg = data[i + 1] - tg
          const db = data[i + 2] - tb
          const distSq = dr * dr + dg * dg + db * db

          if (distSq <= thrSq) {
            data[i + 3] = 0
          } else if (distSq <= softThrSq) {
            const dist = Math.sqrt(distSq)
            data[i + 3] = Math.round(data[i + 3] * ((dist - thr) / 30))
          }
        }

        tempCtx.putImageData(imageData, 0, 0)
        ctx.drawImage(tempCanvas, 0, 0)
      }
    } else {
      // Original image
      ctx.drawImage(img, 0, 0)
    }

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

      const label = `${Math.round(cropRect.w)} × ${Math.round(cropRect.h)}`
      const fontSize = Math.max(14, Math.min(canvas.width, canvas.height) / 25)
      ctx.font = `bold ${fontSize}px sans-serif`
      const tm = ctx.measureText(label)
      const lx = cropRect.x + (cropRect.w - tm.width) / 2
      const ly = cropRect.y > fontSize + 16 ? cropRect.y - 8 : cropRect.y + cropRect.h + fontSize + 8
      const pad = 6
      ctx.fillStyle = 'rgba(59, 130, 246, 0.85)'
      ctx.beginPath()
      ctx.roundRect(lx - pad, ly - fontSize, tm.width + pad * 2, fontSize + pad, 4)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.fillText(label, lx, ly - 2)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageReady, cropRect, removeColor, colorThreshold])

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
      // Read pixel from original image (not from preview canvas with overlays)
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
  const resetEdits = useCallback(() => {
    setCropRect(null)
    setRemoveColor(null)
    setActiveEditTool('none')
  }, [])

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      setSourceImage(ev.target?.result as string)
      setGeneratedFavicons(new Map())
      resetEdits()
    }
    reader.readAsDataURL(file)
  }, [resetEdits])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      setSourceImage(ev.target?.result as string)
      setGeneratedFavicons(new Map())
      resetEdits()
    }
    reader.readAsDataURL(file)
  }, [resetEdits])

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

      // Source region (crop or full)
      let srcX = 0, srcY = 0, srcW = img.width, srcH = img.height
      if (cropRect) {
        srcX = cropRect.x
        srcY = cropRect.y
        srcW = cropRect.w
        srcH = cropRect.h
      }

      // Prepare processed source (with color removal)
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
          const thrSq = thr * thr
          const softThrSq = (thr + 30) * (thr + 30)

          for (let i = 0; i < data.length; i += 4) {
            const dr = data[i] - tr
            const dg = data[i + 1] - tg
            const db = data[i + 2] - tb
            const distSq = dr * dr + dg * dg + db * db
            if (distSq <= thrSq) {
              data[i + 3] = 0
            } else if (distSq <= softThrSq) {
              const dist = Math.sqrt(distSq)
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

        if (borderRadius > 0) {
          ctx.save()
          const r = (borderRadius / 100) * Math.min(targetW, targetH) / 2
          roundRect(ctx, 0, 0, targetW, targetH, r)
          ctx.clip()
        }

        const p = (padding / 100) * Math.min(targetW, targetH)
        const drawW = targetW - p * 2
        const drawH = targetH - p * 2
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
        if (borderRadius > 0) ctx.restore()
        return canvas
      }

      for (const size of FAVICON_SIZES) {
        results.set(size.name, drawFavicon(size.width, size.height).toDataURL('image/png'))
      }
      results.set('favicon.ico', drawFavicon(48, 48).toDataURL('image/png'))

      setGeneratedFavicons(results)
      setIsGenerating(false)
    }

    img.onerror = () => setIsGenerating(false)
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
      const folder = zip.folder('favicons')
      if (!folder) return

      for (const [name, dataUrl] of generatedFavicons) {
        folder.file(name, dataUrl.split(',')[1], { base64: true })
      }

      folder.file('site.webmanifest', JSON.stringify({
        name: 'My App', short_name: 'App',
        icons: [
          { src: '/favicons/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/favicons/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
        theme_color: backgroundColor, background_color: backgroundColor, display: 'standalone',
      }, null, 2))

      folder.file('browserconfig.xml', `<?xml version="1.0" encoding="utf-8"?>
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
</browserconfig>`)

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
    return [
      '<!-- Favicon -->',
      '<link rel="icon" type="image/png" sizes="16x16" href="/favicons/favicon-16x16.png">',
      '<link rel="icon" type="image/png" sizes="32x32" href="/favicons/favicon-32x32.png">',
      '<link rel="icon" type="image/png" sizes="48x48" href="/favicons/favicon-48x48.png">',
      '<link rel="icon" type="image/png" sizes="96x96" href="/favicons/favicon-96x96.png">',
      '<link rel="icon" href="/favicons/favicon.ico">',
      '',
      '<!-- Apple Touch Icon -->',
      '<link rel="apple-touch-icon" sizes="180x180" href="/favicons/apple-touch-icon-180x180.png">',
      '',
      '<!-- Android Chrome -->',
      '<link rel="icon" type="image/png" sizes="192x192" href="/favicons/android-chrome-192x192.png">',
      '<link rel="icon" type="image/png" sizes="512x512" href="/favicons/android-chrome-512x512.png">',
      '<link rel="manifest" href="/favicons/site.webmanifest">',
      '',
      '<!-- Microsoft -->',
      `<meta name="msapplication-TileColor" content="${backgroundColor}">`,
      '<meta name="msapplication-TileImage" content="/favicons/mstile-144x144.png">',
      '<meta name="msapplication-config" content="/favicons/browserconfig.xml">',
      '',
      `<meta name="theme-color" content="${backgroundColor}">`,
    ].join('\n')
  }, [backgroundColor])

  const getNextJsCode = useCallback(() => {
    return `// layout.tsx metadata
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
  },
  manifest: '/favicons/site.webmanifest',
  other: {
    'msapplication-TileColor': '${backgroundColor}',
    'msapplication-config': '/favicons/browserconfig.xml',
  },
}`
  }, [backgroundColor])

  const filteredSizes = activeFilter === 'all' ? FAVICON_SIZES : FAVICON_SIZES.filter(s => s.category === activeFilter)

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

      {/* ═══ Image Editor — full-width section ═══ */}
      {sourceImage && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
          {/* Toolbar row */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('editor.title')}</h2>
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
                  onClick={resetEdits}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  {t('editor.reset')}
                </button>
              )}
            </div>
          </div>

          {/* Canvas area */}
          <div className="relative flex justify-center bg-gray-100 dark:bg-gray-900 rounded-lg p-2">
            {imageReady ? (
              <canvas
                ref={previewCanvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className={`max-w-full rounded border border-gray-200 dark:border-gray-700 ${
                  activeEditTool !== 'none' ? 'cursor-crosshair' : ''
                }`}
                style={{
                  maxHeight: '520px',
                  aspectRatio: imageRef.current
                    ? `${imageRef.current.naturalWidth} / ${imageRef.current.naturalHeight}`
                    : undefined,
                  touchAction: 'none',
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-40 text-gray-400">
                Loading...
              </div>
            )}
            {/* Tool hint overlays */}
            {imageReady && activeEditTool === 'crop' && !cropRect && !isDragging && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="bg-black/60 text-white text-sm px-4 py-2 rounded-full">
                  {t('editor.cropHint')}
                </span>
              </div>
            )}
            {imageReady && activeEditTool === 'colorPick' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="bg-black/60 text-white text-sm px-4 py-2 rounded-full">
                  {t('editor.colorPickHint')}
                </span>
              </div>
            )}
          </div>

          {/* Controls below canvas */}
          <div className="flex flex-wrap items-start gap-6">
            {/* Color Range controls */}
            {removeColor && (
              <div className="flex-1 min-w-[240px] bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg border-2 border-gray-300 dark:border-gray-600 shrink-0"
                    style={{ backgroundColor: `rgb(${removeColor.r}, ${removeColor.g}, ${removeColor.b})` }}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {t('editor.selectedColor')}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                      {rgbToHex(removeColor.r, removeColor.g, removeColor.b)} &middot; RGB({removeColor.r}, {removeColor.g}, {removeColor.b})
                    </p>
                  </div>
                  <button
                    onClick={() => setRemoveColor(null)}
                    className="ml-auto text-xs text-red-500 hover:text-red-600 dark:text-red-400 px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    {t('editor.clearColor')}
                  </button>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm text-gray-700 dark:text-gray-300">
                      {t('editor.colorThreshold')}
                    </label>
                    <span className="text-sm font-mono text-gray-500 dark:text-gray-400 tabular-nums">
                      {colorThreshold}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="120"
                    value={colorThreshold}
                    onChange={(e) => setColorThreshold(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                    <span>{t('editor.precise')}</span>
                    <span>{t('editor.broad')}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Crop info */}
            {cropRect && cropRect.w > 5 && cropRect.h > 5 && !isDragging && (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {t('editor.cropActive')}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                  {Math.round(cropRect.w)} × {Math.round(cropRect.h)}px
                </p>
                <button
                  onClick={() => setCropRect(null)}
                  className="text-xs text-red-500 hover:text-red-600 dark:text-red-400"
                >
                  {t('editor.cancelCrop')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ Settings + Results grid ═══ */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: Upload + Options */}
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
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </div>
            {sourceImage && (
              <button
                onClick={() => {
                  setSourceImage(null)
                  setGeneratedFavicons(new Map())
                  setFileName('')
                  resetEdits()
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
                className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                {t('upload.remove')}
              </button>
            )}
          </div>

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
              <input type="range" min="0" max="30" value={padding} onChange={(e) => setPadding(Number(e.target.value))} className="w-full accent-blue-600" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('options.borderRadius')}: {borderRadius}%
              </label>
              <input type="range" min="0" max="100" value={borderRadius} onChange={(e) => setBorderRadius(Number(e.target.value))} className="w-full accent-blue-600" />
            </div>
          </div>

          {/* Generate */}
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

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {filteredSizes.map(size => {
                    const dataUrl = generatedFavicons.get(size.name)
                    if (!dataUrl) return null
                    return (
                      <div key={size.name} className="group bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
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
                <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs overflow-x-auto leading-relaxed"><code>{getHtmlCode()}</code></pre>
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
                <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs overflow-x-auto leading-relaxed"><code>{getNextJsCode()}</code></pre>
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
                  <span className="text-blue-500 mt-0.5">•</span>{item}
                </p>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">{t('guide.tips.title')}</h3>
            <div className="space-y-2">
              {(t.raw('guide.tips.items') as string[]).map((item, i) => (
                <p key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">•</span>{item}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
