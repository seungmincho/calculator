'use client'

import { useState, useCallback, useEffect, useRef, useMemo, useDeferredValue } from 'react'
import { useNotepadWorkspace } from '@/hooks/useNotepadWorkspace'
import NotepadRecovery from './NotepadRecovery'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/notepad'
import { FileText, Plus, Trash2, Download, Pin, PinOff, Menu, X, Search, Maximize2, Minimize2, Upload, Archive, Replace } from 'lucide-react'
import { analyze } from '@/utils/charCount'
import { useFullscreenEscape } from '@/hooks/useFullscreenEscape'
import { captureTextSelection, openTextHandoff, selectedHandoffText, TEXT_HANDOFF_LIMIT, type TextSelectionSnapshot } from '@/utils/textHandoff'
import {
  type Note, FONT_SIZES,
  newId, backupJson, sortNotes, searchNotes,
  displayTitle, safeFileName, findAll, nextMatch, replaceAll,
} from '@/utils/notepad'

interface Toast { key: string; values?: Record<string, string | number>; undoToken?: number | null }

const blankNote = (): Note => {
  const now = Date.now()
  return { id: newId(), title: '', content: '', createdAt: now, updatedAt: now }
}

/** 실행 취소 기록이 남도록 브라우저 편집 명령으로 삽입. 안 되면 직접 교체 */
function insertText(ta: HTMLTextAreaElement, text: string): boolean {
  ta.focus()
  try { if (document.execCommand('insertText', false, text)) return true } catch { /* fallback */ }
  ta.setRangeText(text, ta.selectionStart, ta.selectionEnd, 'end')
  return false
}

export default function Notepad() {
  const t = useTranslations('notepad')

  const workspace = useNotepadWorkspace()
  const { controller, edit, download, cancelImport } = workspace
  const notes = useMemo(() => [...workspace.view.notes], [workspace.view.notes])
  const activeId = workspace.view.activeId, loaded = workspace.view.ready, settings = workspace.settings
  const [clock, setClock] = useState(0)
  const [query, setQuery] = useState('')
  const [listOpen, setListOpen] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [findOpen, setFindOpen] = useState(false)
  const [findQ, setFindQ] = useState('')
  const [replQ, setReplQ] = useState('')
  const [caseSens, setCaseSens] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)
  const [readingSelection, setReadingSelection] = useState<TextSelectionSnapshot | null>(null)
  const [readingNotice, setReadingNotice] = useState<{ key: string; error: boolean; count?: number } | null>(null)
  const readingSelectionRef = useRef<TextSelectionSnapshot | null>(null)

  const taRef = useRef<HTMLTextAreaElement>(null)
  const findRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const focusBtnRef = useRef<HTMLButtonElement>(null)
  const escPressed = useRef(false)
  const mounted = useRef(false)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastOwner = useRef(0)
  const focusTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const focusOwner = useRef(0)
  const invalidateToast = useCallback(() => { toastOwner.current++; if (toastTimer.current !== null) clearTimeout(toastTimer.current); toastTimer.current = null }, [])

  const clearFocus = useCallback(() => { focusOwner.current++; if (focusTimer.current !== null) clearTimeout(focusTimer.current); focusTimer.current = null }, [])
  const requestFocus = useCallback((field: 'editor' | 'find', expectedId: string | null) => {
    clearFocus(); const owner = focusOwner.current
    focusTimer.current = setTimeout(() => {
      if (!mounted.current || owner !== focusOwner.current || controller.snapshot().activeId !== expectedId) return
      focusTimer.current = null
      const node = field === 'editor' ? taRef.current : findRef.current
      if (node?.isConnected) node.focus()
    }, 0)
  }, [clearFocus, controller])
  const showToast = useCallback((tst: Toast) => {
    if (!mounted.current) return
    const owner = ++toastOwner.current
    setToast(tst)
    if (toastTimer.current !== null) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => {
      if (!mounted.current || owner !== toastOwner.current) return
      toastTimer.current = null; setToast(null)
      if (tst.undoToken != null) controller.clearUndo(tst.undoToken)
    }, 6000)
  }, [controller])
  const closeToast = useCallback(() => {
    invalidateToast()
    const token = controller.snapshot().undoToken
    if (token !== null) controller.clearUndo(token)
    setToast(null)
  }, [controller, invalidateToast])
  useEffect(() => {
    mounted.current = true
    const initial = setTimeout(() => setClock(Date.now()), 0)
    const hide = () => { mounted.current = false; clearFocus(); invalidateToast(); setToast(null) }
    const show = () => { mounted.current = true }
    window.addEventListener('pagehide', hide)
    window.addEventListener('pageshow', show)
    return () => { mounted.current = false; clearTimeout(initial); clearFocus(); invalidateToast(); window.removeEventListener('pagehide', hide); window.removeEventListener('pageshow', show) }
  }, [clearFocus, invalidateToast])

  const clearReadingSelection = useCallback(() => {
    readingSelectionRef.current = null
    setReadingSelection(null)
    setReadingNotice(null)
  }, [])

  // ── 파생값 ──
  const active = notes.find(n => n.id === activeId) ?? null
  const visible = useMemo(() => searchNotes(sortNotes(notes), query), [notes, query])
  const deferredContent = useDeferredValue(active?.content ?? '')
  const stats = useMemo(() => analyze(deferredContent), [deferredContent])
  const matchCount = useMemo(() => findAll(active?.content ?? '', findQ, caseSens).length, [active?.content, findQ, caseSens])
  const untitled = t('untitled')
  const nameOf = (n: Note) => displayTitle(n) || untitled
  const selectedReading = active ? selectedHandoffText(readingSelection, active.id, active.content) : null

  const captureReadingSelection = (keepOnCollapse = false) => {
    if (!mounted.current) return
    const textarea = taRef.current
    const latest = controller.snapshot(), note = latest.notes.find(item => item.id === latest.activeId)
    if (!textarea || !note || textarea.value !== note.content) return
    const selection = captureTextSelection(note.id, note.content, textarea.selectionStart, textarea.selectionEnd)
    if (!selection && keepOnCollapse) return
    readingSelectionRef.current = selection
    setReadingSelection(selection)
  }

  const sendToReader = (selectionOnly: boolean) => {
    if (!mounted.current) return
    const latest = controller.snapshot(), note = latest.notes.find(item => item.id === latest.activeId)
    setReadingNotice(null)
    if (!note) return
    const content = selectionOnly ? selectedHandoffText(readingSelectionRef.current, note.id, note.content) : note.content
    if (content === null) { setReadingNotice({ key: 'selectionChanged', error: true }); return }
    try {
      openTextHandoff(content)
      setReadingNotice({ key: 'sent', error: false, count: content.length })
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : ''
      const key = ['popupBlocked', 'textTooLong', 'emptyText'].includes(message) ? message : 'handoffFailed'
      setReadingNotice({ key, error: true })
    }
  }

  // ── 메모 조작 ──
  const updateActive = useCallback((patch: Partial<Note>) => {
    if (!mounted.current) return
    const view = controller.snapshot(), now = Date.now()
    if (!view.ready || !view.activeId) return
    clearReadingSelection(); clearFocus(); setClock(now)
    edit(view.notes.map(n => n.id === view.activeId ? { ...n, ...patch, updatedAt: now } : n), view.activeId)
  }, [controller, edit, clearReadingSelection, clearFocus])
  const createNote = useCallback(() => {
    if (!mounted.current || !controller.snapshot().ready) return
    const view = controller.snapshot(), n = blankNote(), ids = new Set(view.notes.map(note => note.id))
    let suffix = 0; const baseId = n.id
    while (ids.has(n.id)) n.id = baseId + '-' + (++suffix)
    clearReadingSelection(); setClock(Date.now())
    if (!edit([n, ...view.notes], n.id)) return
    setQuery(''); setListOpen(false); requestFocus('editor', n.id)
  }, [controller, edit, clearReadingSelection, requestFocus])
  const deleteNote = useCallback((id: string) => {
    if (!mounted.current) return
    const view = controller.snapshot(), gone = view.notes.find(n => n.id === id)
    if (!gone) return
    const rest = view.notes.filter(n => n.id !== id), selected = id === view.activeId ? sortNotes(rest)[0]?.id ?? null : view.activeId
    clearReadingSelection(); clearFocus()
    if (edit(rest, selected, true)) showToast({ key: 'toast.deleted', values: { name: displayTitle(gone) || t('untitled') }, undoToken: controller.snapshot().undoToken })
  }, [controller, edit, clearReadingSelection, clearFocus, showToast, t])
  const togglePin = useCallback((id: string) => {
    if (!mounted.current) return
    const view = controller.snapshot(); clearFocus()
    edit(view.notes.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n), view.activeId)
  }, [controller, edit, clearFocus])
  const selectNote = (id: string) => { if (!mounted.current) return; clearFocus(); clearReadingSelection(); controller.select(id); setListOpen(false) }
  const undo = () => {
    if (!mounted.current || toast?.undoToken == null) return
    clearFocus()
    if (workspace.undo(toast.undoToken)) { clearReadingSelection(); closeToast() }
  }

  // ── 내보내기·백업·가져오기 ──
  const exportTxt = useCallback(() => {
    const view = controller.snapshot(), n = view.notes.find(x => x.id === view.activeId)
    if (!n) return
    download(safeFileName(displayTitle(n) || t('untitled')) + '.txt', n.content, 'text/plain;charset=utf-8')
  }, [controller, download, t])
  const exportBackup = () => {
    const date = new Date().toISOString().slice(0, 10)
    download('toolhub-notepad-backup-' + date + '.json', backupJson([...controller.snapshot().notes]), 'application/json;charset=utf-8')
  }
  const importFiles = async (files: FileList | null) => {
    const captured = files ? Array.from(files) : []
    if (fileRef.current) fileRef.current.value = ''
    if (!captured.length || !mounted.current) return
    clearFocus(); clearReadingSelection(); closeToast()
    const result = await workspace.importFiles(captured)
    if (!result || !mounted.current || result.scope !== controller.snapshot().scope) return
    setClock(Date.now())
    showToast({ key: 'importRecovery.result', values: { added: result.added, conflicts: result.conflicts, duplicates: result.duplicates, failed: result.failures.length }, undoToken: result.undoToken })
  }

  // ── 찾기·바꾸기 ──
  const findNext = useCallback(() => {
    const ta = taRef.current
    const view = controller.snapshot(), note = view.notes.find(n => n.id === view.activeId)
    if (!mounted.current || !ta || !findQ || !note || ta.value !== note.content) return
    const i = nextMatch(ta.value, findQ, ta.selectionEnd, caseSens)
    if (i < 0) return
    ta.focus()
    ta.setSelectionRange(i, i + findQ.length)
  }, [findQ, caseSens, controller])

  const replaceOne = () => {
    const ta = taRef.current
    if (!ta || !findQ) return
    const sel = ta.value.slice(ta.selectionStart, ta.selectionEnd)
    if (caseSens ? sel === findQ : sel.toLowerCase() === findQ.toLowerCase()) {
      if (!insertText(ta, replQ)) updateActive({ content: ta.value })
    }
    findNext()
  }

  const replaceAllNow = () => {
    const view = controller.snapshot(), note = view.notes.find(n => n.id === view.activeId)
    if (!note || !mounted.current) return
    const result = replaceAll(note.content, findQ, replQ, caseSens)
    if (!result.count) return
    clearReadingSelection(); clearFocus(); const now = Date.now(); setClock(now)
    if (edit(view.notes.map(n => n.id === note.id ? { ...n, content: result.text, updatedAt: now } : n), note.id, true)) showToast({ key: 'toast.replaced', values: { n: result.count }, undoToken: controller.snapshot().undoToken })
  }
  const openFind = () => { setFindOpen(true); requestFocus('find', controller.snapshot().activeId) }
  const closeFind = () => { clearFocus(); setFindOpen(false) }

  // ── 단축키 ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault()
        exportTxt()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [exportTxt])
  // 편집창의 Esc 는 'Esc 후 Tab' 탈출에 쓰므로(data-keep-escape) 집중 모드를 끝내지 않는다
  useFullscreenEscape(focusMode, () => setFocusMode(false), focusBtnRef)

  const onEditorKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget
    if (e.key === 'Escape') { escPressed.current = true; return }
    const esc = escPressed.current
    escPressed.current = false
    // Tab = 탭 문자. 키보드로 빠져나가려면 Esc 후 Tab (키보드 함정 방지)
    if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey && !esc) {
      e.preventDefault()
      if (!insertText(ta, '\t')) updateActive({ content: ta.value })
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
      e.preventDefault()
      openFind()
    } else if (findOpen && (e.key === 'F3' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g'))) {
      e.preventDefault()
      findNext()
    }
  }

  // ── 표시 ──
  const relTime = (ts: number) => {
    const diff = clock - ts
    if (diff < 60_000) return t('time.justNow')
    if (diff < 3_600_000) return t('time.minutes', { n: Math.floor(diff / 60_000) })
    if (diff < 86_400_000) return t('time.hours', { n: Math.floor(diff / 3_600_000) })
    const d = new Date(ts)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  const statItems: [string, string][] = [
    [t('stats.chars'), stats.chars.toLocaleString()],
    [t('stats.charsNoSpace'), stats.charsNoSpace.toLocaleString()],
    [t('stats.words'), stats.words.toLocaleString()],
    [t('stats.lines'), stats.lines.toLocaleString()],
    [t('stats.manuscript'), t('stats.sheets', { n: stats.manuscript.sheets.toLocaleString(undefined, { maximumFractionDigits: 1 }) })],
    [t('stats.bytes'), stats.bytesUtf8.toLocaleString()],
  ]

  const toolBtn = 'ui-btn-soft min-h-11 min-w-11 px-3 py-2 text-sm inline-flex items-center justify-center gap-1.5'
  const toggleBtn = (on: boolean) => `min-h-11 px-3 py-2 text-sm rounded-xl inline-flex items-center gap-1.5 ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`

  return (
    <div className="space-y-8" data-notepad-root="" data-notepad-ready={loaded}>
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
        <p className="text-sm text-sub mt-2">{t('localOnly')}</p>
      </div>

      <NotepadRecovery view={workspace.view} settingsError={workspace.settingsError} onRetry={() => { clearFocus(); void workspace.retry() }} onRecheck={() => { clearFocus(); workspace.recheck() }} onKeepBoth={(scope, raw) => { clearFocus(); clearReadingSelection(); void workspace.keepBoth(scope, raw) }} onBackup={exportBackup} onRawBackup={raw => download('toolhub-notepad-original.txt', raw, 'text/plain;charset=utf-8')} onRetrySettings={() => { void workspace.retrySettings() }} />
      {workspace.importStatus === 'reading' && <div className="flex flex-wrap items-center gap-3" role="status" data-notepad-import-status="reading"><p className="text-sm text-sub">{t('importRecovery.reading')}</p><button type="button" data-notepad-import-cancel="" onClick={cancelImport} className="ui-btn-soft min-h-11 px-4 py-2">{t('importRecovery.cancel')}</button></div>}
      {workspace.importStatus === 'cancelled' && <p role="status" data-notepad-import-status="cancelled" className="text-sm text-sub">{t('importRecovery.cancelled')}</p>}
      {!!workspace.importSummary?.failures.length && <div className="space-y-2 text-sm text-sub" role="status"><p>{t('importRecovery.failureTitle')}</p><ul>{workspace.importSummary.failures.map((failure, i) => <li key={i} className="[overflow-wrap:anywhere]">{failure.name}: {t('importRecovery.' + failure.error)}</li>)}</ul></div>}
      {workspace.downloadFailed && <p role="alert" className="text-sm text-sub">{t('importRecovery.downloadFailed')}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 메모 목록 */}
        <aside className="lg:col-span-1 min-w-0">
          <button onClick={() => setListOpen(o => !o)} aria-expanded={listOpen}
            className="lg:hidden w-full mb-3 ui-btn-soft min-h-11 px-4 py-2 flex items-center justify-center gap-2">
            {listOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            {listOpen ? t('closeList') : t('openList', { n: notes.length })}
          </button>

          <div className={`${listOpen ? 'block' : 'hidden'} lg:block ui-card p-4 space-y-3`}>
            <button data-notepad-new="" disabled={!loaded} onClick={createNote} className="ui-btn w-full px-4 py-3 flex items-center justify-center gap-2">
              <Plus className="w-5 h-5" />{t('newNote')}
            </button>
            <div className="relative">
              <Search className="w-4 h-4 text-faint absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder={t('searchPlaceholder')}
                aria-label={t('searchPlaceholder')} className="ui-field w-full pl-9 pr-3 py-2.5 text-base" />
            </div>

            <ul className="space-y-1 max-h-[55vh] overflow-y-auto -mx-1 px-1">
              {loaded && visible.length === 0 && (
                <li className="text-center py-6 text-sm text-muted">{query ? t('noResults') : t('noNotes')}</li>
              )}
              {visible.map(n => {
                const on = n.id === activeId
                return (
                  <li key={n.id} className={`flex items-stretch rounded-xl border ${on ? 'bg-primary-soft border-primary' : 'border-transparent hover:bg-soft'}`}>
                    <button data-notepad-select={n.id} onClick={() => selectNote(n.id)} aria-current={on || undefined}
                      className="flex-1 min-w-0 text-left px-3 py-2.5">
                      <span className={`flex items-center gap-1 text-sm font-medium truncate ${on ? 'text-primary' : 'text-fg'}`}>
                        {n.pinned && <Pin className="w-3.5 h-3.5 shrink-0" aria-label={t('pinned')} />}
                        <span className="truncate">{nameOf(n)}</span>
                      </span>
                      <span className="block text-xs text-faint mt-0.5">{relTime(n.updatedAt)}</span>
                    </button>
                    <button data-notepad-pin={n.id} onClick={() => togglePin(n.id)} title={n.pinned ? t('unpin') : t('pin')} aria-label={n.pinned ? t('unpin') : t('pin')}
                      className="w-11 shrink-0 flex items-center justify-center text-faint hover:text-body">
                      {n.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                    </button>
                    <button data-notepad-delete={n.id} onClick={() => deleteNote(n.id)} title={t('delete')} aria-label={t('delete')}
                      className="w-11 shrink-0 flex items-center justify-center text-faint hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                )
              })}
            </ul>

            <div className="pt-3 border-t border-line space-y-2">
              <p className="text-xs text-muted">{t('backupHint')}</p>
              <div className="grid grid-cols-2 gap-2">
                <button data-notepad-backup="" onClick={exportBackup} disabled={!loaded} className={`${toolBtn} disabled:opacity-50`}>
                  <Archive className="w-4 h-4" />{t('backup')}
                </button>
                <button disabled={!loaded} onClick={() => fileRef.current?.click()} className={toolBtn}>
                  <Upload className="w-4 h-4" />{t('import')}
                </button>
              </div>
              <input data-notepad-file="" disabled={!loaded} ref={fileRef} type="file" multiple accept=".json,.txt,.md,text/plain,application/json" className="hidden"
                onChange={e => importFiles(e.target.files)} />
            </div>
          </div>
        </aside>

        {/* 편집기 */}
        <section className="lg:col-span-3 min-w-0">
          {active ? (
            <div className={focusMode
              ? 'fixed inset-0 z-[100] bg-canvas p-3 sm:p-8 flex flex-col overflow-y-auto'
              : 'ui-card p-4 sm:p-6 flex flex-col'}>
              <div className={`flex flex-col gap-3 ${focusMode ? 'w-full max-w-3xl mx-auto flex-1' : ''}`}>
                <input data-notepad-title="" type="text" value={active.title} onChange={e => updateActive({ title: e.target.value })}
                  placeholder={t('titlePlaceholder')} aria-label={t('titlePlaceholder')}
                  className="w-full px-1 py-2 text-xl font-semibold bg-transparent text-fg border-b border-line focus:outline-none focus:border-primary placeholder:text-faint" />

                <div className="flex flex-wrap gap-2" role="toolbar" aria-label={t('toolbar')}>
                  <button onClick={() => (findOpen ? closeFind() : openFind())} className={toggleBtn(findOpen)} aria-pressed={findOpen}>
                    <Replace className="w-4 h-4" />{t('find.button')}
                  </button>
                  <select value={settings.fontSize} onChange={e => workspace.editSettings({ fontSize: Number(e.target.value) })}
                    aria-label={t('fontSize')} className="ui-field min-h-11 px-3 py-2 text-base">
                    {FONT_SIZES.map(s => <option key={s} value={s}>{s}px</option>)}
                  </select>
                  <button onClick={() => workspace.editSettings({ mono: !settings.mono })} className={toggleBtn(settings.mono)} aria-pressed={settings.mono}>{t('mono')}</button>
                  <button onClick={() => workspace.editSettings({ wrap: !settings.wrap })} className={toggleBtn(settings.wrap)} aria-pressed={settings.wrap}>{t('wrap')}</button>
                  <button ref={focusBtnRef} onClick={() => setFocusMode(f => !f)} className={toolBtn} aria-pressed={focusMode}>
                    {focusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}{focusMode ? t('exitFocus') : t('focus')}
                  </button>
                  <button data-notepad-export-txt="" onClick={exportTxt} className={toolBtn} title={t('exportShortcut')}>
                    <Download className="w-4 h-4" />{t('export')}
                  </button>
                </div>

                {findOpen && (
                  <div className="bg-subtle rounded-2xl p-3 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input ref={findRef} value={findQ} onChange={e => setFindQ(e.target.value)} placeholder={t('find.find')} aria-label={t('find.find')}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); findNext() } else if (e.key === 'Escape') { e.stopPropagation(); closeFind() } }}
                        className="ui-field w-full px-3 py-2.5 text-base" />
                      <input value={replQ} onChange={e => setReplQ(e.target.value)} placeholder={t('find.replace')} aria-label={t('find.replace')}
                        className="ui-field w-full px-3 py-2.5 text-base" />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex items-center gap-2 text-sm text-body min-h-11 pr-2">
                        <input type="checkbox" checked={caseSens} onChange={e => setCaseSens(e.target.checked)} className="w-4 h-4" />{t('find.caseSensitive')}
                      </label>
                      <span className="text-sm text-muted tabular-nums" aria-live="polite">{findQ ? t('find.count', { n: matchCount }) : ''}</span>
                      <div className="flex flex-wrap gap-2 ml-auto">
                        <button onClick={findNext} disabled={!matchCount} className={`${toolBtn} disabled:opacity-50`}>{t('find.next')}</button>
                        <button onClick={replaceOne} disabled={!matchCount} className={`${toolBtn} disabled:opacity-50`}>{t('find.replaceOne')}</button>
                        <button onClick={replaceAllNow} disabled={!matchCount} className="ui-btn min-h-11 px-3 py-2 text-sm">{t('find.replaceAll')}</button>
                      </div>
                    </div>
                  </div>
                )}

                <textarea data-notepad-content="" ref={taRef} value={active.content} onChange={e => updateActive({ content: e.target.value })} onKeyDown={onEditorKey}
                  onSelect={() => captureReadingSelection()} onBlur={() => captureReadingSelection(true)} data-keep-escape
                  placeholder={t('contentPlaceholder')} aria-label={t('contentPlaceholder')} spellCheck={false}
                  wrap={settings.wrap ? 'soft' : 'off'} style={{ fontSize: settings.fontSize, tabSize: 4 }}
                  className={`ui-field w-full px-4 py-3 leading-relaxed resize-y ${settings.mono ? 'font-mono' : ''} ${focusMode ? 'flex-1 min-h-[50vh]' : 'h-[60vh] min-h-[320px]'}`} />

                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2" role="group" aria-label={t('reading.title')}>
                    <button type="button" disabled={!active.content.trim()} onPointerDown={() => captureReadingSelection(true)} data-notepad-reading="all" onClick={() => sendToReader(false)} className="ui-btn-soft min-h-11 px-4 py-2 text-sm disabled:opacity-50">{t('reading.all')}</button>
                    <button type="button" disabled={!selectedReading} onPointerDown={() => captureReadingSelection(true)} data-notepad-reading="selection" onClick={() => sendToReader(true)} className="ui-btn-soft min-h-11 px-4 py-2 text-sm disabled:opacity-50">{t('reading.selection')}</button>
                  </div>
                  <p className="text-xs text-muted">{t('reading.hint', { max: TEXT_HANDOFF_LIMIT.toLocaleString() })}</p>
                  {selectedReading && <p className="text-xs text-sub tabular-nums">{t('reading.selected', { count: selectedReading.length.toLocaleString() })}</p>}
                  {readingNotice && <p role={readingNotice.error ? 'alert' : 'status'} className="text-sm text-sub">{t(`reading.${readingNotice.key}`, { count: readingNotice.count ?? 0 })}</p>}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                  <dl className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {statItems.map(([k, v]) => (
                      <div key={k} className="flex gap-1"><dt className="text-muted">{k}</dt><dd className="text-fg font-medium tabular-nums">{v}</dd></div>
                    ))}
                  </dl>
                </div>
              </div>
            </div>
          ) : (
            <div className="ui-card p-12 min-h-[320px] flex items-center justify-center">
              {loaded && (
                <div className="text-center">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-faint" />
                  <p className="text-fg font-medium">{t('noNotes')}</p>
                  <p className="text-sm text-muted mt-1 mb-4">{t('createFirstNote')}</p>
                  <button data-notepad-new="" disabled={!loaded} onClick={createNote} className="ui-btn px-4 py-3 inline-flex items-center gap-2"><Plus className="w-5 h-5" />{t('newNote')}</button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {toast && (
        <div className="fixed bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 z-[110] w-[calc(100%-2rem)] max-w-md bg-fg text-canvas rounded-2xl shadow-lg px-4 py-2 flex items-center gap-3" role="status">
          <span className="flex-1 text-sm min-w-0 break-words">{t(toast.key, toast.values)}</span>
          {toast.undoToken != null && toast.undoToken === workspace.view.undoToken && <button data-notepad-undo="" onClick={undo} className="min-h-11 px-3 text-sm font-semibold text-primary">{t('toast.undo')}</button>}
          <button data-notepad-toast-close="" onClick={closeToast} aria-label={t('toast.close')} className="min-h-11 min-w-11 flex items-center justify-center opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* 가이드 */}
      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        <div>
          <h3 className="font-semibold text-fg mb-2">{t('guide.whatIs.title')}</h3>
          <p className="text-body leading-relaxed">{t('guide.whatIs.description')}</p>
        </div>
        {(['features', 'usage', 'shortcuts', 'tips'] as const).map(sec => (
          <div key={sec}>
            <h3 className="font-semibold text-fg mb-2">{t(`guide.${sec}.title`)}</h3>
            <ul className="space-y-1.5 text-body list-disc pl-5">
              {(t.raw(`guide.${sec}.items`) as string[]).map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </div>
        ))}
        <div>
          <h3 className="font-semibold text-fg mb-2">{t('guide.faq.title')}</h3>
          <dl className="space-y-3">
            {(t.raw('guide.faq.items') as { q: string; a: string }[]).map((f, i) => (
              <div key={i} className="bg-subtle rounded-2xl p-4">
                <dt className="font-medium text-fg">{f.q}</dt>
                <dd className="text-sm text-sub mt-1 leading-relaxed">{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  )
}
