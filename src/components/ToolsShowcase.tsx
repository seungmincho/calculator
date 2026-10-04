'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from '@/lib/i18n/shared'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Wrench, Star, ChevronDown } from 'lucide-react'
import ToolIcon from './ToolIcon'
import { glassCard, glassInset } from '@/lib/glass'
import { menuConfig, categoryKeys, isNewTool, type MenuItem } from '@/config/menuConfig'
import { getFavorites, toggleFavorite } from '@/utils/favorites'

export default function ToolsShowcase() {
  const t = useTranslations()
  const pathname = usePathname()
  const [favorites, setFavorites] = useState<string[]>([])
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    setFavorites(getFavorites())
  }, [])

  // Hide on home page since HomePage has its own tools grid
  if (pathname === '/') return null

  const totalTools = categoryKeys.reduce((sum, key) => sum + menuConfig[key].items.length, 0)

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
        className={`p-1 rounded-md transition-opacity ${isFav ? 'opacity-100 text-amber-400' : 'opacity-0 group-hover:opacity-100 focus:opacity-100 text-faint hover:text-amber-400'}`}
        aria-label={isFav ? t('favorites.remove') : t('favorites.add')}
      >
        <Star className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
      </button>
    )
  }

  const renderToolCard = (item: MenuItem, isCurrentPage: boolean) => {
    const body = (
      <>
        <ToolIcon href={item.href} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[15px] font-semibold text-fg">
            <span className="truncate">{t(item.labelKey)}</span>
            {isCurrentPage && <span className="shrink-0 text-[11px] font-semibold text-primary">{t('toolsShowcase.currentPage')}</span>}
            {!isCurrentPage && isNewTool(item) && <span className="shrink-0 text-[10px] font-bold text-primary">NEW</span>}
          </div>
          <div className="text-[13px] text-muted truncate">{t(item.descriptionKey)}</div>
        </div>
      </>
    )
    if (isCurrentPage) {
      return <div key={item.href} className="flex items-center gap-3 px-3 py-3 rounded-xl bg-subtle">{body}</div>
    }
    return (
      <Link prefetch={false} key={item.href} href={item.href} className="group relative flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-subtle transition-colors">
        {body}
        {renderFavoriteButton(item.href)}
      </Link>
    )
  }

  // Group items by subcategory for a given category
  const getSubcategoryGroups = (items: MenuItem[]) => {
    const groups: Map<string, MenuItem[]> = new Map()

    for (const item of items) {
      const key = item.subcategory || ''
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(item)
    }

    return groups
  }

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 mb-8">
      {/* Collapsed header - click to expand */}
      {!isExpanded && (
        <div className="text-center">
          <button
            onClick={() => setIsExpanded(true)}
            aria-expanded={false}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-line text-sub hover:text-fg hover:bg-subtle transition-colors"
          >
            <span className="text-[15px] font-semibold">
              {t('toolsShowcase.title')}
            </span>
            <span className="text-sm text-muted">
              ({totalTools})
            </span>
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 접힘: 크롤러용 경량 링크 목록만 (카드 242개 = 페이지당 ~500KB라 펼칠 때만 렌더) */}
      {!isExpanded && (
        <nav hidden aria-label={t('toolsShowcase.title')}>
          {categoryKeys.map((categoryKey) => (
            <ul key={categoryKey}>
              {menuConfig[categoryKey].items.map((item) => (
                <li key={item.href}><a href={item.href}>{t(item.labelKey)}</a></li>
              ))}
            </ul>
          ))}
        </nav>
      )}

      {isExpanded && (
      <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-fg mb-1">
          {t('toolsShowcase.title')}
        </h2>
        <p className="text-muted">
          {t('toolsShowcase.description')}
        </p>
      </div>

      {/* Favorites Section */}
      {favoritedItems.length > 0 && (
        <div className="space-y-2 mb-10">
          <h3 className="text-lg font-bold text-fg px-1">
            {t('favorites.title')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-2">
            {favoritedItems.map((item) => renderToolCard(item, false))}
          </div>
        </div>
      )}

      <div className="space-y-12">
        {categoryKeys.map((categoryKey) => {
          const category = menuConfig[categoryKey]
          if (!category?.items?.length) return null

          const subcategoryGroups = getSubcategoryGroups(category.items)
          const hasSubcategories = Array.from(subcategoryGroups.keys()).some(k => k !== '')

          return (
            <div key={categoryKey} className="space-y-2">
              <h3 className="text-lg font-bold text-fg px-1">
                {t(categoryTitleKeys[categoryKey])}
              </h3>

              {hasSubcategories ? (
                // Render with subcategory grouping
                <div>
                  {Array.from(subcategoryGroups.entries()).map(([subcatKey, items]) => (
                    <div key={subcatKey || '_ungrouped'}>
                      {subcatKey && (
                        <h4 className="text-[13px] font-semibold text-muted mb-1 mt-3 px-1">
                          {t(subcatKey)}
                        </h4>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-2">
                        {items.map((item) => renderToolCard(item, pathname === item.href))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Render flat grid (no subcategories, e.g. media, health, games)
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-2">
                  {category.items.map((item) => renderToolCard(item, pathname === item.href))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="text-center mt-12 flex flex-col items-center gap-3">
        <Link prefetch={false}
          href="/tips"
          className="ui-btn-soft px-5 py-2.5 text-sm"
        >
          {t('toolsShowcase.viewTips')}
        </Link>
        <button
          onClick={() => setIsExpanded(false)}
          aria-expanded={true}
          className="text-sm text-muted hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          {t('toolsShowcase.collapse')}
        </button>
      </div>
      </div>
      )}
    </section>
  )
}
