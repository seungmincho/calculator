'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from '@/hooks/useSearchParams'
import { Share2, Check, Save, Info } from 'lucide-react'
import CalculationHistory from './CalculationHistory'
import { useCalculationHistory } from '@/hooks/useCalculationHistory'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/workHours'
import CustomDatePicker from './CustomDatePicker'
import CustomTimePicker from './CustomTimePicker'
import ShareResult from './ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import { INSURANCE } from '@/utils/insuranceRates'
import { MIN_WAGE_2026, WEEKS_PER_MONTH, calcPay, legalMinBreak, toMin, weekOf, BREAK_WAIVER_FROM, EI_INCOME_BASIS_FROM, type Shift } from '@/utils/workHours'
import { todayKST } from '@/utils/dday'

// ─── 상수 ─────────────────────────────────────────────
const INSURANCE_RATES = {
  nationalPension: INSURANCE.pensionRate,
  healthInsurance: INSURANCE.healthRate,
  longTermCare: INSURANCE.healthRate * INSURANCE.longTermCareRate, // 보수 대비 (건강보험료 × 13.14%)
  employmentInsurance: INSURANCE.employmentRate,
}
const PRESETS = [
  { id: 'convenience', startTime: '22:00', endTime: '06:00', breakTime: 30 },
  { id: 'cafe',        startTime: '09:00', endTime: '15:00', breakTime: 30 },
  { id: 'restaurant',  startTime: '17:00', endTime: '22:00', breakTime: 30 },
  { id: 'office',      startTime: '09:00', endTime: '18:00', breakTime: 60 },
  { id: 'logistics',   startTime: '08:00', endTime: '17:00', breakTime: 60 },
] as const

const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']
const WEEKDAY_COLORS = ['text-body', 'text-body', 'text-body', 'text-body', 'text-body', 'text-blue-600 dark:text-blue-400', 'text-red-500']
const BREAK_OPTIONS = [0, 30, 60, 90]

// ─── 타입 ─────────────────────────────────────────────
interface DayWork {
  date: string; startTime: string; endTime: string; breakTime: number; isHoliday: boolean
}
interface DaySlot { on: boolean; start: string; end: string; brk: number; hol: boolean }
interface ConversionResult {
  daily: number; weekly: number; weeklyWithHoliday: number
  monthly: number; monthlyWithHoliday: number; yearly: number; yearlyWithHoliday: number
  weeklyHolidayPay: number; isEligibleWeeklyHoliday: boolean
  deductions: { nationalPension: number; healthInsurance: number; longTermCare: number; employmentInsurance: number; total: number }
  netMonthly: number
}
type TabType = 'daily' | 'conversion'
type InputMode = 'weekly' | 'period' | 'individual'

// ─── 주간 스케줄 ───────────────────────────────────────
const makeWeek = (days: number[], start: string, end: string, brk: number): DaySlot[] =>
  WEEKDAY_LABELS.map((_, i) => ({ on: days.includes(i), start, end, brk, hol: false }))

const WEEK_PRESETS = [
  { key: 'fullTime', week: () => makeWeek([0, 1, 2, 3, 4], '09:00', '18:00', 60) },
  { key: 'part3',    week: () => makeWeek([0, 2, 4], '10:00', '14:30', 30) },
  { key: 'weekend',  week: () => makeWeek([5, 6], '10:00', '19:00', 60) },
  { key: 'night',    week: () => makeWeek([0, 1, 2, 3, 4], '22:00', '07:00', 60) },
] as const

// URL: 요일별 'HHMMHHMM{휴게}[h]', 쉬는 날은 빈 문자열, '_'로 구분
const encodeWeek = (w: DaySlot[]) =>
  w.map(d => d.on ? `${d.start.replace(':', '')}${d.end.replace(':', '')}${d.brk}${d.hol ? 'h' : ''}` : '').join('_')
function decodeWeek(v: string | null): DaySlot[] | null {
  if (!v) return null
  const parts = v.split('_')
  if (parts.length !== 7) return null
  const base = makeWeek([], '09:00', '18:00', 60)
  return parts.map((p, i) => {
    const m = p.match(/^(\d{2})(\d{2})(\d{2})(\d{2})(\d{1,3})(h?)$/)
    return m ? { on: true, start: `${m[1]}:${m[2]}`, end: `${m[3]}:${m[4]}`, brk: Number(m[5]), hol: m[6] === 'h' } : base[i]
  })
}

// 날짜별 입력 URL: 'YYYYMMDDHHMMHHMM{휴게}[h]', 날짜가 있는 행만 '_'로 구분 (최대 62행)
const encodeDays = (days: DayWork[]) =>
  days.filter(d => d.date).slice(0, 62)
    .map(d => `${d.date.replace(/-/g, '')}${d.startTime.replace(':', '')}${d.endTime.replace(':', '')}${d.breakTime}${d.isHoliday ? 'h' : ''}`).join('_')
function decodeDays(v: string | null): DayWork[] | null {
  const days = (v ?? '').split('_').slice(0, 62).flatMap(p => {
    const m = p.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{1,3})(h?)$/)
    return m ? [{ date: `${m[1]}-${m[2]}-${m[3]}`, startTime: `${m[4]}:${m[5]}`, endTime: `${m[6]}:${m[7]}`, breakTime: Number(m[8]), isHoliday: m[9] === 'h' }] : []
  })
  return days.length ? days : null
}

// 기간 + 요일 → DayWork[] 생성
function generateDaysFromPeriod(
  startDate: string, endDate: string,
  selectedWeekdays: boolean[], // [월,화,수,목,금,토,일] = [0..6], Mon=0
  startTime: string, endTime: string, breakTime: number
): DayWork[] {
  if (!startDate || !endDate) return []
  const cur = new Date(startDate + 'T00:00:00Z')
  const end = new Date(endDate + 'T00:00:00Z')
  const days: DayWork[] = []
  while (cur <= end && days.length < 400) {
    const idx = (cur.getUTCDay() + 6) % 7 // Mon=0,...,Sun=6
    if (selectedWeekdays[idx]) days.push({ date: cur.toISOString().slice(0, 10), startTime, endTime, breakTime, isHoliday: false })
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return days
}

// ─── 메인 컴포넌트 ─────────────────────────────────────
export default function WorkHoursCalculator() {
  const t = useTranslations('workHours')
  const tCommon = useTranslations('common')
  const searchParams = useSearchParams()

  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const v = searchParams.get('tab')
    return v === 'conversion' ? 'conversion' : 'daily'
  })
  const [inputMode, setInputMode] = useState<InputMode>(() => {
    const v = searchParams.get('mode')
    return v === 'individual' || v === 'period' ? v : 'weekly'
  })

  const [hourlyWage, setHourlyWage] = useState(() => searchParams.get('wage') || String(MIN_WAGE_2026))
  const [autoBreak, setAutoBreak] = useState(() => searchParams.get('auto') === '1')
  const [smallBiz, setSmallBiz] = useState(() => searchParams.get('small') === '1')

  // 주간 스케줄 모드
  const [schedule, setSchedule] = useState<DaySlot[]>(() => decodeWeek(searchParams.get('ws')) || WEEK_PRESETS[0].week())

  // 기간 입력 모드
  const [periodStart, setPeriodStart] = useState(() => searchParams.get('start') || '')
  const [periodEnd, setPeriodEnd] = useState(() => searchParams.get('end') || '')
  const [selectedWeekdays, setSelectedWeekdays] = useState(() => {
    const v = searchParams.get('days')
    if (v && v.length === 7) return v.split('').map(c => c === '1')
    return [true, true, true, true, true, false, false] // 월~금
  })
  const [periodStartTime, setPeriodStartTime] = useState(() => searchParams.get('st') || '09:00')
  const [periodEndTime, setPeriodEndTime] = useState(() => searchParams.get('et') || '18:00')
  const [periodBreakTime, setPeriodBreakTime] = useState(() => {
    const minutes = Number.parseInt(searchParams.get('break') ?? '', 10)
    return Number.isFinite(minutes) && minutes >= 0 && minutes <= 1440 ? minutes : 60
  })

  // 날짜별 입력 모드
  const [dailyWork, setDailyWork] = useState<DayWork[]>([
    { date: '', startTime: '09:00', endTime: '18:00', breakTime: 60, isHoliday: false }
  ])

  const [isCopied, setIsCopied] = useState(false)
  const [shareError, setShareError] = useState(false)
  const [showSaveButton, setShowSaveButton] = useState(false)

  // 시급 환산
  const [convWage, setConvWage] = useState(() => searchParams.get('cwage') || String(MIN_WAGE_2026))
  const [convWeeklyHours, setConvWeeklyHours] = useState(() => searchParams.get('chours') || '40')
  const [convDaysPerWeek, setConvDaysPerWeek] = useState(() => searchParams.get('cdays') || '5')

  const { histories, saveCalculation, removeHistory, clearHistories, loadFromHistory } = useCalculationHistory('workHours')

  // ─── 근무일 계산 ───────────────────────────────────────
  const generatedDays = useMemo(
    () => generateDaysFromPeriod(periodStart, periodEnd, selectedWeekdays, periodStartTime, periodEndTime, periodBreakTime),
    [periodStart, periodEnd, selectedWeekdays, periodStartTime, periodEndTime, periodBreakTime])

  const wageNum = parseFloat(hourlyWage) || 0
  const result = useMemo(() => {
    if (wageNum <= 0) return null
    const brk = (b: number) => autoBreak ? -1 : b
    let shifts: Shift[]
    if (inputMode === 'weekly') {
      shifts = schedule.filter(d => d.on).map(d => ({ week: 'w', start: d.start, end: d.end, breakMin: brk(d.brk), holiday: d.hol }))
    } else {
      const days = inputMode === 'period' ? generatedDays : dailyWork.filter(d => d.date && d.startTime && d.endTime)
      shifts = days.map(d => ({ week: weekOf(d.date), start: d.startTime, end: d.endTime, breakMin: brk(d.breakTime), holiday: d.isHoliday }))
    }
    const r = calcPay(shifts, wageNum, smallBiz)
    return r.workDayCount > 0 ? r : null
  }, [wageNum, autoBreak, smallBiz, inputMode, schedule, generatedDays, dailyWork])

  useEffect(() => { if (result) setShowSaveButton(true) }, [result])

  // 법 개정 안내는 마운트 후 KST 날짜로 (첫 렌더 = 정적 HTML)
  const [today, setToday] = useState('')
  useEffect(() => setToday(todayKST()), [])

  // ─── 시급 환산 ─────────────────────────────────────────
  const convResult = useMemo<ConversionResult | null>(() => {
    const wage = parseFloat(convWage)
    const wh = parseFloat(convWeeklyHours)
    const days = parseFloat(convDaysPerWeek)
    if (![wage, wh, days].every(Number.isFinite) || wage <= 0 || wh <= 0 || days <= 0) return null

    const hpd = wh / days
    const daily = hpd * wage
    const isEligible = wh >= 15
    const whHours = isEligible ? Math.min((wh / 40) * 8, 8) : 0
    const weeklyHolidayPay = whHours * wage

    const wpm = WEEKS_PER_MONTH
    const weekly = wh * wage
    const weeklyWithHoliday = weekly + weeklyHolidayPay
    const monthly = wh * wpm * wage
    const monthlyWithHoliday = (wh + whHours) * wpm * wage
    const yearly = monthly * 12
    const yearlyWithHoliday = monthlyWithHoliday * 12

    const base = monthlyWithHoliday
    const np = base * INSURANCE_RATES.nationalPension
    const hi = base * INSURANCE_RATES.healthInsurance
    const lt = base * INSURANCE_RATES.longTermCare
    const ei = base * INSURANCE_RATES.employmentInsurance
    const total = np + hi + lt + ei

    return { daily, weekly, weeklyWithHoliday, monthly, monthlyWithHoliday,
      yearly, yearlyWithHoliday, weeklyHolidayPay, isEligibleWeeklyHoliday: isEligible,
      deductions: { nationalPension: np, healthInsurance: hi, longTermCare: lt, employmentInsurance: ei, total },
      netMonthly: base - total }
  }, [convWage, convWeeklyHours, convDaysPerWeek])

  // 날짜별 입력은 마운트 후 URL에서 복원 (첫 렌더는 기본값 그대로) — 아래 URL 동기화보다 먼저 선언
  useEffect(() => {
    const days = decodeDays(searchParams.get('dw'))
    if (days) setDailyWork(days)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── URL 상태 동기화 ─────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    const s = url.searchParams
    const dailyKeys = ['mode', 'wage', 'auto', 'small', 'ws', 'start', 'end', 'days', 'st', 'et', 'break', 'dw']
    ;[...dailyKeys, 'hours', 'cwage', 'chours', 'cdays'].forEach(k => s.delete(k))
    s.set('tab', activeTab)
    if (activeTab === 'daily') {
      s.set('mode', inputMode)
      s.set('wage', hourlyWage)
      if (autoBreak) s.set('auto', '1')
      if (smallBiz) s.set('small', '1')
      if (inputMode === 'weekly') s.set('ws', encodeWeek(schedule))
      if (inputMode === 'period') {
        if (periodStart) s.set('start', periodStart)
        if (periodEnd) s.set('end', periodEnd)
        s.set('days', selectedWeekdays.map(b => b ? '1' : '0').join(''))
        s.set('st', periodStartTime)
        s.set('et', periodEndTime)
        s.set('break', String(periodBreakTime))
      }
      if (inputMode === 'individual' && encodeDays(dailyWork)) s.set('dw', encodeDays(dailyWork))
    } else {
      s.set('cwage', convWage)
      s.set('chours', convWeeklyHours)
      s.set('cdays', convDaysPerWeek)
    }
    window.history.replaceState({}, '', url)
  }, [activeTab, inputMode, hourlyWage, autoBreak, smallBiz, schedule, periodStart, periodEnd, selectedWeekdays, periodStartTime, periodEndTime, periodBreakTime, dailyWork, convWage, convWeeklyHours, convDaysPerWeek])

  // ─── 헬퍼 ─────────────────────────────────────────────
  const fmt = (n: number) => new Intl.NumberFormat('ko-KR').format(Math.round(n))
  const fmtH = (h: number) => String(Math.round(h * 10) / 10)

  const updateSlot = (i: number, patch: Partial<DaySlot>) =>
    setSchedule(prev => prev.map((d, j) => j === i ? { ...d, ...patch } : d))

  const copyToAll = () => {
    const src = schedule.find(d => d.on)
    if (src) setSchedule(prev => prev.map(d => d.on ? { ...d, start: src.start, end: src.end, brk: src.brk } : d))
  }

  const applyPreset = (presetId: string) => {
    const p = PRESETS.find(x => x.id === presetId)
    if (!p) return
    if (inputMode === 'weekly') {
      setSchedule(prev => prev.map(d => d.on ? { ...d, start: p.startTime, end: p.endTime, brk: p.breakTime } : d))
    } else if (inputMode === 'period') {
      setPeriodStartTime(p.startTime); setPeriodEndTime(p.endTime); setPeriodBreakTime(p.breakTime)
    } else {
      const updated = [...dailyWork]
      const last = updated[updated.length - 1]
      updated[updated.length - 1] = { ...last, startTime: p.startTime, endTime: p.endTime, breakTime: p.breakTime }
      setDailyWork(updated)
    }
  }

  const toggleWeekday = (i: number) => {
    const next = [...selectedWeekdays]
    next[i] = !next[i]
    setSelectedWeekdays(next)
  }

  const addWorkDay = () => {
    const last = dailyWork[dailyWork.length - 1]
    setDailyWork([...dailyWork, { date: '', startTime: last?.startTime || '09:00', endTime: last?.endTime || '18:00', breakTime: last?.breakTime ?? 60, isHoliday: false }])
  }
  const removeWorkDay = (i: number) => { if (dailyWork.length > 1) setDailyWork(dailyWork.filter((_, j) => j !== i)) }
  const updateWorkDay = (i: number, field: keyof DayWork, value: string | number | boolean) => {
    const u = [...dailyWork]; u[i] = { ...u[i], [field]: value }; setDailyWork(u)
  }

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    const copyWithSelection = () => {
      const ta = document.createElement('textarea')
      ta.value = url
      ta.style.position = 'fixed'
      ta.style.left = '-999999px'
      document.body.appendChild(ta)
      try {
        ta.select()
        return document.execCommand('copy')
      } finally {
        ta.remove()
      }
    }
    let copied = false
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(url); copied = true }
      else copied = copyWithSelection()
    } catch {
      try { copied = copyWithSelection() } catch { /* Clipboard permission denied. */ }
    }
    setShareError(!copied)
    setIsCopied(copied)
    if (copied) setTimeout(() => setIsCopied(false), 2000)
  }

  const handleSave = () => {
    if (!result) return
    saveCalculation(
      { hourlyWage: wageNum, totalHours: result.totalHours },
      { basicPay: result.basicPay, overtimePay: result.overtimePay, nightPay: result.nightPay, holidayPay: result.holidayPay + result.holidayOverPay, weeklyHolidayPay: result.weeklyHolidayPay, totalPay: result.totalPay }
    )
    setShowSaveButton(false)
  }

  const presetKeys = ['presetConvenience', 'presetCafe', 'presetRestaurant', 'presetOffice', 'presetLogistics'] as const
  const chip = 'px-2.5 py-1 rounded-full text-xs font-medium bg-soft text-sub hover:bg-subtle transition-colors'
  const segBtn = (active: boolean) => `flex-1 py-2 rounded-lg text-xs font-medium transition-all ${active ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-fg'}`

  // ─── 결과 패널 ─────────────────────────────────────────
  const renderResult = () => {
    if (!result) return (
      <div className="ui-card p-10 text-center">
        <p className="text-sm text-muted">{t('placeholder')}</p>
      </div>
    )
    const wk = result.weeks
    const over52 = !smallBiz && wk.some(w => w.over52)
    const maxWeekH = Math.max(...wk.map(w => w.hours))
    const rows = [
      { label: t('result.basicPay'), h: result.basicHours, v: result.basicPay, plus: false },
      { label: t('result.overtimePay'), h: result.overtimeHours, v: result.overtimePay, plus: true },
      { label: t('result.nightPay'), h: result.nightHours, v: result.nightPay, plus: true },
      { label: t('result.holidayPay'), h: result.holidayHours, v: result.holidayPay, plus: true },
      { label: t('result.holidayOverPay'), h: result.holidayOver8Hours, v: result.holidayOverPay, plus: true },
      { label: t('result.weeklyHolidayPay'), h: wk.reduce((a, w) => a + w.weeklyHolidayHours, 0), v: result.weeklyHolidayPay, plus: true },
    ]
    return (
      <>
        <div id="work-hours-calculator-result" className="ui-card p-6 scroll-mt-20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-fg">
              {inputMode === 'weekly' ? t('result.weeklyTitle') : t('result.title')}
            </h3>
            <div className="flex gap-2">
              <button onClick={handleShare} className="ui-btn-soft flex items-center gap-1 px-3 py-1.5 text-xs">
                {isCopied ? <><Check className="w-3 h-3" />{tCommon('copied')}</> : <><Share2 className="w-3 h-3" />{t('result.shareResult')}</>}
              </button>
              {showSaveButton && (
                <button onClick={handleSave} className="ui-btn-soft flex items-center gap-1 px-3 py-1.5 text-xs">
                  <Save className="w-3 h-3" />{tCommon('save')}
                </button>
              )}
            </div>
          </div>
          {shareError && <p role="alert" className="mb-3 text-sm text-red-600">{t('result.shareFailed')}</p>}
          <div className="text-3xl font-bold text-fg tabular-nums" aria-live="polite">{fmt(result.totalPay)}원</div>
          <div className="text-sm text-muted mt-1">
            {t('result.totalHours')} {fmtH(result.totalHours)}{t('result.hours')} · {result.workDayCount}{t('result.days')}
            {wk.length > 1 && ` · ${t('result.weeksCount', { count: wk.length })}`}
          </div>
          <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-line">
            <div>
              <div className="text-xs text-muted mb-1">{t('result.monthlyAvg')}</div>
              <div className="text-lg font-bold text-fg tabular-nums">{fmt(result.monthlyPay)}원</div>
            </div>
            <div>
              <div className="text-xs text-muted mb-1">{t('result.yearlyAvg')}</div>
              <div className="text-lg font-bold text-fg tabular-nums">{fmt(result.monthlyPay * 12)}원</div>
            </div>
          </div>
        </div>

        <ShareResult
          fileName="work-hours-pay"
          card={{
            tool: t('title'),
            label: t(inputMode === 'weekly' ? 'share.labelWeekly' : 'share.labelPeriod', { wage: fmt(wageNum), hours: fmtH(result.totalHours), days: result.workDayCount }),
            headline: `${fmt(result.totalPay)}${t('share.won')}`,
            sub: t('share.sub', { monthly: fmt(result.monthlyPay), yearly: fmt(result.monthlyPay * 12) }),
            rows: rows.filter((r, i) => i === 0 || r.v > 0).map(r => ({ label: r.label, value: `${fmt(r.v)}${t('share.won')}` })),
          }}
          text={t('share.text', { hours: fmtH(result.totalHours), total: fmt(result.totalPay) })}
        />

        {(over52 || wageNum < MIN_WAGE_2026 || (!autoBreak && result.breakShortDays > 0)) && (
          <div className="rounded-2xl p-4 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200 text-sm space-y-1">
            {over52 && <p>{t('warn.over52', { hours: fmtH(maxWeekH) })}</p>}
            {wageNum < MIN_WAGE_2026 && <p>{t('warn.belowMin', { min: fmt(MIN_WAGE_2026) })}</p>}
            {!autoBreak && result.breakShortDays > 0 && <p>{t('warn.breakShort', { count: result.breakShortDays })}{today >= BREAK_WAIVER_FROM && ' ' + t('law.breakWaiverWarn')}</p>}
          </div>
        )}

        <div className="ui-card p-5">
          <h4 className="text-sm font-bold text-fg mb-3">{t('result.breakdown')}</h4>
          <div className="divide-y divide-line">
            {rows.filter((r, i) => i === 0 || r.v > 0).map(r => (
              <div key={r.label} className="flex justify-between py-2 text-sm">
                <span className="text-sub">{r.label} <span className="text-xs text-muted">({fmtH(r.h)}{t('result.hours')})</span></span>
                <span className="font-semibold text-fg tabular-nums">{r.plus ? '+' : ''}{fmt(r.v)}원</span>
              </div>
            ))}
          </div>
          {smallBiz && <p className="text-xs text-muted mt-3">{t('result.smallBizNote')}</p>}
        </div>

        <div className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-2">
          <h4 className="font-semibold text-fg">{t('weeklyHoliday.title')}</h4>
          {wk.length === 1 ? (
            <p>{wk[0].eligible
              ? t('weeklyHoliday.eligible', { contract: fmtH(wk[0].contractHours), hours: fmtH(wk[0].weeklyHolidayHours) })
              : t('weeklyHoliday.notEligible', { contract: fmtH(wk[0].contractHours) })}</p>
          ) : (
            <>
              <p>{t('weeklyHoliday.summary', { eligible: wk.filter(w => w.eligible).length, total: wk.length })}</p>
              <table className="w-full text-xs tabular-nums">
                <thead><tr className="text-muted text-left">
                  <th className="font-medium py-1">{t('weeklyHoliday.weekOf')}</th>
                  <th className="font-medium py-1 text-right">{t('weeklyHoliday.workHours')}</th>
                  <th className="font-medium py-1 text-right">{t('weeklyHoliday.paidHours')}</th>
                </tr></thead>
                <tbody>
                  {wk.map(w => (
                    <tr key={w.week} className="border-t border-line">
                      <td className="py-1">{w.week.slice(5).replace('-', '/')}~</td>
                      <td className={`py-1 text-right ${!smallBiz && w.over52 ? 'text-red-600 dark:text-red-400 font-semibold' : ''}`}>{fmtH(w.hours)}</td>
                      <td className="py-1 text-right">{fmtH(w.weeklyHolidayHours)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          <p className="text-xs text-muted">{t('weeklyHoliday.note')}</p>
        </div>
      </>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
          <p className="text-sm text-muted mt-1">{t('description')}</p>
        </div>
        <CalculationHistory
          histories={histories} isLoading={false}
          onLoadHistory={(id) => {
            const inp = loadFromHistory(id)
            if (inp) setHourlyWage(inp.hourlyWage?.toString() || String(MIN_WAGE_2026))
          }}
          onRemoveHistory={removeHistory} onClearHistories={clearHistories}
          formatResult={(result: Record<string, unknown>) => {
            const totalPay = Number(result.totalPay) || 0
            if (!totalPay) return t('history.empty')
            return `${fmt(totalPay)}원`
          }}
        />
      </div>

      {/* 탭 */}
      <div className="flex gap-1 bg-soft rounded-xl p-1 w-fit">
        {(['daily', 'conversion'] as TabType[]).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab ? 'bg-primary text-white shadow-sm' : 'text-sub hover:text-fg'}`}
          >
            {t(`tabs.${tab}`)}
          </button>
        ))}
      </div>

      {/* ═══ 탭 1: 근무일 계산 ═══ */}
      {activeTab === 'daily' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="ui-card p-6 space-y-5">
            {result && <MobileResultLink href="#work-hours-calculator-result" label={inputMode === 'weekly' ? t('result.weeklyTitle') : t('result.title')} value={`${fmt(result.totalPay)}${t('share.won')}`} />}
            {/* 시급 */}
            <div>
              <label htmlFor="wh-hourly-wage" className="block text-xs font-medium text-muted mb-1.5">{t('input.hourlyWage')}</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input id="wh-hourly-wage" type="number" inputMode="numeric" value={hourlyWage} onChange={e => setHourlyWage(e.target.value)}
                    className="ui-field w-full pl-3 pr-8 py-2.5 text-sm" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">원</span>
                </div>
                <button onClick={() => setHourlyWage(String(MIN_WAGE_2026))} className="ui-btn-soft px-3 py-2 text-xs whitespace-nowrap">
                  {t('input.useMinWage')}
                </button>
              </div>
              <p className="text-xs text-muted mt-1">
                {t('input.hourlyWageNote')}{' '}
                <a href="https://www.moel.go.kr/news/enews/report/enewsView.do?news_seq=19744" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  {t('input.minWageSource')}
                </a>
              </p>
            </div>

            {/* 옵션 */}
            <div className="space-y-2">
              <label className="flex items-start gap-2 text-sm text-body cursor-pointer">
                <input type="checkbox" checked={autoBreak} onChange={e => setAutoBreak(e.target.checked)} className="accent-blue-600 mt-0.5" />
                <span>{t('input.autoBreak')}<span className="block text-xs text-muted">{t('input.autoBreakNote')}</span>
                  {today && <span className="block text-xs text-muted mt-0.5">{t(today >= BREAK_WAIVER_FROM ? 'law.breakAfter' : 'law.breakBefore')}</span>}</span>
              </label>
              <label className="flex items-start gap-2 text-sm text-body cursor-pointer">
                <input type="checkbox" checked={smallBiz} onChange={e => setSmallBiz(e.target.checked)} className="accent-blue-600 mt-0.5" />
                <span>{t('input.smallBusiness')}<span className="block text-xs text-muted">{t('input.smallBusinessNote')}</span></span>
              </label>
            </div>

            {/* 입력 방식 전환 */}
            <div className="flex gap-1 bg-soft rounded-xl p-1">
              {(['weekly', 'period', 'individual'] as InputMode[]).map(m => (
                <button key={m} onClick={() => setInputMode(m)} className={segBtn(inputMode === m)}>
                  {t(`input.${m}Mode`)}
                </button>
              ))}
            </div>

            {/* 빠른 입력 */}
            <div>
              <p className="text-xs font-medium text-muted mb-2">{t('input.presets')}</p>
              <div className="flex flex-wrap gap-1.5">
                {inputMode === 'weekly' && WEEK_PRESETS.map(p => (
                  <button key={p.key} onClick={() => setSchedule(p.week())} className={chip}>{t(`weekPreset.${p.key}`)}</button>
                ))}
                {presetKeys.map((key, i) => (
                  <button key={key} onClick={() => applyPreset(PRESETS[i].id)} className={chip}>{t(`input.${key}`)}</button>
                ))}
              </div>
            </div>

            {/* ── 주간 스케줄 모드 ── */}
            {inputMode === 'weekly' && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-medium text-muted">{t('input.weeklySchedule')}</label>
                  <button onClick={copyToAll} className="text-xs text-primary hover:underline">{t('input.copyToAll')}</button>
                </div>
                <div className="grid grid-cols-[2.25rem_1fr_1fr_4.25rem_2.5rem] gap-x-1.5 gap-y-1.5 items-center text-sm">
                  <span />
                  <span className="text-xs text-muted">{t('input.startTime')}</span>
                  <span className="text-xs text-muted">{t('input.endTime')}</span>
                  <span className="text-xs text-muted">{t('input.breakTime')}</span>
                  <span className="text-xs text-muted text-center">{t('input.holidayShort')}</span>
                  {schedule.map((d, i) => {
                    const span = (() => { const a = toMin(d.start); let b = toMin(d.end); if (b <= a) b += 1440; return b - a })()
                    const dim = d.on ? '' : 'opacity-40'
                    return [
                      <button key={`d${i}`} onClick={() => updateSlot(i, { on: !d.on })} aria-pressed={d.on}
                        className={`h-9 rounded-lg text-xs font-bold transition-colors ${d.on ? 'bg-primary text-white' : `bg-soft ${WEEKDAY_COLORS[i]} opacity-60`}`}>
                        {WEEKDAY_LABELS[i]}
                      </button>,
                      <input key={`s${i}`} type="time" value={d.start} disabled={!d.on} aria-label={`${WEEKDAY_LABELS[i]} ${t('input.startTime')}`}
                        onChange={e => updateSlot(i, { start: e.target.value || d.start })} className={`ui-field w-full min-w-0 px-2 py-1.5 text-sm ${dim}`} />,
                      <input key={`e${i}`} type="time" value={d.end} disabled={!d.on} aria-label={`${WEEKDAY_LABELS[i]} ${t('input.endTime')}`}
                        onChange={e => updateSlot(i, { end: e.target.value || d.end })} className={`ui-field w-full min-w-0 px-2 py-1.5 text-sm ${dim}`} />,
                      <select key={`b${i}`} value={autoBreak ? legalMinBreak(span) : d.brk} disabled={!d.on || autoBreak} aria-label={`${WEEKDAY_LABELS[i]} ${t('input.breakTime')}`}
                        onChange={e => updateSlot(i, { brk: Number(e.target.value) })} className={`ui-field w-full px-1.5 py-1.5 text-sm ${dim}`}>
                        {BREAK_OPTIONS.map(m => <option key={m} value={m}>{m}분</option>)}
                      </select>,
                      <input key={`h${i}`} type="checkbox" checked={d.hol} disabled={!d.on} aria-label={`${WEEKDAY_LABELS[i]} ${t('input.holiday')}`}
                        onChange={e => updateSlot(i, { hol: e.target.checked })} className={`accent-blue-600 w-4 h-4 justify-self-center ${dim}`} />,
                    ]
                  })}
                </div>
                <p className="text-xs text-muted mt-2">{t('input.weeklyScheduleNote')}</p>
              </div>
            )}

            {/* ── 기간 입력 모드 ── */}
            {inputMode === 'period' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted mb-2">{t('input.startDate')} ~ {t('input.endDate')}</label>
                  <div className="grid grid-cols-2 gap-2">
                    <CustomDatePicker value={periodStart} onChange={setPeriodStart} placeholder={t('input.startDate')} />
                    <CustomDatePicker value={periodEnd} onChange={setPeriodEnd} placeholder={t('input.endDate')} />
                  </div>
                  {periodStart && periodEnd && generatedDays.length > 0 && (
                    <p className="text-xs text-sub mt-1.5">{t('input.totalWorkDays', { count: generatedDays.length })}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted mb-2">{t('input.workDays')}</label>
                  <div className="flex gap-1">
                    {WEEKDAY_LABELS.map((d, i) => (
                      <button key={d} onClick={() => toggleWeekday(i)} aria-pressed={selectedWeekdays[i]}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${selectedWeekdays[i] ? 'bg-primary text-white' : 'bg-soft text-faint'}`}
                      >{d}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted mb-2">{t('input.workTime')}</label>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <p className="text-xs text-muted mb-1">{t('input.startTime')}</p>
                      <CustomTimePicker value={periodStartTime} onChange={setPeriodStartTime} />
                    </div>
                    <div>
                      <p className="text-xs text-muted mb-1">{t('input.endTime')}</p>
                      <CustomTimePicker value={periodEndTime} onChange={setPeriodEndTime} />
                    </div>
                  </div>
                  {!autoBreak && (
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted">{t('input.breakTime')}</label>
                      <div className="flex gap-1">
                        {BREAK_OPTIONS.map(m => (
                          <button key={m} onClick={() => setPeriodBreakTime(m)}
                            className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${periodBreakTime === m ? 'bg-primary text-white' : 'bg-soft text-sub hover:bg-subtle'}`}
                          >{m}분</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── 날짜별 입력 모드 ── */}
            {inputMode === 'individual' && (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-xs font-medium text-muted">{t('input.workSchedule')}</label>
                  <button onClick={addWorkDay} className="ui-btn px-3 py-1 text-xs">{t('input.addDay')}</button>
                </div>
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {dailyWork.map((day, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-subtle">
                      <div className="mb-2">
                        <p className="text-xs text-muted mb-1">{t('input.date')}</p>
                        <CustomDatePicker value={day.date} onChange={v => updateWorkDay(idx, 'date', v)} placeholder={t('input.date')} />
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div>
                          <p className="text-xs text-muted mb-1">{t('input.startTime')}</p>
                          <CustomTimePicker value={day.startTime} onChange={v => updateWorkDay(idx, 'startTime', v)} />
                        </div>
                        <div>
                          <p className="text-xs text-muted mb-1">{t('input.endTime')}</p>
                          <CustomTimePicker value={day.endTime} onChange={v => updateWorkDay(idx, 'endTime', v)} />
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        {!autoBreak && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted">{t('input.breakTime')}</span>
                            <div className="flex gap-1">
                              {BREAK_OPTIONS.map(m => (
                                <button key={m} onClick={() => updateWorkDay(idx, 'breakTime', m)}
                                  className={`px-2 py-0.5 rounded text-xs transition-colors ${day.breakTime === m ? 'bg-primary text-white' : 'bg-soft text-sub'}`}
                                >{m}분</button>
                              ))}
                            </div>
                          </div>
                        )}
                        <label className="flex items-center gap-1 cursor-pointer ml-auto">
                          <input type="checkbox" checked={day.isHoliday} onChange={e => updateWorkDay(idx, 'isHoliday', e.target.checked)} className="accent-blue-600 w-3.5 h-3.5" />
                          <span className="text-xs text-sub">{t('input.holiday')}</span>
                        </label>
                        {dailyWork.length > 1 && (
                          <button onClick={() => removeWorkDay(idx)} className="px-2 py-0.5 bg-soft text-red-600 dark:text-red-400 rounded text-xs hover:bg-subtle transition-colors">
                            삭제
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 결과 */}
          <div className="space-y-4">{renderResult()}</div>
        </div>
      )}

      {/* ═══ 탭 2: 시급 환산 ═══ */}
      {activeTab === 'conversion' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="ui-card p-6 space-y-5">
            <h2 className="text-lg font-bold text-fg">{t('conversion.title')}</h2>
            <p className="text-xs text-muted">{t('conversion.description')}</p>

            <div>
              <label className="block text-xs font-medium text-muted mb-2">{t('conversion.hourlyWage')}</label>
              <div className="relative mb-2">
                <input type="number" value={convWage} onChange={e => setConvWage(e.target.value)}
                  className="ui-field w-full pl-3 pr-8 py-2.5" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">원</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {[MIN_WAGE_2026, 12000, 15000, 20000].map(w => (
                  <button key={w} onClick={() => setConvWage(String(w))}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${convWage === String(w) ? 'bg-primary text-white' : 'bg-soft text-sub hover:bg-subtle'}`}
                  >{fmt(w)}원</button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-2">{t('conversion.weeklyWorkHours')}</label>
                <input type="number" value={convWeeklyHours} onChange={e => setConvWeeklyHours(e.target.value)} min="1" max="68"
                  className="ui-field w-full px-3 py-2.5" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-2">{t('conversion.workDaysPerWeek')}</label>
                <div className="flex gap-1">
                  {[3, 4, 5, 6].map(d => (
                    <button key={d} onClick={() => setConvDaysPerWeek(String(d))}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${convDaysPerWeek === String(d) ? 'bg-primary text-white' : 'bg-soft text-sub hover:bg-subtle'}`}
                    >{d}일</button>
                  ))}
                </div>
              </div>
            </div>

            {convResult && (
              <div className="p-3 rounded-xl text-xs bg-subtle text-sub">
                {convResult.isEligibleWeeklyHoliday
                  ? `${t('conversion.eligibleWeeklyHoliday')} — 주휴수당 ${fmt(convResult.weeklyHolidayPay)}원/주`
                  : '주 15시간 미만 — 주휴수당 미발생'}
              </div>
            )}
          </div>

          {convResult && (
            <div className="space-y-4">
              <div className="ui-card p-5">
                <h3 className="text-sm font-bold text-fg mb-4">{t('conversion.wageTable')}</h3>
                <div className="divide-y divide-line">
                  {[
                    { label: t('conversion.daily'), value: convResult.daily, strong: false },
                    { label: `${t('conversion.weekly')} ${t('conversion.withoutHoliday')}`, value: convResult.weekly, strong: false },
                    convResult.isEligibleWeeklyHoliday ? { label: `${t('conversion.weekly')} ${t('conversion.withHoliday')}`, value: convResult.weeklyWithHoliday, strong: true } : null,
                    { label: `${t('conversion.monthly')} ${t('conversion.withHoliday')}`, value: convResult.monthlyWithHoliday, strong: true },
                    { label: `${t('conversion.yearly')} ${t('conversion.withHoliday')}`, value: convResult.yearlyWithHoliday, strong: true, big: true },
                  ].filter(Boolean).map((row, i) => row && (
                    <div key={i} className={`flex justify-between items-center py-3 ${row.big ? 'bg-subtle px-3 rounded-lg mt-1' : ''}`}>
                      <span className="text-sm text-sub">{row.label}</span>
                      <span className={`text-sm text-fg tabular-nums ${row.strong ? 'font-bold' : 'font-semibold'}`}>{fmt(row.value)}원</span>
                    </div>
                  ))}
                </div>
              </div>

              <ShareResult
                fileName="hourly-to-monthly"
                card={{
                  tool: t('title'),
                  label: t('share.convLabel', { wage: fmt(parseFloat(convWage)), hours: convWeeklyHours }),
                  headline: `${fmt(convResult.monthlyWithHoliday)}${t('share.won')}`,
                  sub: t('share.convSub', { net: fmt(convResult.netMonthly) }),
                  rows: [
                    { label: `${t('conversion.weekly')} ${t('conversion.withHoliday')}`, value: `${fmt(convResult.weeklyWithHoliday)}${t('share.won')}` },
                    { label: t('result.weeklyHolidayPay'), value: `${fmt(convResult.weeklyHolidayPay)}${t('share.won')}` },
                    { label: `${t('conversion.yearly')} ${t('conversion.withHoliday')}`, value: `${fmt(convResult.yearlyWithHoliday)}${t('share.won')}` },
                    { label: t('conversion.netMonthly'), value: `${fmt(convResult.netMonthly)}${t('share.won')}` },
                  ],
                }}
                text={t('share.convText', { wage: fmt(parseFloat(convWage)), hours: convWeeklyHours, monthly: fmt(convResult.monthlyWithHoliday) })}
              />

              <div className="ui-card p-5">
                <h3 className="text-sm font-bold text-fg mb-4">{t('conversion.insuranceTitle')}</h3>
                <div className="divide-y divide-line text-sm">
                  {[
                    { label: t('conversion.nationalPension'), value: convResult.deductions.nationalPension },
                    { label: t('conversion.healthInsurance'), value: convResult.deductions.healthInsurance },
                    { label: t('conversion.longTermCare'), value: convResult.deductions.longTermCare },
                    { label: t('conversion.employmentInsurance'), value: convResult.deductions.employmentInsurance },
                  ].map((r, i) => (
                    <div key={i} className="flex justify-between py-2">
                      <span className="text-sub">{r.label}</span>
                      <span className="font-medium text-body tabular-nums">-{fmt(r.value)}원</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 font-semibold">
                    <span className="text-body">{t('conversion.totalDeduction')}</span>
                    <span className="text-fg tabular-nums">-{fmt(convResult.deductions.total)}원</span>
                  </div>
                  <div className="flex justify-between items-center py-3 bg-subtle px-3 rounded-lg mt-1">
                    <div>
                      <span className="font-bold text-fg">{t('conversion.netMonthly')}</span>
                      <div className="text-xs text-muted">(4대보험 공제 후 예상액)</div>
                    </div>
                    <span className="text-xl font-bold text-fg tabular-nums">{fmt(convResult.netMonthly)}원</span>
                  </div>
                </div>
                <p className="text-xs text-muted mt-3">{t('conversion.insuranceNote')}</p>
                {today && <p className="text-xs text-muted mt-1">{t(today >= EI_INCOME_BASIS_FROM ? 'law.eiAfter' : 'law.eiBefore')}</p>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ 2026 최저임금 ═══ */}
      <div className="ui-card p-6">
        <h3 className="text-lg font-bold text-fg mb-5">{t('minimumWage.title')}</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { val: `${fmt(MIN_WAGE_2026)}원`, label: t('minimumWage.2026') },
            { val: `${fmt(MIN_WAGE_2026 * 209)}원`, label: t('minimumWage.monthly') },
            { val: '209시간', label: t('minimumWage.monthlyHours') },
          ].map((item, i) => (
            <div key={i} className="text-center p-4 bg-subtle rounded-xl">
              <div className="text-lg sm:text-xl font-bold text-fg tabular-nums mb-1">{item.val}</div>
              <div className="text-xs text-sub">{item.label}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted mt-4 text-center">{t('minimumWage.note')}</p>
      </div>

      {/* ═══ 근로기준법 가이드 ═══ */}
      <div className="ui-card p-6">
        <h3 className="text-lg font-bold text-fg mb-5">{t('guide.title')}</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-semibold text-fg mb-3">{t('guide.overtimeTitle')}</h4>
            <ul className="space-y-2 text-sm text-body">
              {[0,1,2,3].map(i => <li key={i}>• {t(`guide.overtime.${i}`)}</li>)}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-fg mb-3">{t('guide.allowanceTitle')}</h4>
            <ul className="space-y-2 text-sm text-body">
              {[0,1,2,3].map(i => <li key={i}>• {t(`guide.allowance.${i}`)}</li>)}
            </ul>
          </div>
        </div>
        <p className="flex items-start gap-1.5 text-xs text-muted mt-5">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />{t('guide.legalNote')}
        </p>
      </div>

      {/* ═══ 근로자 권리 ═══ */}
      <div className="ui-card p-6">
        <h3 className="text-lg font-bold text-fg mb-5">{t('rights.title')}</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-semibold text-fg mb-3">{t('rights.basicTitle')}</h4>
            <ul className="space-y-2 text-sm text-body">
              {[0,1,2,3].map(i => <li key={i}>• {t(`rights.basic.${i}`)}</li>)}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-fg mb-3">{t('rights.protectionTitle')}</h4>
            <ul className="space-y-2 text-sm text-body">
              {[0,1,2,3].map(i => <li key={i}>• {t(`rights.protection.${i}`)}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
