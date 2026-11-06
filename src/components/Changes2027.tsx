'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/changes2027'
import ShareResult from '@/components/ShareResult'
import { MIN_WAGE_BY_YEAR } from '@/utils/minimumWage'
import { INSURANCE_BY_YEAR, pct } from '@/utils/insuranceRates'
import { MEDIAN_INCOME } from '@/utils/medianIncome'
import { DAILY_CAP, FLOOR_RATE } from '@/utils/unemploymentBenefit'
import { allowanceUnderAge } from '@/utils/childBenefit'
import { fourInsurance } from '@/utils/fourInsurance'
import { calculateNetSalary } from '@/utils/netSalary'

type Category = 'pay' | 'labor' | 'welfare'
interface Item { id: string; date: string; cat: Category; pending?: boolean; href: string; src: string }
// 시행일 순. 숫자는 각 utils(단일 출처)에서 계산해 문구에 끼운다. 출처 문구는 messages changes2027.items.<id>.source
const ITEMS: Item[] = [
  { id: 'breakWaiver', date: '2026-12-10', cat: 'labor', href: '/work-hours-calculator/', src: 'https://www.law.go.kr/법령/근로기준법' },
  { id: 'minWage', date: '2027-01-01', cat: 'pay', href: '/minimum-wage/', src: 'https://www.moel.go.kr/news/enews/report/enewsView.do?news_seq=19744' },
  { id: 'pension', date: '2027-01-01', cat: 'pay', href: '/four-insurance/', src: 'https://www.law.go.kr/법령/국민연금법' },
  { id: 'longTermCare', date: '2027-01-01', cat: 'pay', href: '/four-insurance/', src: 'https://www.newspim.com/news/view/20261030001234' },
  { id: 'health', date: '2027-01-01', cat: 'pay', href: '/health-insurance/', src: 'https://kbmaeil.com/article/20260908500530' },
  { id: 'eiRate', date: '2027-01-01', cat: 'pay', pending: true, href: '/four-insurance/', src: 'https://m.news.nate.com/view/20260901n33015' },
  { id: 'eiBasis', date: '2027-01-01', cat: 'labor', href: '/weekly-holiday-pay/', src: 'https://www.law.go.kr/법령/고용보험법' },
  { id: 'unemploymentFloor', date: '2027-01-01', cat: 'labor', href: '/unemployment-benefit/', src: 'https://www.law.go.kr/법령/고용보험법' },
  { id: 'median', date: '2027-01-01', cat: 'welfare', href: '/median-income/', src: 'https://mohw.go.kr/board.es?act=view&bid=0027&list_no=1491453&mid=a10503010100' },
  { id: 'livelihood', date: '2027-01-01', cat: 'welfare', href: '/median-income/', src: 'https://www.korea.kr/news/policyNewsView.do?newsId=148968956' },
  { id: 'childAllowance', date: '2027-01-01', cat: 'welfare', href: '/child-benefit/', src: 'https://www.bokjiro.go.kr/ssis-tbu/cms/pc/news/news/1309692_1114.html' },
  { id: 'hourlyLeave', date: '2027-06-10', cat: 'labor', href: '/annual-leave/', src: 'https://www.law.go.kr/법령/근로기준법' },
  { id: 'pensionCap', date: '2027-07-01', cat: 'pay', pending: true, href: '/national-pension/', src: 'https://www.korea.kr/news/policyNewsView.do?newsId=148957832' },
]
const CATS = ['all', 'pay', 'labor', 'welfare'] as const
const fmt = (n: number) => Math.round(n).toLocaleString('ko-KR')
const chip = (on: boolean) => `min-h-[44px] px-3.5 rounded-xl text-sm font-medium ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`

export default function Changes2027() {
  const t = useTranslations('changes2027')
  const [cat, setCat] = useState<(typeof CATS)[number]>('all')
  const [y26, y27] = [INSURANCE_BY_YEAR[2026], INSURANCE_BY_YEAR[2027]]
  const wage26 = MIN_WAGE_BY_YEAR[2026], wage27 = MIN_WAGE_BY_YEAR[2027]
  const median26 = MEDIAN_INCOME['2026'], median27 = MEDIAN_INCOME['2027']
  // 월급 300만원(식대 20만원) 근로자 4대보험, 연봉 5,000만원 실수령액의 2026→2027 차이
  const ins = fourInsurance(2_800_000, 2027, 'under150', 0)!.employee - fourInsurance(2_800_000, 2026, 'under150', 0)!.employee
  const net = calculateNetSalary(50_000_000, { year: 2026 })!.netMonthly - calculateNetSalary(50_000_000, { year: 2027 })!.netMonthly
  const params: Record<string, Record<string, string | number>> = {
    minWage: { wage: fmt(wage27), monthly: fmt(wage27 * 209), diff: fmt(wage27 - wage26), pct: ((wage27 / wage26 - 1) * 100).toFixed(1) },
    pension: { from: pct(y26.pensionRateTotal), to: pct(y27.pensionRateTotal), half: pct(y27.pensionRate) },
    longTermCare: { from: pct(y26.longTermCareRate), to: pct(y27.longTermCareRate), income: pct(y27.healthRateTotal * y27.longTermCareRate, 4) },
    health: { rate: pct(y27.healthRateTotal), half: pct(y27.healthRate) },
    eiRate: { from: pct(y27.employmentRate * 2), to: pct((y27.employmentProposed ?? y27.employmentRate) * 2) },
    unemploymentFloor: { floor: fmt(wage27 * FLOOR_RATE * 8), cap: fmt(DAILY_CAP) },
    median: { four: fmt(median27[3]), one: fmt(median27[0]), pct: ((median27[3] / median26[3] - 1) * 100).toFixed(2) },
    livelihood: { one: fmt(Math.floor(median27[0] * 0.32)), four: fmt(Math.floor(median27[3] * 0.32)) },
    childAllowance: { from: allowanceUnderAge(2026), to: allowanceUnderAge(2027) },
  }
  const shown = ITEMS.filter((i) => cat === 'all' || i.cat === cat)
  const dates = [...new Set(shown.map((i) => i.date))]
  const dateText = (d: string) => t('date', { y: Number(d.slice(0, 4)), m: Number(d.slice(5, 7)), d: Number(d.slice(8)) })
  const faq = t.raw('faq.items') as { q: string; a: string }[]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle')}</p>
      </div>

      <div id="changes-2027-summary" className="ui-card p-6 space-y-4">
        <p className="text-sm text-sub">{t('summary.label')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div><p className="text-xs text-muted">{t('summary.minWage')}</p><p className="text-3xl font-bold text-fg tabular-nums">{t('won', { n: fmt(wage27) })}</p></div>
          <div><p className="text-xs text-muted">{t('summary.insurance')}</p><p className="text-2xl font-bold text-fg tabular-nums sm:mt-1">{t('plusWon', { n: fmt(ins) })}</p></div>
          <div><p className="text-xs text-muted">{t('summary.net')}</p><p className="text-2xl font-bold text-fg tabular-nums sm:mt-1">{t('minusWon', { n: fmt(net) })}</p></div>
        </div>
        <p className="text-xs text-muted">{t('summary.note')}</p>
        <ShareResult
          card={{ tool: t('title'), label: t('summary.label'), headline: t('won', { n: fmt(wage27) }), sub: t('summary.minWage'), rows: [{ label: t('summary.insurance'), value: t('plusWon', { n: fmt(ins) }) }, { label: t('summary.net'), value: t('minusWon', { n: fmt(net) }) }] }}
          text={t('share', { wage: fmt(wage27), ins: fmt(ins) })}
        />
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('filterLabel')}>
          {CATS.map((c) => <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)} className={chip(cat === c)}>{t(`cats.${c}`)}</button>)}
        </div>
        {dates.map((d) => (
          <section key={d} aria-labelledby={`changes-${d}`} className="space-y-3">
            <h2 id={`changes-${d}`} className="text-lg font-semibold text-fg pt-2">{dateText(d)}</h2>
            {shown.filter((i) => i.date === d).map((i) => (
              <article key={i.id} className="ui-card p-5 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-soft text-sub">{t(`cats.${i.cat}`)}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${i.pending ? 'bg-soft text-sub' : 'bg-primary-soft text-primary'}`}>{t(i.pending ? 'pending' : 'confirmed')}</span>
                </div>
                <h3 className="font-semibold text-fg">{t(`items.${i.id}.title`, params[i.id] ?? {})}</h3>
                <p className="text-sm text-body leading-relaxed">{t(`items.${i.id}.body`, params[i.id] ?? {})}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
                  <Link href={i.href} className="text-sm text-primary font-medium hover:underline min-h-[44px] inline-flex items-center">{t(`items.${i.id}.link`)} →</Link>
                  <a href={i.src} target="_blank" rel="noopener noreferrer" className="text-xs text-muted hover:underline">{t('sourcePrefix')} {t(`items.${i.id}.source`)}</a>
                </div>
              </article>
            ))}
          </section>
        ))}
      </div>

      <div className="ui-card p-6 space-y-4">
        <h2 className="text-xl font-semibold text-fg">{t('faq.title')}</h2>
        <div className="divide-y divide-line border-y border-line">
          {faq.map((f) => (
            <details key={f.q} className="py-3">
              <summary className="cursor-pointer text-sm font-medium text-body min-h-[24px]">{f.q}</summary>
              <p className="text-sm text-sub mt-2 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
        <p className="text-xs text-muted">{t('asOf')}</p>
      </div>
    </div>
  )
}
