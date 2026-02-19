'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import {
  Search, Star, TrendingUp, Zap, Smartphone, Moon, WifiOff, ArrowRight
} from 'lucide-react'
import { menuConfig, categoryKeys, type CategoryKey, type MenuItem } from '@/config/menuConfig'
import { getFavorites, toggleFavorite } from '@/utils/favorites'
import { usePopularTools } from '@/hooks/useToolAnalytics'
import SearchDialog from './SearchDialog'

const categoryMeta: Record<CategoryKey, {
  emoji: string
  bgLight: string
  bgDark: string
  borderLight: string
  borderDark: string
}> = {
  calculators: { emoji: '💰', bgLight: 'bg-blue-50', bgDark: 'dark:bg-blue-950/50', borderLight: 'border-blue-200', borderDark: 'dark:border-blue-800' },
  tools: { emoji: '🛠️', bgLight: 'bg-purple-50', bgDark: 'dark:bg-purple-950/50', borderLight: 'border-purple-200', borderDark: 'dark:border-purple-800' },
  media: { emoji: '🖼️', bgLight: 'bg-orange-50', bgDark: 'dark:bg-orange-950/50', borderLight: 'border-orange-200', borderDark: 'dark:border-orange-800' },
  health: { emoji: '❤️', bgLight: 'bg-green-50', bgDark: 'dark:bg-green-950/50', borderLight: 'border-green-200', borderDark: 'dark:border-green-800' },
  games: { emoji: '🎮', bgLight: 'bg-indigo-50', bgDark: 'dark:bg-indigo-950/50', borderLight: 'border-indigo-200', borderDark: 'dark:border-indigo-800' },
}

export default function HomePage() {
  const t = useTranslations()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<CategoryKey | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [favorites, setFavorites] = useState<string[]>([])
  const { popularTools, isLoading: isPopularLoading } = usePopularTools(5)

  useEffect(() => {
    setFavorites(getFavorites())
  }, [])

  const totalTools = useMemo(() => {
    return categoryKeys.reduce((sum, key) => sum + menuConfig[key].items.length, 0)
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
      } catch {
        return false
      }
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
        if (favorites.includes(item.href)) {
          items.push({ ...item, categoryKey: catKey })
        }
      }
    }
    return items
  }, [favorites])

  // Fallback curated popular tools when Supabase data is unavailable
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
    <div className="min-h-screen">
      {/* ===== HERO SECTION ===== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 dark:from-gray-900 dark:via-indigo-950 dark:to-purple-950">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-300 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="text-center">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
              {t('homePage.hero.title')}
            </h1>
            <p className="text-lg md:text-xl text-blue-100 dark:text-gray-300 max-w-3xl mx-auto mb-8">
              {t('homePage.hero.subtitle')}
            </p>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto">
              <button
                onClick={() => setIsSearchOpen(true)}
                className="w-full flex items-center gap-3 px-6 py-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 transition-all group cursor-text"
              >
                <Search className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                <span className="flex-1 text-left">{t('homePage.hero.searchPlaceholder')}</span>
                <kbd className="hidden sm:inline-flex px-2 py-1 text-xs font-mono text-gray-400 bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                  Ctrl+K
                </kbd>
              </button>
            </div>

            {/* Quick Stats */}
            <div className="flex flex-wrap justify-center gap-6 md:gap-10 mt-10">
              {categoryKeys.map(key => (
                <div key={key} className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-white">
                    {menuConfig[key].items.length}
                  </div>
                  <div className="text-sm text-blue-200 dark:text-gray-400">
                    {t(menuConfig[key].titleKey)}
                  </div>
                </div>
              ))}
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-yellow-300">
                  {totalTools}+
                </div>
                <div className="text-sm text-blue-200 dark:text-gray-400">
                  {t('homePage.hero.totalTools')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ===== POPULAR TOOLS TOP 5 ===== */}
        <section className="py-12">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-6 h-6 text-red-500" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('homePage.popular.title')}
            </h2>
          </div>

          {isPopularLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
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
                  className="group relative bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all hover:-translate-y-1"
                >
                  <div className="absolute -top-2 -left-2 w-7 h-7 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md">
                    {index + 1}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{tool.icon}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
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

        {/* ===== CATEGORY SHOWCASE ===== */}
        <section className="py-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            {t('homePage.categories.title')}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {categoryKeys.map(key => {
              const meta = categoryMeta[key]
              return (
                <button
                  key={key}
                  onClick={() => {
                    setActiveCategory(key)
                    document.getElementById('tools-grid')?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  className={`group relative p-6 rounded-2xl border-2 transition-all text-left ${
                    activeCategory === key
                      ? 'border-blue-500 dark:border-blue-400 shadow-lg scale-[1.02]'
                      : `${meta.borderLight} ${meta.borderDark} hover:shadow-md`
                  } ${meta.bgLight} ${meta.bgDark}`}
                >
                  <div className="text-3xl mb-2">{meta.emoji}</div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    {t(menuConfig[key].titleKey)}
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {menuConfig[key].items.length}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {t('homePage.categories.toolCount')}
                  </div>
                  <ArrowRight className="absolute bottom-4 right-4 w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                </button>
              )
            })}
          </div>
        </section>

        {/* ===== FAVORITES SECTION ===== */}
        {favoritedItems.length > 0 && (
          <section className="py-8">
            <div className="flex items-center gap-2 mb-6">
              <Star className="w-5 h-5 text-yellow-500 fill-current" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {t('favorites.title')}
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {favoritedItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group relative bg-yellow-50 dark:bg-yellow-900/10 rounded-xl border border-yellow-200 dark:border-yellow-800 p-4 hover:shadow-lg transition-all hover:-translate-y-1"
                >
                  <button
                    onClick={(e) => handleToggleFavorite(e, item.href)}
                    className="absolute top-2 right-2 p-1 rounded-full text-yellow-500 hover:text-yellow-600"
                    aria-label={t('favorites.remove')}
                  >
                    <Star className="w-4 h-4 fill-current" />
                  </button>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center text-xl">
                      {item.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
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

        {/* ===== ALL TOOLS GRID ===== */}
        <section id="tools-grid" className="py-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('homePage.allTools.title')}
            </h2>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('homePage.allTools.filterPlaceholder')}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeCategory === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {t('header.all')} ({totalTools})
            </button>
            {categoryKeys.map(key => (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {categoryMeta[key].emoji} {t(menuConfig[key].titleKey)} ({menuConfig[key].items.length})
              </button>
            ))}
          </div>

          {/* Tools Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredTools.map(item => {
              const isFav = favorites.includes(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 hover:-translate-y-1"
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
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-800 transition-colors text-xl">
                        {item.icon}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {t(item.labelKey)}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                        {t(item.descriptionKey)}
                      </p>
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

        {/* ===== FEATURES HIGHLIGHT ===== */}
        <section className="py-12 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            {t('homePage.features.title')}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Zap, key: 'homePage.features.free', desc: 'homePage.features.freeDesc' },
              { icon: Smartphone, key: 'homePage.features.pwa', desc: 'homePage.features.pwaDesc' },
              { icon: WifiOff, key: 'homePage.features.offline', desc: 'homePage.features.offlineDesc' },
              { icon: Moon, key: 'homePage.features.darkMode', desc: 'homePage.features.darkModeDesc' },
            ].map((feat, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 text-center hover:shadow-md transition-shadow">
                <feat.icon className="w-8 h-8 mx-auto mb-3 text-blue-600" />
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {t(feat.key)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t(feat.desc)}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <SearchDialog isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  )
}
