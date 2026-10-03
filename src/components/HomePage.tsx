'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useTranslations } from '@/lib/i18n/shared'
import Link from 'next/link'
import { Search, Star, ChevronRight, BarChart3 } from 'lucide-react'
import { menuConfig, categoryKeys, categoryHubs, isNewTool, type CategoryKey, type MenuItem } from '@/config/menuConfig'
import { getFavorites, toggleFavorite } from '@/utils/favorites'
import { getAllRecentTools } from '@/utils/recentTools'
import { usePopularTools } from '@/hooks/useToolAnalytics'
import SearchDialog from './SearchDialog'
import ToolAnalyticsDashboard from './ToolAnalyticsDashboard'
import ToolIcon from './ToolIcon'

/** 카테고리별로 홈에서 바로 보여줄 도구 수 (나머지는 카테고리 허브 링크) */
const PER_CATEGORY = 12

type Item = MenuItem & { categoryKey?: CategoryKey }

export default function HomePage() {
  const t = useTranslations()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<CategoryKey | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [favorites, setFavorites] = useState<string[]>([])
  const [isDashboardOpen, setIsDashboardOpen] = useState(false)
  const { popularTools, isLoading: isPopularLoading } = usePopularTools(5)

  useEffect(() => {
    setFavorites(getFavorites())
  }, [])

  const recentlyViewedItems = useMemo(() => {
    if (typeof window === 'undefined') return []
    const items: Item[] = []
    for (const recent of getAllRecentTools().slice(0, 6)) {
      for (const catKey of categoryKeys) {
        const found = menuConfig[catKey].items.find(i => i.href === recent.href)
        if (found) { items.push(found); break }
      }
    }
    return items
  }, [])

  const totalTools = useMemo(() => categoryKeys.reduce((sum, key) => sum + menuConfig[key].items.length, 0), [])

  const filteredTools = useMemo(() => {
    const cats = activeCategory === 'all' ? categoryKeys : [activeCategory]
    const tools: Item[] = cats.flatMap(catKey => menuConfig[catKey].items.map(item => ({ ...item, categoryKey: catKey })))
    const q = searchQuery.trim().toLowerCase()
    if (!q) return tools
    return tools.filter(item => {
      try {
        return t(item.labelKey).toLowerCase().includes(q) || t(item.descriptionKey).toLowerCase().includes(q) || item.href.includes(q)
      } catch { return false }
    })
  }, [activeCategory, searchQuery, t])

  const handleToggleFavorite = useCallback((e: React.MouseEvent, href: string) => {
    e.preventDefault()
    e.stopPropagation()
    toggleFavorite(href)
    setFavorites(getFavorites())
  }, [])

  const favoritedItems = useMemo(
    () => categoryKeys.flatMap(k => menuConfig[k].items.filter(i => favorites.includes(i.href))),
    [favorites],
  )

  const fallbackPopular = useMemo(() => [
    menuConfig.calculators.items[0],
    menuConfig.tools.items[2],
    menuConfig.calculators.items[1],
    menuConfig.tools.items.find(i => i.href === '/password-generator') || menuConfig.tools.items[5],
    menuConfig.games.items[1],
  ], [])
  const popular: MenuItem[] = popularTools.length > 0 ? popularTools : fallbackPopular
  const recommended = useMemo(
    () => ['/loan-calculator', '/retirement-calculator', '/json-formatter', '/image-compressor', '/bmi-calculator']
      .map(href => categoryKeys.flatMap(k => menuConfig[k].items).find(i => i.href === href))
      .filter((i): i is MenuItem => !!i),
    [],
  )

  /** 목록 한 줄: 아이콘 + 이름 + 설명 */
  const ToolRow = ({ item }: { item: MenuItem }) => {
    const isFav = favorites.includes(item.href)
    return (
      <Link
        href={item.href}
        className="group relative flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-subtle transition-colors"
      >
        <ToolIcon href={item.href} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[15px] font-semibold text-fg">
            <span className="truncate">{t(item.labelKey)}</span>
            {isNewTool(item) && <span className="shrink-0 text-[10px] font-bold text-primary">NEW</span>}
          </div>
          <div className="text-[13px] text-muted truncate">{t(item.descriptionKey)}</div>
        </div>
        <button
          onClick={(e) => handleToggleFavorite(e, item.href)}
          className={`p-1 rounded-md transition-opacity ${isFav ? 'opacity-100 text-amber-400' : 'opacity-0 group-hover:opacity-100 focus:opacity-100 text-faint hover:text-amber-400'}`}
          aria-label={isFav ? t('favorites.remove') : t('favorites.add')}
        >
          <Star className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
        </button>
      </Link>
    )
  }

  const SectionTitle = ({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) => (
    <div className="flex items-end justify-between mb-3 px-1">
      <h2 className="text-xl font-bold text-fg">{children}</h2>
      {action}
    </div>
  )

  const chip = (active: boolean) =>
    `shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
      active ? 'bg-primary text-white' : 'bg-soft text-sub hover:text-fg'
    }`

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* ===== HERO ===== */}
      <section className="pt-14 pb-12 md:pt-20 md:pb-16">
        <p className="text-sm font-semibold text-primary mb-3">{totalTools}+ {t('homePage.hero.totalTools')}</p>
        <h1 className="text-3xl md:text-[44px] font-bold leading-tight tracking-tight text-fg mb-3">
          {t('homePage.hero.title')}
        </h1>
        <p className="text-base md:text-lg text-muted mb-8 max-w-2xl">{t('homePage.hero.subtitle')}</p>

        <button
          onClick={() => setIsSearchOpen(true)}
          className="w-full max-w-2xl flex items-center gap-3 px-5 h-14 bg-soft rounded-2xl text-left hover:bg-track/60 transition-colors"
        >
          <Search className="w-5 h-5 text-muted shrink-0" />
          <span className="flex-1 text-base text-faint">{t('homePage.hero.searchPlaceholder')}</span>
          <kbd className="hidden sm:inline px-2 py-0.5 text-xs font-sans text-muted bg-surface border border-line rounded-md">Ctrl K</kbd>
        </button>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 text-sm">
          {popular.map(tool => (
            <Link key={tool.href} href={tool.href} className="text-sub hover:text-primary transition-colors">
              {t(tool.labelKey)}
            </Link>
          ))}
        </div>
      </section>

      {/* ===== 인기 / 최근 / 즐겨찾기 ===== */}
      <div className="grid gap-10 lg:grid-cols-3 mb-14">
        <section className="lg:col-span-2">
          <SectionTitle
            action={
              <button onClick={() => setIsDashboardOpen(true)} className="flex items-center gap-1 text-sm text-muted hover:text-fg">
                <BarChart3 className="w-4 h-4" /> {t('homePage.popular.detailView')}
              </button>
            }
          >
            {t('homePage.popular.title')}
          </SectionTitle>
          <ol className="ui-card divide-y divide-line overflow-hidden">
            {(isPopularLoading ? fallbackPopular : popular).map((tool, i) => (
              <li key={tool.href}>
                <Link href={tool.href} className="flex items-center gap-4 px-4 py-3.5 hover:bg-subtle transition-colors">
                  <span className={`w-5 text-center text-[15px] font-bold tabular-nums ${i < 3 ? 'text-primary' : 'text-faint'}`}>{i + 1}</span>
                  <ToolIcon href={tool.href} size="sm" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[15px] font-semibold text-fg truncate">{t(tool.labelKey)}</span>
                    <span className="block text-[13px] text-muted truncate">{t(tool.descriptionKey)}</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-faint" />
                </Link>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <SectionTitle>
            {favoritedItems.length > 0 ? t('favorites.title')
              : recentlyViewedItems.length > 0 ? t('homePage.recentlyViewed.title') : t('header.recommended')}
          </SectionTitle>
          <div className="ui-card p-1.5">
            {(favoritedItems.length > 0 ? favoritedItems
              : recentlyViewedItems.length > 0 ? recentlyViewedItems : recommended
            ).slice(0, 5).map(item => (
              <ToolRow key={item.href} item={item} />
            ))}
          </div>
        </section>
      </div>

      {/* ===== ALL TOOLS ===== */}
      <section id="tools-grid" className="pb-16">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <h2 className="text-2xl font-bold text-fg">{t('homePage.allTools.title')}</h2>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-faint" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('homePage.allTools.filterPlaceholder')}
              className="ui-field pl-9 pr-3 py-2.5 text-sm"
            />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-6 -mx-4 px-4">
          <button onClick={() => setActiveCategory('all')} className={chip(activeCategory === 'all')}>
            {t('header.all')} <span className="opacity-60">{totalTools}</span>
          </button>
          {categoryKeys.map(key => (
            <button key={key} onClick={() => setActiveCategory(key)} className={chip(activeCategory === key)}>
              {t(menuConfig[key].titleKey)} <span className="opacity-60">{menuConfig[key].items.length}</span>
            </button>
          ))}
        </div>

        {activeCategory === 'all' && !searchQuery ? (
          <div className="space-y-10">
            {categoryKeys.map(catKey => {
              const items = menuConfig[catKey].items
              return (
                <div key={catKey}>
                  <div className="flex items-center justify-between mb-2 px-1">
                    <h3 className="flex items-center gap-2 text-lg font-bold text-fg">
                      <ToolIcon category={catKey} size="sm" />
                      {t(menuConfig[catKey].titleKey)}
                    </h3>
                    <Link href={categoryHubs[catKey]} className="flex items-center text-sm font-medium text-muted hover:text-primary">
                      {t('homePage.allTools.viewAll')} {items.length}
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-2">
                    {items.slice(0, PER_CATEGORY).map(item => <ToolRow key={item.href} item={item} />)}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-2">
              {filteredTools.map(item => <ToolRow key={item.href} item={item} />)}
            </div>
            {filteredTools.length === 0 && (
              <div className="text-center py-16 text-muted">
                <Search className="w-10 h-10 mx-auto mb-3 text-faint" />
                <p>{t('searchDialog.noResults')}</p>
              </div>
            )}
          </>
        )}

        {/* 전체 도구 링크 — 크롤러/키보드 사용자가 전부에 <a>로 도달 */}
        <details className="mt-12 border-t border-line pt-6">
          <summary className="cursor-pointer text-sm font-semibold text-sub">
            {t('homePage.allTools.title')} ({totalTools})
          </summary>
          <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {categoryKeys.map(catKey => (
              <div key={catKey}>
                <h3 className="text-sm font-semibold text-fg mb-2">
                  <Link href={categoryHubs[catKey]} className="hover:text-primary">{t(menuConfig[catKey].titleKey)}</Link>
                </h3>
                <ul className="space-y-1 text-[13px] text-muted [&_a:hover]:text-primary">
                  {menuConfig[catKey].items.map(item => (
                    <li key={item.href}><Link href={item.href}>{t(item.labelKey)}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </details>
      </section>

      <SearchDialog isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <ToolAnalyticsDashboard isOpen={isDashboardOpen} onClose={() => setIsDashboardOpen(false)} />
    </div>
  )
}
