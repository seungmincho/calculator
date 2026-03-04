'use client'

import { useState, useRef, useEffect } from 'react'
import { Clock, ChevronUp, ChevronDown } from 'lucide-react'

interface Props {
  value: string       // HH:MM
  onChange: (val: string) => void
  className?: string
}

const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

function formatDisplay(h: number, m: number): string {
  const period = h < 12 ? '오전' : '오후'
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${period} ${String(displayH).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export default function CustomTimePicker({ value, onChange, className = '' }: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const hourListRef = useRef<HTMLDivElement>(null)
  const [dropUp, setDropUp] = useState(false)

  const parseTime = (v: string) => {
    if (!v) return { h: 9, m: 0 }
    const [hStr, mStr] = v.split(':')
    return { h: parseInt(hStr) || 0, m: parseInt(mStr) || 0 }
  }

  const { h: hour, m: minute } = parseTime(value)

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
      setDropUp(window.innerHeight - rect.bottom < 280)
      // 선택된 시간으로 스크롤
      setTimeout(() => {
        if (hourListRef.current) {
          const btn = hourListRef.current.querySelector('[data-selected="true"]')
          btn?.scrollIntoView({ block: 'center', behavior: 'instant' })
        }
      }, 10)
    }
  }, [open])

  const setHour = (h: number) => {
    onChange(`${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`)
  }
  const setMinute = (m: number) => {
    onChange(`${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  }
  const adjustHour = (delta: number) => {
    const newH = (hour + delta + 24) % 24
    setHour(newH)
  }
  const adjustMinute = (delta: number) => {
    const idx = MINUTES.indexOf(minute)
    const newIdx = (idx + delta + MINUTES.length) % MINUTES.length
    setMinute(MINUTES[newIdx])
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-2 px-3 py-2 border rounded-xl bg-white dark:bg-gray-700 text-left text-sm transition-all
          ${open ? 'border-blue-500 ring-2 ring-blue-500/20 dark:border-blue-400' : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'}`}
      >
        <Clock className="w-4 h-4 text-blue-500 flex-shrink-0" />
        <span className="text-gray-900 dark:text-white font-medium">
          {formatDisplay(hour, minute)}
        </span>
      </button>

      {open && (
        <div className={`absolute z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-2xl shadow-2xl p-4 w-56
          ${dropUp ? 'bottom-full mb-1' : 'top-full mt-1'}`}
        >
          <p className="text-xs text-gray-400 text-center mb-3 font-medium">시간 선택</p>

          <div className="flex gap-3">
            {/* 시 */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">시</span>
                <div className="flex gap-1">
                  <button onClick={() => adjustHour(-1)} className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                    <ChevronUp className="w-3 h-3 text-gray-400" />
                  </button>
                  <button onClick={() => adjustHour(1)} className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                    <ChevronDown className="w-3 h-3 text-gray-400" />
                  </button>
                </div>
              </div>
              <div
                ref={hourListRef}
                className="h-36 overflow-y-auto space-y-0.5 scrollbar-thin scroll-smooth pr-1"
                style={{ scrollbarWidth: 'thin' }}
              >
                {Array.from({ length: 24 }).map((_, h) => {
                  const selected = h === hour
                  const period = h < 12 ? '오전' : '오후'
                  const label = h === 0 ? '자정' : h === 12 ? '정오' : `${period} ${h > 12 ? h - 12 : h}시`
                  return (
                    <button
                      key={h}
                      data-selected={selected ? 'true' : 'false'}
                      onClick={() => setHour(h)}
                      className={`w-full px-2 py-1.5 rounded-lg text-xs transition-colors text-left ${
                        selected
                          ? 'bg-blue-600 text-white font-semibold'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span className="font-mono">{String(h).padStart(2, '0')}:00</span>
                      <span className={`ml-1 text-[10px] ${selected ? 'text-blue-200' : 'text-gray-400'}`}>{label.replace(/오전 |오후 /, '').replace('시', '')}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 분 */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">분</span>
                <div className="flex gap-1">
                  <button onClick={() => adjustMinute(-1)} className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                    <ChevronUp className="w-3 h-3 text-gray-400" />
                  </button>
                  <button onClick={() => adjustMinute(1)} className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                    <ChevronDown className="w-3 h-3 text-gray-400" />
                  </button>
                </div>
              </div>
              <div className="space-y-0.5">
                {MINUTES.map(m => (
                  <button
                    key={m}
                    onClick={() => { setMinute(m); setOpen(false) }}
                    className={`w-full px-2 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                      m === minute
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    :{String(m).padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 현재 선택 표시 + 확인 */}
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
              {formatDisplay(hour, minute)}
            </span>
            <button
              onClick={() => setOpen(false)}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
