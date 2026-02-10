'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { menuConfig, categoryKeys, type CategoryKey } from '@/config/menuConfig'

export default function RelatedTools() {
  const rawPathname = usePathname()
  const pathname = rawPathname.replace(/\/$/, '') || '/'
  const t = useTranslations()

  // Find the current tool's category
  let currentCategory: CategoryKey | null = null
  for (const catKey of categoryKeys) {
    const found = menuConfig[catKey].items.find((item) => item.href === pathname)
    if (found) {
      currentCategory = catKey
      break
    }
  }

  if (!currentCategory || pathname === '/') return null

  // Get sibling tools (same category, excluding current), max 4
  const siblings = menuConfig[currentCategory].items
    .filter((item) => item.href !== pathname)
    .slice(0, 4)

  if (siblings.length === 0) return null

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
        {t('relatedTools.title')}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {siblings.map((item) => (
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
        ))}
      </div>
    </section>
  )
}
