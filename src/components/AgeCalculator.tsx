'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Copy, Check, BookOpen, Cake, Calendar, Star, Clock, RotateCcw, GraduationCap, ChevronDown, ChevronUp, Users, Link } from 'lucide-react'

interface SchoolInfo {
  elementaryEntryYear: number
  sameGradeLateBirth: number
  sameGradeEarlyBirth: number
  isEarlyBirth: boolean
  status: string
  grade: number
}

interface MilestoneItem {
  event: string
  year: number
  intAge: number
  isPast: boolean
  isCurrent: boolean
}

function calculateSchoolInfo(birthYear: number, birthMonth: number, baseDate: Date): SchoolInfo {
  const isEarlyBirth = birthMonth >= 1 && birthMonth <= 2
  const elementaryEntryYear = isEarlyBirth ? birthYear + 6 : birthYear + 7

  const sameGradeLateBirth = elementaryEntryYear - 7
  const sameGradeEarlyBirth = elementaryEntryYear - 6

  const currentYear = baseDate.getFullYear()
  const currentMonth = baseDate.getMonth() + 1
  const academicYear = currentMonth >= 3 ? currentYear : currentYear - 1
  const yearsFromEntry = academicYear - elementaryEntryYear

  let status = ''
  let grade = 0
  if (yearsFromEntry < 0) {
    status = 'preschool'
  } else if (yearsFromEntry < 6) {
    status = 'elementary'
    grade = yearsFromEntry + 1
  } else if (yearsFromEntry < 9) {
    status = 'middle'
    grade = yearsFromEntry - 5
  } else if (yearsFromEntry < 12) {
    status = 'high'
    grade = yearsFromEntry - 8
  } else if (yearsFromEntry < 16) {
    status = 'university'
    grade = yearsFromEntry - 11
  } else {
    status = 'graduated'
  }

  return { elementaryEntryYear, sameGradeLateBirth, sameGradeEarlyBirth, isEarlyBirth, status, grade }
}

function generateMilestones(birthYear: number, birthMonth: number, baseDate: Date): MilestoneItem[] {
  const isEarlyBirth = birthMonth >= 1 && birthMonth <= 2

  const elementaryYear = isEarlyBirth ? birthYear + 6 : birthYear + 7
  const middleYear = elementaryYear + 6
  const highYear = elementaryYear + 9

  const milestones: MilestoneItem[] = [
    { event: 'elementary', year: elementaryYear, intAge: elementaryYear - birthYear - (isEarlyBirth ? 0 : 1), isPast: false, isCurrent: false },
    { event: 'middle', year: middleYear, intAge: middleYear - birthYear - (isEarlyBirth ? 0 : 1), isPast: false, isCurrent: false },
    { event: 'high', year: highYear, intAge: highYear - birthYear - (isEarlyBirth ? 0 : 1), isPast: false, isCurrent: false },
    { event: 'driving', year: birthYear + 18, intAge: 18, isPast: false, isCurrent: false },
    { event: 'voting', year: birthYear + 18, intAge: 18, isPast: false, isCurrent: false },
    { event: 'adult', year: birthYear + 19, intAge: 19, isPast: false, isCurrent: false },
    { event: 'drinking', year: birthYear + 19, intAge: 19, isPast: false, isCurrent: false },
    { event: 'universityGrad', year: highYear + 4, intAge: highYear + 4 - birthYear - (isEarlyBirth ? 0 : 1), isPast: false, isCurrent: false },
    { event: 'avgMarriageMale', year: birthYear + 34, intAge: 34, isPast: false, isCurrent: false },
    { event: 'avgMarriageFemale', year: birthYear + 31, intAge: 31, isPast: false, isCurrent: false },
    { event: 'seniorDiscount', year: birthYear + 65, intAge: 65, isPast: false, isCurrent: false },
    { event: 'pension', year: birthYear + 65, intAge: 65, isPast: false, isCurrent: false },
  ]

  const baseYear = baseDate.getFullYear()

  return milestones
    .map(m => ({
      ...m,
      isPast: m.year < baseYear,
      isCurrent: m.year === baseYear,
    }))
    .sort((a, b) => a.year - b.year)
}

export default function AgeCalculator() {
  const t = useTranslations('ageCalculator')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showTimeline, setShowTimeline] = useState(false)

  const now = new Date()
  const [birthYear, setBirthYear] = useState('')
  const [birthMonth, setBirthMonth] = useState('')
  const [birthDay, setBirthDay] = useState('')
  const [baseDate, setBaseDate] = useState(formatDateInput(now))

  const searchParams = useSearchParams()

  // Read URL params on mount
  useEffect(() => {
    const birth = searchParams.get('birth')
    if (birth) {
      const parts = birth.split('-')
      if (parts.length === 3) {
        setBirthYear(parts[0])
        setBirthMonth(String(parseInt(parts[1])))
        setBirthDay(String(parseInt(parts[2])))
      }
    }
    const base = searchParams.get('base')
    if (base) {
      setBaseDate(base)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync state to URL
  const updateURL = useCallback((year: string, month: string, day: string, base: string) => {
    const url = new URL(window.location.href)
    if (year && month && day) {
      const m = String(parseInt(month)).padStart(2, '0')
      const d = String(parseInt(day)).padStart(2, '0')
      url.searchParams.set('birth', `${year}-${m}-${d}`)
    } else {
      url.searchParams.delete('birth')
    }
    const today = formatDateInput(new Date())
    if (base && base !== today) {
      url.searchParams.set('base', base)
    } else {
      url.searchParams.delete('base')
    }
    window.history.replaceState({}, '', url)
  }, [])

  const handleSetBirthYear = useCallback((v: string) => {
    setBirthYear(v)
    updateURL(v, birthMonth, birthDay, baseDate)
  }, [birthMonth, birthDay, baseDate, updateURL])

  const handleSetBirthMonth = useCallback((v: string) => {
    setBirthMonth(v)
    updateURL(birthYear, v, birthDay, baseDate)
  }, [birthYear, birthDay, baseDate, updateURL])

  const handleSetBirthDay = useCallback((v: string) => {
    setBirthDay(v)
    updateURL(birthYear, birthMonth, v, baseDate)
  }, [birthYear, birthMonth, baseDate, updateURL])

  const handleSetBaseDate = useCallback((v: string) => {
    setBaseDate(v)
    updateURL(birthYear, birthMonth, birthDay, v)
  }, [birthYear, birthMonth, birthDay, updateURL])

  const copyToClipboard = useCallback(async (text: string, id: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.left = '-999999px'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }, [])

  const copyLink = useCallback(() => {
    copyToClipboard(window.location.href, 'link')
  }, [copyToClipboard])

  const result = useMemo(() => {
    const y = parseInt(birthYear)
    const m = parseInt(birthMonth)
    const d = parseInt(birthDay)
    if (isNaN(y) || isNaN(m) || isNaN(d)) return null
    if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > now.getFullYear()) return null

    const birth = new Date(y, m - 1, d)
    if (birth.getMonth() !== m - 1 || birth.getDate() !== d) return null

    const base = new Date(baseDate + 'T00:00:00')
    if (isNaN(base.getTime())) return null
    if (birth > base) return null

    // 만 나이
    let intAge = base.getFullYear() - y
    const hadBirthday = (base.getMonth() > m - 1) || (base.getMonth() === m - 1 && base.getDate() >= d)
    if (!hadBirthday) intAge--

    // 한국 나이 (세는 나이)
    const koreanAge = base.getFullYear() - y + 1

    // 연 나이
    const yearAge = base.getFullYear() - y

    // 살아온 일수
    const totalDays = Math.floor((base.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24))
    const totalWeeks = Math.floor(totalDays / 7)
    const totalMonths = (base.getFullYear() - y) * 12 + (base.getMonth() - (m - 1))

    // 다음 생일
    let nextBirthday = new Date(base.getFullYear(), m - 1, d)
    if (nextBirthday <= base) {
      nextBirthday = new Date(base.getFullYear() + 1, m - 1, d)
    }
    const daysUntilBirthday = Math.ceil((nextBirthday.getTime() - base.getTime()) / (1000 * 60 * 60 * 24))
    const isBirthdayToday = base.getMonth() === m - 1 && base.getDate() === d
    const nextBirthdayAge = isBirthdayToday ? intAge + 1 : intAge + 1

    // 띠 (12간지)
    const zodiacKeys = ['monkey', 'rooster', 'dog', 'pig', 'rat', 'ox', 'tiger', 'rabbit', 'dragon', 'snake', 'horse', 'goat'] as const
    const zodiacAnimal = zodiacKeys[y % 12]

    // 별자리
    const zodiacSign = getZodiacSign(m, d)

    // 요일
    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const
    const birthDayOfWeek = dayKeys[birth.getDay()]

    // 세대
    const generation = getGeneration(y)

    // 빠른년생
    const isEarlySchool = m >= 1 && m <= 2

    // 만 나이 상세 (년, 월, 일)
    let detailYears = intAge
    let detailMonths = base.getMonth() - (m - 1)
    let detailDays = base.getDate() - d
    if (detailDays < 0) {
      detailMonths--
      const prevMonth = new Date(base.getFullYear(), base.getMonth(), 0)
      detailDays += prevMonth.getDate()
    }
    if (detailMonths < 0) {
      detailMonths += 12
      detailYears--
    }

    // 학년 정보
    const schoolInfo = calculateSchoolInfo(y, m, base)

    // 인생 타임라인
    const milestones = generateMilestones(y, m, base)

    return {
      intAge,
      koreanAge,
      yearAge,
      totalDays,
      totalWeeks,
      totalMonths: totalMonths >= 0 ? totalMonths : 0,
      daysUntilBirthday,
      isBirthdayToday,
      nextBirthdayAge,
      zodiacAnimal,
      zodiacSign,
      birthDayOfWeek,
      generation,
      isEarlySchool,
      detailYears,
      detailMonths,
      detailDays,
      schoolInfo,
      milestones,
      birthYearNum: y,
      birthMonthNum: m,
    }
  }, [birthYear, birthMonth, birthDay, baseDate, now])

  const handleReset = useCallback(() => {
    setBirthYear('')
    setBirthMonth('')
    setBirthDay('')
    setBaseDate(formatDateInput(new Date()))
    setShowTimeline(false)
    const url = new URL(window.location.href)
    url.searchParams.delete('birth')
    url.searchParams.delete('base')
    window.history.replaceState({}, '', url)
  }, [])

  // 연도 선택 옵션 생성
  const yearOptions = useMemo(() => {
    const years = []
    for (let y = now.getFullYear(); y >= 1920; y--) {
      years.push(y)
    }
    return years
  }, [now])

  const copyTimeline = useCallback(() => {
    if (!result) return
    const lines = result.milestones.map(m => {
      const status = m.isPast ? '[V]' : m.isCurrent ? '[*]' : '[ ]'
      return `${status} ${m.year} (${t('milestone.intAgeLabel', { age: m.intAge })}) - ${t(`milestone.${m.event}`)}`
    })
    copyToClipboard(lines.join('\n'), 'timeline')
  }, [result, t, copyToClipboard])

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* 입력 패널 */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Cake className="w-5 h-5 text-pink-500" />
              {t('birthDate')}
            </h2>

            {/* 생년월일 입력 */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('year')}</label>
                <select
                  value={birthYear}
                  onChange={(e) => handleSetBirthYear(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">-- {t('year')} --</option>
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>{y}{t('year')}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('month')}</label>
                  <select
                    value={birthMonth}
                    onChange={(e) => handleSetBirthMonth(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">-- {t('month')} --</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>{m}{t('month')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('day')}</label>
                  <select
                    value={birthDay}
                    onChange={(e) => handleSetBirthDay(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">-- {t('day')} --</option>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>{d}{t('day')}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 기준 날짜 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {t('baseDate')}
              </label>
              <input
                type="date"
                value={baseDate}
                onChange={(e) => handleSetBaseDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={() => handleSetBaseDate(formatDateInput(new Date()))}
                className="mt-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                {t('today')}
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors text-sm font-medium"
              >
                <RotateCcw className="w-4 h-4" />
                {t('reset')}
              </button>
              <button
                onClick={copyLink}
                title="링크 복사"
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors text-sm font-medium"
              >
                {copiedId === 'link' ? <Check className="w-4 h-4 text-green-500" /> : <Link className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* 결과 패널 */}
        <div className="lg:col-span-2 space-y-6">
          {result ? (
            <>
              {/* 메인 나이 카드 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* 만 나이 */}
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-5 text-white shadow-lg">
                  <p className="text-sm opacity-80">{t('result.internationalAge')}</p>
                  <div className="flex items-end gap-1 mt-2">
                    <span className="text-4xl font-bold">{result.intAge}</span>
                    <span className="text-lg mb-1">{t('result.years')}</span>
                  </div>
                  <p className="text-xs opacity-70 mt-1">
                    {result.detailYears}{t('result.years')} {result.detailMonths}{t('result.months')} {result.detailDays}{t('result.days')}
                  </p>
                  <button
                    onClick={() => copyToClipboard(String(result.intAge), 'intAge')}
                    className="mt-2 p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                  >
                    {copiedId === 'intAge' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4 opacity-70" />}
                  </button>
                </div>

                {/* 한국 나이 */}
                <div className="bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl p-5 text-white shadow-lg">
                  <p className="text-sm opacity-80">{t('result.koreanAge')}</p>
                  <div className="flex items-end gap-1 mt-2">
                    <span className="text-4xl font-bold">{result.koreanAge}</span>
                    <span className="text-lg mb-1">{t('result.years')}</span>
                  </div>
                  <p className="text-xs opacity-70 mt-1">&nbsp;</p>
                  <button
                    onClick={() => copyToClipboard(String(result.koreanAge), 'koreanAge')}
                    className="mt-2 p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                  >
                    {copiedId === 'koreanAge' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4 opacity-70" />}
                  </button>
                </div>

                {/* 연 나이 */}
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-5 text-white shadow-lg">
                  <p className="text-sm opacity-80">{t('result.yearAge')}</p>
                  <div className="flex items-end gap-1 mt-2">
                    <span className="text-4xl font-bold">{result.yearAge}</span>
                    <span className="text-lg mb-1">{t('result.years')}</span>
                  </div>
                  <p className="text-xs opacity-70 mt-1">&nbsp;</p>
                  <button
                    onClick={() => copyToClipboard(String(result.yearAge), 'yearAge')}
                    className="mt-2 p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                  >
                    {copiedId === 'yearAge' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4 opacity-70" />}
                  </button>
                </div>
              </div>

              {/* 상세 정보 그리드 */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-500" />
                  {t('result.title')}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <InfoCard
                    label={t('result.totalDays')}
                    value={result.totalDays.toLocaleString()}
                    suffix={t('result.days')}
                    copyId="totalDays"
                    copiedId={copiedId}
                    onCopy={copyToClipboard}
                  />
                  <InfoCard
                    label={t('result.totalWeeks')}
                    value={result.totalWeeks.toLocaleString()}
                    copyId="totalWeeks"
                    copiedId={copiedId}
                    onCopy={copyToClipboard}
                  />
                  <InfoCard
                    label={t('result.totalMonths')}
                    value={result.totalMonths.toLocaleString()}
                    suffix={t('result.months')}
                    copyId="totalMonths"
                    copiedId={copiedId}
                    onCopy={copyToClipboard}
                  />
                  <InfoCard
                    label={t('result.nextBirthday')}
                    value={result.isBirthdayToday ? t('result.birthdayToday') : `${result.daysUntilBirthday}`}
                    suffix={result.isBirthdayToday ? '' : t('result.daysUntilBirthday')}
                    highlight={result.isBirthdayToday}
                    copyId="birthday"
                    copiedId={copiedId}
                    onCopy={copyToClipboard}
                  />
                  <InfoCard
                    label={t('result.zodiacAnimal')}
                    value={t(`zodiacAnimals.${result.zodiacAnimal}`)}
                    copyId="zodiac"
                    copiedId={copiedId}
                    onCopy={copyToClipboard}
                  />
                  <InfoCard
                    label={t('result.zodiacSign')}
                    value={t(`zodiacSigns.${result.zodiacSign}`)}
                    copyId="zodiacSign"
                    copiedId={copiedId}
                    onCopy={copyToClipboard}
                  />
                  <InfoCard
                    label={t('result.birthDay')}
                    value={t(`days.${result.birthDayOfWeek}`)}
                    copyId="birthDay"
                    copiedId={copiedId}
                    onCopy={copyToClipboard}
                  />
                  <InfoCard
                    label={t('result.generation')}
                    value={t(`generations.${result.generation}`)}
                    copyId="generation"
                    copiedId={copiedId}
                    onCopy={copyToClipboard}
                  />
                  <InfoCard
                    label={t('result.earlySchoolYear')}
                    value={t(`earlySchool.${result.isEarlySchool ? 'yes' : 'no'}`)}
                    copyId="earlySchool"
                    copiedId={copiedId}
                    onCopy={copyToClipboard}
                  />
                </div>
              </div>

              {/* 다음 생일 D-day */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-xl p-6 border border-amber-200 dark:border-amber-800">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Cake className="w-5 h-5 text-amber-500" />
                  {t('birthday.title')}
                </h2>
                {result.isBirthdayToday ? (
                  <div className="text-center py-4">
                    <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                      {t('result.birthdayToday')}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      {t('birthday.turningAge', { age: result.intAge })}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-6 flex-wrap">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t('birthday.daysLeft')}</p>
                      <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                        D-{result.daysUntilBirthday}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t('birthday.nextAge')}</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {t('birthday.willTurn', { age: result.nextBirthdayAge })}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* 학년 정보 */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-indigo-500" />
                  {t('school.title')}
                </h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-indigo-50 dark:bg-indigo-950/30 rounded-lg p-4">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t('school.entryYear')}</p>
                      <p className="text-lg font-bold text-indigo-700 dark:text-indigo-300 mt-1">
                        {result.schoolInfo.elementaryEntryYear}{t('school.yearSuffix')}
                      </p>
                    </div>
                    <div className="bg-indigo-50 dark:bg-indigo-950/30 rounded-lg p-4">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t('school.currentStatus')}</p>
                      <p className="text-lg font-bold text-indigo-700 dark:text-indigo-300 mt-1">
                        {result.schoolInfo.status === 'preschool' && t('school.status.preschool')}
                        {result.schoolInfo.status === 'elementary' && t('school.status.elementaryGrade', { grade: result.schoolInfo.grade })}
                        {result.schoolInfo.status === 'middle' && t('school.status.middleGrade', { grade: result.schoolInfo.grade })}
                        {result.schoolInfo.status === 'high' && t('school.status.highGrade', { grade: result.schoolInfo.grade })}
                        {result.schoolInfo.status === 'university' && t('school.status.universityGrade', { grade: result.schoolInfo.grade })}
                        {result.schoolInfo.status === 'graduated' && t('school.status.graduated')}
                      </p>
                    </div>
                  </div>

                  {/* 같은 학년 또래 */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5 mb-2">
                      <Users className="w-4 h-4" />
                      {t('school.sameGrade')}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 text-sm">
                      <span className="bg-white dark:bg-gray-800 rounded px-3 py-1.5 text-gray-700 dark:text-gray-300">
                        {result.schoolInfo.sameGradeLateBirth}{t('school.yearSuffix')} 3~12{t('school.monthBorn')}
                      </span>
                      <span className="text-gray-400 self-center">+</span>
                      <span className="bg-white dark:bg-gray-800 rounded px-3 py-1.5 text-gray-700 dark:text-gray-300">
                        {result.schoolInfo.sameGradeEarlyBirth}{t('school.yearSuffix')} 1~2{t('school.monthBorn')}{' '}
                        <span className="text-xs text-orange-500 dark:text-orange-400">({t('school.earlyBirthday')})</span>
                      </span>
                    </div>
                    {result.schoolInfo.isEarlyBirth && (
                      <p className="text-xs text-orange-600 dark:text-orange-400 mt-2 bg-orange-50 dark:bg-orange-950/30 rounded px-2 py-1">
                        {t('school.earlyBirthdayNote')}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* 인생 타임라인 */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-emerald-500" />
                    {t('milestone.title')}
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={copyTimeline}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      title={t('milestone.copyAll')}
                    >
                      {copiedId === 'timeline' ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                    <button
                      onClick={() => setShowTimeline(!showTimeline)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
                    >
                      {showTimeline ? t('milestone.hideTimeline') : t('milestone.showTimeline')}
                      {showTimeline ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {showTimeline && (
                  <div className="relative">
                    {/* Timeline vertical line */}
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

                    <div className="space-y-0">
                      {result.milestones.map((milestone, idx) => (
                        <div
                          key={idx}
                          className={`relative flex items-start gap-4 py-3 pl-10 pr-3 rounded-lg transition-colors ${
                            milestone.isCurrent
                              ? 'bg-blue-50 dark:bg-blue-950/30'
                              : milestone.isPast
                                ? 'opacity-60'
                                : ''
                          }`}
                        >
                          {/* Timeline dot */}
                          <div className={`absolute left-2.5 top-4 w-3 h-3 rounded-full border-2 ${
                            milestone.isCurrent
                              ? 'bg-blue-500 border-blue-500 ring-4 ring-blue-100 dark:ring-blue-900'
                              : milestone.isPast
                                ? 'bg-green-500 border-green-500'
                                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                          }`} />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="text-sm font-bold text-gray-900 dark:text-white">
                                {milestone.year}{t('school.yearSuffix')}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                ({t('milestone.intAgeLabel', { age: milestone.intAge })})
                              </span>
                              <span className={`text-sm font-medium ${
                                milestone.isCurrent
                                  ? 'text-blue-700 dark:text-blue-300'
                                  : milestone.isPast
                                    ? 'text-gray-500 dark:text-gray-400'
                                    : 'text-gray-700 dark:text-gray-300'
                              }`}>
                                {t(`milestone.${milestone.event}`)}
                              </span>
                              {milestone.isPast && (
                                <span className="text-xs text-green-600 dark:text-green-400">&#10003;</span>
                              )}
                              {milestone.isCurrent && (
                                <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                                  {t('milestone.current')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!showTimeline && (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-400 dark:text-gray-500">{t('milestone.clickToShow')}</p>
                  </div>
                )}
              </div>

              {/* 나이 계산 방식 안내 */}
              <div className="bg-blue-50 dark:bg-blue-950/50 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-4 flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  {t('ageExplanation.title')}
                </h3>
                <div className="space-y-3">
                  {(['international', 'korean', 'year'] as const).map((type) => (
                    <div key={type} className="bg-white/60 dark:bg-gray-800/50 rounded-lg p-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {t(`ageExplanation.${type}.title`)}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {t(`ageExplanation.${type}.description`)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <div className="text-center py-16">
                <Cake className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 dark:text-gray-500 text-sm">
                  {t('placeholder')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 가이드 섹션 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          {t('guide.title')}
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {(['howToUse', 'features'] as const).map((section) => (
            <div key={section} className="space-y-3">
              <h3 className="font-medium text-gray-900 dark:text-white">
                {t(`guide.${section}.title`)}
              </h3>
              <ul className="space-y-1.5">
                {(t.raw(`guide.${section}.items`) as string[]).map((item, i) => (
                  <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5 shrink-0">&#8226;</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function InfoCard({
  label,
  value,
  suffix,
  highlight,
  copyId,
  copiedId,
  onCopy,
}: {
  label: string
  value: string
  suffix?: string
  highlight?: boolean
  copyId: string
  copiedId: string | null
  onCopy: (text: string, id: string) => void
}) {
  return (
    <div className={`rounded-lg p-3 group ${
      highlight
        ? 'bg-yellow-50 dark:bg-yellow-950/30 ring-1 ring-yellow-300 dark:ring-yellow-700'
        : 'bg-gray-50 dark:bg-gray-700/50'
    }`}>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <div className="flex items-center justify-between mt-1">
        <p className={`text-sm font-semibold ${
          highlight ? 'text-yellow-700 dark:text-yellow-400' : 'text-gray-900 dark:text-white'
        }`}>
          {value} {suffix && <span className="text-xs font-normal text-gray-400">{suffix}</span>}
        </p>
        <button
          onClick={() => onCopy(value, copyId)}
          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
        >
          {copiedId === copyId ? (
            <Check className="w-3.5 h-3.5 text-green-500" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-gray-400" />
          )}
        </button>
      </div>
    </div>
  )
}

function formatDateInput(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getZodiacSign(month: number, day: number): string {
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'aquarius'
  if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return 'pisces'
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'aries'
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'taurus'
  if ((month === 5 && day >= 21) || (month === 6 && day <= 21)) return 'gemini'
  if ((month === 6 && day >= 22) || (month === 7 && day <= 22)) return 'cancer'
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'leo'
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'virgo'
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'libra'
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'scorpio'
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'sagittarius'
  return 'capricorn'
}

function getGeneration(year: number): string {
  if (year >= 2013) return 'genAlpha'
  if (year >= 1997) return 'genZ'
  if (year >= 1981) return 'millennial'
  if (year >= 1965) return 'genX'
  if (year >= 1946) return 'babyBoomer'
  return 'silent'
}
