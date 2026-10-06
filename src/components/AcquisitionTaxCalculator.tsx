'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/acquisitionTaxCalc'
import { useSearchParams } from '@/hooks/useSearchParams'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import {
  calcTax, buyExtras, dueDate, latePenalty, RELIEF_LIMIT,
  type Mode, type Kind, type Owner, type Relief, type TaxInput,
} from '@/utils/acquisitionTax'

// 조정대상지역 (2026-07-01 기준: 서울 25개 구 + 경기 15곳 — 2025.10.16 지정 + 2026.7.1 동탄·기흥·구리 추가)
const ADJ_REGIONS = [
  'seoul', 'gwacheon', 'gwangmyeong', 'seongnam', 'suwon', 'anyangDongan', 'yonginSuji', 'yonginGiheung',
  'uiwang', 'hanam', 'hwaseongDongtan', 'guri',
] as const
const REGIONS = [...ADJ_REGIONS, 'metroCity', 'other'] as const
type Region = (typeof REGIONS)[number]
const METRO: Region[] = ['seoul', 'metroCity']

const MODES: Mode[] = ['buy', 'inherit', 'gift']
const KINDS: Kind[] = ['house', 'building', 'farmland']
const OWNERS: Owner[] = ['1', '2temp', '2', '3', '4', 'corp']
const RELIEFS: Relief[] = ['none', 'first', 'firstSmall', 'birth']
const EOK = 100_000_000

const won = (v: number) => Math.round(v).toLocaleString('ko-KR')
const pct = (v: number, d = 2) => `${(v * 100).toFixed(d).replace(/\.?0+$/, '')}%`
const parseNum = (s: string) => Number(s.replace(/[^\d]/g, '')) || 0
function eokMan(v: number): string {
  const eok = Math.floor(v / EOK)
  const man = Math.floor((v % EOK) / 10_000)
  return [eok > 0 ? `${eok}억` : '', man > 0 ? `${man.toLocaleString('ko-KR')}만` : ''].filter(Boolean).join(' ') || '0'
}
const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const pick = <T extends string>(v: string | null, list: readonly T[], def: T): T => (list.includes(v as T) ? (v as T) : def)

export default function AcquisitionTaxCalculator() {
  const t = useTranslations('acquisitionTaxCalc')
  const sp = useSearchParams()

  const [mode, setMode] = useState<Mode>(() => pick(sp.get('mode'), MODES, 'buy'))
  const [kind, setKind] = useState<Kind>(() => pick(sp.get('kind'), KINDS, 'house'))
  const [price, setPrice] = useState(() => parseNum(sp.get('price') ?? '') || 5 * EOK)
  const [area, setArea] = useState(() => sp.get('area') ?? '84')
  const [owner, setOwner] = useState<Owner>(() => pick(sp.get('owner'), OWNERS, '1'))
  const [region, setRegion] = useState<Region>(() => pick(sp.get('region'), REGIONS, 'seoul'))
  const [relief, setRelief] = useState<Relief>(() => pick(sp.get('relief'), RELIEFS, 'none'))
  const [under1eok, setUnder1eok] = useState(() => sp.get('u1') === '1')
  const [sole, setSole] = useState(() => sp.get('sole') === '1')
  const [g3, setG3] = useState(() => sp.get('g3') !== '0')
  const [gs, setGs] = useState(() => sp.get('gs') === '1')
  const [date, setDate] = useState(() => sp.get('date') ?? '')
  useEffect(() => { if (!date) setDate(today()) }, []) // eslint-disable-line react-hooks/exhaustive-deps -- 오늘 날짜는 클라이언트에서 (정적 HTML 하이드레이션 불일치 방지)
  const [late, setLate] = useState(30)

  useEffect(() => {
    const q = new URLSearchParams()
    if (mode !== 'buy') q.set('mode', mode)
    if (kind !== 'house') q.set('kind', kind)
    q.set('price', String(price))
    if (kind === 'house') q.set('area', area)
    q.set('region', region)
    if (mode === 'buy' && kind === 'house') {
      if (owner !== '1') q.set('owner', owner)
      if (relief !== 'none') q.set('relief', relief)
      if (under1eok) q.set('u1', '1')
    }
    if (mode === 'inherit' && sole) q.set('sole', '1')
    if (mode === 'gift') { if (!g3) q.set('g3', '0'); if (gs) q.set('gs', '1') }
    if (sp.get('date')) q.set('date', date)
    window.history.replaceState(null, '', `?${q}`)
  }, [mode, kind, price, area, owner, region, relief, under1eok, sole, g3, gs, date]) // eslint-disable-line react-hooks/exhaustive-deps

  const house = kind === 'house'
  const areaNum = parseFloat(area) || 0
  const adjusted = (ADJ_REGIONS as readonly string[]).includes(region)
  const input: TaxInput = {
    mode, kind, price, over85: areaNum > 85, adjusted, owner: mode === 'buy' ? owner : '1',
    under1eok, relief: mode === 'buy' ? relief : 'none', inheritSole: sole, giftStd3eok: g3, giftFromSingle: gs,
  }
  const r = calcTax(input)
  const extras = mode === 'buy' ? buyExtras(price, kind, METRO.includes(region)) : null
  const due = /^\d{4}-\d{2}-\d{2}$/.test(date) ? dueDate(date, mode) : ''
  const penalty = latePenalty(r.total, late, false)

  // 취득가별 세금 곡선 (매매 주택)
  const chart = useMemo(() => {
    if (mode !== 'buy' || !house) return []
    const max = Math.max(15, Math.ceil(price / EOK) + 1)
    return Array.from({ length: max * 4 }, (_, k) => {
      const p = (k + 1) * 0.25
      return { p, tax: Math.round(calcTax({ ...input, price: p * EOK }).total / 10_000) }
    })
  }, [mode, house, price, input.over85, adjusted, owner, relief, under1eok]) // eslint-disable-line react-hooks/exhaustive-deps

  // 같은 집, 주택 수별 비교
  const byOwner = mode === 'buy' && house ? OWNERS.map((o) => ({ o, res: calcTax({ ...input, owner: o, relief: 'none' }) })) : []

  const seg = (on: boolean) =>
    `px-2 py-2 rounded-lg text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
  const opt = (on: boolean) =>
    `w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-colors ${on ? 'border-primary bg-primary-soft text-primary font-medium' : 'border-line text-body hover:bg-subtle'}`
  const check = (id: string, on: boolean, set: (v: boolean) => void, label: string, hint?: string) => (
    <label htmlFor={id} className="flex items-start gap-2.5 cursor-pointer">
      <input id={id} type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[var(--primary)]" />
      <span className="text-sm text-body">{label}{hint && <span className="block text-xs text-muted mt-0.5">{hint}</span>}</span>
    </label>
  )

  const rows = [
    { k: 'acq', label: t('result.acquisitionTax'), v: r.acq, rate: r.rate, gross: r.acqGross },
    { k: 'nong', label: t('result.specialTax'), v: r.nong, rate: price ? r.nong / price : 0 },
    { k: 'edu', label: t('result.educationTax'), v: r.edu, rate: price ? r.eduGross / price : 0, gross: r.eduGross },
  ]
  const rateLabel = `${t(`u.mode.${mode}`)} · ${t(`u.kind.${kind}`)}${mode === 'buy' && house ? ` · ${t(`u.owner.${owner}`)}` : ''}`
  const faq = t.raw('u.faq.items') as { q: string; a: string }[]
  const sources = t.raw('u.sources.items') as { label: string; url: string }[]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('u.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <div className="lg:col-span-1">
          <div className="ui-card p-6 space-y-5">
            <MobileResultLink href="#acquisition-tax-result" label={t('u.resultLabel', { price: eokMan(price) })} value={`${won(r.total)}${t('units.won')}`} />
            <div className="grid grid-cols-3 gap-2" role="tablist">
              {MODES.map((m) => (
                <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={seg(mode === m)}>
                  {t(`u.mode.${m}`)}
                </button>
              ))}
            </div>

            <div>
              <p className="block text-sm font-medium text-body mb-2">{t('propertyType.label')}</p>
              <div className="grid grid-cols-3 gap-2">
                {KINDS.map((k) => (
                  <button key={k} onClick={() => setKind(k)} className={seg(kind === k)}>{t(`u.kind.${k}`)}</button>
                ))}
              </div>
              {!house && <p className="text-xs text-muted mt-1.5">{t(`u.kindHint.${kind}`)}</p>}
            </div>

            <div>
              <label htmlFor="at-price" className="block text-sm font-medium text-body mb-2">{t(`u.priceLabel.${mode}`)}</label>
              <div className="relative">
                <input
                  id="at-price" type="text" inputMode="numeric" value={price ? price.toLocaleString('ko-KR') : ''}
                  onChange={(e) => setPrice(Math.min(parseNum(e.target.value), 1_000_000_000_000))}
                  className="ui-field w-full px-4 py-3 pr-10 tabular-nums"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">{t('units.won')}</span>
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-xs text-muted">{eokMan(price)}{t('units.won')}</span>
                <div className="flex gap-1">
                  {(t.raw('u.addButtons') as string[]).map((label, i) => (
                    <button key={label} onClick={() => setPrice((p) => p + [0.1, 0.5, 1][i] * EOK)} className="px-2 py-1 rounded-lg bg-soft text-xs text-body hover:bg-subtle">
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="range" min={EOK / 2} max={20 * EOK} step={EOK / 10} value={Math.min(price, 20 * EOK)}
                onChange={(e) => setPrice(Number(e.target.value))} aria-label={t(`u.priceLabel.${mode}`)}
                className="w-full mt-2 accent-[var(--primary)]"
              />
            </div>

            {house && (
              <div>
                <label htmlFor="at-area" className="block text-sm font-medium text-body mb-2">{t('area.label')}</label>
                <div className="relative">
                  <input id="at-area" type="number" inputMode="decimal" value={area} onChange={(e) => setArea(e.target.value)} className="ui-field w-full px-4 py-3 pr-10" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">{t('units.sqm')}</span>
                </div>
                <p className="text-xs text-muted mt-1.5">
                  {areaNum > 0 ? t('u.areaPyeong', { py: (areaNum / 3.3058).toFixed(1) }) + ' · ' : ''}
                  {areaNum > 85 ? t('u.over85') : t('u.under85')}
                </p>
              </div>
            )}

            <div>
              <label htmlFor="at-region" className="block text-sm font-medium text-body mb-2">{t('u.region.label')}</label>
              <select id="at-region" value={region} onChange={(e) => setRegion(e.target.value as Region)} className="ui-field w-full px-4 py-3">
                <optgroup label={t('u.region.groupAdj')}>
                  {ADJ_REGIONS.map((g) => <option key={g} value={g}>{t(`u.region.${g}`)}</option>)}
                </optgroup>
                <optgroup label={t('u.region.groupNon')}>
                  <option value="metroCity">{t('u.region.metroCity')}</option>
                  <option value="other">{t('u.region.other')}</option>
                </optgroup>
              </select>
              <p className={`text-xs mt-1.5 ${adjusted ? 'text-primary font-medium' : 'text-muted'}`}>
                {adjusted ? t('u.region.isAdj') : t('u.region.isNon')}
              </p>
            </div>

            {mode === 'buy' && house && (
              <>
                <div>
                  <p className="block text-sm font-medium text-body mb-2">{t('u.owner.label')}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {OWNERS.map((o) => (
                      <button key={o} onClick={() => setOwner(o)} className={seg(owner === o)}>{t(`u.owner.${o}`)}</button>
                    ))}
                  </div>
                  <p className="text-xs text-muted mt-1.5">{t('u.owner.hint')}</p>
                </div>
                {owner !== '1' && owner !== '2temp' && check('at-u1', under1eok, setUnder1eok, t('u.under1eok'), t('u.under1eokHint'))}

                <div>
                  <p className="block text-sm font-medium text-body mb-2">{t('u.relief.label')}</p>
                  <div className="space-y-2">
                    {RELIEFS.map((rl) => (
                      <button key={rl} onClick={() => setRelief(rl)} className={opt(relief === rl)}>
                        {t(`u.relief.${rl}`)}
                        {rl !== 'none' && <span className="block text-xs font-normal text-muted mt-0.5">{t(`u.relief.${rl}Hint`)}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {mode === 'inherit' && house && check('at-sole', sole, setSole, t('u.inheritSole'), t('u.inheritSoleHint'))}
            {mode === 'gift' && house && adjusted && (
              <div className="space-y-3">
                {check('at-g3', g3, setG3, t('u.giftStd3eok'), t('u.giftStd3eokHint'))}
                {check('at-gs', gs, setGs, t('u.giftFromSingle'), t('u.giftFromSingleHint'))}
              </div>
            )}
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 space-y-6">
          <div id="acquisition-tax-result" className="ui-card p-6 space-y-5 scroll-mt-20">
            <div>
              <p className="text-sm text-muted">{t('u.resultLabel', { price: eokMan(price) })}</p>
              <p className="text-3xl font-bold text-fg tabular-nums mt-1">{won(r.total)}{t('units.won')}</p>
              <p className="text-sm text-sub mt-1">
                {t('result.effectiveRate')} <span className="font-semibold text-primary tabular-nums">{r.effRate.toFixed(2)}%</span>
                <span className="text-muted"> · {rateLabel}</span>
              </p>
            </div>

            <div className="divide-y divide-line border-y border-line">
              {rows.map((row) => (
                <div key={row.k} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-body">{row.label}</p>
                    <p className="text-xs text-muted tabular-nums">
                      {row.v === 0 && row.k === 'nong' ? t('u.nongExempt') : `${t('u.rateOfPrice')} ${pct(row.rate, 4)}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-semibold text-fg tabular-nums">{won(row.v)}{t('units.won')}</p>
                    {row.gross !== undefined && row.gross !== row.v && (
                      <p className="text-xs text-muted line-through tabular-nums">{won(row.gross)}{t('units.won')}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {r.relief > 0 && (
              <div className="bg-primary-soft text-primary rounded-2xl p-4 text-sm">
                {t('u.reliefApplied', { name: t(`u.relief.${relief}`), amount: won(r.relief + (r.eduGross - r.edu)) })}
              </div>
            )}
            {(r.heavy || r.reliefBlocked) && (
              <div className="bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm space-y-1">
                {r.heavy && <p>{t('u.heavyWarn', { rate: pct(r.rate) })}</p>}
                {r.reliefBlocked && <p>{t(`u.reliefBlocked.${r.reliefBlocked}`)}</p>}
              </div>
            )}

            <ShareResult
              card={{
                tool: t('title'),
                label: t('u.share.label', { price: eokMan(price) }),
                headline: `${won(r.total)}${t('units.won')}`,
                sub: `${rateLabel} · ${t('result.effectiveRate')} ${r.effRate.toFixed(2)}%`,
                rows: [
                  ...rows.map((row) => ({ label: row.label, value: `${won(row.v)}${t('units.won')}` })),
                  ...(extras ? [{ label: t('u.cost.grand'), value: `${eokMan(price + r.total + extras.total)}${t('units.won')}` }] : []),
                ],
              }}
              text={t('u.share.text', { price: eokMan(price), tax: won(r.total), rate: r.effRate.toFixed(2) })}
            />
          </div>

          {/* 집 살 때 총비용 */}
          {extras && (
            <div className="ui-card p-6 space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-fg">{t('u.cost.title')}</h2>
                <p className="text-sm text-muted mt-1">{t('u.cost.desc')}</p>
              </div>
              <div>
                <p className="text-sm text-muted">{t('u.cost.grand')}</p>
                <p className="text-3xl font-bold text-fg tabular-nums mt-1">{won(price + r.total + extras.total)}{t('units.won')}</p>
                <p className="text-sm text-sub mt-1">{t('u.cost.extraSum', { amount: won(r.total + extras.total), pct: (((r.total + extras.total) / price) * 100).toFixed(2) })}</p>
              </div>
              <div className="divide-y divide-line border-y border-line text-sm">
                {[
                  { k: 'price', v: price },
                  { k: 'tax', v: r.total },
                  { k: 'broker', v: extras.broker },
                  { k: 'brokerVat', v: extras.brokerVat },
                  { k: 'bond', v: extras.bond },
                  { k: 'stamp', v: extras.stamp },
                  { k: 'legal', v: extras.legal },
                ].map((row) => (
                  <div key={row.k} className="flex items-center justify-between py-2.5">
                    <span className="text-body">{t(`u.cost.${row.k}`)}</span>
                    <span className="font-medium text-fg tabular-nums">{won(row.v)}{t('units.won')}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-faint">{t(house ? 'u.cost.noteHouse' : 'u.cost.noteOther')}</p>
            </div>
          )}

          {/* 주택 수별 비교 */}
          {byOwner.length > 0 && (
            <div className="ui-card p-6 space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-fg">{t('u.compare.title')}</h2>
                <p className="text-sm text-muted mt-1">{t('u.compare.desc', { region: t(`u.region.${region}`), status: adjusted ? t('u.compare.adj') : t('u.compare.non') })}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-muted">
                      <th className="text-left font-medium py-2">{t('u.owner.label')}</th>
                      <th className="text-right font-medium py-2">{t('u.compare.rate')}</th>
                      <th className="text-right font-medium py-2">{t('result.totalTax')}</th>
                      <th className="text-right font-medium py-2">{t('u.compare.diff')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byOwner.map(({ o, res }) => {
                      const cur = o === owner
                      return (
                        <tr key={o} className={`border-b border-line ${cur ? 'bg-primary-soft' : ''}`}>
                          <td className={`py-2.5 pl-1 ${cur ? 'text-primary font-semibold' : 'text-body'}`}>{t(`u.owner.${o}`)}</td>
                          <td className="py-2.5 text-right tabular-nums text-sub">{pct(res.rate, 4)}</td>
                          <td className="py-2.5 text-right tabular-nums font-semibold text-fg">{won(res.total)}{t('units.won')}</td>
                          <td className="py-2.5 pr-1 text-right tabular-nums text-sub">
                            {res.total === byOwner[0].res.total ? '-' : `+${won(res.total - byOwner[0].res.total)}`}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 취득가별 세금 */}
          {chart.length > 0 && (
            <div className="ui-card p-6">
              <h2 className="text-lg font-semibold text-fg">{t('u.chart.title')}</h2>
              <p className="text-sm text-muted mt-1">{t('u.chart.desc')}</p>
              <div className="h-64 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chart} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                    <XAxis dataKey="p" type="number" domain={[0, 'dataMax']} tickFormatter={(v: number) => `${v}억`} tick={{ fontSize: 11, fill: 'var(--muted)' }} stroke="var(--line)" />
                    <YAxis tickFormatter={(v: number) => (v >= 10_000 ? `${(v / 10_000).toFixed(1)}억` : `${v.toLocaleString()}만`)} tick={{ fontSize: 11, fill: 'var(--muted)' }} width={56} stroke="var(--line)" />
                    <Tooltip
                      labelFormatter={(v) => `${t('u.chart.price')} ${v}억`}
                      formatter={(v) => [`${Number(v ?? 0).toLocaleString()}만${t('units.won')}`, t('result.totalTax')]}
                    />
                    <ReferenceLine x={6} stroke="var(--faint)" strokeDasharray="4 3" label={{ value: '6억', position: 'top', fontSize: 10, fill: 'var(--muted)' }} />
                    <ReferenceLine x={9} stroke="var(--faint)" strokeDasharray="4 3" label={{ value: '9억', position: 'top', fontSize: 10, fill: 'var(--muted)' }} />
                    <ReferenceLine x={price / EOK} stroke="var(--fg)" strokeDasharray="2 3" label={{ value: t('u.chart.now'), position: 'insideTopRight', fontSize: 10, fill: 'var(--fg)' }} />
                    <Line type="linear" dataKey="tax" stroke="var(--primary)" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 신고·납부 기한 */}
          <div className="ui-card p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-fg">{t('u.due.title')}</h2>
              <p className="text-sm text-muted mt-1">{t(`u.due.rule.${mode}`)}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="at-date" className="block text-sm font-medium text-body mb-2">{t(`u.due.date.${mode}`)}</label>
                <input id="at-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="ui-field w-full px-4 py-3" />
              </div>
              <div className="bg-subtle rounded-2xl p-4">
                <p className="text-sm text-muted">{t('u.due.deadline')}</p>
                <p className="text-2xl font-bold text-fg tabular-nums mt-1">{due || '-'}</p>
              </div>
            </div>
            <div>
              <label htmlFor="at-late" className="block text-sm font-medium text-body mb-2">{t('u.due.lateLabel')}</label>
              <div className="flex items-center gap-3">
                <input id="at-late" type="number" min={0} max={3650} value={late} onChange={(e) => setLate(Math.max(0, Math.min(3650, Number(e.target.value) || 0)))} className="ui-field w-28 px-4 py-2.5" />
                <span className="text-sm text-body">{t('u.due.lateResult', { report: won(penalty.report), delay: won(penalty.delay), total: won(penalty.total) })}</span>
              </div>
              <p className="text-xs text-faint mt-2">{t('u.due.lateNote')}</p>
            </div>
          </div>

          <p className="text-xs text-faint">{t('u.disclaimer')}</p>
        </div>
      </div>

      {/* 가이드 */}
      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-muted">
                {(t.raw('u.rateTable.head') as string[]).map((h, i) => (
                  <th key={h} className={`font-medium py-2 ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(t.raw('u.rateTable.rows') as string[][]).map((row) => (
                <tr key={row[0]} className="border-b border-line">
                  {row.map((c, i) => (
                    <td key={i} className={`py-2 ${i === 0 ? 'text-body' : 'text-right tabular-nums text-sub'} ${i === row.length - 1 ? 'font-semibold text-fg' : ''}`}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-faint mt-2">{t('u.rateTable.note')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(['heavy', 'relief', 'tax', 'tips'] as const).map((sec) => (
            <div key={sec}>
              <h3 className="font-semibold text-fg mb-3">{t(`u.guide.${sec}.title`)}</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-sub">
                {(t.raw(`u.guide.${sec}.items`) as string[]).map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>

        <div>
          <h3 className="font-semibold text-fg mb-3">{t('u.faq.title')}</h3>
          <div className="divide-y divide-line border-y border-line">
            {faq.map((f) => (
              <details key={f.q} className="py-3">
                <summary className="cursor-pointer text-sm font-medium text-body">{f.q}</summary>
                <p className="text-sm text-sub mt-2 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>

        <div className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-2">
          <p className="font-medium text-body">{t('u.sources.title')}</p>
          <ul className="space-y-1">
            {sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{s.label}</a>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">{t('u.sources.asOf', { limit: won(RELIEF_LIMIT.first) })}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(['dsr-calculator', 'bogeumjari-loan', 'real-estate-calculator', 'comprehensive-property-tax', 'capital-gains-tax', 'inheritance-gift-tax'] as const).map((href) => (
            <Link key={href} href={`/${href}/`} className="ui-btn-soft px-3 py-2 text-sm">{t(`u.links.${href}`)}</Link>
          ))}
        </div>
      </div>
    </div>
  )
}
