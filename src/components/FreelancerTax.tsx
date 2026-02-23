'use client'

import { useState, useMemo, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Calculator, Copy, Check, BookOpen, AlertCircle } from 'lucide-react'

// ── 2025년 종합소득세 세율 (8단계) ──
const INCOME_BRACKETS = [
  { upTo: 14_000_000, rate: 0.06, deduction: 0 },
  { upTo: 50_000_000, rate: 0.15, deduction: 1_260_000 },
  { upTo: 88_000_000, rate: 0.24, deduction: 5_760_000 },
  { upTo: 150_000_000, rate: 0.35, deduction: 15_440_000 },
  { upTo: 300_000_000, rate: 0.38, deduction: 19_940_000 },
  { upTo: 500_000_000, rate: 0.40, deduction: 25_940_000 },
  { upTo: 1_000_000_000, rate: 0.42, deduction: 35_940_000 },
  { upTo: Infinity, rate: 0.45, deduction: 65_940_000 },
]

function calcIncomeTax(taxable: number): number {
  if (taxable <= 0) return 0
  for (const b of INCOME_BRACKETS) {
    if (taxable <= b.upTo) {
      return Math.floor(taxable * b.rate - b.deduction)
    }
  }
  return 0
}

function findBracketIndex(taxable: number): number {
  if (taxable <= 0) return -1
  for (let i = 0; i < INCOME_BRACKETS.length; i++) {
    if (taxable <= INCOME_BRACKETS[i].upTo) return i
  }
  return INCOME_BRACKETS.length - 1
}

// ── 업종별 경비율 (2025년 기준 대표 업종) ──
type IndustryCode = 'it' | 'design' | 'writing' | 'education' | 'consulting' | 'entertainment' | 'other'

interface ExpenseRates {
  simple: number   // 단순경비율 (%)
  standard: number // 기준경비율 (%)
}

const INDUSTRY_RATES: Record<IndustryCode, ExpenseRates> = {
  it: { simple: 64.1, standard: 17.4 },
  design: { simple: 61.2, standard: 16.8 },
  writing: { simple: 72.7, standard: 20.5 },
  education: { simple: 65.4, standard: 18.2 },
  consulting: { simple: 59.4, standard: 15.8 },
  entertainment: { simple: 67.3, standard: 19.0 },
  other: { simple: 61.7, standard: 16.0 },
}

// 단순경비율 적용 기준 (직전년도 수입금액)
const SIMPLE_RATE_THRESHOLD = 24_000_000 // 전문직 외 2,400만원

const formatNumber = (n: number) => n.toLocaleString('ko-KR')
const formatWon = (n: number) => `${formatNumber(n)}원`
const parseNum = (v: string) => parseInt(v.replace(/[^0-9]/g, ''), 10) || 0

export default function FreelancerTax() {
  const t = useTranslations('freelancerTax')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showGuide, setShowGuide] = useState(false)

  // ── 입력 상태 ──
  const [annualRevenue, setAnnualRevenue] = useState('')        // 연간 총 수입
  const [industry, setIndustry] = useState<IndustryCode>('it')
  const [expenseMethod, setExpenseMethod] = useState<'simple' | 'standard' | 'actual'>('simple')
  const [actualExpenses, setActualExpenses] = useState('')       // 실제 경비 (actual 방식)
  const [dependents, setDependents] = useState('1')             // 부양가족 수 (본인 포함)
  const [nationalPensionPaid, setNationalPensionPaid] = useState('')  // 납부한 국민연금
  const [healthInsurancePaid, setHealthInsurancePaid] = useState('')  // 납부한 건강보험

  const result = useMemo(() => {
    const revenue = parseNum(annualRevenue)
    if (revenue <= 0) return null

    // ── 1. 원천징수세액 (3.3%) ──
    const withholdingRate = 0.033
    const withheld = Math.floor(revenue * withholdingRate)
    const withheldIncomeTax = Math.floor(revenue * 0.03)
    const withheldLocalTax = Math.floor(revenue * 0.003)

    // ── 2. 필요경비 계산 ──
    let expenses: number
    let expenseLabel: string

    if (expenseMethod === 'actual') {
      expenses = parseNum(actualExpenses)
      expenseLabel = t('actualExpense')
    } else if (expenseMethod === 'simple' && revenue <= SIMPLE_RATE_THRESHOLD * 3) {
      // 단순경비율 (소규모 사업자)
      const rate = INDUSTRY_RATES[industry].simple
      expenses = Math.floor(revenue * rate / 100)
      expenseLabel = `${t('simpleRate')} (${rate}%)`
    } else {
      // 기준경비율 (일정규모 이상)
      const rate = INDUSTRY_RATES[industry].standard
      expenses = Math.floor(revenue * rate / 100)
      expenseLabel = `${t('standardRate')} (${rate}%)`
    }

    // ── 3. 소득금액 ──
    const income = Math.max(0, revenue - expenses)

    // ── 4. 소득공제 ──
    const personalDeduction = parseInt(dependents) * 1_500_000 // 인적공제 인당 150만원
    const pensionDeduction = parseNum(nationalPensionPaid)       // 국민연금 공제
    const healthDeduction = parseNum(healthInsurancePaid)         // 건강보험 공제
    const standardDeduction = 600_000 // 표준공제 60만원

    const totalDeduction = personalDeduction + pensionDeduction + healthDeduction + standardDeduction

    // ── 5. 과세표준 ──
    const taxable = Math.max(0, income - totalDeduction)

    // ── 6. 산출세액 ──
    const incomeTax = calcIncomeTax(taxable)
    const localTax = Math.floor(incomeTax * 0.1) // 지방소득세 10%
    const totalTax = incomeTax + localTax

    // ── 7. 환급/추납 ──
    const refund = withheld - totalTax // 양수면 환급, 음수면 추가납부

    const effectiveRate = revenue > 0 ? (totalTax / revenue) * 100 : 0
    const bracketIdx = findBracketIndex(taxable)

    return {
      revenue,
      withheld,
      withheldIncomeTax,
      withheldLocalTax,
      expenses,
      expenseLabel,
      income,
      personalDeduction,
      pensionDeduction,
      healthDeduction,
      standardDeduction,
      totalDeduction,
      taxable,
      incomeTax,
      localTax,
      totalTax,
      refund,
      effectiveRate,
      bracketIdx,
    }
  }, [annualRevenue, industry, expenseMethod, actualExpenses, dependents, nationalPensionPaid, healthInsurancePaid, t])

  const copyToClipboard = useCallback(async (text: string, id: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.left = '-999999px'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }, [])

  const buildSummary = useCallback(() => {
    if (!result) return ''
    return [
      `[프리랜서 세금 계산 결과]`,
      `연간 수입: ${formatWon(result.revenue)}`,
      `원천징수 (3.3%): ${formatWon(result.withheld)}`,
      `필요경비: ${formatWon(result.expenses)} (${result.expenseLabel})`,
      `과세표준: ${formatWon(result.taxable)}`,
      `실제 세금: ${formatWon(result.totalTax)}`,
      `${result.refund >= 0 ? '예상 환급액' : '추가 납부액'}: ${formatWon(Math.abs(result.refund))}`,
      `실효세율: ${result.effectiveRate.toFixed(1)}%`,
    ].join('\n')
  }, [result])

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Calculator className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* 입력 패널 */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('inputTitle')}</h2>

            <NumInput label={t('annualRevenue')} value={annualRevenue} onChange={setAnnualRevenue} placeholder="50,000,000" />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('industry')}</label>
              <select
                value={industry}
                onChange={e => setIndustry(e.target.value as IndustryCode)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="it">{t('industries.it')}</option>
                <option value="design">{t('industries.design')}</option>
                <option value="writing">{t('industries.writing')}</option>
                <option value="education">{t('industries.education')}</option>
                <option value="consulting">{t('industries.consulting')}</option>
                <option value="entertainment">{t('industries.entertainment')}</option>
                <option value="other">{t('industries.other')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('expenseMethod')}</label>
              <div className="space-y-2">
                {(['simple', 'standard', 'actual'] as const).map(method => (
                  <label key={method} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="expenseMethod"
                      value={method}
                      checked={expenseMethod === method}
                      onChange={() => setExpenseMethod(method)}
                      className="accent-blue-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{t(`methods.${method}`)}</span>
                  </label>
                ))}
              </div>
            </div>

            {expenseMethod === 'actual' && (
              <NumInput label={t('actualExpense')} value={actualExpenses} onChange={setActualExpenses} placeholder="20,000,000" />
            )}

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">{t('deductions')}</h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('dependentCount')}</label>
                  <select
                    value={dependents}
                    onChange={e => setDependents(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                      <option key={n} value={n}>{n}{t('person')}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">{t('dependentHint')}</p>
                </div>

                <NumInput label={t('nationalPension')} value={nationalPensionPaid} onChange={setNationalPensionPaid} placeholder="2,700,000" hint={t('pensionHint')} />
                <NumInput label={t('healthInsurance')} value={healthInsurancePaid} onChange={setHealthInsurancePaid} placeholder="1,800,000" hint={t('healthHint')} />
              </div>
            </div>
          </div>

          {/* 업종별 경비율 참고표 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('rateReference')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs" aria-label={t('rateReference')}>
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50">
                    <th className="px-2 py-1.5 text-left text-gray-500 dark:text-gray-400">{t('industryCol')}</th>
                    <th className="px-2 py-1.5 text-right text-gray-500 dark:text-gray-400">{t('simpleCol')}</th>
                    <th className="px-2 py-1.5 text-right text-gray-500 dark:text-gray-400">{t('standardCol')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {(Object.entries(INDUSTRY_RATES) as [IndustryCode, ExpenseRates][]).map(([code, rates]) => (
                    <tr key={code} className={industry === code ? 'bg-blue-50 dark:bg-blue-950/30' : ''}>
                      <td className="px-2 py-1.5 text-gray-700 dark:text-gray-300">{t(`industries.${code}`)}</td>
                      <td className="px-2 py-1.5 text-right text-gray-900 dark:text-white">{rates.simple}%</td>
                      <td className="px-2 py-1.5 text-right text-gray-900 dark:text-white">{rates.standard}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 결과 패널 */}
        <div className="lg:col-span-2 space-y-4">
          {result ? (
            <>
              {/* 핵심 결과 */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('result')}</h2>
                  <button
                    onClick={() => copyToClipboard(buildSummary(), 'result')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                  >
                    {copiedId === 'result' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    {copiedId === 'result' ? t('copied') : t('copyResult')}
                  </button>
                </div>

                {/* 환급/추납 강조 카드 */}
                <div className={`rounded-xl p-5 mb-6 text-center ${result.refund >= 0
                  ? 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800'
                }`}>
                  <p className={`text-sm mb-1 ${result.refund >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {result.refund >= 0 ? t('expectedRefund') : t('additionalPayment')}
                  </p>
                  <p className={`text-3xl font-bold ${result.refund >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                    {result.refund >= 0 ? '+' : '-'}{formatWon(Math.abs(result.refund))}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {t('withheldVsActual', { withheld: formatWon(result.withheld), actual: formatWon(result.totalTax) })}
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  <StatCard label={t('withholdingTax')} value={formatWon(result.withheld)} color="blue" />
                  <StatCard label={t('actualTax')} value={formatWon(result.totalTax)} color="red" />
                  <StatCard label={t('effectiveRate')} value={`${result.effectiveRate.toFixed(1)}%`} color="purple" />
                  <StatCard label={t('taxableAmount')} value={formatWon(result.taxable)} color="gray" />
                </div>

                {/* 상세 내역 */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">{t('breakdown')}</h3>
                  <div className="space-y-2 text-sm">
                    <Row label={t('annualRevenue')} value={formatWon(result.revenue)} bold />
                    <Row label={`${t('withholdingTax')} (3.3%)`} value={`-${formatWon(result.withheld)}`} sub />

                    <div className="border-t border-gray-100 dark:border-gray-700 my-2" />
                    <Row label={result.expenseLabel} value={`-${formatWon(result.expenses)}`} />
                    <Row label={t('incomeAmount')} value={formatWon(result.income)} bold />

                    <div className="border-t border-gray-100 dark:border-gray-700 my-2" />
                    <Row label={`${t('personalDeduction')} (${dependents}${t('person')} × 150${t('manwon')})`} value={`-${formatWon(result.personalDeduction)}`} sub />
                    {result.pensionDeduction > 0 && (
                      <Row label={t('nationalPension')} value={`-${formatWon(result.pensionDeduction)}`} sub />
                    )}
                    {result.healthDeduction > 0 && (
                      <Row label={t('healthInsurance')} value={`-${formatWon(result.healthDeduction)}`} sub />
                    )}
                    <Row label={t('standardDeduction')} value={`-${formatWon(result.standardDeduction)}`} sub />
                    <Row label={t('totalDeductions')} value={`-${formatWon(result.totalDeduction)}`} accent />

                    <div className="border-t border-gray-100 dark:border-gray-700 my-2" />
                    <Row label={t('taxableAmount')} value={formatWon(result.taxable)} bold />
                    <Row label={t('incomeTax')} value={formatWon(result.incomeTax)} sub />
                    <Row label={t('localTax')} value={formatWon(result.localTax)} sub />
                    <Row label={t('totalActualTax')} value={formatWon(result.totalTax)} highlight />

                    <div className="border-t border-gray-100 dark:border-gray-700 my-2" />
                    <Row
                      label={result.refund >= 0 ? t('expectedRefund') : t('additionalPayment')}
                      value={`${result.refund >= 0 ? '+' : '-'}${formatWon(Math.abs(result.refund))}`}
                      highlight
                      positive={result.refund >= 0}
                    />
                  </div>
                </div>
              </div>

              {/* 세율표 */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('rateTable')}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" aria-label={t('rateTable')}>
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700/50">
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t('bracketCol')}</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">{t('rateCol')}</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">{t('progressiveDeduction')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {INCOME_BRACKETS.map((b, i) => {
                        const prev = i > 0 ? INCOME_BRACKETS[i - 1].upTo : 0
                        return (
                          <tr key={i} className={result.bracketIdx === i ? 'bg-blue-50 dark:bg-blue-950/30' : ''}>
                            <td className="px-3 py-2 text-gray-900 dark:text-white">
                              {b.upTo === Infinity
                                ? `${formatNumber(prev)}원 초과`
                                : `${i === 0 ? '0' : formatNumber(prev)}원 ~ ${formatNumber(b.upTo)}원`
                              }
                            </td>
                            <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-white">{b.rate * 100}%</td>
                            <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">{formatWon(b.deduction)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center text-gray-400 dark:text-gray-500">
              <Calculator className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{t('inputPrompt')}</p>
            </div>
          )}
        </div>
      </div>

      {/* 가이드 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="w-full flex items-center justify-between"
          aria-expanded={showGuide}
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            {t('guide.title')}
          </h2>
          <span className="text-gray-400 text-xl" aria-hidden="true">{showGuide ? '−' : '+'}</span>
        </button>
        {showGuide && (
          <div className="mt-4 space-y-4 text-sm text-gray-700 dark:text-gray-300">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">{t('guide.withholding.title')}</h3>
              <ul className="list-disc pl-5 space-y-1">
                {(t.raw('guide.withholding.items') as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">{t('guide.expenseRates.title')}</h3>
              <ul className="list-disc pl-5 space-y-1">
                {(t.raw('guide.expenseRates.items') as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">{t('guide.tips.title')}</h3>
              <ul className="list-disc pl-5 space-y-1">
                {(t.raw('guide.tips.items') as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* 면책 */}
      <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 dark:text-amber-300">{t('disclaimer')}</p>
      </div>
    </div>
  )
}

// ── 서브컴포넌트 ──

function NumInput({ label, value, onChange, placeholder, hint }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; hint?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          value={(() => { const d = value.replace(/[^0-9]/g, ''); if (!d) return ''; const n = parseInt(d, 10); return isNaN(n) ? '' : n.toLocaleString('ko-KR') })()}
          onChange={e => onChange(e.target.value.replace(/[^0-9]/g, ''))}
          placeholder={placeholder}
          className="w-full px-3 py-2 pr-8 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">원</span>
      </div>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color: 'blue' | 'red' | 'green' | 'purple' | 'gray' }) {
  const colorMap = {
    blue: 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400',
    red: 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400',
    green: 'bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400',
    purple: 'bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400',
    gray: 'bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400',
  }
  return (
    <div className={`rounded-xl p-3 text-center ${colorMap[color]}`}>
      <p className="text-xs mb-1">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  )
}

function Row({ label, value, bold, sub, accent, highlight, positive }: {
  label: string; value: string; bold?: boolean; sub?: boolean; accent?: boolean; highlight?: boolean; positive?: boolean
}) {
  const highlightColor = positive === true
    ? 'bg-green-50 dark:bg-green-950/30 font-bold text-green-700 dark:text-green-400'
    : positive === false
    ? 'bg-red-50 dark:bg-red-950/30 font-bold text-red-700 dark:text-red-400'
    : 'bg-blue-50 dark:bg-blue-950/30 font-bold text-blue-700 dark:text-blue-400'

  return (
    <div className={`flex justify-between items-center ${sub ? 'pl-4 text-xs text-gray-500 dark:text-gray-400' : ''} ${bold ? 'font-medium' : ''} ${highlight ? `-mx-2 px-2 py-1.5 rounded-lg ${highlightColor}` : ''}`}>
      <span className={accent ? 'text-blue-600 dark:text-blue-400 font-medium' : highlight ? '' : 'text-gray-700 dark:text-gray-300'}>{label}</span>
      <span className={`${bold && !highlight ? 'text-gray-900 dark:text-white' : ''} ${accent ? 'text-blue-600 dark:text-blue-400 font-medium' : ''}`}>{value}</span>
    </div>
  )
}
