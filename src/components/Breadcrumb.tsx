'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'
import { useTranslations } from '@/lib/i18n/navigation'
import { menuConfig, categoryKeys, categoryHubs, type CategoryKey } from '@/config/menuConfig'

const GENERIC_SUBCATEGORIES = ['subcategory.others', 'subcategory.otherTools']

export default function Breadcrumb() {
  const rawPathname = usePathname()
  const pathname = rawPathname.replace(/\/$/, '') || '/'
  const t = useTranslations()

  // Find the current tool and its category from menuConfig
  let currentTool: { label: string; href: string } | null = null
  let categoryLabel = ''
  let categoryKey: CategoryKey | null = null

  for (const catKey of categoryKeys) {
    const category = menuConfig[catKey]
    const found = category.items.find((item) => item.href === pathname)
    if (found) {
      currentTool = { label: t(found.labelKey), href: found.href }
      // 상위 분류 이름("개발 도구"·"금융 계산기")은 디데이·택시비 같은 생활 도구와 맞지 않아 세부 분류를 먼저 쓴다.
      // '기타' 세부 분류는 이름이 없는 것과 같으므로 넓은 이름으로.
      categoryLabel = found.subcategory && !GENERIC_SUBCATEGORIES.includes(found.subcategory)
        ? t(found.subcategory)
        : catKey === 'calculators' ? t('navigation.calculators')
        : catKey === 'tools' ? t('toolsShowcase.categories.utility')
        : t(category.titleKey)
      categoryKey = catKey
      break
    }
  }

  // Don't render on home page or if tool not found
  if (!currentTool || !categoryKey || pathname === '/') return null

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: t('header.title'),
        item: 'https://toolhub.ai.kr',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: categoryLabel,
        item: `https://toolhub.ai.kr${categoryHubs[categoryKey]}/`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: currentTool.label,
        item: `https://toolhub.ai.kr${currentTool.href}`,
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav
        aria-label="Breadcrumb"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2"
      >
        <ol className="flex items-center gap-1 text-sm text-muted flex-wrap">
          <li>
            <Link prefetch={false}
              href="/"
              className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <Home className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('header.title')}</span>
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />
          </li>
          <li>
            <Link prefetch={false}
              href={categoryHubs[categoryKey]}
              className="text-faint hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {categoryLabel}
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />
          </li>
          <li>
            <span
              className="font-medium text-body"
              aria-current="page"
            >
              {currentTool.label}
            </span>
          </li>
        </ol>
      </nav>
    </>
  )
}
