'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useTranslations } from '@/lib/i18n'
import { useSearchParams } from '@/hooks/useSearchParams'
import { ArrowLeftRight, Lock, Unlock, Copy, Check, Upload, Download, X } from 'lucide-react'
import ShareResult from '@/components/ShareResult'
import { reduceRatio, nearestCommon, parseRatio, resolutionLadder, fitImage } from '@/utils/aspectRatio'

/*
 * 플랫폼 규격 출처 (2026-09 확인)
 * - YouTube 썸네일 1280×720, 16:9: https://support.google.com/youtube/answer/72431
 * - Instagram 피드 세로 4:5 1080×1350 / 정사각 1080×1080: https://postfa.st/sizes/instagram/feed
 * - Shorts·Reels·TikTok 9:16 1080×1920: https://skedsocial.com/blog/tiktok-video-size-guide.md
 * - OG 이미지 1200×630 (1.91:1): https://developers.facebook.com/documentation/sharing/webmasters/images
 * - 세이프존: Meta Reels 광고 위 14%·아래 35%·좌우 6% — https://adsuploader.com/blog/meta-ads-safe-zones
 *   Shorts(비공식 근사) 위 12.5%·아래 19.8%·오른쪽 18.6%·왼쪽 5.6% — https://www.clipspeed.ai/blog/youtube-shorts-size.html
 * 네이버 블로그·카카오 썸네일은 공식 픽셀 규격을 확인하지 못해 제외.
 */

const PRESET_GROUPS = [
  { key: 'video', items: [['youtube', 1920, 1080], ['youtube4k', 3840, 2160], ['youtubeThumb', 1280, 720]] },
  { key: 'vertical', items: [['shorts', 1080, 1920]] },
  { key: 'social', items: [['instaPortrait', 1080, 1350], ['instaSquare', 1080, 1080], ['og', 1200, 630]] },
  { key: 'monitor', items: [['hd', 1280, 720], ['fullHd', 1920, 1080], ['qhd', 2560, 1440], ['uhd4k', 3840, 2160], ['ultrawide', 2560, 1080], ['uwqhd', 3440, 1440], ['a4', 2480, 3508]] },
] as const

const RATIO_CHIPS = ['16:9', '9:16', '4:5', '1:1', '4:3', '3:2', '21:9', '1.91:1'] as const

// 세이프존 (비율: top, bottom, left, right)
const SAFE_ZONES = {
  shorts: [0.125, 0.198, 0.056, 0.186],
  reels: [0.14, 0.35, 0.06, 0.06],
} as const
type Zone = 'none' | keyof typeof SAFE_ZONES

const LADDER_NAMES: Record<number, string> = { 480: 'SD', 720: 'HD', 1080: 'FHD', 1440: 'QHD', 2160: '4K UHD', 4320: '8K' }
const MAX_SIDE = 8192 // canvas 안전 한도

const seg = (on: boolean) =>
  `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
const posInt = (s: string | null) => {
  const n = Math.round(parseFloat(s ?? ''))
  return n > 0 ? n : 0
}

export default function AspectRatio() {
  const t = useTranslations('aspectRatio')
  const sp = useSearchParams()
  const [width, setWidth] = useState(() => (posInt(sp.get('w')) ? String(posInt(sp.get('w'))) : '1920'))
  const [height, setHeight] = useState(() => (posInt(sp.get('h')) ? String(posInt(sp.get('h'))) : '1080'))
  const [lockedRatio, setLockedRatio] = useState<number | null>(() => {
    const lw = posInt(sp.get('w')), lh = posInt(sp.get('h'))
    return sp.get('lock') === '1' && lw && lh ? lw / lh : null
  })
  const [customRatio, setCustomRatio] = useState('')
  const [zone, setZone] = useState<Zone>(() => {
    const z = sp.get('zone')
    return z === 'shorts' || z === 'reels' ? z : 'none'
  })
  const [targetWidth, setTargetWidth] = useState('')
  const [targetHeight, setTargetHeight] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [img, setImg] = useState<{ url: string; w: number; h: number; name: string; type: string } | null>(null)
  const [fit, setFit] = useState<'crop' | 'pad'>('crop')
  const [padColor, setPadColor] = useState<'#ffffff' | '#000000'>('#000000')
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)

  const w = posInt(width)
  const h = posInt(height)
  const valid = w > 0 && h > 0
  const [rw, rh] = reduceRatio(w, h)
  const ratioStr = `${rw}:${rh}`
  const near = nearestCommon(w, h)
  const is916 = valid && rw === 9 && rh === 16

  const shareUrl = useCallback(() => {
    const p = new URLSearchParams({ w: String(w || ''), h: String(h || '') })
    if (lockedRatio) p.set('lock', '1')
    if (zone !== 'none' && is916) p.set('zone', zone)
    return `${window.location.pathname}?${p.toString()}`
  }, [w, h, lockedRatio, zone, is916])

  useEffect(() => {
    if (!valid) return
    const id = setTimeout(() => window.history.replaceState(null, '', shareUrl()), 300)
    return () => clearTimeout(id)
  }, [shareUrl, valid])

  const copy = useCallback(async (text: string, id: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.left = '-999999px'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
    } catch {
      // 권한 없음: 무시
    }
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  const setSize = (nw: number, nh: number) => {
    setWidth(String(nw))
    setHeight(String(nh))
    if (lockedRatio) setLockedRatio(nw / nh)
  }

  const onWidth = (v: string) => {
    setWidth(v)
    const n = posInt(v)
    if (lockedRatio && n) setHeight(String(Math.round(n / lockedRatio)))
  }
  const onHeight = (v: string) => {
    setHeight(v)
    const n = posInt(v)
    if (lockedRatio && n) setWidth(String(Math.round(n * lockedRatio)))
  }

  // 비율 선택: 짧은 변을 유지하고 긴 변을 계산 (1920×1080 → 9:16 = 1080×1920), 비율 고정 켬
  const applyRatio = (r: number) => {
    const short = valid ? Math.min(w, h) : 1080
    const [nw, nh] = r >= 1 ? [Math.round(short * r), short] : [short, Math.round(short / r)]
    setWidth(String(nw))
    setHeight(String(nh))
    setLockedRatio(r)
  }

  const customParsed = parseRatio(customRatio)

  const resizer = useMemo(() => {
    if (!valid) return null
    const r = w / h
    const tw = posInt(targetWidth), th = posInt(targetHeight)
    if (tw) return { width: tw, height: Math.round(tw / r) }
    if (th) return { width: Math.round(th * r), height: th }
    return null
  }, [valid, w, h, targetWidth, targetHeight])

  // 미리보기 박스 크기
  const box = useMemo(() => {
    if (!valid) return { bw: 0, bh: 0 }
    const maxW = 320, maxH = 320
    const s = Math.min(maxW / w, maxH / h)
    return { bw: w * s, bh: h * s }
  }, [valid, w, h])

  // ── 이미지 ──
  const loadFile = useCallback((file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return
    const url = URL.createObjectURL(file)
    const el = new Image()
    el.onload = () => {
      imgRef.current = el
      setImg({ url, w: el.naturalWidth, h: el.naturalHeight, name: file.name.replace(/\.[^.]+$/, ''), type: file.type })
    }
    el.onerror = () => URL.revokeObjectURL(url)
    el.src = url
  }, [])

  // 이미지 교체·언마운트 시 이전 blob URL 해제
  useEffect(() => () => { if (img) URL.revokeObjectURL(img.url) }, [img])

  const clearImg = () => {
    setImg(null)
    imgRef.current = null
    if (fileRef.current) fileRef.current.value = ''
  }

  const fitInfo = img && valid ? fitImage(img.w, img.h, w, h) : null
  const outScale = valid ? Math.min(1, MAX_SIDE / Math.max(w, h)) : 1
  const outW = Math.round(w * outScale), outH = Math.round(h * outScale)

  const download = () => {
    const el = imgRef.current
    if (!el || !img || !fitInfo) return
    const s = outW / w
    const cw = outW, ch = outH
    const c = document.createElement('canvas')
    c.width = cw
    c.height = ch
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.imageSmoothingQuality = 'high'
    if (fit === 'crop') {
      const { x, y, w: sw, h: sh } = fitInfo.crop
      ctx.drawImage(el, x, y, sw, sh, 0, 0, cw, ch)
    } else {
      ctx.fillStyle = padColor
      ctx.fillRect(0, 0, cw, ch)
      const { x, y, w: dw, h: dh } = fitInfo.pad
      ctx.drawImage(el, x * s, y * s, dw * s, dh * s)
    }
    const type = img.type === 'image/png' ? 'image/png' : 'image/jpeg'
    c.toBlob((blob) => {
      if (!blob) return
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${img.name}-${cw}x${ch}-${fit}.${type === 'image/png' ? 'png' : 'jpg'}`
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    }, type, 0.92)
  }

  const copyBtn = (text: string, id: string, onBlue = false) => (
    <button
      onClick={() => copy(text, id)}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium tabular-nums transition-colors ${
        onBlue ? 'bg-white/15 hover:bg-white/25 text-white' : 'bg-soft hover:bg-subtle text-body'
      }`}
    >
      {text}
      {copiedId === id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5 opacity-70" />}
    </button>
  )

  const orientation = w > h ? 'landscape' : h > w ? 'portrait' : 'square'
  const ladder = valid ? resolutionLadder(w / h) : []
  const zoneVals = is916 && zone !== 'none' ? SAFE_ZONES[zone] : null
  const raw = (k: string) => {
    const v = t.raw(k)
    return Array.isArray(v) ? v : []
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <div className="lg:col-span-1 space-y-6">
          <div className="ui-card p-6 space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="ar-w" className="block text-sm font-medium text-body mb-2">{t('width')}</label>
                <input id="ar-w" type="number" inputMode="numeric" min="1" value={width}
                  onChange={(e) => onWidth(e.target.value)} placeholder={t('widthPlaceholder')}
                  className="ui-field w-full px-4 py-3 tabular-nums" />
              </div>
              <div>
                <label htmlFor="ar-h" className="block text-sm font-medium text-body mb-2">{t('height')}</label>
                <input id="ar-h" type="number" inputMode="numeric" min="1" value={height}
                  onChange={(e) => onHeight(e.target.value)} placeholder={t('heightPlaceholder')}
                  className="ui-field w-full px-4 py-3 tabular-nums" />
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => { setWidth(height); setHeight(width); if (lockedRatio) setLockedRatio(1 / lockedRatio) }}
                className="flex-1 inline-flex items-center justify-center gap-2 ui-btn-soft px-3 py-2 text-sm">
                <ArrowLeftRight className="w-4 h-4" />{t('swap')}
              </button>
              <button onClick={() => setLockedRatio(lockedRatio ? null : valid ? w / h : null)}
                aria-pressed={!!lockedRatio}
                className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${lockedRatio ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}>
                {lockedRatio ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                {lockedRatio ? t('unlockRatio') : t('lockRatio')}
              </button>
            </div>
            {lockedRatio && <p className="text-xs text-muted -mt-2">{t('lockHint')}</p>}

            <div>
              <h3 className="text-sm font-medium text-body mb-2">{t('ratioPick.title')}</h3>
              <div className="grid grid-cols-4 gap-2">
                {RATIO_CHIPS.map((r) => {
                  const val = parseRatio(r)!
                  const on = valid && Math.abs(w / h - val) / val < 0.003
                  return (
                    <button key={r} onClick={() => applyRatio(val)} className={`${seg(on)} tabular-nums`}>{r}</button>
                  )
                })}
              </div>
              <div className="flex gap-2 mt-2">
                <input value={customRatio} onChange={(e) => setCustomRatio(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && customParsed) applyRatio(customParsed) }}
                  placeholder={t('ratioPick.customPlaceholder')} aria-label={t('ratioPick.custom')}
                  className="ui-field flex-1 min-w-0 px-3 py-2 text-sm" />
                <button disabled={!customParsed} onClick={() => customParsed && applyRatio(customParsed)}
                  className="ui-btn px-4 py-2 text-sm disabled:opacity-40">{t('ratioPick.apply')}</button>
              </div>
              <p className="text-xs text-muted mt-2">{t('ratioPick.hint')}</p>
            </div>
          </div>

          <div className="ui-card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-fg">{t('presets.title')}</h2>
            {PRESET_GROUPS.map((g) => (
              <div key={g.key}>
                <h3 className="text-xs font-medium text-muted mb-2">{t(`platforms.groups.${g.key}`)}</h3>
                <div className="flex flex-wrap gap-2">
                  {g.items.map(([k, pw, ph]) => {
                    const on = w === pw && h === ph
                    return (
                      <button key={k} onClick={() => { setSize(pw, ph); if (k === 'shorts' && zone === 'none') setZone('shorts') }}
                        className={`px-3 py-2 rounded-lg text-sm text-left transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}>
                        <span className="font-medium">{t(`platforms.items.${k}`)}</span>
                        <span className={`block text-xs tabular-nums ${on ? 'text-white/80' : 'text-muted'}`}>{pw}×{ph}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 space-y-6">
          {valid ? (
            <div className="ui-hero p-6">
              <div className="text-sm text-white/70 tabular-nums">{t('hero.label', { w, h })}</div>
              <div className="text-5xl font-bold tabular-nums mt-1">{ratioStr}</div>
              {near && !near.exact && (
                <div className="text-sm text-white/85 mt-1">{t('hero.near', { ratio: near.label })}</div>
              )}
              <div className="grid grid-cols-3 gap-4 mt-5 pt-4 border-t border-white/20">
                <div>
                  <div className="text-xs text-white/70">{t('result.decimal')}</div>
                  <div className="text-lg font-semibold tabular-nums">{(w / h).toFixed(4)}</div>
                </div>
                <div>
                  <div className="text-xs text-white/70">{t('result.megapixels')}</div>
                  <div className="text-lg font-semibold tabular-nums">{((w * h) / 1e6).toFixed(2)} MP</div>
                </div>
                <div>
                  <div className="text-xs text-white/70">{t('result.orientation')}</div>
                  <div className="text-lg font-semibold">{t(`result.${orientation}`)}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {copyBtn(`${w}×${h}`, 'size', true)}
                {copyBtn(ratioStr, 'ratio', true)}
                {copyBtn(`aspect-ratio: ${rw} / ${rh};`, 'css', true)}
              </div>
            </div>
          ) : (
            <div className="ui-card p-6 text-center text-muted">{t('invalid')}</div>
          )}

          {valid && (
            <ShareResult
              card={{
                tool: t('title'),
                label: t('hero.label', { w, h }),
                headline: ratioStr,
                sub: near && !near.exact ? t('hero.near', { ratio: near.label }) : undefined,
                rows: [
                  { label: t('result.decimal'), value: (w / h).toFixed(4) },
                  { label: t('result.megapixels'), value: `${((w * h) / 1e6).toFixed(2)} MP` },
                  { label: 'CSS', value: `aspect-ratio: ${rw} / ${rh}` },
                ],
              }}
              text={t('shareText', { w, h, ratio: ratioStr })}
              fileName={`aspect-ratio-${w}x${h}`}
            />
          )}

          {/* 미리보기 + 내 이미지 */}
          {valid && (
            <div className="ui-card p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <h2 className="text-lg font-semibold text-fg">{t('preview.title')}</h2>
                {is916 && (
                  <div className="flex gap-1" role="group" aria-label={t('preview.safeZone')}>
                    {(['none', 'shorts', 'reels'] as const).map((z) => (
                      <button key={z} onClick={() => setZone(z)} className={seg(zone === z)}>{t(`preview.zone.${z}`)}</button>
                    ))}
                  </div>
                )}
              </div>

              <div
                className={`bg-subtle rounded-2xl p-6 flex items-center justify-center min-h-[368px] transition-colors ${dragOver ? 'ring-2 ring-primary' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); loadFile(e.dataTransfer.files[0]) }}
              >
                <div className="relative border-2 border-primary rounded-md overflow-hidden"
                  style={{ width: box.bw, height: box.bh, background: img && fit === 'pad' ? padColor : undefined }}>
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img.url} alt="" className="w-full h-full" style={{ objectFit: fit === 'crop' ? 'cover' : 'contain' }} />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-primary font-semibold tabular-nums text-center px-2">
                      <span>{ratioStr}</span>
                      <span className="text-xs text-muted font-normal">{w}×{h}</span>
                    </div>
                  )}
                  {zoneVals && (
                    <>
                      <div className="absolute inset-x-0 top-0 bg-black/45" style={{ height: `${zoneVals[0] * 100}%` }} />
                      <div className="absolute inset-x-0 bottom-0 bg-black/45" style={{ height: `${zoneVals[1] * 100}%` }} />
                      <div className="absolute left-0 bg-black/45" style={{ top: `${zoneVals[0] * 100}%`, bottom: `${zoneVals[1] * 100}%`, width: `${zoneVals[2] * 100}%` }} />
                      <div className="absolute right-0 bg-black/45" style={{ top: `${zoneVals[0] * 100}%`, bottom: `${zoneVals[1] * 100}%`, width: `${zoneVals[3] * 100}%` }} />
                      <div className="absolute border border-dashed border-white"
                        style={{ top: `${zoneVals[0] * 100}%`, bottom: `${zoneVals[1] * 100}%`, left: `${zoneVals[2] * 100}%`, right: `${zoneVals[3] * 100}%` }} />
                    </>
                  )}
                </div>
              </div>
              {zoneVals && (
                <p className="text-xs text-muted mt-2">
                  {t(`preview.zoneNote.${zone}`, {
                    safeW: Math.round(w * (1 - zoneVals[2] - zoneVals[3])),
                    safeH: Math.round(h * (1 - zoneVals[0] - zoneVals[1])),
                  })}
                </p>
              )}

              {/* 내 이미지 넣기 */}
              <div className="mt-5 pt-5 border-t border-line space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-fg">{t('image.title')}</h3>
                    <p className="text-xs text-muted">{t('image.hint')}</p>
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => loadFile(e.target.files?.[0])} />
                  <div className="flex gap-2">
                    <button onClick={() => fileRef.current?.click()} className="ui-btn-soft inline-flex items-center gap-1.5 px-4 py-2 text-sm">
                      <Upload className="w-4 h-4" />{img ? t('image.change') : t('image.pick')}
                    </button>
                    {img && (
                      <button onClick={clearImg} aria-label={t('image.remove')} className="ui-btn-soft px-3 py-2 text-sm">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {img && fitInfo && (
                  <>
                    <div className="bg-subtle rounded-2xl p-4 text-sm text-sub space-y-1 tabular-nums">
                      <div>
                        {t('image.source', { w: img.w, h: img.h, ratio: reduceRatio(img.w, img.h).join(':') })}
                        {' '}
                        <button onClick={() => setSize(img.w, img.h)} className="text-primary font-medium hover:underline">{t('image.useSize')}</button>
                      </div>
                      <div>
                        {fitInfo.cutPct < 0.05
                          ? t('image.sameRatio')
                          : fit === 'crop'
                            ? t(img.w / img.h > w / h ? 'image.cropSides' : 'image.cropTopBottom', { pct: fitInfo.cutPct.toFixed(1) })
                            : t(img.w / img.h > w / h ? 'image.padTopBottom' : 'image.padSides')}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex gap-1">
                        <button onClick={() => setFit('crop')} className={seg(fit === 'crop')}>{t('image.crop')}</button>
                        <button onClick={() => setFit('pad')} className={seg(fit === 'pad')}>{t('image.pad')}</button>
                      </div>
                      {fit === 'pad' && (
                        <div className="flex gap-1">
                          <button onClick={() => setPadColor('#000000')} className={seg(padColor === '#000000')}>{t('image.black')}</button>
                          <button onClick={() => setPadColor('#ffffff')} className={seg(padColor === '#ffffff')}>{t('image.white')}</button>
                        </div>
                      )}
                      <button onClick={download} className="ui-btn inline-flex items-center gap-1.5 px-4 py-2 text-sm ml-auto">
                        <Download className="w-4 h-4" />{t('image.download', { w: outW, h: outH })}
                      </button>
                    </div>
                    <p className="text-xs text-muted">{t('image.privacy')}</p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* 해상도 표 */}
          {valid && (
            <div className="ui-card p-6">
              <h2 className="text-lg font-semibold text-fg">{t('table.title', { ratio: ratioStr })}</h2>
              <p className="text-xs text-muted mt-1 mb-4">{t('table.hint')}</p>
              <div className="divide-y divide-line">
                {ladder.map((r) => {
                  const on = r.w === w && r.h === h
                  return (
                    <div key={r.short} className={`flex items-center gap-3 py-2.5 px-2 rounded-lg ${on ? 'bg-primary-soft' : ''}`}>
                      <div className="w-24 shrink-0">
                        <div className={`text-sm font-semibold ${on ? 'text-primary' : 'text-fg'}`}>{r.short}p</div>
                        <div className="text-xs text-muted">{LADDER_NAMES[r.short]}</div>
                      </div>
                      <button onClick={() => setSize(r.w, r.h)}
                        className={`flex-1 text-left text-base font-semibold tabular-nums hover:underline ${on ? 'text-primary' : 'text-fg'}`}>
                        {r.exact ? '' : '≈ '}{r.w} × {r.h}
                      </button>
                      {copyBtn(`${r.w}×${r.h}`, `row${r.short}`)}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 비율 유지 리사이즈 */}
          {valid && (
            <div className="ui-card p-6">
              <h2 className="text-lg font-semibold text-fg mb-4">{t('resizer.title')}</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="ar-tw" className="block text-sm font-medium text-body mb-2">{t('resizer.targetWidth')}</label>
                  <input id="ar-tw" type="number" inputMode="numeric" min="1" value={targetWidth}
                    onChange={(e) => { setTargetWidth(e.target.value); setTargetHeight('') }}
                    placeholder="1280" className="ui-field w-full px-4 py-3 tabular-nums" />
                </div>
                <div>
                  <label htmlFor="ar-th" className="block text-sm font-medium text-body mb-2">{t('resizer.targetHeight')}</label>
                  <input id="ar-th" type="number" inputMode="numeric" min="1" value={targetHeight}
                    onChange={(e) => { setTargetHeight(e.target.value); setTargetWidth('') }}
                    placeholder="720" className="ui-field w-full px-4 py-3 tabular-nums" />
                </div>
              </div>
              {resizer && (
                <div className="mt-4 bg-subtle rounded-2xl p-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm text-sub">{t('resizer.resultSize')}</div>
                    <div className="text-2xl font-bold text-fg tabular-nums">{resizer.width} × {resizer.height}</div>
                  </div>
                  {copyBtn(`${resizer.width}×${resizer.height}`, 'resize')}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 가이드 */}
      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        <div>
          <h3 className="text-lg font-semibold text-fg mb-2">{t('guide.whatIs.title')}</h3>
          <p className="text-body leading-relaxed">{t('guide.whatIs.description')}</p>
        </div>
        {(['howToUse', 'common', 'tips'] as const).map((sec) => (
          <div key={sec}>
            <h3 className="text-lg font-semibold text-fg mb-2">{t(`guide.${sec}.title`)}</h3>
            <ul className="space-y-1.5 list-disc pl-5 text-body">
              {(raw(`guide.${sec}.items`) as string[]).map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </div>
        ))}
        <div>
          <h3 className="text-lg font-semibold text-fg mb-2">{t('guide.faq.title')}</h3>
          <div className="space-y-3">
            {(raw('guide.faq.items') as { q: string; a: string }[]).map((f, i) => (
              <details key={i} className="bg-subtle rounded-2xl p-4">
                <summary className="font-medium text-fg cursor-pointer">{f.q}</summary>
                <p className="text-sub mt-2 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
