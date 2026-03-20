'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Home, Star, Clock, Search, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { usePathname, useRouter } from 'next/navigation'
import { getFavorites } from '@/utils/favorites'
import { getAllRecentTools } from '@/utils/recentTools'
import { menuConfig, categoryKeys } from '@/config/menuConfig'

interface ToolInfo {
  href: string
  label: string
  icon: string
}

type PanelType = 'favorites' | 'recent' | null

export default function MobileBottomNav() {
  const t = useTranslations()
  const pathname = usePathname()
  const router = useRouter()
  const [activePanel, setActivePanel] = useState<PanelType>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLElement>(null)

  // Build a lookup map from href to tool info
  const toolMap = useCallback((): Map<string, ToolInfo> => {
    const map = new Map<string, ToolInfo>()
    categoryKeys.forEach((key) => {
      menuConfig[key].items.forEach((item) => {
        map.set(item.href, {
          href: item.href,
          label: t(item.labelKey),
          icon: item.icon,
        })
      })
    })
    return map
  }, [t])

  // Get favorites list
  const getFavoriteTools = useCallback((): ToolInfo[] => {
    const favHrefs = getFavorites()
    const map = toolMap()
    return favHrefs
      .map((href) => map.get(href))
      .filter((item): item is ToolInfo => item !== undefined)
  }, [toolMap])

  // Get recent tools list
  const getRecentToolsList = useCallback((): ToolInfo[] => {
    const recentEntries = getAllRecentTools()
    const map = toolMap()
    const seen = new Set<string>()
    const result: ToolInfo[] = []
    for (const entry of recentEntries) {
      if (seen.has(entry.href)) continue
      seen.add(entry.href)
      const info = map.get(entry.href)
      if (info) result.push(info)
      if (result.length >= 10) break
    }
    return result
  }, [toolMap])

  const [favoriteTools, setFavoriteTools] = useState<ToolInfo[]>([])
  const [recentTools, setRecentTools] = useState<ToolInfo[]>([])

  // Load data when panel opens
  useEffect(() => {
    if (activePanel === 'favorites') {
      setFavoriteTools(getFavoriteTools())
    } else if (activePanel === 'recent') {
      setRecentTools(getRecentToolsList())
    }
  }, [activePanel, getFavoriteTools, getRecentToolsList])

  // Lock body scroll when panel is open
  useEffect(() => {
    if (activePanel) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [activePanel])

  // Close panel on outside click
  useEffect(() => {
    if (!activePanel) return
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        navRef.current &&
        !navRef.current.contains(target)
      ) {
        setActivePanel(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [activePanel])

  // Close panel on route change
  useEffect(() => {
    setActivePanel(null)
  }, [pathname])

  const handleNavClick = useCallback(
    (type: 'home' | 'favorites' | 'recent' | 'search') => {
      if (type === 'home') {
        setActivePanel(null)
        router.push('/')
      } else if (type === 'search') {
        setActivePanel(null)
        // Trigger the global Ctrl+K search dialog
        document.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'k',
            ctrlKey: true,
            bubbles: true,
          })
        )
      } else {
        setActivePanel((prev) => (prev === type ? null : type))
      }
    },
    [router]
  )

  const handleToolClick = useCallback(
    (href: string) => {
      setActivePanel(null)
      router.push(href)
    },
    [router]
  )

  const isHome = pathname === '/' || pathname === ''

  const navItems = [
    {
      key: 'home' as const,
      icon: Home,
      labelKey: 'mobileNav.home',
      isActive: isHome && !activePanel,
    },
    {
      key: 'favorites' as const,
      icon: Star,
      labelKey: 'mobileNav.favorites',
      isActive: activePanel === 'favorites',
    },
    {
      key: 'recent' as const,
      icon: Clock,
      labelKey: 'mobileNav.recent',
      isActive: activePanel === 'recent',
    },
    {
      key: 'search' as const,
      icon: Search,
      labelKey: 'mobileNav.search',
      isActive: false,
    },
  ]

  const renderPanel = () => {
    if (!activePanel) return null

    const isFav = activePanel === 'favorites'
    const items = isFav ? favoriteTools : recentTools
    const emptyMessage = isFav
      ? t('mobileNav.noFavorites')
      : t('mobileNav.noRecent')
    const title = isFav
      ? t('mobileNav.favorites')
      : t('mobileNav.recent')

    return (
      <>
        {/* Backdrop */}
        <div className="fixed inset-0 z-40 bg-black/30 md:hidden" />
        {/* Panel */}
        <div
          ref={panelRef}
          className="fixed bottom-16 left-0 right-0 z-40 md:hidden pb-[env(safe-area-inset-bottom)]"
          style={{ animation: 'slideUp 0.2s ease-out' }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl shadow-2xl max-h-[60vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                {title}
              </h3>
              <button
                onClick={() => setActivePanel(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label={t('mobileNav.close')}
              >
                <X size={20} />
              </button>
            </div>
            {/* Content */}
            <div className="overflow-y-auto flex-1 overscroll-contain">
              {items.length === 0 ? (
                <div className="px-4 py-12 text-center text-gray-500 dark:text-gray-400 text-sm">
                  {emptyMessage}
                </div>
              ) : (
                <div className="py-2">
                  {items.map((item) => (
                    <button
                      key={item.href}
                      onClick={() => handleToolClick(item.href)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 dark:active:bg-gray-600 transition-colors text-left"
                    >
                      <span className="text-xl flex-shrink-0 w-8 text-center">
                        {item.icon}
                      </span>
                      <span className="text-sm text-gray-900 dark:text-white truncate">
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      {renderPanel()}
      <nav
        ref={navRef}
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 pb-[env(safe-area-inset-bottom)]"
        aria-label={t('mobileNav.label')}
      >
        <div className="flex items-stretch h-16">
          {navItems.map(({ key, icon: Icon, labelKey, isActive }) => (
            <button
              key={key}
              onClick={() => handleNavClick(key)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] min-w-[44px] transition-colors ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400 active:text-gray-700 dark:active:text-gray-300'
              }`}
              aria-label={t(labelKey)}
              aria-current={key === 'home' && isHome ? 'page' : undefined}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] leading-tight font-medium">
                {t(labelKey)}
              </span>
            </button>
          ))}
        </div>
      </nav>

      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  )
}
