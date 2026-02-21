'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'game_sounds_enabled'

export function useGameSounds() {
  const audioContextRef = useRef<AudioContext | null>(null)
  const [enabled, setEnabledState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored === null ? true : stored === 'true'
    } catch {
      return true
    }
  })
  const enabledRef = useRef(enabled)

  useEffect(() => {
    enabledRef.current = enabled
  }, [enabled])

  const setEnabled = useCallback((v: boolean) => {
    setEnabledState(v)
    enabledRef.current = v
    try {
      localStorage.setItem(STORAGE_KEY, String(v))
    } catch {}
  }, [])

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {})
        audioContextRef.current = null
      }
    }
  }, [])

  const getAudioContext = useCallback((): AudioContext | null => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext()
      }
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(() => {})
      }
      return audioContextRef.current
    } catch {
      return null
    }
  }, [])

  // Short click - stone/piece placement
  const playMove = useCallback(() => {
    if (!enabledRef.current) return
    try {
      const ctx = getAudioContext()
      if (!ctx) return
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(800, ctx.currentTime)
      gain.gain.setValueAtTime(0, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.01)
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.05)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.05)
    } catch {}
  }, [getAudioContext])

  // Pop/capture sound - frequency sweep
  const playCapture = useCallback(() => {
    if (!enabledRef.current) return
    try {
      const ctx = getAudioContext()
      if (!ctx) return
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(600, ctx.currentTime)
      osc.frequency.linearRampToValueAtTime(900, ctx.currentTime + 0.1)
      gain.gain.setValueAtTime(0, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.01)
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.1)
    } catch {}
  }, [getAudioContext])

  // Victory jingle - 3 ascending notes: C5, E5, G5
  const playWin = useCallback(() => {
    if (!enabledRef.current) return
    try {
      const ctx = getAudioContext()
      if (!ctx) return
      const notes = [523, 659, 784] // C5, E5, G5
      const noteDuration = 0.1
      const gapDuration = 0.05

      notes.forEach((freq, i) => {
        const startTime = ctx.currentTime + i * (noteDuration + gapDuration)
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, startTime)
        gain.gain.setValueAtTime(0, startTime)
        gain.gain.linearRampToValueAtTime(0.25, startTime + 0.01)
        gain.gain.linearRampToValueAtTime(0, startTime + noteDuration)
        osc.start(startTime)
        osc.stop(startTime + noteDuration)
      })
    } catch {}
  }, [getAudioContext])

  // Sad descending tone - frequency sweep down
  const playLose = useCallback(() => {
    if (!enabledRef.current) return
    try {
      const ctx = getAudioContext()
      if (!ctx) return
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(400, ctx.currentTime)
      osc.frequency.linearRampToValueAtTime(200, ctx.currentTime + 0.3)
      gain.gain.setValueAtTime(0, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.01)
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.3)
    } catch {}
  }, [getAudioContext])

  // Neutral two-tone: E4, E4
  const playDraw = useCallback(() => {
    if (!enabledRef.current) return
    try {
      const ctx = getAudioContext()
      if (!ctx) return
      const noteDuration = 0.1
      const gapDuration = 0.05

      for (let i = 0; i < 2; i++) {
        const startTime = ctx.currentTime + i * (noteDuration + gapDuration)
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(330, startTime) // E4
        gain.gain.setValueAtTime(0, startTime)
        gain.gain.linearRampToValueAtTime(0.2, startTime + 0.01)
        gain.gain.linearRampToValueAtTime(0, startTime + noteDuration)
        osc.start(startTime)
        osc.stop(startTime + noteDuration)
      }
    } catch {}
  }, [getAudioContext])

  // Short buzz for invalid move
  const playInvalid = useCallback(() => {
    if (!enabledRef.current) return
    try {
      const ctx = getAudioContext()
      if (!ctx) return
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'square'
      osc.frequency.setValueAtTime(150, ctx.currentTime)
      gain.gain.setValueAtTime(0, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.01)
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.1)
    } catch {}
  }, [getAudioContext])

  return {
    playMove,
    playCapture,
    playWin,
    playLose,
    playDraw,
    playInvalid,
    enabled,
    setEnabled,
  }
}

export default useGameSounds
