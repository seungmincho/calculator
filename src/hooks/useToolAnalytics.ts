'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { recordToolClick, getPopularTools } from '@/utils/toolAnalytics'
import { recordToolUsage } from '@/utils/recentTools'
import { isSupabaseConfigured } from '@/utils/webrtc/supabaseClient'
import { menuConfig, categoryKeys, type MenuItem } from '@/config/menuConfig'

export interface PopularToolItem extends MenuItem {
  clickCount: number
  categoryKey: string
}

interface UsePopularToolsReturn {
  popularTools: PopularToolItem[]
  isLoading: boolean
  isConfigured: boolean
}

export const useTrackToolVisit = () => {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname || pathname === '/') return
    const cleanPath = pathname.replace(/\/$/, '') || '/'

    const category = categoryKeys.find(catKey => menuConfig[catKey].items.some(item => item.href === cleanPath))
    if (!category) return

    recordToolUsage(category, cleanPath)
    recordToolClick(cleanPath)
  }, [pathname])
}

export const usePopularTools = (limit: number = 5): UsePopularToolsReturn => {
  const [popularTools, setPopularTools] = useState<PopularToolItem[]>([])
  const [isConfigured] = useState(() => isSupabaseConfigured())
  const [isLoading, setIsLoading] = useState(isConfigured)

  useEffect(() => {
    if (!isConfigured) {
      setIsLoading(false)
      return
    }

    const fetchPopular = async () => {
      try {
        const data = await getPopularTools(limit)
        const enriched: PopularToolItem[] = []

        for (const entry of data) {
          for (const catKey of categoryKeys) {
            const found = menuConfig[catKey].items.find(
              item => item.href === entry.tool_href
            )
            if (found) {
              enriched.push({
                ...found,
                clickCount: entry.click_count,
                categoryKey: catKey,
              })
              break
            }
          }
        }
        setPopularTools(enriched)
      } catch (e) {
        console.error('Failed to load popular tools:', e)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPopular()
  }, [limit, isConfigured])

  return { popularTools, isLoading, isConfigured }
}
