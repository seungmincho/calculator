'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import { useTranslations } from 'next-intl'
import dynamic from 'next/dynamic'
import {
  Copy,
  Check,
  Plus,
  Trash2,
  Pencil,
  Download,
  FileJson,
  FileSpreadsheet,
  Image,
  BookOpen,
  FolderOpen,
  X,
  GanttChartSquare,
} from 'lucide-react'

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false })

// ── Types ──

interface Task {
  id: string
  name: string
  startDate: string
  endDate: string
  progress: number
  category: string
  color: string
}

// ── Constants ──

const CATEGORY_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
  '#F97316', '#14B8A6', '#6366F1', '#E11D48',
]

const generateId = () => `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

const formatDateForInput = (date: Date): string => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// ── Component ──

export default function GanttChart() {
  const t = useTranslations('ganttChart')

  // ── State ──
  const [tasks, setTasks] = useState<Task[]>([])
  const [taskName, setTaskName] = useState('')
  const [startDate, setStartDate] = useState(formatDateForInput(new Date()))
  const [endDate, setEndDate] = useState(formatDateForInput(new Date(Date.now() + 7 * 86400000)))
  const [progress, setProgress] = useState(0)
  const [category, setCategory] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const echartsRef = useRef<any>(null)

  // ── Derived ──
  const categoryColorMap = useMemo(() => {
    const map: Record<string, string> = {}
    let colorIdx = 0
    for (const task of tasks) {
      if (task.category && !(task.category in map)) {
        map[task.category] = CATEGORY_COLORS[colorIdx % CATEGORY_COLORS.length]
        colorIdx++
      }
    }
    return map
  }, [tasks])

  const existingCategories = useMemo(() => {
    const cats = new Set<string>()
    tasks.forEach(tk => { if (tk.category) cats.add(tk.category) })
    return Array.from(cats)
  }, [tasks])

  const filteredCategories = useMemo(() => {
    if (!category) return existingCategories
    return existingCategories.filter(c => c.toLowerCase().includes(category.toLowerCase()))
  }, [existingCategories, category])

  // ── Color assignment ──
  const getColorForCategory = useCallback((cat: string): string => {
    if (categoryColorMap[cat]) return categoryColorMap[cat]
    const usedColors = new Set(Object.values(categoryColorMap))
    const available = CATEGORY_COLORS.find(c => !usedColors.has(c))
    return available || CATEGORY_COLORS[Object.keys(categoryColorMap).length % CATEGORY_COLORS.length]
  }, [categoryColorMap])

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

  // ── Task CRUD ──
  const addOrUpdateTask = useCallback(() => {
    if (!taskName.trim() || !startDate || !endDate) return
    if (new Date(endDate) < new Date(startDate)) return

    const cat = category.trim() || t('task.defaultCategory')
    const color = getColorForCategory(cat)

    if (editingId) {
      setTasks(prev => prev.map(task =>
        task.id === editingId
          ? { ...task, name: taskName.trim(), startDate, endDate, progress, category: cat, color }
          : task
      ))
      setEditingId(null)
    } else {
      const newTask: Task = {
        id: generateId(),
        name: taskName.trim(),
        startDate,
        endDate,
        progress,
        category: cat,
        color,
      }
      setTasks(prev => [...prev, newTask])
    }

    setTaskName('')
    setStartDate(formatDateForInput(new Date()))
    setEndDate(formatDateForInput(new Date(Date.now() + 7 * 86400000)))
    setProgress(0)
    setCategory('')
  }, [taskName, startDate, endDate, progress, category, editingId, getColorForCategory, t])

  const deleteTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(task => task.id !== id))
    if (editingId === id) setEditingId(null)
  }, [editingId])

  const startEditing = useCallback((task: Task) => {
    setEditingId(task.id)
    setTaskName(task.name)
    setStartDate(task.startDate)
    setEndDate(task.endDate)
    setProgress(task.progress)
    setCategory(task.category)
  }, [])

  const cancelEditing = useCallback(() => {
    setEditingId(null)
    setTaskName('')
    setStartDate(formatDateForInput(new Date()))
    setEndDate(formatDateForInput(new Date(Date.now() + 7 * 86400000)))
    setProgress(0)
    setCategory('')
  }, [])

  // ── Sample project ──
  const loadSampleProject = useCallback(() => {
    const today = new Date()
    const d = (offset: number) => formatDateForInput(new Date(today.getTime() + offset * 86400000))

    const sampleTasks: Task[] = [
      { id: generateId(), name: t('sample.tasks.requirements'), startDate: d(0), endDate: d(6), progress: 100, category: t('sample.categories.planning'), color: '#3B82F6' },
      { id: generateId(), name: t('sample.tasks.design'), startDate: d(4), endDate: d(13), progress: 80, category: t('sample.categories.design'), color: '#10B981' },
      { id: generateId(), name: t('sample.tasks.frontend'), startDate: d(10), endDate: d(27), progress: 45, category: t('sample.categories.development'), color: '#F59E0B' },
      { id: generateId(), name: t('sample.tasks.backend'), startDate: d(10), endDate: d(30), progress: 30, category: t('sample.categories.development'), color: '#F59E0B' },
      { id: generateId(), name: t('sample.tasks.testing'), startDate: d(25), endDate: d(37), progress: 0, category: t('sample.categories.qa'), color: '#EF4444' },
      { id: generateId(), name: t('sample.tasks.deployment'), startDate: d(35), endDate: d(41), progress: 0, category: t('sample.categories.release'), color: '#8B5CF6' },
    ]
    setTasks(sampleTasks)
  }, [t])

  // ── ECharts option ──
  const chartOption = useMemo(() => {
    if (tasks.length === 0) return null

    const allDates = tasks.flatMap(tk => [new Date(tk.startDate).getTime(), new Date(tk.endDate).getTime()])
    const minDate = Math.min(...allDates)
    const maxDate = Math.max(...allDates)
    const padding = (maxDate - minDate) * 0.05 || 86400000

    const reversedTasks = [...tasks].reverse()

    return {
      tooltip: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (params: any) => {
          const task = tasks.find(tk => tk.name === params.name)
          if (!task) return ''
          return `<strong>${task.name}</strong><br/>${task.startDate} ~ ${task.endDate}<br/>${t('task.progress')}: ${task.progress}%<br/>${t('task.category')}: ${task.category}`
        },
      },
      grid: {
        left: '25%',
        right: '5%',
        top: '3%',
        bottom: '10%',
        containLabel: false,
      },
      xAxis: {
        type: 'time' as const,
        min: minDate - padding,
        max: maxDate + padding,
        axisLabel: {
          formatter: '{yyyy}-{MM}-{dd}',
          fontSize: 11,
          color: '#6B7280',
          rotate: 30,
        },
        splitLine: {
          show: true,
          lineStyle: { color: '#E5E7EB', type: 'dashed' as const },
        },
      },
      yAxis: {
        type: 'category' as const,
        data: reversedTasks.map(tk => tk.name),
        inverse: false,
        axisLabel: {
          width: 140,
          overflow: 'truncate' as const,
          fontSize: 12,
          color: '#374151',
        },
        axisTick: { show: false },
        axisLine: { show: false },
      },
      series: [
        {
          type: 'custom' as const,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          renderItem: (params: any, api: any) => {
            const yIdx = api.value(0)
            const startCoord = api.coord([api.value(1), yIdx])
            const endCoord = api.coord([api.value(2), yIdx])
            const barHeight = (api.size([0, 1]) as number[])[1] * 0.6
            const totalWidth = Math.max(endCoord[0] - startCoord[0], 2)
            const progressVal = api.value(3) as number
            const progressWidth = totalWidth * progressVal / 100
            const taskColor = api.value(4) as string

            const children = [
              // Background bar (full duration, low opacity)
              {
                type: 'rect' as const,
                shape: {
                  x: startCoord[0],
                  y: startCoord[1] - barHeight / 2,
                  width: totalWidth,
                  height: barHeight,
                  r: 4,
                },
                style: { fill: taskColor, opacity: 0.2 },
              },
              // Progress bar (filled portion)
              {
                type: 'rect' as const,
                shape: {
                  x: startCoord[0],
                  y: startCoord[1] - barHeight / 2,
                  width: progressWidth,
                  height: barHeight,
                  r: progressWidth >= totalWidth ? 4 : [4, 0, 0, 4],
                },
                style: { fill: taskColor },
              },
            ]

            // Progress label (only if bar is wide enough)
            if (totalWidth > 40) {
              children.push({
                type: 'text' as const,
                style: {
                  text: `${progressVal}%`,
                  x: startCoord[0] + 8,
                  y: startCoord[1],
                  fill: progressVal > 30 ? '#fff' : '#374151',
                  fontSize: 11,
                  fontWeight: 600,
                  verticalAlign: 'middle' as const,
                },
              } as any)
            }

            return { type: 'group' as const, children }
          },
          data: reversedTasks.map((task, i) => ({
            value: [
              i,
              new Date(task.startDate).getTime(),
              new Date(task.endDate).getTime(),
              task.progress,
              task.color,
            ],
            name: task.name,
          })),
          encode: { x: [1, 2], y: 0 },
        },
      ],
    }
  }, [tasks, t])

  // ── Export ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleChartReady = useCallback((instance: any) => {
    echartsRef.current = instance
  }, [])

  const exportPNG = useCallback(() => {
    const instance = echartsRef.current
    if (!instance) return
    const url = instance.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#ffffff' })
    const link = document.createElement('a')
    link.download = 'gantt-chart.png'
    link.href = url
    link.click()
  }, [])

  const exportCSV = useCallback(() => {
    const header = [t('task.name'), t('task.startDate'), t('task.endDate'), t('task.progress'), t('task.category')].join(',')
    const rows = tasks.map(task =>
      [task.name, task.startDate, task.endDate, `${task.progress}%`, task.category].join(',')
    )
    const csv = [header, ...rows].join('\n')
    copyToClipboard(csv, 'csv')
  }, [tasks, t, copyToClipboard])

  const exportJSON = useCallback(() => {
    const data = tasks.map(({ id: _id, color: _color, ...rest }) => rest)
    const json = JSON.stringify(data, null, 2)
    copyToClipboard(json, 'json')
  }, [tasks, copyToClipboard])

  const downloadCSV = useCallback(() => {
    const header = [t('task.name'), t('task.startDate'), t('task.endDate'), t('task.progress'), t('task.category')].join(',')
    const rows = tasks.map(task =>
      [`"${task.name}"`, task.startDate, task.endDate, `${task.progress}%`, `"${task.category}"`].join(',')
    )
    const csv = '\uFEFF' + [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = 'gantt-chart.csv'
    link.href = url
    link.click()
    URL.revokeObjectURL(url)
  }, [tasks, t])

  // ── Category stats ──
  const categoryStats = useMemo(() => {
    const stats: Record<string, { count: number; avgProgress: number; color: string }> = {}
    tasks.forEach(task => {
      if (!stats[task.category]) {
        stats[task.category] = { count: 0, avgProgress: 0, color: task.color }
      }
      stats[task.category].count++
      stats[task.category].avgProgress += task.progress
    })
    Object.values(stats).forEach(s => {
      s.avgProgress = Math.round(s.avgProgress / s.count)
    })
    return stats
  }, [tasks])

  const overallProgress = useMemo(() => {
    if (tasks.length === 0) return 0
    return Math.round(tasks.reduce((sum, tk) => sum + tk.progress, 0) / tasks.length)
  }, [tasks])

  // ── Render ──
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <GanttChartSquare className="w-7 h-7 text-blue-500" />
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Task Input Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {editingId ? t('actions.editTask') : t('actions.addTask')}
          </h2>
          <button
            onClick={loadSampleProject}
            className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            <FolderOpen className="w-4 h-4" />
            {t('actions.loadSample')}
          </button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Task name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('task.name')}
            </label>
            <input
              type="text"
              value={taskName}
              onChange={e => setTaskName(e.target.value)}
              placeholder={t('task.namePlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
              onKeyDown={e => { if (e.key === 'Enter') addOrUpdateTask() }}
            />
          </div>

          {/* Start date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('task.startDate')}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {/* End date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('task.endDate')}
            </label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {/* Progress */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('task.progress')}: {progress}%
            </label>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={progress}
              onChange={e => setProgress(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
          </div>

          {/* Category with autocomplete */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('task.category')}
            </label>
            <input
              type="text"
              value={category}
              onChange={e => {
                setCategory(e.target.value)
                setShowCategoryDropdown(true)
              }}
              onFocus={() => setShowCategoryDropdown(true)}
              onBlur={() => setTimeout(() => setShowCategoryDropdown(false), 150)}
              placeholder={t('task.categoryPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
              onKeyDown={e => { if (e.key === 'Enter') addOrUpdateTask() }}
            />
            {showCategoryDropdown && filteredCategories.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-32 overflow-y-auto">
                {filteredCategories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => {
                      setCategory(cat)
                      setShowCategoryDropdown(false)
                    }}
                    className="w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-600 flex items-center gap-2"
                  >
                    <span
                      className="w-3 h-3 rounded-full inline-block flex-shrink-0"
                      style={{ backgroundColor: categoryColorMap[cat] || '#6B7280' }}
                    />
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-end gap-2">
            <button
              onClick={addOrUpdateTask}
              disabled={!taskName.trim() || !startDate || !endDate}
              className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-2 font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {editingId ? (
                <><Check className="w-4 h-4" />{t('actions.update')}</>
              ) : (
                <><Plus className="w-4 h-4" />{t('actions.add')}</>
              )}
            </button>
            {editingId && (
              <button
                onClick={cancelEditing}
                className="flex items-center justify-center gap-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <X className="w-4 h-4" />
                {t('actions.cancel')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Overall progress + category legend */}
      {tasks.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {t('stats.overallProgress')}: {overallProgress}%
            </h3>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {t('stats.totalTasks', { count: tasks.length })}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5 mb-4">
            <div
              className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            {Object.entries(categoryStats).map(([cat, stat]) => (
              <div key={cat} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: stat.color }} />
                <span>{cat}</span>
                <span className="text-gray-400 dark:text-gray-500">({stat.count})</span>
                <span className="text-gray-400 dark:text-gray-500">{stat.avgProgress}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main content: Task list + Chart */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Task List */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('taskList.title')}
            </h2>

            {tasks.length === 0 ? (
              <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                <GanttChartSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{t('taskList.empty')}</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {tasks.map((task, idx) => (
                  <div
                    key={task.id}
                    className={`bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 border transition-colors ${
                      editingId === task.id
                        ? 'border-blue-400 dark:border-blue-500 ring-1 ring-blue-200 dark:ring-blue-800'
                        : 'border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: task.color }}
                          />
                          <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {idx + 1}. {task.name}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-4">
                          {task.startDate} ~ {task.endDate}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 ml-4">
                          {task.category}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => startEditing(task)}
                          className="p-1 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"
                          title={t('actions.edit')}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                          title={t('actions.delete')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-2 ml-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${task.progress}%`, backgroundColor: task.color }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-8 text-right">
                          {task.progress}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Gantt Chart */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('chart.title')}
            </h2>

            {chartOption ? (
              <div>
                <ReactECharts
                  option={chartOption}
                  style={{ height: `${Math.max(200, tasks.length * 50 + 60)}px`, width: '100%' }}
                  notMerge={true}
                  onChartReady={handleChartReady}
                />

                {/* Export buttons */}
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={exportPNG}
                    className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <Image className="w-4 h-4" />
                    {t('export.png')}
                  </button>
                  <button
                    onClick={downloadCSV}
                    className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <Download className="w-4 h-4" />
                    {t('export.downloadCsv')}
                  </button>
                  <button
                    onClick={exportCSV}
                    className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    {copiedId === 'csv' ? <Check className="w-4 h-4 text-green-500" /> : <FileSpreadsheet className="w-4 h-4" />}
                    {copiedId === 'csv' ? t('export.copied') : t('export.csv')}
                  </button>
                  <button
                    onClick={exportJSON}
                    className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    {copiedId === 'json' ? <Check className="w-4 h-4 text-green-500" /> : <FileJson className="w-4 h-4" />}
                    {copiedId === 'json' ? t('export.copied') : t('export.json')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
                <GanttChartSquare className="w-16 h-16 mb-3 opacity-40" />
                <p className="text-sm">{t('chart.empty')}</p>
                <button
                  onClick={loadSampleProject}
                  className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {t('actions.loadSample')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-500" />
          {t('guide.title')}
        </h2>

        <div className="grid md:grid-cols-2 gap-6">
          {/* How to use */}
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.howToUse.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.howToUse.items') as string[]).map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-blue-500 font-bold mt-0.5">{i + 1}.</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Tips */}
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.tips.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.tips.items') as string[]).map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Copy className="w-3.5 h-3.5 text-indigo-400 mt-0.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
