'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import { useSearchParams } from '@/hooks/useSearchParams'
import { Link as LinkIcon, Check, Download } from 'lucide-react'
import {
  REGION_RATES, PREMIUM, REGION_GROUPS, REGION_KEYS, TAXI_TYPES,
  getSchedule, nightRateFor, computeFare, estimateMinutes, perPerson,
  type RegionKey, type TaxiType, type Traffic,
} from '@/utils/taxiFare'

const DISTANCE_PRESETS = [3, 5, 10, 20, 30]
const TRAFFICS: Traffic[] = ['smooth', 'normal', 'heavy']
const PEOPLE = [1, 2, 3, 4]
const HOURS = Array.from({ length: 24 }, (_, i) => i)

const seg = (on: boolean) =>
  `rounded-xl text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`

export default function TaxiFare() {
  const t = useTranslations('taxiFare')
  const searchParams = useSearchParams()

  const [distance, setDistance] = useState<string>(() => searchParams.get('distance') ?? '5')
  const [time, setTime] = useState<string>(() => searchParams.get('time') ?? '15')
  const [timeAuto, setTimeAuto] = useState<boolean>(() => !searchParams.get('time'))
  const [traffic, setTraffic] = useState<Traffic>(() => {
    const p = searchParams.get('traffic') as Traffic
    return TRAFFICS.includes(p) ? p : 'normal'
  })
  const [region, setRegion] = useState<RegionKey>(() => {
    const p = searchParams.get('region') as RegionKey
    return REGION_KEYS.includes(p) ? p : 'seoul'
  })
  const [taxiType, setTaxiType] = useState<TaxiType>(() => {
    const p = searchParams.get('type') as TaxiType
    return TAXI_TYPES.includes(p) ? p : 'regular'
  })
  const [hour, setHour] = useState<number>(() => {
    const h = parseInt(searchParams.get('hour') ?? '', 10)
    return Number.isFinite(h) && h >= 0 && h <= 23 ? h : 14
  })
  const [outOfCity, setOutOfCity] = useState<boolean>(() => searchParams.get('out') === '1')
  const [people, setPeople] = useState<number>(() => {
    const n = parseInt(searchParams.get('n') ?? '', 10)
    return PEOPLE.includes(n) ? n : 1
  })
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)

  const distanceNum = Math.max(0, parseFloat(distance) || 0)

  // 소요 시간 자동 추정: 사용자가 직접 입력하기 전까지 거리·교통 상황을 따라감
  useEffect(() => {
    if (timeAuto) setTime(String(estimateMinutes(distanceNum, traffic)))
  }, [timeAuto, distanceNum, traffic])

  // URL 동기화 (공유 링크)
  useEffect(() => {
    const params = new URLSearchParams({
      distance, region, type: taxiType, hour: String(hour), out: outOfCity ? '1' : '0', traffic,
    })
    if (!timeAuto) params.set('time', time)
    if (people > 1) params.set('n', String(people))
    window.history.replaceState(window.history.state, '', `${window.location.pathname}?${params}`)
  }, [distance, time, timeAuto, traffic, region, taxiType, hour, outOfCity, people])

  const timeNum = Math.max(0, parseFloat(time) || 0)

  const schedule = useMemo(() => getSchedule(region, taxiType), [region, taxiType])
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

      <div className="grid lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <div className="lg:col-span-1">
          <div className="ui-card p-6 space-y-6">
            <div>
              <label htmlFor="taxi-region" className={labelCls}>{t('region')}</label>
              <select
                id="taxi-region"
                value={region}
                onChange={(e) => setRegion(e.target.value as RegionKey)}
                className="ui-field px-4 py-3"
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
                  className="ui-field px-4 py-3"
                />
                <span className="text-sm text-muted whitespace-nowrap">km</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {DISTANCE_PRESETS.map((km) => (
                  <button key={km} type="button" onClick={() => setDistance(String(km))} className={`${seg(distanceNum === km)} py-2`}>
                    {km}km
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className={labelCls}>{t('traffic.label')}</span>
              <div className="grid grid-cols-3 gap-1.5">
                {TRAFFICS.map((tr) => (
                  <button
                    key={tr}
                    type="button"
                    onClick={() => { setTraffic(tr); setTimeAuto(true) }}
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
                value={time}
                onChange={(e) => { setTime(e.target.value); setTimeAuto(false) }}
                placeholder={t('timePlaceholder')}
                step="1"
                min="0"
                className="ui-field px-4 py-3"
              />
              <p className="text-xs text-muted mt-1.5">{timeAuto ? t('traffic.autoHint') : t('traffic.manualHint')}</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-body">
                  {t('boardingTime')} <span className="text-fg font-semibold tabular-nums">{hh(hour)}{t('hourUnit')}</span>
                </span>
                <button type="button" onClick={() => setHour(new Date().getHours())} className="ui-btn-soft text-xs px-2.5 py-1">
                  {t('nowButton')}
                </button>
              </div>
              <div className="grid grid-cols-8 gap-1" role="radiogroup" aria-label={t('boardingTime')}>
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
                      className={`rounded-lg py-1.5 text-xs tabular-nums leading-tight transition-colors ${
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
              <div className="grid grid-cols-3 gap-1.5">
                {TAXI_TYPES.map((type) => (
                  <button key={type} type="button" onClick={() => setTaxiType(type)} className={`${seg(taxiType === type)} py-2.5 px-1`}>
                    {t(`typesShort.${type}`)}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
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
        <div className="lg:col-span-2 space-y-6">
          <div className="ui-hero p-6">
            <p className="text-sm text-white/70">{t('result.total')}</p>
            <p className="text-4xl font-bold tabular-nums mt-1" aria-live="polite">
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

          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg mb-3">{t('result.title')}</h2>
            <dl>
              {([
                [t('result.baseFare'), fare.base, false],
                [t('result.distanceFare'), fare.distanceFare, false],
                [t('result.timeFare'), fare.timeFare, false],
                ...(fare.nightSurcharge > 0 ? [[`${t('result.nightSurcharge')} (${Math.round(fare.nightRate * 100)}%)`, fare.nightSurcharge, true]] : []),
                ...(fare.outSurcharge > 0 ? [[`${t('result.outSurcharge')} (${Math.round(fare.outRate * 100)}%)`, fare.outSurcharge, true]] : []),
              ] as [string, number, boolean][]).map(([label, v, plus]) => (
                <div key={label} className="flex justify-between items-center py-3 border-b border-line last:border-0">
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
          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg mb-3">{t('split.title')}</h2>
            <div className="grid grid-cols-4 gap-1.5 mb-4">
              {PEOPLE.map((n) => (
                <button key={n} type="button" onClick={() => setPeople(n)} className={`${seg(people === n)} py-2`}>
                  {n}{t('split.personUnit')}
                </button>
              ))}
            </div>
            <div className="flex items-baseline justify-between">
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
          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg">{t('comparison.title')}</h2>
            <p className="text-sm text-muted mt-1 mb-5">{t('comparison.subtitle')}</p>
            <div className="space-y-4">
              {TAXI_TYPES.map((type) => {
                const f = comparisonFares[type]
                const pct = maxFare > 0 ? Math.round((f / maxFare) * 100) : 0
                const on = taxiType === type
                return (
                  <button key={type} type="button" onClick={() => setTaxiType(type)} className="block w-full text-left">
                    <div className="flex justify-between items-center mb-1">
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
          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg">{t('regionCompare.title')}</h2>
            <p className="text-sm text-muted mt-1 mb-4">{t('regionCompare.subtitle')}</p>
            <table className="w-full text-sm">
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
                        <button type="button" onClick={() => setRegion(rk)} className="text-left">{t(`regions.${rk}`)}</button>
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
              </div>
              <div className="bg-surface rounded-xl p-4 space-y-1">
                <p className="font-semibold text-fg mb-1">{t('fareInfo.surchargeTitle')}</p>
                <p className="text-body">
                  {t('fareInfo.night')}: {hh(regionRate.nightStart)}~{hh(regionRate.nightEnd)}{t('hourUnit')} {Math.round(regionRate.nightRate * 100)}%
                  {regionRate.deepStart != null && ` (${hh(regionRate.deepStart)}~${hh(regionRate.deepEnd)}${t('hourUnit')} ${Math.round(regionRate.deepRate * 100)}%)`}
                </p>
                <p className="text-body">{t('fareInfo.outOfCity')}: {Math.round(regionRate.outRate * 100)}%</p>
                <p className="text-body">{t('fareInfo.premium')}: {PREMIUM.base.toLocaleString()}{won} ({(PREMIUM.baseDist / 1000).toFixed(1)}km)</p>
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
