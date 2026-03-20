'use client'

// ── 번역 키 (namespace: acquisitionTaxCalc) ──
// title, description
// propertyType.label, propertyType.house, propertyType.land, propertyType.commercial
// price.label, price.placeholder
// area.label, area.placeholder
// houseCount.label, houseCount.one, houseCount.two, houseCount.threePlus, houseCount.corp
// adjustedArea.label, adjustedArea.yes, adjustedArea.no
// areaOver85.label, areaOver85.yes, areaOver85.no
// result.title, result.totalTax, result.effectiveRate
// result.acquisitionTax, result.specialTax, result.educationTax
// result.acquisitionTaxRate, result.specialTaxRate, result.educationTaxRate
// result.exemptLabel
// breakdown.title, breakdown.step1, breakdown.step2, breakdown.step3
// breakdown.price, breakdown.rate, breakdown.amount
// rateTable.title, rateTable.type, rateTable.condition, rateTable.rate
// rateTable.rows (array of objects rendered in table)
// disclaimer
// units.won, units.percent, units.sqm
// guide.title
// guide.acquisitionTax.title, guide.acquisitionTax.items (string[])
// guide.specialTax.title, guide.specialTax.items (string[])
// guide.educationTax.title, guide.educationTax.items (string[])
// guide.tips.title, guide.tips.items (string[])

import { useState, useMemo, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Calculator, Building, Info, BookOpen, Copy, Check } from 'lucide-react'

// ── 유틸 ──

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

// ── 타입 ──

type PropertyType = 'house' | 'land' | 'commercial'
type HouseCount = '1' | '2' | '3plus' | 'corp'

interface TaxResult {
  acquisitionTax: number
  acquisitionTaxRate: number
  specialTax: number
  specialTaxRate: number
  educationTax: number
  educationTaxRate: number
  totalTax: number
  effectiveRate: number
  isHeavy: boolean        // 중과 여부
  specialTaxExempt: boolean // 농특세 면제 여부
}

// ── 세율 계산 함수 ──

function getHouseAcquisitionRate(price: number, houseCount: HouseCount, isAdjusted: boolean): number {
  // 법인: 12%
  if (houseCount === 'corp') return 0.12

  // 3주택 이상
  if (houseCount === '3plus') {
    return isAdjusted ? 0.12 : 0.08
  }

  // 2주택
  if (houseCount === '2') {
    if (isAdjusted) return 0.08
    // 비조정 2주택 = 1주택과 동일
  }

  // 1주택 (or 비조정 2주택)
  if (price <= 600_000_000) {
    return 0.01
  } else if (price <= 900_000_000) {
    // 선형 보간: (취득가/1억 × 2/3 - 3) %
    const rate = (price / 100_000_000) * (2 / 3) - 3
    return rate / 100
  } else {
    return 0.03
  }
}

function calculateTax(
  price: number,
  propertyType: PropertyType,
  houseCount: HouseCount,
  isAdjusted: boolean,
  isOver85: boolean
): TaxResult {
  let acquisitionTaxRate: number
  let specialTaxRate: number
  let educationTaxRate: number
  let isHeavy = false
  let specialTaxExempt = false

  if (propertyType === 'house') {
    acquisitionTaxRate = getHouseAcquisitionRate(price, houseCount, isAdjusted)

    // 중과 여부 판정
    const isHeavyCase =
      houseCount === 'corp' ||
      (houseCount === '3plus') ||
      (houseCount === '2' && isAdjusted)
    isHeavy = isHeavyCase

    // 농어촌특별세
    if (!isOver85 && !isHeavy) {
      // 85㎡ 이하 + 비중과: 면제
      specialTaxRate = 0
      specialTaxExempt = true
    } else if (isHeavy) {
      // 중과 시: 중과세율분의 10%
      // 중과세율분 = 적용세율 - 기본세율(1~3%)
      // 간소화: 전체 취득세의 10%
      specialTaxRate = 0.10
    } else {
      // 85㎡ 초과 비중과: 취득세의 10%
      specialTaxRate = 0.10
    }

    // 지방교육세: 취득세의 10%
    educationTaxRate = 0.10
  } else {
    // 토지 / 상가: 4%
    acquisitionTaxRate = 0.04
    specialTaxRate = 0.10   // 취득세의 10%
    educationTaxRate = 0.10 // 취득세의 10%
  }

  const acquisitionTax = price * acquisitionTaxRate
  const specialTax = acquisitionTax * specialTaxRate
  const educationTax = acquisitionTax * educationTaxRate
  const totalTax = acquisitionTax + specialTax + educationTax
  const effectiveRate = price > 0 ? (totalTax / price) * 100 : 0

  return {
    acquisitionTax,
    acquisitionTaxRate,
    specialTax,
    specialTaxRate: acquisitionTaxRate * specialTaxRate, // 취득가 대비 실질 세율
    educationTax,
    educationTaxRate: acquisitionTaxRate * educationTaxRate,
    totalTax,
    effectiveRate,
    isHeavy,
    specialTaxExempt,
  }
}

// ── 금액 단위 변환 ──

function toEokMan(value: number): string {
  const eok = Math.floor(value / 100_000_000)
  const man = Math.floor((value % 100_000_000) / 10_000)
  const parts: string[] = []
  if (eok > 0) parts.push(`${eok}억`)
  if (man > 0) parts.push(`${man.toLocaleString('ko-KR')}만`)
  if (parts.length === 0) return '0'
  return parts.join(' ')
}

// ── 컴포넌트 ──

export default function AcquisitionTaxCalculator() {
  const t = useTranslations('acquisitionTaxCalc')

  const [propertyType, setPropertyType] = useState<PropertyType>('house')
  const [price, setPrice] = useState('')
  const [area, setArea] = useState('')
  const [houseCount, setHouseCount] = useState<HouseCount>('1')
  const [isAdjusted, setIsAdjusted] = useState(false)
  const [isOver85, setIsOver85] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showGuide, setShowGuide] = useState(false)

  const priceNum = parseNumber(price)
  const areaNum = parseFloat(area) || 0

  // 면적 입력 시 85㎡ 자동 판정
  const effectiveOver85 = areaNum > 0 ? areaNum > 85 : isOver85

  const result = useMemo<TaxResult | null>(() => {
    if (priceNum <= 0) return null
    return calculateTax(priceNum, propertyType, houseCount, isAdjusted, effectiveOver85)
  }, [priceNum, propertyType, houseCount, isAdjusted, effectiveOver85])

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

  const copyResult = useCallback(() => {
    if (!result) return
    const text = [
      `${t('result.acquisitionTax')}: ${formatWon(result.acquisitionTax)}${t('units.won')}`,
      `${t('result.specialTax')}: ${formatWon(result.specialTax)}${t('units.won')}`,
      `${t('result.educationTax')}: ${formatWon(result.educationTax)}${t('units.won')}`,
      `${t('result.totalTax')}: ${formatWon(result.totalTax)}${t('units.won')}`,
      `${t('result.effectiveRate')}: ${result.effectiveRate.toFixed(2)}%`,
    ].join('\n')
    copyToClipboard(text, 'result')
  }, [result, t, copyToClipboard])

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-xl">
          <Building className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
        </div>
      </div>

      {/* 메인 그리드 */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* ── 입력 패널 ── */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              {t('propertyType.label')}
            </h2>

            {/* 취득 유형 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('propertyType.label')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['house', 'land', 'commercial'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setPropertyType(type)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      propertyType === type
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {t(`propertyType.${type}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* 취득가액 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('price.label')}
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={price}
                onChange={(e) => setPrice(formatInput(e.target.value))}
                placeholder={t('price.placeholder')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {priceNum > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {toEokMan(priceNum)}{t('units.won')}
                </p>
              )}
            </div>

            {/* 전용면적 */}
            {propertyType === 'house' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('area.label')}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder={t('area.placeholder')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                    {t('units.sqm')}
                  </span>
                </div>
                {areaNum > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {areaNum > 85 ? t('areaOver85.yes') : t('areaOver85.no')}
                  </p>
                )}
              </div>
            )}

            {/* 주택 추가 옵션 */}
            {propertyType === 'house' && (
              <>
                {/* 주택 수 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('houseCount.label')}
                  </label>
                  <select
                    value={houseCount}
                    onChange={(e) => setHouseCount(e.target.value as HouseCount)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="1">{t('houseCount.one')}</option>
                    <option value="2">{t('houseCount.two')}</option>
                    <option value="3plus">{t('houseCount.threePlus')}</option>
                    <option value="corp">{t('houseCount.corp')}</option>
                  </select>
                </div>

                {/* 조정대상지역 */}
                {(houseCount === '2' || houseCount === '3plus') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('adjustedArea.label')}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setIsAdjusted(true)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isAdjusted
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {t('adjustedArea.yes')}
                      </button>
                      <button
                        onClick={() => setIsAdjusted(false)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          !isAdjusted
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {t('adjustedArea.no')}
                      </button>
                    </div>
                  </div>
                )}

                {/* 면적 미입력 시 수동 85㎡ 선택 */}
                {!areaNum && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('areaOver85.label')}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setIsOver85(false)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          !isOver85
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {t('areaOver85.no')}
                      </button>
                      <button
                        onClick={() => setIsOver85(true)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isOver85
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {t('areaOver85.yes')}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── 결과 패널 ── */}
        <div className="lg:col-span-2 space-y-6">
          {result ? (
            <>
              {/* 총 세금 요약 */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t('result.title')}
                  </h2>
                  <button
                    onClick={copyResult}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                  >
                    {copiedId === 'result' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copiedId === 'result' ? t('copied') : t('copy')}
                  </button>
                </div>

                {/* 총 세금 강조 */}
                <div className="text-center py-4 mb-4 bg-blue-50 dark:bg-blue-950 rounded-xl">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('result.totalTax')}</p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {formatWon(result.totalTax)}<span className="text-lg ml-1">{t('units.won')}</span>
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    ({toEokMan(result.totalTax)}{t('units.won')})
                  </p>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mt-2">
                    {t('result.effectiveRate')}: {result.effectiveRate.toFixed(2)}%
                  </p>
                </div>

                {/* 세부 항목 3칸 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('result.acquisitionTax')}</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {formatWon(result.acquisitionTax)}<span className="text-xs ml-1">{t('units.won')}</span>
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      {(result.acquisitionTaxRate * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('result.specialTax')}</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {result.specialTaxExempt ? (
                        <span className="text-green-600 dark:text-green-400">{t('result.exemptLabel')}</span>
                      ) : (
                        <>
                          {formatWon(result.specialTax)}<span className="text-xs ml-1">{t('units.won')}</span>
                        </>
                      )}
                    </p>
                    {!result.specialTaxExempt && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        {(result.specialTaxRate * 100).toFixed(2)}%
                      </p>
                    )}
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('result.educationTax')}</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {formatWon(result.educationTax)}<span className="text-xs ml-1">{t('units.won')}</span>
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      {(result.educationTaxRate * 100).toFixed(2)}%
                    </p>
                  </div>
                </div>

                {/* 중과 경고 */}
                {result.isHeavy && (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
                    <Info className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700 dark:text-red-300">{t('result.heavyWarning')}</p>
                  </div>
                )}
              </div>

              {/* 단계별 내역 */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {t('breakdown.title')}
                </h2>
                <div className="space-y-3">
                  {/* Step 1: 취득세 */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{t('breakdown.step1')}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatWon(priceNum)} x {(result.acquisitionTaxRate * 100).toFixed(1)}%
                      </p>
                    </div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {formatWon(result.acquisitionTax)}{t('units.won')}
                    </p>
                  </div>

                  {/* Step 2: 농특세 */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{t('breakdown.step2')}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {result.specialTaxExempt
                          ? t('result.exemptLabel')
                          : `${formatWon(result.acquisitionTax)} x 10%`}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {result.specialTaxExempt
                        ? t('result.exemptLabel')
                        : `${formatWon(result.specialTax)}${t('units.won')}`}
                    </p>
                  </div>

                  {/* Step 3: 지방교육세 */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{t('breakdown.step3')}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatWon(result.acquisitionTax)} x 10%
                      </p>
                    </div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {formatWon(result.educationTax)}{t('units.won')}
                    </p>
                  </div>

                  {/* 합계 */}
                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm font-bold text-blue-700 dark:text-blue-300">{t('result.totalTax')}</p>
                    <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                      {formatWon(result.totalTax)}{t('units.won')}
                    </p>
                  </div>
                </div>
              </div>

              {/* 세율 참고표 */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {t('rateTable.title')}
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-600">
                        <th className="text-left py-2 px-3 text-gray-700 dark:text-gray-300 font-medium">
                          {t('rateTable.type')}
                        </th>
                        <th className="text-left py-2 px-3 text-gray-700 dark:text-gray-300 font-medium">
                          {t('rateTable.condition')}
                        </th>
                        <th className="text-right py-2 px-3 text-gray-700 dark:text-gray-300 font-medium">
                          {t('rateTable.rate')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(t.raw('rateTable.rows') as Array<{ type: string; condition: string; rate: string }>).map(
                        (row, i) => (
                          <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                            <td className="py-2 px-3 text-gray-900 dark:text-white">{row.type}</td>
                            <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{row.condition}</td>
                            <td className="py-2 px-3 text-right font-medium text-blue-600 dark:text-blue-400">
                              {row.rate}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            /* 결과 없을 때 안내 */
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
              <Building className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">{t('noResult')}</p>
            </div>
          )}

          {/* 면책문구 */}
          <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-xl">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-700 dark:text-yellow-300">{t('disclaimer')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 가이드 섹션 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="w-full flex items-center justify-between"
          aria-expanded={showGuide}
        >
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            {t('guide.title')}
          </h2>
          <span className="text-gray-400 text-xl">{showGuide ? '▲' : '▼'}</span>
        </button>

        {showGuide && (
          <div className="mt-6 grid md:grid-cols-2 gap-6">
            {/* 취득세 */}
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">{t('guide.acquisitionTax.title')}</h3>
              <ul className="space-y-1">
                {(t.raw('guide.acquisitionTax.items') as string[]).map((item, i) => (
                  <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                    <span className="text-blue-500 mt-1">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* 농특세 */}
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">{t('guide.specialTax.title')}</h3>
              <ul className="space-y-1">
                {(t.raw('guide.specialTax.items') as string[]).map((item, i) => (
                  <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                    <span className="text-blue-500 mt-1">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* 지방교육세 */}
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">{t('guide.educationTax.title')}</h3>
              <ul className="space-y-1">
                {(t.raw('guide.educationTax.items') as string[]).map((item, i) => (
                  <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                    <span className="text-blue-500 mt-1">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* 팁 */}
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">{t('guide.tips.title')}</h3>
              <ul className="space-y-1">
                {(t.raw('guide.tips.items') as string[]).map((item, i) => (
                  <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                    <span className="text-green-500 mt-1">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
