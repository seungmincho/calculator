'use client'

import { useState, useMemo, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/annualLeave'
import { useSearchParams } from '@/hooks/useSearchParams'
import DatePicker from '@/components/ui/DatePicker'
import ShareResult from '@/components/ShareResult'
import { getKoreanHolidays } from '@/utils/koreanHolidays'
import { todayKST, addMonths, addDays, ymd, isValidDate } from '@/utils/dday'
import {
  summarize, settlement, timeline, dailyWage, bridges, MIN_WAGE_2026, HOURLY_LEAVE_FROM,
  type WageMode, type GrantKind,
} from '@/utils/annualLeave'

type Basis = 'joinDate' | 'fiscalYear'
const BASES: Basis[] = ['joinDate', 'fiscalYear']

const fmtDays = (n: number) => n.toLocaleString('ko-KR', { maximumFractionDigits: 2 })
const fmtWon = (n: number) => Math.round(n).toLocaleString('ko-KR')
const dot = (d: string) => d.replaceAll('-', '.')
const num = (s: string | null, d: number) => { const n = Number(s); return s != null && s !== '' && Number.isFinite(n) && n >= 0 ? n : d }
const WAGE_DEFAULT: Record<WageMode, number> = { monthly: 3_000_000, hourly: 10_320, daily: 100_000 }

export default function AnnualLeave() {
  const t = useTranslations('annualLeave')
  const sp = useSearchParams()

  // 오늘은 마운트 후에 정함 (정적 HTML 빌드 날짜로 계산되지 않게)
  const [today, setToday] = useState('')
  const [join, setJoin] = useState(() => (isValidDate(sp.get('join')) ? sp.get('join')! : ''))
  const [ref, setRef] = useState(() => (isValidDate(sp.get('ref')) ? sp.get('ref')! : ''))
  const [retire, setRetire] = useState(() => sp.get('out') === '1')
  const [basis, setBasis] = useState<Basis>(() => (sp.get('basis') === 'fiscalYear' ? 'fiscalYear' : 'joinDate'))
  const [used, setUsed] = useState(() => num(sp.get('used'), 0))
  const [lowOn, setLowOn] = useState(() => sp.get('low') != null)
  const [lowMonths, setLowMonths] = useState(() => Math.min(11, num(sp.get('low'), 6)))
  // 예전 링크의 wage = 통상 일급
  const [wageMode, setWageMode] = useState<WageMode>(() => {
    const m = sp.get('wm')
    return m === 'hourly' || m === 'daily' ? m : !sp.get('pay') && sp.get('wage') ? 'daily' : 'monthly'
  })
  const [pay, setPay] = useState(() => num(sp.get('pay') ?? sp.get('wage'), 0))
  const [hours, setHours] = useState(() => num(sp.get('hrs'), 8) || 8)
  const [remInput, setRemInput] = useState(() => sp.get('rem') ?? '')
  const [showAll, setShowAll] = useState(false)
  const [promotionOpen, setPromotionOpen] = useState(false)

  const defaultJoin = today ? addMonths(today, -38) : ''
  useEffect(() => {
    const d = todayKST()
    setToday(d)
    setJoin(j => j || addMonths(d, -38))
    setRef(r => r || d)
  }, [])

  const amount = pay || WAGE_DEFAULT[wageMode]

  // URL 동기화 (기본값은 생략)
  useEffect(() => {
    if (!today) return
    const url = new URL(window.location.href)
    const set = (k: string, v: string | null) => (v == null ? url.searchParams.delete(k) : url.searchParams.set(k, v))
    url.searchParams.delete('wage')
    set('join', join && join !== defaultJoin ? join : null)
    set('ref', ref && ref !== today ? ref : null)
    set('out', retire ? '1' : null)
    set('basis', basis === 'fiscalYear' ? basis : null)
    set('used', used > 0 ? String(used) : null)
    set('low', lowOn ? String(lowMonths) : null)
    set('wm', wageMode !== 'monthly' ? wageMode : null)
    set('pay', pay > 0 ? String(pay) : null)
    set('hrs', hours !== 8 ? String(hours) : null)
    set('rem', remInput !== '' ? remInput : null)
    window.history.replaceState({}, '', url.toString())
  }, [today, defaultJoin, join, ref, retire, basis, used, lowOn, lowMonths, wageMode, pay, hours, remInput])

  const opt = useMemo(() => ({ lowAttendanceMonths: lowOn ? lowMonths : null }), [lowOn, lowMonths])
  const valid = !!join && !!ref && join <= ref

  const calc = useMemo(() => {
    if (!valid) return null
    const tenure = ymd(join, ref)
    const both = { joinDate: summarize('joinDate', join, ref, opt), fiscalYear: summarize('fiscalYear', join, ref, opt) }
    const s = both[basis]
    const expiresSoonest = s.grants.filter(g => g.date <= ref && ref <= g.expires).map(g => g.expires).sort()[0] ?? null
    const remaining = Math.max(0, Math.round((s.active - used) * 100) / 100)
    return { tenure, both, s, remaining, expiresSoonest, settle: settlement(join, ref, opt) }
  }, [valid, join, ref, basis, used, opt])

  const rows = useMemo(() => {
    if (!calc) return []
    const horizon = showAll ? 22 : Math.max(calc.tenure.years + 3, 3)
    return timeline(basis, join, ref, horizon, opt)
  }, [calc, showAll, basis, join, ref, opt])

  const bridgeList = useMemo(() => (today ? bridges(today, addDays(today, 365), getKoreanHolidays).slice(0, 8) : []), [today])

  // 연차수당
  const daily = dailyWage(wageMode, amount, hours)
  const remForPay = remInput !== '' ? num(remInput, 0) : (calc?.remaining ?? 0)
  const settleDays = retire && basis === 'fiscalYear' ? (calc?.settle.shortfall ?? 0) : 0
  const payDays = Math.round((remForPay + settleDays) * 100) / 100
  const leavePay = Math.round(payDays * daily)
  const hourly = wageMode === 'monthly' ? amount / 209 : wageMode === 'hourly' ? amount : daily / hours
  const belowMin = hourly > 0 && hourly < MIN_WAGE_2026

  const kindLabel = (k: GrantKind) => t(`table.${k}`)
  const seg = (on: boolean) => `px-3 py-2 text-sm font-medium rounded-lg transition-colors ${on ? 'bg-primary text-white' : 'text-sub hover:text-fg'}`
  const basisLabel = (b: Basis) => (b === 'joinDate' ? t('joinDateBasis') : t('fiscalYearBasis'))

  const reset = () => {
    setJoin(defaultJoin); setRef(today); setRetire(false); setBasis('joinDate'); setUsed(0)
    setLowOn(false); setWageMode('monthly'); setPay(0); setHours(8); setRemInput('')
  }

  const guideRules = t.raw('guide.rules.items') as string[]
  const basisItems = t.raw('guide.basis.items') as string[]
  const faq = t.raw('guide.faq.items') as { q: string; a: string }[]
  const sources = t.raw('guide.sources.items') as { label: string; url?: string }[]

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
              <label className="block text-sm font-medium text-body mb-2">{t('calculationBasis')}</label>
              <div className="grid grid-cols-2 gap-1 bg-soft rounded-xl p-1">
                {BASES.map(b => <button key={b} onClick={() => setBasis(b)} className={seg(basis === b)}>{basisLabel(b)}</button>)}
              </div>
              <p className="text-xs text-muted mt-1.5">{basis === 'joinDate' ? t('joinDateBasisDesc') : t('fiscalYearBasisDesc')}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-body mb-2">{t('joinDate')}</label>
              <DatePicker label={t('joinDate')} value={join} onChange={setJoin} maxDate={ref ? new Date(ref + 'T00:00:00') : undefined} />
            </div>

            <div>
              <label className="block text-sm font-medium text-body mb-2">{t('refDate')}</label>
              <DatePicker label={t('refDate')} value={ref} onChange={setRef} />
              <p className="text-xs text-muted mt-1.5">{t('refDateHint')}</p>
              <label className="flex items-center gap-2 mt-2 text-sm text-body cursor-pointer">
                <input type="checkbox" checked={retire} onChange={e => setRetire(e.target.checked)} className="w-4 h-4 accent-[var(--primary)]" />
                {t('retireMode')}
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-body mb-2" htmlFor="al-used">{t('usedNow')}</label>
              <input id="al-used" type="number" inputMode="decimal" min={0} step={0.5} value={used || ''} placeholder="0"
                onChange={e => setUsed(Math.max(0, Number(e.target.value) || 0))} className="ui-field w-full px-4 py-3 tabular-nums" />
              <p className="text-xs text-muted mt-1.5">{t('usedHint')}</p>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm text-body cursor-pointer">
                <input type="checkbox" checked={lowOn} onChange={e => setLowOn(e.target.checked)} className="w-4 h-4 accent-[var(--primary)]" />
                {t('lowAttendance')}
              </label>
              {lowOn && (
                <div className="mt-2">
                  <label className="block text-xs text-sub mb-1" htmlFor="al-low">{t('lowAttendanceMonths')}</label>
                  <input id="al-low" type="number" min={0} max={11} value={lowMonths}
                    onChange={e => setLowMonths(Math.min(11, Math.max(0, Math.floor(Number(e.target.value) || 0))))} className="ui-field w-full px-4 py-2.5 tabular-nums" />
                </div>
              )}
              <p className="text-xs text-muted mt-1.5">{t('lowAttendanceHint')}</p>
            </div>

            <button onClick={reset} className="ui-btn-soft w-full px-4 py-2.5 text-sm font-medium">{t('reset')}</button>
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 space-y-6">
          {!today ? (
            <div className="ui-card p-12 text-center text-muted">{t('description')}</div>
          ) : !calc ? (
            <div className="ui-card p-6 text-sm text-red-600">{t('invalidJoin')}</div>
          ) : (
            <>
              <div className="ui-card p-6">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-sub">{retire ? t('hero.labelRetire') : t('hero.label')}</span>
                  <span className="text-xs bg-soft text-sub px-2 py-0.5 rounded-md">{basisLabel(basis)}</span>
                </div>
                <div className="mt-1 text-3xl font-bold text-fg tabular-nums">{fmtDays(calc.remaining)}{t('result.days')}</div>
                <p className="text-sm text-muted mt-1">
                  {t('hero.tenure', { y: calc.tenure.years, m: calc.tenure.months, n: calc.tenure.years + 1 })}
                  {' · '}{t('hero.remainingOf', { active: fmtDays(calc.s.active), used: fmtDays(used) })}
                </p>
                {calc.expiresSoonest && !retire && (
                  <p className="text-xs text-muted mt-1">{t('hero.expires', { date: dot(calc.expiresSoonest) })}</p>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5">
                  <div className="bg-subtle rounded-xl p-4">
                    <div className="text-xs text-sub">{t('hero.thisPeriod')}</div>
                    <div className="text-xl font-bold text-fg tabular-nums mt-1">{fmtDays(calc.s.active)}{t('result.days')}</div>
                  </div>
                  <div className="bg-subtle rounded-xl p-4">
                    <div className="text-xs text-sub">{t('hero.totalSince')}</div>
                    <div className="text-xl font-bold text-fg tabular-nums mt-1">{fmtDays(calc.s.total)}{t('result.days')}</div>
                  </div>
                  <div className="bg-subtle rounded-xl p-4 col-span-2 sm:col-span-1">
                    <div className="text-xs text-sub">{t('hero.nextGrant')}</div>
                    <div className="text-base font-bold text-fg tabular-nums mt-1">
                      {calc.s.next && !retire ? t('hero.nextGrantValue', { date: dot(calc.s.next.date), days: fmtDays(calc.s.next.days) }) : '-'}
                    </div>
                  </div>
                </div>
              </div>

              <ShareResult
                fileName="annual-leave"
                text={t('shareCard.text', { days: fmtDays(calc.remaining) })}
                card={{
                  tool: t('title'),
                  label: t('shareCard.label', { y: calc.tenure.years, m: calc.tenure.months }),
                  headline: `${fmtDays(calc.remaining)}${t('result.days')}`,
                  sub: basisLabel(basis),
                  rows: [
                    { label: t('hero.thisPeriod'), value: `${fmtDays(calc.s.active)}${t('result.days')}` },
                    { label: t('hero.totalSince'), value: `${fmtDays(calc.s.total)}${t('result.days')}` },
                    ...(calc.s.next && !retire ? [{ label: t('hero.nextGrant'), value: t('hero.nextGrantValue', { date: dot(calc.s.next.date), days: fmtDays(calc.s.next.days) }) }] : []),
                    { label: t('pay.title'), value: `${fmtWon(leavePay)}${t('won')}` },
                  ],
                }}
              />

              {/* 입사일 vs 회계연도 비교 */}
              <div className="ui-card p-6">
                <h2 className="text-lg font-semibold text-fg mb-4">{t('compare.title')}</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line text-sub">
                        <th className="text-left py-2.5 pr-3 font-medium">{t('compare.item')}</th>
                        {BASES.map(b => (
                          <th key={b} className={`text-right py-2.5 px-3 font-medium ${basis === b ? 'text-primary' : ''}`}>{basisLabel(b)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="text-body tabular-nums">
                      <tr className="border-b border-line">
                        <td className="py-2.5 pr-3">{t('compare.active')}</td>
                        {BASES.map(b => <td key={b} className="text-right py-2.5 px-3 font-semibold text-fg">{fmtDays(calc.both[b].active)}{t('result.days')}</td>)}
                      </tr>
                      <tr className="border-b border-line">
                        <td className="py-2.5 pr-3">{t('compare.total')}</td>
                        {BASES.map(b => <td key={b} className="text-right py-2.5 px-3 font-semibold text-fg">{fmtDays(calc.both[b].total)}{t('result.days')}</td>)}
                      </tr>
                      <tr>
                        <td className="py-2.5 pr-3">{t('compare.next')}</td>
                        {BASES.map(b => {
                          const n = calc.both[b].next
                          return <td key={b} className="text-right py-2.5 px-3 whitespace-nowrap">{n ? t('hero.nextGrantValue', { date: dot(n.date), days: fmtDays(n.days) }) : '-'}</td>
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="bg-subtle rounded-2xl p-5 mt-4 text-sm text-sub space-y-2">
                  <p className="font-semibold text-fg">{t('compare.retireTitle')}</p>
                  {retire ? (
                    <p>
                      {t('compare.retireTotals', { join: fmtDays(calc.settle.join), fiscal: fmtDays(calc.settle.fiscal) })}{' '}
                      {calc.settle.shortfall > 0
                        ? t('compare.retireShortfall', { days: fmtDays(calc.settle.shortfall), won: fmtWon(calc.settle.shortfall * daily) })
                        : t('compare.retireOk')}
                    </p>
                  ) : (
                    <p>{t('compare.retireHint')}</p>
                  )}
                  <p>{t('compare.note')}</p>
                  <p className="text-xs text-muted">{t('compare.prorated')}</p>
                </div>
              </div>

              {/* 연차수당 */}
              <div className="ui-card p-6">
                <h2 className="text-lg font-semibold text-fg mb-4">{t('pay.title')}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-1 bg-soft rounded-xl p-1">
                      {(['monthly', 'hourly', 'daily'] as WageMode[]).map(m => (
                        <button key={m} onClick={() => { setWageMode(m); setPay(0) }} className={seg(wageMode === m)}>{t(`pay.mode.${m}`)}</button>
                      ))}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-body mb-2" htmlFor="al-pay">{t(`pay.amount.${wageMode}`)}</label>
                      <div className="relative">
                        <input id="al-pay" type="text" inputMode="numeric" value={pay ? fmtWon(pay) : ''} placeholder={fmtWon(WAGE_DEFAULT[wageMode])}
                          onChange={e => setPay(Number(e.target.value.replace(/[^\d]/g, '')) || 0)} className="ui-field w-full px-4 py-3 pr-10 tabular-nums" />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-faint">{t('won')}</span>
                      </div>
                      {belowMin && <p className="text-xs text-amber-700 mt-1.5">{t('pay.minWage', { wage: fmtWon(MIN_WAGE_2026) })}</p>}
                    </div>
                    {wageMode !== 'daily' && (
                      <div>
                        <label className="block text-sm font-medium text-body mb-2" htmlFor="al-hrs">{t('pay.dailyHours')}</label>
                        <input id="al-hrs" type="number" min={1} max={8} step={0.5} value={hours}
                          onChange={e => setHours(Math.min(8, Math.max(0.5, Number(e.target.value) || 8)))} className="ui-field w-full px-4 py-3 tabular-nums" />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-body mb-2" htmlFor="al-rem">{t('pay.remaining')}</label>
                      <input id="al-rem" type="number" inputMode="decimal" min={0} step={0.5} value={remInput}
                        placeholder={fmtDays(calc.remaining)} onChange={e => setRemInput(e.target.value)} className="ui-field w-full px-4 py-3 tabular-nums" />
                      <p className="text-xs text-muted mt-1.5">{t('pay.remainingHint', { days: fmtDays(calc.remaining) })}</p>
                    </div>
                  </div>

                  <div className="bg-subtle rounded-2xl p-5 flex flex-col justify-center">
                    <div className="text-sm text-sub">{t('pay.result')}</div>
                    <div className="text-3xl font-bold text-fg tabular-nums mt-1">{fmtWon(leavePay)}{t('won')}</div>
                    <p className="text-sm text-sub mt-2 tabular-nums">{t('pay.formula', { days: fmtDays(payDays), daily: fmtWon(daily) })}</p>
                    {settleDays > 0 && <p className="text-xs text-sub mt-1">{t('pay.settlementAdd', { days: fmtDays(settleDays) })}</p>}
                    <p className="text-xs text-muted mt-3 tabular-nums">
                      {wageMode === 'monthly' && t('pay.dailyFromMonthly', { amount: fmtWon(amount), hours, daily: fmtWon(daily) })}
                      {wageMode === 'hourly' && t('pay.dailyFromHourly', { amount: fmtWon(amount), hours, daily: fmtWon(daily) })}
                      {wageMode === 'daily' && t('pay.dailyDirect')}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted mt-4">{t('pay.note')}</p>
              </div>

              {/* 연도별 발생표 */}
              <div className="ui-card p-6">
                <h2 className="text-lg font-semibold text-fg mb-4">{t('table.title')}</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line text-sub">
                        <th className="text-left py-2.5 pr-3 font-medium">{t('table.year')}</th>
                        <th className="text-left py-2.5 px-3 font-medium">{t('table.date')}</th>
                        <th className="text-right py-2.5 px-3 font-medium">{t('table.days')}</th>
                        <th className="text-right py-2.5 px-3 font-medium">{t('table.cumulative')}</th>
                        <th className="text-right py-2.5 pl-3 font-medium">{t('table.kind')}</th>
                      </tr>
                    </thead>
                    <tbody className="tabular-nums">
                      {rows.map((r, i) => (
                        <tr key={i} className={`border-b border-line ${r.future ? 'text-faint' : 'text-body'}`}>
                          <td className="py-2.5 pr-3 whitespace-nowrap">{t('table.yearValue', { n: r.year })}</td>
                          <td className="py-2.5 px-3 whitespace-nowrap">{dot(r.date)}{r.future && <span className="ml-1.5 text-xs">{t('table.future')}</span>}</td>
                          <td className={`text-right py-2.5 px-3 font-semibold ${r.future ? '' : 'text-fg'}`}>{fmtDays(r.days)}{t('result.days')}</td>
                          <td className="text-right py-2.5 px-3">{fmtDays(r.cumulative)}{t('result.days')}</td>
                          <td className="text-right py-2.5 pl-3 whitespace-nowrap">
                            {kindLabel(r.kind)}{r.kind === 'monthly' && r.count ? ` ×${r.count}` : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button onClick={() => setShowAll(v => !v)} className="ui-btn-soft px-4 py-2 text-sm mt-4">
                  {showAll ? t('table.showLess') : t('table.showAll')}
                </button>
              </div>
            </>
          )}

          {/* 징검다리 연휴 */}
          {today && (
            <div className="ui-card p-6">
              <h2 className="text-lg font-semibold text-fg">{t('bridge.title')}</h2>
              <p className="text-sm text-muted mt-1 mb-4">{t('bridge.desc')}</p>
              {bridgeList.length === 0 ? (
                <p className="text-sm text-muted">{t('bridge.none')}</p>
              ) : (
                <ul className="space-y-2">
                  {bridgeList.map(b => {
                    const fits = calc ? b.leaveDates.length <= calc.remaining : false
                    return (
                      <li key={b.start} className={`rounded-xl p-4 border ${fits ? 'border-primary bg-primary-soft' : 'border-line'}`}>
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="font-semibold text-fg tabular-nums">{dot(b.start)} ~ {dot(b.end).slice(5)}</span>
                          <span className="text-sm text-body">
                            {t('bridge.rest', { days: b.restDays })} · <span className={fits ? 'text-primary font-semibold' : ''}>{t('bridge.leave', { days: b.leaveDates.length })}</span>
                          </span>
                        </div>
                        <p className="text-xs text-sub mt-1">{b.holidays.join(', ')}</p>
                        <p className="text-xs text-muted mt-0.5 tabular-nums">{t('bridge.leaveOn')}: {b.leaveDates.map(d => dot(d).slice(5)).join(', ')}</p>
                      </li>
                    )
                  })}
                </ul>
              )}
              {calc && <p className="text-xs text-muted mt-3">{t('bridge.fitsHint', { days: fmtDays(calc.remaining) })}</p>}
            </div>
          )}
        </div>
      </div>

      {/* 연차 사용 촉진 */}
      <div className="ui-card p-6">
        <button onClick={() => setPromotionOpen(v => !v)} aria-expanded={promotionOpen} className="w-full flex items-center justify-between text-left">
          <h2 className="text-lg font-semibold text-fg">{t('promotion.title')}</h2>
          <ChevronDown className={`w-5 h-5 text-faint transition-transform ${promotionOpen ? 'rotate-180' : ''}`} />
        </button>
        {promotionOpen && (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-body">{t('promotion.description')}</p>
            <ol className="space-y-3">
              {(t.raw('promotion.steps') as string[]).map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-soft text-sub rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</span>
                  <span className="text-sm text-body">{step}</span>
                </li>
              ))}
            </ol>
            <div className="bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm">{t('promotion.warning')}</div>
          </div>
        )}
      </div>

      {/* 가이드 */}
      <div className="ui-card p-6 space-y-8">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>

        <section>
          <h3 className="text-base font-semibold text-fg mb-3">{t('guide.rules.title')}</h3>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-body">
            {guideRules.map((x, i) => <li key={i}>{x}</li>)}
          </ul>
        </section>

        <section className="bg-amber-50 text-amber-800 rounded-2xl p-5 text-sm">
          <p className="font-semibold mb-1">{t('guide.smallBiz.title')}</p>
          <p>{t('guide.smallBiz.body')}</p>
        </section>

        {today && (
          <section className="bg-subtle rounded-2xl p-5 text-sm text-sub">
            <p className="font-semibold text-body mb-1">{t('guide.hourlyLeave.title')}</p>
            <p>{t(today >= HOURLY_LEAVE_FROM ? 'guide.hourlyLeave.after' : 'guide.hourlyLeave.before')}</p>
          </section>
        )}

        <section>
          <h3 className="text-base font-semibold text-fg mb-3">{t('guide.basis.title')}</h3>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-body">
            {basisItems.map((x, i) => <li key={i}>{x}</li>)}
          </ul>
        </section>

        <section>
          <h3 className="text-base font-semibold text-fg mb-3">{t('guide.faq.title')}</h3>
          <div className="divide-y divide-line border-y border-line">
            {faq.map((f, i) => (
              <details key={i} className="group py-3">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-3 text-sm font-medium text-fg">
                  {f.q}
                  <ChevronDown className="w-4 h-4 text-faint shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <p className="text-sm text-body mt-2">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-base font-semibold text-fg mb-3">{t('guide.sources.title')}</h3>
          <ul className="space-y-1.5 text-sm">
            {sources.map((s, i) => (
              <li key={i}>
                {s.url
                  ? <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{s.label}</a>
                  : <span className="text-body">{s.label}</span>}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted mt-3">{t('guide.sources.disclaimer')}</p>
        </section>
      </div>
    </div>
  )
}
