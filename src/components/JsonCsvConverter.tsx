'use client'

import React, { useState, useRef, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { 
  FileText, 
  Upload, 
  Download, 
  Copy, 
  Check, 
  Settings, 
  Zap, 
  Database,
  Activity,
  AlertCircle,
  Info,
  Grid3X3,
  Type,
  ChevronUp,
  ChevronDown
} from 'lucide-react'

interface ConversionOptions {
  delimiter: string
  quote: string
  escape: string
  header: boolean
  encoding: string
  nested: 'flatten' | 'preserve'
  arrayHandling: 'join' | 'separate'
}

interface ConversionStats {
  rows: number
  columns: number
  size: string
  processingTime: string
}

const JsonCsvConverter = () => {
  const t = useTranslations('jsonCsvConverter')
  const tc = useTranslations('common')
  const [activeTab, setActiveTab] = useState<'jsonToCsv' | 'csvToJson'>('jsonToCsv')
  const [jsonInput, setJsonInput] = useState('')
  const [csvInput, setCsvInput] = useState('')
  const [result, setResult] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')
  const [stats, setStats] = useState<ConversionStats | null>(null)
  const [isCopied, setIsCopied] = useState(false)
  const [viewMode, setViewMode] = useState<'text' | 'table'>('text')
  const [tableData, setTableData] = useState<any[]>([])
  const [tableHeaders, setTableHeaders] = useState<string[]>([])
  const [isInputCollapsed, setIsInputCollapsed] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(100)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [options, setOptions] = useState<ConversionOptions>({
    delimiter: ',', // 기본값을 쉼표로 설정
    quote: '"',
    escape: '"',
    header: true,
    encoding: 'utf-8',
    nested: 'flatten',
    arrayHandling: 'join'
  })

  // Preset configurations
  const presets = {
    standard: { delimiter: ',', quote: '"', escape: '"', header: true },
    excel: { delimiter: ',', quote: '"', escape: '"', header: true },
    tsv: { delimiter: '\t', quote: '"', escape: '"', header: true },
    pipe: { delimiter: '|', quote: '"', escape: '"', header: true },
    korean: { delimiter: ',', quote: '"', escape: '"', header: true }
  }

  const applyPreset = (presetName: keyof typeof presets) => {
    setOptions(prev => ({ ...prev, ...presets[presetName] }))
  }

  // Memoize paged data for better performance
  const pagedTableData = useMemo(() => {
    const startIdx = (currentPage - 1) * rowsPerPage
    const endIdx = startIdx + rowsPerPage
    return tableData.slice(startIdx, endIdx)
  }, [tableData, currentPage, rowsPerPage])

  const totalPages = useMemo(() => {
    return Math.ceil(tableData.length / rowsPerPage)
  }, [tableData.length, rowsPerPage])

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const validateJson = (jsonStr: string): boolean => {
    try {
      const parsed = JSON.parse(jsonStr)
      // 배열 또는 단일 객체 모두 허용
      return Array.isArray(parsed) || (typeof parsed === 'object' && parsed !== null)
    } catch {
      return false
    }
  }

  // JSON을 배열로 정규화 (단일 객체도 배열로 변환)
  const normalizeJsonToArray = (jsonStr: string): any[] => {
    const parsed = JSON.parse(jsonStr)
    if (Array.isArray(parsed)) {
      return parsed
    }
    // 단일 객체인 경우 배열로 감싸기
    return [parsed]
  }

  const escapeValue = (value: string, delimiter: string, quote: string, escape: string): string => {
    if (value.includes(delimiter) || value.includes(quote) || value.includes('\n')) {
      return quote + value.replace(new RegExp(quote, 'g'), escape + quote) + quote
    }
    return value
  }

  const flattenObject = (obj: any, prefix = ''): Record<string, any> => {
    const flattened: Record<string, any> = {}
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const newKey = prefix ? `${prefix}.${key}` : key
        const value = obj[key]
        
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
          Object.assign(flattened, flattenObject(value, newKey))
        } else if (Array.isArray(value)) {
          if (options.arrayHandling === 'join') {
            flattened[newKey] = value.join(';')
          } else {
            value.forEach((item, index) => {
              if (typeof item === 'object') {
                Object.assign(flattened, flattenObject(item, `${newKey}[${index}]`))
              } else {
                flattened[`${newKey}[${index}]`] = item
              }
            })
          }
        } else {
          flattened[newKey] = value
        }
      }
    }
    
    return flattened
  }

  const jsonToCsv = useCallback((jsonData: any[]): string => {
    if (!Array.isArray(jsonData) || jsonData.length === 0) {
      throw new Error(t('errors.emptyArray'))
    }

    const processedData = options.nested === 'flatten' 
      ? jsonData.map(item => flattenObject(item))
      : jsonData

    // Get all unique keys
    const allKeys = Array.from(new Set(
      processedData.flatMap(obj => Object.keys(obj))
    ))

    let csv = ''
    
    // Add header if enabled
    if (options.header) {
      csv += allKeys.map(key => 
        escapeValue(key, options.delimiter, options.quote, options.escape)
      ).join(options.delimiter) + '\n'
    }

    // Add data rows
    processedData.forEach(obj => {
      const row = allKeys.map(key => {
        const value = obj[key]
        const stringValue = value !== undefined && value !== null ? String(value) : ''
        return escapeValue(stringValue, options.delimiter, options.quote, options.escape)
      })
      csv += row.join(options.delimiter) + '\n'
    })

    return csv
  }, [options, t])

  const csvToJson = useCallback((csvData: string): any[] => {
    const lines = csvData.trim().split('\n')
    if (lines.length === 0) {
      throw new Error(t('errors.invalidCsv'))
    }

    const parseRow = (row: string): string[] => {
      // Handle tab delimiter specifically
      if (options.delimiter === '\t') {
        return row.split('\t').map(cell => cell.trim())
      }

      const result: string[] = []
      let current = ''
      let inQuotes = false
      let i = 0

      while (i < row.length) {
        const char = row[i]
        const nextChar = row[i + 1]

        if (char === options.quote) {
          if (inQuotes && nextChar === options.quote) {
            current += char
            i += 2
            continue
          }
          inQuotes = !inQuotes
        } else if (char === options.delimiter && !inQuotes) {
          result.push(current.trim())
          current = ''
        } else {
          current += char
        }
        i++
      }
      
      result.push(current.trim())
      return result
    }

    const headers = options.header ? parseRow(lines[0]) : []
    const dataLines = options.header ? lines.slice(1) : lines
    
    return dataLines.filter(line => line.trim()).map((line, index) => {
      const values = parseRow(line)
      const obj: Record<string, any> = {}
      
      values.forEach((value, i) => {
        const key = options.header ? (headers[i] || `column_${i}`) : `column_${i}`
        // Try to parse numbers (but preserve empty strings)
        if (value === '') {
          obj[key] = ''
        } else {
          const numValue = Number(value)
          obj[key] = !isNaN(numValue) && !isNaN(parseFloat(value)) ? numValue : value
        }
      })
      
      return obj
    })
  }, [options, t])

  const processConversion = useCallback(async () => {
    if (isProcessing) return
    
    setIsProcessing(true)
    setError('')
    setStats(null)
    
    const startTime = performance.now()
    
    try {
      let convertedData: string
      let inputData: string
      
      if (activeTab === 'jsonToCsv') {
        inputData = jsonInput.trim()
        if (!inputData) {
          throw new Error(t('validation.emptyData'))
        }
        
        if (!validateJson(inputData)) {
          throw new Error(t('errors.invalidJson'))
        }

        // 단일 객체도 배열로 변환하여 처리
        const jsonData = normalizeJsonToArray(inputData)

        convertedData = jsonToCsv(jsonData)
        
        // Calculate stats
        const rows = jsonData.length
        const columns = jsonData.length > 0 ? Object.keys(options.nested === 'flatten' ? flattenObject(jsonData[0]) : jsonData[0]).length : 0
        const size = formatFileSize(new Blob([convertedData]).size)
        const processingTime = `${(performance.now() - startTime).toFixed(1)}ms`
        
        setStats({ rows, columns, size, processingTime })
      } else {
        inputData = csvInput.trim()
        if (!inputData) {
          throw new Error(t('validation.emptyData'))
        }
        
        const jsonArray = csvToJson(inputData)
        convertedData = JSON.stringify(jsonArray, null, 2)
        
        // Calculate stats
        const rows = jsonArray.length
        const columns = jsonArray.length > 0 ? Object.keys(jsonArray[0]).length : 0
        const size = formatFileSize(new Blob([convertedData]).size)
        const processingTime = `${(performance.now() - startTime).toFixed(1)}ms`
        
        setStats({ rows, columns, size, processingTime })
      }
      
      setResult(convertedData)
      
      // CSV 결과인 경우 테이블 데이터도 설정
      if (activeTab === 'jsonToCsv') {
        try {
          const lines = convertedData.trim().split('\n')
          if (lines.length > 0) {
            // CSV 파싱 함수 재사용 (csvToJson과 동일한 로직)
            const parseRow = (row: string): string[] => {
              // Handle tab delimiter specifically
              if (options.delimiter === '\t') {
                return row.split('\t').map(cell => cell.trim())
              }

              const result: string[] = []
              let current = ''
              let inQuotes = false
              let i = 0

              while (i < row.length) {
                const char = row[i]
                const nextChar = row[i + 1]

                if (char === options.quote) {
                  if (inQuotes && nextChar === options.quote) {
                    current += char
                    i += 2
                    continue
                  }
                  inQuotes = !inQuotes
                } else if (char === options.delimiter && !inQuotes) {
                  result.push(current.trim())
                  current = ''
                } else {
                  current += char
                }
                i++
              }
              
              result.push(current.trim())
              return result
            }

            const headers = parseRow(lines[0])
            const rows = lines.slice(1).filter(line => line.trim()).map(line => {
              const values = parseRow(line)
              const row: any = {}
              headers.forEach((header, index) => {
                row[header] = values[index] || ''
              })
              return row
            })
            
            setTableHeaders(headers)
            setTableData(rows)
            setCurrentPage(1) // 새 데이터 로드 시 첫 페이지로 리셋
            
            // 대용량 데이터일 때 자동으로 테이블 뷰로 전환
            if (rows.length > 1000) {
              setViewMode('table')
            }
            
            console.log('Table data set:', { headers, rowCount: rows.length }) // 디버깅용
          }
        } catch (err) {
          console.error('Failed to parse CSV for table view:', err)
          setTableData([])
          setTableHeaders([])
        }
      } else {
        // JSON 결과인 경우 테이블 데이터 리셋
        setTableData([])
        setTableHeaders([])
        setViewMode('text')
      }
    } catch (err: any) {
      setError(err.message || t('errors.processingError'))
    } finally {
      setIsProcessing(false)
    }
  }, [activeTab, jsonInput, csvInput, jsonToCsv, csvToJson, options, t])

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Check file size (max 100MB)
    const maxSize = 100 * 1024 * 1024
    if (file.size > maxSize) {
      setError(t('errors.fileTooLarge', { size: '100' }))
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      if (activeTab === 'jsonToCsv') {
        setJsonInput(content)
      } else {
        setCsvInput(content)
      }
    }
    reader.readAsText(file)
  }, [activeTab, t])

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(result)
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea')
        textArea.value = result
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
      }
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleDownload = () => {
    if (!result) return
    
    const blob = new Blob([result], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = activeTab === 'jsonToCsv' ? 'converted.csv' : 'converted.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('description')}
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex mb-6">
        <div className="inline-flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('jsonToCsv')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'jsonToCsv'
                ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            {t('tabs.jsonToCsv')}
          </button>
          <button
            onClick={() => setActiveTab('csvToJson')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'csvToJson'
                ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            {t('tabs.csvToJson')}
          </button>
        </div>
      </div>

      {/* 상하 구조 고정 레이아웃 */}
      <div className="space-y-8">
        {/* 입력 섹션 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* 입력 영역 */}
            <div>
              <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">
                {activeTab === 'jsonToCsv' ? t('input.jsonInput') : t('input.csvInput')}
              </h2>
              
              {/* File Upload */}
              <div className="mb-6">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={activeTab === 'jsonToCsv' ? '.json,.txt' : '.csv,.txt'}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-purple-400 dark:hover:border-purple-500 transition-colors"
                >
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 dark:text-gray-400">{t('input.dragDrop')}</p>
                </button>
              </div>

              {/* Text Input */}
              <div>
                <textarea
                  value={activeTab === 'jsonToCsv' ? jsonInput : csvInput}
                  onChange={(e) => {
                    if (activeTab === 'jsonToCsv') {
                      setJsonInput(e.target.value)
                    } else {
                      setCsvInput(e.target.value)
                    }
                  }}
                  placeholder={activeTab === 'jsonToCsv' ? t('input.pasteJson') : t('input.pasteCsv')}
                  className="w-full h-64 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white dark:bg-gray-700 font-mono text-sm"
                />
              </div>

              {/* Convert Button */}
              <button
                onClick={processConversion}
                disabled={isProcessing || (!jsonInput.trim() && !csvInput.trim())}
                className="w-full mt-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                {isProcessing ? (
                  <>
                    <Activity className="w-5 h-5 animate-spin" />
                    <span>{tc('loading')}</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    <span>{tc('convert')}</span>
                  </>
                )}
              </button>
            </div>

            {/* 옵션 영역 */}
            <div>
              <h3 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                {t('options.title')}
              </h3>

              {/* Presets */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('presets.title')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.keys(presets).map((preset) => (
                    <button
                      key={preset}
                      onClick={() => applyPreset(preset as keyof typeof presets)}
                      className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md transition-colors"
                    >
                      {t(`presets.${preset}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Delimiter Options */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('options.delimiter')}
                  </label>
                  <select
                    value={options.delimiter}
                    onChange={(e) => setOptions(prev => ({ ...prev, delimiter: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white"
                  >
                    <option value=",">Comma (,)</option>
                    <option value="\t">Tab (\t)</option>
                    <option value="|">Pipe (|)</option>
                    <option value=";">Semicolon (;)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('options.encoding')}
                  </label>
                  <select
                    value={options.encoding}
                    onChange={(e) => setOptions(prev => ({ ...prev, encoding: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white"
                  >
                    <option value="utf-8">UTF-8</option>
                    <option value="euc-kr">EUC-KR</option>
                  </select>
                </div>
              </div>

              {/* Additional Options */}
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={options.header}
                    onChange={(e) => setOptions(prev => ({ ...prev, header: e.target.checked }))}
                    className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{t('options.header')}</span>
                </label>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('options.nested')}
                  </label>
                  <select
                    value={options.nested}
                    onChange={(e) => setOptions(prev => ({ ...prev, nested: e.target.value as 'flatten' | 'preserve' }))}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white"
                  >
                    <option value="flatten">{t('options.flatten')}</option>
                    <option value="preserve">{t('options.preserve')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('options.arrayHandling')}
                  </label>
                  <select
                    value={options.arrayHandling}
                    onChange={(e) => setOptions(prev => ({ ...prev, arrayHandling: e.target.value as 'join' | 'separate' }))}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white"
                  >
                    <option value="join">{t('options.join')}</option>
                    <option value="separate">{t('options.separate')}</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">{t('result.title')}</h2>
            
            {/* View Mode Toggle */}
            {activeTab === 'jsonToCsv' && result && tableHeaders.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('result.viewMode')}:</span>
                <div className="inline-flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('text')}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors flex items-center space-x-1 ${
                      viewMode === 'text'
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    <Type className="w-3 h-3" />
                    <span>{t('result.textView')}</span>
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors flex items-center space-x-1 ${
                      viewMode === 'table'
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    <Grid3X3 className="w-3 h-3" />
                    <span>{t('result.tableView')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
                <span className="text-red-800 dark:text-red-200 text-sm">{error}</span>
              </div>
            </div>
          )}

          {stats && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg">
              <div className="flex items-center mb-2">
                <Info className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" />
                <span className="text-green-800 dark:text-green-200 font-medium">{t('result.stats')}</span>
              </div>
              <div className="grid grid-cols-4 gap-4 text-sm text-green-700 dark:text-green-300">
                <div>{t('result.rows')}: {stats.rows}</div>
                <div>{t('result.columns')}: {stats.columns}</div>
                <div>{t('result.size')}: {stats.size}</div>
                <div>{t('result.processingTime')}: {stats.processingTime}</div>
              </div>
            </div>
          )}

          {result ? (
            <>
              <div className="mb-4">
                {viewMode === 'table' && activeTab === 'jsonToCsv' && tableData.length > 0 ? (
                  <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                    {/* 페이지네이션 컨트롤 */}
                    {tableData.length > rowsPerPage && (
                      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-700 dark:text-gray-300">페이지당 행 수:</span>
                          <select
                            value={rowsPerPage}
                            onChange={(e) => {
                              setRowsPerPage(Number(e.target.value))
                              setCurrentPage(1)
                            }}
                            className="px-2 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded"
                          >
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                            <option value={500}>500</option>
                            <option value={1000}>1000</option>
                          </select>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setCurrentPage(1)}
                            disabled={currentPage === 1}
                            className="px-2 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50"
                            title="첫 페이지"
                          >
                            &#171;
                          </button>
                          <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50"
                          >
                            이전
                          </button>
                          <span className="text-sm text-gray-700 dark:text-gray-300 min-w-[80px] text-center">
                            {currentPage} / {totalPages}
                          </span>
                          <button
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage >= totalPages}
                            className="px-3 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50"
                          >
                            다음
                          </button>
                          <button
                            onClick={() => setCurrentPage(totalPages)}
                            disabled={currentPage >= totalPages}
                            className="px-2 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50"
                            title="마지막 페이지"
                          >
                            &#187;
                          </button>
                        </div>
                      </div>
                    )}
                    
                    <div className="overflow-x-auto" style={{ maxHeight: '60vh' }}>
                      <table className="w-full text-sm border-collapse table-fixed">
                        <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                          <tr>
                            {tableHeaders.map((header, index) => (
                              <th
                                key={index}
                                className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white border-r border-b border-gray-200 dark:border-gray-600 last:border-r-0 bg-gray-50 dark:bg-gray-700"
                                style={{
                                  minWidth: '120px',
                                  maxWidth: '300px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                                title={header}
                              >
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                          {pagedTableData.map((row, rowIndex) => (
                            <tr
                              key={`row-${(currentPage - 1) * rowsPerPage + rowIndex}`}
                              className={`${rowIndex % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-750'} hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors`}
                            >
                              {tableHeaders.map((header, colIndex) => {
                                const cellValue = row[header] !== undefined && row[header] !== null ? String(row[header]) : '';
                                return (
                                  <td
                                    key={`cell-${colIndex}`}
                                    className="px-4 py-2 text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-600 last:border-r-0"
                                    style={{
                                      maxWidth: '300px',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                    }}
                                    title={cellValue.length > 50 ? cellValue : undefined}
                                  >
                                    {cellValue}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 border-t border-gray-200 dark:border-gray-600 text-sm text-blue-800 dark:text-blue-200 flex justify-between items-center">
                      <span>
                        {tableData.length > rowsPerPage ? 
                          `${(currentPage - 1) * rowsPerPage + 1}-${Math.min(currentPage * rowsPerPage, tableData.length)} / ${tableData.length} 행 표시` :
                          `총 ${tableData.length}개 행`
                        }
                      </span>
                      <div className="flex space-x-2">
                        <button
                          onClick={handleCopy}
                          className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs"
                        >
                          {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>{isCopied ? tc('copied') : t('result.copy')}</span>
                        </button>
                        <button
                          onClick={handleDownload}
                          className="flex items-center space-x-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs"
                        >
                          <Download className="w-3 h-3" />
                          <span>{t('result.download')}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    {/* 대용량 데이터 경고 */}
                    {result.length > 100000 && (
                      <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                        <div className="flex items-center">
                          <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mr-2" />
                          <span className="text-yellow-800 dark:text-yellow-200 text-sm">
                            {t('validation.largeFile', { size: Math.round(result.length / 1024) })} - 테이블 보기를 권장합니다
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {/* 텍스트 영역 최적화 */}
                    <textarea
                      value={result.length > 500000 ? result.substring(0, 500000) + '\n\n... (내용이 잘렸습니다. 다운로드하여 전체 내용을 확인하세요)' : result}
                      readOnly
                      className="w-full h-96 px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white font-mono text-sm"
                      style={{
                        whiteSpace: 'pre',
                        overflowWrap: 'normal',
                        wordBreak: 'normal'
                      }}
                    />
                    
                    {/* 잘린 내용 알림 */}
                    {result.length > 500000 && (
                      <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded text-sm text-blue-800 dark:text-blue-200">
                        💡 성능을 위해 처음 500KB만 표시됩니다. 전체 내용은 다운로드하거나 테이블 보기를 사용하세요.
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {viewMode !== 'table' && (
                <div className="flex space-x-3">
                  <button
                    onClick={handleCopy}
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>{tc('copied')}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>{t('result.copy')}</span>
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={handleDownload}
                    className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>{t('result.download')}</span>
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-96 text-gray-400 dark:text-gray-500">
              <FileText className="w-16 h-16 mb-4" />
              <p>{t('placeholder')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Features Section */}
      <div className="mt-12 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
        <h2 className="text-2xl font-semibold mb-8 text-gray-900 dark:text-white text-center">{t('features.title')}</h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="bg-purple-100 dark:bg-purple-900 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Zap className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('features.performance.title')}</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-3">{t('features.performance.description')}</p>
            <ul className="text-sm text-gray-500 dark:text-gray-500 space-y-1">
              {[0, 1, 2].map((index) => (
                <li key={index}>• {t(`features.performance.details.${index}`)}</li>
              ))}
            </ul>
          </div>
          
          <div className="text-center">
            <div className="bg-blue-100 dark:bg-blue-900 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Settings className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('features.developer.title')}</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-3">{t('features.developer.description')}</p>
            <ul className="text-sm text-gray-500 dark:text-gray-500 space-y-1">
              {[0, 1, 2].map((index) => (
                <li key={index}>• {t(`features.developer.details.${index}`)}</li>
              ))}
            </ul>
          </div>
          
          <div className="text-center">
            <div className="bg-green-100 dark:bg-green-900 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <FileText className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('features.utility.title')}</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-3">{t('features.utility.description')}</p>
            <ul className="text-sm text-gray-500 dark:text-gray-500 space-y-1">
              {[0, 1, 2].map((index) => (
                <li key={index}>• {t(`features.utility.details.${index}`)}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Usage Guide */}
      <div className="mt-12 bg-gray-50 dark:bg-gray-900 rounded-2xl p-8">
        <h2 className="text-2xl font-semibold mb-8 text-gray-900 dark:text-white text-center">{t('guide.title')}</h2>
        
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('guide.jsonToCsvTitle')}</h3>
            <ol className="space-y-2 text-gray-600 dark:text-gray-400">
              {[0, 1, 2, 3].map((index) => (
                <li key={index} className="flex items-start">
                  <span className="bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-3 mt-0.5">
                    {index + 1}
                  </span>
                  {t(`guide.jsonToCsv.${index}`)}
                </li>
              ))}
            </ol>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('guide.csvToJsonTitle')}</h3>
            <ol className="space-y-2 text-gray-600 dark:text-gray-400">
              {[0, 1, 2, 3].map((index) => (
                <li key={index} className="flex items-start">
                  <span className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-3 mt-0.5">
                    {index + 1}
                  </span>
                  {t(`guide.csvToJson.${index}`)}
                </li>
              ))}
            </ol>
          </div>
        </div>
        
        <div className="mt-8 p-4 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
          <h4 className="font-semibold text-amber-900 dark:text-amber-200 mb-3">{t('guide.tipsTitle')}</h4>
          <ul className="space-y-1 text-sm text-amber-800 dark:text-amber-300">
            {[0, 1, 2, 3].map((index) => (
              <li key={index}>• {t(`guide.tips.${index}`)}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default JsonCsvConverter