'use client'

import { useState } from 'react'
import { Search, Replace, Filter, Eye, EyeOff, AlertCircle, Trash2, FileText, Code, Mail, Globe, Hash, Calendar, Lightbulb, Target, BookOpen, Wand2, HelpCircle } from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import { useOptionalLanguage } from '@/contexts/LanguageContext'
import '@/lib/i18n/ns/regexExtractor'
import CalculationHistory from './CalculationHistory'
import { useCalculationHistory } from '@/hooks/useCalculationHistory'
import { glassCard, glassInset } from '@/lib/glass'
import { useRegexWorkspace } from '@/hooks/useRegexWorkspace'
import RegexResultPanel from './RegexResultPanel'
import MobileResultLink from './MobileResultLink'
import { regexBetweenPattern, type RegexJob } from '@/utils/regexEngine'

interface PresetPattern {
  name: string
  pattern: string
  description: string
  example: string
  category: 'common' | 'email' | 'web' | 'numbers' | 'dates' | 'code' | 'hash'
}

export default function RegexExtractor() {
  const t = useTranslations('regexExtractor')
  const tCommon = useTranslations('common')
  
  const locale = useOptionalLanguage()?.language ?? 'ko'
  const workspace = useRegexWorkspace(locale)
  const { operation, pattern, flags, replacement, inputText } = workspace.draft
  const isValid = workspace.error !== 'invalidRegex'
  const errorMessage = workspace.error ? t(`execution.errors.${workspace.error}`) : ''
  const setPattern = (value: string) => workspace.edit({ pattern: value })
  const setReplacement = (value: string) => workspace.edit({ replacement: value })
  const setInputText = (value: string) => workspace.edit({ inputText: value })
  const [saved, setSaved] = useState<{ revision: number; id: number; status: 'saved' | 'saveFailed' } | null>(null)
  const [showPresets, setShowPresets] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('common')
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
      generatePattern: regexBetweenPattern,
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

  const applySmartMode = () => {
    const mode = smartModes.find(m => m.id === smartMode)
    if (!mode) return
    workspace.edit({ operation: mode.operation, pattern: mode.generatePattern(userDescription), replacement: mode.id === 'replace-spaces' ? userDescription || '_' : mode.id === 'capitalize-words' ? '' : replacement, transform: mode.id === 'remove-duplicates' ? 'dedupe' : mode.id === 'capitalize-words' ? 'uppercaseMatch' : 'none' })
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

    let explanation = pattern.slice(0, 500)
    Object.entries(explanations).forEach(([regex, desc]) => {
      const safeRegex = regex.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      explanation = explanation.replace(new RegExp(safeRegex, 'g'), `[${desc}]`)
    })

    return explanation
  }

  const toggleFlag = (flag: string) => workspace.edit({ flags: flags.includes(flag) ? flags.replace(flag, '') : flags + flag }, true)
  const applyPreset = (preset: PresetPattern) => { setPattern(preset.pattern); setShowPresets(false) }
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = ''; workspace.upload(file)
  }
  const handleSaveCalculation = () => {
    const snapshot = workspace.currentSnapshot()
    if (!snapshot) return
    const { job, result } = snapshot
    const success = saveCalculation(
      { operation: job.operation, pattern: job.pattern, flags: job.flags, replacement: job.replacement, transform: job.transform, inputLength: job.inputText.length, matchCount: result.matchCount, processedAt: new Date().toISOString() },
      { ...job, outputText: result.outputText, matchCount: result.matchCount, matches: result.details, timestamp: Date.now() },
    )
    setSaved({ revision: snapshot.revision, id: snapshot.id, status: success ? 'saved' : 'saveFailed' })
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
      <div className="flex flex-wrap gap-3 items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-fg">
            {t('title')}
          </h1>
          <p className="text-sm text-muted mt-1">
            {t('description')}
          </p>
        </div>
        <CalculationHistory
          histories={histories}
          isLoading={!workspace.ready}
          onLoadHistory={(historyId) => {
            const inputs = loadFromHistory(historyId)
            if (!inputs) return
            const savedResult = histories.find(h => h.id === historyId)?.result
            const operation: RegexJob['operation'] = inputs.operation === 'extract' || inputs.operation === 'replace' ? inputs.operation : 'grep'
            const transform = inputs.transform ?? savedResult?.transform
            workspace.replaceDraft({ operation, pattern: typeof inputs.pattern === 'string' ? inputs.pattern : '', flags: typeof inputs.flags === 'string' ? inputs.flags : 'g', replacement: typeof inputs.replacement === 'string' ? inputs.replacement : '', inputText: typeof inputs.inputText === 'string' ? inputs.inputText : typeof savedResult?.inputText === 'string' ? savedResult.inputText : '', transform: transform === 'dedupe' && operation === 'grep' ? 'dedupe' : transform === 'uppercaseMatch' && operation === 'replace' ? 'uppercaseMatch' : 'none' })
          }}
          onRemoveHistory={removeHistory}
          onClearHistories={clearHistories}
          formatResult={(result: Record<string, unknown>) => {
            // 매치 수는 inputs.matchCount에 저장되고 result에는 matches 배열이 있음
            const matchCount = typeof result.matchCount === 'number' ? result.matchCount : Array.isArray(result.matches) ? result.matches.length : 0
            return t('execution.historyMatches', { count: matchCount })
          }}
        />
      </div>

      {/* 초보자를 위한 스마트 모드 */}
      <div className="bg-subtle rounded-2xl p-6 mb-8">
        <div className="flex flex-wrap gap-3 items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Wand2 className="w-6 h-6 text-muted" />
            <h2 id="rx-smart" className="text-xl font-bold text-fg">
              {t('smartMode.title')}
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowGuide(!showGuide)}
              aria-expanded={showGuide}
              className="flex items-center space-x-2 min-h-11 px-3 py-2 bg-primary-soft text-primary rounded-lg hover:brightness-95 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              <span className="text-sm">{t('smartMode.guide')}</span>
            </button>
            <button
              onClick={() => setShowPatternBuilder(!showPatternBuilder)}
              aria-expanded={showPatternBuilder}
              className="flex items-center space-x-2 min-h-11 px-3 py-2 bg-primary-soft text-primary rounded-lg hover:brightness-95 transition-colors"
            >
              <Target className="w-4 h-4" />
              <span className="text-sm">{t('smartMode.patternBuilder')}</span>
            </button>
          </div>
        </div>

        <p className="text-sub mb-6">
          {t('smartMode.description')}
        </p>

        {/* 스마트 모드 선택 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4" role="group" aria-labelledby="rx-smart">
          {smartModes.map((mode) => (
            <button
              key={mode.id}
              aria-pressed={smartMode === mode.id}
              onClick={() => {
                setSmartMode(mode.id)
                setUserDescription('')
              }}
              className={`p-3 rounded-lg border-2 text-left transition-all ${
                smartMode === mode.id
                  ? 'border-primary bg-primary-soft'
                  : 'border-line hover:border-line-strong'
              }`}
            >
              <div className="font-medium text-fg text-sm">
                {mode.title}
              </div>
              <div className="text-xs text-muted mt-1">
                {mode.description}
              </div>
            </button>
          ))}
        </div>

        {/* 사용자 입력 */}
        {smartMode && (
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={userDescription}
              onChange={(e) => setUserDescription(e.target.value)}
              aria-label={smartModes.find(m => m.id === smartMode)?.title}
              placeholder={smartModes.find(m => m.id === smartMode)?.placeholder}
              className="flex-1 min-w-0 min-h-11 text-base px-4 py-2 border border-line-strong rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-field text-fg"
              disabled={!!smartModes.find(m => m.id === smartMode)?.noInput}
            />
            <button
              onClick={applySmartMode}
              disabled={!workspace.ready}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:brightness-95 transition-colors flex items-center space-x-2"
            >
              <Lightbulb className="w-4 h-4" />
              <span>{t('smartMode.apply')}</span>
            </button>
          </div>
        )}
      </div>

      {/* 정규식 가이드 */}
      {showGuide && (
        <div className={`${glassCard} ${glassInset} p-6 mb-8`}>
          <div className="flex flex-wrap gap-3 items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-fg flex items-center">
              {t('guide.regexBasics')}
            </h3>
            <button
              onClick={() => setShowGuide(false)}
              className="min-h-11 min-w-11 p-2 text-faint hover:text-sub"
              aria-label={tCommon('close')}
            >
              <EyeOff className="w-5 h-5" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-fg mb-3">
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
                    <code className="bg-soft px-2 py-1 rounded">{item.symbol}</code>
                    <span className="text-sub">{t(`guide.symbolDescs.${item.key}`)}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-fg mb-3">
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
                    <code className="bg-soft px-2 py-1 rounded">{item.pattern}</code>
                    <p className="text-sub">{t(`guide.exampleDescs.${item.key}`)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 패턴 빌더 */}
      {showPatternBuilder && (
        <div className={`${glassCard} ${glassInset} p-6 mb-8`}>
          <div className="flex flex-wrap gap-3 items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-fg flex items-center">
              {t('patternBuilder.title')}
            </h3>
            <button
              onClick={() => setShowPatternBuilder(false)}
              className="min-h-11 min-w-11 p-2 text-faint hover:text-sub"
              aria-label={tCommon('close')}
            >
              <EyeOff className="w-5 h-5" />
            </button>
          </div>
          
          <p className="text-sub mb-4">
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
                className="min-h-11 p-2 bg-soft rounded-lg hover:bg-subtle transition-colors text-center"
              >
                <code className="block font-mono text-sm">{item.symbol}</code>
                <span className="text-xs text-muted">{t(`patternBuilder.symbols.${item.key}`)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 입력 패널 */}
        <div className="min-w-0 space-y-6">
          <MobileResultLink href="#regex-extractor-result" label={t('results.title')} value={workspace.completed ? t('execution.historyMatches', { count: workspace.completed.result.matchCount }) : t('execution.status.idle')} />
          <p className="text-sm text-sub">{t('execution.limits')}</p>
          {workspace.url && workspace.url.kind !== 'ready' && <p role="status" data-regex-url-error className="text-sm text-sub">{t(`execution.url.${workspace.url.kind}`)}</p>}
          {workspace.warnings.map(warning => <p role="status" key={warning} className="text-sm text-sub">{t(`execution.url.${warning}`)}</p>)}
          {/* 작업 유형 선택 */}
          <div className={`${glassCard} ${glassInset} p-6`}>
            <h2 id="rx-op" className="text-xl font-bold text-fg mb-4 flex items-center">
              {t('operation.title')}
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" role="group" aria-labelledby="rx-op">
              {[
                { key: 'grep', icon: Filter, label: t('operation.grep'), desc: t('operation.grepDesc') },
                { key: 'replace', icon: Replace, label: t('operation.replace'), desc: t('operation.replaceDesc') },
                { key: 'extract', icon: Search, label: t('operation.extract'), desc: t('operation.extractDesc') }
              ].map(({ key, icon: Icon, label, desc }) => (
                <button
                  key={key}
                  aria-pressed={operation === key}
                  disabled={!workspace.ready}
                  onClick={() => {
                    workspace.edit({ operation: key as RegexJob['operation'] })
                  }}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    operation === key
                      ? 'border-primary bg-primary-soft'
                      : 'border-line hover:border-line-strong'
                  }`}
                >
                  <Icon className="w-6 h-6 mb-2 text-sub" />
                  <div className="font-medium text-fg">{label}</div>
                  <div className="text-sm text-muted">{desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 정규식 패턴 */}
          <div className={`${glassCard} ${glassInset} p-6`}>
            <div className="flex flex-wrap gap-3 items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-fg">
                {t('pattern.title')}
              </h3>
              <button
                onClick={() => setShowPresets(!showPresets)}
                aria-expanded={showPresets}
                className="flex items-center space-x-2 min-h-11 px-3 py-2 bg-primary-soft text-primary rounded-lg hover:brightness-95 transition-colors"
              >
                <Eye className="w-4 h-4" />
                <span className="text-sm">{t('pattern.presets')}</span>
              </button>
            </div>
            
            <div className="relative">
              <input
                type="text"
                id="regex-pattern"
                value={pattern}
                onChange={(e) => {
                  setPattern(e.target.value)
                }}
                placeholder={t('pattern.placeholder')}
                aria-label={t('pattern.title')}
                aria-invalid={!isValid}
                className={`w-full px-4 py-3 border rounded-lg font-mono text-base focus:ring-2 focus:border-transparent bg-field text-fg ${
                  isValid 
                    ? 'border-line-strong focus:ring-primary' 
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
              <div className="mt-2 text-sm text-red-600">
                {errorMessage}
              </div>
            )}

            {/* 패턴 설명 */}
            {pattern && isValid && (
              <div className="mt-3 p-3 bg-subtle rounded-lg">
                <div className="flex items-start space-x-2">
                  <HelpCircle className="w-4 h-4 text-muted mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-fg mb-1">
                      {t('pattern.explanation')}
                    </div>
                    <div className="text-sm text-sub font-mono [overflow-wrap:anywhere]">
                      {explainPattern(pattern)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 플래그 */}
            <div className="mt-4">
              <label id="rx-flags" className="block text-sm font-medium text-body mb-2">
                {t('flags.title')}
              </label>
              <p className="text-sm text-sub mb-2">{t('execution.activeFlags', { flags: flags || t('execution.noFlags') })}</p>
              <div className="flex flex-wrap gap-2" role="group" aria-labelledby="rx-flags">
                {[
                  { flag: 'g', label: 'Global', desc: t('flags.global') },
                  { flag: 'i', label: 'Ignore Case', desc: t('flags.ignoreCase') },
                  { flag: 'm', label: 'Multiline', desc: t('flags.multiline') },
                  { flag: 's', label: 'Dotall', desc: t('flags.dotall') }
                ].map(({ flag, desc }) => (
                  <button
                    key={flag}
                    onClick={() => toggleFlag(flag)}
                    aria-pressed={flags.includes(flag)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      flags.includes(flag)
                        ? 'bg-primary text-white'
                        : 'bg-soft text-body hover:bg-subtle'
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
                <label htmlFor="rx-replacement" className="block text-sm font-medium text-body mb-2">
                  {t('replacement.title')}
                </label>
                <input
                  id="rx-replacement"
                  type="text"
                  value={replacement}
                  onChange={(e) => setReplacement(e.target.value)}
                  placeholder={t('replacement.placeholder')}
                  className="w-full px-4 py-3 border border-line-strong rounded-lg font-mono text-base focus:ring-2 focus:ring-primary focus:border-transparent bg-field text-fg"
                />
                <div className="mt-1 text-xs text-muted">
                  {t('replacement.help')}
                </div>
              </div>
            )}
          </div>

          {/* 프리셋 패턴 */}
          {showPresets && (
            <div className={`${glassCard} ${glassInset} p-6`}>
              <div className="flex flex-wrap gap-3 items-center justify-between mb-4">
                <h3 id="rx-presets" className="text-lg font-semibold text-fg">
                  {t('presets.title')}
                </h3>
                <button
                  onClick={() => setShowPresets(false)}
                  className="min-h-11 min-w-11 p-2 text-faint hover:text-sub"
                  aria-label={tCommon('close')}
                >
                  <EyeOff className="w-5 h-5" />
                </button>
              </div>

              {/* 카테고리 선택 */}
              <div className="flex flex-wrap gap-2 mb-4" role="group" aria-labelledby="rx-presets">
                {['common', 'email', 'web', 'numbers', 'dates', 'code', 'hash'].map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    aria-pressed={selectedCategory === category}
                    className={`flex items-center space-x-1 min-h-11 px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedCategory === category
                        ? 'bg-primary text-white'
                        : 'bg-soft text-body hover:bg-subtle'
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
                    className="w-full text-left p-3 bg-subtle rounded-lg hover:bg-soft transition-colors"
                  >
                    <div className="font-medium text-fg">
                      {t(`presets.patterns.${preset.name}`)}
                    </div>
                    <div className="text-sm text-sub">
                      {t(`presets.descriptions.${preset.name}`)}
                    </div>
                    <div className="text-xs text-muted font-mono mt-1 [overflow-wrap:anywhere]">
                      {preset.example}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 입력 텍스트 */}
          <div className={`${glassCard} ${glassInset} p-6`}>
            <div className="flex flex-wrap gap-3 items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-fg">
                {t('input.title')}
              </h3>
              <div className="flex flex-wrap gap-2">
                <label className="flex items-center space-x-2 min-h-11 px-3 py-2 bg-soft text-body rounded-lg hover:bg-subtle cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-primary">
                  <span className="text-sm">{t('input.upload')}</span>
                  <input
                    data-regex-file
                    disabled={!workspace.ready}
                    type="file"
                    accept=".txt,.log,.csv,.json,.xml,.html,.js,.ts,.py,.java,.cpp,.c,.h"
                    onChange={handleFileUpload}
                    className="sr-only"
                  />
                </label>
                <button
                  onClick={() => {
                    setInputText('')
                  }}
                  className="flex items-center space-x-2 min-h-11 px-3 py-2 bg-soft text-body rounded-lg hover:bg-subtle transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="text-sm">{tCommon('clear')}</span>
                </button>
              </div>
            </div>
            
            <textarea
              id="regex-input"
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value)
              }}
              placeholder={t('input.placeholder')}
              aria-label={t('input.title')}
              rows={12}
              className="w-full px-4 py-3 border border-line-strong rounded-lg font-mono text-base focus:ring-2 focus:ring-primary focus:border-transparent bg-field text-fg resize-none"
            />
            
            {workspace.reading && <p role="status" className="text-sm text-sub">{t('execution.reading')}</p>}
            {workspace.fileError && <p role="status" data-regex-file-error className="text-sm text-sub">{t(`execution.errors.${workspace.fileError}`)}</p>}
            <div className="mt-2 text-sm text-muted">
              {t('input.stats', { 
                lines: inputText.split('\n').length, 
                chars: inputText.length 
              })}
            </div>
          </div>
        </div>

        <RegexResultPanel workspace={workspace} onSave={handleSaveCalculation} saveStatus={saved && saved.revision === workspace.revision && saved.id === workspace.completed?.id ? saved.status : null} />
      </div>

      {/* 사용 가이드 */}
      <div className="bg-subtle rounded-2xl p-8">
        <h3 className="text-2xl font-bold text-fg mb-6">
          {t('guide.title')}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="text-lg font-semibold text-fg mb-3">
              {t('guide.operationsTitle')}
            </h4>
            <ul className="space-y-2 text-body">
              <li>• {t('guide.operations.0')}</li>
              <li>• {t('guide.operations.1')}</li>
              <li>• {t('guide.operations.2')}</li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold text-fg mb-3">
              {t('guide.tipsTitle')}
            </h4>
            <ul className="space-y-2 text-body">
              <li>• {t('guide.tips.0')}</li>
              <li>• {t('guide.tips.1')}</li>
              <li>• {t('guide.tips.2')}</li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold text-fg mb-3">
              {t('guide.examplesTitle')}
            </h4>
            <ul className="space-y-2 text-body">
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
