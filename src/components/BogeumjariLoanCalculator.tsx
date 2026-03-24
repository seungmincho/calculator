'use client'

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Home, Calculator, Share2, Check, Save, Info, AlertCircle, CheckCircle, Baby, Heart, Users } from 'lucide-react';
import { useCalculationHistory } from '@/hooks/useCalculationHistory';
import CalculationHistory from '@/components/CalculationHistory';
import GuideSection from '@/components/GuideSection';

type LoanType = 'general' | 'first' | 'newlywed' | 'multichild';

// 2026년 기준 금리 (아낌e 보금자리론 - 기준일 2026.03, 실제 금리는 한국주택금융공사 홈페이지 확인)
const PERIOD_RATES: Record<string, number> = {
  '10': 4.05,
  '15': 4.10,
  '20': 4.15,
  '25': 4.20,
  '30': 4.25,
  '40': 4.30,
  '50': 4.35,
};

// 소득 기준 (부부합산 연간)
const INCOME_LIMITS: Record<LoanType, (children: number) => number> = {
  general: () => 70_000_000,
  first: () => 70_000_000,
  newlywed: () => 85_000_000,
  multichild: (c: number) => c >= 3 ? 100_000_000 : 90_000_000,
};

// 최대 대출한도
const MAX_LOAN: Record<LoanType, number> = {
  general: 360_000_000,
  first: 420_000_000,
  newlywed: 360_000_000,
  multichild: 400_000_000,
};

// LTV 비율
const LTV_RATIO: Record<LoanType, number> = {
  general: 0.70,
  first: 0.80,
  newlywed: 0.70,
  multichild: 0.70,
};

// 유형별 기본 우대금리
const TYPE_DISCOUNT: Record<LoanType, number> = {
  general: 0.0,
  first: 0.2,
  newlywed: 0.3,
  multichild: 0.2,
};

const HOUSE_PRICE_LIMIT = 600_000_000; // 6억원 (전국 균일)
const DTI_LIMIT = 60; // 60%

const LOAN_TYPE_INFO: Record<LoanType, { label: string; sublabel: string; icon: React.ReactNode; color: string; benefit: string }> = {
  first: {
    label: '생애최초',
    sublabel: '처음 집 구입',
    icon: <Home className="w-5 h-5" />,
    color: 'blue',
    benefit: 'LTV 80% · 한도 4.2억',
  },
  newlywed: {
    label: '신혼부부',
    sublabel: '혼인 7년 이내',
    icon: <Heart className="w-5 h-5" />,
    color: 'pink',
    benefit: '금리 0.3%p 우대',
  },
  multichild: {
    label: '다자녀',
    sublabel: '자녀 2명 이상',
    icon: <Baby className="w-5 h-5" />,
    color: 'green',
    benefit: '한도 4억 · 소득 9천만',
  },
  general: {
    label: '일반',
    sublabel: '기본 조건',
    icon: <Users className="w-5 h-5" />,
    color: 'gray',
    benefit: 'LTV 70% · 한도 3.6억',
  },
};

const BogeumjariLoanCalculatorContent = () => {
  const searchParams = useSearchParams();
  const [householdIncome, setHouseholdIncome] = useState('');
  const [childCount, setChildCount] = useState('0');
  const [housePrice, setHousePrice] = useState('');
  const [loanType, setLoanType] = useState<LoanType>('first');
  const [loanPeriod, setLoanPeriod] = useState('30');
  const [result, setResult] = useState<{
    eligible: boolean;
    maxLoanAmount: number;
    baseRate: number;
    totalDiscount: number;
    interestRate: number;
    discounts: { label: string; rate: number }[];
    monthlyPayment: number;
    totalPayment: number;
    totalInterest: number;
    incomeLimit: number;
    reason?: string;
    loanToValue: number;
    dti: number;
  } | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [showSaveButton, setShowSaveButton] = useState(false);

  const {
    histories,
    isLoading: historyLoading,
    saveCalculation,
    removeHistory,
    clearHistories,
    loadFromHistory,
  } = useCalculationHistory('bogeumjariLoan');

  const formatNumber = (num: number) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  const formatCurrency = (num: number) => {
    if (num >= 100_000_000) return `${(num / 100_000_000).toFixed(1)}억원`;
    if (num >= 10_000) return `${Math.floor(num / 10_000).toLocaleString()}만원`;
    return `${formatNumber(num)}원`;
  };

  const calculateBogeumjariLoan = (
    income: string,
    children: string,
    price: string,
    type: LoanType,
    period: string
  ) => {
    const incomeNum = parseInt(income.replace(/,/g, '')) || 0;
    const childNum = children === '3plus' ? 3 : parseInt(children) || 0;
    const priceNum = parseInt(price.replace(/,/g, '')) || 0;

    if (!incomeNum || !priceNum) return null;

    const incomeLimit = INCOME_LIMITS[type](childNum);
    const typeLabels: Record<LoanType, string> = {
      general: '일반', first: '생애최초', newlywed: '신혼부부', multichild: '다자녀'
    };

    if (incomeNum > incomeLimit) {
      return {
        eligible: false,
        maxLoanAmount: 0,
        baseRate: 0,
        totalDiscount: 0,
        interestRate: 0,
        discounts: [] as { label: string; rate: number }[],
        monthlyPayment: 0,
        totalPayment: 0,
        totalInterest: 0,
        incomeLimit,
        reason: `소득기준 초과 — ${typeLabels[type]} 기준 ${formatCurrency(incomeLimit)} 이하`,
        loanToValue: 0,
        dti: 0,
      };
    }

    if (priceNum > HOUSE_PRICE_LIMIT) {
      return {
        eligible: false,
        maxLoanAmount: 0,
        baseRate: 0,
        totalDiscount: 0,
        interestRate: 0,
        discounts: [] as { label: string; rate: number }[],
        monthlyPayment: 0,
        totalPayment: 0,
        totalInterest: 0,
        incomeLimit,
        reason: '주택가격 6억원 초과 — 보금자리론 대상 주택 아님',
        loanToValue: 0,
        dti: 0,
      };
    }

    const baseRate = PERIOD_RATES[period] ?? 4.25;
    const ltv = LTV_RATIO[type];
    const maxLoanByLTV = priceNum * ltv;
    const maxLoan = Math.min(maxLoanByLTV, MAX_LOAN[type]);

    // 우대금리 계산
    const discounts: { label: string; rate: number }[] = [];
    const typeDiscount = TYPE_DISCOUNT[type];

    if (typeDiscount > 0) {
      const discountLabels: Record<LoanType, string> = {
        first: '생애최초 우대',
        newlywed: '신혼부부 우대',
        multichild: '다자녀 우대',
        general: '',
      };
      discounts.push({ label: discountLabels[type], rate: typeDiscount });
    }

    // 저소득 추가우대 (소득의 70% 이하)
    if (incomeNum <= incomeLimit * 0.70) {
      discounts.push({ label: '저소득 추가우대', rate: 0.10 });
    }

    const totalDiscount = Math.min(discounts.reduce((sum, d) => sum + d.rate, 0), 1.0);
    const finalRate = Math.max(Number((baseRate - totalDiscount).toFixed(2)), 2.90);

    // 원리금균등상환 월 상환액
    const monthlyRate = finalRate / 100 / 12;
    const months = parseInt(period) * 12;
    const monthly = Math.round(
      maxLoan * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1)
    );

    const totalPay = monthly * months;
    const totalInterest = totalPay - maxLoan;
    const dti = (monthly / (incomeNum / 12)) * 100;

    if (dti > DTI_LIMIT) {
      return {
        eligible: false,
        maxLoanAmount: maxLoan,
        baseRate,
        totalDiscount,
        interestRate: finalRate,
        discounts,
        monthlyPayment: monthly,
        totalPayment: totalPay,
        totalInterest,
        incomeLimit,
        reason: `DTI ${dti.toFixed(1)}% 초과 (기준: ${DTI_LIMIT}% 이하) — 소득 대비 상환 부담 과다`,
        loanToValue: ltv * 100,
        dti,
      };
    }

    return {
      eligible: true,
      maxLoanAmount: maxLoan,
      baseRate,
      totalDiscount,
      interestRate: finalRate,
      discounts,
      monthlyPayment: monthly,
      totalPayment: totalPay,
      totalInterest,
      incomeLimit,
      loanToValue: ltv * 100,
      dti,
    };
  };

  const handleCalculate = React.useCallback(() => {
    const calc = calculateBogeumjariLoan(householdIncome, childCount, housePrice, loanType, loanPeriod);
    setResult(calc);
    setShowSaveButton(!!calc);
  }, [householdIncome, childCount, housePrice, loanType, loanPeriod]);

  const handleIncomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    if (value) {
      setHouseholdIncome(formatNumber(Number(value)));
      updateURL({ income: value });
    } else {
      setHouseholdIncome('');
      updateURL({ income: '' });
    }
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    if (value) {
      setHousePrice(formatNumber(Number(value)));
      updateURL({ price: value });
    } else {
      setHousePrice('');
      updateURL({ price: '' });
    }
  };

  const updateURL = (newParams: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
  };

  const handleSave = () => {
    if (!result) return;
    saveCalculation({ householdIncome, childCount, housePrice, loanType, loanPeriod }, result);
    setShowSaveButton(false);
  };

  const handleLoadFromHistory = (historyId: string) => {
    const inputs = loadFromHistory(historyId) as Record<string, string> | null;
    if (!inputs) return;
    if (inputs.householdIncome) setHouseholdIncome(inputs.householdIncome);
    if (inputs.childCount) setChildCount(inputs.childCount);
    if (inputs.housePrice) setHousePrice(inputs.housePrice);
    if (inputs.loanType && ['general', 'first', 'newlywed', 'multichild'].includes(inputs.loanType)) {
      setLoanType(inputs.loanType as LoanType);
    }
    if (inputs.loanPeriod) setLoanPeriod(inputs.loanPeriod);
  };

  useEffect(() => {
    const incomeParam = searchParams.get('income');
    const priceParam = searchParams.get('price');
    const typeParam = searchParams.get('type');
    const periodParam = searchParams.get('period');
    const childParam = searchParams.get('children');

    if (incomeParam && /^\d+$/.test(incomeParam)) setHouseholdIncome(formatNumber(Number(incomeParam)));
    if (priceParam && /^\d+$/.test(priceParam)) setHousePrice(formatNumber(Number(priceParam)));
    if (typeParam && ['general', 'first', 'newlywed', 'multichild'].includes(typeParam)) setLoanType(typeParam as LoanType);
    if (periodParam && /^\d+$/.test(periodParam)) setLoanPeriod(periodParam);
    if (childParam) setChildCount(childParam);
  }, [searchParams]);

  useEffect(() => {
    if (householdIncome && housePrice) {
      handleCalculate();
    } else {
      setResult(null);
    }
  }, [householdIncome, childCount, housePrice, loanType, loanPeriod, handleCalculate]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'LH 보금자리론 계산 결과',
          text: result ? `대출한도: ${formatCurrency(result.maxLoanAmount)}, 금리: ${result.interestRate}%` : '',
          url,
        });
        return;
      } catch { /* fall through */ }
    }
    try {
      await navigator.clipboard.writeText(url);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const typeColorMap: Record<LoanType, { active: string; base: string }> = {
    first: { active: 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300', base: 'border-gray-200 dark:border-gray-600 hover:border-blue-300' },
    newlywed: { active: 'border-pink-500 bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300', base: 'border-gray-200 dark:border-gray-600 hover:border-pink-300' },
    multichild: { active: 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300', base: 'border-gray-200 dark:border-gray-600 hover:border-green-300' },
    general: { active: 'border-gray-500 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300', base: 'border-gray-200 dark:border-gray-600 hover:border-gray-400' },
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* 헤더 */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            LH 보금자리론 계산기
          </h1>
          <span className="text-xs font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 px-2 py-0.5 rounded-full">
            2026년 2월 기준
          </span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          내 조건에 맞는 대출한도·금리·월 상환액을 즉시 확인하세요 (기준금리 4.05~4.35%, 우대 시 최저 2.90%)
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* 입력 폼 */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Calculator className="w-5 h-5 text-blue-500" />
              대출 조건 입력
            </h2>

            {/* 대출 유형 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                신청 유형 선택 <span className="text-xs text-gray-400 font-normal">(해당하는 유형 선택)</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(LOAN_TYPE_INFO) as LoanType[]).map((type) => {
                  const info = LOAN_TYPE_INFO[type];
                  const isActive = loanType === type;
                  return (
                    <button
                      key={type}
                      onClick={() => setLoanType(type)}
                      className={`p-3 rounded-xl border-2 transition-all text-left ${isActive ? typeColorMap[type].active : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={isActive ? '' : 'text-gray-400 dark:text-gray-500'}>{info.icon}</span>
                        <span className="font-semibold text-sm">{info.label}</span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{info.sublabel}</div>
                      <div className={`text-xs font-medium mt-1 ${isActive ? '' : 'text-gray-400 dark:text-gray-500'}`}>{info.benefit}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 소득 + 자녀수 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  부부합산 연소득
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={householdIncome}
                    onChange={handleIncomeChange}
                    placeholder="70,000,000"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                  />
                  <span className="absolute right-3 top-3 text-gray-500 dark:text-gray-400 text-sm">원</span>
                </div>
                {loanType && (
                  <p className="text-xs text-gray-400 mt-1">
                    기준: {formatCurrency(INCOME_LIMITS[loanType](loanType === 'multichild' ? (childCount === '3plus' ? 3 : parseInt(childCount) || 0) : 0))} 이하
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  자녀수
                </label>
                <select
                  value={childCount}
                  onChange={(e) => setChildCount(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                >
                  <option value="0">없음</option>
                  <option value="1">1명</option>
                  <option value="2">2명</option>
                  <option value="3plus">3명 이상</option>
                </select>
                {loanType !== 'multichild' && (parseInt(childCount) >= 2 || childCount === '3plus') && (
                  <p className="text-xs text-blue-500 mt-1">💡 다자녀 유형으로 전환 시 혜택↑</p>
                )}
              </div>
            </div>

            {/* 주택가격 + 대출기간 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  주택 매입가격
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={housePrice}
                    onChange={handlePriceChange}
                    placeholder="400,000,000"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                  />
                  <span className="absolute right-3 top-3 text-gray-500 dark:text-gray-400 text-sm">원</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">상한: 6억원 이하 주택</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  대출 기간
                </label>
                <select
                  value={loanPeriod}
                  onChange={(e) => setLoanPeriod(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                >
                  <option value="10">10년 (4.05%)</option>
                  <option value="15">15년 (4.10%)</option>
                  <option value="20">20년 (4.15%)</option>
                  <option value="25">25년 (4.20%)</option>
                  <option value="30">30년 (4.25%)</option>
                  <option value="40">40년 (4.30%)</option>
                  <option value="50">50년 (4.35%)</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">기간이 길수록 금리 소폭 상승</p>
              </div>
            </div>
          </div>
        </div>

        {/* 결과 패널 */}
        <div className="space-y-4">
          {!result && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <div className="text-center text-gray-400 dark:text-gray-500 py-8">
                <Calculator className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">소득과 주택가격을 입력하면<br />결과가 자동으로 계산됩니다</p>
              </div>
            </div>
          )}

          {result && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                {result.eligible ? (
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                )}
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {result.eligible ? '대출 가능' : '대출 불가'}
                </h3>
              </div>

              {result.eligible ? (
                <div className="space-y-4">
                  {/* 최대 대출한도 */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl p-4">
                    <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">최대 대출한도</div>
                    <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                      {formatCurrency(result.maxLoanAmount)}
                    </div>
                    <div className="text-xs text-blue-500 dark:text-blue-400 mt-0.5">
                      LTV {result.loanToValue}% 적용
                    </div>
                  </div>

                  {/* 금리 계산 내역 */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">금리 계산 내역</div>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">기준금리 ({loanPeriod}년)</span>
                        <span className="font-medium text-gray-900 dark:text-white">{result.baseRate.toFixed(2)}%</span>
                      </div>
                      {result.discounts.map((d, i) => (
                        <div key={i} className="flex justify-between text-green-600 dark:text-green-400">
                          <span>{d.label}</span>
                          <span>- {d.rate.toFixed(2)}%p</span>
                        </div>
                      ))}
                      <div className="border-t border-gray-200 dark:border-gray-600 pt-1.5 mt-1 flex justify-between font-bold text-blue-700 dark:text-blue-300">
                        <span>최종 적용금리</span>
                        <span>{result.interestRate.toFixed(2)}%</span>
                      </div>
                    </div>
                  </div>

                  {/* 상환 정보 */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                      <div className="text-gray-500 dark:text-gray-400 text-xs mb-0.5">월 상환액</div>
                      <div className="font-bold text-gray-900 dark:text-white">{formatNumber(result.monthlyPayment)}원</div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                      <div className="text-gray-500 dark:text-gray-400 text-xs mb-0.5">총 이자</div>
                      <div className="font-bold text-gray-900 dark:text-white">{formatCurrency(result.totalInterest)}</div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                      <div className="text-gray-500 dark:text-gray-400 text-xs mb-0.5">총 상환액</div>
                      <div className="font-semibold text-gray-900 dark:text-white">{formatCurrency(result.totalPayment)}</div>
                    </div>
                    <div className={`rounded-lg p-3 ${result.dti <= 40 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-yellow-50 dark:bg-yellow-900/20'}`}>
                      <div className="text-gray-500 dark:text-gray-400 text-xs mb-0.5">DTI</div>
                      <div className={`font-bold ${result.dti <= 40 ? 'text-green-700 dark:text-green-300' : 'text-yellow-700 dark:text-yellow-300'}`}>
                        {result.dti.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
                    <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      실제 대출 시 금융기관 심사 결과에 따라 한도·금리가 달라질 수 있습니다.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-red-50 dark:bg-red-900/30 rounded-xl p-4">
                    <div className="text-sm text-red-700 dark:text-red-300 font-medium mb-1">불가 사유</div>
                    <div className="text-sm text-red-600 dark:text-red-400">{result.reason}</div>
                  </div>
                  {result.maxLoanAmount > 0 && (
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between text-gray-600 dark:text-gray-400">
                        <span>LTV 기준 한도</span>
                        <span className="font-medium">{formatCurrency(result.maxLoanAmount)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600 dark:text-gray-400">
                        <span>월 상환 부담</span>
                        <span className="font-medium text-red-500">{formatNumber(result.monthlyPayment)}원 ({result.dti.toFixed(1)}%)</span>
                      </div>
                    </div>
                  )}
                  <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3">
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      💡 다른 유형(신혼/다자녀)이 해당된다면 소득기준이 완화됩니다. 디딤돌대출도 함께 검토해보세요.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 공유/저장 버튼 */}
          {result && (
            <div className="flex gap-3">
              <button
                onClick={handleShare}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {isCopied ? <><Check className="w-4 h-4" />복사됨</> : <><Share2 className="w-4 h-4" />결과 공유</>}
              </button>
              {showSaveButton && (
                <button
                  onClick={handleSave}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Save className="w-4 h-4" />저장
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 관련 사이트 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span>🔗</span>
          관련 사이트
        </h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            {
              name: 'LH 청약센터',
              url: 'https://apply.lh.or.kr',
              desc: 'LH 보금자리론 청약 신청 및 상담',
              icon: '🏠'
            },
            {
              name: '한국주택금융공사',
              url: 'https://www.hf.go.kr',
              desc: '주택담보대출 상품 안내 및 금리 확인',
              icon: '🏦'
            },
            {
              name: '국토교통부 실거래가',
              url: 'https://rt.molit.go.kr',
              desc: '아파트·주택 실거래가 공개 시스템',
              icon: '📊'
            },
            {
              name: '부동산 공시가격 알리미',
              url: 'https://www.realtyprice.kr',
              desc: '공동주택 공시가격 조회',
              icon: '📋'
            },
          ].map(link => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors group"
            >
              <span className="text-2xl flex-shrink-0">{link.icon}</span>
              <div>
                <div className="font-medium text-blue-700 dark:text-blue-300 group-hover:underline text-sm">{link.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{link.desc}</div>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* 계산 이력 */}
      <CalculationHistory
        histories={histories}
        isLoading={historyLoading}
        onLoadHistory={handleLoadFromHistory}
        onRemoveHistory={removeHistory}
        onClearHistories={clearHistories}
        formatResult={(r: { maxLoanAmount?: number; interestRate?: number }) =>
          r.maxLoanAmount ? `${formatCurrency(r.maxLoanAmount)} · ${r.interestRate ?? 0}%` : '-'
        }
      />

      {/* 유형별 요약 가이드 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Home className="w-5 h-5 text-blue-500" />
          2026년 보금자리론 유형별 핵심 조건
        </h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              type: '일반', color: 'gray',
              items: ['소득: 7천만원 이하', '한도: 최대 3.6억', 'LTV 70%', '금리 우대 없음'],
            },
            {
              type: '생애최초', color: 'blue',
              items: ['소득: 7천만원 이하', '한도: 최대 4.2억', 'LTV 80% (확대)', '금리 우대 0.2%p'],
            },
            {
              type: '신혼부부', color: 'pink',
              items: ['소득: 8.5천만원 이하', '한도: 최대 3.6억', '혼인 7년 이내', '금리 우대 0.3%p'],
            },
            {
              type: '다자녀', color: 'green',
              items: ['소득: 9천만원 이하', '한도: 최대 4억', '자녀 2명 이상', '금리 우대 0.2%p'],
            },
          ].map((g) => (
            <div key={g.type} className="bg-white dark:bg-gray-800 rounded-xl p-4">
              <div className="font-semibold text-sm text-gray-900 dark:text-white mb-2">{g.type}</div>
              <ul className="space-y-1">
                {g.items.map((item, i) => (
                  <li key={i} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-1">
                    <span className="text-blue-400 mt-0.5">·</span>{item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
          ※ 2026년 2월 기준. 금리는 매월 변동되므로 주택금융공사 홈페이지에서 최신 금리를 확인하세요.
          주택가격 6억원 이하, 전용면적 85㎡ 이하 주택에 한해 적용됩니다.
        </p>
      </div>

      <GuideSection namespace="bogeumjariLoan" />
    </div>
  );
};

export default function BogeumjariLoanCalculator() {
  return (
    <Suspense fallback={
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-96 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          </div>
        </div>
      </div>
    }>
      <BogeumjariLoanCalculatorContent />
    </Suspense>
  );
}
