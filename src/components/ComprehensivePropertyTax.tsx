'use client'

import { useState, useEffect, useMemo, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { Plus, Trash2, RotateCcw, ExternalLink } from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import AddToCalendar, { useDeadlineEvent } from '@/components/AddToCalendar'
import '@/lib/i18n/ns/comprehensivePropertyTax'
import { useSearchParams } from '@/hooks/useSearchParams'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import DatePicker from '@/components/ui/DatePicker'
import {
  holdingTax, type HoldingInput, type Bill, JONGBU_GENERAL, JONGBU_HEAVY, TAX_YEAR, BILL_TOLERANCE,
  compareBill, jongbuDates, tempDeadlines,
} from '@/utils/propertyHoldingTax'
import { todayKST, daysBetween, weekday, isValidDate } from '@/utils/dday'

const EOK = 100_000_000
const MAX_HOUSES = 10
const MAX_PRICE = 1_000_000_000_000
const won = (v: number) => Math.round(v).toLocaleString('ko-KR')
const pct = (v: number, d = 2) => `${(v * 100).toFixed(d).replace(/\.?0+$/, '')}%`
const parseNum = (s: string) => Number(s.replace(/[^\d]/g, '')) || 0
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
function eokMan(v: number): string {
  const eok = Math.floor(v / EOK)
  const man = Math.floor((v % EOK) / 10_000)
  return [eok > 0 ? `${eok.toLocaleString('ko-KR')}억` : '', man > 0 ? `${man.toLocaleString('ko-KR')}만` : ''].filter(Boolean).join(' ') || '0'
}
const RELATED = ['/acquisition-tax', '/capital-gains-tax', '/real-estate-calculator', '/inheritance-gift-tax', '/health-insurance', '/brokerage-fee'] as const
const RELATED_KEYS: Record<(typeof RELATED)[number], string> = {
  '/acquisition-tax': 'acquisition', '/capital-gains-tax': 'capitalGains', '/real-estate-calculator': 'realEstate',
  '/inheritance-gift-tax': 'inheritance', '/health-insurance': 'healthInsurance', '/brokerage-fee': 'brokerage',
}

interface House { id: number; price: number }
const noSubscribe = () => () => {}

export default function ComprehensivePropertyTax() {
  const t = useTranslations('comprehensivePropertyTax')
  const sp = useSearchParams()

  const [houses, setHouses] = useState<House[]>(() => {
    const ps = (sp.get('p') ?? '').split(',').map(parseNum).filter((v) => v > 0).slice(0, MAX_HOUSES)
    return (ps.length ? ps : [15 * EOK]).map((price, i) => ({ id: i + 1, price: Math.min(price, MAX_PRICE) }))
  })
  const [oneHouse, setOneHouse] = useState(() => sp.get('one') !== '0')
  const [joint, setJoint] = useState(() => sp.get('j') === '1')
  const [share, setShare] = useState(() => clamp(parseNum(sp.get('sh') ?? '') || 50, 1, 99))
  const [age, setAge] = useState(() => clamp(parseNum(sp.get('age') ?? '') || 55, 0, 120))
  const [years, setYears] = useState(() => clamp(parseNum(sp.get('yrs') ?? '') || 7, 0, 80))
  const [urban, setUrban] = useState(() => sp.get('urb') !== '0')
  const [prev, setPrev] = useState(() => Math.min(parseNum(sp.get('prev') ?? ''), MAX_PRICE))
  const [delta, setDelta] = useState(10)
  const [view, setView] = useState<'calc' | 'bill'>(() => (sp.get('m') === 'bill' ? 'bill' : 'calc'))
  const [bill, setBill] = useState<Bill>(() => {
    const m = (k: string) => Math.min(parseNum(sp.get(k) ?? ''), MAX_PRICE)
    return { jongbu: m('bj'), nong: m('bn'), total: m('bt'), july: m('b7'), september: m('b9') }
  })
  const [newAcq, setNewAcq] = useState(() => { const v = sp.get('nd') ?? ''; return isValidDate(v) ? v : '' })
  const [bothAdj, setBothAdj] = useState(() => sp.get('adj') === '1')
  const [contract, setContract] = useState(() => { const v = sp.get('nc') ?? ''; return isValidDate(v) ? v : '' })
  // 계약일 경과조치는 둘 다 조정대상지역 + 2026.8.4 이후 취득일 때만 의미 있음
  const askContract = bothAdj && newAcq >= '2026-08-04'
  // 오늘(한국 시간)은 마운트 후에만 — 정적 HTML은 날짜와 무관하게 같게
  const today = useSyncExternalStore(noSubscribe, todayKST, () => null)

  useEffect(() => {
    const q = new URLSearchParams()
    q.set('p', houses.map((h) => h.price).join(','))
    if (!oneHouse) q.set('one', '0')
    if (joint) { q.set('j', '1'); q.set('sh', String(share)) }
    q.set('age', String(age))
    q.set('yrs', String(years))
    if (!urban) q.set('urb', '0')
    if (prev > 0) q.set('prev', String(prev))
    if (view === 'bill') q.set('m', 'bill')
    for (const [k, v] of [['bj', bill.jongbu], ['bn', bill.nong], ['bt', bill.total], ['b7', bill.july], ['b9', bill.september]] as const) {
      if (v > 0) q.set(k, String(v))
    }
    if (newAcq) { q.set('nd', newAcq); if (bothAdj) q.set('adj', '1'); if (askContract && contract) q.set('nc', contract) }
    window.history.replaceState(null, '', `?${q}`)
  }, [houses, oneHouse, joint, share, age, years, urban, prev, view, bill, newAcq, bothAdj, contract]) // eslint-disable-line react-hooks/exhaustive-deps

  const single = houses.filter((h) => h.price > 0).length === 1
  const input: HoldingInput = { prices: houses.map((h) => h.price), oneHouse, age, years, joint: single && joint, share, urban, prevTotal: prev }
  const r = holdingTax(input)
  const totalPrice = houses.reduce((s, h) => s + h.price, 0)
  const jb = r.jongbu

  const scenario = useMemo(
    () => holdingTax({ ...input, prices: input.prices.map((p) => Math.round(p * (1 + delta / 100))) }),
    [delta, houses, oneHouse, joint, share, age, years, urban, prev], // eslint-disable-line react-hooks/exhaustive-deps
  )
  // 단독 vs 공동명의 비교 (1채 + 1세대1주택일 때)
  const cmp = single && oneHouse
    ? { solo: holdingTax({ ...input, joint: false }), joint: holdingTax({ ...input, joint: true }) }
    : null

  const addHouse = () => setHouses((hs) => (hs.length >= MAX_HOUSES ? hs : [...hs, { id: Math.max(...hs.map((h) => h.id)) + 1, price: 5 * EOK }]))
  const removeHouse = (id: number) => setHouses((hs) => (hs.length > 1 ? hs.filter((h) => h.id !== id) : hs))
  const setPrice = (id: number, v: number) => setHouses((hs) => hs.map((h) => (h.id === id ? { ...h, price: Math.min(v, MAX_PRICE) } : h)))
  const reset = () => {
    setHouses([{ id: 1, price: 15 * EOK }]); setOneHouse(true); setJoint(false); setShare(50)
    setAge(55); setYears(7); setUrban(true); setPrev(0); setDelta(10)
    setBill({ jongbu: 0, nong: 0, total: 0, july: 0, september: 0 }); setNewAcq(''); setBothAdj(false); setContract('')
  }

  const billCmp = compareBill(bill, r)
  const billMain = billCmp.rows.find((x) => x.key === 'total') ?? billCmp.rows.find((x) => x.key === 'jongbu') ?? billCmp.rows[0]
  const dates = jongbuDates(TAX_YEAR)
  const deadlineEvent = useDeadlineEvent()
  const next = jongbuDates(TAX_YEAR + 1)
  const dow = t.raw('u.dates.dow') as string[]
  const ymd = (s: string) => t('u.dates.ymd', { y: s.slice(0, 4), m: +s.slice(5, 7), d: +s.slice(8, 10), w: dow[weekday(s)] })
  const dday = today ? daysBetween(today, dates.due) : null
  const special = { from: ymd(dates.specialFrom), to: ymd(dates.specialTo) }
  const specialText = !today || today < dates.specialFrom ? t('u.dates.special', special)
    : today <= dates.specialTo ? t('u.dates.specialNow', special)
      : t('u.dates.specialPassed', { ...special, nextFrom: ymd(next.specialFrom), nextTo: ymd(next.specialTo) })
  // 종부세법 제20조의2: 1세대1주택 + 60세 이상 또는 5년 이상 보유 + 주택분 종부세 100만원 초과 (소득 요건은 문구로 안내)
  const canDefer = r.oneHouse && r.mode !== 'jointEach' && (age >= 60 || years >= 5) && jb.tax > 1_000_000
  const temps = newAcq ? tempDeadlines(newAcq, bothAdj, askContract ? contract : '') : []

  const seg = (on: boolean) => `min-h-11 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
  const check = (id: string, on: boolean, set: (v: boolean) => void, label: string, hint?: string) => (
    <label htmlFor={id} className="flex items-start gap-3 min-h-11 py-1 cursor-pointer">
      <input id={id} type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} className="mt-1 w-5 h-5 shrink-0 accent-[var(--primary)]" />
      <span className="text-sm text-body">{label}{hint && <span className="block text-xs text-muted mt-0.5">{hint}</span>}</span>
    </label>
  )
  const numField = (id: string, label: string, value: number, set: (v: number) => void, max: number, unit: string, hint?: string) => (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-body mb-2">{label}</label>
      <div className="relative">
        <input id={id} type="number" inputMode="numeric" min={0} max={max} value={value} onChange={(e) => set(clamp(parseNum(e.target.value), 0, max))} className="ui-field w-full px-4 py-3 pr-10 tabular-nums" aria-describedby={hint ? `${id}-hint` : undefined} />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted" aria-hidden="true">{unit}</span>
      </div>
      {hint && <p id={`${id}-hint`} className="text-xs text-muted mt-1.5">{hint}</p>}
    </div>
  )
  const moneyField = (id: string, label: string, value: number, set: (v: number) => void, hint?: string) => (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-body mb-2">{label}</label>
      <div className="relative">
        <input
          id={id} type="text" inputMode="numeric" autoComplete="off" value={value ? value.toLocaleString('ko-KR') : ''}
          onChange={(e) => set(Math.min(parseNum(e.target.value), MAX_PRICE))} aria-describedby={`${id}-kr`}
          className="ui-field w-full px-4 py-3 pr-10 text-right tabular-nums"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted" aria-hidden="true">{t('units.won')}</span>
      </div>
      <p id={`${id}-kr`} className="text-xs text-muted mt-1.5">{eokMan(value)}{t('units.won')}{hint ? ` · ${hint}` : ''}</p>
    </div>
  )

  const sharesLabel = `${share}:${100 - share}`
  const rateName = r.heavy ? t('u.steps.heavy') : t('u.steps.general')
  const sources = t.raw('u.sources.items') as { label: string; url: string }[]
  const faq = t.raw('u.faq.items') as { q: string; a: string }[]
  const shareRows = [
    { label: t('u.result.jongbu'), value: `${won(jb.tax)}${t('units.won')}` },
    { label: t('u.result.property'), value: `${won(r.property.total)}${t('units.won')}` },
    { label: t('u.result.nong'), value: `${won(jb.nong)}${t('units.won')}` },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('u.h1')}</h1>
        <p className="text-sm text-muted mt-1">{t('u.subtitle')}</p>
        <div className="grid grid-cols-2 gap-2 max-w-sm mt-4" role="group" aria-label={t('u.view.label')}>
          <button type="button" aria-pressed={view === 'calc'} onClick={() => setView('calc')} className={seg(view === 'calc')}>{t('u.view.calc')}</button>
          <button type="button" aria-pressed={view === 'bill'} onClick={() => setView('bill')} className={seg(view === 'bill')}>{t('u.view.bill')}</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <div className="lg:col-span-1">
          <div className="ui-card p-6 space-y-5">
            <MobileResultLink href="#comprehensive-property-tax-result" label={t('u.result.label')} value={`${won(r.total)}${t('units.won')}`} />
            <fieldset className="space-y-4">
              <legend className="text-lg font-semibold text-fg mb-1">{t('u.houses.title')}</legend>
              {houses.map((h, idx) => (
                <div key={h.id} className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    {moneyField(`cpt-p-${h.id}`, t('u.houses.label', { n: idx + 1 }), h.price, (v) => setPrice(h.id, v))}
                  </div>
                  {houses.length > 1 && (
                    <button
                      type="button" onClick={() => removeHouse(h.id)} aria-label={t('u.houses.remove', { n: idx + 1 })}
                      className="mt-7 w-11 h-11 shrink-0 inline-flex items-center justify-center rounded-xl text-muted hover:bg-soft hover:text-fg"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              ))}
              {houses.length < MAX_HOUSES ? (
                <button type="button" onClick={addHouse} className="w-full min-h-11 inline-flex items-center justify-center gap-1.5 rounded-xl bg-soft hover:bg-subtle text-body text-sm font-medium">
                  <Plus className="w-4 h-4" aria-hidden="true" /> {t('u.houses.add')}
                </button>
              ) : <p className="text-xs text-muted">{t('u.houses.max')}</p>}
              <div className="flex items-center justify-between pt-3 border-t border-line">
                <span className="text-sm text-body">{t('u.houses.total', { n: houses.length })}</span>
                <span className="text-base font-semibold text-fg tabular-nums">{eokMan(totalPrice)}{t('units.won')}</span>
              </div>
              <p className="text-xs text-muted">{t('u.houses.hint')}</p>
            </fieldset>

            {single ? (
              <div className="space-y-4 pt-4 border-t border-line">
                {check('cpt-one', oneHouse, setOneHouse, t('u.oneHouse'), t('u.oneHouseHint'))}
                <div>
                  <p id="cpt-owner" className="block text-sm font-medium text-body mb-2">{t('u.owner.label')}</p>
                  <div className="grid grid-cols-2 gap-2" role="group" aria-labelledby="cpt-owner">
                    <button type="button" aria-pressed={!joint} onClick={() => setJoint(false)} className={seg(!joint)}>{t('u.owner.single')}</button>
                    <button type="button" aria-pressed={joint} onClick={() => setJoint(true)} className={seg(joint)}>{t('u.owner.joint')}</button>
                  </div>
                </div>
                {joint && numField('cpt-share', t('u.shareLabel'), share, (v) => setShare(clamp(v, 1, 99)), 99, '%', t('u.shareHint', { other: 100 - share }))}
                {oneHouse && (
                  <>
                    {numField('cpt-age', t('u.age'), age, setAge, 120, t('u.ageUnit'))}
                    {numField('cpt-years', t('u.years'), years, setYears, 80, t('u.yearsUnit'))}
                    <p className="text-xs text-muted" aria-live="polite">
                      {t('u.creditNow', { total: pct(r.credit.total, 0), e: pct(r.credit.elderly, 0), h: pct(r.credit.holding, 0) })}
                    </p>
                  </>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted pt-4 border-t border-line">{t(houses.length >= 3 ? 'u.multiHeavy' : 'u.multi')}</p>
            )}

            <div className="space-y-4 pt-4 border-t border-line">
              {check('cpt-urban', urban, setUrban, t('u.urban'), t('u.urbanHint'))}
              {moneyField('cpt-prev', t('u.prev'), prev, setPrev, t('u.prevHint'))}
            </div>

            <button type="button" onClick={reset} className="w-full min-h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-soft hover:bg-subtle text-body text-sm">
              <RotateCcw className="w-4 h-4" aria-hidden="true" /> {t('reset')}
            </button>
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 고지서 대조 */}
          {view === 'bill' && (
            <section className="ui-card p-6 space-y-5" aria-labelledby="cpt-bill">
              <div>
                <h2 id="cpt-bill" className="text-lg font-semibold text-fg">{t('u.bill.title')}</h2>
                <p className="text-sm text-muted mt-1">{t('u.bill.desc')}</p>
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                {(['jongbu', 'nong', 'total'] as const).map((k) => (
                  <div key={k}>{moneyField(`cpt-b-${k}`, t(`u.bill.${k}`), bill[k], (v) => setBill((b) => ({ ...b, [k]: v })))}</div>
                ))}
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {(['july', 'september'] as const).map((k) => (
                  <div key={k}>{moneyField(`cpt-b-${k}`, t(`u.bill.${k}`), bill[k], (v) => setBill((b) => ({ ...b, [k]: v })))}</div>
                ))}
              </div>
              <p className="text-xs text-muted">{t('u.bill.where')}</p>

              <div aria-live="polite" className="space-y-4">
                {!billMain ? (
                  <p className="bg-subtle rounded-2xl p-4 text-sm text-sub">{t('u.bill.empty')}</p>
                ) : (
                  <>
                    <p className="text-base font-semibold text-fg">
                      {billMain.diff > BILL_TOLERANCE ? t('u.bill.more', { amount: won(billMain.diff) })
                        : billMain.diff < -BILL_TOLERANCE ? t('u.bill.less', { amount: won(-billMain.diff) }) : t('u.bill.match')}
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[480px] text-sm">
                        <thead>
                          <tr className="border-b border-line text-muted">
                            <th scope="col" className="py-2 px-2 text-left font-medium">{t('u.steps.col.item')}</th>
                            {(['bill', 'est', 'diff'] as const).map((c) => <th key={c} scope="col" className="py-2 px-2 text-right font-medium">{t(`u.bill.col.${c}`)}</th>)}
                          </tr>
                        </thead>
                        <tbody className="tabular-nums">
                          {billCmp.rows.map((row) => {
                            const same = Math.abs(row.diff) <= BILL_TOLERANCE
                            return (
                              <tr key={row.key} className="border-b border-line text-body">
                                <th scope="row" className="py-2 px-2 text-left font-normal">{t(`u.bill.row.${row.key}`)}</th>
                                <td className="py-2 px-2 text-right">{won(row.bill)}</td>
                                <td className="py-2 px-2 text-right">{won(row.est)}</td>
                                <td className={`py-2 px-2 text-right ${same ? 'text-muted' : 'font-semibold text-fg'}`}>
                                  {same ? t('u.bill.same') : `${row.diff > 0 ? '+' : '−'}${won(Math.abs(row.diff))}`}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    {billCmp.reasons.length > 0 && (
                      <div className="bg-subtle rounded-2xl p-5 space-y-2">
                        <h3 className="text-sm font-semibold text-body">{t('u.bill.whyTitle')}</h3>
                        <ul className="space-y-1.5 list-disc pl-5 text-sm text-sub marker:text-faint">
                          {billCmp.reasons.map((k) => <li key={k}>{t(`u.bill.why.${k}`)}</li>)}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>
              <p className="text-xs text-muted">{t('u.bill.note')}</p>
            </section>
          )}

          <section id="comprehensive-property-tax-result" className="ui-card p-6 space-y-5 scroll-mt-20" aria-labelledby="cpt-result-title">
            <div aria-live="polite">
              <h2 id="cpt-result-title" className="text-sm text-muted">{t('u.result.label')}</h2>
              <p className="text-3xl font-bold text-fg tabular-nums mt-1">{won(r.total)}{t('units.won')}</p>
              <p className="text-sm text-sub mt-1">
                {t('u.result.effective', { rate: totalPrice ? ((r.total / totalPrice) * 100).toFixed(3) : '0', monthly: won(r.total / 12) })}
              </p>
            </div>

            <div className="divide-y divide-line border-y border-line">
              {[
                { k: 'property', v: r.property.total, hint: t('u.result.propertyHint') },
                { k: 'jongbu', v: jb.tax, hint: jb.base > 0 ? t('u.result.jongbuHint') : t('u.result.notJongbu', { deduction: eokMan(r.mode === 'jointEach' ? 18 * EOK : r.deduction) }) },
                { k: 'nong', v: jb.nong, hint: t('u.result.nongHint') },
              ].map((row) => (
                <div key={row.k} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-body">{t(`u.result.${row.k}`)}</p>
                    <p className="text-xs text-muted">{row.hint}</p>
                  </div>
                  <p className="text-base font-semibold text-fg tabular-nums shrink-0">{won(row.v)}{t('units.won')}</p>
                </div>
              ))}
            </div>

            {(r.mode !== 'single' || jb.capCut > 0) && (
              <div className="bg-subtle rounded-2xl p-4 text-sm text-sub space-y-1">
                {r.mode !== 'single' && <p>{t(`u.result.mode.${r.mode}`)}</p>}
                {jb.capCut > 0 && <p>{t('u.result.capApplied', { amount: won(jb.capCut) })}</p>}
              </div>
            )}
            <p className="text-xs text-muted">{t('u.result.approx')}</p>

            <ShareResult
              card={{
                tool: t('u.h1'),
                label: t('u.share.label', { price: eokMan(totalPrice) }),
                headline: `${won(r.total)}${t('units.won')}`,
                sub: t('u.share.sub', { n: houses.length, monthly: won(r.total / 12) }),
                rows: shareRows,
              }}
              text={t('u.share.text', { price: eokMan(totalPrice), tax: won(r.total) })}
              fileName="toolhub-holding-tax"
            />
          </section>

          {/* 납부 일정 */}
          <section className="ui-card p-6 space-y-4" aria-labelledby="cpt-sched">
            <h2 id="cpt-sched" className="text-lg font-semibold text-fg">{t('u.schedule.title')}</h2>
            <ol className="divide-y divide-line border-y border-line">
              {[
                { k: 'jul', v: r.schedule.july, what: r.schedule.september === 0 ? t('u.schedule.julWhatAll') : t('u.schedule.julWhat') },
                { k: 'sep', v: r.schedule.september, what: t('u.schedule.sepWhat') },
                { k: 'dec', v: r.schedule.december, what: t('u.schedule.decWhat') },
              ].map((row) => (
                <li key={row.k} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-body">{t(`u.schedule.${row.k}`)}</p>
                    <p className="text-xs text-muted">{row.what}</p>
                  </div>
                  <p className="text-base font-semibold text-fg tabular-nums shrink-0">{row.v > 0 ? `${won(row.v)}${t('units.won')}` : t('u.schedule.none')}</p>
                </li>
              ))}
            </ol>
            <div className="bg-subtle rounded-2xl p-5 space-y-2 text-sm text-sub">
              <p className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <span className="font-semibold text-body">{t('u.dates.due', { date: ymd(dates.due) })}</span>
                {dday !== null && (
                  <span className="font-semibold text-primary tabular-nums">
                    {dday > 0 ? t('u.dates.dday', { n: dday }) : dday === 0 ? t('u.dates.dday0') : t('u.dates.passed')}
                  </span>
                )}
              </p>
              <p>{t('u.dates.notice')}</p>
              <p>{r.schedule.split > 0
                ? t('u.schedule.split', { amount: won(r.schedule.split), date: ymd(dates.split) })
                : t('u.dates.split', { date: ymd(dates.split) })}</p>
              {canDefer && <p>{t('u.dates.deferral', { date: ymd(dates.deferral) })}</p>}
              <p>{specialText}</p>
              <p className="text-xs text-muted">{t('u.dates.holidayNote')}</p>
              {dday !== null && dday >= 0 && (
                <AddToCalendar className="mt-1" file={`jongbu-${dates.due}.ics`} events={[deadlineEvent('jongbu', dates.due, '/comprehensive-property-tax')]} />
              )}
            </div>
            <p className="text-xs text-muted">{t('u.schedule.note')}</p>
            <div className="flex flex-wrap gap-2">
              {(['wetax', 'hometax'] as const).map((k) => (
                <a key={k} href={t(`u.links.${k}Url`)} target="_blank" rel="noopener noreferrer" className="min-h-11 inline-flex items-center gap-1.5 px-4 rounded-xl bg-soft hover:bg-subtle text-body text-sm font-medium">
                  {t(`u.links.${k}`)} <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                  <span className="sr-only">{t('u.links.newWindow')}</span>
                </a>
              ))}
            </div>
          </section>

          {/* 산출 과정 */}
          <section className="ui-card p-6 space-y-5" aria-labelledby="cpt-steps">
            <h2 id="cpt-steps" className="text-lg font-semibold text-fg">{t('u.steps.title')}</h2>
            <div>
              <h3 className="text-sm font-semibold text-body mb-2">{t('u.steps.propertyTitle')}</h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b border-line text-muted">
                      {(['house', 'price', 'ratio', 'base', 'main', 'urban', 'edu'] as const).map((c, i) => (
                        <th key={c} scope="col" className={`py-2 px-2 font-medium ${i === 0 ? 'text-left' : 'text-right'}`}>{t(`u.steps.col.${c}`)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {r.houses.map((h, i) => (
                      <tr key={i} className="border-b border-line text-body tabular-nums">
                        <th scope="row" className="py-2 px-2 text-left font-normal">{t('u.houses.short', { n: i + 1 })}</th>
                        <td className="py-2 px-2 text-right">{eokMan(h.price)}</td>
                        <td className="py-2 px-2 text-right">{pct(h.ratio, 0)}</td>
                        <td className="py-2 px-2 text-right">{won(h.base)}</td>
                        <td className="py-2 px-2 text-right">{won(h.main)}{h.special && <span className="block text-xs text-muted">{t('u.steps.specialRate')}</span>}</td>
                        <td className="py-2 px-2 text-right">{won(h.urban)}</td>
                        <td className="py-2 px-2 text-right">{won(h.edu)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted mt-2">{t('u.steps.propertyNote')}</p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-body mb-2">{t('u.steps.jongbuTitle')}</h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-sm">
                  <thead>
                    <tr className="border-b border-line text-muted">
                      <th scope="col" className="py-2 px-2 text-left font-medium">{t('u.steps.col.item')}</th>
                      <th scope="col" className="py-2 px-2 text-left font-medium">{t('u.steps.col.calc')}</th>
                      <th scope="col" className="py-2 px-2 text-right font-medium">{t('u.steps.col.amount')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { k: 'total', calc: t('u.steps.c.total', { n: houses.length }), v: totalPrice },
                      { k: 'deduct', calc: t(r.mode === 'jointEach' ? 'u.steps.c.deductJoint' : r.oneHouse ? 'u.steps.c.deductOne' : 'u.steps.c.deduct'), v: r.mode === 'jointEach' ? 18 * EOK : r.deduction, minus: true },
                      { k: 'base', calc: t('u.steps.c.base'), v: jb.base },
                      { k: 'gross', calc: t('u.steps.c.gross', { name: rateName }), v: jb.gross },
                      { k: 'prop', calc: t('u.steps.c.prop'), v: jb.propDeduct, minus: true },
                      ...(r.mode !== 'jointEach' && r.oneHouse ? [{ k: 'credit', calc: t('u.steps.c.credit', { rate: pct(r.credit.total, 0) }), v: jb.credit, minus: true }] : []),
                      ...(jb.capCut > 0 ? [{ k: 'cap', calc: t('u.steps.c.cap'), v: jb.capCut, minus: true }] : []),
                      { k: 'tax', calc: '', v: jb.tax, strong: true },
                      { k: 'nong', calc: t('u.steps.c.nong'), v: jb.nong },
                    ].map((row) => (
                      <tr key={row.k} className="border-b border-line">
                        <th scope="row" className={`py-2 px-2 text-left ${row.strong ? 'font-semibold text-fg' : 'font-normal text-body'}`}>{t(`u.steps.j.${row.k}`)}</th>
                        <td className="py-2 px-2 text-xs text-muted">{row.calc}</td>
                        <td className={`py-2 px-2 text-right tabular-nums ${row.strong ? 'font-semibold text-fg' : 'text-body'}`}>{row.minus && row.v > 0 ? '−' : ''}{won(row.v)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {r.mode === 'jointEach' && <p className="text-xs text-muted mt-2">{t('u.steps.jointNote', { shares: sharesLabel })}</p>}
            </div>

            <details className="group">
              <summary className="min-h-11 flex items-center cursor-pointer text-sm font-medium text-primary">{t('u.rates.title')}</summary>
              <div className="overflow-x-auto mt-2">
                <table className="w-full min-w-[420px] text-sm">
                  <thead>
                    <tr className="border-b border-line text-muted">
                      <th scope="col" className="py-2 px-2 text-left font-medium">{t('u.rates.base')}</th>
                      <th scope="col" className="py-2 px-2 text-right font-medium">{t('u.rates.general')}</th>
                      <th scope="col" className="py-2 px-2 text-right font-medium">{t('u.rates.heavy')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {JONGBU_GENERAL.map(([upTo, rate], i) => (
                      <tr key={i} className="border-b border-line text-body tabular-nums">
                        <th scope="row" className="py-2 px-2 text-left font-normal">
                          {upTo === Infinity ? t('u.rates.over', { v: eokMan(JONGBU_GENERAL[i - 1][0]) }) : t('u.rates.upTo', { v: eokMan(upTo) })}
                        </th>
                        <td className="py-2 px-2 text-right">{pct(rate, 1)}</td>
                        <td className="py-2 px-2 text-right">{pct(JONGBU_HEAVY[i][1], 1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-xs text-muted mt-2">{t('u.rates.propNote')}</p>
              </div>
            </details>
          </section>

          {/* 단독 vs 공동명의 */}
          {cmp && (
            <section className="ui-card p-6 space-y-4" aria-labelledby="cpt-cmp">
              <div>
                <h2 id="cpt-cmp" className="text-lg font-semibold text-fg">{t('u.compare.title')}</h2>
                <p className="text-sm text-muted mt-1">{t('u.compare.desc', { shares: sharesLabel })}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-sm">
                  <thead>
                    <tr className="border-b border-line text-muted">
                      <th scope="col" className="py-2 px-2 text-left font-medium"><span className="sr-only">{t('u.steps.col.item')}</span></th>
                      <th scope="col" className="py-2 px-2 text-right font-medium">{t('u.compare.solo')}</th>
                      <th scope="col" className="py-2 px-2 text-right font-medium">{t('u.compare.jointEach', { shares: sharesLabel })}</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {(() => {
                      const a = cmp.solo.jongbu, b = cmp.joint.jointEach!
                      const best = a.total <= b.total ? 0 : 1
                      return [
                        { k: 'deduction', v: [eokMan(12 * EOK), t('u.compare.each9')] },
                        { k: 'credit', v: [pct(cmp.solo.credit.total, 0), t('u.compare.noCredit')] },
                        { k: 'jongbu', v: [`${won(a.total)}${t('units.won')}`, `${won(b.total)}${t('units.won')}`] },
                        { k: 'total', v: [`${won(cmp.solo.property.total + a.total)}${t('units.won')}`, `${won(cmp.joint.property.total + b.total)}${t('units.won')}`], strong: true },
                      ].map((row) => (
                        <tr key={row.k} className="border-b border-line">
                          <th scope="row" className={`py-2 px-2 text-left ${row.strong ? 'font-semibold text-fg' : 'font-normal text-body'}`}>{t(`u.compare.${row.k}`)}</th>
                          {row.v.map((v, i) => (
                            <td key={i} className={`py-2 px-2 text-right ${row.strong ? 'font-semibold' : ''} ${row.strong && i === best && a.total !== b.total ? 'text-primary' : 'text-body'}`}>
                              {v}{row.strong && i === best && a.total !== b.total && <span className="block text-xs font-medium">{t('u.compare.best')}</span>}
                            </td>
                          ))}
                        </tr>
                      ))
                    })()}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted">{t('u.compare.note')}</p>
            </section>
          )}

          {/* 시나리오 */}
          <section className="ui-card p-6 space-y-4" aria-labelledby="cpt-scn">
            <h2 id="cpt-scn" className="text-lg font-semibold text-fg">{t('u.scenario.title')}</h2>
            <div>
              <label htmlFor="cpt-delta" className="flex items-center justify-between text-sm font-medium text-body mb-2">
                <span>{t('u.scenario.label')}</span>
                <span className="tabular-nums text-fg">{delta > 0 ? '+' : ''}{delta}%</span>
              </label>
              <input
                id="cpt-delta" type="range" min={-30} max={50} step={5} value={delta} onChange={(e) => setDelta(Number(e.target.value))}
                aria-valuetext={`${delta}%`} className="w-full h-11 accent-[var(--primary)]"
              />
              <div className="flex flex-wrap gap-2 mt-1">
                {[-10, 10, 20].map((d) => (
                  <button key={d} type="button" aria-pressed={delta === d} onClick={() => setDelta(d)} className={seg(delta === d)}>
                    {d > 0 ? '+' : ''}{d}%
                  </button>
                ))}
              </div>
            </div>
            <div aria-live="polite" className="bg-subtle rounded-2xl p-5 space-y-1">
              <p className="text-sm text-sub">{t('u.scenario.result', { pct: `${delta > 0 ? '+' : ''}${delta}%`, price: eokMan(Math.round(totalPrice * (1 + delta / 100))) })}</p>
              <p className="text-2xl font-bold text-fg tabular-nums">{won(scenario.total)}{t('units.won')}</p>
              <p className="text-sm text-sub tabular-nums">
                {t('u.scenario.diff', { diff: `${scenario.total >= r.total ? '+' : '−'}${won(Math.abs(scenario.total - r.total))}` })}
                {' · '}{t('u.scenario.split', { property: won(scenario.property.total), jongbu: won(scenario.jongbu.total) })}
              </p>
            </div>
            <p className="text-xs text-muted">{t('u.scenario.note')}</p>
          </section>

          {/* 일시적 2주택 처분기한 */}
          <section className="ui-card p-6 space-y-4" aria-labelledby="cpt-temp">
            <div>
              <h2 id="cpt-temp" className="text-lg font-semibold text-fg">{t('u.temp.title')}</h2>
              <p className="text-sm text-muted mt-1">{t('u.temp.desc')}</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 items-start">
              <div>
                <p className="text-sm font-medium text-body mb-2">{t('u.temp.date')}</p>
                <DatePicker label={t('u.temp.date')} value={newAcq} onChange={(v) => setNewAcq(isValidDate(v) ? v : '')} />
              </div>
              <div className="sm:pt-7">{check('cpt-adj', bothAdj, setBothAdj, t('u.temp.adjusted'), t('u.temp.adjustedHint'))}</div>
              {askContract && (
                <div>
                  <p className="text-sm font-medium text-body mb-2">{t('u.temp.contract')}</p>
                  <DatePicker label={t('u.temp.contract')} value={contract} onChange={(v) => setContract(isValidDate(v) ? v : '')} />
                  <p className="text-xs text-muted mt-1.5">{t('u.temp.contractHint')}</p>
                </div>
              )}
            </div>
            {temps.length === 0 ? (
              <p className="bg-subtle rounded-2xl p-4 text-sm text-sub">{t('u.temp.empty')}</p>
            ) : (
              <ul aria-live="polite" className="divide-y divide-line border-y border-line">
                {temps.map((x) => (
                  <li key={x.tax} className="py-3 space-y-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <p className="text-sm font-medium text-body">
                        {t(`u.temp.tax.${x.tax}`)}
                        {!x.verified && <span className="ml-2 px-2 py-0.5 rounded-md bg-soft text-xs text-sub">{t('u.temp.ref')}</span>}
                      </p>
                      <p className="text-base font-semibold text-fg tabular-nums">{t('u.temp.until', { date: ymd(x.date), n: x.years })}</p>
                    </div>
                    <p className="text-xs text-muted">{t(`u.temp.note.${x.tax}`)}</p>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-muted">{t('u.temp.foot')}</p>
          </section>
        </div>
      </div>

      {/* 가이드 */}
      <section className="ui-card p-6 space-y-6" aria-labelledby="cpt-guide">
        <h2 id="cpt-guide" className="text-xl font-semibold text-fg">{t('u.guide.title')}</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {(['basics', 'property', 'jongbu', 'tips'] as const).map((s) => (
            <div key={s} className="space-y-2">
              <h3 className="font-semibold text-body">{t(`u.guide.${s}.title`)}</h3>
              <ul className="space-y-1.5 list-disc pl-5 text-sm text-sub marker:text-faint">
                {(t.raw(`u.guide.${s}.items`) as string[]).map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-1">
          <p className="font-semibold text-body">{t('u.guide.reform.title')}</p>
          <p>{t('u.guide.reform.body')}</p>
        </div>

        <div>
          <h3 className="font-semibold text-body mb-2">{t('u.faq.title')}</h3>
          <div className="divide-y divide-line border-y border-line">
            {faq.map((f, i) => (
              <details key={i} className="py-1">
                <summary className="min-h-11 flex items-center cursor-pointer text-sm font-medium text-body">{f.q}</summary>
                <p className="text-sm text-sub pb-3">{f.a}</p>
              </details>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-body mb-2">{t('u.related.title')}</h3>
            <ul className="flex flex-wrap gap-2">
              {RELATED.map((href) => (
                <li key={href}>
                  <Link href={href} className="min-h-11 inline-flex items-center px-4 rounded-xl bg-soft hover:bg-subtle text-body text-sm">
                    {t(`u.related.${RELATED_KEYS[href]}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-body mb-2">{t('u.sources.title')}</h3>
            <ul className="space-y-1.5 text-sm">
              {sources.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
                    {s.label}<span className="sr-only"> {t('u.links.newWindow')}</span>
                  </a>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted mt-2">{t('u.sources.basis')}</p>
          </div>
        </div>
      </section>
    </div>
  )
}
