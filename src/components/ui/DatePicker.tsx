'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { format, subMonths, addMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, isAfter } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

interface DatePickerProps {
  value: string // YYYY-MM-DD or ''
  onChange: (date: string) => void
  maxDate?: Date
  minDate?: Date
  placeholder?: string
  className?: string
  /** 스크린리더용 이름 (예: 입사일). 화면의 <label>과 같은 문구를 넘기면 됨 */
  label?: string
  id?: string
}

const KEY_STEP: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }

// ponytail: 문구가 한국어 고정 — 영어 UI에서도 달력은 한국어. 필요해지면 locale prop 추가
export default function DatePicker({ value, onChange, maxDate, minDate, placeholder = '날짜 선택', className = '', label, id }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(() =>
    value ? new Date(value + 'T00:00:00') : new Date()
  )
  const [focused, setFocused] = useState<Date | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  const selectedDate = value ? new Date(value + 'T00:00:00') : null
  const isDisabled = (d: Date) => !!((maxDate && isAfter(d, maxDate)) || (minDate && isAfter(minDate, d)))

  const close = useCallback((refocus: boolean) => {
    setIsOpen(false)
    if (refocus) triggerRef.current?.focus()
  }, [])

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) close(false)
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, close])

  // 열릴 때 선택일(없으면 오늘)로 포커스
  const open = () => {
    const start = selectedDate ?? new Date()
    setCurrentMonth(start)
    setFocused(start)
    setIsOpen(true)
  }

  useEffect(() => {
    if (!isOpen || !focused) return
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${format(focused, 'yyyy-MM-dd')}"]`)?.focus()
  }, [isOpen, focused])

  const handleSelect = useCallback((date: Date) => {
    onChange(format(date, 'yyyy-MM-dd'))
    close(true)
  }, [onChange, close])

  const moveFocus = (d: Date) => {
    setFocused(d)
    if (!isSameMonth(d, currentMonth)) setCurrentMonth(d)
  }

  const onGridKey = (e: React.KeyboardEvent) => {
    const step = KEY_STEP[e.key]
    if (!step || !focused) return
    e.preventDefault()
    moveFocus(addDays(focused, step))
  }

  const prevMonth = () => moveFocus(subMonths(focused ?? currentMonth, 1))
  const nextMonth = () => moveFocus(addMonths(focused ?? currentMonth, 1))

  // 달력 날짜 그리드 생성
  const renderDays = () => {
    const monthStart = startOfMonth(currentMonth)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const calEnd = endOfWeek(endOfMonth(monthStart), { weekStartsOn: 0 })
    const today = new Date()

    const days: React.ReactElement[] = []
    for (let d = calStart; d <= calEnd; d = addDays(d, 1)) {
      const day = d
      const inMonth = isSameMonth(day, monthStart)
      const isSelected = !!selectedDate && isSameDay(day, selectedDate)
      const isToday = isSameDay(day, today)
      const disabled = isDisabled(day)
      const isFocused = !!focused && isSameDay(day, focused)

      days.push(
        <button
          key={day.toISOString()}
          type="button"
          data-day={format(day, 'yyyy-MM-dd')}
          disabled={disabled}
          tabIndex={isFocused ? 0 : -1}
          onClick={() => handleSelect(day)}
          onFocus={() => setFocused(day)}
          aria-label={format(day, 'yyyy년 M월 d일 EEEE', { locale: ko })}
          aria-pressed={isSelected}
          aria-current={isToday ? 'date' : undefined}
          className={`w-9 h-9 rounded-lg text-sm font-medium tabular-nums transition-colors
            ${!inMonth ? 'text-faint opacity-60' : ''}
            ${inMonth && !isSelected && !disabled ? 'text-body hover:bg-primary-soft' : ''}
            ${isSelected ? 'bg-primary text-white' : ''}
            ${isToday && !isSelected ? 'ring-1 ring-primary' : ''}
            ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {format(day, 'd')}
        </button>
      )
    }
    return days
  }

  const canGoNext = !maxDate || !isAfter(startOfMonth(addMonths(currentMonth, 1)), maxDate)
  const valueText = selectedDate ? format(selectedDate, 'yyyy년 M월 d일 (EEE)', { locale: ko }) : placeholder

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      onKeyDown={e => { if (e.key === 'Escape' && isOpen) { e.stopPropagation(); close(true) } }}
    >
      {/* 트리거 버튼 */}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        onClick={() => (isOpen ? close(false) : open())}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={label ? `${label}, ${valueText}` : undefined}
        className="ui-field w-full min-h-11 flex items-center gap-2 px-3 py-2 text-sm text-left"
      >
        <Calendar className="w-4 h-4 text-faint shrink-0" aria-hidden="true" />
        <span className={selectedDate ? 'text-fg' : 'text-faint'}>{valueText}</span>
      </button>

      {/* 캘린더 팝오버 */}
      {isOpen && (
        <div role="dialog" aria-label={label ?? placeholder} className="absolute z-50 mt-1 p-3 w-[300px] max-w-[calc(100vw-2rem)] bg-surface border border-line rounded-2xl shadow-xl">
          {/* 월 네비게이션 */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth} aria-label="이전 달" className="p-2 rounded-lg hover:bg-soft text-sub transition-colors">
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </button>
            <span className="text-sm font-semibold text-fg" aria-live="polite">
              {format(currentMonth, 'yyyy년 M월', { locale: ko })}
            </span>
            <button type="button" onClick={nextMonth} disabled={!canGoNext} aria-label="다음 달" className="p-2 rounded-lg hover:bg-soft text-sub transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 gap-0.5 mb-1" aria-hidden="true">
            {['일', '월', '화', '수', '목', '금', '토'].map(d => (
              <div key={d} className="w-9 h-6 flex items-center justify-center text-xs font-medium text-faint">{d}</div>
            ))}
          </div>

          {/* 날짜 그리드 — 화살표로 이동, Enter로 선택, Esc로 닫기 */}
          <div ref={gridRef} className="grid grid-cols-7 gap-0.5" onKeyDown={onGridKey}>
            {renderDays()}
          </div>

          {/* 오늘 버튼 */}
          <div className="mt-2 pt-2 border-t border-line flex justify-center">
            <button
              type="button"
              onClick={() => handleSelect(new Date())}
              className="px-3 py-2 text-sm text-primary font-medium rounded-lg hover:bg-primary-soft"
            >
              오늘
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
