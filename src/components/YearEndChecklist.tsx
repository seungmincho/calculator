'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/yearEndChecklist'
import { useSearchParams } from '@/hooks/useSearchParams'
import AddToCalendar, { useDeadlineEvent } from '@/components/AddToCalendar'
import { menuConfig, categoryKeys } from '@/config/menuConfig'
import { DEADLINE, TAX_YEAR } from '@/utils/yearEndTax'
import { todayKST, daysBetween, ddayLabel } from '@/utils/dday'
import { SITUATIONS, GROUPS, ITEMS, NTS_URL, visibleItems, parseSituations, type Situation } from '@/utils/yearEndChecklist'

// 귀속연도마다 새 키 (TAX_YEAR 가 바뀌면 지난해 체크는 안 보임)
const STORE_KEY = `toolhub:year-end-checklist:${TAX_YEAR}`
const LABEL: Record<string, string> = Object.fromEntries(categoryKeys.flatMap((k) => menuConfig[k].items.map((i) => [i.href, i.labelKey])))
const IDS = new Set(ITEMS.map((i) => i.id))
const noSub = () => () => {}

type State = { s: Situation[]; c: string[] }

// 상황만 URL 에 (체크는 개인 것이라 브라우저에만). 상황이 없으면 쿼리 없음
const syncUrl = (s: Situation[]) => window.history.replaceState(window.history.state, '', s.length ? `?s=${s.join('.')}` : window.location.pathname)

export default function YearEndChecklist() {
  const t = useTranslations('yearEndChecklist')
  const tr = useTranslations()
  const deadlineEvent = useDeadlineEvent()
  const sp = useSearchParams()
  const [st, setSt] = useState<State>({ s: [], c: [] })
  // 오늘(KST)은 마운트 후 — 정적 HTML 에는 D-day 없음
  const today = useSyncExternalStore(noSub, todayKST, () => null)

  // URL·저장값 → 상태 (마운트 후 1회, 첫 렌더 = 정적 HTML 기본값). URL 의 상황이 저장값보다 우선
  const loaded = useRef(false)
  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    let saved: Partial<Record<keyof State, unknown>> = {}
    try { saved = JSON.parse(localStorage.getItem(STORE_KEY) || '{}') ?? {} } catch { /* 저장 불가·깨진 값 */ }
    const q = sp.get('s')
    const s = parseSituations(q !== null ? q.split('.') : Array.isArray(saved.s) ? saved.s : [])
    const c = Array.isArray(saved.c) ? saved.c.filter((id): id is string => IDS.has(id)) : []
    // eslint-disable-next-line react-hooks/set-state-in-effect -- URL·localStorage 는 마운트 후 1회만 읽는다
    setSt({ s, c })
    if (q === null && s.length) syncUrl(s)
  }, [sp])

  const update = (next: State) => {
    setSt(next)
    try { localStorage.setItem(STORE_KEY, JSON.stringify(next)) } catch { /* 시크릿 모드 등 — 저장 없이 동작 */ }
    syncUrl(next.s)
  }
  const toggleSit = (x: Situation) => update({ ...st, s: parseSituations(st.s.includes(x) ? st.s.filter((v) => v !== x) : [...st.s, x]) })
  const toggleItem = (id: string) => update({ ...st, c: st.c.includes(id) ? st.c.filter((v) => v !== id) : [...st.c, id] })
  const clear = () => { if (window.confirm(t('progress.clearConfirm'))) update({ ...st, c: [] }) }

  const list = visibleItems(st.s)
  const done = list.filter((i) => st.c.includes(i.id)).length
  const pct = Math.round((done / list.length) * 100)
  const vars = { year: TAX_YEAR, next: TAX_YEAR + 1 }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle', vars)}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* 진행률 + 내 상황 (모바일에서 진행률이 첫 화면) */}
        <div className="min-w-0 space-y-6">
          <section id="year-end-checklist-result" aria-labelledby="yc-progress" className="ui-card p-6 space-y-4 scroll-mt-20">
            <div>
              <h2 id="yc-progress" className="text-sm text-muted">{t('progress.title', vars)}</h2>
              <p aria-live="polite" className="text-3xl font-bold text-fg tabular-nums mt-1">{t('progress.count', { done, total: list.length })}</p>
            </div>
            <div className="h-3 rounded-full bg-track overflow-hidden" role="progressbar" aria-label={t('progress.title', vars)}
              aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
              <div className="h-full bg-primary rounded-full transition-[width]" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-sm text-sub">{done === list.length ? t('progress.allDone') : t('progress.left', { n: list.length - done })}</p>
            <p className="text-xs text-muted">{t('progress.saved')}</p>
            <div className="flex flex-wrap gap-2">
              <AddToCalendar file={`year-end-checklist-${TAX_YEAR}.ics`} events={[
                deadlineEvent('yearEnd', DEADLINE.yearEnd, '/year-end-checklist', 7),
                deadlineEvent('simplified', DEADLINE.simplified, '/year-end-checklist', 1),
              ]} />
              <button type="button" onClick={clear} disabled={!st.c.length}
                className="ui-btn-soft min-h-11 px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed">{t('progress.clear')}</button>
            </div>
          </section>

          <section aria-labelledby="yc-sit" className="ui-card p-6 space-y-3">
            <h2 id="yc-sit" className="text-lg font-semibold text-fg">{t('situations.title')}</h2>
            <p className="text-sm text-muted">{t('situations.desc')}</p>
            <div className="flex flex-wrap gap-2">
              {SITUATIONS.map((x) => {
                const on = st.s.includes(x)
                return (
                  <button key={x} type="button" aria-pressed={on} onClick={() => toggleSit(x)}
                    className={`min-h-11 px-3 py-2 rounded-xl text-sm transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}>
                    {t(`situations.items.${x}`)}
                  </button>
                )
              })}
            </div>
          </section>
        </div>

        {/* 마감별 할 일 */}
        <div className="lg:col-span-2 min-w-0 space-y-6">
          {GROUPS.map((g) => {
            const items = list.filter((i) => i.group === g.id)
            if (!items.length) return null
            const n = items.filter((i) => st.c.includes(i.id)).length
            const diff = g.date && today ? daysBetween(today, g.date) : null
            return (
              <section key={g.id} aria-labelledby={`yc-${g.id}`} className="ui-card p-6">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 id={`yc-${g.id}`} className="text-lg font-semibold text-fg">{t(`groups.${g.id}.title`, vars)}</h2>
                  <span className="shrink-0 text-sm tabular-nums">
                    {diff !== null && <span className="font-semibold text-primary mr-2">{diff >= 0 ? ddayLabel(diff) : t(`groups.${g.id}.past`)}</span>}
                    <span className="text-muted">{n}/{items.length}</span>
                  </span>
                </div>
                <p className="text-sm text-muted mt-1">{t(`groups.${g.id}.desc`, vars)}</p>
                {g.id === 'jan' && (
                  <p className="text-xs text-muted mt-1">
                    {t('groups.jan.basis', vars)}{' '}
                    <a href={NTS_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{t('groups.jan.source')}</a>
                  </p>
                )}
                <ul className="mt-3 divide-y divide-line">
                  {items.map((i) => {
                    const c = st.c.includes(i.id)
                    return (
                      <li key={i.id} className="py-3 flex gap-3">
                        <input id={`yc-i-${i.id}`} type="checkbox" checked={c} onChange={() => toggleItem(i.id)} aria-describedby={`yc-d-${i.id}`}
                          className="mt-0.5 w-5 h-5 shrink-0 accent-[var(--primary)] cursor-pointer" />
                        <div className="min-w-0">
                          <label htmlFor={`yc-i-${i.id}`} className={`font-medium cursor-pointer ${c ? 'text-sub line-through' : 'text-fg'}`}>
                            {t(`items.${i.id}.title`, vars)}
                          </label>
                          <p id={`yc-d-${i.id}`} className="text-sm text-muted mt-0.5">{t(`items.${i.id}.desc`, vars)}</p>
                          {i.href && (
                            <Link prefetch={false} href={`${i.href}/`} className="inline-block mt-1 text-sm text-primary font-medium hover:underline">
                              {tr(LABEL[i.href])}
                            </Link>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
