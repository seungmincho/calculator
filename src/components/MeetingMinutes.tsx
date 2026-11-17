'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/meetingMinutes'
import {
  Plus, Trash2, Copy, Check, Download, Printer,
  Users, Calendar, ChevronDown, ChevronUp, Save, FolderOpen,
  MapPin, User
} from 'lucide-react'
import { glassCard, glassInset, glassInput } from '@/lib/glass'
import { useHydrated } from '@/hooks/useHydrated'
import { useSearchParams } from '@/hooks/useSearchParams'
import MeetingTranscriptPanel from '@/components/MeetingTranscriptPanel'
import MeetingActionExportPanel from '@/components/MeetingActionExportPanel'
import { type MeetingData, type Attendee, type AgendaItem, type DiscussionPoint, type ActionItem, type ActionStatus, type ExportFormat, type TemplateId, formatForExport, parseMeetingData, parseMeetingSlots, appendMeetingExcerpts, meetingStorageWrite, MEETING_AUTO_KEY, MEETING_SLOTS_KEY } from '@/utils/meetingMinutes'
import { MEETING_HANDOFF_KEY, parseMeetingHandoff, type MeetingHandoff, type MeetingExcerpt } from '@/utils/meetingHandoff'
import { createMeetingKanbanHandoff, openMeetingKanbanHandoff } from '@/utils/meetingKanban'

// ── Types ──────────────────────────────────────────────────────────────────

// ── Defaults ───────────────────────────────────────────────────────────────

const newId = () => Math.random().toString(36).slice(2, 9)

type MeetingSlot = { name: string; data: MeetingData }

function hasSameActionIds(left: MeetingData, right: MeetingData): boolean {
  if (!left.actions.length || left.actions.length !== right.actions.length) return false
  const leftIds = new Set(left.actions.map(action => action.id))
  const rightIds = new Set(right.actions.map(action => action.id))
  return leftIds.size === left.actions.length && rightIds.size === right.actions.length && right.actions.every(action => leftIds.has(action.id))
}

function withKanbanIdentity(meeting: MeetingData, knownMeetings: MeetingData[]): MeetingData {
  if (meeting.kanbanSourceId) return meeting
  const known = knownMeetings.find(candidate => candidate.kanbanSourceId && hasSameActionIds(meeting, candidate))
  return { ...meeting, kanbanSourceId: known?.kanbanSourceId ?? crypto.randomUUID() }
}

/** Old snapshots share identity only through identical nonempty action-ID sets. */
function backfillKanbanSlotIds(slots: MeetingSlot[], meeting: MeetingData): MeetingSlot[] {
  if (!meeting.kanbanSourceId) return slots
  let changed = false
  const next = slots.map(slot => {
    if (slot.data.kanbanSourceId || !hasSameActionIds(slot.data, meeting)) return slot
    changed = true
    return { ...slot, data: { ...slot.data, kanbanSourceId: meeting.kanbanSourceId } }
  })
  return changed ? next : slots
}

const emptyData = (): MeetingData => ({
  title: '',
  date: '',
  time: '10:00',
  location: '',
  locationType: 'offline',
  organizer: '',
  attendees: [],
  agenda: [],
  discussions: [],
  actions: [],
  decisions: '',
  nextMeeting: '',
  notes: '',
})

const TEMPLATES: Record<TemplateId, Partial<MeetingData>> = {
  weekly: {
    title: '주간 정기 회의',
    agenda: [
      { id: newId(), title: '지난 주 업무 현황 보고', notes: '', duration: '15' },
      { id: newId(), title: '이슈 및 장애물 공유', notes: '', duration: '10' },
      { id: newId(), title: '이번 주 업무 계획', notes: '', duration: '15' },
      { id: newId(), title: '기타 사항', notes: '', duration: '5' },
    ],
  },
  kickoff: {
    title: '프로젝트 킥오프 회의',
    agenda: [
      { id: newId(), title: '프로젝트 개요 및 목표', notes: '', duration: '20' },
      { id: newId(), title: '팀 구성 및 역할 분담', notes: '', duration: '15' },
      { id: newId(), title: '일정 및 마일스톤', notes: '', duration: '20' },
      { id: newId(), title: '리스크 및 이슈 사전 논의', notes: '', duration: '15' },
      { id: newId(), title: '커뮤니케이션 채널 및 회의 주기', notes: '', duration: '10' },
    ],
  },
  brainstorming: {
    title: '브레인스토밍 세션',
    agenda: [
      { id: newId(), title: '주제 소개 및 배경 설명', notes: '', duration: '10' },
      { id: newId(), title: '아이디어 자유 발산 (타임박스)', notes: '', duration: '20' },
      { id: newId(), title: '아이디어 분류 및 그룹화', notes: '', duration: '15' },
      { id: newId(), title: '우선순위 투표', notes: '', duration: '10' },
      { id: newId(), title: '실행 아이디어 선정', notes: '', duration: '10' },
    ],
  },
  retrospective: {
    title: '스프린트 회고 (Retrospective)',
    agenda: [
      { id: newId(), title: 'Keep – 잘 된 점', notes: '', duration: '15' },
      { id: newId(), title: 'Problem – 문제점', notes: '', duration: '15' },
      { id: newId(), title: 'Try – 개선 시도할 점', notes: '', duration: '15' },
      { id: newId(), title: '액션 아이템 도출', notes: '', duration: '15' },
    ],
  },
  client: {
    title: '고객사 미팅',
    agenda: [
      { id: newId(), title: '인사 및 아젠다 소개', notes: '', duration: '5' },
      { id: newId(), title: '진행 현황 업데이트', notes: '', duration: '20' },
      { id: newId(), title: '고객 피드백 수렴', notes: '', duration: '15' },
      { id: newId(), title: '다음 단계 협의', notes: '', duration: '15' },
      { id: newId(), title: 'Q&A', notes: '', duration: '10' },
    ],
  },
}



// ── Helpers ────────────────────────────────────────────────────────────────

// ── Sub-components ─────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <h2 className="text-lg font-semibold text-body">{title}</h2>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function MeetingMinutes() {
  const t = useTranslations('meetingMinutes')
  const hydrated = useHydrated(), searchParams = useSearchParams()
  const [data, setData] = useState<MeetingData>(emptyData)
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [saveSlots, setSaveSlots] = useState<MeetingSlot[]>([])
  const [showSaveSlots, setShowSaveSlots] = useState(false)
  const [slotName, setSlotName] = useState('')
  const printRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const [savedRaw, setSavedRaw] = useState<string | null>(null)
  const [slotsRaw, setSlotsRaw] = useState<string | null>(null)
  const [storageError, setStorageError] = useState('')
  const [draftBlocked, setDraftBlocked] = useState(false)
  const [slotsBlocked, setSlotsBlocked] = useState(false)
  const [source, setSource] = useState<MeetingHandoff | null>(null)
  const [importNotice, setImportNotice] = useState('')
  const [slotNotice, setSlotNotice] = useState('')
  const [meetingRevision, setMeetingRevision] = useState(0)
  if (hydrated && !ready) {
    let loaded: MeetingData | null = null
    try {
      const raw = localStorage.getItem(MEETING_AUTO_KEY)
      loaded = parseMeetingData(raw)
      const now = new Date(), date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      setData(loaded ?? { ...emptyData(), date }); setSavedRaw(raw)
    } catch { setDraftBlocked(true); setStorageError('storage.unreadable') }
    try { const raw = localStorage.getItem(MEETING_SLOTS_KEY); setSaveSlots(parseMeetingSlots(raw)); setSlotsRaw(raw) }
    catch { setSlotsBlocked(true); setStorageError('storage.unreadable') }
    if (searchParams.get('from') === 'voice') {
      try {
        const incoming = parseMeetingHandoff(sessionStorage.getItem(MEETING_HANDOFF_KEY))
        if (incoming && !loaded?.importedSources?.includes(incoming.id)) setSource(incoming)
        else setImportNotice(incoming ? 'import.alreadyImported' : 'import.unavailable')
      } catch { setImportNotice('import.unavailable') }
    }
    setReady(true)
  }

  const persistDraft = useCallback((next: MeetingData) => {
    if (!ready || draftBlocked) return false
    try {
      const raw = JSON.stringify(next); parseMeetingData(raw)
      meetingStorageWrite(localStorage, MEETING_AUTO_KEY, raw, savedRaw)
      setSavedRaw(raw); setStorageError(''); return true
    } catch (error) {
      const conflict = error instanceof Error && error.message === 'conflict'
      setStorageError(conflict ? 'storage.conflict' : 'storage.failed')
      if (conflict) setDraftBlocked(true)
      return false
    }
  }, [ready, draftBlocked, savedRaw])

  // Auto-save
  useEffect(() => {
    if (!ready || draftBlocked || JSON.stringify(data) === savedRaw) return
    const timer = setTimeout(() => persistDraft(data), 800)
    return () => clearTimeout(timer)
  }, [data, ready, draftBlocked, savedRaw, persistDraft])

  useEffect(() => {
    if (!ready || JSON.stringify(data) === savedRaw) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [data, ready, savedRaw])

  const dismissSource = () => {
    try { sessionStorage.removeItem(MEETING_HANDOFF_KEY) } catch { /* The draft source ID also prevents a second import. */ }
    const url = new URL(window.location.href)
    url.searchParams.delete('from')
    window.history.replaceState(window.history.state, '', url)
    setSource(null)
  }
  const applyExcerpts = (entries: MeetingExcerpt[]) => {
    if (!source) return false
    try {
      const next = appendMeetingExcerpts(data, source, entries)
      if (!persistDraft(next)) return false
      setData(next); dismissSource(); setImportNotice('import.applied'); setActiveTab('edit'); return true
    } catch (error) {
      setImportNotice(error instanceof Error && error.message === 'alreadyImported' ? 'import.alreadyImported' : 'import.invalidSelection')
      return false
    }
  }

  // ── Data helpers ──────────────────────────────────────────────────────

  const update = useCallback(<K extends keyof MeetingData>(key: K, value: MeetingData[K]) => {
    setData(prev => ({ ...prev, [key]: value }))
  }, [])

  const applyTemplate = useCallback((id: TemplateId) => {
    setData(prev => ({ ...prev, ...TEMPLATES[id], agenda: (TEMPLATES[id].agenda ?? []).map(a => ({ ...a, id: newId() })) }))
  }, [])

  // ── Attendees ─────────────────────────────────────────────────────────

  const addAttendee = () => setData(prev => ({
    ...prev,
    attendees: [...prev.attendees, { id: newId(), name: '', role: '', status: 'present' }]
  }))
  const updateAttendee = (id: string, field: keyof Attendee, val: string) =>
    setData(prev => ({ ...prev, attendees: prev.attendees.map(a => a.id === id ? { ...a, [field]: val } : a) }))
  const removeAttendee = (id: string) =>
    setData(prev => ({ ...prev, attendees: prev.attendees.filter(a => a.id !== id) }))

  // ── Agenda ────────────────────────────────────────────────────────────

  const addAgenda = () => setData(prev => ({
    ...prev,
    agenda: [...prev.agenda, { id: newId(), title: '', notes: '', duration: '' }]
  }))
  const updateAgenda = (id: string, field: keyof AgendaItem, val: string) =>
    setData(prev => ({ ...prev, agenda: prev.agenda.map(a => a.id === id ? { ...a, [field]: val } : a) }))
  const removeAgenda = (id: string) =>
    setData(prev => ({ ...prev, agenda: prev.agenda.filter(a => a.id !== id) }))

  // ── Discussion ────────────────────────────────────────────────────────

  const addDiscussion = () => setData(prev => ({
    ...prev,
    discussions: [...prev.discussions, { id: newId(), speaker: '', content: '' }]
  }))
  const updateDiscussion = (id: string, field: keyof DiscussionPoint, val: string) =>
    setData(prev => ({ ...prev, discussions: prev.discussions.map(d => d.id === id ? { ...d, [field]: val } : d) }))
  const removeDiscussion = (id: string) =>
    setData(prev => ({ ...prev, discussions: prev.discussions.filter(d => d.id !== id) }))

  // ── Action items ──────────────────────────────────────────────────────

  const addAction = () => setData(prev => ({
    ...prev,
    actions: [...prev.actions, { id: newId(), task: '', assignee: '', dueDate: '', status: 'pending' }]
  }))
  const updateAction = (id: string, field: keyof ActionItem, val: string) =>
    setData(prev => ({ ...prev, actions: prev.actions.map(a => a.id === id ? { ...a, [field]: val as ActionStatus } : a) }))
  const removeAction = (id: string) =>
    setData(prev => ({ ...prev, actions: prev.actions.filter(a => a.id !== id) }))

  const reviewActions = () => {
    setActiveTab('edit')
    requestAnimationFrame(() => document.getElementById('meeting-actions')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const sendActionsToKanban = (items: ActionItem[]) => {
    const next = withKanbanIdentity(data, saveSlots.map(slot => slot.data))
    const payload = createMeetingKanbanHandoff(next.kanbanSourceId!, next.title.trim() ? next.title : t('untitled'), items)
    // Keep old named snapshots stable even after another meeting has been loaded.
    const updatedSlots = backfillKanbanSlotIds(saveSlots, next)
    if (updatedSlots !== saveSlots && !persistSlots(updatedSlots)) throw new Error('storageFailed')
    // Retain the identity already written to slots if saving this draft then fails.
    setData(next)
    if (!persistDraft(next)) throw new Error('storageFailed')
    openMeetingKanbanHandoff(payload)
  }

  // ── Export ────────────────────────────────────────────────────────────

  const copyToClipboard = useCallback(async (text: string, id: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.left = '-999999px'
        document.body.appendChild(ta)
        ta.select()
        const copied = document.execCommand('copy')
        document.body.removeChild(ta)
        if (!copied) throw new Error('copyFailed')
      }
    } catch { setStorageError('storage.copyFailed'); return }
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  const exportFile = useCallback((format: ExportFormat) => {
    const content = formatForExport(data, format, t)
    const ext = format === 'markdown' ? 'md' : format === 'html' ? 'html' : 'txt'
    const mime = format === 'html' ? 'text/html' : 'text/plain'
    const blob = new Blob([content], { type: `${mime};charset=utf-8` })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${data.title || 'meeting-minutes'}.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }, [data, t])

  const handlePrint = useCallback(() => { window.print() }, [])

  // ── Save slots ────────────────────────────────────────────────────────

  const saveSlot = () => {
    if (!slotName.trim() || !ready || slotsBlocked) return
    const next = withKanbanIdentity(data, saveSlots.map(slot => slot.data))
    const updated = backfillKanbanSlotIds([...saveSlots.filter(s => s.name !== slotName.trim()), { name: slotName.trim(), data: next }], next)
    if (persistSlots(updated)) { setData(next); setSlotName(''); setSlotNotice('storage.slotSaved') }
  }

  const loadSlot = (slot: MeetingSlot) => {
    const next = withKanbanIdentity(slot.data, [data, ...saveSlots.map(saved => saved.data)])
    const selectedSlotUpdated = slot.data.kanbanSourceId ? saveSlots : saveSlots.map(saved => saved.name === slot.name ? { ...saved, data: next } : saved)
    const updatedSlots = backfillKanbanSlotIds(selectedSlotUpdated, next)
    if (updatedSlots !== saveSlots && !persistSlots(updatedSlots)) return
    setData(next)
    setMeetingRevision(value => value + 1)
    setShowSaveSlots(false)
  }

  const deleteSlot = (name: string) => {
    const updated = saveSlots.filter(s => s.name !== name)
    if (persistSlots(updated)) setSlotNotice('storage.slotDeleted')
  }

  const persistSlots = (next: typeof saveSlots) => {
    if (!ready || slotsBlocked) return false
    try { const raw = JSON.stringify(next); parseMeetingSlots(raw); meetingStorageWrite(localStorage, MEETING_SLOTS_KEY, raw, slotsRaw); setSlotsRaw(raw); setSaveSlots(next); setStorageError(''); return true }
    catch (error) { setSlotNotice(''); setStorageError(error instanceof Error && error.message === 'conflict' ? 'storage.conflict' : 'storage.failed'); return false }
  }

  const inputClass = `${glassInput} min-w-0 px-3 py-3 text-base`
  const smallInputClass = 'ui-field min-w-0 px-3 py-3 text-base'

  const statusColors: Record<ActionStatus, string> = {
    pending: 'bg-soft text-body',
    'in-progress': 'bg-primary-soft text-primary',
    done: 'bg-subtle text-body',
  }

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 break-words print:space-y-4">
      {/* Header */}
      <div className={`${glassCard} ${glassInset} p-6 print:shadow-none`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-fg flex items-center gap-2">
              {t('title')}
            </h1>
            <p className="text-sm text-muted mt-1">{t('description')}</p>
          </div>
          {/* Tab switcher */}
          <div className="flex gap-2 print:hidden">
            <button
              onClick={() => setActiveTab('edit')} aria-pressed={activeTab === 'edit'}
              className={`min-h-11 min-w-11 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'edit' ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-track'}`}
            >
              {t('editTab')}
            </button>
            <button
              onClick={() => setActiveTab('preview')} aria-pressed={activeTab === 'preview'}
              className={`min-h-11 min-w-11 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'preview' ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-track'}`}
            >
              {t('previewTab')}
            </button>
          </div>
        </div>
      </div>

      {source && <MeetingTranscriptPanel key={source.id} source={source} onApply={applyExcerpts} onDismiss={dismissSource} blocked={draftBlocked || !ready} />}
      <div className="space-y-2 print:hidden" aria-live="polite">
        {importNotice && <p className="text-sm text-body">{t(importNotice)}</p>}
        {importNotice === 'import.applied' && activeTab === 'edit' && <a href="#meeting-actions" className="inline-flex items-center min-h-11 text-sm text-primary">{t('import.reviewActions')}</a>}
        {(storageError || draftBlocked || slotsBlocked) && <p role="alert" className="text-sm text-body">{t(storageError || 'storage.unreadable')}</p>}
        {ready && !draftBlocked && <p className="text-xs text-muted">{t(JSON.stringify(data) === savedRaw ? 'storage.saved' : 'storage.unsaved')}</p>}
        {storageError && !draftBlocked && <button type="button" onClick={() => persistDraft(data)} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('storage.retry')}</button>}
      </div>

      {/* Toolbar */}
      <div className={`${glassCard} ${glassInset} p-4 print:hidden`}>
        <div className="flex flex-wrap gap-2 items-center">
          {/* Templates */}
          <span className="text-sm text-muted font-medium">{t('template')}:</span>
          {(['weekly', 'kickoff', 'brainstorming', 'retrospective', 'client'] as TemplateId[]).map(id => (
            <button
              key={id}
              onClick={() => applyTemplate(id)}
              className="min-h-11 min-w-11 px-3 py-1.5 text-xs bg-subtle text-sub rounded-md hover:bg-primary-soft transition-colors border border-line"
            >
              {t(`templates.${id}`)}
            </button>
          ))}

          <div className="flex-1" />

          {/* Export */}
          <button onClick={() => copyToClipboard(formatForExport(data, 'text', t), 'copy-text')} className="min-h-11 min-w-11 flex items-center gap-1.5 px-3 py-1.5 text-sm bg-soft text-body rounded-md hover:bg-track transition-colors">
            {copiedId === 'copy-text' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {t('copyText')}
          </button>
          <button onClick={() => exportFile('markdown')} className="min-h-11 min-w-11 flex items-center gap-1.5 px-3 py-1.5 text-sm bg-soft text-body rounded-md hover:bg-track transition-colors">
            <Download className="w-4 h-4" /> MD
          </button>
          <button onClick={() => exportFile('html')} className="min-h-11 min-w-11 flex items-center gap-1.5 px-3 py-1.5 text-sm bg-soft text-body rounded-md hover:bg-track transition-colors">
            <Download className="w-4 h-4" /> HTML
          </button>
          <button onClick={handlePrint} className="min-h-11 min-w-11 flex items-center gap-1.5 px-3 py-1.5 text-sm bg-soft text-body rounded-md hover:bg-track transition-colors">
            <Printer className="w-4 h-4" /> {t('print')}
          </button>

          {/* Save slots */}
          <button onClick={() => setShowSaveSlots(v => !v)} className="min-h-11 min-w-11 flex items-center gap-1.5 px-3 py-1.5 text-sm bg-soft text-sub rounded-md hover:bg-primary-soft transition-colors">
            <Save className="w-4 h-4" />
            {t('saveSlots')}
            {showSaveSlots ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Save slot panel */}
        {showSaveSlots && (
          <div className="mt-3 p-3 border border-line rounded-lg bg-subtle space-y-2">
            <div className="flex gap-2">
              <input
                className={`${smallInputClass} flex-1`}
                aria-label={t('slotNamePlaceholder')} maxLength={80}
                placeholder={t('slotNamePlaceholder')}
                value={slotName}
                onChange={e => setSlotName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveSlot()}
              />
              <button onClick={saveSlot} disabled={!ready || slotsBlocked || !slotName.trim()} className="min-h-11 min-w-11 px-3 py-1.5 bg-primary text-white rounded-md text-sm hover:bg-primary-hover transition-colors">
                {t('saveBtn')}
              </button>
            </div>
            {slotNotice && <p role="status" className="text-sm text-sub">{t(slotNotice)}</p>}
            {saveSlots.length > 0 && (
              <div className="space-y-1">
                {saveSlots.map(slot => (
                  <div key={slot.name} className="flex flex-wrap gap-2 items-center justify-between bg-surface rounded-md px-3 py-2">
                    <span className="text-sm text-body">{slot.name}</span>
                    <div className="flex gap-2">
                      <button onClick={() => loadSlot(slot)} className="min-h-11 min-w-11 text-xs text-primary hover:underline flex items-center gap-1">
                        <FolderOpen className="w-3 h-3" /> {t('load')}
                      </button>
                      <button onClick={() => deleteSlot(slot.name)} className="min-h-11 min-w-11 text-xs text-red-500 hover:underline flex items-center gap-1">
                        <Trash2 className="w-3 h-3" /> {t('delete')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <MeetingActionExportPanel key={meetingRevision} actions={data.actions} meetingTitle={data.title} ready={ready} blocked={draftBlocked} onSend={sendActionsToKanban} onReviewActions={reviewActions} onAddAction={() => { addAction(); reviewActions() }} />

      {activeTab === 'edit' ? (
        <>
          {/* Meeting Info */}
          <div className={`${glassCard} ${glassInset} p-6`}>
            <SectionHeader title={t('meetingInfo')} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-body mb-1">{t('meetingTitle')}</label>
                <input aria-label={t('meetingTitle')} className={inputClass} value={data.title} onChange={e => update('title', e.target.value)} placeholder={t('meetingTitlePlaceholder')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-body mb-1">{t('date')}</label>
                <input type="date" className={inputClass} value={data.date} onChange={e => update('date', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-body mb-1">{t('time')}</label>
                <input type="time" className={inputClass} value={data.time} onChange={e => update('time', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-body mb-1">{t('location')}</label>
                <input className={inputClass} value={data.location} onChange={e => update('location', e.target.value)} placeholder={t('locationPlaceholder')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-body mb-1">{t('locationType')}</label>
                <select className={inputClass} value={data.locationType} onChange={e => update('locationType', e.target.value as 'online' | 'offline')}>
                  <option value="offline">{t('offline')}</option>
                  <option value="online">{t('online')}</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-body mb-1">{t('organizer')}</label>
                <input className={inputClass} value={data.organizer} onChange={e => update('organizer', e.target.value)} placeholder={t('organizerPlaceholder')} />
              </div>
            </div>
          </div>

          {/* Attendees */}
          <div className={`${glassCard} ${glassInset} p-6`}>
            <SectionHeader title={t('attendees')} />
            <div className="space-y-2 mb-3">
              {data.attendees.map((a, idx) => (
                <div key={a.id} className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs text-muted w-5 text-right">{idx + 1}.</span>
                  <input className={`${smallInputClass} flex-1 min-w-24`} placeholder={t('attendeeName')} value={a.name} onChange={e => updateAttendee(a.id, 'name', e.target.value)} />
                  <input className={`${smallInputClass} flex-1 min-w-24`} placeholder={t('attendeeRole')} value={a.role} onChange={e => updateAttendee(a.id, 'role', e.target.value)} />
                  <select className={`${smallInputClass} min-w-20`} value={a.status} onChange={e => updateAttendee(a.id, 'status', e.target.value)}>
                    <option value="present">{t('present')}</option>
                    <option value="absent">{t('absent')}</option>
                    <option value="remote">{t('remote')}</option>
                  </select>
                  <button onClick={() => removeAttendee(a.id)} className="min-h-11 min-w-11 text-red-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
            <button onClick={addAttendee} className="min-h-11 min-w-11 flex items-center gap-1.5 px-3 py-2 text-sm bg-subtle text-sub rounded-lg hover:bg-primary-soft transition-colors">
              <Plus className="w-4 h-4" /> {t('addAttendee')}
            </button>
          </div>

          {/* Agenda */}
          <div className={`${glassCard} ${glassInset} p-6`}>
            <SectionHeader title={t('agenda')} />
            <div className="space-y-3 mb-3">
              {data.agenda.map((a, idx) => (
                <div key={a.id} className="border border-line rounded-lg p-3 space-y-2">
                  <div className="flex gap-2 items-start">
                    <span className="text-sm font-semibold text-primary mt-2 w-5 shrink-0">{idx + 1}.</span>
                    <input className={`${smallInputClass} flex-1`} placeholder={t('agendaTitle')} value={a.title} onChange={e => updateAgenda(a.id, 'title', e.target.value)} />
                    <input className={`${smallInputClass} w-16`} placeholder={t('minutes')} type="number" min="0" value={a.duration} onChange={e => updateAgenda(a.id, 'duration', e.target.value)} />
                    <button onClick={() => removeAgenda(a.id)} className="min-h-11 min-w-11 text-red-400 hover:text-red-600 p-1 mt-0.5"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <textarea className={`${inputClass} resize-none`} rows={2} placeholder={t('agendaNotes')} value={a.notes} onChange={e => updateAgenda(a.id, 'notes', e.target.value)} />
                </div>
              ))}
            </div>
            <button onClick={addAgenda} className="min-h-11 min-w-11 flex items-center gap-1.5 px-3 py-2 text-sm bg-subtle text-sub rounded-lg hover:bg-primary-soft transition-colors">
              <Plus className="w-4 h-4" /> {t('addAgenda')}
            </button>
          </div>

          {/* Discussion */}
          <div className={`${glassCard} ${glassInset} p-6`}>
            <SectionHeader title={t('discussion')} />
            <div className="space-y-2 mb-3">
              {data.discussions.map((d, idx) => (
                <div key={d.id} className="flex flex-wrap gap-2 items-start">
                  <span className="text-xs text-muted w-5 text-right mt-2">{idx + 1}.</span>
                  <input className={`${smallInputClass} w-28 shrink-0`} placeholder={t('speaker')} value={d.speaker} onChange={e => updateDiscussion(d.id, 'speaker', e.target.value)} />
                  <textarea className={`${smallInputClass} flex-1 min-w-40 resize-none`} rows={2} placeholder={t('discussionContent')} value={d.content} onChange={e => updateDiscussion(d.id, 'content', e.target.value)} />
                  <button onClick={() => removeDiscussion(d.id)} className="min-h-11 min-w-11 text-red-400 hover:text-red-600 p-1 mt-1"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
            <button onClick={addDiscussion} className="min-h-11 min-w-11 flex items-center gap-1.5 px-3 py-2 text-sm bg-subtle text-sub rounded-lg hover:bg-primary-soft transition-colors">
              <Plus className="w-4 h-4" /> {t('addDiscussion')}
            </button>
          </div>

          {/* Decisions */}
          <div className={`${glassCard} ${glassInset} p-6`}>
            <SectionHeader title={t('decisions')} />
            <textarea className={`${inputClass} resize-none`} rows={4} placeholder={t('decisionsPlaceholder')} value={data.decisions} onChange={e => update('decisions', e.target.value)} />
          </div>

          {/* Action Items */}
          <div id="meeting-actions" className={`scroll-mt-20 ${glassCard} ${glassInset} p-6`}>
            <SectionHeader title={t('actionItems')} />
            <div className="space-y-2 mb-3">
              {data.actions.map((a, idx) => (
                <div key={a.id} className="flex flex-wrap gap-2 items-center border border-line rounded-lg p-2">
                  <span className="text-xs text-muted w-5 text-right">{idx + 1}.</span>
                  <input aria-label={t('actionTask')} className={`${smallInputClass} flex-1 min-w-40`} placeholder={t('actionTask')} value={a.task} onChange={e => updateAction(a.id, 'task', e.target.value)} />
                  <input aria-label={t('assignee')} className={`${smallInputClass} w-24`} placeholder={t('assignee')} value={a.assignee} onChange={e => updateAction(a.id, 'assignee', e.target.value)} />
                  <input aria-label={t('dueDate')} type="date" className={`${smallInputClass} w-36`} value={a.dueDate} onChange={e => updateAction(a.id, 'dueDate', e.target.value)} />
                  <select aria-label={t('status')} className={`${smallInputClass} w-24 ${statusColors[a.status]}`} value={a.status} onChange={e => updateAction(a.id, 'status', e.target.value)}>
                    <option value="pending">{t('pending')}</option>
                    <option value="in-progress">{t('inProgress')}</option>
                    <option value="done">{t('done')}</option>
                  </select>
                  <button onClick={() => removeAction(a.id)} className="min-h-11 min-w-11 text-red-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
            <button onClick={addAction} className="min-h-11 min-w-11 flex items-center gap-1.5 px-3 py-2 text-sm bg-subtle text-sub rounded-lg hover:bg-primary-soft transition-colors">
              <Plus className="w-4 h-4" /> {t('addAction')}
            </button>
          </div>

          {/* Next meeting + extra notes */}
          <div className={`${glassCard} ${glassInset} p-6`}>
            <SectionHeader title={t('nextMeeting')} />
            <input className={inputClass} value={data.nextMeeting} onChange={e => update('nextMeeting', e.target.value)} placeholder={t('nextMeetingPlaceholder')} />
            <div className="mt-4">
              <label className="block text-sm font-medium text-body mb-1">{t('extraNotes')}</label>
              <textarea className={`${inputClass} resize-none`} rows={3} value={data.notes} onChange={e => update('notes', e.target.value)} placeholder={t('extraNotesPlaceholder')} />
            </div>
          </div>
        </>
      ) : (
        /* Preview pane */
        <div ref={printRef} className={`${glassCard} ${glassInset} p-8 print:shadow-none print:p-0`}>
          <div className="max-w-3xl mx-auto space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-fg border-b-2 border-primary pb-2">{data.title || t('untitled')}</h1>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-sm text-sub">
                <div className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {data.date} {data.time}</div>
                <div className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {data.location} ({data.locationType === 'online' ? t('online') : t('offline')})</div>
                <div className="flex items-center gap-1"><User className="w-4 h-4" /> {t('organizer')}: {data.organizer}</div>
                <div className="flex items-center gap-1"><Users className="w-4 h-4" /> {t('attendees')}: {t('headCount', { n: data.attendees.filter(a => a.status === 'present' || a.status === 'remote').length })}</div>
              </div>
            </div>

            {data.attendees.length > 0 && (
              <div>
                <h2 className="text-base font-semibold text-body mb-2">{t('attendees')}</h2>
                <div className="flex flex-wrap gap-2">
                  {data.attendees.map(a => (
                    <span key={a.id} className={`px-2 py-1 rounded-full text-xs ${a.status === 'absent' ? 'bg-soft text-muted line-through' : a.status === 'remote' ? 'bg-primary-soft text-primary' : 'bg-soft text-sub'}`}>
                      {a.name}{a.role ? ` · ${a.role}` : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {data.agenda.length > 0 && (
              <div>
                <h2 className="text-base font-semibold text-body mb-2">{t('agenda')}</h2>
                <ol className="space-y-2 list-decimal list-inside">
                  {data.agenda.map(a => (
                    <li key={a.id} className="text-sm text-body">
                      <span className="font-medium">{a.title}</span>
                      {a.duration ? <span className="ml-1 text-xs text-muted">{t('durationTag', { n: a.duration })}</span> : null}
                      {a.notes && <p className="ml-4 mt-1 text-muted">{a.notes}</p>}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {data.discussions.length > 0 && (
              <div>
                <h2 className="text-base font-semibold text-body mb-2">{t('discussion')}</h2>
                <ol className="space-y-1.5 list-decimal list-inside">
                  {data.discussions.map(d => (
                    <li key={d.id} className="text-sm text-body">
                      {d.speaker && <span className="font-semibold text-primary">[{d.speaker}]</span>} {d.content}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {data.decisions && (
              <div>
                <h2 className="text-base font-semibold text-body mb-2">{t('decisions')}</h2>
                <p className="text-sm text-body whitespace-pre-wrap">{data.decisions}</p>
              </div>
            )}

            {data.actions.length > 0 && (
              <div>
                <h2 className="text-base font-semibold text-body mb-2">{t('actionItems')}</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-subtle">
                        <th className="border border-line px-3 py-2 text-left text-body">#</th>
                        <th className="border border-line px-3 py-2 text-left text-body">{t('actionTask')}</th>
                        <th className="border border-line px-3 py-2 text-left text-body">{t('assignee')}</th>
                        <th className="border border-line px-3 py-2 text-left text-body">{t('dueDate')}</th>
                        <th className="border border-line px-3 py-2 text-left text-body">{t('status')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.actions.map((a, i) => (
                        <tr key={a.id} className="even:bg-subtle">
                          <td className="border border-line px-3 py-2 text-sub">{i + 1}</td>
                          <td className="border border-line px-3 py-2 text-body">{a.task}</td>
                          <td className="border border-line px-3 py-2 text-body">{a.assignee}</td>
                          <td className="border border-line px-3 py-2 text-body">{a.dueDate}</td>
                          <td className={`border border-line px-3 py-2 font-medium ${a.status === 'done' ? 'text-body' : a.status === 'in-progress' ? 'text-primary' : 'text-muted'}`}>
                            {a.status === 'done' ? t('done') : a.status === 'in-progress' ? t('inProgress') : t('pending')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {data.nextMeeting && (
              <div>
                <h2 className="text-base font-semibold text-body mb-1">{t('nextMeeting')}</h2>
                <p className="text-sm text-body">{data.nextMeeting}</p>
              </div>
            )}

            {data.notes && (
              <div>
                <h2 className="text-base font-semibold text-body mb-1">{t('extraNotes')}</h2>
                <p className="text-sm text-body whitespace-pre-wrap">{data.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Guide */}
      <div className={`${glassCard} ${glassInset} p-6 print:hidden`}>
        <h2 className="text-xl font-semibold text-fg mb-6">{t('guide.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(t.raw('guide.sections') as { title: string; items: string[] }[]).map((section, i) => (
            <div key={i} className="bg-subtle rounded-xl p-4">
              <h3 className="font-semibold text-fg mb-3">{section.title}</h3>
              <ul className="space-y-1.5">
                {section.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-sub">
                    <span className="text-blue-500 mt-0.5 shrink-0">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:p-0 { padding: 0 !important; }
          .print\\:space-y-4 > * + * { margin-top: 1rem !important; }
        }
      `}</style>
    </div>
  )
}
