'use client'

import { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/textToSpeech'
import { useOptionalLanguage } from '@/contexts/LanguageContext'
import TtsReadingList from '@/components/TtsReadingList'
import { captureTtsReadingPosition, resolveTtsReadingVoice, type TtsReadingDraft, type TtsReadingLoad, type TtsReadingResult, type TtsReadingSettings } from '@/utils/ttsReadingRecords'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useHydrated } from '@/hooks/useHydrated'
import { TEXT_HANDOFF_KEY, clearTextHandoff, isTextHandoffSource, parseTextHandoff } from '@/utils/textHandoff'
import { captureTtsRecovery, canRetryTtsRecovery, isTtsCancellation, type TtsRecovery } from '@/utils/ttsRecovery'
import { Play, Pause, Square, ClipboardPaste, WrapText, Eraser, Link2, Check } from 'lucide-react'
import {
  chunkText, estimateSeconds, formatDuration, tidyText, wordRange, sortVoices, pickVoice,
  isKoreanVoice, detectPlatform, URL_TEXT_LIMIT, type Platform,
} from '@/utils/tts'

type Status = 'stopped' | 'speaking' | 'paused'
interface Sample { label: string; text: string }

const VOICE_KEY = 'tts.voice'
const SETTINGS_KEY = 'tts.settings'
const SPEED_PRESETS = [
  { key: 'slow', rate: 0.8 },
  { key: 'normal', rate: 1 },
  { key: 'fast', rate: 1.3 },
] as const

export default function TextToSpeech() {
  const t = useTranslations('textToSpeech')
  const language = useOptionalLanguage()?.language ?? 'ko'
  const searchParams = useSearchParams()
  const samples = (t.raw('samples.items') as Sample[] | undefined) ?? []

  const [text, setText] = useState(() => samples[0]?.text ?? '')
  const hydrated = useHydrated()
  const supported = !hydrated || 'speechSynthesis' in window
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [voicesLoaded, setVoicesLoaded] = useState(false)
  const [voiceName, setVoiceName] = useState<string | null>(null)
  const [rate, setRate] = useState(1)
  const [pitch, setPitch] = useState(1)
  const [volume, setVolume] = useState(1)
  const [status, setStatus] = useState<Status>('stopped')
  const [cur, setCur] = useState(-1)
  const [word, setWord] = useState<[number, number] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [recovery, setRecovery] = useState<TtsRecovery | null>(null)
  const recoveryRef = useRef<TtsRecovery | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)
  const [repeat, setRepeat] = useState(false)
  const [repeatStart, setRepeatStart] = useState(0)
  const [repeatEnd, setRepeatEnd] = useState(0)
  const [repeatCount, setRepeatCount] = useState(3)
  const [repeatGap, setRepeatGap] = useState(2)
  const [repeatPass, setRepeatPass] = useState(1)
  const [waiting, setWaiting] = useState(false)
  const platform: Platform = hydrated ? detectPlatform(navigator.userAgent) : 'other'
  const [initialized, setInitialized] = useState(false)
  const [localVoicesOnly, setLocalVoicesOnly] = useState(false)
  const [handoffNotice, setHandoffNotice] = useState('')
  const [handoffCleanupFailed, setHandoffCleanupFailed] = useState(false)
  const consumedHandoffRaw = useRef<string | null>(null)
  const [startFrom, setStartFrom] = useState(0), [readingRevision, setReadingRevision] = useState(0), [textTouched, setTextTouched] = useState(false)
  const [voiceNotice, setVoiceNotice] = useState<'voiceMissing' | 'noLocalVoice' | null>(null)
  const voiceIntent = useRef<TtsReadingSettings | null>(null), startRef = useRef(0)
  const lifetime = useRef({ alive: false, epoch: 0, intent: 0, copy: 0 })
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null), noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clearAsyncNotice = useCallback(() => {
    lifetime.current.copy++
    if (copyTimer.current !== null) clearTimeout(copyTimer.current)
    if (noticeTimer.current !== null) clearTimeout(noticeTimer.current)
    copyTimer.current = null; noticeTimer.current = null; setCopied(false); setCopyFailed(false); setNotice(null)
  }, [])
  const userIntent = useCallback(() => { lifetime.current.intent++; setReadingRevision(value => value + 1); clearAsyncNotice() }, [clearAsyncNotice])
  useLayoutEffect(() => {
    const owner = lifetime.current
    owner.alive = true; owner.epoch++
    return () => { owner.alive = false; owner.epoch++; owner.intent++; owner.copy++; if (copyTimer.current !== null) clearTimeout(copyTimer.current); if (noticeTimer.current !== null) clearTimeout(noticeTimer.current) }
  }, [])
  useLayoutEffect(() => { clearAsyncNotice() }, [language, clearAsyncNotice])

  // 정적 HTML과 첫 렌더를 맞춘 다음, 저장 설정보다 공유 링크 값을 우선 복원한다.
  if (hydrated && !initialized) {
    setInitialized(true)
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null')
      if (saved) {
        if (typeof saved.rate === 'number' && saved.rate >= 0.5 && saved.rate <= 2) setRate(saved.rate)
        if (typeof saved.pitch === 'number' && saved.pitch >= 0.5 && saved.pitch <= 2) setPitch(saved.pitch)
        if (typeof saved.volume === 'number' && saved.volume >= 0 && saved.volume <= 1) setVolume(saved.volume)
      }
    } catch { /* 저장소 차단 또는 잘못된 값 */ }
    const q = searchParams.get('t')
    if (q && !textTouched) setText(q.slice(0, URL_TEXT_LIMIT))
    const from = searchParams.get('from')
    if (isTextHandoffSource(from) && !q && !textTouched) {
      setLocalVoicesOnly(true)
      try {
        const raw = sessionStorage.getItem(TEXT_HANDOFF_KEY)
        const parsed = parseTextHandoff(raw)
        const handoff = parsed?.source === from ? parsed : null
        // Do not consume a valid payload intended for a different source route.
        if (raw && (!parsed || handoff)) consumedHandoffRaw.current = raw
        if (handoff) { setText(handoff.text); setHandoffNotice(from === 'notepad' ? 'handoff.notepadLoaded' : 'handoff.loaded') }
        else setHandoffNotice(from === 'notepad' ? 'handoff.notepadExpired' : 'handoff.expired')
      } catch { setHandoffNotice(from === 'notepad' ? 'handoff.notepadExpired' : 'handoff.expired') }
    }
    const r = Number(searchParams.get('r'))
    if (r >= 0.5 && r <= 2) setRate(r)
  }

  useEffect(() => {
    if (!initialized || consumedHandoffRaw.current === null) return
    const raw = consumedHandoffRaw.current
    consumedHandoffRaw.current = null
    try {
      if (!clearTextHandoff(sessionStorage, raw)) queueMicrotask(() => setHandoffCleanupFailed(true))
    } catch { queueMicrotask(() => setHandoffCleanupFailed(true)) }
  }, [initialized])

  const segments = useMemo(() => chunkText(text), [text])
  const visibleVoices = localVoicesOnly ? voices.filter(v => v.localService) : voices
  const voice = visibleVoices.find((v) => v.name === voiceName) ?? (localVoicesOnly ? visibleVoices.find(isKoreanVoice) ?? visibleVoices[0] : null) ?? null
  const availableVoices = useRef(voices)
  useLayoutEffect(() => { availableVoices.current = voices }, [voices])

  // 재생 루프는 콜백 체인이라 최신 값을 ref로 읽는다
  const session = useRef(0)
  const idx = useRef(0)
  const pass = useRef(1)
  const gapTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const uttRef = useRef<SpeechSynthesisUtterance | null>(null) // GC로 onend가 안 오는 Chrome 버그 방지
  const live = useRef({ text, segments, voice, rate, pitch, volume, localVoicesOnly, repeat, repeatStart, repeatEnd, repeatCount, repeatGap })
  useLayoutEffect(() => { live.current = { text, segments, voice, rate, pitch, volume, localVoicesOnly, repeat, repeatStart, repeatEnd, repeatCount, repeatGap } }, [text, segments, voice, rate, pitch, volume, localVoicesOnly, repeat, repeatStart, repeatEnd, repeatCount, repeatGap])
  const readerRef = useRef<HTMLDivElement>(null)

  const clearRecovery = useCallback(() => {
    recoveryRef.current = null
    setRecovery(null)
    setError(null)
  }, [])

  // ── 음성 목록 (voiceschanged는 비동기, Safari는 이벤트가 없을 때가 있어 몇 번 더 조회) ──
  useEffect(() => {
    if (!('speechSynthesis' in window)) return
    const synth = window.speechSynthesis
    const sessionRef = session
    const gap = gapTimer
    const utteranceRef = uttRef
    // A newly opened handoff tab must not cancel speech already playing in another tab.
    if (!isTextHandoffSource(new URLSearchParams(window.location.search).get('from'))) synth.cancel()
    let saved: string | null = null
    try { saved = localStorage.getItem(VOICE_KEY) } catch { /* 저장소 차단 */ }

    const load = () => {
      const vs = synth.getVoices()
      if (!vs.length) {
        // An empty update also revokes the previous voice before the next utterance.
        availableVoices.current = []
        live.current = { ...live.current, voice: null }
        setVoices([])
        if (live.current.localVoicesOnly) setVoiceNotice('noLocalVoice')
        return
      }
      setVoices(sortVoices(vs))
      if (voiceIntent.current) {
        const chosen = resolveTtsReadingVoice(voiceIntent.current, vs)
        setVoiceName(chosen.voice?.name ?? voiceIntent.current.voiceName)
        setVoiceNotice(!chosen.playAllowed ? 'noLocalVoice' : chosen.missing ? 'voiceMissing' : null)
      } else {
        setVoiceName((prev) => (prev && vs.some((v) => v.name === prev) ? prev : pickVoice(vs, saved)?.name ?? null))
        setVoiceNotice(live.current.localVoicesOnly && !vs.some(v => v.localService === true) ? 'noLocalVoice' : null)
      }
      setVoicesLoaded(true)
    }
    load()
    synth.addEventListener('voiceschanged', load)
    const timers = [250, 1000, 2500].map((ms) => setTimeout(load, ms))
    const giveUp = setTimeout(() => setVoicesLoaded(true), 3000)
    return () => {
      synth.removeEventListener('voiceschanged', load)
      timers.forEach(clearTimeout)
      clearTimeout(giveUp)
      sessionRef.current++
      if (gap.current) clearTimeout(gap.current)
      if (utteranceRef.current) synth.cancel()
    }
  }, [])

  useEffect(() => {
    if (!initialized) return
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ rate, pitch, volume })) } catch { /* 무시 */ }
  }, [initialized, rate, pitch, volume])

  // ── 재생 엔진: 문장(최대 140자) 단위로 이어 읽기 ──
  const speakFrom = useCallback((start: number, resume = false) => {
    if (!lifetime.current.alive || !live.current.segments.length) return
    if (live.current.localVoicesOnly && live.current.voice?.localService !== true) { setVoiceNotice('noLocalVoice'); return }
    const synth = window.speechSynthesis
    const id = ++session.current
    if (gapTimer.current) clearTimeout(gapTimer.current)
    setWaiting(false)
    if (!resume) { pass.current = 1; setRepeatPass(1) }
    synth.cancel()
    clearRecovery()

    const run = (k: number) => {
      if (id !== session.current) return
      const settings = live.current
      if (settings.localVoicesOnly && settings.voice?.localService !== true) {
        session.current++; setStatus('stopped'); setWaiting(false); setWord(null); setVoiceNotice('noLocalVoice'); return
      }
      const { segments: segs, voice: v, rate: r, pitch: p, volume: vol, repeat: looping, repeatStart: first, repeatEnd: last, repeatCount: times, repeatGap: gap } = settings
      if (looping && k > last && pass.current < times) {
        pass.current++
        setRepeatPass(pass.current)
        idx.current = first
        setCur(first); setWord(null); setWaiting(gap > 0)
        gapTimer.current = setTimeout(() => { if (id === session.current) { setWaiting(false); run(first) } }, gap * 1000)
        return
      }
      if (k >= segs.length || (looping && k > last)) {
        session.current++
        idx.current = 0
        startRef.current = 0; setStartFrom(0)
        setStatus('stopped'); setCur(-1); setWord(null)
        return
      }
      idx.current = k
      setCur(k); setWord(null)
      const seg = segs[k]
      const failedPass = pass.current
      let settled = false
      const fail = (code: string) => {
        if (id !== session.current || settled) return
        settled = true
        const generation = ++session.current
        if (gapTimer.current) clearTimeout(gapTimer.current)
        setStatus('stopped'); setWord(null); setWaiting(false)
        if (isTtsCancellation(code)) { idx.current = 0; setCur(-1); clearRecovery(); return }
        const failed = captureTtsRecovery({ ...settings, generation }, k, failedPass)
        recoveryRef.current = failed
        setRecovery(failed)
        setError(t('error', { code }))
      }
      try {
        const u = new SpeechSynthesisUtterance(seg.text)
        if (v) { u.voice = v; u.lang = v.lang } else u.lang = 'ko-KR'
        u.rate = r; u.pitch = p; u.volume = vol
        u.onboundary = (e) => {
          if (id !== session.current || settled || uttRef.current !== u || (e.name && e.name !== 'word')) return
          const [a, b] = wordRange(seg.text, e.charIndex, e.charLength)
          if (b > a) setWord([seg.start + a, seg.start + b])
        }
        u.onend = () => {
          if (id !== session.current || settled || uttRef.current !== u) return
          settled = true
          run(k + 1)
        }
        u.onerror = (e) => { if (uttRef.current === u) fail(e.error) }
        uttRef.current = u
        synth.speak(u)
      } catch { fail('synthesis-failed') }
    }
    setStatus('speaking')
    const settings = live.current
    run(settings.repeat ? Math.max(settings.repeatStart, Math.min(start, settings.repeatEnd)) : Math.max(0, Math.min(start, settings.segments.length - 1)))
  }, [t, clearRecovery])

  // 일시정지 = 현재 문장에서 멈추고, 계속 = 그 문장 처음부터. (브라우저 pause()는 Android에서 취소로 동작하고
  // Chrome 온라인 음성에선 재개가 멈추는 버그가 있어 모든 환경에서 같은 동작을 보장하려고 이 방식을 쓴다)
  const pause = useCallback(() => {
    session.current++
    if (gapTimer.current) clearTimeout(gapTimer.current)
    setWaiting(false)
    window.speechSynthesis.cancel()
    setStatus('paused'); setWord(null)
  }, [])

  const stop = useCallback(() => {
    session.current++
    if (gapTimer.current) clearTimeout(gapTimer.current)
    setWaiting(false)
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
    idx.current = 0
    startRef.current = 0; setStartFrom(0)
    setStatus('stopped'); setCur(-1); setWord(null)
    clearRecovery()
  }, [clearRecovery])

  const retryFailedSentence = () => {
    const failed = recoveryRef.current
    if (!canRetryTtsRecovery(failed, { ...live.current, generation: session.current })) { clearRecovery(); return }
    if (!supported || (live.current.localVoicesOnly && live.current.voice?.localService !== true)) return
    userIntent()
    pass.current = failed.pass
    setRepeatPass(failed.pass)
    speakFrom(failed.sentenceIndex, true)
  }

  const toggle = useCallback(() => {
    userIntent()
    if (status === 'speaking') pause()
    else if (status === 'paused') speakFrom(idx.current, true)
    else speakFrom(startRef.current)
  }, [status, pause, speakFrom, userIntent])

  // Chrome 온라인(Google) 음성은 ~15초 넘게 말하면 끊긴다 → 주기적 pause/resume으로 깨워 둔다 (Android 제외: pause가 cancel로 동작)
  useEffect(() => {
    if (status !== 'speaking' || !voice || voice.localService || platform === 'android') return
    const synth = window.speechSynthesis
    const timer = setInterval(() => {
      if (synth.speaking && !synth.paused) { synth.pause(); synth.resume() }
    }, 10000)
    return () => clearInterval(timer)
  }, [status, voice, platform])

  // 단축키: Space 재생/일시정지(입력 중이 아닐 때), Esc 정지
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { if (status !== 'stopped' || recoveryRef.current) { userIntent(); stop() }; return }
      if (e.code !== 'Space' || e.ctrlKey || e.metaKey || e.altKey) return
      const el = e.target as HTMLElement | null
      if (el?.closest('input, textarea, select, button, a, [contenteditable="true"]')) return
      e.preventDefault()
      if (live.current.segments.length) toggle()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [status, stop, toggle, userIntent])

  // 현재 문장이 읽기 화면 밖이면 스크롤(페이지는 건드리지 않음)
  useEffect(() => {
    const box = readerRef.current
    const el = box?.querySelector<HTMLElement>(`[data-i="${cur}"]`)
    if (!box || !el) return
    if (el.offsetTop < box.scrollTop || el.offsetTop + el.offsetHeight > box.scrollTop + box.clientHeight) {
      box.scrollTop = el.offsetTop - box.clientHeight / 3
    }
  }, [cur])

  const changeText = useCallback((next: string) => {
    userIntent(); setTextTouched(true)
    stop()
    setError(null)
    setCopyFailed(false)
    setCopied(false)
    setRepeat(false); setRepeatStart(0); setRepeatEnd(0)
    setText(next)
  }, [stop, userIntent])

  const changeVoice = (name: string) => {
    userIntent(); voiceIntent.current = null; setVoiceNotice(null)
    setVoiceName(name)
    try { localStorage.setItem(VOICE_KEY, name) } catch { /* 무시 */ }
    if (status === 'speaking') {
      live.current.voice = voices.find((v) => v.name === name && (!live.current.localVoicesOnly || v.localService)) ?? null
      speakFrom(idx.current, true)
    }
  }

  const flash = (msg: string) => {
    if (noticeTimer.current !== null) clearTimeout(noticeTimer.current)
    const owner = lifetime.current, epoch = owner.epoch, intent = owner.intent
    setNotice(msg); noticeTimer.current = setTimeout(() => { if (owner.alive && owner.epoch === epoch && owner.intent === intent) setNotice(null) }, 3000)
  }

  const pasteClipboard = async () => {
    userIntent()
    const owner = lifetime.current, epoch = owner.epoch, intent = owner.intent
    const current = () => owner.alive && owner.epoch === epoch && owner.intent === intent
    try {
      const clip = await navigator.clipboard.readText()
      if (current() && clip.trim()) changeText(clip)
    } catch {
      if (current()) flash(t('tools.pasteFailed'))
    }
  }

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return ''
    const u = new URL(window.location.pathname, window.location.origin)
    u.searchParams.set('t', text)
    if (rate !== 1) u.searchParams.set('r', String(rate))
    return u.toString()
  }, [text, rate])

  const copyLink = async () => {
    const owner = lifetime.current, epoch = owner.epoch, request = ++owner.copy
    if (!owner.alive) return
    const current = () => owner.alive && owner.epoch === epoch && owner.copy === request
    if (copyTimer.current !== null) clearTimeout(copyTimer.current)
    setCopied(false)
    setCopyFailed(false)
    try {
      await navigator.clipboard.writeText(shareUrl)
      if (!current()) return
      setCopied(true)
      copyTimer.current = setTimeout(() => { if (current()) setCopied(false) }, 2000)
    } catch {
      if (!current()) return
      setCopied(false)
      setCopyFailed(true)
    }
  }

  const captureReadingDraft = (): TtsReadingResult<TtsReadingDraft> => {
    const settings = live.current
    const captured = captureTtsReadingPosition(settings.text, { status, currentIndex: idx.current, startFrom: startRef.current,
      recovery: recoveryRef.current, recoveryContext: { ...settings, generation: session.current } })
    if (!captured.ok) return captured
    return { ok: true, value: { text: settings.text, position: captured.value, settings: {
      voiceName: settings.voice?.name ?? voiceName, rate: settings.rate, pitch: settings.pitch, volume: settings.volume, localVoicesOnly: settings.localVoicesOnly,
    } } }
  }
  const applyReadingRecord = (loaded: TtsReadingLoad): boolean => {
    if (!initialized || !lifetime.current.alive) return false
    userIntent(); stop()
    const { record, segments: restoredSegments } = loaded, saved = record.settings, start = loaded.index ?? 0
    const selected = resolveTtsReadingVoice(saved, availableVoices.current)
    voiceIntent.current = { ...saved }
    setTextTouched(true); setText(record.text); setVoiceName(selected.voice?.name ?? saved.voiceName)
    setRate(saved.rate); setPitch(saved.pitch); setVolume(saved.volume); setLocalVoicesOnly(saved.localVoicesOnly)
    setVoiceNotice(!selected.playAllowed ? 'noLocalVoice' : selected.missing ? 'voiceMissing' : null)
    setRepeat(false); setRepeatStart(0); setRepeatEnd(0); pass.current = 1; setRepeatPass(1)
    startRef.current = start; setStartFrom(start); idx.current = start; setCur(loaded.index ?? -1)
    live.current = { text: record.text, segments: restoredSegments, voice: selected.voice, rate: saved.rate, pitch: saved.pitch, volume: saved.volume,
      localVoicesOnly: saved.localVoicesOnly, repeat: false, repeatStart: 0, repeatEnd: 0, repeatCount, repeatGap }
    return true
  }

  // ── 표시용 계산 ──
  const totalSec = estimateSeconds(text, rate)
  const pos = cur >= 0 && segments[cur] ? (word?.[0] ?? segments[cur].start) : -1
  const remainSec = pos >= 0 ? estimateSeconds(text.slice(pos), rate) : totalSec
  const koVoices = visibleVoices.filter(isKoreanVoice)
  const otherVoices = visibleVoices.filter((v) => !isKoreanVoice(v))
  const noKorean = voicesLoaded && koVoices.length === 0
  const canPlay = initialized && segments.length > 0 && supported && (!localVoicesOnly || voice?.localService === true)
  const tooLongForUrl = text.length > URL_TEXT_LIMIT
  const voiceLabel = (v: SpeechSynthesisVoice) => `${v.name} (${v.lang})${v.localService ? '' : ` · ${t('online')}`}`

  const renderReader = () => {
    const parts: React.ReactNode[] = []
    let last = 0
    segments.forEach((s, i) => {
      if (s.start > last) parts.push(text.slice(last, s.start))
      const active = i === cur
      const w = active && word && word[0] >= s.start && word[1] <= s.end ? word : null
      parts.push(
        <button
          type="button"
          key={i}
          data-i={i}
          onClick={() => { userIntent(); speakFrom(i) }}
          disabled={!canPlay || (repeat && (i < repeatStart || i > repeatEnd))}
          title={t('reader.clickHint')}
          className={`max-w-full text-left whitespace-pre-wrap break-words rounded px-0.5 -mx-0.5 transition-colors disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-primary ${
            active ? 'bg-primary-soft text-primary' : 'hover:bg-soft'
          }`}
        >
          {w ? (
            <>
              {text.slice(s.start, w[0])}
              <span className="bg-primary text-white rounded px-0.5">{text.slice(w[0], w[1])}</span>
              {text.slice(w[1], s.end)}
            </>
          ) : s.text}
        </button>,
      )
      last = s.end
    })
    if (last < text.length) parts.push(text.slice(last))
    return parts
  }

  if (!supported) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
          <p className="text-sm text-muted mt-1">{t('description')}</p>
        </div>
        <div className="bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200 rounded-2xl p-5">
          {t('notSupported')}
        </div>
      </div>
    )
  }

  return (
    <div data-tts-root="" data-tts-status={status} data-tts-current={cur} data-tts-start-from={startFrom} data-tts-ready={initialized} className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="min-w-0 lg:col-span-2 space-y-6">
          {/* 텍스트 입력 */}
          <div id="tts-input" className="ui-card p-4 sm:p-6 space-y-4 scroll-mt-20">
            {handoffNotice && <p role="status" className="text-sm text-sub">{t(handoffNotice)}</p>}
            {handoffCleanupFailed && <p role="alert" className="text-sm text-sub">{t('handoff.cleanupFailed')}</p>}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="tts-text" className="text-sm font-semibold text-body">{t('textInput')}</label>
              <div className="flex flex-wrap gap-2">
                <button data-tts-paste="" onClick={pasteClipboard} className="bg-soft hover:bg-subtle text-body rounded-xl min-h-11 px-3 py-1.5 text-sm font-medium inline-flex items-center gap-1.5">
                  <ClipboardPaste className="w-4 h-4" />{t('tools.paste')}
                </button>
                <button onClick={() => changeText(tidyText(text))} disabled={!text} className="bg-soft hover:bg-subtle text-body rounded-xl min-h-11 px-3 py-1.5 text-sm font-medium inline-flex items-center gap-1.5 disabled:opacity-45">
                  <WrapText className="w-4 h-4" />{t('tools.tidy')}
                </button>
                <button onClick={() => changeText('')} disabled={!text} className="bg-soft hover:bg-subtle text-body rounded-xl min-h-11 px-3 py-1.5 text-sm font-medium inline-flex items-center gap-1.5 disabled:opacity-45">
                  <Eraser className="w-4 h-4" />{t('tools.clear')}
                </button>
              </div>
            </div>
            <textarea
              id="tts-text"
              value={text}
              onChange={(e) => changeText(e.target.value)}
              placeholder={t('textPlaceholder')}
              className="ui-field px-4 py-3 min-h-[140px] sm:min-h-[180px] text-base leading-relaxed"
            />
            <div id="tts-controls" className="scroll-mt-20 flex flex-wrap items-center gap-3">
              <button data-tts-play="" onClick={toggle} disabled={!canPlay} className="ui-btn px-5 py-3 min-w-[128px]">
                {status === 'speaking' ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                {status === 'speaking' ? t('pause') : status === 'paused' ? t('resume') : t('play')}
              </button>
              <button data-tts-stop="" onClick={() => { userIntent(); stop() }} disabled={status === 'stopped' && !recovery && startFrom === 0} className="bg-soft hover:bg-subtle text-body rounded-xl px-4 py-3 font-semibold inline-flex items-center gap-2 disabled:opacity-45">
                <Square className="w-4 h-4" />{t('stop')}
              </button>
              <div className="text-sm text-sub ml-auto tabular-nums" aria-live="polite">
                {status === 'speaking' ? t('speaking') : status === 'paused' ? t('paused') : t('stopped')}
                {status !== 'stopped' && ` · ${repeat ? t('repeat.progress', { current: repeatPass, total: repeatCount }) : t('remaining', { time: formatDuration(remainSec) })}`}
              </div>
            </div>
            <fieldset className="bg-subtle rounded-2xl p-4 space-y-3" disabled={status !== 'stopped' || !segments.length}>
              <label className="flex min-h-11 items-center gap-3 text-sm font-semibold text-body cursor-pointer">
                <input data-tts-repeat="" type="checkbox" checked={repeat} onChange={e => { userIntent(); clearRecovery(); setRepeat(e.target.checked); setRepeatStart(0); setRepeatEnd(Math.max(0, segments.length - 1)) }} className="w-5 h-5 accent-primary" />
                {t('repeat.enable')}
              </label>
              {repeat && <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="min-w-0 text-sm text-body">{t('repeat.start')}
                  <select className="ui-field w-full min-w-0 mt-1 px-3 py-3 text-base" aria-label={t('repeat.start')} value={repeatStart} onChange={e => { userIntent(); clearRecovery(); const start = Number(e.target.value); setRepeatStart(start); setRepeatEnd(Math.max(start, repeatEnd)) }}>
                    {segments.map((seg, i) => <option key={i} value={i}>{i + 1}. {seg.text.slice(0, 32)}</option>)}
                  </select>
                </label>
                <label className="min-w-0 text-sm text-body">{t('repeat.end')}
                  <select className="ui-field w-full min-w-0 mt-1 px-3 py-3 text-base" aria-label={t('repeat.end')} value={repeatEnd} onChange={e => { userIntent(); clearRecovery(); setRepeatEnd(Number(e.target.value)) }}>
                    {segments.map((seg, i) => i >= repeatStart && <option key={i} value={i}>{i + 1}. {seg.text.slice(0, 32)}</option>)}
                  </select>
                </label>
                <label className="text-sm text-body">{t('repeat.count')}
                  <select className="ui-field mt-1 px-3 py-3 text-base" aria-label={t('repeat.count')} value={repeatCount} onChange={e => { userIntent(); clearRecovery(); setRepeatCount(Number(e.target.value)) }}>
                    {[2, 3, 5, 10].map(n => <option key={n} value={n}>{t('repeat.times', { count: n })}</option>)}
                  </select>
                </label>
                <label className="text-sm text-body">{t('repeat.gap')}
                  <select className="ui-field mt-1 px-3 py-3 text-base" aria-label={t('repeat.gap')} value={repeatGap} onChange={e => { userIntent(); clearRecovery(); setRepeatGap(Number(e.target.value)) }}>
                    {[0, 2, 5, 10].map(n => <option key={n} value={n}>{t('repeat.seconds', { count: n })}</option>)}
                  </select>
                </label>
              </div>}
              <p className="text-xs text-muted">{t('repeat.hint')}</p>
            </fieldset>
            {waiting && <p role="status" className="text-sm text-primary">{t('repeat.waiting')}</p>}
            {error && <div className="rounded-2xl border border-line bg-subtle p-4 text-sm text-body space-y-3">
              <p role="alert">{error}</p>
              {recovery && <>
                <p className="font-medium text-fg">{t('recovery.sentence', { number: recovery.sentenceIndex + 1 })}</p>
                <p className="whitespace-pre-wrap break-words">{recovery.sentence.text}</p>
                {recovery.settings.repeat && <p className="text-sub">{t('recovery.repeat', { pass: recovery.pass, count: recovery.settings.repeatCount, remaining: recovery.settings.repeatCount - recovery.pass })}</p>}
                <button data-tts-retry="" type="button" onClick={retryFailedSentence} disabled={!canPlay} className="ui-btn min-h-11 px-4 py-2 text-sm disabled:opacity-45">{t('recovery.retry')}</button>
                <p className="text-xs text-sub">{t('recovery.hint')}</p>
                {localVoicesOnly && !voice && <p className="text-xs text-sub">{t('handoff.noLocal')}</p>}
              </>}
            </div>}
            {notice && <p role="status" className="text-sm text-sub">{notice}</p>}
            {status === 'stopped' && startFrom > 0 && <p data-tts-resume-position="" role="status" className="text-sm text-primary">{t('readingList.resumeFrom', { sentence: startFrom + 1 })}</p>}
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-sub tabular-nums">
              <span>{t('charCount')} {text.length.toLocaleString()}</span>
              <span>{t('stats.charsNoSpace')} {text.replace(/\s/g, '').length.toLocaleString()}</span>
              <span>{t('stats.sentences')} {segments.length.toLocaleString()}</span>
              <span>{t('estimatedTime')} {t('stats.about', { time: formatDuration(totalSec) })}</span>
            </div>
            <div>
              <p className="text-xs text-muted mb-2">{t('samples.title')}</p>
              <div className="flex flex-wrap gap-2">
                {samples.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => changeText(s.text)}
                    className={`rounded-full min-h-11 px-3 py-1.5 text-sm font-medium ${
                      text === s.text ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <TtsReadingList ready={initialized} inputRevision={readingRevision} capture={captureReadingDraft} onApply={applyReadingRecord} />
          </div>

          {/* 플레이어 + 읽기 화면 */}
          <div className="ui-card p-4 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-body">{t('reader.title')}</h2>
              <a href="#tts-controls" className="min-h-11 inline-flex items-center text-sm text-primary font-medium">{t('reader.controls')}</a>
            </div>

            {segments.length > 1 && (
              <div>
                <input
                  type="range"
                  disabled={!canPlay}
                  min={repeat ? repeatStart : 0}
                  max={repeat ? repeatEnd : segments.length - 1}
                  value={repeat ? Math.max(repeatStart, Math.min(cur, repeatEnd)) : Math.max(cur, 0)}
                  onChange={(e) => { userIntent(); speakFrom(Number(e.target.value)) }}
                  aria-label={t('progressLabel')}
                  className="w-full h-11 accent-primary"
                />
                <div className="flex justify-between text-xs text-muted tabular-nums">
                  <span>{t('progress', { current: Math.max(cur, 0) + 1, total: segments.length })}</span>
                  <span>{formatDuration(totalSec)}</span>
                </div>
              </div>
            )}

            <div>
              <p className="text-xs text-muted mb-2">{t('reader.hint')}</p>
              <div
                ref={readerRef}
                className="relative bg-subtle rounded-2xl p-5 max-h-80 overflow-y-auto whitespace-pre-wrap leading-8 text-body"
              >
                {segments.length ? renderReader() : <span className="text-faint">{t('reader.empty')}</span>}
              </div>
            </div>
            <p className="text-xs text-muted">{t('shortcuts')}</p>
          </div>
        </div>

        {/* 설정 */}
        <div className="space-y-6">
          <div className="ui-card p-4 sm:p-6 space-y-5">
            <div>
              <label htmlFor="tts-voice" className="block text-sm font-semibold text-body mb-2">{t('voice')}</label>
              {visibleVoices.length > 0 ? (
                <select id="tts-voice" value={voice?.name ?? voiceName ?? ''} onChange={(e) => changeVoice(e.target.value)} className="ui-field px-3 py-2.5 text-base">
                  {koVoices.length > 0 && (
                    <optgroup label={t('voiceGroups.korean')}>
                      {koVoices.map((v) => <option key={v.name} value={v.name}>{voiceLabel(v)}</option>)}
                    </optgroup>
                  )}
                  <optgroup label={t('voiceGroups.other')}>
                    {otherVoices.map((v) => <option key={v.name} value={v.name}>{voiceLabel(v)}</option>)}
                  </optgroup>
                </select>
              ) : (
                <p className="text-sm text-muted">{voicesLoaded ? t('noVoices') : t('loadingVoices')}</p>
              )}
              <label className="mt-3 min-h-11 flex items-center gap-3 text-sm text-body"><input data-tts-local-only="" type="checkbox" checked={localVoicesOnly} onChange={e => { userIntent(); voiceIntent.current = null; setVoiceNotice(null); stop(); setLocalVoicesOnly(e.target.checked) }} className="w-5 h-5 accent-primary" />{t('handoff.localOnly')}</label>
              {voiceNotice && <p data-tts-voice-notice={voiceNotice} role="status" className="mt-2 text-sm text-sub">{t(`readingList.${voiceNotice}`)}</p>}
              <p className="text-xs text-muted mt-1">{t('handoff.voicePrivacy')}</p>
              {localVoicesOnly && voicesLoaded && !visibleVoices.length && <p role="status" className="text-sm text-sub mt-2">{t('handoff.noLocal')}</p>}
              {noKorean && (
                <div className="mt-3 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200 rounded-2xl p-4 text-sm space-y-1">
                  <p className="font-semibold">{t('noKoreanVoice.title')}</p>
                  <p>{t(`noKoreanVoice.${platform}`)}</p>
                </div>
              )}
            </div>

            <div>
              <p className="text-sm font-semibold text-body mb-2">{t('speedPresets.title')}</p>
              <div className="grid grid-cols-3 gap-2">
                {SPEED_PRESETS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => { userIntent(); setRate(p.rate) }}
                    className={`rounded-xl min-h-11 px-2 py-2 text-sm font-medium ${
                      rate === p.rate ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'
                    }`}
                  >
                    {t(`speedPresets.${p.key}`)}
                  </button>
                ))}
              </div>
            </div>

            {([
              ['rate', rate, setRate, 0.5, 2, 0.05, `${rate.toFixed(2)}x`],
              ['pitch', pitch, setPitch, 0.5, 2, 0.1, pitch.toFixed(1)],
              ['volume', volume, setVolume, 0, 1, 0.05, `${Math.round(volume * 100)}%`],
            ] as const).map(([key, value, set, min, max, step, shown]) => (
              <div key={key}>
                <label htmlFor={`tts-${key}`} className="flex justify-between text-sm font-medium text-body mb-1">
                  <span>{t(key)}</span><span className="tabular-nums text-sub">{shown}</span>
                </label>
                <input
                  id={`tts-${key}`}
                  type="range" min={min} max={max} step={step} value={value}
                  onChange={(e) => { userIntent(); set(Number(e.target.value)) }}
                  className="w-full h-11 accent-primary"
                />
              </div>
            ))}
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted">{t('settingsNote')}</p>
              <button
                onClick={() => { userIntent(); setRate(1); setPitch(1); setVolume(1) }}
                className="bg-soft hover:bg-subtle text-body rounded-xl min-h-11 px-3 py-1.5 text-xs font-medium shrink-0"
              >
                {t('resetSettings')}
              </button>
            </div>
          </div>

          <div className="ui-card p-4 sm:p-6 space-y-3">
            <p className="text-sm font-semibold text-body">{t('share.title')}</p>
            <button data-tts-copy-link="" onClick={copyLink} disabled={!initialized || !text || tooLongForUrl} className="ui-btn-soft w-full px-4 py-2.5 text-sm">
              {copied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
              {copied ? t('share.copied') : t('share.copy')}
            </button>
            {copyFailed && <p role="status" className="text-sm text-sub">{t('share.copyFailed')}</p>}
            <p className="text-xs text-muted">
              {tooLongForUrl ? t('share.tooLong', { max: URL_TEXT_LIMIT.toLocaleString() }) : t('share.hint')}
            </p>
          </div>

          <div className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-2">
            <p className="font-semibold text-body">{t('recording.title')}</p>
            <p>{t('recording.body')}</p>
            <ul className="list-disc pl-5 space-y-1">
              {((t.raw('recording.items') as string[] | undefined) ?? []).map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        </div>
      </div>

      {/* 가이드 */}
      <div className="ui-card p-4 sm:p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        <div>
          <h3 className="text-lg font-semibold text-fg mb-2">{t('guide.whatIs.title')}</h3>
          <p className="text-body leading-relaxed">{t('guide.whatIs.description')}</p>
        </div>
        {(['howToUse', 'tips'] as const).map((sec) => (
          <div key={sec}>
            <h3 className="text-lg font-semibold text-fg mb-2">{t(`guide.${sec}.title`)}</h3>
            <ul className="list-disc pl-5 space-y-1.5 text-body">
              {(t.raw(`guide.${sec}.items`) as string[]).map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        ))}
        <div>
          <h3 className="text-lg font-semibold text-fg mb-2">{t('guide.faq.title')}</h3>
          <div className="space-y-3">
            {(t.raw('guide.faq.items') as { q: string; a: string }[]).map((f) => (
              <div key={f.q} className="bg-subtle rounded-2xl p-4">
                <p className="font-semibold text-fg">{f.q}</p>
                <p className="text-sub mt-1">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
