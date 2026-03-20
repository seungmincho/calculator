'use client'

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic'
import { Receipt, Building2, TrendingUp, Calculator, Share2, Check, Save } from 'lucide-react';
import { useCalculationHistory } from '@/hooks/useCalculationHistory';
import CalculationHistory from '@/components/CalculationHistory';

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

  // 소득세 계산 (2025년 기준)
  const calculateIncomeTax = (income: number, deps: number, medical: number, education: number) => {
    // 기본공제: 본인 + 부양가족 × 150만원
    const basicDeduction = (1 + deps) * 1500000;
    
    // 인적공제 추가 (경로우대, 장애인 등은 간소화)
    const personalDeduction = basicDeduction;
    
    // 특별공제 (의료비, 교육비)
    const medicalDeduction = Math.max(0, medical - income * 0.03); // 소득의 3% 초과분
    const educationDeduction = Math.min(education, 3000000); // 연 300만원 한도
    const specialDeduction = medicalDeduction + educationDeduction;
    
    // 표준공제 vs 특별공제 중 유리한 것
    const itemizedDeduction = Math.max(600000, specialDeduction); // 표준공제 60만원
    
    // 과세표준
    const taxableIncome = Math.max(0, income - personalDeduction - itemizedDeduction);
    
    // 소득세 계산
    let incomeTax = 0;
    if (taxableIncome <= 14000000) {
      incomeTax = taxableIncome * 0.06;
    } else if (taxableIncome <= 50000000) {
      incomeTax = 840000 + (taxableIncome - 14000000) * 0.15;
    } else if (taxableIncome <= 88000000) {
      incomeTax = 6240000 + (taxableIncome - 50000000) * 0.24;
    } else if (taxableIncome <= 150000000) {
      incomeTax = 15360000 + (taxableIncome - 88000000) * 0.35;
    } else if (taxableIncome <= 300000000) {
      incomeTax = 37060000 + (taxableIncome - 150000000) * 0.38;
    } else if (taxableIncome <= 500000000) {
      incomeTax = 94060000 + (taxableIncome - 300000000) * 0.40;
    } else {
      incomeTax = 174060000 + (taxableIncome - 500000000) * 0.42;
    }
    
    const localIncomeTax = incomeTax * 0.1; // 지방소득세
    
    // 4대보험 (간소화)
    const nationalPension = Math.min(income, 63600000) * 0.045;
    const healthInsurance = income * 0.03545;
    const longTermCare = healthInsurance * 0.1227;
    const employmentInsurance = income * 0.009;
    
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

  // 양도소득세 계산 (간소화)
  const calculateCapitalGainsTax = (sellPrice: number, buyPrice: number, years: number, type: string) => {
    const capitalGain = sellPrice - buyPrice;
    
    if (capitalGain <= 0) {
      return {
        type: 'capital-gains' as TaxType,
        totalTax: 0,
        netAmount: sellPrice,
        breakdown: { capitalGainsTax: 0, localTax: 0 }
      };
    }
    
    // 장기보유특별공제 (간소화)
    const longTermDeduction = years >= 3 ? capitalGain * Math.min((years - 2) * 0.1, 0.3) : 0;
    const taxableGain = capitalGain - longTermDeduction;
    
    // 양도소득세율 (간소화)
    let taxRate = 0.22; // 기본세율
    if (type === 'luxury') taxRate = 0.55; // 고급주택
    if (type === 'multiple') taxRate = 0.33; // 다주택자
    
    const capitalGainsTax = taxableGain * taxRate;
    const localTax = capitalGainsTax * 0.1;
    const totalTax = capitalGainsTax + localTax;
    
    return {
      type: 'capital-gains' as TaxType,
      totalTax,
      netAmount: sellPrice - totalTax,
      breakdown: {
        capitalGainsTax,
        localTax
      }
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                연간 소득
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={annualIncome}
                  onChange={(e) => handleNumberInput(e.target.value, setAnnualIncome, 'income')}
                  placeholder="예: 50,000,000"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 dark:text-white"
                />
                <span className="absolute right-3 top-3 text-gray-500 dark:text-gray-400">원</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                부양가족 수
              </label>
              <select
                value={dependents}
                onChange={(e) => {
                  setDependents(e.target.value);
                  updateURL({ dependents: e.target.value, tab: activeTab });
                }}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 dark:text-white"
              >
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                  <option key={num} value={num}>{num}명</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  의료비
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={medicalExpenses}
                    onChange={(e) => handleNumberInput(e.target.value, setMedicalExpenses, 'medical')}
                    placeholder="0"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 dark:text-white"
                  />
                  <span className="absolute right-3 top-3 text-gray-500 dark:text-gray-400">원</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  교육비
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={educationExpenses}
                    onChange={(e) => handleNumberInput(e.target.value, setEducationExpenses, 'education')}
                    placeholder="0"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 dark:text-white"
                  />
                  <span className="absolute right-3 top-3 text-gray-500 dark:text-gray-400">원</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'vat':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                공급가액
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={saleAmount}
                  onChange={(e) => handleNumberInput(e.target.value, setSaleAmount, 'sale')}
                  placeholder="예: 10,000,000"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 dark:text-white"
                />
                <span className="absolute right-3 top-3 text-gray-500 dark:text-gray-400">원</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                부가세율
              </label>
              <select
                value={vatRate}
                onChange={(e) => {
                  setVatRate(e.target.value);
                  updateURL({ rate: e.target.value, tab: activeTab });
                }}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 dark:text-white"
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  양도가액
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={salePrice}
                    onChange={(e) => handleNumberInput(e.target.value, setSalePrice, 'sellPrice')}
                    placeholder="예: 800,000,000"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 dark:text-white"
                  />
                  <span className="absolute right-3 top-3 text-gray-500 dark:text-gray-400">원</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  취득가액
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={purchasePrice}
                    onChange={(e) => handleNumberInput(e.target.value, setPurchasePrice, 'buyPrice')}
                    placeholder="예: 500,000,000"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 dark:text-white"
                  />
                  <span className="absolute right-3 top-3 text-gray-500 dark:text-gray-400">원</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 dark:text-white"
                  />
                  <span className="absolute right-3 top-3 text-gray-500 dark:text-gray-400">년</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  부동산 유형
                </label>
                <select
                  value={propertyType}
                  onChange={(e) => {
                    const value = e.target.value as 'general' | 'luxury' | 'multiple';
                    setPropertyType(value);
                    updateURL({ propertyType: value, tab: activeTab });
                  }}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 dark:text-white"
                >
                  <option value="general">일반주택</option>
                  <option value="luxury">고급주택</option>
                  <option value="multiple">다주택자</option>
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">세금 계산기</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
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
                ? 'bg-white dark:bg-gray-700 text-green-600 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-green-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* 입력 섹션 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">
            {taxTypes[activeTab]} 정보 입력
          </h2>
          
          {renderInputSection()}

          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg mt-6">
            <h3 className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
              <Calculator className="w-4 h-4 inline mr-1" />
              계산 기준
            </h3>
            <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
              {activeTab === 'income' && (
                <>
                  <li>• 2025년 소득세법 기준</li>
                  <li>• 기본공제: 본인+부양가족×150만원</li>
                  <li>• 표준공제 60만원 vs 특별공제 중 선택</li>
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
                  <li>• 2025년 양도소득세법 기준</li>
                  <li>• 장기보유특별공제 적용</li>
                  <li>• 부동산 유형별 차등세율</li>
                </>
              )}
            </ul>
          </div>
        </div>

        {/* 결과 섹션 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">계산 결과</h2>
          
          {result ? (
            <div className="space-y-6">
              <div className="text-center p-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl text-white">
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
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                  <span className="text-gray-600 dark:text-gray-400">
                    {activeTab === 'vat' ? '공급가액' : '총 소득/양도가액'}
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white">
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
                        <span className="text-gray-600 dark:text-gray-400">소득세</span>
                        <span className="text-red-600 dark:text-red-400">
                          -{formatNumber(result.breakdown.incomeTax || 0)}원
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600 dark:text-gray-400">지방소득세</span>
                        <span className="text-red-600 dark:text-red-400">
                          -{formatNumber(result.breakdown.localIncomeTax || 0)}원
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600 dark:text-gray-400">국민연금</span>
                        <span className="text-red-600 dark:text-red-400">
                          -{formatNumber(result.breakdown.nationalPension || 0)}원
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600 dark:text-gray-400">건강보험</span>
                        <span className="text-red-600 dark:text-red-400">
                          -{formatNumber(result.breakdown.healthInsurance || 0)}원
                        </span>
                      </div>
                    </>
                  )}
                  
                  {activeTab === 'vat' && result.breakdown && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 dark:text-gray-400">부가가치세</span>
                      <span className="text-blue-600 dark:text-blue-400">
                        +{formatNumber(result.breakdown.vatAmount || 0)}원
                      </span>
                    </div>
                  )}
                  
                  {activeTab === 'capital-gains' && result.breakdown && (
                    <>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600 dark:text-gray-400">양도소득세</span>
                        <span className="text-red-600 dark:text-red-400">
                          -{formatNumber(result.breakdown.capitalGainsTax || 0)}원
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600 dark:text-gray-400">지방소득세</span>
                        <span className="text-red-600 dark:text-red-400">
                          -{formatNumber(result.breakdown.localTax || 0)}원
                        </span>
                      </div>
                    </>
                  )}
                </div>
                
                <div className="flex justify-between items-center py-2 border-t border-gray-200 dark:border-gray-600 font-semibold">
                  <span className="text-gray-900 dark:text-white">총 세금</span>
                  <span className="text-red-600 dark:text-red-400">
                    {formatNumber(result.totalTax)}원
                  </span>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                  <TrendingUp className="w-4 h-4 inline mr-1" />
                  참고사항
                </h3>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
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
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    {activeTab === 'income' ? '공제 항목별 비중' : activeTab === 'vat' ? '공급가액 vs 부가세' : '양도세 구성'}
                  </h3>
                  <ReactECharts option={taxChartOption} style={{ height: '280px' }} />
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <Building2 className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                필요한 정보를 입력하면<br />
                세금을 계산해드립니다.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 상세 가이드 섹션 */}
      <div className="mt-12 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <h2 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white text-center">🚀 세금 계산 마스터 가이드</h2>
        <p className="text-lg text-gray-600 dark:text-gray-300 text-center mb-12 max-w-4xl mx-auto break-keep whitespace-pre-line">
          개인사업자부터 직장인까지! 세금의 모든 것을 마스터하는 완전한 가이드입니다. 
          소득세부터 양도소득세까지, 절세 전략으로 내 돈을 지키세요!
        </p>
        
        {/* 핵심 기능 소개 */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-xl p-8 transform hover:scale-105 transition-transform">
            <div className="flex items-center mb-4">
              <div className="bg-green-600 p-3 rounded-full mr-3">
                <Receipt className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-green-900 dark:text-green-200">💎 3종 세금 통합 계산</h3>
            </div>
            <p className="text-green-800 dark:text-green-300 mb-4 leading-relaxed">
              소득세, 부가세, 양도소득세를 하나의 도구로! 국세청 기준 정확한 계산과 절세 포인트까지 제공합니다.
            </p>
            <div className="space-y-3">
              <div className="bg-green-100 dark:bg-green-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-green-900 dark:text-green-200 mb-1">💼 소득세 계산</h4>
                <p className="text-sm text-green-700 dark:text-green-300">누진세율, 인적공제, 특별공제까지 완벽 반영</p>
              </div>
              <div className="bg-green-100 dark:bg-green-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-green-900 dark:text-green-200 mb-1">🏪 부가가치세</h4>
                <p className="text-sm text-green-700 dark:text-green-300">사업자를 위한 정확한 부가세 계산</p>
              </div>
              <div className="bg-green-100 dark:bg-green-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-green-900 dark:text-green-200 mb-1">🏠 양도소득세</h4>
                <p className="text-sm text-green-700 dark:text-green-300">부동산 거래시 필수 양도세 시뮬레이션</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-8 transform hover:scale-105 transition-transform">
            <div className="flex items-center mb-4">
              <div className="bg-blue-600 p-3 rounded-full mr-3">
                <Calculator className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-blue-900 dark:text-blue-200">📊 스마트 절세 분석</h3>
            </div>
            <p className="text-blue-800 dark:text-blue-300 mb-4 leading-relaxed">
              단순 계산을 넘어선 똑똑한 세무 분석! 공제 항목부터 절세 전략까지 맞춤형 가이드를 제공합니다.
            </p>
            <div className="space-y-3">
              <div className="bg-blue-100 dark:bg-blue-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">🎯 최적화 공제</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">표준공제 vs 특별공제 자동 선택</p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">💡 절세 포인트</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">세금 부담을 줄이는 실용적 팁 제공</p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">📈 세부담률 분석</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">소득 구간별 실효세율 상세 분석</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl p-8 transform hover:scale-105 transition-transform">
            <div className="flex items-center mb-4">
              <div className="bg-purple-600 p-3 rounded-full mr-3">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-purple-900 dark:text-purple-200">⚡ 실무 최적화 도구</h3>
            </div>
            <p className="text-purple-800 dark:text-purple-300 mb-4 leading-relaxed">
              세무사부터 개인사업자까지! 실무에서 바로 쓸 수 있는 전문가급 세무 계산 도구입니다.
            </p>
            <div className="space-y-3">
              <div className="bg-purple-100 dark:bg-purple-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-purple-900 dark:text-purple-200 mb-1">📂 계산 이력 관리</h4>
                <p className="text-sm text-purple-700 dark:text-purple-300">다양한 세금 시나리오 저장하고 비교</p>
              </div>
              <div className="bg-purple-100 dark:bg-purple-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-purple-900 dark:text-purple-200 mb-1">🔗 URL 공유</h4>
                <p className="text-sm text-purple-700 dark:text-purple-300">계산 결과를 고객이나 동료와 간편 공유</p>
              </div>
              <div className="bg-purple-100 dark:bg-purple-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-purple-900 dark:text-purple-200 mb-1">📱 반응형 디자인</h4>
                <p className="text-sm text-purple-700 dark:text-purple-300">PC, 태블릿, 모바일 어디서든 완벽하게</p>
              </div>
            </div>
          </div>
        </div>

        {/* 세금 종류별 완전정복 */}
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/30 dark:to-blue-900/30 rounded-2xl p-8 mb-12">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">🏛️ 세금 종류별 완전정복</h3>
          <p className="text-center text-gray-600 dark:text-gray-300 mb-8">내가 내야 할 세금의 정체를 정확히 파악하고 절세 전략을 세우세요!</p>
          
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <h4 className="text-xl font-semibold text-green-600 dark:text-green-400 mb-4 flex items-center">
                <span className="bg-green-100 dark:bg-green-900 p-2 rounded-full mr-3">💼</span>
                소득세 (개인소득에 대한 세금)
              </h4>
              <div className="space-y-4">
                <div className="border-l-4 border-green-400 pl-4">
                  <h5 className="font-semibold text-green-600">💡 과세 대상</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">근로소득, 사업소득, 기타소득 등 모든 개인소득</p>
                  <div className="mt-2 text-xs text-green-500 space-y-1">
                    <p>• 근로소득: 급여, 상여금, 인정상여 등</p>
                    <p>• 사업소득: 개인사업, 프리랜서 수입</p>
                    <p>• 기타소득: 강의료, 원고료, 상금 등</p>
                    <p>• 연금소득: 국민연금, 퇴직연금 등</p>
                  </div>
                </div>
                <div className="border-l-4 border-blue-400 pl-4">
                  <h5 className="font-semibold text-blue-600">📊 세율 구조</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">6%~45% 누진세율 (소득이 높을수록 세율 증가)</p>
                  <div className="mt-2 text-xs text-blue-500 space-y-1">
                    <p>• 1,400만원 이하: 6%</p>
                    <p>• 1,400~5,000만원: 15%</p>
                    <p>• 5,000~8,800만원: 24%</p>
                    <p>• 8,800만원 이상: 35%~45%</p>
                  </div>
                </div>
                <div className="border-l-4 border-purple-400 pl-4">
                  <h5 className="font-semibold text-purple-600">🎯 주요 공제</h5>
                  <div className="mt-2 text-xs text-purple-500 space-y-1">
                    <p>• 인적공제: 본인+부양가족 1인당 150만원</p>
                    <p>• 표준공제: 60만원 (특별공제와 선택)</p>
                    <p>• 의료비공제: 소득의 3% 초과분</p>
                    <p>• 교육비공제: 1인당 연 300만원 한도</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <h4 className="text-xl font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center">
                <span className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full mr-3">🏪</span>
                부가가치세 (상품·서비스 거래세)
              </h4>
              <div className="space-y-4">
                <div className="border-l-4 border-blue-400 pl-4">
                  <h5 className="font-semibold text-blue-600">💡 과세 대상</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">재화와 용역의 공급, 수입에 부과되는 간접세</p>
                  <div className="mt-2 text-xs text-blue-500 space-y-1">
                    <p>• 일반과세자: 연매출 4,800만원 초과</p>
                    <p>• 간이과세자: 연매출 4,800만원 이하</p>
                    <p>• 면세사업자: 생필품, 의료서비스 등</p>
                    <p>• 최종 소비자가 실질적 부담</p>
                  </div>
                </div>
                <div className="border-l-4 border-green-400 pl-4">
                  <h5 className="font-semibold text-green-600">📊 세율 구조</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">일반세율 10%, 간이세율 1~4%</p>
                  <div className="mt-2 text-xs text-green-500 space-y-1">
                    <p>• 일반세율: 10% (대부분의 재화와 용역)</p>
                    <p>• 영세율: 0% (수출, 국제운송 등)</p>
                    <p>• 면세: 부가세 없음 (생필품, 의료 등)</p>
                    <p>• 간이세율: 업종별 1~4%</p>
                  </div>
                </div>
                <div className="border-l-4 border-orange-400 pl-4">
                  <h5 className="font-semibold text-orange-600">🎯 신고·납부</h5>
                  <div className="mt-2 text-xs text-orange-500 space-y-1">
                    <p>• 신고시기: 1월, 7월 (연 2회)</p>
                    <p>• 예정신고: 4월, 10월</p>
                    <p>• 세금계산서 발급 의무</p>
                    <p>• 매입세액 공제 가능</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <h4 className="text-xl font-semibold text-orange-600 dark:text-orange-400 mb-4 flex items-center">
                <span className="bg-orange-100 dark:bg-orange-900 p-2 rounded-full mr-3">🏠</span>
                양도소득세 (자산 매매 차익세)
              </h4>
              <div className="space-y-4">
                <div className="border-l-4 border-orange-400 pl-4">
                  <h5 className="font-semibold text-orange-600">💡 과세 대상</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">부동산, 주식 등 자산 양도시 발생하는 소득</p>
                  <div className="mt-2 text-xs text-orange-500 space-y-1">
                    <p>• 부동산: 토지, 건물, 아파트 등</p>
                    <p>• 주식: 대주주 지분, 비상장주식</p>
                    <p>• 기타: 골프회원권, 분양권 등</p>
                    <p>• 양도가액 - 취득가액 = 양도차익</p>
                  </div>
                </div>
                <div className="border-l-4 border-red-400 pl-4">
                  <h5 className="font-semibold text-red-600">📊 세율 구조</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">6%~75% (보유기간, 주택수에 따라 차등)</p>
                  <div className="mt-2 text-xs text-red-500 space-y-1">
                    <p>• 일반주택: 6~45% (보유기간별)</p>
                    <p>• 고급주택: 60~75%</p>
                    <p>• 다주택자: 20~75%</p>
                    <p>• 1세대1주택: 비과세 가능</p>
                  </div>
                </div>
                <div className="border-l-4 border-purple-400 pl-4">
                  <h5 className="font-semibold text-purple-600">🎯 주요 공제</h5>
                  <div className="mt-2 text-xs text-purple-500 space-y-1">
                    <p>• 장기보유특별공제: 3년 이상 보유시</p>
                    <p>• 기본공제: 연 250만원</p>
                    <p>• 거주주택 양도소득공제</p>
                    <p>• 1세대1주택 비과세 혜택</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <h4 className="text-xl font-semibold text-purple-600 dark:text-purple-400 mb-4 flex items-center">
                <span className="bg-purple-100 dark:bg-purple-900 p-2 rounded-full mr-3">⚖️</span>
                지방소득세 (소득세의 10%)
              </h4>
              <div className="space-y-4">
                <div className="border-l-4 border-purple-400 pl-4">
                  <h5 className="font-semibold text-purple-600">💡 과세 대상</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">소득세, 법인세에 연동하여 부과되는 지방세</p>
                  <div className="mt-2 text-xs text-purple-500 space-y-1">
                    <p>• 개인지방소득세: 소득세의 10%</p>
                    <p>• 법인지방소득세: 법인세의 10%</p>
                    <p>• 별도 신고 불필요 (자동 계산)</p>
                    <p>• 지방자치단체 재정 확충 목적</p>
                  </div>
                </div>
                <div className="border-l-4 border-gray-400 pl-4">
                  <h5 className="font-semibold text-gray-600">📊 계산 방법</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">소득세액 × 10% = 지방소득세</p>
                  <div className="mt-2 text-xs text-gray-500 space-y-1">
                    <p>• 소득세와 동시에 자동 계산</p>
                    <p>• 별도 신고서 작성 불필요</p>
                    <p>• 소득세 환급시 함께 환급</p>
                    <p>• 원천징수시에도 함께 징수</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 절세 전략 완벽 가이드 */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 rounded-2xl p-8 mb-12">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">💰 절세 전략 완벽 가이드</h3>
          <p className="text-center text-gray-600 dark:text-gray-300 mb-8">합법적인 절세로 내 돈을 지키는 똑똑한 방법들을 알아보세요!</p>
          
          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <div className="text-center mb-4">
                <div className="bg-green-100 dark:bg-green-900 p-3 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-3">
                  <span className="text-2xl">💼</span>
                </div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white">소득세 절세 전략</h4>
              </div>
              <div className="space-y-3">
                <div className="border-l-4 border-green-400 pl-4">
                  <h5 className="font-semibold text-green-600">📋 소득공제 극대화</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">과세표준을 줄여서 세율 구간 낮추기</p>
                  <div className="text-xs text-green-500 mt-1">
                    • 연금저축 600만원 + IRP 300만원 = 연 최대 165만원 세액공제
                  </div>
                </div>
                <div className="border-l-4 border-green-400 pl-4">
                  <h5 className="font-semibold text-green-600">🏠 주택자금 공제</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">주택청약, 주택담보대출 이자 활용</p>
                  <div className="text-xs text-green-500 mt-1">
                    • 주택청약 연 240만원까지 40% 세액공제
                  </div>
                </div>
                <div className="border-l-4 border-green-400 pl-4">
                  <h5 className="font-semibold text-green-600">💳 신용카드 사용</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">소득공제 한도 내에서 최대 활용</p>
                  <div className="text-xs text-green-500 mt-1">
                    • 전통시장·대중교통 40%, 신용카드 15% 공제
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <div className="text-center mb-4">
                <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-3">
                  <span className="text-2xl">🏪</span>
                </div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white">부가세 절세 전략</h4>
              </div>
              <div className="space-y-3">
                <div className="border-l-4 border-blue-400 pl-4">
                  <h5 className="font-semibold text-blue-600">📊 매입세액 공제</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">사업용 지출의 부가세를 매출세액에서 차감</p>
                  <div className="text-xs text-blue-500 mt-1">
                    • 사업자등록증 명의로 구매한 모든 지출
                  </div>
                </div>
                <div className="border-l-4 border-blue-400 pl-4">
                  <h5 className="font-semibold text-blue-600">🧾 세금계산서 관리</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">정확한 세금계산서 수취·발급으로 공제 최대화</p>
                  <div className="text-xs text-blue-500 mt-1">
                    • 전자세금계산서 시스템 적극 활용
                  </div>
                </div>
                <div className="border-l-4 border-blue-400 pl-4">
                  <h5 className="font-semibold text-blue-600">⚖️ 간이과세 선택</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">연매출 4,800만원 이하시 간이과세 고려</p>
                  <div className="text-xs text-blue-500 mt-1">
                    • 업종별 부가가치율 적용으로 세부담 경감
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <div className="text-center mb-4">
                <div className="bg-orange-100 dark:bg-orange-900 p-3 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-3">
                  <span className="text-2xl">🏠</span>
                </div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white">양도소득세 절세</h4>
              </div>
              <div className="space-y-3">
                <div className="border-l-4 border-orange-400 pl-4">
                  <h5 className="font-semibold text-orange-600">🏡 1세대1주택 비과세</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">2년 이상 보유·거주시 양도소득세 비과세</p>
                  <div className="text-xs text-orange-500 mt-1">
                    • 조정대상지역은 보유·거주 기간 연장
                  </div>
                </div>
                <div className="border-l-4 border-orange-400 pl-4">
                  <h5 className="font-semibold text-orange-600">📅 장기보유특별공제</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">3년 이상 보유시 연 10%씩 공제 (최대 30%)</p>
                  <div className="text-xs text-orange-500 mt-1">
                    • 거주주택은 더 높은 공제율 적용
                  </div>
                </div>
                <div className="border-l-4 border-orange-400 pl-4">
                  <h5 className="font-semibold text-orange-600">💰 분할납부 활용</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">세액 2천만원 초과시 3년간 분할납부 가능</p>
                  <div className="text-xs text-orange-500 mt-1">
                    • 자금 부담 완화 및 이자비용 고려
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg">
            <h5 className="font-semibold text-red-900 dark:text-red-200 mb-3">⚠️ 절세의 황금법칙</h5>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <h6 className="font-bold text-red-600 mb-2">합법성 우선</h6>
                <p className="text-red-800 dark:text-red-300">세법에 따른 정당한 절세만 추진</p>
                <div className="text-xs text-red-600 mt-1">💡 탈세와 절세는 완전히 다름</div>
              </div>
              <div>
                <h6 className="font-bold text-red-600 mb-2">증빙서류 보관</h6>
                <p className="text-red-800 dark:text-red-300">모든 공제 관련 서류 5년간 보관</p>
                <div className="text-xs text-red-600 mt-1">💡 세무조사 대비 필수</div>
              </div>
              <div>
                <h6 className="font-bold text-red-600 mb-2">전문가 상담</h6>
                <p className="text-red-800 dark:text-red-300">복잡한 사안은 세무사 상담 필수</p>
                <div className="text-xs text-red-600 mt-1">💡 정확한 판단으로 위험 방지</div>
              </div>
            </div>
          </div>
        </div>

        {/* 세무 달력 및 신고 일정 */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-2xl p-8">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">📅 세무 달력 및 신고 일정</h3>
          <div className="grid lg:grid-cols-2 gap-8">
            <div>
              <h4 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-4 flex items-center">
                <span className="bg-indigo-100 dark:bg-indigo-900 p-2 rounded-full mr-2">📋</span>
                연간 세무 일정표
              </h4>
              <div className="space-y-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <h5 className="font-semibold text-indigo-600 mb-2">1~2월: 연말정산</h5>
                  <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <p>• 근로소득 연말정산 신고</p>
                    <p>• 소득공제·세액공제 서류 제출</p>
                    <p>• 환급세액 수령 또는 추가납부</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <h5 className="font-semibold text-indigo-600 mb-2">3~5월: 종합소득세</h5>
                  <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <p>• 사업소득·기타소득 신고</p>
                    <p>• 종합소득세 신고 및 납부</p>
                    <p>• 예정신고 납부세액 정산</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <h5 className="font-semibold text-indigo-600 mb-2">6~7월: 부가세 신고</h5>
                  <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <p>• 1기 부가가치세 확정신고</p>
                    <p>• 세금계산서 합계표 제출</p>
                    <p>• 2기 부가세 예정신고</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <h5 className="font-semibold text-indigo-600 mb-2">9~11월: 종소세 예정</h5>
                  <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <p>• 종합소득세 예정신고</p>
                    <p>• 사업소득 중간예납</p>
                    <p>• 양도소득세 신고 (발생시)</p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-purple-600 dark:text-purple-400 mb-4 flex items-center">
                <span className="bg-purple-100 dark:bg-purple-900 p-2 rounded-full mr-2">💡</span>
                세무신고 성공 팁
              </h4>
              <div className="space-y-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <h5 className="font-semibold text-purple-600 mb-2">📱 전자신고 활용</h5>
                  <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <p>• 홈택스, 손택스 앱 적극 활용</p>
                    <p>• 자동계산 기능으로 오류 방지</p>
                    <p>• 전자신고시 세액공제 혜택</p>
                    <p>• 24시간 언제든 신고 가능</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <h5 className="font-semibold text-purple-600 mb-2">📊 사전 준비사항</h5>
                  <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <p>• 소득금액증명원 등 서류 미리 발급</p>
                    <p>• 공제 관련 영수증 정리</p>
                    <p>• 금융계좌 잔액 충분히 확보</p>
                    <p>• 신고기한 여유를 두고 준비</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <h5 className="font-semibold text-purple-600 mb-2">⚡ 신고 후 주의사항</h5>
                  <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <p>• 신고서 및 첨부서류 5년간 보관</p>
                    <p>• 수정신고 가능 기간 확인</p>
                    <p>• 환급금 입금계좌 정확성 확인</p>
                    <p>• 세무조사 대비 서류 정리</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const TaxCalculator = () => {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div></div>}>
      <TaxCalculatorContent />
    </Suspense>
  );
};

export default TaxCalculator;