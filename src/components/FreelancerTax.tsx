'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/freelancerTax'
import { AlertCircle, ExternalLink } from 'lucide-react'
import ShareResult from '@/components/ShareResult'
import {
  BRACKETS, INDUSTRIES, industryOf, eligibleMethod, isDoubleEntry, calc, withholding33, grossFromNet,
  nextFiling, SIMPLE_PREV_LIMIT, type Method,
} from '@/utils/freelancerTax'

const won = (n: number) => Math.round(n).toLocaleString('ko-KR')
const digits = (v: string) => v.replace(/[^0-9]/g, '').slice(0, 12)
const num = (v: string) => parseInt(v, 10) || 0
/** 1만원 단위 반올림 ("약 29만원") */
const approxMan = (n: number) => Math.round(Math.abs(n) / 10_000)

const METHODS: Method[] = ['simple', 'standard', 'book']
const M_CODE: Record<Method, string> = { simple: 's', standard: 'd', book: 'b' }

export default function FreelancerTax() {
  const t = useTranslations('freelancerTax')
  const searchParams = useSearchParams()

  // ── 입력 (현실적 기본값: 연 1,200만원 기타자영업 1인) ──
  const [revenue, setRevenue] = useState('12000000')
  const [prev, setPrev] = useState('12000000')
  const [code, setCode] = useState('940909')
  const [cSimple, setCSimple] = useState('64.1')
  const [cStandard, setCStandard] = useState('17.4')
  const [method, setMethod] = useState<Method | ''>('') // '' = 적용 대상 자동
  const [major, setMajor] = useState('0')
  const [book, setBook] = useState('0')
  const [persons, setPersons] = useState(1)
  const [children, setChildren] = useState(0)
  const [pension, setPension] = useState('0')
  const [yellow, setYellow] = useState('0')
  // 원천징수 변환기
  const [wDir, setWDir] = useState<'gross' | 'net'>('gross')
  const [wAmt, setWAmt] = useState('1000000')

  // URL → 상태 (최초 1회)
  const loaded = useRef(false)
  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    const g = (k: string) => searchParams.get(k)
    const n = (k: string, set: (v: string) => void) => { const v = g(k); if (v && /^\d{1,12}$/.test(v)) set(v) }
    n('rev', setRevenue); n('prev', setPrev); n('mj', setMajor); n('bk', setBook); n('np', setPension); n('yu', setYellow)
    const ind = g('ind')
    if (ind && (ind === 'custom' || INDUSTRIES.some((x) => x.code === ind))) setCode(ind)
    const r = (k: string, set: (v: string) => void) => { const v = g(k); if (v && /^\d{1,2}(\.\d)?$/.test(v)) set(v) }
    r('cs', setCSimple); r('cd', setCStandard)
    const m = METHODS.find((x) => M_CODE[x] === g('m')); if (m) setMethod(m)
    const p = Number(g('p')); if (Number.isInteger(p) && p >= 1 && p <= 10) setPersons(p)
    const c = Number(g('c')); if (Number.isInteger(c) && c >= 0 && c <= 5) setChildren(c)
  }, [searchParams])

  // 상태 → URL
  useEffect(() => {
    if (!loaded.current) return
    const url = new URL(window.location.href)
    const q: Record<string, string> = { rev: revenue, prev, ind: code, mj: major, bk: book, np: pension, yu: yellow, p: String(persons), c: String(children) }
    if (code === 'custom') { q.cs = cSimple; q.cd = cStandard }
    if (method) q.m = M_CODE[method]
    for (const k of ['rev', 'prev', 'ind', 'mj', 'bk', 'np', 'yu', 'p', 'c', 'cs', 'cd', 'm']) url.searchParams.delete(k)
    for (const [k, v] of Object.entries(q)) url.searchParams.set(k, v)
    window.history.replaceState(window.history.state, '', url)
  }, [revenue, prev, code, cSimple, cStandard, method, major, book, persons, children, pension, yellow])

  const industry = useMemo(
    () => industryOf(code, Math.min(99, parseFloat(cSimple) || 0), Math.min(99, parseFloat(cStandard) || 0)),
    [code, cSimple, cStandard],
  )
  const rev = num(revenue), prv = num(prev)
  const eligible = eligibleMethod(rev, prv)
  const active: Method = method || eligible
  const base = { revenue: rev, prev: prv, industry, major: num(major), bookExpense: num(book), persons, children, pension: num(pension), yellow: num(yellow) }
  const all = METHODS.map((m) => calc({ ...base, method: m }))
  const res = all[METHODS.indexOf(active)]
  // 날짜 의존 값은 마운트 후 계산 (정적 빌드 시점 날짜로 hydration 불일치 방지)
  const [filing, setFiling] = useState<ReturnType<typeof nextFiling> | null>(null)
  useEffect(() => setFiling(nextFiling(new Date())), [])
  const taxYear = filing?.taxYear ?? new Date().getFullYear() - 1

  const refundKind = res.refund > 0 ? 'refund' : res.refund < 0 ? 'pay' : 'zero'
  const headline = refundKind === 'zero' ? t('ft.hero.zero') : t(`ft.hero.${refundKind}`, { amount: won(approxMan(res.refund)), amountWon: won(approxMan(res.refund) * 10_000) })
  const methodName = (m: Method) => t(`ft.method.${m}`)
  const indName = code === 'custom' ? t('ft.ind.custom') : `${t(`ft.ind.${code}`)} (${code})`

  const wAmount = num(wAmt)
  const wGross = wDir === 'gross' ? wAmount : grossFromNet(wAmount)
  const w = withholding33(wGross)

  const field = 'ui-field w-full px-4 py-3 text-sm'
  const seg = (on: boolean) => `flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('ft.subtitle')}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ── 입력 ── */}
        <div className="lg:col-span-1 space-y-4">
          <div className="ui-card p-6 space-y-5">
            <Money label={t('ft.in.revenue')} value={revenue} onChange={setRevenue} hint={t('ft.in.revenueHint')} unit={t('ft.won')} />

            <div>
              <label htmlFor="ft-ind" className="block text-sm font-medium text-body mb-1.5">{t('ft.in.industry')}</label>
              <select id="ft-ind" value={code} onChange={(e) => setCode(e.target.value)} className={field}>
                {INDUSTRIES.map((x) => <option key={x.code} value={x.code}>{t(`ft.ind.${x.code}`)} ({x.code})</option>)}
                <option value="custom">{t('ft.ind.custom')}</option>
              </select>
              {code === 'custom' ? (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Rate label={t('ft.in.simpleRate')} value={cSimple} onChange={setCSimple} />
                  <Rate label={t('ft.in.standardRate')} value={cStandard} onChange={setCStandard} />
                  <p className="col-span-2 text-xs text-muted">{t('ft.in.customHint')}</p>
                </div>
              ) : (
                <p className="text-xs text-muted mt-1.5">{t('ft.in.rateLine', { simple: industry.simple, excess: industry.excess, standard: industry.standard })}</p>
              )}
            </div>

            <Money label={t('ft.in.prev')} value={prev} onChange={setPrev} hint={t('ft.in.prevHint')} unit={t('ft.won')} />

            <div>
              <div className="block text-sm font-medium text-body mb-1.5">{t('ft.in.method')}</div>
              <div className="flex gap-1.5" role="radiogroup" aria-label={t('ft.in.method')}>
                {METHODS.map((m) => (
                  <button key={m} type="button" role="radio" aria-checked={active === m} onClick={() => setMethod(m === eligible ? '' : m)} className={seg(active === m)}>
                    {methodName(m)}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted mt-1.5">
                {t('ft.in.eligible', { method: methodName(eligible) })}{isDoubleEntry(prv) ? ` · ${t('ft.in.doubleEntry')}` : ''}
              </p>
              {active === 'simple' && eligible !== 'simple' && (
                <p className="text-xs text-amber-700 mt-1">{t('ft.in.notEligible', { limit: won(SIMPLE_PREV_LIMIT / 10_000), limitWon: won(SIMPLE_PREV_LIMIT) })}</p>
              )}
            </div>

            {active === 'standard' && <Money label={t('ft.in.major')} value={major} onChange={setMajor} hint={t('ft.in.majorHint')} unit={t('ft.won')} />}
            {active === 'book' && <Money label={t('ft.in.book')} value={book} onChange={setBook} hint={t('ft.in.bookHint')} unit={t('ft.won')} />}

            <div className="border-t border-line pt-5 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="ft-p" className="block text-sm font-medium text-body mb-1.5">{t('ft.in.persons')}</label>
                  <select id="ft-p" value={persons} onChange={(e) => { const v = Number(e.target.value); setPersons(v); setChildren((c) => Math.min(c, v - 1)) }} className={field}>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{t('ft.people', { n })}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="ft-c" className="block text-sm font-medium text-body mb-1.5">{t('ft.in.children')}</label>
                  <select id="ft-c" value={children} onChange={(e) => setChildren(Number(e.target.value))} className={field}>
                    {Array.from({ length: Math.min(6, persons) }, (_, i) => i).map((n) => <option key={n} value={n}>{t('ft.people', { n })}</option>)}
                  </select>
                </div>
              </div>
              <p className="text-xs text-muted -mt-2">{t('ft.in.personsHint')}</p>
              <Money label={t('ft.in.pension')} value={pension} onChange={setPension} hint={t('ft.in.pensionHint')} unit={t('ft.won')} />
              <Money label={t('ft.in.yellow')} value={yellow} onChange={setYellow} hint={t('ft.in.yellowHint', { limit: won(res.yellowLimit / 10_000), limitWon: won(res.yellowLimit) })} unit={t('ft.won')} />
            </div>
          </div>
        </div>

        {/* ── 결과 ── */}
        <div className="lg:col-span-2 space-y-6">
          <div className="ui-hero p-6">
            <div className="text-sm text-white/70">{t('ft.hero.label', { year: taxYear, rev: won(rev) })}</div>
            <div className="text-3xl sm:text-4xl font-bold mt-2 tabular-nums">{headline}</div>
            <div className="text-sm text-white/80 mt-2 tabular-nums">
              {t('ft.hero.vs', { withheld: won(res.withheld.total), tax: won(res.totalTax) })}
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <span className="rounded-full bg-white/15 px-3 py-1 text-sm">{methodName(active)}</span>
              <span className="rounded-full bg-white/15 px-3 py-1 text-sm">{t('ft.hero.eff', { rate: res.effRate.toFixed(1) })}</span>
              {filing && (
                <span className="rounded-full bg-white/15 px-3 py-1 text-sm">
                  {filing.days === 0 ? t('ft.hero.ddayToday') : t('ft.hero.dday', { days: filing.days, date: filing.dateStr })}
                </span>
              )}
            </div>
          </div>

          <ShareResult
            card={{
              tool: t('title'),
              label: t('ft.share.label', { rev: won(approxMan(rev)), revWon: won(rev) }),
              headline,
              sub: `${indName} · ${methodName(active)}`,
              rows: [
                { label: t('ft.row.withheld'), value: `${won(res.withheld.total)}${t('ft.won')}` },
                { label: t('ft.row.totalTax'), value: `${won(res.totalTax)}${t('ft.won')}` },
                { label: t('ft.row.income'), value: `${won(res.income)}${t('ft.won')}` },
              ],
            }}
            text={t('ft.share.text', { rev: won(approxMan(rev)), revWon: won(rev), result: headline })}
          />

          {/* 방식 비교 */}
          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg">{t('ft.cmp.title')}</h2>
            <p className="text-sm text-muted mt-1">{t('ft.cmp.desc')}</p>
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-sm tabular-nums">
                <thead>
                  <tr className="text-xs text-muted border-b border-line">
                    <th className="py-2 text-left font-medium">{t('ft.cmp.method')}</th>
                    <th className="py-2 text-right font-medium">{t('ft.row.income')}</th>
                    <th className="py-2 text-right font-medium">{t('ft.row.totalTax')}</th>
                    <th className="py-2 text-right font-medium">{t('ft.cmp.result')}</th>
                  </tr>
                </thead>
                <tbody>
                  {METHODS.map((m, i) => {
                    const r = all[i]
                    const missing = m === 'book' && num(book) === 0
                    return (
                      <tr key={m} className={`border-b border-line last:border-0 ${active === m ? 'bg-primary-soft text-primary' : 'text-body'}`}>
                        <td className="py-2.5 pl-2">
                          <button type="button" onClick={() => setMethod(m === eligible ? '' : m)} className="font-medium text-left">
                            {methodName(m)}{m === eligible && <span className="ml-1 text-xs text-muted">{t('ft.cmp.eligibleTag')}</span>}
                          </button>
                        </td>
                        {missing ? (
                          <td colSpan={3} className="py-2.5 pr-2 text-right text-xs text-muted">{t('ft.cmp.bookEmpty')}</td>
                        ) : (
                          <>
                            <td className="py-2.5 text-right">{won(r.income)}</td>
                            <td className="py-2.5 text-right">{won(r.totalTax)}</td>
                            <td className={`py-2.5 pr-2 text-right font-semibold ${r.refund < 0 ? 'text-red-600' : ''}`}>
                              {r.refund >= 0 ? '+' : '−'}{won(Math.abs(r.refund))}
                            </td>
                          </>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="bg-subtle rounded-2xl p-4 mt-4 text-sm text-sub space-y-1">
              <p>{t('ft.cmp.hintBook')}</p>
              {res.capped && <p>{t('ft.cmp.hintCap')}</p>}
              {res.penalty > 0 && <p className="text-amber-700">{t('ft.cmp.hintPenalty', { amount: won(res.penalty) })}</p>}
            </div>
          </div>

          {/* 상세 */}
          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg mb-4">{t('ft.row.title')}</h2>
            <dl className="space-y-2 text-sm tabular-nums">
              <Row label={t('ft.row.revenue')} value={won(rev)} strong />
              <Row label={t('ft.row.expense', { method: methodName(active) })} value={`−${won(res.expense)}`} />
              <Row label={t('ft.row.income')} value={won(res.income)} strong />
              <Row label={t('ft.row.basic', { n: persons })} value={`−${won(res.basic)}`} sub />
              {res.pension > 0 && <Row label={t('ft.row.pension')} value={`−${won(res.pension)}`} sub />}
              {res.yellow > 0 && <Row label={t('ft.row.yellow')} value={`−${won(res.yellow)}`} sub />}
              <Row label={t('ft.row.taxable')} value={won(res.taxable)} strong />
              <Row label={t('ft.row.computed', { rate: res.bracket >= 0 ? BRACKETS[res.bracket].rate * 100 : 0 })} value={won(res.computed)} />
              {res.childCredit > 0 && <Row label={t('ft.row.childCredit')} value={`−${won(res.childCredit)}`} sub />}
              {res.standardCredit > 0 && <Row label={t('ft.row.standardCredit')} value={`−${won(res.standardCredit)}`} sub />}
              {res.penalty > 0 && <Row label={t('ft.row.penalty')} value={`+${won(res.penalty)}`} sub />}
              <Row label={t('ft.row.incomeTax')} value={won(res.incomeTax)} />
              <Row label={t('ft.row.localTax')} value={won(res.localTax)} />
              <Row label={t('ft.row.totalTax')} value={won(res.totalTax)} strong />
              <Row label={t('ft.row.withheldDetail', { it: won(res.withheld.incomeTax), lt: won(res.withheld.localTax) })} value={`−${won(res.withheld.total)}`} />
              <div className="flex justify-between items-center rounded-xl bg-subtle px-3 py-2.5 mt-2 font-bold">
                <dt className="text-fg">{t(res.refund >= 0 ? 'ft.row.refund' : 'ft.row.pay')}</dt>
                <dd className={res.refund < 0 ? 'text-red-600' : 'text-primary'}>{won(Math.abs(res.refund))}{t('ft.won')}</dd>
              </div>
            </dl>
          </div>

          {/* 원천징수 변환기 */}
          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg">{t('ft.wh.title')}</h2>
            <p className="text-sm text-muted mt-1">{t('ft.wh.desc')}</p>
            <div className="flex gap-1.5 mt-4" role="radiogroup" aria-label={t('ft.wh.title')}>
              {(['gross', 'net'] as const).map((d) => (
                <button key={d} type="button" role="radio" aria-checked={wDir === d} onClick={() => setWDir(d)} className={seg(wDir === d)}>{t(`ft.wh.${d}`)}</button>
              ))}
            </div>
            <div className="mt-3">
              <Money label={t(wDir === 'gross' ? 'ft.wh.grossInput' : 'ft.wh.netInput')} value={wAmt} onChange={setWAmt} unit={t('ft.won')} />
            </div>
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 tabular-nums">
              {[
                [t('ft.wh.outPay'), wGross],
                [t('ft.wh.incomeTax'), w.incomeTax],
                [t('ft.wh.localTax'), w.localTax],
                [t('ft.wh.outNet'), wGross - w.total],
              ].map(([l, v], i) => (
                <div key={i} className={`rounded-xl p-3 ${i === (wDir === 'gross' ? 3 : 0) ? 'bg-primary-soft text-primary' : 'bg-subtle'}`}>
                  <dt className="text-xs text-muted">{l}</dt>
                  <dd className="font-bold text-fg mt-0.5">{won(v as number)}</dd>
                </div>
              ))}
            </dl>
            <p className="text-xs text-muted mt-3">{t('ft.wh.note')}</p>
          </div>

          {/* 세율표 */}
          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg mb-3">{t('ft.rate.title')}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm tabular-nums">
                <thead>
                  <tr className="text-xs text-muted border-b border-line">
                    <th className="py-2 text-left font-medium">{t('ft.rate.bracket')}</th>
                    <th className="py-2 text-right font-medium">{t('ft.rate.rate')}</th>
                    <th className="py-2 text-right font-medium">{t('ft.rate.deduction')}</th>
                  </tr>
                </thead>
                <tbody>
                  {BRACKETS.map((b, i) => {
                    const lo = i > 0 ? BRACKETS[i - 1].upTo : 0
                    return (
                      <tr key={i} className={`border-b border-line last:border-0 ${res.bracket === i ? 'bg-primary-soft text-primary' : 'text-body'}`}>
                        <td className="py-2 pl-2">
                          {b.upTo === Infinity ? t('ft.rate.over', { lo: won(lo / 10_000), loWon: won(lo) }) : t('ft.rate.range', { lo: won(lo / 10_000), hi: won(b.upTo / 10_000), loWon: won(lo), hiWon: won(b.upTo) })}
                        </td>
                        <td className="py-2 text-right font-medium">{Math.round(b.rate * 100)}%</td>
                        <td className="py-2 pr-2 text-right">{won(b.deduction)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 연계 */}
          <div className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-2">
            <p className="font-medium text-fg">{t('ft.links.title')}</p>
            <p>{t('ft.links.health')} <Link href="/health-insurance/" className="text-primary underline">{t('ft.links.healthLink')}</Link></p>
            <p>{t('ft.links.pension')} <Link href="/national-pension/" className="text-primary underline">{t('ft.links.pensionLink')}</Link></p>
            <p>
              {t('ft.links.hometax')}{' '}
              <a href="https://www.hometax.go.kr" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-0.5">
                {t('ft.links.hometaxLink')}<ExternalLink className="w-3 h-3" aria-hidden="true" />
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* 가이드 */}
      <div className="ui-card p-6">
        <h2 className="text-xl font-semibold text-fg mb-6">{t('ft.guide.title')}</h2>
        <div className="grid md:grid-cols-2 gap-6 text-sm text-body">
          {(['withholding', 'rates', 'deductions', 'filing'] as const).map((s) => (
            <section key={s}>
              <h3 className="font-semibold text-fg mb-2">{t(`ft.guide.${s}.title`)}</h3>
              <ul className="list-disc pl-5 space-y-1.5">
                {(t.raw(`ft.guide.${s}.items`) as string[]).map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </section>
          ))}
        </div>
        <p className="text-xs text-muted mt-6">{t('ft.guide.sources')}</p>
      </div>

      <div className="bg-amber-50 text-amber-800 rounded-2xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-xs">{t('ft.disclaimer')}</p>
      </div>
    </div>
  )
}

function Money({ label, value, onChange, hint, unit }: { label: string; value: string; onChange: (v: string) => void; hint?: string; unit: string }) {
  const shown = value ? num(value).toLocaleString('ko-KR') : ''
  return (
    <label className="block">
      <span className="block text-sm font-medium text-body mb-1.5">{label}</span>
      <span className="relative block">
        <input type="text" inputMode="numeric" value={shown} onChange={(e) => onChange(digits(e.target.value))}
          className="ui-field w-full px-4 py-3 pr-9 text-sm tabular-nums" />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-faint">{unit}</span>
      </span>
      {hint && <span className="block text-xs text-muted mt-1.5">{hint}</span>}
    </label>
  )
}

function Rate({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="block text-xs text-muted mb-1">{label}</span>
      <span className="relative block">
        <input type="text" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, '').slice(0, 4))}
          className="ui-field w-full px-3 py-2 pr-7 text-sm tabular-nums" />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-faint">%</span>
      </span>
    </label>
  )
}

function Row({ label, value, strong, sub }: { label: string; value: string; strong?: boolean; sub?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${sub ? 'pl-4 text-xs text-muted' : strong ? 'font-semibold text-fg' : 'text-body'}`}>
      <dt>{label}</dt>
      <dd className="shrink-0">{value}</dd>
    </div>
  )
}
