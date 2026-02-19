'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Search, X, ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { menuConfig, categoryKeys } from '@/config/menuConfig'
import { recordToolUsage } from '@/utils/recentTools'

interface SearchItem {
  href: string
  label: string
  description: string
  icon: string
  category: string
  categoryLabel: string
}

interface SearchDialogProps {
  isOpen: boolean
  onClose: () => void
}

export default function SearchDialog({ isOpen, onClose }: SearchDialogProps) {
  const t = useTranslations()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Build searchable items from menuConfig
  const allItems: SearchItem[] = useMemo(() => {
    const items: SearchItem[] = []
    const categoryLabels: Record<string, string> = {
      calculators: t('navigation.financialCalculators'),
      tools: t('navigation.developmentTools'),
      media: t('navigation.mediaTools'),
      health: t('navigation.healthTools'),
      games: t('navigation.simpleGames'),
    }
    categoryKeys.forEach((key) => {
      const category = menuConfig[key]
      category.items.forEach((item) => {
        items.push({
          href: item.href,
          label: t(item.labelKey),
          description: t(item.descriptionKey),
          icon: item.icon,
          category: key,
          categoryLabel: categoryLabels[key] || key,
        })
      })
    })
    return items
  }, [t])

  // Filter items based on query
  const filteredItems = useMemo(() => {
    if (!query.trim()) return allItems
    const q = query.toLowerCase().trim()
    return allItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.href.toLowerCase().includes(q) ||
        item.categoryLabel.toLowerCase().includes(q)
    )
  }, [query, allItems])

  // Pre-compute index map for O(1) lookup
  const indexMap = useMemo(
    () => new Map(filteredItems.map((item, i) => [item.href, i])),
    [filteredItems]
  )

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }
  }, [isOpen])

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return
    const selected = listRef.current.querySelector('[data-selected="true"]')
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  const navigateToItem = useCallback(
    (item: SearchItem) => {
      recordToolUsage(item.category, item.href)
      onClose()
      router.push(item.href)
    },
    [onClose, router]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) =>
            prev < filteredItems.length - 1 ? prev + 1 : 0
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredItems.length - 1
          )
          break
        case 'Enter':
          e.preventDefault()
          if (filteredItems[selectedIndex]) {
            navigateToItem(filteredItems[selectedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
        case 'Tab':
          // Trap focus within the dialog - keep focus on input
          e.preventDefault()
          inputRef.current?.focus()
          break
      }
    },
    [filteredItems, selectedIndex, navigateToItem, onClose]
  )

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t('common.search')}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Dialog */}
      <div
        className="relative w-full max-w-xl mx-4 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center px-4 border-b border-gray-200 dark:border-gray-700">
          <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('searchDialog.placeholder')}
            className="flex-1 px-3 py-4 text-base bg-transparent text-gray-900 dark:text-white placeholder-gray-400 outline-none"
            aria-label={t('common.search')}
            aria-expanded={true}
            aria-controls="search-listbox"
            aria-activedescendant={
              filteredItems.length > 0
                ? `search-option-${selectedIndex}`
                : undefined
            }
            autoComplete="off"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              aria-label={t('common.clear')}
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex ml-2 px-2 py-1 text-xs font-mono text-gray-400 bg-gray-100 dark:bg-gray-700 rounded">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          id="search-listbox"
          className="max-h-[50vh] overflow-y-auto overscroll-contain"
          role="listbox"
        >
          {filteredItems.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
              <p className="text-sm">{t('searchDialog.noResults')}</p>
            </div>
          ) : (
            <>
              {categoryKeys.map((catKey) => {
                const catItems = filteredItems.filter(
                  (item) => item.category === catKey
                )
                if (catItems.length === 0) return null

                return (
                  <div key={catKey}>
                    <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide bg-gray-50 dark:bg-gray-900/50 sticky top-0">
                      {catItems[0].categoryLabel} ({catItems.length})
                    </div>
                    {catItems.map((item) => {
                      const globalIndex = indexMap.get(item.href) ?? -1
                      const isSelected = globalIndex === selectedIndex

                      return (
                        <a
                          key={item.href}
                          id={`search-option-${globalIndex}`}
                          href={item.href}
                          role="option"
                          aria-selected={isSelected}
                          data-selected={isSelected}
                          onClick={(e) => {
                            e.preventDefault()
                            navigateToItem(item)
                          }}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                          className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                              : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                          }`}
                        >
                          <span className="text-xl flex-shrink-0 w-8 text-center">
                            {item.icon}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              {item.label}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {item.description}
                            </div>
                          </div>
                          {isSelected && (
                            <ArrowRight className="w-4 h-4 flex-shrink-0 text-blue-500" />
                          )}
                        </a>
                      )
                    })}
                  </div>
                )
              })}
            </>
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-xs text-gray-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 font-mono bg-gray-200 dark:bg-gray-700 rounded text-[10px]">↑↓</kbd>
              {t('searchDialog.navigate')}
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 font-mono bg-gray-200 dark:bg-gray-700 rounded text-[10px]">↵</kbd>
              {t('searchDialog.open')}
            </span>
          </div>
          <span>{filteredItems.length} {t('searchDialog.results')}</span>
        </div>
      </div>
    </div>
  )
}
