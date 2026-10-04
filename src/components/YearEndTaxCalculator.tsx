'use client'

/**
 * 연말정산 계산기 — 2026년 귀속 (2027년 1~2월 정산). 계산 로직: src/utils/yearEndTax.ts
 * Translation namespace: yearEndTaxCalc (새 UI 키는 'yt.*', 가이드는 GuideSection이 'guide.*' 사용)
 * 모드: 연간 예상(기본) / 미리보기(?mode=preview — 1~9월 실적 ×12/9 또는 10~12월 직접 입력)
 */

import { useState, useEffect, useRef, useMemo, type ReactNode } from 'react'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/yearEndTaxCalc'
import { ChevronDown } from 'lucide-react'
import GuideSection from '@/components/GuideSection'
import ShareResult from '@/components/ShareResult'
import { calculateNetSalary } from '@/utils/netSalary'
import {
  calc, tips, autoInsurance, annualize, annualSpend, cardThresholdGap, q4Strategy, pensionTopUp, pensionRate,
  CARD_KEYS, DEADLINE, PREVIEW_MONTHS, DEFAULT_INPUT, TAX_YEAR, type YetInput, type CardSpend,
} from '@/utils/yearEndTax'
import { todayKST, daysBetween, ddayLabel } from '@/utils/dday'

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

// 미리보기 모드 URL: mode=preview, 1~9월 y{코드}, 10~12월 직접 입력 q4=m + q{코드}, 1~9월 급여 ys (코드는 NUM_PARAMS와 같음: ycc, qdc …)
type Mode = 'annual' | 'preview'
const CODE = Object.fromEntries(NUM_PARAMS) as Record<NumKey, string>
// 미리보기 기본값: 총급여 5,000만 직장인의 1~9월 사용액 (신용카드 위주)
const PV_DEFAULT: CardSpend = { credit: 10_500_000, debit: 2_250_000, culture: 0, market: 0, transport: 450_000 }
const mapCard = (f: (k: keyof CardSpend) => number): CardSpend =>
  ({ credit: f('credit'), debit: f('debit'), culture: f('culture'), market: f('market'), transport: f('transport') })
const sumCard = (s: CardSpend) => CARD_KEYS.reduce((a, k) => a + s[k], 0)
const CHG_LINKS = [
  'https://www.law.go.kr/법령/소득세법/제59조의2',
  'https://www.law.go.kr/법령/조세특례제한법/제126조의2',
  'https://www.law.go.kr/법령/소득세법/제59조의4',
  'https://www.law.go.kr/법령/조세특례제한법/제95조의2',
  'https://www.law.go.kr/법령/조세특례제한법/제92조',
]

export default function YearEndTaxCalculator() {
  const t = useTranslations('yearEndTaxCalc')
  const searchParams = useSearchParams()
  const [inp, setInp] = useState<YetInput>(DEFAULT_INPUT)
  const [opt, setOpt] = useState<Record<OptKey, string>>({ pension: '', healthEmp: '', prepaid: '' })
  const [mode, setMode] = useState<Mode>('annual')
  const [ytd, setYtd] = useState<CardSpend>(PV_DEFAULT)
  const [q4, setQ4] = useState<CardSpend | null>(null)          // null = 1~9월 속도로 자동(×12/9)
  const [ytdSalary, setYtdSalary] = useState<number | null>(null) // null = 총급여(연) 입력 사용
  const [today, setToday] = useState<string | null>(null)         // 클라이언트에서만 (정적 HTML에 빌드 날짜가 박히지 않게)
  useEffect(() => setToday(todayKST()), [])
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
    const num = (q: string) => { const v = searchParams.get(q); return v && /^\d{1,11}$/.test(v) ? Number(v) : null }
    if (searchParams.get('mode') === 'preview') setMode('preview')
    setYtd(mapCard((k) => num(`y${CODE[k]}`) ?? PV_DEFAULT[k]))
    if (searchParams.get('q4') === 'm') setQ4(mapCard((k) => num(`q${CODE[k]}`) ?? 0))
    setYtdSalary(num('ys'))
  }, [searchParams])

  // 상태 → URL (기본값과 다른 것만)
  useEffect(() => {
    if (!loaded.current) return
    const url = new URL(window.location.href)
    const put = (q: string, v: string | null) => { if (v === null) url.searchParams.delete(q); else url.searchParams.set(q, v) }
    for (const [k, q] of NUM_PARAMS) put(q, inp[k] !== DEFAULT_INPUT[k] ? String(inp[k]) : null)
    for (const [k, q] of BOOL_PARAMS) put(q, inp[k] !== DEFAULT_INPUT[k] ? (inp[k] ? '1' : '0') : null)
    for (const [k, q] of OPT_PARAMS) put(q, opt[k] || null)
    const pv = mode === 'preview'
    put('mode', pv ? 'preview' : null)
    put('ys', pv && ytdSalary !== null ? String(ytdSalary) : null)
    put('q4', pv && q4 ? 'm' : null)
    for (const k of CARD_KEYS) {
      put(`y${CODE[k]}`, pv && ytd[k] !== PV_DEFAULT[k] ? String(ytd[k]) : null)
      put(`q${CODE[k]}`, pv && q4 && q4[k] ? String(q4[k]) : null)
    }
    window.history.replaceState(window.history.state, '', url)
  }, [inp, opt, mode, ytd, q4, ytdSalary])

  const heads = 1 + (inp.spouse ? 1 : 0) + inp.children + inp.others
  const kids8 = Math.max(0, inp.children - inp.kidsUnder8)
  // 미리보기: 1~9월 실적 → 연간 추정 (총급여·카드 사용액)
  const pv = mode === 'preview'
  const salary = pv && ytdSalary !== null ? annualize(ytdSalary) : inp.salary
  const q4Auto = mapCard((k) => annualize(ytd[k]) - ytd[k])
  const spend: CardSpend = pv ? annualSpend(ytd, q4) : inp
  // 기납부세액 자동 추정: netSalary(간이세액표와 같은 방식의 연 환산 소득세)
  const autoPrepaid = useMemo(
    () => calculateNetSalary(salary, { nonTaxableMonthly: 0, dependents: heads, children: kids8 })?.deductions.incomeTax ?? 0,
    [salary, heads, kids8],
  )
  const auto = autoInsurance(salary)
  const full: YetInput = {
    ...inp,
    ...mapCard((k) => spend[k]),
    salary,
    pension: opt.pension ? Number(opt.pension) : undefined,
    healthEmp: opt.healthEmp ? Number(opt.healthEmp) : undefined,
    prepaid: opt.prepaid ? Number(opt.prepaid) : autoPrepaid,
  }
  const r = calc(full)
  const tipList = tips(full)
  const gainTips = tipList.filter((x) => x.gain > 0)

  const kind = r.refund > 0 ? 'refund' : r.refund < 0 ? 'pay' : 'zero'
  const headline = kind === 'zero' ? t('yt.hero.zero') : t(`yt.hero.${kind}`, { amount: won(Math.abs(r.refund)) })
  const absRefund = Math.abs(r.refund)
  const shareHeadline = kind === 'zero' ? headline
    : t(`yt.share.${kind}`, { amount: absRefund >= 10_000 ? `${man(absRefund)}만` : won(absRefund), amountWon: won(absRefund) })
  const effRate = r.salary ? (r.totalTax / r.salary) * 100 : 0

  // 12월 31일까지 할 일
  const ytdSpent = sumCard(ytd)
  const ytdGap = cardThresholdGap(salary, ytdSpent)
  const q4Credit = pv ? (q4 ?? q4Auto).credit : Math.round(inp.credit / 4) // 연간 모드: 남은 3개월 = 연간의 1/4 가정
  const strat = q4Strategy(full, q4Credit)
  const top = pensionTopUp(full)
  const hometownGain = tipList.find((x) => x.id === 'hometown')?.gain ?? 0
  const dd = (date: string) => (today ? ddayLabel(daysBetween(today, date)) : null)
  const chg = (t.raw('yt.chg.items') as { title: string; desc: string; law: string }[] | undefined) ?? []

  const seg = (on: boolean) => `flex-1 min-h-11 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
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
        <div className="flex gap-1.5 mt-4 max-w-md" role="radiogroup" aria-label={t('yt.mode.label')}>
          {(['annual', 'preview'] as const).map((m) => (
            <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)} className={seg(mode === m)}>
              {t(`yt.mode.${m}`)}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted mt-2">{t(`yt.mode.${mode}Hint`)}</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* ── 입력 ── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="ui-card p-6 space-y-5">
            {pv && (
              <div>
                <div className="text-sm font-medium text-body mb-1.5">{t('yt.pv.salaryBasis')}</div>
                <div className="flex gap-1.5" role="radiogroup" aria-label={t('yt.pv.salaryBasis')}>
                  <button type="button" role="radio" aria-checked={ytdSalary === null} onClick={() => setYtdSalary(null)} className={seg(ytdSalary === null)}>
                    {t('yt.pv.basisAnnual')}
                  </button>
                  <button type="button" role="radio" aria-checked={ytdSalary !== null}
                    onClick={() => { if (ytdSalary === null) setYtdSalary(Math.round((inp.salary * PREVIEW_MONTHS) / 12)) }} className={seg(ytdSalary !== null)}>
                    {t('yt.pv.basisYtd')}
                  </button>
                </div>
              </div>
            )}
            {pv && ytdSalary !== null
              ? <Money label={t('yt.pv.ytdSalary')} value={ytdSalary} onChange={setYtdSalary} hint={t('yt.pv.ytdSalaryHint', { amount: won(salary) })} unit={W} />
              : <Money label={t('yt.in.salary')} value={inp.salary} onChange={(v) => set('salary', v)} hint={t('yt.in.salaryHint')} unit={W} />}
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

          {pv ? (
            <Section title={t('yt.pv.cardTitle')} badge={`${won(r.card.total)}${W}`} open>
              <p className="text-xs text-muted">{t('yt.pv.cardHint')}</p>
              {CARD_KEYS.map((k) => (
                <Money key={k} label={t(`yt.in.${k}`)} value={ytd[k]} onChange={(v) => setYtd((p) => ({ ...p, [k]: v }))} unit={W} />
              ))}
              <div className="bg-subtle rounded-2xl p-4 text-sm text-sub tabular-nums">
                {ytdGap > 0
                  ? t('yt.pv.ytdShort', { spent: won(ytdSpent), threshold: won(r.card.threshold), amount: won(ytdGap) })
                  : t('yt.pv.ytdOver', { threshold: won(r.card.threshold), amount: won(ytdSpent - r.card.threshold) })}
              </div>
              <div>
                <div className="text-sm font-medium text-body mb-1.5">{t('yt.pv.q4')}</div>
                <div className="flex gap-1.5" role="radiogroup" aria-label={t('yt.pv.q4')}>
                  <button type="button" role="radio" aria-checked={!q4} onClick={() => setQ4(null)} className={seg(!q4)}>{t('yt.pv.q4Auto')}</button>
                  <button type="button" role="radio" aria-checked={!!q4} onClick={() => { if (!q4) setQ4(q4Auto) }} className={seg(!!q4)}>{t('yt.pv.q4Manual')}</button>
                </div>
                {!q4 && <p className="text-xs text-muted mt-1.5 tabular-nums">{t('yt.pv.q4AutoHint', { amount: won(sumCard(q4Auto)) })}</p>}
              </div>
              {q4 && CARD_KEYS.map((k) => (
                <Money key={k} label={t('yt.pv.q4Item', { item: t(`yt.in.${k}`) })} value={q4[k]}
                  onChange={(v) => setQ4((p) => (p ? { ...p, [k]: v } : p))} unit={W} />
              ))}
              <div className="bg-subtle rounded-2xl p-4 text-sm text-sub tabular-nums">
                <p className="font-medium text-fg">{t('yt.pv.annual', { amount: won(r.card.spent) })}</p>
                <p className="mt-1">
                  {r.card.shortfall > 0
                    ? t('yt.card.short', { threshold: won(r.card.threshold), amount: won(r.card.shortfall) })
                    : t('yt.card.over', { threshold: won(r.card.threshold), amount: won(r.card.spent - r.card.threshold) })}
                </p>
              </div>
            </Section>
          ) : (
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
          )}

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
            <div className="text-3xl sm:text-4xl font-bold mt-2 tabular-nums" aria-live="polite">{headline}</div>
            <div className="text-sm text-white/80 mt-2 tabular-nums">
              {t('yt.hero.vs', { tax: won(r.totalTax), paid: won(r.prepaid + r.prepaidLocal) })}
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <span className="rounded-full bg-white/15 px-3 py-1 text-sm">{t('yt.hero.rate', { rate: Math.round(r.rate * 100) })}</span>
              <span className="rounded-full bg-white/15 px-3 py-1 text-sm">{t('yt.hero.eff', { rate: effRate.toFixed(1) })}</span>
              {pv && <span className="rounded-full bg-white/15 px-3 py-1 text-sm">{t(q4 ? 'yt.pv.chipManual' : 'yt.pv.chip')}</span>}
              {!opt.prepaid && <span className="rounded-full bg-white/15 px-3 py-1 text-sm">{t('yt.hero.estimated')}</span>}
              {r.standard && <span className="rounded-full bg-white/15 px-3 py-1 text-sm">{t('yt.hero.standard')}</span>}
            </div>
          </div>

          <ShareResult
            card={{
              tool: t('title'),
              label: t('yt.share.label', { salary: man(r.salary), salaryWon: won(r.salary) }),
              headline: shareHeadline,
              sub: t(pv ? 'yt.share.subPreview' : 'yt.share.sub', { year: TAX_YEAR }),
              rows: [
                { label: t('yt.row.determined'), value: `${won(r.totalTax)}${W}` },
                { label: t('yt.row.prepaidAll'), value: `${won(r.prepaid + r.prepaidLocal)}${W}` },
                pv
                  ? { label: t('yt.pv.rowSpend'), value: `${won(r.card.spent)}${W}` }
                  : { label: t('yt.row.taxBase'), value: `${won(r.taxBase)}${W}` },
              ],
            }}
            text={t('yt.share.text', { salary: man(r.salary), salaryWon: won(r.salary), result: shareHeadline })}
            fileName="toolhub-year-end-tax"
          />

          {/* 12월 31일까지 할 일 */}
          <div className="ui-card p-6">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold text-fg">{t('yt.todo.title')}</h2>
              {dd(DEADLINE.yearEnd) && <span className="shrink-0 text-sm font-semibold text-primary tabular-nums">{dd(DEADLINE.yearEnd)}</span>}
            </div>
            <p className="text-sm text-muted mt-1">{t('yt.todo.desc')}</p>
            <ul className="mt-4 divide-y divide-line">
              <Todo title={t('yt.todo.pension')} dday={null}
                gain={top.gain > 0 ? `+${won(top.gain)}${W}` : null}
                desc={top.room === 0 ? t('yt.todo.pensionFull')
                  : top.gain > 0 ? t('yt.todo.pensionDesc', { room: man(top.room), roomWon: won(top.room), rate: (pensionRate(salary) * 110).toFixed(1) })
                  : t('yt.todo.pensionZero')} />
              <Todo title={t('yt.todo.card')} dday={null}
                gain={strat.gain > 0 ? `+${won(strat.gain)}${W}` : null}
                desc={`${t(`yt.todo.advice.${strat.kind}`, { amount: won(strat.kind === 'short' ? strat.gap : strat.moved) })}${strat.kind === 'switch' && !pv ? ` ${t('yt.todo.cardAssume')}` : ''}`} />
              <Todo title={t('yt.todo.donation')} dday={null}
                gain={hometownGain > 0 ? `+${won(hometownGain)}${W}` : null}
                desc={t(inp.hometown < 100_000 ? 'yt.todo.donationHometown' : 'yt.todo.donationDone')} />
              <Todo title={t('yt.todo.simplified')} dday={dd(DEADLINE.simplified)} gain={null}
                desc={t('yt.todo.simplifiedDesc', { year: TAX_YEAR + 1 })} />
            </ul>
          </div>

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

          {/* 2026년 귀속 달라진 점 */}
          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg">{t('yt.chg.title', { year: TAX_YEAR })}</h2>
            <ul className="mt-4 space-y-3">
              {chg.map((c, i) => (
                <li key={i}>
                  <div className="text-sm font-medium text-fg">{c.title}</div>
                  <p className="text-sm text-sub mt-0.5">{c.desc}</p>
                  <a href={CHG_LINKS[i]} target="_blank" rel="noopener noreferrer" className="inline-flex items-center min-h-11 text-xs text-primary underline underline-offset-2">
                    {c.law}
                  </a>
                </li>
              ))}
            </ul>
            <a href="https://www.nts.go.kr/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center min-h-11 text-sm font-medium text-primary">
              {t('yt.chg.nts')}
            </a>
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

function Todo({ title, desc, gain, dday }: { title: string; desc: string; gain: string | null; dday: string | null }) {
  return (
    <li className="flex items-start justify-between gap-3 py-3">
      <div className="min-w-0">
        <div className="text-sm font-medium text-fg">{title}</div>
        <p className="text-xs text-muted mt-0.5">{desc}</p>
      </div>
      <div className="shrink-0 text-right tabular-nums">
        {gain && <div className="text-base font-bold text-primary">{gain}</div>}
        {dday && <div className="text-xs text-muted">{dday}</div>}
      </div>
    </li>
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
