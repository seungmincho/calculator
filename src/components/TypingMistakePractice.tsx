'use client'

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/typingTest'
import { customTypingStatuses, type CustomTypingAttempt } from '@/utils/customTyping'
import { createTypingReviewAttempt, updateTypingReviewAttempt, TYPING_REVIEW_LIMITS, type TypingReviewSnapshot } from '@/utils/typingReview'

const CHAR_CLASS = { correct: 'text-fg', wrong: 'text-red-500 underline decoration-2 underline-offset-4', composing: 'text-primary underline decoration-2 underline-offset-4', pending: 'text-faint' }
export interface TypingMistakePracticeProps { snapshot: TypingReviewSnapshot | null; active: boolean }

/** Separate memory-only practice; no original run, records, URL, clipboard or storage writes. */
export default function TypingMistakePractice({ snapshot, active }: TypingMistakePracticeProps) {
  const t = useTranslations('typingTest'), inputId = useId()
  const [observed, setObserved] = useState({ snapshot, active })
  const [selected, setSelected] = useState<string | null>(null), [page, setPage] = useState(0)
  const [attempt, setAttempt] = useState<CustomTypingAttempt | null>(null), [practicing, setPracticing] = useState<string | null>(null)
  const [runId, setRunId] = useState(0), [clock, setClock] = useState(0), [failed, setFailed] = useState(false)
  const scope = useMemo(() => ({ snapshot, active }), [snapshot, active])
  const owner = useRef<{ alive: boolean; scope: typeof scope | null; run: number }>({ alive: false, scope: null, run: 0 })
  const attemptRef = useRef<CustomTypingAttempt | null>(null), composing = useRef(false)
  const field = useRef<HTMLTextAreaElement>(null), focusRequest = useRef<number | null>(null)
  if (observed.snapshot !== snapshot || observed.active !== active) {
    setObserved({ snapshot, active }); setSelected(null); setPage(0); setAttempt(null); setPracticing(null); setRunId(value => value + 1); setClock(0); setFailed(false)
  }
  useLayoutEffect(() => {
    const current = owner.current; current.alive = true
    return () => { current.alive = false; current.scope = null; current.run++; attemptRef.current = null; focusRequest.current = null }
  }, [])
  useLayoutEffect(() => {
    const current = owner.current
    current.scope = scope; current.run = runId; composing.current = false
    return () => { if (current.scope === scope) current.scope = null }
  }, [scope, runId])
  useLayoutEffect(() => { attemptRef.current = attempt }, [attempt])
  useLayoutEffect(() => {
    const request = focusRequest.current; focusRequest.current = null
    if (request !== null && active && owner.current.alive && owner.current.scope === scope && owner.current.run === request && request === runId) {
      try { field.current?.focus({ preventScroll: true }) } catch { /* The field remains available for a manual tap. */ }
    }
  }, [active, scope, runId])
  const startedAt = attempt?.startedAt ?? null, completed = !!attempt?.result
  useEffect(() => {
    if (!active || startedAt === null || completed) return
    const timer = setInterval(() => {
      if (owner.current.alive && owner.current.scope === scope && owner.current.run === runId) setClock(performance.now())
    }, 200)
    return () => clearInterval(timer)
  }, [active, scope, runId, startedAt, completed])
  const current = () => active && owner.current.alive && owner.current.scope === scope && owner.current.run === runId
  const pages = Math.max(1, Math.ceil((snapshot?.fragments.length ?? 0) / TYPING_REVIEW_LIMITS.page)), shownPage = Math.min(page, pages - 1)
  const chosen = snapshot?.fragments.find(item => item.id === selected)
  const activeFragment = snapshot?.fragments.find(item => item.id === practicing)
  const tooLong = !!chosen && chosen.end - chosen.start > TYPING_REVIEW_LIMITS.fragment
  const statuses = useMemo(() => attempt ? customTypingStatuses(attempt.target, attempt.typed, attempt.composing) : [], [attempt])
  const elapsed = attempt?.result?.ms ?? (startedAt === null ? 0 : Math.max(0, clock - startedAt))
  function begin(fragmentId: string) {
    if (!current() || !snapshot) return
    try {
      const next = createTypingReviewAttempt(snapshot, fragmentId), nextId = ++owner.current.run
      composing.current = false; attemptRef.current = next; focusRequest.current = nextId
      setRunId(nextId); setAttempt(next); setPracticing(fragmentId); setClock(0); setFailed(false)
    } catch { setFailed(true) }
  }
  function close() {
    if (!current()) return
    const next = ++owner.current.run; composing.current = false; attemptRef.current = null; focusRequest.current = null
    setRunId(next); setAttempt(null); setPracticing(null); setClock(0); setFailed(false)
  }
  function update(value: string, isComposing: boolean) {
    if (!current() || !attemptRef.current || attemptRef.current.result) return
    const now = performance.now(), next = updateTypingReviewAttempt(attemptRef.current, value, isComposing, now)
    attemptRef.current = next; setAttempt(next); setClock(now)
  }
  if (!active || !snapshot) return null
  return <section data-typing-review="" data-typing-review-origin={snapshot.id} className="ui-card min-w-0 space-y-4 p-4 sm:p-6" aria-labelledby={`${inputId}-title`}>
    <div><h2 id={`${inputId}-title`} className="text-lg font-semibold text-fg">{t('review.title')}</h2><p className="mt-2 text-sm text-sub">{t('review.description')}</p></div>
    <p className="text-xs text-muted">{t('review.scope')}</p>
    {snapshot.fragments.length === 0 ? <p data-typing-review-empty="" className="text-sm text-body">{t('review.noErrors')}</p> : <>
      <p className="text-sm text-sub">{t('review.count', { count: snapshot.fragments.length })}</p>
      <fieldset className="space-y-2"><legend className="mb-2 text-sm font-medium text-body">{t('review.choose')}</legend>
        {snapshot.fragments.slice(shownPage * TYPING_REVIEW_LIMITS.page, (shownPage + 1) * TYPING_REVIEW_LIMITS.page).map(fragment => <label key={fragment.id} data-typing-review-fragment={fragment.id} className={`flex min-h-11 min-w-0 cursor-pointer items-start gap-3 rounded-xl p-3 ${selected === fragment.id ? 'bg-primary-soft text-primary' : 'bg-subtle text-body'}`}>
          <input type="radio" name={`${inputId}-fragment`} value={fragment.id} checked={selected === fragment.id} onChange={event => { if (current() && event.target.checked) { setSelected(fragment.id); setFailed(false) } }} className="mt-0.5 size-5 shrink-0 accent-primary" />
          <span className="min-w-0"><span className="block text-xs">{t('review.fragment', { number: fragment.number, start: fragment.start + 1, end: fragment.end })}</span><span className="block whitespace-pre-wrap break-all text-sm">{[...fragment.text].slice(0, 120).join('')}{fragment.end - fragment.start > 120 ? t('review.ellipsis') : ''}</span></span>
        </label>)}
      </fieldset>
      {pages > 1 && <nav aria-label={t('review.pages')} className="flex flex-wrap items-center gap-2">
        <button type="button" data-typing-review-prev="" disabled={shownPage === 0} onClick={() => { if (current()) setPage(shownPage - 1) }} className="ui-btn-soft min-h-11 px-3 py-2 text-sm disabled:opacity-40">{t('review.previous')}</button>
        <span className="text-xs tabular-nums text-sub">{t('review.page', { current: shownPage + 1, total: pages })}</span>
        <button type="button" data-typing-review-next="" disabled={shownPage + 1 >= pages} onClick={() => { if (current()) setPage(shownPage + 1) }} className="ui-btn-soft min-h-11 px-3 py-2 text-sm disabled:opacity-40">{t('review.next')}</button>
      </nav>}
      {chosen && <div className="space-y-2 rounded-xl bg-subtle p-3"><p className="text-sm font-medium text-body">{t('review.preview')}</p><p data-typing-review-preview="" className="max-h-48 overflow-auto whitespace-pre-wrap break-all text-base text-fg">{chosen.text}</p><p className="text-xs text-sub">{t('review.length', { count: chosen.end - chosen.start, max: TYPING_REVIEW_LIMITS.fragment })}</p></div>}
      <p className="text-xs text-muted">{t('review.spaceHint')}</p>
      {tooLong && <p role="alert" className="text-sm text-body">{t('review.tooLong', { max: TYPING_REVIEW_LIMITS.fragment })}</p>}
      {attempt && !completed && <p className="text-xs text-sub">{t('review.replaceHint')}</p>}
      <button type="button" data-typing-review-start="" disabled={!chosen || tooLong} onClick={() => { if (chosen) begin(chosen.id) }} className="ui-btn min-h-11 w-full px-4 py-3 disabled:opacity-40">{t('review.start')}</button>
    </>}
    {failed && <p role="alert" className="text-sm text-body">{t('review.failed')}</p>}
    {attempt && <div data-typing-review-attempt="" className="min-w-0 space-y-3 border-t border-line pt-4">
      <h3 className="text-base font-semibold text-fg">{t('review.current', { number: activeFragment?.number ?? 0 })}</h3>
      <p data-typing-review-target="" lang={attempt.lang} className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-xl bg-subtle p-4 text-xl leading-loose">{[...attempt.target].map((char, index) => <span key={index} data-typing-review-char={statuses[index]} className={CHAR_CLASS[statuses[index]]}>{char}</span>)}</p>
      <label htmlFor={inputId} className="block text-sm font-medium text-body">{t('review.input')}</label>
      <textarea key={runId} id={inputId} ref={field} data-typing-review-input="" value={attempt.typed} disabled={completed} maxLength={[...attempt.target].length * 2} rows={3} spellCheck={false} autoComplete="off" autoCorrect="off" autoCapitalize="off" lang={attempt.lang}
        onCompositionStart={() => { if (current()) composing.current = true }}
        onCompositionEnd={event => { if (!current()) return; composing.current = false; update(event.currentTarget.value, false) }}
        onChange={event => update(event.target.value, composing.current || (event.nativeEvent as InputEvent).isComposing === true)}
        onPaste={event => event.preventDefault()} onDrop={event => event.preventDefault()}
        onBeforeInput={event => { const kind = (event.nativeEvent as InputEvent).inputType; if (kind === 'insertFromPaste' || kind === 'insertFromDrop') event.preventDefault() }}
        onKeyDown={event => { if (composing.current || event.nativeEvent.isComposing || event.keyCode === 229) return; if (event.key === 'Enter') event.preventDefault(); if (event.key === 'Escape') close() }}
        className="ui-field min-h-28 w-full min-w-0 px-3 py-3 text-base" />
      <p className="text-xs text-muted">{t('review.inputHint')}</p>
      <p className="text-sm tabular-nums text-sub">{t('review.elapsed', { seconds: (elapsed / 1000).toFixed(1) })}</p>
      {attempt.result && <div data-typing-review-result="" role="status" className="space-y-2 rounded-xl bg-subtle p-3"><h4 className="text-sm font-semibold text-fg">{t('review.complete')}</h4><p className="text-sm text-body">{t('review.result', { accuracy: attempt.result.accuracy, errors: attempt.result.errors })}</p><p className="text-xs text-sub">{t('review.resultScope')}</p></div>}
      <div className="flex flex-wrap gap-2"><button type="button" data-typing-review-retry="" onClick={() => { if (practicing) begin(practicing) }} className="ui-btn-soft min-h-11 px-4 py-2 text-sm">{t('review.retry')}</button><button type="button" data-typing-review-close="" onClick={close} className="ui-btn-soft min-h-11 px-4 py-2 text-sm">{t('review.close')}</button></div>
    </div>}
  </section>
}
