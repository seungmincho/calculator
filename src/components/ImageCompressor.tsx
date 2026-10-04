'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/imageCompressor'
import { useSearchParams } from '@/hooks/useSearchParams'
import { Upload, Download, Trash2, Loader2, Archive } from 'lucide-react'
import {
  compressFile, detectEncoders, formatBytes, savingsPct, outputName, outputMime, uniqueNames, isHeic,
  type OutputFormat, type CompressOutput,
} from '@/utils/imageCompress'

// ── Types / constants ──

type Mode = 'quality' | 'target'
type ErrCode = 'heic' | 'decode' | 'format'

interface Item {
  id: string
  file: File
  previewUrl: string
  status: 'pending' | 'processing' | 'done' | 'error'
  key?: string // 어떤 설정으로 처리됐는지 — 설정이 바뀌면 다시 처리
  out?: CompressOutput & { url: string }
  error?: ErrCode
}

const FORMATS: OutputFormat[] = ['original', 'jpeg', 'webp', 'avif', 'png']
const TARGETS = [200, 500, 1000, 2000, 5000]
const SIDES = [0, 2560, 1920, 1280, 1080]
const MAX_FILE = 50 * 1024 * 1024
const DEF = { q: 80, kb: 500 }

const PRESETS = [
  { id: 'doc', mode: 'target' as Mode, kb: 500, q: DEF.q, f: 'jpeg' as OutputFormat, s: 0 },
  { id: 'mail', mode: 'target' as Mode, kb: 1000, q: DEF.q, f: 'jpeg' as OutputFormat, s: 0 },
  { id: 'blog', mode: 'quality' as Mode, kb: DEF.kb, q: 80, f: 'jpeg' as OutputFormat, s: 1920 },
  { id: 'sns', mode: 'quality' as Mode, kb: DEF.kb, q: 85, f: 'jpeg' as OutputFormat, s: 1080 },
]

const num = (v: string | null, lo: number, hi: number, d: number) => {
  const n = Number(v)
  return v !== null && v !== '' && Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : d
}
const kbLabel = (kb: number) => (kb >= 1000 ? `${kb / 1000}MB` : `${kb}KB`)
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

const chip = (on: boolean) =>
  `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
    on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'
  }`

// ── Component ──

export default function ImageCompressor() {
  const t = useTranslations('imageCompressor')
  const sp = useSearchParams()

  const [mode, setMode] = useState<Mode>(() => (sp.get('m') === 't' ? 'target' : 'quality'))
  const [quality, setQuality] = useState(() => num(sp.get('q'), 10, 100, DEF.q))
  const [targetKB, setTargetKB] = useState(() => num(sp.get('kb'), 20, 20000, DEF.kb))
  const [format, setFormat] = useState<OutputFormat>(() => {
    const f = sp.get('f') as OutputFormat
    return FORMATS.includes(f) ? f : 'original'
  })
  const [maxSide, setMaxSide] = useState(() => num(sp.get('s'), 0, 10000, 0))

  const [images, setImages] = useState<Item[]>([])
  const [enc, setEnc] = useState<{ webp: boolean; avif: boolean } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [zipping, setZipping] = useState(false)
  const [skipped, setSkipped] = useState(0)
  const [compareId, setCompareId] = useState<string | null>(null)
  const [pos, setPos] = useState(50)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const imagesRef = useRef<Item[]>([])
  const runGen = useRef(0)

  // 입력 중간값(예: "1" → "1080") 보호
  const kb = Math.max(20, targetKB || 0)
  const side = maxSide > 0 ? Math.max(100, maxSide) : 0
  const key = `${mode === 'target' ? `t${kb}` : `q${quality}`}|${format}|${side}`

  useEffect(() => { imagesRef.current = images }, [images])

  useEffect(() => {
    detectEncoders().then(setEnc).catch(() => setEnc({ webp: false, avif: false }))
  }, [])

  // URL 동기화 (기본값과 다른 것만)
  useEffect(() => {
    const id = setTimeout(() => {
      const p = new URLSearchParams()
      if (mode === 'target') { p.set('m', 't'); if (kb !== DEF.kb) p.set('kb', String(kb)) }
      else if (quality !== DEF.q) p.set('q', String(quality))
      if (format !== 'original') p.set('f', format)
      if (side) p.set('s', String(side))
      const qs = p.toString()
      window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`)
    }, 300)
    return () => clearTimeout(id)
  }, [mode, kb, quality, format, side])

  // ── 파일 추가 ──

  const addFiles = useCallback((list: FileList | File[]) => {
    const ok: Item[] = []
    let bad = 0
    Array.from(list).forEach((file) => {
      if (!(file.type.startsWith('image/') || isHeic(file)) || file.type === 'image/svg+xml' || file.size > MAX_FILE) { bad++; return }
      ok.push({ id: uid(), file, previewUrl: URL.createObjectURL(file), status: 'pending' })
    })
    setSkipped(bad)
    if (ok.length) setImages((prev) => [...prev, ...ok])
  }, [])

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? [])
      if (files.length) { e.preventDefault(); addFiles(files) }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [addFiles])

  const patch = (id: string, p: Partial<Item>) =>
    setImages((prev) => prev.map((i) => (i.id === id ? { ...i, ...p } : i)))

  // ── 자동 압축: 설정 변경/파일 추가 시 한 장씩 순차 처리 (메모리·UI 반응성) ──
  useEffect(() => {
    const gen = ++runGen.current
    const opts = { format, quality, maxSide: side, targetKB: mode === 'target' ? kb : 0 }
    const timer = setTimeout(async () => {
      const todo = imagesRef.current.filter((i) => i.key !== key || i.status === 'pending' || i.status === 'processing')
      if (!todo.length) { setBusy(false); return }
      setBusy(true)
      for (const it of todo) {
        if (runGen.current !== gen) return
        if (!imagesRef.current.some((i) => i.id === it.id)) continue
        patch(it.id, { status: 'processing' })
        let next: Partial<Item>
        try {
          const out = await compressFile(it.file, opts)
          if (runGen.current !== gen) return
          if (!imagesRef.current.some((i) => i.id === it.id)) continue
          next = { status: 'done', key, out: { ...out, url: URL.createObjectURL(out.blob) }, error: undefined }
        } catch (e) {
          if (runGen.current !== gen) return
          const msg = e instanceof Error ? e.message : ''
          next = { status: 'error', key, out: undefined, error: msg === 'format' ? 'format' : isHeic(it.file) ? 'heic' : 'decode' }
        }
        const old = imagesRef.current.find((i) => i.id === it.id)?.out?.url
        if (old) URL.revokeObjectURL(old)
        patch(it.id, next)
      }
      if (runGen.current === gen) setBusy(false)
    }, 300)
    return () => clearTimeout(timer)
    // key가 모든 설정을 담고 있음
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, images.length])

  // 언마운트 시 진행 중단 + object URL 해제
  useEffect(() => () => {
    runGen.current++
    imagesRef.current.forEach((i) => { URL.revokeObjectURL(i.previewUrl); if (i.out) URL.revokeObjectURL(i.out.url) })
  }, [])

  // ── 삭제 ──

  const revoke = (i: Item) => { URL.revokeObjectURL(i.previewUrl); if (i.out) URL.revokeObjectURL(i.out.url) }
  const removeImage = (id: string) => {
    const it = images.find((i) => i.id === id)
    if (it) revoke(it)
    setImages((prev) => prev.filter((i) => i.id !== id))
  }
  const removeAll = () => {
    images.forEach(revoke)
    setImages([])
    setSkipped(0)
  }

  // ── 다운로드 ──

  const saveBlob = (href: string, name: string) => {
    const a = document.createElement('a')
    a.href = href
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  const done = images.filter((i) => i.status === 'done' && i.key === key && i.out)

  const downloadZip = async () => {
    if (!done.length) return
    setZipping(true)
    try {
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()
      const names = uniqueNames(done.map((i) => outputName(i.file.name, i.out!.mime)))
      done.forEach((i, n) => zip.file(names[n], i.out!.blob))
      // 이미 압축된 이미지라 재압축 이득 없음 → STORE
      const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' })
      const url = URL.createObjectURL(blob)
      saveBlob(url, `compressed_${done.length}.zip`)
      setTimeout(() => URL.revokeObjectURL(url), 10000)
    } finally {
      setZipping(false)
    }
  }

  // ── 설정 ──

  const applyPreset = (p: (typeof PRESETS)[number]) => {
    setMode(p.mode); setTargetKB(p.kb); setQuality(p.q); setFormat(p.f); setMaxSide(p.s)
  }
  const presetActive = (p: (typeof PRESETS)[number]) =>
    mode === p.mode && format === p.f && side === p.s && (p.mode === 'target' ? kb === p.kb : quality === p.q)

  const formatDisabled = (f: OutputFormat) => (f === 'webp' && enc ? !enc.webp : f === 'avif' && enc ? !enc.avif : false)
  const hasPngOut = images.some((i) => outputMime(format, i.file.type) === 'image/png')

  // ── 요약 ──

  const totalOrig = done.reduce((s, i) => s + i.file.size, 0)
  const totalOut = done.reduce((s, i) => s + i.out!.blob.size, 0)
  const finished = images.filter((i) => i.key === key && (i.status === 'done' || i.status === 'error')).length
  const missed = done.filter((i) => !i.out!.ok).length
  const compare = done.find((i) => i.id === compareId) ?? done[0]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* ── 왼쪽: 업로드 + 설정 ── */}
        <div className="lg:col-span-1 space-y-6 min-w-0">
          <div className="ui-card p-5 space-y-3">
            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                isDragging ? 'border-primary bg-primary-soft' : 'border-line-strong hover:border-primary'
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files) }}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragging(false) }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click() }
              }}
              aria-label={t('dropzone')}
            >
              <Upload className="mx-auto mb-3 text-faint" size={36} />
              <p className="text-sm font-medium text-body">{t('dropzone')}</p>
              <p className="text-xs text-muted mt-1">{t('dropzoneHint')}</p>
              <p className="text-xs text-faint mt-1">{t('maxFileSize')}</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.heic,.heif"
              multiple
              className="hidden"
              onChange={(e) => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = '' }}
            />
            <p className="text-xs text-muted leading-relaxed">{t('privacyNote')}</p>
            {skipped > 0 && <p className="text-xs text-amber-700">{t('skippedFiles', { n: skipped })}</p>}
          </div>

          <div className="ui-card p-5 space-y-6">
            {/* 용도별 프리셋 */}
            <div>
              <p className="text-sm font-semibold text-fg mb-2">{t('presetsTitle')}</p>
              <div className="grid grid-cols-2 gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => applyPreset(p)}
                    className={`text-left rounded-xl border px-3 py-2 transition-colors ${
                      presetActive(p) ? 'border-primary bg-primary-soft text-primary' : 'border-line text-body hover:bg-subtle'
                    }`}
                  >
                    <span className="block text-sm font-semibold">{t(`preset.${p.id}`)}</span>
                    <span className="block text-xs opacity-80">{t(`preset.${p.id}Desc`)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 모드 */}
            <div>
              <p className="text-sm font-semibold text-fg mb-2">{t('modeTitle')}</p>
              <div className="grid grid-cols-2 gap-1 bg-soft rounded-xl p-1">
                {(['quality', 'target'] as Mode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`rounded-lg py-2 text-sm font-semibold transition-colors ${mode === m ? 'bg-primary text-white' : 'text-sub'}`}
                  >
                    {t(m === 'quality' ? 'modeQuality' : 'modeTarget')}
                  </button>
                ))}
              </div>
            </div>

            {mode === 'quality' ? (
              <div>
                <label className="flex items-center justify-between text-sm font-medium text-body mb-2">
                  <span>{t('quality')}</span>
                  <span className="text-primary font-semibold tabular-nums">{quality}%</span>
                </label>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="w-full accent-blue-600"
                  aria-label={t('quality')}
                />
                <div className="flex justify-between text-xs text-faint mt-1">
                  <span>{t('qualityLow')}</span>
                  <span>{t('qualityHigh')}</span>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-body mb-2">{t('targetTitle')}</p>
                <div className="flex flex-wrap gap-2">
                  {TARGETS.map((v) => (
                    <button key={v} onClick={() => setTargetKB(v)} className={chip(kb === v)}>{kbLabel(v)}</button>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <input
                    type="number"
                    min={20}
                    inputMode="numeric"
                    value={targetKB || ''}
                    onChange={(e) => setTargetKB(Number(e.target.value) || 0)}
                    className="ui-field px-3 py-2 text-sm"
                    aria-label={t('targetCustom')}
                    placeholder={t('targetCustom')}
                  />
                  <span className="text-sm text-sub shrink-0">KB</span>
                </div>
                <p className="text-xs text-muted mt-2 leading-relaxed">{t('targetHint')}</p>
              </div>
            )}

            {/* 출력 형식 */}
            <div>
              <p className="text-sm font-medium text-body mb-2">{t('format')}</p>
              <div className="flex flex-wrap gap-2">
                {FORMATS.map((f) => (
                  <button key={f} onClick={() => setFormat(f)} disabled={formatDisabled(f)} className={chip(format === f)}>
                    {f === 'original' ? t('formatOriginal') : f === 'jpeg' ? 'JPG' : f === 'webp' ? 'WebP' : f.toUpperCase()}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted mt-2 leading-relaxed">{t(`formatHint.${format}`)}</p>
              {enc && !enc.avif && <p className="text-xs text-faint mt-1">{t('avifUnsupported')}</p>}
              {hasPngOut && <p className="text-xs text-amber-700 mt-1 leading-relaxed">{t('pngHint')}</p>}
            </div>

            {/* 크기 */}
            <div>
              <p className="text-sm font-medium text-body mb-2">{t('maxSideTitle')}</p>
              <div className="flex flex-wrap gap-2">
                {SIDES.map((v) => (
                  <button key={v} onClick={() => setMaxSide(v)} className={chip(side === v)}>
                    {v === 0 ? t('sideOriginal') : `${v}px`}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-3">
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={maxSide || ''}
                  onChange={(e) => setMaxSide(Math.max(0, Number(e.target.value) || 0))}
                  className="ui-field px-3 py-2 text-sm"
                  aria-label={t('sideCustom')}
                  placeholder={t('sideCustom')}
                />
                <span className="text-sm text-sub shrink-0">px</span>
              </div>
              <p className="text-xs text-muted mt-2">{t('maxSideHint')}</p>
            </div>
          </div>
        </div>

        {/* ── 오른쪽: 결과 ── */}
        <div className="lg:col-span-2 space-y-6 min-w-0">
          {done.length > 0 && (
            <div className="ui-hero p-6 space-y-4">
              <div>
                <p className="text-sm text-white/70">{t('heroLabel', { n: done.length })}</p>
                <p className="text-4xl font-bold tabular-nums mt-1">
                  {savingsPct(totalOrig, totalOut) >= 0 ? `-${savingsPct(totalOrig, totalOut)}%` : `+${-savingsPct(totalOrig, totalOut)}%`}
                </p>
                <p className="text-lg font-semibold tabular-nums mt-1">
                  {formatBytes(totalOrig)} → {formatBytes(totalOut)}
                </p>
                {mode === 'target' && (
                  <p className="text-sm text-white/70 mt-1">
                    {t('heroTarget', { kb: kbLabel(kb), ok: done.length - missed, n: done.length })}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {done.length > 1 ? (
                  <button
                    onClick={downloadZip}
                    disabled={zipping || busy}
                    className="inline-flex items-center gap-2 bg-surface text-primary rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
                  >
                    {zipping ? <Loader2 size={16} className="animate-spin" /> : <Archive size={16} />}
                    {t('downloadZip', { n: done.length })}
                  </button>
                ) : (
                  <button
                    onClick={() => saveBlob(done[0].out!.url, outputName(done[0].file.name, done[0].out!.mime))}
                    className="inline-flex items-center gap-2 bg-surface text-primary rounded-xl px-4 py-2.5 text-sm font-semibold"
                  >
                    <Download size={16} />
                    {t('download')}
                  </button>
                )}
              </div>
            </div>
          )}

          {missed > 0 && (
            <div className="bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm">{t('targetMissed', { n: missed })}</div>
          )}

          {/* 전후 비교 */}
          {compare?.out && (
            <div className="ui-card p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-fg">{t('compareTitle')}</p>
                <p className="text-xs text-muted truncate min-w-0">{compare.file.name}</p>
              </div>
              <div className="relative w-full h-72 sm:h-96 bg-soft rounded-xl overflow-hidden select-none">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={compare.out.url} alt={t('after')} className="absolute inset-0 w-full h-full object-contain" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={compare.previewUrl}
                  alt={t('before')}
                  className="absolute inset-0 w-full h-full object-contain"
                  style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
                />
                <div className="absolute top-0 bottom-0 w-0.5 bg-surface" style={{ left: `${pos}%` }} />
                <span className="absolute top-2 left-2 bg-surface text-body text-xs font-medium px-2 py-0.5 rounded-md">{t('before')}</span>
                <span className="absolute top-2 right-2 bg-surface text-body text-xs font-medium px-2 py-0.5 rounded-md">{t('after')}</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={pos}
                onChange={(e) => setPos(Number(e.target.value))}
                className="w-full accent-blue-600"
                aria-label={t('compareTitle')}
              />
              <p className="text-xs text-muted">{t('compareHint')}</p>
            </div>
          )}

          {/* 파일 목록 */}
          <div className="ui-card p-5">
            {images.length === 0 ? (
              <div className="text-center py-14">
                <p className="text-body font-medium">{t('noImages')}</p>
                <p className="text-sm text-muted mt-2">{t('emptyHint')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-fg tabular-nums">
                    {t('listTitle', { n: images.length })}
                    {busy && (
                      <span className="ml-2 inline-flex items-center gap-1 text-primary font-medium">
                        <Loader2 size={14} className="animate-spin" />
                        {finished}/{images.length}
                      </span>
                    )}
                  </p>
                  <button onClick={removeAll} className="text-sm text-sub hover:text-fg px-2 py-1 rounded-lg hover:bg-soft">
                    {t('removeAll')}
                  </button>
                </div>

                {images.map((it) => {
                  const out = it.status === 'done' ? it.out : undefined
                  const pct = out ? savingsPct(it.file.size, out.blob.size) : 0
                  const selected = compare?.id === it.id
                  return (
                    <div
                      key={it.id}
                      className={`flex gap-3 items-center border rounded-xl p-3 ${selected ? 'border-primary' : 'border-line'}`}
                    >
                      <button
                        onClick={() => out && setCompareId(it.id)}
                        className="shrink-0 w-16 h-16 bg-soft rounded-lg overflow-hidden flex items-center justify-center"
                        aria-label={t('compareTitle')}
                        disabled={!out}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={out?.url || it.previewUrl}
                          alt={it.file.name}
                          className="max-w-full max-h-full object-contain"
                          onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}
                        />
                      </button>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-fg truncate">{it.file.name}</p>
                        {out ? (
                          <>
                            <p className="text-sm tabular-nums mt-0.5">
                              <span className="text-sub">{formatBytes(it.file.size)}</span>
                              <span className="text-faint"> → </span>
                              <span className="font-semibold text-fg">{formatBytes(out.blob.size)}</span>
                              <span className={`ml-2 font-semibold ${pct >= 0 ? 'text-primary' : 'text-amber-700'}`}>
                                {pct >= 0 ? `-${pct}%` : `+${-pct}%`}
                              </span>
                            </p>
                            <p className="text-xs text-muted tabular-nums mt-0.5 truncate">
                              {out.srcWidth}×{out.srcHeight}
                              {(out.width !== out.srcWidth || out.height !== out.srcHeight) && ` → ${out.width}×${out.height}`}
                              {' · '}
                              {t('qualityUsed', { q: Math.round(out.quality * 100) })}
                            </p>
                            {!out.ok && <p className="text-xs text-amber-700 mt-0.5">{t('rowMissed')}</p>}
                            {out.ok && pct < 0 && <p className="text-xs text-amber-700 mt-0.5">{t('rowLarger')}</p>}
                          </>
                        ) : it.status === 'error' ? (
                          <p className="text-xs text-red-600 mt-1 leading-relaxed">
                            {t(it.error === 'heic' ? 'errHeic' : it.error === 'format' ? 'errFormat' : 'errDecode')}
                          </p>
                        ) : (
                          <p className="text-xs text-muted mt-1 inline-flex items-center gap-1">
                            {it.status === 'processing' && <Loader2 size={12} className="animate-spin" />}
                            {formatBytes(it.file.size)} · {t(it.status === 'processing' ? 'processing' : 'waiting')}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {out && (
                          <button
                            onClick={() => saveBlob(out.url, outputName(it.file.name, out.mime))}
                            className="p-2 text-primary hover:bg-primary-soft rounded-lg"
                            title={t('download')}
                            aria-label={t('download')}
                          >
                            <Download size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => removeImage(it.id)}
                          className="p-2 text-faint hover:text-fg hover:bg-soft rounded-lg"
                          title={t('remove')}
                          aria-label={t('remove')}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 가이드 (항상 펼침) ── */}
      <div className="ui-card p-6 space-y-8">
        <div>
          <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
          <p className="text-sm text-sub leading-relaxed mt-3">{t('guide.whatIs.description')}</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-fg mb-3">{t('guide.howToUse.title')}</h3>
          <ul className="space-y-2">
            {(t.raw('guide.howToUse.items') as string[]).map((item, i) => (
              <li key={i} className="text-sm text-sub leading-relaxed">{item}</li>
            ))}
          </ul>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(['uses', 'formats', 'tips'] as const).map((sec) => (
            <div key={sec}>
              <h3 className="text-sm font-semibold text-fg mb-3">{t(`guide.${sec}.title`)}</h3>
              <ul className="space-y-2 list-disc pl-4 marker:text-faint">
                {(t.raw(`guide.${sec}.items`) as string[]).map((item, i) => (
                  <li key={i} className="text-sm text-sub leading-relaxed">{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-fg mb-3">{t('guide.faq.title')}</h3>
          <div className="space-y-4">
            {(t.raw('guide.faq.items') as { q: string; a: string }[]).map((f, i) => (
              <div key={i}>
                <p className="text-sm font-semibold text-body">Q. {f.q}</p>
                <p className="text-sm text-sub mt-1 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
