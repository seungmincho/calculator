'use client'

import { useEffect, useRef, useState } from 'react'
import { createRegexClient } from '@/lib/regex/client'
import { RegexExecutionError, type RegexExecutionErrorCode } from '@/lib/regex/protocol'
import { REGEX_LIMITS, type RegexJob, type RegexEngineResult } from '@/utils/regexEngine'
import { createRegexDraft, restoreRegexUrl, updateRegexUrl, type RegexUrlRestore, type RegexUrlUpdate } from '@/utils/regexSnapshot'
import { copyRegexText, createRegexActionGuard, type RegexActionToken } from '@/utils/regexActions'

export interface RegexCompleted { job: Readonly<RegexJob>; result: RegexEngineResult; revision: number; id: number }
type Status = 'idle' | 'waiting' | 'running' | 'complete' | 'canceled' | 'error'
type Feedback = { token: RegexActionToken; status: 'copied' | 'failed' | 'selectionFailed' | 'downloaded' | 'downloadFailed'; text: string }

export function useRegexWorkspace(locale: string) {
  const [draft, setDraft] = useState<RegexJob>(createRegexDraft)
  const [revision, setRevision] = useState(0)
  const [ready, setReady] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<RegexExecutionErrorCode | null>(null)
  const [fileError, setFileError] = useState<'fileTooLarge' | 'fileFailed' | 'inputTooLarge' | null>(null)
  const [reading, setReading] = useState(false)
  const [completed, setCompleted] = useState<RegexCompleted | null>(null)
  const [url, setUrl] = useState<RegexUrlUpdate | { kind: 'writeFailed'; href: string; shareUrl: null } | null>(null)
  const [warnings, setWarnings] = useState<RegexUrlRestore['warnings']>([])
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const control = useRef({ alive: false, mountedOnce: false, ready: false, shareReady: false, suspended: false, earlyPatch: null as Partial<RegexJob> | null, draft: createRegexDraft(), revision: 0, request: 0, file: 0, completion: 0, search: '', completed: null as RegexCompleted | null, status: 'idle' as Status })
  const client = useRef<ReturnType<typeof createRegexClient> | null>(null)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reader = useRef<FileReader | null>(null)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const urls = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const guard = useRef(createRegexActionGuard())
  guard.current.context(locale)

  function invalidateActions() { guard.current.invalidate(); if (copyTimer.current !== null) clearTimeout(copyTimer.current); copyTimer.current = null }
  function cancelFile() { control.current.file++; const previous = reader.current; reader.current = null; try { previous?.abort() } catch { /* Generation is authoritative. */ } }
  function cancelWork() { control.current.request++; if (debounce.current !== null) clearTimeout(debounce.current); debounce.current = null; client.current?.cancel() }
  function writeUrl(job: RegexJob) {
    const update = updateRegexUrl(window.location.href, job)
    try {
      if (update.href !== window.location.href) window.history.replaceState(window.history.state, '', update.href)
      control.current.shareReady = update.kind === 'ready'; setUrl(update)
    } catch { control.current.shareReady = false; setUrl({ kind: 'writeFailed', href: window.location.href, shareUrl: null }) }
    control.current.search = window.location.search
  }
  function markStatus(value: Status) { control.current.status = value; setStatus(value) }
  async function run(job: RegexJob, jobRevision: number) {
    if (!control.current.alive || !control.current.ready || jobRevision !== control.current.revision) return
    cancelWork(); const request = control.current.request
    if (document.visibilityState === 'hidden') { markStatus('canceled'); return }
    markStatus('running'); setError(null)
    try {
      client.current ??= createRegexClient()
      const result = await client.current.run(job, jobRevision)
      if (!control.current.alive || request !== control.current.request || jobRevision !== control.current.revision) return
      invalidateActions()
      const value = { job: Object.freeze({ ...job }), result, revision: jobRevision, id: ++control.current.completion }
      control.current.completed = value; setCompleted(value); markStatus('complete')
    } catch (cause) {
      if (!control.current.alive || request !== control.current.request || jobRevision !== control.current.revision) return
      const code = cause instanceof RegexExecutionError ? cause.code : 'workerFailed'
      setError(code === 'canceled' ? null : code); markStatus(code === 'canceled' ? 'canceled' : 'error')
    }
  }
  function schedule(job: RegexJob, jobRevision: number) {
    if (job.pattern.length === 0 && job.transform !== 'dedupe') { markStatus('idle'); return }
    if (document.visibilityState === 'hidden' || control.current.suspended) { markStatus('canceled'); return }
    const request = control.current.request
    markStatus('waiting'); debounce.current = setTimeout(() => {
      if (!control.current.alive || request !== control.current.request || jobRevision !== control.current.revision) return
      debounce.current = null; void run(job, jobRevision)
    }, 300)
  }
  function replaceDraft(job: RegexJob, source: 'edit' | 'restore' = 'edit') {
    if (!control.current.alive && control.current.mountedOnce) return
    if (!control.current.ready) { control.current.earlyPatch = { ...job }; control.current.draft = { ...job }; setDraft({ ...job }); return }
    cancelWork(); cancelFile(); invalidateActions()
    const value = { ...job }, nextRevision = ++control.current.revision
    control.current.draft = value; setDraft(value); setRevision(nextRevision); setError(null); setFileError(null); setReading(false)
    if (source === 'edit') { control.current.suspended = false; setWarnings([]) }
    writeUrl(value); schedule(value, nextRevision)
  }
  function edit(patch: Partial<RegexJob>, preserveTransform = false) {
    if (!control.current.alive && control.current.mountedOnce) return
    if (!control.current.ready) {
      const pending = { ...control.current.earlyPatch, ...patch, transform: patch.transform ?? (preserveTransform ? control.current.draft.transform : 'none') }
      control.current.earlyPatch = pending; control.current.draft = { ...control.current.draft, ...pending }; setDraft({ ...control.current.draft }); return
    }
    replaceDraft({ ...control.current.draft, ...patch, transform: patch.transform ?? (preserveTransform ? control.current.draft.transform : 'none') })
  }
  function cancel() { control.current.suspended = true; cancelWork(); cancelFile(); setReading(false); setError(null); markStatus('canceled') }
  function retry() { if (!control.current.ready) return; control.current.suspended = false; invalidateActions(); void run({ ...control.current.draft }, control.current.revision) }

  useEffect(() => {
    const mountedControl = control.current, mountedGuard = guard.current, ownedUrls = urls.current
    mountedControl.alive = true; mountedControl.mountedOnce = true; mountedGuard.activate()
    const restore = () => {
      const parsed = restoreRegexUrl(new URLSearchParams(window.location.search))
      const early = control.current.earlyPatch; control.current.earlyPatch = null
      control.current.ready = true; setReady(true); setWarnings(parsed.warnings); replaceDraft({ ...parsed.draft, ...early }, 'restore')
    }
    const initial = setTimeout(restore, 0)
    const popstate = () => { if (control.current.ready && control.current.search !== window.location.search) restore() }
    const hidden = () => { if (document.visibilityState === 'hidden') cancel() }
    const pagehide = () => cancel()
    window.addEventListener('popstate', popstate); window.addEventListener('pagehide', pagehide); document.addEventListener('visibilitychange', hidden)
    return () => {
      mountedControl.alive = false; mountedControl.ready = false; clearTimeout(initial)
      cancelWork(); cancelFile(); invalidateActions(); mountedGuard.dispose(); client.current?.dispose(); client.current = null
      for (const [href, timer] of ownedUrls) { clearTimeout(timer); URL.revokeObjectURL(href) } ownedUrls.clear()
      window.removeEventListener('popstate', popstate); window.removeEventListener('pagehide', pagehide); document.removeEventListener('visibilitychange', hidden)
    }
    // The initial restore/listeners own one mount lifetime; they use the mutable controller, not rendered drafts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function upload(file: File | undefined) {
    if (!file || !control.current.ready) return
    cancelFile(); setReading(false); setFileError(null)
    if (file.size > REGEX_LIMITS.fileBytes) { setFileError('fileTooLarge'); return }
    const token = control.current.file
    let next: FileReader
    try { next = new FileReader() } catch { setFileError('fileFailed'); return }
    reader.current = next; setReading(true)
    const current = () => control.current.alive && token === control.current.file && reader.current === next
    next.onload = () => {
      if (!current()) return
      reader.current = null; setReading(false)
      if (typeof next.result !== 'string') { setFileError('fileFailed'); return }
      if (next.result.length > REGEX_LIMITS.input) { setFileError('inputTooLarge'); return }
      edit({ inputText: next.result })
    }
    next.onerror = next.onabort = () => { if (current()) { reader.current = null; setReading(false); setFileError('fileFailed') } }
    try { next.readAsText(file) } catch { if (current()) { reader.current = null; setReading(false); setFileError('fileFailed') } }
  }
  async function copy(text: string) {
    const token = guard.current.begin(); setFeedback(null)
    const outcome = await copyRegexText(text, () => guard.current.current(token))
    if (outcome === 'stale') return
    setFeedback({ token, status: outcome, text })
    if (outcome === 'copied') copyTimer.current = setTimeout(() => { if (guard.current.current(token)) setFeedback(null) }, 2000)
  }
  function copyOutput() { const value = control.current.completed; if (value) void copy(value.result.outputText) }
  function copyLink() {
    if (!control.current.ready || !control.current.shareReady || control.current.status !== 'complete' || control.current.completed?.revision !== control.current.revision) return
    const update = updateRegexUrl(window.location.href, control.current.draft)
    if (update.kind === 'ready') void copy(update.shareUrl)
  }
  function download() {
    const value = control.current.completed; if (!value) return
    const token = guard.current.begin(); setFeedback(null); let href: string | null = null
    try {
      href = URL.createObjectURL(new Blob([value.result.outputText], { type: 'text/plain;charset=utf-8' }))
      if (!guard.current.current(token)) { URL.revokeObjectURL(href); return }
      const anchor = document.createElement('a'); anchor.href = href; anchor.download = `regex-${value.job.operation}-result.txt`
      try { document.body.appendChild(anchor); anchor.click() } finally { anchor.remove() }
      const owned = href; urls.current.set(owned, setTimeout(() => { URL.revokeObjectURL(owned); urls.current.delete(owned) }, 1000))
      if (guard.current.current(token)) setFeedback({ token, status: 'downloaded', text: '' })
    } catch { if (href) URL.revokeObjectURL(href); if (guard.current.current(token)) setFeedback({ token, status: 'downloadFailed', text: '' }) }
  }
  function select(field: HTMLTextAreaElement | null) { if (!feedback || !guard.current.current(feedback.token)) return; try { if (!field) throw new Error('missing'); field.focus(); field.select(); field.setSelectionRange(0, field.value.length) } catch { setFeedback({ ...feedback, status: 'selectionFailed' }) } }
  const current = !!completed && completed.revision === revision && status === 'complete'
  return { draft, revision, ready, status, error, fileError, reading, completed, current, url, warnings, edit, replaceDraft, cancel, retry, upload, copyOutput, copyLink, download, select,
    feedback: feedback && guard.current.current(feedback.token) ? feedback : null,
    retryCopy() { if (feedback && guard.current.current(feedback.token)) void copy(feedback.text) },
    closeCopy() { invalidateActions(); setFeedback(null) },
    currentSnapshot() { return control.current.alive && control.current.status === 'complete' && control.current.completed?.revision === control.current.revision ? control.current.completed : null },
  }
}
