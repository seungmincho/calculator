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
}

export default function DatePicker({ value, onChange, maxDate, minDate, placeholder = '날짜 선택', className = '' }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(() =>
    value ? new Date(value + 'T00:00:00') : new Date()
  )
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedDate = value ? new Date(value + 'T00:00:00') : null

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSelect = useCallback((date: Date) => {
    onChange(format(date, 'yyyy-MM-dd'))
    setIsOpen(false)
  }, [onChange])

  const prevMonth = useCallback(() => setCurrentMonth(prev => subMonths(prev, 1)), [])
  const nextMonth = useCallback(() => setCurrentMonth(prev => addMonths(prev, 1)), [])

  // 달력 날짜 그리드 생성
  const renderDays = () => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(monthStart)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

    const days: React.ReactElement[] = []
    let day = calStart

    while (day <= calEnd) {
      const d = day
      const inMonth = isSameMonth(d, monthStart)
      const isSelected = selectedDate && isSameDay(d, selectedDate)
      const isToday = isSameDay(d, new Date())
      const isDisabled = (maxDate && isAfter(d, maxDate)) || (minDate && isAfter(minDate, d))

      days.push(
        <button
          key={d.toISOString()}
          type="button"
          disabled={!!isDisabled}
          onClick={() => handleSelect(d)}
          className={`
            w-8 h-8 rounded-md text-xs font-medium transition-colors
            ${!inMonth ? 'text-gray-300 dark:text-gray-600' : ''}
            ${inMonth && !isSelected && !isDisabled ? 'text-body hover:bg-blue-100 dark:hover:bg-blue-900/40' : ''}
            ${isSelected ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
            ${isToday && !isSelected ? 'ring-1 ring-blue-400' : ''}
            ${isDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          {format(d, 'd')}
        </button>
      )
      day = addDays(day, 1)
    }
    return days
  }

  const canGoNext = !maxDate || !isAfter(startOfMonth(addMonths(currentMonth, 1)), maxDate)

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* 트리거 버튼 */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-field dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-left"
      >
        <Calendar className="w-4 h-4 text-faint shrink-0" />
        {selectedDate ? (
          <span className="text-fg">
            {format(selectedDate, 'yyyy년 M월 d일 (EEE)', { locale: ko })}
          </span>
        ) : (
          <span className="text-faint">{placeholder}</span>
        )}
      </button>

      {/* 캘린더 팝오버 */}
      {isOpen && (
        <div className="absolute z-50 mt-1 p-3 w-[280px] bg-surface border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl">
          {/* 월 네비게이션 */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-sub transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-fg">
              {format(currentMonth, 'yyyy년 M월', { locale: ko })}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              disabled={!canGoNext}
              className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-sub transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {['일', '월', '화', '수', '목', '금', '토'].map(d => (
              <div key={d} className="w-8 h-6 flex items-center justify-center text-xs font-medium text-faint">
                {d}
              </div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div className="grid grid-cols-7 gap-0.5">
            {renderDays()}
          </div>

          {/* 오늘 버튼 */}
          <div className="mt-2 pt-2 border-t border-line flex justify-center">
            <button
              type="button"
              onClick={() => {
                const today = new Date()
                setCurrentMonth(today)
                handleSelect(today)
              }}
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
            >
              오늘
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
