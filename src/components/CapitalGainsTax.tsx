'use client'

import { useState, useMemo, useEffect } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/capitalGainsTax'
import { useSearchParams } from '@/hooks/useSearchParams'
import { Check, X, ExternalLink } from 'lucide-react'
import ShareResult from '@/components/ShareResult'
import DatePicker from '@/components/ui/DatePicker'
import { calcCgt, reportDue, simulate, isDate, fullMonths, ymd, BRACKETS, generalLthd, oneHouseLthd, type Kind, type CgtInput } from '@/utils/capitalGainsTax'
import { calcTax } from '@/utils/acquisitionTax'
import { saleFee } from '@/utils/brokerageFee'

const KINDS: readonly Kind[] = ['house', 'land', 'nonbiz', 'presale']
const won = (v: number) => Math.round(v).toLocaleString('ko-KR')
const pct = (v: number) => `${+(v * 100).toFixed(2)}%`
const num = (s: string | null) => Number((s ?? '').replace(/[^\d]/g, '')) || 0
/** 15억 3,000만 */
function eok(v: number): string {
  const e = Math.floor(v / 1e8), m = Math.floor((v % 1e8) / 1e4)
  return [e ? `${e}억` : '', m ? `${m.toLocaleString('ko-KR')}만` : ''].filter(Boolean).join(' ') || '0'
}

export default function CapitalGainsTax() {
  const t = useTranslations('capitalGainsTax')
  const sp = useSearchParams()
  const legacy = sp.get('sp') !== null // 예전 공유 링크 (ia 하나로 조정지역 표시)

  const [kind, setKind] = useState<Kind>(() => {
    const k = sp.get('k') as Kind
    return KINDS.includes(k) ? k : sp.get('pt') === 'general' ? 'land' : 'house'
  })
  const [sale, setSale] = useState(() => num(sp.get('sp')) || 15e8)
  const [acq, setAcq] = useState(() => num(sp.get('ap')) || 8e8)
  const [expense, setExpense] = useState(() => (sp.get('ex') !== null ? num(sp.get('ex')) : legacy ? 0 : 30_000_000))
  const [acqDate, setAcqDate] = useState(() => sp.get('ad') ?? '2018-06-01')
  const [saleDate, setSaleDate] = useState(() => sp.get('sd') ?? '')
  useEffect(() => { if (!saleDate) setSaleDate(ymd(new Date())) }, []) // eslint-disable-line react-hooks/exhaustive-deps -- 오늘 날짜는 클라이언트에서 (하이드레이션 불일치 방지)
  const [houses, setHouses] = useState<1 | 2 | 3>(() => { const h = sp.get('hc'); return h === '2' ? 2 : h === '3' || h === '3plus' ? 3 : 1 })
  const [temp, setTemp] = useState(() => sp.get('tp') === '1')
  const [newAcqDate, setNewAcqDate] = useState(() => sp.get('nd') ?? '')
  const [newContract, setNewContract] = useState(() => sp.get('nc') ?? '')
  const [newAdjusted, setNewAdjusted] = useState(() => sp.get('na') === '1')
  const [adjusted, setAdjusted] = useState(() => sp.get('ia') === '1')
  const [acqAdjusted, setAcqAdjusted] = useState(() => (sp.get('aa') !== null ? sp.get('aa') === '1' : legacy ? sp.get('ia') === '1' : true))
  const [residence, setResidence] = useState(() => sp.get('ry') ?? (legacy ? '' : '5'))
  const [live, setLive] = useState(() => sp.get('lv') !== '0')
  const [grace, setGrace] = useState(() => sp.get('gr') === '1' || sp.get('as') === '0')
  // 8.4 이후 조정지역 새 집만 계약일이 기한(2년/3년)을 가름 — 그 외엔 입력 숨기고 무시
  const showContract = newAdjusted && newAcqDate >= '2026-08-04'

  useEffect(() => {
    const q = new URLSearchParams()
    if (kind !== 'house') q.set('k', kind)
    q.set('sp', String(sale)); q.set('ap', String(acq)); q.set('ex', String(expense))
    q.set('ad', acqDate)
    if (saleDate) q.set('sd', saleDate)
    if (kind === 'house') {
      if (houses !== 1) q.set('hc', String(houses))
      if (houses === 2 && temp) {
        q.set('tp', '1'); if (newAcqDate) q.set('nd', newAcqDate); if (newAdjusted) q.set('na', '1')
        if (showContract && newContract) q.set('nc', newContract)
      }
      if (adjusted) q.set('ia', '1')
      q.set('aa', acqAdjusted ? '1' : '0')
      if (residence) q.set('ry', residence)
      if (!live) q.set('lv', '0')
      if (grace) q.set('gr', '1')
    }
    window.history.replaceState(null, '', `?${q}`)
  }, [kind, sale, acq, expense, acqDate, saleDate, houses, temp, newAcqDate, newContract, newAdjusted, adjusted, acqAdjusted, residence, live, grace, showContract])

  const house = kind === 'house'
  const ready = sale > 0 && isDate(acqDate) && isDate(saleDate) && saleDate >= acqDate
  const input: CgtInput = {
    kind, sale, acq, expense, acqDate, saleDate,
    houses: house ? houses : 1, temp: house && houses === 2 && temp, newAcqDate, newAdjusted,
    newContractDate: showContract ? newContract : '',
    adjusted: house && adjusted, acqAdjusted: house && acqAdjusted, residence: house ? Number(residence) || 0 : 0,
    grace: house && grace,
  }
  const r = ready ? calcCgt(input) : null
  const sim = useMemo(() => (ready ? simulate(input, live) : []), [ready, JSON.stringify(input), live]) // eslint-disable-line react-hooks/exhaustive-deps
  const proposal = r && r.surcharge > 0 && r.hold >= 2
    ? calcCgt({ ...input, surchargeOverride: { two: 0.05, three: 0.1 } }) : null
  const due = ready ? reportDue(saleDate) : ''
  const oneHouseLike = house && (houses === 1 || (houses === 2 && temp))
  const showGrace = house && houses >= 2 && adjusted && saleDate > '2026-05-09' && (r?.hold ?? 0) >= 2 && !(r && (r.exempt === 'full' || r.exempt === 'partial'))

  // 보유기간 표시: N년 M개월
  const holdM = ready ? fullMonths(acqDate, saleDate) : 0
  const holdLabel = ready ? t('input.holdShow', { y: Math.floor(holdM / 12), m: holdM % 12 }) : ''

  const estimate = () => {
    const tk = kind === 'house' ? 'house' : 'building'
    const acqTax = kind === 'presale' ? 0 : calcTax({
      mode: 'buy', kind: tk, price: acq, over85: false, adjusted: false, owner: '1', under1eok: false,
      relief: 'none', inheritSole: false, giftStd3eok: true, giftFromSingle: false,
    }).total
    const prop = kind === 'house' || kind === 'presale' ? 'house' : 'nonHouse'
    setExpense(Math.round(acqTax + saleFee(acq, prop) + saleFee(sale, prop)))
  }

  const seg = (on: boolean) =>
    `px-2 py-2 rounded-lg text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
  const check = (id: string, on: boolean, set: (v: boolean) => void, label: string, hint?: string) => (
    <label htmlFor={id} className="flex items-start gap-2.5 cursor-pointer">
      <input id={id} type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[var(--primary)]" />
      <span className="text-sm text-body">{label}{hint && <span className="block text-xs text-muted mt-0.5">{hint}</span>}</span>
    </label>
  )
  const money = (id: string, label: string, v: number, set: (n: number) => void, extra?: React.ReactNode) => (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label htmlFor={id} className="text-sm font-medium text-body">{label}</label>
        {extra}
      </div>
      <input id={id} inputMode="numeric" value={v ? v.toLocaleString('ko-KR') : ''} placeholder="0"
        onChange={(e) => set(num(e.target.value))} className="ui-field w-full px-4 py-3 tabular-nums" />
      {v > 0 && <p className="text-xs text-muted mt-1">{eok(v)}{t('wonUnit')}</p>}
    </div>
  )

  const verdict = !r ? '' : r.exempt === 'full' ? t('verdict.full') : r.exempt === 'partial' ? t('verdict.partial', { p: pct(r.taxableRatio) })
    : r.exempt === 'none' ? t('verdict.none') : t(`verdict.${r.surcharge > 0 ? 'surcharge' : r.shortRate ? 'short' : 'taxable'}`)
  const rateText = !r ? '' : r.base <= 0 ? '-' : r.rate.type === 'flat' ? t('rate.flat', { r: pct(r.rate.rate) })
    : t(r.rate.add ? 'rate.progAdd' : 'rate.prog', { r: pct(r.rate.rate), a: pct(r.rate.add), d: won(r.rate.deduction) })

  const steps = r ? [
    { label: t('salePrice'), v: sale },
    { label: `(−) ${t('acqPrice')}`, v: acq },
    { label: `(−) ${t('expenses')}`, v: expense },
    { label: t('transferProfitLabel'), v: r.profit, strong: true },
    ...(r.exemptProfit > 0 ? [{ label: `(−) ${t('step.exempt')}`, v: r.exemptProfit }] : []),
    { label: `(−) ${t('lthdLabel')} ${r.lthdTable === 'excluded' ? t('step.lthdExcluded') : `(${pct(r.lthdRate)})`}`, v: r.lthd },
    { label: t('transferIncomeLabel'), v: r.income, strong: true },
    { label: `(−) ${t('basicDeductionLabel')}`, v: r.basic },
    { label: t('taxBaseLabel'), v: r.base, strong: true },
  ] : []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <div className="lg:col-span-1">
          <div className="ui-card p-6 space-y-5">
            <div>
              <p className="text-sm font-medium text-body mb-2">{t('propertyType')}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {KINDS.map((k) => <button key={k} type="button" onClick={() => setKind(k)} className={seg(kind === k)}>{t(`kind.${k}`)}</button>)}
              </div>
            </div>

            {money('cgt-sale', t('salePrice'), sale, setSale)}
            {money('cgt-acq', t('acqPrice'), acq, setAcq)}
            {money('cgt-exp', t('expenses'), expense, setExpense,
              <button type="button" onClick={estimate} className="text-xs text-primary font-medium hover:underline">{t('input.estimate')}</button>)}
            <p className="text-xs text-muted -mt-3">{t('input.expenseHint')}</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-sm font-medium text-body mb-1">{t('acqDate')}</p>
                <DatePicker label={t('acqDate')} value={acqDate} onChange={setAcqDate} />
              </div>
              <div>
                <p className="text-sm font-medium text-body mb-1">{t('saleDate')}</p>
                <DatePicker label={t('saleDate')} value={saleDate} onChange={setSaleDate} />
              </div>
            </div>
            {holdLabel && <p className="text-sm text-sub -mt-2">{t('holdingPeriod')} <strong className="text-fg">{holdLabel}</strong></p>}

            {house && (
              <>
                <div>
                  <p className="text-sm font-medium text-body mb-2">{t('houseCount')}</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {([1, 2, 3] as const).map((h) => <button key={h} type="button" onClick={() => setHouses(h)} className={seg(houses === h)}>{t(`input.houses${h}`)}</button>)}
                  </div>
                  <p className="text-xs text-muted mt-1">{t('input.housesHint')}</p>
                </div>

                {houses === 2 && (
                  <div className="grid grid-cols-2 gap-1.5">
                    <button type="button" onClick={() => setTemp(true)} className={seg(temp)}>{t('input.temp')}</button>
                    <button type="button" onClick={() => setTemp(false)} className={seg(!temp)}>{t('input.notTemp')}</button>
                  </div>
                )}
                {houses === 2 && temp && (
                  <div className="bg-subtle rounded-2xl p-4 space-y-3">
                    <div>
                      <p className="text-sm font-medium text-body mb-1">{t('input.newAcqDate')}</p>
                      <DatePicker label={t('input.newAcqDate')} value={newAcqDate} onChange={setNewAcqDate} />
                    </div>
                    {check('cgt-na', newAdjusted, setNewAdjusted, t('input.newAdjusted'))}
                    {showContract && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-body">{t('input.newContract')}</p>
                          {newContract && (
                            <button type="button" onClick={() => setNewContract('')} className="text-xs text-primary font-medium hover:underline">{t('input.newContractClear')}</button>
                          )}
                        </div>
                        <DatePicker label={t('input.newContract')} value={newContract} onChange={setNewContract} placeholder={t('input.newContractPlaceholder')} />
                        <p className="text-xs text-muted mt-1">{t('input.newContractHint')}</p>
                      </div>
                    )}
                  </div>
                )}

                {check('cgt-ia', adjusted, setAdjusted, t('input.adjusted'), t('input.adjustedHint'))}
                {oneHouseLike && check('cgt-aa', acqAdjusted, setAcqAdjusted, t('input.acqAdjusted'), t('input.acqAdjustedHint'))}

                {oneHouseLike && (
                  <div>
                    <label htmlFor="cgt-ry" className="block text-sm font-medium text-body mb-1">{t('residenceYears')} ({t('yearsUnit')})</label>
                    <input id="cgt-ry" type="number" min="0" max="50" step="0.5" value={residence} placeholder="0"
                      onChange={(e) => setResidence(e.target.value)} className="ui-field w-full px-4 py-3 tabular-nums" />
                    <div className="mt-2">{check('cgt-lv', live, setLive, t('input.live'))}</div>
                  </div>
                )}

                {showGrace && (
                  <div className="bg-amber-50 text-amber-800 rounded-2xl p-4 space-y-2">
                    <p className="text-xs">{t('input.graceNote')}</p>
                    {check('cgt-gr', grace, setGrace, t('input.grace'))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 space-y-4">
          {!r ? (
            <div className="ui-card p-12 text-center text-muted">{t('emptyState')}</div>
          ) : (
            <>
              <div className="ui-card p-6">
                <p className="text-sm text-muted">{t('result.totalLabel')}</p>
                <p className="text-4xl font-bold text-fg tabular-nums mt-1">{won(r.total)}<span className="text-xl ml-1">{t('wonUnit')}</span></p>
                <p className="text-sm font-medium text-primary mt-2">{verdict}</p>

                {r.checks.length > 0 && (
                  <ul className="mt-4 grid sm:grid-cols-2 gap-2">
                    {r.checks.map((c) => (
                      <li key={c.key} className="flex items-start gap-2 text-sm text-body">
                        {c.ok ? <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" aria-label="ok" /> : <X className="w-4 h-4 text-red-600 mt-0.5 shrink-0" aria-label="no" />}
                        <span>{t(`check.${c.key}`, { d: c.value ?? '', y: r.tempPeriod })}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {r.tempRule && <p className="text-xs text-muted mt-2">{t(`tempRule.${r.tempRule}`)}</p>}

                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                  {[
                    [t('calculatedTaxLabel'), `${won(r.tax)}${t('wonUnit')}`],
                    [t('localTaxLabel'), `${won(r.local)}${t('wonUnit')}`],
                    [t('result.effective'), r.profit ? pct(r.total / r.profit) : '-'],
                    [t('result.afterTax'), `${eok(Math.max(0, r.profit - r.total))}${t('wonUnit')}`],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-subtle rounded-xl p-3">
                      <dt className="text-xs text-muted">{k}</dt>
                      <dd className="text-sm font-semibold text-fg tabular-nums mt-0.5">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <ShareResult
                card={{
                  tool: t('title'), label: t('result.totalLabel'), headline: `${won(r.total)}${t('wonUnit')}`, sub: verdict,
                  rows: [
                    { label: t('transferProfitLabel'), value: `${eok(r.profit)}${t('wonUnit')}` },
                    { label: t('holdingPeriod'), value: holdLabel },
                    { label: t('taxRateLabel'), value: rateText },
                  ],
                }}
                text={t('share.text', { v: won(r.total) })}
                fileName="capital-gains-tax"
              />

              {/* 신고 기한 */}
              <div className="ui-card p-6">
                <h2 className="text-base font-semibold text-fg">{t('due.title')}</h2>
                <p className="text-2xl font-bold text-fg tabular-nums mt-2">{due}</p>
                <p className="text-sm text-sub mt-1">{t('due.desc')}</p>
                <div className="flex flex-wrap gap-2 mt-4">
                  <a href="https://www.hometax.go.kr" target="_blank" rel="noopener noreferrer" className="ui-btn px-4 py-2 text-sm inline-flex items-center gap-1.5">
                    {t('due.hometax')} <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <a href="https://www.wetax.go.kr" target="_blank" rel="noopener noreferrer" className="ui-btn-soft px-4 py-2 text-sm inline-flex items-center gap-1.5">
                    {t('due.wetax')} <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <p className="text-xs text-muted mt-3">{t('due.penalty')}</p>
              </div>

              {/* 단계별 계산 */}
              <div className="ui-card p-6">
                <h2 className="text-base font-semibold text-fg mb-3">{t('breakdownTitle')}</h2>
                <div className="divide-y divide-line">
                  {steps.map((s, i) => (
                    <div key={i} className={`flex justify-between gap-3 py-2.5 text-sm ${s.strong ? 'font-semibold text-fg' : 'text-sub'}`}>
                      <span>{s.label}</span><span className="tabular-nums">{won(s.v)}{t('wonUnit')}</span>
                    </div>
                  ))}
                  <div className="flex justify-between gap-3 py-2.5 text-sm text-sub">
                    <span>{t('taxRateLabel')}</span><span className="text-right">{rateText}</span>
                  </div>
                  <div className="flex justify-between gap-3 py-2.5 text-sm font-semibold text-fg">
                    <span>{t('calculatedTaxLabel')}</span><span className="tabular-nums">{won(r.tax)}{t('wonUnit')}</span>
                  </div>
                  <div className="flex justify-between gap-3 py-2.5 text-sm text-sub">
                    <span>(+) {t('localTaxLabel')} (10%)</span><span className="tabular-nums">{won(r.local)}{t('wonUnit')}</span>
                  </div>
                  <div className="flex justify-between gap-3 py-3 text-base font-bold text-fg">
                    <span>{t('totalTaxLabel')}</span><span className="tabular-nums">{won(r.total)}{t('wonUnit')}</span>
                  </div>
                </div>
                {r.lthdTable === 'oneHouse' && (
                  <p className="text-xs text-muted mt-2">{t('step.lthdSplit', { h: pct(r.lthdHoldRate), r: pct(r.lthdResRate) })}</p>
                )}
              </div>

              {/* 더 보유·거주하면 */}
              <div className="ui-card p-6">
                <h2 className="text-base font-semibold text-fg">{t('sim.title')}</h2>
                <p className="text-xs text-muted mt-1">{t(oneHouseLike && live ? 'sim.assumeLive' : 'sim.assume')}</p>
                {sim.length === 0 ? (
                  <p className="text-sm text-sub mt-4">{t('sim.none')}</p>
                ) : (
                  <div className="overflow-x-auto mt-3">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-muted text-xs">
                          <th className="py-2 font-medium">{t('sim.when')}</th>
                          <th className="py-2 font-medium text-right">{t('sim.tax')}</th>
                          <th className="py-2 font-medium text-right">{t('sim.saving')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sim.map((s) => (
                          <tr key={s.date} className="border-t border-line">
                            <td className="py-2.5 text-body">{t('sim.after', { m: s.months })}<span className="block text-xs text-muted">{s.date}</span></td>
                            <td className="py-2.5 text-right tabular-nums text-fg">{won(s.total)}{t('wonUnit')}</td>
                            <td className="py-2.5 text-right tabular-nums font-semibold text-primary">−{won(s.saving)}{t('wonUnit')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {proposal && (
                <div className="bg-subtle rounded-2xl p-5 text-sm text-sub">
                  <p className="font-semibold text-fg mb-1">{t('proposal.title')}</p>
                  <p>{t('proposal.desc', { v: won(proposal.total), d: won(r.total - proposal.total) })}</p>
                </div>
              )}

              <div className="bg-amber-50 text-amber-800 rounded-2xl p-5">
                <p className="text-sm font-semibold mb-2">{t('cautionTitle')}</p>
                <ul className="space-y-1 text-xs list-disc pl-4">
                  {(t.raw('cautionItems') as string[]).map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 가이드 */}
      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guideTitle')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-subtle rounded-2xl p-5">
            <h3 className="font-semibold text-fg mb-3">{t('guideStepsTitle')}</h3>
            <ol className="space-y-1.5 text-sm text-sub list-decimal pl-5">
              {(t.raw('guideSteps') as string[]).map((s, i) => <li key={i}>{s}</li>)}
            </ol>
          </div>
          <div className="bg-subtle rounded-2xl p-5">
            <h3 className="font-semibold text-fg mb-3">{t('guideExemptTitle')}</h3>
            <ul className="space-y-1.5 text-sm text-sub list-disc pl-5">
              {(t.raw('guideExemptItems') as string[]).map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
          <div className="bg-subtle rounded-2xl p-5">
            <h3 className="font-semibold text-fg mb-3">{t('guideLthdTitle')}</h3>
            <table className="w-full text-xs text-sub">
              <thead>
                <tr className="text-muted">
                  <th className="text-left py-1 font-medium">{t('guideLthdPeriod')}</th>
                  <th className="text-right py-1 font-medium">{t('guideLthdGeneral')}</th>
                  <th className="text-right py-1 font-medium">{t('guide.lthdHold')}</th>
                  <th className="text-right py-1 font-medium">{t('guide.lthdRes')}</th>
                </tr>
              </thead>
              <tbody>
                {[2, 3, 4, 5, 6, 8, 10, 15].map((y) => {
                  const one = oneHouseLthd(y, y)
                  return (
                    <tr key={y} className="border-t border-line">
                      <td className="py-1">{t('guide.years', { y })}</td>
                      <td className="text-right py-1 tabular-nums">{pct(generalLthd(y))}</td>
                      <td className="text-right py-1 tabular-nums">{pct(one.hold)}</td>
                      <td className="text-right py-1 tabular-nums">{pct(one.res)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <p className="text-xs text-muted mt-2">{t('guide.lthdNote')}</p>
          </div>
          <div className="bg-subtle rounded-2xl p-5">
            <h3 className="font-semibold text-fg mb-3">{t('guideTaxRateTitle')}</h3>
            <table className="w-full text-xs text-sub">
              <thead>
                <tr className="text-muted">
                  <th className="text-left py-1 font-medium">{t('guideTaxRateBase')}</th>
                  <th className="text-right py-1 font-medium">{t('guideTaxRateRate')}</th>
                  <th className="text-right py-1 font-medium">{t('progressiveDeductionLabel')}</th>
                </tr>
              </thead>
              <tbody>
                {BRACKETS.map((b, i) => (
                  <tr key={i} className="border-t border-line">
                    <td className="py-1">{b.upTo === Infinity ? t('guide.over', { v: eok(BRACKETS[i - 1].upTo) }) : t('guide.upTo', { v: eok(b.upTo) })}</td>
                    <td className="text-right py-1 tabular-nums">{pct(b.rate)}</td>
                    <td className="text-right py-1 tabular-nums">{b.ded ? eok(b.ded) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-subtle rounded-2xl p-5 md:col-span-2">
            <h3 className="font-semibold text-fg mb-3">{t('guide.shortTitle')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-sub min-w-[420px]">
                <thead>
                  <tr className="text-muted">
                    {(t.raw('guide.shortHead') as string[]).map((h, i) => <th key={i} className={`py-1 font-medium ${i ? 'text-right' : 'text-left'}`}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {(t.raw('guide.shortRows') as string[][]).map((row, i) => (
                    <tr key={i} className="border-t border-line">
                      {row.map((c, j) => <td key={j} className={`py-1 ${j ? 'text-right' : ''}`}>{c}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted mt-2">{t('guide.shortNote')}</p>
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-fg mb-3">{t('faq.title')}</h3>
          <div className="space-y-2">
            {(t.raw('faq.items') as { q: string; a: string }[]).map((f, i) => (
              <details key={i} className="bg-subtle rounded-xl p-4">
                <summary className="text-sm font-medium text-fg cursor-pointer">{f.q}</summary>
                <p className="text-sm text-sub mt-2">{f.a}</p>
              </details>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold text-fg mb-2">{t('sources.title')}</h3>
            <ul className="space-y-1 text-sm">
              {(t.raw('sources.items') as { label: string; url: string }[]).map((s) => (
                <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{s.label}</a></li>
              ))}
            </ul>
            <p className="text-xs text-muted mt-2">{t('sources.asOf')}</p>
          </div>
          <div>
            <h3 className="font-semibold text-fg mb-2">{t('related.title')}</h3>
            <ul className="space-y-1 text-sm">
              {(t.raw('related.items') as { label: string; href: string }[]).map((s) => (
                <li key={s.href}><a href={s.href} className="text-primary hover:underline">{s.label}</a></li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
