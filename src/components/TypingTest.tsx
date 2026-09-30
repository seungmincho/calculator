'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useTranslations } from '@/lib/i18n'
import { RotateCcw, Shuffle, Copy, Check, Trash2 } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import ShareResult from '@/components/ShareResult'
import {
  TEXTS, type Lang, type CharStatus, diffTyped, correctKeystrokes, perMinute, wpm,
  accuracy, topMissed, gradeLevel, vsAverage, dayNumber, dailyIndex, streamText,
} from '@/utils/typingTest'

type Mode = 'daily' | 'short' | 'long' | 'time'
const MODES: Mode[] = ['daily', 'short', 'long', 'time']
const SECS = [30, 60] as const
type Sec = (typeof SECS)[number]

interface Entry { ts: number; lang: Lang; mode: Mode; speed: number; acc: number }
interface DayRec { best: number; acc: number; tries: number }
interface Result extends Entry {
  ms: number; keys: number; errors: number; missed: [string, number][]; newBest: boolean; day?: number
}

const HISTORY_KEY = 'typing-test-history-v2'
const DAILY_KEY = 'typing-test-daily-v1'
const load = <T,>(k: string, d: T): T => { try { return JSON.parse(localStorage.getItem(k) || '') ?? d } catch { return d } }
const save = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* 저장 불가: 이번 세션만 */ } }
const fmtTime = (ms: number) => { const s = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }

function streak(recs: Record<number, DayRec>, today: number) {
  let d = recs[today] ? today : today - 1, n = 0
  while (recs[d]) { n++; d-- }
  return n
}

const CHAR_CLASS: Record<CharStatus, string> = {
  correct: 'text-fg',
  wrong: 'text-red-500 underline decoration-red-500 decoration-2 underline-offset-4',
  composing: 'text-primary underline decoration-primary decoration-2 underline-offset-4',
  pending: 'text-faint',
}

export default function TypingTest() {
  const t = useTranslations('typingTest')

  const [mode, setMode] = useState<Mode>('daily')
  const [lang, setLang] = useState<Lang>('ko')
  const [sec, setSec] = useState<Sec>(60)
  const [idx, setIdx] = useState(0)
  const [today, setToday] = useState(0)
  const [typed, setTyped] = useState('')
  const [startAt, setStartAt] = useState<number | null>(null)
  const [now, setNow] = useState(0)
  const [result, setResult] = useState<Result | null>(null)
  const [history, setHistory] = useState<Entry[]>([])
  const [daily, setDaily] = useState<Record<number, DayRec>>({})
  const [copied, setCopied] = useState(false)

  const errorsRef = useRef(new Map<number, string>())
  const reachedRef = useRef(0)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const caretRef = useRef<HTMLSpanElement>(null)
  const typedRef = useRef('')

  const L: Lang = mode === 'daily' ? 'ko' : lang
  const target = useMemo(() => {
    if (mode === 'daily') return TEXTS.ko.short[dailyIndex(today || 1)]
    if (mode === 'time') return streamText(lang, idx)
    const pool = TEXTS[lang][mode]
    return pool[idx % pool.length]
  }, [mode, lang, idx, today])
  const T = useMemo(() => [...target], [target])

  // ── 마운트: 기록·오늘 회차·공유 링크 파라미터 ─────────────────────────────
  useEffect(() => {
    setToday(dayNumber(Date.now()))
    setHistory(load<Entry[]>(HISTORY_KEY, []))
    setDaily(load<Record<number, DayRec>>(DAILY_KEY, {}))
    const q = new URLSearchParams(window.location.search)
    const m = q.get('mode') as Mode
    if (MODES.includes(m)) setMode(m)
    if (q.get('lang') === 'en') setLang('en')
    const i = Number(q.get('i'))
    if (Number.isInteger(i) && i >= 0) setIdx(i)
    else setIdx(Math.floor(Math.random() * 1000))
    if (q.get('sec') === '30') setSec(30)
  }, [])

  const reset = useCallback(() => {
    setTyped(''); setStartAt(null); setResult(null)
    errorsRef.current = new Map(); reachedRef.current = 0
    if (boxRef.current) boxRef.current.scrollTop = 0
  }, [])
  // 버튼을 누른 뒤에만 입력칸으로 포커스 (첫 방문 시 모바일 키보드가 뜨지 않게)
  const focusInput = () => setTimeout(() => inputRef.current?.focus(), 0)

  // 설정이 바뀌면 새 판 + URL 동기화 (공유 링크 = 같은 글로 도전)
  useEffect(() => {
    reset()
    if (!today) return
    const url = new URL(window.location.href)
    url.search = ''
    if (mode !== 'daily') {
      url.searchParams.set('mode', mode)
      url.searchParams.set('lang', lang)
      url.searchParams.set('i', String(idx))
      if (mode === 'time') url.searchParams.set('sec', String(sec))
    }
    window.history.replaceState(null, '', url)
  }, [mode, lang, idx, sec, today, reset])

  const statuses = useMemo(() => diffTyped(target, typed), [target, typed])
  typedRef.current = typed

  const finish = useCallback((value: string, end: number) => {
    if (startAt === null) return
    const ms = mode === 'time' ? sec * 1000 : Math.max(1, end - startAt)
    const st = diffTyped(target, value)
    const keys = correctKeystrokes(target, value, st)
    const speed = L === 'ko' ? perMinute(keys, ms) : wpm(st.filter(s => s === 'correct').length, ms)
    const acc = accuracy(reachedRef.current, errorsRef.current.size)
    const entry: Entry = { ts: end, lang: L, mode, speed, acc }
    const prevBest = Math.max(0, ...history.filter(h => h.lang === L).map(h => h.speed))
    const nextHistory = [...history, entry].slice(-100)
    setHistory(nextHistory); save(HISTORY_KEY, nextHistory)
    if (mode === 'daily' && today) {
      const r = daily[today]
      const rec: DayRec = !r || speed > r.best ? { best: speed, acc, tries: (r?.tries ?? 0) + 1 } : { ...r, tries: r.tries + 1 }
      const next = { ...daily, [today]: rec }
      setDaily(next); save(DAILY_KEY, next)
    }
    setResult({
      ...entry, ms, keys, errors: errorsRef.current.size,
      missed: topMissed([...errorsRef.current].map(([i, u]) => [T[i], u])),
      newBest: history.some(h => h.lang === L) && speed > prevBest,
      day: mode === 'daily' ? today : undefined,
    })
  }, [startAt, mode, sec, target, T, L, history, daily, today])

  // 진행 중 시계 (시간제는 여기서 종료 판정)
  useEffect(() => {
    if (startAt === null || result) return
    const id = setInterval(() => {
      const n = Date.now()
      setNow(n)
      if (mode === 'time' && n - startAt >= sec * 1000) finish(typedRef.current, n)
    }, 200)
    return () => clearInterval(id)
  }, [startAt, result, mode, sec, finish])

  // 긴 글/시간제: 캐럿이 보이도록 박스 스크롤
  useEffect(() => {
    const box = boxRef.current, c = caretRef.current
    if (box && c && (c.offsetTop < box.scrollTop || c.offsetTop > box.scrollTop + box.clientHeight - 40)) {
      box.scrollTop = c.offsetTop - 40
    }
  }, [typed])

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (result) return
    const value = [...e.target.value.replace(/[\r\n]/g, '')].slice(0, T.length).join('')
    const n = Date.now()
    if (startAt === null && value) { setStartAt(n); setNow(n) }
    const st = diffTyped(target, value)
    const U = [...value]
    st.forEach((s, i) => { if (s === 'wrong' && !errorsRef.current.has(i)) errorsRef.current.set(i, U[i]) })
    reachedRef.current = Math.max(reachedRef.current, st.filter(s => s === 'correct' || s === 'wrong').length)
    setTyped(value)
    const last = st[T.length - 1]
    if (mode !== 'time' && U.length === T.length && last !== 'composing' && startAt !== null) finish(value, n)
  }

  // ── 표시용 값 ──────────────────────────────────────────────────────────────
  const elapsed = startAt === null ? 0 : (result ? result.ms : now - startAt)
  const liveSpeed = elapsed < 1000 ? 0
    : L === 'ko' ? perMinute(correctKeystrokes(target, typed, statuses), elapsed)
      : wpm(statuses.filter(s => s === 'correct').length, elapsed)
  const liveAcc = accuracy(reachedRef.current, errorsRef.current.size)
  const unit = (n: number, l: Lang = L) => t(l === 'ko' ? 'unit.ko' : 'unit.en', { n: n.toLocaleString() })
  const caretAt = statuses.includes('composing') ? -1 : [...typed].length
  const done = statuses.filter(s => s === 'correct').length

  const langHistory = history.filter(h => h.lang === L)
  const best = langHistory.length ? Math.max(...langHistory.map(h => h.speed)) : 0
  const recent = langHistory.slice(-20)
  const avg = recent.length ? Math.round(recent.reduce((s, h) => s + h.speed, 0) / recent.length) : 0
  const chartData = recent.map((h, i) => ({ n: i + 1, speed: h.speed, acc: h.acc }))
  const todayRec = daily[today]
  const grades = t.raw('grade') as string[]

  const shareText = result ? [
    t('share.text', { lang: t(`language.${result.lang === 'ko' ? 'korean' : 'english'}`), speed: unit(result.speed, result.lang), acc: result.acc }),
    result.day ? t('daily.label', { n: result.day }) : '',
  ].filter(Boolean).join(' · ') : ''
  const copyText = async () => {
    try { await navigator.clipboard.writeText(`${shareText}\n${window.location.href}`) } catch { /* 권한 없음 */ }
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const seg = (on: boolean) => `px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      {/* 설정 */}
      <div className="ui-card p-6 space-y-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('modeLabel')}>
          {MODES.map(m => (
            <button key={m} onClick={() => { setMode(m); focusInput() }} className={seg(mode === m)} aria-pressed={mode === m}>{t(`mode.${m}`)}</button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {mode !== 'daily' && (
            <div className="flex gap-2" role="group" aria-label={t('languageLabel')}>
              {(['ko', 'en'] as Lang[]).map(l => (
                <button key={l} onClick={() => { setLang(l); focusInput() }} className={seg(lang === l)} aria-pressed={lang === l}>
                  {t(`language.${l === 'ko' ? 'korean' : 'english'}`)}
                </button>
              ))}
            </div>
          )}
          {mode === 'time' && (
            <div className="flex gap-2" role="group" aria-label={t('timeLabel')}>
              {SECS.map(s => (
                <button key={s} onClick={() => { setSec(s); focusInput() }} className={seg(sec === s)} aria-pressed={sec === s}>{t('sec', { n: s })}</button>
              ))}
            </div>
          )}
          {mode === 'daily' && (
            <div className="text-sm text-sub">
              <span className="font-semibold text-fg">{today ? t('daily.label', { n: today }) : t('mode.daily')}</span>
              {' · '}{todayRec ? t('daily.best', { speed: unit(todayRec.best, 'ko'), tries: todayRec.tries }) : t('daily.none')}
              {streak(daily, today) > 0 && <> · {t('daily.streak', { n: streak(daily, today) })}</>}
            </div>
          )}
        </div>
      </div>

      {/* 타자 영역 */}
      <div className="ui-card p-6">
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div>
            <div className="text-xs text-muted">{mode === 'time' ? t('live.left') : t('live.time')}</div>
            <div className="text-2xl font-bold text-fg tabular-nums">{mode === 'time' ? fmtTime(sec * 1000 - elapsed) : fmtTime(elapsed)}</div>
          </div>
          <div>
            <div className="text-xs text-muted">{L === 'ko' ? t('live.speedKo') : t('live.speedEn')}</div>
            <div className="text-2xl font-bold text-primary tabular-nums">{liveSpeed.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs text-muted">{t('live.accuracy')}</div>
            <div className="text-2xl font-bold text-fg tabular-nums">{liveAcc}%</div>
          </div>
        </div>

        {mode !== 'time' && (
          <div className="h-1.5 rounded-full bg-track mb-4 overflow-hidden" aria-hidden>
            <div className="h-full bg-primary transition-all" style={{ width: `${(done / T.length) * 100}%` }} />
          </div>
        )}

        <div
          ref={boxRef}
          onClick={() => inputRef.current?.focus()}
          className="relative bg-subtle rounded-2xl p-5 mb-4 max-h-56 overflow-y-auto text-xl leading-loose break-keep cursor-text"
          lang={L}
        >
          {T.map((ch, i) => (
            <span
              key={i}
              ref={i === caretAt ? caretRef : undefined}
              className={`${CHAR_CLASS[statuses[i]]} ${statuses[i] === 'wrong' && ch === ' ' ? 'bg-red-500/20' : ''} ${i === caretAt && !result ? 'shadow-[inset_2px_0_0_var(--primary)]' : ''}`}
            >{ch}</span>
          ))}
        </div>

        <textarea
          ref={inputRef}
          value={typed}
          onChange={onChange}
          onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); if (e.key === 'Escape') reset() }}
          onPaste={e => e.preventDefault()}
          onDrop={e => e.preventDefault()}
          disabled={!!result}
          rows={2}
          placeholder={t('placeholder')}
          aria-label={t('inputLabel')}
          className="ui-field w-full px-4 py-3 text-lg resize-none"
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          lang={L}
        />

        <div className="flex flex-wrap gap-2 mt-4">
          <button onClick={() => { reset(); focusInput() }} className="ui-btn-soft px-4 py-2 inline-flex items-center gap-1.5">
            <RotateCcw className="w-4 h-4" /> {t('restart')}
          </button>
          {mode !== 'daily' && (
            <button onClick={() => { setIdx(i => i + 1); focusInput() }} className="ui-btn-soft px-4 py-2 inline-flex items-center gap-1.5">
              <Shuffle className="w-4 h-4" /> {t('nextText')}
            </button>
          )}
          <span className="text-xs text-faint self-center">{t('escHint')}</span>
        </div>
      </div>

      {/* 결과 */}
      {result && (
        <div className="space-y-4">
          <div className="ui-hero p-6">
            <div className="text-sm text-white/70">
              {result.day ? t('daily.label', { n: result.day }) : t(`mode.${result.mode}`)} · {t(`language.${result.lang === 'ko' ? 'korean' : 'english'}`)}
            </div>
            <div className="text-5xl font-bold mt-2 tabular-nums">{unit(result.speed, result.lang)}</div>
            <div className="text-sm text-white/80 mt-2">
              {t('result.sub', { acc: result.acc, grade: grades[gradeLevel(result.speed, result.lang)] })}
              {' · '}
              {vsAverage(result.speed, result.lang) >= 0
                ? t('result.faster', { n: vsAverage(result.speed, result.lang) })
                : t('result.slower', { n: -vsAverage(result.speed, result.lang) })}
            </div>
            <div className="flex flex-wrap gap-2 mt-4 text-sm">
              {result.newBest && <span className="rounded-full bg-white px-3 py-1 font-semibold text-primary">{t('result.newBest')}</span>}
              <span className="rounded-full bg-white/15 px-3 py-1">{t('result.time', { v: fmtTime(result.ms) })}</span>
              <span className="rounded-full bg-white/15 px-3 py-1">{t('result.keys', { n: result.keys.toLocaleString() })}</span>
              {result.lang === 'en' && <span className="rounded-full bg-white/15 px-3 py-1">{t('result.cpm', { n: perMinute(result.keys, result.ms) })}</span>}
              <span className="rounded-full bg-white/15 px-3 py-1">{t('result.errors', { n: result.errors })}</span>
            </div>
          </div>

          <div className="ui-card p-6 space-y-5">
            <div>
              <h2 className="text-sm font-semibold text-body mb-2">{t('result.missed')}</h2>
              {result.missed.length ? (
                <div className="flex flex-wrap gap-2">
                  {result.missed.map(([k, n]) => (
                    <span key={k} className="rounded-xl bg-soft px-3 py-1.5 text-body">
                      <span className="text-lg font-bold text-fg">{k === ' ' ? t('result.space') : k}</span>
                      <span className="text-sm text-muted ml-1.5">{t('result.times', { n })}</span>
                    </span>
                  ))}
                </div>
              ) : <p className="text-sm text-muted">{t('result.noMissed')}</p>}
            </div>
            <ShareResult
              card={{
                tool: t('title'),
                label: result.day ? t('daily.label', { n: result.day }) : t(`language.${result.lang === 'ko' ? 'korean' : 'english'}`),
                headline: unit(result.speed, result.lang),
                sub: t('result.sub', { acc: result.acc, grade: grades[gradeLevel(result.speed, result.lang)] }),
                rows: [
                  { label: t('live.time'), value: fmtTime(result.ms) },
                  { label: t('live.accuracy'), value: `${result.acc}%` },
                  { label: t('result.errorsLabel'), value: String(result.errors) },
                ],
              }}
              text={shareText}
              fileName="toolhub-typing"
            />
            <div className="flex flex-wrap gap-2">
              <button onClick={copyText} className="ui-btn-soft px-4 py-2 inline-flex items-center gap-1.5">
                {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />} {copied ? t('result.copied') : t('result.copyText')}
              </button>
              <button onClick={() => { reset(); focusInput() }} className="ui-btn px-4 py-2 inline-flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4" /> {t('result.retry')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 기록 */}
      {langHistory.length > 0 && (
        <div className="ui-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-fg">{t('history')} · {t(`language.${L === 'ko' ? 'korean' : 'english'}`)}</h2>
            <button
              onClick={() => { if (confirm(t('clearConfirm'))) { setHistory([]); setDaily({}); save(HISTORY_KEY, []); save(DAILY_KEY, {}) } }}
              className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-red-500"
            >
              <Trash2 className="w-4 h-4" /> {t('clearHistory')}
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[[t('bestRecord'), unit(best)], [t('averageSpeed'), unit(avg)], [t('totalTests'), String(langHistory.length)]].map(([k, v]) => (
              <div key={k} className="bg-subtle rounded-2xl p-4">
                <div className="text-xs text-muted">{k}</div>
                <div className="text-xl font-bold text-fg tabular-nums mt-1">{v}</div>
              </div>
            ))}
          </div>
          <div className="text-xs text-muted mb-2">{t('chartLabel', { n: recent.length })}</div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                <XAxis dataKey="n" tick={{ fill: 'var(--muted)', fontSize: 12 }} stroke="var(--line)" />
                <YAxis tick={{ fill: 'var(--muted)', fontSize: 12 }} stroke="var(--line)" />
                <Tooltip
                  contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, color: 'var(--fg)' }}
                  formatter={(v) => [unit(Number(v ?? 0)), L === 'ko' ? t('live.speedKo') : t('live.speedEn')]}
                  labelFormatter={(n) => t('chartRun', { n: String(n) })}
                />
                <Line type="monotone" dataKey="speed" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 가이드 */}
      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        <p className="text-body leading-relaxed">{t('guide.whatIs.description')}</p>
        {(['howTo', 'rules', 'speed', 'tips'] as const).map(sec => (
          <div key={sec}>
            <h3 className="text-lg font-medium text-fg mb-2">{t(`guide.${sec}.title`)}</h3>
            <ul className="space-y-1.5 list-disc pl-5 text-body">
              {(t.raw(`guide.${sec}.items`) as string[]).map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </div>
        ))}
        <div>
          <h3 className="text-lg font-medium text-fg mb-2">{t('guide.faq.title')}</h3>
          <div className="space-y-3">
            {(t.raw('guide.faq.items') as { q: string; a: string }[]).map((f, i) => (
              <div key={i} className="bg-subtle rounded-2xl p-5">
                <div className="font-semibold text-fg">{f.q}</div>
                <div className="text-sub mt-1 text-sm leading-relaxed">{f.a}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
