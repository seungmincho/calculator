'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import dynamic from 'next/dynamic'
import {
  Copy,
  Check,
  Upload,
  BarChart3,
  LineChart,
  PieChart,
  ScatterChart,
  AreaChart,
  Radar,
  BookOpen,
  Settings,
  Code,
  Image,
  FileJson,
  Trash2,
} from 'lucide-react'

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false })

// ── Types ──

interface ParseResult {
  headers: string[]
  rows: Record<string, string | number>[]
}

type ChartType = 'bar' | 'line' | 'area' | 'pie' | 'scatter' | 'radar'
type ColorScheme = 'default' | 'warm' | 'cool' | 'mono' | 'pastel'
type DataTab = 'paste' | 'sample'
type CodeTab = 'option' | 'react'

interface ChartConfig {
  chartType: ChartType
  xField: string
  yFields: string[]
  groupField: string
  title: string
  showLegend: boolean
  showGrid: boolean
  smooth: boolean
  stacked: boolean
  horizontal: boolean
  colorScheme: ColorScheme
}

// ── Constants ──

const COLOR_SCHEMES: Record<ColorScheme, string[]> = {
  default: ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'],
  warm: ['#e74c3c', '#e67e22', '#f1c40f', '#d35400', '#c0392b', '#e06c75', '#d19a66'],
  cool: ['#3498db', '#2ecc71', '#1abc9c', '#2980b9', '#27ae60', '#16a085', '#0984e3'],
  mono: ['#2c3e50', '#34495e', '#7f8c8d', '#95a5a6', '#bdc3c7', '#4a69bd', '#6a89cc'],
  pastel: ['#a29bfe', '#74b9ff', '#55efc4', '#ffeaa7', '#fab1a0', '#fd79a8', '#81ecec'],
}

const CHART_TYPES: { type: ChartType; icon: typeof BarChart3 }[] = [
  { type: 'bar', icon: BarChart3 },
  { type: 'line', icon: LineChart },
  { type: 'area', icon: AreaChart },
  { type: 'pie', icon: PieChart },
  { type: 'scatter', icon: ScatterChart },
  { type: 'radar', icon: Radar },
]

const SAMPLE_DATASETS: Record<string, { label: string; data: Record<string, string | number>[] }> = {
  sales: {
    label: 'monthlySales',
    data: [
      { month: '1월', revenue: 4200, cost: 3100, profit: 1100 },
      { month: '2월', revenue: 3800, cost: 2900, profit: 900 },
      { month: '3월', revenue: 5100, cost: 3400, profit: 1700 },
      { month: '4월', revenue: 4700, cost: 3200, profit: 1500 },
      { month: '5월', revenue: 5600, cost: 3600, profit: 2000 },
      { month: '6월', revenue: 6200, cost: 3800, profit: 2400 },
      { month: '7월', revenue: 5800, cost: 3500, profit: 2300 },
      { month: '8월', revenue: 6500, cost: 4000, profit: 2500 },
      { month: '9월', revenue: 5900, cost: 3700, profit: 2200 },
      { month: '10월', revenue: 6800, cost: 4200, profit: 2600 },
      { month: '11월', revenue: 7200, cost: 4500, profit: 2700 },
      { month: '12월', revenue: 8100, cost: 5000, profit: 3100 },
    ],
  },
  population: {
    label: 'cityPopulation',
    data: [
      { city: '서울', population: 9720, area: 605 },
      { city: '부산', population: 3350, area: 770 },
      { city: '인천', population: 2940, area: 1063 },
      { city: '대구', population: 2385, area: 884 },
      { city: '대전', population: 1450, area: 540 },
      { city: '광주', population: 1440, area: 501 },
      { city: '울산', population: 1120, area: 1062 },
      { city: '세종', population: 380, area: 465 },
    ],
  },
  temperature: {
    label: 'monthlyTemp',
    data: [
      { month: '1월', seoul: -2.4, busan: 3.3, jeju: 5.7 },
      { month: '2월', seoul: 0.4, busan: 5.1, jeju: 6.6 },
      { month: '3월', seoul: 5.7, busan: 9.3, jeju: 9.8 },
      { month: '4월', seoul: 12.5, busan: 14.3, jeju: 14.2 },
      { month: '5월', seoul: 17.8, busan: 18.4, jeju: 18.4 },
      { month: '6월', seoul: 22.2, busan: 21.5, jeju: 21.9 },
      { month: '7월', seoul: 24.9, busan: 25.0, jeju: 26.2 },
      { month: '8월', seoul: 25.7, busan: 26.1, jeju: 27.1 },
      { month: '9월', seoul: 21.2, busan: 22.6, jeju: 23.0 },
      { month: '10월', seoul: 14.8, busan: 17.5, jeju: 18.0 },
      { month: '11월', seoul: 7.2, busan: 11.5, jeju: 12.6 },
      { month: '12월', seoul: 0.4, busan: 5.3, jeju: 7.8 },
    ],
  },
}

// ── Parsing Utilities ──

function parseCSV(text: string): ParseResult {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim())
  if (lines.length < 2) return { headers: [], rows: [] }

  const parseLine = (line: string): string[] => {
    const fields: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"'
            i++
          } else {
            inQuotes = false
          }
        } else {
          current += ch
        }
      } else {
        if (ch === '"') {
          inQuotes = true
        } else if (ch === ',' || ch === '\t') {
          fields.push(current.trim())
          current = ''
        } else {
          current += ch
        }
      }
    }
    fields.push(current.trim())
    return fields
  }

  const headers = parseLine(lines[0])
  const rows: Record<string, string | number>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i])
    if (values.length === 0 || (values.length === 1 && values[0] === '')) continue
    const row: Record<string, string | number> = {}
    headers.forEach((h, idx) => {
      const val = values[idx] ?? ''
      const num = Number(val)
      row[h] = val !== '' && !isNaN(num) ? num : val
    })
    rows.push(row)
  }

  return { headers, rows }
}

function parseJSON(text: string): ParseResult {
  const parsed = JSON.parse(text)
  if (!Array.isArray(parsed) || parsed.length === 0) {
    return { headers: [], rows: [] }
  }
  const headers = [...new Set(parsed.flatMap((item: Record<string, unknown>) => Object.keys(item)))]
  const rows = parsed.map((item: Record<string, unknown>) => {
    const row: Record<string, string | number> = {}
    headers.forEach(h => {
      const val = item[h]
      if (typeof val === 'number') row[h] = val
      else if (typeof val === 'string') {
        const num = Number(val)
        row[h] = val !== '' && !isNaN(num) ? num : val
      } else {
        row[h] = val == null ? '' : String(val)
      }
    })
    return row
  })
  return { headers, rows }
}

function autoDetectAndParse(text: string): ParseResult {
  const trimmed = text.trim()
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      return parseJSON(trimmed)
    } catch {
      // Not valid JSON, try CSV
    }
  }
  return parseCSV(trimmed)
}

function isNumericColumn(rows: Record<string, string | number>[], key: string): boolean {
  let numericCount = 0
  let totalNonEmpty = 0
  for (const row of rows) {
    if (row[key] !== '' && row[key] != null) {
      totalNonEmpty++
      if (typeof row[key] === 'number') numericCount++
    }
  }
  return totalNonEmpty > 0 && numericCount / totalNonEmpty > 0.7
}

// ── Component ──

export default function ChartStudio() {
  const t = useTranslations('chartStudio')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const echartsInstanceRef = useRef<any>(null)

  // Data state
  const [rawInput, setRawInput] = useState('')
  const [parsedData, setParsedData] = useState<ParseResult | null>(null)
  const [parseError, setParseError] = useState('')
  const [dataTab, setDataTab] = useState<DataTab>('paste')
  const [codeTab, setCodeTab] = useState<CodeTab>('option')
  const [isDragging, setIsDragging] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Chart configuration
  const [config, setConfig] = useState<ChartConfig>({
    chartType: 'bar',
    xField: '',
    yFields: [],
    groupField: '',
    title: '',
    showLegend: true,
    showGrid: true,
    smooth: false,
    stacked: false,
    horizontal: false,
    colorScheme: 'default',
  })

  // Derived: classify columns
  const { numericColumns, stringColumns } = useMemo(() => {
    if (!parsedData || parsedData.rows.length === 0) {
      return { numericColumns: [] as string[], stringColumns: [] as string[] }
    }
    const numeric: string[] = []
    const str: string[] = []
    parsedData.headers.forEach(h => {
      if (isNumericColumn(parsedData.rows, h)) {
        numeric.push(h)
      } else {
        str.push(h)
      }
    })
    return { numericColumns: numeric, stringColumns: str }
  }, [parsedData])

  // Auto-set fields when data is parsed
  useEffect(() => {
    if (!parsedData || parsedData.headers.length === 0) return

    const xDefault = stringColumns.length > 0 ? stringColumns[0] : parsedData.headers[0]
    const yDefault = numericColumns.length > 0 ? numericColumns.slice(0, 3) : parsedData.headers.filter(h => h !== xDefault).slice(0, 1)

    setConfig(prev => ({
      ...prev,
      xField: xDefault,
      yFields: yDefault,
      groupField: '',
    }))
  }, [parsedData, numericColumns, stringColumns])

  // ── Handlers ──

  const handleParseData = useCallback((text: string) => {
    setRawInput(text)
    if (!text.trim()) {
      setParsedData(null)
      setParseError('')
      return
    }
    try {
      const result = autoDetectAndParse(text)
      if (result.headers.length === 0) {
        setParseError(t('errors.noData'))
        setParsedData(null)
      } else {
        setParsedData(result)
        setParseError('')
      }
    } catch {
      setParseError(t('errors.parseFailed'))
      setParsedData(null)
    }
  }, [t])

  const handleLoadSample = useCallback((key: string) => {
    const sample = SAMPLE_DATASETS[key]
    if (!sample) return
    const text = JSON.stringify(sample.data, null, 2)
    setRawInput(text)
    handleParseData(text)
  }, [handleParseData])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      if (text) {
        setRawInput(text)
        handleParseData(text)
      }
    }
    reader.readAsText(file)
  }, [handleParseData])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleClearData = useCallback(() => {
    setRawInput('')
    setParsedData(null)
    setParseError('')
    setConfig(prev => ({ ...prev, xField: '', yFields: [], groupField: '' }))
  }, [])

  const updateConfig = useCallback(<K extends keyof ChartConfig>(key: K, value: ChartConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }, [])

  const toggleYField = useCallback((field: string) => {
    setConfig(prev => {
      const exists = prev.yFields.includes(field)
      return {
        ...prev,
        yFields: exists ? prev.yFields.filter(f => f !== field) : [...prev.yFields, field],
      }
    })
  }, [])

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleChartReady = useCallback((instance: any) => {
    echartsInstanceRef.current = instance
  }, [])

  const handleExportPNG = useCallback(() => {
    const instance = echartsInstanceRef.current
    if (instance) {
      const url = instance.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' })
      const link = document.createElement('a')
      link.download = config.title ? `${config.title}.png` : 'chart.png'
      link.href = url
      link.click()
    }
  }, [config.title])

  // ── ECharts Option Generation ──

  const echartsOption = useMemo(() => {
    if (!parsedData || parsedData.rows.length === 0 || !config.xField || config.yFields.length === 0) {
      return null
    }

    const { rows } = parsedData
    const colors = COLOR_SCHEMES[config.colorScheme]
    const xData = rows.map(r => String(r[config.xField] ?? ''))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const option: Record<string, any> = {
      color: colors,
      title: config.title ? { text: config.title, left: 'center', textStyle: { fontSize: 16 } } : undefined,
      tooltip: { trigger: config.chartType === 'pie' ? 'item' : 'axis' },
      legend: config.showLegend ? { bottom: 0, type: 'scroll' } : undefined,
    }

    if (config.chartType === 'pie') {
      const yField = config.yFields[0]
      option.series = [{
        type: 'pie',
        radius: ['30%', '65%'],
        center: ['50%', '50%'],
        data: rows.map((r, i) => ({
          name: String(r[config.xField] ?? ''),
          value: Number(r[yField] ?? 0),
          itemStyle: { color: colors[i % colors.length] },
        })),
        emphasis: {
          itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.5)' },
        },
        label: { show: true, formatter: '{b}: {d}%' },
      }]
      if (config.showLegend) {
        option.legend = { orient: 'vertical', left: 'left', type: 'scroll' }
      }
    } else if (config.chartType === 'radar') {
      const max = Math.max(
        ...config.yFields.flatMap(yf => rows.map(r => Number(r[yf] ?? 0)))
      ) * 1.2

      option.radar = {
        indicator: xData.map(name => ({ name, max: Math.ceil(max) })),
      }
      option.series = [{
        type: 'radar',
        data: config.yFields.map((yf, i) => ({
          name: yf,
          value: rows.map(r => Number(r[yf] ?? 0)),
          areaStyle: { opacity: 0.15 },
          lineStyle: { color: colors[i % colors.length] },
          itemStyle: { color: colors[i % colors.length] },
        })),
      }]
    } else if (config.chartType === 'scatter') {
      const xIsNumeric = isNumericColumn(rows, config.xField)
      if (xIsNumeric) {
        option.xAxis = { type: 'value', name: config.xField }
        option.yAxis = { type: 'value', name: config.yFields[0] || '' }
      } else {
        option.xAxis = { type: 'category', data: xData }
        option.yAxis = { type: 'value' }
      }
      if (config.showGrid) {
        option.grid = { left: '8%', right: '5%', bottom: config.showLegend ? '15%' : '8%', top: config.title ? '12%' : '8%', containLabel: true }
      }
      option.series = config.yFields.map((yf, i) => ({
        name: yf,
        type: 'scatter',
        data: xIsNumeric
          ? rows.map(r => [Number(r[config.xField] ?? 0), Number(r[yf] ?? 0)])
          : rows.map(r => Number(r[yf] ?? 0)),
        itemStyle: { color: colors[i % colors.length] },
        symbolSize: 10,
      }))
    } else {
      // bar, line, area
      const isHorizontal = config.chartType === 'bar' && config.horizontal
      const categoryAxis = { type: 'category' as const, data: xData }
      const valueAxis = { type: 'value' as const }

      option.xAxis = isHorizontal ? valueAxis : categoryAxis
      option.yAxis = isHorizontal ? categoryAxis : valueAxis

      if (config.showGrid) {
        option.grid = { left: '8%', right: '5%', bottom: config.showLegend ? '15%' : '8%', top: config.title ? '12%' : '8%', containLabel: true }
      }

      const seriesType = config.chartType === 'area' ? 'line' : config.chartType

      if (config.groupField && config.groupField !== '' && config.yFields.length === 1) {
        // Group-by mode: create one series per unique value in groupField
        const groups = [...new Set(rows.map(r => String(r[config.groupField] ?? '')))]
        const categories = [...new Set(rows.map(r => String(r[config.xField] ?? '')))]
        option.xAxis = isHorizontal ? valueAxis : { type: 'category', data: categories }
        option.yAxis = isHorizontal ? { type: 'category', data: categories } : valueAxis

        option.series = groups.map((group, i) => {
          const groupRows = rows.filter(r => String(r[config.groupField] ?? '') === group)
          const dataMap = new Map(groupRows.map(r => [String(r[config.xField] ?? ''), Number(r[config.yFields[0]] ?? 0)]))
          return {
            name: group,
            type: seriesType,
            data: categories.map(cat => dataMap.get(cat) ?? 0),
            stack: config.stacked ? 'total' : undefined,
            smooth: config.smooth,
            areaStyle: config.chartType === 'area' ? { opacity: 0.3 } : undefined,
            itemStyle: { color: colors[i % colors.length] },
          }
        })
      } else {
        option.series = config.yFields.map((yf, i) => ({
          name: yf,
          type: seriesType,
          data: rows.map(r => Number(r[yf] ?? 0)),
          stack: config.stacked ? 'total' : undefined,
          smooth: config.smooth,
          areaStyle: config.chartType === 'area' ? { opacity: 0.3 } : undefined,
          itemStyle: { color: colors[i % colors.length] },
        }))
      }
    }

    // Clean undefined values
    Object.keys(option).forEach(key => {
      if (option[key] === undefined) delete option[key]
    })

    return option
  }, [parsedData, config])

  // ── Code Generation ──

  const optionCode = useMemo(() => {
    if (!echartsOption) return ''
    return JSON.stringify(echartsOption, null, 2)
  }, [echartsOption])

  const reactCode = useMemo(() => {
    if (!echartsOption) return ''
    const optionStr = JSON.stringify(echartsOption, null, 2)
      .split('\n')
      .map((line, i) => (i === 0 ? line : '  ' + line))
      .join('\n')

    return `import ReactECharts from 'echarts-for-react';

export default function MyChart() {
  const option = ${optionStr};

  return (
    <ReactECharts
      option={option}
      style={{ height: '400px', width: '100%' }}
      notMerge={true}
    />
  );
}`
  }, [echartsOption])

  // ── Render ──

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Data Input Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <FileJson className="w-5 h-5" />
            {t('dataInput.title')}
          </h2>
          {parsedData && (
            <button
              onClick={handleClearData}
              className="flex items-center gap-1 text-sm text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
            >
              <Trash2 className="w-4 h-4" />
              {t('dataInput.clear')}
            </button>
          )}
        </div>

        {/* Data Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setDataTab('paste')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              dataTab === 'paste'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {t('dataInput.pasteTab')}
          </button>
          <button
            onClick={() => setDataTab('sample')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              dataTab === 'sample'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {t('dataInput.sampleTab')}
          </button>
        </div>

        {dataTab === 'paste' ? (
          <div
            className={`relative rounded-lg border-2 border-dashed transition-colors ${
              isDragging
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <textarea
              value={rawInput}
              onChange={(e) => handleParseData(e.target.value)}
              placeholder={t('dataInput.placeholder')}
              className="w-full min-h-[140px] px-4 py-3 bg-transparent text-gray-900 dark:text-white font-mono text-sm focus:outline-none resize-y rounded-lg"
            />
            {isDragging && (
              <div className="absolute inset-0 flex items-center justify-center bg-blue-50/80 dark:bg-blue-900/60 rounded-lg pointer-events-none">
                <div className="flex flex-col items-center gap-2 text-blue-600 dark:text-blue-300">
                  <Upload className="w-8 h-8" />
                  <span className="text-sm font-medium">{t('dataInput.dropHere')}</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {Object.entries(SAMPLE_DATASETS).map(([key, dataset]) => (
              <button
                key={key}
                onClick={() => handleLoadSample(key)}
                className="flex flex-col items-start gap-1 p-4 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-left"
              >
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {t(`sampleData.${dataset.label}`)}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {dataset.data.length} {t('dataInput.rows')} / {Object.keys(dataset.data[0]).length} {t('dataInput.columns')}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Parse Status */}
        {parseError && (
          <p className="mt-2 text-sm text-red-500 dark:text-red-400">{parseError}</p>
        )}
        {parsedData && (
          <p className="mt-2 text-sm text-green-600 dark:text-green-400">
            {t('dataInput.parsed', { rows: parsedData.rows.length, columns: parsedData.headers.length })}
          </p>
        )}
      </div>

      {/* Configuration + Preview */}
      {parsedData && parsedData.rows.length > 0 && (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left: Config Panel */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-5">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Settings className="w-5 h-5" />
                {t('config.title')}
              </h2>

              {/* Chart Type Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('config.chartType')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {CHART_TYPES.map(({ type, icon: Icon }) => (
                    <button
                      key={type}
                      onClick={() => updateConfig('chartType', type)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-colors ${
                        config.chartType === type
                          ? 'border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                          : 'border-2 border-gray-200 dark:border-gray-600 hover:border-blue-300'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${config.chartType === type ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />
                      <span className={`text-xs ${config.chartType === type ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
                        {t(`chartTypes.${type}`)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* X Axis Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('config.xAxis')}
                </label>
                <select
                  value={config.xField}
                  onChange={(e) => updateConfig('xField', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">{t('config.selectField')}</option>
                  {parsedData.headers.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              {/* Y Axis Fields (Multi-Select) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('config.yAxis')}
                  {config.chartType === 'pie' && (
                    <span className="text-xs text-gray-400 ml-1">({t('config.singleOnly')})</span>
                  )}
                </label>
                <div className="space-y-1 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg p-2">
                  {parsedData.headers
                    .filter(h => h !== config.xField)
                    .map(h => {
                      const isChecked = config.yFields.includes(h)
                      const isDisabled = config.chartType === 'pie' && !isChecked && config.yFields.length >= 1
                      return (
                        <label
                          key={h}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                            isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isDisabled}
                            onChange={() => toggleYField(h)}
                            className="accent-blue-600 rounded"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{h}</span>
                          {isNumericColumn(parsedData.rows, h) && (
                            <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 px-1.5 py-0.5 rounded ml-auto">
                              {t('config.numeric')}
                            </span>
                          )}
                        </label>
                      )
                    })}
                </div>
              </div>

              {/* Group By Field */}
              {config.chartType !== 'pie' && config.chartType !== 'radar' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('config.groupBy')}
                    <span className="text-xs text-gray-400 ml-1">({t('config.optional')})</span>
                  </label>
                  <select
                    value={config.groupField}
                    onChange={(e) => updateConfig('groupField', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">{t('config.none')}</option>
                    {stringColumns.filter(h => h !== config.xField).map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Chart Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('config.chartTitle')}
                </label>
                <input
                  type="text"
                  value={config.title}
                  onChange={(e) => updateConfig('title', e.target.value)}
                  placeholder={t('config.chartTitlePlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              {/* Toggle Switches */}
              <div className="space-y-3">
                <ToggleSwitch
                  label={t('config.legend')}
                  checked={config.showLegend}
                  onChange={(v) => updateConfig('showLegend', v)}
                />
                <ToggleSwitch
                  label={t('config.grid')}
                  checked={config.showGrid}
                  onChange={(v) => updateConfig('showGrid', v)}
                />
                {(config.chartType === 'line' || config.chartType === 'area') && (
                  <ToggleSwitch
                    label={t('config.smooth')}
                    checked={config.smooth}
                    onChange={(v) => updateConfig('smooth', v)}
                  />
                )}
                {(config.chartType === 'bar' || config.chartType === 'line' || config.chartType === 'area') && (
                  <ToggleSwitch
                    label={t('config.stacked')}
                    checked={config.stacked}
                    onChange={(v) => updateConfig('stacked', v)}
                  />
                )}
                {config.chartType === 'bar' && (
                  <ToggleSwitch
                    label={t('config.horizontal')}
                    checked={config.horizontal}
                    onChange={(v) => updateConfig('horizontal', v)}
                  />
                )}
              </div>

              {/* Color Scheme */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('config.colorScheme')}
                </label>
                <div className="space-y-2">
                  {(Object.keys(COLOR_SCHEMES) as ColorScheme[]).map(scheme => (
                    <button
                      key={scheme}
                      onClick={() => updateConfig('colorScheme', scheme)}
                      className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                        config.colorScheme === scheme
                          ? 'bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-500'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      <div className="flex gap-0.5">
                        {COLOR_SCHEMES[scheme].slice(0, 7).map((color, i) => (
                          <div
                            key={i}
                            className="w-4 h-4 rounded-sm"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {t(`colorSchemes.${scheme}`)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Chart Preview */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('preview.title')}
              </h2>

              {echartsOption ? (
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <ReactECharts
                    option={echartsOption}
                    style={{ height: '400px', width: '100%' }}
                    notMerge={true}
                    onChartReady={handleChartReady}
                  />
                </div>
              ) : (
                <div className="h-[400px] bg-gray-50 dark:bg-gray-900 rounded-lg flex items-center justify-center">
                  <p className="text-gray-400 dark:text-gray-500 text-sm">
                    {t('preview.noChart')}
                  </p>
                </div>
              )}

              {/* Export Buttons */}
              {echartsOption && (
                <div className="flex flex-wrap gap-3 mt-4">
                  <button
                    onClick={handleExportPNG}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-sm font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors"
                  >
                    <Image className="w-4 h-4" />
                    {t('export.png')}
                  </button>
                  <button
                    onClick={() => copyToClipboard(optionCode, 'option')}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
                  >
                    {copiedId === 'option' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    {t('export.copyOption')}
                  </button>
                  <button
                    onClick={() => copyToClipboard(reactCode, 'react')}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
                  >
                    {copiedId === 'react' ? <Check className="w-4 h-4 text-green-500" /> : <Code className="w-4 h-4" />}
                    {t('export.copyReact')}
                  </button>
                </div>
              )}
            </div>

            {/* Data Preview Table */}
            {parsedData && parsedData.rows.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {t('dataPreview.title')}
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        {parsedData.headers.map(h => (
                          <th
                            key={h}
                            className={`text-left px-3 py-2 font-medium ${
                              h === config.xField
                                ? 'text-blue-600 dark:text-blue-400'
                                : config.yFields.includes(h)
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            {h}
                            {h === config.xField && <span className="ml-1 text-xs">(X)</span>}
                            {config.yFields.includes(h) && <span className="ml-1 text-xs">(Y)</span>}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.rows.slice(0, 10).map((row, i) => (
                        <tr key={i} className="border-b border-gray-100 dark:border-gray-700/50">
                          {parsedData.headers.map(h => (
                            <td key={h} className="px-3 py-1.5 text-gray-700 dark:text-gray-300">
                              {String(row[h] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsedData.rows.length > 10 && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
                      {t('dataPreview.showing', { shown: 10, total: parsedData.rows.length })}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Generated Code Section */}
      {echartsOption && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Code className="w-5 h-5" />
            {t('codeOutput.title')}
          </h2>

          {/* Code Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setCodeTab('option')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                codeTab === 'option'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {t('codeOutput.optionTab')}
            </button>
            <button
              onClick={() => setCodeTab('react')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                codeTab === 'react'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {t('codeOutput.reactTab')}
            </button>
          </div>

          <div className="relative">
            <button
              onClick={() => copyToClipboard(codeTab === 'option' ? optionCode : reactCode, `code-${codeTab}`)}
              className="absolute top-3 right-3 flex items-center gap-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md text-xs transition-colors z-10"
            >
              {copiedId === `code-${codeTab}` ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-400" />
                  {t('copied')}
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  {t('copy')}
                </>
              )}
            </button>
            <pre className="bg-gray-900 dark:bg-gray-950 text-green-400 font-mono text-sm rounded-lg p-4 overflow-x-auto max-h-96 overflow-y-auto">
              {codeTab === 'option' ? optionCode : reactCode}
            </pre>
          </div>
        </div>
      )}

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          {t('guide.title')}
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Supported Formats */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              {t('guide.formats.title')}
            </h3>
            <ul className="space-y-1.5">
              {(t.raw('guide.formats.items') as string[]).map((item, i) => (
                <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">&#8226;</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          {/* Chart Types */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              {t('guide.chartTypes.title')}
            </h3>
            <ul className="space-y-1.5">
              {(t.raw('guide.chartTypes.items') as string[]).map((item, i) => (
                <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">&#8226;</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          {/* Tips */}
          <div className="space-y-3 md:col-span-2">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              {t('guide.tips.title')}
            </h3>
            <ul className="space-y-1.5">
              {(t.raw('guide.tips.items') as string[]).map((item, i) => (
                <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">&#8226;</span>
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

// ── Toggle Switch Sub-Component ──

function ToggleSwitch({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-4.5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </label>
  )
}
