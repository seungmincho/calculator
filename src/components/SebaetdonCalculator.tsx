'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Copy, Minus, Plus, X } from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/sebaetdonCalculator'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useHydrated } from '@/hooks/useHydrated'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import { todayKST, weekday } from '@/utils/dday'
import {
  AMT_MAX, AMT_MIN, BANDS, BUDGET_MAX, CHECKED, DEFAULT, N_MAX, NOTES, REF, RELS, ROWS_MAX, STORE_KEY,
  calc, cleanRel, defaultRel, hasQuery, isPresetRel, nextSeollal, notesFor, parseQuery, parseSaved, toQuery,
  type Band, type Row, type State,
} from '@/utils/sebaetdon'

const num = (n: number) => n.toLocaleString('ko-KR')
const manNum = (n: number) => (Math.round(n / 1000) / 10).toLocaleString('ko-KR', { maximumFractionDigits: 1 })
const decimal = (v: string) => v.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1').replace(/^(\d*\.\d).*$/, '$1').slice(0, 7)
/** 만원 입력 → 원(1천원 단위). 범위 밖·빈 값은 null */
const toWon = (s: string, lo: number, hi: number) => {
  if (s.trim() === '' || s === '.') return null
  const won = Math.round(Number(s) * 10) * 1000
  return Number.isFinite(won) && won >= lo && won <= hi ? won : null
}

const labelCls = 'block text-sm font-medium text-body mb-1.5'
const unitCls = 'absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted pointer-events-none'
const chip = (on: boolean) => `min-h-11 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
const GUIDE = ['exchange', 'tips', 'origin'] as const

export default function SebaetdonCalculator() {
  const t = useTranslations('sebaetdonCalculator')
  const sp = useSearchParams()
  const hydrated = useHydrated()

  // 첫 렌더는 기본 명단(정적 HTML 과 같게). 하이드레이션 뒤 한 번: 링크 값이 있으면 그것, 없으면 이 기기 저장값
  const [loaded, setLoaded] = useState<State | null>(null)
  if (hydrated && loaded === null) {
    const get = (k: string) => sp.get(k)
    let next = DEFAULT
    if (hasQuery(get)) next = parseQuery(get)
    else { try { next = parseSaved(window.localStorage.getItem(STORE_KEY)) ?? DEFAULT } catch { /* 저장소 차단 */ } }
    setLoaded(next)
  }
  const [edited, setEdited] = useState<State | null>(null)
  const s = edited ?? loaded ?? DEFAULT

  // 사용자가 바꿀 때만 저장하고 URL 을 맞춘다
  const commit = (next: State) => {
    setEdited(next)
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(next)) } catch { /* 저장소 차단 */ }
    const qs = toQuery(next)
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`)
  }
  const setRow = (i: number, patch: Partial<Row>) => commit({ ...s, rows: s.rows.map((r, j) => (j === i ? { ...r, ...patch } : r)) })

  const [amtDraft, setAmtDraft] = useState<Record<number, string>>({})
  // '직접 입력'을 고른 줄. 없으면 'c'·'s' 처럼 프리셋 코드와 같은 첫 글자를 치는 순간 입력칸이 사라진다
  const [customRows, setCustomRows] = useState<ReadonlySet<number>>(new Set())
  const [budgetDraft, setBudgetDraft] = useState<string | null>(null)
  const [wordBand, setWordBand] = useState<Band>('pre')
  const [copied, setCopied] = useState<string | null>(null)

  const r = calc(s)
  const shareQs = toQuery(s)
  const won = (n: number) => t('fmt.won', { n: num(n) })
  const man = (n: number) => t('fmt.man', { n: manNum(n), won: num(n) })
  const range = (b: Band) => t('fmt.range', { lo: manNum(REF[b][0]), hi: manNum(REF[b][1]), loWon: num(REF[b][0]), hiWon: num(REF[b][1]) })
  const relName = (rel: string) => (isPresetRel(rel) ? t(`rel.${rel}`) : rel.trim() || t('rel.custom'))
  const noteLabel = (i: number) => t(`notes.b${NOTES[i]}`)
  const notesText = (counts: number[]) =>
    counts.map((k, i) => (k ? t('notes.item', { name: noteLabel(i), n: k }) : '')).filter(Boolean).join(' · ')

  // 다음 설날 D-day: 오늘 날짜는 하이드레이션 뒤에만
  const seollal = hydrated ? nextSeollal(todayKST()) : null
  const weekdays = t.raw('dday.weekdays') as string[]

  const budgetText = budgetDraft ?? (s.budget ? manNum(s.budget).replace(/,/g, '') : '')
  const budgetBad = budgetText.trim() !== '' && toWon(budgetText, 1000, BUDGET_MAX) === null

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(text) } catch { setCopied(null) }
    setTimeout(() => setCopied((c) => (c === text ? null : c)), 2000)
  }

  const faq = t.raw('guide.faq.items') as { q: string; a: string }[]
  const sources = t.raw('sources.items') as { label: string; url: string }[]
  const words = t.raw(`words.items.${wordBand}`) as string[]
  const resultLabel = t('result.label')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle')}</p>
        {seollal && (
          <p className="mt-3 inline-flex flex-wrap items-baseline gap-x-2 rounded-xl bg-subtle px-3 py-2 text-sm text-body tabular-nums">
            <span>{t('dday.label', { y: seollal.date.slice(0, 4), m: Number(seollal.date.slice(5, 7)), d: Number(seollal.date.slice(8, 10)), w: weekdays[weekday(seollal.date)] })}</span>
            <span className="font-semibold text-primary">{seollal.days === 0 ? t('dday.today') : t('dday.left', { n: seollal.days })}</span>
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* 입력: 받을 사람 명단 */}
        <section className="lg:col-span-3 ui-card p-6 space-y-5 min-w-0" aria-labelledby="sbd-input">
          <MobileResultLink href="#sebaetdon-result" label={resultLabel} value={won(r.total)} />
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 id="sbd-input" className="text-lg font-semibold text-fg">{t('input.title')}</h2>
              <p className="text-sm text-muted mt-1">{t('input.desc')}</p>
            </div>
            <button type="button" onClick={() => { setAmtDraft({}); setCustomRows(new Set()); commit({ rows: DEFAULT.rows.map((x) => ({ ...x })), budget: s.budget }) }}
              className="ui-btn-soft min-h-11 px-4 py-2 text-sm">{t('input.reset')}</button>
          </div>

          <ul className="space-y-3">
            {s.rows.map((row, i) => {
              const [lo, hi, ref] = REF[row.band]
              const draft = amtDraft[i]
              const amtText = draft ?? manNum(row.amt).replace(/,/g, '')
              const amtBad = toWon(amtText, AMT_MIN, AMT_MAX) === null
              const custom = customRows.has(i) || !isPresetRel(row.rel)
              const id = `sbd-row-${i}`
              return (
                <li key={i} className="bg-subtle rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-fg">{t('input.rowTitle', { n: i + 1 })}</p>
                    <button type="button" disabled={s.rows.length <= 1}
                      onClick={() => { setAmtDraft({}); setCustomRows(new Set()); commit({ ...s, rows: s.rows.filter((_, j) => j !== i) }) }}
                      aria-label={t('input.removeAria', { n: i + 1 })}
                      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-sub hover:bg-soft disabled:opacity-40">
                      <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="min-w-0">
                      <label htmlFor={`${id}-rel`} className={labelCls}>{t('input.rel')}</label>
                      <select id={`${id}-rel`} value={custom ? 'custom' : row.rel}
                        onChange={(e) => {
                          const v = e.target.value
                          setCustomRows((c) => { const n = new Set(c); if (v === 'custom') n.add(i); else n.delete(i); return n })
                          setRow(i, { rel: v === 'custom' ? '' : v })
                        }}
                        className="ui-field w-full min-h-11 px-3 py-2.5 text-base">
                        {RELS.map((k) => <option key={k} value={k}>{t(`rel.${k}`)}</option>)}
                        <option value="custom">{t('rel.custom')}</option>
                      </select>
                      {custom && (
                        <input aria-label={t('input.relCustomAria', { n: i + 1 })} value={row.rel} maxLength={12} placeholder={t('input.relCustomPh')}
                          onChange={(e) => setRow(i, { rel: cleanRel(e.target.value) })}
                          className="ui-field w-full min-h-11 px-3 py-2.5 text-base mt-2" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <label htmlFor={`${id}-band`} className={labelCls}>{t('input.band')}</label>
                      <select id={`${id}-band`} value={row.band}
                        onChange={(e) => {
                          const band = e.target.value as Band
                          setAmtDraft((d) => { const n = { ...d }; delete n[i]; return n })
                          setRow(i, { band, amt: REF[band][2], rel: row.rel === defaultRel(row.band) ? defaultRel(band) : row.rel })
                        }}
                        aria-describedby={`${id}-hint`}
                        className="ui-field w-full min-h-11 px-3 py-2.5 text-base">
                        {BANDS.map((b) => <option key={b} value={b}>{t(`band.${b}`)}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 items-end">
                    <div className="min-w-0">
                      <label htmlFor={`${id}-amt`} className={labelCls}>{t('input.amount')}</label>
                      <div className="relative">
                        <input id={`${id}-amt`} inputMode="decimal" autoComplete="off" value={amtText}
                          onChange={(e) => {
                            const v = decimal(e.target.value)
                            setAmtDraft((d) => ({ ...d, [i]: v }))
                            const w = toWon(v, AMT_MIN, AMT_MAX)
                            if (w !== null) setRow(i, { amt: w })
                          }}
                          onBlur={() => setAmtDraft((d) => { const n = { ...d }; delete n[i]; return n })}
                          aria-invalid={amtBad || undefined} aria-describedby={`${id}-hint`}
                          className="ui-field w-full min-h-11 px-4 py-2.5 pr-14 text-base tabular-nums" />
                        <span className={unitCls}>{t('input.amountUnit')}</span>
                      </div>
                    </div>
                    <div>
                      <p className={labelCls} id={`${id}-n`}>{t('input.count')}</p>
                      <div role="group" aria-labelledby={`${id}-n`} className="flex items-center rounded-xl bg-surface border border-line">
                        <button type="button" disabled={row.n <= 1} onClick={() => setRow(i, { n: row.n - 1 })}
                          aria-label={t('input.minusAria')} className="inline-flex min-h-11 min-w-11 items-center justify-center text-body disabled:opacity-40">
                          <Minus className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <span className="min-w-8 text-center text-base font-semibold text-fg tabular-nums" aria-live="polite">{row.n}</span>
                        <button type="button" disabled={row.n >= N_MAX} onClick={() => setRow(i, { n: row.n + 1 })}
                          aria-label={t('input.plusAria')} className="inline-flex min-h-11 min-w-11 items-center justify-center text-body disabled:opacity-40">
                          <Plus className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p id={`${id}-hint`} className={amtBad ? 'rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-800' : 'text-xs text-muted tabular-nums'}>
                      {amtBad
                        ? t('input.amountErr', { min: manNum(AMT_MIN), max: manNum(AMT_MAX) })
                        : t('input.refHint', { range: range(row.band), ref: man(ref) })}
                    </p>
                    {!amtBad && row.amt !== ref && (
                      <button type="button" onClick={() => { setAmtDraft((d) => { const n = { ...d }; delete n[i]; return n }); setRow(i, { amt: ref }) }}
                        className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('input.useRef', { ref: man(ref) })}</button>
                    )}
                  </div>
                  <p className="text-sm text-body tabular-nums">
                    {t('input.subtotal', { amt: won(row.amt), n: row.n, sum: won(row.amt * row.n) })}
                    {(row.amt < lo || row.amt > hi) && !amtBad && <span className="ml-1 text-xs text-muted">{t(row.amt < lo ? 'input.belowRef' : 'input.aboveRef')}</span>}
                  </p>
                </li>
              )
            })}
          </ul>

          <div>
            <p id="sbd-add" className={labelCls}>{t('input.add')}</p>
            <div role="group" aria-labelledby="sbd-add" className="flex flex-wrap gap-2">
              {BANDS.map((b) => (
                <button key={b} type="button" disabled={s.rows.length >= ROWS_MAX}
                  onClick={() => commit({ ...s, rows: [...s.rows, { rel: defaultRel(b), band: b, n: 1, amt: REF[b][2] }] })}
                  className="ui-btn-soft min-h-11 px-3 py-2 text-sm disabled:opacity-40">
                  {t('input.addBand', { band: t(`band.${b}`), ref: man(REF[b][2]) })}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted">{t('input.addHint', { max: ROWS_MAX })}</p>
          </div>

          <div>
            <label htmlFor="sbd-budget" className={labelCls}>{t('input.budget')}</label>
            <div className="relative">
              <input id="sbd-budget" inputMode="decimal" autoComplete="off" value={budgetText} placeholder={t('input.budgetPh')}
                onChange={(e) => {
                  const v = decimal(e.target.value)
                  setBudgetDraft(v)
                  if (v.trim() === '') commit({ ...s, budget: 0 })
                  else { const w = toWon(v, 1000, BUDGET_MAX); if (w !== null) commit({ ...s, budget: w }) }
                }}
                onBlur={() => setBudgetDraft(null)}
                aria-invalid={budgetBad || undefined} aria-describedby="sbd-budget-hint"
                className="ui-field w-full min-h-11 px-4 py-2.5 pr-14 text-base tabular-nums" />
              <span className={unitCls}>{t('input.amountUnit')}</span>
            </div>
            <p id="sbd-budget-hint" className={budgetBad ? 'mt-1.5 rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-800' : 'mt-1.5 text-xs text-muted'}>
              {budgetBad ? t('input.budgetErr') : t('input.budgetHint')}
            </p>
          </div>
        </section>

        {/* 결과 */}
        <div className="lg:col-span-2 min-w-0 space-y-4">
          <section id="sebaetdon-result" className="ui-card p-6 space-y-5 scroll-mt-20 min-w-0" aria-labelledby="sbd-result-label">
            <div aria-live="polite">
              <p id="sbd-result-label" className="text-sm text-sub">{resultLabel}</p>
              <p className="mt-1 text-3xl font-bold text-fg tabular-nums">{won(r.total)}</p>
              <p className="mt-1 text-sm text-body tabular-nums">{t('result.sub', { people: r.people, env: r.envelopes, avg: won(r.avg) })}</p>
              {r.left !== null && (r.left >= 0
                ? <p className="mt-3 bg-subtle rounded-2xl px-4 py-3 text-sm text-body tabular-nums">{t('result.budgetLeft', { budget: won(s.budget), left: won(r.left) })}</p>
                : <p className="mt-3 bg-amber-50 text-amber-800 rounded-2xl px-4 py-3 text-sm tabular-nums">{t('result.budgetOver', { budget: won(s.budget), over: won(-r.left) })}</p>)}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-fg">{t('notes.title')}</h3>
              <dl className="mt-2 grid grid-cols-2 gap-2">
                {NOTES.map((v, i) => (
                  <div key={v} className={`rounded-2xl px-4 py-3 ${r.notes[i] ? 'bg-primary-soft' : 'bg-subtle'}`}>
                    <dt className={`text-xs ${r.notes[i] ? 'text-primary' : 'text-sub'}`}>{noteLabel(i)}</dt>
                    <dd className="mt-0.5 text-lg font-bold text-fg tabular-nums">{t('notes.sheets', { n: r.notes[i] })}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-2 text-xs text-muted tabular-nums">{t('notes.total', { n: r.sheets, env: r.envelopes })}</p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-fg">{t('result.byBand')}</h3>
              <ul className="mt-2 divide-y divide-line border-y border-line">
                {r.byBand.map((b) => (
                  <li key={b.band} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="text-body">{t(`band.${b.band}`)} <span className="text-sub tabular-nums">{t('result.people', { n: b.people })}</span></span>
                    <span className="font-semibold text-fg tabular-nums">{won(b.total)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-fg">{t('result.envelopes')}</h3>
              <ul className="mt-2 space-y-1.5 text-sm">
                {s.rows.map((row, i) => (
                  <li key={i} className="text-body">
                    <span className="font-medium text-fg">{relName(row.rel)}</span>
                    <span className="text-sub"> · {t(`band.${row.band}`)} · {t('result.envCount', { n: row.n })}</span>
                    <span className="block text-xs text-muted tabular-nums">{won(row.amt)} = {notesText(notesFor(row.amt))}</span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-xs text-muted">{t('result.note')}</p>
          </section>

          {/* 이 기기 저장값으로 연 명단은 주소창에 쿼리가 없어 화면 명단으로 링크를 만든다 */}
          <ShareResult
            url={hydrated ? `${window.location.origin}${window.location.pathname}${shareQs ? `?${shareQs}` : ''}` : undefined}
            fileName="sebaetdon"
            card={{
              tool: t('share.tool'),
              label: t('share.label', { n: r.people }),
              headline: won(r.total),
              sub: notesText(r.notes),
              rows: [
                ...r.byBand.slice(0, 4).map((b) => ({ label: `${t(`band.${b.band}`)} ${t('result.people', { n: b.people })}`, value: won(b.total) })),
                ...(r.left !== null ? [{ label: t('share.budget'), value: r.left >= 0 ? t('share.left', { n: won(r.left) }) : t('share.over', { n: won(-r.left) }) }] : []),
              ],
            }}
            text={t('share.text', { n: r.people, total: won(r.total) })}
          />

          <section className="ui-card p-6 space-y-3" aria-labelledby="sbd-tax">
            <h2 id="sbd-tax" className="text-lg font-semibold text-fg">{t('tax.title')}</h2>
            <ul className="list-disc pl-5 space-y-2 text-sm text-sub">
              {(t.raw('tax.items') as string[]).map((x) => <li key={x}>{x}</li>)}
            </ul>
            <Link href="/inheritance-gift-tax/" className="ui-btn-soft inline-flex min-h-11 items-center px-4 py-2 text-sm">{t('tax.link')}</Link>
          </section>
        </div>
      </div>

      {/* 덕담 봉투 문구 */}
      <section className="ui-card p-6 space-y-4" aria-labelledby="sbd-words">
        <div>
          <h2 id="sbd-words" className="text-lg font-semibold text-fg">{t('words.title')}</h2>
          <p className="text-sm text-muted mt-1">{t('words.desc')}</p>
        </div>
        <div role="group" aria-label={t('words.bandAria')} className="flex flex-wrap gap-2">
          {BANDS.map((b) => (
            <button key={b} type="button" aria-pressed={wordBand === b} onClick={() => setWordBand(b)} className={chip(wordBand === b)}>{t(`band.${b}`)}</button>
          ))}
        </div>
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {words.map((w) => (
            <li key={w} className="bg-subtle rounded-2xl p-4 flex flex-col justify-between gap-3">
              <p className="text-sm text-body leading-relaxed">{w}</p>
              <button type="button" onClick={() => copy(w)} className="ui-btn-soft inline-flex min-h-11 items-center justify-center gap-1.5 px-3 py-2 text-sm self-start">
                {copied === w ? <Check className="w-4 h-4" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
                {copied === w ? t('words.copied') : t('words.copy')}
              </button>
            </li>
          ))}
        </ul>
        <p className="sr-only" aria-live="polite">{copied ? t('words.copied') : ''}</p>
      </section>

      {/* 가이드 */}
      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>

        <section>
          <h3 className="font-semibold text-fg mb-1">{t('guide.ref.title')}</h3>
          <p className="text-sm text-muted mb-3">{t('guide.ref.desc')}</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-sm">
              <caption className="sr-only">{t('guide.ref.title')}</caption>
              <thead>
                <tr className="border-b border-line text-left text-sub">
                  <th scope="col" className="py-2 pr-3 font-medium">{t('guide.ref.cols.band')}</th>
                  <th scope="col" className="py-2 pr-3 font-medium">{t('guide.ref.cols.range')}</th>
                  <th scope="col" className="py-2 pr-3 font-medium">{t('guide.ref.cols.ref')}</th>
                  <th scope="col" className="py-2 font-medium">{t('guide.ref.cols.basis')}</th>
                </tr>
              </thead>
              <tbody>
                {BANDS.map((b) => (
                  <tr key={b} className="border-b border-line align-top">
                    <th scope="row" className="py-2 pr-3 font-medium text-body text-left whitespace-nowrap">{t(`band.${b}`)}</th>
                    <td className="py-2 pr-3 text-body tabular-nums whitespace-nowrap">{range(b)}</td>
                    <td className="py-2 pr-3 font-semibold text-fg tabular-nums whitespace-nowrap">{man(REF[b][2])}</td>
                    <td className="py-2 text-sub">{t(`guide.ref.basis.${b}`)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted">{t('guide.ref.note')}</p>
        </section>

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
            {sources.map((x) => (
              <li key={x.url}><a href={x.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline [overflow-wrap:anywhere]">{x.label}</a></li>
            ))}
          </ul>
          <p className="text-xs text-muted">{t('sources.asOf', { date: CHECKED })}</p>
        </section>
        <p className="text-xs text-muted">{t('disclaimer')}</p>
      </div>
    </div>
  )
}
