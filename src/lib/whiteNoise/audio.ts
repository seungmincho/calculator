import type { WhiteNoiseAudioPlan, WhiteNoiseType } from '../../utils/whiteNoise.ts'

export interface WhiteNoiseAudio {
  state: () => string
  time: () => number
  resume: () => Promise<void>
  mute: () => void
  start: (plan: WhiteNoiseAudioPlan) => void
  schedule: (plan: WhiteNoiseAudioPlan) => void
  onState: (listener: () => void) => () => void
  onEnded: (listener: () => void) => () => void
  release: () => void
}
export type WhiteNoiseSourceFactory = (context: AudioContext, type: WhiteNoiseType) => AudioBufferSourceNode

/** Ownership starts before the source factory runs, including partial initialization failures. */
export function createWhiteNoiseAudio(context: AudioContext, type: WhiteNoiseType, makeSource: WhiteNoiseSourceFactory): WhiteNoiseAudio {
  let source: AudioBufferSourceNode | null = null, gain: GainNode | null = null, released = false, started = false
  const listeners = new Set<() => void>()
  const safe = (callback: () => void) => { try { callback() } catch { /* Cleanup must release the remaining resources too. */ } }
  const release = () => {
    if (released) return
    released = true
    for (const remove of listeners) safe(remove)
    listeners.clear()
    if (gain) safe(() => { gain!.gain.cancelScheduledValues(context.currentTime); gain!.gain.setValueAtTime(0, context.currentTime) })
    if (source) { safe(() => source!.stop()); safe(() => source!.disconnect()) }
    if (gain) safe(() => gain!.disconnect())
    safe(() => { void context.close().catch(() => {}) })
  }
  try {
    gain = context.createGain(); gain.gain.value = 0
    source = makeSource(context, type)
    source.connect(gain); gain.connect(context.destination)
  } catch (error) { release(); throw error }
  const schedule = (plan: WhiteNoiseAudioPlan) => {
    if (released) throw new Error('audioReleased')
    const param = gain!.gain
    param.cancelScheduledValues(plan.at); param.setValueAtTime(plan.gain, plan.at)
    if (plan.fade && plan.holdUntil !== null && plan.stopAt !== null) {
      if (plan.holdUntil > plan.at) param.setValueAtTime(plan.gain, plan.holdUntil)
      param.linearRampToValueAtTime(0, plan.stopAt)
    }
    if (started && plan.stopAt !== null) source!.stop(plan.stopAt)
  }
  const listen = (target: EventTarget, event: string, listener: () => void) => {
    if (released) return () => {}
    const callback = () => { if (!released) listener() }
    target.addEventListener(event, callback)
    const remove = () => { target.removeEventListener(event, callback); listeners.delete(remove) }
    listeners.add(remove); return remove
  }
  return {
    state: () => context.state, time: () => context.currentTime, resume: () => context.resume(),
    mute() {
      if (released) throw new Error('audioReleased')
      gain!.gain.cancelScheduledValues(context.currentTime); gain!.gain.setValueAtTime(0, context.currentTime)
    },
    start(plan) {
      if (released || started) throw new Error('invalidStart')
      schedule(plan); source!.start(); started = true
      if (plan.stopAt !== null) source!.stop(plan.stopAt)
    },
    schedule, onState: listener => listen(context, 'statechange', listener), onEnded: listener => listen(source!, 'ended', listener), release,
  }
}
