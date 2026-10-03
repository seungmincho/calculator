'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { runningTranslations } from '@/lib/i18n/runningPace'
import { calculateRunning, formatClock, formatDistance, parseClock, parseDistance, parsePace, type RunningMode } from '@/utils/runningPace'

const DISTANCES = [5, 10, 21.0975, 42.195] as const

export default function RunningPaceCalculator() {
  const { language } = useLanguage()
  const t = runningTranslations[language]('runningPace')
  const [preset, setPreset] = useState<number | 'custom'>(10)
  const [customDistance, setCustomDistance] = useState('')
  const [mode, setMode] = useState<RunningMode>('time')
  const [hours, setHours] = useState('0')
  const [minutes, setMinutes] = useState('50')
  const [seconds, setSeconds] = useState('0')
  const [paceMinutes, setPaceMinutes] = useState('5')
  const [paceSeconds, setPaceSeconds] = useState('0')
  const [splitKm, setSplitKm] = useState<1 | 5>(5)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')

  const distance = parseDistance(preset === 'custom' ? customDistance : String(preset))
  const value = mode === 'time' ? parseClock(hours, minutes, seconds) : parsePace(paceMinutes, paceSeconds)
  const result = useMemo(() => distance !== null && value !== null
    ? calculateRunning(distance, mode, value, splitKm) : null, [distance, mode, value, splitKm])

  const selectMode = (next: RunningMode) => {
    if (next === mode) return
    if (result) {
      const roundedPace = Math.round(result.secondsPerKm)
      if (next === 'pace') {
        setPaceMinutes(String(Math.floor(roundedPace / 60)))
        setPaceSeconds(String(roundedPace % 60))
      } else {
        const total = Math.round(result.finishSeconds)
        setHours(String(Math.floor(total / 3600)))
        setMinutes(String(Math.floor((total % 3600) / 60)))
        setSeconds(String(total % 60))
      }
    }
    setMode(next)
  }

  const copy = async () => {
    if (!result) return
    const lines = [
      `${t('title')} — ${formatDistance(result.distanceKm)}`,
      `${t('result.finish')}: ${formatClock(result.finishSeconds, true)}`,
      `${t('result.pace')}: ${formatClock(result.secondsPerKm)}/km`,
      `${t('result.speed')}: ${result.speedKmh.toFixed(2)} km/h`,
      `${t('splits.distance')}\t${t('splits.elapsed')}`,
      ...result.splits.map(row => `${formatDistance(row.distanceKm)}\t${formatClock(row.elapsedSeconds, true)}`),
    ]
    try {
      await navigator.clipboard.writeText(lines.join('\n'))
      setCopyState('copied')
    } catch {
      setCopyState('failed')
    }
  }

  const timeField = (id: string, label: string, value: string, setter: (next: string) => void, invalid: boolean) => (
    <label htmlFor={id} className="block min-w-0 text-sm font-medium text-body">
      {label}
      <input id={id} type="text" inputMode="numeric" value={value} onChange={event => setter(event.target.value)}
        aria-invalid={invalid} className="ui-field mt-1.5 px-3 py-2.5 tabular-nums" />
    </label>
  )

  return (
    <div className="space-y-8">
      <header className="print:hidden">
        <h1 className="text-2xl sm:text-3xl font-bold text-fg">{t('title')}</h1>
        <p className="mt-2 text-sm sm:text-base text-muted">{t('description')}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] print:block">
        <section aria-labelledby="running-input-title" className="ui-card p-5 sm:p-6 space-y-5 print:hidden">
          <h2 id="running-input-title" className="text-lg font-semibold text-fg">{t('input.title')}</h2>
          <div>
            <p className="mb-2 text-sm font-medium text-body">{t('input.distance')}</p>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {DISTANCES.map((km, index) => (
                <button key={km} type="button" aria-pressed={preset === km} onClick={() => setPreset(km)}
                  className={`rounded-lg px-2 py-2.5 text-sm font-medium ${preset === km ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}>
                  {t(`distance.${index}`)}
                </button>
              ))}
              <button type="button" aria-pressed={preset === 'custom'} onClick={() => setPreset('custom')}
                className={`rounded-lg px-2 py-2.5 text-sm font-medium ${preset === 'custom' ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}>
                {t('distance.custom')}
              </button>
            </div>
            {preset === 'custom' && (
              <label htmlFor="running-distance" className="mt-3 block text-sm font-medium text-body">
                {t('input.customDistance')}
                <input id="running-distance" type="text" inputMode="decimal" value={customDistance}
                  onChange={event => setCustomDistance(event.target.value)} aria-invalid={distance === null}
                  aria-describedby={distance === null ? 'running-distance-error' : undefined}
                  placeholder="12.5" className="ui-field mt-1.5 px-3 py-2.5 tabular-nums" />
              </label>
            )}
            {preset === 'custom' && distance === null && <p id="running-distance-error" role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">{t('error.distance')}</p>}
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-body">{t('input.mode')}</p>
            <div className="grid grid-cols-2 gap-2">
              {(['time', 'pace'] as const).map(option => (
                <button key={option} type="button" aria-pressed={mode === option} onClick={() => selectMode(option)}
                  className={`rounded-lg px-3 py-2.5 text-sm font-medium ${mode === option ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}>
                  {t(`mode.${option}`)}
                </button>
              ))}
            </div>
          </div>

          {mode === 'time' ? (
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-body">{t('input.goalTime')}</legend>
              <div className="grid grid-cols-3 gap-2">
                {timeField('running-hours', t('unit.hours'), hours, setHours, value === null)}
                {timeField('running-minutes', t('unit.minutes'), minutes, setMinutes, value === null)}
                {timeField('running-seconds', t('unit.seconds'), seconds, setSeconds, value === null)}
              </div>
            </fieldset>
          ) : (
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-body">{t('input.targetPace')}</legend>
              <div className="grid grid-cols-2 gap-2">
                {timeField('running-pace-minutes', t('unit.minutes'), paceMinutes, setPaceMinutes, value === null)}
                {timeField('running-pace-seconds', t('unit.seconds'), paceSeconds, setPaceSeconds, value === null)}
              </div>
            </fieldset>
          )}
          {value === null && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{mode === 'time' ? t('error.time') : t('error.pace')}</p>}

          <div>
            <p className="mb-2 text-sm font-medium text-body">{t('input.splitInterval')}</p>
            <div className="grid grid-cols-2 gap-2">
              {([1, 5] as const).map(km => (
                <button key={km} type="button" aria-pressed={splitKm === km} onClick={() => setSplitKm(km)}
                  className={`rounded-lg px-3 py-2.5 text-sm font-medium ${splitKm === km ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}>
                  {km} km
                </button>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="running-result-title" className="ui-card p-5 sm:p-6 print:border-0 print:shadow-none print:p-0">
          <div className="flex items-center justify-between gap-3">
            <h2 id="running-result-title" className="text-lg font-semibold text-fg">{t('result.title')}</h2>
            <div className="flex gap-2 print:hidden">
              <button type="button" disabled={!result} onClick={copy} className="rounded-lg bg-soft px-3 py-2 text-sm text-body hover:bg-subtle disabled:opacity-50">{t('action.copy')}</button>
              <button type="button" disabled={!result} onClick={() => window.print()} className="rounded-lg bg-soft px-3 py-2 text-sm text-body hover:bg-subtle disabled:opacity-50">{t('action.print')}</button>
            </div>
          </div>
          {copyState !== 'idle' && <p role="status" className="mt-2 text-sm text-muted print:hidden">{t(`action.${copyState}`)}</p>}
          {result ? (
            <div className="mt-5 space-y-5" aria-live="polite">
              <p className="text-sm text-muted">{formatDistance(result.distanceKm)}</p>
              <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl bg-soft p-4"><dt className="text-sm text-muted">{t('result.finish')}</dt><dd className="mt-1 text-xl font-bold tabular-nums text-fg">{formatClock(result.finishSeconds, true)}</dd></div>
                <div className="rounded-xl bg-soft p-4"><dt className="text-sm text-muted">{t('result.pace')}</dt><dd className="mt-1 text-xl font-bold tabular-nums text-fg">{formatClock(result.secondsPerKm)}<span className="ml-1 text-sm font-normal">/km</span></dd></div>
                <div className="rounded-xl bg-soft p-4"><dt className="text-sm text-muted">{t('result.speed')}</dt><dd className="mt-1 text-xl font-bold tabular-nums text-fg">{result.speedKmh.toFixed(2)}<span className="ml-1 text-sm font-normal">km/h</span></dd></div>
              </dl>
              <div>
                <h3 className="mb-2 font-semibold text-fg">{t('splits.title', { interval: splitKm })}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left tabular-nums">
                    <caption className="sr-only">{t('splits.title', { interval: splitKm })}</caption>
                    <thead><tr className="border-b border-line text-muted"><th scope="col" className="py-2 pr-4">{t('splits.distance')}</th><th scope="col" className="py-2">{t('splits.elapsed')}</th></tr></thead>
                    <tbody>{result.splits.map((row, index) => (
                      <tr key={row.distanceKm} className={`border-b border-line last:border-0 ${index === result.splits.length - 1 ? 'font-semibold text-fg' : 'text-body'}`}>
                        <th scope="row" className="py-2 pr-4 font-inherit">{formatDistance(row.distanceKm)}{index === result.splits.length - 1 ? ` · ${t('splits.finish')}` : ''}</th>
                        <td className="py-2">{formatClock(row.elapsedSeconds, true)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : <p className="mt-5 text-sm text-muted" role="status">{t('result.invalid')}</p>}
        </section>
      </div>

      <section className="ui-card p-5 sm:p-6 space-y-3 print:break-before-page">
        <h2 className="text-lg font-semibold text-fg">{t('guide.title')}</h2>
        <p className="text-sm text-body">{t('guide.formula')}</p>
        <p className="text-sm text-body">{t('guide.splits')}</p>
        <p className="text-sm text-muted">{t('guide.note')}</p>
        <Link href="/exercise-calorie/" prefetch={false} className="inline-block text-sm font-medium text-primary hover:underline print:hidden">{t('guide.exerciseLink')}</Link>
      </section>
    </div>
  )
}
