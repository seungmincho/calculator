'use client'

import { useEffect, useRef, useState } from 'react'
import { useHydrated } from '@/hooks/useHydrated'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/whiteNoise'
import WhiteNoiseProfiles from '@/components/WhiteNoiseProfiles'
import { DEFAULT_WHITE_NOISE, WHITE_NOISE_TYPES, WHITE_NOISE_TIMERS, cloneWhiteNoiseSettings, type WhiteNoiseType as NoiseType, type WhiteNoiseSettings } from '@/utils/whiteNoise'
import { createWhiteNoiseSession, type WhiteNoiseState } from '@/lib/whiteNoise/session'
import { whiteNoiseBrowserPorts } from '@/lib/whiteNoise/browser'

function createWhiteNoise(ctx: AudioContext): AudioBufferSourceNode {
  const bufferSize = ctx.sampleRate * 2
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1
  }
  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.loop = true
  return source
}

function createPinkNoise(ctx: AudioContext): AudioBufferSourceNode {
  const bufferSize = ctx.sampleRate * 2
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1
    b0 = 0.99886 * b0 + white * 0.0555179
    b1 = 0.99332 * b1 + white * 0.0750759
    b2 = 0.96900 * b2 + white * 0.1538520
    b3 = 0.86650 * b3 + white * 0.3104856
    b4 = 0.55000 * b4 + white * 0.5329522
    b5 = -0.7616 * b5 - white * 0.0168980
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
    b6 = white * 0.115926
  }
  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.loop = true
  return source
}

function createBrownNoise(ctx: AudioContext): AudioBufferSourceNode {
  const bufferSize = ctx.sampleRate * 2
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  let lastOut = 0
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1
    data[i] = (lastOut + 0.02 * white) / 1.02
    lastOut = data[i]
    data[i] *= 3.5
  }
  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.loop = true
  return source
}

function createNatureNoise(ctx: AudioContext, type: 'rain' | 'wind' | 'wave'): AudioBufferSourceNode {
  const bufferSize = ctx.sampleRate * 4
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  let lastOut = 0

  for (let i = 0; i < bufferSize; i++) {
    const t = i / ctx.sampleRate
    const white = Math.random() * 2 - 1

    if (type === 'rain') {
      // Rain: filtered noise with random crackles
      lastOut = (lastOut + 0.04 * white) / 1.04
      const crackle = Math.random() > 0.997 ? (Math.random() * 0.3) : 0
      data[i] = lastOut * 2.5 + crackle
    } else if (type === 'wind') {
      // Wind: slow modulation of brown noise
      const mod = Math.sin(t * 0.3) * 0.5 + Math.sin(t * 0.7) * 0.3 + 0.5
      lastOut = (lastOut + 0.02 * white) / 1.02
      data[i] = lastOut * 3 * mod
    } else {
      // Wave: rhythmic modulation
      const waveCycle = Math.sin(t * 0.5) * 0.5 + 0.5
      const surge = Math.pow(waveCycle, 2)
      lastOut = (lastOut + 0.03 * white) / 1.03
      data[i] = lastOut * 3 * (0.3 + surge * 0.7)
    }
  }

  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.loop = true
  return source
}

function makeNoiseSource(context: AudioContext, type: NoiseType) {
  if (type === 'pink') return createPinkNoise(context)
  if (type === 'brown') return createBrownNoise(context)
  if (type === 'rain' || type === 'wind' || type === 'wave') return createNatureNoise(context, type)
  return createWhiteNoise(context)
}
const initial = (): WhiteNoiseState => ({ phase: 'idle', settings: { ...DEFAULT_WHITE_NOISE }, remainingMs: 0, deadline: null, error: null, generation: 0 })
const clockText = (ms: number) => { const seconds = Math.ceil(ms / 1000); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` }

export default function WhiteNoise() {
  const t = useTranslations('whiteNoise'), hydrated = useHydrated()
  const [state, setState] = useState<WhiteNoiseState>(initial)
  const [interaction, setInteraction] = useState(0)
  const session = useRef<ReturnType<typeof createWhiteNoiseSession> | null>(null)
  useEffect(() => {
    let active = true
    const current = createWhiteNoiseSession(whiteNoiseBrowserPorts(makeNoiseSource), next => { if (active) setState(next) })
    session.current = current
    return () => { active = false; current.dispose(); if (session.current === current) session.current = null }
  }, [])
  const markInteraction = () => setInteraction(value => value + 1)
  const change = (patch: Partial<WhiteNoiseSettings>) => {
    if (!session.current) return
    markInteraction(); session.current.change({ ...session.current.getSnapshot().settings, ...patch })
  }
  const mainAction = () => {
    const current = session.current
    if (!current) return
    markInteraction()
    const snapshot = current.getSnapshot()
    if (snapshot.phase === 'suspended') current.resume()
    else if (snapshot.phase === 'playing' || snapshot.phase === 'preparing') current.stop()
    else current.start(snapshot.settings)
  }
  const stop = () => { markInteraction(); session.current?.stop() }
  const load = (settings: WhiteNoiseSettings) => {
    const next = cloneWhiteNoiseSettings(settings)
    markInteraction(); session.current?.stop(); session.current?.change(next)
  }
  const { settings, phase } = state
  const active = phase === 'playing' || phase === 'suspended' || phase === 'preparing'
  const status = phase === 'playing' && settings.volume === 0 ? 'muted' : phase === 'error' ? 'idle' : phase
  const action = phase === 'preparing' ? 'cancel' : phase === 'playing' ? 'stop' : phase === 'suspended' ? 'resume' : phase === 'error' ? 'retry' : 'play'
  const button = (selected: boolean) => 'min-h-11 rounded-xl px-3 py-2 text-sm font-medium ' + (selected ? 'bg-primary text-white' : 'ui-btn-soft')
  return <div className="space-y-6">
    <header><h1 className="text-2xl font-bold text-fg">{t('title')}</h1><p className="mt-1 text-sm text-sub">{t('description')}</p></header>
    <section data-white-noise-player data-noise-phase={phase} data-noise-generation={state.generation} data-noise-remaining={state.remainingMs ?? ''} data-noise-deadline={state.deadline?.wallEnd ?? ''} className="ui-card min-w-0 space-y-5 p-4 sm:p-6">
      <div className="space-y-3 text-center">
        <p data-noise-status role="status" className="text-base font-semibold text-fg">{t(`playback.${status}`)}</p>
        {active && <p data-noise-clock className="text-2xl font-bold tabular-nums text-fg">{state.remainingMs === null ? t('playback.unlimited') : t('playback.remaining', { time: clockText(state.remainingMs) })}</p>}
        <div className="flex flex-wrap justify-center gap-2"><button type="button" data-noise-play onClick={mainAction} disabled={!hydrated} className="ui-btn min-h-11 px-6 py-3 text-base">{t(`playback.${action}`)}</button>{phase === 'suspended' && <button type="button" data-noise-stop onClick={stop} className="ui-btn-soft min-h-11 px-4 py-3 text-base">{t('playback.stop')}</button>}</div>
        {phase === 'suspended' && <p className="text-sm text-sub">{t('playback.resumeHint')}</p>}
        {state.error && <p role="alert" className="text-sm text-body">{t(`playback.errors.${state.error}`)}</p>}
      </div>
      <fieldset className="space-y-2"><legend className="mb-2 text-sm font-medium text-body">{t('noiseType')}</legend><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{WHITE_NOISE_TYPES.map(type => <button key={type} type="button" data-noise-type={type} aria-pressed={settings.type === type} onClick={() => change({ type })} className={button(settings.type === type)}>{t(`types.${type}`)}</button>)}</div></fieldset>
      <div className="space-y-2"><label htmlFor="white-noise-volume" className="flex items-center justify-between gap-2 text-sm font-medium text-body"><span>{t('volume')}</span><span className="tabular-nums">{settings.volume}%</span></label><input id="white-noise-volume" data-noise-volume type="range" min={0} max={100} step={1} value={settings.volume} onChange={event => change({ volume: Math.max(0, Math.min(100, Math.round(Number(event.target.value)) || 0)) })} className="min-h-11 w-full accent-[var(--primary)]" /></div>
      <fieldset className="space-y-2"><legend className="mb-2 text-sm font-medium text-body">{t('sleepTimer')}</legend><div className="flex flex-wrap gap-2">{WHITE_NOISE_TIMERS.map(timerMinutes => <button key={timerMinutes} type="button" data-noise-timer={timerMinutes} aria-pressed={settings.timerMinutes === timerMinutes} onClick={() => change({ timerMinutes })} className={button(settings.timerMinutes === timerMinutes)}>{timerMinutes === 0 ? t('profiles.noTimer') : t('profiles.minutes', { minutes: timerMinutes })}</button>)}</div><p className="text-xs leading-relaxed text-muted">{t('playback.timerHint')}</p></fieldset>
      <div><label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-body"><input data-noise-fade type="checkbox" checked={settings.fade} onChange={event => change({ fade: event.target.checked })} className="h-5 w-5 accent-[var(--primary)]" />{t('playback.fade')}</label><p className="text-xs text-muted">{t('playback.fadeHint')}</p></div>
      <p className="text-xs leading-relaxed text-muted">{t('playback.backgroundHint')}</p>
    </section>
    <WhiteNoiseProfiles settings={settings} inputKey={`${interaction}:${JSON.stringify(settings)}`} onLoad={load} />
    <section className="ui-card min-w-0 p-4 sm:p-6"><h2 className="mb-4 text-lg font-semibold text-fg">{t('aboutNoise')}</h2><div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{WHITE_NOISE_TYPES.map(type => <div key={type}><h3 className="text-sm font-medium text-body">{t(`types.${type}`)}</h3><p className="mt-1 text-sm text-sub">{t(`typeDesc.${type}`)}</p></div>)}</div></section>
    <details className="ui-card min-w-0 p-4 sm:p-6"><summary className="min-h-11 cursor-pointer text-lg font-semibold text-fg">{t('guide.title')}</summary><div className="mt-3 space-y-4">{(['benefits', 'tips'] as const).map(section => <div key={section}><h3 className="text-sm font-medium text-body">{t(`guide.${section}.title`)}</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-sub">{(t.raw(`guide.${section}.items`) as string[]).map((item, index) => <li key={index}>{item}</li>)}</ul></div>)}</div></details>
  </div>
}
