'use client'
import { useState, useCallback } from 'react'
import { Copy, Check } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface CodeViewerProps {
  code: string
  language?: string
  highlightLines?: number[]
  title?: string
}

export default function CodeViewer({ code, language = 'typescript', highlightLines = [], title }: CodeViewerProps) {
  const t = useTranslations('algorithmHub')
  const [copied, setCopied] = useState(false)

  const copyCode = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = code
        textarea.style.position = 'fixed'
        textarea.style.left = '-999999px'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // silently fail
    }
  }, [code])

  const lines = code.split('\n')

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200/50 dark:border-gray-700/50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          {title && <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">{title}</span>}
          <span className="text-xs text-gray-400 dark:text-gray-500 uppercase">{language}</span>
        </div>
        <button
          onClick={copyCode}
          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? t('code.copied') : t('code.copy')}
        </button>
      </div>

      {/* Code */}
      <div className="overflow-x-auto bg-gray-50 dark:bg-gray-900">
        <pre className="text-sm leading-6">
          {lines.map((line, i) => {
            const lineNum = i + 1
            const isHighlighted = highlightLines.includes(lineNum)

            return (
              <div
                key={i}
                className={`flex ${
                  isHighlighted
                    ? 'bg-blue-100/60 dark:bg-blue-900/30 border-l-2 border-blue-500'
                    : 'border-l-2 border-transparent'
                }`}
              >
                <span className="select-none w-12 text-right pr-4 text-xs text-gray-400 dark:text-gray-600 py-0.5 flex-shrink-0">
                  {lineNum}
                </span>
                <code className="text-gray-800 dark:text-gray-200 py-0.5 pr-4 whitespace-pre">
                  {line}
                </code>
              </div>
            )
          })}
        </pre>
      </div>
    </div>
  )
}
