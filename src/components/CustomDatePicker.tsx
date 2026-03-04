'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react'

interface Props {
  value: string       // YYYY-MM-DD
  onChange: (val: string) => void
  placeholder?: string
  className?: string
}

const MONTH_NAMES = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']
const DAY_NAMES   = ['월','화','수','목','금','토','일']
const DAY_FULL    = ['일','월','화','수','목','금','토']

function formatDisplay(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00')
  if (isNaN(d.getTime())) return ''
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()} (${DAY_FULL[d.getDay()]})`
}

export default function CustomDatePicker({ value, onChange, placeholder = '날짜 선택', className = '' }: Props) {
  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(() => {
    if (value) { const d = new Date(value + 'T12:00'); return d.getFullYear() }
    return new Date().getFullYear()
  })
  const [viewMonth, setViewMonth] = useState(() => {
    if (value) { const d = new Date(value + 'T12:00'); return d.getMonth() }
    return new Date().getMonth()
  })
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [dropUp, setDropUp] = useState(false)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    const keyHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', keyHandler)
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('keydown', keyHandler) }
  }, [])

  // 드롭다운 방향 결정
  useEffect(() => {
    if (open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      setDropUp(spaceBelow < 320)
    }
  }, [open])

  // value 변경시 뷰 동기화
  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T12:00')
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear())
        setViewMonth(d.getMonth())
      }
    }
  }, [value])

  const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate()
  const firstDayOfMonth = (y: number, m: number) => {
    const day = new Date(y, m, 1).getDay() // 0=Sun
    return (day + 6) % 7 // Mon=0
  }

  const selectDay = (day: number) => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    onChange(dateStr)
    setOpen(false)
  }

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }
  const goToday = () => {
    const t = new Date()
    const ds = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
    onChange(ds); setOpen(false)
  }

  const isSelected = (day: number) => {
    if (!value) return false
    const d = new Date(value + 'T12:00')
    return d.getFullYear() === viewYear && d.getMonth() === viewMonth && d.getDate() === day
  }
  const isToday = (day: number) => {
    const t = new Date()
    return t.getFullYear() === viewYear && t.getMonth() === viewMonth && t.getDate() === day
  }

  const days = daysInMonth(viewYear, viewMonth)
  const emptyBefore = firstDayOfMonth(viewYear, viewMonth)
  const displayText = formatDisplay(value)

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-2 px-3 py-2 border rounded-xl bg-white dark:bg-gray-700 text-left text-sm transition-all
          ${open ? 'border-blue-500 ring-2 ring-blue-500/20 dark:border-blue-400' : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'}`}
      >
        <Calendar className="w-4 h-4 text-blue-500 flex-shrink-0" />
        <span className={`flex-1 truncate ${displayText ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
          {displayText || placeholder}
        </span>
        {value && (
          <span
            role="button"
            tabIndex={0}
            onClick={e => { e.stopPropagation(); onChange('') }}
            onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); onChange('') } }}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
          >
            <X className="w-3 h-3" />
          </span>
        )}
      </button>

      {open && (
        <div
          ref={dropdownRef}
          className={`absolute z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-2xl shadow-2xl p-4 w-72
            ${dropUp ? 'bottom-full mb-1' : 'top-full mt-1'}`}
        >
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <select
                value={viewYear}
                onChange={e => setViewYear(Number(e.target.value))}
                className="text-sm font-semibold bg-transparent text-gray-900 dark:text-white cursor-pointer focus:outline-none"
              >
                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                  <option key={y} value={y}>{y}년</option>
                ))}
              </select>
              <select
                value={viewMonth}
                onChange={e => setViewMonth(Number(e.target.value))}
                className="text-sm font-semibold bg-transparent text-gray-900 dark:text-white cursor-pointer focus:outline-none"
              >
                {MONTH_NAMES.map((m, i) => (
                  <option key={i} value={i}>{m}</option>
                ))}
              </select>
            </div>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_NAMES.map((d, i) => (
              <div key={d} className={`text-center text-xs py-1 font-medium ${i === 5 ? 'text-blue-500' : i === 6 ? 'text-red-500' : 'text-gray-400'}`}>
                {d}
              </div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: emptyBefore }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: days }).map((_, i) => {
              const day = i + 1
              const dayOfWeek = (emptyBefore + i) % 7 // Mon=0
              const isSat = dayOfWeek === 5
              const isSun = dayOfWeek === 6
              const selected = isSelected(day)
              const today = isToday(day)
              return (
                <button
                  key={day}
                  onClick={() => selectDay(day)}
                  className={`w-full aspect-square flex items-center justify-center rounded-xl text-sm transition-all font-medium
                    ${selected
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-blue-900'
                      : today
                      ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 ring-1 ring-blue-300 dark:ring-blue-700'
                      : isSat
                      ? 'text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/50'
                      : isSun
                      ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                >
                  {day}
                </button>
              )
            })}
          </div>

          {/* 하단 버튼 */}
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <button onClick={goToday} className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">
              오늘
            </button>
            {value && (
              <button onClick={() => { onChange(''); setOpen(false) }} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                초기화
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
