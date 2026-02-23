'use client'

import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { useTranslations } from 'next-intl'

// ── Markdown-to-HTML converter (no external libraries) ──────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function processInline(text: string): string {
  // Images before links (both start with !)
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="md-img" />')
  // Links
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="md-link" target="_blank" rel="noopener noreferrer">$1</a>')
  // Bold+italic combo ***
  text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  // Bold
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  // Italic
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>')
  // Strikethrough
  text = text.replace(/~~(.+?)~~/g, '<del>$1</del>')
  // Inline code (done last among formatting to avoid double-escaping)
  text = text.replace(/`([^`]+)`/g, '<code class="md-code-inline">$1</code>')
  return text
}

function markdownToHtml(md: string): string {
  if (!md.trim()) return ''

  const lines = md.split('\n')
  const output: string[] = []
  let i = 0

  while (i < lines.length) {
    const raw = lines[i]

    // ── Fenced code block ────────────────────────────────────────────────────
    const fenceMatch = raw.match(/^```(\w*)/)
    if (fenceMatch) {
      const lang = fenceMatch[1] || 'text'
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(escapeHtml(lines[i]))
        i++
      }
      i++ // consume closing ```
      output.push(
        `<pre class="md-pre"><code class="md-code-block language-${lang}">${codeLines.join('\n')}</code></pre>`
      )
      continue
    }

    const line = escapeHtml(raw)

    // ── Blank line ───────────────────────────────────────────────────────────
    if (raw.trim() === '') {
      output.push('<div class="md-spacer"></div>')
      i++
      continue
    }

    // ── Headings ─────────────────────────────────────────────────────────────
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const text = processInline(headingMatch[2])
      const id = headingMatch[2]
        .toLowerCase()
        .replace(/[^a-z0-9가-힣\s]/g, '')
        .trim()
        .replace(/\s+/g, '-')
      output.push(`<h${level} id="${id}" class="md-h${level}">${text}</h${level}>`)
      i++
      continue
    }

    // ── Horizontal rule ──────────────────────────────────────────────────────
    if (/^[-*_]{3,}$/.test(raw.trim())) {
      output.push('<hr class="md-hr" />')
      i++
      continue
    }

    // ── Blockquote ───────────────────────────────────────────────────────────
    if (raw.startsWith('> ') || raw === '>') {
      const quoteLines: string[] = []
      while (i < lines.length && (lines[i].startsWith('> ') || lines[i] === '>')) {
        quoteLines.push(processInline(escapeHtml(lines[i].replace(/^>\s?/, ''))))
        i++
      }
      output.push(`<blockquote class="md-blockquote">${quoteLines.join('<br />')}</blockquote>`)
      continue
    }

    // ── Table ────────────────────────────────────────────────────────────────
    if (raw.includes('|') && i + 1 < lines.length && /^\|?\s*[-:]+[-|\s:]*$/.test(lines[i + 1])) {
      const tableRows: string[][] = []
      // Header row
      const headerCells = raw
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((c) => c.trim())
      tableRows.push(headerCells)
      // Separator
      const sepLine = lines[i + 1]
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((c) => c.trim())
      const aligns = sepLine.map((s) => {
        if (s.startsWith(':') && s.endsWith(':')) return 'center'
        if (s.endsWith(':')) return 'right'
        return 'left'
      })
      i += 2
      // Data rows
      while (i < lines.length && lines[i].includes('|') && !lines[i].startsWith('|---')) {
        const cells = lines[i]
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map((c) => c.trim())
        tableRows.push(cells)
        i++
      }
      let tableHtml = '<div class="md-table-wrap"><table class="md-table"><thead><tr>'
      headerCells.forEach((cell, idx) => {
        const align = aligns[idx] || 'left'
        tableHtml += `<th class="md-th" style="text-align:${align}">${processInline(cell)}</th>`
      })
      tableHtml += '</tr></thead><tbody>'
      for (let r = 1; r < tableRows.length; r++) {
        tableHtml += '<tr>'
        tableRows[r].forEach((cell, idx) => {
          const align = aligns[idx] || 'left'
          tableHtml += `<td class="md-td" style="text-align:${align}">${processInline(cell)}</td>`
        })
        tableHtml += '</tr>'
      }
      tableHtml += '</tbody></table></div>'
      output.push(tableHtml)
      continue
    }

    // ── Unordered list (with task list support) ──────────────────────────────
    if (/^[-*+]\s/.test(raw)) {
      const listItems: string[] = []
      while (i < lines.length && /^[-*+]\s/.test(lines[i])) {
        const itemRaw = lines[i].replace(/^[-*+]\s/, '')
        const taskDone = /^\[x\]\s/i.test(itemRaw)
        const taskTodo = /^\[ \]\s/.test(itemRaw)
        let itemText: string
        if (taskDone) {
          itemText = `<input type="checkbox" checked disabled class="md-checkbox" /> <span class="md-task-done">${processInline(escapeHtml(itemRaw.replace(/^\[x\]\s/i, '')))}</span>`
        } else if (taskTodo) {
          itemText = `<input type="checkbox" disabled class="md-checkbox" /> ${processInline(escapeHtml(itemRaw.replace(/^\[ \]\s/, '')))}`
        } else {
          itemText = processInline(escapeHtml(itemRaw))
        }
        listItems.push(`<li class="md-li">${itemText}</li>`)
        i++
      }
      output.push(`<ul class="md-ul">${listItems.join('')}</ul>`)
      continue
    }

    // ── Ordered list ─────────────────────────────────────────────────────────
    if (/^\d+\.\s/.test(raw)) {
      const listItems: string[] = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        const itemText = processInline(escapeHtml(lines[i].replace(/^\d+\.\s/, '')))
        listItems.push(`<li class="md-li">${itemText}</li>`)
        i++
      }
      output.push(`<ol class="md-ol">${listItems.join('')}</ol>`)
      continue
    }

    // ── Paragraph ────────────────────────────────────────────────────────────
    const paraLines: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].match(/^#{1,6}\s/) &&
      !lines[i].startsWith('```') &&
      !lines[i].startsWith('> ') &&
      !lines[i].includes('|') &&
      !/^[-*+]\s/.test(lines[i]) &&
      !/^\d+\.\s/.test(lines[i]) &&
      !/^[-*_]{3,}$/.test(lines[i].trim())
    ) {
      paraLines.push(processInline(escapeHtml(lines[i])))
      i++
    }
    if (paraLines.length > 0) {
      output.push(`<p class="md-p">${paraLines.join('<br />')}</p>`)
    }
  }

  return output.join('\n')
}

// ── Default sample content ───────────────────────────────────────────────────

const DEFAULT_CONTENT = `# 마크다운 에디터 사용 가이드

마크다운 에디터에 오신 것을 환영합니다! 왼쪽에서 편집하면 오른쪽에 실시간으로 미리보기가 표시됩니다.

## 텍스트 서식

**볼드 텍스트**는 \`**텍스트**\`로 작성합니다.
*이탤릭 텍스트*는 \`*텍스트*\`로 작성합니다.
***볼드+이탤릭***은 \`***텍스트***\`로 작성합니다.
~~취소선~~은 \`~~텍스트~~\`로 작성합니다.
인라인 코드는 \`백틱\`으로 감쌉니다.

## 제목 (H1 ~ H6)

# H1 제목
## H2 제목
### H3 제목
#### H4 제목
##### H5 제목
###### H6 제목

## 목록

### 순서 없는 목록
- 항목 1
- 항목 2
- 항목 3

### 순서 있는 목록
1. 첫 번째 단계
2. 두 번째 단계
3. 세 번째 단계

### 체크리스트 (Task List)
- [x] 완료된 작업
- [ ] 미완료 작업
- [x] 또 다른 완료 작업

## 링크와 이미지

[툴허브 바로가기](https://toolhub.ai.kr)

![이미지 예시](https://via.placeholder.com/400x200?text=Sample+Image)

## 인용문

> 마크다운은 2004년 존 그루버가 만든 경량 마크업 언어입니다.
> 일반 텍스트로 서식 있는 문서를 쉽게 작성할 수 있습니다.

## 코드 블록

\`\`\`javascript
function greet(name) {
  const message = \`Hello, \${name}!\`;
  console.log(message);
  return message;
}

greet('ToolHub');
\`\`\`

\`\`\`python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

print(fibonacci(10))
\`\`\`

## 표 (Table)

| 기능 | 단축키 | 설명 |
|:-----|:------:|-----:|
| 볼드 | Ctrl+B | 텍스트 굵게 |
| 이탤릭 | Ctrl+I | 텍스트 기울임 |
| 저장 | Ctrl+S | 파일 저장 |

## 수평선

---

## 마치며

이 에디터로 GitHub README, 기술 블로그, 회의록 등 다양한 마크다운 문서를 작성해 보세요!
`

// ── Component ─────────────────────────────────────────────────────────────────

type ViewMode = 'split' | 'editor' | 'preview'

export default function MarkdownEditor() {
  const t = useTranslations('markdownEditor')
  const [markdown, setMarkdown] = useState(DEFAULT_CONTENT)
  const [viewMode, setViewMode] = useState<ViewMode>('split')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showHeadingMenu, setShowHeadingMenu] = useState(false)
  const [showToc, setShowToc] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const headingMenuRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Close heading dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (headingMenuRef.current && !headingMenuRef.current.contains(e.target as Node)) {
        setShowHeadingMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Parsed HTML (memoised)
  const parsedHtml = useMemo(() => markdownToHtml(markdown), [markdown])

  // Word and char counts
  const charCount = markdown.length
  const wordCount = markdown.trim() === '' ? 0 : markdown.trim().split(/\s+/).length

  // ── TOC extraction ──────────────────────────────────────────────────────────
  const tocItems = useMemo(() => {
    const headings: { level: number; text: string; id: string }[] = []
    const lines = markdown.split('\n')
    for (const line of lines) {
      const match = line.match(/^(#{1,6})\s+(.+)$/)
      if (match) {
        const level = match[1].length
        const text = match[2].replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/`(.+?)`/g, '$1')
        const id = text
          .toLowerCase()
          .replace(/[^a-z0-9가-힣\s]/g, '')
          .trim()
          .replace(/\s+/g, '-')
        headings.push({ level, text, id })
      }
    }
    return headings
  }, [markdown])

  // ── File upload handler ─────────────────────────────────────────────────────
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const content = ev.target?.result as string
      if (content) setMarkdown(content)
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [])

  // ── Clipboard helper ───────────────────────────────────────────────────────
  const copyToClipboard = useCallback(async (text: string, id: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.left = '-999999px'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
    } catch {
      // ignore
    }
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  // ── Download .md ───────────────────────────────────────────────────────────
  const downloadMd = useCallback(() => {
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `document-${Date.now()}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [markdown])

  // ── Insert markdown syntax at cursor ──────────────────────────────────────
  const insertMarkdown = useCallback(
    (before: string, after = '', placeholder = '') => {
      const ta = textareaRef.current
      if (!ta) return
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const selected = ta.value.substring(start, end)
      const inserted = before + (selected || placeholder) + after
      const newValue = ta.value.substring(0, start) + inserted + ta.value.substring(end)
      setMarkdown(newValue)
      setTimeout(() => {
        const newStart = start + before.length
        const newEnd = newStart + (selected || placeholder).length
        ta.setSelectionRange(newStart, newEnd)
        ta.focus()
      }, 0)
    },
    []
  )

  // ── Insert block at start of line ─────────────────────────────────────────
  const insertBlock = useCallback(
    (prefix: string, placeholder = '') => {
      const ta = textareaRef.current
      if (!ta) return
      const start = ta.selectionStart
      // Find line start
      const before = ta.value.substring(0, start)
      const lineStart = before.lastIndexOf('\n') + 1
      const newValue =
        ta.value.substring(0, lineStart) +
        prefix +
        (ta.value.substring(lineStart) || placeholder)
      setMarkdown(newValue)
      setTimeout(() => {
        ta.setSelectionRange(lineStart + prefix.length, lineStart + prefix.length + (ta.value.substring(lineStart) || placeholder).length)
        ta.focus()
      }, 0)
    },
    []
  )

  // ── Insert template at cursor ─────────────────────────────────────────────
  const insertAtCursor = useCallback((text: string) => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const newValue = ta.value.substring(0, start) + text + ta.value.substring(ta.selectionEnd)
    setMarkdown(newValue)
    setTimeout(() => {
      ta.setSelectionRange(start + text.length, start + text.length)
      ta.focus()
    }, 0)
  }, [])

  // ── Toolbar button styles ─────────────────────────────────────────────────
  const btnCls =
    'px-2 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition-colors select-none'
  const btnActiveCls = 'px-2 py-1.5 text-xs font-medium bg-blue-600 text-white rounded transition-colors select-none'

  const viewBtnCls = (mode: ViewMode) =>
    viewMode === mode ? btnActiveCls : btnCls

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col'
          : 'flex flex-col'
      }
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 mb-3 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
            {t('title')}
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('description')}</p>
        </div>

        {/* View mode toggles */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button className={viewBtnCls('split')} onClick={() => setViewMode('split')}>
            {t('split')}
          </button>
          <button className={viewBtnCls('editor')} onClick={() => setViewMode('editor')}>
            {t('editorOnly')}
          </button>
          <button className={viewBtnCls('preview')} onClick={() => setViewMode('preview')}>
            {t('previewOnly')}
          </button>
        </div>

        {/* File upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.txt,.markdown"
          onChange={handleFileUpload}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className={btnCls}
          title={t('upload')}
        >
          {t('upload')}
        </button>

        {/* TOC */}
        <button
          onClick={() => setShowToc((v) => !v)}
          className={showToc ? btnActiveCls : btnCls}
          title={t('toc')}
        >
          {t('toc')}
        </button>

        {/* Fullscreen */}
        <button
          onClick={() => setIsFullscreen((f) => !f)}
          className={btnCls}
          title={isFullscreen ? t('exitFullscreen') : t('fullscreen')}
        >
          {isFullscreen ? (
            <span>{t('exitFullscreen')}</span>
          ) : (
            <span>{t('fullscreen')}</span>
          )}
        </button>
      </div>

      {/* ── Toolbar ────────────────────────────────────────────────────────── */}
      {(viewMode === 'split' || viewMode === 'editor') && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg px-4 py-3 mb-3">
          <div className="flex flex-wrap gap-1.5 items-center">
            {/* Bold */}
            <button
              className={`${btnCls} font-bold`}
              title={t('bold')}
              onClick={() => insertMarkdown('**', '**', t('bold'))}
            >
              B
            </button>
            {/* Italic */}
            <button
              className={`${btnCls} italic`}
              title={t('italic')}
              onClick={() => insertMarkdown('*', '*', t('italic'))}
            >
              I
            </button>
            {/* Strikethrough */}
            <button
              className={`${btnCls} line-through`}
              title={t('strikethrough')}
              onClick={() => insertMarkdown('~~', '~~', t('strikethrough'))}
            >
              S
            </button>

            <div className="w-px h-5 bg-gray-300 dark:bg-gray-600" />

            {/* Heading dropdown */}
            <div className="relative" ref={headingMenuRef}>
              <button
                className={btnCls}
                title={t('heading')}
                onClick={() => setShowHeadingMenu((v) => !v)}
              >
                {t('heading')} ▾
              </button>
              {showHeadingMenu && (
                <div className="absolute top-full left-0 mt-1 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden">
                  {[1, 2, 3, 4, 5, 6].map((level) => (
                    <button
                      key={level}
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                      onClick={() => {
                        insertBlock('#'.repeat(level) + ' ', `H${level} ${t('insert.heading')}`)
                        setShowHeadingMenu(false)
                      }}
                    >
                      {'#'.repeat(level)} H{level}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="w-px h-5 bg-gray-300 dark:bg-gray-600" />

            {/* Unordered list */}
            <button
              className={btnCls}
              title={t('unorderedList')}
              onClick={() => insertBlock('- ', t('insert.listItem'))}
            >
              {t('unorderedList')}
            </button>
            {/* Ordered list */}
            <button
              className={btnCls}
              title={t('orderedList')}
              onClick={() => insertBlock('1. ', t('insert.listItem'))}
            >
              {t('orderedList')}
            </button>
            {/* Task list */}
            <button
              className={btnCls}
              title={t('taskList')}
              onClick={() => insertBlock('- [ ] ', t('insert.taskItem'))}
            >
              {t('taskList')}
            </button>

            <div className="w-px h-5 bg-gray-300 dark:bg-gray-600" />

            {/* Link */}
            <button
              className={btnCls}
              title={t('link')}
              onClick={() => insertMarkdown('[', '](https://)', t('insert.linkText'))}
            >
              {t('link')}
            </button>
            {/* Image */}
            <button
              className={btnCls}
              title={t('image')}
              onClick={() => insertMarkdown('![', '](https://)', t('insert.imageAlt'))}
            >
              {t('image')}
            </button>
            {/* Code inline */}
            <button
              className={btnCls}
              title={t('codeInline')}
              onClick={() => insertMarkdown('`', '`', 'code')}
            >
              {t('codeInline')}
            </button>
            {/* Code block */}
            <button
              className={btnCls}
              title={t('codeBlock')}
              onClick={() =>
                insertAtCursor(`\`\`\`javascript\n${t('insert.codeContent')}\n\`\`\`\n`)
              }
            >
              {t('codeBlock')}
            </button>

            <div className="w-px h-5 bg-gray-300 dark:bg-gray-600" />

            {/* Quote */}
            <button
              className={btnCls}
              title={t('quote')}
              onClick={() => insertBlock('> ', t('insert.quoteContent'))}
            >
              {t('quote')}
            </button>
            {/* Horizontal rule */}
            <button
              className={btnCls}
              title={t('horizontalRule')}
              onClick={() => insertAtCursor('\n---\n')}
            >
              {t('horizontalRule')}
            </button>
            {/* Table */}
            <button
              className={btnCls}
              title={t('table')}
              onClick={() =>
                insertAtCursor(
                  `\n| ${t('insert.tableHeader')}1 | ${t('insert.tableHeader')}2 | ${t('insert.tableHeader')}3 |\n|-------|-------|-------|\n| ${t('insert.tableCell')}1 | ${t('insert.tableCell')}2 | ${t('insert.tableCell')}3 |\n| ${t('insert.tableCell')}4 | ${t('insert.tableCell')}5 | ${t('insert.tableCell')}6 |\n`
                )
              }
            >
              {t('table')}
            </button>
          </div>
        </div>
      )}

      {/* ── Main pane ──────────────────────────────────────────────────────── */}
      <div className={`flex gap-3 ${isFullscreen ? 'flex-1 overflow-hidden' : ''}`}>
        {/* TOC sidebar */}
        {showToc && (
          <div className="w-56 flex-shrink-0 bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden flex flex-col hidden lg:flex">
            <div className="bg-gray-50 dark:bg-gray-700 px-4 py-2.5 border-b border-gray-200 dark:border-gray-600">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('toc')}</span>
            </div>
            <nav className="flex-1 overflow-y-auto p-3">
              {tocItems.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500">{t('tocEmpty')}</p>
              ) : (
                <ul className="space-y-1">
                  {tocItems.map((item, idx) => (
                    <li key={idx}>
                      <button
                        onClick={() => {
                          const el = document.getElementById(item.id)
                          el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        }}
                        className="text-left w-full text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 truncate transition-colors"
                        style={{ paddingLeft: `${(item.level - 1) * 12}px` }}
                      >
                        {item.text}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </nav>
          </div>
        )}

        {/* Editor + Preview */}
        <div
          className={`flex gap-3 flex-1 min-w-0 ${
            viewMode === 'split'
              ? 'flex-col lg:flex-row'
              : 'flex-col'
          }`}
        >
        {/* Editor */}
        {(viewMode === 'split' || viewMode === 'editor') && (
          <div
            className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden flex flex-col ${
              viewMode === 'split' ? 'flex-1' : 'w-full'
            } ${isFullscreen ? 'overflow-hidden' : ''}`}
          >
            <div className="bg-gray-50 dark:bg-gray-700 px-4 py-2.5 border-b border-gray-200 dark:border-gray-600 flex items-center">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t('editor')}
              </span>
            </div>
            <textarea
              ref={textareaRef}
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              className={`flex-1 w-full p-4 font-mono text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset ${
                isFullscreen ? 'h-full' : 'min-h-[400px]'
              }`}
              spellCheck={false}
              placeholder={t('placeholder')}
              aria-label={t('editor')}
            />
          </div>
        )}

        {/* Preview */}
        {(viewMode === 'split' || viewMode === 'preview') && (
          <div
            className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden flex flex-col ${
              viewMode === 'split' ? 'flex-1' : 'w-full'
            } ${isFullscreen ? 'overflow-hidden' : ''}`}
          >
            <div className="bg-gray-50 dark:bg-gray-700 px-4 py-2.5 border-b border-gray-200 dark:border-gray-600 flex items-center">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t('preview')}
              </span>
            </div>
            <div
              className={`flex-1 p-4 md-preview overflow-auto ${
                isFullscreen ? 'h-full' : 'min-h-[400px]'
              }`}
              dangerouslySetInnerHTML={{ __html: parsedHtml }}
            />
          </div>
        )}
        </div>
      </div>

      {/* ── Status bar + export ─────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg px-4 py-3 mt-3 flex flex-wrap items-center justify-between gap-3">
        {/* Counts */}
        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <span>{t('wordCount')}: <span className="font-medium text-gray-700 dark:text-gray-300">{wordCount.toLocaleString()}</span></span>
          <span>{t('charCount')}: <span className="font-medium text-gray-700 dark:text-gray-300">{charCount.toLocaleString()}</span></span>
        </div>

        {/* Export buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={downloadMd}
            className="px-3 py-1.5 text-xs font-medium bg-orange-100 dark:bg-orange-900/40 hover:bg-orange-200 dark:hover:bg-orange-800/60 text-orange-700 dark:text-orange-300 rounded-lg transition-colors"
          >
            {t('exportMd')}
          </button>
          <button
            onClick={() => copyToClipboard(markdown, 'md')}
            className="px-3 py-1.5 text-xs font-medium bg-green-100 dark:bg-green-900/40 hover:bg-green-200 dark:hover:bg-green-800/60 text-green-700 dark:text-green-300 rounded-lg transition-colors"
          >
            {copiedId === 'md' ? t('copied') : t('copyMarkdown')}
          </button>
          <button
            onClick={() => copyToClipboard(parsedHtml, 'html')}
            className="px-3 py-1.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-800/60 text-blue-700 dark:text-blue-300 rounded-lg transition-colors"
          >
            {copiedId === 'html' ? t('copied') : t('copyHtml')}
          </button>
        </div>
      </div>

      {/* ── Preview styles ──────────────────────────────────────────────────── */}
      <style jsx global>{`
        .md-preview { color: inherit; line-height: 1.7; }

        .md-preview .md-h1 { font-size: 1.875rem; font-weight: 700; margin: 1.5rem 0 1rem; border-bottom: 2px solid #e5e7eb; padding-bottom: 0.5rem; }
        .md-preview .md-h2 { font-size: 1.5rem; font-weight: 700; margin: 1.25rem 0 0.75rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.375rem; }
        .md-preview .md-h3 { font-size: 1.25rem; font-weight: 600; margin: 1rem 0 0.5rem; }
        .md-preview .md-h4 { font-size: 1.125rem; font-weight: 600; margin: 0.875rem 0 0.5rem; }
        .md-preview .md-h5 { font-size: 1rem; font-weight: 600; margin: 0.75rem 0 0.375rem; }
        .md-preview .md-h6 { font-size: 0.875rem; font-weight: 600; margin: 0.75rem 0 0.375rem; color: #6b7280; }

        .dark .md-preview .md-h1,
        .dark .md-preview .md-h2 { border-color: #374151; }

        .md-preview .md-p { margin: 0.75rem 0; }
        .md-preview .md-spacer { margin: 0.5rem 0; }

        .md-preview .md-blockquote {
          border-left: 4px solid #6366f1;
          padding: 0.5rem 1rem;
          margin: 1rem 0;
          color: #6b7280;
          font-style: italic;
          background: #f5f3ff;
          border-radius: 0 0.5rem 0.5rem 0;
        }
        .dark .md-preview .md-blockquote {
          background: rgba(99,102,241,0.1);
          color: #9ca3af;
        }

        .md-preview .md-pre {
          background: #1f2937;
          color: #f9fafb;
          padding: 1rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          margin: 1rem 0;
          font-size: 0.875rem;
          line-height: 1.6;
        }
        .md-preview .md-code-inline {
          background: #f3f4f6;
          color: #dc2626;
          padding: 0.1rem 0.35rem;
          border-radius: 0.25rem;
          font-family: ui-monospace, monospace;
          font-size: 0.875em;
        }
        .dark .md-preview .md-code-inline {
          background: #374151;
          color: #f87171;
        }

        .md-preview .md-ul { list-style: disc; padding-left: 1.75rem; margin: 0.75rem 0; }
        .md-preview .md-ol { list-style: decimal; padding-left: 1.75rem; margin: 0.75rem 0; }
        .md-preview .md-li { margin: 0.25rem 0; }
        .md-preview .md-checkbox { margin-right: 0.4rem; accent-color: #6366f1; }
        .md-preview .md-task-done { text-decoration: line-through; color: #9ca3af; }

        .md-preview .md-table-wrap { overflow-x: auto; margin: 1rem 0; }
        .md-preview .md-table { width: 100%; border-collapse: collapse; }
        .md-preview .md-th,
        .md-preview .md-td {
          border: 1px solid #d1d5db;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
        }
        .md-preview .md-th {
          background: #f9fafb;
          font-weight: 600;
        }
        .dark .md-preview .md-th { background: #374151; }
        .dark .md-preview .md-th,
        .dark .md-preview .md-td { border-color: #4b5563; }

        .md-preview .md-link { color: #6366f1; text-decoration: underline; }
        .md-preview .md-link:hover { color: #4f46e5; }

        .md-preview .md-img { max-width: 100%; height: auto; border-radius: 0.5rem; margin: 0.75rem 0; display: block; }

        .md-preview .md-hr {
          border: none;
          height: 2px;
          background: #e5e7eb;
          margin: 1.5rem 0;
          border-radius: 1px;
        }
        .dark .md-preview .md-hr { background: #374151; }
      `}</style>
    </div>
  )
}
