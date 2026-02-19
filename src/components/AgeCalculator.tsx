'use client'

import { useState, useMemo, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Copy, Check, BookOpen, Cake, Calendar, Star, Clock, RotateCcw } from 'lucide-react'

export default function AgeCalculator() {
  const t = useTranslations('ageCalculator')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const now = new Date()
  const [birthYear, setBirthYear] = useState('')
  const [birthMonth, setBirthMonth] = useState('')
  const [birthDay, setBirthDay] = useState('')
  const [baseDate, setBaseDate] = useState(formatDateInput(now))

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

    return {
      intAge,
      koreanAge,
      yearAge,
      totalDays,
      totalWeeks,
      totalMonths: totalMonths >= 0 ? totalMonths : 0,
      daysUntilBirthday,
      isBirthdayToday,
      zodiacAnimal,
      zodiacSign,
      birthDayOfWeek,
      generation,
      isEarlySchool,
      detailYears,
      detailMonths,
      detailDays,
    }
  }, [birthYear, birthMonth, birthDay, baseDate, now])

  const handleReset = useCallback(() => {
    setBirthYear('')
    setBirthMonth('')
    setBirthDay('')
    setBaseDate(formatDateInput(new Date()))
  }, [])

  // 연도 선택 옵션 생성
  const yearOptions = useMemo(() => {
    const years = []
    for (let y = now.getFullYear(); y >= 1920; y--) {
      years.push(y)
    }
    return years
  }, [now])

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
                  onChange={(e) => setBirthYear(e.target.value)}
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
                    onChange={(e) => setBirthMonth(e.target.value)}
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
                    onChange={(e) => setBirthDay(e.target.value)}
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
                onChange={(e) => setBaseDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={() => setBaseDate(formatDateInput(new Date()))}
                className="mt-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                {t('today')}
              </button>
            </div>

            <button
              onClick={handleReset}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors text-sm font-medium"
            >
              <RotateCcw className="w-4 h-4" />
              {t('reset')}
            </button>
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
                  생년월일을 입력하면 결과가 표시됩니다
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
