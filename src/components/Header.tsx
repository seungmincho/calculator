'use client'

import React, { useState } from 'react';
import { Calculator, Menu, X } from 'lucide-react';

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2">
            <Calculator className="w-8 h-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900 dark:text-white">툴허브</span>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-6">
            <a href="/" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors">연봉 계산기</a>
            <a href="/loan-calculator" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors">대출 계산기</a>
            <a href="/savings-calculator" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors">적금 계산기</a>
            <a href="/retirement-calculator" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors">퇴직금 계산기</a>
            <a href="/tax-calculator" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors">세금 계산기</a>
            <a href="/exchange-calculator" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors">환율 계산기</a>
            <a href="/real-estate-calculator" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors">부동산 계산기</a>
            <a href="/json-formatter" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors">JSON 포맷터</a>
            <a href="/sql-formatter" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors">SQL 포맷터</a>
            <a href="/markdown-viewer" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors">마크다운 뷰어</a>
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200 dark:border-gray-700">
            <nav className="flex flex-col space-y-3">
              <a 
                href="/" 
                className="text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors px-2 py-1"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                연봉 계산기
              </a>
              <a 
                href="/loan-calculator" 
                className="text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors px-2 py-1"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                대출 계산기
              </a>
              <a 
                href="/savings-calculator" 
                className="text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors px-2 py-1"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                적금 계산기
              </a>
              <a 
                href="/retirement-calculator" 
                className="text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors px-2 py-1"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                퇴직금 계산기
              </a>
              <a 
                href="/tax-calculator" 
                className="text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors px-2 py-1"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                세금 계산기
              </a>
              <a 
                href="/exchange-calculator" 
                className="text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors px-2 py-1"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                환율 계산기
              </a>
              <a 
                href="/real-estate-calculator" 
                className="text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors px-2 py-1"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                부동산 계산기
              </a>
              <a 
                href="/json-formatter" 
                className="text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors px-2 py-1"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                JSON 포맷터
              </a>
              <a 
                href="/sql-formatter" 
                className="text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors px-2 py-1"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                SQL 포맷터
              </a>
              <a 
                href="/markdown-viewer" 
                className="text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors px-2 py-1"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                마크다운 뷰어
              </a>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;