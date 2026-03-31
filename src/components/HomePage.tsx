'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import {
  Search, Star, TrendingUp, Zap, Smartphone, Moon, WifiOff, ArrowRight, Clock, BarChart3
} from 'lucide-react'
import { menuConfig, categoryKeys, isNewTool, type CategoryKey, type MenuItem } from '@/config/menuConfig'
import { getFavorites, toggleFavorite } from '@/utils/favorites'
import { getAllRecentTools } from '@/utils/recentTools'
import { usePopularTools } from '@/hooks/useToolAnalytics'
import SearchDialog from './SearchDialog'
import ToolAnalyticsDashboard from './ToolAnalyticsDashboard'

/* ── Glass design tokens ── */
const glass = {
  card: 'bg-white/40 dark:bg-white/[0.06] backdrop-blur-xl border border-white/50 dark:border-white/[0.08] rounded-2xl',
  cardHover: 'hover:bg-white/60 dark:hover:bg-white/[0.10] hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:-translate-y-1',
  cardInset: 'shadow-[inset_1px_1px_6px_rgba(255,255,255,0.25),inset_-1px_-1px_6px_rgba(255,255,255,0.08)]',
  pill: 'bg-white/50 dark:bg-white/[0.06] backdrop-blur-lg border border-white/40 dark:border-white/[0.08] rounded-full',
  pillActive: 'bg-white/70 dark:bg-white/[0.15] border-indigo-300/60 dark:border-indigo-400/30 shadow-[0_0_15px_rgba(99,102,241,0.15)]',
  input: 'bg-white/50 dark:bg-white/[0.06] backdrop-blur-xl border border-white/50 dark:border-white/[0.10] rounded-2xl',
} as const

const categoryGlass: Record<CategoryKey, { gradient: string; glow: string }> = {
  calculators: { gradient: 'from-blue-400/15 to-cyan-400/10 dark:from-blue-500/10 dark:to-cyan-500/5', glow: 'group-hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]' },
  tools: { gradient: 'from-violet-400/15 to-purple-400/10 dark:from-violet-500/10 dark:to-purple-500/5', glow: 'group-hover:shadow-[0_0_30px_rgba(139,92,246,0.15)]' },
  media: { gradient: 'from-orange-400/15 to-amber-400/10 dark:from-orange-500/10 dark:to-amber-500/5', glow: 'group-hover:shadow-[0_0_30px_rgba(251,146,60,0.15)]' },
  health: { gradient: 'from-emerald-400/15 to-green-400/10 dark:from-emerald-500/10 dark:to-green-500/5', glow: 'group-hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]' },
  games: { gradient: 'from-pink-400/15 to-rose-400/10 dark:from-pink-500/10 dark:to-rose-500/5', glow: 'group-hover:shadow-[0_0_30px_rgba(236,72,153,0.15)]' },
}

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
      {/* ===== GLOBAL BACKGROUND ===== */}
      <div className="fixed inset-0 -z-10">
        {/* Light mode base */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/30 dark:hidden" />
        {/* Dark mode base */}
        <div className="absolute inset-0 hidden dark:block" style={{ background: 'linear-gradient(160deg, #0a0f1e 0%, #0d1117 40%, #0f1623 100%)' }} />
        {/* Floating color blobs */}
        <div className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full opacity-60 dark:opacity-40" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)' }} />
        <div className="absolute top-[20%] right-0 w-[500px] h-[500px] rounded-full opacity-50 dark:opacity-30" style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.10) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[10%] left-[20%] w-[400px] h-[400px] rounded-full opacity-50 dark:opacity-30" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.10) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 right-[10%] w-[500px] h-[500px] rounded-full opacity-40 dark:opacity-25" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.10) 0%, transparent 70%)' }} />
        {/* Dot grid texture */}
        <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #94a3b8 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      </div>

      {/* ===== HERO ===== */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Badges */}
          <div className="inline-flex items-center gap-3 mb-7">
            <div className={`${glass.pill} inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium tracking-wide text-gray-600 dark:text-slate-400`}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {totalTools}+ {t('homePage.hero.totalTools')}
            </div>
            {newToolsCount > 0 && (
              <div className={`${glass.pill} inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium tracking-wide text-red-600 dark:text-red-400`}
                style={{ background: 'rgba(239,68,68,0.08)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                +{newToolsCount} NEW
              </div>
            )}
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-5xl lg:text-[3.75rem] font-bold leading-tight tracking-tight mb-5 text-gray-900 dark:text-slate-100">
            {t('homePage.hero.title')}
          </h1>
          <p className="text-base md:text-lg max-w-2xl mx-auto mb-10 leading-relaxed text-gray-500 dark:text-slate-500">
            {t('homePage.hero.subtitle')}
          </p>

          {/* Glass Search Bar */}
          <div className="max-w-xl mx-auto relative group">
            <div className="absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-md"
              style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(236,72,153,0.15), rgba(59,130,246,0.25))' }} />
            <button
              onClick={() => setIsSearchOpen(true)}
              className={`relative w-full flex items-center gap-3 px-5 py-4 ${glass.input} cursor-text transition-all duration-300 group-hover:bg-white/70 dark:group-hover:bg-white/[0.10]`}
              style={{ boxShadow: 'inset 1px 1px 6px rgba(255,255,255,0.2), inset -1px -1px 6px rgba(255,255,255,0.05), 0 4px 24px rgba(0,0,0,0.04)' }}
            >
              <Search className="w-4 h-4 shrink-0 text-gray-400 dark:text-slate-500" />
              <span className="flex-1 text-left text-sm text-gray-400 dark:text-slate-500">{t('homePage.hero.searchPlaceholder')}</span>
              <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono rounded bg-white/40 dark:bg-white/[0.06] border border-white/50 dark:border-white/[0.08] text-gray-400 dark:text-slate-600">
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
                <div className="text-xl md:text-2xl font-bold tabular-nums text-gray-800 dark:text-slate-200">
                  {menuConfig[key].items.length}
                </div>
                <div className="text-xs mt-0.5 text-gray-500 dark:text-slate-500">
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
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('homePage.popular.title')}</h2>
            </div>
            <button
              onClick={() => setIsDashboardOpen(true)}
              className={`${glass.pill} flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-white/70 dark:hover:bg-white/[0.10] transition-colors`}
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
                    <div className="w-12 h-12 bg-white/30 dark:bg-white/[0.06] rounded-xl" />
                    <div className="flex-1">
                      <div className="h-4 bg-white/30 dark:bg-white/[0.06] rounded w-3/4 mb-2" />
                      <div className="h-3 bg-white/20 dark:bg-white/[0.04] rounded w-1/2" />
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
                  className={`group relative ${glass.card} ${glass.cardInset} p-5 transition-all duration-300 ${glass.cardHover}`}
                >
                  <div className="absolute -top-2 -left-2 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md"
                    style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>
                    {index + 1}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{tool.icon}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate transition-colors">
                        {t(tool.labelKey)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
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
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('homePage.recentlyViewed.title')}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {recentlyViewedItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group ${glass.card} ${glass.cardInset} p-4 transition-all duration-300 ${glass.cardHover}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-400/10 dark:bg-blue-400/10 backdrop-blur-sm rounded-xl flex items-center justify-center text-xl border border-blue-200/30 dark:border-blue-500/20">
                      {item.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate transition-colors">
                        {t(item.labelKey)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t('homePage.categories.title')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {categoryKeys.map(key => {
              const cg = categoryGlass[key]
              const isActive = activeCategory === key
              return (
                <button
                  key={key}
                  onClick={() => {
                    setActiveCategory(key)
                    document.getElementById('tools-grid')?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  className={`group relative overflow-hidden p-6 rounded-2xl backdrop-blur-xl border transition-all duration-300 text-left ${
                    isActive
                      ? 'bg-white/60 dark:bg-white/[0.12] border-indigo-300/60 dark:border-indigo-400/30 shadow-[0_0_20px_rgba(99,102,241,0.15)] scale-[1.02]'
                      : 'bg-white/30 dark:bg-white/[0.04] border-white/40 dark:border-white/[0.06] hover:bg-white/50 dark:hover:bg-white/[0.08]'
                  } ${cg.glow}`}
                  style={{ boxShadow: isActive ? undefined : 'inset 1px 1px 6px rgba(255,255,255,0.2), inset -1px -1px 6px rgba(255,255,255,0.05)' }}
                >
                  {/* Gradient overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${cg.gradient} rounded-2xl`} />
                  <div className="relative z-10">
                    <div className="text-3xl mb-2">{categoryEmoji[key]}</div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">{t(menuConfig[key].titleKey)}</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{menuConfig[key].items.length}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{t('homePage.categories.toolCount')}</div>
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
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('favorites.title')}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {favoritedItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group relative bg-amber-50/40 dark:bg-amber-500/[0.04] backdrop-blur-xl border border-amber-200/40 dark:border-amber-500/10 rounded-2xl p-4 transition-all duration-300 ${glass.cardHover}`}
                  style={{ boxShadow: 'inset 1px 1px 6px rgba(251,191,36,0.1), inset -1px -1px 6px rgba(251,191,36,0.03)' }}
                >
                  <button
                    onClick={(e) => handleToggleFavorite(e, item.href)}
                    className="absolute top-2 right-2 p-1 rounded-full text-yellow-500 hover:text-yellow-600"
                    aria-label={t('favorites.remove')}
                  >
                    <Star className="w-4 h-4 fill-current" />
                  </button>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-amber-400/10 dark:bg-amber-400/10 backdrop-blur-sm rounded-xl flex items-center justify-center text-xl border border-amber-200/30 dark:border-amber-500/20">
                      {item.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{t(item.labelKey)}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{t(item.descriptionKey)}</div>
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
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('homePage.allTools.title')}</h2>
            <div className="relative w-full md:w-80 group">
              <div className="absolute -inset-0.5 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 blur-sm"
                style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(59,130,246,0.3))' }} />
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('homePage.allTools.filterPlaceholder')}
                  className={`w-full pl-10 pr-4 py-2.5 ${glass.input} text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-400/30 text-sm rounded-xl outline-none`}
                />
              </div>
            </div>
          </div>

          {/* Category Tabs — Glass pills */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium backdrop-blur-lg border transition-all duration-300 ${
                activeCategory === 'all'
                  ? `${glass.pillActive} text-indigo-700 dark:text-indigo-300`
                  : 'bg-white/30 dark:bg-white/[0.04] border-white/30 dark:border-white/[0.06] text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-white/[0.08]'
              }`}
            >
              {t('header.all')} ({totalTools})
            </button>
            {categoryKeys.map(key => (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className={`px-4 py-2 rounded-full text-sm font-medium backdrop-blur-lg border transition-all duration-300 ${
                  activeCategory === key
                    ? `${glass.pillActive} text-indigo-700 dark:text-indigo-300`
                    : 'bg-white/30 dark:bg-white/[0.04] border-white/30 dark:border-white/[0.06] text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-white/[0.08]'
                }`}
              >
                {categoryEmoji[key]} {t(menuConfig[key].titleKey)} ({menuConfig[key].items.length})
              </button>
            ))}
          </div>

          {/* Tools Grid — Glass cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredTools.map(item => {
              const isFav = favorites.includes(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group relative ${glass.card} ${glass.cardInset} p-4 transition-all duration-300 ${glass.cardHover}`}
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
                      <div className="w-10 h-10 bg-indigo-400/10 dark:bg-indigo-400/10 backdrop-blur-sm rounded-xl flex items-center justify-center text-xl border border-indigo-200/20 dark:border-indigo-500/10 group-hover:bg-indigo-400/15 transition-colors">
                        {item.icon}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center gap-1.5">
                        {t(item.labelKey)}
                        {isNewTool(item) && (
                          <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full leading-none">
                            NEW
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{t(item.descriptionKey)}</p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>

          {filteredTools.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>{t('searchDialog.noResults')}</p>
            </div>
          )}
        </section>

        {/* ===== FEATURES ===== */}
        <section className="py-12 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">{t('homePage.features.title')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Zap, key: 'homePage.features.free', desc: 'homePage.features.freeDesc', gradient: 'from-yellow-400/10 to-amber-400/5' },
              { icon: Smartphone, key: 'homePage.features.pwa', desc: 'homePage.features.pwaDesc', gradient: 'from-blue-400/10 to-cyan-400/5' },
              { icon: WifiOff, key: 'homePage.features.offline', desc: 'homePage.features.offlineDesc', gradient: 'from-emerald-400/10 to-green-400/5' },
              { icon: Moon, key: 'homePage.features.darkMode', desc: 'homePage.features.darkModeDesc', gradient: 'from-violet-400/10 to-purple-400/5' },
            ].map((feat, i) => (
              <div key={i} className={`relative overflow-hidden ${glass.card} ${glass.cardInset} p-6 text-center hover:bg-white/60 dark:hover:bg-white/[0.08] transition-all duration-300`}>
                <div className={`absolute inset-0 bg-gradient-to-br ${feat.gradient} dark:opacity-50 rounded-2xl`} />
                <div className="relative z-10">
                  <feat.icon className="w-8 h-8 mx-auto mb-3 text-indigo-600 dark:text-indigo-400" />
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{t(feat.key)}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t(feat.desc)}</div>
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
