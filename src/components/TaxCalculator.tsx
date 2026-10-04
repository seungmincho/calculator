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
import { INSURANCE, PENSION_ANNUAL_CAP } from '@/utils/insuranceRates'
import { calc as yearEndCalc, DEFAULT_INPUT as YEAR_END_DEFAULT } from '@/utils/yearEndTax'
import { calcCgt, ymd } from '@/utils/capitalGainsTax'
import '@/lib/i18n/ns/tax'

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
        { name: '소득세', value: result.breakdown.incomeTax || 0, color: '#3B82F6' },
        { name: '지방소득세', value: result.breakdown.localIncomeTax || 0, color: '#6366F1' },
        { name: '국민연금', value: result.breakdown.nationalPension || 0, color: '#10B981' },
        { name: '건강보험', value: result.breakdown.healthInsurance || 0, color: '#F59E0B' },
        { name: '장기요양보험', value: result.breakdown.longTermCare || 0, color: '#F97316' },
        { name: '고용보험', value: result.breakdown.employmentInsurance || 0, color: '#EF4444' },
      ]
    } else if (result.type === 'vat') {
      items = [
        { name: '공급가액', value: result.netAmount || 0, color: '#3B82F6' },
        { name: '부가가치세', value: result.breakdown.vatAmount || 0, color: '#F59E0B' },
      ]
    } else if (result.type === 'capital-gains') {
      items = [
        { name: '양도소득세', value: result.breakdown.capitalGainsTax || 0, color: '#F97316' },
        { name: '지방소득세', value: result.breakdown.localTax || 0, color: '#6366F1' },
      ]
    }

    items = items.filter(item => item.value > 0)
    if (items.length === 0) return {}

    return {
      tooltip: {
        trigger: 'item' as const,
        formatter: (params: { name: string; value: number; percent: number; marker: string }) =>
          `${params.marker} ${params.name}: ${Math.round(params.value).toLocaleString('ko-KR')}원 (${Math.round(params.percent ?? 0)}%)`
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
    'income': '소득세',
    'vat': '부가가치세',
    'capital-gains': '양도소득세'
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
    return Math.floor(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

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

    if (r.type === 'income') {
      return `실수령액 ${formatNumber(r.netAmount)}원 (세금 ${formatNumber(r.totalTax)}원)`;
    } else if (r.type === 'vat') {
      return `부가세 포함 ${formatNumber(r.netAmount + r.totalTax)}원 (부가세 ${formatNumber(r.totalTax)}원)`;
    } else if (r.type === 'capital-gains') {
      return `실수령액 ${formatNumber(r.netAmount)}원 (세금 ${formatNumber(r.totalTax)}원)`;
    }

    return `세금 ${formatNumber(r.totalTax)}원`;
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
      alert('URL 복사에 실패했습니다. 수동으로 복사해주세요: ' + window.location.href);
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
                연간 총급여 (근로소득, 비과세 제외)
              </label>
              <div className="relative">
                <input
                  id="tc-income"
                  type="text"
                  inputMode="numeric"
                  value={annualIncome}
                  onChange={(e) => handleNumberInput(e.target.value, setAnnualIncome, 'income')}
                  placeholder="예: 50,000,000"
                  className={`${glassInput} px-4 py-3`}
                />
                <span className="absolute right-3 top-3 text-muted">원</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-body mb-2">
                부양가족 수
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
                  <option key={num} value={num}>{num}명</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-body mb-2">
                  의료비
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={medicalExpenses}
                    onChange={(e) => handleNumberInput(e.target.value, setMedicalExpenses, 'medical')}
                    placeholder="0"
                    className={`${glassInput} px-4 py-3`}
                  />
                  <span className="absolute right-3 top-3 text-muted">원</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-body mb-2">
                  교육비
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={educationExpenses}
                    onChange={(e) => handleNumberInput(e.target.value, setEducationExpenses, 'education')}
                    placeholder="0"
                    className={`${glassInput} px-4 py-3`}
                  />
                  <span className="absolute right-3 top-3 text-muted">원</span>
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
                공급가액
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={saleAmount}
                  onChange={(e) => handleNumberInput(e.target.value, setSaleAmount, 'sale')}
                  placeholder="예: 10,000,000"
                  className={`${glassInput} px-4 py-3`}
                />
                <span className="absolute right-3 top-3 text-muted">원</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-body mb-2">
                부가세율
              </label>
              <select
                value={vatRate}
                onChange={(e) => {
                  setVatRate(e.target.value);
                  updateURL({ rate: e.target.value, tab: activeTab });
                }}
                className={`${glassInput} px-4 py-3`}
              >
                <option value="10">10% (일반세율)</option>
                <option value="0">0% (면세)</option>
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
                  양도가액
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={salePrice}
                    onChange={(e) => handleNumberInput(e.target.value, setSalePrice, 'sellPrice')}
                    placeholder="예: 800,000,000"
                    className={`${glassInput} px-4 py-3`}
                  />
                  <span className="absolute right-3 top-3 text-muted">원</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-body mb-2">
                  취득가액
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={purchasePrice}
                    onChange={(e) => handleNumberInput(e.target.value, setPurchasePrice, 'buyPrice')}
                    placeholder="예: 500,000,000"
                    className={`${glassInput} px-4 py-3`}
                  />
                  <span className="absolute right-3 top-3 text-muted">원</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-body mb-2">
                  보유기간
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
                  <span className="absolute right-3 top-3 text-muted">년</span>
                </div>
              </div>
              
              <div>
                <label htmlFor="tc-property" className="block text-sm font-medium text-body mb-2">
                  주택 보유 상황
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
                  <option value="general">1세대 1주택 (실거주)</option>
                  <option value="luxury">1세대 1주택 (거주 안 함)</option>
                  <option value="multiple">2주택 이상 (비조정지역)</option>
                </select>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-fg">세금 계산기</h1>
          <p className="text-sm text-muted mt-1">
            소득세, 부가가치세, 양도소득세를 정확하게 계산하세요
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
          <h2 className="text-2xl font-semibold mb-6 text-fg">
            {taxTypes[activeTab]} 정보 입력
          </h2>
          
          {renderInputSection()}

          <div className="bg-subtle p-4 rounded-lg mt-6">
            <h3 className="text-sm font-medium text-fg mb-2">
              계산 기준
            </h3>
            <ul className="text-sm text-sub space-y-1">
              {activeTab === 'income' && (
                <>
                  <li>• 2026년 귀속 근로소득 연말정산 기준 (소득세법 §47·§55·§59)</li>
                  <li>• 근로소득공제 → 기본공제(본인+부양가족×150만원)·4대보험 → 세율 6~45% → 근로소득세액공제</li>
                  <li>• 의료비(총급여 3% 초과분)·교육비 15% 세액공제 vs 표준세액공제 13만원 중 유리한 쪽</li>
                </>
              )}
              {activeTab === 'vat' && (
                <>
                  <li>• 일반과세자 기준</li>
                  <li>• 부가세 = 공급가액 × 세율</li>
                  <li>• 총 금액 = 공급가액 + 부가세</li>
                </>
              )}
              {activeTab === 'capital-gains' && (
                <>
                  <li>• 2026년 소득세법 기준 주택 양도 (오늘 양도·비조정지역 가정)</li>
                  <li>• 1세대 1주택 2년 보유 비과세, 양도가 12억 초과분만 과세 · 장기보유특별공제 · 기본공제 250만원</li>
                  <li>• 세율 6~45% (2년 미만 보유 60~70%). 조정지역 중과·일시적 2주택은 양도소득세 계산기에서</li>
                </>
              )}
            </ul>
          </div>
        </div>

        {/* 결과 섹션 */}
        <div className={`${glassCard} ${glassInset} p-8`}>
          <h2 className="text-2xl font-semibold mb-6 text-fg">계산 결과</h2>
          
          {result ? (
            <div className="space-y-6" aria-live="polite">
              <div className="text-center p-6 bg-primary rounded-xl text-white">
                <div className="text-sm opacity-90 mb-1">
                  {activeTab === 'vat' ? '부가세 포함 금액' : '세후 금액'}
                </div>
                <div className="text-3xl font-bold">
                  {activeTab === 'vat' 
                    ? formatNumber(result.netAmount + result.totalTax)
                    : formatNumber(result.netAmount)}원
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={handleShare}
                    className="inline-flex items-center space-x-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-white transition-colors"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>복사됨!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4" />
                        <span>결과 공유</span>
                      </>
                    )}
                  </button>
                  
                  {showSaveButton && (
                    <button
                      onClick={handleSaveCalculation}
                      className="inline-flex items-center space-x-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-white transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      <span>저장</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-line">
                  <span className="text-sub">
                    {activeTab === 'vat' ? '공급가액' : '총 소득/양도가액'}
                  </span>
                  <span className="font-semibold text-fg">
                    {activeTab === 'vat' 
                      ? formatNumber(result.netAmount)
                      : activeTab === 'income'
                      ? formatNumber(parseInt(annualIncome.replace(/,/g, '') || '0'))
                      : formatNumber(parseInt(salePrice.replace(/,/g, '') || '0'))}원
                  </span>
                </div>
                
                <div className="space-y-2">
                  {activeTab === 'income' && result.breakdown && (
                    <>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-sub">소득세</span>
                        <span className="text-red-600 dark:text-red-400">
                          -{formatNumber(result.breakdown.incomeTax || 0)}원
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-sub">지방소득세</span>
                        <span className="text-red-600 dark:text-red-400">
                          -{formatNumber(result.breakdown.localIncomeTax || 0)}원
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-sub">국민연금</span>
                        <span className="text-red-600 dark:text-red-400">
                          -{formatNumber(result.breakdown.nationalPension || 0)}원
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-sub">건강보험</span>
                        <span className="text-red-600 dark:text-red-400">
                          -{formatNumber(result.breakdown.healthInsurance || 0)}원
                        </span>
                      </div>
                    </>
                  )}
                  
                  {activeTab === 'vat' && result.breakdown && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-sub">부가가치세</span>
                      <span className="text-blue-600 dark:text-blue-400">
                        +{formatNumber(result.breakdown.vatAmount || 0)}원
                      </span>
                    </div>
                  )}
                  
                  {activeTab === 'capital-gains' && result.breakdown && (
                    <>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-sub">양도소득세</span>
                        <span className="text-red-600 dark:text-red-400">
                          -{formatNumber(result.breakdown.capitalGainsTax || 0)}원
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-sub">지방소득세</span>
                        <span className="text-red-600 dark:text-red-400">
                          -{formatNumber(result.breakdown.localTax || 0)}원
                        </span>
                      </div>
                    </>
                  )}
                </div>
                
                <div className="flex justify-between items-center py-2 border-t border-line font-semibold">
                  <span className="text-fg">총 세금</span>
                  <span className="text-red-600 dark:text-red-400">
                    {formatNumber(result.totalTax)}원
                  </span>
                </div>
              </div>

              <div className="bg-subtle p-4 rounded-lg">
                <h3 className="text-sm font-medium text-fg mb-2">
                  참고사항
                </h3>
                <ul className="text-sm text-sub space-y-1">
                  {activeTab === 'income' && (
                    <>
                      <li>• 실제 세액은 다른 소득공제, 세액공제에 따라 달라질 수 있습니다</li>
                      <li>• 연말정산시 추가 공제항목을 확인하세요</li>
                    </>
                  )}
                  {activeTab === 'vat' && (
                    <>
                      <li>• 간이과세자는 별도 세율이 적용됩니다</li>
                      <li>• 면세사업자는 부가세를 부과하지 않습니다</li>
                    </>
                  )}
                  {activeTab === 'capital-gains' && (
                    <>
                      <li>• 1세대 1주택 비과세 요건을 확인하세요</li>
                      <li>• 실제 계산시 필요경비 등이 추가로 공제됩니다</li>
                    </>
                  )}
                </ul>
              </div>

              {/* 세금 구성 도넛 차트 */}
              {Object.keys(taxChartOption).length > 0 && (
                <div className="bg-subtle rounded-xl p-4">
                  <h3 className="text-sm font-medium text-fg mb-2">
                    {activeTab === 'income' ? '공제 항목별 비중' : activeTab === 'vat' ? '공급가액 vs 부가세' : '양도세 구성'}
                  </h3>
                  <ReactECharts option={taxChartOption} style={{ height: '280px' }} />
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <Building2 className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-muted">
                필요한 정보를 입력하면<br />
                세금을 계산해드립니다.
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