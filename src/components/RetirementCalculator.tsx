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

      {/* 상세 가이드 섹션 */}
      <div className="mt-12 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <h2 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white text-center">🚀 퇴직금 계산 마스터 가이드</h2>
        <p className="text-lg text-gray-600 dark:text-gray-300 text-center mb-12 max-w-4xl mx-auto">
          신입사원부터 중간관리자까지! 퇴직금의 모든 것을 마스터하는 완전한 가이드입니다. 
          근로기준법부터 퇴직연금까지, 내 퇴직금을 정확히 알고 관리하세요!
        </p>
        
        {/* 핵심 기능 소개 */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 rounded-xl p-8 transform hover:scale-105 transition-transform">
            <div className="flex items-center mb-4">
              <div className="bg-orange-600 p-3 rounded-full mr-3">
                <Calculator className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-orange-900 dark:text-orange-200">💎 정확한 법정 계산</h3>
            </div>
            <p className="text-orange-800 dark:text-orange-300 mb-4 leading-relaxed">
              근로기준법 제34조 기준으로 1일 평균임금과 재직연수를 정확히 반영한 퇴직금 계산!
            </p>
            <div className="space-y-3">
              <div className="bg-orange-100 dark:bg-orange-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-orange-900 dark:text-orange-200 mb-1">📋 평균임금 산정</h4>
                <p className="text-sm text-orange-700 dark:text-orange-300">퇴직 전 3개월 급여 평균으로 정확한 계산</p>
              </div>
              <div className="bg-orange-100 dark:bg-orange-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-orange-900 dark:text-orange-200 mb-1">📅 재직기간 정밀 계산</h4>
                <p className="text-sm text-orange-700 dark:text-orange-300">년/월 단위로 입력해서 일할 계산까지 정확하게</p>
              </div>
              <div className="bg-orange-100 dark:bg-orange-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-orange-900 dark:text-orange-200 mb-1">💰 세금 자동 계산</h4>
                <p className="text-sm text-orange-700 dark:text-orange-300">퇴직소득세와 지방소득세까지 한번에</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-8 transform hover:scale-105 transition-transform">
            <div className="flex items-center mb-4">
              <div className="bg-blue-600 p-3 rounded-full mr-3">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-blue-900 dark:text-blue-200">📊 스마트 세금 최적화</h3>
            </div>
            <p className="text-blue-800 dark:text-blue-300 mb-4 leading-relaxed">
              연분연승법과 퇴직소득공제를 똑똑하게 적용해서 세후 실수령액을 정확히 계산합니다.
            </p>
            <div className="space-y-3">
              <div className="bg-blue-100 dark:bg-blue-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">🎯 퇴직소득공제</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">근무연수별 차등 공제로 세금 부담 최소화</p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">⚖️ 연분연승법</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">과세표준을 12등분해서 세율 부담 완화</p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">💡 절세 가이드</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">중간정산과 퇴직연금 활용법까지 제안</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-xl p-8 transform hover:scale-105 transition-transform">
            <div className="flex items-center mb-4">
              <div className="bg-green-600 p-3 rounded-full mr-3">
                <Briefcase className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-green-900 dark:text-green-200">⚡ 실무 최적화 도구</h3>
            </div>
            <p className="text-green-800 dark:text-green-300 mb-4 leading-relaxed">
              HR팀부터 개인까지! 실무에서 바로 쓸 수 있는 편리한 기능들로 퇴직금 관리를 완벽하게.
            </p>
            <div className="space-y-3">
              <div className="bg-green-100 dark:bg-green-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-green-900 dark:text-green-200 mb-1">📂 계산 이력 관리</h4>
                <p className="text-sm text-green-700 dark:text-green-300">여러 시나리오를 저장하고 비교 분석</p>
              </div>
              <div className="bg-green-100 dark:bg-green-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-green-900 dark:text-green-200 mb-1">🔗 URL 공유</h4>
                <p className="text-sm text-green-700 dark:text-green-300">계산 결과를 동료나 가족과 간편 공유</p>
              </div>
              <div className="bg-green-100 dark:bg-green-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-green-900 dark:text-green-200 mb-1">📱 반응형 디자인</h4>
                <p className="text-sm text-green-700 dark:text-green-300">PC, 태블릿, 모바일 어디서든 완벽하게</p>
              </div>
            </div>
          </div>
        </div>

        {/* 퇴직금 제도 완전정복 */}
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/30 dark:to-blue-900/30 rounded-2xl p-8 mb-12">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">🏢 퇴직금 제도 완전정복</h3>
          <p className="text-center text-gray-600 dark:text-gray-300 mb-8">퇴직금과 퇴직연금, 어떤 차이가 있는지 정확히 알고 현명하게 관리하세요!</p>
          
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <h4 className="text-xl font-semibold text-orange-600 dark:text-orange-400 mb-4 flex items-center">
                <span className="bg-orange-100 dark:bg-orange-900 p-2 rounded-full mr-3">💰</span>
                퇴직금 제도 (법정 퇴직금)
              </h4>
              <div className="space-y-4">
                <div className="border-l-4 border-orange-400 pl-4">
                  <h5 className="font-semibold text-orange-600">📋 기본 개념</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">근로기준법에 의한 법정 퇴직급여</p>
                  <div className="mt-2 text-xs text-orange-500 space-y-1">
                    <p>• 1년 이상 근무한 근로자에게 지급 의무</p>
                    <p>• 회사가 직접 적립하고 관리</p>
                    <p>• 퇴직시 회사에서 직접 지급</p>
                  </div>
                </div>
                <div className="border-l-4 border-orange-400 pl-4">
                  <h5 className="font-semibold text-orange-600">💡 계산 방식</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">1일 평균임금 × 30일 × 재직연수</p>
                  <div className="mt-2 text-xs text-orange-500 space-y-1">
                    <p>• 퇴직 직전 3개월 평균임금 기준</p>
                    <p>• 상여금, 수당 등 모든 급여 포함</p>
                    <p>• 1년 미만시 월할 계산 적용</p>
                  </div>
                </div>
                <div className="border-l-4 border-orange-400 pl-4">
                  <h5 className="font-semibold text-orange-600">⚖️ 장단점</h5>
                  <div className="mt-2 text-xs text-orange-500 space-y-1">
                    <p>✅ 확정급여로 예측 가능</p>
                    <p>✅ 회사 부담으로 별도 납입 불필요</p>
                    <p>❌ 회사 파산시 지급 위험</p>
                    <p>❌ 중간인출이나 운용 불가</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <h4 className="text-xl font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center">
                <span className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full mr-3">🏦</span>
                퇴직연금 제도 (DC/DB)
              </h4>
              <div className="space-y-4">
                <div className="border-l-4 border-blue-400 pl-4">
                  <h5 className="font-semibold text-blue-600">📊 DC형 (확정기여)</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">매년 연봉의 1/12를 적립하여 운용</p>
                  <div className="mt-2 text-xs text-blue-500 space-y-1">
                    <p>• 근로자가 직접 운용 상품 선택</p>
                    <p>• 운용 결과에 따라 수령액 결정</p>
                    <p>• 중간정산 가능 (55세 이후)</p>
                  </div>
                </div>
                <div className="border-l-4 border-blue-400 pl-4">
                  <h5 className="font-semibold text-blue-600">🏢 DB형 (확정급여)</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">회사가 운용하여 정해진 급여 지급</p>
                  <div className="mt-2 text-xs text-blue-500 space-y-1">
                    <p>• 회사가 운용 리스크 부담</p>
                    <p>• 근무연수에 따른 급여표 적용</p>
                    <p>• 안정적이지만 수익률 제한적</p>
                  </div>
                </div>
                <div className="border-l-4 border-blue-400 pl-4">
                  <h5 className="font-semibold text-blue-600">💎 장점</h5>
                  <div className="mt-2 text-xs text-blue-500 space-y-1">
                    <p>✅ 금융기관에서 안전하게 보관</p>
                    <p>✅ 이직시 개인형 IRP로 이전 가능</p>
                    <p>✅ 세제 혜택 (운용수익 비과세)</p>
                    <p>✅ 연금 수령시 세제 혜택</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 퇴직소득세 완벽 이해 */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 rounded-2xl p-8 mb-12">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">💰 퇴직소득세 완벽 이해</h3>
          <p className="text-center text-gray-600 dark:text-gray-300 mb-8">똑똑한 세금 계산으로 실수령액을 늘려보세요!</p>
          
          <div className="grid lg:grid-cols-2 gap-8 mb-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <h4 className="text-lg font-semibold text-amber-600 dark:text-amber-400 mb-4 flex items-center">
                <span className="bg-amber-100 dark:bg-amber-900 p-2 rounded-full mr-2">📊</span>
                퇴직소득공제 단계별 안내
              </h4>
              <div className="space-y-3">
                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-1">5년 이하</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">연 300만원 × 근무연수</p>
                  <div className="text-xs text-amber-600 mt-1">예: 3년 근무 → 900만원 공제</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-1">6~10년</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">1,500만원 + (연수-5) × 450만원</p>
                  <div className="text-xs text-amber-600 mt-1">예: 7년 근무 → 2,400만원 공제</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-1">11~20년</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">3,750만원 + (연수-10) × 600만원</p>
                  <div className="text-xs text-amber-600 mt-1">예: 15년 근무 → 6,750만원 공제</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-1">21년 이상</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">9,750만원 + (연수-20) × 750만원</p>
                  <div className="text-xs text-amber-600 mt-1">예: 25년 근무 → 13,500만원 공제</div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <h4 className="text-lg font-semibold text-green-600 dark:text-green-400 mb-4 flex items-center">
                <span className="bg-green-100 dark:bg-green-900 p-2 rounded-full mr-2">⚖️</span>
                연분연승법의 마법
              </h4>
              <div className="space-y-3">
                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-1">연분연승법이란?</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">과세표준을 12로 나누어 세율 적용 후 12배</p>
                  <div className="text-xs text-green-600 mt-1">💡 한번에 받는 큰 금액의 세금 부담을 완화</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-1">계산 예시</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">퇴직금 1억원 → 과세표준 833만원으로 계산</p>
                  <div className="text-xs text-green-600 mt-1">6% 세율 적용 → 50만원 × 12 = 600만원</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-1">일반 소득세 vs 연분연승</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">1억원을 일반소득으로 받으면 1,524만원 세금</p>
                  <div className="text-xs text-green-600 mt-1">🎯 연분연승법으로 924만원 절약!</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg">
            <h5 className="font-semibold text-red-900 dark:text-red-200 mb-3">⚠️ 퇴직소득세 절약 전략</h5>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <h6 className="font-bold text-red-600 mb-2">중간정산 활용</h6>
                <p className="text-red-800 dark:text-red-300">10년 근무 후 중간정산으로 세금 분산</p>
                <div className="text-xs text-red-600 mt-1">💡 장기 근무자에게 유리</div>
              </div>
              <div>
                <h6 className="font-bold text-red-600 mb-2">퇴직연금 전환</h6>
                <p className="text-red-800 dark:text-red-300">일시금 대신 연금으로 수령시 세제 혜택</p>
                <div className="text-xs text-red-600 mt-1">💡 연금소득공제 30% 추가</div>
              </div>
              <div>
                <h6 className="font-bold text-red-600 mb-2">분할 수령</h6>
                <p className="text-red-800 dark:text-red-300">5년간 분할 수령으로 과세표준 분산</p>
                <div className="text-xs text-red-600 mt-1">💡 고액 퇴직금일 때 효과적</div>
              </div>
            </div>
          </div>
        </div>

        {/* 퇴직금 관리 전략 */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-2xl p-8 mb-12">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">🧠 똑똑한 퇴직금 관리 전략</h3>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <div className="text-center mb-4">
                <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-3">
                  <span className="text-2xl">💼</span>
                </div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white">재직 중 관리</h4>
              </div>
              <div className="space-y-3">
                <div className="border-l-4 border-blue-400 pl-4">
                  <h5 className="font-semibold text-blue-600">📋 퇴직급여 규정 확인</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">회사의 퇴직금/퇴직연금 제도 정확히 파악</p>
                </div>
                <div className="border-l-4 border-blue-400 pl-4">
                  <h5 className="font-semibold text-blue-600">📊 중간정산 시점 검토</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">10년, 15년차에 중간정산 여부 신중 결정</p>
                </div>
                <div className="border-l-4 border-blue-400 pl-4">
                  <h5 className="font-semibold text-blue-600">💰 DC형 운용 전략</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">안정형과 수익형의 적절한 포트폴리오 구성</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <div className="text-center mb-4">
                <div className="bg-green-100 dark:bg-green-900 p-3 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-3">
                  <span className="text-2xl">🎯</span>
                </div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white">퇴직 시점 전략</h4>
              </div>
              <div className="space-y-3">
                <div className="border-l-4 border-green-400 pl-4">
                  <h5 className="font-semibold text-green-600">📅 퇴직 시점 조정</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">연말 퇴직 vs 연초 퇴직의 세제 차이 고려</p>
                </div>
                <div className="border-l-4 border-green-400 pl-4">
                  <h5 className="font-semibold text-green-600">🏦 수령 방법 선택</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">일시금 vs 연금 vs 분할수령 비교 검토</p>
                </div>
                <div className="border-l-4 border-green-400 pl-4">
                  <h5 className="font-semibold text-green-600">📋 서류 준비</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">퇴직소득원천징수영수증 등 세무 서류 확보</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <div className="text-center mb-4">
                <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-3">
                  <span className="text-2xl">💎</span>
                </div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white">퇴직 후 운용</h4>
              </div>
              <div className="space-y-3">
                <div className="border-l-4 border-purple-400 pl-4">
                  <h5 className="font-semibold text-purple-600">🏦 IRP 계좌 개설</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">개인형 퇴직연금으로 이전하여 지속 운용</p>
                </div>
                <div className="border-l-4 border-purple-400 pl-4">
                  <h5 className="font-semibold text-purple-600">📈 추가 납입</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">연 300만원까지 추가 납입으로 세액공제</p>
                </div>
                <div className="border-l-4 border-purple-400 pl-4">
                  <h5 className="font-semibold text-purple-600">⏰ 수령 시점</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">55세 이후 연금수령으로 세제혜택 극대화</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 실무 체크리스트 */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-2xl p-8">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">📋 퇴직금 실무 체크리스트</h3>
          <div className="grid lg:grid-cols-2 gap-8">
            <div>
              <h4 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-4 flex items-center">
                <span className="bg-indigo-100 dark:bg-indigo-900 p-2 rounded-full mr-2">📝</span>
                입사 후 확인사항
              </h4>
              <div className="space-y-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <h5 className="font-semibold text-indigo-600 mb-2">💼 퇴직급여 제도 파악</h5>
                  <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <p>□ 퇴직금제 vs 퇴직연금제 확인</p>
                    <p>□ DC형 vs DB형 여부 확인</p>
                    <p>□ 회사 규정상 퇴직금 산정 방식</p>
                    <p>□ 중간정산 규정 및 조건</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <h5 className="font-semibold text-indigo-600 mb-2">🏦 금융기관 정보</h5>
                  <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <p>□ 퇴직연금 운용기관 확인</p>
                    <p>□ 상품 라인업 및 수수료</p>
                    <p>□ 온라인 조회 시스템 가입</p>
                    <p>□ 운용 현황 정기 점검 일정</p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-purple-600 dark:text-purple-400 mb-4 flex items-center">
                <span className="bg-purple-100 dark:bg-purple-900 p-2 rounded-full mr-2">🚀</span>
                퇴직 전 준비사항
              </h4>
              <div className="space-y-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <h5 className="font-semibold text-purple-600 mb-2">📊 사전 계산</h5>
                  <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <p>□ 예상 퇴직금 정확한 계산</p>
                    <p>□ 퇴직소득세 시뮬레이션</p>
                    <p>□ 수령방법별 세후 금액 비교</p>
                    <p>□ 중간정산 vs 일시수령 비교</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <h5 className="font-semibold text-purple-600 mb-2">📋 서류 준비</h5>
                  <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <p>□ 퇴직금 신청서 작성</p>
                    <p>□ 수령 계좌 정보 제공</p>
                    <p>□ 퇴직소득 원천징수영수증 수령</p>
                    <p>□ IRP 계좌 개설 (필요시)</p>
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

const RetirementCalculator = () => {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-600"></div></div>}>
      <RetirementCalculatorContent />
    </Suspense>
  );
};

export default RetirementCalculator;