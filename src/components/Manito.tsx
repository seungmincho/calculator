'use client'

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/manito'
import MobileResultLink from '@/components/MobileResultLink'
import { Chain, Critter, InvalidLink, NamePicker, RevealCard } from '@/components/ManitoReveal'
import {
  MAX_GROUP, MAX_MEMO, MAX_PEOPLE, MIN_PEOPLE, cardOf, cycleOrder, decodeCard, decodeGroup, drawCycle, duplicates, encodeCard, encodeGroup, parseNames, seeded, sortNames,
  type Group, type Pair,
} from '@/utils/manito'
import { copyShareResultLink } from '@/utils/shareResultActions'

// # 뒤 배정은 브라우저에서만 읽는다 (정적 HTML·첫 렌더 = 진행자 화면). #1 개인 링크, #2 단톡방 링크, 그 밖(#manito-result 등)은 화면 안 이동
const onHash = (cb: () => void) => { window.addEventListener('hashchange', cb); return () => window.removeEventListener('hashchange', cb) }
const STORE = 'toolhub-manito'
const onSaved = (cb: () => void) => {
  window.addEventListener('storage', cb); window.addEventListener(STORE, cb)
  return () => { window.removeEventListener('storage', cb); window.removeEventListener(STORE, cb) }
}
const readSaved = () => { try { return localStorage.getItem(STORE) } catch { return null } }
interface Saved { group: string; names: string; ex: Pair[]; budget: string; date: string; memo: string; seed: number }
const parseSaved = (raw: string | null): Saved | null => {
  try { const s = raw ? JSON.parse(raw) as Saved : null; return s && typeof s.names === 'string' && Array.isArray(s.ex) ? s : null } catch { return null }
}
const newSeed = () => Math.floor(Math.random() * 2 ** 31) + 2 // 1 = 첫 화면 예시 전용
const noSub = () => () => {}
// 휴대폰은 공유 시트(카카오톡 → 방 고르기), PC 는 복사 → 붙여넣기가 빠르다
const touchShare = () => typeof navigator.share === 'function' && matchMedia('(pointer: coarse)').matches

const label = 'block text-sm font-medium text-body mb-1.5'

export default function Manito() {
  const hash = useSyncExternalStore(onHash, () => window.location.hash, () => '')
  const group = useMemo(() => (hash.startsWith('#2') ? decodeGroup(hash) : null), [hash])
  const card = useMemo(() => (hash.startsWith('#1') ? decodeCard(hash) : null), [hash])
  if (/^#[12]/.test(hash)) {
    return (
      <div className="space-y-8">
        {group ? <NamePicker key={hash} group={group} /> : card ? <RevealCard key={hash} card={card} /> : <InvalidLink />}
        <Guide />
      </div>
    )
  }
  return <Host />
}

function Host() {
  const t = useTranslations('manito')
  const savedRaw = useSyncExternalStore(onSaved, readSaved, () => null)
  const saved = useMemo(() => parseSaved(savedRaw), [savedRaw])
  const canShare = useSyncExternalStore(noSub, touchShare, () => false)

  const [names, setNames] = useState(() => t.raw('form.sampleNames') as string[])
  const [isSample, setIsSample] = useState(true)
  const [draft, setDraft] = useState('')
  const [count, setCount] = useState('30')
  const [note, setNote] = useState('')
  const [undo, setUndo] = useState<string[] | null>(null)
  const [title, setTitle] = useState('')
  const [ex, setEx] = useState<Pair[]>([])
  const [budget, setBudget] = useState('')
  const [date, setDate] = useState('')
  const [memo, setMemo] = useState('')
  const [seed, setSeed] = useState(1)
  const [pickA, setPickA] = useState('')
  const [pickB, setPickB] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const [manual, setManual] = useState('')
  const [sent, setSent] = useState<string | null>(null)
  const [qr, setQr] = useState(false)
  const [passing, setPassing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const activeEx = useMemo(() => ex.filter(([a, b]) => names.includes(a) && names.includes(b)), [ex, names])
  const error = names.length < MIN_PEOPLE ? t('errors.tooFew') : names.length > MAX_PEOPLE ? t('errors.tooMany') : null
  const order = useMemo(() => {
    const a = error ? null : drawCycle(names, activeEx, seeded(seed))
    return a && cycleOrder(a)
  }, [error, names, activeEx, seed])
  const sorted = useMemo(() => sortNames(names), [names])
  const budgetNum = Number(budget) || 0
  const group: Group | null = order && { names: order, g: title.trim() || undefined, b: budgetNum || undefined, d: date || undefined, m: memo.trim() || undefined }

  if (passing && group) return <div className="space-y-8"><NamePicker group={group} onExit={() => setPassing(false)} /><Guide /></div>

  const changed = () => { setSeed(newSeed()); setCopied(null); setStatus(''); setManual('') }
  const replaceNames = (next: string[]) => { setNames(next); setIsSample(false); setNote(''); setUndo(null); changed() }
  const add = (text: string) => {
    const incoming = parseNames(text)
    if (!incoming.length) return
    const base = isSample ? [] : names
    const fresh = [...new Set(incoming)].filter(n => !base.includes(n))
    const dup = [...new Set([...duplicates(incoming), ...incoming.filter(n => base.includes(n))])]
    if (fresh.length) replaceNames([...base, ...fresh])
    setDraft('')
    setNote(dup.length ? t('form.dupNote', { names: dup.join(', ') }) : '')
  }
  const submit = (e: FormEvent) => { e.preventDefault(); add(draft); inputRef.current?.focus() }
  const numberName = (i: number) => t('form.numberName', { n: i + 1 })
  const canFill = isSample || names.every((n, i) => n === numberName(i)) // 직접 적은 명단은 번호로 덮어쓰지 않는다
  const fill = () => replaceNames(Array.from({ length: Math.min(MAX_PEOPLE, Math.max(MIN_PEOPLE, Number(count) || 0)) }, (_, i) => numberName(i)))
  const clear = () => { replaceNames([]); setUndo(names); inputRef.current?.focus() }

  const save = () => {
    try { localStorage.setItem(STORE, JSON.stringify({ group: title, names: names.join('\n'), ex, budget, date, memo, seed } satisfies Saved)); window.dispatchEvent(new Event(STORE)) } catch { /* 저장 못 해도 뽑기는 된다 */ }
  }
  const load = () => {
    if (!saved) return
    replaceNames([...new Set(parseNames(saved.names))])
    setTitle(saved.group ?? ''); setEx(saved.ex); setBudget(saved.budget ?? ''); setDate(saved.date ?? ''); setMemo(saved.memo ?? '')
    if (Number.isInteger(saved.seed)) setSeed(saved.seed)
  }
  const addRule = () => {
    if (!pickA || !pickB || pickA === pickB || ex.some(([a, b]) => (a === pickA && b === pickB) || (a === pickB && b === pickA))) return
    setEx([...ex, [pickA, pickB]]); setPickA(''); setPickB(''); changed()
  }

  const link = (code: string) => `${window.location.origin}/manito/#${code}`
  const groupUrl = () => link(encodeGroup(group!))
  const groupText = () => t(group!.g ? 'share.text' : 'share.textNoGroup', { group: group!.g ?? '', url: groupUrl() })
  const soloUrl = (name: string) => link(encodeCard(cardOf(group!, name)))
  const markSent = () => { save(); setSent(order!.join('\n')) }
  const deliver = async (text: string, key: string, done: string, share: boolean) => {
    setManual('')
    if (share) {
      try { await navigator.share({ text }); markSent(); setCopied(key); setStatus(t('share.sent')); return } catch (e) { if ((e as Error).name === 'AbortError') return }
    }
    const ok = await copyShareResultLink(text, () => true) === 'copied'
    markSent(); setCopied(ok ? key : null); setManual(ok ? '' : text); setStatus(ok ? done : t('result.copyFailed'))
  }
  const copyAll = () => deliver(
    [title.trim() ? t('result.allHeader', { group: title.trim() }) : t('result.allHeaderFallback'), '', ...sorted.map(n => `${n}: ${soloUrl(n)}`)].join('\n'),
    '*', t('result.copiedAll'), false,
  )
  const savedCount = saved ? parseNames(saved.names).length : 0
  const moved = sent !== null && order !== null && sent !== order.join('\n')

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
          <p className="text-sm text-muted mt-1">{t('subtitle')}</p>
        </div>
        <div className="hidden sm:flex -space-x-3 shrink-0" aria-hidden>
          {sorted.slice(0, 4).map(n => <Critter key={n} name={n} className="w-16 h-16" />)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="ui-card p-5 sm:p-6 space-y-5">
          <MobileResultLink href="#manito-result" label={t('result.title')} value={t('result.people', { n: names.length })} />
          {saved && saved.names !== names.join('\n') && savedCount > 0 && (
            <button type="button" onClick={load} className="ui-btn-soft px-4 py-2 text-sm min-h-[44px]">{t('form.load', { n: savedCount })}</button>
          )}
          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="manito-name" className={label}>{t('form.names')}</label>
              <span className="text-xs text-muted tabular-nums">{t('form.count', { n: names.length })}</span>
            </div>
            <form onSubmit={submit} className="flex gap-2">
              <input id="manito-name" ref={inputRef} className="ui-field px-4 py-3 w-full min-w-0" value={draft} placeholder={t('form.namePlaceholder')} autoComplete="off" enterKeyHint="done" aria-describedby="manito-names-hint"
                onChange={e => setDraft(e.target.value)}
                onPaste={e => { const text = e.clipboardData.getData('text'); if (/[\r\n\t]/.test(text)) { e.preventDefault(); add(`${draft}\n${text}`) } }} />
              <button type="submit" className="ui-btn px-5 py-3 shrink-0">{t('form.add')}</button>
            </form>
            <p id="manito-names-hint" className="text-xs text-muted mt-1.5">{t('form.namesHint')}</p>
            {note && <p role="status" className="text-sm text-sub mt-2">{note}</p>}
            {names.length > 0 && (
              <ul className="flex flex-wrap gap-1.5 mt-3">
                {names.map(n => (
                  <li key={n} className={`inline-flex items-center max-w-full rounded-full bg-soft pl-0.5 text-sm text-body ${isSample ? 'opacity-60' : 'manito-pop'}`}>
                    <Critter name={n} className="w-6 h-6" /><span className="ml-1 truncate">{n}</span>
                    <button type="button" aria-label={t('form.remove', { name: n })} className="grid place-items-center w-6 h-10 shrink-0 rounded-full text-sub hover:text-fg"
                      onClick={() => replaceNames(names.filter(x => x !== n))}>×</button>
                  </li>
                ))}
              </ul>
            )}
            {isSample && <p className="text-xs text-muted mt-2">{t('form.sampleNote')}</p>}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {canFill && (
                <div className="inline-flex items-center gap-2 rounded-2xl bg-subtle pl-3 text-sm text-body">
                  <label htmlFor="manito-count">{t('form.fillLabel')}</label>
                  <input id="manito-count" inputMode="numeric" className="ui-field w-14 px-2 py-1.5 text-center tabular-nums" value={count} onChange={e => setCount(e.target.value.replace(/\D/g, '').slice(0, 2))} />
                  <button type="button" onClick={fill} className="min-h-[44px] pr-3 pl-1 font-medium text-primary">{t('form.fill')}</button>
                </div>
              )}
              {!isSample && names.length > 0 && <button type="button" onClick={clear} className="min-h-[44px] px-2 text-sm text-sub hover:text-fg">{t('form.clear')}</button>}
              {undo && <button type="button" onClick={() => replaceNames(undo)} className="min-h-[44px] px-2 text-sm font-medium text-primary">{t('form.undo')}</button>}
            </div>
          </div>

          <div>
            <label htmlFor="manito-group" className={label}>{t('form.group')}</label>
            <input id="manito-group" className="ui-field px-4 py-3 w-full" value={title} maxLength={MAX_GROUP} placeholder={t('form.groupPlaceholder')} onChange={e => setTitle(e.target.value)} />
          </div>

          <div className="divide-y divide-line border-y border-line">
            <Fold title={t('form.extra')}>
              <div className="space-y-4 pb-4 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="manito-budget" className={label}>{t('form.budget')}</label>
                    <div className="relative">
                      <input id="manito-budget" inputMode="numeric" className="ui-field pl-4 pr-10 py-3 w-full tabular-nums" value={budgetNum ? budgetNum.toLocaleString('ko-KR') : ''}
                        onChange={e => setBudget(e.target.value.replace(/\D/g, '').slice(0, 8))} />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">{t('form.won')}</span>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="manito-date" className={label}>{t('form.date')}</label>
                    <input id="manito-date" type="date" className="ui-field px-4 py-3 w-full" value={date} onChange={e => setDate(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label htmlFor="manito-memo" className={label}>{t('form.memo')}</label>
                  <input id="manito-memo" className="ui-field px-4 py-3 w-full" value={memo} maxLength={MAX_MEMO} placeholder={t('form.memoPlaceholder')} onChange={e => setMemo(e.target.value)} />
                </div>
              </div>
            </Fold>
            <Fold title={t('form.exclude.title')}>
              <fieldset className="space-y-2 pb-4 pt-1">
                <legend className="text-xs text-muted mb-2">{t('form.exclude.hint')}</legend>
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
                  {([[pickA, setPickA, 'first'], [pickB, setPickB, 'second']] as const).map(([v, set, k]) => (
                    <select key={k} aria-label={t(`form.exclude.${k}`)} className="ui-field px-3 py-3 w-full" value={v} onChange={e => set(e.target.value)}>
                      <option value="">{t(`form.exclude.${k}`)}</option>
                      {sorted.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  ))}
                  <button type="button" onClick={addRule} disabled={!pickA || !pickB || pickA === pickB} className="ui-btn-soft px-4 py-3 min-h-[44px] disabled:opacity-50">{t('form.exclude.add')}</button>
                </div>
              </fieldset>
            </Fold>
          </div>
          {activeEx.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {activeEx.map(([a, b]) => (
                <li key={`${a}|${b}`} className="inline-flex items-center gap-1 rounded-full bg-soft text-body text-sm pl-3">
                  {t('form.exclude.pair', { a, b })}
                  <button type="button" aria-label={t('form.exclude.remove', { a, b })} className="grid place-items-center w-11 h-11 rounded-full text-sub hover:text-fg"
                    onClick={() => { setEx(ex.filter(p => p[0] !== a || p[1] !== b)); changed() }}>×</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div id="manito-result" className="ui-card p-5 sm:p-6 space-y-5 scroll-mt-20">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-xl font-semibold text-fg">{t('result.title')}</h2>
            <button type="button" onClick={changed} disabled={!group} className="ui-btn-soft px-4 py-2 text-sm min-h-[44px] shrink-0 disabled:opacity-50">{t('result.redraw')}</button>
          </div>
          {!group ? (
            <p className="bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm" role="alert">{error ?? t('errors.impossible')}</p>
          ) : (
            <>
              <div key={seed} className="flex flex-wrap gap-1.5" aria-hidden>
                {sorted.slice(0, 18).map(n => <Critter key={n} name={n} className="manito-pop w-10 h-10" />)}
                {sorted.length > 18 && <span className="grid place-items-center w-10 h-10 rounded-full bg-soft text-xs font-medium text-sub tabular-nums">+{sorted.length - 18}</span>}
              </div>
              <div>
                <p className="text-3xl font-bold text-fg tabular-nums">{t('result.people', { n: names.length })}</p>
                <p className="text-sm text-body mt-1">{t('result.summary', { n: names.length })}</p>
              </div>
              {moved && (
                <div className="bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm space-y-2" role="alert">
                  <p>{t('result.moved')}</p>
                  <button type="button" onClick={load} className="min-h-[44px] font-semibold underline underline-offset-4">{t('result.restore')}</button>
                </div>
              )}
              <div className="space-y-3">
                <button type="button" onClick={() => deliver(groupText(), 'group', t('share.copied'), canShare)} className="ui-btn px-4 py-4 w-full text-lg">
                  {canShare ? t('share.send') : copied === 'group' ? t('result.copied') : t('share.copyMain')}
                </button>
                <p className="text-sm text-sub">{t('share.hint')}</p>
                <div className="grid grid-cols-2 gap-2">
                  {canShare && <button type="button" onClick={() => deliver(groupText(), 'group', t('share.copied'), false)} className="ui-btn-soft col-span-2 px-3 py-2.5 text-sm min-h-[44px]">{t('share.copyLink')}</button>}
                  <button type="button" aria-expanded={qr} onClick={() => { if (!qr) markSent(); setQr(!qr) }} className="ui-btn-soft px-3 py-2.5 text-sm min-h-[44px]">{qr ? t('share.qrClose') : t('share.qr')}</button>
                  <button type="button" onClick={() => { markSent(); setPassing(true); window.scrollTo({ top: 0 }) }} className="ui-btn-soft px-3 py-2.5 text-sm min-h-[44px]">{t('share.pass')}</button>
                </div>
                <p role="status" className="text-sm font-medium text-primary empty:hidden">{status}</p>
                {manual && <textarea readOnly rows={4} value={manual} aria-label={t('share.manual')} onFocus={e => e.target.select()} className="ui-field px-3 py-3 w-full text-sm [overflow-wrap:anywhere]" />}
                {qr && <GroupQr key={groupUrl()} url={groupUrl()} />}
              </div>

              <div className="divide-y divide-line border-y border-line">
                <Fold title={t('result.solo')}>
                  <p className="text-sm text-sub pb-2">{t('result.soloHint')}</p>
                  <ul>
                    {sorted.map(n => (
                      <li key={n} className="flex items-center gap-3 py-1.5">
                        <Critter name={n} className="w-9 h-9" />
                        <span className="text-body font-medium truncate flex-1">{n}</span>
                        <button type="button" onClick={() => deliver(t('result.shareText', { name: n, url: soloUrl(n) }), n, t('result.copiedFor', { name: n }), canShare)}
                          aria-label={t(canShare ? 'result.sendAria' : 'result.copyAria', { name: n })}
                          className={`shrink-0 min-h-[44px] px-4 rounded-xl text-sm font-medium ${copied === n ? 'bg-primary-soft text-primary' : 'bg-soft text-body hover:bg-subtle'}`}>
                          {copied === n ? t(canShare ? 'result.sentOne' : 'result.copied') : t(canShare ? 'result.send' : 'result.copy')}
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button type="button" onClick={copyAll} className="ui-btn-soft px-4 py-3 w-full min-h-[44px] my-3 text-sm">{copied === '*' ? t('result.copied') : t('result.copyAll')}</button>
                </Fold>
                <Fold title={t('result.spoiler')}>
                  <div className="pb-3"><Chain names={group.names} /></div>
                </Fold>
              </div>
              <p className="text-xs text-muted">{t('result.privacy')}</p>
            </>
          )}
        </div>
      </div>
      <Guide />
    </div>
  )
}

function Fold({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group py-1">
      <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden text-sm font-medium text-body min-h-[44px] flex items-center justify-between gap-3">
        {title}<ChevronDown aria-hidden className="w-4 h-4 shrink-0 text-muted transition-transform group-open:rotate-180" />
      </summary>
      {children}
    </details>
  )
}

/** 교실 TV·모임 화면에 띄우는 단톡방 링크 QR */
function GroupQr({ url }: { url: string }) {
  const t = useTranslations('manito')
  const [src, setSrc] = useState('')
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let live = true
    import('qrcode').then(m => m.default.toDataURL(url, { width: 720, margin: 2, errorCorrectionLevel: 'L' }))
      .then(d => { if (live) setSrc(d) }, () => { if (live) setFailed(true) })
    return () => { live = false }
  }, [url])
  return (
    <figure className="bg-subtle rounded-2xl p-4 text-center">
      {failed ? <p role="alert" className="text-sm text-body">{t('share.qrFailed')}</p>
        // eslint-disable-next-line @next/next/no-img-element -- 화면에서 만든 data URL
        : src ? <img src={src} alt={t('share.qrAlt')} width={720} height={720} className="w-full max-w-sm h-auto mx-auto rounded-xl" />
          : <div className="w-full max-w-sm aspect-square mx-auto rounded-xl bg-track" />}
      <figcaption className="text-sm text-sub mt-3">{t('share.qrHint')}</figcaption>
    </figure>
  )
}

function Guide() {
  const t = useTranslations('manito')
  const faq = t.raw('guide.faq.items') as { q: string; a: string }[]
  return (
    <div className="ui-card p-6 space-y-6">
      <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(['howTo', 'missions', 'tips'] as const).map(sec => (
          <div key={sec}>
            <h3 className="font-semibold text-fg mb-3">{t(`guide.${sec}.title`)}</h3>
            <ul className="list-disc pl-5 space-y-2 text-sm text-sub">
              {(t.raw(`guide.${sec}.items`) as string[]).map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </div>
        ))}
      </div>
      <div>
        <h3 className="font-semibold text-fg mb-3">{t('guide.faq.title')}</h3>
        <div className="divide-y divide-line border-y border-line">
          {faq.map(f => (
            <details key={f.q} className="py-3">
              <summary className="cursor-pointer text-sm font-medium text-body min-h-[24px]">{f.q}</summary>
              <p className="text-sm text-sub mt-2 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  )
}
