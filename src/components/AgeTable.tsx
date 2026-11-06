'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/ageTable'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useHydrated } from '@/hooks/useHydrated'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import { ZODIAC_KEYS } from '@/utils/age'
import { FIRST_YEAR, ageRows, seollalOf, yearInfo, type AgeRow } from '@/utils/ageTable'

const DEFAULT_YEAR = 1990
const dayBefore = (ymd: string) => new Date(Date.parse(`${ymd}T00:00:00Z`) - 86400000).toISOString().slice(0, 10)

/** `base` = 올해(KST, 빌드 시점). 표는 올해와 내년 나이를 함께 보여 준다. */
export default function AgeTable({ base }: { base: number }) {
  const t = useTranslations('ageTable')
  const next = base + 1
  const rows = ageRows(base)
  const sp = useSearchParams()
  // The static HTML highlights the default year; a shared year is read after hydration.
  const urlYear = Number(useHydrated() ? sp.get('year') : NaN)
  const [picked, setPicked] = useState<number | null>(null)
  const year = picked ?? (Number.isInteger(urlYear) && urlYear >= FIRST_YEAR && urlYear <= next ? urlYear : DEFAULT_YEAR)
  const sel = rows.find((r) => r.year === year)!
  const choose = (y: number) => { setPicked(y); history.replaceState(null, '', `?year=${y}`) }

  const animal = (r: Pick<AgeRow, 'zodiac'>) => t(`zodiac.${r.zodiac}`)
  const zodiacName = (r: Pick<AgeRow, 'zodiac' | 'color'>) => t('zodiacName', { color: t(`colors.${r.color}`), animal: animal(r) })
  const md = (ymd: string) => t('md', { m: Number(ymd.slice(5, 7)), d: Number(ymd.slice(8)) })
  const nextInfo = yearInfo(next)
  const seollal = seollalOf(year)
  const prev = yearInfo(year - 1)
  // Groups start from next year's animal so the coming year's sign comes first.
  const start = ZODIAC_KEYS.indexOf(nextInfo.zodiac)
  const order = ZODIAC_KEYS.map((_, i) => ZODIAC_KEYS[(start + i) % 12])
  const headline = t('ageValue', { n: sel.manNext ?? 0 })
  const faq = t.raw('guide.faq.items') as { q: string; a: string }[]
  const sources = t.raw('guide.sources.items') as { label: string; url: string }[]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title', { base, next })}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle')}</p>
      </div>

      <div className="bg-subtle rounded-2xl p-5 text-sm text-body">
        {t('nextYear', { next, ganzi: nextInfo.ganzi, name: zodiacName(nextInfo) })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="ui-card p-6 space-y-4">
            <MobileResultLink href="#age-table-result" label={t('resultLabel', { year, next })} value={headline} />
            <label htmlFor="age-table-year" className="block text-sm font-medium text-body">{t('pickLabel')}</label>
            <select id="age-table-year" value={year} onChange={(e) => choose(Number(e.target.value))} className="ui-field w-full px-4 py-3 min-h-[44px]">
              {rows.map((r) => <option key={r.year} value={r.year}>{t('yearOption', { year: r.year, animal: animal(r) })}</option>)}
            </select>
            <p className="text-xs text-muted">{t('pickHint')}</p>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div id="age-table-result" className="ui-card p-6 space-y-5 scroll-mt-20" aria-live="polite">
            <p className="text-sm text-sub">{t('resultLabel', { year, next })}</p>
            <p className="text-3xl font-bold text-fg tabular-nums">{headline}</p>
            <p className="text-sm text-sub">{t('beforeBirthday', { n: Math.max(0, (sel.manNext ?? 0) - 1) })}</p>
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div><dt className="text-sm text-muted">{t('stats.zodiac')}</dt><dd className="mt-1 font-semibold text-fg">{t('zodiacLine', { ganzi: sel.ganzi, name: zodiacName(sel) })}</dd></div>
              <div><dt className="text-sm text-muted">{t('stats.manBase', { base })}</dt><dd className="mt-1 font-semibold text-fg tabular-nums">{sel.manBase == null ? '—' : t('ageValue', { n: sel.manBase })}</dd></div>
              <div><dt className="text-sm text-muted">{t('stats.yeon', { next })}</dt><dd className="mt-1 font-semibold text-fg tabular-nums">{t('ageValue', { n: sel.yeonNext })}</dd></div>
              <div><dt className="text-sm text-muted">{t('stats.school')}</dt><dd className="mt-1 font-semibold text-fg tabular-nums">{t('yearValue', { year: sel.school })}</dd></div>
            </dl>
            <ul className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-2 list-disc pl-9">
              {seollal && <li>{t('seollalNote', { year, until: md(dayBefore(seollal)), prev: zodiacName(prev) })}</li>}
              {year <= 2002 && <li>{t('earlyNote', { year: sel.school - 1 })}</li>}
              <li>{t('countingNote', { n: sel.yeonNext + 1 })}</li>
            </ul>
            <div className="flex flex-wrap gap-2">
              <Link href="/age-calculator/" className="ui-btn px-4 py-3 text-sm inline-flex items-center min-h-[44px]">{t('toAgeCalculator')}</Link>
              <Link href="/lunar-converter/" className="ui-btn-soft px-4 py-2 text-sm inline-flex items-center min-h-[44px]">{t('toLunar')}</Link>
            </div>
            <ShareResult
              card={{ tool: t('title', { base, next }), label: t('resultLabel', { year, next }), headline, sub: t('zodiacLine', { ganzi: sel.ganzi, name: zodiacName(sel) }), rows: [{ label: t('stats.school'), value: t('yearValue', { year: sel.school }) }] }}
              text={t('share', { year, next, age: headline, name: zodiacName(sel) })}
            />
          </div>
        </div>
      </div>

      <div className="ui-card p-6 space-y-4">
        <h2 className="text-xl font-semibold text-fg">{t('tableTitle', { next })}</h2>
        <p className="text-sm text-sub">{t('tableNote')}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <caption className="sr-only">{t('tableTitle', { next })}</caption>
            <thead>
              <tr className="text-left text-muted border-b border-line">
                <th scope="col" className="py-2 pr-3 font-medium">{t('cols.year')}</th>
                <th scope="col" className="py-2 pr-3 font-medium">{t('cols.zodiac')}</th>
                <th scope="col" className="py-2 pr-3 font-medium text-right">{t('cols.manNext', { next })}</th>
                <th scope="col" className="py-2 pr-3 font-medium text-right">{t('cols.manBase', { base })}</th>
                <th scope="col" className="py-2 pr-3 font-medium text-right">{t('cols.yeon', { next })}</th>
                <th scope="col" className="py-2 font-medium text-right">{t('cols.school')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => {
                const on = r.year === year
                return (
                  <tr key={r.year} className={on ? 'bg-primary-soft' : ''}>
                    <th scope="row" className="pr-3 text-left font-normal">
                      <button type="button" aria-pressed={on} onClick={() => choose(r.year)} className={`min-h-[44px] text-left ${on ? 'text-primary font-semibold' : 'text-body'}`}>{t('yearValue', { year: r.year })}</button>
                    </th>
                    <td className="pr-3 text-sub">{t('zodiacLine', { ganzi: r.ganzi, name: zodiacName(r) })}</td>
                    <td className="pr-3 text-right text-fg tabular-nums font-medium">{t('ageValue', { n: r.manNext ?? 0 })}</td>
                    <td className="pr-3 text-right text-sub tabular-nums">{r.manBase == null ? '—' : t('ageValue', { n: r.manBase })}</td>
                    <td className="pr-3 text-right text-sub tabular-nums">{t('ageValue', { n: r.yeonNext })}</td>
                    <td className="text-right text-sub tabular-nums">{t('yearValue', { year: r.school })}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="ui-card p-6 space-y-4">
        <h2 className="text-xl font-semibold text-fg">{t('groupsTitle', { next })}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {order.map((k) => {
            const ys = rows.filter((r) => r.zodiac === k)
            return (
              <section key={k} className={`rounded-2xl p-4 ${k === nextInfo.zodiac ? 'bg-primary-soft' : 'bg-subtle'}`} aria-labelledby={`zodiac-${k}`}>
                <h3 id={`zodiac-${k}`} className={`font-semibold mb-2 ${k === nextInfo.zodiac ? 'text-primary' : 'text-fg'}`}>{t('groupTitle', { animal: t(`zodiac.${k}`) })}</h3>
                <p className="text-sm text-sub leading-relaxed">{ys.map((r) => t('groupItem', { year: r.year, n: r.manNext ?? 0 })).join(' · ')}</p>
              </section>
            )
          })}
        </div>
      </div>

      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(['ages', 'zodiac', 'school'] as const).map((sec) => (
            <div key={sec}>
              <h3 className="font-semibold text-fg mb-3">{t(`guide.${sec}.title`)}</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-sub">
                {(t.raw(`guide.${sec}.items`) as string[]).map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <div>
          <h3 className="font-semibold text-fg mb-3">{t('guide.faq.title')}</h3>
          <div className="divide-y divide-line border-y border-line">
            {faq.map((f) => (
              <details key={f.q} className="py-3">
                <summary className="cursor-pointer text-sm font-medium text-body min-h-[24px]">{f.q}</summary>
                <p className="text-sm text-sub mt-2 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
        <div className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-2">
          <p className="font-medium text-body">{t('guide.sources.title')}</p>
          <ul className="space-y-1">
            {sources.map((s) => (
              <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{s.label}</a></li>
            ))}
          </ul>
          <p className="text-xs text-muted">{t('guide.sources.asOf')}</p>
        </div>
      </div>
    </div>
  )
}
