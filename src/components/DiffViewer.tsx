'use client'

import { useState, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Copy, Check, Trash2, ArrowLeftRight, FileText } from 'lucide-react'

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged'
  content: string
  lineNumber: { left?: number; right?: number }
}

export default function DiffViewer() {
  const t = useTranslations('diffViewer')
  const [leftText, setLeftText] = useState('')
  const [rightText, setRightText] = useState('')
  const [showDiff, setShowDiff] = useState(false)
  const [copied, setCopied] = useState(false)

  const computeDiff = useCallback((left: string, right: string): DiffLine[] => {
    const leftLines = left.split('\n')
    const rightLines = right.split('\n')
    const result: DiffLine[] = []

    // Simple LCS-based diff algorithm
    const lcs = computeLCS(leftLines, rightLines)

    let leftIdx = 0
    let rightIdx = 0
    let lcsIdx = 0

    while (leftIdx < leftLines.length || rightIdx < rightLines.length) {
      if (lcsIdx < lcs.length && leftIdx < leftLines.length && leftLines[leftIdx] === lcs[lcsIdx]) {
        if (rightIdx < rightLines.length && rightLines[rightIdx] === lcs[lcsIdx]) {
          result.push({
            type: 'unchanged',
            content: leftLines[leftIdx],
            lineNumber: { left: leftIdx + 1, right: rightIdx + 1 }
          })
          leftIdx++
          rightIdx++
          lcsIdx++
        } else {
          result.push({
            type: 'added',
            content: rightLines[rightIdx],
            lineNumber: { right: rightIdx + 1 }
          })
          rightIdx++
        }
      } else if (leftIdx < leftLines.length) {
        result.push({
          type: 'removed',
          content: leftLines[leftIdx],
          lineNumber: { left: leftIdx + 1 }
        })
        leftIdx++
      } else if (rightIdx < rightLines.length) {
        result.push({
          type: 'added',
          content: rightLines[rightIdx],
          lineNumber: { right: rightIdx + 1 }
        })
        rightIdx++
      }
    }

    return result
  }, [])

  const computeLCS = (arr1: string[], arr2: string[]): string[] => {
    const m = arr1.length
    const n = arr2.length
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0))

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (arr1[i - 1] === arr2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
        }
      }
    }

    // Backtrack to find LCS
    const lcs: string[] = []
    let i = m, j = n
    while (i > 0 && j > 0) {
      if (arr1[i - 1] === arr2[j - 1]) {
        lcs.unshift(arr1[i - 1])
        i--
        j--
      } else if (dp[i - 1][j] > dp[i][j - 1]) {
        i--
      } else {
        j--
      }
    }

    return lcs
  }

  const diffResult = useMemo(() => {
    if (!showDiff) return []
    return computeDiff(leftText, rightText)
  }, [leftText, rightText, showDiff, computeDiff])

  const stats = useMemo(() => {
    const added = diffResult.filter(d => d.type === 'added').length
    const removed = diffResult.filter(d => d.type === 'removed').length
    const unchanged = diffResult.filter(d => d.type === 'unchanged').length
    return { added, removed, unchanged }
  }, [diffResult])

  const handleCompare = useCallback(() => {
    setShowDiff(true)
  }, [])

  const handleSwap = useCallback(() => {
    const temp = leftText
    setLeftText(rightText)
    setRightText(temp)
    setShowDiff(false)
  }, [leftText, rightText])

  const handleClear = useCallback(() => {
    setLeftText('')
    setRightText('')
    setShowDiff(false)
  }, [])

  const handleCopyDiff = useCallback(async () => {
    const diffText = diffResult.map(line => {
      const prefix = line.type === 'added' ? '+ ' : line.type === 'removed' ? '- ' : '  '
      return prefix + line.content
    }).join('\n')

    try {
      await navigator.clipboard.writeText(diffText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = diffText
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [diffResult])

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <FileText className="w-7 h-7 text-orange-500" />
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t('description')}
        </p>
      </div>

      {/* Input Section */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {/* Left Text */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border-b border-gray-200 dark:border-gray-700">
            <span className="text-sm font-medium text-red-700 dark:text-red-300">
              {t('input.original')}
            </span>
          </div>
          <textarea
            value={leftText}
            onChange={(e) => { setLeftText(e.target.value); setShowDiff(false); }}
            placeholder={t('input.originalPlaceholder')}
            className="w-full h-64 p-4 text-gray-900 dark:text-white bg-transparent resize-none focus:outline-none text-sm font-mono leading-relaxed placeholder:text-gray-400 dark:placeholder:text-gray-500"
            spellCheck={false}
          />
        </div>

        {/* Right Text */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 bg-green-50 dark:bg-green-900/20 border-b border-gray-200 dark:border-gray-700">
            <span className="text-sm font-medium text-green-700 dark:text-green-300">
              {t('input.modified')}
            </span>
          </div>
          <textarea
            value={rightText}
            onChange={(e) => { setRightText(e.target.value); setShowDiff(false); }}
            placeholder={t('input.modifiedPlaceholder')}
            className="w-full h-64 p-4 text-gray-900 dark:text-white bg-transparent resize-none focus:outline-none text-sm font-mono leading-relaxed placeholder:text-gray-400 dark:placeholder:text-gray-500"
            spellCheck={false}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-4 mb-6">
        <button
          onClick={handleCompare}
          className="px-8 py-3 rounded-xl font-medium bg-orange-500 hover:bg-orange-600 text-white shadow-lg hover:shadow-xl transition-all"
        >
          {t('actions.compare')}
        </button>
        <button
          onClick={handleSwap}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition-all"
        >
          <ArrowLeftRight className="w-4 h-4" />
          {t('actions.swap')}
        </button>
        <button
          onClick={handleClear}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition-all"
        >
          <Trash2 className="w-4 h-4" />
          {t('actions.clear')}
        </button>
      </div>

      {/* Diff Result */}
      {showDiff && diffResult.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('results.title')}
              </span>
              <div className="flex items-center gap-3 text-xs">
                <span className="px-2 py-1 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                  +{stats.added} {t('results.added')}
                </span>
                <span className="px-2 py-1 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                  -{stats.removed} {t('results.removed')}
                </span>
                <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300">
                  {stats.unchanged} {t('results.unchanged')}
                </span>
              </div>
            </div>
            <button
              onClick={handleCopyDiff}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium bg-orange-500 hover:bg-orange-600 text-white transition-all"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? t('actions.copied') : t('actions.copyDiff')}
            </button>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-full text-sm font-mono">
              {diffResult.map((line, idx) => (
                <div
                  key={idx}
                  className={`flex ${
                    line.type === 'added'
                      ? 'bg-green-50 dark:bg-green-900/20'
                      : line.type === 'removed'
                      ? 'bg-red-50 dark:bg-red-900/20'
                      : ''
                  }`}
                >
                  <div className="w-12 flex-shrink-0 px-2 py-1 text-right text-gray-400 border-r border-gray-200 dark:border-gray-700 select-none">
                    {line.lineNumber.left || ''}
                  </div>
                  <div className="w-12 flex-shrink-0 px-2 py-1 text-right text-gray-400 border-r border-gray-200 dark:border-gray-700 select-none">
                    {line.lineNumber.right || ''}
                  </div>
                  <div className="w-8 flex-shrink-0 px-2 py-1 text-center select-none">
                    <span className={
                      line.type === 'added'
                        ? 'text-green-600 dark:text-green-400'
                        : line.type === 'removed'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-400'
                    }>
                      {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                    </span>
                  </div>
                  <div className={`flex-1 px-2 py-1 whitespace-pre ${
                    line.type === 'added'
                      ? 'text-green-800 dark:text-green-200'
                      : line.type === 'removed'
                      ? 'text-red-800 dark:text-red-200'
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    {line.content || ' '}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Guide */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('guide.title')}
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t('guide.howToUse.title')}
            </h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              {(t.raw('guide.howToUse.items') as string[]).map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t('guide.useCases.title')}
            </h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              {(t.raw('guide.useCases.items') as string[]).map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
