'use client'

import { useRef, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/regexExtractor'
import type { useRegexWorkspace } from '@/hooks/useRegexWorkspace'
import { REGEX_LIMITS } from '@/utils/regexEngine'

export default function RegexResultPanel({ workspace: w, onSave, saveStatus }: { workspace: ReturnType<typeof useRegexWorkspace>; onSave: () => void; saveStatus: 'saved' | 'saveFailed' | null }) {
  const t = useTranslations('regexExtractor'), common = useTranslations('common')
  const manual = useRef<HTMLTextAreaElement>(null)
  const [opened, setOpened] = useState('')
  const done = w.completed, result = done?.result
  const failedCopy = w.feedback?.status === 'failed' || w.feedback?.status === 'selectionFailed'
  const feedbackKey = w.feedback ? `${w.feedback.token.revision}:${w.feedback.token.request}` : ''
  const showManual = !!w.feedback && (w.feedback.text.length <= REGEX_LIMITS.preview || opened === feedbackKey)
  return <section id="regex-extractor-result" className="min-w-0 space-y-4 scroll-mt-20" data-regex-result>
    <div className="ui-card p-4 sm:p-6 space-y-4">
      <h2 className="text-xl font-bold text-fg">{t('results.title')}</h2>
      <p role="status" data-regex-status={w.status} className="text-sm text-sub">{w.error ? t(`execution.errors.${w.error}`) : t(`execution.status.${w.status === 'error' ? 'idle' : w.status}`)}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" data-regex-action="cancel" disabled={!w.reading && w.status !== 'waiting' && w.status !== 'running'} onClick={w.cancel} className="ui-btn-soft min-h-11 px-4 py-2 disabled:opacity-50">{t('execution.actions.cancel')}</button>
        <button type="button" data-regex-action="retry" disabled={!w.ready || w.status === 'running'} onClick={w.retry} className="ui-btn min-h-11 px-4 py-2 disabled:opacity-50">{t('execution.actions.retry')}</button>
      </div>
      {done && result && <>
        {!w.current && <p data-regex-previous className="text-sm text-sub">{t('execution.status.previous')}</p>}
        <p className="text-sm text-sub">{t(`execution.transform.${done.job.transform}`)} · {t(`operation.${done.job.operation}`)}</p>
        <dl className="grid grid-cols-2 gap-3">
          {[[t('results.matches'), result.matchCount], [t('results.outputLines'), result.outputNonblankLines], [t('results.outputChars'), result.outputLength], [t('execution.inputLines'), result.inputLineCount]].map(([label, value]) => <div key={label} className="bg-subtle rounded-xl p-3"><dt className="text-sm text-sub">{label}</dt><dd className="text-2xl font-bold tabular-nums text-fg">{value}</dd></div>)}
        </dl>
        <p className="text-sm text-sub">{t('execution.preview', { shown: Math.min(result.outputLength, REGEX_LIMITS.preview), total: result.outputLength })}</p>
        {result.outputLength === 0 && <p className="text-sub">{t('execution.status.empty')}</p>}
        <textarea data-regex-output value={result.outputText.slice(0, REGEX_LIMITS.preview)} readOnly rows={12} aria-label={t('results.title')} className="ui-field w-full min-w-0 px-3 py-3 font-mono text-base" />
        <div className="flex flex-wrap gap-2">
          <button data-regex-action="copy" type="button" onClick={w.copyOutput} className="ui-btn-soft min-h-11 px-4 py-2">{t('execution.actions.copy')}</button>
          <button data-regex-action="download" type="button" onClick={w.download} className="ui-btn-soft min-h-11 px-4 py-2">{t('execution.actions.download')}</button>
          <button data-regex-action="link" type="button" disabled={!w.current || w.url?.kind !== 'ready'} onClick={w.copyLink} className="ui-btn-soft min-h-11 px-4 py-2 disabled:opacity-50">{t('execution.actions.copyLink')}</button>
          <button data-regex-action="save" type="button" disabled={!w.current} onClick={onSave} className="ui-btn-soft min-h-11 px-4 py-2 disabled:opacity-50">{common('save')}</button>
        </div>
        {saveStatus && <p role="status" className="text-sm text-sub">{t(saveStatus === 'saved' ? 'execution.saved' : 'execution.errors.saveFailed')}</p>}
        <p className="text-sm text-muted">{t('execution.url.notice')}</p>
        {result.details.length > 0 && <details><summary className="min-h-11 cursor-pointer py-3 text-body">{t('results.matchDetails')}</summary><p className="text-sm text-sub">{t('execution.detailPreview')}</p><div className="space-y-3 mt-3">
          {result.details.map((detail, i) => <div key={i} className="bg-subtle rounded-xl p-3 text-sm [overflow-wrap:anywhere]">
            <pre className="font-mono whitespace-pre-wrap">{detail.match}</pre>
            <p>{t('matchDetail.line', { line: detail.line })} · {t('matchDetail.index', { index: detail.index })} · {t('execution.groupCount', { count: detail.groupCount })}</p>
            {detail.groups.length > 0 && <p className="font-mono">{t('matchDetail.groups', { groups: detail.groups.join(', ') })}</p>}
            {detail.truncated && <p className="text-sub">{t('execution.detailTruncated')}</p>}
          </div>)}
        </div></details>}
      </>}
      {w.feedback && <div data-regex-copy-status={w.feedback.status} role="status" className="bg-subtle p-4 rounded-xl space-y-3">
        <p className="text-sm text-sub">{t(`execution.copy.${w.feedback.status}`)}</p>
        {failedCopy && <>{showManual ? <><label className="block text-sm text-body" htmlFor="regex-copy-manual">{t('execution.copy.manual')}</label><textarea id="regex-copy-manual" ref={manual} readOnly value={w.feedback.text} rows={5} className="ui-field w-full px-3 py-3 text-base font-mono" /></> : <button type="button" onClick={() => setOpened(feedbackKey)} className="ui-btn-soft min-h-11 px-3 py-2">{t('execution.actions.openManual')}</button>}<div className="flex flex-wrap gap-2">{showManual && <button type="button" onClick={() => w.select(manual.current)} className="ui-btn-soft min-h-11 px-3 py-2">{t('execution.actions.select')}</button>}<button type="button" onClick={w.retryCopy} className="ui-btn-soft min-h-11 px-3 py-2">{t('execution.actions.retryCopy')}</button></div></>}
        <button type="button" onClick={w.closeCopy} className="ui-btn-soft min-h-11 px-3 py-2">{common('close')}</button>
      </div>}
    </div>
  </section>
}
