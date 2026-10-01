'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { AlertCircle, Save, Check } from 'lucide-react'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useTranslations } from '@/lib/i18n'
import { useCalculationHistory } from '@/hooks/useCalculationHistory'
import CalculationHistory from '@/components/CalculationHistory'
import GuideSection from '@/components/GuideSection'
import ShareResult from '@/components/ShareResult'
import { calcRetirement, addMonths, isDate, isoOf } from '@/utils/retirementPay'

const won = (n: number) => Math.round(n).toLocaleString('ko-KR')
const digits = (s: string) => s.replace(/\D/g, '').slice(0, 12)
const num = (s: string) => Number(s) || 0
const today = () => { const d = new Date(); return isoOf(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) }
const prevDay = (iso: string) => isoOf(Date.parse(iso) - 86_400_000)

export default function RetirementCalculator() {
  const t = useTranslations('retirement')
  const searchParams = useSearchParams()

  // 기본값: 5년 근속, 월 350만원, 상여 연 400만원, 연차수당 연 50만원 (첫 화면에 결과 표시)
  const [start, setStart] = useState('2021-10-01')
  const [end, setEnd] = useState('2026-10-01')
  const [pay, setPay] = useState('3500000')
  const [bonus, setBonus] = useState('4000000')
  const [leave, setLeave] = useState('500000')
  const [saved, setSaved] = useState(false)

  const { histories, isLoading, saveCalculation, removeHistory, clearHistories, loadFromHistory } = useCalculationHistory('retirement')

  // URL → 상태 (최초 1회). 날짜 기본값은 마운트 후 오늘 기준으로 (정적 빌드 날짜와 hydration 불일치 방지)
  const loaded = useRef(false)
  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    const g = (k: string) => searchParams.get(k)
    const n = (k: string, set: (v: string) => void) => { const v = g(k); if (v && /^\d{1,12}$/.test(v)) set(v) }
    n('pay', setPay); n('bonus', setBonus); n('leave', setLeave)
    const s = g('s'), e = g('e')
    if (isDate(s) && isDate(e)) { setStart(s); setEnd(e); return }
    const end0 = today()
    // 예전 링크 호환: ?salary=연봉&years=&months=
    const sal = g('salary'), ys = Number(g('years')) || 0, ms = Number(g('months')) || 0
    if (sal && /^\d{1,12}$/.test(sal)) { setPay(String(Math.round(Number(sal) / 12))); setBonus('0'); setLeave('0') }
    setEnd(end0)
    setStart(addMonths(end0, -(ys || ms ? Math.min(600, ys * 12 + ms) : 60)))
  }, [searchParams])

  // 상태 → URL
  useEffect(() => {
    if (!loaded.current) return
    const url = new URL(window.location.href)
    for (const k of ['salary', 'years', 'months']) url.searchParams.delete(k)
    const q = { s: start, e: end, pay, bonus, leave }
    for (const [k, v] of Object.entries(q)) { if (v) url.searchParams.set(k, v); else url.searchParams.delete(k) }
    window.history.replaceState(window.history.state, '', url)
    setSaved(false)
  }, [start, end, pay, bonus, leave])

  const r = useMemo(
    () => calcRetirement({ start, end, monthly: num(pay), bonus: num(bonus), leave: num(leave) }),
    [start, end, pay, bonus, leave],
  )

  const W = t('rc.won')
  const period = r ? t('rc.period', { y: r.years, m: r.months, d: won(r.days) }) : ''

  const handleSave = () => {
    if (!r) return
    if (saveCalculation({ start, end, pay, bonus, leave, workYears: String(r.years), workMonths: String(r.months) }, { net: r.net, pay: r.pay, years: r.years, months: r.months })) setSaved(true)
  }
  const handleLoad = (id: string) => {
    const x = loadFromHistory(id) as Record<string, string> | null
    if (!x || !isDate(x.start) || !isDate(x.end)) return
    setStart(x.start); setEnd(x.end); setPay(digits(x.pay ?? '')); setBonus(digits(x.bonus ?? '')); setLeave(digits(x.leave ?? ''))
  }
  const formatHistory = (res: Record<string, unknown>) =>
    typeof res.net === 'number' ? t('rc.historyItem', { net: won(res.net), y: String(res.years), m: String(res.months) }) : ''

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
          <p className="text-sm text-muted mt-1">{t('rc.subtitle')}</p>
        </div>
        <CalculationHistory histories={histories} isLoading={isLoading} onLoadHistory={handleLoad}
          onRemoveHistory={removeHistory} onClearHistories={clearHistories} formatResult={formatHistory} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── 입력 ── */}
        <div className="lg:col-span-1">
          <div className="ui-card p-6 space-y-5">
            <div className="grid grid-cols-2 gap-2">
              <DateField id="rc-s" label={t('rc.in.start')} value={start} onChange={setStart} />
              <DateField id="rc-e" label={t('rc.in.end')} value={end} onChange={setEnd} />
              <p className="col-span-2 text-xs text-muted">{t('rc.in.endHint')}</p>
            </div>
            {r && <p className="text-sm text-body bg-subtle rounded-xl px-4 py-3 tabular-nums">{period}</p>}
            <Money label={t('rc.in.pay')} hint={t('rc.in.payHint')} value={pay} onChange={setPay} unit={W} />
            <Money label={t('rc.in.bonus')} hint={t('rc.in.bonusHint')} value={bonus} onChange={setBonus} unit={W} />
            <Money label={t('rc.in.leave')} hint={t('rc.in.leaveHint')} value={leave} onChange={setLeave} unit={W} />
          </div>
        </div>

        {/* ── 결과 ── */}
        <div className="lg:col-span-2 space-y-6">
          {!r ? (
            <div className="ui-card p-6 text-sm text-muted">{t('rc.invalid')}</div>
          ) : (
            <>
              <div className="ui-hero p-6">
                <div className="text-sm text-white/70">{t('rc.hero.label')}</div>
                <div className="text-3xl sm:text-4xl font-bold mt-2 tabular-nums">{won(r.net)}{W}</div>
                <div className="text-sm text-white/80 mt-2 tabular-nums">
                  {t('rc.hero.sub', { pay: won(r.pay), tax: won(r.totalTax) })}
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  <span className="rounded-full bg-white/15 px-3 py-1 text-sm">{period}</span>
                  <span className="rounded-full bg-white/15 px-3 py-1 text-sm tabular-nums">{t('rc.hero.eff', { rate: r.effRate.toFixed(1) })}</span>
                  <button type="button" onClick={handleSave} disabled={saved}
                    className="inline-flex items-center gap-1 rounded-full bg-white/15 hover:bg-white/25 px-3 py-1 text-sm">
                    {saved ? <Check className="w-4 h-4" aria-hidden="true" /> : <Save className="w-4 h-4" aria-hidden="true" />}
                    {saved ? t('rc.saved') : t('rc.save')}
                  </button>
                </div>
              </div>

              {!r.eligible && (
                <div className="bg-amber-50 text-amber-800 rounded-2xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-sm">{t('rc.underOneYear')}</p>
                </div>
              )}

              <ShareResult
                card={{
                  tool: t('title'),
                  label: t('rc.share.label', { y: r.years, m: r.months }),
                  headline: `${won(r.net)}${W}`,
                  sub: t('rc.hero.sub', { pay: won(r.pay), tax: won(r.totalTax) }),
                  rows: [
                    { label: t('rc.row.pay'), value: `${won(r.pay)}${W}` },
                    { label: t('rc.row.totalTax'), value: `${won(r.totalTax)}${W}` },
                    { label: t('rc.row.daily'), value: `${won(Math.floor(r.dailyWage))}${W}` },
                    { label: t('rc.row.irp'), value: `${won(r.irp70)}${W}` },
                  ],
                }}
                text={t('rc.share.text', { net: won(r.net) })}
                fileName="retirement-pay"
              />

              {/* 퇴직금 산정 */}
              <div className="ui-card p-6">
                <h2 className="text-lg font-semibold text-fg">{t('rc.pay.title')}</h2>
                <p className="text-xs text-muted mt-1">{t('rc.pay.formula')}</p>
                <dl className="mt-4 space-y-2 text-sm tabular-nums">
                  <Row label={t('rc.pay.periodRange', { from: r.periodStart, to: prevDay(end) })} value={t('rc.days', { n: r.periodDays })} />
                  <Row label={t('rc.pay.wages3m')} value={`${won(r.wages3m)}${W}`} />
                  <Row sub label={t('rc.pay.base')} value={`${won(num(pay) * 3)}${W}`} />
                  <Row sub label={t('rc.pay.bonusAdd')} value={`${won(Math.floor(num(bonus) * 3 / 12))}${W}`} />
                  <Row sub label={t('rc.pay.leaveAdd')} value={`${won(Math.floor(num(leave) * 3 / 12))}${W}`} />
                  <Row label={t('rc.pay.daily')} value={`${r.dailyWage.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}${W}`} />
                  <Row label={t('rc.pay.days')} value={t('rc.days', { n: won(r.days) })} />
                  <div className="border-t border-line pt-2">
                    <Row strong label={t('rc.row.pay')} value={`${won(r.pay)}${W}`} />
                  </div>
                </dl>
              </div>

              {/* 퇴직소득세 */}
              <div className="ui-card p-6">
                <h2 className="text-lg font-semibold text-fg">{t('rc.tax.title')}</h2>
                <p className="text-xs text-muted mt-1">{t('rc.tax.basis')}</p>
                <dl className="mt-4 space-y-2 text-sm tabular-nums">
                  <Row label={t('rc.tax.years')} value={t('rc.tax.yearsValue', { n: r.taxYears })} />
                  <Row label={t('rc.tax.serviceDed')} value={`-${won(r.serviceDed)}${W}`} />
                  <Row label={t('rc.tax.converted')} value={`${won(r.converted)}${W}`} />
                  <Row label={t('rc.tax.convertedDed')} value={`-${won(r.convertedDed)}${W}`} />
                  <Row label={t('rc.tax.base')} value={`${won(r.base)}${W}`} />
                  <Row label={t('rc.tax.convertedTax')} value={`${won(r.convertedTax)}${W}`} />
                  <Row label={t('rc.tax.tax', { n: r.taxYears })} value={`${won(r.tax)}${W}`} />
                  <Row label={t('rc.tax.local')} value={`${won(r.localTax)}${W}`} />
                  <div className="border-t border-line pt-2 space-y-2">
                    <Row strong label={t('rc.row.totalTax')} value={`${won(r.totalTax)}${W}`} />
                    <Row strong label={t('rc.hero.label')} value={`${won(r.net)}${W}`} />
                  </div>
                </dl>
              </div>

              {/* IRP 연금수령 비교 */}
              {r.totalTax > 0 && (
                <div className="ui-card p-6">
                  <h2 className="text-lg font-semibold text-fg">{t('rc.irp.title')}</h2>
                  <p className="text-sm text-sub mt-1">{t('rc.irp.desc')}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4 tabular-nums">
                    <Tile label={t('rc.irp.lump')} value={`${won(r.totalTax)}${W}`} />
                    <Tile active label={t('rc.irp.to10')} value={`${won(r.irp70)}${W}`} note={t('rc.irp.saving', { n: won(r.totalTax - r.irp70) })} />
                    <Tile active label={t('rc.irp.from11')} value={`${won(r.irp60)}${W}`} note={t('rc.irp.saving', { n: won(r.totalTax - r.irp60) })} />
                  </div>
                  <p className="text-xs text-muted mt-3">{t('rc.irp.note')}</p>
                </div>
              )}
            </>
          )}

          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg">{t('rc.next.title')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
              {([['/severance-pay', 'dc'], ['/unemployment-benefit', 'unemployment'], ['/national-pension', 'pension']] as const).map(([href, k]) => (
                <Link key={href} href={`${href}/`} className="bg-subtle hover:bg-soft rounded-xl px-4 py-3 text-sm">
                  <span className="block font-medium text-fg">{t(`rc.next.${k}.title`)}</span>
                  <span className="block text-xs text-muted mt-0.5">{t(`rc.next.${k}.desc`)}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <GuideSection namespace="retirement" defaultOpen />
      <p className="text-xs text-muted">{t('rc.disclaimer')}</p>
    </div>
  )
}

function DateField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="block text-sm font-medium text-body mb-1.5">{label}</label>
      <input id={id} type="date" value={value} min="1960-01-01" max="2100-12-31"
        onChange={(e) => onChange(e.target.value)} className="ui-field w-full min-w-0 px-3 py-3 text-sm tabular-nums" />
    </div>
  )
}

function Money({ label, value, onChange, hint, unit }: { label: string; value: string; onChange: (v: string) => void; hint?: string; unit: string }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-body mb-1.5">{label}</span>
      <span className="relative block">
        <input type="text" inputMode="numeric" value={value ? num(value).toLocaleString('ko-KR') : ''}
          onChange={(e) => onChange(digits(e.target.value))} placeholder="0"
          className="ui-field w-full px-4 py-3 pr-9 text-sm tabular-nums" />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-faint">{unit}</span>
      </span>
      {hint && <span className="block text-xs text-muted mt-1.5">{hint}</span>}
    </label>
  )
}

function Row({ label, value, strong, sub }: { label: string; value: string; strong?: boolean; sub?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${sub ? 'pl-4 text-xs text-muted' : strong ? 'font-semibold text-fg' : 'text-body'}`}>
      <dt className="min-w-0">{label}</dt>
      <dd className="shrink-0">{value}</dd>
    </div>
  )
}

function Tile({ label, value, note, active }: { label: string; value: string; note?: string; active?: boolean }) {
  return (
    <div className={`rounded-xl px-4 py-3 ${active ? 'bg-primary-soft' : 'bg-subtle'}`}>
      <div className="text-xs text-muted">{label}</div>
      <div className={`text-lg font-bold mt-1 ${active ? 'text-primary' : 'text-fg'}`}>{value}</div>
      {note && <div className="text-xs text-sub mt-0.5">{note}</div>}
    </div>
  )
}
