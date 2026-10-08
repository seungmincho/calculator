'use client'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/algorithmHub'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { algorithms, categoryLabels, difficultyLabels, type AlgorithmCategory } from '@/config/algorithmConfig'

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

  return (
    <nav className="p-4 space-y-2">
      {/* Hub link */}
      <Link
        href="/algorithm"
        onClick={onNavigate}
        className={`block px-3 py-2 rounded-lg font-medium transition-colors ${
          pathname === '/algorithm' || pathname === '/algorithm/'
            ? 'bg-primary-soft text-primary border-l-2 border-primary'
            : 'text-body hover:bg-subtle'
        }`}
      >
        {t('title')}
      </Link>

      <div className="border-t border-line my-2" />

      {/* Category accordion */}
      {(Object.entries(categories) as [AlgorithmCategory, typeof algorithms][]).map(([cat, algos]) => {
        const isOpen = openCategories.has(cat)

        return (
          <div key={cat}>
            <button
              onClick={() => toggleCategory(cat)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors bg-soft text-body`}
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
                        <span className="flex items-center gap-2 px-3 py-1.5 text-sm text-faint cursor-not-allowed">
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
                              ? 'bg-primary-soft text-primary border-l-2 border-primary font-medium'
                              : 'text-sub hover:bg-subtle'
                          }`}
                        >
                          <span>{algo.icon}</span>
                          <span>{t(`algorithms.${algo.labelKey}.title`)}</span>
                          <span className="text-xs text-faint ml-auto">{difficultyLabels[algo.difficulty]}</span>
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
      <div className="border-t border-line my-3" />
      <div className="px-3 py-2 text-xs text-muted">
        {t('sidebar.tip')}
      </div>
    </nav>
  )
}
