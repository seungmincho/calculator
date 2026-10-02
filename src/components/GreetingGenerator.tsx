'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Copy, Check, Shuffle, Link2, Star, ImageDown, Trash2 } from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import { useSearchParams } from '@/hooks/useSearchParams'
import GuideSection from '@/components/GuideSection'
import {
  SITUATIONS, RECIPIENTS, TONES, LENGTHS, DEFAULT_TONE, dateContext, generate, ganji, zodiac, smsInfo,
  type DateCtx,
} from '@/utils/greetings'

const FAV_KEY = 'greeting_favs'

const pick = <T extends string>(v: string | null, list: readonly T[], d: T): T =>
  (list as readonly string[]).includes(v ?? '') ? (v as T) : d

/** 라디오 그룹 칩: 화살표로 이동·선택, 선택된 칩만 Tab 정지 */
function Chips<T extends string>({ id, label, options, value, onChange, text }: {
  id: string; label: string; options: readonly T[]; value: T; onChange: (v: T) => void; text: (v: T) => string
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const d = ({ ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 } as Record<string, number>)[e.key]
    if (!d) return
    e.preventDefault()
    const n = (i + d + options.length) % options.length
    onChange(options[n])
    refs.current[n]?.focus()
  }
  return (
    <div>
      <p id={id} className="text-sm font-medium text-body mb-2">{label}</p>
      <div role="radiogroup" aria-labelledby={id} className="flex flex-wrap gap-2">
        {options.map((o, i) => (
          <button
            key={o}
            ref={(el) => { refs.current[i] = el }}
            type="button"
            role="radio"
            aria-checked={o === value}
            tabIndex={o === value ? 0 : -1}
            onClick={() => onChange(o)}
            onKeyDown={(e) => onKey(e, i)}
            className={`min-h-11 px-4 rounded-full text-sm font-medium transition-colors ${
              o === value ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'
            }`}
          >
            {text(o)}
          </button>
        ))}
      </div>
    </div>
  )
}

/** 문구 카드 이미지 1080×1350 (shareCard.ts와 같은 토스 스타일, 여러 줄 문구용) */
async function renderGreetingCard(tool: string, label: string, text: string): Promise<Blob> {
  if (document.fonts?.ready) await document.fonts.ready
  const W = 1080, H = 1350, pad = 88
  const FONT = '"Pretendard Variable", Pretendard, -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif'
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H)
  ctx.textBaseline = 'top'

  ctx.fillStyle = '#191f28'; ctx.font = `800 40px ${FONT}`
  ctx.fillText('툴허브', pad, pad)
  const bw = ctx.measureText('툴허브').width
  ctx.fillStyle = '#6b7684'; ctx.font = `500 34px ${FONT}`
  ctx.fillText(tool, pad + bw + 20, pad + 4)

  ctx.fillStyle = '#3182f6'; ctx.font = `700 44px ${FONT}`
  ctx.fillText(label, pad, 210)

  const bx = pad, by = 300, bwid = W - pad * 2, bh = H - by - 220, inner = 64
  ctx.fillStyle = '#f2f4f6'
  ctx.beginPath(); ctx.roundRect(bx, by, bwid, bh, 44); ctx.fill()

  // 어절 단위 줄바꿈 + 상자에 들어갈 때까지 글자 크기 줄이기
  // ponytail: 상자보다 긴 한 어절은 넘침 — 인사말 어절 길이로는 생기지 않음
  const wrap = (size: number) => {
    ctx.font = `600 ${size}px ${FONT}`
    const out: string[] = []
    for (const para of text.split('\n')) {
      let line = ''
      for (const word of para.split(' ')) {
        const next = line ? `${line} ${word}` : word
        if (!line || ctx.measureText(next).width <= bwid - inner * 2) line = next
        else { out.push(line); line = word }
      }
      out.push(line)
    }
    return out
  }
  let size = 56, rows = wrap(size)
  while (size > 28 && rows.length * size * 1.6 > bh - inner * 2) { size -= 2; rows = wrap(size) }
  ctx.fillStyle = '#191f28'
  rows.forEach((r, i) => ctx.fillText(r, bx + inner, by + inner + i * size * 1.6))

  ctx.fillStyle = '#6b7684'; ctx.font = `500 34px ${FONT}`
  ctx.fillText('toolhub.ai.kr', pad, H - pad - 34)

  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/png'))
}

export default function GreetingGenerator() {
  const t = useTranslations('greetingGenerator')
  const sp = useSearchParams()

  // URL이 상태의 원본 (이름은 넣지 않음)
  const situation = pick(sp.get('s'), SITUATIONS, 'yearEnd')
  const recipient = pick(sp.get('r'), RECIPIENTS, 'client')
  const tone = pick(sp.get('t'), TONES, DEFAULT_TONE[recipient])
  const length = pick(sp.get('l'), LENGTHS, 'medium')
  const seed = Math.max(0, parseInt(sp.get('k') ?? '0', 10) || 0)
  const emoji = sp.get('e') === '1'

  const setParams = useCallback((patch: Record<string, string | null>) => {
    const u = new URL(window.location.href)
    for (const [k, v] of Object.entries(patch)) {
      if (v == null) u.searchParams.delete(k)
      else u.searchParams.set(k, v)
    }
    window.history.replaceState(window.history.state, '', u)
  }, [])

  const [name, setName] = useState('')
  const [sender, setSender] = useState('')
  const [favs, setFavs] = useState<string[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [announce, setAnnounce] = useState('')

  // 날짜는 mount 후에 (서버 렌더 = 날짜 없는 기본 문구 → hydration 불일치 없음)
  const [ctx, setCtx] = useState<DateCtx | null>(null)
  useEffect(() => { setCtx(dateContext(new Date())) }, [])

  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem(FAV_KEY) ?? '[]')
      if (Array.isArray(v)) setFavs(v.filter((x) => typeof x === 'string'))
    } catch { /* 저장소 사용 불가 */ }
  }, [])
  const saveFavs = (next: string[]) => {
    setFavs(next)
    try { localStorage.setItem(FAV_KEY, JSON.stringify(next)) } catch { /* 무시 */ }
  }

  const messages = useMemo(
    () => generate({ situation, recipient, tone, length, seed, emoji, name, sender }, ctx),
    [situation, recipient, tone, length, seed, emoji, name, sender, ctx],
  )

  const yearInfo = useMemo(() => {
    const y = situation === 'newYear' ? ctx?.newYear : situation === 'seollal' ? ctx?.seollal?.year : undefined
    return y ? t('yearInfo', { year: y, ganji: ganji(y), animal: zodiac(y) }) : ''
  }, [situation, ctx, t])

  const copyToClipboard = useCallback(async (text: string, id: string, message: string) => {
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
    } catch { /* 권한 없음: 표시만 */ }
    setCopiedId(id)
    setAnnounce(message)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  const toggleFav = (m: string, n: number) => {
    const on = favs.includes(m)
    saveFavs(on ? favs.filter((f) => f !== m) : [m, ...favs].slice(0, 30))
    setAnnounce(on ? t('favRemoved', { n }) : t('favAdded', { n }))
  }

  const saveImage = async (m: string) => {
    const blob = await renderGreetingCard(t('title'), t(`situations.${situation}`), m)
    const file = new File([blob], 'greeting.png', { type: 'image/png' })
    // 휴대폰은 공유 시트(사진 저장·카톡 전송), PC는 파일로 내려받기
    if (window.matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file] }); return } catch (e) { if ((e as Error)?.name === 'AbortError') return }
    }
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'greeting.png'
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    setAnnounce(t('imageSaved'))
  }

  const iconBtn = 'inline-flex items-center justify-center gap-1.5 min-h-11 min-w-11 px-3 rounded-xl text-sm font-medium bg-soft text-body hover:bg-subtle transition-colors'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
        <p className="text-sm text-muted mt-1">{t('koreanNote')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="ui-card p-6 space-y-6">
            <h2 className="text-lg font-semibold text-fg">{t('settingsTitle')}</h2>
            <Chips id="gg-situation" label={t('situationLabel')} options={SITUATIONS} value={situation}
              onChange={(v) => setParams({ s: v })} text={(v) => t(`situations.${v}`)} />
            <Chips id="gg-recipient" label={t('recipientLabel')} options={RECIPIENTS} value={recipient}
              onChange={(v) => setParams({ r: v, t: DEFAULT_TONE[v] })} text={(v) => t(`recipients.${v}`)} />
            <div>
              <Chips id="gg-tone" label={t('toneLabel')} options={TONES} value={tone}
                onChange={(v) => setParams({ t: v })} text={(v) => t(`tones.${v}`)} />
              <p className="text-xs text-muted mt-2">{t('toneHint')}</p>
            </div>
            <Chips id="gg-length" label={t('lengthLabel')} options={LENGTHS} value={length}
              onChange={(v) => setParams({ l: v })} text={(v) => t(`lengths.${v}`)} />

            <div className="space-y-4">
              <div>
                <label htmlFor="gg-name" className="block text-sm font-medium text-body mb-2">{t('nameLabel')}</label>
                <input id="gg-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={20}
                  placeholder={t('namePlaceholder')} className="ui-field px-4 py-3" />
              </div>
              <div>
                <label htmlFor="gg-sender" className="block text-sm font-medium text-body mb-2">{t('senderLabel')}</label>
                <input id="gg-sender" value={sender} onChange={(e) => setSender(e.target.value)} maxLength={30}
                  placeholder={t('senderPlaceholder')} className="ui-field px-4 py-3" />
              </div>
              <p className="text-xs text-muted">{t('nameHint')}</p>
            </div>

            <label htmlFor="gg-emoji" className="flex items-center gap-3 min-h-11 cursor-pointer">
              <input id="gg-emoji" type="checkbox" checked={emoji} onChange={(e) => setParams({ e: e.target.checked ? '1' : null })}
                className="w-5 h-5 accent-primary" />
              <span className="text-sm text-body">{t('emojiLabel')}</span>
            </label>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-fg">{t('resultsTitle', { count: messages.length })}</h2>
              {yearInfo && <p className="text-sm text-muted mt-0.5">{yearInfo}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setParams({ k: String(Math.floor(Math.random() * 999999) + 1) })}
                className="ui-btn inline-flex items-center gap-1.5 min-h-11 px-4 rounded-xl text-sm font-semibold">
                <Shuffle className="w-4 h-4" aria-hidden="true" /> {t('shuffle')}
              </button>
              <button type="button" onClick={() => copyToClipboard(window.location.href, 'link', t('linkCopied'))} className={iconBtn}>
                {copiedId === 'link' ? <Check className="w-4 h-4 text-primary" aria-hidden="true" /> : <Link2 className="w-4 h-4" aria-hidden="true" />}
                {copiedId === 'link' ? t('linkCopied') : t('copyLink')}
              </button>
            </div>
          </div>

          <ol className="space-y-3">
            {messages.map((m, i) => {
              const n = i + 1
              const info = smsInfo(m)
              const fav = favs.includes(m)
              return (
                <li key={`${i}-${m}`} className="ui-card p-5">
                  <p className="text-body leading-relaxed whitespace-pre-line break-keep">{m}</p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-muted tabular-nums">
                      {t('charCount', { chars: info.chars, bytes: info.bytes })} · <span className={info.type === 'SMS' ? 'text-primary font-semibold' : 'font-semibold'}>{info.type}</span>
                    </p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => copyToClipboard(m, `m${i}`, t('copiedAnnounce', { n }))}
                        aria-label={t('copyAria', { n })} className={iconBtn}>
                        {copiedId === `m${i}` ? <Check className="w-4 h-4 text-primary" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
                        {copiedId === `m${i}` ? t('copied') : t('copy')}
                      </button>
                      <button type="button" onClick={() => saveImage(m)} aria-label={t('imageAria', { n })} className={iconBtn}>
                        <ImageDown className="w-4 h-4" aria-hidden="true" /> {t('image')}
                      </button>
                      <button type="button" onClick={() => toggleFav(m, n)} aria-label={t('favAria', { n })} aria-pressed={fav} className={iconBtn}>
                        <Star className={`w-4 h-4 ${fav ? 'fill-current text-primary' : ''}`} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
          <p className="text-xs text-muted">{t('smsHint')}</p>
        </div>
      </div>

      {favs.length > 0 && (
        <section className="ui-card p-6" aria-labelledby="gg-favs">
          <h2 id="gg-favs" className="text-lg font-semibold text-fg mb-4">{t('favoritesTitle')}</h2>
          <ol className="space-y-3">
            {favs.map((m, i) => (
              <li key={m} className="bg-subtle rounded-2xl p-4">
                <p className="text-body leading-relaxed whitespace-pre-line break-keep">{m}</p>
                <div className="mt-3 flex gap-2 justify-end">
                  <button type="button" onClick={() => copyToClipboard(m, `f${i}`, t('copiedAnnounce', { n: i + 1 }))}
                    aria-label={t('favCopyAria', { n: i + 1 })} className={iconBtn}>
                    {copiedId === `f${i}` ? <Check className="w-4 h-4 text-primary" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
                    {copiedId === `f${i}` ? t('copied') : t('copy')}
                  </button>
                  <button type="button" onClick={() => { saveFavs(favs.filter((f) => f !== m)); setAnnounce(t('favRemoved', { n: i + 1 })) }}
                    aria-label={t('favRemoveAria', { n: i + 1 })} className={iconBtn}>
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      <GuideSection namespace="greetingGenerator" defaultOpen />

      <p className="sr-only" aria-live="polite">{announce}</p>
    </div>
  )
}
