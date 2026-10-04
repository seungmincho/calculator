'use client'

import { useState, useCallback, useRef, useEffect, useId } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/imageConverter'
import { useSearchParams } from '@/hooks/useSearchParams'
import { Upload, Download, X, Loader2, Image as ImageIcon } from 'lucide-react'
import GuideSection from '@/components/GuideSection'
import { detectEncoders, formatBytes, savingsPct, uniqueNames } from '@/utils/imageCompress'
import {
  acceptFile, convertImage, convertName, detectFormat, nativeHeic, parseSettings, readHead,
  needsBg, usesQuality, CONVERT_FORMATS, DEFAULTS, FORMAT_LABEL,
  type ConvertFormat, type ConvertOptions, type SourceFormat,
} from '@/utils/imageConvert'

type ErrorKind = 'heic' | 'decode' | 'encode' | 'format'

interface Item {
  id: string
  file: File
  src: SourceFormat
  key?: string // 마지막으로 처리한 설정
  error?: ErrorKind
  out?: { blob: Blob; url: string; width: number; height: number; downscaled: boolean; format: ConvertFormat }
}

interface CompareRow { name: string; use: string; alpha: string; compression: string; compat: string }

const optKey = (o: ConvertOptions) => `${o.format}|${o.quality}|${o.bg}`
const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function ImageConverter() {
  const t = useTranslations('imageConverter')
  const sp = useSearchParams()
  const uidBase = useId()
  const fmtLabelId = `${uidBase}-fmt`

  // 설정 (URL 공유)
  const [init] = useState(() => parseSettings(sp.get('f'), sp.get('q'), sp.get('bg')))
  const [format, setFormat] = useState<ConvertFormat>(init.format)
  const [quality, setQuality] = useState(init.quality)
  const [bg, setBg] = useState(init.bg)
  const [job, setJob] = useState<ConvertOptions>(init) // 슬라이더 연속 변경을 묶은 실제 변환 설정

  const [items, setItems] = useState<Item[]>([])
  const [working, setWorking] = useState<string | null>(null)
  const [enc, setEnc] = useState<{ webp: boolean; avif: boolean } | null>(null)
  const [heicNative, setHeicNative] = useState<boolean | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [skipped, setSkipped] = useState(0)
  const [zipping, setZipping] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const itemsRef = useRef<Item[]>([])
  useEffect(() => { itemsRef.current = items }, [items])
  useEffect(() => () => itemsRef.current.forEach((i) => i.out && URL.revokeObjectURL(i.out.url)), [])

  useEffect(() => {
    setHeicNative(nativeHeic(navigator.userAgent))
    detectEncoders()
      .then((e) => {
        setEnc(e)
        if (!e.avif) setFormat((f) => (f === 'avif' ? DEFAULTS.format : f))
        if (!e.webp) setFormat((f) => (f === 'webp' ? DEFAULTS.format : f))
      })
      .catch(() => setEnc({ webp: false, avif: false }))
  }, [])

  // 설정 → 변환 job(250ms 묶음) + URL(기본값과 다른 것만)
  useEffect(() => {
    const id = setTimeout(() => {
      setJob({ format, quality, bg })
      const p = new URLSearchParams()
      if (format !== DEFAULTS.format) p.set('f', format)
      if (usesQuality(format) && quality !== DEFAULTS.quality) p.set('q', String(quality))
      if (needsBg(format) && bg !== DEFAULTS.bg) p.set('bg', bg.slice(1))
      const qs = p.toString()
      window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`)
    }, 250)
    return () => clearTimeout(id)
  }, [format, quality, bg])

  const jobKey = optKey(job)

  // ── 파일 추가 ──
  const addFiles = useCallback(async (list: FileList | File[]) => {
    const files = Array.from(list)
    const ok = files.filter(acceptFile)
    setSkipped(files.length - ok.length)
    if (!ok.length) return
    const added = await Promise.all(ok.map(async (file) => {
      let head: Uint8Array | null = null
      try { head = await readHead(file) } catch { /* 이름·MIME으로 판별 */ }
      return { id: uid(), file, src: detectFormat(head, file.name, file.type) } as Item
    }))
    setItems((prev) => [...prev, ...added])
  }, [])

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? [])
      if (files.length) { e.preventDefault(); addFiles(files) }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [addFiles])

  // ── 순차 변환: 현재 설정으로 처리 안 된 항목을 하나씩 ──
  useEffect(() => {
    if (working) return
    const next = items.find((i) => i.key !== jobKey)
    if (!next) return
    setWorking(next.id)
    const opts = job
    const key = jobKey
    convertImage(next.file, opts)
      .then((o) => ({ o, err: undefined as ErrorKind | undefined }))
      .catch((e: Error) => ({
        o: undefined,
        err: (e.message === 'decode' ? (next.src === 'heic' ? 'heic' : 'decode') : e.message === 'format' ? 'format' : 'encode') as ErrorKind,
      }))
      .then(({ o, err }) => {
        const prev = itemsRef.current.find((i) => i.id === next.id)
        if (prev) {
          const out = o && { blob: o.blob, url: URL.createObjectURL(o.blob), width: o.width, height: o.height, downscaled: o.downscaled, format: opts.format }
          if (prev.out) URL.revokeObjectURL(prev.out.url)
          setItems((p) => p.map((i) => (i.id === next.id ? { ...i, key, out, error: err } : i)))
        }
        setWorking(null)
      })
  }, [items, job, jobKey, working])

  const removeItem = (id: string) => {
    const it = itemsRef.current.find((i) => i.id === id)
    if (it?.out) URL.revokeObjectURL(it.out.url)
    setItems((p) => p.filter((i) => i.id !== id))
  }

  const reset = () => {
    itemsRef.current.forEach((i) => i.out && URL.revokeObjectURL(i.out.url))
    setItems([])
    setSkipped(0)
  }

  // ── 집계 ──
  const done = items.filter((i) => i.key === jobKey && i.out)
  const failed = items.filter((i) => i.key === jobKey && i.error)
  const pending = items.length - done.length - failed.length
  const totalIn = done.reduce((s, i) => s + i.file.size, 0)
  const totalOut = done.reduce((s, i) => s + i.out!.blob.size, 0)
  const totalPct = savingsPct(totalIn, totalOut)
  const hasHeicError = failed.some((i) => i.error === 'heic')

  const change = (pct: number) => (pct > 0 ? t('smaller', { pct }) : pct < 0 ? t('larger', { pct: -pct }) : t('same'))

  const downloadAll = async () => {
    if (done.length === 1) return saveBlob(done[0].out!.blob, convertName(done[0].file.name, done[0].out!.format))
    setZipping(true)
    try {
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()
      const names = uniqueNames(done.map((i) => convertName(i.file.name, i.out!.format)))
      done.forEach((i, n) => zip.file(names[n], i.out!.blob))
      saveBlob(await zip.generateAsync({ type: 'blob', compression: 'STORE' }), `images_${FORMAT_LABEL[job.format].toLowerCase()}.zip`)
    } finally {
      setZipping(false)
    }
  }

  const status = !items.length
    ? ''
    : pending > 0
      ? t('statusWorking', { done: done.length + failed.length, total: items.length })
      : t('statusDone', { n: done.length })

  const compareRows = t.raw('compare.rows') as CompareRow[]
  const heicSteps = t.raw('heicHelp.items') as string[]

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
              aria-describedby={`${uidBase}-drop-hint`}
            >
              <Upload className="mx-auto mb-3 text-faint" size={36} aria-hidden />
              <span className="block text-sm font-medium text-body">{t('dropzone')}</span>
              <span id={`${uidBase}-drop-hint`} className="block text-xs text-muted mt-1">{t('dropzoneHint')}</span>
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
            {heicNative !== null && (
              <p className="text-xs text-muted leading-relaxed">
                {heicNative ? t('heicNative') : t('heicNoNative')}{' '}
                {!heicNative && <a href="#heic-help" className="text-primary underline underline-offset-2">{t('heicHelpLink')}</a>}
              </p>
            )}
            {skipped > 0 && <p className="text-xs text-amber-700" role="alert">{t('skippedFiles', { n: skipped })}</p>}
          </div>

          <div className="ui-card p-5 space-y-6">
            <div>
              <p id={fmtLabelId} className="text-sm font-semibold text-fg mb-2">{t('outputFormat')}</p>
              <div role="group" aria-labelledby={fmtLabelId} className="grid grid-cols-4 gap-1 bg-soft rounded-xl p-1">
                {CONVERT_FORMATS.filter((f) => f !== 'avif' || enc?.avif).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFormat(f)}
                    aria-pressed={format === f}
                    disabled={f === 'webp' && enc?.webp === false}
                    className={`min-h-11 rounded-lg text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      format === f ? 'bg-primary text-white' : 'text-sub hover:text-fg'
                    }`}
                  >
                    {FORMAT_LABEL[f]}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted mt-2 leading-relaxed">{t(`formatHint.${format}`)}</p>
              {enc?.webp === false && <p className="text-xs text-muted mt-1 leading-relaxed">{t('webpUnsupported')}</p>}
            </div>

            {usesQuality(format) ? (
              <div>
                <label htmlFor={`${uidBase}-q`} className="flex items-center justify-between text-sm font-medium text-body mb-2">
                  <span>{t('quality')}</span>
                  <span className="tabular-nums text-fg font-semibold">{t('qualityPercent', { value: quality })}</span>
                </label>
                <input
                  id={`${uidBase}-q`}
                  type="range" min={10} max={100} step={5}
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  aria-describedby={`${uidBase}-q-hint`}
                  className="w-full h-11 accent-primary cursor-pointer"
                />
                <p id={`${uidBase}-q-hint`} className="text-xs text-muted leading-relaxed">{t('qualityHint')}</p>
              </div>
            ) : (
              <p className="text-xs text-muted leading-relaxed">{t('pngNote')}</p>
            )}

            {needsBg(format) && (
              <div className="flex items-center gap-3">
                <input
                  id={`${uidBase}-bg`} type="color" value={bg} onChange={(e) => setBg(e.target.value)}
                  aria-describedby={`${uidBase}-bg-hint`}
                  className="w-11 h-11 rounded-xl border border-line-strong bg-surface cursor-pointer shrink-0"
                />
                <div className="min-w-0">
                  <label htmlFor={`${uidBase}-bg`} className="block text-sm font-medium text-body">{t('bgColor')}</label>
                  <p id={`${uidBase}-bg-hint`} className="text-xs text-muted leading-relaxed">{t('bgHint')}</p>
                </div>
              </div>
            )}

            <p className="text-xs text-muted leading-relaxed bg-subtle rounded-xl p-3">{t('metaNote')}</p>

            <button type="button" onClick={reset} disabled={!items.length} className="ui-btn-soft w-full px-4 py-3 min-h-11 disabled:opacity-40 disabled:cursor-not-allowed">
              {t('reset')}
            </button>
          </div>
        </div>

        {/* ── 오른쪽: 결과 ── */}
        <div className="lg:col-span-2 space-y-6 min-w-0">
          <p role="status" aria-live="polite" className={status ? 'text-sm text-sub' : 'sr-only'}>{status}</p>
          {failed.length > 0 && (
            <p role="alert" className="text-sm text-red-600">{t('statusFailed', { n: failed.length })}</p>
          )}

          {done.length > 0 && (
            <div className="ui-card p-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <p className="text-sm text-sub">{t('summaryLabel', { n: done.length })}</p>
                <p className="text-3xl font-bold text-fg tabular-nums mt-1">{formatBytes(totalOut)}</p>
                <p className="text-sm text-sub tabular-nums mt-1">
                  {t('summaryFrom', { size: formatBytes(totalIn) })} · <span className={totalPct > 0 ? 'text-primary font-semibold' : ''}>{change(totalPct)}</span>
                </p>
              </div>
              <button type="button" onClick={downloadAll} disabled={pending > 0 || zipping} className="ui-btn px-5 py-3 min-h-11 inline-flex items-center justify-center gap-2">
                <Download size={18} aria-hidden />
                {zipping ? t('zipping') : done.length > 1 ? t('downloadZip', { n: done.length }) : t('download')}
              </button>
            </div>
          )}

          {hasHeicError && (
            <div role="alert" className="bg-amber-50 text-amber-800 rounded-2xl p-5 text-sm leading-relaxed">
              <p className="font-semibold">{t('heicErrorTitle')}</p>
              <p className="mt-1">{t('heicErrorBody')} <a href="#heic-help" className="underline underline-offset-2">{t('heicHelpLink')}</a></p>
            </div>
          )}

          <div className="ui-card p-5">
            <h2 className="text-lg font-semibold text-fg mb-2">{t('resultTitle')}</h2>
            {items.length === 0 ? (
              <div className="text-center py-12">
                <ImageIcon className="mx-auto mb-3 text-faint" size={40} aria-hidden />
                <p className="text-sm text-muted">{t('empty')}</p>
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {items.map((it) => {
                  const fresh = it.key === jobKey
                  const busy = working === it.id
                  const outSize = it.out?.blob.size ?? 0
                  return (
                    <li key={it.id} className="flex items-center gap-3 py-3">
                      <div className="w-16 h-16 rounded-xl bg-subtle overflow-hidden shrink-0 flex items-center justify-center">
                        {it.out ? (
                          <img src={it.out.url} alt={it.file.name} className="w-full h-full object-cover" />
                        ) : busy ? (
                          <Loader2 className="animate-spin text-faint" size={22} aria-hidden />
                        ) : (
                          <ImageIcon className="text-faint" size={22} aria-hidden />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-fg truncate" title={it.file.name}>{it.file.name}</p>
                        <p className="text-xs text-sub tabular-nums mt-0.5">
                          {FORMAT_LABEL[it.src]} {formatBytes(it.file.size)}
                          {it.out && <> → {FORMAT_LABEL[it.out.format]} {formatBytes(outSize)} · {change(savingsPct(it.file.size, outSize))}</>}
                        </p>
                        {it.out && (
                          <p className="text-xs text-muted tabular-nums mt-0.5">
                            {it.out.width}×{it.out.height}px
                            {it.out.downscaled && <> · {t('downscaled')}</>}
                          </p>
                        )}
                        {!fresh && !it.error && <p className="text-xs text-muted mt-0.5">{busy ? t('itemWorking') : t('itemWaiting')}</p>}
                        {fresh && it.error && <p className="text-xs text-red-600 mt-0.5 leading-relaxed">{t(`error.${it.error}`)}</p>}
                      </div>
                      {it.out && (
                        <a
                          href={it.out.url}
                          download={convertName(it.file.name, it.out.format)}
                          aria-label={t('downloadItem', { name: convertName(it.file.name, it.out.format) })}
                          className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl bg-soft text-body hover:bg-subtle shrink-0"
                        >
                          <Download size={18} aria-hidden />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => removeItem(it.id)}
                        aria-label={t('remove', { name: it.file.name })}
                        className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl text-muted hover:bg-soft hover:text-fg shrink-0"
                      >
                        <X size={18} aria-hidden />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* ── 형식 비교 ── */}
      <section className="ui-card p-6" aria-labelledby={`${uidBase}-cmp`}>
        <h2 id={`${uidBase}-cmp`} className="text-xl font-semibold text-fg mb-4">{t('compare.title')}</h2>
        <div className="overflow-x-auto -mx-2 px-2">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-sub border-b border-line">
                {(['format', 'use', 'alpha', 'compression', 'compat'] as const).map((h) => (
                  <th key={h} scope="col" className="py-2 pr-4 font-medium">{t(`compare.headers.${h}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {compareRows.map((r) => (
                <tr key={r.name} className="align-top">
                  <th scope="row" className="py-3 pr-4 text-left font-semibold text-fg whitespace-nowrap">{r.name}</th>
                  <td className="py-3 pr-4 text-body">{r.use}</td>
                  <td className="py-3 pr-4 text-body">{r.alpha}</td>
                  <td className="py-3 pr-4 text-body">{r.compression}</td>
                  <td className="py-3 text-body">{r.compat}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted mt-3 leading-relaxed">{t('compare.note')}</p>
      </section>

      {/* ── HEIC 다른 방법 ── */}
      <section id="heic-help" className="ui-card p-6 scroll-mt-24" aria-labelledby={`${uidBase}-heic`}>
        <h2 id={`${uidBase}-heic`} className="text-xl font-semibold text-fg mb-4">{t('heicHelp.title')}</h2>
        <ol className="space-y-2 list-decimal list-inside text-sm text-body leading-relaxed">
          {heicSteps.map((s) => <li key={s}>{s}</li>)}
        </ol>
      </section>

      <GuideSection namespace="imageConverter" />
    </div>
  )
}
