'use client'

import { useState, useCallback, useRef, useEffect, DragEvent, KeyboardEvent, ReactNode } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/pdfTools'
import { useSearchParams } from '@/hooks/useSearchParams'
import {
  FileUp, FileText, Download, Trash2, GripVertical, ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  RotateCw, RotateCcw, AlertCircle, CheckCircle2, Loader2, ArrowDownAZ, Undo2,
} from 'lucide-react'
import { PDFDocument, EncryptedPDFError, type PDFImage } from 'pdf-lib'
import GuideSection from '@/components/GuideSection'
import PdfHistoryControls from '@/components/PdfHistoryControls'
import { createPdfPageHistory, editPdfPages, undoPdfPageEdit, redoPdfPageEdit, pdfPageFocusKey, pdfHistoryShortcut, type PdfPageHistory, type PdfPageEdit } from '@/utils/pdfEditHistory'
import { createPdfTaskGuard, snapshotPdfItems } from '@/utils/pdfTaskGuard'
import { createOrganizedPdf, snapshotPdfOrganize } from '@/utils/pdfOrganizeExport'
import { formatBytes, uniqueNames, decodeImage, encodeImage } from '@/utils/imageCompress'
import {
  parsePageRanges, planSplit, pageLabel, outName, isPdf, move, pageSize, fitRect, jpegOrientation, MM,
  type SplitMode, type Paper, type Orientation,
} from '@/utils/pdfTools'

type Tab = 'merge' | 'split' | 'organize' | 'imageToPdf'
const TABS: Tab[] = ['merge', 'split', 'organize', 'imageToPdf']

interface PdfItem { id: string; file: File; pages: number }
interface ImgItem { id: string; file: File; url: string }
type Status =
  | { kind: 'idle' }
  | { kind: 'working'; msg: string; done: number; total: number }
  | { kind: 'done'; msg: string }
  | { kind: 'error'; msg: string }
interface Result { url: string; name: string; size: number }

const uid = () => Math.random().toString(36).slice(2)
const tick = () => new Promise((r) => setTimeout(r)) // 진행 표시가 그려지도록 한 박자 양보
const norm = (deg: number) => ((deg % 360) + 360) % 360
const loadPdf = async (file: File) => PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false })
const focusSoon = (id: string) => requestAnimationFrame(() => document.getElementById(id)?.focus())

/** 드래그로 순서 바꾸기 (마우스 전용 — 키보드·터치는 위/아래 버튼) */
function useDragSort(onMove: (from: number, to: number) => void) {
  const from = useRef<number | null>(null)
  const [over, setOver] = useState<number | null>(null)
  const props = (i: number) => ({
    draggable: true,
    onDragStart: (e: DragEvent) => { from.current = i; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)) },
    onDragOver: (e: DragEvent) => { if (from.current === null) return; e.preventDefault(); setOver(i) },
    onDrop: (e: DragEvent) => { e.preventDefault(); if (from.current !== null) onMove(from.current, i); from.current = null; setOver(null) },
    onDragEnd: () => { from.current = null; setOver(null) },
  })
  return { props, over }
}

function DropZone({ accept, multiple, title, hint, compact, onFiles, inputId }: {
  accept: string; multiple?: boolean; title: string; hint: string; compact?: boolean; onFiles: (f: File[]) => void; inputId?: string
}) {
  const [drag, setDrag] = useState(false)
  return (
    <label
      onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDrag(true) } }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); onFiles(Array.from(e.dataTransfer.files)) }}
      className={`flex flex-col items-center justify-center gap-1 text-center border-2 border-dashed rounded-2xl cursor-pointer transition-colors has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-primary ${
        compact ? 'p-4 min-h-[64px]' : 'p-8 min-h-[176px]'
      } ${drag ? 'border-primary bg-primary-soft' : 'border-line-strong hover:border-primary bg-subtle'}`}
    >
      {!compact && <FileUp className="w-9 h-9 text-faint mb-2" aria-hidden />}
      <span className="font-medium text-body">{title}</span>
      <span className="text-xs text-muted">{hint}</span>
      <input
        type="file"
        id={inputId}
        accept={accept}
        multiple={multiple}
        className="sr-only"
        onChange={(e) => { onFiles(Array.from(e.target.files ?? [])); e.target.value = '' }}
      />
    </label>
  )
}

const iconBtn = 'inline-flex items-center justify-center size-11 shrink-0 rounded-xl text-sub hover:bg-soft hover:text-fg disabled:opacity-30 disabled:pointer-events-none'

export default function PdfTools() {
  const t = useTranslations('pdfTools')
  const sp = useSearchParams()
  const urlTab = sp.get('tab')
  const [tab, setTab] = useState<Tab>('merge')
  const tabRef = useRef<Tab>('merge')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [result, setResult] = useState<Result | null>(null)
  const [announce, setAnnounce] = useState('')
  const busy = status.kind === 'working'
  const task = useRef(createPdfTaskGuard())

  const resultRef = useRef<Result | null>(null)
  const clearResult = useCallback(() => {
    if (resultRef.current) URL.revokeObjectURL(resultRef.current.url)
    resultRef.current = null
    setResult(null)
  }, [])

  const invalidate = useCallback(() => {
    task.current.invalidate()
    clearResult()
    setStatus({ kind: 'idle' })
  }, [clearResult])
  const beginTask = () => {
    const token = task.current.begin()
    clearResult()
    setStatus({ kind: 'working', msg: t('working.saving'), done: 0, total: 1 })
    return token
  }
  const taskStatus = (token: number, next: Status) => { if (task.current.isCurrent(token)) setStatus(next) }

  // URL changes invalidate unfinished work without discarding any tab's inputs.
  useEffect(() => {
    const v = urlTab === 'rotate' ? 'organize' : urlTab
    if (v && (TABS as string[]).includes(v) && v !== tabRef.current) { invalidate(); tabRef.current = v as Tab; setTab(v as Tab) }
  }, [urlTab, invalidate])

  const selectTab = (next: Tab, focus = false) => {
    tabRef.current = next
    setTab(next)
    invalidate()
    const url = new URL(window.location.href)
    if (next === 'merge') url.searchParams.delete('tab'); else url.searchParams.set('tab', next)
    window.history.replaceState(window.history.state, '', url)
    if (focus) focusSoon(`pdf-tab-${next}`)
  }
  const onTabKey = (e: KeyboardEvent) => {
    const i = TABS.indexOf(tab)
    const j = e.key === 'ArrowRight' ? (i + 1) % TABS.length
      : e.key === 'ArrowLeft' ? (i - 1 + TABS.length) % TABS.length
      : e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1 : -1
    if (j < 0) return
    e.preventDefault()
    selectTab(TABS[j], true)
  }

  // ── 공통: 결과 저장 ──
  const finish = useCallback((token: number, data: BlobPart, name: string, type: string, msg: string) => {
    if (!task.current.isCurrent(token)) return
    clearResult()
    const blob = new Blob([data], { type })
    const r = { url: URL.createObjectURL(blob), name, size: blob.size }
    resultRef.current = r
    setResult(r)
    const a = document.createElement('a')
    a.href = r.url
    a.download = name
    document.body.appendChild(a)
    try { a.click() } finally { a.remove() }
    setStatus({ kind: 'done', msg })
  }, [clearResult])

  const pdfError = useCallback((e: unknown, name: string) =>
    e instanceof EncryptedPDFError || /encrypt/i.test(String((e as Error)?.message))
      ? t('error.encrypted', { name })
      : t('error.load', { name }), [t])

  /** PDF 여러 개 읽어 쪽수 확인. 실패·비PDF는 오류 메시지로 모아 알림 */
  const readPdfs = useCallback(async (files: File[], token: number): Promise<{ items: PdfItem[]; docs: PDFDocument[] }> => {
    const pdfs = files.filter(isPdf)
    const errors: string[] = []
    if (pdfs.length < files.length) errors.push(t('error.skipped', { count: files.length - pdfs.length }))
    const items: PdfItem[] = []
    const docs: PDFDocument[] = []
    for (let i = 0; i < pdfs.length; i++) {
      if (!task.current.isCurrent(token)) return { items: [], docs: [] }
      setStatus({ kind: 'working', msg: t('working.reading', { done: i + 1, total: pdfs.length }), done: i, total: pdfs.length })
      await tick()
      if (!task.current.isCurrent(token)) return { items: [], docs: [] }
      try {
        const doc = await loadPdf(pdfs[i])
        if (!task.current.isCurrent(token)) return { items: [], docs: [] }
        items.push({ id: uid(), file: pdfs[i], pages: doc.getPageCount() })
        docs.push(doc)
      } catch (e) {
        if (!task.current.isCurrent(token)) return { items: [], docs: [] }
        errors.push(pdfError(e, pdfs[i].name))
      }
    }
    if (task.current.isCurrent(token)) setStatus(errors.length ? { kind: 'error', msg: errors.join(' ') } : { kind: 'idle' })
    return { items, docs }
  }, [pdfError, t])

  const moveMsg = (from: number, to: number) => setAnnounce(t('a11y.moved', { from: from + 1, to: to + 1 }))

  // ════ 합치기 ════
  const [mergeFiles, setMergeFiles] = useState<PdfItem[]>([])
  const addMerge = async (files: File[]) => {
    if (!files.length) return
    const token = beginTask()
    const { items } = await readPdfs(files, token)
    if (task.current.isCurrent(token)) setMergeFiles((prev) => [...prev, ...items])
  }
  const moveMerge = (from: number, to: number) => { invalidate(); setMergeFiles((p) => move(p, from, to)); moveMsg(from, to) }
  const mergeTotalPages = mergeFiles.reduce((s, f) => s + f.pages, 0)

  const runMerge = async () => {
    if (mergeFiles.length < 2) { setStatus({ kind: 'error', msg: t('merge.errorMin') }); return }
    const token = beginTask(), files = snapshotPdfItems(mergeFiles)
    try {
      const out = await PDFDocument.create()
      for (let i = 0; i < files.length; i++) {
        if (!task.current.isCurrent(token)) return
        const f = files[i]
        taskStatus(token, { kind: 'working', msg: t('merge.working', { done: i + 1, total: files.length }), done: i, total: files.length + 1 })
        await tick()
        if (!task.current.isCurrent(token)) return
        const src = await loadPdf(f.file)
        if (!task.current.isCurrent(token)) return
        const pages = await out.copyPages(src, src.getPageIndices())
        if (!task.current.isCurrent(token)) return
        pages.forEach((p) => out.addPage(p))
      }
      taskStatus(token, { kind: 'working', msg: t('working.saving'), done: files.length, total: files.length + 1 })
      await tick()
      if (!task.current.isCurrent(token)) return
      const bytes = await out.save()
      finish(token, bytes as BlobPart, outName(files[0].file.name, t('suffix.merged')), 'application/pdf', t('merge.success', { pages: out.getPageCount() }))
    } catch (e) { taskStatus(token, { kind: 'error', msg: pdfError(e, files[0].file.name) }) }
  }

  // ════ 나누기 ════
  const [splitDoc, setSplitDoc] = useState<PdfItem | null>(null)
  const [splitMode, setSplitMode] = useState<SplitMode>('range')
  const [rangeText, setRangeText] = useState('')
  const [rangeTouched, setRangeTouched] = useState(false)
  const [separate, setSeparate] = useState(false)
  const [everyN, setEveryN] = useState(2)

  const loadSplit = async (files: File[]) => {
    if (!files.length) return
    const token = beginTask()
    const { items } = await readPdfs(files.slice(0, 1), token)
    if (!task.current.isCurrent(token) || !items[0]) return
    setSplitDoc(items[0])
    setRangeText('')
    setRangeTouched(false)
  }
  const splitPages = splitDoc?.pages ?? 0
  const parsed = splitMode === 'range' && splitDoc ? parsePageRanges(rangeText, splitPages) : null
  const rangeErr = parsed && !parsed.ok && (rangeTouched || rangeText.trim() !== '')
    ? t(`split.err.${parsed.error}`, { token: parsed.token, pages: splitPages })
    : ''
  const groups = splitDoc
    ? planSplit(splitMode, splitPages, { ranges: parsed?.ok ? parsed.ranges : [], separate, every: everyN })
    : []

  const runSplit = async () => {
    if (!splitDoc) return
    if (!groups.length) { setRangeTouched(true); focusSoon('pdf-range'); return }
    const token = beginTask(), file = splitDoc.file, selectedGroups = groups.map(group => [...group])
    try {
      const src = await loadPdf(file)
      if (!task.current.isCurrent(token)) return
      const names = uniqueNames(selectedGroups.map((g) => outName(file.name, `p${pageLabel(g)}`)))
      const outs: Uint8Array[] = []
      for (let i = 0; i < selectedGroups.length; i++) {
        if (!task.current.isCurrent(token)) return
        taskStatus(token, { kind: 'working', msg: t('split.working', { done: i + 1, total: selectedGroups.length }), done: i, total: selectedGroups.length + 1 })
        if (i % 5 === 0) await tick()
        if (!task.current.isCurrent(token)) return
        const doc = await PDFDocument.create()
        if (!task.current.isCurrent(token)) return
        const copied = await doc.copyPages(src, selectedGroups[i])
        if (!task.current.isCurrent(token)) return
        copied.forEach((p) => doc.addPage(p))
        outs.push(await doc.save())
      }
      if (!task.current.isCurrent(token)) return
      const msg = t('split.success', { count: selectedGroups.length })
      if (outs.length === 1) { finish(token, outs[0] as BlobPart, names[0], 'application/pdf', msg); return }
      taskStatus(token, { kind: 'working', msg: t('working.zipping'), done: selectedGroups.length, total: selectedGroups.length + 1 })
      const JSZip = (await import('jszip')).default
      if (!task.current.isCurrent(token)) return
      const zip = new JSZip()
      outs.forEach((b, i) => zip.file(names[i], b))
      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
      finish(token, blob, outName(file.name, t('suffix.split'), 'zip'), 'application/zip', msg)
    } catch (e) { taskStatus(token, { kind: 'error', msg: pdfError(e, file.name) }) }
  }

  // ════ 페이지 정리 (삭제·회전·순서) ════
  const [orgDoc, setOrgDoc] = useState<PdfItem | null>(null)
  const [history, setHistory] = useState(createPdfPageHistory)
  const historyRef = useRef(history)
  const cards = history.present, orgInit = history.initial
  const installHistory = (next: PdfPageHistory) => { historyRef.current = next; setHistory(next) }
  const applyHistory = (next: PdfPageHistory, focus = false, preferred?: string) => {
    const before = historyRef.current
    if (next === before) return false
    invalidate()
    installHistory(next)
    if (focus) {
      const key = pdfPageFocusKey(before.present, next.present, preferred)
      focusSoon(key !== null ? `pdf-pg-del-${key}` : next.past.length ? 'pdf-org-undo' : 'pdf-org-redo')
    }
    return true
  }
  const editPages = (action: PdfPageEdit) => applyHistory(editPdfPages(historyRef.current, action))
  const historyStep = (direction: 'undo' | 'redo') => {
    const next = direction === 'undo' ? undoPdfPageEdit(historyRef.current) : redoPdfPageEdit(historyRef.current)
    if (applyHistory(next, true)) setAnnounce(t(direction === 'undo' ? 'history.undone' : 'history.redone'))
  }
  const onOrganizeKey = (event: KeyboardEvent) => {
    if (tab !== 'organize' || !orgDoc) return
    const target = event.target as HTMLElement
    const direction = pdfHistoryShortcut({ ...event, isComposing: event.nativeEvent.isComposing, editable: !!target.closest?.('input, textarea, select, [contenteditable="true"], [contenteditable=""]') })
    if (!direction || !(direction === 'undo' ? historyRef.current.past.length : historyRef.current.future.length)) return
    event.preventDefault(); historyStep(direction)
  }

  const loadOrganize = async (files: File[]) => {
    if (!files.length) return
    const token = beginTask()
    const { items, docs } = await readPdfs(files.slice(0, 1), token)
    if (!task.current.isCurrent(token) || !items[0]) return
    const init = docs[0].getPages().map((p, i) => {
      const { width, height } = p.getSize()
      const turned = norm(p.getRotation().angle) % 180 !== 0
      return { key: String(i), src: i, rot: 0, w: turned ? height : width, h: turned ? width : height }
    })
    setOrgDoc(items[0])
    installHistory(createPdfPageHistory(init))
    setAnnounce(t('history.replaced'))
  }
  const rotateCard = (i: number, deg: number) => editPages({ kind: 'rotate', index: i, degrees: deg })
  const rotateAll = (deg: number) => editPages({ kind: 'rotateAll', degrees: deg })
  const removeCard = (i: number) => {
    const card = cards[i]
    if (!card) return
    const next = cards[i + 1] ?? cards[i - 1]
    applyHistory(editPdfPages(historyRef.current, { kind: 'remove', index: i }), true, next?.key)
    setAnnounce(t('a11y.pageDeleted', { n: card.src + 1 }))
  }
  const moveCard = (from: number, to: number, focusId?: string) => {
    if (to < 0 || to >= cards.length || !cards[from] || from === to) return
    setAnnounce(t('a11y.pageMoved', { n: cards[from].src + 1, to: to + 1 }))
    editPages({ kind: 'move', from, to })
    if (focusId) focusSoon(focusId)
  }
  const removedCount = orgInit.length - new Set(cards.map((c) => c.src)).size
  const orgChanged = cards.length !== orgInit.length || cards.some((c, i) => c.rot !== 0 || c.src !== orgInit[i]?.src)

  const runOrganize = async () => {
    if (!orgDoc) return
    if (!cards.length) { setStatus({ kind: 'error', msg: t('organize.errorEmpty') }); return }
    const token = beginTask(), snapshot = snapshotPdfOrganize(orgDoc.file, historyRef.current.present)
    try {
      await tick()
      const bytes = await createOrganizedPdf(snapshot, () => task.current.isCurrent(token))
      if (bytes) finish(token, bytes as BlobPart, outName(snapshot.file.name, t('suffix.edited')), 'application/pdf', t('organize.success', { pages: snapshot.cards.length }))
    } catch (e) {
      taskStatus(token, { kind: 'error', msg: pdfError(e, snapshot.file.name) })
    }
  }

  // ════ 이미지 → PDF ════
  const [imgs, setImgs] = useState<ImgItem[]>([])
  const [paper, setPaper] = useState<Paper>('A4')
  const [orient, setOrient] = useState<Orientation>('auto')
  const [marginMm, setMarginMm] = useState(10)
  const imgsRef = useRef<ImgItem[]>([])
  useEffect(() => { imgsRef.current = imgs }, [imgs])

  const addImages = (files: File[]) => {
    if (!files.length) return
    const ok = files.filter((f) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp)$/i.test(f.name))
    invalidate()
    setStatus(ok.length < files.length ? { kind: 'error', msg: t('error.skippedImages', { count: files.length - ok.length }) } : { kind: 'idle' })
    setImgs((p) => [...p, ...ok.map((file) => ({ id: uid(), file, url: URL.createObjectURL(file) }))])
  }
  const removeImg = (i: number) => { invalidate(); setImgs((p) => { URL.revokeObjectURL(p[i].url); return p.filter((_, j) => j !== i) }) }
  const moveImg = (from: number, to: number) => { invalidate(); setImgs((p) => move(p, from, to)); moveMsg(from, to) }

  const runImages = async () => {
    if (!imgs.length) { setStatus({ kind: 'error', msg: t('imageToPdf.errorEmpty') }); return }
    const token = beginTask(), images = snapshotPdfItems(imgs), selectedPaper = paper, selectedOrient = orient
    const margin = marginMm * MM
    let activeName = images[0].file.name
    try {
      const pdf = await PDFDocument.create()
      for (let i = 0; i < images.length; i++) {
        if (!task.current.isCurrent(token)) return
        const { file } = images[i]
        activeName = file.name
        taskStatus(token, { kind: 'working', msg: t('imageToPdf.working', { done: i + 1, total: images.length }), done: i, total: images.length + 1 })
        await tick()
        if (!task.current.isCurrent(token)) return
        const bytes = new Uint8Array(await file.arrayBuffer())
        if (!task.current.isCurrent(token)) return
        const jpg = bytes[0] === 0xff && bytes[1] === 0xd8
        const png = bytes[0] === 0x89 && bytes[1] === 0x50
        let image: PDFImage | null = null
        // JPG·PNG는 원본 그대로(화질 손실 없음). EXIF 회전된 사진과 그 밖의 형식만 다시 그림
        if (jpg && jpegOrientation(bytes) === 1) image = await pdf.embedJpg(bytes)
        else if (png) image = await pdf.embedPng(bytes).catch(() => null)
        if (!task.current.isCurrent(token)) return
        if (!image) {
          const d = await decodeImage(file)
          try {
            if (!task.current.isCurrent(token)) return
            const encoded = await encodeImage(d.src, d.width, d.height, 'image/jpeg', 0.92)
            if (!task.current.isCurrent(token)) return
            const encodedBytes = await encoded.arrayBuffer()
            if (!task.current.isCurrent(token)) return
            image = await pdf.embedJpg(new Uint8Array(encodedBytes))
          }
          finally { d.close() }
        }
        if (!task.current.isCurrent(token)) return
        const [pw, ph] = pageSize(selectedPaper, selectedOrient, image.width, image.height, margin)
        pdf.addPage([pw, ph]).drawImage(image, fitRect(image.width, image.height, pw, ph, margin))
      }
      taskStatus(token, { kind: 'working', msg: t('working.saving'), done: images.length, total: images.length + 1 })
      await tick()
      if (!task.current.isCurrent(token)) return
      const bytes = await pdf.save()
      finish(token, bytes as BlobPart, outName(images[0].file.name, t('suffix.images')), 'application/pdf', t('imageToPdf.success', { count: images.length }))
    } catch { taskStatus(token, { kind: 'error', msg: t('error.image', { name: activeName }) }) }
  }

  // 언마운트 시 objectURL 정리
  useEffect(() => {
    const guard = task.current
    return () => {
      guard.invalidate()
      imgsRef.current.forEach((i) => URL.revokeObjectURL(i.url))
      if (resultRef.current) URL.revokeObjectURL(resultRef.current.url)
    }
  }, [])

  // ── 공용 UI ──
  const byName = <T extends { file: File }>(arr: T[]) =>
    [...arr].sort((a, b) => a.file.name.localeCompare(b.file.name, undefined, { numeric: true }))

  const mergeDrag = useDragSort(moveMerge)
  const imgDrag = useDragSort(moveImg)
  const cardDrag = useDragSort((f, to) => moveCard(f, to))

  const fileList = (
    items: { id: string; file: File; meta: string; thumb?: string }[],
    drag: ReturnType<typeof useDragSort>,
    onMove: (from: number, to: number) => void,
    onRemove: (i: number) => void,
    onSort: () => void,
    onClear: () => void,
  ) => (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">{t('common.reorderHint')}</p>
        <div className="flex gap-2">
          <button type="button" onClick={onSort} className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded-xl text-sm text-body bg-soft hover:bg-subtle">
            <ArrowDownAZ className="w-4 h-4" aria-hidden />{t('common.sortName')}
          </button>
          <button type="button" onClick={onClear} className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded-xl text-sm text-body bg-soft hover:bg-subtle">
            {t('common.clear')}
          </button>
        </div>
      </div>
      <ol className="space-y-2" aria-label={t('a11y.fileList')}>
        {items.map((it, i) => (
          <li
            key={it.id}
            {...drag.props(i)}
            className={`flex items-center gap-2 sm:gap-3 p-2 rounded-xl border bg-surface ${drag.over === i ? 'border-primary' : 'border-line'}`}
          >
            <GripVertical className="hidden sm:block w-4 h-4 text-faint cursor-grab shrink-0" aria-hidden />
            <span className="w-5 text-center text-sm font-semibold text-muted tabular-nums shrink-0">{i + 1}</span>
            {it.thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={it.thumb} alt="" className="size-10 object-cover rounded-lg border border-line shrink-0" />
            ) : (
              <FileText className="w-5 h-5 text-faint shrink-0" aria-hidden />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-fg truncate">{it.file.name}</p>
              <p className="text-xs text-muted tabular-nums">{it.meta}</p>
            </div>
            <button type="button" id={`mv-up-${it.id}`} className={iconBtn} disabled={i === 0} aria-label={t('a11y.moveUp', { n: i + 1 })}
              onClick={() => { onMove(i, i - 1); focusSoon(i - 1 === 0 ? `mv-down-${it.id}` : `mv-up-${it.id}`) }}>
              <ArrowUp className="w-4 h-4" aria-hidden />
            </button>
            <button type="button" id={`mv-down-${it.id}`} className={iconBtn} disabled={i === items.length - 1} aria-label={t('a11y.moveDown', { n: i + 1 })}
              onClick={() => { onMove(i, i + 1); focusSoon(i + 1 === items.length - 1 ? `mv-up-${it.id}` : `mv-down-${it.id}`) }}>
              <ArrowDown className="w-4 h-4" aria-hidden />
            </button>
            <button type="button" className={`${iconBtn} hover:text-red-600`} aria-label={t('a11y.remove', { name: it.file.name })}
              onClick={() => { onRemove(i); setAnnounce(t('a11y.removed', { name: it.file.name })) }}>
              <Trash2 className="w-4 h-4" aria-hidden />
            </button>
          </li>
        ))}
      </ol>
    </div>
  )

  const docHeader = (doc: PdfItem, onClear: () => void) => (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-subtle">
      <FileText className="w-5 h-5 text-faint shrink-0" aria-hidden />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-fg truncate">{doc.file.name}</p>
        <p className="text-xs text-muted tabular-nums">{t('common.meta', { pages: doc.pages, size: formatBytes(doc.file.size) })}</p>
      </div>
      <button type="button" className={`${iconBtn} hover:text-red-600`} aria-label={t('a11y.remove', { name: doc.file.name })} onClick={onClear}>
        <Trash2 className="w-4 h-4" aria-hidden />
      </button>
    </div>
  )

  const radioGroup = <T extends string | number>(name: string, legend: string, value: T, options: [T, string][], set: (v: T) => void) => (
    <fieldset>
      <legend className="block text-sm font-medium text-body mb-2">{legend}</legend>
      <div className="grid gap-1 p-1 rounded-xl bg-soft" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map(([v, label]) => (
          <label key={String(v)} className="flex items-center justify-center min-h-11 px-2 rounded-lg text-sm font-medium text-center cursor-pointer text-body has-[:checked]:bg-primary has-[:checked]:text-white has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary">
            <input type="radio" name={name} className="sr-only" checked={value === v} onChange={() => { invalidate(); set(v) }} />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  )

  const actionBtn = (label: string, onClick: () => void, disabled: boolean) => (
    <button type="button" onClick={onClick} disabled={disabled || busy} className="ui-btn w-full px-4 py-3 min-h-12">
      {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Download className="w-4 h-4" aria-hidden />}
      {label}
    </button>
  )

  const statusBox = (
    <>
      <div aria-live="polite" className="space-y-3">
        {status.kind === 'working' && (
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-sm text-sub">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden />{status.msg}
            </p>
            <progress className="w-full h-2 accent-primary" value={status.done} max={status.total} aria-label={status.msg} />
          </div>
        )}
        {status.kind === 'done' && (
          <p className="flex items-center gap-2 text-sm font-medium text-fg">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" aria-hidden />{status.msg}
          </p>
        )}
        {result && status.kind === 'done' && (
          <a href={result.url} download={result.name} className="ui-btn-soft w-full px-4 py-3 min-h-11 text-sm">
            <Download className="w-4 h-4 shrink-0" aria-hidden />
            <span className="truncate">{t('result.download', { name: result.name, size: formatBytes(result.size) })}</span>
          </a>
        )}
      </div>
      <div role="alert">
        {status.kind === 'error' && (
          <p className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />{status.msg}
          </p>
        )}
      </div>
      <p className="sr-only" aria-live="polite">{announce}</p>
    </>
  )

  // 탭별 [파일 영역, 설정·실행 영역]
  let main: ReactNode = null
  let side: ReactNode = null

  if (tab === 'merge') {
    main = (
      <>
        <DropZone accept=".pdf,application/pdf" multiple title={t(mergeFiles.length ? 'drop.more' : 'drop.pdfMulti')} hint={t('common.pdfOnly')} compact={mergeFiles.length > 0} onFiles={addMerge} />
        {mergeFiles.length > 0 && fileList(
          mergeFiles.map((f) => ({ ...f, meta: t('common.meta', { pages: f.pages, size: formatBytes(f.file.size) }) })),
          mergeDrag, moveMerge, (i) => { invalidate(); setMergeFiles((p) => p.filter((_, j) => j !== i)) },
          () => { invalidate(); setMergeFiles(byName) }, () => { invalidate(); setMergeFiles([]) },
        )}
      </>
    )
    side = (
      <>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-subtle p-3"><dt className="text-muted">{t('merge.files')}</dt><dd className="text-xl font-bold text-fg tabular-nums">{mergeFiles.length}</dd></div>
          <div className="rounded-xl bg-subtle p-3"><dt className="text-muted">{t('merge.totalPages')}</dt><dd className="text-xl font-bold text-fg tabular-nums">{mergeTotalPages}</dd></div>
        </dl>
        {mergeFiles.length > 0 && <p className="text-xs text-muted break-all">{t('common.outName', { name: outName(mergeFiles[0].file.name, t('suffix.merged')) })}</p>}
        {actionBtn(t('merge.button'), runMerge, mergeFiles.length < 2)}
        {mergeFiles.length === 1 && <p className="text-sm text-muted">{t('merge.errorMin')}</p>}
      </>
    )
  } else if (tab === 'split') {
    main = splitDoc ? (
      <>
        {docHeader(splitDoc, () => { invalidate(); setSplitDoc(null) })}
        <DropZone inputId="pdf-split-file" accept=".pdf,application/pdf" compact title={t('history.replace')} hint={t('history.replaceHint')} onFiles={loadSplit} />
        <div>
          <p className="text-sm font-medium text-body mb-2">{t('split.previewTitle')}</p>
          {groups.length ? (
            <>
              <p className="text-2xl font-bold text-fg tabular-nums">{t('split.preview', { count: groups.length })}</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {groups.slice(0, 12).map((g, i) => (
                  <li key={i} className="px-3 py-1.5 rounded-lg bg-soft text-sm text-body tabular-nums">
                    {t('split.groupLabel', { label: pageLabel(g, 24).replace(/_/g, ', '), count: g.length })}
                  </li>
                ))}
                {groups.length > 12 && <li className="px-3 py-1.5 text-sm text-muted">{t('split.more', { count: groups.length - 12 })}</li>}
              </ul>
              {groups.length > 1 && <p className="mt-3 text-xs text-muted">{t('split.zipNote')}</p>}
            </>
          ) : (
            <p className="text-sm text-muted">{t('split.previewEmpty')}</p>
          )}
        </div>
      </>
    ) : (
      <DropZone inputId="pdf-split-file" accept=".pdf,application/pdf" title={t('drop.pdfSingle')} hint={t('common.pdfOnly')} onFiles={loadSplit} />
    )
    side = (
      <>
        {radioGroup('pdf-split-mode', t('split.modeLabel'), splitMode, [['range', t('split.modeRange')], ['every', t('split.modeEvery')], ['single', t('split.modeSingle')]], setSplitMode)}
        {splitMode === 'range' && (
          <div className="space-y-3">
            <div>
              <label htmlFor="pdf-range" className="block text-sm font-medium text-body mb-2">{t('split.rangeLabel')}</label>
              <input
                id="pdf-range"
                type="text"
                inputMode="text"
                autoComplete="off"
                value={rangeText}
                onChange={(e) => { invalidate(); setRangeText(e.target.value) }}
                onBlur={() => rangeText && setRangeTouched(true)}
                placeholder={t('split.rangePlaceholder')}
                disabled={!splitDoc}
                aria-invalid={!!rangeErr}
                aria-describedby={rangeErr ? 'pdf-range-hint pdf-range-err' : 'pdf-range-hint'}
                className="ui-field px-4 py-3 text-base"
              />
              <p id="pdf-range-hint" className="mt-1.5 text-xs text-muted">{t('split.rangeHint')}</p>
              {rangeErr && (
                <p id="pdf-range-err" className="mt-1.5 flex items-start gap-1.5 text-sm text-red-600 dark:text-red-400">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />{rangeErr}
                </p>
              )}
            </div>
            <label className="flex items-center gap-3 min-h-11 text-sm text-body cursor-pointer">
              <input type="checkbox" checked={separate} onChange={(e) => { invalidate(); setSeparate(e.target.checked) }} className="size-5 accent-primary" />
              {t('split.separate')}
            </label>
          </div>
        )}
        {splitMode === 'every' && (
          <div>
            <label htmlFor="pdf-every" className="block text-sm font-medium text-body mb-2">{t('split.everyLabel')}</label>
            <input
              id="pdf-every"
              type="number"
              min={1}
              max={Math.max(1, splitPages)}
              value={everyN}
              onChange={(e) => { invalidate(); setEveryN(Math.max(1, Math.floor(Number(e.target.value)) || 1)) }}
              className="ui-field px-4 py-3 text-base tabular-nums"
            />
          </div>
        )}
        {splitMode === 'single' && <p className="text-sm text-muted">{t('split.singleHint')}</p>}
        {actionBtn(t('split.button'), runSplit, !splitDoc)}
      </>
    )
  } else if (tab === 'organize') {
    main = orgDoc ? (
      <>
        {docHeader(orgDoc, () => { invalidate(); setOrgDoc(null); installHistory(createPdfPageHistory()) })}
        <PdfHistoryControls undoCount={history.past.length} redoCount={history.future.length} onUndo={() => historyStep('undo')} onRedo={() => historyStep('redo')} />
        <DropZone inputId="pdf-org-file" accept=".pdf,application/pdf" compact title={t('history.replace')} hint={t('history.replaceHint')} onFiles={loadOrganize} />
        <p className="text-sm text-muted">{t('organize.hint')}</p>
        {cards.length ? (
          <ol className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3" aria-label={t('a11y.pageList')}>
            {cards.map((c, i) => {
              const n = c.src + 1
              const turned = c.rot % 180 !== 0
              const [dw, dh] = turned ? [c.h, c.w] : [c.w, c.h]
              return (
                <li key={c.key} data-pdf-page={n} data-pdf-rotation={c.rot} {...cardDrag.props(i)} className={`flex flex-col items-center gap-2 p-2 rounded-xl border bg-surface ${cardDrag.over === i ? 'border-primary' : 'border-line'}`}>
                  <div className="h-32 w-full flex items-center justify-center cursor-grab">
                    <div
                      className="flex items-center justify-center rounded-md border border-line-strong bg-subtle"
                      style={{ aspectRatio: `${dw} / ${dh}`, ...(dw > dh ? { width: '90%' } : { height: '100%' }) }}
                    >
                      <span className="text-lg font-semibold text-sub tabular-nums transition-transform" style={{ transform: `rotate(${c.rot}deg)` }}>{n}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted tabular-nums">
                    {t('organize.pageN', { n })}{c.rot ? ` · ${c.rot}°` : ''}
                  </p>
                  <div className="grid grid-cols-2 gap-1">
                    <button type="button" id={`pdf-pg-back-${c.key}`} className={iconBtn} disabled={i === 0} aria-label={t('a11y.pageMoveBack', { n })}
                      onClick={() => moveCard(i, i - 1, i - 1 === 0 ? `pdf-pg-fwd-${c.key}` : `pdf-pg-back-${c.key}`)}>
                      <ArrowLeft className="w-4 h-4" aria-hidden />
                    </button>
                    <button type="button" id={`pdf-pg-fwd-${c.key}`} className={iconBtn} disabled={i === cards.length - 1} aria-label={t('a11y.pageMoveForward', { n })}
                      onClick={() => moveCard(i, i + 1, i + 1 === cards.length - 1 ? `pdf-pg-back-${c.key}` : `pdf-pg-fwd-${c.key}`)}>
                      <ArrowRight className="w-4 h-4" aria-hidden />
                    </button>
                    <button type="button" className={iconBtn} aria-label={t('a11y.pageRotateRight', { n })} onClick={() => rotateCard(i, 90)}>
                      <RotateCw className="w-4 h-4" aria-hidden />
                    </button>
                    <button type="button" id={`pdf-pg-del-${c.key}`} className={`${iconBtn} hover:text-red-600`} aria-label={t('a11y.pageDelete', { n })} onClick={() => removeCard(i)}>
                      <Trash2 className="w-4 h-4" aria-hidden />
                    </button>
                  </div>
                </li>
              )
            })}
          </ol>
        ) : (
          <p className="text-sm text-muted">{t('organize.errorEmpty')}</p>
        )}
      </>
    ) : (
      <DropZone inputId="pdf-org-file" accept=".pdf,application/pdf" title={t('drop.pdfSingle')} hint={t('common.pdfOnly')} onFiles={loadOrganize} />
    )
    side = (
      <>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-subtle p-3"><dt className="text-muted">{t('organize.kept')}</dt><dd className="text-xl font-bold text-fg tabular-nums">{cards.length}</dd></div>
          <div className="rounded-xl bg-subtle p-3"><dt className="text-muted">{t('organize.removed')}</dt><dd className="text-xl font-bold text-fg tabular-nums">{removedCount}</dd></div>
        </dl>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => rotateAll(-90)} disabled={!cards.length} className="inline-flex items-center justify-center gap-1.5 min-h-11 px-3 rounded-xl text-sm text-body bg-soft hover:bg-subtle disabled:opacity-40">
            <RotateCcw className="w-4 h-4" aria-hidden />{t('organize.rotateAllLeft')}
          </button>
          <button type="button" onClick={() => rotateAll(90)} disabled={!cards.length} className="inline-flex items-center justify-center gap-1.5 min-h-11 px-3 rounded-xl text-sm text-body bg-soft hover:bg-subtle disabled:opacity-40">
            <RotateCw className="w-4 h-4" aria-hidden />{t('organize.rotateAllRight')}
          </button>
          <button type="button" id="pdf-org-reset" onClick={() => editPages({ kind: 'reset' })} disabled={!orgChanged} className="col-span-2 inline-flex items-center justify-center gap-1.5 min-h-11 px-3 rounded-xl text-sm text-body bg-soft hover:bg-subtle disabled:opacity-40">
            <Undo2 className="w-4 h-4" aria-hidden />{t('organize.reset')}
          </button>
        </div>
        {actionBtn(t('organize.button'), runOrganize, !orgDoc || !cards.length)}
        <p className="text-xs leading-relaxed text-muted">{t('history.memoryOnly')}</p>
        <p className="text-xs leading-relaxed text-muted">{t('history.snapshot')}</p>
      </>
    )
  } else {
    main = (
      <>
        <DropZone accept="image/*" multiple title={t(imgs.length ? 'drop.more' : 'drop.images')} hint={t('imageToPdf.formats')} compact={imgs.length > 0} onFiles={addImages} />
        {imgs.length > 0 && fileList(
          imgs.map((m) => ({ ...m, thumb: m.url, meta: formatBytes(m.file.size) })),
          imgDrag, moveImg, removeImg,
          () => { invalidate(); setImgs(byName) }, () => { invalidate(); setImgs((p) => { p.forEach((m) => URL.revokeObjectURL(m.url)); return [] }) },
        )}
      </>
    )
    side = (
      <>
        {radioGroup('pdf-paper', t('imageToPdf.pageSize'), paper, [['A4', 'A4'], ['Letter', 'Letter'], ['original', t('imageToPdf.paperOriginal')]], setPaper)}
        {paper !== 'original'
          ? radioGroup('pdf-orient', t('imageToPdf.orient'), orient, [['auto', t('imageToPdf.orientAuto')], ['portrait', t('imageToPdf.orientPortrait')], ['landscape', t('imageToPdf.orientLandscape')]], setOrient)
          : <p className="text-sm text-muted">{t('imageToPdf.originalHint')}</p>}
        {radioGroup('pdf-margin', t('imageToPdf.margin'), marginMm, [[0, t('imageToPdf.marginNone')], [5, '5mm'], [10, '10mm'], [20, '20mm']], setMarginMm)}
        <p className="text-sm text-muted">{t('imageToPdf.imagesAdded', { count: imgs.length })}</p>
        {actionBtn(t('imageToPdf.button'), runImages, !imgs.length)}
      </>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
        <p className="text-sm text-sub mt-2">{t('trust')}</p>
      </div>

      <div role="tablist" aria-label={t('tabs.aria')} onKeyDown={onTabKey} className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((id) => (
          <button
            key={id}
            id={`pdf-tab-${id}`}
            type="button"
            role="tab"
            aria-selected={tab === id}
            aria-controls="pdf-panel"
            tabIndex={tab === id ? 0 : -1}
            onClick={() => selectTab(id)}
            className={`shrink-0 min-h-11 px-4 rounded-xl text-sm font-medium ${tab === id ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}
          >
            {t(`tabs.${id}`)}
          </button>
        ))}
      </div>

      <div id="pdf-panel" data-pdf-tab={tab} role="tabpanel" aria-labelledby={`pdf-tab-${tab}`} onKeyDown={onOrganizeKey} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 ui-card p-4 sm:p-6 space-y-4 min-w-0">{main}</div>
        <div className="lg:col-span-1">
          <div className="ui-card p-4 sm:p-6 space-y-5 lg:sticky lg:top-20">
            {side}
            {statusBox}
          </div>
        </div>
      </div>

      <GuideSection namespace="pdfTools" />
    </div>
  )
}
