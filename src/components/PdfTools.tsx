'use client'

import { useState, useCallback, useRef, DragEvent } from 'react'
import { useTranslations } from 'next-intl'
import {
  FileUp,
  FilePlus,
  Scissors,
  RotateCw,
  Image,
  Download,
  Trash2,
  GripVertical,
  BookOpen,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import { PDFDocument, degrees } from 'pdf-lib'

type TabId = 'merge' | 'split' | 'rotate' | 'imageToPdf'

interface PdfFile {
  id: string
  file: File
  name: string
  size: number
  pageCount?: number
}

interface PageInfo {
  index: number
  selected: boolean
  rotation: number
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

const generateId = () => Math.random().toString(36).slice(2)

export default function PdfTools() {
  const t = useTranslations('pdfTools')
  const [activeTab, setActiveTab] = useState<TabId>('merge')
  const [status, setStatus] = useState<{ type: 'idle' | 'processing' | 'success' | 'error'; message: string }>({
    type: 'idle',
    message: '',
  })

  // ── Merge state ──
  const [mergeFiles, setMergeFiles] = useState<PdfFile[]>([])
  const [mergeDragging, setMergeDragging] = useState(false)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const mergeInputRef = useRef<HTMLInputElement>(null)
  const dragItemIndex = useRef<number | null>(null)

  // ── Split state ──
  const [splitFile, setSplitFile] = useState<PdfFile | null>(null)
  const [splitPages, setSplitPages] = useState<PageInfo[]>([])
  const [splitMode, setSplitMode] = useState<'extract' | 'range'>('extract')
  const [splitRange, setSplitRange] = useState('')
  const splitInputRef = useRef<HTMLInputElement>(null)

  // ── Rotate state ──
  const [rotateFile, setRotateFile] = useState<PdfFile | null>(null)
  const [rotatePages, setRotatePages] = useState<PageInfo[]>([])
  const rotateInputRef = useRef<HTMLInputElement>(null)

  // ── Image to PDF state ──
  const [imageFiles, setImageFiles] = useState<{ id: string; file: File; url: string }[]>([])
  const [pageSize, setPageSize] = useState<'A4' | 'Letter' | 'custom'>('A4')
  const [customWidth, setCustomWidth] = useState('210')
  const [customHeight, setCustomHeight] = useState('297')
  const [imageDragging, setImageDragging] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)

  // ── Load PDF page count ──
  const loadPageCount = useCallback(async (file: File): Promise<number> => {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await PDFDocument.load(arrayBuffer)
    return pdf.getPageCount()
  }, [])

  // ── Merge handlers ──
  const handleMergeFiles = useCallback(
    async (files: FileList | null) => {
      if (!files) return
      const added: PdfFile[] = []
      for (const file of Array.from(files)) {
        if (file.type !== 'application/pdf') continue
        const id = generateId()
        let pageCount: number | undefined
        try {
          pageCount = await loadPageCount(file)
        } catch {
          pageCount = undefined
        }
        added.push({ id, file, name: file.name, size: file.size, pageCount })
      }
      setMergeFiles((prev) => [...prev, ...added])
    },
    [loadPageCount]
  )

  const handleMergeDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setMergeDragging(false)
      handleMergeFiles(e.dataTransfer.files)
    },
    [handleMergeFiles]
  )

  const removeMergeFile = (id: string) => setMergeFiles((prev) => prev.filter((f) => f.id !== id))

  // Drag-to-reorder for merge list
  const handleDragStart = (index: number) => {
    dragItemIndex.current = index
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault()
    const from = dragItemIndex.current
    if (from === null || from === index) {
      setDragOverIndex(null)
      return
    }
    setMergeFiles((prev) => {
      const arr = [...prev]
      const [item] = arr.splice(from, 1)
      arr.splice(index, 0, item)
      return arr
    })
    dragItemIndex.current = null
    setDragOverIndex(null)
  }

  const mergePdfs = useCallback(async () => {
    if (mergeFiles.length < 2) {
      setStatus({ type: 'error', message: t('merge.errorMin') })
      return
    }
    setStatus({ type: 'processing', message: t('merge.processing') })
    try {
      const merged = await PDFDocument.create()
      for (const pdfFile of mergeFiles) {
        const bytes = await pdfFile.file.arrayBuffer()
        const pdf = await PDFDocument.load(bytes)
        const pages = await merged.copyPages(pdf, pdf.getPageIndices())
        pages.forEach((page) => merged.addPage(page))
      }
      const mergedBytes = await merged.save()
      const blob = new Blob([mergedBytes.buffer as ArrayBuffer], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'merged.pdf'
      a.click()
      URL.revokeObjectURL(url)
      setStatus({ type: 'success', message: t('merge.success') })
    } catch {
      setStatus({ type: 'error', message: t('error.generic') })
    }
  }, [mergeFiles, t])

  // ── Split handlers ──
  const handleSplitFile = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return
      const file = files[0]
      if (file.type !== 'application/pdf') return
      try {
        const pageCount = await loadPageCount(file)
        setSplitFile({ id: generateId(), file, name: file.name, size: file.size, pageCount })
        setSplitPages(
          Array.from({ length: pageCount }, (_, i) => ({ index: i, selected: false, rotation: 0 }))
        )
        setSplitRange(`1-${pageCount}`)
      } catch {
        setStatus({ type: 'error', message: t('error.load') })
      }
    },
    [loadPageCount, t]
  )

  const toggleSplitPage = (index: number) => {
    setSplitPages((prev) =>
      prev.map((p) => (p.index === index ? { ...p, selected: !p.selected } : p))
    )
  }

  const splitPdf = useCallback(async () => {
    if (!splitFile) return
    setStatus({ type: 'processing', message: t('split.processing') })
    try {
      const bytes = await splitFile.file.arrayBuffer()
      const pdf = await PDFDocument.load(bytes)

      let pageIndices: number[] = []

      if (splitMode === 'extract') {
        pageIndices = splitPages.filter((p) => p.selected).map((p) => p.index)
        if (pageIndices.length === 0) {
          setStatus({ type: 'error', message: t('split.errorSelect') })
          return
        }
      } else {
        // Parse range like "1-3,5,7-9"
        const parts = splitRange.split(',').map((s) => s.trim())
        for (const part of parts) {
          if (part.includes('-')) {
            const [start, end] = part.split('-').map((n) => parseInt(n.trim(), 10) - 1)
            for (let i = start; i <= end && i < pdf.getPageCount(); i++) {
              if (i >= 0) pageIndices.push(i)
            }
          } else {
            const idx = parseInt(part, 10) - 1
            if (idx >= 0 && idx < pdf.getPageCount()) pageIndices.push(idx)
          }
        }
        pageIndices = [...new Set(pageIndices)].sort((a, b) => a - b)
      }

      if (pageIndices.length === 0) {
        setStatus({ type: 'error', message: t('split.errorSelect') })
        return
      }

      const newPdf = await PDFDocument.create()
      const copiedPages = await newPdf.copyPages(pdf, pageIndices)
      copiedPages.forEach((page) => newPdf.addPage(page))
      const newBytes = await newPdf.save()
      const blob = new Blob([newBytes.buffer as ArrayBuffer], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `extracted_pages.pdf`
      a.click()
      URL.revokeObjectURL(url)
      setStatus({ type: 'success', message: t('split.success') })
    } catch {
      setStatus({ type: 'error', message: t('error.generic') })
    }
  }, [splitFile, splitMode, splitPages, splitRange, t])

  // ── Rotate handlers ──
  const handleRotateFile = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return
      const file = files[0]
      if (file.type !== 'application/pdf') return
      try {
        const pageCount = await loadPageCount(file)
        setRotateFile({ id: generateId(), file, name: file.name, size: file.size, pageCount })
        setRotatePages(
          Array.from({ length: pageCount }, (_, i) => ({ index: i, selected: false, rotation: 0 }))
        )
      } catch {
        setStatus({ type: 'error', message: t('error.load') })
      }
    },
    [loadPageCount, t]
  )

  const rotatePage = (index: number, deg: number) => {
    setRotatePages((prev) =>
      prev.map((p) => (p.index === index ? { ...p, rotation: ((p.rotation + deg) % 360 + 360) % 360 } : p))
    )
  }

  const rotateAll = (deg: number) => {
    setRotatePages((prev) =>
      prev.map((p) => ({ ...p, rotation: ((p.rotation + deg) % 360 + 360) % 360 }))
    )
  }

  const savePdfWithRotation = useCallback(async () => {
    if (!rotateFile) return
    setStatus({ type: 'processing', message: t('rotate.processing') })
    try {
      const bytes = await rotateFile.file.arrayBuffer()
      const pdf = await PDFDocument.load(bytes)
      const pages = pdf.getPages()
      pages.forEach((page, i) => {
        const info = rotatePages[i]
        if (info && info.rotation !== 0) {
          const current = page.getRotation().angle
          page.setRotation(degrees((current + info.rotation) % 360))
        }
      })
      const newBytes = await pdf.save()
      const blob = new Blob([newBytes.buffer as ArrayBuffer], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `rotated_${rotateFile.name}`
      a.click()
      URL.revokeObjectURL(url)
      setStatus({ type: 'success', message: t('rotate.success') })
    } catch {
      setStatus({ type: 'error', message: t('error.generic') })
    }
  }, [rotateFile, rotatePages, t])

  // ── Image to PDF handlers ──
  const handleImageFiles = useCallback((files: FileList | null) => {
    if (!files) return
    const added = Array.from(files)
      .filter((f) => f.type.startsWith('image/'))
      .map((file) => ({ id: generateId(), file, url: URL.createObjectURL(file) }))
    setImageFiles((prev) => [...prev, ...added])
  }, [])

  const handleImageDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setImageDragging(false)
      handleImageFiles(e.dataTransfer.files)
    },
    [handleImageFiles]
  )

  const removeImageFile = (id: string) => {
    setImageFiles((prev) => {
      const removed = prev.find((f) => f.id === id)
      if (removed) URL.revokeObjectURL(removed.url)
      return prev.filter((f) => f.id !== id)
    })
  }

  const convertImagesToPdf = useCallback(async () => {
    if (imageFiles.length === 0) {
      setStatus({ type: 'error', message: t('imageToPdf.errorEmpty') })
      return
    }
    setStatus({ type: 'processing', message: t('imageToPdf.processing') })
    try {
      const pdf = await PDFDocument.create()

      // Page dimensions in points (1 mm = 2.8346 pt)
      let pageWidthPt: number
      let pageHeightPt: number

      if (pageSize === 'A4') {
        pageWidthPt = 595.28
        pageHeightPt = 841.89
      } else if (pageSize === 'Letter') {
        pageWidthPt = 612
        pageHeightPt = 792
      } else {
        pageWidthPt = parseFloat(customWidth) * 2.8346
        pageHeightPt = parseFloat(customHeight) * 2.8346
      }

      for (const imgEntry of imageFiles) {
        const arrayBuffer = await imgEntry.file.arrayBuffer()
        const uint8 = new Uint8Array(arrayBuffer)

        let pdfImage
        if (imgEntry.file.type === 'image/png') {
          pdfImage = await pdf.embedPng(uint8)
        } else {
          pdfImage = await pdf.embedJpg(uint8)
        }

        const page = pdf.addPage([pageWidthPt, pageHeightPt])
        const margin = 20
        const maxW = pageWidthPt - margin * 2
        const maxH = pageHeightPt - margin * 2
        const scale = Math.min(maxW / pdfImage.width, maxH / pdfImage.height)
        const drawW = pdfImage.width * scale
        const drawH = pdfImage.height * scale
        const x = (pageWidthPt - drawW) / 2
        const y = (pageHeightPt - drawH) / 2
        page.drawImage(pdfImage, { x, y, width: drawW, height: drawH })
      }

      const bytes = await pdf.save()
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'images_to_pdf.pdf'
      a.click()
      URL.revokeObjectURL(url)
      setStatus({ type: 'success', message: t('imageToPdf.success') })
    } catch {
      setStatus({ type: 'error', message: t('error.generic') })
    }
  }, [imageFiles, pageSize, customWidth, customHeight, t])

  // ── Tabs config ──
  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'merge', label: t('tabs.merge'), icon: <FilePlus className="w-4 h-4" /> },
    { id: 'split', label: t('tabs.split'), icon: <Scissors className="w-4 h-4" /> },
    { id: 'rotate', label: t('tabs.rotate'), icon: <RotateCw className="w-4 h-4" /> },
    { id: 'imageToPdf', label: t('tabs.imageToPdf'), icon: <Image className="w-4 h-4" /> },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id)
              setStatus({ type: 'idle', message: '' })
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Status banner */}
      {status.type !== 'idle' && (
        <div
          className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ${
            status.type === 'success'
              ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300'
              : status.type === 'error'
              ? 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300'
              : 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
          }`}
        >
          {status.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
          {status.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0" />}
          {status.type === 'processing' && <Loader2 className="w-4 h-4 shrink-0 animate-spin" />}
          {status.message}
        </div>
      )}

      {/* ══ MERGE TAB ══ */}
      {activeTab === 'merge' && (
        <div className="space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setMergeDragging(true) }}
            onDragLeave={() => setMergeDragging(false)}
            onDrop={handleMergeDrop}
            onClick={() => mergeInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              mergeDragging
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
            }`}
          >
            <FileUp className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-300 font-medium">{t('merge.dropzone')}</p>
            <p className="text-xs text-gray-400 mt-1">{t('common.pdfOnly')}</p>
            <input
              ref={mergeInputRef}
              type="file"
              accept=".pdf,application/pdf"
              multiple
              className="hidden"
              onChange={(e) => handleMergeFiles(e.target.files)}
            />
          </div>

          {/* File list */}
          {mergeFiles.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 space-y-2">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{t('merge.reorderHint')}</p>
              {mergeFiles.map((pf, index) => (
                <div
                  key={pf.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    dragOverIndex === index
                      ? 'border-blue-400 bg-blue-50 dark:bg-blue-950'
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900'
                  }`}
                >
                  <GripVertical className="w-4 h-4 text-gray-400 cursor-grab shrink-0" />
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 w-6 shrink-0">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{pf.name}</p>
                    <p className="text-xs text-gray-400">
                      {formatFileSize(pf.size)}
                      {pf.pageCount !== undefined && ` · ${pf.pageCount}${t('common.pages')}`}
                    </p>
                  </div>
                  <button
                    onClick={() => removeMergeFile(pf.id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors shrink-0"
                    aria-label={t('common.remove')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={mergePdfs}
            disabled={status.type === 'processing'}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {status.type === 'processing' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {t('merge.button')}
          </button>
        </div>
      )}

      {/* ══ SPLIT TAB ══ */}
      {activeTab === 'split' && (
        <div className="space-y-4">
          {/* Upload */}
          <div
            onClick={() => splitInputRef.current?.click()}
            className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
          >
            <FileUp className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-300 font-medium">{t('split.dropzone')}</p>
            <p className="text-xs text-gray-400 mt-1">{t('common.pdfOnly')}</p>
            <input
              ref={splitInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => handleSplitFile(e.target.files)}
            />
          </div>

          {splitFile && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white truncate">{splitFile.name}</p>
                  <p className="text-xs text-gray-400">
                    {formatFileSize(splitFile.size)} · {splitFile.pageCount}{t('common.pages')}
                  </p>
                </div>
                <button
                  onClick={() => { setSplitFile(null); setSplitPages([]) }}
                  className="p-1 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Mode selector */}
              <div className="flex gap-2">
                <button
                  onClick={() => setSplitMode('extract')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    splitMode === 'extract'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {t('split.modeExtract')}
                </button>
                <button
                  onClick={() => setSplitMode('range')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    splitMode === 'range'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {t('split.modeRange')}
                </button>
              </div>

              {splitMode === 'extract' ? (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{t('split.selectHint')}</p>
                  <div className="flex flex-wrap gap-2">
                    {splitPages.map((p) => (
                      <button
                        key={p.index}
                        onClick={() => toggleSplitPage(p.index)}
                        className={`w-12 h-12 rounded-lg text-sm font-medium border transition-colors ${
                          p.selected
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-400'
                        }`}
                      >
                        {p.index + 1}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('split.rangeLabel')}
                  </label>
                  <input
                    type="text"
                    value={splitRange}
                    onChange={(e) => setSplitRange(e.target.value)}
                    placeholder="1-3, 5, 7-9"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">{t('split.rangeHint')}</p>
                </div>
              )}

              <button
                onClick={splitPdf}
                disabled={status.type === 'processing'}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {status.type === 'processing' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {t('split.button')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══ ROTATE TAB ══ */}
      {activeTab === 'rotate' && (
        <div className="space-y-4">
          <div
            onClick={() => rotateInputRef.current?.click()}
            className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
          >
            <FileUp className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-300 font-medium">{t('rotate.dropzone')}</p>
            <p className="text-xs text-gray-400 mt-1">{t('common.pdfOnly')}</p>
            <input
              ref={rotateInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => handleRotateFile(e.target.files)}
            />
          </div>

          {rotateFile && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white truncate">{rotateFile.name}</p>
                  <p className="text-xs text-gray-400">
                    {formatFileSize(rotateFile.size)} · {rotateFile.pageCount}{t('common.pages')}
                  </p>
                </div>
                <button
                  onClick={() => { setRotateFile(null); setRotatePages([]) }}
                  className="p-1 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Bulk rotate */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">{t('rotate.allPages')}</span>
                {[90, 180, 270].map((deg) => (
                  <button
                    key={deg}
                    onClick={() => rotateAll(deg)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    <RotateCw className="w-3 h-3" />
                    {deg}°
                  </button>
                ))}
              </div>

              {/* Per-page grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {rotatePages.map((p) => (
                  <div key={p.index} className="flex flex-col items-center gap-1">
                    <div
                      className="w-16 h-20 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 flex items-center justify-center relative transition-transform"
                      style={{ transform: `rotate(${p.rotation}deg)` }}
                    >
                      <span className="text-xs text-gray-400">{p.index + 1}</span>
                    </div>
                    <div className="flex gap-1">
                      {[90, -90].map((deg) => (
                        <button
                          key={deg}
                          onClick={() => rotatePage(p.index, deg)}
                          title={`${deg > 0 ? '+' : ''}${deg}°`}
                          className="p-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-blue-100 dark:hover:bg-blue-900"
                        >
                          <RotateCw className={`w-3 h-3 ${deg < 0 ? 'scale-x-[-1]' : ''}`} />
                        </button>
                      ))}
                    </div>
                    {p.rotation !== 0 && (
                      <span className="text-xs text-blue-500 font-medium">{p.rotation}°</span>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={savePdfWithRotation}
                disabled={status.type === 'processing'}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {status.type === 'processing' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {t('rotate.button')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══ IMAGE TO PDF TAB ══ */}
      {activeTab === 'imageToPdf' && (
        <div className="space-y-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setImageDragging(true) }}
            onDragLeave={() => setImageDragging(false)}
            onDrop={handleImageDrop}
            onClick={() => imageInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              imageDragging
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
            }`}
          >
            <Image className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-300 font-medium">{t('imageToPdf.dropzone')}</p>
            <p className="text-xs text-gray-400 mt-1">{t('imageToPdf.formats')}</p>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleImageFiles(e.target.files)}
            />
          </div>

          {imageFiles.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
              {/* Page size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('imageToPdf.pageSize')}
                </label>
                <div className="flex gap-2 flex-wrap">
                  {(['A4', 'Letter', 'custom'] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => setPageSize(size)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        pageSize === size
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {size === 'custom' ? t('imageToPdf.custom') : size}
                    </button>
                  ))}
                </div>
                {pageSize === 'custom' && (
                  <div className="flex gap-3 mt-3 items-center">
                    <input
                      type="number"
                      value={customWidth}
                      onChange={(e) => setCustomWidth(e.target.value)}
                      className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                    />
                    <span className="text-gray-500">×</span>
                    <input
                      type="number"
                      value={customHeight}
                      onChange={(e) => setCustomHeight(e.target.value)}
                      className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                    />
                    <span className="text-xs text-gray-400">mm</span>
                  </div>
                )}
              </div>

              {/* Image list */}
              <div className="space-y-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('imageToPdf.imagesAdded', { count: imageFiles.length })}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {imageFiles.map((img, index) => (
                    <div key={img.id} className="relative group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt={img.file.name}
                        className="w-full h-24 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                      />
                      <div className="absolute top-1 left-1 bg-blue-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium">
                        {index + 1}
                      </div>
                      <button
                        onClick={() => removeImageFile(img.id)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label={t('common.remove')}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">{img.file.name}</p>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={convertImagesToPdf}
                disabled={status.type === 'processing'}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {status.type === 'processing' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {t('imageToPdf.button')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Guide section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          {t('guide.title')}
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {(['merge', 'split', 'rotate', 'imageToPdf'] as const).map((section) => (
            <div key={section} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">{t(`guide.${section}.title`)}</h3>
              <ul className="space-y-1">
                {(t.raw(`guide.${section}.items`) as string[]).map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <span className="text-blue-500 mt-0.5 shrink-0">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
