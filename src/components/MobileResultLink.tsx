'use client'

import type { ReactNode } from 'react'
import { useTranslations } from '@/lib/i18n'

/**
 * 모바일에서 결과 카드가 입력 카드 아래(첫 화면 밖)에 쌓이는 계산기용.
 * 입력 카드 맨 위에 핵심 결과 한 줄을 두고, 누르면 결과 카드로 이동한다.
 * 결과 카드에는 `id` 와 `scroll-mt-20` 을 붙인다. 레이아웃이 md 에서 갈라지면 className="md:hidden".
 */
export default function MobileResultLink({ href, label, value, more, className = '' }: {
  href: string
  label: ReactNode
  value: ReactNode
  more?: string
  className?: string
}) {
  const t = useTranslations('common')
  return (
    // 라벨 윗줄·금액 아랫줄. 금액이 길어도(범위·문장) 카드 폭을 밀어내지 않게 어디서든 줄바꿈한다.
    <a href={href} className={`lg:hidden block min-w-0 bg-primary-soft rounded-2xl px-4 py-3 ${className}`}>
      <span className="block text-sm text-primary truncate">{label}</span>
      <span className="mt-0.5 flex items-baseline justify-between gap-2">
        <span className="min-w-0 text-2xl font-bold text-fg tabular-nums [overflow-wrap:anywhere]">{value}</span>
        <span className="shrink-0 text-xs text-primary whitespace-nowrap">{more ?? t('seeResult')} ↓</span>
      </span>
    </a>
  )
}
