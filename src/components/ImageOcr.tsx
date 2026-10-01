'use client'

import { useState, useCallback, useRef, useEffect, DragEvent } from 'react'
import { useTranslations } from '@/lib/i18n'
import { Copy, Check, Download, Upload, Camera, RotateCcw, RotateCw, X, Loader2, AlertCircle } from 'lucide-react'
import type { Worker } from 'tesseract.js'
import { cleanOcrText, preprocessPixels, prepScale, type PrepMode, type CleanOptions } from '@/utils/ocr'

interface OcrWord { text: string; confidence: number; x0: number; y0: number; x1: number; y1: number }
interface Item {
  id: number
  file: File
  url: string
  rotation: number
  status: 'pending' | 'running' | 'done' | 'error'
  raw: string
  edited: string | null
  words: OcrWord[]
  conf: number
  key: string // 인식 당시 이미지 설정 (오버레이 좌표 유효성 판단)
}

const LANGUAGE_OPTIONS = [
  { code: 'kor', labelKey: 'languages.kor' },
  { code: 'eng', labelKey: 'languages.eng' },
  { code: 'jpn', labelKey: 'languages.jpn' },
  { code: 'chi_sim', labelKey: 'languages.chiSim' },
  { code: 'chi_tra', labelKey: 'languages.chiTra' },
]
const PREP_MODES: PrepMode[] = ['off', 'gray', 'binary']
const LOW_CONF = 60

const prepKey = (it: Item, mode: PrepMode) => `${it.id}|${it.rotation}|${mode}`

/** 회전 + 확대 + 흑백/이진화된 인식용 캔버스 */
async function prepareCanvas(file: File, rotation: number, mode: PrepMode): Promise<HTMLCanvasElement> {
  const src = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = src
    await img.decode()
    const s = prepScale(img.naturalWidth, img.naturalHeight, mode)
    const w = Math.round(img.naturalWidth * s), h = Math.round(img.naturalHeight * s)
    const swap = rotation === 90 || rotation === 270
    const canvas = document.createElement('canvas')
    canvas.width = swap ? h : w
    canvas.height = swap ? w : h
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
    ctx.imageSmoothingQuality = 'high'
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.drawImage(img, -w / 2, -h / 2, w, h)
    if (mode !== 'off') {
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
      preprocessPixels(data.data, mode)
      ctx.putImageData(data, 0, 0)
    }
    return canvas
  } finally {
    URL.revokeObjectURL(src)
  }
}

export default function ImageOcr() {
  const t = useTranslations('imageOcr')

  const [items, setItems] = useState<Item[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [selectedLangs, setSelectedLangs] = useState<string[]>(['kor', 'eng'])
  const [mode, setMode] = useState<PrepMode>('gray')
  const [clean, setClean] = useState<CleanOptions>({ fixKoreanSpaces: true, joinLines: false })
  const [view, setView] = useState<'prepared' | 'original'>('prepared')
  const [showConfidence, setShowConfidence] = useState(true)
  const [prepared, setPrepared] = useState<{ key: string; url: string; w: number; h: number } | null>(null)
  const [stage, setStage] = useState('')
  const [progress, setProgress] = useState(0)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const nextId = useRef(1)
  const workerRef = useRef<{ worker: Worker; langs: string } | null>(null)
  const runningRef = useRef(false)
  const itemsRef = useRef(items)
  itemsRef.current = items

  const active = items.find(i => i.id === activeId) ?? null
  const busy = items.some(i => i.status === 'running' || i.status === 'pending')

  // 언마운트 시 워커 종료 + 미리보기 URL 해제
  useEffect(() => () => {
    workerRef.current?.worker.terminate()
    workerRef.current = null
    itemsRef.current.forEach(i => URL.revokeObjectURL(i.url))
  }, [])

  const addFiles = useCallback((files: File[]) => {
    const imgs = files.filter(f => f.type.startsWith('image/'))
    if (!imgs.length) return
    const added: Item[] = imgs.map(file => ({
      id: nextId.current++, file, url: URL.createObjectURL(file), rotation: 0,
      status: 'pending', raw: '', edited: null, words: [], conf: 0, key: '',
    }))
    setItems(prev => [...prev, ...added])
    setActiveId(added[0].id)
  }, [])

  // Ctrl+V 붙여넣기 (페이지 어디서나)
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.items ?? [])
        .filter(it => it.type.startsWith('image/'))
        .map(it => it.getAsFile())
        .filter((f): f is File => !!f)
      if (files.length) { e.preventDefault(); addFiles(files) }
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [addFiles])

  // 워커 1개를 재사용 (언어가 바뀌면 reinitialize)
  const getWorker = useCallback(async (langs: string) => {
    const cur = workerRef.current
    if (cur) {
      if (cur.langs !== langs) {
        setStage('initializing')
        await cur.worker.reinitialize(langs)
        cur.langs = langs
      }
      return cur.worker
    }
    const { createWorker } = await import('tesseract.js')
    const worker = await createWorker(langs, 1, {
      logger: m => { setStage(m.status); setProgress(Math.round((m.progress ?? 0) * 100)) },
    })
    workerRef.current = { worker, langs }
    return worker
  }, [])

  // 대기열 처리: pending 하나씩 순서대로
  useEffect(() => {
    if (runningRef.current) return
    const next = items.find(i => i.status === 'pending')
    if (!next) return
    runningRef.current = true
    const langs = selectedLangs.join('+')
    const key = prepKey(next, mode)
    setItems(prev => prev.map(i => (i.id === next.id ? { ...i, status: 'running' } : i)))
    setProgress(0)
    ;(async () => {
      let patch: Partial<Item>
      try {
        const canvas = await prepareCanvas(next.file, next.rotation, mode)
        const worker = await getWorker(langs)
        const { data } = await worker.recognize(canvas, {}, { text: true, blocks: true })
        const words: OcrWord[] = []
        for (const b of data.blocks ?? []) for (const p of b.paragraphs) for (const l of p.lines) for (const w of l.words) {
          if (w.text.trim()) words.push({ text: w.text, confidence: w.confidence, ...w.bbox })
        }
        patch = { status: 'done', raw: data.text, edited: null, words, conf: data.confidence, key }
      } catch (error) {
        console.error('OCR error:', error)
        patch = { status: 'error' }
      }
      runningRef.current = false
      setStage('')
      setItems(prev => prev.map(i => (i.id === next.id ? { ...i, ...patch } : i)))
    })()
  }, [items, selectedLangs, mode, getWorker])

  // 인식용 이미지 미리보기 (보정 전/후 비교)
  const activeKey = active ? prepKey(active, mode) : ''
  useEffect(() => {
    if (!active) { setPrepared(null); return }
    let cancelled = false
    let url = ''
    prepareCanvas(active.file, active.rotation, mode).then(c => c.toBlob(b => {
      if (cancelled || !b) return
      url = URL.createObjectURL(b)
      setPrepared({ key: activeKey, url, w: c.width, h: c.height })
    }, 'image/png')).catch(() => setPrepared(null))
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey])

  const updateItem = (id: number, patch: Partial<Item>) =>
    setItems(prev => prev.map(i => (i.id === id ? { ...i, ...patch } : i)))

  const textOf = useCallback((i: Item) => i.edited ?? cleanOcrText(i.raw, clean), [clean])

  const removeItem = (id: number) => {
    const it = items.find(i => i.id === id)
    if (it) URL.revokeObjectURL(it.url)
    const rest = items.filter(i => i.id !== id)
    setItems(rest)
    if (activeId === id) setActiveId(rest[0]?.id ?? null)
  }

  const handleReset = () => {
    items.forEach(i => URL.revokeObjectURL(i.url))
    setItems([])
    setActiveId(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const rerun = (all: boolean) =>
    setItems(prev => prev.map(i => (all || i.id === activeId) && i.status !== 'running' ? { ...i, status: 'pending' } : i))

  const toggleLanguage = (code: string) =>
    setSelectedLangs(prev => prev.includes(code) ? (prev.length === 1 ? prev : prev.filter(l => l !== code)) : [...prev, code])

  const setCleanOpt = (k: keyof CleanOptions, v: boolean) => {
    setClean(c => ({ ...c, [k]: v }))
    setItems(prev => prev.map(i => ({ ...i, edited: null }))) // 정리 옵션 변경 시 원문에서 다시 생성
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
    } catch { /* 무시 */ }
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  const doneItems = items.filter(i => i.status === 'done')
  const allText = doneItems.map(textOf).join('\n\n')

  const handleDownloadTxt = () => {
    if (!allText) return
    const url = URL.createObjectURL(new Blob([allText], { type: 'text/plain;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'ocr-result.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  const hasFiles = (e: DragEvent<HTMLDivElement>) => e.dataTransfer.types.includes('Files')
  const onDragOver = (e: DragEvent<HTMLDivElement>) => { if (!hasFiles(e)) return; e.preventDefault(); setIsDragging(true) }
  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setIsDragging(false)
  }
  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    if (!hasFiles(e)) return
    e.preventDefault()
    setIsDragging(false)
    addFiles(Array.from(e.dataTransfer.files))
  }

  const stageLabel = stage.includes('recogniz') ? t('stages.recognize')
    : stage.includes('traineddata') ? t('stages.download')
    : t('stages.init')
  const runningIdx = items.findIndex(i => i.status === 'running')
  const lowWords = active?.words.filter(w => w.confidence < LOW_CONF) ?? []
  const overlayOk = !!active && !!prepared && active.status === 'done' && active.key === prepared.key && prepared.key === activeKey

  const segBtn = (on: boolean) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'text-body hover:bg-subtle'}`

  const guideList = (key: string) => {
    const v = t.raw(key)
    return Array.isArray(v) ? (v as string[]) : []
  }
  const faqItems = (() => {
    const v = t.raw('guide.faq.items')
    return Array.isArray(v) ? (v as { q: string; a: string }[]) : []
  })()

  return (
    <div className="space-y-8" onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
        <p className="text-xs text-sub mt-2">{t('privacy')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 설정 */}
        <div className="lg:col-span-1 min-w-0">
          <div className="ui-card p-6 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-fg mb-3">{t('upload')}</h2>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`w-full border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                  isDragging ? 'border-primary bg-primary-soft' : 'border-line-strong hover:border-primary'
                }`}
              >
                <Upload className="w-10 h-10 mx-auto mb-2 text-faint" />
                <p className="text-sm text-sub mb-1">{t('uploadDragDrop')}</p>
                <p className="text-xs text-muted">{t('pasteHint')}</p>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
                onChange={e => { addFiles(Array.from(e.target.files ?? [])); e.target.value = '' }} />
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
                onChange={e => { addFiles(Array.from(e.target.files ?? [])); e.target.value = '' }} />
              <button type="button" onClick={() => cameraInputRef.current?.click()}
                className="md:hidden mt-2 w-full ui-btn-soft px-4 py-2.5">
                <Camera className="w-4 h-4" />{t('camera')}
              </button>
            </div>

            {items.length > 0 && (
              <div>
                <p className="text-sm font-medium text-body mb-2">{t('queue', { n: items.length })}</p>
                <div className="flex flex-wrap gap-2">
                  {items.map(it => (
                    <div key={it.id} className="relative">
                      <button type="button" onClick={() => setActiveId(it.id)}
                        aria-label={it.file.name}
                        className={`block w-16 h-16 rounded-lg overflow-hidden border-2 ${it.id === activeId ? 'border-primary' : 'border-line'}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={it.url} alt="" className="w-full h-full object-cover" />
                        {(it.status === 'running' || it.status === 'pending') && (
                          <span className="absolute inset-0 flex items-center justify-center bg-surface/70">
                            <Loader2 className={`w-5 h-5 text-primary ${it.status === 'running' ? 'animate-spin' : ''}`} />
                          </span>
                        )}
                        {it.status === 'error' && (
                          <span className="absolute inset-0 flex items-center justify-center bg-surface/70">
                            <AlertCircle className="w-5 h-5 text-amber-600" />
                          </span>
                        )}
                      </button>
                      <button type="button" onClick={() => removeItem(it.id)} aria-label={t('remove')}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-fg text-canvas flex items-center justify-center">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-body mb-2">{t('language')}</p>
              <div className="flex flex-wrap gap-2">
                {LANGUAGE_OPTIONS.map(lang => (
                  <button key={lang.code} type="button" onClick={() => toggleLanguage(lang.code)}
                    aria-pressed={selectedLangs.includes(lang.code)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      selectedLangs.includes(lang.code) ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'
                    }`}>
                    {t(lang.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-body mb-2">{t('prep.title')}</p>
              <div className="flex gap-1 p-1 bg-soft rounded-xl">
                {PREP_MODES.map(m => (
                  <button key={m} type="button" onClick={() => setMode(m)} aria-pressed={mode === m}
                    className={`flex-1 ${segBtn(mode === m)}`}>
                    {t(`prep.${m}`)}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted mt-2">{t(`prep.${mode}Hint`)}</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-body">{t('cleanup.title')}</p>
              {(['fixKoreanSpaces', 'joinLines'] as const).map(k => (
                <label key={k} className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={clean[k]} onChange={e => setCleanOpt(k, e.target.checked)}
                    className="w-4 h-4 mt-0.5 accent-blue-600" />
                  <span className="text-sm text-body">{t(`cleanup.${k}`)}</span>
                </label>
              ))}
            </div>

            <div className="space-y-2">
              <button type="button" onClick={() => rerun(false)} disabled={!active || active.status === 'running'}
                className="w-full ui-btn px-4 py-3">
                {active?.status === 'done' ? t('rerun') : t('recognize')}
              </button>
              {items.length > 1 && (
                <button type="button" onClick={() => rerun(true)} disabled={busy}
                  className="w-full ui-btn-soft px-4 py-2.5 disabled:opacity-50">
                  {t('rerunAll')}
                </button>
              )}
              <button type="button" onClick={handleReset} disabled={!items.length}
                className="w-full bg-soft hover:bg-subtle text-body rounded-xl px-4 py-2.5 font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                <RotateCcw className="w-4 h-4" />{t('reset')}
              </button>
              <p className="text-xs text-muted">{t('rerunHint')}</p>
            </div>

            {runningIdx >= 0 && (
              <div className="space-y-2" aria-live="polite">
                <div className="flex items-center justify-between text-sm gap-2">
                  <span className="text-sub">
                    {stageLabel}{items.length > 1 ? ` · ${t('imageOf', { n: runningIdx + 1, total: items.length })}` : ''}
                  </span>
                  <span className="text-primary font-medium tabular-nums">{progress}%</span>
                </div>
                <div className="w-full h-2 bg-track rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
                {!stage.includes('recogniz') && <p className="text-xs text-muted">{t('modelNote')}</p>}
              </div>
            )}
          </div>
        </div>

        {/* 미리보기 + 결과 */}
        <div className="lg:col-span-2 space-y-6 min-w-0">
          {active && (
            <div className="ui-card p-4 sm:p-6 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-1 p-1 bg-soft rounded-xl">
                  <button type="button" onClick={() => setView('prepared')} className={segBtn(view === 'prepared')}>{t('view.prepared')}</button>
                  <button type="button" onClick={() => setView('original')} className={segBtn(view === 'original')}>{t('view.original')}</button>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => updateItem(active.id, { rotation: (active.rotation + 270) % 360 })}
                    title={t('rotateLeft')} aria-label={t('rotateLeft')}
                    className="p-2 bg-soft hover:bg-subtle text-body rounded-lg"><RotateCcw className="w-4 h-4" /></button>
                  <span className="text-xs text-muted w-10 text-center tabular-nums">{active.rotation}°</span>
                  <button type="button" onClick={() => updateItem(active.id, { rotation: (active.rotation + 90) % 360 })}
                    title={t('rotateRight')} aria-label={t('rotateRight')}
                    className="p-2 bg-soft hover:bg-subtle text-body rounded-lg"><RotateCw className="w-4 h-4" /></button>
                </div>
              </div>

              <div className="relative bg-subtle rounded-xl overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={view === 'original' || !prepared ? active.url : prepared.url}
                  alt={t('previewAlt')}
                  className="block w-full h-auto max-h-[420px] object-contain"
                />
                {view === 'prepared' && overlayOk && showConfidence && prepared && (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none text-amber-500"
                    viewBox={`0 0 ${prepared.w} ${prepared.h}`} preserveAspectRatio="xMidYMid meet" aria-hidden>
                    {lowWords.map((w, i) => (
                      <rect key={i} x={w.x0} y={w.y0} width={w.x1 - w.x0} height={w.y1 - w.y0}
                        fill="currentColor" fillOpacity={0.2} stroke="currentColor" strokeWidth={Math.max(2, prepared.w / 400)} />
                    ))}
                  </svg>
                )}
              </div>
              {active.status === 'done' && active.key !== activeKey && (
                <p className="text-xs text-amber-600">{t('staleHint')}</p>
              )}
            </div>
          )}

          <div className="ui-card p-4 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-fg">{t('result')}</h2>
              {doneItems.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {active?.status === 'done' && (
                    <button type="button" onClick={() => copyToClipboard(textOf(active), 'result')}
                      className="ui-btn-soft px-3 py-1.5 text-sm">
                      {copiedId === 'result' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copiedId === 'result' ? t('copied') : t('copy')}
                    </button>
                  )}
                  {doneItems.length > 1 && (
                    <button type="button" onClick={() => copyToClipboard(allText, 'all')}
                      className="ui-btn-soft px-3 py-1.5 text-sm">
                      {copiedId === 'all' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copiedId === 'all' ? t('copied') : t('copyAll')}
                    </button>
                  )}
                  <button type="button" onClick={handleDownloadTxt} className="ui-btn px-3 py-1.5 text-sm">
                    <Download className="w-4 h-4" />{t('downloadTxt')}
                  </button>
                </div>
              )}
            </div>

            {active?.status === 'done' ? (
              <>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <span className="text-sub">{t('avgConfidence')} <b className="text-fg tabular-nums">{Math.round(active.conf)}%</b></span>
                  <span className="text-sub">{t('lowCount', { n: lowWords.length })}</span>
                  {lowWords.length > 0 && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={showConfidence} onChange={e => setShowConfidence(e.target.checked)}
                        className="w-4 h-4 accent-blue-600" />
                      <span className="text-body">{t('showConfidence')}</span>
                    </label>
                  )}
                </div>
                <textarea
                  value={textOf(active)}
                  onChange={e => updateItem(active.id, { edited: e.target.value })}
                  rows={12}
                  aria-label={t('result')}
                  className="ui-field px-4 py-3 text-sm leading-relaxed resize-y"
                />
                {showConfidence && lowWords.length > 0 && (
                  <div>
                    <p className="text-xs text-muted mb-2">{t('lowWordsHint')}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {lowWords.slice(0, 40).map((w, i) => (
                        <span key={i} title={`${t('confidence')}: ${w.confidence.toFixed(0)}%`}
                          className="px-2 py-0.5 rounded-md text-sm bg-soft text-fg border-b-2 border-amber-500">
                          {w.text} <span className="text-xs tabular-nums">{w.confidence.toFixed(0)}%</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-14">
                <p className="text-muted">
                  {!active ? t('noImage') : active.status === 'error' ? t('error') : t('recognizing')}
                </p>
                <p className="text-sm text-faint mt-1">{t('resultPlaceholder')}</p>
              </div>
            )}
            {active?.status === 'done' && !textOf(active) && <p className="text-sm text-muted">{t('noResult')}</p>}
          </div>
        </div>
      </div>

      {/* 가이드 (항상 펼침) */}
      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        <div>
          <h3 className="text-lg font-semibold text-fg mb-2">{t('guide.whatIs.title')}</h3>
          <p className="text-sub leading-relaxed">{t('guide.whatIs.description')}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(['howToUse', 'features', 'tips'] as const).map(sec => (
            <div key={sec}>
              <h3 className="text-lg font-semibold text-fg mb-3">{t(`guide.${sec}.title`)}</h3>
              <ul className="space-y-2">
                {guideList(`guide.${sec}.items`).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sub">
                    <span className="text-primary mt-0.5">•</span><span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-fg mb-3">{t('guide.faq.title')}</h3>
          <div className="space-y-3">
            {faqItems.map((f, i) => (
              <div key={i} className="bg-subtle rounded-2xl p-5">
                <p className="font-medium text-fg">{f.q}</p>
                <p className="text-sm text-sub mt-1 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
