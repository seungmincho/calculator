'use client'

import React, { useState, useEffect, useRef } from 'react';
import { Calculator, Menu, X, ChevronDown } from 'lucide-react';
import LanguageToggle from './LanguageToggle';
import { useTranslations } from 'next-intl';

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const t = useTranslations();

  const menuItems = {
    calculators: {
      title: t('navigation.financialCalculators'),
      items: [
        { href: '/', label: t('footer.links.salaryCalculator'), icon: '💰' },
        { href: '/loan-calculator', label: t('footer.links.loanCalculator'), icon: '🏦' },
        { href: '/savings-calculator', label: t('footer.links.savingsCalculator'), icon: '📈' },
        { href: '/stock-calculator', label: t('footer.links.stockCalculator'), icon: '📊' },
        { href: '/retirement-calculator', label: t('footer.links.retirementCalculator'), icon: '👴' },
        { href: '/tax-calculator', label: t('footer.links.taxCalculator'), icon: '📋' },
        { href: '/exchange-calculator', label: t('footer.links.exchangeCalculator'), icon: '💱' },
        { href: '/real-estate-calculator', label: t('footer.links.realEstateCalculator'), icon: '🏠' },
        { href: '/car-loan-calculator', label: t('footer.links.carLoanCalculator'), icon: '🚗' },
        { href: '/car-tax-calculator', label: t('footer.links.carTaxCalculator'), icon: '🚘' },
        { href: '/fuel-calculator', label: t('footer.links.fuelCalculator'), icon: '⛽' },
      ]
    },
    tools: {
      title: t('navigation.developmentTools'),
      items: [
        { href: '/regex-extractor', label: t('footer.links.regexExtractor'), icon: '🔍' },
        { href: '/time-converter', label: t('footer.links.timeConverter'), icon: '🕰️' },
        { href: '/json-formatter', label: t('footer.links.jsonFormatter'), icon: '📝' },
        { href: '/json-xml-converter', label: t('footer.links.jsonXmlConverter'), icon: '🔄' },
        { href: '/json-csv-converter', label: t('footer.links.jsonCsvConverter'), icon: '🔄' },
        { href: '/jwt-decoder', label: t('footer.links.jwtDecoder'), icon: '🔐' },
        { href: '/uuid-generator', label: t('footer.links.uuidGenerator'), icon: '🆔' },
        { href: '/cron-tester', label: t('footer.links.cronTester'), icon: '⏰' },
        { href: '/qr-generator', label: t('footer.links.qrGenerator'), icon: '📱' },
        { href: '/barcode-generator', label: t('footer.links.barcodeGenerator'), icon: '📊' },
        { href: '/sql-formatter', label: t('footer.links.sqlFormatter'), icon: '🗄️' },
        { href: '/markdown-viewer', label: t('footer.links.markdownViewer'), icon: '📖' },
        { href: '/image-resizer', label: t('footer.links.imageResizer'), icon: '🖼️' },
        { href: '/image-editor', label: t('footer.links.imageEditor'), icon: '🎨' }
      ]
    },
    health: {
      title: t('navigation.healthTools'),
      items: [
        { href: '/bmi-calculator', label: t('footer.links.bmiCalculator'), icon: '❤️' },
        { href: '/calorie-calculator', label: t('footer.links.calorieCalculator'), icon: '🍎' },
        { href: '/body-fat-calculator', label: t('footer.links.bodyFatCalculator'), icon: '💪' },
        { href: '/work-hours-calculator', label: t('footer.links.workHoursCalculator'), icon: '⏰' }
      ]
    },
    games: {
      title: t('navigation.simpleGames'),
      items: [
        { href: '/lotto-generator', label: t('footer.links.lottoGenerator'), icon: '🎲' },
        { href: '/ladder-game', label: t('footer.links.ladderGame'), icon: '🪜' }
      ]
    }
  };

  const handleDropdownToggle = (dropdown: string) => {
    setOpenDropdown(openDropdown === dropdown ? null : dropdown);
  };

  const closeDropdown = () => {
    setOpenDropdown(null);
  };

  // 모바일 메뉴 열릴 때 배경 스크롤 방지
  useEffect(() => {
    if (isMobileMenuOpen) {
      // 메뉴 열릴 때: body 스크롤 막기
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${window.scrollY}px`;
      document.body.style.width = '100%';
    } else {
      // 메뉴 닫힐 때: body 스크롤 복원
      const scrollY = document.body.style.top;
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }

    return () => {
      // 컴포넌트 언마운트 시 스크롤 복원
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
    };
  }, [isMobileMenuOpen]);

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
            <span className="text-xl font-bold text-gray-900 dark:text-white">{t('header.title')}</span>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1">
            {/* 금융 계산기 드롭다운 */}
            <div className="relative">
              <button
                onClick={() => handleDropdownToggle('calculators')}
                className="flex items-center space-x-1 px-3 py-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <span>{menuItems.calculators.title}</span>
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
                <span>{menuItems.tools.title}</span>
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

            {/* 건강 도구 드롭다운 */}
            <div className="relative">
              <button
                onClick={() => handleDropdownToggle('health')}
                className="flex items-center space-x-1 px-3 py-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <span>{menuItems.health.title}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === 'health' ? 'rotate-180' : ''}`} />
              </button>
              
              {openDropdown === 'health' && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                  {menuItems.health.items.map((item) => (
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

            {/* 간단 게임 드롭다운 */}
            <div className="relative">
              <button
                onClick={() => handleDropdownToggle('games')}
                className="flex items-center space-x-1 px-3 py-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <span>{menuItems.games.title}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === 'games' ? 'rotate-180' : ''}`} />
              </button>
              
              {openDropdown === 'games' && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                  {menuItems.games.items.map((item) => (
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
              {t('navigation.financialTips')}
            </a>
            
            {/* 언어 전환 */}
            <LanguageToggle />
          </nav>

          {/* Mobile: Language Toggle + Menu Button */}
          <div className="lg:hidden flex items-center space-x-2">
            <LanguageToggle />
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-gray-200 dark:border-gray-700 max-h-screen overflow-y-auto">
            <nav className="space-y-4">
              {/* 금융 계산기 섹션 */}
              <div>
                <h3 className="px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                  💰 {menuItems.calculators.title}
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
                  🛠️ {menuItems.tools.title}
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

              {/* 건강 도구 섹션 */}
              <div>
                <h3 className="px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                  ❤️ {menuItems.health.title}
                </h3>
                <div className="space-y-1">
                  {menuItems.health.items.map((item) => (
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

              {/* 간단 게임 섹션 */}
              <div>
                <h3 className="px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                  🎮 {menuItems.games.title}
                </h3>
                <div className="space-y-1">
                  {menuItems.games.items.map((item) => (
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
                  <span>{t('navigation.financialTips')}</span>
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