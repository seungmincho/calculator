'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/dutchPay'
import { Copy, Check, Plus, Minus, X, Save, ArrowRight } from 'lucide-react'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import GuideSection from '@/components/GuideSection'
import {
  settle, simpleSplit, encodeState, decodeState, UNITS, MAX_PEOPLE,
  type Person, type Expense, type RoundDir, type State,
} from '@/utils/dutchPay'

type Mode = 's' | 't'
interface Recent { d: string; title: string; total: number; n: number; at: number }

const DIRS: RoundDir[] = ['ceil', 'floor', 'round']
const WEIGHTS = [0.5, 1, 1.5, 2, 3]
const RECENT_KEY = 'dutchPay.recent'
const ACCOUNT_KEY = 'dutchPay.account'

const won = (n: number) => Math.round(n).toLocaleString('ko-KR')
const seg = (on: boolean) =>
  `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
const chip = (on: boolean) =>
  `px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-faint line-through hover:bg-subtle'}`
const load = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d } catch { return d } }
const store = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* 저장 불가 */ } }

// 사람 i 삭제 시 index 재배치
const shift = (x: number, i: number) => (x > i ? x - 1 : x === i ? 0 : x)
const dropPerson = (list: Expense[], i: number) =>
  list.map((e) => ({ ...e, payer: shift(e.payer, i), among: e.among.filter((a) => a !== i).map((a) => (a > i ? a - 1 : a)) }))

export default function DutchPay() {
  const t = useTranslations('dutchPay')
  const searchParams = useSearchParams()
  const ready = useRef(false)

  const defaults = useCallback(() => {
    const names = t.raw('defaults.names') as string[]
    const all = names.map((_, i) => i)
    return {
      people: names.map((name) => ({ name, weight: 1 })),
      items: [
        { name: t('defaults.item1'), amount: 128000, payer: 0, among: all },
        { name: t('defaults.item2'), amount: 54000, payer: 0, among: all.slice(0, 3) },
      ] as Expense[],
      trips: [
        { name: t('defaults.trip1'), amount: 240000, payer: 0, among: all },
        { name: t('defaults.trip2'), amount: 96000, payer: 1, among: all },
        { name: t('defaults.trip3'), amount: 132000, payer: 2, among: all },
        { name: t('defaults.trip4'), amount: 26000, payer: 3, among: [0, 1, 3] },
      ] as Expense[],
    }
  }, [t])

  const [mode, setMode] = useState<Mode>('s')
  const [title, setTitle] = useState('')
  const [people, setPeople] = useState<Person[]>(() => defaults().people)
  const [items, setItems] = useState<Expense[]>(() => defaults().items)
  const [trips, setTrips] = useState<Expense[]>(() => defaults().trips)
  const [leader, setLeader] = useState(0)
  const [unit, setUnit] = useState(100)
  const [dir, setDir] = useState<RoundDir>('ceil')
  const [readOnly, setReadOnly] = useState(false)
  const [account, setAccount] = useState('')
  const [recent, setRecent] = useState<Recent[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [origin, setOrigin] = useState('')

  const apply = useCallback((st: State) => {
    const d = defaults()
    setMode(st.mode); setTitle(st.title); setPeople(st.people)
    setLeader(st.leader); setUnit(st.unit); setDir(st.dir)
    if (st.mode === 's') { setItems(st.expenses); setTrips(d.trips) } else { setTrips(st.expenses); setItems(d.items) }
  }, [defaults])

  // URL → 상태 (한 번). ?d=정산, ?ro=1 읽기 전용. 예전 링크(?total=&people=)도 지원
  useEffect(() => {
    if (ready.current) return
    const st = decodeState(searchParams.get('d'))
    if (st) {
      apply(st)
      setReadOnly(searchParams.get('ro') === '1')
    } else {
      const total = Number(searchParams.get('total'))
      const n = Math.min(MAX_PEOPLE, Math.floor(Number(searchParams.get('people'))))
      if (total > 0 && n > 0) {
        const all = Array.from({ length: n }, (_, i) => i)
        setPeople(all.map(() => ({ name: '', weight: 1 })))
        setItems([{ name: t('defaults.item1'), amount: Math.floor(total), payer: 0, among: all }])
        setTrips([])
      }
    }
    setAccount(load(ACCOUNT_KEY, ''))
    setRecent(load<Recent[]>(RECENT_KEY, []))
    setOrigin(window.location.origin + window.location.pathname)
    ready.current = true
  }, [searchParams, apply, t])

  const state: State = useMemo(() => ({
    mode, title, people, leader, unit, dir, expenses: mode === 's' ? items : trips,
  }), [mode, title, people, leader, unit, dir, items, trips])
  const encoded = useMemo(() => encodeState(state), [state])
  const roLink = `${origin}?d=${encoded}&ro=1`

  // 상태 → URL
  useEffect(() => {
    if (!ready.current) return
    window.history.replaceState(null, '', `${window.location.pathname}?d=${encoded}${readOnly ? '&ro=1' : ''}`)
  }, [encoded, readOnly])

  const copy = useCallback(async (text: string, id: string) => {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else {
        const ta = document.createElement('textarea')
        ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-999999px'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      }
    } catch { /* 권한 없음: 표시만 */ }
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  // ── 계산 ──
  const name = useCallback((i: number) => people[i]?.name.trim() || t('personN', { n: i + 1 }), [people, t])
  const simple = useMemo(() => simpleSplit(people, items, leader, unit, dir), [people, items, leader, unit, dir])
  const trip = useMemo(() => settle(people, trips), [people, trips])
  const res = mode === 's' ? simple : trip
  const transfers = res.transfers
  const n = people.length
  const nonLeaderPays = simple.pay.filter((_, i) => i !== simple.leader)
  const uniform = nonLeaderPays.length > 0 && nonLeaderPays.every((p) => p === nonLeaderPays[0])

  const heroLabel = mode === 's'
    ? (uniform ? t('hero.perPerson') : t('hero.perPersonRange'))
    : t('hero.transfersLabel')
  const heroValue = mode === 's'
    ? (uniform ? `${won(nonLeaderPays[0] ?? simple.total)}${t('won')}`
      : `${won(Math.min(...nonLeaderPays))}~${won(Math.max(...nonLeaderPays))}${t('won')}`)
    : (transfers.length ? t('hero.transfersN', { n: transfers.length }) : t('noTransfers'))

  // ── 편집 ──
  const list = mode === 's' ? items : trips
  const setList = mode === 's' ? setItems : setTrips
  const editItem = (k: number, patch: Partial<Expense>) => setList((l) => l.map((e, j) => (j === k ? { ...e, ...patch } : e)))
  const toggleAmong = (k: number, i: number) => {
    const e = list[k]
    editItem(k, { among: e.among.includes(i) ? e.among.filter((a) => a !== i) : [...e.among, i].sort((a, b) => a - b) })
  }
  const addPerson = () => {
    if (n >= MAX_PEOPLE) return
    setPeople((p) => [...p, { name: '', weight: 1 }])
    // 새 사람은 기존 "전원" 항목에 자동 포함
    const inc = (l: Expense[]) => l.map((e) => (e.among.length === n ? { ...e, among: [...e.among, n] } : e))
    setItems(inc); setTrips(inc)
  }
  const removePerson = (i: number) => {
    if (n <= 1) return
    setPeople((p) => p.filter((_, j) => j !== i))
    setItems((l) => dropPerson(l, i)); setTrips((l) => dropPerson(l, i))
    setLeader((x) => shift(x, i))
  }
  const addItem = () => setList((l) => [...l, { name: '', amount: 0, payer: mode === 's' ? leader : 0, among: people.map((_, i) => i) }])
  const reset = () => {
    const d = defaults()
    setTitle(''); setPeople(d.people); setItems(d.items); setTrips(d.trips); setLeader(0); setUnit(100); setDir('ceil')
  }

  const saveAccount = (v: string) => { setAccount(v); store(ACCOUNT_KEY, v) }
  const saveRecent = () => {
    const entry: Recent = { d: encoded, title: title.trim(), total: res.total, n, at: Date.now() }
    const next = [entry, ...recent.filter((r) => r.d !== encoded)].slice(0, 10)
    setRecent(next); store(RECENT_KEY, next)
    setCopiedId('save'); setTimeout(() => setCopiedId(null), 2000)
  }
  const removeRecent = (d: string) => { const next = recent.filter((r) => r.d !== d); setRecent(next); store(RECENT_KEY, next) }
  const openRecent = (d: string) => { const st = decodeState(d); if (st) { apply(st); setReadOnly(false) } }

  // ── 카톡 공지 ──
  const notice = useMemo(() => {
    const L: string[] = []
    L.push(t('text.header', { title: title.trim() || t('text.untitled') }))
    L.push(t('text.summary', { total: won(res.total), n }))
    L.push('', t('text.items'))
    list.forEach((e, k) => {
      if (!e.amount) return
      const extra: string[] = []
      if (mode === 't') extra.push(t('text.paidBy', { name: name(e.payer) }))
      const out = people.map((_, i) => i).filter((i) => !e.among.includes(i))
      if (out.length) extra.push(t('text.excluded', { names: out.map(name).join(', ') }))
      L.push(`- ${e.name.trim() || t('itemN', { n: k + 1 })} ${won(e.amount)}${t('won')}${extra.length ? ` (${extra.join(', ')})` : ''}`)
    })
    L.push('', t('text.shares'))
    people.forEach((p, i) => {
      const w = p.weight !== 1 ? ` [${t('weightX', { w: p.weight })}]` : ''
      L.push(`- ${name(i)}${w} ${won(mode === 's' ? simple.pay[i] : trip.owed[i])}${t('won')}`)
    })
    if (mode === 's' && unit > 1) L.push(t('text.rounding', { unit: won(unit), dir: t(`dir.${dir}`), name: name(simple.leader) }))
    L.push('', t('text.transfers'))
    if (!transfers.length) L.push(`- ${t('noTransfers')}`)
    transfers.forEach((x) => L.push(`- ${name(x.from)} → ${name(x.to)} ${won(x.amount)}${t('won')}`))
    if (!readOnly && account.trim()) L.push('', t('text.account', { account: account.trim() }))
    if (origin) L.push('', t('text.link', { url: roLink }))
    return L.join('\n')
  }, [t, title, res.total, n, list, mode, people, name, simple, trip, unit, dir, transfers, readOnly, account, origin, roLink])

  const CopyBtn = ({ text, id, label, onHero }: { text: string; id: string; label?: string; onHero?: boolean }) => (
    <button
      type="button" onClick={() => copy(text, id)} aria-label={label ?? t('copy')}
      className={`inline-flex items-center gap-1.5 rounded-lg text-sm font-medium transition-colors ${label ? 'px-3 py-1.5' : 'p-1.5'} ${onHero ? 'hover:bg-white/15 text-white' : 'bg-soft hover:bg-subtle text-body'}`}
    >
      {copiedId === id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      {label && <span>{copiedId === id ? t('copied') : label}</span>}
    </button>
  )

  // ── 결과 패널 ──
  const results = (
    <div className="space-y-4">
      <div id="dutch-pay-result" className="ui-hero p-6 scroll-mt-20">
        <p className="text-sm text-white/70">{heroLabel}</p>
        <p className="text-3xl sm:text-4xl font-bold tabular-nums mt-1">{heroValue}</p>
        <p className="text-sm text-white/70 mt-2">{t('hero.summary', { total: won(res.total), n })}</p>
      </div>

      <div className="ui-card p-6">
        <h2 className="text-base font-semibold text-fg mb-3">{t('transfers')}</h2>
        {transfers.length === 0 ? (
          <p className="text-sm text-muted">{t('noTransfers')}</p>
        ) : (
          <ul className="divide-y divide-line">
            {transfers.map((x, k) => (
              <li key={k} className="flex items-center justify-between gap-2 py-3">
                <span className="flex items-center gap-2 min-w-0 text-sm">
                  <span className="font-medium text-fg truncate">{name(x.from)}</span>
                  <ArrowRight className="w-4 h-4 text-faint shrink-0" aria-hidden />
                  <span className="font-medium text-fg truncate">{name(x.to)}</span>
                </span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className="font-bold text-fg tabular-nums">{won(x.amount)}{t('won')}</span>
                  <CopyBtn text={String(x.amount)} id={`tr${k}`} />
                </span>
              </li>
            ))}
          </ul>
        )}
        {mode === 's' && simple.diff !== 0 && (
          <p className="mt-3 text-xs text-muted">
            {t(simple.diff > 0 ? 'leaderMore' : 'leaderLess', { name: name(simple.leader), amount: won(Math.abs(simple.diff)) })}
          </p>
        )}
      </div>

      <div className="ui-card p-6">
        <h2 className="text-base font-semibold text-fg mb-3">{t('table.title')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-sub border-b border-line">
                <th className="py-2 font-medium">{t('table.person')}</th>
                <th className="py-2 font-medium text-right">{t('table.share')}</th>
                <th className="py-2 font-medium text-right">{mode === 's' ? t('table.pay') : t('table.paid')}</th>
                {mode === 't' && <th className="py-2 font-medium text-right">{t('table.net')}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {people.map((p, i) => (
                <tr key={i}>
                  <td className="py-2.5 text-fg">
                    {name(i)}
                    {p.weight !== 1 && <span className="ml-1.5 text-xs text-muted">{t('weightX', { w: p.weight })}</span>}
                    {mode === 's' && i === simple.leader && <span className="ml-1.5 text-xs text-primary font-medium">{t('leader')}</span>}
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-body">{won(res.owed[i])}</td>
                  <td className="py-2.5 text-right tabular-nums font-semibold text-fg">{won(mode === 's' ? simple.pay[i] : trip.paid[i])}</td>
                  {mode === 't' && (
                    <td className={`py-2.5 text-right tabular-nums font-semibold ${trip.net[i] > 0 ? 'text-primary' : trip.net[i] < 0 ? 'text-red-600' : 'text-muted'}`}>
                      {trip.net[i] > 0 ? '+' : ''}{won(trip.net[i])}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted">{mode === 's' ? t('table.noteSimple') : t('table.noteTrip')}</p>
      </div>

      <div className="ui-card p-6 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-fg">{t('notice.title')}</h2>
          <CopyBtn text={notice} id="notice" label={t('notice.copy')} />
        </div>
        {!readOnly && (
          <div>
            <label htmlFor="dp-account" className="block text-sm font-medium text-body mb-1.5">{t('notice.account')}</label>
            <input
              id="dp-account" type="text" value={account} maxLength={60}
              onChange={(e) => saveAccount(e.target.value)} placeholder={t('notice.accountPlaceholder')}
              className="ui-field w-full px-4 py-2.5"
            />
            <p className="text-xs text-muted mt-1">{t('notice.accountNote')}</p>
          </div>
        )}
        <pre className="bg-subtle rounded-2xl p-4 text-sm text-body whitespace-pre-wrap break-all font-sans max-h-80 overflow-y-auto">{notice}</pre>
        <div className="flex flex-wrap gap-2">
          <CopyBtn text={roLink} id="link" label={t('copyLink')} />
          {!readOnly && (
            <button type="button" onClick={saveRecent} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-soft hover:bg-subtle text-body">
              {copiedId === 'save' ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {copiedId === 'save' ? t('recent.saved') : t('recent.save')}
            </button>
          )}
        </div>
        <p className="text-xs text-muted">{t('notice.transferNote')}</p>
      </div>

      <ShareResult
        card={{
          tool: t('title'),
          label: title.trim() ? t('share.labelTitled', { title: title.trim(), n }) : t('share.label', { n, total: won(res.total) }),
          headline: heroValue,
          sub: heroLabel,
          rows: transfers.slice(0, 5).map((x) => ({ label: `${name(x.from)} → ${name(x.to)}`, value: `${won(x.amount)}${t('won')}` })),
        }}
        url={roLink}
        text={notice}
        fileName="dutch-pay"
      />
    </div>
  )

  if (readOnly) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-fg">{title.trim() || t('title')}</h1>
          <p className="text-sm text-muted mt-1">{t('readOnly.banner')}</p>
        </div>
        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">{results}</div>
          <div className="lg:col-span-2 space-y-4">
            <div className="ui-card p-6">
              <h2 className="text-base font-semibold text-fg mb-3">{mode === 's' ? t('items') : t('expenses')}</h2>
              <ul className="divide-y divide-line text-sm">
                {list.filter((e) => e.amount > 0).map((e, k) => (
                  <li key={k} className="py-2.5 flex justify-between gap-2">
                    <span className="text-body">{e.name || t('itemN', { n: k + 1 })}{mode === 't' && <span className="text-muted"> · {name(e.payer)}</span>}</span>
                    <span className="tabular-nums text-fg font-medium">{won(e.amount)}{t('won')}</span>
                  </li>
                ))}
              </ul>
            </div>
            <button type="button" onClick={() => setReadOnly(false)} className="ui-btn w-full px-4 py-3">{t('readOnly.edit')}</button>
          </div>
        </div>
        <GuideSection namespace="dutchPay" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 max-w-xl" role="group" aria-label={t('modeLabel')}>
        {(['s', 't'] as Mode[]).map((m) => (
          <button key={m} type="button" onClick={() => setMode(m)} aria-pressed={mode === m} className={`${seg(mode === m)} py-3`}>
            {t(`mode.${m}`)}
          </button>
        ))}
      </div>
      <p className="text-sm text-muted -mt-3">{t(`modeHint.${mode}`)}</p>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-4">
          {/* 모임 + 참가자 */}
          <div className="ui-card p-6 space-y-4">
            {mode === 's' && <MobileResultLink href="#dutch-pay-result" label={heroLabel} value={heroValue} />}
            <div>
              <label htmlFor="dp-title" className="block text-sm font-medium text-body mb-1.5">{t('eventTitle')}</label>
              <input id="dp-title" type="text" value={title} maxLength={30} onChange={(e) => setTitle(e.target.value)}
                placeholder={t('eventTitlePlaceholder')} className="ui-field w-full px-4 py-2.5" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-body">{t('people')}</span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => removePerson(n - 1)} disabled={n <= 1} aria-label={t('removePerson')} className="p-1.5 rounded-lg bg-soft hover:bg-subtle text-body disabled:opacity-40"><Minus className="w-4 h-4" /></button>
                  <span className="text-sm font-semibold text-fg tabular-nums w-10 text-center">{t('countN', { n })}</span>
                  <button type="button" onClick={addPerson} disabled={n >= MAX_PEOPLE} aria-label={t('addPerson')} className="p-1.5 rounded-lg bg-soft hover:bg-subtle text-body disabled:opacity-40"><Plus className="w-4 h-4" /></button>
                </div>
              </div>
              <ul className="space-y-2">
                {people.map((p, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <input type="text" value={p.name} maxLength={20} aria-label={t('personName')}
                      onChange={(e) => setPeople((l) => l.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                      placeholder={t('personN', { n: i + 1 })} className="ui-field flex-1 min-w-0 px-3 py-2" />
                    <select value={p.weight} aria-label={t('weight')}
                      onChange={(e) => setPeople((l) => l.map((x, j) => (j === i ? { ...x, weight: Number(e.target.value) } : x)))}
                      className="ui-field w-auto shrink-0 px-2 py-2 text-sm">
                      {(WEIGHTS.includes(p.weight) ? WEIGHTS : [...WEIGHTS, p.weight].sort((a, b) => a - b)).map((w) => (
                        <option key={w} value={w}>{t('weightX', { w })}</option>
                      ))}
                    </select>
                    {mode === 's' && (
                      <button type="button" onClick={() => setLeader(i)} aria-pressed={leader === i}
                        className={`px-2.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap ${leader === i ? 'bg-primary text-white' : 'bg-soft text-sub hover:bg-subtle'}`}>
                        {t('leader')}
                      </button>
                    )}
                    <button type="button" onClick={() => removePerson(i)} disabled={n <= 1} aria-label={t('removePerson')}
                      className="p-2 rounded-lg text-faint hover:text-body hover:bg-soft disabled:opacity-30"><X className="w-4 h-4" /></button>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted mt-2">{mode === 's' ? t('leaderHint') : t('weightHint')}</p>
            </div>
          </div>

          {/* 항목 / 지출 */}
          <div className="ui-card p-6 space-y-3">
            <h2 className="text-base font-semibold text-fg">{mode === 's' ? t('items') : t('expenses')}</h2>
            {list.map((e, k) => (
              <div key={k} className="bg-subtle rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <input type="text" value={e.name} maxLength={30} aria-label={t('itemName')}
                    onChange={(ev) => editItem(k, { name: ev.target.value })}
                    placeholder={t('itemN', { n: k + 1 })} className="ui-field flex-1 min-w-0 px-3 py-2" />
                  <input type="text" inputMode="numeric" aria-label={t('amount')}
                    value={e.amount ? e.amount.toLocaleString('ko-KR') : ''} placeholder="0"
                    onChange={(ev) => editItem(k, { amount: Math.min(1e10, Number(ev.target.value.replace(/[^0-9]/g, '')) || 0) })}
                    className="ui-field w-32 sm:w-36 px-3 py-2 text-right tabular-nums" />
                  <button type="button" onClick={() => setList((l) => l.filter((_, j) => j !== k))} aria-label={t('removeItem')}
                    className="p-2 rounded-lg text-faint hover:text-body hover:bg-soft"><X className="w-4 h-4" /></button>
                </div>
                {mode === 't' && (
                  <label className="flex items-center gap-2 text-sm text-sub">
                    {t('paidBy')}
                    <select value={e.payer} onChange={(ev) => editItem(k, { payer: Number(ev.target.value) })} className="ui-field px-2 py-1.5 text-sm">
                      {people.map((_, i) => <option key={i} value={i}>{name(i)}</option>)}
                    </select>
                  </label>
                )}
                <div>
                  <span className="block text-xs text-sub mb-1.5">{t('among')}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {people.map((_, i) => (
                      <button key={i} type="button" onClick={() => toggleAmong(k, i)} aria-pressed={e.among.includes(i)} className={chip(e.among.includes(i))}>
                        {name(i)}
                      </button>
                    ))}
                  </div>
                  {e.amount > 0 && e.among.length === 0 && <p className="text-xs text-amber-800 mt-1.5">{t('amongEmpty')}</p>}
                </div>
              </div>
            ))}
            <button type="button" onClick={addItem} className="ui-btn-soft w-full px-4 py-2 inline-flex items-center justify-center gap-1.5">
              <Plus className="w-4 h-4" />{mode === 's' ? t('addItem') : t('addExpense')}
            </button>
          </div>

          {/* 원 단위 (간단 모드) */}
          {mode === 's' && (
            <div className="ui-card p-6 space-y-3">
              <h2 className="text-base font-semibold text-fg">{t('rounding.title')}</h2>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('rounding.unit')}>
                {UNITS.map((u) => (
                  <button key={u} type="button" onClick={() => setUnit(u)} aria-pressed={unit === u} className={seg(unit === u)}>
                    {u === 1 ? t('rounding.exact') : t('rounding.unitN', { n: won(u) })}
                  </button>
                ))}
              </div>
              {unit > 1 && (
                <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('rounding.dir')}>
                  {DIRS.map((d) => (
                    <button key={d} type="button" onClick={() => setDir(d)} aria-pressed={dir === d} className={seg(dir === d)}>{t(`dir.${d}`)}</button>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted">{t('rounding.note')}</p>
            </div>
          )}

          <div className="flex gap-2">
            <button type="button" onClick={reset} className="ui-btn-soft px-4 py-2">{t('reset')}</button>
          </div>

          {recent.length > 0 && (
            <div className="ui-card p-6">
              <h2 className="text-base font-semibold text-fg mb-3">{t('recent.title')}</h2>
              <ul className="divide-y divide-line">
                {recent.map((r) => (
                  <li key={r.d} className="flex items-center gap-2 py-2.5">
                    <button type="button" onClick={() => openRecent(r.d)} className="flex-1 min-w-0 text-left">
                      <span className="block text-sm font-medium text-fg truncate">{r.title || t('text.untitled')}</span>
                      <span className="block text-xs text-muted tabular-nums">
                        {new Date(r.at).toLocaleDateString('ko-KR')} · {t('hero.summary', { total: won(r.total), n: r.n })}
                      </span>
                    </button>
                    <button type="button" onClick={() => removeRecent(r.d)} aria-label={t('recent.delete')}
                      className="p-2 rounded-lg text-faint hover:text-body hover:bg-soft"><X className="w-4 h-4" /></button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-20">{results}</div>
        </div>
      </div>

      <GuideSection namespace="dutchPay" />
    </div>
  )
}
