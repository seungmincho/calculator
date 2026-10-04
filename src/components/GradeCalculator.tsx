'use client'

/**
 * GradeCalculator - 석차/등급 계산기 (번역 네임스페이스: gradeCalc)
 * 과목별 석차·동석차·수강자수 → 과목별 등급 + 단위수(학점) 가중 평균, 5등급/9등급 전환.
 * 계산 로직·근거 출처: src/utils/gradeRank.ts
 */

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/gradeCalc'
import { Check, Plus, X } from 'lucide-react'
import { gradeOf, boundaries, weightedAverage, systemForYear, CUMULATIVE, type GradeSystem } from '@/utils/gradeRank'

interface Row { id: number; name: string; units: string; rank: string; ties: string; total: string }

const YEARS = [2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028]
const FIELDS = ['name', 'units', 'rank', 'ties', 'total'] as const

let nextId = 100
const row = (name: string, units: string, rank: string, ties: string, total: string): Row => ({ id: nextId++, name, units, rank, ties, total })

// 첫 화면에 결과가 바로 보이도록 현실적인 예시 (180명 학년 기준)
const SAMPLE = (): Row[] => [
  row('국어', '4', '12', '1', '180'),
  row('수학', '4', '30', '1', '180'),
  row('영어', '4', '8', '3', '180'),
  row('통합사회', '3', '40', '1', '180'),
  row('통합과학', '3', '70', '1', '180'),
]

const encodeRows = (rows: Row[]) =>
  rows.map((r) => FIELDS.map((f) => r[f].replace(/[~|]/g, '')).join('~')).join('|')

const decodeRows = (s: string): Row[] =>
  s.split('|').slice(0, 30).map((part) => {
    const [name = '', units = '', rank = '', ties = '1', total = ''] = part.split('~')
    return row(name.slice(0, 30), units, rank, ties || '1', total)
  })

/** 3월 학년 시작 기준 현재 고1의 입학년도 */
const currentFreshmanYear = () => {
  const d = new Date()
  return d.getMonth() >= 2 ? d.getFullYear() : d.getFullYear() - 1
}

const int = (s: string) => (/^\d+$/.test(s.trim()) ? parseInt(s, 10) : NaN)

export default function GradeCalculator() {
  const t = useTranslations('gradeCalc')

  const [entryYear, setEntryYear] = useState(2025)
  const [system, setSystem] = useState<GradeSystem>(5)
  const [rows, setRows] = useState<Row[]>(SAMPLE)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [copied, setCopied] = useState(false)

  // 복원: URL(sys, y, s) → 없으면 현재 고1 입학년도 기준 기본값
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const y = int(p.get('y') || '')
    const year = YEARS.includes(y) ? y : currentFreshmanYear()
    setEntryYear(year)
    const sys = p.get('sys')
    setSystem(sys === '5' || sys === '9' ? (Number(sys) as GradeSystem) : systemForYear(year))
    const s = p.get('s')
    if (s) setRows(decodeRows(s))
    else if (p.get('rank') && p.get('total')) setRows([row('', '1', p.get('rank')!, '1', p.get('total')!)]) // 구버전 링크
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return
    const url = new URL(window.location.href)
    ;['score', 'rank', 'total'].forEach((k) => url.searchParams.delete(k))
    url.searchParams.set('y', String(entryYear))
    url.searchParams.set('sys', String(system))
    url.searchParams.set('s', encodeRows(rows))
    window.history.replaceState(window.history.state, '', url)
  }, [loaded, entryYear, system, rows])

  const changeYear = (y: number) => {
    setEntryYear(y)
    setSystem(systemForYear(y))
  }

  const update = (id: number, field: (typeof FIELDS)[number], value: string) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)))

  const addRow = () => {
    const last = rows[rows.length - 1]
    const r = row('', last?.units || '4', '', '1', last?.total || '')
    setRows((prev) => [...prev, r])
    setSelectedId(r.id)
  }

  const removeRow = (id: number) => setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev))

  const reset = () => {
    setRows([row('', '4', '', '1', '')])
    setSelectedId(null)
  }

  const results = useMemo(
    () => rows.map((r) => {
      const empty = !r.rank.trim() || !r.total.trim()
      const res = empty ? null : gradeOf(int(r.rank), int(r.ties || '1'), int(r.total), system)
      return { row: r, res, invalid: !empty && !res, units: parseFloat(r.units) || 0 }
    }),
    [rows, system]
  )

  const valid = results.filter((x) => x.res && x.units > 0)
  const average = weightedAverage(valid.map((x) => ({ units: x.units, grade: x.res!.grade })))
  const totalUnits = valid.reduce((s, x) => s + x.units, 0)

  const selected = results.find((x) => x.row.id === selectedId) ?? results.find((x) => x.res) ?? results[0]
  const selTotal = int(selected.row.total)
  const bounds = selTotal >= 1 ? boundaries(selTotal, system) : null
  const cuts = CUMULATIVE[system]

  const copyLink = useCallback(async () => {
    try { await navigator.clipboard.writeText(window.location.href) } catch { /* 권한 거부 무시 */ }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [])

  const segBtn = (active: boolean) =>
    `flex-1 px-4 py-2.5 rounded-xl font-medium transition-colors ${active ? 'bg-primary text-white' : 'bg-soft hover:bg-subtle text-body'}`

  const headers = [t('subjects.name'), t('subjects.units'), t('subjects.rank'), t('subjects.ties'), t('subjects.total')]
  const gridCols = 'grid grid-cols-2 sm:grid-cols-[1.6fr_repeat(4,minmax(0,1fr))_4.5rem_2rem] gap-2 items-center'

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
          <p className="text-sm text-muted mt-1">{t('description')}</p>
        </div>
        <button onClick={copyLink} className="shrink-0 ui-btn-soft px-3 py-2 text-sm font-medium flex items-center gap-1.5">
          {copied && <Check className="w-4 h-4" />}
          {copied ? t('copied') : t('copyLink')}
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* 설정 + 평균 */}
        <div className="lg:col-span-1 space-y-6">
          <div className="ui-card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-fg">{t('settings.title')}</h2>
            <div>
              <label htmlFor="grade-entry-year" className="block text-sm font-medium text-body mb-1">{t('settings.entryYear')}</label>
              <select
                id="grade-entry-year"
                value={entryYear}
                onChange={(e) => changeYear(Number(e.target.value))}
                className="w-full px-4 py-3 ui-field"
              >
                {YEARS.map((y) => <option key={y} value={y}>{t('settings.yearOption', { year: y })}</option>)}
              </select>
            </div>
            <div>
              <p className="text-sm font-medium text-body mb-1">{t('settings.system')}</p>
              <div className="flex gap-2">
                <button onClick={() => setSystem(5)} className={segBtn(system === 5)} aria-pressed={system === 5}>{t('settings.system5')}</button>
                <button onClick={() => setSystem(9)} className={segBtn(system === 9)} aria-pressed={system === 9}>{t('settings.system9')}</button>
              </div>
              <p className="text-xs text-muted mt-2">{t(systemForYear(entryYear) === 5 ? 'settings.autoHint5' : 'settings.autoHint9')}</p>
              {system !== systemForYear(entryYear) && (
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">{t('settings.mismatch')}</p>
              )}
            </div>
          </div>

          <div className="ui-card p-6">
            <p className="text-sm text-muted">{t('result.average')}</p>
            <p className="text-4xl font-bold text-fg tabular-nums mt-1">
              {average === null ? '-' : average.toFixed(2)}
              <span className="text-base font-medium text-muted ml-1">{t('result.gradeUnit')}</span>
            </p>
            <p className="text-sm text-muted mt-2">{t('result.averageHint', { count: valid.length, units: totalUnits })}</p>
            <div className="mt-4 bg-subtle rounded-2xl p-4 text-sm text-sub space-y-1">
              {cuts.map((c, i) => (
                <div key={c} className="flex justify-between tabular-nums">
                  <span>{i + 1}{t('result.gradeUnit')}</span>
                  <span>{t('table.upTo', { percent: c })}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 과목별 입력 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg mb-1">{t('subjects.title')}</h2>
            <p className="text-xs text-muted mb-4">{t('subjects.tiesHelp')}</p>

            <div className={`${gridCols} hidden sm:grid text-xs font-medium text-sub pb-2 border-b border-line`}>
              {headers.map((h) => <span key={h}>{h}</span>)}
              <span className="text-center">{t('subjects.grade')}</span>
              <span />
            </div>

            <div className="divide-y divide-line">
              {results.map(({ row: r, res, invalid }) => {
                const active = selected.row.id === r.id
                return (
                  <div key={r.id} className={`py-3 sm:py-2 ${active ? 'bg-subtle -mx-2 px-2 rounded-xl' : ''}`} onFocusCapture={() => setSelectedId(r.id)}>
                    <div className={gridCols}>
                      {FIELDS.map((f, i) => (
                        <label key={f} className={f === 'name' ? 'col-span-2 sm:col-span-1' : ''}>
                          <span className="block text-xs text-muted mb-1 sm:hidden">{headers[i]}</span>
                          <input
                            type={f === 'name' ? 'text' : 'number'}
                            inputMode={f === 'name' ? undefined : f === 'units' ? 'decimal' : 'numeric'}
                            min={f === 'name' ? undefined : 1}
                            value={r[f]}
                            placeholder={f === 'name' ? t('subjects.namePlaceholder') : f === 'ties' ? '1' : ''}
                            onChange={(e) => update(r.id, f, e.target.value)}
                            aria-label={headers[i]}
                            className="w-full px-3 py-2 ui-field text-sm tabular-nums"
                          />
                        </label>
                      ))}
                      <button
                        onClick={() => setSelectedId(r.id)}
                        className="text-left sm:text-center text-sm"
                        aria-label={t('subjects.select')}
                      >
                        {res ? (
                          <span className="font-bold text-fg tabular-nums">{res.grade}{t('result.gradeUnit')}</span>
                        ) : (
                          <span className="text-faint">-</span>
                        )}
                      </button>
                      <button
                        onClick={() => removeRow(r.id)}
                        disabled={rows.length === 1}
                        className="justify-self-end sm:justify-self-center p-1.5 rounded-lg text-muted hover:bg-soft disabled:opacity-30"
                        aria-label={t('subjects.remove')}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {invalid && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{t('error.invalidRow')}</p>}
                    {res && (
                      <p className="text-xs text-muted mt-1 tabular-nums">
                        {t('result.detail', { top: res.topPercent.toFixed(2), mid: res.midRank })}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={addRow} className="flex-1 ui-btn px-4 py-2.5 font-medium flex items-center justify-center gap-1.5">
                <Plus className="w-4 h-4" />{t('subjects.add')}
              </button>
              <button onClick={reset} className="ui-btn-soft px-4 py-2.5 font-medium">{t('input.reset')}</button>
            </div>
          </div>

          {/* 선택 과목 기준 등급 구간 */}
          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg mb-1">
              {bounds
                ? t('table.titleFor', { subject: selected.row.name || t('subjects.unnamed'), total: selTotal })
                : t('table.title')}
            </h2>
            <p className="text-xs text-muted mb-4">{t('table.help')}</p>

            {selected.res && bounds && (
              <div className="mb-6">
                <div className="relative flex h-9 rounded-lg overflow-hidden border border-line">
                  {cuts.map((c, i) => (
                    <div
                      key={c}
                      className={`flex items-center justify-center text-xs border-r border-line last:border-r-0 ${
                        selected.res!.grade === i + 1 ? 'bg-primary-soft text-primary font-semibold' : 'bg-subtle text-sub'
                      }`}
                      style={{ width: `${c - (cuts[i - 1] ?? 0)}%` }}
                    >
                      {c - (cuts[i - 1] ?? 0) >= 7 ? i + 1 : ''}
                    </div>
                  ))}
                  <div className="absolute top-0 h-full w-0.5 bg-primary" style={{ left: `${Math.min(selected.res.topPercent, 99.5)}%` }} />
                </div>
                <p className="text-sm text-body mt-2 tabular-nums">
                  {t('position.topLabel', { percent: selected.res.topPercent.toFixed(2) })}
                </p>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line">
                    <th className="py-2 px-3 text-left text-sub font-medium">{t('table.grade')}</th>
                    <th className="py-2 px-3 text-center text-sub font-medium">{t('table.cumulative')}</th>
                    <th className="py-2 px-3 text-center text-sub font-medium">{t('table.range')}</th>
                    <th className="py-2 px-3 text-center text-sub font-medium">{t('table.count')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(bounds ?? cuts.map((c, i) => ({ grade: i + 1, cumulative: c, from: 0, to: 0, count: -1 }))).map((b) => {
                    const current = selected.res?.grade === b.grade
                    return (
                      <tr key={b.grade} className={`border-b border-line ${current ? 'bg-subtle font-semibold' : ''}`}>
                        <td className="py-2.5 px-3 text-fg">{b.grade}{t('result.gradeUnit')}</td>
                        <td className="py-2.5 px-3 text-center text-body tabular-nums">{t('table.upTo', { percent: b.cumulative })}</td>
                        <td className="py-2.5 px-3 text-center text-body tabular-nums">
                          {b.count < 0 ? '-' : b.count === 0 ? <span className="text-faint">{t('table.none')}</span> : b.from === b.to ? t('table.single', { rank: b.to }) : t('table.rangeValue', { from: b.from, to: b.to })}
                        </td>
                        <td className="py-2.5 px-3 text-center text-body tabular-nums">{b.count < 0 ? '-' : t('table.people', { count: b.count })}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {bounds?.some((b) => b.count === 0) && (
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-3">{t('notes.small')}</p>
            )}
            <div className="mt-4 bg-subtle rounded-2xl p-5 text-sm text-sub space-y-1.5">
              <p>{t('notes.tie')}</p>
              {system === 5 && <p>{t('notes.fusion')}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* 가이드 */}
      <div className="ui-card p-6">
        <h2 className="text-xl font-semibold text-fg mb-6">{t('guide.title')}</h2>
        <div className="grid md:grid-cols-2 gap-8">
          {(['gradeSystem', 'usage'] as const).map((k) => (
            <div key={k}>
              <h3 className="text-base font-semibold text-fg mb-3">{t(`guide.${k}.title`)}</h3>
              <ul className="space-y-2 list-disc pl-5 text-sm text-sub">
                {(t.raw(`guide.${k}.items`) as string[]).map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <h3 className="text-base font-semibold text-fg mt-8 mb-3">{t('guide.faq.title')}</h3>
        <div className="space-y-4">
          {(t.raw('guide.faq.items') as { q: string; a: string }[]).map((f, i) => (
            <div key={i}>
              <p className="text-sm font-medium text-fg">{f.q}</p>
              <p className="text-sm text-sub mt-1">{f.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
