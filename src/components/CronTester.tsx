'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { 
  Clock, 
  Play, 
  AlertCircle, 
  CheckCircle, 
  Copy, 
  Check,
  Calendar,
  RefreshCw,
  Info,
  Settings,
  Zap,
  Timer
} from 'lucide-react'

interface CronExpression {
  minute: string
  hour: string
  day: string
  month: string
  weekday: string
}

interface CronValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

interface NextExecution {
  date: Date
  humanReadable: string
}

const CronTester = () => {
  const t = useTranslations('cronTester')
  const tc = useTranslations('common')
  const [cronExpression, setCronExpression] = useState('0 9 * * 1-5')
  const [validation, setValidation] = useState<CronValidation>({ isValid: true, errors: [], warnings: [] })
  const [nextExecutions, setNextExecutions] = useState<NextExecution[]>([])
  const [description, setDescription] = useState('')
  const [isCopied, setIsCopied] = useState(false)

  // Cron presets
  const presets = useMemo(() => [
    { expression: '0 9 * * 1-5', key: 'weekdayMorning' },
    { expression: '0 0 * * *', key: 'daily' },
    { expression: '0 0 * * 0', key: 'weekly' },
    { expression: '0 0 1 * *', key: 'monthly' },
    { expression: '*/5 * * * *', key: 'every5min' },
    { expression: '0 */2 * * *', key: 'every2hours' },
    { expression: '0 12 * * *', key: 'dailyNoon' },
    { expression: '0 0 1 1 *', key: 'yearly' },
    { expression: '30 14 * * 6', key: 'saturdayAfternoon' },
    { expression: '0 23 * * *', key: 'lateNight' }
  ], [])

  // Parse cron expression
  const parseCronExpression = useCallback((expr: string): CronExpression | null => {
    const parts = expr.trim().split(/\s+/)
    if (parts.length !== 5) return null

    return {
      minute: parts[0],
      hour: parts[1],
      day: parts[2],
      month: parts[3],
      weekday: parts[4]
    }
  }, [])

  // Validate cron field
  const validateField = useCallback((value: string, min: number, max: number, field: string): string[] => {
    const errors: string[] = []
    
    if (value === '*') return errors
    
    const parts = value.split(',')
    for (const part of parts) {
      if (part.includes('/')) {
        const [range, step] = part.split('/')
        const stepNum = parseInt(step)
        if (isNaN(stepNum) || stepNum <= 0) {
          errors.push(t(`validation.invalidStep`, { field, value: step }))
        }
        if (range !== '*') {
          if (range.includes('-')) {
            const [start, end] = range.split('-').map(Number)
            if (isNaN(start) || isNaN(end) || start < min || end > max || start > end) {
              errors.push(t(`validation.invalidRange`, { field, min, max }))
            }
          } else {
            const num = parseInt(range)
            if (isNaN(num) || num < min || num > max) {
              errors.push(t(`validation.outOfRange`, { field, min, max }))
            }
          }
        }
      } else if (part.includes('-')) {
        const [start, end] = part.split('-').map(Number)
        if (isNaN(start) || isNaN(end) || start < min || end > max || start > end) {
          errors.push(t(`validation.invalidRange`, { field, min, max }))
        }
      } else {
        const num = parseInt(part)
        if (isNaN(num) || num < min || num > max) {
          errors.push(t(`validation.outOfRange`, { field, min, max }))
        }
      }
    }
    
    return errors
  }, [t])

  // Validate cron expression
  const validateCron = useCallback((expr: string): CronValidation => {
    const errors: string[] = []
    const warnings: string[] = []
    
    const parsed = parseCronExpression(expr)
    if (!parsed) {
      errors.push(t('validation.invalidFormat'))
      return { isValid: false, errors, warnings }
    }

    // Validate each field
    errors.push(...validateField(parsed.minute, 0, 59, 'minute'))
    errors.push(...validateField(parsed.hour, 0, 23, 'hour'))
    errors.push(...validateField(parsed.day, 1, 31, 'day'))
    errors.push(...validateField(parsed.month, 1, 12, 'month'))
    errors.push(...validateField(parsed.weekday, 0, 7, 'weekday'))

    // Check for potential issues
    if (parsed.day !== '*' && parsed.weekday !== '*') {
      warnings.push(t('validation.dayAndWeekdayWarning'))
    }

    if (expr.includes('0 0 29,30,31')) {
      warnings.push(t('validation.monthEndWarning'))
    }

    return { isValid: errors.length === 0, errors, warnings }
  }, [parseCronExpression, validateField, t])

  // Parse weekday expression into Korean weekday names
  const parseWeekdayExpression = useCallback((weekdayExpr: string): string => {
    const weekdayNames = [
      t('description.sunday'),    // 0
      t('description.monday'),    // 1  
      t('description.tuesday'),   // 2
      t('description.wednesday'), // 3
      t('description.thursday'),  // 4
      t('description.friday'),    // 5
      t('description.saturday')   // 6
    ]

    // Handle single weekday
    if (/^\d$/.test(weekdayExpr)) {
      const day = parseInt(weekdayExpr)
      const adjustedDay = day === 7 ? 0 : day // Convert 7 to 0 (Sunday)
      return weekdayNames[adjustedDay]
    }

    // Handle range (e.g., "1-5", "1-2")
    if (/^\d-\d$/.test(weekdayExpr)) {
      const [start, end] = weekdayExpr.split('-').map(Number)
      const adjustedStart = start === 7 ? 0 : start
      const adjustedEnd = end === 7 ? 0 : end
      
      // Special cases for common patterns
      if (start === 1 && end === 5) {
        return t('description.weekdays') // 평일
      }

      // Generate range description
      const startName = weekdayNames[adjustedStart]
      const endName = weekdayNames[adjustedEnd]
      
      // Extract day part from names (월요일 -> 월, 화요일 -> 화)
      const startDay = startName.charAt(0)
      const endDay = endName.charAt(0)
      
      return `${startDay}-${endDay}요일`
    }

    // Handle comma-separated values (e.g., "1,3,5")
    if (weekdayExpr.includes(',')) {
      const days = weekdayExpr.split(',').map(day => {
        const dayNum = parseInt(day.trim())
        const adjustedDay = dayNum === 7 ? 0 : dayNum
        return weekdayNames[adjustedDay]
      })
      
      if (days.length === 2) {
        const day1 = days[0].charAt(0)
        const day2 = days[1].charAt(0)
        return `${day1}・${day2}요일`
      } else if (days.length === 3) {
        const day1 = days[0].charAt(0)
        const day2 = days[1].charAt(0)
        const day3 = days[2].charAt(0)
        return `${day1}・${day2}・${day3}요일`
      } else {
        return days.map(day => day.charAt(0)).join('・') + '요일'
      }
    }

    // Fallback
    return t('description.weekday', { weekday: weekdayExpr })
  }, [t])

  // Generate human-readable description
  const generateDescription = useCallback((expr: string): string => {
    const parsed = parseCronExpression(expr)
    if (!parsed) return t('description.invalid')

    // Simple pattern matching for common expressions
    if (expr === '0 0 * * *') return t('description.patterns.daily')
    if (expr === '0 0 * * 0') return t('description.patterns.weekly')
    if (expr === '0 0 1 * *') return t('description.patterns.monthly')
    if (expr === '0 9 * * 1-5') return t('description.patterns.weekdayMorning')
    if (expr.startsWith('*/')) return t('description.patterns.interval', { minutes: expr.split('/')[1] })

    // Build more natural description
    let scheduleDesc = ''
    let timeDesc = ''
    
    // Day/weekday part first (Korean natural order)
    if (parsed.day !== '*' && parsed.weekday !== '*') {
      scheduleDesc = t('description.dayAndWeekday')
    } else if (parsed.day !== '*') {
      if (parsed.day === '1') {
        scheduleDesc = t('description.monthlyFirst')
      } else {
        scheduleDesc = t('description.monthly', { day: parsed.day })
      }
    } else if (parsed.weekday !== '*') {
      scheduleDesc = parseWeekdayExpression(parsed.weekday)
    } else {
      scheduleDesc = t('description.daily')
    }

    // Time part
    if (parsed.hour === '*' && parsed.minute === '*') {
      timeDesc = t('description.everyMinute')
    } else if (parsed.hour === '*') {
      if (parsed.minute.includes('/')) {
        const step = parsed.minute.split('/')[1]
        timeDesc = t('description.everyNMinutes', { n: step })
      } else if (parsed.minute === '0') {
        timeDesc = t('description.everyHourStart')
      } else {
        timeDesc = t('description.everyHourAtMinute', { minute: parsed.minute })
      }
    } else if (parsed.minute === '*') {
      if (parsed.hour.includes('/')) {
        const step = parsed.hour.split('/')[1]
        timeDesc = t('description.everyNHours', { n: step })
      } else {
        timeDesc = t('description.everyMinuteInHour', { hour: parsed.hour })
      }
    } else {
      // Specific time
      const hour = parseInt(parsed.hour)
      const minute = parseInt(parsed.minute)
      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      timeDesc = t('description.specificTime', { time: timeStr })
    }

    // Month part
    let monthDesc = ''
    if (parsed.month !== '*') {
      if (parsed.month === '1') {
        monthDesc = t('description.january')
      } else {
        monthDesc = t('description.month', { month: parsed.month })
      }
    }

    // Combine parts in Korean natural order: [schedule] [time] [month]
    const parts = [scheduleDesc, timeDesc, monthDesc].filter(Boolean)
    return parts.join(' ')
  }, [parseCronExpression, t])

  // Calculate next executions (simplified)
  const calculateNextExecutions = useCallback((expr: string, count: number = 5): NextExecution[] => {
    const executions: NextExecution[] = []
    const now = new Date()
    
    // This is a simplified calculation for demo purposes
    // In a real implementation, you'd use a proper cron parser library
    
    if (expr === '0 9 * * 1-5') {
      // Weekday 9 AM
      const current = new Date(now)
      current.setHours(9, 0, 0, 0)
      
      for (let i = 0; i < count; i++) {
        // Find next weekday
        while (current.getDay() === 0 || current.getDay() === 6) {
          current.setDate(current.getDate() + 1)
        }
        
        if (current <= now) {
          current.setDate(current.getDate() + 1)
          continue
        }
        
        executions.push({
          date: new Date(current),
          humanReadable: current.toLocaleString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            weekday: 'long'
          })
        })
        
        current.setDate(current.getDate() + 1)
      }
    } else if (expr === '0 0 * * *') {
      // Daily midnight
      const current = new Date(now)
      current.setHours(0, 0, 0, 0)
      current.setDate(current.getDate() + 1)
      
      for (let i = 0; i < count; i++) {
        executions.push({
          date: new Date(current),
          humanReadable: current.toLocaleString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        })
        current.setDate(current.getDate() + 1)
      }
    } else {
      // Generic approximation
      const current = new Date(now)
      current.setMinutes(current.getMinutes() + 1)
      
      for (let i = 0; i < count; i++) {
        executions.push({
          date: new Date(current),
          humanReadable: current.toLocaleString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        })
        current.setHours(current.getHours() + 1)
      }
    }
    
    return executions
  }, [])

  // Update validation and description when expression changes
  useEffect(() => {
    const validation = validateCron(cronExpression)
    setValidation(validation)
    
    if (validation.isValid) {
      setDescription(generateDescription(cronExpression))
      setNextExecutions(calculateNextExecutions(cronExpression))
    } else {
      setDescription('')
      setNextExecutions([])
    }
  }, [cronExpression, validateCron, generateDescription, calculateNextExecutions])

  // Copy to clipboard
  const copyToClipboard = useCallback(async (text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }
      
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }, [])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
          {t('title')}
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          {t('descriptionText')}
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Input Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
            <div className="flex items-center space-x-2">
              <Settings className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('input.title')}
              </h2>
            </div>

            {/* Cron Expression Input */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('input.expression')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={cronExpression}
                  onChange={(e) => setCronExpression(e.target.value)}
                  placeholder="0 9 * * 1-5"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 dark:bg-gray-700 dark:text-white font-mono ${
                    validation.isValid
                      ? 'border-gray-300 focus:ring-blue-500 dark:border-gray-600'
                      : 'border-red-300 focus:ring-red-500 dark:border-red-600'
                  }`}
                />
                <button
                  onClick={() => copyToClipboard(cronExpression)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  {isCopied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {t('input.format')}: {t('input.formatDesc')}
              </div>
            </div>

            {/* Validation Status */}
            <div className="space-y-2">
              {validation.isValid ? (
                <div className="flex items-center space-x-2 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">{t('validation.valid')}</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{t('validation.invalid')}</span>
                </div>
              )}
              
              {validation.errors.map((error, index) => (
                <div key={index} className="text-sm text-red-600 dark:text-red-400">
                  • {error}
                </div>
              ))}
              
              {validation.warnings.map((warning, index) => (
                <div key={index} className="text-sm text-yellow-600 dark:text-yellow-400">
                  ⚠ {warning}
                </div>
              ))}
            </div>

            {/* Quick Presets */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('presets.title')}
              </label>
              <div className="grid grid-cols-1 gap-2">
                {presets.slice(0, 5).map((preset) => (
                  <button
                    key={preset.expression}
                    onClick={() => setCronExpression(preset.expression)}
                    className="text-left p-2 text-sm bg-gray-50 dark:bg-gray-700 rounded border hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <div className="font-mono text-blue-600 dark:text-blue-400">
                      {preset.expression}
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 text-xs">
                      {t(`presets.${preset.key}`)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Info className="w-5 h-5 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('result.description')}
              </h2>
            </div>
            {description ? (
              <p className="text-gray-700 dark:text-gray-300">{description}</p>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 italic">
                {t('placeholder')}
              </p>
            )}
          </div>

          {/* Next Executions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Calendar className="w-5 h-5 text-purple-600" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('result.nextExecutions')}
              </h2>
            </div>
            
            {nextExecutions.length > 0 ? (
              <div className="space-y-3">
                {nextExecutions.map((execution, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {execution.humanReadable}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {execution.date.toISOString()}
                      </div>
                    </div>
                    <div className="text-sm text-blue-600 dark:text-blue-400">
                      #{index + 1}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 italic">
                {t('result.noExecutions')}
              </p>
            )}
          </div>

          {/* Cron Format Guide */}
          <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Timer className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-100">
                {t('guide.title')}
              </h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-3">
                  {t('guide.formatTitle')}
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="font-mono bg-white dark:bg-gray-800 p-2 rounded border">
                    {t('guide.formatExample')}
                  </div>
                  <div className="space-y-1 text-blue-700 dark:text-blue-300">
                    <div>• {t('guide.fields.minute')}</div>
                    <div>• {t('guide.fields.hour')}</div>
                    <div>• {t('guide.fields.day')}</div>
                    <div>• {t('guide.fields.month')}</div>
                    <div>• {t('guide.fields.weekday')}</div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-3">
                  {t('guide.specialChars')}
                </h3>
                <div className="space-y-1 text-sm text-blue-700 dark:text-blue-300">
                  <div>• <code>*</code>: {t('guide.chars.asterisk')}</div>
                  <div>• <code>,</code>: {t('guide.chars.comma')}</div>
                  <div>• <code>-</code>: {t('guide.chars.dash')}</div>
                  <div>• <code>/</code>: {t('guide.chars.slash')}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CronTester