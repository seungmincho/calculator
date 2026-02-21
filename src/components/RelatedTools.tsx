'use client'

import { useMemo } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { menuConfig, categoryKeys, type CategoryKey, type MenuItem } from '@/config/menuConfig'

// Deterministic shuffle based on pathname (consistent per page, different across pages)
function seededShuffle<T>(arr: T[], seed: string): T[] {
  const result = [...arr]
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0
  }
  for (let i = result.length - 1; i > 0; i--) {
    hash = ((hash << 5) - hash + i) | 0
    const j = Math.abs(hash) % (i + 1)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export default function RelatedTools() {
  const rawPathname = usePathname()
  const pathname = rawPathname.replace(/\/$/, '') || '/'
  const t = useTranslations()

  const { sameCategoryTools, crossCategoryTools, currentCategory } = useMemo(() => {
    let currentCat: CategoryKey | null = null
    for (const catKey of categoryKeys) {
      const found = menuConfig[catKey].items.find((item) => item.href === pathname)
      if (found) {
        currentCat = catKey
        break
      }
    }

    if (!currentCat) {
      return { sameCategoryTools: [], crossCategoryTools: [], currentCategory: null }
    }

    // Same category: shuffled, exclude current, take 4
    const sameCategory = seededShuffle(
      menuConfig[currentCat].items.filter((item) => item.href !== pathname),
      pathname
    ).slice(0, 4)

    // Cross category: pick 4 random tools from other categories
    const otherTools: MenuItem[] = []
    for (const catKey of categoryKeys) {
      if (catKey === currentCat) continue
      otherTools.push(...menuConfig[catKey].items)
    }
    const crossCategory = seededShuffle(otherTools, pathname + '_cross').slice(0, 4)

    return {
      sameCategoryTools: sameCategory,
      crossCategoryTools: crossCategory,
      currentCategory: currentCat,
    }
  }, [pathname])

  if (!currentCategory || pathname === '/') return null
  if (sameCategoryTools.length === 0 && crossCategoryTools.length === 0) return null

  const renderToolCard = (item: MenuItem) => (
    <Link
      key={item.href}
      href={item.href}
      className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all group"
    >
      <span className="text-2xl flex-shrink-0">{item.icon}</span>
      <div className="min-w-0">
        <div className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
          {t(item.labelKey)}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {t(item.descriptionKey)}
        </div>
      </div>
    </Link>
  )

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Same category recommendations */}
      {sameCategoryTools.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
            {t('relatedTools.title')}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {sameCategoryTools.map(renderToolCard)}
          </div>
        </div>
      )}

      {/* Cross category discovery */}
      {crossCategoryTools.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
            {t('relatedTools.discover') || '다른 도구 둘러보기'}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {crossCategoryTools.map(renderToolCard)}
          </div>
        </div>
      )}
    </section>
  )
}
