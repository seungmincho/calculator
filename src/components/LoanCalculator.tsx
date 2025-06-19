'use client'

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calculator, TrendingDown, PiggyBank, BarChart3, CompassIcon, Share2, Check, Save } from 'lucide-react';
import { useCalculationHistory } from '@/hooks/useCalculationHistory';
import CalculationHistory from '@/components/CalculationHistory';

type LoanType = 'equal-payment' | 'equal-principal' | 'interest-only' | 'balloon';

interface LoanResult {
  type: LoanType;
  monthlyPayment: number;
  totalPayment: number;
  totalInterest: number;
  schedule: Array<{
    month: number;
    monthlyPayment: number;
    principalPayment: number;
    interestPayment: number;
    remainingBalance: number;
  }>;
}

const LoanCalculatorContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loanAmount, setLoanAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [loanTerm, setLoanTerm] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<LoanType[]>(['equal-payment']);
  const [results, setResults] = useState<LoanResult[]>([]);
  const [activeTab, setActiveTab] = useState<'calculator' | 'CompassIcon'>('calculator');
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
  } = useCalculationHistory('loan');

  const loanTypes = {
    'equal-payment': '원리금균등상환',
    'equal-principal': '원금균등상환',
    'interest-only': '만기일시상환',
    'balloon': '거치식대출'
  };

  // 원리금균등상환 계산
  const calculateEqualPayment = (P: number, r: number, n: number): LoanResult => {
    const monthlyPayment = P * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const totalPayment = monthlyPayment * n;
    const totalInterest = totalPayment - P;

    const schedule = [];
    let remainingBalance = P;
    
    for (let i = 1; i <= Math.min(12, n); i++) {
      const interestPayment = remainingBalance * r;
      const principalPayment = monthlyPayment - interestPayment;
      remainingBalance -= principalPayment;

      schedule.push({
        month: i,
        monthlyPayment: Math.round(monthlyPayment),
        principalPayment: Math.round(principalPayment),
        interestPayment: Math.round(interestPayment),
        remainingBalance: Math.round(Math.max(0, remainingBalance))
      });
    }

    return {
      type: 'equal-payment',
      monthlyPayment: Math.round(monthlyPayment),
      totalPayment: Math.round(totalPayment),
      totalInterest: Math.round(totalInterest),
      schedule
    };
  };

  // 원금균등상환 계산
  const calculateEqualPrincipal = (P: number, r: number, n: number): LoanResult => {
    const principalPayment = P / n;
    let totalPayment = 0;
    let remainingBalance = P;

    const schedule = [];
    
    for (let i = 1; i <= Math.min(12, n); i++) {
      const interestPayment = remainingBalance * r;
      const monthlyPayment = principalPayment + interestPayment;
      remainingBalance -= principalPayment;
      totalPayment += monthlyPayment;

      schedule.push({
        month: i,
        monthlyPayment: Math.round(monthlyPayment),
        principalPayment: Math.round(principalPayment),
        interestPayment: Math.round(interestPayment),
        remainingBalance: Math.round(Math.max(0, remainingBalance))
      });
    }

    const totalInterest = (P * r * (n + 1)) / 2;
    const fullTotalPayment = P + totalInterest;

    return {
      type: 'equal-principal',
      monthlyPayment: Math.round(schedule[0]?.monthlyPayment || 0),
      totalPayment: Math.round(fullTotalPayment),
      totalInterest: Math.round(totalInterest),
      schedule
    };
  };

  // 만기일시상환 계산
  const calculateInterestOnly = (P: number, r: number, n: number): LoanResult => {
    const monthlyInterest = P * r;
    const totalInterest = monthlyInterest * n;
    const totalPayment = P + totalInterest;

    const schedule = [];
    
    for (let i = 1; i <= Math.min(12, n); i++) {
      const isLastMonth = i === n;
      const monthlyPayment = isLastMonth ? P + monthlyInterest : monthlyInterest;
      const principalPayment = isLastMonth ? P : 0;
      const remainingBalance = isLastMonth ? 0 : P;

      schedule.push({
        month: i,
        monthlyPayment: Math.round(monthlyPayment),
        principalPayment: Math.round(principalPayment),
        interestPayment: Math.round(monthlyInterest),
        remainingBalance: Math.round(remainingBalance)
      });
    }

    return {
      type: 'interest-only',
      monthlyPayment: Math.round(monthlyInterest),
      totalPayment: Math.round(totalPayment),
      totalInterest: Math.round(totalInterest),
      schedule
    };
  };

  // 거치식대출 계산 (2년 거치 후 원리금균등)
  const calculateBalloon = (P: number, r: number, n: number): LoanResult => {
    const gracePeriod = 24; // 2년 거치
    const repaymentPeriod = n - gracePeriod;
    
    if (repaymentPeriod <= 0) {
      return calculateInterestOnly(P, r, n);
    }

    const graceInterest = P * r;
    const graceTotal = graceInterest * gracePeriod;
    
    const repaymentMonthly = P * (r * Math.pow(1 + r, repaymentPeriod)) / (Math.pow(1 + r, repaymentPeriod) - 1);
    const repaymentTotal = repaymentMonthly * repaymentPeriod;
    
    const totalPayment = graceTotal + repaymentTotal;
    const totalInterest = totalPayment - P;

    const schedule = [];
    let remainingBalance = P;
    
    for (let i = 1; i <= Math.min(12, n); i++) {
      if (i <= gracePeriod) {
        // 거치기간: 이자만 납부
        schedule.push({
          month: i,
          monthlyPayment: Math.round(graceInterest),
          principalPayment: 0,
          interestPayment: Math.round(graceInterest),
          remainingBalance: Math.round(P)
        });
      } else {
        // 상환기간: 원리금균등
        const interestPayment = remainingBalance * r;
        const principalPayment = repaymentMonthly - interestPayment;
        remainingBalance -= principalPayment;

        schedule.push({
          month: i,
          monthlyPayment: Math.round(repaymentMonthly),
          principalPayment: Math.round(principalPayment),
          interestPayment: Math.round(interestPayment),
          remainingBalance: Math.round(Math.max(0, remainingBalance))
        });
      }
    }

    return {
      type: 'balloon',
      monthlyPayment: Math.round(graceInterest), // 첫 달 기준
      totalPayment: Math.round(totalPayment),
      totalInterest: Math.round(totalInterest),
      schedule
    };
  };

  const calculateLoan = (principal: string, rate: string, term: string, types: LoanType[]): LoanResult[] => {
    const P = parseFloat(principal.replace(/,/g, ''));
    const r = parseFloat(rate) / 100 / 12; // 월 이자율
    const n = parseInt(term) * 12; // 총 개월 수

    if (!P || !r || !n || P <= 0 || r <= 0 || n <= 0) return [];

    const results: LoanResult[] = [];

    types.forEach(type => {
      switch (type) {
        case 'equal-payment':
          results.push(calculateEqualPayment(P, r, n));
          break;
        case 'equal-principal':
          results.push(calculateEqualPrincipal(P, r, n));
          break;
        case 'interest-only':
          results.push(calculateInterestOnly(P, r, n));
          break;
        case 'balloon':
          results.push(calculateBalloon(P, r, n));
          break;
      }
    });

    return results;
  };

  const handleCalculate = React.useCallback(() => {
    const calculations = calculateLoan(loanAmount, interestRate, loanTerm, selectedTypes);
    setResults(calculations);
    setShowSaveButton(calculations.length > 0);
  }, [loanAmount, interestRate, loanTerm, selectedTypes]);

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

  // 계산 결과 저장
  const handleSaveCalculation = () => {
    if (results.length === 0) return;

    const inputs = {
      loanAmount,
      interestRate,
      loanTerm,
      selectedTypes
    };

    const success = saveCalculation(inputs, { results });
    if (success) {
      setShowSaveButton(false);
    }
  };

  // 이력에서 불러오기
  const handleLoadFromHistory = (historyId: string) => {
    const inputs = loadFromHistory(historyId);
    if (inputs) {
      setLoanAmount(inputs.loanAmount || '');
      setInterestRate(inputs.interestRate || '');
      setLoanTerm(inputs.loanTerm || '');
      setSelectedTypes(inputs.selectedTypes || ['equal-payment']);
      
      // URL도 업데이트
      updateURL({
        amount: inputs.loanAmount?.replace(/,/g, '') || '',
        rate: inputs.interestRate || '',
        term: inputs.loanTerm || '',
        types: inputs.selectedTypes?.join(',') || 'equal-payment'
      });
    }
  };

  // 이력 결과 포맷팅
  const formatHistoryResult = (result: any) => {
    if (!result?.results || result.results.length === 0) return '';
    const firstResult = result.results[0];
    return `월 ${formatNumber(Math.round(firstResult.monthlyPayment))}원 (총 ${formatNumber(Math.round(firstResult.totalPayment))}원)`;
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

  const handleLoanAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/,/g, '');
    if (/^\d*$/.test(value)) {
      const formattedValue = formatNumber(Number(value));
      setLoanAmount(formattedValue);
      updateURL({ amount: value });
    }
  };

  const handleInterestRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
      setInterestRate(value);
      updateURL({ rate: value });
    }
  };

  const handleLoanTermChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*$/.test(value)) {
      setLoanTerm(value);
      updateURL({ term: value });
    }
  };

  const handleTypeToggle = (type: LoanType) => {
    setSelectedTypes(prev => {
      if (prev.includes(type)) {
        return prev.filter(t => t !== type);
      } else {
        return [...prev, type];
      }
    });
  };

  // URL에서 초기값 로드
  useEffect(() => {
    const amountParam = searchParams.get('amount');
    const rateParam = searchParams.get('rate');
    const termParam = searchParams.get('term');

    if (amountParam && /^\d+$/.test(amountParam)) {
      setLoanAmount(formatNumber(Number(amountParam)));
    }
    if (rateParam && /^\d*\.?\d*$/.test(rateParam)) {
      setInterestRate(rateParam);
    }
    if (termParam && /^\d+$/.test(termParam)) {
      setLoanTerm(termParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (loanAmount && interestRate && loanTerm && selectedTypes.length > 0) {
      handleCalculate();
    } else {
      setResults([]);
    }
  }, [loanAmount, interestRate, loanTerm, selectedTypes, handleCalculate]);

  const getTypeColor = (type: LoanType) => {
    const colors = {
      'equal-payment': 'bg-gradient-to-r from-blue-500 to-blue-600',
      'equal-principal': 'bg-gradient-to-r from-green-500 to-green-600',
      'interest-only': 'bg-gradient-to-r from-orange-500 to-orange-600',
      'balloon': 'bg-gradient-to-r from-purple-500 to-purple-600'
    };
    return colors[type];
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
          <PiggyBank className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">대출 계산기</h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-6">
          다양한 대출 방식을 비교하여 가장 적합한 상환 방법을 찾아보세요.
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

      {/* Tab Navigation */}
      <div className="flex justify-center mb-8">
        <div className="bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('calculator')}
            className={`px-6 py-2 rounded-md transition-colors ${
              activeTab === 'calculator'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <Calculator className="w-4 h-4 inline mr-2" />
            계산기
          </button>
          <button
            onClick={() => setActiveTab('CompassIcon')}
            className={`px-6 py-2 rounded-md transition-colors ${
              activeTab === 'CompassIcon'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <CompassIcon className="w-4 h-4 inline mr-2" />
            방식 비교
          </button>
        </div>
      </div>

      {activeTab === 'calculator' && (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Input Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">대출 정보 입력</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  대출금액
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={loanAmount}
                    onChange={handleLoanAmountChange}
                    placeholder="300,000,000"
                    className="w-full px-4 py-4 text-lg font-semibold text-gray-900 dark:text-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  />
                  <span className="absolute right-4 top-4 text-gray-600 dark:text-gray-400 font-medium">원</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  연 이자율
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={interestRate}
                    onChange={handleInterestRateChange}
                    placeholder="3.5"
                    className="w-full px-4 py-4 text-lg font-semibold text-gray-900 dark:text-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  />
                  <span className="absolute right-4 top-4 text-gray-600 dark:text-gray-400 font-medium">%</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  대출기간
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={loanTerm}
                    onChange={handleLoanTermChange}
                    placeholder="30"
                    className="w-full px-4 py-4 text-lg font-semibold text-gray-900 dark:text-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  />
                  <span className="absolute right-4 top-4 text-gray-600 dark:text-gray-400 font-medium">년</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  상환 방식 선택
                </label>
                <div className="space-y-2">
                  {Object.entries(loanTypes).map(([type, name]) => (
                    <label key={type} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedTypes.includes(type as LoanType)}
                        onChange={() => handleTypeToggle(type as LoanType)}
                        className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 dark:focus:ring-green-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div className="lg:col-span-2 space-y-6">
            {results.length > 0 ? (
              results.map((result) => (
                <div key={result.type} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {loanTypes[result.type]}
                    </h3>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleShare}
                        className="inline-flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 transition-colors"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span className="text-sm">복사됨!</span>
                          </>
                        ) : (
                          <>
                            <Share2 className="w-4 h-4" />
                            <span className="text-sm">공유</span>
                          </>
                        )}
                      </button>
                      
                      {showSaveButton && (
                        <button
                          onClick={handleSaveCalculation}
                          className="inline-flex items-center space-x-2 bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 px-3 py-2 rounded-lg text-blue-700 dark:text-blue-300 transition-colors"
                        >
                          <Save className="w-4 h-4" />
                          <span className="text-sm">저장</span>
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className={`${getTypeColor(result.type)} rounded-xl p-4 text-white`}>
                      <div className="text-sm opacity-90 mb-1">월 상환금액</div>
                      <div className="text-xl font-bold">
                        {formatNumber(result.monthlyPayment)}원
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4">
                      <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">총 상환금액</div>
                      <div className="text-lg font-bold text-blue-900 dark:text-blue-200">
                        {formatNumber(result.totalPayment)}원
                      </div>
                    </div>
                    
                    <div className="bg-red-50 dark:bg-red-900/30 rounded-xl p-4">
                      <div className="text-sm text-red-600 dark:text-red-400 mb-1">총 이자</div>
                      <div className="text-lg font-bold text-red-900 dark:text-red-200">
                        {formatNumber(result.totalInterest)}원
                      </div>
                    </div>
                  </div>

                  {/* 상환 스케줄 미리보기 */}
                  <div className="mt-6">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">상환 스케줄 (첫 6개월)</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <th className="text-left py-2 font-medium text-gray-700 dark:text-gray-300">회차</th>
                            <th className="text-right py-2 font-medium text-gray-700 dark:text-gray-300">월상환액</th>
                            <th className="text-right py-2 font-medium text-gray-700 dark:text-gray-300">원금</th>
                            <th className="text-right py-2 font-medium text-gray-700 dark:text-gray-300">이자</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.schedule.slice(0, 6).map((row) => (
                            <tr key={row.month} className="border-b border-gray-100 dark:border-gray-700">
                              <td className="py-2 text-gray-900 dark:text-white">{row.month}회</td>
                              <td className="py-2 text-right text-gray-900 dark:text-white">
                                {formatNumber(row.monthlyPayment)}원
                              </td>
                              <td className="py-2 text-right text-blue-600 dark:text-blue-400">
                                {formatNumber(row.principalPayment)}원
                              </td>
                              <td className="py-2 text-right text-red-600 dark:text-red-400">
                                {formatNumber(row.interestPayment)}원
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
                <div className="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-gray-500">
                  <Calculator className="w-16 h-16 mb-4" />
                  <p>대출 정보와 상환 방식을 선택하시면 계산 결과가 나타납니다</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'CompassIcon' && (
        <div className="space-y-8">
          {results.length > 1 ? (
            <>
              {/* 비교 차트 */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
                <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white flex items-center">
                  <BarChart3 className="w-6 h-6 mr-2" />
                  상환 방식 비교
                </h2>
                
                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-4">월 상환금액 비교</h3>
                    <div className="space-y-3">
                      {results.map((result) => (
                        <div key={`monthly-${result.type}`} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {loanTypes[result.type]}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {formatNumber(result.monthlyPayment)}원
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-4">총 상환금액 비교</h3>
                    <div className="space-y-3">
                      {results.map((result) => (
                        <div key={`total-${result.type}`} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {loanTypes[result.type]}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {formatNumber(result.totalPayment)}원
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-4">총 이자 비교</h3>
                    <div className="space-y-3">
                      {results.map((result) => (
                        <div key={`interest-${result.type}`} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {loanTypes[result.type]}
                          </span>
                          <span className="font-medium text-red-600 dark:text-red-400">
                            {formatNumber(result.totalInterest)}원
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 추천 */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
                <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">💡 추천</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-6">
                    <h3 className="font-semibold text-green-900 dark:text-green-200 mb-2">
                      총 이자 최소: {loanTypes[results.sort((a, b) => a.totalInterest - b.totalInterest)[0].type]}
                    </h3>
                    <p className="text-green-800 dark:text-green-300 text-sm">
                      장기적으로 가장 적은 이자를 부담하는 방식입니다.
                    </p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-6">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                      초기 부담 최소: {loanTypes[results.sort((a, b) => a.monthlyPayment - b.monthlyPayment)[0].type]}
                    </h3>
                    <p className="text-blue-800 dark:text-blue-300 text-sm">
                      초기 월 상환 부담이 가장 적은 방식입니다.
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
              <div className="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-gray-500">
                <CompassIcon className="w-16 h-16 mb-4" />
                <p>2개 이상의 상환 방식을 선택하시면 비교 분석을 제공합니다</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 상세 가이드 섹션 */}
      <div className="mt-12 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <h2 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white text-center">🚀 대출 계산 마스터 가이드</h2>
        <p className="text-lg text-gray-600 dark:text-gray-300 text-center mb-12 max-w-4xl mx-auto">
          대출 초보자부터 재테크 전문가까지! 대출의 모든 것을 마스터하는 완전한 가이드입니다. 
          똑똑한 대출로 내 집 마련부터 투자까지, 모든 금융 목표를 달성하세요!
        </p>
        
        {/* 핵심 기능 소개 */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-8 transform hover:scale-105 transition-transform">
            <div className="flex items-center mb-4">
              <div className="bg-blue-600 p-3 rounded-full mr-3">
                <Calculator className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-blue-900 dark:text-blue-200">💎 정밀 계산 시스템</h3>
            </div>
            <p className="text-blue-800 dark:text-blue-300 mb-4 leading-relaxed">
              복리 계산부터 상환 스케줄까지! 은행에서 사용하는 정확한 공식으로 계산한 신뢰할 수 있는 결과
            </p>
            <div className="space-y-3">
              <div className="bg-blue-100 dark:bg-blue-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">🔢 4가지 상환방식</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">원리금균등, 원금균등, 만기일시, 거치식 모두 지원</p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">📊 상환 스케줄</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">월별 원금·이자 분할 내역을 한눈에 확인</p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">💰 총비용 분석</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">총 상환금액과 이자비용을 명확하게 계산</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-xl p-8 transform hover:scale-105 transition-transform">
            <div className="flex items-center mb-4">
              <div className="bg-green-600 p-3 rounded-full mr-3">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-green-900 dark:text-green-200">📈 스마트 비교 분석</h3>
            </div>
            <p className="text-green-800 dark:text-green-300 mb-4 leading-relaxed">
              여러 상환방식을 동시에 비교해서 내 상황에 가장 적합한 최적의 대출 조건을 찾아드려요!
            </p>
            <div className="space-y-3">
              <div className="bg-green-100 dark:bg-green-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-green-900 dark:text-green-200 mb-1">⚖️ 다중 비교</h4>
                <p className="text-sm text-green-700 dark:text-green-300">최대 4가지 상환방식을 동시에 비교 분석</p>
              </div>
              <div className="bg-green-100 dark:bg-green-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-green-900 dark:text-green-200 mb-1">🎯 맞춤 추천</h4>
                <p className="text-sm text-green-700 dark:text-green-300">총이자 최소화 vs 초기부담 최소화 추천</p>
              </div>
              <div className="bg-green-100 dark:bg-green-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-green-900 dark:text-green-200 mb-1">📋 상세 레포트</h4>
                <p className="text-sm text-green-700 dark:text-green-300">각 방식별 장단점과 적합한 상황 안내</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl p-8 transform hover:scale-105 transition-transform">
            <div className="flex items-center mb-4">
              <div className="bg-purple-600 p-3 rounded-full mr-3">
                <PiggyBank className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-purple-900 dark:text-purple-200">⚡ 실무 최적화 도구</h3>
            </div>
            <p className="text-purple-800 dark:text-purple-300 mb-4 leading-relaxed">
              부동산 중개사부터 개인 투자자까지! 실무에서 바로 쓸 수 있는 전문가급 기능들
            </p>
            <div className="space-y-3">
              <div className="bg-purple-100 dark:bg-purple-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-purple-900 dark:text-purple-200 mb-1">📂 계산 이력 관리</h4>
                <p className="text-sm text-purple-700 dark:text-purple-300">여러 대출 상품을 저장하고 비교 검토</p>
              </div>
              <div className="bg-purple-100 dark:bg-purple-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-purple-900 dark:text-purple-200 mb-1">🔗 URL 공유</h4>
                <p className="text-sm text-purple-700 dark:text-purple-300">계산 결과를 고객이나 가족과 간편 공유</p>
              </div>
              <div className="bg-purple-100 dark:bg-purple-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-purple-900 dark:text-purple-200 mb-1">📱 반응형 디자인</h4>
                <p className="text-sm text-purple-700 dark:text-purple-300">PC, 태블릿, 모바일 어디서든 완벽하게</p>
              </div>
            </div>
          </div>
        </div>

        {/* 대출 상환방식 완전정복 */}
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/30 dark:to-blue-900/30 rounded-2xl p-8 mb-12">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">🏦 대출 상환방식 완전정복</h3>
          <p className="text-center text-gray-600 dark:text-gray-300 mb-8">내 상황에 맞는 최적의 상환방식을 찾으세요! 각 방식의 특징부터 활용법까지 완벽 해설</p>
          
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <h4 className="text-xl font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center">
                <span className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full mr-3">💙</span>
                원리금균등상환 (가장 일반적)
              </h4>
              <div className="space-y-4">
                <div className="border-l-4 border-blue-400 pl-4">
                  <h5 className="font-semibold text-blue-600">💡 핵심 특징</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">매월 동일한 금액 상환, 예측 가능한 가계 관리</p>
                  <div className="mt-2 text-xs text-blue-500 space-y-1">
                    <p>• 초기: 이자↑ 원금↓ → 후기: 이자↓ 원금↑</p>
                    <p>• 가장 일반적인 주택담보대출 방식</p>
                    <p>• 월 부담액이 일정해서 가계 관리 편리</p>
                  </div>
                </div>
                <div className="border-l-4 border-green-400 pl-4">
                  <h5 className="font-semibold text-green-600">✅ 이런 분께 추천</h5>
                  <div className="mt-2 text-xs text-green-500 space-y-1">
                    <p>• 안정적인 월소득이 있는 직장인</p>
                    <p>• 가계 예산 관리를 간단하게 하고 싶은 분</p>
                    <p>• 처음 대출받는 초보자</p>
                    <p>• 장기간 일정한 부담을 선호하는 분</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <h4 className="text-xl font-semibold text-green-600 dark:text-green-400 mb-4 flex items-center">
                <span className="bg-green-100 dark:bg-green-900 p-2 rounded-full mr-3">💚</span>
                원금균등상환 (이자 절약형)
              </h4>
              <div className="space-y-4">
                <div className="border-l-4 border-green-400 pl-4">
                  <h5 className="font-semibold text-green-600">💡 핵심 특징</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">매월 원금은 동일, 이자는 점차 감소</p>
                  <div className="mt-2 text-xs text-green-500 space-y-1">
                    <p>• 초기 부담↑ → 후기 부담↓ (감소형)</p>
                    <p>• 총 이자비용이 가장 적음</p>
                    <p>• 빠른 원금 상환으로 이자 부담 최소화</p>
                  </div>
                </div>
                <div className="border-l-4 border-blue-400 pl-4">
                  <h5 className="font-semibold text-blue-600">✅ 이런 분께 추천</h5>
                  <div className="mt-2 text-xs text-blue-500 space-y-1">
                    <p>• 초기 여유자금이 충분한 분</p>
                    <p>• 총 이자비용 최소화가 목표인 분</p>
                    <p>• 시간이 지날수록 소득 감소 예상되는 분</p>
                    <p>• 장기투자 목적으로 대출받는 분</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <h4 className="text-xl font-semibold text-orange-600 dark:text-orange-400 mb-4 flex items-center">
                <span className="bg-orange-100 dark:bg-orange-900 p-2 rounded-full mr-3">🧡</span>
                만기일시상환 (투자자형)
              </h4>
              <div className="space-y-4">
                <div className="border-l-4 border-orange-400 pl-4">
                  <h5 className="font-semibold text-orange-600">💡 핵심 특징</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">매월 이자만 납부, 만기에 원금 일시상환</p>
                  <div className="mt-2 text-xs text-orange-500 space-y-1">
                    <p>• 월 부담액: 이자만 (가장 낮음)</p>
                    <p>• 만기에 목돈 준비 필수</p>
                    <p>• 투자수익률이 대출금리보다 높을 때 유리</p>
                  </div>
                </div>
                <div className="border-l-4 border-purple-400 pl-4">
                  <h5 className="font-semibold text-purple-600">✅ 이런 분께 추천</h5>
                  <div className="mt-2 text-xs text-purple-500 space-y-1">
                    <p>• 투자 경험이 많은 분</p>
                    <p>• 만기에 목돈 확보 계획이 확실한 분</p>
                    <p>• 월 현금흐름을 최대한 확보하고 싶은 분</p>
                    <p>• 부동산 투자용 대출받는 분</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <h4 className="text-xl font-semibold text-purple-600 dark:text-purple-400 mb-4 flex items-center">
                <span className="bg-purple-100 dark:bg-purple-900 p-2 rounded-full mr-3">💜</span>
                거치식대출 (준비기간형)
              </h4>
              <div className="space-y-4">
                <div className="border-l-4 border-purple-400 pl-4">
                  <h5 className="font-semibold text-purple-600">💡 핵심 특징</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">일정기간 이자만 납부 후 원리금 상환 시작</p>
                  <div className="mt-2 text-xs text-purple-500 space-y-1">
                    <p>• 거치기간: 이자만 납부 (보통 1~5년)</p>
                    <p>• 상환기간: 원리금균등 또는 원금균등</p>
                    <p>• 초기 부담 최소화, 소득 안정화 시간 확보</p>
                  </div>
                </div>
                <div className="border-l-4 border-red-400 pl-4">
                  <h5 className="font-semibold text-red-600">✅ 이런 분께 추천</h5>
                  <div className="mt-2 text-xs text-red-500 space-y-1">
                    <p>• 사업 초기로 소득이 불안정한 분</p>
                    <p>• 향후 소득 증가가 확실한 분</p>
                    <p>• 전세자금대출 후 매매 전환 예정인 분</p>
                    <p>• 리모델링 등으로 일시적 자금이 필요한 분</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 대출 이자율 이해하기 */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 rounded-2xl p-8 mb-12">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">💰 대출 이자율 완벽 이해</h3>
          <p className="text-center text-gray-600 dark:text-gray-300 mb-8">0.1%만 낮춰도 수백만원 절약! 이자율의 모든 것을 파헤쳐보세요</p>
          
          <div className="grid lg:grid-cols-2 gap-8 mb-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <h4 className="text-lg font-semibold text-amber-600 dark:text-amber-400 mb-4 flex items-center">
                <span className="bg-amber-100 dark:bg-amber-900 p-2 rounded-full mr-2">📊</span>
                이자율 구성 요소
              </h4>
              <div className="space-y-3">
                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-1">기준금리</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">한국은행 기준금리 + 은행별 가산금리</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-1">신용도 가산금리</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">개인 신용등급에 따른 추가 금리 (1~6등급)</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-1">LTV/DTI 가산금리</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">담보비율과 소득대비 부채비율에 따른 금리</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <h4 className="text-lg font-semibold text-green-600 dark:text-green-400 mb-4 flex items-center">
                <span className="bg-green-100 dark:bg-green-900 p-2 rounded-full mr-2">💡</span>
                이자율 낮추는 방법
              </h4>
              <div className="space-y-3">
                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-1">신용등급 관리</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">연체 방지, 신용카드 적정 사용, 다양한 금융거래</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-1">LTV 낮추기</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">자기자금 비율 높이기, 담보가치 상승 활용</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-1">은행별 비교</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">시중은행, 저축은행, 상호금고 금리 비교</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg">
            <h5 className="font-semibold text-red-900 dark:text-red-200 mb-3">⚠️ 0.1% 차이의 위력 (3억원 30년 기준)</h5>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="font-bold text-red-600">연 3.0%</div>
                <div className="text-red-800 dark:text-red-300">월 126만원</div>
                <div className="text-xs text-red-600">총 4억 5,486만원</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-orange-600">연 3.1%</div>
                <div className="text-orange-800 dark:text-orange-300">월 127만원</div>
                <div className="text-xs text-orange-600">총 4억 5,874만원</div>
              </div>
              <div className="text-center bg-yellow-100 dark:bg-yellow-900/20 p-2 rounded">
                <div className="font-bold text-yellow-900 dark:text-yellow-200">차이</div>
                <div className="text-yellow-800 dark:text-yellow-300">월 1만원↑</div>
                <div className="text-xs text-yellow-600 font-bold">총 388만원 더!</div>
              </div>
            </div>
          </div>
        </div>

        {/* 똑똑한 대출 전략 */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-2xl p-8 mb-12">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">🧠 똑똑한 대출 전략 가이드</h3>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <div className="text-center mb-4">
                <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-3">
                  <span className="text-2xl">🏠</span>
                </div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white">주택 구매 전략</h4>
              </div>
              <div className="space-y-3">
                <div className="border-l-4 border-blue-400 pl-4">
                  <h5 className="font-semibold text-blue-600">📋 LTV/DTI 관리</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">LTV 70% 이하, DTI 40% 이하 유지로 최적 금리</p>
                </div>
                <div className="border-l-4 border-blue-400 pl-4">
                  <h5 className="font-semibold text-blue-600">🏦 혼합대출 활용</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">주택담보대출 + 전세자금대출 조합으로 한도 확대</p>
                </div>
                <div className="border-l-4 border-blue-400 pl-4">
                  <h5 className="font-semibold text-blue-600">⏰ 금리 사이클</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">금리 하락기에는 변동금리, 상승기에는 고정금리</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <div className="text-center mb-4">
                <div className="bg-green-100 dark:bg-green-900 p-3 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-3">
                  <span className="text-2xl">📈</span>
                </div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white">투자용 대출</h4>
              </div>
              <div className="space-y-3">
                <div className="border-l-4 border-green-400 pl-4">
                  <h5 className="font-semibold text-green-600">🎯 수익률 계산</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">투자수익률 + 대출금리 + 세금 + 리스크</p>
                </div>
                <div className="border-l-4 border-green-400 pl-4">
                  <h5 className="font-semibold text-green-600">💼 레버리지 관리</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">안전한 레버리지 비율 유지 (자산 대비 50% 이하)</p>
                </div>
                <div className="border-l-4 border-green-400 pl-4">
                  <h5 className="font-semibold text-green-600">🛡️ 리스크 관리</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">비상자금 확보, 분산투자, 손실 한도 설정</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <div className="text-center mb-4">
                <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-3">
                  <span className="text-2xl">⚖️</span>
                </div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white">대환·중도상환</h4>
              </div>
              <div className="space-y-3">
                <div className="border-l-4 border-purple-400 pl-4">
                  <h5 className="font-semibold text-purple-600">🔄 대환 타이밍</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">금리차 1%p 이상 또는 중도상환수수료 </p>
                </div>
                <div className="border-l-4 border-purple-400 pl-4">
                  <h5 className="font-semibold text-purple-600">💰 중도상환 전략</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">투자수익률 vs 대출금리 비교 후 결정</p>
                </div>
                <div className="border-l-4 border-purple-400 pl-4">
                  <h5 className="font-semibold text-purple-600">📅 상환 스케줄</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">원금 비중 높은 후반기보다 초반기 상환이 유리</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 대출 신청 프로세스 가이드 */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-2xl p-8">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">📋 대출 신청 완벽 가이드</h3>
          <div className="grid lg:grid-cols-2 gap-8">
            <div>
              <h4 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-4 flex items-center">
                <span className="bg-indigo-100 dark:bg-indigo-900 p-2 rounded-full mr-2">📝</span>
                준비 서류 체크리스트
              </h4>
              <div className="space-y-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <h5 className="font-semibold text-indigo-600 mb-2">🆔 신분·소득 증명</h5>
                  <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <p>• 신분증, 주민등록등본</p>
                    <p>• 재직증명서, 소득금액증명원</p>
                    <p>• 급여명세서 3개월분</p>
                    <p>• 건강보험료 납부확인서</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <h5 className="font-semibold text-indigo-600 mb-2">🏠 담보 관련 서류</h5>
                  <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <p>• 등기부등본, 건축물대장</p>
                    <p>• 매매계약서 (또는 전세계약서)</p>
                    <p>• 감정평가서 (은행에서 의뢰)</p>
                    <p>• 건물 및 화재보험 가입증서</p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-purple-600 dark:text-purple-400 mb-4 flex items-center">
                <span className="bg-purple-100 dark:bg-purple-900 p-2 rounded-full mr-2">🚀</span>
                승인 확률 높이는 팁
              </h4>
              <div className="space-y-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <h5 className="font-semibold text-purple-600 mb-2">✅ 신용도 관리</h5>
                  <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <p>• 대출 신청 3개월 전부터 연체 금지</p>
                    <p>• 신용카드 사용률 30% 이하 유지</p>
                    <p>• 단기간 여러 은행 조회 피하기</p>
                    <p>• 기존 대출 정리 후 신청</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <h5 className="font-semibold text-purple-600 mb-2">⚡ 심사 가속화</h5>
                  <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <p>• 주거래 은행 우선 신청</p>
                    <p>• 서류 미비 없도록 사전 점검</p>
                    <p>• 담당자와 적극적 소통</p>
                    <p>• 대출 목적 명확히 설명</p>
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

const LoanCalculator = () => {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div></div>}>
      <LoanCalculatorContent />
    </Suspense>
  );
};

export default LoanCalculator;