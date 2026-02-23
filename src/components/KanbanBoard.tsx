'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import {
  Plus,
  Trash2,
  Edit3,
  Search,
  Filter,
  Download,
  Upload,
  X,
  ChevronDown,
  BookOpen,
  GripVertical,
  Calendar,
  Tag,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────

type Priority = 'high' | 'medium' | 'low'
type ColorLabel = 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'pink' | 'orange' | 'gray'

interface Card {
  id: string
  title: string
  description: string
  priority: Priority
  color: ColorLabel
  dueDate: string
  createdAt: number
}

interface Column {
  id: string
  title: string
  cards: Card[]
}

interface BoardState {
  columns: Column[]
  version: number
}

// ── Constants ──────────────────────────────────────────────────────────────

const COLOR_CLASSES: Record<ColorLabel, string> = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  red: 'bg-red-500',
  yellow: 'bg-yellow-400',
  purple: 'bg-purple-500',
  pink: 'bg-pink-500',
  orange: 'bg-orange-500',
  gray: 'bg-gray-400',
}

const COLOR_LABELS: ColorLabel[] = ['blue', 'green', 'red', 'yellow', 'purple', 'pink', 'orange', 'gray']

const PRIORITY_CLASSES: Record<Priority, string> = {
  high: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  low: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
}

const STORAGE_KEY = 'kanban-board-state'
const BOARD_VERSION = 1

function genId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

// ── Sample Data Factory ────────────────────────────────────────────────────

function makeSampleBoard(): Column[] {
  return [
    {
      id: 'col-todo',
      title: '할 일',
      cards: [
        {
          id: genId(),
          title: '요구사항 분석',
          description: '고객 요구사항 문서를 검토하고 핵심 기능 목록을 작성한다.',
          priority: 'high',
          color: 'red',
          dueDate: '2026-03-01',
          createdAt: Date.now(),
        },
        {
          id: genId(),
          title: 'UI 디자인 초안',
          description: '와이어프레임과 주요 화면 목업을 Figma로 작성한다.',
          priority: 'medium',
          color: 'blue',
          dueDate: '2026-03-05',
          createdAt: Date.now() + 1,
        },
        {
          id: genId(),
          title: '데이터베이스 스키마 설계',
          description: 'ERD 작성 및 테이블 관계 정의.',
          priority: 'low',
          color: 'purple',
          dueDate: '2026-03-10',
          createdAt: Date.now() + 2,
        },
      ],
    },
    {
      id: 'col-inprogress',
      title: '진행 중',
      cards: [
        {
          id: genId(),
          title: '로그인 기능 구현',
          description: 'JWT 기반 인증, 소셜 로그인(Google, Kakao) 연동.',
          priority: 'high',
          color: 'orange',
          dueDate: '2026-02-28',
          createdAt: Date.now() + 3,
        },
        {
          id: genId(),
          title: 'API 명세서 작성',
          description: 'OpenAPI 3.0 형식으로 REST 엔드포인트 문서화.',
          priority: 'medium',
          color: 'green',
          dueDate: '2026-03-03',
          createdAt: Date.now() + 4,
        },
      ],
    },
    {
      id: 'col-review',
      title: '검토',
      cards: [
        {
          id: genId(),
          title: '메인 페이지 퍼블리싱',
          description: '반응형 레이아웃 및 다크모드 적용 완료, 코드 리뷰 대기.',
          priority: 'medium',
          color: 'yellow',
          dueDate: '2026-02-25',
          createdAt: Date.now() + 5,
        },
      ],
    },
    {
      id: 'col-done',
      title: '완료',
      cards: [
        {
          id: genId(),
          title: '프로젝트 환경 세팅',
          description: 'Next.js, TypeScript, ESLint, Husky 설정 완료.',
          priority: 'low',
          color: 'gray',
          dueDate: '2026-02-20',
          createdAt: Date.now() + 6,
        },
        {
          id: genId(),
          title: '팀 킥오프 미팅',
          description: '역할 분담, 스프린트 일정, 커뮤니케이션 채널 확정.',
          priority: 'low',
          color: 'gray',
          dueDate: '2026-02-18',
          createdAt: Date.now() + 7,
        },
      ],
    },
  ]
}

// ── Modal Component ────────────────────────────────────────────────────────

interface CardModalProps {
  t: ReturnType<typeof useTranslations<'kanbanBoard'>>
  initial?: Partial<Card>
  onSave: (card: Omit<Card, 'id' | 'createdAt'>) => void
  onClose: () => void
}

function CardModal({ t, initial, onSave, onClose }: CardModalProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? 'medium')
  const [color, setColor] = useState<ColorLabel>(initial?.color ?? 'blue')
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? '')

  const inputCls =
    'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    onSave({ title: title.trim(), description: description.trim(), priority, color, dueDate })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {initial?.title ? t('editCard') : t('addCard')}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('cardTitle')}</label>
            <input
              type="text"
              className={inputCls}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('cardTitlePlaceholder')}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('cardDescription')}
            </label>
            <textarea
              className={inputCls + ' resize-none'}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('cardDescriptionPlaceholder')}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('priority')}
              </label>
              <select
                className={inputCls}
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
              >
                <option value="high">{t('priorityHigh')}</option>
                <option value="medium">{t('priorityMedium')}</option>
                <option value="low">{t('priorityLow')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('dueDate')}</label>
              <input
                type="date"
                className={inputCls}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('colorLabel')}
            </label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_LABELS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full ${COLOR_CLASSES[c]} border-2 transition-all ${
                    color === c ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent'
                  }`}
                  title={c}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-2.5 font-medium hover:from-blue-700 hover:to-indigo-700 transition-all"
            >
              {t('save')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2.5 font-medium transition-all"
            >
              {t('cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Column Header Modal ────────────────────────────────────────────────────

interface ColModalProps {
  t: ReturnType<typeof useTranslations<'kanbanBoard'>>
  initial?: string
  onSave: (title: string) => void
  onClose: () => void
}

function ColModal({ t, initial, onSave, onClose }: ColModalProps) {
  const [title, setTitle] = useState(initial ?? '')
  const inputCls =
    'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    onSave(title.trim())
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {initial ? t('renameColumn') : t('addColumn')}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <input
            type="text"
            className={inputCls}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('columnTitlePlaceholder')}
            required
            autoFocus
          />
          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-2.5 font-medium hover:from-blue-700 hover:to-indigo-700 transition-all"
            >
              {t('save')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2.5 font-medium transition-all"
            >
              {t('cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Card Component ─────────────────────────────────────────────────────────

interface CardItemProps {
  t: ReturnType<typeof useTranslations<'kanbanBoard'>>
  card: Card
  colId: string
  onEdit: (card: Card) => void
  onDelete: (cardId: string) => void
  onDragStart: (e: React.DragEvent, cardId: string, colId: string) => void
  onTouchDragStart: (cardId: string, colId: string) => void
}

function CardItem({ t, card, colId, onEdit, onDelete, onDragStart, onTouchDragStart }: CardItemProps) {
  const isOverdue = card.dueDate && new Date(card.dueDate) < new Date(new Date().toDateString())
  const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Long-press to start drag (300ms)
    touchTimerRef.current = setTimeout(() => {
      onTouchDragStart(card.id, colId)
    }, 300)
  }, [card.id, colId, onTouchDragStart])

  const handleTouchEnd = useCallback(() => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current)
      touchTimerRef.current = null
    }
  }, [])

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, card.id, colId)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className="bg-white dark:bg-gray-700 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 p-3 cursor-grab active:cursor-grabbing group hover:shadow-md transition-all touch-manipulation"
    >
      <div className="flex items-start gap-2">
        {/* Color label strip */}
        <div className={`w-1 rounded-full flex-shrink-0 self-stretch min-h-[2rem] ${COLOR_CLASSES[card.color]}`} />
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-start justify-between gap-1">
            <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug break-words">
              {card.title}
            </p>
            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <button
                onClick={() => onEdit(card)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                title={t('editCard')}
              >
                <Edit3 size={13} />
              </button>
              <button
                onClick={() => onDelete(card.id)}
                className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                title={t('deleteCard')}
              >
                <Trash2 size={13} />
              </button>
              <span className="p-1 text-gray-300 dark:text-gray-500 cursor-grab">
                <GripVertical size={13} />
              </span>
            </div>
          </div>

          {/* Description */}
          {card.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{card.description}</p>
          )}

          {/* Footer */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${PRIORITY_CLASSES[card.priority]}`}>
              {t(`priority${card.priority.charAt(0).toUpperCase() + card.priority.slice(1)}` as 'priorityHigh' | 'priorityMedium' | 'priorityLow')}
            </span>
            {card.dueDate && (
              <span
                className={`flex items-center gap-0.5 text-xs ${
                  isOverdue ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                <Calendar size={11} />
                {card.dueDate}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function KanbanBoard() {
  const t = useTranslations('kanbanBoard')

  const [columns, setColumns] = useState<Column[]>([])
  const [search, setSearch] = useState('')
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all')
  const [showFilterMenu, setShowFilterMenu] = useState(false)

  // Modal state
  const [cardModal, setCardModal] = useState<{ colId: string; card?: Card } | null>(null)
  const [colModal, setColModal] = useState<{ colId?: string } | null>(null)

  // Drag state (desktop)
  const dragRef = useRef<{ cardId: string; srcColId: string } | null>(null)
  const [dragOverColId, setDragOverColId] = useState<string | null>(null)
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null)

  // Touch drag state (mobile)
  const [touchDrag, setTouchDrag] = useState<{ cardId: string; srcColId: string } | null>(null)
  const touchGhostRef = useRef<HTMLDivElement | null>(null)
  const boardRef = useRef<HTMLDivElement>(null)

  // File import ref
  const importRef = useRef<HTMLInputElement>(null)

  // ── Persistence ──────────────────────────────────────────────────────────

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const state: BoardState = JSON.parse(raw)
        if (state.version === BOARD_VERSION && Array.isArray(state.columns)) {
          setColumns(state.columns)
          return
        }
      }
    } catch {
      // ignore
    }
    setColumns(makeSampleBoard())
  }, [])

  useEffect(() => {
    if (columns.length === 0) return
    const state: BoardState = { columns, version: BOARD_VERSION }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [columns])

  // ── Column operations ────────────────────────────────────────────────────

  const addColumn = useCallback((title: string) => {
    setColumns((prev) => [...prev, { id: genId(), title, cards: [] }])
    setColModal(null)
  }, [])

  const renameColumn = useCallback((colId: string, title: string) => {
    setColumns((prev) => prev.map((c) => (c.id === colId ? { ...c, title } : c)))
    setColModal(null)
  }, [])

  const deleteColumn = useCallback((colId: string) => {
    if (!confirm(t('confirmDeleteColumn'))) return
    setColumns((prev) => prev.filter((c) => c.id !== colId))
  }, [t])

  // ── Card operations ──────────────────────────────────────────────────────

  const addCard = useCallback((colId: string, data: Omit<Card, 'id' | 'createdAt'>) => {
    const card: Card = { id: genId(), createdAt: Date.now(), ...data }
    setColumns((prev) => prev.map((c) => (c.id === colId ? { ...c, cards: [...c.cards, card] } : c)))
    setCardModal(null)
  }, [])

  const editCard = useCallback((colId: string, cardId: string, data: Omit<Card, 'id' | 'createdAt'>) => {
    setColumns((prev) =>
      prev.map((c) =>
        c.id === colId
          ? { ...c, cards: c.cards.map((cd) => (cd.id === cardId ? { ...cd, ...data } : cd)) }
          : c
      )
    )
    setCardModal(null)
  }, [])

  const deleteCard = useCallback((colId: string, cardId: string) => {
    setColumns((prev) =>
      prev.map((c) => (c.id === colId ? { ...c, cards: c.cards.filter((cd) => cd.id !== cardId) } : c))
    )
  }, [])

  // ── Drag & Drop ──────────────────────────────────────────────────────────

  const handleDragStart = useCallback((e: React.DragEvent, cardId: string, srcColId: string) => {
    dragRef.current = { cardId, srcColId }
    e.dataTransfer.effectAllowed = 'move'
    // ghost image
    const el = e.currentTarget as HTMLElement
    e.dataTransfer.setDragImage(el, 20, 20)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, colId: string, cardId?: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverColId(colId)
    setDragOverCardId(cardId ?? null)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, destColId: string, insertBeforeCardId?: string) => {
    e.preventDefault()
    setDragOverColId(null)
    setDragOverCardId(null)
    const drag = dragRef.current
    if (!drag) return
    const { cardId, srcColId } = drag
    dragRef.current = null

    setColumns((prev) => {
      // Remove card from source
      let movedCard: Card | undefined
      const updated = prev.map((c) => {
        if (c.id !== srcColId) return c
        movedCard = c.cards.find((cd) => cd.id === cardId)
        return { ...c, cards: c.cards.filter((cd) => cd.id !== cardId) }
      })
      if (!movedCard) return prev

      // Insert into destination
      return updated.map((c) => {
        if (c.id !== destColId) return c
        if (!insertBeforeCardId) return { ...c, cards: [...c.cards, movedCard!] }
        const idx = c.cards.findIndex((cd) => cd.id === insertBeforeCardId)
        const cards = [...c.cards]
        cards.splice(idx >= 0 ? idx : cards.length, 0, movedCard!)
        return { ...c, cards }
      })
    })
  }, [])

  const handleDragEnd = useCallback(() => {
    dragRef.current = null
    setDragOverColId(null)
    setDragOverCardId(null)
  }, [])

  // ── Touch Drag & Drop (mobile) ─────────────────────────────────────────

  const handleTouchDragStart = useCallback((cardId: string, srcColId: string) => {
    setTouchDrag({ cardId, srcColId })
    // Haptic feedback if available
    if (navigator.vibrate) navigator.vibrate(30)
  }, [])

  const getColumnIdAtPoint = useCallback((x: number, y: number): string | null => {
    const board = boardRef.current
    if (!board) return null
    const colEls = board.querySelectorAll<HTMLElement>('[data-col-id]')
    for (const el of colEls) {
      const rect = el.getBoundingClientRect()
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        return el.dataset.colId ?? null
      }
    }
    return null
  }, [])

  const handleBoardTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchDrag) return
    e.preventDefault()
    const touch = e.touches[0]
    // Move ghost
    if (touchGhostRef.current) {
      touchGhostRef.current.style.left = `${touch.clientX - 36}px`
      touchGhostRef.current.style.top = `${touch.clientY - 20}px`
    }
    // Detect target column
    const colId = getColumnIdAtPoint(touch.clientX, touch.clientY)
    setDragOverColId(colId)
  }, [touchDrag, getColumnIdAtPoint])

  const handleBoardTouchEnd = useCallback(() => {
    if (!touchDrag || !dragOverColId) {
      setTouchDrag(null)
      setDragOverColId(null)
      return
    }
    const { cardId, srcColId } = touchDrag
    const destColId = dragOverColId

    setColumns((prev) => {
      let movedCard: Card | undefined
      const updated = prev.map((c) => {
        if (c.id !== srcColId) return c
        movedCard = c.cards.find((cd) => cd.id === cardId)
        return { ...c, cards: c.cards.filter((cd) => cd.id !== cardId) }
      })
      if (!movedCard) return prev
      return updated.map((c) => {
        if (c.id !== destColId) return c
        return { ...c, cards: [...c.cards, movedCard!] }
      })
    })

    setTouchDrag(null)
    setDragOverColId(null)
    if (navigator.vibrate) navigator.vibrate(20)
  }, [touchDrag, dragOverColId])

  // ── Export / Import ──────────────────────────────────────────────────────

  const exportBoard = useCallback(() => {
    const state: BoardState = { columns, version: BOARD_VERSION }
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kanban-board-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [columns])

  const importBoard = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const state: BoardState = JSON.parse(ev.target?.result as string)
        if (Array.isArray(state.columns)) setColumns(state.columns)
      } catch {
        alert(t('importError'))
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [t])

  // ── Filtered view ────────────────────────────────────────────────────────

  const filteredColumns = columns.map((col) => ({
    ...col,
    cards: col.cards.filter((card) => {
      const matchSearch =
        !search ||
        card.title.toLowerCase().includes(search.toLowerCase()) ||
        card.description.toLowerCase().includes(search.toLowerCase())
      const matchPriority = filterPriority === 'all' || card.priority === filterPriority
      return matchSearch && matchPriority
    }),
  }))

  const totalCards = columns.reduce((s, c) => s + c.cards.length, 0)

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {t('subtitle', { count: totalCards, cols: columns.length })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={exportBoard}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-all"
          >
            <Download size={15} />
            {t('export')}
          </button>
          <button
            onClick={() => importRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-all"
          >
            <Upload size={15} />
            {t('import')}
          </button>
          <input ref={importRef} type="file" accept=".json" className="hidden" onChange={importBoard} />
          <button
            onClick={() => setColModal({})}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all"
          >
            <Plus size={15} />
            {t('addColumn')}
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3 flex-col sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="relative">
          <button
            onClick={() => setShowFilterMenu((v) => !v)}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-all"
          >
            <Filter size={15} />
            {filterPriority === 'all' ? t('allPriorities') : t(`priority${filterPriority.charAt(0).toUpperCase() + filterPriority.slice(1)}` as 'priorityHigh' | 'priorityMedium' | 'priorityLow')}
            <ChevronDown size={14} />
          </button>
          {showFilterMenu && (
            <div className="absolute right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 w-36 py-1">
              {(['all', 'high', 'medium', 'low'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => { setFilterPriority(p); setShowFilterMenu(false) }}
                  className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    filterPriority === p ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {p === 'all' ? t('allPriorities') : t(`priority${p.charAt(0).toUpperCase() + p.slice(1)}` as 'priorityHigh' | 'priorityMedium' | 'priorityLow')}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Board */}
      <div
        ref={boardRef}
        className="flex gap-4 overflow-x-auto pb-4 lg:overflow-visible lg:flex-wrap"
        onTouchMove={handleBoardTouchMove}
        onTouchEnd={handleBoardTouchEnd}
        onTouchCancel={handleBoardTouchEnd}
      >
        {filteredColumns.map((col) => {
          const isDropTarget = dragOverColId === col.id
          return (
            <div
              key={col.id}
              data-col-id={col.id}
              className={`flex-shrink-0 w-72 lg:w-64 xl:w-72 flex flex-col rounded-xl transition-all ${
                isDropTarget && !dragOverCardId
                  ? 'ring-2 ring-blue-400 ring-offset-2 dark:ring-offset-gray-900'
                  : ''
              }`}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDrop={(e) => handleDrop(e, col.id)}
              onDragEnd={handleDragEnd}
            >
              {/* Column header */}
              <div className="bg-gray-100 dark:bg-gray-700 rounded-t-xl px-3 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Tag size={14} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{col.title}</span>
                  <span className="text-xs bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full px-1.5 py-0.5 flex-shrink-0">
                    {col.cards.length}
                  </span>
                </div>
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => setColModal({ colId: col.id })}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    title={t('renameColumn')}
                  >
                    <Edit3 size={13} />
                  </button>
                  <button
                    onClick={() => deleteColumn(col.id)}
                    className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                    title={t('deleteColumn')}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Cards area */}
              <div
                className={`flex-1 bg-gray-50 dark:bg-gray-800/60 rounded-b-xl p-2 space-y-2 min-h-[4rem] transition-colors ${
                  isDropTarget ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
              >
                {col.cards.map((card) => (
                  <div
                    key={card.id}
                    onDragOver={(e) => { e.stopPropagation(); handleDragOver(e, col.id, card.id) }}
                    onDrop={(e) => { e.stopPropagation(); handleDrop(e, col.id, card.id) }}
                    className={`rounded-lg transition-all ${
                      dragOverCardId === card.id ? 'ring-2 ring-blue-400 ring-offset-1 dark:ring-offset-gray-800' : ''
                    }`}
                  >
                    <CardItem
                      t={t}
                      card={card}
                      colId={col.id}
                      onEdit={(c) => setCardModal({ colId: col.id, card: c })}
                      onDelete={(cardId) => deleteCard(col.id, cardId)}
                      onDragStart={handleDragStart}
                      onTouchDragStart={handleTouchDragStart}
                    />
                  </div>
                ))}

                {/* Drop zone when column is empty */}
                {col.cards.length === 0 && (
                  <div className="flex items-center justify-center h-16 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-400 dark:text-gray-600">
                    {t('dropHere')}
                  </div>
                )}

                {/* Add card button */}
                <button
                  onClick={() => setCardModal({ colId: col.id })}
                  className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
                >
                  <Plus size={13} />
                  {t('addCard')}
                </button>
              </div>
            </div>
          )
        })}

        {/* Ghost add-column button */}
        <button
          onClick={() => setColModal({})}
          className="flex-shrink-0 w-72 lg:w-64 xl:w-72 flex items-center justify-center gap-2 h-16 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-400 dark:text-gray-500 hover:border-blue-400 hover:text-blue-500 dark:hover:text-blue-400 transition-all text-sm"
        >
          <Plus size={16} />
          {t('addColumn')}
        </button>
      </div>

      {/* Guide */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen size={20} className="text-blue-500" />
          {t('guide.title')}
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-3">
              {t('guide.howTo.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.howTo.items') as string[]).map((item, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-xs flex items-center justify-center font-bold">
                    {i + 1}
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-3">
              {t('guide.tips.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.tips.items') as string[]).map((item, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-blue-500 flex-shrink-0">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-6 bg-blue-50 dark:bg-blue-950 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">{t('guide.dragDrop.title')}</h3>
          <p className="text-sm text-blue-700 dark:text-blue-300">{t('guide.dragDrop.desc')}</p>
        </div>
      </div>

      {/* Card Modal */}
      {cardModal && (
        <CardModal
          t={t}
          initial={cardModal.card}
          onSave={(data) =>
            cardModal.card
              ? editCard(cardModal.colId, cardModal.card.id, data)
              : addCard(cardModal.colId, data)
          }
          onClose={() => setCardModal(null)}
        />
      )}

      {/* Touch drag ghost */}
      {touchDrag && (
        <div
          ref={touchGhostRef}
          className="fixed z-50 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 px-3 py-2 rounded-lg shadow-lg text-sm font-medium pointer-events-none opacity-90"
          style={{ left: -100, top: -100 }}
        >
          {columns
            .flatMap((c) => c.cards)
            .find((c) => c.id === touchDrag.cardId)?.title ?? ''}
        </div>
      )}

      {/* Column Modal */}
      {colModal !== null && (
        <ColModal
          t={t}
          initial={colModal.colId ? columns.find((c) => c.id === colModal.colId)?.title : undefined}
          onSave={(title) =>
            colModal.colId ? renameColumn(colModal.colId, title) : addColumn(title)
          }
          onClose={() => setColModal(null)}
        />
      )}
    </div>
  )
}
