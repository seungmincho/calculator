'use client'

import { useTranslations } from 'next-intl'

export default function SkipToContent() {
  const t = useTranslations()

  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:text-sm focus:font-medium focus:outline-none focus:ring-2 focus:ring-blue-400"
    >
      {t('accessibility.skipToContent')}
    </a>
  )
}
