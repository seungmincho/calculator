'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { ExternalLink, Star } from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/csatDiscounts'
import { useSearchParams } from '@/hooks/useSearchParams'
import ShareResult from '@/components/ShareResult'
import { todayKST, weekday } from '@/utils/dday'
import { CATS, CHECKED, DISCOUNTS, daysLeft, isCat, sortDiscounts, statusOf, type Cat, type Discount, type Status } from '@/utils/csatDiscounts'

const FAV_KEY = 'toolhub-csat-discounts-fav-v1'
const IDS = new Set(DISCOUNTS.map((d) => d.id))
// 행사가 있는 분류만 칩으로
const CHIPS: (Cat | 'all')[] = ['all', ...CATS.filter((c) => DISCOUNTS.some((d) => d.cat === c))]
// 정적 HTML·첫 렌더 순서 = 확인일 기준 정렬(오늘 날짜와 무관하게 결정적)
const STATIC = sortDiscounts(DISCOUNTS, CHECKED)
const GUIDE = ['prep', 'who', 'lost', 'rules'] as const
const noSub = () => () => {}
const chip = (on: boolean) => `min-h-11 px-3.5 rounded-xl text-sm font-medium ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
const host = (url: string) => new URL(url).hostname.replace(/^www\./, '')

type Filter = { cat: Cat | 'all'; favOnly: boolean; favs: string[] }

// 분류·즐겨찾기만 보기만 URL 에(즐겨찾기 목록은 브라우저에만). 전부 기본값이면 쿼리 없음
const syncUrl = (cat: Cat | 'all', favOnly: boolean) => {
  const q = new URLSearchParams()
  if (cat !== 'all') q.set('cat', cat)
  if (favOnly) q.set('fav', '1')
  const s = q.toString()
  window.history.replaceState(window.history.state, '', s ? `?${s}` : window.location.pathname)
}

export default function CsatDiscounts() {
  const t = useTranslations('csatDiscounts')
  const sp = useSearchParams()
  // 오늘(KST)·URL·localStorage 는 마운트 후 — 정적 HTML 에는 전체 목록만, 상태 배지 없음
  const today = useSyncExternalStore(noSub, todayKST, () => null)
  const [f, setF] = useState<Filter>({ cat: 'all', favOnly: false, favs: [] })
  const [showEnded, setShowEnded] = useState(false)

  const loaded = useRef(false)
  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    let saved: unknown = []
    try { saved = JSON.parse(localStorage.getItem(FAV_KEY) || '[]') } catch { /* 저장 불가·깨진 값 */ }
    const cat = sp.get('cat')
    // eslint-disable-next-line react-hooks/set-state-in-effect -- URL·localStorage 는 마운트 후 1회만 읽는다
    setF({
      cat: isCat(cat) ? cat : 'all',
      favOnly: sp.get('fav') === '1',
      favs: Array.isArray(saved) ? saved.filter((id): id is string => IDS.has(id)) : [],
    })
  }, [sp])

  const setFilter = (next: Filter) => { setF(next); syncUrl(next.cat, next.favOnly) }
  const toggleFav = (id: string) => {
    const favs = f.favs.includes(id) ? f.favs.filter((v) => v !== id) : [...f.favs, id]
    setF({ ...f, favs })
    try { localStorage.setItem(FAV_KEY, JSON.stringify(favs)) } catch { /* 시크릿 모드 등 — 저장 없이 동작 */ }
  }

  const wd = t.raw('weekdays') as string[]
  const mon = t.raw('months') as string[]
  // 확인한 해(2026)면 연도 생략
  const fmt = (s: string) => {
    const [y, m, d] = s.split('-').map(Number)
    return t(s.startsWith(CHECKED.slice(0, 4)) ? 'date' : 'dateYear', { y, m: mon[m - 1], d, w: wd[weekday(s)] })
  }
  const period = (d: Discount) =>
    d.start && d.end ? t('period.range', { a: fmt(d.start), b: fmt(d.end) })
      : d.end ? t('period.until', { b: fmt(d.end) })
        : t('period.from', { a: fmt(d.start!) })
  const brand = (d: Discount) => t(`items.${d.id}.brand`)
  const statusOfD = (d: Discount): Status | null => (today ? statusOf(d, today) : null)
  const badge = (d: Discount) => {
    const s = statusOfD(d)
    if (!s || !today) return null
    const n = daysLeft(d, today)
    if (s === 'ended') return { text: t('status.ended'), cls: 'bg-soft text-muted' }
    if (s === 'upcoming') return { text: t('status.startsIn', { n: n ?? 0 }), cls: 'bg-soft text-sub' }
    if (n === null) return { text: t('status.ongoing'), cls: 'bg-primary-soft text-primary' }
    if (n === 0) return { text: t('status.lastDay'), cls: 'bg-primary text-white' }
    return { text: t('status.endsIn', { n }), cls: n <= 3 ? 'bg-primary text-white' : 'bg-primary-soft text-primary' }
  }

  const sorted = today ? sortDiscounts(DISCOUNTS, today) : STATIC
  const pool = sorted.filter((d) => (f.cat === 'all' || d.cat === f.cat) && (!f.favOnly || f.favs.includes(d.id)))
  const shown = pool.filter((d) => showEnded || statusOfD(d) !== 'ended')
  const ongoing = today ? pool.filter((d) => statusOf(d, today) === 'ongoing') : []
  const soon = today ? ongoing.filter((d) => (daysLeft(d, today) ?? 99) <= 7).length : 0
  const upcoming = today ? pool.filter((d) => statusOf(d, today) === 'upcoming').length : 0

  const label = !today ? t('summary.labelStatic')
    : f.favOnly ? t('summary.labelFav')
      : f.cat !== 'all' ? t('summary.labelCat', { cat: t(`cats.${f.cat}`) })
        : t('summary.labelToday')
  const headline = t('summary.count', { n: today ? ongoing.length : DISCOUNTS.length })
  const sub = today ? t('summary.sub', { soon, upcoming }) : t('summary.staticSub')

  const faq = t.raw('guide.faq.items') as { q: string; a: string }[]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle')}</p>
      </div>

      <section id="csat-discounts-result" className="ui-card p-6 space-y-5 scroll-mt-20" aria-labelledby="cd-label">
        <div className="space-y-1" aria-live="polite">
          <p id="cd-label" className="text-sm text-sub">{label}</p>
          <p className="text-3xl font-bold text-fg tabular-nums">{headline}</p>
          <p className="text-sm text-body tabular-nums">{sub}</p>
          <p className="text-xs text-muted">{t('summary.asOf', { date: fmt(CHECKED) })}</p>
        </div>
        <ShareResult
          fileName="csat-discounts-2027"
          card={{
            tool: t('share.tool'), label, headline, sub,
            rows: (today ? ongoing : shown).slice(0, 5).map((d) => ({ label: brand(d), value: badge(d)?.text ?? period(d) })),
          }}
          text={t('share.text', { label, headline })}
        />
      </section>

      <section className="space-y-4" aria-labelledby="cd-list">
        <h2 id="cd-list" className="text-lg font-semibold text-fg">{t('listTitle')}</h2>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('filter.group')}>
          {CHIPS.map((c) => (
            <button key={c} type="button" aria-pressed={f.cat === c} onClick={() => setFilter({ ...f, cat: c })} className={chip(f.cat === c)}>
              {t(`cats.${c}`)}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" aria-pressed={f.favOnly} onClick={() => setFilter({ ...f, favOnly: !f.favOnly })} className={chip(f.favOnly)}>
            {t('filter.fav')}{f.favs.length > 0 && <span className="tabular-nums"> {f.favs.length}</span>}
          </button>
          <button type="button" aria-pressed={showEnded} onClick={() => setShowEnded(!showEnded)} className={chip(showEnded)}>
            {t('filter.ended')}
          </button>
          <span className="ml-auto text-sm text-muted tabular-nums" aria-live="polite">{t('filter.shown', { n: shown.length })}</span>
        </div>

        {shown.length === 0 ? (
          <p className="bg-subtle rounded-2xl p-5 text-sm text-sub">{f.favOnly && !f.favs.length ? t('empty.fav') : t('empty.list')}</p>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shown.map((d) => {
              const b = badge(d)
              const ended = statusOfD(d) === 'ended'
              const on = f.favs.includes(d.id)
              return (
                <li key={d.id} className="ui-card p-5 flex flex-col gap-3 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-muted">{t(`cats.${d.cat}`)}</p>
                      <h3 className={`text-base font-semibold break-keep mt-0.5 ${ended ? 'text-muted' : 'text-fg'}`}>{brand(d)}</h3>
                    </div>
                    <button type="button" aria-pressed={on} aria-label={t('card.fav', { brand: brand(d) })} onClick={() => toggleFav(d.id)}
                      className="shrink-0 -mr-2 -mt-2 flex items-center justify-center w-11 h-11 rounded-xl hover:bg-soft">
                      <Star className={`w-5 h-5 ${on ? 'fill-current text-primary' : 'text-faint'}`} aria-hidden />
                    </button>
                  </div>
                  <p className={`text-lg font-bold break-keep ${ended ? 'text-muted' : 'text-fg'}`}>{t(`items.${d.id}.benefit`)}</p>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    {b && <span className={`rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums ${b.cls}`}>{b.text}</span>}
                    <span className={`tabular-nums ${ended ? 'text-muted' : 'text-body'}`}>{period(d)}</span>
                    {d.companions ? <span className="rounded-md bg-soft px-2 py-0.5 text-xs text-sub">{t('card.companions', { n: d.companions })}</span> : null}
                  </div>
                  <p className="text-sm text-sub leading-relaxed">{t(`items.${d.id}.condition`)}</p>
                  {d.internal && (
                    <Link href={d.internal} className="text-sm font-medium text-primary hover:underline">{t(`items.${d.id}.internal`)}</Link>
                  )}
                  <div className="mt-auto pt-2 border-t border-line flex flex-wrap items-center justify-between gap-x-3 text-xs">
                    <a href={d.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 min-h-11 text-primary hover:underline">
                      {t('card.source')} {host(d.url)}
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden />
                      <span className="sr-only">{t('card.newTab')}</span>
                    </a>
                    <span className="text-muted tabular-nums">{t('card.checked', { date: fmt(d.checked) })}</span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        <p className="bg-subtle rounded-2xl p-5 text-sm text-sub">{t('note')}</p>
      </section>

      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {GUIDE.map((sec) => (
            <section key={sec}>
              <h3 className="font-semibold text-fg mb-3">{t(`guide.${sec}.title`)}</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-sub">
                {(t.raw(`guide.${sec}.items`) as string[]).map((x) => <li key={x}>{x}</li>)}
              </ul>
            </section>
          ))}
        </div>
        <section>
          <h3 className="font-semibold text-fg mb-3">{t('guide.faq.title')}</h3>
          <div className="divide-y divide-line border-y border-line">
            {faq.map((x) => (
              <details key={x.q} className="py-3">
                <summary className="cursor-pointer text-sm font-medium text-body min-h-11 flex items-center">{x.q}</summary>
                <p className="text-sm text-sub mt-2 leading-relaxed">{x.a}</p>
              </details>
            ))}
          </div>
        </section>
        <div className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-2">
          <p className="font-medium text-body">{t('guide.sources.title')}</p>
          <p>{t('guide.sources.body')}</p>
          <p className="text-xs text-muted">{t('guide.sources.asOf')}</p>
        </div>
      </div>
    </div>
  )
}
