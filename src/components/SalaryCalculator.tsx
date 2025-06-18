'use client'

import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Calculator } from 'lucide-react';

const SalaryCalculator = () => {
  const [annualSalary, setAnnualSalary] = useState('');
  const [result, setResult] = useState(null);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/,/g, '');
    if (/^\d*$/.test(value)) {
      setAnnualSalary(formatNumber(value));
    }
  };

  useEffect(() => {
    if (annualSalary) {
      handleCalculate();
    } else {
      setResult(null);
    }
  }, [annualSalary, handleCalculate]);

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

      {/* AdSense 광고 영역 */}
      <div className="mt-8 flex justify-center">
        <div className="w-full max-w-2xl bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">광고</p>
          {/* 여기에 AdSense 컴포넌트가 들어갈 예정 */}
          <div className="h-32 bg-gray-200 dark:bg-gray-600 rounded flex items-center justify-center">
            <span className="text-gray-400 dark:text-gray-500">AdSense 광고 영역</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalaryCalculator;