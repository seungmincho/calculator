'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  Search, Download, Image as ImageIcon, Check, Copy,
  ExternalLink, ChevronDown, ChevronUp, Loader2,
  FileArchive, Layers, Filter, X, BookOpen, Zap,
  ArrowUpDown, ToggleLeft, ToggleRight
} from 'lucide-react'

interface ScrapedImage {
  src: string
  alt: string
  width: number
  height: number
  loaded: boolean
  error: boolean
  selected: boolean
  type: string
  group: string
  pixelCount: number
  fingerprint: string // 이미지 내용 기반 해시 (8x8 축소 → 64개 밝기값)
}

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif']
const PROXY_PREFIX = '/api/proxy-image?url='

/** 이미지를 8x8로 축소하여 밝기 기반 fingerprint 생성 (perceptual hash) */
function computeFingerprint(imgEl: HTMLImageElement): string {
  try {
    const size = 8
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return ''
    ctx.drawImage(imgEl, 0, 0, size, size)
    const data = ctx.getImageData(0, 0, size, size).data
    // 각 픽셀의 밝기(grayscale)를 2자리 hex로 변환
    const vals: number[] = []
    for (let i = 0; i < data.length; i += 4) {
      // luminance: 0.299R + 0.587G + 0.114B
      const gray = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114)
      // 16단계로 양자화 (정확한 매치 대신 유사 매치)
      vals.push(Math.floor(gray / 16))
    }
    return vals.map(v => v.toString(16)).join('')
  } catch {
    return ''
  }
}

/** fingerprint 간 유사도 (0~1, 1이 동일) */
function fingerprintSimilarity(a: string, b: string): number {
  if (!a || !b || a.length !== b.length) return 0
  let match = 0
  for (let i = 0; i < a.length; i++) {
    const diff = Math.abs(parseInt(a[i], 16) - parseInt(b[i], 16))
    if (diff <= 1) match++ // 1단계 차이까지 허용
  }
  return match / a.length
}

/** 같은 이미지(내용 기반)의 여러 사이즈 중 가장 큰 것만 남기기 */
function deduplicateByContent(imgs: ScrapedImage[]): ScrapedImage[] {
  const withFp = imgs.filter(i => i.fingerprint)
  const noFp = imgs.filter(i => !i.fingerprint)

  // fingerprint가 90% 이상 유사하면 같은 이미지로 판단
  const used = new Set<number>()
  const result: ScrapedImage[] = []

  for (let i = 0; i < withFp.length; i++) {
    if (used.has(i)) continue
    // 이 이미지와 유사한 것들 모으기
    const group = [i]
    for (let j = i + 1; j < withFp.length; j++) {
      if (used.has(j)) continue
      if (fingerprintSimilarity(withFp[i].fingerprint, withFp[j].fingerprint) >= 0.9) {
        group.push(j)
      }
    }
    // 그룹에서 가장 큰 것 선택
    let best = i
    for (const idx of group) {
      used.add(idx)
      if (withFp[idx].pixelCount > withFp[best].pixelCount) {
        best = idx
      }
    }
    result.push(withFp[best])
  }

  return [...result, ...noFp]
}

function getImageType(url: string): string {
  try {
    const pathname = new URL(url).pathname.toLowerCase()
    const ext = pathname.split('.').pop() || ''
    if (['jpg', 'jpeg'].includes(ext)) return 'jpg'
    if (IMAGE_EXTENSIONS.includes(ext)) return ext
    return 'other'
  } catch {
    return 'other'
  }
}

function getGroupKey(url: string): string {
  try {
    const u = new URL(url)
    const parts = u.pathname.split('/')
    if (parts.length >= 3) {
      return u.hostname + '/' + parts.slice(1, Math.min(parts.length - 1, 3)).join('/')
    }
    return u.hostname
  } catch {
    return 'unknown'
  }
}

function resolveUrl(src: string, baseUrl: string): string {
  try {
    return new URL(src, baseUrl).href
  } catch {
    return ''
  }
}

function extractImagesFromHtml(html: string, pageUrl: string): string[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const urls = new Set<string>()

  doc.querySelectorAll('img').forEach(img => {
    const src = img.getAttribute('src')
    if (src) {
      const resolved = resolveUrl(src, pageUrl)
      if (resolved) urls.add(resolved)
    }
    const srcset = img.getAttribute('srcset')
    if (srcset) {
      srcset.split(',').forEach(entry => {
        const [url] = entry.trim().split(/\s+/)
        if (url) {
          const resolved = resolveUrl(url, pageUrl)
          if (resolved) urls.add(resolved)
        }
      })
    }
  })

  doc.querySelectorAll('picture source').forEach(source => {
    const srcset = source.getAttribute('srcset')
    if (srcset) {
      srcset.split(',').forEach(entry => {
        const [url] = entry.trim().split(/\s+/)
        if (url) {
          const resolved = resolveUrl(url, pageUrl)
          if (resolved) urls.add(resolved)
        }
      })
    }
  })

  doc.querySelectorAll('meta[property="og:image"], meta[name="twitter:image"]').forEach(meta => {
    const content = meta.getAttribute('content')
    if (content) {
      const resolved = resolveUrl(content, pageUrl)
      if (resolved) urls.add(resolved)
    }
  })

  doc.querySelectorAll('[style]').forEach(el => {
    const style = el.getAttribute('style') || ''
    const matches = style.matchAll(/url\(['"]?([^'")\s]+)['"]?\)/g)
    for (const m of matches) {
      const resolved = resolveUrl(m[1], pageUrl)
      if (resolved) urls.add(resolved)
    }
  })

  return Array.from(urls).filter(u => {
    if (u.startsWith('data:image')) return true
    if (u.startsWith('data:')) return false
    return true
  })
}

const RECENT_URLS_KEY = 'image-scraper-recent-urls'
const MAX_RECENT = 10

function getRecentUrls(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_URLS_KEY) || '[]')
  } catch {
    return []
  }
}

function addRecentUrl(url: string) {
  const list = getRecentUrls().filter(u => u !== url)
  list.unshift(url)
  localStorage.setItem(RECENT_URLS_KEY, JSON.stringify(list.slice(0, MAX_RECENT)))
}

type SortMode = 'size-desc' | 'size-asc' | 'group' | 'original'

export default function ImageScraper() {
  const t = useTranslations('imageScraper')

  const [url, setUrl] = useState('')
  const [scanning, setScanning] = useState(false)
  const [images, setImages] = useState<ScrapedImage[]>([])
  const [error, setError] = useState('')
  const [filterMinSize, setFilterMinSize] = useState(50)
  const [filterType, setFilterType] = useState('all')
  const [showRecent, setShowRecent] = useState(false)
  const [recentUrls, setRecentUrls] = useState<string[]>([])
  const [downloading, setDownloading] = useState(false)
  const [merging, setMerging] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [mergeGap, setMergeGap] = useState(0)
  const [mergeBg, setMergeBg] = useState('#ffffff')
  const [mergeWidth, setMergeWidth] = useState(1200)
  const [showMergeOptions, setShowMergeOptions] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [sortMode, setSortMode] = useState<SortMode>('size-desc')
  const [dedup, setDedup] = useState(true)
  const [lastClickIdx, setLastClickIdx] = useState<number | null>(null)
  const [showMergePanel, setShowMergePanel] = useState(false)
  const [mergeOrder, setMergeOrder] = useState<string[]>([]) // src 순서
  const [dragIdx, setDragIdx] = useState<number | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setRecentUrls(getRecentUrls())
  }, [])

  const handleScan = useCallback(async () => {
    if (!url.trim()) return
    let targetUrl = url.trim()
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = 'https://' + targetUrl
      setUrl(targetUrl)
    }

    setScanning(true)
    setError('')
    setImages([])
    setLastClickIdx(null)

    try {
      const resp = await fetch(`/api/fetch-page?url=${encodeURIComponent(targetUrl)}`)
      const data = await resp.json()

      if (!resp.ok) {
        setError(data.error || t('fetchError'))
        setScanning(false)
        return
      }

      const pageUrl = data.url || targetUrl
      const imageUrls = extractImagesFromHtml(data.html, pageUrl)

      if (imageUrls.length === 0) {
        setError(t('noImages'))
        setScanning(false)
        return
      }

      const scraped: ScrapedImage[] = imageUrls.map(src => ({
        src,
        alt: '',
        width: 0,
        height: 0,
        loaded: false,
        error: false,
        selected: false,
        type: getImageType(src),
        group: getGroupKey(src),
        pixelCount: 0,
        fingerprint: '',
      }))

      setImages(scraped)
      addRecentUrl(targetUrl)
      setRecentUrls(getRecentUrls())

      // 이미지 로드 → 크기 + fingerprint 계산
      scraped.forEach((img, idx) => {
        const loadImage = (imgEl: HTMLImageElement) => {
          const fp = computeFingerprint(imgEl)
          setImages(prev => {
            const next = [...prev]
            if (next[idx]) {
              next[idx] = {
                ...next[idx],
                width: imgEl.naturalWidth,
                height: imgEl.naturalHeight,
                loaded: true,
                pixelCount: imgEl.naturalWidth * imgEl.naturalHeight,
                fingerprint: fp,
              }
            }
            return next
          })
        }

        const el = new window.Image()
        el.crossOrigin = 'anonymous'
        el.onload = () => loadImage(el)
        el.onerror = () => {
          const proxyEl = new window.Image()
          proxyEl.crossOrigin = 'anonymous'
          proxyEl.onload = () => loadImage(proxyEl)
          proxyEl.onerror = () => {
            setImages(prev => {
              const next = [...prev]
              if (next[idx]) {
                next[idx] = { ...next[idx], error: true, loaded: true }
              }
              return next
            })
          }
          proxyEl.src = PROXY_PREFIX + encodeURIComponent(img.src)
        }
        el.src = img.src
      })
    } catch {
      setError(t('fetchError'))
    } finally {
      setScanning(false)
    }
  }, [url, t])

  // 필터링 + 중복 제거 + 정렬
  const processedImages = useMemo(() => {
    let filtered = images.filter(img => {
      if (img.error) return false
      if (filterMinSize > 0 && img.loaded && (img.width < filterMinSize || img.height < filterMinSize)) return false
      if (filterType !== 'all' && img.type !== filterType) return false
      return true
    })

    // 내용 기반 중복 제거
    if (dedup) {
      filtered = deduplicateByContent(filtered)
    }

    // 정렬
    if (sortMode === 'size-desc') {
      filtered.sort((a, b) => b.pixelCount - a.pixelCount)
    } else if (sortMode === 'size-asc') {
      filtered.sort((a, b) => a.pixelCount - b.pixelCount)
    } else if (sortMode === 'group') {
      filtered.sort((a, b) => {
        if (a.group !== b.group) return a.group.localeCompare(b.group)
        return b.pixelCount - a.pixelCount
      })
    }

    return filtered
  }, [images, filterMinSize, filterType, dedup, sortMode])

  const selectedImages = processedImages.filter(i => i.selected)
  const allSelected = processedImages.length > 0 && processedImages.every(i => i.selected)

  const toggleSelectAll = useCallback(() => {
    const newVal = !allSelected
    const visibleSrcs = new Set(processedImages.map(i => i.src))
    setImages(prev => prev.map(img =>
      visibleSrcs.has(img.src) ? { ...img, selected: newVal } : img
    ))
  }, [allSelected, processedImages])

  const toggleSelect = useCallback((src: string, idx: number, shiftKey: boolean) => {
    if (shiftKey && lastClickIdx !== null) {
      const start = Math.min(lastClickIdx, idx)
      const end = Math.max(lastClickIdx, idx)
      const rangeSrcs = new Set(processedImages.slice(start, end + 1).map(i => i.src))
      setImages(prev => prev.map(img =>
        rangeSrcs.has(img.src) ? { ...img, selected: true } : img
      ))
    } else {
      setImages(prev => prev.map(img => img.src === src ? { ...img, selected: !img.selected } : img))
    }
    setLastClickIdx(idx)
  }, [lastClickIdx, processedImages])

  // 합치기 패널 열기: 선택된 이미지 순서 초기화
  const openMergePanel = useCallback(() => {
    setMergeOrder(selectedImages.map(i => i.src))
    setShowMergePanel(true)
  }, [selectedImages])

  // 드래그앤드롭 순서 변경
  const handleDragStart = useCallback((idx: number) => {
    setDragIdx(idx)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === idx) return
    setMergeOrder(prev => {
      const next = [...prev]
      const [moved] = next.splice(dragIdx, 1)
      next.splice(idx, 0, moved)
      return next
    })
    setDragIdx(idx)
  }, [dragIdx])

  const handleDragEnd = useCallback(() => {
    setDragIdx(null)
  }, [])

  const moveMergeItem = useCallback((from: number, to: number) => {
    if (to < 0 || to >= mergeOrder.length) return
    setMergeOrder(prev => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }, [mergeOrder.length])

  const removeMergeItem = useCallback((idx: number) => {
    setMergeOrder(prev => prev.filter((_, i) => i !== idx))
  }, [])

  const quickSelectBySize = useCallback((minPx: number) => {
    const visibleSrcs = new Set(processedImages.map(i => i.src))
    setImages(prev => prev.map(img => {
      if (!visibleSrcs.has(img.src)) return img
      return { ...img, selected: img.pixelCount >= minPx * minPx }
    }))
  }, [processedImages])

  const copyToClipboard = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.left = '-999999px'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  const handleDownloadZip = useCallback(async () => {
    if (selectedImages.length === 0) return
    setDownloading(true)
    try {
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()

      await Promise.all(selectedImages.map(async (img, idx) => {
        try {
          let resp: Response
          try {
            resp = await fetch(img.src, { mode: 'cors' })
            if (!resp.ok) throw new Error('Direct fetch failed')
          } catch {
            resp = await fetch(PROXY_PREFIX + encodeURIComponent(img.src))
          }
          const blob = await resp.blob()
          const ext = img.type === 'other' ? 'jpg' : img.type
          zip.file(`image-${String(idx + 1).padStart(3, '0')}.${ext}`, blob)
        } catch {
          // skip
        }
      }))

      const content = await zip.generateAsync({ type: 'blob' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(content)
      a.download = t('zipFilename')
      a.click()
      URL.revokeObjectURL(a.href)
    } catch {
      // zip failed
    } finally {
      setDownloading(false)
    }
  }, [selectedImages, t])

  const handleMergeVertical = useCallback(async () => {
    // mergeOrder가 있으면 그 순서로, 아니면 selectedImages 순서로
    const orderedSrcs = mergeOrder.length > 0 ? mergeOrder : selectedImages.map(i => i.src)
    const imgMap = new Map(images.map(i => [i.src, i]))
    const orderedImgs = orderedSrcs.map(src => imgMap.get(src)).filter(Boolean) as ScrapedImage[]
    if (orderedImgs.length === 0) return
    setMerging(true)
    try {
      const loadedImgs = await Promise.all(orderedImgs.map(img => {
        return new Promise<HTMLImageElement>((resolve, reject) => {
          const el = new window.Image()
          el.crossOrigin = 'anonymous'
          el.onload = () => resolve(el)
          el.onerror = () => {
            const proxyEl = new window.Image()
            proxyEl.crossOrigin = 'anonymous'
            proxyEl.onload = () => resolve(proxyEl)
            proxyEl.onerror = () => reject(new Error('Failed'))
            proxyEl.src = PROXY_PREFIX + encodeURIComponent(img.src)
          }
          el.src = img.src
        })
      }))

      const validImgs = loadedImgs.filter(Boolean)
      if (validImgs.length === 0) return

      const canvasWidth = mergeWidth
      let totalHeight = 0
      const scaledHeights: number[] = []
      validImgs.forEach(img => {
        const scale = canvasWidth / img.naturalWidth
        const h = Math.round(img.naturalHeight * scale)
        scaledHeights.push(h)
        totalHeight += h
      })
      totalHeight += mergeGap * (validImgs.length - 1)

      const maxHeight = 16384
      const clampedHeight = Math.min(totalHeight, maxHeight)

      const canvas = document.createElement('canvas')
      canvas.width = canvasWidth
      canvas.height = clampedHeight
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = mergeBg
      ctx.fillRect(0, 0, canvasWidth, clampedHeight)

      let y = 0
      for (let i = 0; i < validImgs.length; i++) {
        if (y >= clampedHeight) break
        ctx.drawImage(validImgs[i], 0, y, canvasWidth, scaledHeights[i])
        y += scaledHeights[i] + mergeGap
      }

      canvas.toBlob(blob => {
        if (!blob) return
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = t('mergedFilename')
        a.click()
        URL.revokeObjectURL(a.href)
      }, 'image/png')
    } catch {
      // merge failed
    } finally {
      setMerging(false)
    }
  }, [selectedImages, mergeOrder, images, mergeWidth, mergeGap, mergeBg, t])

  const handleDownloadSingle = useCallback(async (img: ScrapedImage) => {
    try {
      let resp: Response
      try {
        resp = await fetch(img.src, { mode: 'cors' })
        if (!resp.ok) throw new Error('fail')
      } catch {
        resp = await fetch(PROXY_PREFIX + encodeURIComponent(img.src))
      }
      const blob = await resp.blob()
      const ext = img.type === 'other' ? 'jpg' : img.type
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `image.${ext}`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch {
      window.open(img.src, '_blank')
    }
  }, [])

  const imageTypes = ['all', ...new Set(images.filter(i => !i.error).map(i => i.type))]

  // 중복 제거 통계
  const dedupStats = useMemo(() => {
    if (!dedup) return null
    const total = images.filter(i => !i.error && i.loaded).length
    const after = processedImages.length
    return total > after ? { removed: total - after, total } : null
  }, [dedup, images, processedImages])

  const renderImageCard = (img: ScrapedImage, displayIdx: number) => (
    <div
      key={img.src}
      className={`group relative bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border-2 transition-colors cursor-pointer ${
        img.selected ? 'border-blue-500' : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
      }`}
      onClick={e => toggleSelect(img.src, displayIdx, e.shiftKey)}
    >
      <div className={`absolute top-2 left-2 z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
        img.selected
          ? 'bg-blue-500 border-blue-500 text-white'
          : 'bg-white/80 dark:bg-gray-800/80 border-gray-300 dark:border-gray-500'
      }`}>
        {img.selected && <Check className="w-4 h-4" />}
      </div>

      {img.loaded && img.width > 0 && (
        <div className={`absolute top-2 right-2 z-10 px-1.5 py-0.5 rounded text-xs font-medium ${
          img.pixelCount >= 500 * 500
            ? 'bg-green-500/90 text-white'
            : img.pixelCount >= 200 * 200
              ? 'bg-yellow-500/90 text-white'
              : 'bg-gray-500/90 text-white'
        }`}>
          {img.width > img.height ? img.width : img.height}px
        </div>
      )}

      <div className="aspect-square bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
        {!img.loaded ? (
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        ) : img.error ? (
          <ImageIcon className="w-8 h-8 text-gray-300 dark:text-gray-600" />
        ) : (
          <img
            src={img.src}
            alt={img.alt || `Image ${displayIdx + 1}`}
            className="w-full h-full object-contain"
            loading="lazy"
            onError={e => {
              const target = e.target as HTMLImageElement
              if (!target.src.includes('/api/proxy-image')) {
                target.src = PROXY_PREFIX + encodeURIComponent(img.src)
              }
            }}
          />
        )}
      </div>

      <div className="p-2">
        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {img.loaded && !img.error && img.width > 0
            ? `${img.width} × ${img.height}`
            : img.error
              ? t('loadError')
              : t('unknownSize')
          }
          {img.type !== 'other' && (
            <span className="ml-1 px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs uppercase">
              {img.type}
            </span>
          )}
        </div>

        <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={e => { e.stopPropagation(); copyToClipboard(img.src, img.src) }}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
            title={t('copyUrl')}
          >
            {copiedId === img.src ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={e => { e.stopPropagation(); window.open(img.src, '_blank') }}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
            title={t('openOriginal')}
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); handleDownloadSingle(img) }}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
            title={t('downloadSingle')}
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* URL Input */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleScan()}
              onFocus={() => recentUrls.length > 0 && setShowRecent(true)}
              onBlur={() => setTimeout(() => setShowRecent(false), 200)}
              placeholder={t('urlPlaceholder')}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 pr-10"
            />
            {url && (
              <button
                onClick={() => { setUrl(''); setImages([]); setError('') }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            {showRecent && recentUrls.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-600">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{t('recentUrls')}</span>
                  <button
                    onClick={() => {
                      localStorage.removeItem(RECENT_URLS_KEY)
                      setRecentUrls([])
                    }}
                    className="text-xs text-red-500 hover:text-red-600"
                  >
                    {t('clearHistory')}
                  </button>
                </div>
                {recentUrls.map(u => (
                  <button
                    key={u}
                    onMouseDown={() => { setUrl(u); setShowRecent(false) }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 truncate"
                  >
                    {u}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={handleScan}
            disabled={scanning || !url.trim()}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-6 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
          >
            {scanning ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> {t('scanning')}</>
            ) : (
              <><Search className="w-5 h-5" /> {t('scan')}</>
            )}
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 rounded-lg text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      {processedImages.length > 0 && (
        <>
          {/* Toolbar */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 space-y-4">
            {/* Row 1: Count, Select, Dedup toggle */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('foundImages', { count: processedImages.length })}
                {dedupStats && (
                  <span className="ml-1 text-xs text-green-600 dark:text-green-400">
                    ({t('dedupRemoved', { count: dedupStats.removed })})
                  </span>
                )}
              </span>
              <button
                onClick={toggleSelectAll}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                {allSelected ? t('deselectAll') : t('selectAll')}
              </button>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {t('selected', { count: selectedImages.length })}
              </span>

              <div className="flex-1" />

              <button
                onClick={() => setDedup(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  dedup
                    ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}
              >
                {dedup ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                {t('viewDeduped')}
              </button>
            </div>

            {/* Row 2: Quick Select + Sort + Filter */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1">
                <Zap className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">{t('quickSelect')}:</span>
                {[
                  { label: t('sizeXL'), min: 800 },
                  { label: t('sizeLG'), min: 500 },
                  { label: t('sizeMD'), min: 200 },
                ].map(({ label, min }) => (
                  <button
                    key={min}
                    onClick={() => quickSelectBySize(min)}
                    className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-900 text-gray-700 dark:text-gray-300 rounded transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex-1" />

              <div className="flex items-center gap-1">
                <ArrowUpDown className="w-4 h-4 text-gray-400" />
                <select
                  value={sortMode}
                  onChange={e => setSortMode(e.target.value as SortMode)}
                  className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="size-desc">{t('sortSizeDesc')}</option>
                  <option value="size-asc">{t('sortSizeAsc')}</option>
                  <option value="group">{t('sortGroup')}</option>
                  <option value="original">{t('sortOriginal')}</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  value={filterMinSize}
                  onChange={e => setFilterMinSize(Number(e.target.value))}
                  className="w-16 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  title={t('filterMinSize')}
                />
                <select
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                  className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {imageTypes.map(type => (
                    <option key={type} value={type}>
                      {type === 'all' ? t('allTypes') : type.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 3: Hint + Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {t('shiftClickHint')}
              </span>

              <div className="flex-1" />

              <button
                onClick={handleDownloadZip}
                disabled={downloading || selectedImages.length === 0}
                className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 flex items-center gap-2"
              >
                {downloading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> {t('downloading')}</>
                ) : (
                  <><FileArchive className="w-4 h-4" /> {t('downloadZip')} ({selectedImages.length})</>
                )}
              </button>

              <div className="relative">
                <div className="flex">
                  <button
                    onClick={openMergePanel}
                    disabled={selectedImages.length === 0}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-l-lg px-4 py-2 text-sm font-medium hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <Layers className="w-4 h-4" /> {t('downloadMerged')} ({selectedImages.length})
                  </button>
                  <button
                    onClick={() => setShowMergeOptions(v => !v)}
                    className="bg-gradient-to-r from-purple-700 to-pink-700 text-white rounded-r-lg px-2 py-2 hover:from-purple-800 hover:to-pink-800 border-l border-purple-500"
                  >
                    {showMergeOptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {showMergeOptions && (
                  <div className="absolute top-full right-0 mt-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-4 z-10 min-w-64">
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400">{t('mergeWidth')} (px)</label>
                        <input
                          type="number"
                          value={mergeWidth}
                          onChange={e => setMergeWidth(Number(e.target.value))}
                          min={200}
                          max={4000}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400">{t('mergeGap')} (px)</label>
                        <input
                          type="number"
                          value={mergeGap}
                          onChange={e => setMergeGap(Number(e.target.value))}
                          min={0}
                          max={100}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400">{t('mergeBackground')}</label>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="color"
                            value={mergeBg}
                            onChange={e => setMergeBg(e.target.value)}
                            className="w-8 h-8 rounded cursor-pointer"
                          />
                          <input
                            type="text"
                            value={mergeBg}
                            onChange={e => setMergeBg(e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Merge Order Panel */}
          {showMergePanel && mergeOrder.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-500" />
                  {t('mergeOrderTitle')} ({mergeOrder.length})
                </h3>
                <div className="flex items-center gap-2">
                  {/* Merge Options inline */}
                  <div className="flex items-center gap-2 text-xs">
                    <label className="text-gray-500 dark:text-gray-400">{t('mergeWidth')}</label>
                    <input
                      type="number"
                      value={mergeWidth}
                      onChange={e => setMergeWidth(Number(e.target.value))}
                      min={200} max={4000}
                      className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                    />
                    <label className="text-gray-500 dark:text-gray-400">{t('mergeGap')}</label>
                    <input
                      type="number"
                      value={mergeGap}
                      onChange={e => setMergeGap(Number(e.target.value))}
                      min={0} max={100}
                      className="w-14 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                    />
                    <input
                      type="color"
                      value={mergeBg}
                      onChange={e => setMergeBg(e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer"
                      title={t('mergeBackground')}
                    />
                  </div>
                  <button
                    onClick={() => { handleMergeVertical(); setShowMergePanel(false) }}
                    disabled={merging || mergeOrder.length === 0}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg px-4 py-1.5 text-xs font-medium hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 flex items-center gap-1"
                  >
                    {merging ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                    {t('mergeAndDownload')}
                  </button>
                  <button
                    onClick={() => setShowMergePanel(false)}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">{t('mergeOrderHint')}</p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {mergeOrder.map((src, idx) => {
                  const img = images.find(i => i.src === src)
                  if (!img) return null
                  return (
                    <div
                      key={src}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={e => handleDragOver(e, idx)}
                      onDragEnd={handleDragEnd}
                      className={`relative flex-shrink-0 w-20 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden border-2 cursor-grab active:cursor-grabbing transition-all ${
                        dragIdx === idx ? 'border-purple-500 opacity-50' : 'border-transparent'
                      }`}
                    >
                      <div className="absolute top-0.5 left-0.5 z-10 w-5 h-5 bg-purple-600 text-white rounded-full text-xs flex items-center justify-center font-bold">
                        {idx + 1}
                      </div>
                      <button
                        onClick={() => removeMergeItem(idx)}
                        className="absolute top-0.5 right-0.5 z-10 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <div className="aspect-square flex items-center justify-center">
                        <img
                          src={img.src}
                          alt=""
                          className="w-full h-full object-contain"
                          onError={e => {
                            const target = e.target as HTMLImageElement
                            if (!target.src.includes('/api/proxy-image')) {
                              target.src = PROXY_PREFIX + encodeURIComponent(img.src)
                            }
                          }}
                        />
                      </div>
                      <div className="flex justify-center gap-0.5 py-0.5">
                        <button
                          onClick={() => moveMergeItem(idx, idx - 1)}
                          disabled={idx === 0}
                          className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        >
                          <ChevronDown className="w-3 h-3 rotate-90" />
                        </button>
                        <button
                          onClick={() => moveMergeItem(idx, idx + 1)}
                          disabled={idx === mergeOrder.length - 1}
                          className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        >
                          <ChevronDown className="w-3 h-3 -rotate-90" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Image Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {processedImages.map((img, idx) => renderImageCard(img, idx))}
          </div>
        </>
      )}

      {/* Guide */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <button
          onClick={() => setShowGuide(v => !v)}
          className="w-full flex items-center justify-between p-6 text-left"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('guide.title')}</h2>
          </div>
          {showGuide ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>
        {showGuide && (
          <div className="px-6 pb-6 space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{t('guide.guide.whatIs.title')}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('guide.guide.whatIs.description')}</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{t('guide.guide.howToUse.title')}</h3>
              <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
                {(t.raw('guide.guide.howToUse.items') as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{t('guide.guide.tips.title')}</h3>
              <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
                {(t.raw('guide.guide.tips.items') as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{t('guide.guide.faq.title')}</h3>
              <div className="space-y-3">
                {(t.raw('guide.guide.faq.items') as Array<{q: string; a: string}>).map((item, i) => (
                  <div key={i} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{item.q}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{item.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
