'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/jsonFormatter'
import {
  JSONPATH_PRESETS_KEY, JSONPATH_PRESET_LIMITS, addJsonPathPreset, isSavedJsonPathExpression,
  jsonPathPresetStorageError, readJsonPathPresets, renameJsonPathPreset, withJsonPathPresetLock, writeJsonPathPresets,
  type JsonPathPresetError, type JsonPathPresetRead,
} from '@/utils/jsonPathPresets'

export default function JsonPathPresets({ expression, onLoad }: { expression: string; onLoad: (expression: string) => void }) {
  const t = useTranslations('jsonFormatter')
  const [view, setView] = useState<JsonPathPresetRead | null>(null)
  const [name, setName] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [rename, setRename] = useState('')
  const [error, setError] = useState<JsonPathPresetError | null>(null)
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const [deleting, setDeleting] = useState(false)

  const refresh = useCallback(() => {
    try { setView(readJsonPathPresets(window.localStorage)) }
    catch (cause) { setView({ ok: false, error: jsonPathPresetStorageError(cause) }) }
    setError(null); setSelectedId(''); setRename(''); setDeleting(false); setNotice('')
  }, [])
  useEffect(() => {
    refresh()
    const changed = (event: StorageEvent) => {
      if (event.key !== JSONPATH_PRESETS_KEY && event.key !== null) return
      setError('conflict'); setDeleting(false); setNotice('')
    }
    window.addEventListener('storage', changed)
    return () => window.removeEventListener('storage', changed)
  }, [refresh])

  const presets = view?.ok ? view.store.presets : []
  const selected = presets.find(preset => preset.id === selectedId)
  const issue = view && !view.ok ? view.error : error
  const canManage = !!view?.ok && error !== 'conflict' && !busy
  const validExpression = isSavedJsonPathExpression(expression)

  async function act(action: 'save' | 'load' | 'rename' | 'delete') {
    if (!view?.ok || !canManage || busyRef.current || (action === 'save' ? !name.trim() || !validExpression : !selected)) return
    const expected = view
    const target = selected
    busyRef.current = true; setBusy(true); setNotice('')
    try {
      await withJsonPathPresetLock(() => {
        const storage = window.localStorage
        if (storage.getItem(JSONPATH_PRESETS_KEY) !== expected.raw) { setError('conflict'); return }
        if (action === 'load' && target) {
          onLoad(target.expression)
          setNotice(t('presets.loaded', { name: target.name })); setError(null)
          return
        }
        const revision = crypto.randomUUID()
        const updatedAt = new Date().toISOString()
        const next = action === 'save'
          ? addJsonPathPreset(expected.store, name, expression, revision, updatedAt)
          : action === 'rename' && target
            ? renameJsonPathPreset(expected.store, target.id, rename, revision, updatedAt)
            : { ...expected.store, revision, presets: expected.store.presets.filter(preset => preset.id !== target?.id) }
        const result = writeJsonPathPresets(storage, expected.raw, next)
        if (!result.ok) { setError(result.error); return }
        setView({ ok: true, store: next, raw: result.raw }); setError(null)
        if (action === 'save') { setSelectedId(revision); setRename(name.trim()); setName('') }
        if (action === 'delete') { setSelectedId(''); setRename('') }
        if (action === 'rename') setRename(rename.trim())
        setNotice(t(action === 'save' ? 'presets.saved' : action === 'rename' ? 'presets.renamed' : 'presets.deleted'))
      })
    } catch (cause) {
      const code = cause instanceof Error ? cause.message : ''
      setError(code === 'invalid' || code === 'limit' || code === 'duplicate' ? code : jsonPathPresetStorageError(cause))
    } finally { busyRef.current = false; setBusy(false); setDeleting(false) }
  }

  return (
    <section data-jsonpath-presets aria-labelledby="jsonpath-presets-title" className="mt-4 border-t border-line pt-4 space-y-3 min-w-0">
      <h3 id="jsonpath-presets-title" className="text-sm font-semibold text-fg">{t('presets.title')}</h3>
      <p className="text-sm text-sub">{t('presets.description')}</p>
      <p className="text-xs text-muted">{t('presets.storageHint')}</p>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] items-end gap-2">
        <label className="block min-w-0 text-sm text-body">{t('presets.name')}
          <input value={name} maxLength={JSONPATH_PRESET_LIMITS.name} disabled={busy} onChange={event => setName(event.target.value)} className="ui-field mt-1 min-h-11 px-3 py-2 text-base" />
        </label>
        <button type="button" onClick={() => act('save')} disabled={!canManage || !name.trim() || !validExpression} className="ui-btn-soft min-h-11 px-4 py-2 text-sm disabled:opacity-40">{t('presets.save')}</button>
      </div>
      {!validExpression && expression.length > 0 && <p className="text-sm text-body">{t('presets.expressionLimit')}</p>}
      {presets.length > 0 && <>
        <label className="block text-sm text-body">{t('presets.savedList')}
          <select value={selectedId} disabled={busy} onChange={event => { const id = event.target.value; setSelectedId(id); setRename(presets.find(preset => preset.id === id)?.name ?? ''); setDeleting(false) }} className="ui-field mt-1 min-h-11 px-3 py-2 text-base">
            <option value="">{t('presets.choose')}</option>
            {presets.map(preset => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
          </select>
        </label>
        {selected && <>
          <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-all rounded-xl bg-surface p-3 text-sm text-body"><code>{selected.expression}</code></pre>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => act('load')} disabled={!canManage} className="ui-btn min-h-11 px-4 py-2 text-sm disabled:opacity-40">{t('presets.load')}</button>
            <button type="button" onClick={() => setDeleting(true)} disabled={!canManage} className="ui-btn-soft min-h-11 px-4 py-2 text-sm disabled:opacity-40">{t('presets.delete')}</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] items-end gap-2">
            <label className="block min-w-0 text-sm text-body">{t('presets.renameLabel')}
              <input value={rename} maxLength={JSONPATH_PRESET_LIMITS.name} disabled={busy} onChange={event => setRename(event.target.value)} className="ui-field mt-1 min-h-11 px-3 py-2 text-base" />
            </label>
            <button type="button" onClick={() => act('rename')} disabled={!canManage || !rename.trim() || rename.trim() === selected.name} className="ui-btn-soft min-h-11 px-4 py-2 text-sm disabled:opacity-40">{t('presets.rename')}</button>
          </div>
        </>}
      </>}
      {deleting && selected && <div className="rounded-xl bg-surface p-3 space-y-2">
        <p className="text-sm text-body">{t('presets.deleteConfirm', { name: selected.name })}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => act('delete')} disabled={!canManage} className="ui-btn min-h-11 px-4 py-2 text-sm disabled:opacity-40">{t('presets.confirmDelete')}</button>
          <button type="button" onClick={() => setDeleting(false)} className="ui-btn-soft min-h-11 px-4 py-2 text-sm">{t('presets.cancel')}</button>
        </div>
      </div>}
      {issue && <div role="alert" className="rounded-xl bg-surface p-3 space-y-2">
        <p className="text-sm text-body">{t(`presets.errors.${issue}`)}</p>
        <button type="button" onClick={refresh} disabled={busy} className="ui-btn-soft min-h-11 px-4 py-2 text-sm">{t('presets.refresh')}</button>
      </div>}
      {notice && <p role="status" className="text-sm text-sub">{notice}</p>}
    </section>
  )
}
