'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'

// NProgress 설정
NProgress.configure({
  showSpinner: false,
  speed: 400,
  minimum: 0.1,
})

export default function ProgressBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    NProgress.done()
  }, [pathname, searchParams])

  useEffect(() => {
    const handleStart = () => NProgress.start()
    const handleComplete = () => NProgress.done()

    // 페이지 변경 시작
    const handleRouteChange = () => {
      NProgress.start()
    }

    // 링크 클릭 시 nprogress 시작
    const handleLinkClick = (e: Event) => {
      const target = e.target as HTMLElement
      const link = target.closest('a')
      
      if (link && link.href && !link.href.startsWith('#') && !link.target) {
        const href = link.getAttribute('href')
        if (href && href !== pathname) {
          NProgress.start()
        }
      }
    }

    // 뒤로가기/앞으로가기
    window.addEventListener('popstate', handleComplete)
    
    // 링크 클릭 감지
    document.addEventListener('click', handleLinkClick)

    return () => {
      window.removeEventListener('popstate', handleComplete)
      document.removeEventListener('click', handleLinkClick)
    }
  }, [pathname])

  return null
}