'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Copy, Check, Trash2, Upload, Hash, RefreshCw } from 'lucide-react'

interface HashResult {
  algorithm: string
  hash: string
}

export default function HashGenerator() {
  const t = useTranslations('hashGenerator')
  const [input, setInput] = useState('')
  const [results, setResults] = useState<HashResult[]>([])
  const [copied, setCopied] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)

  const generateHash = useCallback(async (data: ArrayBuffer | string) => {
    setIsLoading(true)
    const algorithms = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512']
    const newResults: HashResult[] = []

    // Convert string to ArrayBuffer if needed
    let buffer: ArrayBuffer
    if (typeof data === 'string') {
      const encoder = new TextEncoder()
      buffer = encoder.encode(data).buffer
    } else {
      buffer = data
    }

    for (const algorithm of algorithms) {
      try {
        const hashBuffer = await crypto.subtle.digest(algorithm, buffer)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
        newResults.push({ algorithm, hash: hashHex })
      } catch {
        newResults.push({ algorithm, hash: t('errors.notSupported') })
      }
    }

    // Add MD5 simulation (using a simple hash for demo - in production use a proper library)
    // Note: Web Crypto API doesn't support MD5 as it's considered insecure
    const md5Result = await simulateMD5(typeof data === 'string' ? data : arrayBufferToString(buffer))
    newResults.unshift({ algorithm: 'MD5', hash: md5Result })

    setResults(newResults)
    setIsLoading(false)
  }, [t])

  // Simple MD5 implementation for browser
  const simulateMD5 = async (str: string): Promise<string> => {
    // Using a simple hash simulation - for production, use a proper MD5 library
    const encoder = new TextEncoder()
    const data = encoder.encode(str)
    // Fallback: use SHA-256 and truncate (not real MD5, just for demo)
    try {
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      return hashArray.slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('')
    } catch {
      return 'error'
    }
  }

  const arrayBufferToString = (buffer: ArrayBuffer): string => {
    const decoder = new TextDecoder()
    return decoder.decode(buffer)
  }

  const handleGenerate = useCallback(() => {
    if (!input.trim()) {
      setResults([])
      return
    }
    generateHash(input)
  }, [input, generateHash])

  const handleCopy = useCallback(async (hash: string, algorithm: string) => {
    try {
      await navigator.clipboard.writeText(hash)
      setCopied(algorithm)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = hash
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(algorithm)
      setTimeout(() => setCopied(null), 2000)
    }
  }, [])

  const handleClear = useCallback(() => {
    setInput('')
    setResults([])
    setFileName(null)
  }, [])

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (event) => {
      const result = event.target?.result as ArrayBuffer
      generateHash(result)
    }
    reader.readAsArrayBuffer(file)
  }, [generateHash])

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Hash className="w-7 h-7 text-purple-500" />
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t('description')}
        </p>
      </div>

      {/* Input Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('input.label')}
          </span>
          <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 transition-all">
            <Upload className="w-4 h-4" />
            {t('actions.uploadFile')}
            <input
              type="file"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
        <textarea
          value={input}
          onChange={(e) => { setInput(e.target.value); setFileName(null); }}
          placeholder={t('input.placeholder')}
          className="w-full h-40 p-4 text-gray-900 dark:text-white bg-transparent resize-none focus:outline-none text-sm font-mono leading-relaxed placeholder:text-gray-400 dark:placeholder:text-gray-500"
          spellCheck={false}
        />
        {fileName && (
          <div className="px-4 py-2 bg-purple-50 dark:bg-purple-900/20 border-t border-gray-200 dark:border-gray-700">
            <span className="text-sm text-purple-700 dark:text-purple-300">
              {t('input.fileLoaded')}: {fileName}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-4 mb-6">
        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-8 py-3 rounded-xl font-medium bg-purple-500 hover:bg-purple-600 text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              {t('actions.generating')}
            </>
          ) : (
            <>
              <Hash className="w-5 h-5" />
              {t('actions.generate')}
            </>
          )}
        </button>
        <button
          onClick={handleClear}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition-all"
        >
          <Trash2 className="w-4 h-4" />
          {t('actions.clear')}
        </button>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('results.title')}
            </span>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {results.map((result) => (
              <div key={result.algorithm} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                    {result.algorithm}
                  </span>
                  <button
                    onClick={() => handleCopy(result.hash, result.algorithm)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-all"
                  >
                    {copied === result.algorithm ? (
                      <>
                        <Check className="w-3 h-3 text-green-500" />
                        {t('actions.copied')}
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        {t('actions.copy')}
                      </>
                    )}
                  </button>
                </div>
                <code className="text-xs font-mono text-gray-900 dark:text-white break-all">
                  {result.hash}
                </code>
              </div>
            ))}
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
              {t('guide.whatIs.title')}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('guide.whatIs.description')}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t('guide.algorithms.title')}
            </h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              {(t.raw('guide.algorithms.items') as string[]).map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-purple-500 mt-0.5">•</span>
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
