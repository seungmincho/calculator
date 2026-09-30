'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from '@/lib/i18n'
import Link from 'next/link'
import { LayoutGrid, List } from 'lucide-react'
import { csVisualizers, csCategoryColors, csCategoryLabels, difficultyLabels, type CsCategory } from '@/config/csVisualizerConfig'

type ViewMode = 'list' | 'card'

export default function CsVisualizerHub() {
  const t = useTranslations('csVisualizerHub')
  const [activeFilter, setActiveFilter] = useState<CsCategory | 'all'>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  const filteredItems = useMemo(
    () => activeFilter === 'all' ? csVisualizers : csVisualizers.filter(v => v.category === activeFilter),
    [activeFilter]
  )

  const groupedItems = useMemo(() => {
    const groups: Record<string, typeof csVisualizers> = {}
    for (const item of filteredItems) {
      if (!groups[item.category]) groups[item.category] = []
      groups[item.category].push(item)
    }
    return groups
  }, [filteredItems])

  const categories = Object.keys(csCategoryLabels) as CsCategory[]

  const filterColorClasses: Record<string, string> = {
    emerald: 'bg-soft text-sub border-line',
    blue: 'bg-soft text-sub border-line',
    rose: 'bg-soft text-sub border-line',
    amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  }

  const chipColorClasses: Record<string, string> = {
    emerald: 'bg-soft text-sub',
    blue: 'bg-soft text-sub',
    rose: 'bg-soft text-sub',
    amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  }

  const headerBgClasses: Record<string, string> = {
    emerald: 'bg-subtle border-line',
    blue: 'bg-subtle border-line',
    rose: 'bg-subtle border-line',
    amber: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
  }

  const cardBorderClasses: Record<string, string> = {
    emerald: 'border-line hover:shadow-emerald-500/20',
    blue: 'border-line hover:shadow-blue-500/20',
    rose: 'border-line hover:shadow-rose-500/20',
    amber: 'border-amber-200/50 dark:border-amber-800/30 hover:shadow-amber-500/20',
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-fg">
          🖥️ {t('title')}
        </h1>
        <p className="text-muted mt-2 max-w-2xl mx-auto">
          {t('description')}
        </p>
        <p className="text-sm text-faint mt-1">
          {t('totalCount', { count: csVisualizers.length })}
        </p>
      </div>

      {/* Filters + View Toggle */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="flex flex-wrap justify-center gap-2 flex-1">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-1.5 text-sm rounded-full border transition-colors ${
              activeFilter === 'all'
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-transparent'
                : 'bg-surface text-sub border-line hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {t('filter.all')}
          </button>
          {categories.map(cat => {
            const color = csCategoryColors[cat]
            const isActive = activeFilter === cat
            const count = csVisualizers.filter(v => v.category === cat).length
            return (
              <button
                key={cat}
                onClick={() => setActiveFilter(cat)}
                className={`px-4 py-1.5 text-sm rounded-full border transition-colors ${
                  isActive
                    ? filterColorClasses[color]
                    : 'bg-surface text-sub border-line hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {t(csCategoryLabels[cat])} ({count})
              </button>
            )
          })}
        </div>
        <div className="flex items-center bg-surface rounded-lg border border-line p-0.5">
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === 'list'
                ? 'bg-soft text-sub'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('card')}
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === 'card'
                ? 'bg-soft text-sub'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-6">
          {(Object.entries(groupedItems) as [CsCategory, typeof csVisualizers][]).map(([cat, items]) => {
            const color = csCategoryColors[cat]
            return (
              <div key={cat} className={`rounded-xl border overflow-hidden ${headerBgClasses[color]}`}>
                <div className="px-4 py-2.5 flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${chipColorClasses[color]}`}>
                    {t(csCategoryLabels[cat])}
                  </span>
                  <span className="text-xs text-faint">{items.length}개</span>
                </div>
                <div className="bg-white/80 dark:bg-gray-800/80">
                  {items.map((item, i) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-3 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors group ${
                        i > 0 ? 'border-t border-line' : ''
                      }`}
                    >
                      <span className="text-xl w-8 text-center flex-shrink-0">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-fg text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {t(`items.${item.labelKey}.title`)}
                        </span>
                        <p className="text-faint text-xs mt-0.5 line-clamp-1">
                          {t(`items.${item.labelKey}.description`)}
                        </p>
                      </div>
                      <span className="text-xs text-faint flex-shrink-0">
                        {difficultyLabels[item.difficulty]}
                      </span>
                      <span className="text-xs text-blue-500 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        →
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Card View */}
      {viewMode === 'card' && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map(item => {
            const color = csCategoryColors[item.category]
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`group block bg-surface border rounded-2xl p-5 transition-all hover:shadow-lg ${cardBorderClasses[color]}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-fg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {t(`items.${item.labelKey}.title`)}
                      </h3>
                      <span className="text-xs text-gray-400">{difficultyLabels[item.difficulty]}</span>
                    </div>
                    <p className="text-sm text-muted mt-1 line-clamp-2">
                      {t(`items.${item.labelKey}.description`)}
                    </p>
                    <span className={`inline-block mt-2 px-2 py-0.5 text-xs rounded-full ${chipColorClasses[color]}`}>
                      {t(csCategoryLabels[item.category])}
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Algorithm Hub link */}
      <div className="text-center pt-4">
        <Link
          href="/algorithm"
          className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          🧠 {t('algorithmLink')}
          <span>→</span>
        </Link>
      </div>
    </div>
  )
}
