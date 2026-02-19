'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Upload, Copy, Check, Droplet, Eye, RotateCcw } from 'lucide-react'

interface ColorInfo {
  hex: string
  rgb: string
  hsl: string
}

interface PaletteColor extends ColorInfo {
  percent: number
}

interface ColorSwatch {
  id: string
  color: ColorInfo
}

export default function ColorExtractor() {
  const t = useTranslations('colorExtractor')
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [pickedColor, setPickedColor] = useState<ColorInfo | null>(null)
  const [palette, setPalette] = useState<PaletteColor[]>([])
  const [history, setHistory] = useState<ColorSwatch[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [magnifierPos, setMagnifierPos] = useState<{ x: number; y: number } | null>(null)
  const [magnifierColor, setMagnifierColor] = useState<string | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const magnifierCanvasRef = useRef<HTMLCanvasElement>(null)

  // Convert RGB to Hex
  const rgbToHex = (r: number, g: number, b: number): string => {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16)
      return hex.length === 1 ? '0' + hex : hex
    }).join('')
  }

  // Convert RGB to HSL
  const rgbToHsl = (r: number, g: number, b: number): string => {
    const rn = r / 255, gn = g / 255, bn = b / 255
    const max = Math.max(rn, gn, bn)
    const min = Math.min(rn, gn, bn)
    let h = 0, s = 0
    const l = (max + min) / 2

    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      switch (max) {
        case rn: h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6; break
        case gn: h = ((bn - rn) / d + 2) / 6; break
        case bn: h = ((rn - gn) / d + 4) / 6; break
      }
    }

    return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`
  }

  // Get color info from RGB
  const getColorInfo = useCallback((r: number, g: number, b: number): ColorInfo => {
    return {
      hex: rgbToHex(r, g, b),
      rgb: `rgb(${r}, ${g}, ${b})`,
      hsl: rgbToHsl(r, g, b)
    }
  }, [])

  // Median cut palette extraction with frequency
  const extractPalette = useCallback((imageData: ImageData, numColors: number = 8): PaletteColor[] => {
    const pixels: [number, number, number][] = []

    // Sample every 4th pixel for performance
    for (let i = 0; i < imageData.data.length; i += 16) {
      const r = imageData.data[i]
      const g = imageData.data[i + 1]
      const b = imageData.data[i + 2]
      const a = imageData.data[i + 3]
      if (a > 128) {
        pixels.push([r, g, b])
      }
    }

    if (pixels.length === 0) return []
    const totalPixels = pixels.length

    // Median cut
    const medianCut = (pixelList: [number, number, number][], depth: number): [number, number, number][][] => {
      if (depth === 0 || pixelList.length === 0) {
        return [pixelList]
      }

      let rMin = 255, rMax = 0, gMin = 255, gMax = 0, bMin = 255, bMax = 0
      pixelList.forEach(([r, g, b]) => {
        rMin = Math.min(rMin, r); rMax = Math.max(rMax, r)
        gMin = Math.min(gMin, g); gMax = Math.max(gMax, g)
        bMin = Math.min(bMin, b); bMax = Math.max(bMax, b)
      })

      const rRange = rMax - rMin
      const gRange = gMax - gMin
      const bRange = bMax - bMin

      let channel: 0 | 1 | 2 = 0
      if (gRange >= rRange && gRange >= bRange) channel = 1
      else if (bRange >= rRange && bRange >= gRange) channel = 2

      pixelList.sort((a, b) => a[channel] - b[channel])

      const mid = Math.floor(pixelList.length / 2)
      return [
        ...medianCut(pixelList.slice(0, mid), depth - 1),
        ...medianCut(pixelList.slice(mid), depth - 1)
      ]
    }

    const depth = Math.ceil(Math.log2(numColors))
    const buckets = medianCut(pixels, depth)

    const colors: PaletteColor[] = buckets
      .filter(bucket => bucket.length > 0)
      .slice(0, numColors)
      .map(bucket => {
        let rSum = 0, gSum = 0, bSum = 0
        bucket.forEach(([r, g, b]) => {
          rSum += r; gSum += g; bSum += b
        })
        const count = bucket.length
        const info = getColorInfo(
          Math.round(rSum / count),
          Math.round(gSum / count),
          Math.round(bSum / count)
        )
        return { ...info, percent: Math.round((count / totalPixels) * 100) }
      })
      .sort((a, b) => b.percent - a.percent)

    return colors
  }, [getColorInfo])

  // Draw image on canvas AFTER React renders the canvas element
  useEffect(() => {
    if (!image) return
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    // Use container width for responsive sizing
    const maxWidth = container.clientWidth - 2 // -2 for border
    const maxHeight = 700
    let width = image.width
    let height = image.height

    if (width > maxWidth) {
      height = (height * maxWidth) / width
      width = maxWidth
    }
    if (height > maxHeight) {
      width = (width * maxHeight) / height
      height = maxHeight
    }

    canvas.width = Math.round(width)
    canvas.height = Math.round(height)
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)

    // Extract palette
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const extractedPalette = extractPalette(imageData, 10)
    setPalette(extractedPalette)
  }, [image, extractPalette])

  // Load image from file
  const loadImage = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        setImage(img)
        setPickedColor(null)
        setHistory([])
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      loadImage(file)
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
      loadImage(file)
    }
  }

  // Get scaled canvas coordinates from mouse event
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = Math.floor((e.clientX - rect.left) * scaleX)
    const y = Math.floor((e.clientY - rect.top) * scaleY)
    return { x: Math.max(0, Math.min(canvas.width - 1, x)), y: Math.max(0, Math.min(canvas.height - 1, y)) }
  }

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const coords = getCanvasCoords(e)
    if (!coords) return

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    const pixel = ctx.getImageData(coords.x, coords.y, 1, 1).data
    const color = getColorInfo(pixel[0], pixel[1], pixel[2])
    setPickedColor(color)

    const newSwatch: ColorSwatch = { id: Date.now().toString(), color }
    setHistory(prev => [newSwatch, ...prev].slice(0, 20))
  }

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    const magnifierCanvas = magnifierCanvasRef.current
    if (!canvas || !magnifierCanvas) return
    const coords = getCanvasCoords(e)
    if (!coords) return

    setMagnifierPos({ x: e.clientX, y: e.clientY })

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    const magnifierCtx = magnifierCanvas.getContext('2d')
    if (!ctx || !magnifierCtx) return

    const pixel = ctx.getImageData(coords.x, coords.y, 1, 1).data
    setMagnifierColor(rgbToHex(pixel[0], pixel[1], pixel[2]))

    const magnifierSize = 120
    const zoom = 6
    magnifierCanvas.width = magnifierSize
    magnifierCanvas.height = magnifierSize

    const sourceSize = magnifierSize / zoom
    const sourceX = Math.max(0, Math.min(canvas.width - sourceSize, coords.x - sourceSize / 2))
    const sourceY = Math.max(0, Math.min(canvas.height - sourceSize, coords.y - sourceSize / 2))

    magnifierCtx.imageSmoothingEnabled = false
    magnifierCtx.drawImage(
      canvas,
      sourceX, sourceY, sourceSize, sourceSize,
      0, 0, magnifierSize, magnifierSize
    )

    // Crosshair
    magnifierCtx.strokeStyle = '#fff'
    magnifierCtx.lineWidth = 2
    magnifierCtx.beginPath()
    magnifierCtx.moveTo(magnifierSize / 2, 0)
    magnifierCtx.lineTo(magnifierSize / 2, magnifierSize)
    magnifierCtx.moveTo(0, magnifierSize / 2)
    magnifierCtx.lineTo(magnifierSize, magnifierSize / 2)
    magnifierCtx.stroke()
    magnifierCtx.strokeStyle = '#000'
    magnifierCtx.lineWidth = 1
    magnifierCtx.stroke()
  }

  const handleCanvasMouseLeave = () => {
    setMagnifierPos(null)
  }

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

  const exportPalette = (format: 'css' | 'tailwind' | 'json') => {
    let output = ''
    if (format === 'css') {
      output = ':root {\n'
      palette.forEach((color, i) => {
        output += `  --color-${i + 1}: ${color.hex};\n`
      })
      output += '}'
    } else if (format === 'tailwind') {
      output = 'module.exports = {\n  theme: {\n    extend: {\n      colors: {\n'
      palette.forEach((color, i) => {
        output += `        'palette-${i + 1}': '${color.hex}',\n`
      })
      output += '      }\n    }\n  }\n}'
    } else if (format === 'json') {
      output = JSON.stringify(palette.map(c => ({ hex: c.hex, percent: c.percent + '%' })), null, 2)
    }
    copyToClipboard(output, `export-${format}`)
  }

  const handleReset = () => {
    setImage(null)
    setPickedColor(null)
    setPalette([])
    setHistory([])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
        </div>
        {image && (
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            {t('upload')}
          </button>
        )}
      </div>

      {/* Upload Section - show only when no image */}
      {!image && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
              isDragging
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                : 'border-gray-300 dark:border-gray-600'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">{t('dragDrop')}</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-8 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors"
            >
              {t('upload')}
            </button>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Image canvas + color picker */}
      {image && (
        <>
          {/* Canvas - full width */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
            <div className="mb-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Eye className="w-4 h-4" />
              <span>{t('clickToExtract')}</span>
            </div>
            <div ref={containerRef} className="relative w-full">
              <canvas
                ref={canvasRef}
                className="border border-gray-200 dark:border-gray-700 rounded-lg cursor-crosshair w-full"
                style={{ imageRendering: 'auto' }}
                onClick={handleCanvasClick}
                onMouseMove={handleCanvasMouseMove}
                onMouseLeave={handleCanvasMouseLeave}
              />
              {/* Magnifier */}
              {magnifierPos && (
                <div
                  className="fixed pointer-events-none z-50"
                  style={{ left: magnifierPos.x + 20, top: magnifierPos.y - 140 }}
                >
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border-2 border-gray-300 dark:border-gray-600 overflow-hidden">
                    <canvas ref={magnifierCanvasRef} className="block" />
                    {magnifierColor && (
                      <div
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono"
                        style={{ backgroundColor: magnifierColor }}
                      >
                        <span className="bg-white/80 dark:bg-black/60 text-gray-900 dark:text-white px-2 py-0.5 rounded">
                          {magnifierColor}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Picked color + Palette side by side */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Picked Color */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Droplet className="w-5 h-5" />
                  {t('pickedColor')}
                </h2>

                {pickedColor ? (
                  <div className="space-y-4">
                    <div
                      className="w-full h-28 rounded-xl shadow-inner border border-gray-200 dark:border-gray-700"
                      style={{ backgroundColor: pickedColor.hex }}
                    />
                    <div className="space-y-2">
                      {(['hex', 'rgb', 'hsl'] as const).map(key => (
                        <div key={key} className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase">{t(key)}</span>
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-mono text-gray-900 dark:text-white">{pickedColor[key]}</code>
                            <button
                              onClick={() => copyToClipboard(pickedColor[key], key)}
                              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                            >
                              {copiedId === key ? (
                                <Check className="w-4 h-4 text-green-500" />
                              ) : (
                                <Copy className="w-4 h-4 text-gray-500" />
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-8">
                    {t('clickToExtract')}
                  </p>
                )}
              </div>
            </div>

            {/* Palette - dominant colors */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('palette')}</h2>
                  <div className="flex gap-2">
                    {(['css', 'tailwind', 'json'] as const).map(fmt => (
                      <button
                        key={fmt}
                        onClick={() => exportPalette(fmt)}
                        className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                      >
                        {copiedId === `export-${fmt}` ? t('copied') : t(fmt === 'css' ? 'cssVars' : fmt === 'tailwind' ? 'tailwind' : 'json')}
                      </button>
                    ))}
                  </div>
                </div>

                {palette.length > 0 ? (
                  <>
                    {/* Color bar */}
                    <div className="flex rounded-xl overflow-hidden h-12 mb-4 shadow-inner">
                      {palette.map((color, index) => (
                        <div
                          key={index}
                          className="cursor-pointer hover:opacity-80 transition-opacity relative group"
                          style={{
                            backgroundColor: color.hex,
                            flex: color.percent || 1,
                          }}
                          onClick={() => copyToClipboard(color.hex, `bar-${index}`)}
                          title={`${color.hex} (${color.percent}%)`}
                        >
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-xs font-bold bg-white/80 dark:bg-black/60 text-gray-900 dark:text-white px-1 rounded">
                              {color.percent}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Color cards */}
                    <div className="grid grid-cols-5 md:grid-cols-10 gap-3">
                      {palette.map((color, index) => (
                        <div key={index} className="space-y-1.5">
                          <div
                            className="w-full aspect-square rounded-lg shadow-md cursor-pointer hover:scale-110 transition-transform border border-gray-200 dark:border-gray-700"
                            style={{ backgroundColor: color.hex }}
                            onClick={() => {
                              copyToClipboard(color.hex, `palette-${index}`)
                              setPickedColor(color)
                            }}
                            title={`${color.hex} (${color.percent}%)`}
                          />
                          <div className="text-center">
                            <code className="text-[10px] font-mono text-gray-600 dark:text-gray-400 block">{color.hex}</code>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500">{color.percent}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-8">
                    {t('noImage')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('history')}</h2>
          <div className="grid grid-cols-5 md:grid-cols-10 gap-3">
            {history.map((swatch) => (
              <div key={swatch.id} className="space-y-1">
                <div
                  className="w-full aspect-square rounded-lg shadow-md cursor-pointer hover:scale-110 transition-transform border border-gray-200 dark:border-gray-700"
                  style={{ backgroundColor: swatch.color.hex }}
                  onClick={() => {
                    copyToClipboard(swatch.color.hex, swatch.id)
                    setPickedColor(swatch.color)
                  }}
                  title={swatch.color.hex}
                />
                <code className="text-[10px] font-mono text-gray-600 dark:text-gray-400 block text-center truncate">
                  {swatch.color.hex}
                </code>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          {t('guide.title')}
        </h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
              {t('guide.howToUse.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.howToUse.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start gap-3 text-gray-600 dark:text-gray-300">
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
            <ul className="space-y-2">
              {(t.raw('guide.tips.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start gap-3 text-gray-600 dark:text-gray-300">
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
