'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useTranslations } from '@/lib/i18n'
import { useSearchParams } from '@/hooks/useSearchParams'
import { Plus, Trash2, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react'
import ShareResult from '@/components/ShareResult'
import { toPyeong } from '@/utils/pyeong'
import {
  PRESETS, DEFAULT_SETTINGS, MAX_ROOMS, room as makeRoom, areas, calculate, encodeState, decodeState, paperSize,
  type Room, type Settings, type Line, type TileSpec, type PaperKind, type WallFinish, type FloorFinish, type CeilFinish,
} from '@/utils/interior'

type PresetKey = keyof typeof PRESETS
type Tab = 'paper' | 'paint' | 'floor' | 'tile' | 'trim'

const TILE_SIZES: { w: number; h: number; perBox: number }[] = [
  { w: 200, h: 200, perBox: 25 }, { w: 300, h: 300, perBox: 11 }, { w: 250, h: 400, perBox: 10 },
  { w: 300, h: 600, perBox: 8 }, { w: 600, h: 600, perBox: 4 }, { w: 600, h: 1200, perBox: 2 },
]

const seg = (on: boolean) =>
  `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
const labelCls = 'block text-xs font-medium text-sub mb-1'
const fieldCls = 'ui-field w-full px-3 py-2 text-sm'

const f1 = (n: number) => n.toLocaleString('ko-KR', { maximumFractionDigits: 1 })
const f2 = (n: number) => n.toLocaleString('ko-KR', { maximumFractionDigits: 2 })
const won = (n: number) => Math.round(n).toLocaleString('ko-KR')
const num = (v: string) => { const n = parseFloat(v); return Number.isFinite(n) && n >= 0 ? n : 0 }

function Num({ label, value, onChange, step = 0.1, help, id }: { label: string; value: number; onChange: (n: number) => void; step?: number; help?: string; id: string }) {
  return (
    <div>
      <label htmlFor={id} className={labelCls}>{label}</label>
      <input id={id} type="number" inputMode="decimal" min={0} step={step} value={value}
        onChange={(e) => onChange(num(e.target.value))} className={fieldCls} />
      {help && <p className="text-xs text-muted mt-1">{help}</p>}
    </div>
  )
}

function Seg<T extends string | number>({ options, value, onChange, label }: { options: { v: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button key={String(o.v)} type="button" aria-pressed={value === o.v} onClick={() => onChange(o.v)} className={seg(value === o.v)}>{o.label}</button>
      ))}
    </div>
  )
}

export default function InteriorCalc() {
  const t = useTranslations('interiorCalc')
  const searchParams = useSearchParams()

  const presetRooms = useCallback((k: PresetKey) => PRESETS[k].map((r) => ({ ...r, name: t(`roomNames.${r.name}`) })), [t])
  const [rooms, setRooms] = useState<Room[]>(() => presetRooms('apt24'))
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [open, setOpen] = useState<number>(-1)
  const [tab, setTab] = useState<Tab>('paper')
  const [copied, setCopied] = useState(false)
  const ready = useRef(false)

  // URL → 상태 (한 번)
  useEffect(() => {
    if (ready.current) return
    const st = decodeState(searchParams.get('s'))
    if (st) { setRooms(st.rooms); setSettings(st.settings) }
    ready.current = true
  }, [searchParams])

  const encoded = useMemo(() => encodeState(rooms, settings), [rooms, settings])
  useEffect(() => {
    if (!ready.current) return
    window.history.replaceState(null, '', `${window.location.pathname}?s=${encoded}`)
  }, [encoded])

  const res = useMemo(() => calculate(rooms, settings), [rooms, settings])

  const setS = <K extends keyof Settings>(k: K, v: Settings[K]) => setSettings((p) => ({ ...p, [k]: v }))
  const setTile = (k: 'wallTile' | 'floorTile', patch: Partial<TileSpec>) => setSettings((p) => ({ ...p, [k]: { ...p[k], ...patch } }))
  const setRoom = (i: number, patch: Partial<Room>) => setRooms((p) => p.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const addRoom = () => {
    if (rooms.length >= MAX_ROOMS) return
    setRooms((p) => [...p, makeRoom(t('roomN', { n: p.length + 1 }), 3.3, 3.0)])
    setOpen(rooms.length)
  }
  const removeRoom = (i: number) => { setRooms((p) => p.filter((_, j) => j !== i)); setOpen(-1) }
  const applyPreset = (k: PresetKey) => { setRooms(presetRooms(k)); setOpen(-1) }

  const pct = (x: number) => Math.round(x * 1000) / 10
  const { w: rollW, len: rollLen } = paperSize(settings)
  const roomName = (r: Room, i: number) => r.name.trim() || t('roomN', { n: i + 1 })

  // ── 자재 한 줄 표시 ──
  const itemName = (l: Line) => (l.key === 'paper' ? t('items.paper', { kind: t(`paper.kind.${settings.paper}`) }) : t(`items.${l.key}`))
  const qtyText = (l: Line): string => {
    switch (l.key) {
      case 'paper': return Number.isFinite(l.qty) ? t('units.roll', { n: l.qty }) : '-'
      case 'paint': return (l.cans ?? []).map((c) => t('units.can', { size: c.size, n: c.count })).join(' + ')
      case 'vinyl': return t('units.m', { n: f1(l.qty) })
      case 'laminate': return t('units.box', { n: l.qty })
      case 'wallTile': case 'floorTile': return t('units.piece', { n: l.qty.toLocaleString('ko-KR') })
      default: return t('units.stick', { n: l.qty })
    }
  }
  const detailText = (l: Line): string => {
    switch (l.key) {
      case 'paper': return t('detail.paper', { w: rollW, len: rollLen, area: f1(l.area) })
      case 'paint': return t('detail.paint', { liters: f1(l.liters ?? 0), area: f1(l.area), coats: settings.coats })
      case 'vinyl': return t('detail.vinyl', { w: settings.vinylW, area: f1(l.area) })
      case 'laminate': return t('detail.laminate', { box: settings.lamBox, area: f1(l.area) })
      case 'wallTile': case 'floorTile': {
        const s = settings[l.key]
        return `${t('detail.tile', { w: s.w, h: s.h, area: f1(l.area) })}${l.boxes ? ` · ${t('units.box', { n: l.boxes })}` : ''}`
      }
      default: return t('detail.trim', { len: f1(l.area), stick: settings.stickLen })
    }
  }

  const floorPy = f1(toPyeong(res.floor))
  const badRoll = res.lines.some((l) => l.key === 'paper' && !Number.isFinite(l.qty))
  const heroValue = res.cost > 0 ? `${won(res.cost)}${t('won')}` : res.lines[0] ? `${itemName(res.lines[0])} ${qtyText(res.lines[0])}` : t('hero.empty')

  const shoppingList = useMemo(() => [
    t('list.header'),
    t('list.areas', { floor: f1(res.floor), wall: f1(res.wallNet), ceil: f1(res.ceiling) }),
    '',
    ...res.lines.map((l) => `- ${itemName(l)}: ${qtyText(l)} (${detailText(l)})${l.cost > 0 ? ` — ${won(l.cost)}${t('won')}` : ''}`),
    ...(res.cost > 0 ? ['', `${t('hero.total')}: ${won(res.cost)}${t('won')}${res.partial ? ` (${t('hero.partial')})` : ''}`] : []),
  ].join('\n'), [res, settings, t]) // eslint-disable-line react-hooks/exhaustive-deps

  const copyList = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(shoppingList)
      else {
        const ta = document.createElement('textarea')
        ta.value = shoppingList; ta.style.position = 'fixed'; ta.style.left = '-999999px'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      }
    } catch { /* 권한 없음 */ }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [shoppingList])

  const wallOpts: { v: WallFinish; label: string }[] = (['wallpaper', 'paint', 'tile', 'none'] as const).map((v) => ({ v, label: t(`finish.${v}`) }))
  const floorOpts: { v: FloorFinish; label: string }[] = (['laminate', 'vinyl', 'tile', 'none'] as const).map((v) => ({ v, label: t(`finish.${v}`) }))
  const ceilOpts: { v: CeilFinish; label: string }[] = (['wallpaper', 'paint', 'none'] as const).map((v) => ({ v, label: t(`finish.${v}`) }))

  // ── 결과 패널 ──
  const results = (
    <div className="space-y-4 lg:sticky lg:top-20">
      <div className="ui-hero p-6">
        <p className="text-sm text-white/70">{t('hero.label', { n: rooms.length, py: floorPy })}</p>
        <p className="text-3xl sm:text-4xl font-bold tabular-nums mt-1 break-keep">{heroValue}</p>
        <p className="text-sm text-white/70 mt-2">
          {res.cost > 0 ? (res.partial ? t('hero.partial') : t('hero.total')) : t('hero.noPrice')}
        </p>
        {res.lines.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mt-5">
            {res.lines.map((l) => (
              <div key={l.key} className="rounded-xl bg-white/15 px-3 py-2.5">
                <p className="text-xs text-white/70">{itemName(l)}</p>
                <p className="text-base font-bold tabular-nums">{qtyText(l)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      {badRoll && <p className="bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm">{t('invalidRoll')}</p>}

      <div className="ui-card p-6">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-base font-semibold text-fg">{t('list.title')}</h2>
          <button type="button" onClick={copyList} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-soft hover:bg-subtle text-body">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? t('list.copied') : t('list.copy')}
          </button>
        </div>
        {res.lines.length === 0 ? (
          <p className="text-sm text-muted">{t('hero.empty')}</p>
        ) : (
          <ul className="divide-y divide-line">
            {res.lines.map((l) => (
              <li key={l.key} className="py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-fg">{itemName(l)}</p>
                  <p className="text-xs text-muted mt-0.5">{detailText(l)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-fg tabular-nums">{qtyText(l)}</p>
                  {l.cost > 0 && <p className="text-xs text-sub tabular-nums mt-0.5">{won(l.cost)}{t('won')}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
        <dl className="mt-4 bg-subtle rounded-2xl p-4 grid grid-cols-3 gap-2 text-center">
          {([['floor', res.floor], ['wall', res.wallNet], ['ceiling', res.ceiling]] as const).map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-muted">{t(`areas.${k}`)}</dt>
              <dd className="text-sm font-semibold text-fg tabular-nums">{f1(v)}{t('sqm')}</dd>
              <dd className="text-xs text-muted tabular-nums">{f1(toPyeong(v))}{t('pyeong')}</dd>
            </div>
          ))}
        </dl>
      </div>

      <ShareResult
        card={{
          tool: t('title'),
          label: t('share.label', { n: rooms.length, py: floorPy }),
          headline: heroValue,
          rows: res.lines.slice(0, 5).map((l) => ({ label: itemName(l), value: qtyText(l) })),
        }}
        text={shoppingList}
        fileName="interior-materials"
      />
    </div>
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6 lg:gap-8">
        <div className="lg:col-span-2 lg:order-2">{results}</div>

        <div className="lg:col-span-3 lg:order-1 space-y-6">
          {/* 방 목록 */}
          <div className="ui-card p-6 space-y-4">
            <div>
              <p className="text-sm font-medium text-body mb-2">{t('presets.title')}</p>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(PRESETS) as PresetKey[]).map((k) => (
                  <button key={k} type="button" onClick={() => applyPreset(k)} className="ui-btn-soft px-3 py-1.5 text-sm">{t(`presets.${k}`)}</button>
                ))}
              </div>
              <p className="text-xs text-muted mt-2">{t('presets.note')}</p>
            </div>

            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-fg">{t('rooms.title')}</h2>
              <span className="text-sm text-muted">{t('rooms.count', { n: rooms.length })}</span>
            </div>

            <ul className="space-y-2">
              {rooms.map((r, i) => {
                const a = areas(r)
                const isOpen = open === i
                return (
                  <li key={i} className="border border-line rounded-2xl overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3">
                      <button type="button" onClick={() => setOpen(isOpen ? -1 : i)} aria-expanded={isOpen}
                        className="flex-1 min-w-0 flex items-center justify-between gap-2 text-left">
                        <span className="min-w-0">
                          <span className="block font-medium text-fg truncate">{roomName(r, i)}</span>
                          <span className="block text-xs text-muted truncate">
                            {t('areaFmt', { m2: f1(a.floor), py: f1(toPyeong(a.floor)) })} · {t('finish.wall')} {t(`finish.${r.wall}`)} · {t('finish.floor')} {t(`finish.${r.floor}`)}
                          </span>
                        </span>
                        {isOpen ? <ChevronUp className="w-4 h-4 text-faint shrink-0" /> : <ChevronDown className="w-4 h-4 text-faint shrink-0" />}
                      </button>
                      {rooms.length > 1 && (
                        <button type="button" onClick={() => removeRoom(i)} aria-label={t('removeRoom')}
                          className="p-1.5 text-faint hover:text-red-600 rounded-lg shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {isOpen && (
                      <div className="px-4 pb-4 pt-3 space-y-4 border-t border-line">
                        <div className="grid sm:grid-cols-2 gap-3">
                          <div>
                            <label htmlFor={`rn${i}`} className={labelCls}>{t('roomName')}</label>
                            <input id={`rn${i}`} type="text" maxLength={20} value={r.name} placeholder={t('roomNamePlaceholder')}
                              onChange={(e) => setRoom(i, { name: e.target.value })} className={fieldCls} />
                          </div>
                          <div>
                            <p className={labelCls}>{t('inputMode')}</p>
                            <Seg label={t('inputMode')} value={r.mode} onChange={(v) => setRoom(i, { mode: v })}
                              options={[{ v: 'dim', label: t('mode.dim') }, { v: 'pyeong', label: t('mode.pyeong') }]} />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          {r.mode === 'dim' ? (
                            <>
                              <Num id={`w${i}`} label={t('width')} value={r.w} onChange={(v) => setRoom(i, { w: v })} />
                              <Num id={`l${i}`} label={t('length')} value={r.l} onChange={(v) => setRoom(i, { l: v })} />
                            </>
                          ) : (
                            <div className="col-span-2">
                              <Num id={`p${i}`} label={t('pyeongInput')} value={r.pyeong} step={0.5} onChange={(v) => setRoom(i, { pyeong: v })} help={t('pyeongNote')} />
                            </div>
                          )}
                          <Num id={`h${i}`} label={t('height')} value={r.h} onChange={(v) => setRoom(i, { h: v })} />
                        </div>

                        <div>
                          <p className="text-sm font-medium text-body mb-2">{t('openings')}</p>
                          <div className="grid grid-cols-3 gap-3">
                            <Num id={`d${i}`} label={t('doors')} value={r.doors} step={1} onChange={(v) => setRoom(i, { doors: Math.round(v) })} />
                            <Num id={`dw${i}`} label={t('doorW')} value={r.doorW} onChange={(v) => setRoom(i, { doorW: v })} />
                            <Num id={`dh${i}`} label={t('doorH')} value={r.doorH} onChange={(v) => setRoom(i, { doorH: v })} />
                            <Num id={`n${i}`} label={t('windows')} value={r.wins} step={1} onChange={(v) => setRoom(i, { wins: Math.round(v) })} />
                            <Num id={`nw${i}`} label={t('winW')} value={r.winW} onChange={(v) => setRoom(i, { winW: v })} />
                            <Num id={`nh${i}`} label={t('winH')} value={r.winH} onChange={(v) => setRoom(i, { winH: v })} />
                          </div>
                          <div className="mt-3">
                            <Num id={`x${i}`} label={t('customDeduction')} value={r.extra} onChange={(v) => setRoom(i, { extra: v })} help={t('customDeductionHelp')} />
                          </div>
                          <p className="text-xs text-muted mt-2">
                            {t('wallCalc', { gross: f1(a.wallGross), minus: f1(a.openings), net: f1(a.wallNet) })}
                          </p>
                        </div>

                        <div className="space-y-3">
                          {([['wall', wallOpts], ['floor', floorOpts], ['ceil', ceilOpts]] as const).map(([k, opts]) => (
                            <div key={k} className="flex flex-wrap items-center gap-2">
                              <span className="w-10 text-sm text-sub">{t(`finish.${k}`)}</span>
                              <Seg label={t(`finish.${k}`)} value={r[k] as string} onChange={(v) => setRoom(i, { [k]: v } as Partial<Room>)}
                                options={opts as { v: string; label: string }[]} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>

            <button type="button" onClick={addRoom} disabled={rooms.length >= MAX_ROOMS}
              className="w-full ui-btn-soft py-3 text-sm disabled:opacity-50">
              <Plus className="w-4 h-4" />
              {t('addRoom')}
            </button>
          </div>

          {/* 자재 규격·가격 */}
          <div className="ui-card p-6 space-y-4">
            <h2 className="text-base font-semibold text-fg">{t('materials')}</h2>
            <Seg label={t('materials')} value={tab} onChange={setTab}
              options={(['paper', 'paint', 'floor', 'tile', 'trim'] as const).map((v) => ({ v, label: t(`tabs.${v}`) }))} />

            {tab === 'paper' && (
              <div className="space-y-4">
                <Seg label={t('tabs.paper')} value={settings.paper} onChange={(v: PaperKind) => setS('paper', v)}
                  options={(['silk', 'wideHapji', 'hapji', 'custom'] as const).map((v) => ({ v, label: t(`paper.kind.${v}`) }))} />
                <p className="text-xs text-muted">{t('paper.specNote')}</p>
                {settings.paper === 'custom' && (
                  <div className="grid grid-cols-2 gap-3">
                    <Num id="pw" label={t('paper.width')} value={settings.paperW} step={0.01} onChange={(v) => setS('paperW', v)} />
                    <Num id="pl" label={t('paper.length')} value={settings.paperLen} step={0.5} onChange={(v) => setS('paperLen', v)} />
                  </div>
                )}
                <div className="grid sm:grid-cols-3 gap-3">
                  <Num id="rep" label={t('paper.repeat')} value={Math.round(settings.repeat * 1000) / 10} step={1} onChange={(v) => setS('repeat', v / 100)} />
                  <Num id="ploss" label={t('paper.loss')} value={pct(settings.paperLoss)} step={1} onChange={(v) => setS('paperLoss', v / 100)} />
                  <Num id="pp" label={t('paper.price')} value={settings.paperPrice} step={1000} onChange={(v) => setS('paperPrice', v)} />
                </div>
                <p className="text-xs text-muted">{t('paper.repeatHelp')}</p>
              </div>
            )}

            {tab === 'paint' && (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <Num id="cov" label={t('paint.coverage')} value={settings.coverage} step={0.5} onChange={(v) => setS('coverage', v)} help={t('paint.coverageHelp')} />
                  <div>
                    <p className={labelCls}>{t('paint.coats')}</p>
                    <Seg label={t('paint.coats')} value={settings.coats} onChange={(v) => setS('coats', v)}
                      options={[1, 2, 3].map((v) => ({ v, label: t('paint.coatsN', { n: v }) }))} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Num id="c18" label={t('paint.canPrice', { size: 18 })} value={settings.can18} step={1000} onChange={(v) => setS('can18', v)} />
                  <Num id="c4" label={t('paint.canPrice', { size: 4 })} value={settings.can4} step={1000} onChange={(v) => setS('can4', v)} />
                  <Num id="c1" label={t('paint.canPrice', { size: 1 })} value={settings.can1} step={1000} onChange={(v) => setS('can1', v)} />
                </div>
                <Num id="paloss" label={t('paint.loss')} value={pct(settings.paintLoss)} step={1} onChange={(v) => setS('paintLoss', v / 100)} />
                <p className="text-xs text-muted">{t('paint.canNote')}</p>
              </div>
            )}

            {tab === 'floor' && (
              <div className="space-y-5">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-fg">{t('floor.lamTitle')}</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <Num id="lb" label={t('floor.lamBox')} value={settings.lamBox} step={0.01} onChange={(v) => setS('lamBox', v)} />
                    <Num id="ll" label={t('floor.lamLoss')} value={pct(settings.lamLoss)} step={1} onChange={(v) => setS('lamLoss', v / 100)} />
                    <Num id="lp" label={t('floor.lamPrice')} value={settings.lamPrice} step={1000} onChange={(v) => setS('lamPrice', v)} />
                  </div>
                  <p className="text-xs text-muted">{t('floor.lamNote')}</p>
                </div>
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-fg">{t('floor.vinylTitle')}</h3>
                  <Seg label={t('floor.vinylWidth')} value={settings.vinylW} onChange={(v) => setS('vinylW', v)}
                    options={[1.8, 2].map((v) => ({ v, label: t('floor.widthN', { n: v }) }))} />
                  <Num id="vp" label={t('floor.vinylPrice')} value={settings.vinylPrice} step={1000} onChange={(v) => setS('vinylPrice', v)} />
                  <p className="text-xs text-muted">{t('floor.vinylNote')}</p>
                </div>
              </div>
            )}

            {tab === 'tile' && (
              <div className="space-y-5">
                {(['wallTile', 'floorTile'] as const).map((k) => {
                  const s = settings[k]
                  const sizeKey = `${s.w}x${s.h}`
                  return (
                    <div key={k} className="space-y-3">
                      <h3 className="text-sm font-semibold text-fg">{t(`items.${k}`)}</h3>
                      <div role="group" aria-label={t('tile.size')} className="flex flex-wrap gap-1.5">
                        {TILE_SIZES.map((z) => (
                          <button key={`${z.w}x${z.h}`} type="button" aria-pressed={sizeKey === `${z.w}x${z.h}`}
                            onClick={() => setTile(k, { w: z.w, h: z.h, perBox: z.perBox })} className={seg(sizeKey === `${z.w}x${z.h}`)}>
                            {z.w}×{z.h}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <Num id={`${k}w`} label={t('tile.w')} value={s.w} step={10} onChange={(v) => setTile(k, { w: v })} />
                        <Num id={`${k}h`} label={t('tile.h')} value={s.h} step={10} onChange={(v) => setTile(k, { h: v })} />
                        <Num id={`${k}b`} label={t('tile.perBox')} value={s.perBox} step={1} onChange={(v) => setTile(k, { perBox: Math.round(v) })} />
                        <Num id={`${k}p`} label={t('tile.price')} value={s.price} step={1000} onChange={(v) => setTile(k, { price: v })} />
                      </div>
                    </div>
                  )
                })}
                <div className="grid grid-cols-2 gap-3">
                  <Num id="grout" label={t('tile.grout')} value={settings.grout} step={0.5} onChange={(v) => setS('grout', v)} />
                  <div>
                    <p className={labelCls}>{t('tile.loss')}</p>
                    <Seg label={t('tile.loss')} value={pct(settings.tileLoss)} onChange={(v) => setS('tileLoss', v / 100)}
                      options={[5, 7, 10, 15].map((v) => ({ v, label: `${v}%` }))} />
                  </div>
                </div>
                <p className="text-xs text-muted">{t('tile.note')}</p>
              </div>
            )}

            {tab === 'trim' && (
              <div className="space-y-4">
                {(['baseboard', 'molding'] as const).map((k) => (
                  <div key={k} className="flex flex-wrap items-end gap-3">
                    <div>
                      <p className={labelCls}>{t(`items.${k}`)}</p>
                      <Seg label={t(`items.${k}`)} value={settings[k] ? 'on' : 'off'} onChange={(v) => setS(k, v === 'on')}
                        options={[{ v: 'on', label: t('trim.on') }, { v: 'off', label: t('trim.off') }]} />
                    </div>
                    <div className="flex-1 min-w-[8rem]">
                      <Num id={`${k}p`} label={t('trim.price')} value={settings[k === 'baseboard' ? 'baseboardPrice' : 'moldingPrice']} step={500}
                        onChange={(v) => setS(k === 'baseboard' ? 'baseboardPrice' : 'moldingPrice', v)} />
                    </div>
                  </div>
                ))}
                <Num id="stick" label={t('trim.stick')} value={settings.stickLen} step={0.1} onChange={(v) => setS('stickLen', v)} />
                <p className="text-xs text-muted">{t('trim.note')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 가이드 */}
      <div className="ui-card p-6">
        <h2 className="text-xl font-semibold text-fg mb-6">{t('guideTitle')}</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {(['guideBasic', 'guideMaterial', 'guideLimit'] as const).map((g) => (
            <div key={g}>
              <h3 className="font-semibold text-body mb-3">{t(`${g}Title`)}</h3>
              <ul className="space-y-2 list-disc pl-4 marker:text-faint">
                {(t.raw(`${g}Items`) as string[]).map((item, i) => (
                  <li key={i} className="text-sm text-sub">{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
