'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useTranslations } from '@/lib/i18n'
import { useSearchParams } from '@/hooks/useSearchParams'
import ShareResult from '@/components/ShareResult'
import {
  REGION_RATES, WHOLESALE_UNIT, MJ_PER_M3, calcBill, toMJ, estimateMJ, heatingMJ, hotWaterMJ, yearlyMJ, pctChange, savings,
  type RegionKey, type Insulation,
} from '@/utils/gasBill'

const REGIONS: RegionKey[] = ['seoul', 'gyeonggi', 'daegu', 'other', 'custom']
const INSULATIONS: Insulation[] = ['good', 'average', 'poor']
const won = (n: number) => Math.round(n).toLocaleString('ko-KR')
const num = (v: string | null, d: number) => { const n = parseFloat(v ?? ''); return Number.isFinite(n) ? n : d }
const seg = (on: boolean) =>
  `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`

export default function GasBill() {
  const t = useTranslations('gasBill')
  const searchParams = useSearchParams()
  const ready = useRef(false)

  const [mode, setMode] = useState<'estimate' | 'usage'>('estimate')
  const [region, setRegion] = useState<RegionKey>('seoul')
  const [customUnit, setCustomUnit] = useState(REGION_RATES.seoul.unit)
  const [customBasic, setCustomBasic] = useState(REGION_RATES.seoul.basic)
  const [usage, setUsage] = useState(3000)
  const [unit, setUnit] = useState<'mj' | 'm3'>('mj')
  const [pyeong, setPyeong] = useState(30)
  const [insulation, setInsulation] = useState<Insulation>('average')
  const [hours, setHours] = useState(8)
  const [temp, setTemp] = useState(22)
  const [month, setMonth] = useState(1)
  const [prev, setPrev] = useState(0)
  const [lastYear, setLastYear] = useState(0)

  // URL → 상태 (한 번)
  useEffect(() => {
    if (ready.current) return
    const g = (k: string) => searchParams.get(k)
    if (g('mode') === 'u') setMode('usage')
    const r = g('r') as RegionKey | null
    if (r && REGIONS.includes(r)) setRegion(r)
    setCustomUnit(num(g('cu'), REGION_RATES.seoul.unit))
    setCustomBasic(num(g('cb'), REGION_RATES.seoul.basic))
    setUsage(Math.max(0, num(g('u'), 3000)))
    if (g('unit') === 'm3') setUnit('m3')
    setPyeong(Math.min(200, Math.max(1, num(g('py'), 30))))
    const ins = g('ins') as Insulation | null
    if (ins && INSULATIONS.includes(ins)) setInsulation(ins)
    setHours(Math.min(24, Math.max(0, num(g('h'), 8))))
    setTemp(Math.min(28, Math.max(16, num(g('tp'), 22))))
    const m = Math.round(num(g('m'), 1))
    setMonth(m >= 1 && m <= 12 ? m : 1)
    setPrev(Math.max(0, num(g('prev'), 0)))
    setLastYear(Math.max(0, num(g('ly'), 0)))
    ready.current = true
  }, [searchParams])

  // 상태 → URL (공유 링크가 결과를 재현)
  useEffect(() => {
    if (!ready.current) return
    const p = new URLSearchParams({ r: region, m: String(month) })
    if (mode === 'usage') { p.set('mode', 'u'); p.set('u', String(usage)); if (unit === 'm3') p.set('unit', 'm3') }
    p.set('py', String(pyeong)); p.set('ins', insulation); p.set('h', String(hours)); p.set('tp', String(temp))
    if (region === 'custom') { p.set('cu', String(customUnit)); p.set('cb', String(customBasic)) }
    if (prev > 0) p.set('prev', String(prev))
    if (lastYear > 0) p.set('ly', String(lastYear))
    window.history.replaceState(null, '', `${window.location.pathname}?${p}`)
  }, [mode, region, customUnit, customBasic, usage, unit, pyeong, insulation, hours, temp, month, prev, lastYear])

  const rate = region === 'custom'
    ? { unit: customUnit, basic: customBasic, verified: true as const }
    : REGION_RATES[region]
  const est = { pyeong, insulation, hours, temp, month }
  const modelMJ = estimateMJ(est)
  const mj = mode === 'usage' ? toMJ(usage, unit) : modelMJ
  const bill = calcBill(mj, rate)
  const scale = mode === 'usage' && modelMJ > 0 ? mj / modelMJ : 1

  const year = useMemo(() => {
    const mjs = yearlyMJ({ pyeong, insulation, hours, temp, month }, mode === 'usage' ? mj : undefined)
    return mjs.map((m) => calcBill(m, rate).total)
  }, [pyeong, insulation, hours, temp, month, mode, mj, rate.unit, rate.basic]) // eslint-disable-line react-hooks/exhaustive-deps
  const maxYear = Math.max(...year, 1)
  const avg = (ms: number[]) => Math.round(ms.reduce((s, m) => s + year[m - 1], 0) / ms.length)
  const winterAvg = avg([12, 1, 2])
  const summerAvg = avg([6, 7, 8])
  const annual = year.reduce((s, v) => s + v, 0)

  const save = savings(est, rate.unit, scale)
  const heatingNow = heatingMJ(est) > 0
  const breakdown = { heat: Math.round(heatingMJ(est) * scale), water: Math.round(hotWaterMJ(month) * scale) }

  const regionLabel = t(`regions.${region}`)
  const heroLabel = t('hero.label', { region: regionLabel, month })
  const compareRows = [
    { key: 'prev', label: t('compare.prev'), before: prev },
    { key: 'ly', label: t('compare.lastYear'), before: lastYear },
  ].map((c) => ({ ...c, pct: pctChange(bill.total, c.before) }))
  const pctText = (p: number) =>
    Math.abs(p) < 0.05 ? t('compare.same') : t(p > 0 ? 'compare.up' : 'compare.down', { pct: Math.abs(p).toFixed(1) })

  const reset = () => {
    setMode('estimate'); setRegion('seoul'); setUsage(3000); setUnit('mj'); setPyeong(30); setInsulation('average')
    setHours(8); setTemp(22); setMonth(1); setPrev(0); setLastYear(0)
  }

  const switchMode = (m: 'estimate' | 'usage') => {
    if (m === 'usage' && mode === 'estimate') { setUnit('mj'); setUsage(modelMJ) }
    setMode(m)
  }

  const shareLabel = mode === 'estimate'
    ? t('share.labelEstimate', { region: regionLabel, pyeong, month })
    : t('share.labelUsage', { region: regionLabel, mj: won(mj), month })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <div className="lg:col-span-1">
          <div className="ui-card p-6 space-y-5">
            <div className="grid grid-cols-2 gap-2">
              <button className={seg(mode === 'estimate')} onClick={() => switchMode('estimate')}>{t('mode.estimate')}</button>
              <button className={seg(mode === 'usage')} onClick={() => switchMode('usage')}>{t('mode.usage')}</button>
            </div>

            <div>
              <label htmlFor="gb-region" className="block text-sm font-medium text-body mb-2">{t('region')}</label>
              <select id="gb-region" value={region} onChange={(e) => setRegion(e.target.value as RegionKey)} className="ui-field w-full px-4 py-3">
                {REGIONS.map((r) => <option key={r} value={r}>{t(`regions.${r}`)}</option>)}
              </select>
              {region === 'custom' && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <label className="text-xs text-sub">{t('customUnit')}
                    <input type="number" step="0.0001" min={0} value={customUnit} onChange={(e) => setCustomUnit(Math.max(0, parseFloat(e.target.value) || 0))} className="ui-field w-full px-3 py-2 mt-1 text-sm" />
                  </label>
                  <label className="text-xs text-sub">{t('customBasic')}
                    <input type="number" min={0} value={customBasic} onChange={(e) => setCustomBasic(Math.max(0, parseFloat(e.target.value) || 0))} className="ui-field w-full px-3 py-2 mt-1 text-sm" />
                  </label>
                </div>
              )}
            </div>

            <div>
              <span className="block text-sm font-medium text-body mb-2">{t('month')}</span>
              <div className="grid grid-cols-6 gap-1.5">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <button key={m} className={seg(month === m).replace("px-3", "px-0")} onClick={() => setMonth(m)}>{t('monthN', { n: m })}</button>
                ))}
              </div>
            </div>

            {mode === 'usage' ? (
              <div>
                <label htmlFor="gb-usage" className="block text-sm font-medium text-body mb-2">{t('usage')}</label>
                <div className="flex gap-2">
                  <input id="gb-usage" type="number" min={0} value={usage || ''} onChange={(e) => setUsage(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder={t('usagePlaceholder')} className="ui-field flex-1 min-w-0 px-4 py-3" />
                  <button className={seg(unit === 'mj')} onClick={() => setUnit('mj')}>MJ</button>
                  <button className={seg(unit === 'm3')} onClick={() => setUnit('m3')}>㎥</button>
                </div>
                {unit === 'm3' && <p className="text-xs text-muted mt-1.5">{t('m3Note', { k: MJ_PER_M3, mj: won(mj) })}</p>}
              </div>
            ) : (
              <>
                <div>
                  <label htmlFor="gb-py" className="block text-sm font-medium text-body mb-2">{t('boilerSim.houseSize')}</label>
                  <div className="flex items-center gap-2">
                    <input id="gb-py" type="number" min={1} max={200} value={pyeong} onChange={(e) => setPyeong(Math.min(200, Math.max(0, parseFloat(e.target.value) || 0)))} className="ui-field flex-1 min-w-0 px-4 py-3" />
                    <span className="text-sm text-muted">{t('boilerSim.pyeong')}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[18, 25, 30, 34, 45].map((p) => <button key={p} className={seg(pyeong === p)} onClick={() => setPyeong(p)}>{p}{t('boilerSim.pyeong')}</button>)}
                  </div>
                </div>
                <div>
                  <span className="block text-sm font-medium text-body mb-2">{t('boilerSim.insulation')}</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {INSULATIONS.map((i) => (
                      <button key={i} className={seg(insulation === i)} onClick={() => setInsulation(i)}>
                        {t(`insulationShort.${i}`)}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted mt-1.5">{t(`boilerSim.insulation${i18nIns(insulation)}`)}</p>
                </div>
                <div>
                  <label htmlFor="gb-h" className="flex justify-between text-sm font-medium text-body mb-2">
                    <span>{t('boilerSim.heatingHours')}</span><span className="text-fg tabular-nums">{hours}{t('boilerSim.hoursPerDay')}</span>
                  </label>
                  <input id="gb-h" type="range" min={0} max={24} value={hours} onChange={(e) => setHours(parseInt(e.target.value))} className="w-full accent-[var(--primary)]" />
                </div>
                <div>
                  <label htmlFor="gb-tp" className="flex justify-between text-sm font-medium text-body mb-2">
                    <span>{t('temp')}</span><span className="text-fg tabular-nums">{temp}℃</span>
                  </label>
                  <input id="gb-tp" type="range" min={16} max={28} value={temp} onChange={(e) => setTemp(parseInt(e.target.value))} className="w-full accent-[var(--primary)]" />
                </div>
                <p className="text-xs text-muted">{t('modelNote')}</p>
              </>
            )}

            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-body">{t('compare.title')} <span className="text-faint">({t('compare.optional')})</span></summary>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <label className="text-xs text-sub">{t('compare.prev')}
                  <input type="number" min={0} value={prev || ''} onChange={(e) => setPrev(Math.max(0, parseFloat(e.target.value) || 0))} className="ui-field w-full px-3 py-2 mt-1 text-sm" />
                </label>
                <label className="text-xs text-sub">{t('compare.lastYear')}
                  <input type="number" min={0} value={lastYear || ''} onChange={(e) => setLastYear(Math.max(0, parseFloat(e.target.value) || 0))} className="ui-field w-full px-3 py-2 mt-1 text-sm" />
                </label>
              </div>
            </details>

            <button onClick={reset} className="ui-btn-soft w-full px-4 py-2">{t('reset')}</button>
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="ui-hero p-6">
            <div className="text-sm text-white/70">{heroLabel}</div>
            <div className="text-4xl font-bold mt-2 tabular-nums">{won(bill.total)}{t('result.won')}</div>
            <div className="text-sm text-white/70 mt-2">{t('hero.sub', { mj: won(mj) })}</div>
            {compareRows.some((c) => c.pct != null) && (
              <div className="flex flex-wrap gap-2 mt-4">
                {compareRows.filter((c) => c.pct != null).map((c) => (
                  <span key={c.key} className="rounded-full bg-white/15 px-3 py-1 text-sm">
                    {c.label} {pctText(c.pct!)} ({bill.total - c.before >= 0 ? '+' : '-'}{won(Math.abs(bill.total - c.before))}{t('result.won')})
                  </span>
                ))}
              </div>
            )}
          </div>

          <ShareResult
            card={{
              tool: t('title'),
              label: shareLabel,
              headline: `${won(bill.total)}${t('result.won')}`,
              sub: t('hero.sub', { mj: won(mj) }),
              rows: [
                { label: t('yearly.winterAvg'), value: `${won(winterAvg)}${t('result.won')}` },
                { label: t('yearly.summerAvg'), value: `${won(summerAvg)}${t('result.won')}` },
                ...(heatingNow ? [{ label: t('save.tempDown1'), value: t('save.perMonth', { won: won(save.tempDown1) }) }] : []),
              ],
            }}
            text={t('share.text', { month, total: won(bill.total) })}
            fileName="gas-bill"
          />

          <div className="ui-card p-6">
            <dl className="divide-y divide-line text-sm">
              <Row label={t('result.basicCharge')} value={`${won(bill.basic)}${t('result.won')}`} />
              <Row label={t('result.usageCharge')} hint={`${won(mj)} MJ × ${rate.unit.toFixed(4)}`} value={`${won(bill.usageCharge)}${t('result.won')}`} />
              <Row label={t('result.vat')} value={`${won(bill.vat)}${t('result.won')}`} />
              <Row label={t('result.total')} value={`${won(bill.total)}${t('result.won')}`} strong />
            </dl>
            {breakdown.heat + breakdown.water > 0 && (
              <p className="text-xs text-muted mt-3">{t('breakdown', { heat: won(breakdown.heat), water: won(breakdown.water) })}</p>
            )}
            <div className="bg-subtle rounded-2xl p-4 mt-4 text-sm text-sub space-y-1">
              <div>
                {t('rateInfo', { unit: rate.unit.toFixed(4), basic: won(rate.basic) })}
                {'since' in rate && rate.since ? ` · ${t('since', { date: rate.since })}` : ''}
              </div>
              {'source' in rate && rate.source && rate.url ? (
                <div>{t('sourceLabel')}: <a href={rate.url} target="_blank" rel="noopener noreferrer" className="text-primary underline">{rate.source}</a></div>
              ) : null}
              {!rate.verified && <div className="text-amber-700 dark:text-amber-400">{t('estimatedNote', { wholesale: WHOLESALE_UNIT })}</div>}
              <div className="text-xs text-muted">{t('basis')}</div>
            </div>
          </div>

          {/* 월별 */}
          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg">{t('monthlyChart.title')}</h2>
            <p className="text-xs text-muted mt-1 mb-4">{t('monthlyChart.description')}</p>
            <div className="flex items-end gap-1 sm:gap-2 h-44">
              {year.map((v, i) => (
                <button key={i} onClick={() => setMonth(i + 1)} className="flex-1 flex flex-col items-center justify-end h-full group"
                  aria-label={`${t('monthN', { n: i + 1 })} ${won(v)}${t('result.won')}`}>
                  <span className="text-[10px] text-sub mb-1 hidden sm:block tabular-nums">{(v / 10000).toFixed(1)}</span>
                  <span className={`w-full rounded-t-md min-h-[3px] transition-all ${i + 1 === month ? 'bg-primary' : 'bg-primary/30 group-hover:bg-primary/50'}`}
                    style={{ height: `${(v / maxYear) * 100}%` }} />
                  <span className={`text-xs mt-1 ${i + 1 === month ? 'text-primary font-semibold' : 'text-muted'}`}>{i + 1}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-faint mt-2 text-right">{t('chartUnit')}</p>
            <div className="grid grid-cols-3 gap-3 mt-4">
              <Stat label={t('yearly.winterAvg')} value={`${won(winterAvg)}${t('result.won')}`} />
              <Stat label={t('yearly.summerAvg')} value={`${won(summerAvg)}${t('result.won')}`} />
              <Stat label={t('yearly.annual')} value={`${won(annual)}${t('result.won')}`} />
            </div>
          </div>

          {/* 절약 */}
          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg mb-4">{t('save.title')}</h2>
            <ul className="divide-y divide-line text-sm">
              {heatingNow && <SaveRow label={t('save.tempDown1')} value={t('save.perMonth', { won: won(save.tempDown1) })} />}
              {heatingNow && hours > 0 && <SaveRow label={t('save.hourDown1')} value={t('save.perMonth', { won: won(save.hourDown1) })} />}
              <SaveRow label={t('save.water10')} value={t('save.perMonth', { won: won(save.water10) })} />
            </ul>
            {!heatingNow && <p className="text-sm text-sub mt-3">{t('save.noHeating')}</p>}
            <div className="bg-subtle rounded-2xl p-4 mt-4">
              <div className="text-sm font-semibold text-fg">{t('save.awayTitle')}</div>
              <p className="text-sm text-sub mt-1">{t('save.awayTip')}</p>
            </div>
            <p className="text-xs text-muted mt-3">{t('save.note')}</p>
          </div>
        </div>
      </div>

      {/* 가이드 */}
      <div className="ui-card p-6">
        <h2 className="text-xl font-semibold text-fg mb-6">{t('guide.title')}</h2>
        <div className="space-y-6">
          {(['structure', 'tips'] as const).map((k) => (
            <div key={k}>
              <h3 className="text-lg font-semibold text-fg mb-3">{t(`guide.${k}.title`)}</h3>
              <ul className="space-y-2 list-disc pl-5 text-sub">
                {(t.raw(`guide.${k}.items`) as string[]).map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          ))}
          <div>
            <h3 className="text-lg font-semibold text-fg mb-3">{t('guide.faq.title')}</h3>
            <div className="space-y-3">
              {(t.raw('guide.faq.items') as { q: string; a: string }[]).map((f, i) => (
                <details key={i} className="bg-subtle rounded-2xl p-4">
                  <summary className="cursor-pointer font-medium text-fg">{f.q}</summary>
                  <p className="text-sm text-sub mt-2">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const i18nIns = (i: Insulation) => (i === 'good' ? 'Good' : i === 'poor' ? 'Poor' : 'Average')

function Row({ label, value, hint, strong }: { label: string; value: string; hint?: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <dt className={strong ? 'font-semibold text-fg' : 'text-sub'}>
        {label}{hint && <span className="block text-xs text-faint tabular-nums">{hint}</span>}
      </dt>
      <dd className={`tabular-nums ${strong ? 'text-lg font-bold text-fg' : 'text-body'}`}>{value}</dd>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-subtle rounded-2xl p-3">
      <div className="text-xs text-sub">{label}</div>
      <div className="text-sm sm:text-base font-bold text-fg tabular-nums mt-1">{value}</div>
    </div>
  )
}

function SaveRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center justify-between py-2.5">
      <span className="text-body">{label}</span>
      <span className="font-semibold text-primary tabular-nums">{value}</span>
    </li>
  )
}
