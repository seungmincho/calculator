'use client'

import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/jeongsiScore'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useHydrated } from '@/hooks/useHydrated'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import {
  compute, toQuery, parseScores, parseFormula, templateOf, sameFormula, parseSaved, clamp,
  TEMPLATES, TEMPLATE_IDS, DEFAULT_TEMPLATE, DEFAULT_SCORES, SCORE_RANGE, FORMULA_RANGE, MATH_SELS, INQ_TYPES, GROUPS,
  SAVE_KEY, MAX_SAVED, NAME_MAX, type Formula, type Scores, type Saved, type Group, type Area,
} from '@/utils/jeongsiScore'

const fmt = (n: number) => n.toLocaleString('ko-KR', { maximumFractionDigits: 2 })
const signed = (n: number) => (n > 0 ? `+${fmt(n)}` : fmt(n))
const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9]
/** formula.ratio 칸 순서 */
const RI: Record<Area, number> = { kor: 0, math: 1, eng: 2, inq: 3, hist: -1 }
const range = (k: keyof typeof FORMULA_RANGE) => [FORMULA_RANGE[k][1], FORMULA_RANGE[k][2]] as const
const SCORE_ROWS = [
  { key: 'kor', std: 'k', pct: 'kp' },
  { key: 'math', std: 'm', pct: 'mp', sel: 'ms' },
  { key: 'inq1', std: 't1', pct: 't1p', sel: 't1s' },
  { key: 'inq2', std: 't2', pct: 't2p', sel: 't2s' },
] as const
const GUIDE = ['howTo', 'findFormula', 'model'] as const

const seg = (on: boolean) =>
  `min-h-11 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
const labelCls = 'block text-xs font-medium text-sub mb-1.5'
const warnCls = 'bg-amber-50 text-amber-800 rounded-xl px-3 py-2 text-sm'
const linkCls = 'inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline'

/** 숫자 입력: 범위 밖이면 안내를 보이고 값은 범위 안으로 맞춘다. 칸을 벗어나면 맞춘 값으로 돌아간다 */
function NumField({ id, label, value, bounds, onChange, mode = 'numeric', suffix, compact }: {
  id: string; label: ReactNode; value: number; bounds: readonly [number, number]; onChange: (n: number) => void
  mode?: 'numeric' | 'decimal' | 'signed'; suffix?: string; compact?: boolean
}) {
  const t = useTranslations('jeongsiScore')
  const [draft, setDraft] = useState<string | null>(null)
  const [min, max] = bounds
  const shown = draft ?? String(value)
  const n = Number(shown)
  const bad = shown.trim() === '' || !Number.isFinite(n) || n < min || n > max
  return (
    <div className="min-w-0">
      <label htmlFor={id} className={labelCls}>{label}</label>
      <div className="relative">
        <input
          id={id} type="number" inputMode={mode === 'signed' ? undefined : mode} min={min} max={max} step="any" value={shown}
          onChange={(e) => {
            const s = e.target.value
            setDraft(s)
            if (s.trim() !== '' && Number.isFinite(Number(s))) onChange(clamp(Number(s), min, max))
          }}
          onBlur={() => setDraft(null)}
          aria-invalid={bad || undefined}
          aria-describedby={bad ? `${id}-err` : undefined}
          className={`ui-field w-full min-h-11 py-2.5 text-base tabular-nums ${compact ? 'px-2 text-center' : 'px-3'} ${suffix ? 'pr-8' : ''}`}
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted pointer-events-none">{suffix}</span>}
      </div>
      {bad && <p id={`${id}-err`} className="mt-1 rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-800">{t('validation.range', { min, max })}</p>}
    </div>
  )
}

export default function JeongsiScore() {
  const t = useTranslations('jeongsiScore')
  const sp = useSearchParams()
  const hydrated = useHydrated()
  // URL → 값. 하이드레이션 전에는 기본값이라 첫 렌더가 정적 HTML 과 같다. URL 이 늦게 바뀌어도(클라이언트 이동) 따라가고,
  // 사용자가 고치면 그 값이 우선. URL 은 사용자 동작에서만 쓴다(기본값과 다른 것만, 모두 기본이면 쿼리 없음)
  const fromUrl = useMemo(() => {
    if (!hydrated) return { scores: DEFAULT_SCORES, formula: TEMPLATES[DEFAULT_TEMPLATE] as Formula }
    const get = (k: string) => sp.get(k)
    return { scores: parseScores(get), formula: parseFormula(get) }
  }, [hydrated, sp])
  const [edited, setEdited] = useState<{ scores: Scores; formula: Formula } | null>(null)
  const { scores, formula } = edited ?? fromUrl
  const [saved, setSaved] = useState<Saved[]>([])
  const [loaded, setLoaded] = useState(false)
  const [storageOk, setStorageOk] = useState(true)
  const [name, setName] = useState('')
  const [group, setGroup] = useState<Group>('ga')
  const [notice, setNotice] = useState<{ key: string; name?: string } | null>(null)
  const [confirmDel, setConfirmDel] = useState<number | null>(null)

  // 저장한 공식은 하이드레이션 뒤 한 번만 읽는다
  if (hydrated && !loaded) {
    setLoaded(true)
    try { setSaved(parseSaved(window.localStorage.getItem(SAVE_KEY))) } catch { setStorageOk(false) }
  }

  const commit = (s: Scores, f: Formula) => {
    setEdited({ scores: s, formula: f })
    const qs = toQuery(s, f)
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`)
  }
  const setS = <K extends keyof Scores>(k: K, v: Scores[K]) => commit({ ...scores, [k]: v }, formula)
  const setF = <K extends keyof Formula>(k: K, v: Formula[K]) => commit(scores, { ...formula, [k]: v })
  const setFormula = (f: Formula) => commit(scores, f)
  const setAt = (k: 'ratio' | 'engTable' | 'histTable' | 'base', i: number, v: number) =>
    commit(scores, { ...formula, [k]: formula[k].map((x, j) => (j === i ? v : x)) })

  const persist = (next: Saved[]) => {
    try { window.localStorage.setItem(SAVE_KEY, JSON.stringify(next)) } catch {
      setStorageOk(false)
      setNotice({ key: 'saved.storageError' })
      return false
    }
    setSaved(next)
    setStorageOk(true)
    return true
  }
  const save = (e: FormEvent) => {
    e.preventDefault()
    const n = name.trim().slice(0, NAME_MAX)
    if (!n) return setNotice({ key: 'saved.nameRequired' })
    if (saved.length >= MAX_SAVED) return // 버튼이 꺼져 있고 안내 문구가 따로 보인다
    if (persist([...saved, { name: n, group, formula }])) {
      setName('')
      setNotice({ key: 'saved.done', name: n })
    }
  }
  const load = (i: number) => {
    setFormula(saved[i].formula)
    setConfirmDel(null)
    setNotice({ key: 'saved.loaded', name: saved[i].name })
  }
  const remove = (i: number) => {
    if (confirmDel !== i) return setConfirmDel(i)
    setConfirmDel(null)
    if (persist(saved.filter((_, j) => j !== i))) setNotice({ key: 'saved.deleted', name: saved[i].name })
  }

  const r = compute(scores, formula)
  const tpl = templateOf(formula)
  const savedMatch = saved.find((s) => sameFormula(s.formula, formula))
  const formulaName = savedMatch ? savedMatch.name : tpl ? t(`templates.${tpl}.name`) : t('formula.custom')
  const area = (a: Area) => t(`areas.${a}`)
  const engIn = formula.eng === 'ratio'
  const scoreText = fmt(r.score)
  const totalText = fmt(formula.total)
  const resultLabel = t('result.label', { name: formulaName })
  const rows = saved
    .map((s, i) => ({ s, i, res: compute(scores, s.formula) }))
    .sort((a, b) => GROUPS.indexOf(a.s.group) - GROUPS.indexOf(b.s.group) || a.i - b.i)
  const faq = t.raw('guide.faq.items') as { q: string; a: string }[]

  const segGroup = <V extends string>(id: string, label: string, value: V | null, opts: readonly V[], pick: (v: V) => void, optLabel: (v: V) => string) => (
    <div>
      <p id={id} className="text-sm font-medium text-body mb-2">{label}</p>
      <div role="group" aria-labelledby={id} className="flex flex-wrap gap-2">
        {opts.map((v) => (
          <button key={v} type="button" aria-pressed={value === v} onClick={() => pick(v)} className={seg(value === v)}>{optLabel(v)}</button>
        ))}
      </div>
    </div>
  )
  const table = (k: 'engTable' | 'histTable', legend: string, hint: string) => (
    <fieldset>
      <legend className="text-sm font-medium text-body mb-2">{legend}</legend>
      <div className="grid grid-cols-3 sm:grid-cols-9 gap-2">
        {formula[k].map((v, i) => (
          <NumField key={i} id={`js-${k}-${i}`} label={t('gradeN', { g: i + 1 })} value={v} bounds={range(k)} mode="signed" compact onChange={(x) => setAt(k, i, x)} />
        ))}
      </div>
      <p className="text-xs text-muted mt-2">{hint}</p>
    </fieldset>
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8 min-w-0">
          {/* 점수 */}
          <section className="ui-card p-6 space-y-5" aria-labelledby="js-scores">
            <MobileResultLink href="#jeongsi-score-result" label={resultLabel} value={`${scoreText} / ${totalText}`} />
            <div>
              <h2 id="js-scores" className="text-lg font-semibold text-fg">{t('scores.title')}</h2>
              <p className="text-sm text-muted mt-1">{t('scores.desc')}</p>
            </div>
            {SCORE_ROWS.map((row) => (
              <fieldset key={row.key}>
                <legend className="text-sm font-semibold text-fg mb-2">{row.key === 'kor' || row.key === 'math' ? area(row.key) : t(`scores.${row.key}`)}</legend>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {'sel' in row && (
                    <div className="col-span-2 sm:col-span-1 min-w-0">
                      <label htmlFor={`js-${row.sel}`} className={labelCls}>{t(row.sel === 'ms' ? 'scores.mathSel' : 'scores.inqType')}</label>
                      <select
                        id={`js-${row.sel}`} value={scores[row.sel]}
                        onChange={(e) => setS(row.sel, e.target.value as Scores[typeof row.sel])}
                        className="ui-field w-full min-h-11 px-3 py-2.5 text-base"
                      >
                        {((row.sel === 'ms' ? MATH_SELS : INQ_TYPES) as readonly string[]).map((v) => (
                          <option key={v} value={v}>{t(row.sel === 'ms' ? `sel.${v}` : `inqType.${v}`)}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <NumField id={`js-${row.std}`} label={t('scores.std')} value={scores[row.std]} bounds={SCORE_RANGE[row.std]}
                    mode={row.key === 'inq1' || row.key === 'inq2' ? 'decimal' : 'numeric'} onChange={(v) => setS(row.std, v)} />
                  <NumField id={`js-${row.pct}`} label={t('scores.pct')} value={scores[row.pct]} bounds={SCORE_RANGE[row.pct]} onChange={(v) => setS(row.pct, v)} />
                </div>
              </fieldset>
            ))}
            <div className="grid grid-cols-2 gap-3">
              {(['e', 'h'] as const).map((k) => (
                <div key={k} className="min-w-0">
                  <label htmlFor={`js-${k}`} className="block text-sm font-semibold text-fg mb-2">{area(k === 'e' ? 'eng' : 'hist')}</label>
                  <select id={`js-${k}`} value={scores[k]} onChange={(e) => setS(k, Number(e.target.value))} className="ui-field w-full min-h-11 px-3 py-2.5 text-base">
                    {GRADES.map((g) => <option key={g} value={g}>{t('gradeN', { g })}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </section>

          {/* 반영 공식 */}
          <section className="ui-card p-6 space-y-6" aria-labelledby="js-formula">
            <div>
              <h2 id="js-formula" className="text-lg font-semibold text-fg">{t('formula.title')}</h2>
              <p className="text-sm text-muted mt-1">{t('formula.desc')}</p>
            </div>

            <div>
              {segGroup('js-tpl', t('formula.template'), tpl, TEMPLATE_IDS, (id) => setFormula(TEMPLATES[id]), (id) => t(`templates.${id}.name`))}
              <p className="text-sm text-sub mt-2">{tpl ? t(`templates.${tpl}.desc`) : t('formula.customDesc', { name: formulaName })}</p>
              <p className="text-xs text-muted mt-1">{t('formula.templateNote')}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {segGroup('js-idx', t('formula.idx'), formula.idx, ['std', 'pct'] as const, (v) => setF('idx', v), (v) => t(`formula.idxOpt.${v}`))}
              {segGroup('js-eng', t('formula.eng'), formula.eng, ['ratio', 'add'] as const, (v) => setF('eng', v), (v) => t(`formula.engOpt.${v}`))}
            </div>

            <fieldset>
              <legend className="text-sm font-medium text-body mb-2">{t('formula.ratio')}</legend>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(['kor', 'math', 'eng', 'inq'] as const).filter((a) => a !== 'eng' || engIn).map((a) => (
                  <NumField key={a} id={`js-r-${a}`} label={area(a)} value={formula.ratio[RI[a]]} bounds={range('ratio')} mode="decimal" suffix="%"
                    onChange={(v) => setAt('ratio', RI[a], v)} />
                ))}
              </div>
              {r.issues.includes('ratioSum')
                ? <p role="alert" className={`${warnCls} mt-2`}>{t('result.issues.ratioSum', { sum: fmt(r.ratioSum) })}</p>
                : <p className="text-sm text-sub mt-2 tabular-nums">{t('formula.ratioSum', { sum: fmt(r.ratioSum) })}</p>}
              <p className="text-xs text-muted mt-1">{t(engIn ? 'formula.ratioHintIn' : 'formula.ratioHintAdd')}</p>
            </fieldset>

            {segGroup('js-inq', t('formula.inq'), formula.inq, ['avg2', 'top1'] as const, (v) => setF('inq', v), (v) => t(`formula.inqOpt.${v}`))}

            <div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <NumField id="js-mb" label={t('formula.mathBonus')} value={formula.mathBonus} bounds={range('mathBonus')} mode="decimal" suffix="%" onChange={(v) => setF('mathBonus', v)} />
                <NumField id="js-sb" label={t('formula.sciBonus')} value={formula.sciBonus} bounds={range('sciBonus')} mode="decimal" suffix="%" onChange={(v) => setF('sciBonus', v)} />
                <NumField id="js-total" label={t('formula.total')} value={formula.total} bounds={range('total')} mode="decimal" onChange={(v) => setF('total', v)} />
              </div>
              <p className="text-xs text-muted mt-2">{t('formula.bonusHint')}</p>
            </div>

            <fieldset>
              <legend className="text-sm font-medium text-body mb-1">{t('formula.base')}</legend>
              {formula.idx === 'pct' ? <p className="text-sm text-sub">{t('formula.basePct')}</p> : (
                <>
                  <p className="text-sm font-medium text-primary mb-2">{t('formula.baseCta')}</p>
                  <div className="grid grid-cols-3 gap-3">
                    {(['kor', 'math', 'inq'] as const).map((a, i) => (
                      <NumField key={a} id={`js-b-${a}`} label={a === 'inq' ? t('formula.baseInq') : area(a)} value={formula.base[i]} bounds={range('base')} mode="decimal"
                        onChange={(v) => setAt('base', i, v)} />
                    ))}
                  </div>
                  <p className="text-xs text-muted mt-2">{t('formula.baseHint')}</p>
                </>
              )}
            </fieldset>

            <details className="rounded-2xl border border-line">
              <summary className="cursor-pointer min-h-11 flex items-center px-4 py-3 text-sm font-medium text-body">{t('formula.advanced')}</summary>
              <div className="px-4 pb-4 space-y-6">
                {table('engTable', t(engIn ? 'formula.engTableRatio' : 'formula.engTableAdd'), t(engIn ? 'formula.engTableHintRatio' : 'formula.engTableHintAdd'))}
                {r.issues.includes('engTable') && <p role="alert" className={warnCls}>{t('result.issues.engTable')}</p>}
                {table('histTable', t('formula.histTable'), t('formula.histTableHint'))}
              </div>
            </details>
          </section>
        </div>

        {/* 결과: 넓은 화면에서는 공식을 고치는 동안 따라온다 */}
        <div className="min-w-0 space-y-4 lg:sticky lg:top-20 lg:self-start">
          <section id="jeongsi-score-result" className="ui-card p-6 space-y-5 scroll-mt-20" aria-labelledby="js-result-label">
            <div aria-live="polite">
              <p id="js-result-label" className="text-sm text-sub">{resultLabel}</p>
              <p className="mt-1">
                <span className="text-3xl font-bold text-fg tabular-nums">{scoreText}</span>
                <span className="text-base text-sub tabular-nums"> {t('result.outOf', { total: totalText })}</span>
              </p>
              <p className="text-sm text-body mt-1 tabular-nums">{t('result.ofMax', { p: fmt((r.score / formula.total) * 100) })}</p>
            </div>
            {r.issues.map((k) => <p key={k} className={warnCls}>{t(`result.issues.${k}`, { sum: fmt(r.ratioSum) })}</p>)}

            <div>
              <h3 className="text-sm font-semibold text-fg mb-2">{t('result.breakdown')}</h3>
              <ul className="space-y-3">
                {r.parts.map((p) => {
                  const add = p.max === null
                  return (
                    <li key={p.area}>
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="min-w-0 text-body">
                          {area(p.area)}
                          <span className="ml-1.5 text-xs text-muted">{add ? t('result.add') : t('result.ratio', { r: fmt(formula.ratio[RI[p.area]]) })}</span>
                          {p.bonus && <span className="ml-1.5 text-xs font-medium text-primary">{t('result.bonus', { p: fmt(p.area === 'math' ? formula.mathBonus : formula.sciBonus) })}</span>}
                        </span>
                        <span className="shrink-0 font-semibold text-fg tabular-nums">
                          {add ? signed(p.points) : fmt(p.points)}
                          {!add && <span className="font-normal text-muted"> / {fmt(p.max!)}</span>}
                        </span>
                      </div>
                      {!add && p.max! > 0 && (
                        <div className="mt-1.5 h-1.5 rounded-full bg-track overflow-hidden" aria-hidden>
                          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, (p.points / p.max!) * 100))}%` }} />
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
            <p className="text-xs text-muted">{t('result.estimate')}</p>
          </section>

          <ShareResult
            fileName="jeongsi-score"
            card={{
              tool: t('share.tool'),
              label: resultLabel,
              headline: `${scoreText} / ${totalText}`,
              sub: t('share.sub', { idx: t(`formula.idxOpt.${formula.idx}`) }),
              rows: r.parts.map((p) => ({ label: area(p.area), value: p.max === null ? signed(p.points) : `${fmt(p.points)} / ${fmt(p.max)}` })),
            }}
            text={t('share.text', { name: formulaName, score: scoreText, total: totalText })}
          />
          <div className="flex flex-col items-start">
            <Link href="/jeongsi-2027/" className={linkCls}>{t('result.links.schedule')}</Link>
            <Link href="/csat-grade/" className={linkCls}>{t('result.links.grade')}</Link>
          </div>
        </div>
      </div>

      {/* 저장·비교 */}
      <section className="ui-card p-6 space-y-5" aria-labelledby="js-saved">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="js-saved" className="text-lg font-semibold text-fg">{t('saved.title')}</h2>
          <span className="text-sm text-sub tabular-nums">{t('saved.count', { n: saved.length, max: MAX_SAVED })}</span>
        </div>
        <p className="text-sm text-muted -mt-3">{t('saved.desc')}</p>

        <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 sm:items-end">
          <div className="min-w-0">
            <label htmlFor="js-save-name" className={labelCls}>{t('saved.name')}</label>
            <input id="js-save-name" type="text" value={name} maxLength={NAME_MAX} placeholder={t('saved.namePlaceholder')}
              onChange={(e) => setName(e.target.value)} className="ui-field w-full min-h-11 px-4 py-3 text-base" />
          </div>
          <div>
            <label htmlFor="js-save-group" className={labelCls}>{t('saved.group')}</label>
            <select id="js-save-group" value={group} onChange={(e) => setGroup(e.target.value as Group)} className="ui-field w-full min-h-11 px-3 py-3 text-base">
              {GROUPS.map((g) => <option key={g} value={g}>{t(`groups.${g}`)}</option>)}
            </select>
          </div>
          <button type="submit" disabled={saved.length >= MAX_SAVED || !storageOk} className="ui-btn min-h-11 px-4 py-3 disabled:opacity-50">{t('saved.save')}</button>
        </form>
        <p role="status" className="text-sm text-body min-h-5">{notice ? t(notice.key, { name: notice.name ?? '' }) : ''}</p>
        {saved.length >= MAX_SAVED && <p className="text-sm text-sub">{t('saved.full', { max: MAX_SAVED })}</p>}
        {!storageOk && <p className={warnCls}>{t('saved.storageError')}</p>}

        {rows.length === 0 ? <p className="bg-subtle rounded-2xl p-5 text-sm text-sub">{t('saved.empty')}</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-sm">
              <caption className="text-left text-sm font-medium text-body pb-3">{t('saved.caption')}</caption>
              <thead>
                <tr className="border-b border-line text-left text-sub">
                  <th scope="col" className="py-2 px-2 font-medium">{t('saved.th.group')}</th>
                  <th scope="col" className="py-2 px-2 font-medium">{t('saved.th.name')}</th>
                  <th scope="col" className="py-2 px-2 font-medium text-right">{t('saved.th.score')}</th>
                  <th scope="col" className="py-2 px-2 font-medium text-right">{t('saved.th.rate')}</th>
                  <th scope="col" className="py-2 px-2 font-medium"><span className="sr-only">{t('saved.th.actions')}</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ s, i, res }) => {
                  const on = sameFormula(s.formula, formula)
                  return (
                    <tr key={i} className={`border-b border-line ${on ? 'bg-primary-soft' : ''}`}>
                      <td className="py-2.5 px-2 text-body whitespace-nowrap">{t(`groups.${s.group}`)}</td>
                      <th scope="row" className={`py-2.5 px-2 text-left font-medium break-all ${on ? 'text-primary' : 'text-fg'}`}>{s.name}</th>
                      <td className="py-2.5 px-2 text-right font-semibold text-fg tabular-nums whitespace-nowrap">
                        {fmt(res.score)}<span className="font-normal text-muted"> / {fmt(s.formula.total)}</span>
                        {res.issues.length > 0 && <span className="block text-xs font-normal text-amber-800">{t('saved.checkFormula')}</span>}
                      </td>
                      <td className="py-2.5 px-2 text-right text-body tabular-nums whitespace-nowrap">{fmt((res.score / s.formula.total) * 100)}%</td>
                      <td className="py-2 px-2">
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => load(i)} aria-label={t('saved.loadAria', { name: s.name })} className="ui-btn-soft min-h-11 px-3 py-2 text-sm whitespace-nowrap">{t('saved.load')}</button>
                          <button type="button" onClick={() => remove(i)} aria-label={t(confirmDel === i ? 'saved.confirmAria' : 'saved.deleteAria', { name: s.name })}
                            className={`min-h-11 px-3 py-2 rounded-xl text-sm whitespace-nowrap ${confirmDel === i ? 'bg-amber-50 text-amber-800' : 'bg-soft text-body hover:bg-subtle'}`}>
                            {t(confirmDel === i ? 'saved.confirm' : 'saved.delete')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-muted">{t('saved.compareNote')}</p>
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
          <h3 className="font-semibold text-fg mb-3">{t('guide.faq.title')}</h3>
          <div className="divide-y divide-line border-y border-line">
            {faq.map((f) => (
              <details key={f.q} className="py-3">
                <summary className="cursor-pointer text-sm font-medium text-body min-h-[44px] flex items-center">{f.q}</summary>
                <p className="text-sm text-sub mt-2 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
