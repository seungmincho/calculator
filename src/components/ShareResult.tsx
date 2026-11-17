'use client'

import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Download, Share2, Link2, Check } from 'lucide-react'
import { renderShareCard, type ShareCardData } from '@/utils/shareCard'
import { useTranslations } from '@/lib/i18n/shared'
import { captureShareResult, copyShareResultLink, createShareResultDownloads, createShareResultRequests,
  type ShareResultSnapshot, type ShareResultToken } from '@/utils/shareResultActions'

type Requests = ReturnType<typeof createShareResultRequests>
type Status = 'saving' | 'sharing' | 'copying' | 'saved' | 'copied' | 'copyFailed' | 'saveFailed'
type ActionView = { owner: Requests; token: ShareResultToken; snapshot: ShareResultSnapshot; status: Status; selectionFailed?: boolean }

/** Image, native share and link copy always use one click-time result snapshot. */
export default function ShareResult({
  card, url, text, fileName = 'toolhub-result', className = '', resultKey,
}: {
  card: ShareCardData
  url?: string
  text?: string
  fileName?: string
  className?: string
  /** Pass a revision when inputs can change without changing the visible result. */
  resultKey?: string | number
}) {
  const t = useTranslations('shareResult')
  const id = useId(), field = useRef<HTMLTextAreaElement>(null)
  const copyButton = useRef<HTMLButtonElement>(null)
  const signature = JSON.stringify([card.tool, card.label, card.headline, card.sub, card.cta, card.rows?.map(row => [row.label, row.value]),
    url, text, fileName, resultKey, t('cta'), t('copyLink')])
  const requests = useMemo(() => createShareResultRequests(signature), [signature])
  const downloads = useMemo(() => createShareResultDownloads(), [])
  const [view, setView] = useState<ActionView | null>(null)
  useLayoutEffect(() => { requests.activate(); return () => requests.dispose() }, [requests])
  useLayoutEffect(() => { downloads.activate(); return () => downloads.dispose() }, [downloads])
  const visible = view?.owner === requests ? view : null
  const pending = visible?.status === 'saving' || visible?.status === 'sharing' || visible?.status === 'copying'
  const current = (item: ActionView) => requests.current(item.token) && item.snapshot.url === (url ?? window.location.href)
  const begin = (status: Status): ActionView | null => {
    const token = requests.begin()
    if (!token) return null
    const snapshot = captureShareResult(card, url ?? window.location.href, text, fileName, t('cta'))
    const item = { owner: requests, token, snapshot, status }
    setView(item)
    return item
  }
  const clearStale = (item: ActionView) => {
    if (!requests.current(item.token)) return
    requests.invalidate()
    setView(previous => previous?.owner === requests && previous.token === item.token ? null : previous)
  }
  const finish = (item: ActionView, status: Status) => {
    if (!current(item)) return
    setView({ ...item, status })
    if (status === 'saved' || status === 'copied') requests.later(item.token, () => setView(previous => previous?.owner === requests && previous.token === item.token ? null : previous), 2000)
  }
  const copySnapshot = async (item: ActionView) => {
    const outcome = await copyShareResultLink(item.snapshot.url, () => current(item))
    if (outcome !== 'stale') finish(item, outcome === 'copied' ? 'copied' : 'copyFailed')
    else clearStale(item)
  }
  const copy = async () => { const item = begin('copying'); if (item) await copySnapshot(item) }
  const save = async () => {
    const item = begin('saving')
    if (!item) return
    try {
      const blob = await renderShareCard(item.snapshot.card)
      if (!current(item)) return
      const outcome = downloads.download(blob, `${item.snapshot.filename}.png`, () => current(item))
      if (outcome !== 'stale') finish(item, outcome === 'started' ? 'saved' : 'saveFailed')
    } catch { finish(item, 'saveFailed') }
    finally { if (!current(item)) clearStale(item) }
  }
  const share = async () => {
    const item = begin('sharing')
    if (!item) return
    const snapshot = item.snapshot
    try {
      if (navigator.share) {
        const blob = await renderShareCard(snapshot.card)
        if (!current(item)) return
        const file = new File([blob], `${snapshot.filename}.png`, { type: 'image/png' })
        const data = navigator.canShare?.({ files: [file] })
          ? { files: [file], title: snapshot.card.tool, text: `${snapshot.text}\n${snapshot.url}` }
          : { title: snapshot.card.tool, text: snapshot.text, url: snapshot.url }
        if (!current(item)) return
        await navigator.share(data)
        if (current(item)) setView(null)
        return
      }
    } catch (cause) {
      if (cause && typeof cause === 'object' && 'name' in cause && cause.name === 'AbortError') {
        if (current(item)) setView(null)
        else clearStale(item)
        return
      }
    } finally { if (!current(item)) clearStale(item) }
    if (current(item)) await copySnapshot(item)
  }
  const selectLink = (item: ActionView) => {
    if (!current(item)) { clearStale(item); return }
    try {
      if (!field.current) throw new Error('Missing selection field')
      field.current.focus(); field.current.select(); field.current.setSelectionRange(0, item.snapshot.url.length)
      if (current(item)) setView({ ...item, selectionFailed: false })
    } catch { if (current(item)) setView({ ...item, selectionFailed: true }) }
  }
  const close = (item: ActionView) => {
    if (!requests.current(item.token)) return
    requests.invalidate(); setView(null)
    try { copyButton.current?.focus({ preventScroll: true }) } catch { /* The panel still closes if focus is unavailable. */ }
  }
  const retry = async (item: ActionView) => { if (requests.current(item.token)) await copy() }
  const btn = 'inline-flex items-center justify-center gap-1.5 min-h-11 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50'
  const statusText = visible?.status === 'copied' ? t('copied') : visible?.status === 'saved' ? t('downloadStarted')
    : visible?.status === 'saveFailed' ? t('saveFailed') : visible?.status === 'copyFailed' ? t('copyFailed')
      : visible?.status === 'saving' ? t('busySave') : visible?.status === 'sharing' ? t('busyShare') : visible?.status === 'copying' ? t('busyCopy') : ''

  return <div className={`flex min-w-0 flex-wrap gap-2 ${className}`} data-share-result>
      <button type="button" data-share-action="share" onClick={share} disabled={pending} className={`${btn} ui-btn`}>
        <Share2 className="h-4 w-4 shrink-0" />{visible?.status === 'sharing' ? t('busyShare') : t('share')}
      </button>
      <button type="button" data-share-action="save" onClick={save} disabled={pending} className={`${btn} bg-soft text-body hover:bg-track`}>
        {visible?.status === 'saved' ? <Check className="h-4 w-4 shrink-0 text-primary" /> : <Download className="h-4 w-4 shrink-0" />}
        {visible?.status === 'saving' ? t('busySave') : t('save')}
      </button>
      <button type="button" ref={copyButton} data-share-action="copy" onClick={copy} disabled={pending} className={`${btn} bg-soft text-body hover:bg-track`}>
        {visible?.status === 'copied' ? <Check className="h-4 w-4 shrink-0 text-primary" /> : <Link2 className="h-4 w-4 shrink-0" />}
        {visible?.status === 'copied' ? t('copied') : visible?.status === 'copying' ? t('busyCopy') : t('copyLink')}
      </button>
    {visible?.status === 'saveFailed' && <p role="alert" className="w-full text-sm text-body">{t('saveFailed')}</p>}
    {visible?.status === 'copyFailed' && <section className="mt-1 min-w-0 w-full space-y-3 rounded-xl bg-subtle p-4" data-share-recovery aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="font-semibold text-fg">{t('manualTitle')}</h2>
      <p role="alert" className="text-sm text-body">{t('copyFailed')}</p>
      <label htmlFor={`${id}-link`} className="block text-sm text-body">{t('manualLabel')}</label>
      <textarea id={`${id}-link`} ref={field} readOnly value={visible.snapshot.url} rows={3} spellCheck={false}
        className="ui-field min-w-0 w-full resize-y px-3 py-3 text-base [overflow-wrap:anywhere]" aria-describedby={`${id}-hint`} />
      <p id={`${id}-hint`} className="text-sm text-sub">{t('manualHint')}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" data-share-action="select" onClick={() => selectLink(visible)} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('selectAll')}</button>
        <button type="button" data-share-action="retry" onClick={() => retry(visible)} className="ui-btn min-h-11 px-3 py-2 text-sm">{t('retryCopy')}</button>
        <button type="button" data-share-action="close" onClick={() => close(visible)} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('closeRecovery')}</button>
      </div>
      {visible.selectionFailed && <p role="status" className="text-sm text-body">{t('selectionFailed')}</p>}
    </section>}
    <span className="sr-only" role="status" aria-live="polite">{statusText}</span>
  </div>
}
