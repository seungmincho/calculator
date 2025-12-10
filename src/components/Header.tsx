'use client'

import React, { useState, useEffect, useRef } from 'react';
import { Calculator, Menu, X, ChevronDown } from 'lucide-react';
import LanguageToggle from './LanguageToggle';
import ThemeToggle from './ThemeToggle';
import { useTranslations } from 'next-intl';
import { menuConfig, categoryKeys } from '@/config/menuConfig';

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const t = useTranslations();

  // menuConfig에서 번역된 메뉴 아이템 생성
  const getMenuItems = () => {
    return {
      calculators: {
        title: t(menuConfig.calculators.titleKey),
        items: menuConfig.calculators.items.map(item => ({
          href: item.href,
          label: t(item.labelKey),
          icon: item.icon,
        })),
      },
      tools: {
        title: t(menuConfig.tools.titleKey),
        items: menuConfig.tools.items.map(item => ({
          href: item.href,
          label: t(item.labelKey),
          icon: item.icon,
        })),
      },
      health: {
        title: t(menuConfig.health.titleKey),
        items: menuConfig.health.items.map(item => ({
          href: item.href,
          label: t(item.labelKey),
          icon: item.icon,
        })),
      },
      games: {
        title: t(menuConfig.games.titleKey),
        items: menuConfig.games.items.map(item => ({
          href: item.href,
          label: t(item.labelKey),
          icon: item.icon,
        })),
      },
    };
  };

  const menuItems = getMenuItems();

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

  // 카테고리별 아이콘
  const categoryIcons: Record<string, string> = {
    calculators: '💰',
    tools: '🛠️',
    health: '❤️',
    games: '🎮',
  };

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
            {categoryKeys.map((key) => (
              <div key={key} className="relative">
                <button
                  onClick={() => handleDropdownToggle(key)}
                  className="flex items-center space-x-1 px-3 py-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <span>{menuItems[key].title}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === key ? 'rotate-180' : ''}`} />
                </button>

                {openDropdown === key && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-[480px] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-3 z-50">
                    <div className="grid grid-cols-3 gap-2">
                      {menuItems[key].items.map((item) => (
                        <a
                          key={item.href}
                          href={item.href}
                          onClick={closeDropdown}
                          className="flex flex-col items-center text-center p-3 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-600 transition-colors"
                        >
                          <span className="text-2xl mb-1">{item.icon}</span>
                          <span className="text-xs font-medium leading-tight">{item.label}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* 금융 팁 */}
            <a
              href="/tips"
              className="px-3 py-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {t('navigation.financialTips')}
            </a>

            {/* 테마 전환 */}
            <ThemeToggle />

            {/* 언어 전환 */}
            <LanguageToggle />
          </nav>

          {/* Mobile: Theme + Language Toggle + Menu Button */}
          <div className="lg:hidden flex items-center space-x-2">
            <ThemeToggle />
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
              {categoryKeys.map((key) => (
                <div key={key}>
                  <h3 className="px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                    {categoryIcons[key]} {menuItems[key].title}
                  </h3>
                  <div className="space-y-1">
                    {menuItems[key].items.map((item) => (
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
              ))}

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
