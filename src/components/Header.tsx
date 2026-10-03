'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import BrandMark from './BrandMark';
import { Calculator, Menu, X, ChevronDown, Search } from 'lucide-react';
import ToolIcon from './ToolIcon';
import LanguageToggle from './LanguageToggle';
import ThemeToggle from './ThemeToggle';
import SearchDialog from './SearchDialog';
import { useTranslations } from '@/lib/i18n/shared';
import { menuConfig, categoryKeys, categoryHubs, CategoryKey } from '@/config/menuConfig';
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
    const result: Record<string, { title: string; items: { href: string; label: string }[] }> = {};
    for (const key of categoryKeys) {
      result[key] = {
        title: t(menuConfig[key].titleKey),
        items: menuConfig[key].items.map(item => ({
          href: item.href,
          label: t(item.labelKey),
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

  return (<>
    <header ref={headerRef} className="bg-surface border-b border-line sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-14 gap-6">
          <Link href="/" className="flex items-center gap-2 shrink-0 whitespace-nowrap">
            <BrandMark />
            <span className="text-[17px] font-bold tracking-tight text-fg">{t('header.title')}</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-0.5 whitespace-nowrap text-[15px] font-medium flex-1" aria-label={t('common.menu')}>
            {categoryKeys.map((key) => (
              <div key={key} className="relative">
                <button
                  onClick={() => handleDropdownToggle(key)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${openDropdown === key ? 'text-fg bg-soft' : 'text-sub hover:text-fg hover:bg-soft'}`}
                  aria-expanded={openDropdown === key}
                  aria-haspopup="true"
                >
                  <span>{menuItems[key].title}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-faint transition-transform ${openDropdown === key ? 'rotate-180' : ''}`} />
                </button>

                {openDropdown === key && (
                  <div className="absolute top-full left-0 mt-2 w-[640px] bg-surface rounded-2xl shadow-xl border border-line z-50 overflow-hidden">
                    <div className="flex">
                      {/* 왼쪽: 최근 사용 또는 추천 */}
                      <div className="w-[200px] bg-subtle p-3 border-r border-line">
                        <div className="px-2 pb-2 text-xs font-semibold text-muted">
                          {hasRecentItems(key) ? t('header.recent') : t('header.recommended')}
                        </div>
                        <div className="space-y-0.5">
                          {getRecentOrDefaultItems(key).map((item) => item && (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => handleToolClick(key, item.href)}
                              className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-body hover:bg-soft transition-colors"
                            >
                              <ToolIcon href={item.href} size="sm" className="!bg-surface border border-line" />
                              <span className="text-sm font-medium truncate">{item.label}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                      {/* 오른쪽: 전체 목록 */}
                      <div className="flex-1 p-3 min-w-0">
                        <div className="flex items-center justify-between px-2 pb-2">
                          <span className="text-xs font-semibold text-muted">{t('header.all')} {menuItems[key].items.length}</span>
                          <Link href={categoryHubs[key]} onClick={closeDropdown} className="text-xs font-medium text-primary hover:underline">
                            {t('homePage.allTools.viewAll')}
                          </Link>
                        </div>
                        <div className="max-h-[360px] overflow-y-auto pr-1 glass-scrollbar">
                          <div className="grid grid-cols-2 gap-x-1">
                            {menuItems[key].items.map((item) => (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => handleToolClick(key, item.href)}
                                className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-body hover:bg-soft hover:text-fg transition-colors"
                              >
                                <ToolIcon href={item.href} bare size="sm" className="text-faint shrink-0" />
                                <span className="truncate">{item.label}</span>
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

            <Link href="/algorithm" className="hidden xl:inline-flex px-3 py-1.5 rounded-lg text-sub hover:text-fg hover:bg-soft transition-colors">
              {t('navigation.algorithm')}
            </Link>
            <Link href="/tips" className="hidden xl:inline-flex px-3 py-1.5 rounded-lg text-sub hover:text-fg hover:bg-soft transition-colors">
              {t('navigation.financialTips')}
            </Link>
          </nav>

          <div className="hidden lg:flex items-center gap-1 shrink-0">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-2 w-44 xl:w-56 px-3 py-1.5 rounded-lg bg-soft text-faint hover:text-muted text-sm transition-colors"
              aria-label={t('common.search')}
            >
              <Search className="w-4 h-4" />
              <span className="flex-1 text-left">{t('common.search')}</span>
              <kbd className="px-1.5 text-[11px] font-sans text-faint border border-line rounded bg-surface">⌘K</kbd>
            </button>
            <ThemeToggle />
            <LanguageToggle />
          </div>

          {/* Mobile */}
          <div className="lg:hidden flex items-center gap-1 ml-auto">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-2 rounded-lg text-sub hover:bg-soft transition-colors"
              aria-label={t('common.search')}
            >
              <Search className="w-5 h-5" />
            </button>
            <ThemeToggle />
            <LanguageToggle />
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg text-sub hover:bg-soft transition-colors"
              aria-label={isMobileMenuOpen ? t('common.close') : t('common.menu')}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="lg:hidden py-3 border-t border-line max-h-[calc(100vh-4rem)] overflow-y-auto glass-scrollbar">
            <div className="pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-faint" />
                <input
                  ref={mobileSearchRef}
                  type="text"
                  value={mobileSearchQuery}
                  onChange={(e) => setMobileSearchQuery(e.target.value)}
                  placeholder={t('common.search')}
                  className="ui-field pl-10 pr-8 py-2.5 text-sm"
                />
                {mobileSearchQuery && (
                  <button onClick={() => setMobileSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-faint">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {mobileSearchQuery.trim() ? (
              <nav className="space-y-0.5">
                {(() => {
                  const q = mobileSearchQuery.toLowerCase()
                  const results: { href: string; label: string; catTitle: string }[] = []
                  for (const key of categoryKeys) {
                    for (const item of menuItems[key].items) {
                      if (item.label.toLowerCase().includes(q) || item.href.toLowerCase().includes(q)) {
                        results.push({ ...item, catTitle: menuItems[key].title })
                      }
                    }
                  }
                  if (results.length === 0) {
                    return <div className="text-center py-6 text-muted text-sm">{t('searchDialog.noResults')}</div>
                  }
                  return results.slice(0, 15).map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => { setIsMobileMenuOpen(false); setMobileSearchQuery('') }}
                      className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-soft transition-colors"
                    >
                      <ToolIcon href={item.href} size="sm" />
                      <div className="min-w-0 flex-1">
                        <span className="block text-sm text-body">{item.label}</span>
                        <span className="block text-xs text-faint">{item.catTitle}</span>
                      </div>
                    </Link>
                  ))
                })()}
              </nav>
            ) : (
            <nav className="space-y-0.5">
              {categoryKeys.map((key) => (
                <div key={key}>
                  <button
                    onClick={() => setExpandedMobileCategory(expandedMobileCategory === key ? null : key)}
                    aria-expanded={expandedMobileCategory === key}
                    className="w-full flex items-center justify-between px-2 py-2.5 text-[15px] font-semibold text-fg hover:bg-soft rounded-lg transition-colors"
                  >
                    <span className="flex items-center gap-3">
                      <ToolIcon category={key} size="sm" />
                      <span>{menuItems[key].title}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-xs font-normal text-faint">{menuItems[key].items.length}</span>
                      <ChevronDown className={`w-4 h-4 text-faint transition-transform ${expandedMobileCategory === key ? 'rotate-180' : ''}`} />
                    </span>
                  </button>
                  {expandedMobileCategory === key && (
                    <div className="pb-2 pl-11 grid grid-cols-1">
                      {menuItems[key].items.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="py-2 text-sm text-sub hover:text-fg"
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div className="border-t border-line mt-2 pt-2">
                <Link href="/algorithm" onClick={() => setIsMobileMenuOpen(false)} className="block px-2 py-2.5 text-[15px] font-medium text-body hover:bg-soft rounded-lg">
                  {t('navigation.algorithm')}
                </Link>
                <Link href="/tips" onClick={() => setIsMobileMenuOpen(false)} className="block px-2 py-2.5 text-[15px] font-medium text-body hover:bg-soft rounded-lg">
                  {t('navigation.financialTips')}
                </Link>
              </div>
            </nav>
            )}
          </div>
        )}
      </div>
    </header>
    {/* Search Dialog — header 밖에서 렌더 (backdrop-filter containing block 회피) */}
    <SearchDialog isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
  </>);
};

export default Header;
