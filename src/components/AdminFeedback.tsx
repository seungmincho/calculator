'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Lock, Eye, EyeOff, Trash2, Filter, ChevronDown, ChevronUp, Inbox, Clock, LogOut } from 'lucide-react'

interface Inquiry {
  id: string
  category: string
  title: string
  message: string
  contact: string | null
  fingerprint: string | null
  page_url: string | null
  user_agent: string | null
  is_read: boolean
  created_at: string
}

type FilterTab = 'all' | 'unread' | 'read'
type CategoryFilter = 'all' | 'bug' | 'feature' | 'suggestion' | 'other'

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

const CATEGORY_COLORS: Record<string, string> = {
  bug: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  feature: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  suggestion: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  other: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
}

const CATEGORY_LABELS: Record<string, string> = {
  bug: '버그',
  feature: '기능요청',
  suggestion: '건의',
  other: '기타',
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return '오늘'
  if (diffDays === 1) return '어제'
  if (diffDays < 30) return `${diffDays}일 전`

  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function AdminFeedback() {
  const t = useTranslations('adminFeedback')

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [authError, setAuthError] = useState('')
  const [isAuthLoading, setIsAuthLoading] = useState(false)

  // Data state
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)

  // Filter state
  const [filterTab, setFilterTab] = useState<FilterTab>('all')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')

  // UI state
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [storedPassword, setStoredPassword] = useState('')

  const LIMIT = 20

  // Check sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem('admin_auth')
    const pwd = sessionStorage.getItem('admin_password')
    if (stored && pwd) {
      setIsAuthenticated(true)
      setStoredPassword(pwd)
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAuthLoading(true)
    setAuthError('')

    try {
      const hash = await hashPassword(passwordInput)
      const expectedHash = process.env.NEXT_PUBLIC_ADMIN_PASSWORD_HASH

      if (hash === expectedHash) {
        sessionStorage.setItem('admin_auth', 'true')
        sessionStorage.setItem('admin_password', passwordInput)
        setStoredPassword(passwordInput)
        setIsAuthenticated(true)
      } else {
        setAuthError(t('login.error'))
      }
    } catch {
      setAuthError(t('login.error'))
    } finally {
      setIsAuthLoading(false)
    }
  }

  const fetchInquiries = useCallback(async (reset = false) => {
    if (!storedPassword) return
    setIsLoading(true)
    setLoadError('')

    const currentOffset = reset ? 0 : offset

    try {
      const params = new URLSearchParams({
        filter: filterTab,
        category: categoryFilter,
        offset: String(currentOffset),
        limit: String(LIMIT),
      })

      const res = await fetch(`/api/admin-inquiry?${params}`, {
        headers: { 'X-Admin-Password': storedPassword },
      })

      if (!res.ok) {
        if (res.status === 401) {
          handleLogout()
          return
        }
        throw new Error('Failed to fetch')
      }

      const result = await res.json()
      const items: Inquiry[] = result.data ?? []
      const total: number = result.total ?? 0

      if (reset) {
        setInquiries(items)
        setOffset(LIMIT)
      } else {
        setInquiries(prev => [...prev, ...items])
        setOffset(prev => prev + LIMIT)
      }

      setTotalCount(total)
      setHasMore(currentOffset + LIMIT < total)
    } catch {
      setLoadError('데이터를 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [storedPassword, filterTab, categoryFilter, offset])

  // Re-fetch when filters change
  useEffect(() => {
    if (!isAuthenticated || !storedPassword) return
    setOffset(0)
    fetchInquiries(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, storedPassword, filterTab, categoryFilter])

  const handleToggleRead = async (inquiry: Inquiry) => {
    if (!storedPassword) return
    const newValue = !inquiry.is_read

    // Optimistic update
    setInquiries(prev =>
      prev.map(i => (i.id === inquiry.id ? { ...i, is_read: newValue } : i))
    )

    try {
      const res = await fetch('/api/admin-inquiry', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': storedPassword,
        },
        body: JSON.stringify({ id: inquiry.id, is_read: newValue }),
      })

      if (!res.ok) throw new Error()
    } catch {
      setInquiries(prev =>
        prev.map(i => (i.id === inquiry.id ? { ...i, is_read: inquiry.is_read } : i))
      )
    }
  }

  const handleDelete = async (id: string) => {
    if (!storedPassword) return
    setDeletingId(id)

    try {
      const res = await fetch('/api/admin-inquiry', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': storedPassword,
        },
        body: JSON.stringify({ id }),
      })

      if (!res.ok) throw new Error()

      setInquiries(prev => prev.filter(i => i.id !== id))
      setTotalCount(prev => prev - 1)
      setConfirmDeleteId(null)
    } catch {
      // silently fail
    } finally {
      setDeletingId(null)
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem('admin_auth')
    sessionStorage.removeItem('admin_password')
    setIsAuthenticated(false)
    setStoredPassword('')
    setInquiries([])
  }

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 w-full max-w-md">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Lock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('login.title')}</h1>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                placeholder={t('login.password')}
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {authError && (
              <p className="text-sm text-red-600 dark:text-red-400">{authError}</p>
            )}

            <button
              type="submit"
              disabled={isAuthLoading || !passwordInput}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isAuthLoading ? '...' : t('login.submit')}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <Inbox className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('total', { count: totalCount })}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="self-start sm:self-auto flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          로그아웃
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 flex flex-col sm:flex-row gap-4">
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
          {(['all', 'unread', 'read'] as FilterTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filterTab === tab
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {t(`filter.${tab}`)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value as CategoryFilter)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
          >
            <option value="all">{t('filter.all')}</option>
            {['bug', 'feature', 'suggestion', 'other'].map(cat => (
              <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Error */}
      {loadError && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-700 dark:text-red-300 text-sm">
          {loadError}
        </div>
      )}

      {/* Empty */}
      {!isLoading && !loadError && inquiries.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
          <Inbox className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">{t('empty')}</p>
        </div>
      )}

      {/* Desktop table */}
      {inquiries.length > 0 && (
        <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('table.category')}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('table.title')}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('table.contact')}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('table.date')}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {inquiries.map(inquiry => (
                <React.Fragment key={inquiry.id}>
                  <tr
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer ${
                      !inquiry.is_read ? 'bg-blue-50/30 dark:bg-blue-950/20' : ''
                    }`}
                    onClick={() => setExpandedId(expandedId === inquiry.id ? null : inquiry.id)}
                  >
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[inquiry.category] ?? CATEGORY_COLORS.other}`}>
                        {CATEGORY_LABELS[inquiry.category] ?? inquiry.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {!inquiry.is_read && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                        )}
                        <span className={`text-sm ${!inquiry.is_read ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                          {inquiry.title}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {inquiry.contact || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                        <Clock className="w-3 h-3 flex-shrink-0" />
                        {formatDate(inquiry.created_at)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => handleToggleRead(inquiry)}
                          title={inquiry.is_read ? t('markUnread') : t('markRead')}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                        >
                          {inquiry.is_read ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(inquiry.id)}
                          title={t('delete')}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {expandedId === inquiry.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </div>
                    </td>
                  </tr>

                  {expandedId === inquiry.id && (
                    <tr className="bg-gray-50 dark:bg-gray-900">
                      <td colSpan={5} className="px-4 py-4">
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 space-y-2">
                          <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{inquiry.message}</p>
                          {inquiry.page_url && (
                            <p className="text-xs text-gray-400">
                              페이지: <span className="text-blue-500">{inquiry.page_url}</span>
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile card layout */}
      {inquiries.length > 0 && (
        <div className="md:hidden space-y-3">
          {inquiries.map(inquiry => (
            <div
              key={inquiry.id}
              className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 ${
                !inquiry.is_read ? 'ring-1 ring-blue-200 dark:ring-blue-800' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {!inquiry.is_read && <span className="w-2 h-2 bg-blue-500 rounded-full" />}
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[inquiry.category] ?? CATEGORY_COLORS.other}`}>
                    {CATEGORY_LABELS[inquiry.category] ?? inquiry.category}
                  </span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleToggleRead(inquiry)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"
                  >
                    {inquiry.is_read ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(inquiry.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h3 className={`text-sm mb-1 ${!inquiry.is_read ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                {inquiry.title}
              </h3>

              <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                <Clock className="w-3 h-3" />
                <span>{formatDate(inquiry.created_at)}</span>
                {inquiry.contact && <><span>·</span><span>{inquiry.contact}</span></>}
              </div>

              <button
                onClick={() => setExpandedId(expandedId === inquiry.id ? null : inquiry.id)}
                className="w-full text-left"
              >
                <p className={`text-sm text-gray-600 dark:text-gray-300 ${expandedId === inquiry.id ? 'whitespace-pre-wrap' : 'line-clamp-2'}`}>
                  {inquiry.message}
                </p>
                <span className="inline-flex items-center gap-1 text-xs text-blue-500 mt-1">
                  {expandedId === inquiry.id
                    ? <><ChevronUp className="w-3 h-3" />접기</>
                    : <><ChevronDown className="w-3 h-3" />더보기</>
                  }
                </span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <div className="text-center">
          <button
            onClick={() => fetchInquiries(false)}
            disabled={isLoading}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-6 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? t('loading') : t('loadMore')}
          </button>
        </div>
      )}

      {/* Loading spinner */}
      {isLoading && inquiries.length === 0 && (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 dark:text-gray-400 mt-3 text-sm">{t('loading')}</p>
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('delete')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t('deleteConfirm')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium"
              >
                취소
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={deletingId === confirmDeleteId}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 text-sm font-medium"
              >
                {deletingId === confirmDeleteId ? '...' : t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
