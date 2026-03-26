'use client'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { algorithms, categoryColors, categoryLabels, difficultyLabels, type AlgorithmCategory } from '@/config/algorithmConfig'

interface AlgorithmSidebarProps {
  onNavigate?: () => void
}

export default function AlgorithmSidebar({ onNavigate }: AlgorithmSidebarProps) {
  const pathname = usePathname()
  const t = useTranslations('algorithmHub')

  // Group by category
  const categories = algorithms.reduce((acc, algo) => {
    if (!acc[algo.category]) acc[algo.category] = []
    acc[algo.category].push(algo)
    return acc
  }, {} as Record<AlgorithmCategory, typeof algorithms>)

  // All categories open by default
  const [openCategories, setOpenCategories] = useState<Set<string>>(
    new Set(Object.keys(categories))
  )

  const toggleCategory = (cat: string) => {
    setOpenCategories(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  // Category color mapping for chips - use explicit Tailwind classes
  const catColorClasses: Record<string, { bg: string; text: string; border: string }> = {
    red: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', border: 'border-red-200 dark:border-red-800' },
    blue: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
    purple: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800' },
    amber: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
    emerald: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
  }

  return (
    <nav className="p-4 space-y-2">
      {/* Hub link */}
      <Link
        href="/algorithm"
        onClick={onNavigate}
        className={`block px-3 py-2 rounded-lg font-medium transition-colors ${
          pathname === '/algorithm' || pathname === '/algorithm/'
            ? 'bg-blue-50/80 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-l-2 border-blue-500'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-800/50'
        }`}
      >
        🏠 {t('title')}
      </Link>

      <div className="border-t border-gray-200/50 dark:border-gray-700/50 my-2" />

      {/* Category accordion */}
      {(Object.entries(categories) as [AlgorithmCategory, typeof algorithms][]).map(([cat, algos]) => {
        const color = categoryColors[cat]
        const classes = catColorClasses[color] || catColorClasses.blue
        const isOpen = openCategories.has(cat)

        return (
          <div key={cat}>
            <button
              onClick={() => toggleCategory(cat)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${classes.bg} ${classes.text}`}
            >
              <span>{t(categoryLabels[cat])}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
              <div className="mt-1 ml-2 space-y-0.5">
                {algos.map(algo => {
                  const isActive = pathname === algo.href || pathname === algo.href + '/'
                  const isComingSoon = algo.status === 'coming-soon'

                  return (
                    <div key={algo.id}>
                      {isComingSoon ? (
                        <span className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 dark:text-gray-600 cursor-not-allowed">
                          <span>{algo.icon}</span>
                          <span>{t(`algorithms.${algo.labelKey}.title`)}</span>
                          <span className="text-xs opacity-50">Soon</span>
                        </span>
                      ) : (
                        <Link
                          href={algo.href}
                          onClick={onNavigate}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                            isActive
                              ? 'bg-blue-50/80 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-l-2 border-blue-500 font-medium'
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-gray-800/50'
                          }`}
                        >
                          <span>{algo.icon}</span>
                          <span>{t(`algorithms.${algo.labelKey}.title`)}</span>
                          <span className="text-xs text-gray-400 ml-auto">{difficultyLabels[algo.difficulty]}</span>
                        </Link>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {/* Learning tip */}
      <div className="border-t border-gray-200/50 dark:border-gray-700/50 my-3" />
      <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-500">
        💡 {t('sidebar.tip')}
      </div>
    </nav>
  )
}
