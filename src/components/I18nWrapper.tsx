'use client'

import React from 'react'

interface I18nWrapperProps {
  children: React.ReactNode
}

/**
 * I18nWrapper — passthrough (호환용).
 *
 * 번역은 src/lib/i18n.ts에서 동기 로드된다.
 * 예전엔 next/navigation의 useSearchParams() 때문에 Suspense가 필요했지만,
 * 지금은 전부 @/hooks/useSearchParams(정적 렌더 가능)로 대체됨.
 * 루트 layout에서 <body> 전체를 Suspense로 감싸면 정적 HTML의 본문이
 * pending boundary(<template id="B:0"> + hidden S:0)로 빠져 hydration 오류(#418)와
 * 크롤러 가시성 저하를 일으키므로 Suspense를 두지 않는다.
 */
const I18nWrapper: React.FC<I18nWrapperProps> = ({ children }) => <>{children}</>

export default I18nWrapper
