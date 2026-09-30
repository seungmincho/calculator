import { toolIcons, categoryIcons } from '@/config/toolIcons'
import type { CategoryKey } from '@/config/menuConfig'
import { Wrench } from 'lucide-react'

const sizes = {
  sm: { box: 'w-8 h-8 rounded-lg', icon: 'w-4 h-4' },
  md: { box: 'w-10 h-10 rounded-xl', icon: 'w-5 h-5' },
  lg: { box: 'w-12 h-12 rounded-2xl', icon: 'w-6 h-6' },
} as const

/** 도구/카테고리 아이콘: 회색 타일 + 단색 라인 아이콘 */
export default function ToolIcon({
  href, category, size = 'md', bare = false, className = '',
}: {
  href?: string
  category?: CategoryKey
  size?: keyof typeof sizes
  /** true면 타일 없이 아이콘만 */
  bare?: boolean
  className?: string
}) {
  const Icon = (href && toolIcons[href.replace(/\/$/, '')]) || (category && categoryIcons[category]) || Wrench
  const s = sizes[size]
  if (bare) return <Icon className={`${s.icon} ${className}`} strokeWidth={1.75} aria-hidden />
  return (
    <span className={`${s.box} shrink-0 inline-flex items-center justify-center bg-soft text-body ${className}`} aria-hidden>
      <Icon className={s.icon} strokeWidth={1.75} />
    </span>
  )
}
