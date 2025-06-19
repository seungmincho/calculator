'use client'

import React, { useState, useEffect, useRef } from 'react';
import { Calculator, Menu, X, ChevronDown } from 'lucide-react';

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  const menuItems = {
    calculators: {
      title: '금융 계산기',
      items: [
        { href: '/', label: '연봉 계산기', icon: '💰' },
        { href: '/loan-calculator', label: '대출 계산기', icon: '🏦' },
        { href: '/savings-calculator', label: '적금 계산기', icon: '📈' },
        { href: '/retirement-calculator', label: '퇴직금 계산기', icon: '👴' },
        { href: '/tax-calculator', label: '세금 계산기', icon: '📋' },
        { href: '/exchange-calculator', label: '환율 계산기', icon: '💱' },
        { href: '/real-estate-calculator', label: '부동산 계산기', icon: '🏠' }
      ]
    },
    tools: {
      title: '개발 도구',
      items: [
        { href: '/json-formatter', label: 'JSON 포맷터', icon: '📝' },
        { href: '/sql-formatter', label: 'SQL 포맷터', icon: '🗄️' },
        { href: '/markdown-viewer', label: '마크다운 뷰어', icon: '📖' },
        { href: '/image-resizer', label: '이미지 리사이저', icon: '🖼️' },
        { href: '/image-editor', label: '이미지 편집기', icon: '🎨' }
      ]
    }
  };

  const handleDropdownToggle = (dropdown: string) => {
    setOpenDropdown(openDropdown === dropdown ? null : dropdown);
  };

  const closeDropdown = () => {
    setOpenDropdown(null);
  };

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header ref={headerRef} className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2">
            <Calculator className="w-8 h-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900 dark:text-white">툴허브</span>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1">
            {/* 금융 계산기 드롭다운 */}
            <div className="relative">
              <button
                onClick={() => handleDropdownToggle('calculators')}
                className="flex items-center space-x-1 px-3 py-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <span>금융 계산기</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === 'calculators' ? 'rotate-180' : ''}`} />
              </button>
              
              {openDropdown === 'calculators' && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                  {menuItems.calculators.items.map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      onClick={closeDropdown}
                      className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 transition-colors"
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span>{item.label}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* 개발 도구 드롭다운 */}
            <div className="relative">
              <button
                onClick={() => handleDropdownToggle('tools')}
                className="flex items-center space-x-1 px-3 py-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <span>개발 도구</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === 'tools' ? 'rotate-180' : ''}`} />
              </button>
              
              {openDropdown === 'tools' && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                  {menuItems.tools.items.map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      onClick={closeDropdown}
                      className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 transition-colors"
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span>{item.label}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* 금융 팁 */}
            <a 
              href="/tips" 
              className="px-3 py-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              💡 금융 팁
            </a>
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
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
          <div className="lg:hidden py-4 border-t border-gray-200 dark:border-gray-700">
            <nav className="space-y-4">
              {/* 금융 계산기 섹션 */}
              <div>
                <h3 className="px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                  💰 금융 계산기
                </h3>
                <div className="space-y-1">
                  {menuItems.calculators.items.map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center space-x-3 px-6 py-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span>{item.label}</span>
                    </a>
                  ))}
                </div>
              </div>

              {/* 개발 도구 섹션 */}
              <div>
                <h3 className="px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                  🛠️ 개발 도구
                </h3>
                <div className="space-y-1">
                  {menuItems.tools.items.map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center space-x-3 px-6 py-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span>{item.label}</span>
                    </a>
                  ))}
                </div>
              </div>

              {/* 금융 팁 */}
              <div>
                <a
                  href="/tips"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center space-x-3 px-3 py-3 text-gray-600 dark:text-gray-300 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg mx-3 transition-colors font-medium"
                >
                  <span className="text-lg">💡</span>
                  <span>금융 팁</span>
                </a>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;