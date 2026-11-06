'use client'

import { useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/manito'
import MobileResultLink from '@/components/MobileResultLink'
import AddToCalendar from '@/components/AddToCalendar'
import { daysBetween, todayKST } from '@/utils/dday'
import {
  MAX_GROUP, MAX_MEMO, MAX_PEOPLE, MIN_PEOPLE, decodeCard, drawCycle, duplicates, encodeCard, parseNames, pickMissions, seeded,
  type Pair,
} from '@/utils/manito'

// # 뒤 배정은 브라우저에서만 읽는다 (정적 HTML·첫 렌더 = 진행자 화면)
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

const label = 'block text-sm font-medium text-body mb-1.5'

export default function Manito() {
  const t = useTranslations('manito')
  const hash = useSyncExternalStore(onHash, () => window.location.hash, () => '')
  const savedRaw = useSyncExternalStore(onSaved, readSaved, () => null)
  const saved = useMemo(() => parseSaved(savedRaw), [savedRaw])

  const [group, setGroup] = useState('')
  const [namesText, setNamesText] = useState(() => (t.raw('form.sampleNames') as string[]).join('\n'))
  const [ex, setEx] = useState<Pair[]>([])
  const [budget, setBudget] = useState('')
  const [date, setDate] = useState('')
  const [memo, setMemo] = useState('')
  const [seed, setSeed] = useState(1)
  const [pickA, setPickA] = useState('')
  const [pickB, setPickB] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [status, setStatus] = useState('')

  const names = useMemo(() => parseNames(namesText), [namesText])
  const activeEx = useMemo(() => ex.filter(([a, b]) => names.includes(a) && names.includes(b)), [ex, names])
  const dup = useMemo(() => duplicates(names), [names])
  const error = names.length < MIN_PEOPLE ? t('errors.tooFew')
    : names.length > MAX_PEOPLE ? t('errors.tooMany')
    : dup.length ? t('errors.duplicate', { names: dup.join(', ') }) : null
  const assignment = useMemo(() => (error ? null : drawCycle(names, activeEx, seeded(seed))), [error, names, activeEx, seed])
  const problem = error ?? (assignment ? null : t('errors.impossible'))

  if (hash.length > 1) return <div className="space-y-8"><Reveal hash={hash} /><Guide /></div>

  const changed = () => { setSeed(newSeed()); setCopied(null) }
  const budgetNum = Number(budget) || 0
  const linkFor = (name: string) => `${window.location.origin}/manito/#${encodeCard({
    f: name, t: assignment![name], g: group.trim() || undefined, b: budgetNum || undefined, d: date || undefined, m: memo.trim() || undefined,
  })}`
  const save = () => {
    try { localStorage.setItem(STORE, JSON.stringify({ group, names: namesText, ex, budget, date, memo, seed } satisfies Saved)); window.dispatchEvent(new Event(STORE)) } catch { /* 저장 못 해도 뽑기는 된다 */ }
  }
  const copy = async (text: string, done: string, who: string | null) => {
    try { await navigator.clipboard.writeText(text); setCopied(who); setStatus(done); save() } catch { setStatus(t('result.copyFailed')) }
  }
  const copyOne = (name: string) => copy(t('result.shareText', { name, url: linkFor(name) }), t('result.copiedFor', { name }), name)
  const copyAll = () => copy(
    [group.trim() ? t('result.allHeader', { group: group.trim() }) : t('result.allHeaderFallback'), '', ...names.map(n => `${n}: ${linkFor(n)}`)].join('\n'),
    t('result.copiedAll'), '*',
  )
  const load = () => {
    if (!saved) return
    setGroup(saved.group ?? ''); setNamesText(saved.names); setEx(saved.ex); setBudget(saved.budget ?? ''); setDate(saved.date ?? ''); setMemo(saved.memo ?? '')
    setSeed(Number.isInteger(saved.seed) ? saved.seed : newSeed()); setCopied(null)
  }
  const addRule = () => {
    if (!pickA || !pickB || pickA === pickB || ex.some(([a, b]) => (a === pickA && b === pickB) || (a === pickB && b === pickA))) return
    setEx([...ex, [pickA, pickB]]); setPickA(''); setPickB(''); changed()
  }
  const savedCount = saved ? parseNames(saved.names).length : 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="ui-card p-6 space-y-5">
          <MobileResultLink href="#manito-result" label={t('result.title')} value={t('result.people', { n: names.length })} />
          {saved && saved.names !== namesText && savedCount > 0 && (
            <button type="button" onClick={load} className="ui-btn-soft px-4 py-2 text-sm min-h-[44px]">{t('form.load', { n: savedCount })}</button>
          )}
          <div>
            <label htmlFor="manito-group" className={label}>{t('form.group')}</label>
            <input id="manito-group" className="ui-field px-4 py-3 w-full" value={group} maxLength={MAX_GROUP} placeholder={t('form.groupPlaceholder')} onChange={e => setGroup(e.target.value)} />
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="manito-names" className={label}>{t('form.names')}</label>
              <span className="text-xs text-muted tabular-nums">{t('form.count', { n: names.length })}</span>
            </div>
            <textarea id="manito-names" rows={7} className="ui-field px-4 py-3 w-full leading-relaxed" value={namesText} aria-describedby="manito-names-hint"
              onChange={e => { setNamesText(e.target.value); changed() }} />
            <p id="manito-names-hint" className="text-xs text-muted mt-1">{t('form.namesHint')}</p>
          </div>

          <fieldset className="space-y-2">
            <legend className={label}>{t('form.exclude.title')}</legend>
            <p className="text-xs text-muted">{t('form.exclude.hint')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
              {([[pickA, setPickA, 'first'], [pickB, setPickB, 'second']] as const).map(([v, set, k]) => (
                <select key={k} aria-label={t(`form.exclude.${k}`)} className="ui-field px-3 py-3 w-full" value={v} onChange={e => set(e.target.value)}>
                  <option value="">{t(`form.exclude.${k}`)}</option>
                  {names.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              ))}
              <button type="button" onClick={addRule} disabled={!pickA || !pickB || pickA === pickB} className="ui-btn-soft px-4 py-3 min-h-[44px] disabled:opacity-50">{t('form.exclude.add')}</button>
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
          </fieldset>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="manito-budget" className={label}>{t('form.budget')}</label>
              <div className="relative">
                <input id="manito-budget" inputMode="numeric" className="ui-field pl-4 pr-10 py-3 w-full tabular-nums" value={budgetNum ? budgetNum.toLocaleString('ko-KR') : ''}
                  onChange={e => setBudget(e.target.value.replace(/\D/g, '').slice(0, 9))} />
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

        <div id="manito-result" className="ui-card p-6 space-y-5 scroll-mt-20">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-xl font-semibold text-fg">{t('result.title')}</h2>
            <button type="button" onClick={changed} disabled={!!problem} className="ui-btn-soft px-4 py-2 text-sm min-h-[44px] shrink-0 disabled:opacity-50">{t('result.redraw')}</button>
          </div>
          {problem ? (
            <p className="bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm" role="alert">{problem}</p>
          ) : (
            <>
              <div>
                <p className="text-3xl font-bold text-fg tabular-nums">{t('result.people', { n: names.length })}</p>
                <p className="text-sm text-body mt-1">{t('result.summary', { n: names.length })}</p>
              </div>
              <p className="bg-subtle rounded-2xl p-4 text-sm text-sub">{t('result.sendHint')}</p>
              <ul className="divide-y divide-line border-y border-line">
                {names.map(n => (
                  <li key={n} className="flex items-center justify-between gap-3 py-2">
                    <span className="text-body font-medium truncate">{n}</span>
                    <button type="button" onClick={() => copyOne(n)} aria-label={t('result.copyAria', { name: n })}
                      className={`shrink-0 min-h-[44px] px-4 rounded-xl text-sm font-medium ${copied === n ? 'bg-primary-soft text-primary' : 'bg-soft text-body hover:bg-subtle'}`}>
                      {copied === n ? t('result.copied') : t('result.copy')}
                    </button>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={copyAll} className="ui-btn px-4 py-3 w-full min-h-[44px]">{copied === '*' ? t('result.copied') : t('result.copyAll')}</button>
              <p className="text-xs text-muted">{t('result.editWarn')}</p>
              <details className="border-t border-line pt-3">
                <summary className="cursor-pointer text-sm font-medium text-sub min-h-[24px]">{t('result.spoiler')}</summary>
                <ul className="mt-3 space-y-1 text-sm text-body">
                  {names.map(n => <li key={n}>{n} → {assignment![n]}</li>)}
                </ul>
              </details>
              <p className="text-xs text-muted">{t('result.privacy')}</p>
            </>
          )}
          <p className="sr-only" aria-live="polite">{status}</p>
        </div>
      </div>
      <Guide />
    </div>
  )
}

function Reveal({ hash }: { hash: string }) {
  const t = useTranslations('manito')
  const card = useMemo(() => decodeCard(hash), [hash])
  const [open, setOpen] = useState(false)
  const nameRef = useRef<HTMLParagraphElement>(null)
  const missions = t.raw('guide.missions.items') as string[]

  if (!card) {
    return (
      <div className="ui-card p-6 space-y-4 max-w-xl mx-auto">
        <h1 className="text-xl font-bold text-fg">{t('reveal.badge')}</h1>
        <p className="bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm" role="alert">{t('reveal.invalid')}</p>
        <a href="/manito/" className="ui-btn px-4 py-3 inline-flex items-center min-h-[44px]">{t('reveal.start')}</a>
      </div>
    )
  }
  const left = card.d ? daysBetween(todayKST(), card.d) : null
  const picks = pickMissions(hash, missions.length, 3)
  const reveal = () => { setOpen(true); requestAnimationFrame(() => nameRef.current?.focus()) }

  return (
    <div className="ui-card p-6 sm:p-8 space-y-6 max-w-xl mx-auto text-center">
      <p className="text-sm font-medium text-primary">{card.g ?? t('reveal.badge')}</p>
      <h1 className="text-2xl font-bold text-fg">{t('reveal.greeting', { name: card.f })}</h1>
      {open ? (
        <div className="space-y-2">
          <p ref={nameRef} tabIndex={-1} className="text-5xl font-bold text-fg [overflow-wrap:anywhere] outline-none">{t('reveal.is', { name: card.t })}</p>
          <p className="text-sm text-sub">{t('reveal.keepSecret')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <button type="button" onClick={reveal} className="ui-btn px-8 py-4 text-lg min-h-[56px]">{t('reveal.open')}</button>
          <p className="text-xs text-muted">{t('reveal.openHint')}</p>
        </div>
      )}
      <p className="sr-only" aria-live="polite">{open ? t('reveal.announce', { from: card.f, to: card.t }) : ''}</p>

      {(card.b || card.d || card.m) && (
        <dl className="bg-subtle rounded-2xl p-5 text-sm text-left space-y-2">
          {card.b ? <div className="flex justify-between gap-4"><dt className="text-sub">{t('reveal.budget')}</dt><dd className="text-fg font-medium tabular-nums">{card.b.toLocaleString('ko-KR')}{t('form.won')}</dd></div> : null}
          {card.d ? (
            <div className="flex justify-between gap-4">
              <dt className="text-sub">{t('reveal.date')}</dt>
              <dd className="text-fg font-medium tabular-nums">
                {card.d}
                {left != null && <span className="ml-2 text-primary">{left > 0 ? t('reveal.dday', { n: left }) : left === 0 ? t('reveal.today') : t('reveal.past')}</span>}
              </dd>
            </div>
          ) : null}
          {card.m ? <div className="flex justify-between gap-4"><dt className="text-sub shrink-0">{t('reveal.memo')}</dt><dd className="text-fg text-right [overflow-wrap:anywhere]">{card.m}</dd></div> : null}
        </dl>
      )}
      {card.d && (
        <AddToCalendar file="manito.ics" events={[{ uid: `manito-${card.d}`, date: card.d, title: card.g ? t('reveal.calendar', { group: card.g }) : t('reveal.calendarFallback'), description: card.m }]} />
      )}

      {open && missions.length > 0 && (
        <div className="text-left">
          <h2 className="font-semibold text-fg mb-2">{t('reveal.missions')}</h2>
          <ul className="list-disc pl-5 space-y-1 text-sm text-sub">
            {picks.map(i => <li key={i}>{missions[i]}</li>)}
          </ul>
        </div>
      )}
      <a href="/manito/" className="inline-flex items-center min-h-[44px] text-sm text-primary hover:underline">{t('reveal.start')}</a>
    </div>
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
