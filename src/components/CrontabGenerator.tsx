'use client'

import { useState, useCallback, useMemo } from 'react'
import { Copy, Check, Clock } from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

type FieldMode = 'every' | 'specific' | 'range' | 'interval'

interface FieldState {
  mode: FieldMode
  specific: number[]
  rangeFrom: number
  rangeTo: number
  interval: number
}

interface CronState {
  minute: FieldState
  hour: FieldState
  dayOfMonth: FieldState
  month: FieldState
  dayOfWeek: FieldState
}

type CronField = keyof CronState

// ── Field metadata ────────────────────────────────────────────────────────────

const FIELDS: { key: CronField; label: string; min: number; max: number }[] = [
  { key: 'minute', label: '분 (Minute)', min: 0, max: 59 },
  { key: 'hour', label: '시 (Hour)', min: 0, max: 23 },
  { key: 'dayOfMonth', label: '일 (Day)', min: 1, max: 31 },
  { key: 'month', label: '월 (Month)', min: 1, max: 12 },
  { key: 'dayOfWeek', label: '요일 (Weekday)', min: 0, max: 6 },
]

const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토']
const MONTH_LABELS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

// ── Default field state ───────────────────────────────────────────────────────

function defaultField(min: number, max: number): FieldState {
  return { mode: 'every', specific: [], rangeFrom: min, rangeTo: max, interval: 1 }
}

const INITIAL_STATE: CronState = {
  minute: defaultField(0, 59),
  hour: defaultField(0, 23),
  dayOfMonth: defaultField(1, 31),
  month: defaultField(1, 12),
  dayOfWeek: defaultField(0, 6),
}

// ── Build cron field string ───────────────────────────────────────────────────

function buildField(fs: FieldState): string {
  switch (fs.mode) {
    case 'every':
      return '*'
    case 'specific':
      return fs.specific.length === 0 ? '*' : [...fs.specific].sort((a, b) => a - b).join(',')
    case 'range':
      return `${fs.rangeFrom}-${fs.rangeTo}`
    case 'interval':
      return `*/${fs.interval}`
  }
}

function buildExpression(state: CronState): string {
  return [
    buildField(state.minute),
    buildField(state.hour),
    buildField(state.dayOfMonth),
    buildField(state.month),
    buildField(state.dayOfWeek),
  ].join(' ')
}

// ── Korean description ────────────────────────────────────────────────────────

function describeCron(expr: string): string {
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) return '올바르지 않은 표현식'
  const [min, hr, dom, mon, dow] = parts

  const descMin = () => {
    if (min === '*') return '매분'
    if (min.startsWith('*/')) return `${min.slice(2)}분마다`
    if (min.includes('-')) return `${min}분`
    return `${min}분`
  }

  const descHr = () => {
    if (hr === '*') return null
    if (hr.startsWith('*/')) return `${hr.slice(2)}시간마다`
    const h = parseInt(hr)
    if (hr.includes('-')) return `${hr}시`
    return h < 12 ? `오전 ${h}시` : h === 12 ? '정오' : `오후 ${h - 12}시`
  }

  const descDow = () => {
    if (dow === '*') return null
    if (dow === '1-5') return '평일(월~금)'
    if (dow === '0' || dow === '7') return '매주 일요일'
    const dayNames: Record<string, string> = { '0': '일', '1': '월', '2': '화', '3': '수', '4': '목', '5': '금', '6': '토', '7': '일' }
    if (/^\d$/.test(dow)) return `매주 ${dayNames[dow] ?? dow}요일`
    return `매주 ${dow}일`
  }

  const descDom = () => {
    if (dom === '*') return null
    if (dom.startsWith('*/')) return `${dom.slice(2)}일마다`
    return `${dom}일`
  }

  const descMon = () => {
    if (mon === '*') return null
    if (mon.startsWith('*/')) return `${mon.slice(2)}개월마다`
    return `${mon}월`
  }

  // All wildcards
  if (min === '*' && hr === '*' && dom === '*' && mon === '*' && dow === '*') return '매분 실행'

  // Interval only on minute
  if (min.startsWith('*/') && hr === '*' && dom === '*' && mon === '*' && dow === '*') {
    return `${min.slice(2)}분마다 실행`
  }

  // Build description parts
  const parts2: string[] = []
  const monDesc = descMon()
  const domDesc = descDom()
  const dowDesc = descDow()
  const hrDesc = descHr()
  const minStr = descMin()

  if (monDesc) parts2.push(monDesc)
  if (domDesc) parts2.push(domDesc)
  if (dowDesc) parts2.push(dowDesc)

  const timePart = hrDesc
    ? `${hrDesc} ${minStr}에`
    : min === '0' && hr === '*'
      ? '매시 0분에'
      : min === '*'
        ? '매분'
        : `${minStr}에`

  if (parts2.length === 0) {
    if (hr === '*' && min !== '*') return `매시간 ${minStr}에 실행`
    return `${timePart} 실행`
  }

  return `${parts2.join(' ')} ${timePart} 실행`
}

// ── Next execution times ──────────────────────────────────────────────────────

function matchesField(value: number, field: string, min: number, max: number): boolean {
  if (field === '*') return true
  if (field.startsWith('*/')) {
    const step = parseInt(field.slice(2))
    return (value - min) % step === 0
  }
  if (field.includes('-') && !field.includes(',')) {
    const [lo, hi] = field.split('-').map(Number)
    return value >= lo && value <= hi
  }
  if (field.includes(',')) {
    return field.split(',').map(Number).includes(value)
  }
  return parseInt(field) === value
}

function getNextExecutions(expr: string, count: number = 5): Date[] {
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) return []
  const [min, hr, dom, mon, dow] = parts

  const results: Date[] = []
  const now = new Date()
  // Start from next minute
  const start = new Date(now)
  start.setSeconds(0, 0)
  start.setMinutes(start.getMinutes() + 1)

  let current = new Date(start)
  let iterations = 0
  const MAX_ITER = 60 * 24 * 366 * 2 // ~2 years of minutes

  while (results.length < count && iterations < MAX_ITER) {
    iterations++
    const m = current.getMinutes()
    const h = current.getHours()
    const d = current.getDate()
    const mo = current.getMonth() + 1
    const dw = current.getDay()

    if (
      matchesField(m, min, 0, 59) &&
      matchesField(h, hr, 0, 23) &&
      matchesField(d, dom, 1, 31) &&
      matchesField(mo, mon, 1, 12) &&
      matchesField(dw, dow, 0, 6)
    ) {
      results.push(new Date(current))
    }

    current.setMinutes(current.getMinutes() + 1)
  }

  return results
}

function formatDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const days = ['일', '월', '화', '수', '목', '금', '토']
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} (${days[d.getDay()]}) ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ── Presets ───────────────────────────────────────────────────────────────────

const PRESETS = [
  { label: '매분', expr: '* * * * *' },
  { label: '매시', expr: '0 * * * *' },
  { label: '매일 자정', expr: '0 0 * * *' },
  { label: '매주 월 9시', expr: '0 9 * * 1' },
  { label: '매월 1일', expr: '0 0 1 * *' },
  { label: '평일 9시', expr: '0 9 * * 1-5' },
  { label: '5분마다', expr: '*/5 * * * *' },
  { label: '매월 15일 정오', expr: '0 12 15 * *' },
]

// ── Parse expression into CronState ─────────────────────────────────────────

function parseField(field: string, min: number, max: number): FieldState {
  if (field === '*') return { ...defaultField(min, max), mode: 'every' }
  if (field.startsWith('*/')) {
    const interval = parseInt(field.slice(2)) || 1
    return { ...defaultField(min, max), mode: 'interval', interval }
  }
  if (/^\d+-\d+$/.test(field)) {
    const [lo, hi] = field.split('-').map(Number)
    return { ...defaultField(min, max), mode: 'range', rangeFrom: lo, rangeTo: hi }
  }
  // Specific (single or comma-separated)
  const specific = field.split(',').map(Number).filter(n => !isNaN(n))
  return { ...defaultField(min, max), mode: 'specific', specific }
}

function parseExpression(expr: string): CronState | null {
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) return null
  const fieldDefs = FIELDS
  try {
    return {
      minute: parseField(parts[0], fieldDefs[0].min, fieldDefs[0].max),
      hour: parseField(parts[1], fieldDefs[1].min, fieldDefs[1].max),
      dayOfMonth: parseField(parts[2], fieldDefs[2].min, fieldDefs[2].max),
      month: parseField(parts[3], fieldDefs[3].min, fieldDefs[3].max),
      dayOfWeek: parseField(parts[4], fieldDefs[4].min, fieldDefs[4].max),
    }
  } catch {
    return null
  }
}

// ── Field Selector Component ──────────────────────────────────────────────────

interface FieldSelectorProps {
  fieldKey: CronField
  label: string
  min: number
  max: number
  state: FieldState
  onChange: (key: CronField, state: FieldState) => void
}

const MODES: { key: FieldMode; label: string }[] = [
  { key: 'every', label: '매번' },
  { key: 'specific', label: '특정' },
  { key: 'range', label: '범위' },
  { key: 'interval', label: '간격' },
]

function FieldSelector({ fieldKey, label, min, max, state, onChange }: FieldSelectorProps) {
  const toggleSpecific = useCallback((val: number) => {
    const next = state.specific.includes(val)
      ? state.specific.filter(v => v !== val)
      : [...state.specific, val]
    onChange(fieldKey, { ...state, specific: next })
  }, [fieldKey, state, onChange])

  const setMode = useCallback((mode: FieldMode) => {
    onChange(fieldKey, { ...state, mode })
  }, [fieldKey, state, onChange])

  const isDoW = fieldKey === 'dayOfWeek'
  const isMonth = fieldKey === 'month'
  const total = max - min + 1

  // For specific grid: show labels for dow and month, numbers otherwise
  const renderSpecificGrid = () => {
    if (isDoW) {
      return (
        <div className="flex flex-wrap gap-1">
          {DOW_LABELS.map((lbl, i) => (
            <button
              key={i}
              onClick={() => toggleSpecific(i)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                state.specific.includes(i)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>
      )
    }

    if (isMonth) {
      return (
        <div className="flex flex-wrap gap-1">
          {MONTH_LABELS.map((lbl, i) => (
            <button
              key={i + 1}
              onClick={() => toggleSpecific(i + 1)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                state.specific.includes(i + 1)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>
      )
    }

    // Numbers: for large ranges (0-59) show compact grid
    const cols = total > 30 ? 10 : total > 12 ? 8 : 6
    return (
      <div
        className="flex flex-wrap gap-1"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: total }, (_, i) => i + min).map(val => (
          <button
            key={val}
            onClick={() => toggleSpecific(val)}
            className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
              state.specific.includes(val)
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {val}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-gray-900 dark:text-white text-sm">{label}</span>
        <span className="text-xs font-mono bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
          {buildField(state)}
        </span>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1">
        {MODES.map(m => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            className={`flex-1 py-1 rounded text-xs font-medium transition-colors ${
              state.mode === m.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Mode content */}
      {state.mode === 'every' && (
        <p className="text-xs text-gray-500 dark:text-gray-400">모든 값에 실행 (*)</p>
      )}

      {state.mode === 'specific' && renderSpecificGrid()}

      {state.mode === 'range' && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={min}
            max={max}
            value={state.rangeFrom}
            onChange={e => onChange(fieldKey, { ...state, rangeFrom: Math.max(min, Math.min(max, parseInt(e.target.value) || min)) })}
            className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <span className="text-gray-500 dark:text-gray-400 text-xs">~</span>
          <input
            type="number"
            min={min}
            max={max}
            value={state.rangeTo}
            onChange={e => onChange(fieldKey, { ...state, rangeTo: Math.max(min, Math.min(max, parseInt(e.target.value) || max)) })}
            className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      )}

      {state.mode === 'interval' && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">*/</span>
          <input
            type="number"
            min={1}
            max={max}
            value={state.interval}
            onChange={e => onChange(fieldKey, { ...state, interval: Math.max(1, parseInt(e.target.value) || 1) })}
            className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <span className="text-xs text-gray-500 dark:text-gray-400">단위마다</span>
        </div>
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function CrontabGenerator() {
  const [cronState, setCronState] = useState<CronState>(INITIAL_STATE)
  const [copied, setCopied] = useState(false)

  const expression = useMemo(() => buildExpression(cronState), [cronState])
  const description = useMemo(() => describeCron(expression), [expression])
  const nextTimes = useMemo(() => getNextExecutions(expression, 5), [expression])

  const handleFieldChange = useCallback((key: CronField, state: FieldState) => {
    setCronState(prev => ({ ...prev, [key]: state }))
  }, [])

  const applyPreset = useCallback((expr: string) => {
    const parsed = parseExpression(expr)
    if (parsed) setCronState(parsed)
  }, [])

  const copyToClipboard = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(expression)
      } else {
        const ta = document.createElement('textarea')
        ta.value = expression
        ta.style.position = 'fixed'
        ta.style.left = '-999999px'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
    } catch {
      // ignore
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [expression])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Crontab 생성기</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          비주얼 UI로 크론 표현식을 생성하세요
        </p>
      </div>

      {/* Expression display */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 font-mono text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400 tracking-widest bg-blue-50 dark:bg-blue-950 rounded-lg px-4 py-3 break-all">
            {expression}
          </div>
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shrink-0"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? '복사됨!' : '복사'}
          </button>
        </div>
        <p className="mt-3 text-gray-700 dark:text-gray-300 font-medium">{description}</p>
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          형식: 분 시 일 월 요일 (0=일요일, 1=월요일 … 6=토요일)
        </p>
      </div>

      {/* Field selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {FIELDS.map(f => (
          <FieldSelector
            key={f.key}
            fieldKey={f.key}
            label={f.label}
            min={f.min}
            max={f.max}
            state={cronState[f.key]}
            onChange={handleFieldChange}
          />
        ))}
      </div>

      {/* Bottom row: presets + next times */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Presets */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">프리셋</h2>
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map(p => (
              <button
                key={p.expr}
                onClick={() => applyPreset(p.expr)}
                className={`text-left px-3 py-2 rounded-lg text-sm transition-colors border ${
                  expression === p.expr
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950'
                }`}
              >
                <span className="block font-medium">{p.label}</span>
                <span className="block font-mono text-xs opacity-70">{p.expr}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Next execution times */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            다음 5회 실행 시간
          </h2>
          {nextTimes.length > 0 ? (
            <ol className="space-y-2">
              {nextTimes.map((d, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <span className="font-mono text-sm text-gray-700 dark:text-gray-300">{formatDate(d)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">실행 시간을 계산할 수 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  )
}
