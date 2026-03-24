'use client'

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TrendingUp, TrendingDown, Calculator, Share2, Check, Save, BarChart3 } from 'lucide-react';
import { useCalculationHistory } from '@/hooks/useCalculationHistory';
import CalculationHistory from '@/components/CalculationHistory';
import GuideSection from '@/components/GuideSection';

const StockCalculatorContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [purchasePrice, setPurchasePrice] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [shares, setShares] = useState('1');
  const [result, setResult] = useState<ReturnType<typeof calculateStockReturn>>(null);
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
  } = useCalculationHistory('stock');

  // 주식 수익률 계산 함수
  const calculateStockReturn = (purchase: string, current: string, shareCount: string) => {
    const purchaseNum = parseFloat(purchase.replace(/,/g, ''));
    const currentNum = parseFloat(current.replace(/,/g, ''));
    const sharesNum = parseInt(shareCount.replace(/,/g, '')) || 1;
    
    if (!purchaseNum || !currentNum || purchaseNum <= 0 || currentNum <= 0 || sharesNum <= 0) return null;

    const totalPurchaseAmount = purchaseNum * sharesNum;
    const totalCurrentAmount = currentNum * sharesNum;
    const totalProfit = totalCurrentAmount - totalPurchaseAmount;
    const returnPercentage = ((currentNum - purchaseNum) / purchaseNum) * 100;

    return {
      purchasePrice: purchaseNum,
      currentPrice: currentNum,
      shares: sharesNum,
      totalPurchaseAmount,
      totalCurrentAmount,
      totalProfit,
      returnPercentage,
      profitPerShare: currentNum - purchaseNum,
      isProfit: totalProfit >= 0
    };
  };

  const handleCalculate = React.useCallback(() => {
    const calculation = calculateStockReturn(purchasePrice, currentPrice, shares);
    setResult(calculation);
    setShowSaveButton(!!calculation);
  }, [purchasePrice, currentPrice, shares]);

  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const formatPrice = (num: number) => {
    return num.toFixed(2);
  };

  const handleShare = async () => {
    try {
      const currentUrl = window.location.href;
      await navigator.clipboard.writeText(currentUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  const handlePriceChange = (value: string, setter: React.Dispatch<React.SetStateAction<string>>, urlParam: string) => {
    const cleanValue = value.replace(/,/g, '');
    if (/^\d*\.?\d*$/.test(cleanValue)) {
      const formattedValue = cleanValue ? formatNumber(Number(cleanValue)) : '';
      setter(formattedValue);
      updateURL({ [urlParam]: cleanValue });
    }
  };

  const handleSharesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/,/g, '');
    if (/^\d*$/.test(value)) {
      const formattedValue = value ? formatNumber(Number(value)) : '';
      setShares(formattedValue);
      updateURL({ shares: value });
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
      purchasePrice,
      currentPrice,
      shares
    };

    const success = saveCalculation(inputs, result);
    if (success) {
      setShowSaveButton(false);
    }
  };

  // 이력에서 불러오기
  const handleLoadFromHistory = (historyId: string) => {
    const inputs = loadFromHistory(historyId);
    if (inputs) {
      setPurchasePrice(inputs.purchasePrice || '');
      setCurrentPrice(inputs.currentPrice || '');
      setShares(inputs.shares || '1');
      
      updateURL({
        purchase: inputs.purchasePrice?.replace(/,/g, '') || '',
        current: inputs.currentPrice?.replace(/,/g, '') || '',
        shares: inputs.shares?.replace(/,/g, '') || '1'
      });
    }
  };

  // 이력 결과 포맷팅
  const formatHistoryResult = (result: Record<string, unknown>) => {
    if (!result) return '';
    const sign = result.isProfit ? '+' : '';
    return `${sign}${formatPrice(result.returnPercentage as number)}% (${sign}${formatNumber(result.totalProfit as number)}원)`;
  };

  // URL에서 초기값 로드
  useEffect(() => {
    const purchaseParam = searchParams.get('purchase');
    const currentParam = searchParams.get('current');
    const sharesParam = searchParams.get('shares');

    if (purchaseParam && /^\d*\.?\d*$/.test(purchaseParam)) {
      setPurchasePrice(formatNumber(Number(purchaseParam)));
    }
    if (currentParam && /^\d*\.?\d*$/.test(currentParam)) {
      setCurrentPrice(formatNumber(Number(currentParam)));
    }
    if (sharesParam && /^\d+$/.test(sharesParam)) {
      setShares(formatNumber(Number(sharesParam)));
    }
  }, [searchParams]);

  useEffect(() => {
    if (purchasePrice && currentPrice) {
      handleCalculate();
    } else {
      setResult(null);
    }
  }, [purchasePrice, currentPrice, shares, handleCalculate]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">주식 수익률 계산기</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            매수가격과 현재가격을 입력하여 주식 투자 수익률을 계산하세요
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
        {/* Input Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">투자 정보 입력</h2>
          
          <div className="space-y-6">
            {/* 매수가격 입력 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                매수가격 (주당)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={purchasePrice}
                  onChange={(e) => handlePriceChange(e.target.value, setPurchasePrice, 'purchase')}
                  placeholder="10,000"
                  className="w-full px-4 py-4 text-lg font-semibold text-gray-900 dark:text-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                />
                <span className="absolute right-4 top-4 text-gray-600 font-medium">원</span>
              </div>
            </div>

            {/* 현재가격 입력 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                현재가격 (주당)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={currentPrice}
                  onChange={(e) => handlePriceChange(e.target.value, setCurrentPrice, 'current')}
                  placeholder="12,000"
                  className="w-full px-4 py-4 text-lg font-semibold text-gray-900 dark:text-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                />
                <span className="absolute right-4 top-4 text-gray-600 font-medium">원</span>
              </div>
            </div>

            {/* 보유 주식 수 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                보유 주식 수
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={shares}
                  onChange={handleSharesChange}
                  placeholder="100"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 dark:text-white"
                />
                <span className="absolute right-3 top-3 text-gray-500 dark:text-gray-400">주</span>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 dark:text-blue-200 mb-2">💡 계산 방식</h3>
              <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                <li>• 수익률 = ((현재가 - 매수가) / 매수가) × 100</li>
                <li>• 총 수익금 = (현재가 - 매수가) × 보유 주식 수</li>
                <li>• 수수료 및 세금은 포함되지 않음</li>
                <li>• 실시간 계산으로 즉시 결과 확인</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Result Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">계산 결과</h2>
          
          {result ? (
            <div className="space-y-6">
              {/* Main Results */}
              <div className={`rounded-xl p-6 text-white ${result.isProfit ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-red-500 to-rose-600'}`}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-white/90">수익률</span>
                  {result.isProfit ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                </div>
                <div className="text-3xl font-bold mb-2 text-white">
                  {result.isProfit ? '+' : ''}{formatPrice(result.returnPercentage)}%
                </div>
                <div className="text-white/90 text-lg font-medium mb-4">
                  총 {result.isProfit ? '수익' : '손실'}: {result.isProfit ? '+' : ''}{formatNumber(result.totalProfit)}원
                </div>
                <div className="text-white/80 text-sm">
                  주당 {result.isProfit ? '수익' : '손실'}: {result.isProfit ? '+' : ''}{formatPrice(result.profitPerShare)}원
                </div>
                <div className="flex space-x-2 mt-4">
                  <button
                    onClick={handleShare}
                    className="inline-flex items-center space-x-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-white transition-colors"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>복사됨</span>
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

              {/* Detailed Breakdown */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">투자 내역</h3>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">매수 단가</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatNumber(result.purchasePrice)}원</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">현재 단가</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatNumber(result.currentPrice)}원</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">보유 주식 수</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatNumber(result.shares)}주</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-2">
                    <span className="text-gray-600 dark:text-gray-400">총 매수금액</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatNumber(result.totalPurchaseAmount)}원</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">현재 평가금액</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatNumber(result.totalCurrentAmount)}원</span>
                  </div>
                  <div className="flex justify-between border-t-2 border-gray-200 dark:border-gray-600 pt-2 font-bold">
                    <span className="text-gray-900 dark:text-white">{result.isProfit ? '총 수익금' : '총 손실금'}</span>
                    <span className={`font-bold ${result.isProfit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {result.isProfit ? '+' : ''}{formatNumber(result.totalProfit)}원
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-gray-500">
              <BarChart3 className="w-16 h-16 mb-4" />
              <p>매수가격과 현재가격을 입력해주세요</p>
            </div>
          )}
        </div>
      </div>

      {/* Tips Section */}
      <div className="mt-12 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
        <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">💡 주식 투자 팁</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-6">
            <h3 className="font-semibold text-green-900 dark:text-green-200 mb-2">📈 수익률 이해</h3>
            <p className="text-green-800 dark:text-green-300 text-sm">
              단기적인 등락보다는 장기적인 관점에서 투자하세요. 수익률은 변동성이 있습니다.
            </p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">💰 분산 투자</h3>
            <p className="text-blue-800 dark:text-blue-300 text-sm">
              한 종목에만 집중하지 말고 여러 종목과 자산에 분산 투자하여 리스크를 관리하세요.
            </p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/30 rounded-lg p-6">
            <h3 className="font-semibold text-amber-900 dark:text-amber-200 mb-2">📊 기본 분석</h3>
            <p className="text-amber-800 dark:text-amber-300 text-sm">
              주가뿐만 아니라 기업의 재무상태, 성장성, 업종 전망 등을 종합적으로 분석하세요.
            </p>
          </div>
        </div>
      </div>

      {/* 상세 투자 가이드 섹션 */}
      <GuideSection namespace="stockCalculator" />
    </div>
  );
};

const StockCalculator = () => {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div></div>}>
      <StockCalculatorContent />
    </Suspense>
  );
};

export default StockCalculator;