'use client'

import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/percentCalculator'
import { percentComparisonText, PERCENT_FIELD_LABELS, type PercentSnapshot } from '@/utils/percentComparison'

export interface PercentComparisonPanelProps {
  items: readonly PercentSnapshot[]
  status?: 'copying' | 'copied' | 'copyFailed' | 'downloadFailed' | 'downloaded' | null
  notice?: 'duplicate' | 'limit' | 'added' | null
  onRemove: (id: string) => void
  onClear: () => void
  onCopy: (text: string) => void
  onDownload: (text: string) => void
}
/** The parent owns one output generation across every card, this panel and recovery. */
export default function PercentComparisonPanel({ items, status, notice, onRemove, onClear, onCopy, onDownload }: PercentComparisonPanelProps) {
  const t = useTranslations('percentCalculator')
  return <section id="percent-comparison" data-percent-comparison="" className="ui-card min-w-0 p-5 space-y-4 scroll-mt-20" aria-labelledby="percent-comparison-title">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id="percent-comparison-title" className="text-lg font-semibold text-fg">{t('comparison.title')}</h2>
      <span className="text-sm text-muted">{t('comparison.count', { count: items.length })}</span>
    </div>
    <p className="text-sm text-sub">{t('comparison.memoryOnly')}</p>
    <p className="text-sm text-muted">{t('comparison.differentBases')}</p>
    {notice && <p data-percent-comparison-notice={notice} role="status" className="text-sm text-sub">{t(`comparison.${notice}`)}</p>}
    {!items.length ? <p className="text-body">{t('comparison.empty')}</p> : <ol className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {items.map((item, index) => <li key={item.id} data-percent-comparison-item={item.id} className="bg-subtle min-w-0 rounded-2xl p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-fg min-w-0 break-words">{index + 1}. {t(`${item.kind}.title`)}</h3>
          <button type="button" data-percent-comparison-remove={item.id} onClick={() => onRemove(item.id)} className="ui-btn-soft min-h-11 px-3 py-2 shrink-0" aria-label={t('comparison.removeNamed', { number: index + 1, name: t(`${item.kind}.title`) })}>{t('comparison.remove')}</button>
        </div>
        <p className="text-2xl font-bold text-fg tabular-nums break-all">{item.main}</p>
        <dl className="space-y-1 text-sm text-sub">
          {item.inputs.map(input => <div key={input.key} className="flex flex-wrap gap-x-2"><dt>{t(PERCENT_FIELD_LABELS[input.key])}</dt><dd className="min-w-0 whitespace-pre-wrap break-all">{input.raw}</dd></div>)}
          {item.chain.map((raw, n) => <div key={n} className="flex flex-wrap gap-x-2"><dt>{t('chain.step', { n: n + 1 })}</dt><dd className="min-w-0 whitespace-pre-wrap break-all">{raw}</dd></div>)}
          <div className="flex flex-wrap gap-x-2"><dt>{t('settings.decimals')}</dt><dd>{item.decimals}</dd></div>
          <div className="flex flex-wrap gap-x-2"><dt>{t('settings.koUnit')}</dt><dd>{t(item.korean ? 'comparison.on' : 'comparison.off')}</dd></div>
        </dl>
        <p className="font-mono text-sm text-muted break-all">{item.formula}</p>
      </li>)}
    </ol>}
    <div className="flex flex-wrap gap-2">
      <button type="button" data-percent-comparison-copy="" disabled={!items.length || status === 'copying'} onClick={() => onCopy(percentComparisonText(items, t))} className="ui-btn min-h-11 px-4 py-2">{t(status === 'copying' ? 'comparison.copying' : 'comparison.copyAll')}</button>
      <button type="button" data-percent-comparison-download="" disabled={!items.length} onClick={() => onDownload(percentComparisonText(items, t))} className="ui-btn-soft min-h-11 px-4 py-2">{t('comparison.download')}</button>
      <button type="button" data-percent-comparison-clear="" disabled={!items.length} onClick={onClear} className="ui-btn-soft min-h-11 px-4 py-2">{t('comparison.clear')}</button>
    </div>
    {status && status !== 'copying' && <p data-percent-comparison-status={status} role={status.endsWith('Failed') ? 'alert' : 'status'} className="text-sm text-sub">{t(`comparison.${status}`)}</p>}
  </section>
}
