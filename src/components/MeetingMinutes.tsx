'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import {
  Plus, Trash2, Copy, Check, FileText, Download, Printer,
  Users, Calendar, ChevronDown, ChevronUp, Save, FolderOpen,
  Clock, MapPin, User, MessageSquare, CheckSquare, Lightbulb
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────

type AttendeeStatus = 'present' | 'absent' | 'remote'
type ActionStatus = 'pending' | 'in-progress' | 'done'
type ExportFormat = 'text' | 'markdown' | 'html'
type TemplateId = 'weekly' | 'kickoff' | 'brainstorming' | 'retrospective' | 'client'

interface Attendee {
  id: string
  name: string
  role: string
  status: AttendeeStatus
}

interface AgendaItem {
  id: string
  title: string
  notes: string
  duration: string
}

interface DiscussionPoint {
  id: string
  speaker: string
  content: string
}

interface ActionItem {
  id: string
  task: string
  assignee: string
  dueDate: string
  status: ActionStatus
}

interface MeetingData {
  title: string
  date: string
  time: string
  location: string
  locationType: 'online' | 'offline'
  organizer: string
  attendees: Attendee[]
  agenda: AgendaItem[]
  discussions: DiscussionPoint[]
  actions: ActionItem[]
  decisions: string
  nextMeeting: string
  notes: string
}

// ── Defaults ───────────────────────────────────────────────────────────────

const newId = () => Math.random().toString(36).slice(2, 9)

const emptyData = (): MeetingData => ({
  title: '',
  date: new Date().toISOString().slice(0, 10),
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

const LS_AUTO_KEY = 'meetingMinutes_auto'
const LS_SLOTS_KEY = 'meetingMinutes_slots'

// ── Helpers ────────────────────────────────────────────────────────────────

function formatForExport(data: MeetingData, format: ExportFormat): string {
  const attendeeList = data.attendees
    .map(a => `${a.name}${a.role ? ` (${a.role})` : ''}`)
    .join(', ')

  const agendaText = data.agenda
    .map((a, i) => `${i + 1}. ${a.title}${a.duration ? ` [${a.duration}분]` : ''}${a.notes ? `\n   ${a.notes}` : ''}`)
    .join('\n')

  const discussionText = data.discussions
    .map((d, i) => `${i + 1}. ${d.speaker ? `[${d.speaker}] ` : ''}${d.content}`)
    .join('\n')

  const actionText = data.actions
    .map((a, i) => {
      const statusLabel = a.status === 'done' ? '완료' : a.status === 'in-progress' ? '진행 중' : '대기'
      return `${i + 1}. ${a.task} — 담당: ${a.assignee || '-'}, 기한: ${a.dueDate || '-'} [${statusLabel}]`
    })
    .join('\n')

  if (format === 'markdown') {
    return `# ${data.title || '회의록'}

## 기본 정보
| 항목 | 내용 |
|------|------|
| 날짜 | ${data.date} |
| 시간 | ${data.time} |
| 장소 | ${data.location} (${data.locationType === 'online' ? '온라인' : '오프라인'}) |
| 주최자 | ${data.organizer} |
| 참석자 | ${attendeeList} |

## 안건
${agendaText}

## 토의 내용
${discussionText}

## 결정 사항
${data.decisions}

## 액션 아이템
${actionText}

## 다음 회의
${data.nextMeeting}

## 기타 메모
${data.notes}
`
  }

  if (format === 'html') {
    return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>${data.title || '회의록'}</title>
<style>
  body { font-family: 'Malgun Gothic', sans-serif; max-width: 800px; margin: 40px auto; color: #1a1a1a; line-height: 1.6; }
  h1 { border-bottom: 2px solid #3b82f6; padding-bottom: 8px; }
  h2 { border-left: 4px solid #3b82f6; padding-left: 12px; margin-top: 28px; }
  table { width: 100%; border-collapse: collapse; }
  td, th { border: 1px solid #ddd; padding: 8px 12px; }
  th { background: #f3f4f6; }
  ol { padding-left: 20px; }
  .status-done { color: #16a34a; font-weight: bold; }
  .status-inprogress { color: #d97706; font-weight: bold; }
  .status-pending { color: #6b7280; }
  @media print { body { margin: 20px; } }
</style>
</head>
<body>
<h1>${data.title || '회의록'}</h1>
<table>
<tr><th>날짜</th><td>${data.date}</td><th>시간</th><td>${data.time}</td></tr>
<tr><th>장소</th><td>${data.location} (${data.locationType === 'online' ? '온라인' : '오프라인'})</td><th>주최자</th><td>${data.organizer}</td></tr>
<tr><th>참석자</th><td colspan="3">${attendeeList}</td></tr>
</table>
<h2>안건</h2>
<ol>${data.agenda.map(a => `<li><strong>${a.title}</strong>${a.duration ? ` [${a.duration}분]` : ''}${a.notes ? `<br><small>${a.notes}</small>` : ''}</li>`).join('')}</ol>
<h2>토의 내용</h2>
<ol>${data.discussions.map(d => `<li>${d.speaker ? `<strong>[${d.speaker}]</strong> ` : ''}${d.content}</li>`).join('')}</ol>
<h2>결정 사항</h2>
<p>${data.decisions.replace(/\n/g, '<br>')}</p>
<h2>액션 아이템</h2>
<table><tr><th>#</th><th>업무</th><th>담당자</th><th>기한</th><th>상태</th></tr>
${data.actions.map((a, i) => {
  const cls = a.status === 'done' ? 'status-done' : a.status === 'in-progress' ? 'status-inprogress' : 'status-pending'
  const label = a.status === 'done' ? '완료' : a.status === 'in-progress' ? '진행 중' : '대기'
  return `<tr><td>${i + 1}</td><td>${a.task}</td><td>${a.assignee}</td><td>${a.dueDate}</td><td class="${cls}">${label}</td></tr>`
}).join('')}
</table>
<h2>다음 회의</h2>
<p>${data.nextMeeting}</p>
<h2>기타 메모</h2>
<p>${data.notes.replace(/\n/g, '<br>')}</p>
</body>
</html>`
  }

  // plain text
  return `=====================================
${data.title || '회의록'}
=====================================
날짜: ${data.date}  시간: ${data.time}
장소: ${data.location} (${data.locationType === 'online' ? '온라인' : '오프라인'})
주최자: ${data.organizer}
참석자: ${attendeeList}

[ 안건 ]
${agendaText}

[ 토의 내용 ]
${discussionText}

[ 결정 사항 ]
${data.decisions}

[ 액션 아이템 ]
${actionText}

[ 다음 회의 ]
${data.nextMeeting}

[ 기타 메모 ]
${data.notes}
=====================================`
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-blue-600 dark:text-blue-400">{icon}</span>
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{title}</h2>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function MeetingMinutes() {
  const t = useTranslations('meetingMinutes')
  const [data, setData] = useState<MeetingData>(emptyData)
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [saveSlots, setSaveSlots] = useState<{ name: string; data: MeetingData }[]>([])
  const [showSaveSlots, setShowSaveSlots] = useState(false)
  const [slotName, setSlotName] = useState('')
  const printRef = useRef<HTMLDivElement>(null)

  // Auto-save
  useEffect(() => {
    const timer = setTimeout(() => {
      try { localStorage.setItem(LS_AUTO_KEY, JSON.stringify(data)) } catch { /* noop */ }
    }, 800)
    return () => clearTimeout(timer)
  }, [data])

  // Load auto-save + slots on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_AUTO_KEY)
      if (raw) setData(JSON.parse(raw) as MeetingData)
      const slotRaw = localStorage.getItem(LS_SLOTS_KEY)
      if (slotRaw) setSaveSlots(JSON.parse(slotRaw))
    } catch { /* noop */ }
  }, [])

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
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
    } catch { /* noop */ }
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  const exportFile = useCallback((format: ExportFormat) => {
    const content = formatForExport(data, format)
    const ext = format === 'markdown' ? 'md' : format === 'html' ? 'html' : 'txt'
    const mime = format === 'html' ? 'text/html' : 'text/plain'
    const blob = new Blob([content], { type: `${mime};charset=utf-8` })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${data.title || 'meeting-minutes'}.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }, [data])

  const handlePrint = useCallback(() => { window.print() }, [])

  // ── Save slots ────────────────────────────────────────────────────────

  const saveSlot = () => {
    if (!slotName.trim()) return
    const updated = [...saveSlots.filter(s => s.name !== slotName.trim()), { name: slotName.trim(), data }]
    setSaveSlots(updated)
    try { localStorage.setItem(LS_SLOTS_KEY, JSON.stringify(updated)) } catch { /* noop */ }
    setSlotName('')
  }

  const loadSlot = (slot: { name: string; data: MeetingData }) => {
    setData(slot.data)
    setShowSaveSlots(false)
  }

  const deleteSlot = (name: string) => {
    const updated = saveSlots.filter(s => s.name !== name)
    setSaveSlots(updated)
    try { localStorage.setItem(LS_SLOTS_KEY, JSON.stringify(updated)) } catch { /* noop */ }
  }

  const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm'
  const smallInputClass = 'px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm'

  const statusColors: Record<ActionStatus, string> = {
    pending: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    'in-progress': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    done: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  }

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 print:shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              {t('title')}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
          </div>
          {/* Tab switcher */}
          <div className="flex gap-2 print:hidden">
            <button
              onClick={() => setActiveTab('edit')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'edit' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
            >
              {t('editTab')}
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'preview' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
            >
              {t('previewTab')}
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 print:hidden">
        <div className="flex flex-wrap gap-2 items-center">
          {/* Templates */}
          <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{t('template')}:</span>
          {(['weekly', 'kickoff', 'brainstorming', 'retrospective', 'client'] as TemplateId[]).map(id => (
            <button
              key={id}
              onClick={() => applyTemplate(id)}
              className="px-3 py-1.5 text-xs bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors border border-blue-200 dark:border-blue-800"
            >
              {t(`templates.${id}`)}
            </button>
          ))}

          <div className="flex-1" />

          {/* Export */}
          <button onClick={() => copyToClipboard(formatForExport(data, 'text'), 'copy-text')} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            {copiedId === 'copy-text' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {t('copyText')}
          </button>
          <button onClick={() => exportFile('markdown')} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            <Download className="w-4 h-4" /> MD
          </button>
          <button onClick={() => exportFile('html')} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            <Download className="w-4 h-4" /> HTML
          </button>
          <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            <Printer className="w-4 h-4" /> {t('print')}
          </button>

          {/* Save slots */}
          <button onClick={() => setShowSaveSlots(v => !v)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-md hover:bg-indigo-200 dark:hover:bg-indigo-900 transition-colors">
            <Save className="w-4 h-4" />
            {t('saveSlots')}
            {showSaveSlots ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Save slot panel */}
        {showSaveSlots && (
          <div className="mt-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 space-y-2">
            <div className="flex gap-2">
              <input
                className={`${smallInputClass} flex-1`}
                placeholder={t('slotNamePlaceholder')}
                value={slotName}
                onChange={e => setSlotName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveSlot()}
              />
              <button onClick={saveSlot} className="px-3 py-1.5 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 transition-colors">
                {t('saveBtn')}
              </button>
            </div>
            {saveSlots.length > 0 && (
              <div className="space-y-1">
                {saveSlots.map(slot => (
                  <div key={slot.name} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-md px-3 py-2">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{slot.name}</span>
                    <div className="flex gap-2">
                      <button onClick={() => loadSlot(slot)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                        <FolderOpen className="w-3 h-3" /> {t('load')}
                      </button>
                      <button onClick={() => deleteSlot(slot.name)} className="text-xs text-red-500 hover:underline flex items-center gap-1">
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

      {activeTab === 'edit' ? (
        <>
          {/* Meeting Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <SectionHeader icon={<Calendar className="w-5 h-5" />} title={t('meetingInfo')} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('meetingTitle')}</label>
                <input className={inputClass} value={data.title} onChange={e => update('title', e.target.value)} placeholder={t('meetingTitlePlaceholder')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('date')}</label>
                <input type="date" className={inputClass} value={data.date} onChange={e => update('date', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('time')}</label>
                <input type="time" className={inputClass} value={data.time} onChange={e => update('time', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('location')}</label>
                <input className={inputClass} value={data.location} onChange={e => update('location', e.target.value)} placeholder={t('locationPlaceholder')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('locationType')}</label>
                <select className={inputClass} value={data.locationType} onChange={e => update('locationType', e.target.value as 'online' | 'offline')}>
                  <option value="offline">{t('offline')}</option>
                  <option value="online">{t('online')}</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('organizer')}</label>
                <input className={inputClass} value={data.organizer} onChange={e => update('organizer', e.target.value)} placeholder={t('organizerPlaceholder')} />
              </div>
            </div>
          </div>

          {/* Attendees */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <SectionHeader icon={<Users className="w-5 h-5" />} title={t('attendees')} />
            <div className="space-y-2 mb-3">
              {data.attendees.map((a, idx) => (
                <div key={a.id} className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs text-gray-400 w-5 text-right">{idx + 1}.</span>
                  <input className={`${smallInputClass} flex-1 min-w-24`} placeholder={t('attendeeName')} value={a.name} onChange={e => updateAttendee(a.id, 'name', e.target.value)} />
                  <input className={`${smallInputClass} flex-1 min-w-24`} placeholder={t('attendeeRole')} value={a.role} onChange={e => updateAttendee(a.id, 'role', e.target.value)} />
                  <select className={`${smallInputClass} min-w-20`} value={a.status} onChange={e => updateAttendee(a.id, 'status', e.target.value)}>
                    <option value="present">{t('present')}</option>
                    <option value="absent">{t('absent')}</option>
                    <option value="remote">{t('remote')}</option>
                  </select>
                  <button onClick={() => removeAttendee(a.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
            <button onClick={addAttendee} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors">
              <Plus className="w-4 h-4" /> {t('addAttendee')}
            </button>
          </div>

          {/* Agenda */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <SectionHeader icon={<FileText className="w-5 h-5" />} title={t('agenda')} />
            <div className="space-y-3 mb-3">
              {data.agenda.map((a, idx) => (
                <div key={a.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 space-y-2">
                  <div className="flex gap-2 items-start">
                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 mt-2 w-5 shrink-0">{idx + 1}.</span>
                    <input className={`${smallInputClass} flex-1`} placeholder={t('agendaTitle')} value={a.title} onChange={e => updateAgenda(a.id, 'title', e.target.value)} />
                    <input className={`${smallInputClass} w-16`} placeholder={t('minutes')} type="number" min="0" value={a.duration} onChange={e => updateAgenda(a.id, 'duration', e.target.value)} />
                    <button onClick={() => removeAgenda(a.id)} className="text-red-400 hover:text-red-600 p-1 mt-0.5"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <textarea className={`${inputClass} resize-none`} rows={2} placeholder={t('agendaNotes')} value={a.notes} onChange={e => updateAgenda(a.id, 'notes', e.target.value)} />
                </div>
              ))}
            </div>
            <button onClick={addAgenda} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors">
              <Plus className="w-4 h-4" /> {t('addAgenda')}
            </button>
          </div>

          {/* Discussion */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <SectionHeader icon={<MessageSquare className="w-5 h-5" />} title={t('discussion')} />
            <div className="space-y-2 mb-3">
              {data.discussions.map((d, idx) => (
                <div key={d.id} className="flex flex-wrap gap-2 items-start">
                  <span className="text-xs text-gray-400 w-5 text-right mt-2">{idx + 1}.</span>
                  <input className={`${smallInputClass} w-28 shrink-0`} placeholder={t('speaker')} value={d.speaker} onChange={e => updateDiscussion(d.id, 'speaker', e.target.value)} />
                  <textarea className={`${smallInputClass} flex-1 min-w-40 resize-none`} rows={2} placeholder={t('discussionContent')} value={d.content} onChange={e => updateDiscussion(d.id, 'content', e.target.value)} />
                  <button onClick={() => removeDiscussion(d.id)} className="text-red-400 hover:text-red-600 p-1 mt-1"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
            <button onClick={addDiscussion} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors">
              <Plus className="w-4 h-4" /> {t('addDiscussion')}
            </button>
          </div>

          {/* Decisions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <SectionHeader icon={<Lightbulb className="w-5 h-5" />} title={t('decisions')} />
            <textarea className={`${inputClass} resize-none`} rows={4} placeholder={t('decisionsPlaceholder')} value={data.decisions} onChange={e => update('decisions', e.target.value)} />
          </div>

          {/* Action Items */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <SectionHeader icon={<CheckSquare className="w-5 h-5" />} title={t('actionItems')} />
            <div className="space-y-2 mb-3">
              {data.actions.map((a, idx) => (
                <div key={a.id} className="flex flex-wrap gap-2 items-center border border-gray-200 dark:border-gray-600 rounded-lg p-2">
                  <span className="text-xs text-gray-400 w-5 text-right">{idx + 1}.</span>
                  <input className={`${smallInputClass} flex-1 min-w-40`} placeholder={t('actionTask')} value={a.task} onChange={e => updateAction(a.id, 'task', e.target.value)} />
                  <input className={`${smallInputClass} w-24`} placeholder={t('assignee')} value={a.assignee} onChange={e => updateAction(a.id, 'assignee', e.target.value)} />
                  <input type="date" className={`${smallInputClass} w-36`} value={a.dueDate} onChange={e => updateAction(a.id, 'dueDate', e.target.value)} />
                  <select className={`${smallInputClass} w-24 ${statusColors[a.status]}`} value={a.status} onChange={e => updateAction(a.id, 'status', e.target.value)}>
                    <option value="pending">{t('pending')}</option>
                    <option value="in-progress">{t('inProgress')}</option>
                    <option value="done">{t('done')}</option>
                  </select>
                  <button onClick={() => removeAction(a.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
            <button onClick={addAction} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors">
              <Plus className="w-4 h-4" /> {t('addAction')}
            </button>
          </div>

          {/* Next meeting + extra notes */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <SectionHeader icon={<Clock className="w-5 h-5" />} title={t('nextMeeting')} />
            <input className={inputClass} value={data.nextMeeting} onChange={e => update('nextMeeting', e.target.value)} placeholder={t('nextMeetingPlaceholder')} />
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('extraNotes')}</label>
              <textarea className={`${inputClass} resize-none`} rows={3} value={data.notes} onChange={e => update('notes', e.target.value)} placeholder={t('extraNotesPlaceholder')} />
            </div>
          </div>
        </>
      ) : (
        /* Preview pane */
        <div ref={printRef} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 print:shadow-none print:p-0">
          <div className="max-w-3xl mx-auto space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white border-b-2 border-blue-600 pb-2">{data.title || t('untitled')}</h1>
              <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {data.date} {data.time}</div>
                <div className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {data.location} ({data.locationType === 'online' ? t('online') : t('offline')})</div>
                <div className="flex items-center gap-1"><User className="w-4 h-4" /> {t('organizer')}: {data.organizer}</div>
                <div className="flex items-center gap-1"><Users className="w-4 h-4" /> {t('attendees')}: {data.attendees.filter(a => a.status === 'present' || a.status === 'remote').length}명</div>
              </div>
            </div>

            {data.attendees.length > 0 && (
              <div>
                <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-2 border-l-4 border-blue-600 pl-3">{t('attendees')}</h2>
                <div className="flex flex-wrap gap-2">
                  {data.attendees.map(a => (
                    <span key={a.id} className={`px-2 py-1 rounded-full text-xs ${a.status === 'absent' ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 line-through' : a.status === 'remote' ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300' : 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300'}`}>
                      {a.name}{a.role ? ` · ${a.role}` : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {data.agenda.length > 0 && (
              <div>
                <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-2 border-l-4 border-blue-600 pl-3">{t('agenda')}</h2>
                <ol className="space-y-2 list-decimal list-inside">
                  {data.agenda.map((a, i) => (
                    <li key={a.id} className="text-sm text-gray-700 dark:text-gray-300">
                      <span className="font-medium">{a.title}</span>
                      {a.duration ? <span className="ml-1 text-xs text-gray-400">[{a.duration}분]</span> : null}
                      {a.notes && <p className="ml-4 mt-1 text-gray-500 dark:text-gray-400">{a.notes}</p>}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {data.discussions.length > 0 && (
              <div>
                <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-2 border-l-4 border-blue-600 pl-3">{t('discussion')}</h2>
                <ol className="space-y-1.5 list-decimal list-inside">
                  {data.discussions.map(d => (
                    <li key={d.id} className="text-sm text-gray-700 dark:text-gray-300">
                      {d.speaker && <span className="font-semibold text-blue-700 dark:text-blue-400">[{d.speaker}]</span>} {d.content}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {data.decisions && (
              <div>
                <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-2 border-l-4 border-blue-600 pl-3">{t('decisions')}</h2>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{data.decisions}</p>
              </div>
            )}

            {data.actions.length > 0 && (
              <div>
                <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-2 border-l-4 border-blue-600 pl-3">{t('actionItems')}</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700">
                        <th className="border border-gray-200 dark:border-gray-600 px-3 py-2 text-left text-gray-700 dark:text-gray-300">#</th>
                        <th className="border border-gray-200 dark:border-gray-600 px-3 py-2 text-left text-gray-700 dark:text-gray-300">{t('actionTask')}</th>
                        <th className="border border-gray-200 dark:border-gray-600 px-3 py-2 text-left text-gray-700 dark:text-gray-300">{t('assignee')}</th>
                        <th className="border border-gray-200 dark:border-gray-600 px-3 py-2 text-left text-gray-700 dark:text-gray-300">{t('dueDate')}</th>
                        <th className="border border-gray-200 dark:border-gray-600 px-3 py-2 text-left text-gray-700 dark:text-gray-300">{t('status')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.actions.map((a, i) => (
                        <tr key={a.id} className="even:bg-gray-50 dark:even:bg-gray-750">
                          <td className="border border-gray-200 dark:border-gray-600 px-3 py-2 text-gray-600 dark:text-gray-400">{i + 1}</td>
                          <td className="border border-gray-200 dark:border-gray-600 px-3 py-2 text-gray-800 dark:text-gray-200">{a.task}</td>
                          <td className="border border-gray-200 dark:border-gray-600 px-3 py-2 text-gray-700 dark:text-gray-300">{a.assignee}</td>
                          <td className="border border-gray-200 dark:border-gray-600 px-3 py-2 text-gray-700 dark:text-gray-300">{a.dueDate}</td>
                          <td className={`border border-gray-200 dark:border-gray-600 px-3 py-2 font-medium ${a.status === 'done' ? 'text-green-600 dark:text-green-400' : a.status === 'in-progress' ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-500 dark:text-gray-400'}`}>
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
                <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-1 border-l-4 border-blue-600 pl-3">{t('nextMeeting')}</h2>
                <p className="text-sm text-gray-700 dark:text-gray-300">{data.nextMeeting}</p>
              </div>
            )}

            {data.notes && (
              <div>
                <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-1 border-l-4 border-blue-600 pl-3">{t('extraNotes')}</h2>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{data.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Guide */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 print:hidden">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">{t('guide.title')}</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {(t.raw('guide.sections') as { title: string; items: string[] }[]).map((section, i) => (
            <div key={i} className="bg-blue-50 dark:bg-blue-950 rounded-xl p-4">
              <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-3">{section.title}</h3>
              <ul className="space-y-1.5">
                {section.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-blue-700 dark:text-blue-300">
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
