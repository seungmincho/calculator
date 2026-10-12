'use client'

import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/terms'
import PolicySections, { type PolicySection } from './PolicySections'

export default function TermsOfService() {
  const t = useTranslations('terms')

  return (
    <div className="ui-card p-6 md:p-10">
      <h1 className="text-2xl md:text-3xl font-bold text-fg mb-4">{t('title')}</h1>
      <p className="text-body leading-relaxed mb-8">{t('intro')}</p>
      <PolicySections sections={t.raw('sections') as PolicySection[]} />
      <p className="text-sm text-muted mt-8">{t('effectiveDate')}</p>
      <p className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-sub mt-4">
        <Link href="/about" className="underline underline-offset-2 hover:text-fg">{t('aboutLink')}</Link>
        <Link href="/privacy" className="underline underline-offset-2 hover:text-fg">{t('privacyLink')}</Link>
        <Link href="/inquiry" className="underline underline-offset-2 hover:text-fg">{t('inquiryLink')}</Link>
      </p>
    </div>
  )
}
