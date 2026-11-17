'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/kanbanBoard'
import { useDialog } from '@/hooks/useDialog'
import { useHydrated } from '@/hooks/useHydrated'
import { useSearchParams } from '@/hooks/useSearchParams'
import { Download, GripVertical, Plus, Trash2, Upload, X } from 'lucide-react'
import KanbanMeetingImportPanel from '@/components/KanbanMeetingImportPanel'
import {
  KANBAN_STORAGE_KEY,
  MEETING_KANBAN_KEY,
  importMeetingTasks,
  parseKanbanState,
  parseMeetingKanbanHandoff,
  persistKanbanState,
  type ColorLabel,
  type KanbanCard as Card,
  type KanbanColumn as Column,
  type KanbanState,
  type MeetingImportTarget,
  type MeetingKanbanHandoff,
  type Priority,
} from '@/utils/meetingKanban'

type BoardTranslation = ReturnType<typeof useTranslations<'kanbanBoard'>>
type CardInput = Omit<Card, 'id' | 'createdAt' | 'meetingSource'>
type StorageIssue = 'invalidBoard' | 'conflict' | 'unavailable' | 'saveFailed' | null
const COLOR_LABELS: ColorLabel[] = ['blue', 'green', 'red', 'yellow', 'purple', 'pink', 'orange', 'gray']
const PRIORITY_KEYS = { high: 'priorityHigh', medium: 'priorityMedium', low: 'priorityLow' } as const
const fieldClass = 'ui-field min-h-11 w-full px-3 py-2 text-base'

function genId() {
  return crypto.randomUUID()
}

// Called only after hydration: the server and first browser render both show an empty board.
function makeSampleBoard(t: BoardTranslation): Column[] {
  const samples = [
    { id: 'col-todo', name: 'todo', tasks: ['requirements', 'design', 'schema'] },
    { id: 'col-inprogress', name: 'inProgress', tasks: ['login', 'api'] },
    { id: 'col-review', name: 'review', tasks: ['homepage'] },
    { id: 'col-done', name: 'done', tasks: ['setup', 'kickoff'] },
  ]
  return samples.map((column) => ({
    id: column.id,
    title: t(`sample.columns.${column.name}`),
    cards: column.tasks.map((task) => ({
      id: genId(),
      title: t(`sample.tasks.${task}.title`),
      description: t(`sample.tasks.${task}.description`),
      priority: 'medium',
      color: 'gray',
      dueDate: '',
      createdAt: Date.now(),
    })),
  }))
}

function CardModal({ t, initial, onSave, onClose, error }: {
  t: BoardTranslation
  initial?: Card
  onSave: (card: CardInput) => void
  onClose: () => void
  error: string | null
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? 'medium')
  const [color, setColor] = useState<ColorLabel>(initial?.color ?? 'gray')
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? '')
  const [assignee, setAssignee] = useState(initial?.assignee ?? '')
  const dialogRef = useRef<HTMLDivElement>(null)
  useDialog(true, onClose, dialogRef)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="kanban-card-modal-title"
        className="ui-card max-h-[90dvh] w-full max-w-lg overflow-y-auto shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 id="kanban-card-modal-title" className="text-lg font-semibold text-fg">{t(initial ? 'editCard' : 'addCard')}</h2>
          <button type="button" onClick={onClose} aria-label={t('close')} className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-sub hover:bg-soft"><X size={20} /></button>
        </div>
        <form className="space-y-4 p-5" onSubmit={(event) => {
          event.preventDefault()
          if (title.trim()) onSave({ title: title.trim(), description: description.trim(), priority, color, dueDate, assignee: assignee.trim() })
        }}>
          {error && <p role="alert" className="rounded-xl bg-subtle p-3 text-sm text-body">{error}</p>}
          <div>
            <label htmlFor="kanban-card-title" className="mb-1 block text-sm font-medium text-body">{t('cardTitle')}</label>
            <input id="kanban-card-title" className={fieldClass} value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t('cardTitlePlaceholder')} required data-autofocus />
          </div>
          <div>
            <label htmlFor="kanban-card-description" className="mb-1 block text-sm font-medium text-body">{t('cardDescription')}</label>
            <textarea id="kanban-card-description" className={`${fieldClass} resize-y`} rows={4} value={description} onChange={(event) => setDescription(event.target.value)} placeholder={t('cardDescriptionPlaceholder')} />
          </div>
          <div>
            <label htmlFor="kanban-card-assignee" className="mb-1 block text-sm font-medium text-body">{t('assignee')}</label>
            <input id="kanban-card-assignee" className={fieldClass} maxLength={120} value={assignee} onChange={(event) => setAssignee(event.target.value)} placeholder={t('assigneePlaceholder')} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="kanban-card-priority" className="mb-1 block text-sm font-medium text-body">{t('priority')}</label>
              <select id="kanban-card-priority" className={fieldClass} value={priority} onChange={(event) => setPriority(event.target.value as Priority)}>
                {(['high', 'medium', 'low'] as const).map((value) => <option key={value} value={value}>{t(PRIORITY_KEYS[value])}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="kanban-card-date" className="mb-1 block text-sm font-medium text-body">{t('dueDate')}</label>
              <input id="kanban-card-date" type="date" min="0001-01-01" max="9999-12-31" className={fieldClass} value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            </div>
          </div>
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-body">{t('colorLabel')}</legend>
            <div className="flex flex-wrap gap-2">
              {COLOR_LABELS.map((value) => <button key={value} type="button" aria-pressed={color === value} onClick={() => setColor(value)}
                className={`min-h-11 rounded-xl px-3 text-sm ${color === value ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}>{t(`colors.${value}`)}</button>)}
            </div>
          </fieldset>
          {initial?.meetingSource && <p className="rounded-xl bg-subtle p-3 text-sm text-sub">{t('meetingCopy', { title: initial.meetingSource.meetingTitle })}</p>}
          <div className="flex gap-3 pt-2">
            <button type="submit" className="ui-btn min-h-11 flex-1 px-4 py-2">{t('save')}</button>
            <button type="button" onClick={onClose} className="ui-btn-soft min-h-11 flex-1 px-4 py-2">{t('cancel')}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ColModal({ t, initial, onSave, onClose, error }: {
  t: BoardTranslation
  initial?: string
  onSave: (title: string) => void
  onClose: () => void
  error: string | null
}) {
  const [title, setTitle] = useState(initial ?? '')
  const dialogRef = useRef<HTMLDivElement>(null)
  useDialog(true, onClose, dialogRef)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="kanban-col-modal-title" className="ui-card w-full max-w-sm shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 id="kanban-col-modal-title" className="text-lg font-semibold text-fg">{t(initial !== undefined ? 'renameColumn' : 'addColumn')}</h2>
          <button type="button" onClick={onClose} aria-label={t('close')} className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-sub hover:bg-soft"><X size={20} /></button>
        </div>
        <form className="space-y-4 p-5" onSubmit={(event) => { event.preventDefault(); if (title.trim()) onSave(title.trim()) }}>
          {error && <p role="alert" className="rounded-xl bg-subtle p-3 text-sm text-body">{error}</p>}
          <label htmlFor="kanban-column-name" className="block text-sm font-medium text-body">{t('columnName')}</label>
          <input id="kanban-column-name" className={fieldClass} value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t('columnTitlePlaceholder')} required data-autofocus />
          <div className="flex gap-3">
            <button type="submit" className="ui-btn min-h-11 flex-1 px-4 py-2">{t('save')}</button>
            <button type="button" onClick={onClose} className="ui-btn-soft min-h-11 flex-1 px-4 py-2">{t('cancel')}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function CardItem({ t, card, colId, columns, disabled, onEdit, onDelete, onMove, onDragStart, onTouchDragStart }: {
  t: BoardTranslation
  card: Card
  colId: string
  columns: Column[]
  disabled: boolean
  onEdit: () => void
  onDelete: () => void
  onMove: (destination: string) => void
  onDragStart: (event: React.DragEvent, cardId: string, colId: string) => void
  onTouchDragStart: (cardId: string, colId: string) => void
}) {
  const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clearTouchTimer = () => { if (touchTimerRef.current) clearTimeout(touchTimerRef.current) }
  useEffect(() => () => { if (touchTimerRef.current) clearTimeout(touchTimerRef.current) }, [])
  const isOverdue = !!card.dueDate && new Date(`${card.dueDate}T00:00:00`) < new Date(new Date().toDateString())
  return (
    <article draggable={!disabled} onDragStart={(event) => onDragStart(event, card.id, colId)}
      className="rounded-xl border border-line bg-surface p-3" data-card-id={card.id}>
      <p className="break-words text-base font-medium leading-snug text-fg">{card.title}</p>
      {card.description && <p className="mt-2 line-clamp-3 break-words text-sm text-sub">{card.description}</p>}
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded-lg bg-soft px-2 py-1 text-body">{t(PRIORITY_KEYS[card.priority])}</span>
        <span className="rounded-lg bg-soft px-2 py-1 text-sub">{t(`colors.${card.color}`)}</span>
      </div>
      {card.assignee && <p className="mt-2 break-words text-sm text-body">{t('assignedTo', { name: card.assignee })}</p>}
      {card.dueDate && <p className={`mt-1 text-sm ${isOverdue ? 'font-medium text-primary' : 'text-sub'}`}>{t(isOverdue ? 'overdueDate' : 'scheduledDate', { date: card.dueDate })}</p>}
      {card.meetingSource && <p className="mt-2 break-words text-xs text-muted">{t('fromMeeting', { title: card.meetingSource.meetingTitle })}</p>}
      <div className="mt-3 flex items-center gap-1">
        <button type="button" disabled={disabled} onClick={onEdit} className="ui-btn-soft min-h-11 flex-1 px-3 py-2 text-sm">{t('editCard')}</button>
        <button type="button" disabled={disabled} onClick={onDelete} aria-label={t('deleteNamedCard', { title: card.title })} className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-sub hover:bg-soft disabled:opacity-50"><Trash2 size={17} /></button>
        <button type="button" disabled={disabled} aria-label={t('dragNamedCard', { title: card.title })}
          onTouchStart={() => { clearTouchTimer(); touchTimerRef.current = setTimeout(() => onTouchDragStart(card.id, colId), 300) }}
          onTouchEnd={clearTouchTimer} onTouchCancel={clearTouchTimer}
          className="flex min-h-11 min-w-11 cursor-grab touch-none items-center justify-center rounded-xl text-muted hover:bg-soft disabled:opacity-50"><GripVertical size={18} /></button>
      </div>
      <label className="mt-3 block text-xs text-sub" htmlFor={`kanban-move-${card.id}`}>{t('moveColumn')}</label>
      <select id={`kanban-move-${card.id}`} aria-label={t('moveNamedCard', { title: card.title })} value={colId} disabled={disabled}
        className={`${fieldClass} mt-1`} onChange={(event) => onMove(event.target.value)}>
        {columns.map((column) => <option key={column.id} value={column.id}>{column.title}</option>)}
      </select>
    </article>
  )
}

export default function KanbanBoard() {
  const t = useTranslations('kanbanBoard')
  const hydrated = useHydrated()
  const searchParams = useSearchParams()
  const fromMeeting = hydrated && searchParams.get('from') === 'meeting'
  const [columns, setColumns] = useState<Column[]>([])
  const columnsRef = useRef<Column[]>([])
  const expectedRaw = useRef<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [storageIssue, setStorageIssue] = useState<StorageIssue>(null)
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all')
  const [cardModal, setCardModal] = useState<{ colId: string; card?: Card } | null>(null)
  const [colModal, setColModal] = useState<{ colId?: string } | null>(null)
  const [handoff, setHandoff] = useState<MeetingKanbanHandoff | null>(null)
  const [invalidHandoff, setInvalidHandoff] = useState(false)
  const [importError, setImportError] = useState('')
  const dragRef = useRef<{ cardId: string; srcColId: string } | null>(null)
  const [dragOverColId, setDragOverColId] = useState<string | null>(null)
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null)
  const [touchDrag, setTouchDrag] = useState<{ cardId: string; srcColId: string } | null>(null)
  const touchGhostRef = useRef<HTMLDivElement | null>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  const importRef = useRef<HTMLInputElement>(null)
  // useTranslations returns a fresh function. Keep restoration independent of render-time identity.
  const translationRef = useRef(t)
  useEffect(() => { translationRef.current = t }, [t])

  const restoreBoard = useCallback(() => {
    try {
      const raw = localStorage.getItem(KANBAN_STORAGE_KEY)
      expectedRaw.current = raw
      const state = parseKanbanState(raw)
      if (raw !== null && !state) {
        setStorageIssue('invalidBoard')
        setLoaded(true)
        return
      }
      const nextColumns = state?.columns ?? makeSampleBoard(translationRef.current)
      columnsRef.current = nextColumns
      setColumns(nextColumns)
      setStorageIssue(null)
      setLoaded(true)
    } catch {
      setStorageIssue('unavailable')
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    let active = true
    queueMicrotask(() => { if (active) restoreBoard() })
    const onStorage = (event: StorageEvent) => {
      if ((event.key === KANBAN_STORAGE_KEY || event.key === null) && event.storageArea === localStorage && event.newValue !== expectedRaw.current) setStorageIssue('conflict')
    }
    window.addEventListener('storage', onStorage)
    return () => { active = false; window.removeEventListener('storage', onStorage) }
  }, [hydrated, restoreBoard])

  useEffect(() => {
    if (!fromMeeting) return
    let active = true
    queueMicrotask(() => {
      if (!active) return
      try {
        const payload = parseMeetingKanbanHandoff(sessionStorage.getItem(MEETING_KANBAN_KEY))
        setHandoff(payload)
        setInvalidHandoff(!payload)
      } catch {
        setInvalidHandoff(true)
      }
    })
    return () => { active = false }
  }, [fromMeeting])

  const canEdit = loaded && (!storageIssue || storageIssue === 'saveFailed')
  const issueText = storageIssue ? t(`storage.${storageIssue}`) : null

  const saveColumns = useCallback((nextColumns: Column[]) => {
    if (!canEdit) return false
    try {
      expectedRaw.current = persistKanbanState(localStorage, { version: 1, columns: nextColumns }, expectedRaw.current)
      columnsRef.current = nextColumns
      setColumns(nextColumns)
      setStorageIssue(null)
      setNotice('')
      return true
    } catch (error) {
      const code = error instanceof Error ? error.message : ''
      setStorageIssue(code === 'conflict' ? 'conflict' : code === 'invalidBoard' ? 'invalidBoard' : 'saveFailed')
      return false
    }
  }, [canEdit])

  const closeMeetingImport = useCallback(() => {
    try { sessionStorage.removeItem(MEETING_KANBAN_KEY) } catch { setNotice(translationRef.current('handoffCleanupFailed')) }
    const url = new URL(window.location.href)
    url.searchParams.delete('from')
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
    setHandoff(null)
    setInvalidHandoff(false)
    setImportError('')
  }, [])

  const importMeeting = (target: MeetingImportTarget) => {
    if (!handoff) return
    try {
      const result = importMeetingTasks({ version: 1, columns: columnsRef.current }, handoff, target)
      if (!saveColumns(result.state.columns)) return
      setNotice(t('meetingImported', { added: result.added, skipped: result.skipped }))
      closeMeetingImport()
    } catch (error) {
      const code = error instanceof Error ? error.message : ''
      setImportError(t(code === 'invalidTarget' ? 'meetingTargetError' : 'meetingPayloadError'))
    }
  }

  const saveCard = (data: CardInput) => {
    if (!cardModal) return
    const { colId, card } = cardModal
    const newCard: Card = card ? { ...card, ...data } : { ...data, id: genId(), createdAt: Date.now() }
    if (saveColumns(columnsRef.current.map((column) => column.id === colId
      ? { ...column, cards: card ? column.cards.map((item) => item.id === card.id ? newCard : item) : [...column.cards, newCard] }
      : column))) setCardModal(null)
  }

  const saveColumn = (title: string) => {
    if (!colModal) return
    const next = colModal.colId
      ? columnsRef.current.map((column) => column.id === colModal.colId ? { ...column, title } : column)
      : [...columnsRef.current, { id: genId(), title, cards: [] }]
    if (saveColumns(next)) setColModal(null)
  }

  const moveCard = useCallback((cardId: string, srcColId: string, destColId: string, beforeCardId?: string) => {
    const current = columnsRef.current
    const card = current.find((column) => column.id === srcColId)?.cards.find((item) => item.id === cardId)
    if (!card || !current.some((column) => column.id === destColId) || beforeCardId === cardId) return
    const next = current.map((column) => {
      if (column.id !== srcColId && column.id !== destColId) return column
      const cards = column.cards.filter((item) => item.id !== cardId)
      if (column.id === destColId) {
        const index = beforeCardId ? cards.findIndex((item) => item.id === beforeCardId) : -1
        cards.splice(index < 0 ? cards.length : index, 0, card)
      }
      return { ...column, cards }
    })
    saveColumns(next)
  }, [saveColumns])

  const handleDragEnd = () => { dragRef.current = null; setDragOverColId(null); setDragOverCardId(null) }
  const handleDragStart = (event: React.DragEvent, cardId: string, srcColId: string) => {
    dragRef.current = { cardId, srcColId }
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', cardId)
  }
  const handleDragOver = (event: React.DragEvent, colId: string, cardId?: string) => {
    if (!canEdit) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDragOverColId(colId)
    setDragOverCardId(cardId ?? null)
  }
  const handleDrop = (event: React.DragEvent, destination: string, beforeCardId?: string) => {
    event.preventDefault()
    const drag = dragRef.current
    if (drag) moveCard(drag.cardId, drag.srcColId, destination, beforeCardId)
    handleDragEnd()
  }
  const handleBoardTouchMove = (event: React.TouchEvent) => {
    if (!touchDrag) return
    const touch = event.touches[0]
    if (!touch) return
    if (touchGhostRef.current) {
      touchGhostRef.current.style.left = `${touch.clientX - 36}px`
      touchGhostRef.current.style.top = `${touch.clientY - 20}px`
    }
    const target = Array.from(boardRef.current?.querySelectorAll<HTMLElement>('[data-col-id]') ?? []).find((element) => {
      const rect = element.getBoundingClientRect()
      return touch.clientX >= rect.left && touch.clientX <= rect.right && touch.clientY >= rect.top && touch.clientY <= rect.bottom
    })
    setDragOverColId(target?.dataset.colId ?? null)
  }
  const handleBoardTouchEnd = () => {
    if (touchDrag && dragOverColId) moveCard(touchDrag.cardId, touchDrag.srcColId, dragOverColId)
    setTouchDrag(null)
    setDragOverColId(null)
  }

  const downloadJson = (raw: string, filename: string) => {
    const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(url)
  }
  const exportBoard = () => downloadJson(JSON.stringify({ version: 1, columns } satisfies KanbanState, null, 2), `kanban-board-${new Date().toISOString().slice(0, 10)}.json`)
  const importBoard = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    // The parser accepts at most 10 million UTF-16 characters; valid UTF-8 JSON
    // needs at most three bytes per character. Reject larger files before reading.
    if (file.size > 30_000_000) { setNotice(t('importTooLarge')); return }
    try {
      const state = parseKanbanState(await file.text())
      if (!state) { setNotice(t('importError')); return }
      if (!window.confirm(t('confirmImportReplace'))) return
      if (saveColumns(state.columns)) setNotice(t('jsonImported'))
    } catch { setNotice(t('importError')) }
  }

  const query = search.toLowerCase().trim()
  const filteredColumns = columns.map((column) => ({ ...column, cards: column.cards.filter((card) =>
    (!query || [card.title, card.description, card.assignee ?? ''].some((value) => value.toLowerCase().includes(query))) &&
    (filterPriority === 'all' || card.priority === filterPriority),
  ) }))
  const totalCards = columns.reduce((sum, column) => sum + column.cards.length, 0)

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold text-fg">{t('title')}</h1><p className="mt-1 text-sm text-sub">{t('subtitle', { count: totalCards, cols: columns.length })}</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={exportBoard} disabled={!loaded || storageIssue === 'invalidBoard' || storageIssue === 'unavailable'} className="ui-btn-soft flex min-h-11 items-center gap-2 px-3 py-2 text-sm"><Download size={16} />{t('export')}</button>
          <button type="button" onClick={() => importRef.current?.click()} disabled={!canEdit} className="ui-btn-soft flex min-h-11 items-center gap-2 px-3 py-2 text-sm"><Upload size={16} />{t('import')}</button>
          <input ref={importRef} type="file" accept=".json,application/json" className="hidden" onChange={importBoard} />
          <button type="button" onClick={() => setColModal({})} disabled={!canEdit} className="ui-btn flex min-h-11 items-center gap-2 px-3 py-2 text-sm"><Plus size={16} />{t('addColumn')}</button>
        </div>
      </div>

      {issueText && <div role="alert" className="space-y-3 rounded-2xl border border-line bg-subtle p-4 text-sm text-body">
        <p>{issueText}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="ui-btn-soft min-h-11 px-3 py-2" onClick={() => { restoreBoard(); setImportError(''); setNotice('') }}>{t('storage.reload')}</button>
          {storageIssue === 'invalidBoard' && <button type="button" className="ui-btn-soft min-h-11 px-3 py-2" onClick={() => {
            if (expectedRaw.current !== null) downloadJson(expectedRaw.current, 'kanban-board-original.json')
          }}>{t('storage.backup')}</button>}
        </div>
      </div>}
      {notice && <p role="status" className="rounded-2xl bg-subtle p-4 text-sm text-body">{notice}</p>}

      {(handoff || invalidHandoff) && <KanbanMeetingImportPanel payload={handoff} columns={columns} disabled={!canEdit} error={importError || issueText || ''} onImport={importMeeting} onClose={closeMeetingImport} />}

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="flex-1"><span className="sr-only">{t('searchPlaceholder')}</span><input type="search" className={fieldClass} placeholder={t('searchPlaceholder')} value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        <label><span className="sr-only">{t('priority')}</span><select className={fieldClass} value={filterPriority} onChange={(event) => setFilterPriority(event.target.value as Priority | 'all')}>
          <option value="all">{t('allPriorities')}</option>{(['high', 'medium', 'low'] as const).map((value) => <option key={value} value={value}>{t(PRIORITY_KEYS[value])}</option>)}
        </select></label>
      </div>

      {!loaded && <p className="text-sm text-muted">{t('loadingBoard')}</p>}
      {loaded && columns.length === 0 && !storageIssue && <p className="rounded-2xl bg-subtle p-5 text-sm text-sub">{t('emptyBoard')}</p>}

      <div ref={boardRef} className="grid min-w-0 grid-cols-1 items-start gap-4 md:flex md:flex-wrap" onTouchMove={handleBoardTouchMove} onTouchEnd={handleBoardTouchEnd} onTouchCancel={() => { setTouchDrag(null); setDragOverColId(null) }}>
        {filteredColumns.map((column) => <section key={column.id} data-col-id={column.id} aria-label={column.title}
          className={`min-w-0 rounded-2xl bg-subtle md:w-72 md:shrink-0 ${dragOverColId === column.id ? 'ring-2 ring-primary' : ''}`}
          onDragOver={(event) => handleDragOver(event, column.id)} onDrop={(event) => handleDrop(event, column.id)} onDragEnd={handleDragEnd}>
          <div className="flex items-start justify-between gap-2 px-3 py-2">
            <h2 className="min-w-0 self-center break-words text-base font-semibold text-body">{column.title}<span className="ml-2 text-sm font-normal text-sub">{column.cards.length}</span></h2>
            <div className="flex shrink-0 items-center">
              <button type="button" disabled={!canEdit} onClick={() => setColModal({ colId: column.id })} aria-label={t('renameNamedColumn', { title: column.title })} className="min-h-11 rounded-xl px-2 text-sm text-sub hover:bg-soft">{t('rename')}</button>
              <button type="button" disabled={!canEdit} onClick={() => { if (window.confirm(t('confirmDeleteColumn'))) saveColumns(columnsRef.current.filter((item) => item.id !== column.id)) }} aria-label={t('deleteNamedColumn', { title: column.title })} className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-sub hover:bg-soft"><Trash2 size={16} /></button>
            </div>
          </div>
          <div className="space-y-3 px-2 pb-2">
            {column.cards.map((card) => <div key={card.id} onDragOver={(event) => { event.stopPropagation(); handleDragOver(event, column.id, card.id) }} onDrop={(event) => { event.stopPropagation(); handleDrop(event, column.id, card.id) }} className={dragOverCardId === card.id ? 'rounded-xl ring-2 ring-primary' : ''}>
              <CardItem t={t} card={card} colId={column.id} columns={columns} disabled={!canEdit}
                onEdit={() => setCardModal({ colId: column.id, card })}
                onDelete={() => saveColumns(columnsRef.current.map((item) => item.id === column.id ? { ...item, cards: item.cards.filter((currentCard) => currentCard.id !== card.id) } : item))}
                onMove={(destination) => moveCard(card.id, column.id, destination)} onDragStart={handleDragStart} onTouchDragStart={(cardId, srcColId) => setTouchDrag({ cardId, srcColId })} />
            </div>)}
            {column.cards.length === 0 && <p className="rounded-xl border border-dashed border-line-strong px-3 py-6 text-center text-sm text-muted">{t(query || filterPriority !== 'all' ? 'noMatchingCards' : 'dropHere')}</p>}
            <button type="button" disabled={!canEdit} onClick={() => setCardModal({ colId: column.id })} className="ui-btn-soft flex min-h-11 w-full items-center justify-center gap-2 px-3 py-2 text-sm"><Plus size={16} />{t('addCard')}</button>
          </div>
        </section>)}
      </div>

      <div className="ui-card p-6">
        <h2 className="mb-6 text-xl font-semibold text-fg">{t('guide.title')}</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {(['howTo', 'tips'] as const).map((section) => <div key={section}><h3 className="mb-3 text-base font-semibold text-body">{t(`guide.${section}.title`)}</h3><ul className="list-disc space-y-2 pl-5 text-sm text-sub">{(t.raw(`guide.${section}.items`) as string[]).map((item, index) => <li key={index}>{item}</li>)}</ul></div>)}
        </div>
        <div className="mt-6 rounded-xl bg-subtle p-4"><h3 className="mb-2 text-sm font-semibold text-fg">{t('guide.dragDrop.title')}</h3><p className="text-sm text-sub">{t('guide.dragDrop.desc')}</p></div>
      </div>

      {cardModal && <CardModal t={t} initial={cardModal.card} onSave={saveCard} onClose={() => setCardModal(null)} error={issueText} />}
      {colModal && <ColModal t={t} initial={colModal.colId ? columns.find((column) => column.id === colModal.colId)?.title : undefined} onSave={saveColumn} onClose={() => setColModal(null)} error={issueText} />}
      {touchDrag && <div ref={touchGhostRef} className="pointer-events-none fixed z-50 max-w-64 rounded-xl bg-primary px-3 py-2 text-sm text-white shadow-lg" style={{ left: -1000, top: -1000 }}>{columns.flatMap((column) => column.cards).find((card) => card.id === touchDrag.cardId)?.title}</div>}
    </div>
  )
}
