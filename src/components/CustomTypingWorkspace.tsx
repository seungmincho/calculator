'use client'

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/typingTest'
import TypingSummaryCopy from '@/components/TypingSummaryCopy'
import TypingMistakePractice from '@/components/TypingMistakePractice'
import { captureTypingReview, collectTypingReviewErrors, type TypingReviewSnapshot } from '@/utils/typingReview'
import { accuracy, correctKeystrokes, perMinute, wpm, type CharStatus, type Lang } from '@/utils/typingTest'
import { CUSTOM_TYPING_MIN, CUSTOM_TYPING_MAX, createCustomTypingAttempt, customTypingStatuses, prepareCustomTypingText, updateCustomTypingAttempt, type CustomTypingAttempt } from '@/utils/customTyping'

const CHAR_CLASS: Record<CharStatus, string> = {
  correct: 'text-fg', wrong: 'text-red-500 underline decoration-2 underline-offset-4',
  composing: 'text-primary underline decoration-2 underline-offset-4', pending: 'text-faint',
}

/** Kept mounted by the parent to retain a private draft; active=false ends the running attempt and all its timers. */
export default function CustomTypingWorkspace({ active }: { active: boolean }) {
  const t = useTranslations('typingTest')
  const draftId = useId(), inputId = useId()
  const [draft, setDraft] = useState('')
  const [lang, setLang] = useState<Lang>('ko')
  const [attempt, setAttempt] = useState<CustomTypingAttempt | null>(null)
  const [runId, setRunId] = useState(0)
  const [clock, setClock] = useState(0)
  const [reviewSnapshot, setReviewSnapshot] = useState<TypingReviewSnapshot | null>(null), [reviewFailed, setReviewFailed] = useState(false)
  const [lastActive, setLastActive] = useState(active)
  const mounted = useRef(false)
  const activeRef = useRef(active)
  const generation = useRef(0)
  const attemptRef = useRef<CustomTypingAttempt | null>(null)
  const composingRef = useRef(false)
  const input = useRef<HTMLTextAreaElement>(null)
  const focusRequest = useRef<number | null>(null)
  const reviewErrors = useRef<readonly number[]>([]), reviewInvalid = useRef(false), reviewOrigin = useRef(0)

  if (lastActive !== active) {
    setLastActive(active)
    if (!active) {
      setAttempt(previous => previous ? createCustomTypingAttempt(previous.target, previous.lang) : null)
      setRunId(previous => previous + 1); setClock(0)
      setReviewSnapshot(null); setReviewFailed(false)
    }
  }
  const invalidate = useCallback(() => { generation.current++ }, [])
  useLayoutEffect(() => { mounted.current = true; return () => { mounted.current = false; invalidate() } }, [invalidate])
  useLayoutEffect(() => { activeRef.current = active; generation.current = runId; reviewErrors.current = []; reviewInvalid.current = false; if (!active) composingRef.current = false }, [active, runId])
  useLayoutEffect(() => { attemptRef.current = attempt }, [attempt])
  useLayoutEffect(() => {
    const request = focusRequest.current
    if (request === null) return
    focusRequest.current = null
    if (active && mounted.current && generation.current === request && runId === request) input.current?.focus()
  }, [active, runId])
  const startedAt = attempt?.startedAt ?? null
  const completed = !!attempt?.result
  useEffect(() => {
    if (!active || startedAt === null || completed) return
    const request = runId
    const timer = setInterval(() => {
      if (mounted.current && activeRef.current && generation.current === request) setClock(performance.now())
    }, 200)
    return () => clearInterval(timer)
  }, [active, startedAt, completed, runId])

  const preview = useMemo(() => prepareCustomTypingText(draft), [draft])
  const statuses = useMemo(() => attempt ? customTypingStatuses(attempt.target, attempt.typed, attempt.composing) : [], [attempt])
  const targetChars = useMemo(() => [...(attempt?.target ?? '')], [attempt?.target])
  const current = () => mounted.current && activeRef.current && generation.current === runId
  const elapsed = attempt?.result?.ms ?? (startedAt === null ? 0 : Math.max(0, clock - startedAt))
  const liveSpeed = !attempt || elapsed < 1000 ? 0 : attempt.lang === 'ko'
    ? perMinute(correctKeystrokes(attempt.target, attempt.typed, statuses), elapsed)
    : wpm(statuses.filter(status => status === 'correct').length, elapsed)
  const liveAccuracy = attempt ? accuracy(attempt.reached, Object.keys(attempt.mistakes).length) : 100
  const running = startedAt !== null && !completed

  function begin(text: string, language: Lang) {
    if (!current()) return
    const next = createCustomTypingAttempt(text, language)
    const nextId = ++generation.current
    focusRequest.current = nextId
    composingRef.current = false; attemptRef.current = next
    reviewErrors.current = []; reviewInvalid.current = false; setReviewSnapshot(null); setReviewFailed(false)
    setRunId(nextId); setAttempt(next); setClock(0)
  }
  function apply() { if (!preview.error) begin(preview.text, lang) }
  function update(value: string, composing: boolean) {
    if (!current() || !attemptRef.current || attemptRef.current.result) return
    const now = performance.now()
    const next = updateCustomTypingAttempt(attemptRef.current, value, composing, now)
    try { reviewErrors.current = collectTypingReviewErrors(reviewErrors.current, next.target, next.typed, composing) }
    catch { reviewInvalid.current = true }
    if (next.result) {
      try {
        if (reviewInvalid.current) throw new Error('invalidReview')
        setReviewSnapshot(captureTypingReview(++reviewOrigin.current, next.target, next.lang, reviewErrors.current))
      } catch { setReviewSnapshot(null); setReviewFailed(true) }
    }
    attemptRef.current = next; setAttempt(next); setClock(now)
  }

  const result = attempt?.result
  const summary = result ? [
    t('custom.copyTitle'),
    t('custom.copyStats', { speed: result.speed.toLocaleString(), unit: t(result.lang === 'ko' ? 'custom.keysPerMinute' : 'custom.wordsPerMinute'), accuracy: result.accuracy, errors: result.errors, seconds: (result.ms / 1000).toFixed(1) }),
    t('custom.copyPrivacy'),
  ].join('\n') : ''
  if (!active) return null

  return <section data-custom-typing className="min-w-0 space-y-5">
    <div className="ui-card min-w-0 space-y-4 p-4 sm:p-6">
      <h2 className="text-xl font-semibold text-fg">{t('custom.title')}</h2>
      <p className="text-sm text-sub">{t('custom.description')}</p>
      <label htmlFor={draftId} className="block text-sm font-medium text-body">{t('custom.draftLabel')}</label>
      <textarea id={draftId} data-custom-draft value={draft} onChange={event => setDraft(event.target.value)} rows={5} className="ui-field w-full min-w-0 px-3 py-3 text-base" spellCheck={false} />
      <p className="text-xs text-muted">{t('custom.normalization')}</p>
      <div className="min-w-0 space-y-2 rounded-xl bg-subtle p-4">
        <h3 className="text-sm font-semibold text-body">{t('custom.preview')}</h3>
        <p data-custom-preview className="max-h-48 overflow-auto whitespace-pre-wrap break-all text-base text-body">{preview.text || t('custom.previewEmpty')}</p>
        <p className="text-sm text-sub" aria-live="polite">{t('custom.count', { count: preview.count, min: CUSTOM_TYPING_MIN, max: CUSTOM_TYPING_MAX })}</p>
        {preview.error && !!draft && <p role="alert" className="text-sm text-body">{t(`custom.${preview.error}`, { min: CUSTOM_TYPING_MIN, max: CUSTOM_TYPING_MAX })}</p>}
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-body">{t('custom.nextLanguage')}</legend>
        <div className="flex flex-wrap gap-2">
          {(['ko', 'en'] as const).map(language => <button key={language} type="button" data-custom-language={language} aria-pressed={lang === language} onClick={() => setLang(language)} className={`min-h-11 rounded-xl px-4 py-2 text-sm ${lang === language ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}>{t(language === 'ko' ? 'custom.korean' : 'custom.english')}</button>)}
        </div>
      </fieldset>
      <p className="text-xs text-muted">{t('custom.languageHint')}</p>
      {running && <p className="text-sm text-body">{t('custom.replaceWarning')}</p>}
      <button type="button" data-custom-apply onClick={apply} disabled={!!preview.error} className="ui-btn min-h-11 w-full px-4 py-3 text-base disabled:opacity-40">{t(running ? 'custom.replaceCurrent' : 'custom.apply')}</button>
    </div>

    {attempt && <div className="ui-card min-w-0 space-y-4 p-4 sm:p-6" data-custom-attempt>
      <h3 className="text-lg font-semibold text-fg">{t('custom.confirmedTitle')}</h3>
      <p className="text-xs text-muted">{t('custom.confirmedHint')}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <p className="text-sm text-body">{t('custom.elapsed', { seconds: (elapsed / 1000).toFixed(1) })}</p>
        <p className="text-sm text-body">{t('custom.speed', { speed: (result?.speed ?? liveSpeed).toLocaleString(), unit: t(attempt.lang === 'ko' ? 'custom.keysPerMinute' : 'custom.wordsPerMinute') })}</p>
        <p className="text-sm text-body">{t('custom.accuracy', { accuracy: result?.accuracy ?? liveAccuracy })}</p>
      </div>
      <p data-custom-target className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-xl bg-subtle p-4 text-xl leading-loose" lang={attempt.lang}>
        {targetChars.map((char, index) => <span key={index} data-custom-char={statuses[index]} className={CHAR_CLASS[statuses[index]]}>{char}</span>)}
      </p>
      <label htmlFor={inputId} className="block text-sm font-medium text-body">{t('custom.inputLabel')}</label>
      <textarea key={runId} id={inputId} ref={input} data-custom-input value={attempt.typed} disabled={completed} rows={3} spellCheck={false} autoComplete="off" autoCorrect="off" autoCapitalize="off" lang={attempt.lang}
        onCompositionStart={() => { if (current()) composingRef.current = true }}
        onCompositionEnd={event => { if (!current()) return; composingRef.current = false; update(event.currentTarget.value, false) }}
        onChange={event => update(event.target.value, composingRef.current || (event.nativeEvent as InputEvent).isComposing === true)}
        onPaste={event => event.preventDefault()} onDrop={event => event.preventDefault()}
        onBeforeInput={event => { const type = (event.nativeEvent as InputEvent).inputType; if (type === 'insertFromPaste' || type === 'insertFromDrop') event.preventDefault() }}
        onKeyDown={event => { if (event.nativeEvent.isComposing || event.keyCode === 229) return; if (event.key === 'Enter') event.preventDefault(); if (event.key === 'Escape') begin(attempt.target, attempt.lang) }}
        className="ui-field w-full min-w-0 px-3 py-3 text-base" />
      <p className="text-xs text-muted">{t('custom.inputHint')}</p>
      <button type="button" data-custom-retry onClick={() => begin(attempt.target, attempt.lang)} className="ui-btn-soft min-h-11 px-4 py-2 text-sm">{t('custom.retry')}</button>
      {result && <section data-custom-result className="min-w-0 space-y-3 rounded-xl bg-subtle p-4">
        <h3 className="text-lg font-semibold text-fg">{t('custom.resultTitle')}</h3>
        <p className="text-sm text-body">{t('custom.errors', { count: result.errors })}</p>
        <p className="text-xs text-muted">{t('custom.resultScope')}</p>
        {result.missed.length > 0 && <div className="space-y-2">
          <h4 className="text-sm font-medium text-body">{t('custom.missedTitle')}</h4>
          <ul className="flex flex-wrap gap-2">{result.missed.map(([key, count]) => <li key={key} className="rounded-lg bg-soft px-3 py-2 text-sm text-body">{t('custom.missed', { key: key === ' ' ? t('custom.space') : key, count })}</li>)}</ul>
        </div>}
        <TypingSummaryCopy text={summary} contextKey={`custom-${runId}`} active={active} />
      </section>}
      {result && <>
        {reviewFailed && <p data-typing-review-unavailable="" role="status" className="rounded-xl bg-subtle p-4 text-sm text-body">{t('review.unavailable')}</p>}
        <TypingMistakePractice snapshot={reviewSnapshot} active={active} />
      </>}
    </div>}
    <p className="text-xs text-muted">{t('custom.leaveHint')}</p>
  </section>
}
