'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/textToSpeech'
import { useSearchParams } from '@/hooks/useSearchParams'
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
  const searchParams = useSearchParams()
  const samples = (t.raw('samples.items') as Sample[] | undefined) ?? []

  const [text, setText] = useState(() => samples[0]?.text ?? '')
  const [supported, setSupported] = useState(true)
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
  const [notice, setNotice] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [platform, setPlatform] = useState<Platform>('other')

  const segments = useMemo(() => chunkText(text), [text])
  const voice = voices.find((v) => v.name === voiceName) ?? null

  // 재생 루프는 콜백 체인이라 최신 값을 ref로 읽는다
  const session = useRef(0)
  const idx = useRef(0)
  const uttRef = useRef<SpeechSynthesisUtterance | null>(null) // GC로 onend가 안 오는 Chrome 버그 방지
  const live = useRef({ segments, voice, rate, pitch, volume })
  live.current = { segments, voice, rate, pitch, volume }
  const settingsLoaded = useRef(false)
  const readerRef = useRef<HTMLDivElement>(null)

  // ── 음성 목록 (voiceschanged는 비동기, Safari는 이벤트가 없을 때가 있어 몇 번 더 조회) ──
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) { setSupported(false); return }
    const synth = window.speechSynthesis
    synth.cancel() // 새로고침 전 발화가 남아 있는 Chrome 대비
    setPlatform(detectPlatform(navigator.userAgent))
    let saved: string | null = null
    try { saved = localStorage.getItem(VOICE_KEY) } catch { /* 저장소 차단 */ }
    try {
      const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null')
      if (s) { setRate(s.rate ?? 1); setPitch(s.pitch ?? 1); setVolume(s.volume ?? 1) }
    } catch { /* 무시 */ }
    settingsLoaded.current = true

    const load = () => {
      const vs = synth.getVoices()
      if (!vs.length) return
      setVoices(sortVoices(vs))
      setVoiceName((prev) => (prev && vs.some((v) => v.name === prev) ? prev : pickVoice(vs, saved)?.name ?? null))
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
      session.current++
      synth.cancel()
    }
  }, [])

  // URL ?t=텍스트&r=속도 복원
  useEffect(() => {
    const q = searchParams.get('t')
    if (q) setText(q.slice(0, URL_TEXT_LIMIT))
    const r = Number(searchParams.get('r'))
    if (r >= 0.5 && r <= 2) setRate(r)
  }, [searchParams])

  useEffect(() => {
    if (!settingsLoaded.current) return
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ rate, pitch, volume })) } catch { /* 무시 */ }
  }, [rate, pitch, volume])

  // ── 재생 엔진: 문장(최대 140자) 단위로 이어 읽기 ──
  const speakFrom = useCallback((start: number) => {
    const synth = window.speechSynthesis
    const id = ++session.current
    synth.cancel()
    setError(null)

    const run = (k: number) => {
      if (id !== session.current) return
      const { segments: segs, voice: v, rate: r, pitch: p, volume: vol } = live.current
      if (k >= segs.length) {
        session.current++
        idx.current = 0
        setStatus('stopped'); setCur(-1); setWord(null)
        return
      }
      idx.current = k
      setCur(k); setWord(null)
      const seg = segs[k]
      const u = new SpeechSynthesisUtterance(seg.text)
      if (v) { u.voice = v; u.lang = v.lang } else u.lang = 'ko-KR'
      u.rate = r; u.pitch = p; u.volume = vol
      u.onboundary = (e) => {
        if (id !== session.current || (e.name && e.name !== 'word')) return
        const [a, b] = wordRange(seg.text, e.charIndex, e.charLength)
        if (b > a) setWord([seg.start + a, seg.start + b])
      }
      u.onend = () => run(k + 1)
      u.onerror = (e) => {
        if (id !== session.current || e.error === 'interrupted' || e.error === 'canceled') return
        session.current++
        setStatus('stopped'); setWord(null)
        setError(t('error', { code: e.error }))
      }
      uttRef.current = u
      synth.speak(u)
    }
    setStatus('speaking')
    run(Math.max(0, Math.min(start, live.current.segments.length - 1)))
  }, [t])

  // 일시정지 = 현재 문장에서 멈추고, 계속 = 그 문장 처음부터. (브라우저 pause()는 Android에서 취소로 동작하고
  // Chrome 온라인 음성에선 재개가 멈추는 버그가 있어 모든 환경에서 같은 동작을 보장하려고 이 방식을 쓴다)
  const pause = useCallback(() => {
    session.current++
    window.speechSynthesis.cancel()
    setStatus('paused'); setWord(null)
  }, [])

  const stop = useCallback(() => {
    session.current++
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
    idx.current = 0
    setStatus('stopped'); setCur(-1); setWord(null)
  }, [])

  const toggle = useCallback(() => {
    if (status === 'speaking') pause()
    else if (status === 'paused') speakFrom(idx.current)
    else speakFrom(0)
  }, [status, pause, speakFrom])

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
      if (e.key === 'Escape') { if (status !== 'stopped') stop(); return }
      if (e.code !== 'Space' || e.ctrlKey || e.metaKey || e.altKey) return
      const el = e.target as HTMLElement | null
      if (el?.closest('input, textarea, select, button, a, [contenteditable="true"]')) return
      e.preventDefault()
      if (live.current.segments.length) toggle()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [status, stop, toggle])

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
    stop()
    setText(next)
  }, [stop])

  const changeVoice = (name: string) => {
    setVoiceName(name)
    try { localStorage.setItem(VOICE_KEY, name) } catch { /* 무시 */ }
    if (status === 'speaking') {
      live.current.voice = voices.find((v) => v.name === name) ?? null
      speakFrom(idx.current)
    }
  }

  const flash = (msg: string) => { setNotice(msg); setTimeout(() => setNotice(null), 3000) }

  const pasteClipboard = async () => {
    try {
      const clip = await navigator.clipboard.readText()
      if (clip.trim()) changeText(clip)
    } catch {
      flash(t('tools.pasteFailed'))
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
    try { await navigator.clipboard.writeText(shareUrl) } catch { /* 권한 없음 */ }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── 표시용 계산 ──
  const totalSec = estimateSeconds(text, rate)
  const pos = cur >= 0 && segments[cur] ? (word?.[0] ?? segments[cur].start) : -1
  const remainSec = pos >= 0 ? estimateSeconds(text.slice(pos), rate) : totalSec
  const koVoices = voices.filter(isKoreanVoice)
  const otherVoices = voices.filter((v) => !isKoreanVoice(v))
  const noKorean = voicesLoaded && koVoices.length === 0
  const canPlay = segments.length > 0 && supported
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
        <span
          key={i}
          data-i={i}
          onClick={() => speakFrom(i)}
          title={t('reader.clickHint')}
          className={`cursor-pointer rounded px-0.5 -mx-0.5 transition-colors ${
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
        </span>,
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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* 텍스트 입력 */}
          <div className="ui-card p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="tts-text" className="text-sm font-semibold text-body">{t('textInput')}</label>
              <div className="flex flex-wrap gap-2">
                <button onClick={pasteClipboard} className="bg-soft hover:bg-subtle text-body rounded-xl px-3 py-1.5 text-sm font-medium inline-flex items-center gap-1.5">
                  <ClipboardPaste className="w-4 h-4" />{t('tools.paste')}
                </button>
                <button onClick={() => changeText(tidyText(text))} disabled={!text} className="bg-soft hover:bg-subtle text-body rounded-xl px-3 py-1.5 text-sm font-medium inline-flex items-center gap-1.5 disabled:opacity-45">
                  <WrapText className="w-4 h-4" />{t('tools.tidy')}
                </button>
                <button onClick={() => changeText('')} disabled={!text} className="bg-soft hover:bg-subtle text-body rounded-xl px-3 py-1.5 text-sm font-medium inline-flex items-center gap-1.5 disabled:opacity-45">
                  <Eraser className="w-4 h-4" />{t('tools.clear')}
                </button>
              </div>
            </div>
            <textarea
              id="tts-text"
              value={text}
              onChange={(e) => changeText(e.target.value)}
              placeholder={t('textPlaceholder')}
              className="ui-field px-4 py-3 min-h-[180px] leading-relaxed"
            />
            {notice && <p className="text-sm text-amber-700 dark:text-amber-300">{notice}</p>}
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
                    className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                      text === s.text ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 플레이어 + 읽기 화면 */}
          <div className="ui-card p-6 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={toggle} disabled={!canPlay} className="ui-btn px-5 py-3 min-w-[128px]">
                {status === 'speaking' ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                {status === 'speaking' ? t('pause') : status === 'paused' ? t('resume') : t('play')}
              </button>
              <button onClick={stop} disabled={status === 'stopped'} className="bg-soft hover:bg-subtle text-body rounded-xl px-4 py-3 font-semibold inline-flex items-center gap-2 disabled:opacity-45">
                <Square className="w-4 h-4" />{t('stop')}
              </button>
              <div className="text-sm text-sub ml-auto tabular-nums" aria-live="polite">
                {status === 'speaking' ? t('speaking') : status === 'paused' ? t('paused') : t('stopped')}
                {status !== 'stopped' && ` · ${t('remaining', { time: formatDuration(remainSec) })}`}
              </div>
            </div>

            {segments.length > 1 && (
              <div>
                <input
                  type="range"
                  min={0}
                  max={segments.length - 1}
                  value={Math.max(cur, 0)}
                  onChange={(e) => speakFrom(Number(e.target.value))}
                  aria-label={t('progressLabel')}
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between text-xs text-muted tabular-nums">
                  <span>{t('progress', { current: Math.max(cur, 0) + 1, total: segments.length })}</span>
                  <span>{formatDuration(totalSec)}</span>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200 rounded-2xl p-4 text-sm">{error}</div>
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
          <div className="ui-card p-6 space-y-5">
            <div>
              <label htmlFor="tts-voice" className="block text-sm font-semibold text-body mb-2">{t('voice')}</label>
              {voices.length > 0 ? (
                <select id="tts-voice" value={voiceName ?? ''} onChange={(e) => changeVoice(e.target.value)} className="ui-field px-3 py-2.5 text-sm">
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
                    onClick={() => setRate(p.rate)}
                    className={`rounded-xl px-2 py-2 text-sm font-medium ${
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
                  onChange={(e) => set(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>
            ))}
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted">{t('settingsNote')}</p>
              <button
                onClick={() => { setRate(1); setPitch(1); setVolume(1) }}
                className="bg-soft hover:bg-subtle text-body rounded-xl px-3 py-1.5 text-xs font-medium shrink-0"
              >
                {t('resetSettings')}
              </button>
            </div>
          </div>

          <div className="ui-card p-6 space-y-3">
            <p className="text-sm font-semibold text-body">{t('share.title')}</p>
            <button onClick={copyLink} disabled={!text || tooLongForUrl} className="ui-btn-soft w-full px-4 py-2.5 text-sm">
              {copied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
              {copied ? t('share.copied') : t('share.copy')}
            </button>
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
      <div className="ui-card p-6 space-y-6">
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
