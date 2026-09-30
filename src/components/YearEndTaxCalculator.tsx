'use client'

/**
 * 연말정산 계산기 — 2026년 귀속 (2027년 1~2월 정산). 계산 로직: src/utils/yearEndTax.ts
 * Translation namespace: yearEndTaxCalc (새 UI 키는 'yt.*', 가이드는 GuideSection이 'guide.*' 사용)
 */

import { useState, useEffect, useRef, useMemo, type ReactNode } from 'react'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useTranslations } from '@/lib/i18n'
import { ChevronDown } from 'lucide-react'
import GuideSection from '@/components/GuideSection'
import ShareResult from '@/components/ShareResult'
import { calculateNetSalary } from '@/utils/netSalary'
import { calc, tips, autoInsurance, DEFAULT_INPUT, TAX_YEAR, type YetInput } from '@/utils/yearEndTax'

const won = (n: number) => Math.round(n).toLocaleString('ko-KR')
const man = (n: number) => (Math.round(n / 10_000)).toLocaleString('ko-KR')
const digits = (v: string) => v.replace(/[^0-9]/g, '').slice(0, 11)

type NumKey = Exclude<{ [K in keyof YetInput]: YetInput[K] extends number | undefined ? K : never }[keyof YetInput], undefined>
type BoolKey = 'spouse' | 'marriage' | 'sme'

// URL 키 (개인 식별 정보 없음, 숫자만)
const NUM_PARAMS: [NumKey, string][] = [
  ['salary', 's'], ['children', 'ch'], ['kidsUnder8', 'u8'], ['others', 'ot'], ['elderly', 'el'], ['disabled', 'dis'], ['birth', 'bi'],
  ['housingSub', 'hs'], ['leaseLoan', 'll'], ['credit', 'cc'], ['debit', 'dc'], ['culture', 'cu'], ['market', 'mk'], ['transport', 'tr'],
  ['pensionSavings', 'ps'], ['irp', 'irp'], ['insurance', 'in'], ['special', 'ms'], ['general', 'mg'], ['premature', 'mp'], ['infertility', 'mi'],
  ['eduSelf', 'es'], ['eduSchool', 'esc'], ['eduUniv', 'eu'], ['donation', 'dn'], ['hometown', 'ht'], ['rent', 'mr'],
]
const BOOL_PARAMS: [BoolKey, string][] = [['spouse', 'sp'], ['marriage', 'mc'], ['sme', 'sme']]
// 수동 입력(비우면 자동): 국민연금·건강고용보험·기납부세액
const OPT_PARAMS = [['pension', 'np'], ['healthEmp', 'he'], ['prepaid', 'pp']] as const
type OptKey = (typeof OPT_PARAMS)[number][0]

export default function YearEndTaxCalculator() {
  const t = useTranslations('yearEndTaxCalc')
  const searchParams = useSearchParams()
  const [inp, setInp] = useState<YetInput>(DEFAULT_INPUT)
  const [opt, setOpt] = useState<Record<OptKey, string>>({ pension: '', healthEmp: '', prepaid: '' })
  const set = <K extends keyof YetInput>(k: K, v: YetInput[K]) =>
    setInp((p) => { const n = { ...p, [k]: v }; n.kidsUnder8 = Math.min(n.kidsUnder8, n.children); return n })

  // URL → 상태 (최초 1회)
  const loaded = useRef(false)
  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    const next = { ...DEFAULT_INPUT }
    for (const [k, q] of NUM_PARAMS) { const v = searchParams.get(q); if (v && /^\d{1,11}$/.test(v)) next[k] = Number(v) }
    for (const [k, q] of BOOL_PARAMS) { const v = searchParams.get(q); if (v === '1' || v === '0') next[k] = v === '1' }
    const o = { pension: '', healthEmp: '', prepaid: '' }
    for (const [k, q] of OPT_PARAMS) { const v = searchParams.get(q); if (v && /^\d{1,11}$/.test(v)) o[k] = v }
    setInp(next); setOpt(o)
  }, [searchParams])

  // 상태 → URL (기본값과 다른 것만)
  useEffect(() => {
    if (!loaded.current) return
    const url = new URL(window.location.href)
    const put = (q: string, v: string | null) => { if (v === null) url.searchParams.delete(q); else url.searchParams.set(q, v) }
    for (const [k, q] of NUM_PARAMS) put(q, inp[k] !== DEFAULT_INPUT[k] ? String(inp[k]) : null)
    for (const [k, q] of BOOL_PARAMS) put(q, inp[k] !== DEFAULT_INPUT[k] ? (inp[k] ? '1' : '0') : null)
    for (const [k, q] of OPT_PARAMS) put(q, opt[k] || null)
    window.history.replaceState(window.history.state, '', url)
  }, [inp, opt])

  const heads = 1 + (inp.spouse ? 1 : 0) + inp.children + inp.others
  const kids8 = Math.max(0, inp.children - inp.kidsUnder8)
  // 기납부세액 자동 추정: netSalary(간이세액표와 같은 방식의 연 환산 소득세)
  const autoPrepaid = useMemo(
    () => calculateNetSalary(inp.salary, { nonTaxableMonthly: 0, dependents: heads, children: kids8 })?.deductions.incomeTax ?? 0,
    [inp.salary, heads, kids8],
  )
  const auto = autoInsurance(inp.salary)
  const full: YetInput = {
    ...inp,
    pension: opt.pension ? Number(opt.pension) : undefined,
    healthEmp: opt.healthEmp ? Number(opt.healthEmp) : undefined,
    prepaid: opt.prepaid ? Number(opt.prepaid) : autoPrepaid,
  }
  const r = calc(full)
  const tipList = tips(full)
  const gainTips = tipList.filter((x) => x.gain > 0)

  const kind = r.refund > 0 ? 'refund' : r.refund < 0 ? 'pay' : 'zero'
  const headline = kind === 'zero' ? t('yt.hero.zero') : t(`yt.hero.${kind}`, { amount: won(Math.abs(r.refund)) })
  const effRate = r.salary ? (r.totalTax / r.salary) * 100 : 0

  const seg = (on: boolean) => `flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
  const W = t('yt.won')
  const count = (k: NumKey, label: string, max = 6, min = 0) => (
    <label className="block">
      <span className="block text-sm font-medium text-body mb-1.5">{label}</span>
      <select value={inp[k]} onChange={(e) => set(k, Number(e.target.value))} className="ui-field w-full px-4 py-3 text-sm">
        {Array.from({ length: max - min + 1 }, (_, i) => i + min).map((n) => <option key={n} value={n}>{t('yt.people', { n })}</option>)}
      </select>
    </label>
  )
  const money = (k: NumKey, hint?: string) => (
    <Money label={t(`yt.in.${k}`)} value={inp[k] as number} onChange={(v) => set(k, v)} hint={hint} unit={W} />
  )
  const toggle = (k: BoolKey, label: string, hint: string) => (
    <div>
      <div className="text-sm font-medium text-body mb-1.5">{label}</div>
      <div className="flex gap-1.5" role="radiogroup" aria-label={label}>
        {[false, true].map((v) => (
          <button key={String(v)} type="button" role="radio" aria-checked={inp[k] === v} onClick={() => set(k, v)} className={seg(inp[k] === v)}>
            {t(v ? 'yt.yes' : 'yt.no')}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted mt-1.5">{hint}</p>
    </div>
  )
  const optMoney = (k: OptKey, label: string, hint: string, placeholder: number) => (
    <Money label={label} value={opt[k] ? Number(opt[k]) : null} onChange={(v) => setOpt((p) => ({ ...p, [k]: v ? String(v) : '' }))}
      hint={hint} unit={W} placeholder={won(placeholder)} />
  )

  const cr = r.cr
  const creditRows: [string, number][] = r.standard
    ? [['child', cr.child], ['pension', cr.pension], ['hometown', cr.hometown], ['marriage', cr.marriage]]
    : [['child', cr.child], ['pension', cr.pension], ['insurance', cr.insurance], ['medical', cr.medical], ['education', cr.education],
      ['donation', cr.donation], ['hometown', cr.hometown], ['rent', cr.rent], ['marriage', cr.marriage]]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('yt.subtitle', { year: TAX_YEAR, next: TAX_YEAR + 1 })}</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* ── 입력 ── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="ui-card p-6 space-y-5">
            <Money label={t('yt.in.salary')} value={inp.salary} onChange={(v) => set('salary', v)} hint={t('yt.in.salaryHint')} unit={W} />
            <div>
              <div className="text-sm font-medium text-body mb-1.5">{t('yt.in.prepaid')}</div>
              <div className="flex gap-1.5" role="radiogroup" aria-label={t('yt.in.prepaid')}>
                <button type="button" role="radio" aria-checked={!opt.prepaid} onClick={() => setOpt((p) => ({ ...p, prepaid: '' }))} className={seg(!opt.prepaid)}>
                  {t('yt.in.prepaidAuto')}
                </button>
                <button type="button" role="radio" aria-checked={!!opt.prepaid} onClick={() => setOpt((p) => ({ ...p, prepaid: String(autoPrepaid || 1) }))} className={seg(!!opt.prepaid)}>
                  {t('yt.in.prepaidManual')}
                </button>
              </div>
              {opt.prepaid ? (
                <div className="mt-2">
                  <Money label="" value={Number(opt.prepaid)} onChange={(v) => setOpt((p) => ({ ...p, prepaid: String(Math.max(1, v)) }))} unit={W} />
                </div>
              ) : null}
              <p className="text-xs text-muted mt-1.5">
                {opt.prepaid ? t('yt.in.prepaidManualHint') : t('yt.in.prepaidAutoHint', { amount: won(autoPrepaid) })}
              </p>
            </div>
          </div>

          <Section title={t('yt.sec.family')} badge={t('yt.people', { n: heads })} open>
            {toggle('spouse', t('yt.in.spouse'), t('yt.in.spouseHint'))}
            <div className="grid grid-cols-2 gap-3">
              {count('children', t('yt.in.children'))}
              {count('kidsUnder8', t('yt.in.kidsUnder8'), inp.children)}
              {count('others', t('yt.in.others'))}
              {count('elderly', t('yt.in.elderly'), heads)}
              {count('disabled', t('yt.in.disabled'), heads)}
              <label className="block">
                <span className="block text-sm font-medium text-body mb-1.5">{t('yt.in.birth')}</span>
                <select value={inp.birth} onChange={(e) => set('birth', Number(e.target.value))} className="ui-field w-full px-4 py-3 text-sm">
                  {[0, 1, 2, 3].map((n) => <option key={n} value={n}>{t(`yt.birth.${n}`)}</option>)}
                </select>
              </label>
            </div>
            <p className="text-xs text-muted">{t('yt.in.familyHint')}</p>
          </Section>

          <Section title={t('yt.sec.card')} badge={`${won(r.card.total)}${W}`} open>
            {money('credit')}
            {money('debit', t('yt.in.debitHint'))}
            {money('transport')}
            {money('market')}
            {money('culture', t('yt.in.cultureHint'))}
            <div className="bg-subtle rounded-2xl p-4 text-sm text-sub tabular-nums">
              {r.card.shortfall > 0
                ? t('yt.card.short', { threshold: won(r.card.threshold), amount: won(r.card.shortfall) })
                : t('yt.card.over', { threshold: won(r.card.threshold), amount: won(r.card.spent - r.card.threshold) })}
            </div>
          </Section>

          <Section title={t('yt.sec.pension')} badge={`${won(cr.pension + cr.insurance)}${W}`}>
            {money('pensionSavings', t('yt.in.pensionSavingsHint'))}
            {money('irp', t('yt.in.irpHint'))}
            {money('insurance', t('yt.in.insuranceHint'))}
          </Section>

          <Section title={t('yt.sec.medical')} badge={`${won(cr.medical + cr.education)}${W}`}>
            <p className="text-xs text-muted">{t('yt.in.medicalHint', { amount: won(Math.floor(r.salary * 0.03)) })}</p>
            {money('special', t('yt.in.specialHint'))}
            {money('general', t('yt.in.generalHint'))}
            {money('infertility')}
            {money('premature')}
            {money('eduSelf')}
            {money('eduSchool', t('yt.in.eduSchoolHint'))}
            {money('eduUniv', t('yt.in.eduUnivHint'))}
          </Section>

          <Section title={t('yt.sec.housing')} badge={`${won(cr.rent)}${W}`}>
            {money('rent', t('yt.in.rentHint'))}
            {money('housingSub', t('yt.in.housingSubHint'))}
            {money('leaseLoan', t('yt.in.leaseLoanHint'))}
          </Section>

          <Section title={t('yt.sec.etc')} badge={`${won(cr.donation + cr.hometown + cr.marriage)}${W}`}>
            {money('hometown', t('yt.in.hometownHint'))}
            {money('donation', t('yt.in.donationHint'))}
            {toggle('marriage', t('yt.in.marriage'), t('yt.in.marriageHint'))}
            {toggle('sme', t('yt.in.sme'), t('yt.in.smeHint'))}
            {optMoney('pension', t('yt.in.pension'), t('yt.in.autoHint'), auto.pension)}
            {optMoney('healthEmp', t('yt.in.healthEmp'), t('yt.in.autoHint'), auto.healthEmp)}
          </Section>
        </div>

        {/* ── 결과 ── */}
        <div className="lg:col-span-3 space-y-6">
          <div className="ui-hero p-6">
            <div className="text-sm text-white/70">{t('yt.hero.label', { year: TAX_YEAR, salary: man(r.salary), salaryWon: won(r.salary) })}</div>
            <div className="text-3xl sm:text-4xl font-bold mt-2 tabular-nums">{headline}</div>
            <div className="text-sm text-white/80 mt-2 tabular-nums">
              {t('yt.hero.vs', { tax: won(r.totalTax), paid: won(r.prepaid + r.prepaidLocal) })}
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <span className="rounded-full bg-white/15 px-3 py-1 text-sm">{t('yt.hero.rate', { rate: Math.round(r.rate * 100) })}</span>
              <span className="rounded-full bg-white/15 px-3 py-1 text-sm">{t('yt.hero.eff', { rate: effRate.toFixed(1) })}</span>
              {!opt.prepaid && <span className="rounded-full bg-white/15 px-3 py-1 text-sm">{t('yt.hero.estimated')}</span>}
              {r.standard && <span className="rounded-full bg-white/15 px-3 py-1 text-sm">{t('yt.hero.standard')}</span>}
            </div>
          </div>

          <ShareResult
            card={{
              tool: t('title'),
              label: t('yt.share.label', { salary: man(r.salary), salaryWon: won(r.salary) }),
              headline,
              sub: t('yt.share.sub', { year: TAX_YEAR }),
              rows: [
                { label: t('yt.row.determined'), value: `${won(r.totalTax)}${W}` },
                { label: t('yt.row.prepaidAll'), value: `${won(r.prepaid + r.prepaidLocal)}${W}` },
                { label: t('yt.row.taxBase'), value: `${won(r.taxBase)}${W}` },
              ],
            }}
            text={t('yt.share.text', { salary: man(r.salary), salaryWon: won(r.salary), result: headline })}
            fileName="toolhub-year-end-tax"
          />

          {/* 더 돌려받는 방법 */}
          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg">{t('yt.tip.title')}</h2>
            <p className="text-sm text-muted mt-1">{t('yt.tip.desc')}</p>
            {gainTips.length ? (
              <ol className="mt-4 divide-y divide-line">
                {gainTips.map((x, i) => (
                  <li key={x.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className={`shrink-0 w-6 h-6 rounded-full text-xs font-semibold flex items-center justify-center ${i === 0 ? 'bg-primary text-white' : 'bg-soft text-sub'}`}>{i + 1}</span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-fg">{t(`yt.tip.${x.id}`, { amount: man(x.amount), amountWon: won(x.amount) })}</div>
                        <div className="text-xs text-muted mt-0.5">{t(`yt.tip.${x.id}Hint`)}</div>
                      </div>
                    </div>
                    <div className="shrink-0 text-right tabular-nums">
                      <div className="text-base font-bold text-primary">+{won(x.gain)}{W}</div>
                      {x.id !== 'debit' && x.id !== 'rent' && <div className="text-xs text-muted">{t('yt.tip.per', { rate: ((x.gain / x.amount) * 100).toFixed(1) })}</div>}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="bg-subtle rounded-2xl p-4 mt-4 text-sm text-sub">{r.determined === 0 ? t('yt.tip.noneZero') : t('yt.tip.none')}</div>
            )}
          </div>

          {/* 계산 내역 */}
          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg mb-4">{t('yt.row.title')}</h2>
            <dl className="space-y-2 text-sm tabular-nums">
              <Row label={t('yt.row.salary')} value={won(r.salary)} />
              <Row label={t('yt.row.eid')} value={`−${won(r.eid)}`} sub />
              <Row label={t('yt.row.earnedIncome')} value={won(r.earnedIncome)} strong />
              <Row label={t('yt.row.personal', { n: r.heads })} value={`−${won(r.personal)}`} sub />
              <Row label={t('yt.row.pension')} value={`−${won(r.pension)}`} sub />
              {!r.standard && <Row label={t('yt.row.healthEmp')} value={`−${won(r.healthEmp)}`} sub />}
              {!r.standard && r.housing > 0 && <Row label={t('yt.row.housing')} value={`−${won(r.housing)}`} sub />}
              <Row label={t('yt.row.card')} value={`−${won(r.card.total)}`} sub />
              <Row label={t('yt.row.taxBase')} value={won(r.taxBase)} strong />
              <Row label={t('yt.row.computed', { rate: Math.round(r.rate * 100) })} value={won(r.computedTax)} strong />
              {r.reduction > 0 && <Row label={t('yt.row.sme')} value={`−${won(r.reduction)}`} sub />}
              <Row label={t('yt.row.earnedCredit')} value={`−${won(r.credits.earned)}`} sub />
              {creditRows.filter(([, v]) => v > 0).map(([k, v]) => <Row key={k} label={t(`yt.cr.${k}`)} value={`−${won(v)}`} sub />)}
              {r.standard && <Row label={t('yt.cr.standard')} value={`−${won(130_000)}`} sub />}
              <Row label={t('yt.row.determinedIncome')} value={won(r.determined)} strong />
              <Row label={t('yt.row.local')} value={won(r.localTax)} sub />
              <Row label={t('yt.row.prepaid')} value={won(r.prepaid)} sub />
              <Row label={t('yt.row.prepaidLocal')} value={won(r.prepaidLocal)} sub />
              <div className="border-t border-line pt-2">
                <Row label={t(kind === 'pay' ? 'yt.row.pay' : 'yt.row.refund')} value={`${won(Math.abs(r.refund))}${W}`} strong />
              </div>
            </dl>
            <p className="text-xs text-muted mt-4">
              {r.standard ? t('yt.row.stdNote') : t('yt.row.specialNote', { amount: won(r.std.determined - r.special.determined) })}
            </p>

            {r.card.gross > 0 && (
              <details className="mt-4 group">
                <summary className="cursor-pointer text-sm font-medium text-primary list-none flex items-center gap-1">
                  {t('yt.card.detail')} <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <dl className="bg-subtle rounded-2xl p-4 mt-2 space-y-1.5 text-xs tabular-nums">
                  {(['credit', 'debit', 'culture', 'market', 'transport'] as const).filter((k) => r.card.parts[k] > 0).map((k) => (
                    <Row key={k} label={t(`yt.in.${k}`)} value={won(r.card.parts[k])} />
                  ))}
                  <Row label={t('yt.card.basic', { limit: man(r.card.limits.basic), limitWon: won(r.card.limits.basic) })} value={won(r.card.basic)} />
                  <Row label={t('yt.card.extra', { limit: man(r.card.limits.extra), limitWon: won(r.card.limits.extra) })} value={won(r.card.extra)} />
                </dl>
              </details>
            )}
          </div>

          <div className="bg-subtle rounded-2xl p-5 text-sm text-sub">
            <p className="font-medium text-fg mb-2">{t('yt.scope.title')}</p>
            <ul className="list-disc pl-5 space-y-1">
              {(t.raw('yt.scope.items') as string[]).map((s, i) => <li key={i}>{s}</li>)}
            </ul>
            <p className="text-xs text-muted mt-3">{t('yt.sources')}</p>
          </div>
        </div>
      </div>

      <GuideSection namespace="yearEndTaxCalc" />
    </div>
  )
}

function Section({ title, badge, open, children }: { title: string; badge: string; open?: boolean; children: ReactNode }) {
  return (
    <details className="ui-card group" open={open}>
      <summary className="cursor-pointer list-none flex items-center justify-between gap-3 px-6 py-4">
        <span className="font-semibold text-fg">{title}</span>
        <span className="flex items-center gap-2 text-sm text-muted tabular-nums">
          {badge}
          <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" aria-hidden="true" />
        </span>
      </summary>
      <div className="px-6 pb-6 space-y-4">{children}</div>
    </details>
  )
}

function Money({ label, value, onChange, hint, unit, placeholder }: {
  label: string; value: number | null; onChange: (v: number) => void; hint?: string; unit: string; placeholder?: string
}) {
  const shown = value ? value.toLocaleString('ko-KR') : ''
  return (
    <label className="block">
      {label && <span className="block text-sm font-medium text-body mb-1.5">{label}</span>}
      <span className="relative block">
        <input type="text" inputMode="numeric" value={shown} placeholder={placeholder ?? '0'}
          onChange={(e) => onChange(Number(digits(e.target.value)) || 0)}
          className="ui-field w-full px-4 py-3 pr-9 text-sm tabular-nums" />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-faint">{unit}</span>
      </span>
      {hint && <span className="block text-xs text-muted mt-1.5">{hint}</span>}
    </label>
  )
}

function Row({ label, value, strong, sub }: { label: string; value: string; strong?: boolean; sub?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${sub ? 'pl-4 text-muted' : strong ? 'font-semibold text-fg' : 'text-body'}`}>
      <dt>{label}</dt>
      <dd className="shrink-0">{value}</dd>
    </div>
  )
}
