'use client'
import ToolIcon from './ToolIcon'

import { useMemo } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n/shared'
import { menuConfig, categoryKeys, type MenuItem } from '@/config/menuConfig'
import { curatedRelated } from '@/config/relatedTools'

// Deterministic shuffle based on pathname (consistent per page, different across pages)
function seededShuffle<T>(arr: T[], seed: string): T[] {
  const result = [...arr]
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0
  }
  for (let i = result.length - 1; i > 0; i--) {
    hash = ((hash << 5) - hash + i) | 0
    const j = Math.abs(hash) % (i + 1)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

const itemByHref = new Map(categoryKeys.flatMap((k) => menuConfig[k].items).map((item) => [item.href, item]))

export default function RelatedTools() {
  const rawPathname = usePathname()
  const pathname = rawPathname.replace(/\/$/, '') || '/'
  const t = useTranslations()

  // 1) 큐레이션(함께 쓰면 좋은 도구) → 2) 같은 서브카테고리 → 3) 같은 카테고리. 다른 카테고리 랜덤 추천은 없음.
  const { curated, related } = useMemo(() => {
    const catKey = categoryKeys.find((k) => menuConfig[k].items.some((item) => item.href === pathname))
    if (!catKey || pathname === '/') return { curated: [], related: [] }

    const curated = (curatedRelated[pathname] ?? [])
      .map((href) => itemByHref.get(href))
      .filter((item): item is MenuItem => !!item)
    const shown = new Set([pathname, ...curated.map((item) => item.href)])
    const subcategory = itemByHref.get(pathname)?.subcategory
    const others = menuConfig[catKey].items.filter((item) => !shown.has(item.href))
    const sameSub = subcategory ? others.filter((item) => item.subcategory === subcategory) : []
    const rest = others.filter((item) => !sameSub.includes(item))
    const related = [...seededShuffle(sameSub, pathname), ...seededShuffle(rest, pathname)].slice(0, curated.length ? 4 : 8)
    return { curated, related }
  }, [pathname])

  if (curated.length === 0 && related.length === 0) return null

  const renderToolCard = (item: MenuItem) => (
    <Link prefetch={false}
      key={item.href}
      href={item.href}
      className="flex items-center gap-3 p-3 ui-card hover:border-primary transition-colors group"
    >
      <ToolIcon href={item.href} size="md" />
      <div className="min-w-0">
        <div className="text-sm font-medium text-fg group-hover:text-primary truncate">
          {t(item.labelKey)}
        </div>
        <div className="text-xs text-muted truncate">
          {t(item.descriptionKey)}
        </div>
      </div>
    </Link>
  )

  // 6개는 3열, 그 외 4열 — 빈 칸 없이 줄이 채워지게
  const renderSection = (title: string, items: MenuItem[]) => items.length > 0 && (
    <div>
      <h3 className="text-lg font-semibold text-body mb-4">{title}</h3>
      <div className={`grid grid-cols-2 gap-3 ${items.length % 3 === 0 ? 'sm:grid-cols-3' : 'sm:grid-cols-4'}`}>
        {items.map(renderToolCard)}
      </div>
    </div>
  )

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {renderSection(t('relatedTools.curated'), curated)}
      {renderSection(t('relatedTools.title'), related)}
    </section>
  )
}
