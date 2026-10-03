'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslations } from '@/lib/i18n'
import { useSearchParams } from '@/hooks/useSearchParams'
import { Upload, Download, Trash2, Loader2, Archive, Lock, Unlock } from 'lucide-react'
import { detectEncoders, formatBytes, outputName, uniqueNames, isHeic } from '@/utils/imageCompress'
import {
  resizeFile, cmToPx, clampInt, PRESETS, MAX_SIDE, isFixedSize,
  type SizeMode, type Fit, type ResizeFormat, type ResizeOutput, type Preset,
} from '@/utils/imageResize'

// ── Types / constants ──

type ErrCode = 'heic' | 'decode' | 'format'

interface Item {
  id: string
  file: File
  previewUrl: string
  status: 'pending' | 'processing' | 'done' | 'error'
  key?: string // 어떤 설정으로 처리됐는지 — 설정이 바뀌면 다시 처리
  out?: ResizeOutput & { url: string }
  error?: ErrCode
  cropX?: number
  cropY?: number
}

const MODES: SizeMode[] = ['px', 'pct', 'long']
const FITS: Fit[] = ['stretch', 'contain', 'cover']
const FORMATS: ResizeFormat[] = ['jpeg', 'png', 'webp']
const PCTS = [25, 50, 75]
const SIDES = [3840, 1920, 1280, 1080, 800]
const TARGETS = [0, 100, 200, 500, 1000]
const MAX_FILE = 50 * 1024 * 1024
const DEF = { mode: 'px' as SizeMode, pct: 50, long: 1920, q: 90, bg: '#ffffff' }

const kbLabel = (kb: number) => (kb >= 1000 ? `${kb / 1000}MB` : `${kb}KB`)
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
const fmtLabel = (f: ResizeFormat) => (f === 'jpeg' ? 'JPG' : f === 'webp' ? 'WebP' : 'PNG')

// 44px 터치 타깃. 선택 = 파랑, 미선택 = 회색 칩
const chip = (on: boolean) =>
  `min-h-11 px-3 rounded-xl text-sm font-semibold tabular-nums transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
    on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'
  }`
const seg = (on: boolean) =>
  `min-h-11 rounded-lg text-sm font-semibold transition-colors ${on ? 'bg-primary text-white' : 'text-sub hover:text-fg'}`

// ── Component ──

export default function ImageResizer() {
  const t = useTranslations('imageResizer')
  const sp = useSearchParams()

  // 설정 (URL 공유)
  const [mode, setMode] = useState<SizeMode>(() => {
    const m = sp.get('m') as SizeMode
    return MODES.includes(m) ? m : DEF.mode
  })
  const [width, setWidth] = useState(() => clampInt(sp.get('w'), 0, MAX_SIDE, 0))
  const [height, setHeight] = useState(() => clampInt(sp.get('h'), 0, MAX_SIDE, 0))
  const [lock, setLock] = useState(() => sp.get('l') !== '0')
  const [percent, setPercent] = useState(() => clampInt(sp.get('p'), 1, 400, DEF.pct))
  const [longSide, setLongSide] = useState(() => clampInt(sp.get('ls'), 1, MAX_SIDE, DEF.long))
  const [fit, setFit] = useState<Fit>(() => {
    const f = sp.get('fit') as Fit
    return FITS.includes(f) ? f : 'cover'
  })
  const [format, setFormat] = useState<ResizeFormat>(() => {
    const f = sp.get('f') as ResizeFormat
    return FORMATS.includes(f) ? f : 'jpeg'
  })
  const [quality, setQuality] = useState(() => clampInt(sp.get('q'), 10, 100, DEF.q))
  const [targetKB, setTargetKB] = useState(() => clampInt(sp.get('kb'), 0, 20000, 0))
  const [bg, setBg] = useState(() => {
    const b = sp.get('bg')
    return b && /^[0-9a-f]{6}$/i.test(b) ? `#${b.toLowerCase()}` : DEF.bg
  })
  const [cm, setCm] = useState({ w: '3.5', h: '4.5', dpi: '300' })

  const [images, setImages] = useState<Item[]>([])
  const [enc, setEnc] = useState<{ webp: boolean } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [zipping, setZipping] = useState(false)
  const [skipped, setSkipped] = useState(0)
  const [selId, setSelId] = useState<string | null>(null)
  const [cropRevision, setCropRevision] = useState(0)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const imagesRef = useRef<Item[]>([])
  const runGen = useRef(0)

  // 입력 중간값(예: "1" → "1080")도 그대로 처리되지만 1px 미만/빈 값은 막는다
  const kb = targetKB > 0 ? Math.max(10, targetKB) : 0
  const pct = Math.max(1, percent || 0)
  const ls = Math.max(16, longSide || 0)
  const fixed = isFixedSize({ mode, width, height, lock, percent: pct, longSide: ls, fit })
  const key = [mode, width, height, lock, pct, ls, fit, format, quality, kb, bg].join('|')
  const passportActive = fixed && width === 413 && height === 531 && fit === 'cover' && format === 'jpeg' && kb === 500
  const itemKey = (item: Item) => `${key}|${passportActive ? item.cropX ?? 50 : 50}|${passportActive ? item.cropY ?? 50 : 50}`

  useEffect(() => { imagesRef.current = images }, [images])

  useEffect(() => {
    detectEncoders().then((e) => setEnc({ webp: e.webp })).catch(() => setEnc({ webp: false }))
  }, [])

  // URL 동기화 (기본값과 다른 것만)
  useEffect(() => {
    const id = setTimeout(() => {
      const p = new URLSearchParams()
      if (mode !== DEF.mode) p.set('m', mode)
      if (mode === 'px') {
        if (width) p.set('w', String(width))
        if (height) p.set('h', String(height))
        if (!lock) { p.set('l', '0'); if (fit !== 'cover') p.set('fit', fit) }
      }
      if (mode === 'pct' && pct !== DEF.pct) p.set('p', String(pct))
      if (mode === 'long' && ls !== DEF.long) p.set('ls', String(ls))
      if (format !== 'jpeg') p.set('f', format)
      if (quality !== DEF.q) p.set('q', String(quality))
      if (kb) p.set('kb', String(kb))
      if (bg !== DEF.bg) p.set('bg', bg.slice(1))
      const qs = p.toString()
      window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`)
    }, 300)
    return () => clearTimeout(id)
  }, [mode, width, height, lock, fit, pct, ls, format, quality, kb, bg])

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
  const updateCrop = (id: string, axis: 'cropX' | 'cropY', value: number) => {
    setImages((prev) => prev.map((item) => item.id === id ? { ...item, [axis]: value } : item))
    setCropRevision((revision) => revision + 1)
  }

  // ── 자동 처리: 설정 변경/파일 추가 시 한 장씩 순차 처리 (메모리·UI 반응성) ──
  // ponytail: 설정이 바뀔 때마다 원본을 다시 디코드. 수십 장 × 고해상도면 느림 → 그때 ImageBitmap 캐시
  useEffect(() => {
    const gen = ++runGen.current
    const opts = { mode, width, height, lock, percent: pct, longSide: ls, fit, format, quality, targetKB: kb, bg }
    const timer = setTimeout(async () => {
      const todo = imagesRef.current.filter((i) => i.key !== itemKey(i) || i.status === 'pending' || i.status === 'processing')
      if (!todo.length) { setBusy(false); return }
      setBusy(true)
      for (const it of todo) {
        if (runGen.current !== gen) return
        if (!imagesRef.current.some((i) => i.id === it.id)) continue
        patch(it.id, { status: 'processing' })
        let next: Partial<Item>
        try {
          const out = await resizeFile(it.file, { ...opts, cropX: passportActive ? it.cropX ?? 50 : 50, cropY: passportActive ? it.cropY ?? 50 : 50 })
          if (runGen.current !== gen) return
          if (!imagesRef.current.some((i) => i.id === it.id)) continue
          next = { status: 'done', key: itemKey(it), out: { ...out, url: URL.createObjectURL(out.blob) }, error: undefined }
        } catch (e) {
          if (runGen.current !== gen) return
          const msg = e instanceof Error ? e.message : ''
          next = { status: 'error', key: itemKey(it), out: undefined, error: msg === 'format' ? 'format' : isHeic(it.file) ? 'heic' : 'decode' }
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
  }, [key, images.length, cropRevision])

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
  const nameOf = (i: Item) => outputName(i.file.name, i.out!.mime, `_${i.out!.width}x${i.out!.height}`)

  const done = images.filter((i) => i.status === 'done' && i.key === itemKey(i) && i.out)

  const downloadZip = async () => {
    if (!done.length) return
    setZipping(true)
    try {
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()
      const names = uniqueNames(done.map(nameOf))
      done.forEach((i, n) => zip.file(names[n], i.out!.blob))
      // 이미 압축된 이미지라 재압축 이득 없음 → STORE
      const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' })
      const url = URL.createObjectURL(blob)
      saveBlob(url, `resized_${done.length}.zip`)
      setTimeout(() => URL.revokeObjectURL(url), 10000)
    } finally {
      setZipping(false)
    }
  }

  // ── 설정 ──

  // 비율 고정 중 한쪽을 바꾸면 다른 쪽을 첫 이미지 비율로 채워 보여 준다 (실제 출력은 이미지마다 상자 안에 맞춤)
  const ref = images.find((i) => i.out)?.out
  const setDim = (axis: 'w' | 'h', raw: string) => {
    const v = clampInt(raw, 0, MAX_SIDE, 0)
    if (axis === 'w') setWidth(v); else setHeight(v)
    if (!lock || !ref || !v) return
    if (axis === 'w') setHeight(Math.round((v * ref.srcHeight) / ref.srcWidth))
    else setWidth(Math.round((v * ref.srcWidth) / ref.srcHeight))
  }
  const applyBox = (w: number, h: number) => {
    setMode('px'); setWidth(w); setHeight(h); setLock(false)
    if (fit === 'stretch') setFit('cover')
  }
  const applyPreset = (p: Preset) => {
    applyBox(p.width, p.height)
    if (p.id === 'passport') { setFit('cover'); setFormat('jpeg'); setTargetKB(500) }
  }
  const presetActive = (p: Preset) => p.id === 'passport'
    ? passportActive
    : mode === 'px' && !lock && width === p.width && height === p.height
  const cmPx = {
    w: cmToPx(Number(cm.w) || 0, clampInt(cm.dpi, 72, 1200, 300)),
    h: cmToPx(Number(cm.h) || 0, clampInt(cm.dpi, 72, 1200, 300)),
  }
  const cmValid = cmPx.w >= 1 && cmPx.h >= 1 && cmPx.w <= MAX_SIDE && cmPx.h <= MAX_SIDE

  const showBg = format === 'jpeg' || (fixed && fit === 'contain')

  // ── 요약 ──

  const totalOrig = done.reduce((s, i) => s + i.file.size, 0)
  const totalOut = done.reduce((s, i) => s + i.out!.blob.size, 0)
  const finished = images.filter((i) => i.key === itemKey(i) && (i.status === 'done' || i.status === 'error')).length
  const missed = done.filter((i) => !i.out!.ok).length
  const sel = images.find((i) => i.id === selId) ?? images[0]
  const status = !images.length
    ? ''
    : busy
      ? t('statusProcessing', { done: finished, n: images.length })
      : t('statusDone', { n: done.length })

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
            <button
              type="button"
              className={`w-full border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                isDragging ? 'border-primary bg-primary-soft' : 'border-line-strong hover:border-primary'
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files) }}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragging(false) }}
              aria-describedby="ir-drop-hint"
            >
              <Upload className="mx-auto mb-3 text-faint" size={36} aria-hidden />
              <span className="block text-sm font-medium text-body">{t('dropzone')}</span>
              <span id="ir-drop-hint" className="block text-xs text-muted mt-1">{t('dropzoneHint')}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.heic,.heif"
              multiple
              className="hidden"
              tabIndex={-1}
              aria-hidden
              onChange={(e) => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = '' }}
            />
            <p className="text-xs text-muted leading-relaxed">{t('privacyNote')}</p>
            {skipped > 0 && <p className="text-xs text-amber-700" role="alert">{t('skippedFiles', { n: skipped })}</p>}
          </div>

          <div className="ui-card p-5 space-y-6">
            {/* 프리셋 */}
            <div>
              <h2 className="text-sm font-semibold text-fg mb-2">{t('presetsTitle')}</h2>
              <div className="grid grid-cols-2 gap-2">
                {PRESETS.map((p) => {
                  const on = presetActive(p)
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => applyPreset(p)}
                      aria-pressed={on}
                      className={`min-h-11 text-left rounded-xl border px-3 py-2 transition-colors ${
                        on ? 'border-primary bg-primary-soft text-primary' : 'border-line text-body hover:bg-subtle'
                      }`}
                    >
                      <span className="block text-sm font-semibold">{t(`preset.${p.id}`)}</span>
                      <span className="block text-xs opacity-80 tabular-nums">
                        {p.cm ? `${p.cm[0]}×${p.cm[1]}cm · ` : ''}{p.width}×{p.height}
                      </span>
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-muted mt-2 leading-relaxed">{t('presetHint')}</p>
              {passportActive && <p className="text-xs text-muted mt-2 leading-relaxed">
                {t('passport.note')}{' '}
                <a href="https://www.passport.go.kr/home/kor/contents.do?menuPos=12" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">{t('passport.officialGuide')}</a>
              </p>}
            </div>

            {/* 크기 지정 방식 */}
            <div>
              <h2 className="text-sm font-semibold text-fg mb-2">{t('sizeTitle')}</h2>
              <div role="group" aria-label={t('sizeTitle')} className="grid grid-cols-3 gap-1 bg-soft rounded-xl p-1">
                {MODES.map((m) => (
                  <button key={m} type="button" onClick={() => setMode(m)} aria-pressed={mode === m} className={seg(mode === m)}>
                    {t(`mode.${m}`)}
                  </button>
                ))}
              </div>

              {mode === 'px' && (
                <div className="mt-4 space-y-3">
                  <div className="flex items-end gap-2">
                    <div className="flex-1 min-w-0">
                      <label htmlFor="ir-w" className="block text-xs font-medium text-sub mb-1">{t('width')}</label>
                      <input
                        id="ir-w" type="number" inputMode="numeric" min={0} max={MAX_SIDE}
                        value={width || ''} placeholder={t('auto')}
                        onChange={(e) => setDim('w', e.target.value)}
                        className="ui-field px-3 min-h-11 tabular-nums"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setLock((v) => !v)}
                      aria-pressed={lock}
                      aria-label={t('lockRatio')}
                      title={t('lockRatio')}
                      className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
                        lock ? 'bg-primary text-white' : 'bg-soft text-sub hover:text-fg'
                      }`}
                    >
                      {lock ? <Lock size={18} aria-hidden /> : <Unlock size={18} aria-hidden />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <label htmlFor="ir-h" className="block text-xs font-medium text-sub mb-1">{t('height')}</label>
                      <input
                        id="ir-h" type="number" inputMode="numeric" min={0} max={MAX_SIDE}
                        value={height || ''} placeholder={t('auto')}
                        onChange={(e) => setDim('h', e.target.value)}
                        className="ui-field px-3 min-h-11 tabular-nums"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted leading-relaxed">{t(lock ? 'lockOnHint' : 'lockOffHint')}</p>

                  {/* cm → px (인쇄용) */}
                  <details className="bg-subtle rounded-xl px-4 [&[open]]:pb-3">
                    <summary className="py-3 text-sm font-medium text-body cursor-pointer">{t('cmTitle')}</summary>
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      {(['w', 'h', 'dpi'] as const).map((k) => (
                        <div key={k} className="min-w-0">
                          <label htmlFor={`ir-cm-${k}`} className="block text-xs font-medium text-sub mb-1">
                            {t(k === 'w' ? 'cmWidth' : k === 'h' ? 'cmHeight' : 'dpi')}
                          </label>
                          <input
                            id={`ir-cm-${k}`} type="number" inputMode="decimal" min={0} step={k === 'dpi' ? 1 : 0.1}
                            value={cm[k]}
                            onChange={(e) => setCm((c) => ({ ...c, [k]: e.target.value }))}
                            className="ui-field px-3 min-h-11 tabular-nums"
                          />
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      disabled={!cmValid}
                      onClick={() => applyBox(cmPx.w, cmPx.h)}
                      className="ui-btn-soft w-full min-h-11 mt-3 text-sm tabular-nums"
                    >
                      {t('cmApply', { w: cmPx.w, h: cmPx.h })}
                    </button>
                    <p className="text-xs text-muted mt-2 leading-relaxed">{t('cmHint')}</p>
                  </details>
                </div>
              )}

              {mode === 'pct' && (
                <div className="mt-4 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {PCTS.map((v) => (
                      <button key={v} type="button" onClick={() => setPercent(v)} aria-pressed={pct === v} className={chip(pct === v)}>{v}%</button>
                    ))}
                  </div>
                  <div>
                    <label htmlFor="ir-pct" className="block text-xs font-medium text-sub mb-1">{t('percent')}</label>
                    <div className="flex items-center gap-2">
                      <input
                        id="ir-pct" type="number" inputMode="numeric" min={1} max={400}
                        value={percent || ''} onChange={(e) => setPercent(clampInt(e.target.value, 0, 400, 0))}
                        className="ui-field px-3 min-h-11 tabular-nums"
                      />
                      <span className="text-sm text-sub shrink-0">%</span>
                    </div>
                  </div>
                </div>
              )}

              {mode === 'long' && (
                <div className="mt-4 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {SIDES.map((v) => (
                      <button key={v} type="button" onClick={() => setLongSide(v)} aria-pressed={ls === v} className={chip(ls === v)}>{v}</button>
                    ))}
                  </div>
                  <div>
                    <label htmlFor="ir-long" className="block text-xs font-medium text-sub mb-1">{t('longSide')}</label>
                    <div className="flex items-center gap-2">
                      <input
                        id="ir-long" type="number" inputMode="numeric" min={16} max={MAX_SIDE}
                        value={longSide || ''} onChange={(e) => setLongSide(clampInt(e.target.value, 0, MAX_SIDE, 0))}
                        className="ui-field px-3 min-h-11 tabular-nums"
                      />
                      <span className="text-sm text-sub shrink-0">px</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted leading-relaxed">{t('longHint')}</p>
                </div>
              )}
            </div>

            {/* 맞추기 방식 — 정확한 크기(비율 고정 끔)일 때만 의미 있음 */}
            {fixed && (
              <div>
                <h2 className="text-sm font-semibold text-fg mb-2">{t('fitTitle')}</h2>
                <div role="group" aria-label={t('fitTitle')} className="grid grid-cols-3 gap-1 bg-soft rounded-xl p-1">
                  {FITS.map((f) => (
                    <button key={f} type="button" onClick={() => setFit(f)} aria-pressed={fit === f} className={seg(fit === f)}>
                      {t(`fit.${f}`)}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted mt-2 leading-relaxed">{t(`fitHint.${fit}`)}</p>
              </div>
            )}

            {/* 출력 */}
            <div className="space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-fg mb-2">{t('format')}</h2>
                <div role="group" aria-label={t('format')} className="grid grid-cols-3 gap-1 bg-soft rounded-xl p-1">
                  {FORMATS.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFormat(f)}
                      aria-pressed={format === f}
                      disabled={f === 'webp' && enc !== null && !enc.webp}
                      className={`${seg(format === f)} disabled:opacity-40`}
                    >
                      {fmtLabel(f)}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted mt-2 leading-relaxed">{t(`formatHint.${format}`)}</p>
                {enc && !enc.webp && <p className="text-xs text-faint mt-1">{t('webpUnsupported')}</p>}
              </div>

              <div>
                <label htmlFor="ir-q" className="flex items-center justify-between text-sm font-medium text-body mb-2">
                  <span>{t(kb ? 'qualityMax' : 'quality')}</span>
                  <span className="text-primary font-semibold tabular-nums">{format === 'png' ? '—' : `${quality}%`}</span>
                </label>
                <input
                  id="ir-q" type="range" min={10} max={100} value={quality}
                  disabled={format === 'png'}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="w-full h-11 accent-blue-600 disabled:opacity-40"
                />
                {format === 'png' && <p className="text-xs text-muted leading-relaxed">{t('qualityPng')}</p>}
              </div>

              <div>
                <h2 className="text-sm font-semibold text-fg mb-2">{t('targetTitle')}</h2>
                <div className="flex flex-wrap gap-2">
                  {TARGETS.map((v) => (
                    <button key={v} type="button" onClick={() => setTargetKB(v)} aria-pressed={kb === v} className={chip(kb === v)}>
                      {v === 0 ? t('targetOff') : kbLabel(v)}
                    </button>
                  ))}
                </div>
                <label htmlFor="ir-kb" className="block text-xs font-medium text-sub mt-3 mb-1">{t('targetCustom')}</label>
                <div className="flex items-center gap-2">
                  <input
                    id="ir-kb" type="number" inputMode="numeric" min={0}
                    value={targetKB || ''} placeholder={t('targetOff')}
                    onChange={(e) => setTargetKB(clampInt(e.target.value, 0, 20000, 0))}
                    className="ui-field px-3 min-h-11 tabular-nums"
                  />
                  <span className="text-sm text-sub shrink-0">KB</span>
                </div>
                <p className="text-xs text-muted mt-2 leading-relaxed">{t(kb && fixed ? 'targetFixedHint' : 'targetHint')}</p>
                {kb > 0 && format === 'png' && <p className="text-xs text-amber-700 mt-1 leading-relaxed">{t('targetPngWarn')}</p>}
              </div>

              {showBg && (
                <div className="flex items-center gap-3">
                  <input
                    id="ir-bg" type="color" value={bg} onChange={(e) => setBg(e.target.value)}
                    className="w-11 h-11 rounded-xl border border-line-strong bg-surface cursor-pointer shrink-0"
                  />
                  <div className="min-w-0">
                    <label htmlFor="ir-bg" className="block text-sm font-medium text-body">{t('bgColor')}</label>
                    <p className="text-xs text-muted leading-relaxed">{t(format === 'jpeg' ? 'bgHintJpg' : 'bgHint')}</p>
                  </div>
                </div>
              )}

              <p className="text-xs text-muted leading-relaxed bg-subtle rounded-xl p-3">{t('metaNote')}</p>
            </div>
          </div>
        </div>

        {/* ── 오른쪽: 결과 ── */}
        <div className="lg:col-span-2 space-y-6 min-w-0">
          <p role="status" aria-live="polite" className={status ? 'text-sm text-sub' : 'sr-only'}>{status}</p>

          {done.length > 0 && (
            <div className="ui-hero p-6 space-y-4">
              <div>
                <p className="text-sm text-white/70">{t('heroLabel', { n: done.length })}</p>
                <p className="text-3xl font-bold tabular-nums mt-1">
                  {formatBytes(totalOrig)} → {formatBytes(totalOut)}
                </p>
                {done.length === 1 && (
                  <p className="text-lg font-semibold tabular-nums mt-1">
                    {done[0].out!.srcWidth}×{done[0].out!.srcHeight} → {done[0].out!.width}×{done[0].out!.height}px
                  </p>
                )}
                {kb > 0 && (
                  <p className="text-sm text-white/70 mt-1">{t('heroTarget', { kb: kbLabel(kb), ok: done.length - missed, n: done.length })}</p>
                )}
              </div>
              {done.length > 1 ? (
                <button
                  type="button"
                  onClick={downloadZip}
                  disabled={zipping || busy}
                  className="inline-flex items-center gap-2 min-h-11 bg-surface text-primary rounded-xl px-4 text-sm font-semibold disabled:opacity-60"
                >
                  {zipping ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Archive size={16} aria-hidden />}
                  {t('downloadZip', { n: done.length })}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => saveBlob(done[0].out!.url, nameOf(done[0]))}
                  className="inline-flex items-center gap-2 min-h-11 bg-surface text-primary rounded-xl px-4 text-sm font-semibold"
                >
                  <Download size={16} aria-hidden />
                  {t('download')}
                </button>
              )}
            </div>
          )}

          {missed > 0 && (
            <div className="bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm" role="alert">{passportActive ? t('passport.targetMissed', { n: missed }) : t('targetMissed', { n: missed })}</div>
          )}

          {/* 결과 미리보기 */}
          {sel?.out && sel.key === itemKey(sel) && (
            <div className="ui-card p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-fg">{t('previewTitle')}</h2>
                <p className="text-xs text-muted truncate min-w-0">{sel.file.name}</p>
              </div>
              <div className="w-full h-72 sm:h-96 bg-soft rounded-xl flex items-center justify-center overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sel.out.url}
                  alt={t('resultAlt', { name: sel.file.name })}
                  className="max-w-full max-h-full object-contain border border-line"
                  style={{ aspectRatio: `${sel.out.width} / ${sel.out.height}` }}
                />
              </div>
              <p className="text-sm tabular-nums text-sub">
                {t('original')} {sel.out.srcWidth}×{sel.out.srcHeight} · {formatBytes(sel.file.size)}
                <span className="text-faint"> → </span>
                <span className="font-semibold text-fg">{sel.out.width}×{sel.out.height} · {formatBytes(sel.out.blob.size)}</span>
              </p>
              {passportActive && <p className={`text-xs ${sel.out.ok ? 'text-muted' : 'text-amber-700'}`}>
                {t(sel.out.ok ? 'passport.fileReady' : 'passport.fileTooLarge')}
              </p>}
            </div>
          )}

          {passportActive && sel && (
            <div className="ui-card p-5 space-y-4">
              <h2 className="text-sm font-semibold text-fg">{t('passport.cropTitle')}</h2>
              <p className="text-xs text-muted leading-relaxed">{t('passport.cropHint')}</p>
              <div>
                <label htmlFor="ir-crop-x" className="block text-sm text-body mb-2">{t('passport.cropX')}</label>
                <input id="ir-crop-x" type="range" min="0" max="100" value={sel.cropX ?? 50}
                  onChange={(e) => updateCrop(sel.id, 'cropX', Number(e.target.value))} className="w-full accent-primary" />
              </div>
              <div>
                <label htmlFor="ir-crop-y" className="block text-sm text-body mb-2">{t('passport.cropY')}</label>
                <input id="ir-crop-y" type="range" min="0" max="100" value={sel.cropY ?? 50}
                  onChange={(e) => updateCrop(sel.id, 'cropY', Number(e.target.value))} className="w-full accent-primary" />
              </div>
              {sel.out && sel.key === itemKey(sel) && (sel.out.srcWidth < 413 || sel.out.srcHeight < 531) &&
                <p className="text-xs text-amber-700" role="alert">{t('passport.smallSource')}</p>}
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
                  <h2 className="text-sm font-semibold text-fg tabular-nums">
                    {t('listTitle', { n: images.length })}
                    {busy && <Loader2 size={14} className="ml-2 inline animate-spin text-primary" aria-hidden />}
                  </h2>
                  <button type="button" onClick={removeAll} className="min-h-11 text-sm text-sub hover:text-fg px-3 rounded-lg hover:bg-soft">
                    {t('removeAll')}
                  </button>
                </div>

                <ul className="space-y-3">
                  {images.map((it) => {
                    const out = it.status === 'done' && it.key === itemKey(it) ? it.out : undefined
                    const selected = sel?.id === it.id
                    const name = it.file.name
                    return (
                      <li key={it.id} className={`flex gap-3 items-center border rounded-xl p-3 ${selected ? 'border-primary' : 'border-line'}`}>
                        <button
                          type="button"
                          onClick={() => setSelId(it.id)}
                          disabled={!out && !passportActive}
                          aria-pressed={selected}
                          aria-label={t('previewOf', { name })}
                          className="shrink-0 w-16 h-16 bg-soft rounded-lg overflow-hidden flex items-center justify-center"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={out?.url || it.previewUrl}
                            alt={name}
                            className="max-w-full max-h-full object-contain"
                            onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}
                          />
                        </button>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-fg truncate">{name}</p>
                          {out ? (
                            <>
                              <p className="text-sm tabular-nums mt-0.5">
                                <span className="text-sub">{out.srcWidth}×{out.srcHeight}</span>
                                <span className="text-faint"> → </span>
                                <span className="font-semibold text-fg">{out.width}×{out.height}px</span>
                              </p>
                              <p className="text-xs text-muted tabular-nums mt-0.5 truncate">
                                {formatBytes(it.file.size)} → <span className="text-body font-medium">{formatBytes(out.blob.size)}</span>
                                {out.mime !== 'image/png' && ` · ${t('qualityUsed', { q: Math.round(out.quality * 100) })}`}
                              </p>
                              {!out.ok && <p className="text-xs text-amber-700 mt-0.5">{t(passportActive ? 'passport.fileTooLarge' : 'rowMissed')}</p>}
                            </>
                          ) : it.status === 'error' ? (
                            <p className="text-xs text-red-600 mt-1 leading-relaxed">
                              {t(it.error === 'heic' ? 'errHeic' : it.error === 'format' ? 'errFormat' : 'errDecode')}
                            </p>
                          ) : (
                            <p className="text-xs text-muted mt-1 inline-flex items-center gap-1">
                              {it.status === 'processing' && <Loader2 size={12} className="animate-spin" aria-hidden />}
                              {formatBytes(it.file.size)} · {t(it.status === 'processing' ? 'processing' : 'waiting')}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center shrink-0">
                          {out && (
                            <button
                              type="button"
                              onClick={() => saveBlob(out.url, nameOf(it))}
                              className="w-11 h-11 flex items-center justify-center text-primary hover:bg-primary-soft rounded-lg"
                              aria-label={t('downloadOf', { name })}
                              title={t('download')}
                            >
                              <Download size={18} aria-hidden />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => removeImage(it.id)}
                            className="w-11 h-11 flex items-center justify-center text-faint hover:text-fg hover:bg-soft rounded-lg"
                            aria-label={t('removeOf', { name })}
                            title={t('remove')}
                          >
                            <Trash2 size={18} aria-hidden />
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 가이드 ── */}
      <div className="ui-card p-6 space-y-8">
        <div>
          <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
          <p className="text-sm text-sub leading-relaxed mt-3">{t('guide.whatIs.description')}</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-fg mb-3">{t('guide.howToUse.title')}</h3>
          <ol className="space-y-2 list-decimal pl-5 marker:text-faint">
            {(t.raw('guide.howToUse.items') as string[]).map((item, i) => (
              <li key={i} className="text-sm text-sub leading-relaxed">{item}</li>
            ))}
          </ol>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(['principle', 'formats', 'idPhoto'] as const).map((sec) => (
            <div key={sec}>
              <h3 className="text-sm font-semibold text-fg mb-3">{t(`guide.${sec}.title`)}</h3>
              <ul className="space-y-2 list-disc pl-4 marker:text-faint">
                {(t.raw(`guide.${sec}.items`) as string[]).map((item, i) => (
                  <li key={i} className="text-sm text-sub leading-relaxed">{item}</li>
                ))}
              </ul>
              {sec === 'idPhoto' && (
                <p className="text-sm mt-3 flex flex-wrap gap-x-4 gap-y-1">
                  <a href="https://www.passport.go.kr/home/kor/contents.do?menuPos=12" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
                    {t('guide.idPhoto.linkPassport')}
                  </a>
                  <a href="https://www.gov.kr/" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
                    {t('guide.idPhoto.linkGov24')}
                  </a>
                </p>
              )}
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
