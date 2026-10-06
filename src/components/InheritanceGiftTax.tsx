'use client'

import { useState, useMemo, useEffect, useRef, type ReactNode } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/inheritanceGiftTax'
import { useSearchParams } from '@/hooks/useSearchParams'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import {
  EOK, BRACKETS, RELATIONS, giftTax, giftDeductionLimit, marriageEligible, splitGift, viaParent,
  inheritanceTax, filingDeadline, type Relation, type SpouseMode, type GiftInput, type InheritInput,
} from '@/utils/inheritanceGiftTax'

type Tab = 'gift' | 'inheritance'
const SPOUSE_MODES: SpouseMode[] = ['legal', 'min', 'custom']
const MAX = 1_000_000_000_000 // 1조

const won = (v: number) => Math.round(v).toLocaleString('ko-KR')
const parseNum = (s: string) => Math.min(Number(s.replace(/[^\d]/g, '')) || 0, MAX)
function eokMan(v: number): string {
  const eok = Math.floor(v / EOK)
  const man = Math.floor((v % EOK) / 10_000)
  return [eok > 0 ? `${eok.toLocaleString('ko-KR')}억` : '', man > 0 ? `${man.toLocaleString('ko-KR')}만` : ''].filter(Boolean).join(' ') || '0'
}
const pick = <T extends string>(v: string | null, list: readonly T[], def: T): T => (list.includes(v as T) ? (v as T) : def)
const num = (v: string | null, def: number) => (v === null ? def : parseNum(v))
const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

type Step = { label: string; value: number; op?: '+' | '−' | '=' | '×'; note?: string; rate?: boolean; total?: boolean }

export default function InheritanceGiftTax() {
  const t = useTranslations('inheritanceGiftTax')
  const sp = useSearchParams()

  const [tab, setTab] = useState<Tab>(() => (sp.get('type') === 'inheritance' ? 'inheritance' : 'gift'))
  // 증여
  const [amount, setAmount] = useState(() => num(sp.get('g'), EOK))
  const [relation, setRelation] = useState<Relation>(() => pick(sp.get('rel'), RELATIONS, 'parent'))
  const [minor, setMinor] = useState(() => sp.get('minor') === '1')
  const [marriage, setMarriage] = useState(() => sp.get('mar') === '1')
  const [prior, setPrior] = useState(() => num(sp.get('prior'), 0))
  // 상속
  const [estate, setEstate] = useState(() => num(sp.get('e'), 20 * EOK))
  const [debts, setDebts] = useState(() => num(sp.get('debt'), 0))
  const [funeral, setFuneral] = useState(() => num(sp.get('fun'), 0))
  const [bongan, setBongan] = useState(() => num(sp.get('bon'), 0))
  const [fin, setFin] = useState(() => num(sp.get('fin'), 0))
  const [house, setHouse] = useState(() => num(sp.get('house'), 0))
  const [preGift, setPreGift] = useState(() => num(sp.get('pre'), 0))
  const [spouse, setSpouse] = useState(() => sp.get('sp') !== '0')
  const [spouseMode, setSpouseMode] = useState<SpouseMode>(() => pick(sp.get('spm'), SPOUSE_MODES, 'legal'))
  const [spouseAmount, setSpouseAmount] = useState(() => num(sp.get('spa'), 5 * EOK))
  const [children, setChildren] = useState(() => Math.min(num(sp.get('kids'), 2), 10))
  const [elders, setElders] = useState(() => Math.min(num(sp.get('eld'), 0), 5))
  const [minorAges, setMinorAges] = useState('') // 나이는 URL에 넣지 않음
  // 기한 기준일 (클라이언트에서 오늘로: 정적 HTML 하이드레이션 불일치 방지)
  const [date, setDate] = useState('')
  useEffect(() => { setDate(today()) }, [])

  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({ gift: null, inheritance: null })

  // URL 동기화 (금액·선택값만)
  useEffect(() => {
    const url = new URL(window.location.href)
    const set = (k: string, v: string | number | null) => (v === null ? url.searchParams.delete(k) : url.searchParams.set(k, String(v)))
    for (const k of ['estate', 'debts', 'spouse', 'children', 'itemized', 'funeral', 'gift', 'relation', 'marriage']) url.searchParams.delete(k) // 예전 파라미터
    set('type', tab)
    const g = tab === 'gift'
    set('g', g ? amount : null); set('rel', g ? relation : null); set('minor', g && minor ? 1 : null)
    set('mar', g && marriage ? 1 : null); set('prior', g && prior ? prior : null)
    set('e', g ? null : estate); set('debt', !g && debts ? debts : null); set('fun', !g && funeral ? funeral : null)
    set('bon', !g && bongan ? bongan : null); set('fin', !g && fin ? fin : null); set('house', !g && house ? house : null)
    set('pre', !g && preGift ? preGift : null); set('sp', g ? null : spouse ? 1 : 0)
    set('spm', !g && spouse ? spouseMode : null); set('spa', !g && spouse && spouseMode === 'custom' ? spouseAmount : null)
    set('kids', g ? null : children); set('eld', !g && elders ? elders : null)
    window.history.replaceState({}, '', url)
  }, [tab, amount, relation, minor, marriage, prior, estate, debts, funeral, bongan, fin, house, preGift, spouse, spouseMode, spouseAmount, children, elders])

  const showMinor = relation === 'parent' || relation === 'grandparent'
  const gIn: GiftInput = { amount, relation, minor: showMinor && minor, marriage: marriageEligible(relation) && marriage, prior }
  const g = useMemo(() => giftTax(gIn), [amount, relation, minor, marriage, prior]) // eslint-disable-line react-hooks/exhaustive-deps
  const ages = useMemo(() => (minorAges.match(/\d+/g) ?? []).map(Number).slice(0, children), [minorAges, children])
  const iIn: InheritInput = { estate, debts, funeral, bongan, fin, house, spouse, spouseMode, spouseAmount, children, minorAges: ages, elders, preGift }
  const h = useMemo(() => inheritanceTax(iIn), [estate, debts, funeral, bongan, fin, house, spouse, spouseMode, spouseAmount, children, ages, elders, preGift]) // eslint-disable-line react-hooks/exhaustive-deps

  const isGift = tab === 'gift'
  const payable = isGift ? g.payable : h.payable
  const base = isGift ? g.base : h.base
  const gross = isGift ? amount : estate
  const deadline = date ? filingDeadline(date, isGift ? 3 : 6) : null
  const giftLimit = giftDeductionLimit(relation, gIn.minor) + (gIn.marriage ? EOK : 0)
  const giftRoom = Math.max(0, giftLimit - amount - prior)

  // ── 산출 과정 ──
  const pctStr = (r: number) => `${Math.round(r * 100)}%`
  const bracketNote = (b: number) => {
    const br = BRACKETS.find((x) => b <= x.upTo)!
    return t('u.steps.bracketNote', { rate: pctStr(br.rate), ded: eokMan(br.deduction) })
  }
  const steps: Step[] = isGift
    ? [
        { label: t('u.steps.giftAmount'), value: amount },
        ...(prior > 0 ? [{ label: t('u.steps.prior'), value: prior, op: '+' as const, note: t('u.steps.priorNote') }] : []),
        { label: t('u.steps.giftValue'), value: g.total, op: '=' as const },
        { label: t('u.steps.giftDeduction'), value: g.baseDeduction, op: '−' as const, note: t(`u.relation.${relation}.limit`) },
        ...(g.marriageDeduction > 0 ? [{ label: t('u.steps.marriageDeduction'), value: g.marriageDeduction, op: '−' as const }] : []),
        { label: t('u.steps.base'), value: g.base, op: '=' as const, total: true, note: g.base > 0 ? bracketNote(g.base) : undefined },
        { label: t('u.steps.computed'), value: g.computed, op: '=' as const },
        ...(g.surcharge > 0 ? [{ label: t('u.steps.surcharge'), value: g.surcharge, op: '+' as const, note: pctStr(g.surchargeRate) }] : []),
        ...(g.priorCredit > 0 ? [{ label: t('u.steps.priorCredit'), value: g.priorCredit, op: '−' as const }] : []),
        { label: t('u.steps.filingCredit'), value: g.filingCredit, op: '−' as const },
        { label: t('u.steps.payable'), value: g.payable, op: '=' as const, total: true },
      ]
    : [
        { label: t('u.steps.estate'), value: estate },
        ...(debts > 0 ? [{ label: t('u.steps.debts'), value: debts, op: '−' as const }] : []),
        { label: t('u.steps.funeral'), value: h.funeralDeduction, op: '−' as const, note: t('u.steps.funeralNote') },
        ...(preGift > 0 ? [{ label: t('u.steps.preGift'), value: preGift, op: '+' as const }] : []),
        { label: t('u.steps.taxableValue'), value: h.taxableValue, op: '=' as const },
        { label: h.lumpSum ? t('u.steps.lumpSum') : t('u.steps.itemized'), value: h.general, op: '−' as const, note: h.spouseOnly ? t('u.steps.spouseOnlyNote') : h.lumpSum ? undefined : t('u.steps.itemizedNote', { personal: eokMan(h.personal) }) },
        ...(spouse ? [{ label: t('u.steps.spouseDeduction'), value: h.spouseDeduction, op: '−' as const, note: t('u.steps.spouseNote', { legal: eokMan(h.spouseLegal) }) }] : []),
        ...(h.finDeduction > 0 ? [{ label: t('u.steps.finDeduction'), value: h.finDeduction, op: '−' as const }] : []),
        ...(h.houseDeduction > 0 ? [{ label: t('u.steps.houseDeduction'), value: h.houseDeduction, op: '−' as const }] : []),
        ...(h.capped ? [{ label: t('u.steps.capped'), value: h.deduction, op: '−' as const, note: t('u.steps.cappedNote', { sum: eokMan(h.deductionSum) }) }] : []),
        { label: t('u.steps.base'), value: h.base, op: '=' as const, total: true, note: h.base > 0 ? bracketNote(h.base) : undefined },
        { label: t('u.steps.computed'), value: h.computed, op: '=' as const },
        ...(h.giftCredit > 0 ? [{ label: t('u.steps.giftCredit'), value: h.giftCredit, op: '−' as const }] : []),
        { label: t('u.steps.filingCredit'), value: h.filingCredit, op: '−' as const },
        { label: t('u.steps.payable'), value: h.payable, op: '=' as const, total: true },
      ]

  // ── 절세 시나리오 ──
  const scenarios: { label: string; tax: number }[] = isGift
    ? [
        ...(relation !== 'spouse' ? [2, 3].map((n) => ({ label: t('u.scenario.split', { n }), tax: splitGift(gIn, n, 1) })) : []),
        { label: t('u.scenario.rounds', { n: 2 }), tax: splitGift(gIn, 1, 2) },
        { label: t('u.scenario.rounds', { n: 3 }), tax: splitGift(gIn, 1, 3) },
        ...(marriageEligible(relation) && !marriage ? [{ label: t('u.scenario.marriage'), tax: giftTax({ ...gIn, marriage: true, prior: 0 }).payable }] : []),
        ...(relation === 'grandparent' ? [{ label: t('u.scenario.viaParent'), tax: viaParent(gIn).total }] : []),
      ]
    : [
        ...(spouse
          ? (['min', 'legal'] as const).filter((m) => m !== spouseMode).map((m) => ({ label: t(`u.scenario.spouse.${m}`), tax: inheritanceTax({ ...iIn, spouseMode: m }).payable }))
          : []),
        ...(children > 0 ? [{ label: t('u.scenario.preGiftOld', { n: children }), tax: inheritanceTax({ ...iIn, estate: Math.max(0, estate - children * 50_000_000) }).payable }] : []),
      ]
  const scenarioBase = isGift ? giftTax({ ...gIn, prior: 0 }).payable : h.payable

  const relLabel = t(`u.relation.${relation}.name`)
  const card = {
    tool: t('title'),
    label: isGift ? t('u.share.giftLabel', { amount: eokMan(amount), relation: relLabel }) : t('u.share.inheritLabel', { amount: eokMan(estate) }),
    headline: `${won(payable)}${t('u.won')}`,
    sub: t('u.share.sub'),
    rows: isGift
      ? [
          { label: t('u.steps.giftDeduction'), value: `${won(g.deduction)}${t('u.won')}` },
          { label: t('u.steps.base'), value: `${won(g.base)}${t('u.won')}` },
          { label: t('u.steps.computed'), value: `${won(g.computed + g.surcharge)}${t('u.won')}` },
        ]
      : [
          { label: t('u.steps.taxableValue'), value: `${won(h.taxableValue)}${t('u.won')}` },
          { label: t('u.result.deductionTotal'), value: `${won(h.deduction)}${t('u.won')}` },
          { label: t('u.steps.base'), value: `${won(h.base)}${t('u.won')}` },
        ],
  }

  const seg = (on: boolean) =>
    `min-h-11 px-3 rounded-xl text-sm font-semibold transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
  const opt = (on: boolean) =>
    `flex items-start gap-2.5 min-h-11 px-3 py-2.5 rounded-xl border text-sm cursor-pointer transition-colors ${on ? 'border-primary bg-primary-soft text-primary font-medium' : 'border-line text-body hover:bg-subtle'}`
  const check = (id: string, on: boolean, set: (v: boolean) => void, label: string, hint?: string) => (
    <label htmlFor={id} className="flex items-start gap-2.5 min-h-11 py-1 cursor-pointer">
      <input id={id} type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} className="mt-0.5 w-5 h-5 shrink-0 accent-[var(--primary)]" />
      <span className="text-sm text-body">{label}{hint && <span className="block text-xs text-muted mt-0.5">{hint}</span>}</span>
    </label>
  )
  const countSelect = (id: string, label: string, value: number, set: (v: number) => void, max: number) => (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-body mb-2">{label}</label>
      <select id={id} value={value} onChange={(e) => set(Number(e.target.value))} className="ui-field w-full px-4 py-3">
        {Array.from({ length: max + 1 }, (_, i) => <option key={i} value={i}>{t('u.people', { n: i })}</option>)}
      </select>
    </div>
  )
  const onTabKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    const next: Tab = tab === 'gift' ? 'inheritance' : 'gift'
    setTab(next)
    tabRefs.current[next]?.focus()
  }

  const faq = t.raw('u.faq.items') as { q: string; a: string }[]
  const sources = t.raw('u.sources.items') as { label: string; url: string }[]
  const fmtDate = (s: string) => new Date(`${s}T00:00:00`).toLocaleDateString(t('u.dateLocale'), { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })

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
            <MobileResultLink href="#inheritance-gift-tax-result" label={isGift ? t('u.result.giftLabel', { amount: eokMan(amount), relation: relLabel }) : t('u.result.inheritLabel', { amount: eokMan(estate) })} value={`${won(payable)}${t('u.won')}`} />
            <div className="grid grid-cols-2 gap-2" role="tablist" aria-label={t('u.tabsLabel')}>
              {(['gift', 'inheritance'] as const).map((k) => (
                <button
                  key={k} ref={(el) => { tabRefs.current[k] = el }} role="tab" id={`igt-tab-${k}`} aria-controls="igt-panel"
                  aria-selected={tab === k} tabIndex={tab === k ? 0 : -1} onClick={() => setTab(k)} onKeyDown={onTabKey} className={seg(tab === k)}
                >
                  {t(`u.tab.${k}`)}
                </button>
              ))}
            </div>

            <div id="igt-panel" role="tabpanel" aria-labelledby={`igt-tab-${tab}`} className="space-y-5">
              {isGift ? (
                <>
                  <Money id="igt-amount" label={t('u.input.giftAmount')} value={amount} onChange={setAmount} won={t('u.won')} quick={[10_000_000, EOK, 5 * EOK]} reset={t('u.input.reset')} />
                  <fieldset>
                    <legend className="block text-sm font-medium text-body mb-2">{t('u.input.relation')}</legend>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2">
                      {RELATIONS.map((r) => (
                        <label key={r} htmlFor={`igt-rel-${r}`} className={opt(relation === r)}>
                          <input id={`igt-rel-${r}`} type="radio" name="igt-rel" value={r} checked={relation === r} onChange={() => setRelation(r)} className="mt-0.5 w-4 h-4 shrink-0 accent-[var(--primary)]" />
                          <span>{t(`u.relation.${r}.name`)}<span className="block text-xs text-muted font-normal">{t(`u.relation.${r}.limit`)}</span></span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  {showMinor && check('igt-minor', minor, setMinor, t('u.input.minor'), t('u.input.minorHint'))}
                  {marriageEligible(relation) && check('igt-marriage', marriage, setMarriage, t('u.input.marriage'), t('u.input.marriageHint'))}
                  <Money id="igt-prior" label={t('u.input.prior')} value={prior} onChange={setPrior} won={t('u.won')} hint={t('u.input.priorHint')} />
                </>
              ) : (
                <>
                  <Money id="igt-estate" label={t('u.input.estate')} value={estate} onChange={setEstate} won={t('u.won')} hint={t('u.input.estateHint')} quick={[EOK, 5 * EOK, 10 * EOK]} reset={t('u.input.reset')} />
                  <Money id="igt-debts" label={t('u.input.debts')} value={debts} onChange={setDebts} won={t('u.won')} />
                  {check('igt-spouse', spouse, setSpouse, t('u.input.spouse'))}
                  {spouse && (
                    <fieldset>
                      <legend className="block text-sm font-medium text-body mb-2">{t('u.input.spouseMode')}</legend>
                      <div className="space-y-2">
                        {SPOUSE_MODES.map((m) => (
                          <label key={m} htmlFor={`igt-spm-${m}`} className={opt(spouseMode === m)}>
                            <input id={`igt-spm-${m}`} type="radio" name="igt-spm" value={m} checked={spouseMode === m} onChange={() => setSpouseMode(m)} className="mt-0.5 w-4 h-4 shrink-0 accent-[var(--primary)]" />
                            <span>{t(`u.spouseMode.${m}`)}</span>
                          </label>
                        ))}
                      </div>
                      {spouseMode === 'custom' && (
                        <div className="mt-3"><Money id="igt-spa" label={t('u.input.spouseAmount')} value={spouseAmount} onChange={setSpouseAmount} won={t('u.won')} /></div>
                      )}
                    </fieldset>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    {countSelect('igt-kids', t('u.input.children'), children, setChildren, 10)}
                    {countSelect('igt-elders', t('u.input.elders'), elders, setElders, 5)}
                  </div>
                  {children > 0 && (
                    <div>
                      <label htmlFor="igt-ages" className="block text-sm font-medium text-body mb-2">{t('u.input.minorAges')}</label>
                      <input id="igt-ages" type="text" inputMode="numeric" value={minorAges} onChange={(e) => setMinorAges(e.target.value)} placeholder={t('u.input.minorAgesPlaceholder')} aria-describedby="igt-ages-hint" className="ui-field w-full px-4 py-3" />
                      <p id="igt-ages-hint" className="text-xs text-muted mt-1.5">{t('u.input.minorAgesHint')}</p>
                    </div>
                  )}
                  <details className="group" open={funeral + bongan + fin + house + preGift > 0 || undefined}>
                    <summary className="cursor-pointer min-h-11 flex items-center text-sm font-semibold text-body">{t('u.input.more')}</summary>
                    <div className="space-y-5 pt-3">
                      <Money id="igt-fin" label={t('u.input.fin')} value={fin} onChange={setFin} won={t('u.won')} hint={t('u.input.finHint')} />
                      <Money id="igt-house" label={t('u.input.house')} value={house} onChange={setHouse} won={t('u.won')} hint={t('u.input.houseHint')} />
                      <Money id="igt-pre" label={t('u.input.preGift')} value={preGift} onChange={setPreGift} won={t('u.won')} hint={t('u.input.preGiftHint')} />
                      <Money id="igt-fun" label={t('u.input.funeral')} value={funeral} onChange={setFuneral} won={t('u.won')} hint={t('u.input.funeralHint')} />
                      <Money id="igt-bon" label={t('u.input.bongan')} value={bongan} onChange={setBongan} won={t('u.won')} hint={t('u.input.bonganHint')} />
                    </div>
                  </details>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 space-y-6">
          <div id="inheritance-gift-tax-result" className="ui-card p-6 scroll-mt-20" aria-live="polite">
            <p className="text-sm text-muted">{isGift ? t('u.result.giftLabel', { amount: eokMan(amount), relation: relLabel }) : t('u.result.inheritLabel', { amount: eokMan(estate) })}</p>
            <p className="text-3xl sm:text-4xl font-bold text-fg tabular-nums mt-1">{won(payable)}{t('u.won')}</p>
            <p className="text-sm text-sub mt-2">
              {payable === 0
                ? t(isGift ? 'u.result.zeroGift' : 'u.result.zeroInherit')
                : t('u.result.effective', { rate: gross > 0 ? ((payable / gross) * 100).toFixed(1) : '0' })}
            </p>
            {isGift && giftRoom > 0 && <p className="text-sm text-sub mt-1">{t('u.result.room', { room: eokMan(giftRoom) })}</p>}
            {isGift && marriageEligible(relation) && <p className="text-xs text-muted mt-1">{t('u.result.giftAssume')}</p>}

            <div className="grid grid-cols-3 gap-3 mt-5">
              {[
                [t('u.steps.base'), won(base)],
                [t('u.result.rate'), base > 0 ? `${Math.round((isGift ? g.rate : h.rate) * 100)}%` : '-'],
                [t('u.steps.filingCredit'), won(isGift ? g.filingCredit : h.filingCredit)],
              ].map(([k, v]) => (
                <div key={k} className="bg-subtle rounded-2xl p-3">
                  <p className="text-xs text-muted">{k}</p>
                  <p className="text-base font-semibold text-fg tabular-nums mt-0.5 break-all">{v}</p>
                </div>
              ))}
            </div>

            <h2 className="text-base font-semibold text-fg mt-6 mb-2">{t('u.steps.title')}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[22rem]">
                <caption className="sr-only">{t('u.steps.title')}</caption>
                <thead>
                  <tr className="text-xs text-muted border-b border-line">
                    <th scope="col" className="py-2 pr-2 text-left font-medium w-6"><span className="sr-only">{t('u.steps.op')}</span></th>
                    <th scope="col" className="py-2 pr-2 text-left font-medium">{t('u.steps.item')}</th>
                    <th scope="col" className="py-2 text-right font-medium">{t('u.steps.amount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {steps.map((s, i) => (
                    <tr key={i} className={`border-b border-line last:border-0 ${s.total ? 'font-semibold text-fg' : 'text-body'}`}>
                      <td className="py-2 pr-2 text-muted align-top" aria-hidden={!s.op}>{s.op}</td>
                      <th scope="row" className={`py-2 pr-2 text-left align-top ${s.total ? 'font-semibold' : 'font-normal'}`}>
                        {s.label}
                        {s.note && <span className="block text-xs text-muted font-normal mt-0.5">{s.note}</span>}
                      </th>
                      <td className="py-2 text-right tabular-nums align-top whitespace-nowrap">{won(s.value)}{t('u.won')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!isGift && h.capped && <p className="text-xs text-muted mt-2">{t('u.result.cappedHint')}</p>}
            {!isGift && preGift > 0 && <p className="text-xs text-muted mt-2">{t('u.result.preGiftAssume')}</p>}

            <ShareResult card={card} className="mt-6" fileName="toolhub-gift-tax" />
          </div>

          {/* 신고·납부 기한 */}
          <div className="ui-card p-6 space-y-4">
            <h2 className="text-base font-semibold text-fg">{t('u.deadline.title')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <div>
                <label htmlFor="igt-date" className="block text-sm font-medium text-body mb-2">{isGift ? t('u.deadline.giftDate') : t('u.deadline.deathDate')}</label>
                <input id="igt-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="ui-field w-full px-4 py-3" />
              </div>
              <div aria-live="polite">
                <p className="text-xs text-muted">{isGift ? t('u.deadline.giftRule') : t('u.deadline.inheritRule')}</p>
                <p className="text-xl font-bold text-fg mt-1">{deadline ? fmtDate(deadline.due) : '-'}</p>
              </div>
            </div>
            {deadline && deadline.due !== deadline.legal && <p className="text-xs text-muted">{t('u.deadline.shifted', { legal: fmtDate(deadline.legal) })}</p>}
            <ul className="text-sm text-sub space-y-1 list-disc pl-5">
              {payable > 10_000_000 && <li>{t('u.deadline.installment')}</li>}
              {payable > 20_000_000 && <li>{t(isGift ? 'u.deadline.yearlyGift' : 'u.deadline.yearlyInherit')}</li>}
              <li>{t('u.deadline.late')}</li>
              {!isGift && <li>{t('u.deadline.abroad')}</li>}
            </ul>
            <div className="flex flex-wrap gap-2">
              <a href="https://www.hometax.go.kr" target="_blank" rel="noopener noreferrer" className="ui-btn px-4 py-2.5 text-sm min-h-11 inline-flex items-center">{t('u.deadline.hometax')}</a>
              <a href="https://www.nts.go.kr" target="_blank" rel="noopener noreferrer" className="ui-btn-soft px-4 py-2.5 text-sm min-h-11 inline-flex items-center">{t('u.deadline.nts')}</a>
            </div>
          </div>

          {/* 절세 시나리오 */}
          {scenarios.length > 0 && (
            <div className="ui-card p-6">
              <h2 className="text-base font-semibold text-fg">{t('u.scenario.title')}</h2>
              <p className="text-xs text-muted mt-1">{isGift ? t('u.scenario.giftNote') : t('u.scenario.inheritNote')}</p>
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-sm min-w-[22rem]">
                  <caption className="sr-only">{t('u.scenario.title')}</caption>
                  <thead>
                    <tr className="text-xs text-muted border-b border-line">
                      <th scope="col" className="py-2 pr-2 text-left font-medium">{t('u.scenario.case')}</th>
                      <th scope="col" className="py-2 pr-2 text-right font-medium">{t('u.scenario.tax')}</th>
                      <th scope="col" className="py-2 text-right font-medium">{t('u.scenario.diff')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-line text-fg font-semibold">
                      <th scope="row" className="py-2 pr-2 text-left font-semibold">{isGift ? t('u.scenario.nowGift') : t('u.scenario.now')}</th>
                      <td className="py-2 pr-2 text-right tabular-nums whitespace-nowrap">{won(scenarioBase)}{t('u.won')}</td>
                      <td className="py-2 text-right text-muted">-</td>
                    </tr>
                    {scenarios.map((s) => {
                      const d = s.tax - scenarioBase
                      return (
                        <tr key={s.label} className="border-b border-line last:border-0 text-body">
                          <th scope="row" className="py-2 pr-2 text-left font-normal">{s.label}</th>
                          <td className="py-2 pr-2 text-right tabular-nums whitespace-nowrap">{won(s.tax)}{t('u.won')}</td>
                          <td className={`py-2 text-right tabular-nums whitespace-nowrap ${d < 0 ? 'text-primary font-semibold' : 'text-sub'}`}>
                            {d === 0 ? t('u.scenario.same') : d < 0 ? t('u.scenario.save', { v: won(-d) }) : t('u.scenario.more', { v: won(d) })}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {!isGift && spouse && <p className="text-xs text-muted mt-3">{t('u.scenario.secondInherit')}</p>}
            </div>
          )}

          {/* 세율표 */}
          <div className="ui-card p-6">
            <h2 className="text-base font-semibold text-fg mb-3">{t('u.rateTable.title')}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[20rem]">
                <caption className="sr-only">{t('u.rateTable.title')}</caption>
                <thead>
                  <tr className="text-xs text-muted border-b border-line">
                    <th scope="col" className="py-2 pr-2 text-left font-medium">{t('u.rateTable.base')}</th>
                    <th scope="col" className="py-2 pr-2 text-right font-medium">{t('u.rateTable.rate')}</th>
                    <th scope="col" className="py-2 text-right font-medium">{t('u.rateTable.ded')}</th>
                  </tr>
                </thead>
                <tbody>
                  {BRACKETS.map((b, i) => {
                    const on = base > 0 && base <= b.upTo && (i === 0 || base > BRACKETS[i - 1].upTo)
                    return (
                      <tr key={i} className={`border-b border-line last:border-0 ${on ? 'bg-primary-soft text-primary font-semibold' : 'text-body'}`} aria-current={on ? 'true' : undefined}>
                        <td className="py-2 px-2">
                          {b.upTo === Infinity ? t('u.rateTable.over', { v: eokMan(BRACKETS[i - 1].upTo) }) : t('u.rateTable.upTo', { v: eokMan(b.upTo) })}
                          {on && <span className="ml-1 text-xs">({t('u.rateTable.mine')})</span>}
                        </td>
                        <td className="py-2 pr-2 text-right tabular-nums">{Math.round(b.rate * 100)}%</td>
                        <td className="py-2 pr-2 text-right tabular-nums">{b.deduction ? `${eokMan(b.deduction)}${t('u.won')}` : '-'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* 가이드 */}
      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('u.guide.title')}</h2>
        {(['gift', 'inheritance', 'burden', 'tips'] as const).map((k) => (
          <section key={k}>
            <h3 className="text-base font-semibold text-fg mb-2">{t(`u.guide.${k}.title`)}</h3>
            <ul className="list-disc pl-5 space-y-1.5 text-sm text-body leading-relaxed">
              {(t.raw(`u.guide.${k}.items`) as string[]).map((s) => <li key={s}>{s}</li>)}
            </ul>
          </section>
        ))}
        <section>
          <h3 className="text-base font-semibold text-fg mb-1">{t('u.faq.title')}</h3>
          <div className="divide-y divide-line">
            {faq.map((f) => (
              <details key={f.q} className="py-3">
                <summary className="cursor-pointer text-sm font-medium text-body min-h-6">{f.q}</summary>
                <p className="text-sm text-sub mt-2 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
        <div className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-2">
          <p className="font-medium text-body">{t('u.sources.title')}</p>
          <ul className="space-y-1">
            {sources.map((s) => (
              <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{s.label}</a></li>
            ))}
          </ul>
          <p className="text-xs text-muted">{t('u.sources.asOf')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['acquisition-tax', 'capital-gains-tax', 'real-estate-calculator', 'comprehensive-property-tax'] as const).map((href) => (
            <Link key={href} href={`/${href}/`} className="ui-btn-soft px-3 py-2 text-sm min-h-11 inline-flex items-center">{t(`u.links.${href}`)}</Link>
          ))}
        </div>
      </div>

      <div className="bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm">{t('u.disclaimer')}</div>
    </div>
  )
}

function Money({ id, label, value, onChange, won, hint, quick, reset }: {
  id: string; label: string; value: number; onChange: (v: number) => void; won: string; hint?: string; quick?: number[]; reset?: string
}): ReactNode {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-body mb-2">{label}</label>
      <div className="relative">
        <input
          id={id} type="text" inputMode="numeric" autoComplete="off" value={value ? value.toLocaleString('ko-KR') : ''}
          onChange={(e) => onChange(parseNum(e.target.value))} placeholder="0" aria-describedby={`${id}-ko${hint ? ` ${id}-hint` : ''}`}
          className="ui-field w-full px-4 py-3 pr-10 tabular-nums"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted" aria-hidden="true">{won}</span>
      </div>
      <div className="flex items-center justify-between gap-2 mt-1.5">
        <span id={`${id}-ko`} className="text-xs text-muted">{eokMan(value)}{won}</span>
        {quick && (
          <div className="flex gap-1">
            {quick.map((q) => (
              <button key={q} type="button" onClick={() => onChange(Math.min(value + q, MAX))} className="min-h-10 px-2.5 rounded-lg bg-soft text-xs text-body hover:bg-subtle">+{eokMan(q)}</button>
            ))}
            <button type="button" onClick={() => onChange(0)} className="min-h-10 px-2.5 rounded-lg bg-soft text-xs text-body hover:bg-subtle">{reset}</button>
          </div>
        )}
      </div>
      {hint && <p id={`${id}-hint`} className="text-xs text-muted mt-1">{hint}</p>}
    </div>
  )
}
