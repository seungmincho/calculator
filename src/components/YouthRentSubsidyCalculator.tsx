'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  CheckCircle,
  XCircle,
  Home,
  DollarSign,
  Users,
  Building2,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Search,
  Share2,
  Copy,
  Check,
} from 'lucide-react'
import GuideSection from '@/components/GuideSection'

// 2026년 중위소득 (월)
const MEDIAN_INCOME_2026: Record<number, number> = {
  1: 2392013,
  2: 3932658,
  3: 5025353,
  4: 6097773,
  5: 7108192,
  6: 8064805,
}

const MAX_MONTHLY_SUPPORT = 200000 // 월 최대 20만원
const MAX_MONTHS = 12
const MAX_ASSET = 12200 // 1.22억 = 12,200만원
const MAX_DEPOSIT = 5000 // 5,000만원
const MAX_RENT = 70 // 70만원
const MIN_AGE = 19
const MAX_AGE = 34

interface CheckResult {
  age: boolean
  independent: boolean
  homeless: boolean
  ownIncome: boolean
  parentIncome: boolean
  asset: boolean
  housing: boolean
}

interface CalcResult {
  eligible: boolean
  checks: CheckResult
  monthlySupport: number
  totalSupport: number
  ownIncomeLimit: number
  parentIncomeLimit: number
}

function formatNumber(value: string): string {
  const num = value.replace(/[^0-9]/g, '')
  if (!num) return ''
  return Number(num).toLocaleString('ko-KR')
}

function parseNumber(value: string): number {
  return parseInt(value.replace(/[^0-9]/g, ''), 10) || 0
}

export default function YouthRentSubsidyCalculator() {
  const t = useTranslations('youthRentSubsidy')
  const searchParams = useSearchParams()

  // Form state
  const [age, setAge] = useState(searchParams.get('age') || '25')
  const [isIndependent, setIsIndependent] = useState(searchParams.get('independent') !== 'false')
  const [isHomeless, setIsHomeless] = useState(searchParams.get('homeless') !== 'false')
  const [ownIncome, setOwnIncome] = useState(searchParams.get('ownIncome') || '')
  const [parentIncome, setParentIncome] = useState(searchParams.get('parentIncome') || '')
  const [householdSize, setHouseholdSize] = useState(searchParams.get('household') || '4')
  const [asset, setAsset] = useState(searchParams.get('asset') || '')
  const [rent, setRent] = useState(searchParams.get('rent') || '')
  const [deposit, setDeposit] = useState(searchParams.get('deposit') || '')
  const [housingType, setHousingType] = useState(searchParams.get('type') || 'officetel')

  const [result, setResult] = useState<CalcResult | null>(null)
  const [showApplyInfo, setShowApplyInfo] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)

  // URL sync
  const updateURL = useCallback((params: Record<string, string>) => {
    const url = new URL(window.location.href)
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        url.searchParams.set(key, value)
      } else {
        url.searchParams.delete(key)
      }
    })
    window.history.replaceState({}, '', url)
  }, [])

  // Calculation
  const calculate = useCallback(() => {
    const ageNum = parseInt(age) || 0
    const ownIncomeNum = parseNumber(ownIncome)
    const parentIncomeNum = parseNumber(parentIncome)
    const assetNum = parseNumber(asset)
    const rentNum = parseNumber(rent)
    const depositNum = parseNumber(deposit)
    const sizeNum = parseInt(householdSize) || 1

    const ownIncomeLimit = Math.floor((MEDIAN_INCOME_2026[1] || 0) * 0.6)
    const parentIncomeLimit = MEDIAN_INCOME_2026[Math.min(sizeNum, 6)] || MEDIAN_INCOME_2026[6]

    const checks: CheckResult = {
      age: ageNum >= MIN_AGE && ageNum <= MAX_AGE,
      independent: isIndependent,
      homeless: isHomeless,
      ownIncome: ownIncomeNum * 10000 <= ownIncomeLimit,
      parentIncome: parentIncomeNum * 10000 <= parentIncomeLimit,
      asset: assetNum <= MAX_ASSET,
      housing: depositNum <= MAX_DEPOSIT && rentNum <= MAX_RENT,
    }

    const eligible = Object.values(checks).every(Boolean)

    const actualRent = rentNum * 10000
    const monthlySupport = eligible ? Math.min(actualRent, MAX_MONTHLY_SUPPORT) : 0
    const totalSupport = monthlySupport * MAX_MONTHS

    const calcResult: CalcResult = {
      eligible,
      checks,
      monthlySupport,
      totalSupport,
      ownIncomeLimit,
      parentIncomeLimit,
    }

    setResult(calcResult)

    updateURL({
      age,
      independent: String(isIndependent),
      homeless: String(isHomeless),
      ownIncome: ownIncome.replace(/,/g, ''),
      parentIncome: parentIncome.replace(/,/g, ''),
      household: householdSize,
      asset: asset.replace(/,/g, ''),
      rent: rent.replace(/,/g, ''),
      deposit: deposit.replace(/,/g, ''),
      type: housingType,
    })
  }, [age, isIndependent, isHomeless, ownIncome, parentIncome, householdSize, asset, rent, deposit, housingType, updateURL])

  const reset = useCallback(() => {
    setAge('25')
    setIsIndependent(true)
    setIsHomeless(true)
    setOwnIncome('')
    setParentIncome('')
    setHouseholdSize('4')
    setAsset('')
    setRent('')
    setDeposit('')
    setHousingType('officetel')
    setResult(null)
    window.history.replaceState({}, '', window.location.pathname)
  }, [])

  const shareUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopiedUrl(true)
      setTimeout(() => setCopiedUrl(false), 2000)
    } catch {
      setCopiedUrl(true)
      setTimeout(() => setCopiedUrl(false), 2000)
    }
  }, [])

  // Auto-calculate if URL params exist
  useEffect(() => {
    if (searchParams.get('ownIncome')) {
      const raw = searchParams.get('ownIncome') || ''
      if (raw) setOwnIncome(formatNumber(raw))
      const pRaw = searchParams.get('parentIncome') || ''
      if (pRaw) setParentIncome(formatNumber(pRaw))
      const aRaw = searchParams.get('asset') || ''
      if (aRaw) setAsset(formatNumber(aRaw))
      const rRaw = searchParams.get('rent') || ''
      if (rRaw) setRent(formatNumber(rRaw))
      const dRaw = searchParams.get('deposit') || ''
      if (dRaw) setDeposit(formatNumber(dRaw))

      // Delay to let state update
      setTimeout(() => calculate(), 100)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const housingTypes = useMemo(() => [
    { value: 'officetel', label: t('housingTypes.officetel') },
    { value: 'oneroom', label: t('housingTypes.oneroom') },
    { value: 'apartment', label: t('housingTypes.apartment') },
    { value: 'goshiwon', label: t('housingTypes.goshiwon') },
    { value: 'sharehouse', label: t('housingTypes.sharehouse') },
  ], [t])

  const checkItems = useMemo(() => {
    if (!result) return []
    const size = parseInt(householdSize) || 1
    const parentLimit = MEDIAN_INCOME_2026[Math.min(size, 6)] || MEDIAN_INCOME_2026[6]
    return [
      {
        key: 'age',
        label: t('checks.age'),
        detail: t('checks.ageDetail', { min: MIN_AGE, max: MAX_AGE }),
        pass: result.checks.age,
      },
      {
        key: 'independent',
        label: t('checks.independent'),
        detail: t('checks.independentDetail'),
        pass: result.checks.independent,
      },
      {
        key: 'homeless',
        label: t('checks.homeless'),
        detail: t('checks.homelessDetail'),
        pass: result.checks.homeless,
      },
      {
        key: 'ownIncome',
        label: t('checks.ownIncome'),
        detail: t('checks.ownIncomeDetail', { limit: Math.floor(result.ownIncomeLimit / 10000).toLocaleString('ko-KR') }),
        pass: result.checks.ownIncome,
      },
      {
        key: 'parentIncome',
        label: t('checks.parentIncome'),
        detail: t('checks.parentIncomeDetail', { size, limit: Math.floor(parentLimit / 10000).toLocaleString('ko-KR') }),
        pass: result.checks.parentIncome,
      },
      {
        key: 'asset',
        label: t('checks.asset'),
        detail: t('checks.assetDetail', { limit: MAX_ASSET.toLocaleString('ko-KR') }),
        pass: result.checks.asset,
      },
      {
        key: 'housing',
        label: t('checks.housing'),
        detail: t('checks.housingDetail', { depositLimit: MAX_DEPOSIT.toLocaleString('ko-KR'), rentLimit: MAX_RENT }),
        pass: result.checks.housing,
      },
    ]
  }, [result, householdSize, t])

  const passCount = result ? Object.values(result.checks).filter(Boolean).length : 0
  const totalChecks = 7

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-800 dark:to-teal-800 rounded-2xl p-6 sm:p-8 text-white">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">{t('title')}</h1>
        <p className="text-emerald-100 text-sm sm:text-base mb-6">{t('description')}</p>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/20 backdrop-blur rounded-xl p-4 text-center">
            <div className="text-2xl sm:text-3xl font-bold">{t('hero.monthly')}</div>
            <div className="text-xs sm:text-sm text-emerald-100 mt-1">{t('hero.monthlyLabel')}</div>
          </div>
          <div className="bg-white/20 backdrop-blur rounded-xl p-4 text-center">
            <div className="text-2xl sm:text-3xl font-bold">{t('hero.months')}</div>
            <div className="text-xs sm:text-sm text-emerald-100 mt-1">{t('hero.monthsLabel')}</div>
          </div>
          <div className="bg-white/20 backdrop-blur rounded-xl p-4 text-center">
            <div className="text-2xl sm:text-3xl font-bold">{t('hero.total')}</div>
            <div className="text-xs sm:text-sm text-emerald-100 mt-1">{t('hero.totalLabel')}</div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Panel - Input Form */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-5 sticky top-24">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-600" />
              {t('inputTitle')}
            </h2>

            {/* 만 나이 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('ageLabel')}
              </label>
              <input
                type="number"
                min={15}
                max={50}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('ageHint')}</p>
            </div>

            {/* 독립 거주 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('independentLabel')}
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={isIndependent}
                    onChange={() => setIsIndependent(true)}
                    className="accent-blue-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t('yes')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={!isIndependent}
                    onChange={() => setIsIndependent(false)}
                    className="accent-blue-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t('no')}</span>
                </label>
              </div>
            </div>

            {/* 주택 소유 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('homelessLabel')}
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={isHomeless}
                    onChange={() => setIsHomeless(true)}
                    className="accent-blue-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t('homeless')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={!isHomeless}
                    onChange={() => setIsHomeless(false)}
                    className="accent-blue-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t('hasHome')}</span>
                </label>
              </div>
            </div>

            {/* 본인 월 소득 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('ownIncomeLabel')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={ownIncome}
                  onChange={(e) => setOwnIncome(formatNumber(e.target.value))}
                  placeholder="0"
                  className="w-full px-3 py-2 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">{t('manwon')}</span>
              </div>
            </div>

            {/* 원가구 가구원 수 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('householdSizeLabel')}
              </label>
              <select
                value={householdSize}
                onChange={(e) => setHouseholdSize(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>{t('householdSizeOption', { n })}</option>
                ))}
              </select>
            </div>

            {/* 원가구 월 소득 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('parentIncomeLabel')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={parentIncome}
                  onChange={(e) => setParentIncome(formatNumber(e.target.value))}
                  placeholder="0"
                  className="w-full px-3 py-2 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">{t('manwon')}</span>
              </div>
            </div>

            {/* 본인 총 재산 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('assetLabel')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={asset}
                  onChange={(e) => setAsset(formatNumber(e.target.value))}
                  placeholder="0"
                  className="w-full px-3 py-2 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">{t('manwon')}</span>
              </div>
            </div>

            {/* 현재 월세 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('rentLabel')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={rent}
                  onChange={(e) => setRent(formatNumber(e.target.value))}
                  placeholder="0"
                  className="w-full px-3 py-2 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">{t('manwon')}</span>
              </div>
            </div>

            {/* 현재 보증금 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('depositLabel')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={deposit}
                  onChange={(e) => setDeposit(formatNumber(e.target.value))}
                  placeholder="0"
                  className="w-full px-3 py-2 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">{t('manwon')}</span>
              </div>
            </div>

            {/* 주거 유형 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('housingTypeLabel')}
              </label>
              <select
                value={housingType}
                onChange={(e) => setHousingType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                {housingTypes.map((ht) => (
                  <option key={ht.value} value={ht.value}>{ht.label}</option>
                ))}
              </select>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={calculate}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg px-4 py-3 font-medium hover:from-emerald-700 hover:to-teal-700 transition-all flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-5 h-5" />
                {t('checkButton')}
              </button>
              <button
                onClick={reset}
                className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-3 transition-all"
                title={t('resetButton')}
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel - Results */}
        <div className="lg:col-span-2 space-y-6">
          {!result ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
              <div className="w-16 h-16 mx-auto bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center mb-4">
                <Home className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('emptyTitle')}</h3>
              <p className="text-gray-500 dark:text-gray-400">{t('emptyDescription')}</p>
            </div>
          ) : (
            <>
              {/* Eligibility Badge */}
              <div className={`rounded-xl shadow-lg p-6 ${result.eligible
                ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/40 dark:to-emerald-950/40 border-2 border-green-200 dark:border-green-800'
                : 'bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/40 dark:to-orange-950/40 border-2 border-red-200 dark:border-red-800'
              }`}>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    {result.eligible ? (
                      <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
                    ) : (
                      <XCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
                    )}
                    <div>
                      <div className={`text-2xl font-bold ${result.eligible ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                        {result.eligible ? t('eligible') : t('ineligible')}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {t('checkSummary', { pass: passCount, total: totalChecks })}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={shareUrl}
                    className="flex items-center gap-2 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 transition-all"
                  >
                    {copiedUrl ? <Check className="w-4 h-4 text-green-600" /> : <Share2 className="w-4 h-4" />}
                    {copiedUrl ? t('copied') : t('share')}
                  </button>
                </div>
              </div>

              {/* Expected Support */}
              {result.eligible && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                    {t('supportTitle')}
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="bg-emerald-50 dark:bg-emerald-950/40 rounded-xl p-5 text-center">
                      <div className="text-sm text-emerald-600 dark:text-emerald-400 mb-1">{t('monthlySupport')}</div>
                      <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">
                        {(result.monthlySupport / 10000).toLocaleString('ko-KR')}{t('manwonUnit')}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        ({result.monthlySupport.toLocaleString('ko-KR')}{t('wonUnit')})
                      </div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950/40 rounded-xl p-5 text-center">
                      <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">{t('totalSupport')}</div>
                      <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                        {(result.totalSupport / 10000).toLocaleString('ko-KR')}{t('manwonUnit')}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        ({t('months12')})
                      </div>
                    </div>
                  </div>

                  {/* Breakdown */}
                  <div className="mt-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">{t('breakdown.actualRent')}</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {parseNumber(rent).toLocaleString('ko-KR')}{t('manwonUnit')} ({(parseNumber(rent) * 10000).toLocaleString('ko-KR')}{t('wonUnit')})
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">{t('breakdown.maxSupport')}</span>
                      <span className="font-medium text-gray-900 dark:text-white">20{t('manwonUnit')} (200,000{t('wonUnit')})</span>
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-600 pt-2 flex justify-between text-sm font-semibold">
                      <span className="text-emerald-600 dark:text-emerald-400">{t('breakdown.result')}</span>
                      <span className="text-emerald-700 dark:text-emerald-300">
                        {t('breakdown.resultValue', { monthly: (result.monthlySupport / 10000).toLocaleString('ko-KR'), total: (result.totalSupport / 10000).toLocaleString('ko-KR') })}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 7-item Checklist */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                  {t('checklistTitle')}
                </h3>
                <div className="space-y-3">
                  {checkItems.map((item) => (
                    <div
                      key={item.key}
                      className={`flex items-start gap-3 p-3 rounded-lg border ${
                        item.pass
                          ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
                          : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
                      }`}
                    >
                      {item.pass ? (
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{item.label}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                            item.pass
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}>
                            {item.pass ? t('pass') : t('fail')}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 신청 안내 */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                <button
                  onClick={() => setShowApplyInfo(!showApplyInfo)}
                  className="w-full flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    {t('applyInfoTitle')}
                  </h3>
                  {showApplyInfo ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </button>
                {showApplyInfo && (
                  <div className="px-6 pb-6 space-y-5">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{t('applyMethodTitle')}</h4>
                      <ul className="space-y-2">
                        {(t.raw('applyMethods') as string[]).map((method, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                            <span className="w-5 h-5 flex-shrink-0 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">{i + 1}</span>
                            {method}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{t('docsTitle')}</h4>
                      <ul className="space-y-1">
                        {(t.raw('docsList') as string[]).map((doc, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                            <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            {doc}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* 중위소득 참고표 */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  {t('medianTableTitle')}
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400 font-medium">{t('medianTable.size')}</th>
                        <th className="text-right py-2 px-3 text-gray-600 dark:text-gray-400 font-medium">{t('medianTable.median')}</th>
                        <th className="text-right py-2 px-3 text-emerald-600 dark:text-emerald-400 font-medium">{t('medianTable.sixty')}</th>
                        <th className="text-right py-2 px-3 text-blue-600 dark:text-blue-400 font-medium">{t('medianTable.hundred')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(MEDIAN_INCOME_2026).map(([size, income]) => (
                        <tr key={size} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                          <td className="py-2 px-3 text-gray-900 dark:text-white font-medium">{t('medianTable.sizeUnit', { n: size })}</td>
                          <td className="py-2 px-3 text-right text-gray-700 dark:text-gray-300">{income.toLocaleString('ko-KR')}{t('wonUnit')}</td>
                          <td className="py-2 px-3 text-right text-emerald-700 dark:text-emerald-300 font-medium">{Math.floor(income * 0.6).toLocaleString('ko-KR')}{t('wonUnit')}</td>
                          <td className="py-2 px-3 text-right text-blue-700 dark:text-blue-300 font-medium">{income.toLocaleString('ko-KR')}{t('wonUnit')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">{t('medianTableNote')}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Guide Section */}
      <GuideSection namespace="youthRentSubsidy" />
    </div>
  )
}
