'use client'

import { useState, useCallback, useEffect, useRef, useMemo, useDeferredValue } from 'react'
import { useTranslations } from '@/lib/i18n'
import { FileText, Plus, Trash2, Download, Pin, PinOff, Menu, X, Search, Maximize2, Minimize2, Upload, Archive, Replace } from 'lucide-react'
import { analyze } from '@/utils/charCount'
import {
  type Note, type Settings, STORAGE_KEY, SETTINGS_KEY, DEFAULT_SETTINGS, FONT_SIZES,
  newId, parseNotes, parseSettings, backupJson, mergeNotes, sortNotes, searchNotes,
  displayTitle, safeFileName, findAll, nextMatch, replaceAll,
} from '@/utils/notepad'

const SAVE_DELAY = 400

type SaveState = 'idle' | 'saving' | 'saved' | 'error'
interface Toast { msg: string; undo?: { notes: Note[]; activeId: string | null } }

const blankNote = (): Note => {
  const now = Date.now()
  return { id: newId(), title: '', content: '', createdAt: now, updatedAt: now }
}

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
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

  const [notes, setNotes] = useState<Note[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [query, setQuery] = useState('')
  const [listOpen, setListOpen] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [findOpen, setFindOpen] = useState(false)
  const [findQ, setFindQ] = useState('')
  const [replQ, setReplQ] = useState('')
  const [caseSens, setCaseSens] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)

  const taRef = useRef<HTMLTextAreaElement>(null)
  const findRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const notesRef = useRef(notes)
  notesRef.current = notes
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const skipSave = useRef(false)
  const escPressed = useRef(false)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((tst: Toast) => {
    setToast(tst)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 6000)
  }, [])

  // ── 저장 ──
  const persist = useCallback(() => {
    saveTimer.current = null
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notesRef.current))
      setSaveState('saved')
    } catch {
      setSaveState('error') // 대개 QuotaExceededError
    }
  }, [])

  // 마운트 후 로드 (예전 v1 배열 형식 그대로 읽힘)
  useEffect(() => {
    let raw: string | null = null
    try { raw = localStorage.getItem(STORAGE_KEY) } catch { /* 저장소 차단 */ }
    let list = parseNotes(raw)
    if (list === null) {
      // 깨진 데이터는 덮어쓰기 전에 별도 키로 보존
      try { localStorage.setItem(`${STORAGE_KEY}-corrupt-${Date.now()}`, raw ?? '') } catch { /* ignore */ }
      list = []
    }
    if (!list.length) list = [blankNote()]
    const sorted = sortNotes(list)
    skipSave.current = true
    setNotes(sorted)
    setActiveId(sorted[0].id)
    try { setSettings(parseSettings(localStorage.getItem(SETTINGS_KEY))) } catch { /* ignore */ }
    setLoaded(true)
  }, [])

  // 변경 시 디바운스 저장
  useEffect(() => {
    if (!loaded) return
    if (skipSave.current) { skipSave.current = false; return }
    setSaveState('saving')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(persist, SAVE_DELAY)
  }, [notes, loaded, persist])

  // 탭 닫기·전환 직전 남은 저장 즉시 실행
  useEffect(() => {
    const flush = () => { if (saveTimer.current) { clearTimeout(saveTimer.current); persist() } }
    const onVis = () => { if (document.visibilityState === 'hidden') flush() }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onVis)
    return () => { window.removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', onVis) }
  }, [persist])

  // 다른 탭에서 바뀌면 반영. ponytail: 두 탭에서 동시에 같은 메모를 쓰면 마지막 저장이 이김
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return
      const list = parseNotes(e.newValue)
      if (!list) return
      skipSave.current = true
      setNotes(list)
      setActiveId(id => (list.some(n => n.id === id) ? id : sortNotes(list)[0]?.id ?? null))
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    if (!loaded) return
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)) } catch { /* ignore */ }
  }, [settings, loaded])

  // ── 파생값 ──
  const active = notes.find(n => n.id === activeId) ?? null
  const visible = useMemo(() => searchNotes(sortNotes(notes), query), [notes, query])
  const deferredContent = useDeferredValue(active?.content ?? '')
  const stats = useMemo(() => analyze(deferredContent), [deferredContent])
  const matchCount = useMemo(() => findAll(active?.content ?? '', findQ, caseSens).length, [active?.content, findQ, caseSens])
  const untitled = t('untitled')
  const nameOf = (n: Note) => displayTitle(n) || untitled

  // ── 메모 조작 ──
  const updateActive = useCallback((patch: Partial<Note>) => {
    setNotes(prev => prev.map(n => (n.id === activeId ? { ...n, ...patch, updatedAt: Date.now() } : n)))
  }, [activeId])

  const createNote = useCallback(() => {
    const n = blankNote()
    setNotes(prev => [n, ...prev])
    setActiveId(n.id)
    setQuery('')
    setListOpen(false)
    setTimeout(() => taRef.current?.focus(), 0)
  }, [])

  const deleteNote = useCallback((id: string) => {
    const snapshot = notesRef.current
    const rest = snapshot.filter(n => n.id !== id)
    setNotes(rest)
    if (id === activeId) setActiveId(sortNotes(rest)[0]?.id ?? null)
    const gone = snapshot.find(n => n.id === id)
    showToast({ msg: t('toast.deleted', { name: (gone && displayTitle(gone)) || untitled }), undo: { notes: snapshot, activeId } })
  }, [activeId, showToast, t, untitled])

  const togglePin = useCallback((id: string) => {
    setNotes(prev => prev.map(n => (n.id === id ? { ...n, pinned: !n.pinned } : n)))
  }, [])

  const undo = () => {
    if (!toast?.undo) return
    setNotes(toast.undo.notes)
    setActiveId(toast.undo.activeId)
    setToast(null)
  }

  // ── 내보내기·백업·가져오기 ──
  const exportTxt = useCallback(() => {
    const n = notesRef.current.find(x => x.id === activeId)
    if (!n) return
    download(`${safeFileName(displayTitle(n) || untitled)}.txt`, n.content, 'text/plain;charset=utf-8')
  }, [activeId, untitled])

  const exportBackup = () => {
    const d = new Date()
    const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    download(`toolhub-notepad-backup-${ymd}.json`, backupJson(notes), 'application/json')
  }

  const importFiles = async (files: FileList | null) => {
    if (!files?.length) return
    const snapshot = notesRef.current
    let cur = snapshot
    let count = 0
    let bad = 0
    for (const f of Array.from(files)) {
      const text = await f.text()
      if (/\.json$/i.test(f.name)) {
        const list = parseNotes(text)
        if (!list) { bad++; continue }
        const m = mergeNotes(cur, list)
        cur = m.notes
        count += m.added + m.updated
      } else {
        const now = Date.now()
        cur = [{ id: newId(), title: f.name.replace(/\.[^.]+$/, ''), content: text.replace(/\r\n?/g, '\n'), createdAt: now, updatedAt: now }, ...cur]
        count++
      }
    }
    if (fileRef.current) fileRef.current.value = ''
    if (count) {
      setNotes(cur)
      const first = sortNotes(cur)[0]
      if (first) setActiveId(first.id)
    }
    showToast({ msg: bad ? t('toast.importFailed', { n: count, bad }) : t('toast.imported', { n: count }), undo: count ? { notes: snapshot, activeId } : undefined })
  }

  // ── 찾기·바꾸기 ──
  const findNext = useCallback(() => {
    const ta = taRef.current
    if (!ta || !findQ) return
    const i = nextMatch(ta.value, findQ, ta.selectionEnd, caseSens)
    if (i < 0) return
    ta.focus()
    ta.setSelectionRange(i, i + findQ.length)
  }, [findQ, caseSens])

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
    if (!active) return
    const r = replaceAll(active.content, findQ, replQ, caseSens)
    if (!r.count) return
    const snapshot = notesRef.current
    updateActive({ content: r.text })
    showToast({ msg: t('toast.replaced', { n: r.count }), undo: { notes: snapshot, activeId } })
  }

  const openFind = () => {
    setFindOpen(true)
    setTimeout(() => findRef.current?.focus(), 0)
  }

  // ── 단축키 ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault()
        exportTxt()
      } else if (e.key === 'Escape' && focusMode) {
        setFocusMode(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [exportTxt, focusMode])

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
    const diff = Date.now() - ts
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

  const toolBtn = 'ui-btn-soft min-h-10 min-w-10 px-3 py-2 text-sm inline-flex items-center justify-center gap-1.5'
  const toggleBtn = (on: boolean) => `min-h-10 px-3 py-2 text-sm rounded-xl inline-flex items-center gap-1.5 ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
        <p className="text-sm text-sub mt-2">{t('localOnly')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 메모 목록 */}
        <aside className="lg:col-span-1 min-w-0">
          <button onClick={() => setListOpen(o => !o)} aria-expanded={listOpen}
            className="lg:hidden w-full mb-3 ui-btn-soft min-h-11 px-4 py-2 flex items-center justify-center gap-2">
            {listOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            {listOpen ? t('closeList') : t('openList', { n: notes.length })}
          </button>

          <div className={`${listOpen ? 'block' : 'hidden'} lg:block ui-card p-4 space-y-3`}>
            <button onClick={createNote} className="ui-btn w-full px-4 py-3 flex items-center justify-center gap-2">
              <Plus className="w-5 h-5" />{t('newNote')}
            </button>
            <div className="relative">
              <Search className="w-4 h-4 text-faint absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder={t('searchPlaceholder')}
                aria-label={t('searchPlaceholder')} className="ui-field w-full pl-9 pr-3 py-2.5 text-sm" />
            </div>

            <ul className="space-y-1 max-h-[55vh] overflow-y-auto -mx-1 px-1">
              {loaded && visible.length === 0 && (
                <li className="text-center py-6 text-sm text-muted">{query ? t('noResults') : t('noNotes')}</li>
              )}
              {visible.map(n => {
                const on = n.id === activeId
                return (
                  <li key={n.id} className={`flex items-stretch rounded-xl border ${on ? 'bg-primary-soft border-primary' : 'border-transparent hover:bg-soft'}`}>
                    <button onClick={() => { setActiveId(n.id); setListOpen(false) }} aria-current={on || undefined}
                      className="flex-1 min-w-0 text-left px-3 py-2.5">
                      <span className={`flex items-center gap-1 text-sm font-medium truncate ${on ? 'text-primary' : 'text-fg'}`}>
                        {n.pinned && <Pin className="w-3.5 h-3.5 shrink-0" aria-label={t('pinned')} />}
                        <span className="truncate">{nameOf(n)}</span>
                      </span>
                      <span className="block text-xs text-faint mt-0.5">{relTime(n.updatedAt)}</span>
                    </button>
                    <button onClick={() => togglePin(n.id)} title={n.pinned ? t('unpin') : t('pin')} aria-label={n.pinned ? t('unpin') : t('pin')}
                      className="w-10 shrink-0 flex items-center justify-center text-faint hover:text-body">
                      {n.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                    </button>
                    <button onClick={() => deleteNote(n.id)} title={t('delete')} aria-label={t('delete')}
                      className="w-10 shrink-0 flex items-center justify-center text-faint hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                )
              })}
            </ul>

            <div className="pt-3 border-t border-line space-y-2">
              <p className="text-xs text-muted">{t('backupHint')}</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={exportBackup} disabled={!notes.length} className={`${toolBtn} disabled:opacity-50`}>
                  <Archive className="w-4 h-4" />{t('backup')}
                </button>
                <button onClick={() => fileRef.current?.click()} className={toolBtn}>
                  <Upload className="w-4 h-4" />{t('import')}
                </button>
              </div>
              <input ref={fileRef} type="file" multiple accept=".json,.txt,.md,text/plain,application/json" className="hidden"
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
                <input type="text" value={active.title} onChange={e => updateActive({ title: e.target.value })}
                  placeholder={t('titlePlaceholder')} aria-label={t('titlePlaceholder')}
                  className="w-full px-1 py-2 text-xl font-semibold bg-transparent text-fg border-b border-line focus:outline-none focus:border-primary placeholder:text-faint" />

                <div className="flex flex-wrap gap-2" role="toolbar" aria-label={t('toolbar')}>
                  <button onClick={() => (findOpen ? setFindOpen(false) : openFind())} className={toggleBtn(findOpen)} aria-pressed={findOpen}>
                    <Replace className="w-4 h-4" />{t('find.button')}
                  </button>
                  <select value={settings.fontSize} onChange={e => setSettings(s => ({ ...s, fontSize: Number(e.target.value) }))}
                    aria-label={t('fontSize')} className="ui-field min-h-10 px-3 py-2 text-sm">
                    {FONT_SIZES.map(s => <option key={s} value={s}>{s}px</option>)}
                  </select>
                  <button onClick={() => setSettings(s => ({ ...s, mono: !s.mono }))} className={toggleBtn(settings.mono)} aria-pressed={settings.mono}>{t('mono')}</button>
                  <button onClick={() => setSettings(s => ({ ...s, wrap: !s.wrap }))} className={toggleBtn(settings.wrap)} aria-pressed={settings.wrap}>{t('wrap')}</button>
                  <button onClick={() => setFocusMode(f => !f)} className={toolBtn} aria-pressed={focusMode}>
                    {focusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}{focusMode ? t('exitFocus') : t('focus')}
                  </button>
                  <button onClick={exportTxt} className={toolBtn} title={t('exportShortcut')}>
                    <Download className="w-4 h-4" />{t('export')}
                  </button>
                </div>

                {findOpen && (
                  <div className="bg-subtle rounded-2xl p-3 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input ref={findRef} value={findQ} onChange={e => setFindQ(e.target.value)} placeholder={t('find.find')} aria-label={t('find.find')}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); findNext() } else if (e.key === 'Escape') { e.stopPropagation(); setFindOpen(false) } }}
                        className="ui-field w-full px-3 py-2.5 text-sm" />
                      <input value={replQ} onChange={e => setReplQ(e.target.value)} placeholder={t('find.replace')} aria-label={t('find.replace')}
                        className="ui-field w-full px-3 py-2.5 text-sm" />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex items-center gap-2 text-sm text-body min-h-10 pr-2">
                        <input type="checkbox" checked={caseSens} onChange={e => setCaseSens(e.target.checked)} className="w-4 h-4" />{t('find.caseSensitive')}
                      </label>
                      <span className="text-sm text-muted tabular-nums" aria-live="polite">{findQ ? t('find.count', { n: matchCount }) : ''}</span>
                      <div className="flex flex-wrap gap-2 ml-auto">
                        <button onClick={findNext} disabled={!matchCount} className={`${toolBtn} disabled:opacity-50`}>{t('find.next')}</button>
                        <button onClick={replaceOne} disabled={!matchCount} className={`${toolBtn} disabled:opacity-50`}>{t('find.replaceOne')}</button>
                        <button onClick={replaceAllNow} disabled={!matchCount} className="ui-btn min-h-10 px-3 py-2 text-sm">{t('find.replaceAll')}</button>
                      </div>
                    </div>
                  </div>
                )}

                <textarea ref={taRef} value={active.content} onChange={e => updateActive({ content: e.target.value })} onKeyDown={onEditorKey}
                  placeholder={t('contentPlaceholder')} aria-label={t('contentPlaceholder')} spellCheck={false}
                  wrap={settings.wrap ? 'soft' : 'off'} style={{ fontSize: settings.fontSize, tabSize: 4 }}
                  className={`ui-field w-full px-4 py-3 leading-relaxed resize-y ${settings.mono ? 'font-mono' : ''} ${focusMode ? 'flex-1 min-h-[50vh]' : 'h-[60vh] min-h-[320px]'}`} />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                  <dl className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {statItems.map(([k, v]) => (
                      <div key={k} className="flex gap-1"><dt className="text-muted">{k}</dt><dd className="text-fg font-medium tabular-nums">{v}</dd></div>
                    ))}
                  </dl>
                  <span className="text-sm text-muted shrink-0" role="status">
                    {saveState === 'saving' ? t('status.saving') : saveState === 'saved' ? t('status.saved') : ''}
                  </span>
                </div>
                {saveState === 'error' && (
                  <p className="bg-amber-50 text-amber-800 rounded-xl px-4 py-3 text-sm" role="alert">{t('status.error')}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="ui-card p-12 min-h-[320px] flex items-center justify-center">
              {loaded && (
                <div className="text-center">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-faint" />
                  <p className="text-fg font-medium">{t('noNotes')}</p>
                  <p className="text-sm text-muted mt-1 mb-4">{t('createFirstNote')}</p>
                  <button onClick={createNote} className="ui-btn px-4 py-3 inline-flex items-center gap-2"><Plus className="w-5 h-5" />{t('newNote')}</button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {toast && (
        <div className="fixed bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 z-[110] w-[calc(100%-2rem)] max-w-md bg-fg text-canvas rounded-2xl shadow-lg px-4 py-2 flex items-center gap-3" role="status">
          <span className="flex-1 text-sm min-w-0 break-words">{toast.msg}</span>
          {toast.undo && <button onClick={undo} className="min-h-10 px-3 text-sm font-semibold text-primary">{t('toast.undo')}</button>}
          <button onClick={() => setToast(null)} aria-label={t('toast.close')} className="min-h-10 min-w-10 flex items-center justify-center opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
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
