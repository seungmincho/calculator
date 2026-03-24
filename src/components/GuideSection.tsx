'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react'

interface GuideSectionProps {
  namespace: string
  defaultOpen?: boolean
}

export default function GuideSection({ namespace, defaultOpen = false }: GuideSectionProps) {
  const t = useTranslations(namespace)
  const [isOpen, setIsOpen] = useState(defaultOpen)

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

  const hasContent = whatIs || howToUse || tips || faq
  if (!hasContent) return null

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between"
        aria-expanded={isOpen}
      >
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          {guideTitle}
        </h2>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {isOpen && (
        <div className="mt-6 space-y-6">
          {whatIs && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {whatIs.title}
              </h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {whatIs.description}
              </p>
            </div>
          )}

          {howToUse && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                {howToUse.title}
              </h3>
              <ol className="space-y-2 text-gray-700 dark:text-gray-300">
                {howToUse.items.map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {tips && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                {tips.title}
              </h3>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                {tips.items.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-green-500 dark:text-green-400 mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {faq && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {faq.title}
              </h3>
              <div className="space-y-4">
                {faq.items.map((item, index) => (
                  <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <p className="font-medium text-gray-900 dark:text-white mb-1">
                      Q. {item.q}
                    </p>
                    <p className="text-gray-700 dark:text-gray-300 text-sm">
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
