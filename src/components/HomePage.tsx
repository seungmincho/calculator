'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useTranslations } from '@/lib/i18n'
import Link from 'next/link'
import {
  Search, Star, TrendingUp, Zap, Smartphone, Moon, WifiOff, ArrowRight, Clock, BarChart3
} from 'lucide-react'
import { menuConfig, categoryKeys, categoryHubs, isNewTool, type CategoryKey, type MenuItem } from '@/config/menuConfig'
import { getFavorites, toggleFavorite } from '@/utils/favorites'
import { getAllRecentTools } from '@/utils/recentTools'
import { usePopularTools } from '@/hooks/useToolAnalytics'
import SearchDialog from './SearchDialog'
import ToolAnalyticsDashboard from './ToolAnalyticsDashboard'

/* ── Design tokens (globals.css ui-* 기반) ── */
const glass = {
  card: 'ui-card',
  cardHover: 'hover:bg-subtle active:scale-[0.99] transition-colors',
  cardInset: '',
  pill: 'bg-surface border border-line rounded-full',
  pillActive: 'bg-fg border-fg !text-canvas',
  input: 'ui-field',
} as const

const categoryEmoji: Record<CategoryKey, string> = {
  calculators: '💰', tools: '🛠️', media: '🖼️', health: '❤️', games: '🎮',
}

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
    const allRecent = getAllRecentTools()
    const items: (MenuItem & { categoryKey: CategoryKey })[] = []
    for (const recent of allRecent.slice(0, 8)) {
      for (const catKey of categoryKeys) {
        const found = menuConfig[catKey].items.find(i => i.href === recent.href)
        if (found) {
          items.push({ ...found, categoryKey: catKey })
          break
        }
      }
    }
    return items
  }, [])

  const totalTools = useMemo(() => {
    return categoryKeys.reduce((sum, key) => sum + menuConfig[key].items.length, 0)
  }, [])

  const newToolsCount = useMemo(() => {
    return categoryKeys.reduce((sum, key) => sum + menuConfig[key].items.filter(i => isNewTool(i)).length, 0)
  }, [])

  const filteredTools = useMemo(() => {
    const tools: (MenuItem & { categoryKey: CategoryKey })[] = []
    const cats = activeCategory === 'all' ? categoryKeys : [activeCategory]
    for (const catKey of cats) {
      for (const item of menuConfig[catKey].items) {
        tools.push({ ...item, categoryKey: catKey })
      }
    }
    if (!searchQuery.trim()) return tools
    const q = searchQuery.toLowerCase()
    return tools.filter(item => {
      try {
        return (
          t(item.labelKey).toLowerCase().includes(q) ||
          t(item.descriptionKey).toLowerCase().includes(q) ||
          item.href.toLowerCase().includes(q)
        )
      } catch { return false }
    })
  }, [activeCategory, searchQuery, t])

  const handleToggleFavorite = useCallback((e: React.MouseEvent, href: string) => {
    e.preventDefault()
    e.stopPropagation()
    toggleFavorite(href)
    setFavorites(getFavorites())
  }, [])

  const favoritedItems = useMemo(() => {
    if (favorites.length === 0) return []
    const items: (MenuItem & { categoryKey: CategoryKey })[] = []
    for (const catKey of categoryKeys) {
      for (const item of menuConfig[catKey].items) {
        if (favorites.includes(item.href)) items.push({ ...item, categoryKey: catKey })
      }
    }
    return items
  }, [favorites])

  const fallbackPopular = useMemo(() => {
    return [
      menuConfig.calculators.items[0],
      menuConfig.tools.items[2],
      menuConfig.calculators.items[1],
      menuConfig.tools.items.find(i => i.href === '/password-generator') || menuConfig.tools.items[5],
      menuConfig.games.items[1],
    ]
  }, [])

  return (
    <div className="min-h-screen relative">
      {/* ===== HERO ===== */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Badges */}
          <div className="inline-flex items-center gap-3 mb-7">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-soft text-primary text-xs font-semibold">
              {totalTools}+ {t('homePage.hero.totalTools')}
            </div>
            {newToolsCount > 0 && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400 text-xs font-semibold">
                +{newToolsCount} NEW
              </div>
            )}
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-5xl lg:text-[3.75rem] font-bold leading-tight tracking-tight mb-5 text-fg">
            {t('homePage.hero.title')}
          </h1>
          <p className="text-base md:text-lg max-w-2xl mx-auto mb-10 leading-relaxed text-muted">
            {t('homePage.hero.subtitle')}
          </p>

          {/* Glass Search Bar */}
          <div className="max-w-xl mx-auto relative group">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="relative w-full flex items-center gap-3 px-5 py-4 bg-surface border border-line rounded-2xl shadow-md cursor-text transition-colors hover:border-primary"
            >
              <Search className="w-5 h-5 shrink-0 text-faint" />
              <span className="flex-1 text-left text-base text-faint">{t('homePage.hero.searchPlaceholder')}</span>
              <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono rounded bg-soft text-muted">
                Ctrl K
              </kbd>
            </button>
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 md:gap-x-12 mt-12">
            {categoryKeys.map(key => (
              <button
                key={key}
                onClick={() => {
                  setActiveCategory(key)
                  document.getElementById('tools-grid')?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="text-center group/stat transition-all"
              >
                <div className="text-xl md:text-2xl font-bold tabular-nums text-fg">
                  {menuConfig[key].items.length}
                </div>
                <div className="text-xs mt-0.5 text-muted">
                  {categoryEmoji[key]} {t(menuConfig[key].titleKey)}
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* ===== POPULAR TOP 5 ===== */}
        <section className="py-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-red-500" />
              <h2 className="text-2xl font-bold text-fg">{t('homePage.popular.title')}</h2>
            </div>
            <button
              onClick={() => setIsDashboardOpen(true)}
              className={`${glass.pill} flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-soft transition-colors`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              {t('homePage.popular.detailView')}
            </button>
          </div>

          {isPopularLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className={`${glass.card} p-5 animate-pulse`}>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-soft rounded-xl" />
                    <div className="flex-1">
                      <div className="h-4 bg-soft rounded w-3/4 mb-2" />
                      <div className="h-3 bg-soft rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {(popularTools.length > 0 ? popularTools : fallbackPopular).map((tool, index) => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className={`group relative ${glass.card} ${glass.cardInset} p-5 ${glass.cardHover}`}
                >
                  <div className="absolute top-3 right-4 text-sm font-bold text-primary tabular-nums">
                    {index + 1}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{tool.icon}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-fg group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate transition-colors">
                        {t(tool.labelKey)}
                      </div>
                      <div className="text-xs text-muted truncate">
                        {t(tool.descriptionKey)}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ===== RECENTLY VIEWED ===== */}
        {recentlyViewedItems.length > 0 && (
          <section className="py-8">
            <div className="flex items-center gap-2 mb-6">
              <Clock className="w-5 h-5 text-blue-500" />
              <h2 className="text-xl font-bold text-fg">{t('homePage.recentlyViewed.title')}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {recentlyViewedItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group ${glass.card} ${glass.cardInset} p-4 ${glass.cardHover}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-soft rounded-xl flex items-center justify-center text-xl">
                      {item.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-fg group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate transition-colors">
                        {t(item.labelKey)}
                      </div>
                      <div className="text-xs text-muted truncate">
                        {t(item.descriptionKey)}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ===== CATEGORY SHOWCASE ===== */}
        <section className="py-12">
          <h2 className="text-2xl font-bold text-fg mb-6">{t('homePage.categories.title')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {categoryKeys.map(key => {
              const isActive = activeCategory === key
              return (
                <button
                  key={key}
                  onClick={() => {
                    setActiveCategory(key)
                    document.getElementById('tools-grid')?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  className={`group relative overflow-hidden p-6 rounded-2xl border transition-all duration-300 text-left ${
                    isActive
                      ? 'bg-surface border-primary'
                      : 'bg-surface border-transparent hover:bg-subtle'
                  }`}
                >
                  <div className="relative z-10">
                    <div className="text-3xl mb-2">{categoryEmoji[key]}</div>
                    <div className="text-sm font-semibold text-fg">{t(menuConfig[key].titleKey)}</div>
                    <div className="text-2xl font-bold text-fg mt-1">{menuConfig[key].items.length}</div>
                    <div className="text-xs text-muted">{t('homePage.categories.toolCount')}</div>
                  </div>
                  <ArrowRight className="absolute bottom-4 right-4 w-4 h-4 text-gray-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors" />
                </button>
              )
            })}
          </div>
        </section>

        {/* ===== FAVORITES ===== */}
        {favoritedItems.length > 0 && (
          <section className="py-8">
            <div className="flex items-center gap-2 mb-6">
              <Star className="w-5 h-5 text-yellow-500 fill-current" />
              <h2 className="text-xl font-bold text-fg">{t('favorites.title')}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {favoritedItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group relative ${glass.card} p-4 ${glass.cardHover}`}
                >
                  <button
                    onClick={(e) => handleToggleFavorite(e, item.href)}
                    className="absolute top-2 right-2 p-1 rounded-full text-yellow-500 hover:text-yellow-600"
                    aria-label={t('favorites.remove')}
                  >
                    <Star className="w-4 h-4 fill-current" />
                  </button>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-soft rounded-xl flex items-center justify-center text-xl">
                      {item.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-fg truncate">{t(item.labelKey)}</div>
                      <div className="text-xs text-muted truncate">{t(item.descriptionKey)}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ===== ALL TOOLS GRID ===== */}
        <section id="tools-grid" className="py-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h2 className="text-2xl font-bold text-fg">{t('homePage.allTools.title')}</h2>
            <div className="relative w-full md:w-80 group">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('homePage.allTools.filterPlaceholder')}
                  className={`pl-10 pr-4 py-2.5 ${glass.input} !bg-surface text-sm`}
                />
              </div>
            </div>
          </div>

          {/* Category Tabs — Glass pills */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-all duration-300 ${
                activeCategory === 'all'
                  ? glass.pillActive
                  : 'bg-surface border-transparent text-sub hover:bg-subtle'
              }`}
            >
              {t('header.all')} ({totalTools})
            </button>
            {categoryKeys.map(key => (
              <button
                key={key}
                onClick={() => { setActiveCategory(key); if (activeCategory === 'all') document.getElementById('tools-grid')?.scrollIntoView({ behavior: 'smooth' }) }}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition-all duration-300 ${
                  activeCategory === key
                    ? glass.pillActive
                    : 'bg-surface border-transparent text-sub hover:bg-subtle'
                }`}
              >
                {categoryEmoji[key]} {t(menuConfig[key].titleKey)} ({menuConfig[key].items.length})
              </button>
            ))}
          </div>

          {/* Category Sliders (all + no search) or Grid (filtered) */}
          {activeCategory === 'all' && !searchQuery ? (
            <div className="space-y-12">
              {categoryKeys.map(catKey => {
                const catTools = menuConfig[catKey].items
                const sliderTools = catTools.slice(0, 10)
                const remaining = catTools.length - sliderTools.length
                return (
                  <div key={catKey}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{categoryEmoji[catKey]}</span>
                        <h3 className="text-lg font-semibold text-fg">{t(menuConfig[catKey].titleKey)}</h3>
                        <span className="text-sm text-faint">({catTools.length})</span>
                      </div>
                      <button
                        onClick={() => setActiveCategory(catKey)}
                        className={`${glass.pill} flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-soft transition-colors`}
                      >
                        {t('homePage.allTools.viewAll')} <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide -mx-4 px-4">
                      {sliderTools.map(item => {
                        const isFav = favorites.includes(item.href)
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={`group relative snap-start shrink-0 w-[148px] sm:w-[164px] ${glass.card} p-4 ${glass.cardHover}`}
                          >
                            <div className="relative z-10">
                              <div className="text-2xl mb-2.5">{item.icon}</div>
                              <div className="text-xs font-medium text-fg leading-snug line-clamp-2">
                                {t(item.labelKey)}
                                {isNewTool(item) && (
                                  <span className="ml-1 inline-flex items-center px-1 py-0.5 text-[9px] font-bold bg-red-500 text-white rounded-full leading-none">N</span>
                                )}
                              </div>
                              <div className="text-[10px] text-muted mt-1 truncate">{t(item.descriptionKey)}</div>
                            </div>
                            <button
                              onClick={(e) => handleToggleFavorite(e, item.href)}
                              className={`absolute top-2 right-2 p-0.5 rounded-full transition-all opacity-0 group-hover:opacity-100 ${
                                isFav ? 'opacity-100 text-yellow-500' : 'text-gray-300 dark:text-gray-600 hover:text-yellow-400'
                              }`}
                              aria-label={isFav ? t('favorites.remove') : t('favorites.add')}
                            >
                              <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
                            </button>
                          </Link>
                        )
                      })}
                      {remaining > 0 && (
                        <button
                          onClick={() => setActiveCategory(catKey)}
                          className={`snap-start shrink-0 w-[120px] ${glass.card} p-4 flex flex-col items-center justify-center gap-2.5 text-indigo-600 dark:text-indigo-400 ${glass.cardHover}`}
                        >
                          <div className="w-10 h-10 rounded-full bg-indigo-400/10 dark:bg-indigo-400/20 flex items-center justify-center border border-indigo-200/30 dark:border-indigo-400/25">
                            <ArrowRight className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-medium text-center">+{remaining}<br />더보기</span>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredTools.map(item => {
                  const isFav = favorites.includes(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group relative ${glass.card} ${glass.cardInset} p-4 ${glass.cardHover}`}
                    >
                      <button
                        onClick={(e) => handleToggleFavorite(e, item.href)}
                        className={`absolute top-2 right-2 p-1 rounded-full transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 ${
                          isFav
                            ? 'opacity-100 text-yellow-500 hover:text-yellow-600'
                            : 'text-gray-300 dark:text-gray-600 hover:text-yellow-400'
                        }`}
                        aria-label={isFav ? t('favorites.remove') : t('favorites.add')}
                      >
                        <Star className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                      </button>
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-soft rounded-xl flex items-center justify-center text-xl">
                            {item.icon}
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-medium text-fg group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center gap-1.5">
                            {t(item.labelKey)}
                            {isNewTool(item) && (
                              <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full leading-none">
                                NEW
                              </span>
                            )}
                          </h3>
                          <p className="text-xs text-muted mt-1 truncate">{t(item.descriptionKey)}</p>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>

              {filteredTools.length === 0 && (
                <div className="text-center py-12 text-muted">
                  <Search className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>{t('searchDialog.noResults')}</p>
                </div>
              )}
            </>
          )}

          {/* 전체 도구 링크 목록 — 슬라이더는 카테고리당 10개만 노출되므로, 크롤러/키보드 사용자가 242개 전부에 <a>로 도달하도록 native <details>로 제공 */}
          <details className={`mt-10 ${glass.card} ${glass.cardInset} p-4`}>
            <summary className="cursor-pointer text-sm font-semibold text-body">
              {t('homePage.allTools.title')} ({categoryKeys.reduce((n, k) => n + menuConfig[k].items.length, 0)})
            </summary>
            <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {categoryKeys.map(catKey => (
                <div key={catKey}>
                  <h3 className="text-sm font-semibold text-fg mb-2"><Link href={categoryHubs[catKey]} className="hover:text-blue-600 dark:hover:text-blue-400">{categoryEmoji[catKey]} {t(menuConfig[catKey].titleKey)} →</Link></h3>
                  <ul className="space-y-1 text-xs text-sub [&_a:hover]:text-indigo-600 dark:[&_a:hover]:text-indigo-400">
                    {menuConfig[catKey].items.map(item => (
                      <li key={item.href}>
                        <Link href={item.href}>
                          {item.icon} {t(item.labelKey)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </details>
        </section>

        {/* ===== FEATURES ===== */}
        <section className="py-12 mb-8">
          <h2 className="text-2xl font-bold text-fg mb-6 text-center">{t('homePage.features.title')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Zap, key: 'homePage.features.free', desc: 'homePage.features.freeDesc' },
              { icon: Smartphone, key: 'homePage.features.pwa', desc: 'homePage.features.pwaDesc' },
              { icon: WifiOff, key: 'homePage.features.offline', desc: 'homePage.features.offlineDesc' },
              { icon: Moon, key: 'homePage.features.darkMode', desc: 'homePage.features.darkModeDesc' },
            ].map((feat, i) => (
              <div key={i} className={`${glass.card} p-6 text-center`}>
                <div className="relative z-10">
                  <feat.icon className="w-8 h-8 mx-auto mb-3 text-primary" />
                  <div className="text-sm font-medium text-fg">{t(feat.key)}</div>
                  <div className="text-xs text-muted mt-1">{t(feat.desc)}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <SearchDialog isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <ToolAnalyticsDashboard isOpen={isDashboardOpen} onClose={() => setIsDashboardOpen(false)} />
    </div>
  )
}
