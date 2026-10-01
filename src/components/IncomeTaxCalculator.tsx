'use client'

// 종합소득세 계산기 (2025년 귀속, 2026년 5월 신고). 계산 로직: src/utils/incomeTax.ts (회귀 체크 scripts/check-income-tax.ts)
// i18n: incomeTaxCalc.it.* (새 키), title·won·disclaimer (기존 키). 업종명은 freelancerTax.ft.ind.* 재사용.

import { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useTranslations } from '@/lib/i18n'
import { AlertCircle, ExternalLink } from 'lucide-react'
import ShareResult from '@/components/ShareResult'
import { INDUSTRIES, industryOf, isDoubleEntry, SIMPLE_PREV_LIMIT } from '@/utils/freelancerTax'
import { calc, eligibleMethod, BRACKETS, OTHER_SEPARATE_LIMIT, type Input, type Method } from '@/utils/incomeTax'

const won = (n: number) => Math.round(n).toLocaleString('ko-KR')
const man = (n: number) => won(n / 10_000)
const digits = (v: string) => v.replace(/[^0-9]/g, '').slice(0, 12)
const num = (v: string) => parseInt(v, 10) || 0

const METHODS: Method[] = ['simple', 'standard', 'book']
const TYPES = ['b', 'w', 'o', 'f'] as const // 사업·근로·기타·금융
type TypeKey = (typeof TYPES)[number]
const TYPE_NAME: Record<TypeKey, string> = { b: 'biz', w: 'wage', o: 'other', f: 'fin' }

// 금액 입력 → URL 파라미터 (revenue·occ·method는 예전 링크와 호환)
const MONEY = {
  revenue: 'revenue', prev: 'prev', major: 'major', book: 'book', salary: 'salary', wageTax: 'wtax',
  otherDeduction: 'odd', otherCredit: 'ocr', otherPay: 'other', finIncome: 'fin', pension: 'np', yellow: 'yu',
  pensionSavings: 'ps', irp: 'irp', midterm: 'mid',
} as const
type MoneyKey = keyof typeof MONEY
const DEFAULT_MONEY: Record<MoneyKey, string> = {
  revenue: '30000000', prev: '25000000', major: '0', book: '0', salary: '40000000', wageTax: '',
  otherDeduction: '0', otherCredit: '0', otherPay: '5000000', finIncome: '30000000', pension: '0', yellow: '0',
  pensionSavings: '0', irp: '0', midterm: '0',
}
const COUNTS = { persons: 'p', elderly: 'el', disabled: 'dis', children: 'c' } as const
type CountKey = keyof typeof COUNTS
const DEFAULT_COUNTS: Record<CountKey, number> = { persons: 1, elderly: 0, disabled: 0, children: 0 }

export default function IncomeTaxCalculator() {
  const t = useTranslations('incomeTaxCalc')
  const tf = useTranslations('freelancerTax')
  const searchParams = useSearchParams()

  const [types, setTypes] = useState<TypeKey[]>(['b'])
  const [m, setM] = useState<Record<MoneyKey, string>>(DEFAULT_MONEY)
  const [counts, setCounts] = useState<Record<CountKey, number>>(DEFAULT_COUNTS)
  const [code, setCode] = useState('940909')
  const [cSimple, setCSimple] = useState('64.1')
  const [cStandard, setCStandard] = useState('17.4')
  const [method, setMethod] = useState<Method | ''>('') // '' = 적용 대상 자동
  const [w33, setW33] = useState(true)
  const [oRate, setORate] = useState('60')
  const [efiling, setEfiling] = useState(true)
  const setMoney = (k: MoneyKey) => (v: string) => setM((s) => ({ ...s, [k]: v }))

  // URL → 상태 (최초 1회)
  const loaded = useRef(false)
  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    const g = (k: string) => searchParams.get(k)
    const inc = g('inc')
    if (inc) { const v = TYPES.filter((x) => inc.includes(x)); if (v.length) setTypes(v) }
    const money: Partial<Record<MoneyKey, string>> = {}
    for (const k of Object.keys(MONEY) as MoneyKey[]) { const v = g(MONEY[k]); if (v != null && /^\d{0,12}$/.test(v)) money[k] = v }
    if (Object.keys(money).length) setM((s) => ({ ...s, ...money }))
    const c: Partial<Record<CountKey, number>> = {}
    for (const k of Object.keys(COUNTS) as CountKey[]) { const v = Number(g(COUNTS[k])); if (g(COUNTS[k]) && Number.isInteger(v) && v >= 0 && v <= 10) c[k] = v }
    if (Object.keys(c).length) setCounts((s) => ({ ...s, ...c, persons: Math.max(1, c.persons ?? s.persons) }))
    const occ = g('occ')
    if (occ && (occ === 'custom' || INDUSTRIES.some((x) => x.code === occ))) setCode(occ)
    const rate = (k: string, set: (v: string) => void) => { const v = g(k); if (v && /^\d{1,3}(\.\d)?$/.test(v)) set(v) }
    rate('cs', setCSimple); rate('cd', setCStandard); rate('or', setORate)
    const mt = g('method')
    if (mt === 'simple' || mt === 'standard' || mt === 'book') setMethod(mt)
    else if (mt === 'direct') setMethod('book') // 예전 '직접입력'
    if (g('w33') === '0') setW33(false)
    if (g('ef') === '0') setEfiling(false)
  }, [searchParams])

  // 상태 → URL (기본값과 다른 값만)
  useEffect(() => {
    if (!loaded.current) return
    const url = new URL(window.location.href)
    const q: Record<string, string> = {}
    const inc = TYPES.filter((x) => types.includes(x)).join('')
    if (inc !== 'b') q.inc = inc
    for (const k of Object.keys(MONEY) as MoneyKey[]) if (m[k] !== DEFAULT_MONEY[k]) q[MONEY[k]] = m[k]
    for (const k of Object.keys(COUNTS) as CountKey[]) if (counts[k] !== DEFAULT_COUNTS[k]) q[COUNTS[k]] = String(counts[k])
    if (code !== '940909') q.occ = code
    if (code === 'custom') { q.cs = cSimple; q.cd = cStandard }
    if (method) q.method = method
    if (oRate !== '60') q.or = oRate
    if (!w33) q.w33 = '0'
    if (!efiling) q.ef = '0'
    const all = ['inc', 'occ', 'cs', 'cd', 'method', 'or', 'w33', 'ef', ...Object.values(MONEY), ...Object.values(COUNTS)]
    for (const k of all) url.searchParams.delete(k)
    for (const [k, v] of Object.entries(q)) url.searchParams.set(k, v)
    window.history.replaceState(window.history.state, '', url)
  }, [types, m, counts, code, cSimple, cStandard, method, oRate, w33, efiling])

  const on = (k: TypeKey) => types.includes(k)
  const toggle = (k: TypeKey) => setTypes((s) => (s.includes(k) ? (s.length > 1 ? s.filter((x) => x !== k) : s) : [...s, k]))

  const industry = useMemo(
    () => industryOf(code, Math.min(99, parseFloat(cSimple) || 0), Math.min(99, parseFloat(cStandard) || 0)),
    [code, cSimple, cStandard],
  )
  const rev = num(m.revenue), prv = num(m.prev)
  const eligible = eligibleMethod(rev, prv)
  const active: Method = method || eligible

  const input: Input = {
    biz: on('b'), revenue: rev, prev: prv, industry, method: active, major: num(m.major), bookExpense: num(m.book), withheld33: w33,
    wage: on('w'), salary: num(m.salary), wageTax: m.wageTax === '' ? null : num(m.wageTax),
    otherDeduction: num(m.otherDeduction), otherCredit: num(m.otherCredit),
    other: on('o'), otherPay: num(m.otherPay), otherExpenseRate: Math.min(100, parseFloat(oRate) || 0),
    fin: on('f'), finIncome: num(m.finIncome),
    ...counts, pension: num(m.pension), yellow: num(m.yellow), pensionSavings: num(m.pensionSavings), irp: num(m.irp),
    midterm: num(m.midterm), efiling,
  }
  const res = calc(input)
  const compare = on('b') ? METHODS.map((x) => calc({ ...input, method: x })) : []

  const kind = res.refund > 0 ? 'refund' : res.refund < 0 ? 'pay' : 'zero'
  const headline = kind === 'zero' ? t('it.hero.zero') : t(`it.hero.${kind}`, { amount: won(Math.abs(res.refund)) })
  const methodName = (x: Method) => t(`it.method.${x}`)
  const typeNames = TYPES.filter(on).map((x) => t(`it.type.${TYPE_NAME[x]}`)).join(' + ')
  const rateIdx = BRACKETS.findIndex((b) => b.rate === res.marginal)
  const nextGap = rateIdx < BRACKETS.length - 1 && res.fin === 0 ? BRACKETS[rateIdx].upTo - res.taxBase : null
  const pct = (r: number) => `${Math.round(r * 1000) / 10}%`

  const field = 'ui-field w-full px-4 py-3 text-sm'
  const seg = (sel: boolean) => `flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${sel ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
  const W = t('won')
  const minus = (n: number) => `−${won(n)}`

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('it.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── 입력 ── */}
        <div className="lg:col-span-1 space-y-4 min-w-0">
          <div className="ui-card p-6 space-y-5">
            <div>
              <div className="block text-sm font-medium text-body mb-1.5">{t('it.in.types')}</div>
              <div className="grid grid-cols-2 gap-1.5">
                {TYPES.map((x) => (
                  <button key={x} type="button" aria-pressed={on(x)} onClick={() => toggle(x)} className={seg(on(x))}>
                    {t(`it.type.${TYPE_NAME[x]}`)}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted mt-1.5">{t('it.in.typesHint')}</p>
            </div>

            {on('b') && (
              <section className="border-t border-line pt-5 space-y-4">
                <h2 className="text-sm font-semibold text-fg">{t('it.type.biz')}</h2>
                <Money label={t('it.in.revenue')} value={m.revenue} onChange={setMoney('revenue')} hint={t('it.in.revenueHint')} unit={W} />
                <div>
                  <label htmlFor="it-ind" className="block text-sm font-medium text-body mb-1.5">{t('it.in.industry')}</label>
                  <select id="it-ind" value={code} onChange={(e) => setCode(e.target.value)} className={field}>
                    {INDUSTRIES.map((x) => <option key={x.code} value={x.code}>{tf(`ft.ind.${x.code}`)} ({x.code})</option>)}
                    <option value="custom">{tf('ft.ind.custom')}</option>
                  </select>
                  {code === 'custom' ? (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <Rate label={t('it.method.simple')} value={cSimple} onChange={setCSimple} />
                      <Rate label={t('it.method.standard')} value={cStandard} onChange={setCStandard} />
                      <p className="col-span-2 text-xs text-muted">{t('it.in.customHint')}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted mt-1.5">{t('it.in.rateLine', { simple: industry.simple, excess: industry.excess, standard: industry.standard })}</p>
                  )}
                </div>
                <Money label={t('it.in.prev')} value={m.prev} onChange={setMoney('prev')} hint={t('it.in.prevHint')} unit={W} />
                <div>
                  <div className="block text-sm font-medium text-body mb-1.5">{t('it.in.method')}</div>
                  <div className="flex gap-1.5" role="radiogroup" aria-label={t('it.in.method')}>
                    {METHODS.map((x) => (
                      <button key={x} type="button" role="radio" aria-checked={active === x} onClick={() => setMethod(x === eligible ? '' : x)} className={seg(active === x)}>
                        {methodName(x)}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted mt-1.5">
                    {t('it.in.eligible', { method: methodName(eligible) })}{isDoubleEntry(prv) ? ` · ${t('it.in.doubleEntry')}` : ''}
                  </p>
                  {active === 'simple' && eligible !== 'simple' && (
                    <p className="text-xs text-amber-700 mt-1">{t('it.in.notEligible', { limit: man(SIMPLE_PREV_LIMIT), limitWon: won(SIMPLE_PREV_LIMIT) })}</p>
                  )}
                </div>
                {active === 'standard' && <Money label={t('it.in.major')} value={m.major} onChange={setMoney('major')} hint={t('it.in.majorHint')} unit={W} />}
                {active === 'book' && <Money label={t('it.in.book')} value={m.book} onChange={setMoney('book')} hint={t('it.in.bookHint')} unit={W} />}
                <Check label={t('it.in.w33', { amount: won(Math.floor(rev * 0.033)) })} checked={w33} onChange={setW33} />
              </section>
            )}

            {on('w') && (
              <section className="border-t border-line pt-5 space-y-4">
                <h2 className="text-sm font-semibold text-fg">{t('it.type.wage')}</h2>
                <Money label={t('it.in.salary')} value={m.salary} onChange={setMoney('salary')} hint={t('it.in.salaryHint')} unit={W} />
                <Money label={t('it.in.wageTax')} value={m.wageTax} onChange={setMoney('wageTax')} unit={W}
                  hint={m.wageTax === '' ? t('it.in.wageTaxAuto', { amount: won(res.wageTax) }) : t('it.in.wageTaxHint')} />
                <Money label={t('it.in.otherDeduction')} value={m.otherDeduction} onChange={setMoney('otherDeduction')} hint={t('it.in.otherDeductionHint')} unit={W} />
                <Money label={t('it.in.otherCredit')} value={m.otherCredit} onChange={setMoney('otherCredit')} hint={t('it.in.otherCreditHint')} unit={W} />
              </section>
            )}

            {on('o') && (
              <section className="border-t border-line pt-5 space-y-4">
                <h2 className="text-sm font-semibold text-fg">{t('it.type.other')}</h2>
                <Money label={t('it.in.otherPay')} value={m.otherPay} onChange={setMoney('otherPay')} hint={t('it.in.otherPayHint')} unit={W} />
                <div className="max-w-[10rem]">
                  <Rate label={t('it.in.otherRate')} value={oRate} onChange={setORate} />
                </div>
                <p className="text-xs text-muted -mt-2">{t('it.in.otherRateHint', { limit: man(OTHER_SEPARATE_LIMIT), limitWon: won(OTHER_SEPARATE_LIMIT) })}</p>
              </section>
            )}

            {on('f') && (
              <section className="border-t border-line pt-5 space-y-4">
                <h2 className="text-sm font-semibold text-fg">{t('it.type.fin')}</h2>
                <Money label={t('it.in.fin')} value={m.finIncome} onChange={setMoney('finIncome')} hint={t('it.in.finHint')} unit={W} />
              </section>
            )}
          </div>

          <div className="ui-card p-6 space-y-4">
            <h2 className="text-sm font-semibold text-fg">{t('it.in.deductTitle')}</h2>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(COUNTS) as CountKey[]).map((k) => (
                <div key={k}>
                  <label htmlFor={`it-${k}`} className="block text-xs font-medium text-body mb-1">{t(`it.in.${k}`)}</label>
                  <select id={`it-${k}`} value={counts[k]} className="ui-field w-full px-3 py-2 text-sm"
                    onChange={(e) => setCounts((s) => ({ ...s, [k]: Number(e.target.value) }))}>
                    {Array.from({ length: k === 'persons' ? 10 : 6 }, (_, i) => (k === 'persons' ? i + 1 : i)).map((n) => (
                      <option key={n} value={n}>{t('it.people', { n })}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted -mt-1">{t('it.in.personsHint')}</p>
            <Money label={t('it.in.pension')} value={m.pension} onChange={setMoney('pension')} hint={t('it.in.pensionHint')} unit={W} />
            {on('b') && (
              <Money label={t('it.in.yellow')} value={m.yellow} onChange={setMoney('yellow')} hint={t('it.in.yellowHint', { limit: man(res.yellowLimit), limitWon: won(res.yellowLimit) })} unit={W} />
            )}
            <div className="grid grid-cols-2 gap-2">
              <Money label={t('it.in.pensionSavings')} value={m.pensionSavings} onChange={setMoney('pensionSavings')} unit={W} />
              <Money label={t('it.in.irp')} value={m.irp} onChange={setMoney('irp')} unit={W} />
            </div>
            <p className="text-xs text-muted -mt-2">{t('it.in.pensionAccountHint')}</p>
            <Money label={t('it.in.midterm')} value={m.midterm} onChange={setMoney('midterm')} hint={t('it.in.midtermHint')} unit={W} />
            <Check label={t('it.in.efiling')} checked={efiling} onChange={setEfiling} />
          </div>
        </div>

        {/* ── 결과 ── */}
        <div className="lg:col-span-2 space-y-6 min-w-0">
          <div className="ui-hero p-6">
            <div className="text-sm text-white/70">{t('it.hero.label', { types: typeNames })}</div>
            <div className="text-3xl sm:text-4xl font-bold mt-2 tabular-nums">{headline}</div>
            <div className="text-sm text-white/80 mt-2 tabular-nums">
              {t('it.hero.vs', { tax: won(res.totalTax), paid: won(res.prepaid.total) })}
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <span className="rounded-full bg-white/15 px-3 py-1 text-sm">{t('it.hero.eff', { rate: res.effRate.toFixed(1) })}</span>
              <span className="rounded-full bg-white/15 px-3 py-1 text-sm">{t('it.hero.marginal', { rate: pct(res.marginal), withLocal: pct(res.marginal * 1.1) })}</span>
            </div>
          </div>

          <ShareResult
            card={{
              tool: t('title'),
              label: t('it.share.label', { types: typeNames }),
              headline,
              sub: t('it.hero.eff', { rate: res.effRate.toFixed(1) }),
              rows: [
                { label: t('it.row.total'), value: `${won(res.total)}${W}` },
                { label: t('it.row.taxBase'), value: `${won(res.taxBase)}${W}` },
                { label: t('it.row.totalTax'), value: `${won(res.totalTax)}${W}` },
                { label: t('it.row.prepaid'), value: `${won(res.prepaid.total)}${W}` },
              ],
            }}
            text={t('it.share.text', { types: typeNames, result: headline })}
          />

          {/* 세율 구간 */}
          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg">{t('it.bracket.title')}</h2>
            <p className="text-sm text-muted mt-1">
              {t('it.bracket.desc', { base: won(res.taxBase), rate: pct(res.marginal) })}
              {nextGap != null ? ` ${t('it.bracket.next', { gap: won(nextGap), rate: pct(BRACKETS[rateIdx + 1].rate) })}` : ''}
            </p>
            <ol className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 mt-4">
              {BRACKETS.map((b, i) => {
                const sel = i === rateIdx
                return (
                  <li key={i} className={`rounded-xl px-2 py-2.5 text-center ${sel ? 'bg-primary text-white' : 'bg-subtle text-sub'}`} aria-current={sel ? 'true' : undefined}>
                    <div className="text-sm font-bold tabular-nums">{Math.round(b.rate * 100)}%</div>
                    <div className={`text-[11px] mt-0.5 tabular-nums ${sel ? 'text-white/80' : 'text-muted'}`}>
                      {b.upTo === Infinity ? t('it.bracket.over', { lo: man(BRACKETS[i - 1].upTo), loM: won(BRACKETS[i - 1].upTo / 1e6) }) : t('it.bracket.upTo', { hi: man(b.upTo), hiM: won(b.upTo / 1e6) })}
                    </div>
                  </li>
                )
              })}
            </ol>
            <p className="text-xs text-muted mt-3">{t('it.bracket.note')}</p>
          </div>

          {/* 계산 내역 */}
          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg mb-4">{t('it.row.title')}</h2>
            <dl className="space-y-2 text-sm tabular-nums">
              {on('b') && <>
                <Row label={t('it.row.revenue')} value={won(rev)} />
                <Row label={t('it.row.expense', { method: methodName(active) })} value={minus(res.biz.expense)} sub />
                <Row label={t('it.row.bizIncome')} value={won(res.biz.income)} />
              </>}
              {on('w') && <>
                <Row label={t('it.row.salary')} value={won(res.salary)} />
                <Row label={t('it.row.earnedDeduction')} value={minus(res.earnedDeduction)} sub />
                <Row label={t('it.row.earned')} value={won(res.earned)} />
              </>}
              {on('o') && (
                <Row label={res.otherSeparated ? t('it.row.otherSeparated') : t('it.row.other')} value={res.otherSeparated ? won(0) : won(res.other)} />
              )}
              {on('f') && <Row label={res.fin > 0 ? t('it.row.fin') : t('it.row.finSeparated')} value={won(res.fin)} />}
              <Row label={t('it.row.total')} value={won(res.total)} strong />
              <Row label={t('it.row.basic')} value={minus(res.basic)} sub />
              {res.pension > 0 && <Row label={t('it.row.pension')} value={minus(res.pension)} sub />}
              {res.yellow > 0 && <Row label={t('it.row.yellow')} value={minus(res.yellow)} sub />}
              {res.otherDed > 0 && <Row label={t('it.row.otherDeduction')} value={minus(res.otherDed)} sub />}
              <Row label={t('it.row.taxBase')} value={won(res.taxBase)} strong />
              <Row label={res.fin > 0 ? t('it.row.computedFin') : t('it.row.computed', { rate: pct(res.marginal) })} value={won(res.computed)} />
              {res.cr.earned > 0 && <Row label={t('it.row.crEarned')} value={minus(res.cr.earned)} sub />}
              {res.cr.child > 0 && <Row label={t('it.row.crChild')} value={minus(res.cr.child)} sub />}
              {res.cr.pension > 0 && <Row label={t('it.row.crPension')} value={minus(res.cr.pension)} sub />}
              {res.cr.other > 0 && <Row label={t('it.row.crOther')} value={minus(res.cr.other)} sub />}
              {res.cr.standard > 0 && <Row label={t('it.row.crStandard', { amount: won(res.cr.standard) })} value={minus(res.cr.standard)} sub />}
              {res.cr.efiling > 0 && <Row label={t('it.row.crEfiling')} value={minus(res.cr.efiling)} sub />}
              {res.credits < res.cr.earned + res.cr.child + res.cr.pension + res.cr.other + res.cr.standard + res.cr.efiling && (
                <Row label={t('it.row.crCapped', { amount: won(res.credits) })} value="" sub />
              )}
              {res.penalty > 0 && <Row label={t('it.row.penalty')} value={`+${won(res.penalty)}`} sub />}
              <Row label={t('it.row.determined')} value={won(res.determined)} />
              <Row label={t('it.row.localTax')} value={won(res.localTax)} />
              <Row label={t('it.row.totalTax')} value={won(res.totalTax)} strong />
              {res.prepaid.items.biz > 0 && <Row label={t('it.row.pBiz')} value={minus(res.prepaid.items.biz)} sub />}
              {res.prepaid.items.wage > 0 && <Row label={t('it.row.pWage')} value={minus(res.prepaid.items.wage)} sub />}
              {res.prepaid.items.other > 0 && <Row label={t('it.row.pOther')} value={minus(res.prepaid.items.other)} sub />}
              {res.prepaid.items.fin > 0 && <Row label={t('it.row.pFin')} value={minus(res.prepaid.items.fin)} sub />}
              {res.prepaid.items.midterm > 0 && <Row label={t('it.row.pMid')} value={minus(res.prepaid.items.midterm)} sub />}
              {res.prepaid.local > 0 && <Row label={t('it.row.pLocal')} value={minus(res.prepaid.local)} sub />}
              <Row label={t('it.row.prepaid')} value={won(res.prepaid.total)} strong />
              <div className="rounded-xl bg-subtle px-3 py-2.5 mt-2 space-y-1">
                <Row label={t(res.refundIncome >= 0 ? 'it.row.refundIncome' : 'it.row.payIncome')} value={won(Math.abs(res.refundIncome))} />
                <Row label={t(res.refundLocal >= 0 ? 'it.row.refundLocal' : 'it.row.payLocal')} value={won(Math.abs(res.refundLocal))} />
                <div className="flex justify-between gap-3 font-bold pt-1">
                  <dt className="text-fg">{t(res.refund >= 0 ? 'it.row.refund' : 'it.row.pay')}</dt>
                  <dd className={res.refund < 0 ? 'text-red-600' : 'text-primary'}>{won(Math.abs(res.refund))}{W}</dd>
                </div>
              </div>
            </dl>
            <Notes t={t} res={res} wageOnly={types.length === 1 && on('w')} />
          </div>

          {/* 경비 방식 비교 */}
          {on('b') && (
            <div className="ui-card p-6">
              <h2 className="text-lg font-semibold text-fg">{t('it.cmp.title')}</h2>
              <p className="text-sm text-muted mt-1">{t('it.cmp.desc')}</p>
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-sm tabular-nums">
                  <thead>
                    <tr className="text-xs text-muted border-b border-line">
                      <th className="py-2 text-left font-medium">{t('it.in.method')}</th>
                      <th className="py-2 text-right font-medium">{t('it.row.bizIncome')}</th>
                      <th className="py-2 text-right font-medium">{t('it.row.totalTax')}</th>
                      <th className="py-2 pr-2 text-right font-medium">{t('it.cmp.result')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {METHODS.map((x, i) => {
                      const r = compare[i]
                      return (
                        <tr key={x} className={`border-b border-line last:border-0 ${active === x ? 'bg-primary-soft text-primary' : 'text-body'}`}>
                          <td className="py-2.5 pl-2">
                            <button type="button" onClick={() => setMethod(x === eligible ? '' : x)} className="font-medium text-left">
                              {methodName(x)}{x === eligible && <span className="ml-1 text-xs text-muted">{t('it.cmp.eligibleTag')}</span>}
                            </button>
                          </td>
                          {x === 'book' && num(m.book) === 0 ? (
                            <td colSpan={3} className="py-2.5 pr-2 text-right text-xs text-muted">{t('it.cmp.bookEmpty')}</td>
                          ) : (
                            <>
                              <td className="py-2.5 text-right">{won(r.biz.income)}</td>
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
              <p className="text-xs text-muted mt-3">{t('it.cmp.note')}</p>
            </div>
          )}

          {/* 연계 */}
          <div className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-2">
            <p className="font-medium text-fg">{t('it.links.title')}</p>
            <p>{t('it.links.freelancer')} <Link href="/freelancer-tax/" className="text-primary underline">{t('it.links.freelancerLink')}</Link></p>
            <p>{t('it.links.yearEnd')} <Link href="/year-end-tax/" className="text-primary underline">{t('it.links.yearEndLink')}</Link></p>
            <p>
              {t('it.links.hometax')}{' '}
              <a href="https://www.hometax.go.kr" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-0.5">
                {t('it.links.hometaxLink')}<ExternalLink className="w-3 h-3" aria-hidden="true" />
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* 가이드 */}
      <div className="ui-card p-6">
        <h2 className="text-xl font-semibold text-fg mb-6">{t('it.guide.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-body">
          {(['who', 'flow', 'income', 'deductions', 'filing', 'tips'] as const).map((s) => (
            <section key={s}>
              <h3 className="font-semibold text-fg mb-2">{t(`it.guide.${s}.title`)}</h3>
              <ul className="list-disc pl-5 space-y-1.5">
                {(t.raw(`it.guide.${s}.items`) as string[]).map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </section>
          ))}
        </div>
        <p className="text-xs text-muted mt-6">{t('it.guide.sources')}</p>
      </div>

      <div className="bg-amber-50 text-amber-800 rounded-2xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-xs">{t('it.disclaimer')}</p>
      </div>
    </div>
  )
}

function Notes({ t, res, wageOnly }: { t: ReturnType<typeof useTranslations>; res: ReturnType<typeof calc>; wageOnly: boolean }) {
  const notes: string[] = []
  if (wageOnly) notes.push(t('it.note.wageOnly'))
  if (res.wageTaxEstimated) notes.push(t('it.note.wageEstimated'))
  if (res.otherSeparated) notes.push(t('it.note.otherSeparated', { tax: won(res.otherSepTax) }))
  if (res.otherMustInclude) notes.push(t('it.note.otherMust', { limit: man(OTHER_SEPARATE_LIMIT), limitWon: won(OTHER_SEPARATE_LIMIT) }))
  if (res.finSeparated) notes.push(t('it.note.finSeparated'))
  if (res.fin > 0) notes.push(t('it.note.finGrossUp'))
  if (res.biz.capped) notes.push(t('it.note.capped'))
  if (!notes.length && res.penalty === 0) return null
  return (
    <div className="bg-subtle rounded-2xl p-4 mt-4 text-sm text-sub space-y-1">
      {notes.map((n, i) => <p key={i}>{n}</p>)}
      {res.penalty > 0 && <p className="text-amber-700">{t('it.note.penalty', { amount: won(res.penalty) })}</p>}
    </div>
  )
}

function Money({ label, value, onChange, hint, unit }: { label: string; value: string; onChange: (v: string) => void; hint?: string; unit: string }) {
  const shown = value ? num(value).toLocaleString('ko-KR') : ''
  return (
    <label className="block min-w-0">
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
        <input type="text" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, '').slice(0, 5))}
          className="ui-field w-full px-3 py-2 pr-7 text-sm tabular-nums" />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-faint">%</span>
      </span>
    </label>
  )
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-2 text-sm text-body cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 w-4 h-4 accent-primary" />
      <span>{label}</span>
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
