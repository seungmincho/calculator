'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useTranslations } from '@/lib/i18n'
import { Trash2 } from 'lucide-react'
import ShareResult from '@/components/ShareResult'
import GuideSection from '@/components/GuideSection'
import { todayKST, isValidDate, weekday, ddayLabel, daysBetween } from '@/utils/dday'
import { solarToLunar, leapMonth, isValidLunar, MIN_YEAR, MAX_YEAR } from '@/utils/lunarCalendar'
import {
  type BirthInput, type Member, birthSolar, ageUpDay, manAge, yeonAge, countingAge, ageDetail, nextBirthday,
  zodiacOf, westernSign, generationOf, schoolEntryYear, schoolStatus, ageMilestones, ageGap, sanitizeMembers,
} from '@/utils/age'

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const
const STORE_KEY = 'ageCalc.family'
const pad = (n: number) => String(n).padStart(2, '0')

const readMembers = (): Member[] => {
  try { return sanitizeMembers(JSON.parse(localStorage.getItem(STORE_KEY) || '[]')) } catch { return [] }
}
const writeMembers = (list: Member[]) => {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(list)) } catch { /* 시크릿 모드 등 */ }
}

const LAW_LINKS: Record<string, string> = {
  civil: 'https://www.law.go.kr/법령/민법',
  youth: 'https://www.law.go.kr/법령/청소년보호법',
  military: 'https://www.law.go.kr/법령/병역법',
  nps: 'https://www.nps.or.kr',
}

export default function AgeCalculator() {
  const t = useTranslations('ageCalculator')
  const searchParams = useSearchParams()

  const [today, setToday] = useState<string | null>(null)
  const [birth, setBirth] = useState<BirthInput>({ cal: 'solar', date: '' })
  const [base, setBase] = useState('')
  const [name, setName] = useState('')
  const [hideBirth, setHideBirth] = useState(false)
  const [members, setMembers] = useState<Member[]>([])

  // ── 초기화: URL → 기본값(30년 전 3월 15일생) ──
  const inited = useRef(false)
  useEffect(() => {
    if (inited.current) return
    inited.current = true
    const now = todayKST()
    setToday(now)
    setMembers(readMembers())
    const b = searchParams.get('birth') ?? ''
    const input: BirthInput = { cal: searchParams.get('cal') === 'lunar' ? 'lunar' : 'solar', date: b, leap: searchParams.get('leap') === '1' }
    setBirth(/^\d{4}-\d{2}-\d{2}$/.test(b) && birthSolar(input) ? input : { cal: 'solar', date: `${+now.slice(0, 4) - 30}-03-15` })
    const bs = searchParams.get('base')
    setBase(isValidDate(bs) ? bs : now)
    setName((searchParams.get('name') ?? '').slice(0, 20))
  }, [searchParams])

  // ── URL 동기화 ──
  useEffect(() => {
    if (!today || !birth.date) return
    const p = new URLSearchParams({ birth: birth.date })
    if (birth.cal === 'lunar') { p.set('cal', 'lunar'); if (birth.leap) p.set('leap', '1') }
    if (base && base !== today) p.set('base', base)
    if (name.trim()) p.set('name', name.trim())
    window.history.replaceState(window.history.state, '', `${window.location.pathname}?${p}`)
  }, [today, birth, base, name])

  const fmt = useCallback((d: string) => {
    const [y, m, dd] = d.split('-').map(Number)
    return t('dateFmt', { y, m, d: dd, w: t(`days.${DAY_KEYS[weekday(d)]}`) })
  }, [t])
  const fmtBirth = useCallback((b: BirthInput) => {
    const [y, m, d] = b.date.split('-').map(Number)
    return b.cal === 'lunar' ? t(b.leap ? 'lunarLeapFmt' : 'lunarFmt', { y, m, d }) : t('solarFmt', { y, m, d })
  }, [t])

  const solar = birthSolar(birth)
  const error = !birth.date || !isValidDate(base) ? '' : !solar ? t('input.invalid') : solar > base ? t('input.future') : ''

  const r = useMemo(() => {
    if (!today || !solar || !isValidDate(base) || solar > base || error) return null
    const by = +solar.slice(0, 4)
    const man = manAge(solar, base)
    const upDay = ageUpDay(solar, +base.slice(0, 4))
    const lived = daysBetween(solar, base)
    return {
      man, yeon: yeonAge(solar, base), counting: countingAge(solar, base),
      detail: ageDetail(solar, base), passed: base >= upDay, upDay,
      next: nextBirthday(birth, base), lived,
      zodiac: zodiacOf(solar), sign: westernSign(solar), dayKey: DAY_KEYS[weekday(solar)],
      generation: generationOf(by), entry: schoolEntryYear(solar), school: schoolStatus(solar, base),
      milestones: ageMilestones(solar),
    }
  }, [today, solar, base, birth, error])

  // ── 입력 ──
  const setCal = (cal: 'solar' | 'lunar') => {
    if (cal === birth.cal) return
    if (!solar) return setBirth({ cal, date: '' })
    if (cal === 'solar') return setBirth({ cal, date: solar })
    const [y, m, d] = solar.split('-').map(Number)
    const l = solarToLunar(y, m, d)
    setBirth(l ? { cal, date: `${l.year}-${pad(l.month)}-${pad(l.day)}`, leap: l.isLeap } : { cal, date: '' })
  }
  const [ly, lm, ld] = birth.cal === 'lunar' && birth.date ? birth.date.split('-').map(Number) : [1990, 1, 1]
  const setLunar = (y: number, m: number, d: number, leap: boolean) => {
    const useLeap = leap && leapMonth(y) === m
    setBirth({ cal: 'lunar', date: `${String(y).padStart(4, '0')}-${pad(m)}-${pad(d)}`, leap: useLeap })
  }
  const canLeap = leapMonth(ly) === lm

  // ── 가족 ──
  const addMember = () => {
    if (!solar || error) return
    const list = [...members, { id: Date.now().toString(36), name: name.trim() || t('family.defaultName', { n: members.length + 1 }), ...birth, leap: !!birth.leap }].slice(0, 30)
    setMembers(list); writeMembers(list)
  }
  const removeMember = (id: string) => { const list = members.filter(m => m.id !== id); setMembers(list); writeMembers(list) }
  const loadMember = (m: Member) => { setBirth({ cal: m.cal, date: m.date, leap: m.leap }); setName(m.name) }

  const segBtn = (active: boolean) => `flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${active ? 'bg-primary text-white' : 'text-sub hover:text-fg'}`
  const who = name.trim()

  const shareCard = r && {
    tool: t('title'),
    label: who ? t('hero.labelNamed', { name: who }) : t('hero.label'),
    headline: t('hero.age', { n: r.man }),
    sub: hideBirth ? undefined : fmtBirth(birth),
    rows: [
      { label: t('types.yeon'), value: t('ageN', { n: r.yeon }) },
      { label: t('types.counting'), value: t('ageN', { n: r.counting }) },
      ...(hideBirth ? [] : [
        ...(r.next ? [{ label: t('next.title'), value: `${ddayLabel(r.next.days)} · ${fmt(r.next.date)}` }] : []),
        { label: t('lived.title'), value: t('lived.nth', { n: (r.lived + 1).toLocaleString('ko-KR') }) },
        { label: t('info.zodiac'), value: t(`zodiacAnimals.${r.zodiac.key}`) },
      ]),
    ],
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <div className="lg:col-span-1">
          <div className="ui-card p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-body mb-1.5" htmlFor="age-name">{t('input.name')}</label>
              <input id="age-name" value={name} maxLength={20} onChange={e => setName(e.target.value)} placeholder={t('input.namePlaceholder')} className="ui-field px-4 py-3" />
            </div>

            <div>
              <p className="text-sm font-medium text-body mb-1.5">{t('birthDate')}</p>
              <div className="flex gap-1 p-1 bg-soft rounded-2xl mb-3" role="tablist">
                <button role="tab" aria-selected={birth.cal === 'solar'} onClick={() => setCal('solar')} className={segBtn(birth.cal === 'solar')}>{t('input.solar')}</button>
                <button role="tab" aria-selected={birth.cal === 'lunar'} onClick={() => setCal('lunar')} className={segBtn(birth.cal === 'lunar')}>{t('input.lunar')}</button>
              </div>
              {birth.cal === 'solar' ? (
                <input type="date" aria-label={t('birthDate')} value={birth.date} min="1900-01-01" max={today ?? undefined}
                  onChange={e => setBirth({ cal: 'solar', date: e.target.value })} className="ui-field px-4 py-3" />
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <input type="number" aria-label={t('input.lunarYear')} min={MIN_YEAR} max={MAX_YEAR} value={ly}
                      onChange={e => setLunar(Math.min(MAX_YEAR, Math.max(0, +e.target.value || 0)), lm, ld, !!birth.leap)} className="ui-field px-3 py-3 tabular-nums" />
                    <select aria-label={t('input.lunarMonth')} value={lm} onChange={e => setLunar(ly, +e.target.value, ld, !!birth.leap)} className="ui-field px-3 py-3">
                      {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{t('input.monthN', { n: i + 1 })}</option>)}
                    </select>
                    <select aria-label={t('input.lunarDay')} value={ld} onChange={e => setLunar(ly, lm, +e.target.value, !!birth.leap)} className="ui-field px-3 py-3">
                      {Array.from({ length: 30 }, (_, i) => <option key={i} value={i + 1}>{t('input.dayN', { n: i + 1 })}</option>)}
                    </select>
                  </div>
                  <label className={`flex items-center gap-2 text-sm ${canLeap ? 'text-body' : 'text-faint'}`}>
                    <input type="checkbox" disabled={!canLeap} checked={!!birth.leap && canLeap} onChange={e => setLunar(ly, lm, ld, e.target.checked)} className="w-4 h-4 accent-[var(--primary)]" />
                    {canLeap ? t('input.leap', { m: lm }) : t('input.noLeap', { y: ly, m: lm })}
                  </label>
                  {solar && <p className="text-sm text-sub">{t('input.converted', { date: fmt(solar) })}</p>}
                  <p className="text-xs text-muted">{t('input.lunarRange')}</p>
                </div>
              )}
              {error && <p className="mt-2 text-sm text-red-600" role="alert">{error}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-body mb-1.5" htmlFor="age-base">{t('baseDate')}</label>
              <div className="flex gap-2">
                <input id="age-base" type="date" value={base} onChange={e => setBase(e.target.value)} className="ui-field px-4 py-3" />
                {today && base !== today && (
                  <button onClick={() => setBase(today)} className="ui-btn-soft px-4 py-2 shrink-0 text-sm">{t('today')}</button>
                )}
              </div>
            </div>

            <button onClick={addMember} disabled={!r} className="ui-btn w-full px-4 py-3">{t('family.add')}</button>
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 space-y-6">
          {r ? (
            <>
              <div className="ui-hero p-6 sm:p-8">
                <p className="text-sm text-white/70">{who ? t('hero.labelNamed', { name: who }) : t('hero.label')}</p>
                <p className="mt-1 text-5xl sm:text-6xl font-bold tabular-nums tracking-tight">{t('hero.age', { n: r.man })}</p>
                <p className="mt-2 text-sm text-white/90">
                  {t(r.passed ? 'hero.passed' : 'hero.notPassed', { date: t('mdFmt', { m: +r.upDay.slice(5, 7), d: +r.upDay.slice(8, 10) }) })}
                  <span className="text-white/70"> · {t('hero.detail', { y: r.detail.years, m: r.detail.months, d: r.detail.days })}</span>
                </p>
                {birth.cal === 'lunar' && <p className="mt-1 text-xs text-white/70">{t('hero.lunarNote', { date: fmt(solar!) })}</p>}
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-white/15 p-4">
                    <p className="text-xs text-white/70">{t('types.yeon')}</p>
                    <p className="text-2xl font-bold tabular-nums">{t('ageN', { n: r.yeon })}</p>
                    <p className="text-xs text-white/70 mt-1">{t('hero.yeonUse')}</p>
                  </div>
                  <div className="rounded-2xl bg-white/15 p-4">
                    <p className="text-xs text-white/70">{t('types.counting')}</p>
                    <p className="text-2xl font-bold tabular-nums">{t('ageN', { n: r.counting })}</p>
                    <p className="text-xs text-white/70 mt-1">{t('hero.countingUse')}</p>
                  </div>
                </div>
              </div>

              {shareCard && (
                <div className="space-y-2">
                  <ShareResult card={shareCard} url={hideBirth ? `${window.location.origin}${window.location.pathname}` : undefined}
                    text={who ? t('share.textNamed', { name: who, n: r.man }) : t('share.text', { n: r.man })} fileName="age" />
                  <label className="flex items-center gap-2 text-sm text-sub">
                    <input type="checkbox" checked={hideBirth} onChange={e => setHideBirth(e.target.checked)} className="w-4 h-4 accent-[var(--primary)]" />
                    {t('share.hideBirth')}
                  </label>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="ui-card p-5">
                  <p className="text-sm text-muted">{t('next.title')}</p>
                  {r.next ? (
                    <>
                      <p className="mt-1 text-3xl font-bold text-fg tabular-nums">{r.next.isToday ? t('next.today') : ddayLabel(r.next.days)}</p>
                      <p className="mt-1 text-sm text-body">{fmt(r.next.date)}</p>
                      <p className="text-sm text-sub">{t('next.turning', { n: r.next.turning })}</p>
                      {birth.cal === 'lunar' && <p className="mt-2 text-xs text-muted">{t('next.lunarFrom', { md: fmtBirth(birth) })}</p>}
                      {r.next.lunar?.leapFallback && <p className="mt-1 text-xs text-muted">{t('next.leapFallback')}</p>}
                      {r.next.lunar?.dayFallback && <p className="mt-1 text-xs text-muted">{t('next.dayFallback')}</p>}
                      {birth.cal === 'solar' && solar!.slice(5) === '02-29' && <p className="mt-2 text-xs text-muted">{t('next.feb29')}</p>}
                    </>
                  ) : <p className="mt-2 text-sm text-muted">{t('next.outOfRange')}</p>}
                </div>
                <div className="ui-card p-5">
                  <p className="text-sm text-muted">{t('lived.title')}</p>
                  <p className="mt-1 text-3xl font-bold text-fg tabular-nums">{t('lived.nth', { n: (r.lived + 1).toLocaleString('ko-KR') })}</p>
                  <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <dt className="text-sub">{t('lived.days')}</dt><dd className="text-right text-fg tabular-nums">{r.lived.toLocaleString('ko-KR')}</dd>
                    <dt className="text-sub">{t('lived.weeks')}</dt><dd className="text-right text-fg tabular-nums">{t('lived.weeksVal', { w: Math.floor(r.lived / 7).toLocaleString('ko-KR'), d: r.lived % 7 })}</dd>
                    <dt className="text-sub">{t('lived.hours')}</dt><dd className="text-right text-fg tabular-nums">{(r.lived * 24).toLocaleString('ko-KR')}</dd>
                  </dl>
                </div>
              </div>

              <div className="ui-card p-6">
                <h2 className="text-lg font-semibold text-fg mb-4">{t('info.title')}</h2>
                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    [t('info.zodiac'), `${t(`zodiacAnimals.${r.zodiac.key}`)}`, r.zodiac.byLunar ? t('info.zodiacNote', { g: r.zodiac.ganzi }) : ''],
                    [t('info.sign'), t(`zodiacSigns.${r.sign}`), ''],
                    [t('info.weekday'), t(`days.${r.dayKey}`), ''],
                    [t('info.generation'), t(`generations.${r.generation}`), ''],
                    [t('school.currentStatus'), r.school.status === 'preschool' || r.school.status === 'graduated'
                      ? t(`school.status.${r.school.status}`) : t(`school.status.${r.school.status}Grade`, { grade: r.school.grade }), t('info.schoolNote')],
                    [t('school.entryYear'), t('info.entryVal', { y: r.entry.year }), r.entry.early ? t('info.early') : ''],
                  ].map(([label, value, note]) => (
                    <div key={label} className="bg-subtle rounded-xl p-3">
                      <dt className="text-xs text-muted">{label}</dt>
                      <dd className="mt-1 text-sm font-semibold text-fg">{value}</dd>
                      {note && <dd className="mt-0.5 text-xs text-muted">{note}</dd>}
                    </div>
                  ))}
                </dl>
              </div>
            </>
          ) : (
            <div className="ui-hero p-8 min-h-[260px] flex items-center justify-center text-white/70 text-sm">
              {today ? (error || t('placeholder')) : ''}
            </div>
          )}
        </div>
      </div>

      {/* 나이 기준 이정표 */}
      {r && (
        <div className="ui-card p-6">
          <h2 className="text-lg font-semibold text-fg">{t('ms.title')}</h2>
          <p className="text-xs text-muted mt-1">{t('ms.note')}</p>
          <ol className="mt-4 divide-y divide-line">
            {r.milestones.map(m => {
              const d = daysBetween(base, m.date)
              return (
                <li key={m.key} className={`py-3 flex flex-wrap items-start gap-x-4 gap-y-1 ${d < 0 ? 'opacity-60' : ''}`}>
                  <div className="flex-1 min-w-[12rem]">
                    <p className="text-sm font-semibold text-fg">{t(`ms.${m.key}.title`)}</p>
                    <p className="text-xs text-muted mt-0.5">{t(`ms.${m.key}.law`)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-body tabular-nums">{fmt(m.date)}</p>
                    <p className="text-xs text-sub">
                      {m.basis === 'man' ? t('ms.man', { n: m.age }) : m.basis === 'yeon' ? t('ms.yeon', { n: m.age }) : t('ms.fixed')}
                      {' · '}{d < 0 ? t('ms.done') : ddayLabel(d)}
                    </p>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      )}

      {/* 가족 나이 표 */}
      {members.length > 0 && (
        <div className="ui-card p-6">
          <h2 className="text-lg font-semibold text-fg">{t('family.title')}</h2>
          <p className="text-xs text-muted mt-1">{t('family.note')}</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left text-xs text-muted border-b border-line">
                  <th className="py-2 font-medium">{t('family.name')}</th>
                  <th className="py-2 font-medium">{t('birthDate')}</th>
                  <th className="py-2 font-medium text-right">{t('types.man')}</th>
                  <th className="py-2 font-medium text-right">{t('types.yeon')}</th>
                  <th className="py-2 font-medium">{t('info.zodiac')}</th>
                  <th className="py-2 font-medium text-right">{t('next.title')}</th>
                  <th className="py-2 font-medium text-right">{t('family.gap')}</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {members.map(m => {
                  const s = birthSolar(m)!
                  const ok = !!base && isValidDate(base) && s <= base
                  const nb = ok ? nextBirthday(m, base) : null
                  const g = solar ? ageGap(solar, s) : null
                  return (
                    <tr key={m.id}>
                      <td className="py-2.5">
                        <button onClick={() => loadMember(m)} className="font-semibold text-primary hover:underline">{m.name}</button>
                      </td>
                      <td className="py-2.5 text-body">{fmtBirth(m)}</td>
                      <td className="py-2.5 text-right text-fg font-semibold tabular-nums">{ok ? t('ageN', { n: manAge(s, base) }) : '-'}</td>
                      <td className="py-2.5 text-right text-body tabular-nums">{ok ? t('ageN', { n: yeonAge(s, base) }) : '-'}</td>
                      <td className="py-2.5 text-body">{t(`zodiacAnimals.${zodiacOf(s).key}`)}</td>
                      <td className="py-2.5 text-right text-body tabular-nums">{nb ? ddayLabel(nb.days) : '-'}</td>
                      <td className="py-2.5 text-right text-sub tabular-nums">
                        {!g ? '-' : g.sign === 0 ? t('family.same')
                          : t(g.sign > 0 ? 'family.younger' : 'family.older', { y: g.years, m: g.months, d: g.days })}
                      </td>
                      <td className="py-2.5 text-right">
                        <button onClick={() => removeMember(m.id)} aria-label={t('family.remove', { name: m.name })} className="p-1.5 rounded-lg text-faint hover:text-fg hover:bg-soft">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 나이 종류 안내 */}
      <div className="ui-card p-6">
        <h2 className="text-lg font-semibold text-fg">{t('types.title')}</h2>
        <div className="mt-4 grid md:grid-cols-3 gap-3">
          {(['man', 'yeon', 'counting'] as const).map(k => (
            <div key={k} className="bg-subtle rounded-2xl p-5">
              <p className="text-sm font-semibold text-fg">{t(`types.${k}`)}</p>
              <p className="mt-1 text-sm text-sub">{t(`types.${k}Desc`)}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted">
          {t('types.sources')}{' '}
          {Object.entries(LAW_LINKS).map(([k, href], i) => (
            <span key={k}>{i > 0 && ' · '}<a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{t(`types.link.${k}`)}</a></span>
          ))}
        </p>
      </div>

      <GuideSection namespace="ageCalculator" />
    </div>
  )
}
