'use client'

import { useState, useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/aspectRatio'
import { useSearchParams } from '@/hooks/useSearchParams'
import { ArrowLeftRight, Lock, Unlock, Copy, Check } from 'lucide-react'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import { reduceRatio, nearestCommon, parseRatio, resolutionLadder } from '@/utils/aspectRatio'
import { useHydrated } from '@/hooks/useHydrated'
import { useOptionalLanguage } from '@/contexts/LanguageContext'
import AspectRatioImagePanel from '@/components/AspectRatioImagePanel'
import AspectCopyRecovery from '@/components/AspectCopyRecovery'
import { parseAspectPixels, parseAspectCustomRatio, isAspectDimension, readAspectQuery } from '@/utils/aspectRatioImage'
import { copyAspectText, createAspectRequestGuard } from '@/utils/aspectRatioActions'

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

const seg = (on: boolean) =>
  `min-h-11 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
export default function AspectRatio() {
  const t = useTranslations('aspectRatio'), language = useOptionalLanguage()?.language ?? 'ko'
  const sp = useSearchParams(), hydrated = useHydrated(), query = sp.toString()
  const [width, setWidth] = useState('1920'), [height, setHeight] = useState('1080')
  const [lockedRatio, setLockedRatio] = useState<number | null>(null), [customRatio, setCustomRatio] = useState('')
  const [zone, setZone] = useState<Zone>('none'), [targetWidth, setTargetWidth] = useState(''), [targetHeight, setTargetHeight] = useState('')
  const [ready, setReady] = useState(false), [inputRevision, setInputRevision] = useState(0)
  const [numericError, setNumericError] = useState<'ratioInvalid' | 'derivedInvalid' | null>(null)
  const edited = useRef(false), revision = useRef(0), mounted = useRef(false)
  const copyGuard = useRef(createAspectRequestGuard()), copyContextRef = useRef(''), copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [copyState, setCopyState] = useState<{ id: string; text: string; token: number; status: 'copying' | 'copied' | 'failed' } | null>(null)
  const [copyOwner, setCopyOwner] = useState('')
  const [shareRevision, setShareRevision] = useState(0)
  const invalidateCopy = useCallback((clearContext = true) => {
    copyGuard.current.invalidate(); if (clearContext) copyContextRef.current = ''
    if (copyTimer.current !== null) clearTimeout(copyTimer.current)
    copyTimer.current = null; setCopyState(null)
  }, [])
  const markEdited = useCallback(() => { edited.current = true; setInputRevision(++revision.current); invalidateCopy(); setNumericError(null) }, [invalidateCopy])
  useLayoutEffect(() => {
    mounted.current = true; const guard = createAspectRequestGuard(); copyGuard.current = guard
    return () => { mounted.current = false; guard.dispose(); if (copyTimer.current !== null) clearTimeout(copyTimer.current) }
  }, [])
  const isInputCurrent = useCallback((token: number) => mounted.current && revision.current === token, [])
  useEffect(() => {
    if (!hydrated || ready) return
    let active = true
    queueMicrotask(() => {
      if (!active) return
      if (!edited.current) {
        const restored = readAspectQuery(new URLSearchParams(query))
        setWidth(restored.width); setHeight(restored.height); setLockedRatio(restored.lockedRatio); setZone(restored.zone)
      }
      setReady(true)
    })
    return () => { active = false }
  }, [hydrated, ready, query])
  const w = parseAspectPixels(width) ?? 0, h = parseAspectPixels(height) ?? 0, valid = w > 0 && h > 0
  const [rw, rh] = reduceRatio(w, h), ratioStr = rw + ':' + rh, near = nearestCommon(w, h)
  const is916 = valid && rw === 9 && rh === 16
  useEffect(() => {
    if (!ready || !edited.current || !valid) return
    const token = inputRevision
    const id = setTimeout(() => {
      if (!isInputCurrent(token)) return
      const url = new URL(window.location.href)
      url.searchParams.set('w', String(w)); url.searchParams.set('h', String(h))
      if (lockedRatio !== null) url.searchParams.set('lock', '1'); else url.searchParams.delete('lock')
      if (zone !== 'none' && is916) url.searchParams.set('zone', zone); else url.searchParams.delete('zone')
      if (url.href !== window.location.href) window.history.replaceState(window.history.state, '', url.href)
    }, 300)
    return () => clearTimeout(id)
  }, [ready, valid, w, h, lockedRatio, zone, is916, inputRevision, isInputCurrent])
  const copyContext = JSON.stringify([width, height, customRatio, targetWidth, targetHeight, lockedRatio, zone, inputRevision, language, t('copyRecovery.failed'), ready])
  if (copyOwner !== copyContext) { setCopyOwner(copyContext); setCopyState(null) }
  useLayoutEffect(() => {
    copyGuard.current.invalidate(); copyContextRef.current = copyContext
    if (copyTimer.current !== null) clearTimeout(copyTimer.current)
    copyTimer.current = null
  }, [copyContext])
  const copy = async (text: string, id: string) => {
    if (!mounted.current || !ready || copyContextRef.current !== copyContext) return
    setShareRevision(value => value + 1)
    const guard = copyGuard.current, token = guard.begin()
    const current = () => mounted.current && copyGuard.current === guard && guard.isCurrent(token) && copyContextRef.current === copyContext
    if (copyTimer.current !== null) clearTimeout(copyTimer.current)
    copyTimer.current = null; setCopyState({ id, text, token, status: 'copying' })
    const result = await copyAspectText(text, current)
    if (!current() || result === 'stale') return
    setCopyState({ id, text, token, status: result })
    if (result === 'copied') copyTimer.current = setTimeout(() => { if (current()) { setCopyState(null); copyTimer.current = null } }, 2000)
  }
  const setSize = (nw: number, nh: number) => {
    if (!isAspectDimension(nw) || !isAspectDimension(nh)) { setNumericError('ratioInvalid'); return }
    markEdited(); setWidth(String(nw)); setHeight(String(nh)); if (lockedRatio) setLockedRatio(nw / nh)
  }
  const onWidth = (value: string) => {
    markEdited(); setWidth(value); const n = parseAspectPixels(value)
    if (lockedRatio && n !== null) { const other = Math.round(n / lockedRatio); setHeight(isAspectDimension(other) ? String(other) : ''); if (!isAspectDimension(other)) setNumericError('derivedInvalid') }
  }
  const onHeight = (value: string) => {
    markEdited(); setHeight(value); const n = parseAspectPixels(value)
    if (lockedRatio && n !== null) { const other = Math.round(n * lockedRatio); setWidth(isAspectDimension(other) ? String(other) : ''); if (!isAspectDimension(other)) setNumericError('derivedInvalid') }
  }
  const applyRatio = (r: number) => {
    const short = valid ? Math.min(w, h) : 1080
    const [nw, nh] = r >= 1 ? [Math.round(short * r), short] : [short, Math.round(short / r)]
    if (!isAspectDimension(nw) || !isAspectDimension(nh)) { setNumericError('ratioInvalid'); return }
    markEdited(); setWidth(String(nw)); setHeight(String(nh)); setLockedRatio(r)
  }
  const customParsed = parseAspectCustomRatio(customRatio)
  const resizer = (() => {
    if (!valid) return null
    const ratio = w / h, tw = parseAspectPixels(targetWidth), th = parseAspectPixels(targetHeight)
    const result = tw !== null ? { width: tw, height: Math.round(tw / ratio) } : th !== null ? { width: Math.round(th * ratio), height: th } : null
    return result && isAspectDimension(result.width) && isAspectDimension(result.height) ? result : null
  })()
  const copyBtn = (text: string, id: string, onBlue = false, disabled = false) => (
    <button type="button" data-aspect-copy={id} data-aspect-copied={copyState?.id === id && copyState.status === 'copied'}
      disabled={disabled || !ready || copyState?.id === id && copyState.status === 'copying'} onClick={() => { void copy(text, id) }}
      aria-label={t('copyRecovery.button', { text })}
      className={'inline-flex min-h-11 min-w-0 max-w-full items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium tabular-nums disabled:opacity-40 ' + (onBlue ? 'bg-white/15 text-white hover:bg-white/25' : 'bg-soft text-body hover:bg-subtle')}>
      <span className="min-w-0 break-all">{text}</span>{copyState?.id === id && copyState.status === 'copied' ? <Check className="h-3.5 w-3.5 shrink-0" /> : <Copy className="h-3.5 w-3.5 shrink-0 opacity-70" />}
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
    <div className="space-y-8" data-aspect-ready={ready}>
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      {copyState?.status === 'failed' && <AspectCopyRecovery key={copyState.token} text={copyState.text} busy={false}
        onRetry={() => { if (copyGuard.current.isCurrent(copyState.token)) void copy(copyState.text, copyState.id) }}
        onClose={() => { if (copyGuard.current.isCurrent(copyState.token)) invalidateCopy() }} />}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <div className="min-w-0 lg:col-span-1 space-y-6">
          <div className="ui-card p-6 space-y-5">
            {valid && <MobileResultLink href="#aspect-ratio-result" label={t('hero.label', { w, h })} value={ratioStr} />}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="ar-w" className="block text-sm font-medium text-body mb-2">{t('width')}</label>
                <input id="ar-w" type="text" inputMode="decimal" value={width}
                  onChange={(e) => onWidth(e.target.value)} placeholder={t('widthPlaceholder')}
                  className="ui-field w-full px-4 py-3 tabular-nums" />
              </div>
              <div>
                <label htmlFor="ar-h" className="block text-sm font-medium text-body mb-2">{t('height')}</label>
                <input id="ar-h" type="text" inputMode="decimal" value={height}
                  onChange={(e) => onHeight(e.target.value)} placeholder={t('heightPlaceholder')}
                  className="ui-field w-full px-4 py-3 tabular-nums" />
              </div>
            </div>

            <div className="flex gap-2">
              <button data-aspect-swap onClick={() => { markEdited(); setWidth(height); setHeight(width); if (lockedRatio) setLockedRatio(1 / lockedRatio) }}
                className="flex-1 inline-flex items-center justify-center gap-2 ui-btn-soft px-3 py-2 text-sm">
                <ArrowLeftRight className="w-4 h-4" />{t('swap')}
              </button>
              <button data-aspect-lock onClick={() => { markEdited(); setLockedRatio(lockedRatio ? null : valid ? w / h : null) }}
                aria-pressed={!!lockedRatio}
                className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${lockedRatio ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}>
                {lockedRatio ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                {lockedRatio ? t('unlockRatio') : t('lockRatio')}
              </button>
            </div>
            <p className="text-xs text-muted">{t('numberBounds.hint')}</p>
            {numericError && <p role="alert" data-aspect-number-error={numericError} className="text-sm text-body">{t('numberBounds.' + numericError)}</p>}
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
                <input data-aspect-custom-ratio value={customRatio} onChange={(e) => { markEdited(); setCustomRatio(e.target.value) }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && customParsed) applyRatio(customParsed) }}
                  placeholder={t('ratioPick.customPlaceholder')} aria-label={t('ratioPick.custom')}
                  className="ui-field min-h-11 flex-1 min-w-0 px-3 py-2 text-base" />
                <button data-aspect-apply-ratio disabled={!customParsed} onClick={() => customParsed && applyRatio(customParsed)}
                  className="ui-btn min-h-11 px-4 py-2 text-sm disabled:opacity-40">{t('ratioPick.apply')}</button>
              </div>
              {customRatio.trim() && customParsed === null && <p data-aspect-custom-error role="status" className="mt-2 text-sm text-body">{t('numberBounds.ratioInvalid')}</p>}
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
        <div className="min-w-0 lg:col-span-2 space-y-6">
          {valid ? (
            <div id="aspect-ratio-result" className="ui-hero p-6 scroll-mt-20">
              <div className="text-sm text-white/70 tabular-nums">{t('hero.label', { w, h })}</div>
              <div className="mt-1 break-all text-3xl font-bold tabular-nums sm:text-5xl">{ratioStr}</div>
              {near && !near.exact && (
                <div className="text-sm text-white/85 mt-1">{t('hero.near', { ratio: near.label })}</div>
              )}
              <div className="grid grid-cols-1 gap-4 mt-5 pt-4 border-t border-white/20 sm:grid-cols-3">
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
            <div id="aspect-ratio-result" className="ui-card scroll-mt-20 p-6 text-center text-muted">{t('numberBounds.invalid')}</div>
          )}

          {valid && (
            <div data-aspect-share-boundary onClickCapture={() => invalidateCopy(false)}><ShareResult
              resultKey={JSON.stringify([copyContext, shareRevision])}
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
            /></div>
          )}

          {/* The photo owner stays mounted while numeric edits are temporarily invalid. */}
          <div className="ui-card min-w-0 p-4 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-fg">{t('preview.title')}</h2>
              {is916 && <div className="flex flex-wrap gap-1" role="group" aria-label={t('preview.safeZone')}>
                {(['none', 'shorts', 'reels'] as const).map(value => <button type="button" key={value} data-aspect-zone={value} onClick={() => { if (zone !== value) { markEdited(); setZone(value) } }} className={seg(zone === value)}>{t('preview.zone.' + value)}</button>)}
              </div>}
            </div>
            <AspectRatioImagePanel width={w} height={h} ratioLabel={valid ? ratioStr : t('invalid')} inputRevision={inputRevision} isInputCurrent={isInputCurrent} onUseSize={setSize}
              overlay={zoneVals ? <>
                <div className="absolute inset-x-0 top-0 bg-black/45" style={{ height: zoneVals[0] * 100 + '%' }} />
                <div className="absolute inset-x-0 bottom-0 bg-black/45" style={{ height: zoneVals[1] * 100 + '%' }} />
                <div className="absolute left-0 bg-black/45" style={{ top: zoneVals[0] * 100 + '%', bottom: zoneVals[1] * 100 + '%', width: zoneVals[2] * 100 + '%' }} />
                <div className="absolute right-0 bg-black/45" style={{ top: zoneVals[0] * 100 + '%', bottom: zoneVals[1] * 100 + '%', width: zoneVals[3] * 100 + '%' }} />
                <div className="absolute border border-dashed border-white" style={{ top: zoneVals[0] * 100 + '%', bottom: zoneVals[1] * 100 + '%', left: zoneVals[2] * 100 + '%', right: zoneVals[3] * 100 + '%' }} />
              </> : undefined}
              zoneNote={zoneVals ? <p className="text-xs text-muted">{t('preview.zoneNote.' + zone, { safeW: Math.round(w * (1 - zoneVals[2] - zoneVals[3])), safeH: Math.round(h * (1 - zoneVals[0] - zoneVals[1])) })}</p> : undefined} />
          </div>

          {/* 해상도 표 */}
          {valid && (
            <div className="ui-card p-6">
              <h2 className="text-lg font-semibold text-fg">{t('table.title', { ratio: ratioStr })}</h2>
              <p className="text-xs text-muted mt-1 mb-4">{t('table.hint')}</p>
              <div className="divide-y divide-line">
                {ladder.map((r) => {
                  const on = r.w === w && r.h === h
                  const within = isAspectDimension(r.w) && isAspectDimension(r.h)
                  return (
                    <div key={r.short} className={`flex flex-wrap items-center gap-3 py-2.5 px-2 rounded-lg sm:flex-nowrap ${on ? 'bg-primary-soft' : ''}`}>
                      <div className="w-24 shrink-0">
                        <div className={`text-sm font-semibold ${on ? 'text-primary' : 'text-fg'}`}>{r.short}p</div>
                        <div className="text-xs text-muted">{LADDER_NAMES[r.short]}</div>
                      </div>
                      <button disabled={!within} title={!within ? t('numberBounds.rowUnavailable') : undefined} onClick={() => setSize(r.w, r.h)}
                        className={`min-h-11 min-w-0 flex-1 break-all text-left text-base font-semibold tabular-nums hover:underline disabled:opacity-40 ${on ? 'text-primary' : 'text-fg'}`}>
                        {r.exact ? '' : '≈ '}{r.w} × {r.h}
                      </button>
                      <div className="w-full min-w-0 sm:w-auto">{copyBtn(`${r.w}×${r.h}`, `row${r.short}`, false, !within)}</div>
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
                  <input id="ar-tw" type="text" inputMode="decimal" value={targetWidth}
                    onChange={(e) => { markEdited(); setTargetWidth(e.target.value); setTargetHeight('') }}
                    placeholder="1280" className="ui-field w-full px-4 py-3 tabular-nums" />
                </div>
                <div>
                  <label htmlFor="ar-th" className="block text-sm font-medium text-body mb-2">{t('resizer.targetHeight')}</label>
                  <input id="ar-th" type="text" inputMode="decimal" value={targetHeight}
                    onChange={(e) => { markEdited(); setTargetHeight(e.target.value); setTargetWidth('') }}
                    placeholder="720" className="ui-field w-full px-4 py-3 tabular-nums" />
                </div>
              </div>
              {(targetWidth || targetHeight) && !resizer && <p role="status" className="mt-3 text-sm text-body">{t('numberBounds.derivedInvalid')}</p>}
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
