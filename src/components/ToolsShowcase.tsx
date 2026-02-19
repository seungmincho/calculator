'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Wrench, Star } from 'lucide-react'
import { menuConfig, categoryKeys, type MenuItem } from '@/config/menuConfig'
import { getFavorites, toggleFavorite } from '@/utils/favorites'

export default function ToolsShowcase() {
  const t = useTranslations()
  const pathname = usePathname()
  const [favorites, setFavorites] = useState<string[]>([])

  useEffect(() => {
    setFavorites(getFavorites())
  }, [])

  // Hide on home page since HomePage has its own tools grid
  if (pathname === '/') return null

  const handleToggleFavorite = (e: React.MouseEvent, href: string) => {
    e.preventDefault()
    e.stopPropagation()
    toggleFavorite(href)
    setFavorites(getFavorites())
  }

  // 카테고리 타이틀 키 매핑
  const categoryTitleKeys: Record<string, string> = {
    calculators: 'toolsShowcase.categories.financial',
    tools: 'toolsShowcase.categories.development',
    media: 'toolsShowcase.categories.media',
    health: 'toolsShowcase.categories.health',
    games: 'toolsShowcase.categories.games',
  }

  // Collect favorited items from all categories
  const favoritedItems: (MenuItem & { categoryKey: string })[] = []
  if (favorites.length > 0) {
    for (const catKey of categoryKeys) {
      for (const item of menuConfig[catKey].items) {
        if (favorites.includes(item.href)) {
          favoritedItems.push({ ...item, categoryKey: catKey })
        }
      }
    }
  }

  const renderFavoriteButton = (href: string) => {
    const isFav = favorites.includes(href)
    return (
      <button
        onClick={(e) => handleToggleFavorite(e, href)}
        className={`absolute top-2 right-2 p-1 rounded-full transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 ${
          isFav
            ? 'opacity-100 text-yellow-500 hover:text-yellow-600'
            : 'text-gray-300 dark:text-gray-600 hover:text-yellow-400'
        }`}
        aria-label={isFav ? t('favorites.remove') : t('favorites.add')}
      >
        <Star className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
      </button>
    )
  }

  return (
    <section className="mt-16 mb-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3">
          {t('toolsShowcase.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          {t('toolsShowcase.description')}
        </p>
      </div>

      {/* Favorites Section */}
      {favoritedItems.length > 0 && (
        <div className="space-y-4 mb-12">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 border-b border-yellow-300 dark:border-yellow-600 pb-2 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500 fill-current" />
            {t('favorites.title')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {favoritedItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group relative bg-yellow-50 dark:bg-yellow-900/10 rounded-lg border border-yellow-200 dark:border-yellow-800 p-4 hover:shadow-lg hover:border-yellow-400 dark:hover:border-yellow-600 transition-all duration-200 hover:-translate-y-1"
              >
                {renderFavoriteButton(item.href)}
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center text-xl">
                      {item.icon}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-yellow-700 dark:group-hover:text-yellow-400 transition-colors">
                      {t(item.labelKey)}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                      {t(item.descriptionKey)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-12">
        {categoryKeys.map((categoryKey) => {
          const category = menuConfig[categoryKey]
          if (!category?.items?.length) return null

          return (
            <div key={categoryKey} className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-2">
                {t(categoryTitleKeys[categoryKey])}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {category.items.map((item) => {
                  const isCurrentPage = pathname === item.href

                  if (isCurrentPage) {
                    return (
                      <div
                        key={item.href}
                        className="group relative bg-blue-50 dark:bg-blue-950 rounded-lg border-2 border-blue-300 dark:border-blue-600 p-4"
                      >
                        <div className="absolute top-2 right-2">
                          <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full">
                            {t('toolsShowcase.currentPage')}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-blue-200 dark:bg-blue-800 rounded-lg flex items-center justify-center text-xl">
                              {item.icon}
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                              {t(item.labelKey)}
                            </h4>
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 truncate">
                              {t(item.descriptionKey)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  }

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="group relative bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 hover:-translate-y-1"
                    >
                      {renderFavoriteButton(item.href)}
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-800 transition-colors text-xl">
                            {item.icon}
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {t(item.labelKey)}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                            {t(item.descriptionKey)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="text-center mt-12">
        <Link
          href="/tips"
          className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          <Wrench className="w-5 h-5 mr-2" />
          {t('toolsShowcase.viewTips')}
        </Link>
      </div>
    </section>
  )
}
