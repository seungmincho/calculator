'use client'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/screenRecorder'
import { screenRecordingTime, type ScreenRecordingState } from '@/utils/screenRecording'

/** Controlled preparation UI. It requests no media and owns no recording resources. */
export default function ScreenRecordingSessionPanel({ state, onStart, onCancelPreparation, onContinueWithoutMic, onPause, onResume, onStop }: {
  state: ScreenRecordingState
  onStart: () => void
  onCancelPreparation: () => void
  onContinueWithoutMic: () => void
  onPause: () => void
  onResume: () => void
  onStop: () => void
}) {
  const t = useTranslations('screenRecorder')
  const active = ['recording', 'paused', 'stopping'].includes(state.phase)
  const showAudio = active || state.phase === 'audioChoice'
  const requestedSystem = state.config?.audio === 'system' || state.config?.audio === 'both'
  return <section className="ui-card min-w-0 space-y-4 p-4 sm:p-6" aria-labelledby="screen-recording-attempt-title" data-screen-recording-phase={state.phase}>
    <h2 id="screen-recording-attempt-title" className="text-lg font-semibold text-fg">{t('retry.currentAttempt')}</h2>
    <p role="status" aria-live="polite" className="text-sm text-body">{t(`retry.phases.${state.phase}`)}</p>
    {active && <p role="timer" aria-label={t('retry.activeTime')} className="whitespace-nowrap text-4xl font-bold tabular-nums text-fg">{screenRecordingTime(state.elapsedMs)}</p>}
    {state.phase === 'preparing' && <p className="text-sm text-sub">{t('retry.preparingHint')}</p>}
    {state.phase === 'audioChoice' && <p role="alert" className="text-sm text-body">{t('retry.micChoice')}</p>}
    {showAudio && <div className="space-y-2 rounded-xl bg-subtle p-4">
      <p className="text-sm text-body">{t('retry.connectedAudio')}</p>
      <ul className="space-y-1 text-sm text-sub"><li>{t('retry.systemStatus', { state: t(state.audio.system ? 'retry.connected' : 'retry.notConnected') })}</li><li>{t('retry.micStatus', { state: t(state.audio.mic ? 'retry.connected' : 'retry.notConnected') })}</li></ul>
      {requestedSystem && !state.audio.system && <p className="text-xs text-muted">{t('retry.systemMissing')}</p>}
      {state.micDenied && state.phase !== 'audioChoice' && <p className="text-xs text-muted">{t('retry.micOmitted')}</p>}
    </div>}
    {state.error && <p role="alert" className="text-sm text-body">{t(`retry.errors.${state.error}`)}</p>}
    {state.result && <p className="text-sm text-sub">{t('retry.previousKept')}</p>}
    <div className="flex flex-wrap gap-2">
      {state.phase === 'idle' && <button type="button" onClick={onStart} className="ui-btn min-h-11 px-4 py-3 text-base">{t(state.result ? 'retry.recordAgain' : 'startRecording')}</button>}
      {['preparing', 'audioChoice'].includes(state.phase) && <button type="button" onClick={onCancelPreparation} className="ui-btn-soft min-h-11 px-4 py-3 text-base">{t('retry.cancelPreparation')}</button>}
      {state.phase === 'audioChoice' && <button type="button" onClick={onContinueWithoutMic} className="ui-btn min-h-11 px-4 py-3 text-base">{t('retry.continueWithoutMic')}</button>}
      {state.phase === 'recording' && <button type="button" onClick={onPause} className="ui-btn-soft min-h-11 px-4 py-3 text-base">{t('pauseRecording')}</button>}
      {state.phase === 'paused' && <button type="button" onClick={onResume} className="ui-btn-soft min-h-11 px-4 py-3 text-base">{t('resumeRecording')}</button>}
      {(state.phase === 'recording' || state.phase === 'paused') && <button type="button" onClick={onStop} className="ui-btn min-h-11 px-4 py-3 text-base">{t('stopRecording')}</button>}
    </div>
    <p className="text-xs leading-relaxed text-muted">{t('retry.timeHint')}</p>
  </section>
}
