'use client'

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Receipt, Building2, TrendingUp, Calculator, Share2, Check, Save } from 'lucide-react';
import { useCalculationHistory } from '@/hooks/useCalculationHistory';
import CalculationHistory from '@/components/CalculationHistory';

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

  // 소득세 계산 (2024년 기준)
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
  const formatHistoryResult = (result: any) => {
    if (!result) return '';
    
    if (result.type === 'income') {
      return `실수령액 ${formatNumber(result.netAmount)}원 (세금 ${formatNumber(result.totalTax)}원)`;
    } else if (result.type === 'vat') {
      return `부가세 포함 ${formatNumber(result.netAmount + result.totalTax)}원 (부가세 ${formatNumber(result.totalTax)}원)`;
    } else if (result.type === 'capital-gains') {
      return `실수령액 ${formatNumber(result.netAmount)}원 (세금 ${formatNumber(result.totalTax)}원)`;
    }
    
    return `세금 ${formatNumber(result.totalTax)}원`;
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <Receipt className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">세금 계산기</h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-6">
          소득세, 부가가치세, 양도소득세를 정확하게 계산해보세요.
        </p>
        
        {/* 계산 이력 버튼 */}
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
                  <li>• 2024년 소득세법 기준</li>
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
                  <li>• 2024년 양도소득세법 기준</li>
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