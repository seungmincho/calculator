'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
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
    emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    rose: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800',
    amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  }

  const chipColorClasses: Record<string, string> = {
    emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    rose: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400',
    amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  }

  const headerBgClasses: Record<string, string> = {
    emerald: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800',
    blue: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
    rose: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800',
    amber: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
  }

  const cardBorderClasses: Record<string, string> = {
    emerald: 'border-emerald-200/50 dark:border-emerald-800/30 hover:shadow-emerald-500/20',
    blue: 'border-blue-200/50 dark:border-blue-800/30 hover:shadow-blue-500/20',
    rose: 'border-rose-200/50 dark:border-rose-800/30 hover:shadow-rose-500/20',
    amber: 'border-amber-200/50 dark:border-amber-800/30 hover:shadow-amber-500/20',
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          🖥️ {t('title')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-2xl mx-auto">
          {t('description')}
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
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
                : 'bg-white/50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
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
                    : 'bg-white/50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {t(csCategoryLabels[cat])} ({count})
              </button>
            )
          })}
        </div>
        <div className="flex items-center bg-white/50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 p-0.5">
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === 'list'
                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('card')}
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === 'card'
                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
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
                  <span className="text-xs text-gray-400 dark:text-gray-500">{items.length}개</span>
                </div>
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                  {items.map((item, i) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-3 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors group ${
                        i > 0 ? 'border-t border-gray-100 dark:border-gray-700/50' : ''
                      }`}
                    >
                      <span className="text-xl w-8 text-center flex-shrink-0">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-gray-900 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {t(`items.${item.labelKey}.title`)}
                        </span>
                        <p className="text-gray-400 dark:text-gray-500 text-xs mt-0.5 line-clamp-1">
                          {t(`items.${item.labelKey}.description`)}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
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
                className={`group block bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border rounded-2xl p-5 transition-all hover:shadow-lg ${cardBorderClasses[color]}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {t(`items.${item.labelKey}.title`)}
                      </h3>
                      <span className="text-xs text-gray-400">{difficultyLabels[item.difficulty]}</span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
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
