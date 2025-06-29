'use client'

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DollarSign, TrendingUp, Calculator, Share2, Check, Table, Save } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCalculationHistory } from '@/hooks/useCalculationHistory';
import CalculationHistory from '@/components/CalculationHistory';

const SalaryCalculatorContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('salary');
  const tc = useTranslations('common');
  const [salary, setSalary] = useState('');
  const [salaryType, setSalaryType] = useState<'annual' | 'monthly'>('annual');
  const [nonTaxableAmount, setNonTaxableAmount] = useState('0');
  const [dependents, setDependents] = useState('1');
  const [childrenUnder20, setChildrenUnder20] = useState('0');
  const [result, setResult] = useState<ReturnType<typeof calculateNetSalary>>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [showSaveButton, setShowSaveButton] = useState(false);

  // 계산 이력 관리
  const {
    histories,
    isLoading: historyLoading,
    saveCalculation,
    removeHistory,
    clearHistories,
    loadFromHistory
  } = useCalculationHistory('salary');

  // 2025년 기준 정확한 실수령액 계산 함수
  const calculateNetSalary = (inputSalary: string, type: 'annual' | 'monthly', nonTaxable: string, dependentCount: string, childrenCount: string) => {
    const salaryNum = parseInt(inputSalary.replace(/,/g, ''));
    const nonTaxableNum = parseInt(nonTaxable.replace(/,/g, '')) || 0;
    const dependentNum = parseInt(dependentCount) || 1;
    const childrenNum = parseInt(childrenCount) || 0;
    
    if (!salaryNum || salaryNum <= 0) return null;

    // 연봉으로 변환
    const grossAnnual = type === 'monthly' ? salaryNum * 12 : salaryNum;
    
    // 과세대상소득 = 총급여 - 비과세소득
    const taxableAnnual = grossAnnual - nonTaxableNum;

    // 4대보험료 계산 (2025년 기준)
    // 건강보험료: 과세대상소득 기준, 상한액 없음
    const healthInsurance = Math.floor(taxableAnnual * 0.03545); // 건강보험 3.545%
    const longTermCare = Math.floor(healthInsurance * 0.1227); // 장기요양보험 12.27% (건강보험료의 12.27%)
    
    // 국민연금: 과세대상소득 기준, 상한 671만원/월 (8052만원/년)
    const pensionBase = Math.min(taxableAnnual, 80520000); // 2025년 국민연금 상한선
    const nationalPension = Math.floor(pensionBase * 0.045); // 국민연금 4.5%
    
    // 고용보험: 과세대상소득 기준, 상한 없음
    const employmentInsurance = Math.floor(taxableAnnual * 0.009); // 고용보험 0.9%

    // 소득공제 계산
    // 1. 근로소득공제 (총급여액 기준)
    let workIncomeDeduction = 0;
    if (grossAnnual <= 5000000) {
      workIncomeDeduction = grossAnnual * 0.7;
    } else if (grossAnnual <= 15000000) {
      workIncomeDeduction = 3500000 + (grossAnnual - 5000000) * 0.4;
    } else if (grossAnnual <= 45000000) {
      workIncomeDeduction = 7500000 + (grossAnnual - 15000000) * 0.15;
    } else if (grossAnnual <= 100000000) {
      workIncomeDeduction = 12000000 + (grossAnnual - 45000000) * 0.05;
    } else {
      workIncomeDeduction = 14750000 + (grossAnnual - 100000000) * 0.02;
    }
    workIncomeDeduction = Math.min(workIncomeDeduction, 20000000); // 상한 2천만원

    // 2. 인적공제
    const basicDeduction = 1500000; // 기본공제 150만원
    const dependentDeduction = (dependentNum - 1) * 1500000; // 부양가족공제 (본인 제외)
    const childDeduction = childrenNum * 1500000; // 20세 이하 자녀 추가공제
    const totalPersonalDeduction = basicDeduction + dependentDeduction + childDeduction;

    // 근로소득금액 = 총급여 - 근로소득공제
    const workIncome = grossAnnual - workIncomeDeduction;
    
    // 과세표준 = 근로소득금액 - 인적공제 - 국민연금보험료
    const taxableIncome = Math.max(0, workIncome - totalPersonalDeduction - nationalPension);
    
    // 소득세 계산 (2025년 누진세율)
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
    } else if (taxableIncome <= 1000000000) {
      incomeTax = 174060000 + (taxableIncome - 500000000) * 0.42;
    } else {
      incomeTax = 384060000 + (taxableIncome - 1000000000) * 0.45;
    }

    // 근로소득세액공제 적용
    let workIncomeTaxCredit = 0;
    if (incomeTax <= 1300000) {
      workIncomeTaxCredit = Math.min(incomeTax * 0.55, 740000);
    } else {
      workIncomeTaxCredit = Math.max(740000 - (incomeTax - 1300000) * 0.05, 660000);
    }

    // 자녀세액공제 (20세 이하)
    let childTaxCredit = 0;
    if (childrenNum >= 1) {
      childTaxCredit = childrenNum * 150000;
      // 셋째 자녀부터 추가 공제
      if (childrenNum >= 3) {
        childTaxCredit += (childrenNum - 2) * 150000;
      }
    }

    const totalTaxCredit = workIncomeTaxCredit + childTaxCredit;
    incomeTax = Math.floor(Math.max(0, incomeTax - totalTaxCredit));
    const localIncomeTax = Math.floor(incomeTax * 0.1); // 지방소득세 10%

    const totalDeductions = healthInsurance + longTermCare + nationalPension + employmentInsurance + incomeTax + localIncomeTax;
    const netAnnual = grossAnnual - totalDeductions;
    const netMonthly = Math.floor(netAnnual / 12);

    return {
      gross: grossAnnual,
      taxable: taxableAnnual,
      workIncome,
      workIncomeDeduction,
      netAnnual,
      netMonthly,
      deductions: {
        healthInsurance,
        longTermCare,
        nationalPension,
        employmentInsurance,
        incomeTax,
        localIncomeTax,
        total: totalDeductions
      },
      taxInfo: {
        taxableIncome,
        personalDeduction: totalPersonalDeduction,
        taxCredit: totalTaxCredit,
        effectiveTaxRate: grossAnnual > 0 ? ((incomeTax + localIncomeTax) / grossAnnual * 100) : 0
      }
    };
  };

  const handleCalculate = React.useCallback(() => {
    const calculation = calculateNetSalary(salary, salaryType, nonTaxableAmount, dependents, childrenUnder20);
    setResult(calculation);
    setShowSaveButton(!!calculation); // 계산 결과가 있으면 저장 버튼 표시
  }, [salary, salaryType, nonTaxableAmount, dependents, childrenUnder20]);

  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const handleShare = async () => {
    try {
      const currentUrl = window.location.href;
      await navigator.clipboard.writeText(currentUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  const handleSalaryInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/,/g, '');
    if (/^\d*$/.test(value)) {
      const formattedValue = formatNumber(Number(value));
      setSalary(formattedValue);
      updateURL({ salary: value });
    }
  };

  const handleNonTaxableChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/,/g, '');
    if (/^\d*$/.test(value)) {
      const formattedValue = formatNumber(Number(value));
      setNonTaxableAmount(formattedValue);
      updateURL({ nonTaxable: value });
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

  // 계산 결과 저장
  const handleSaveCalculation = () => {
    if (!result) return;

    const inputs = {
      salary,
      salaryType,
      nonTaxableAmount,
      dependents,
      childrenUnder20
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
      setSalary(inputs.salary || '');
      setSalaryType(inputs.salaryType || 'annual');
      setNonTaxableAmount(inputs.nonTaxableAmount || '0');
      setDependents(inputs.dependents || '1');
      setChildrenUnder20(inputs.childrenUnder20 || '0');
      
      // URL도 업데이트
      updateURL({
        salary: inputs.salary?.replace(/,/g, '') || '',
        type: inputs.salaryType || 'annual',
        nonTaxable: inputs.nonTaxableAmount?.replace(/,/g, '') || '0',
        dependents: inputs.dependents || '1',
        children: inputs.childrenUnder20 || '0'
      });
    }
  };

  // 이력 결과 포맷팅
  const formatHistoryResult = (result: any) => {
    if (!result) return '';
    return t('history.format', { monthly: formatNumber(result.netMonthly), annual: formatNumber(result.netAnnual) });
  };

  // URL에서 초기값 로드
  useEffect(() => {
    const salaryParam = searchParams.get('salary');
    const typeParam = searchParams.get('type');
    const nonTaxableParam = searchParams.get('nonTaxable');
    const dependentsParam = searchParams.get('dependents');
    const childrenParam = searchParams.get('children');

    if (salaryParam && /^\d+$/.test(salaryParam)) {
      setSalary(formatNumber(Number(salaryParam)));
    }
    if (typeParam && ['annual', 'monthly'].includes(typeParam)) {
      setSalaryType(typeParam as 'annual' | 'monthly');
    }
    if (nonTaxableParam && /^\d+$/.test(nonTaxableParam)) {
      setNonTaxableAmount(formatNumber(Number(nonTaxableParam)));
    }
    if (dependentsParam && /^\d+$/.test(dependentsParam)) {
      setDependents(dependentsParam);
    }
    if (childrenParam && /^\d+$/.test(childrenParam)) {
      setChildrenUnder20(childrenParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (salary) {
      handleCalculate();
    } else {
      setResult(null);
    }
  }, [salary, salaryType, nonTaxableAmount, dependents, childrenUnder20, handleCalculate]);

  // 연봉별 표 데이터 생성
  const generateSalaryTable = () => {
    const tableData = [];
    for (let salaryAmount = 20000000; salaryAmount <= 200000000; salaryAmount += 1000000) {
      const calculation = calculateNetSalary(salaryAmount.toString(), 'annual', '0', '1', '0');
      if (calculation) {
        tableData.push({
          grossAnnual: salaryAmount,
          netAnnual: calculation.netAnnual,
          netMonthly: calculation.netMonthly,
          totalDeductions: calculation.deductions.total
        });
      }
    }
    return tableData;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
          <DollarSign className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">{t('title')}</h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-6">
          {t('description')}
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

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">{t('input.salaryType')}</h2>
          
          <div className="space-y-6">
            {/* 급여 유형 선택 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {t('input.salaryType')}
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={salaryType === 'annual'}
                    onChange={() => {
                      setSalaryType('annual');
                      updateURL({ type: 'annual' });
                    }}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span className="ml-2 text-sm text-gray-900 dark:text-gray-300">{t('input.annual')}</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={salaryType === 'monthly'}
                    onChange={() => {
                      setSalaryType('monthly');
                      updateURL({ type: 'monthly' });
                    }}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span className="ml-2 text-sm text-gray-900 dark:text-gray-300">{t('input.monthly')}</span>
                </label>
              </div>
            </div>

            {/* 급여 입력 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {salaryType === 'annual' ? `${t('input.annual')} (세전)` : `${t('input.monthly')} (세전)`}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={salary}
                  onChange={handleSalaryInputChange}
                  placeholder={salaryType === 'annual' ? t('input.salaryPlaceholderAnnual') : t('input.salaryPlaceholderMonthly')}
                  className="w-full px-4 py-4 text-lg font-semibold text-gray-900 dark:text-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
                <span className="absolute right-4 top-4 text-gray-600 font-medium">{t('input.currency')}</span>
              </div>
            </div>

            {/* 비과세액 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('input.nonTaxable')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={nonTaxableAmount}
                  onChange={handleNonTaxableChange}
                  placeholder={t('input.nonTaxablePlaceholder')}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                />
                <span className="absolute right-3 top-3 text-gray-500 dark:text-gray-400">{t('input.currency')}</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('input.nonTaxableDesc')}
              </p>
            </div>

            {/* 부양가족 정보 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('input.dependents')}
                </label>
                <select
                  value={dependents}
                  onChange={(e) => {
                    setDependents(e.target.value);
                    updateURL({ dependents: e.target.value });
                  }}
                  className="w-full px-3 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                >
                  {[1,2,3,4,5,6,7,8,9,10].map(num => (
                    <option key={num} value={num}>{num}명</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('input.children')}
                </label>
                <select
                  value={childrenUnder20}
                  onChange={(e) => {
                    setChildrenUnder20(e.target.value);
                    updateURL({ children: e.target.value });
                  }}
                  className="w-full px-3 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                >
                  {[0,1,2,3,4,5].map(num => (
                    <option key={num} value={num}>{num}명</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 dark:text-blue-200 mb-2">💡 {t('calculation.basis')}</h3>
              <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                {Array.from({ length: 6 }, (_, index) => (
                  <li key={index}>• {t(`calculation.points.${index}`)}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Result Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">{tc('result')}</h2>
          
          {result ? (
            <div className="space-y-6">
              {/* Main Results */}
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-blue-100">{t('result.monthlyTakeHome')}</span>
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div className="text-3xl font-bold mb-2 text-white">
                  {formatNumber(result.netMonthly)}원
                </div>
                <div className="text-blue-100 text-lg font-medium">
                  {t('result.annualTakeHome')} {formatNumber(result.netAnnual)}{t('input.currency')}
                </div>
                <div className="text-blue-100 text-sm mt-2">
                  {t('result.effectiveTaxRate')}: {result.taxInfo?.effectiveTaxRate.toFixed(1)}%
                </div>
                <div className="flex space-x-2 mt-4">
                  <button
                    onClick={handleShare}
                    className="inline-flex items-center space-x-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-white transition-colors"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>{tc('copied')}</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4" />
                        <span>{t('result.shareResult')}</span>
                      </>
                    )}
                  </button>
                  
                  {showSaveButton && (
                    <button
                      onClick={handleSaveCalculation}
                      className="inline-flex items-center space-x-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-white transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      <span>{tc('save')}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Tax Information */}
              {result.taxInfo && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white">{t('result.taxInfo')}</h3>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">{t('result.grossSalary')}</span>
                      <span className="font-medium text-gray-900 dark:text-white">{formatNumber(result.gross)}{t('input.currency')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">{t('result.taxableIncome')}</span>
                      <span className="font-medium text-gray-900 dark:text-white">{formatNumber(result.taxable)}{t('input.currency')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">{t('result.workIncomeDeduction')}</span>
                      <span className="font-medium text-green-600 dark:text-green-400">-{formatNumber(result.workIncomeDeduction)}{t('input.currency')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">{t('result.workIncome')}</span>
                      <span className="font-medium text-gray-900 dark:text-white">{formatNumber(result.workIncome)}{t('input.currency')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">{t('result.personalDeduction')} ({dependents}명 + 자녀 {childrenUnder20}명)</span>
                      <span className="font-medium text-green-600 dark:text-green-400">-{formatNumber(result.taxInfo.personalDeduction)}{t('input.currency')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">{t('result.pensionDeduction')}</span>
                      <span className="font-medium text-green-600 dark:text-green-400">-{formatNumber(result.deductions.nationalPension)}{t('input.currency')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">{t('result.taxableStandard')}</span>
                      <span className="font-medium text-gray-900 dark:text-white">{formatNumber(result.taxInfo.taxableIncome)}{t('input.currency')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">{t('result.taxCredit')}</span>
                      <span className="font-medium text-green-600 dark:text-green-400">-{formatNumber(result.taxInfo.taxCredit)}{t('input.currency')}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Deduction Breakdown */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">{t('result.deductionBreakdown')}</h3>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">{t('result.nationalPension')} (4.5%)</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatNumber(result.deductions.nationalPension)}{t('input.currency')}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">{t('result.healthInsurance')} (3.545%)</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatNumber(result.deductions.healthInsurance)}{t('input.currency')}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">{t('result.longTermCare')} (12.27%)</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatNumber(result.deductions.longTermCare)}{t('input.currency')}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">{t('result.employmentInsurance')} (0.9%)</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatNumber(result.deductions.employmentInsurance)}{t('input.currency')}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">{t('result.incomeTax')}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatNumber(result.deductions.incomeTax)}{t('input.currency')}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">{t('result.localIncomeTax')} (10%)</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatNumber(result.deductions.localIncomeTax)}{t('input.currency')}</span>
                  </div>
                  <div className="flex justify-between py-3 border-t-2 border-gray-200 dark:border-gray-600 font-bold">
                    <span className="text-gray-900 dark:text-white">{t('result.totalDeduction')}</span>
                    <span className="text-red-600 dark:text-red-400 font-bold">{formatNumber(result.deductions.total)}{t('input.currency')}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-gray-500">
              <Calculator className="w-16 h-16 mb-4" />
              <p>{t('placeholder')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Tips Section */}
      <div className="mt-12 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
        <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">💡 {t('tips.title')}</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-6">
            <h3 className="font-semibold text-green-900 dark:text-green-200 mb-2">{t('tips.yearEndTax.title')}</h3>
            <p className="text-green-800 dark:text-green-300 text-sm">
              {t('tips.yearEndTax.content')}
            </p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/30 rounded-lg p-6">
            <h3 className="font-semibold text-amber-900 dark:text-amber-200 mb-2">{t('tips.taxSaving.title')}</h3>
            <p className="text-amber-800 dark:text-amber-300 text-sm">
              {t('tips.taxSaving.content')}
            </p>
          </div>
        </div>
      </div>

      {/* 연봉별 실수령액 표 섹션 */}
      <div className="mt-12 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">{t('table.title')}</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">{t('table.description')}</p>
          </div>
          <button
            onClick={() => setShowTable(!showTable)}
            className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white transition-colors"
          >
            <Table className="w-4 h-4" />
            <span>{showTable ? t('table.hideTable') : t('table.showTable')}</span>
          </button>
        </div>

        {showTable && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">{t('table.headers.salary')}</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">{t('table.headers.annualTakeHome')}</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">{t('table.headers.monthlyTakeHome')}</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">{t('table.headers.totalDeduction')}</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">{t('table.headers.takeHomeRatio')}</th>
                </tr>
              </thead>
              <tbody>
                {generateSalaryTable().map((row, index) => (
                  <tr key={row.grossAnnual} className={`border-b border-gray-100 dark:border-gray-700 ${index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-900'} hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors`}>
                    <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">
                      {formatNumber(row.grossAnnual)}{t('input.currency')}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-900 dark:text-white">
                      {formatNumber(row.netAnnual)}{t('input.currency')}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-blue-600 dark:text-blue-400">
                      {formatNumber(row.netMonthly)}{t('input.currency')}
                    </td>
                    <td className="py-3 px-4 text-right text-red-600 dark:text-red-400">
                      {formatNumber(row.totalDeductions)}{t('input.currency')}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-gray-900 dark:text-white">
                      {((row.netAnnual / row.grossAnnual) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showTable && (
          <div className="mt-6 bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
              <Calculator className="w-4 h-4 inline mr-1" />
              {t('table.usage.title')}
            </h3>
            <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
              {Array.from({ length: 4 }, (_, index) => (
                <li key={index}>• {t(`table.usage.points.${index}`)}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 상세 가이드 섹션 */}
      <div className="mt-12 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <h2 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white text-center">🚀 {t('guide.title')}</h2>
        <p className="text-lg text-gray-600 dark:text-gray-300 text-center mb-12 max-w-4xl mx-auto break-keep whitespace-pre-line">
          {t('guide.subtitle')}
        </p>
        
        {/* 핵심 기능 소개 */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-8 transform hover:scale-105 transition-transform">
            <div className="flex items-center mb-4">
              <div className="bg-blue-600 p-3 rounded-full mr-3">
                <Calculator className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-blue-900 dark:text-blue-200">💎 {t('guide.features.accurate.title')}</h3>
            </div>
            <p className="text-blue-800 dark:text-blue-300 mb-4 leading-relaxed">
              {t('guide.features.accurate.description')}
            </p>
            <div className="space-y-3">
              <div className="bg-blue-100 dark:bg-blue-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">📋 {t('guide.features.accurate.points.0.title')}</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">{t('guide.features.accurate.points.0.content')}</p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">💰 {t('guide.features.accurate.points.1.title')}</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">{t('guide.features.accurate.points.1.content')}</p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">🏷️ {t('guide.features.accurate.points.2.title')}</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">{t('guide.features.accurate.points.2.content')}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-xl p-8 transform hover:scale-105 transition-transform">
            <div className="flex items-center mb-4">
              <div className="bg-green-600 p-3 rounded-full mr-3">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-green-900 dark:text-green-200">📊 {t('guide.features.smart.title')}</h3>
            </div>
            <p className="text-green-800 dark:text-green-300 mb-4 leading-relaxed">
              {t('guide.features.smart.description')}
            </p>
            <div className="space-y-3">
              {[0, 1, 2].map((index) => {
                const icons = ['📊', '💡', '📋'];
                return (
                  <div key={index} className="bg-green-100 dark:bg-green-800/50 p-3 rounded-lg">
                    <h4 className="font-semibold text-green-900 dark:text-green-200 mb-1 flex items-center">
                      <span className="mr-2">{icons[index]}</span>
                      {t(`guide.features.smart.points.${index}.title`)}
                    </h4>
                    <p className="text-sm text-green-700 dark:text-green-300">{t(`guide.features.smart.points.${index}.content`)}</p>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl p-8 transform hover:scale-105 transition-transform">
            <div className="flex items-center mb-4">
              <div className="bg-purple-600 p-3 rounded-full mr-3">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-purple-900 dark:text-purple-200">⚡ {t('guide.features.practical.title')}</h3>
            </div>
            <p className="text-purple-800 dark:text-purple-300 mb-4 leading-relaxed">
              {t('guide.features.practical.description')}
            </p>
            <div className="space-y-3">
              {[0, 1, 2].map((index) => {
                const icons = ['📱', '🔗', '💻'];
                return (
                  <div key={index} className="bg-purple-100 dark:bg-purple-800/50 p-3 rounded-lg">
                    <h4 className="font-semibold text-purple-900 dark:text-purple-200 mb-1 flex items-center">
                      <span className="mr-2">{icons[index]}</span>
                      {t(`guide.features.practical.points.${index}.title`)}
                    </h4>
                    <p className="text-sm text-purple-700 dark:text-purple-300">{t(`guide.features.practical.points.${index}.content`)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 4대보험 완전정복 */}
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/30 dark:to-blue-900/30 rounded-2xl p-8 mb-12">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">{t('insurance.title')}</h3>
          <p className="text-center text-gray-600 dark:text-gray-300 mb-8">{t('insurance.description')}</p>
          
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <h4 className="text-xl font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center">
                <span className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full mr-3">🏥</span>
                {t('insurance.health.title')}
              </h4>
              <div className="space-y-4">
                <div className="border-l-4 border-blue-400 pl-4">
                  <h5 className="font-semibold text-blue-600">💊 {t('insurance.health.healthInsurance.title')}</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{t('insurance.health.healthInsurance.description')}</p>
                  <div className="mt-2 text-xs text-blue-500 space-y-1">
                    {[0, 1, 2].map((index) => (
                      <p key={index}>• {t(`insurance.health.healthInsurance.details.${index}`)}</p>
                    ))}
                  </div>
                </div>
                <div className="border-l-4 border-green-400 pl-4">
                  <h5 className="font-semibold text-green-600">🏠 {t('insurance.health.longTermCare.title')}</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{t('insurance.health.longTermCare.description')}</p>
                  <div className="mt-2 text-xs text-green-500 space-y-1">
                    {[0, 1, 2].map((index) => (
                      <p key={index}>• {t(`insurance.health.longTermCare.details.${index}`)}</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <h4 className="text-xl font-semibold text-purple-600 dark:text-purple-400 mb-4 flex items-center">
                <span className="bg-purple-100 dark:bg-purple-900 p-2 rounded-full mr-3">👴</span>
                {t('insurance.pension.title')}
              </h4>
              <div className="space-y-4">
                <div className="border-l-4 border-purple-400 pl-4">
                  <h5 className="font-semibold text-purple-600">💰 {t('insurance.pension.nationalPension.title')}</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{t('insurance.pension.nationalPension.description')}</p>
                  <div className="mt-2 text-xs text-purple-500 space-y-1">
                    {[0, 1, 2].map((index) => (
                      <p key={index}>• {t(`insurance.pension.nationalPension.details.${index}`)}</p>
                    ))}
                  </div>
                </div>
                <div className="border-l-4 border-orange-400 pl-4">
                  <h5 className="font-semibold text-orange-600">🏢 {t('insurance.pension.employment.title')}</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{t('insurance.pension.employment.description')}</p>
                  <div className="mt-2 text-xs text-orange-500 space-y-1">
                    {[0, 1, 2].map((index) => (
                      <p key={index}>• {t(`insurance.pension.employment.details.${index}`)}</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 소득세 누진세율 상세 설명 */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 rounded-2xl p-8 mb-12">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">{t('taxBracket.title')}</h3>
          <p className="text-center text-gray-600 dark:text-gray-300 mb-8">{t('taxBracket.description')}</p>
          
          <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">{t('taxBracket.headers.bracket')}</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 dark:text-white">{t('taxBracket.headers.rate')}</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 dark:text-white">{t('taxBracket.headers.deduction')}</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">{t('taxBracket.headers.salaryRange')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">1,400만원 이하</td>
                  <td className="px-6 py-4 text-center text-sm font-bold text-green-600">6%</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-500">-</td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">~3,000만원</td>
                </tr>
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">1,400~5,000만원</td>
                  <td className="px-6 py-4 text-center text-sm font-bold text-blue-600">15%</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-500">126만원</td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">3,000~7,000만원</td>
                </tr>
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">5,000~8,800만원</td>
                  <td className="px-6 py-4 text-center text-sm font-bold text-purple-600">24%</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-500">576만원</td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">7,000~1억원</td>
                </tr>
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">8,800만원~1.5억원</td>
                  <td className="px-6 py-4 text-center text-sm font-bold text-orange-600">35%</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-500">1,544만원</td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">1억~2억원</td>
                </tr>
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">1.5억~3억원</td>
                  <td className="px-6 py-4 text-center text-sm font-bold text-red-600">38%</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-500">1,994만원</td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">2억~4억원</td>
                </tr>
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">3억원 초과</td>
                  <td className="px-6 py-4 text-center text-sm font-bold text-red-700">40%+</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-500">다양</td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">4억원 이상</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
            <h5 className="font-semibold text-amber-900 dark:text-amber-200 mb-2">💡 {t('taxBracket.understanding.title')}</h5>
            <div className="mb-3 p-3 bg-amber-100 dark:bg-amber-800/50 rounded-lg">
              <h6 className="font-semibold text-amber-900 dark:text-amber-200 mb-1">{t('taxBracket.understanding.keyPoint.title')}</h6>
              <p className="text-sm text-amber-800 dark:text-amber-300">{t('taxBracket.understanding.keyPoint.description')}</p>
            </div>
            <div className="bg-amber-100 dark:bg-amber-800/50 rounded-lg p-3">
              <h6 className="font-semibold text-amber-900 dark:text-amber-200 mb-2">{t('taxBracket.understanding.example.title')}</h6>
              <div className="text-sm text-amber-800 dark:text-amber-300 space-y-1">
                {[0, 1, 2, 3].map((index) => (
                  <p key={index}>• {t(`taxBracket.understanding.example.details.${index}`)}</p>
                ))}
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-2 italic">{t('taxBracket.understanding.note')}</p>
            </div>
          </div>
        </div>

        {/* 절세 전략 가이드 */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-2xl p-8 mb-12">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">💰 {t('taxStrategy.title')}</h3>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <div className="text-center mb-4">
                <div className="bg-green-100 dark:bg-green-900 p-3 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-3">
                  <span className="text-2xl">💼</span>
                </div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white">{t('taxStrategy.incomeDeduction.title')}</h4>
              </div>
              <div className="space-y-3">
                <div className="border-l-4 border-green-400 pl-4">
                  <h5 className="font-semibold text-green-600">📱 {t('taxStrategy.incomeDeduction.creditCard.title')}</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{t('taxStrategy.incomeDeduction.creditCard.description')}</p>
                </div>
                <div className="border-l-4 border-green-400 pl-4">
                  <h5 className="font-semibold text-green-600">🏠 {t('taxStrategy.incomeDeduction.housing.title')}</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{t('taxStrategy.incomeDeduction.housing.description')}</p>
                </div>
                <div className="border-l-4 border-green-400 pl-4">
                  <h5 className="font-semibold text-green-600">👶 {t('taxStrategy.incomeDeduction.childcare.title')}</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{t('taxStrategy.incomeDeduction.childcare.description')}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <div className="text-center mb-4">
                <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-3">
                  <span className="text-2xl">💊</span>
                </div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white">{t('taxStrategy.taxCredit.title')}</h4>
              </div>
              <div className="space-y-3">
                <div className="border-l-4 border-blue-400 pl-4">
                  <h5 className="font-semibold text-blue-600">🏥 {t('taxStrategy.taxCredit.medical.title')}</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{t('taxStrategy.taxCredit.medical.description')}</p>
                </div>
                <div className="border-l-4 border-blue-400 pl-4">
                  <h5 className="font-semibold text-blue-600">📚 {t('taxStrategy.taxCredit.education.title')}</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{t('taxStrategy.taxCredit.education.description')}</p>
                </div>
                <div className="border-l-4 border-blue-400 pl-4">
                  <h5 className="font-semibold text-blue-600">💝 {t('taxStrategy.taxCredit.donation.title')}</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{t('taxStrategy.taxCredit.donation.description')}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <div className="text-center mb-4">
                <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-3">
                  <span className="text-2xl">🏦</span>
                </div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white">{t('taxStrategy.pension.title')}</h4>
              </div>
              <div className="space-y-3">
                <div className="border-l-4 border-purple-400 pl-4">
                  <h5 className="font-semibold text-purple-600">💰 {t('taxStrategy.pension.pensionFund.title')}</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{t('taxStrategy.pension.pensionFund.description')}</p>
                </div>
                <div className="border-l-4 border-purple-400 pl-4">
                  <h5 className="font-semibold text-purple-600">🏢 {t('taxStrategy.pension.irp.title')}</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{t('taxStrategy.pension.irp.description')}</p>
                </div>
                <div className="border-l-4 border-purple-400 pl-4">
                  <h5 className="font-semibold text-purple-600">📈 {t('taxStrategy.pension.isa.title')}</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{t('taxStrategy.pension.isa.description')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 연말정산 준비 가이드 */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-2xl p-8">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">📋 {t('yearEndTax.title')}</h3>
          <div className="grid lg:grid-cols-2 gap-8">
            <div>
              <h4 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-4 flex items-center">
                <span className="bg-indigo-100 dark:bg-indigo-900 p-2 rounded-full mr-2">📅</span>
                {t('yearEndTax.schedule.title')}
              </h4>
              <div className="space-y-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <h5 className="font-semibold text-indigo-600 mb-2">🗓️ {t('yearEndTax.schedule.timeline.title')}</h5>
                  <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    {[0, 1, 2, 3].map((index) => (
                      <p key={index}>• {t(`yearEndTax.schedule.timeline.details.${index}`)}</p>
                    ))}
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <h5 className="font-semibold text-indigo-600 mb-2">📄 {t('yearEndTax.schedule.documents.title')}</h5>
                  <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    {[0, 1, 2, 3].map((index) => (
                      <p key={index}>• {t(`yearEndTax.schedule.documents.details.${index}`)}</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-purple-600 dark:text-purple-400 mb-4 flex items-center">
                <span className="bg-purple-100 dark:bg-purple-900 p-2 rounded-full mr-2">💡</span>
                {t('yearEndTax.tips.title')}
              </h4>
              <div className="space-y-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <h5 className="font-semibold text-purple-600 mb-2">✅ {t('yearEndTax.tips.receiptManagement.title')}</h5>
                  <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    {[0, 1, 2, 3].map((index) => (
                      <p key={index}>• {t(`yearEndTax.tips.receiptManagement.details.${index}`)}</p>
                    ))}
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <h5 className="font-semibold text-purple-600 mb-2">⚡ {t('yearEndTax.tips.taxSavingProducts.title')}</h5>
                  <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    {[0, 1, 2, 3].map((index) => (
                      <p key={index}>• {t(`yearEndTax.tips.taxSavingProducts.details.${index}`)}</p>
                    ))}
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

const SalaryCalculator = () => {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div></div>}>
      <SalaryCalculatorContent />
    </Suspense>
  );
};

export default SalaryCalculator;