'use client'

import { useState, useEffect, useMemo, useRef, type ReactNode } from 'react'
import Link from 'next/link'
import { AlertCircle, Save, Check } from 'lucide-react'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/retirement'
import { useCalculationHistory } from '@/hooks/useCalculationHistory'
import CalculationHistory from '@/components/CalculationHistory'
import GuideSection from '@/components/GuideSection'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import { calcRetirement, addMonths, isDate, isoOf, periodSegments, delaySimulation } from '@/utils/retirementPay'

const won = (n: number) => Math.round(n).toLocaleString('ko-KR')
const digits = (s: string) => s.replace(/\D/g, '').slice(0, 12)
const num = (s: string) => Number(s) || 0
const today = () => { const d = new Date(); return isoOf(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) }
const shiftDay = (iso: string, n: number) => isoOf(Date.parse(iso) + n * 86_400_000)
const SIM_STEPS = [0, 1, 2, 3, 6, 12, 24, 36]
const SOURCES = [
  ['retirementAct', 'https://www.law.go.kr/법령/근로자퇴직급여보장법'],
  ['laborAct', 'https://www.law.go.kr/법령/근로기준법'],
  ['taxAct', 'https://www.law.go.kr/법령/소득세법'],
  ['moel', 'https://www.moel.go.kr/retirementpayCal.do'],
  ['hometax', 'https://www.hometax.go.kr'],
] as const

type Mode = 'simple' | 'detail'

export default function RetirementCalculator() {
  const t = useTranslations('retirement')
  const searchParams = useSearchParams()

  // 기본값: 5년 근속, 월 350만원, 상여 연 400만원, 연차수당 연 50만원 (첫 화면에 결과 표시)
  const [start, setStart] = useState('2021-10-01')
  const [end, setEnd] = useState('2026-10-01')
  const [mode, setMode] = useState<Mode>('simple')
  const [pay, setPay] = useState('3500000')
  const [m1, setM1] = useState('')
  const [m2, setM2] = useState('')
  const [m3, setM3] = useState('')
  const [ord, setOrd] = useState('')
  const [bonus, setBonus] = useState('4000000')
  const [leave, setLeave] = useState('500000')
  const [simN, setSimN] = useState(12)
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
    n('m1', setM1); n('m2', setM2); n('m3', setM3); n('ord', setOrd)
    if (g('mode') === 'detail') setMode('detail')
    // s/e = 현재 형식, start/end = 예전 /severance-pay 링크(301로 넘어옴)
    const s = g('s') ?? g('start'), e = g('e') ?? g('end')
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
    for (const k of ['salary', 'years', 'months', 'start', 'end']) url.searchParams.delete(k)
    const detail = mode === 'detail'
    const q = { s: start, e: end, mode: detail ? 'detail' : '', pay, m1: detail ? m1 : '', m2: detail ? m2 : '', m3: detail ? m3 : '', ord: detail ? ord : '', bonus, leave }
    for (const [k, v] of Object.entries(q)) { if (v) url.searchParams.set(k, v); else url.searchParams.delete(k) }
    window.history.replaceState(window.history.state, '', url)
    setSaved(false)
  }, [start, end, mode, pay, m1, m2, m3, ord, bonus, leave])

  const input = useMemo(() => ({
    start, end, monthly: num(pay), bonus: num(bonus), leave: num(leave),
    ...(mode === 'detail' ? { months3: [m1, m2, m3].map(num), ordinary: num(ord) } : {}),
  }), [start, end, mode, pay, m1, m2, m3, ord, bonus, leave])

  const r = useMemo(() => calcRetirement(input), [input])
  const segments = useMemo(() => (isDate(end) ? periodSegments(end) : []), [end])
  // 1년 미만: 1년 채우는 퇴직일 기준 예상 퇴직금
  const atOneYear = useMemo(() => (r && !r.eligible ? calcRetirement({ ...input, end: r.oneYearEnd }) : null), [r, input])
  // 퇴직일을 하루 늦추면 세법상 근속연수가 1년 늘어나는 경우(1년 미만 끝수 올림)
  const nextDay = useMemo(() => {
    if (!r?.eligible) return null
    const x = calcRetirement({ ...input, end: shiftDay(end, 1) })
    return x && x.taxYears > r.taxYears && x.totalTax < r.totalTax ? x : null
  }, [r, input, end])
  const sim = useMemo(() => {
    if (!r) return []
    const ns = [...new Set([...SIM_STEPS.filter((n) => n <= simN), simN])].sort((a, b) => a - b)
    return delaySimulation(input, ns)
  }, [r, input, simN])
  const simMax = Math.max(1, ...sim.map((x) => x.r.net))

  const switchMode = (m: Mode) => {
    if (m === 'detail' && !m1 && !m2 && !m3) { setM1(pay); setM2(pay); setM3(pay) }
    setMode(m)
  }

  const W = t('rc.won')
  const period = r ? t('rc.period', { y: r.years, m: r.months, d: won(r.days) }) : ''

  const handleSave = () => {
    if (!r) return
    if (saveCalculation({ start, end, mode, pay, m1, m2, m3, ord, bonus, leave, workYears: String(r.years), workMonths: String(r.months) }, { net: r.net, pay: r.pay, years: r.years, months: r.months })) setSaved(true)
  }
  const handleLoad = (id: string) => {
    const x = loadFromHistory(id) as Record<string, string> | null
    if (!x || !isDate(x.start) || !isDate(x.end)) return
    setStart(x.start); setEnd(x.end); setPay(digits(x.pay ?? '')); setBonus(digits(x.bonus ?? '')); setLeave(digits(x.leave ?? ''))
    setMode(x.mode === 'detail' ? 'detail' : 'simple')
    setM1(digits(x.m1 ?? '')); setM2(digits(x.m2 ?? '')); setM3(digits(x.m3 ?? '')); setOrd(digits(x.ord ?? ''))
  }
  const formatHistory = (res: Record<string, unknown>) =>
    typeof res.net === 'number' ? t('rc.historyItem', { net: won(res.net), y: String(res.years), m: String(res.months) }) : ''

  const mSetters = [[m1, setM1], [m2, setM2], [m3, setM3]] as const

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
            {r?.eligible && <MobileResultLink href="#retirement-calculator-result" label={t('rc.hero.label')} value={`${won(r.net)}${W}`} />}
            <div className="grid grid-cols-2 gap-2">
              <DateField id="rc-s" label={t('rc.in.start')} value={start} onChange={setStart} />
              <DateField id="rc-e" label={t('rc.in.end')} value={end} onChange={setEnd} />
              <p className="col-span-2 text-xs text-muted">{t('rc.in.endHint')}</p>
            </div>
            {r && <p className="text-sm text-body bg-subtle rounded-xl px-4 py-3 tabular-nums">{period}</p>}

            <div role="radiogroup" aria-label={t('rc.mode.label')} className="grid grid-cols-2 gap-1 bg-soft rounded-xl p-1">
              {(['simple', 'detail'] as const).map((m) => (
                <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => switchMode(m)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${mode === m ? 'bg-primary text-white' : 'text-sub hover:text-fg'}`}>
                  {t(`rc.mode.${m}`)}
                </button>
              ))}
            </div>

            {mode === 'simple' ? (
              <Money label={t('rc.in.pay')} hint={t('rc.in.payHint')} value={pay} onChange={setPay} unit={W} />
            ) : (
              <div className="space-y-3">
                <div>
                  <span className="block text-sm font-medium text-body">{t('rc.in.months3')}</span>
                  <span className="block text-xs text-muted mt-1">{t('rc.in.months3Hint')}</span>
                </div>
                {segments.map((sg, i) => (
                  <Money key={sg.from} value={mSetters[i][0]} onChange={mSetters[i][1]} unit={W}
                    label={t('rc.in.segment', { from: sg.from.slice(5).replace('-', '.'), to: sg.to.slice(5).replace('-', '.'), n: sg.days })} />
                ))}
                {segments.length > 0 && (
                  <p className="text-xs text-sub tabular-nums">{t('rc.in.segmentTotal', { n: segments.reduce((a, s) => a + s.days, 0) })}</p>
                )}
              </div>
            )}
            <Money label={t('rc.in.bonus')} hint={t('rc.in.bonusHint')} value={bonus} onChange={setBonus} unit={W} />
            <Money label={t('rc.in.leave')} hint={t('rc.in.leaveHint')} value={leave} onChange={setLeave} unit={W} />
            {mode === 'detail' && (
              <Money label={t('rc.in.ordinary')} hint={t('rc.in.ordinaryHint')} value={ord} onChange={setOrd} unit={W} />
            )}
          </div>
        </div>

        {/* ── 결과 ── */}
        <div className="lg:col-span-2 space-y-6">
          {!r ? (
            <div className="ui-card p-6 text-sm text-muted">{t('rc.invalid')}</div>
          ) : (
            <>
              {r.eligible ? (
                <div id="retirement-calculator-result" className="ui-hero p-6 scroll-mt-20">
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
              ) : (
                <div className="ui-card p-6">
                  <div className="text-sm text-muted">{t('rc.none.label')}</div>
                  <div className="text-3xl font-bold text-fg mt-2 tabular-nums">{t('rc.none.daysLeft', { n: won(r.daysToEligible) })}</div>
                  {atOneYear && (
                    <p className="text-sm text-sub mt-2 tabular-nums">
                      {t('rc.none.ifStay', { last: shiftDay(r.oneYearEnd, -1), pay: won(atOneYear.pay) })}
                    </p>
                  )}
                  <div className="bg-amber-50 text-amber-800 rounded-2xl p-4 flex items-start gap-3 mt-4">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
                    <p className="text-sm">{t('rc.underOneYear')}</p>
                  </div>
                </div>
              )}

              {nextDay && (
                <div className="bg-amber-50 text-amber-800 rounded-2xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-sm tabular-nums">
                    {t('rc.nextDay', { date: shiftDay(end, 1), y: nextDay.taxYears, n: won(r.totalTax - nextDay.totalTax) })}
                  </p>
                </div>
              )}

              {r.eligible && (
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
              )}

              {/* 퇴직금 산정 */}
              <div className="ui-card p-6">
                <h2 className="text-lg font-semibold text-fg">{t('rc.pay.title')}</h2>
                <p className="text-xs text-muted mt-1">{t('rc.pay.formula')}</p>
                <dl className="mt-4 space-y-2 text-sm tabular-nums">
                  <Row label={t('rc.pay.periodRange', { from: r.periodStart, to: shiftDay(end, -1) })} value={t('rc.days', { n: r.periodDays })} />
                  <Row label={t('rc.pay.wages3m')} value={`${won(r.wages3m)}${W}`} />
                  <Row sub label={mode === 'detail' ? t('rc.pay.base3m') : t('rc.pay.base')} value={`${won(r.base3m)}${W}`} />
                  <Row sub label={t('rc.pay.bonusAdd')} value={`${won(Math.floor(num(bonus) * 3 / 12))}${W}`} />
                  <Row sub label={t('rc.pay.leaveAdd')} value={`${won(Math.floor(num(leave) * 3 / 12))}${W}`} />
                  <Row label={t('rc.pay.daily')} value={`${r.avgDaily.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}${W}`} />
                  {r.ordinaryDaily > 0 && (
                    <Row label={t('rc.pay.ordinaryDaily')} value={`${r.ordinaryDaily.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}${W}`} />
                  )}
                  {r.usedOrdinary && <p className="text-xs text-primary">{t('rc.pay.usedOrdinary')}</p>}
                  <Row label={t('rc.pay.days')} value={t('rc.days', { n: won(r.days) })} />
                  <div className="border-t border-line pt-2">
                    <Row strong label={t('rc.row.pay')} value={`${won(r.pay)}${W}`} />
                  </div>
                </dl>
              </div>

              {/* 퇴직소득세 */}
              {r.eligible && (
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
              )}

              {/* 일시금 vs IRP 과세이연 */}
              {r.eligible && r.totalTax > 0 && (
                <div className="ui-card p-6">
                  <h2 className="text-lg font-semibold text-fg">{t('rc.irp.title')}</h2>
                  <p className="text-sm text-sub mt-1">{t('rc.irp.desc')}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 tabular-nums">
                    <Tile label={t('rc.irp.lump')} value={`${won(r.net)}${W}`} note={t('rc.irp.lumpNote', { n: won(r.totalTax) })} />
                    <Tile active label={t('rc.irp.transfer')} value={`${won(r.pay)}${W}`} note={t('rc.irp.transferNote')} />
                  </div>
                  <div className="overflow-x-auto mt-4">
                    <table className="w-full text-sm tabular-nums">
                      <thead>
                        <tr className="text-xs text-muted border-b border-line">
                          <th className="text-left font-medium py-2 pr-3">{t('rc.irp.col.way')}</th>
                          <th className="text-right font-medium py-2 px-3">{t('rc.irp.col.tax')}</th>
                          <th className="text-right font-medium py-2 pl-3">{t('rc.irp.col.saving')}</th>
                        </tr>
                      </thead>
                      <tbody className="text-body">
                        <tr className="border-b border-line">
                          <td className="py-2 pr-3">{t('rc.irp.lump')}</td>
                          <td className="text-right py-2 px-3">{won(r.totalTax)}{W}</td>
                          <td className="text-right py-2 pl-3 text-muted">-</td>
                        </tr>
                        {([['to10', r.irp70], ['to20', r.irp60], ['over20', r.irp50]] as const).map(([k, v]) => (
                          <tr key={k} className="border-b border-line last:border-0">
                            <td className="py-2 pr-3">{t(`rc.irp.${k}`)}</td>
                            <td className="text-right py-2 px-3">{won(v)}{W}</td>
                            <td className="text-right py-2 pl-3 font-semibold text-primary">{won(r.totalTax - v)}{W}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-muted mt-3">{t('rc.irp.note')}</p>
                </div>
              )}

              {/* 퇴직일 늦추기 시뮬레이션 */}
              <div className="ui-card p-6">
                <h2 className="text-lg font-semibold text-fg">{t('rc.sim.title')}</h2>
                <p className="text-sm text-sub mt-1">{t('rc.sim.desc')}</p>
                <label className="flex items-center gap-3 mt-4">
                  <span className="text-sm text-body shrink-0">{t('rc.sim.range')}</span>
                  <input type="range" min={1} max={36} value={simN} onChange={(e) => setSimN(Number(e.target.value))}
                    className="flex-1 accent-[var(--primary)]" />
                  <span className="text-sm font-semibold text-fg w-16 text-right tabular-nums">{t('rc.sim.months', { n: simN })}</span>
                </label>
                <div className="overflow-x-auto mt-4">
                  <table className="w-full text-sm tabular-nums min-w-[520px]">
                    <thead>
                      <tr className="text-xs text-muted border-b border-line">
                        <th className="text-left font-medium py-2 pr-3">{t('rc.sim.col.end')}</th>
                        <th className="text-right font-medium py-2 px-3">{t('rc.sim.col.years')}</th>
                        <th className="text-right font-medium py-2 px-3">{t('rc.sim.col.pay')}</th>
                        <th className="text-right font-medium py-2 px-3">{t('rc.sim.col.tax')}</th>
                        <th className="text-right font-medium py-2 pl-3 w-40">{t('rc.sim.col.net')}</th>
                      </tr>
                    </thead>
                    <tbody className="text-body">
                      {sim.map((x, i) => {
                        const prev = sim[i - 1]
                        const nowEligible = !!prev && !prev.r.eligible && x.r.eligible
                        return (
                          <tr key={x.n} className={`border-b border-line last:border-0 ${x.n === 0 ? 'font-semibold text-fg' : ''}`}>
                            <td className="py-2 pr-3">
                              <span className="block">{x.n === 0 ? t('rc.sim.now') : t('rc.sim.plus', { n: x.n })}</span>
                              <span className="block text-xs text-muted font-normal">{x.end}</span>
                              <span className="flex flex-wrap gap-1 mt-1">
                                {nowEligible && <Badge>{t('rc.sim.eligible')}</Badge>}
                                {x.bracketUp ? <Badge>{t('rc.sim.bracketUp')}</Badge> : x.yearUp && <Badge>{t('rc.sim.yearUp')}</Badge>}
                              </span>
                            </td>
                            <td className="text-right py-2 px-3">{t('rc.tax.yearsValue', { n: x.r.taxYears })}</td>
                            <td className="text-right py-2 px-3">{won(x.r.pay)}</td>
                            <td className="text-right py-2 px-3">{won(x.r.totalTax)}</td>
                            <td className="py-2 pl-3">
                              <span className="block text-right">{won(x.r.net)}</span>
                              <span className="block h-1.5 bg-track rounded-full mt-1 overflow-hidden">
                                <span className="block h-full bg-primary rounded-full" style={{ width: `${(x.r.net / simMax) * 100}%` }} />
                              </span>
                              {i > 0 && <span className="block text-right text-xs text-primary mt-0.5">+{won(x.r.net - sim[0].r.net)}</span>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted mt-3">{t('rc.sim.note')}</p>
              </div>
            </>
          )}

          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg">{t('rc.next.title')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
              {([['/unemployment-benefit', 'unemployment'], ['/year-end-tax', 'yearEnd'], ['/national-pension', 'pension']] as const).map(([href, k]) => (
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

      <div className="ui-card p-6">
        <h2 className="text-lg font-semibold text-fg">{t('rc.sources.title')}</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {SOURCES.map(([k, href]) => (
            <li key={k}>
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{t(`rc.sources.${k}`)}</a>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-xs text-muted">{t('rc.disclaimer')}</p>
    </div>
  )
}

// ponytail: 네이티브 date 입력 — ui/DatePicker는 연도 이동이 없어 20년 전 입사일 선택이 불편
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

function Badge({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-primary-soft text-primary px-2 py-0.5 text-[11px] font-medium">{children}</span>
}
