'use client'

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowUpDown, Globe, TrendingUp, Calculator, Share2, Check, RefreshCw, Save } from 'lucide-react';
import { useCalculationHistory } from '@/hooks/useCalculationHistory';
import CalculationHistory from '@/components/CalculationHistory';
import GuideSection from '@/components/GuideSection';

interface ExchangeRate {
  [key: string]: number;
}

interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  flag: string;
}

const ExchangeRateCalculatorContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [amount, setAmount] = useState('1');
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('KRW');
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate>({});
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [result, setResult] = useState<number | null>(null);
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
  } = useCalculationHistory('exchange');

  // 주요 통화 정보
  const currencies: CurrencyInfo[] = [
    { code: 'KRW', name: '한국 원', symbol: '₩', flag: '🇰🇷' },
    { code: 'USD', name: '미국 달러', symbol: '$', flag: '🇺🇸' },
    { code: 'EUR', name: '유로', symbol: '€', flag: '🇪🇺' },
    { code: 'JPY', name: '일본 엔', symbol: '¥', flag: '🇯🇵' },
    { code: 'GBP', name: '영국 파운드', symbol: '£', flag: '🇬🇧' },
    { code: 'CNY', name: '중국 위안', symbol: '¥', flag: '🇨🇳' },
    { code: 'CAD', name: '캐나다 달러', symbol: 'C$', flag: '🇨🇦' },
    { code: 'AUD', name: '호주 달러', symbol: 'A$', flag: '🇦🇺' },
    { code: 'CHF', name: '스위스 프랑', symbol: 'CHF', flag: '🇨🇭' },
    { code: 'SGD', name: '싱가포르 달러', symbol: 'S$', flag: '🇸🇬' },
    { code: 'HKD', name: '홍콩 달러', symbol: 'HK$', flag: '🇭🇰' },
    { code: 'NZD', name: '뉴질랜드 달러', symbol: 'NZ$', flag: '🇳🇿' }
  ];

  // 환율 API 호출 (exchangerate-api.com 사용 - 무료)
  const fetchExchangeRates = async () => {
    try {
      setLoading(true);
      
      // CORS 문제를 피하기 위해 다른 무료 API 사용
      const response = await fetch('https://open.er-api.com/v6/latest/USD');
      const data = await response.json();
      
      if (data && data.rates) {
        setExchangeRates(data.rates);
        setLastUpdated(new Date(data.time_last_update_utc || Date.now()));
      } else {
        throw new Error('Invalid API response');
      }
    } catch (error) {
      console.error('환율 정보를 가져오는데 실패했습니다:', error);
      // 실패시 더미 데이터 사용 (실제 근사치)
      const fallbackRates = {
        KRW: 1340.50,
        USD: 1,
        EUR: 0.85,
        JPY: 150.25,
        GBP: 0.79,
        CNY: 7.25,
        CAD: 1.36,
        AUD: 1.52,
        CHF: 0.88,
        SGD: 1.34,
        HKD: 7.83,
        NZD: 1.62
      };
      
      setExchangeRates(fallbackRates);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  };

  // 환율 계산
  const calculateExchange = () => {
    if (!amount || !exchangeRates[fromCurrency] || !exchangeRates[toCurrency]) {
      setResult(null);
      return;
    }

    const amountNum = parseFloat(amount.replace(/,/g, ''));
    if (isNaN(amountNum)) {
      setResult(null);
      return;
    }

    // USD 기준으로 환율 계산
    const usdAmount = fromCurrency === 'USD' ? amountNum : amountNum / exchangeRates[fromCurrency];
    const convertedAmount = toCurrency === 'USD' ? usdAmount : usdAmount * exchangeRates[toCurrency];
    
    setResult(convertedAmount);
    setShowSaveButton(true); // 계산 결과가 있으면 저장 버튼 표시
  };

  const formatNumber = (num: number, decimals: number = 2) => {
    return new Intl.NumberFormat('ko-KR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(num);
  };

  const formatAmount = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // 계산 결과 저장
  const handleSaveCalculation = () => {
    if (!result) return;

    const inputs = {
      amount,
      fromCurrency,
      toCurrency
    };

    const success = saveCalculation(inputs, { convertedAmount: result, exchangeRate: getExchangeRate() });
    if (success) {
      setShowSaveButton(false);
    }
  };

  // 이력에서 불러오기
  const handleLoadFromHistory = (historyId: string) => {
    const inputs = loadFromHistory(historyId);
    if (inputs) {
      setAmount(inputs.amount || '1');
      setFromCurrency(inputs.fromCurrency || 'USD');
      setToCurrency(inputs.toCurrency || 'KRW');
      
      // URL도 업데이트
      updateURL({
        amount: inputs.amount || '1',
        from: inputs.fromCurrency || 'USD',
        to: inputs.toCurrency || 'KRW'
      });
    }
  };

  // 이력 결과 포맷팅
  const formatHistoryResult = (result: Record<string, unknown>) => {
    if (!result) return '';
    return `${formatNumber(Number(result.convertedAmount) || 0)} (환율: ${formatNumber(Number(result.exchangeRate) || 0, 4)})`;
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

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/,/g, '');
    if (/^\d*\.?\d*$/.test(value)) {
      setAmount(value);
      updateURL({ amount: value });
    }
  };

  const handleSwapCurrencies = () => {
    const temp = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(temp);
    updateURL({ from: toCurrency, to: temp });
  };

  const getCurrencyInfo = (code: string) => {
    return currencies.find(c => c.code === code) || { code, name: code, symbol: code, flag: '🌐' };
  };

  const getExchangeRate = () => {
    if (!exchangeRates[fromCurrency] || !exchangeRates[toCurrency]) return null;
    
    const rate = exchangeRates[toCurrency] / exchangeRates[fromCurrency];
    return rate;
  };

  // URL에서 초기값 로드
  useEffect(() => {
    const amountParam = searchParams.get('amount');
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    if (amountParam && /^\d*\.?\d*$/.test(amountParam)) {
      setAmount(amountParam);
    }
    if (fromParam && currencies.some(c => c.code === fromParam)) {
      setFromCurrency(fromParam);
    }
    if (toParam && currencies.some(c => c.code === toParam)) {
      setToCurrency(toParam);
    }
  }, [searchParams]);

  // 컴포넌트 마운트시 환율 정보 가져오기
  useEffect(() => {
    fetchExchangeRates();
  }, []);

  // 계산 실행
  useEffect(() => {
    calculateExchange();
  }, [amount, fromCurrency, toCurrency, exchangeRates]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">환율 계산기</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            실시간 환율을 기반으로 정확한 환전 금액을 계산하세요
            {lastUpdated && ` · 업데이트: ${lastUpdated.toLocaleString('ko-KR')}`}
          </p>
        </div>
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
        {/* 입력 섹션 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">환전 계산</h2>
            <button
              onClick={fetchExchangeRates}
              disabled={loading}
              className="inline-flex items-center space-x-2 bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 px-3 py-2 rounded-lg text-blue-700 dark:text-blue-300 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="text-sm">환율 갱신</span>
            </button>
          </div>
          
          <div className="space-y-6">
            {/* 금액 입력 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                금액
              </label>
              <input
                type="text"
                value={amount}
                onChange={handleAmountChange}
                placeholder="100"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white text-lg"
              />
            </div>

            {/* 기준 통화 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                보낸 통화
              </label>
              <select
                value={fromCurrency}
                onChange={(e) => {
                  setFromCurrency(e.target.value);
                  updateURL({ from: e.target.value });
                }}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
              >
                {currencies.map(currency => (
                  <option key={currency.code} value={currency.code}>
                    {currency.flag} {currency.code} - {currency.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 통화 교환 버튼 */}
            <div className="flex justify-center">
              <button
                onClick={handleSwapCurrencies}
                className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full text-blue-600 dark:text-blue-400 transition-colors"
              >
                <ArrowUpDown className="w-5 h-5" />
              </button>
            </div>

            {/* 대상 통화 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                받을 통화
              </label>
              <select
                value={toCurrency}
                onChange={(e) => {
                  setToCurrency(e.target.value);
                  updateURL({ to: e.target.value });
                }}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
              >
                {currencies.map(currency => (
                  <option key={currency.code} value={currency.code}>
                    {currency.flag} {currency.code} - {currency.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 환율 정보 */}
            {!loading && Object.keys(exchangeRates).length > 0 && getExchangeRate() && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                  <Calculator className="w-4 h-4 inline mr-1" />
                  현재 환율
                </h3>
                <p className="text-blue-700 dark:text-blue-300">
                  1 {fromCurrency} = {formatNumber(getExchangeRate()!, 4)} {toCurrency}
                </p>
              </div>
            )}
            
            {/* 로딩 중일 때 */}
            {loading && (
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">환율 정보 로딩 중...</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 결과 섹션 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">환전 결과</h2>
          
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">환율 정보를 가져오는 중...</p>
            </div>
          ) : result !== null ? (
            <div className="space-y-6">
              <div className="text-center p-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl text-white">
                <div className="text-sm opacity-90 mb-1">환전 결과</div>
                <div className="text-3xl font-bold mb-2">
                  {getCurrencyInfo(toCurrency).symbol} {formatNumber(result)}
                </div>
                <div className="text-blue-100">
                  {formatAmount(parseFloat(amount))} {fromCurrency} → {formatNumber(result)} {toCurrency}
                </div>
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
                  <span className="text-gray-600 dark:text-gray-400">보낸 금액</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {getCurrencyInfo(fromCurrency).symbol} {formatAmount(parseFloat(amount))}
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                  <span className="text-gray-600 dark:text-gray-400">환율</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    1 {fromCurrency} = {formatNumber(getExchangeRate()!, 4)} {toCurrency}
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-t border-gray-200 dark:border-gray-600 font-semibold">
                  <span className="text-gray-900 dark:text-white">받을 금액</span>
                  <span className="text-blue-600 dark:text-blue-400">
                    {getCurrencyInfo(toCurrency).symbol} {formatNumber(result)}
                  </span>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                  <TrendingUp className="w-4 h-4 inline mr-1" />
                  참고사항
                </h3>
                <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                  <li>• 실제 환전시 은행 수수료가 추가로 발생할 수 있습니다</li>
                  <li>• 환율은 실시간으로 변동되므로 참고용으로만 사용하세요</li>
                  <li>• 대량 환전시 더 유리한 환율을 제공받을 수 있습니다</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Globe className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                금액을 입력하면<br />
                환전 결과를 계산해드립니다.
              </p>
            </div>
          )}
        </div>
      </div>

      <GuideSection namespace="exchangeRateCalculator" />
    </div>
  );
};

const ExchangeRateCalculator = () => {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div></div>}>
      <ExchangeRateCalculatorContent />
    </Suspense>
  );
};

export default ExchangeRateCalculator;