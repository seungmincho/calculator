'use client'

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Home, Heart, Users, Calculator, Share2, Check, Save, Info, AlertCircle, CheckCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCalculationHistory } from '@/hooks/useCalculationHistory';
import CalculationHistory from '@/components/CalculationHistory';

const MonthlyRentSubsidyCalculatorContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('rentSubsidy');
  const tc = useTranslations('common');
  
  const [householdIncome, setHouseholdIncome] = useState('');
  const [householdMembers, setHouseholdMembers] = useState('1');
  const [rent, setRent] = useState('');
  const [deposit, setDeposit] = useState('');
  const [region, setRegion] = useState('seoul');
  const [applicantType, setApplicantType] = useState<'youth' | 'newlywed' | 'general'>('youth');
  const [result, setResult] = useState<{
    eligible: boolean;
    subsidy: number;
    maxSubsidy: number;
    incomeLimit: number;
    reason?: string;
    supportRate: number;
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
  } = useCalculationHistory('rentSubsidy');

  // LH 월세지원금 계산 함수 (2024년 기준)
  const calculateRentSubsidy = (
    income: string,
    members: string,
    monthlyRent: string,
    depositAmount: string,
    regionCode: string,
    type: 'youth' | 'newlywed' | 'general'
  ) => {
    const incomeNum = parseInt(income.replace(/,/g, '')) || 0;
    const membersNum = parseInt(members) || 1;
    const rentNum = parseInt(monthlyRent.replace(/,/g, '')) || 0;
    const depositNum = parseInt(depositAmount.replace(/,/g, '')) || 0;

    if (!incomeNum || !rentNum) return null;

    // 지역별 기준 설정
    const regionLimits: Record<string, {
      name: string;
      rentLimit: number;
      depositLimit: number;
    }> = {
      seoul: { name: '서울', rentLimit: 700000, depositLimit: 50000000 },
      gyeonggi: { name: '경기/인천', rentLimit: 600000, depositLimit: 40000000 },
      metropolitan: { name: '광역시', rentLimit: 500000, depositLimit: 30000000 },
      others: { name: '기타지역', rentLimit: 400000, depositLimit: 25000000 }
    };

    // 유형별 소득기준 (중위소득 기준)
    const incomeStandards: Record<string, Record<number, number>> = {
      youth: { // 청년 월세지원 (중위소득 60% 이하)
        1: 1356769, 2: 2265000, 3: 2906000, 4: 3544000, 5: 4181000
      },
      newlywed: { // 신혼부부 월세지원 (중위소득 70% 이하)
        1: 1583563, 2: 2642500, 3: 3391000, 4: 4134667, 5: 4877833
      },
      general: { // 일반 월세지원 (중위소득 50% 이하)
        1: 1130641, 2: 1887500, 3: 2421667, 4: 2953333, 5: 3484167
      }
    };

    const regionInfo = regionLimits[regionCode] || regionLimits.others;
    const incomeLimit = incomeStandards[type][Math.min(membersNum, 5)] || incomeStandards[type][5];

    // 자격 요건 체크
    if (incomeNum > incomeLimit) {
      return {
        eligible: false,
        subsidy: 0,
        maxSubsidy: 0,
        incomeLimit,
        reason: '소득기준 초과',
        supportRate: 0
      };
    }

    if (rentNum > regionInfo.rentLimit) {
      return {
        eligible: false,
        subsidy: 0,
        maxSubsidy: regionInfo.rentLimit,
        incomeLimit,
        reason: '월세 상한액 초과',
        supportRate: 0
      };
    }

    if (depositNum > regionInfo.depositLimit) {
      return {
        eligible: false,
        subsidy: 0,
        maxSubsidy: 0,
        incomeLimit,
        reason: '보증금 상한액 초과',
        supportRate: 0
      };
    }

    // 지원율 계산 (소득 구간별)
    let supportRate = 0;
    const incomeRatio = incomeNum / incomeLimit;
    
    if (incomeRatio <= 0.5) {
      supportRate = type === 'youth' ? 0.4 : 0.3; // 청년: 40%, 기타: 30%
    } else if (incomeRatio <= 0.7) {
      supportRate = type === 'youth' ? 0.3 : 0.25; // 청년: 30%, 기타: 25%
    } else {
      supportRate = 0.2; // 20%
    }

    // 지원금 계산
    const maxSubsidy = Math.min(rentNum * supportRate, regionInfo.rentLimit * supportRate);
    const subsidy = Math.floor(maxSubsidy / 1000) * 1000; // 천원 단위 절사

    return {
      eligible: true,
      subsidy,
      maxSubsidy: regionInfo.rentLimit,
      incomeLimit,
      supportRate: supportRate * 100
    };
  };

  const handleCalculate = React.useCallback(() => {
    const calculation = calculateRentSubsidy(
      householdIncome,
      householdMembers,
      rent,
      deposit,
      region,
      applicantType
    );
    setResult(calculation);
    setShowSaveButton(!!calculation);
  }, [householdIncome, householdMembers, rent, deposit, region, applicantType]);

  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
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

  const handleRentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    if (value) {
      const formattedValue = formatNumber(Number(value));
      setRent(formattedValue);
      updateURL({ rent: value });
    } else {
      setRent('');
      updateURL({ rent: '' });
    }
  };

  const handleDepositChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    if (value) {
      const formattedValue = formatNumber(Number(value));
      setDeposit(formattedValue);
      updateURL({ deposit: value });
    } else {
      setDeposit('');
      updateURL({ deposit: '' });
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
      rent,
      deposit,
      region,
      applicantType
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
      setHouseholdMembers(inputs.householdMembers || '1');
      setRent(inputs.rent || '');
      setDeposit(inputs.deposit || '');
      setRegion(inputs.region || 'seoul');
      setApplicantType(inputs.applicantType || 'youth');
      
      // URL도 업데이트
      updateURL({
        income: inputs.householdIncome?.replace(/,/g, '') || '',
        members: inputs.householdMembers || '1',
        rent: inputs.rent?.replace(/,/g, '') || '',
        deposit: inputs.deposit?.replace(/,/g, '') || '',
        region: inputs.region || 'seoul',
        type: inputs.applicantType || 'youth'
      });
    }
  };

  // URL에서 파라미터 로드
  useEffect(() => {
    const incomeParam = searchParams.get('income');
    const membersParam = searchParams.get('members');
    const rentParam = searchParams.get('rent');
    const depositParam = searchParams.get('deposit');
    const regionParam = searchParams.get('region');
    const typeParam = searchParams.get('type');

    if (incomeParam && /^\d+$/.test(incomeParam)) {
      setHouseholdIncome(formatNumber(Number(incomeParam)));
    }
    if (membersParam && /^\d+$/.test(membersParam)) {
      setHouseholdMembers(membersParam);
    }
    if (rentParam && /^\d+$/.test(rentParam)) {
      setRent(formatNumber(Number(rentParam)));
    }
    if (depositParam && /^\d+$/.test(depositParam)) {
      setDeposit(formatNumber(Number(depositParam)));
    }
    if (regionParam) {
      setRegion(regionParam);
    }
    if (typeParam && ['youth', 'newlywed', 'general'].includes(typeParam)) {
      setApplicantType(typeParam as 'youth' | 'newlywed' | 'general');
    }
  }, [searchParams]);

  // 자동 계산
  useEffect(() => {
    if (householdIncome && rent) {
      handleCalculate();
    } else {
      setResult(null);
    }
  }, [householdIncome, householdMembers, rent, deposit, region, applicantType, handleCalculate]);

  // 공유 기능
  const handleShare = async () => {
    const url = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'LH 월세지원금 계산 결과',
          text: `월세지원금: ${result ? formatNumber(result.subsidy) : '0'}원`,
          url: url,
        });
        return;
      } catch {
        // share failed, fall through to clipboard copy
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
    <div className="max-w-4xl mx-auto space-y-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            LH 월세지원금 계산기
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            청년, 신혼부부, 일반 가구의 월세지원금을 정확하게 계산해보세요.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* 입력 폼 */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
              <Calculator className="w-6 h-6 mr-2" />
              지원금 계산하기
            </h2>

            <div className="space-y-6">
              {/* 신청 유형 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  신청 유형
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setApplicantType('youth')}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      applicantType === 'youth'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <Heart className="w-5 h-5 mx-auto mb-1 text-pink-500" />
                    <div className="text-sm font-medium">청년</div>
                  </button>
                  <button
                    onClick={() => setApplicantType('newlywed')}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      applicantType === 'newlywed'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <Users className="w-5 h-5 mx-auto mb-1 text-red-500" />
                    <div className="text-sm font-medium">신혼부부</div>
                  </button>
                  <button
                    onClick={() => setApplicantType('general')}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      applicantType === 'general'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <Home className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                    <div className="text-sm font-medium">일반</div>
                  </button>
                </div>
              </div>

              {/* 가구 정보 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    월평균소득 (가구원 전체)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={householdIncome}
                      onChange={handleIncomeChange}
                      placeholder="2,500,000"
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
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
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                  >
                    {[1, 2, 3, 4, 5].map(num => (
                      <option key={num} value={num}>{num}인</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 주거 정보 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    월세
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={rent}
                      onChange={handleRentChange}
                      placeholder="500,000"
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                    />
                    <span className="absolute right-3 top-3 text-gray-500 dark:text-gray-400">원</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    보증금
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={deposit}
                      onChange={handleDepositChange}
                      placeholder="10,000,000"
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                    />
                    <span className="absolute right-3 top-3 text-gray-500 dark:text-gray-400">원</span>
                  </div>
                </div>
              </div>

              {/* 지역 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  거주지역
                </label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
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
                지원 결과
              </h3>

              {result.eligible ? (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/30 dark:to-green-900/30 rounded-lg p-4">
                    <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">월 지원금액</div>
                    <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                      {formatNumber(result.subsidy)}원
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600 dark:text-gray-400">지원율</div>
                      <div className="font-semibold text-gray-900 dark:text-white">{result.supportRate}%</div>
                    </div>
                    <div>
                      <div className="text-gray-600 dark:text-gray-400">소득기준</div>
                      <div className="font-semibold text-gray-900 dark:text-white">통과</div>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                    <Info className="w-4 h-4 inline mr-1" />
                    실제 지원금은 LH 심사를 통해 최종 결정됩니다.
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-red-50 dark:bg-red-900/30 rounded-lg p-4">
                    <div className="text-red-700 dark:text-red-300 font-medium mb-2">
                      지원 불가
                    </div>
                    <div className="text-red-600 dark:text-red-400 text-sm">
                      {result.reason}
                    </div>
                  </div>

                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">소득기준 (월)</span>
                      <span className="font-medium">{formatNumber(result.incomeLimit)}원</span>
                    </div>
                    {result.maxSubsidy > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">월세 상한</span>
                        <span className="font-medium">{formatNumber(result.maxSubsidy)}원</span>
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
                  className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
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
                    className="w-full flex items-center justify-center px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
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
        formatResult={(result) => `${result.applicantType} ${result.householdMembers}인 월세${Math.floor(result.rent/10000)}만원`}
      />

      {/* 안내사항 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-2xl p-8">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          📋 LH 월세지원 안내
        </h3>
        <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-700 dark:text-gray-300">
          <div>
            <h4 className="font-semibold mb-2">✅ 지원 대상</h4>
            <ul className="space-y-1 text-xs">
              <li>• 청년: 19~39세 무주택자</li>
              <li>• 신혼부부: 혼인 7년 이내</li>
              <li>• 일반: 기타 무주택 가구</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">💰 지원 내용</h4>
            <ul className="space-y-1 text-xs">
              <li>• 월세의 20~40% 지원</li>
              <li>• 최대 2년간 지원</li>
              <li>• 지역별 상한액 적용</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">📍 지역별 상한액</h4>
            <ul className="space-y-1 text-xs">
              <li>• 서울: 월세 70만원</li>
              <li>• 경기/인천: 월세 60만원</li>
              <li>• 광역시: 월세 50만원</li>
              <li>• 기타: 월세 40만원</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">⚠️ 주의사항</h4>
            <ul className="space-y-1 text-xs">
              <li>• 소득 및 자산 심사</li>
              <li>• 실제 심사 결과와 상이할 수 있음</li>
              <li>• LH 홈페이지에서 신청</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function MonthlyRentSubsidyCalculator() {
  return (
    <Suspense fallback={
      <div className="max-w-4xl mx-auto p-8">
        <div className="animate-pulse space-y-8">
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    }>
      <MonthlyRentSubsidyCalculatorContent />
    </Suspense>
  );
}