'use client'
import dynamic from 'next/dynamic'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/svgEditor'

const Editor = dynamic(() => import('@/components/SvgEditor'), { ssr: false })

// 편집기(canvas)는 클라이언트 전용 — 제목·설명만 서버 HTML에 넣어 h1이 색인되게
export default function SvgEditor() {
  const t = useTranslations('svgEditor')
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>
      <Editor />
    </div>
  )
}
