'use client'

import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/morseCode'
import { useSearchParams } from '@/hooks/useSearchParams'
import { Copy, Check, Play, Square, Download, Trash2, ArrowDownUp, Delete, RotateCcw } from 'lucide-react'
import ShareResult from '@/components/ShareResult'
import {
  encode, toMorse, parseMorse, tokensToText, hasHangul, timing, schedule, vibratePattern, wav, grade,
  LETTERS, DIGITS, PUNCT, PROSIGNS, KO_CONS, KO_VOWEL, KOCH_EN, KOCH_KO, type Token, type Alphabet,
} from '@/utils/morse'

type Mode = 'encode' | 'decode'
type Tab = 'convert' | 'practice'
const DEF = { t: 'SOS', w: 15, hz: 600 }
const EXAMPLES = ['SOS', 'HELLO WORLD', '사랑해', '안녕하세요']
const clampNum = (s: string | null, lo: number, hi: number, d: number) => {
  const n = Number(s)
  return s && Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : d
}
const pretty = (code: string) => code.replace(/\./g, '·').replace(/-/g, '−')

export default function MorseCode() {
  const t = useTranslations('morseCode')
  const sp = useSearchParams()

  const [tab, setTab] = useState<Tab>(() => (sp.get('tab') === 'practice' ? 'practice' : 'convert'))
  const [mode, setMode] = useState<Mode>(() => (sp.get('m') === 'd' ? 'decode' : 'encode'))
  const [textInput, setTextInput] = useState(() => sp.get('t') ?? DEF.t)
  const [morseInput, setMorseInput] = useState(() => sp.get('c') ?? '')
  const [alphabet, setAlphabet] = useState<Alphabet>(() => (sp.get('a') === 'ko' ? 'ko' : 'en'))
  const [wpm, setWpm] = useState(() => clampNum(sp.get('w'), 5, 40, DEF.w))
  const [fwpm, setFwpm] = useState(() => clampNum(sp.get('f'), 3, 40, clampNum(sp.get('w'), 5, 40, DEF.w)))
  const [hz, setHz] = useState(() => clampNum(sp.get('hz'), 300, 1200, DEF.hz))
  const [flash, setFlash] = useState(true)
  const [vibrate, setVibrate] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [active, setActive] = useState(-1)
  const [lit, setLit] = useState(false)
  const [keying, setKeying] = useState(false)

  const ctxRef = useRef<AudioContext | null>(null)
  const stopRef = useRef<(() => void) | null>(null)

  const tm = useMemo(() => timing(wpm, fwpm), [wpm, fwpm])
  const encoded = useMemo(() => encode(textInput), [textInput])
  const decodedTokens = useMemo(() => parseMorse(morseInput, alphabet), [morseInput, alphabet])
  const tokens: Token[] = mode === 'encode' ? encoded.tokens : decodedTokens
  const output = mode === 'encode' ? toMorse(encoded.tokens) : tokensToText(decodedTokens, alphabet)
  const source = mode === 'encode' ? textInput.trim() : output.trim()
  const duration = useMemo(() => schedule(tokens, tm).total, [tokens, tm])

  // URL 동기화 (기본값과 다른 것만)
  useEffect(() => {
    const id = setTimeout(() => {
      const p = new URLSearchParams()
      if (tab === 'practice') p.set('tab', 'practice')
      if (mode === 'decode') { p.set('m', 'd'); if (morseInput) p.set('c', morseInput) }
      else if (textInput !== DEF.t) p.set('t', textInput)
      if (alphabet === 'ko') p.set('a', 'ko')
      if (wpm !== DEF.w) p.set('w', String(wpm))
      if (fwpm < wpm) p.set('f', String(fwpm))
      if (hz !== DEF.hz) p.set('hz', String(hz))
      const qs = p.toString()
      window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`)
    }, 300)
    return () => clearTimeout(id)
  }, [tab, mode, textInput, morseInput, alphabet, wpm, fwpm, hz])

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      ctxRef.current = new AC()
    }
    if (ctxRef.current.state === 'suspended') void ctxRef.current.resume()
    return ctxRef.current
  }, [])

  useEffect(() => () => {
    stopRef.current?.()
    void ctxRef.current?.close()
  }, [])

  /** 재생: 소리 + (선택) 현재 부호 강조 · 빛 · 진동. 소리·강조·WAV 모두 schedule() 하나에서 */
  const play = useCallback((toks: Token[], highlight: boolean) => {
    stopRef.current?.()
    const s = schedule(toks, tm)
    if (!s.on.length) return
    const ctx = getCtx()
    const t0 = ctx.currentTime + 0.05
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.frequency.value = hz
    g.gain.value = 0
    osc.connect(g).connect(ctx.destination)
    for (const [st, d] of s.on) {
      const a = t0 + st
      g.gain.setValueAtTime(0, a)
      g.gain.linearRampToValueAtTime(0.4, a + 0.005)
      g.gain.setValueAtTime(0.4, a + d - 0.005)
      g.gain.linearRampToValueAtTime(0, a + d)
    }
    osc.start(t0)
    osc.stop(t0 + s.total + 0.05)
    if (highlight && vibrate && 'vibrate' in navigator) navigator.vibrate(vibratePattern(s))

    let raf = 0, ti = 0, oi = 0
    const stop = () => {
      cancelAnimationFrame(raf)
      try { osc.stop() } catch { /* 이미 멈춤 */ }
      osc.disconnect()
      if (highlight && vibrate && 'vibrate' in navigator) navigator.vibrate(0)
      setPlaying(false); setActive(-1); setLit(false)
      stopRef.current = null
    }
    const tick = () => {
      const e = ctx.currentTime - t0
      if (e > s.total) { stop(); return }
      if (highlight) {
        while (ti + 1 < s.starts.length && s.starts[ti + 1] <= e) ti++
        setActive(e >= 0 ? ti : -1)
        while (oi < s.on.length && s.on[oi][0] + s.on[oi][1] < e) oi++
        setLit(oi < s.on.length && s.on[oi][0] <= e)
      }
      raf = requestAnimationFrame(tick)
    }
    stopRef.current = stop
    setPlaying(true)
    raf = requestAnimationFrame(tick)
  }, [tm, hz, vibrate, getCtx])

  const stopPlayback = useCallback(() => stopRef.current?.(), [])
  /** 실효 속도가 '끔'(=문자 속도)이면 문자 속도를 따라감 */
  const changeWpm = (v: number) => { setFwpm((f) => (f >= wpm ? v : Math.min(f, v))); setWpm(v) }

  const downloadWav = useCallback(() => {
    const blob = new Blob([wav(schedule(tokens, tm), hz)], { type: 'audio/wav' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `morse-${wpm}wpm.wav`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }, [tokens, tm, hz, wpm])

  const copyToClipboard = useCallback(async (text: string, id: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.left = '-999999px'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
    } catch { /* 권한 없음 */ }
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  const switchMode = (m: Mode) => { stopPlayback(); setMode(m) }
  const swap = () => {
    stopPlayback()
    if (mode === 'encode') {
      setMorseInput(output)
      setAlphabet(hasHangul(textInput) ? 'ko' : 'en')
      setMode('decode')
    } else {
      setTextInput(output.replace(/□/g, ''))
      setMode('encode')
    }
  }

  /* ── 전신키: 누른 시간으로 점/선, 쉬는 시간으로 글자/단어 구분 ── */
  const keyRef = useRef<{ down: number; timer?: ReturnType<typeof setTimeout>; osc?: OscillatorNode }>({ down: 0 })
  const keyDown = useCallback(() => {
    const k = keyRef.current
    if (k.down) return
    stopRef.current?.()
    clearTimeout(k.timer)
    k.down = performance.now()
    const ctx = getCtx()
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.frequency.value = hz
    g.gain.setValueAtTime(0, ctx.currentTime)
    g.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.005)
    osc.connect(g).connect(ctx.destination)
    osc.start()
    k.osc = osc
    setKeying(true)
  }, [getCtx, hz])
  const keyUp = useCallback(() => {
    const k = keyRef.current
    if (!k.down) return
    const dur = (performance.now() - k.down) / 1000
    k.down = 0
    try { k.osc?.stop() } catch { /* 이미 멈춤 */ }
    k.osc?.disconnect()
    setKeying(false)
    const u = 1.2 / wpm
    setMorseInput((m) => m + (dur < 2 * u ? '.' : '-'))
    k.timer = setTimeout(() => {
      setMorseInput((m) => `${m} `)
      k.timer = setTimeout(() => setMorseInput((m) => m.replace(/ $/, ' / ')), 4 * u * 1000)
    }, 3 * u * 1000)
  }, [wpm])
  const backspace = () => {
    clearTimeout(keyRef.current.timer)
    setMorseInput((m) => m.replace(/(\s*\/\s*|\s+|\S)$/, ''))
  }
  useEffect(() => () => clearTimeout(keyRef.current.timer), [])

  /* ── 듣기 연습 (Koch) ── */
  const [pAlpha, setPAlpha] = useState<Alphabet>('en')
  const [level, setLevel] = useState(2)
  const [quiz, setQuiz] = useState<Token[]>([])
  const [answer, setAnswer] = useState('')
  const [checked, setChecked] = useState<boolean[] | null>(null)
  const [stats, setStats] = useState({ correct: 0, total: 0 })
  const pool = pAlpha === 'ko' ? KOCH_KO : KOCH_EN
  const pMap: Record<string, string> = pAlpha === 'ko' ? { ...KO_CONS, ...KO_VOWEL } : { ...LETTERS, ...DIGITS, ...PUNCT }
  const lv = Math.min(level, pool.length)

  const newQuiz = () => {
    const chars = pool.slice(0, lv)
    const q = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).map((ch) => ({ ch, code: pMap[ch] }))
    setQuiz(q); setAnswer(''); setChecked(null)
    play(q, false)
  }
  const checkQuiz = () => {
    if (!quiz.length || checked) return
    const r = grade(quiz.map((q) => q.ch).join(''), answer)
    setChecked(r.ok)
    setStats((s) => ({ correct: s.correct + r.correct, total: s.total + quiz.length }))
  }
  const accuracy = stats.total ? Math.round((stats.correct / stats.total) * 100) : 0
  const setPracticeAlpha = (a: Alphabet) => { setPAlpha(a); setLevel(2); setQuiz([]); setChecked(null); setStats({ correct: 0, total: 0 }) }

  const segBtn = (on: boolean) =>
    `flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
  const chip = (ch: string, code: string, key: string) => (
    <button
      key={key}
      onClick={() => play([{ ch, code }], false)}
      aria-label={t('playChar', { ch })}
      className="bg-subtle hover:bg-soft rounded-xl px-3 py-2 flex items-center justify-between gap-2 text-left transition-colors"
    >
      <span className="font-bold text-fg">{ch}</span>
      <span className="font-mono text-primary tracking-wider">{pretty(code)}</span>
    </button>
  )

  const shareMorse = mode === 'encode' ? output : morseInput.trim()
  const shareCard = {
    tool: t('title'),
    label: source.length > 40 ? `${source.slice(0, 40)}…` : source || t('title'),
    headline: shareMorse.length > 48 ? `${pretty(shareMorse.slice(0, 48))}…` : pretty(shareMorse),
    rows: [{ label: t('wpm'), value: `${wpm} WPM` }, { label: t('length'), value: t('seconds', { n: duration.toFixed(1) }) }],
  }

  const guideList = (key: string) => (
    <ul className="space-y-2">
      {(t.raw(key) as string[]).map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-body">
          <span className="text-primary mt-0.5">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="flex gap-2 max-w-sm">
        <button onClick={() => setTab('convert')} className={segBtn(tab === 'convert')}>{t('tab.convert')}</button>
        <button onClick={() => { stopPlayback(); setTab('practice') }} className={segBtn(tab === 'practice')}>{t('tab.practice')}</button>
      </div>

      {tab === 'convert' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 입력 */}
          <div className="lg:col-span-1 min-w-0">
            <div className="ui-card p-6 space-y-5">
              <div className="flex gap-2">
                <button onClick={() => switchMode('encode')} className={segBtn(mode === 'encode')}>{t('mode.textToMorse')}</button>
                <button onClick={() => switchMode('decode')} className={segBtn(mode === 'decode')}>{t('mode.morseToText')}</button>
              </div>

              {mode === 'encode' ? (
                <div className="space-y-2">
                  <label htmlFor="morse-text" className="block text-sm font-medium text-body">{t('textInput')}</label>
                  <textarea
                    id="morse-text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder={t('textPlaceholder')}
                    className="ui-field w-full px-4 py-3 min-h-[120px]"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {EXAMPLES.map((ex) => (
                      <button key={ex} onClick={() => setTextInput(ex)} className="px-3 py-1.5 rounded-lg text-xs bg-soft text-body hover:bg-subtle">
                        {ex}
                      </button>
                    ))}
                  </div>
                  {encoded.unsupported.length > 0 && (
                    <p className="text-xs bg-amber-50 text-amber-800 rounded-lg px-3 py-2">
                      {t('unsupported', { chars: encoded.unsupported.join(' ') })}
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label htmlFor="morse-code" className="block text-sm font-medium text-body">{t('morseInput')}</label>
                    <textarea
                      id="morse-code"
                      value={morseInput}
                      onChange={(e) => setMorseInput(e.target.value)}
                      placeholder={t('morsePlaceholder')}
                      className="ui-field w-full px-4 py-3 min-h-[120px] font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <span className="block text-sm font-medium text-body">{t('alphabetLabel')}</span>
                    <div className="flex gap-2">
                      <button onClick={() => setAlphabet('en')} className={segBtn(alphabet === 'en')}>{t('alphabetEn')}</button>
                      <button onClick={() => setAlphabet('ko')} className={segBtn(alphabet === 'ko')}>{t('alphabetKo')}</button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <span className="block text-sm font-medium text-body">{t('tapKey')}</span>
                    <button
                      onPointerDown={(e) => { e.preventDefault(); keyDown() }}
                      onPointerUp={keyUp}
                      onPointerLeave={keyUp}
                      onPointerCancel={keyUp}
                      onKeyDown={(e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); keyDown() } }}
                      onKeyUp={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); keyUp() } }}
                      onContextMenu={(e) => e.preventDefault()}
                      className={`w-full h-24 rounded-2xl text-sm font-semibold select-none touch-none transition-colors ${keying ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}
                    >
                      {t('tapKeyPress')}
                    </button>
                    <div className="flex gap-2">
                      <button onClick={backspace} className="ui-btn-soft flex-1 px-3 py-2 text-sm">
                        <Delete className="w-4 h-4" /> {t('backspace')}
                      </button>
                      <button onClick={() => { clearTimeout(keyRef.current.timer); setMorseInput((m) => m.replace(/\s*\/?\s*$/, '') + ' / ') }} className="ui-btn-soft flex-1 px-3 py-2 text-sm">
                        {t('wordSpace')}
                      </button>
                    </div>
                    <p className="text-xs text-muted">{t('tapKeyHint')}</p>
                  </div>
                </>
              )}

              <div className="flex gap-2">
                <button onClick={swap} disabled={!output} className="ui-btn-soft flex-1 px-3 py-2 text-sm disabled:opacity-50">
                  <ArrowDownUp className="w-4 h-4" /> {t('swap')}
                </button>
                <button
                  onClick={() => { stopPlayback(); if (mode === 'encode') { setTextInput('') } else { setMorseInput('') } }}
                  className="ui-btn-soft flex-1 px-3 py-2 text-sm"
                >
                  <Trash2 className="w-4 h-4" /> {t('clear')}
                </button>
              </div>
            </div>
          </div>

          {/* 결과 */}
          <div className="lg:col-span-2 min-w-0 space-y-6">
            <div className="ui-hero p-6 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-white/70">{mode === 'encode' ? t('resultMorse') : t('resultText')}</span>
                <button
                  onClick={() => copyToClipboard(output, 'result')}
                  disabled={!output}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-white/15 hover:bg-white/25 disabled:opacity-50"
                >
                  {copiedId === 'result' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedId === 'result' ? t('copied') : t('copy')}
                </button>
              </div>
              <p className={`text-2xl sm:text-3xl font-bold break-all leading-snug ${mode === 'encode' ? 'font-mono tracking-wider' : ''}`}>
                {output ? (mode === 'encode' ? pretty(output) : output) : <span className="text-white/60 text-lg font-medium">{mode === 'encode' ? t('textPlaceholder') : t('morsePlaceholder')}</span>}
              </p>
              {tokens.length > 0 && (
                <p className="text-sm text-white/70">{t('summary', { n: tokens.filter((x) => x.code !== '/').length, s: duration.toFixed(1), wpm })}</p>
              )}
            </div>

            {/* 재생 */}
            <div className="ui-card p-6 space-y-5">
              <div className="flex flex-wrap gap-2">
                <button onClick={playing ? stopPlayback : () => play(tokens, true)} disabled={!duration} className="ui-btn px-5 py-3 disabled:opacity-50">
                  {playing ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {playing ? t('stop') : t('play')}
                </button>
                <button onClick={downloadWav} disabled={!duration} className="ui-btn-soft px-4 py-3 disabled:opacity-50">
                  <Download className="w-4 h-4" /> {t('downloadWav')}
                </button>
                <label className="inline-flex items-center gap-2 px-3 py-3 text-sm text-body cursor-pointer">
                  <input type="checkbox" checked={flash} onChange={(e) => setFlash(e.target.checked)} className="accent-[var(--primary)]" />
                  {t('flash')}
                </label>
                <label className="inline-flex items-center gap-2 px-3 py-3 text-sm text-body cursor-pointer">
                  <input type="checkbox" checked={vibrate} onChange={(e) => setVibrate(e.target.checked)} className="accent-[var(--primary)]" />
                  {t('vibrate')}
                </label>
              </div>

              {flash && (
                <div
                  aria-hidden
                  className={`h-20 rounded-2xl transition-colors duration-75 ${lit ? 'bg-primary' : 'bg-soft'}`}
                />
              )}

              {tokens.length > 0 && (
                <div>
                  <h2 className="text-sm font-medium text-body mb-2">{t('breakdown')}</h2>
                  <div className="flex flex-wrap gap-1.5">
                    {tokens.map((tok, i) =>
                      tok.code === '/' ? (
                        <span key={i} className="w-3" />
                      ) : (
                        <span
                          key={i}
                          className={`inline-flex flex-col items-center min-w-[2.5rem] px-2 py-1.5 rounded-lg transition-colors ${i === active ? 'bg-primary text-white' : 'bg-subtle text-fg'}`}
                        >
                          <span className="text-sm font-bold">{tok.ch}</span>
                          <span className={`font-mono text-xs tracking-wider ${i === active ? 'text-white' : 'text-primary'}`}>{pretty(tok.code) || '?'}</span>
                        </span>
                      ),
                    )}
                  </div>
                  {tokens.some((x) => x.ch === '□') && <p className="text-xs text-muted mt-2">{t('unknownHint')}</p>}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <label className="block">
                  <span className="flex justify-between text-sm text-body mb-1">
                    <span>{t('wpm')}</span><span className="tabular-nums text-fg font-medium">{wpm} WPM</span>
                  </span>
                  <input type="range" min={5} max={40} value={wpm} onChange={(e) => changeWpm(Number(e.target.value))} className="w-full accent-[var(--primary)]" />
                </label>
                <label className="block">
                  <span className="flex justify-between text-sm text-body mb-1">
                    <span>{t('farnsworth')}</span>
                    <span className="tabular-nums text-fg font-medium">{fwpm >= wpm ? t('farnsworthOff') : `${fwpm} WPM`}</span>
                  </span>
                  <input type="range" min={3} max={wpm} value={Math.min(fwpm, wpm)} onChange={(e) => setFwpm(Number(e.target.value))} className="w-full accent-[var(--primary)]" />
                </label>
                <label className="block">
                  <span className="flex justify-between text-sm text-body mb-1">
                    <span>{t('tone')}</span><span className="tabular-nums text-fg font-medium">{hz} Hz</span>
                  </span>
                  <input type="range" min={300} max={1200} step={10} value={hz} onChange={(e) => setHz(Number(e.target.value))} className="w-full accent-[var(--primary)]" />
                </label>
              </div>
              <p className="text-xs text-muted">{t('farnsworthHint')}</p>

              {output && (
                <ShareResult
                  card={shareCard}
                  text={`${source} = ${pretty(shareMorse)}`}
                  fileName="morse-code"
                  className="pt-1"
                />
              )}
            </div>
          </div>
        </div>
      ) : (
        /* 듣기 연습 */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 min-w-0">
            <div className="ui-card p-6 space-y-5">
              <p className="text-sm text-muted">{t('practice.desc')}</p>
              <div className="flex gap-2">
                <button onClick={() => setPracticeAlpha('en')} className={segBtn(pAlpha === 'en')}>{t('alphabetEn')}</button>
                <button onClick={() => setPracticeAlpha('ko')} className={segBtn(pAlpha === 'ko')}>{t('alphabetKo')}</button>
              </div>
              <label className="block">
                <span className="flex justify-between text-sm text-body mb-1">
                  <span>{t('practice.level')}</span><span className="tabular-nums text-fg font-medium">{lv}</span>
                </span>
                <input type="range" min={2} max={pool.length} value={lv} onChange={(e) => setLevel(Number(e.target.value))} className="w-full accent-[var(--primary)]" />
              </label>
              <div className="flex flex-wrap gap-1.5">
                {pool.slice(0, lv).map((c) => (
                  <span key={c} className="px-2 py-1 rounded-lg bg-subtle text-sm font-bold text-fg">{c}</span>
                ))}
              </div>
              <label className="block">
                <span className="flex justify-between text-sm text-body mb-1">
                  <span>{t('wpm')}</span><span className="tabular-nums text-fg font-medium">{wpm} / {Math.min(fwpm, wpm)} WPM</span>
                </span>
                <input type="range" min={5} max={40} value={wpm} onChange={(e) => changeWpm(Number(e.target.value))} className="w-full accent-[var(--primary)]" />
              </label>
              <p className="text-xs text-muted">{t('practice.speedHint')}</p>
            </div>
          </div>

          <div className="lg:col-span-2 min-w-0 space-y-6">
            <div className="ui-card p-6 space-y-5">
              <div className="flex flex-wrap gap-2">
                <button onClick={newQuiz} className="ui-btn px-5 py-3">
                  <Play className="w-4 h-4" /> {t('practice.start')}
                </button>
                <button onClick={() => play(quiz, false)} disabled={!quiz.length} className="ui-btn-soft px-4 py-3 disabled:opacity-50">
                  <RotateCcw className="w-4 h-4" /> {t('practice.replay')}
                </button>
              </div>
              {quiz.length === 0 ? (
                <p className="text-sm text-muted">{t('practice.empty')}</p>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); checkQuiz() }} className="space-y-3">
                  <label htmlFor="morse-answer" className="block text-sm font-medium text-body">{t('practice.answer')}</label>
                  <div className="flex gap-2">
                    <input
                      id="morse-answer"
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      placeholder={t('practice.answerPlaceholder')}
                      autoComplete="off"
                      className="ui-field flex-1 min-w-0 px-4 py-3 font-mono uppercase"
                    />
                    <button type="submit" disabled={!!checked} className="ui-btn px-4 py-3 disabled:opacity-50">{t('practice.check')}</button>
                  </div>
                </form>
              )}
              {checked && (
                <div className="space-y-2">
                  <span className="block text-sm font-medium text-body">{t('practice.correctAnswer')}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {quiz.map((q, i) => (
                      <span key={i} className={`inline-flex flex-col items-center min-w-[2.5rem] px-2 py-1.5 rounded-lg ${checked[i] ? 'bg-primary-soft text-primary' : 'bg-red-50 text-red-700'}`}>
                        <span className="text-sm font-bold">{q.ch}</span>
                        <span className="font-mono text-xs tracking-wider">{pretty(q.code)}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="ui-hero p-6">
              <span className="text-sm text-white/70">{t('practice.score')}</span>
              <p className="text-3xl font-bold tabular-nums mt-1">{stats.total ? `${accuracy}%` : '—'}</p>
              <p className="text-sm text-white/70 mt-1">{t('practice.rounds', { c: stats.correct, n: stats.total })}</p>
              {stats.total >= 15 && accuracy >= 90 && lv < pool.length && (
                <button
                  onClick={() => { setLevel(lv + 1); setStats({ correct: 0, total: 0 }) }}
                  className="mt-3 inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold bg-white text-primary"
                >
                  {t('practice.levelUp', { ch: pool[lv] })}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 부호표 */}
      <div className="ui-card p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-fg">{t('referenceTable')}</h2>
          <p className="text-sm text-muted mt-1">{t('refHint')}</p>
        </div>
        <section>
          <h3 className="text-sm font-medium text-body mb-2">{t('letters')}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {Object.entries(LETTERS).map(([c, code]) => chip(c, code, c))}
          </div>
        </section>
        <section>
          <h3 className="text-sm font-medium text-body mb-2">{t('numbers')}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {Object.entries(DIGITS).map(([c, code]) => chip(c, code, c))}
          </div>
        </section>
        <section>
          <h3 className="text-sm font-medium text-body mb-2">{t('punctuation')}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {Object.entries(PUNCT).map(([c, code]) => chip(c, code, c))}
          </div>
        </section>
        <section>
          <h3 className="text-sm font-medium text-body mb-2">{t('koConsonants')}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {Object.entries(KO_CONS).map(([c, code]) => chip(c, code, c))}
          </div>
        </section>
        <section>
          <h3 className="text-sm font-medium text-body mb-2">{t('koVowels')}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {Object.entries(KO_VOWEL).map(([c, code]) => chip(c, code, c))}
          </div>
          <p className="text-xs text-muted mt-2">{t('koCompoundNote')}</p>
        </section>
        <section>
          <h3 className="text-sm font-medium text-body mb-2">{t('prosigns')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Object.entries(PROSIGNS).map(([p, code]) => (
              <button
                key={p}
                onClick={() => play([{ ch: p, code }], false)}
                aria-label={t('playChar', { ch: p })}
                className="bg-subtle hover:bg-soft rounded-xl px-3 py-2 flex items-center gap-3 text-left transition-colors"
              >
                <span className="font-bold text-fg w-12 shrink-0">{p}</span>
                <span className="font-mono text-primary tracking-wider shrink-0">{pretty(code)}</span>
                <span className="text-xs text-muted ml-auto text-right">{t(`prosign.${p}`)}</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* 가이드 */}
      <div className="ui-card p-6">
        <h2 className="text-xl font-semibold text-fg mb-6">{t('guide.title')}</h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-fg mb-3">{t('guide.whatIs.title')}</h3>
            <p className="text-body leading-relaxed">{t('guide.whatIs.description')}</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-fg mb-3">{t('guide.howToUse.title')}</h3>
            {guideList('guide.howToUse.items')}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-fg mb-3">{t('guide.basics.title')}</h3>
            {guideList('guide.basics.items')}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-fg mb-3">{t('guide.korean.title')}</h3>
            {guideList('guide.korean.items')}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-fg mb-3">{t('guide.tips.title')}</h3>
            {guideList('guide.tips.items')}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-fg mb-3">{t('guide.faq.title')}</h3>
            <div className="space-y-4">
              {(t.raw('guide.faq.items') as { q: string; a: string }[]).map((f, i) => (
                <div key={i} className="bg-subtle rounded-2xl p-5">
                  <p className="font-medium text-fg">{f.q}</p>
                  <p className="text-sub mt-1 leading-relaxed">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
