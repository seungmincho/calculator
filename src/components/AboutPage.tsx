'use client'

import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/about'
import { menuConfig, categoryKeys, categoryHubs } from '@/config/menuConfig'
import PolicySections, { type PolicySection } from './PolicySections'

export default function AboutPage() {
  const t = useTranslations('about')
  const email = t('email')

  return (
    <div className="space-y-6">
      <div className="ui-card p-6 md:p-10">
        <h1 className="text-2xl md:text-3xl font-bold text-fg mb-4">{t('title')}</h1>
        <p className="text-body leading-relaxed">{t('intro')}</p>

        <h2 className="text-lg font-semibold text-fg mt-8 mb-3">{t('toolsTitle')}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {categoryKeys.map(key => (
            <Link
              key={key}
              href={categoryHubs[key]}
              className="bg-subtle hover:bg-soft rounded-2xl p-4 transition-colors"
            >
              <span className="block font-semibold text-fg">{t(`categories.${key}`)}</span>
              <span className="block text-sm text-sub tabular-nums mt-1">
                {t('toolCount', { count: menuConfig[key].items.filter(i => i.href !== categoryHubs[key]).length })}
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div className="ui-card p-6 md:p-10">
        <PolicySections sections={t.raw('sections') as PolicySection[]} />
        <div className="flex flex-wrap gap-3 mt-6">
          <Link href="/inquiry" className="ui-btn px-4 py-3">{t('inquiryButton')}</Link>
          <a href={`mailto:${email}`} className="ui-btn-soft px-4 py-3">{t('emailLabel')} {email}</a>
        </div>
      </div>

      <p className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-sub">
        <Link href="/terms" className="underline underline-offset-2 hover:text-fg">{t('termsLink')}</Link>
        <Link href="/privacy" className="underline underline-offset-2 hover:text-fg">{t('privacyLink')}</Link>
      </p>
    </div>
  )
}
