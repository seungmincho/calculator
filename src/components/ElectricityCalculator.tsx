'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations } from '@/lib/i18n'
import { useSearchParams } from '@/hooks/useSearchParams'
import { Plus, X } from 'lucide-react'
import ShareResult from '@/components/ShareResult'
import {
  calcBill, seasonOf, applianceKwh, boundaryTip, pctChange, TARIFF, LIMITS, SUPER_USER_KWH, CLIMATE, FUEL, FUND, RATE_DATE,
  type Voltage, type Welfare, type Season, type Bill,
} from '@/utils/electricityBill'

// 소비전력은 "대략" 값 — 사용자가 수정 (제품 라벨·에너지효율 등급표 기준이 정확)
const PRESETS = {
  ac: { watt: 1000, hours: 6, days: 30 },
  fridge: { watt: 40, hours: 24, days: 30 },
  blanket: { watt: 150, hours: 8, days: 30 },
  heater: { watt: 1500, hours: 3, days: 30 },
  dryer: { watt: 1000, hours: 1.5, days: 10 },
  dishwasher: { watt: 1000, hours: 1, days: 20 },
  washer: { watt: 300, hours: 1, days: 15 },
  tv: { watt: 100, hours: 4, days: 30 },
  computer: { watt: 200, hours: 4, days: 30 },
  other: { watt: 100, hours: 1, days: 30 },
} as const
type ApplianceId = keyof typeof PRESETS
const APPLIANCE_IDS = Object.keys(PRESETS) as ApplianceId[]
interface Appliance { key: number; id: ApplianceId; watt: number; hours: number; days: number }

const WELFARES: Welfare[] = ['none', 'disabled', 'basicLiving', 'basicHousing', 'nearPoor', 'family', 'lifeSupport']
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)
const won = (n: number) => Math.round(n).toLocaleString('ko-KR')
const num = (v: string | null | undefined, d: number) => { const n = parseFloat(v ?? ''); return Number.isFinite(n) ? n : d }
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
const seg = (on: boolean) =>
  `min-h-[44px] px-3 py-2 rounded-xl text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`

let nextKey = 1
const makeAppliance = (id: ApplianceId, o: Partial<Omit<Appliance, 'key' | 'id'>> = {}): Appliance => ({ key: nextKey++, id, ...PRESETS[id], ...o })
const DEFAULT_APPLIANCES = () => [makeAppliance('ac')]

export default function ElectricityCalculator() {
  const t = useTranslations('electricityCalculator')
  const searchParams = useSearchParams()
  const ready = useRef(false)

  const [mode, setMode] = useState<'kwh' | 'appliance'>('kwh')
  const [kwh, setKwh] = useState(350)
  const [baseKwh, setBaseKwh] = useState(250)
  const [appliances, setAppliances] = useState<Appliance[]>(DEFAULT_APPLIANCES)
  const [addId, setAddId] = useState<ApplianceId>('fridge')
  const [month, setMonth] = useState(10)
  const [voltage, setVoltage] = useState<Voltage>('low')
  const [welfare, setWelfare] = useState<Welfare>('none')
  const [prev, setPrev] = useState(0)
  const [acWatt, setAcWatt] = useState(1000)
  const [acHours, setAcHours] = useState(4)

  // URL → 상태 (한 번). 월 파라미터가 없으면 이번 달
  useEffect(() => {
    if (ready.current) return
    const g = (k: string) => searchParams.get(k)
    if (g('m') === 'a') setMode('appliance')
    setKwh(clamp(num(g('k'), 350), 0, 5000))
    setBaseKwh(clamp(num(g('b'), 250), 0, 5000))
    const ap = g('ap')
    if (ap) {
      const list = ap.split('_').map((s) => s.split('.')).filter(([id]) => id in PRESETS)
        .map(([id, w, h, d]) => makeAppliance(id as ApplianceId, { watt: clamp(num(w, 0), 0, 10000), hours: clamp(num(h, 0), 0, 24), days: clamp(num(d, 30), 0, 31) }))
      setAppliances(list.slice(0, 20))
    }
    const mo = Math.round(num(g('mo'), new Date().getMonth() + 1))
    setMonth(mo >= 1 && mo <= 12 ? mo : new Date().getMonth() + 1)
    if (g('v') === 'h') setVoltage('high')
    const w = g('w') as Welfare | null
    if (w && WELFARES.includes(w)) setWelfare(w)
    setPrev(clamp(num(g('p'), 0), 0, 5000))
    setAcWatt(clamp(num(g('aw'), 1000), 0, 10000))
    setAcHours(clamp(num(g('ah'), 4), 1, 24))
    ready.current = true
  }, [searchParams])

  // 상태 → URL (공유 링크가 결과를 재현)
  useEffect(() => {
    if (!ready.current) return
    const p = new URLSearchParams({ mo: String(month) })
    if (mode === 'appliance') {
      p.set('m', 'a'); p.set('b', String(baseKwh))
      p.set('ap', appliances.map((a) => [a.id, a.watt, a.hours, a.days].join('.')).join('_'))
    } else p.set('k', String(kwh))
    if (voltage === 'high') p.set('v', 'h')
    if (welfare !== 'none') p.set('w', welfare)
    if (prev > 0) p.set('p', String(prev))
    if (acWatt !== 1000) p.set('aw', String(acWatt))
    if (acHours !== 4) p.set('ah', String(acHours))
    window.history.replaceState(null, '', `${window.location.pathname}?${p}`)
  }, [mode, kwh, baseKwh, appliances, month, voltage, welfare, prev, acWatt, acHours])

  const season = seasonOf(month)
  const opts = { season, voltage, welfare, month }
  const applianceTotal = appliances.reduce((s, a) => s + applianceKwh(a.watt, a.hours, a.days), 0)
  const usage = Math.round(mode === 'appliance' ? baseKwh + applianceTotal : kwh)
  const bill = calcBill(usage, opts)
  const avgPerKwh = usage > 0 ? bill.total / usage : 0
  const [l1, l2] = LIMITS[season]
  const tip = boundaryTip(usage, opts)

  // 에어컨 하루 N시간 더
  const acKwh = Math.round(applianceKwh(acWatt, acHours, 30))
  const acBill = calcBill(usage + acKwh, opts)
  const acExtra = acBill.total - bill.total

  // 지난달 비교 (지난달 계절로 계산)
  const prevMonth = month === 1 ? 12 : month - 1
  const prevBill = prev > 0 ? calcBill(prev, { ...opts, season: seasonOf(prevMonth), month: prevMonth }) : null
  const usagePct = prevBill ? pctChange(usage, prev) : null
  const billPct = prevBill ? pctChange(bill.total, prevBill.total) : null

  const seasons: Season[] = ['normal', 'summer', 'winter']
  const seasonBills = seasons.map((s) => ({ s, bill: calcBill(usage, { ...opts, season: s, month: s === 'summer' ? 7 : s === 'winter' ? 1 : 10 }) }))

  const tierText = (b: Bill) => (b.isSuper ? t('tier.super') : t('tier.n', { n: b.tier }))
  const heroLabel = t('hero.label', { month, kwh: won(usage) })
  const heroSub = t('hero.sub', { tier: tierText(bill), avg: avgPerKwh.toFixed(1) })

  const reset = () => {
    setMode('kwh'); setKwh(350); setBaseKwh(250); setAppliances(DEFAULT_APPLIANCES()); setMonth(new Date().getMonth() + 1)
    setVoltage('low'); setWelfare('none'); setPrev(0); setAcWatt(1000); setAcHours(4)
  }
  const switchMode = (m: 'kwh' | 'appliance') => {
    if (m === 'kwh' && mode === 'appliance') setKwh(usage)
    setMode(m)
  }
  const updateAppliance = (key: number, patch: Partial<Appliance>) =>
    setAppliances((list) => list.map((a) => (a.key === key ? { ...a, ...patch } : a)))

  // 누진 막대 축
  const scaleMax = Math.max(usage * 1.15, l2 + 100)
  const pct = (v: number) => `${Math.min(100, (v / scaleMax) * 100)}%`
  const rowLabel = (r: Bill['rows'][number]) =>
    r.tier === 4 ? t('tier.superRow', { from: SUPER_USER_KWH })
      : r.to == null ? t('tier.rowOver', { n: r.tier, from: r.from })
        : t('tier.rowRange', { n: r.tier, from: r.from === 0 ? 0 : r.from + 1, to: r.to })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <div className="lg:col-span-1">
          <div className="ui-card p-6 space-y-6">
            <div role="group" aria-label={t('input.modeLabel')} className="grid grid-cols-2 gap-2">
              <button type="button" aria-pressed={mode === 'kwh'} className={seg(mode === 'kwh')} onClick={() => switchMode('kwh')}>{t('input.modeKwh')}</button>
              <button type="button" aria-pressed={mode === 'appliance'} className={seg(mode === 'appliance')} onClick={() => switchMode('appliance')}>{t('input.modeAppliance')}</button>
            </div>

            {mode === 'kwh' ? (
              <div>
                <label htmlFor="ec-kwh" className="block text-sm font-medium text-body mb-2">{t('usage')}</label>
                <div className="flex items-center gap-2">
                  <input id="ec-kwh" type="number" inputMode="numeric" min={0} max={5000} value={kwh || ''} placeholder="0"
                    onChange={(e) => setKwh(clamp(Math.round(num(e.target.value, 0)), 0, 5000))}
                    aria-describedby="ec-kwh-hint" className="ui-field flex-1 min-w-0 px-4 py-3 tabular-nums" />
                  <span className="text-sm text-muted">kWh</span>
                </div>
                <input type="range" min={0} max={1200} step={10} value={Math.min(kwh, 1200)} onChange={(e) => setKwh(parseInt(e.target.value))}
                  aria-label={t('usage')} className="w-full mt-3 accent-[var(--primary)]" />
                <p id="ec-kwh-hint" className="text-xs text-muted mt-1.5">{t('input.kwhHint')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label htmlFor="ec-base" className="block text-sm font-medium text-body mb-2">{t('input.baseKwh')}</label>
                  <div className="flex items-center gap-2">
                    <input id="ec-base" type="number" inputMode="numeric" min={0} value={baseKwh || ''} placeholder="0"
                      onChange={(e) => setBaseKwh(clamp(Math.round(num(e.target.value, 0)), 0, 5000))}
                      aria-describedby="ec-base-hint" className="ui-field flex-1 min-w-0 px-4 py-3 tabular-nums" />
                    <span className="text-sm text-muted">kWh</span>
                  </div>
                  <p id="ec-base-hint" className="text-xs text-muted mt-1.5">{t('input.baseHint')}</p>
                </div>

                <ul className="space-y-3">
                  {appliances.map((a) => {
                    const name = t(`appliances.${a.id}`)
                    const id = `ec-ap-${a.key}`
                    return (
                      <li key={a.key} className="bg-subtle rounded-2xl p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-fg">{name}</span>
                          <span className="ml-auto text-sm text-sub tabular-nums">{applianceKwh(a.watt, a.hours, a.days).toFixed(1)} kWh</span>
                          <button type="button" onClick={() => setAppliances((l) => l.filter((x) => x.key !== a.key))}
                            aria-label={t('input.remove', { name })} className="w-11 h-11 -mr-2 flex items-center justify-center rounded-xl text-sub hover:bg-soft">
                            <X className="w-4 h-4" aria-hidden />
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-1">
                          <label htmlFor={`${id}-w`} className="text-xs text-sub">{t('input.watt')}
                            <input id={`${id}-w`} type="number" inputMode="numeric" min={0} value={a.watt || ''}
                              onChange={(e) => updateAppliance(a.key, { watt: clamp(num(e.target.value, 0), 0, 10000) })}
                              className="ui-field w-full px-2 py-2.5 mt-1 text-sm tabular-nums" />
                          </label>
                          <label htmlFor={`${id}-h`} className="text-xs text-sub">{t('input.hours')}
                            <input id={`${id}-h`} type="number" inputMode="decimal" min={0} max={24} step={0.5} value={a.hours || ''}
                              onChange={(e) => updateAppliance(a.key, { hours: clamp(num(e.target.value, 0), 0, 24) })}
                              className="ui-field w-full px-2 py-2.5 mt-1 text-sm tabular-nums" />
                          </label>
                          <label htmlFor={`${id}-d`} className="text-xs text-sub">{t('input.days')}
                            <input id={`${id}-d`} type="number" inputMode="numeric" min={0} max={31} value={a.days || ''}
                              onChange={(e) => updateAppliance(a.key, { days: clamp(Math.round(num(e.target.value, 0)), 0, 31) })}
                              className="ui-field w-full px-2 py-2.5 mt-1 text-sm tabular-nums" />
                          </label>
                        </div>
                      </li>
                    )
                  })}
                </ul>
                {appliances.length === 0 && <p className="text-sm text-muted">{t('input.empty')}</p>}

                <div className="flex gap-2">
                  <label htmlFor="ec-add" className="sr-only">{t('input.addLabel')}</label>
                  <select id="ec-add" value={addId} onChange={(e) => setAddId(e.target.value as ApplianceId)} className="ui-field flex-1 min-w-0 px-3 py-3">
                    {APPLIANCE_IDS.map((id) => <option key={id} value={id}>{t(`appliances.${id}`)} · {t('input.approxWatt', { w: PRESETS[id].watt })}</option>)}
                  </select>
                  <button type="button" onClick={() => setAppliances((l) => [...l, makeAppliance(addId)].slice(0, 20))}
                    className="ui-btn-soft min-h-[44px] px-4"><Plus className="w-4 h-4" aria-hidden />{t('input.add')}</button>
                </div>
                <p className="text-xs text-muted">{t('input.applianceNote', { kwh: won(applianceTotal) })}</p>
              </div>
            )}

            <div>
              <span id="ec-month-label" className="block text-sm font-medium text-body mb-2">{t('input.month')}</span>
              <div role="group" aria-labelledby="ec-month-label" className="grid grid-cols-6 gap-1.5">
                {MONTHS.map((m) => (
                  <button key={m} type="button" aria-pressed={month === m} className={seg(month === m).replace('px-3', 'px-0')} onClick={() => setMonth(m)}>
                    {t('input.monthN', { n: m })}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted mt-1.5">{t(`seasonHint.${season}`, { l1, l2 })}</p>
            </div>

            <div>
              <span id="ec-volt-label" className="block text-sm font-medium text-body mb-2">{t('contractType')}</span>
              <div role="group" aria-labelledby="ec-volt-label" className="grid grid-cols-2 gap-2">
                {(['low', 'high'] as const).map((v) => (
                  <button key={v} type="button" aria-pressed={voltage === v} className={seg(voltage === v)} onClick={() => setVoltage(v)}>
                    {t(v === 'low' ? 'contracts.lowVoltage' : 'contracts.highVoltage')}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted mt-1.5">{t('input.voltageHint')}</p>
            </div>

            <div>
              <label htmlFor="ec-welfare" className="block text-sm font-medium text-body mb-2">{t('input.welfare')}</label>
              <select id="ec-welfare" value={welfare} onChange={(e) => setWelfare(e.target.value as Welfare)} className="ui-field w-full px-4 py-3">
                {WELFARES.map((w) => <option key={w} value={w}>{t(`welfare.${w}`)}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="ec-prev" className="block text-sm font-medium text-body mb-2">
                {t('input.prev')} <span className="text-faint font-normal">({t('input.optional')})</span>
              </label>
              <div className="flex items-center gap-2">
                <input id="ec-prev" type="number" inputMode="numeric" min={0} value={prev || ''} placeholder="0"
                  onChange={(e) => setPrev(clamp(Math.round(num(e.target.value, 0)), 0, 5000))}
                  className="ui-field flex-1 min-w-0 px-4 py-3 tabular-nums" />
                <span className="text-sm text-muted">kWh</span>
              </div>
            </div>

            <button type="button" onClick={reset} className="ui-btn-soft w-full min-h-[44px] px-4 py-2">{t('common.reset')}</button>
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="ui-hero p-6">
            <div className="text-sm text-white/80">{heroLabel}</div>
            <div className="text-4xl font-bold mt-2 tabular-nums" aria-live="polite" aria-atomic="true">
              {won(bill.total)}{t('common.won')}
            </div>
            <div className="text-sm text-white/80 mt-2">{heroSub}</div>
            {prevBill && billPct != null && (
              <div className="mt-4">
                <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-sm">
                  {t('compare.chip', { diff: `${bill.total - prevBill.total >= 0 ? '+' : '-'}${won(Math.abs(bill.total - prevBill.total))}` })}
                </span>
              </div>
            )}
          </div>

          <ShareResult
            card={{
              tool: t('title'),
              label: heroLabel,
              headline: `${won(bill.total)}${t('common.won')}`,
              sub: heroSub,
              rows: [
                ...seasonBills.filter((x) => x.s !== season).slice(0, 1).map((x) => ({ label: t(`seasonCompare.${x.s}`), value: `${won(x.bill.total)}${t('common.won')}` })),
                { label: t('ac.shareRow', { h: acHours }), value: `+${won(acExtra)}${t('common.won')}` },
                ...(prevBill ? [{ label: t('compare.prevBill'), value: `${won(prevBill.total)}${t('common.won')}` }] : []),
              ],
            }}
            text={t('share.text', { month, kwh: won(usage), total: won(bill.total) })}
            fileName="electricity-bill"
          />

          {/* 누진 구간 */}
          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg">{t('tiers.title')}</h2>
            <p className="text-sm text-sub mt-1">{t('bar.summary', { kwh: won(usage), tier: tierText(bill) })}</p>
            <div role="img" aria-label={t('bar.aria', { kwh: won(usage), tier: tierText(bill), l1, l2 })} className="mt-5">
              <div className="relative h-12">
                <div className="absolute inset-y-0 left-0 flex w-full rounded-xl overflow-hidden border border-line">
                  <div className="bg-subtle border-r border-line flex items-center px-2 text-xs text-sub" style={{ width: pct(l1) }}>{t('tier.n', { n: 1 })}</div>
                  <div className="bg-soft border-r border-line flex items-center px-2 text-xs text-sub" style={{ width: pct(l2 - l1) }}>{t('tier.n', { n: 2 })}</div>
                  <div className="bg-track flex-1 flex items-center px-2 text-xs text-sub">{t('tier.n', { n: 3 })}</div>
                </div>
                <div className="absolute bottom-0 left-0 h-2 bg-primary rounded-full" style={{ width: pct(usage) }} />
                <div className="absolute -top-1 -bottom-1 w-0.5 bg-fg" style={{ left: pct(usage) }} />
              </div>
              <div className="relative h-5 mt-1 text-xs text-muted tabular-nums">
                <span className="absolute left-0">0</span>
                <span className="absolute -translate-x-1/2" style={{ left: pct(l1) }}>{l1}</span>
                <span className="absolute -translate-x-1/2" style={{ left: pct(l2) }}>{l2}</span>
                <span className="absolute right-0">kWh</span>
              </div>
            </div>
            {tip && (
              <div className={`rounded-2xl p-4 mt-4 text-sm ${tip.kind === 'above' ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' : 'bg-subtle text-sub'}`}>
                {tip.kind === 'above'
                  ? t('tip.above', { over: tip.over, tier: tip.tier - 1, save: won(tip.save) })
                  : t('tip.below', { left: tip.left + 1, tier: tip.tier, rate: TARIFF[voltage].rate[tip.tier - 1], base: won(TARIFF[voltage].base[tip.tier - 1]) })}
              </div>
            )}
            {bill.isSuper && (
              <div className="rounded-2xl p-4 mt-4 text-sm bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                {t('tip.super', { kwh: SUPER_USER_KWH, rate: TARIFF[voltage].superRate })}
              </div>
            )}
          </div>

          {/* 상세 내역 */}
          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg mb-3">{t('result.title')}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[420px]">
                <caption className="sr-only">{t('result.title')}</caption>
                <thead>
                  <tr className="border-b border-line text-sub">
                    <th scope="col" className="text-left font-medium py-2 pr-3">{t('table.item')}</th>
                    <th scope="col" className="text-left font-medium py-2 px-3">{t('table.calc')}</th>
                    <th scope="col" className="text-right font-medium py-2 pl-3">{t('table.amount')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  <Tr label={t('result.baseFee')} calc={t('table.baseCalc', { tier: bill.tier })} value={bill.base} />
                  {bill.rows.filter((r) => r.kwh > 0).map((r) => (
                    <Tr key={r.tier} label={rowLabel(r)} calc={`${won(r.kwh)}kWh × ${r.rate.toFixed(1)}`} value={r.amount} sub />
                  ))}
                  <Tr label={t('result.usageFee')} calc={t('table.floor')} value={bill.energy} />
                  <Tr label={t('result.climateFee')} calc={`${won(usage)}kWh × ${CLIMATE.toFixed(1)}`} value={bill.climate} />
                  <Tr label={t('result.fuelAdjust')} calc={`${won(usage)}kWh × ${FUEL.toFixed(1)}`} value={bill.fuel} />
                  <Tr label={t('result.subtotal')} calc="" value={bill.subtotal} strong />
                  {bill.discount > 0 && <Tr label={t('result.discount')} calc={t(`welfare.${welfare}`)} value={-bill.discount} />}
                  <Tr label={t('result.vat')} calc={t('table.vatCalc')} value={bill.vat} />
                  <Tr label={t('result.elecFund')} calc={t('table.fundCalc', { rate: (FUND * 100).toFixed(1) })} value={bill.fund} />
                  <tr>
                    <th scope="row" className="text-left py-3 pr-3 font-semibold text-fg">{t('result.totalMonthly')}</th>
                    <td className="py-3 px-3 text-xs text-faint">{t('table.totalCalc')}</td>
                    <td className="py-3 pl-3 text-right text-lg font-bold text-fg tabular-nums">{won(bill.total)}{t('common.won')}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="bg-subtle rounded-2xl p-4 mt-4 text-xs text-sub space-y-1">
              <p>{t('basis', { date: RATE_DATE })}</p>
              <p>{t('basisNote')}</p>
            </div>
          </div>

          {/* 지난달 비교 */}
          {prevBill && (
            <div className="ui-card p-6">
              <h2 className="text-lg font-semibold text-fg mb-3">{t('compare.title')}</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[360px]">
                  <thead>
                    <tr className="border-b border-line text-sub">
                      <th scope="col" className="text-left font-medium py-2 pr-3"><span className="sr-only">{t('table.item')}</span></th>
                      <th scope="col" className="text-right font-medium py-2 px-3">{t('compare.prevCol', { n: prevMonth })}</th>
                      <th scope="col" className="text-right font-medium py-2 px-3">{t('compare.nowCol', { n: month })}</th>
                      <th scope="col" className="text-right font-medium py-2 pl-3">{t('compare.change')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line tabular-nums">
                    <tr>
                      <th scope="row" className="text-left font-normal text-sub py-2.5 pr-3">{t('compare.usage')}</th>
                      <td className="text-right px-3">{won(prev)} kWh</td>
                      <td className="text-right px-3">{won(usage)} kWh</td>
                      <td className="text-right pl-3">{fmtPct(usagePct)}</td>
                    </tr>
                    <tr>
                      <th scope="row" className="text-left font-normal text-sub py-2.5 pr-3">{t('compare.bill')}</th>
                      <td className="text-right px-3">{won(prevBill.total)}{t('common.won')}</td>
                      <td className="text-right px-3 font-semibold text-fg">{won(bill.total)}{t('common.won')}</td>
                      <td className="text-right pl-3 font-semibold text-fg">{fmtPct(billPct)}</td>
                    </tr>
                    <tr>
                      <th scope="row" className="text-left font-normal text-sub py-2.5 pr-3">{t('compare.tier')}</th>
                      <td className="text-right px-3">{tierText(prevBill)}</td>
                      <td className="text-right px-3">{tierText(bill)}</td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
              {usagePct != null && billPct != null && billPct - usagePct > 3 && (
                <p className="text-sm text-sub mt-3">{t('compare.why', { u: usagePct.toFixed(0), b: billPct.toFixed(0) })}</p>
              )}
            </div>
          )}

          {/* 에어컨 */}
          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg">{t('ac.title')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label htmlFor="ec-ac-h" className="flex justify-between text-sm font-medium text-body mb-2">
                  <span>{t('ac.hours')}</span><span className="text-fg tabular-nums">{t('ac.hoursValue', { h: acHours })}</span>
                </label>
                <input id="ec-ac-h" type="range" min={1} max={24} value={acHours} onChange={(e) => setAcHours(parseInt(e.target.value))} className="w-full accent-[var(--primary)]" />
              </div>
              <div>
                <label htmlFor="ec-ac-w" className="block text-sm font-medium text-body mb-2">{t('ac.watt')}</label>
                <div className="flex items-center gap-2">
                  <input id="ec-ac-w" type="number" inputMode="numeric" min={0} value={acWatt || ''} onChange={(e) => setAcWatt(clamp(num(e.target.value, 0), 0, 10000))}
                    aria-describedby="ec-ac-w-hint" className="ui-field flex-1 min-w-0 px-4 py-3 tabular-nums" />
                  <span className="text-sm text-muted">W</span>
                </div>
                <p id="ec-ac-w-hint" className="text-xs text-muted mt-1.5">{t('ac.wattHint')}</p>
              </div>
            </div>
            <div className="bg-subtle rounded-2xl p-4 mt-4">
              <p className="text-sm text-sub">{t('ac.result', { h: acHours, kwh: won(acKwh) })}</p>
              <p className="text-2xl font-bold text-fg tabular-nums mt-1">+{won(acExtra)}{t('common.won')}<span className="text-sm font-normal text-sub"> / {t('ac.perMonth')}</span></p>
              <p className="text-xs text-muted mt-1">{t('ac.after', { total: won(acBill.total), tier: tierText(acBill), perHour: won(acKwh > 0 ? acExtra / (acHours * 30) : 0) })}</p>
            </div>
          </div>

          {/* 계절 비교 */}
          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg mb-3">{t('seasonCompare.title', { kwh: won(usage) })}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[360px]">
                <thead>
                  <tr className="border-b border-line text-sub">
                    <th scope="col" className="text-left font-medium py-2 pr-3">{t('seasonCompare.season')}</th>
                    <th scope="col" className="text-left font-medium py-2 px-3">{t('seasonCompare.limits')}</th>
                    <th scope="col" className="text-right font-medium py-2 pl-3">{t('seasonCompare.bill')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {seasonBills.map(({ s, bill: b }) => (
                    <tr key={s} className={s === season ? 'font-semibold text-fg' : 'text-body'}>
                      <th scope="row" className="text-left py-2.5 pr-3">
                        {t(`seasonCompare.${s}`)}{s === season && <span className="ml-1 text-xs text-primary">({t('seasonCompare.current')})</span>}
                      </th>
                      <td className="px-3 text-sub">{t('seasonCompare.limitText', { l1: LIMITS[s][0], l2: LIMITS[s][1] })}</td>
                      <td className="pl-3 text-right tabular-nums">{won(b.total)}{t('common.won')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted mt-3">{t('seasonCompare.note', { kwh: SUPER_USER_KWH })}</p>
          </div>

          {/* 절약 팁 */}
          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg mb-3">{t('savingTips.title')}</h2>
            <ul className="space-y-2 list-disc pl-5 text-sm text-sub">
              {((t.raw('savingTips.items') as string[]) ?? []).map((tip, i) => <li key={i}>{tip}</li>)}
            </ul>
          </div>
        </div>
      </div>

      {/* 가이드 */}
      <div className="ui-card p-6">
        <h2 className="text-xl font-semibold text-fg mb-6">{t('guide.title')}</h2>
        <div className="space-y-6">
          {(['structure', 'calcOrder', 'welfare'] as const).map((k) => (
            <div key={k}>
              <h3 className="text-lg font-semibold text-fg mb-3">{t(`guide.${k}.title`)}</h3>
              <ul className="space-y-2 list-disc pl-5 text-sub">
                {((t.raw(`guide.${k}.items`) as string[]) ?? []).map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          ))}
          <div>
            <h3 className="text-lg font-semibold text-fg mb-3">{t('guide.faq.title')}</h3>
            <div className="space-y-3">
              {((t.raw('guide.faq.items') as { q: string; a: string }[]) ?? []).map((f, i) => (
                <details key={i} className="bg-subtle rounded-2xl p-4">
                  <summary className="cursor-pointer font-medium text-fg min-h-[24px]">{f.q}</summary>
                  <p className="text-sm text-sub mt-2">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-fg mb-3">{t('guide.sources.title')}</h3>
            <ul className="space-y-2 text-sm">
              {((t.raw('guide.sources.items') as { label: string; url: string }[]) ?? []).map((s) => (
                <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">{s.label}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-fg mb-3">{t('guide.related.title')}</h3>
            <div className="flex flex-wrap gap-2">
              {((t.raw('guide.related.items') as { label: string; href: string }[]) ?? []).map((r) => (
                <a key={r.href} href={r.href} className="ui-btn-soft min-h-[44px] px-4 py-2 text-sm">{r.label}</a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const fmtPct = (p: number | null) => (p == null ? '-' : `${p >= 0 ? '+' : ''}${p.toFixed(1)}%`)

function Tr({ label, calc, value, strong, sub }: { label: string; calc: string; value: number; strong?: boolean; sub?: boolean }) {
  return (
    <tr>
      <th scope="row" className={`text-left py-2.5 pr-3 ${strong ? 'font-semibold text-fg' : 'font-normal text-sub'} ${sub ? 'pl-3 text-xs' : ''}`}>{label}</th>
      <td className="py-2.5 px-3 text-xs text-faint tabular-nums whitespace-nowrap">{calc}</td>
      <td className={`py-2.5 pl-3 text-right tabular-nums ${strong ? 'font-semibold text-fg' : sub ? 'text-sub text-xs' : 'text-body'}`}>
        {value < 0 ? '-' : ''}{won(Math.abs(value))}
      </td>
    </tr>
  )
}
