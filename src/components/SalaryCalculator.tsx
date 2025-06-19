'use client'

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DollarSign, TrendingUp, Calculator, Share2, Check, Table, Save } from 'lucide-react';
import { useCalculationHistory } from '@/hooks/useCalculationHistory';
import CalculationHistory from '@/components/CalculationHistory';

const SalaryCalculatorContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
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
    return `월 ${formatNumber(result.netMonthly)}원 (연 ${formatNumber(result.netAnnual)}원)`;
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
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">연봉 실수령액 계산기</h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-6">
          연봉을 입력하시면 4대보험, 소득세, 지방소득세를 제외한 실제 받을 수 있는 금액을 계산해드립니다.
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
          <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">급여 정보 입력</h2>
          
          <div className="space-y-6">
            {/* 급여 유형 선택 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                급여 유형
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
                  <span className="ml-2 text-sm text-gray-900 dark:text-gray-300">연봉</span>
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
                  <span className="ml-2 text-sm text-gray-900 dark:text-gray-300">월급</span>
                </label>
              </div>
            </div>

            {/* 급여 입력 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {salaryType === 'annual' ? '연봉 (세전)' : '월급 (세전)'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={salary}
                  onChange={handleSalaryInputChange}
                  placeholder={salaryType === 'annual' ? "50,000,000" : "4,000,000"}
                  className="w-full px-4 py-4 text-lg font-semibold text-gray-900 dark:text-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
                <span className="absolute right-4 top-4 text-gray-600 font-medium">원</span>
              </div>
            </div>

            {/* 비과세액 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                비과세액 (연간)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={nonTaxableAmount}
                  onChange={handleNonTaxableChange}
                  placeholder="0"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                />
                <span className="absolute right-3 top-3 text-gray-500 dark:text-gray-400">원</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                식대, 교통비, 육아휴직급여 등
              </p>
            </div>

            {/* 부양가족 정보 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  부양가족수 (본인포함)
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
                  20세 이하 자녀수
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
              <h3 className="font-medium text-blue-900 dark:text-blue-200 mb-2">💡 계산 기준 (2025년)</h3>
              <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                <li>• 근로소득공제: 총급여에 따른 누진 공제 적용</li>
                <li>• 4대보험: 건강보험 3.545%, 국민연금 4.5% (상한 8,052만원), 고용보험 0.9%</li>
                <li>• 장기요양보험: 건강보험료의 12.27%</li>
                <li>• 소득세 누진세율: 6%~45% (7구간)</li>
                <li>• 근로소득세액공제 및 자녀세액공제 반영</li>
                <li>• 연말정산시 추가 공제로 환급 가능</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Result Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">계산 결과</h2>
          
          {result ? (
            <div className="space-y-6">
              {/* Main Results */}
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-blue-100">월 실수령액</span>
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div className="text-3xl font-bold mb-2 text-white">
                  {formatNumber(result.netMonthly)}원
                </div>
                <div className="text-blue-100 text-lg font-medium">
                  연 {formatNumber(result.netAnnual)}원
                </div>
                <div className="text-blue-100 text-sm mt-2">
                  실효세율: {result.taxInfo?.effectiveTaxRate.toFixed(1)}%
                </div>
                <div className="flex space-x-2 mt-4">
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

              {/* Tax Information */}
              {result.taxInfo && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white">세금 정보</h3>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">총 급여액</span>
                      <span className="font-medium text-gray-900 dark:text-white">{formatNumber(result.gross)}원</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">과세대상 소득</span>
                      <span className="font-medium text-gray-900 dark:text-white">{formatNumber(result.taxable)}원</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">근로소득공제</span>
                      <span className="font-medium text-green-600 dark:text-green-400">-{formatNumber(result.workIncomeDeduction)}원</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">근로소득금액</span>
                      <span className="font-medium text-gray-900 dark:text-white">{formatNumber(result.workIncome)}원</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">인적공제 ({dependents}명 + 자녀 {childrenUnder20}명)</span>
                      <span className="font-medium text-green-600 dark:text-green-400">-{formatNumber(result.taxInfo.personalDeduction)}원</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">국민연금 소득공제</span>
                      <span className="font-medium text-green-600 dark:text-green-400">-{formatNumber(result.deductions.nationalPension)}원</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">과세표준</span>
                      <span className="font-medium text-gray-900 dark:text-white">{formatNumber(result.taxInfo.taxableIncome)}원</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">세액공제</span>
                      <span className="font-medium text-green-600 dark:text-green-400">-{formatNumber(result.taxInfo.taxCredit)}원</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Deduction Breakdown */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">공제 내역</h3>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">국민연금 (4.5%)</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatNumber(result.deductions.nationalPension)}원</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">건강보험 (3.545%)</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatNumber(result.deductions.healthInsurance)}원</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">장기요양보험 (12.27%)</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatNumber(result.deductions.longTermCare)}원</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">고용보험 (0.9%)</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatNumber(result.deductions.employmentInsurance)}원</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">소득세</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatNumber(result.deductions.incomeTax)}원</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">지방소득세 (10%)</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatNumber(result.deductions.localIncomeTax)}원</span>
                  </div>
                  <div className="flex justify-between py-3 border-t-2 border-gray-200 dark:border-gray-600 font-bold">
                    <span className="text-gray-900 dark:text-white">총 공제액</span>
                    <span className="text-red-600 dark:text-red-400 font-bold">{formatNumber(result.deductions.total)}원</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-gray-500">
              <Calculator className="w-16 h-16 mb-4" />
              <p>연봉을 입력하시면 계산 결과가 나타납니다</p>
            </div>
          )}
        </div>
      </div>

      {/* Tips Section */}
      <div className="mt-12 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
        <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">💡 오늘의 팁</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-6">
            <h3 className="font-semibold text-green-900 dark:text-green-200 mb-2">연말정산 준비</h3>
            <p className="text-green-800 dark:text-green-300 text-sm">
              의료비, 교육비, 기부금 영수증을 미리 모아두시면 연말정산에서 더 많은 세액공제를 받을 수 있습니다.
            </p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/30 rounded-lg p-6">
            <h3 className="font-semibold text-amber-900 dark:text-amber-200 mb-2">절세 방법</h3>
            <p className="text-amber-800 dark:text-amber-300 text-sm">
              IRP, 연금저축 등의 세액공제 혜택을 활용하면 실수령액을 늘릴 수 있습니다.
            </p>
          </div>
        </div>
      </div>

      {/* 연봉별 실수령액 표 섹션 */}
      <div className="mt-12 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">연봉별 실수령액 표</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">2천만원부터 2억원까지 100만원 단위</p>
          </div>
          <button
            onClick={() => setShowTable(!showTable)}
            className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white transition-colors"
          >
            <Table className="w-4 h-4" />
            <span>{showTable ? '표 숨기기' : '표 보기'}</span>
          </button>
        </div>

        {showTable && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">연봉</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">실수령액(연)</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">실수령액(월)</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">총 공제액</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">실수령 비율</th>
                </tr>
              </thead>
              <tbody>
                {generateSalaryTable().map((row, index) => (
                  <tr key={row.grossAnnual} className={`border-b border-gray-100 dark:border-gray-700 ${index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-900'} hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors`}>
                    <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">
                      {formatNumber(row.grossAnnual)}원
                    </td>
                    <td className="py-3 px-4 text-right text-gray-900 dark:text-white">
                      {formatNumber(row.netAnnual)}원
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-blue-600 dark:text-blue-400">
                      {formatNumber(row.netMonthly)}원
                    </td>
                    <td className="py-3 px-4 text-right text-red-600 dark:text-red-400">
                      {formatNumber(row.totalDeductions)}원
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
              표 사용법
            </h3>
            <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
              <li>• 2천만원부터 2억원까지 100만원 단위로 계산됩니다</li>
              <li>• 실수령 비율이 높을수록 세금 부담이 적습니다</li>
              <li>• 고소득일수록 누진세율로 인해 실수령 비율이 감소합니다</li>
              <li>• 실제 연말정산시 추가 공제로 실수령액이 더 늘어날 수 있습니다</li>
            </ul>
          </div>
        )}
      </div>

      {/* 상세 가이드 섹션 */}
      <div className="mt-12 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <h2 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white text-center">🚀 연봉 계산 마스터 가이드</h2>
        <p className="text-lg text-gray-600 dark:text-gray-300 text-center mb-12 max-w-4xl mx-auto break-keep whitespace-pre-line">
          신입사원부터 임원까지! 연봉 계산의 모든 것을 마스터하는 완전한 가이드입니다. 
          4대보험부터 연말정산까지, 실수령액을 늘리는 모든 비법을 알려드립니다!
        </p>
        
        {/* 핵심 기능 소개 */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-8 transform hover:scale-105 transition-transform">
            <div className="flex items-center mb-4">
              <div className="bg-blue-600 p-3 rounded-full mr-3">
                <Calculator className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-blue-900 dark:text-blue-200">💎 2025년 최신 세법</h3>
            </div>
            <p className="text-blue-800 dark:text-blue-300 mb-4 leading-relaxed">
              국세청 공식 자료 기반으로 4대보험료, 소득세율, 각종 공제를 실시간 반영한 정확한 계산!
            </p>
            <div className="space-y-3">
              <div className="bg-blue-100 dark:bg-blue-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">📋 정확한 4대보험료</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">건강보험 3.545%, 국민연금 4.5%, 고용보험 0.9% 정확 반영</p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">💰 6단계 누진세율</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">6%~45%까지 소득 구간별 정확한 세율 적용</p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">🏷️ 각종 세액공제</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">근로소득세액공제, 자녀세액공제까지 완벽 계산</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-xl p-8 transform hover:scale-105 transition-transform">
            <div className="flex items-center mb-4">
              <div className="bg-green-600 p-3 rounded-full mr-3">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-green-900 dark:text-green-200">📊 스마트 분석 시스템</h3>
            </div>
            <p className="text-green-800 dark:text-green-300 mb-4 leading-relaxed">
              단순 계산을 넘어선 똑똑한 연봉 분석! 실효세율부터 절세 포인트까지 한눈에 파악하세요.
            </p>
            <div className="space-y-3">
              <div className="bg-green-100 dark:bg-green-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-green-900 dark:text-green-200 mb-1">📈 실효세율 분석</h4>
                <p className="text-sm text-green-700 dark:text-green-300">실제 납부하는 세금 비율을 한눈에 확인</p>
              </div>
              <div className="bg-green-100 dark:bg-green-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-green-900 dark:text-green-200 mb-1">💡 절세 가이드</h4>
                <p className="text-sm text-green-700 dark:text-green-300">비과세소득, 소득공제 활용법 맞춤 제안</p>
              </div>
              <div className="bg-green-100 dark:bg-green-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-green-900 dark:text-green-200 mb-1">📋 연봉별 비교표</h4>
                <p className="text-sm text-green-700 dark:text-green-300">2천만원~2억원까지 구간별 실수령액 한눈에</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl p-8 transform hover:scale-105 transition-transform">
            <div className="flex items-center mb-4">
              <div className="bg-purple-600 p-3 rounded-full mr-3">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-purple-900 dark:text-purple-200">⚡ 실무 최적화 도구</h3>
            </div>
            <p className="text-purple-800 dark:text-purple-300 mb-4 leading-relaxed">
              HR팀부터 개인까지! 실무에서 바로 쓸 수 있는 편리한 기능들로 업무 효율성을 극대화하세요.
            </p>
            <div className="space-y-3">
              <div className="bg-purple-100 dark:bg-purple-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-purple-900 dark:text-purple-200 mb-1">📂 계산 이력 관리</h4>
                <p className="text-sm text-purple-700 dark:text-purple-300">여러 시나리오 저장하고 비교 분석 가능</p>
              </div>
              <div className="bg-purple-100 dark:bg-purple-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-purple-900 dark:text-purple-200 mb-1">🔗 URL 공유</h4>
                <p className="text-sm text-purple-700 dark:text-purple-300">계산 결과를 URL로 간편하게 공유</p>
              </div>
              <div className="bg-purple-100 dark:bg-purple-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-purple-900 dark:text-purple-200 mb-1">📱 반응형 디자인</h4>
                <p className="text-sm text-purple-700 dark:text-purple-300">PC, 태블릿, 모바일 어디서든 완벽하게</p>
              </div>
            </div>
          </div>
        </div>

        {/* 4대보험 완전정복 */}
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/30 dark:to-blue-900/30 rounded-2xl p-8 mb-12">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">🛡️ 4대보험 완전정복 가이드</h3>
          <p className="text-center text-gray-600 dark:text-gray-300 mb-8">신입사원도 이해하는 4대보험의 모든 것! 보험료 계산부터 혜택까지 완벽 해설</p>
          
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <h4 className="text-xl font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center">
                <span className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full mr-3">🏥</span>
                건강보험 & 장기요양보험
              </h4>
              <div className="space-y-4">
                <div className="border-l-4 border-blue-400 pl-4">
                  <h5 className="font-semibold text-blue-600">💊 건강보험 (3.545%)</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">병원비, 약값 등 의료비 지원</p>
                  <div className="mt-2 text-xs text-blue-500 space-y-1">
                    <p>• 본인부담: 1.773%, 회사부담: 1.772%</p>
                    <p>• 소득 상한선 없음 (고소득자도 동일 비율)</p>
                    <p>• 피부양자는 별도 보험료 없이 혜택 동일</p>
                  </div>
                </div>
                <div className="border-l-4 border-green-400 pl-4">
                  <h5 className="font-semibold text-green-600">🏠 장기요양보험 (12.27%)</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">노인장기요양서비스 지원</p>
                  <div className="mt-2 text-xs text-green-500 space-y-1">
                    <p>• 건강보험료의 12.27%로 자동 계산</p>
                    <p>• 65세 이상 또는 노인성 질병자 대상</p>
                    <p>• 재가급여, 시설급여, 특별현금급여 제공</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <h4 className="text-xl font-semibold text-purple-600 dark:text-purple-400 mb-4 flex items-center">
                <span className="bg-purple-100 dark:bg-purple-900 p-2 rounded-full mr-3">👴</span>
                국민연금 & 고용보험
              </h4>
              <div className="space-y-4">
                <div className="border-l-4 border-purple-400 pl-4">
                  <h5 className="font-semibold text-purple-600">💰 국민연금 (4.5%)</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">노후 연금 및 각종 급여 지원</p>
                  <div className="mt-2 text-xs text-purple-500 space-y-1">
                    <p>• 본인: 2.25%, 회사: 2.25%</p>
                    <p>• 상한선: 월 636만원 (연 7,632만원)</p>
                    <p>• 노령연금, 장애연금, 유족연금 지급</p>
                  </div>
                </div>
                <div className="border-l-4 border-orange-400 pl-4">
                  <h5 className="font-semibold text-orange-600">🏢 고용보험 (0.9%)</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">실업급여 및 직업훈련 지원</p>
                  <div className="mt-2 text-xs text-orange-500 space-y-1">
                    <p>• 근로자: 0.9%, 사업주: 0.25%~0.85%</p>
                    <p>• 소득 상한선 없음</p>
                    <p>• 실업급여, 육아휴직급여, 직업훈련비 지원</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 소득세 누진세율 상세 설명 */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 rounded-2xl p-8 mb-12">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">📊 소득세 누진세율 완벽 분석</h3>
          <p className="text-center text-gray-600 dark:text-gray-300 mb-8">내 연봉은 몇 구간? 세율별 실수령액 변화를 한눈에 파악하세요!</p>
          
          <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">과세표준</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 dark:text-white">세율</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 dark:text-white">누진공제</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">해당 연봉대</th>
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
            <h5 className="font-semibold text-amber-900 dark:text-amber-200 mb-2">💡 누진세율 이해하기</h5>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-amber-800 dark:text-amber-300">
              <ul className="space-y-1">
                <li>✅ 전체 소득에 높은 세율이 적용되는 것이 아님</li>
                <li>✅ 구간별로 해당하는 세율만 적용됨</li>
                <li>✅ 연봉이 높아져도 손해보는 일은 없음</li>
                <li>✅ 누진공제로 계산이 간단해짐</li>
              </ul>
              <ul className="space-y-1">
                <li>📊 예: 연봉 5천만원 → 최고세율 15%</li>
                <li>📊 예: 연봉 1억원 → 최고세율 24%</li>
                <li>📊 실효세율은 최고세율보다 항상 낮음</li>
                <li>📊 각종 공제로 실제 세부담은 더 적음</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 절세 전략 가이드 */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-2xl p-8 mb-12">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">💰 실수령액 늘리는 절세 전략</h3>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <div className="text-center mb-4">
                <div className="bg-green-100 dark:bg-green-900 p-3 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-3">
                  <span className="text-2xl">💼</span>
                </div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white">소득공제 활용</h4>
              </div>
              <div className="space-y-3">
                <div className="border-l-4 border-green-400 pl-4">
                  <h5 className="font-semibold text-green-600">📱 신용카드 등 사용</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">연 300만원까지 15~30% 공제</p>
                </div>
                <div className="border-l-4 border-green-400 pl-4">
                  <h5 className="font-semibold text-green-600">🏠 주택자금 공제</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">주택청약 연 240만원, 주택담보대출 이자</p>
                </div>
                <div className="border-l-4 border-green-400 pl-4">
                  <h5 className="font-semibold text-green-600">👶 출산·양육 공제</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">첫째 30만원, 둘째 50만원, 셋째+ 70만원</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <div className="text-center mb-4">
                <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-3">
                  <span className="text-2xl">💊</span>
                </div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white">세액공제 활용</h4>
              </div>
              <div className="space-y-3">
                <div className="border-l-4 border-blue-400 pl-4">
                  <h5 className="font-semibold text-blue-600">🏥 의료비 공제</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">총급여 3% 초과분의 15% 공제</p>
                </div>
                <div className="border-l-4 border-blue-400 pl-4">
                  <h5 className="font-semibold text-blue-600">📚 교육비 공제</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">본인 전액, 자녀 1인당 300만원 15%</p>
                </div>
                <div className="border-l-4 border-blue-400 pl-4">
                  <h5 className="font-semibold text-blue-600">💝 기부금 공제</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">15~30%, 이월공제 5년</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <div className="text-center mb-4">
                <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-3">
                  <span className="text-2xl">🏦</span>
                </div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white">연금저축 활용</h4>
              </div>
              <div className="space-y-3">
                <div className="border-l-4 border-purple-400 pl-4">
                  <h5 className="font-semibold text-purple-600">💰 연금저축펀드</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">연 600만원까지 세액공제 16.5%</p>
                </div>
                <div className="border-l-4 border-purple-400 pl-4">
                  <h5 className="font-semibold text-purple-600">🏢 퇴직연금 IRP</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">추가 300만원까지 세액공제</p>
                </div>
                <div className="border-l-4 border-purple-400 pl-4">
                  <h5 className="font-semibold text-purple-600">📈 ISA 계좌</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">비과세 한도 늘리고 연금계좌 이체시 추가공제</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 연말정산 준비 가이드 */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-2xl p-8">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">📋 연말정산 완벽 준비 가이드</h3>
          <div className="grid lg:grid-cols-2 gap-8">
            <div>
              <h4 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-4 flex items-center">
                <span className="bg-indigo-100 dark:bg-indigo-900 p-2 rounded-full mr-2">📅</span>
                연말정산 일정 & 준비사항
              </h4>
              <div className="space-y-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <h5 className="font-semibold text-indigo-600 mb-2">🗓️ 주요 일정</h5>
                  <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <p>• 1월: 소득·세액공제 신청서 제출</p>
                    <p>• 2월: 회사에서 연말정산 계산</p>
                    <p>• 3월: 환급금 지급 또는 추가납부</p>
                    <p>• 5월: 종합소득세 신고 (필요시)</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <h5 className="font-semibold text-indigo-600 mb-2">📄 필수 준비서류</h5>
                  <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <p>• 소득·세액공제 신고서 (회사 제공)</p>
                    <p>• 부양가족 관계증명서</p>
                    <p>• 각종 공제 관련 영수증</p>
                    <p>• 주택자금 공제 관련 서류</p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-purple-600 dark:text-purple-400 mb-4 flex items-center">
                <span className="bg-purple-100 dark:bg-purple-900 p-2 rounded-full mr-2">💡</span>
                환급금 늘리는 핵심 팁
              </h4>
              <div className="space-y-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <h5 className="font-semibold text-purple-600 mb-2">✅ 꼼꼼한 영수증 관리</h5>
                  <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <p>• 홈택스 자동 수집되지 않는 항목 체크</p>
                    <p>• 의료비는 미용·성형 제외한 모든 항목</p>
                    <p>• 교육비는 학원비, 교재비까지 포함</p>
                    <p>• 현금영수증은 반드시 발급받기</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <h5 className="font-semibold text-purple-600 mb-2">⚡ 절세 상품 적극 활용</h5>
                  <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <p>• 연금저축: 연 600만원까지 16.5% 공제</p>
                    <p>• 주택청약: 연 240만원까지 40% 공제</p>
                    <p>• 소상공인 도움: 신용카드보다 높은 공제율</p>
                    <p>• 기부금: 정치후원금은 10만원까지 100%</p>
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