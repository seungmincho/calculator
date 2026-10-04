'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/colorBlindnessSimulator'
import { useSearchParams } from '@/hooks/useSearchParams'
import { Upload, Camera, Download, Plus, X, ChevronRight } from 'lucide-react'
import GuideSection from '@/components/GuideSection'
import ShareResult from '@/components/ShareResult'
import {
  CVD_LIST, simulatePixels, checkPalette, parseHexList, normalizeHex, DE_WARN, MAX_COLORS,
  PALETTE_RISKY, PALETTE_OKABE_ITO, type Cvd,
} from '@/utils/colorBlindnessSim'

type SampleKey = 'chart' | 'trafficLight' | 'colorWheel'
const SAMPLES: SampleKey[] = ['chart', 'trafficLight', 'colorWheel']
type View = 'split' | 'grid'
const DEF = { type: 'deutan' as Cvd, sev: 100, view: 'split' as View, sample: 'chart' as SampleKey }

// ── 샘플 이미지 (캔버스로 생성) ──────────────────────────────────────────────
function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')!] as const
}

function sampleChart(): ImageData {
  const W = 720, H = 480
  const [, ctx] = makeCanvas(W, H)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)
  const colors = PALETTE_RISKY.slice(0, 4)
  const data = [[62, 48, 30, 22], [70, 55, 38, 30], [58, 66, 45, 35], [80, 72, 50, 41]]
  const x0 = 70, y0 = 420, ch = 300, gw = 150
  ctx.strokeStyle = '#e5e8eb'
  ctx.lineWidth = 1
  for (let i = 0; i <= 4; i++) {
    const y = y0 - (ch * i) / 4
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(W - 30, y); ctx.stroke()
  }
  data.forEach((g, gi) => g.forEach((v, si) => {
    ctx.fillStyle = colors[si]
    ctx.fillRect(x0 + 20 + gi * gw + si * 30, y0 - (v / 80) * ch, 26, (v / 80) * ch)
  }))
  ctx.font = 'bold 18px sans-serif'
  colors.forEach((c, i) => {
    ctx.fillStyle = c
    ctx.beginPath(); ctx.arc(x0 + 10 + i * 110, 50, 9, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#4e5968'
    ctx.fillText(String.fromCharCode(65 + i), x0 + 26 + i * 110, 57)
  })
  // 상태 점 (빨강/초록으로만 구분하는 흔한 실수)
  ;['#e53935', '#43a047'].forEach((c, i) => {
    ctx.fillStyle = c
    ctx.beginPath(); ctx.roundRect(W - 190 + i * 80, 34, 64, 30, 15); ctx.fill()
  })
  return ctx.getImageData(0, 0, W, H)
}

function sampleTrafficLight(): ImageData {
  const S = 600
  const [, ctx] = makeCanvas(S, S)
  ctx.fillStyle = '#bfe3f2'; ctx.fillRect(0, 0, S, S * 0.65)
  ctx.fillStyle = '#4a7c59'; ctx.fillRect(0, S * 0.65, S, S * 0.35)
  ctx.fillStyle = '#555555'; ctx.fillRect(S * 0.3, S * 0.55, S * 0.4, S * 0.45)
  ctx.fillStyle = '#ffffff'
  for (let i = 0; i < 4; i++) ctx.fillRect(S * 0.47, S * 0.62 + i * S * 0.1, S * 0.06, S * 0.06)
  ctx.fillStyle = '#333333'; ctx.fillRect(S * 0.44, S * 0.1, S * 0.04, S * 0.55)
  ctx.fillStyle = '#222222'
  ctx.beginPath(); ctx.roundRect(S * 0.32, S * 0.05, S * 0.28, S * 0.42, 8); ctx.fill()
  ;[['#ff2200', 0.11], ['#ffcc00', 0.21], ['#00cc44', 0.31]].forEach(([c, y]) => {
    ctx.fillStyle = c as string
    ctx.beginPath(); ctx.arc(S * 0.46, S * (y as number), S * 0.07, 0, Math.PI * 2); ctx.fill()
  })
  ;[[0.07, 0.52, 0.1, '#2d6b3f'], [0.12, 0.45, 0.09, '#c0392b'], [0.82, 0.5, 0.11, '#2d6b3f'], [0.87, 0.43, 0.09, '#e67e22']].forEach(([x, y, r, c]) => {
    ctx.fillStyle = c as string
    ctx.beginPath(); ctx.arc(S * (x as number), S * (y as number), S * (r as number), 0, Math.PI * 2); ctx.fill()
  })
  return ctx.getImageData(0, 0, S, S)
}

function sampleColorWheel(): ImageData {
  const S = 600, cx = S / 2, R = S / 2 - 4
  const [, ctx] = makeCanvas(S, S)
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, S, S)
  const hue = ctx.createConicGradient(0, cx, cx)
  for (let d = 0; d <= 360; d += 30) hue.addColorStop(d / 360, `hsl(${d}, 100%, 50%)`)
  ctx.fillStyle = hue
  ctx.beginPath(); ctx.arc(cx, cx, R, 0, Math.PI * 2); ctx.fill()
  const sat = ctx.createRadialGradient(cx, cx, 0, cx, cx, R)
  sat.addColorStop(0, '#ffffff'); sat.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = sat
  ctx.beginPath(); ctx.arc(cx, cx, R, 0, Math.PI * 2); ctx.fill()
  return ctx.getImageData(0, 0, S, S)
}

const SAMPLE_FN: Record<SampleKey, () => ImageData> = { chart: sampleChart, trafficLight: sampleTrafficLight, colorWheel: sampleColorWheel }

// 한 캔버스 = 한 시뮬레이션. props가 바뀌면 스스로 다시 그린다.
function SimCanvas({ img, type, sev, className, style }: { img: ImageData; type: Cvd; sev: number; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    c.width = img.width
    c.height = img.height
    const out = type === 'normal' ? img : new ImageData(simulatePixels(img.data, type, sev), img.width, img.height)
    c.getContext('2d')!.putImageData(out, 0, 0)
  }, [img, type, sev])
  return <canvas ref={ref} className={className} style={style} />
}

const clampNum = (v: string | null, lo: number, hi: number, def: number) => {
  const n = Number(v)
  return v !== null && Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : def
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function ColorBlindnessSimulator() {
  const t = useTranslations('colorBlindnessSimulator')
  const sp = useSearchParams()

  const [type, setType] = useState<Cvd>(() => {
    const v = sp.get('t') as Cvd | null
    return v && CVD_LIST.includes(v) ? v : DEF.type
  })
  const [sev, setSev] = useState(() => clampNum(sp.get('s'), 0, 100, DEF.sev))
  const [view, setView] = useState<View>(() => (sp.get('v') === 'grid' ? 'grid' : DEF.view))
  const [sample, setSample] = useState<SampleKey | null>(() => {
    const v = sp.get('img') as SampleKey | null
    return v && SAMPLES.includes(v) ? v : DEF.sample
  })
  const [palette, setPalette] = useState<string[]>(() => {
    const p = parseHexList(sp.get('pal') ?? '')
    return p.length >= 2 ? p : PALETTE_RISKY
  })
  const [palText, setPalText] = useState('')
  const [img, setImg] = useState<ImageData | null>(null)
  const [fileName, setFileName] = useState('sample')
  const [split, setSplit] = useState(50)
  const [dragFile, setDragFile] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const splitRef = useRef<HTMLDivElement>(null)

  // 샘플은 마운트 후 생성 (canvas 필요)
  useEffect(() => {
    if (sample) setImg(SAMPLE_FN[sample]())
  }, [sample])

  // URL 동기화 (기본값과 다른 것만)
  useEffect(() => {
    const id = setTimeout(() => {
      const p = new URLSearchParams()
      if (type !== DEF.type) p.set('t', type)
      if (sev !== DEF.sev) p.set('s', String(sev))
      if (view !== DEF.view) p.set('v', view)
      if (sample && sample !== DEF.sample) p.set('img', sample)
      if (palette.join() !== PALETTE_RISKY.join()) p.set('pal', palette.map((h) => h.slice(1)).join('-'))
      const qs = p.toString()
      window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`)
    }, 300)
    return () => clearTimeout(id)
  }, [type, sev, view, sample, palette])

  const loadFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return
    const url = URL.createObjectURL(file)
    const el = new Image()
    el.onload = () => {
      const MAX = 1200 // 성능상 긴 변 1,200px로 축소
      const k = Math.min(1, MAX / Math.max(el.naturalWidth, el.naturalHeight))
      const w = Math.max(1, Math.round(el.naturalWidth * k)), h = Math.max(1, Math.round(el.naturalHeight * k))
      const [, ctx] = makeCanvas(w, h)
      ctx.drawImage(el, 0, 0, w, h)
      URL.revokeObjectURL(url)
      setSample(null)
      setFileName(file.name.replace(/\.[^.]+$/, '') || 'image')
      setImg(ctx.getImageData(0, 0, w, h))
      setSplit(50)
    }
    el.onerror = () => URL.revokeObjectURL(url)
    el.src = url
  }, [])

  // Ctrl+V 스크린샷 붙여넣기
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = Array.from(e.clipboardData?.files ?? []).find((f) => f.type.startsWith('image/'))
      if (file) { e.preventDefault(); loadFile(file) }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [loadFile])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) loadFile(file)
    e.target.value = ''
  }

  const pickSample = (k: SampleKey) => {
    setSample(k)
    setFileName('sample')
    setSplit(50)
  }

  // 비교 슬라이더 (pointer events — 마우스·터치 공통, 세로 스크롤은 유지)
  const moveSplit = (clientX: number) => {
    const r = splitRef.current?.getBoundingClientRect()
    if (r) setSplit(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)))
  }

  const handleDownload = () => {
    if (!img) return
    const [c, ctx] = makeCanvas(img.width, img.height)
    ctx.putImageData(new ImageData(simulatePixels(img.data, type, sev), img.width, img.height), 0, 0)
    c.toBlob((blob) => {
      if (!blob) return
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${fileName}-${type}-${sev}.png`
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    }, 'image/png')
  }

  const levelKey = type === 'normal' || sev === 0 ? 'none' : type === 'achroma' ? 'achroma' : sev >= 100 ? 'full' : sev >= 60 ? 'strong' : 'mild'
  const typeName = (c: Cvd) => t(`cvd.${c}.name`)

  // 팔레트 점검
  const rows = useMemo(() => checkPalette(palette, sev), [palette, sev])
  const cvdRows = rows.filter((r) => r.type !== 'normal')
  const worst = cvdRows.filter((r) => r.type !== 'achroma').reduce((a, b) => (b.issues.length > a.issues.length ? b : a), cvdRows[0])
  const setColor = (i: number, hex: string) => {
    const h = normalizeHex(hex)
    if (h) setPalette((p) => p.map((c, j) => (j === i ? h : c)))
  }
  const applyPalText = () => {
    const p = parseHexList(palText)
    if (p.length) { setPalette(p); setPalText('') }
  }

  const segBtn = (on: boolean) =>
    `min-h-10 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 설정 */}
        <div className="lg:col-span-1 min-w-0">
          <div className="ui-card p-5 space-y-5">
            <div>
              <p className="text-sm font-semibold text-body mb-2">{t('typeLabel')}</p>
              <div className="space-y-2">
                {CVD_LIST.map((c) => (
                  <button
                    key={c}
                    onClick={() => setType(c)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl border transition-colors ${
                      type === c ? 'bg-primary-soft border-primary' : 'border-line hover:bg-subtle'
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className={`text-sm font-semibold ${type === c ? 'text-primary' : 'text-fg'}`}>{typeName(c)}</span>
                      {c !== 'normal' && <span className="text-xs text-muted whitespace-nowrap">{t(`cvd.${c}.prevalence`)}</span>}
                    </div>
                    <p className="text-xs text-muted mt-0.5 leading-snug">{t(`cvd.${c}.desc`)}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className={type === 'normal' ? 'opacity-50' : ''}>
              <label className="flex items-center justify-between text-sm font-semibold text-body mb-2">
                <span>{t('severity')}</span>
                <span className="tabular-nums text-fg">{sev}%</span>
              </label>
              <input
                type="range" min={0} max={100} step={5} value={sev}
                disabled={type === 'normal'}
                onChange={(e) => setSev(Number(e.target.value))}
                className="w-full h-10 accent-[var(--primary)]"
                aria-label={t('severity')}
              />
              <div className="flex gap-2 mt-1">
                {[30, 60, 100].map((v) => (
                  <button key={v} disabled={type === 'normal'} onClick={() => setSev(v)} className={`flex-1 ${segBtn(sev === v)}`}>
                    {t(`severityPreset.${v}`)}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted mt-2 leading-relaxed">{t('severityHint')}</p>
            </div>
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 min-w-0 space-y-4">
          <div className="ui-card p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                <button onClick={() => setView('split')} className={segBtn(view === 'split')}>{t('viewSplit')}</button>
                <button onClick={() => setView('grid')} className={segBtn(view === 'grid')}>{t('viewGrid')}</button>
              </div>
              <p className="text-sm text-fg font-semibold">
                {typeName(type)} <span className="text-muted font-normal">· {t(`severityLevel.${levelKey}`)}</span>
              </p>
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragFile(true) }}
              onDragLeave={() => setDragFile(false)}
              onDrop={(e) => { e.preventDefault(); setDragFile(false); const f = e.dataTransfer.files?.[0]; if (f) loadFile(f) }}
              className={`rounded-xl transition-colors ${dragFile ? 'outline-2 outline-dashed outline-[var(--primary)]' : ''}`}
            >
              {!img ? (
                <div className="aspect-[3/2] bg-subtle rounded-xl flex items-center justify-center text-sm text-faint">{t('processing')}</div>
              ) : view === 'split' ? (
                <div>
                  <div
                    ref={splitRef}
                    role="slider"
                    tabIndex={0}
                    aria-label={t('sliderHint')}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(split)}
                    onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); moveSplit(e.clientX) }}
                    onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) moveSplit(e.clientX) }}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowLeft') setSplit((s) => Math.max(0, s - 5))
                      if (e.key === 'ArrowRight') setSplit((s) => Math.min(100, s + 5))
                    }}
                    className="relative mx-auto w-fit max-w-full select-none cursor-ew-resize rounded-xl overflow-hidden bg-subtle"
                    style={{ touchAction: 'pan-y' }}
                  >
                    <SimCanvas img={img} type={type} sev={sev} className="block max-w-full max-h-[70vh] w-auto h-auto" />
                    <SimCanvas
                      img={img} type="normal" sev={0}
                      className="absolute inset-0 w-full h-full"
                      style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
                    />
                    <div className="absolute top-0 bottom-0 w-0.5 bg-white pointer-events-none" style={{ left: `${split}%`, transform: 'translateX(-50%)' }}>
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white border border-line flex items-center justify-center text-sub">
                        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M5 8l3-3v6L5 8zm6 0l-3 3V5l3 3z" /></svg>
                      </div>
                    </div>
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-white text-xs pointer-events-none">{t('original')}</span>
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-primary text-white text-xs pointer-events-none">{t('simulated')}</span>
                  </div>
                  <p className="text-center text-xs text-faint mt-2">{t('sliderHint')}</p>
                </div>
              ) : (
                <div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {CVD_LIST.map((c) => (
                      <button
                        key={c}
                        onClick={() => { if (c !== 'normal') setType(c); setView('split') }}
                        className={`text-left rounded-xl overflow-hidden border transition-colors ${type === c ? 'border-primary' : 'border-line hover:border-line-strong'}`}
                      >
                        <SimCanvas img={img} type={c} sev={sev} className="block w-full h-auto bg-subtle" />
                        <span className={`block px-2 py-1.5 text-xs font-medium ${type === c ? 'text-primary' : 'text-body'}`}>
                          {c === 'normal' ? t('original') : typeName(c)}
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-faint mt-2">{t('gridHint', { sev })}</p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted">{t('sampleImages')}</span>
              {SAMPLES.map((k) => (
                <button key={k} onClick={() => pickSample(k)} className={segBtn(sample === k)}>
                  {t(`sample${k[0].toUpperCase()}${k.slice(1)}`)}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => fileInputRef.current?.click()} className="ui-btn-soft min-h-10 px-4 py-2 text-sm">
                <Upload className="w-4 h-4" />{t('upload')}
              </button>
              <button onClick={() => cameraInputRef.current?.click()} className="ui-btn-soft min-h-10 px-4 py-2 text-sm sm:hidden">
                <Camera className="w-4 h-4" />{t('cameraButton')}
              </button>
              <button onClick={handleDownload} disabled={!img} className="ui-btn min-h-10 px-4 py-2 text-sm ml-auto">
                <Download className="w-4 h-4" />{t('download')}
              </button>
            </div>
            <p className="text-xs text-muted">{t('uploadHint')}</p>
          </div>
        </div>
      </div>

      {/* 팔레트 구분 점검 */}
      <div className="ui-card p-5 sm:p-6 space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-fg">{t('palette.title')}</h2>
          <p className="text-sm text-muted mt-1">{t('palette.desc')}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {palette.map((hex, i) => (
            <div key={i} className="flex items-center gap-1.5 pl-1.5 pr-1 py-1 rounded-xl border border-line">
              <input
                type="color" value={hex} onChange={(e) => setColor(i, e.target.value)}
                className="w-10 h-10 rounded-lg cursor-pointer bg-transparent"
                aria-label={hex}
              />
              <span className="text-xs font-mono text-body w-[4.5rem]">{hex}</span>
              <button
                onClick={() => setPalette((p) => p.filter((_, j) => j !== i))}
                disabled={palette.length <= 2}
                className="w-10 h-10 flex items-center justify-center rounded-lg text-faint hover:bg-soft disabled:opacity-30"
                aria-label={t('palette.remove')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          {palette.length < MAX_COLORS && (
            <button
              onClick={() => setPalette((p) => [...p, '#888888'])}
              className="ui-btn-soft min-h-10 px-3 py-2 text-sm"
            >
              <Plus className="w-4 h-4" />{t('palette.add')}
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={palText}
            onChange={(e) => setPalText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') applyPalText() }}
            placeholder={t('palette.placeholder')}
            className="ui-field px-4 py-2.5 text-sm flex-1 min-w-0 font-mono"
          />
          <button onClick={applyPalText} className="ui-btn min-h-10 px-4 py-2 text-sm">{t('palette.apply')}</button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setPalette(PALETTE_RISKY)} className={segBtn(palette.join() === PALETTE_RISKY.join())}>{t('palette.presetRisky')}</button>
          <button onClick={() => setPalette(PALETTE_OKABE_ITO)} className={segBtn(palette.join() === PALETTE_OKABE_ITO.join())}>{t('palette.presetSafe')}</button>
        </div>

        {/* 요약 */}
        <div className="bg-subtle rounded-2xl p-4">
          {worst && worst.issues.length > 0 ? (
            <p className="text-base font-bold text-fg">{t('palette.summaryBad', { type: typeName(worst.type), n: worst.issues.length })}</p>
          ) : (
            <p className="text-base font-bold text-fg">{t('palette.summaryOk')}</p>
          )}
          <p className="text-xs text-muted mt-1">{t('palette.severityNote', { sev })}</p>
        </div>

        {/* 유형별 */}
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.type} className="border-t border-line pt-3 first:border-0 first:pt-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 mb-2">
                <span className="text-sm font-semibold text-fg">{r.type === 'normal' ? t('original') : typeName(r.type)}</span>
                <span className={`text-xs font-medium ${r.issues.length ? 'text-amber-700' : 'text-muted'}`}>
                  {r.issues.length ? t('palette.issues', { n: r.issues.length }) : t('palette.ok')}
                  <span className="text-faint font-normal"> · {t('palette.minDe', { v: Number.isFinite(r.minDe) ? r.minDe.toFixed(1) : '-' })}</span>
                </span>
              </div>
              <div className="flex rounded-lg overflow-hidden h-10">
                {r.colors.map((c, i) => <div key={i} className="flex-1" style={{ background: c }} title={c} />)}
              </div>
              {r.issues.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {r.issues.slice(0, 6).map(({ i, j, de }) => (
                    <span key={`${i}-${j}`} className="inline-flex items-center gap-1.5 text-xs text-body bg-soft rounded-lg px-2 py-1">
                      <span className="w-4 h-4 rounded" style={{ background: palette[i] }} />
                      <span className="w-4 h-4 rounded" style={{ background: palette[j] }} />
                      <span className="tabular-nums">ΔE {de.toFixed(1)}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-muted leading-relaxed">{t('palette.threshold', { n: DE_WARN })}</p>

        <ShareResult
          card={{
            tool: t('title'),
            label: t('palette.shareLabel', { n: palette.length }),
            headline: worst && worst.issues.length ? t('palette.shareBad', { n: worst.issues.length }) : t('palette.shareOk'),
            sub: t('palette.severityNote', { sev }),
            rows: cvdRows.map((r) => ({ label: typeName(r.type), value: r.issues.length ? t('palette.issues', { n: r.issues.length }) : t('palette.ok') })),
          }}
          fileName="color-blindness-palette"
        />
      </div>

      {/* 얼마나 흔할까 */}
      <div className="ui-card p-5 sm:p-6 space-y-4">
        <h2 className="text-lg font-semibold text-fg">{t('stats.title')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(['male', 'female', 'oneIn'] as const).map((k) => (
            <div key={k} className="bg-subtle rounded-2xl p-4">
              <p className="text-xs text-muted">{t(`stats.${k}Label`)}</p>
              <p className="text-xl sm:text-2xl font-bold text-fg tabular-nums mt-1">{t(`stats.${k}Value`)}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted leading-relaxed">{t('stats.note')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Link href="/color-blind-test/" className="flex items-center justify-between gap-2 min-h-10 px-4 py-3 rounded-xl bg-soft hover:bg-subtle text-sm text-body">
            {t('links.test')}<ChevronRight className="w-4 h-4 text-faint shrink-0" />
          </Link>
          <Link href="/contrast-checker/" className="flex items-center justify-between gap-2 min-h-10 px-4 py-3 rounded-xl bg-soft hover:bg-subtle text-sm text-body">
            {t('links.contrast')}<ChevronRight className="w-4 h-4 text-faint shrink-0" />
          </Link>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />

      <GuideSection namespace="colorBlindnessSimulator" defaultOpen />
    </div>
  )
}
