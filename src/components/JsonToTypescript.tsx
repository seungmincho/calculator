'use client'

import { useDeferredValue, useMemo, useRef, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/jsonToTypescript'
import MobileResultLink from '@/components/MobileResultLink'
import { useHydrated } from '@/hooks/useHydrated'
import { convert, DEFAULT_OPTIONS, type Options, type Style } from '@/utils/jsonToTypescript'

const STORE_KEY = 'jsonToTypescript.last'
const MAX_SAVE = 500_000 // ponytail: 이보다 긴 입력은 옵션만 저장(localStorage 한도 5MB 안팎)
const SAMPLE = `{
  "id": 1024,
  "title": "주간 회의",
  "published": true,
  "createdAt": "2026-11-07T09:00:00Z",
  "author": {
    "id": 7,
    "nickname": "toolhub",
    "avatarUrl": null
  },
  "tags": ["json", "typescript"],
  "comments": [
    { "id": 1, "body": "좋아요", "likes": 3, "editedAt": null },
    { "id": 2, "body": "확인했습니다", "likes": 0, "editedAt": "2026-11-07T10:00:00Z", "replyTo": 1 }
  ],
  "settings": {
    "visibility": "team",
    "notify": { "email": true, "push": false }
  }
}`
const STYLES: Style[] = ['interface', 'type']
const FLAGS = ['exportKw', 'readonly'] as const

type Saved = Options & { input: string }

function readSaved(): Partial<Saved> {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}')
    return {
      ...(typeof s.input === 'string' && { input: s.input }),
      ...(typeof s.rootName === 'string' && { rootName: s.rootName.slice(0, 60) }),
      ...(STYLES.includes(s.style) && { style: s.style as Style }),
      ...(typeof s.exportKw === 'boolean' && { exportKw: s.exportKw }),
      ...(typeof s.readonly === 'boolean' && { readonly: s.readonly }),
    }
  } catch { return {} }
}

const btn = (on: boolean) => `min-h-[44px] px-4 rounded-xl text-sm font-medium font-mono ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`

export default function JsonToTypescript() {
  const t = useTranslations('jsonToTypescript')
  const hydrated = useHydrated()
  const saved = useMemo(() => (hydrated ? readSaved() : {}), [hydrated])
  const [edit, setEdit] = useState<Partial<Saved>>({})
  const s: Saved = { ...DEFAULT_OPTIONS, input: SAMPLE, ...saved, ...edit }
  const [copied, setCopied] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const set = (patch: Partial<Saved>) => {
    const next = { ...s, ...patch }
    setEdit(e => ({ ...e, ...patch }))
    try { localStorage.setItem(STORE_KEY, JSON.stringify(next.input.length > MAX_SAVE ? { ...next, input: undefined } : next)) } catch { /* 시크릿 모드 등 */ }
  }

  const src = useDeferredValue(s.input)
  const { rootName, style, exportKw, readonly } = s
  const result = useMemo(() => (src.trim() ? convert(src, { rootName, style, exportKw, readonly }) : null), [src, rootName, style, exportKw, readonly])
  const code = result?.ok ? result.code : ''
  const err = result && !result.ok ? result : null

  // 오류 행을 80자 창으로 잘라 열 위치에 ^ 표시
  const snippet = useMemo(() => {
    if (!err?.line || !err.column) return null
    const line = (src.split('\n')[err.line - 1] ?? '').replace(/\t/g, ' ')
    const from = Math.max(0, err.column - 41)
    return `${line.slice(from, from + 80)}\n${' '.repeat(Math.max(0, err.column - 1 - from))}^`
  }, [err, src])

  const status = copied ? t('output.copied')
    : err ? `${t('error.title')}${err.line ? ` · ${t('error.at', { line: err.line, column: err.column ?? 1 })}` : ''}`
      : result?.ok ? t('output.count', { n: result.names.length }) : ''

  const copy = async () => {
    try { await navigator.clipboard.writeText(code) } catch {
      const ta = document.createElement('textarea')
      ta.value = code; ta.style.position = 'fixed'; ta.style.left = '-9999px'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  const download = () => {
    const url = URL.createObjectURL(new Blob([code], { type: 'text/plain;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url; a.download = `${result?.ok ? result.names[0] : 'types'}.ts`; a.click()
    URL.revokeObjectURL(url)
  }

  const faq = t.raw('guide.faq.items') as { q: string; a: string }[]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle')}</p>
      </div>

      <div className="ui-card p-6 space-y-5">
        <MobileResultLink href="#json-to-typescript-result" label={t('output.label')} value={err ? t('error.title') : result?.ok ? t('output.count', { n: result.names.length }) : '—'} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label htmlFor="j2t-root" className="block text-sm font-medium text-body mb-1.5">{t('options.rootName')}</label>
            <input id="j2t-root" className="ui-field px-4 py-3 w-full font-mono" value={rootName} placeholder={DEFAULT_OPTIONS.rootName} spellCheck={false} autoComplete="off"
              onChange={e => set({ rootName: e.target.value.slice(0, 60) })} />
          </div>
          <div>
            <p id="j2t-style" className="text-sm font-medium text-body mb-1.5">{t('options.style')}</p>
            <div className="grid grid-cols-2 gap-2" role="group" aria-labelledby="j2t-style">
              {STYLES.map(v => <button key={v} type="button" aria-pressed={style === v} onClick={() => set({ style: v })} className={btn(style === v)}>{t(`options.${v}`)}</button>)}
            </div>
          </div>
          <div>
            <p id="j2t-flags" className="text-sm font-medium text-body mb-1.5">{t('options.keywords')}</p>
            <div className="grid grid-cols-2 gap-2" role="group" aria-labelledby="j2t-flags">
              {FLAGS.map(k => <button key={k} type="button" aria-pressed={s[k]} onClick={() => set({ [k]: !s[k] })} className={btn(s[k])}>{t(`options.${k}`)}</button>)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="ui-card p-6 space-y-3 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="j2t-input" className="font-semibold text-fg">{t('input.label')}</label>
            <div className="flex gap-2">
              <button type="button" className="ui-btn-soft px-4 py-2 min-h-[44px] text-sm" onClick={() => set({ input: SAMPLE })}>{t('input.sample')}</button>
              <button type="button" className="ui-btn-soft px-4 py-2 min-h-[44px] text-sm" onClick={() => { set({ input: '' }); inputRef.current?.focus() }}>{t('input.clear')}</button>
            </div>
          </div>
          <textarea id="j2t-input" ref={inputRef} value={s.input} onChange={e => set({ input: e.target.value })}
            spellCheck={false} autoCapitalize="off" autoComplete="off" wrap="off" placeholder={t('input.placeholder')}
            aria-invalid={!!err} aria-describedby={err ? 'j2t-privacy j2t-error' : 'j2t-privacy'}
            className="ui-field w-full h-72 lg:h-[30rem] px-4 py-3 font-mono text-sm leading-relaxed resize-y" />
          <p id="j2t-privacy" className="text-xs text-muted">{t('input.privacy')}</p>
          {err && (
            <div id="j2t-error" className="bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm space-y-2">
              <p className="font-semibold">{t('error.title')}{err.line ? ` · ${t('error.at', { line: err.line, column: err.column ?? 1 })}` : ''}</p>
              {snippet && <pre className="font-mono text-xs overflow-x-auto whitespace-pre">{snippet}</pre>}
              <p className="text-xs break-words">{err.message}</p>
            </div>
          )}
        </div>

        <div id="json-to-typescript-result" className="ui-card p-6 space-y-3 min-w-0 scroll-mt-20">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 className="font-semibold text-fg">{t('output.label')}</h2>
              <p className="text-xs text-sub" aria-live="polite">{status}</p>
            </div>
            <div className="flex gap-2">
              <button type="button" className="ui-btn px-4 py-2 min-h-[44px] text-sm" disabled={!code} onClick={copy}>{copied ? t('output.copied') : t('output.copy')}</button>
              <button type="button" className="ui-btn-soft px-4 py-2 min-h-[44px] text-sm disabled:opacity-45" disabled={!code} onClick={download}>{t('output.download')}</button>
            </div>
          </div>
          {code ? (
            <pre tabIndex={0} aria-label={t('output.label')} className="bg-subtle rounded-2xl p-4 h-72 lg:h-[30rem] overflow-auto font-mono text-sm leading-relaxed text-fg"><code>{code}</code></pre>
          ) : (
            <p className="bg-subtle rounded-2xl p-5 h-72 lg:h-[30rem] text-sm text-sub">{err ? t('output.invalid') : t('output.empty')}</p>
          )}
        </div>
      </div>

      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(['rules', 'naming', 'tips'] as const).map(sec => (
            <div key={sec}>
              <h3 className="font-semibold text-fg mb-3">{t(`guide.${sec}.title`)}</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-sub">{(t.raw(`guide.${sec}.items`) as string[]).map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
          ))}
        </div>
        <p className="bg-subtle rounded-2xl p-5 text-sm text-sub">{t('guide.privacy')}</p>
        <div>
          <h3 className="font-semibold text-fg mb-3">{t('guide.faq.title')}</h3>
          <div className="divide-y divide-line border-y border-line">
            {faq.map(f => (
              <details key={f.q} className="py-3">
                <summary className="cursor-pointer text-sm font-medium text-body min-h-[24px]">{f.q}</summary>
                <p className="text-sm text-sub mt-2 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
