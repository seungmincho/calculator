'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/seasonalFood'
import ShareResult from '@/components/ShareResult'
import { useHydrated } from '@/hooks/useHydrated'
import {
  CATEGORIES, MONTHS, MOF_PICKS, SOURCES, byCategory, foodsInMonth, monthRuns, type Category, type Food,
} from '@/utils/seasonalFood'

type Cat = Category | 'all'
const CATS: Cat[] = ['all', ...CATEGORIES]
const BASE = '/seasonal-food/'

/** month 가 없으면 연중 개요. 정적 HTML 이 날짜에 기대지 않게 '이번 달'은 하이드레이션 뒤에만 표시한다. */
export default function SeasonalFood({ month }: { month?: number }) {
  const t = useTranslations('seasonalFood')
  const hydrated = useHydrated()
  const now = hydrated ? new Date().getMonth() + 1 : null
  const [cat, setCat] = useState<Cat>('all')

  const names = t.raw('monthNames') as string[]
  const mName = (m: number) => names[m - 1]
  const mLabel = (m: number) => t('monthLabel', { m: mName(m) })
  const name = (f: Food) => t(`items.${f.id}.name`)
  const sep = t('range.sep')
  const list = (foods: Food[], n: number) => foods.slice(0, n).map(name).join(sep) + (foods.length > n ? '…' : '')
  const season = (f: Food) => {
    const runs = monthRuns(f.months)
    if (runs[0][0] === 1 && runs[0][1] === 12) return t('range.all')
    const r = runs.map(([a, b]) => (a === b ? t('range.single', { a: mName(a) }) : t('range.span', { a: mName(a), b: mName(b) })))
    return t('range.wrap', { r: r.join(sep) })
  }

  const focus = month ?? now
  const shownCats = cat === 'all' ? CATEGORIES : [cat]
  const inMonth = month ? foodsInMonth(month) : []
  const ofCat = (c: Category, foods = inMonth) => foods.filter((f) => f.category === c)
  const count = (c: Category) => ofCat(c).length
  const top = (n: number) => CATEGORIES.flatMap((c) => ofCat(c).slice(0, n)).map(name).join(sep) + '…'
  const pick = month ? MOF_PICKS[month] : undefined

  const chips = (
    <div role="group" aria-label={t('cat.label')} className="flex flex-wrap gap-2">
      {CATS.map((c) => (
        <button key={c} type="button" aria-pressed={c === cat} onClick={() => setCat(c)}
          className={`min-h-[44px] px-4 rounded-xl text-sm font-medium ${c === cat ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}>
          {t(`cat.${c}`)}
        </button>
      ))}
    </div>
  )

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-fg">{month ? t('titleMonth', { m: mName(month) }) : t('title')}</h1>
          <p className="text-sm text-muted mt-1">
            {month
              ? t('descriptionMonth', { m: mName(month), veg: count('veg'), fruit: count('fruit'), sea: count('seafood') })
              : t('description')}
          </p>
        </div>
        <nav aria-label={t('nav.label')} className="flex flex-wrap gap-2">
          <MonthLink href={BASE} current={!month} label={t('nav.year')} />
          {MONTHS.map((m) => (
            <MonthLink key={m} href={`${BASE}${m}/`} current={m === month} label={mLabel(m)}
              today={m === now ? t('nav.thisMonth') : undefined} />
          ))}
        </nav>
        {!month && now && (
          <Link prefetch={false} href={`${BASE}${now}/`} className="ui-btn inline-flex items-center min-h-[44px] px-4 py-3 text-sm">
            {t('nav.thisMonthLink', { m: mName(now) })}
          </Link>
        )}
      </header>

      {month && (
        <>
          <section id="seasonal-food-result" className="ui-card p-4 sm:p-6 space-y-4 scroll-mt-20">
            <div className="grid grid-cols-3 gap-3">
              {CATEGORIES.map((c) => (
                <div key={c} className="bg-subtle rounded-2xl p-3 sm:p-4">
                  <p className="text-sm text-sub">{t(`cat.${c}`)}</p>
                  <p className="text-fg">
                    <span className="text-3xl font-bold tabular-nums">{count(c)}</span>{' '}
                    <span className="text-sm text-sub">{t('summary.unit')}</span>
                  </p>
                </div>
              ))}
            </div>
            {pick && (
              <p className="text-sm text-sub">
                <span className="font-medium text-body">{t('mofPick.label')}</span> · {t(`mofPick.m${month}`)}
              </p>
            )}
            {chips}
          </section>

          {shownCats.map((c) => {
            const foods = ofCat(c)
            return (
              <section key={c} className="space-y-4" aria-labelledby={`sf-${c}`}>
                <h2 id={`sf-${c}`} className="text-xl font-semibold text-fg">
                  {t(`cat.${c}`)} <span className="text-sub font-medium tabular-nums">{t('summary.count', { n: foods.length })}</span>
                </h2>
                {c === 'seafood' && <p className="bg-subtle rounded-2xl p-5 text-sm text-sub">{t('seafoodTip')}</p>}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {foods.map((f) => (
                    <FoodCard key={f.id} name={name(f)} season={season(f)} t={t} id={f.id}
                      badge={pick && pick.ids.includes(f.id) ? t('card.mofBadge', { year: pick.year }) : undefined} />
                  ))}
                </div>
              </section>
            )
          })}

          <ShareResult
            card={{
              tool: t('share.tool'), label: t('share.label'), headline: t('share.headline', { m: mName(month) }),
              sub: top(2),
              rows: CATEGORIES.map((c) => ({ label: t(`cat.${c}`), value: list(ofCat(c), 4) })),
            }}
            text={t('share.text', { m: mName(month), list: top(3) })}
          />
        </>
      )}

      {!month && (
        <section className="ui-card p-6 space-y-4" aria-labelledby="sf-overview">
          <h2 id="sf-overview" className="text-xl font-semibold text-fg">{t('overview.title')}</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {MONTHS.map((m) => {
              const foods = foodsInMonth(m)
              return (
                <li key={m}>
                  <Link prefetch={false} href={`${BASE}${m}/`}
                    className={`block h-full rounded-2xl p-4 border ${m === now ? 'bg-primary-soft border-primary' : 'bg-subtle border-transparent hover:bg-soft'}`}>
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={`font-semibold ${m === now ? 'text-primary' : 'text-fg'}`}>{mLabel(m)}</span>
                      <span className="text-xs text-muted tabular-nums">{t('overview.count', { n: foods.length })}</span>
                    </span>
                    {CATEGORIES.map((c) => (
                      <span key={c} className="block text-sm text-sub mt-1">
                        <span className="text-muted">{t(`cat.${c}`)}</span> {list(ofCat(c, foods), 3)}
                      </span>
                    ))}
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section className="ui-card p-6 space-y-4" aria-labelledby="sf-calendar">
        <h2 id="sf-calendar" className="text-xl font-semibold text-fg">{t('calendar.title')}</h2>
        {!month && chips}
        <p className="text-xs text-muted sm:hidden">{t('calendar.scrollHint')}</p>
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm border-collapse">
            <caption className="text-left text-xs text-muted pb-2">{t('calendar.caption')}</caption>
            <thead>
              <tr>
                <th scope="col" className="sticky left-0 z-10 bg-surface text-left font-medium text-sub py-2 pr-3">{t('calendar.item')}</th>
                {MONTHS.map((m) => (
                  <th key={m} scope="col" className={`py-2 px-0.5 text-xs font-medium text-center ${m === focus ? 'bg-primary-soft text-primary' : 'text-sub'}`}>
                    {mLabel(m)}
                  </th>
                ))}
              </tr>
            </thead>
            {shownCats.map((c) => (
              <tbody key={c}>
                <tr>
                  <th scope="colgroup" colSpan={13} className="sticky left-0 bg-surface text-left text-xs font-semibold text-muted pt-4 pb-1">{t(`cat.${c}`)}</th>
                </tr>
                {byCategory(c).map((f) => (
                  <tr key={f.id} className="border-t border-line">
                    <th scope="row" className="sticky left-0 z-10 bg-surface text-left font-medium text-body py-1.5 pr-3 whitespace-nowrap">{name(f)}</th>
                    {MONTHS.map((m) => (
                      <td key={m} className={`px-0.5 py-1.5 ${m === focus ? 'bg-primary-soft' : ''}`}>
                        {f.months.includes(m) && (
                          <span className="block h-2.5 rounded-full bg-primary"><span className="sr-only">{t('calendar.inSeason', { m: mLabel(m) })}</span></span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      </section>

      <section className="ui-card p-6 space-y-6" aria-labelledby="sf-guide">
        <h2 id="sf-guide" className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(['why', 'house', 'shopping', 'method'] as const).map((sec) => (
            <div key={sec}>
              <h3 className="font-semibold text-fg mb-3">{t(`guide.${sec}.title`)}</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-sub">
                {(t.raw(`guide.${sec}.items`) as string[]).map((s) => <li key={s}>{s}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <div>
          <h3 className="font-semibold text-fg mb-2">{t('guide.closed.title')}</h3>
          <p className="text-sm text-sub mb-3">{t('guide.closed.intro')}</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-body">
            {(t.raw('guide.closed.items') as string[]).map((s) => <li key={s}>{s}</li>)}
          </ul>
          <p className="text-xs text-muted mt-3">{t('guide.closed.note')}</p>
        </div>
        <div>
          <h3 className="font-semibold text-fg mb-3">{t('guide.links.title')}</h3>
          <ul className="space-y-1 text-sm">
            {([['kimjangCalculator', '/kimjang-calculator/'], ['kimjangTiming', '/kimjang-timing/'], ['nutrition', '/nutrition-calculator/']] as const).map(([k, href]) => (
              <li key={k}><Link prefetch={false} href={href} className="inline-flex items-center min-h-[44px] text-primary hover:underline">{t(`guide.links.${k}`)}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-fg mb-3">{t('guide.faq.title')}</h3>
          <div className="divide-y divide-line border-y border-line">
            {(t.raw('guide.faq.items') as { q: string; a: string }[]).map((f) => (
              <details key={f.q} className="py-3">
                <summary className="cursor-pointer text-sm font-medium text-body min-h-[44px] flex items-center">{f.q}</summary>
                <p className="text-sm text-sub mt-2 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
        <div className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-2">
          <p className="font-medium text-body">{t('guide.sources.title')}</p>
          <ul className="space-y-1">
            {SOURCES.map(([k, url]) => (
              <li key={k}>
                <a href={month && k.startsWith('nongsaro') ? `${url}&month=${month}` : url} target="_blank" rel="noopener noreferrer"
                  className="text-primary hover:underline">{t(`guide.sources.items.${k}`)}</a>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">{t('guide.sources.asOf')}</p>
        </div>
      </section>
    </div>
  )
}

function MonthLink({ href, current, label, today }: { href: string; current: boolean; label: string; today?: string }) {
  return (
    <Link prefetch={false} href={href} aria-current={current ? 'page' : undefined}
      className={`inline-flex items-center justify-center min-h-[44px] min-w-[44px] px-3 rounded-xl text-sm font-medium border ${
        current ? 'bg-primary text-white border-primary' : today ? 'bg-soft text-primary border-primary' : 'bg-soft text-body border-transparent hover:bg-subtle'}`}>
      {label}
      {today && <span className="sr-only"> ({today})</span>}
    </Link>
  )
}

function FoodCard({ id, name, season, badge, t }: {
  id: string; name: string; season: string; badge?: string; t: ReturnType<typeof useTranslations>
}) {
  const opt = (k: 'pick' | 'keep') => t.raw(`items.${id}.${k}`) as string | undefined
  const rows: [string, string | undefined][] = [
    [t('card.season'), season], [t('card.pick'), opt('pick')], [t('card.keep'), opt('keep')], [t('card.dish'), t(`items.${id}.dish`)],
  ]
  return (
    <article className="ui-card p-5 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-semibold text-fg">{name}</h3>
        {badge && <span className="bg-primary-soft text-primary text-xs font-medium rounded-full px-2 py-0.5">{badge}</span>}
      </div>
      <dl className="grid grid-cols-[5rem_1fr] gap-x-3 gap-y-1.5 text-sm">
        {rows.filter(([, v]) => v).map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted">{k}</dt>
            <dd className={k === rows[0][0] ? 'font-medium text-fg' : 'text-body'}>{v}</dd>
          </div>
        ))}
      </dl>
    </article>
  )
}
