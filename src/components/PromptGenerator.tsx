'use client'

import { useState, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  Copy,
  Check,
  Sparkles,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Type,
  Image,
  Wand2,
  RotateCcw,
} from 'lucide-react'

// ── Types ──

type Mode = 'text' | 'image'

interface TextSettings {
  role: string
  task: string
  context: string
  outputFormat: string
  tone: string
  language: string
  length: string
  includeExamples: boolean
  stepByStep: boolean
  compareContrast: boolean
  customInstruction: string
}

interface ImageSettings {
  subject: string
  style: string
  medium: string
  lighting: string
  cameraAngle: string
  mood: string
  qualityTags: string[]
  aspectRatio: string
  negativePrompt: string
}

interface Template {
  id: string
  nameKey: string
  mode: Mode
  textSettings?: Partial<TextSettings>
  imageSettings?: Partial<ImageSettings>
}

// ── Constants ──

const ROLES = [
  'expert', 'writer', 'translator', 'developer', 'marketer',
  'teacher', 'dataAnalyst', 'lawyer', 'doctor', 'coach',
] as const

const OUTPUT_FORMATS = [
  'freeform', 'list', 'table', 'json', 'code', 'essay', 'email', 'report',
] as const

const TONES = [
  'professional', 'friendly', 'formal', 'casual', 'academic', 'humorous',
] as const

const LANGUAGES = ['korean', 'english', 'japanese', 'chinese'] as const

const LENGTHS = ['short', 'medium', 'detailed'] as const

const IMAGE_STYLES = [
  'realistic', 'illustration', 'watercolor', 'oilPainting', 'pixelArt',
  '3dRender', 'animation', 'minimal',
] as const

const MEDIUMS = [
  'photo', 'digitalArt', 'painting', 'sculpture', 'poster',
] as const

const LIGHTINGS = [
  'natural', 'studio', 'goldenHour', 'neon', 'dramatic', 'soft',
] as const

const CAMERA_ANGLES = [
  'front', 'side', 'topDown', 'bottomUp', 'closeUp', 'wide',
] as const

const MOODS = [
  'bright', 'dark', 'dreamy', 'energetic', 'calm', 'mystical',
] as const

const QUALITY_TAGS = [
  '4K', 'highDetail', 'photorealistic', 'masterpiece', 'trendingArtstation',
] as const

const ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:2'] as const

const DEFAULT_TEXT_SETTINGS: TextSettings = {
  role: 'expert',
  task: '',
  context: '',
  outputFormat: 'freeform',
  tone: 'professional',
  language: 'korean',
  length: 'medium',
  includeExamples: false,
  stepByStep: false,
  compareContrast: false,
  customInstruction: '',
}

const DEFAULT_IMAGE_SETTINGS: ImageSettings = {
  subject: '',
  style: 'realistic',
  medium: 'photo',
  lighting: 'natural',
  cameraAngle: 'front',
  mood: 'bright',
  qualityTags: [],
  aspectRatio: '1:1',
  negativePrompt: '',
}

// ── Templates ──

const TEMPLATES: Template[] = [
  {
    id: 'blogWriting',
    nameKey: 'templates.blogWriting',
    mode: 'text',
    textSettings: {
      role: 'writer',
      task: '',
      outputFormat: 'essay',
      tone: 'friendly',
      language: 'korean',
      length: 'detailed',
      stepByStep: false,
      includeExamples: true,
    },
  },
  {
    id: 'codeReview',
    nameKey: 'templates.codeReview',
    mode: 'text',
    textSettings: {
      role: 'developer',
      task: '',
      outputFormat: 'list',
      tone: 'professional',
      language: 'korean',
      length: 'detailed',
      stepByStep: true,
    },
  },
  {
    id: 'translation',
    nameKey: 'templates.translation',
    mode: 'text',
    textSettings: {
      role: 'translator',
      task: '',
      outputFormat: 'freeform',
      tone: 'professional',
      language: 'korean',
      length: 'medium',
    },
  },
  {
    id: 'dataAnalysis',
    nameKey: 'templates.dataAnalysis',
    mode: 'text',
    textSettings: {
      role: 'dataAnalyst',
      task: '',
      outputFormat: 'table',
      tone: 'academic',
      language: 'korean',
      length: 'detailed',
      stepByStep: true,
    },
  },
  {
    id: 'marketingCopy',
    nameKey: 'templates.marketingCopy',
    mode: 'text',
    textSettings: {
      role: 'marketer',
      task: '',
      outputFormat: 'freeform',
      tone: 'friendly',
      language: 'korean',
      length: 'medium',
      includeExamples: true,
    },
  },
  {
    id: 'productPhoto',
    nameKey: 'templates.productPhoto',
    mode: 'image',
    imageSettings: {
      style: 'realistic',
      medium: 'photo',
      lighting: 'studio',
      cameraAngle: 'front',
      mood: 'bright',
      qualityTags: ['4K', 'highDetail', 'photorealistic'],
      aspectRatio: '1:1',
    },
  },
  {
    id: 'landscapeIllustration',
    nameKey: 'templates.landscapeIllustration',
    mode: 'image',
    imageSettings: {
      style: 'illustration',
      medium: 'digitalArt',
      lighting: 'goldenHour',
      cameraAngle: 'wide',
      mood: 'dreamy',
      qualityTags: ['highDetail', 'masterpiece'],
      aspectRatio: '16:9',
    },
  },
  {
    id: 'characterDesign',
    nameKey: 'templates.characterDesign',
    mode: 'image',
    imageSettings: {
      style: 'animation',
      medium: 'digitalArt',
      lighting: 'soft',
      cameraAngle: 'front',
      mood: 'energetic',
      qualityTags: ['highDetail', 'masterpiece', 'trendingArtstation'],
      aspectRatio: '3:2',
    },
  },
]

// ── Component ──

export default function PromptGenerator() {
  const t = useTranslations('promptGenerator')

  const [mode, setMode] = useState<Mode>('text')
  const [textSettings, setTextSettings] = useState<TextSettings>(DEFAULT_TEXT_SETTINGS)
  const [imageSettings, setImageSettings] = useState<ImageSettings>(DEFAULT_IMAGE_SETTINGS)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

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

  // ── Text settings updater ──

  const updateText = useCallback(<K extends keyof TextSettings>(key: K, value: TextSettings[K]) => {
    setTextSettings(prev => ({ ...prev, [key]: value }))
  }, [])

  // ── Image settings updater ──

  const updateImage = useCallback(<K extends keyof ImageSettings>(key: K, value: ImageSettings[K]) => {
    setImageSettings(prev => ({ ...prev, [key]: value }))
  }, [])

  const toggleQualityTag = useCallback((tag: string) => {
    setImageSettings(prev => ({
      ...prev,
      qualityTags: prev.qualityTags.includes(tag)
        ? prev.qualityTags.filter(t => t !== tag)
        : [...prev.qualityTags, tag],
    }))
  }, [])

  // ── Template loader ──

  const loadTemplate = useCallback((template: Template) => {
    setMode(template.mode)
    if (template.mode === 'text' && template.textSettings) {
      setTextSettings(prev => ({ ...prev, ...template.textSettings }))
    }
    if (template.mode === 'image' && template.imageSettings) {
      setImageSettings(prev => ({ ...prev, ...template.imageSettings }))
    }
  }, [])

  // ── Reset ──

  const resetSettings = useCallback(() => {
    if (mode === 'text') {
      setTextSettings(DEFAULT_TEXT_SETTINGS)
    } else {
      setImageSettings(DEFAULT_IMAGE_SETTINGS)
    }
    setShowAdvanced(false)
  }, [mode])

  // ── Prompt generation ──

  const generatedPrompt = useMemo(() => {
    if (mode === 'text') {
      const s = textSettings
      const parts: string[] = []

      parts.push(`[${t('output.roleLabel')}]: ${t(`text.roles.${s.role}`)}`)

      if (s.task.trim()) {
        parts.push(`[${t('output.taskLabel')}]: ${s.task.trim()}`)
      }

      if (s.context.trim()) {
        parts.push(`[${t('output.contextLabel')}]: ${s.context.trim()}`)
      }

      if (s.outputFormat !== 'freeform') {
        parts.push(`[${t('output.formatLabel')}]: ${t(`text.outputFormats.${s.outputFormat}`)}`)
      }

      parts.push(`[${t('output.toneLabel')}]: ${t(`text.tones.${s.tone}`)}`)
      parts.push(`[${t('output.languageLabel')}]: ${t(`text.languages.${s.language}`)}`)
      parts.push(`[${t('output.lengthLabel')}]: ${t(`text.lengths.${s.length}`)}`)

      const advancedParts: string[] = []
      if (s.includeExamples) advancedParts.push(t('text.advanced.includeExamples'))
      if (s.stepByStep) advancedParts.push(t('text.advanced.stepByStep'))
      if (s.compareContrast) advancedParts.push(t('text.advanced.compareContrast'))
      if (advancedParts.length > 0) {
        parts.push(`[${t('output.additionalLabel')}]: ${advancedParts.join(', ')}`)
      }

      if (s.customInstruction.trim()) {
        parts.push(`[${t('output.customLabel')}]: ${s.customInstruction.trim()}`)
      }

      return parts.join('\n')
    } else {
      const s = imageSettings
      const parts: string[] = []

      if (s.subject.trim()) parts.push(s.subject.trim())
      parts.push(`${t(`image.styles.${s.style}`)} style`)
      parts.push(t(`image.mediums.${s.medium}`))
      parts.push(`${t(`image.lightings.${s.lighting}`)} lighting`)
      parts.push(`${t(`image.cameraAngles.${s.cameraAngle}`)} angle`)
      parts.push(`${t(`image.moods.${s.mood}`)} mood`)

      s.qualityTags.forEach(tag => {
        parts.push(t(`image.qualityTags.${tag}`))
      })

      const mainPrompt = parts.join(', ')
      const arSuffix = ` --ar ${s.aspectRatio}`

      let result = mainPrompt + arSuffix
      if (s.negativePrompt.trim()) {
        result += `\n\nNegative prompt: ${s.negativePrompt.trim()}`
      }

      return result
    }
  }, [mode, textSettings, imageSettings, t])

  // ── Improve prompt ──

  const improvePrompt = useCallback(() => {
    if (mode === 'text') {
      setTextSettings(prev => ({
        ...prev,
        includeExamples: true,
        stepByStep: true,
        length: 'detailed',
      }))
    } else {
      setImageSettings(prev => ({
        ...prev,
        qualityTags: ['4K', 'highDetail', 'photorealistic', 'masterpiece'],
      }))
    }
  }, [mode])

  const charCount = generatedPrompt.length

  // ── Filtered templates ──

  const currentTemplates = useMemo(
    () => TEMPLATES.filter(tpl => tpl.mode === mode),
    [mode],
  )

  // ── Button group helper ──

  const renderButtonGroup = useCallback(
    <T extends string>(
      options: readonly T[],
      selected: T,
      onSelect: (v: T) => void,
      labelPrefix: string,
    ) => (
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => onSelect(opt)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              selected === opt
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {t(`${labelPrefix}.${opt}` as any)}
          </button>
        ))}
      </div>
    ),
    [t],
  )

  // ── Render: Text AI settings ──

  const renderTextSettings = () => (
    <div className="space-y-5">
      {/* Role */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {t('text.role')}
        </label>
        <select
          value={textSettings.role}
          onChange={e => updateText('role', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
        >
          {ROLES.map(r => (
            <option key={r} value={r}>{t(`text.roles.${r}`)}</option>
          ))}
        </select>
      </div>

      {/* Task */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {t('text.task')}
        </label>
        <input
          type="text"
          value={textSettings.task}
          onChange={e => updateText('task', e.target.value)}
          placeholder={t('text.taskPlaceholder')}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Context */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {t('text.context')}
        </label>
        <textarea
          value={textSettings.context}
          onChange={e => updateText('context', e.target.value)}
          placeholder={t('text.contextPlaceholder')}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 resize-y"
        />
      </div>

      {/* Output Format */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {t('text.outputFormat')}
        </label>
        <select
          value={textSettings.outputFormat}
          onChange={e => updateText('outputFormat', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
        >
          {OUTPUT_FORMATS.map(f => (
            <option key={f} value={f}>{t(`text.outputFormats.${f}`)}</option>
          ))}
        </select>
      </div>

      {/* Tone */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('text.tone')}
        </label>
        {renderButtonGroup(TONES, textSettings.tone, v => updateText('tone', v), 'text.tones')}
      </div>

      {/* Language */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('text.language')}
        </label>
        {renderButtonGroup(LANGUAGES, textSettings.language, v => updateText('language', v), 'text.languages')}
      </div>

      {/* Length */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('text.length')}
        </label>
        {renderButtonGroup(LENGTHS, textSettings.length, v => updateText('length', v), 'text.lengths')}
      </div>

      {/* Advanced Options */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced(prev => !prev)}
          className="flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
        >
          {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          {t('text.advancedOptions')}
        </button>

        {showAdvanced && (
          <div className="mt-3 space-y-3 pl-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={textSettings.includeExamples}
                onChange={e => updateText('includeExamples', e.target.checked)}
                className="accent-blue-600 w-4 h-4"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {t('text.advanced.includeExamples')}
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={textSettings.stepByStep}
                onChange={e => updateText('stepByStep', e.target.checked)}
                className="accent-blue-600 w-4 h-4"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {t('text.advanced.stepByStep')}
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={textSettings.compareContrast}
                onChange={e => updateText('compareContrast', e.target.checked)}
                className="accent-blue-600 w-4 h-4"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {t('text.advanced.compareContrast')}
              </span>
            </label>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {t('text.advanced.customInstruction')}
              </label>
              <textarea
                value={textSettings.customInstruction}
                onChange={e => updateText('customInstruction', e.target.value)}
                placeholder={t('text.advanced.customInstructionPlaceholder')}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 resize-y"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )

  // ── Render: Image AI settings ──

  const renderImageSettings = () => (
    <div className="space-y-5">
      {/* Subject */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {t('image.subject')}
        </label>
        <input
          type="text"
          value={imageSettings.subject}
          onChange={e => updateImage('subject', e.target.value)}
          placeholder={t('image.subjectPlaceholder')}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Style */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('image.style')}
        </label>
        {renderButtonGroup(IMAGE_STYLES, imageSettings.style, v => updateImage('style', v), 'image.styles')}
      </div>

      {/* Medium */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('image.medium')}
        </label>
        {renderButtonGroup(MEDIUMS, imageSettings.medium, v => updateImage('medium', v), 'image.mediums')}
      </div>

      {/* Lighting */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('image.lighting')}
        </label>
        {renderButtonGroup(LIGHTINGS, imageSettings.lighting, v => updateImage('lighting', v), 'image.lightings')}
      </div>

      {/* Camera Angle */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('image.cameraAngle')}
        </label>
        {renderButtonGroup(CAMERA_ANGLES, imageSettings.cameraAngle, v => updateImage('cameraAngle', v), 'image.cameraAngles')}
      </div>

      {/* Mood */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('image.mood')}
        </label>
        {renderButtonGroup(MOODS, imageSettings.mood, v => updateImage('mood', v), 'image.moods')}
      </div>

      {/* Quality Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('image.qualityTagsLabel')}
        </label>
        <div className="flex flex-wrap gap-2">
          {QUALITY_TAGS.map(tag => (
            <label key={tag} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={imageSettings.qualityTags.includes(tag)}
                onChange={() => toggleQualityTag(tag)}
                className="accent-blue-600 w-4 h-4"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {t(`image.qualityTags.${tag}`)}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Aspect Ratio */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('image.aspectRatio')}
        </label>
        {renderButtonGroup(ASPECT_RATIOS, imageSettings.aspectRatio, v => updateImage('aspectRatio', v), 'image.aspectRatios')}
      </div>

      {/* Negative Prompt */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {t('image.negativePrompt')}
        </label>
        <textarea
          value={imageSettings.negativePrompt}
          onChange={e => updateImage('negativePrompt', e.target.value)}
          placeholder={t('image.negativePromptPlaceholder')}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 resize-y"
        />
      </div>
    </div>
  )

  // ── Main render ──

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Sparkles size={28} />
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Mode Tabs */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode('text')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-colors ${
            mode === 'text'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          <Type size={18} />
          {t('modes.textAi')}
        </button>
        <button
          type="button"
          onClick={() => setMode('image')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-colors ${
            mode === 'image'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          <Image size={18} />
          {t('modes.imageAi')}
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: Settings */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('settings.title')}
              </h2>
              <button
                type="button"
                onClick={resetSettings}
                className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                <RotateCcw size={14} />
                {t('settings.reset')}
              </button>
            </div>
            {mode === 'text' ? renderTextSettings() : renderImageSettings()}
          </div>
        </div>

        {/* Right: Preview + Templates */}
        <div className="lg:col-span-1 space-y-6">
          {/* Prompt Preview */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('output.preview')}
              </h2>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {charCount} {t('output.chars')}
              </span>
            </div>

            <div className="bg-gray-900 dark:bg-gray-950 text-green-400 font-mono text-sm rounded-lg p-4 min-h-[160px] max-h-[400px] overflow-y-auto whitespace-pre-wrap break-words">
              {generatedPrompt || t('output.empty')}
            </div>

            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => copyToClipboard(generatedPrompt, 'prompt')}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-2.5 font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors"
              >
                {copiedId === 'prompt' ? (
                  <>
                    <Check size={16} />
                    {t('output.copied')}
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    {t('output.copy')}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={improvePrompt}
                className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2.5 font-medium transition-colors"
              >
                <Wand2 size={16} />
                {t('output.improve')}
              </button>
            </div>
          </div>

          {/* Templates */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('templates.title')}
            </h2>
            <div className="space-y-2">
              {currentTemplates.map(tpl => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => loadTemplate(tpl)}
                  className="w-full text-left bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 border border-gray-200 dark:border-gray-600 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {t(tpl.nameKey)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen size={20} />
          {t('guide.title')}
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              {t('guide.textTips.title')}
            </h3>
            <ul className="space-y-1.5">
              {(t.raw('guide.textTips.items') as string[]).map((item, i) => (
                <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex gap-2">
                  <span className="text-blue-500 mt-0.5 shrink-0">&#8226;</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              {t('guide.imageTips.title')}
            </h3>
            <ul className="space-y-1.5">
              {(t.raw('guide.imageTips.items') as string[]).map((item, i) => (
                <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex gap-2">
                  <span className="text-blue-500 mt-0.5 shrink-0">&#8226;</span>
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
