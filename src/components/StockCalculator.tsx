'use client'

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TrendingUp, TrendingDown, Calculator, Share2, Check, Save, BarChart3 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCalculationHistory } from '@/hooks/useCalculationHistory';
import CalculationHistory from '@/components/CalculationHistory';

const StockCalculatorContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tc = useTranslations('common');
  
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
  const formatHistoryResult = (result: any) => {
    if (!result) return '';
    const sign = result.isProfit ? '+' : '';
    return `${sign}${formatPrice(result.returnPercentage)}% (${sign}${formatNumber(result.totalProfit)}원)`;
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <TrendingUp className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">주식 수익률 계산기</h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-6">
          매수가격과 현재가격을 입력하여 주식 투자 수익률을 정확히 계산해보세요
        </p>
        
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
          <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">{tc('result')}</h2>
          
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
                        <span>{tc('copied')}</span>
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
                      <span>{tc('save')}</span>
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
      <div className="mt-12 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <h2 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white text-center">📈 주식투자 완전정복 가이드</h2>
        <p className="text-lg text-gray-600 dark:text-gray-300 text-center mb-12 max-w-4xl mx-auto break-keep whitespace-pre-line">
          주식투자 초보자부터 중급자까지! 성공하는 투자자가 되기 위한 핵심 전략과 노하우를 모두 공개합니다.
        </p>
        
        {/* 핵심 투자 전략 */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-8 transform hover:scale-105 transition-transform">
            <div className="flex items-center mb-4">
              <div className="bg-blue-600 p-3 rounded-full mr-3">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-blue-900 dark:text-blue-200">📊 기본 분석 (FA)</h3>
            </div>
            <p className="text-blue-800 dark:text-blue-300 mb-4 leading-relaxed">
              기업의 내재가치를 분석하여 장기 투자 관점에서 우량주를 발굴하는 핵심 방법론
            </p>
            <div className="space-y-3">
              <div className="bg-blue-100 dark:bg-blue-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">💰 재무제표 분석</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">PER, PBR, ROE, 부채비율 등 핵심 지표 완벽 이해</p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">📈 성장성 평가</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">매출액 증가율, 영업이익률, 시장점유율 변화 추이</p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">🏢 산업 분석</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">업종별 특성과 경기순환, 경쟁구조 파악</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-xl p-8 transform hover:scale-105 transition-transform">
            <div className="flex items-center mb-4">
              <div className="bg-green-600 p-3 rounded-full mr-3">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-green-900 dark:text-green-200">📊 기술적 분석 (TA)</h3>
            </div>
            <p className="text-green-800 dark:text-green-300 mb-4 leading-relaxed">
              차트와 거래량을 통해 매매 타이밍을 포착하고 단기 수익을 극대화하는 실전 기법
            </p>
            <div className="space-y-3">
              <div className="bg-green-100 dark:bg-green-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-green-900 dark:text-green-200 mb-1">📉 차트 패턴</h4>
                <p className="text-sm text-green-700 dark:text-green-300">지지선, 저항선, 삼각수렴, 헤드앤숄더 등 패턴 분석</p>
              </div>
              <div className="bg-green-100 dark:bg-green-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-green-900 dark:text-green-200 mb-1">📊 보조지표</h4>
                <p className="text-sm text-green-700 dark:text-green-300">이동평균선, RSI, MACD, 볼린저밴드 활용법</p>
              </div>
              <div className="bg-green-100 dark:bg-green-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-green-900 dark:text-green-200 mb-1">📈 거래량 분석</h4>
                <p className="text-sm text-green-700 dark:text-green-300">거래량과 주가 움직임의 상관관계 파악</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl p-8 transform hover:scale-105 transition-transform">
            <div className="flex items-center mb-4">
              <div className="bg-purple-600 p-3 rounded-full mr-3">
                <Calculator className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-purple-900 dark:text-purple-200">🛡️ 리스크 관리</h3>
            </div>
            <p className="text-purple-800 dark:text-purple-300 mb-4 leading-relaxed">
              손실을 최소화하고 안정적인 수익을 추구하는 체계적인 위험관리 전략
            </p>
            <div className="space-y-3">
              <div className="bg-purple-100 dark:bg-purple-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-purple-900 dark:text-purple-200 mb-1">🎯 포트폴리오 분산</h4>
                <p className="text-sm text-purple-700 dark:text-purple-300">업종별, 테마별, 시가총액별 분산투자 원칙</p>
              </div>
              <div className="bg-purple-100 dark:bg-purple-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-purple-900 dark:text-purple-200 mb-1">⛔ 손절매 전략</h4>
                <p className="text-sm text-purple-700 dark:text-purple-300">2% 룰, 이동평균선 이탈, 기술적 지지선 붕괴</p>
              </div>
              <div className="bg-purple-100 dark:bg-purple-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-purple-900 dark:text-purple-200 mb-1">💎 장기 투자</h4>
                <p className="text-sm text-purple-700 dark:text-purple-300">시간분산 투자, 배당주 포트폴리오 구성법</p>
              </div>
            </div>
          </div>
        </div>

        {/* 투자 스타일별 전략 */}
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/30 dark:to-blue-900/30 rounded-2xl p-8 mb-12">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">🎯 투자 스타일별 맞춤 전략</h3>
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <h4 className="text-xl font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center">
                <span className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full mr-3">⚡</span>
                단기 매매 (스윙)
              </h4>
              <div className="space-y-4">
                <div className="border-l-4 border-blue-400 pl-4">
                  <h5 className="font-semibold text-blue-600">📅 투자 기간: 수일~수주</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">기술적 분석 중심의 빠른 매매</p>
                  <div className="mt-2 text-xs text-blue-500 space-y-1">
                    <p>✅ 차트 패턴과 보조지표 활용</p>
                    <p>✅ 뉴스와 이슈에 민감하게 반응</p>
                    <p>✅ 엄격한 손절매와 익절매 기준</p>
                    <p>⚠️ 높은 거래비용과 세금 부담</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <h4 className="text-xl font-semibold text-green-600 dark:text-green-400 mb-4 flex items-center">
                <span className="bg-green-100 dark:bg-green-900 p-2 rounded-full mr-3">📈</span>
                중기 투자 (포지션)
              </h4>
              <div className="space-y-4">
                <div className="border-l-4 border-green-400 pl-4">
                  <h5 className="font-semibold text-green-600">📅 투자 기간: 수개월~1년</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">기본분석과 기술분석 병행</p>
                  <div className="mt-2 text-xs text-green-500 space-y-1">
                    <p>✅ 실적 개선 기대주 발굴</p>
                    <p>✅ 업종 순환과 테마주 투자</p>
                    <p>✅ 적절한 매매 타이밍 포착</p>
                    <p>⚠️ 변동성에 대한 인내심 필요</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <h4 className="text-xl font-semibold text-purple-600 dark:text-purple-400 mb-4 flex items-center">
                <span className="bg-purple-100 dark:bg-purple-900 p-2 rounded-full mr-3">💎</span>
                장기 투자 (가치)
              </h4>
              <div className="space-y-4">
                <div className="border-l-4 border-purple-400 pl-4">
                  <h5 className="font-semibold text-purple-600">📅 투자 기간: 1년 이상</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">기업 내재가치 중심 투자</p>
                  <div className="mt-2 text-xs text-purple-500 space-y-1">
                    <p>✅ 우량기업 저평가 구간 매수</p>
                    <p>✅ 배당수익과 주가상승 동시 추구</p>
                    <p>✅ 시장 변동성 무시하고 장기 보유</p>
                    <p>⚠️ 큰 자금력과 강한 신념 필요</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 종목 선택 가이드 */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 rounded-2xl p-8 mb-12">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">🔍 종목 선택 완벽 가이드</h3>
          <div className="grid lg:grid-cols-2 gap-8">
            <div>
              <h4 className="text-lg font-semibold text-amber-600 dark:text-amber-400 mb-4 flex items-center">
                <span className="bg-amber-100 dark:bg-amber-900 p-2 rounded-full mr-2">📊</span>
                재무지표 체크리스트
              </h4>
              <div className="space-y-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <h5 className="font-semibold text-amber-600 mb-2">💰 수익성 지표</h5>
                  <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <p>• ROE (자기자본이익률): 15% 이상 양호</p>
                    <p>• ROA (총자산이익률): 5% 이상 양호</p>
                    <p>• 영업이익률: 업종 평균 이상</p>
                    <p>• 순이익률: 지속적 증가 추세</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <h5 className="font-semibold text-amber-600 mb-2">🏦 안정성 지표</h5>
                  <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <p>• 부채비율: 100% 이하 안정</p>
                    <p>• 유동비율: 200% 이상 양호</p>
                    <p>• 당좌비율: 100% 이상 안정</p>
                    <p>• 이자보상배율: 5배 이상 양호</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <h5 className="font-semibold text-amber-600 mb-2">📈 성장성 지표</h5>
                  <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <p>• 매출액 증가율: 연평균 10% 이상</p>
                    <p>• 영업이익 증가율: 지속적 증가</p>
                    <p>• EPS 증가율: 연평균 15% 이상</p>
                    <p>• 시장점유율: 업계 상위권</p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-orange-600 dark:text-orange-400 mb-4 flex items-center">
                <span className="bg-orange-100 dark:bg-orange-900 p-2 rounded-full mr-2">🎯</span>
                투자 판단 기준
              </h4>
              <div className="space-y-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <h5 className="font-semibold text-orange-600 mb-2">💸 밸류에이션</h5>
                  <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <p>• PER: 업종 평균 대비 할인</p>
                    <p>• PBR: 1배 이하 저평가 구간</p>
                    <p>• PSR: 매출 대비 시가총액 비교</p>
                    <p>• EV/EBITDA: 기업가치 평가</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <h5 className="font-semibold text-orange-600 mb-2">🏢 사업모델 분석</h5>
                  <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <p>• 경쟁우위: 진입장벽과 브랜드파워</p>
                    <p>• 성장동력: 신사업과 신제품 출시</p>
                    <p>• 시장환경: 업종 전망과 규제 변화</p>
                    <p>• 경영진: 오너 리스크와 지배구조</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <h5 className="font-semibold text-orange-600 mb-2">⚡ 투자 시점</h5>
                  <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <p>• 실적 턴어라운드 기대 시점</p>
                    <p>• 주가 조정 후 지지선 근처</p>
                    <p>• 호재 발생 전 선제적 매수</p>
                    <p>• 시장 전체 조정기 우량주 매수</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 투자 실패 사례와 교훈 */}
        <div className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/30 dark:to-pink-900/30 rounded-2xl p-8 mb-12">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">⚠️ 피해야 할 투자 실수</h3>
          <div className="grid lg:grid-cols-2 gap-8">
            <div>
              <h4 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4">🚫 초보자 흔한 실수</h4>
              <div className="space-y-3">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border-l-4 border-red-400">
                  <h5 className="font-semibold text-red-600 mb-1">🎲 감정적 투자</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">FOMO(놓칠 것에 대한 두려움)와 패닉셀링</p>
                  <p className="text-xs text-red-500 mt-1">→ 투자 계획 수립하고 원칙 준수하기</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border-l-4 border-red-400">
                  <h5 className="font-semibold text-red-600 mb-1">🎯 무분별한 분산</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">너무 많은 종목에 소액 분산투자</p>
                  <p className="text-xs text-red-500 mt-1">→ 5~10개 종목에 집중 투자하기</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border-l-4 border-red-400">
                  <h5 className="font-semibold text-red-600 mb-1">📰 소문과 카더라</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">검증되지 않은 정보에 의존한 투자</p>
                  <p className="text-xs text-red-500 mt-1">→ 공식 자료와 전문가 분석 참고하기</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border-l-4 border-red-400">
                  <h5 className="font-semibold text-red-600 mb-1">⏰ 타이밍 집착</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">완벽한 매수/매도 타이밍 추구</p>
                  <p className="text-xs text-red-500 mt-1">→ 시간분산 매매로 평균 단가 관리</p>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-pink-600 dark:text-pink-400 mb-4">💡 성공 투자자 습관</h4>
              <div className="space-y-3">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border-l-4 border-green-400">
                  <h5 className="font-semibold text-green-600 mb-1">📚 지속적 학습</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">투자 서적과 재무제표 분석 공부</p>
                  <p className="text-xs text-green-500 mt-1">→ 매일 30분씩 투자 공부하기</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border-l-4 border-green-400">
                  <h5 className="font-semibold text-green-600 mb-1">📝 투자 일지</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">매매 이유와 결과 기록 및 분석</p>
                  <p className="text-xs text-green-500 mt-1">→ 성공/실패 패턴 파악하고 개선</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border-l-4 border-green-400">
                  <h5 className="font-semibold text-green-600 mb-1">🎯 목표 수익률</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">현실적인 목표 설정과 단계별 달성</p>
                  <p className="text-xs text-green-500 mt-1">→ 연 10~15% 수익률 목표 설정</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border-l-4 border-green-400">
                  <h5 className="font-semibold text-green-600 mb-1">🔄 정기 점검</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">포트폴리오 월간/분기별 리밸런싱</p>
                  <p className="text-xs text-green-500 mt-1">→ 투자 목적에 맞는 비중 조절</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 투자 도구와 정보 소스 */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-2xl p-8">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">🛠️ 필수 투자 도구 & 정보 소스</h3>
          <div className="grid lg:grid-cols-3 gap-8">
            <div>
              <h4 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-4 flex items-center">
                <span className="bg-indigo-100 dark:bg-indigo-900 p-2 rounded-full mr-2">📱</span>
                필수 앱 & 사이트
              </h4>
              <div className="space-y-3">
                <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                  <h5 className="font-semibold text-indigo-600 mb-1">📊 증권사 HTS/MTS</h5>
                  <p className="text-xs text-gray-600 dark:text-gray-300">실시간 차트와 주문 시스템</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                  <h5 className="font-semibold text-indigo-600 mb-1">💼 KRX 정보데이터시스템</h5>
                  <p className="text-xs text-gray-600 dark:text-gray-300">공식 기업정보와 공시자료</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                  <h5 className="font-semibold text-indigo-600 mb-1">📈 네이버 금융/다음 금융</h5>
                  <p className="text-xs text-gray-600 dark:text-gray-300">종목 정보와 뉴스 모음</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                  <h5 className="font-semibold text-indigo-600 mb-1">🌐 FnGuide, 38커뮤니케이션</h5>
                  <p className="text-xs text-gray-600 dark:text-gray-300">전문가 리포트와 컨센서스</p>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-purple-600 dark:text-purple-400 mb-4 flex items-center">
                <span className="bg-purple-100 dark:bg-purple-900 p-2 rounded-full mr-2">📚</span>
                투자 학습 자료
              </h4>
              <div className="space-y-3">
                <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                  <h5 className="font-semibold text-purple-600 mb-1">📖 추천 도서</h5>
                  <p className="text-xs text-gray-600 dark:text-gray-300">워렌 버핏 투자 원칙, 현명한 투자자</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                  <h5 className="font-semibold text-purple-600 mb-1">🎥 유튜브 채널</h5>
                  <p className="text-xs text-gray-600 dark:text-gray-300">슈카월드, 염승환TV 등</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                  <h5 className="font-semibold text-purple-600 mb-1">📺 투자 방송</h5>
                  <p className="text-xs text-gray-600 dark:text-gray-300">머니톡, 증권플러스 등</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                  <h5 className="font-semibold text-purple-600 mb-1">💻 온라인 강의</h5>
                  <p className="text-xs text-gray-600 dark:text-gray-300">패스트캠퍼스, 인프런 등</p>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-green-600 dark:text-green-400 mb-4 flex items-center">
                <span className="bg-green-100 dark:bg-green-900 p-2 rounded-full mr-2">🎯</span>
                투자 시뮬레이션
              </h4>
              <div className="space-y-3">
                <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                  <h5 className="font-semibold text-green-600 mb-1">🎮 모의투자</h5>
                  <p className="text-xs text-gray-600 dark:text-gray-300">가상자금으로 실전 경험 쌓기</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                  <h5 className="font-semibold text-green-600 mb-1">📊 백테스팅</h5>
                  <p className="text-xs text-gray-600 dark:text-gray-300">과거 데이터로 전략 검증</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                  <h5 className="font-semibold text-green-600 mb-1">💎 소액투자</h5>
                  <p className="text-xs text-gray-600 dark:text-gray-300">소액으로 시작해서 경험 축적</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                  <h5 className="font-semibold text-green-600 mb-1">📝 투자클럽</h5>
                  <p className="text-xs text-gray-600 dark:text-gray-300">동호회 참여로 정보 교환</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Warning Section */}
      <div className="mt-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">투자 유의사항</h3>
            <div className="mt-2 text-sm text-red-700 dark:text-red-300">
              <p>• 이 계산기는 참고용이며, 실제 투자 시 수수료, 세금 등이 추가로 발생할 수 있습니다.</p>
              <p>• 주식 투자는 원금 손실의 위험이 있으니 신중하게 투자하시기 바랍니다.</p>
              <p>• 투자 전 충분한 정보 수집과 분석을 통해 의사결정하세요.</p>
            </div>
          </div>
        </div>
      </div>
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