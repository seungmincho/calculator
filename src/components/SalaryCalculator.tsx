'use client'

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DollarSign, TrendingUp, Calculator, Share2, Check, Table } from 'lucide-react';

const SalaryCalculatorContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [annualSalary, setAnnualSalary] = useState('');
  const [result, setResult] = useState<ReturnType<typeof calculateNetSalary>>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [showTable, setShowTable] = useState(false);

  // 실수령액 계산 함수 (간소화된 버전)
  const calculateNetSalary = (grossAnnual: string) => {
    const gross = parseInt(grossAnnual.replace(/,/g, ''));
    if (!gross || gross <= 0) return null;

    // 4대보험료 계산 (2024년 기준)
    const healthInsurance = Math.floor(gross * 0.03545); // 건강보험
    const longTermCare = Math.floor(healthInsurance * 0.1227); // 장기요양보험
    const nationalPension = Math.floor(Math.min(gross, 63600000) * 0.045); // 국민연금
    const employmentInsurance = Math.floor(gross * 0.009); // 고용보험

    // 소득세 계산 (간소화)
    let incomeTax = 0;
    const taxableIncome = gross - nationalPension;
    
    if (taxableIncome <= 14000000) {
      incomeTax = Math.floor(taxableIncome * 0.06);
    } else if (taxableIncome <= 50000000) {
      incomeTax = Math.floor(840000 + (taxableIncome - 14000000) * 0.15);
    } else if (taxableIncome <= 88000000) {
      incomeTax = Math.floor(6240000 + (taxableIncome - 50000000) * 0.24);
    } else {
      incomeTax = Math.floor(15360000 + (taxableIncome - 88000000) * 0.35);
    }

    const localIncomeTax = Math.floor(incomeTax * 0.1); // 지방소득세

    const totalDeductions = healthInsurance + longTermCare + nationalPension + employmentInsurance + incomeTax + localIncomeTax;
    const netAnnual = gross - totalDeductions;
    const netMonthly = Math.floor(netAnnual / 12);

    return {
      gross,
      netAnnual,
      netMonthly,
      deductions: {
        healthInsurance,
        longTermCare,
        nationalPension,
        employmentInsurance,
        incomeTax,
        localIncomeTax,
        total: totalDeductions
      }
    };
  };

  const handleCalculate = React.useCallback(() => {
    const calculation = calculateNetSalary(annualSalary);
    setResult(calculation);
  }, [annualSalary]);

  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/,/g, '');
    if (/^\d*$/.test(value)) {
      const formattedValue = formatNumber(Number(value));
      setAnnualSalary(formattedValue);
      
      // URL 업데이트
      const params = new URLSearchParams(searchParams);
      if (value) {
        params.set('salary', value);
      } else {
        params.delete('salary');
      }
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  };

  // URL에서 초기값 로드
  useEffect(() => {
    const salaryParam = searchParams.get('salary');
    if (salaryParam && /^\d+$/.test(salaryParam)) {
      setAnnualSalary(formatNumber(Number(salaryParam)));
    }
  }, [searchParams]);

  useEffect(() => {
    if (annualSalary) {
      handleCalculate();
    } else {
      setResult(null);
    }
  }, [annualSalary, handleCalculate]);

  // 연봉별 표 데이터 생성
  const generateSalaryTable = () => {
    const tableData = [];
    for (let salary = 20000000; salary <= 200000000; salary += 1000000) {
      const calculation = calculateNetSalary(salary.toString());
      if (calculation) {
        tableData.push({
          grossAnnual: salary,
          netAnnual: calculation.netAnnual,
          netMonthly: calculation.netMonthly,
          totalDeductions: calculation.deductions.total
        });
      }
    }
    return tableData;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
          <DollarSign className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">연봉 실수령액 계산기</h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          연봉을 입력하시면 4대보험, 소득세, 지방소득세를 제외한 실제 받을 수 있는 금액을 계산해드립니다.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">연봉 입력</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                연봉 (세전)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={annualSalary}
                  onChange={handleInputChange}
                  placeholder="50,000,000"
                  className="w-full px-4 py-4 text-lg font-semibold text-gray-900 dark:text-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
                <span className="absolute right-4 top-4 text-gray-600 font-medium">원</span>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 dark:text-blue-200 mb-2">💡 참고사항</h3>
              <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                <li>• 2024년 기준 세율 적용</li>
                <li>• 4대보험료 자동 계산</li>
                <li>• 간이세액표 기준 (부양가족 1명)</li>
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
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-blue-100">월 실수령액</span>
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div className="text-3xl font-bold mb-2 text-white">
                  {formatNumber(result.netMonthly)}원
                </div>
                <div className="text-blue-100 text-lg font-medium">
                  연 {formatNumber(result.netAnnual)}원
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
              </div>

              {/* Deduction Breakdown */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">공제 내역</h3>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">국민연금</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatNumber(result.deductions.nationalPension)}원</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">건강보험</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatNumber(result.deductions.healthInsurance)}원</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">장기요양보험</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatNumber(result.deductions.longTermCare)}원</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">고용보험</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatNumber(result.deductions.employmentInsurance)}원</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">소득세</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatNumber(result.deductions.incomeTax)}원</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">지방소득세</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatNumber(result.deductions.localIncomeTax)}원</span>
                  </div>
                  <div className="flex justify-between py-3 border-t-2 border-gray-200 dark:border-gray-600 font-bold">
                    <span className="text-gray-900 dark:text-white">총 공제액</span>
                    <span className="text-red-600 dark:text-red-400 font-bold">{formatNumber(result.deductions.total)}원</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-gray-500">
              <Calculator className="w-16 h-16 mb-4" />
              <p>연봉을 입력하시면 계산 결과가 나타납니다</p>
            </div>
          )}
        </div>
      </div>

      {/* Tips Section */}
      <div className="mt-12 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
        <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">💡 오늘의 팁</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-6">
            <h3 className="font-semibold text-green-900 dark:text-green-200 mb-2">연말정산 준비</h3>
            <p className="text-green-800 dark:text-green-300 text-sm">
              의료비, 교육비, 기부금 영수증을 미리 모아두시면 연말정산에서 더 많은 세액공제를 받을 수 있습니다.
            </p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/30 rounded-lg p-6">
            <h3 className="font-semibold text-amber-900 dark:text-amber-200 mb-2">절세 방법</h3>
            <p className="text-amber-800 dark:text-amber-300 text-sm">
              IRP, 연금저축 등의 세액공제 혜택을 활용하면 실수령액을 늘릴 수 있습니다.
            </p>
          </div>
        </div>
      </div>

      {/* 연봉별 실수령액 표 섹션 */}
      <div className="mt-12 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">연봉별 실수령액 표</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">2천만원부터 2억원까지 100만원 단위</p>
          </div>
          <button
            onClick={() => setShowTable(!showTable)}
            className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white transition-colors"
          >
            <Table className="w-4 h-4" />
            <span>{showTable ? '표 숨기기' : '표 보기'}</span>
          </button>
        </div>

        {showTable && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">연봉</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">실수령액(연)</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">실수령액(월)</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">총 공제액</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">실수령 비율</th>
                </tr>
              </thead>
              <tbody>
                {generateSalaryTable().map((row, index) => (
                  <tr key={row.grossAnnual} className={`border-b border-gray-100 dark:border-gray-700 ${index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-900'} hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors`}>
                    <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">
                      {formatNumber(row.grossAnnual)}원
                    </td>
                    <td className="py-3 px-4 text-right text-gray-900 dark:text-white">
                      {formatNumber(row.netAnnual)}원
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-blue-600 dark:text-blue-400">
                      {formatNumber(row.netMonthly)}원
                    </td>
                    <td className="py-3 px-4 text-right text-red-600 dark:text-red-400">
                      {formatNumber(row.totalDeductions)}원
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-gray-900 dark:text-white">
                      {((row.netAnnual / row.grossAnnual) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showTable && (
          <div className="mt-6 bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
              <Calculator className="w-4 h-4 inline mr-1" />
              표 사용법
            </h3>
            <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
              <li>• 2천만원부터 2억원까지 100만원 단위로 계산됩니다</li>
              <li>• 실수령 비율이 높을수록 세금 부담이 적습니다</li>
              <li>• 고소득일수록 누진세율로 인해 실수령 비율이 감소합니다</li>
              <li>• 실제 연말정산시 추가 공제로 실수령액이 더 늘어날 수 있습니다</li>
            </ul>
          </div>
        )}
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