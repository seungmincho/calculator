'use client'

import React, { Suspense } from 'react'

interface I18nWrapperProps {
  children: React.ReactNode
}

/**
 * I18nWrapper — Suspense boundary passthrough.
 *
 * Translations are loaded synchronously via src/lib/i18n.ts (no Loading... flash).
 * Suspense is kept here because Next.js 15 requires useSearchParams() to be
 * wrapped in a Suspense boundary during static prerendering.
 */
const I18nWrapper: React.FC<I18nWrapperProps> = ({ children }) => {
  return <Suspense fallback={null}>{children}</Suspense>
}

export default I18nWrapper
