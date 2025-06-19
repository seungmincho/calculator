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

  // 개선된 실수령액 계산 함수
  const calculateNetSalary = (inputSalary: string, type: 'annual' | 'monthly', nonTaxable: string, dependentCount: string, childrenCount: string) => {
    const salaryNum = parseInt(inputSalary.replace(/,/g, ''));
    const nonTaxableNum = parseInt(nonTaxable.replace(/,/g, '')) || 0;
    const dependentNum = parseInt(dependentCount) || 1;
    const childrenNum = parseInt(childrenCount) || 0;
    
    if (!salaryNum || salaryNum <= 0) return null;

    // 연봉으로 변환
    const grossAnnual = type === 'monthly' ? salaryNum * 12 : salaryNum;
    const taxableAnnual = grossAnnual - nonTaxableNum;

    // 4대보험료 계산 (2024년 기준) - 비과세액 제외하고 계산
    const insuranceBase = Math.min(taxableAnnual, 63600000); // 국민연금 상한선
    const healthInsurance = Math.floor(taxableAnnual * 0.03545); // 건강보험 3.545%
    const longTermCare = Math.floor(healthInsurance * 0.1227); // 장기요양보험 12.27%
    const nationalPension = Math.floor(insuranceBase * 0.045); // 국민연금 4.5%
    const employmentInsurance = Math.floor(taxableAnnual * 0.009); // 고용보험 0.9%

    // 소득공제 계산
    const basicDeduction = 1500000; // 기본공제 150만원
    const dependentDeduction = (dependentNum - 1) * 1500000; // 부양가족공제 (본인 제외)
    const childDeduction = childrenNum * 1500000; // 20세 이하 자녀 추가공제
    const totalPersonalDeduction = basicDeduction + dependentDeduction + childDeduction;

    // 과세표준 계산
    const taxableIncome = Math.max(0, taxableAnnual - nationalPension - totalPersonalDeduction);
    
    // 소득세 계산 (2024년 누진세율)
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
    let taxCredit = 0;
    if (incomeTax <= 1300000) {
      taxCredit = Math.min(incomeTax * 0.55, 740000);
    } else {
      taxCredit = Math.min(740000 - (incomeTax - 1300000) * 0.05, 740000);
    }
    taxCredit = Math.max(taxCredit, 0);

    // 자녀세액공제 (20세 이하)
    const childTaxCredit = childrenNum * 150000;

    incomeTax = Math.floor(Math.max(0, incomeTax - taxCredit - childTaxCredit));
    const localIncomeTax = Math.floor(incomeTax * 0.1); // 지방소득세 10%

    const totalDeductions = healthInsurance + longTermCare + nationalPension + employmentInsurance + incomeTax + localIncomeTax;
    const netAnnual = grossAnnual - totalDeductions;
    const netMonthly = Math.floor(netAnnual / 12);

    return {
      gross: grossAnnual,
      taxable: taxableAnnual,
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
        taxCredit: taxCredit + childTaxCredit,
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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
              <h3 className="font-medium text-blue-900 dark:text-blue-200 mb-2">💡 계산 기준</h3>
              <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                <li>• 2024년 기준 세율 및 공제 적용</li>
                <li>• 근로소득세액공제 및 자녀세액공제 반영</li>
                <li>• 4대보험료 자동 계산</li>
                <li>• 실제 연말정산시 추가 공제로 환급 가능</li>
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
                      <span className="text-gray-600 dark:text-gray-400">인적공제 ({dependents}명 + 자녀 {childrenUnder20}명)</span>
                      <span className="font-medium text-gray-900 dark:text-white">{formatNumber(result.taxInfo.personalDeduction)}원</span>
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