'use client'

import { useState, useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  MessageSquare,
  Bug,
  Lightbulb,
  HelpCircle,
  Send,
  CheckCircle,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import { getSupabase } from '@/utils/webrtc/supabaseClient'
import { menuConfig, categoryKeys } from '@/config/menuConfig'

type Category = 'bug' | 'feature' | 'suggestion' | 'other'

const CATEGORY_ICONS: Record<Category, React.ReactNode> = {
  bug: <Bug className="w-4 h-4" />,
  feature: <Lightbulb className="w-4 h-4" />,
  suggestion: <MessageSquare className="w-4 h-4" />,
  other: <HelpCircle className="w-4 h-4" />,
}

const TITLE_MAX = 50
const MESSAGE_MAX = 500
const CONTACT_MAX = 100
const RATE_LIMIT_MS = 5 * 60 * 1000
const LS_KEY = 'inquiry_last_submit'

function generateFingerprint(): string {
  if (typeof window === 'undefined') return 'server'
  const raw = [
    navigator.userAgent,
    String(screen.width),
    String(screen.height),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ].join('|')
  let hash = 0
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0
  }
  return String(Math.abs(hash))
}

function getCharCountClass(current: number, max: number): string {
  return current / max > 0.9
    ? 'text-red-500 dark:text-red-400'
    : 'text-gray-400 dark:text-gray-500'
}

/** URL from param → menuConfig에서 도구명 + 아이콘 찾기 */
function findToolByPath(path: string | null, translate: (key: string) => string) {
  if (!path) return null
  // trailing slash 제거 후 비교
  const normalized = path.replace(/\/$/, '') || '/'
  for (const key of categoryKeys) {
    for (const item of menuConfig[key].items) {
      if (item.href === normalized) {
        return {
          icon: item.icon,
          name: translate(item.labelKey),
          href: item.href,
        }
      }
    }
  }
  return null
}

export default function InquiryForm() {
  const t = useTranslations('inquiry')
  const tGlobal = useTranslations()
  const searchParams = useSearchParams()
  const fromPath = searchParams.get('from')

  const fromTool = useMemo(
    () => findToolByPath(fromPath, tGlobal),
    [fromPath, tGlobal]
  )

  const [category, setCategory] = useState<Category>('suggestion')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [contact, setContact] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError(null)

      // Rate limit check
      try {
        const lastSubmit = localStorage.getItem(LS_KEY)
        if (lastSubmit) {
          const elapsed = Date.now() - parseInt(lastSubmit, 10)
          if (elapsed < RATE_LIMIT_MS) {
            const remaining = Math.ceil((RATE_LIMIT_MS - elapsed) / 1000 / 60)
            setError(t('error.tooSoon', { minutes: remaining }))
            return
          }
        }
      } catch {
        // localStorage unavailable
      }

      if (!title.trim()) {
        setError(t('error.titleRequired'))
        return
      }
      if (!message.trim()) {
        setError(t('error.messageRequired'))
        return
      }

      setSubmitting(true)

      const supabase = getSupabase()
      if (!supabase) {
        setError(t('error.submitFailed'))
        setSubmitting(false)
        return
      }

      const fingerprint = generateFingerprint()

      const { error: dbError } = await supabase.from('inquiries').insert({
        category,
        title: title.trim(),
        message: message.trim(),
        contact: contact.trim() || null,
        fingerprint,
        page_url: fromPath || window.location.href,
        user_agent: navigator.userAgent,
      })

      if (dbError) {
        setError(t('error.submitFailed'))
        setSubmitting(false)
        return
      }

      try {
        localStorage.setItem(LS_KEY, String(Date.now()))
      } catch {
        // ignore
      }
      setSubmitting(false)
      setSuccess(true)
    },
    [category, title, message, contact, t]
  )

  if (success) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 flex flex-col items-center justify-center gap-4 min-h-[300px]">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 animate-bounce">
          <CheckCircle className="w-9 h-9 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('success.title')}</h2>
        <p className="text-gray-500 dark:text-gray-400 text-center">{t('success.message')}</p>
        <button
          onClick={() => {
            setSuccess(false)
            setTitle('')
            setMessage('')
            setContact('')
            setCategory('suggestion')
          }}
          className="mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-3 font-medium hover:from-blue-700 hover:to-indigo-700"
        >
          {t('success.another')}
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-500" />
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* 연결된 페이지 표시 */}
      {fromTool && (
        <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <span className="text-lg">{fromTool.icon}</span>
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            {fromTool.name}
          </span>
          <span className="text-xs text-blue-500 dark:text-blue-400">{t('pageInfo')}</span>
          <a
            href={fromTool.href}
            className="ml-auto text-blue-500 hover:text-blue-700 dark:hover:text-blue-300"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
            {t('category.label')}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(['bug', 'feature', 'suggestion', 'other'] as Category[]).map((cat) => (
              <label
                key={cat}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors
                  ${
                    category === cat
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-300 dark:hover:border-blue-700'
                  }`}
              >
                <input
                  type="radio"
                  name="category"
                  value={cat}
                  checked={category === cat}
                  onChange={() => setCategory(cat)}
                  className="sr-only"
                />
                {CATEGORY_ICONS[cat]}
                <span className="text-sm font-medium">{t(`category.${cat}`)}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-900 dark:text-white">
              {t('form.title')}
            </label>
            <span className={`text-xs ${getCharCountClass(title.length, TITLE_MAX)}`}>
              {t('form.charCount', { current: title.length, max: TITLE_MAX })}
            </span>
          </div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
            placeholder={t('form.titlePlaceholder')}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>

        {/* Message */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-900 dark:text-white">
              {t('form.message')}
            </label>
            <span className={`text-xs ${getCharCountClass(message.length, MESSAGE_MAX)}`}>
              {t('form.charCount', { current: message.length, max: MESSAGE_MAX })}
            </span>
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MESSAGE_MAX))}
            placeholder={t('form.messagePlaceholder')}
            required
            rows={5}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
          />
        </div>

        {/* Contact (optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
            {t('form.contact')}
          </label>
          <input
            type="text"
            value={contact}
            onChange={(e) => setContact(e.target.value.slice(0, CONTACT_MAX))}
            placeholder={t('form.contactPlaceholder')}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>

        {/* Rate limit notice */}
        <p className="text-xs text-gray-400 dark:text-gray-500">{t('rateLimit')}</p>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-opacity"
        >
          {submitting ? (
            <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          {submitting ? t('form.submitting') : t('form.submit')}
        </button>
      </form>
    </div>
  )
}
