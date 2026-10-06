'use client'

import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/installmentCalc'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import { calcInstallment } from '@/utils/cardInstallment'

type Plan = 'normal' | 'free' | 'partial'

const QUICK_MONTHS = [2, 3, 6, 10, 12, 24]
const DEFAULTS = { amount: '1000000', months: 6, rate: '15', plan: 'normal' as Plan, feeMonths: 3 }
const won = (n: number) => Math.round(n).toLocaleString('ko-KR')

export default function InstallmentCalc() {
  const t = useTranslations('installmentCalc')
  const searchParams = useSearchParams()

  const [totalAmount, setTotalAmount] = useState(DEFAULTS.amount)
  const [months, setMonths] = useState(DEFAULTS.months)
  const [interestRate, setInterestRate] = useState(DEFAULTS.rate)
  const [plan, setPlan] = useState<Plan>(DEFAULTS.plan)
  const [feeMonths, setFeeMonths] = useState(DEFAULTS.feeMonths)

  // URL -> state (free=true 는 구버전 링크 호환)
  useEffect(() => {
    const amount = searchParams.get('amount')
    const m = Number(searchParams.get('months'))
    const rate = searchParams.get('rate')
    const p = searchParams.get('plan')
    const fm = Number(searchParams.get('fee'))
    if (amount) setTotalAmount(amount)
    if (m > 0) setMonths(Math.floor(m))
    if (rate && Number(rate) >= 0) setInterestRate(rate)
    if (p === 'free' || p === 'partial' || p === 'normal') setPlan(p)
    else if (searchParams.get('free') === 'true') setPlan('free')
    if (fm > 0) setFeeMonths(Math.floor(fm))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // state -> URL
  useEffect(() => {
    const params = new URLSearchParams({ amount: totalAmount, months: String(months), rate: interestRate, plan })
    if (plan === 'partial') params.set('fee', String(feeMonths))
    window.history.replaceState({}, '', `${window.location.pathname}?${params}`)
  }, [totalAmount, months, interestRate, plan, feeMonths])

  const amount = parseFloat(totalAmount) || 0
  const rate = parseFloat(interestRate) || 0
  const chargedMonths = plan === 'free' ? 0 : plan === 'partial' ? Math.min(feeMonths, months) : months

  const result = useMemo(() => {
    const r = calcInstallment(amount, months, rate, chargedMonths)
    return r.schedule.length ? r : null
  }, [amount, months, rate, chargedMonths])

  const comparison = useMemo(
    () => QUICK_MONTHS.map((m) => ({ months: m, ...calcInstallment(amount, m, rate) })),
    [amount, rate],
  )

  const handleReset = () => {
    setTotalAmount(DEFAULTS.amount)
    setMonths(DEFAULTS.months)
    setInterestRate(DEFAULTS.rate)
    setPlan(DEFAULTS.plan)
    setFeeMonths(DEFAULTS.feeMonths)
  }

  const pill = (active: boolean) =>
    `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`

  const last = result?.schedule[result.schedule.length - 1]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Settings */}
        <div className="lg:col-span-1">
          <div className="ui-card p-6 space-y-6">
            {result && last && <MobileResultLink href="#installment-calculator-result" label={t('result.firstPayment')} value={`${won(result.firstPayment)}${t('result.won')}`} />}
            <div>
              <label htmlFor="ic-amount" className="block text-sm font-medium text-body mb-2">{t('totalAmount')}</label>
              <input id="ic-amount" type="number" inputMode="numeric" min="0" value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)} placeholder={t('totalAmountPlaceholder')} className="ui-field px-4 py-3" />
              {amount > 0 && <p className="text-xs text-muted mt-1 tabular-nums">{won(amount)}{t('result.won')}</p>}
            </div>

            <div>
              <label htmlFor="ic-months" className="block text-sm font-medium text-body mb-2">{t('installmentMonths')}</label>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {QUICK_MONTHS.map((m) => (
                  <button key={m} onClick={() => setMonths(m)} className={pill(months === m)}>{m}{t('months')}</button>
                ))}
              </div>
              <input id="ic-months" type="number" min="1" max="60" value={months}
                onChange={(e) => setMonths(Math.min(60, Math.max(0, parseInt(e.target.value) || 0)))} className="ui-field px-4 py-3" />
            </div>

            <div>
              <div className="block text-sm font-medium text-body mb-2">{t('plan.title')}</div>
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t('plan.title')}>
                {(['normal', 'free', 'partial'] as Plan[]).map((p) => (
                  <button key={p} role="radio" aria-checked={plan === p} onClick={() => setPlan(p)} className={pill(plan === p)}>{t(`plan.${p}`)}</button>
                ))}
              </div>
              {plan === 'partial' && (
                <div className="mt-3">
                  <label htmlFor="ic-fee-months" className="block text-sm text-body mb-1">{t('plan.feeMonths')}</label>
                  <input id="ic-fee-months" type="number" min="1" max={months} value={feeMonths}
                    onChange={(e) => setFeeMonths(Math.max(1, parseInt(e.target.value) || 1))} className="ui-field px-4 py-3" />
                  <p className="text-xs text-muted mt-1">{t('plan.feeMonthsHint')}</p>
                </div>
              )}
            </div>

            {plan !== 'free' && (
              <div>
                <label htmlFor="ic-rate" className="block text-sm font-medium text-body mb-2">{t('interestRate')}</label>
                <input id="ic-rate" type="number" min="0" step="0.1" value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)} placeholder={t('interestRatePlaceholder')} className="ui-field px-4 py-3" />
                <p className="text-xs text-muted mt-1">{t('rateHint')}</p>
              </div>
            )}

            <button onClick={handleReset} className="w-full ui-btn-soft px-4 py-3 font-medium">{t('reset')}</button>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-6">
          {result && last && (
            <div id="installment-calculator-result" className="ui-card p-6 scroll-mt-20">
              <h2 className="font-semibold text-fg mb-4">{t('result.title')}</h2>
              <div className="text-sm text-muted">{t('result.firstPayment')}</div>
              <div className="text-3xl font-bold text-fg tabular-nums" aria-live="polite">{won(result.firstPayment)}{t('result.won')}</div>
              {result.firstPayment !== last.payment && (
                <p className="text-sm text-muted mt-1 tabular-nums">
                  {t('result.lastPayment')} {won(last.payment)}{t('result.won')} · {t('result.paymentRange')}
                </p>
              )}

              <div className="grid sm:grid-cols-3 gap-3 mt-5">
                <div className="bg-subtle rounded-xl p-4">
                  <div className="text-sm text-sub mb-1">{t('result.totalInterest')}</div>
                  <div className="text-xl font-bold text-fg tabular-nums">{won(result.totalFee)}{t('result.won')}</div>
                </div>
                <div className="bg-subtle rounded-xl p-4">
                  <div className="text-sm text-sub mb-1">{t('result.totalPayment')}</div>
                  <div className="text-xl font-bold text-fg tabular-nums">{won(result.totalPayment)}{t('result.won')}</div>
                </div>
                <div className="bg-subtle rounded-xl p-4">
                  <div className="text-sm text-sub mb-1">{t('result.effectiveRate')}</div>
                  <div className="text-xl font-bold text-fg tabular-nums">{(result.totalFee / amount * 100).toFixed(2)}%</div>
                </div>
              </div>

              <p className="mt-4 text-sm text-body">
                {result.totalFee > 0
                  ? t('result.vsLumpSum', { amount: won(amount), fee: won(result.totalFee) })
                  : t('result.lumpSumSame')}
              </p>
            </div>
          )}

          {result && (
            <ShareResult
              fileName="card-installment"
              card={{
                tool: t('title'),
                label: t('share.label', { amount: won(amount), months, plan: t(`plan.${plan}`) }),
                headline: `${won(result.firstPayment)}${t('result.won')}`,
                sub: result.totalFee > 0 ? t('share.sub', { fee: won(result.totalFee) }) : t('result.lumpSumSame'),
                rows: [
                  ...(plan !== 'free' ? [{ label: t('share.rate'), value: `${rate}%` }] : []),
                  { label: t('result.totalInterest'), value: `${won(result.totalFee)}${t('result.won')}` },
                  { label: t('result.totalPayment'), value: `${won(result.totalPayment)}${t('result.won')}` },
                  { label: t('result.effectiveRate'), value: `${(result.totalFee / amount * 100).toFixed(2)}%` },
                ],
              }}
              text={t('share.text', { amount: won(amount), months, payment: won(result.firstPayment), fee: won(result.totalFee) })}
            />
          )}

          {/* 개월별 비교 */}
          {amount > 0 && plan !== 'free' && (
            <div className="ui-card p-6">
              <h2 className="text-lg font-semibold text-fg mb-1">{t('compare.title', { rate })}</h2>
              <p className="text-xs text-muted mb-4">{t('compare.note')}</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm tabular-nums">
                  <thead>
                    <tr className="border-b border-line text-body">
                      <th className="text-left py-2 px-2 font-semibold">{t('compare.months')}</th>
                      <th className="text-right py-2 px-2 font-semibold">{t('compare.firstPayment')}</th>
                      <th className="text-right py-2 px-2 font-semibold">{t('compare.totalFee')}</th>
                      <th className="text-right py-2 px-2 font-semibold">{t('compare.totalPayment')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.map((c) => (
                      <tr key={c.months} onClick={() => setMonths(c.months)}
                        className={`border-b border-line cursor-pointer hover:bg-subtle ${c.months === months ? 'bg-soft font-semibold' : ''}`}>
                        <td className="py-2 px-2 text-fg">{c.months}{t('months')}</td>
                        <td className="py-2 px-2 text-right text-fg">{won(c.firstPayment)}</td>
                        <td className="py-2 px-2 text-right text-fg">{won(c.totalFee)}</td>
                        <td className="py-2 px-2 text-right text-sub">{won(c.totalPayment)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 회차별 스케줄 */}
          {result && (
            <div className="ui-card p-6">
              <h2 className="text-lg font-semibold text-fg mb-4">{t('schedule.title')}</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm tabular-nums">
                  <thead>
                    <tr className="border-b border-line text-body">
                      <th className="text-left py-2 px-2 font-semibold">{t('schedule.month')}</th>
                      <th className="text-right py-2 px-2 font-semibold">{t('schedule.principal')}</th>
                      <th className="text-right py-2 px-2 font-semibold">{t('schedule.interest')}</th>
                      <th className="text-right py-2 px-2 font-semibold">{t('schedule.payment')}</th>
                      <th className="text-right py-2 px-2 font-semibold">{t('schedule.balance')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.schedule.map((row) => (
                      <tr key={row.month} className="border-b border-line">
                        <td className="py-2 px-2 text-fg">{row.month}</td>
                        <td className="py-2 px-2 text-right text-body">{won(row.principal)}</td>
                        <td className="py-2 px-2 text-right text-body">{won(row.fee)}</td>
                        <td className="py-2 px-2 text-right text-fg font-medium">{won(row.payment)}</td>
                        <td className="py-2 px-2 text-right text-sub">{won(row.balance)}</td>
                      </tr>
                    ))}
                    <tr className="font-semibold">
                      <td className="py-2 px-2 text-fg">{t('schedule.total')}</td>
                      <td className="py-2 px-2 text-right text-fg">{won(amount)}</td>
                      <td className="py-2 px-2 text-right text-fg">{won(result.totalFee)}</td>
                      <td className="py-2 px-2 text-right text-fg">{won(result.totalPayment)}</td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted mt-3">{t('formulaNote')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Guide */}
      <div className="ui-card p-6">
        <h2 className="text-xl font-semibold text-fg mb-6">{t('guide.title')}</h2>
        <div className="space-y-6">
          {(['rates', 'tips'] as const).map((sec) => (
            <div key={sec}>
              <h3 className="text-lg font-semibold text-fg mb-3">{t(`guide.${sec}.title`)}</h3>
              <ul className="list-disc pl-5 space-y-2 text-body">
                {(t.raw(`guide.${sec}.items`) as string[]).map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
