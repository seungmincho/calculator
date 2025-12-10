'use client'

import { useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Wrench } from 'lucide-react'
import { menuConfig, categoryKeys } from '@/config/menuConfig'

export default function ToolsShowcase() {
  const t = useTranslations()
  const pathname = usePathname()

  // 카테고리 타이틀 키 매핑
  const categoryTitleKeys: Record<string, string> = {
    calculators: 'toolsShowcase.categories.financial',
    tools: 'toolsShowcase.categories.development',
    health: 'toolsShowcase.categories.health',
    games: 'toolsShowcase.categories.games',
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
                    // 현재 페이지는 링크가 아닌 현재 상태 표시
                    return (
                      <div
                        key={item.href}
                        className="group bg-blue-50 dark:bg-blue-950 rounded-lg border-2 border-blue-300 dark:border-blue-600 p-4 relative"
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
                      className="group bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 hover:-translate-y-1"
                    >
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
