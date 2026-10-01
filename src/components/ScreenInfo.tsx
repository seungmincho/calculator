'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useTranslations } from '@/lib/i18n'
import { Copy, Check, RefreshCw, Braces } from 'lucide-react'
import ShareResult from '@/components/ShareResult'
import {
  physicalPx, ppiCalc, BREAKPOINTS, activeBreakpoint, resolutionName, estimateHz, ratioLabel,
  DEVICE_REFERENCE, type BreakpointSystem,
} from '@/utils/screenInfo'

interface Snapshot {
  screenWidth: number
  screenHeight: number
  availWidth: number
  availHeight: number
  viewportWidth: number
  viewportHeight: number
  dpr: number
  colorDepth: number
  orientation: 'portrait' | 'landscape'
  extendedDisplay: boolean | null
  hdr: boolean
  colorGamut: 'srgb' | 'p3' | 'rec2020' | null
  colorScheme: 'light' | 'dark'
  reducedMotion: boolean
  pointer: 'fine' | 'coarse' | 'none'
  hover: boolean
  maxTouchPoints: number
  userAgent: string
  language: string
  languages: string
  platform: string
  cpuCores: number | null
  memoryGB: number | null
  network: string | null
  cookieEnabled: boolean
  onLine: boolean
}

function readSnapshot(): Snapshot {
  const s = window.screen
  const mq = (q: string) => window.matchMedia(q).matches
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { effectiveType?: string } }
  const oType = s.orientation?.type
  return {
    screenWidth: s.width,
    screenHeight: s.height,
    availWidth: s.availWidth,
    availHeight: s.availHeight,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    dpr: window.devicePixelRatio || 1,
    colorDepth: s.colorDepth,
    orientation: oType ? (oType.startsWith('portrait') ? 'portrait' : 'landscape') : (s.width >= s.height ? 'landscape' : 'portrait'),
    // Window Management API: 권한 요청 없이 읽을 수 있는 boolean만 사용
    extendedDisplay: 'isExtended' in s ? Boolean((s as Screen & { isExtended?: boolean }).isExtended) : null,
    hdr: mq('(dynamic-range: high)'),
    colorGamut: mq('(color-gamut: rec2020)') ? 'rec2020' : mq('(color-gamut: p3)') ? 'p3' : mq('(color-gamut: srgb)') ? 'srgb' : null,
    colorScheme: mq('(prefers-color-scheme: dark)') ? 'dark' : 'light',
    reducedMotion: mq('(prefers-reduced-motion: reduce)'),
    pointer: mq('(pointer: coarse)') ? 'coarse' : mq('(pointer: fine)') ? 'fine' : 'none',
    hover: mq('(hover: hover)'),
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    userAgent: navigator.userAgent,
    language: navigator.language,
    languages: (navigator.languages ?? []).join(', '),
    platform: navigator.platform,
    cpuCores: navigator.hardwareConcurrency || null,
    memoryGB: nav.deviceMemory ?? null,
    network: nav.connection?.effectiveType ?? null,
    cookieEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine,
  }
}

const GAMUT_LABEL = { srgb: 'sRGB', p3: 'Display P3', rec2020: 'Rec.2020' } as const
const DIAG_PRESETS = [6.1, 6.7, 11, 13.3, 14, 15.6, 24, 27, 32]
const fmtDpr = (d: number) => String(+d.toFixed(3))
const x = (w: number, h: number) => `${w} × ${h}`

export default function ScreenInfo() {
  const t = useTranslations('screenInfo')
  const [snap, setSnap] = useState<Snapshot | null>(null)
  const [hz, setHz] = useState<number | null | 'measuring' | undefined>(undefined)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const rafRef = useRef(0)

  // PPI 계산기 (예시 기본값 → 첫 화면에 결과 표시)
  const [pw, setPw] = useState('1920')
  const [ph, setPh] = useState('1080')
  const [diag, setDiag] = useState('24')

  const refresh = useCallback(() => setSnap(readSnapshot()), [])

  const measureHz = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    setHz('measuring')
    const deltas: number[] = []
    let last = 0
    const step = (ts: number) => {
      if (last) deltas.push(ts - last)
      last = ts
      if (deltas.length < 90) rafRef.current = requestAnimationFrame(step)
      else setHz(estimateHz(deltas))
    }
    rafRef.current = requestAnimationFrame(step)
  }, [])

  useEffect(() => {
    refresh()
    measureHz()
    const o = window.screen.orientation
    window.addEventListener('resize', refresh)
    o?.addEventListener?.('change', refresh)
    return () => {
      window.removeEventListener('resize', refresh)
      o?.removeEventListener?.('change', refresh)
      cancelAnimationFrame(rafRef.current)
    }
  }, [refresh, measureHz])

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
    } catch { /* 권한 없음: 무시 */ }
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  // 파생 값
  const physW = snap ? physicalPx(snap.screenWidth, snap.dpr) : 0
  const physH = snap ? physicalPx(snap.screenHeight, snap.dpr) : 0
  const resName = snap ? resolutionName(physW, physH) : null
  const ratio = snap ? ratioLabel(snap.screenWidth, snap.screenHeight) : '—'
  const hzText = hz === 'measuring' ? t('display.measuring') : typeof hz === 'number' ? `${hz} Hz` : hz === null ? t('common.unknown') : '—'
  const yn = (b: boolean | null) => (b === null ? t('common.unknown') : b ? t('common.yes') : t('common.no'))

  const sections = useMemo(() => {
    if (!snap) return null
    return [
      {
        id: 'screen', title: t('screen.title'), rows: [
          [t('screen.resolution'), x(snap.screenWidth, snap.screenHeight)],
          [t('screen.physical'), `${x(physW, physH)}${resName ? ` (${resName})` : ''}`],
          [t('screen.viewport'), x(snap.viewportWidth, snap.viewportHeight)],
          [t('screen.availableSize'), x(snap.availWidth, snap.availHeight)],
          [t('screen.pixelRatio'), `${fmtDpr(snap.dpr)}x`],
          [t('screen.aspectRatio'), ratio],
          [t('screen.orientation'), t(`screen.${snap.orientation}`)],
          [t('screen.colorDepth'), `${snap.colorDepth}-bit`],
          [t('screen.extended'), yn(snap.extendedDisplay)],
        ],
      },
      {
        id: 'display', title: t('display.title'), rows: [
          [t('display.refreshRate'), hzText],
          [t('display.hdr'), yn(snap.hdr)],
          [t('display.gamut'), snap.colorGamut ? GAMUT_LABEL[snap.colorGamut] : t('common.unknown')],
          [t('display.colorScheme'), t(`display.scheme.${snap.colorScheme}`)],
          [t('display.reducedMotion'), yn(snap.reducedMotion)],
          [t('display.pointer'), t(`display.pointerType.${snap.pointer}`)],
          [t('display.hover'), yn(snap.hover)],
          [t('device.maxTouchPoints'), String(snap.maxTouchPoints)],
        ],
      },
      {
        id: 'browser', title: t('browser.title'), rows: [
          [t('browser.userAgent'), snap.userAgent],
          [t('browser.language'), snap.language],
          [t('browser.languages'), snap.languages],
          [t('browser.cookiesEnabled'), yn(snap.cookieEnabled)],
          [t('browser.online'), yn(snap.onLine)],
        ],
      },
      {
        id: 'device', title: t('device.title'), rows: [
          [t('device.platform'), snap.platform || t('common.unknown')],
          [t('device.cores'), snap.cpuCores ? String(snap.cpuCores) : t('common.unknown')],
          [t('device.memory'), snap.memoryGB ? `${snap.memoryGB} GB` : t('common.unknown')],
          [t('device.connection'), snap.network ?? t('common.unknown')],
        ],
      },
    ] as { id: string; title: string; rows: [string, string][] }[]
  }, [snap, physW, physH, resName, ratio, hzText, t]) // eslint-disable-line react-hooks/exhaustive-deps

  const bp = (sys: BreakpointSystem) => (snap ? activeBreakpoint(snap.viewportWidth, sys) : null)

  const copyText = () => {
    if (!sections) return
    const lines = sections.flatMap(s => [`[${s.title}]`, ...s.rows.map(([k, v]) => `${k}: ${v}`), ''])
    lines.push(`[${t('breakpoints.title')}]`, `Tailwind: ${bp('tailwind')}`, `Bootstrap: ${bp('bootstrap')}`)
    copy(lines.join('\n'), 'text')
  }
  const copyJson = () => {
    if (!snap) return
    copy(JSON.stringify({
      ...snap,
      physicalWidthEstimate: physW,
      physicalHeightEstimate: physH,
      aspectRatio: ratio,
      refreshRateEstimateHz: typeof hz === 'number' ? hz : null,
      breakpoints: { tailwind: bp('tailwind'), bootstrap: bp('bootstrap') },
    }, null, 2), 'json')
  }

  const ppi = ppiCalc(Number(pw), Number(ph), Number(diag))
  const isMine = (w: number, h: number) =>
    !!snap && ((w === snap.screenWidth && h === snap.screenHeight) || (h === snap.screenWidth && w === snap.screenHeight))

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      {/* 핵심 답 */}
      <div className="space-y-3">
        <div className="ui-hero p-6">
          <div className="text-sm text-white/70">{t('hero.label')}</div>
          <div className="text-4xl sm:text-5xl font-bold tabular-nums mt-1">
            {snap ? x(snap.screenWidth, snap.screenHeight) : '— × —'}
          </div>
          <div className="text-sm text-white/85 mt-2 tabular-nums">
            {snap ? t('hero.physical', { w: physW, h: physH, dpr: fmtDpr(snap.dpr) }) : t('hero.loading')}
            {resName && <span className="ml-1">({resName})</span>}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-4 border-t border-white/20">
            {[
              [t('hero.viewport'), snap ? x(snap.viewportWidth, snap.viewportHeight) : '—'],
              [t('hero.dpr'), snap ? `${fmtDpr(snap.dpr)}x` : '—'],
              [t('hero.ratio'), ratio],
              [t('hero.refresh'), hzText],
            ].map(([k, v]) => (
              <div key={k} className="min-w-0">
                <div className="text-xs text-white/70">{k}</div>
                <div className="text-lg font-semibold tabular-nums truncate">{v}</div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted">{t('hero.zoomNote')}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={copyText} disabled={!snap} className="ui-btn px-4 py-2.5 text-sm">
          {copiedId === 'text' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copiedId === 'text' ? t('common.copied') : t('common.copyAll')}
        </button>
        <button onClick={copyJson} disabled={!snap} className="ui-btn-soft px-4 py-2.5 text-sm inline-flex items-center gap-2">
          {copiedId === 'json' ? <Check className="w-4 h-4 text-primary" /> : <Braces className="w-4 h-4" />}
          {copiedId === 'json' ? t('common.copied') : t('actions.copyJson')}
        </button>
        <button onClick={() => { refresh(); measureHz() }} className="ui-btn-soft px-4 py-2.5 text-sm inline-flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          {t('common.refresh')}
        </button>
      </div>

      {snap && (
        <ShareResult
          fileName="screen-info"
          text={t('share.text', { res: x(snap.screenWidth, snap.screenHeight), vp: x(snap.viewportWidth, snap.viewportHeight), dpr: fmtDpr(snap.dpr) })}
          card={{
            tool: t('title'),
            label: t('hero.label'),
            headline: x(snap.screenWidth, snap.screenHeight),
            sub: t('hero.physical', { w: physW, h: physH, dpr: fmtDpr(snap.dpr) }),
            rows: [
              { label: t('hero.viewport'), value: x(snap.viewportWidth, snap.viewportHeight) },
              { label: t('hero.ratio'), value: ratio },
              { label: t('hero.refresh'), value: hzText },
              { label: t('display.gamut'), value: snap.colorGamut ? GAMUT_LABEL[snap.colorGamut] : t('common.unknown') },
            ],
          }}
        />
      )}

      {/* 반응형 브레이크포인트 */}
      <div className="ui-card p-6">
        <h2 className="text-lg font-semibold text-fg">{t('breakpoints.title')}</h2>
        <p className="text-sm text-muted mt-1">{t('breakpoints.desc', { w: snap ? snap.viewportWidth : '—' })}</p>
        <div className="space-y-4 mt-4">
          {(Object.keys(BREAKPOINTS) as BreakpointSystem[]).map(sys => {
            const active = bp(sys)
            const list: (readonly [string, number])[] = [[sys === 'tailwind' ? 'base' : 'xs', 0], ...BREAKPOINTS[sys]]
            return (
              <div key={sys}>
                <div className="text-sm text-sub mb-2">{t(`breakpoints.${sys}`)}</div>
                <div className="flex flex-wrap gap-2">
                  {list.map(([name, min]) => (
                    <span
                      key={name}
                      className={`px-3 py-1.5 rounded-lg text-sm tabular-nums ${active === name ? 'bg-primary text-white font-semibold' : 'bg-soft text-body'}`}
                    >
                      {name} <span className={active === name ? 'text-white/70' : 'text-faint'}>≥{min}</span>
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 상세 정보 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(sections ?? [
          { id: 'screen', title: t('screen.title'), rows: [] },
          { id: 'display', title: t('display.title'), rows: [] },
        ]).map(sec => (
          <div key={sec.id} className="ui-card p-6">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="text-lg font-semibold text-fg">{sec.title}</h2>
              {sec.id === 'display' && (
                <button onClick={measureHz} className="ui-btn-soft px-3 py-1.5 text-xs">{t('display.remeasure')}</button>
              )}
            </div>
            {sec.rows.length === 0 && <div className="text-sm text-faint py-2">{t('hero.loading')}</div>}
            {sec.rows.map(([label, value], i) => {
              const id = `${sec.id}-${i}`
              return (
                <div key={id} className="flex items-center justify-between gap-3 py-2 border-b border-line last:border-0">
                  <span className="text-sm text-sub shrink-0">{label}</span>
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="text-sm font-medium text-fg truncate tabular-nums" title={value}>{value}</span>
                    <button
                      onClick={() => copy(value, id)}
                      className="p-1 rounded hover:bg-soft shrink-0"
                      aria-label={`${t('common.copy')} ${label}`}
                    >
                      {copiedId === id ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5 text-faint" />}
                    </button>
                  </div>
                </div>
              )
            })}
            {sec.id === 'display' && <p className="text-xs text-muted mt-3">{t('display.hzNote')}</p>}
          </div>
        ))}
      </div>

      {/* PPI 계산기 */}
      <div className="ui-card p-6">
        <h2 className="text-lg font-semibold text-fg">{t('ppi.title')}</h2>
        <p className="text-sm text-muted mt-1">{t('ppi.desc')}</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-5">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm text-body">{t('ppi.width')}</span>
                <input type="number" inputMode="numeric" min={1} value={pw} onChange={e => setPw(e.target.value)} className="ui-field px-4 py-3 w-full mt-1 tabular-nums" />
              </label>
              <label className="block">
                <span className="text-sm text-body">{t('ppi.height')}</span>
                <input type="number" inputMode="numeric" min={1} value={ph} onChange={e => setPh(e.target.value)} className="ui-field px-4 py-3 w-full mt-1 tabular-nums" />
              </label>
            </div>
            <label className="block">
              <span className="text-sm text-body">{t('ppi.diagonal')}</span>
              <input type="number" inputMode="decimal" min={0.1} step={0.1} value={diag} onChange={e => setDiag(e.target.value)} className="ui-field px-4 py-3 w-full mt-1 tabular-nums" />
            </label>
            <div className="flex flex-wrap gap-2">
              {DIAG_PRESETS.map(d => (
                <button
                  key={d}
                  onClick={() => setDiag(String(d))}
                  className={`px-3 py-1.5 rounded-lg text-sm tabular-nums ${Number(diag) === d ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}
                >
                  {d}&quot;
                </button>
              ))}
            </div>
            {snap && (
              <button
                onClick={() => { setPw(String(Math.max(physW, physH))); setPh(String(Math.min(physW, physH))) }}
                className="ui-btn-soft px-4 py-2 text-sm"
              >
                {t('ppi.useMine', { w: Math.max(physW, physH), h: Math.min(physW, physH) })}
              </button>
            )}
          </div>
          <div className="bg-subtle rounded-2xl p-5">
            {ppi ? (
              <>
                <div className="text-sm text-sub">{t('ppi.ppi')}</div>
                <div className="text-3xl font-bold text-fg tabular-nums">{ppi.ppi.toFixed(1)} PPI</div>
                <dl className="mt-4 space-y-2 text-sm">
                  {[
                    [t('ppi.dotPitch'), `${ppi.dotPitchMm.toFixed(3)} mm`],
                    [t('ppi.size'), `${ppi.widthCm.toFixed(1)} × ${ppi.heightCm.toFixed(1)} cm`],
                    [t('ppi.ratio'), ratioLabel(Number(pw), Number(ph))],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3">
                      <dt className="text-sub">{k}</dt>
                      <dd className="font-medium text-fg tabular-nums">{v}</dd>
                    </div>
                  ))}
                </dl>
              </>
            ) : (
              <div className="text-sm text-muted">{t('ppi.invalid')}</div>
            )}
            <p className="text-xs text-muted mt-4">{t('ppi.note')}</p>
          </div>
        </div>
      </div>

      {/* 기기별 해상도 참고표 */}
      <div className="ui-card p-6">
        <h2 className="text-lg font-semibold text-fg">{t('ref.title')}</h2>
        <p className="text-sm text-muted mt-1">{t('ref.desc')}</p>
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="text-left text-sub border-b border-line">
                <th className="py-2 pr-3 font-medium">{t('ref.device')}</th>
                <th className="py-2 pr-3 font-medium">{t('ref.viewport')}</th>
                <th className="py-2 pr-3 font-medium">DPR</th>
                <th className="py-2 font-medium">{t('ref.physical')}</th>
              </tr>
            </thead>
            <tbody>
              {DEVICE_REFERENCE.map(d => {
                const mine = isMine(d.css[0], d.css[1])
                return (
                  <tr key={d.name + d.dpr} className={`border-b border-line last:border-0 ${mine ? 'bg-primary-soft' : ''}`}>
                    <td className="py-2 pr-3 text-fg">
                      {d.name} <span className="text-faint">· {t(`ref.kind.${d.kind}`)}</span>
                      {mine && <span className="ml-2 text-xs font-semibold text-primary">{t('ref.mine')}</span>}
                    </td>
                    <td className="py-2 pr-3 tabular-nums text-body">{x(d.css[0], d.css[1])}</td>
                    <td className="py-2 pr-3 tabular-nums text-body">{d.dpr}x</td>
                    <td className="py-2 tabular-nums text-body">{x(physicalPx(d.css[0], d.dpr), physicalPx(d.css[1], d.dpr))}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 가이드 */}
      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        <div>
          <h3 className="text-base font-bold text-fg mb-2">{t('guide.whatIs.title')}</h3>
          <p className="text-body leading-relaxed">{t('guide.whatIs.description')}</p>
        </div>
        <div>
          <h3 className="text-base font-bold text-fg mb-2">{t('guide.terms.title')}</h3>
          <ul className="space-y-2 text-body">
            {(t.raw('guide.terms.items') as string[]).map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </div>
        <div>
          <h3 className="text-base font-bold text-fg mb-2">{t('guide.howToUse.title')}</h3>
          <ol className="space-y-2 text-body">
            {(t.raw('guide.howToUse.items') as string[]).map((item, i) => <li key={i}>{item}</li>)}
          </ol>
        </div>
        <div>
          <h3 className="text-base font-bold text-fg mb-2">{t('guide.tips.title')}</h3>
          <ul className="space-y-2 text-body list-disc pl-5">
            {(t.raw('guide.tips.items') as string[]).map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </div>
        <div>
          <h3 className="text-base font-bold text-fg mb-3">{t('guide.faq.title')}</h3>
          <div className="space-y-4">
            {(t.raw('guide.faq.items') as { q: string; a: string }[]).map((f, i) => (
              <div key={i}>
                <div className="font-semibold text-fg">{f.q}</div>
                <p className="text-body mt-1 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
