'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { Calculator, Menu, X, ChevronDown, Clock, Grid3X3, Search } from 'lucide-react';
import LanguageToggle from './LanguageToggle';
import ThemeToggle from './ThemeToggle';
import SearchDialog from './SearchDialog';
import { useTranslations } from 'next-intl';
import { menuConfig, categoryKeys, CategoryKey } from '@/config/menuConfig';
import { getRecentToolsByCategory, recordToolUsage } from '@/utils/recentTools';

const MAX_RECENT_DISPLAY = 4; // 최근 사용 표시 최대 개수

// 카테고리별 기본 추천 항목 인덱스 (최근 사용이 없을 때)
const DEFAULT_INDICES: Record<string, number[]> = {
  calculators: [0, 1, 2, 3],
  tools: [0, 1, 2, 3],
  media: [0, 1, 2, 3],
  health: [0, 1, 2, 3],
  games: [0, 1, 2, 3],
};

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [recentTools, setRecentTools] = useState<Record<string, string[]>>({});
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [expandedMobileCategory, setExpandedMobileCategory] = useState<string | null>(null);
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');
  const headerRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);
  const t = useTranslations();

  // 최근 사용 도구 로드 (클라이언트에서만)
  useEffect(() => {
    const loadRecentTools = () => {
      const recent: Record<string, string[]> = {};
      categoryKeys.forEach(key => {
        recent[key] = getRecentToolsByCategory(key);
      });
      setRecentTools(recent);
    };
    loadRecentTools();
  }, []);

  // menuConfig에서 번역된 메뉴 아이템 생성 (카테고리 자동 반영, 메모이즈)
  const menuItems = useMemo(() => {
    const result: Record<string, { title: string; items: { href: string; label: string; icon: string }[] }> = {};
    for (const key of categoryKeys) {
      result[key] = {
        title: t(menuConfig[key].titleKey),
        items: menuConfig[key].items.map(item => ({
          href: item.href,
          label: t(item.labelKey),
          icon: item.icon,
        })),
      };
    }
    return result;
  }, [t]);

  const handleDropdownToggle = (dropdown: string) => {
    setOpenDropdown(openDropdown === dropdown ? null : dropdown);
  };

  const closeDropdown = () => {
    setOpenDropdown(null);
  };

  // 도구 클릭 핸들러 (사용 기록 저장)
  const handleToolClick = (category: string, href: string) => {
    recordToolUsage(category, href);
    // 상태 업데이트
    setRecentTools(prev => ({
      ...prev,
      [category]: [href, ...(prev[category] || []).filter(h => h !== href)].slice(0, MAX_RECENT_DISPLAY)
    }));
    closeDropdown();
  };

  // 최근 사용 또는 기본 추천 항목 가져오기
  const getRecentOrDefaultItems = (key: CategoryKey) => {
    const recentHrefs = recentTools[key] || [];
    const items = menuItems[key].items;

    if (recentHrefs.length > 0) {
      // 최근 사용 항목이 있으면 href로 매칭
      const recentItems = recentHrefs
        .map(href => items.find(item => item.href === href))
        .filter(Boolean)
        .slice(0, MAX_RECENT_DISPLAY);

      // 최근 사용이 4개 미만이면 기본 항목으로 채우기
      if (recentItems.length < MAX_RECENT_DISPLAY) {
        const defaultIndices = DEFAULT_INDICES[key] || [0, 1, 2, 3];
        const additionalItems = defaultIndices
          .map(i => items[i])
          .filter(item => item && !recentItems.some(r => r?.href === item.href))
          .slice(0, MAX_RECENT_DISPLAY - recentItems.length);
        return [...recentItems, ...additionalItems];
      }
      return recentItems;
    }

    // 최근 사용이 없으면 기본 추천 항목
    const indices = DEFAULT_INDICES[key] || [0, 1, 2, 3];
    return indices.map(i => items[i]).filter(Boolean);
  };

  // 최근 사용 항목이 있는지 확인
  const hasRecentItems = (key: CategoryKey) => {
    return (recentTools[key] || []).length > 0;
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
      const scrollY = document.body.style.top;
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    };
  }, [isMobileMenuOpen]);

  // 글로벌 검색 단축키 (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

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
    media: '🖼️',
    health: '❤️',
    games: '🎮',
  };

  return (
    <header ref={headerRef} className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <Calculator className="w-8 h-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900 dark:text-white">{t('header.title')}</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1" aria-label={t('common.menu')}>
            {categoryKeys.map((key) => (
              <div key={key} className="relative">
                <button
                  onClick={() => handleDropdownToggle(key)}
                  className="flex items-center space-x-1 px-3 py-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  aria-expanded={openDropdown === key}
                  aria-haspopup="true"
                >
                  <span>{menuItems[key].title}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === key ? 'rotate-180' : ''}`} />
                </button>

                {openDropdown === key && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-[520px] bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                    <div className="flex">
                      {/* 왼쪽: 최근 사용 또는 추천 항목 */}
                      <div className="w-[180px] bg-gray-50 dark:bg-gray-900/50 p-3 border-r border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-1.5 mb-3 px-1">
                          <Clock className="w-3.5 h-3.5 text-blue-500" />
                          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            {hasRecentItems(key) ? t('header.recent') : t('header.recommended')}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {getRecentOrDefaultItems(key).map((item) => item && (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => handleToolClick(key, item.href)}
                              className="flex items-center gap-2 px-2 py-2 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-800 hover:text-blue-600 transition-colors"
                            >
                              <span className="text-lg">{item.icon}</span>
                              <span className="text-sm font-medium truncate">{item.label}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                      {/* 오른쪽: 전체 목록 (스크롤) */}
                      <div className="flex-1 p-3">
                        <div className="flex items-center gap-1.5 mb-3 px-1">
                          <Grid3X3 className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('header.all')} ({menuItems[key].items.length})</span>
                        </div>
                        <div className="max-h-[280px] overflow-y-auto pr-1">
                          <div className="grid grid-cols-3 gap-1.5">
                            {menuItems[key].items.map((item) => (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => handleToolClick(key, item.href)}
                                className="flex flex-col items-center text-center p-2.5 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-600 transition-colors"
                              >
                                <span className="text-xl mb-1">{item.icon}</span>
                                <span className="text-[11px] font-medium leading-tight line-clamp-2">{item.label}</span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* 금융 팁 */}
            <Link
              href="/tips"
              className="px-3 py-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {t('navigation.financialTips')}
            </Link>

            {/* 검색 */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm"
              aria-label={t('common.search')}
            >
              <Search className="w-4 h-4" />
              <span className="hidden xl:inline">{t('common.search')}</span>
              <kbd className="hidden xl:inline-flex px-1.5 py-0.5 text-[10px] font-mono text-gray-400 bg-white dark:bg-gray-600 rounded border border-gray-300 dark:border-gray-500">
                ⌘K
              </kbd>
            </button>

            {/* 테마 전환 */}
            <ThemeToggle />

            {/* 언어 전환 */}
            <LanguageToggle />
          </nav>

          {/* Mobile: Search + Theme + Language Toggle + Menu Button */}
          <div className="lg:hidden flex items-center space-x-2">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label={t('common.search')}
            >
              <Search className="w-5 h-5" />
            </button>
            <ThemeToggle />
            <LanguageToggle />
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label={isMobileMenuOpen ? t('common.close') : t('common.menu')}
              aria-expanded={isMobileMenuOpen}
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
          <div className="lg:hidden py-4 border-t border-gray-200 dark:border-gray-700 max-h-[calc(100vh-5rem)] overflow-y-auto">
            {/* Mobile Search */}
            <div className="px-3 pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={mobileSearchRef}
                  type="text"
                  value={mobileSearchQuery}
                  onChange={(e) => setMobileSearchQuery(e.target.value)}
                  placeholder={t('common.search')}
                  className="w-full pl-10 pr-8 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
                {mobileSearchQuery && (
                  <button
                    onClick={() => setMobileSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Mobile search results */}
            {mobileSearchQuery.trim() ? (
              <nav className="space-y-1 px-1">
                {(() => {
                  const q = mobileSearchQuery.toLowerCase()
                  const results: { href: string; label: string; icon: string; catTitle: string }[] = []
                  for (const key of categoryKeys) {
                    for (const item of menuItems[key].items) {
                      if (item.label.toLowerCase().includes(q) || item.href.toLowerCase().includes(q)) {
                        results.push({ ...item, catTitle: menuItems[key].title })
                      }
                    }
                  }
                  if (results.length === 0) {
                    return (
                      <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm">
                        {t('searchDialog.noResults')}
                      </div>
                    )
                  }
                  return results.slice(0, 15).map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => { setIsMobileMenuOpen(false); setMobileSearchQuery('') }}
                      className="flex items-center space-x-3 px-4 py-2.5 text-gray-600 dark:text-gray-300 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <span className="text-lg">{item.icon}</span>
                      <div className="min-w-0 flex-1">
                        <span className="block text-sm">{item.label}</span>
                        <span className="block text-xs text-gray-400 dark:text-gray-500">{item.catTitle}</span>
                      </div>
                    </Link>
                  ))
                })()}
              </nav>
            ) : (
            <nav className="space-y-1">
              {categoryKeys.map((key) => (
                <div key={key}>
                  <button
                    onClick={() => setExpandedMobileCategory(expandedMobileCategory === key ? null : key)}
                    className="w-full flex items-center justify-between px-3 py-3 text-sm font-semibold text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <span>{categoryIcons[key]}</span>
                      <span>{menuItems[key].title}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-xs font-normal text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                        {menuItems[key].items.length}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${expandedMobileCategory === key ? 'rotate-180' : ''}`} />
                    </span>
                  </button>
                  {expandedMobileCategory === key && (
                    <div className="space-y-1 pb-2">
                      {menuItems[key].items.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center space-x-3 px-6 py-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        >
                          <span className="text-lg">{item.icon}</span>
                          <span>{item.label}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* 금융 팁 */}
              <div>
                <Link
                  href="/tips"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center space-x-3 px-3 py-3 text-gray-600 dark:text-gray-300 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg mx-3 transition-colors font-medium"
                >
                  <span className="text-lg">💡</span>
                  <span>{t('navigation.financialTips')}</span>
                </Link>
              </div>
            </nav>
            )}
          </div>
        )}
      </div>
      {/* Search Dialog */}
      <SearchDialog isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </header>
  );
};

export default Header;
