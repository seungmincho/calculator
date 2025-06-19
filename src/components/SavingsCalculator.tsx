'use client'

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Target, Coins, BarChart3, Calculator, Share2, Check, Save } from 'lucide-react';
import { useCalculationHistory } from '@/hooks/useCalculationHistory';
import CalculationHistory from '@/components/CalculationHistory';

type SavingsType = 'regular' | 'free' | 'target' | 'compound';

interface SavingsResult {
  type: SavingsType;
  totalSaved: number;
  totalInterest: number;
  finalAmount: number;
  effectiveRate: number;
  schedule: Array<{
    month: number;
    monthlyDeposit: number;
    accumulatedPrincipal: number;
    accumulatedInterest: number;
    totalBalance: number;
  }>;
}

const SavingsCalculatorContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [monthlyAmount, setMonthlyAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [savingsPeriod, setSavingsPeriod] = useState('');
  const [periodUnit, setPeriodUnit] = useState<'year' | 'month'>('year');
  const [targetAmount, setTargetAmount] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<SavingsType[]>(['regular']);
  const [results, setResults] = useState<SavingsResult[]>([]);
  const [activeTab, setActiveTab] = useState<'calculator' | 'goal' | 'comparison'>('calculator');
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
  } = useCalculationHistory('savings');

  const savingsTypes = {
    'regular': '정기적금',
    'free': '자유적금',
    'target': '목표적금',
    'compound': '복리적금'
  };

  // 정기적금 계산 (매월 일정 금액)
  const calculateRegularSavings = (monthly: number, rate: number, months: number): SavingsResult => {
    const monthlyRate = rate / 100 / 12;
    let totalBalance = 0;
    let totalPrincipal = 0;
    
    const schedule = [];
    
    for (let i = 1; i <= months; i++) {
      totalPrincipal += monthly;
      // 적금 이자 계산: 각 월 납입금에 대한 이자를 납입 시점부터 만기까지 계산
      const interestForThisMonth = monthly * monthlyRate * (months - i + 1);
      totalBalance = totalPrincipal;
      
      // 중간 계산을 위해 현재까지의 누적 이자 계산
      let accumulatedInterest = 0;
      for (let j = 1; j <= i; j++) {
        accumulatedInterest += monthly * monthlyRate * (months - j + 1);
      }
      
      schedule.push({
        month: i,
        monthlyDeposit: monthly,
        accumulatedPrincipal: totalPrincipal,
        accumulatedInterest: accumulatedInterest,
        totalBalance: totalPrincipal + accumulatedInterest
      });
    }
    
    // 총 이자 계산
    let totalInterest = 0;
    for (let i = 1; i <= months; i++) {
      totalInterest += monthly * monthlyRate * (months - i + 1);
    }
    
    const finalAmount = totalPrincipal + totalInterest;
    const effectiveRate = (totalInterest / totalPrincipal) * 100;

    return {
      type: 'regular',
      totalSaved: totalPrincipal,
      totalInterest: Math.round(totalInterest),
      finalAmount: Math.round(finalAmount),
      effectiveRate: effectiveRate,
      schedule: schedule.map(s => ({
        ...s,
        accumulatedInterest: Math.round(s.accumulatedInterest),
        totalBalance: Math.round(s.totalBalance)
      }))
    };
  };

  // 자유적금 계산 (불규칙 납입, 평균으로 계산)
  const calculateFreeSavings = (monthly: number, rate: number, months: number): SavingsResult => {
    const regular = calculateRegularSavings(monthly, rate, months);
    // 자유적금은 일반적으로 정기적금보다 이자율이 약간 낮음 (90% 적용)
    const adjustedInterest = regular.totalInterest * 0.9;
    
    return {
      ...regular,
      type: 'free',
      totalInterest: Math.round(adjustedInterest),
      finalAmount: regular.totalSaved + Math.round(adjustedInterest),
      effectiveRate: (adjustedInterest / regular.totalSaved) * 100
    };
  };

  // 목표적금 계산 (목표금액 달성을 위한 월 납입액 계산)
  const calculateTargetSavings = (target: number, rate: number, months: number): SavingsResult => {
    const monthlyRate = rate / 100 / 12;
    
    // 목표금액을 달성하기 위한 월 납입액 계산
    let totalInterestRatio = 0;
    for (let i = 1; i <= months; i++) {
      totalInterestRatio += monthlyRate * (months - i + 1);
    }
    
    const requiredMonthly = target / (months + totalInterestRatio);
    const totalPrincipal = requiredMonthly * months;
    const totalInterest = target - totalPrincipal;
    
    const schedule = [];
    let accumulatedPrincipal = 0;
    
    for (let i = 1; i <= Math.min(12, months); i++) {
      accumulatedPrincipal += requiredMonthly;
      let accumulatedInterest = 0;
      for (let j = 1; j <= i; j++) {
        accumulatedInterest += requiredMonthly * monthlyRate * (months - j + 1);
      }
      
      schedule.push({
        month: i,
        monthlyDeposit: Math.round(requiredMonthly),
        accumulatedPrincipal: Math.round(accumulatedPrincipal),
        accumulatedInterest: Math.round(accumulatedInterest),
        totalBalance: Math.round(accumulatedPrincipal + accumulatedInterest)
      });
    }

    return {
      type: 'target',
      totalSaved: Math.round(totalPrincipal),
      totalInterest: Math.round(totalInterest),
      finalAmount: target,
      effectiveRate: totalPrincipal > 0 ? (totalInterest / totalPrincipal) * 100 : 0,
      schedule
    };
  };

  // 복리적금 계산 (월복리 적용)
  const calculateCompoundSavings = (monthly: number, rate: number, months: number): SavingsResult => {
    const monthlyRate = rate / 100 / 12;
    let totalBalance = 0;
    const schedule = [];
    
    for (let i = 1; i <= months; i++) {
      totalBalance = (totalBalance + monthly) * (1 + monthlyRate);
      
      schedule.push({
        month: i,
        monthlyDeposit: monthly,
        accumulatedPrincipal: monthly * i,
        accumulatedInterest: Math.round(totalBalance - (monthly * i)),
        totalBalance: Math.round(totalBalance)
      });
    }
    
    const totalPrincipal = monthly * months;
    const totalInterest = totalBalance - totalPrincipal;
    const effectiveRate = (totalInterest / totalPrincipal) * 100;

    return {
      type: 'compound',
      totalSaved: totalPrincipal,
      totalInterest: Math.round(totalInterest),
      finalAmount: Math.round(totalBalance),
      effectiveRate: effectiveRate,
      schedule
    };
  };

  const calculateSavings = React.useCallback((
    monthly: string, 
    rate: string, 
    period: string, 
    unit: 'year' | 'month',
    target: string, 
    types: SavingsType[]
  ): SavingsResult[] => {
    const monthlyNum = parseFloat(monthly.replace(/,/g, '')) || 0;
    const rateNum = parseFloat(rate) || 0;
    const periodNum = parseInt(period) || 0;
    const months = unit === 'year' ? periodNum * 12 : periodNum;
    const targetNum = parseFloat(target.replace(/,/g, '')) || 0;

    if (rateNum <= 0 || months <= 0) return [];

    const results: SavingsResult[] = [];

    types.forEach(type => {
      try {
        switch (type) {
          case 'regular':
            if (monthlyNum > 0) {
              results.push(calculateRegularSavings(monthlyNum, rateNum, months));
            }
            break;
          case 'free':
            if (monthlyNum > 0) {
              results.push(calculateFreeSavings(monthlyNum, rateNum, months));
            }
            break;
          case 'target':
            if (targetNum > 0) {
              results.push(calculateTargetSavings(targetNum, rateNum, months));
            }
            break;
          case 'compound':
            if (monthlyNum > 0) {
              results.push(calculateCompoundSavings(monthlyNum, rateNum, months));
            }
            break;
        }
      } catch (error) {
        console.error(`Error calculating ${type}:`, error);
      }
    });

    return results;
  }, []);

  const handleCalculate = React.useCallback(() => {
    if (!interestRate || !savingsPeriod || selectedTypes.length === 0) {
      setResults([]);
      return;
    }
    
    const hasMonthlyAmount = monthlyAmount && parseFloat(monthlyAmount.replace(/,/g, '')) > 0;
    const hasTargetAmount = targetAmount && parseFloat(targetAmount.replace(/,/g, '')) > 0;
    
    if (!hasMonthlyAmount && !hasTargetAmount) {
      setResults([]);
      return;
    }
    
    // 목표적금이 선택되었지만 목표금액이 없는 경우
    if (selectedTypes.includes('target') && !hasTargetAmount) {
      const filteredTypes = selectedTypes.filter(type => type !== 'target');
      if (filteredTypes.length === 0) {
        setResults([]);
        return;
      }
      const calculations = calculateSavings(monthlyAmount, interestRate, savingsPeriod, periodUnit, targetAmount, filteredTypes);
      setResults(calculations);
      return;
    }
    
    const calculations = calculateSavings(monthlyAmount, interestRate, savingsPeriod, periodUnit, targetAmount, selectedTypes);
    setResults(calculations);
    setShowSaveButton(calculations.length > 0);
  }, [monthlyAmount, interestRate, savingsPeriod, periodUnit, targetAmount, selectedTypes, calculateSavings]);

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
      monthlyAmount,
      interestRate,
      savingsPeriod,
      periodUnit,
      targetAmount,
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
      setMonthlyAmount(inputs.monthlyAmount || '');
      setInterestRate(inputs.interestRate || '');
      setSavingsPeriod(inputs.savingsPeriod || '');
      setPeriodUnit(inputs.periodUnit || 'year');
      setTargetAmount(inputs.targetAmount || '');
      setSelectedTypes(inputs.selectedTypes || ['regular']);
      
      // URL도 업데이트
      updateURL({
        monthly: inputs.monthlyAmount?.replace(/,/g, '') || '',
        rate: inputs.interestRate || '',
        period: inputs.savingsPeriod || '',
        unit: inputs.periodUnit || 'year',
        target: inputs.targetAmount?.replace(/,/g, '') || '',
        types: inputs.selectedTypes?.join(',') || 'regular'
      });
    }
  };

  // 이력 결과 포맷팅
  const formatHistoryResult = (result: any) => {
    if (!result?.results || result.results.length === 0) return '';
    const firstResult = result.results[0];
    return `월 ${formatNumber(Math.round(firstResult.totalSaved / (firstResult.schedule?.length || 12)))}원 → ${formatNumber(Math.round(firstResult.finalAmount))}원`;
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

  const handleMonthlyAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/,/g, '');
    if (/^\d*$/.test(value)) {
      const formattedValue = formatNumber(Number(value));
      setMonthlyAmount(formattedValue);
      updateURL({ monthly: value });
    }
  };

  const handleTargetAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/,/g, '');
    if (/^\d*$/.test(value)) {
      const formattedValue = formatNumber(Number(value));
      setTargetAmount(formattedValue);
      updateURL({ target: value });
    }
  };

  const handleInterestRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
      setInterestRate(value);
      updateURL({ rate: value });
    }
  };

  const handlePeriodChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*$/.test(value)) {
      setSavingsPeriod(value);
      updateURL({ period: value });
    }
  };

  const handleTypeToggle = (type: SavingsType) => {
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
    const monthlyParam = searchParams.get('monthly');
    const targetParam = searchParams.get('target');
    const rateParam = searchParams.get('rate');
    const periodParam = searchParams.get('period');
    const unitParam = searchParams.get('unit');

    if (monthlyParam && /^\d+$/.test(monthlyParam)) {
      setMonthlyAmount(formatNumber(Number(monthlyParam)));
    }
    if (targetParam && /^\d+$/.test(targetParam)) {
      setTargetAmount(formatNumber(Number(targetParam)));
    }
    if (rateParam && /^\d*\.?\d*$/.test(rateParam)) {
      setInterestRate(rateParam);
    }
    if (periodParam && /^\d+$/.test(periodParam)) {
      setSavingsPeriod(periodParam);
    }
    if (unitParam && (unitParam === 'year' || unitParam === 'month')) {
      setPeriodUnit(unitParam);
    }
  }, [searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleCalculate();
    }, 100); // 100ms 디바운스 추가

    return () => clearTimeout(timer);
  }, [handleCalculate]);

  const getTypeColor = (type: SavingsType) => {
    const colors = {
      'regular': 'bg-gradient-to-r from-blue-500 to-blue-600',
      'free': 'bg-gradient-to-r from-green-500 to-green-600',
      'target': 'bg-gradient-to-r from-purple-500 to-purple-600',
      'compound': 'bg-gradient-to-r from-orange-500 to-orange-600'
    };
    return colors[type];
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full mb-4">
          <Coins className="w-8 h-8 text-emerald-600" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">적금 계산기</h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-6">
          다양한 적금 상품을 비교하고 목표 금액 달성을 위한 최적의 저축 계획을 세워보세요.
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
            onClick={() => setActiveTab('goal')}
            className={`px-6 py-2 rounded-md transition-colors ${
              activeTab === 'goal'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <Target className="w-4 h-4 inline mr-2" />
            목표 설정
          </button>
          <button
            onClick={() => setActiveTab('comparison')}
            className={`px-6 py-2 rounded-md transition-colors ${
              activeTab === 'comparison'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <BarChart3 className="w-4 h-4 inline mr-2" />
            상품 비교
          </button>
        </div>
      </div>

      {activeTab === 'calculator' && (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Input Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">적금 정보 입력</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  월 납입금액
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={monthlyAmount}
                    onChange={handleMonthlyAmountChange}
                    placeholder="500,000"
                    className="w-full px-4 py-4 text-lg font-semibold text-gray-900 dark:text-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
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
                    placeholder="4.5"
                    className="w-full px-4 py-4 text-lg font-semibold text-gray-900 dark:text-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  />
                  <span className="absolute right-4 top-4 text-gray-600 dark:text-gray-400 font-medium">%</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  저축기간
                </label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={savingsPeriod}
                      onChange={handlePeriodChange}
                      placeholder={periodUnit === 'year' ? '3' : '36'}
                      className="w-full px-4 py-4 text-lg font-semibold text-gray-900 dark:text-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    />
                  </div>
                  <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setPeriodUnit('year');
                        updateURL({ unit: 'year' });
                      }}
                      className={`px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                        periodUnit === 'year'
                          ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      년
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPeriodUnit('month');
                        updateURL({ unit: 'month' });
                      }}
                      className={`px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                        periodUnit === 'month'
                          ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      개월
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  목표금액 (목표적금용)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={targetAmount}
                    onChange={handleTargetAmountChange}
                    placeholder="20,000,000"
                    className="w-full px-4 py-4 text-lg font-semibold text-gray-900 dark:text-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  />
                  <span className="absolute right-4 top-4 text-gray-600 dark:text-gray-400 font-medium">원</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  적금 유형 선택
                </label>
                <div className="space-y-2">
                  {Object.entries(savingsTypes).map(([type, name]) => (
                    <label key={type} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedTypes.includes(type as SavingsType)}
                        onChange={() => handleTypeToggle(type as SavingsType)}
                        className="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500 dark:focus:ring-emerald-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
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
                      {savingsTypes[result.type]}
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
                          className="inline-flex items-center space-x-2 bg-emerald-100 dark:bg-emerald-900 hover:bg-emerald-200 dark:hover:bg-emerald-800 px-3 py-2 rounded-lg text-emerald-700 dark:text-emerald-300 transition-colors"
                        >
                          <Save className="w-4 h-4" />
                          <span className="text-sm">저장</span>
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-4 gap-4">
                    <div className={`${getTypeColor(result.type)} rounded-xl p-4 text-white`}>
                      <div className="text-sm opacity-90 mb-1">
                        {result.type === 'target' ? '필요 월납입액' : '만기 수령액'}
                      </div>
                      <div className="text-xl font-bold">
                        {result.type === 'target' 
                          ? `${formatNumber(Math.round(result.totalSaved / (periodUnit === 'year' ? parseInt(savingsPeriod) * 12 : parseInt(savingsPeriod))))}원`
                          : `${formatNumber(result.finalAmount)}원`
                        }
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4">
                      <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">총 납입액</div>
                      <div className="text-lg font-bold text-blue-900 dark:text-blue-200">
                        {formatNumber(result.totalSaved)}원
                      </div>
                    </div>
                    
                    <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-4">
                      <div className="text-sm text-green-600 dark:text-green-400 mb-1">총 이자</div>
                      <div className="text-lg font-bold text-green-900 dark:text-green-200">
                        {formatNumber(result.totalInterest)}원
                      </div>
                    </div>
                    
                    <div className="bg-purple-50 dark:bg-purple-900/30 rounded-xl p-4">
                      <div className="text-sm text-purple-600 dark:text-purple-400 mb-1">실질 수익률</div>
                      <div className="text-lg font-bold text-purple-900 dark:text-purple-200">
                        {result.effectiveRate.toFixed(2)}%
                      </div>
                    </div>
                  </div>

                  {/* 적금 스케줄 미리보기 */}
                  <div className="mt-6">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">적금 스케줄 (첫 6개월)</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <th className="text-left py-2 font-medium text-gray-700 dark:text-gray-300">월차</th>
                            <th className="text-right py-2 font-medium text-gray-700 dark:text-gray-300">월납입</th>
                            <th className="text-right py-2 font-medium text-gray-700 dark:text-gray-300">누적원금</th>
                            <th className="text-right py-2 font-medium text-gray-700 dark:text-gray-300">누적이자</th>
                            <th className="text-right py-2 font-medium text-gray-700 dark:text-gray-300">잔액</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.schedule.slice(0, 6).map((row) => (
                            <tr key={row.month} className="border-b border-gray-100 dark:border-gray-700">
                              <td className="py-2 text-gray-900 dark:text-white">{row.month}개월</td>
                              <td className="py-2 text-right text-gray-900 dark:text-white">
                                {formatNumber(row.monthlyDeposit)}원
                              </td>
                              <td className="py-2 text-right text-blue-600 dark:text-blue-400">
                                {formatNumber(row.accumulatedPrincipal)}원
                              </td>
                              <td className="py-2 text-right text-green-600 dark:text-green-400">
                                {formatNumber(row.accumulatedInterest)}원
                              </td>
                              <td className="py-2 text-right text-purple-600 dark:text-purple-400">
                                {formatNumber(row.totalBalance)}원
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
                  <p>적금 정보와 상품 유형을 선택하시면 계산 결과가 나타납니다</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'goal' && (
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white flex items-center">
              <Target className="w-6 h-6 mr-2" />
              목표 금액 달성 계획
            </h2>
            
            {results.find(r => r.type === 'target') ? (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                  <h3 className="text-lg font-semibold mb-4">목표 달성 정보</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-purple-100 text-sm">목표 금액</div>
                      <div className="text-2xl font-bold">{formatNumber(results.find(r => r.type === 'target')!.finalAmount)}원</div>
                    </div>
                    <div>
                      <div className="text-purple-100 text-sm">필요 월납입액</div>
                      <div className="text-2xl font-bold">
                        {formatNumber(Math.round(results.find(r => r.type === 'target')!.totalSaved / (periodUnit === 'year' ? parseInt(savingsPeriod) * 12 : parseInt(savingsPeriod))))}원
                      </div>
                    </div>
                    <div>
                      <div className="text-purple-100 text-sm">예상 이자수익</div>
                      <div className="text-2xl font-bold">{formatNumber(results.find(r => r.type === 'target')!.totalInterest)}원</div>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-6">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-3">💡 목표 달성 팁</h4>
                    <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-2">
                      <li>• 자동이체를 설정하여 꾸준히 납입하세요</li>
                      <li>• 금리가 높은 상품을 선택하세요</li>
                      <li>• 중간에 해지하지 않도록 주의하세요</li>
                    </ul>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-6">
                    <h4 className="font-semibold text-green-900 dark:text-green-200 mb-3">📈 추가 절약 방법</h4>
                    <ul className="text-sm text-green-800 dark:text-green-300 space-y-2">
                      <li>• 보너스가 있을 때 추가 납입하세요</li>
                      <li>• 가계부를 써서 불필요한 지출을 줄이세요</li>
                      <li>• 부업이나 투자로 추가 수입을 만드세요</li>
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-gray-500">
                <Target className="w-16 h-16 mb-4" />
                <p>목표 금액과 저축 기간을 입력하고 '목표적금'을 선택하세요</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'comparison' && (
        <div className="space-y-8">
          {results.length > 1 ? (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
                <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white flex items-center">
                  <BarChart3 className="w-6 h-6 mr-2" />
                  적금 상품 비교
                </h2>
                
                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-4">만기 수령액 비교</h3>
                    <div className="space-y-3">
                      {results.map((result) => (
                        <div key={`final-${result.type}`} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {savingsTypes[result.type]}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {formatNumber(result.finalAmount)}원
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
                            {savingsTypes[result.type]}
                          </span>
                          <span className="font-medium text-green-600 dark:text-green-400">
                            {formatNumber(result.totalInterest)}원
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-4">실질 수익률 비교</h3>
                    <div className="space-y-3">
                      {results.map((result) => (
                        <div key={`rate-${result.type}`} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {savingsTypes[result.type]}
                          </span>
                          <span className="font-medium text-purple-600 dark:text-purple-400">
                            {result.effectiveRate.toFixed(2)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
                <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">💡 상품별 특징</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-6">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                      최고 수익률: {savingsTypes[results.sort((a, b) => b.effectiveRate - a.effectiveRate)[0].type]}
                    </h3>
                    <p className="text-blue-800 dark:text-blue-300 text-sm">
                      가장 높은 수익률을 제공하는 상품입니다.
                    </p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-6">
                    <h3 className="font-semibold text-green-900 dark:text-green-200 mb-2">
                      최대 수령액: {savingsTypes[results.sort((a, b) => b.finalAmount - a.finalAmount)[0].type]}
                    </h3>
                    <p className="text-green-800 dark:text-green-300 text-sm">
                      만기 시 가장 많은 금액을 받을 수 있는 상품입니다.
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
              <div className="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-gray-500">
                <BarChart3 className="w-16 h-16 mb-4" />
                <p>2개 이상의 적금 상품을 선택하시면 비교 분석을 제공합니다</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 적금 상품 설명 */}
      <div className="mt-12 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
        <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">📚 적금 상품 안내</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">정기적금</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                매월 일정한 금액을 납입하는 가장 기본적인 적금 상품
              </p>
            </div>
            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">자유적금</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                납입금액과 횟수를 자유롭게 조절할 수 있는 유연한 적금 상품
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="border-l-4 border-purple-500 pl-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">목표적금</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                목표 금액을 설정하고 이를 달성하기 위한 월 납입액을 계산
              </p>
            </div>
            <div className="border-l-4 border-orange-500 pl-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">복리적금</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                매월 이자가 원금에 더해져 복리 효과를 누리는 적금 상품
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 저축 팁 */}
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
        <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">💡 오늘의 저축 팁</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-lg p-6">
            <h3 className="font-semibold text-emerald-900 dark:text-emerald-200 mb-2">적금 선택 요령</h3>
            <p className="text-emerald-800 dark:text-emerald-300 text-sm">
              금리뿐만 아니라 우대조건, 중도해지 시 이자율 등을 종합적으로 고려하세요.
            </p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">자동이체 활용</h3>
            <p className="text-blue-800 dark:text-blue-300 text-sm">
              급여일 다음날 자동이체를 설정하여 저축을 우선순위로 만들어 보세요.
            </p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-6">
            <h3 className="font-semibold text-purple-900 dark:text-purple-200 mb-2">비상금 준비</h3>
            <p className="text-purple-800 dark:text-purple-300 text-sm">
              적금과 별도로 생활비 3-6개월분의 비상금을 예금으로 준비하세요.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const SavingsCalculator = () => {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div></div>}>
      <SavingsCalculatorContent />
    </Suspense>
  );
};

export default SavingsCalculator;