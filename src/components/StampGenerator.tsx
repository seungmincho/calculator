'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useTranslations } from '@/lib/i18n'

type StampShape = 'circle' | 'square' | 'oval' | 'corporate'
type StampStyle = 'traditional' | 'modern-blue' | 'black' | 'custom'
type FontStyle = 'serif' | 'sans-serif' | 'brush'
type Suffix = 'none' | 'in' | 'jiin'

const SHAPES: StampShape[] = ['circle', 'oval', 'square', 'corporate']
const STYLES: StampStyle[] = ['traditional', 'modern-blue', 'black', 'custom']
const FONTS: FontStyle[] = ['serif', 'sans-serif', 'brush']
const SUFFIXES: Suffix[] = ['none', 'in', 'jiin']
const SUFFIX_TEXT: Record<Suffix, string> = { none: '', in: '인', jiin: '지인' }
const TEXT_MAX = 10
const RING_MAX = 24
const EXPORT_SIZES = [500, 1000, 2000]

// 시스템 폰트만 사용 (SVG를 <img>로 래스터화하면 웹폰트가 적용되지 않음). 궁서/바탕 = Windows, AppleMyungjo = macOS
const FONT_FAMILIES: Record<FontStyle, string> = {
  serif: "'Noto Serif KR', Batang, BatangChe, AppleMyungjo, 'Nanum Myeongjo', serif",
  'sans-serif': "'Noto Sans KR', 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif",
  brush: "'Nanum Brush Script', Gungsuh, GungsuhChe, AppleMyungjo, Batang, serif",
}
const FONT_WEIGHT: Record<FontStyle, number> = { serif: 700, 'sans-serif': 700, brush: 400 }

const STYLE_COLORS: Record<StampStyle, string> = {
  traditional: '#CC0000',
  'modern-blue': '#1E3A8A',
  black: '#1A1A1A',
  custom: '#CC0000',
}

interface StampConfig {
  text: string
  ring: string
  shape: StampShape
  suffix: Suffix
  stampStyle: StampStyle
  customColor: string
  fontStyle: FontStyle
  borderWidth: number
  doubleBorder: boolean
  opacity: number
  ink: boolean
}

const DEFAULT_CONFIG: StampConfig = {
  text: '홍길동',
  ring: '',
  shape: 'circle',
  suffix: 'in',
  stampStyle: 'traditional',
  customColor: '#CC0000',
  fontStyle: 'serif',
  borderWidth: 6,
  doubleBorder: false,
  opacity: 100,
  ink: true,
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
const r2 = (n: number) => Math.round(n * 100) / 100

/**
 * 전통 도장 배치: 세로쓰기, 오른쪽 열부터 왼쪽으로.
 * 글자 수에 따라 행 수를 정하고, 나머지 글자는 한 열에 크게(세로로 늘려) 배치한다.
 * remainderFirst: 성명(홍 | 길동) = 오른쪽 열, 법인(대표 | 이사 | 인) = 왼쪽 열.
 */
export function layoutChars(n: number, remainderFirst: boolean) {
  if (n <= 0) return []
  const rows = n <= 1 ? 1 : n <= 6 ? 2 : n <= 12 ? 3 : 4
  const cols = Math.ceil(n / rows)
  const rem = n - rows * (cols - 1)
  const counts = Array.from({ length: cols }, (_, c) =>
    (remainderFirst ? c === 0 : c === cols - 1) ? rem : rows,
  )
  const cells: { col: number; cols: number; row: number; rows: number }[] = []
  counts.forEach((cnt, col) => {
    for (let row = 0; row < cnt; row++) cells.push({ col, cols, row, rows: cnt })
  })
  return cells
}

function gridText(chars: string[], x: number, y: number, w: number, h: number, remainderFirst: boolean) {
  return layoutChars(chars.length, remainderFirst)
    .map((cell, i) => {
      const cw = w / cell.cols
      const chH = h / cell.rows
      const cx = x + w - cw * (cell.col + 0.5) // 오른쪽 → 왼쪽
      const cy = y + chH * (cell.row + 0.5)
      const fs = chH * 0.92
      const sx = Math.min(1.8, Math.max(0.45, cw / chH))
      return `<text font-size="${r2(fs)}" transform="translate(${r2(cx)} ${r2(cy)}) scale(${r2(sx)} 1)" text-anchor="middle" dominant-baseline="central">${esc(chars[i])}</text>`
    })
    .join('')
}

export function buildStampSvg(cfg: StampConfig, seed: number) {
  const color = cfg.stampStyle === 'custom' ? cfg.customColor : STYLE_COLORS[cfg.stampStyle]
  const bw = cfg.borderWidth
  const M = 6 // 잉크 번짐 여유
  const W = cfg.shape === 'oval' ? 150 : 200
  const H = 200
  const cx = W / 2
  const cy = H / 2
  const gap = Math.max(4, bw * 1.2)
  const innerBw = r2(Math.max(1.5, bw * 0.6))
  const chars = Array.from((cfg.text + SUFFIX_TEXT[cfg.suffix]).replace(/\s/g, ''))
  const pad = 4 + (cfg.doubleBorder ? gap + innerBw : 0)
  const parts: string[] = []

  if (cfg.shape === 'circle' || cfg.shape === 'corporate') {
    const r0 = 100 - M - bw / 2
    parts.push(`<circle cx="${cx}" cy="${cy}" r="${r2(r0)}" fill="none" stroke-width="${bw}"/>`)
    if (cfg.doubleBorder) parts.push(`<circle cx="${cx}" cy="${cy}" r="${r2(r0 - bw / 2 - gap)}" fill="none" stroke-width="${innerBw}"/>`)
    if (cfg.shape === 'circle') {
      const side = (r0 - bw / 2 - pad) * 1.34
      parts.push(gridText(chars, cx - side / 2, cy - side / 2, side, side, true))
    } else {
      // 법인인감: 바깥 고리에 상호, 안쪽 원에 직함(대표이사인)
      const outer = r0 - bw / 2 - (cfg.doubleBorder ? gap + innerBw : 0)
      const r1 = r0 * 0.6
      parts.push(`<circle cx="${cx}" cy="${cy}" r="${r2(r1)}" fill="none" stroke-width="${innerBw}"/>`)
      const band = outer - r1 - innerBw / 2
      const rt = r1 + innerBw / 2 + band / 2
      const fs = band * 0.66
      const ring = cfg.ring.trim()
      if (ring) {
        const circ = 2 * Math.PI * rt
        const len = Math.min(circ * 0.9, Array.from(ring).length * fs * 1.5)
        parts.push(
          `<path id="ring" d="M ${cx} ${r2(cy + rt)} A ${r2(rt)} ${r2(rt)} 0 1 1 ${cx} ${r2(cy - rt)} A ${r2(rt)} ${r2(rt)} 0 1 1 ${cx} ${r2(cy + rt)}" fill="none" stroke="none"/>`,
          `<text font-size="${r2(fs)}" dominant-baseline="central"><textPath href="#ring" startOffset="50%" text-anchor="middle" textLength="${r2(len)}" lengthAdjust="spacing">${esc(ring)}</textPath></text>`,
        )
      }
      const side = (r1 - innerBw / 2 - 3) * 1.34
      parts.push(gridText(chars, cx - side / 2, cy - side / 2, side, side, false))
    }
  } else if (cfg.shape === 'square') {
    const o = M + bw / 2
    const s = 200 - 2 * o
    parts.push(`<rect x="${r2(o)}" y="${r2(o)}" width="${r2(s)}" height="${r2(s)}" rx="3" fill="none" stroke-width="${bw}"/>`)
    if (cfg.doubleBorder) {
      const o2 = o + bw / 2 + gap
      parts.push(`<rect x="${r2(o2)}" y="${r2(o2)}" width="${r2(200 - 2 * o2)}" height="${r2(200 - 2 * o2)}" rx="2" fill="none" stroke-width="${innerBw}"/>`)
    }
    const io = o + bw / 2 + pad
    parts.push(gridText(chars, io, io, 200 - 2 * io, 200 - 2 * io, true))
  } else {
    // 타원: 세로로 긴 개인 도장
    const rx = cx - M - bw / 2
    const ry = cy - M - bw / 2
    parts.push(`<ellipse cx="${cx}" cy="${cy}" rx="${r2(rx)}" ry="${r2(ry)}" fill="none" stroke-width="${bw}"/>`)
    if (cfg.doubleBorder) parts.push(`<ellipse cx="${cx}" cy="${cy}" rx="${r2(rx - bw / 2 - gap)}" ry="${r2(ry - bw / 2 - gap)}" fill="none" stroke-width="${innerBw}"/>`)
    const w = (rx - bw / 2 - pad) * 1.34
    const h = (ry - bw / 2 - pad) * 1.34
    parts.push(gridText(chars, cx - w / 2, cy - h / 2, w, h, true))
  }

  // 잉크 질감: 가장자리 번짐(displacement) + 미세한 빈 점(찍힘 불균일)
  const filter = cfg.ink
    ? `<defs><filter id="ink" x="-5%" y="-5%" width="110%" height="110%">` +
      `<feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="${seed}" result="n"/>` +
      `<feDisplacementMap in="SourceGraphic" in2="n" scale="3" xChannelSelector="R" yChannelSelector="G" result="d"/>` +
      `<feTurbulence type="fractalNoise" baseFrequency="0.25" numOctaves="2" seed="${seed + 7}" result="g"/>` +
      `<feColorMatrix in="g" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -9 0 0 0 6.4" result="m"/>` +
      `<feComposite in="d" in2="m" operator="in"/></filter></defs>`
    : ''

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${filter}` +
    `<g fill="${color}" stroke="${color}" stroke-linejoin="round" opacity="${cfg.opacity / 100}"` +
    ` font-family="${FONT_FAMILIES[cfg.fontStyle]}" font-weight="${FONT_WEIGHT[cfg.fontStyle]}"${cfg.ink ? ' filter="url(#ink)"' : ''}>` +
    // 글자는 stroke 없이 fill만 (테두리 요소는 fill="none"으로 개별 지정)
    parts.join('').replace(/<text /g, '<text stroke="none" ') +
    `</g></svg>`
  )
}

function svgToPngBlob(svg: string, longSide: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const scale = longSide / Math.max(img.width, img.height)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('no ctx'))
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/png')
    }
    img.onerror = reject
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
  })
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// URL 공유 파라미터 ↔ 설정
const PARAM_KEYS: Record<string, keyof StampConfig> = {
  t: 'text', r: 'ring', s: 'shape', x: 'suffix', st: 'stampStyle', c: 'customColor', f: 'fontStyle', b: 'borderWidth', d: 'doubleBorder', o: 'opacity', i: 'ink',
}

function parseParams(search: string): Partial<StampConfig> {
  const p = new URLSearchParams(search)
  const out: Partial<StampConfig> = {}
  const text = p.get('t')
  if (text !== null) out.text = Array.from(text).slice(0, TEXT_MAX).join('')
  const ring = p.get('r')
  if (ring !== null) out.ring = Array.from(ring).slice(0, RING_MAX).join('')
  const pick = <T extends string>(v: string | null, list: readonly T[]) => (list as readonly string[]).includes(v ?? '') ? (v as T) : undefined
  out.shape = pick(p.get('s'), SHAPES)
  out.suffix = pick(p.get('x'), SUFFIXES)
  out.stampStyle = pick(p.get('st'), STYLES)
  out.fontStyle = pick(p.get('f'), FONTS)
  const c = p.get('c')
  if (c && /^[0-9a-fA-F]{6}$/.test(c)) out.customColor = `#${c}`
  const b = Number(p.get('b'))
  if (b >= 2 && b <= 14) out.borderWidth = b
  const o = Number(p.get('o'))
  if (o >= 20 && o <= 100) out.opacity = o
  if (p.has('d')) out.doubleBorder = p.get('d') === '1'
  if (p.has('i')) out.ink = p.get('i') === '1'
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v !== undefined)) as Partial<StampConfig>
}

export default function StampGenerator() {
  const t = useTranslations('stampGenerator')
  const [config, setConfig] = useState<StampConfig>(DEFAULT_CONFIG)
  const [seed, setSeed] = useState(3)
  const [exportSize, setExportSize] = useState(1000)
  const [flash, setFlash] = useState<string | null>(null)
  const loaded = useRef(false)

  // 공유 링크 복원 (마운트 1회)
  useEffect(() => {
    setConfig(prev => ({ ...prev, ...parseParams(window.location.search) }))
    loaded.current = true
  }, [])

  // 설정 → URL 동기화 (기본값과 다른 항목만)
  useEffect(() => {
    if (!loaded.current) return
    const url = new URL(window.location.href)
    for (const [k, key] of Object.entries(PARAM_KEYS)) {
      const v = config[key]
      if (v === DEFAULT_CONFIG[key]) url.searchParams.delete(k)
      else url.searchParams.set(k, typeof v === 'boolean' ? (v ? '1' : '0') : key === 'customColor' ? String(v).slice(1) : String(v))
    }
    window.history.replaceState(window.history.state, '', url)
  }, [config])

  const svg = useMemo(() => buildStampSvg(config, seed), [config, seed])
  const previewSrc = useMemo(() => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg), [svg])
  const fileBase = `stamp-${(config.shape === 'corporate' ? config.ring || config.text : config.text).trim() || 'stamp'}`

  const showFlash = (key: string) => {
    setFlash(key)
    setTimeout(() => setFlash(null), 2000)
  }

  const handleDownload = useCallback(async () => {
    downloadBlob(await svgToPngBlob(svg, exportSize), `${fileBase}.png`)
  }, [svg, exportSize, fileBase])

  const handleDownloadSvg = useCallback(() => {
    downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), `${fileBase}.svg`)
  }, [svg, fileBase])

  const handleCopy = useCallback(async () => {
    try {
      // Safari는 user gesture 안에서 Promise<Blob>을 넘겨야 함
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': svgToPngBlob(svg, exportSize) })])
      showFlash('copy')
    } catch {
      handleDownload()
    }
  }, [svg, exportSize, handleDownload])

  const handleShare = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
    } catch {
      /* 주소창의 URL 그대로 사용 가능 */
    }
    showFlash('share')
  }, [])

  const update = <K extends keyof StampConfig>(key: K, value: StampConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  const selectShape = (s: StampShape) => {
    setConfig(prev => {
      // 법인인감으로 처음 전환하면 예시 상호·직함을 채워 바로 결과가 보이게
      if (s === 'corporate' && prev.shape !== 'corporate' && !prev.ring.trim()) {
        return { ...prev, shape: s, ring: t('defaultRing'), text: t('defaultCorporateText'), suffix: 'in' }
      }
      return { ...prev, shape: s }
    })
  }

  const activeColor = config.stampStyle === 'custom' ? config.customColor : STYLE_COLORS[config.stampStyle]
  const seg = (active: boolean) =>
    `py-2 px-2 rounded-lg text-xs font-medium transition-colors ${active ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
  const displayText = Array.from(config.text.replace(/\s/g, '') + SUFFIX_TEXT[config.suffix]).length

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* 설정 */}
        <div className="lg:col-span-1 space-y-4">
          <div className="ui-card p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-body mb-2">{t('labelShape')}</label>
              <div className="grid grid-cols-2 gap-2">
                {SHAPES.map(s => (
                  <button key={s} onClick={() => selectShape(s)} className={seg(config.shape === s)} aria-pressed={config.shape === s}>
                    {t(`shapes.${s}`)}
                  </button>
                ))}
              </div>
            </div>

            {config.shape === 'corporate' && (
              <div>
                <label htmlFor="stamp-ring" className="block text-sm font-medium text-body mb-1">{t('labelRing')}</label>
                <input
                  id="stamp-ring"
                  type="text"
                  value={config.ring}
                  onChange={e => update('ring', Array.from(e.target.value).slice(0, RING_MAX).join(''))}
                  placeholder={t('defaultRing')}
                  className="ui-field px-3 py-2"
                />
              </div>
            )}

            <div>
              <label htmlFor="stamp-text" className="block text-sm font-medium text-body mb-1">
                {config.shape === 'corporate' ? t('labelCenterText') : t('labelName')}
              </label>
              <input
                id="stamp-text"
                type="text"
                value={config.text}
                onChange={e => update('text', Array.from(e.target.value).slice(0, TEXT_MAX).join(''))}
                placeholder={t('placeholderText')}
                className="ui-field px-3 py-2"
              />
              <p className="text-xs text-faint mt-1">{t('charCount', { count: displayText })}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-body mb-2">{t('labelSuffix')}</label>
              <div className="grid grid-cols-3 gap-2">
                {SUFFIXES.map(s => (
                  <button key={s} onClick={() => update('suffix', s)} className={seg(config.suffix === s)} aria-pressed={config.suffix === s}>
                    {t(`suffixes.${s}`)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-body mb-2">{t('labelStyle')}</label>
              <div className="grid grid-cols-2 gap-2">
                {STYLES.map(s => (
                  <button
                    key={s}
                    onClick={() => update('stampStyle', s)}
                    aria-pressed={config.stampStyle === s}
                    className={`py-2 px-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 justify-center text-body ${
                      config.stampStyle === s ? 'ring-2 ring-primary bg-subtle' : 'bg-soft hover:bg-subtle'
                    }`}
                  >
                    <span className="inline-block w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s === 'custom' ? config.customColor : STYLE_COLORS[s] }} />
                    {t(`style${s.charAt(0).toUpperCase() + s.replace('-', '').slice(1)}`)}
                  </button>
                ))}
              </div>
              {config.stampStyle === 'custom' && (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="color"
                    value={config.customColor}
                    onChange={e => update('customColor', e.target.value)}
                    className="w-10 h-8 rounded cursor-pointer border border-line-strong"
                  />
                  <span className="text-xs text-muted">{config.customColor}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-body mb-2">{t('labelFont')}</label>
              <div className="grid grid-cols-3 gap-2">
                {FONTS.map(f => (
                  <button key={f} onClick={() => update('fontStyle', f)} className={seg(config.fontStyle === f)} aria-pressed={config.fontStyle === f}>
                    {t(`font${f.charAt(0).toUpperCase() + f.replace('-', '').slice(1)}`)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-body mb-1">
                {t('labelBorderWidth')}: <span className="font-bold text-fg tabular-nums">{config.borderWidth}</span>
              </label>
              <input type="range" min={2} max={14} value={config.borderWidth} onChange={e => update('borderWidth', Number(e.target.value))} className="w-full accent-blue-600" />
            </div>

            <div>
              <label className="block text-sm font-medium text-body mb-1">
                {t('labelOpacity')}: <span className="font-bold text-fg tabular-nums">{config.opacity}%</span>
              </label>
              <input type="range" min={20} max={100} value={config.opacity} onChange={e => update('opacity', Number(e.target.value))} className="w-full accent-blue-600" />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-body cursor-pointer">
                <input type="checkbox" checked={config.doubleBorder} onChange={e => update('doubleBorder', e.target.checked)} className="w-4 h-4 accent-blue-600" />
                {t('labelDoubleBorder')}
              </label>
              <label className="flex items-center gap-2 text-sm text-body cursor-pointer">
                <input type="checkbox" checked={config.ink} onChange={e => update('ink', e.target.checked)} className="w-4 h-4 accent-blue-600" />
                {t('labelInk')}
              </label>
            </div>

            <button onClick={() => setConfig(DEFAULT_CONFIG)} className="w-full py-2 px-4 bg-soft hover:bg-subtle text-body rounded-lg text-sm font-medium transition-colors">
              {t('buttonReset')}
            </button>
          </div>
        </div>

        {/* 미리보기 & 저장 */}
        <div className="lg:col-span-2 space-y-4">
          <div className="ui-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-fg">{t('previewTitle')}</h2>
              {config.ink && (
                <button onClick={() => setSeed(Math.floor(Math.random() * 1000))} className="py-1.5 px-3 bg-soft hover:bg-subtle text-body rounded-lg text-xs font-medium">
                  {t('buttonRestamp')}
                </button>
              )}
            </div>

            {/* 체크무늬 = 투명 배경 표시 */}
            <div
              className="flex justify-center items-center min-h-64 rounded-xl border border-line p-6"
              style={{ backgroundImage: 'repeating-conic-gradient(rgb(128 128 128 / 0.12) 0 25%, transparent 0 50%)', backgroundSize: '16px 16px' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewSrc} alt={t('canvasAriaLabel')} className="h-60 w-auto max-w-full" />
            </div>
            {!config.text.trim() && !config.ring.trim() && <p className="text-sm text-faint mt-2 text-center">{t('emptyTextHint')}</p>}

            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="bg-subtle rounded-lg p-3 text-center">
                <p className="text-xs text-muted">{t('infoShape')}</p>
                <p className="text-sm font-semibold text-fg mt-1">{t(`shapes.${config.shape}`)}</p>
              </div>
              <div className="bg-subtle rounded-lg p-3 text-center">
                <label htmlFor="stamp-export" className="block text-xs text-muted">{t('infoExport')}</label>
                <select
                  id="stamp-export"
                  value={exportSize}
                  onChange={e => setExportSize(Number(e.target.value))}
                  className="mt-1 bg-transparent text-sm font-semibold text-fg text-center tabular-nums"
                >
                  {EXPORT_SIZES.map(s => <option key={s} value={s}>{s}px</option>)}
                </select>
              </div>
              <div className="bg-subtle rounded-lg p-3 text-center">
                <p className="text-xs text-muted">{t('infoColor')}</p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: activeColor }} />
                  <p className="text-xs font-semibold text-fg">{activeColor.toUpperCase()}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button onClick={handleDownload} className="ui-btn py-3 px-4">{t('buttonDownload')}</button>
              <button onClick={handleDownloadSvg} className="py-3 px-4 bg-soft hover:bg-subtle text-body rounded-xl font-medium transition-colors">{t('buttonDownloadSvg')}</button>
              <button onClick={handleCopy} className="py-3 px-4 bg-soft hover:bg-subtle text-body rounded-xl font-medium transition-colors">
                {flash === 'copy' ? t('buttonCopied') : t('buttonCopy')}
              </button>
              <button onClick={handleShare} className="py-3 px-4 bg-soft hover:bg-subtle text-body rounded-xl font-medium transition-colors">
                {flash === 'share' ? t('buttonShareCopied') : t('buttonShare')}
              </button>
            </div>

            <p className="mt-4 bg-subtle rounded-xl p-4 text-xs text-sub leading-relaxed">{t('legalNote')}</p>
          </div>

          <div className="bg-subtle rounded-xl p-5">
            <h3 className="text-sm font-semibold text-sub mb-3">{t('tipsTitle')}</h3>
            <ul className="space-y-1 list-disc list-inside">
              {((t.raw('tipsList') as string[] | undefined) ?? []).map((tip, i) => (
                <li key={i} className="text-xs text-sub">{tip}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="ui-card p-6">
        <h2 className="text-xl font-semibold text-fg mb-6">{t('guideTitle')}</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-base font-semibold text-body mb-3">{t('guideShapesTitle')}</h3>
            <ul className="space-y-2 list-disc list-inside">
              {((t.raw('guideShapesItems') as string[] | undefined) ?? []).map((item, i) => (
                <li key={i} className="text-sm text-sub">{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-base font-semibold text-body mb-3">{t('guideUsageTitle')}</h3>
            <ul className="space-y-2 list-disc list-inside">
              {((t.raw('guideUsageItems') as string[] | undefined) ?? []).map((item, i) => (
                <li key={i} className="text-sm text-sub">{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
