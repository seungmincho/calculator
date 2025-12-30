'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Copy, Check, Trash2, RefreshCw, FileText } from 'lucide-react'

type OutputType = 'paragraphs' | 'sentences' | 'words'
type Language = 'latin' | 'korean'

const LOREM_LATIN = [
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
  'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.',
  'Nisi ut aliquip ex ea commodo consequat.',
  'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore.',
  'Eu fugiat nulla pariatur.',
  'Excepteur sint occaecat cupidatat non proident.',
  'Sunt in culpa qui officia deserunt mollit anim id est laborum.',
  'Curabitur pretium tincidunt lacus.',
  'Nulla gravida orci a odio.',
  'Nullam varius, turpis et commodo pharetra.',
  'Est eros bibendum elit, nec luctus magna felis sollicitudin mauris.',
  'Integer in mauris eu nibh euismod gravida.',
  'Duis ac tellus et risus vulputate vehicula.',
  'Donec lobortis risus a elit.',
  'Etiam tempor.',
  'Ut ullamcorper, ligula eu tempor congue.',
  'Eros est euismod turpis, id tincidunt sapien risus a quam.',
  'Maecenas fermentum consequat mi.',
  'Donec fermentum.',
  'Pellentesque malesuada nulla a mi.',
  'Duis sapien sem, aliquet sed, vulputate eget, feugiat non, dolor.',
  'Maecenas aliquet mauris enim.',
  'Nullam adipiscing eros et nisl.',
  'Vestibulum vulputate cursus justo.',
]

const LOREM_KOREAN = [
  '다람쥐 헌 쳇바퀴에 타고파.',
  '키스의 고유조건은 입술끼리 만나야 하고 특, 별, 한 기, 술은 필요치 않다.',
  '정 , 참, 봉, 김, 삿, 갓, 쓰, 훼, 춰.',
  '갈참나무 용광로 특수비밀번호 중간강습회 총경리.',
  '모든 국민은 인간으로서의 존엄과 가치를 가진다.',
  '국가는 개인이 가지는 불가침의 기본적 인권을 확인하고 이를 보장할 의무를 진다.',
  '모든 국민은 법 앞에 평등하다.',
  '누구든지 성별, 종교 또는 사회적 신분에 의하여 정치적, 경제적, 사회적, 문화적 생활의 모든 영역에 있어서 차별을 받지 아니한다.',
  '모든 국민은 신체의 자유를 가진다.',
  '누구든지 법률에 의하지 아니하고는 체포, 구속, 압수, 수색 또는 심문을 받지 아니한다.',
  '대한민국은 민주공화국이다.',
  '대한민국의 주권은 국민에게 있고, 모든 권력은 국민으로부터 나온다.',
  '대한민국의 영토는 한반도와 그 부속도서로 한다.',
  '대한민국은 통일을 지향하며, 자유민주적 기본질서에 입각한 평화적 통일 정책을 수립하고 이를 추진한다.',
  '국가는 전통문화의 계승, 발전과 민족문화의 창달에 노력하여야 한다.',
  '대한민국은 국제평화의 유지에 노력하고 침략적 전쟁을 부인한다.',
  '헌법에 의하여 체결, 공포된 조약과 일반적으로 승인된 국제법규는 국내법과 같은 효력을 가진다.',
  '외국인은 국제법과 조약이 정하는 바에 의하여 그 지위가 보장된다.',
  '공무원은 국민전체에 대한 봉사자이며, 국민에 대하여 책임을 진다.',
  '모든 국민은 언론, 출판의 자유와 집회, 결사의 자유를 가진다.',
]

export default function LoremIpsumGenerator() {
  const t = useTranslations('loremIpsum')
  const [output, setOutput] = useState('')
  const [count, setCount] = useState(3)
  const [outputType, setOutputType] = useState<OutputType>('paragraphs')
  const [language, setLanguage] = useState<Language>('latin')
  const [copied, setCopied] = useState(false)
  const [startWithLorem, setStartWithLorem] = useState(true)

  const generateText = useCallback(() => {
    const sentences = language === 'latin' ? LOREM_LATIN : LOREM_KOREAN
    let result = ''

    if (outputType === 'words') {
      const words: string[] = []
      let i = 0
      while (words.length < count) {
        const sentence = sentences[i % sentences.length]
        const sentenceWords = sentence.replace(/[.,!?]/g, '').split(' ')
        words.push(...sentenceWords)
        i++
      }
      result = words.slice(0, count).join(' ')
      if (startWithLorem && language === 'latin') {
        result = 'Lorem ipsum ' + result.split(' ').slice(2).join(' ')
      }
    } else if (outputType === 'sentences') {
      const selectedSentences: string[] = []
      for (let i = 0; i < count; i++) {
        selectedSentences.push(sentences[i % sentences.length])
      }
      if (startWithLorem && language === 'latin') {
        selectedSentences[0] = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'
      }
      result = selectedSentences.join(' ')
    } else {
      // paragraphs
      const paragraphs: string[] = []
      for (let p = 0; p < count; p++) {
        const paragraphSentences: string[] = []
        const sentenceCount = 4 + Math.floor(Math.random() * 4) // 4-7 sentences per paragraph
        for (let s = 0; s < sentenceCount; s++) {
          const idx = (p * sentenceCount + s) % sentences.length
          paragraphSentences.push(sentences[idx])
        }
        if (p === 0 && startWithLorem && language === 'latin') {
          paragraphSentences[0] = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'
        }
        paragraphs.push(paragraphSentences.join(' '))
      }
      result = paragraphs.join('\n\n')
    }

    setOutput(result)
  }, [count, outputType, language, startWithLorem])

  const handleCopy = useCallback(async () => {
    if (!output) return
    try {
      await navigator.clipboard.writeText(output)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = output
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [output])

  const handleClear = useCallback(() => {
    setOutput('')
  }, [])

  const stats = {
    characters: output.length,
    words: output ? output.split(/\s+/).filter(w => w).length : 0,
    paragraphs: output ? output.split(/\n\n+/).filter(p => p.trim()).length : 0
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <FileText className="w-7 h-7 text-indigo-500" />
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t('description')}
        </p>
      </div>

      {/* Options */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Language */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('options.language')}
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="latin">{t('options.latin')}</option>
              <option value="korean">{t('options.korean')}</option>
            </select>
          </div>

          {/* Output Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('options.type')}
            </label>
            <select
              value={outputType}
              onChange={(e) => setOutputType(e.target.value as OutputType)}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="paragraphs">{t('options.paragraphs')}</option>
              <option value="sentences">{t('options.sentences')}</option>
              <option value="words">{t('options.words')}</option>
            </select>
          </div>

          {/* Count */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('options.count')}
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Start with Lorem */}
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={startWithLorem}
                onChange={(e) => setStartWithLorem(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-indigo-500 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {t('options.startWithLorem')}
              </span>
            </label>
          </div>
        </div>

        {/* Generate Button */}
        <div className="flex justify-center mt-6">
          <button
            onClick={generateText}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl font-medium bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg hover:shadow-xl transition-all"
          >
            <RefreshCw className="w-5 h-5" />
            {t('actions.generate')}
          </button>
        </div>
      </div>

      {/* Output */}
      {output && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span>{stats.characters.toLocaleString()} {t('stats.characters')}</span>
              <span>{stats.words.toLocaleString()} {t('stats.words')}</span>
              <span>{stats.paragraphs} {t('stats.paragraphs')}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium bg-indigo-500 hover:bg-indigo-600 text-white transition-all"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? t('actions.copied') : t('actions.copy')}
              </button>
              <button
                onClick={handleClear}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 transition-all"
              >
                <Trash2 className="w-4 h-4" />
                {t('actions.clear')}
              </button>
            </div>
          </div>
          <div className="p-4 max-h-96 overflow-y-auto">
            <div className="text-gray-900 dark:text-white whitespace-pre-wrap leading-relaxed">
              {output}
            </div>
          </div>
        </div>
      )}

      {/* Guide */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('guide.title')}
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t('guide.whatIs.title')}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('guide.whatIs.description')}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t('guide.useCases.title')}
            </h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              {(t.raw('guide.useCases.items') as string[]).map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-indigo-500 mt-0.5">•</span>
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
