'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/lunarConverter'
import { useSearchParams } from '@/hooks/useSearchParams'
import { ArrowRightLeft, Copy, Check, RotateCcw, Link } from 'lucide-react'
import {
  MIN_YEAR, MAX_YEAR, leapMonth, lunarMonthDays, lunarToSolar, solarToLunar,
  yearGanzi, dayGanzi, weekday, lunarAnniversary, nextLunarAnniversary, daysBetween,
  type SolarDate, type LunarDate,
} from '@/utils/lunarCalendar'

type ConversionMode = 'solarToLunar' | 'lunarToSolar'

const YEARS = Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => MIN_YEAR + i)
const clampYear = (y: number, fallback: number) => (y >= MIN_YEAR && y <= MAX_YEAR ? y : fallback)
const fmt = (s: SolarDate) => `${s.year}.${String(s.month).padStart(2, '0')}.${String(s.day).padStart(2, '0')}`

export default function LunarConverter() {
  const t = useTranslations('lunarConverter')
  const searchParams = useSearchParams()
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const now = new Date()
  const today: SolarDate = { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() }
  const todayLunar = solarToLunar(today.year, today.month, today.day)

  const weekdays = t.raw('weekdays')
  const wd = (s: SolarDate) => (Array.isArray(weekdays) ? String(weekdays[weekday(s)]) : '')

  // 기본값: 음력 → 양력 (음력 생일 찾기가 주 용도), 오늘의 음력 날짜로 바로 결과 표시
  const [mode, setMode] = useState<ConversionMode>(() =>
    searchParams.get('mode') === 'solarToLunar' ? 'solarToLunar' : 'lunarToSolar')

  const [solarYear, setSolarYear] = useState(() => clampYear(Number(searchParams.get('sy')), today.year))
  const [solarMonth, setSolarMonth] = useState(() => Number(searchParams.get('sm')) || today.month)
  const [solarDay, setSolarDay] = useState(() => Number(searchParams.get('sd')) || today.day)

  const [lunarYear, setLunarYear] = useState(() => clampYear(Number(searchParams.get('ly')), todayLunar?.year ?? today.year))
  const [lunarMonth, setLunarMonth] = useState(() => Number(searchParams.get('lm')) || todayLunar?.month || 1)
  const [lunarDay, setLunarDay] = useState(() => Number(searchParams.get('ld')) || todayLunar?.day || 1)
  const [isLeap, setIsLeap] = useState(() => searchParams.get('leap') === '1')

  // 선택한 연도에 윤달이 없거나 날짜가 짧으면 자동 보정
  const leapInLunarYear = leapMonth(lunarYear)
  const leapValid = isLeap && leapInLunarYear === lunarMonth
  const lunarMax = lunarMonthDays(lunarYear, lunarMonth, leapValid)
  const solarMax = new Date(solarYear, solarMonth, 0).getDate()
  useEffect(() => { if (isLeap && !leapValid) setIsLeap(false) }, [isLeap, leapValid])
  useEffect(() => { if (lunarDay > lunarMax) setLunarDay(lunarMax) }, [lunarDay, lunarMax])
  useEffect(() => { if (solarDay > solarMax) setSolarDay(solarMax) }, [solarDay, solarMax])

  // 변환 결과: 양력/음력 한 쌍
  const pair = useMemo<{ solar: SolarDate; lunar: LunarDate } | null>(() => {
    if (mode === 'solarToLunar') {
      const lunar = solarToLunar(solarYear, solarMonth, solarDay)
      return lunar && { solar: { year: solarYear, month: solarMonth, day: solarDay }, lunar }
    }
    const solar = lunarToSolar(lunarYear, lunarMonth, lunarDay, leapValid)
    return solar && { solar, lunar: { year: lunarYear, month: lunarMonth, day: lunarDay, isLeap: leapValid } }
  }, [mode, solarYear, solarMonth, solarDay, lunarYear, lunarMonth, lunarDay, leapValid])

  // 음력 기념일(생일·제사) 올해~10년 뒤 양력 날짜 + 다음 기념일 D-day
  const anniversaries = useMemo(() => {
    if (!pair) return null
    const { month, day, isLeap: leap } = pair.lunar
    const start = todayLunar?.year ?? today.year
    const rows = Array.from({ length: 11 }, (_, i) => lunarAnniversary(start + i, month, day, leap)).filter(r => r !== null)
    const next = nextLunarAnniversary(today, month, day, leap)
    return { rows, next, dday: next ? daysBetween(today, next.solar) : null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pair, today.year, today.month, today.day])

  // URL 동기화 (공유 링크)
  useEffect(() => {
    const params = new URLSearchParams()
    params.set('mode', mode)
    if (mode === 'solarToLunar') {
      params.set('sy', String(solarYear)); params.set('sm', String(solarMonth)); params.set('sd', String(solarDay))
    } else {
      params.set('ly', String(lunarYear)); params.set('lm', String(lunarMonth)); params.set('ld', String(lunarDay))
      if (leapValid) params.set('leap', '1')
    }
    window.history.replaceState({}, '', `?${params.toString()}`)
  }, [mode, solarYear, solarMonth, solarDay, lunarYear, lunarMonth, lunarDay, leapValid])

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
    } catch { /* ignore */ }
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  const lunarLabel = (l: LunarDate) => t('lunarDate', { year: l.year, leap: l.isLeap ? t('leapPrefix') : '', month: l.month, day: l.day })
  const solarLabel = (s: SolarDate) => t('solarDate', { year: s.year, month: s.month, day: s.day })

  // 모드 전환 시 현재 결과를 반대편 입력으로 넘김
  const toggleMode = useCallback(() => {
    if (pair) {
      setSolarYear(pair.solar.year); setSolarMonth(pair.solar.month); setSolarDay(pair.solar.day)
      setLunarYear(pair.lunar.year); setLunarMonth(pair.lunar.month); setLunarDay(pair.lunar.day); setIsLeap(pair.lunar.isLeap)
    }
    setMode(prev => (prev === 'solarToLunar' ? 'lunarToSolar' : 'solarToLunar'))
  }, [pair])

  const handleReset = useCallback(() => {
    const n = new Date()
    const l = solarToLunar(n.getFullYear(), n.getMonth() + 1, n.getDate())
    setSolarYear(n.getFullYear()); setSolarMonth(n.getMonth() + 1); setSolarDay(n.getDate())
    setLunarYear(l?.year ?? n.getFullYear()); setLunarMonth(l?.month ?? 1); setLunarDay(l?.day ?? 1); setIsLeap(l?.isLeap ?? false)
    setMode('lunarToSolar')
  }, [])

  const resultText = pair
    ? `${lunarLabel(pair.lunar)} = ${solarLabel(pair.solar)} (${wd(pair.solar)}) · ${yearGanzi(pair.lunar.year).ganzi}${t('yearSuffix')} ${yearGanzi(pair.lunar.year).zodiac}${t('zodiacSuffix')}`
    : ''

  const tableText = anniversaries
    ? anniversaries.rows.map(r => `${lunarLabel({ year: r.lunarYear, month: pair!.lunar.month, day: pair!.lunar.day, isLeap: pair!.lunar.isLeap && !r.leapFallback })} → ${fmt(r.solar)} (${wd(r.solar)})`).join('\n')
    : ''

  const selectCls = 'ui-field px-3 py-2 w-full'
  const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <div className="lg:col-span-1">
          <div className="ui-card p-6 space-y-6">
            <div className="grid grid-cols-2 gap-2" role="tablist">
              {(['lunarToSolar', 'solarToLunar'] as const).map(m => (
                <button
                  key={m}
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => (mode === m ? undefined : toggleMode())}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${mode === m ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}
                >
                  {t(`mode.${m}`)}
                </button>
              ))}
            </div>

            {mode === 'solarToLunar' ? (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-body">{t('solar')}</h3>
                <div className="grid grid-cols-3 gap-2">
                  <select aria-label={t('year')} value={solarYear} onChange={e => setSolarYear(Number(e.target.value))} className={selectCls}>
                    {YEARS.map(y => <option key={y} value={y}>{y}{t('year')}</option>)}
                  </select>
                  <select aria-label={t('month')} value={solarMonth} onChange={e => setSolarMonth(Number(e.target.value))} className={selectCls}>
                    {range(12).map(m => <option key={m} value={m}>{m}{t('month')}</option>)}
                  </select>
                  <select aria-label={t('day')} value={Math.min(solarDay, solarMax)} onChange={e => setSolarDay(Number(e.target.value))} className={selectCls}>
                    {range(solarMax).map(d => <option key={d} value={d}>{d}{t('day')}</option>)}
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-body">{t('lunar')}</h3>
                <div className="grid grid-cols-3 gap-2">
                  <select aria-label={t('year')} value={lunarYear} onChange={e => setLunarYear(Number(e.target.value))} className={selectCls}>
                    {YEARS.map(y => <option key={y} value={y}>{y}{t('year')}</option>)}
                  </select>
                  {/* 윤달이 있는 해엔 "윤N월"을 월 목록에 끼워 넣음 */}
                  <select
                    aria-label={t('month')}
                    value={leapValid ? `L${lunarMonth}` : String(lunarMonth)}
                    onChange={e => {
                      const v = e.target.value
                      setIsLeap(v.startsWith('L'))
                      setLunarMonth(Number(v.replace('L', '')))
                    }}
                    className={selectCls}
                  >
                    {range(12).flatMap(m => {
                      const opts = [<option key={m} value={String(m)}>{m}{t('month')}</option>]
                      if (leapInLunarYear === m) opts.push(<option key={`L${m}`} value={`L${m}`}>{t('leapPrefix')}{m}{t('month')}</option>)
                      return opts
                    })}
                  </select>
                  <select aria-label={t('day')} value={Math.min(lunarDay, lunarMax)} onChange={e => setLunarDay(Number(e.target.value))} className={selectCls}>
                    {range(lunarMax).map(d => <option key={d} value={d}>{d}{t('day')}</option>)}
                  </select>
                </div>
                <p className="text-xs text-muted">
                  {leapInLunarYear
                    ? t('leapInfo', { year: lunarYear, month: leapInLunarYear })
                    : t('noLeapInfo', { year: lunarYear })}
                </p>
                <label className="flex items-center gap-2 text-sm text-body">
                  <input
                    type="checkbox"
                    checked={isLeap}
                    disabled={leapInLunarYear !== lunarMonth}
                    onChange={e => setIsLeap(e.target.checked)}
                    className="w-4 h-4 accent-blue-600"
                  />
                  {t('leapMonth')}
                </label>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={toggleMode} className="ui-btn-soft flex-1 px-4 py-2 flex items-center justify-center gap-2">
                <ArrowRightLeft className="w-4 h-4" aria-hidden />
                {t('swap')}
              </button>
              <button onClick={() => copyToClipboard(window.location.href, 'link')} title={t('copyLink')} aria-label={t('copyLink')} className="ui-btn-soft px-4 py-2">
                {copiedId === 'link' ? <Check className="w-4 h-4" /> : <Link className="w-4 h-4" />}
              </button>
              <button onClick={handleReset} title={t('reset')} aria-label={t('reset')} className="ui-btn-soft px-4 py-2">
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted">{t('rangeNote')}</p>
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="ui-card p-6">
            <h2 className="text-xl font-semibold text-fg mb-4">{t('result.title')}</h2>
            {pair ? (
              <div className="space-y-4">
                <div className="bg-subtle rounded-2xl p-5 flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm text-sub">
                      {mode === 'solarToLunar' ? solarLabel(pair.solar) : lunarLabel(pair.lunar)}
                    </div>
                    <div className="text-3xl font-bold text-fg tabular-nums mt-1">
                      {mode === 'solarToLunar' ? lunarLabel(pair.lunar) : solarLabel(pair.solar)}
                    </div>
                    <div className="text-sm text-sub mt-1">
                      {wd(pair.solar)}
                      {pair.lunar.isLeap && <span className="ml-2 text-primary font-medium">{t('result.leapMonth')}</span>}
                    </div>
                  </div>
                  <button onClick={() => copyToClipboard(resultText, 'result')} aria-label={t('copy')} className="ui-btn-soft px-3 py-2 shrink-0">
                    {copiedId === 'result' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    [t('result.zodiacAnimal'), `${yearGanzi(pair.lunar.year).zodiac}${t('zodiacSuffix')}`],
                    [t('result.sexagenary'), `${yearGanzi(pair.lunar.year).ganzi}${t('yearSuffix')}`],
                    [t('result.dayGanzi'), `${dayGanzi(pair.solar)}${t('daySuffix')}`],
                    [t('result.dayOfWeek'), wd(pair.solar)],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-subtle rounded-xl p-4">
                      <div className="text-xs text-sub mb-1">{label}</div>
                      <div className="text-lg font-semibold text-fg">{value}</div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted">{t('ganziNote')}</p>
              </div>
            ) : (
              <div className="text-center text-muted py-12">{t('error.outOfRange')}</div>
            )}
          </div>

          {/* 음력 생일·제사 → 매년 양력 날짜 */}
          {pair && anniversaries && (
            <div className="ui-card p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-fg">
                    {t('yearly.title', { leap: pair.lunar.isLeap ? t('leapPrefix') : '', month: pair.lunar.month, day: pair.lunar.day })}
                  </h2>
                  <p className="text-sm text-muted mt-1">{t('yearly.description')}</p>
                </div>
                <button onClick={() => copyToClipboard(tableText, 'table')} aria-label={t('copy')} className="ui-btn-soft px-3 py-2 shrink-0">
                  {copiedId === 'table' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              {anniversaries.next && anniversaries.dday !== null && (
                <div className="bg-subtle rounded-2xl p-5 mb-4">
                  <div className="text-sm text-sub">{t('yearly.next')}</div>
                  <div className="text-2xl font-bold text-fg tabular-nums mt-1">
                    {solarLabel(anniversaries.next.solar)} ({wd(anniversaries.next.solar)})
                    <span className="ml-3 text-primary">
                      {anniversaries.dday === 0 ? t('yearly.today') : `D-${anniversaries.dday}`}
                    </span>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-sub">
                      <th className="py-2 pr-3 font-medium">{t('yearly.colLunarYear')}</th>
                      <th className="py-2 pr-3 font-medium">{t('yearly.colSolar')}</th>
                      <th className="py-2 pr-3 font-medium">{t('result.dayOfWeek')}</th>
                      <th className="py-2 font-medium">{t('yearly.colNote')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {anniversaries.rows.map(r => {
                      const isNext = anniversaries.next?.lunarYear === r.lunarYear
                      const past = daysBetween(today, r.solar) < 0
                      const notes = [
                        r.leapFallback && t('yearly.leapFallback', { month: pair.lunar.month }),
                        r.dayFallback && t('yearly.dayFallback'),
                      ].filter(Boolean).join(' · ')
                      return (
                        <tr key={r.lunarYear} className={`border-b border-line last:border-0 ${isNext ? 'bg-soft' : ''} ${past ? 'text-faint' : 'text-body'}`}>
                          <td className="py-2 pr-3 tabular-nums">{r.lunarYear} <span className="text-muted">({yearGanzi(r.lunarYear).ganzi})</span></td>
                          <td className={`py-2 pr-3 tabular-nums ${isNext ? 'font-semibold text-fg' : ''}`}>{fmt(r.solar)}</td>
                          <td className="py-2 pr-3">{wd(r.solar)}</td>
                          <td className="py-2 text-xs text-muted">{notes}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted mt-3">{t('yearly.rule')}</p>
            </div>
          )}
        </div>
      </div>

      {/* 가이드 */}
      <div className="ui-card p-6">
        <h2 className="text-xl font-semibold text-fg mb-6">{t('guide.title')}</h2>
        <div className="space-y-6">
          {(['howToUse', 'tips'] as const).map(section => (
            <div key={section}>
              <h3 className="text-base font-semibold text-fg mb-3">{t(`guide.${section}.title`)}</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-sub">
                {(t.raw(`guide.${section}.items`) as string[]).map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
