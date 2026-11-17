'use client'

import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/decisionTools'
import type { MenuRoundExclusions as RoundState } from '@/utils/menuRoundExclusions'

export default function MenuRoundExclusions({ state, busy, onRestore, onRestoreAll }: {
  state: RoundState; busy: boolean
  onRestore: (name: string, revision: number) => void; onRestoreAll: (revision: number) => void
}) {
  const t = useTranslations('decisionTools')
  return <section data-menu-round="" data-menu-round-revision={state.revision} className="min-w-0 space-y-3 rounded-2xl bg-subtle p-4">
    <h2 className="font-semibold text-fg">{t('menuRound.title')}</h2>
    <p role="status" data-menu-round-count={state.items.length} className="text-sm text-body">{t('menuRound.count', { count: state.items.length, excluded: state.excluded.length })}</p>
    <p className="text-xs text-sub">{t('menuRound.hint')}</p>
    {!!state.excluded.length && <>
      <ul className="space-y-2">
        {state.excluded.map(name => <li key={name} className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <span className="min-w-0 text-sm text-body [overflow-wrap:anywhere]">{name}</span>
          <button type="button" data-menu-restore={name} disabled={busy} aria-label={t('menuRound.restoreNamed', { name })} onClick={() => { if (!busy) onRestore(name, state.revision) }} className="ui-btn-soft min-h-11 px-3 py-2 text-sm disabled:opacity-40">{t('menuRound.restore')}</button>
        </li>)}
      </ul>
      <button type="button" data-menu-restore-all="" disabled={busy} onClick={() => { if (!busy) onRestoreAll(state.revision) }} className="ui-btn-soft min-h-11 px-4 py-2 text-sm disabled:opacity-40">{t('menuRound.restoreAll')}</button>
    </>}
    <p className="text-xs text-muted">{t('menuRound.resetHint')}</p>
    <p className="text-xs text-muted">{t('menuRound.linkHint')}</p>
  </section>
}
