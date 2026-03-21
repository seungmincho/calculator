'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { Calculator, Copy, Check, BookOpen, AlertCircle, Link, GitCompare } from 'lucide-react'

// ── 2025년 상속세/증여세 세율 (동일) ──
const TAX_BRACKETS = [
  { upTo: 100_000_000, rate: 0.10, deduction: 0 },
  { upTo: 500_000_000, rate: 0.20, deduction: 10_000_000 },
  { upTo: 1_000_000_000, rate: 0.30, deduction: 60_000_000 },
  { upTo: 3_000_000_000, rate: 0.40, deduction: 160_000_000 },
  { upTo: Infinity, rate: 0.50, deduction: 460_000_000 },
]

function calcTax(taxable: number): { tax: number; rate: number; bracket: number } {
  if (taxable <= 0) return { tax: 0, rate: 0, bracket: 0 }
  for (let i = 0; i < TAX_BRACKETS.length; i++) {
    if (taxable <= TAX_BRACKETS[i].upTo) {
      const tax = Math.floor(taxable * TAX_BRACKETS[i].rate - TAX_BRACKETS[i].deduction)
      return { tax: Math.max(0, tax), rate: TAX_BRACKETS[i].rate * 100, bracket: i }
    }
  }
  return { tax: 0, rate: 0, bracket: 0 }
}

type TaxType = 'inheritance' | 'gift' | 'compare'

// 증여 관계
type GiftRelation = 'spouse' | 'ascendantAdult' | 'ascendantMinor' | 'descendant' | 'otherRelative' | 'nonRelative'

const GIFT_DEDUCTIONS: Record<GiftRelation, number> = {
  spouse: 600_000_000,
  ascendantAdult: 50_000_000,
  ascendantMinor: 20_000_000,
  descendant: 50_000_000,
  otherRelative: 10_000_000,
  nonRelative: 0,
}

const formatNumber = (num: number) => num.toLocaleString('ko-KR')
const formatWon = (num: number) => `${formatNumber(num)}원`

function parseNumInput(val: string): number {
  return parseInt(val.replace(/[^0-9]/g, ''), 10) || 0
}

export default function InheritanceGiftTax() {
  const t = useTranslations('inheritanceGiftTax')
  const searchParams = useSearchParams()

  const [taxType, setTaxType] = useState<TaxType>(() => {
    const p = searchParams.get('type')
    return (p === 'gift' || p === 'compare') ? p : 'inheritance'
  })
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showGuide, setShowGuide] = useState(false)

  // ── 상속세 입력 ──
  const [totalEstate, setTotalEstate] = useState(() => searchParams.get('estate') ?? '') // 총 상속재산
  const [debts, setDebts] = useState(() => searchParams.get('debts') ?? '') // 채무
  const [hasSpouse, setHasSpouse] = useState(() => searchParams.get('spouse') !== '0')
  const [childCount, setChildCount] = useState(() => searchParams.get('children') ?? '1')
  const [useItemizedDeduction, setUseItemizedDeduction] = useState(() => searchParams.get('itemized') === '1') // 항목별 vs 일괄
  const [funeralExpense, setFuneralExpense] = useState(() => searchParams.get('funeral') ?? '10000000') // 장례비
  const [financialAssets, setFinancialAssets] = useState(() => searchParams.get('fin') ?? '') // 순금융재산

  // ── 증여세 입력 ──
  const [giftAmount, setGiftAmount] = useState(() => searchParams.get('gift') ?? '')
  const [giftRelation, setGiftRelation] = useState<GiftRelation>(() => (searchParams.get('relation') as GiftRelation) ?? 'ascendantAdult')
  const [isMarriageGift, setIsMarriageGift] = useState(() => searchParams.get('marriage') === '1') // 혼인·출산 추가공제

  // ── URL 동기화 ──
  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('type', taxType)
    if (totalEstate) url.searchParams.set('estate', totalEstate); else url.searchParams.delete('estate')
    if (debts) url.searchParams.set('debts', debts); else url.searchParams.delete('debts')
    url.searchParams.set('spouse', hasSpouse ? '1' : '0')
    url.searchParams.set('children', childCount)
    url.searchParams.set('itemized', useItemizedDeduction ? '1' : '0')
    if (funeralExpense !== '10000000') url.searchParams.set('funeral', funeralExpense); else url.searchParams.delete('funeral')
    if (financialAssets) url.searchParams.set('fin', financialAssets); else url.searchParams.delete('fin')
    if (giftAmount) url.searchParams.set('gift', giftAmount); else url.searchParams.delete('gift')
    url.searchParams.set('relation', giftRelation)
    url.searchParams.set('marriage', isMarriageGift ? '1' : '0')
    window.history.replaceState({}, '', url)
  }, [taxType, totalEstate, debts, hasSpouse, childCount, useItemizedDeduction, funeralExpense, financialAssets, giftAmount, giftRelation, isMarriageGift])

  // ── 상속세 계산 ──
  const inheritanceResult = useMemo(() => {
    const estate = parseNumInput(totalEstate)
    const debtAmt = parseNumInput(debts)
    const children = parseInt(childCount) || 0
    const funeral = parseNumInput(funeralExpense)
    const finAssets = parseNumInput(financialAssets)

    if (estate <= 0) return null

    // 총 상속재산가액 - 채무 - 장례비용
    const funeralDeduction = Math.min(funeral, 15_000_000) // 최대 1,500만원
    const netEstate = estate - debtAmt - funeralDeduction

    if (netEstate <= 0) return { netEstate: 0, taxable: 0, tax: 0, effectiveRate: 0, totalDeduction: estate, funeralDeduction: 0, generalDeduction: 0, spouseDeduction: 0, financialDeduction: 0, rate: 0, deductionDetail: null }

    // 기초공제 + 인적공제 vs 일괄공제
    const basicDeduction = 200_000_000 // 기초공제 2억
    const childDeduction = children * 50_000_000 // 자녀공제 인당 5천만
    const itemizedTotal = basicDeduction + childDeduction

    // 일괄공제 5억 vs 항목별(기초+인적)
    const generalDeduction = useItemizedDeduction
      ? itemizedTotal
      : Math.max(500_000_000, itemizedTotal) // 일괄공제 5억 vs 항목별 중 큰 것

    // 배우자 상속공제 (최소 5억, 최대 30억)
    const spouseDeduction = hasSpouse ? 500_000_000 : 0

    // 금융재산 상속공제
    let financialDeduction = 0
    if (finAssets > 0) {
      if (finAssets <= 20_000_000) {
        financialDeduction = finAssets
      } else {
        financialDeduction = Math.max(finAssets * 0.2, 20_000_000)
        financialDeduction = Math.min(financialDeduction, 200_000_000)
      }
    }

    const totalDeduction = generalDeduction + spouseDeduction + financialDeduction

    const taxable = Math.max(0, netEstate - totalDeduction)
    const { tax, rate } = calcTax(taxable)
    const effectiveRate = estate > 0 ? (tax / estate) * 100 : 0

    return {
      netEstate,
      funeralDeduction,
      generalDeduction,
      spouseDeduction,
      financialDeduction,
      totalDeduction,
      taxable,
      tax,
      rate,
      effectiveRate,
      deductionDetail: {
        basic: basicDeduction,
        child: childDeduction,
        isLumpSum: !useItemizedDeduction && 500_000_000 >= itemizedTotal,
      },
    }
  }, [totalEstate, debts, hasSpouse, childCount, useItemizedDeduction, funeralExpense, financialAssets])

  // ── 증여세 계산 ──
  const giftResult = useMemo(() => {
    const amount = parseNumInput(giftAmount)
    if (amount <= 0) return null

    const baseDeduction = GIFT_DEDUCTIONS[giftRelation]
    // 혼인·출산 추가공제 (직계존속으로부터 증여 시에만 적용)
    const marriageDeduction = isMarriageGift && (giftRelation === 'ascendantAdult' || giftRelation === 'ascendantMinor') ? 100_000_000 : 0
    const totalDeduction = baseDeduction + marriageDeduction

    const taxable = Math.max(0, amount - totalDeduction)
    const { tax, rate } = calcTax(taxable)
    const effectiveRate = amount > 0 ? (tax / amount) * 100 : 0

    return {
      amount,
      baseDeduction,
      marriageDeduction,
      totalDeduction,
      taxable,
      tax,
      rate,
      effectiveRate,
    }
  }, [giftAmount, giftRelation, isMarriageGift])

  // ── 비교 계산: 같은 금액을 상속/증여 시 세금 비교 ──
  const compareAmount = parseNumInput(totalEstate) || parseNumInput(giftAmount)
  const compareResult = useMemo(() => {
    if (compareAmount <= 0) return null
    // 상속세 시나리오 (배우자+자녀1, 일괄공제 기본)
    const funeralDed = Math.min(10_000_000, 15_000_000)
    const net = compareAmount - funeralDed
    const generalDed = 500_000_000
    const spouseDed = 500_000_000
    const inheritTaxable = Math.max(0, net - generalDed - spouseDed)
    const { tax: inheritTax } = calcTax(inheritTaxable)
    // 증여세 시나리오 (직계존속→성인자녀, 비혼인)
    const giftDed = GIFT_DEDUCTIONS['ascendantAdult']
    const giftTaxable = Math.max(0, compareAmount - giftDed)
    const { tax: giftTaxAmt } = calcTax(giftTaxable)
    return {
      amount: compareAmount,
      inheritTax,
      inheritTaxable,
      giftTax: giftTaxAmt,
      giftTaxable,
      inheritRate: compareAmount > 0 ? (inheritTax / compareAmount) * 100 : 0,
      giftRate: compareAmount > 0 ? (giftTaxAmt / compareAmount) * 100 : 0,
      lowerIs: inheritTax <= giftTaxAmt ? 'inheritance' : 'gift',
      diff: Math.abs(inheritTax - giftTaxAmt),
    }
  }, [compareAmount])

  const currentResult = taxType === 'inheritance' ? inheritanceResult : giftResult

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

  const copyLink = useCallback(async () => {
    await copyToClipboard(window.location.href, 'link')
  }, [copyToClipboard])

  const buildSummary = useCallback(() => {
    if (taxType === 'inheritance' && inheritanceResult) {
      const r = inheritanceResult
      return [
        `[상속세 계산 결과]`,
        `총 상속재산: ${formatWon(parseNumInput(totalEstate))}`,
        `과세표준: ${formatWon(r.taxable)}`,
        `상속세: ${formatWon(r.tax)}`,
        `실효세율: ${r.effectiveRate.toFixed(1)}%`,
      ].join('\n')
    }
    if (taxType === 'gift' && giftResult) {
      const r = giftResult
      return [
        `[증여세 계산 결과]`,
        `증여금액: ${formatWon(r.amount)}`,
        `공제금액: ${formatWon(r.totalDeduction)}`,
        `과세표준: ${formatWon(r.taxable)}`,
        `증여세: ${formatWon(r.tax)}`,
        `실효세율: ${r.effectiveRate.toFixed(1)}%`,
      ].join('\n')
    }
    return ''
  }, [taxType, inheritanceResult, giftResult, totalEstate])

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Calculator className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* 탭 + 링크 복사 */}
      <div className="flex items-center gap-2">
        <div className="flex flex-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => setTaxType('inheritance')}
            className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-colors ${taxType === 'inheritance' ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow' : 'text-gray-600 dark:text-gray-300'}`}
          >
            {t('inheritanceTab')}
          </button>
          <button
            onClick={() => setTaxType('gift')}
            className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-colors ${taxType === 'gift' ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow' : 'text-gray-600 dark:text-gray-300'}`}
          >
            {t('giftTab')}
          </button>
          <button
            onClick={() => setTaxType('compare')}
            className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-1 ${taxType === 'compare' ? 'bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 shadow' : 'text-gray-600 dark:text-gray-300'}`}
          >
            <GitCompare className="w-3.5 h-3.5" />
            {t('compareTab')}
          </button>
        </div>
        <button
          onClick={copyLink}
          title={t('copyLink')}
          className="flex items-center gap-1.5 px-3 py-2.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-lg transition-colors shrink-0"
        >
          {copiedId === 'link' ? <Check className="w-4 h-4 text-green-500" /> : <Link className="w-4 h-4" />}
          <span className="hidden sm:inline">{copiedId === 'link' ? t('copied') : t('copyLink')}</span>
        </button>
      </div>

      {/* 비교 패널 (compare 탭) */}
      {taxType === 'compare' && (
        <div className="space-y-4">
          {compareResult ? (
            <>
              <div className="bg-purple-50 dark:bg-purple-950/30 rounded-xl p-4 flex items-center gap-2 text-sm text-purple-700 dark:text-purple-300">
                <GitCompare className="w-4 h-4 shrink-0" />
                <span>{t('compareNote')}</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {/* 상속세 카드 */}
                <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-2 ${compareResult.lowerIs === 'inheritance' ? 'border-green-400 dark:border-green-500' : 'border-transparent'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{t('inheritanceTab')}</h3>
                    {compareResult.lowerIs === 'inheritance' && (
                      <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full font-medium">{t('lower')}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('compareAssumption.inheritance')}</p>
                  <div className="mt-4 space-y-2 text-sm">
                    <Row label={t('taxableAmount')} value={formatWon(compareResult.inheritTaxable)} />
                    <Row label={t('inheritanceTax')} value={formatWon(compareResult.inheritTax)} highlight />
                    <Row label={t('effectiveRate')} value={`${compareResult.inheritRate.toFixed(1)}%`} sub />
                  </div>
                </div>
                {/* 증여세 카드 */}
                <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-2 ${compareResult.lowerIs === 'gift' ? 'border-green-400 dark:border-green-500' : 'border-transparent'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{t('giftTab')}</h3>
                    {compareResult.lowerIs === 'gift' && (
                      <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full font-medium">{t('lower')}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('compareAssumption.gift')}</p>
                  <div className="mt-4 space-y-2 text-sm">
                    <Row label={t('taxableAmount')} value={formatWon(compareResult.giftTaxable)} />
                    <Row label={t('giftTax')} value={formatWon(compareResult.giftTax)} highlight />
                    <Row label={t('effectiveRate')} value={`${compareResult.giftRate.toFixed(1)}%`} sub />
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 text-center text-sm text-gray-700 dark:text-gray-300">
                {compareResult.lowerIs === 'inheritance'
                  ? t('compareSummary.inheritanceLower', { diff: formatWon(compareResult.diff) })
                  : t('compareSummary.giftLower', { diff: formatWon(compareResult.diff) })}
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center text-gray-400 dark:text-gray-500">
              <GitCompare className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{t('comparePrompt')}</p>
            </div>
          )}
        </div>
      )}

      <div className={`grid lg:grid-cols-3 gap-6 ${taxType === 'compare' ? 'hidden' : ''}`}>
        {/* 입력 패널 */}
        <div className="lg:col-span-1 space-y-4">
          {taxType === 'inheritance' ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('inheritanceInput')}</h2>

              <InputField
                label={t('totalEstate')}
                value={totalEstate}
                onChange={setTotalEstate}
                placeholder="1,000,000,000"
                suffix="원"
              />
              <InputField
                label={t('debts')}
                value={debts}
                onChange={setDebts}
                placeholder="0"
                suffix="원"
              />
              <InputField
                label={t('funeralExpense')}
                value={funeralExpense}
                onChange={setFuneralExpense}
                placeholder="10,000,000"
                suffix="원"
                hint={t('funeralHint')}
              />
              <InputField
                label={t('financialAssets')}
                value={financialAssets}
                onChange={setFinancialAssets}
                placeholder="0"
                suffix="원"
                hint={t('financialHint')}
              />

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasSpouse}
                    onChange={e => setHasSpouse(e.target.checked)}
                    className="accent-blue-600 w-4 h-4"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t('hasSpouse')}</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('childCount')}</label>
                <select
                  value={childCount}
                  onChange={e => setChildCount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: 11 }, (_, i) => (
                    <option key={i} value={i}>{i}{t('person')}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useItemizedDeduction}
                    onChange={e => setUseItemizedDeduction(e.target.checked)}
                    className="accent-blue-600 w-4 h-4"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t('useItemized')}</span>
                </label>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('giftInput')}</h2>

              <InputField
                label={t('giftAmount')}
                value={giftAmount}
                onChange={setGiftAmount}
                placeholder="500,000,000"
                suffix="원"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('giftRelation')}</label>
                <select
                  value={giftRelation}
                  onChange={e => setGiftRelation(e.target.value as GiftRelation)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="spouse">{t('relations.spouse')}</option>
                  <option value="ascendantAdult">{t('relations.ascendantAdult')}</option>
                  <option value="ascendantMinor">{t('relations.ascendantMinor')}</option>
                  <option value="descendant">{t('relations.descendant')}</option>
                  <option value="otherRelative">{t('relations.otherRelative')}</option>
                  <option value="nonRelative">{t('relations.nonRelative')}</option>
                </select>
              </div>

              {(giftRelation === 'ascendantAdult' || giftRelation === 'ascendantMinor') && (
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isMarriageGift}
                      onChange={e => setIsMarriageGift(e.target.checked)}
                      className="accent-blue-600 w-4 h-4"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{t('marriageDeduction')}</span>
                  </label>
                </div>
              )}

              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  <AlertCircle className="w-3.5 h-3.5 inline mr-1" />
                  {t('giftPeriodNote')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 결과 패널 */}
        <div className="lg:col-span-2 space-y-4">
          {currentResult && 'tax' in currentResult ? (
            <>
              {/* 핵심 결과 카드 */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('result')}</h2>
                  <button
                    onClick={() => copyToClipboard(buildSummary(), 'result')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                  >
                    {copiedId === 'result' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    {copiedId === 'result' ? t('copied') : t('copyResult')}
                  </button>
                </div>

                {/* 핵심 숫자 */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                  <div className="bg-red-50 dark:bg-red-950/30 rounded-xl p-4 text-center">
                    <p className="text-xs text-red-600 dark:text-red-400 mb-1">
                      {taxType === 'inheritance' ? t('inheritanceTax') : t('giftTax')}
                    </p>
                    <p className="text-xl font-bold text-red-700 dark:text-red-400">
                      {formatWon(currentResult.tax)}
                    </p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-4 text-center">
                    <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">{t('taxableAmount')}</p>
                    <p className="text-xl font-bold text-blue-700 dark:text-blue-400">
                      {formatWon(currentResult.taxable)}
                    </p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-950/30 rounded-xl p-4 text-center">
                    <p className="text-xs text-green-600 dark:text-green-400 mb-1">{t('effectiveRate')}</p>
                    <p className="text-xl font-bold text-green-700 dark:text-green-400">
                      {currentResult.effectiveRate.toFixed(1)}%
                    </p>
                  </div>
                </div>

                {/* 상세 내역 */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">{t('breakdown')}</h3>
                  <div className="space-y-2 text-sm">
                    {taxType === 'inheritance' && inheritanceResult && (
                      <>
                        <Row label={t('totalEstate')} value={formatWon(parseNumInput(totalEstate))} />
                        {parseNumInput(debts) > 0 && (
                          <Row label={t('debts')} value={`-${formatWon(parseNumInput(debts))}`} sub />
                        )}
                        {inheritanceResult.funeralDeduction > 0 && (
                          <Row label={t('funeralExpense')} value={`-${formatWon(inheritanceResult.funeralDeduction)}`} sub />
                        )}
                        <Row label={t('netEstate')} value={formatWon(inheritanceResult.netEstate)} bold />
                        <div className="border-t border-gray-100 dark:border-gray-700 my-2" />
                        <Row
                          label={inheritanceResult.deductionDetail?.isLumpSum ? t('lumpSumDeduction') : t('itemizedDeduction')}
                          value={`-${formatWon(inheritanceResult.generalDeduction)}`}
                        />
                        {hasSpouse && (
                          <Row label={t('spouseDeduction')} value={`-${formatWon(inheritanceResult.spouseDeduction)}`} sub />
                        )}
                        {inheritanceResult.financialDeduction > 0 && (
                          <Row label={t('financialDeduction')} value={`-${formatWon(inheritanceResult.financialDeduction)}`} sub />
                        )}
                        <Row label={t('totalDeduction')} value={`-${formatWon(inheritanceResult.totalDeduction)}`} accent />
                        <div className="border-t border-gray-100 dark:border-gray-700 my-2" />
                        <Row label={t('taxableAmount')} value={formatWon(inheritanceResult.taxable)} bold />
                        <Row label={t('appliedRate')} value={`${inheritanceResult.rate}%`} sub />
                        <Row label={t('inheritanceTax')} value={formatWon(inheritanceResult.tax)} highlight />
                      </>
                    )}
                    {taxType === 'gift' && giftResult && (
                      <>
                        <Row label={t('giftAmount')} value={formatWon(giftResult.amount)} />
                        <Row label={t('baseDeduction')} value={`-${formatWon(giftResult.baseDeduction)}`} />
                        {giftResult.marriageDeduction > 0 && (
                          <Row label={t('marriageDeductionAmount')} value={`-${formatWon(giftResult.marriageDeduction)}`} sub />
                        )}
                        <Row label={t('totalDeduction')} value={`-${formatWon(giftResult.totalDeduction)}`} accent />
                        <div className="border-t border-gray-100 dark:border-gray-700 my-2" />
                        <Row label={t('taxableAmount')} value={formatWon(giftResult.taxable)} bold />
                        <Row label={t('appliedRate')} value={`${giftResult.rate}%`} sub />
                        <Row label={t('giftTax')} value={formatWon(giftResult.tax)} highlight />
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* 세율표 */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('rateTable')}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" aria-label={t('rateTable')}>
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700/50">
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t('bracket')}</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">{t('rateCol')}</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">{t('progressiveDeduction')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {TAX_BRACKETS.map((b, i) => {
                        const isActive = currentResult && 'tax' in currentResult && i === (taxType === 'inheritance' ? inheritanceResult : giftResult)?.rate
                          ? false : false // We'll use bracket index
                        const prev = i > 0 ? TAX_BRACKETS[i - 1].upTo : 0
                        return (
                          <tr key={i} className={calcTax(currentResult?.taxable ?? 0).bracket === i && (currentResult?.taxable ?? 0) > 0 ? 'bg-blue-50 dark:bg-blue-950/30' : ''}>
                            <td className="px-3 py-2 text-gray-900 dark:text-white">
                              {b.upTo === Infinity
                                ? `${formatNumber(prev)}원 초과`
                                : `${i === 0 ? '0' : formatNumber(prev)}원 ~ ${formatNumber(b.upTo)}원`
                              }
                            </td>
                            <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-white">{b.rate * 100}%</td>
                            <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">{formatWon(b.deduction)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center text-gray-400 dark:text-gray-500">
              <Calculator className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{t('inputPrompt')}</p>
            </div>
          )}
        </div>
      </div>

      {/* 가이드 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="w-full flex items-center justify-between"
          aria-expanded={showGuide}
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            {t('guide.title')}
          </h2>
          <span className="text-gray-400 text-xl" aria-hidden="true">{showGuide ? '−' : '+'}</span>
        </button>
        {showGuide && (
          <div className="mt-4 space-y-4 text-sm text-gray-700 dark:text-gray-300">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">{t('guide.inheritance.title')}</h3>
              <ul className="list-disc pl-5 space-y-1">
                {(t.raw('guide.inheritance.items') as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">{t('guide.gift.title')}</h3>
              <ul className="list-disc pl-5 space-y-1">
                {(t.raw('guide.gift.items') as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">{t('guide.tips.title')}</h3>
              <ul className="list-disc pl-5 space-y-1">
                {(t.raw('guide.tips.items') as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* 면책 */}
      <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 dark:text-amber-300">{t('disclaimer')}</p>
      </div>
    </div>
  )
}

// ── 서브컴포넌트 ──

function InputField({ label, value, onChange, placeholder, suffix, hint }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; suffix: string; hint?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          value={value ? parseInt(value.replace(/[^0-9]/g, '')).toLocaleString('ko-KR') : ''}
          onChange={e => onChange(e.target.value.replace(/[^0-9]/g, ''))}
          placeholder={placeholder}
          className="w-full px-3 py-2 pr-8 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">{suffix}</span>
      </div>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

function Row({ label, value, bold, sub, accent, highlight }: {
  label: string; value: string; bold?: boolean; sub?: boolean; accent?: boolean; highlight?: boolean
}) {
  return (
    <div className={`flex justify-between items-center ${sub ? 'pl-4 text-xs text-gray-500 dark:text-gray-400' : ''} ${bold ? 'font-medium' : ''} ${highlight ? 'bg-red-50 dark:bg-red-950/30 -mx-2 px-2 py-1.5 rounded-lg font-bold text-red-700 dark:text-red-400' : ''}`}>
      <span className={accent ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300'}>{label}</span>
      <span className={`${bold ? 'text-gray-900 dark:text-white' : ''} ${accent ? 'text-blue-600 dark:text-blue-400 font-medium' : ''} ${highlight ? '' : 'text-gray-900 dark:text-white'}`}>{value}</span>
    </div>
  )
}
