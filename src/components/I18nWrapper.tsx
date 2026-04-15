'use client'

import React from 'react'

interface I18nWrapperProps {
  children: React.ReactNode
}

/**
 * I18nWrapper — now a simple passthrough.
 *
 * Previously used NextIntlClientProvider with async message loading,
 * which caused "Loading..." to appear before React hydration and
 * prevented Google from indexing page content.
 *
 * Translations are now loaded synchronously via src/lib/i18n.ts.
 * To restore multi-language support, add language context here.
 */
const I18nWrapper: React.FC<I18nWrapperProps> = ({ children }) => {
  return <>{children}</>
}

export default I18nWrapper
