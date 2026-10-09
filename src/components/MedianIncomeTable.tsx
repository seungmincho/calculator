'use client'

import React, { useState } from 'react';
import { Users, TrendingUp, Info, ChevronRight, Calculator, Building2, Heart, GraduationCap, Home, Stethoscope, Wallet, Baby, Briefcase, AlertCircle } from 'lucide-react';
import GuideSection from '@/components/GuideSection';
import { glassCard, glassInset, glassInput } from '@/lib/glass';
import { useTranslations } from '@/lib/i18n';
import '@/lib/i18n/ns/medianIncome';
import { MEDIAN_INCOME, MEDIAN_YEARS, yearInForce } from '@/utils/medianIncome';

// 중위소득 데이터 (월/원) - [1인, 2인, 3인, 4인, 5인, 6인 가구] — 고시 출처는 utils/medianIncome.ts
const medianIncomeData = MEDIAN_INCOME;

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
  employment: 'text-primary',
  family: 'text-primary',
  local: 'text-emerald-600 dark:text-emerald-400',
  other: 'text-sub',
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
    { name: '차상위계층', description: '수급자가 아닌 소득인정액 중위 50% 이하 (기초생활보장법 시행령 제3조)', icon: <Users className="w-4 h-4" />, category: 'basic' },
    { name: '국민취업제도', description: '취업지원서비스 제공', icon: <Briefcase className="w-4 h-4" />, category: 'employment' },
    { name: '서울형 안심소득', description: '서울시 안심소득 지원', icon: <Wallet className="w-4 h-4" />, category: 'local' },
    { name: '인천형 생계급여', description: '인천시 자체 생계급여', icon: <Building2 className="w-4 h-4" />, category: 'local' },
    { name: '대구형 생계급여', description: '대구시 자체 생계급여', icon: <Building2 className="w-4 h-4" />, category: 'local' },
  ],
  60: [
    { name: '국민취업지원제도 I유형', description: '구직촉진수당 (구직자취업촉진법 시행령 제3조)', icon: <Briefcase className="w-4 h-4" />, category: 'employment' },
    { name: '청년 월세 지원', description: '청년 월세 특별지원', icon: <Home className="w-4 h-4" />, category: 'family' },
  ],
  65: [
    { name: '한부모가족 급여', description: '한부모, 조손가족 아동양육비 등 (2026년 63%→65% 확대)', icon: <Baby className="w-4 h-4" />, category: 'family' },
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

// 사용 가능한 연도 목록
const availableYears = MEDIAN_YEARS;
type YearType = string;

// 기본재산액 (보건복지부 고시 제2025-204호 별표3, 2026.1.1 시행)
const basicPropertyAmount: Record<string, number> = {
  seoul: 99000000,
  gyeonggi: 80000000,
  metro: 77000000,
  other: 53000000,
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
  const t = useTranslations('medianIncome');
  const [householdSize, setHouseholdSize] = useState<number>(1);
  const [region, setRegion] = useState<string>('seoul');
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
    // 근로소득은 월 총소득 '그 중' 금액 → 총소득을 넘으면 공제가 총소득보다 커짐
    const work = Math.min(parseNumber(workIncome), income);
    const general = parseNumber(generalProperty);
    const financial = parseNumber(financialProperty);
    const car = parseNumber(carValue);
    const debtAmount = parseNumber(debt);

    // 근로소득 공제 (30%)
    const workIncomeDeduction = work * 0.3;

    // 소득평가액 = 실제소득 - 근로소득공제
    const incomeEvaluation = Math.max(0, income - workIncomeDeduction);

    // 재산 소득환산액
    const basicProperty = basicPropertyAmount[region] || basicPropertyAmount.other;
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
    const year = yearInForce();
    const baseIncome = medianIncomeData[year][householdSize - 1];

    const eligibility = {
      livelihood: result.totalIncomeRecognition <= baseIncome * 0.32,
      medical: result.totalIncomeRecognition <= baseIncome * 0.40,
      housing: result.totalIncomeRecognition <= baseIncome * 0.48,
      education: result.totalIncomeRecognition <= baseIncome * 0.50,
    };

    const thresholds = {
      livelihood: baseIncome * 0.32,
      medical: baseIncome * 0.40,
      housing: baseIncome * 0.48,
      education: baseIncome * 0.50,
    };

    return { ...result, eligibility, thresholds, baseIncome, year };
  };

  const result = showResult ? determineEligibility() : null;

  return (
    <div className={`${glassCard} ${glassInset} overflow-hidden mb-8`}>
      <div className="p-6 border-b border-line">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-soft rounded-lg">
            <Calculator className="w-5 h-5 text-body" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-fg">
              {t('checker.title')}
            </h2>
            <p className="text-sm text-muted">
              {t('checker.desc')}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* 입력 섹션 */}
          <div className="space-y-4">
            <h3 className="font-semibold text-fg flex items-center gap-2">
              {t('checker.basicInfo')}
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-body mb-1">
                  {t('checker.householdSize')}
                </label>
                <select
                  value={householdSize}
                  onChange={(e) => setHouseholdSize(Number(e.target.value))}
                  className={`${glassInput} px-3 py-2`}
                >
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>{t('household', { n })}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-body mb-1">
                  {t('checker.region')}
                </label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className={`${glassInput} px-3 py-2`}
                >
                  {Object.keys(basicPropertyAmount).map((r) => (
                    <option key={r} value={r}>{t(`checker.regions.${r}`)}</option>
                  ))}
                </select>
              </div>
            </div>

            <h3 className="font-semibold text-fg flex items-center gap-2 pt-2">
              {t('checker.incomeInfo')}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-body mb-1">
                  {t('checker.monthlyIncome')}
                </label>
                <input
                  type="text"
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(formatInput(e.target.value))}
                  placeholder="0"
                  className={`${glassInput} px-3 py-2 text-right`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-body mb-1">
                  {t('checker.workIncome')}
                </label>
                <input
                  type="text"
                  value={workIncome}
                  onChange={(e) => setWorkIncome(formatInput(e.target.value))}
                  placeholder="0"
                  className={`${glassInput} px-3 py-2 text-right`}
                />
              </div>
            </div>

            <h3 className="font-semibold text-fg flex items-center gap-2 pt-2">
              {t('checker.assetInfo')}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-body mb-1">
                  {t('checker.generalProperty')}
                </label>
                <input
                  type="text"
                  value={generalProperty}
                  onChange={(e) => setGeneralProperty(formatInput(e.target.value))}
                  placeholder="0"
                  className={`${glassInput} px-3 py-2 text-right`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-body mb-1">
                  {t('checker.financialProperty')}
                </label>
                <input
                  type="text"
                  value={financialProperty}
                  onChange={(e) => setFinancialProperty(formatInput(e.target.value))}
                  placeholder="0"
                  className={`${glassInput} px-3 py-2 text-right`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-body mb-1">
                  {t('checker.car')}
                </label>
                <input
                  type="text"
                  value={carValue}
                  onChange={(e) => setCarValue(formatInput(e.target.value))}
                  placeholder="0"
                  className={`${glassInput} px-3 py-2 text-right`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-body mb-1">
                  {t('checker.debt')}
                </label>
                <input
                  type="text"
                  value={debt}
                  onChange={(e) => setDebt(formatInput(e.target.value))}
                  placeholder="0"
                  className={`${glassInput} px-3 py-2 text-right`}
                />
              </div>
            </div>

            <button
              onClick={() => {
                setShowResult(true)
                requestAnimationFrame(() => { if (window.matchMedia('(max-width: 767px)').matches) document.getElementById('median-income-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) })
              }}
              className="w-full py-3 bg-primary hover:bg-blue-700 text-white font-semibold rounded-lg transition-all"
            >
              {t('checker.submit')}
            </button>
          </div>

          {/* 결과 섹션 */}
          <div id="median-income-result" className="space-y-4 scroll-mt-20" aria-live="polite">
            {result ? (
              <>
                <h3 className="font-semibold text-fg">{t('checker.result')}</h3>
                <p className="text-xs text-muted">{t('checkerYear', { year: result.year })}</p>

                {/* 소득인정액 계산 결과 */}
                <div className="bg-subtle rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sub">{t('checker.incomeEvaluation')}</span>
                    <span className="font-medium text-fg">{formatCurrency(result.incomeEvaluation)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted pl-4">{t('checker.workDeduction')}</span>
                    <span className="text-green-600 dark:text-green-400">{result.workIncomeDeduction >= 1 ? '-' : ''}{formatCurrency(result.workIncomeDeduction)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sub">{t('checker.propertyConversion')}</span>
                    <span className="font-medium text-fg">{formatCurrency(result.propertyConversion)}</span>
                  </div>
                  <div className="border-t border-line pt-3">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-fg">{t('checker.incomeRecognition')}</span>
                      <span className="font-bold text-xl text-primary">{formatCurrency(result.totalIncomeRecognition)}</span>
                    </div>
                  </div>
                </div>

                {/* 급여별 판정 결과 */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-body">{t('checker.byBenefit')}</h4>
                  {Object.entries(result.eligibility).map(([benefit, eligible]) => (
                    <div
                      key={benefit}
                      className={`flex justify-between items-center p-3 rounded-lg ${
                        eligible
                          ? 'bg-primary-soft text-primary border border-primary'
                          : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                      }`}
                    >
                      <div>
                        <span className={`font-medium ${eligible ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                          {t(`benefits.${benefit}`)}
                        </span>
                        <span className="text-xs text-muted ml-2">
                          {t('checker.threshold', { amount: formatCurrency(result.thresholds[benefit as keyof typeof result.thresholds]) })}
                        </span>
                      </div>
                      <span className={`font-semibold ${eligible ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {eligible ? t('checker.eligible') : t('checker.ineligible')}
                      </span>
                    </div>
                  ))}
                </div>

                {/* 안내 메시지 */}
                <div className="bg-subtle border border-line rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <Info className="w-5 h-5 text-muted shrink-0 mt-0.5" />
                    <div className="text-sm text-body">
                      <p className="font-medium mb-1">{t('checker.notesTitle')}</p>
                      <ul className="list-disc list-inside space-y-1 text-sub">
                        <li>{t('checker.noteSimple')}</li>
                        <li>{t('checker.noteReview')}</li>
                        {(t.raw('checkerNotes') as string[]).map((note) => <li key={note}>{note}</li>)}
                        <li>{t('checker.noteCenter')}</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted py-12">
                <Calculator className="w-16 h-16 mb-4 opacity-30" />
                <p className="text-center">
                  {t('checker.emptyLine1')}<br />
                  {t('checker.emptyBefore')}<strong>{t('checker.submit')}</strong>{t('checker.emptyAfter')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 계산식 안내 (접힌 상태) */}
        <details className="mt-6">
          <summary className="cursor-pointer text-sm font-medium text-sub hover:text-fg">
            {t('checker.formulaToggle')}
          </summary>
          <div className="mt-4 space-y-3 text-sm">
            <div className="bg-subtle rounded-lg p-3">
              <p className="font-semibold text-sub">
                {t('checker.formula1')}
              </p>
            </div>
            <div className="bg-subtle rounded-lg p-3">
              <p className="font-semibold text-sub">
                {t('checker.formula2')}
              </p>
            </div>
            <div className="bg-subtle rounded-lg p-3">
              <p className="font-semibold text-sub">
                {t('checker.formula3')}
              </p>
              <p className="text-xs text-primary mt-1">
                {t('checker.rates')}
              </p>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
};

const MedianIncomeTable = () => {
  const t = useTranslations('medianIncome');
  const currentYear = yearInForce();
  const [selectedYear, setSelectedYear] = useState<YearType>(currentYear);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [customPercentage, setCustomPercentage] = useState<string>('');

  const formatCurrency = (amount: number): string => {
    return t('won', { n: new Intl.NumberFormat('ko-KR').format(Math.floor(amount)) });
  };
  const householdLabels = [1, 2, 3, 4, 5, 6].map((n) => t('household', { n }));

  const calculateAmount = (baseAmount: number, percentage: number): number => {
    return baseAmount * (percentage / 100);
  };

  const baseData = medianIncomeData[selectedYear];
  const cmpYears = availableYears.slice(0, 4).reverse(); // 최근 4개 연도, 오름차순

  // 사용자 정의 비율 계산
  const customPercentageNum = parseFloat(customPercentage) || 0;
  const showCustomRow = customPercentageNum > 0 && customPercentageNum <= 500;

  return (
    <div className="relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-fg">
              {t('title')}
            </h1>
            <p className="text-sm text-muted mt-1">
              {t('table.headerDesc')}
            </p>
          </div>
        </div>

        {/* 연도 탭 */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex bg-surface rounded-xl p-1.5 shadow-lg border border-line flex-wrap justify-center gap-1">
            {availableYears.map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                aria-pressed={selectedYear === year}
                className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold text-base sm:text-lg transition-all duration-200 ${
                  selectedYear === year
                    ? 'bg-primary hover:bg-blue-700 text-white shadow-md'
                    : 'text-sub hover:text-fg hover:bg-soft'
                }`}
              >
                {t('table.yearTab', { year })}
              </button>
            ))}
          </div>
        </div>

        {/* 100% 기준 중위소득 카드 */}
        <div className={`${glassCard} ${glassInset} p-6 mb-8`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-soft rounded-lg">
              <Calculator className="w-5 h-5 text-body" />
            </div>
            <h2 className="text-xl font-bold text-fg">
              {t('table.yearBase', { year: selectedYear })}
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {householdLabels.map((label, index) => (
              <div
                key={label}
                className="bg-subtle rounded-xl p-4 text-center"
              >
                <div className="text-sm text-sub mb-1">{label}</div>
                <div className="text-lg font-bold text-fg">
                  {formatCurrency(baseData[index])}
                </div>
              </div>
            ))}
          </div>
          {Number(selectedYear) > Number(currentYear) && (
            <p className="mt-4 text-sm rounded-xl p-3 bg-subtle text-sub">{t('upcoming', { year: selectedYear, current: currentYear })}</p>
          )}
          <p className="mt-3 text-xs text-muted">{t('source')}</p>
        </div>

        {/* 사용자 정의 비율 계산기 */}
        <div className={`${glassCard} ${glassInset} p-6 mb-8`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-soft rounded-lg">
              <Calculator className="w-5 h-5 text-body" />
            </div>
            <h2 className="text-xl font-bold text-fg">
              {t('table.ratioCalc')}
            </h2>
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sub">{t('table.ratioLabel')}</span>
              <input
                type="number"
                value={customPercentage}
                onChange={(e) => setCustomPercentage(e.target.value)}
                placeholder={t('table.ratioPlaceholder')}
                className="w-24 px-3 py-2 border border-line-strong rounded-lg text-center font-semibold bg-field text-fg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="text-sub">%</span>
            </div>
            <p className="text-sm text-muted">
              {t('table.ratioHint')}
            </p>
          </div>
          {showCustomRow && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {householdLabels.map((label, index) => (
                <div
                  key={label}
                  className="bg-subtle rounded-xl p-4 text-center border-2 border-line"
                >
                  <div className="text-sm text-sub mb-1">{label}</div>
                  <div className="text-lg font-bold text-sub">
                    {formatCurrency(calculateAmount(baseData[index], customPercentageNum))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 비율별 중위소득 테이블 */}
        <div className={`${glassCard} ${glassInset} overflow-hidden mb-8`}>
          <div className="p-6 border-b border-line">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-soft rounded-lg">
                <Users className="w-5 h-5 text-body" />
              </div>
              <h2 className="text-xl font-bold text-fg">
                {t('table.byRatio', { year: selectedYear })}
              </h2>
            </div>
          </div>

          {/* 데스크톱 테이블 */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-subtle">
                <tr>
                  <th className="px-4 py-4 text-left text-sm font-semibold text-fg sticky left-0 bg-subtle z-10 min-w-[180px]">
                    {t('table.ratioPrograms')}
                  </th>
                  {householdLabels.map((label) => (
                    <th key={label} className="px-4 py-4 text-right text-sm font-semibold text-fg whitespace-nowrap">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {percentages.map((percentage) => {
                  const programs = welfareProgramsByPercentage[percentage] || [];
                  const isHighlighted = [32, 40, 48, 50, 100].includes(percentage);

                  return (
                    <tr
                      key={percentage}
                      className={`
                        ${isHighlighted ? 'bg-primary-soft text-primary' : ''}
                        hover:bg-subtle transition-colors
                      `}
                    >
                      <td className="px-4 py-4 sticky left-0 bg-surface z-10 border-r border-line">
                        <div className="flex flex-col gap-1">
                          <span className={`font-bold text-lg ${
                            percentage === 100 ? 'text-primary' :
                            percentage <= 50 ? 'text-red-600 dark:text-red-400' :
                            'text-fg'
                          }`}>
                            {percentage}%
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {programs.slice(0, 3).map((program, idx) => (
                              <span
                                key={idx}
                                title={`${program.name}: ${program.description}`}
                                className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-soft ${categoryColors[program.category]} cursor-help`}
                              >
                                {program.icon}
                                <span>{program.name}</span>
                              </span>
                            ))}
                            {programs.length > 3 && (
                              <span
                                className="relative group text-xs text-muted cursor-help"
                              >
                                <span className="hover:text-primary underline decoration-dotted">
                                  {t('table.more', { n: programs.length - 3 })}
                                </span>
                                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-50 w-64 p-3 bg-surface rounded-lg shadow-xl border border-line">
                                  <div className="text-xs font-semibold text-body mb-2">{t('table.morePrograms')}</div>
                                  <div className="space-y-1.5">
                                    {programs.slice(3).map((program, idx) => (
                                      <div key={idx} className={`flex items-start gap-2 ${categoryColors[program.category]}`}>
                                        <span className="shrink-0 mt-0.5">{program.icon}</span>
                                        <div>
                                          <div className="font-medium">{program.name}</div>
                                          <div className="text-muted text-xs">{program.description}</div>
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
                          <span className="font-medium text-fg">
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
          <div className="lg:hidden divide-y divide-line">
            {percentages.map((percentage) => {
              const programs = welfareProgramsByPercentage[percentage] || [];
              const isExpanded = expandedRow === percentage;
              const isHighlighted = [32, 40, 48, 50, 100].includes(percentage);

              return (
                <div
                  key={percentage}
                  className={`${isHighlighted ? 'bg-primary-soft text-primary' : ''}`}
                >
                  <button
                    onClick={() => setExpandedRow(isExpanded ? null : percentage)}
                    className="w-full px-4 py-4 flex items-center justify-between text-left"
                  >
                    <div className="flex flex-col gap-1">
                      <span className={`font-bold text-lg ${
                        percentage === 100 ? 'text-primary' :
                        percentage <= 50 ? 'text-red-600 dark:text-red-400' :
                        'text-fg'
                      }`}>
                        {t('table.ratioRow', { percentage })}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {programs.slice(0, 2).map((program, idx) => (
                          <span
                            key={idx}
                            title={`${program.name}: ${program.description}`}
                            className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-soft ${categoryColors[program.category]}`}
                          >
                            {program.icon}
                            <span>{program.name}</span>
                          </span>
                        ))}
                        {programs.length > 2 && (
                          <span
                            className="text-xs text-primary underline decoration-dotted"
                            title={programs.slice(2).map(p => p.name).join(', ')}
                          >
                            {t('table.more', { n: programs.length - 2 })}
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
                            className="bg-subtle rounded-lg p-3"
                          >
                            <div className="text-xs text-muted">{label}</div>
                            <div className="font-semibold text-fg">
                              {formatCurrency(calculateAmount(baseData[index], percentage))}
                            </div>
                          </div>
                        ))}
                      </div>

                      {programs.length > 0 && (
                        <div className="pt-2 border-t border-line">
                          <div className="text-sm font-medium text-body mb-2">
                            {t('table.programs')}
                          </div>
                          <div className="space-y-2">
                            {programs.map((program, idx) => (
                              <div
                                key={idx}
                                className="flex items-start gap-2 text-sm"
                              >
                                <span className={categoryColors[program.category]}>{program.icon}</span>
                                <div>
                                  <div className="font-medium text-fg">{program.name}</div>
                                  <div className="text-muted text-xs">{program.description}</div>
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
        <div className={`${glassCard} ${glassInset} overflow-hidden mb-8`}>
          <div className="p-6 border-b border-line">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-soft rounded-lg">
                <Heart className="w-5 h-5 text-body" />
              </div>
              <h2 className="text-xl font-bold text-fg">
                {t('table.basicBenefits', { year: selectedYear })}
              </h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-subtle">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-fg">{t('table.benefitType')}</th>
                  {householdLabels.map((label) => (
                    <th key={label} className="px-4 py-3 text-right text-sm font-semibold text-fg whitespace-nowrap">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {[
                  { name: 'education', percentage: 50, color: 'text-green-600', bg: 'bg-subtle' },
                  { name: 'housing', percentage: 48, color: 'text-orange-600', bg: 'bg-subtle' },
                  { name: 'medical', percentage: 40, color: 'text-pink-600', bg: 'bg-subtle' },
                  { name: 'livelihood', percentage: 32, color: 'text-red-600', bg: 'bg-subtle' },
                ].map((benefit) => (
                  <tr key={benefit.name} className={benefit.bg}>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${benefit.color}`}>
                        {t(`benefits.${benefit.name}`)} ({benefit.percentage}%)
                      </span>
                    </td>
                    {baseData.map((amount, index) => (
                      <td key={index} className="px-4 py-3 text-right">
                        <span className="font-medium text-fg">
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
        <div className={`${glassCard} ${glassInset} overflow-hidden mb-8`}>
          <div className="p-6 border-b border-line">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-soft rounded-lg">
                <Building2 className="w-5 h-5 text-body" />
              </div>
              <h2 className="text-xl font-bold text-fg">
                {t('table.localBenefits', { year: selectedYear })}
              </h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-subtle">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-fg">{t('table.regionCol')}</th>
                  {householdLabels.map((label) => (
                    <th key={label} className="px-4 py-3 text-right text-sm font-semibold text-fg whitespace-nowrap">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {[
                  { name: 'incheonDaegu', percentage: 50, color: 'text-teal-600' },
                  { name: 'seoul', percentage: 48, color: 'text-blue-600' },
                  { name: 'busanGwangju', percentage: 45, color: 'text-indigo-600' },
                ].map((region) => (
                  <tr key={region.name} className="hover:bg-subtle">
                    <td className="px-4 py-3">
                      <div>
                        <span className={`font-semibold ${region.color}`}>{t(`table.localRegions.${region.name}`)}</span>
                        <span className="text-sm text-muted ml-2">({region.percentage}%)</span>
                      </div>
                    </td>
                    {baseData.map((amount, index) => (
                      <td key={index} className="px-4 py-3 text-right">
                        <span className="font-medium text-fg">
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
        <div className={`${glassCard} ${glassInset} p-6`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-soft rounded-lg">
              <TrendingUp className="w-5 h-5 text-body" />
            </div>
            <h2 className="text-xl font-bold text-fg">
              {t('table.yearCompare', { from: cmpYears[0], to: cmpYears[cmpYears.length - 1] })}
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-subtle">
                <tr>
                  <th className="px-3 py-3 text-left text-sm font-semibold text-fg">{t('table.householdCol')}</th>
                  {cmpYears.map((y) => (
                    <th key={y} className="px-3 py-3 text-right text-sm font-semibold text-fg">{t('table.yearTab', { year: y })}</th>
                  ))}
                  <th className="px-3 py-3 text-right text-sm font-semibold text-fg">
                    <span className="hidden sm:inline">{t('table.growthRange', { from: cmpYears[0], to: cmpYears[cmpYears.length - 1] })}</span>
                    <span className="sm:hidden">{t('table.growth')}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {householdLabels.map((label, index) => {
                  const first = medianIncomeData[cmpYears[0]][index];
                  const last = medianIncomeData[cmpYears[cmpYears.length - 1]][index];
                  const totalIncreaseRate = ((last - first) / first * 100).toFixed(1);

                  return (
                    <tr key={label} className="hover:bg-subtle">
                      <td className="px-3 py-3 font-medium text-fg whitespace-nowrap">{label}</td>
                      {cmpYears.map((y) => (
                        <td key={y} className={`px-3 py-3 text-right text-sm ${y === currentYear ? 'text-primary font-semibold' : 'text-body'}`}>
                          {formatCurrency(medianIncomeData[y][index])}
                        </td>
                      ))}
                      <td className="px-3 py-3 text-right">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-soft text-sub">
                          +{totalIncreaseRate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 text-xs text-muted">
            {t('table.footnote')}
          </div>
        </div>

        <GuideSection namespace="medianIncome" />
      </div>
    </div>
  );
};

export default MedianIncomeTable;
