'use client'

import { useState, useMemo, useEffect } from 'react'
import { ChevronDown, Minus, Plus, ExternalLink } from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import { useSearchParams } from '@/hooks/useSearchParams'
import ShareResult from '@/components/ShareResult'
import { todayKST, addYears, isValidDate } from '@/utils/dday'
import {
  homelessStart, scoreAt, nextHomelessUp, nextSubUp, householdMax, isNewlywed,
  backYears, backMonths, subScoreByMonths, spouseSubScoreByMonths, type ScoreInput,
} from '@/utils/housingSubscription'

type Mode = 'date' | 'direct'
type Status = 'yes' | 'check' | 'no'

const dot = (d: string) => d.replaceAll('-', '.')
const int = (s: string | null, d: number, lo: number, hi: number) => {
  const n = Number(s)
  return s != null && s !== '' && Number.isInteger(n) ? Math.min(hi, Math.max(lo, n)) : d
}
const date = (s: string | null, d: string) => (isValidDate(s) ? s : d)

const D = { birth: '1990-05-15', marriage: '2019-10-12', sub: '2015-03-01' }
const A_OPTS = [-1, ...Array.from({ length: 16 }, (_, i) => i)] // -1 = 해당 없음, 0 = 1년 미만, 15 = 15년 이상
const C_OPTS = [0, 6, ...Array.from({ length: 15 }, (_, i) => (i + 1) * 12)] // 개월
const SC_OPTS = [-1, 0, 12, 24] // 배우자: 없음, 1년 미만, 1~2년, 2년 이상
const PROJ = [0, 1, 2, 3, 5]

function Stepper({ value, onChange, max, label }: { value: number; onChange: (n: number) => void; max: number; label: string }) {
  const btn = 'w-9 h-9 rounded-xl bg-soft hover:bg-track text-body flex items-center justify-center disabled:opacity-40'
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-body">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" className={btn} disabled={value <= 0} onClick={() => onChange(value - 1)} aria-label={`${label} -1`}><Minus className="w-4 h-4" /></button>
        <span className="w-6 text-center font-semibold text-fg tabular-nums">{value}</span>
        <button type="button" className={btn} disabled={value >= max} onClick={() => onChange(value + 1)} aria-label={`${label} +1`}><Plus className="w-4 h-4" /></button>
      </div>
    </div>
  )
}

export default function HousingSubscription() {
  const t = useTranslations('housingSubscription')
  const sp = useSearchParams()

  // 오늘은 마운트 후에 정함 (정적 HTML 빌드 날짜로 계산되지 않게)
  const [today, setToday] = useState('')
  const [ref, setRef] = useState(() => date(sp.get('ref'), ''))
  const [mode, setMode] = useState<Mode>(() => (sp.get('m') === 'd' ? 'direct' : 'date'))
  // 날짜 모드
  const [birth, setBirth] = useState(() => date(sp.get('b'), D.birth))
  const [marriage, setMarriage] = useState(() => (sp.get('mar') === '' ? '' : date(sp.get('mar'), D.marriage)))
  const [neverOwned, setNeverOwned] = useState(() => sp.get('own') !== '1')
  const [disposal, setDisposal] = useState(() => date(sp.get('dis'), ''))
  const [subStart, setSubStart] = useState(() => date(sp.get('s'), D.sub))
  const [spouseSub, setSpouseSub] = useState(() => date(sp.get('ss'), ''))
  // 직접 선택 모드
  const [ha, setHa] = useState(() => int(sp.get('ha'), 6, -1, 15))
  const [sm, setSm] = useState(() => int(sp.get('sm'), 132, 0, 180))
  const [ssm, setSsm] = useState(() => int(sp.get('ssm'), -1, -1, 24))
  // 부양가족
  const [spouse, setSpouse] = useState(() => sp.get('sp') !== '0')
  const [parents, setParents] = useState(() => int(sp.get('p'), 0, 0, 4))
  const [children, setChildren] = useState(() => int(sp.get('c'), 2, 0, 6))
  const [baby, setBaby] = useState(() => sp.get('nb') === '1')

  useEffect(() => {
    const d = todayKST()
    setToday(d)
    setRef(r => r || d)
  }, [])

  // URL 동기화 (기본값은 생략)
  useEffect(() => {
    if (!today) return
    const url = new URL(window.location.href)
    const set = (k: string, v: string | null) => (v == null ? url.searchParams.delete(k) : url.searchParams.set(k, v))
    for (const k of ['dependents', 'married', 'homelessYears', 'subMonths']) url.searchParams.delete(k) // 예전 링크
    const dm = mode === 'date'
    set('m', dm ? null : 'd')
    set('ref', ref && ref !== today ? ref : null)
    set('b', dm && birth !== D.birth ? birth : null)
    set('mar', dm && marriage !== D.marriage ? marriage : null)
    set('own', neverOwned ? null : '1')
    set('dis', dm && !neverOwned && disposal ? disposal : null)
    set('s', dm && subStart !== D.sub ? subStart : null)
    set('ss', dm && spouse && spouseSub ? spouseSub : null)
    set('ha', !dm ? String(ha) : null)
    set('sm', !dm ? String(sm) : null)
    set('ssm', !dm && spouse && ssm >= 0 ? String(ssm) : null)
    set('sp', spouse ? null : '0')
    set('p', parents ? String(parents) : null)
    set('c', children !== 2 ? String(children) : null)
    set('nb', baby ? '1' : null)
    window.history.replaceState({}, '', url.toString())
  }, [today, ref, mode, birth, marriage, neverOwned, disposal, subStart, spouseSub, ha, sm, ssm, spouse, parents, children, baby])

  // 예전 링크(?dependents=&homelessYears=&subMonths=) → 직접 선택 모드로
  useEffect(() => {
    const dep = sp.get('dependents'), hy = sp.get('homelessYears'), sMon = sp.get('subMonths')
    if (dep == null && hy == null && sMon == null) return
    setMode('direct')
    if (dep != null) { setSpouse(false); setParents(0); setChildren(int(dep, 0, 0, 6)) }
    if (hy != null) setHa(Math.min(15, Math.floor(Number(hy) || 0)))
    if (sMon != null) setSm(C_OPTS.filter(m => m <= (Number(sMon) || 0)).pop() ?? 0)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const dependents = (spouse ? 1 : 0) + parents + children

  const input: ScoreInput | null = useMemo(() => {
    if (!ref) return null
    if (mode === 'direct') {
      return {
        homelessStart: ha < 0 ? null : backYears(ref, ha),
        subStart: backMonths(ref, sm),
        spouseSubStart: spouse && ssm >= 0 ? backMonths(ref, ssm) : null,
        dependents,
      }
    }
    if (!birth) return null
    return {
      homelessStart: homelessStart(birth, marriage || null, neverOwned ? null : disposal || null),
      subStart: subStart || null,
      spouseSubStart: spouse && spouseSub ? spouseSub : null,
      dependents,
    }
  }, [ref, mode, ha, sm, ssm, spouse, dependents, birth, marriage, neverOwned, disposal, subStart, spouseSub])

  const r = useMemo(() => {
    if (!input || !ref) return null
    const now = scoreAt(input, ref)
    const proj = PROJ.map(y => ({ y, total: scoreAt(input, addYears(ref, y)).total }))
    return {
      now, proj, next: proj[1].total,
      nextA: mode === 'date' ? nextHomelessUp(input.homelessStart, ref) : null,
      nextC: mode === 'date' ? nextSubUp(input.subStart, ref) : null,
      maxA: input.homelessStart ? addYears(input.homelessStart, 15) : null,
      maxC: input.subStart ? addYears(input.subStart, 15) : null,
      hhMax: householdMax(dependents),
    }
  }, [input, ref, mode, dependents])

  // 무주택 기산 사유
  const startReason = (() => {
    if (mode !== 'date' || !birth || !input?.homelessStart) return null
    const s = input.homelessStart
    const why = !neverOwned && disposal && s === disposal ? 'disposal' : marriage && s === marriage ? 'marriage' : 'age30'
    return t('inp.startIs', { date: dot(s), why: t(`inp.why.${why}`) })
  })()
  const under30Single = mode === 'date' && !!input?.homelessStart && !!ref && input.homelessStart > ref

  const status = (): { key: string; s: Status }[] => {
    const newlywed: Status = mode === 'date' ? (isNewlywed(marriage || null, ref) ? 'yes' : 'no') : spouse ? 'check' : 'no'
    return [
      { key: 'newlywed', s: newlywed },
      { key: 'firstHome', s: neverOwned ? 'check' : 'no' },
      { key: 'newborn', s: baby ? 'yes' : 'no' },
      { key: 'multiChild', s: children >= 2 ? 'yes' : 'no' },
      { key: 'elderly', s: parents >= 1 ? 'check' : 'no' },
    ]
  }

  const reset = () => {
    setRef(today); setMode('date'); setBirth(D.birth); setMarriage(D.marriage); setNeverOwned(true); setDisposal('')
    setSubStart(D.sub); setSpouseSub(''); setHa(6); setSm(132); setSsm(-1)
    setSpouse(true); setParents(0); setChildren(2); setBaby(false)
  }

  const seg = (on: boolean) => `px-3 py-2 text-sm font-medium rounded-lg transition-colors ${on ? 'bg-primary text-white' : 'text-sub hover:text-fg'}`
  const label = 'block text-sm font-medium text-body mb-1.5'
  const field = 'ui-field w-full px-4 py-3'
  const pt = (n: number) => t('pt', { n })

  const ratioRows = t.raw('ratio.rows') as { size: string; spec: string; adj: string; other: string }[]
  const ratioNotes = t.raw('ratio.notes') as string[]
  const rules = t.raw('guide.rules') as { title: string; items: string[] }[]
  const faq = t.raw('guide.faq.items') as { q: string; a: string }[]
  const sources = t.raw('guide.sources.items') as { label: string; url: string }[]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('inp.lead')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <div className="lg:col-span-1">
          <div className="ui-card p-6 space-y-6">
            <div className="grid grid-cols-2 gap-1 bg-soft rounded-xl p-1">
              <button type="button" className={seg(mode === 'date')} onClick={() => setMode('date')}>{t('mode.date')}</button>
              <button type="button" className={seg(mode === 'direct')} onClick={() => setMode('direct')}>{t('mode.direct')}</button>
            </div>

            <div>
              <label className={label} htmlFor="hs-ref">{t('inp.ref')}</label>
              <input id="hs-ref" type="date" value={ref} onChange={e => setRef(e.target.value)} className={field} />
              <p className="text-xs text-muted mt-1">{t('inp.refHint')}</p>
            </div>

            {/* A. 무주택기간 */}
            <section className="space-y-3 border-t border-line pt-5">
              <h2 className="text-sm font-semibold text-fg">{t('sectionA')} <span className="text-faint font-normal">{t('maxA')}</span></h2>
              {mode === 'date' ? (
                <>
                  <div>
                    <label className={label} htmlFor="hs-birth">{t('birthDateLabel')}</label>
                    <input id="hs-birth" type="date" value={birth} max={ref || undefined} onChange={e => setBirth(e.target.value)} className={field} />
                  </div>
                  <div>
                    <label className={label} htmlFor="hs-mar">{t('inp.marriage')}</label>
                    <input id="hs-mar" type="date" value={marriage} max={ref || undefined} onChange={e => setMarriage(e.target.value)} className={field} />
                    <p className="text-xs text-muted mt-1">{t('inp.marriageHint')}</p>
                  </div>
                </>
              ) : (
                <div>
                  <label className={label} htmlFor="hs-ha">{t('inp.homelessPeriod')}</label>
                  <select id="hs-ha" value={ha} onChange={e => setHa(Number(e.target.value))} className={field}>
                    {A_OPTS.map(v => (
                      <option key={v} value={v}>
                        {v < 0 ? t('direct.aNone') : v === 0 ? t('direct.under1y', { pt: pt(2) }) : v === 15 ? t('direct.over15y', { pt: pt(32) }) : t('direct.yRange', { from: v, to: v + 1, pt: pt(2 + 2 * v) })}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <label className="flex items-start gap-2 text-sm text-body cursor-pointer">
                <input type="checkbox" checked={neverOwned} onChange={e => setNeverOwned(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[var(--primary)]" />
                <span>{t('inp.neverOwned')}</span>
              </label>
              {mode === 'date' && !neverOwned && (
                <div>
                  <label className={label} htmlFor="hs-dis">{t('inp.disposal')}</label>
                  <input id="hs-dis" type="date" value={disposal} max={ref || undefined} onChange={e => setDisposal(e.target.value)} className={field} />
                  <p className="text-xs text-muted mt-1">{t('inp.disposalHint')}</p>
                </div>
              )}
              {startReason && <p className="text-xs text-sub bg-subtle rounded-xl px-3 py-2">{startReason}</p>}
              {under30Single && (
                <p className="text-xs bg-amber-50 text-amber-800 rounded-xl px-3 py-2">{t('inp.under30', { date: dot(input!.homelessStart!) })}</p>
              )}
            </section>

            {/* B. 부양가족 */}
            <section className="space-y-3 border-t border-line pt-5">
              <h2 className="text-sm font-semibold text-fg">{t('sectionB')} <span className="text-faint font-normal">{t('maxB')}</span></h2>
              <label className="flex items-start gap-2 text-sm text-body cursor-pointer">
                <input type="checkbox" checked={spouse} onChange={e => setSpouse(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[var(--primary)]" />
                <span>{t('inp.spouse')}</span>
              </label>
              <Stepper label={t('inp.parents')} value={parents} onChange={setParents} max={4} />
              <Stepper label={t('inp.children')} value={children} onChange={setChildren} max={6} />
              <label className="flex items-start gap-2 text-sm text-body cursor-pointer">
                <input type="checkbox" checked={baby} onChange={e => setBaby(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[var(--primary)]" />
                <span>{t('inp.baby')}</span>
              </label>
              <p className="text-xs text-muted">{t('inp.dependentsHint', { n: dependents })}</p>
            </section>

            {/* C. 청약통장 */}
            <section className="space-y-3 border-t border-line pt-5">
              <h2 className="text-sm font-semibold text-fg">{t('sectionC')} <span className="text-faint font-normal">{t('maxC')}</span></h2>
              {mode === 'date' ? (
                <>
                  <div>
                    <label className={label} htmlFor="hs-sub">{t('subStartLabel')}</label>
                    <input id="hs-sub" type="date" value={subStart} max={ref || undefined} onChange={e => setSubStart(e.target.value)} className={field} />
                  </div>
                  {spouse && (
                    <div>
                      <label className={label} htmlFor="hs-ss">{t('inp.spouseSub')}</label>
                      <input id="hs-ss" type="date" value={spouseSub} max={ref || undefined} onChange={e => setSpouseSub(e.target.value)} className={field} />
                      <p className="text-xs text-muted mt-1">{t('inp.spouseSubHint')}</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <label className={label} htmlFor="hs-sm">{t('inp.subPeriod')}</label>
                    <select id="hs-sm" value={sm} onChange={e => setSm(Number(e.target.value))} className={field}>
                      {C_OPTS.map(m => (
                        <option key={m} value={m}>
                          {m === 0 ? t('direct.under6m', { pt: pt(1) }) : m === 6 ? t('direct.m6to12', { pt: pt(2) }) : m === 180 ? t('direct.over15y', { pt: pt(17) }) : t('direct.yRange', { from: m / 12, to: m / 12 + 1, pt: pt(subScoreByMonths(m)) })}
                        </option>
                      ))}
                    </select>
                  </div>
                  {spouse && (
                    <div>
                      <label className={label} htmlFor="hs-ssm">{t('inp.spouseSub')}</label>
                      <select id="hs-ssm" value={ssm} onChange={e => setSsm(Number(e.target.value))} className={field}>
                        {SC_OPTS.map(m => (
                          <option key={m} value={m}>
                            {m < 0 ? t('direct.spouseNone') : m === 0 ? t('direct.under1y', { pt: pt(1) }) : m === 12 ? t('direct.yRange', { from: 1, to: 2, pt: pt(2) }) : t('direct.over2y', { pt: pt(spouseSubScoreByMonths(m)) })}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-muted mt-1">{t('inp.spouseSubHint')}</p>
                    </div>
                  )}
                </>
              )}
            </section>

            <button type="button" onClick={reset} className="ui-btn-soft w-full px-4 py-2.5 text-sm">{t('reset')}</button>
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="ui-card p-6 space-y-6">
            {r ? (
              <>
                <div>
                  <p className="text-sm text-muted">{t('res.label', { date: dot(ref) })}</p>
                  <p className="mt-1">
                    <span className="text-5xl font-bold text-fg tabular-nums">{r.now.total}</span>
                    <span className="text-lg text-faint ml-1">{t('outOf84')}</span>
                  </p>
                  <p className="text-sm text-sub mt-2">
                    {t('res.nextYear', { score: r.next, diff: r.next - r.now.total })}
                    {' · '}
                    {t('res.toMax', { n: 84 - r.now.total })}
                  </p>
                </div>

                <div className="space-y-4">
                  {([
                    ['A', t('sectionA'), r.now.a, 32, r.now.homelessYears == null ? t('res.notCounted') : r.now.homelessYears === 0 ? t('res.under1y') : t('res.years', { n: r.now.homelessYears })],
                    ['B', t('sectionB'), r.now.b, 35, t('res.persons', { n: dependents })],
                    ['C', t('sectionC'), r.now.c, 17, r.now.cSpouse ? t('res.subWithSpouse', { own: r.now.cOwn, sp: r.now.cSpouse }) : t('res.months', { y: Math.floor(r.now.subMonths / 12), m: r.now.subMonths % 12 })],
                  ] as const).map(([k, name, s, max, detail]) => (
                    <div key={k} className="space-y-1.5">
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="text-body">{name} <span className="text-faint">· {detail}</span></span>
                        <span className="font-semibold text-fg tabular-nums whitespace-nowrap">{s} <span className="text-faint font-normal">/ {max}</span></span>
                      </div>
                      <div className="h-2.5 bg-track rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${(s / max) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                <ShareResult
                  fileName="housing-subscription-score"
                  text={t('share.text', { score: r.now.total })}
                  card={{
                    tool: t('title'),
                    label: t('share.label'),
                    headline: t('share.headline', { score: r.now.total }),
                    sub: t('res.nextYear', { score: r.next, diff: r.next - r.now.total }),
                    rows: [
                      { label: t('sectionA'), value: `${r.now.a} / 32` },
                      { label: t('sectionB'), value: `${r.now.b} / 35` },
                      { label: t('sectionC'), value: `${r.now.c} / 17` },
                      { label: t('bench.title'), value: pt(r.hhMax) },
                    ],
                  }}
                />
              </>
            ) : (
              <p className="text-sm text-muted">{t('res.empty')}</p>
            )}
          </div>

          {r && (
            <>
              {/* 앞으로 오르는 점수 */}
              <div className="ui-card p-6 space-y-4">
                <h2 className="text-lg font-semibold text-fg">{t('proj.title')}</h2>
                <div className="grid grid-cols-5 gap-2">
                  {r.proj.map(p => (
                    <div key={p.y} className={`rounded-xl px-2 py-3 text-center ${p.y === 0 ? 'bg-primary-soft text-primary' : 'bg-subtle'}`}>
                      <div className={`text-xs ${p.y === 0 ? '' : 'text-muted'}`}>{p.y === 0 ? t('proj.now') : t('proj.later', { n: p.y })}</div>
                      <div className={`text-xl font-bold tabular-nums mt-1 ${p.y === 0 ? '' : 'text-fg'}`}>{p.total}</div>
                    </div>
                  ))}
                </div>
                <ul className="text-sm text-body space-y-1.5">
                  {r.nextA && <li>{t('proj.nextA', { date: dot(r.nextA) })}</li>}
                  {r.nextC && <li>{t('proj.nextC', { date: dot(r.nextC) })}</li>}
                  <li>{r.now.a >= 32 ? t('proj.maxADone') : r.maxA ? t('proj.maxA', { date: dot(r.maxA) }) : t('proj.maxANone')}</li>
                  <li>{r.now.c >= 17 ? t('proj.maxCDone') : r.maxC ? t('proj.maxC', { date: dot(r.maxC) }) : '-'}</li>
                  <li>{dependents >= 6 ? t('proj.maxBDone') : t('proj.maxB', { n: 6 - dependents })}</li>
                </ul>
                <p className="text-xs text-muted">{t('proj.note')}</p>
              </div>

              {/* 가구 기준 최고점 + 커트라인 */}
              <div className="ui-card p-6 space-y-3">
                <h2 className="text-lg font-semibold text-fg">{t('bench.title')}</h2>
                <p className="text-sm text-body">{t('bench.desc', { size: dependents + 1, max: r.hhMax, score: r.now.total })}</p>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {[0, 1, 2, 3, 4, 5, 6].map(n => (
                    <div key={n} className={`rounded-xl px-2 py-2 text-center ${Math.min(6, dependents) === n ? 'bg-primary-soft text-primary' : 'bg-subtle text-sub'}`}>
                      <div className="text-xs">{t('bench.size', { n: n + 1 })}{n === 6 ? '+' : ''}</div>
                      <div className="font-bold tabular-nums">{householdMax(n)}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-subtle rounded-2xl p-4 text-sm text-sub">
                  {t('bench.cutline')}{' '}
                  <a href="https://www.applyhome.co.kr" target="_blank" rel="noopener noreferrer" className="text-primary font-medium inline-flex items-center gap-1">
                    {t('bench.cutlineLink')} <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* 특별공급 */}
              <div className="ui-card p-6 space-y-3">
                <h2 className="text-lg font-semibold text-fg">{t('special.title')}</h2>
                <ul className="divide-y divide-line">
                  {status().map(({ key, s }) => (
                    <li key={key} className="py-3 flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-fg">{t(`special.${key}.name`)}</div>
                        <div className="text-xs text-muted mt-0.5">{t(`special.${key}.req`)}</div>
                      </div>
                      <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${s === 'yes' ? 'bg-primary-soft text-primary' : s === 'check' ? 'bg-soft text-sub' : 'text-faint'}`}>
                        {t(`special.status.${s}`)}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted">{t('special.note')}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 가점제 vs 추첨제 */}
      <div className="ui-card p-6 space-y-4">
        <h2 className="text-xl font-semibold text-fg">{t('ratio.title')}</h2>
        <p className="text-sm text-body">{t('ratio.desc')}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="border-b border-line text-muted">
                <th className="text-left py-2 font-medium">{t('ratio.size')}</th>
                <th className="text-left py-2 font-medium">{t('ratio.spec')}</th>
                <th className="text-left py-2 font-medium">{t('ratio.adj')}</th>
                <th className="text-left py-2 font-medium">{t('ratio.other')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {ratioRows.map(row => (
                <tr key={row.size}>
                  <td className="py-2.5 text-fg font-medium">{row.size}</td>
                  <td className="py-2.5 text-body">{row.spec}</td>
                  <td className="py-2.5 text-body">{row.adj}</td>
                  <td className="py-2.5 text-body">{row.other}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="list-disc pl-5 space-y-1 text-xs text-muted">
          {ratioNotes.map((x, i) => <li key={i}>{x}</li>)}
        </ul>
      </div>

      {/* 가이드 */}
      <div className="ui-card p-6 space-y-8">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {rules.map(sec => (
            <section key={sec.title}>
              <h3 className="text-base font-semibold text-fg mb-3">{sec.title}</h3>
              <ul className="list-disc pl-5 space-y-1.5 text-sm text-body">
                {sec.items.map((x, i) => <li key={i}>{x}</li>)}
              </ul>
            </section>
          ))}
        </div>

        <section>
          <h3 className="text-base font-semibold text-fg mb-3">{t('guide.faq.title')}</h3>
          <div className="divide-y divide-line border-y border-line">
            {faq.map((f, i) => (
              <details key={i} className="group py-3">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-3 text-sm font-medium text-fg">
                  {f.q}
                  <ChevronDown className="w-4 h-4 text-faint shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <p className="text-sm text-body mt-2">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-base font-semibold text-fg mb-3">{t('guide.sources.title')}</h3>
          <ul className="space-y-1.5 text-sm">
            {sources.map(s => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                  {s.label} <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted mt-3">{t('guide.sources.asOf')}</p>
        </section>
      </div>
    </div>
  )
}
