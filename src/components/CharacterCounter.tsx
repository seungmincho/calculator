'use client'

import { useState, useMemo, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Type, Copy, Trash2, Check, FileText, Hash, AlignLeft, MessageSquare, Rows3 } from 'lucide-react'

interface TextStats {
  characters: number
  withoutSpaces: number
  words: number
  sentences: number
  paragraphs: number
  lines: number
  bytes: number
}

const calculateStats = (text: string): TextStats => {
  if (!text) {
    return { characters: 0, withoutSpaces: 0, words: 0, sentences: 0, paragraphs: 0, lines: 0, bytes: 0 }
  }

  const characters = text.length
  const withoutSpaces = text.replace(/\s/g, '').length
  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  const sentences = (text.match(/[.!?。！？]+/g) || []).length || (text.trim() ? 1 : 0)
  const paragraphs = text.trim() ? text.split(/\n\s*\n/).filter(p => p.trim()).length : 0
  const lines = text ? text.split('\n').length : 0
  const bytes = new Blob([text]).size

  return { characters, withoutSpaces, words, sentences, paragraphs, lines, bytes }
}

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: number
  highlight?: boolean
}

const StatCard = ({ icon, label, value, highlight }: StatCardProps) => (
  <div className={`flex flex-col items-center p-4 rounded-xl transition-all ${
    highlight
      ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg scale-105'
      : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-md'
  }`}>
    <div className={`mb-2 ${highlight ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
      {icon}
    </div>
    <div className={`text-xs font-medium mb-1 ${highlight ? 'text-white/90' : 'text-gray-500 dark:text-gray-400'}`}>
      {label}
    </div>
    <div className={`text-2xl font-bold tabular-nums ${highlight ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
      {value.toLocaleString()}
    </div>
  </div>
)

export default function CharacterCounter() {
  const t = useTranslations('characterCounter')
  const [text, setText] = useState('')
  const [copied, setCopied] = useState(false)

  const stats = useMemo(() => calculateStats(text), [text])

  const handleCopy = useCallback(async () => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [text])

  const handleClear = useCallback(() => {
    setText('')
  }, [])

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('description')}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <StatCard
          icon={<Type className="w-5 h-5" />}
          label={t('stats.characters')}
          value={stats.characters}
          highlight
        />
        <StatCard
          icon={<Hash className="w-5 h-5" />}
          label={t('stats.withoutSpaces')}
          value={stats.withoutSpaces}
        />
        <StatCard
          icon={<FileText className="w-5 h-5" />}
          label={t('stats.words')}
          value={stats.words}
        />
        <StatCard
          icon={<Rows3 className="w-5 h-5" />}
          label={t('stats.paragraphs')}
          value={stats.paragraphs}
        />
        <StatCard
          icon={<MessageSquare className="w-5 h-5" />}
          label={t('stats.sentences')}
          value={stats.sentences}
        />
      </div>

      {/* Textarea */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('input.placeholder')}
          className="w-full h-64 p-4 text-gray-900 dark:text-white bg-transparent resize-none focus:outline-none text-base leading-relaxed placeholder:text-gray-400 dark:placeholder:text-gray-500"
          spellCheck={false}
        />

        {/* Bottom Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <AlignLeft className="w-4 h-4" />
              {stats.lines} {t('stats.lines')}
            </span>
            <span>{stats.bytes.toLocaleString()} {t('stats.bytes')}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              disabled={!text}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm hover:shadow-md"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  {t('actions.copied')}
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  {t('actions.copy')}
                </>
              )}
            </button>
            <button
              onClick={handleClear}
              disabled={!text}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200"
            >
              <Trash2 className="w-4 h-4" />
              {t('actions.clear')}
            </button>
          </div>
        </div>
      </div>

      {/* Guide */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('guide.title')}
        </h2>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Usage Examples */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t('guide.sections.usage.title')}
            </h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              {(t.raw('guide.sections.usage.items') as string[]).map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Counting Methods */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t('guide.sections.counting.title')}
            </h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">•</span>
                {t('guide.sections.counting.characters')}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">•</span>
                {t('guide.sections.counting.withoutSpaces')}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">•</span>
                {t('guide.sections.counting.words')}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">•</span>
                {t('guide.sections.counting.sentences')}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">•</span>
                {t('guide.sections.counting.paragraphs')}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
