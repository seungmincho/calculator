'use client'

import { useState, useEffect } from 'react'
import { ArrowUp } from 'lucide-react'
import { useTranslations } from 'next-intl'

export default function BackToTop() {
  const [isVisible, setIsVisible] = useState(false)
  const t = useTranslations()

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 400)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!isVisible) return null

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-4 left-4 z-40 w-10 h-10 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full shadow-md flex items-center justify-center transition-all hover:scale-105 active:scale-95"
      aria-label={t('common.backToTop')}
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  )
}
