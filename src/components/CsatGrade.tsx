'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/csatGrade'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useHydrated } from '@/hooks/useHydrated'
import ShareResult from '@/components/ShareResult'
import CsatScoreRecords from '@/components/CsatScoreRecords'
import CsatGoalConditions from '@/components/CsatGoalConditions'
import type { CsatScoreSnapshot } from '@/utils/csatScoreRecords'
import {
  DEFAULT_MIN_RULE, INQ_MODES, MIN_AREAS, evaluateMinimum, ruleExtrasFromQuery, ruleExtrasToQuery,
  type MinArea, type MinimumResult, type MinimumRule,
} from '@/utils/csatMinimum'
import { summarizeCsatRawGrades, type CsatRawGradeRow } from '@/utils/csatGradeSummary'
import {
  CUTS, CUT_YEAR, CSAT_YEAR, EST_YEAR, EST_SOURCE, TOP_PCT, INQ_SOC, INQ_SCI, type CutKey,
  cutsFor, topRange, daysUntil, csatToday,
} from '@/utils/csatGrade'

type Id = 'kor' | 'math' | 'eng' | 'hist' | 'inq1' | 'inq2'
type Sel = { kor: string; math: string; inq1: string; inq2: string }

const IDS: Id[] = ['kor', 'math', 'eng', 'hist', 'inq1', 'inq2']
const DEFAULT_SCORES: Record<Id, string> = { kor: '84', math: '80', eng: '85', hist: '42', inq1: '44', inq2: '41' }
const INQ: string[] = [...INQ_SOC, ...INQ_SCI]
const DEFAULT_SEL: Sel = { kor: 'lm', math: 'prob', inq1: 'society', inq2: 'ethics' }
const SEL_OPTS: Record<keyof Sel, string[]> = { kor: ['lm', 'hj'], math: ['prob', 'calc', 'geo'], inq1: INQ, inq2: INQ }
const SEL_PARAM: Record<keyof Sel, string> = { kor: 'korSel', math: 'mathSel', inq1: 'inq1Type', inq2: 'inq2Type' }
const TABLE_KEYS = Object.keys(CUTS) as CutKey[]
// 예전 링크의 탐구 구분(soc/sci) → 응시자가 가장 많은 과목
const INQ_LEGACY: Record<string, string> = { soc: 'society', sci: 'earth1' }

// 구버전 링크(?subject=&score=) 호환
const LEGACY: Record<string, [Id, Partial<Sel>]> = {
  korean: ['kor', {}], mathCalc: ['math', { math: 'calc' }], mathProb: ['math', { math: 'prob' }],
  english: ['eng', {}], koreanHistory: ['hist', {}], socialStudies: ['inq1', { inq1: 'society' }], science: ['inq1', { inq1: 'earth1' }],
}

export default function CsatGrade() {
  const t = useTranslations('csatGrade')
  const sp = useSearchParams()
  const hydrated = useHydrated()
  const [urlRestored, setUrlRestored] = useState(false)
  const [fromLink, setFromLink] = useState(false)

  const [sel, setSel] = useState<Sel>(DEFAULT_SEL)
  const [scores, setScores] = useState<Record<Id, string>>(DEFAULT_SCORES)
  const [minN, setMinN] = useState(3)
  const [minSum, setMinSum] = useState(7)
  // 수능최저 세부 조건(탐구 반영·반영/필수 영역·한국사). 기본값이면 URL 에 쓰지 않는다
  const [minExtra, setMinExtra] = useState<Pick<MinimumRule, 'inq' | 'pool' | 'required' | 'hist'>>(() => ({ ...DEFAULT_MIN_RULE, pool: [...DEFAULT_MIN_RULE.pool] }))
  const [tableKey, setTableKey] = useState<CutKey>('korLm')
  // 기본 = 2027 가채점 예상. URL 에는 기본값이 아닐 때만 cut=2026
  const [cutYear, setCutYear] = useState(EST_YEAR)
  const [today, setToday] = useState<string | null>(null)

  // Match static HTML first; restore the incoming query once before URL synchronization.
  if (hydrated && !urlRestored) {
    const restoredSel = { ...DEFAULT_SEL }
    for (const k of Object.keys(SEL_OPTS) as (keyof Sel)[]) {
      const raw = sp.get(SEL_PARAM[k])
      const v = raw && (k === 'inq1' || k === 'inq2') ? INQ_LEGACY[raw] ?? raw : raw
      if (v && SEL_OPTS[k].includes(v)) restoredSel[k] = v
    }
    const legacy = LEGACY[sp.get('subject') ?? '']
    const restoredScores = { ...DEFAULT_SCORES }
    for (const id of IDS) {
      const v = sp.get(id)
      if (v !== null) restoredScores[id] = v
    }
    const sc = sp.get('score')
    if (legacy && sc !== null) restoredScores[legacy[0]] = sc
    const v = Number(sp.get('minSum'))
    setSel(legacy ? { ...restoredSel, ...legacy[1] } : restoredSel)
    setScores(restoredScores)
    setMinN([2, 3, 4].includes(Number(sp.get('minN'))) ? Number(sp.get('minN')) : 3)
    setMinSum(Number.isInteger(v) && v >= 2 && v <= 36 ? v : 7)
    setCutYear(sp.get('cut') === String(CUT_YEAR) ? CUT_YEAR : EST_YEAR)
    setMinExtra(ruleExtrasFromQuery(key => sp.get(key)))
    setFromLink([...IDS, ...Object.values(SEL_PARAM), 'subject', 'score', 'minN', 'minSum', 'cut', 'minInq', 'minPool', 'minReq', 'minHist'].some(key => sp.has(key)))
    setUrlRestored(true)
  }
  useEffect(() => {
    const update = () => setToday(csatToday())
    const first = window.setTimeout(update, 0)
    const timer = window.setInterval(update, 60_000)
    return () => { window.clearTimeout(first); window.clearInterval(timer) }
  }, [])

  useEffect(() => {
    if (!urlRestored) return
    const url = new URL(window.location.href)
    const q = url.searchParams
    for (const id of IDS) q.set(id, scores[id])
    for (const k of Object.keys(SEL_PARAM) as (keyof Sel)[]) q.set(SEL_PARAM[k], sel[k])
    q.set('minN', String(minN))
    q.set('minSum', String(minSum))
    for (const [k, v] of Object.entries(ruleExtrasToQuery({ ...DEFAULT_MIN_RULE, ...minExtra }))) {
      if (v === null) q.delete(k)
      else q.set(k, v)
    }
    if (cutYear === EST_YEAR) q.delete('cut')
    else q.set('cut', String(cutYear))
    q.delete('subject')
    q.delete('score')
    if (url.href !== window.location.href) window.history.replaceState(window.history.state, '', url)
  }, [scores, sel, minN, minSum, minExtra, cutYear, urlRestored])

  const isEst = cutYear === EST_YEAR
  const currentSnapshot = useMemo<CsatScoreSnapshot>(() => ({ examYear: CSAT_YEAR, referenceYear: cutYear, scores, selection: sel as CsatScoreSnapshot['selection'] }), [scores, sel, cutYear])
  const summary = useMemo(() => summarizeCsatRawGrades(currentSnapshot), [currentSnapshot])
  const { rows, averages: avg } = summary
  const minRule: MinimumRule = { areas: minN, maxSum: minSum, ...minExtra }
  const minimum = evaluateMinimum(currentSnapshot, minRule)
  // 아래 2·3·4합: 같은 탐구 반영·반영 영역, 필수·한국사는 빼고
  const sums = [2, 3, 4].map(n => ({ n, result: evaluateMinimum(currentSnapshot, { ...minRule, areas: n, maxSum: n * 9, required: [], hist: null }) }))
  // 정시 환산점수 계산기로: 상대평가는 추정 표준점수·백분위, 영어·한국사는 등급 (/jeongsi-score 파라미터 규약)
  const jeongsiHref = (() => {
    const q = new URLSearchParams()
    const rel = (r: CsatRawGradeRow, std: string, pct: string) => {
      if (r.status === 'valid' && r.est) { q.set(std, String(r.est.std)); q.set(pct, String(r.est.pct)) }
    }
    const [kor, math, eng, hist, inq1, inq2] = rows
    rel(kor, 'k', 'kp'); rel(math, 'm', 'mp'); q.set('ms', sel.math)
    if (eng.status === 'valid') q.set('e', String(eng.grade))
    if (hist.status === 'valid') q.set('h', String(hist.grade))
    rel(inq1, 't1', 't1p'); q.set('t1s', (INQ_SCI as readonly string[]).includes(sel.inq1) ? 'sci' : 'soc')
    rel(inq2, 't2', 't2p'); q.set('t2s', (INQ_SCI as readonly string[]).includes(sel.inq2) ? 'sci' : 'soc')
    return `/jeongsi-score/?${q}`
  })()
  const minDefault = minExtra.inq === 'top1' && minExtra.pool.length === 4 && !minExtra.required.length && minExtra.hist === null
  const toggleArea = (list: MinArea[], a: MinArea) => MIN_AREAS.filter(x => (x === a ? !list.includes(a) : list.includes(x)))
  const days = today ? daysUntil(today) : null

  const name = (id: Id) =>
    id === 'kor' ? t('subjects.korean') : id === 'math' ? t('subjects.math') : id === 'eng' ? t('subjects.english')
      : id === 'hist' ? t('subjects.koreanHistory') : t(id === 'inq1' ? 'u.inq1' : 'u.inq2')
  const selLabel = (k: keyof Sel, v: string) => (k === 'inq1' || k === 'inq2' ? t(`u.cut.${v}`) : t(`u.sel.${v}`))
  const gradeText = (gr: number | string) => t('u.gradeN', { g: gr })
  const rowStatus = (row: CsatRawGradeRow) => t(row.status === 'missing' ? 'rawSummary.missing' : 'rawSummary.invalid')
  const rowGrade = (row: CsatRawGradeRow) => row.status === 'valid' ? gradeText(row.grade) : rowStatus(row)
  const averageStatus = (includeEnglish: boolean) => summary.inquiryConflict || rows.some(row => row.id !== 'hist' && (includeEnglish || row.id !== 'eng') && row.status === 'invalid') ? t('rawSummary.checkInput') : t('rawSummary.needsInput')
  const allAverage = avg.all === null ? averageStatus(true) : gradeText(avg.all.toFixed(2))
  const noEnglishAverage = avg.noEng === null ? averageStatus(false) : gradeText(avg.noEng.toFixed(2))

  const setScore = (id: Id, value: string) => setScores(scores => ({ ...scores, [id]: value }))

  const seg = (active: boolean) =>
    `min-h-11 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${active ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`

  const inq = rows[4].status === 'valid' && rows[5].status === 'valid'
    ? rows[4].grade === rows[5].grade ? gradeText(rows[4].grade) : t('u.inqPair', { a: rows[4].grade, b: rows[5].grade })
    : t('rawSummary.inquiryPair', { a: rowGrade(rows[4]), b: rowGrade(rows[5]) })
  const bestThree = sums[1].result.sum ?? t('goals.needsInputShort')
  const heroSub = t('rawSummary.heroSub', { noEng: noEnglishAverage, s3: bestThree })
  const referenceLabel = isEst ? t('est.referenceLabel', { year: EST_YEAR }) : t('context.referenceLabel', { year: CUT_YEAR })
  const shareScope = t('context.shareScope', { year: CSAT_YEAR })
  const estArgs = { year: EST_YEAR, agency: EST_SOURCE.agency, checked: EST_SOURCE.checked }

  const table = cutsFor(cutYear)[tableKey]
  const tableRow = rows.find((r) => r.cut === tableKey)
  const hasStd = table.cuts[0].std != null

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <section id="csat-grade-context" aria-labelledby="csat-grade-context-title" className="bg-subtle rounded-2xl p-5 space-y-2">
        <h2 id="csat-grade-context-title" className="font-semibold text-fg">{t('context.title')}</h2>
        <div role="group" aria-label={t('est.toggleLabel')} className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-sm text-sub">{t('est.toggleLabel')}</span>
          {[EST_YEAR, CUT_YEAR].map((y) => (
            <button key={y} type="button" onClick={() => setCutYear(y)} aria-pressed={cutYear === y} className={seg(cutYear === y)}>
              {t(y === EST_YEAR ? 'est.opt2027' : 'est.opt2026')}
            </button>
          ))}
        </div>
        <p className="text-sm text-body">{isEst ? t('est.relative', estArgs) : t('context.relative', { year: CUT_YEAR, currentYear: CSAT_YEAR })}</p>
        <p className="text-sm text-body">{t('context.absolute', { year: CSAT_YEAR })}</p>
        <p className="text-sm text-sub">{t('context.schedule', { year: CSAT_YEAR })}</p>
        {days != null && days >= 0 && <p className="text-sm text-sub tabular-nums">{t('u.dday', { year: CSAT_YEAR, d: days === 0 ? 'D-Day' : `D-${days}` })}</p>}
        <a href="#csat-direct-grade-panel" className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline">{t('directGrades.jump')}</a>
      </section>

      {/* ── 핵심 결과 ── */}
      <div className="space-y-4">
        <div id="csat-grade-result" className="ui-hero p-6 sm:p-8 scroll-mt-20">
          <p className="text-sm text-white/80">{referenceLabel}</p>
          <p className="text-sm text-white/70 mt-2">{t('u.heroLabel')}</p>
          <p data-csat-average="all" className="text-4xl sm:text-5xl font-bold tabular-nums mt-1">{allAverage}</p>
          <p className="text-sm text-white/80 mt-2">{shareScope}</p>
          <p data-csat-average="noEnglish" className="text-sm text-white/80 mt-2 tabular-nums">{heroSub}</p>
          <div className="mt-6 pt-4 border-t border-white/20 grid grid-cols-3 sm:grid-cols-6 gap-2">
            {rows.map((r) => (
              <div key={r.id} className="bg-white/15 rounded-xl px-2 py-2 text-center">
                <div className="text-xs text-white/70 truncate">{name(r.id)}</div>
                <div data-csat-hero-grade={r.id} className="text-lg font-bold tabular-nums">{r.status === 'valid' ? r.grade : rowStatus(r)}</div>
                {r.status === 'valid' && <div className="text-xs text-white/80">{t(r.absolute ? 'context.absoluteShort' : 'context.estimatedShort')}</div>}
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-sub">{t('rawSummary.averageRule')}</p>
        {summary.inquiryConflict ? <p role="status" className="text-sm text-body">{t('rawSummary.inquiryConflict')}</p> : summary.duplicateInquiry && <p className="text-xs text-sub">{t('goals.duplicateInquiry')}</p>}

        <ShareResult
          card={{
            tool: t('title'),
            label: referenceLabel,
            headline: allAverage,
            sub: shareScope,
            rows: [
              ...rows.slice(0, 4).map((r) => ({ label: name(r.id), value: r.status === 'valid' ? t('u.shareRow', { g: r.grade, s: r.score, basis: t(r.absolute ? 'context.absoluteShort' : 'context.estimatedShort') }) : rowStatus(r) })),
              { label: t('u.inq'), value: t('context.shareInquiry', { grades: inq }) },
            ],
          }}
          text={t('rawSummary.shareText', { avg: allAverage, s3: bestThree, year: cutYear, currentYear: CSAT_YEAR })}
          fileName="csat-grade"
        />
        <a href={jeongsiHref} className="ui-btn-soft inline-flex min-h-11 items-center px-4 py-2 text-sm">{t('u.toJeongsiScore')}</a>
      </div>

      {/* ── 과목별 입력 + 등급 ── */}
      <div className="ui-card p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-fg">{t('u.inputTitle')}</h2>
        <p className="text-xs text-muted mt-1">{t('u.inputNote', { year: cutYear })}</p>
        <ul className="mt-4 divide-y divide-line">
          {rows.map((r) => {
            const selKey = (r.id in SEL_OPTS ? r.id : null) as keyof Sel | null
            const [from, to] = r.status === 'valid' ? topRange(r.grade) : [null, null]
            return (
              <li key={r.id} data-csat-score-state={r.status} data-csat-score-field={r.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="w-full min-w-0 sm:w-auto sm:flex-1">
                    <label htmlFor={`csat-${r.id}`} className="block text-sm font-semibold text-fg">{name(r.id)}</label>
                    {selKey ? (
                      <select
                        aria-label={t('u.selectAria', { s: name(r.id) })}
                        value={sel[selKey]}
                        onChange={(e) => setSel((s) => ({ ...s, [selKey]: e.target.value }))}
                        className="ui-field min-h-11 px-2 py-1.5 mt-1 text-base w-full max-w-[11rem]"
                      >
                        {selKey === 'inq1' || selKey === 'inq2'
                          ? ([['subjects.socialStudies', INQ_SOC], ['subjects.science', INQ_SCI]] as const).map(([label, keys]) => (
                            <optgroup key={label} label={t(label)}>
                              {keys.map((v) => <option key={v} value={v}>{selLabel(selKey, v)}</option>)}
                            </optgroup>
                          ))
                          : SEL_OPTS[selKey].map((v) => <option key={v} value={v}>{selLabel(selKey, v)}</option>)}
                      </select>
                    ) : (
                      <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-primary-soft text-primary">{t('absoluteGrade')}</span>
                    )}
                  </div>
                  <div className="flex flex-1 sm:flex-none items-center gap-1.5">
                    <input
                      id={`csat-${r.id}`}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={r.max}
                      value={scores[r.id]}
                      onChange={(e) => setScore(r.id, e.target.value)}
                      className="ui-field min-h-11 px-3 py-2 w-20 text-base text-right tabular-nums"
                    />
                    <span className="text-sm text-muted tabular-nums w-9">/{r.max}</span>
                  </div>
                  <div className="min-w-16 text-right">
                    <span className={`${r.status === 'valid' ? 'text-2xl' : 'text-base'} font-bold text-fg tabular-nums`}>{r.status === 'valid' ? r.grade : rowStatus(r)}</span>
                    {r.status === 'valid' && <span className="text-sm text-sub">{t('grade')}</span>}
                  </div>
                </div>
                {r.status === 'valid' && <p className="mt-2 text-xs text-sub tabular-nums">
                  {r.absolute ? t('u.absNote') : t('context.relativeRow', { year: cutYear })}
                  {!r.absolute && from !== null && to !== null && <> · {t('u.topRange', { from, to })}</>}
                  {r.est && (
                    <> · {t('u.estStdPct', {
                      std: r.est.bound === 'ge' ? t('u.ge', { v: r.est.std }) : r.est.bound === 'lt' ? t('u.lt', { v: r.est.std }) : r.est.std,
                      pct: r.est.pct,
                    })}</>
                  )}
                  {r.next != null && <> · {t(r.absolute ? 'u.toNext' : 'context.toNextReference', { g: r.grade - 1, n: r.next })}</>}
                </p>}
              </li>
            )
          })}
        </ul>
        <p className="text-xs text-sub mt-4">{t('context.interpolation', { year: cutYear })}</p>
      </div>

      <CsatScoreRecords
        current={currentSnapshot}
        ready={urlRestored}
        fromLink={fromLink}
        onRestore={snapshot => { setScores({ ...snapshot.scores }); setSel({ ...snapshot.selection }) }}
      />

      {/* ── 수능최저 ── */}
      <div className="ui-card p-4 sm:p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-fg">{t('u.minTitle')}</h2>
          <p className="text-xs text-muted mt-1">{t('u.minNote')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[2, 3, 4].map((n) => (
            <button key={n} onClick={() => setMinN(n)} aria-pressed={minN === n} className={seg(minN === n)}>
              {t('u.nSum', { n })}
            </button>
          ))}
          <input
            type="number"
            inputMode="numeric"
            min={minN}
            max={minN * 9}
            value={minSum}
            onChange={(e) => setMinSum(Math.min(36, Math.max(2, Math.round(Number(e.target.value) || 2))))}
            aria-label={t('u.minSumAria')}
            className="ui-field min-h-11 px-3 py-2 w-20 text-base text-right tabular-nums"
          />
          <span className="text-sm text-body">{t('u.within')}</span>
        </div>
        <details open={!minDefault || undefined} className="rounded-2xl border border-line px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium text-body">{t('min.details')}</summary>
          <div className="mt-3 space-y-4">
            <div>
              <p className="text-sm text-body">{t('min.inqLabel')}</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {INQ_MODES.map(m => (
                  <button key={m} type="button" onClick={() => setMinExtra(x => ({ ...x, inq: m }))} aria-pressed={minExtra.inq === m} className={seg(minExtra.inq === m)}>{t(`min.inq.${m}`)}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm text-body">{t('min.poolLabel')}</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {MIN_AREAS.map(a => (
                  <button key={a} type="button" aria-pressed={minExtra.pool.includes(a)} className={seg(minExtra.pool.includes(a))}
                    onClick={() => setMinExtra(x => { const pool = toggleArea(x.pool, a); return { ...x, pool, required: x.required.filter(r => pool.includes(r)) } })}>
                    {t(`min.area.${a}`)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm text-body">{t('min.reqLabel')}</p>
              <p className="text-xs text-muted mt-0.5">{t('min.reqHint')}</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {MIN_AREAS.map(a => (
                  <button key={a} type="button" disabled={!minExtra.pool.includes(a)} aria-pressed={minExtra.required.includes(a)}
                    className={`${seg(minExtra.required.includes(a))} disabled:opacity-40 disabled:cursor-not-allowed`}
                    onClick={() => setMinExtra(x => ({ ...x, required: toggleArea(x.required, a) }))}>
                    {t(`min.area.${a}`)}
                  </button>
                ))}
              </div>
            </div>
            <label className="block">
              <span className="text-sm text-body">{t('min.histLabel')}</span>
              <select
                value={minExtra.hist ?? ''}
                onChange={e => setMinExtra(x => ({ ...x, hist: e.target.value ? Number(e.target.value) : null }))}
                className="ui-field mt-1.5 block min-h-11 px-3 py-2 text-base w-full sm:w-auto"
              >
                <option value="">{t('min.histNone')}</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(g => <option key={g} value={g}>{t('min.histOpt', { g })}</option>)}
              </select>
            </label>
          </div>
        </details>
        <div id="csat-minimum-result" className="bg-subtle rounded-2xl p-5">
          <MinimumView result={minimum} rule={minRule} conflict={summary.inquiryConflict} />
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {sums.map((s) => (
              <div key={s.n} data-min-sum={s.n} className="bg-surface rounded-xl px-1 py-2">
                <div className="text-xs text-muted">{t('u.nSum', { n: s.n })}</div>
                <div className="text-base font-bold text-fg tabular-nums">{s.result.sum ?? t('goals.needsInputShort')}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted mt-3">{t('min.sumsBasis')}</p>
          <p className="text-xs text-sub mt-2">{t('context.minimumLimit', { year: cutYear })}</p>
        </div>
      </div>

      <CsatGoalConditions current={currentSnapshot} ready={urlRestored} />

      {/* ── 등급컷 표 ── */}
      <div id="csat-grade-cut-table" className="ui-card p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-fg">{t('gradeTable')}</h2>
          <select
            aria-label={t('subject')}
            value={tableKey}
            onChange={(e) => setTableKey(e.target.value as CutKey)}
            className="ui-field min-h-11 px-3 py-2 text-base w-full sm:w-auto max-w-full"
          >
            {TABLE_KEYS.map((k) => <option key={k} value={k}>{t(`u.cut.${k}`)}</option>)}
          </select>
        </div>
        <p className="text-xs text-muted">{table.absolute ? t('u.tableAbs') : t('u.tableRel', { year: cutYear })}</p>
        {!table.absolute && (isEst ? (
          <p className="text-xs text-faint">
            {t('est.dataSource', estArgs)}{' '}
            <a href={EST_SOURCE.url} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-4">{t('est.sourceLink', estArgs)}</a>
          </p>
        ) : <p className="text-xs text-faint">{t('u.dataSource', { year: CUT_YEAR })}</p>)}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="text-left text-sm font-medium text-body pb-3">{table.absolute ? t('context.absoluteCaption', { year: CSAT_YEAR }) : t('context.relativeCaption', { year: cutYear })}</caption>
            <thead>
              <tr className="border-b border-line text-left text-sub">
                <th className="py-2 px-2 font-medium">{t('grade')}</th>
                <th className="py-2 px-2 font-medium">{t(table.absolute ? 'context.absoluteCut' : 'context.estimatedCut')}</th>
                {hasStd && <th className="py-2 px-2 font-medium">{t('u.stdAtCut')}</th>}
                {!table.absolute && <th className="py-2 px-2 font-medium">{t('u.cumTop')}</th>}
                <th className="py-2 px-2 font-medium">{t('gradeRange')}</th>
              </tr>
            </thead>
            <tbody>
              {table.cuts.map((c, i) => {
                const upper = i === 0 ? table.max : table.cuts[i - 1].raw - 1
                const mine = tableRow?.grade === c.grade
                return (
                  <tr key={c.grade} className={`border-b border-line ${mine ? 'bg-primary-soft' : ''}`}>
                    <td className={`py-2.5 px-2 font-semibold ${mine ? 'text-primary' : 'text-fg'}`}>{gradeText(c.grade)}</td>
                    <td className="py-2.5 px-2 font-medium text-fg tabular-nums">{c.raw}</td>
                    {hasStd && <td className="py-2.5 px-2 text-body tabular-nums">{c.std ?? '-'}</td>}
                    {!table.absolute && <td className="py-2.5 px-2 text-body tabular-nums">{TOP_PCT[c.grade - 1]}%</td>}
                    <td className="py-2.5 px-2 text-sub tabular-nums">{c.raw} ~ {upper}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-faint">{t('disclaimer')}</p>
      </div>

      {/* ── 가이드 ── */}
      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        <div>
          <h3 className="font-semibold text-fg mb-2">{t('guide.whatIs.title')}</h3>
          <p className="text-sm text-sub leading-relaxed">{t('guide.whatIs.description')}</p>
        </div>
        {(['grading', 'howToUse', 'tips'] as const).map((sec) => (
          <div key={sec}>
            <h3 className="font-semibold text-fg mb-2">{t(`guide.${sec}.title`)}</h3>
            <ul className="space-y-1.5 list-disc pl-5 text-sm text-sub leading-relaxed">
              {(t.raw(`guide.${sec}.items`) as string[]).map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </div>
        ))}
        <div>
          <h3 className="font-semibold text-fg mb-2">{t('guide.faq.title')}</h3>
          <div className="space-y-3">
            {(t.raw('guide.faq.items') as { q: string; a: string }[]).map((f, i) => (
              <div key={i} className="bg-subtle rounded-2xl p-4">
                <p className="text-sm font-semibold text-fg">{f.q}</p>
                <p className="text-sm text-sub mt-1 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="border-t border-line pt-4">
          <h3 className="font-semibold text-fg">{t('context.sourcesTitle')}</h3>
          <p className="text-xs text-sub mt-2">{t('context.sourcesNote')}</p>
          <div className="mt-2 flex flex-col items-start">
            <a className="inline-flex items-center min-h-11 text-sm text-primary underline underline-offset-4" href="https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=294&boardSeq=105756&lev=0&m=020402&s=moe" target="_blank" rel="noopener noreferrer">{t('context.planSource')}</a>
            <a className="inline-flex items-center min-h-11 text-sm text-primary underline underline-offset-4" href="https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=294&boardSeq=100526&lev=0&m=020402" target="_blank" rel="noopener noreferrer">{t('context.scheduleSource')}</a>
            <a className="inline-flex items-center min-h-11 text-sm text-primary underline underline-offset-4" href="https://www.ice.go.kr/upload/ice/na/bbs_1482/2026/04/b38c68a1f07bfba215f2107e1e040910.pdf" target="_blank" rel="noopener noreferrer">{t('context.scoringSource')}</a>
          </div>
        </div>
      </div>
    </div>
  )
}

function MinimumView({ result, rule, conflict }: { result: MinimumResult; rule: MinimumRule; conflict: boolean }) {
  const t = useTranslations('csatGrade')
  const area = (a: MinArea) => t(`min.area.${a}`)
  return (
    <div data-goal-status={result.status} className="space-y-2">
      <p className={`text-lg font-bold ${result.status === 'within' ? 'text-primary' : 'text-fg'}`}>{t(`min.status.${result.status}`)}</p>
      {result.status === 'invalidCondition' && <p className="text-sm text-body">{t('min.invalidHint', { min: rule.areas, max: rule.areas * 9 })}</p>}
      {result.sum !== null && (
        <p className="text-sm text-body tabular-nums">
          {t('min.sum', { areas: rule.areas, sum: result.sum, max: rule.maxSum })}
          {!!result.over && ` · ${t('min.overBy', { amount: result.over })}`}
        </p>
      )}
      {result.hist && (
        <p className="text-sm text-body tabular-nums">
          {result.hist.grade === null ? t('min.histMissing') : t('min.hist', { grade: result.hist.grade, max: result.hist.max })}
          {result.hist.ok === false && ` · ${t('min.histFail')}`}
        </p>
      )}
      {result.missing.length > 0 && <p className="text-xs text-body">{t('min.missing', { areas: result.missing.map(area).join(', ') })}</p>}
      {result.missing.includes('inq') && rule.inq !== 'top1' && !conflict && <p className="text-xs text-sub">{t('min.inqAvgNeedsTwo')}</p>}
      {conflict && <p className="text-xs text-body">{t('goals.inquiryConflict')}</p>}
      {result.used.length > 0 && (
        <div>
          <p className="text-xs font-medium text-body">{t('min.used')}</p>
          <ul data-goal-used-areas className="mt-1 space-y-1 text-xs text-sub">
            {result.used.map(a => (
              <li key={a.id} data-goal-area={a.id}>
                {t('min.usedArea', { label: a.id === 'inq' ? `${area('inq')} (${a.subjects.map(k => t(`u.cut.${k}`)).join(' · ')})` : t(`u.cut.${a.subjects[0]}`), grade: a.grade })}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
