'use client'

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calculator, TrendingDown, PiggyBank, BarChart3, CompassIcon, Share2, Check } from 'lucide-react';

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
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          다양한 대출 방식을 비교하여 가장 적합한 상환 방법을 찾아보세요.
        </p>
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

      {/* 상환 방식 설명 */}
      <div className="mt-12 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
        <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">📚 상환 방식 안내</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">원리금균등상환</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                매월 동일한 금액을 상환. 초기에는 이자 비중이 높고 점차 원금 비중이 증가
              </p>
            </div>
            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">원금균등상환</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                매월 동일한 원금을 상환. 초기 부담이 크지만 총 이자는 가장 적음
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="border-l-4 border-orange-500 pl-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">만기일시상환</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                매월 이자만 납부하고 만기에 원금을 일시 상환
              </p>
            </div>
            <div className="border-l-4 border-purple-500 pl-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">거치식대출</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                일정 기간(2년) 이자만 납부 후 나머지 기간 원리금균등상환
              </p>
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