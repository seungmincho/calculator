'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/mbtiTest'
import { useSearchParams } from '@/hooks/useSearchParams'
import { ChevronLeft, RotateCcw, ExternalLink } from 'lucide-react'
import ShareResult from '@/components/ShareResult'
import { compatibilityMatrix } from '@/data/mbtiData'
import {
  AXES, TYPES, QUESTIONS, LIKERT, scoreAnswers, parseShare, shareQuery, isBorderline, sanitizeAnswers, type TypeCode,
} from '@/utils/mbti'

const STORE = 'mbti-test-progress'
const empty = () => Array<number | null>(QUESTIONS.length).fill(null)

export default function MbtiTest() {
  const t = useTranslations('mbtiTest')
  const sp = useSearchParams()
  const shared = parseShare(sp.get('r'), sp.get('s'), sp.get('result'))

  const [answers, setAnswers] = useState<(number | null)[]>(empty)
  const [idx, setIdx] = useState(0)
  const [started, setStarted] = useState(false)
  const [resumed, setResumed] = useState(false)
  const [mine, setMine] = useState(false)
  const [browse, setBrowse] = useState<TypeCode | null>(null)
  const lock = useRef(false)

  // 새로고침 복원 (마운트 후)
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORE) ?? 'null')
      const a = sanitizeAnswers(saved?.answers)
      if (a && a.some((v) => v != null)) {
        setAnswers(a)
        setIdx(Math.min(Math.max(0, Number(saved.idx) || 0), QUESTIONS.length - 1))
        setStarted(true)
        setResumed(true)
      }
    } catch { /* 저장소 없음 */ }
  }, [])

  useEffect(() => {
    if (!started) return
    try { sessionStorage.setItem(STORE, JSON.stringify({ answers, idx })) } catch { /* 무시 */ }
  }, [started, answers, idx])

  const view = shared ? 'result' : started ? 'test' : 'intro'
  const answered = answers.filter((v) => v != null).length
  const allDone = answered === QUESTIONS.length

  const finish = useCallback((a: (number | null)[]) => {
    const r = scoreAnswers(a)
    try { sessionStorage.removeItem(STORE) } catch { /* 무시 */ }
    setStarted(false)
    setMine(true)
    window.history.replaceState(null, '', `${window.location.pathname}?${shareQuery(r.type, r.pct)}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const answer = useCallback((v: number) => {
    if (lock.current) return
    const next = answers.slice()
    next[idx] = v
    setAnswers(next)
    setResumed(false)
    const done = next.every((x) => x != null)
    if (done && idx === QUESTIONS.length - 1) { finish(next); return }
    lock.current = true
    setTimeout(() => {
      // 다음 미응답 문항으로, 없으면 다음 문항(검토 중)
      const nextOpen = next.findIndex((x, i) => i > idx && x == null)
      setIdx(nextOpen >= 0 ? nextOpen : Math.min(idx + 1, QUESTIONS.length - 1))
      lock.current = false
    }, 150)
  }, [answers, idx, finish])

  const prev = useCallback(() => setIdx((i) => Math.max(0, i - 1)), [])

  const restart = useCallback(() => {
    try { sessionStorage.removeItem(STORE) } catch { /* 무시 */ }
    setAnswers(empty())
    setIdx(0)
    setMine(false)
    setResumed(false)
    setStarted(true)
    if (window.location.search) window.history.replaceState(null, '', window.location.pathname)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // 키보드: 1~5 답, ←/Backspace 이전
  useEffect(() => {
    if (view !== 'test') return
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const el = e.target as HTMLElement
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable) return
      if (e.key >= '1' && e.key <= '5') { e.preventDefault(); answer(Number(e.key)) }
      else if (e.key === 'ArrowLeft' || e.key === 'Backspace') { e.preventDefault(); prev() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [view, answer, prev])

  const questions = t.raw('questions') as string[]
  const likert = t.raw('likert') as string[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      {view === 'intro' && (
        <div className="ui-card p-6 space-y-4">
          <button onClick={restart} className="ui-btn w-full px-4 py-4 text-lg">{t('startTest')}</button>
          <p className="text-xs text-faint">{t('disclaimer')}</p>
        </div>
      )}

      {view === 'test' && (
        <div className="space-y-4">
          <div className="ui-card p-5">
            <div className="flex items-center justify-between mb-3 text-sm">
              <button
                onClick={prev}
                disabled={idx === 0}
                className="inline-flex items-center gap-1 min-h-[44px] -ml-2 px-2 rounded-xl text-body hover:bg-soft disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" /> {t('prev')}
              </button>
              <span className="font-semibold text-fg tabular-nums">
                {t('progressCount', { n: idx + 1, total: QUESTIONS.length })}
              </span>
              <button onClick={restart} className="min-h-[44px] px-2 -mr-2 rounded-xl text-muted hover:bg-soft">
                {t('restart')}
              </button>
            </div>
            <div
              className="w-full bg-track rounded-full h-2"
              role="progressbar"
              aria-valuenow={answered}
              aria-valuemin={0}
              aria-valuemax={QUESTIONS.length}
            >
              <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${(answered / QUESTIONS.length) * 100}%` }} />
            </div>
            {resumed && <p className="text-xs text-muted mt-2">{t('resumed')}</p>}
          </div>

          <div className="ui-card p-6 sm:p-8">
            <p key={idx} className="text-lg sm:text-xl font-semibold text-fg text-center leading-relaxed mb-6 min-h-[3.5rem] break-keep">
              {questions[idx]}
            </p>
            <div className="flex flex-col gap-2" role="radiogroup" aria-label={questions[idx]}>
              {LIKERT.map((v, i) => {
                const on = answers[idx] === v
                return (
                  <button
                    key={v}
                    role="radio"
                    aria-checked={on}
                    onClick={() => answer(v)}
                    className={`flex items-center gap-3 w-full min-h-[48px] px-4 rounded-xl border text-left font-medium transition-colors ${
                      on ? 'bg-primary-soft text-primary border-primary' : 'border-line text-body hover:bg-soft'
                    }`}
                  >
                    <span className={`w-6 text-center text-sm tabular-nums ${on ? 'text-primary' : 'text-faint'}`}>{v}</span>
                    {likert[i]}
                  </button>
                )
              })}
            </div>
            <p className="hidden sm:block text-xs text-faint text-center mt-4">{t('keyHint')}</p>
          </div>

          {allDone && (
            <button onClick={() => finish(answers)} className="ui-btn w-full px-4 py-3">{t('seeResult')}</button>
          )}
        </div>
      )}

      {view === 'result' && shared && (
        <Result
          t={t}
          type={shared.type}
          pct={shared.pct}
          mine={mine}
          onRetake={restart}
        />
      )}

      {/* 16유형 둘러보기 */}
      <div className="ui-card p-6">
        <h2 className="text-lg font-semibold text-fg">{t('browseTitle')}</h2>
        <p className="text-sm text-muted mt-1 mb-4">{t('browseHint')}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TYPES.map((code) => (
            <button
              key={code}
              onClick={() => setBrowse((b) => (b === code ? null : code))}
              aria-expanded={browse === code}
              className={`min-h-[56px] px-3 py-2 rounded-xl border text-left transition-colors ${
                browse === code ? 'bg-primary-soft text-primary border-primary' : 'border-line hover:bg-soft'
              }`}
            >
              <div className={`font-bold tabular-nums ${browse === code ? 'text-primary' : 'text-fg'}`}>{code}</div>
              <div className={`text-xs ${browse === code ? 'text-primary' : 'text-muted'}`}>{t(`types.${code}.nickname`)}</div>
            </button>
          ))}
        </div>
        {browse && (
          <div className="mt-5 pt-5 border-t border-line">
            <h3 className="text-lg font-bold text-fg">
              {browse} · {t(`types.${browse}.nickname`)}
            </h3>
            <p className="text-sm text-muted mb-4">{t(`types.${browse}.short`)}</p>
            <TypeDetail t={t} type={browse} />
          </div>
        )}
      </div>

      <Guide t={t} />
    </div>
  )
}

type T = ReturnType<typeof useTranslations>

function Result({ t, type, pct, mine, onRetake }: { t: T; type: TypeCode; pct: number[] | null; mine: boolean; onRetake: () => void }) {
  const nickname = t(`types.${type}.nickname`)
  const axes = pct
    ? AXES.map((ax, a) => {
        const first = pct[a]
        const dom = first > 50 ? ax[0] : ax[1]
        return { ax, first, dom, domPct: Math.max(first, 100 - first), border: isBorderline(first) }
      })
    : null

  return (
    <div className="space-y-4">
      <div className="ui-hero p-8 text-center">
        <div className="text-sm text-white/70">{mine ? t('yourType') : t('sharedResult')}</div>
        <div className="text-5xl font-bold tracking-wider mt-2 tabular-nums">{type}</div>
        <div className="text-xl font-semibold mt-2">{nickname}</div>
        <div className="text-sm text-white/70 mt-1">{t(`types.${type}.short`)}</div>
      </div>

      {!mine && (
        <button onClick={onRetake} className="ui-btn w-full px-4 py-3">{t('takeTest')}</button>
      )}

      <div className="ui-card p-6">
        <h2 className="text-lg font-semibold text-fg mb-5">{t('typeDistribution')}</h2>
        {axes ? (
          <>
            <div className="space-y-5">
              {axes.map(({ ax, first, dom, domPct, border }) => (
                <div key={ax}>
                  <div className="flex items-center gap-2 mb-1.5 text-xs text-muted">
                    {t(`axisName.${ax}`)}
                    {border && <span className="px-2 py-0.5 rounded-full bg-soft text-sub">{t('borderline')}</span>}
                  </div>
                  <div className="flex items-center justify-between mb-1.5 text-sm">
                    {[ax[0], ax[1]].map((l, i) => (
                      <span key={l} className={`tabular-nums ${dom === l ? 'font-bold text-primary' : 'text-muted'}`}>
                        {i === 0
                          ? `${l} ${t(`letter.${l}`)} ${first}%`
                          : `${100 - first}% ${t(`letter.${l}`)} ${l}`}
                      </span>
                    ))}
                  </div>
                  <div className="flex h-3 rounded-full overflow-hidden bg-track" aria-label={`${dom} ${domPct}%`}>
                    <div className={dom === ax[0] ? 'bg-primary' : 'bg-primary-soft'} style={{ width: `${first}%` }} />
                    <div className={dom === ax[1] ? 'bg-primary' : 'bg-primary-soft'} style={{ width: `${100 - first}%` }} />
                  </div>
                </div>
              ))}
            </div>
            {axes.some((a) => a.border) && (
              <p className="bg-subtle rounded-2xl p-4 text-sm text-sub mt-5">{t('borderlineNote')}</p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted">{t('noScores')}</p>
        )}
      </div>

      <div className="ui-card p-6">
        <TypeDetail t={t} type={type} />
      </div>

      <div className="ui-card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-fg">{t('shareResult')}</h2>
        <ShareResult
          card={{
            tool: t('title'),
            label: t('shareLabel'),
            headline: type,
            sub: `${nickname} · ${t(`types.${type}.short`)}`,
            rows: axes?.map((a) => ({ label: t(`axisName.${a.ax}`), value: `${a.dom} ${a.domPct}%` })),
          }}
          text={t('shareText', { type, nickname })}
          fileName={`mbti-${type}`}
        />
        <div className="flex flex-wrap gap-2">
          <a
            href={`/mbti-compatibility/?type1=${type}`}
            className="ui-btn-soft px-4 py-2.5 text-sm"
          >
            <ExternalLink className="w-4 h-4" /> {t('checkCompatibility')}
          </a>
          {mine && (
            <button onClick={onRetake} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold bg-soft text-body hover:bg-track">
              <RotateCcw className="w-4 h-4" /> {t('retake')}
            </button>
          )}
        </div>
        <p className="text-xs text-faint">{t('disclaimer')}</p>
      </div>
    </div>
  )
}

function TypeDetail({ t, type }: { t: T; type: TypeCode }) {
  const list = (k: string) => t.raw(`types.${type}.${k}`) as string[]
  const matches = (Object.entries(compatibilityMatrix[type]) as [TypeCode, number][])
    .filter(([, r]) => r === 5)
    .map(([c]) => c)
  return (
    <div className="space-y-5">
      <p className="text-body leading-relaxed">{t(`types.${type}.desc`)}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(['strengths', 'weaknesses'] as const).map((k) => (
          <div key={k} className="bg-subtle rounded-2xl p-5">
            <h3 className="font-semibold text-fg mb-2">{t(k)}</h3>
            <ul className="space-y-1.5 text-sm text-sub list-disc pl-4">
              {list(k).map((s) => <li key={s}>{s}</li>)}
            </ul>
          </div>
        ))}
      </div>
      <div>
        <h3 className="font-semibold text-fg mb-2">{t('careers')}</h3>
        <div className="flex flex-wrap gap-2">
          {list('careers').map((c) => (
            <span key={c} className="px-3 py-1.5 bg-soft text-body rounded-lg text-sm">{c}</span>
          ))}
        </div>
      </div>
      {matches.length > 0 && (
        <div>
          <h3 className="font-semibold text-fg mb-2">{t('bestMatch')}</h3>
          <div className="flex flex-wrap gap-2">
            {matches.map((m) => (
              <a
                key={m}
                href={`/mbti-compatibility/?type1=${type}&type2=${m}`}
                className="px-3 py-1.5 bg-soft hover:bg-track text-body rounded-lg text-sm"
              >
                <span className="font-semibold">{m}</span> {t(`types.${m}.nickname`)}
              </a>
            ))}
          </div>
          <p className="text-xs text-faint mt-2">{t('bestMatchNote')}</p>
        </div>
      )}
    </div>
  )
}

function Guide({ t }: { t: T }) {
  const sections = [
    { title: t('guide.axes.title'), items: t.raw('guide.axes.items') as string[] },
    { title: t('guide.howToUse.title'), items: t.raw('guide.howToUse.items') as string[] },
    { title: t('guide.scoring.title'), items: t.raw('guide.scoring.items') as string[] },
    { title: t('guide.tips.title'), items: t.raw('guide.tips.items') as string[] },
  ]
  const faq = t.raw('guide.faq.items') as { q: string; a: string }[]
  return (
    <div className="ui-card p-6 space-y-6">
      <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
      <div>
        <h3 className="font-semibold text-fg mb-2">{t('guide.whatIs.title')}</h3>
        <p className="text-sm text-sub leading-relaxed">{t('guide.whatIs.description')}</p>
      </div>
      {sections.map((s) => (
        <div key={s.title}>
          <h3 className="font-semibold text-fg mb-2">{s.title}</h3>
          <ul className="space-y-1.5 text-sm text-sub list-disc pl-4">
            {s.items.map((i) => <li key={i}>{i}</li>)}
          </ul>
        </div>
      ))}
      <div>
        <h3 className="font-semibold text-fg mb-3">{t('guide.faq.title')}</h3>
        <div className="space-y-3">
          {faq.map((f) => (
            <div key={f.q} className="bg-subtle rounded-2xl p-5">
              <p className="font-medium text-fg">{f.q}</p>
              <p className="text-sm text-sub mt-1 leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
