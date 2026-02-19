'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  Copy,
  Check,
  Download,
  BookOpen,
  Image as ImageIcon,
  Type,
  Code,
  Settings,
  Palette,
  Hash,
} from 'lucide-react'

// ── Types ──

interface ThemeColors {
  bg: string
  text: string
  keyword: string
  string: string
  comment: string
  number: string
  function: string
  operator: string
  lineNumber: string
  type: string
  tag: string
}

interface Token {
  text: string
  type: 'keyword' | 'string' | 'comment' | 'number' | 'function' | 'operator' | 'text' | 'type' | 'tag'
}

type BackgroundType = 'gradient' | 'solid'

interface GradientPreset {
  name: string
  css: string
  colors: { offset: number; color: string }[]
  angle?: number
}

interface RenderOptions {
  code: string
  language: string
  theme: string
  bgType: BackgroundType
  bgGradient: string
  bgSolid: string
  padding: number
  fontSize: number
  lineHeight: number
  showLineNumbers: boolean
  showWindowChrome: boolean
  showShadow: boolean
  windowTitle: string
  watermark: string
  borderRadius: number
}

// ── Themes ──

const THEMES: Record<string, ThemeColors> = {
  dracula: { bg: '#282a36', text: '#f8f8f2', keyword: '#ff79c6', string: '#f1fa8c', comment: '#6272a4', number: '#bd93f9', function: '#50fa7b', operator: '#ff79c6', lineNumber: '#6272a4', type: '#8be9fd', tag: '#ff79c6' },
  monokai: { bg: '#272822', text: '#f8f8f2', keyword: '#f92672', string: '#e6db74', comment: '#75715e', number: '#ae81ff', function: '#a6e22e', operator: '#f92672', lineNumber: '#75715e', type: '#66d9ef', tag: '#f92672' },
  oneDark: { bg: '#282c34', text: '#abb2bf', keyword: '#c678dd', string: '#98c379', comment: '#5c6370', number: '#d19a66', function: '#61afef', operator: '#56b6c2', lineNumber: '#4b5263', type: '#e5c07b', tag: '#e06c75' },
  github: { bg: '#ffffff', text: '#24292e', keyword: '#d73a49', string: '#032f62', comment: '#6a737d', number: '#005cc5', function: '#6f42c1', operator: '#d73a49', lineNumber: '#959da5', type: '#005cc5', tag: '#22863a' },
  githubDark: { bg: '#0d1117', text: '#c9d1d9', keyword: '#ff7b72', string: '#a5d6ff', comment: '#8b949e', number: '#79c0ff', function: '#d2a8ff', operator: '#ff7b72', lineNumber: '#484f58', type: '#79c0ff', tag: '#7ee787' },
  solarized: { bg: '#002b36', text: '#839496', keyword: '#859900', string: '#2aa198', comment: '#586e75', number: '#d33682', function: '#268bd2', operator: '#859900', lineNumber: '#586e75', type: '#b58900', tag: '#268bd2' },
  nord: { bg: '#2e3440', text: '#d8dee9', keyword: '#81a1c1', string: '#a3be8c', comment: '#616e88', number: '#b48ead', function: '#88c0d0', operator: '#81a1c1', lineNumber: '#4c566a', type: '#ebcb8b', tag: '#81a1c1' },
  nightOwl: { bg: '#011627', text: '#d6deeb', keyword: '#c792ea', string: '#ecc48d', comment: '#637777', number: '#f78c6c', function: '#82aaff', operator: '#c792ea', lineNumber: '#4b6479', type: '#ffcb8b', tag: '#7fdbca' },
  synthwave: { bg: '#2b213a', text: '#f0e8d6', keyword: '#ff7edb', string: '#ff8b39', comment: '#848bbd', number: '#f97e72', function: '#36f9f6', operator: '#ff7edb', lineNumber: '#495495', type: '#fede5d', tag: '#ff7edb' },
  tokyoNight: { bg: '#1a1b26', text: '#a9b1d6', keyword: '#bb9af7', string: '#9ece6a', comment: '#565f89', number: '#ff9e64', function: '#7aa2f7', operator: '#89ddff', lineNumber: '#3b4261', type: '#2ac3de', tag: '#f7768e' },
}

const THEME_DISPLAY_NAMES: Record<string, string> = {
  dracula: 'Dracula',
  monokai: 'Monokai',
  oneDark: 'One Dark',
  github: 'GitHub Light',
  githubDark: 'GitHub Dark',
  solarized: 'Solarized Dark',
  nord: 'Nord',
  nightOwl: 'Night Owl',
  synthwave: 'Synthwave',
  tokyoNight: 'Tokyo Night',
}

// ── Background Gradients ──

const GRADIENT_PRESETS: GradientPreset[] = [
  { name: 'Candy', css: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', colors: [{ offset: 0, color: '#667eea' }, { offset: 1, color: '#764ba2' }] },
  { name: 'Sunset', css: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', colors: [{ offset: 0, color: '#f093fb' }, { offset: 1, color: '#f5576c' }] },
  { name: 'Ocean', css: 'linear-gradient(135deg, #0c3483 0%, #a2b6df 100%)', colors: [{ offset: 0, color: '#0c3483' }, { offset: 1, color: '#a2b6df' }] },
  { name: 'Forest', css: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', colors: [{ offset: 0, color: '#11998e' }, { offset: 1, color: '#38ef7d' }] },
  { name: 'Fire', css: 'linear-gradient(135deg, #f12711 0%, #f5af19 100%)', colors: [{ offset: 0, color: '#f12711' }, { offset: 1, color: '#f5af19' }] },
  { name: 'Night', css: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', colors: [{ offset: 0, color: '#0f0c29' }, { offset: 0.5, color: '#302b63' }, { offset: 1, color: '#24243e' }] },
  { name: 'Peach', css: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', colors: [{ offset: 0, color: '#ffecd2' }, { offset: 1, color: '#fcb69f' }] },
  { name: 'Neon', css: 'linear-gradient(135deg, #00f260 0%, #0575e6 100%)', colors: [{ offset: 0, color: '#00f260' }, { offset: 1, color: '#0575e6' }] },
  { name: 'Aurora', css: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)', colors: [{ offset: 0, color: '#a18cd1' }, { offset: 1, color: '#fbc2eb' }] },
  { name: 'Midnight', css: 'linear-gradient(135deg, #232526 0%, #414345 100%)', colors: [{ offset: 0, color: '#232526' }, { offset: 1, color: '#414345' }] },
  { name: 'Carbon', css: '#1e1e1e', colors: [{ offset: 0, color: '#1e1e1e' }, { offset: 1, color: '#1e1e1e' }] },
  { name: 'Transparent', css: 'transparent', colors: [] },
]

// ── Language Keywords ──

const LANGUAGE_KEYWORDS: Record<string, string[]> = {
  javascript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'new', 'this', 'class', 'extends', 'import', 'export', 'default', 'from', 'async', 'await', 'try', 'catch', 'finally', 'throw', 'typeof', 'instanceof', 'in', 'of', 'yield', 'delete', 'void', 'null', 'undefined', 'true', 'false', 'NaN', 'Infinity'],
  typescript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'new', 'this', 'class', 'extends', 'import', 'export', 'default', 'from', 'async', 'await', 'try', 'catch', 'finally', 'throw', 'typeof', 'instanceof', 'in', 'of', 'yield', 'delete', 'void', 'null', 'undefined', 'true', 'false', 'type', 'interface', 'enum', 'namespace', 'as', 'is', 'keyof', 'readonly', 'abstract', 'implements', 'declare', 'module', 'never', 'unknown', 'any', 'string', 'number', 'boolean', 'symbol', 'bigint', 'object'],
  python: ['def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'break', 'continue', 'pass', 'import', 'from', 'as', 'try', 'except', 'finally', 'raise', 'with', 'yield', 'lambda', 'and', 'or', 'not', 'in', 'is', 'True', 'False', 'None', 'global', 'nonlocal', 'del', 'assert', 'async', 'await', 'self', 'print'],
  java: ['public', 'private', 'protected', 'static', 'final', 'abstract', 'class', 'interface', 'extends', 'implements', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'new', 'this', 'super', 'try', 'catch', 'finally', 'throw', 'throws', 'import', 'package', 'void', 'null', 'true', 'false', 'instanceof', 'int', 'long', 'double', 'float', 'char', 'boolean', 'byte', 'short', 'String', 'enum', 'synchronized', 'volatile'],
  go: ['func', 'return', 'if', 'else', 'for', 'range', 'switch', 'case', 'break', 'continue', 'default', 'package', 'import', 'type', 'struct', 'interface', 'map', 'chan', 'go', 'select', 'defer', 'var', 'const', 'nil', 'true', 'false', 'make', 'new', 'append', 'len', 'cap', 'fmt', 'error', 'string', 'int', 'bool', 'byte', 'float64', 'float32'],
  rust: ['fn', 'let', 'mut', 'const', 'return', 'if', 'else', 'for', 'while', 'loop', 'match', 'break', 'continue', 'struct', 'enum', 'impl', 'trait', 'pub', 'use', 'mod', 'crate', 'self', 'super', 'as', 'in', 'ref', 'move', 'async', 'await', 'unsafe', 'where', 'type', 'true', 'false', 'Some', 'None', 'Ok', 'Err', 'Self', 'dyn', 'Box', 'Vec', 'String', 'Option', 'Result', 'println', 'macro_rules'],
  html: ['html', 'head', 'body', 'div', 'span', 'p', 'a', 'img', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'tr', 'td', 'th', 'form', 'input', 'button', 'select', 'option', 'textarea', 'script', 'style', 'link', 'meta', 'title', 'header', 'footer', 'main', 'nav', 'section', 'article', 'aside', 'class', 'id', 'src', 'href', 'type', 'value', 'name'],
  css: ['color', 'background', 'background-color', 'font-size', 'font-weight', 'font-family', 'margin', 'padding', 'border', 'display', 'position', 'top', 'left', 'right', 'bottom', 'width', 'height', 'flex', 'grid', 'align-items', 'justify-content', 'overflow', 'opacity', 'z-index', 'transition', 'transform', 'animation', 'box-shadow', 'border-radius', 'text-align', 'line-height', 'cursor', 'pointer', 'none', 'block', 'inline', 'relative', 'absolute', 'fixed', 'sticky', 'inherit', 'initial', 'auto', 'important'],
  sql: ['SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'DROP', 'ALTER', 'ADD', 'INDEX', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'OUTER', 'ON', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'IS', 'NULL', 'AS', 'ORDER', 'BY', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET', 'UNION', 'ALL', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'DESC', 'ASC', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'CASCADE', 'INT', 'VARCHAR', 'TEXT', 'BOOLEAN', 'DATE', 'TIMESTAMP', 'select', 'from', 'where', 'insert', 'into', 'values', 'update', 'set', 'delete', 'create', 'table', 'drop', 'alter', 'add', 'index', 'join', 'inner', 'left', 'right', 'outer', 'on', 'and', 'or', 'not', 'in', 'like', 'between', 'is', 'null', 'as', 'order', 'by', 'group', 'having', 'limit', 'offset', 'union', 'all', 'distinct', 'count', 'sum', 'avg', 'max', 'min', 'desc', 'asc', 'primary', 'key', 'foreign', 'references', 'cascade', 'int', 'varchar', 'text', 'boolean', 'date', 'timestamp'],
  json: [],
  bash: ['if', 'then', 'else', 'elif', 'fi', 'for', 'do', 'done', 'while', 'until', 'case', 'esac', 'function', 'return', 'exit', 'echo', 'read', 'export', 'source', 'local', 'set', 'unset', 'shift', 'cd', 'ls', 'grep', 'awk', 'sed', 'cat', 'mkdir', 'rm', 'cp', 'mv', 'chmod', 'chown', 'sudo', 'apt', 'npm', 'git', 'docker', 'curl', 'wget', 'true', 'false', 'null'],
  csharp: ['using', 'namespace', 'class', 'public', 'private', 'protected', 'internal', 'static', 'void', 'int', 'string', 'bool', 'double', 'float', 'long', 'var', 'new', 'return', 'if', 'else', 'for', 'foreach', 'while', 'do', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally', 'throw', 'async', 'await', 'this', 'base', 'null', 'true', 'false', 'interface', 'abstract', 'override', 'virtual', 'sealed', 'readonly', 'const', 'enum', 'struct', 'delegate', 'event', 'get', 'set', 'value', 'where', 'select', 'from', 'in', 'is', 'as', 'typeof', 'sizeof', 'nameof', 'out', 'ref', 'params'],
  php: ['function', 'return', 'if', 'else', 'elseif', 'for', 'foreach', 'while', 'do', 'switch', 'case', 'break', 'continue', 'class', 'extends', 'implements', 'interface', 'abstract', 'public', 'private', 'protected', 'static', 'new', 'this', 'self', 'parent', 'try', 'catch', 'finally', 'throw', 'echo', 'print', 'require', 'include', 'use', 'namespace', 'null', 'true', 'false', 'array', 'string', 'int', 'float', 'bool', 'void', 'match', 'enum', 'readonly', 'fn'],
  ruby: ['def', 'end', 'class', 'module', 'return', 'if', 'else', 'elsif', 'unless', 'for', 'while', 'until', 'do', 'case', 'when', 'break', 'next', 'begin', 'rescue', 'ensure', 'raise', 'yield', 'block_given?', 'require', 'include', 'extend', 'attr_reader', 'attr_writer', 'attr_accessor', 'self', 'super', 'nil', 'true', 'false', 'and', 'or', 'not', 'in', 'puts', 'print', 'lambda', 'proc', 'new'],
  swift: ['func', 'let', 'var', 'return', 'if', 'else', 'guard', 'for', 'while', 'repeat', 'switch', 'case', 'break', 'continue', 'class', 'struct', 'enum', 'protocol', 'extension', 'import', 'public', 'private', 'internal', 'fileprivate', 'open', 'static', 'override', 'init', 'deinit', 'self', 'super', 'nil', 'true', 'false', 'try', 'catch', 'throw', 'throws', 'async', 'await', 'in', 'is', 'as', 'where', 'typealias', 'associatedtype', 'some', 'any', 'optional', 'String', 'Int', 'Double', 'Bool', 'Array', 'Dictionary', 'Set', 'print'],
  kotlin: ['fun', 'val', 'var', 'return', 'if', 'else', 'when', 'for', 'while', 'do', 'break', 'continue', 'class', 'object', 'interface', 'abstract', 'open', 'override', 'data', 'sealed', 'enum', 'import', 'package', 'public', 'private', 'protected', 'internal', 'companion', 'init', 'this', 'super', 'null', 'true', 'false', 'try', 'catch', 'finally', 'throw', 'is', 'as', 'in', 'typealias', 'suspend', 'coroutineScope', 'launch', 'async', 'await', 'println', 'print', 'String', 'Int', 'Double', 'Boolean', 'Long', 'Float', 'List', 'Map', 'Set', 'Unit', 'Nothing'],
}

const LANGUAGES = [
  { value: 'auto', label: 'Auto-detect' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'sql', label: 'SQL' },
  { value: 'json', label: 'JSON' },
  { value: 'bash', label: 'Bash / Shell' },
  { value: 'csharp', label: 'C#' },
  { value: 'php', label: 'PHP' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'swift', label: 'Swift' },
  { value: 'kotlin', label: 'Kotlin' },
]

// ── Default Code ──

const DEFAULT_CODE = `function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// Calculate the 10th Fibonacci number
console.log(fibonacci(10)); // 55`

// ── Tokenizer ──

function detectLanguage(code: string): string {
  const indicators: Record<string, RegExp[]> = {
    python: [/\bdef\s+\w+\s*\(/, /\bimport\s+\w+/, /\bprint\s*\(/, /:\s*$/, /\belif\b/],
    javascript: [/\bconst\s+/, /\blet\s+/, /\b=>\s*/, /\bconsole\./, /\bfunction\s+\w+\s*\(/],
    typescript: [/:\s*(string|number|boolean|any)\b/, /\binterface\s+/, /\btype\s+\w+\s*=/, /\bas\s+\w+/],
    java: [/\bpublic\s+(static\s+)?void\s+main/, /\bSystem\.out\./, /\bclass\s+\w+\s*(extends|implements)/],
    go: [/\bfunc\s+\w+\s*\(/, /\bpackage\s+\w+/, /\bfmt\./, /:=\s*/],
    rust: [/\bfn\s+\w+\s*\(/, /\blet\s+mut\s+/, /\bprintln!\s*\(/, /\b->\s*\w+/],
    html: [/<\w+[\s>]/, /<\/\w+>/, /<!DOCTYPE/i],
    css: [/\{[\s\S]*?:\s*[\s\S]*?;[\s\S]*?\}/, /@media\s/, /\.\w+\s*\{/],
    sql: [/\bSELECT\b.*\bFROM\b/i, /\bINSERT\s+INTO\b/i, /\bCREATE\s+TABLE\b/i],
    json: [/^\s*[\[{]/, /"[\w]+":\s*["{[\d]/],
    bash: [/^#!/, /\becho\s+/, /\$\{?\w+\}?/, /\|\s*\w+/],
    csharp: [/\busing\s+System/, /\bnamespace\s+/, /\bConsole\.Write/],
    php: [/<\?php/, /\$\w+\s*=/, /\becho\s+/, /\bfunction\s+\w+\s*\(/],
    ruby: [/\bputs\s+/, /\battr_accessor\b/, /\bdo\s*\|/, /\bend\s*$/m],
    swift: [/\bguard\s+/, /\blet\s+\w+\s*:\s*/, /\bfunc\s+\w+\s*\(.*\)\s*->/],
    kotlin: [/\bfun\s+\w+\s*\(/, /\bval\s+/, /\bprintln\s*\(/, /\bdata\s+class\b/],
  }

  let bestLang = 'javascript'
  let bestScore = 0

  for (const [lang, patterns] of Object.entries(indicators)) {
    let score = 0
    for (const pattern of patterns) {
      if (pattern.test(code)) score++
    }
    if (score > bestScore) {
      bestScore = score
      bestLang = lang
    }
  }

  return bestLang
}

function tokenizeLine(line: string, language: string): Token[] {
  const tokens: Token[] = []
  const keywords = LANGUAGE_KEYWORDS[language] || LANGUAGE_KEYWORDS['javascript'] || []
  const keywordSet = new Set(keywords)

  // Build a combined regex for the language
  const patterns: { regex: RegExp; type: Token['type'] }[] = []

  // Comments
  if (language === 'python' || language === 'ruby' || language === 'bash') {
    patterns.push({ regex: /#.*$/, type: 'comment' })
  } else if (language === 'html') {
    patterns.push({ regex: /<!--[\s\S]*?-->/, type: 'comment' })
  } else if (language === 'sql') {
    patterns.push({ regex: /--.*$/, type: 'comment' })
  } else {
    patterns.push({ regex: /\/\/.*$/, type: 'comment' })
    patterns.push({ regex: /\/\*[\s\S]*?\*\//, type: 'comment' })
  }

  // Strings
  patterns.push({ regex: /`[^`]*`/, type: 'string' })
  patterns.push({ regex: /"(?:[^"\\]|\\.)*"/, type: 'string' })
  patterns.push({ regex: /'(?:[^'\\]|\\.)*'/, type: 'string' })

  // Numbers
  patterns.push({ regex: /\b0x[0-9a-fA-F]+\b/, type: 'number' })
  patterns.push({ regex: /\b\d+\.?\d*(?:[eE][+-]?\d+)?\b/, type: 'number' })

  // HTML/JSX tags
  if (language === 'html') {
    patterns.push({ regex: /<\/?\w+[\s/>]?/, type: 'tag' })
    patterns.push({ regex: /\/?>/, type: 'tag' })
  }

  // Operators
  patterns.push({ regex: /[+\-*/%=<>!&|^~?:]+/, type: 'operator' })

  // Function calls
  patterns.push({ regex: /\b\w+(?=\s*\()/, type: 'function' })

  // Words (identifiers / keywords)
  patterns.push({ regex: /\b\w+\b/, type: 'text' })

  // Non-word non-space characters
  patterns.push({ regex: /[^\s\w]/, type: 'text' })

  // Spaces
  patterns.push({ regex: /\s+/, type: 'text' })

  let remaining = line
  let safety = 0

  while (remaining.length > 0 && safety < 1000) {
    safety++
    let bestMatch: { index: number; length: number; text: string; type: Token['type'] } | null = null

    for (const { regex, type } of patterns) {
      const match = remaining.match(regex)
      if (match && match.index !== undefined) {
        if (!bestMatch || match.index < bestMatch.index || (match.index === bestMatch.index && match[0].length > bestMatch.length)) {
          bestMatch = { index: match.index, length: match[0].length, text: match[0], type }
        }
      }
    }

    if (!bestMatch) {
      tokens.push({ text: remaining, type: 'text' })
      break
    }

    // Add any text before the match
    if (bestMatch.index > 0) {
      tokens.push({ text: remaining.substring(0, bestMatch.index), type: 'text' })
    }

    // Determine actual type
    let tokenType = bestMatch.type
    if (tokenType === 'text' || tokenType === 'function') {
      const word = bestMatch.text.trim()
      if (keywordSet.has(word)) {
        tokenType = 'keyword'
      } else if (/^[A-Z][a-zA-Z0-9]*$/.test(word) && word.length > 1) {
        tokenType = 'type'
      }
    }

    // For JSON, color keys as 'function' and values as their types
    if (language === 'json') {
      if (bestMatch.type === 'string') {
        // Check if it's a key (followed by :)
        const afterMatch = remaining.substring(bestMatch.index + bestMatch.length).trimStart()
        if (afterMatch.startsWith(':')) {
          tokenType = 'function'
        }
      }
      if (bestMatch.text === 'true' || bestMatch.text === 'false' || bestMatch.text === 'null') {
        tokenType = 'keyword'
      }
    }

    tokens.push({ text: bestMatch.text, type: tokenType })
    remaining = remaining.substring(bestMatch.index + bestMatch.length)
  }

  return tokens
}

// ── Canvas Rendering Helpers ──

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius: number) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + w - radius, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
  ctx.lineTo(x + w, y + h - radius)
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
  ctx.lineTo(x + radius, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

function drawCheckerboard(ctx: CanvasRenderingContext2D, w: number, h: number, scale: number) {
  const size = 10 * scale
  for (let y = 0; y < h; y += size) {
    for (let x = 0; x < w; x += size) {
      const isLight = ((Math.floor(x / size) + Math.floor(y / size)) % 2) === 0
      ctx.fillStyle = isLight ? '#e0e0e0' : '#cccccc'
      ctx.fillRect(x, y, size, size)
    }
  }
}

// ── Main Render Function ──

function renderToCanvas(canvas: HTMLCanvasElement, options: RenderOptions): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const scale = 2 // Retina
  const theme = THEMES[options.theme] || THEMES.dracula
  const padding = options.padding * scale
  const fontSize = options.fontSize * scale
  const lineHeightPx = fontSize * options.lineHeight

  const resolvedLang = options.language === 'auto' ? detectLanguage(options.code) : options.language
  const lines = options.code.split('\n')

  // Measure text to determine canvas dimensions
  ctx.font = `${fontSize}px "SF Mono", "Fira Code", "Cascadia Code", Consolas, "Courier New", monospace`

  const lineNumberWidth = options.showLineNumbers
    ? ctx.measureText(String(lines.length)).width + 28 * scale
    : 0

  let maxLineWidth = 0
  for (const line of lines) {
    const width = ctx.measureText(line).width
    if (width > maxLineWidth) maxLineWidth = width
  }

  const chromeHeight = options.showWindowChrome ? 44 * scale : 0
  const codePaddingH = 24 * scale
  const codePaddingV = 20 * scale

  const windowWidth = lineNumberWidth + maxLineWidth + codePaddingH * 2 + 20 * scale
  const windowHeight = chromeHeight + lines.length * lineHeightPx + codePaddingV * 2

  const totalWidth = windowWidth + padding * 2
  const totalHeight = windowHeight + padding * 2

  canvas.width = totalWidth
  canvas.height = totalHeight

  // Clear
  ctx.clearRect(0, 0, totalWidth, totalHeight)

  // 1. Draw background
  const gradientPreset = GRADIENT_PRESETS.find(g => g.css === options.bgGradient)

  if (options.bgType === 'gradient' && options.bgGradient === 'transparent') {
    drawCheckerboard(ctx, totalWidth, totalHeight, scale)
  } else if (options.bgType === 'gradient' && gradientPreset && gradientPreset.colors.length > 0) {
    // 135 degree gradient
    const gradient = ctx.createLinearGradient(0, 0, totalWidth, totalHeight)
    for (const stop of gradientPreset.colors) {
      gradient.addColorStop(stop.offset, stop.color)
    }
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, totalWidth, totalHeight)
  } else if (options.bgType === 'solid') {
    ctx.fillStyle = options.bgSolid
    ctx.fillRect(0, 0, totalWidth, totalHeight)
  } else {
    // Fallback for gradient presets that are solid colors
    ctx.fillStyle = gradientPreset?.colors[0]?.color || '#1e1e1e'
    ctx.fillRect(0, 0, totalWidth, totalHeight)
  }

  const windowX = padding
  const windowY = padding
  const borderRadius = options.borderRadius * scale

  // 2. Draw shadow
  if (options.showShadow) {
    ctx.save()
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)'
    ctx.shadowBlur = 50 * scale
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 12 * scale
    drawRoundedRect(ctx, windowX, windowY, windowWidth, windowHeight, borderRadius)
    ctx.fillStyle = theme.bg
    ctx.fill()
    ctx.restore()
  }

  // 3. Draw code window background
  drawRoundedRect(ctx, windowX, windowY, windowWidth, windowHeight, borderRadius)
  ctx.fillStyle = theme.bg
  ctx.fill()

  // Clip to rounded rect
  ctx.save()
  drawRoundedRect(ctx, windowX, windowY, windowWidth, windowHeight, borderRadius)
  ctx.clip()

  // 4. Draw window chrome
  let codeStartY = windowY + codePaddingV

  if (options.showWindowChrome) {
    const chromeY = windowY
    const dotY = chromeY + 22 * scale
    const dotX = windowX + 20 * scale
    const dotRadius = 7 * scale
    const dotSpacing = 22 * scale

    // Red dot
    ctx.beginPath()
    ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2)
    ctx.fillStyle = '#ff5f57'
    ctx.fill()

    // Yellow dot
    ctx.beginPath()
    ctx.arc(dotX + dotSpacing, dotY, dotRadius, 0, Math.PI * 2)
    ctx.fillStyle = '#febc2e'
    ctx.fill()

    // Green dot
    ctx.beginPath()
    ctx.arc(dotX + dotSpacing * 2, dotY, dotRadius, 0, Math.PI * 2)
    ctx.fillStyle = '#28c840'
    ctx.fill()

    // Title text
    if (options.windowTitle) {
      ctx.font = `${13 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
      ctx.fillStyle = hexToRgba(theme.text, 0.6)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(options.windowTitle, windowX + windowWidth / 2, dotY)
      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'
    }

    codeStartY = windowY + chromeHeight + codePaddingV
  }

  // 5. Draw code lines
  ctx.font = `${fontSize}px "SF Mono", "Fira Code", "Cascadia Code", Consolas, "Courier New", monospace`
  ctx.textBaseline = 'top'

  for (let i = 0; i < lines.length; i++) {
    const y = codeStartY + i * lineHeightPx
    const baseX = windowX + codePaddingH

    // Line numbers
    if (options.showLineNumbers) {
      ctx.fillStyle = theme.lineNumber
      ctx.textAlign = 'right'
      ctx.fillText(String(i + 1), baseX + lineNumberWidth - 16 * scale, y)
      ctx.textAlign = 'left'
    }

    // Tokenize and draw
    const tokens = tokenizeLine(lines[i], resolvedLang)
    let x = baseX + lineNumberWidth

    for (const token of tokens) {
      switch (token.type) {
        case 'keyword': ctx.fillStyle = theme.keyword; break
        case 'string': ctx.fillStyle = theme.string; break
        case 'comment': ctx.fillStyle = theme.comment; break
        case 'number': ctx.fillStyle = theme.number; break
        case 'function': ctx.fillStyle = theme.function; break
        case 'operator': ctx.fillStyle = theme.operator; break
        case 'type': ctx.fillStyle = theme.type; break
        case 'tag': ctx.fillStyle = theme.tag; break
        default: ctx.fillStyle = theme.text; break
      }
      ctx.fillText(token.text, x, y)
      x += ctx.measureText(token.text).width
    }
  }

  ctx.restore()

  // 6. Draw watermark
  if (options.watermark.trim()) {
    ctx.save()
    ctx.font = `${12 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
    ctx.fillStyle = hexToRgba(theme.text, 0.3)
    ctx.textAlign = 'right'
    ctx.textBaseline = 'bottom'
    ctx.fillText(options.watermark, windowX + windowWidth - 12 * scale, windowY + windowHeight - 8 * scale)
    ctx.restore()
  }
}

// ── Component ──

export default function CodeScreenshot() {
  const t = useTranslations('codeScreenshot')

  // State
  const [code, setCode] = useState(DEFAULT_CODE)
  const [language, setLanguage] = useState('auto')
  const [theme, setTheme] = useState('dracula')
  const [bgType, setBgType] = useState<BackgroundType>('gradient')
  const [bgGradient, setBgGradient] = useState(GRADIENT_PRESETS[0].css)
  const [bgSolid, setBgSolid] = useState('#667eea')
  const [padding, setPadding] = useState(48)
  const [fontSize, setFontSize] = useState(14)
  const [lineHeight, setLineHeight] = useState(1.6)
  const [showLineNumbers, setShowLineNumbers] = useState(true)
  const [showWindowChrome, setShowWindowChrome] = useState(true)
  const [showShadow, setShowShadow] = useState(true)
  const [windowTitle, setWindowTitle] = useState('')
  const [watermark, setWatermark] = useState('')
  const [borderRadius, setBorderRadius] = useState(12)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showGuide, setShowGuide] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const previewContainerRef = useRef<HTMLDivElement>(null)

  // Detected language display
  const detectedLang = useMemo(() => {
    if (language !== 'auto') return language
    return detectLanguage(code)
  }, [code, language])

  // Render options
  const renderOptions = useMemo<RenderOptions>(() => ({
    code,
    language,
    theme,
    bgType,
    bgGradient,
    bgSolid,
    padding,
    fontSize,
    lineHeight,
    showLineNumbers,
    showWindowChrome,
    showShadow,
    windowTitle,
    watermark,
    borderRadius,
  }), [code, language, theme, bgType, bgGradient, bgSolid, padding, fontSize, lineHeight, showLineNumbers, showWindowChrome, showShadow, windowTitle, watermark, borderRadius])

  // Re-render canvas on any option change
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    renderToCanvas(canvas, renderOptions)
  }, [renderOptions])

  // Download PNG
  const downloadPNG = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `code-screenshot-${Date.now()}.png`
      a.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  }, [])

  // Copy image to clipboard
  const copyImageToClipboard = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    try {
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/png')
      })
      if (!blob) return

      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ])
      setCopiedId('image')
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      // Fallback: download instead
      downloadPNG()
    }
  }, [downloadPNG])

  // Download SVG
  const downloadSVG = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dataUrl = canvas.toDataURL('image/png')
    const svgWidth = canvas.width / 2
    const svgHeight = canvas.height / 2

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">
  <image width="${svgWidth}" height="${svgHeight}" xlink:href="${dataUrl}" />
</svg>`

    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `code-screenshot-${Date.now()}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t('description')}
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Left Panel: Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Theme Selector */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('theme')}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {Object.entries(THEMES).map(([key, colors]) => (
                <button
                  key={key}
                  onClick={() => setTheme(key)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                    theme === key
                      ? 'ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-gray-800'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <div
                    className="w-5 h-5 rounded-sm flex-shrink-0 border border-gray-200 dark:border-gray-600"
                    style={{ backgroundColor: colors.bg }}
                  />
                  <span className="text-gray-700 dark:text-gray-300 truncate">
                    {THEME_DISPLAY_NAMES[key]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Background Selector */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <ImageIcon className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('background')}
              </h2>
            </div>

            {/* Background type toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setBgType('gradient')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  bgType === 'gradient'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                {t('bgGradient')}
              </button>
              <button
                onClick={() => setBgType('solid')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  bgType === 'solid'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                {t('bgSolid')}
              </button>
            </div>

            {bgType === 'gradient' ? (
              <div className="grid grid-cols-4 gap-2">
                {GRADIENT_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => setBgGradient(preset.css)}
                    title={preset.name}
                    className={`w-full aspect-square rounded-lg transition-all ${
                      bgGradient === preset.css
                        ? 'ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-gray-800 scale-105'
                        : 'hover:scale-105'
                    }`}
                    style={{
                      background: preset.css === 'transparent'
                        ? 'repeating-conic-gradient(#e0e0e0 0% 25%, #cccccc 0% 50%) 50% / 16px 16px'
                        : preset.css,
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={bgSolid}
                  onChange={(e) => setBgSolid(e.target.value)}
                  className="w-12 h-10 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                />
                <input
                  type="text"
                  value={bgSolid}
                  onChange={(e) => setBgSolid(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                />
              </div>
            )}

            {/* Padding slider */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('padding')}: <span className="text-blue-600 font-bold">{padding}px</span>
              </label>
              <input
                type="range"
                min={0}
                max={128}
                step={8}
                value={padding}
                onChange={(e) => setPadding(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>0</span>
                <span>128</span>
              </div>
            </div>

            {/* Border radius */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('borderRadius')}: <span className="text-blue-600 font-bold">{borderRadius}px</span>
              </label>
              <input
                type="range"
                min={0}
                max={24}
                step={2}
                value={borderRadius}
                onChange={(e) => setBorderRadius(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>
          </div>

          {/* Code Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('settings')}
              </h2>
            </div>

            {/* Language */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <div className="flex items-center gap-2">
                  <Code className="w-4 h-4" />
                  {t('language')}
                  {language === 'auto' && (
                    <span className="text-xs text-blue-500 font-normal">
                      ({t('detected')}: {detectedLang})
                    </span>
                  )}
                </div>
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.value} value={lang.value}>{lang.label}</option>
                ))}
              </select>
            </div>

            {/* Font Size */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <div className="flex items-center gap-2">
                  <Type className="w-4 h-4" />
                  {t('fontSize')}: <span className="text-blue-600 font-bold">{fontSize}px</span>
                </div>
              </label>
              <input
                type="range"
                min={10}
                max={24}
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>10</span>
                <span>24</span>
              </div>
            </div>

            {/* Line Height */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('lineHeight')}: <span className="text-blue-600 font-bold">{lineHeight.toFixed(1)}</span>
              </label>
              <input
                type="range"
                min={1.2}
                max={2.4}
                step={0.1}
                value={lineHeight}
                onChange={(e) => setLineHeight(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>1.2</span>
                <span>2.4</span>
              </div>
            </div>

            {/* Window Title */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('windowTitle')}
              </label>
              <input
                type="text"
                value={windowTitle}
                onChange={(e) => setWindowTitle(e.target.value)}
                placeholder={t('windowTitle')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            {/* Watermark */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('watermark')}
              </label>
              <input
                type="text"
                value={watermark}
                onChange={(e) => setWatermark(e.target.value)}
                placeholder={t('watermarkPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            {/* Toggles */}
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showLineNumbers}
                  onChange={(e) => setShowLineNumbers(e.target.checked)}
                  className="w-4 h-4 accent-blue-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  {t('lineNumbers')}
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showWindowChrome}
                  onChange={(e) => setShowWindowChrome(e.target.checked)}
                  className="w-4 h-4 accent-blue-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {t('windowChrome')}
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showShadow}
                  onChange={(e) => setShowShadow(e.target.checked)}
                  className="w-4 h-4 accent-blue-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {t('shadow')}
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Right Panel: Code Input + Preview + Export */}
        <div className="lg:col-span-3 space-y-6">
          {/* Code Input */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
            <div className="flex items-center gap-2 mb-3">
              <Code className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('codeInput')}
              </h2>
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t('codePlaceholder')}
              rows={10}
              spellCheck={false}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 font-mono text-sm leading-relaxed resize-y"
            />
          </div>

          {/* Preview */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('preview')}
                </h2>
              </div>
              <span className="text-xs text-gray-400">
                2x {t('retina')}
              </span>
            </div>
            <div
              ref={previewContainerRef}
              className="overflow-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900"
              style={{ maxHeight: '600px' }}
            >
              <canvas
                ref={canvasRef}
                className="block mx-auto"
                style={{ maxWidth: '100%', height: 'auto' }}
              />
            </div>
          </div>

          {/* Export Buttons */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <Download className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('exportTitle')}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Download PNG */}
              <button
                onClick={downloadPNG}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all"
              >
                <Download className="w-4 h-4" />
                {t('exportPng')}
              </button>

              {/* Copy to Clipboard */}
              <button
                onClick={copyImageToClipboard}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-medium hover:from-green-700 hover:to-emerald-700 transition-all"
              >
                {copiedId === 'image' ? (
                  <>
                    <Check className="w-4 h-4" />
                    {t('copied')}
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    {t('copyImage')}
                  </>
                )}
              </button>

              {/* Download SVG */}
              <button
                onClick={downloadSVG}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
              >
                <Download className="w-4 h-4" />
                {t('exportSvg')}
              </button>
            </div>

            <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
              {t('exportNote')}
            </p>
          </div>
        </div>
      </div>

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="flex items-center gap-2 w-full text-left"
        >
          <BookOpen className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('guide.title')}
          </h2>
          <span className={`ml-auto text-gray-400 transition-transform ${showGuide ? 'rotate-180' : ''}`}>
            &#9660;
          </span>
        </button>

        {showGuide && (
          <div className="mt-6 space-y-6">
            {/* Section 1 */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                {t('guide.usage.title')}
              </h3>
              <ul className="space-y-2">
                {(t.raw('guide.usage.items') as string[]).map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="text-blue-500 mt-0.5">&#8226;</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Section 2 */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                {t('guide.tips.title')}
              </h3>
              <ul className="space-y-2">
                {(t.raw('guide.tips.items') as string[]).map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="text-green-500 mt-0.5">&#10003;</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
