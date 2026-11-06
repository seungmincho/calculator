'use client'

import MobileResultLink from '@/components/MobileResultLink'
import { useState, useMemo, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/taxiFare'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useHydrated } from '@/hooks/useHydrated'
import { Link as LinkIcon, Check, Download } from 'lucide-react'
import {
  REGION_RATES, REGION_GROUPS, REGION_KEYS, TAXI_TYPES,
  getSchedule, nightRateFor, computeFare, estimateMinutes, perPerson,
  type RegionKey, type TaxiType, type Traffic,
} from '@/utils/taxiFare'

const DISTANCE_PRESETS = [3, 5, 10, 20, 30]
const TRAFFICS: Traffic[] = ['smooth', 'normal', 'heavy']
const PEOPLE = [1, 2, 3, 4]
const HOURS = Array.from({ length: 24 }, (_, i) => i)

const seg = (on: boolean) =>
  `min-h-11 rounded-xl text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`

export default function TaxiFare() {
  const t = useTranslations('taxiFare')
  const searchParams = useSearchParams()
  const hydrated = useHydrated()
  const [urlRestored, setUrlRestored] = useState(false)

  const [distance, setDistance] = useState('5')
  const [time, setTime] = useState('15')
  const [timeAuto, setTimeAuto] = useState(true)
  const [traffic, setTraffic] = useState<Traffic>('normal')
  const [region, setRegion] = useState<RegionKey>('seoul')
  const [taxiType, setTaxiType] = useState<TaxiType>('regular')
  const [hour, setHour] = useState(14)
  const [outOfCity, setOutOfCity] = useState(false)
  const [people, setPeople] = useState(1)
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)

  // 정적 HTML과 첫 렌더는 기본값으로 맞춘 뒤, 공유 조건을 한 번만 복원한다.
  // URL 동기화도 복원 이후 시작해야 공유 링크가 기본값으로 덮이지 않는다.
  if (hydrated && !urlRestored) {
    setUrlRestored(true)
    setDistance(searchParams.get('distance') ?? '5')
    setTime(searchParams.get('time') ?? '15')
    setTimeAuto(!searchParams.get('time'))
    const tr = searchParams.get('traffic') as Traffic
    const rk = searchParams.get('region') as RegionKey
    const ty = searchParams.get('type') as TaxiType
    const h = Number.parseInt(searchParams.get('hour') ?? '', 10)
    const n = Number.parseInt(searchParams.get('n') ?? '', 10)
    setTraffic(TRAFFICS.includes(tr) ? tr : 'normal')
    setRegion(REGION_KEYS.includes(rk) ? rk : 'seoul')
    setTaxiType(TAXI_TYPES.includes(ty) ? ty : 'regular')
    setHour(Number.isFinite(h) && h >= 0 && h <= 23 ? h : 14)
    setPeople(PEOPLE.includes(n) ? n : 1)
    setOutOfCity(searchParams.get('out') === '1')
  }

  const distanceNum = Math.max(0, parseFloat(distance) || 0)

  // 자동 시간은 입력에서 바로 파생해 중간 요금이 한 번 더 표시되지 않게 한다.
  const displayedTime = timeAuto ? String(estimateMinutes(distanceNum, traffic)) : time

  // URL 동기화 (공유 링크)
  useEffect(() => {
    if (!urlRestored) return
    const params = new URLSearchParams({
      distance, region, type: taxiType, hour: String(hour), out: outOfCity ? '1' : '0', traffic,
    })
    if (!timeAuto) params.set('time', time)
    if (people > 1) params.set('n', String(people))
    window.history.replaceState(window.history.state, '', `${window.location.pathname}?${params}${window.location.hash}`)
  }, [distance, time, timeAuto, traffic, region, taxiType, hour, outOfCity, people, urlRestored])

  const timeNum = Math.max(0, parseFloat(displayedTime) || 0)

  const schedule = useMemo(() => getSchedule(region, taxiType), [region, taxiType])
  const premiumRate = useMemo(() => getSchedule(region, 'deluxe'), [region])
  const activeNightRate = nightRateFor(hour, schedule)

  const fare = useMemo(
    () => computeFare(distanceNum, timeNum, hour, region, taxiType, outOfCity),
    [distanceNum, timeNum, hour, region, taxiType, outOfCity]
  )

  const comparisonFares = useMemo(() => Object.fromEntries(
    TAXI_TYPES.map((ty) => [ty, computeFare(distanceNum, timeNum, hour, region, ty, outOfCity).total])
  ) as Record<TaxiType, number>, [distanceNum, timeNum, hour, region, outOfCity])
  const maxFare = Math.max(...Object.values(comparisonFares))

  // 같은 거리·시간·시각·시외 조건의 지역별 일반택시 요금
  const regionFares = useMemo(() => REGION_KEYS.map((rk) => ({
    rk, total: computeFare(distanceNum, timeNum, hour, rk, 'regular', outOfCity).total,
  })), [distanceNum, timeNum, hour, outOfCity])
  const selectedRegular = regionFares.find((r) => r.rk === region)!.total

  const regionRate = REGION_RATES[region]
  const won = t('result.won')
  const hh = (h: number | null) => String(h).padStart(2, '0')
  const split = perPerson(fare.total, people)

  const handleReset = () => {
    setDistance('5')
    setTraffic('normal')
    setTimeAuto(true)
    setRegion('seoul')
    setTaxiType('regular')
    setHour(14)
    setOutOfCity(false)
    setPeople(1)
  }

  const copyLink = useCallback(async () => {
    const url = window.location.href
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
      } else {
        const ta = document.createElement('textarea')
        ta.value = url
        ta.style.position = 'fixed'
        ta.style.left = '-999999px'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
    } catch {
      // silent
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [])

  const saveAsImage = useCallback(() => {
    const W = 680, H = 460
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const font = (s: string) => `${s} Pretendard, system-ui, -apple-system, sans-serif`

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, W, H)
    ctx.textBaseline = 'top'
    ctx.fillStyle = '#191f28'
    ctx.font = font('bold 30px')
    ctx.fillText(t('title'), 40, 40)

    ctx.fillStyle = '#8b95a1'
    ctx.font = font('17px')
    const meta = `${t(`regions.${region}`)} · ${t(`types.${taxiType}`)} · ${distanceNum}km / ${timeNum}${t('minUnit')} · ${hour}${t('hourUnit')}${outOfCity ? ' · ' + t('outOfCity.short') : ''}`
    ctx.fillText(meta, 40, 86)

    ctx.strokeStyle = '#e5e8eb'
    ctx.beginPath()
    ctx.moveTo(40, 128)
    ctx.lineTo(W - 40, 128)
    ctx.stroke()

    const rows: [string, string][] = [
      [t('result.baseFare'), fare.base.toLocaleString() + won],
      [t('result.distanceFare'), fare.distanceFare.toLocaleString() + won],
      [t('result.timeFare'), fare.timeFare.toLocaleString() + won],
    ]
    if (fare.nightSurcharge > 0) rows.push([`${t('result.nightSurcharge')} (${Math.round(fare.nightRate * 100)}%)`, '+' + fare.nightSurcharge.toLocaleString() + won])
    if (fare.outSurcharge > 0) rows.push([`${t('result.outSurcharge')} (${Math.round(fare.outRate * 100)}%)`, '+' + fare.outSurcharge.toLocaleString() + won])

    let y = 150
    ctx.font = font('18px')
    rows.forEach(([label, val]) => {
      ctx.fillStyle = '#4e5968'
      ctx.textAlign = 'left'
      ctx.fillText(label, 40, y)
      ctx.fillStyle = '#191f28'
      ctx.textAlign = 'right'
      ctx.fillText(val, W - 40, y)
      y += 36
    })

    const boxY = y + 12
    ctx.fillStyle = '#3182f6'
    ctx.beginPath()
    ctx.roundRect(40, boxY, W - 80, 74, 16)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'left'
    ctx.font = font('bold 22px')
    ctx.fillText(t('result.total'), 60, boxY + 24)
    ctx.font = font('bold 34px')
    ctx.textAlign = 'right'
    ctx.fillText(fare.total.toLocaleString() + won, W - 60, boxY + 18)

    ctx.textAlign = 'left'
    ctx.fillStyle = '#8b95a1'
    ctx.font = font('14px')
    ctx.fillText('toolhub.ai.kr · ' + t('imageFooter'), 40, H - 34)

    const link = document.createElement('a')
    link.download = `taxi-fare-${region}-${distanceNum}km.png`
    link.href = canvas.toDataURL('image/png')
    link.click()

    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [fare, region, taxiType, distanceNum, timeNum, hour, outOfCity, t, won])

  const labelCls = 'block text-sm font-medium text-body mb-2'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* 입력 */}
        <div id="taxi-input" className="min-w-0 lg:col-span-1 scroll-mt-20">
          <div className="ui-card p-4 sm:p-6 space-y-6">
            <MobileResultLink href="#taxi-result" label={t('result.total')} value={`${fare.total.toLocaleString()}${won}`} more={t('jumpToResult')} />
            <div>
              <label htmlFor="taxi-region" className={labelCls}>{t('region')}</label>
              <select
                id="taxi-region"
                value={region}
                onChange={(e) => setRegion(e.target.value as RegionKey)}
                className="ui-field min-w-0 min-h-11 px-4 py-3 text-base"
              >
                {REGION_GROUPS.map((g) => (
                  <optgroup key={g.groupKey} label={t(`regionGroups.${g.groupKey}`)}>
                    {g.regions.map((rk) => (
                      <option key={rk} value={rk}>{t(`regions.${rk}`)}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="taxi-distance" className={labelCls}>{t('distance')}</label>
              <div className="flex items-center gap-2 mb-2">
                <input
                  id="taxi-distance"
                  type="number"
                  inputMode="decimal"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  placeholder={t('distancePlaceholder')}
                  step="0.1"
                  min="0"
                  className="ui-field min-w-0 min-h-11 px-4 py-3 text-base"
                />
                <span className="text-sm text-muted whitespace-nowrap">km</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5" role="group" aria-label={t('distance')}>
                {DISTANCE_PRESETS.map((km) => (
                  <button key={km} type="button" onClick={() => setDistance(String(km))} aria-pressed={distanceNum === km} className={`${seg(distanceNum === km)} py-2`}>
                    {km}km
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted mt-2">{t('distanceHint')}</p>
            </div>

            <div>
              <span className={labelCls}>{t('traffic.label')}</span>
              <div className="grid grid-cols-3 gap-1.5" role="group" aria-label={t('traffic.label')}>
                {TRAFFICS.map((tr) => (
                  <button
                    key={tr}
                    type="button"
                    onClick={() => { setTraffic(tr); setTimeAuto(true) }}
                    aria-pressed={timeAuto && traffic === tr}
                    className={`${seg(timeAuto && traffic === tr)} py-2`}
                  >
                    {t(`traffic.${tr}`)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="taxi-time" className={labelCls}>{t('time')}</label>
              <input
                id="taxi-time"
                type="number"
                inputMode="numeric"
                value={displayedTime}
                onChange={(e) => { setTime(e.target.value); setTimeAuto(false) }}
                placeholder={t('timePlaceholder')}
                step="1"
                min="0"
                className="ui-field min-w-0 min-h-11 px-4 py-3 text-base"
              />
              <p className="text-xs text-muted mt-1.5">{timeAuto ? t('traffic.autoHint') : t('traffic.manualHint')}</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-body">
                  {t('boardingTime')} <span className="text-fg font-semibold tabular-nums">{hh(hour)}{t('hourUnit')}</span>
                </span>
                <button type="button" onClick={() => setHour(new Date().getHours())} className="ui-btn-soft min-h-11 text-xs px-3 py-2">
                  {t('nowButton')}
                </button>
              </div>
              <div className="grid grid-cols-4 min-[360px]:grid-cols-6 lg:grid-cols-4 gap-1.5" role="radiogroup" aria-label={t('boardingTime')}>
                {HOURS.map((h) => {
                  const r = nightRateFor(h, schedule)
                  const on = h === hour
                  return (
                    <button
                      key={h}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setHour(h)}
                      title={r > 0 ? `+${Math.round(r * 100)}%` : undefined}
                      className={`min-h-11 rounded-lg py-2 text-sm tabular-nums leading-tight transition-colors ${
                        on ? 'bg-primary text-white' : r > 0 ? 'bg-primary-soft text-primary' : 'bg-soft text-sub hover:bg-subtle'
                      }`}
                    >
                      {h}
                      {r > 0 && <span className={`block text-[10px] ${on ? 'text-white/70' : ''}`}>+{Math.round(r * 100)}</span>}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-muted mt-2">
                {activeNightRate > 0 ? `${t('tier.night')} +${Math.round(activeNightRate * 100)}%` : t('tier.day')} · {t('timeline.hint')}
              </p>
            </div>

            <div>
              <span className={labelCls}>{t('taxiType')}</span>
              <div className="grid grid-cols-3 gap-1.5" role="group" aria-label={t('taxiType')}>
                {TAXI_TYPES.map((type) => (
                  <button key={type} type="button" onClick={() => setTaxiType(type)} aria-pressed={taxiType === type} className={`${seg(taxiType === type)} py-2.5 px-1`}>
                    {t(`typesShort.${type}`)}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex min-h-11 items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={outOfCity}
                onChange={(e) => setOutOfCity(e.target.checked)}
                className="w-4 h-4 mt-0.5 accent-blue-600"
              />
              <span>
                <span className="text-body font-medium">{t('outOfCity.label')}</span>
                <span className="block text-xs text-muted">{t('outOfCity.desc', { rate: Math.round(regionRate.outRate * 100) })}</span>
              </span>
            </label>

            <div className="space-y-2">
              <button type="button" onClick={copyLink} className="ui-btn w-full px-4 py-3">
                {copied ? <><Check className="w-4 h-4" />{t('copyLinkDone')}</> : <><LinkIcon className="w-4 h-4" />{t('copyLink')}</>}
              </button>
              <button type="button" onClick={saveAsImage} className="ui-btn-soft w-full px-4 py-3 inline-flex items-center justify-center gap-2">
                {saved ? <><Check className="w-4 h-4" />{t('saveImageDone')}</> : <><Download className="w-4 h-4" />{t('saveImage')}</>}
              </button>
              <button type="button" onClick={handleReset} className="ui-btn-soft w-full px-4 py-3">
                {t('reset')}
              </button>
            </div>
          </div>
        </div>

        {/* 결과 */}
        <div id="taxi-result" className="min-w-0 lg:col-span-2 space-y-6 scroll-mt-20">
          <a href="#taxi-input" className="ui-btn-soft inline-flex min-h-11 items-center px-4 py-2 lg:hidden">{t('editInputs')}</a>
          <div className="ui-hero p-4 sm:p-6">
            <p className="text-sm text-white/70">{t('result.total')}</p>
            <p className="text-4xl font-bold tabular-nums mt-1 [overflow-wrap:anywhere]" aria-live="polite">
              {fare.total.toLocaleString()}<span className="text-2xl ml-1">{won}</span>
            </p>
            <p className="text-sm text-white/70 mt-2">
              {t(`regions.${region}`)} · {t(`types.${taxiType}`)} · {distanceNum}km · {timeNum}{t('minUnit')} · {hh(hour)}{t('hourUnit')}
              {fare.nightRate > 0 && ` · ${t('result.nightSurcharge')} +${Math.round(fare.nightRate * 100)}%`}
              {fare.outRate > 0 && ` · ${t('outOfCity.short')} +${Math.round(fare.outRate * 100)}%`}
            </p>
            {people > 1 && (
              <p className="text-sm text-white mt-3 font-medium">
                {t('split.perPerson', { n: people })} {split.toLocaleString()}{won}
              </p>
            )}
          </div>

          <div className="ui-card p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-fg mb-3">{t('result.title')}</h2>
            <dl>
              {([
                [t('result.baseFare'), fare.base, false],
                [t('result.distanceFare'), fare.distanceFare, false],
                [t('result.timeFare'), fare.timeFare, false],
                ...(fare.nightSurcharge > 0 ? [[`${t('result.nightSurcharge')} (${Math.round(fare.nightRate * 100)}%)`, fare.nightSurcharge, true]] : []),
                ...(fare.outSurcharge > 0 ? [[`${t('result.outSurcharge')} (${Math.round(fare.outRate * 100)}%)`, fare.outSurcharge, true]] : []),
              ] as [string, number, boolean][]).map(([label, v, plus]) => (
                <div key={label} className="flex flex-wrap justify-between items-center gap-2 py-3 border-b border-line last:border-0">
                  <dt className="text-body">{label}</dt>
                  <dd className={`font-semibold tabular-nums ${plus ? 'text-primary' : 'text-fg'}`}>
                    {plus ? '+' : ''}{v.toLocaleString()} {won}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="text-xs text-muted mt-4">{t('result.note')}</p>
          </div>

          {/* 더치페이 */}
          <div className="ui-card p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-fg mb-3">{t('split.title')}</h2>
            <div className="grid grid-cols-4 gap-1.5 mb-4" role="group" aria-label={t('split.title')}>
              {PEOPLE.map((n) => (
                <button key={n} type="button" onClick={() => setPeople(n)} aria-pressed={people === n} className={`${seg(people === n)} py-2`}>
                  {n}{t('split.personUnit')}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-body">{t('split.perPerson', { n: people })}</span>
              <span className="text-2xl font-bold text-fg tabular-nums">{split.toLocaleString()}{won}</span>
            </div>
            <Link
              href={`/dutch-pay/?mode=equal&total=${fare.total}&people=${people}`}
              className="inline-block text-sm text-primary font-medium mt-3 hover:underline"
            >
              {t('split.dutchPayLink')}
            </Link>
          </div>

          {/* 차종 비교 */}
          <div className="ui-card p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-fg">{t('comparison.title')}</h2>
            <p className="text-sm text-muted mt-1 mb-5">{t('comparison.subtitle')}</p>
            <div className="space-y-4">
              {TAXI_TYPES.map((type) => {
                const f = comparisonFares[type]
                const pct = maxFare > 0 ? Math.round((f / maxFare) * 100) : 0
                const on = taxiType === type
                return (
                  <button key={type} type="button" onClick={() => setTaxiType(type)} aria-pressed={on} className="block min-h-11 w-full text-left">
                    <div className="flex flex-wrap justify-between items-center gap-2 mb-1">
                      <span className={`text-sm font-medium ${on ? 'text-primary' : 'text-body'}`}>{t(`types.${type}`)}</span>
                      <span className={`text-sm font-bold tabular-nums ${on ? 'text-primary' : 'text-fg'}`}>{f.toLocaleString()}{won}</span>
                    </div>
                    <div className="w-full bg-soft rounded-full h-2.5 overflow-hidden">
                      <div className={`h-2.5 rounded-full transition-all duration-500 ${on ? 'bg-primary' : 'bg-line-strong'}`} style={{ width: `${Math.max(pct, 4)}%` }} />
                    </div>
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-muted mt-4">{t('comparison.note')}</p>
          </div>

          {/* 지역별 비교 */}
          <div className="ui-card p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-fg">{t('regionCompare.title')}</h2>
            <p className="text-sm text-muted mt-1 mb-4">{t('regionCompare.subtitle')}</p>
            <div className="overflow-x-auto" role="region" aria-label={t('regionCompare.title')} tabIndex={0}>
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="text-muted text-left">
                  <th className="font-medium py-2 pl-3">{t('regionCompare.region')}</th>
                  <th className="font-medium py-2 text-right">{t('regionCompare.base')}</th>
                  <th className="font-medium py-2 text-right">{t('regionCompare.fare')}</th>
                  <th className="font-medium py-2 pr-3 text-right">{t('regionCompare.diff')}</th>
                </tr>
              </thead>
              <tbody>
                {regionFares.map(({ rk, total }) => {
                  const on = rk === region
                  const d = total - selectedRegular
                  return (
                    <tr
                      key={rk}
                      onClick={() => setRegion(rk)}
                      className={`cursor-pointer border-t border-line tabular-nums ${on ? 'bg-primary-soft text-primary font-semibold' : 'text-body hover:bg-subtle'}`}
                    >
                      <td className="py-2 pl-3">
                        <button type="button" onClick={() => setRegion(rk)} aria-pressed={on} className="min-h-11 text-left">{t(`regions.${rk}`)}</button>
                      </td>
                      <td className="py-2 text-right">{REGION_RATES[rk].base.toLocaleString()}</td>
                      <td className={`py-2 text-right ${on ? '' : 'text-fg font-medium'}`}>{total.toLocaleString()}{won}</td>
                      <td className="py-2 pr-3 text-right">{on || d === 0 ? '-' : `${d > 0 ? '+' : ''}${d.toLocaleString()}`}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          </div>

          {/* 지역 요금 기준 */}
          <div className="bg-subtle rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-fg mb-4">
              {t(`regions.${region}`)} {t('fareInfo.title')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="bg-surface rounded-xl p-4 space-y-1">
                <p className="font-semibold text-fg mb-1">{t('types.regular')}</p>
                <p className="text-body">{t('fareInfo.base')}: {regionRate.base.toLocaleString()}{won} ({(regionRate.baseDist / 1000).toFixed(1)}km)</p>
                <p className="text-body">{t('fareInfo.distance')}: {regionRate.unitDist}{t('fareInfo.perMeter')} {regionRate.unitFare}{won}</p>
                <p className="text-body">{t('fareInfo.time')}: {regionRate.timeUnit}{t('fareInfo.perSec')} {regionRate.timeFare}{won}</p>
                {regionRate.longFrom != null && regionRate.longFare != null && (
                  <p className="text-body">{t('fareInfo.long', { km: regionRate.longFrom / 1000, m: regionRate.unitDist, fare: regionRate.longFare })}</p>
                )}
              </div>
              <div className="bg-surface rounded-xl p-4 space-y-1">
                <p className="font-semibold text-fg mb-1">{t('fareInfo.surchargeTitle')}</p>
                <p className="text-body">
                  {t('fareInfo.night')}: {hh(regionRate.nightStart)}~{hh(regionRate.nightEnd)}{t('hourUnit')} {Math.round(regionRate.nightRate * 100)}%
                  {regionRate.deepStart != null && ` (${hh(regionRate.deepStart)}~${hh(regionRate.deepEnd)}${t('hourUnit')} ${Math.round(regionRate.deepRate * 100)}%)`}
                </p>
                <p className="text-body">{t('fareInfo.outOfCity')}: {Math.round(regionRate.outRate * 100)}%</p>
                <p className="text-body">{t('fareInfo.premium')}: {premiumRate.base.toLocaleString()}{won} ({(premiumRate.baseDist / 1000).toFixed(1)}km)</p>
              </div>
            </div>
            <p className="text-xs text-muted mt-3">{t('fareInfo.sourceNote')}</p>
          </div>
        </div>
      </div>

      <div className="ui-card p-6">
        <h2 className="text-xl font-semibold text-fg mb-6">{t('guide.title')}</h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-fg mb-3">{t('guide.calculation.title')}</h3>
            <ul className="list-disc list-inside space-y-2 text-body">
              {(t.raw('guide.calculation.items') as string[]).map((item, idx) => <li key={idx}>{item}</li>)}
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-fg mb-3">{t('guide.tips.title')}</h3>
            <ul className="list-disc list-inside space-y-2 text-body">
              {(t.raw('guide.tips.items') as string[]).map((item, idx) => <li key={idx}>{item}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
