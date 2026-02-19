'use client'

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import dynamic from 'next/dynamic'
import {
  FileJson,
  Check,
  Copy,
  Download,
  Upload,
  AlertCircle,
  Zap,
  Code,
  TreePine,
  BarChart3,
  Settings,
  Expand,
  Shrink,
  ChevronRight,
  ChevronDown,
  Clipboard,
  Globe,
  Loader2,
  Search,
  X,
  Keyboard,
  Info,
  Hash,
  Type,
  ToggleLeft,
  ToggleRight,
  FileUp,
  Link,
  Wand2,
} from 'lucide-react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

// Lazy-load CodeMirror (browser-only)
const JsonCodeEditor = dynamic(() => import('./JsonCodeEditor'), {
  ssr: false,
  loading: () => (
    <div className="h-96 bg-gray-50 dark:bg-gray-800 rounded-lg animate-pulse flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
    </div>
  ),
})

// ── Utility functions ──

function stableStringify(obj: unknown, indent: number, sort: boolean): string {
  if (!sort) return JSON.stringify(obj, null, indent)
  return JSON.stringify(
    obj,
    (_key, value) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return Object.keys(value)
          .sort()
          .reduce((sorted: Record<string, unknown>, k) => {
            sorted[k] = value[k]
            return sorted
          }, {})
      }
      return value
    },
    indent,
  )
}

function countKeys(obj: unknown): number {
  if (obj === null || typeof obj !== 'object') return 0
  if (Array.isArray(obj)) return obj.reduce((sum: number, item) => sum + countKeys(item), 0)
  return Object.keys(obj).length + Object.values(obj).reduce((sum: number, v) => sum + countKeys(v), 0)
}

function computeDepth(obj: unknown, depth = 0): number {
  if (obj === null || typeof obj !== 'object') return depth
  if (Array.isArray(obj)) {
    return obj.reduce((max: number, item) => Math.max(max, computeDepth(item, depth + 1)), depth)
  }
  return Object.values(obj).reduce((max: number, v) => Math.max(max, computeDepth(v, depth + 1)), depth)
}

function countNodes(obj: unknown): number {
  if (obj === null || typeof obj !== 'object') return 1
  if (Array.isArray(obj)) return 1 + obj.reduce((sum: number, item) => sum + countNodes(item), 0)
  return 1 + Object.values(obj).reduce((sum: number, v) => sum + countNodes(v), 0)
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function extractErrorLine(errorMsg: string, input: string): number | null {
  const posMatch = errorMsg.match(/position\s+(\d+)/i)
  if (posMatch) {
    const pos = parseInt(posMatch[1])
    return input.substring(0, pos).split('\n').length
  }
  const lineMatch = errorMsg.match(/line\s+(\d+)/i)
  if (lineMatch) return parseInt(lineMatch[1])
  return null
}

function toJsonPath(internalPath: string): string {
  return (
    '$' +
    internalPath
      .split('.')
      .filter(Boolean)
      .map((segment) => {
        if (/^\d+$/.test(segment)) return `[${segment}]`
        if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(segment)) return `.${segment}`
        return `["${segment}"]`
      })
      .join('')
  )
}

function getTypeOf(value: unknown): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

// ── Stats computation ──
interface JsonStats {
  typeDistribution: { name: string; value: number; color: string }[]
  depthDistribution: { name: string; value: number }[]
  topKeys: { name: string; value: number }[]
  totalNodes: number
  totalKeys: number
  maxDepth: number
}

function computeJsonStats(data: unknown): JsonStats {
  const types: Record<string, number> = { string: 0, number: 0, boolean: 0, null: 0, object: 0, array: 0 }
  const depths: Record<number, number> = {}
  const keyFreq: Record<string, number> = {}

  const traverse = (obj: unknown, depth: number) => {
    depths[depth] = (depths[depth] || 0) + 1
    if (obj === null) {
      types.null++
      return
    }
    if (Array.isArray(obj)) {
      types.array++
      obj.forEach((item) => traverse(item, depth + 1))
    } else if (typeof obj === 'object') {
      types.object++
      Object.entries(obj as Record<string, unknown>).forEach(([k, v]) => {
        keyFreq[k] = (keyFreq[k] || 0) + 1
        traverse(v, depth + 1)
      })
    } else {
      types[typeof obj] = (types[typeof obj] || 0) + 1
    }
  }
  traverse(data, 0)

  const typeColors: Record<string, string> = {
    string: '#22c55e',
    number: '#3b82f6',
    boolean: '#a855f7',
    null: '#6b7280',
    object: '#f97316',
    array: '#06b6d4',
  }

  return {
    typeDistribution: Object.entries(types)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value, color: typeColors[name] || '#6b7280' })),
    depthDistribution: Object.entries(depths)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([level, value]) => ({ name: `${level}`, value })),
    topKeys: Object.entries(keyFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, value]) => ({ name, value })),
    totalNodes: countNodes(data),
    totalKeys: countKeys(data),
    maxDepth: computeDepth(data),
  }
}

// ── TreeNode component ──
interface TreeNodeProps {
  nodeKey: string
  value: unknown
  path: string
  level: number
  expandedNodes: Set<string>
  onToggle: (path: string) => void
  searchQuery: string
  onCopyPath: (path: string) => void
  sortKeys: boolean
}

const TreeNode = React.memo<TreeNodeProps>(function TreeNode({
  nodeKey,
  value,
  path,
  level,
  expandedNodes,
  onToggle,
  searchQuery,
  onCopyPath,
  sortKeys: sortKeysFlag,
}) {
  const type = getTypeOf(value)
  const isExpandable = type === 'object' || type === 'array'
  const isExpanded = expandedNodes.has(path)

  const matchesSearch =
    searchQuery &&
    (nodeKey.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (typeof value === 'string' && value.toLowerCase().includes(searchQuery.toLowerCase())) ||
      String(value).toLowerCase().includes(searchQuery.toLowerCase()))

  const getChildEntries = (): [string, unknown][] => {
    if (type === 'array') {
      return (value as unknown[]).map((item, i) => [String(i), item])
    }
    if (type === 'object') {
      const entries = Object.entries(value as Record<string, unknown>)
      return sortKeysFlag ? entries.sort(([a], [b]) => a.localeCompare(b)) : entries
    }
    return []
  }

  const childCount = isExpandable
    ? type === 'array'
      ? (value as unknown[]).length
      : Object.keys(value as Record<string, unknown>).length
    : 0

  const renderValue = () => {
    switch (type) {
      case 'string':
        return <span className="text-green-600 dark:text-green-400">&quot;{String(value).length > 100 ? String(value).substring(0, 100) + '...' : String(value)}&quot;</span>
      case 'number':
        return <span className="text-blue-600 dark:text-blue-400">{String(value)}</span>
      case 'boolean':
        return <span className="text-purple-600 dark:text-purple-400">{String(value)}</span>
      case 'null':
        return <span className="text-gray-500 dark:text-gray-400">null</span>
      case 'object':
        return (
          <span className="text-gray-500 dark:text-gray-400">
            {isExpanded ? '' : `{${childCount}}`}
          </span>
        )
      case 'array':
        return (
          <span className="text-gray-500 dark:text-gray-400">
            {isExpanded ? '' : `[${childCount}]`}
          </span>
        )
      default:
        return <span className="text-gray-600">{String(value)}</span>
    }
  }

  return (
    <div>
      <div
        className={`group flex items-center py-0.5 pr-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer rounded ${
          matchesSearch ? 'bg-yellow-100 dark:bg-yellow-900/40' : ''
        }`}
        style={{ paddingLeft: `${level * 20 + 8}px` }}
        onClick={() => {
          if (isExpandable) onToggle(path)
        }}
      >
        {isExpandable ? (
          <button
            className="w-4 h-4 flex items-center justify-center mr-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation()
              onToggle(path)
            }}
          >
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
        ) : (
          <span className="w-4 mr-1 flex-shrink-0" />
        )}

        <span className="font-medium text-gray-800 dark:text-gray-200 text-sm mr-1 flex-shrink-0">
          {/^\d+$/.test(nodeKey) ? (
            <span className="text-gray-500">[{nodeKey}]</span>
          ) : (
            <>
              &quot;<span className="text-red-700 dark:text-red-400">{nodeKey}</span>&quot;
            </>
          )}
          <span className="text-gray-400">: </span>
        </span>

        <span className="text-sm truncate">{renderValue()}</span>

        <button
          className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-blue-500 p-0.5 flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation()
            onCopyPath(path)
          }}
          title="Copy JSONPath"
        >
          <Clipboard className="w-3 h-3" />
        </button>
      </div>

      {isExpanded &&
        isExpandable &&
        getChildEntries().map(([childKey, childValue]) => (
          <TreeNode
            key={childKey}
            nodeKey={childKey}
            value={childValue}
            path={path ? `${path}.${childKey}` : childKey}
            level={level + 1}
            expandedNodes={expandedNodes}
            onToggle={onToggle}
            searchQuery={searchQuery}
            onCopyPath={onCopyPath}
            sortKeys={sortKeysFlag}
          />
        ))}
    </div>
  )
})

// ── Main component ──
type Mode = 'format' | 'minify' | 'tree' | 'stats'

const JsonFormatter = () => {
  const t = useTranslations('jsonFormatter')

  // Primary state
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<Mode>('format')

  // Parse cache
  const [parsedResult, setParsedResult] = useState<{
    data: unknown
    error: string | null
    errorLine: number | null
  } | null>(null)
  const [processingTime, setProcessingTime] = useState<number | null>(null)

  // Tree view
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [treeSearchQuery, setTreeSearchQuery] = useState('')

  // Settings
  const [indentSize, setIndentSize] = useState(2)
  const [sortKeys, setSortKeys] = useState(false)
  const [json5Mode, setJson5Mode] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)

  // UI
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copiedPath, setCopiedPath] = useState('')
  const [isDragging, setIsDragging] = useState(false)

  // URL import
  const [showUrlImport, setShowUrlImport] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [isLoadingUrl, setIsLoadingUrl] = useState(false)

  // JSONPath query
  const [showJsonPath, setShowJsonPath] = useState(false)
  const [jsonPathQuery, setJsonPathQuery] = useState('')
  const [jsonPathResult, setJsonPathResult] = useState('')
  const [jsonPathError, setJsonPathError] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Debounced parsing ──
  useEffect(() => {
    if (!input.trim()) {
      setParsedResult(null)
      setProcessingTime(null)
      return
    }

    const timer = setTimeout(async () => {
      const start = performance.now()
      try {
        let data: unknown
        if (json5Mode) {
          const JSON5 = (await import('json5')).default
          data = JSON5.parse(input)
        } else {
          data = JSON.parse(input)
        }
        const elapsed = performance.now() - start
        setProcessingTime(elapsed)
        setParsedResult({ data, error: null, errorLine: null })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Invalid JSON'
        const errorLine = extractErrorLine(msg, input)
        setParsedResult({ data: null, error: msg, errorLine })
        setProcessingTime(null)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [input, json5Mode])

  // ── Derived output ──
  const output = useMemo(() => {
    if (!parsedResult?.data) return ''
    if (mode === 'format') return stableStringify(parsedResult.data, indentSize, sortKeys)
    if (mode === 'minify') return JSON.stringify(parsedResult.data)
    return ''
  }, [parsedResult?.data, mode, indentSize, sortKeys])

  // ── Stats ──
  const stats = useMemo(() => {
    if (!parsedResult?.data) return null
    return computeJsonStats(parsedResult.data)
  }, [parsedResult?.data])

  // ── Status bar data ──
  const statusData = useMemo(() => {
    if (!parsedResult) return null
    const inputSize = new Blob([input]).size
    const outputSize = output ? new Blob([output]).size : 0
    return {
      isValid: !parsedResult.error,
      keyCount: parsedResult.data ? countKeys(parsedResult.data) : 0,
      maxDepth: parsedResult.data ? computeDepth(parsedResult.data) : 0,
      nodeCount: parsedResult.data ? countNodes(parsedResult.data) : 0,
      inputSize: formatSize(inputSize),
      outputSize: formatSize(outputSize),
      processingTime: processingTime?.toFixed(1),
    }
  }, [parsedResult, input, output, processingTime])

  // ── Handlers ──
  const handleCopy = useCallback(async () => {
    const textToCopy = mode === 'tree' || mode === 'stats'
      ? (parsedResult?.data ? stableStringify(parsedResult.data, indentSize, sortKeys) : '')
      : output
    if (!textToCopy) return
    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
      const textarea = document.createElement('textarea')
      textarea.value = textToCopy
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [mode, output, parsedResult?.data, indentSize, sortKeys])

  const handleDownload = useCallback(() => {
    const text = mode === 'tree' || mode === 'stats'
      ? (parsedResult?.data ? stableStringify(parsedResult.data, indentSize, sortKeys) : '')
      : output
    if (!text) return
    const blob = new Blob([text], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `json-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [mode, output, parsedResult?.data, indentSize, sortKeys])

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      alert(t('errors.fileTooLarge'))
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => setInput(ev.target?.result as string)
    reader.readAsText(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [t])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      alert(t('errors.fileTooLarge'))
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => setInput(ev.target?.result as string)
    reader.readAsText(file)
  }, [t])

  const handleUrlImport = useCallback(async () => {
    if (!urlInput.trim()) return
    setIsLoadingUrl(true)
    try {
      const { fetchWithCorsProxy } = await import('@/utils/corsProxy')
      const response = await fetchWithCorsProxy(urlInput.trim())
      const text = await response.text()
      setInput(text)
      setShowUrlImport(false)
      setUrlInput('')
    } catch {
      alert(t('urlImport.error'))
    } finally {
      setIsLoadingUrl(false)
    }
  }, [urlInput, t])

  const handleAutoFix = useCallback(async () => {
    if (!input.trim()) return
    try {
      const { jsonrepair } = await import('jsonrepair')
      const repaired = jsonrepair(input)
      setInput(repaired)
    } catch {
      alert(t('errors.autoFixFailed'))
    }
  }, [input, t])

  const toggleNode = useCallback((path: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }, [])

  const expandAll = useCallback(() => {
    if (!parsedResult?.data) return
    const paths = new Set<string>()
    const collect = (obj: unknown, path: string) => {
      if (obj === null || typeof obj !== 'object') return
      if (path) paths.add(path)
      if (Array.isArray(obj)) {
        obj.forEach((item, i) => collect(item, path ? `${path}.${i}` : String(i)))
      } else {
        Object.entries(obj as Record<string, unknown>).forEach(([k, v]) =>
          collect(v, path ? `${path}.${k}` : k),
        )
      }
    }
    collect(parsedResult.data, '')
    setExpandedNodes(paths)
  }, [parsedResult?.data])

  const collapseAll = useCallback(() => {
    setExpandedNodes(new Set())
  }, [])

  const handleCopyPath = useCallback((path: string) => {
    const jsonPath = toJsonPath(path)
    navigator.clipboard.writeText(jsonPath).catch(() => {})
    setCopiedPath(jsonPath)
    setTimeout(() => setCopiedPath(''), 2000)
  }, [])

  const executeJsonPath = useCallback(async () => {
    if (!parsedResult?.data || !jsonPathQuery.trim()) return
    try {
      const { JSONPath } = await import('jsonpath-plus')
      const result = JSONPath({ path: jsonPathQuery, json: parsedResult.data })
      setJsonPathResult(JSON.stringify(result, null, 2))
      setJsonPathError('')
    } catch (err) {
      setJsonPathError(err instanceof Error ? err.message : 'Invalid JSONPath')
      setJsonPathResult('')
    }
  }, [parsedResult?.data, jsonPathQuery])

  const insertExample = useCallback(() => {
    const example = {
      store: {
        book: [
          { category: 'reference', author: 'Nigel Rees', title: 'Sayings of the Century', price: 8.95 },
          { category: 'fiction', author: 'Evelyn Waugh', title: 'Sword of Honour', price: 12.99 },
          { category: 'fiction', author: 'Herman Melville', title: 'Moby Dick', isbn: '0-553-21311-3', price: 8.99 },
          { category: 'fiction', author: 'J.R.R. Tolkien', title: 'The Lord of the Rings', isbn: '0-395-19395-8', price: 22.99 },
        ],
        bicycle: { color: 'red', price: 19.95 },
      },
      metadata: {
        version: '1.0',
        generated: '2025-01-01T00:00:00Z',
        count: 4,
        tags: ['sample', 'bookstore', 'demo'],
        config: { debug: false, maxRetries: 3, timeout: null },
      },
    }
    setInput(JSON.stringify(example, null, 2))
  }, [])

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
        switch (e.key.toUpperCase()) {
          case 'F':
            e.preventDefault()
            setMode('format')
            break
          case 'M':
            e.preventDefault()
            setMode('minify')
            break
          case 'T':
            e.preventDefault()
            setMode('tree')
            break
          case 'C':
            e.preventDefault()
            handleCopy()
            break
        }
      }
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreen, handleCopy])

  // ── Mode config ──
  const modes: { key: Mode; icon: React.ReactNode; label: string }[] = [
    { key: 'format', icon: <Code className="w-4 h-4" />, label: t('modes.format') },
    { key: 'minify', icon: <Zap className="w-4 h-4" />, label: t('modes.minify') },
    { key: 'tree', icon: <TreePine className="w-4 h-4" />, label: t('modes.treeView') },
    { key: 'stats', icon: <BarChart3 className="w-4 h-4" />, label: t('modes.stats') },
  ]

  const CHART_COLORS = ['#22c55e', '#3b82f6', '#a855f7', '#6b7280', '#f97316', '#06b6d4']

  // ── Render ──
  return (
    <div
      className={`${
        isFullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-gray-900 overflow-auto p-4' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'
      }`}
    >
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <FileJson className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('description')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowShortcuts(!showShortcuts)}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={t('shortcuts.title')}
            >
              <Keyboard className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={t('controls.settings')}
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={isFullscreen ? t('controls.exitFullscreen') : t('controls.fullscreen')}
            >
              {isFullscreen ? <Shrink className="w-4 h-4" /> : <Expand className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Shortcuts tooltip */}
        {showShortcuts && (
          <div className="mt-3 bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-sm">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { keys: 'Ctrl+Shift+F', action: t('shortcuts.format') },
                { keys: 'Ctrl+Shift+M', action: t('shortcuts.minify') },
                { keys: 'Ctrl+Shift+T', action: t('shortcuts.treeView') },
                { keys: 'Ctrl+Shift+C', action: t('shortcuts.copyOutput') },
              ].map(({ keys, action }) => (
                <div key={keys} className="flex items-center gap-2">
                  <kbd className="px-2 py-0.5 bg-white dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 text-xs font-mono">
                    {keys}
                  </kbd>
                  <span className="text-gray-600 dark:text-gray-400">{action}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings panel */}
        {showSettings && (
          <div className="mt-3 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <label className="text-gray-600 dark:text-gray-400 font-medium">{t('settings.indentSize')}:</label>
                <select
                  value={indentSize}
                  onChange={(e) => setIndentSize(Number(e.target.value))}
                  className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm"
                >
                  {[2, 4, 8].map((n) => (
                    <option key={n} value={n}>
                      {t('settings.spaces', { count: n })}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={sortKeys}
                  onChange={(e) => setSortKeys(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-600 dark:text-gray-400">{t('settings.sortKeys')}</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <button
                  onClick={() => setJson5Mode(!json5Mode)}
                  className="flex items-center"
                >
                  {json5Mode ? (
                    <ToggleRight className="w-5 h-5 text-blue-500" />
                  ) : (
                    <ToggleLeft className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                <span className="text-gray-600 dark:text-gray-400">{t('settings.json5Mode')}</span>
                <span className="text-xs text-gray-400">({t('settings.json5Desc')})</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Mode tabs */}
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
          {modes.map(({ key, icon, label }) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                mode === key
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              {icon}
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 hidden sm:block" />

        {/* Action buttons */}
        <button
          onClick={insertExample}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <Info className="w-4 h-4" />
          <span className="hidden sm:inline">{t('controls.example')}</span>
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <FileUp className="w-4 h-4" />
          <span className="hidden sm:inline">{t('controls.upload')}</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.txt,.json5,.jsonc"
          onChange={handleFileUpload}
          className="hidden"
        />

        <button
          onClick={() => setShowUrlImport(!showUrlImport)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
            showUrlImport
              ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <Link className="w-4 h-4" />
          <span className="hidden sm:inline">{t('controls.urlImport')}</span>
        </button>

        <button
          onClick={() => setShowJsonPath(!showJsonPath)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
            showJsonPath
              ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-600'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <Search className="w-4 h-4" />
          <span className="hidden sm:inline">JSONPath</span>
        </button>

        <div className="ml-auto flex items-center gap-2">
          {!!(output || parsedResult?.data) && (
            <>
              <button
                onClick={handleCopy}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  copied
                    ? 'bg-green-100 dark:bg-green-900/50 text-green-600'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span className="hidden sm:inline">{copied ? t('controls.copied') : t('controls.copy')}</span>
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">{t('controls.download')}</span>
              </button>
            </>
          )}
          {input && (
            <button
              onClick={() => {
                setInput('')
                setExpandedNodes(new Set())
                setJsonPathQuery('')
                setJsonPathResult('')
                setTreeSearchQuery('')
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">{t('controls.clear')}</span>
            </button>
          )}
        </div>
      </div>

      {/* URL Import panel */}
      {showUrlImport && (
        <div className="mb-4 flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder={t('urlImport.placeholder')}
            className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onKeyDown={(e) => e.key === 'Enter' && handleUrlImport()}
          />
          <button
            onClick={handleUrlImport}
            disabled={isLoadingUrl || !urlInput.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoadingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
            {isLoadingUrl ? t('urlImport.loading') : t('urlImport.fetch')}
          </button>
        </div>
      )}

      {/* JSONPath Query panel */}
      {showJsonPath && (
        <div className="mb-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={jsonPathQuery}
              onChange={(e) => setJsonPathQuery(e.target.value)}
              placeholder={t('jsonPath.placeholder')}
              className="flex-1 px-3 py-2 rounded-lg border border-purple-200 dark:border-purple-700 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm font-mono focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              onKeyDown={(e) => e.key === 'Enter' && executeJsonPath()}
            />
            <button
              onClick={executeJsonPath}
              disabled={!parsedResult?.data || !jsonPathQuery.trim()}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('jsonPath.run')}
            </button>
          </div>

          {/* Example queries */}
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">{t('jsonPath.examples')}:</span>
            {[
              { query: '$.store.book[*].author', label: t('jsonPath.exampleQueries.allAuthors') },
              { query: '$.store.book[?(@.price<10)]', label: t('jsonPath.exampleQueries.filterByPrice') },
              { query: '$..price', label: t('jsonPath.exampleQueries.recursive') },
            ].map(({ query, label }) => (
              <button
                key={query}
                onClick={() => setJsonPathQuery(query)}
                className="px-2 py-0.5 text-xs bg-purple-100 dark:bg-purple-800/50 text-purple-700 dark:text-purple-300 rounded-full hover:bg-purple-200 dark:hover:bg-purple-700/50 transition-colors"
                title={label}
              >
                {query}
              </button>
            ))}
          </div>

          {/* Results */}
          {jsonPathError && (
            <div className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {jsonPathError}
            </div>
          )}
          {jsonPathResult && (
            <div className="mt-2">
              <div className="text-xs text-purple-600 dark:text-purple-400 mb-1 font-medium">{t('jsonPath.result')}:</div>
              <pre className="text-sm bg-white dark:bg-gray-800 p-3 rounded-lg border border-purple-200 dark:border-purple-700 overflow-auto max-h-60 text-gray-800 dark:text-gray-200 font-mono">
                {jsonPathResult}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Main editor area */}
      <div
        className={`grid ${mode === 'stats' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 lg:grid-cols-2'} gap-4 mb-4`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Input panel */}
        <div className="relative">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('input.jsonInput')}</h2>
              {parsedResult && (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    parsedResult.error
                      ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
                      : 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                  }`}
                >
                  {parsedResult.error ? (
                    <>
                      <AlertCircle className="w-3 h-3" />
                      {t('result.invalid')}
                    </>
                  ) : (
                    <>
                      <Check className="w-3 h-3" />
                      {t('result.valid')}
                    </>
                  )}
                </span>
              )}
              {json5Mode && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300">
                  JSON5
                </span>
              )}
            </div>
          </div>

          <JsonCodeEditor
            value={input}
            onChange={setInput}
            placeholder={t('input.pasteJson')}
            height={isFullscreen ? 'calc(100vh - 350px)' : '500px'}
            errorLine={parsedResult?.errorLine}
          />

          {/* Drag overlay */}
          {isDragging && (
            <div className="absolute inset-0 bg-blue-500/10 border-2 border-dashed border-blue-500 rounded-lg flex items-center justify-center z-10">
              <div className="text-center">
                <Upload className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <p className="text-blue-600 dark:text-blue-400 font-medium">{t('dragDrop.message')}</p>
                <p className="text-blue-500/70 text-sm">{t('dragDrop.supported')}</p>
              </div>
            </div>
          )}

          {/* Error message */}
          {parsedResult?.error && (
            <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <span className="font-medium">{t('errors.syntaxError')}: </span>
                  {parsedResult.error}
                  {parsedResult.errorLine && (
                    <span className="text-red-500 ml-1">({t('errors.line')} {parsedResult.errorLine})</span>
                  )}
                </div>
                <button
                  onClick={handleAutoFix}
                  title={t('errors.autoFixTooltip')}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors whitespace-nowrap flex-shrink-0"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  {t('errors.autoFix')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Output panel */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('input.output')}</h2>
            {mode === 'tree' && !!parsedResult?.data && (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={treeSearchQuery}
                    onChange={(e) => setTreeSearchQuery(e.target.value)}
                    placeholder={t('treeView.search')}
                    className="pl-8 pr-3 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 w-48 focus:ring-1 focus:ring-blue-500"
                  />
                  {treeSearchQuery && (
                    <button
                      onClick={() => setTreeSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <button
                  onClick={expandAll}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {t('controls.expandAll')}
                </button>
                <button
                  onClick={collapseAll}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {t('controls.collapseAll')}
                </button>
              </div>
            )}
          </div>

          {/* Format / Minify output */}
          {(mode === 'format' || mode === 'minify') && (
            <JsonCodeEditor
              value={output}
              readOnly
              placeholder={parsedResult?.error ? '' : t('result.formatted')}
              height={isFullscreen ? 'calc(100vh - 350px)' : '500px'}
            />
          )}

          {/* Tree view */}
          {mode === 'tree' && (
            <div
              className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 overflow-auto font-mono ${
                isFullscreen ? 'h-[calc(100vh-350px)]' : 'h-[500px]'
              }`}
            >
              {parsedResult?.data ? (
                <div className="p-2">
                  {copiedPath && (
                    <div className="sticky top-0 z-10 mb-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 text-xs rounded-lg flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      {t('treeView.pathCopied')}: <code className="font-mono">{copiedPath}</code>
                    </div>
                  )}
                  {typeof parsedResult.data === 'object' && parsedResult.data !== null ? (
                    (Array.isArray(parsedResult.data)
                      ? parsedResult.data.map((item, i) => [String(i), item] as [string, unknown])
                      : (sortKeys
                          ? Object.entries(parsedResult.data as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))
                          : Object.entries(parsedResult.data as Record<string, unknown>))
                    ).map(([key, value]) => (
                      <TreeNode
                        key={key}
                        nodeKey={key}
                        value={value}
                        path={key}
                        level={0}
                        expandedNodes={expandedNodes}
                        onToggle={toggleNode}
                        searchQuery={treeSearchQuery}
                        onCopyPath={handleCopyPath}
                        sortKeys={sortKeys}
                      />
                    ))
                  ) : (
                    <div className="p-4 text-sm text-gray-600 dark:text-gray-400">
                      <span className={
                        typeof parsedResult.data === 'string'
                          ? 'text-green-600 dark:text-green-400'
                          : typeof parsedResult.data === 'number'
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-purple-600 dark:text-purple-400'
                      }>
                        {JSON.stringify(parsedResult.data)}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                  {t('treeView.empty')}
                </div>
              )}
            </div>
          )}

          {/* Stats view */}
          {mode === 'stats' && (
            <div
              className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 overflow-auto ${
                isFullscreen ? 'h-[calc(100vh-350px)]' : 'h-[500px]'
              }`}
            >
              {stats ? (
                <div className="p-4 space-y-6">
                  {/* Overview cards */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{t('stats.overview')}</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 rounded-lg bg-blue-50 dark:bg-gray-700">
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                          <Hash className="w-4 h-4" />
                          <span className="text-xs">{t('stats.totalNodes')}</span>
                        </div>
                        <div className="text-xl font-bold text-gray-800 dark:text-gray-200">{stats.totalNodes}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-green-50 dark:bg-gray-700">
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                          <Type className="w-4 h-4" />
                          <span className="text-xs">{t('stats.totalKeys')}</span>
                        </div>
                        <div className="text-xl font-bold text-gray-800 dark:text-gray-200">{stats.totalKeys}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-purple-50 dark:bg-gray-700">
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                          <TreePine className="w-4 h-4" />
                          <span className="text-xs">{t('stats.maxDepth')}</span>
                        </div>
                        <div className="text-xl font-bold text-gray-800 dark:text-gray-200">{stats.maxDepth}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-orange-50 dark:bg-gray-700">
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                          <FileJson className="w-4 h-4" />
                          <span className="text-xs">{t('stats.dataSize')}</span>
                        </div>
                        <div className="text-xl font-bold text-gray-800 dark:text-gray-200">{statusData?.inputSize || '0 B'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Type distribution pie chart */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{t('stats.typeDistribution')}</h3>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={stats.typeDistribution}
                            cx="50%"
                            cy="50%"
                            outerRadius={70}
                            dataKey="value"
                            label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                            labelLine={false}
                          >
                            {stats.typeDistribution.map((entry, i) => (
                              <Cell key={i} fill={entry.color || CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex flex-wrap gap-2">
                        {stats.typeDistribution.map(({ name, value, color }) => (
                          <div key={name} className="flex items-center gap-1.5 text-xs">
                            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                            <span className="text-gray-600 dark:text-gray-400">
                              {name}: <strong>{value}</strong>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Depth distribution bar chart */}
                  {stats.depthDistribution.length > 1 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{t('stats.depthDistribution')}</h3>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={stats.depthDistribution}>
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Top keys */}
                  {stats.topKeys.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{t('stats.topKeys')}</h3>
                      <div className="space-y-1.5">
                        {stats.topKeys.map(({ name, value }) => (
                          <div key={name} className="flex items-center gap-2">
                            <code className="text-xs font-mono text-gray-700 dark:text-gray-300 w-32 truncate">{name}</code>
                            <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-4">
                              <div
                                className="bg-blue-500 h-4 rounded-full flex items-center justify-end pr-2"
                                style={{
                                  width: `${Math.max(10, (value / stats.topKeys[0].value) * 100)}%`,
                                }}
                              >
                                <span className="text-[10px] text-white font-medium">{value}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                  {t('treeView.empty')}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Status bar */}
      {statusData && (
        <div className="flex flex-wrap items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs text-gray-600 dark:text-gray-400 mb-8">
          <span
            className={`inline-flex items-center gap-1 font-medium ${
              statusData.isValid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}
          >
            {statusData.isValid ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
            {statusData.isValid ? t('statusBar.valid') : t('statusBar.invalid')}
          </span>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <span>{t('statusBar.keys')}: <strong>{statusData.keyCount}</strong></span>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <span>{t('statusBar.depth')}: <strong>{statusData.maxDepth}</strong></span>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <span>{t('statusBar.nodes')}: <strong>{statusData.nodeCount}</strong></span>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <span>{t('statusBar.size')}: <strong>{statusData.inputSize}</strong>{output ? ` → ${statusData.outputSize}` : ''}</span>
          {statusData.processingTime && (
            <>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <span>{t('statusBar.time')}: <strong>{statusData.processingTime}ms</strong></span>
            </>
          )}
        </div>
      )}

      {/* Guide section */}
      <div className="mt-12 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white text-center">
          {t('guide.title')}
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-300 text-center mb-12 max-w-4xl mx-auto break-keep whitespace-pre-line">
          {t('guide.subtitle')}
        </p>

        {/* Feature cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-6">
            <div className="flex items-center mb-3">
              <Code className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-green-900 dark:text-green-200 ml-2">{t('guide.features.syntaxHighlight')}</h3>
            </div>
            <p className="text-green-800 dark:text-green-300 text-sm">{t('guide.features.syntaxHighlightDesc')}</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-6">
            <div className="flex items-center mb-3">
              <TreePine className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-blue-900 dark:text-blue-200 ml-2">{t('guide.features.treeView')}</h3>
            </div>
            <p className="text-blue-800 dark:text-blue-300 text-sm">{t('guide.features.treeViewDesc')}</p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-6">
            <div className="flex items-center mb-3">
              <Search className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold text-purple-900 dark:text-purple-200 ml-2">{t('guide.features.jsonPath')}</h3>
            </div>
            <p className="text-purple-800 dark:text-purple-300 text-sm">{t('guide.features.jsonPathDesc')}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-amber-50 dark:bg-amber-900/30 rounded-lg p-6">
            <div className="flex items-center mb-3">
              <FileJson className="w-5 h-5 text-amber-600" />
              <h3 className="font-semibold text-amber-900 dark:text-amber-200 ml-2">{t('guide.features.json5')}</h3>
            </div>
            <p className="text-amber-800 dark:text-amber-300 text-sm">{t('guide.features.json5Desc')}</p>
          </div>
          <div className="bg-cyan-50 dark:bg-cyan-900/30 rounded-lg p-6">
            <div className="flex items-center mb-3">
              <BarChart3 className="w-5 h-5 text-cyan-600" />
              <h3 className="font-semibold text-cyan-900 dark:text-cyan-200 ml-2">{t('guide.features.stats')}</h3>
            </div>
            <p className="text-cyan-800 dark:text-cyan-300 text-sm">{t('guide.features.statsDesc')}</p>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/30 rounded-lg p-6">
            <div className="flex items-center mb-3">
              <Zap className="w-5 h-5 text-orange-600" />
              <h3 className="font-semibold text-orange-900 dark:text-orange-200 ml-2">{t('guide.features.performance')}</h3>
            </div>
            <p className="text-orange-800 dark:text-orange-300 text-sm">{t('guide.features.performanceDesc')}</p>
          </div>
        </div>

        {/* Use cases */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('guide.useCases.title')}</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 dark:text-green-200 mb-2">{t('guide.useCases.apiDebug')}</h4>
              <p className="text-green-800 dark:text-green-300 text-sm">{t('guide.useCases.apiDebugDesc')}</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">{t('guide.useCases.configEdit')}</h4>
              <p className="text-blue-800 dark:text-blue-300 text-sm">{t('guide.useCases.configEditDesc')}</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-4">
              <h4 className="font-semibold text-purple-900 dark:text-purple-200 mb-2">{t('guide.useCases.dataAnalysis')}</h4>
              <p className="text-purple-800 dark:text-purple-300 text-sm">{t('guide.useCases.dataAnalysisDesc')}</p>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('guide.tips.title')}</h3>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
              {[
                t('guide.tips.tip1'),
                t('guide.tips.tip2'),
                t('guide.tips.tip3'),
                t('guide.tips.tip4'),
                t('guide.tips.tip5'),
              ].map((tip, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">{'>'}</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default JsonFormatter
