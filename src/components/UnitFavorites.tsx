'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useHydrated } from '@/hooks/useHydrated'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/unitConverter'
import {
  UNIT_FAVORITES_KEY, UNIT_FAVORITES_LIMIT, UNIT_FAVORITE_NAME_LIMIT,
  readUnitFavorites, writeUnitFavoriteAction, sameUnitFavoritePair,
  type UnitFavoritePair, type UnitFavoriteAction, type UnitFavoritesError, type UnitFavoritesSnapshot,
} from '@/utils/unitFavorites'

type Notice = { success: 'saved' | 'renamed' | 'deleted' | 'loaded' | 'refreshed' } | { error: UnitFavoritesError }

export default function UnitFavorites({ pair, traditional, onLoad }: {
  pair: UnitFavoritePair | null
  traditional: boolean
  onLoad: (pair: UnitFavoritePair) => void
}) {
  const t = useTranslations('unitConverter')
  const hydrated = useHydrated()
  const [snapshot, setSnapshot] = useState<UnitFavoritesSnapshot | null>(null)
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [conflict, setConflict] = useState(false)
  const [busy, setBusy] = useState(false)

  // Storage becomes visible after hydration; it never automatically changes calculator inputs.
  if (hydrated && snapshot === null) setSnapshot(readUnitFavorites())

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== UNIT_FAVORITES_KEY) return
      if (snapshot?.status === 'ready' && (event.key === null || event.newValue !== snapshot.raw)) {
        setConflict(true)
        setNotice({ error: 'conflict' })
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [snapshot])

  const favorites = snapshot?.status === 'ready' ? snapshot.favorites : []
  const blocked = snapshot?.status !== 'ready' || conflict || busy
  const storageError = snapshot && snapshot.status !== 'ready' ? snapshot.status : null
  const error = storageError ?? (conflict ? 'conflict' : notice && 'error' in notice ? notice.error : null)

  const summary = (value: UnitFavoritePair) => t('favorites.summary', {
    category: t(`categories.${value.c}`), from: t(`u.${value.f}`), to: t(`u.${value.t}`), precision: value.p,
  }) + (value.c === 'css' ? t('favorites.remSummary', { base: value.rb }) : '')

  const refresh = () => {
    const next = readUnitFavorites()
    setSnapshot(next)
    setConflict(false)
    setEditingId(null)
    setDeletingId(null)
    setNotice(next.status === 'ready' ? { success: 'refreshed' } : { error: next.status })
  }

  const mutate = async (action: UnitFavoriteAction) => {
    if (blocked || !snapshot) return
    setBusy(true)
    setNotice(null)
    try {
      // Serialize writes from cooperating tabs where Web Locks are available. The raw comparison
      // still detects an older view, and remains the fallback on browsers without Web Locks.
      const commit = () => writeUnitFavoriteAction(snapshot, action)
      const result = navigator.locks
        ? await navigator.locks.request(UNIT_FAVORITES_KEY, commit)
        : commit()
      if (!result.ok) {
        setNotice({ error: result.error })
        if (result.error === 'conflict') setConflict(true)
        return
      }
      setSnapshot(result.snapshot)
      setNotice({ success: action.kind === 'add' ? 'saved' : action.kind === 'rename' ? 'renamed' : 'deleted' })
      if (action.kind === 'add') setName('')
      setEditingId(null)
      setDeletingId(null)
    } catch {
      setNotice({ error: 'unavailable' })
    } finally {
      setBusy(false)
    }
  }

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!pair) {
      setNotice({ error: 'invalidPair' })
      return
    }
    const id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
    void mutate({ kind: 'add', id, name, pair })
  }

  const load = (id: string) => {
    if (blocked || snapshot?.status !== 'ready') return
    const current = readUnitFavorites()
    if (current.status !== 'ready') {
      setSnapshot(current)
      setNotice({ error: current.status })
      return
    }
    if (current.raw !== snapshot.raw) {
      setConflict(true)
      setNotice({ error: 'conflict' })
      return
    }
    const favorite = current.favorites.find((item) => item.id === id)
    if (!favorite) {
      setNotice({ error: 'missingFavorite' })
      return
    }
    onLoad({ ...favorite.pair })
    setNotice({ success: 'loaded' })
  }

  return (
    <div className="min-w-0 space-y-2" data-testid="unit-favorites">
      {favorites.length > 0 && (
        <div className="flex max-w-full gap-2 overflow-x-auto pb-1" role="group" aria-label={t('favorites.quickList')}>
          {favorites.map((favorite) => {
            const selected = !!pair && sameUnitFavoritePair(pair, favorite.pair)
            return <button key={favorite.id} type="button" onClick={() => load(favorite.id)} disabled={blocked} title={summary(favorite.pair)} aria-pressed={selected} className={`min-h-11 max-w-60 shrink-0 truncate rounded-xl px-3 py-2 text-sm font-medium disabled:opacity-50 ${selected ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}>{favorite.name}</button>
          })}
        </div>
      )}
      {error && <p role="alert" className="rounded-xl bg-subtle p-3 text-sm text-body">{t(`favorites.errors.${error}`)}</p>}
      {!error && notice && 'success' in notice && <p role="status" className="text-sm text-primary">{t(`favorites.${notice.success}`)}</p>}
    <details className="rounded-2xl border border-line p-3">
      <summary className="min-h-11 cursor-pointer text-base font-semibold text-fg [overflow-wrap:anywhere]">
        {t('favorites.title')} <span className="text-sm font-normal text-sub">{t('favorites.count', { count: favorites.length, max: UNIT_FAVORITES_LIMIT })}</span>
      </summary>
      <div className="mt-2 space-y-4">
        <p className="text-sm text-sub">{t('favorites.description')}</p>
        {pair && (
          <div className="rounded-xl bg-subtle p-3">
            <p className="text-sm font-medium text-body">{t('favorites.current')}</p>
            <p className="mt-1 text-sm text-sub [overflow-wrap:anywhere]">{summary(pair)}</p>
          </div>
        )}
        {!pair && <p className="text-sm text-sub">{t(traditional ? 'favorites.traditionalUnavailable' : 'favorites.errors.invalidPair')}</p>}
        <form onSubmit={save} className="space-y-2">
          <label htmlFor="unit-favorite-name" className="block text-sm font-medium text-body">{t('favorites.name')}</label>
          <input id="unit-favorite-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={UNIT_FAVORITE_NAME_LIMIT} placeholder={t('favorites.namePlaceholder')} autoComplete="off" className="ui-field min-h-11 min-w-0 px-3 py-3 text-base" disabled={blocked} aria-describedby="unit-favorite-name-hint" />
          <p id="unit-favorite-name-hint" className="text-xs text-muted">{t('favorites.nameHint', { max: UNIT_FAVORITE_NAME_LIMIT })}</p>
          <button type="submit" disabled={blocked || !pair || favorites.length >= UNIT_FAVORITES_LIMIT} className="ui-btn min-h-11 w-full px-3 py-3 disabled:opacity-50">{t(busy ? 'favorites.saving' : 'favorites.save')}</button>
        </form>
        {favorites.length >= UNIT_FAVORITES_LIMIT && <p className="text-sm text-sub">{t('favorites.errors.limit')}</p>}
        {snapshot === null && <p role="status" className="text-sm text-muted">{t('favorites.loading')}</p>}
        {snapshot?.status === 'ready' && favorites.length === 0 && <p className="text-sm text-muted">{t('favorites.empty')}</p>}
        {favorites.length > 0 && (
          <ul className="space-y-3" aria-label={t('favorites.list')}>
            {favorites.map((favorite) => (
              <li key={favorite.id} className="rounded-xl bg-subtle p-3">
                <h3 className="text-base font-semibold text-fg [overflow-wrap:anywhere]">{favorite.name}</h3>
                <p className="mt-1 text-sm text-sub [overflow-wrap:anywhere]">{summary(favorite.pair)}</p>
                {editingId === favorite.id ? (
                  <form className="mt-3 space-y-2" onSubmit={(event) => { event.preventDefault(); void mutate({ kind: 'rename', id: favorite.id, name: editName }) }}>
                    <label htmlFor={`unit-favorite-rename-${favorite.id}`} className="block text-sm font-medium text-body">{t('favorites.newName')}</label>
                    <input id={`unit-favorite-rename-${favorite.id}`} value={editName} onChange={(event) => setEditName(event.target.value)} maxLength={UNIT_FAVORITE_NAME_LIMIT} autoComplete="off" className="ui-field min-h-11 min-w-0 px-3 py-3 text-base" disabled={blocked} />
                    <div className="flex flex-wrap gap-2">
                      <button type="submit" disabled={blocked} className="ui-btn min-h-11 px-3 py-2 disabled:opacity-50">{t('favorites.renameSave')}</button>
                      <button type="button" onClick={() => setEditingId(null)} disabled={busy} className="ui-btn-soft min-h-11 px-3 py-2">{t('favorites.cancel')}</button>
                    </div>
                  </form>
                ) : deletingId === favorite.id ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm text-body [overflow-wrap:anywhere]">{t('favorites.deletePrompt', { name: favorite.name })}</p>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => { void mutate({ kind: 'delete', id: favorite.id }) }} disabled={blocked} className="ui-btn min-h-11 px-3 py-2 disabled:opacity-50">{t('favorites.deleteConfirm')}</button>
                      <button type="button" onClick={() => setDeletingId(null)} disabled={busy} className="ui-btn-soft min-h-11 px-3 py-2">{t('favorites.cancel')}</button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => load(favorite.id)} disabled={blocked} className="ui-btn min-h-11 px-3 py-2 disabled:opacity-50">{t('favorites.load')}</button>
                    <button type="button" onClick={() => { setEditingId(favorite.id); setEditName(favorite.name); setDeletingId(null) }} disabled={blocked} className="ui-btn-soft min-h-11 px-3 py-2 disabled:opacity-50">{t('favorites.rename')}</button>
                    <button type="button" onClick={() => { setDeletingId(favorite.id); setEditingId(null) }} disabled={blocked} className="ui-btn-soft min-h-11 px-3 py-2 disabled:opacity-50">{t('favorites.delete')}</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        <button type="button" onClick={refresh} disabled={!hydrated || busy} className="ui-btn-soft min-h-11 w-full px-3 py-2 disabled:opacity-50">{t('favorites.refresh')}</button>
        <p className="text-xs text-muted">{t('favorites.localOnly')}</p>
      </div>
    </details>
    </div>
  )
}
