'use client'

import { useState, useMemo, useEffect, useCallback, type ReactNode } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/screenCompare'
import { useSearchParams } from '@/hooks/useSearchParams'
import { Plus, Trash2, RotateCw } from 'lucide-react'
import ShareResult from '@/components/ShareResult'
import { resolutionName } from '@/utils/screenInfo'
import {
  screenGeom, screenRatioLabel, applyRatio, autoScale, pctMore, serializeScreens, parseScreens, layoutBoxes, findPreset,
  PRESETS, SCENARIOS, RATIOS, SCALES, type Align, type Kind, type Screen, type Geom,
} from '@/utils/screenCompare'

// 색만으로 구분하지 않도록 선 모양도 다르게
const STYLES = [
  { stroke: 'var(--primary)', dash: undefined },
  { stroke: 'var(--fg)', dash: '16 10' },
  { stroke: 'var(--muted)', dash: '4 8' },
  { stroke: 'var(--sub)', dash: '24 8 4 8' },
]
const LETTERS = ['A', 'B', 'C', 'D']
const KINDS: Kind[] = ['monitor', 'tv', 'laptop', 'tablet', 'phone']
const ALIGNS: Align[] = ['bl', 'center', 'side']
const DEFAULT = '27_2560_1440-32_3840_2160'

type Slot = { d: string; w: string; h: string; scale: number }
const toSlot = (s: Screen): Slot => ({ d: String(s.d), w: String(s.w), h: String(s.h), scale: s.scale })
const toScreen = (s: Slot): Screen => ({ d: parseFloat(s.d) || 0, w: parseInt(s.w) || 0, h: parseInt(s.h) || 0, scale: s.scale })

const nameOf = (s: { d: number; w: number; h: number }) => {
  const p = findPreset(s)
  if (p?.name) return p.name
  return `${s.d}" ${resolutionName(s.w, s.h) ?? `${s.w}×${s.h}`}${p?.kind === 'tv' ? ' TV' : ''}`
}
const signed = (p: number) => `${p >= 0 ? '+' : '−'}${Math.abs(Math.round(p))}%`
const cm = (n: number) => n.toFixed(1)
const dist = (c: number) => (c >= 100 ? `${(c / 100).toFixed(2)} m` : `${Math.round(c)} cm`)
const seg = (on: boolean) =>
  `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`

function Swatch({ i }: { i: number }) {
  return (
    <svg width="28" height="8" viewBox="0 0 28 8" aria-hidden="true" className="shrink-0">
      <line x1="0" y1="4" x2="28" y2="4" stroke={STYLES[i].stroke} strokeWidth="2.5"
        strokeDasharray={STYLES[i].dash ? STYLES[i].dash.split(' ').map(n => +n / 3).join(' ') : undefined} />
    </svg>
  )
}

export default function ScreenCompare() {
  const t = useTranslations('screenCompare')
  const sp = useSearchParams()
  const [slots, setSlots] = useState<Slot[]>(() => (parseScreens(sp.get('s')) ?? parseScreens(DEFAULT)!).map(toSlot))
  const [align, setAlign] = useState<Align>(() => {
    const v = sp.get('v') as Align
    return ALIGNS.includes(v) ? v : 'bl'
  })

  const screens = useMemo(() => slots.map(toScreen), [slots])
  const geoms = useMemo(() => screens.map(screenGeom), [screens])
  const valid = useMemo(
    () => screens.map((s, i) => ({ s, g: geoms[i], i })).filter((x): x is { s: Screen; g: Geom; i: number } => !!x.g),
    [screens, geoms],
  )

  // URL 동기화 (공유 링크)
  useEffect(() => {
    if (!valid.length) return
    const id = setTimeout(() => {
      const p = new URLSearchParams({ s: serializeScreens(valid.map(v => v.s)) })
      if (align !== 'bl') p.set('v', align)
      window.history.replaceState(null, '', `${window.location.pathname}?${p.toString()}`)
    }, 300)
    return () => clearTimeout(id)
  }, [valid, align])

  const update = useCallback((i: number, patch: Partial<Slot>) => {
    setSlots(prev => prev.map((s, j) => (j === i ? { ...s, ...patch } : s)))
  }, [])
  const pickPreset = (i: number, id: string) => {
    const p = PRESETS.find(x => x.id === id)
    if (p) update(i, { d: String(p.d), w: String(p.w), h: String(p.h) })
  }
  const pickRatio = (i: number, label: string) => {
    const r = RATIOS.find(x => x[0] === label)
    const s = screens[i]
    if (!r || !(s.w > 0 && s.h > 0)) return
    const [w, h] = applyRatio(s.w, s.h, r[1], r[2])
    update(i, { w: String(w), h: String(h) })
  }
  const loadScenario = (ids: string[]) =>
    setSlots(ids.map(id => PRESETS.find(p => p.id === id)!).map(p => toSlot({ d: p.d, w: p.w, h: p.h, scale: 0 })))

  // ── 핵심 비교 (A vs B) ──
  const A = valid[0]
  const B = valid[1]
  const nA = A ? nameOf(A.s) : ''
  const nB = B ? nameOf(B.s) : ''
  const areaP = A && B ? pctMore(A.g.areaCm2, B.g.areaCm2) : 0
  const ppiP = A && B ? pctMore(A.g.ppi, B.g.ppi) : 0
  const areaText = !B ? t('hero.size', { w: cm(A?.g.widthCm ?? 0), h: cm(A?.g.heightCm ?? 0) })
    : Math.abs(areaP) < 1 ? t('hero.sameArea')
      : t(areaP > 0 ? 'hero.bigger' : 'hero.smaller', { a: nA, b: nB, p: Math.abs(Math.round(areaP)) })
  const ppiText = !B ? t('hero.ppiOne', { ppi: Math.round(A?.g.ppi ?? 0), d: dist(A?.g.distRetinaCm ?? 0) })
    : Math.abs(ppiP) < 1 ? t('hero.samePpi')
      : t(ppiP > 0 ? 'hero.sharper' : 'hero.blurrier', { b: nB, p: Math.abs(Math.round(ppiP)) })
  const wsText = A?.g.workspaceVsFhd && B?.g.workspaceVsFhd
    ? t('hero.workspace', { a: A.g.workspaceVsFhd.toFixed(2), b: B.g.workspaceVsFhd.toFixed(2) })
    : null

  // ── 그림 ──
  const drawn = useMemo(() => {
    const L = layoutBoxes(valid.map(v => ({ w: v.g.widthCm, h: v.g.heightCm })), align)
    const k = 1000 / Math.max(L.vbW, L.vbH, 1e-9)
    return { ...L, k, pad: 12 }
  }, [valid, align])

  const cell = 'py-2.5 px-3 text-body tabular-nums whitespace-nowrap'
  const row = (label: string, f: (g: Geom, s: Screen, i: number) => ReactNode) => (
    <tr className="border-b border-line last:border-0">
      <td className="py-2.5 pr-3 text-sub whitespace-nowrap">{label}</td>
      {screens.map((s, i) => <td key={i} className={cell}>{geoms[i] ? f(geoms[i]!, s, i) : '—'}</td>)}
    </tr>
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      {/* 자주 비교하는 조합 */}
      <div>
        <div className="text-sm text-sub mb-2">{t('scenarios')}</div>
        <div className="flex flex-wrap gap-2">
          {SCENARIOS.map(ids => {
            const label = ids.map(id => nameOf(PRESETS.find(p => p.id === id)!)).join(' vs ')
            const on = serializeScreens(valid.map(v => v.s)) === ids.map(id => {
              const p = PRESETS.find(x => x.id === id)!
              return `${p.d}_${p.w}_${p.h}`
            }).join('-')
            return <button key={label} onClick={() => loadScenario(ids)} className={seg(on)}>{label}</button>
          })}
        </div>
      </div>

      {/* 화면 입력 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {slots.map((slot, i) => {
          const s = screens[i]
          const preset = findPreset(s)
          return (
            <div key={i} className="ui-card p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Swatch i={i} />
                  <span className="text-sm font-semibold text-fg">{t('slot', { n: LETTERS[i] })}</span>
                </div>
                {slots.length > 1 && (
                  <button onClick={() => setSlots(prev => prev.filter((_, j) => j !== i))}
                    className="p-1.5 rounded-lg text-faint hover:text-body hover:bg-soft" aria-label={t('remove')} title={t('remove')}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <select value={preset?.id ?? ''} onChange={e => pickPreset(i, e.target.value)}
                className="ui-field w-full px-3 py-2.5 text-sm" aria-label={t('selectDevice')}>
                <option value="">{t('custom')}</option>
                {KINDS.map(k => (
                  <optgroup key={k} label={t(`kinds.${k}`)}>
                    {PRESETS.filter(p => p.kind === k).map(p => <option key={p.id} value={p.id}>{nameOf(p)}</option>)}
                  </optgroup>
                ))}
              </select>
              <label className="block">
                <span className="text-xs text-muted">{t('customDiagonal')}</span>
                <input type="number" inputMode="decimal" min="1" step="0.1" value={slot.d}
                  onChange={e => update(i, { d: e.target.value })} className="ui-field w-full px-3 py-2 text-sm mt-1 tabular-nums" />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block min-w-0">
                  <span className="text-xs text-muted">{t('customWidth')}</span>
                  <input type="number" inputMode="numeric" min="1" value={slot.w}
                    onChange={e => update(i, { w: e.target.value })} className="ui-field w-full px-3 py-2 text-sm mt-1 tabular-nums" />
                </label>
                <label className="block min-w-0">
                  <span className="text-xs text-muted">{t('customHeight')}</span>
                  <input type="number" inputMode="numeric" min="1" value={slot.h}
                    onChange={e => update(i, { h: e.target.value })} className="ui-field w-full px-3 py-2 text-sm mt-1 tabular-nums" />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select value="" onChange={e => pickRatio(i, e.target.value)} className="ui-field w-full px-2 py-2 text-xs" aria-label={t('ratioPick')}>
                  <option value="">{t('ratioPick')}</option>
                  {RATIOS.map(([l]) => <option key={l} value={l}>{l}</option>)}
                </select>
                <select value={slot.scale} onChange={e => update(i, { scale: +e.target.value })}
                  className="ui-field w-full px-2 py-2 text-xs" aria-label={t('scaleLabel')}>
                  <option value={0}>{t('scaleAuto', { s: geoms[i] ? autoScale(geoms[i]!.ppi) : 100 })}</option>
                  {SCALES.map(v => <option key={v} value={v}>{t('scaleN', { s: v })}</option>)}
                </select>
              </div>
              <div className="flex items-center justify-between gap-2 text-xs text-muted">
                <span className="tabular-nums truncate">{geoms[i] ? `${screenRatioLabel(s.w, s.h)} · ${cm(geoms[i]!.widthCm)}×${cm(geoms[i]!.heightCm)} cm` : t('invalid')}</span>
                <button onClick={() => update(i, { w: slot.h, h: slot.w })} className="ui-btn-soft px-2 py-1 text-xs inline-flex items-center gap-1 shrink-0">
                  <RotateCw className="w-3.5 h-3.5" />{t('rotate')}
                </button>
              </div>
            </div>
          )
        })}
        {slots.length < 4 && (
          <button onClick={() => setSlots(prev => [...prev, toSlot({ d: 24, w: 1920, h: 1080, scale: 0 })])}
            className="rounded-2xl border border-dashed border-line-strong p-4 flex flex-col items-center justify-center gap-2 text-muted hover:text-primary hover:border-primary transition-colors min-h-[140px]">
            <Plus className="w-6 h-6" />
            <span className="text-sm">{t('addDevice')}</span>
          </button>
        )}
      </div>

      {/* 핵심 답 */}
      {A && (
        <div className="space-y-3">
          <div className="ui-hero p-6">
            <div className="text-sm text-white/70">{B ? `${nA} vs ${nB}` : t('hero.single', { name: nA })}</div>
            <div className="text-2xl sm:text-3xl font-bold mt-1 leading-snug">{areaText}</div>
            <div className="text-sm text-white/85 mt-2 space-y-1">
              <div>{ppiText}</div>
              {wsText && <div>{wsText}</div>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5 pt-4 border-t border-white/20">
              {[A, B].filter(Boolean).map(v => (
                <div key={v!.i} className="min-w-0">
                  <div className="text-xs text-white/70 truncate">{LETTERS[v!.i]} · {nameOf(v!.s)}</div>
                  <div className="text-lg font-semibold tabular-nums">{cm(v!.g.widthCm)} × {cm(v!.g.heightCm)} cm</div>
                  <div className="text-sm text-white/85 tabular-nums">
                    {Math.round(v!.g.areaCm2).toLocaleString()} cm² · {Math.round(v!.g.ppi)} PPI
                  </div>
                </div>
              ))}
            </div>
          </div>
          <ShareResult
            fileName="screen-compare"
            text={B ? t('share.text', { a: nA, b: nB, area: signed(areaP), pa: Math.round(A.g.ppi), pb: Math.round(B.g.ppi) }) : `${nA} ${areaText}`}
            card={{
              tool: t('title'),
              label: B ? t('card.label', { a: nA, b: nB }) : nA,
              headline: B ? t('card.area', { v: signed(areaP) }) : `${cm(A.g.widthCm)}×${cm(A.g.heightCm)} cm`,
              sub: ppiText,
              rows: valid.slice(0, 4).map(v => ({
                label: `${LETTERS[v.i]} ${nameOf(v.s)}`,
                value: `${cm(v.g.widthCm)}×${cm(v.g.heightCm)} cm · ${Math.round(v.g.ppi)} PPI`,
              })),
            }}
          />
        </div>
      )}

      {/* 실제 비율로 겹쳐 보기 */}
      <div className="ui-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-fg">{t('visualTitle')}</h2>
          <div className="flex flex-wrap gap-1.5">
            {ALIGNS.map(a => <button key={a} onClick={() => setAlign(a)} className={seg(align === a)}>{t(`align.${a}`)}</button>)}
          </div>
        </div>
        {valid.length > 0 ? (
          <svg
            viewBox={`${-drawn.pad} ${-drawn.pad} ${drawn.vbW * drawn.k + drawn.pad * 2} ${drawn.vbH * drawn.k + drawn.pad * 2}`}
            className="w-full h-auto max-h-[440px]" role="img"
            aria-label={valid.map(v => `${LETTERS[v.i]} ${nameOf(v.s)} ${cm(v.g.widthCm)}×${cm(v.g.heightCm)} cm`).join(', ')}
          >
            {drawn.boxes.map((b, j) => {
              const i = valid[j].i
              return (
                <g key={i}>
                  <rect x={b.x * drawn.k} y={b.y * drawn.k} width={b.w * drawn.k} height={b.h * drawn.k}
                    fill={i === 0 ? 'var(--primary-soft)' : 'none'} fillOpacity={i === 0 ? 0.6 : undefined}
                    stroke={STYLES[i].stroke} strokeWidth="4" strokeDasharray={STYLES[i].dash} rx="4" />
                  <text x={b.x * drawn.k + 12 + (align === 'side' ? 0 : j * 30)} y={b.y * drawn.k + 34}
                    fontSize="26" fontWeight="700" fill={STYLES[i].stroke}>{LETTERS[i]}</text>
                </g>
              )
            })}
          </svg>
        ) : <div className="text-sm text-faint py-8 text-center">{t('invalid')}</div>}
        <ul className="mt-4 space-y-1.5">
          {valid.map(v => (
            <li key={v.i} className="flex items-center gap-2 text-sm min-w-0">
              <Swatch i={v.i} />
              <span className="font-semibold text-fg">{LETTERS[v.i]}</span>
              <span className="text-body truncate min-w-0">{nameOf(v.s)}</span>
              <span className="text-muted tabular-nums ml-auto shrink-0">{cm(v.g.widthCm)}×{cm(v.g.heightCm)} cm</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted mt-3">{t('visualNote')}</p>
      </div>

      {/* 상세 비교 */}
      <div className="ui-card p-6">
        <h2 className="text-lg font-semibold text-fg mb-4">{t('specsTitle')}</h2>
        <div className="overflow-x-auto -mx-2 px-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="text-left py-2 pr-3 text-muted font-medium">{t('spec')}</th>
                {screens.map((s, i) => (
                  <th key={i} className="text-left py-2 px-3 font-semibold text-fg whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5"><Swatch i={i} />{LETTERS[i]}</span>
                    <div className="text-xs font-normal text-muted">{geoms[i] ? nameOf(s) : '—'}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {row(t('specDiagonal'), (g, s) => `${s.d}" (${cm(g.diagCm)} cm)`)}
              {row(t('specResolution'), (_, s) => `${s.w}×${s.h}${resolutionName(s.w, s.h) ? ` ${resolutionName(s.w, s.h)}` : ''}`)}
              {row(t('specAspect'), (_, s) => screenRatioLabel(s.w, s.h))}
              {row(t('table.size'), g => `${cm(g.widthCm)} × ${cm(g.heightCm)} cm`)}
              {row(t('specArea'), (g, _, i) => (
                <>
                  {Math.round(g.areaCm2).toLocaleString()} cm²
                  {A && A.i !== i && <span className="text-muted"> ({t('table.vsA', { p: signed(pctMore(A.g.areaCm2, g.areaCm2)) })})</span>}
                </>
              ))}
              {row('PPI', (g, _, i) => (
                <>
                  <span className="font-semibold text-fg">{Math.round(g.ppi)}</span>
                  {A && A.i !== i && <span className="text-muted"> ({t('table.vsA', { p: signed(pctMore(A.g.ppi, g.ppi)) })})</span>}
                </>
              ))}
              {row(t('table.dotPitch'), g => `${g.dotPitchMm.toFixed(3)} mm`)}
              {row(t('specTotalPixels'), g => `${g.megapixels.toFixed(1)} MP`)}
              {row(t('table.scale'), g => (g.workspace ? `${g.scale}%${g.autoScale ? ` (${t('table.auto')})` : ''}` : t('table.pcOnly')))}
              {row(t('table.workspace'), g => (g.workspace
                ? <>{g.workspace[0]}×{g.workspace[1]} <span className="text-muted">({t('table.fhd', { x: g.workspaceVsFhd!.toFixed(2) })})</span></>
                : '—'))}
              {row(t('table.distSmpte'), g => dist(g.distSmpteCm))}
              {row(t('table.distThx'), g => dist(g.distThxCm))}
              {row(t('table.distRetina'), g => dist(g.distRetinaCm))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted mt-4 leading-relaxed">{t('table.note')}</p>
      </div>

      {/* 가이드 */}
      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        <div>
          <h3 className="text-base font-bold text-fg mb-2">{t('guide.whatIs.title')}</h3>
          <p className="text-body leading-relaxed">{t('guide.whatIs.description')}</p>
        </div>
        {(['formulas', 'distance', 'tips'] as const).map(k => (
          <div key={k}>
            <h3 className="text-base font-bold text-fg mb-2">{t(`guide.${k}.title`)}</h3>
            <ul className="space-y-2 text-body list-disc pl-5 leading-relaxed">
              {(t.raw(`guide.${k}.items`) as string[]).map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </div>
        ))}
        <div>
          <h3 className="text-base font-bold text-fg mb-2">{t('ppiGuide.title')}</h3>
          <div className="bg-subtle rounded-2xl p-5 space-y-2">
            {[
              ['400+ PPI', t('ppiGuide.retina')],
              ['250–400 PPI', t('ppiGuide.sharp')],
              ['100–250 PPI', t('ppiGuide.normal')],
              ['< 100 PPI', t('ppiGuide.low')],
            ].map(([range, label]) => (
              <div key={range} className="flex gap-3 text-sm">
                <span className="font-semibold text-fg tabular-nums w-28 shrink-0">{range}</span>
                <span className="text-sub">{label}</span>
              </div>
            ))}
            <p className="text-xs text-muted pt-1">{t('guide.ppiNote')}</p>
          </div>
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
        <div className="flex flex-wrap gap-2">
          <Link href="/screen-info/" className="ui-btn-soft px-4 py-2 text-sm">{t('guide.linkScreenInfo')}</Link>
          <Link href="/aspect-ratio/" className="ui-btn-soft px-4 py-2 text-sm">{t('guide.linkAspectRatio')}</Link>
        </div>
      </div>
    </div>
  )
}
