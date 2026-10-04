'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/militaryDischarge'
import { X, Plus } from 'lucide-react'
import ShareResult from '@/components/ShareResult'
import { todayKST, addMonths, weekday, ddayLabel, isValidDate, daysBetween } from '@/utils/dday'
import {
  BRANCHES, RANKS, PAY_2026, SAVINGS_MATCH_MAX, branchInfo, parseBranch, summarize, sanitizePeople,
  type Branch, type Person,
} from '@/utils/militaryDischarge'

const PEOPLE_KEY = 'militaryDischarge.people'

function readPeople(): Person[] {
  try { return sanitizePeople(JSON.parse(localStorage.getItem(PEOPLE_KEY) || '[]')) } catch { return [] }
}
function writePeople(list: Person[]) {
  try { localStorage.setItem(PEOPLE_KEY, JSON.stringify(list)) } catch { /* 시크릿 모드 등 */ }
}

export default function MilitaryDischarge() {
  const t = useTranslations('militaryDischarge')
  const searchParams = useSearchParams()

  const [today, setToday] = useState<string | null>(null)
  const [enlist, setEnlist] = useState('')
  const [branch, setBranch] = useState<Branch>('army')
  const [name, setName] = useState('')
  const [people, setPeople] = useState<Person[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)

  // ── 초기화: URL → 저장한 첫 사람 → 기본값(11개월 전 입대한 육군) ──
  const inited = useRef(false)
  useEffect(() => {
    if (inited.current) return
    inited.current = true
    const now = todayKST()
    setToday(now)
    const list = readPeople()
    setPeople(list)
    const d = searchParams.get('date')
    const b = parseBranch(searchParams.get('branch'))
    if (isValidDate(d)) {
      setEnlist(d)
      if (b) setBranch(b)
      setName((searchParams.get('name') ?? '').slice(0, 20))
      const match = list.find(p => p.date === d && p.branch === (b ?? 'army'))
      if (match) setActiveId(match.id)
    } else if (list[0]) {
      setEnlist(list[0].date); setBranch(list[0].branch); setName(list[0].name); setActiveId(list[0].id)
    } else {
      setEnlist(addMonths(now, -11))
      if (b) setBranch(b)
    }
  }, [searchParams])

  // ── URL 동기화 ──
  useEffect(() => {
    if (!today || !isValidDate(enlist)) return
    const p = new URLSearchParams({ branch, date: enlist })
    if (name.trim()) p.set('name', name.trim())
    window.history.replaceState(window.history.state, '', `${window.location.pathname}?${p}`)
  }, [today, enlist, branch, name])

  const s = useMemo(() => (today ? summarize(enlist, branch, today) : null), [today, enlist, branch])

  const wd = t.raw('weekdays') as string[]
  const fmtDate = useCallback((d: string) => {
    const [y, m, day] = d.split('-').map(Number)
    return t('dateFormat', { y, m, d: day, w: wd[weekday(d)] })
  }, [t, wd])
  const won = (n: number) => t('won', { n: n.toLocaleString('ko-KR') })

  const who = name.trim()
  const heroLabel = !s ? '' : s.status === 'before'
    ? (who ? t('hero.beforeNamed', { name: who }) : t('hero.before'))
    : (who ? t('hero.labelNamed', { name: who }) : t('hero.label'))
  const ddayText = s ? ddayLabel(s.daysLeft) : ''
  const beforeDays = s && today && s.status === 'before' ? daysBetween(today, s.enlist) : 0 // 입대까지
  const headline = !s ? '' : s.status === 'done'
    ? t('hero.done')
    : s.status === 'before' ? ddayLabel(beforeDays) : `${ddayText} · ${s.pct.toFixed(1)}%`

  const todayLine = !s ? '' : s.status === 'before'
    ? t('todayLine.before', { n: beforeDays })
    : s.status === 'done'
      ? t('todayLine.done', { total: s.totalDays, n: -s.daysLeft })
      : s.daysLeft === 0
        ? t('todayLine.last')
        : t('todayLine.serving', { served: s.servedDays, weeks: Math.floor(s.daysLeft / 7), days: s.daysLeft % 7 })

  const nextMs = s && today ? s.milestones.find(m => m.date > today) : undefined
  const hasRanks = branchInfo(branch).ranks

  // ── 저장한 사람들 ──
  const active = people.find(p => p.id === activeId)
  const dirty = !active || active.name !== who || active.branch !== branch || active.date !== enlist
  const savePerson = () => {
    if (!isValidDate(enlist)) return
    const entry: Person = { id: active?.id ?? Date.now().toString(36), name: who, branch, date: enlist }
    const next = active ? people.map(p => (p.id === active.id ? entry : p)) : [...people, entry].slice(-20)
    setPeople(next); writePeople(next); setActiveId(entry.id)
  }
  const loadPerson = (p: Person) => { setEnlist(p.date); setBranch(p.branch); setName(p.name); setActiveId(p.id) }
  const removePerson = (id: string) => {
    const next = people.filter(p => p.id !== id)
    setPeople(next); writePeople(next)
    if (id === activeId) setActiveId(null)
  }
  const newPerson = () => { setActiveId(null); setName(''); if (today) setEnlist(addMonths(today, -11)); setBranch('army') }

  const shareRows = s ? [
    { label: t('branch'), value: `${t(`branches.${branch}`)} · ${t('monthsUnit', { n: branchInfo(branch).months })}` },
    { label: t('enlistmentDate'), value: fmtDate(s.enlist) },
    { label: t('dischargeDate'), value: fmtDate(s.discharge) },
    ...(s.rank ? [{ label: t('stats.rank'), value: t(`rank.${s.rank}`) }] : []),
  ] : []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      {/* 저장한 사람들 */}
      {people.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" aria-label={t('people.title')}>
          {people.map(p => {
            const sel = p.id === activeId
            return (
              <span key={p.id} className={`inline-flex items-center rounded-full text-sm font-medium ${sel ? 'bg-primary text-white' : 'bg-soft text-body'}`}>
                <button onClick={() => loadPerson(p)} className="pl-3.5 pr-1.5 py-1.5">
                  {p.name || t(`branches.${p.branch}`)}
                </button>
                <button onClick={() => removePerson(p.id)} className="pr-2.5 py-1.5 opacity-60 hover:opacity-100" aria-label={t('people.remove', { name: p.name || t(`branches.${p.branch}`) })}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )
          })}
          <button onClick={newPerson} className="inline-flex items-center gap-1 rounded-full text-sm px-3 py-1.5 text-sub hover:bg-soft">
            <Plus className="w-3.5 h-3.5" /> {t('people.add')}
          </button>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <div className="lg:col-span-1">
          <div className="ui-card p-6 space-y-5">
            <div>
              <label htmlFor="md-name" className="block text-sm font-medium text-body mb-1.5">{t('name')}</label>
              <input id="md-name" value={name} maxLength={20} onChange={e => setName(e.target.value)}
                placeholder={t('namePlaceholder')} className="ui-field w-full px-4 py-3" />
            </div>
            <div>
              <label htmlFor="md-date" className="block text-sm font-medium text-body mb-1.5">{t('enlistmentDate')}</label>
              <input id="md-date" type="date" value={enlist} onChange={e => setEnlist(e.target.value)}
                className="ui-field w-full px-4 py-3" />
            </div>
            <div>
              <p className="block text-sm font-medium text-body mb-1.5">{t('branch')}</p>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t('branch')}>
                {BRANCHES.map(b => (
                  <button key={b.key} role="radio" aria-checked={branch === b.key} onClick={() => setBranch(b.key)}
                    className={`rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${branch === b.key ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}>
                    <span className="block font-semibold">{t(`branches.${b.key}`)}</span>
                    <span className={`block text-xs ${branch === b.key ? 'text-white/75' : 'text-muted'}`}>{t('monthsUnit', { n: b.months })}</span>
                  </button>
                ))}
              </div>
            </div>
            <button onClick={savePerson} disabled={!s || !dirty} className="ui-btn w-full px-4 py-3">
              {!dirty ? t('people.saved') : active ? t('people.update') : t('people.save')}
            </button>
            <p className="text-xs text-muted">{t('people.hint')}</p>
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 space-y-4">
          {s ? (
            <>
              <div className="ui-hero p-6 sm:p-8">
                <p className="text-sm text-white/70">{heroLabel}</p>
                <p className="mt-1 text-5xl sm:text-6xl font-bold tabular-nums tracking-tight">
                  {s.status === 'serving' ? ddayText : headline}
                </p>
                {s.status !== 'before' && (
                  <div className="mt-6">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-white/70">{t('hero.pct')}</span>
                      <span className="font-semibold tabular-nums">{s.pct.toFixed(1)}%</span>
                    </div>
                    <div className="h-3 rounded-full bg-white/25 overflow-hidden" role="progressbar" aria-valuenow={s.pct} aria-valuemin={0} aria-valuemax={100}>
                      <div className="h-full rounded-full bg-white transition-all duration-700" style={{ width: `${s.pct}%` }} />
                    </div>
                  </div>
                )}
                <div className="mt-5 flex flex-wrap justify-between gap-x-6 gap-y-1 text-sm">
                  <span><span className="text-white/70">{t('dischargeDate')} </span><span className="font-semibold">{fmtDate(s.discharge)}</span></span>
                  <span className="text-white/70 tabular-nums">{s.servedDays.toLocaleString()} / {s.totalDays.toLocaleString()}{t('daysUnit')}</span>
                </div>
                <p className="mt-4 pt-4 border-t border-white/20 text-sm">{todayLine}</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {hasRanks && (
                  <div className="ui-card p-4">
                    <p className="text-xs text-muted">{t('stats.rank')}</p>
                    <p className="mt-1 text-xl font-bold text-fg">{s.rank ? t(`rank.${s.rank}`) : '-'}</p>
                    <p className="text-xs text-muted mt-0.5">
                      {s.nextPromo ? t('stats.nextPromo', { rank: t(`rank.${s.nextPromo.rank}`), date: fmtDate(s.nextPromo.date) }) : t('stats.noPromo')}
                    </p>
                  </div>
                )}
                {hasRanks && (
                  <div className="ui-card p-4">
                    <p className="text-xs text-muted">{t('stats.pay')}</p>
                    <p className="mt-1 text-xl font-bold text-fg tabular-nums">{won(PAY_2026[s.rank ?? 'pvt'])}</p>
                    <p className="text-xs text-muted mt-0.5">{t('stats.payMatch', { n: won(SAVINGS_MATCH_MAX) })}</p>
                  </div>
                )}
                <div className={`ui-card p-4 ${hasRanks ? 'col-span-2 sm:col-span-1' : 'col-span-2 sm:col-span-3'}`}>
                  <p className="text-xs text-muted">{t('stats.next')}</p>
                  {nextMs && today ? (
                    <>
                      <p className="mt-1 text-xl font-bold text-fg">{t(`ms.${nextMs.key}`)}</p>
                      <p className="text-xs text-muted mt-0.5">{fmtDate(nextMs.date)} · {ddayLabel(daysBetween(today, nextMs.date))}</p>
                    </>
                  ) : <p className="mt-1 text-xl font-bold text-fg">{t('hero.done')}</p>}
                </div>
              </div>

              <div className="ui-card p-6">
                <h2 className="font-semibold text-fg mb-1">{t('share.title')}</h2>
                <p className="text-sm text-muted mb-4">{t('share.desc')}</p>
                <ShareResult
                  fileName={`discharge-${s.discharge}`}
                  card={{ tool: t('title'), label: heroLabel, headline, sub: t('share.sub', { date: fmtDate(s.discharge) }), rows: shareRows }}
                  text={t('share.text', { label: heroLabel, headline, date: fmtDate(s.discharge) })}
                />
              </div>
            </>
          ) : (
            <div className="ui-hero p-8 min-h-[260px] flex items-center justify-center text-white/70 text-sm">
              {today ? t('invalidDate') : ''}
            </div>
          )}
        </div>
      </div>

      {/* 복무 일정 */}
      {s && today && (
        <div className="ui-card p-6">
          <h2 className="text-lg font-semibold text-fg">{t('milestonesTitle')}</h2>
          {hasRanks && <p className="text-xs text-muted mt-1">{t('promoNote')}</p>}
          <ol className="mt-4 divide-y divide-line">
            {s.milestones.map(m => {
              const past = m.date < today
              const isNext = m === nextMs
              const diff = daysBetween(today, m.date)
              return (
                <li key={m.key} className={`flex items-center justify-between gap-3 py-3 ${isNext ? '-mx-3 px-3 rounded-xl bg-primary-soft border-transparent' : ''}`}>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${isNext ? 'text-primary' : past ? 'text-muted' : 'text-fg'}`}>{t(`ms.${m.key}`)}</p>
                    <p className="text-xs text-muted">{fmtDate(m.date)}</p>
                  </div>
                  <span className={`text-sm tabular-nums shrink-0 ${isNext ? 'text-primary font-semibold' : past ? 'text-faint' : 'text-sub'}`}>
                    {past ? t('msDone') : ddayLabel(diff)}
                  </span>
                </li>
              )
            })}
          </ol>
        </div>
      )}

      {/* 2026 병 봉급 */}
      <div className="ui-card p-6">
        <h2 className="text-lg font-semibold text-fg">{t('pay.title')}</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted text-left border-b border-line">
                <th className="py-2 font-medium">{t('pay.rank')}</th>
                <th className="py-2 font-medium text-right">{t('pay.base')}</th>
                <th className="py-2 font-medium text-right">{t('pay.withMatch')}</th>
              </tr>
            </thead>
            <tbody>
              {RANKS.map(r => {
                const cur = hasRanks && s?.rank === r
                return (
                  <tr key={r} className={`border-b border-line last:border-0 ${cur ? 'text-primary font-semibold' : 'text-body'}`}>
                    <td className="py-2.5">{t(`rank.${r}`)}{cur && <span className="ml-1.5 text-xs">({t('pay.current')})</span>}</td>
                    <td className="py-2.5 text-right tabular-nums">{won(PAY_2026[r])}</td>
                    <td className="py-2.5 text-right tabular-nums">{won(PAY_2026[r] + SAVINGS_MATCH_MAX)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-4 bg-subtle rounded-2xl p-4 text-sm text-sub">{t('pay.note')}</p>
      </div>

      {/* 가이드 */}
      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guideTitle')}</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-fg mb-2">{t('guide.periodTitle')}</h3>
            <ul className="text-sm divide-y divide-line">
              {BRANCHES.map(b => (
                <li key={b.key} className="flex justify-between py-2">
                  <span className="text-body">{t(`branches.${b.key}`)}</span>
                  <span className="text-fg font-medium tabular-nums">{t('monthsUnit', { n: b.months })}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-fg mb-2">{t('guide.ruleTitle')}</h3>
            <ul className="space-y-2 list-disc pl-5 text-sm text-body">
              {(t.raw('guide.ruleItems') as string[]).map((item, i) => <li key={i}>{item}</li>)}
            </ul>
            <h3 className="font-medium text-fg mt-5 mb-2">{t('guideCautionTitle')}</h3>
            <ul className="space-y-2 list-disc pl-5 text-sm text-muted">
              {(t.raw('guideCautionItems') as string[]).map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </div>
        </div>
        <div>
          <h3 className="font-medium text-fg mb-2">{t('guide.faqTitle')}</h3>
          <div className="space-y-3">
            {(t.raw('guide.faq') as { q: string; a: string }[]).map((f, i) => (
              <div key={i} className="bg-subtle rounded-2xl p-4">
                <p className="text-sm font-semibold text-fg">{f.q}</p>
                <p className="text-sm text-sub mt-1">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted">{t('guide.sources')}</p>
      </div>
    </div>
  )
}
