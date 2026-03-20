'use client'

/**
 * SalesCommissionCalculator - 판매수수료 계산기
 * Translation namespace: salesCommissionCalc
 *
 * -- 번역 키 목록 --
 * salesCommissionCalc.title
 * salesCommissionCalc.description
 * salesCommissionCalc.input.sellingPrice          // 판매가
 * salesCommissionCalc.input.sellingPricePlaceholder
 * salesCommissionCalc.input.shippingCost          // 배송비
 * salesCommissionCalc.input.shippingCostPlaceholder
 * salesCommissionCalc.input.category              // 카테고리
 * salesCommissionCalc.input.unit                  // 원
 * salesCommissionCalc.category.fashion            // 패션의류
 * salesCommissionCalc.category.fashionAcc         // 패션잡화
 * salesCommissionCalc.category.beauty             // 뷰티
 * salesCommissionCalc.category.food               // 식품
 * salesCommissionCalc.category.living             // 생활용품
 * salesCommissionCalc.category.electronics        // 가전디지털
 * salesCommissionCalc.category.sports             // 스포츠
 * salesCommissionCalc.category.books              // 도서
 * salesCommissionCalc.category.baby               // 유아동
 * salesCommissionCalc.category.furniture          // 가구인테리어
 * salesCommissionCalc.platform.coupang            // 쿠팡
 * salesCommissionCalc.platform.smartstore         // 스마트스토어
 * salesCommissionCalc.platform.elevenst           // 11번가
 * salesCommissionCalc.result.commissionRate       // 수수료율
 * salesCommissionCalc.result.commissionAmount     // 수수료 금액
 * salesCommissionCalc.result.settlementAmount     // 정산 예상액
 * salesCommissionCalc.result.bestLabel            // 최저 수수료
 * salesCommissionCalc.result.noInput              // 입력 안내 메시지
 * salesCommissionCalc.compare.title               // 전체 카테고리 비교
 * salesCommissionCalc.compare.categoryHeader      // 카테고리
 * salesCommissionCalc.compare.lowestLabel         // 최저
 * salesCommissionCalc.notes.title                 // 참고사항
 * salesCommissionCalc.notes.items                 // string[]
 * salesCommissionCalc.guide.title
 * salesCommissionCalc.guide.commission.title
 * salesCommissionCalc.guide.commission.items      // string[]
 * salesCommissionCalc.guide.settlement.title
 * salesCommissionCalc.guide.settlement.items      // string[]
 * salesCommissionCalc.guide.tips.title
 * salesCommissionCalc.guide.tips.items            // string[]
 */

import { useState, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  Calculator,
  ShoppingCart,
  Truck,
  BookOpen,
  Tag,
  TrendingDown,
  Award,
} from 'lucide-react'

// ── 타입 정의 ──

type CategoryKey =
  | 'fashion'
  | 'fashionAcc'
  | 'beauty'
  | 'food'
  | 'living'
  | 'electronics'
  | 'sports'
  | 'books'
  | 'baby'
  | 'furniture'

type PlatformKey = 'coupang' | 'smartstore' | 'elevenst'

// ── 수수료 데이터 (2025년 기준) ──

const COMMISSION_DATA: Record<PlatformKey, Record<CategoryKey, number>> = {
  coupang: {
    fashion: 10.9, fashionAcc: 10.9, beauty: 10.9, food: 10.9,
    living: 10.9, electronics: 5.0, sports: 10.9, books: 10.9,
    baby: 10.9, furniture: 10.9,
  },
  smartstore: {
    fashion: 5.5, fashionAcc: 5.5, beauty: 5.5, food: 5.5,
    living: 5.5, electronics: 4.5, sports: 5.5, books: 3.0,
    baby: 5.5, furniture: 5.5,
  },
  elevenst: {
    fashion: 12.0, fashionAcc: 12.0, beauty: 10.0, food: 8.0,
    living: 10.0, electronics: 6.0, sports: 10.0, books: 8.0,
    baby: 10.0, furniture: 10.0,
  },
}

const CATEGORY_KEYS: CategoryKey[] = [
  'fashion', 'fashionAcc', 'beauty', 'food', 'living',
  'electronics', 'sports', 'books', 'baby', 'furniture',
]

const PLATFORM_KEYS: PlatformKey[] = ['coupang', 'smartstore', 'elevenst']

const PLATFORM_COLORS: Record<PlatformKey, { bg: string; text: string; ring: string; icon: string }> = {
  coupang: {
    bg: 'bg-red-50 dark:bg-red-950',
    text: 'text-red-700 dark:text-red-300',
    ring: 'ring-red-500',
    icon: 'text-red-500',
  },
  smartstore: {
    bg: 'bg-green-50 dark:bg-green-950',
    text: 'text-green-700 dark:text-green-300',
    ring: 'ring-green-500',
    icon: 'text-green-500',
  },
  elevenst: {
    bg: 'bg-orange-50 dark:bg-orange-950',
    text: 'text-orange-700 dark:text-orange-300',
    ring: 'ring-orange-500',
    icon: 'text-orange-500',
  },
}

// ── 계산 결과 타입 ──

interface PlatformResult {
  platform: PlatformKey
  rate: number
  commission: number
  settlement: number
}

// ── 유틸 ──

const formatNumber = (num: number): string => {
  return Math.round(num).toLocaleString('ko-KR')
}

const parseInputNumber = (value: string): number => {
  return parseInt(value.replace(/,/g, ''), 10) || 0
}

const formatInputValue = (value: string): string => {
  const num = value.replace(/[^0-9]/g, '')
  if (!num) return ''
  return parseInt(num, 10).toLocaleString('ko-KR')
}

// ── 컴포넌트 ──

export default function SalesCommissionCalculator() {
  const t = useTranslations('salesCommissionCalc')

  const [sellingPrice, setSellingPrice] = useState('')
  const [shippingCost, setShippingCost] = useState('')
  const [category, setCategory] = useState<CategoryKey>('fashion')

  // ── 입력 핸들러 ──

  const handleSellingPriceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSellingPrice(formatInputValue(e.target.value))
  }, [])

  const handleShippingCostChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setShippingCost(formatInputValue(e.target.value))
  }, [])

  // ── 계산 로직 ──

  const results = useMemo((): PlatformResult[] | null => {
    const price = parseInputNumber(sellingPrice)
    if (price <= 0) return null

    const shipping = parseInputNumber(shippingCost)

    return PLATFORM_KEYS.map((platform) => {
      const rate = COMMISSION_DATA[platform][category]
      let commission: number

      if (platform === 'coupang') {
        // 쿠팡: 배송비 포함 기준
        commission = (price + shipping) * rate / 100
      } else {
        // 스마트스토어, 11번가: 배송비 미포함
        commission = price * rate / 100
      }

      const settlement = price + shipping - commission

      return { platform, rate, commission, settlement }
    })
  }, [sellingPrice, shippingCost, category])

  const bestPlatform = useMemo((): PlatformKey | null => {
    if (!results) return null
    const sorted = [...results].sort((a, b) => a.commission - b.commission)
    return sorted[0].platform
  }, [results])

  // ── 렌더링 ──

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Calculator className="w-7 h-7 text-blue-600" />
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t('description')}
        </p>
      </div>

      {/* 입력 영역 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-5">
        {/* 판매가 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            <ShoppingCart className="w-4 h-4 inline-block mr-1 -mt-0.5" />
            {t('input.sellingPrice')}
          </label>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              value={sellingPrice}
              onChange={handleSellingPriceChange}
              placeholder={t('input.sellingPricePlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 pr-10"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 dark:text-gray-500">
              {t('input.unit')}
            </span>
          </div>
        </div>

        {/* 배송비 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            <Truck className="w-4 h-4 inline-block mr-1 -mt-0.5" />
            {t('input.shippingCost')}
          </label>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              value={shippingCost}
              onChange={handleShippingCostChange}
              placeholder={t('input.shippingCostPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 pr-10"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 dark:text-gray-500">
              {t('input.unit')}
            </span>
          </div>
        </div>

        {/* 카테고리 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            <Tag className="w-4 h-4 inline-block mr-1 -mt-0.5" />
            {t('input.category')}
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as CategoryKey)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            {CATEGORY_KEYS.map((key) => (
              <option key={key} value={key}>
                {t(`category.${key}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3사 비교 카드 */}
      {results ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {results.map((r) => {
            const isBest = r.platform === bestPlatform
            const colors = PLATFORM_COLORS[r.platform]
            return (
              <div
                key={r.platform}
                className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 relative transition-all ${
                  isBest ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                {isBest && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full shadow">
                      <Award className="w-3.5 h-3.5" />
                      {t('result.bestLabel')}
                    </span>
                  </div>
                )}

                <div className={`text-center mb-4 ${colors.bg} rounded-lg py-3`}>
                  <h3 className={`text-lg font-bold ${colors.text}`}>
                    {t(`platform.${r.platform}`)}
                  </h3>
                </div>

                <div className="space-y-3">
                  {/* 수수료율 */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {t('result.commissionRate')}
                    </span>
                    <span className={`text-sm font-semibold ${colors.text}`}>
                      {r.rate}%
                    </span>
                  </div>

                  {/* 수수료 금액 */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {t('result.commissionAmount')}
                    </span>
                    <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                      <TrendingDown className="w-3.5 h-3.5 inline-block mr-0.5 -mt-0.5" />
                      {formatNumber(r.commission)}{t('input.unit')}
                    </span>
                  </div>

                  {/* 구분선 */}
                  <hr className="border-gray-200 dark:border-gray-700" />

                  {/* 정산 예상액 */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('result.settlementAmount')}
                    </span>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                      {formatNumber(r.settlement)}{t('input.unit')}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
          <Calculator className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">{t('result.noInput')}</p>
        </div>
      )}

      {/* 전체 카테고리 비교 테이블 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-blue-600" />
          {t('compare.title')}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">
                  {t('compare.categoryHeader')}
                </th>
                {PLATFORM_KEYS.map((pk) => (
                  <th
                    key={pk}
                    className={`text-center py-3 px-2 font-medium ${PLATFORM_COLORS[pk].text}`}
                  >
                    {t(`platform.${pk}`)}
                  </th>
                ))}
                <th className="text-center py-3 px-2 text-blue-600 dark:text-blue-400 font-medium">
                  {t('compare.lowestLabel')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {CATEGORY_KEYS.map((ck) => {
                const rates = PLATFORM_KEYS.map((pk) => ({
                  platform: pk,
                  rate: COMMISSION_DATA[pk][ck],
                }))
                const minRate = Math.min(...rates.map((r) => r.rate))
                const lowestPlatforms = rates
                  .filter((r) => r.rate === minRate)
                  .map((r) => t(`platform.${r.platform}`))
                  .join(', ')

                return (
                  <tr
                    key={ck}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                      ck === category ? 'bg-blue-50 dark:bg-blue-950' : ''
                    }`}
                  >
                    <td className="py-2.5 px-2 text-gray-900 dark:text-white font-medium">
                      {t(`category.${ck}`)}
                    </td>
                    {PLATFORM_KEYS.map((pk) => {
                      const rate = COMMISSION_DATA[pk][ck]
                      const isLowest = rate === minRate
                      return (
                        <td
                          key={pk}
                          className={`text-center py-2.5 px-2 ${
                            isLowest
                              ? 'text-blue-600 dark:text-blue-400 font-bold'
                              : 'text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          {rate}%
                        </td>
                      )
                    })}
                    <td className="text-center py-2.5 px-2 text-blue-600 dark:text-blue-400 font-semibold text-xs">
                      {lowestPlatforms}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 참고사항 */}
      <div className="bg-yellow-50 dark:bg-yellow-950 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-3">
          {t('notes.title')}
        </h2>
        <ul className="space-y-2">
          {(t.raw('notes.items') as string[]).map((item, idx) => (
            <li
              key={idx}
              className="text-sm text-yellow-700 dark:text-yellow-300 flex items-start gap-2"
            >
              <span className="mt-0.5 shrink-0">&#8226;</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 가이드 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          {t('guide.title')}
        </h2>

        <div className="space-y-6">
          {(['commission', 'settlement', 'tips'] as const).map((section) => (
            <div key={section}>
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-2">
                {t(`guide.${section}.title`)}
              </h3>
              <ul className="space-y-1.5">
                {(t.raw(`guide.${section}.items`) as string[]).map((item, idx) => (
                  <li
                    key={idx}
                    className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2"
                  >
                    <span className="mt-0.5 shrink-0">&#8226;</span>
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
