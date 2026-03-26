'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { algorithms, categoryColors, categoryLabels, type AlgorithmCategory } from '@/config/algorithmConfig'
import AlgorithmCard from './AlgorithmCard'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export default function AlgorithmHub() {
  const t = useTranslations('algorithmHub')
  const [activeFilter, setActiveFilter] = useState<AlgorithmCategory | 'all'>('all')

  const filteredAlgorithms = useMemo(
    () => activeFilter === 'all' ? algorithms : algorithms.filter(a => a.category === activeFilter),
    [activeFilter]
  )

  const categories = Object.keys(categoryLabels) as AlgorithmCategory[]

  const filterColorClasses: Record<string, string> = {
    red: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800',
    amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  }

  return (
    <div className="space-y-8">
      <Breadcrumb />

      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          🧠 {t('title')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-2xl mx-auto">
          {t('description')}
        </p>
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap justify-center gap-2">
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
          const color = categoryColors[cat]
          const isActive = activeFilter === cat
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
              {t(categoryLabels[cat])}
            </button>
          )
        })}
      </div>

      {/* Algorithm cards grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAlgorithms.map(algo => (
          <AlgorithmCard key={algo.id} algorithm={algo} />
        ))}
      </div>

      {/* Coming soon note */}
      {filteredAlgorithms.some(a => a.status === 'coming-soon') && (
        <p className="text-center text-sm text-gray-400 dark:text-gray-500">
          {t('comingSoon')}
        </p>
      )}

      <div className="mt-8">
        <RelatedTools />
      </div>
    </div>
  )
}
