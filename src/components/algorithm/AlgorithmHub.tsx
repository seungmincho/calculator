'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from '@/lib/i18n'
import Link from 'next/link'
import { LayoutGrid, List } from 'lucide-react'
import { algorithms, categoryColors, categoryLabels, difficultyLabels, type AlgorithmCategory } from '@/config/algorithmConfig'
import AlgorithmCard from './AlgorithmCard'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

type ViewMode = 'list' | 'card'

export default function AlgorithmHub() {
  const t = useTranslations('algorithmHub')
  const [activeFilter, setActiveFilter] = useState<AlgorithmCategory | 'all'>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  const filteredAlgorithms = useMemo(
    () => activeFilter === 'all' ? algorithms : algorithms.filter(a => a.category === activeFilter),
    [activeFilter]
  )

  // Group by category for list view
  const groupedAlgorithms = useMemo(() => {
    const groups: Record<string, typeof algorithms> = {}
    for (const algo of filteredAlgorithms) {
      if (!groups[algo.category]) groups[algo.category] = []
      groups[algo.category].push(algo)
    }
    return groups
  }, [filteredAlgorithms])

  const categories = Object.keys(categoryLabels) as AlgorithmCategory[]

  const filterColorClasses: Record<string, string> = {
    red: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
    blue: 'bg-soft text-sub border-line',
    purple: 'bg-soft text-sub border-line',
    amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    emerald: 'bg-soft text-sub border-line',
    teal: 'bg-soft text-sub border-line',
    cyan: 'bg-soft text-sub border-line',
    pink: 'bg-soft text-sub border-line',
    indigo: 'bg-soft text-sub border-line',
    rose: 'bg-soft text-sub border-line',
    sky: 'bg-soft text-sub border-line',
  }

  const chipColorClasses: Record<string, string> = {
    red: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    blue: 'bg-soft text-sub',
    purple: 'bg-soft text-sub',
    amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    emerald: 'bg-soft text-sub',
    teal: 'bg-soft text-sub',
    cyan: 'bg-soft text-sub',
    pink: 'bg-soft text-sub',
    indigo: 'bg-soft text-sub',
    rose: 'bg-soft text-sub',
    sky: 'bg-soft text-sub',
  }

  const headerBgClasses: Record<string, string> = {
    red: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800',
    blue: 'bg-subtle border-line',
    purple: 'bg-subtle border-line',
    amber: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
    emerald: 'bg-subtle border-line',
    teal: 'bg-subtle border-line',
    cyan: 'bg-subtle border-line',
    pink: 'bg-subtle border-line',
    indigo: 'bg-subtle border-line',
    rose: 'bg-subtle border-line',
    sky: 'bg-subtle border-line',
  }

  return (
    <div className="space-y-8">
      <Breadcrumb />

      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-fg">
          {t('title')}
        </h1>
        <p className="text-muted mt-2 max-w-2xl mx-auto">
          {t('description')}
        </p>
        <p className="text-sm text-faint mt-1">
          {t('totalCount', { count: algorithms.length })}
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
            const color = categoryColors[cat]
            const isActive = activeFilter === cat
            const count = algorithms.filter(a => a.category === cat).length
            return (
              <button
                key={cat}
                onClick={() => setActiveFilter(cat)}
                className={`px-4 py-1.5 text-sm rounded-full border transition-colors ${
                  isActive
                    ? filterColorClasses[color] || filterColorClasses.blue
                    : 'bg-surface text-sub border-line hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {t(categoryLabels[cat])} ({count})
              </button>
            )
          })}
        </div>
        {/* View toggle */}
        <div className="flex items-center bg-surface rounded-lg border border-line p-0.5">
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === 'list'
                ? 'bg-primary-soft text-primary'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
            title={t('view.list')}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('card')}
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === 'card'
                ? 'bg-primary-soft text-primary'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
            title={t('view.card')}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-6">
          {(Object.entries(groupedAlgorithms) as [AlgorithmCategory, typeof algorithms][]).map(([cat, algos]) => {
            const color = categoryColors[cat]
            return (
              <div key={cat} className={`rounded-xl border overflow-hidden ${headerBgClasses[color] || headerBgClasses.blue}`}>
                {/* Category header */}
                <div className="px-4 py-2.5 flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${chipColorClasses[color] || chipColorClasses.blue}`}>
                    {t(categoryLabels[cat])}
                  </span>
                  <span className="text-xs text-faint">{algos.length}개</span>
                </div>
                {/* Algorithm rows */}
                <div className="bg-white/80 dark:bg-gray-800/80">
                  {algos.map((algo, i) => (
                    <Link
                      key={algo.id}
                      href={algo.href}
                      className={`flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors group ${
                        i > 0 ? 'border-t border-line' : ''
                      }`}
                    >
                      <span className="text-lg w-7 text-center flex-shrink-0">{algo.icon}</span>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-fg text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {t(`algorithms.${algo.labelKey}.title`)}
                        </span>
                        <span className="hidden sm:inline text-faint text-xs ml-2">
                          {t(`algorithms.${algo.labelKey}.description`)}
                        </span>
                      </div>
                      <span className="text-xs text-faint flex-shrink-0">
                        {difficultyLabels[algo.difficulty]}
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
          {filteredAlgorithms.map(algo => (
            <AlgorithmCard key={algo.id} algorithm={algo} />
          ))}
        </div>
      )}

      {/* Coming soon note */}
      {filteredAlgorithms.some(a => a.status === 'coming-soon') && (
        <p className="text-center text-sm text-faint">
          {t('comingSoon')}
        </p>
      )}

      <div className="mt-8">
        <RelatedTools />
      </div>
    </div>
  )
}
