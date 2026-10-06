'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/pensionCalculator'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import { INSURANCE, pct } from '@/utils/insuranceRates'
import { A_VALUE, INCOME_CAP, INCOME_FLOOR, NEW_COEF, YEAR, ageInput, calcPension } from '@/utils/nationalPension'

// 간편 계산(나이·월 소득) + 월 보험료. 조기·연기·크레딧·부양가족은 /national-pension (딥링크로 입력 전달)
const DEFAULTS = { age: 30, income: 300, start: 27, retire: 65 }
/** 40년 가입·평균소득(A값)일 때 소득대체율 (2026~ 계수 1.29 → 43%) */
const MAX_REPLACEMENT = Math.round((NEW_COEF / 3) * 100)
const won = (n: number) => Math.round(n).toLocaleString('ko-KR')

export default function PensionCalculator() {
  const t = useTranslations('pensionCalculator')
  const searchParams = useSearchParams()

  const [currentAge, setCurrentAge] = useState(DEFAULTS.age)
  const [monthlyIncome, setMonthlyIncome] = useState(DEFAULTS.income)
  const [startAge, setStartAge] = useState(DEFAULTS.start)
  const [retirementAge, setRetirementAge] = useState(DEFAULTS.retire)

  // URL → 입력 (마운트 후, 첫 렌더는 기본값)
  useEffect(() => {
    const age = searchParams.get('age')
    const income = searchParams.get('income')
    const start = searchParams.get('start')
    const retire = searchParams.get('retire')
    if (age) setCurrentAge(Number(age))
    if (income) setMonthlyIncome(Number(income))
    if (start) setStartAge(Number(start))
    if (retire) setRetirementAge(Number(retire))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 입력 → URL
  useEffect(() => {
    const params = new URLSearchParams({ age: String(currentAge), income: String(monthlyIncome), start: String(startAge), retire: String(retirementAge) })
    window.history.replaceState({}, '', `${window.location.pathname}?${params}`)
  }, [currentAge, monthlyIncome, startAge, retirementAge])

  const reset = () => {
    setCurrentAge(DEFAULTS.age)
    setMonthlyIncome(DEFAULTS.income)
    setStartAge(DEFAULTS.start)
    setRetirementAge(DEFAULTS.retire)
  }

  const valid = monthlyIncome > 0 && startAge >= 18 && startAge < currentAge && currentAge <= retirementAge && retirementAge <= 70
  const input = valid ? ageInput(currentAge, monthlyIncome * 10_000, startAge, retirementAge) : null
  const r = input ? calcPension(input) : null
  const premium = r ? Math.round(r.B * INSURANCE.pensionRate) : 0
  const replacement = r ? (r.basic / (monthlyIncome * 10_000)) * 100 : 0
  // 연금/납부 비율: 20년(240개월) 수령 가정
  const ratio = r && r.paidSelf > 0 ? (r.basic * 240) / r.paidSelf : 0
  // 상세 계산기로 같은 입력 전달 (b·s·y·i = NationalPensionCalculator 쿼리)
  const detailHref = input ? `/national-pension/?b=${input.birthYear}&s=${input.startYear}&y=${input.years}&i=${input.income}` : '/national-pension/'
  const amount = (n: number) => t('amount', { v: won(n) })
  const rate = pct(INSURANCE.pensionRate)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <div className="lg:col-span-1">
          <div className="ui-card p-6 space-y-5">
            {r?.eligible && <MobileResultLink href="#pension-calculator-result" label={t('resultTitle')} value={amount(r.basic)} />}
            <div>
              <label htmlFor="pc-age" className="block text-sm font-medium text-body mb-2">{t('currentAge')}</label>
              <div className="flex items-center gap-2">
                <input id="pc-age" type="number" inputMode="numeric" min={19} max={70} value={currentAge} onChange={e => setCurrentAge(Number(e.target.value))} className="ui-field w-full px-4 py-3 tabular-nums" />
                <span className="text-sm text-muted whitespace-nowrap">{t('ageUnit')}</span>
              </div>
            </div>

            <div>
              <label htmlFor="pc-income" className="block text-sm font-medium text-body mb-2">{t('monthlyIncome')}</label>
              <div className="flex items-center gap-2">
                <input id="pc-income" type="number" inputMode="numeric" min={1} value={monthlyIncome} onChange={e => setMonthlyIncome(Number(e.target.value))} aria-describedby="pc-income-h" className="ui-field w-full px-4 py-3 tabular-nums" />
                <span className="text-sm text-muted whitespace-nowrap">{t('manwonUnit')}</span>
              </div>
              <p id="pc-income-h" className="text-xs text-muted mt-1">{t('capHint', { min: INCOME_FLOOR / 10_000, max: INCOME_CAP / 10_000 })}</p>
            </div>

            <div>
              <label htmlFor="pc-start" className="block text-sm font-medium text-body mb-2">{t('startAge')}</label>
              <div className="flex items-center gap-2">
                <input id="pc-start" type="number" inputMode="numeric" min={18} max={60} value={startAge} onChange={e => setStartAge(Number(e.target.value))} className="ui-field w-full px-4 py-3 tabular-nums" />
                <span className="text-sm text-muted whitespace-nowrap">{t('ageUnit')}</span>
              </div>
            </div>

            <div>
              <div className="flex items-baseline justify-between mb-2">
                <label htmlFor="pc-retire" className="text-sm font-medium text-body">{t('retirementAge')}</label>
                <span className="text-sm font-semibold text-fg tabular-nums">{t('ageValue', { a: retirementAge })}</span>
              </div>
              <input id="pc-retire" type="range" min={50} max={70} step={1} value={retirementAge} aria-valuetext={t('ageValue', { a: retirementAge })} onChange={e => setRetirementAge(Number(e.target.value))} className="w-full accent-[var(--primary)]" />
            </div>

            <button type="button" onClick={reset} className="ui-btn-soft w-full px-4 py-2">{t('reset')}</button>
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2">
          {r ? (
            <div id="pension-calculator-result" className="ui-card p-6 space-y-5 scroll-mt-20" aria-live="polite">
              {r.eligible ? (
                <div>
                  <p className="text-sm text-muted">{t('resultTitle')} · {t('startAgeNote', { age: r.startAge })}</p>
                  <p className="text-3xl sm:text-4xl font-bold text-fg tabular-nums mt-1">{amount(r.basic)}</p>
                  <p className="text-sm text-sub mt-1">{t('annualPension')} {amount(r.basic * 12)}</p>
                </div>
              ) : (
                <div className="bg-amber-50 text-amber-800 rounded-2xl p-5 text-sm" role="status">{t('ineligible')}</div>
              )}

              <div>
                <h2 className="text-base font-semibold text-fg mb-3">{t('contributionDetail')}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-subtle rounded-2xl p-4">
                    <p className="text-sm text-muted">{t('employeeContribution', { rate })}</p>
                    <p className="text-xl font-bold text-fg tabular-nums mt-1">{amount(premium)}</p>
                    <p className="text-xs text-muted mt-0.5">{t('perMonth')}</p>
                  </div>
                  <div className="bg-subtle rounded-2xl p-4">
                    <p className="text-sm text-muted">{t('employerContribution', { rate })}</p>
                    <p className="text-xl font-bold text-fg tabular-nums mt-1">{amount(premium)}</p>
                    <p className="text-xs text-muted mt-0.5">{t('totalMonthlyContribution')} {amount(premium * 2)}</p>
                  </div>
                  <div className="bg-subtle rounded-2xl p-4">
                    <p className="text-sm text-muted">{t('totalContribution')}</p>
                    <p className="text-xl font-bold text-fg tabular-nums mt-1">{amount(r.paidSelf)}</p>
                    <p className="text-xs text-muted mt-0.5">{t('contributionYears')} {r.ownMonths / 12}{t('yearsLabel')}</p>
                  </div>
                </div>
              </div>

              {r.eligible && (
                <div className="divide-y divide-line border-y border-line text-sm">
                  <div className="flex items-center justify-between gap-3 py-2.5">
                    <span className="text-sub">{t('replacementRate')}<span className="block text-xs text-muted">{t('replacementHint', { max: MAX_REPLACEMENT })}</span></span>
                    <span className="text-fg font-medium tabular-nums">{replacement.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 py-2.5">
                    <span className="text-sub">{t('pensionRatio')}<span className="block text-xs text-muted">{t('ratioNote')}</span></span>
                    <span className="text-fg font-medium tabular-nums">{t('ratioValue', { x: ratio.toFixed(2) })}</span>
                  </div>
                </div>
              )}

              <Link
                href={detailHref}
                className="flex items-center justify-between gap-3 bg-subtle hover:bg-soft rounded-2xl p-4 transition-colors"
              >
                <span>
                  <span className="block text-sm font-semibold text-fg">{t('detailTitle')}</span>
                  <span className="block text-xs text-muted mt-0.5">{t('detailDesc')}</span>
                </span>
                <ArrowRight className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
              </Link>

              {r.eligible && (
                <ShareResult
                  card={{
                    tool: t('title'),
                    label: t('shareLabel', { age: currentAge, income: won(monthlyIncome) }),
                    headline: amount(r.basic),
                    sub: t('startAgeNote', { age: r.startAge }),
                    rows: [
                      { label: t('employeeContribution', { rate }), value: amount(premium) },
                      { label: t('totalContribution'), value: amount(r.paidSelf) },
                      { label: t('replacementRate'), value: `${replacement.toFixed(1)}%` },
                    ],
                  }}
                  text={t('shareText', { v: won(r.basic), age: r.startAge })}
                />
              )}
            </div>
          ) : (
            <div className="bg-amber-50 text-amber-800 rounded-2xl p-5" role="alert">
              <p className="font-semibold">{t('invalidTitle')}</p>
              <ul className="text-sm mt-2 space-y-1 list-disc pl-5">
                {(t.raw('invalidItems') as string[]).map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="bg-subtle rounded-2xl p-5 text-sm text-sub">
        <p className="font-semibold text-fg">{t('noticeTitle')}</p>
        <p className="mt-1">{t('notice')}</p>
        <p className="text-xs text-muted mt-2">
          {t('basis', { year: YEAR, a: A_VALUE.toLocaleString('ko-KR'), rate: pct(INSURANCE.pensionRateTotal), min: INCOME_FLOOR / 10_000, max: INCOME_CAP / 10_000 })}
        </p>
      </div>

      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        {(['formula', 'contribution', 'tips'] as const).map(k => (
          <section key={k}>
            <h3 className="text-base font-semibold text-fg mb-2">{t(`guide.${k}.title`)}</h3>
            <ul className="space-y-1.5 list-disc pl-5 text-sm text-sub leading-relaxed">
              {(t.raw(`guide.${k}.items`) as string[]).map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
