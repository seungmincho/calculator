'use client'

import React, { useEffect, useMemo, useState, useRef } from 'react'
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror'
import { json } from '@codemirror/lang-json'
import { search } from '@codemirror/search'
import { EditorView, Decoration, type DecorationSet } from '@codemirror/view'
import { StateEffect, StateField } from '@codemirror/state'

// Error line decoration
const setErrorLine = StateEffect.define<number | null>()

const errorLineDecoration = Decoration.line({ class: 'cm-error-line' })

const errorLineField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none
  },
  update(deco, tr) {
    for (const e of tr.effects) {
      if (e.is(setErrorLine)) {
        if (e.value === null) return Decoration.none
        try {
          const lineCount = tr.state.doc.lines
          const lineNum = Math.min(Math.max(1, e.value), lineCount)
          const line = tr.state.doc.line(lineNum)
          return Decoration.set([errorLineDecoration.range(line.from)])
        } catch {
          return Decoration.none
        }
      }
    }
    return deco
  },
  provide: (f) => EditorView.decorations.from(f),
})

const errorLineTheme = EditorView.baseTheme({
  '.cm-error-line': {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  '&dark .cm-error-line': {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
  },
})

const customTheme = EditorView.theme({
  '&': {
    fontSize: '13px',
  },
  '.cm-content': {
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
  },
  '.cm-gutters': {
    borderRight: '1px solid #e5e7eb',
  },
  '&.cm-focused': {
    outline: 'none',
  },
})

const darkCustomTheme = EditorView.theme({
  '.cm-gutters': {
    borderRight: '1px solid #374151',
  },
})

interface JsonCodeEditorProps {
  value: string
  onChange?: (value: string) => void
  readOnly?: boolean
  placeholder?: string
  height?: string
  errorLine?: number | null
}

const JsonCodeEditor: React.FC<JsonCodeEditorProps> = ({
  value,
  onChange,
  readOnly = false,
  placeholder,
  height = '400px',
  errorLine = null,
}) => {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const editorRef = useRef<ReactCodeMirrorRef>(null)

  // Observe dark mode changes
  useEffect(() => {
    const checkDark = () => document.documentElement.classList.contains('dark')
    setIsDarkMode(checkDark())

    const observer = new MutationObserver(() => {
      setIsDarkMode(checkDark())
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    return () => observer.disconnect()
  }, [])

  // Dispatch error line effect when errorLine changes
  useEffect(() => {
    const view = editorRef.current?.view
    if (view) {
      view.dispatch({
        effects: setErrorLine.of(errorLine),
      })
    }
  }, [errorLine])

  const extensions = useMemo(() => {
    const exts = [
      json(),
      search(),
      errorLineField,
      errorLineTheme,
      customTheme,
      EditorView.lineWrapping,
    ]
    if (isDarkMode) {
      exts.push(darkCustomTheme)
    }
    if (readOnly) {
      exts.push(EditorView.editable.of(false))
    }
    return exts
  }, [isDarkMode, readOnly])

  return (
    <CodeMirror
      ref={editorRef}
      value={value}
      onChange={onChange}
      extensions={extensions}
      theme={isDarkMode ? 'dark' : 'light'}
      height={height}
      placeholder={placeholder}
      basicSetup={{
        lineNumbers: true,
        foldGutter: true,
        bracketMatching: true,
        closeBrackets: true,
        highlightActiveLine: !readOnly,
        highlightActiveLineGutter: !readOnly,
        indentOnInput: true,
        autocompletion: false,
      }}
      className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600"
    />
  )
}

export default JsonCodeEditor
