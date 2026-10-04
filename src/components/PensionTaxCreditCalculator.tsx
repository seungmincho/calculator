'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/pensionTaxCredit'
import { useSearchParams } from '@/hooks/useSearchParams'
import ShareResult from '@/components/ShareResult'
import AddToCalendar, { useDeadlineEvent } from '@/components/AddToCalendar'
import { DEADLINE, TAX_YEAR } from '@/utils/yearEndTax'
import { topUp, exitTax, PS_CAP, TOTAL_CAP, ISA_CAP, ISA_RATE, type IsaTo } from '@/utils/pensionTaxCredit'

// 계산은 pensionTaxCredit.ts → yearEndTax.ts(연말정산 계산기와 같은 함수). URL 키 s·ps·irp는 /year-end-tax와 같음 (양방향 링크)
const SALARY_PRESETS = [35_000_000, 50_000_000, 55_000_000, 80_000_000, 100_000_000]
const GAINS = [0, 10, 30] // 꺼낼 때까지 누적 운용수익률(%)
// 기본값: 총급여 5,000만, 연금저축에 300만 넣은 직장인 → 남은 한도 600만을 채우는 효과가 첫 화면에 보이게
const DEF = { salary: 50_000_000, ps: 3_000_000, irp: 0, isa: 0, isaTo: 'ps' as IsaTo, add: TOTAL_CAP, gain: 10 }
const MAX = 10_000_000_000
const STEP = 10_000

const won = (n: number) => Math.round(n).toLocaleString('ko-KR')
const man = (n: number) => (n / 10_000).toLocaleString('ko-KR', { maximumFractionDigits: 0 })
/** 영어 문구용 백만 단위 */
const mil = (n: number) => (n / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 1 })
/** 공제율(소득세) → 지방소득세 포함 % (0.15 → 16.5) */
const pct = (r: number) => (Math.round(r * 1100) / 10).toString()
const digits = (s: string) => s.replace(/[^\d]/g, '')
const amount = (v: string | null) => (v && /^\d{1,11}$/.test(v) ? Number(v) : null)

function MoneyInput({ id, label, value, onChange, hint, unit }: { id: string; label: string; value: number; onChange: (n: number) => void; hint?: string; unit: string }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-body mb-2">{label}</label>
      <div className="relative">
        <input
          id={id} type="text" inputMode="numeric" value={value ? won(value) : ''} placeholder="0"
          onChange={(e) => onChange(Math.min(Number(digits(e.target.value)) || 0, MAX))}
          className="ui-field w-full px-4 py-3 pr-12 tabular-nums" aria-describedby={hint ? `${id}-hint` : undefined}
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">{unit}</span>
      </div>
      {hint && <p id={`${id}-hint`} className="text-xs text-muted mt-1.5">{hint}</p>}
    </div>
  )
}

function Meter({ label, used, cap, text }: { label: string; used: number; cap: number; text: string }) {
  const p = cap ? Math.min(100, (used / cap) * 100) : 0
  return (
    <div className="rounded-2xl p-4 bg-subtle">
      <p className="text-sm text-muted">{label}</p>
      <p className="text-lg font-bold text-fg tabular-nums mt-1">{text}</p>
      <div className="mt-2 h-2 rounded-full bg-track overflow-hidden" role="progressbar" aria-label={label}
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p)}>
        <div className="h-full bg-primary rounded-full" style={{ width: `${p}%` }} />
      </div>
    </div>
  )
}

export default function PensionTaxCreditCalculator() {
  const t = useTranslations('pensionTaxCredit')
  const sp = useSearchParams()
  const deadlineEvent = useDeadlineEvent()
  const [salary, setSalary] = useState(DEF.salary)
  const [ps, setPs] = useState(DEF.ps)
  const [irp, setIrp] = useState(DEF.irp)
  const [isa, setIsa] = useState(DEF.isa)
  const [isaTo, setIsaTo] = useState<IsaTo>(DEF.isaTo)
  const [add, setAdd] = useState(DEF.add)
  const [gain, setGain] = useState(DEF.gain)

  // URL → 상태 (마운트 후 1회 — 첫 렌더는 기본값으로 정적 HTML과 같게).
  // /year-end-tax는 0인 값을 빼고 넘기므로 s·ps·irp 중 하나라도 있으면 빠진 납입액은 0
  const loaded = useRef(false)
  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    if (!['s', 'ps', 'irp'].some((k) => sp.has(k))) return
    setSalary(amount(sp.get('s')) ?? DEF.salary)
    setPs(amount(sp.get('ps')) ?? 0)
    setIrp(amount(sp.get('irp')) ?? 0)
    setIsa(amount(sp.get('isa')) ?? 0)
    setIsaTo(sp.get('it') === 'irp' ? 'irp' : 'ps')
    setAdd(amount(sp.get('a')) ?? DEF.add)
    const g = amount(sp.get('g'))
    if (g !== null && GAINS.includes(g)) setGain(g)
  }, [sp])

  const r = topUp({ salary, ps, irp, isa, isaTo }, add)
  const { cur, next } = r

  useEffect(() => {
    if (!loaded.current) return
    const q = new URLSearchParams({ s: String(salary), ps: String(ps), irp: String(irp) })
    if (isa) {
      q.set('isa', String(isa))
      if (isaTo === 'irp') q.set('it', 'irp')
    }
    q.set('a', String(r.amt))
    q.set('g', String(gain))
    window.history.replaceState(window.history.state, '', `?${q}`)
  }, [salary, ps, irp, isa, isaTo, r.amt, gain])

  const W = t('won')
  const rate = pct(cur.rate)
  const ex = exitTax(next.base, gain / 100)
  const net = next.saving - ex.early
  const isaCap = Math.min(Math.floor(isa * ISA_RATE), ISA_CAP)
  const fullLink = `/year-end-tax/?${new URLSearchParams(
    Object.entries({ s: salary, ps: ps + r.toPs, irp: irp + r.toIrp }).filter(([, v]) => v > 0).map(([k, v]) => [k, String(v)]),
  )}`
  const chips = [1_000_000, 3_000_000].filter((n) => n < cur.room)

  const card = {
    tool: t('title'),
    label: t('share.label', { salary: man(salary), salaryM: mil(salary) }),
    headline: t('share.headline', { saving: won(next.saving) }),
    sub: r.gain > 0 ? t('share.sub', { amt: won(r.amt), gain: won(r.gain) }) : t('share.subNone'),
    rows: [
      { label: t('rows.base'), value: `${won(next.base)}${W}` },
      { label: t('rows.rate'), value: `${rate}%` },
      { label: t('rows.saving'), value: `${won(next.saving)}${W}` },
      { label: t('rows.room'), value: `${won(next.room)}${W}` },
    ],
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle', { year: TAX_YEAR })}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <div className="lg:col-span-1">
          <div className="ui-card p-6 space-y-5">
            <div>
              <MoneyInput id="ptc-salary" label={t('salary')} value={salary} onChange={setSalary} unit={W} hint={t('salaryHint')} />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {SALARY_PRESETS.map((n) => (
                  <button
                    key={n} type="button" onClick={() => setSalary(n)} aria-pressed={salary === n}
                    className={`min-h-[44px] px-3 py-2 rounded-lg text-sm tabular-nums transition-colors ${salary === n ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}
                  >
                    {t('manUnit', { n: man(n), m: mil(n) })}
                  </button>
                ))}
              </div>
            </div>
            <MoneyInput id="ptc-ps" label={t('ps')} value={ps} onChange={setPs} unit={W} hint={t('psHint')} />
            <MoneyInput id="ptc-irp" label={t('irp')} value={irp} onChange={setIrp} unit={W} hint={t('irpHint')} />
            <MoneyInput id="ptc-isa" label={t('isa')} value={isa} onChange={setIsa} unit={W} hint={t('isaHint')} />
            {isa > 0 && (
              <div>
                <p id="ptc-isa-to" className="text-sm font-medium text-body mb-2">{t('isaTo.label')}</p>
                <div role="radiogroup" aria-labelledby="ptc-isa-to" className="grid grid-cols-2 gap-2">
                  {(['ps', 'irp'] as const).map((k) => (
                    <button
                      key={k} type="button" role="radio" aria-checked={isaTo === k} onClick={() => setIsaTo(k)}
                      className={`min-h-[44px] px-2 py-2 rounded-lg text-sm font-medium transition-colors ${isaTo === k ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}
                    >
                      {t(`isaTo.${k}`)}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted mt-1.5">{t('isaTo.hint')}</p>
              </div>
            )}
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="ui-card p-6 space-y-5">
            <div aria-live="polite">
              <p className="text-sm text-muted">{t('result.label')}</p>
              <p className="text-3xl font-bold text-fg tabular-nums mt-1">{won(cur.saving)}{W}</p>
              <p className="text-sm text-sub mt-1">
                {cur.base > 0
                  ? t('result.detail', { base: won(cur.base), rate, tax: won(cur.taxBefore) })
                  : t('result.none', { rate })}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Meter label={t('limit.ps')} used={Math.min(cur.p, PS_CAP)} cap={PS_CAP}
                text={t('limit.of', { used: man(Math.min(cur.p, PS_CAP)), cap: man(PS_CAP), usedM: mil(Math.min(cur.p, PS_CAP)), capM: mil(PS_CAP) })} />
              <Meter label={t('limit.total')} used={cur.regular} cap={TOTAL_CAP}
                text={t('limit.of', { used: man(cur.regular), cap: man(TOTAL_CAP), usedM: mil(cur.regular), capM: mil(TOTAL_CAP) })} />
              {isa > 0 && (
                <Meter label={t('limit.isa')} used={cur.isaExtra} cap={isaCap}
                  text={t('limit.of', { used: man(cur.isaExtra), cap: man(isaCap), usedM: mil(cur.isaExtra), capM: mil(isaCap) })} />
              )}
              <div className="rounded-2xl p-4 bg-subtle">
                <p className="text-sm text-muted">{t('limit.rate')}</p>
                <p className="text-lg font-bold text-fg tabular-nums mt-1">{rate}%</p>
                <p className="text-xs text-muted mt-1">{t(salary <= 55_000_000 ? 'limit.rateLow' : 'limit.rateHigh')}</p>
              </div>
            </div>
            {cur.over > 0 && <p className="text-sm text-sub">{t('limit.over', { over: won(cur.over) })}</p>}
          </div>

          {/* 12월 31일까지 더 넣으면 */}
          <div className="ui-card p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-fg">{t('topUp.title')}</h2>
              <p className="text-sm text-muted mt-1">{t('topUp.desc', { room: won(cur.room) })}</p>
            </div>

            {cur.room > 0 ? (
              <>
                <div>
                  <div className="flex items-baseline justify-between gap-3">
                    <label htmlFor="ptc-add" className="text-sm font-medium text-body">{t('topUp.slider')}</label>
                    <span className="text-sm font-semibold text-fg tabular-nums">{won(r.amt)}{W}</span>
                  </div>
                  <input
                    id="ptc-add" type="range" min={0} max={cur.room} step={STEP} value={r.amt}
                    onChange={(e) => setAdd(Number(e.target.value))}
                    aria-valuetext={`${won(r.amt)}${W}`}
                    className="w-full mt-3 h-11 accent-[var(--primary)] cursor-pointer"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {chips.map((n) => (
                      <button
                        key={n} type="button" onClick={() => setAdd(n)} aria-pressed={r.amt === n}
                        className={`min-h-[44px] px-3 py-2 rounded-lg text-sm tabular-nums transition-colors ${r.amt === n ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}
                      >
                        {t('manUnit', { n: man(n), m: mil(n) })}
                      </button>
                    ))}
                    <button
                      type="button" onClick={() => setAdd(cur.room)} aria-pressed={r.amt === cur.room}
                      className={`min-h-[44px] px-3 py-2 rounded-lg text-sm transition-colors ${r.amt === cur.room ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}
                    >
                      {t('topUp.all')}
                    </button>
                  </div>
                </div>

                <div className={`rounded-2xl p-4 ${r.gain > 0 ? 'bg-primary-soft' : 'bg-subtle'}`} aria-live="polite">
                  <p className="text-xl font-bold text-primary tabular-nums">{t('topUp.gain', { gain: won(r.gain) })}</p>
                  <p className="text-sm text-body mt-1">
                    {r.amt > 0
                      ? t('topUp.result', { amt: won(r.amt), gain: won(r.gain), total: won(next.saving) })
                      : t('topUp.zero')}
                  </p>
                  {r.amt > 0 && <p className="text-xs text-sub mt-1">{t('topUp.split', { ps: won(r.toPs), irp: won(r.toIrp) })}</p>}
                </div>
              </>
            ) : (
              <p className="rounded-2xl p-4 bg-subtle text-sm text-sub">{t('topUp.full')}</p>
            )}

            {next.wasted > 0 && (
              <div className="rounded-2xl p-4 bg-amber-50 text-amber-800 text-sm space-y-1" role="note">
                <p className="font-semibold">{t('cap.title')}</p>
                <p>{t('cap.body', { tax: won(next.taxBefore), useful: won(next.usefulBase), wasted: won(next.wasted) })}</p>
                <p>{t('cap.tip')}</p>
              </div>
            )}

            <p className="text-sm text-sub">{t('deadline.note', { year: TAX_YEAR })}</p>
            <div className="flex flex-wrap gap-2">
              <Link href={fullLink} prefetch={false} className="ui-btn inline-flex items-center min-h-11 px-4 py-3 text-sm">{t('topUp.yearEnd')}</Link>
              <AddToCalendar file={`pension-tax-credit-${TAX_YEAR}.ics`} events={[deadlineEvent('yearEnd', DEADLINE.yearEnd, '/pension-tax-credit', 7)]} />
            </div>

            <ShareResult
              card={card} fileName="pension-tax-credit"
              text={t('share.text', { salary: man(salary), salaryM: mil(salary), base: won(next.base), saving: won(next.saving) })}
            />
          </div>

          {/* 나중에 꺼낼 때 */}
          <div className="ui-card p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-fg">{t('later.title')}</h2>
              <p className="text-sm text-muted mt-1">{t('later.desc', { base: won(next.base) })}</p>
            </div>
            <div>
              <p id="ptc-gain" className="text-sm font-medium text-body mb-2">{t('later.gain')}</p>
              <div role="radiogroup" aria-labelledby="ptc-gain" className="grid grid-cols-3 gap-2">
                {GAINS.map((g) => (
                  <button
                    key={g} type="button" role="radio" aria-checked={gain === g} onClick={() => setGain(g)}
                    className={`min-h-[44px] px-2 py-2 rounded-lg text-sm font-medium tabular-nums transition-colors ${gain === g ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}
                  >
                    {g}%
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm tabular-nums">
                <caption className="sr-only">{t('later.caption')}</caption>
                <thead>
                  <tr className="border-b border-line text-muted">
                    <th scope="col" className="text-left font-medium py-2 pr-2">{t('later.when')}</th>
                    <th scope="col" className="text-right font-medium py-2 px-2">{t('later.rate')}</th>
                    <th scope="col" className="text-right font-medium py-2 pl-2">{t('later.amount')}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-line">
                    <th scope="row" className="text-left font-medium py-3 pr-2 text-body">{t('later.refund')}</th>
                    <td className="text-right py-3 px-2 text-sub">{rate}%</td>
                    <td className="text-right py-3 pl-2 font-semibold text-primary">+{won(next.saving)}</td>
                  </tr>
                  {(['a70', 'a80', 'a80p'] as const).map((k, i) => (
                    <tr key={k} className="border-b border-line">
                      <th scope="row" className="text-left font-medium py-3 pr-2 text-body">{t(`later.${k}`)}</th>
                      <td className="text-right py-3 px-2 text-sub">{['5.5', '4.4', '3.3'][i]}%</td>
                      <td className="text-right py-3 pl-2 text-fg">−{won(ex.annuity[i])}</td>
                    </tr>
                  ))}
                  <tr>
                    <th scope="row" className="text-left font-medium py-3 pr-2 text-body">{t('later.early')}</th>
                    <td className="text-right py-3 px-2 text-sub">16.5%</td>
                    <td className="text-right py-3 pl-2 text-fg">−{won(ex.early)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            {next.base > 0 && (
              <p className={`rounded-2xl p-4 text-sm ${net < 0 ? 'bg-amber-50 text-amber-800' : 'bg-subtle text-sub'}`} aria-live="polite">
                {net < 0
                  ? t('later.loss', { refund: won(next.saving), tax: won(ex.early), loss: won(-net) })
                  : t('later.even', { refund: won(next.saving), tax: won(ex.early), annuity: won(ex.annuity[0]) })}
              </p>
            )}
            <ul className="list-disc pl-5 space-y-1.5 text-sm text-sub">
              {(t.raw('later.notes') as string[]).map((x, i) => <li key={i}>{x}</li>)}
            </ul>
          </div>

          {/* 연금저축 vs IRP */}
          <div className="ui-card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-fg">{t('compare.title')}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">{t('compare.title')}</caption>
                <thead>
                  <tr className="border-b border-line text-muted">
                    <th scope="col" className="text-left font-medium py-2 pr-2 w-1/4">{t('compare.item')}</th>
                    <th scope="col" className="text-left font-medium py-2 px-2">{t('compare.ps')}</th>
                    <th scope="col" className="text-left font-medium py-2 pl-2">{t('compare.irp')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(t.raw('compare.rows') as string[][]).map(([item, a, b]) => (
                    <tr key={item} className="border-b border-line align-top">
                      <th scope="row" className="text-left font-medium py-3 pr-2 text-body">{item}</th>
                      <td className="py-3 px-2 text-sub">{a}</td>
                      <td className="py-3 pl-2 text-sub">{b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted">{t('compare.source')}</p>
          </div>

          {/* 핵심 정리 */}
          <div className="ui-card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-fg">{t('guide.title', { year: TAX_YEAR })}</h2>
            <ul className="list-disc pl-5 space-y-1.5 text-sm text-sub">
              {(t.raw('guide.items') as string[]).map((x, i) => <li key={i}>{x}</li>)}
            </ul>
            <p className="text-xs text-muted">{t('guide.assume')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
