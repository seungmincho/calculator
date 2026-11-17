'use client'

import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/pdfTools'
import { PDF_EDIT_HISTORY_LIMIT } from '@/utils/pdfEditHistory'

export default function PdfHistoryControls({ undoCount, redoCount, onUndo, onRedo }: {
  undoCount: number; redoCount: number; onUndo: () => void; onRedo: () => void
}) {
  const t = useTranslations('pdfTools')
  return <div data-pdf-history className="space-y-2">
    <div role="group" aria-label={t('history.title')} className="grid grid-cols-2 gap-2">
      <button type="button" id="pdf-org-undo" disabled={undoCount === 0} onClick={onUndo} className="ui-btn-soft min-h-11 px-3 py-2 text-sm disabled:opacity-40">{t('history.undo')}</button>
      <button type="button" id="pdf-org-redo" disabled={redoCount === 0} onClick={onRedo} className="ui-btn-soft min-h-11 px-3 py-2 text-sm disabled:opacity-40">{t('history.redo')}</button>
    </div>
    <p className="text-xs text-sub" aria-live="polite">{t('history.count', { undo: undoCount, redo: redoCount, max: PDF_EDIT_HISTORY_LIMIT })}</p>
    <p className="text-xs text-muted">{t('history.hint')}</p>
  </div>
}
