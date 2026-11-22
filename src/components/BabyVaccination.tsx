'use client'

import { useMemo, useState, useSyncExternalStore } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/babyVaccination'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useHydrated } from '@/hooks/useHydrated'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import AddToCalendar from '@/components/AddToCalendar'
import { daysBetween, todayKST } from '@/utils/dday'
import {
  B_RANGE, CHECKED, CHECKUPS, DEFAULT, DEMO_TODAY, FLU, FLU_ID, LINKS, SCHEDULE_YEAR, SOURCES, STORE_KEY,
  ageLabel, ageOf, defaultBirth, fluStatus, groupRows, icsEvents, nextDoses, nipEligible, parseDone, parseState,
  scheduleFor, setDone, statusOf, toQuery, validBirth, windowOf,
  type DoneMap, type Dose, type Je, type Rv, type State, type Status,
} from '@/utils/babyVaccination'

const noSub = () => () => {}
const serverToday = () => null
const dot = (d: string) => d.replace(/-/g, '.')
const span = (s: string, e: string) => (s === e ? dot(s) : `${dot(s)} ~ ${dot(e)}`)
const RVS: Rv[] = ['rv1', 'rv5']
const JES: Je[] = ['i', 'l']
const GUIDE = ['howTo', 'basis', 'care'] as const
const SOURCE_KEYS = ['schedule', 'nip', 'diseases', 'flu', 'hpv', 'care', 'nhis'] as const
const LINK_KEYS = ['history', 'clinic', 'nhisDates'] as const

const optCard = (on: boolean) => `min-h-11 w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${on ? 'bg-primary-soft text-primary border-primary' : 'bg-surface text-body border-line hover:bg-soft'}`
const labelCls = 'block text-sm font-medium text-body mb-1.5'
const warnCls = 'bg-amber-50 text-amber-800 rounded-2xl px-4 py-3 text-sm'
const chipCls: Record<Status, string> = {
  now: 'bg-primary-soft text-primary',
  past: 'bg-soft text-sub',
  soon: 'bg-soft text-muted',
  done: 'bg-soft text-sub',
}
const boxCls = 'mt-0.5 h-5 w-5 shrink-0 accent-[var(--primary)]'

type Item = { id: string; start: string; end: string; name: string; sub?: string }

export default function BabyVaccination() {
  const t = useTranslations('babyVaccination')
  const sp = useSearchParams()
  const hydrated = useHydrated()
  // 오늘은 마운트 뒤에만. 서버·첫 렌더는 고정 예시(DEMO_TODAY 기준 생후 2개월)
  const today = useSyncExternalStore(noSub, todayKST, serverToday) ?? DEMO_TODAY

  const fromUrl = useMemo(() => (hydrated ? parseState((k) => sp.get(k)) : DEFAULT), [hydrated, sp])
  const [edited, setEdited] = useState<State | null>(null)
  const s = edited ?? fromUrl
  const birth = s.b ?? defaultBirth(today)
  const [bDraft, setBDraft] = useState<string | null>(null)
  const commit = (next: State) => {
    setEdited(next)
    const qs = toQuery(next)
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`)
  }

  // ── 완료 체크: 하이드레이션 뒤 한 번 읽고, 생일별로 저장
  const [doneMap, setDoneMap] = useState<DoneMap>({})
  const [loaded, setLoaded] = useState(false)
  const [storageOk, setStorageOk] = useState(true)
  const [confirmClear, setConfirmClear] = useState(false)
  if (hydrated && !loaded) {
    setLoaded(true)
    try { setDoneMap(parseDone(window.localStorage.getItem(STORE_KEY))) } catch { setStorageOk(false) }
  }
  const done = useMemo(() => new Set(doneMap[birth] ?? []), [doneMap, birth])
  const writeDone = (ids: Iterable<string>) => {
    const next = setDone(doneMap, birth, ids)
    setDoneMap(next)
    // 생일을 넣기 전(예시)은 생일이 날마다 바뀌니 화면에서만 체크하고 저장하지 않는다
    if (s.b === null) return
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(next)); setStorageOk(true) } catch { setStorageOk(false) }
  }
  const toggle = (id: string) => {
    const n = new Set(done)
    if (n.has(id)) n.delete(id)
    else n.add(id)
    writeDone(n)
    setConfirmClear(false)
  }

  // ── 계산
  const rows = useMemo(() => scheduleFor(birth, s.r, s.j), [birth, s.r, s.j])
  const groups = groupRows(rows)
  const checkups = CHECKUPS.map((c) => { const [start, end] = windowOf(birth, c); return { ...c, start, end } })
  const age = ageOf(birth, today)
  const next = nextDoses(rows, today, done)
  const flu = fluStatus(birth)
  const eligible = nipEligible(birth)
  const past = rows.filter((r) => !done.has(r.id) && r.end < today)

  const doseName = (r: Dose) => `${t(`vax.${r.vax}.name`)} ${t('dose', { n: r.n })}`
  const ageText = (x: { from: number; to: number; unit?: 'd' }) => { const l = ageLabel(x); return t(`age.${l.k}`, { a: l.a, b: l.b }) }
  const checkupName = (c: { kind: string; n: number }) => t(`checkup.${c.kind}`, { n: c.n })
  const st = (id: string, start: string, end: string) => statusOf(start, end, today, done.has(id))

  const items: Item[] = [
    ...rows.map((r) => ({ id: r.id, start: r.start, end: r.end, name: doseName(r), sub: t(`vax.${r.vax}.full`) })),
    ...checkups.map((c) => ({ id: c.id, start: c.start, end: c.end, name: checkupName(c) })),
    ...(flu.kind === 'ok' ? [{ id: FLU_ID, start: flu.from, end: flu.to, name: t('flu.item', { season: FLU.season }) }] : []),
  ]
  const thisMonth = items.filter((x) => st(x.id, x.start, x.end) === 'now').sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0))
  const nextCheckup = checkups.find((c) => !done.has(c.id) && c.end >= today)

  const ageShort = age ? t('result.monthsShort', { m: age.months }) : t('result.unbornShort')
  const nextFirst = next ? doseName(next.list[0]) + (next.list.length > 1 ? ` ${t('result.more', { n: next.list.length - 1 })}` : '') : ''
  const dday = next ? (next.diff > 0 ? `D-${next.diff}` : t('result.nowShort')) : ''
  const headline = next ? t('share.headline', { age: ageShort, name: nextFirst, dday }) : t('share.headlineNone', { age: ageShort })

  const icsItems = items.map((x) => ({ ...x, title: t('ics.title', { name: x.name, end: dot(x.end) }) }))
  const events = icsEvents(birth, icsItems, today, done, t('ics.desc', { url: 'https://toolhub.ai.kr/baby-vaccination/' }))

  const faq = t.raw('guide.faq.items') as { q: string; a: string }[]
  const supportItems = t.raw('support.items') as string[]

  const check = (x: Item) => (
    <label key={x.id} className="flex items-start gap-3 min-h-11 py-2 cursor-pointer">
      <input type="checkbox" className={boxCls} checked={done.has(x.id)} disabled={!loaded} onChange={() => toggle(x.id)} />
      <span className="min-w-0 flex-1">
        <span className={`block text-sm font-semibold ${done.has(x.id) ? 'text-muted line-through' : 'text-fg'}`}>{x.name}</span>
        <span className="block text-xs text-sub tabular-nums">{x.sub ? `${x.sub} · ` : ''}{span(x.start, x.end)}</span>
      </span>
    </label>
  )
  const chip = (k: Status) => <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${chipCls[k]}`}>{t(`status.${k}`)}</span>

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle', { year: SCHEDULE_YEAR })}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <section className="ui-card p-6 space-y-6 min-w-0" aria-labelledby="bv-input">
          <MobileResultLink href="#baby-vaccination-result" label={next ? `${t('result.next')} · ${dday}` : t('result.next')} value={next ? nextFirst : '—'} />
          <h2 id="bv-input" className="text-lg font-semibold text-fg">{t('input.title')}</h2>

          <div>
            <label htmlFor="bv-birth" className={labelCls}>{t('input.birth')}</label>
            <input
              id="bv-birth" type="date" value={bDraft ?? birth} min={B_RANGE[0]} max={B_RANGE[1]} aria-describedby="bv-birth-hint"
              onChange={(e) => {
                const v = e.target.value
                setBDraft(v)
                if (validBirth(v)) commit({ ...s, b: v })
              }}
              onBlur={() => setBDraft(null)}
              className="ui-field w-full min-h-11 px-4 py-3 text-base tabular-nums"
            />
            <p id="bv-birth-hint" className="mt-1.5 text-xs text-muted">{s.b ? t('input.birthHint') : t('input.birthAuto')}</p>
          </div>

          <div>
            <p id="bv-rv" className={labelCls}>{t('input.rv')}</p>
            <div role="group" aria-labelledby="bv-rv" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
              {RVS.map((r) => (
                <button key={r} type="button" aria-pressed={s.r === r} onClick={() => s.r !== r && commit({ ...s, r })} className={optCard(s.r === r)}>
                  <span className="block text-sm font-semibold">{t(`input.rvOpt.${r}.name`)}</span>
                  <span className="block text-xs mt-0.5 opacity-80">{t(`input.rvOpt.${r}.desc`)}</span>
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted">{t('input.rvHint')}</p>
          </div>

          <div>
            <p id="bv-je" className={labelCls}>{t('input.je')}</p>
            <div role="group" aria-labelledby="bv-je" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
              {JES.map((j) => (
                <button key={j} type="button" aria-pressed={s.j === j} onClick={() => s.j !== j && commit({ ...s, j })} className={optCard(s.j === j)}>
                  <span className="block text-sm font-semibold">{t(`input.jeOpt.${j}.name`)}</span>
                  <span className="block text-xs mt-0.5 opacity-80">{t(`input.jeOpt.${j}.desc`)}</span>
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted">{t('input.jeHint')}</p>
          </div>
        </section>

        {/* 결과 */}
        <div className="lg:col-span-2 min-w-0 space-y-4">
          <section id="baby-vaccination-result" className="ui-card p-6 space-y-5 scroll-mt-20 min-w-0" aria-labelledby="bv-result">
            <h2 id="bv-result" className="sr-only">{t('result.title')}</h2>
            <div aria-live="polite" className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="min-w-0">
                <p className="text-sm text-sub">{t('result.age')}</p>
                <p className="mt-1 text-3xl font-bold text-fg tabular-nums">
                  {age ? t('result.ageVal', { m: age.months, d: age.days }) : t('result.unborn', { n: daysBetween(today, birth) })}
                </p>
                <p className="mt-1 text-sm text-body tabular-nums">
                  {age ? `${t('result.days', { n: age.totalDays })} · ` : ''}{t('result.born', { date: dot(birth) })}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-sm text-sub">{t('result.next')}</p>
                {next ? (
                  <>
                    <p className="mt-1 text-3xl font-bold text-fg tabular-nums">{dday}</p>
                    <p className="mt-1 text-sm font-semibold text-fg">{next.list.map(doseName).join(' · ')}</p>
                    <p className="text-sm text-body tabular-nums">
                      {next.diff > 0 ? t('result.nextDate', { date: dot(next.start), end: dot(next.end) }) : t('result.nextUntil', { end: dot(next.end) })}
                    </p>
                  </>
                ) : <p className="mt-1 text-base text-body">{t('result.nextNone')}</p>}
              </div>
            </div>

            <div className="rounded-2xl border border-line p-4">
              <h3 className="text-sm font-semibold text-fg">{t('result.thisMonth')}</h3>
              {thisMonth.length ? <div className="mt-1 divide-y divide-line">{thisMonth.map(check)}</div>
                : <p className="mt-2 text-sm text-sub">{t('result.thisMonthEmpty')}</p>}
            </div>

            {past.length > 0 && (
              <div className={`${warnCls} space-y-2`}>
                <p>{t('result.past', { n: past.length, names: past.slice(0, 3).map(doseName).join(', ') + (past.length > 3 ? ` ${t('result.more', { n: past.length - 3 })}` : '') })}</p>
                <button type="button" disabled={!loaded} onClick={() => writeDone([...done, ...past.map((r) => r.id)])}
                  className="min-h-11 px-4 py-2 rounded-xl bg-surface text-body text-sm font-medium hover:bg-soft disabled:opacity-50">
                  {t('result.markPast')}
                </button>
              </div>
            )}
            {!eligible && <p className={warnCls}>{t('support.notEligible')}</p>}
            {!storageOk && <p className={warnCls}>{t('schedule.storageError')}</p>}
            <p className="text-xs text-muted leading-relaxed">{t('result.disclaimer')}</p>
          </section>

          <ShareResult
            fileName="baby-vaccination"
            card={{
              tool: t('share.tool'),
              label: t('share.label'),
              headline,
              sub: t('share.sub', { year: SCHEDULE_YEAR }),
              rows: [
                { label: t('result.age'), value: age ? t('result.ageVal', { m: age.months, d: age.days }) : t('result.unbornShort') },
                ...(next ? [{ label: t('share.rows.nextDate'), value: next.diff > 0 ? dot(next.start) : t('result.nextUntil', { end: dot(next.end) }) }] : []),
                { label: t('share.rows.thisMonth'), value: t('share.rows.count', { n: thisMonth.length }) },
                ...(nextCheckup ? [{ label: t('share.rows.checkup'), value: `${checkupName(nextCheckup)} · ${span(nextCheckup.start, nextCheckup.end)}` }] : []),
              ],
            }}
            text={t('share.text', { headline })}
          />
          <div className="flex flex-wrap items-center gap-3">
            <AddToCalendar file={`baby-vaccination-${birth}.ics`} events={events} />
            <p className="text-xs text-muted">{t('ics.hint')}</p>
          </div>
        </div>
      </div>

      {/* 전체 일정표 */}
      <section className="ui-card p-6 space-y-5" aria-labelledby="bv-schedule">
        <div>
          <h2 id="bv-schedule" className="text-lg font-semibold text-fg">{t('schedule.title', { year: SCHEDULE_YEAR })}</h2>
          <p className="text-sm text-muted mt-1">{t('schedule.desc')}</p>
        </div>
        <ol className="space-y-3">
          {groups.map((g) => {
            const gs: Status = g.rows.every((r) => done.has(r.id)) ? 'done' : statusOf(g.start, g.end, today)
            return (
              <li key={`${g.start}-${g.end}`} className={`rounded-2xl border p-4 ${gs === 'now' ? 'border-primary' : 'border-line'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-fg">{ageText(g)}</p>
                    <p className="text-xs text-sub tabular-nums">{span(g.start, g.end)}</p>
                  </div>
                  {chip(gs)}
                </div>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                  {g.rows.map((r) => (
                    <label key={r.id} className="flex items-start gap-3 min-h-11 py-2 cursor-pointer min-w-0">
                      <input type="checkbox" className={boxCls} checked={done.has(r.id)} disabled={!loaded} onChange={() => toggle(r.id)} />
                      <span className="min-w-0">
                        <span className={`block text-sm font-semibold ${done.has(r.id) ? 'text-muted line-through' : 'text-fg'}`}>{doseName(r)}</span>
                        <span className="block text-xs text-sub">{t(`vax.${r.vax}.full`)}</span>
                        {r.note && <span className="block text-xs text-muted">{t(`note.${r.note}`)}</span>}
                      </span>
                    </label>
                  ))}
                </div>
              </li>
            )
          })}
        </ol>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={!loaded || done.size === 0}
            onClick={() => { if (confirmClear) { writeDone([]); setConfirmClear(false) } else setConfirmClear(true) }}
            className={`min-h-11 px-4 py-2 rounded-xl text-sm disabled:opacity-50 ${confirmClear ? 'bg-amber-50 text-amber-800' : 'bg-soft text-body hover:bg-subtle'}`}>
            {t(confirmClear ? 'schedule.clearConfirm' : 'schedule.clear')}
          </button>
        </div>
        <p className="bg-subtle rounded-2xl p-5 text-sm text-sub">{t('schedule.storage')}</p>
      </section>

      {/* 건강검진 */}
      <section className="ui-card p-6 space-y-5" aria-labelledby="bv-checkup">
        <div>
          <h2 id="bv-checkup" className="text-lg font-semibold text-fg">{t('checkup.title')}</h2>
          <p className="text-sm text-muted mt-1">{t('checkup.desc')}</p>
        </div>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {checkups.map((c) => {
            const k = st(c.id, c.start, c.end)
            return (
              <li key={c.id} className={`rounded-2xl border px-4 py-2 ${k === 'now' ? 'border-primary' : 'border-line'}`}>
                <div className="flex items-start gap-3">
                  <label className="flex flex-1 min-w-0 items-start gap-3 min-h-11 py-1.5 cursor-pointer">
                    <input type="checkbox" className={boxCls} checked={done.has(c.id)} disabled={!loaded} onChange={() => toggle(c.id)} />
                    <span className="min-w-0">
                      <span className={`block text-sm font-semibold ${done.has(c.id) ? 'text-muted line-through' : 'text-fg'}`}>{checkupName(c)}</span>
                      <span className="block text-xs text-sub tabular-nums">{ageText(c)} · {span(c.start, c.end)}</span>
                    </span>
                  </label>
                  <span className="pt-2">{chip(k)}</span>
                </div>
              </li>
            )
          })}
        </ul>
        <p className="bg-subtle rounded-2xl p-5 text-sm text-sub">
          {t('checkup.note')}{' '}
          <a href={LINKS.nhisDates} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{t('links.nhisDates')}</a>
        </p>
      </section>

      {/* 국가지원·인플루엔자 */}
      <section className="ui-card p-6 space-y-5" aria-labelledby="bv-support">
        <h2 id="bv-support" className="text-lg font-semibold text-fg">{t('support.title')}</h2>
        <p className={eligible ? 'text-sm text-body' : warnCls}>{t(eligible ? 'support.eligible' : 'support.notEligible')}</p>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-sub">{supportItems.map((x) => <li key={x}>{x}</li>)}</ul>
        <div className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-1.5">
          <h3 className="font-semibold text-fg">{t('flu.title', { season: FLU.season })}</h3>
          <p className="tabular-nums">
            {flu.kind === 'ok' ? t('flu.ok', { from: dot(flu.from), to: dot(flu.to) })
              : flu.kind === 'bornAfter' ? t('flu.bornAfter', { bornTo: dot(FLU.bornTo), from: dot(flu.from) })
                : t('flu.old', { bornFrom: dot(FLU.bornFrom) })}
          </p>
          <p>{t('flu.doses')}</p>
        </div>
      </section>

      {/* 가이드 */}
      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
          <h3 className="font-semibold text-fg mb-3">{t('links.title')}</h3>
          <div className="flex flex-wrap gap-2">
            {LINK_KEYS.map((k) => (
              <a key={k} href={LINKS[k]} target="_blank" rel="noopener noreferrer" className="ui-btn-soft inline-flex items-center min-h-11 px-4 py-2 text-sm">{t(`links.${k}`)}</a>
            ))}
          </div>
        </section>
        <section>
          <h3 className="font-semibold text-fg mb-3">{t('guide.faq.title')}</h3>
          <div className="divide-y divide-line border-y border-line">
            {faq.map((f) => (
              <details key={f.q} className="py-3">
                <summary className="cursor-pointer text-sm font-medium text-body min-h-11 flex items-center">{f.q}</summary>
                <p className="text-sm text-sub mt-2 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-2">
          <h3 className="font-medium text-body">{t('sources.title')}</h3>
          <ul className="space-y-1">
            {SOURCE_KEYS.map((k) => (
              <li key={k}><a href={SOURCES[k]} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline [overflow-wrap:anywhere]">{t(`sources.${k}`)}</a></li>
            ))}
          </ul>
          <p className="text-xs text-muted">{t('sources.method')}</p>
          <p className="text-xs text-muted">{t('sources.asOf', { date: CHECKED })}</p>
        </section>
      </div>
    </div>
  )
}
