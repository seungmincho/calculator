'use client'

import Link from 'next/link'
import { decisionTools } from '@/config/decisionTools'
import { menuConfig, categoryKeys } from '@/config/menuConfig'
import { useLanguage } from '@/contexts/LanguageContext'
import { useTranslations } from '@/lib/i18n/navigation'

// href → footer.links.* (메뉴 이름 공용 키)
const labelKeys = new Map(categoryKeys.flatMap(c => menuConfig[c].items.map(i => [i.href, i.labelKey] as const)))

/** 랜덤·결정 도구 패밀리 공통 전환 바 (각 도구는 자기 URL). 정적 HTML·한국어는 decisionTools 의 짧은 이름 그대로 */
export default function DecisionToolsBar({ current }: { current: string }) {
  const { language } = useLanguage()
  const t = useTranslations()
  const en = language === 'en'
  return (
    <nav aria-label={t('subcategory.decision')} className="-mx-4 px-4 overflow-x-auto scrollbar-hide">
      <ul className="flex gap-1.5 w-max">
        {decisionTools.map(d => {
          const active = d.href === current
          const key = labelKeys.get(d.href)
          return (
            <li key={d.href}>
              <Link prefetch={false}
                href={d.href}
                aria-current={active ? 'page' : undefined}
                className={`inline-flex min-h-11 items-center px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  active ? 'bg-primary text-white' : 'bg-soft text-sub hover:text-fg'
                }`}
              >
                {en && key ? t(key) : d.short}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
