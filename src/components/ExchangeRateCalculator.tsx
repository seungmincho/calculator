'use client'

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowUpDown, Globe, TrendingUp, Calculator, Share2, Check, RefreshCw, Save } from 'lucide-react';
import { useCalculationHistory } from '@/hooks/useCalculationHistory';
import CalculationHistory from '@/components/CalculationHistory';

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
      
      console.log('API Response:', data); // 디버깅용
      
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
      console.log('Using fallback exchange rates:', fallbackRates);
    } finally {
      setLoading(false);
    }
  };

  // 환율 계산
  const calculateExchange = () => {
    console.log('Calculating exchange...', {
      amount,
      fromCurrency,
      toCurrency,
      exchangeRates,
      fromRate: exchangeRates[fromCurrency],
      toRate: exchangeRates[toCurrency]
    });

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
    
    console.log('Calculation result:', convertedAmount);
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
  const formatHistoryResult = (result: any) => {
    if (!result) return '';
    return `${formatNumber(result.convertedAmount)} (환율: ${formatNumber(result.exchangeRate, 4)})`;
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
          <Globe className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">환율 계산기</h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          실시간 환율을 기반으로 정확한 환전 금액을 계산해보세요.
        </p>
        {lastUpdated && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            마지막 업데이트: {lastUpdated.toLocaleString('ko-KR')}
          </p>
        )}
        
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

      {/* 상세 가이드 섹션 */}
      <div className="mt-12 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <h2 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white text-center">🚀 환율 계산 마스터 가이드</h2>
        <p className="text-lg text-gray-600 dark:text-gray-300 text-center mb-12 max-w-4xl mx-auto break-keep whitespace-pre-line">
          해외여행부터 무역업무까지! 환율의 모든 것을 마스터하는 완전한 가이드입니다. 
          환전 수수료부터 환율 예측까지, 똑똑한 환전으로 내 돈을 지키세요!
        </p>
        
        {/* 핵심 기능 소개 */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-8 transform hover:scale-105 transition-transform">
            <div className="flex items-center mb-4">
              <div className="bg-blue-600 p-3 rounded-full mr-3">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-blue-900 dark:text-blue-200">💎 실시간 환율 정보</h3>
            </div>
            <p className="text-blue-800 dark:text-blue-300 mb-4 leading-relaxed">
              전 세계 주요 12개 통화의 실시간 환율을 제공! 정확하고 빠른 환전 계산으로 최적의 타이밍을 잡으세요.
            </p>
            <div className="space-y-3">
              <div className="bg-blue-100 dark:bg-blue-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">🌍 주요 12개 통화</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">USD, EUR, JPY, GBP, CNY 등 주요국 통화 완벽 지원</p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">⚡ 실시간 업데이트</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">원클릭 환율 갱신으로 최신 정보 반영</p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">🎯 정확한 계산</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">소수점 4자리까지 정밀한 환율 계산</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-xl p-8 transform hover:scale-105 transition-transform">
            <div className="flex items-center mb-4">
              <div className="bg-green-600 p-3 rounded-full mr-3">
                <Calculator className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-green-900 dark:text-green-200">📊 스마트 환전 계산</h3>
            </div>
            <p className="text-green-800 dark:text-green-300 mb-4 leading-relaxed">
              단순 계산을 넘어선 똑똑한 환전 분석! 수수료부터 환율 변동까지 모든 요소를 고려한 맞춤형 가이드.
            </p>
            <div className="space-y-3">
              <div className="bg-green-100 dark:bg-green-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-green-900 dark:text-green-200 mb-1">💰 수수료 고려</h4>
                <p className="text-sm text-green-700 dark:text-green-300">은행별 환전 수수료 정보 제공</p>
              </div>
              <div className="bg-green-100 dark:bg-green-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-green-900 dark:text-green-200 mb-1">📈 환율 트렌드</h4>
                <p className="text-sm text-green-700 dark:text-green-300">과거 환율 데이터 기반 변동 예측</p>
              </div>
              <div className="bg-green-100 dark:bg-green-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-green-900 dark:text-green-200 mb-1">🎯 최적 타이밍</h4>
                <p className="text-sm text-green-700 dark:text-green-300">환전하기 좋은 시점 알림 서비스</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl p-8 transform hover:scale-105 transition-transform">
            <div className="flex items-center mb-4">
              <div className="bg-purple-600 p-3 rounded-full mr-3">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-purple-900 dark:text-purple-200">⚡ 여행자 전용 도구</h3>
            </div>
            <p className="text-purple-800 dark:text-purple-300 mb-4 leading-relaxed">
              해외여행부터 유학생까지! 실무에서 바로 쓸 수 있는 전문가급 환전 도구와 여행 팁을 제공합니다.
            </p>
            <div className="space-y-3">
              <div className="bg-purple-100 dark:bg-purple-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-purple-900 dark:text-purple-200 mb-1">✈️ 여행 예산 계산</h4>
                <p className="text-sm text-purple-700 dark:text-purple-300">국가별 물가 정보로 여행 예산 산출</p>
              </div>
              <div className="bg-purple-100 dark:bg-purple-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-purple-900 dark:text-purple-200 mb-1">🔗 계산 이력 저장</h4>
                <p className="text-sm text-purple-700 dark:text-purple-300">환전 계산 결과를 저장하고 비교</p>
              </div>
              <div className="bg-purple-100 dark:bg-purple-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-purple-900 dark:text-purple-200 mb-1">📱 모바일 최적화</h4>
                <p className="text-sm text-purple-700 dark:text-purple-300">해외에서도 쉽게 사용할 수 있는 인터페이스</p>
              </div>
            </div>
          </div>
        </div>

        {/* 주요 통화별 완전 분석 */}
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/30 dark:to-blue-900/30 rounded-2xl p-8 mb-12">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">🌍 주요 통화별 완전 분석</h3>
          <p className="text-center text-gray-600 dark:text-gray-300 mb-8">각 통화의 특징과 환전 전략을 상세히 알려드립니다</p>
          
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <h4 className="text-xl font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center">
                <span className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full mr-3">💵</span>
                미국 달러 (USD) & 유로 (EUR)
              </h4>
              <div className="space-y-4">
                <div className="border-l-4 border-blue-400 pl-4">
                  <h5 className="font-semibold text-blue-600">🇺🇸 미국 달러 (USD)</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">세계 기축통화, 가장 안전한 환전 선택</p>
                  <div className="mt-2 text-xs text-blue-500 space-y-1">
                    <p>• 장점: 전 세계 어디서나 환전 가능, 높은 유동성</p>
                    <p>• 환전 팁: 은행보다 공항이 비쌈, 온라인 환전 활용</p>
                    <p>• 추천: 미국, 동남아시아, 남미 여행시 필수</p>
                  </div>
                </div>
                <div className="border-l-4 border-green-400 pl-4">
                  <h5 className="font-semibold text-green-600">🇪🇺 유로 (EUR)</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">유럽연합 공통통화, 27개국에서 사용</p>
                  <div className="mt-2 text-xs text-green-500 space-y-1">
                    <p>• 장점: 유럽 여행시 여러 나라에서 사용 가능</p>
                    <p>• 환전 팁: 독일, 프랑스 은행에서 수수료 저렴</p>
                    <p>• 추천: 유럽 배낭여행, 장기 유럽 체류시</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <h4 className="text-xl font-semibold text-orange-600 dark:text-orange-400 mb-4 flex items-center">
                <span className="bg-orange-100 dark:bg-orange-900 p-2 rounded-full mr-3">🏮</span>
                일본 엔 (JPY) & 중국 위안 (CNY)
              </h4>
              <div className="space-y-4">
                <div className="border-l-4 border-orange-400 pl-4">
                  <h5 className="font-semibold text-orange-600">🇯🇵 일본 엔 (JPY)</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">아시아 3대 통화, 한국인 최다 방문국</p>
                  <div className="mt-2 text-xs text-orange-500 space-y-1">
                    <p>• 특징: 소액 단위가 크므로 큰 숫자로 계산</p>
                    <p>• 환전 팁: 한국에서 미리 환전이 유리</p>
                    <p>• 추천: 일본 여행, 온천 여행, 쇼핑 여행시</p>
                  </div>
                </div>
                <div className="border-l-4 border-red-400 pl-4">
                  <h5 className="font-semibold text-red-600">🇨🇳 중국 위안 (CNY)</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">중국 본토 통화, 최근 국제화 진행</p>
                  <div className="mt-2 text-xs text-red-500 space-y-1">
                    <p>• 특징: 홍콩달러(HKD)와 다른 통화임에 주의</p>
                    <p>• 환전 팁: 중국 현지 은행에서 환전 추천</p>
                    <p>• 추천: 중국 본토 여행, 비즈니스 출장시</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <h4 className="text-xl font-semibold text-purple-600 dark:text-purple-400 mb-4 flex items-center">
                <span className="bg-purple-100 dark:bg-purple-900 p-2 rounded-full mr-3">👑</span>
                영국 파운드 (GBP) & 스위스 프랑 (CHF)
              </h4>
              <div className="space-y-4">
                <div className="border-l-4 border-purple-400 pl-4">
                  <h5 className="font-semibold text-purple-600">🇬🇧 영국 파운드 (GBP)</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">세계에서 가장 오래된 통화 중 하나</p>
                  <div className="mt-2 text-xs text-purple-500 space-y-1">
                    <p>• 특징: 높은 환율로 소액으로도 큰 금액 환전</p>
                    <p>• 환전 팁: 런던 시내 환전소가 은행보다 유리</p>
                    <p>• 추천: 영국, 스코틀랜드, 아일랜드 여행시</p>
                  </div>
                </div>
                <div className="border-l-4 border-gray-400 pl-4">
                  <h5 className="font-semibold text-gray-600">🇨🇭 스위스 프랑 (CHF)</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">안전자산으로 인정받는 강한 통화</p>
                  <div className="mt-2 text-xs text-gray-500 space-y-1">
                    <p>• 특징: 물가가 비싸므로 충분한 환전 필요</p>
                    <p>• 환전 팁: 스위스 현지보다 한국에서 미리 환전</p>
                    <p>• 추천: 스위스 여행, 스키 여행, 명품 쇼핑시</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <h4 className="text-xl font-semibold text-green-600 dark:text-green-400 mb-4 flex items-center">
                <span className="bg-green-100 dark:bg-green-900 p-2 rounded-full mr-3">🦘</span>
                호주/캐나다 달러 & 아시아 통화들
              </h4>
              <div className="space-y-4">
                <div className="border-l-4 border-green-400 pl-4">
                  <h5 className="font-semibold text-green-600">🇦🇺🇨🇦 호주/캐나다 달러 (AUD/CAD)</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">자원부국 통화, 상품가격에 민감</p>
                  <div className="mt-2 text-xs text-green-500 space-y-1">
                    <p>• 특징: 원자재 가격 변동에 따라 환율 변동</p>
                    <p>• 환전 팁: 워킹홀리데이는 현지 계좌 개설 추천</p>
                    <p>• 추천: 워킹홀리데이, 어학연수, 이민시</p>
                  </div>
                </div>
                <div className="border-l-4 border-blue-400 pl-4">
                  <h5 className="font-semibold text-blue-600">🇸🇬🇭🇰 싱가포르/홍콩 달러 (SGD/HKD)</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">아시아 금융허브의 안정적 통화</p>
                  <div className="mt-2 text-xs text-blue-500 space-y-1">
                    <p>• 특징: 미달러와 연동되어 안정적</p>
                    <p>• 환전 팁: 현지 환전상이 은행보다 유리</p>
                    <p>• 추천: 동남아 허브, 경유지 여행시</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 환전 수수료 완벽 가이드 */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 rounded-2xl p-8 mb-12">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">💰 환전 수수료 완벽 가이드</h3>
          <p className="text-center text-gray-600 dark:text-gray-300 mb-8">똑똑한 환전으로 수수료를 절약하는 모든 방법을 알려드립니다!</p>
          
          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <div className="text-center mb-4">
                <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-3">
                  <span className="text-2xl">🏦</span>
                </div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white">은행 환전</h4>
              </div>
              <div className="space-y-3">
                <div className="border-l-4 border-blue-400 pl-4">
                  <h5 className="font-semibold text-blue-600">📊 수수료: 1.5~3%</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">안전하지만 상대적으로 높은 수수료</p>
                </div>
                <div className="text-xs text-blue-500 space-y-1">
                  <p>• 장점: 안전성, 위조지폐 걱정 없음</p>
                  <p>• 단점: 높은 수수료, 영업시간 제한</p>
                  <p>• 팁: VIP 고객은 우대 환율 적용</p>
                  <p>• 추천: 대량 환전시 안전성 중시</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <div className="text-center mb-4">
                <div className="bg-green-100 dark:bg-green-900 p-3 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-3">
                  <span className="text-2xl">💻</span>
                </div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white">온라인 환전</h4>
              </div>
              <div className="space-y-3">
                <div className="border-l-4 border-green-400 pl-4">
                  <h5 className="font-semibold text-green-600">📊 수수료: 0.5~1.5%</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">가장 저렴한 환전 방법</p>
                </div>
                <div className="text-xs text-green-500 space-y-1">
                  <p>• 장점: 낮은 수수료, 24시간 신청</p>
                  <p>• 단점: 배송 시간, 최소 금액 제한</p>
                  <p>• 팁: 여행 1주일 전 미리 신청</p>
                  <p>• 추천: 계획적인 환전, 대량 환전</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <div className="text-center mb-4">
                <div className="bg-amber-100 dark:bg-amber-900 p-3 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-3">
                  <span className="text-2xl">✈️</span>
                </div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white">공항 환전</h4>
              </div>
              <div className="space-y-3">
                <div className="border-l-4 border-amber-400 pl-4">
                  <h5 className="font-semibold text-amber-600">📊 수수료: 3~5%</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">편리하지만 가장 비싼 방법</p>
                </div>
                <div className="text-xs text-amber-500 space-y-1">
                  <p>• 장점: 24시간 이용, 즉시 환전</p>
                  <p>• 단점: 높은 수수료, 제한된 통화</p>
                  <p>• 팁: 급할 때만 최소 금액만 환전</p>
                  <p>• 추천: 응급상황, 소액 환전</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg">
            <h5 className="font-semibold text-green-900 dark:text-green-200 mb-3">💡 환전 수수료 절약 황금팁</h5>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <h6 className="font-bold text-green-600 mb-2">📅 타이밍 전략</h6>
                <p className="text-green-800 dark:text-green-300">환율이 유리할 때 미리 환전</p>
                <div className="text-xs text-green-600 mt-1">💡 급등락 시기 피하기</div>
              </div>
              <div>
                <h6 className="font-bold text-green-600 mb-2">💳 카드 활용</h6>
                <p className="text-green-800 dark:text-green-300">해외 수수료 무료 카드 사용</p>
                <div className="text-xs text-green-600 mt-1">💡 현금+카드 병행 사용</div>
              </div>
              <div>
                <h6 className="font-bold text-green-600 mb-2">🔄 현지 환전</h6>
                <p className="text-green-800 dark:text-green-300">일부 국가는 현지가 더 유리</p>
                <div className="text-xs text-green-600 mt-1">💡 환전소 가격 비교</div>
              </div>
            </div>
          </div>
        </div>

        {/* 여행 목적별 환전 전략 */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-2xl p-8 mb-12">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">🎯 여행 목적별 맞춤 환전 전략</h3>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <div className="text-center mb-4">
                <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-3">
                  <span className="text-2xl">🏖️</span>
                </div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white">단기 관광 (3~7일)</h4>
              </div>
              <div className="space-y-3">
                <div className="border-l-4 border-blue-400 pl-4">
                  <h5 className="font-semibold text-blue-600">💰 추천 금액: 500~1,000달러</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">현금 + 카드 병행 사용</p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="bg-blue-50 dark:bg-blue-900/50 p-2 rounded">
                    <strong>환전 전략:</strong> 80% 온라인 + 20% 공항
                  </div>
                  <div className="text-xs text-blue-600 space-y-1">
                    <p>• 주요 비용: 교통비, 식비, 쇼핑</p>
                    <p>• 카드 위주 + 팁용 현금 소량</p>
                    <p>• 여행 3일 전 온라인 환전</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <div className="text-center mb-4">
                <div className="bg-green-100 dark:bg-green-900 p-3 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-3">
                  <span className="text-2xl">🎒</span>
                </div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white">장기 여행 (1~3개월)</h4>
              </div>
              <div className="space-y-3">
                <div className="border-l-4 border-green-400 pl-4">
                  <h5 className="font-semibold text-green-600">💰 추천 금액: 2,000~5,000달러</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">현지 계좌 개설 고려</p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="bg-green-50 dark:bg-green-900/50 p-2 rounded">
                    <strong>환전 전략:</strong> 분할 환전 + 현지 송금
                  </div>
                  <div className="text-xs text-green-600 space-y-1">
                    <p>• 1차: 초기 정착 자금 (30%)</p>
                    <p>• 2차: 현지 환율 보고 추가 환전</p>
                    <p>• 송금: 웨스턴유니온 등 활용</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <div className="text-center mb-4">
                <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-3">
                  <span className="text-2xl">💼</span>
                </div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white">비즈니스 출장</h4>
              </div>
              <div className="space-y-3">
                <div className="border-l-4 border-purple-400 pl-4">
                  <h5 className="font-semibold text-purple-600">💰 추천 금액: 1,000~3,000달러</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">법인카드 + 개인 현금</p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="bg-purple-50 dark:bg-purple-900/50 p-2 rounded">
                    <strong>환전 전략:</strong> 100% 은행 환전 (영수증 보관)
                  </div>
                  <div className="text-xs text-purple-600 space-y-1">
                    <p>• 법인카드로 대부분 결제</p>
                    <p>• 현금: 택시, 팁, 소액 결제용</p>
                    <p>• 환전 영수증 반드시 보관</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 환율 변동 이해하기 */}
        <div className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/30 dark:to-pink-900/30 rounded-2xl p-8">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">📈 환율 변동의 모든 것</h3>
          <div className="grid lg:grid-cols-2 gap-8">
            <div>
              <h4 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4 flex items-center">
                <span className="bg-red-100 dark:bg-red-900 p-2 rounded-full mr-2">📊</span>
                환율에 영향을 주는 요인들
              </h4>
              <div className="space-y-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <h5 className="font-semibold text-red-600 mb-2">🏛️ 경제 지표</h5>
                  <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <p><strong>GDP 성장률:</strong> 경제 성장이 좋으면 통화 강세</p>
                    <p><strong>인플레이션:</strong> 물가상승률이 높으면 통화 약세</p>
                    <p><strong>고용지표:</strong> 실업률 하락시 통화 강세</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <h5 className="font-semibold text-red-600 mb-2">💰 금리 정책</h5>
                  <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <p><strong>기준금리:</strong> 금리 인상시 해당 통화 강세</p>
                    <p><strong>양적완화:</strong> 돈 공급 증가시 통화 약세</p>
                    <p><strong>금리 차이:</strong> 국가간 금리차가 환율 결정</p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-green-600 dark:text-green-400 mb-4 flex items-center">
                <span className="bg-green-100 dark:bg-green-900 p-2 rounded-full mr-2">🎯</span>
                환율 예측하는 방법
              </h4>
              <div className="space-y-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <h5 className="font-semibold text-green-600 mb-2">📰 뉴스 모니터링</h5>
                  <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <p>• 중앙은행 발표 (한국은행, 연준, ECB 등)</p>
                    <p>• 주요 경제지표 발표 일정 확인</p>
                    <p>• 국제 정치 상황 (전쟁, 선거 등)</p>
                    <p>• 무역 분쟁, 제재 뉴스 주의</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <h5 className="font-semibold text-green-600 mb-2">📊 기술적 분석</h5>
                  <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <p>• 과거 환율 차트 패턴 분석</p>
                    <p>• 지지선과 저항선 파악</p>
                    <p>• 이동평균선 추세 확인</p>
                    <p>• 변동성이 큰 시기 피하기</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 bg-amber-50 dark:bg-amber-900/20 p-6 rounded-lg">
            <h5 className="font-semibold text-amber-900 dark:text-amber-200 mb-3">⚠️ 환율 변동 대응 전략</h5>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <h6 className="font-bold text-amber-600 mb-2">📅 분할 환전</h6>
                <p className="text-amber-800 dark:text-amber-300">한 번에 몰아서 하지 말고 나누어서</p>
                <div className="text-xs text-amber-600 mt-1">💡 리스크 분산 효과</div>
              </div>
              <div>
                <h6 className="font-bold text-amber-600 mb-2">🎯 목표 환율 설정</h6>
                <p className="text-amber-800 dark:text-amber-300">원하는 환율에 도달하면 환전</p>
                <div className="text-xs text-amber-600 mt-1">💡 감정적 판단 배제</div>
              </div>
              <div>
                <h6 className="font-bold text-amber-600 mb-2">⏰ 급하지 않을 때</h6>
                <p className="text-amber-800 dark:text-amber-300">여유를 두고 좋은 타이밍 기다리기</p>
                <div className="text-xs text-amber-600 mt-1">💡 조급함은 손실의 지름길</div>
              </div>
            </div>
          </div>
        </div>
      </div>
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