'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { guides, guideLink } from '@/content/guides/catalog'
import { useTranslations } from '@/lib/i18n/shared'

export default function ToolGuideLink() {
  const tool = usePathname().replace(/^\/|\/$/g, '')
  const related = guides.filter(guide => guide.tools.includes(tool))
  const t = useTranslations('navigation')
  if (!related.length || tool === 'lunar-converter' || tool === 'pyeong-calculator' || tool === 'shipping-calculator') return null
  return (
    <aside className="mx-auto max-w-4xl px-4 py-5">
      <p className="text-sm text-sub">{t('toolGuides')}</p>
      <ul className="mt-1 space-y-1">
        {related.map(guide => <li key={guide.slug}>
          <Link href={guideLink(guide, tool)} prefetch={false} className="font-semibold text-primary hover:underline">{guide.title}</Link>
        </li>)}
      </ul>
    </aside>
  )
}
