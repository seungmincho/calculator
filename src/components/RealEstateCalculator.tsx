'use client'

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Home, Calculator, TrendingUp, Share2, Check, Building } from 'lucide-react';

type CalculatorType = 'jeonse-loan' | 'mortgage-loan' | 'acquisition-tax';

interface LoanResult {
  monthlyPayment: number;
  totalPayment: number;
  totalInterest: number;
  loanToValue?: number;
}

interface TaxResult {
  acquisitionTax: number;
  localTax: number;
  stampTax: number;
  registrationTax: number;
  totalTax: number;
}

const RealEstateCalculatorContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<CalculatorType>('jeonse-loan');
  const [isCopied, setIsCopied] = useState(false);

  // 전세자금대출 관련 상태
  const [jeonseDeposit, setJeonseDeposit] = useState('');
  const [jeonseInterestRate, setJeonseInterestRate] = useState('3.5');
  const [jeonseLoanTerm, setJeonseLoanTerm] = useState('2');

  // 주택담보대출 관련 상태
  const [housePrice, setHousePrice] = useState('');
  const [downPayment, setDownPayment] = useState('');
  const [mortgageRate, setMortgageRate] = useState('4.0');
  const [mortgageTerm, setMortgageTerm] = useState('30');

  // 취득세 관련 상태
  const [acquisitionPrice, setAcquisitionPrice] = useState('');
  const [propertyType, setPropertyType] = useState<'apartment' | 'house' | 'land'>('apartment');
  const [isFirstHome, setIsFirstHome] = useState(true);
  const [area, setArea] = useState('');

  const [result, setResult] = useState<LoanResult | TaxResult | null>(null);

  const calculatorTypes = {
    'jeonse-loan': '전세자금대출',
    'mortgage-loan': '주택담보대출',
    'acquisition-tax': '취득세 계산'
  };

  // 전세자금대출 계산
  const calculateJeonseLoan = (deposit: number, rate: number, termYears: number) => {
    // LTV 80% 기준으로 대출 가능 금액 계산
    const maxLoanAmount = deposit * 0.8;
    const monthlyRate = rate / 100 / 12;
    const termMonths = termYears * 12;
    
    const monthlyPayment = maxLoanAmount * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
                          (Math.pow(1 + monthlyRate, termMonths) - 1);
    const totalPayment = monthlyPayment * termMonths;
    const totalInterest = totalPayment - maxLoanAmount;
    
    return {
      monthlyPayment,
      totalPayment,
      totalInterest,
      loanToValue: 80
    };
  };

  // 주택담보대출 계산
  const calculateMortgageLoan = (price: number, down: number, rate: number, termYears: number) => {
    const loanAmount = price - down;
    const monthlyRate = rate / 100 / 12;
    const termMonths = termYears * 12;
    
    const monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
                          (Math.pow(1 + monthlyRate, termMonths) - 1);
    const totalPayment = monthlyPayment * termMonths;
    const totalInterest = totalPayment - loanAmount;
    const loanToValue = (loanAmount / price) * 100;
    
    return {
      monthlyPayment,
      totalPayment,
      totalInterest,
      loanToValue
    };
  };

  // 취득세 계산 (2024년 기준)
  const calculateAcquisitionTax = (price: number, type: string, firstHome: boolean, propertyArea: number) => {
    let taxRate = 0;
    
    // 부동산 유형별 세율
    if (type === 'apartment' || type === 'house') {
      if (firstHome && price <= 600000000) {
        // 1주택자 6억 이하 - 1~3% 누진
        if (price <= 60000000) {
          taxRate = 0.01;
        } else if (price <= 600000000) {
          taxRate = 0.01 + ((price - 60000000) / 540000000) * 0.02;
        }
      } else {
        // 일반 주택 - 1~3% 누진
        if (price <= 60000000) {
          taxRate = 0.01;
        } else if (price <= 600000000) {
          taxRate = 0.01 + ((price - 60000000) / 540000000) * 0.02;
        } else {
          taxRate = 0.03;
        }
      }
    } else {
      // 토지 - 2~4% 누진
      if (price <= 60000000) {
        taxRate = 0.02;
      } else if (price <= 600000000) {
        taxRate = 0.02 + ((price - 60000000) / 540000000) * 0.02;
      } else {
        taxRate = 0.04;
      }
    }

    const acquisitionTax = price * taxRate;
    const localTax = acquisitionTax * 0.1; // 지방교육세
    const stampTax = price * 0.00015; // 인지세 0.015%
    const registrationTax = price * 0.002; // 등록세 0.2%
    const totalTax = acquisitionTax + localTax + stampTax + registrationTax;

    return {
      acquisitionTax,
      localTax,
      stampTax,
      registrationTax,
      totalTax
    };
  };

  const formatNumber = (num: number) => {
    return Math.floor(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const handleShare = async () => {
    try {
      const currentUrl = window.location.href;
      
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(currentUrl);
      } else {
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

  const handleCalculate = () => {
    let calculation: LoanResult | TaxResult | null = null;

    switch (activeTab) {
      case 'jeonse-loan':
        if (jeonseDeposit && jeonseInterestRate && jeonseLoanTerm) {
          calculation = calculateJeonseLoan(
            parseInt(jeonseDeposit.replace(/,/g, '')),
            parseFloat(jeonseInterestRate),
            parseInt(jeonseLoanTerm)
          );
        }
        break;
      case 'mortgage-loan':
        if (housePrice && downPayment && mortgageRate && mortgageTerm) {
          calculation = calculateMortgageLoan(
            parseInt(housePrice.replace(/,/g, '')),
            parseInt(downPayment.replace(/,/g, '')),
            parseFloat(mortgageRate),
            parseInt(mortgageTerm)
          );
        }
        break;
      case 'acquisition-tax':
        if (acquisitionPrice && area) {
          calculation = calculateAcquisitionTax(
            parseInt(acquisitionPrice.replace(/,/g, '')),
            propertyType,
            isFirstHome,
            parseFloat(area)
          );
        }
        break;
    }

    setResult(calculation);
  };

  // 입력 핸들러들
  const handleNumberInput = (value: string, setter: (value: string) => void, paramKey: string) => {
    const numValue = value.replace(/,/g, '');
    if (/^\d*$/.test(numValue)) {
      const formattedValue = formatNumber(Number(numValue));
      setter(formattedValue);
      updateURL({ [paramKey]: numValue, tab: activeTab });
    }
  };

  // URL에서 초기값 로드
  useEffect(() => {
    const tabParam = searchParams.get('tab') as CalculatorType;
    if (tabParam && ['jeonse-loan', 'mortgage-loan', 'acquisition-tax'].includes(tabParam)) {
      setActiveTab(tabParam);
    }

    // 각 탭별 파라미터 로드
    const jeonseParam = searchParams.get('jeonse');
    const housePriceParam = searchParams.get('housePrice');
    const downParam = searchParams.get('down');
    const acquisitionParam = searchParams.get('acquisition');
    const areaParam = searchParams.get('area');
    const typeParam = searchParams.get('type');
    const firstHomeParam = searchParams.get('firstHome');

    if (jeonseParam && /^\d+$/.test(jeonseParam)) {
      setJeonseDeposit(formatNumber(Number(jeonseParam)));
    }
    if (housePriceParam && /^\d+$/.test(housePriceParam)) {
      setHousePrice(formatNumber(Number(housePriceParam)));
    }
    if (downParam && /^\d+$/.test(downParam)) {
      setDownPayment(formatNumber(Number(downParam)));
    }
    if (acquisitionParam && /^\d+$/.test(acquisitionParam)) {
      setAcquisitionPrice(formatNumber(Number(acquisitionParam)));
    }
    if (areaParam && /^\d*\.?\d*$/.test(areaParam)) {
      setArea(areaParam);
    }
    if (typeParam && ['apartment', 'house', 'land'].includes(typeParam)) {
      setPropertyType(typeParam as 'apartment' | 'house' | 'land');
    }
    if (firstHomeParam === 'false') {
      setIsFirstHome(false);
    }
  }, [searchParams]);

  useEffect(() => {
    handleCalculate();
  }, [activeTab, jeonseDeposit, jeonseInterestRate, jeonseLoanTerm, housePrice, downPayment, mortgageRate, mortgageTerm, acquisitionPrice, propertyType, isFirstHome, area]);

  const renderInputSection = () => {
    switch (activeTab) {
      case 'jeonse-loan':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                전세보증금
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={jeonseDeposit}
                  onChange={(e) => handleNumberInput(e.target.value, setJeonseDeposit, 'jeonse')}
                  placeholder="예: 500,000,000"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
                />
                <span className="absolute right-3 top-3 text-gray-500 dark:text-gray-400">원</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  대출금리
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={jeonseInterestRate}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (/^\d*\.?\d*$/.test(value)) {
                        setJeonseInterestRate(value);
                        updateURL({ jeonseRate: value, tab: activeTab });
                      }
                    }}
                    placeholder="3.5"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
                  />
                  <span className="absolute right-3 top-3 text-gray-500 dark:text-gray-400">%</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  대출기간
                </label>
                <select
                  value={jeonseLoanTerm}
                  onChange={(e) => {
                    setJeonseLoanTerm(e.target.value);
                    updateURL({ jeonseTerm: e.target.value, tab: activeTab });
                  }}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
                >
                  <option value="1">1년</option>
                  <option value="2">2년</option>
                  <option value="3">3년</option>
                  <option value="4">4년</option>
                  <option value="5">5년</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 'mortgage-loan':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  주택가격
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={housePrice}
                    onChange={(e) => handleNumberInput(e.target.value, setHousePrice, 'housePrice')}
                    placeholder="예: 1,000,000,000"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
                  />
                  <span className="absolute right-3 top-3 text-gray-500 dark:text-gray-400">원</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  계약금/중도금
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={downPayment}
                    onChange={(e) => handleNumberInput(e.target.value, setDownPayment, 'down')}
                    placeholder="예: 300,000,000"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
                  />
                  <span className="absolute right-3 top-3 text-gray-500 dark:text-gray-400">원</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  대출금리
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={mortgageRate}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (/^\d*\.?\d*$/.test(value)) {
                        setMortgageRate(value);
                        updateURL({ mortgageRate: value, tab: activeTab });
                      }
                    }}
                    placeholder="4.0"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
                  />
                  <span className="absolute right-3 top-3 text-gray-500 dark:text-gray-400">%</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  대출기간
                </label>
                <select
                  value={mortgageTerm}
                  onChange={(e) => {
                    setMortgageTerm(e.target.value);
                    updateURL({ mortgageTerm: e.target.value, tab: activeTab });
                  }}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
                >
                  <option value="10">10년</option>
                  <option value="15">15년</option>
                  <option value="20">20년</option>
                  <option value="25">25년</option>
                  <option value="30">30년</option>
                  <option value="35">35년</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 'acquisition-tax':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                취득가액
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={acquisitionPrice}
                  onChange={(e) => handleNumberInput(e.target.value, setAcquisitionPrice, 'acquisition')}
                  placeholder="예: 800,000,000"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
                />
                <span className="absolute right-3 top-3 text-gray-500 dark:text-gray-400">원</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  부동산 유형
                </label>
                <select
                  value={propertyType}
                  onChange={(e) => {
                    const value = e.target.value as 'apartment' | 'house' | 'land';
                    setPropertyType(value);
                    updateURL({ type: value, tab: activeTab });
                  }}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
                >
                  <option value="apartment">아파트</option>
                  <option value="house">단독주택</option>
                  <option value="land">토지</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  면적
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={area}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (/^\d*\.?\d*$/.test(value)) {
                        setArea(value);
                        updateURL({ area: value, tab: activeTab });
                      }
                    }}
                    placeholder="84.3"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
                  />
                  <span className="absolute right-3 top-3 text-gray-500 dark:text-gray-400">㎡</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                주택 보유 현황
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={isFirstHome}
                    onChange={() => {
                      setIsFirstHome(true);
                      updateURL({ firstHome: 'true', tab: activeTab });
                    }}
                    className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span className="ml-2 text-sm text-gray-900 dark:text-gray-300">1주택자 (무주택 포함)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={!isFirstHome}
                    onChange={() => {
                      setIsFirstHome(false);
                      updateURL({ firstHome: 'false', tab: activeTab });
                    }}
                    className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span className="ml-2 text-sm text-gray-900 dark:text-gray-300">다주택자</span>
                </label>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderResult = () => {
    if (!result) return null;

    if (activeTab === 'acquisition-tax') {
      const taxResult = result as TaxResult;
      return (
        <div className="space-y-6">
          <div className="text-center p-6 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl text-white">
            <div className="text-sm opacity-90 mb-1">총 세금</div>
            <div className="text-3xl font-bold">{formatNumber(taxResult.totalTax)}원</div>
            <button
              onClick={handleShare}
              className="mt-4 inline-flex items-center space-x-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-white transition-colors"
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
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
              <span className="text-gray-600 dark:text-gray-400">취득세</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatNumber(taxResult.acquisitionTax)}원
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
              <span className="text-gray-600 dark:text-gray-400">지방교육세</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatNumber(taxResult.localTax)}원
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
              <span className="text-gray-600 dark:text-gray-400">인지세</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatNumber(taxResult.stampTax)}원
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
              <span className="text-gray-600 dark:text-gray-400">등록세</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatNumber(taxResult.registrationTax)}원
              </span>
            </div>
          </div>
        </div>
      );
    } else {
      const loanResult = result as LoanResult;
      return (
        <div className="space-y-6">
          <div className="text-center p-6 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl text-white">
            <div className="text-sm opacity-90 mb-1">월 상환금액</div>
            <div className="text-3xl font-bold">{formatNumber(loanResult.monthlyPayment)}원</div>
            {loanResult.loanToValue && (
              <div className="text-purple-100 text-sm mt-1">
                LTV: {loanResult.loanToValue.toFixed(1)}%
              </div>
            )}
            <button
              onClick={handleShare}
              className="mt-4 inline-flex items-center space-x-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-white transition-colors"
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
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
              <span className="text-gray-600 dark:text-gray-400">총 상환금액</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatNumber(loanResult.totalPayment)}원
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
              <span className="text-gray-600 dark:text-gray-400">총 이자비용</span>
              <span className="font-semibold text-red-600 dark:text-red-400">
                {formatNumber(loanResult.totalInterest)}원
              </span>
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
          <Home className="w-8 h-8 text-purple-600" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">부동산 계산기</h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          전세자금대출, 주택담보대출, 취득세를 정확하게 계산해보세요.
        </p>
      </div>

      {/* 탭 메뉴 */}
      <div className="flex flex-wrap justify-center mb-8 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
        {Object.entries(calculatorTypes).map(([key, label]) => (
          <button
            key={key}
            onClick={() => {
              setActiveTab(key as CalculatorType);
              updateURL({ tab: key });
            }}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === key
                ? 'bg-white dark:bg-gray-700 text-purple-600 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-purple-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* 입력 섹션 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">
            {calculatorTypes[activeTab]} 정보 입력
          </h2>
          
          {renderInputSection()}

          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg mt-6">
            <h3 className="text-sm font-medium text-purple-800 dark:text-purple-200 mb-2">
              <Calculator className="w-4 h-4 inline mr-1" />
              계산 기준
            </h3>
            <ul className="text-sm text-purple-700 dark:text-purple-300 space-y-1">
              {activeTab === 'jeonse-loan' && (
                <>
                  <li>• LTV 80% 기준 계산</li>
                  <li>• 원리금균등상환 방식</li>
                  <li>• 실제 대출조건은 은행별로 상이</li>
                </>
              )}
              {activeTab === 'mortgage-loan' && (
                <>
                  <li>• 원리금균등상환 방식</li>
                  <li>• LTV 계산 포함</li>
                  <li>• 실제 금리는 신용등급별 차등</li>
                </>
              )}
              {activeTab === 'acquisition-tax' && (
                <>
                  <li>• 2024년 취득세법 기준</li>
                  <li>• 1주택자 감면 혜택 적용</li>
                  <li>• 지방교육세, 인지세, 등록세 포함</li>
                </>
              )}
            </ul>
          </div>
        </div>

        {/* 결과 섹션 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">계산 결과</h2>
          
          {result ? (
            renderResult()
          ) : (
            <div className="text-center py-12">
              <Building className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                필요한 정보를 입력하면<br />
                계산 결과를 보여드립니다.
              </p>
            </div>
          )}

          {result && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mt-6">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                <TrendingUp className="w-4 h-4 inline mr-1" />
                참고사항
              </h3>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                {activeTab === 'jeonse-loan' && (
                  <>
                    <li>• 실제 대출한도는 소득과 신용등급에 따라 달라집니다</li>
                    <li>• 중도상환수수료가 별도로 발생할 수 있습니다</li>
                  </>
                )}
                {activeTab === 'mortgage-loan' && (
                  <>
                    <li>• DSR, DTI 규제로 실제 대출한도가 제한될 수 있습니다</li>
                    <li>• 변동금리 선택시 이자 부담이 변동될 수 있습니다</li>
                  </>
                )}
                {activeTab === 'acquisition-tax' && (
                  <>
                    <li>• 지역별 조례에 따라 감면 혜택이 추가될 수 있습니다</li>
                    <li>• 신혼부부, 다자녀 등 추가 감면 조건을 확인하세요</li>
                  </>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const RealEstateCalculator = () => {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div></div>}>
      <RealEstateCalculatorContent />
    </Suspense>
  );
};

export default RealEstateCalculator;