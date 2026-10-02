'use client'

import { useState, useMemo, useId } from 'react'
import { useTranslations } from '@/lib/i18n'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface GuideSectionProps {
  namespace: string
  defaultOpen?: boolean
}

export default function GuideSection({ namespace, defaultOpen = false }: GuideSectionProps) {
  const t = useTranslations(namespace)
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const panelId = useId()

  const whatIs = useMemo(() => {
    try {
      const title = t('guide.whatIs.title')
      const description = t('guide.whatIs.description')
      return { title, description }
    } catch {
      return null
    }
  }, [t])

  const howToUse = useMemo(() => {
    try {
      const title = t('guide.howToUse.title')
      const items = t.raw('guide.howToUse.items') as string[]
      if (!Array.isArray(items)) return null
      return { title, items }
    } catch {
      return null
    }
  }, [t])

  const tips = useMemo(() => {
    try {
      const title = t('guide.tips.title')
      const items = t.raw('guide.tips.items') as string[]
      if (!Array.isArray(items)) return null
      return { title, items }
    } catch {
      return null
    }
  }, [t])

  const howItWorks = useMemo(() => {
    try {
      const title = t('guide.howItWorks.title')
      const items = t.raw('guide.howItWorks.items') as string[]
      if (!Array.isArray(items)) return null
      return { title, items }
    } catch {
      return null
    }
  }, [t])

  const realWorld = useMemo(() => {
    try {
      const title = t('guide.realWorld.title')
      const items = t.raw('guide.realWorld.items') as string[]
      if (!Array.isArray(items)) return null
      return { title, items }
    } catch {
      return null
    }
  }, [t])

  const comparison = useMemo(() => {
    try {
      const title = t('guide.comparison.title')
      const items = t.raw('guide.comparison.items') as string[]
      if (!Array.isArray(items)) return null
      return { title, items }
    } catch {
      return null
    }
  }, [t])

  const faq = useMemo(() => {
    try {
      const title = t('guide.faq.title')
      const items = t.raw('guide.faq.items') as { q: string; a: string }[]
      if (!Array.isArray(items)) return null
      return { title, items }
    } catch {
      return null
    }
  }, [t])

  const guideTitle = useMemo(() => {
    try {
      return t('guide.title')
    } catch {
      return '가이드'
    }
  }, [t])

  const hasContent = whatIs || howToUse || howItWorks || realWorld || comparison || tips || faq
  if (!hasContent) return null

  return (
    <div className="ui-card p-6">
      {/* 제목 안에 버튼(디스클로저 패턴) — 버튼 안 h2는 제목으로 인식되지 않음 */}
      <h2 className="text-xl font-semibold text-fg">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full min-h-11 flex items-center justify-between gap-2 text-left rounded-lg"
          aria-expanded={isOpen}
          aria-controls={panelId}
        >
          {guideTitle}
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-faint shrink-0" aria-hidden="true" />
          ) : (
            <ChevronDown className="w-5 h-5 text-faint shrink-0" aria-hidden="true" />
          )}
        </button>
      </h2>

      {isOpen && (
        <div id={panelId} className="mt-6 space-y-6">
          {whatIs && (
            <div>
              <h3 className="text-base font-bold text-fg mb-2">
                {whatIs.title}
              </h3>
              <p className="text-body leading-relaxed">
                {whatIs.description}
              </p>
            </div>
          )}

          {howToUse && (
            <div>
              <h3 className="text-base font-bold text-fg mb-3">
                {howToUse.title}
              </h3>
              <ol className="space-y-2 text-body">
                {howToUse.items.map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-soft text-sub rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {howItWorks && (
            <div>
              <h3 className="text-base font-bold text-fg mb-3">
                {howItWorks.title}
              </h3>
              <ol className="space-y-2 text-body">
                {howItWorks.items.map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-soft text-sub rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {realWorld && (
            <div>
              <h3 className="text-base font-bold text-fg mb-3">
                {realWorld.title}
              </h3>
              <ul className="space-y-2 text-body">
                {realWorld.items.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-faint mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {comparison && (
            <div>
              <h3 className="text-base font-bold text-fg mb-3">
                {comparison.title}
              </h3>
              <ul className="space-y-2 text-body">
                {comparison.items.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-faint mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tips && (
            <div>
              <h3 className="text-base font-bold text-fg mb-3">
                {tips.title}
              </h3>
              <ul className="space-y-2 text-body">
                {tips.items.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-faint mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {faq && (
            <div>
              <h3 className="text-base font-bold text-fg mb-4">
                {faq.title}
              </h3>
              <div className="space-y-4">
                {faq.items.map((item, index) => (
                  <div key={index} className="bg-subtle rounded-lg p-4">
                    <p className="font-medium text-fg mb-1">
                      Q. {item.q}
                    </p>
                    <p className="text-body text-sm">
                      A. {item.a}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
