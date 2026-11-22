'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/sizeConverter'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useHydrated } from '@/hooks/useHydrated'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import { item, limitUsd } from '@/utils/customsDuty'
import {
  CHECKED, DEFAULT, GROUPS, SOURCES, TABLES, cellsOf, defaultOf, groupOf, options, parseState, recommend, rowOf, selectedRow,
  toQuery, unisexW, usMenOf, type Group, type State, type TabId,
} from '@/utils/sizeConverter'

type Kind = 'shoe' | 'chest' | 'waist' | 'finger'
const KIND: Record<TabId, Kind> = { m: 'shoe', w: 'shoe', k: 'shoe', mt: 'chest', wt: 'chest', pt: 'waist', r: 'finger' }
const UNIT: Record<Kind, string> = { shoe: 'mm', chest: 'cm', waist: 'cm', finger: 'mm' }
const GROUP_KEYS = Object.keys(GROUPS) as Group[]
const GUIDE = ['measureShoe', 'between', 'kids', 'cloth', 'ring'] as const
const SOURCE_KEYS = Object.keys(SOURCES) as (keyof typeof SOURCES)[]

const fmt = (n: number) => String(Math.round(n * 100) / 100)
const decimal = (v: string) => v.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1').slice(0, 6)
const seg = (on: boolean) => `min-h-11 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
const labelCls = 'block text-sm font-medium text-body mb-1.5'
const warnCls = 'bg-amber-50 text-amber-800 rounded-2xl px-4 py-3 text-sm'

export default function SizeConverter() {
  const t = useTranslations('sizeConverter')
  const sp = useSearchParams()
  const hydrated = useHydrated()

  // URL → 선택. 하이드레이션 전에는 기본값이라 첫 렌더가 정적 HTML 과 같다. 사용자가 고르면 그 값이 우선
  const fromUrl = useMemo(() => (hydrated ? parseState((k) => sp.get(k)) : DEFAULT), [hydrated, sp])
  const [edited, setEdited] = useState<State | null>(null)
  const s = edited ?? fromUrl
  const [measure, setMeasure] = useState('')

  const tb = TABLES[s.t]
  const ci = tb.cols.indexOf(s.s)
  const ri = selectedRow(s)
  const row = cellsOf(s.t, ri)
  const group = groupOf(s.t)
  const kind = KIND[s.t]
  const opts = useMemo(() => options(s.t, ci), [s.t, ci])

  const commit = (next: State) => {
    setEdited(next)
    const qs = toQuery(next)
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`)
  }
  // 이 줄을 고른다. 지금 체계의 표기가 다른 줄과 겹치면(반지 US 등) 첫 열로 바꿔 그 줄을 정확히 고른다
  const selectRow = (i: number) => {
    const v = tb.rows[i].cells[ci]
    commit(rowOf(s.t, ci, v) === i ? { ...s, v } : { t: s.t, s: tb.cols[0], v: tb.rows[i].cells[0] })
  }
  const switchTab = (tab: TabId) => {
    if (tab === s.t) return
    setMeasure('')
    commit(defaultOf(tab))
  }

  const tabName = t(`tabLong.${s.t}`)
  const headline = t(`headline.${s.t}`, row)
  const resultLabel = t('result.label', { tab: tabName, col: t(`cols.${s.s}`), v: s.v })
  const mText = measure.trim()
  const rec = mText === '' ? null : recommend(s.t, Number(mText))
  const usM = s.t === 'm' ? Number(row.usM) : s.t === 'w' ? usMenOf(Number(row.mm)) : null
  const notes = t.raw(`notes.${s.t}`) as string[]
  const faq = t.raw('guide.faq.items') as { q: string; a: string }[]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <section className="ui-card p-6 space-y-6 min-w-0" aria-labelledby="sc-input">
          <MobileResultLink href="#size-converter-result" label={resultLabel} value={t(`short.${s.t}`, row)} />
          <h2 id="sc-input" className="text-lg font-semibold text-fg">{t('input.title')}</h2>

          <div>
            <p id="sc-group" className={labelCls}>{t('input.group')}</p>
            <div role="group" aria-labelledby="sc-group" className="grid grid-cols-3 gap-2">
              {GROUP_KEYS.map((g) => (
                <button key={g} type="button" aria-pressed={group === g} onClick={() => group !== g && switchTab(GROUPS[g][0])} className={seg(group === g)}>
                  {t(`group.${g}`)}
                </button>
              ))}
            </div>
          </div>

          {GROUPS[group].length > 1 && (
            <div>
              <p id="sc-tab" className={labelCls}>{t(`input.sub.${group}`)}</p>
              <div role="group" aria-labelledby="sc-tab" className="flex flex-wrap gap-2">
                {GROUPS[group].map((tab) => (
                  <button key={tab} type="button" aria-pressed={s.t === tab} onClick={() => switchTab(tab)} className={seg(s.t === tab)}>
                    {t(`tab.${tab}`)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <label htmlFor="sc-system" className={labelCls}>{t('input.system')}</label>
              <select id="sc-system" value={s.s}
                onChange={(e) => { const j = tb.cols.indexOf(e.target.value); commit({ t: s.t, s: e.target.value, v: tb.rows[ri].cells[j] }) }}
                className="ui-field w-full min-h-11 px-3 py-3 text-base">
                {tb.cols.map((c) => <option key={c} value={c}>{t(`cols.${c}`)}</option>)}
              </select>
            </div>
            <div className="min-w-0">
              <label htmlFor="sc-size" className={labelCls}>{t('input.size')}</label>
              <select id="sc-size" value={s.v} onChange={(e) => commit({ ...s, v: e.target.value })}
                className="ui-field w-full min-h-11 px-3 py-3 text-base tabular-nums">
                {opts.map((o) => <option key={o.v} value={o.v}>{o.v}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="sc-measure" className={labelCls}>{t(`measure.${kind}.label`)}</label>
            <div className="relative">
              <input
                id="sc-measure" inputMode="decimal" autoComplete="off" value={measure} placeholder={t(`measure.${kind}.placeholder`)}
                onChange={(e) => {
                  const v = decimal(e.target.value)
                  setMeasure(v)
                  const r = v.trim() === '' ? null : recommend(s.t, Number(v))
                  if (r?.i != null) selectRow(r.i)
                }}
                aria-describedby="sc-measure-hint"
                className="ui-field w-full min-h-11 px-4 py-3 pr-14 text-base tabular-nums"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted pointer-events-none">{UNIT[kind]}</span>
            </div>
            <div id="sc-measure-hint" aria-live="polite" className="mt-1.5 space-y-1 text-xs">
              {rec === null ? <p className="text-muted">{t(`measure.${kind}.hint`)}</p>
                : rec.i !== null ? (
                  <>
                    <p className="text-body font-medium">{t('measure.result', { x: fmt(Number(mText)), unit: UNIT[kind], size: t(`headline.${s.t}`, cellsOf(s.t, rec.i)) })}</p>
                    <p className="text-muted">{t(`measure.${kind}.tip`)}</p>
                  </>
                ) : (
                  <p className="inline-block rounded-lg bg-amber-50 px-2 py-1 text-amber-800">
                    {rec.out === 'high' ? t('measure.high') : rec.out === 'low' ? t('measure.low') : t('measure.err')}
                  </p>
                )}
            </div>
          </div>
        </section>

        {/* 결과 */}
        <div className="lg:col-span-2 min-w-0 space-y-4">
          <section id="size-converter-result" className="ui-card p-6 space-y-5 scroll-mt-20 min-w-0" aria-labelledby="sc-result-label">
            <div aria-live="polite">
              <p id="sc-result-label" className="text-sm text-sub">{resultLabel}</p>
              <p className="mt-1 text-2xl font-bold text-fg tabular-nums [overflow-wrap:anywhere]">{headline}</p>
            </div>

            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {tb.cols.map((c) => (
                <div key={c} className={`rounded-2xl px-4 py-3 min-w-0 ${c === s.s ? 'bg-primary-soft' : 'bg-subtle'}`}>
                  <dt className={`text-xs ${c === s.s ? 'text-primary' : 'text-sub'}`}>{t(`cols.${c}`)}</dt>
                  <dd className="mt-0.5 text-2xl font-bold text-fg tabular-nums [overflow-wrap:anywhere]">{row[c]}</dd>
                </div>
              ))}
            </dl>

            {usM !== null && (
              <p className="text-sm text-body">{t(`result.unisex.${s.t}`, { m: fmt(usM), w: fmt(unisexW(usM)) })}</p>
            )}
            <ul className="space-y-1 text-xs text-muted list-disc pl-5">
              {notes.map((x) => <li key={x}>{x}</li>)}
            </ul>
            <p className={warnCls}>{t(`warn.${group}`)}</p>
          </section>

          <ShareResult
            fileName="size-converter"
            card={{
              tool: t('share.tool'),
              label: resultLabel,
              headline,
              rows: tb.cols.map((c) => ({ label: t(`cols.${c}`), value: row[c] })),
            }}
            text={t('share.text', { tab: tabName, headline })}
          />
        </div>
      </div>

      {/* 전체 변환표 */}
      <section className="ui-card p-6 space-y-4 min-w-0" aria-labelledby="sc-table">
        <div>
          <h2 id="sc-table" className="text-lg font-semibold text-fg">{t('table.title', { tab: tabName })}</h2>
          <p className="text-sm text-muted mt-1">{t('table.hint')}</p>
        </div>
        <div className="overflow-x-auto -mx-2 px-2">
          <table className="w-full min-w-[30rem] text-sm">
            <caption className="sr-only">{t('table.caption', { tab: tabName })}</caption>
            <thead>
              <tr className="border-b border-line text-left text-sub">
                {tb.cols.map((c) => <th key={c} scope="col" className="py-2 pr-3 font-medium whitespace-nowrap">{t(`cols.${c}`)}</th>)}
              </tr>
            </thead>
            <tbody>
              {tb.rows.map((r, i) => (
                <tr key={r.cells[0]} className={`border-b border-line ${i === ri ? 'bg-primary-soft text-primary font-semibold' : 'text-body'}`}>
                  <th scope="row" className="pr-3 text-left [font-weight:inherit]">
                    <button type="button" aria-pressed={i === ri} aria-label={t('table.selectAria', { v: r.cells[0] })} onClick={() => selectRow(i)}
                      className="min-h-11 w-full text-left tabular-nums hover:underline">
                      {r.cells[0]}
                    </button>
                  </th>
                  {r.cells.slice(1).map((c, j) => <td key={j} className="py-2 pr-3 tabular-nums whitespace-nowrap">{c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted">{t(`table.basis.${s.t}`)}</p>
      </section>

      {/* 직구 팁 */}
      <section className="ui-card p-6 space-y-3" aria-labelledby="sc-tips">
        <h2 id="sc-tips" className="text-lg font-semibold text-fg">{t('tips.title')}</h2>
        <ul className="list-disc pl-5 space-y-2 text-sm text-sub">
          <li>
            {t('tips.duty', { us: limitUsd('us', 'list'), other: limitUsd('other', 'list'), rate: item('shoes').rate })}{' '}
            <Link href="/customs-duty/" className="text-primary font-medium hover:underline">{t('tips.dutyLink')}</Link>
          </li>
          {(t.raw('tips.items') as string[]).map((x) => <li key={x}>{x}</li>)}
        </ul>
      </section>

      {/* 가이드 */}
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
