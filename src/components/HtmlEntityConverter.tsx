'use client'

import { useState, useMemo, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Code2, Copy, Check, BookOpen, ArrowRightLeft, Search } from 'lucide-react'

type Mode = 'encode' | 'decode'

// ── Named Entity 매핑 (자주 사용되는 것들) ──
const NAMED_ENTITIES: Record<string, string> = {
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  '\u00a0': '&nbsp;', '\u00a9': '&copy;', '\u00ae': '&reg;', '\u2122': '&trade;',
  '\u00b0': '&deg;', '\u00b1': '&plusmn;', '\u00d7': '&times;', '\u00f7': '&divide;',
  '\u2260': '&ne;', '\u2264': '&le;', '\u2265': '&ge;', '\u221e': '&infin;',
  '\u2190': '&larr;', '\u2191': '&uarr;', '\u2192': '&rarr;', '\u2193': '&darr;',
  '\u2194': '&harr;', '\u21d0': '&lArr;', '\u21d2': '&rArr;', '\u21d4': '&hArr;',
  '\u2022': '&bull;', '\u2026': '&hellip;', '\u2013': '&ndash;', '\u2014': '&mdash;',
  '\u2018': '&lsquo;', '\u2019': '&rsquo;', '\u201c': '&ldquo;', '\u201d': '&rdquo;',
  '\u20ac': '&euro;', '\u00a3': '&pound;', '\u00a5': '&yen;', '\u00a2': '&cent;',
  '\u00bc': '&frac14;', '\u00bd': '&frac12;', '\u00be': '&frac34;',
  '\u03b1': '&alpha;', '\u03b2': '&beta;', '\u03b3': '&gamma;', '\u03b4': '&delta;',
  '\u03c0': '&pi;', '\u03c3': '&sigma;', '\u03c9': '&omega;',
  '\u2200': '&forall;', '\u2203': '&exist;', '\u2205': '&empty;',
  '\u2207': '&nabla;', '\u2208': '&isin;', '\u2209': '&notin;',
  '\u2211': '&sum;', '\u220f': '&prod;', '\u221a': '&radic;',
  '\u2227': '&and;', '\u2228': '&or;', '\u00ac': '&not;',
  '\u2229': '&cap;', '\u222a': '&cup;', '\u2248': '&asymp;',
}

const REVERSE_NAMED: Record<string, string> = {}
for (const [char, entity] of Object.entries(NAMED_ENTITIES)) {
  REVERSE_NAMED[entity] = char
}

type EncodeOption = 'named' | 'decimal' | 'hex'

function encodeHtmlEntities(text: string, option: EncodeOption, encodeAll: boolean): string {
  let result = ''
  for (const char of text) {
    if (option === 'named' && NAMED_ENTITIES[char]) {
      result += NAMED_ENTITIES[char]
    } else if (encodeAll && char.charCodeAt(0) > 127) {
      const code = char.codePointAt(0) ?? char.charCodeAt(0)
      result += option === 'hex' ? `&#x${code.toString(16).toUpperCase()};` : `&#${code};`
    } else if (['&', '<', '>', '"', "'"].includes(char)) {
      if (option === 'named') {
        result += NAMED_ENTITIES[char]
      } else if (option === 'hex') {
        result += `&#x${char.charCodeAt(0).toString(16).toUpperCase()};`
      } else {
        result += `&#${char.charCodeAt(0)};`
      }
    } else {
      result += char
    }
  }
  return result
}

function decodeHtmlEntities(text: string): string {
  // 먼저 named entities 변환
  let result = text.replace(/&[a-zA-Z]+;/g, match => REVERSE_NAMED[match] ?? match)
  // decimal entities (&#123;)
  result = result.replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(parseInt(code, 10)))
  // hex entities (&#x1F600; or &#xAB;)
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
  return result
}

// ── 참고 테이블 데이터 ──
interface EntityRef {
  char: string
  named: string
  decimal: string
  hex: string
  desc: string
}

const REFERENCE_TABLE: EntityRef[] = [
  { char: '&', named: '&amp;', decimal: '&#38;', hex: '&#x26;', desc: 'Ampersand' },
  { char: '<', named: '&lt;', decimal: '&#60;', hex: '&#x3C;', desc: 'Less than' },
  { char: '>', named: '&gt;', decimal: '&#62;', hex: '&#x3E;', desc: 'Greater than' },
  { char: '"', named: '&quot;', decimal: '&#34;', hex: '&#x22;', desc: 'Double quote' },
  { char: "'", named: '&apos;', decimal: '&#39;', hex: '&#x27;', desc: 'Single quote' },
  { char: '\u00a0', named: '&nbsp;', decimal: '&#160;', hex: '&#xA0;', desc: 'Non-breaking space' },
  { char: '\u00a9', named: '&copy;', decimal: '&#169;', hex: '&#xA9;', desc: 'Copyright' },
  { char: '\u00ae', named: '&reg;', decimal: '&#174;', hex: '&#xAE;', desc: 'Registered' },
  { char: '\u2122', named: '&trade;', decimal: '&#8482;', hex: '&#x2122;', desc: 'Trademark' },
  { char: '\u00b0', named: '&deg;', decimal: '&#176;', hex: '&#xB0;', desc: 'Degree' },
  { char: '\u00d7', named: '&times;', decimal: '&#215;', hex: '&#xD7;', desc: 'Multiply' },
  { char: '\u00f7', named: '&divide;', decimal: '&#247;', hex: '&#xF7;', desc: 'Divide' },
  { char: '\u2190', named: '&larr;', decimal: '&#8592;', hex: '&#x2190;', desc: 'Left arrow' },
  { char: '\u2192', named: '&rarr;', decimal: '&#8594;', hex: '&#x2192;', desc: 'Right arrow' },
  { char: '\u2022', named: '&bull;', decimal: '&#8226;', hex: '&#x2022;', desc: 'Bullet' },
  { char: '\u2026', named: '&hellip;', decimal: '&#8230;', hex: '&#x2026;', desc: 'Ellipsis' },
  { char: '\u2013', named: '&ndash;', decimal: '&#8211;', hex: '&#x2013;', desc: 'En dash' },
  { char: '\u2014', named: '&mdash;', decimal: '&#8212;', hex: '&#x2014;', desc: 'Em dash' },
  { char: '\u20ac', named: '&euro;', decimal: '&#8364;', hex: '&#x20AC;', desc: 'Euro' },
  { char: '\u00a3', named: '&pound;', decimal: '&#163;', hex: '&#xA3;', desc: 'Pound' },
  { char: '\u00a5', named: '&yen;', decimal: '&#165;', hex: '&#xA5;', desc: 'Yen' },
  { char: '\u03b1', named: '&alpha;', decimal: '&#945;', hex: '&#x3B1;', desc: 'Alpha' },
  { char: '\u03b2', named: '&beta;', decimal: '&#946;', hex: '&#x3B2;', desc: 'Beta' },
  { char: '\u03c0', named: '&pi;', decimal: '&#960;', hex: '&#x3C0;', desc: 'Pi' },
  { char: '\u221e', named: '&infin;', decimal: '&#8734;', hex: '&#x221E;', desc: 'Infinity' },
]

export default function HtmlEntityConverter() {
  const t = useTranslations('htmlEntityConverter')
  const [mode, setMode] = useState<Mode>('encode')
  const [input, setInput] = useState('')
  const [encodeOption, setEncodeOption] = useState<EncodeOption>('named')
  const [encodeAll, setEncodeAll] = useState(false) // 비 ASCII 전체 인코딩
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showGuide, setShowGuide] = useState(false)
  const [refSearch, setRefSearch] = useState('')

  const output = useMemo(() => {
    if (!input) return ''
    if (mode === 'encode') {
      return encodeHtmlEntities(input, encodeOption, encodeAll)
    }
    return decodeHtmlEntities(input)
  }, [input, mode, encodeOption, encodeAll])

  const filteredRef = useMemo(() => {
    if (!refSearch) return REFERENCE_TABLE
    const q = refSearch.toLowerCase()
    return REFERENCE_TABLE.filter(r =>
      r.char.includes(q) || r.named.toLowerCase().includes(q) ||
      r.desc.toLowerCase().includes(q) || r.decimal.includes(q) || r.hex.toLowerCase().includes(q)
    )
  }, [refSearch])

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

  const swap = useCallback(() => {
    setInput(output)
    setMode(prev => prev === 'encode' ? 'decode' : 'encode')
  }, [output])

  const charCount = useMemo(() => {
    const entityCount = (input.match(/&[#a-zA-Z0-9]+;/g) || []).length
    return { input: input.length, output: output.length, entities: mode === 'decode' ? entityCount : (output.match(/&[#a-zA-Z0-9]+;/g) || []).length }
  }, [input, output, mode])

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Code2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* 모드 탭 */}
      <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
        <button
          onClick={() => setMode('encode')}
          className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-colors ${mode === 'encode' ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow' : 'text-gray-600 dark:text-gray-300'}`}
        >
          {t('encodeTab')}
        </button>
        <button
          onClick={() => setMode('decode')}
          className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-colors ${mode === 'decode' ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow' : 'text-gray-600 dark:text-gray-300'}`}
        >
          {t('decodeTab')}
        </button>
      </div>

      {/* 인코딩 옵션 */}
      {mode === 'encode' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('format')}:</span>
            {(['named', 'decimal', 'hex'] as const).map(opt => (
              <label key={opt} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="encodeOption"
                  value={opt}
                  checked={encodeOption === opt}
                  onChange={() => setEncodeOption(opt)}
                  className="accent-blue-600"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">{t(`formats.${opt}`)}</span>
              </label>
            ))}
            <div className="border-l border-gray-200 dark:border-gray-600 h-5 mx-1" />
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={encodeAll}
                onChange={e => setEncodeAll(e.target.checked)}
                className="accent-blue-600 w-4 h-4"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">{t('encodeAllNonAscii')}</span>
            </label>
          </div>
        </div>
      )}

      {/* 입출력 영역 */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* 입력 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              {mode === 'encode' ? t('inputText') : t('inputEncoded')}
            </h2>
            <span className="text-xs text-gray-400">{charCount.input} chars</span>
          </div>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={mode === 'encode' ? t('encodePlaceholder') : t('decodePlaceholder')}
            className="w-full h-48 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm font-mono resize-none"
            spellCheck={false}
          />
        </div>

        {/* 스왑 버튼 */}
        <div className="lg:hidden flex justify-center">
          <button
            onClick={swap}
            className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
            aria-label={t('swap')}
          >
            <ArrowRightLeft className="w-5 h-5 text-gray-500 rotate-90" />
          </button>
        </div>

        {/* 출력 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 relative">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              {mode === 'encode' ? t('outputEncoded') : t('outputText')}
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{charCount.output} chars</span>
              {output && (
                <>
                  <button
                    onClick={swap}
                    className="hidden lg:flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400 rounded transition-colors"
                    aria-label={t('swap')}
                  >
                    <ArrowRightLeft className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => copyToClipboard(output, 'output')}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400 rounded transition-colors"
                  >
                    {copiedId === 'output' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                    {copiedId === 'output' ? t('copied') : t('copy')}
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="w-full h-48 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm font-mono overflow-auto whitespace-pre-wrap break-all">
            {output || <span className="text-gray-400">{t('outputPlaceholder')}</span>}
          </div>
          {charCount.entities > 0 && (
            <p className="text-xs text-gray-400 mt-2">
              {t('entityCount', { count: charCount.entities })}
            </p>
          )}
        </div>
      </div>

      {/* 엔티티 참고 테이블 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('referenceTable')}</h2>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={refSearch}
              onChange={e => setRefSearch(e.target.value)}
              placeholder={t('searchEntity')}
              className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 w-48"
            />
          </div>
        </div>
        <div className="overflow-x-auto max-h-72 overflow-y-auto">
          <table className="w-full text-sm" aria-label={t('referenceTable')}>
            <thead className="sticky top-0 bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t('charCol')}</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t('descCol')}</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Named</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Decimal</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Hex</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredRef.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 group">
                  <td className="px-3 py-2 text-center text-lg">{r.char === '\u00a0' ? '\u2423' : r.char}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{r.desc}</td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-900 dark:text-white">
                    <button
                      onClick={() => copyToClipboard(r.named, `ref-named-${i}`)}
                      className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {copiedId === `ref-named-${i}` ? <Check className="w-3 h-3 inline text-green-500" /> : r.named}
                    </button>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-600 dark:text-gray-400">
                    <button
                      onClick={() => copyToClipboard(r.decimal, `ref-dec-${i}`)}
                      className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {copiedId === `ref-dec-${i}` ? <Check className="w-3 h-3 inline text-green-500" /> : r.decimal}
                    </button>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-600 dark:text-gray-400">
                    <button
                      onClick={() => copyToClipboard(r.hex, `ref-hex-${i}`)}
                      className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {copiedId === `ref-hex-${i}` ? <Check className="w-3 h-3 inline text-green-500" /> : r.hex}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 가이드 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="w-full flex items-center justify-between"
          aria-expanded={showGuide}
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            {t('guide.title')}
          </h2>
          <span className="text-gray-400 text-xl" aria-hidden="true">{showGuide ? '−' : '+'}</span>
        </button>
        {showGuide && (
          <div className="mt-4 space-y-4 text-sm text-gray-700 dark:text-gray-300">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">{t('guide.what.title')}</h3>
              <ul className="list-disc pl-5 space-y-1">
                {(t.raw('guide.what.items') as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">{t('guide.formats.title')}</h3>
              <ul className="list-disc pl-5 space-y-1">
                {(t.raw('guide.formats.items') as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">{t('guide.usage.title')}</h3>
              <ul className="list-disc pl-5 space-y-1">
                {(t.raw('guide.usage.items') as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
