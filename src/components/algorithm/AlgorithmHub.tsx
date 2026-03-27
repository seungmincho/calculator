'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
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
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800',
    amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    teal: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800',
    cyan: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800',
    pink: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400 border-pink-200 dark:border-pink-800',
    indigo: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
    rose: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800',
    sky: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800',
  }

  const chipColorClasses: Record<string, string> = {
    red: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
    amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    teal: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400',
    cyan: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400',
    pink: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400',
    indigo: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400',
    rose: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400',
    sky: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400',
  }

  const headerBgClasses: Record<string, string> = {
    red: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800',
    blue: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
    purple: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800',
    amber: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
    emerald: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800',
    teal: 'bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-800',
    cyan: 'bg-cyan-50 dark:bg-cyan-950/30 border-cyan-200 dark:border-cyan-800',
    pink: 'bg-pink-50 dark:bg-pink-950/30 border-pink-200 dark:border-pink-800',
    indigo: 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800',
    rose: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800',
    sky: 'bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800',
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
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
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
                : 'bg-white/50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
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
                    : 'bg-white/50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {t(categoryLabels[cat])} ({count})
              </button>
            )
          })}
        </div>
        {/* View toggle */}
        <div className="flex items-center bg-white/50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 p-0.5">
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === 'list'
                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
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
                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
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
                  <span className="text-xs text-gray-400 dark:text-gray-500">{algos.length}개</span>
                </div>
                {/* Algorithm rows */}
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                  {algos.map((algo, i) => (
                    <Link
                      key={algo.id}
                      href={algo.href}
                      className={`flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors group ${
                        i > 0 ? 'border-t border-gray-100 dark:border-gray-700/50' : ''
                      }`}
                    >
                      <span className="text-lg w-7 text-center flex-shrink-0">{algo.icon}</span>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-gray-900 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {t(`algorithms.${algo.labelKey}.title`)}
                        </span>
                        <span className="hidden sm:inline text-gray-400 dark:text-gray-500 text-xs ml-2">
                          {t(`algorithms.${algo.labelKey}.description`)}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
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
