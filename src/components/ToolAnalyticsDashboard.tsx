'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { X, BarChart3, Trophy, Eye } from 'lucide-react'
import { getAllPopularTools } from '@/utils/toolAnalytics'
import { menuConfig, categoryKeys, type CategoryKey, type MenuItem } from '@/config/menuConfig'

interface EnrichedTool extends MenuItem {
  clickCount: number
  categoryKey: CategoryKey
}

interface ToolAnalyticsDashboardProps {
  isOpen: boolean
  onClose: () => void
}

const categoryColors: Record<CategoryKey, string> = {
  calculators: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  tools: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
  media: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
  health: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
  games: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300',
}

const categoryEmoji: Record<CategoryKey, string> = {
  calculators: '💰',
  tools: '🛠️',
  media: '🖼️',
  health: '❤️',
  games: '🎮',
}

export default function ToolAnalyticsDashboard({ isOpen, onClose }: ToolAnalyticsDashboardProps) {
  const t = useTranslations()
  const [allTools, setAllTools] = useState<EnrichedTool[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<CategoryKey | 'all'>('all')
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const lastFetchRef = useRef<number>(0)

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Auto-focus close button on open
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus()
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    // Cache: skip re-fetch if last fetch was < 5 min ago
    const now = Date.now()
    if (allTools.length > 0 && now - lastFetchRef.current < 5 * 60 * 1000) return

    const fetchAll = async () => {
      setIsLoading(true)
      try {
        const data = await getAllPopularTools()
        const enriched: EnrichedTool[] = []

        for (const entry of data) {
          for (const catKey of categoryKeys) {
            const found = menuConfig[catKey].items.find(
              item => item.href === entry.tool_href
            )
            if (found) {
              enriched.push({
                ...found,
                clickCount: entry.click_count,
                categoryKey: catKey,
              })
              break
            }
          }
        }

        // Add tools with 0 clicks
        for (const catKey of categoryKeys) {
          for (const item of menuConfig[catKey].items) {
            if (!enriched.some(e => e.href === item.href)) {
              enriched.push({
                ...item,
                clickCount: 0,
                categoryKey: catKey,
              })
            }
          }
        }

        // Sort by clickCount descending
        enriched.sort((a, b) => b.clickCount - a.clickCount)
        setAllTools(enriched)
        lastFetchRef.current = now
      } catch {
        setAllTools([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchAll()
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  const totalClicks = useMemo(() => {
    return allTools.reduce((sum, tool) => sum + tool.clickCount, 0)
  }, [allTools])

  const activeToolCount = useMemo(() => {
    return allTools.filter(tool => tool.clickCount > 0).length
  }, [allTools])

  const filteredTools = useMemo(() => {
    if (activeCategory === 'all') return allTools
    return allTools.filter(tool => tool.categoryKey === activeCategory)
  }, [allTools, activeCategory])

  const categoryStats = useMemo(() => {
    const stats: Record<string, { count: number; clicks: number }> = {}
    for (const catKey of categoryKeys) {
      const catTools = allTools.filter(tool => tool.categoryKey === catKey)
      stats[catKey] = {
        count: catTools.length,
        clicks: catTools.reduce((sum, tool) => sum + tool.clickCount, 0),
      }
    }
    return stats
  }, [allTools])

  const maxClicks = useMemo(() => {
    return filteredTools.length > 0 ? filteredTools[0].clickCount : 1
  }, [filteredTools])

  // Pre-compute rank map
  const rankMap = useMemo(() => {
    const map = new Map<string, number>()
    allTools.forEach((tool, i) => map.set(tool.href, i + 1))
    return map
  }, [allTools])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="analytics-title"
        className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 id="analytics-title" className="text-lg font-bold text-gray-900 dark:text-white">
                {t('analyticsDashboard.title')}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('analyticsDashboard.subtitle')}
              </p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label={t('analyticsDashboard.close')}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Summary Cards */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{totalClicks.toLocaleString()}</div>
              <div className="text-xs text-blue-600 dark:text-blue-400">{t('analyticsDashboard.totalVisits')}</div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/30 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{allTools.length}</div>
              <div className="text-xs text-purple-600 dark:text-purple-400">{t('analyticsDashboard.totalTools')}</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/30 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">{activeToolCount}</div>
              <div className="text-xs text-green-600 dark:text-green-400">{t('analyticsDashboard.activeTools')}</div>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/30 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                {activeToolCount > 0 ? Math.round(totalClicks / activeToolCount) : 0}
              </div>
              <div className="text-xs text-orange-600 dark:text-orange-400">{t('analyticsDashboard.avgVisits')}</div>
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeCategory === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {t('header.all')} ({allTools.length})
            </button>
            {categoryKeys.map(key => (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  activeCategory === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {categoryEmoji[key]} {t(menuConfig[key].titleKey)} ({categoryStats[key]?.clicks.toLocaleString() ?? 0})
              </button>
            ))}
          </div>
        </div>

        {/* Tool List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-xl animate-pulse">
                  <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2" />
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                  </div>
                  <div className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
              ))}
            </div>
          ) : filteredTools.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>{t('analyticsDashboard.noData')}</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredTools.map((tool) => {
                const percentage = maxClicks > 0 ? (tool.clickCount / maxClicks) * 100 : 0
                const globalRank = rankMap.get(tool.href) ?? allTools.length
                const isTop3 = globalRank <= 3

                return (
                  <Link
                    key={tool.href}
                    href={tool.href}
                    onClick={onClose}
                    className="group flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    {/* Rank */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                      isTop3
                        ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                    }`}>
                      {isTop3 ? <Trophy className="w-4 h-4" /> : globalRank}
                    </div>

                    {/* Icon */}
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xl shrink-0 bg-gray-50 dark:bg-gray-800">
                      {tool.icon}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                          {t(tool.labelKey)}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${categoryColors[tool.categoryKey]}`}>
                          {categoryEmoji[tool.categoryKey]}
                        </span>
                      </div>
                      {/* Bar */}
                      <div className="mt-1 h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isTop3
                              ? 'bg-gradient-to-r from-yellow-400 to-orange-500'
                              : 'bg-gradient-to-r from-blue-400 to-blue-600'
                          }`}
                          style={{ width: `${Math.max(percentage, 1)}%` }}
                        />
                      </div>
                    </div>

                    {/* Count */}
                    <div className="text-right shrink-0 ml-2">
                      <div className="flex items-center gap-1 text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
                        <Eye className="w-3.5 h-3.5 text-gray-400" />
                        {tool.clickCount.toLocaleString()}
                      </div>
                      {totalClicks > 0 && tool.clickCount > 0 && (
                        <div className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">
                          {((tool.clickCount / totalClicks) * 100).toFixed(1)}%
                        </div>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 shrink-0">
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
            {t('analyticsDashboard.footer')}
          </p>
        </div>
      </div>
    </div>
  )
}
