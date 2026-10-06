'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/dueDateCalculator'
import { useSearchParams } from '@/hooks/useSearchParams'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import { todayKST, isValidDate, addDays, daysBetween, weekday, ddayLabel } from '@/utils/dday'
import {
  dueDate, gestAge, trimester, koreanMonth, progress, lmpOf, checkupDates, CHECKUPS,
  maternityLeave, voucher, shortHours, type Method,
} from '@/utils/dueDate'

const METHODS: Method[] = ['lmp', 'conception', 'ultrasound', 'ivf']
type BmiCat = 'underweight' | 'normal' | 'overweight' | 'obese'
const BMI_CATS: BmiCat[] = ['underweight', 'normal', 'overweight', 'obese']
const bmiCat = (b: number): BmiCat => (b < 18.5 ? 'underweight' : b < 25 ? 'normal' : b < 30 ? 'overweight' : 'obese')
const clampInt = (v: string | null, lo: number, hi: number, def: number) => {
  const n = parseInt(v ?? '', 10)
  return Number.isFinite(n) && n >= lo && n <= hi ? n : def
}

export default function DueDateCalculator() {
  const t = useTranslations('dueDateCalculator')
  const tf = useTranslations('footer')
  const sp = useSearchParams()

  const [today, setToday] = useState('')
  const [method, setMethod] = useState<Method>('lmp')
  const [date, setDate] = useState('')
  const [cycle, setCycle] = useState(28)
  const [usWeeks, setUsWeeks] = useState(8)
  const [usDays, setUsDays] = useState(0)
  const [embryo, setEmbryo] = useState<3 | 5>(5)
  const [fetuses, setFetuses] = useState(1)
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')

  // 초기화: URL 파라미터 → 없으면 '오늘 기준 약 14주' 예시 (KST 오늘은 마운트 후에 구함)
  const inited = useRef(false)
  useEffect(() => {
    if (inited.current) return
    inited.current = true
    const now = todayKST()
    setToday(now)
    const m = sp.get('m') as Method | null
    if (m && METHODS.includes(m)) setMethod(m)
    const d = sp.get('d')
    setDate(isValidDate(d) ? d : addDays(now, -100))
    setCycle(clampInt(sp.get('c'), 20, 45, 28))
    setUsWeeks(clampInt(sp.get('uw'), 4, 42, 8))
    setUsDays(clampInt(sp.get('ud'), 0, 6, 0))
    setEmbryo(sp.get('e') === '3' ? 3 : 5)
    setFetuses(clampInt(sp.get('n'), 1, 3, 1))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!inited.current || !date) return
    const url = new URL(window.location.href)
    const p = url.searchParams
    p.set('m', method)
    p.set('d', date)
    ;['c', 'uw', 'ud', 'e'].forEach(k => p.delete(k))
    if (method === 'lmp' && cycle !== 28) p.set('c', String(cycle))
    if (method === 'ultrasound') { p.set('uw', String(usWeeks)); p.set('ud', String(usDays)) }
    if (method === 'ivf') p.set('e', String(embryo))
    if (fetuses > 1) p.set('n', String(fetuses)); else p.delete('n')
    window.history.replaceState({}, '', url)
  }, [method, date, cycle, usWeeks, usDays, embryo, fetuses])

  const fmt = (s: string) => {
    const [y, m, d] = s.split('-').map(Number)
    return t('u.dateFmt', { y, m, d, w: (t.raw('u.weekdays') as string[])[weekday(s)] })
  }
  const fmtShort = (s: string) => {
    const [, m, d] = s.split('-').map(Number)
    return t('u.dateShort', { m, d })
  }

  const r = useMemo(() => {
    if (!today || !isValidDate(date)) return null
    const edd = dueDate({ method, date, cycle, usWeeks, usDays, embryo })
    const ga = gestAge(edd, today)
    const left = daysBetween(today, edd)
    return {
      edd, ga, left,
      lmp: lmpOf(edd),
      conception: addDays(lmpOf(edd), 14),
      tri: trimester(ga.totalDays),
      month: koreanMonth(ga.weeks),
      pct: progress(ga.totalDays),
      fullTerm: addDays(lmpOf(edd), 37 * 7),
      notYet: ga.totalDays < 0,
      over42: ga.totalDays >= 42 * 7,
    }
  }, [today, date, method, cycle, usWeeks, usDays, embryo])

  const bmi = useMemo(() => {
    const h = parseFloat(height), w = parseFloat(weight)
    if (!(h >= 100 && h <= 230 && w >= 30 && w <= 250)) return null
    const b = w / (h / 100) ** 2
    return { b, cat: bmiCat(b) }
  }, [height, weight])

  const seg = (on: boolean) =>
    `px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-track'}`

  const gaText = r ? t('u.weeksDays', { w: r.ga.weeks, d: r.ga.days }) : ''
  const sizeWeek = r ? Math.max(4, Math.min(40, r.ga.weeks)) : 0
  const size = r && r.ga.weeks >= 4 && !r.over42
    ? (t.raw(`babySize.week${sizeWeek}`) as { fruit: string; length: string; weight: string } | undefined)
    : undefined

  const ml = r ? maternityLeave(r.edd, fetuses) : null
  const sh = r ? shortHours(r.edd) : null

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* ── 입력 ── */}
        <div className="lg:col-span-1">
          <div className="ui-card p-6 space-y-5">
            {r && <MobileResultLink href="#due-date-result" label={t('u.eddLabel')} value={fmt(r.edd)} />}
            <div>
              <p className="text-sm font-medium text-body mb-2">{t('calcMethod')}</p>
              <div className="grid grid-cols-2 gap-2" role="radiogroup">
                {METHODS.map(m => (
                  <button key={m} role="radio" aria-checked={method === m} onClick={() => setMethod(m)} className={seg(method === m)}>
                    {t(`u.method.${m}`)}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted mt-2">{t(`u.methodHint.${method}`)}</p>
            </div>

            <div>
              <label htmlFor="dd-date" className="block text-sm font-medium text-body mb-2">{t(`u.dateLabel.${method}`)}</label>
              <input
                id="dd-date"
                type="date"
                value={date}
                max={today || undefined}
                onChange={e => setDate(e.target.value)}
                className="ui-field w-full px-4 py-3"
              />
            </div>

            {method === 'lmp' && (
              <div>
                <label htmlFor="dd-cycle" className="block text-sm font-medium text-body mb-2">{t('u.cycle')}</label>
                <div className="flex items-center gap-2">
                  <input
                    id="dd-cycle" type="number" min={20} max={45} value={cycle}
                    onChange={e => setCycle(clampInt(e.target.value, 20, 45, cycle))}
                    className="ui-field w-24 px-4 py-3 tabular-nums"
                  />
                  <span className="text-sm text-sub">{t('u.days')}</span>
                </div>
                <p className="text-xs text-muted mt-2">{t('u.cycleHint')}</p>
              </div>
            )}

            {method === 'ultrasound' && (
              <div>
                <p className="text-sm font-medium text-body mb-2">{t('u.usAge')}</p>
                <div className="flex items-center gap-2">
                  <input
                    aria-label={t('u.weeks')} type="number" min={4} max={42} value={usWeeks}
                    onChange={e => setUsWeeks(clampInt(e.target.value, 4, 42, usWeeks))}
                    className="ui-field w-20 px-3 py-3 tabular-nums"
                  />
                  <span className="text-sm text-sub">{t('u.weeks')}</span>
                  <input
                    aria-label={t('u.days')} type="number" min={0} max={6} value={usDays}
                    onChange={e => setUsDays(clampInt(e.target.value, 0, 6, usDays))}
                    className="ui-field w-20 px-3 py-3 tabular-nums"
                  />
                  <span className="text-sm text-sub">{t('u.days')}</span>
                </div>
                <p className="text-xs text-muted mt-2">{t('u.usHint')}</p>
              </div>
            )}

            {method === 'ivf' && (
              <div>
                <p className="text-sm font-medium text-body mb-2">{t('u.embryo')}</p>
                <div className="grid grid-cols-2 gap-2" role="radiogroup">
                  {([3, 5] as const).map(e => (
                    <button key={e} role="radio" aria-checked={embryo === e} onClick={() => setEmbryo(e)} className={seg(embryo === e)}>
                      {t('u.embryoDay', { n: e })}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-body mb-2">{t('u.fetuses')}</p>
              <div className="grid grid-cols-3 gap-2" role="radiogroup">
                {[1, 2, 3].map(n => (
                  <button key={n} role="radio" aria-checked={fetuses === n} onClick={() => setFetuses(n)} className={seg(fetuses === n)}>
                    {t(`u.fetus${n}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── 결과 ── */}
        <div className="lg:col-span-2 space-y-4">
          {!r ? (
            <div className="ui-card p-6 text-center text-muted">{t('u.enterDate')}</div>
          ) : (
            <>
              <div id="due-date-result" className="ui-hero p-6 sm:p-8 scroll-mt-20">
                <p className="text-sm text-white/70">{t('u.eddLabel')}</p>
                <p className="text-3xl sm:text-4xl font-bold mt-1 tabular-nums">{fmt(r.edd)}</p>
                <p className="text-sm text-white/80 mt-1">
                  {r.notYet ? t('u.notYet') : t('u.heroSub', { ga: gaText, month: r.month, tri: r.tri })}
                </p>
                <div className="mt-6">
                  <div className="flex justify-between text-xs text-white/70 mb-1.5 tabular-nums">
                    <span>{t('u.progress')} {r.pct.toFixed(0)}%</span>
                    <span>{ddayLabel(r.left)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/25 overflow-hidden">
                    <div className="h-full bg-white rounded-full transition-all" style={{ width: `${r.pct}%` }} />
                  </div>
                </div>
              </div>

              {r.over42 && <div className="bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm">{t('u.over42')}</div>}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: t('u.currentWeek'), value: r.notYet ? '-' : gaText },
                  { label: t('u.monthLabel'), value: r.notYet ? '-' : t('u.monthValue', { n: r.month }) },
                  { label: t('u.triLabel'), value: r.notYet ? '-' : t(`u.tri${r.tri}`) },
                  { label: r.left >= 0 ? t('u.daysLeft') : t('u.daysOver'), value: t('u.nDays', { n: Math.abs(r.left) }) },
                ].map(x => (
                  <div key={x.label} className="ui-card p-4">
                    <p className="text-xs text-muted">{x.label}</p>
                    <p className="text-lg font-bold text-fg tabular-nums mt-0.5">{x.value}</p>
                  </div>
                ))}
              </div>

              <div className="ui-card p-5 divide-y divide-line text-sm">
                {[
                  { label: t('u.lmpEq'), value: fmt(r.lmp) },
                  { label: t('u.conceptionEst'), value: fmt(r.conception) },
                  { label: t('u.fullTermFrom'), value: fmt(r.fullTerm) },
                  { label: t('u.range'), value: `${fmtShort(addDays(r.edd, -14))} ~ ${fmtShort(addDays(r.edd, 14))}` },
                ].map(x => (
                  <div key={x.label} className="flex justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                    <span className="text-sub">{x.label}</span>
                    <span className="text-fg font-medium tabular-nums text-right">{x.value}</span>
                  </div>
                ))}
                <p className="text-xs text-muted pt-2.5">{t('u.monthNote')}</p>
              </div>

              <ShareResult
                card={{
                  tool: t('title'),
                  label: t('u.eddLabel'),
                  headline: fmt(r.edd),
                  sub: r.notYet ? undefined : t('u.share.sub', { ga: gaText, month: r.month }),
                  rows: [
                    { label: t('u.daysLeft'), value: ddayLabel(r.left) },
                    { label: t('u.triLabel'), value: r.notYet ? '-' : t(`u.tri${r.tri}`) },
                    { label: t('u.fullTermFrom'), value: fmt(r.fullTerm) },
                  ],
                }}
                text={r.notYet ? t('u.share.textShort', { edd: fmt(r.edd) }) : t('u.share.text', { edd: fmt(r.edd), ga: gaText })}
                fileName="due-date"
              />
            </>
          )}
        </div>
      </div>

      {r && (
        <>
          {/* ── 검사·일정 타임라인 ── */}
          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg">{t('u.timeline.title')}</h2>
            <p className="text-sm text-muted mt-1 mb-5">{t('u.timeline.subtitle')}</p>
            <ol className="space-y-3">
              {CHECKUPS.map(c => {
                const cd = checkupDates(r.edd, c, today)
                return (
                  <li
                    key={c.key}
                    className={`rounded-2xl p-4 ${cd.status === 'now' ? 'bg-primary-soft border border-primary' : 'bg-subtle'} ${cd.status === 'past' ? 'opacity-60' : ''}`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`font-semibold ${cd.status === 'now' ? 'text-primary' : 'text-fg'}`}>{t(`u.timeline.${c.key}.title`)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cd.status === 'now' ? 'bg-primary text-white' : 'bg-soft text-sub'}`}>
                        {t(`u.status.${cd.status}`)}
                      </span>
                    </div>
                    <p className="text-sm text-sub mt-1 tabular-nums">
                      {t('u.timeline.weeks', { from: c.from, to: c.to })} · {fmtShort(cd.start)} ~ {fmtShort(cd.end)}
                      {cd.status === 'upcoming' && ` · ${ddayLabel(daysBetween(today, cd.start))}`}
                    </p>
                    <p className="text-sm text-muted mt-1">{t(`u.timeline.${c.key}.desc`)}</p>
                  </li>
                )
              })}
            </ol>
            <p className="text-xs text-muted mt-4">{t('u.timeline.visitNote')}</p>
          </div>

          {/* ── 지원 제도 ── */}
          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg">{t('u.support.title')}</h2>
            <p className="text-sm text-muted mt-1 mb-5">{t('u.support.subtitle')}</p>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-subtle rounded-2xl p-5">
                <p className="text-sm text-sub">{t('u.support.voucherTitle')}</p>
                <p className="text-2xl font-bold text-fg tabular-nums mt-1">{t('u.support.manwon', { n: voucher(fetuses), won: (voucher(fetuses) * 10000).toLocaleString('en-US') })}</p>
                <p className="text-xs text-muted mt-2">{t('u.support.voucherDesc')}</p>
              </div>
              {ml && (
                <div className="bg-subtle rounded-2xl p-5">
                  <p className="text-sm text-sub">{t('u.support.leaveTitle', { n: ml.total })}</p>
                  <p className="text-2xl font-bold text-fg tabular-nums mt-1">{fmtShort(ml.earliestStart)}</p>
                  <p className="text-xs text-muted mt-2">
                    {t('u.support.leaveDesc', { before: ml.total - ml.after - 1, after: ml.after, end: fmtShort(ml.endIfOnTime) })}
                  </p>
                </div>
              )}
              {sh && (
                <div className="bg-subtle rounded-2xl p-5">
                  <p className="text-sm text-sub">{t('u.support.shortTitle')}</p>
                  <p className="text-base font-bold text-fg tabular-nums mt-1">
                    ~{fmtShort(sh.week12)} · {fmtShort(sh.week32)}~
                  </p>
                  <p className="text-xs text-muted mt-2">{t('u.support.shortDesc')}</p>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-5">
              {(['parental-leave:parentalLeave', 'child-benefit:childBenefit', 'government-subsidy:governmentSubsidy', 'ovulation-calculator:ovulationCalculator'] as const).map(x => {
                const [href, key] = x.split(':')
                return (
                  <Link key={href} href={`/${href}/`} className="px-4 py-2 rounded-xl bg-soft text-body text-sm font-medium hover:bg-track">
                    {tf(`links.${key}`)} →
                  </Link>
                )
              })}
            </div>
            <p className="text-xs text-muted mt-4">{t('u.support.note')}</p>
          </div>

          {/* ── 이번 주 아기 크기 ── */}
          {size && (
            <div className="ui-card p-6">
              <h2 className="text-lg font-semibold text-fg">{t('u.size.title', { w: sizeWeek })}</h2>
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="bg-subtle rounded-2xl p-4">
                  <p className="text-xs text-muted">{t('u.size.like')}</p>
                  <p className="text-lg font-bold text-fg mt-0.5">{size.fruit}</p>
                </div>
                <div className="bg-subtle rounded-2xl p-4">
                  <p className="text-xs text-muted">{t('babySize.lengthLabel')}</p>
                  <p className="text-lg font-bold text-fg tabular-nums mt-0.5">{size.length}</p>
                </div>
                <div className="bg-subtle rounded-2xl p-4">
                  <p className="text-xs text-muted">{t('babySize.weightLabel')}</p>
                  <p className="text-lg font-bold text-fg tabular-nums mt-0.5">{size.weight}</p>
                </div>
              </div>
              <p className="text-xs text-muted mt-3">{t('u.size.note')}</p>
            </div>
          )}

          {/* ── 체중 증가 가이드 (IOM 2009) ── */}
          <details className="ui-card p-6 group">
            <summary className="cursor-pointer list-none flex items-center justify-between">
              <span className="text-lg font-semibold text-fg">{t('weightGain.title')}</span>
              <span className="text-sm text-muted group-open:hidden">{t('u.open')}</span>
            </summary>
            <p className="text-sm text-muted mt-2 mb-4">{t('weightGain.subtitle')}</p>
            <div className="grid grid-cols-2 gap-3 mb-4 max-w-sm">
              <div>
                <label htmlFor="dd-h" className="block text-xs text-sub mb-1">{t('weightGain.heightLabel')}</label>
                <input id="dd-h" type="number" inputMode="decimal" value={height} onChange={e => setHeight(e.target.value)} placeholder={t('weightGain.heightPlaceholder')} className="ui-field w-full px-4 py-3" />
              </div>
              <div>
                <label htmlFor="dd-w" className="block text-xs text-sub mb-1">{t('weightGain.weightLabel')}</label>
                <input id="dd-w" type="number" inputMode="decimal" value={weight} onChange={e => setWeight(e.target.value)} placeholder={t('weightGain.weightPlaceholder')} className="ui-field w-full px-4 py-3" />
              </div>
            </div>
            {bmi && <p className="text-sm text-body mb-3">{t('u.wg.yourBmi', { b: bmi.b.toFixed(1) })}</p>}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-line text-muted">
                    <th className="py-2 pr-3 font-medium">{t('u.wg.cat')}</th>
                    <th className="py-2 pr-3 font-medium">{t('u.wg.total')}</th>
                    <th className="py-2 font-medium">{t('u.wg.weekly')}</th>
                  </tr>
                </thead>
                <tbody>
                  {BMI_CATS.map(c => (
                    <tr key={c} className={`border-b border-line ${fetuses === 1 && bmi?.cat === c ? 'bg-primary-soft text-primary font-semibold' : 'text-body'}`}>
                      <td className="py-2 pr-3">{t(`weightGain.${c}`)}</td>
                      <td className="py-2 pr-3 tabular-nums">{t(`weightGain.${c}Range`)}</td>
                      <td className="py-2 tabular-nums">{t(`u.wg.${c}Weekly`)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted mt-3">{fetuses > 1 ? t('u.wg.twins') : t('u.wg.note')}</p>
          </details>
        </>
      )}

      {/* ── 가이드 ── */}
      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {(['methods', 'facts'] as const).map(k => (
            <div key={k}>
              <h3 className="font-semibold text-fg mb-2">{t(`u.guide.${k}.title`)}</h3>
              <ul className="list-disc pl-5 space-y-1.5 text-sm text-sub">
                {(t.raw(`u.guide.${k}.items`) as string[]).map((it, i) => <li key={i}>{it}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <div>
          <h3 className="font-semibold text-fg mb-2">{t('guide.faq.title')}</h3>
          <div className="space-y-3">
            {(t.raw('u.guide.faq') as { q: string; a: string }[]).map((f, i) => (
              <div key={i} className="bg-subtle rounded-2xl p-4">
                <p className="font-medium text-fg text-sm">{f.q}</p>
                <p className="text-sm text-sub mt-1">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-fg mb-2">{t('u.guide.sources.title')}</h3>
          <ul className="space-y-1 text-sm">
            {(t.raw('u.guide.sources.items') as { label: string; url: string }[]).map(s => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{s.label}</a>
              </li>
            ))}
          </ul>
        </div>
        <p className="bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm">{t('u.disclaimer')}</p>
      </div>
    </div>
  )
}
