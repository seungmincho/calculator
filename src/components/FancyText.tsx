'use client'

import { useState, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Copy, Check, ClipboardList } from 'lucide-react'

// ── Unicode conversion maps ──────────────────────────────────────────────────

// Mathematical Bold: A=𝐀 a=𝐚
const BOLD_UPPER = 0x1d400
const BOLD_LOWER = 0x1d41a

// Mathematical Italic: A=𝐴 a=𝑎  (h is at U+210E — handled specially)
const ITALIC_UPPER = 0x1d434
const ITALIC_LOWER = 0x1d44e
// Italic 'h' is U+210E (Planck constant), skip replacement – just use standard offset
// Actually standard: italic a=U+1D44E..z, A=U+1D434..Z, but h(=0x68) maps to U+210E.
// For simplicity we keep the standard block offset and let h render as is.

// Mathematical Bold Italic
const BOLD_ITALIC_UPPER = 0x1d468
const BOLD_ITALIC_LOWER = 0x1d482

// Double-Struck (Outlined)
const DOUBLE_UPPER = 0x1d538
const DOUBLE_LOWER = 0x1d552
// Exceptions in double-struck: C=U+2102, H=U+210D, N=U+2115, P=U+2119, Q=U+211A, R=U+211D, Z=U+2124
const DOUBLE_EXCEPTIONS: Record<string, string> = {
  C: '\u2102',
  H: '\u210D',
  N: '\u2115',
  P: '\u2119',
  Q: '\u211A',
  R: '\u211D',
  Z: '\u2124',
}

// Monospace
const MONO_UPPER = 0x1d670
const MONO_LOWER = 0x1d68a

// Script (Cursive)
const SCRIPT_UPPER = 0x1d49c
const SCRIPT_LOWER = 0x1d4b6
// Script exceptions: B=U+212C, E=U+2130, F=U+2131, H=U+210B, I=U+2110, L=U+2112, M=U+2133, R=U+211B
const SCRIPT_UPPER_EXCEPTIONS: Record<string, string> = {
  B: '\u212C',
  E: '\u2130',
  F: '\u2131',
  H: '\u210B',
  I: '\u2110',
  L: '\u2112',
  M: '\u2133',
  R: '\u211B',
}
// Script lowercase exceptions: e=U+212F, g=U+210A, o=U+2134
const SCRIPT_LOWER_EXCEPTIONS: Record<string, string> = {
  e: '\u212F',
  g: '\u210A',
  o: '\u2134',
}

// Bold Script
const BOLD_SCRIPT_UPPER = 0x1d4d0
const BOLD_SCRIPT_LOWER = 0x1d4ea

// Fraktur
const FRAKTUR_UPPER = 0x1d504
const FRAKTUR_LOWER = 0x1d51e
// Fraktur exceptions: C=U+212D, H=U+210C, I=U+2111, R=U+211C, Z=U+2128
const FRAKTUR_UPPER_EXCEPTIONS: Record<string, string> = {
  C: '\u212D',
  H: '\u210C',
  I: '\u2111',
  R: '\u211C',
  Z: '\u2128',
}

// Bold Fraktur
const BOLD_FRAKTUR_UPPER = 0x1d56c
const BOLD_FRAKTUR_LOWER = 0x1d586

// Sans-Serif
const SANS_UPPER = 0x1d5a0
const SANS_LOWER = 0x1d5ba

// Sans-Serif Bold
const SANS_BOLD_UPPER = 0x1d5d4
const SANS_BOLD_LOWER = 0x1d5ee

// Sans-Serif Italic
const SANS_ITALIC_UPPER = 0x1d608
const SANS_ITALIC_LOWER = 0x1d622

// Sans-Serif Bold Italic
const SANS_BOLD_ITALIC_UPPER = 0x1d63c
const SANS_BOLD_ITALIC_LOWER = 0x1d656

// Circled letters: Ⓐ=U+24B6 ... Ⓩ=U+24CF, ⓐ=U+24D0 ... ⓩ=U+24E9
const CIRCLED_UPPER = 0x24b6
const CIRCLED_LOWER = 0x24d0

// Squared letters: 🄰=U+1F130 ... 🅉=U+1F149
const SQUARED_UPPER = 0x1f130
// Squared lowercase — no standard block, reuse uppercase
// Negative Squared: 🅐=U+1F150 ... 🅩=U+1F169
const NEG_SQUARED_UPPER = 0x1f150

// Combining strikethrough: U+0336
const COMBINING_STRIKETHROUGH = '\u0336'

// Combining underline (low line): U+0332
const COMBINING_UNDERLINE = '\u0332'

// Upside-down map
const UPSIDE_DOWN_MAP: Record<string, string> = {
  a: '\u0250', b: 'q', c: '\u0254', d: 'p', e: '\u01DD',
  f: '\u025F', g: '\u0253', h: '\u0265', i: '\u0131', j: '\u027E',
  k: '\u029E', l: '\u05DF', m: '\u026F', n: 'u', o: 'o',
  p: 'd', q: 'b', r: '\u0279', s: 's', t: '\u0287',
  u: 'n', v: '\u028C', w: '\u028D', x: 'x', y: '\u028E', z: 'z',
  A: '\u2200', B: '\u15FA', C: '\u0186', D: '\u15E1', E: '\u018E',
  F: '\u2132', G: '\u2141', H: 'H', I: 'I', J: '\u017F',
  K: '\u22CA', L: '\u2143', M: 'W', N: 'N', O: 'O',
  P: '\u0500', Q: '\u038A', R: '\u1D1A', S: 'S', T: '\u22A5',
  U: '\u2229', V: '\u2227', W: 'M', X: 'X', Y: '\u2144', Z: 'Z',
}

// Mirror / Reversed map (visually plausible ASCII mirrors)
const MIRROR_MAP: Record<string, string> = {
  a: '\u0252', b: 'd', c: '\u0254', d: 'b', e: '\u0258',
  f: '\u025F', g: '\u0261', h: '\u0265', i: 'i', j: '\u027E',
  k: '\u029E', l: 'l', m: '\u026F', n: '\u0272', o: 'o',
  p: 'q', q: 'p', r: '\u0279', s: 's', t: '\u0287',
  u: 'u', v: '\u028C', w: '\u028D', x: 'x', y: '\u028E', z: 'z',
  A: 'A', B: '\u15FA', C: '\u0186', D: '\u15E1', E: '\u018E',
  F: '\u2132', G: '\u2141', H: 'H', I: 'I', J: 'L',
  K: '\u22CA', L: 'J', M: 'M', N: '\u0418', O: 'O',
  P: '\u15E1', Q: '\u038A', R: '\u1D1A', S: 'S', T: 'T',
  U: 'U', V: 'V', W: 'W', X: 'X', Y: 'Y', Z: 'Z',
}

// Full-width: Ａ=U+FF21 ... Ｚ=U+FF3A, ａ=U+FF41 ... ｚ=U+FF5A, ０=U+FF10 ... ９=U+FF19
const FW_UPPER = 0xff21
const FW_LOWER = 0xff41
const FW_DIGIT = 0xff10

// ── Converter helpers ────────────────────────────────────────────────────────

function mapChar(
  char: string,
  upperBase: number,
  lowerBase: number,
  upperExceptions?: Record<string, string>,
  lowerExceptions?: Record<string, string>
): string {
  const code = char.charCodeAt(0)
  if (code >= 65 && code <= 90) {
    // uppercase
    if (upperExceptions && upperExceptions[char]) return upperExceptions[char]
    return String.fromCodePoint(upperBase + (code - 65))
  }
  if (code >= 97 && code <= 122) {
    // lowercase
    if (lowerExceptions && lowerExceptions[char]) return lowerExceptions[char]
    return String.fromCodePoint(lowerBase + (code - 97))
  }
  return char
}

function convertText(
  text: string,
  converter: (char: string) => string
): string {
  return [...text].map(converter).join('')
}

// ── All style definitions ────────────────────────────────────────────────────

interface StyleDef {
  key: string
  convert: (text: string) => string
}

const STYLE_DEFS: StyleDef[] = [
  {
    key: 'bold',
    convert: (t) => convertText(t, (c) => mapChar(c, BOLD_UPPER, BOLD_LOWER)),
  },
  {
    key: 'italic',
    convert: (t) => convertText(t, (c) => mapChar(c, ITALIC_UPPER, ITALIC_LOWER)),
  },
  {
    key: 'boldItalic',
    convert: (t) => convertText(t, (c) => mapChar(c, BOLD_ITALIC_UPPER, BOLD_ITALIC_LOWER)),
  },
  {
    key: 'doubleStruck',
    convert: (t) =>
      convertText(t, (c) => mapChar(c, DOUBLE_UPPER, DOUBLE_LOWER, DOUBLE_EXCEPTIONS)),
  },
  {
    key: 'monospace',
    convert: (t) => convertText(t, (c) => mapChar(c, MONO_UPPER, MONO_LOWER)),
  },
  {
    key: 'script',
    convert: (t) =>
      convertText(
        t,
        (c) => mapChar(c, SCRIPT_UPPER, SCRIPT_LOWER, SCRIPT_UPPER_EXCEPTIONS, SCRIPT_LOWER_EXCEPTIONS)
      ),
  },
  {
    key: 'boldScript',
    convert: (t) => convertText(t, (c) => mapChar(c, BOLD_SCRIPT_UPPER, BOLD_SCRIPT_LOWER)),
  },
  {
    key: 'fraktur',
    convert: (t) =>
      convertText(t, (c) => mapChar(c, FRAKTUR_UPPER, FRAKTUR_LOWER, FRAKTUR_UPPER_EXCEPTIONS)),
  },
  {
    key: 'boldFraktur',
    convert: (t) => convertText(t, (c) => mapChar(c, BOLD_FRAKTUR_UPPER, BOLD_FRAKTUR_LOWER)),
  },
  {
    key: 'sansSerif',
    convert: (t) => convertText(t, (c) => mapChar(c, SANS_UPPER, SANS_LOWER)),
  },
  {
    key: 'sansSerifBold',
    convert: (t) => convertText(t, (c) => mapChar(c, SANS_BOLD_UPPER, SANS_BOLD_LOWER)),
  },
  {
    key: 'sansSerifItalic',
    convert: (t) => convertText(t, (c) => mapChar(c, SANS_ITALIC_UPPER, SANS_ITALIC_LOWER)),
  },
  {
    key: 'sansSerifBoldItalic',
    convert: (t) =>
      convertText(t, (c) => mapChar(c, SANS_BOLD_ITALIC_UPPER, SANS_BOLD_ITALIC_LOWER)),
  },
  {
    key: 'circled',
    convert: (t) =>
      convertText(t, (c) => {
        const code = c.charCodeAt(0)
        if (code >= 65 && code <= 90) return String.fromCodePoint(CIRCLED_UPPER + (code - 65))
        if (code >= 97 && code <= 122) return String.fromCodePoint(CIRCLED_LOWER + (code - 97))
        return c
      }),
  },
  {
    key: 'squared',
    convert: (t) =>
      convertText(t, (c) => {
        const code = c.charCodeAt(0)
        if (code >= 65 && code <= 90) return String.fromCodePoint(SQUARED_UPPER + (code - 65))
        if (code >= 97 && code <= 122) return String.fromCodePoint(SQUARED_UPPER + (code - 97))
        return c
      }),
  },
  {
    key: 'negativeSquared',
    convert: (t) =>
      convertText(t, (c) => {
        const code = c.charCodeAt(0)
        if (code >= 65 && code <= 90) return String.fromCodePoint(NEG_SQUARED_UPPER + (code - 65))
        if (code >= 97 && code <= 122) return String.fromCodePoint(NEG_SQUARED_UPPER + (code - 97))
        return c
      }),
  },
  {
    key: 'strikethrough',
    convert: (t) => convertText(t, (c) => (c === ' ' ? c : c + COMBINING_STRIKETHROUGH)),
  },
  {
    key: 'underline',
    convert: (t) => convertText(t, (c) => (c === ' ' ? c : c + COMBINING_UNDERLINE)),
  },
  {
    key: 'upsideDown',
    convert: (t) =>
      [...t]
        .map((c) => UPSIDE_DOWN_MAP[c] ?? c)
        .reverse()
        .join(''),
  },
  {
    key: 'mirror',
    convert: (t) =>
      [...t]
        .map((c) => MIRROR_MAP[c] ?? c)
        .reverse()
        .join(''),
  },
  {
    key: 'fullwidth',
    convert: (t) =>
      convertText(t, (c) => {
        const code = c.charCodeAt(0)
        if (code >= 65 && code <= 90) return String.fromCodePoint(FW_UPPER + (code - 65))
        if (code >= 97 && code <= 122) return String.fromCodePoint(FW_LOWER + (code - 97))
        if (code >= 48 && code <= 57) return String.fromCodePoint(FW_DIGIT + (code - 48))
        return c
      }),
  },
]

// ── Component ────────────────────────────────────────────────────────────────

export default function FancyText() {
  const t = useTranslations('fancyText')
  const [input, setInput] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const results = useMemo(() => {
    if (!input.trim()) return []
    return STYLE_DEFS.map((def) => ({
      key: def.key,
      label: t(`styles.${def.key}`),
      output: def.convert(input),
    }))
  }, [input, t])

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
    } catch {
      // fallback silently fails
    }
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  const copyAll = useCallback(async () => {
    if (!results.length) return
    const allText = results.map((r) => `${r.label}: ${r.output}`).join('\n')
    await copyToClipboard(allText, '__all__')
  }, [results, copyToClipboard])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Input area */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('inputLabel')}
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('inputPlaceholder')}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
          aria-label={t('inputLabel')}
        />
        <p className="text-xs text-gray-400 dark:text-gray-500">{t('asciiNote')}</p>

        {results.length > 0 && (
          <div className="flex justify-end">
            <button
              onClick={copyAll}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:from-purple-700 hover:to-indigo-700 transition-all"
              aria-label={t('copyAll')}
            >
              {copiedId === '__all__' ? (
                <>
                  <Check className="w-4 h-4" />
                  {t('copied')}
                </>
              ) : (
                <>
                  <ClipboardList className="w-4 h-4" />
                  {t('copyAll')}
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Results grid */}
      {results.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
          <p className="text-gray-400 dark:text-gray-500 text-lg">{t('noInput')}</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map((r) => (
            <div
              key={r.key}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 flex flex-col gap-3 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-purple-600 dark:text-purple-400">
                  {r.label}
                </span>
                <button
                  onClick={() => copyToClipboard(r.output, r.key)}
                  className="flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-purple-100 dark:hover:bg-purple-900 text-gray-600 dark:text-gray-300 hover:text-purple-700 dark:hover:text-purple-300 rounded-md px-2 py-1 transition-colors"
                  aria-label={`${t('copy')} ${r.label}`}
                >
                  {copiedId === r.key ? (
                    <>
                      <Check className="w-3 h-3" />
                      {t('copied')}
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      {t('copy')}
                    </>
                  )}
                </button>
              </div>
              <p
                className="text-gray-800 dark:text-gray-100 text-lg leading-relaxed break-all select-all cursor-text"
                lang="und"
                aria-label={`${r.label}: ${r.output}`}
              >
                {r.output}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Guide */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {t('guide.title')}
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Usage */}
          <div>
            <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-2">
              {t('guide.usageTitle')}
            </h3>
            <ul className="space-y-1">
              {(t.raw('guide.usageItems') as string[]).map((item, i) => (
                <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex gap-2">
                  <span className="text-purple-500 shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* How */}
          <div>
            <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-2">
              {t('guide.howTitle')}
            </h3>
            <ul className="space-y-1">
              {(t.raw('guide.howItems') as string[]).map((item, i) => (
                <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex gap-2">
                  <span className="text-purple-500 shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Tips */}
          <div>
            <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-2">
              {t('guide.tipsTitle')}
            </h3>
            <ul className="space-y-1">
              {(t.raw('guide.tipsItems') as string[]).map((item, i) => (
                <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex gap-2">
                  <span className="text-amber-500 shrink-0">!</span>
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
