'use client'

import React, { useState } from 'react';
import { Users, TrendingUp, Info, ChevronRight, Calculator, Building2, Heart, GraduationCap, Home, Stethoscope, Wallet, Baby, Briefcase, AlertCircle } from 'lucide-react';

// 중위소득 데이터 (월/원) - [1인, 2인, 3인, 4인, 5인, 6인 가구]
const medianIncomeData: Record<string, number[]> = {
  '2023': [2077892, 3456155, 4434816, 5400964, 6330688, 7227981],
  '2024': [2228445, 3682609, 4714657, 5729913, 6695735, 7618369],
  '2025': [2392013, 3932658, 5025353, 6097773, 7108192, 8064805],
  '2026': [2564238, 4199292, 5359036, 6494738, 7556719, 8555952],
};

// 비율별 정부 지원사업
// 카테고리별 색상 (라이트/다크 모드 최적화)
// - 기초급여(생계/의료/주거/교육): 빨강 계열
// - 취업지원: 파랑 계열
// - 가족/청소년: 보라 계열
// - 지자체: 초록 계열
// - 기타: 회색
type CategoryType = 'basic' | 'employment' | 'family' | 'local' | 'other';

const categoryColors: Record<CategoryType, string> = {
  basic: 'text-red-600 dark:text-red-400',
  employment: 'text-blue-600 dark:text-blue-400',
  family: 'text-purple-600 dark:text-purple-400',
  local: 'text-emerald-600 dark:text-emerald-400',
  other: 'text-gray-600 dark:text-gray-400',
};

interface WelfareProgram {
  name: string;
  description: string;
  icon: React.ReactNode;
  category: CategoryType;
}

const welfareProgramsByPercentage: Record<number, WelfareProgram[]> = {
  32: [
    { name: '생계급여', description: '기초생활보장 생계급여 지원', icon: <Wallet className="w-4 h-4" />, category: 'basic' },
  ],
  40: [
    { name: '의료급여', description: '기초생활보장 의료급여 지원', icon: <Stethoscope className="w-4 h-4" />, category: 'basic' },
  ],
  48: [
    { name: '주거급여', description: '기초생활보장 주거급여 지원', icon: <Home className="w-4 h-4" />, category: 'basic' },
    { name: '서울형 생계급여', description: '서울시 자체 생계급여 지원', icon: <Building2 className="w-4 h-4" />, category: 'local' },
  ],
  50: [
    { name: '교육급여', description: '기초생활보장 교육급여 지원', icon: <GraduationCap className="w-4 h-4" />, category: 'basic' },
    { name: '기초생활수급자', description: '차상위계층 포함', icon: <Users className="w-4 h-4" />, category: 'basic' },
    { name: '국민취업제도', description: '취업지원서비스 제공', icon: <Briefcase className="w-4 h-4" />, category: 'employment' },
    { name: '서울형 안심소득', description: '서울시 안심소득 지원', icon: <Wallet className="w-4 h-4" />, category: 'local' },
    { name: '인천형 생계급여', description: '인천시 자체 생계급여', icon: <Building2 className="w-4 h-4" />, category: 'local' },
    { name: '대구형 생계급여', description: '대구시 자체 생계급여', icon: <Building2 className="w-4 h-4" />, category: 'local' },
  ],
  60: [
    { name: '한부모가족 급여', description: '한부모, 조손가족 급여 지원', icon: <Baby className="w-4 h-4" />, category: 'family' },
    { name: '취성패', description: '취업성공패키지 지원', icon: <Briefcase className="w-4 h-4" />, category: 'employment' },
    { name: '국민취업제도', description: '취업지원서비스 제공', icon: <Briefcase className="w-4 h-4" />, category: 'employment' },
    { name: '청년 월세 지원', description: '청년 월세 특별지원', icon: <Home className="w-4 h-4" />, category: 'family' },
  ],
  65: [
    { name: '청소년한부모 급여', description: '청소년 한부모 급여 지원', icon: <Baby className="w-4 h-4" />, category: 'family' },
  ],
  70: [
    { name: '가사·간병방문', description: '가사·간병 방문지원 서비스', icon: <Heart className="w-4 h-4" />, category: 'basic' },
  ],
  72: [
    { name: '청소년한부모 자립지원', description: '청소년한부모 자립지원패키지', icon: <Baby className="w-4 h-4" />, category: 'family' },
  ],
  75: [
    { name: '긴급복지지원', description: '위기상황 긴급복지 지원', icon: <AlertCircle className="w-4 h-4" />, category: 'basic' },
  ],
  80: [
    { name: '기타 복지사업', description: '중위소득 80% 기준 복지사업', icon: <Users className="w-4 h-4" />, category: 'other' },
  ],
  85: [
    { name: '기타 복지사업', description: '중위소득 85% 기준 복지사업', icon: <Users className="w-4 h-4" />, category: 'other' },
  ],
  100: [
    { name: '중장년 취성패', description: '중장년 취업성공패키지', icon: <Briefcase className="w-4 h-4" />, category: 'employment' },
    { name: '재난적 의료비', description: '재난적 의료비 지원', icon: <Stethoscope className="w-4 h-4" />, category: 'basic' },
    { name: '서울형 긴급복지', description: '서울시 긴급복지 지원', icon: <Building2 className="w-4 h-4" />, category: 'local' },
    { name: '경기형 긴급복지', description: '경기도 긴급복지 지원', icon: <Building2 className="w-4 h-4" />, category: 'local' },
    { name: '위기청소년 지원', description: '위기청소년 특별지원', icon: <Users className="w-4 h-4" />, category: 'family' },
  ],
  120: [
    { name: '청년국민취업', description: '청년 국민취업지원제도', icon: <Briefcase className="w-4 h-4" />, category: 'employment' },
  ],
  150: [
    { name: '서울 친인척 아이돌봄수당', description: '서울시 아이돌봄 수당 지원', icon: <Baby className="w-4 h-4" />, category: 'family' },
  ],
  180: [
    { name: '기타 복지사업', description: '중위소득 180% 기준 복지사업', icon: <Users className="w-4 h-4" />, category: 'other' },
  ],
  190: [
    { name: '기타 복지사업', description: '중위소득 190% 기준 복지사업', icon: <Users className="w-4 h-4" />, category: 'other' },
  ],
  200: [
    { name: '기타 복지사업', description: '중위소득 200% 기준 복지사업', icon: <Users className="w-4 h-4" />, category: 'other' },
  ],
  300: [
    { name: '기타 복지사업', description: '중위소득 300% 기준 복지사업', icon: <Users className="w-4 h-4" />, category: 'other' },
  ],
};

// 표시할 비율 목록
const percentages = [32, 40, 48, 50, 60, 65, 70, 72, 75, 80, 85, 100, 120, 150, 180, 190, 200, 300];

// 가구원수 라벨
const householdLabels = ['1인 가구', '2인 가구', '3인 가구', '4인 가구', '5인 가구', '6인 가구'];

// 사용 가능한 연도 목록
const availableYears = ['2026', '2025', '2024', '2023'] as const;
type YearType = typeof availableYears[number];

// 기본재산액 (지역별, 2025년 기준)
const basicPropertyAmount: Record<string, number> = {
  '서울': 99000000,
  '경기': 80000000,
  '광역시': 77000000,
  '그 외': 53000000,
};

// 소득환산율 (월 기준)
const propertyConversionRate = {
  '일반재산': 0.0417,      // 월 4.17%
  '금융재산': 0.0626,      // 월 6.26%
  '자동차': 1.0,           // 월 100%
};

// 수급자격 판정기 컴포넌트
interface IncomeEligibilityCheckerProps {
  medianIncomeData: Record<string, number[]>;
  formatCurrency: (amount: number) => string;
}

const IncomeEligibilityChecker = ({ medianIncomeData, formatCurrency }: IncomeEligibilityCheckerProps) => {
  const [householdSize, setHouseholdSize] = useState<number>(1);
  const [region, setRegion] = useState<string>('서울');
  const [monthlyIncome, setMonthlyIncome] = useState<string>('');
  const [workIncome, setWorkIncome] = useState<string>('');
  const [generalProperty, setGeneralProperty] = useState<string>('');
  const [financialProperty, setFinancialProperty] = useState<string>('');
  const [carValue, setCarValue] = useState<string>('');
  const [debt, setDebt] = useState<string>('');
  const [showResult, setShowResult] = useState(false);

  const parseNumber = (value: string): number => {
    return parseInt(value.replace(/,/g, '')) || 0;
  };

  const formatInput = (value: string): string => {
    const num = value.replace(/[^0-9]/g, '');
    return num ? new Intl.NumberFormat('ko-KR').format(parseInt(num)) : '';
  };

  // 소득인정액 계산
  const calculateIncomeRecognition = () => {
    const income = parseNumber(monthlyIncome);
    const work = parseNumber(workIncome);
    const general = parseNumber(generalProperty);
    const financial = parseNumber(financialProperty);
    const car = parseNumber(carValue);
    const debtAmount = parseNumber(debt);

    // 근로소득 공제 (30%)
    const workIncomeDeduction = work * 0.3;

    // 소득평가액 = 실제소득 - 근로소득공제
    const incomeEvaluation = Math.max(0, income - workIncomeDeduction);

    // 재산 소득환산액
    const basicProperty = basicPropertyAmount[region] || basicPropertyAmount['그 외'];
    const totalProperty = general + financial + car;
    const netProperty = Math.max(0, totalProperty - basicProperty - debtAmount);

    // 재산 종류별 환산 (단순화: 일반재산 기준)
    const generalNet = Math.max(0, general - basicProperty - debtAmount);
    const propertyConversion =
      (generalNet > 0 ? generalNet * propertyConversionRate['일반재산'] : 0) +
      (financial * propertyConversionRate['금융재산']) +
      (car * propertyConversionRate['자동차']);

    // 소득인정액 = 소득평가액 + 소득환산액
    const totalIncomeRecognition = incomeEvaluation + propertyConversion;

    return {
      incomeEvaluation,
      propertyConversion,
      totalIncomeRecognition,
      workIncomeDeduction,
      netProperty,
    };
  };

  // 수급자격 판정
  const determineEligibility = () => {
    const result = calculateIncomeRecognition();
    const baseIncome = medianIncomeData['2025'][householdSize - 1];

    const eligibility = {
      생계급여: result.totalIncomeRecognition <= baseIncome * 0.32,
      의료급여: result.totalIncomeRecognition <= baseIncome * 0.40,
      주거급여: result.totalIncomeRecognition <= baseIncome * 0.48,
      교육급여: result.totalIncomeRecognition <= baseIncome * 0.50,
    };

    const thresholds = {
      생계급여: baseIncome * 0.32,
      의료급여: baseIncome * 0.40,
      주거급여: baseIncome * 0.48,
      교육급여: baseIncome * 0.50,
    };

    return { ...result, eligibility, thresholds, baseIncome };
  };

  const result = showResult ? determineEligibility() : null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-8">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
            <Calculator className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              수급자격 판정기
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              소득과 재산을 입력하면 기초생활수급자 자격을 간이 판정합니다
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* 입력 섹션 */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4" />
              기본 정보
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  가구원 수
                </label>
                <select
                  value={householdSize}
                  onChange={(e) => setHouseholdSize(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>{n}인 가구</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  거주 지역
                </label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {Object.keys(basicPropertyAmount).map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>

            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 pt-2">
              <Wallet className="w-4 h-4" />
              소득 정보 (월)
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  월 총소득 (세전)
                </label>
                <input
                  type="text"
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(formatInput(e.target.value))}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-right"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  그 중 근로소득 (30% 공제 적용)
                </label>
                <input
                  type="text"
                  value={workIncome}
                  onChange={(e) => setWorkIncome(formatInput(e.target.value))}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-right"
                />
              </div>
            </div>

            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 pt-2">
              <Home className="w-4 h-4" />
              재산 정보
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  일반재산 (주택, 토지 등)
                </label>
                <input
                  type="text"
                  value={generalProperty}
                  onChange={(e) => setGeneralProperty(formatInput(e.target.value))}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-right"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  금융재산 (예금, 적금 등)
                </label>
                <input
                  type="text"
                  value={financialProperty}
                  onChange={(e) => setFinancialProperty(formatInput(e.target.value))}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-right"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  자동차 (시가표준액)
                </label>
                <input
                  type="text"
                  value={carValue}
                  onChange={(e) => setCarValue(formatInput(e.target.value))}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-right"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  부채 (대출금 등)
                </label>
                <input
                  type="text"
                  value={debt}
                  onChange={(e) => setDebt(formatInput(e.target.value))}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-right"
                />
              </div>
            </div>

            <button
              onClick={() => setShowResult(true)}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-lg transition-all"
            >
              수급자격 판정하기
            </button>
          </div>

          {/* 결과 섹션 */}
          <div className="space-y-4">
            {result ? (
              <>
                <h3 className="font-semibold text-gray-900 dark:text-white">판정 결과</h3>

                {/* 소득인정액 계산 결과 */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">소득평가액</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(result.incomeEvaluation)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 dark:text-gray-400 pl-4">- 근로소득 공제</span>
                    <span className="text-green-600 dark:text-green-400">-{formatCurrency(result.workIncomeDeduction)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">재산 소득환산액</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(result.propertyConversion)}</span>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-900 dark:text-white">소득인정액</span>
                      <span className="font-bold text-xl text-blue-600 dark:text-blue-400">{formatCurrency(result.totalIncomeRecognition)}</span>
                    </div>
                  </div>
                </div>

                {/* 급여별 판정 결과 */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">급여별 수급 가능 여부</h4>
                  {Object.entries(result.eligibility).map(([benefit, eligible]) => (
                    <div
                      key={benefit}
                      className={`flex justify-between items-center p-3 rounded-lg ${
                        eligible
                          ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                          : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                      }`}
                    >
                      <div>
                        <span className={`font-medium ${eligible ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                          {benefit}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                          (기준: {formatCurrency(result.thresholds[benefit as keyof typeof result.thresholds])})
                        </span>
                      </div>
                      <span className={`font-semibold ${eligible ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {eligible ? '가능' : '불가'}
                      </span>
                    </div>
                  ))}
                </div>

                {/* 안내 메시지 */}
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800 dark:text-amber-300">
                      <p className="font-medium mb-1">참고사항</p>
                      <ul className="list-disc list-inside space-y-1 text-amber-700 dark:text-amber-400">
                        <li>이 결과는 간이 판정으로, 실제 수급 여부와 다를 수 있습니다.</li>
                        <li>부양의무자 기준, 근로능력 유무 등은 별도 심사합니다.</li>
                        <li>정확한 판정은 주민센터에 문의하세요.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 py-12">
                <Calculator className="w-16 h-16 mb-4 opacity-30" />
                <p className="text-center">
                  좌측에 소득과 재산 정보를 입력하고<br />
                  <strong>수급자격 판정하기</strong> 버튼을 눌러주세요
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 계산식 안내 (접힌 상태) */}
        <details className="mt-6">
          <summary className="cursor-pointer text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
            소득인정액 계산식 보기
          </summary>
          <div className="mt-4 space-y-3 text-sm">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
              <p className="font-semibold text-blue-700 dark:text-blue-300">
                소득인정액 = 소득평가액 + 소득환산액
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
              <p className="font-semibold text-green-700 dark:text-green-300">
                소득평가액 = 실제소득 - 가구특성 지출비용 - 근로소득공제(30%)
              </p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
              <p className="font-semibold text-purple-700 dark:text-purple-300">
                소득환산액 = (재산 - 기본재산액 - 부채) × 소득환산율
              </p>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                환산율: 일반재산 4.17%/월, 금융재산 6.26%/월, 자동차 100%/월
              </p>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
};

const MedianIncomeTable = () => {
  const [selectedYear, setSelectedYear] = useState<YearType>('2025');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [customPercentage, setCustomPercentage] = useState<string>('');

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('ko-KR').format(Math.floor(amount)) + '원';
  };

  const calculateAmount = (baseAmount: number, percentage: number): number => {
    return baseAmount * (percentage / 100);
  };

  const baseData = medianIncomeData[selectedYear];

  // 사용자 정의 비율 계산
  const customPercentageNum = parseFloat(customPercentage) || 0;
  const showCustomRow = customPercentageNum > 0 && customPercentageNum <= 500;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl mb-4 shadow-lg">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3">
            기준 중위소득 조회
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            연도별, 가구원수별 기준 중위소득과 정부 복지사업 자격요건을 한눈에 확인하세요
          </p>
        </div>

        {/* 연도 탭 */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex bg-white dark:bg-gray-800 rounded-xl p-1.5 shadow-lg border border-gray-200 dark:border-gray-700 flex-wrap justify-center gap-1">
            {availableYears.map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold text-base sm:text-lg transition-all duration-200 ${
                  selectedYear === year
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {year}년
              </button>
            ))}
          </div>
        </div>

        {/* 100% 기준 중위소득 카드 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Calculator className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {selectedYear}년 기준 중위소득 100%
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {householdLabels.map((label, index) => (
              <div
                key={label}
                className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600 rounded-xl p-4 text-center"
              >
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{label}</div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {formatCurrency(baseData[index])}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 사용자 정의 비율 계산기 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Calculator className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              중위소득 비율 계산기
            </h2>
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-gray-600 dark:text-gray-400">중위소득</span>
              <input
                type="number"
                value={customPercentage}
                onChange={(e) => setCustomPercentage(e.target.value)}
                placeholder="예: 75"
                className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-center font-semibold bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="text-gray-600 dark:text-gray-400">%</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              원하는 비율을 입력하면 자동으로 계산됩니다 (최대 500%)
            </p>
          </div>
          {showCustomRow && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {householdLabels.map((label, index) => (
                <div
                  key={label}
                  className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4 text-center border-2 border-purple-200 dark:border-purple-700"
                >
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{label}</div>
                  <div className="text-lg font-bold text-purple-700 dark:text-purple-300">
                    {formatCurrency(calculateAmount(baseData[index], customPercentageNum))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 비율별 중위소득 테이블 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {selectedYear}년 비율별 기준 중위소득
              </h2>
            </div>
          </div>

          {/* 데스크톱 테이블 */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white sticky left-0 bg-gray-50 dark:bg-gray-700/50 z-10 min-w-[180px]">
                    비율 / 지원사업
                  </th>
                  {householdLabels.map((label) => (
                    <th key={label} className="px-4 py-4 text-right text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {percentages.map((percentage) => {
                  const programs = welfareProgramsByPercentage[percentage] || [];
                  const isHighlighted = [32, 40, 48, 50, 100].includes(percentage);

                  return (
                    <tr
                      key={percentage}
                      className={`
                        ${isHighlighted ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}
                        hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors
                      `}
                    >
                      <td className="px-4 py-4 sticky left-0 bg-white dark:bg-gray-800 z-10 border-r border-gray-100 dark:border-gray-700">
                        <div className="flex flex-col gap-1">
                          <span className={`font-bold text-lg ${
                            percentage === 100 ? 'text-blue-600 dark:text-blue-400' :
                            percentage <= 50 ? 'text-red-600 dark:text-red-400' :
                            'text-gray-900 dark:text-white'
                          }`}>
                            {percentage}%
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {programs.slice(0, 3).map((program, idx) => (
                              <span
                                key={idx}
                                title={`${program.name}: ${program.description}`}
                                className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 ${categoryColors[program.category]} cursor-help`}
                              >
                                {program.icon}
                                <span>{program.name}</span>
                              </span>
                            ))}
                            {programs.length > 3 && (
                              <span
                                className="relative group text-xs text-gray-500 dark:text-gray-400 cursor-help"
                              >
                                <span className="hover:text-blue-600 dark:hover:text-blue-400 underline decoration-dotted">
                                  +{programs.length - 3}개
                                </span>
                                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-50 w-64 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600">
                                  <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">추가 지원사업</div>
                                  <div className="space-y-1.5">
                                    {programs.slice(3).map((program, idx) => (
                                      <div key={idx} className={`flex items-start gap-2 ${categoryColors[program.category]}`}>
                                        <span className="shrink-0 mt-0.5">{program.icon}</span>
                                        <div>
                                          <div className="font-medium">{program.name}</div>
                                          <div className="text-gray-500 dark:text-gray-400 text-xs">{program.description}</div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      {baseData.map((amount, colIndex) => (
                        <td key={colIndex} className="px-4 py-4 text-right">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {formatCurrency(calculateAmount(amount, percentage))}
                          </span>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 모바일 카드 뷰 */}
          <div className="lg:hidden divide-y divide-gray-200 dark:divide-gray-700">
            {percentages.map((percentage) => {
              const programs = welfareProgramsByPercentage[percentage] || [];
              const isExpanded = expandedRow === percentage;
              const isHighlighted = [32, 40, 48, 50, 100].includes(percentage);

              return (
                <div
                  key={percentage}
                  className={`${isHighlighted ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                >
                  <button
                    onClick={() => setExpandedRow(isExpanded ? null : percentage)}
                    className="w-full px-4 py-4 flex items-center justify-between text-left"
                  >
                    <div className="flex flex-col gap-1">
                      <span className={`font-bold text-lg ${
                        percentage === 100 ? 'text-blue-600 dark:text-blue-400' :
                        percentage <= 50 ? 'text-red-600 dark:text-red-400' :
                        'text-gray-900 dark:text-white'
                      }`}>
                        중위소득 {percentage}%
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {programs.slice(0, 2).map((program, idx) => (
                          <span
                            key={idx}
                            title={`${program.name}: ${program.description}`}
                            className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 ${categoryColors[program.category]}`}
                          >
                            {program.icon}
                            <span>{program.name}</span>
                          </span>
                        ))}
                        {programs.length > 2 && (
                          <span
                            className="text-xs text-blue-600 dark:text-blue-400 underline decoration-dotted"
                            title={programs.slice(2).map(p => p.name).join(', ')}
                          >
                            +{programs.length - 2}개
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        {householdLabels.map((label, index) => (
                          <div
                            key={label}
                            className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3"
                          >
                            <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
                            <div className="font-semibold text-gray-900 dark:text-white">
                              {formatCurrency(calculateAmount(baseData[index], percentage))}
                            </div>
                          </div>
                        ))}
                      </div>

                      {programs.length > 0 && (
                        <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            해당 지원사업
                          </div>
                          <div className="space-y-2">
                            {programs.map((program, idx) => (
                              <div
                                key={idx}
                                className="flex items-start gap-2 text-sm"
                              >
                                <span className={categoryColors[program.category]}>{program.icon}</span>
                                <div>
                                  <div className="font-medium text-gray-900 dark:text-white">{program.name}</div>
                                  <div className="text-gray-500 dark:text-gray-400 text-xs">{program.description}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 기초생활수급자 급여기준 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <Heart className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {selectedYear}년 기초생활수급자 급여종류별 기준
              </h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">급여 종류</th>
                  {householdLabels.map((label) => (
                    <th key={label} className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {[
                  { name: '교육급여', percentage: 50, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/10' },
                  { name: '주거급여', percentage: 48, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/10' },
                  { name: '의료급여', percentage: 40, color: 'text-pink-600', bg: 'bg-pink-50 dark:bg-pink-900/10' },
                  { name: '생계급여', percentage: 32, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/10' },
                ].map((benefit) => (
                  <tr key={benefit.name} className={benefit.bg}>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${benefit.color}`}>
                        {benefit.name} ({benefit.percentage}%)
                      </span>
                    </td>
                    {baseData.map((amount, index) => (
                      <td key={index} className="px-4 py-3 text-right">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency(calculateAmount(amount, benefit.percentage))}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 지자체형 생계급여 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {selectedYear}년 지자체형 생계급여 기준
              </h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">지역</th>
                  {householdLabels.map((label) => (
                    <th key={label} className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {[
                  { name: '인천형, 대구형', percentage: 50, color: 'text-teal-600' },
                  { name: '서울형', percentage: 48, color: 'text-blue-600' },
                  { name: '부산형, 광주형', percentage: 45, color: 'text-indigo-600' },
                ].map((region) => (
                  <tr key={region.name} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3">
                      <div>
                        <span className={`font-semibold ${region.color}`}>{region.name}</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">({region.percentage}%)</span>
                      </div>
                    </td>
                    {baseData.map((amount, index) => (
                      <td key={index} className="px-4 py-3 text-right">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency(calculateAmount(amount, region.percentage))}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 수급자격 판정기 */}
        <IncomeEligibilityChecker
          medianIncomeData={medianIncomeData}
          formatCurrency={formatCurrency}
        />

        {/* 연도별 중위소득 비교 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              연도별 기준 중위소득 100% 비교 (2023~2026)
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">가구</th>
                  <th className="px-3 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">2023년</th>
                  <th className="px-3 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">2024년</th>
                  <th className="px-3 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">2025년</th>
                  <th className="px-3 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">2026년</th>
                  <th className="px-3 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                    <span className="hidden sm:inline">4년간 증가율</span>
                    <span className="sm:hidden">증가율</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {householdLabels.map((label, index) => {
                  const amount2023 = medianIncomeData['2023'][index];
                  const amount2024 = medianIncomeData['2024'][index];
                  const amount2025 = medianIncomeData['2025'][index];
                  const amount2026 = medianIncomeData['2026'][index];
                  const totalIncreaseRate = ((amount2026 - amount2023) / amount2023 * 100).toFixed(1);

                  return (
                    <tr key={label} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-3 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">{label}</td>
                      <td className="px-3 py-3 text-right text-gray-500 dark:text-gray-400 text-sm">{formatCurrency(amount2023)}</td>
                      <td className="px-3 py-3 text-right text-gray-600 dark:text-gray-300 text-sm">{formatCurrency(amount2024)}</td>
                      <td className="px-3 py-3 text-right text-gray-700 dark:text-gray-200 text-sm font-medium">{formatCurrency(amount2025)}</td>
                      <td className="px-3 py-3 text-right text-blue-600 dark:text-blue-400 text-sm font-semibold">{formatCurrency(amount2026)}</td>
                      <td className="px-3 py-3 text-right">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                          +{totalIncreaseRate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            ※ 기준 중위소득은 매년 보건복지부에서 고시하며, 각종 복지사업의 수급자 선정기준으로 활용됩니다.
          </div>
        </div>
      </div>
    </div>
  );
};

export default MedianIncomeTable;
