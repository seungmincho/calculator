'use client'

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Home, Calculator, TrendingUp, Share2, Check, Building, Save } from 'lucide-react';
import { useCalculationHistory } from '@/hooks/useCalculationHistory';
import CalculationHistory from '@/components/CalculationHistory';

type CalculatorType = 'jeonse-loan' | 'mortgage-loan' | 'acquisition-tax' | 'property-tax' | 'capital-gains-tax';

interface LoanResult {
  monthlyPayment: number;
  totalPayment: number;
  totalInterest: number;
  loanToValue?: number;
}

interface TaxResult {
  acquisitionTax?: number;
  localTax?: number;
  stampTax?: number;
  registrationTax?: number;
  totalTax: number;
  propertyTax?: number;
  educationTax?: number;
  capitalGainsTax?: number;
  localIncomeTax?: number;
}

interface PropertyTaxResult extends TaxResult {
  propertyTax: number;
  educationTax: number;
}

interface CapitalGainsTaxResult extends TaxResult {
  capitalGainsTax: number;
  localIncomeTax: number;
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

  // 종부세 관련 상태
  const [propertyValue, setPropertyValue] = useState('');
  const [propertyCount, setPropertyCount] = useState('1');
  const [ownedYears, setOwnedYears] = useState('');

  // 양도소득세 관련 상태
  const [sellPrice, setSellPrice] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [sellDate, setSellDate] = useState('');
  const [buyDate, setBuyDate] = useState('');
  const [isMultipleHomes, setIsMultipleHomes] = useState(false);

  const [result, setResult] = useState<LoanResult | TaxResult | null>(null);
  const [showSaveButton, setShowSaveButton] = useState(false);

  // 계산 이력 관리
  const {
    histories,
    isLoading: historyLoading,
    saveCalculation,
    removeHistory,
    clearHistories,
    loadFromHistory
  } = useCalculationHistory('real-estate');

  const calculatorTypes = {
    'jeonse-loan': '전세자금대출',
    'mortgage-loan': '주택담보대출',
    'acquisition-tax': '취득세 계산',
    'property-tax': '종합부동산세',
    'capital-gains-tax': '양도소득세'
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

  // 취득세 계산 (2025년 기준)
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

  // 종합부동산세 계산 (2025년 기준)
  const calculatePropertyTax = (value: number, count: number, years: number) => {
    // 1세대 1주택 공제 (9억원)
    const deduction = count === 1 ? 900000000 : 600000000; // 다주택자는 6억원 공제
    const taxableValue = Math.max(0, value - deduction);
    
    if (taxableValue <= 0) {
      return {
        propertyTax: 0,
        educationTax: 0,
        totalTax: 0
      };
    }

    // 세율 적용 (누진세율)
    let propertyTax = 0;
    const isMultipleHome = count > 1;
    
    if (isMultipleHome) {
      // 다주택자 중과세율 (0.6~3.2%)
      if (taxableValue <= 300000000) {
        propertyTax = taxableValue * 0.006;
      } else if (taxableValue <= 600000000) {
        propertyTax = 300000000 * 0.006 + (taxableValue - 300000000) * 0.008;
      } else {
        propertyTax = 300000000 * 0.006 + 300000000 * 0.008 + (taxableValue - 600000000) * 0.032;
      }
    } else {
      // 1주택자 일반세율 (0.5~2.7%)
      if (taxableValue <= 300000000) {
        propertyTax = taxableValue * 0.005;
      } else if (taxableValue <= 600000000) {
        propertyTax = 300000000 * 0.005 + (taxableValue - 300000000) * 0.007;
      } else {
        propertyTax = 300000000 * 0.005 + 300000000 * 0.007 + (taxableValue - 600000000) * 0.027;
      }
    }

    // 장기보유 공제 (3년 이상)
    if (years >= 3) {
      const discountRate = Math.min(0.8, 0.2 + (years - 3) * 0.04); // 최대 80% 공제
      propertyTax *= (1 - discountRate);
    }

    const educationTax = propertyTax * 0.2; // 지방교육세 20%
    const totalTax = propertyTax + educationTax;

    return {
      propertyTax,
      educationTax,
      totalTax
    };
  };

  // 양도소득세 계산 (2025년 기준)
  const calculateCapitalGainsTax = (sellPrice: number, buyPrice: number, sellDateStr: string, buyDateStr: string, multipleHomes: boolean) => {
    const sellDate = new Date(sellDateStr);
    const buyDate = new Date(buyDateStr);
    const ownedMonths = Math.floor((sellDate.getTime() - buyDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
    const ownedYears = Math.floor(ownedMonths / 12);
    
    // 양도차익 계산
    const capitalGains = sellPrice - buyPrice;
    if (capitalGains <= 0) {
      return {
        capitalGainsTax: 0,
        localIncomeTax: 0,
        totalTax: 0
      };
    }

    // 기본공제 (연간 250만원)
    const basicDeduction = 2500000;
    const taxableGains = Math.max(0, capitalGains - basicDeduction);
    
    if (taxableGains <= 0) {
      return {
        capitalGainsTax: 0,
        localIncomeTax: 0,
        totalTax: 0
      };
    }

    // 세율 적용
    let taxRate = 0;
    
    if (multipleHomes) {
      // 다주택자 중과세
      if (ownedYears < 1) {
        taxRate = 0.5; // 1년 미만 50%
      } else if (ownedYears < 2) {
        taxRate = 0.4; // 2년 미만 40%
      } else {
        taxRate = 0.2; // 2년 이상 20%
      }
    } else {
      // 1주택자 일반세율
      if (ownedYears < 1) {
        taxRate = 0.4; // 1년 미만 40%
      } else if (ownedYears < 2) {
        taxRate = 0.3; // 2년 미만 30%
      } else {
        taxRate = 0.15; // 2년 이상 15%
      }
    }

    // 장기보유 특별공제 (3년 이상)
    let finalTaxableGains = taxableGains;
    if (ownedYears >= 3) {
      const discountRate = Math.min(0.3, (ownedYears - 3) * 0.04); // 최대 30% 공제
      finalTaxableGains = taxableGains * (1 - discountRate);
    }

    const capitalGainsTax = finalTaxableGains * taxRate;
    const localIncomeTax = capitalGainsTax * 0.1; // 지방소득세 10%
    const totalTax = capitalGainsTax + localIncomeTax;

    return {
      capitalGainsTax,
      localIncomeTax,
      totalTax
    };
  };

  const formatNumber = (num: number) => {
    return Math.floor(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // 계산 결과 저장
  const handleSaveCalculation = () => {
    if (!result) return;

    let inputs: any = { activeTab };
    
    switch (activeTab) {
      case 'jeonse-loan':
        inputs = { ...inputs, jeonseDeposit, jeonseInterestRate, jeonseLoanTerm };
        break;
      case 'mortgage-loan':
        inputs = { ...inputs, housePrice, downPayment, mortgageRate, mortgageTerm };
        break;
      case 'acquisition-tax':
        inputs = { ...inputs, acquisitionPrice, propertyType, isFirstHome, area };
        break;
      case 'property-tax':
        inputs = { ...inputs, propertyValue, propertyCount, ownedYears };
        break;
      case 'capital-gains-tax':
        inputs = { ...inputs, sellPrice, buyPrice, sellDate, buyDate, isMultipleHomes };
        break;
    }

    const success = saveCalculation(inputs, result);
    if (success) {
      setShowSaveButton(false);
    }
  };

  // 이력에서 불러오기
  const handleLoadFromHistory = (historyId: string) => {
    const inputs = loadFromHistory(historyId);
    if (inputs) {
      if (inputs.activeTab) {
        setActiveTab(inputs.activeTab);
        
        switch (inputs.activeTab) {
          case 'jeonse-loan':
            if (inputs.jeonseDeposit) setJeonseDeposit(inputs.jeonseDeposit);
            if (inputs.jeonseInterestRate) setJeonseInterestRate(inputs.jeonseInterestRate);
            if (inputs.jeonseLoanTerm) setJeonseLoanTerm(inputs.jeonseLoanTerm);
            break;
          case 'mortgage-loan':
            if (inputs.housePrice) setHousePrice(inputs.housePrice);
            if (inputs.downPayment) setDownPayment(inputs.downPayment);
            if (inputs.mortgageRate) setMortgageRate(inputs.mortgageRate);
            if (inputs.mortgageTerm) setMortgageTerm(inputs.mortgageTerm);
            break;
          case 'acquisition-tax':
            if (inputs.acquisitionPrice) setAcquisitionPrice(inputs.acquisitionPrice);
            if (inputs.propertyType) setPropertyType(inputs.propertyType);
            if (inputs.isFirstHome !== undefined) setIsFirstHome(inputs.isFirstHome);
            if (inputs.area) setArea(inputs.area);
            break;
          case 'property-tax':
            if (inputs.propertyValue) setPropertyValue(inputs.propertyValue);
            if (inputs.propertyCount) setPropertyCount(inputs.propertyCount);
            if (inputs.ownedYears) setOwnedYears(inputs.ownedYears);
            break;
          case 'capital-gains-tax':
            if (inputs.sellPrice) setSellPrice(inputs.sellPrice);
            if (inputs.buyPrice) setBuyPrice(inputs.buyPrice);
            if (inputs.sellDate) setSellDate(inputs.sellDate);
            if (inputs.buyDate) setBuyDate(inputs.buyDate);
            if (inputs.isMultipleHomes !== undefined) setIsMultipleHomes(inputs.isMultipleHomes);
            break;
        }
        
        // URL도 업데이트
        updateURL({ tab: inputs.activeTab });
      }
    }
  };

  // 이력 결과 포맷팅
  const formatHistoryResult = (result: any) => {
    if (!result) return '';
    
    if ('totalTax' in result) {
      if ('acquisitionTax' in result) {
        return `취득세: ${formatNumber(result.totalTax)}원`;
      } else if ('propertyTax' in result) {
        return `종부세: ${formatNumber(result.totalTax)}원`;
      } else if ('capitalGainsTax' in result) {
        return `양도세: ${formatNumber(result.totalTax)}원`;
      }
      return `총 세금: ${formatNumber(result.totalTax)}원`;
    } else if ('monthlyPayment' in result) {
      return `월 상환: ${formatNumber(result.monthlyPayment)}원`;
    }
    return '';
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
      case 'property-tax':
        if (propertyValue && ownedYears) {
          calculation = calculatePropertyTax(
            parseInt(propertyValue.replace(/,/g, '')),
            parseInt(propertyCount),
            parseInt(ownedYears)
          );
        }
        break;
      case 'capital-gains-tax':
        if (sellPrice && buyPrice && sellDate && buyDate) {
          calculation = calculateCapitalGainsTax(
            parseInt(sellPrice.replace(/,/g, '')),
            parseInt(buyPrice.replace(/,/g, '')),
            sellDate,
            buyDate,
            isMultipleHomes
          );
        }
        break;
    }

    setResult(calculation);
    setShowSaveButton(!!calculation); // 계산 결과가 있으면 저장 버튼 표시
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
    if (tabParam && ['jeonse-loan', 'mortgage-loan', 'acquisition-tax', 'property-tax', 'capital-gains-tax'].includes(tabParam)) {
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
    const propertyValueParam = searchParams.get('propertyValue');
    const propertyCountParam = searchParams.get('propertyCount');
    const ownedYearsParam = searchParams.get('ownedYears');
    const sellPriceParam = searchParams.get('sellPrice');
    const buyPriceParam = searchParams.get('buyPrice');
    const sellDateParam = searchParams.get('sellDate');
    const buyDateParam = searchParams.get('buyDate');
    const multipleHomesParam = searchParams.get('multipleHomes');

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
    if (propertyValueParam && /^\d+$/.test(propertyValueParam)) {
      setPropertyValue(formatNumber(Number(propertyValueParam)));
    }
    if (propertyCountParam && /^\d+$/.test(propertyCountParam)) {
      setPropertyCount(propertyCountParam);
    }
    if (ownedYearsParam && /^\d+$/.test(ownedYearsParam)) {
      setOwnedYears(ownedYearsParam);
    }
    if (sellPriceParam && /^\d+$/.test(sellPriceParam)) {
      setSellPrice(formatNumber(Number(sellPriceParam)));
    }
    if (buyPriceParam && /^\d+$/.test(buyPriceParam)) {
      setBuyPrice(formatNumber(Number(buyPriceParam)));
    }
    if (sellDateParam) {
      setSellDate(sellDateParam);
    }
    if (buyDateParam) {
      setBuyDate(buyDateParam);
    }
    if (multipleHomesParam === 'true') {
      setIsMultipleHomes(true);
    }
  }, [searchParams]);

  useEffect(() => {
    handleCalculate();
  }, [activeTab, jeonseDeposit, jeonseInterestRate, jeonseLoanTerm, housePrice, downPayment, mortgageRate, mortgageTerm, acquisitionPrice, propertyType, isFirstHome, area, propertyValue, propertyCount, ownedYears, sellPrice, buyPrice, sellDate, buyDate, isMultipleHomes]);

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

      case 'property-tax':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                부동산 공시가격
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={propertyValue}
                  onChange={(e) => handleNumberInput(e.target.value, setPropertyValue, 'propertyValue')}
                  placeholder="예: 1,500,000,000"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
                />
                <span className="absolute right-3 top-3 text-gray-500 dark:text-gray-400">원</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  보유 주택수
                </label>
                <select
                  value={propertyCount}
                  onChange={(e) => {
                    setPropertyCount(e.target.value);
                    updateURL({ propertyCount: e.target.value, tab: activeTab });
                  }}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
                >
                  <option value="1">1주택</option>
                  <option value="2">2주택</option>
                  <option value="3">3주택 이상</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  보유기간
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={ownedYears}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (/^\d*$/.test(value)) {
                        setOwnedYears(value);
                        updateURL({ ownedYears: value, tab: activeTab });
                      }
                    }}
                    placeholder="5"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
                  />
                  <span className="absolute right-3 top-3 text-gray-500 dark:text-gray-400">년</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'capital-gains-tax':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  매도가격
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={sellPrice}
                    onChange={(e) => handleNumberInput(e.target.value, setSellPrice, 'sellPrice')}
                    placeholder="예: 1,200,000,000"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
                  />
                  <span className="absolute right-3 top-3 text-gray-500 dark:text-gray-400">원</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  매수가격
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={buyPrice}
                    onChange={(e) => handleNumberInput(e.target.value, setBuyPrice, 'buyPrice')}
                    placeholder="예: 800,000,000"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
                  />
                  <span className="absolute right-3 top-3 text-gray-500 dark:text-gray-400">원</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  매도일
                </label>
                <input
                  type="date"
                  value={sellDate}
                  onChange={(e) => {
                    setSellDate(e.target.value);
                    updateURL({ sellDate: e.target.value, tab: activeTab });
                  }}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  매수일
                </label>
                <input
                  type="date"
                  value={buyDate}
                  onChange={(e) => {
                    setBuyDate(e.target.value);
                    updateURL({ buyDate: e.target.value, tab: activeTab });
                  }}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
                />
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
                    checked={!isMultipleHomes}
                    onChange={() => {
                      setIsMultipleHomes(false);
                      updateURL({ multipleHomes: 'false', tab: activeTab });
                    }}
                    className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span className="ml-2 text-sm text-gray-900 dark:text-gray-300">1주택자</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={isMultipleHomes}
                    onChange={() => {
                      setIsMultipleHomes(true);
                      updateURL({ multipleHomes: 'true', tab: activeTab });
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

    if (activeTab === 'acquisition-tax' || activeTab === 'property-tax' || activeTab === 'capital-gains-tax') {
      const taxResult = result as TaxResult;
      
      let titleText = '총 세금';
      let gradientClass = 'from-purple-500 to-pink-600';
      
      if (activeTab === 'property-tax') {
        titleText = '종합부동산세';
        gradientClass = 'from-blue-500 to-purple-600';
      } else if (activeTab === 'capital-gains-tax') {
        titleText = '양도소득세';
        gradientClass = 'from-red-500 to-orange-600';
      } else {
        titleText = '취득세';
      }

      return (
        <div className="space-y-6">
          <div className={`text-center p-6 bg-gradient-to-br ${gradientClass} rounded-xl text-white`}>
            <div className="text-sm opacity-90 mb-1">{titleText}</div>
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
            
            {showSaveButton && (
              <button
                onClick={handleSaveCalculation}
                className="ml-2 inline-flex items-center space-x-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-white transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>저장</span>
              </button>
            )}
          </div>

          <div className="space-y-4">
            {activeTab === 'acquisition-tax' && (
              <>
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                  <span className="text-gray-600 dark:text-gray-400">취득세</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatNumber(taxResult.acquisitionTax!)}원
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                  <span className="text-gray-600 dark:text-gray-400">지방교육세</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatNumber(taxResult.localTax!)}원
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                  <span className="text-gray-600 dark:text-gray-400">인지세</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatNumber(taxResult.stampTax!)}원
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                  <span className="text-gray-600 dark:text-gray-400">등록세</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatNumber(taxResult.registrationTax!)}원
                  </span>
                </div>
              </>
            )}
            
            {activeTab === 'property-tax' && (
              <>
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                  <span className="text-gray-600 dark:text-gray-400">종합부동산세</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatNumber(taxResult.propertyTax!)}원
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                  <span className="text-gray-600 dark:text-gray-400">지방교육세</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatNumber(taxResult.educationTax!)}원
                  </span>
                </div>
              </>
            )}
            
            {activeTab === 'capital-gains-tax' && (
              <>
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                  <span className="text-gray-600 dark:text-gray-400">양도소득세</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatNumber(taxResult.capitalGainsTax!)}원
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                  <span className="text-gray-600 dark:text-gray-400">지방소득세</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatNumber(taxResult.localIncomeTax!)}원
                  </span>
                </div>
              </>
            )}
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
            
            {showSaveButton && (
              <button
                onClick={handleSaveCalculation}
                className="ml-2 inline-flex items-center space-x-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-white transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>저장</span>
              </button>
            )}
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
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-6">
          전세자금대출, 주택담보대출, 취득세를 정확하게 계산해보세요.
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
                  <li>• 2025년 취득세법 기준</li>
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

      {/* 상세 가이드 섹션 */}
      <div className="mt-12 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <h2 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white text-center">🚀 부동산 계산 마스터 가이드</h2>
        <p className="text-lg text-gray-600 dark:text-gray-300 text-center mb-12 max-w-4xl mx-auto break-keep whitespace-pre-line">
          내 집 마련부터 투자까지! 부동산의 모든 것을 마스터하는 완전한 가이드입니다. 
          대출부터 세금까지, 똑똑한 부동산 거래로 최고의 선택을 하세요!
        </p>
        
        {/* 핵심 기능 소개 */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl p-8 transform hover:scale-105 transition-transform">
            <div className="flex items-center mb-4">
              <div className="bg-purple-600 p-3 rounded-full mr-3">
                <Home className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-purple-900 dark:text-purple-200">💎 3가지 필수 계산</h3>
            </div>
            <p className="text-purple-800 dark:text-purple-300 mb-4 leading-relaxed">
              전세자금대출, 주택담보대출, 취득세를 하나의 도구로! 내 집 마련의 모든 단계를 완벽하게 계산해드립니다.
            </p>
            <div className="space-y-3">
              <div className="bg-purple-100 dark:bg-purple-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-purple-900 dark:text-purple-200 mb-1">🏠 전세자금대출</h4>
                <p className="text-sm text-purple-700 dark:text-purple-300">LTV 80% 기준 정확한 월 상환액 계산</p>
              </div>
              <div className="bg-purple-100 dark:bg-purple-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-purple-900 dark:text-purple-200 mb-1">🏦 주택담보대출</h4>
                <p className="text-sm text-purple-700 dark:text-purple-300">LTV, DSR 고려한 현실적 대출 계산</p>
              </div>
              <div className="bg-purple-100 dark:bg-purple-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-purple-900 dark:text-purple-200 mb-1">📋 취득세 계산</h4>
                <p className="text-sm text-purple-700 dark:text-purple-300">2025년 최신 세법 기준 정확한 세금 산출</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-8 transform hover:scale-105 transition-transform">
            <div className="flex items-center mb-4">
              <div className="bg-blue-600 p-3 rounded-full mr-3">
                <Calculator className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-blue-900 dark:text-blue-200">📊 스마트 자금 계획</h3>
            </div>
            <p className="text-blue-800 dark:text-blue-300 mb-4 leading-relaxed">
              단순 계산을 넘어선 똑똑한 부동산 자금 분석! LTV부터 DTI까지 모든 규제를 고려한 맞춤형 플랜.
            </p>
            <div className="space-y-3">
              <div className="bg-blue-100 dark:bg-blue-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">🎯 LTV/DTI 분석</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">대출 규제에 맞는 최적 자금 계획</p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">💰 세금 절약 전략</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">1주택자 감면부터 다양한 혜택까지</p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">📈 총비용 산출</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">대출 이자부터 각종 세금까지 총 비용 계산</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-xl p-8 transform hover:scale-105 transition-transform">
            <div className="flex items-center mb-4">
              <div className="bg-green-600 p-3 rounded-full mr-3">
                <Building className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-green-900 dark:text-green-200">⚡ 실무 최적화 도구</h3>
            </div>
            <p className="text-green-800 dark:text-green-300 mb-4 leading-relaxed">
              공인중개사부터 일반인까지! 실무에서 바로 쓸 수 있는 전문가급 부동산 계산 도구입니다.
            </p>
            <div className="space-y-3">
              <div className="bg-green-100 dark:bg-green-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-green-900 dark:text-green-200 mb-1">📂 계산 이력 관리</h4>
                <p className="text-sm text-green-700 dark:text-green-300">여러 매물 계산 결과를 저장하고 비교</p>
              </div>
              <div className="bg-green-100 dark:bg-green-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-green-900 dark:text-green-200 mb-1">🔗 URL 공유</h4>
                <p className="text-sm text-green-700 dark:text-green-300">계산 결과를 가족이나 상담사와 공유</p>
              </div>
              <div className="bg-green-100 dark:bg-green-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-green-900 dark:text-green-200 mb-1">📱 언제 어디서나</h4>
                <p className="text-sm text-green-700 dark:text-green-300">매물 현장에서도 즉시 계산 가능</p>
              </div>
            </div>
          </div>
        </div>

        {/* 부동산 대출 완전정복 */}
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/30 dark:to-blue-900/30 rounded-2xl p-8 mb-12">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">🏦 부동산 대출 완전정복</h3>
          <p className="text-center text-gray-600 dark:text-gray-300 mb-8">내 집 마련의 핵심! 각 대출의 특징과 선택 기준을 상세히 알려드립니다</p>
          
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <h4 className="text-xl font-semibold text-purple-600 dark:text-purple-400 mb-4 flex items-center">
                <span className="bg-purple-100 dark:bg-purple-900 p-2 rounded-full mr-3">🏠</span>
                전세자금대출 (전세 보증금 마련용)
              </h4>
              <div className="space-y-4">
                <div className="border-l-4 border-purple-400 pl-4">
                  <h5 className="font-semibold text-purple-600">💡 대출 조건</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">전세 보증금의 최대 80%까지 대출 가능</p>
                  <div className="mt-2 text-xs text-purple-500 space-y-1">
                    <p>• LTV 한도: 최대 80% (조정지역은 70%)</p>
                    <p>• 대출기간: 최대 2년 (전세계약 기간 내)</p>
                    <p>• 금리: 연 3.0~4.5% (은행별 차이)</p>
                    <p>• 상환방식: 만기일시상환 or 원리금균등상환</p>
                  </div>
                </div>
                <div className="border-l-4 border-blue-400 pl-4">
                  <h5 className="font-semibold text-blue-600">🎯 대출 조건</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">소득 증빙과 신용등급이 핵심</p>
                  <div className="mt-2 text-xs text-blue-500 space-y-1">
                    <p>• 연소득: 5천만원 이상 (은행별 차이)</p>
                    <p>• 신용등급: 1~4등급 (5등급 이하는 제한)</p>
                    <p>• DSR: 총 부채 연간 원리금 ÷ 연소득 ≤ 40%</p>
                    <p>• 필요서류: 소득증명, 전세계약서, 등기부등본</p>
                  </div>
                </div>
                <div className="border-l-4 border-green-400 pl-4">
                  <h5 className="font-semibold text-green-600">💰 금리 우대 조건</h5>
                  <div className="mt-2 text-xs text-green-500 space-y-1">
                    <p>• 신혼부부: -0.2%p (결혼 7년 이내)</p>
                    <p>• 청년층: -0.2%p (만 34세 이하)</p>
                    <p>• 자동이체: -0.1%p</p>
                    <p>• 급여이체: -0.1%p</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <h4 className="text-xl font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center">
                <span className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full mr-3">🏦</span>
                주택담보대출 (내 집 마련용)
              </h4>
              <div className="space-y-4">
                <div className="border-l-4 border-blue-400 pl-4">
                  <h5 className="font-semibold text-blue-600">💡 대출 조건</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">주택 가격의 70~80%까지 대출 가능</p>
                  <div className="mt-2 text-xs text-blue-500 space-y-1">
                    <p>• LTV 한도: 최대 70% (조정지역), 80% (비조정지역)</p>
                    <p>• 대출기간: 최대 30년 (일부 은행 40년)</p>
                    <p>• 금리: 연 3.5~5.5% (변동/고정금리 선택)</p>
                    <p>• 상환방식: 원리금균등, 원금균등, 만기일시상환</p>
                  </div>
                </div>
                <div className="border-l-4 border-orange-400 pl-4">
                  <h5 className="font-semibold text-orange-600">📊 DTI/DSR 규제</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">소득 대비 대출 상환 능력 평가</p>
                  <div className="mt-2 text-xs text-orange-500 space-y-1">
                    <p>• DTI: 담보대출 연간 원리금 ÷ 연소득 ≤ 40%</p>
                    <p>• DSR: 모든 대출 연간 원리금 ÷ 연소득 ≤ 40%</p>
                    <p>• 투기지역: DTI 40%, DSR 40% (더 강화)</p>
                    <p>• 소득 증빙: 근로소득증명원, 사업자등록증명원</p>
                  </div>
                </div>
                <div className="border-l-4 border-purple-400 pl-4">
                  <h5 className="font-semibold text-purple-600">🎯 금리 유형 선택</h5>
                  <div className="mt-2 text-xs text-purple-500 space-y-1">
                    <p>• 변동금리: 시장금리 연동, 금리 변동 위험</p>
                    <p>• 고정금리: 일정 기간 금리 고정, 안정성</p>
                    <p>• 혼합금리: 초기 고정 → 후반 변동</p>
                    <p>• 추천: 금리 상승기에는 고정금리 유리</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 부동산 취득세 완벽 가이드 */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 rounded-2xl p-8 mb-12">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">📋 부동산 취득세 완벽 가이드</h3>
          <p className="text-center text-gray-600 dark:text-gray-300 mb-8">똑똑한 취득세 절약으로 부동산 구입 비용을 줄이는 모든 방법을 알려드립니다!</p>
          
          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <div className="text-center mb-4">
                <div className="bg-green-100 dark:bg-green-900 p-3 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-3">
                  <span className="text-2xl">🏠</span>
                </div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white">1주택자 (무주택 포함)</h4>
              </div>
              <div className="space-y-3">
                <div className="border-l-4 border-green-400 pl-4">
                  <h5 className="font-semibold text-green-600">📊 세율: 1~3% (누진)</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">6억원 이하 주택 구매시 감면 혜택</p>
                </div>
                <div className="text-xs text-green-500 space-y-1">
                  <p>• 6천만원 이하: 1%</p>
                  <p>• 6천만원~6억원: 1~3% 누진</p>
                  <p>• 6억원 초과: 3%</p>
                  <p>• 추가 감면: 신혼부부, 생애최초 등</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <div className="text-center mb-4">
                <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-3">
                  <span className="text-2xl">🏘️</span>
                </div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white">다주택자</h4>
              </div>
              <div className="space-y-3">
                <div className="border-l-4 border-blue-400 pl-4">
                  <h5 className="font-semibold text-blue-600">📊 세율: 1~3% (누진)</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">감면 혜택 없는 일반 세율 적용</p>
                </div>
                <div className="text-xs text-blue-500 space-y-1">
                  <p>• 6천만원 이하: 1%</p>
                  <p>• 6천만원~6억원: 1~3% 누진</p>
                  <p>• 6억원 초과: 3%</p>
                  <p>• 조정대상지역: 중과세 가능</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <div className="text-center mb-4">
                <div className="bg-amber-100 dark:bg-amber-900 p-3 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-3">
                  <span className="text-2xl">🌳</span>
                </div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white">토지</h4>
              </div>
              <div className="space-y-3">
                <div className="border-l-4 border-amber-400 pl-4">
                  <h5 className="font-semibold text-amber-600">📊 세율: 2~4% (누진)</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">주택용지보다 높은 세율 적용</p>
                </div>
                <div className="text-xs text-amber-500 space-y-1">
                  <p>• 6천만원 이하: 2%</p>
                  <p>• 6천만원~6억원: 2~4% 누진</p>
                  <p>• 6억원 초과: 4%</p>
                  <p>• 농지: 별도 감면 제도 있음</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg">
            <h5 className="font-semibold text-green-900 dark:text-green-200 mb-3">💡 취득세 절약 황금팁</h5>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <h6 className="font-bold text-green-600 mb-2">👥 신혼부부 특례</h6>
                <p className="text-green-800 dark:text-green-300">결혼 7년 이내 1억원까지 50% 감면</p>
                <div className="text-xs text-green-600 mt-1">💡 혼인신고일 기준</div>
              </div>
              <div>
                <h6 className="font-bold text-green-600 mb-2">🏠 생애최초 특례</h6>
                <p className="text-green-800 dark:text-green-300">무주택 5년 이상시 3억원까지 50% 감면</p>
                <div className="text-xs text-green-600 mt-1">💡 소득 요건 있음</div>
              </div>
              <div>
                <h6 className="font-bold text-green-600 mb-2">📅 취득 시기 조절</h6>
                <p className="text-green-800 dark:text-green-300">다주택 규제 변경 전후 고려</p>
                <div className="text-xs text-green-600 mt-1">💡 법 개정 일정 확인</div>
              </div>
            </div>
          </div>
        </div>

        {/* 부동산 투자 전략 */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-2xl p-8 mb-12">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">🎯 상황별 맞춤 부동산 전략</h3>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <div className="text-center mb-4">
                <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-3">
                  <span className="text-2xl">🏠</span>
                </div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white">내 집 마련 (생애 첫 주택)</h4>
              </div>
              <div className="space-y-3">
                <div className="border-l-4 border-blue-400 pl-4">
                  <h5 className="font-semibold text-blue-600">💰 추천 예산: 3~6억원</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">소득 대비 무리하지 않는 선에서</p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="bg-blue-50 dark:bg-blue-900/50 p-2 rounded">
                    <strong>자금 계획:</strong> 자기자금 30% + 대출 70%
                  </div>
                  <div className="text-xs text-blue-600 space-y-1">
                    <p>• 자기자금: 계약금 10% + 중도금 20%</p>
                    <p>• 잔금 대출: 주택담보대출 활용</p>
                    <p>• 세금 절약: 생애최초 특례 적극 활용</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <div className="text-center mb-4">
                <div className="bg-green-100 dark:bg-green-900 p-3 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-3">
                  <span className="text-2xl">📈</span>
                </div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white">갈아타기 (기존 주택 보유)</h4>
              </div>
              <div className="space-y-3">
                <div className="border-l-4 border-green-400 pl-4">
                  <h5 className="font-semibold text-green-600">💰 추천 예산: 현재 주택가 × 1.5배</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">기존 주택 매각 자금 활용</p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="bg-green-50 dark:bg-green-900/50 p-2 rounded">
                    <strong>전략:</strong> 매도 → 임시 거주 → 매수
                  </div>
                  <div className="text-xs text-green-600 space-y-1">
                    <p>• 1단계: 기존 주택 매도 (양도세 고려)</p>
                    <p>• 2단계: 전세 또는 임시 거주</p>
                    <p>• 3단계: 신규 주택 매수</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <div className="text-center mb-4">
                <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-3">
                  <span className="text-2xl">💼</span>
                </div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white">부동산 투자</h4>
              </div>
              <div className="space-y-3">
                <div className="border-l-4 border-purple-400 pl-4">
                  <h5 className="font-semibold text-purple-600">💰 추천 예산: 10억원 이상</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">충분한 자금력과 세금 부담 고려</p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="bg-purple-50 dark:bg-purple-900/50 p-2 rounded">
                    <strong>전략:</strong> 수익률 vs 세금 부담 분석
                  </div>
                  <div className="text-xs text-purple-600 space-y-1">
                    <p>• 임대수익률: 연 3~5% 목표</p>
                    <p>• 종합부동산세 부담 계산</p>
                    <p>• 양도소득세 중과세 고려</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 부동산 시장 이해하기 */}
        <div className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/30 dark:to-pink-900/30 rounded-2xl p-8">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">📈 부동산 시장의 모든 것</h3>
          <div className="grid lg:grid-cols-2 gap-8">
            <div>
              <h4 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4 flex items-center">
                <span className="bg-red-100 dark:bg-red-900 p-2 rounded-full mr-2">📊</span>
                부동산 가격에 영향을 주는 요인들
              </h4>
              <div className="space-y-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <h5 className="font-semibold text-red-600 mb-2">🏛️ 정책적 요인</h5>
                  <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <p><strong>LTV/DTI 규제:</strong> 대출 제한으로 수요 조절</p>
                    <p><strong>공급 정책:</strong> 신규 분양, 재개발·재건축</p>
                    <p><strong>세금 정책:</strong> 취득세, 보유세, 양도세 변화</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <h5 className="font-semibold text-red-600 mb-2">💰 경제적 요인</h5>
                  <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <p><strong>금리 변동:</strong> 기준금리 인상/인하가 대출수요 좌우</p>
                    <p><strong>경기 전망:</strong> GDP 성장률, 고용률 등</p>
                    <p><strong>인플레이션:</strong> 물가상승시 부동산 선호 증가</p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-green-600 dark:text-green-400 mb-4 flex items-center">
                <span className="bg-green-100 dark:bg-green-900 p-2 rounded-full mr-2">🎯</span>
                좋은 부동산 고르는 방법
              </h4>
              <div className="space-y-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <h5 className="font-semibold text-green-600 mb-2">📍 입지 분석</h5>
                  <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <p>• 지하철역 도보 10분 이내 (대중교통 접근성)</p>
                    <p>• 학군 우수 지역 (교육 환경)</p>
                    <p>• 대형마트, 병원 등 생활 인프라</p>
                    <p>• 향후 개발 계획 (GTX, 신도시 등)</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <h5 className="font-semibold text-green-600 mb-2">🏠 건물 조건</h5>
                  <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <p>• 건축연도 15년 이내 (관리 상태 양호)</p>
                    <p>• 세대수 300세대 이상 (유동성 확보)</p>
                    <p>• 브랜드 아파트 (재매매시 유리)</p>
                    <p>• 향, 층수, 구조 등 물리적 조건</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 bg-amber-50 dark:bg-amber-900/20 p-6 rounded-lg">
            <h5 className="font-semibold text-amber-900 dark:text-amber-200 mb-3">⚠️ 부동산 투자 주의사항</h5>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <h6 className="font-bold text-amber-600 mb-2">💰 과도한 레버리지 금지</h6>
                <p className="text-amber-800 dark:text-amber-300">대출 비중이 너무 높으면 위험</p>
                <div className="text-xs text-amber-600 mt-1">💡 자기자금 30% 이상 권장</div>
              </div>
              <div>
                <h6 className="font-bold text-amber-600 mb-2">📊 시장 타이밍 오해</h6>
                <p className="text-amber-800 dark:text-amber-300">단기 차익보다 장기 보유 관점</p>
                <div className="text-xs text-amber-600 mt-1">💡 최소 5년 이상 보유 계획</div>
              </div>
              <div>
                <h6 className="font-bold text-amber-600 mb-2">🔍 실사 부족</h6>
                <p className="text-amber-800 dark:text-amber-300">등기부, 관리비, 하자 등 꼼꼼히 확인</p>
                <div className="text-xs text-amber-600 mt-1">💡 전문가 조언 적극 활용</div>
              </div>
            </div>
          </div>
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