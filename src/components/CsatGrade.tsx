'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTranslations } from '@/lib/i18n'
import { useSearchParams } from '@/hooks/useSearchParams'
import ShareResult from '@/components/ShareResult'
import {
  CUTS, CUT_YEAR, CSAT_YEAR, TOP_PCT, type CutKey, type Grades,
  gradeOf, clampScore, topRange, pointsToNext, estimate, daysUntil, bestSum, gradeAverages,
} from '@/utils/csatGrade'

type Id = 'kor' | 'math' | 'eng' | 'hist' | 'inq1' | 'inq2'
type Sel = { kor: string; math: string; inq1: string; inq2: string }

const IDS: Id[] = ['kor', 'math', 'eng', 'hist', 'inq1', 'inq2']
const DEFAULT_SCORES: Record<Id, string> = { kor: '84', math: '80', eng: '85', hist: '42', inq1: '44', inq2: '41' }
const DEFAULT_SEL: Sel = { kor: 'lm', math: 'prob', inq1: 'soc', inq2: 'soc' }
const SEL_OPTS: Record<keyof Sel, string[]> = { kor: ['lm', 'hj'], math: ['prob', 'calc', 'geo'], inq1: ['soc', 'sci'], inq2: ['soc', 'sci'] }
const SEL_PARAM: Record<keyof Sel, string> = { kor: 'korSel', math: 'mathSel', inq1: 'inq1Type', inq2: 'inq2Type' }
const TABLE_KEYS: CutKey[] = ['korean', 'mathProb', 'mathCalc', 'english', 'koreanHistory', 'socialStudies', 'science']

// 구버전 링크(?subject=&score=) 호환
const LEGACY: Record<string, [Id, Partial<Sel>]> = {
  korean: ['kor', {}], mathCalc: ['math', { math: 'calc' }], mathProb: ['math', { math: 'prob' }],
  english: ['eng', {}], koreanHistory: ['hist', {}], socialStudies: ['inq1', { inq1: 'soc' }], science: ['inq1', { inq1: 'sci' }],
}

function cutOf(id: Id, sel: Sel): CutKey {
  switch (id) {
    case 'kor': return 'korean'
    case 'math': return sel.math === 'prob' ? 'mathProb' : 'mathCalc' // 기하는 미적분 컷으로 근사 (기존 데이터 구분)
    case 'eng': return 'english'
    case 'hist': return 'koreanHistory'
    default: return sel[id] === 'sci' ? 'science' : 'socialStudies'
  }
}

const localToday = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function CsatGrade() {
  const t = useTranslations('csatGrade')
  const sp = useSearchParams()

  const [sel, setSel] = useState<Sel>(() => {
    const s = { ...DEFAULT_SEL }
    for (const k of Object.keys(SEL_OPTS) as (keyof Sel)[]) {
      const v = sp.get(SEL_PARAM[k])
      if (v && SEL_OPTS[k].includes(v)) s[k] = v
    }
    const legacy = LEGACY[sp.get('subject') ?? '']
    return legacy ? { ...s, ...legacy[1] } : s
  })
  const [scores, setScores] = useState<Record<Id, string>>(() => {
    const s = { ...DEFAULT_SCORES }
    for (const id of IDS) {
      const v = sp.get(id)
      if (v != null && v !== '' && !isNaN(+v)) s[id] = v
    }
    const legacy = LEGACY[sp.get('subject') ?? '']
    const sc = sp.get('score')
    if (legacy && sc != null && sc !== '' && !isNaN(+sc)) s[legacy[0]] = sc
    return s
  })
  const [minN, setMinN] = useState(() => ([2, 3, 4].includes(Number(sp.get('minN'))) ? Number(sp.get('minN')) : 3))
  const [minSum, setMinSum] = useState(() => {
    const v = Number(sp.get('minSum'))
    return Number.isInteger(v) && v >= 2 && v <= 36 ? v : 7
  })
  const [tableKey, setTableKey] = useState<CutKey>('korean')
  const [today, setToday] = useState<string | null>(null)
  useEffect(() => setToday(localToday()), [])

  useEffect(() => {
    const url = new URL(window.location.href)
    const q = url.searchParams
    for (const id of IDS) q.set(id, scores[id] || '0')
    for (const k of Object.keys(SEL_PARAM) as (keyof Sel)[]) q.set(SEL_PARAM[k], sel[k])
    q.set('minN', String(minN))
    q.set('minSum', String(minSum))
    q.delete('subject')
    q.delete('score')
    window.history.replaceState({}, '', url)
  }, [scores, sel, minN, minSum])

  const rows = useMemo(() => IDS.map((id) => {
    const cut = cutOf(id, sel)
    const score = clampScore(cut, Number(scores[id] || 0))
    const grade = gradeOf(cut, score)
    return { id, cut, score, grade, max: CUTS[cut].max, absolute: CUTS[cut].absolute, est: estimate(cut, score), next: pointsToNext(cut, score) }
  }), [scores, sel])

  const g = Object.fromEntries(rows.map((r) => [r.id, r.grade])) as unknown as Grades
  const avg = gradeAverages(g)
  const sums = [2, 3, 4].map((n) => ({ n, sum: bestSum(g, n) }))
  const mySum = bestSum(g, minN)
  const minOk = mySum <= minSum
  const days = today ? daysUntil(today) : null

  const name = (id: Id) =>
    id === 'kor' ? t('subjects.korean') : id === 'math' ? t('subjects.math') : id === 'eng' ? t('subjects.english')
      : id === 'hist' ? t('subjects.koreanHistory') : t(id === 'inq1' ? 'u.inq1' : 'u.inq2')
  const selLabel = (k: keyof Sel, v: string) => (k === 'inq1' || k === 'inq2' ? t(v === 'sci' ? 'subjects.science' : 'subjects.socialStudies') : t(`u.sel.${v}`))
  const gradeText = (gr: number | string) => t('u.gradeN', { g: gr })

  const setScore = (id: Id, v: string, cut: CutKey) =>
    setScores((s) => ({ ...s, [id]: v === '' ? '' : String(clampScore(cut, Number(v))) }))

  const seg = (active: boolean) =>
    `px-3 py-2 rounded-xl text-sm font-medium transition-colors ${active ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`

  const inq = rows[4].grade === rows[5].grade ? gradeText(rows[4].grade) : t('u.inqPair', { a: rows[4].grade, b: rows[5].grade })
  const heroSub = t('u.heroSub', { noEng: avg.noEng.toFixed(2), s3: sums[1].sum })

  const table = CUTS[tableKey]
  const tableRow = rows.find((r) => r.cut === tableKey)
  const hasStd = table.cuts[0].std != null

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      {/* ── 핵심 결과 ── */}
      <div className="space-y-4">
        <div className="ui-hero p-6 sm:p-8">
          {days != null && days >= 0 && (
            <p className="text-sm text-white/80 tabular-nums">
              {t('u.dday', { year: CSAT_YEAR, d: days === 0 ? 'D-Day' : `D-${days}` })} · {t('u.examDate')}
            </p>
          )}
          <p className="text-sm text-white/70 mt-3">{t('u.heroLabel')}</p>
          <p className="text-4xl sm:text-5xl font-bold tabular-nums mt-1">{gradeText(avg.all.toFixed(2))}</p>
          <p className="text-sm text-white/80 mt-2 tabular-nums">{heroSub}</p>
          <div className="mt-6 pt-4 border-t border-white/20 grid grid-cols-3 sm:grid-cols-6 gap-2">
            {rows.map((r) => (
              <div key={r.id} className="bg-white/15 rounded-xl px-2 py-2 text-center">
                <div className="text-xs text-white/70 truncate">{name(r.id)}</div>
                <div className="text-lg font-bold tabular-nums">{r.grade}</div>
              </div>
            ))}
          </div>
        </div>

        <ShareResult
          card={{
            tool: t('title'),
            label: t('u.heroLabel'),
            headline: gradeText(avg.all.toFixed(2)),
            sub: heroSub,
            rows: [
              ...rows.slice(0, 4).map((r) => ({ label: name(r.id), value: t('u.shareRow', { g: r.grade, s: r.score }) })),
              { label: t('u.inq'), value: inq },
            ],
          }}
          text={t('u.shareText', { avg: avg.all.toFixed(2), s3: sums[1].sum })}
          fileName="csat-grade"
        />
      </div>

      {/* ── 과목별 입력 + 등급 ── */}
      <div className="ui-card p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-fg">{t('u.inputTitle')}</h2>
        <p className="text-xs text-muted mt-1">{t('u.inputNote', { year: CUT_YEAR })}</p>
        <ul className="mt-4 divide-y divide-line">
          {rows.map((r) => {
            const selKey = (r.id in SEL_OPTS ? r.id : null) as keyof Sel | null
            const [from, to] = topRange(r.grade)
            return (
              <li key={r.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <label htmlFor={`csat-${r.id}`} className="block text-sm font-semibold text-fg">{name(r.id)}</label>
                    {selKey ? (
                      <select
                        aria-label={t('u.selectAria', { s: name(r.id) })}
                        value={sel[selKey]}
                        onChange={(e) => setSel((s) => ({ ...s, [selKey]: e.target.value }))}
                        className="ui-field px-2 py-1.5 mt-1 text-sm w-full max-w-[11rem]"
                      >
                        {SEL_OPTS[selKey].map((v) => <option key={v} value={v}>{selLabel(selKey, v)}</option>)}
                      </select>
                    ) : (
                      <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-primary-soft text-primary">{t('absoluteGrade')}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      id={`csat-${r.id}`}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={r.max}
                      value={scores[r.id]}
                      onChange={(e) => setScore(r.id, e.target.value, r.cut)}
                      className="ui-field px-3 py-2 w-20 text-right tabular-nums"
                    />
                    <span className="text-sm text-muted tabular-nums w-9">/{r.max}</span>
                  </div>
                  <div className="w-16 text-right">
                    <span className="text-2xl font-bold text-fg tabular-nums">{r.grade}</span>
                    <span className="text-sm text-sub">{t('grade')}</span>
                  </div>
                </div>
                <p className="mt-2 text-xs text-sub tabular-nums">
                  {r.absolute ? t('u.absNote') : t('u.topRange', { from, to })}
                  {r.est && (
                    <> · {t('u.estStdPct', {
                      std: r.est.bound === 'ge' ? t('u.ge', { v: r.est.std }) : r.est.bound === 'lt' ? t('u.lt', { v: r.est.std }) : r.est.std,
                      pct: r.est.pct,
                    })}</>
                  )}
                  {r.next != null && <> · {t('u.toNext', { g: r.grade - 1, n: r.next })}</>}
                  {r.id === 'math' && sel.math === 'geo' && <> · {t('u.geoNote')}</>}
                </p>
              </li>
            )
          })}
        </ul>
      </div>

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
            className="ui-field px-3 py-2 w-20 text-right tabular-nums"
          />
          <span className="text-sm text-body">{t('u.within')}</span>
        </div>
        <div className="bg-subtle rounded-2xl p-5">
          <p className={`text-xl font-bold ${minOk ? 'text-primary' : 'text-fg'}`}>
            {minOk ? t('u.minOk') : t('u.minShort', { n: mySum - minSum })}
          </p>
          <p className="text-sm text-sub mt-1 tabular-nums">{t('u.minMine', { n: minN, sum: mySum, target: minSum })}</p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {sums.map((s) => (
              <div key={s.n} className="bg-surface rounded-xl py-2">
                <div className="text-xs text-muted">{t('u.nSum', { n: s.n })}</div>
                <div className="text-lg font-bold text-fg tabular-nums">{s.sum}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted mt-3">{t('u.histNote', { g: rows[3].grade })}</p>
        </div>
      </div>

      {/* ── 등급컷 표 ── */}
      <div className="ui-card p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-fg">{t('gradeTable')}</h2>
          <select
            aria-label={t('subject')}
            value={tableKey}
            onChange={(e) => setTableKey(e.target.value as CutKey)}
            className="ui-field px-3 py-2 text-sm"
          >
            {TABLE_KEYS.map((k) => <option key={k} value={k}>{t(`subjectDetail.${k}`)}</option>)}
          </select>
        </div>
        <p className="text-xs text-muted">{table.absolute ? t('u.tableAbs') : t('u.tableRel', { year: CUT_YEAR })}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-sub">
                <th className="py-2 px-2 font-medium">{t('grade')}</th>
                <th className="py-2 px-2 font-medium">{t('cutoff')}</th>
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
      </div>
    </div>
  )
}
