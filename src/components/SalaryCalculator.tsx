'use client'

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from '@/hooks/useSearchParams';
import Link from 'next/link';
import { DollarSign, TrendingUp, Calculator, Table, Save, BarChart3, ChevronRight } from 'lucide-react';
import ShareResult from '@/components/ShareResult';
import { topPercent, simulateRaise, hourlyNet, MONTHLY_HOURS, NTS_SOURCE_YEAR } from '@/utils/salaryInsights';
import { useTranslations } from '@/lib/i18n';
import { useCalculationHistory } from '@/hooks/useCalculationHistory';
import CalculationHistory from '@/components/CalculationHistory';
import FeedbackWidget from '@/components/FeedbackWidget';
import PDFExport from '@/components/PDFExport';
import dynamic from 'next/dynamic'
import { INSURANCE, pct } from '@/utils/insuranceRates'
import { calculateNetSalary as calcNetSalary } from '@/utils/netSalary'
const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false })

const SalaryCalculatorContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('salary');
  const tc = useTranslations('common');
  const [salary, setSalary] = useState('50,000,000'); // 첫 화면부터 결과 표시 (URL ?salary= 가 있으면 덮어씀)
  const [salaryType, setSalaryType] = useState<'annual' | 'monthly'>('annual');
  const [nonTaxableAmount, setNonTaxableAmount] = useState('0');
  const [dependents, setDependents] = useState('1');
  const [childrenUnder20, setChildrenUnder20] = useState('0');
  const [result, setResult] = useState<ReturnType<typeof calculateNetSalary>>(null);
  const [raisePct, setRaisePct] = useState(5);
  const [showTable, setShowTable] = useState(false);
  const [showSaveButton, setShowSaveButton] = useState(false);
  const [bonusMonths, setBonusMonths] = useState<number[]>([]);
  const [bonusPercentage, setBonusPercentage] = useState('100');
  const [performanceBonus, setPerformanceBonus] = useState('0'); // 성과급 (연봉 외 추가)
  const [experienceYears, setExperienceYears] = useState('0');
  const [showCharts, setShowCharts] = useState(false);

  // 계산 이력 관리
  const {
    histories,
    isLoading: historyLoading,
    saveCalculation,
    removeHistory,
    clearHistories,
    loadFromHistory
  } = useCalculationHistory('salary');

  // 자녀 수는 부양가족(본인 포함)에 포함된 인원 → 부양가족-1을 넘을 수 없음 (URL 등 잘못된 조합 방지)
  const taxOptions = (nonTaxable: string, dependentCount: string, childrenCount: string) => {
    const deps = parseInt(dependentCount) || 1;
    return {
      nonTaxableMonthly: parseInt(nonTaxable.replace(/,/g, '')) || 0,
      dependents: deps,
      children: Math.min(parseInt(childrenCount) || 0, deps - 1),
    };
  };

  // 한국 연봉 실수령액 계산 함수 (4대보험 요율은 insuranceRates.ts 기준연도)
  const calculateNetSalary = (inputSalary: string, type: 'annual' | 'monthly', nonTaxable: string, dependentCount: string, childrenCount: string) => {
    const salaryNum = parseInt(inputSalary.replace(/,/g, ''));
    if (!salaryNum || salaryNum <= 0) return null;
    // 계산 로직은 utils/netSalary.ts (연봉 실수령액 표와 공유)
    return calcNetSalary(type === 'monthly' ? salaryNum * 12 : salaryNum, taxOptions(nonTaxable, dependentCount, childrenCount));
  };

  const handleCalculate = React.useCallback(() => {
    const calculation = calculateNetSalary(salary, salaryType, nonTaxableAmount, dependents, childrenUnder20);
    setResult(calculation);
    setShowSaveButton(!!calculation); // 계산 결과가 있으면 저장 버튼 표시
  }, [salary, salaryType, nonTaxableAmount, dependents, childrenUnder20]);

  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // 월별 실수령액 계산 (상여금 포함) - 올바른 상여금 분할 방식
  const calculateMonthlyTakeHome = () => {
    if (!result) return [];
    
    // 상여금 개념: 연봉을 (12 + 상여비율/100)회로 분할하여 지급
    // 상여 800% → 8. 지급월을 안 고르면 상여가 어디에도 안 붙어 연 합계가 연봉보다 작아지므로 균등(÷12) 처리
    const bonusRatio = bonusMonths.length ? parseInt(bonusPercentage) / 100 : 0;
    const totalPayments = 12 + bonusRatio; // 12개월 + 상여 횟수
    const onePaymentAmount = Math.floor(result.gross / totalPayments); // 1회 지급액
    
    // 기본 월급: 1회 지급액
    const baseMonthlySalary = onePaymentAmount;
    
    const monthlyData = [];
    
    for (let month = 1; month <= 12; month++) {
      const hasBonus = bonusMonths.includes(month);
      
      // 해당 월의 총 지급액 = 기본 월급 + (상여월인 경우 1회 지급액 추가)
      let monthlyGross = baseMonthlySalary;
      let bonusAmount = 0;
      
      if (hasBonus && bonusRatio > 0) {
        // 상여금이 여러 번 나뉘어 지급되는 경우 고려
        const bonusPerMonth = bonusRatio / bonusMonths.length;
        bonusAmount = Math.floor(onePaymentAmount * bonusPerMonth);
        monthlyGross = baseMonthlySalary + bonusAmount;
      }
      
      // 성과급 계산 (연말에 일시 지급 가정)
      let performanceAmount = 0;
      if (month === 12 && parseInt(performanceBonus) > 0) {
        performanceAmount = Math.floor(result.gross * (parseInt(performanceBonus) / 100));
        monthlyGross += performanceAmount;
      }

      // 월별 실제 공제액 계산 (총 공제액을 총 지급액으로 비례 배분)
      const monthlyTaxRate = result.deductions.total / result.gross;
      const monthlyDeductions = Math.floor(monthlyGross * monthlyTaxRate);

      monthlyData.push({
        month: `${month}월`,
        grossSalary: monthlyGross,
        takeHome: monthlyGross - monthlyDeductions,
        bonus: bonusAmount,
        performance: performanceAmount,
        basicSalary: baseMonthlySalary,
        deductions: monthlyDeductions
      });
    }
    
    return monthlyData;
  };

  // 경력별 평균 연봉 데이터 (한국 IT 업계 기준)
  const careerAverageSalary = [
    { experience: '신입', average: 35000000, min: 28000000, max: 42000000 },
    { experience: '1-2년', average: 42000000, min: 35000000, max: 50000000 },
    { experience: '3-4년', average: 52000000, min: 45000000, max: 65000000 },
    { experience: '5-7년', average: 65000000, min: 55000000, max: 80000000 },
    { experience: '8-10년', average: 80000000, min: 65000000, max: 100000000 },
    { experience: '10년+', average: 95000000, min: 75000000, max: 150000000 }
  ];

  // 세금 구성 차트 데이터
  const getTaxCompositionData = () => {
    if (!result) return [];
    
    return [
      { name: '국민연금', value: result.deductions.nationalPension, color: '#3B82F6' },
      { name: '건강보험', value: result.deductions.healthInsurance, color: '#10B981' },
      { name: '장기요양', value: result.deductions.longTermCare, color: '#8B5CF6' },
      { name: '고용보험', value: result.deductions.employmentInsurance, color: '#F59E0B' },
      { name: '소득세', value: result.deductions.incomeTax, color: '#EF4444' },
      { name: '지방소득세', value: result.deductions.localIncomeTax, color: '#EC4899' }
    ];
  };

  const handleSalaryInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/,/g, '');
    if (/^\d*$/.test(value)) {
      // 빈 칸은 빈 칸으로 둠 (예전엔 '0'으로 바뀌어 지울 수가 없었음)
      const formattedValue = value === '' ? '' : formatNumber(Number(value));
      setSalary(formattedValue);
      updateURL({ salary: value });
    }
  };

  const handleNonTaxableChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/,/g, '');
    if (/^\d*$/.test(value)) {
      const formattedValue = value === '' ? '' : formatNumber(Number(value));
      setNonTaxableAmount(formattedValue);
      updateURL({ nonTaxable: value });
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
      salary,
      salaryType,
      nonTaxableAmount,
      dependents,
      childrenUnder20
    };

    const success = saveCalculation(inputs, result);
    if (success) {
      setShowSaveButton(false);
      // 저장 성공 피드백 (선택사항)
    }
  };

  // 이력에서 불러오기
  const handleLoadFromHistory = (historyId: string) => {
    const inputs = loadFromHistory(historyId);
    if (inputs) {
      setSalary(inputs.salary || '');
      setSalaryType(inputs.salaryType || 'annual');
      setNonTaxableAmount(inputs.nonTaxableAmount || '0');
      setDependents(inputs.dependents || '1');
      setChildrenUnder20(inputs.childrenUnder20 || '0');
      
      // URL도 업데이트
      updateURL({
        salary: inputs.salary?.replace(/,/g, '') || '',
        type: inputs.salaryType || 'annual',
        nonTaxable: inputs.nonTaxableAmount?.replace(/,/g, '') || '0',
        dependents: inputs.dependents || '1',
        children: inputs.childrenUnder20 || '0'
      });
    }
  };

  // 이력 결과 포맷팅
  const formatHistoryResult = (result: Record<string, unknown>) => {
    if (!result) return '';
    return t('history.format', { monthly: formatNumber(result.netMonthly as number), annual: formatNumber(result.netAnnual as number) });
  };

  // URL에서 초기값 로드
  useEffect(() => {
    const salaryParam = searchParams.get('salary');
    const typeParam = searchParams.get('type');
    const nonTaxableParam = searchParams.get('nonTaxable');
    const dependentsParam = searchParams.get('dependents');
    const childrenParam = searchParams.get('children');

    if (salaryParam && /^\d+$/.test(salaryParam)) {
      setSalary(formatNumber(Number(salaryParam)));
    }
    if (typeParam && ['annual', 'monthly'].includes(typeParam)) {
      setSalaryType(typeParam as 'annual' | 'monthly');
    }
    if (nonTaxableParam && /^\d+$/.test(nonTaxableParam)) {
      setNonTaxableAmount(formatNumber(Number(nonTaxableParam)));
    }
    if (dependentsParam && /^\d+$/.test(dependentsParam)) {
      setDependents(dependentsParam);
    }
    if (childrenParam && /^\d+$/.test(childrenParam)) {
      setChildrenUnder20(childrenParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (salary) {
      handleCalculate();
    } else {
      setResult(null);
    }
  }, [salary, salaryType, nonTaxableAmount, dependents, childrenUnder20, handleCalculate]);

  // 연봉별 표 데이터 생성
  const generateSalaryTable = () => {
    const tableData = [];
    for (let salaryAmount = 20000000; salaryAmount <= 200000000; salaryAmount += 1000000) {
      const calculation = calculateNetSalary(salaryAmount.toString(), 'annual', '0', '1', '0');
      if (calculation) {
        tableData.push({
          grossAnnual: salaryAmount,
          netAnnual: calculation.netAnnual,
          netMonthly: calculation.netMonthly,
          totalDeductions: calculation.deductions.total
        });
      }
    }
    return tableData;
  };

  // ── 입소문 지표 (결과가 있을 때만 의미 있음) ──
  const opts = taxOptions(nonTaxableAmount, dependents, childrenUnder20);
  const topPct = result ? topPercent(result.gross) : 0;
  const deductionPct = result ? (result.deductions.total / result.gross) * 100 : 0;
  const raise = result ? simulateRaise(result.gross, raisePct, opts) : null;
  const toMan = (won: number) => t('viral.salaryMan', { man: formatNumber(Math.round(won / 10000)), won: formatNumber(won) });
  // 공유 링크는 현재 주소창이 아니라 입력값으로 직접 만듦 → 기본값(파라미터 없음) 상태에서도 결과 재현
  const shareUrl = typeof window === 'undefined' ? undefined
    : `${window.location.origin}/salary-calculator/?${new URLSearchParams({
        salary: salary.replace(/,/g, ''), type: salaryType, nonTaxable: nonTaxableAmount.replace(/,/g, '') || '0',
        dependents: String(opts.dependents), children: String(opts.children),
      })}`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-fg">{t('title')}</h1>
          <p className="text-sm text-muted mt-1">
            {t('description')}
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
        <div className={`ui-card p-8`}>
          <h2 className="text-2xl font-semibold mb-6 text-fg">{t('input.salaryType')}</h2>
          
          <div className="space-y-6">
            {/* 급여 유형 선택 */}
            <div>
              <label className="block text-sm font-medium text-body mb-3">
                {t('input.salaryType')}
              </label>
              <div className="flex p-1 rounded-2xl bg-soft">
                {(['annual', 'monthly'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => { setSalaryType(type); updateURL({ type }); }}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      salaryType === type
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-sub hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    {t(`input.${type}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* 급여 입력 */}
            <div>
              <label className="block text-sm font-medium text-body mb-2">
                {salaryType === 'annual' ? `${t('input.annual')} (세전)` : `${t('input.monthly')} (세전)`}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={salary}
                  onChange={handleSalaryInputChange}
                  placeholder={salaryType === 'annual' ? t('input.salaryPlaceholderAnnual') : t('input.salaryPlaceholderMonthly')}
                  className={`ui-field px-4 py-4 text-lg font-semibold pr-14`}
                />
                <span className="absolute right-4 top-4 text-gray-600 font-medium">{t('input.currency')}</span>
              </div>
            </div>

            {/* 비과세액 */}
            <div>
              <label className="block text-sm font-medium text-body mb-2">
                {t('input.nonTaxable')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={nonTaxableAmount}
                  onChange={handleNonTaxableChange}
                  placeholder={t('input.nonTaxablePlaceholder')}
                  className={`ui-field px-4 py-3 pr-14`}
                />
                <span className="absolute right-3 top-3 text-muted">{t('input.currency')}</span>
              </div>
              <p className="text-xs text-muted mt-1">
                {t('input.nonTaxableDesc')}
              </p>
            </div>

            {/* 부양가족 정보 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-body mb-2">
                  {t('input.dependents')}
                </label>
                <select
                  value={dependents}
                  onChange={(e) => {
                    const maxChildren = String(Math.min(parseInt(childrenUnder20) || 0, parseInt(e.target.value) - 1));
                    setDependents(e.target.value);
                    setChildrenUnder20(maxChildren);
                    updateURL({ dependents: e.target.value, children: maxChildren });
                  }}
                  className={`ui-field px-3 py-3`}
                >
                  {[1,2,3,4,5,6,7,8,9,10].map(num => (
                    <option key={num} value={num}>{num}명</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-body mb-2">
                  {t('input.children')}
                </label>
                <select
                  value={childrenUnder20}
                  onChange={(e) => {
                    setChildrenUnder20(e.target.value);
                    updateURL({ children: e.target.value });
                  }}
                  className={`ui-field px-3 py-3`}
                >
                  {[0,1,2,3,4,5].filter(num => num < (parseInt(dependents) || 1)).map(num => (
                    <option key={num} value={num}>{num}명</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 고급 설정 (접이식) */}
            <details className="group rounded-2xl border border-line bg-surface overflow-hidden">
              <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-sm font-semibold text-body select-none list-none">
                <span>고급 설정 <span className="font-normal text-faint">(상여금 · 성과급 · 경력)</span></span>
                <span className="text-gray-400 transition-transform duration-200 group-open:rotate-45 text-lg leading-none">+</span>
              </summary>
              <div className="border-t border-line px-5 py-5 space-y-5">
                {/* 상여금 설정 */}
                <div>
                  <h3 className="text-sm font-medium text-body mb-2">상여금 설정</h3>
                  <div className="bg-subtle rounded-xl p-3 mb-3">
                    <p className="text-xs text-sub">
                      <strong className="text-body">상여금은 연봉을 분할 지급하는 방식입니다</strong><br/>
                      예: 연봉 3000만원 + 상여 800% = 3000만원을 20회(12+8)로 나누어 지급
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-sub mb-1.5">상여금 비율</label>
                      <select
                        value={bonusPercentage}
                        onChange={(e) => setBonusPercentage(e.target.value)}
                        className={`ui-field px-3 py-2`}
                      >
                        <option value="0">상여금 없음 (연봉÷12개월)</option>
                        {/* 계산식(12 + 비율/100 회)과 라벨을 일치시킴 — 예전 라벨은 ÷14/÷16…로 계산과 달랐음 */}
                        <option value="100">100% (연봉÷13회)</option>
                        <option value="200">200% (연봉÷14회)</option>
                        <option value="300">300% (연봉÷15회)</option>
                        <option value="400">400% (연봉÷16회)</option>
                        <option value="600">600% (연봉÷18회)</option>
                        <option value="800">800% (연봉÷20회)</option>
                      </select>
                    </div>
                    {bonusPercentage !== '0' && (
                      <div>
                        <label className="block text-xs text-sub mb-1.5">상여금 지급 월</label>
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                            <button
                              key={month}
                              onClick={() => {
                                if (bonusMonths.includes(month)) {
                                  setBonusMonths(bonusMonths.filter(m => m !== month));
                                } else {
                                  setBonusMonths([...bonusMonths, month]);
                                }
                              }}
                              className={`py-1.5 px-2 text-xs rounded-xl transition-all font-medium ${
                                bonusMonths.includes(month)
                                  ? 'bg-primary text-white'
                                  : 'bg-surface border border-line text-body hover:bg-soft'
                              }`}
                            >
                              {month}월
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 성과급 설정 */}
                <div className="border-t border-line pt-5">
                  <h3 className="text-sm font-medium text-body mb-2">성과급 설정</h3>
                  <div className="bg-subtle rounded-xl p-3 mb-3">
                    <p className="text-xs text-sub">
                      <strong className="text-body">성과급은 연봉에 추가로 지급되는 금액입니다</strong><br/>
                      예: 연봉 3000만원 + 성과급 200% = 3000만원 + (3000만원의 200%)
                    </p>
                  </div>
                  <label className="block text-xs text-sub mb-1.5">성과급 비율</label>
                  <select
                    value={performanceBonus}
                    onChange={(e) => setPerformanceBonus(e.target.value)}
                    className={`ui-field px-3 py-2`}
                  >
                    <option value="0">성과급 없음</option>
                    <option value="50">50% (연봉의 50%)</option>
                    <option value="100">100% (연봉의 100%)</option>
                    <option value="150">150% (연봉의 150%)</option>
                    <option value="200">200% (연봉의 200%)</option>
                    <option value="300">300% (연봉의 300%)</option>
                  </select>
                  <p className="text-xs text-muted mt-1.5">성과급은 회사 실적에 따라 변동될 수 있습니다</p>
                </div>

                {/* 경력 정보 */}
                <div className="border-t border-line pt-5">
                  <label className="block text-sm font-medium text-body mb-2">경력 (연차)</label>
                  <select
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(e.target.value)}
                    className={`ui-field px-3 py-3`}
                  >
                    <option value="0">신입</option>
                    <option value="1">1-2년</option>
                    <option value="3">3-4년</option>
                    <option value="5">5-7년</option>
                    <option value="8">8-10년</option>
                    <option value="10">10년 이상</option>
                  </select>
                </div>
              </div>
            </details>

            <div className="bg-surface border border-line rounded-2xl p-4">
              <h3 className="font-medium text-body mb-2">{t('calculation.basis')}</h3>
              <ul className="text-sm text-sub space-y-1">
                {Array.from({ length: 6 }, (_, index) => (
                  <li key={index}>• {t(`calculation.points.${index}`)}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Result Section */}
        <div className={`ui-card p-8`}>
          <h2 className="text-2xl font-semibold mb-6 text-fg">{tc('result')}</h2>
          
          {result ? (
            <div className="space-y-6">
              {/* Main Results */}
              <div className="relative overflow-hidden ui-hero p-6 sm:p-8">
                <div className="relative">
                  <div className="flex items-start justify-between gap-4 mb-1">
                    <p className="text-white/80 text-sm font-medium">{t('result.monthlyTakeHome')}</p>
                    <TrendingUp className="w-5 h-5 shrink-0 text-white/80" />
                  </div>
                  <div className="text-4xl sm:text-5xl font-bold tracking-tight text-white mt-1 mb-2 tabular-nums">
                    {formatNumber(result.netMonthly)}<span className="text-2xl sm:text-3xl ml-1 font-semibold text-white/70">원</span>
                  </div>
                  <p className="text-sm font-semibold text-white mb-5">
                    {t('viral.heroTop', { salary: toMan(result.gross), top: topPct })}
                  </p>
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className="rounded-2xl bg-white/[0.14] px-4 py-3">
                      <div className="text-xs text-white/70 mb-1">{t('result.annualTakeHome')}</div>
                      <div className="text-base font-semibold text-white">{formatNumber(result.netAnnual)}원</div>
                    </div>
                    <div className="rounded-2xl bg-white/[0.14] px-4 py-3">
                      <div className="text-xs text-white/70 mb-1">{t('result.effectiveTaxRate')}</div>
                      <div className="text-base font-semibold text-white">{result.taxInfo?.effectiveTaxRate.toFixed(1)}%</div>
                    </div>
                  </div>
                  {showSaveButton && (
                    <button
                      onClick={handleSaveCalculation}
                      className="inline-flex items-center gap-2 bg-white/[0.16] hover:bg-white/[0.24] px-4 py-2 rounded-xl text-white text-sm font-medium transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      <span>{tc('save')}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 한 줄 인사이트: 공제 비율 · 월급 기준 시급 · 상위 % 출처 */}
              <div className="bg-subtle rounded-2xl p-5 space-y-2 text-sm text-body">
                <p>{t('viral.deductionLine', { pct: deductionPct.toFixed(1), monthly: formatNumber(Math.round(result.deductions.total / 12)) })}</p>
                <p>{t('viral.hourlyLine', { hourly: formatNumber(hourlyNet(result.netMonthly)), hours: MONTHLY_HOURS })}</p>
                <p className="text-xs text-muted">
                  {t('viral.topSource', { year: NTS_SOURCE_YEAR })}{' '}
                  <Link href="/salary-rank/" className="text-primary font-medium hover:underline">{t('viral.rankLink')}</Link>
                </p>
              </div>

              <ShareResult
                fileName="toolhub-salary"
                url={shareUrl}
                text={t('viral.shareText', { salary: toMan(result.gross), monthly: formatNumber(result.netMonthly), top: topPct })}
                card={{
                  tool: t('title'),
                  label: t('viral.cardLabel', { salary: toMan(result.gross) }),
                  headline: `${formatNumber(result.netMonthly)}${t('input.currency')}`,
                  sub: t('viral.cardSub', { top: topPct, year: NTS_SOURCE_YEAR }),
                  rows: [
                    { label: t('result.annualTakeHome'), value: `${formatNumber(result.netAnnual)}${t('input.currency')}` },
                    { label: t('viral.rowDeduction'), value: `${formatNumber(Math.round(result.deductions.total / 12))}${t('input.currency')} (${deductionPct.toFixed(1)}%)` },
                    { label: t('viral.rowHourly'), value: `${formatNumber(hourlyNet(result.netMonthly))}${t('input.currency')}` },
                    { label: t('viral.rowCondition'), value: t('viral.conditionValue', { dependents: opts.dependents, children: opts.children }) },
                  ],
                }}
              />

              {/* 연봉 인상 시뮬레이션 */}
              {raise && (
                <div className="rounded-2xl border border-line p-5 space-y-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-semibold text-fg">{t('viral.raise.title')}</h3>
                    <span className="text-sm font-semibold text-primary tabular-nums">+{raisePct}%</span>
                  </div>
                  <input
                    type="range" min={0} max={30} step={1} value={raisePct}
                    onChange={(e) => setRaisePct(Number(e.target.value))}
                    aria-label={t('viral.raise.sliderLabel')}
                    className="w-full accent-blue-600"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-muted mb-1">{t('viral.raise.newSalary')}</div>
                      <div className="text-lg font-bold text-fg tabular-nums">{formatNumber(raise.newGross)}{t('input.currency')}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted mb-1">{t('viral.raise.newMonthly')}</div>
                      <div className="text-lg font-bold text-fg tabular-nums">
                        {formatNumber(raise.newNetMonthly)}{t('input.currency')}
                      </div>
                      <div className="text-sm font-semibold text-primary tabular-nums">+{formatNumber(raise.monthlyGain)}{t('input.currency')}</div>
                    </div>
                  </div>
                  {raisePct > 0 && (
                    <p className="text-sm text-body">
                      {t('viral.raise.insight', { pct: raisePct, netPct: raise.netGainPct.toFixed(1), keep: Math.round(raise.keepPct) })}
                    </p>
                  )}
                  <Link
                    href={`/salary-comparison/?salaryA=${result.gross}&salaryB=${raise.newGross}`}
                    className="flex items-center justify-between rounded-xl bg-soft hover:bg-subtle px-4 py-3 text-sm font-medium text-body transition-colors"
                  >
                    <span>{t('viral.raise.compareLink')}</span>
                    <ChevronRight className="w-4 h-4 text-muted" />
                  </Link>
                </div>
              )}

              {/* Tax Information */}
              {result.taxInfo && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-fg">{t('result.taxInfo')}</h3>
                  <div className="bg-surface border border-line rounded-2xl p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-sub">{t('result.grossSalary')}</span>
                      <span className="font-medium text-fg">{formatNumber(result.gross)}{t('input.currency')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sub">{t('result.taxableIncome')}</span>
                      <span className="font-medium text-fg">{formatNumber(result.taxable)}{t('input.currency')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sub">{t('result.workIncomeDeduction')}</span>
                      <span className="font-medium text-green-600 dark:text-green-400">-{formatNumber(result.workIncomeDeduction)}{t('input.currency')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sub">{t('result.workIncome')}</span>
                      <span className="font-medium text-fg">{formatNumber(result.workIncome)}{t('input.currency')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sub">{t('result.personalDeduction')} ({dependents}명)</span>
                      <span className="font-medium text-green-600 dark:text-green-400">-{formatNumber(result.taxInfo.personalDeduction)}{t('input.currency')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sub">{t('result.pensionDeduction')}</span>
                      <span className="font-medium text-green-600 dark:text-green-400">-{formatNumber(result.deductions.nationalPension)}{t('input.currency')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sub">{t('result.taxableStandard')}</span>
                      <span className="font-medium text-fg">{formatNumber(result.taxInfo.taxableIncome)}{t('input.currency')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sub">{t('result.taxCredit')}</span>
                      <span className="font-medium text-green-600 dark:text-green-400">-{formatNumber(result.taxInfo.taxCredit)}{t('input.currency')}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Deduction Breakdown */}
              <div className="space-y-3">
                <h3 className="font-semibold text-fg">{t('result.deductionBreakdown')}</h3>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b border-gray-100/60 dark:border-white/[0.06]">
                    <span className="text-sub">{t('result.nationalPension')} ({pct(INSURANCE.pensionRate)})</span>
                    <span className="font-semibold text-fg">{formatNumber(result.deductions.nationalPension)}{t('input.currency')}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100/60 dark:border-white/[0.06]">
                    <span className="text-sub">{t('result.healthInsurance')} ({pct(INSURANCE.healthRate)})</span>
                    <span className="font-semibold text-fg">{formatNumber(result.deductions.healthInsurance)}{t('input.currency')}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100/60 dark:border-white/[0.06]">
                    <span className="text-sub">{t('result.longTermCare')} ({pct(INSURANCE.longTermCareRate)})</span>
                    <span className="font-semibold text-fg">{formatNumber(result.deductions.longTermCare)}{t('input.currency')}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100/60 dark:border-white/[0.06]">
                    <span className="text-sub">{t('result.employmentInsurance')} ({pct(INSURANCE.employmentRate)})</span>
                    <span className="font-semibold text-fg">{formatNumber(result.deductions.employmentInsurance)}{t('input.currency')}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100/60 dark:border-white/[0.06]">
                    <span className="text-sub">{t('result.incomeTax')}</span>
                    <span className="font-semibold text-fg">{formatNumber(result.deductions.incomeTax)}{t('input.currency')}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100/60 dark:border-white/[0.06]">
                    <span className="text-sub">{t('result.localIncomeTax')} (10%)</span>
                    <span className="font-semibold text-fg">{formatNumber(result.deductions.localIncomeTax)}{t('input.currency')}</span>
                  </div>
                  <div className="flex justify-between py-3 border-t-2 border-gray-200/80 dark:border-white/[0.10] font-bold">
                    <span className="text-fg">{t('result.totalDeduction')}</span>
                    <span className="text-red-600 dark:text-red-400 font-bold">{formatNumber(result.deductions.total)}{t('input.currency')}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-faint">
              <Calculator className="w-16 h-16 mb-4" />
              <p>{t('placeholder')}</p>
            </div>
          )}

          {/* Action buttons - shown only when there's a result */}
          {result && (
            <div className="mt-8 space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <PDFExport
                  data={result}
                  calculatorType="salary"
                  title="연봉 계산 결과"
                  className="w-full sm:w-auto"
                />
                <FeedbackWidget 
                  calculatorType="salary"
                  className="w-full sm:w-auto max-w-md"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tips Section */}
      <div className={`mt-12 ui-card p-8`}>
        <h2 className="text-2xl font-semibold mb-6 text-fg">{t('tips.title')}</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-surface border-l-4 border-emerald-400/70 border border-line rounded-2xl p-6">
            <h3 className="font-semibold text-fg mb-2">{t('tips.yearEndTax.title')}</h3>
            <p className="text-sub text-sm">
              {t('tips.yearEndTax.content')}
            </p>
          </div>
          <div className="bg-surface border-l-4 border-amber-400/70 border border-line rounded-2xl p-6">
            <h3 className="font-semibold text-fg mb-2">{t('tips.taxSaving.title')}</h3>
            <p className="text-sub text-sm">
              {t('tips.taxSaving.content')}
            </p>
          </div>
        </div>
      </div>

      {/* 연봉별 실수령액 표 섹션 */}
      <div className={`mt-12 ui-card p-8`}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-fg">{t('table.title')}</h2>
            <p className="text-sub mt-1">{t('table.description')}</p>
          </div>
          <button
            onClick={() => setShowTable(!showTable)}
            className="inline-flex items-center gap-2 bg-surface hover:bg-soft border border-line px-4 py-2 rounded-xl text-body text-sm font-medium transition-colors"
          >
            <Table className="w-4 h-4" />
            <span>{showTable ? t('table.hideTable') : t('table.showTable')}</span>
          </button>
        </div>

        {showTable && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="text-left py-3 px-4 font-semibold text-fg">{t('table.headers.salary')}</th>
                  <th className="text-right py-3 px-4 font-semibold text-fg">{t('table.headers.annualTakeHome')}</th>
                  <th className="text-right py-3 px-4 font-semibold text-fg">{t('table.headers.monthlyTakeHome')}</th>
                  <th className="text-right py-3 px-4 font-semibold text-fg">{t('table.headers.totalDeduction')}</th>
                  <th className="text-right py-3 px-4 font-semibold text-fg">{t('table.headers.takeHomeRatio')}</th>
                </tr>
              </thead>
              <tbody>
                {generateSalaryTable().map((row, index) => (
                  <tr key={row.grossAnnual} className={`border-b border-line ${index % 2 === 0 ? 'bg-surface' : ''} hover:bg-soft transition-colors`}>
                    <td className="py-3 px-4 font-medium text-fg">
                      {formatNumber(row.grossAnnual)}{t('input.currency')}
                    </td>
                    <td className="py-3 px-4 text-right text-fg">
                      {formatNumber(row.netAnnual)}{t('input.currency')}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-blue-600 dark:text-blue-400">
                      {formatNumber(row.netMonthly)}{t('input.currency')}
                    </td>
                    <td className="py-3 px-4 text-right text-red-600 dark:text-red-400">
                      {formatNumber(row.totalDeductions)}{t('input.currency')}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-fg">
                      {((row.netAnnual / row.grossAnnual) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showTable && (
          <div className="mt-6 bg-surface border border-line p-4 rounded-2xl">
            <h3 className="text-sm font-medium text-body mb-2">
              {t('table.usage.title')}
            </h3>
            <ul className="text-sm text-sub space-y-1">
              {Array.from({ length: 4 }, (_, index) => (
                <li key={index}>• {t(`table.usage.points.${index}`)}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 시각화 차트 섹션 */}
      {result && (
        <div className={`mt-12 ui-card p-8`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-fg">상세 분석 차트</h2>
            <button
              onClick={() => setShowCharts(!showCharts)}
              className="inline-flex items-center gap-2 bg-surface hover:bg-soft border border-line px-4 py-2 rounded-xl text-body text-sm font-medium transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              <span>{showCharts ? '차트 숨기기' : '차트 보기'}</span>
            </button>
          </div>

          {showCharts && (
            <div className="space-y-8">
              {/* 월별 실수령액 차트 */}
              <div className="bg-surface border border-line rounded-2xl p-8">
                <h3 className="text-xl font-semibold text-fg mb-6 flex items-center">
                  월별 실수령액 변화 (상여금 포함)
                </h3>
                <ReactECharts option={{
                  tooltip: { trigger: 'axis', formatter: (params: { seriesName?: string; value?: number; marker?: string }[]) => {
                    if (!Array.isArray(params)) return '';
                    const month = (params[0] as { axisValue?: string }).axisValue || '';
                    return `<strong>${month}</strong><br/>` + params.map((p: { seriesName?: string; value?: number; marker?: string }) => `${p.marker} ${p.seriesName}: ${formatNumber(p.value ?? 0)}원`).join('<br/>');
                  }},
                  legend: { data: ['실수령액', '상여금', '성과급'], bottom: 0 },
                  grid: { left: '3%', right: '4%', bottom: '12%', containLabel: true },
                  xAxis: { type: 'category', data: calculateMonthlyTakeHome().map(d => d.month) },
                  yAxis: { type: 'value', axisLabel: { formatter: (v: number) => `${(v / 10000).toFixed(0)}만` } },
                  series: [
                    { name: '실수령액', type: 'line', smooth: true, data: calculateMonthlyTakeHome().map(d => d.takeHome), lineStyle: { width: 2, color: '#3B82F6' }, itemStyle: { color: '#3B82F6' }, symbolSize: 8 },
                    { name: '상여금', type: 'line', smooth: true, data: calculateMonthlyTakeHome().map(d => d.bonus), lineStyle: { width: 2, color: '#10B981', type: 'dashed' }, itemStyle: { color: '#10B981' }, symbolSize: 8 },
                    { name: '성과급', type: 'line', smooth: true, data: calculateMonthlyTakeHome().map(d => d.performance), lineStyle: { width: 2, color: '#F59E0B', type: 'dotted' }, itemStyle: { color: '#F59E0B' }, symbolSize: 8 }
                  ]
                }} style={{ height: '300px' }} />
                <div className="mt-4 space-y-2">
                  <div className="p-3 bg-surface border border-line rounded-xl">
                    <p className="text-sm text-body">
                      <strong>상여금 지급 방식:</strong> 연봉 {formatNumber(result.gross)}원을 {12 + parseInt(bonusPercentage)/100}회로 분할
                    </p>
                    {bonusMonths.length > 0 && (
                      <p className="text-sm text-muted mt-1">
                        상여금 지급월: {[...bonusMonths].sort((a, b) => a - b).join(', ')}월 
                        (월 {(parseInt(bonusPercentage)/100/bonusMonths.length).toFixed(1)}회분씩)
                      </p>
                    )}
                    <p className="text-xs text-muted mt-1">
                      기본 월급: {formatNumber(Math.floor(result.gross / (12 + parseInt(bonusPercentage)/100)))}원/회
                    </p>
                  </div>
                  
                  {parseInt(performanceBonus) > 0 && (
                    <div className="p-3 bg-surface border border-amber-200/40 dark:border-amber-400/20 rounded-xl">
                      <p className="text-sm text-body">
                        <strong>성과급:</strong> 연봉의 {performanceBonus}% = {formatNumber(Math.floor(result.gross * (parseInt(performanceBonus) / 100)))}원 (12월 지급)
                      </p>
                      <p className="text-xs text-muted mt-1">
                        성과급은 회사 실적에 따라 변동될 수 있습니다
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 경력별 연봉 비교 */}
              <div className="bg-surface border border-line rounded-2xl p-8">
                <h3 className="text-xl font-semibold text-fg mb-6 flex items-center">
                  경력별 평균 연봉 비교
                </h3>
                <ReactECharts option={{
                  tooltip: { trigger: 'axis', formatter: (params: { seriesName?: string; value?: number; marker?: string }[]) => {
                    if (!Array.isArray(params)) return '';
                    const label = (params[0] as { axisValue?: string }).axisValue || '';
                    return `<strong>${label}</strong><br/>` + params.map((p: { seriesName?: string; value?: number; marker?: string }) => `${p.marker} ${p.seriesName}: ${formatNumber(p.value ?? 0)}원`).join('<br/>');
                  }},
                  grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
                  xAxis: { type: 'category', data: careerAverageSalary.map(d => d.experience) },
                  yAxis: { type: 'value', axisLabel: { formatter: (v: number) => `${(v / 100000000).toFixed(1)}억` } },
                  series: [{
                    name: '평균 연봉', type: 'bar', barWidth: '60%',
                    itemStyle: { borderRadius: [4, 4, 0, 0] },
                    data: careerAverageSalary.map(entry => {
                      const isCurrentExperience =
                        (experienceYears === '0' && entry.experience === '신입') ||
                        (experienceYears === '1' && entry.experience === '1-2년') ||
                        (experienceYears === '3' && entry.experience === '3-4년') ||
                        (experienceYears === '5' && entry.experience === '5-7년') ||
                        (experienceYears === '8' && entry.experience === '8-10년') ||
                        (experienceYears === '10' && entry.experience === '10년+');
                      return { value: entry.average, itemStyle: { color: isCurrentExperience ? '#10B981' : '#3B82F6' } };
                    })
                  }]
                }} style={{ height: '300px' }} />
                {result && (
                  <div className="mt-4 p-4 bg-surface border border-line rounded-xl">
                    <p className="text-sm text-body">
                      현재 연봉: {formatNumber(result.gross)}원 | 
                      선택한 경력: {
                        experienceYears === '0' ? '신입' :
                        experienceYears === '1' ? '1-2년' :
                        experienceYears === '3' ? '3-4년' :
                        experienceYears === '5' ? '5-7년' :
                        experienceYears === '8' ? '8-10년' : '10년+'
                      }
                    </p>
                  </div>
                )}
              </div>

              {/* 세금 구성 차트 */}
              <div className="bg-surface border border-line rounded-2xl p-8">
                <h3 className="text-xl font-semibold text-fg mb-6 flex items-center">
                  공제항목별 구성
                </h3>
                <div className="grid lg:grid-cols-2 gap-8">
                  <ReactECharts option={{
                    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
                    series: [{
                      type: 'pie',
                      radius: ['40%', '70%'],
                      avoidLabelOverlap: false,
                      label: { show: true, formatter: '{b}\n{d}%' },
                      data: getTaxCompositionData().map(d => ({ value: d.value, name: d.name, itemStyle: { color: d.color } }))
                    }]
                  }} style={{ height: '300px' }} />
                  
                  <div className="space-y-3">
                    {getTaxCompositionData().map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: item.color }}></div>
                          <span className="text-body">{item.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-fg">
                            {formatNumber(item.value)}원
                          </div>
                          <div className="text-xs text-gray-500">
                            {((item.value / result.deductions.total) * 100).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="pt-3 border-t border-line">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-fg">총 공제액</span>
                        <span className="font-bold text-red-600 dark:text-red-400">
                          {formatNumber(result.deductions.total)}원
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 상세 가이드 섹션 */}
      <div className={`mt-12 ui-card p-8`}>
        <h2 className="text-3xl font-bold mb-8 text-fg text-center">{t('guide.title')}</h2>
        <p className="text-lg text-sub text-center mb-12 max-w-4xl mx-auto break-keep whitespace-pre-line">
          {t('guide.subtitle')}
        </p>
        
        {/* 핵심 기능 소개 */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="bg-surface border border-line rounded-2xl p-8 transition-all">
            <div className="flex items-center mb-4">
              <div className="bg-soft p-3 rounded-full mr-3">
                <Calculator className="w-6 h-6 text-body" />
              </div>
              <h3 className="text-xl font-bold text-fg">{t('guide.features.accurate.title')}</h3>
            </div>
            <p className="text-sub mb-4 leading-relaxed">
              {t('guide.features.accurate.description')}
            </p>
            <div className="space-y-3">
              <div className="bg-surface border border-line p-3 rounded-xl">
                <h4 className="font-semibold text-fg mb-1">{t('guide.features.accurate.points.0.title')}</h4>
                <p className="text-sm text-sub">{t('guide.features.accurate.points.0.content')}</p>
              </div>
              <div className="bg-surface border border-line p-3 rounded-xl">
                <h4 className="font-semibold text-fg mb-1">{t('guide.features.accurate.points.1.title')}</h4>
                <p className="text-sm text-sub">{t('guide.features.accurate.points.1.content')}</p>
              </div>
              <div className="bg-surface border border-line p-3 rounded-xl">
                <h4 className="font-semibold text-fg mb-1">{t('guide.features.accurate.points.2.title')}</h4>
                <p className="text-sm text-sub">{t('guide.features.accurate.points.2.content')}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-surface border border-line rounded-2xl p-8 transition-all">
            <div className="flex items-center mb-4">
              <div className="bg-soft p-3 rounded-full mr-3">
                <TrendingUp className="w-6 h-6 text-body" />
              </div>
              <h3 className="text-xl font-bold text-fg">{t('guide.features.smart.title')}</h3>
            </div>
            <p className="text-sub mb-4 leading-relaxed">
              {t('guide.features.smart.description')}
            </p>
            <div className="space-y-3">
              {[0, 1, 2].map((index) => {
                return (
                  <div key={index} className="bg-surface border border-line p-3 rounded-xl">
                    <h4 className="font-semibold text-fg mb-1 flex items-center">
                      {t(`guide.features.smart.points.${index}.title`)}
                    </h4>
                    <p className="text-sm text-sub">{t(`guide.features.smart.points.${index}.content`)}</p>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="bg-surface border border-line rounded-2xl p-8 transition-all">
            <div className="flex items-center mb-4">
              <div className="bg-soft p-3 rounded-full mr-3">
                <DollarSign className="w-6 h-6 text-body" />
              </div>
              <h3 className="text-xl font-bold text-fg">{t('guide.features.practical.title')}</h3>
            </div>
            <p className="text-sub mb-4 leading-relaxed">
              {t('guide.features.practical.description')}
            </p>
            <div className="space-y-3">
              {[0, 1, 2].map((index) => {
                return (
                  <div key={index} className="bg-surface border border-line p-3 rounded-xl">
                    <h4 className="font-semibold text-fg mb-1 flex items-center">
                      {t(`guide.features.practical.points.${index}.title`)}
                    </h4>
                    <p className="text-sm text-sub">{t(`guide.features.practical.points.${index}.content`)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 4대보험 완전정복 */}
        <div className="bg-surface border border-line rounded-2xl p-8 mb-12">
          <h3 className="text-2xl font-bold text-fg mb-6 text-center">{t('insurance.title')}</h3>
          <p className="text-center text-sub mb-8">{t('insurance.description')}</p>
          
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="bg-surface border border-line p-6 rounded-2xl">
              <h4 className="text-xl font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center">
                
                {t('insurance.health.title')}
              </h4>
              <div className="space-y-4">
                <div className="border-l-4 border-blue-400 pl-4">
                  <h5 className="font-semibold text-blue-600">{t('insurance.health.healthInsurance.title')}</h5>
                  <p className="text-sm text-sub">{t('insurance.health.healthInsurance.description')}</p>
                  <div className="mt-2 text-xs text-blue-500 space-y-1">
                    {[0, 1, 2].map((index) => (
                      <p key={index}>• {t(`insurance.health.healthInsurance.details.${index}`)}</p>
                    ))}
                  </div>
                </div>
                <div className="border-l-4 border-green-400 pl-4">
                  <h5 className="font-semibold text-green-600">{t('insurance.health.longTermCare.title')}</h5>
                  <p className="text-sm text-sub">{t('insurance.health.longTermCare.description')}</p>
                  <div className="mt-2 text-xs text-green-500 space-y-1">
                    {[0, 1, 2].map((index) => (
                      <p key={index}>• {t(`insurance.health.longTermCare.details.${index}`)}</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-surface border border-line p-6 rounded-2xl">
              <h4 className="text-xl font-semibold text-purple-600 dark:text-purple-400 mb-4 flex items-center">
                
                {t('insurance.pension.title')}
              </h4>
              <div className="space-y-4">
                <div className="border-l-4 border-purple-400 pl-4">
                  <h5 className="font-semibold text-purple-600">{t('insurance.pension.nationalPension.title')}</h5>
                  <p className="text-sm text-sub">{t('insurance.pension.nationalPension.description')}</p>
                  <div className="mt-2 text-xs text-purple-500 space-y-1">
                    {[0, 1, 2].map((index) => (
                      <p key={index}>• {t(`insurance.pension.nationalPension.details.${index}`)}</p>
                    ))}
                  </div>
                </div>
                <div className="border-l-4 border-orange-400 pl-4">
                  <h5 className="font-semibold text-orange-600">{t('insurance.pension.employment.title')}</h5>
                  <p className="text-sm text-sub">{t('insurance.pension.employment.description')}</p>
                  <div className="mt-2 text-xs text-orange-500 space-y-1">
                    {[0, 1, 2].map((index) => (
                      <p key={index}>• {t(`insurance.pension.employment.details.${index}`)}</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 소득세 누진세율 상세 설명 */}
        <div className="rounded-2xl p-2 mb-12">
          <h3 className="text-2xl font-bold text-fg mb-6 text-center">{t('taxBracket.title')}</h3>
          <p className="text-center text-sub mb-8">{t('taxBracket.description')}</p>
          
          <div className="overflow-x-auto bg-surface border border-line rounded-xl">
            <table className="w-full">
              <thead className="border-b border-line">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-fg">{t('taxBracket.headers.bracket')}</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-fg">{t('taxBracket.headers.rate')}</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-fg">{t('taxBracket.headers.deduction')}</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-fg">{t('taxBracket.headers.salaryRange')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/20 dark:divide-white/[0.06]">
                <tr className="hover:bg-soft transition-colors">
                  <td className="px-6 py-4 text-sm text-fg">1,400만원 이하</td>
                  <td className="px-6 py-4 text-center text-sm font-bold text-green-600">6%</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-500">-</td>
                  <td className="px-6 py-4 text-sm text-sub">~3,000만원</td>
                </tr>
                <tr className="hover:bg-soft transition-colors">
                  <td className="px-6 py-4 text-sm text-fg">1,400~5,000만원</td>
                  <td className="px-6 py-4 text-center text-sm font-bold text-blue-600">15%</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-500">126만원</td>
                  <td className="px-6 py-4 text-sm text-sub">3,000~7,000만원</td>
                </tr>
                <tr className="hover:bg-soft transition-colors">
                  <td className="px-6 py-4 text-sm text-fg">5,000~8,800만원</td>
                  <td className="px-6 py-4 text-center text-sm font-bold text-purple-600">24%</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-500">576만원</td>
                  <td className="px-6 py-4 text-sm text-sub">7,000~1억원</td>
                </tr>
                <tr className="hover:bg-soft transition-colors">
                  <td className="px-6 py-4 text-sm text-fg">8,800만원~1.5억원</td>
                  <td className="px-6 py-4 text-center text-sm font-bold text-orange-600">35%</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-500">1,544만원</td>
                  <td className="px-6 py-4 text-sm text-sub">1억~2억원</td>
                </tr>
                <tr className="hover:bg-soft transition-colors">
                  <td className="px-6 py-4 text-sm text-fg">1.5억~3억원</td>
                  <td className="px-6 py-4 text-center text-sm font-bold text-red-600">38%</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-500">1,994만원</td>
                  <td className="px-6 py-4 text-sm text-sub">2억~4억원</td>
                </tr>
                <tr className="hover:bg-soft transition-colors">
                  <td className="px-6 py-4 text-sm text-fg">3억원 초과</td>
                  <td className="px-6 py-4 text-center text-sm font-bold text-red-700">40%+</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-500">다양</td>
                  <td className="px-6 py-4 text-sm text-sub">4억원 이상</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div className="mt-6 p-4 bg-surface border border-line rounded-2xl">
            <h5 className="font-semibold text-body mb-3">{t('taxBracket.understanding.title')}</h5>
            <div className="mb-3 pb-3 border-b border-line">
              <h6 className="font-semibold text-body mb-1">{t('taxBracket.understanding.keyPoint.title')}</h6>
              <p className="text-sm text-sub">{t('taxBracket.understanding.keyPoint.description')}</p>
            </div>
            <div>
              <h6 className="font-semibold text-body mb-2">{t('taxBracket.understanding.example.title')}</h6>
              <div className="text-sm text-sub space-y-1">
                {[0, 1, 2, 3].map((index) => (
                  <p key={index}>• {t(`taxBracket.understanding.example.details.${index}`)}</p>
                ))}
              </div>
              <p className="text-xs text-muted mt-2 italic">{t('taxBracket.understanding.note')}</p>
            </div>
          </div>
        </div>

        {/* 절세 전략 가이드 */}
        <div className="rounded-2xl p-2 mb-12">
          <h3 className="text-2xl font-bold text-fg mb-6 text-center">{t('taxStrategy.title')}</h3>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="bg-surface border border-line p-6 rounded-2xl">
              <div className="text-center mb-4">
                <div className="bg-soft p-3 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-3">
                  
                </div>
                <h4 className="text-xl font-bold text-fg">{t('taxStrategy.incomeDeduction.title')}</h4>
              </div>
              <div className="space-y-3">
                <div className="border-l-4 border-green-400 pl-4">
                  <h5 className="font-semibold text-green-600">{t('taxStrategy.incomeDeduction.creditCard.title')}</h5>
                  <p className="text-sm text-sub">{t('taxStrategy.incomeDeduction.creditCard.description')}</p>
                </div>
                <div className="border-l-4 border-green-400 pl-4">
                  <h5 className="font-semibold text-green-600">{t('taxStrategy.incomeDeduction.housing.title')}</h5>
                  <p className="text-sm text-sub">{t('taxStrategy.incomeDeduction.housing.description')}</p>
                </div>
                <div className="border-l-4 border-green-400 pl-4">
                  <h5 className="font-semibold text-green-600">{t('taxStrategy.incomeDeduction.childcare.title')}</h5>
                  <p className="text-sm text-sub">{t('taxStrategy.incomeDeduction.childcare.description')}</p>
                </div>
              </div>
            </div>

            <div className="bg-surface border border-line p-6 rounded-2xl">
              <div className="text-center mb-4">
                <div className="bg-soft p-3 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-3">
                  
                </div>
                <h4 className="text-xl font-bold text-fg">{t('taxStrategy.taxCredit.title')}</h4>
              </div>
              <div className="space-y-3">
                <div className="border-l-4 border-blue-400 pl-4">
                  <h5 className="font-semibold text-blue-600">{t('taxStrategy.taxCredit.medical.title')}</h5>
                  <p className="text-sm text-sub">{t('taxStrategy.taxCredit.medical.description')}</p>
                </div>
                <div className="border-l-4 border-blue-400 pl-4">
                  <h5 className="font-semibold text-blue-600">{t('taxStrategy.taxCredit.education.title')}</h5>
                  <p className="text-sm text-sub">{t('taxStrategy.taxCredit.education.description')}</p>
                </div>
                <div className="border-l-4 border-blue-400 pl-4">
                  <h5 className="font-semibold text-blue-600">{t('taxStrategy.taxCredit.donation.title')}</h5>
                  <p className="text-sm text-sub">{t('taxStrategy.taxCredit.donation.description')}</p>
                </div>
              </div>
            </div>

            <div className="bg-surface border border-line p-6 rounded-2xl">
              <div className="text-center mb-4">
                <div className="bg-soft p-3 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-3">
                  
                </div>
                <h4 className="text-xl font-bold text-fg">{t('taxStrategy.pension.title')}</h4>
              </div>
              <div className="space-y-3">
                <div className="border-l-4 border-purple-400 pl-4">
                  <h5 className="font-semibold text-purple-600">{t('taxStrategy.pension.pensionFund.title')}</h5>
                  <p className="text-sm text-sub">{t('taxStrategy.pension.pensionFund.description')}</p>
                </div>
                <div className="border-l-4 border-purple-400 pl-4">
                  <h5 className="font-semibold text-purple-600">{t('taxStrategy.pension.irp.title')}</h5>
                  <p className="text-sm text-sub">{t('taxStrategy.pension.irp.description')}</p>
                </div>
                <div className="border-l-4 border-purple-400 pl-4">
                  <h5 className="font-semibold text-purple-600">{t('taxStrategy.pension.isa.title')}</h5>
                  <p className="text-sm text-sub">{t('taxStrategy.pension.isa.description')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 연말정산 준비 가이드 */}
        <div className="rounded-2xl p-2">
          <h3 className="text-2xl font-bold text-fg mb-6 text-center">{t('yearEndTax.title')}</h3>
          <div className="grid lg:grid-cols-2 gap-8">
            <div>
              <h4 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-4 flex items-center">
                
                {t('yearEndTax.schedule.title')}
              </h4>
              <div className="space-y-4">
                <div className="border-b border-line pb-4">
                  <h5 className="font-semibold text-indigo-600 mb-2">{t('yearEndTax.schedule.timeline.title')}</h5>
                  <div className="text-sm text-sub space-y-1">
                    {[0, 1, 2, 3].map((index) => (
                      <p key={index}>• {t(`yearEndTax.schedule.timeline.details.${index}`)}</p>
                    ))}
                  </div>
                </div>
                <div className="border-b border-line pb-4">
                  <h5 className="font-semibold text-indigo-600 mb-2">{t('yearEndTax.schedule.documents.title')}</h5>
                  <div className="text-sm text-sub space-y-1">
                    {[0, 1, 2, 3].map((index) => (
                      <p key={index}>• {t(`yearEndTax.schedule.documents.details.${index}`)}</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-purple-600 dark:text-purple-400 mb-4 flex items-center">
                
                {t('yearEndTax.tips.title')}
              </h4>
              <div className="space-y-4">
                <div className="border-b border-line pb-4">
                  <h5 className="font-semibold text-purple-600 mb-2">{t('yearEndTax.tips.receiptManagement.title')}</h5>
                  <div className="text-sm text-sub space-y-1">
                    {[0, 1, 2, 3].map((index) => (
                      <p key={index}>• {t(`yearEndTax.tips.receiptManagement.details.${index}`)}</p>
                    ))}
                  </div>
                </div>
                <div className="border-b border-line pb-4">
                  <h5 className="font-semibold text-purple-600 mb-2">{t('yearEndTax.tips.taxSavingProducts.title')}</h5>
                  <div className="text-sm text-sub space-y-1">
                    {[0, 1, 2, 3].map((index) => (
                      <p key={index}>• {t(`yearEndTax.tips.taxSavingProducts.details.${index}`)}</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SalaryCalculator = () => {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div></div>}>
      <SalaryCalculatorContent />
    </Suspense>
  );
};

export default SalaryCalculator;
