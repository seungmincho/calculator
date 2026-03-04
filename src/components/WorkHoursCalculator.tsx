'use client'

import { useState, useEffect, useCallback } from 'react'
import { Clock, Calculator, DollarSign, Users, Share2, Check, Save, Zap, TrendingUp, Shield, CalendarRange, CalendarDays, RefreshCw } from 'lucide-react'
import CalculationHistory from './CalculationHistory'
import { useCalculationHistory } from '@/hooks/useCalculationHistory'
import { useTranslations } from 'next-intl'
import CustomDatePicker from './CustomDatePicker'
import CustomTimePicker from './CustomTimePicker'

// ─── 상수 ─────────────────────────────────────────────
const MIN_WAGE_2026 = 10320
const INSURANCE_RATES = {
  nationalPension: 0.045,
  healthInsurance: 0.03545,
  longTermCare: 0.004591,
  employmentInsurance: 0.009,
}
const PRESETS = [
  { id: 'convenience', startTime: '22:00', endTime: '06:00', breakTime: 30 },
  { id: 'cafe',        startTime: '09:00', endTime: '15:00', breakTime: 30 },
  { id: 'restaurant',  startTime: '17:00', endTime: '22:00', breakTime: 30 },
  { id: 'office',      startTime: '09:00', endTime: '18:00', breakTime: 60 },
  { id: 'logistics',   startTime: '08:00', endTime: '17:00', breakTime: 60 },
] as const

const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']
const WEEKDAY_COLORS = ['text-gray-700 dark:text-gray-200', 'text-gray-700 dark:text-gray-200', 'text-gray-700 dark:text-gray-200', 'text-gray-700 dark:text-gray-200', 'text-gray-700 dark:text-gray-200', 'text-blue-600 dark:text-blue-400', 'text-red-500']

// ─── 타입 ─────────────────────────────────────────────
interface WorkHoursResult {
  basicPay: number; overtimePay: number; nightPay: number
  holidayPay: number; weeklyHolidayPay: number; totalPay: number
  totalHours: number; overtimeHours: number; nightHours: number; holidayHours: number
  workDayCount: number; weekCount: number
}
interface DayWork {
  date: string; startTime: string; endTime: string; breakTime: number; isHoliday: boolean
}
interface ConversionResult {
  daily: number; weekly: number; weeklyWithHoliday: number
  monthly: number; monthlyWithHoliday: number; yearly: number; yearlyWithHoliday: number
  weeklyHolidayPay: number; isEligibleWeeklyHoliday: boolean
  deductions: { nationalPension: number; healthInsurance: number; longTermCare: number; employmentInsurance: number; total: number }
  netMonthly: number
}
type TabType = 'daily' | 'conversion'
type InputMode = 'period' | 'individual'

// ─── 계산 로직 ─────────────────────────────────────────
function calcWorkHours(dailyWork: DayWork[], wage: number, weeklyStdHours: number): WorkHoursResult {
  let totalHours = 0, overtimeHours = 0, nightHours = 0, holidayHours = 0, workDays = 0

  dailyWork.forEach(day => {
    if (!day.date || !day.startTime || !day.endTime) return
    const start = new Date(`${day.date}T${day.startTime}`)
    const end = new Date(`${day.date}T${day.endTime}`)
    if (end <= start) end.setDate(end.getDate() + 1)
    const dayHours = ((end.getTime() - start.getTime()) / 60000 - day.breakTime) / 60
    if (dayHours <= 0) return

    workDays++
    totalHours += dayHours

    if (day.isHoliday) {
      holidayHours += dayHours
    } else {
      if (dayHours > 8) overtimeHours += dayHours - 8
    }

    // 야간근로 22:00~06:00
    const nightStart = new Date(`${day.date}T22:00`)
    const nightEnd = new Date(`${day.date}T06:00`)
    nightEnd.setDate(nightEnd.getDate() + 1)
    const os = Math.max(start.getTime(), nightStart.getTime())
    const oe = Math.min(end.getTime(), nightEnd.getTime())
    if (oe > os) nightHours += (oe - os) / 3600000
  })

  if (totalHours > weeklyStdHours) overtimeHours = Math.max(overtimeHours, totalHours - weeklyStdHours)

  const basicHours = Math.max(0, totalHours - overtimeHours - holidayHours)
  const basicPay = basicHours * wage
  const overtimePay = overtimeHours * wage * 1.5
  const nightPay = nightHours * wage * 0.5
  const holidayPay = holidayHours * wage * 1.5

  let weeklyHolidayPay = 0
  if (totalHours >= 15) {
    const whHours = Math.min((totalHours / weeklyStdHours) * 8, 8)
    weeklyHolidayPay = whHours * wage
  }

  const weekCount = Math.ceil(workDays / 7) || (workDays > 0 ? 1 : 0)

  return { basicPay, overtimePay, nightPay, holidayPay, weeklyHolidayPay,
    totalPay: basicPay + overtimePay + nightPay + holidayPay + weeklyHolidayPay,
    totalHours, overtimeHours, nightHours, holidayHours, workDayCount: workDays, weekCount }
}

// 기간 + 요일 → DayWork[] 생성
function generateDaysFromPeriod(
  startDate: string, endDate: string,
  selectedWeekdays: boolean[], // [월,화,수,목,금,토,일] = [0..6], Mon=0
  startTime: string, endTime: string, breakTime: number
): DayWork[] {
  if (!startDate || !endDate) return []
  const start = new Date(startDate + 'T12:00')
  const end = new Date(endDate + 'T12:00')
  if (start > end) return []

  const days: DayWork[] = []
  const cur = new Date(start)
  while (cur <= end) {
    const dow = cur.getDay() // 0=Sun,1=Mon,...,6=Sat
    const idx = dow === 0 ? 6 : dow - 1 // Mon=0,...,Sun=6
    if (selectedWeekdays[idx]) {
      const dateStr = cur.toISOString().split('T')[0]
      days.push({ date: dateStr, startTime, endTime, breakTime, isHoliday: false })
    }
    cur.setDate(cur.getDate() + 1)
  }
  return days
}

// ─── 메인 컴포넌트 ─────────────────────────────────────
export default function WorkHoursCalculator() {
  const t = useTranslations('workHours')
  const tCommon = useTranslations('common')

  const [activeTab, setActiveTab] = useState<TabType>('daily')
  const [inputMode, setInputMode] = useState<InputMode>('period')

  // 시급 / 소정근로시간
  const [hourlyWage, setHourlyWage] = useState(String(MIN_WAGE_2026))
  const [weeklyHours, setWeeklyHours] = useState('40')

  // 기간 입력 모드
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [selectedWeekdays, setSelectedWeekdays] = useState([true, true, true, true, true, false, false]) // 월~금
  const [periodStartTime, setPeriodStartTime] = useState('09:00')
  const [periodEndTime, setPeriodEndTime] = useState('18:00')
  const [periodBreakTime, setPeriodBreakTime] = useState(60)

  // 날짜별 입력 모드
  const [dailyWork, setDailyWork] = useState<DayWork[]>([
    { date: '', startTime: '09:00', endTime: '18:00', breakTime: 60, isHoliday: false }
  ])

  const [result, setResult] = useState<WorkHoursResult | null>(null)
  const [generatedDays, setGeneratedDays] = useState<DayWork[]>([])
  const [isCopied, setIsCopied] = useState(false)
  const [showSaveButton, setShowSaveButton] = useState(false)

  // 시급 환산
  const [convWage, setConvWage] = useState(String(MIN_WAGE_2026))
  const [convWeeklyHours, setConvWeeklyHours] = useState('40')
  const [convDaysPerWeek, setConvDaysPerWeek] = useState('5')
  const [convResult, setConvResult] = useState<ConversionResult | null>(null)

  const { histories, saveCalculation, removeHistory, clearHistories, loadFromHistory } = useCalculationHistory('workHours')

  // ─── 기간 모드 자동 계산 ───────────────────────────────
  const runPeriodCalc = useCallback(() => {
    const wage = parseFloat(hourlyWage)
    const wh = parseFloat(weeklyHours)
    if (!wage || wage <= 0 || !periodStart || !periodEnd) { setResult(null); return }
    const days = generateDaysFromPeriod(periodStart, periodEnd, selectedWeekdays, periodStartTime, periodEndTime, periodBreakTime)
    if (days.length === 0) { setResult(null); return }
    setGeneratedDays(days)
    setResult(calcWorkHours(days, wage, wh))
    setShowSaveButton(true)
  }, [hourlyWage, weeklyHours, periodStart, periodEnd, selectedWeekdays, periodStartTime, periodEndTime, periodBreakTime])

  useEffect(() => {
    if (inputMode === 'period') runPeriodCalc()
  }, [inputMode, runPeriodCalc])

  // ─── 날짜별 모드 자동 계산 ─────────────────────────────
  useEffect(() => {
    if (inputMode === 'individual') {
      const wage = parseFloat(hourlyWage)
      const wh = parseFloat(weeklyHours)
      if (!wage || wage <= 0) { setResult(null); return }
      if (!dailyWork.some(d => d.date && d.startTime && d.endTime)) { setResult(null); return }
      setResult(calcWorkHours(dailyWork, wage, wh))
      setShowSaveButton(true)
    }
  }, [inputMode, hourlyWage, weeklyHours, dailyWork])

  // ─── 시급 환산 ─────────────────────────────────────────
  useEffect(() => {
    const wage = parseFloat(convWage)
    const wh = parseFloat(convWeeklyHours)
    const days = parseFloat(convDaysPerWeek)
    if (!wage || wage <= 0 || !wh || wh <= 0 || !days || days <= 0) return

    const hpd = wh / days
    const daily = hpd * wage
    const isEligible = wh >= 15
    const whHours = isEligible ? Math.min((wh / 40) * 8, 8) : 0
    const weeklyHolidayPay = whHours * wage

    const wpm = 365 / 7 / 12
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

    setConvResult({ daily, weekly, weeklyWithHoliday, monthly, monthlyWithHoliday,
      yearly, yearlyWithHoliday, weeklyHolidayPay, isEligibleWeeklyHoliday: isEligible,
      deductions: { nationalPension: np, healthInsurance: hi, longTermCare: lt, employmentInsurance: ei, total },
      netMonthly: base - total })
  }, [convWage, convWeeklyHours, convDaysPerWeek])

  // ─── 헬퍼 ─────────────────────────────────────────────
  const fmt = (n: number) => new Intl.NumberFormat('ko-KR').format(Math.round(n))
  const fmtH = (h: number) => h.toFixed(1)

  const applyPreset = (presetId: string) => {
    const p = PRESETS.find(x => x.id === presetId)
    if (!p) return
    if (inputMode === 'period') {
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
    try {
      if (navigator?.clipboard?.writeText) await navigator.clipboard.writeText(url)
      else {
        const ta = document.createElement('textarea'); ta.value = url; ta.style.position = 'fixed'; ta.style.left = '-999999px'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      }
      setIsCopied(true); setTimeout(() => setIsCopied(false), 2000)
    } catch { /* noop */ }
  }

  const handleSave = () => {
    if (!result) return
    saveCalculation(
      { hourlyWage: parseFloat(hourlyWage), weeklyHours: parseFloat(weeklyHours), totalHours: result.totalHours },
      { basicPay: result.basicPay, overtimePay: result.overtimePay, nightPay: result.nightPay, holidayPay: result.holidayPay, weeklyHolidayPay: result.weeklyHolidayPay, totalPay: result.totalPay }
    )
    setShowSaveButton(false)
  }

  const presetKeys = ['presetConvenience', 'presetCafe', 'presetRestaurant', 'presetOffice', 'presetLogistics'] as const
  const presetBtnCls = [
    'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200',
    'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200',
    'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200',
    'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200',
    'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200',
  ]

  // ─── 결과 패널 ─────────────────────────────────────────
  const ResultPanel = () => result ? (
    <>
      <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold opacity-90 flex items-center gap-2">
            <DollarSign className="w-5 h-5" />{t('result.title')}
          </h3>
          <div className="flex gap-2">
            <button onClick={handleShare} className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-xs transition-colors">
              {isCopied ? <><Check className="w-3 h-3" />{tCommon('copied')}</> : <><Share2 className="w-3 h-3" />{t('result.shareResult')}</>}
            </button>
            {showSaveButton && (
              <button onClick={handleSave} className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-xs transition-colors">
                <Save className="w-3 h-3" />{tCommon('save')}
              </button>
            )}
          </div>
        </div>
        <div className="text-center mb-4">
          <div className="text-4xl font-bold mb-1">{fmt(result.totalPay)}<span className="text-2xl">원</span></div>
          <div className="text-sm opacity-80">{t('result.totalHours')}: {fmtH(result.totalHours)}{t('result.hours')} · {result.workDayCount}일</div>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/20">
          <div className="text-center">
            <div className="text-xs opacity-70 mb-1">{t('result.monthlyEstimate')}</div>
            <div className="text-lg font-bold">{fmt(result.totalPay * 4)}원</div>
          </div>
          <div className="text-center">
            <div className="text-xs opacity-70 mb-1">{t('result.yearlyEstimate')}</div>
            <div className="text-lg font-bold">{fmt(result.totalPay * 52)}원</div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5">
        <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">{t('result.breakdown')}</h4>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          <div className="flex justify-between py-2">
            <span className="text-sm text-gray-600 dark:text-gray-300">{t('result.basicPay')}</span>
            <span className="font-semibold text-sm">{fmt(result.basicPay)}원</span>
          </div>
          {result.overtimePay > 0 && (
            <div className="flex justify-between py-2">
              <span className="text-sm text-gray-600 dark:text-gray-300">{t('result.overtimePay')} <span className="text-xs text-orange-500">({fmtH(result.overtimeHours)}{t('result.hours')})</span></span>
              <span className="font-semibold text-sm text-orange-600">+{fmt(result.overtimePay)}원</span>
            </div>
          )}
          {result.nightPay > 0 && (
            <div className="flex justify-between py-2">
              <span className="text-sm text-gray-600 dark:text-gray-300">{t('result.nightPay')} <span className="text-xs text-purple-500">({fmtH(result.nightHours)}{t('result.hours')})</span></span>
              <span className="font-semibold text-sm text-purple-600">+{fmt(result.nightPay)}원</span>
            </div>
          )}
          {result.holidayPay > 0 && (
            <div className="flex justify-between py-2">
              <span className="text-sm text-gray-600 dark:text-gray-300">{t('result.holidayPay')} <span className="text-xs text-red-500">({fmtH(result.holidayHours)}{t('result.hours')})</span></span>
              <span className="font-semibold text-sm text-red-600">+{fmt(result.holidayPay)}원</span>
            </div>
          )}
          {result.weeklyHolidayPay > 0 && (
            <div className="flex justify-between py-2">
              <span className="text-sm text-gray-600 dark:text-gray-300">{t('result.weeklyHolidayPay')}</span>
              <span className="font-semibold text-sm text-green-600">+{fmt(result.weeklyHolidayPay)}원</span>
            </div>
          )}
        </div>
      </div>
    </>
  ) : (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-10 text-center flex flex-col items-center gap-3">
      <Clock className="w-12 h-12 text-gray-300 dark:text-gray-600" />
      <p className="text-sm text-gray-500 dark:text-gray-400">{t('placeholder')}</p>
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
        </div>
        <CalculationHistory
          histories={histories} isLoading={false}
          onLoadHistory={(id) => {
            const inp = loadFromHistory(id)
            if (inp) { setHourlyWage(inp.hourlyWage?.toString() || String(MIN_WAGE_2026)); setWeeklyHours(inp.weeklyHours?.toString() || '40') }
          }}
          onRemoveHistory={removeHistory} onClearHistories={clearHistories}
          formatResult={(h: any) => !h.inputs || !h.result ? t('history.empty') : t('history.format', { totalPay: fmt(h.result.totalPay || 0), totalHours: fmtH(h.inputs.totalHours || 0) })}
        />
      </div>

      {/* 탭 */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-fit">
        {(['daily', 'conversion'] as TabType[]).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
          >
            {t(`tabs.${tab}`)}
          </button>
        ))}
      </div>

      {/* ═══ 탭 1: 근무일 계산 ═══ */}
      {activeTab === 'daily' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 space-y-5">
            {/* 시급 + 소정근로시간 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">{t('input.hourlyWage')}</label>
                <div className="relative">
                  <input type="number" value={hourlyWage} onChange={e => setHourlyWage(e.target.value)}
                    className="w-full pl-3 pr-8 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">원</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">{t('input.hourlyWageNote')}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">{t('input.weeklyHours')}</label>
                <div className="flex gap-1">
                  {[40, 35, 30, 20].map(h => (
                    <button key={h} onClick={() => setWeeklyHours(String(h))}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-colors border ${weeklyHours === String(h) ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-blue-400'}`}
                    >{h}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* 입력 방식 전환 */}
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-750 rounded-xl p-1">
              <button onClick={() => setInputMode('period')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${inputMode === 'period' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
              >
                <CalendarRange className="w-3.5 h-3.5" />{t('input.periodMode')}
              </button>
              <button onClick={() => setInputMode('individual')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${inputMode === 'individual' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
              >
                <CalendarDays className="w-3.5 h-3.5" />{t('input.individualMode')}
              </button>
            </div>

            {/* 빠른 입력 프리셋 */}
            <div>
              <p className="text-[10px] font-medium text-gray-400 mb-2 flex items-center gap-1">
                <Zap className="w-3 h-3" />{t('input.presets')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {presetKeys.map((key, i) => (
                  <button key={key} onClick={() => applyPreset(PRESETS[i].id)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${presetBtnCls[i]}`}
                  >
                    {t(`input.${key}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* ── 기간 입력 모드 ── */}
            {inputMode === 'period' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t('input.startDate')} ~ {t('input.endDate')}</label>
                  <div className="grid grid-cols-2 gap-2">
                    <CustomDatePicker value={periodStart} onChange={setPeriodStart} placeholder={t('input.startDate')} />
                    <CustomDatePicker value={periodEnd} onChange={setPeriodEnd} placeholder={t('input.endDate')} />
                  </div>
                  {periodStart && periodEnd && generatedDays.length > 0 && (
                    <p className="text-[11px] text-green-600 dark:text-green-400 mt-1.5 flex items-center gap-1">
                      <Check className="w-3 h-3" />{t('input.totalWorkDays', { count: generatedDays.length })}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t('input.workDays')}</label>
                  <div className="flex gap-1">
                    {WEEKDAY_LABELS.map((d, i) => (
                      <button key={d} onClick={() => toggleWeekday(i)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${selectedWeekdays[i] ? (i === 5 ? 'bg-blue-600 text-white' : i === 6 ? 'bg-red-500 text-white' : 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900') : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'}`}
                      >{d}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t('input.workTime')}</label>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <p className="text-[10px] text-gray-400 mb-1">{t('input.startTime')}</p>
                      <CustomTimePicker value={periodStartTime} onChange={setPeriodStartTime} />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 mb-1">{t('input.endTime')}</p>
                      <CustomTimePicker value={periodEndTime} onChange={setPeriodEndTime} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] text-gray-400">{t('input.breakTime')}</label>
                    <div className="flex gap-1">
                      {[0, 30, 60, 90].map(m => (
                        <button key={m} onClick={() => setPeriodBreakTime(m)}
                          className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${periodBreakTime === m ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}
                        >{m}분</button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── 날짜별 입력 모드 ── */}
            {inputMode === 'individual' && (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('input.workSchedule')}</label>
                  <button onClick={addWorkDay} className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 transition-colors">
                    {t('input.addDay')}
                  </button>
                </div>
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {dailyWork.map((day, idx) => (
                    <div key={idx} className="p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-750">
                      <div className="mb-2">
                        <p className="text-[10px] text-gray-400 mb-1">{t('input.date')}</p>
                        <CustomDatePicker value={day.date} onChange={v => updateWorkDay(idx, 'date', v)} placeholder={t('input.date')} />
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div>
                          <p className="text-[10px] text-gray-400 mb-1">{t('input.startTime')}</p>
                          <CustomTimePicker value={day.startTime} onChange={v => updateWorkDay(idx, 'startTime', v)} />
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 mb-1">{t('input.endTime')}</p>
                          <CustomTimePicker value={day.endTime} onChange={v => updateWorkDay(idx, 'endTime', v)} />
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-gray-400">{t('input.breakTime')}</span>
                          <div className="flex gap-1">
                            {[0, 30, 60].map(m => (
                              <button key={m} onClick={() => updateWorkDay(idx, 'breakTime', m)}
                                className={`px-2 py-0.5 rounded text-[10px] transition-colors ${day.breakTime === m ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'}`}
                              >{m}분</button>
                            ))}
                          </div>
                        </div>
                        <label className="flex items-center gap-1 cursor-pointer ml-auto">
                          <input type="checkbox" checked={day.isHoliday} onChange={e => updateWorkDay(idx, 'isHoliday', e.target.checked)} className="accent-red-500 w-3 h-3" />
                          <span className="text-[10px] text-gray-600 dark:text-gray-300">{t('input.holiday')}</span>
                        </label>
                        {dailyWork.length > 1 && (
                          <button onClick={() => removeWorkDay(idx)} className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-500 rounded text-[10px] hover:bg-red-200 transition-colors">
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
          <div className="space-y-4"><ResultPanel /></div>
        </div>
      )}

      {/* ═══ 탭 2: 시급 환산 ═══ */}
      {activeTab === 'conversion' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 space-y-5">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />{t('conversion.title')}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('conversion.description')}</p>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t('conversion.hourlyWage')}</label>
              <div className="relative mb-2">
                <input type="number" value={convWage} onChange={e => setConvWage(e.target.value)}
                  className="w-full pl-3 pr-8 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">원</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {[MIN_WAGE_2026, 12000, 15000, 20000].map(w => (
                  <button key={w} onClick={() => setConvWage(String(w))}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${convWage === String(w) ? 'bg-green-600 text-white border-green-600' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-green-500'}`}
                  >{fmt(w)}원</button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t('conversion.weeklyWorkHours')}</label>
                <input type="number" value={convWeeklyHours} onChange={e => setConvWeeklyHours(e.target.value)} min="1" max="68"
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t('conversion.workDaysPerWeek')}</label>
                <div className="flex gap-1">
                  {[3, 4, 5, 6].map(d => (
                    <button key={d} onClick={() => setConvDaysPerWeek(String(d))}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${convDaysPerWeek === String(d) ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}
                    >{d}일</button>
                  ))}
                </div>
              </div>
            </div>

            {convResult && (
              <div className={`p-3 rounded-xl text-xs ${convResult.isEligibleWeeklyHoliday ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300' : 'bg-gray-50 dark:bg-gray-750 text-gray-500'}`}>
                {convResult.isEligibleWeeklyHoliday
                  ? `✅ ${t('conversion.eligibleWeeklyHoliday')} — 주휴수당 ${fmt(convResult.weeklyHolidayPay)}원/주`
                  : '❌ 주 15시간 미만 — 주휴수당 미발생'}
              </div>
            )}
          </div>

          {convResult && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />{t('conversion.wageTable')}
                </h3>
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {[
                    { label: t('conversion.daily'), value: convResult.daily, color: '' },
                    { label: `${t('conversion.weekly')} ${t('conversion.withoutHoliday')}`, value: convResult.weekly, color: '' },
                    convResult.isEligibleWeeklyHoliday ? { label: `${t('conversion.weekly')} ${t('conversion.withHoliday')}`, value: convResult.weeklyWithHoliday, color: 'text-blue-600 font-bold' } : null,
                    { label: `${t('conversion.monthly')} ${t('conversion.withHoliday')}`, value: convResult.monthlyWithHoliday, color: convResult.isEligibleWeeklyHoliday ? 'text-blue-600 font-bold' : '' },
                    { label: `${t('conversion.yearly')} ${t('conversion.withHoliday')}`, value: convResult.yearlyWithHoliday, color: 'text-green-600 font-bold text-base', big: true },
                  ].filter(Boolean).map((row, i) => row && (
                    <div key={i} className={`flex justify-between items-center py-3 ${row.big ? 'bg-green-50 dark:bg-green-950 px-3 rounded-lg mt-1' : ''}`}>
                      <span className="text-sm text-gray-600 dark:text-gray-300">{row.label}</span>
                      <span className={`font-semibold text-sm text-gray-900 dark:text-white ${row.color}`}>{fmt(row.value)}원</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-600" />{t('conversion.insuranceTitle')}
                </h3>
                <div className="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
                  {[
                    { label: t('conversion.nationalPension'), value: convResult.deductions.nationalPension, c: 'text-blue-600' },
                    { label: t('conversion.healthInsurance'), value: convResult.deductions.healthInsurance, c: 'text-teal-600' },
                    { label: t('conversion.longTermCare'), value: convResult.deductions.longTermCare, c: 'text-teal-500' },
                    { label: t('conversion.employmentInsurance'), value: convResult.deductions.employmentInsurance, c: 'text-orange-600' },
                  ].map((r, i) => (
                    <div key={i} className="flex justify-between py-2">
                      <span className="text-gray-600 dark:text-gray-300">{r.label}</span>
                      <span className={`font-medium ${r.c}`}>-{fmt(r.value)}원</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 font-semibold">
                    <span className="text-gray-700 dark:text-gray-200">{t('conversion.totalDeduction')}</span>
                    <span className="text-red-600">-{fmt(convResult.deductions.total)}원</span>
                  </div>
                  <div className="flex justify-between py-3 bg-blue-50 dark:bg-blue-950 px-3 rounded-lg mt-1">
                    <span className="font-bold text-gray-900 dark:text-white">{t('conversion.netMonthly')}</span>
                    <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{fmt(convResult.netMonthly)}원</span>
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 mt-3">{t('conversion.insuranceNote')}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ 2026 최저임금 ═══ */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
          <Users className="w-5 h-5 text-green-600" />{t('minimumWage.title')}
        </h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { val: '10,320원', label: t('minimumWage.2026'), bg: 'bg-green-50 dark:bg-green-900/20', c: 'text-green-600', lc: 'text-green-700 dark:text-green-300' },
            { val: '2,156,880원', label: t('minimumWage.monthly'), bg: 'bg-blue-50 dark:bg-blue-900/20', c: 'text-blue-600', lc: 'text-blue-700 dark:text-blue-300' },
            { val: '209시간', label: t('minimumWage.monthlyHours'), bg: 'bg-purple-50 dark:bg-purple-900/20', c: 'text-purple-600', lc: 'text-purple-700 dark:text-purple-300' },
          ].map((item, i) => (
            <div key={i} className={`text-center p-4 ${item.bg} rounded-xl`}>
              <div className={`text-xl font-bold ${item.c} mb-1`}>{item.val}</div>
              <div className={`text-xs ${item.lc}`}>{item.label}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-4 text-center">{t('minimumWage.note')}</p>
      </div>

      {/* ═══ 근로기준법 가이드 ═══ */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-5">💼 {t('guide.title')}</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('guide.overtimeTitle')}</h4>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              {[0,1,2,3].map(i => <li key={i}>• {t(`guide.overtime.${i}`)}</li>)}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('guide.allowanceTitle')}</h4>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              {[0,1,2,3].map(i => <li key={i}>• {t(`guide.allowance.${i}`)}</li>)}
            </ul>
          </div>
        </div>
      </div>

      {/* ═══ 근로자 권리 ═══ */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-5">⚖️ {t('rights.title')}</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('rights.basicTitle')}</h4>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              {[0,1,2,3].map(i => <li key={i}>• {t(`rights.basic.${i}`)}</li>)}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('rights.protectionTitle')}</h4>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              {[0,1,2,3].map(i => <li key={i}>• {t(`rights.protection.${i}`)}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
