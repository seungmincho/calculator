'use client'

import { useTranslations } from '@/lib/i18n'
import GuideSectionContent from './GuideSectionContent'

interface GuideSectionProps {
  namespace: string
  defaultOpen?: boolean
}

export default function GuideSection({ namespace, defaultOpen = false }: GuideSectionProps) {
  const translate = useTranslations(namespace)
  return <GuideSectionContent translate={translate} defaultOpen={defaultOpen} />
}
