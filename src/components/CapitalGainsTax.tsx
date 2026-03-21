'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { Calculator, AlertTriangle, CheckCircle, Info, Link, Check } from 'lucide-react'

interface CalcResult {
  transferProfit: number        // 양도차익
  lthdRate: number              // 장기보유특별공제율
  lthdAmount: number            // 장기보유특별공제액
  transferIncome: number        // 양도소득금액
  basicDeduction: number        // 기본공제
  taxBase: number               // 과세표준
  baseRate: number              // 기본세율
  surchargeRate: number         // 중과세율 추가분
  appliedRate: number           // 적용세율
  progressiveDeduction: number  // 누진공제
  calculatedTax: number         // 산출세액
  localIncomeTax: number        // 지방소득세
  totalTax: number              // 총 납부세액
  effectiveRate: number         // 실효세율
  isExempt: boolean             // 1세대1주택 비과세
  exemptAmount: number          // 비과세 적용 금액
  taxableRatio: number          // 과세 비율 (12억 초과분)
  holdingYears: number          // 보유기간(년)
  residenceYears: number        // 거주기간(년)
}

function formatWon(value: number): string {
  return Math.round(value).toLocaleString('ko-KR')
}

function parseNumber(str: string): number {
  return Number(str.replace(/,/g, '')) || 0
}

function formatInput(str: string): string {
  const num = str.replace(/[^\d]/g, '')
  if (!num) return ''
  return Number(num).toLocaleString('ko-KR')
}

// 연도 차이 계산
function yearsBetween(from: string, to: string): number {
  if (!from || !to) return 0
  const d1 = new Date(from)
  const d2 = new Date(to)
  const diff = (d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  return Math.max(0, diff)
}

// 장기보유특별공제율 - 일반 부동산
function getGeneralLTHDRate(years: number): number {
  if (years < 3) return 0
  const brackets = [
    [15, 0.30], [14, 0.28], [13, 0.26], [12, 0.24],
    [11, 0.22], [10, 0.20], [9, 0.18], [8, 0.16],
    [7, 0.14], [6, 0.12], [5, 0.10], [4, 0.08], [3, 0.06],
  ]
  for (const [yr, rate] of brackets) {
    if (years >= yr) return rate as number
  }
  return 0
}

// 장기보유특별공제율 - 1세대1주택 (보유 + 거주 합산)
function getOneHouseLTHDRate(holdYears: number, residYears: number): { holdRate: number; residRate: number; total: number } {
  function bracketRate(years: number): number {
    if (years < 3) return 0
    const r = Math.min(Math.floor(years - 3) * 0.04 + 0.12, 0.40)
    return r
  }
  const holdRate = bracketRate(holdYears)
  const residRate = bracketRate(residYears)
  return { holdRate, residRate, total: Math.min(holdRate + residRate, 0.80) }
}

// 누진세율 계산
function calcProgressiveTax(taxBase: number): { rate: number; deduction: number; tax: number } {
  const brackets = [
    { limit: 14_000_000, rate: 0.06, deduction: 0 },
    { limit: 50_000_000, rate: 0.15, deduction: 1_260_000 },
    { limit: 88_000_000, rate: 0.24, deduction: 5_760_000 },
    { limit: 150_000_000, rate: 0.35, deduction: 15_440_000 },
    { limit: 300_000_000, rate: 0.38, deduction: 19_940_000 },
    { limit: 500_000_000, rate: 0.40, deduction: 25_940_000 },
    { limit: 1_000_000_000, rate: 0.42, deduction: 35_940_000 },
    { limit: Infinity, rate: 0.45, deduction: 65_940_000 },
  ]
  for (const b of brackets) {
    if (taxBase <= b.limit) {
      return { rate: b.rate, deduction: b.deduction, tax: taxBase * b.rate - b.deduction }
    }
  }
  return { rate: 0.45, deduction: 65_940_000, tax: taxBase * 0.45 - 65_940_000 }
}

export default function CapitalGainsTax() {
  const t = useTranslations('capitalGainsTax')
  const searchParams = useSearchParams()

  // inputs — initialise from URL params if present
  const [salePrice, setSalePrice] = useState(() => {
    const v = searchParams.get('sp')
    return v ? Number(v).toLocaleString('ko-KR') : ''
  })
  const [acqPrice, setAcqPrice] = useState(() => {
    const v = searchParams.get('ap')
    return v ? Number(v).toLocaleString('ko-KR') : ''
  })
  const [expenses, setExpenses] = useState(() => {
    const v = searchParams.get('ex')
    return v ? Number(v).toLocaleString('ko-KR') : ''
  })
  const [acqDate, setAcqDate] = useState(() => searchParams.get('ad') ?? '')
  const [saleDate, setSaleDate] = useState(() => searchParams.get('sd') ?? '')
  const [propertyType, setPropertyType] = useState<'general' | 'house'>(() => {
    const v = searchParams.get('pt')
    return v === 'general' ? 'general' : 'house'
  })
  const [houseCount, setHouseCount] = useState<'1' | '2' | '3plus'>(() => {
    const v = searchParams.get('hc')
    return (v === '2' || v === '3plus') ? v : '1'
  })
  const [isAdjusted, setIsAdjusted] = useState(() => searchParams.get('ia') === '1')
  const [residenceYears, setResidenceYears] = useState(() => searchParams.get('ry') ?? '')
  const [applySurcharge, setApplySurcharge] = useState(() => searchParams.get('as') === '1')

  // URL sync
  useEffect(() => {
    const params = new URLSearchParams()
    if (salePrice)        params.set('sp', String(parseNumber(salePrice)))
    if (acqPrice)         params.set('ap', String(parseNumber(acqPrice)))
    if (expenses)         params.set('ex', String(parseNumber(expenses)))
    if (acqDate)          params.set('ad', acqDate)
    if (saleDate)         params.set('sd', saleDate)
    if (propertyType !== 'house') params.set('pt', propertyType)
    if (houseCount !== '1') params.set('hc', houseCount)
    if (isAdjusted)       params.set('ia', '1')
    if (residenceYears)   params.set('ry', residenceYears)
    if (applySurcharge)   params.set('as', '1')
    const qs = params.toString()
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname)
  }, [salePrice, acqPrice, expenses, acqDate, saleDate, propertyType, houseCount, isAdjusted, residenceYears, applySurcharge])

  // Copy link state
  const [linkCopied, setLinkCopied] = useState(false)
  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = window.location.href
      ta.style.position = 'fixed'; ta.style.left = '-999999px'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }, [])

  const salePriceNum = parseNumber(salePrice)
  const acqPriceNum = parseNumber(acqPrice)
  const expensesNum = parseNumber(expenses)
  const residYears = Number(residenceYears) || 0

  const result = useMemo<CalcResult | null>(() => {
    if (!salePriceNum || !acqPriceNum) return null

    const holdYears = yearsBetween(acqDate, saleDate)

    // 1. 양도차익
    const transferProfit = Math.max(0, salePriceNum - acqPriceNum - expensesNum)

    // 2. 1세대1주택 비과세 확인
    const isOneHouse = propertyType === 'house' && houseCount === '1'
    const residenceMet = isOneHouse && holdYears >= 2 && (isAdjusted ? residYears >= 2 : true)
    const EXEMPT_THRESHOLD = 1_200_000_000 // 12억

    let isExempt = false
    let exemptAmount = 0
    let taxableRatio = 1

    if (residenceMet && transferProfit > 0) {
      if (salePriceNum <= EXEMPT_THRESHOLD) {
        isExempt = true
        exemptAmount = transferProfit
        taxableRatio = 0
      } else {
        // 초과분만 과세: 과세 비율 = (양도가 - 12억) / 양도가
        taxableRatio = (salePriceNum - EXEMPT_THRESHOLD) / salePriceNum
        exemptAmount = transferProfit * (1 - taxableRatio)
        isExempt = false
      }
    }

    const taxableProfit = transferProfit * taxableRatio

    if (taxableProfit <= 0) {
      return {
        transferProfit, lthdRate: 0, lthdAmount: 0,
        transferIncome: 0, basicDeduction: 2_500_000, taxBase: 0,
        baseRate: 0, surchargeRate: 0, appliedRate: 0, progressiveDeduction: 0,
        calculatedTax: 0, localIncomeTax: 0, totalTax: 0,
        effectiveRate: 0, isExempt, exemptAmount, taxableRatio, holdingYears: holdYears,
        residenceYears: residYears,
      }
    }

    // 3. 장기보유특별공제
    let lthdRate = 0

    // 다주택자 조정지역: 공제 배제
    const excludeLTHD = propertyType === 'house' && houseCount !== '1' && isAdjusted && applySurcharge

    if (!excludeLTHD) {
      if (isOneHouse && residenceMet) {
        const rates = getOneHouseLTHDRate(holdYears, residYears)
        lthdRate = rates.total
      } else if (propertyType === 'general' || houseCount !== '1') {
        lthdRate = getGeneralLTHDRate(holdYears)
      } else if (propertyType === 'house') {
        lthdRate = getGeneralLTHDRate(holdYears)
      }
    }

    const lthdAmount = taxableProfit * lthdRate

    // 4. 양도소득금액
    const transferIncome = taxableProfit - lthdAmount

    // 5. 기본공제 250만
    const basicDeduction = 2_500_000

    // 6. 과세표준
    const taxBase = Math.max(0, transferIncome - basicDeduction)

    if (taxBase <= 0) {
      return {
        transferProfit, lthdRate, lthdAmount, transferIncome,
        basicDeduction, taxBase: 0, baseRate: 0, surchargeRate: 0, appliedRate: 0,
        progressiveDeduction: 0, calculatedTax: 0, localIncomeTax: 0, totalTax: 0,
        effectiveRate: 0, isExempt, exemptAmount, taxableRatio, holdingYears: holdYears,
        residenceYears: residYears,
      }
    }

    // 7. 세율 계산
    const { rate: baseRate, deduction: progressiveDeduction } = calcProgressiveTax(taxBase)

    let surchargeRate = 0
    if (applySurcharge && isAdjusted && propertyType === 'house') {
      if (houseCount === '2') surchargeRate = 0.20
      else if (houseCount === '3plus') surchargeRate = 0.30
    }

    const appliedRate = Math.min(baseRate + surchargeRate, 0.75) // 최대 75% (theoretical)
    let calculatedTax: number

    if (surchargeRate > 0) {
      // 중과: 과세표준 × (기본세율 + 중과세율) - 누진공제
      calculatedTax = taxBase * appliedRate - progressiveDeduction
    } else {
      calculatedTax = taxBase * baseRate - progressiveDeduction
    }
    calculatedTax = Math.max(0, calculatedTax)

    const localIncomeTax = calculatedTax * 0.10
    const totalTax = calculatedTax + localIncomeTax
    const effectiveRate = salePriceNum > 0 ? totalTax / salePriceNum : 0

    return {
      transferProfit, lthdRate, lthdAmount, transferIncome,
      basicDeduction, taxBase, baseRate, surchargeRate, appliedRate,
      progressiveDeduction, calculatedTax, localIncomeTax, totalTax,
      effectiveRate, isExempt, exemptAmount, taxableRatio,
      holdingYears: holdYears, residenceYears: residYears,
    }
  }, [salePriceNum, acqPriceNum, expensesNum, acqDate, saleDate, propertyType, houseCount, isAdjusted, residYears, applySurcharge])

  const handleSalePrice = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSalePrice(formatInput(e.target.value))
  }, [])
  const handleAcqPrice = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setAcqPrice(formatInput(e.target.value))
  }, [])
  const handleExpenses = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setExpenses(formatInput(e.target.value))
  }, [])

  const holdYearsDisplay = acqDate && saleDate ? yearsBetween(acqDate, saleDate) : 0

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Calculator className="w-7 h-7 text-blue-600" />
            {t('title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
        </div>
        <button
          onClick={copyLink}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          title="링크 복사"
        >
          {linkCopied
            ? <><Check className="w-4 h-4 text-green-500" /><span className="text-green-600 dark:text-green-400">복사됨</span></>
            : <><Link className="w-4 h-4" /><span>링크 복사</span></>
          }
        </button>
      </div>

      {/* 메인 그리드 */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* 입력 패널 */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('inputTitle')}</h2>

            {/* 양도가액 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('salePrice')} <span className="text-gray-400 text-xs">({t('wonUnit')})</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={salePrice}
                onChange={handleSalePrice}
                placeholder={t('salePricePlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* 취득가액 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('acqPrice')} <span className="text-gray-400 text-xs">({t('wonUnit')})</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={acqPrice}
                onChange={handleAcqPrice}
                placeholder={t('acqPricePlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* 필요경비 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('expenses')} <span className="text-gray-400 text-xs">({t('wonUnit')})</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={expenses}
                onChange={handleExpenses}
                placeholder={t('expensesPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('expensesHint')}</p>
            </div>

            {/* 취득일 / 양도일 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('acqDate')}</label>
                <input
                  type="date"
                  value={acqDate}
                  onChange={e => setAcqDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('saleDate')}</label>
                <input
                  type="date"
                  value={saleDate}
                  onChange={e => setSaleDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            {holdYearsDisplay > 0 && (
              <p className="text-sm text-blue-600 dark:text-blue-400">
                {t('holdingPeriod')}: <strong>{holdYearsDisplay.toFixed(1)}{t('yearsUnit')}</strong>
              </p>
            )}

            {/* 부동산 유형 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('propertyType')}</label>
              <div className="flex gap-4">
                {(['general', 'house'] as const).map(type => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value={type}
                      checked={propertyType === type}
                      onChange={() => setPropertyType(type)}
                      className="accent-blue-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {type === 'general' ? t('propertyGeneral') : t('propertyHouse')}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* 주택 수 */}
            {propertyType === 'house' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('houseCount')}</label>
                <select
                  value={houseCount}
                  onChange={e => setHouseCount(e.target.value as '1' | '2' | '3plus')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="1">{t('houseCount1')}</option>
                  <option value="2">{t('houseCount2')}</option>
                  <option value="3plus">{t('houseCount3plus')}</option>
                </select>
              </div>
            )}

            {/* 조정대상지역 */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isAdjusted}
                onChange={e => setIsAdjusted(e.target.checked)}
                className="accent-blue-600 w-4 h-4"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">{t('isAdjusted')}</span>
            </label>

            {/* 거주기간 (1주택 비과세용) */}
            {propertyType === 'house' && houseCount === '1' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('residenceYears')} <span className="text-gray-400 text-xs">({t('yearsUnit')})</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={residenceYears}
                  onChange={e => setResidenceYears(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* 중과 적용 여부 토글 */}
            {propertyType === 'house' && houseCount !== '1' && isAdjusted && (
              <div className="bg-amber-50 dark:bg-amber-950 rounded-lg p-3 space-y-2">
                <p className="text-xs text-amber-700 dark:text-amber-300 flex items-start gap-1">
                  <Info className="w-3 h-3 mt-0.5 shrink-0" />
                  {t('surchargeNote')}
                </p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applySurcharge}
                    onChange={e => setApplySurcharge(e.target.checked)}
                    className="accent-amber-600 w-4 h-4"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t('applySurcharge')}</span>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* 결과 패널 */}
        <div className="lg:col-span-2 space-y-4">
          {result ? (
            <>
              {/* 비과세 뱃지 */}
              {result.isExempt ? (
                <div className="flex items-center gap-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-xl p-4">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 shrink-0" />
                  <div>
                    <p className="font-semibold text-green-800 dark:text-green-300">{t('exemptBadge')}</p>
                    <p className="text-sm text-green-700 dark:text-green-400">{t('exemptDesc')}</p>
                  </div>
                </div>
              ) : result.taxableRatio < 1 && result.taxableRatio > 0 ? (
                <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                  <Info className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0" />
                  <div>
                    <p className="font-semibold text-blue-800 dark:text-blue-300">{t('partialExemptBadge')}</p>
                    <p className="text-sm text-blue-700 dark:text-blue-400">
                      {t('partialExemptDesc')} ({(result.taxableRatio * 100).toFixed(1)}% {t('taxableRatioLabel')})
                    </p>
                  </div>
                </div>
              ) : null}

              {/* 총 납부세액 요약 */}
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl shadow-lg p-6 text-white">
                <p className="text-blue-200 text-sm font-medium">{t('totalTaxLabel')}</p>
                <p className="text-4xl font-bold mt-1">
                  {formatWon(result.totalTax)}<span className="text-xl ml-1">{t('wonUnit')}</span>
                </p>
                <div className="flex flex-wrap gap-4 mt-4 text-sm">
                  <span className="text-blue-200">
                    {t('calculatedTaxLabel')}: <strong className="text-white">{formatWon(result.calculatedTax)}{t('wonUnit')}</strong>
                  </span>
                  <span className="text-blue-200">
                    {t('localTaxLabel')}: <strong className="text-white">{formatWon(result.localIncomeTax)}{t('wonUnit')}</strong>
                  </span>
                  <span className="text-blue-200">
                    {t('effectiveRateLabel')}: <strong className="text-white">{(result.effectiveRate * 100).toFixed(2)}%</strong>
                  </span>
                </div>
              </div>

              {/* 단계별 계산 상세 */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">{t('breakdownTitle')}</h3>
                <div className="space-y-0 divide-y divide-gray-100 dark:divide-gray-700">
                  {[
                    { label: t('salePrice'), value: salePriceNum, highlight: false },
                    { label: `(-)  ${t('acqPrice')}`, value: acqPriceNum, highlight: false },
                    { label: `(-)  ${t('expenses')}`, value: expensesNum, highlight: false },
                    { label: t('transferProfitLabel'), value: result.transferProfit, highlight: true },
                    ...(result.exemptAmount > 0 ? [{ label: `(-)  ${t('exemptAmountLabel')}`, value: result.exemptAmount, highlight: false }] : []),
                    { label: `(-)  ${t('lthdLabel')} (${(result.lthdRate * 100).toFixed(0)}%)`, value: result.lthdAmount, highlight: false },
                    { label: t('transferIncomeLabel'), value: result.transferIncome, highlight: true },
                    { label: `(-)  ${t('basicDeductionLabel')}`, value: result.basicDeduction, highlight: false },
                    { label: t('taxBaseLabel'), value: result.taxBase, highlight: true },
                  ].map((row, i) => (
                    <div key={i} className={`flex justify-between items-center py-2.5 ${row.highlight ? 'font-semibold' : ''}`}>
                      <span className={`text-sm ${row.highlight ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                        {row.label}
                      </span>
                      <span className={`text-sm tabular-nums ${row.highlight ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                        {formatWon(row.value)}{t('wonUnit')}
                      </span>
                    </div>
                  ))}

                  {/* 세율 행 */}
                  <div className="py-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {t('taxRateLabel')}
                      </span>
                      <span className="text-sm text-gray-700 dark:text-gray-300 tabular-nums">
                        {(result.baseRate * 100).toFixed(0)}%
                        {result.surchargeRate > 0 && (
                          <span className="text-amber-600 dark:text-amber-400 ml-1">
                            (+{(result.surchargeRate * 100).toFixed(0)}% {t('surchargeLabel')})
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-sm text-gray-600 dark:text-gray-400">(-)  {t('progressiveDeductionLabel')}</span>
                      <span className="text-sm text-gray-700 dark:text-gray-300 tabular-nums">
                        {formatWon(result.progressiveDeduction)}{t('wonUnit')}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center py-2.5 font-semibold">
                    <span className="text-sm text-gray-900 dark:text-white">{t('calculatedTaxLabel')}</span>
                    <span className="text-sm text-blue-600 dark:text-blue-400 tabular-nums">
                      {formatWon(result.calculatedTax)}{t('wonUnit')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2.5">
                    <span className="text-sm text-gray-600 dark:text-gray-400">(+)  {t('localTaxLabel')} (10%)</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300 tabular-nums">
                      {formatWon(result.localIncomeTax)}{t('wonUnit')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3 font-bold bg-blue-50 dark:bg-blue-950 rounded-lg px-2 mt-1">
                    <span className="text-base text-gray-900 dark:text-white">{t('totalTaxLabel')}</span>
                    <span className="text-base text-blue-700 dark:text-blue-300 tabular-nums">
                      {formatWon(result.totalTax)}{t('wonUnit')}
                    </span>
                  </div>
                </div>
              </div>

              {/* 장기보유특별공제 시각화 */}
              {result.lthdRate > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">{t('lthdVisualTitle')}</h3>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                      <div
                        className="h-4 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-500"
                        style={{ width: `${(result.lthdRate * 100).toFixed(0)}%` }}
                      />
                    </div>
                    <span className="text-lg font-bold text-green-600 dark:text-green-400 w-12 text-right">
                      {(result.lthdRate * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {t('lthdVisualDesc')} {formatWon(result.lthdAmount)}{t('wonUnit')} {t('lthdVisualDeducted')}
                  </p>
                  {result.holdingYears > 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {t('holdingPeriod')}: {result.holdingYears.toFixed(1)}{t('yearsUnit')}
                      {result.residenceYears > 0 && ` / ${t('residenceYears')}: ${result.residenceYears}${t('yearsUnit')}`}
                    </p>
                  )}
                </div>
              )}

              {/* 주의사항 */}
              <div className="bg-amber-50 dark:bg-amber-950 rounded-xl p-5 border border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                  <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">{t('cautionTitle')}</h3>
                </div>
                <ul className="space-y-1.5">
                  {(t.raw('cautionItems') as string[]).map((item, i) => (
                    <li key={i} className="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-1.5">
                      <span className="shrink-0 mt-0.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 flex flex-col items-center justify-center text-center">
              <Calculator className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">{t('emptyState')}</p>
            </div>
          )}
        </div>
      </div>

      {/* 가이드 섹션 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Info className="w-5 h-5 text-blue-500" />
          {t('guideTitle')}
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {/* 계산 순서 */}
          <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-5">
            <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-3">{t('guideStepsTitle')}</h3>
            <ol className="space-y-2">
              {(t.raw('guideSteps') as string[]).map((step, i) => (
                <li key={i} className="text-sm text-blue-800 dark:text-blue-300 flex gap-2">
                  <span className="font-bold shrink-0">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* 1세대1주택 비과세 */}
          <div className="bg-green-50 dark:bg-green-950 rounded-xl p-5">
            <h3 className="font-semibold text-green-900 dark:text-green-200 mb-3">{t('guideExemptTitle')}</h3>
            <ul className="space-y-2">
              {(t.raw('guideExemptItems') as string[]).map((item, i) => (
                <li key={i} className="text-sm text-green-800 dark:text-green-300 flex items-start gap-1.5">
                  <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 장기보유특별공제 */}
          <div className="bg-purple-50 dark:bg-purple-950 rounded-xl p-5">
            <h3 className="font-semibold text-purple-900 dark:text-purple-200 mb-3">{t('guideLthdTitle')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-purple-700 dark:text-purple-400">
                    <th className="text-left py-1">{t('guideLthdPeriod')}</th>
                    <th className="text-right py-1">{t('guideLthdGeneral')}</th>
                    <th className="text-right py-1">{t('guideLthdOneHouse')}</th>
                  </tr>
                </thead>
                <tbody className="text-purple-800 dark:text-purple-300">
                  {[
                    ['3~4년', '6%', '12%'],
                    ['5~6년', '10%', '20%'],
                    ['7~8년', '14%', '28%'],
                    ['9~10년', '18%', '36%'],
                    ['10년+', '20%', '최대 80%'],
                    ['15년+', '30%', '최대 80%'],
                  ].map(([period, gen, one], i) => (
                    <tr key={i} className="border-t border-purple-200 dark:border-purple-800">
                      <td className="py-1">{period}</td>
                      <td className="text-right py-1">{gen}</td>
                      <td className="text-right py-1">{one}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 세율표 */}
          <div className="bg-orange-50 dark:bg-orange-950 rounded-xl p-5">
            <h3 className="font-semibold text-orange-900 dark:text-orange-200 mb-3">{t('guideTaxRateTitle')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-orange-700 dark:text-orange-400">
                    <th className="text-left py-1">{t('guideTaxRateBase')}</th>
                    <th className="text-right py-1">{t('guideTaxRateRate')}</th>
                  </tr>
                </thead>
                <tbody className="text-orange-800 dark:text-orange-300">
                  {[
                    ['1,400만 이하', '6%'],
                    ['1,400~5,000만', '15%'],
                    ['5,000~8,800만', '24%'],
                    ['8,800만~1.5억', '35%'],
                    ['1.5~3억', '38%'],
                    ['3~5억', '40%'],
                    ['5~10억', '42%'],
                    ['10억 초과', '45%'],
                  ].map(([range, rate], i) => (
                    <tr key={i} className="border-t border-orange-200 dark:border-orange-800">
                      <td className="py-1">{range}</td>
                      <td className="text-right py-1 font-medium">{rate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
