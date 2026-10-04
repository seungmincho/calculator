'use client'

import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/markdownEditor'
import GuideSection from '@/components/GuideSection'
import { renderMarkdown, textStats, htmlDocument, plain, MD_CSS } from '@/utils/markdown'

type ViewMode = 'split' | 'editor' | 'preview'

const DRAFT_KEY = 'toolhub-markdown-draft'
const MAX_IMAGE_BYTES = 2 * 1024 * 1024 // base64로 문서에 박히고 localStorage(약 5MB)에 저장되므로 제한

const fileBase = (title: string) => (title.replace(/[\\/:*?"<>|\n]/g, '').trim().slice(0, 40) || 'document')

export default function MarkdownEditor() {
  const t = useTranslations('markdownEditor')
  const sample = t('sample')
  const [markdown, setMarkdown] = useState(sample)
  const [viewMode, setViewMode] = useState<ViewMode>('split')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showHeadingMenu, setShowHeadingMenu] = useState(false)
  const [showToc, setShowToc] = useState(false)
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'failed'>('idle')
  const [notice, setNotice] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const headingMenuRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const loaded = useRef(false)

  // ── 마운트: 초안 복원 + 모바일은 편집/미리보기 탭 방식 ──
  useEffect(() => {
    try {
      const draft = localStorage.getItem(DRAFT_KEY)
      if (draft !== null) setMarkdown(draft)
    } catch { /* storage 차단 */ }
    if (!window.matchMedia('(min-width: 1024px)').matches) setViewMode('editor')
    loaded.current = true
  }, [])

  // ── 자동 저장 (예제 그대로면 저장 안 함) ──
  useEffect(() => {
    if (!loaded.current) return
    const id = setTimeout(() => {
      try {
        if (markdown === sample) localStorage.removeItem(DRAFT_KEY)
        else localStorage.setItem(DRAFT_KEY, markdown)
        setSaveState(markdown === sample ? 'idle' : 'saved')
      } catch {
        setSaveState('failed')
      }
    }, 600)
    return () => clearTimeout(id)
  }, [markdown, sample])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (headingMenuRef.current && !headingMenuRef.current.contains(e.target as Node)) setShowHeadingMenu(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (!isFullscreen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsFullscreen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isFullscreen])

  useEffect(() => {
    if (!notice) return
    const id = setTimeout(() => setNotice(''), 4000)
    return () => clearTimeout(id)
  }, [notice])

  const { html, headings } = useMemo(() => renderMarkdown(markdown), [markdown])
  const stats = useMemo(() => textStats(markdown), [markdown])
  const docTitle = headings[0]?.text || plain(markdown.split('\n').find((l) => l.trim()) ?? '') || 'document'

  const flash = useCallback((id: string) => {
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  const copyText = useCallback(async (text: string, id: string) => {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.left = '-999999px'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
    } catch { /* ignore */ }
    flash(id)
  }, [flash])

  // 블로그·노션·구글문서에 붙여넣으면 서식이 유지되는 복사 (text/html + text/plain)
  const copyRich = useCallback(async () => {
    try {
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': new Blob([html], { type: 'text/html' }),
            'text/plain': new Blob([markdown], { type: 'text/plain' }),
          }),
        ])
      } else {
        const div = document.createElement('div')
        div.innerHTML = html
        div.style.position = 'fixed'
        div.style.left = '-999999px'
        document.body.appendChild(div)
        const range = document.createRange()
        range.selectNodeContents(div)
        const sel = window.getSelection()
        sel?.removeAllRanges()
        sel?.addRange(range)
        document.execCommand('copy')
        sel?.removeAllRanges()
        document.body.removeChild(div)
      }
    } catch { /* ignore */ }
    flash('rich')
  }, [html, markdown, flash])

  const download = useCallback((content: string, ext: 'md' | 'html') => {
    const blob = new Blob([content], { type: ext === 'md' ? 'text/markdown;charset=utf-8' : 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${fileBase(docTitle)}.${ext}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [docTitle])
  const downloadMd = useCallback(() => download(markdown, 'md'), [download, markdown])
  const downloadHtml = useCallback(() => download(htmlDocument(docTitle, html), 'html'), [download, docTitle, html])

  // ── 편집: execCommand('insertText')로 넣어 Ctrl+Z 실행 취소가 살아있게 ──
  const replaceRange = useCallback((start: number, end: number, text: string, selStart?: number, selEnd?: number) => {
    const ta = textareaRef.current
    if (!ta) return
    ta.focus()
    ta.setSelectionRange(start, end)
    let ok = false
    try { ok = document.execCommand('insertText', false, text) } catch { /* 미지원 */ }
    if (!ok) {
      ta.setRangeText(text, start, end, 'end')
      setMarkdown(ta.value)
    }
    const s = selStart ?? start + text.length
    ta.setSelectionRange(s, selEnd ?? s)
  }, [])

  const wrap = useCallback((before: string, after: string, placeholder: string) => {
    const ta = textareaRef.current
    if (!ta) return
    const { selectionStart: s, selectionEnd: e } = ta
    const sel = ta.value.slice(s, e) || placeholder
    replaceRange(s, e, before + sel + after, s + before.length, s + before.length + sel.length)
  }, [replaceRange])

  const linePrefix = useCallback((prefix: string, placeholder: string) => {
    const ta = textareaRef.current
    if (!ta) return
    const v = ta.value
    const ls = v.lastIndexOf('\n', ta.selectionStart - 1) + 1
    const le = v.indexOf('\n', ls)
    const line = v.slice(ls, le < 0 ? undefined : le)
    if (line.trim()) replaceRange(ls, ls, prefix, ta.selectionStart + prefix.length, ta.selectionEnd + prefix.length)
    else replaceRange(ls, ls + line.length, prefix + placeholder, ls + prefix.length, ls + prefix.length + placeholder.length)
  }, [replaceRange])

  const insertAtCursor = useCallback((text: string) => {
    const ta = textareaRef.current
    if (!ta) return
    replaceRange(ta.selectionStart, ta.selectionEnd, text)
  }, [replaceRange])

  const embedImage = useCallback((file: File) => {
    if (file.size > MAX_IMAGE_BYTES) { setNotice(t('imageTooLarge')); return }
    const reader = new FileReader()
    reader.onload = () => {
      const alt = file.name.replace(/\.[^.]+$/, '').replace(/[[\]]/g, '') || 'image'
      insertAtCursor(`![${alt}](${reader.result})`)
    }
    reader.readAsDataURL(file)
  }, [insertAtCursor, t])

  const loadTextFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = () => { if (typeof reader.result === 'string') setMarkdown(reader.result) }
    reader.readAsText(file)
  }, [])

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) loadTextFile(file)
    e.target.value = ''
  }, [loadTextFile])

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // 워드·엑셀 복사는 텍스트와 함께 그림도 실어 보내므로, 텍스트가 있으면 평소대로 붙여넣기
    const file = Array.from(e.clipboardData.files).find((f) => f.type.startsWith('image/'))
    if (!file || e.clipboardData.getData('text/plain')) return
    e.preventDefault()
    embedImage(file)
  }, [embedImage])

  const handleDrop = useCallback((e: React.DragEvent<HTMLTextAreaElement>) => {
    const file = e.dataTransfer.files[0]
    if (!file) return
    if (file.type.startsWith('image/')) { e.preventDefault(); embedImage(file) }
    else if (/\.(md|markdown|txt)$/i.test(file.name)) { e.preventDefault(); loadTextFile(file) }
  }, [embedImage, loadTextFile])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return // 한글 조합 중 Enter/단축키 무시
    if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey) {
      const k = e.key.toLowerCase()
      if (k === 'b') { e.preventDefault(); wrap('**', '**', t('bold')) }
      else if (k === 'i') { e.preventDefault(); wrap('*', '*', t('italic')) }
      else if (k === 'k') { e.preventDefault(); wrap('[', '](https://)', t('insert.linkText')) }
      else if (k === 's') { e.preventDefault(); downloadMd() }
      return
    }
    // 목록에서 Enter → 다음 항목 기호 자동 입력, 빈 항목에서 Enter → 목록 끝내기
    if (e.key === 'Enter' && !e.shiftKey && !e.altKey) {
      const ta = e.currentTarget
      if (ta.selectionStart !== ta.selectionEnd) return
      const v = ta.value
      const ls = v.lastIndexOf('\n', ta.selectionStart - 1) + 1
      const m = v.slice(ls, ta.selectionStart).match(/^(\s*)([-*+]|(\d+)([.)]))[ \t]+(\[[ xX]\][ \t]+)?/)
      if (!m) return
      e.preventDefault()
      if (v.slice(ls, ta.selectionStart).trim() === m[0].trim()) {
        replaceRange(ls, ta.selectionStart, '')
        return
      }
      const marker = m[3] ? `${Number(m[3]) + 1}${m[4]}` : m[2]
      insertAtCursor(`\n${m[1]}${marker} ${m[5] ? '[ ] ' : ''}`)
    }
  }, [wrap, t, downloadMd, replaceRange, insertAtCursor])

  // 편집기 스크롤 → 미리보기 비례 스크롤 (분할 보기)
  const syncScroll = useCallback(() => {
    const ta = textareaRef.current
    const pv = previewRef.current
    if (!ta || !pv || viewMode !== 'split') return
    const ratio = ta.scrollTop / Math.max(1, ta.scrollHeight - ta.clientHeight)
    pv.scrollTop = ratio * (pv.scrollHeight - pv.clientHeight)
  }, [viewMode])

  const newDoc = () => { if (!markdown.trim() || window.confirm(t('confirmNew'))) setMarkdown('') }
  const loadSample = () => { if (markdown === sample || !markdown.trim() || window.confirm(t('confirmSample'))) setMarkdown(sample) }

  const btnCls = 'px-2.5 py-1.5 text-xs font-medium bg-soft hover:bg-subtle text-body rounded-lg transition-colors select-none whitespace-nowrap'
  const segCls = (on: boolean) =>
    `px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${on ? 'bg-primary text-white' : 'text-sub hover:text-fg'}`
  const paneH = isFullscreen ? 'flex-1 min-h-0' : 'h-[65vh] min-h-[360px]'
  const sep = <div className="w-px h-5 bg-line" />

  return (
    <div className="space-y-6">
      <div className={isFullscreen ? 'fixed inset-0 z-50 bg-canvas p-3 flex flex-col gap-3' : 'flex flex-col gap-3'}>
        {/* ── 헤더 ── */}
        <div className="ui-card p-4 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <h1 className="text-xl font-bold text-fg leading-tight">{t('title')}</h1>
            <p className="text-xs text-muted mt-0.5">{t('description')}</p>
          </div>

          <div className="flex items-center gap-0.5 bg-soft rounded-lg p-1" role="tablist" aria-label={t('preview')}>
            <button role="tab" aria-selected={viewMode === 'split'} className={`${segCls(viewMode === 'split')} hidden lg:inline-block`} onClick={() => setViewMode('split')}>
              {t('split')}
            </button>
            <button role="tab" aria-selected={viewMode === 'editor'} className={segCls(viewMode === 'editor')} onClick={() => setViewMode('editor')}>
              {t('editorOnly')}
            </button>
            <button role="tab" aria-selected={viewMode === 'preview'} className={segCls(viewMode === 'preview')} onClick={() => setViewMode('preview')}>
              {t('previewOnly')}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <input ref={fileInputRef} type="file" accept=".md,.txt,.markdown" onChange={handleFileUpload} className="hidden" />
            <button onClick={newDoc} className={btnCls}>{t('newDoc')}</button>
            <button onClick={() => fileInputRef.current?.click()} className={btnCls}>{t('upload')}</button>
            <button onClick={loadSample} className={btnCls}>{t('loadSample')}</button>
            <button
              onClick={() => setShowToc((v) => !v)}
              aria-pressed={showToc}
              className={`${showToc ? 'px-2.5 py-1.5 text-xs font-medium bg-primary text-white rounded-lg' : btnCls} hidden lg:inline-block`}
            >
              {t('toc')}
            </button>
            <button onClick={() => setIsFullscreen((f) => !f)} className={btnCls}>
              {isFullscreen ? t('exitFullscreen') : t('fullscreen')}
            </button>
          </div>
        </div>

        {/* ── 서식 도구 ── */}
        {viewMode !== 'preview' && (
          <div className="ui-card px-3 py-2.5 flex flex-wrap gap-1.5 items-center">
            <button className={`${btnCls} font-bold`} title={`${t('bold')} (Ctrl+B)`} aria-label={t('bold')} onClick={() => wrap('**', '**', t('bold'))}>B</button>
            <button className={`${btnCls} italic`} title={`${t('italic')} (Ctrl+I)`} aria-label={t('italic')} onClick={() => wrap('*', '*', t('italic'))}>I</button>
            <button className={`${btnCls} line-through`} title={t('strikethrough')} aria-label={t('strikethrough')} onClick={() => wrap('~~', '~~', t('strikethrough'))}>S</button>
            {sep}
            <div className="relative" ref={headingMenuRef}>
              <button className={btnCls} aria-haspopup="menu" aria-expanded={showHeadingMenu} onClick={() => setShowHeadingMenu((v) => !v)}>
                {t('heading')} ▾
              </button>
              {showHeadingMenu && (
                <div role="menu" className="absolute top-full left-0 mt-1 z-20 bg-surface border border-line rounded-xl shadow-lg overflow-hidden min-w-[96px]">
                  {[1, 2, 3, 4, 5, 6].map((level) => (
                    <button
                      key={level}
                      role="menuitem"
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-soft text-body"
                      onClick={() => {
                        linePrefix('#'.repeat(level) + ' ', `H${level} ${t('insert.heading')}`)
                        setShowHeadingMenu(false)
                      }}
                    >
                      {'#'.repeat(level)} H{level}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {sep}
            <button className={btnCls} onClick={() => linePrefix('- ', t('insert.listItem'))}>{t('unorderedList')}</button>
            <button className={btnCls} onClick={() => linePrefix('1. ', t('insert.listItem'))}>{t('orderedList')}</button>
            <button className={btnCls} onClick={() => linePrefix('- [ ] ', t('insert.taskItem'))}>{t('taskList')}</button>
            {sep}
            <button className={btnCls} title={`${t('link')} (Ctrl+K)`} onClick={() => wrap('[', '](https://)', t('insert.linkText'))}>{t('link')}</button>
            <button className={btnCls} onClick={() => wrap('![', '](https://)', t('insert.imageAlt'))}>{t('image')}</button>
            <button className={btnCls} onClick={() => wrap('`', '`', 'code')}>{t('codeInline')}</button>
            <button className={btnCls} onClick={() => insertAtCursor(`\n\`\`\`javascript\n${t('insert.codeContent')}\n\`\`\`\n`)}>{t('codeBlock')}</button>
            {sep}
            <button className={btnCls} onClick={() => linePrefix('> ', t('insert.quoteContent'))}>{t('quote')}</button>
            <button className={btnCls} onClick={() => insertAtCursor('\n---\n')}>{t('horizontalRule')}</button>
            <button
              className={btnCls}
              onClick={() => {
                const h = t('insert.tableHeader')
                const c = t('insert.tableCell')
                insertAtCursor(`\n| ${h}1 | ${h}2 | ${h}3 |\n| --- | --- | --- |\n| ${c}1 | ${c}2 | ${c}3 |\n| ${c}4 | ${c}5 | ${c}6 |\n`)
              }}
            >
              {t('table')}
            </button>
            <button className={btnCls} onClick={() => insertAtCursor(`[^1]\n\n[^1]: ${t('insert.footnote')}\n`)}>{t('footnote')}</button>
          </div>
        )}

        {/* ── 본문 ── */}
        <div className={`flex gap-3 ${isFullscreen ? 'flex-1 min-h-0' : ''}`}>
          {showToc && (
            <div className="w-56 flex-shrink-0 ui-card overflow-hidden hidden lg:flex flex-col">
              <div className="bg-subtle px-4 py-2.5 border-b border-line">
                <span className="text-sm font-semibold text-body">{t('toc')}</span>
              </div>
              <nav className="flex-1 overflow-y-auto p-3">
                {headings.length === 0 ? (
                  <p className="text-xs text-faint">{t('tocEmpty')}</p>
                ) : (
                  <ul className="space-y-1">
                    {headings.map((h) => (
                      <li key={h.id}>
                        <button
                          onClick={() => {
                            if (viewMode === 'editor') setViewMode('split')
                            setTimeout(() => previewRef.current?.querySelector(`#${CSS.escape(h.id)}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
                          }}
                          className="text-left w-full text-xs text-sub hover:text-primary truncate transition-colors"
                          style={{ paddingLeft: `${(h.level - 1) * 12}px` }}
                        >
                          {h.text}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </nav>
            </div>
          )}

          <div className={`grid gap-3 flex-1 min-w-0 grid-cols-1 ${viewMode === 'split' ? 'lg:grid-cols-2' : ''} ${isFullscreen ? 'min-h-0 grid-rows-1' : ''}`}>
            {viewMode !== 'preview' && (
              <div className="ui-card overflow-hidden flex flex-col min-w-0 min-h-0">
                <div className="bg-subtle px-4 py-2.5 border-b border-line flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-body">{t('editor')}</span>
                  <span className={`text-xs ${saveState === 'failed' ? 'text-amber-600' : 'text-faint'}`} aria-live="polite">
                    {saveState === 'saved' ? t('autosaved') : saveState === 'failed' ? t('saveFailed') : ''}
                  </span>
                </div>
                <textarea
                  ref={textareaRef}
                  value={markdown}
                  onChange={(e) => setMarkdown(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  onDrop={handleDrop}
                  onScroll={syncScroll}
                  className={`w-full p-4 font-mono text-sm leading-relaxed text-fg bg-surface resize-none focus:outline-none ${paneH}`}
                  spellCheck={false}
                  placeholder={t('placeholder')}
                  aria-label={t('editor')}
                />
              </div>
            )}

            {viewMode !== 'editor' && (
              <div className="ui-card overflow-hidden flex flex-col min-w-0 min-h-0">
                <div className="bg-subtle px-4 py-2.5 border-b border-line">
                  <span className="text-sm font-semibold text-body">{t('preview')}</span>
                </div>
                <div
                  ref={previewRef}
                  className={`p-5 overflow-auto md-body ${paneH}`}
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              </div>
            )}
          </div>
        </div>

        {/* ── 상태 + 내보내기 ── */}
        <div className="ui-card px-4 py-3 space-y-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted tabular-nums">
            <span>{t('charCount')} <b className="font-semibold text-body">{stats.chars.toLocaleString()}</b></span>
            <span>{t('charNoSpace')} <b className="font-semibold text-body">{stats.charsNoSpace.toLocaleString()}</b></span>
            <span>{t('wordCount')} <b className="font-semibold text-body">{stats.words.toLocaleString()}</b></span>
            <span>{t('lineCount')} <b className="font-semibold text-body">{stats.lines.toLocaleString()}</b></span>
            <span>{t('readTime', { n: stats.readMin })}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={copyRich} className="ui-btn px-4 py-2 text-sm">
              {copiedId === 'rich' ? t('copied') : t('copyRich')}
            </button>
            <button onClick={() => copyText(markdown, 'md')} className="ui-btn-soft px-3 py-2 text-sm">
              {copiedId === 'md' ? t('copied') : t('copyMarkdown')}
            </button>
            <button onClick={() => copyText(html, 'html')} className="ui-btn-soft px-3 py-2 text-sm">
              {copiedId === 'html' ? t('copied') : t('copyHtml')}
            </button>
            <button onClick={downloadMd} className="ui-btn-soft px-3 py-2 text-sm">{t('exportMd')}</button>
            <button onClick={downloadHtml} className="ui-btn-soft px-3 py-2 text-sm">{t('exportHtml')}</button>
          </div>
          {notice ? (
            <p className="text-xs text-amber-600" role="alert">{notice}</p>
          ) : (
            <p className="text-xs text-faint">{t('shortcutsHint')}</p>
          )}
        </div>
      </div>

      {/* ── 문법 요약 ── */}
      <div className="ui-card p-6">
        <h2 className="text-lg font-semibold text-fg mb-4">{t('cheatsheet')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(['syntax', 'advanced'] as const).map((k) => (
            <div key={k} className="bg-subtle rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-fg mb-2">{t(`guide.${k}.title`)}</h3>
              <ul className="space-y-1.5">
                {(t.raw(`guide.${k}.items`) as string[]).map((item) => (
                  <li key={item} className="text-sm text-sub font-mono break-words">{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <GuideSection namespace="markdownEditor" defaultOpen />

      <style dangerouslySetInnerHTML={{ __html: MD_CSS }} />
    </div>
  )
}
