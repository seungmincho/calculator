'use client'

import { useState, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  Copy,
  Check,
  BookOpen,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Monitor,
  Tablet,
  Smartphone,
  Layout,
  Grid3X3,
} from 'lucide-react'

// ── Types ──

type LayoutMode = 'flexbox' | 'grid'
type FlexDirection = 'row' | 'row-reverse' | 'column' | 'column-reverse'
type JustifyContent = 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly'
type AlignItems = 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline'
type FlexWrap = 'nowrap' | 'wrap' | 'wrap-reverse'
type AlignSelf = 'auto' | 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline'
type JustifyItems = 'start' | 'end' | 'center' | 'stretch'
type GridAlignItems = 'start' | 'end' | 'center' | 'stretch'
type ColumnUnit = 'fr' | 'px' | 'auto' | '%'
type PreviewWidth = 'desktop' | 'tablet' | 'mobile'

interface FlexChild {
  id: string
  flexGrow: number
  flexShrink: number
  flexBasis: string
  alignSelf: AlignSelf
  order: number
}

interface GridChild {
  id: string
  colSpan: number
  rowSpan: number
}

interface ColumnDef {
  value: number
  unit: ColumnUnit
}

interface RowDef {
  value: number
  unit: ColumnUnit
}

interface Preset {
  key: string
  mode: LayoutMode
  apply: () => void
}

// ── Constants ──

const ITEM_COLORS = [
  'bg-blue-400', 'bg-emerald-400', 'bg-amber-400', 'bg-rose-400',
  'bg-purple-400', 'bg-cyan-400', 'bg-orange-400', 'bg-pink-400',
]

const MAX_CHILDREN = 8

const PREVIEW_WIDTHS: Record<PreviewWidth, number> = {
  desktop: 100, // full width %
  tablet: 768,
  mobile: 375,
}

const FLEX_DIRECTION_OPTIONS: { value: FlexDirection; icon: string }[] = [
  { value: 'row', icon: '\u2192' },
  { value: 'row-reverse', icon: '\u2190' },
  { value: 'column', icon: '\u2193' },
  { value: 'column-reverse', icon: '\u2191' },
]

const JUSTIFY_CONTENT_OPTIONS: JustifyContent[] = [
  'flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly',
]

const ALIGN_ITEMS_OPTIONS: AlignItems[] = [
  'flex-start', 'flex-end', 'center', 'stretch', 'baseline',
]

const FLEX_WRAP_OPTIONS: FlexWrap[] = ['nowrap', 'wrap', 'wrap-reverse']

const ALIGN_SELF_OPTIONS: AlignSelf[] = ['auto', 'flex-start', 'flex-end', 'center', 'stretch', 'baseline']

const JUSTIFY_ITEMS_OPTIONS: JustifyItems[] = ['start', 'end', 'center', 'stretch']

const GRID_ALIGN_ITEMS_OPTIONS: GridAlignItems[] = ['start', 'end', 'center', 'stretch']

const COLUMN_UNIT_OPTIONS: ColumnUnit[] = ['fr', 'px', 'auto', '%']

// ── Helpers ──

let idCounter = 0
function generateId(): string {
  idCounter += 1
  return `item-${Date.now()}-${idCounter}`
}

function createFlexChild(): FlexChild {
  return {
    id: generateId(),
    flexGrow: 0,
    flexShrink: 1,
    flexBasis: 'auto',
    alignSelf: 'auto',
    order: 0,
  }
}

function createGridChild(): GridChild {
  return {
    id: generateId(),
    colSpan: 1,
    rowSpan: 1,
  }
}

// ── Component ──

export default function FlexboxGrid() {
  const t = useTranslations('flexboxGrid')

  // ── Mode ──
  const [mode, setMode] = useState<LayoutMode>('flexbox')

  // ── Flexbox state ──
  const [flexDirection, setFlexDirection] = useState<FlexDirection>('row')
  const [justifyContent, setJustifyContent] = useState<JustifyContent>('flex-start')
  const [alignItems, setAlignItems] = useState<AlignItems>('stretch')
  const [flexWrap, setFlexWrap] = useState<FlexWrap>('nowrap')
  const [flexGap, setFlexGap] = useState(10)
  const [flexChildren, setFlexChildren] = useState<FlexChild[]>([
    createFlexChild(),
    createFlexChild(),
    createFlexChild(),
  ])

  // ── Grid state ──
  const [gridColumns, setGridColumns] = useState<ColumnDef[]>([
    { value: 1, unit: 'fr' },
    { value: 1, unit: 'fr' },
    { value: 1, unit: 'fr' },
  ])
  const [gridRows, setGridRows] = useState<RowDef[]>([
    { value: 1, unit: 'fr' },
  ])
  const [gridGap, setGridGap] = useState(10)
  const [gridJustifyItems, setGridJustifyItems] = useState<JustifyItems>('stretch')
  const [gridAlignItems, setGridAlignItems] = useState<GridAlignItems>('stretch')
  const [gridChildren, setGridChildren] = useState<GridChild[]>([
    createGridChild(),
    createGridChild(),
    createGridChild(),
    createGridChild(),
    createGridChild(),
    createGridChild(),
  ])

  // ── Shared ──
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [previewWidth, setPreviewWidth] = useState<PreviewWidth>('desktop')
  const [expandedChild, setExpandedChild] = useState<string | null>(null)

  // ── Clipboard ──
  const copyToClipboard = useCallback(async (text: string, id: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.left = '-999999px'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }, [])

  // ── Flex child ops ──
  const addFlexChild = useCallback(() => {
    if (flexChildren.length >= MAX_CHILDREN) return
    setFlexChildren((prev) => [...prev, createFlexChild()])
  }, [flexChildren.length])

  const removeFlexChild = useCallback(
    (id: string) => {
      if (flexChildren.length <= 1) return
      setFlexChildren((prev) => prev.filter((c) => c.id !== id))
    },
    [flexChildren.length]
  )

  const updateFlexChild = useCallback(
    (id: string, field: keyof FlexChild, value: string | number) => {
      setFlexChildren((prev) =>
        prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
      )
    },
    []
  )

  // ── Grid child ops ──
  const addGridChild = useCallback(() => {
    if (gridChildren.length >= MAX_CHILDREN) return
    setGridChildren((prev) => [...prev, createGridChild()])
  }, [gridChildren.length])

  const removeGridChild = useCallback(
    (id: string) => {
      if (gridChildren.length <= 1) return
      setGridChildren((prev) => prev.filter((c) => c.id !== id))
    },
    [gridChildren.length]
  )

  const updateGridChild = useCallback(
    (id: string, field: keyof GridChild, value: number) => {
      setGridChildren((prev) =>
        prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
      )
    },
    []
  )

  // ── Grid column/row ops ──
  const addGridColumn = useCallback(() => {
    if (gridColumns.length >= 6) return
    setGridColumns((prev) => [...prev, { value: 1, unit: 'fr' }])
  }, [gridColumns.length])

  const removeGridColumn = useCallback(
    (index: number) => {
      if (gridColumns.length <= 1) return
      setGridColumns((prev) => prev.filter((_, i) => i !== index))
    },
    [gridColumns.length]
  )

  const updateGridColumn = useCallback(
    (index: number, field: 'value' | 'unit', val: number | ColumnUnit) => {
      setGridColumns((prev) =>
        prev.map((c, i) => (i === index ? { ...c, [field]: val } : c))
      )
    },
    []
  )

  const addGridRow = useCallback(() => {
    if (gridRows.length >= 6) return
    setGridRows((prev) => [...prev, { value: 1, unit: 'fr' }])
  }, [gridRows.length])

  const removeGridRow = useCallback(
    (index: number) => {
      if (gridRows.length <= 1) return
      setGridRows((prev) => prev.filter((_, i) => i !== index))
    },
    [gridRows.length]
  )

  const updateGridRow = useCallback(
    (index: number, field: 'value' | 'unit', val: number | ColumnUnit) => {
      setGridRows((prev) =>
        prev.map((r, i) => (i === index ? { ...r, [field]: val } : r))
      )
    },
    []
  )

  // ── CSS generation ──
  const flexContainerCss = useMemo(() => {
    const lines: string[] = [
      'display: flex;',
      `flex-direction: ${flexDirection};`,
      `justify-content: ${justifyContent};`,
      `align-items: ${alignItems};`,
      `flex-wrap: ${flexWrap};`,
      `gap: ${flexGap}px;`,
    ]
    return lines.join('\n')
  }, [flexDirection, justifyContent, alignItems, flexWrap, flexGap])

  const flexChildrenCss = useMemo(() => {
    return flexChildren
      .map((child, i) => {
        const lines: string[] = []
        if (child.flexGrow !== 0) lines.push(`  flex-grow: ${child.flexGrow};`)
        if (child.flexShrink !== 1) lines.push(`  flex-shrink: ${child.flexShrink};`)
        if (child.flexBasis !== 'auto') lines.push(`  flex-basis: ${child.flexBasis};`)
        if (child.alignSelf !== 'auto') lines.push(`  align-self: ${child.alignSelf};`)
        if (child.order !== 0) lines.push(`  order: ${child.order};`)
        if (lines.length === 0) return null
        return `.item-${i + 1} {\n${lines.join('\n')}\n}`
      })
      .filter(Boolean)
      .join('\n\n')
  }, [flexChildren])

  const fullFlexCss = useMemo(() => {
    let code = `.container {\n${flexContainerCss.split('\n').map((l) => `  ${l}`).join('\n')}\n}`
    if (flexChildrenCss) {
      code += '\n\n' + flexChildrenCss
    }
    return code
  }, [flexContainerCss, flexChildrenCss])

  const gridTemplateCols = useMemo(() => {
    return gridColumns
      .map((c) => (c.unit === 'auto' ? 'auto' : `${c.value}${c.unit}`))
      .join(' ')
  }, [gridColumns])

  const gridTemplateRows = useMemo(() => {
    return gridRows
      .map((r) => (r.unit === 'auto' ? 'auto' : `${r.value}${r.unit}`))
      .join(' ')
  }, [gridRows])

  const gridContainerCss = useMemo(() => {
    const lines: string[] = [
      'display: grid;',
      `grid-template-columns: ${gridTemplateCols};`,
      `grid-template-rows: ${gridTemplateRows};`,
      `gap: ${gridGap}px;`,
      `justify-items: ${gridJustifyItems};`,
      `align-items: ${gridAlignItems};`,
    ]
    return lines.join('\n')
  }, [gridTemplateCols, gridTemplateRows, gridGap, gridJustifyItems, gridAlignItems])

  const gridChildrenCss = useMemo(() => {
    return gridChildren
      .map((child, i) => {
        const lines: string[] = []
        if (child.colSpan > 1) lines.push(`  grid-column: span ${child.colSpan};`)
        if (child.rowSpan > 1) lines.push(`  grid-row: span ${child.rowSpan};`)
        if (lines.length === 0) return null
        return `.item-${i + 1} {\n${lines.join('\n')}\n}`
      })
      .filter(Boolean)
      .join('\n\n')
  }, [gridChildren])

  const fullGridCss = useMemo(() => {
    let code = `.container {\n${gridContainerCss.split('\n').map((l) => `  ${l}`).join('\n')}\n}`
    if (gridChildrenCss) {
      code += '\n\n' + gridChildrenCss
    }
    return code
  }, [gridContainerCss, gridChildrenCss])

  const fullCss = mode === 'flexbox' ? fullFlexCss : fullGridCss

  // ── Preview container style ──
  const flexPreviewStyle = useMemo((): React.CSSProperties => ({
    display: 'flex',
    flexDirection,
    justifyContent,
    alignItems,
    flexWrap,
    gap: `${flexGap}px`,
    minHeight: 200,
    padding: 16,
  }), [flexDirection, justifyContent, alignItems, flexWrap, flexGap])

  const gridPreviewStyle = useMemo((): React.CSSProperties => ({
    display: 'grid',
    gridTemplateColumns: gridTemplateCols,
    gridTemplateRows: gridTemplateRows,
    gap: `${gridGap}px`,
    justifyItems: gridJustifyItems,
    alignItems: gridAlignItems,
    minHeight: 200,
    padding: 16,
  }), [gridTemplateCols, gridTemplateRows, gridGap, gridJustifyItems, gridAlignItems])

  // ── Presets ──
  const presets: Preset[] = useMemo(() => [
    {
      key: 'holyGrail',
      mode: 'grid' as LayoutMode,
      apply: () => {
        setMode('grid')
        setGridColumns([{ value: 200, unit: 'px' }, { value: 1, unit: 'fr' }, { value: 200, unit: 'px' }])
        setGridRows([{ value: 60, unit: 'px' }, { value: 1, unit: 'fr' }, { value: 60, unit: 'px' }])
        setGridGap(0)
        setGridJustifyItems('stretch')
        setGridAlignItems('stretch')
        setGridChildren([
          { ...createGridChild(), colSpan: 3, rowSpan: 1 },
          { ...createGridChild(), colSpan: 1, rowSpan: 1 },
          { ...createGridChild(), colSpan: 1, rowSpan: 1 },
          { ...createGridChild(), colSpan: 1, rowSpan: 1 },
          { ...createGridChild(), colSpan: 3, rowSpan: 1 },
        ])
      },
    },
    {
      key: 'sidebar',
      mode: 'grid' as LayoutMode,
      apply: () => {
        setMode('grid')
        setGridColumns([{ value: 250, unit: 'px' }, { value: 1, unit: 'fr' }])
        setGridRows([{ value: 1, unit: 'fr' }])
        setGridGap(0)
        setGridJustifyItems('stretch')
        setGridAlignItems('stretch')
        setGridChildren([
          createGridChild(),
          createGridChild(),
        ])
      },
    },
    {
      key: 'cardGrid',
      mode: 'grid' as LayoutMode,
      apply: () => {
        setMode('grid')
        setGridColumns([{ value: 1, unit: 'fr' }, { value: 1, unit: 'fr' }, { value: 1, unit: 'fr' }])
        setGridRows([{ value: 200, unit: 'px' }, { value: 200, unit: 'px' }])
        setGridGap(16)
        setGridJustifyItems('stretch')
        setGridAlignItems('stretch')
        setGridChildren([
          createGridChild(), createGridChild(), createGridChild(),
          createGridChild(), createGridChild(), createGridChild(),
        ])
      },
    },
    {
      key: 'navbar',
      mode: 'flexbox' as LayoutMode,
      apply: () => {
        setMode('flexbox')
        setFlexDirection('row')
        setJustifyContent('space-between')
        setAlignItems('center')
        setFlexWrap('nowrap')
        setFlexGap(16)
        setFlexChildren([createFlexChild(), createFlexChild(), createFlexChild()])
      },
    },
    {
      key: 'centered',
      mode: 'flexbox' as LayoutMode,
      apply: () => {
        setMode('flexbox')
        setFlexDirection('column')
        setJustifyContent('center')
        setAlignItems('center')
        setFlexWrap('nowrap')
        setFlexGap(12)
        setFlexChildren([createFlexChild()])
      },
    },
    {
      key: 'equalCards',
      mode: 'flexbox' as LayoutMode,
      apply: () => {
        setMode('flexbox')
        setFlexDirection('row')
        setJustifyContent('center')
        setAlignItems('stretch')
        setFlexWrap('wrap')
        setFlexGap(16)
        const children = Array.from({ length: 4 }, () => ({
          ...createFlexChild(),
          flexGrow: 1,
          flexBasis: '200px',
        }))
        setFlexChildren(children)
      },
    },
    {
      key: 'masonry',
      mode: 'grid' as LayoutMode,
      apply: () => {
        setMode('grid')
        setGridColumns([{ value: 1, unit: 'fr' }, { value: 1, unit: 'fr' }, { value: 1, unit: 'fr' }])
        setGridRows([{ value: 100, unit: 'px' }, { value: 100, unit: 'px' }, { value: 100, unit: 'px' }])
        setGridGap(8)
        setGridJustifyItems('stretch')
        setGridAlignItems('stretch')
        setGridChildren([
          { ...createGridChild(), colSpan: 1, rowSpan: 2 },
          { ...createGridChild(), colSpan: 1, rowSpan: 1 },
          { ...createGridChild(), colSpan: 1, rowSpan: 1 },
          { ...createGridChild(), colSpan: 1, rowSpan: 1 },
          { ...createGridChild(), colSpan: 1, rowSpan: 2 },
        ])
      },
    },
  ], [])

  // ── Reset ──
  const handleReset = useCallback(() => {
    if (mode === 'flexbox') {
      setFlexDirection('row')
      setJustifyContent('flex-start')
      setAlignItems('stretch')
      setFlexWrap('nowrap')
      setFlexGap(10)
      setFlexChildren([createFlexChild(), createFlexChild(), createFlexChild()])
    } else {
      setGridColumns([{ value: 1, unit: 'fr' }, { value: 1, unit: 'fr' }, { value: 1, unit: 'fr' }])
      setGridRows([{ value: 1, unit: 'fr' }])
      setGridGap(10)
      setGridJustifyItems('stretch')
      setGridAlignItems('stretch')
      setGridChildren([
        createGridChild(), createGridChild(), createGridChild(),
        createGridChild(), createGridChild(), createGridChild(),
      ])
    }
    setExpandedChild(null)
  }, [mode])

  // ── Property selector button component ──
  const PropButton = useCallback(
    ({
      label,
      active,
      onClick,
      small,
    }: {
      label: string
      active: boolean
      onClick: () => void
      small?: boolean
    }) => (
      <button
        onClick={onClick}
        className={`${small ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-xs'} rounded-lg font-medium transition-colors whitespace-nowrap ${
          active
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
        }`}
      >
        {label}
      </button>
    ),
    []
  )

  // ── Render ──
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode('flexbox')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-colors ${
            mode === 'flexbox'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 shadow-lg'
          }`}
        >
          <Layout className="w-4 h-4" />
          Flexbox
        </button>
        <button
          onClick={() => setMode('grid')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-colors ${
            mode === 'grid'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 shadow-lg'
          }`}
        >
          <Grid3X3 className="w-4 h-4" />
          CSS Grid
        </button>
      </div>

      {/* Main grid: settings (1) + preview & code (2) */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: Container Properties */}
        <div className="lg:col-span-1 space-y-6">
          {/* Container settings card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                {t('container')}
              </h2>
              <button
                onClick={handleReset}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400 rounded-lg transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                {t('resetBtn')}
              </button>
            </div>

            {mode === 'flexbox' ? (
              <>
                {/* flex-direction */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">flex-direction</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {FLEX_DIRECTION_OPTIONS.map((opt) => (
                      <PropButton
                        key={opt.value}
                        label={`${opt.icon} ${opt.value}`}
                        active={flexDirection === opt.value}
                        onClick={() => setFlexDirection(opt.value)}
                      />
                    ))}
                  </div>
                </div>

                {/* justify-content */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">justify-content</label>
                  <div className="flex flex-wrap gap-1.5">
                    {JUSTIFY_CONTENT_OPTIONS.map((val) => (
                      <PropButton
                        key={val}
                        label={val}
                        active={justifyContent === val}
                        onClick={() => setJustifyContent(val)}
                        small
                      />
                    ))}
                  </div>
                </div>

                {/* align-items */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">align-items</label>
                  <div className="flex flex-wrap gap-1.5">
                    {ALIGN_ITEMS_OPTIONS.map((val) => (
                      <PropButton
                        key={val}
                        label={val}
                        active={alignItems === val}
                        onClick={() => setAlignItems(val)}
                        small
                      />
                    ))}
                  </div>
                </div>

                {/* flex-wrap */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">flex-wrap</label>
                  <div className="flex flex-wrap gap-1.5">
                    {FLEX_WRAP_OPTIONS.map((val) => (
                      <PropButton
                        key={val}
                        label={val}
                        active={flexWrap === val}
                        onClick={() => setFlexWrap(val)}
                        small
                      />
                    ))}
                  </div>
                </div>

                {/* gap */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">gap</label>
                    <span className="text-xs font-mono text-gray-900 dark:text-white">{flexGap}px</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={60}
                    value={flexGap}
                    onChange={(e) => setFlexGap(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>
              </>
            ) : (
              <>
                {/* grid-template-columns */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">grid-template-columns</label>
                    <button
                      onClick={addGridColumn}
                      disabled={gridColumns.length >= 6}
                      className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      + {t('addColumn')}
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {gridColumns.map((col, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        {col.unit !== 'auto' && (
                          <input
                            type="number"
                            min={0}
                            max={col.unit === 'fr' ? 6 : col.unit === '%' ? 100 : 1000}
                            value={col.value}
                            onChange={(e) => updateGridColumn(i, 'value', Number(e.target.value))}
                            className="w-16 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          />
                        )}
                        <select
                          value={col.unit}
                          onChange={(e) => updateGridColumn(i, 'unit', e.target.value as ColumnUnit)}
                          className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        >
                          {COLUMN_UNIT_OPTIONS.map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => removeGridColumn(i)}
                          disabled={gridColumns.length <= 1}
                          className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* grid-template-rows */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">grid-template-rows</label>
                    <button
                      onClick={addGridRow}
                      disabled={gridRows.length >= 6}
                      className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      + {t('addRow')}
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {gridRows.map((row, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        {row.unit !== 'auto' && (
                          <input
                            type="number"
                            min={0}
                            max={row.unit === 'fr' ? 6 : row.unit === '%' ? 100 : 1000}
                            value={row.value}
                            onChange={(e) => updateGridRow(i, 'value', Number(e.target.value))}
                            className="w-16 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          />
                        )}
                        <select
                          value={row.unit}
                          onChange={(e) => updateGridRow(i, 'unit', e.target.value as ColumnUnit)}
                          className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        >
                          {COLUMN_UNIT_OPTIONS.map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => removeGridRow(i)}
                          disabled={gridRows.length <= 1}
                          className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* gap */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">gap</label>
                    <span className="text-xs font-mono text-gray-900 dark:text-white">{gridGap}px</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={60}
                    value={gridGap}
                    onChange={(e) => setGridGap(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>

                {/* justify-items */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">justify-items</label>
                  <div className="flex flex-wrap gap-1.5">
                    {JUSTIFY_ITEMS_OPTIONS.map((val) => (
                      <PropButton
                        key={val}
                        label={val}
                        active={gridJustifyItems === val}
                        onClick={() => setGridJustifyItems(val)}
                        small
                      />
                    ))}
                  </div>
                </div>

                {/* align-items */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">align-items</label>
                  <div className="flex flex-wrap gap-1.5">
                    {GRID_ALIGN_ITEMS_OPTIONS.map((val) => (
                      <PropButton
                        key={val}
                        label={val}
                        active={gridAlignItems === val}
                        onClick={() => setGridAlignItems(val)}
                        small
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right: Preview + Code */}
        <div className="lg:col-span-2 space-y-6">
          {/* Preview */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t('preview')}</h2>
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
                {([
                  { key: 'desktop' as PreviewWidth, icon: Monitor },
                  { key: 'tablet' as PreviewWidth, icon: Tablet },
                  { key: 'mobile' as PreviewWidth, icon: Smartphone },
                ]).map(({ key, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setPreviewWidth(key)}
                    className={`p-1.5 rounded-md transition-colors ${
                      previewWidth === key
                        ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                    title={t(key)}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-center">
              <div
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 transition-all overflow-auto"
                style={{
                  width: previewWidth === 'desktop' ? '100%' : `${PREVIEW_WIDTHS[previewWidth]}px`,
                  maxWidth: '100%',
                }}
              >
                {mode === 'flexbox' ? (
                  <div style={flexPreviewStyle}>
                    {flexChildren.map((child, i) => (
                      <div
                        key={child.id}
                        className={`${ITEM_COLORS[i % ITEM_COLORS.length]} rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md`}
                        style={{
                          flexGrow: child.flexGrow,
                          flexShrink: child.flexShrink,
                          flexBasis: child.flexBasis,
                          alignSelf: child.alignSelf === 'auto' ? undefined : child.alignSelf,
                          order: child.order,
                          minWidth: 50,
                          minHeight: 50,
                          padding: '12px 16px',
                        }}
                      >
                        {i + 1}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={gridPreviewStyle}>
                    {gridChildren.map((child, i) => (
                      <div
                        key={child.id}
                        className={`${ITEM_COLORS[i % ITEM_COLORS.length]} rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md`}
                        style={{
                          gridColumn: child.colSpan > 1 ? `span ${child.colSpan}` : undefined,
                          gridRow: child.rowSpan > 1 ? `span ${child.rowSpan}` : undefined,
                          minHeight: 50,
                          padding: '12px 16px',
                        }}
                      >
                        {i + 1}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CSS code output */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t('cssCode')}</h2>
              <button
                onClick={() => copyToClipboard(fullCss, 'css-main')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors"
              >
                {copiedId === 'css-main' ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {copiedId === 'css-main' ? t('copied') : t('copy')}
              </button>
            </div>
            <pre className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-sm font-mono text-gray-800 dark:text-gray-200 overflow-x-auto whitespace-pre-wrap break-all">
              {fullCss}
            </pre>
          </div>
        </div>
      </div>

      {/* Children settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t('children')}</h2>
          <button
            onClick={mode === 'flexbox' ? addFlexChild : addGridChild}
            disabled={(mode === 'flexbox' ? flexChildren.length : gridChildren.length) >= MAX_CHILDREN}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('addChild')}
          </button>
        </div>
        {(mode === 'flexbox' ? flexChildren.length : gridChildren.length) >= MAX_CHILDREN && (
          <p className="text-xs text-amber-600 dark:text-amber-400">{t('maxChildren')}</p>
        )}

        <div className="space-y-2">
          {mode === 'flexbox'
            ? flexChildren.map((child, i) => (
                <div key={child.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedChild(expandedChild === child.id ? null : child.id)}
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded ${ITEM_COLORS[i % ITEM_COLORS.length]}`} />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {t('childLabel', { n: i + 1 })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeFlexChild(child.id)
                        }}
                        disabled={flexChildren.length <= 1}
                        className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      {expandedChild === child.id ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </button>
                  {expandedChild === child.id && (
                    <div className="p-3 pt-0 space-y-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3">
                        {/* flex-grow */}
                        <div className="space-y-1">
                          <label className="text-xs text-gray-500 dark:text-gray-400">flex-grow</label>
                          <input
                            type="number"
                            min={0}
                            max={10}
                            value={child.flexGrow}
                            onChange={(e) => updateFlexChild(child.id, 'flexGrow', Number(e.target.value))}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                        {/* flex-shrink */}
                        <div className="space-y-1">
                          <label className="text-xs text-gray-500 dark:text-gray-400">flex-shrink</label>
                          <input
                            type="number"
                            min={0}
                            max={10}
                            value={child.flexShrink}
                            onChange={(e) => updateFlexChild(child.id, 'flexShrink', Number(e.target.value))}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                        {/* flex-basis */}
                        <div className="space-y-1">
                          <label className="text-xs text-gray-500 dark:text-gray-400">flex-basis</label>
                          <input
                            type="text"
                            value={child.flexBasis}
                            onChange={(e) => updateFlexChild(child.id, 'flexBasis', e.target.value)}
                            placeholder="auto"
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                        {/* order */}
                        <div className="space-y-1">
                          <label className="text-xs text-gray-500 dark:text-gray-400">order</label>
                          <input
                            type="number"
                            min={-10}
                            max={10}
                            value={child.order}
                            onChange={(e) => updateFlexChild(child.id, 'order', Number(e.target.value))}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                        {/* align-self */}
                        <div className="space-y-1 col-span-2">
                          <label className="text-xs text-gray-500 dark:text-gray-400">align-self</label>
                          <div className="flex flex-wrap gap-1">
                            {ALIGN_SELF_OPTIONS.map((val) => (
                              <PropButton
                                key={val}
                                label={val}
                                active={child.alignSelf === val}
                                onClick={() => updateFlexChild(child.id, 'alignSelf', val)}
                                small
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            : gridChildren.map((child, i) => (
                <div key={child.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedChild(expandedChild === child.id ? null : child.id)}
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded ${ITEM_COLORS[i % ITEM_COLORS.length]}`} />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {t('childLabel', { n: i + 1 })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeGridChild(child.id)
                        }}
                        disabled={gridChildren.length <= 1}
                        className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      {expandedChild === child.id ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </button>
                  {expandedChild === child.id && (
                    <div className="p-3 pt-0 space-y-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="grid grid-cols-2 gap-3 pt-3">
                        {/* grid-column span */}
                        <div className="space-y-1">
                          <label className="text-xs text-gray-500 dark:text-gray-400">grid-column span</label>
                          <input
                            type="number"
                            min={1}
                            max={gridColumns.length}
                            value={child.colSpan}
                            onChange={(e) => updateGridChild(child.id, 'colSpan', Number(e.target.value))}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                        {/* grid-row span */}
                        <div className="space-y-1">
                          <label className="text-xs text-gray-500 dark:text-gray-400">grid-row span</label>
                          <input
                            type="number"
                            min={1}
                            max={6}
                            value={child.rowSpan}
                            onChange={(e) => updateGridChild(child.id, 'rowSpan', Number(e.target.value))}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
        </div>
      </div>

      {/* Presets */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('presets')}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {presets.map((preset) => (
            <button
              key={preset.key}
              onClick={preset.apply}
              className="group relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all bg-gray-50 dark:bg-gray-900 hover:bg-blue-50 dark:hover:bg-blue-950"
            >
              <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase">{preset.mode}</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {t(`preset.${preset.key}`)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Guide */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          {t('guide.title')}
        </h2>

        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
            {t('guide.flexboxGuide.title')}
          </h3>
          <ul className="space-y-2">
            {(t.raw('guide.flexboxGuide.items') as string[]).map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span className="text-blue-500 mt-0.5 flex-shrink-0">&bull;</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
            {t('guide.gridGuide.title')}
          </h3>
          <ul className="space-y-2">
            {(t.raw('guide.gridGuide.items') as string[]).map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span className="text-blue-500 mt-0.5 flex-shrink-0">&bull;</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
            {t('guide.tips.title')}
          </h3>
          <ul className="space-y-2">
            {(t.raw('guide.tips.items') as string[]).map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span className="text-blue-500 mt-0.5 flex-shrink-0">&bull;</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
