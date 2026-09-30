'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useTranslations } from '@/lib/i18n'
import { useSearchParams } from '@/hooks/useSearchParams'
import { Copy, Check, Maximize2, X, Trash2, SkipForward, RotateCcw } from 'lucide-react'
import ShareResult from '@/components/ShareResult'
import GuideSection from '@/components/GuideSection'
import { parseEntries, seededRng, newSeed, drawWinners, eligibleCount, serializeEntries } from '@/utils/randomPicker'

interface Round {
  id: string
  title: string
  seed: string
  count: number
  /** 참가(뽑을 수 있는 서로 다른 이름) 수 */
  total: number
  tickets: number
  winners: string[]
  excluded: string[]
  ts: number
  link: string
  listInLink: boolean
}

const HISTORY_KEY = 'toolhub.randomPicker.rounds'
const MAX_HISTORY = 30
/** 이보다 긴 명단은 링크에 넣지 않음 (메신저 링크 길이 한계) */
const MAX_LIST_IN_URL = 3000
const QUICK_COUNTS = [1, 3, 5, 10]

const pad = (n: number) => String(n).padStart(2, '0')
const fmtTime = (ts: number) => {
  const d = new Date(ts)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function loadHistory(): Round[] {
  try {
    const v = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
    return Array.isArray(v) ? v : []
  } catch { return [] }
}
function saveHistory(rounds: Round[]) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(rounds.slice(-MAX_HISTORY))) } catch { /* 저장 불가: 무시 */ }
}

export default function RandomPicker() {
  const t = useTranslations('randomPicker')
  const params = useSearchParams()

  const [title, setTitle] = useState('')
  const [listText, setListText] = useState(() => t('sampleList'))
  const [dedupe, setDedupe] = useState(true)
  const [countText, setCountText] = useState('3')
  const [excludePrev, setExcludePrev] = useState(true)
  const [instant, setInstant] = useState(false)
  const [seedInput, setSeedInput] = useState('')

  const [history, setHistory] = useState<Round[]>([])
  const [current, setCurrent] = useState<Round | null>(null)
  const [revealed, setRevealed] = useState(0)
  const [rolling, setRolling] = useState('')
  const [notice, setNotice] = useState<'replayed' | 'listMissing' | null>(null)
  const [presenting, setPresenting] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const rollPool = useRef<string[]>([])
  const urlLoaded = useRef(false)

  useEffect(() => { setHistory(loadHistory()) }, [])

  const parsed = useMemo(() => parseEntries(listText, dedupe), [listText, dedupe])
  const entries = parsed.entries
  const lowerNames = useMemo(() => new Set(entries.map((e) => e.name.toLowerCase())), [entries])
  // 이전 당첨자 중 현재 명단에 있는 사람만 (링크 길이·표시용)
  const excluded = useMemo(() => {
    if (!excludePrev) return []
    const out = new Map<string, string>()
    for (const r of history) for (const w of r.winners) if (lowerNames.has(w.toLowerCase())) out.set(w.toLowerCase(), w)
    return [...out.values()]
  }, [excludePrev, history, lowerNames])
  const eligible = eligibleCount(entries, excluded)
  const totalPeople = eligibleCount(entries)
  const tickets = entries.reduce((s, e) => s + e.weight, 0)
  const hasWeights = entries.some((e) => e.weight > 1)
  const count = parseInt(countText, 10)
  const countError = !entries.length ? t('error.empty')
    : !(count >= 1) ? t('error.count')
    : count > eligible ? t('error.tooMany', { eligible })
    : ''
  const animating = !!current && revealed < current.winners.length

  const buildLink = useCallback((r: { seed: string; count: number; ts: number; title: string }, list: string, ex: string[]) => {
    const q = new URLSearchParams()
    if (r.title) q.set('ti', r.title)
    q.set('n', String(r.count))
    q.set('s', r.seed)
    q.set('d', dedupe ? '1' : '0')
    q.set('t', String(r.ts))
    if (ex.length) q.set('x', ex.join('\n'))
    const listInLink = list.length <= MAX_LIST_IN_URL
    if (listInLink) q.set('l', list)
    return { link: `${window.location.origin}${window.location.pathname}?${q.toString()}`, listInLink }
  }, [dedupe])

  const draw = useCallback(() => {
    if (countError || animating) return
    const seed = seedInput.trim() || newSeed()
    const ts = Date.now()
    const idx = drawWinners(entries, count, seededRng(seed), excluded)
    const { link, listInLink } = buildLink({ seed, count, ts, title: title.trim() }, serializeEntries(entries), excluded)
    const round: Round = {
      id: `${ts}-${seed}`, title: title.trim(), seed, count, total: totalPeople, tickets,
      winners: idx.map((i) => entries[i].name), excluded, ts, link, listInLink,
    }
    const exSet = new Set(excluded.map((n) => n.toLowerCase()))
    rollPool.current = [...new Set(entries.map((e) => e.name))].filter((n) => !exSet.has(n.toLowerCase()))
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    setCurrent(round)
    setRevealed(instant || reduce ? round.winners.length : 0)
    setNotice(null)
    setHistory((h) => { const next = [...h, round].slice(-MAX_HISTORY); saveHistory(next); return next })
    window.history.replaceState(null, '', link)
  }, [countError, animating, seedInput, entries, count, excluded, buildLink, title, totalPeople, tickets, instant])

  // 공유 링크: 같은 시드·명단으로 다시 계산해 결과를 재현 (= 검증)
  useEffect(() => {
    if (urlLoaded.current) return
    const s = params.get('s')
    if (!s) return
    urlLoaded.current = true
    const l = params.get('l')
    const d = params.get('d') !== '0'
    const n = parseInt(params.get('n') || '1', 10) || 1
    const ti = params.get('ti') || ''
    const x = (params.get('x') || '').split('\n').filter(Boolean)
    const ts = parseInt(params.get('t') || '', 10) || Date.now()
    setTitle(ti)
    setDedupe(d)
    setCountText(String(n))
    if (l === null) { setSeedInput(s); setNotice('listMissing'); return }
    setListText(l)
    const es = parseEntries(l, d).entries
    const idx = drawWinners(es, n, seededRng(s), x)
    setCurrent({
      id: `url-${s}`, title: ti, seed: s, count: n, total: eligibleCount(es), tickets: es.reduce((a, e) => a + e.weight, 0),
      winners: idx.map((i) => es[i].name), excluded: x, ts, link: window.location.href, listInLink: true,
    })
    setRevealed(idx.length)
    setNotice('replayed')
  }, [params])

  // 두근두근 공개: 이름이 돌아가다 한 명씩 확정 (결과는 이미 정해져 있고 연출만)
  useEffect(() => {
    if (!current || revealed >= current.winners.length) return
    const pool = rollPool.current.length ? rollPool.current : current.winners
    const iv = setInterval(() => setRolling(pool[Math.floor(Math.random() * pool.length)]), 70)
    const ms = current.winners.length > 10 ? 500 : revealed === 0 ? 2200 : 1400
    const to = setTimeout(() => setRevealed((r) => r + 1), ms)
    return () => { clearInterval(iv); clearTimeout(to) }
  }, [current, revealed])

  const copy = useCallback(async (text: string, id: string) => {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.left = '-999999px'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
    } catch { /* 권한 없음: 무시 */ }
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }, [])

  const announce = (r: Round) => [
    `[${r.title || t('defaultTitle')}] ${t('announce.header')}`,
    t('summary', { winners: r.winners.length, total: r.total, date: fmtTime(r.ts) }),
    '',
    ...r.winners.map((w, i) => `${i + 1}. ${w}`),
    '',
    t('announce.seed', { seed: r.seed }),
    r.link,
  ].join('\n')

  const openPresent = () => {
    setPresenting(true)
    document.documentElement.requestFullscreen?.().catch(() => {})
  }
  const closePresent = useCallback(() => {
    setPresenting(false)
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
  }, [])

  useEffect(() => {
    if (!presenting) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePresent()
      else if ((e.key === ' ' || e.key === 'Enter') && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); draw() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [presenting, draw, closePresent])

  const clearHistory = () => { setHistory([]); saveHistory([]) }

  const shown = current ? current.winners.slice(0, revealed) : []
  const checkbox = 'w-4 h-4 rounded accent-blue-600'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* 설정 */}
        <div className="lg:col-span-1">
          <div className="ui-card p-6 space-y-5">
            <div>
              <label htmlFor="rp-title" className="block text-sm font-medium text-body mb-1.5">{t('form.title')}</label>
              <input id="rp-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('form.titlePlaceholder')}
                maxLength={60} className="ui-field w-full px-4 py-3" />
            </div>

            <div>
              <div className="flex items-baseline justify-between mb-1.5">
                <label htmlFor="rp-list" className="text-sm font-medium text-body">{t('form.list')}</label>
                <span className="text-xs text-sub tabular-nums">
                  {t('form.people', { count: totalPeople })}
                  {hasWeights && ` · ${t('form.tickets', { count: tickets })}`}
                </span>
              </div>
              <textarea id="rp-list" value={listText} onChange={(e) => setListText(e.target.value)} rows={9}
                placeholder={t('form.listPlaceholder')} className="ui-field w-full px-4 py-3 resize-y text-sm leading-6" />
              <p className="text-xs text-muted mt-1.5">{t('form.listHint')}</p>
              {parsed.removed > 0 && <p className="text-xs text-sub mt-1">{t('form.removed', { count: parsed.removed })}</p>}
            </div>

            <label className="flex items-center gap-2 text-sm text-body">
              <input type="checkbox" checked={dedupe} onChange={(e) => setDedupe(e.target.checked)} className={checkbox} />
              {t('form.dedupe')}
            </label>

            <div>
              <label htmlFor="rp-count" className="block text-sm font-medium text-body mb-1.5">{t('form.count')}</label>
              <div className="flex gap-2">
                {QUICK_COUNTS.map((n) => (
                  <button key={n} type="button" onClick={() => setCountText(String(n))} aria-pressed={count === n}
                    className={`px-3 py-2 rounded-xl text-sm font-medium tabular-nums transition-colors ${count === n ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}>
                    {n}
                  </button>
                ))}
                <input id="rp-count" type="number" min={1} value={countText} onChange={(e) => setCountText(e.target.value)}
                  className="ui-field w-full min-w-0 px-3 py-2 tabular-nums" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-body">
                <input type="checkbox" checked={excludePrev} onChange={(e) => setExcludePrev(e.target.checked)} className={checkbox} />
                {t('form.excludePrev')}
              </label>
              {excludePrev && excluded.length > 0 && (
                <p className="text-xs text-sub pl-6">{t('form.excludedNow', { count: excluded.length })}</p>
              )}
              <label className="flex items-center gap-2 text-sm text-body">
                <input type="checkbox" checked={instant} onChange={(e) => setInstant(e.target.checked)} className={checkbox} />
                {t('form.instant')}
              </label>
            </div>

            <details className="bg-subtle rounded-2xl p-4 text-sm" open={notice === 'listMissing' || !!seedInput}>
              <summary className="cursor-pointer font-medium text-body">{t('form.fairness')}</summary>
              <label htmlFor="rp-seed" className="block text-sm text-body mt-3 mb-1.5">{t('form.seed')}</label>
              <input id="rp-seed" value={seedInput} onChange={(e) => setSeedInput(e.target.value)} placeholder={t('form.seedPlaceholder')}
                maxLength={64} className="ui-field w-full px-4 py-2.5 font-mono" />
              <p className="text-xs text-muted mt-2 leading-5">{t('form.seedHint')}</p>
            </details>

            {countError && <p className="text-sm text-red-600" role="alert">{countError}</p>}
            <button onClick={draw} disabled={!!countError || animating} className="ui-btn w-full px-4 py-3.5 text-base">
              {current ? t('drawAgain') : t('draw')}
            </button>
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 space-y-4">
          {notice && (
            <div className="bg-subtle rounded-2xl p-5 text-sm text-sub" role="status">
              {notice === 'replayed' ? t('notice.replayed') : t('notice.listMissing', { seed: seedInput })}
            </div>
          )}

          {current ? (
            <>
              <div className="ui-hero p-6 sm:p-8" aria-live="polite">
                <div className="text-sm text-white/70">{current.title || t('defaultTitle')}</div>
                <div className="text-sm text-white/70 mt-1 tabular-nums">
                  {t('summary', { winners: current.winners.length, total: current.total, date: fmtTime(current.ts) })}
                </div>
                <ol className="mt-5 space-y-2">
                  {shown.map((w, i) => (
                    <li key={`${w}-${i}`} className="flex items-center gap-3">
                      <span className="w-8 shrink-0 text-sm text-white/70 tabular-nums">{t('rank', { rank: i + 1 })}</span>
                      <span className="text-2xl sm:text-3xl font-bold break-all">{w}</span>
                    </li>
                  ))}
                  {animating && (
                    <li className="flex items-center gap-3" aria-hidden="true">
                      <span className="w-8 shrink-0 text-sm text-white/70 tabular-nums">{t('rank', { rank: revealed + 1 })}</span>
                      <span className="text-2xl sm:text-3xl font-bold text-white/50 break-all">{rolling}</span>
                    </li>
                  )}
                </ol>
                {animating && (
                  <button onClick={() => setRevealed(current.winners.length)} className="mt-5 inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-white">
                    <SkipForward className="w-4 h-4" /> {t('skip')}
                  </button>
                )}
              </div>

              {!animating && (
                <>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => copy(announce(current), 'announce')} className="ui-btn-soft px-4 py-2.5 text-sm">
                      {copied === 'announce' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied === 'announce' ? t('copied') : t('copyAnnounce')}
                    </button>
                    <button onClick={openPresent} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold bg-soft text-body hover:bg-subtle">
                      <Maximize2 className="w-4 h-4" /> {t('present')}
                    </button>
                  </div>
                  <ShareResult
                    url={current.link}
                    fileName="toolhub-random-picker"
                    text={t('shareText', { title: current.title || t('defaultTitle'), winners: current.winners.length, total: current.total })}
                    card={{
                      tool: t('title'),
                      label: current.title || t('defaultTitle'),
                      headline: current.winners.length > 3
                        ? t('headlineMore', { names: current.winners.slice(0, 3).join(', '), more: current.winners.length - 3 })
                        : current.winners.join(', '),
                      sub: t('summary', { winners: current.winners.length, total: current.total, date: fmtTime(current.ts) }),
                      rows: [
                        ...current.winners.slice(0, 4).map((w, i) => ({ label: t('rank', { rank: i + 1 }), value: w })),
                        { label: t('proof.seed'), value: current.seed },
                      ],
                    }}
                  />
                </>
              )}

              <div className="ui-card p-6">
                <h2 className="text-base font-semibold text-fg">{t('proof.title')}</h2>
                <dl className="mt-3 grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div className="flex justify-between gap-3"><dt className="text-muted">{t('proof.seed')}</dt><dd className="font-mono text-fg">{current.seed}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-muted">{t('proof.time')}</dt><dd className="text-fg tabular-nums">{fmtTime(current.ts)}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-muted">{t('proof.entrants')}</dt><dd className="text-fg tabular-nums">{t('form.people', { count: current.total })}{current.tickets !== current.total && ` · ${t('form.tickets', { count: current.tickets })}`}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-muted">{t('proof.excluded')}</dt><dd className="text-fg tabular-nums">{t('form.people', { count: current.excluded.length })}</dd></div>
                </dl>
                <p className="text-xs text-muted mt-3 leading-5">{current.listInLink ? t('proof.howTo') : t('proof.listTooLong')}</p>
                <button onClick={() => copy(current.link, 'link')} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                  {copied === 'link' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied === 'link' ? t('copied') : t('proof.copyLink')}
                </button>
              </div>
            </>
          ) : (
            <div className="ui-card p-8 text-center">
              <p className="text-sm text-muted">{t('ready.label')}</p>
              <p className="text-3xl font-bold text-fg tabular-nums mt-2">
                {t('ready.headline', { total: totalPeople, count: count >= 1 ? count : 0 })}
              </p>
              <p className="text-sm text-sub mt-2">{t('ready.sub')}</p>
              <button onClick={draw} disabled={!!countError} className="ui-btn px-6 py-3.5 mt-6 text-base">{t('draw')}</button>
            </div>
          )}

          {history.length > 0 && (
            <div className="ui-card p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-fg">{t('history.title')}</h2>
                <button onClick={clearHistory} className="inline-flex items-center gap-1 text-sm text-sub hover:text-fg">
                  <Trash2 className="w-4 h-4" /> {t('history.clear')}
                </button>
              </div>
              <ul className="mt-3 divide-y divide-line">
                {history.map((r, i) => ({ r, i })).reverse().map(({ r, i }) => (
                  <li key={r.id}>
                    <button onClick={() => { setCurrent(r); setRevealed(r.winners.length); setNotice(null) }}
                      className={`w-full text-left py-3 px-2 -mx-2 rounded-xl transition-colors ${current?.id === r.id ? 'bg-primary-soft' : 'hover:bg-subtle'}`}>
                      <div className="flex items-baseline justify-between gap-3 text-xs text-muted tabular-nums">
                        <span className={current?.id === r.id ? 'text-primary font-semibold' : ''}>
                          {t('history.round', { n: i + 1 })}{r.title && ` · ${r.title}`}
                        </span>
                        <span>{fmtTime(r.ts)}</span>
                      </div>
                      <div className="text-sm text-fg mt-1 break-all">{r.winners.join(', ')}</div>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted mt-2">{t('history.note')}</p>
            </div>
          )}
        </div>
      </div>

      <GuideSection namespace="randomPicker" />

      {/* 발표 모드: 라이브 추첨·빔프로젝터용 */}
      {presenting && (
        <div className="fixed inset-0 z-[100] bg-canvas flex flex-col" role="dialog" aria-modal="true" aria-label={t('present')}>
          <div className="flex items-center justify-between px-6 py-4">
            <div className="text-lg font-semibold text-fg truncate">{title.trim() || current?.title || t('defaultTitle')}</div>
            <button onClick={closePresent} className="p-2 rounded-xl bg-soft text-body hover:bg-subtle" aria-label={t('presentClose')}>
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center overflow-y-auto" aria-live="polite">
            <p className="text-lg sm:text-xl text-muted tabular-nums">
              {current
                ? t('summary', { winners: current.winners.length, total: current.total, date: fmtTime(current.ts) })
                : t('ready.headline', { total: totalPeople, count: count >= 1 ? count : 0 })}
            </p>
            {animating && (
              <p aria-hidden="true" className="mt-8 text-5xl sm:text-7xl lg:text-8xl font-bold text-faint break-all">{rolling}</p>
            )}
            <ol className={`mt-8 flex flex-wrap justify-center gap-4 ${shown.length > 6 ? 'text-3xl sm:text-4xl' : 'text-5xl sm:text-7xl'}`}>
              {shown.map((w, i) => (
                <li key={`${w}-${i}`} className="font-bold text-fg break-all">
                  <span className="text-primary text-[0.5em] align-middle mr-2 tabular-nums">{i + 1}</span>{w}
                </li>
              ))}
            </ol>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 px-6 py-6">
            {animating ? (
              <button onClick={() => current && setRevealed(current.winners.length)} className="ui-btn-soft px-6 py-4 text-lg">
                <SkipForward className="w-5 h-5" /> {t('skip')}
              </button>
            ) : (
              <button onClick={draw} disabled={!!countError} className="ui-btn px-10 py-4 text-xl">
                {current ? <><RotateCcw className="w-5 h-5" /> {t('nextRound')}</> : t('draw')}
              </button>
            )}
            <span className="text-sm text-faint w-full text-center">{t('presentHint')}</span>
          </div>
        </div>
      )}
    </div>
  )
}
