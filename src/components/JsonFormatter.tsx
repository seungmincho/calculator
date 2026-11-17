'use client'

import React, { useState, useCallback, useMemo, useRef, useEffect, useLayoutEffect } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/jsonFormatter'
import { useFullscreenEscape } from '@/hooks/useFullscreenEscape'
import dynamic from 'next/dynamic'
import { glassCard, glassInset } from '@/lib/glass'
import JsonPathPresets from '@/components/JsonPathPresets'
import JsonTreeSelectionPanel from '@/components/JsonTreeSelectionPanel'
import JsonTreeCopyRecovery from '@/components/JsonTreeCopyRecovery'
import MobileResultLink from '@/components/MobileResultLink'
import { jsonTreeNodeId, jsonTreePointer, resolveJsonTreeNode, serializeJsonTreeValue, sortJsonTreeObject, verifyJsonTreeLiteral, type JsonTreePath, type JsonTreePathResult, type JsonTreePathStatus } from '@/utils/jsonTreeSelection'
import { copyJsonTreeText, createJsonTreeCopyGuard, type JsonTreeCopyTarget } from '@/utils/jsonTreeCopy'
import { evaluateSavedJsonPath } from '@/utils/jsonPathPresets'
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
const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false })

// Lazy-load CodeMirror (browser-only)
const JsonCodeEditor = dynamic(() => import('./JsonCodeEditor'), {
  ssr: false,
  loading: () => (
    <div className="h-96 bg-subtle rounded-lg animate-pulse flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-faint" />
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
        return sortJsonTreeObject(value)
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
  const keyFreq = new Map<string, number>()

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
        keyFreq.set(k, (keyFreq.get(k) ?? 0) + 1)
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
    topKeys: [...keyFreq.entries()]
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
  nodeKey: string; value: unknown; path: JsonTreePath; level: number
  expandedNodes: Set<string>; onToggle: (path: JsonTreePath) => void; searchQuery: string
  selectedId: string | null; onSelect: (path: JsonTreePath) => void; sortKeys: boolean
}

const TreeNode = React.memo<TreeNodeProps>(function TreeNode({ nodeKey, value, path, level, expandedNodes, onToggle, searchQuery, selectedId, onSelect, sortKeys: sortKeysFlag }) {
  const t = useTranslations('jsonFormatter')
  const type = getTypeOf(value), id = jsonTreeNodeId(path), last = path.at(-1)
  const isExpandable = type === 'object' || type === 'array', isExpanded = expandedNodes.has(id)
  const label = !last ? t('selection.rootLabel') : last.kind === 'index' ? '[' + last.index + ']' : nodeKey === '' ? t('selection.emptyKey') : JSON.stringify(nodeKey)
  const matchesSearch = !!searchQuery && (nodeKey.toLowerCase().includes(searchQuery.toLowerCase()) || (!isExpandable && String(value).toLowerCase().includes(searchQuery.toLowerCase())))
  const childCount = Array.isArray(value) ? value.length : value !== null && typeof value === 'object' ? Object.keys(value).length : 0
  const entries: [string, unknown][] = !isExpanded ? [] : Array.isArray(value) ? value.map((item, index) => [String(index), item]) : value !== null && typeof value === 'object' ? Object.entries(value) : []
  if (sortKeysFlag && type === 'object') entries.sort(([a], [b]) => a.localeCompare(b))
  const preview = type === 'object' ? '{' + childCount + '}' : type === 'array' ? '[' + childCount + ']' : typeof value === 'string' ? JSON.stringify(value.length > 100 ? value.slice(0, 100) + '…' : value) : String(value)
  return <div data-json-tree-node={id}>
    <div className={'flex min-w-0 items-start rounded-xl ' + (selectedId === id ? 'bg-primary-soft text-primary' : matchesSearch ? 'bg-subtle text-body' : 'text-body')} style={{ paddingLeft: Math.min(level, 12) * 12 }}>
      {isExpandable ? <button type="button" data-json-tree-toggle={id} aria-expanded={isExpanded} aria-label={t(isExpanded ? 'selection.collapseNode' : 'selection.expandNode', { name: label })}
        onClick={() => onToggle(path)} className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl text-sub hover:bg-soft">
        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button> : <span className="w-11 shrink-0" aria-hidden="true" />}
      <button type="button" data-json-tree-select={id} aria-pressed={selectedId === id} aria-label={t('selection.selectNode', { name: label })} onClick={() => onSelect(path)}
        className="min-h-11 min-w-0 flex-1 rounded-xl px-2 py-2 text-left text-sm hover:bg-soft">
        <span className="block break-all font-medium">{label}</span><span className="block truncate text-sub">{preview}</span>
      </button>
    </div>
    {isExpanded && isExpandable && entries.map(([childKey, childValue]) => <TreeNode key={childKey} nodeKey={childKey} value={childValue}
      path={[...path, ...(type === 'array' ? [{ kind: 'index' as const, index: Number(childKey) }] : [{ kind: 'key' as const, key: childKey }])]}
      level={level + 1} expandedNodes={expandedNodes} onToggle={onToggle} searchQuery={searchQuery} selectedId={selectedId} onSelect={onSelect} sortKeys={sortKeysFlag} />)}
  </div>
})

// ── Main component ──
type Mode = 'format' | 'minify' | 'tree' | 'stats'

const JsonFormatter = () => {
  const t = useTranslations('jsonFormatter')

  // Primary state
  const [input, setInputValue] = useState('')
  const [mode, setMode] = useState<Mode>('format')

  // Parse cache
  const [parsedState, setParsedResult] = useState<{
    data: unknown
    error: string | null
    errorLine: number | null
    source: string
    json5: boolean
  } | null>(null)
  const [processingTime, setProcessingTime] = useState<number | null>(null)

  // Tree view
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => new Set([jsonTreeNodeId([])]))
  const [treeSearchQuery, setTreeSearchQuery] = useState('')
  const [selectedPath, setSelectedPath] = useState<JsonTreePath | null>(null)
  const [contentRevision, setContentRevision] = useState(0)
  const sourceRevision = useRef(0), literalRequest = useRef(0)
  const [literalCheck, setLiteralCheck] = useState<{ key: string; result: JsonTreePathResult } | null>(null)

  // Settings
  const [indentSize, setIndentSize] = useState(2)
  const [sortKeys, setSortKeys] = useState(false)
  const [json5Mode, setJson5Mode] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)

  // UI
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [copyPending, setCopyPending] = useState<JsonTreeCopyTarget | null>(null)
  const [copySuccess, setCopySuccess] = useState<JsonTreeCopyTarget | null>(null)
  const [copyRecovery, setCopyRecovery] = useState<{ target: JsonTreeCopyTarget; text: string; request: number } | null>(null)
  const copyGuard = useRef(createJsonTreeCopyGuard()), copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mounted = useRef(false), copyContextRef = useRef('')
  const copied = copySuccess === 'output'
  const invalidateCopy = useCallback(() => {
    copyGuard.current.invalidate()
    if (copyTimer.current !== null) clearTimeout(copyTimer.current)
    copyTimer.current = null; setCopyPending(null); setCopySuccess(null); setCopyRecovery(null)
  }, [])
  const invalidateSource = useCallback(() => {
    invalidateCopy(); literalRequest.current++; setLiteralCheck(null); setSelectedPath(null)
    setContentRevision(++sourceRevision.current); setExpandedNodes(new Set([jsonTreeNodeId([])]))
  }, [invalidateCopy])
  const changeMode = useCallback((next: Mode) => {
    if (next === mode) return
    invalidateCopy(); literalRequest.current++; setLiteralCheck(null); setMode(next)
  }, [invalidateCopy, mode])
  useLayoutEffect(() => {
    mounted.current = true
    const guard = copyGuard.current, literal = literalRequest
    return () => { mounted.current = false; literal.current++; guard.invalidate(); if (copyTimer.current !== null) clearTimeout(copyTimer.current) }
  }, [])
  const [isDragging, setIsDragging] = useState(false)

  // URL import
  const [showUrlImport, setShowUrlImport] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [isLoadingUrl, setIsLoadingUrl] = useState(false)

  // JSONPath query
  const [showJsonPath, setShowJsonPath] = useState(false)
  const [jsonPathQuery, setJsonPathQueryValue] = useState('')
  const [jsonPathResult, setJsonPathResult] = useState('')
  const [jsonPathError, setJsonPathError] = useState('')
  const [jsonPathBusy, setJsonPathBusy] = useState(false)
  const queryRequest = useRef(0)
  const parsedResult = parsedState?.source === input && parsedState?.json5 === json5Mode ? parsedState : null
  const parsedOk = parsedResult !== null && parsedResult.error === null
  const invalidateQuery = useCallback(() => {
    queryRequest.current++
    setJsonPathResult(''); setJsonPathError(''); setJsonPathBusy(false)
  }, [])
  const setInput = useCallback((value: string) => { invalidateQuery(); invalidateSource(); setInputValue(value) }, [invalidateQuery, invalidateSource])
  const setJsonPathQuery = useCallback((value: string) => { invalidateQuery(); setJsonPathQueryValue(value) }, [invalidateQuery])

  useEffect(() => () => { queryRequest.current++ }, [])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const fullscreenBtnRef = useRef<HTMLButtonElement>(null)

  // ── Debounced parsing ──
  useEffect(() => {
    if (!input.trim()) {
      setParsedResult(null)
      setProcessingTime(null)
      return
    }

    let cancelled = false
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
        if (cancelled) return
        const elapsed = performance.now() - start
        setProcessingTime(elapsed)
        setParsedResult({ data, error: null, errorLine: null, source: input, json5: json5Mode })
      } catch (err) {
        if (cancelled) return
        const msg = err instanceof Error ? err.message : 'Invalid JSON'
        const errorLine = extractErrorLine(msg, input)
        setParsedResult({ data: null, error: msg, errorLine, source: input, json5: json5Mode })
        setProcessingTime(null)
      }
    }, 300)

    return () => { cancelled = true; clearTimeout(timer) }
  }, [input, json5Mode])

  // ── Derived output ──
  const output = useMemo(() => {
    if (!parsedResult || parsedResult.error !== null) return ''
    if (mode === 'format') return stableStringify(parsedResult.data, indentSize, sortKeys)
    if (mode === 'minify') return JSON.stringify(parsedResult.data)
    return ''
  }, [parsedResult, mode, indentSize, sortKeys])

  const selectedId = selectedPath === null ? null : jsonTreeNodeId(selectedPath)
  const selectionSourceKey = JSON.stringify([contentRevision, selectedId])
  const selection = useMemo(() => {
    if (!parsedResult || parsedResult.error !== null || selectedPath === null) return null
    const node = resolveJsonTreeNode(parsedResult.data, selectedPath)
    return node.ok ? { pointer: jsonTreePointer(selectedPath), value: serializeJsonTreeValue(node.value, indentSize, sortKeys) } : null
  }, [parsedResult, selectedPath, indentSize, sortKeys])
  const copyContext = JSON.stringify([contentRevision, selectedId, mode, indentSize, sortKeys, json5Mode])
  useLayoutEffect(() => { copyContextRef.current = copyContext }, [copyContext])
  useEffect(() => {
    if (mode !== 'tree' || !parsedResult || parsedResult.error !== null || selectedPath === null || !selectedPath.length) return
    let active = true
    const request = ++literalRequest.current, root = parsedResult.data, path = selectedPath
    const current = () => active && mounted.current && request === literalRequest.current
    void import('jsonpath-plus').then(({ JSONPath }) => {
      if (!current()) return
      const result = verifyJsonTreeLiteral(root, path, { toPathArray: expression => JSONPath.toPathArray(expression), evaluate: options => JSONPath(options) })
      if (current()) setLiteralCheck({ key: selectionSourceKey, result })
    }).catch(() => { if (current()) setLiteralCheck({ key: selectionSourceKey, result: { ok: false, reason: 'unavailable' } }) })
    return () => { active = false }
  }, [mode, parsedResult, selectedPath, selectionSourceKey])
  const selectedLiteral: JsonTreePathStatus = selectedPath?.length === 0 ? { ok: true, expression: '$' } : literalCheck?.key === selectionSourceKey ? literalCheck.result : { checking: true }

  // ── Stats ──
  const stats = useMemo(() => {
    if (!parsedResult || parsedResult.error !== null) return null
    return computeJsonStats(parsedResult.data)
  }, [parsedResult])

  // ── Status bar data ──
  const statusData = useMemo(() => {
    if (!parsedResult) return null
    const inputSize = new Blob([input]).size
    const outputSize = output ? new Blob([output]).size : 0
    return {
      isValid: !parsedResult.error,
      keyCount: parsedResult.error === null ? countKeys(parsedResult.data) : 0,
      maxDepth: parsedResult.error === null ? computeDepth(parsedResult.data) : 0,
      nodeCount: parsedResult.error === null ? countNodes(parsedResult.data) : 0,
      inputSize: formatSize(inputSize),
      outputSize: formatSize(outputSize),
      processingTime: processingTime?.toFixed(1),
    }
  }, [parsedResult, input, output, processingTime])

  // ── Handlers ──
  const requestCopy = useCallback(async (target: JsonTreeCopyTarget, text: string, context: string) => {
    if (!mounted.current || copyContextRef.current !== context) return
    const actions = copyGuard.current, token = actions.begin(target)
    const current = () => mounted.current && copyContextRef.current === context && actions.isCurrent(token)
    if (copyTimer.current !== null) clearTimeout(copyTimer.current)
    copyTimer.current = null; setCopyPending(target); setCopySuccess(null)
    setCopyRecovery(previous => previous?.target === target && previous.text === text ? previous : null)
    const result = await copyJsonTreeText(text, current)
    if (!current() || result === 'stale') return
    setCopyPending(null)
    if (result === 'copied') {
      setCopyRecovery(null); setCopySuccess(target)
      copyTimer.current = setTimeout(() => { if (current()) { setCopySuccess(null); copyTimer.current = null } }, 2000)
    } else setCopyRecovery({ target, text, request: token.request })
  }, [])
  const handleCopy = useCallback(() => {
    if (!parsedResult || parsedResult.error !== null) return
    const text = mode === 'tree' || mode === 'stats' ? stableStringify(parsedResult.data, indentSize, sortKeys) : output
    if (typeof text === 'string') void requestCopy('output', text, copyContext)
  }, [mode, output, parsedResult, indentSize, sortKeys, requestCopy, copyContext])

  const handleDownload = useCallback(() => {
    const text = mode === 'tree' || mode === 'stats'
      ? (parsedResult && parsedResult.error === null ? stableStringify(parsedResult.data, indentSize, sortKeys) : '')
      : output
    if (!text) return
    const blob = new Blob([text], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `json-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [mode, output, parsedResult, indentSize, sortKeys])

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
  }, [t, setInput])

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
  }, [t, setInput])

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
  }, [urlInput, t, setInput])

  const handleAutoFix = useCallback(async () => {
    if (!input.trim()) return
    try {
      const { jsonrepair } = await import('jsonrepair')
      const repaired = jsonrepair(input)
      setInput(repaired)
    } catch {
      alert(t('errors.autoFixFailed'))
    }
  }, [input, t, setInput])

  const toggleNode = useCallback((path: JsonTreePath) => {
    if (!mounted.current || copyContextRef.current !== copyContext) return
    const id = jsonTreeNodeId(path)
    setExpandedNodes(previous => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next })
  }, [copyContext])
  const selectNode = useCallback((path: JsonTreePath) => {
    if (!mounted.current || copyContextRef.current !== copyContext || !parsedResult || parsedResult.error !== null || !resolveJsonTreeNode(parsedResult.data, path).ok) return
    invalidateCopy(); literalRequest.current++; setLiteralCheck(null); setSelectedPath(path.map(part => ({ ...part })))
  }, [copyContext, parsedResult, invalidateCopy])
  const expandAll = useCallback(() => {
    if (!parsedResult || parsedResult.error !== null) return
    const paths = new Set<string>(), pending: { value: unknown; path: JsonTreePath }[] = [{ value: parsedResult.data, path: [] }]
    while (pending.length) {
      const { value, path } = pending.pop()!
      if (value === null || typeof value !== 'object') continue
      paths.add(jsonTreeNodeId(path))
      if (Array.isArray(value)) value.forEach((child, index) => pending.push({ value: child, path: [...path, { kind: 'index', index }] }))
      else Object.entries(value).forEach(([key, child]) => pending.push({ value: child, path: [...path, { kind: 'key', key }] }))
    }
    setExpandedNodes(paths)
  }, [parsedResult])
  const collapseAll = useCallback(() => setExpandedNodes(new Set()), [])

  const executeJsonPath = useCallback(async () => {
    if (!parsedResult || parsedResult.error !== null || !jsonPathQuery.trim()) return
    const request = ++queryRequest.current
    setJsonPathBusy(true); setJsonPathResult(''); setJsonPathError('')
    try {
      const { JSONPath } = await import('jsonpath-plus')
      if (request !== queryRequest.current) return
      const result = evaluateSavedJsonPath(parsedResult.data, jsonPathQuery, options => JSONPath(options))
      setJsonPathResult(JSON.stringify(result, null, 2))
      setJsonPathError('')
    } catch (err) {
      if (request !== queryRequest.current) return
      setJsonPathError(err instanceof Error && err.message !== 'unsupportedRoot' ? err.message : t('presets.rootUnsupported'))
      setJsonPathResult('')
    } finally { if (request === queryRequest.current) setJsonPathBusy(false) }
  }, [parsedResult, jsonPathQuery, t])

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
  }, [setInput])

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
        switch (e.key.toUpperCase()) {
          case 'F':
            e.preventDefault()
            changeMode('format')
            break
          case 'M':
            e.preventDefault()
            changeMode('minify')
            break
          case 'T':
            e.preventDefault()
            changeMode('tree')
            break
          case 'C':
            e.preventDefault()
            handleCopy()
            break
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleCopy, changeMode])
  useFullscreenEscape(isFullscreen, () => setIsFullscreen(false), fullscreenBtnRef)

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
        isFullscreen ? 'fixed inset-0 z-50 bg-canvas overflow-auto p-4' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'
      }`}
    >
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <FileJson className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
              <p className="text-sm text-muted">{t('description')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowShortcuts(!showShortcuts)}
              className="p-2 rounded-lg text-muted hover:bg-soft transition-colors"
              title={t('shortcuts.title')}
            >
              <Keyboard className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg text-muted hover:bg-soft transition-colors"
              title={t('controls.settings')}
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              ref={fullscreenBtnRef}
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-lg text-muted hover:bg-soft transition-colors"
              title={isFullscreen ? t('controls.exitFullscreen') : t('controls.fullscreen')}
              aria-label={isFullscreen ? t('controls.exitFullscreen') : t('controls.fullscreen')}
            >
              {isFullscreen ? <Shrink className="w-4 h-4" /> : <Expand className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Shortcuts tooltip */}
        {showShortcuts && (
          <div className="mt-3 bg-subtle rounded-lg p-4 text-sm">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { keys: 'Ctrl+Shift+F', action: t('shortcuts.format') },
                { keys: 'Ctrl+Shift+M', action: t('shortcuts.minify') },
                { keys: 'Ctrl+Shift+T', action: t('shortcuts.treeView') },
                { keys: 'Ctrl+Shift+C', action: t('shortcuts.copyOutput') },
              ].map(({ keys, action }) => (
                <div key={keys} className="flex items-center gap-2">
                  <kbd className="px-2 py-0.5 bg-field rounded border border-line-strong text-xs font-mono">
                    {keys}
                  </kbd>
                  <span className="text-sub">{action}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings panel */}
        {showSettings && (
          <div className="mt-3 bg-subtle rounded-lg p-4">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <label className="text-sub font-medium">{t('settings.indentSize')}:</label>
                <select
                  value={indentSize}
                  aria-label={t('settings.indentSize')}
                  data-json-formatter-indent onChange={(e) => { invalidateCopy(); setIndentSize(Number(e.target.value)) }}
                  className="min-h-11 px-2 py-1 rounded border border-line-strong bg-field text-body text-base"
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
                  data-json-formatter-sort onChange={(e) => { invalidateCopy(); setSortKeys(e.target.checked) }}
                  className="rounded border-line-strong text-primary focus:ring-primary"
                />
                <span className="text-sub">{t('settings.sortKeys')}</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <button
                  data-json-formatter-json5 onClick={() => { invalidateQuery(); invalidateSource(); setJson5Mode(!json5Mode) }}
                  className="flex items-center"
                >
                  {json5Mode ? (
                    <ToggleRight className="w-5 h-5 text-primary" />
                  ) : (
                    <ToggleLeft className="w-5 h-5 text-faint" />
                  )}
                </button>
                <span className="text-sub">{t('settings.json5Mode')}</span>
                <span className="text-xs text-faint">({t('settings.json5Desc')})</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Mode tabs */}
        <div className="flex bg-soft rounded-lg p-0.5">
          {modes.map(({ key, icon, label }) => (
            <button
              key={key}
              aria-label={label}
              data-json-formatter-mode={key} onClick={() => changeMode(key)}
              className={`flex min-h-11 min-w-11 items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                mode === key
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-sub hover:text-body'
              }`}
            >
              {icon}
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        <div className="h-6 w-px bg-line-strong hidden sm:block" />

        {/* Action buttons */}
        <button
          onClick={insertExample}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-sub hover:bg-soft rounded-lg transition-colors"
        >
          <Info className="w-4 h-4" />
          <span className="hidden sm:inline">{t('controls.example')}</span>
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-sub hover:bg-soft rounded-lg transition-colors"
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
              ? 'bg-primary-soft text-primary'
              : 'text-sub hover:bg-soft'
          }`}
        >
          <Link className="w-4 h-4" />
          <span className="hidden sm:inline">{t('controls.urlImport')}</span>
        </button>

        <button
          onClick={() => setShowJsonPath(!showJsonPath)}
          aria-label={t('presets.openPanel')}
          aria-expanded={showJsonPath}
          className={`flex min-h-11 items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
            showJsonPath
              ? 'bg-primary-soft text-primary'
              : 'text-sub hover:bg-soft'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>{t('presets.panelLabel')}</span>
        </button>

        <div className="ml-auto flex items-center gap-2">
          {parsedOk && (
            <>
              <button
                data-json-formatter-copy-output disabled={copyPending === 'output'} aria-label={t('selection.recovery.field.output')} onClick={handleCopy}
                className={`flex min-h-11 items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  copied
                    ? 'bg-primary-soft text-primary'
                    : 'text-sub hover:bg-soft'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copyPending === 'output' ? t('selection.copying') : copied ? t('controls.copied') : t('controls.copy')}</span>
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-sub hover:bg-soft rounded-lg transition-colors"
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
                setExpandedNodes(new Set([jsonTreeNodeId([])]))
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
            className="ui-field flex-1 px-3 py-2 rounded-lg text-sm"
            onKeyDown={(e) => e.key === 'Enter' && handleUrlImport()}
          />
          <button
            onClick={handleUrlImport}
            disabled={isLoadingUrl || !urlInput.trim()}
            className="ui-btn px-4 py-2 rounded-lg text-sm font-medium disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoadingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
            {isLoadingUrl ? t('urlImport.loading') : t('urlImport.fetch')}
          </button>
        </div>
      )}

      {/* JSONPath Query panel */}
      {showJsonPath && (
        <div className="mb-4 min-w-0 bg-subtle rounded-lg p-4">
          <label htmlFor="jsonpath-query" className="mb-2 block text-sm font-semibold text-fg">{t('presets.queryLabel')}</label>
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <input
              id="jsonpath-query"
              type="text"
              value={jsonPathQuery}
              onChange={(e) => setJsonPathQuery(e.target.value)}
              placeholder={t('jsonPath.placeholder')}
              className="ui-field min-w-0 min-h-11 flex-1 px-3 py-2 rounded-lg text-base font-mono"
              onKeyDown={(e) => e.key === 'Enter' && executeJsonPath()}
            />
            <button
              onClick={executeJsonPath}
              disabled={!parsedOk || !jsonPathQuery.trim() || jsonPathBusy}
              className="ui-btn min-h-11 px-4 py-2 rounded-lg text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t(jsonPathBusy ? 'presets.running' : 'jsonPath.run')}
            </button>
          </div>

          {/* Example queries */}
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="text-xs text-primary font-medium">{t('jsonPath.examples')}:</span>
            {[
              { query: '$.store.book[*].author', label: t('jsonPath.exampleQueries.allAuthors') },
              { query: '$.store.book[?(@.price<10)]', label: t('jsonPath.exampleQueries.filterByPrice') },
              { query: '$..price', label: t('jsonPath.exampleQueries.recursive') },
            ].map(({ query, label }) => (
              <button
                key={query}
                onClick={() => setJsonPathQuery(query)}
                className="min-h-11 max-w-full break-all px-3 py-2 text-xs bg-soft text-sub rounded-xl hover:bg-primary-soft transition-colors"
                title={label}
              >
                {query}
              </button>
            ))}
          </div>

          {/* Results */}
          {jsonPathError && (
            <div role="alert" className="text-sm text-body break-words">
              <AlertCircle className="w-4 h-4" />
              {jsonPathError}
            </div>
          )}
          {jsonPathResult && (
            <div className="mt-2">
              <div className="text-xs text-primary mb-1 font-medium">{t('jsonPath.result')}:</div>
              <pre data-jsonpath-result className="text-sm bg-surface p-3 rounded-lg border border-line overflow-auto max-h-60 text-body font-mono">
                {jsonPathResult}
              </pre>
            </div>
          )}
          <JsonPathPresets expression={jsonPathQuery} onLoad={expression => { setJsonPathQuery(expression); document.getElementById('jsonpath-query')?.focus() }} />
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
        <div className="relative min-w-0">
          {parsedOk && <MobileResultLink href="#json-formatter-result" label={t('input.output')} value={t(mode === 'tree' ? 'modes.treeView' : 'modes.' + mode)} />}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-body">{t('input.jsonInput')}</h2>
              {parsedResult && (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    parsedResult.error
                      ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
                      : 'bg-soft text-sub'
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
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-soft text-primary">
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
            <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center z-10">
              <div className="text-center">
                <Upload className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="text-primary font-medium">{t('dragDrop.message')}</p>
                <p className="text-primary/70 text-sm">{t('dragDrop.supported')}</p>
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
        <div id="json-formatter-result" className="min-w-0 scroll-mt-20">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h2 className="text-sm font-semibold text-body">{t('input.output')}</h2>
            {mode === 'tree' && parsedOk && (
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <div className="relative min-w-0">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
                  <input
                    type="text"
                    value={treeSearchQuery}
                    onChange={(e) => setTreeSearchQuery(e.target.value)}
                    placeholder={t('treeView.search')}
                    aria-label={t('treeView.search')} className="ui-field min-h-11 max-w-full pl-8 pr-11 py-2 text-base rounded-lg w-48"
                  />
                  {treeSearchQuery && (
                    <button
                      onClick={() => setTreeSearchQuery('')}
                      aria-label={t('selection.clearSearch')} className="absolute right-0 top-1/2 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center text-faint hover:text-sub"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <button
                  onClick={expandAll}
                  className="min-h-11 text-sm text-sub hover:text-body px-2 py-2 rounded-xl hover:bg-soft"
                >
                  {t('controls.expandAll')}
                </button>
                <button
                  onClick={collapseAll}
                  className="min-h-11 text-sm text-sub hover:text-body px-2 py-2 rounded-xl hover:bg-soft"
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
              className={`bg-surface rounded-lg border border-line overflow-auto font-mono ${
                isFullscreen ? 'h-[calc(100vh-350px)]' : 'h-[500px]'
              }`}
            >
              {parsedOk ? (
                <div className="p-2">
                  <TreeNode nodeKey="" value={parsedResult.data} path={[]} level={0} expandedNodes={expandedNodes} onToggle={toggleNode}
                    searchQuery={treeSearchQuery} selectedId={selectedId} onSelect={selectNode} sortKeys={sortKeys} />
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-faint text-sm">
                  {t('treeView.empty')}
                </div>
              )}
            </div>
          )}

          {mode === 'tree' && selection && <div className="mt-4"><JsonTreeSelectionPanel selectionKey={JSON.stringify([selectionSourceKey, indentSize, sortKeys])}
            pointer={selection.pointer} value={selection.value} path={selectedLiteral} pending={copyPending} copied={copySuccess}
            onCopy={(target, text) => { void requestCopy(target, text, copyContext) }} /></div>}
          {copyRecovery && <div className="mt-4"><JsonTreeCopyRecovery key={copyRecovery.request} target={copyRecovery.target} text={copyRecovery.text} busy={copyPending !== null}
            onRetry={() => { void requestCopy(copyRecovery.target, copyRecovery.text, copyContext) }} onClose={invalidateCopy} /></div>}

          {/* Stats view */}
          {mode === 'stats' && (
            <div
              className={`bg-surface rounded-lg border border-line overflow-auto ${
                isFullscreen ? 'h-[calc(100vh-350px)]' : 'h-[500px]'
              }`}
            >
              {stats ? (
                <div className="p-4 space-y-6">
                  {/* Overview cards */}
                  <div>
                    <h3 className="text-sm font-semibold text-body mb-3">{t('stats.overview')}</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 rounded-lg bg-subtle">
                        <div className="flex items-center gap-2 text-muted mb-1">
                          <Hash className="w-4 h-4" />
                          <span className="text-xs">{t('stats.totalNodes')}</span>
                        </div>
                        <div className="text-xl font-bold text-body">{stats.totalNodes}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-subtle">
                        <div className="flex items-center gap-2 text-muted mb-1">
                          <Type className="w-4 h-4" />
                          <span className="text-xs">{t('stats.totalKeys')}</span>
                        </div>
                        <div className="text-xl font-bold text-body">{stats.totalKeys}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-subtle">
                        <div className="flex items-center gap-2 text-muted mb-1">
                          <TreePine className="w-4 h-4" />
                          <span className="text-xs">{t('stats.maxDepth')}</span>
                        </div>
                        <div className="text-xl font-bold text-body">{stats.maxDepth}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-subtle">
                        <div className="flex items-center gap-2 text-muted mb-1">
                          <FileJson className="w-4 h-4" />
                          <span className="text-xs">{t('stats.dataSize')}</span>
                        </div>
                        <div className="text-xl font-bold text-body">{statusData?.inputSize || '0 B'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Type distribution pie chart */}
                  <div>
                    <h3 className="text-sm font-semibold text-body mb-3">{t('stats.typeDistribution')}</h3>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <ReactECharts option={{
                        tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
                        series: [{
                          type: 'pie',
                          radius: ['35%', '65%'],
                          data: stats.typeDistribution.map((d, i) => ({
                            value: d.value,
                            name: d.name,
                            itemStyle: { color: d.color || CHART_COLORS[i % CHART_COLORS.length] }
                          })),
                          label: { show: true, formatter: '{b}\n{d}%', fontSize: 11 }
                        }]
                      }} style={{ height: '200px', width: '100%' }} />
                      <div className="flex flex-wrap gap-2">
                        {stats.typeDistribution.map(({ name, value, color }) => (
                          <div key={name} className="flex items-center gap-1.5 text-xs">
                            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                            <span className="text-sub">
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
                      <h3 className="text-sm font-semibold text-body mb-3">{t('stats.depthDistribution')}</h3>
                      <ReactECharts option={{
                        tooltip: { trigger: 'axis' },
                        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
                        xAxis: { type: 'category', data: stats.depthDistribution.map(d => d.name), axisLabel: { fontSize: 12 } },
                        yAxis: { type: 'value', axisLabel: { fontSize: 12 } },
                        series: [{
                          type: 'bar',
                          data: stats.depthDistribution.map(d => d.value),
                          barWidth: '60%',
                          itemStyle: { color: '#3b82f6', borderRadius: [4, 4, 0, 0] }
                        }]
                      }} style={{ height: '200px', width: '100%' }} />
                    </div>
                  )}

                  {/* Top keys */}
                  {stats.topKeys.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-body mb-3">{t('stats.topKeys')}</h3>
                      <div className="space-y-1.5">
                        {stats.topKeys.map(({ name, value }) => (
                          <div key={name} className="flex items-center gap-2">
                            <code className="text-xs font-mono text-body w-32 truncate">{name}</code>
                            <div className="flex-1 bg-soft rounded-full h-4">
                              <div
                                className="bg-primary h-4 rounded-full flex items-center justify-end pr-2"
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
                <div className="h-full flex items-center justify-center text-faint text-sm">
                  {t('treeView.empty')}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Status bar */}
      {statusData && (
        <div className="flex flex-wrap items-center gap-3 px-4 py-2 bg-subtle rounded-lg text-xs text-sub mb-8">
          <span
            className={`inline-flex items-center gap-1 font-medium ${
              statusData.isValid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}
          >
            {statusData.isValid ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
            {statusData.isValid ? t('statusBar.valid') : t('statusBar.invalid')}
          </span>
          <span className="text-line-strong">|</span>
          <span>{t('statusBar.keys')}: <strong>{statusData.keyCount}</strong></span>
          <span className="text-line-strong">|</span>
          <span>{t('statusBar.depth')}: <strong>{statusData.maxDepth}</strong></span>
          <span className="text-line-strong">|</span>
          <span>{t('statusBar.nodes')}: <strong>{statusData.nodeCount}</strong></span>
          <span className="text-line-strong">|</span>
          <span>{t('statusBar.size')}: <strong>{statusData.inputSize}</strong>{output ? ` → ${statusData.outputSize}` : ''}</span>
          {statusData.processingTime && (
            <>
              <span className="text-line-strong">|</span>
              <span>{t('statusBar.time')}: <strong>{statusData.processingTime}ms</strong></span>
            </>
          )}
        </div>
      )}

      {/* Guide section */}
      <div className={`mt-12 ${glassCard} ${glassInset} p-8`}>
        <h2 className="text-3xl font-bold mb-4 text-fg text-center">
          {t('guide.title')}
        </h2>
        <p className="text-lg text-sub text-center mb-12 max-w-4xl mx-auto break-keep whitespace-pre-line">
          {t('guide.subtitle')}
        </p>

        {/* Feature cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-subtle rounded-lg p-6">
            <div className="flex items-center mb-3">
              <Code className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-fg ml-2">{t('guide.features.syntaxHighlight')}</h3>
            </div>
            <p className="text-sub text-sm">{t('guide.features.syntaxHighlightDesc')}</p>
          </div>
          <div className="bg-subtle rounded-lg p-6">
            <div className="flex items-center mb-3">
              <TreePine className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-fg ml-2">{t('guide.features.treeView')}</h3>
            </div>
            <p className="text-sub text-sm">{t('guide.features.treeViewDesc')}</p>
          </div>
          <div className="bg-subtle rounded-lg p-6">
            <div className="flex items-center mb-3">
              <Search className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-fg ml-2">{t('guide.features.jsonPath')}</h3>
            </div>
            <p className="text-sub text-sm">{t('guide.features.jsonPathDesc')}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-subtle rounded-lg p-6">
            <div className="flex items-center mb-3">
              <FileJson className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-fg ml-2">{t('guide.features.json5')}</h3>
            </div>
            <p className="text-sub text-sm">{t('guide.features.json5Desc')}</p>
          </div>
          <div className="bg-subtle rounded-lg p-6">
            <div className="flex items-center mb-3">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-fg ml-2">{t('guide.features.stats')}</h3>
            </div>
            <p className="text-sub text-sm">{t('guide.features.statsDesc')}</p>
          </div>
          <div className="bg-subtle rounded-lg p-6">
            <div className="flex items-center mb-3">
              <Zap className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-fg ml-2">{t('guide.features.performance')}</h3>
            </div>
            <p className="text-sub text-sm">{t('guide.features.performanceDesc')}</p>
          </div>
        </div>

        {/* Use cases */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-fg mb-4">{t('guide.useCases.title')}</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-subtle rounded-lg p-4">
              <h4 className="font-semibold text-fg mb-2">{t('guide.useCases.apiDebug')}</h4>
              <p className="text-sub text-sm">{t('guide.useCases.apiDebugDesc')}</p>
            </div>
            <div className="bg-subtle rounded-lg p-4">
              <h4 className="font-semibold text-fg mb-2">{t('guide.useCases.configEdit')}</h4>
              <p className="text-sub text-sm">{t('guide.useCases.configEditDesc')}</p>
            </div>
            <div className="bg-subtle rounded-lg p-4">
              <h4 className="font-semibold text-fg mb-2">{t('guide.useCases.dataAnalysis')}</h4>
              <p className="text-sub text-sm">{t('guide.useCases.dataAnalysisDesc')}</p>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div>
          <h3 className="text-lg font-semibold text-fg mb-4">{t('guide.tips.title')}</h3>
          <div className="bg-subtle rounded-lg p-4">
            <ul className="space-y-2 text-sm text-sub">
              {[
                t('guide.tips.tip1'),
                t('guide.tips.tip2'),
                t('guide.tips.tip3'),
                t('guide.tips.tip4'),
                t('guide.tips.tip5'),
              ].map((tip, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">{'>'}</span>
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
