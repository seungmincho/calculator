'use client'

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Home, Calculator, TrendingUp, Share2, Check, Save, Info, AlertCircle, CheckCircle, DollarSign } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCalculationHistory } from '@/hooks/useCalculationHistory';
import CalculationHistory from '@/components/CalculationHistory';

const BogeumjariLoanCalculatorContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('bogeumjariLoan');
  const tc = useTranslations('common');
  
  const [householdIncome, setHouseholdIncome] = useState('');
  const [householdMembers, setHouseholdMembers] = useState('4');
  const [housePrice, setHousePrice] = useState('');
  const [region, setRegion] = useState('seoul');
  const [loanType, setLoanType] = useState<'first' | 'general'>('first');
  const [loanPeriod, setLoanPeriod] = useState('30');
  const [result, setResult] = useState<{
    eligible: boolean;
    maxLoanAmount: number;
    interestRate: number;
    monthlyPayment: number;
    totalPayment: number;
    totalInterest: number;
    incomeRequirement: number;
    reason?: string;
    loanToValue: number;
    dti: number;
  } | null>(null);
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
  } = useCalculationHistory('bogeumjariLoan');

  // LH 보금자리론 계산 함수 (2024년 기준)
  const calculateBogeumjariLoan = (
    income: string,
    members: string,
    price: string,
    regionCode: string,
    type: 'first' | 'general',
    period: string
  ) => {
    const incomeNum = parseInt(income.replace(/,/g, '')) || 0;
    const membersNum = parseInt(members) || 4;
    const priceNum = parseInt(price.replace(/,/g, '')) || 0;
    const periodNum = parseInt(period) || 30;

    if (!incomeNum || !priceNum) return null;

    // 지역별 주택가격 상한 (2024년 기준)
    const regionLimits: Record<string, {
      name: string;
      priceLimit: number; // 억원 단위
      specialLimit?: number; // 신혼부부 등 특별공급 한도
    }> = {
      seoul: { 
        name: '서울', 
        priceLimit: 900000000, // 9억
        specialLimit: 600000000 // 6억 
      },
      gyeonggi: { 
        name: '경기/인천', 
        priceLimit: 800000000, // 8억
        specialLimit: 500000000 // 5억
      },
      metropolitan: { 
        name: '광역시', 
        priceLimit: 600000000, // 6억
        specialLimit: 400000000 // 4억
      },
      others: { 
        name: '기타지역', 
        priceLimit: 400000000, // 4억
        specialLimit: 300000000 // 3억
      }
    };

    // 소득 기준 (중위소득 기준)
    const incomeStandards: Record<string, Record<number, number>> = {
      first: { // 생애최초 (중위소득 130% 이하)
        1: 2954000, 2: 4929000, 3: 6326000, 4: 7722000, 5: 9118000
      },
      general: { // 일반 (중위소득 100% 이하)
        1: 2271000, 2: 3792000, 3: 4866000, 4: 5940000, 5: 7014000
      }
    };

    const regionInfo = regionLimits[regionCode] || regionLimits.others;
    const maxIncome = incomeStandards[type][Math.min(membersNum, 5)] || incomeStandards[type][5];

    // 소득 기준 체크
    if (incomeNum > maxIncome) {
      return {
        eligible: false,
        maxLoanAmount: 0,
        interestRate: 0,
        monthlyPayment: 0,
        totalPayment: 0,
        totalInterest: 0,
        incomeRequirement: maxIncome,
        reason: '소득기준 초과',
        loanToValue: 0,
        dti: 0
      };
    }

    // 주택가격 상한 체크
    const priceLimit = type === 'first' && priceNum <= regionInfo.specialLimit! 
      ? regionInfo.specialLimit! 
      : regionInfo.priceLimit;
    
    if (priceNum > priceLimit) {
      return {
        eligible: false,
        maxLoanAmount: 0,
        interestRate: 0,
        monthlyPayment: 0,
        totalPayment: 0,
        totalInterest: 0,
        incomeRequirement: maxIncome,
        reason: '주택가격 상한 초과',
        loanToValue: 0,
        dti: 0
      };
    }

    // 대출한도 계산 (주택가격의 70~80%)
    let loanToValueRatio = 0.7; // 기본 70%
    
    // 생애최초 우대 조건
    if (type === 'first') {
      loanToValueRatio = 0.8; // 최대 80%
    }

    const maxLoanAmount = Math.min(
      priceNum * loanToValueRatio, // LTV 기준
      300000000 // 최대 3억원
    );

    // 금리 계산 (2024년 기준)
    let baseRate = 3.2; // 기준금리 3.2%
    
    // 우대조건별 금리 차감
    let discountRate = 0;
    if (type === 'first') discountRate += 0.2; // 생애최초 0.2%p 우대
    if (incomeNum <= maxIncome * 0.6) discountRate += 0.2; // 저소득 0.2%p 추가우대
    if (membersNum >= 3) discountRate += 0.1; // 다자녀 0.1%p 추가우대

    const interestRate = Math.max(baseRate - discountRate, 1.8); // 최저 1.8%

    // 월 상환액 계산 (원리금균등상환)
    const monthlyRate = interestRate / 100 / 12;
    const totalMonths = periodNum * 12;
    
    const monthlyPayment = Math.round(
      maxLoanAmount * 
      (monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / 
      (Math.pow(1 + monthlyRate, totalMonths) - 1)
    );

    const totalPayment = monthlyPayment * totalMonths;
    const totalInterest = totalPayment - maxLoanAmount;

    // DTI 계산 (총부채상환비율)
    const monthlyIncome = incomeNum / 12;
    const dti = (monthlyPayment / monthlyIncome) * 100;

    // DTI 40% 초과시 경고
    if (dti > 40) {
      return {
        eligible: false,
        maxLoanAmount,
        interestRate,
        monthlyPayment,
        totalPayment,
        totalInterest,
        incomeRequirement: maxIncome,
        reason: 'DTI 40% 초과 (대출승인 어려움)',
        loanToValue: loanToValueRatio * 100,
        dti
      };
    }

    return {
      eligible: true,
      maxLoanAmount,
      interestRate,
      monthlyPayment,
      totalPayment,
      totalInterest,
      incomeRequirement: maxIncome,
      loanToValue: loanToValueRatio * 100,
      dti
    };
  };

  const handleCalculate = React.useCallback(() => {
    const calculation = calculateBogeumjariLoan(
      householdIncome,
      householdMembers,
      housePrice,
      region,
      loanType,
      loanPeriod
    );
    setResult(calculation);
    setShowSaveButton(!!calculation);
  }, [householdIncome, householdMembers, housePrice, region, loanType, loanPeriod]);

  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const formatCurrency = (num: number) => {
    if (num >= 100000000) {
      return `${(num / 100000000).toFixed(1)}억원`;
    } else if (num >= 10000) {
      return `${Math.floor(num / 10000)}만원`;
    }
    return `${formatNumber(num)}원`;
  };

  // 입력 처리 함수들
  const handleIncomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    if (value) {
      const formattedValue = formatNumber(Number(value));
      setHouseholdIncome(formattedValue);
      updateURL({ income: value });
    } else {
      setHouseholdIncome('');
      updateURL({ income: '' });
    }
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    if (value) {
      const formattedValue = formatNumber(Number(value));
      setHousePrice(formattedValue);
      updateURL({ price: value });
    } else {
      setHousePrice('');
      updateURL({ price: '' });
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
    window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
  };

  // 저장 기능
  const handleSave = () => {
    if (!result) return;

    const inputs = {
      householdIncome,
      householdMembers,
      housePrice,
      region,
      loanType,
      loanPeriod
    };

    const success = saveCalculation(inputs, result);
    if (success) {
      setShowSaveButton(false);
    }
  };

  // 이력에서 불러오기
  const handleLoadFromHistory = (historyItem: any) => {
    if (historyItem.inputs) {
      const inputs = historyItem.inputs;
      setHouseholdIncome(inputs.householdIncome || '');
      setHouseholdMembers(inputs.householdMembers || '4');
      setHousePrice(inputs.housePrice || '');
      setRegion(inputs.region || 'seoul');
      setLoanType(inputs.loanType || 'first');
      setLoanPeriod(inputs.loanPeriod || '30');
      
      // URL도 업데이트
      updateURL({
        income: inputs.householdIncome?.replace(/,/g, '') || '',
        members: inputs.householdMembers || '4',
        price: inputs.housePrice?.replace(/,/g, '') || '',
        region: inputs.region || 'seoul',
        type: inputs.loanType || 'first',
        period: inputs.loanPeriod || '30'
      });
    }
  };

  // URL에서 파라미터 로드
  useEffect(() => {
    const incomeParam = searchParams.get('income');
    const membersParam = searchParams.get('members');
    const priceParam = searchParams.get('price');
    const regionParam = searchParams.get('region');
    const typeParam = searchParams.get('type');
    const periodParam = searchParams.get('period');

    if (incomeParam && /^\d+$/.test(incomeParam)) {
      setHouseholdIncome(formatNumber(Number(incomeParam)));
    }
    if (membersParam && /^\d+$/.test(membersParam)) {
      setHouseholdMembers(membersParam);
    }
    if (priceParam && /^\d+$/.test(priceParam)) {
      setHousePrice(formatNumber(Number(priceParam)));
    }
    if (regionParam) {
      setRegion(regionParam);
    }
    if (typeParam && ['first', 'general'].includes(typeParam)) {
      setLoanType(typeParam as 'first' | 'general');
    }
    if (periodParam && /^\d+$/.test(periodParam)) {
      setLoanPeriod(periodParam);
    }
  }, [searchParams]);

  // 자동 계산
  useEffect(() => {
    if (householdIncome && housePrice) {
      handleCalculate();
    } else {
      setResult(null);
    }
  }, [householdIncome, householdMembers, housePrice, region, loanType, loanPeriod, handleCalculate]);

  // 공유 기능
  const handleShare = async () => {
    const url = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'LH 보금자리론 계산 결과',
          text: `대출한도: ${result ? formatCurrency(result.maxLoanAmount) : '0원'}`,
          url: url,
        });
        return;
      } catch (error) {
        console.log('공유 실패:', error);
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('복사 실패:', error);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* 헤더 */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-600 to-blue-600 rounded-full text-white mb-4">
          <Home className="w-8 h-8" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          LH 보금자리론 계산기
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          생애최초 구입자를 위한 LH 보금자리론! 최대 3억원, 최저 1.8% 우대금리까지 확인하세요.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* 입력 폼 */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
              <Calculator className="w-6 h-6 mr-2" />
              대출한도 계산하기
            </h2>

            <div className="space-y-6">
              {/* 대출 유형 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  대출 유형
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setLoanType('first')}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      loanType === 'first'
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-500" />
                    <div className="font-medium text-sm">생애최초</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">최대 우대혜택</div>
                  </button>
                  <button
                    onClick={() => setLoanType('general')}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      loanType === 'general'
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <Home className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                    <div className="font-medium text-sm">일반</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">기본 조건</div>
                  </button>
                </div>
              </div>

              {/* 가구 정보 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    연소득 (가구 전체)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={householdIncome}
                      onChange={handleIncomeChange}
                      placeholder="60,000,000"
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 dark:text-white"
                    />
                    <span className="absolute right-3 top-3 text-gray-500 dark:text-gray-400">원</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    가구원수
                  </label>
                  <select
                    value={householdMembers}
                    onChange={(e) => setHouseholdMembers(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 dark:text-white"
                  >
                    {[1, 2, 3, 4, 5].map(num => (
                      <option key={num} value={num}>{num}인</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 주택 정보 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    주택가격
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={housePrice}
                      onChange={handlePriceChange}
                      placeholder="400,000,000"
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 dark:text-white"
                    />
                    <span className="absolute right-3 top-3 text-gray-500 dark:text-gray-400">원</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    대출기간
                  </label>
                  <select
                    value={loanPeriod}
                    onChange={(e) => setLoanPeriod(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 dark:text-white"
                  >
                    <option value="10">10년</option>
                    <option value="15">15년</option>
                    <option value="20">20년</option>
                    <option value="25">25년</option>
                    <option value="30">30년</option>
                    <option value="40">40년</option>
                  </select>
                </div>
              </div>

              {/* 지역 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  주택소재지
                </label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 dark:text-white"
                >
                  <option value="seoul">서울특별시</option>
                  <option value="gyeonggi">경기도/인천광역시</option>
                  <option value="metropolitan">광역시 (부산, 대구, 광주, 대전, 울산)</option>
                  <option value="others">기타지역 (도 단위)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 결과 표시 */}
        <div className="space-y-6">
          {/* 계산 결과 */}
          {result && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                {result.eligible ? (
                  <CheckCircle className="w-6 h-6 mr-2 text-green-500" />
                ) : (
                  <AlertCircle className="w-6 h-6 mr-2 text-red-500" />
                )}
                대출 결과
              </h3>

              {result.eligible ? (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/30 dark:to-blue-900/30 rounded-lg p-4">
                    <div className="text-sm text-green-600 dark:text-green-400 mb-1">최대 대출한도</div>
                    <div className="text-2xl font-bold text-green-900 dark:text-green-100 mb-1">
                      {formatCurrency(result.maxLoanAmount)}
                    </div>
                    <div className="text-xs text-green-600 dark:text-green-400">
                      LTV {result.loanToValue}% 적용
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600 dark:text-gray-400">대출금리</div>
                      <div className="font-semibold text-gray-900 dark:text-white">{result.interestRate}%</div>
                    </div>
                    <div>
                      <div className="text-gray-600 dark:text-gray-400">월 상환액</div>
                      <div className="font-semibold text-gray-900 dark:text-white">{formatNumber(result.monthlyPayment)}원</div>
                    </div>
                    <div>
                      <div className="text-gray-600 dark:text-gray-400">총 상환액</div>
                      <div className="font-semibold text-gray-900 dark:text-white">{formatCurrency(result.totalPayment)}</div>
                    </div>
                    <div>
                      <div className="text-gray-600 dark:text-gray-400">총 이자</div>
                      <div className="font-semibold text-gray-900 dark:text-white">{formatCurrency(result.totalInterest)}</div>
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3">
                    <div className="flex items-center text-sm">
                      <Info className="w-4 h-4 mr-2 text-blue-500" />
                      <span className="text-blue-700 dark:text-blue-300">
                        DTI {result.dti.toFixed(1)}% (권장: 40% 이하)
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-red-50 dark:bg-red-900/30 rounded-lg p-4">
                    <div className="text-red-700 dark:text-red-300 font-medium mb-2">
                      대출 불가
                    </div>
                    <div className="text-red-600 dark:text-red-400 text-sm">
                      {result.reason}
                    </div>
                  </div>

                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">소득기준 (연)</span>
                      <span className="font-medium">{formatCurrency(result.incomeRequirement)}</span>
                    </div>
                    {result.dti > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">DTI</span>
                        <span className="font-medium text-red-600">{result.dti.toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 액션 버튼들 */}
          {result && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
              <div className="space-y-3">
                <button
                  onClick={handleShare}
                  className="w-full flex items-center justify-center px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-5 h-5 mr-2" />
                      복사됨!
                    </>
                  ) : (
                    <>
                      <Share2 className="w-5 h-5 mr-2" />
                      결과 공유
                    </>
                  )}
                </button>

                {showSaveButton && (
                  <button
                    onClick={handleSave}
                    className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    <Save className="w-5 h-5 mr-2" />
                    계산 저장
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 계산 이력 */}
      <CalculationHistory
        histories={histories}
        isLoading={historyLoading}
        onLoadHistory={handleLoadFromHistory}
        onRemoveHistory={removeHistory}
        onClearHistories={clearHistories}
        formatResult={(result) => `${(result.loanAmount / 100000000).toFixed(1)}억 ${result.years}년`}
      />

      {/* 안내사항 */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/30 dark:to-blue-900/30 rounded-2xl p-8">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
          🏠 LH 보금자리론 완벽 가이드
        </h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm text-gray-700 dark:text-gray-300">
          <div>
            <h4 className="font-semibold mb-3 text-green-700 dark:text-green-400">✅ 대출 대상</h4>
            <ul className="space-y-1 text-xs">
              <li>• 무주택 세대주</li>
              <li>• 생애최초 구입자</li>
              <li>• 소득기준 충족</li>
              <li>• 1주택 실수요자</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-blue-700 dark:text-blue-400">💰 대출 조건</h4>
            <ul className="space-y-1 text-xs">
              <li>• 최대 3억원</li>
              <li>• LTV 70~80%</li>
              <li>• 최저 1.8% 금리</li>
              <li>• 최장 40년 상환</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-purple-700 dark:text-purple-400">🎯 우대 혜택</h4>
            <ul className="space-y-1 text-xs">
              <li>• 생애최초: -0.2%p</li>
              <li>• 저소득층: -0.2%p</li>
              <li>• 다자녀가구: -0.1%p</li>
              <li>• 최대 -0.5%p 우대</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-orange-700 dark:text-orange-400">⚠️ 주의사항</h4>
            <ul className="space-y-1 text-xs">
              <li>• DTI 40% 이하</li>
              <li>• 지역별 가격 상한</li>
              <li>• 실거주 의무</li>
              <li>• 전매제한 5년</li>
            </ul>
          </div>
        </div>
        <div className="mt-6 p-4 bg-white dark:bg-gray-800 rounded-lg">
          <h4 className="font-semibold mb-2 text-gray-900 dark:text-white">📊 지역별 주택가격 상한 (2024년)</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>서울: <strong>9억원</strong></div>
            <div>경기/인천: <strong>8억원</strong></div>
            <div>광역시: <strong>6억원</strong></div>
            <div>기타지역: <strong>4억원</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function BogeumjariLoanCalculator() {
  return (
    <Suspense fallback={
      <div className="max-w-6xl mx-auto p-8">
        <div className="animate-pulse space-y-8">
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    }>
      <BogeumjariLoanCalculatorContent />
    </Suspense>
  );
}