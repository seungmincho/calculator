'use client'

import { useState, useCallback, useMemo, useEffect, useLayoutEffect, useRef } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/unitConverter'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useHydrated } from '@/hooks/useHydrated'
import { Copy, Check, ArrowUpDown, Search, X } from 'lucide-react'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import GuideSection from '@/components/GuideSection'
import UnitFavorites from '@/components/UnitFavorites'
import UnitBatchConverter from '@/components/UnitBatchConverter'
import UnitCopyRecovery from '@/components/UnitCopyRecovery'
import { useOptionalLanguage } from '@/contexts/LanguageContext'
import { createUnitCopyController, type UnitCopyState, type UnitCopyRequest } from '@/utils/unitBatchActions'
import {
  UNIT_FAVORITE_PRECISIONS, applyUnitFavorite, isUnitFavoritePair, isUnitRecent, parseUnitRecent,
  type UnitFavoritePair, type UnitRecent,
} from '@/utils/unitFavorites'
import {
  CATEGORIES, TRADITIONAL, convert, findUnit, formatNum, isLinear, parseInput, searchUnits, unitsOf,
  type Category,
} from '@/utils/units'

const DEFAULT_PAIR: Record<Category, [string, string]> = {
  length: ['m', 'ft'], weight: ['kg', 'lb'], area: ['m2', 'pyeong'], volume: ['L', 'usGal'],
  temperature: ['degC', 'degF'], speed: ['kmh', 'mph'], data: ['GB', 'GiB'], time: ['h', 'min'],
  pressure: ['psi', 'kPa'], energy: ['kcal', 'kJ'], fuel: ['kmL', 'L100km'], cooking: ['cupKr', 'mL'],
  traditional: ['', ''], css: ['px', 'rem'],
}
const SIG_OPTIONS = UNIT_FAVORITE_PRECISIONS
const RECENT_KEY = 'unitConverter.recent'
interface State { c: Category; f: string; t: string; v: string; p: number; rb: number }

function decode(sp: URLSearchParams): State {
  const c = (CATEGORIES as string[]).includes(sp.get('c') ?? '') ? (sp.get('c') as Category) : 'length'
  const [df, dt] = DEFAULT_PAIR[c]
  const f = findUnit(c, sp.get('f') ?? '') ? sp.get('f')! : df
  const t = findUnit(c, sp.get('t') ?? '') ? sp.get('t')! : dt
  const p = Number(sp.get('p'))
  const rb = Number(sp.get('rb'))
  return {
    c, f, t,
    v: sp.get('v') ?? '1',
    p: SIG_OPTIONS.includes(p) ? p : 10,
    rb: rb > 0 && rb < 1000 ? rb : 16,
  }
}

export default function UnitConverter() {
  const t = useTranslations('unitConverter')
  const language = useOptionalLanguage()?.language ?? 'ko'
  const searchParams = useSearchParams()
  const hydrated = useHydrated()
  const [urlRestored, setUrlRestored] = useState(false)
  const [s, setS] = useState<State>(() => decode(new URLSearchParams()))
  const [copyState, setCopyState] = useState<UnitCopyState | null>(null), [shareRevision, setShareRevision] = useState(0)
  const [batchOpen, setBatchOpen] = useState(false), [batchVisited, setBatchVisited] = useState(false)
  const [query, setQuery] = useState('')
  const [recent, setRecent] = useState<UnitRecent[]>([])
  const [recentIssue, setRecentIssue] = useState<'invalidData' | 'unavailable' | null>(null)
  const recentWritable = useRef(false)
  const recentTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const batchRef = useRef<HTMLDivElement>(null), edited = useRef(false), latestContext = useRef('')
  const clipboard = useRef<ReturnType<typeof createUnitCopyController> | null>(null)
  const invalidateCopy = useCallback(() => { clipboard.current?.invalidate() }, [])
  const invalidateOutputs = useCallback(() => { invalidateCopy(); setShareRevision(value => value + 1) }, [invalidateCopy])
  const set = (p: Partial<State>) => {
    if (Object.entries(p).every(([key, value]) => s[key as keyof State] === value)) return
    edited.current = true; latestContext.current = ''; invalidateOutputs(); setS(prev => ({ ...prev, ...p }))
  }
  useLayoutEffect(() => {
    const owner = createUnitCopyController({ after: (callback, ms) => { const timer = setTimeout(callback, ms); return () => clearTimeout(timer) } }, setCopyState)
    clipboard.current = owner
    return () => { owner.dispose(); clipboard.current = null; latestContext.current = '' }
  }, [])

  // Keep static HTML and the first render identical; restore shared input before URL/history writes.
  if (hydrated && !urlRestored) {
    setUrlRestored(true)
    if (!edited.current) setS(decode(searchParams))
  }

  const uname = useCallback((id: string) => t(`u.${id}`), [t])
  const value = parseInput(s.v)
  const valid = Number.isFinite(value)
  const opts = useMemo(() => ({ remBase: s.rb }), [s.rb])
  const fmt = (x: number, grouping = true) => formatNum(x, s.p, grouping)
  const copyContext = JSON.stringify([s, language, t('batchCopy.failed'), urlRestored])
  useLayoutEffect(() => { latestContext.current = copyContext })
  useLayoutEffect(() => { invalidateOutputs() }, [copyContext, invalidateOutputs])
  useEffect(() => { if (batchOpen) batchRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }) }, [batchOpen])
  const requestCopy = useCallback((request: UnitCopyRequest) => {
    if (!urlRestored || latestContext.current !== copyContext || !clipboard.current) return
    setShareRevision(value => value + 1); void clipboard.current.request(request)
  }, [copyContext, urlRestored])

  // URL 동기화
  useEffect(() => {
    if (!urlRestored) return
    const url = new URL(window.location.href)
    url.searchParams.set('c', s.c)
    if (s.c === 'traditional') { url.searchParams.delete('f'); url.searchParams.delete('t') }
    else { url.searchParams.set('f', s.f); url.searchParams.set('t', s.t) }
    url.searchParams.set('v', s.v)
    if (s.p !== 10) url.searchParams.set('p', String(s.p)); else url.searchParams.delete('p')
    if (s.c === 'css' && s.rb !== 16) url.searchParams.set('rb', String(s.rb)); else url.searchParams.delete('rb')
    window.history.replaceState(window.history.state, '', url)
  }, [s, urlRestored])

  // 최근 변환: 로드 + 입력 멈춘 뒤 1.5초에 저장
  useEffect(() => {
    try {
      const parsed = parseUnitRecent(localStorage.getItem(RECENT_KEY))
      if (parsed.status === 'ready') {
        setRecent(parsed.entries)
        recentWritable.current = true
      } else setRecentIssue('invalidData')
    } catch { setRecentIssue('unavailable') }
  }, [])
  useEffect(() => {
    if (!urlRestored || !valid || s.c === 'traditional') return
    const id = setTimeout(() => {
      recentTimer.current = null
      const item = { c: s.c, f: s.f, t: s.t, v: s.v }
      if (!recentWritable.current || !isUnitRecent(item)) return
      try {
        const stored = parseUnitRecent(localStorage.getItem(RECENT_KEY))
        if (stored.status !== 'ready') {
          recentWritable.current = false
          setRecentIssue('invalidData')
          return
        }
        const next = [item, ...stored.entries.filter((r) => !(r.c === item.c && r.f === item.f && r.t === item.t && r.v === item.v))].slice(0, 8)
        const raw = JSON.stringify(next)
        localStorage.setItem(RECENT_KEY, raw)
        if (localStorage.getItem(RECENT_KEY) !== raw) throw new Error('Recent history write failed')
        setRecent(next)
        setRecentIssue(null)
      } catch {
        recentWritable.current = false
        setRecentIssue('unavailable')
      }
    }, 1500)
    recentTimer.current = id
    return () => { clearTimeout(id); if (recentTimer.current === id) recentTimer.current = null }
  }, [s.c, s.f, s.t, s.v, valid, urlRestored])

  const clearRecent = () => {
    if (recentTimer.current !== null) { clearTimeout(recentTimer.current); recentTimer.current = null }
    try {
      localStorage.removeItem(RECENT_KEY)
      if (localStorage.getItem(RECENT_KEY) !== null) throw new Error('Recent history clear failed')
      setRecent([])
      setRecentIssue(null)
      recentWritable.current = true
    } catch { setRecentIssue('unavailable') }
  }

  const changeCategory = (c: Category) => {
    const [f, to] = DEFAULT_PAIR[c]
    set({ c, f, t: to })
  }

  const swap = () => {
    const r = convert(s.c, s.f, s.t, value, opts)
    set({ f: s.t, t: s.f, v: valid && Number.isFinite(r) ? fmt(r, false) : s.v })
  }

  const hits = useMemo(() => searchUnits(query, (_c, id) => uname(id)), [query, uname])
  const pick = (c: Category, id: string) => {
    const [df, dt] = DEFAULT_PAIR[c]
    set({ c, f: id, t: id === df ? dt : df })
    setQuery('')
    inputRef.current?.focus()
  }

  const units = unitsOf(s.c)
  const from = findUnit(s.c, s.f)
  const to = findUnit(s.c, s.t)
  const result = valid ? convert(s.c, s.f, s.t, value, opts) : NaN
  const currentPair = { c: s.c, f: s.f, t: s.t, p: s.p, rb: s.rb }
  const loadFavorite = (pair: UnitFavoritePair) => set(applyUnitFavorite(s, pair))
  const rows = units.map((u) => ({ u, x: valid ? convert(s.c, s.f, u.id, value, opts) : NaN }))
  const trad = TRADITIONAL.map(([cat, id, metric]) => ({
    cat, id, metric, x: valid ? convert(cat, id, metric, value) : NaN,
    sym: findUnit(cat, id)!.sym, msym: findUnit(cat, metric)!.sym,
  }))

  const Num = ({ x }: { x: number }) => {
    const str = fmt(x)
    const [m, e] = str.split('e')
    return e === undefined ? <>{str}</> : <>{m} × 10<sup>{Number(e)}</sup></>
  }
  const copyBtn = (text: string, id: string) => (
    <button
      type="button"
      data-unit-copy={id} data-unit-copied={copyState?.id === id && copyState.status === 'copied'}
      disabled={!urlRestored || copyState?.id === id && copyState.status === 'copying'}
      onClick={(e) => { e.stopPropagation(); requestCopy({ text, id, label: text }) }}
      className="min-h-11 min-w-11 p-2 rounded-lg text-faint hover:text-body hover:bg-soft shrink-0 disabled:opacity-40"
      aria-label={t('copy')}
    >
      {copyState?.id === id && copyState.status === 'copied' ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
    </button>
  )
  const recovery = copyState?.status === 'failed' ? <UnitCopyRecovery key={copyState.token.sequence} text={copyState.text} label={copyState.label} busy={false}
    onRetry={() => { const owner = clipboard.current; if (owner?.getSnapshot()?.token === copyState.token) { setShareRevision(value => value + 1); void owner.retry(copyState.token) } }}
    onClose={() => clipboard.current?.close(copyState.token)} /> : null

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>
      {copyState?.id !== 'batch' && recovery}

      {/* 단위 검색 */}
      <div className="relative">
        <Search className="w-4 h-4 text-faint absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && hits[0]) pick(hits[0].cat, hits[0].id)
            if (e.key === 'Escape') setQuery('')
          }}
          placeholder={t('searchPlaceholder')}
          aria-label={t('searchPlaceholder')}
          className="ui-field w-full pl-11 pr-10 py-3"
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-faint hover:text-body" aria-label={t('clear')}>
            <X className="w-4 h-4" />
          </button>
        )}
        {query && (
          <div className="absolute z-20 mt-2 w-full bg-surface border border-line rounded-2xl shadow-lg overflow-hidden">
            {hits.length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted">{t('noMatch')}</p>
            ) : hits.map((h) => (
              <button
                key={`${h.cat}.${h.id}`}
                onClick={() => pick(h.cat, h.id)}
                className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-soft"
              >
                <span className="text-fg">{uname(h.id)} <span className="text-muted text-sm">{findUnit(h.cat, h.id)?.sym}</span></span>
                <span className="text-xs text-sub bg-soft rounded-full px-2 py-0.5">{t(`categories.${h.cat}`)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 카테고리 */}
      <div className="flex flex-wrap gap-2" role="tablist">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            role="tab"
            data-unit-category={c}
            aria-selected={s.c === c}
            onClick={() => changeCategory(c)}
            className={`min-h-11 px-3.5 py-2 rounded-full text-sm font-medium transition-colors ${
              s.c === c ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-track'
            }`}
          >
            {t(`categories.${c}`)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 입력 */}
        <div className="min-w-0 lg:col-span-1 space-y-6">
          <div className="ui-card p-6 space-y-4">
            {s.c !== 'traditional' && from && to && valid && Number.isFinite(result) && <MobileResultLink href="#unit-converter-result" label={`${fmt(value)} ${from.sym} =`} value={`${fmt(result)} ${to.sym}`} />}
            <UnitFavorites pair={isUnitFavoritePair(currentPair) ? currentPair : null} traditional={s.c === 'traditional'} onLoad={loadFavorite} />
            <div>
              <label htmlFor="uc-value" className="block text-sm font-medium text-body mb-2">{t('value')}</label>
              <input
                id="uc-value"
                ref={inputRef}
                type="text"
                inputMode="decimal"
                value={s.v}
                onChange={(e) => set({ v: e.target.value })}
                className={`ui-field w-full px-4 py-3 text-lg tabular-nums ${s.v && !valid ? 'border-red-500' : ''}`}
                placeholder="0"
              />
              {s.v && !valid && <p className="text-xs text-red-600 mt-1">{t('invalid')}</p>}
            </div>

            {s.c !== 'traditional' && (
              <>
                <div>
                  <label htmlFor="uc-from" className="block text-sm font-medium text-body mb-2">{t('from')}</label>
                  <select id="uc-from" value={s.f} onChange={(e) => set({ f: e.target.value })} className="ui-field min-h-11 w-full px-4 py-3 text-base">
                    {units.map((u) => <option key={u.id} value={u.id}>{uname(u.id)} ({u.sym})</option>)}
                  </select>
                </div>
                <div className="flex justify-center">
                  <button data-unit-swap="" onClick={swap} className="ui-btn-soft min-h-11 px-4 py-2 inline-flex items-center gap-1.5 text-sm" aria-label={t('swap')}>
                    <ArrowUpDown className="w-4 h-4" /> {t('swap')}
                  </button>
                </div>
                <div>
                  <label htmlFor="uc-to" className="block text-sm font-medium text-body mb-2">{t('to')}</label>
                  <select id="uc-to" value={s.t} onChange={(e) => set({ t: e.target.value })} className="ui-field min-h-11 w-full px-4 py-3 text-base">
                    {units.map((u) => <option key={u.id} value={u.id}>{uname(u.id)} ({u.sym})</option>)}
                  </select>
                </div>
              </>
            )}

            <div className="space-y-2"><button type="button" data-unit-batch-toggle="" aria-expanded={batchOpen} aria-controls="unit-batch-panel" onClick={() => { setBatchVisited(true); setBatchOpen(value => !value) }} className="ui-btn-soft min-h-11 w-full px-4 py-2 text-sm">{t(batchOpen ? 'batch.close' : 'batch.open')}</button><p className="text-xs text-muted">{t('batch.entryHint')}</p></div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="uc-sig" className="block text-sm font-medium text-body mb-2">{t('precision')}</label>
                <select id="uc-sig" value={s.p} onChange={(e) => set({ p: Number(e.target.value) })} className="ui-field min-h-11 w-full px-3 py-2.5 text-base">
                  {SIG_OPTIONS.map((n) => <option key={n} value={n}>{t('sigDigits', { n })}</option>)}
                </select>
              </div>
              {s.c === 'css' && (
                <div>
                  <label htmlFor="uc-rb" className="block text-sm font-medium text-body mb-2">{t('remBase')}</label>
                  <input
                    id="uc-rb" type="number" min={1} value={s.rb}
                    onChange={(e) => { const n = Number(e.target.value); if (n > 0 && n < 1000) set({ rb: n }) }}
                    className="ui-field min-h-11 w-full px-3 py-2.5 text-base"
                  />
                </div>
              )}
            </div>
          </div>

          {/* 대표 결과 */}
          {s.c !== 'traditional' && from && to && (
            <div id="unit-converter-result" className="ui-card p-6 space-y-3 scroll-mt-20">
              <p className="text-sm text-muted">{fmt(value)} {from.sym} =</p>
              <div className="flex items-start justify-between gap-2">
                <p className="text-3xl font-bold text-fg tabular-nums break-all">
                  <Num x={result} /> <span className="text-lg font-semibold text-sub">{to.sym}</span>
                </p>
                {copyBtn(fmt(result, false), 'main')}
              </div>
              <p className="text-xs text-muted">
                {isLinear(s.c)
                  ? `1 ${from.sym} = ${fmt(convert(s.c, s.f, s.t, 1, opts))} ${to.sym}`
                  : t(`formula.${s.c}`)}
              </p>
              {valid && Number.isFinite(result) && (
                <div data-unit-share-boundary="" onClickCapture={invalidateCopy}><ShareResult
                  resultKey={JSON.stringify([copyContext, shareRevision])}
                  className="pt-2"
                  card={{
                    tool: t('title'),
                    label: `${fmt(value)} ${uname(s.f)} (${from.sym})`,
                    headline: `${fmt(result)} ${to.sym}`,
                    rows: rows.filter((r) => r.u.id !== s.f && r.u.id !== s.t).slice(0, 4)
                      .map((r) => ({ label: `${uname(r.u.id)} (${r.u.sym})`, value: fmt(r.x) })),
                  }}
                  text={`${fmt(value)} ${from.sym} = ${fmt(result)} ${to.sym}`}
                /></div>
              )}
            </div>
          )}

          {(recent.length > 0 || recentIssue) && (
            <div className="ui-card p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-fg">{t('recent')}</h2>
                <button
                  onClick={clearRecent}
                  className="min-h-11 px-2 text-xs text-muted hover:text-body"
                >
                  {t('clearRecent')}
                </button>
              </div>
              {recentIssue && <p role="alert" className="mb-3 text-sm text-sub">{t(recentIssue === 'invalidData' ? 'favorites.recentInvalid' : 'favorites.recentUnavailable')}</p>}
              <div className="flex flex-wrap gap-2">
                {recent.map((r) => {
                  const a = findUnit(r.c, r.f), b = findUnit(r.c, r.t)
                  if (!a || !b) return null
                  return (
                    <button
                      key={`${r.c}.${r.f}.${r.t}.${r.v}`}
                      onClick={() => set({ c: r.c, f: r.f, t: r.t, v: r.v })}
                      className="min-h-11 px-3 py-1.5 rounded-full bg-soft text-body text-sm hover:bg-track"
                    >
                      {r.v} {a.sym} → {b.sym}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* 전체 단위 목록 */}
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <div id="unit-batch-panel" ref={batchRef} hidden={!batchOpen} className="scroll-mt-20">
            {batchVisited && <UnitBatchConverter pair={isUnitFavoritePair(currentPair) ? currentPair : null} ready={urlRestored} copyState={copyState}
              onCopy={requestCopy} onInvalidateCopy={invalidateOutputs} onBeginOutput={invalidateOutputs} recovery={copyState?.id === 'batch' ? recovery : undefined} />}
          </div>
          <div className="ui-card p-2 sm:p-4">
            <h2 className="text-sm font-semibold text-fg px-3 pt-3 pb-2">
              {s.c === 'traditional' ? t('tradTitle', { v: valid ? fmt(value) : '—' }) : t('allUnits', { v: valid ? fmt(value) : '—', unit: from?.sym ?? '' })}
            </h2>
            <ul className="divide-y divide-line">
              {s.c === 'traditional'
                ? trad.map((r) => (
                  <li key={r.id}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => set({ c: r.cat, f: r.id, t: r.metric })}
                      onKeyDown={(e) => { if (e.key === 'Enter') set({ c: r.cat, f: r.id, t: r.metric }) }}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-soft cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-body">{fmt(value)} {uname(r.id)}</p>
                        <p className="text-xs text-muted">{t(`categories.${r.cat}`)}</p>
                      </div>
                      <p className="text-fg font-semibold tabular-nums text-right break-all">
                        <Num x={r.x} /> <span className="text-sm text-sub font-normal">{r.msym}</span>
                      </p>
                      {copyBtn(fmt(r.x, false), `trad.${r.id}`)}
                    </div>
                  </li>
                ))
                : rows.map(({ u, x }) => {
                  const isFrom = u.id === s.f, isTo = u.id === s.t
                  return (
                    <li key={u.id}>
                      <div
                        role="button"
                        tabIndex={0}
                        aria-pressed={isTo}
                        onClick={() => set({ t: u.id })}
                        onKeyDown={(e) => { if (e.key === 'Enter') set({ t: u.id }) }}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer border ${
                          isTo ? 'bg-primary-soft border-primary' : 'border-transparent hover:bg-soft'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className={isTo ? 'text-primary font-medium' : 'text-body'}>
                            {uname(u.id)}
                            {isFrom && <span className="ml-2 text-xs text-sub bg-soft rounded-full px-2 py-0.5">{t('input')}</span>}
                          </p>
                          <p className="text-xs text-muted">{u.sym}</p>
                        </div>
                        <p className={`font-semibold tabular-nums text-right break-all ${isTo ? 'text-primary' : 'text-fg'}`}>
                          <Num x={x} />
                        </p>
                        {copyBtn(fmt(x, false), u.id)}
                      </div>
                    </li>
                  )
                })}
            </ul>
            <p className="bg-subtle rounded-2xl p-4 m-2 mt-3 text-sm text-sub">{t(`notes.${s.c}`)}</p>
            {(s.c === 'area' || s.c === 'traditional') && (
              <p className="px-3 pb-3 pt-1 text-sm">
                <Link href="/pyeong-calculator" className="text-primary font-medium hover:underline">{t('pyeongLink')}</Link>
              </p>
            )}
          </div>
        </div>
      </div>

      <GuideSection namespace="unitConverter" />
    </div>
  )
}
