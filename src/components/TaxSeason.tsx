'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import {
  Calculator,
  Clock,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Building2,
  Briefcase,
  TrendingUp,
  Home,
  DollarSign,
  ArrowRight,
  Lightbulb,
  Calendar,
  FileText,
  Shield,
  PiggyBank,
  BarChart3,
} from 'lucide-react'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'
import GuideSection from '@/components/GuideSection'

function useCountdown(targetDate: Date) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const calc = () => {
      const now = new Date()
      const diff = targetDate.getTime() - now.getTime()
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
        return
      }
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      })
    }
    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [targetDate])

  return timeLeft
}

const TAX_RATES = [
  { range: '1,400만원 이하', rate: '6%', deduction: '0원' },
  { range: '1,400만 ~ 5,000만원', rate: '15%', deduction: '126만원' },
  { range: '5,000만 ~ 8,800만원', rate: '24%', deduction: '576만원' },
  { range: '8,800만 ~ 1.5억원', rate: '35%', deduction: '1,544만원' },
  { range: '1.5억 ~ 3억원', rate: '38%', deduction: '1,994만원' },
  { range: '3억 ~ 5억원', rate: '40%', deduction: '2,594만원' },
  { range: '5억 ~ 10억원', rate: '42%', deduction: '3,594만원' },
  { range: '10억원 초과', rate: '45%', deduction: '6,594만원' },
]

const RELATED_TOOLS = [
  {
    href: '/income-tax',
    icon: '🧾',
    titleKey: 'tools.incomeTax.title',
    descKey: 'tools.incomeTax.desc',
  },
  {
    href: '/year-end-tax',
    icon: '📋',
    titleKey: 'tools.yearEndTax.title',
    descKey: 'tools.yearEndTax.desc',
  },
  {
    href: '/freelancer-tax',
    icon: '💻',
    titleKey: 'tools.freelancerTax.title',
    descKey: 'tools.freelancerTax.desc',
  },
  {
    href: '/acquisition-tax',
    icon: '🏠',
    titleKey: 'tools.acquisitionTax.title',
    descKey: 'tools.acquisitionTax.desc',
  },
  {
    href: '/capital-gains-tax',
    icon: '📈',
    titleKey: 'tools.capitalGainsTax.title',
    descKey: 'tools.capitalGainsTax.desc',
  },
  {
    href: '/tax-calculator',
    icon: '🔢',
    titleKey: 'tools.taxCalculator.title',
    descKey: 'tools.taxCalculator.desc',
  },
]

export default function TaxSeason() {
  const t = useTranslations('taxSeason')

  // Deadline: May 31 of current year. If past, use next year.
  const now = new Date()
  const year = now.getMonth() >= 5 ? now.getFullYear() + 1 : now.getFullYear()
  const deadline = new Date(year, 4, 31, 23, 59, 59)
  const countdown = useCountdown(deadline)

  const isPast = deadline.getTime() <= now.getTime()

  return (
    <div className="space-y-10">
      <Breadcrumb />

      {/* ── Section 1: Hero ── */}
      <section className="text-center space-y-6">
        <div className="inline-flex items-center gap-2 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 px-4 py-1.5 rounded-full text-sm font-medium">
          <Calendar className="w-4 h-4" />
          {t('hero.badge')}
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white leading-tight">
          {t('hero.title')}
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          {t('hero.subtitle')}
        </p>

        {/* Countdown */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 max-w-lg mx-auto">
          {isPast ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm">{t('hero.deadlinePast')}</p>
          ) : (
            <>
              <p className="text-sm font-medium text-orange-600 dark:text-orange-400 mb-3">
                {t('hero.deadlineLabel')}
              </p>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { value: countdown.days, label: t('hero.days') },
                  { value: countdown.hours, label: t('hero.hours') },
                  { value: countdown.minutes, label: t('hero.minutes') },
                  { value: countdown.seconds, label: t('hero.seconds') },
                ].map(({ value, label }) => (
                  <div
                    key={label}
                    className="bg-orange-50 dark:bg-orange-900/30 rounded-xl p-3 text-center"
                  >
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400 tabular-nums">
                      {String(value).padStart(2, '0')}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
                {t('hero.deadlineNote')}
              </p>
            </>
          )}
        </div>

        {/* Quick CTA */}
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/income-tax"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-xl font-medium hover:from-orange-600 hover:to-red-600 transition-all shadow-md hover:shadow-lg"
          >
            <Calculator className="w-4 h-4" />
            {t('hero.ctaPrimary')}
          </Link>
          <Link
            href="/freelancer-tax"
            className="inline-flex items-center gap-2 bg-white dark:bg-gray-800 text-orange-600 dark:text-orange-400 border border-orange-300 dark:border-orange-700 px-6 py-3 rounded-xl font-medium hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all"
          >
            <Briefcase className="w-4 h-4" />
            {t('hero.ctaSecondary')}
          </Link>
        </div>
      </section>

      {/* ── Section 2: 신고 대상 ── */}
      <section id="who" className="space-y-5">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('targets.title')}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            {t('targets.subtitle')}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {(
            [
              {
                icon: <Briefcase className="w-6 h-6" />,
                color: 'blue',
                titleKey: 'targets.freelancer.title',
                descKey: 'targets.freelancer.desc',
              },
              {
                icon: <Building2 className="w-6 h-6" />,
                color: 'purple',
                titleKey: 'targets.employee.title',
                descKey: 'targets.employee.desc',
              },
              {
                icon: <Home className="w-6 h-6" />,
                color: 'green',
                titleKey: 'targets.rental.title',
                descKey: 'targets.rental.desc',
              },
              {
                icon: <TrendingUp className="w-6 h-6" />,
                color: 'amber',
                titleKey: 'targets.financial.title',
                descKey: 'targets.financial.desc',
              },
            ] as const
          ).map(({ icon, color, titleKey, descKey }) => {
            const colorMap = {
              blue: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
              purple:
                'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800',
              green:
                'bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800',
              amber:
                'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
            }
            return (
              <div
                key={titleKey}
                className={`rounded-xl border p-5 ${colorMap[color]}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">{icon}</div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-base mb-1">
                      {t(titleKey)}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{t(descKey)}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-500 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <strong className="text-green-700 dark:text-green-400">{t('targets.exempt.label')}</strong>{' '}
            {t('targets.exempt.desc')}
          </p>
        </div>
      </section>

      {/* ── Section 3: 관련 도구 모음 ── */}
      <section id="tools" className="space-y-5">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('toolBundle.title')}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            {t('toolBundle.subtitle')}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {RELATED_TOOLS.map(({ href, icon, titleKey, descKey }) => (
            <Link
              key={href}
              href={href}
              className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:border-orange-400 dark:hover:border-orange-500 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{icon}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                      {t(titleKey)}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                      {t(descKey)}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-orange-500 flex-shrink-0 mt-0.5 transition-colors" />
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                <span className="text-xs font-medium text-orange-500 dark:text-orange-400 group-hover:underline">
                  {t('toolBundle.cta')}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Section 4: 세율표 ── */}
      <section id="rates" className="space-y-5">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('taxRates.title')}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            {t('taxRates.subtitle')}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-orange-50 dark:bg-orange-900/30 border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left px-5 py-3 font-semibold text-gray-700 dark:text-gray-300">
                    {t('taxRates.colRange')}
                  </th>
                  <th className="text-center px-5 py-3 font-semibold text-gray-700 dark:text-gray-300">
                    {t('taxRates.colRate')}
                  </th>
                  <th className="text-right px-5 py-3 font-semibold text-gray-700 dark:text-gray-300">
                    {t('taxRates.colDeduction')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {TAX_RATES.map(({ range, rate, deduction }, i) => {
                  const rateNum = parseInt(rate)
                  const highlight = rateNum >= 35
                  return (
                    <tr
                      key={range}
                      className={`border-b border-gray-100 dark:border-gray-700 last:border-0 transition-colors hover:bg-orange-50/50 dark:hover:bg-orange-900/10 ${
                        i % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-gray-750/20'
                      }`}
                    >
                      <td className="px-5 py-3 text-gray-700 dark:text-gray-300">{range}</td>
                      <td className="px-5 py-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-xs ${
                            highlight
                              ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                              : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                          }`}
                        >
                          {rate}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right text-gray-500 dark:text-gray-400">
                        {deduction}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 bg-gray-50 dark:bg-gray-750/30 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {t('taxRates.note')}
            </p>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <strong className="text-blue-700 dark:text-blue-300">{t('taxRates.exampleLabel')}</strong>{' '}
            {t('taxRates.exampleText')}
          </p>
        </div>
      </section>

      {/* ── Section 5: 절세 팁 ── */}
      <section id="tips" className="space-y-5">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('tips.title')}</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">{t('tips.subtitle')}</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {(
            [
              {
                icon: <PiggyBank className="w-5 h-5" />,
                color: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
                titleKey: 'tips.t1.title',
                descKey: 'tips.t1.desc',
              },
              {
                icon: <FileText className="w-5 h-5" />,
                color: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
                titleKey: 'tips.t2.title',
                descKey: 'tips.t2.desc',
              },
              {
                icon: <BarChart3 className="w-5 h-5" />,
                color: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
                titleKey: 'tips.t3.title',
                descKey: 'tips.t3.desc',
              },
              {
                icon: <Shield className="w-5 h-5" />,
                color: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
                titleKey: 'tips.t4.title',
                descKey: 'tips.t4.desc',
              },
              {
                icon: <DollarSign className="w-5 h-5" />,
                color: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
                titleKey: 'tips.t5.title',
                descKey: 'tips.t5.desc',
              },
              {
                icon: <Lightbulb className="w-5 h-5" />,
                color: 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300',
                titleKey: 'tips.t6.title',
                descKey: 'tips.t6.desc',
              },
            ] as const
          ).map(({ icon, color, titleKey, descKey }) => (
            <div
              key={titleKey}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5"
            >
              <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 rounded-lg p-2 ${color}`}>{icon}</div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                    {t(titleKey)}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    {t(descKey)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section 6: 신고 일정 Timeline ── */}
      <section id="step1" className="space-y-5">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('timeline.title')}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            {t('timeline.subtitle')}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <ol className="relative border-l-2 border-orange-200 dark:border-orange-800 space-y-8 ml-3">
            {(
              [
                {
                  dateKey: 'timeline.e1.date',
                  titleKey: 'timeline.e1.title',
                  descKey: 'timeline.e1.desc',
                  color: 'bg-green-500',
                },
                {
                  dateKey: 'timeline.e2.date',
                  titleKey: 'timeline.e2.title',
                  descKey: 'timeline.e2.desc',
                  color: 'bg-orange-500',
                },
                {
                  dateKey: 'timeline.e3.date',
                  titleKey: 'timeline.e3.title',
                  descKey: 'timeline.e3.desc',
                  color: 'bg-red-500',
                },
                {
                  dateKey: 'timeline.e4.date',
                  titleKey: 'timeline.e4.title',
                  descKey: 'timeline.e4.desc',
                  color: 'bg-blue-500',
                },
                {
                  dateKey: 'timeline.e5.date',
                  titleKey: 'timeline.e5.title',
                  descKey: 'timeline.e5.desc',
                  color: 'bg-purple-500',
                },
              ] as const
            ).map(({ dateKey, titleKey, descKey, color }) => (
              <li key={titleKey} className="ml-5">
                <span
                  className={`absolute -left-[9px] flex items-center justify-center w-4 h-4 rounded-full ${color} ring-2 ring-white dark:ring-gray-800`}
                />
                <div className="flex flex-col sm:flex-row sm:items-start sm:gap-4">
                  <span className="inline-block text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/40 px-2.5 py-1 rounded-full whitespace-nowrap mb-1 sm:mb-0 sm:mt-0.5">
                    {t(dateKey)}
                  </span>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                      {t(titleKey)}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                      {t(descKey)}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl p-4 flex items-start gap-3">
          <Clock className="w-5 h-5 text-orange-500 dark:text-orange-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <strong className="text-orange-700 dark:text-orange-400">{t('timeline.penaltyLabel')}</strong>{' '}
            {t('timeline.penaltyDesc')}
          </p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="space-y-5">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('faq.title')}</h2>
        <div className="space-y-3">
          {(
            [
              { qKey: 'faq.q1.q', aKey: 'faq.q1.a' },
              { qKey: 'faq.q2.q', aKey: 'faq.q2.a' },
              { qKey: 'faq.q3.q', aKey: 'faq.q3.a' },
              { qKey: 'faq.q4.q', aKey: 'faq.q4.a' },
              { qKey: 'faq.q5.q', aKey: 'faq.q5.a' },
            ] as const
          ).map(({ qKey, aKey }) => (
            <details
              key={qKey}
              className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <summary className="flex items-center justify-between cursor-pointer px-5 py-4 font-medium text-gray-900 dark:text-white text-sm hover:bg-gray-50 dark:hover:bg-gray-750/30 transition-colors list-none">
                <span className="flex items-center gap-2">
                  <span className="text-orange-500 font-bold">Q.</span>
                  {t(qKey)}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-400 group-open:rotate-90 transition-transform flex-shrink-0 ml-2" />
              </summary>
              <div className="px-5 pb-4 pt-1 text-sm text-gray-600 dark:text-gray-300 leading-relaxed border-t border-gray-100 dark:border-gray-700">
                <span className="text-orange-500 font-bold mr-1.5">A.</span>
                {t(aKey)}
              </div>
            </details>
          ))}
        </div>
      </section>

      <GuideSection namespace="taxSeason" />

      <RelatedTools />
    </div>
  )
}
