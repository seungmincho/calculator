'use client'

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from '@/hooks/useSearchParams';
import dynamic from 'next/dynamic'
import { Receipt, Building2, TrendingUp, Calculator, Share2, Check, Save } from 'lucide-react';
import { glassCard, glassInset, glassInput } from '@/lib/glass';
import GuideSection from '@/components/GuideSection'
import { useCalculationHistory } from '@/hooks/useCalculationHistory';
import CalculationHistory from '@/components/CalculationHistory';
import MobileResultLink from '@/components/MobileResultLink'
import { INSURANCE, PENSION_ANNUAL_CAP } from '@/utils/insuranceRates'
import { calc as yearEndCalc, DEFAULT_INPUT as YEAR_END_DEFAULT } from '@/utils/yearEndTax'
import { calcCgt, ymd } from '@/utils/capitalGainsTax'
import '@/lib/i18n/ns/tax'
import { useTranslations } from '@/lib/i18n'

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false })

type TaxType = 'income' | 'vat' | 'capital-gains';

interface TaxResult {
  type: TaxType;
  totalTax: number;
  netAmount: number;
  breakdown: {
    incomeTax?: number;
    localIncomeTax?: number;
    nationalPension?: number;
    healthInsurance?: number;
    employmentInsurance?: number;
    longTermCare?: number;
    vatAmount?: number;
    capitalGainsTax?: number;
    localTax?: number;
  };
}

const TaxCalculatorContent = () => {
  const t = useTranslations('tax');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TaxType>('income');
  const [isCopied, setIsCopied] = useState(false);

  // 소득세 관련 상태
  const [annualIncome, setAnnualIncome] = useState('');
  const [dependents, setDependents] = useState('0');
  const [medicalExpenses, setMedicalExpenses] = useState('');
  const [educationExpenses, setEducationExpenses] = useState('');

  // 부가세 관련 상태
  const [saleAmount, setSaleAmount] = useState('');
  const [vatRate, setVatRate] = useState('10');

  // 양도소득세 관련 상태
  const [salePrice, setSalePrice] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [holdingPeriod, setHoldingPeriod] = useState('');
  const [propertyType, setPropertyType] = useState<'general' | 'luxury' | 'multiple'>('general');

  const [result, setResult] = useState<TaxResult | null>(null);
  const [showSaveButton, setShowSaveButton] = useState(false);

  // 세금 구성 도넛 차트 옵션
  const taxChartOption = useMemo(() => {
    if (!result || !result.breakdown) return {}

    let items: { name: string; value: number; color: string }[] = []

    if (result.type === 'income') {
      items = [
        { name: t('labels.incomeTax'), value: result.breakdown.incomeTax || 0, color: '#3B82F6' },
        { name: t('labels.localIncomeTax'), value: result.breakdown.localIncomeTax || 0, color: '#6366F1' },
        { name: t('labels.nationalPension'), value: result.breakdown.nationalPension || 0, color: '#10B981' },
        { name: t('labels.healthInsurance'), value: result.breakdown.healthInsurance || 0, color: '#F59E0B' },
        { name: t('labels.longTermCare'), value: result.breakdown.longTermCare || 0, color: '#F97316' },
        { name: t('labels.employmentInsurance'), value: result.breakdown.employmentInsurance || 0, color: '#EF4444' },
      ]
    } else if (result.type === 'vat') {
      items = [
        { name: t('labels.supplyValue'), value: result.netAmount || 0, color: '#3B82F6' },
        { name: t('labels.vat'), value: result.breakdown.vatAmount || 0, color: '#F59E0B' },
      ]
    } else if (result.type === 'capital-gains') {
      items = [
        { name: t('labels.capitalGainsTax'), value: result.breakdown.capitalGainsTax || 0, color: '#F97316' },
        { name: t('labels.localIncomeTax'), value: result.breakdown.localTax || 0, color: '#6366F1' },
      ]
    }

    items = items.filter(item => item.value > 0)
    if (items.length === 0) return {}

    return {
      tooltip: {
        trigger: 'item' as const,
        formatter: (params: { name: string; value: number; percent: number; marker: string }) =>
          `${params.marker} ${params.name}: ${Math.round(params.value).toLocaleString('ko-KR')}${t('won')} (${Math.round(params.percent ?? 0)}%)`
      },
      legend: {
        bottom: 0,
        textStyle: { fontSize: 11 }
      },
      series: [{
        type: 'pie' as const,
        radius: ['35%', '65%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: true, formatter: '{b}\n{d}%', fontSize: 11 },
        data: items.map(item => ({
          value: item.value,
          name: item.name,
          itemStyle: { color: item.color }
        }))
      }]
    }
  }, [result])

  // 계산 이력 관리
  const {
    histories,
    isLoading: historyLoading,
    saveCalculation,
    removeHistory,
    clearHistories,
    loadFromHistory
  } = useCalculationHistory('tax');

  const taxTypes = {
    'income': t('labels.incomeTax'),
    'vat': t('labels.vat'),
    'capital-gains': t('labels.capitalGainsTax')
  };

  // 근로소득세 (2026년 귀속 연말정산 방식: 근로소득공제·인적공제·4대보험 공제 → 6~45% → 근로소득세액공제,
  // 의료비·교육비 15% 세액공제와 표준세액공제 13만원 중 유리한 쪽). 계산은 yearEndTax.ts 재사용
  const calculateIncomeTax = (income: number, deps: number, medical: number, education: number) => {
    const y = yearEndCalc({
      ...YEAR_END_DEFAULT, salary: income, others: deps,
      credit: 0, debit: 0, transport: 0, general: medical, eduSchool: education,
    });
    const incomeTax = y.determined;
    const localIncomeTax = y.localTax;
    
    // 4대보험 (간소화)
    const nationalPension = Math.min(income, PENSION_ANNUAL_CAP) * INSURANCE.pensionRate;
    const healthInsurance = income * INSURANCE.healthRate;
    const longTermCare = healthInsurance * INSURANCE.longTermCareRate;
    const employmentInsurance = income * INSURANCE.employmentRate;
    
    const totalTax = incomeTax + localIncomeTax + nationalPension + healthInsurance + longTermCare + employmentInsurance;
    
    return {
      type: 'income' as TaxType,
      totalTax,
      netAmount: income - totalTax,
      breakdown: {
        incomeTax,
        localIncomeTax,
        nationalPension,
        healthInsurance,
        longTermCare,
        employmentInsurance
      }
    };
  };

  // 부가세 계산
  const calculateVAT = (amount: number, rate: number) => {
    const vatAmount = amount * (rate / 100);
    const totalAmount = amount + vatAmount;
    
    return {
      type: 'vat' as TaxType,
      totalTax: vatAmount,
      netAmount: amount,
      breakdown: {
        vatAmount
      }
    };
  };

  // 주택 양도소득세 (capitalGainsTax.ts 재사용, 오늘 양도·비조정지역 가정)
  // general = 1세대 1주택 실거주(거주 = 보유), luxury = 1세대 1주택 거주 안 함, multiple = 2주택 이상
  const calculateCapitalGainsTax = (sellPrice: number, buyPrice: number, years: number, type: string) => {
    const today = new Date();
    const acq = new Date(today.getFullYear() - years, today.getMonth(), today.getDate());
    const r = calcCgt({
      kind: 'house', sale: sellPrice, acq: buyPrice, expense: 0, acqDate: ymd(acq), saleDate: ymd(today),
      houses: type === 'multiple' ? 2 : 1, temp: false, newAcqDate: '', newAdjusted: false,
      adjusted: false, acqAdjusted: false, residence: type === 'general' ? years : 0, grace: false,
    });
    return {
      type: 'capital-gains' as TaxType,
      totalTax: r.total,
      netAmount: sellPrice - r.total,
      breakdown: { capitalGainsTax: r.tax, localTax: r.local }
    };
  };

  const formatNumber = (num: number) => {
    // toString 은 1e21 이상에서 '1e+21' 을 내고, 입력란에 그대로 들어가 parseInt 가 1 로 읽는다
    return (Math.floor(num) || 0).toLocaleString('ko-KR');
  };
  // 공제 행: 0원이면 '-0원' 대신 '0원'
  const minus = (num = 0) => (Math.floor(num) > 0 ? '-' : '') + formatNumber(num);

  // 계산 저장
  const handleSaveCalculation = () => {
    if (!result) return;

    const inputs = {
      activeTab,
      annualIncome,
      dependents,
      medicalExpenses,
      educationExpenses,
      saleAmount,
      vatRate,
      salePrice,
      purchasePrice,
      holdingPeriod,
      propertyType
    };

    const success = saveCalculation(inputs, result);
    if (success) {
      setShowSaveButton(false);
      // 저장 성공 피드백 (선택사항)
    }
  };

  // 이력에서 불러오기
  const handleLoadFromHistory = (historyId: string) => {
    const inputs = loadFromHistory(historyId);
    if (inputs) {
      setActiveTab(inputs.activeTab || 'income');
      setAnnualIncome(inputs.annualIncome || '');
      setDependents(inputs.dependents || '0');
      setMedicalExpenses(inputs.medicalExpenses || '');
      setEducationExpenses(inputs.educationExpenses || '');
      setSaleAmount(inputs.saleAmount || '');
      setVatRate(inputs.vatRate || '10');
      setSalePrice(inputs.salePrice || '');
      setPurchasePrice(inputs.purchasePrice || '');
      setHoldingPeriod(inputs.holdingPeriod || '');
      setPropertyType(inputs.propertyType || 'general');
      
      // URL도 업데이트
      const urlParams: Record<string, string> = {
        tab: inputs.activeTab || 'income'
      };
      
      if (inputs.activeTab === 'income') {
        urlParams.income = inputs.annualIncome?.replace(/,/g, '') || '';
        urlParams.dependents = inputs.dependents || '0';
        urlParams.medical = inputs.medicalExpenses?.replace(/,/g, '') || '';
        urlParams.education = inputs.educationExpenses?.replace(/,/g, '') || '';
      } else if (inputs.activeTab === 'vat') {
        urlParams.sale = inputs.saleAmount?.replace(/,/g, '') || '';
        urlParams.rate = inputs.vatRate || '10';
      } else if (inputs.activeTab === 'capital-gains') {
        urlParams.sellPrice = inputs.salePrice?.replace(/,/g, '') || '';
        urlParams.buyPrice = inputs.purchasePrice?.replace(/,/g, '') || '';
        urlParams.period = inputs.holdingPeriod || '';
        urlParams.propertyType = inputs.propertyType || 'general';
      }
      
      updateURL(urlParams);
    }
  };

  // 이력 결과 포맷팅
  const formatHistoryResult = (result: Record<string, unknown>) => {
    if (!result) return '';
    const r = result as unknown as TaxResult;

    if (r.type === 'income' || r.type === 'capital-gains') {
      return t('history.net', { net: formatNumber(r.netAmount), tax: formatNumber(r.totalTax) });
    } else if (r.type === 'vat') {
      return t('history.vat', { total: formatNumber(r.netAmount + r.totalTax), vat: formatNumber(r.totalTax) });
    }

    return t('history.tax', { tax: formatNumber(r.totalTax) });
  };

  const handleShare = async () => {
    try {
      const currentUrl = window.location.href;
      
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(currentUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = currentUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
      alert(t('share.copyFailed', { url: window.location.href }));
    }
  };

  const updateURL = (newParams: Record<string, string>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const handleCalculate = () => {
    let calculation: TaxResult | null = null;

    switch (activeTab) {
      case 'income':
        if (annualIncome) {
          calculation = calculateIncomeTax(
            parseInt(annualIncome.replace(/,/g, '')),
            parseInt(dependents),
            parseInt(medicalExpenses.replace(/,/g, '') || '0'),
            parseInt(educationExpenses.replace(/,/g, '') || '0')
          );
        }
        break;
      case 'vat':
        if (saleAmount) {
          calculation = calculateVAT(
            parseInt(saleAmount.replace(/,/g, '')),
            parseInt(vatRate)
          );
        }
        break;
      case 'capital-gains':
        if (salePrice && purchasePrice && holdingPeriod) {
          calculation = calculateCapitalGainsTax(
            parseInt(salePrice.replace(/,/g, '')),
            parseInt(purchasePrice.replace(/,/g, '')),
            parseInt(holdingPeriod),
            propertyType
          );
        }
        break;
    }

    setResult(calculation);
    setShowSaveButton(!!calculation); // 계산 결과가 있으면 저장 버튼 표시
  };

  // 입력 핸들러들
  const handleNumberInput = (value: string, setter: (value: string) => void, paramKey: string) => {
    const numValue = value.replace(/,/g, '');
    if (/^\d*$/.test(numValue)) {
      const formattedValue = formatNumber(Number(numValue));
      setter(formattedValue);
      updateURL({ [paramKey]: numValue, tab: activeTab });
    }
  };

  // URL에서 초기값 로드
  useEffect(() => {
    const tabParam = searchParams.get('tab') as TaxType;
    if (tabParam && ['income', 'vat', 'capital-gains'].includes(tabParam)) {
      setActiveTab(tabParam);
    }

    const incomeParam = searchParams.get('income');
    const depsParam = searchParams.get('dependents');
    const medicalParam = searchParams.get('medical');
    const educationParam = searchParams.get('education');
    const saleParam = searchParams.get('sale');
    const rateParam = searchParams.get('rate');
    const sellParam = searchParams.get('sellPrice');
    const buyParam = searchParams.get('buyPrice');
    const periodParam = searchParams.get('period');
    const typeParam = searchParams.get('propertyType');

    if (incomeParam && /^\d+$/.test(incomeParam)) {
      setAnnualIncome(formatNumber(Number(incomeParam)));
    }
    if (depsParam && /^\d+$/.test(depsParam)) {
      setDependents(depsParam);
    }
    if (medicalParam && /^\d+$/.test(medicalParam)) {
      setMedicalExpenses(formatNumber(Number(medicalParam)));
    }
    if (educationParam && /^\d+$/.test(educationParam)) {
      setEducationExpenses(formatNumber(Number(educationParam)));
    }
    if (saleParam && /^\d+$/.test(saleParam)) {
      setSaleAmount(formatNumber(Number(saleParam)));
    }
    if (rateParam && /^\d+$/.test(rateParam)) {
      setVatRate(rateParam);
    }
    if (sellParam && /^\d+$/.test(sellParam)) {
      setSalePrice(formatNumber(Number(sellParam)));
    }
    if (buyParam && /^\d+$/.test(buyParam)) {
      setPurchasePrice(formatNumber(Number(buyParam)));
    }
    if (periodParam && /^\d+$/.test(periodParam)) {
      setHoldingPeriod(periodParam);
    }
    if (typeParam && ['general', 'luxury', 'multiple'].includes(typeParam)) {
      setPropertyType(typeParam as 'general' | 'luxury' | 'multiple');
    }
  }, [searchParams]);

  useEffect(() => {
    handleCalculate();
  }, [activeTab, annualIncome, dependents, medicalExpenses, educationExpenses, saleAmount, vatRate, salePrice, purchasePrice, holdingPeriod, propertyType]);

  const renderInputSection = () => {
    switch (activeTab) {
      case 'income':
        return (
          <div className="space-y-6">
            <div>
              <label htmlFor="tc-income" className="block text-sm font-medium text-body mb-2">
                {t('input.annualIncome')}
              </label>
              <div className="relative">
                <input
                  id="tc-income"
                  type="text"
                  inputMode="numeric"
                  value={annualIncome}
                  onChange={(e) => handleNumberInput(e.target.value, setAnnualIncome, 'income')}
                  placeholder={t('input.example', { n: '50,000,000' })}
                  className={`${glassInput} px-4 py-3`}
                />
                <span className="absolute right-3 top-3 text-muted">{t('won')}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-body mb-2">
                {t('input.dependents')}
              </label>
              <select
                value={dependents}
                onChange={(e) => {
                  setDependents(e.target.value);
                  updateURL({ dependents: e.target.value, tab: activeTab });
                }}
                className={`${glassInput} px-4 py-3`}
              >
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                  <option key={num} value={num}>{t('input.people', { n: num })}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-body mb-2">
                  {t('input.medical')}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={medicalExpenses}
                    onChange={(e) => handleNumberInput(e.target.value, setMedicalExpenses, 'medical')}
                    placeholder="0"
                    className={`${glassInput} px-4 py-3`}
                  />
                  <span className="absolute right-3 top-3 text-muted">{t('won')}</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-body mb-2">
                  {t('input.education')}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={educationExpenses}
                    onChange={(e) => handleNumberInput(e.target.value, setEducationExpenses, 'education')}
                    placeholder="0"
                    className={`${glassInput} px-4 py-3`}
                  />
                  <span className="absolute right-3 top-3 text-muted">{t('won')}</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'vat':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-body mb-2">
                {t('labels.supplyValue')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={saleAmount}
                  onChange={(e) => handleNumberInput(e.target.value, setSaleAmount, 'sale')}
                  placeholder={t('input.example', { n: '10,000,000' })}
                  className={`${glassInput} px-4 py-3`}
                />
                <span className="absolute right-3 top-3 text-muted">{t('won')}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-body mb-2">
                {t('input.vatRate')}
              </label>
              <select
                value={vatRate}
                onChange={(e) => {
                  setVatRate(e.target.value);
                  updateURL({ rate: e.target.value, tab: activeTab });
                }}
                className={`${glassInput} px-4 py-3`}
              >
                <option value="10">{t('input.vatStandard')}</option>
                <option value="0">{t('input.vatZero')}</option>
              </select>
            </div>
          </div>
        );

      case 'capital-gains':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-body mb-2">
                  {t('input.salePrice')}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={salePrice}
                    onChange={(e) => handleNumberInput(e.target.value, setSalePrice, 'sellPrice')}
                    placeholder={t('input.example', { n: '800,000,000' })}
                    className={`${glassInput} px-4 py-3`}
                  />
                  <span className="absolute right-3 top-3 text-muted">{t('won')}</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-body mb-2">
                  {t('input.purchasePrice')}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={purchasePrice}
                    onChange={(e) => handleNumberInput(e.target.value, setPurchasePrice, 'buyPrice')}
                    placeholder={t('input.example', { n: '500,000,000' })}
                    className={`${glassInput} px-4 py-3`}
                  />
                  <span className="absolute right-3 top-3 text-muted">{t('won')}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-body mb-2">
                  {t('input.holdingPeriod')}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={holdingPeriod}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (/^\d*$/.test(value) && Number(value) <= 50) {
                        setHoldingPeriod(value);
                        updateURL({ period: value, tab: activeTab });
                      }
                    }}
                    placeholder="5"
                    className={`${glassInput} px-4 py-3`}
                  />
                  <span className="absolute right-3 top-3 text-muted">{t('input.years')}</span>
                </div>
              </div>
              
              <div>
                <label htmlFor="tc-property" className="block text-sm font-medium text-body mb-2">
                  {t('input.propertyType')}
                </label>
                <select
                  id="tc-property"
                  value={propertyType}
                  onChange={(e) => {
                    const value = e.target.value as 'general' | 'luxury' | 'multiple';
                    setPropertyType(value);
                    updateURL({ propertyType: value, tab: activeTab });
                  }}
                  className={`${glassInput} px-4 py-3`}
                >
                  <option value="general">{t('input.propertyGeneral')}</option>
                  <option value="luxury">{t('input.propertyLuxury')}</option>
                  <option value="multiple">{t('input.propertyMultiple')}</option>
                </select>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const heroLabel = activeTab === 'vat' ? t('result.withVat') : t('result.afterTax')
  const tabKey = activeTab === 'capital-gains' ? 'capitalGains' : activeTab
  const heroValue = result ? `${formatNumber(activeTab === 'vat' ? result.netAmount + result.totalTax : result.netAmount)}${t('won')}` : ''

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
          <p className="text-sm text-muted mt-1">
            {t('description')}
          </p>
        </div>
        <CalculationHistory
          histories={histories}
          isLoading={historyLoading}
          onLoadHistory={handleLoadFromHistory}
          onRemoveHistory={removeHistory}
          onClearHistories={clearHistories}
          formatResult={formatHistoryResult}
        />
      </div>

      {/* 탭 메뉴 */}
      <div className="flex flex-wrap justify-center mb-8 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
        {Object.entries(taxTypes).map(([key, label]) => (
          <button
            key={key}
            onClick={() => {
              setActiveTab(key as TaxType);
              updateURL({ tab: key });
            }}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === key
                ? 'bg-field text-green-600 shadow-sm'
                : 'text-sub hover:text-green-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* 입력 섹션 */}
        <div className={`${glassCard} ${glassInset} p-8`}>
          {result && <MobileResultLink href="#tax-calculator-result" label={heroLabel} value={heroValue} className="mb-6" />}
          <h2 className="text-2xl font-semibold mb-6 text-fg">
            {t('input.title', { type: taxTypes[activeTab] })}
          </h2>
          
          {renderInputSection()}

          <div className="bg-subtle p-4 rounded-lg mt-6">
            <h3 className="text-sm font-medium text-fg mb-2">
              {t('basis.title')}
            </h3>
            <ul className="text-sm text-sub space-y-1">
              {(t.raw(`basis.${tabKey}`) as string[]).map(item => (
                <li key={item}>{`• ${item}`}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* 결과 섹션 */}
        <div id="tax-calculator-result" className={`${glassCard} ${glassInset} p-8 scroll-mt-20`}>
          <h2 className="text-2xl font-semibold mb-6 text-fg">{t('result.title')}</h2>
          
          {result ? (
            <div className="space-y-6" aria-live="polite">
              <div className="text-center p-6 bg-primary rounded-xl text-white">
                <div className="text-sm opacity-90 mb-1">
                  {heroLabel}
                </div>
                <div className="text-3xl font-bold">
                  {heroValue}
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={handleShare}
                    className="inline-flex items-center space-x-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-white transition-colors"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>{t('share.copied')}</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4" />
                        <span>{t('share.button')}</span>
                      </>
                    )}
                  </button>
                  
                  {showSaveButton && (
                    <button
                      onClick={handleSaveCalculation}
                      className="inline-flex items-center space-x-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-white transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      <span>{t('share.save')}</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-line">
                  <span className="text-sub">
                    {activeTab === 'vat' ? t('labels.supplyValue') : t('result.grossAmount')}
                  </span>
                  <span className="font-semibold text-fg">
                    {activeTab === 'vat' 
                      ? formatNumber(result.netAmount)
                      : activeTab === 'income'
                      ? formatNumber(parseInt(annualIncome.replace(/,/g, '') || '0'))
                      : formatNumber(parseInt(salePrice.replace(/,/g, '') || '0'))}{t('won')}
                  </span>
                </div>
                
                <div className="space-y-2">
                  {activeTab === 'income' && result.breakdown && (
                    <>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-sub">{t('labels.incomeTax')}</span>
                        <span className="text-red-600 dark:text-red-400">
                          {minus(result.breakdown.incomeTax)}{t('won')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-sub">{t('labels.localIncomeTax')}</span>
                        <span className="text-red-600 dark:text-red-400">
                          {minus(result.breakdown.localIncomeTax)}{t('won')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-sub">{t('labels.nationalPension')}</span>
                        <span className="text-red-600 dark:text-red-400">
                          {minus(result.breakdown.nationalPension)}{t('won')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-sub">{t('labels.healthInsurance')}</span>
                        <span className="text-red-600 dark:text-red-400">
                          {minus(result.breakdown.healthInsurance)}{t('won')}
                        </span>
                      </div>
                    </>
                  )}
                  
                  {activeTab === 'vat' && result.breakdown && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-sub">{t('labels.vat')}</span>
                      <span className="text-blue-600 dark:text-blue-400">
                        +{formatNumber(result.breakdown.vatAmount || 0)}{t('won')}
                      </span>
                    </div>
                  )}
                  
                  {activeTab === 'capital-gains' && result.breakdown && (
                    <>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-sub">{t('labels.capitalGainsTax')}</span>
                        <span className="text-red-600 dark:text-red-400">
                          {minus(result.breakdown.capitalGainsTax)}{t('won')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-sub">{t('labels.localIncomeTax')}</span>
                        <span className="text-red-600 dark:text-red-400">
                          {minus(result.breakdown.localTax)}{t('won')}
                        </span>
                      </div>
                    </>
                  )}
                </div>
                
                <div className="flex justify-between items-center py-2 border-t border-line font-semibold">
                  <span className="text-fg">{t('result.totalTax')}</span>
                  <span className="text-red-600 dark:text-red-400">
                    {formatNumber(result.totalTax)}{t('won')}
                  </span>
                </div>
              </div>

              <div className="bg-subtle p-4 rounded-lg">
                <h3 className="text-sm font-medium text-fg mb-2">
                  {t('notes.title')}
                </h3>
                <ul className="text-sm text-sub space-y-1">
                  {(t.raw(`notes.${tabKey}`) as string[]).map(item => (
                    <li key={item}>{`• ${item}`}</li>
                  ))}
                </ul>
              </div>

              {/* 세금 구성 도넛 차트 */}
              {Object.keys(taxChartOption).length > 0 && (
                <div className="bg-subtle rounded-xl p-4">
                  <h3 className="text-sm font-medium text-fg mb-2">
                    {t(`chart.${tabKey}`)}
                  </h3>
                  <ReactECharts option={taxChartOption} style={{ height: '280px' }} />
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <Building2 className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-muted">
                {t('result.empty1')}<br />
                {t('result.empty2')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 상세 가이드 섹션 */}
      <GuideSection namespace="tax" />
    </div>
  );
};

export default TaxCalculatorContent;