'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, Replace, Filter, Copy, Download, Upload, RefreshCw, Zap, Eye, EyeOff, AlertCircle, CheckCircle, Share2, Save, Trash2, FileText, Code, Mail, Globe, Hash, Calendar, Lightbulb, Target, BookOpen, Wand2, HelpCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import CalculationHistory from './CalculationHistory'
import { useCalculationHistory } from '@/hooks/useCalculationHistory'

interface RegexResult {
  operation: 'grep' | 'replace' | 'extract'
  pattern: string
  flags: string
  inputText: string
  outputText: string
  matches: RegexMatch[]
  timestamp: number
}

interface RegexMatch {
  match: string
  groups: string[]
  index: number
  line: number
}

interface PresetPattern {
  name: string
  pattern: string
  description: string
  example: string
  category: 'common' | 'email' | 'web' | 'numbers' | 'dates' | 'code' | 'hash'
}

export default function RegexExtractor() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('regexExtractor')
  const tCommon = useTranslations('common')
  
  const [operation, setOperation] = useState<'grep' | 'replace' | 'extract'>('grep')
  const [pattern, setPattern] = useState('')
  const [flags, setFlags] = useState('g')
  const [replacement, setReplacement] = useState('')
  const [inputText, setInputText] = useState('')
  const [outputText, setOutputText] = useState('')
  const [matches, setMatches] = useState<RegexMatch[]>([])
  const [isValid, setIsValid] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [showPresets, setShowPresets] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('common')
  const [isProcessing, setIsProcessing] = useState(false)
  const [showShareButton, setShowShareButton] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [showPatternBuilder, setShowPatternBuilder] = useState(false)
  const [smartMode, setSmartMode] = useState('')
  const [userDescription, setUserDescription] = useState('')

  const { histories, saveCalculation, removeHistory, clearHistories, loadFromHistory } = useCalculationHistory('regex')

  // 미리 정의된 정규식 패턴들
  const presetPatterns: PresetPattern[] = [
    // 일반적인 패턴
    { name: 'emails', pattern: '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b', description: '이메일 주소', example: 'test@example.com', category: 'email' },
    { name: 'urls', pattern: 'https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)', description: 'URL 주소', example: 'https://example.com', category: 'web' },
    { name: 'phoneNumbers', pattern: '\\b(?:\\+?82-?)?(?:0?10|0?11|0?16|0?17|0?18|0?19)-?\\d{3,4}-?\\d{4}\\b', description: '한국 휴대폰 번호', example: '010-1234-5678', category: 'common' },
    { name: 'ipAddresses', pattern: '\\b(?:[0-9]{1,3}\\.){3}[0-9]{1,3}\\b', description: 'IP 주소', example: '192.168.1.1', category: 'web' },
    
    // 숫자 패턴
    { name: 'integers', pattern: '-?\\d+', description: '정수', example: '123, -456', category: 'numbers' },
    { name: 'floats', pattern: '-?\\d+\\.\\d+', description: '소수', example: '123.45', category: 'numbers' },
    { name: 'currency', pattern: '\\$?\\d{1,3}(?:,\\d{3})*(?:\\.\\d{2})?', description: '통화 형식', example: '$1,234.56', category: 'numbers' },
    { name: 'percentages', pattern: '\\d+(?:\\.\\d+)?%', description: '퍼센트', example: '99.5%', category: 'numbers' },
    
    // 날짜 패턴
    { name: 'datesKorean', pattern: '\\d{4}[-.]\\d{1,2}[-.]\\d{1,2}', description: '한국 날짜 형식', example: '2024-01-01', category: 'dates' },
    { name: 'datesUS', pattern: '\\d{1,2}/\\d{1,2}/\\d{4}', description: '미국 날짜 형식', example: '01/01/2024', category: 'dates' },
    { name: 'times', pattern: '\\d{1,2}:\\d{2}(?::\\d{2})?(?:\\s?[AP]M)?', description: '시간', example: '14:30:00, 2:30 PM', category: 'dates' },
    
    // 코드 관련
    { name: 'hexColors', pattern: '#[a-fA-F0-9]{6}|#[a-fA-F0-9]{3}', description: 'Hex 색상 코드', example: '#FF5733, #f57', category: 'code' },
    { name: 'cssClasses', pattern: '\\.[a-zA-Z][a-zA-Z0-9_-]*', description: 'CSS 클래스', example: '.btn-primary', category: 'code' },
    { name: 'jsVariables', pattern: '\\b[a-zA-Z_$][a-zA-Z0-9_$]*\\b', description: 'JavaScript 변수명', example: 'myVariable', category: 'code' },
    { name: 'htmlTags', pattern: '<[^>]+>', description: 'HTML 태그', example: '<div class="container">', category: 'code' },
    
    // 해시 및 ID
    { name: 'uuids', pattern: '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', description: 'UUID', example: '123e4567-e89b-12d3-a456-426614174000', category: 'hash' },
    { name: 'md5', pattern: '[a-f0-9]{32}', description: 'MD5 해시', example: '5d41402abc4b2a76b9719d911017c592', category: 'hash' },
    { name: 'base64', pattern: '(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?', description: 'Base64 인코딩', example: 'SGVsbG8gV29ybGQ=', category: 'hash' }
  ]

  // 스마트 모드 옵션들
  const smartModes = [
    {
      id: 'find-lines-containing',
      title: t('smartModes.findLinesContaining.title'),
      description: t('smartModes.findLinesContaining.description'),
      placeholder: t('smartModes.findLinesContaining.placeholder'),
      generatePattern: (input: string) => `.*${input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*`,
      operation: 'grep' as const
    },
    {
      id: 'extract-between',
      title: t('smartModes.extractBetween.title'),
      description: t('smartModes.extractBetween.description'),
      placeholder: t('smartModes.extractBetween.placeholder'),
      generatePattern: (input: string) => {
        const parts = input.trim().split(/\s+/)
        if (parts.length >= 2) {
          const start = parts[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          const end = parts[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          return `${start}([^${end}]*)${end}`
        }
        return `\\(([^)]*)\\)` // 기본값: 괄호 안 내용
      },
      operation: 'extract' as const
    },
    {
      id: 'remove-duplicates',
      title: t('smartModes.removeDuplicates.title'),
      description: t('smartModes.removeDuplicates.description'),
      placeholder: t('smartModes.removeDuplicates.placeholder'),
      generatePattern: () => '', // 특별 처리
      operation: 'grep' as const,
      special: true,
      noInput: true
    },
    {
      id: 'extract-numbers',
      title: t('smartModes.extractNumbers.title'),
      description: t('smartModes.extractNumbers.description'),
      placeholder: t('smartModes.extractNumbers.placeholder'),
      generatePattern: () => '\\d+',
      operation: 'extract' as const,
      noInput: true
    },
    {
      id: 'replace-spaces',
      title: t('smartModes.replaceSpaces.title'),
      description: t('smartModes.replaceSpaces.description'),
      placeholder: t('smartModes.replaceSpaces.placeholder'),
      generatePattern: () => '\\s+',
      operation: 'replace' as const
    },
    {
      id: 'capitalize-words',
      title: t('smartModes.capitalizeWords.title'),
      description: t('smartModes.capitalizeWords.description'),
      placeholder: t('smartModes.capitalizeWords.placeholder'),
      generatePattern: () => '\\b(\\w)',
      operation: 'replace' as const,
      defaultReplacement: (match: string) => match.toUpperCase(),
      noInput: true
    },
    {
      id: 'extract-urls',
      title: t('smartModes.extractUrls.title'),
      description: t('smartModes.extractUrls.description'),
      placeholder: t('smartModes.extractUrls.placeholder'),
      generatePattern: () => 'https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)',
      operation: 'extract' as const,
      noInput: true
    },
    {
      id: 'extract-emails',
      title: t('smartModes.extractEmails.title'),
      description: t('smartModes.extractEmails.description'),
      placeholder: t('smartModes.extractEmails.placeholder'),
      generatePattern: () => '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b',
      operation: 'extract' as const,
      noInput: true
    }
  ]

  // 스마트 모드 적용
  const applySmartMode = () => {
    const mode = smartModes.find(m => m.id === smartMode)
    if (!mode) return

    if (mode.special && mode.id === 'remove-duplicates') {
      // 중복 제거 특별 처리
      const lines = inputText.split('\n')
      const uniqueLines = Array.from(new Set(lines))
      setOutputText(uniqueLines.join('\n'))
      setMatches([])
      return
    }

    const generatedPattern = mode.generatePattern(userDescription)
    setPattern(generatedPattern)
    setOperation(mode.operation)
    
    if (mode.operation === 'replace') {
      if (mode.id === 'replace-spaces') {
        setReplacement(userDescription || '_')
      } else if (mode.id === 'capitalize-words') {
        setReplacement('$1'.toUpperCase())
      }
    }

    updateURL({ 
      pattern: encodeURIComponent(generatedPattern), 
      operation: mode.operation,
      ...(mode.operation === 'replace' && { replacement: userDescription || '_' })
    })
  }

  // 패턴 설명 생성
  const explainPattern = (pattern: string) => {
    const explanations: { [key: string]: string } = {
      '\\d': t('explain.digit'),
      '\\w': t('explain.word'),
      '\\s': t('explain.space'),
      '.': t('explain.dot'),
      '*': t('explain.star'),
      '+': t('explain.plus'),
      '?': t('explain.question'),
      '^': t('explain.caret'),
      '$': t('explain.dollar'),
      '\\b': t('explain.boundary'),
      '[0-9]': t('explain.digitRange'),
      '[a-z]': t('explain.lowerRange'),
      '[A-Z]': t('explain.upperRange'),
      '()': t('explain.group'),
      '|': t('explain.or'),
      '\\': t('explain.escape')
    }

    let explanation = pattern
    Object.entries(explanations).forEach(([regex, desc]) => {
      const safeRegex = regex.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      explanation = explanation.replace(new RegExp(safeRegex, 'g'), `[${desc}]`)
    })

    return explanation
  }

  // 정규식 처리 함수
  const processText = useCallback(() => {
    if (!pattern.trim()) {
      setOutputText('')
      setMatches([])
      return
    }

    setIsProcessing(true)
    
    try {
      const regex = new RegExp(pattern, flags)
      setIsValid(true)
      setErrorMessage('')
      
      const lines = inputText.split('\n')
      let results: RegexMatch[] = []
      let output = ''
      
      if (operation === 'grep') {
        // grep: 패턴이 포함된 라인만 추출
        const matchingLines = lines.filter((line, index) => {
          const matches = line.match(regex)
          if (matches) {
            results.push({
              match: line,
              groups: matches.slice(1) || [],
              index: line.indexOf(matches[0]),
              line: index + 1
            })
            return true
          }
          return false
        })
        output = matchingLines.join('\n')
        
      } else if (operation === 'replace') {
        // replace: 패턴을 replacement로 교체
        output = inputText.replace(regex, replacement)
        
        // 매치된 항목들 기록
        let match
        const globalRegex = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g')
        while ((match = globalRegex.exec(inputText)) !== null) {
          const lineNumber = inputText.substring(0, match.index).split('\n').length
          results.push({
            match: match[0],
            groups: match.slice(1) || [],
            index: match.index,
            line: lineNumber
          })
          if (!flags.includes('g')) break
        }
        
      } else if (operation === 'extract') {
        // extract: 패턴과 일치하는 부분만 추출
        const matches = inputText.match(regex) || []
        output = matches.join('\n')
        
        // 상세한 매치 정보
        let match
        const globalRegex = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g')
        while ((match = globalRegex.exec(inputText)) !== null) {
          const lineNumber = inputText.substring(0, match.index).split('\n').length
          results.push({
            match: match[0],
            groups: match.slice(1) || [],
            index: match.index,
            line: lineNumber
          })
          if (!flags.includes('g')) break
        }
      }
      
      setOutputText(output)
      setMatches(results)
      setShowShareButton(true)
      
    } catch (error) {
      setIsValid(false)
      setErrorMessage(error instanceof Error ? error.message : t('error.invalidRegex'))
      setOutputText('')
      setMatches([])
    }
    
    setIsProcessing(false)
  }, [pattern, flags, replacement, inputText, operation])

  // 실시간 처리
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      processText()
    }, 300) // 300ms 디바운스

    return () => clearTimeout(timeoutId)
  }, [processText])

  // URL 파라미터 처리
  useEffect(() => {
    const operationParam = searchParams.get('operation')
    const patternParam = searchParams.get('pattern')
    const flagsParam = searchParams.get('flags')
    const inputParam = searchParams.get('input')

    if (operationParam && ['grep', 'replace', 'extract'].includes(operationParam)) {
      setOperation(operationParam as 'grep' | 'replace' | 'extract')
    }
    if (patternParam) setPattern(decodeURIComponent(patternParam))
    if (flagsParam) setFlags(flagsParam)
    if (inputParam) setInputText(decodeURIComponent(inputParam))
  }, [searchParams])

  // URL 업데이트
  const updateURL = (newParams: Record<string, string>) => {
    const params = new URLSearchParams(searchParams)
    Object.entries(newParams).forEach(([key, value]) => {
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  // 플래그 토글
  const toggleFlag = (flag: string) => {
    const newFlags = flags.includes(flag) 
      ? flags.replace(flag, '') 
      : flags + flag
    setFlags(newFlags)
    updateURL({ flags: newFlags })
  }

  // 프리셋 패턴 적용
  const applyPreset = (preset: PresetPattern) => {
    setPattern(preset.pattern)
    setShowPresets(false)
    updateURL({ pattern: encodeURIComponent(preset.pattern) })
  }

  // 파일 업로드
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        setInputText(content)
        updateURL({ input: encodeURIComponent(content) })
      }
      reader.readAsText(file)
    }
  }

  // 결과 다운로드
  const downloadResult = () => {
    const blob = new Blob([outputText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `regex-${operation}-result.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // 복사 기능
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {
      console.error('복사 실패:', err)
    }
  }

  // 공유 기능
  const handleShare = async () => {
    try {
      const url = window.location.href
      await navigator.clipboard.writeText(url)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {
      console.error('공유 실패:', err)
    }
  }

  // 계산 저장
  const handleSaveCalculation = () => {
    if (!pattern.trim()) return
    
    saveCalculation(
      {
        operation,
        pattern,
        flags,
        replacement: operation === 'replace' ? replacement : '',
        inputLength: inputText.length,
        matchCount: matches.length,
        processedAt: new Date().toISOString()
      },
      {
        operation,
        pattern,
        flags,
        inputText,
        outputText,
        matches,
        timestamp: Date.now()
      }
    )
    
    setShowShareButton(false)
  }

  // 카테고리별 프리셋 필터링
  const filteredPresets = presetPatterns.filter(preset => 
    selectedCategory === 'all' || preset.category === selectedCategory
  )

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'email': return <Mail className="w-4 h-4" />
      case 'web': return <Globe className="w-4 h-4" />
      case 'numbers': return <Hash className="w-4 h-4" />
      case 'dates': return <Calendar className="w-4 h-4" />
      case 'code': return <Code className="w-4 h-4" />
      case 'hash': return <Hash className="w-4 h-4" />
      default: return <FileText className="w-4 h-4" />
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('description')}
          </p>
        </div>
        <CalculationHistory
          histories={histories}
          isLoading={false}
          onLoadHistory={(historyId) => {
            const inputs = loadFromHistory(historyId)
            if (inputs) {
              setOperation(inputs.operation || 'grep')
              setPattern(inputs.pattern || '')
              setFlags(inputs.flags || 'g')
              setReplacement(inputs.replacement || '')
              setInputText(inputs.inputText || '')
            }
          }}
          onRemoveHistory={removeHistory}
          onClearHistories={clearHistories}
          formatResult={(history: any) => {
            if (!history.inputs || !history.result) return t('history.empty')
            const op = history.inputs.operation || 'grep'
            const matchCount = history.inputs.matchCount || 0
            return t('history.format', { operation: op, matches: matchCount })
          }}
        />
      </div>

      {/* 초보자를 위한 스마트 모드 */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-2xl shadow-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Wand2 className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {t('smartMode.title')}
            </h2>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="flex items-center space-x-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              <span className="text-sm">{t('smartMode.guide')}</span>
            </button>
            <button
              onClick={() => setShowPatternBuilder(!showPatternBuilder)}
              className="flex items-center space-x-2 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
            >
              <Target className="w-4 h-4" />
              <span className="text-sm">{t('smartMode.patternBuilder')}</span>
            </button>
          </div>
        </div>

        <p className="text-gray-600 dark:text-gray-300 mb-6">
          {t('smartMode.description')}
        </p>

        {/* 스마트 모드 선택 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          {smartModes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => {
                setSmartMode(mode.id)
                setUserDescription('')
              }}
              className={`p-3 rounded-lg border-2 text-left transition-all ${
                smartMode === mode.id
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:border-green-300'
              }`}
            >
              <div className="font-medium text-gray-900 dark:text-white text-sm">
                {mode.title}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {mode.description}
              </div>
            </button>
          ))}
        </div>

        {/* 사용자 입력 */}
        {smartMode && (
          <div className="flex space-x-2">
            <input
              type="text"
              value={userDescription}
              onChange={(e) => setUserDescription(e.target.value)}
              placeholder={smartModes.find(m => m.id === smartMode)?.placeholder}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              disabled={!!smartModes.find(m => m.id === smartMode)?.noInput}
            />
            <button
              onClick={applySmartMode}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <Lightbulb className="w-4 h-4" />
              <span>{t('smartMode.apply')}</span>
            </button>
          </div>
        )}
      </div>

      {/* 정규식 가이드 */}
      {showGuide && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <BookOpen className="w-5 h-5 mr-2 text-blue-600" />
              {t('guide.regexBasics')}
            </h3>
            <button
              onClick={() => setShowGuide(false)}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <EyeOff className="w-5 h-5" />
            </button>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                {t('guide.basicSymbols')}
              </h4>
              <div className="space-y-2 text-sm">
                {[
                  { symbol: '\\d', key: 'digit' },
                  { symbol: '\\w', key: 'word' },
                  { symbol: '\\s', key: 'space' },
                  { symbol: '.', key: 'dot' },
                  { symbol: '*', key: 'star' },
                  { symbol: '+', key: 'plus' }
                ].map((item) => (
                  <div key={item.key} className="flex justify-between">
                    <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{item.symbol}</code>
                    <span className="text-gray-600 dark:text-gray-400">{t(`guide.symbolDescs.${item.key}`)}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                {t('guide.examples')}
              </h4>
              <div className="space-y-2 text-sm">
                {[
                  { pattern: '\\d{3}', key: 'threeDigits' },
                  { pattern: '[a-z]+', key: 'lowerLetters' },
                  { pattern: '^Hello', key: 'startsWithHello' },
                  { pattern: '.*world$', key: 'endsWithWorld' }
                ].map((item) => (
                  <div key={item.key}>
                    <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{item.pattern}</code>
                    <p className="text-gray-600 dark:text-gray-400">{t(`guide.exampleDescs.${item.key}`)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 패턴 빌더 */}
      {showPatternBuilder && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <Target className="w-5 h-5 mr-2 text-purple-600" />
              {t('patternBuilder.title')}
            </h3>
            <button
              onClick={() => setShowPatternBuilder(false)}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <EyeOff className="w-5 h-5" />
            </button>
          </div>
          
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {t('patternBuilder.description')}
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { symbol: '\\d', key: 'digit' },
              { symbol: '\\w', key: 'word' },
              { symbol: '\\s', key: 'space' },
              { symbol: '.', key: 'dot' },
              { symbol: '*', key: 'star' },
              { symbol: '+', key: 'plus' },
              { symbol: '?', key: 'question' },
              { symbol: '^', key: 'caret' },
              { symbol: '$', key: 'dollar' },
              { symbol: '\\b', key: 'boundary' },
              { symbol: '()', key: 'group' },
              { symbol: '[]', key: 'charSet' }
            ].map((item) => (
              <button
                key={item.symbol}
                onClick={() => setPattern(pattern + item.symbol)}
                className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-center"
              >
                <code className="block font-mono text-sm">{item.symbol}</code>
                <span className="text-xs text-gray-500 dark:text-gray-400">{t(`patternBuilder.symbols.${item.key}`)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        {/* 입력 패널 */}
        <div className="space-y-6">
          {/* 작업 유형 선택 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
              <Zap className="w-5 h-5 mr-2 text-blue-600" />
              {t('operation.title')}
            </h2>
            
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: 'grep', icon: Filter, label: t('operation.grep'), desc: t('operation.grepDesc') },
                { key: 'replace', icon: Replace, label: t('operation.replace'), desc: t('operation.replaceDesc') },
                { key: 'extract', icon: Search, label: t('operation.extract'), desc: t('operation.extractDesc') }
              ].map(({ key, icon: Icon, label, desc }) => (
                <button
                  key={key}
                  onClick={() => {
                    setOperation(key as any)
                    updateURL({ operation: key })
                  }}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    operation === key
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-blue-300'
                  }`}
                >
                  <Icon className="w-6 h-6 mb-2 text-blue-600" />
                  <div className="font-medium text-gray-900 dark:text-white">{label}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 정규식 패턴 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('pattern.title')}
              </h3>
              <button
                onClick={() => setShowPresets(!showPresets)}
                className="flex items-center space-x-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
              >
                <Eye className="w-4 h-4" />
                <span className="text-sm">{t('pattern.presets')}</span>
              </button>
            </div>
            
            <div className="relative">
              <input
                type="text"
                value={pattern}
                onChange={(e) => {
                  setPattern(e.target.value)
                  updateURL({ pattern: encodeURIComponent(e.target.value) })
                }}
                placeholder={t('pattern.placeholder')}
                className={`w-full px-4 py-3 border rounded-lg font-mono text-sm focus:ring-2 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                  isValid 
                    ? 'border-gray-300 dark:border-gray-600 focus:ring-blue-500' 
                    : 'border-red-500 focus:ring-red-500'
                }`}
              />
              {!isValid && (
                <div className="absolute right-3 top-3">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                </div>
              )}
            </div>
            
            {errorMessage && (
              <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                {errorMessage}
              </div>
            )}

            {/* 패턴 설명 */}
            {pattern && isValid && (
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-start space-x-2">
                  <HelpCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                      {t('pattern.explanation')}
                    </div>
                    <div className="text-sm text-blue-700 dark:text-blue-300 font-mono">
                      {explainPattern(pattern)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 플래그 */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('flags.title')}
              </label>
              <div className="flex space-x-2">
                {[
                  { flag: 'g', label: 'Global', desc: t('flags.global') },
                  { flag: 'i', label: 'Ignore Case', desc: t('flags.ignoreCase') },
                  { flag: 'm', label: 'Multiline', desc: t('flags.multiline') },
                  { flag: 's', label: 'Dotall', desc: t('flags.dotall') }
                ].map(({ flag, label, desc }) => (
                  <button
                    key={flag}
                    onClick={() => toggleFlag(flag)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      flags.includes(flag)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    title={desc}
                  >
                    {flag}
                  </button>
                ))}
              </div>
            </div>

            {/* 교체 문자열 (replace 모드일 때만) */}
            {operation === 'replace' && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('replacement.title')}
                </label>
                <input
                  type="text"
                  value={replacement}
                  onChange={(e) => setReplacement(e.target.value)}
                  placeholder={t('replacement.placeholder')}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {t('replacement.help')}
                </div>
              </div>
            )}
          </div>

          {/* 프리셋 패턴 */}
          {showPresets && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('presets.title')}
                </h3>
                <button
                  onClick={() => setShowPresets(false)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <EyeOff className="w-5 h-5" />
                </button>
              </div>

              {/* 카테고리 선택 */}
              <div className="flex flex-wrap gap-2 mb-4">
                {['common', 'email', 'web', 'numbers', 'dates', 'code', 'hash'].map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-sm transition-colors ${
                      selectedCategory === category
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    {getCategoryIcon(category)}
                    <span>{t(`presets.categories.${category}`)}</span>
                  </button>
                ))}
              </div>

              {/* 패턴 목록 */}
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {filteredPresets.map((preset, index) => (
                  <button
                    key={index}
                    onClick={() => applyPreset(preset)}
                    className="w-full text-left p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <div className="font-medium text-gray-900 dark:text-white">
                      {t(`presets.patterns.${preset.name}`)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {t(`presets.descriptions.${preset.name}`)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-500 font-mono mt-1">
                      {preset.example}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 입력 텍스트 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('input.title')}
              </h3>
              <div className="flex space-x-2">
                <label className="flex items-center space-x-2 px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer transition-colors">
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">{t('input.upload')}</span>
                  <input
                    type="file"
                    accept=".txt,.log,.csv,.json,.xml,.html,.js,.ts,.py,.java,.cpp,.c,.h"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={() => {
                    setInputText('')
                    updateURL({ input: '' })
                  }}
                  className="flex items-center space-x-2 px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="text-sm">{tCommon('clear')}</span>
                </button>
              </div>
            </div>
            
            <textarea
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value)
                updateURL({ input: encodeURIComponent(e.target.value) })
              }}
              placeholder={t('input.placeholder')}
              rows={12}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
            />
            
            <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t('input.stats', { 
                lines: inputText.split('\n').length, 
                chars: inputText.length 
              })}
            </div>
          </div>
        </div>

        {/* 결과 패널 */}
        <div className="space-y-6">
          {/* 매치 정보 */}
          {pattern && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  {isValid ? (
                    <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 mr-2 text-red-500" />
                  )}
                  {t('results.matchInfo')}
                </h3>
                {isProcessing && (
                  <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
                )}
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{matches.length}</div>
                  <div className="text-sm text-blue-700 dark:text-blue-300">{t('results.matches')}</div>
                </div>
                <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{outputText.split('\n').filter(line => line.trim()).length}</div>
                  <div className="text-sm text-green-700 dark:text-green-300">{t('results.outputLines')}</div>
                </div>
                <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{outputText.length}</div>
                  <div className="text-sm text-purple-700 dark:text-purple-300">{t('results.outputChars')}</div>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-2xl font-bold text-gray-600">{((matches.length / Math.max(inputText.split('\n').length, 1)) * 100).toFixed(1)}%</div>
                  <div className="text-sm text-gray-700 dark:text-gray-300">{t('results.matchRate')}</div>
                </div>
              </div>

              {/* 매치 상세 정보 (처음 5개만) */}
              {matches.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('results.matchDetails')}
                  </h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {matches.slice(0, 5).map((match, index) => (
                      <div key={index} className="text-xs bg-gray-50 dark:bg-gray-700 p-2 rounded">
                        <div className="font-mono text-gray-900 dark:text-white">"{match.match}"</div>
                        <div className="text-gray-500 dark:text-gray-400">
                          {t('matchDetail.line', { line: match.line })}, {t('matchDetail.index', { index: match.index })}
                          {match.groups.length > 0 && ` | ${t('matchDetail.groups', { groups: match.groups.join(', ') })}`}
                        </div>
                      </div>
                    ))}
                    {matches.length > 5 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        ... {t('results.moreMatches', { count: matches.length - 5 })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 결과 출력 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('results.title')}
              </h3>
              <div className="flex space-x-2">
                {outputText && (
                  <>
                    <button
                      onClick={() => copyToClipboard(outputText)}
                      className="flex items-center space-x-1 px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                      <span className="text-sm">{isCopied ? tCommon('copied') : tCommon('copy')}</span>
                    </button>
                    <button
                      onClick={downloadResult}
                      className="flex items-center space-x-1 px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span className="text-sm">{t('results.download')}</span>
                    </button>
                  </>
                )}
              </div>
            </div>
            
            <textarea
              value={outputText}
              readOnly
              placeholder={t('results.placeholder')}
              rows={15}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg font-mono text-sm bg-gray-50 dark:bg-gray-700 dark:text-white resize-none"
            />
          </div>

          {/* 공유/저장 버튼 */}
          {showShareButton && outputText && (
            <div className="flex space-x-3">
              <button
                onClick={handleShare}
                className="flex-1 inline-flex items-center justify-center space-x-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 transition-colors"
              >
                <Share2 className="w-5 h-5" />
                <span>{t('results.share')}</span>
              </button>
              
              <button
                onClick={handleSaveCalculation}
                className="flex-1 inline-flex items-center justify-center space-x-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 transition-colors"
              >
                <Save className="w-5 h-5" />
                <span>{tCommon('save')}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 사용 가이드 */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-8">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          🔍 {t('guide.title')}
        </h3>
        
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.operationsTitle')}
            </h4>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              <li>• {t('guide.operations.0')}</li>
              <li>• {t('guide.operations.1')}</li>
              <li>• {t('guide.operations.2')}</li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.tipsTitle')}
            </h4>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              <li>• {t('guide.tips.0')}</li>
              <li>• {t('guide.tips.1')}</li>
              <li>• {t('guide.tips.2')}</li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.examplesTitle')}
            </h4>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              <li>• {t('guide.exampleItems.0')}</li>
              <li>• {t('guide.exampleItems.1')}</li>
              <li>• {t('guide.exampleItems.2')}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}