'use client'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/everlandWaitTimes'

export default function EverlandWaitTimes() {
  const t = useTranslations('everlandWaitTimes')
  return <div className="space-y-6">
    <header><h1 className="text-3xl font-bold text-fg">{t('title')}</h1><p className="mt-3 text-sub">{t('subtitle')}</p></header>
    <p className="text-body leading-relaxed">{t('intro')}</p>
    <div className="space-y-3">
      <a className="ui-btn inline-flex px-5 py-3" href="/everland-board/">{t('openBoard')}</a>
      <p className="text-sub">{t('boardLinkHelp')}</p>
    </div>
    <section className="ui-card p-6 space-y-4">
      <h2 className="text-xl font-bold text-fg">{t('guideTitle')}</h2>
      <p className="text-body leading-relaxed">{t('guide')}</p><p className="text-body leading-relaxed">{t('timeGuide')}</p>
      <p className="text-body leading-relaxed">{t('mapGuide')}</p>
      <a className="text-primary underline" href="https://www.everland.com/everland/map" target="_blank" rel="noopener noreferrer">{t('official')}</a>
      <p><a href="https://www.themeparks.wiki/" className="text-primary underline" target="_blank" rel="noopener noreferrer">Powered by ThemeParks.wiki</a></p>
    </section>
    <section className="ui-card p-6 space-y-3"><h2 className="text-xl font-bold text-fg">{t('faqTitle')}</h2><h3 className="font-semibold text-fg">{t('faqQuestion')}</h3><p className="text-body">{t('faqAnswer')}</p></section>
    <Link href="/holiday-planner/" className="text-primary underline">{t('related')}</Link>
  </div>
}
