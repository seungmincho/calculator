'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/characterCounter'
import WritingVersionsBackup from '@/components/WritingVersionsBackup'
import { openWritingDiffHandoff, prepareWritingDiffHandoff, WritingDiffHandoffError } from '@/utils/writingDiffHandoff'
import { analyze, measure } from '@/utils/charCount'
import {
  addWritingVersion, draftFromWritingVersion, readWritingVersions, writeWritingVersions, withWritingStorageLock,
  WRITING_VERSIONS_KEY, WRITING_TITLE_LIMIT, WRITING_VERSION_LIMIT,
  type WritingDraft, type WritingError, type WritingRead, type WritingVersion, type WritingWrite,
} from '@/utils/writingVersions'

interface Props { current: WritingDraft; activeTab: number; onRestore: (draft: WritingDraft) => void }
type DiffNoticeKey = 'sent' | 'popupBlocked' | 'handoffFailed' | 'textTooLong' | 'conflict' | 'corrupt' | 'unavailable'

export default function WritingVersionsPanel({ current, activeTab, onRestore }: Props) {
  const t = useTranslations('characterCounter')
  const [stored, setStored] = useState<WritingRead | null>(null)
  const [name, setName] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [error, setError] = useState<WritingError | null>(null)
  const [notice, setNotice] = useState<'saved' | 'deleted' | 'restored' | null>(null)
  const [stale, setStale] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState<{ action: 'restore' | 'delete'; id: string; tab: number } | null>(null)
  const [diffNotice, setDiffNotice] = useState<{ key: DiffNoticeKey; current: WritingDraft; tab: number; id: string } | null>(null)

  const refresh = useCallback(() => {
    let result: WritingRead
    try { result = readWritingVersions(window.localStorage) } catch { result = { ok: false, error: 'unavailable' } }
    setStored(result)
    setError(result.ok ? null : result.error)
    setStale(false)
    setNotice(null)
    setConfirm(null)
    setDiffNotice(null)
    // Keep an unsaved title and the current manuscript even when storage is unreadable.
    if (result.ok) setSelectedId(previous => result.versions.some(version => version.id === previous) ? previous : result.versions[0]?.id ?? '')
  }, [])

  useEffect(() => {
    let mounted = true
    queueMicrotask(() => { if (mounted) refresh() })
    return () => { mounted = false }
  }, [refresh])

  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (event.key !== WRITING_VERSIONS_KEY && event.key !== null) return
      if (stored?.ok && event.newValue === stored.raw) return
      setStale(true)
      setError('conflict')
      setNotice(null)
      setConfirm(null)
      setDiffNotice(null)
    }
    window.addEventListener('storage', changed)
    return () => window.removeEventListener('storage', changed)
  }, [stored])

  const versions = stored?.ok ? stored.versions : []
  const selected = versions.find(version => version.id === selectedId)
  const savedStats = useMemo(() => {
    const text = stored?.ok ? stored.versions.find(version => version.id === selectedId)?.text : undefined
    return text === undefined ? null : analyze(text)
  }, [stored, selectedId])
  const currentStats = useMemo(() => analyze(current.text), [current.text])
  const savedCount = savedStats ? measure(savedStats, current.basis) : 0
  const currentCount = measure(currentStats, current.basis)
  const difference = currentCount - savedCount
  const blocked = !stored?.ok || stale || busy
  const softButton = 'ui-btn-soft min-h-11 px-4 py-2 text-sm disabled:opacity-45'

  const acceptWrite = (result: WritingWrite) => {
    if (!result.ok) {
      setError(result.error)
      setNotice(null)
      if (result.error === 'conflict') setStale(true)
      return false
    }
    setStored(result)
    setError(null)
    setConfirm(null)
    return true
  }

  const save = async () => {
    if (!stored?.ok || stale || busy) return
    const candidate: WritingVersion = {
      ...current, id: crypto.randomUUID(), name, sourceTab: activeTab + 1, createdAt: new Date().toISOString(),
    }
    setBusy(true)
    let result: WritingWrite
    try { result = await withWritingStorageLock(WRITING_VERSIONS_KEY, () => addWritingVersion(window.localStorage, stored.raw, stored.versions, candidate)) }
    catch { result = { ok: false, error: 'unavailable' } }
    setBusy(false)
    if (acceptWrite(result)) {
      setName('')
      setSelectedId(candidate.id)
      setNotice('saved')
    }
  }

  const remove = async () => {
    if (!stored?.ok || stale || busy || !selected || confirm?.action !== 'delete' || confirm.id !== selected.id) return
    const remaining = stored.versions.filter(version => version.id !== selected.id)
    setBusy(true)
    let result: WritingWrite
    try { result = await withWritingStorageLock(WRITING_VERSIONS_KEY, () => writeWritingVersions(window.localStorage, stored.raw, remaining)) }
    catch { result = { ok: false, error: 'unavailable' } }
    setBusy(false)
    if (acceptWrite(result)) {
      setSelectedId(remaining[0]?.id ?? '')
      setNotice('deleted')
    }
  }

  const restore = () => {
    if (blocked || !selected || confirm?.action !== 'restore' || confirm.id !== selected.id || confirm.tab !== activeTab) return
    // Check again even if this browser has not delivered its storage event yet.
    let latest: WritingRead
    try { latest = readWritingVersions(window.localStorage) } catch { latest = { ok: false, error: 'unavailable' } }
    if (!latest.ok || !stored?.ok || latest.raw !== stored.raw) {
      setError(latest.ok ? 'conflict' : latest.error)
      setStale(true)
      return
    }
    onRestore(draftFromWritingVersion(selected))
    setConfirm(null)
    setNotice('restored')
    setError(null)
  }

  const sendToDiff = () => {
    if (blocked || !stored?.ok || !selected) return
    let key: DiffNoticeKey = 'sent'
    try {
      let storage: Storage
      try { storage = window.localStorage } catch { throw new WritingDiffHandoffError('unavailable') }
      const payload = prepareWritingDiffHandoff(storage, stored.raw, selected.id, current, activeTab)
      // Keep preparation and opening in this user gesture; no source data is written.
      openWritingDiffHandoff(payload)
    } catch (cause) {
      const code = cause instanceof WritingDiffHandoffError ? cause.code : 'handoffFailed'
      key = code === 'popupBlocked' || code === 'textTooLong' || code === 'conflict' || code === 'corrupt' || code === 'unavailable' ? code : 'handoffFailed'
      if (key === 'conflict' || key === 'corrupt' || key === 'unavailable') { setStale(true); setError(key) }
    }
    setDiffNotice({ key, current, tab: activeTab, id: selected.id })
  }
  const shownDiffNotice = diffNotice?.current === current && diffNotice.tab === activeTab && diffNotice.id === selectedId ? diffNotice.key : null

  const metadata = (draft: WritingDraft) => t('versions.settings', {
    title: draft.title || t('versions.untitled'), basis: t(`target.basis.${draft.basis}`),
    target: draft.target.toLocaleString(), unit: t(`target.unit.${draft.basis}`),
  })

  return (
    <section aria-labelledby="writing-versions-title" aria-busy={busy} className="ui-card min-w-0 p-4 sm:p-6 space-y-5">
      <div>
        <h2 id="writing-versions-title" className="text-lg font-semibold text-fg">{t('versions.title')}</h2>
        <p className="mt-1 text-sm text-sub">{t('versions.description')}</p>
        <p className="mt-2 text-xs text-muted">{t('versions.privacy')}</p>
      </div>

      <form onSubmit={event => { event.preventDefault(); void save() }} className="flex flex-col sm:flex-row sm:items-end gap-3">
        <label className="flex-1 min-w-0">
          <span className="block text-sm font-medium text-body">{t('versions.name')}</span>
          <input value={name} disabled={busy} onChange={event => setName(event.target.value)} maxLength={WRITING_TITLE_LIMIT}
            placeholder={t('versions.namePlaceholder')} className="ui-field min-h-11 mt-1.5 px-4 py-2 text-base" />
        </label>
        <button type="submit" disabled={blocked || !current.text.trim() || !name.trim()} className="ui-btn min-h-11 px-4 py-2 text-sm disabled:opacity-45">
          {t('versions.save')}
        </button>
      </form>
      <p className="text-xs text-muted">{t('versions.limits', { count: versions.length, max: WRITING_VERSION_LIMIT })}</p>

      {error && <div role="alert" className="bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm">{t(`versions.errors.${error}`)}</div>}
      {(error === 'corrupt' || error === 'unavailable' || stale) && (
        <button type="button" disabled={busy} onClick={refresh} className={softButton}>{t('versions.refresh')}</button>
      )}
      {notice && <p role="status" className="text-sm text-primary">{t(`versions.notices.${notice}`)}</p>}

      {stored?.ok && versions.length === 0 && <p className="bg-subtle rounded-2xl p-4 text-sm text-sub">{t('versions.empty')}</p>}
      {versions.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-fg">{t('versions.list')}</h3>
            <button type="button" disabled={busy} onClick={refresh} className={softButton}>{t('versions.refresh')}</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto">
            {versions.map(version => (
              <button type="button" key={version.id} disabled={busy} aria-pressed={selectedId === version.id}
                onClick={() => { setSelectedId(version.id); setConfirm(null); setNotice(null) }}
                className={`min-h-11 min-w-0 rounded-xl border p-3 text-left ${selectedId === version.id ? 'border-primary bg-primary-soft text-primary' : 'border-line bg-surface text-body hover:bg-soft'}`}>
                <span className="block font-medium text-sm [overflow-wrap:anywhere]">{version.name}</span>
                <span className="block mt-1 text-xs text-sub [overflow-wrap:anywhere]">
                  {t('versions.origin', { tab: version.sourceTab, title: version.title || t('versions.untitled') })}
                </span>
                <time dateTime={version.createdAt} className="block mt-1 text-xs text-muted">{new Date(version.createdAt).toLocaleString()}</time>
              </button>
            ))}
          </div>

          {selected && (
            <div className="space-y-4 border-t border-line pt-4">
              <div>
                <h3 className="font-semibold text-fg">{t('versions.compare')}</h3>
                <p className="mt-1 text-sm text-sub">{t('versions.comparisonBasis', { basis: t(`target.basis.${current.basis}`) })}</p>
                <p className="mt-2 text-sm font-medium text-primary tabular-nums">{t('versions.difference', { count: `${difference > 0 ? '+' : ''}${difference.toLocaleString()}`, unit: t(`target.unit.${current.basis}`) })}</p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {[
                  { heading: t('versions.savedText'), draft: selected, count: savedCount },
                  { heading: t('versions.currentText', { tab: activeTab + 1 }), draft: current, count: currentCount },
                ].map(item => (
                  <div key={item.heading} className="min-w-0 space-y-2">
                    <h4 className="text-sm font-semibold text-fg">{item.heading}</h4>
                    <p className="text-xl font-bold text-fg tabular-nums">{t('versions.count', { count: item.count.toLocaleString(), unit: t(`target.unit.${current.basis}`) })}</p>
                    <p className="text-xs text-muted [overflow-wrap:anywhere]">{metadata(item.draft)}</p>
                    <div className="bg-subtle rounded-2xl p-4 text-sm text-body whitespace-pre-wrap [overflow-wrap:anywhere] max-h-72 overflow-y-auto leading-relaxed">{item.draft.text || t('versions.noText')}</div>
                  </div>
                ))}
              </div>
              <div className="space-y-2 border-t border-line pt-4">
                <button type="button" data-writing-diff-send disabled={blocked} onClick={sendToDiff} className={softButton}>{t('versions.diff.button')}</button>
                <p className="text-sm text-sub">{t('versions.diff.hint')}</p>
                <p className="text-xs text-muted">{t('versions.diff.privacy')}</p>
                {shownDiffNotice && <div data-writing-diff-notice={shownDiffNotice} className="space-y-2 rounded-xl bg-subtle p-3">
                  <p role={shownDiffNotice === 'sent' ? 'status' : 'alert'} className="text-sm text-body">{t(`versions.diff.${shownDiffNotice}`)}</p>
                  {shownDiffNotice !== 'sent' && <>
                    <p className="text-sm text-sub">{t('versions.diff.manual')}</p>
                    <a href="/diff-viewer/" target="_blank" rel="noopener noreferrer" className="ui-btn-soft inline-flex min-h-11 items-center px-3 py-2 text-sm">{t('versions.diff.manualLink')}</a>
                  </>}
                </div>}
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={blocked} onClick={() => setConfirm({ action: 'restore', id: selected.id, tab: activeTab })}
                  className="ui-btn min-h-11 px-4 py-2 text-sm disabled:opacity-45">{t('versions.restore')}</button>
                <button type="button" disabled={blocked} onClick={() => setConfirm({ action: 'delete', id: selected.id, tab: activeTab })}
                  className={softButton}>{t('versions.delete')}</button>
              </div>
              {confirm?.id === selected.id && confirm.tab === activeTab && (
                <div className="bg-subtle rounded-2xl p-4 space-y-3" role="group" aria-label={t('versions.confirmation')}>
                  <p className="text-sm text-body">{t(confirm.action === 'restore' ? 'versions.confirmRestore' : 'versions.confirmDelete', { name: selected.name, tab: activeTab + 1 })}</p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={blocked} onClick={confirm.action === 'restore' ? restore : remove}
                      className="ui-btn min-h-11 px-4 py-2 text-sm disabled:opacity-45">{t(confirm.action === 'restore' ? 'versions.confirmRestoreButton' : 'versions.confirmDeleteButton')}</button>
                    <button type="button" disabled={busy} onClick={() => setConfirm(null)} className={softButton}>{t('versions.cancel')}</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      <WritingVersionsBackup stored={stored} disabled={blocked} activeTab={activeTab} onRefresh={refresh} onCommitted={result => { acceptWrite(result) }} />
    </section>
  )
}
