'use client'

import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import { menuConfig, isNewTool, type CategoryKey, type MenuItem } from '@/config/menuConfig'
import { glassCard } from '@/lib/glass'

/** 카테고리 허브: 서브카테고리별 전체 도구 링크 그리드 (raw HTML에 모든 링크 노출 — 크롤 발견용) */
export default function CategoryHub({ category }: { category: CategoryKey }) {
  const t = useTranslations()
  const groups = new Map<string, MenuItem[]>()
  for (const item of menuConfig[category].items) {
    const key = item.subcategory ?? ''
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(item)
  }

  return (
    <div className="space-y-10">
      {Array.from(groups.entries()).map(([sub, items]) => (
        <section key={sub || 'all'}>
          {sub && (
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t(sub)} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({items.length})</span>
            </h2>
          )}
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map(item => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`${glassCard} flex items-start gap-3 p-4 h-full hover:bg-white/80 dark:hover:bg-white/[0.14] hover:-translate-y-0.5 transition-all`}
                >
                  <span className="text-2xl leading-none mt-0.5">{item.icon}</span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 font-medium text-gray-900 dark:text-white">
                      {t(item.labelKey)}
                      {isNewTool(item) && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">NEW</span>
                      )}
                    </span>
                    <span className="block text-sm text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">{t(item.descriptionKey)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
