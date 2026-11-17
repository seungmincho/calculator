'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/screenRecorder'
import { initialScreenRecordingState, type ScreenRecordingConfig } from '@/utils/screenRecording'
import { createScreenRecordingSession } from '@/lib/screenRecording/session'
import { screenRecordingBrowserPorts } from '@/lib/screenRecording/browser'
import ScreenRecordingSessionPanel from '@/components/ScreenRecordingSessionPanel'
import ScreenRecordingLastResult from '@/components/ScreenRecordingLastResult'

export default function ScreenRecorder() {
  const t = useTranslations('screenRecorder')
  const [config, setConfig] = useState<ScreenRecordingConfig>({ quality: 'high', fps: 30, audio: 'none' })
  const [state, setState] = useState(initialScreenRecordingState)
  const [guideOpen, setGuideOpen] = useState(false)
  const [download, setDownload] = useState<{ id: number; status: 'requested' | 'failed' } | null>(null)
  const session = useRef<ReturnType<typeof createScreenRecordingSession> | null>(null)
  useEffect(() => {
    const next = createScreenRecordingSession(screenRecordingBrowserPorts(), setState)
    session.current = next
    return () => { next.dispose(); if (session.current === next) session.current = null }
  }, [])
  const downloadResult = (id: number) => {
    const result = session.current?.getSnapshot().result
    if (!result || result.id !== id) return
    let link: HTMLAnchorElement | null = null
    try {
      link = document.createElement('a'); link.href = result.url; link.download = result.name
      document.body.appendChild(link); link.click()
      setDownload({ id, status: 'requested' })
    } catch { setDownload({ id, status: 'failed' }) }
    finally { link?.remove() }
  }
  const locked = state.phase !== 'idle'
  return <div className="space-y-6">
    <header><h1 className="text-2xl font-bold text-fg">{t('title')}</h1><p className="mt-1 text-sm text-muted">{t('description')}</p></header>
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
      <fieldset disabled={locked} className="ui-card min-w-0 space-y-4 p-4 sm:p-6 lg:col-span-1">
        <legend className="sr-only">{t('settings')}</legend>
        <h2 className="text-lg font-semibold text-fg">{t('settings')}</h2>
        <label className="block space-y-2 text-sm text-body"><span>{t('quality')}</span>
          <select data-screen-recording-setting="quality" value={config.quality} onChange={event => setConfig(previous => ({ ...previous, quality: event.target.value as ScreenRecordingConfig['quality'] }))} className="ui-field min-h-11 w-full px-3 py-2 text-base disabled:opacity-50">
            <option value="high">{t('qualityHigh')} (1080p)</option><option value="medium">{t('qualityMedium')} (720p)</option><option value="low">{t('qualityLow')} (480p)</option>
          </select>
        </label>
        <label className="block space-y-2 text-sm text-body"><span>{t('frameRate')}</span>
          <select data-screen-recording-setting="fps" value={config.fps} onChange={event => setConfig(previous => ({ ...previous, fps: Number(event.target.value) as 30 | 60 }))} className="ui-field min-h-11 w-full px-3 py-2 text-base disabled:opacity-50"><option value={30}>{t('fps30')}</option><option value={60}>{t('fps60')}</option></select>
        </label>
        <label className="block space-y-2 text-sm text-body"><span>{t('audio')}</span>
          <select data-screen-recording-setting="audio" value={config.audio} onChange={event => setConfig(previous => ({ ...previous, audio: event.target.value as ScreenRecordingConfig['audio'] }))} className="ui-field min-h-11 w-full px-3 py-2 text-base disabled:opacity-50">
            <option value="none">{t('audioNone')}</option><option value="system">{t('audioSystem')}</option><option value="mic">{t('audioMic')}</option><option value="both">{t('audioBoth')}</option>
          </select>
        </label>
        <p className="text-xs leading-relaxed text-muted">{t('retry.settingsHint')}</p>
      </fieldset>
      <div className="min-w-0 space-y-6 lg:col-span-2">
        <ScreenRecordingSessionPanel state={state} onStart={() => { setDownload(null); session.current?.start(config) }} onCancelPreparation={() => session.current?.cancelPreparation()} onContinueWithoutMic={() => session.current?.continueWithoutMic()} onPause={() => session.current?.pause()} onResume={() => session.current?.resume()} onStop={() => session.current?.stop()} />
        {state.result && <ScreenRecordingLastResult result={state.result} onDownload={downloadResult} onDelete={id => session.current?.deleteResult(id)} />}
        {state.result && download?.id === state.result.id && <p role={download.status === 'failed' ? 'alert' : 'status'} className="text-sm text-sub">{t(download.status === 'failed' ? 'retry.downloadFailed' : 'retry.downloadRequested')}</p>}
      </div>
    </div>
    <section className="ui-card p-4 sm:p-6">
      <button type="button" onClick={() => setGuideOpen(previous => !previous)} aria-expanded={guideOpen} aria-controls="screen-recording-guide" className="flex min-h-11 w-full items-center justify-between gap-3 text-left text-base font-semibold text-fg"><span>{t('guide.title')}</span><span aria-hidden="true">{guideOpen ? '−' : '+'}</span></button>
      {guideOpen && <div id="screen-recording-guide" className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-3">
        {(['howto', 'formats', 'tips'] as const).map(group => <div key={group} className="space-y-3"><h3 className="font-semibold text-fg">{t(`guide.${group}.title`)}</h3><ul className="list-inside list-disc space-y-2 text-sm text-sub">{(t.raw(`guide.${group}.items`) as string[]).map((item, index) => <li key={index}>{item}</li>)}</ul></div>)}
      </div>}
    </section>
  </div>
}
