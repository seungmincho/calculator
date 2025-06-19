'use client'

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Briefcase, Calendar, TrendingUp, Calculator, Share2, Check, Save } from 'lucide-react';
import { useCalculationHistory } from '@/hooks/useCalculationHistory';
import CalculationHistory from '@/components/CalculationHistory';

const RetirementCalculatorContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [avgSalary, setAvgSalary] = useState('');
  const [workYears, setWorkYears] = useState('');
  const [workMonths, setWorkMonths] = useState('');
  const [result, setResult] = useState<ReturnType<typeof calculateRetirement>>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [showSaveButton, setShowSaveButton] = useState(false);

  // 계산 이력 관리
  const {
    histories,
    isLoading: historyLoading,
    saveCalculation,
    removeHistory,
    clearHistories,
    loadFromHistory
  } = useCalculationHistory('retirement');

  // 퇴직금 계산 함수 (근로기준법 기준)
  const calculateRetirement = (avgSalaryStr: string, yearsStr: string, monthsStr: string) => {
    const avgSal = parseInt(avgSalaryStr.replace(/,/g, ''));
    const years = parseInt(yearsStr) || 0;
    const months = parseInt(monthsStr) || 0;
    
    if (!avgSal || avgSal <= 0 || (years === 0 && months === 0)) return null;

    // 총 근무일수 계산 (1년 = 365일)
    const totalDays = (years * 365) + (months * 30);
    const totalYears = totalDays / 365;
    
    // 퇴직금 계산: 1일 평균임금 × 30일 × 재직연수
    // 1일 평균임금 = 연봉 ÷ 12개월 ÷ 30일
    const dailyWage = Math.floor(avgSal / 12 / 30);
    const retirementPay = Math.floor(dailyWage * 30 * totalYears);
    
    // 퇴직소득세 계산 (2024년 기준)
    let tax = 0;
    
    if (totalYears >= 1) {
      // 퇴직소득공제 계산
      let deduction = 0;
      if (totalYears <= 5) {
        deduction = totalYears * 3000000; // 5년 이하: 연 300만원
      } else if (totalYears <= 10) {
        deduction = 15000000 + (totalYears - 5) * 4500000; // 6~10년: 5년분 + 연 450만원
      } else if (totalYears <= 20) {
        deduction = 37500000 + (totalYears - 10) * 6000000; // 11~20년: 10년분 + 연 600만원
      } else {
        deduction = 97500000 + (totalYears - 20) * 7500000; // 21년 이상: 20년분 + 연 750만원
      }
      
      const taxableAmount = Math.max(0, retirementPay - deduction);
      const taxableBase = Math.floor(taxableAmount / 12); // 연분연승법 (12등분)
      
      // 종합소득세율 적용
      let monthlyTax = 0;
      if (taxableBase <= 14000000) {
        monthlyTax = Math.floor(taxableBase * 0.06);
      } else if (taxableBase <= 50000000) {
        monthlyTax = Math.floor(840000 + (taxableBase - 14000000) * 0.15);
      } else if (taxableBase <= 88000000) {
        monthlyTax = Math.floor(6240000 + (taxableBase - 50000000) * 0.24);
      } else if (taxableBase <= 150000000) {
        monthlyTax = Math.floor(15360000 + (taxableBase - 88000000) * 0.35);
      } else if (taxableBase <= 300000000) {
        monthlyTax = Math.floor(37060000 + (taxableBase - 150000000) * 0.38);
      } else if (taxableBase <= 500000000) {
        monthlyTax = Math.floor(94060000 + (taxableBase - 300000000) * 0.40);
      } else {
        monthlyTax = Math.floor(174060000 + (taxableBase - 500000000) * 0.42);
      }
      
      tax = monthlyTax * 12; // 연분연승법으로 계산된 세액에 12를 곱함
    }
    
    const localTax = Math.floor(tax * 0.1); // 지방소득세
    const totalTax = tax + localTax;
    const netRetirementPay = retirementPay - totalTax;
    
    return {
      avgSalary: avgSal,
      dailyWage,
      totalDays,
      totalYears: Math.round(totalYears * 100) / 100,
      retirementPay,
      tax,
      localTax,
      totalTax,
      netRetirementPay
    };
  };

  const handleCalculate = React.useCallback(() => {
    const calculation = calculateRetirement(avgSalary, workYears, workMonths);
    setResult(calculation);
    setShowSaveButton(!!calculation); // 계산 결과가 있으면 저장 버튼 표시
  }, [avgSalary, workYears, workMonths]);

  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const handleShare = async () => {
    try {
      const currentUrl = window.location.href;
      
      // Modern clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(currentUrl);
      } else {
        // Fallback for older browsers
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
      // 복사 실패시에도 사용자에게 피드백
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

  // 계산 결과 저장
  const handleSaveCalculation = () => {
    if (!result) return;

    const inputs = {
      avgSalary,
      workYears,
      workMonths
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
      setAvgSalary(inputs.avgSalary || '');
      setWorkYears(inputs.workYears || '');
      setWorkMonths(inputs.workMonths || '');
      
      // URL도 업데이트
      updateURL({
        salary: inputs.avgSalary?.replace(/,/g, '') || '',
        years: inputs.workYears || '',
        months: inputs.workMonths || ''
      });
    }
  };

  // 이력 결과 포맷팅
  const formatHistoryResult = (result: any) => {
    if (!result) return '';
    return `퇴직금 ${formatNumber(result.netRetirementPay)}원 (${result.totalYears}년 근무)`;
  };

  const handleSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/,/g, '');
    if (/^\d*$/.test(value)) {
      const formattedValue = formatNumber(Number(value));
      setAvgSalary(formattedValue);
      updateURL({ salary: value });
    }
  };

  const handleYearsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*$/.test(value) && Number(value) <= 50) {
      setWorkYears(value);
      updateURL({ years: value });
    }
  };

  const handleMonthsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*$/.test(value) && Number(value) <= 11) {
      setWorkMonths(value);
      updateURL({ months: value });
    }
  };

  // URL에서 초기값 로드
  useEffect(() => {
    const salaryParam = searchParams.get('salary');
    const yearsParam = searchParams.get('years');
    const monthsParam = searchParams.get('months');

    if (salaryParam && /^\d+$/.test(salaryParam)) {
      setAvgSalary(formatNumber(Number(salaryParam)));
    }
    if (yearsParam && /^\d+$/.test(yearsParam) && Number(yearsParam) <= 50) {
      setWorkYears(yearsParam);
    }
    if (monthsParam && /^\d+$/.test(monthsParam) && Number(monthsParam) <= 11) {
      setWorkMonths(monthsParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (avgSalary && (workYears || workMonths)) {
      handleCalculate();
    } else {
      setResult(null);
    }
  }, [avgSalary, workYears, workMonths, handleCalculate]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
          <Briefcase className="w-8 h-8 text-orange-600" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">퇴직금 계산기</h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-6">
          평균임금과 근무기간을 입력하시면 퇴직금과 퇴직소득세를 계산해드립니다.
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
          <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">퇴직금 정보 입력</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                평균임금 (연봉)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={avgSalary}
                  onChange={handleSalaryChange}
                  placeholder="예: 50,000,000"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900 dark:text-white"
                />
                <span className="absolute right-3 top-3 text-gray-500 dark:text-gray-400">원</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                퇴직 전 3개월 평균임금 기준
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  근무 년수
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={workYears}
                    onChange={handleYearsChange}
                    placeholder="0"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900 dark:text-white"
                  />
                  <span className="absolute right-3 top-3 text-gray-500 dark:text-gray-400">년</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  근무 개월수
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={workMonths}
                    onChange={handleMonthsChange}
                    placeholder="0"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900 dark:text-white"
                  />
                  <span className="absolute right-3 top-3 text-gray-500 dark:text-gray-400">개월</span>
                </div>
              </div>
            </div>

            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-2">
                <Calculator className="w-4 h-4 inline mr-1" />
                계산 기준
              </h3>
              <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-1">
                <li>• 퇴직금 = 1일 평균임금 × 30일 × 재직연수</li>
                <li>• 1년 미만 근무시 월할 계산</li>
                <li>• 퇴직소득공제: 5년 이하 연300만원, 이후 단계별 증가</li>
                <li>• 연분연승법 적용 (과세표준÷12)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Result Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">계산 결과</h2>
          
          {result ? (
            <div className="space-y-6">
              <div className="text-center p-6 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl text-white">
                <div className="text-sm opacity-90 mb-1">세후 퇴직금</div>
                <div className="text-3xl font-bold">{formatNumber(result.netRetirementPay)}원</div>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400">1일 평균임금</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {formatNumber(result.dailyWage)}원
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400">총 근무기간</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {result.totalYears}년
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                  <span className="text-gray-600 dark:text-gray-400">세전 퇴직금</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatNumber(result.retirementPay)}원
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 dark:text-gray-400">퇴직소득세</span>
                    <span className="text-red-600 dark:text-red-400">
                      -{formatNumber(result.tax)}원
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 dark:text-gray-400">지방소득세</span>
                    <span className="text-red-600 dark:text-red-400">
                      -{formatNumber(result.localTax)}원
                    </span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center py-2 border-t border-gray-200 dark:border-gray-600 font-semibold">
                  <span className="text-gray-900 dark:text-white">실수령 퇴직금</span>
                  <span className="text-orange-600 dark:text-orange-400">
                    {formatNumber(result.netRetirementPay)}원
                  </span>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                  <TrendingUp className="w-4 h-4 inline mr-1" />
                  참고사항
                </h3>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• 실제 퇴직금은 회사 규정에 따라 다를 수 있습니다</li>
                  <li>• 중간정산을 받은 경우 별도 계산이 필요합니다</li>
                  <li>• 퇴직연금 가입시 산정 방식이 다를 수 있습니다</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                평균임금과 근무기간을 입력하면<br />
                퇴직금을 계산해드립니다.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const RetirementCalculator = () => {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-600"></div></div>}>
      <RetirementCalculatorContent />
    </Suspense>
  );
};

export default RetirementCalculator;