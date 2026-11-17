'use client'

import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/koreanWordle'
import type { WordleHistoryRow } from '@/utils/koreanWordleHistory'

export default function KoreanWordleHistory({ rows, selected, onSelect, onCopy, copying, copied }: {
  rows: WordleHistoryRow[]; selected: number | null; onSelect: (day: number | null) => void; onCopy: (row: WordleHistoryRow) => void; copying: number | null; copied: number | null
}) {
  const t = useTranslations('koreanWordle')
  return <section data-wordle-history="" className="min-w-0 space-y-3 border-t border-line pt-4">
    <h3 className="font-semibold text-fg">{t('history.title')}</h3>
    <p className="text-xs text-muted">{t('history.hint')}</p>
    {rows.length === 0 && <p className="text-sm text-sub">{t('history.empty')}</p>}
    <ol className="space-y-2">
      {rows.map(row => <li key={row.day} data-wordle-history-day={row.day} className="min-w-0 rounded-xl bg-subtle p-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><div className="min-w-0 text-sm"><p className="font-medium text-fg"><time dateTime={row.date}>{row.date}</time></p><p className="text-sub">{t('history.summary', { day: row.day, status: t('history.' + row.status), count: row.attempts })}</p></div>
          {row.text !== null && <button type="button" data-wordle-history-expand={row.day} aria-expanded={selected === row.day} onClick={() => onSelect(selected === row.day ? null : row.day)} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t(selected === row.day ? 'history.hide' : 'history.show')}</button>}</div>
        {selected === row.day && row.text !== null && <div className="mt-3 min-w-0 space-y-2">
          <pre data-wordle-history-grid={row.day} className="whitespace-pre-wrap break-words font-sans text-base leading-relaxed text-body">{row.text}</pre>
          <button type="button" data-wordle-history-copy={row.day} onClick={() => onCopy(row)} disabled={copying === row.day} className="ui-btn min-h-11 px-3 py-2 text-sm disabled:opacity-40">{t(copied === row.day ? 'shared' : copying === row.day ? 'copyRecovery.copying' : 'history.copy')}</button>
        </div>}
      </li>)}
    </ol>
  </section>
}
