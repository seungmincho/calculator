'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/formulaAmount'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useHydrated } from '@/hooks/useHydrated'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import {
  CHECKED, DAILY_CAP, DEFAULT, M_RANGE, N_RANGE, ROWS, SOURCES, S_RANGE, W_RANGE,
  ageFrom, calc, defaultTimes, parseState, perKg, toQuery, type State,
} from '@/utils/formulaAmount'

const fmt = (n: number) => n.toLocaleString('ko-KR', { maximumFractionDigits: 1 })
const span = (lo: number, hi: number) => (lo === hi ? fmt(lo) : `${fmt(lo)}~${fmt(hi)}`)
const pad = (n: number) => String(n).padStart(2, '0')
/** 이벤트 핸들러에서만 부른다(첫 렌더는 날짜를 읽지 않음) */
const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
const decimal = (v: string) => v.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1').slice(0, 5)
const inRange = (s: string, [lo, hi]: readonly [number, number]) => s.trim() !== '' && Number(s) >= lo && Number(s) <= hi
const MONTHS = Array.from({ length: M_RANGE[1] - M_RANGE[0] + 1 }, (_, i) => M_RANGE[0] + i)
const GUIDE = ['basis', 'cues', 'prep', 'check'] as const
const SOURCE_KEYS = ['isarang13', 'isarang46', 'isarang79', 'isarangNewborn', 'aap', 'cdcStorage', 'cdcCues', 'mfds', 'msd'] as const
const TABLE_COLS = ['age', 'times', 'interval', 'perFeed', 'daily'] as const

const chip = (on: boolean) => `min-h-11 px-2 py-2 rounded-xl text-sm font-medium tabular-nums transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
const labelCls = 'block text-sm font-medium text-body mb-1.5'
const errCls = 'mt-1.5 rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-800'
const warnCls = 'bg-amber-50 text-amber-800 rounded-2xl px-4 py-3 text-sm'
const unitCls = 'absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted pointer-events-none'
const stepBtn = 'ui-btn-soft min-h-11 min-w-11 px-3 py-2 text-lg font-semibold disabled:opacity-40'

export default function FormulaAmount() {
  const t = useTranslations('formulaAmount')
  const sp = useSearchParams()
  const hydrated = useHydrated()

  // URL → 값. 하이드레이션 전에는 기본값이라 첫 렌더가 정적 HTML 과 같다. 사용자가 고치면 그 값이 우선
  const fromUrl = useMemo(() => (hydrated ? parseState((k) => sp.get(k)) : DEFAULT), [hydrated, sp])
  const [edited, setEdited] = useState<State | null>(null)
  const s = edited ?? fromUrl
  const [wDraft, setWDraft] = useState<string | null>(null)
  const [sDraft, setSDraft] = useState<string | null>(null)
  const [birth, setBirth] = useState('')
  const [birthInfo, setBirthInfo] = useState<{ days: number; months: number } | 'bad' | null>(null)

  const commit = (next: State) => {
    setEdited(next)
    const qs = toQuery(next)
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`)
  }
  const setMonth = (m: number) => commit({ ...s, m, n: null, b: Math.min(s.b, defaultTimes(m)) })
  const setTimes = (n: number) => commit({ ...s, n: n === defaultTimes(s.m) ? null : n, b: Math.min(s.b, n) })

  const r = calc(s)
  const wText = wDraft ?? String(s.w)
  const sText = sDraft ?? String(s.s)
  const wBad = !inRange(wText, W_RANGE)
  const sBad = !inRange(sText, S_RANGE) || !Number.isInteger(Number(sText))
  const k = perKg(s.m)
  const monthLabel = s.m === 0 ? t('input.newborn') : t('input.monthOpt', { n: s.m })
  const dailyText = `${span(r.daily[0], r.daily[1])} mL`
  const feedText = `${span(r.feed[0], r.feed[1])} mL`
  const scoopText = t('result.scoopsVal', { v: span(r.scoops[0], r.scoops[1]) })
  const rowLabel = t(`rows.${r.row.id}.label`)
  const rowInterval = t(`rows.${r.row.id}.interval`)

  const stepper = (id: string, what: string, value: number, min: number, max: number, set: (v: number) => void) => (
    <div className="flex items-center gap-2">
      <button type="button" className={stepBtn} onClick={() => set(value - 1)} disabled={value <= min} aria-label={t('input.minus', { what })}>−</button>
      <output id={id} aria-live="polite" className="ui-field min-h-11 flex-1 px-4 py-2.5 text-center text-base font-semibold text-fg tabular-nums">{t('input.timesVal', { n: value })}</output>
      <button type="button" className={stepBtn} onClick={() => set(value + 1)} disabled={value >= max} aria-label={t('input.plus', { what })}>+</button>
    </div>
  )

  const faq = t.raw('guide.faq.items') as { q: string; a: string }[]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <section className="ui-card p-6 space-y-6 min-w-0" aria-labelledby="fa-input">
          <MobileResultLink href="#formula-amount-result" label={t('result.label')} value={dailyText} />
          <h2 id="fa-input" className="text-lg font-semibold text-fg">{t('input.title')}</h2>

          <div>
            <p id="fa-month" className={labelCls}>{t('input.month')}</p>
            <div role="group" aria-labelledby="fa-month" className="grid grid-cols-4 sm:grid-cols-7 lg:grid-cols-4 gap-2">
              {MONTHS.map((m) => (
                <button key={m} type="button" aria-pressed={s.m === m} className={chip(s.m === m)}
                  onClick={() => { setBirth(''); setBirthInfo(null); if (s.m !== m) setMonth(m) }}>
                  {m === 0 ? t('input.newborn') : t('input.monthOpt', { n: m })}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted">{t('input.monthHint')}</p>
          </div>

          <div>
            <label htmlFor="fa-birth" className={labelCls}>{t('input.birth')}</label>
            <input
              id="fa-birth" type="date" value={birth}
              onChange={(e) => {
                const v = e.target.value
                setBirth(v)
                if (!v) { setBirthInfo(null); return }
                const a = ageFrom(v, todayIso())
                setBirthInfo(a ?? 'bad')
                if (a) setMonth(Math.min(a.months, M_RANGE[1]))
              }}
              aria-describedby="fa-birth-hint"
              className="ui-field w-full min-h-11 px-4 py-3 text-base tabular-nums"
            />
            <p id="fa-birth-hint" className={birthInfo === 'bad' ? errCls : 'mt-1.5 text-xs text-muted tabular-nums'}>
              {birthInfo === 'bad' ? t('input.birthErr')
                : birthInfo ? `${t('input.birthAge', { days: birthInfo.days, months: birthInfo.months })}${birthInfo.months > M_RANGE[1] ? ` ${t('input.birthOver')}` : ''}`
                : t('input.birthHint')}
            </p>
          </div>

          <div>
            <label htmlFor="fa-weight" className={labelCls}>{t('input.weight')}</label>
            <div className="relative">
              <input
                id="fa-weight" inputMode="decimal" autoComplete="off" value={wText}
                onChange={(e) => {
                  const v = decimal(e.target.value)
                  setWDraft(v)
                  if (inRange(v, W_RANGE)) commit({ ...s, w: Math.round(Number(v) * 10) / 10 })
                }}
                onBlur={() => setWDraft(null)}
                aria-invalid={wBad || undefined} aria-describedby="fa-weight-hint"
                className="ui-field w-full min-h-11 px-4 py-3 pr-12 text-base tabular-nums"
              />
              <span className={unitCls}>kg</span>
            </div>
            <p id="fa-weight-hint" className={wBad ? errCls : 'mt-1.5 text-xs text-muted'}>
              {wBad ? t('input.weightErr', { min: W_RANGE[0], max: W_RANGE[1] }) : t('input.weightHint')}
            </p>
          </div>

          <div>
            <p id="fa-times-label" className={labelCls}>{t('input.times')}</p>
            <div role="group" aria-labelledby="fa-times-label" aria-describedby="fa-times-hint">
              {stepper('fa-times', t('input.times'), r.n, N_RANGE[0], N_RANGE[1], setTimes)}
            </div>
            <p id="fa-times-hint" className="mt-1.5 text-xs text-muted tabular-nums">
              {t(s.m >= 6 ? 'input.timesHintSolids' : 'input.timesHint', { n: defaultTimes(s.m), lo: r.row.times[0], hi: r.row.times[1] })}
              {s.n !== null && (
                <button type="button" onClick={() => setTimes(defaultTimes(s.m))} className="ml-2 min-h-11 text-primary font-medium hover:underline">{t('input.timesReset')}</button>
              )}
            </p>
          </div>

          <div>
            <p id="fa-breast-label" className={labelCls}>{t('input.breast')}</p>
            <div role="group" aria-labelledby="fa-breast-label" aria-describedby="fa-breast-hint">
              {stepper('fa-breast', t('input.breast'), r.b, 0, r.n, (b) => commit({ ...s, b }))}
            </div>
            <p id="fa-breast-hint" className="mt-1.5 text-xs text-muted">{t('input.breastHint')}</p>
          </div>

          <div>
            <label htmlFor="fa-scoop" className={labelCls}>{t('input.scoop')}</label>
            <div className="relative">
              <input
                id="fa-scoop" inputMode="numeric" autoComplete="off" value={sText}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 3)
                  setSDraft(v)
                  if (inRange(v, S_RANGE)) commit({ ...s, s: Number(v) })
                }}
                onBlur={() => setSDraft(null)}
                aria-invalid={sBad || undefined} aria-describedby="fa-scoop-hint"
                className="ui-field w-full min-h-11 px-4 py-3 pr-12 text-base tabular-nums"
              />
              <span className={unitCls}>mL</span>
            </div>
            <p id="fa-scoop-hint" className={sBad ? errCls : 'mt-1.5 text-xs text-muted'}>
              {sBad ? t('input.scoopErr', { min: S_RANGE[0], max: S_RANGE[1] }) : t('input.scoopHint')}
            </p>
          </div>
        </section>

        {/* 결과 */}
        <div className="lg:col-span-2 min-w-0 space-y-4">
          <section id="formula-amount-result" className="ui-card p-6 space-y-5 scroll-mt-20 min-w-0" aria-labelledby="fa-result-label">
            <div aria-live="polite">
              <p id="fa-result-label" className="text-sm text-sub">{t('result.labelFor', { age: monthLabel, w: fmt(s.w) })}</p>
              <p className="mt-1 text-3xl font-bold text-fg tabular-nums">{r.daily[0] === r.daily[1] ? t('result.about', { v: dailyText }) : dailyText}</p>
              <p className="mt-1 text-sm text-body tabular-nums">{t('result.basis', { w: fmt(s.w), k: span(k[0], k[1]) })}</p>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-subtle rounded-2xl px-4 py-3 min-w-0">
                <dt className="text-xs text-sub">{t('result.feed')}</dt>
                <dd className="mt-0.5 text-base font-semibold text-fg tabular-nums">{feedText}</dd>
                <dd className="text-xs text-muted tabular-nums">{t('result.feedSub', { n: r.n })}</dd>
              </div>
              <div className="bg-subtle rounded-2xl px-4 py-3 min-w-0">
                <dt className="text-xs text-sub">{t('result.interval')}</dt>
                <dd className="mt-0.5 text-base font-semibold text-fg tabular-nums">{t('result.intervalVal', { h: fmt(r.interval) })}</dd>
                <dd className="text-xs text-muted">{t('result.intervalSub')}</dd>
              </div>
              <div className="bg-subtle rounded-2xl px-4 py-3 min-w-0">
                <dt className="text-xs text-sub">{t('result.scoops')}</dt>
                <dd className="mt-0.5 text-base font-semibold text-fg tabular-nums">{scoopText}</dd>
                <dd className="text-xs text-muted tabular-nums">{t('result.scoopsSub', { ml: span(r.feed[0], r.feed[1]), s: s.s })}</dd>
              </div>
            </dl>

            {r.over && <p className={warnCls} role="status">{t('result.over', { cap: DAILY_CAP })}</p>}
            {r.feedAboveRow && r.row.perFeed && <p className={warnCls}>{t('result.feedAboveRow', { lo: r.row.perFeed[0], hi: r.row.perFeed[1] })}</p>}

            {r.b > 0 && (
              <div className="bg-subtle rounded-2xl px-4 py-3 space-y-1">
                <h3 className="text-sm font-semibold text-fg">{t('result.mixed.title')}</h3>
                {r.formulaTimes > 0 ? (
                  <p className="text-base font-semibold text-fg tabular-nums">
                    {t('result.mixed.body', { times: r.formulaTimes, feed: feedText, daily: `${span(r.mixedDaily[0], r.mixedDaily[1])} mL` })}
                  </p>
                ) : <p className="text-sm text-body">{t('result.mixed.allBreast')}</p>}
                <p className="text-xs text-muted">{t('result.mixed.note')}</p>
              </div>
            )}

            <ul className="space-y-1.5 text-sm text-body">
              {s.m === 0 && <li>{t('result.firstWeek')}</li>}
              {s.m >= 6 && <li>{t('result.solids')}</li>}
              <li className="tabular-nums">{r.aap ? t('result.aap', { daily: fmt(r.aap.daily), feed: fmt(r.aap.feed) }) : t('result.aapOlder')}</li>
            </ul>

            {/* 아이사랑 월령 표의 해당 줄 */}
            <div className="rounded-2xl border border-line p-4 space-y-3">
              <h3 className="text-sm font-semibold text-fg">{t('result.row.title', { row: rowLabel })}</h3>
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
                {[
                  ['times', t('result.row.timesVal', { v: span(r.row.times[0], r.row.times[1]) })],
                  ['interval', rowInterval],
                  ['perFeed', r.row.perFeed ? `${span(r.row.perFeed[0], r.row.perFeed[1])} mL` : '—'],
                  ['daily', r.row.daily ? `${span(r.row.daily[0], r.row.daily[1])} mL` : '—'],
                ].map(([key, v]) => (
                  <div key={key} className="min-w-0">
                    <dt className="text-xs text-sub">{t(`guide.table.cols.${key}`)}</dt>
                    <dd className="text-sm font-semibold text-fg tabular-nums [overflow-wrap:anywhere]">{v}</dd>
                  </div>
                ))}
              </dl>
              {r.row.daily && <p className="text-xs text-muted">{t('result.row.solidsNote')}</p>}
            </div>
          </section>

          <ShareResult
            fileName="formula-amount"
            card={{
              tool: t('share.tool'),
              label: t('result.labelFor', { age: monthLabel, w: fmt(s.w) }),
              headline: t('share.headline', { daily: dailyText }),
              sub: t('share.sub', { feed: feedText, n: r.n }),
              rows: [
                { label: t('result.interval'), value: t('result.intervalVal', { h: fmt(r.interval) }) },
                { label: t('result.scoops'), value: `${scoopText} (${t('share.perScoop', { s: s.s })})` },
                ...(r.b > 0 && r.formulaTimes > 0 ? [{ label: t('result.mixed.title'), value: t('share.mixed', { times: r.formulaTimes, daily: `${span(r.mixedDaily[0], r.mixedDaily[1])} mL` }) }] : []),
              ],
            }}
            text={t('share.text', { age: monthLabel, w: fmt(s.w), daily: dailyText, feed: feedText, n: r.n })}
          />

          <section className="bg-amber-50 text-amber-800 rounded-2xl p-5 text-sm space-y-1" aria-labelledby="fa-care">
            <h2 id="fa-care" className="font-semibold">{t('care.title')}</h2>
            <p>{t('care.body')}</p>
          </section>
        </div>
      </div>

      {/* 가이드 */}
      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>

        <section className="min-w-0">
          <h3 className="font-semibold text-fg mb-3">{t('guide.table.title')}</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-sm">
              <caption className="sr-only">{t('guide.table.title')}</caption>
              <thead>
                <tr className="border-b border-line text-left text-sub">
                  {TABLE_COLS.map((c) => <th key={c} scope="col" className="py-2 pr-3 font-medium whitespace-nowrap">{t(`guide.table.cols.${c}`)}</th>)}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.id} className={`border-b border-line ${row.id === r.row.id ? 'bg-primary-soft text-primary font-semibold' : 'text-body'}`}>
                    <td className="py-2 pr-3 whitespace-nowrap">{t(`rows.${row.id}.label`)}</td>
                    <td className="py-2 pr-3 tabular-nums whitespace-nowrap">{t('result.row.timesVal', { v: span(row.times[0], row.times[1]) })}</td>
                    <td className="py-2 pr-3">{t(`rows.${row.id}.interval`)}</td>
                    <td className="py-2 pr-3 tabular-nums whitespace-nowrap">{row.perFeed ? `${span(row.perFeed[0], row.perFeed[1])} mL` : '—'}</td>
                    <td className="py-2 pr-3 tabular-nums whitespace-nowrap">{row.daily ? `${span(row.daily[0], row.daily[1])} mL` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted">{t('guide.table.note')}</p>
        </section>

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
            {SOURCE_KEYS.map((key) => (
              <li key={key}><a href={SOURCES[key]} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline [overflow-wrap:anywhere]">{t(`sources.${key}`)}</a></li>
            ))}
          </ul>
          <p className="text-xs text-muted">{t('sources.method')}</p>
          <p className="text-xs text-muted">{t('sources.asOf', { date: CHECKED })}</p>
        </section>
      </div>
    </div>
  )
}
