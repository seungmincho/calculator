'use client'

import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { menuConfig, categoryKeys } from '@/config/menuConfig'

const categoryToAppCategory: Record<string, string> = {
  calculators: 'FinanceApplication',
  tools: 'DeveloperApplication',
  health: 'HealthApplication',
  games: 'GameApplication',
}

export default function ToolJsonLd() {
  const rawPathname = usePathname()
  const pathname = rawPathname.replace(/\/$/, '') || '/'
  const t = useTranslations()

  // Find the current tool from menuConfig
  let toolLabel = ''
  let toolDescription = ''
  let appCategory = 'WebApplication'

  for (const catKey of categoryKeys) {
    const category = menuConfig[catKey]
    const found = category.items.find((item) => item.href === pathname)
    if (found) {
      toolLabel = t(found.labelKey)
      toolDescription = t(found.descriptionKey)
      appCategory = categoryToAppCategory[catKey] || 'WebApplication'
      break
    }
  }

  // Don't render on home page or if tool not found
  if (!toolLabel || pathname === '/') return null

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: toolLabel,
    description: toolDescription,
    url: `https://toolhub.ai.kr${pathname}`,
    applicationCategory: appCategory,
    operatingSystem: 'All',
    inLanguage: ['ko', 'en'],
    isAccessibleForFree: true,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW',
    },
    provider: {
      '@type': 'Organization',
      name: '툴허브',
      url: 'https://toolhub.ai.kr',
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
