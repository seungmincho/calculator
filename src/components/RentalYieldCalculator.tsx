'use client'

import { useState, useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/rentalYield'
import { useSearchParams } from '@/hooks/useSearchParams'
import ShareResult from '@/components/ShareResult'
import {
  calcRental, rentForTarget, priceForTarget, sensitivity, SENS_VACANCY,
  type RentalInput, type PropType, type Repay, type HouseCount,
} from '@/utils/rentalYield'

const EOK = 100_000_000
const MAN = 10_000
const TYPES: PropType[] = ['house', 'officetel', 'store']
const REPAYS: Repay[] = ['interest', 'amortize']
const OWNERS: HouseCount[] = ['1', '2', '3', '4']
const TARGETS = [4, 5, 6, 7] as const
const DEF: RentalInput = {
  type: 'officetel', price: 2 * EOK, deposit: 1_000 * MAN, rent: 80 * MAN, mgmt: 0, vacancy: 5, repair: 50 * MAN, holdTax: 0, extra: 0,
  loan: 1 * EOK, rate: 4.5, repay: 'interest', years: 30, owner: '2', adjusted: false, over85: false,
}
const DEF_TARGET = 5
type NumKey = 'price' | 'deposit' | 'rent' | 'mgmt' | 'vacancy' | 'repair' | 'holdTax' | 'extra' | 'loan' | 'rate' | 'years'
/** URL 파라미터 이름과 최댓값 */
const NUM: Record<NumKey, [string, number]> = {
  price: ['p', 1_000 * EOK], deposit: ['d', 1_000 * EOK], rent: ['r', 10 * EOK], mgmt: ['mg', EOK], vacancy: ['v', 100], repair: ['rp', 100 * EOK],
  holdTax: ['ht', 100 * EOK], extra: ['ex', 100 * EOK], loan: ['l', 1_000 * EOK], rate: ['ir', 30], years: ['y', 50],
}
const LINKS = ['rent-converter', 'acquisition-tax', 'brokerage-fee', 'comprehensive-property-tax', 'loan-calculator'] as const

const won = (v: number) => Math.round(v).toLocaleString('ko-KR')
const signed = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${won(Math.abs(v))}`
const pct = (v: number | null) => (v == null ? '—' : `${v.toFixed(2)}%`)
const digits = (s: string) => Number(s.replace(/[^\d]/g, '')) || 0
function eokMan(v: number): string {
  const eok = Math.floor(v / EOK)
  const man = Math.floor((v % EOK) / MAN)
  return [eok > 0 ? `${eok}억` : '', man > 0 ? `${man.toLocaleString('ko-KR')}만` : ''].filter(Boolean).join(' ')
}
const pick = <T extends string>(v: string | null, list: readonly T[], def: T): T => (list.includes(v as T) ? (v as T) : def)

function fromParams(sp: URLSearchParams): RentalInput {
  const out: RentalInput = { ...DEF }
  for (const [k, [p, max]] of Object.entries(NUM) as [NumKey, [string, number]][]) {
    const v = sp.get(p)
    const n = Number(v)
    if (v != null && v !== '' && Number.isFinite(n) && n >= 0) out[k] = Math.min(n, max)
  }
  out.type = pick(sp.get('t'), TYPES, DEF.type)
  out.repay = pick(sp.get('rm'), REPAYS, DEF.repay)
  out.owner = pick(sp.get('o'), OWNERS, DEF.owner)
  out.adjusted = sp.get('adj') === '1'
  out.over85 = sp.get('o85') === '1'
  out.years = Math.max(1, Math.round(out.years))
  return out
}

/** 라디오 의미의 세그먼트 버튼 (방향키로 이동) */
function Segmented<T extends string>({ label, options, value, onChange, render }: {
  label: string; options: readonly T[]; value: T; onChange: (v: T) => void; render: (v: T) => string
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const onKey = (e: KeyboardEvent, i: number) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = (i + step + options.length) % options.length
    onChange(options[next])
    refs.current[next]?.focus()
  }
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-2">
      {options.map((o, i) => {
        const on = o === value
        return (
          <button
            key={o} ref={(el) => { refs.current[i] = el }} type="button" role="radio" aria-checked={on}
            tabIndex={on ? 0 : -1} onClick={() => onChange(o)} onKeyDown={(e) => onKey(e, i)}
            className={`flex-1 min-h-[44px] px-2 py-2 rounded-lg text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}
          >
            {render(o)}
          </button>
        )
      })}
    </div>
  )
}

/** 금액 입력 (콤마 표시 + 억·만 읽기) */
function Money({ id, label, value, onChange, unit, hint }: {
  id: string; label: string; value: number; onChange: (v: number) => void; unit: string; hint?: ReactNode
}) {
  const read = eokMan(value)
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-body mb-2">{label}</label>
      <div className="relative">
        <input
          id={id} type="text" inputMode="numeric" value={value ? won(value) : ''} placeholder="0"
          onChange={(e) => onChange(digits(e.target.value))}
          className="ui-field w-full px-4 py-3 pr-10 tabular-nums" aria-describedby={hint || read ? `${id}-hint` : undefined}
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">{unit}</span>
      </div>
      {(hint || read) && (
        <p id={`${id}-hint`} className="text-xs text-muted mt-1.5">
          {read && <span className="tabular-nums">{read}{unit}</span>}
          {read && hint ? ' · ' : ''}
          {hint}
        </p>
      )}
    </div>
  )
}

/** 비율 입력 (type=number — 소수점 입력은 브라우저가 처리) */
function Rate({ id, label, value, onChange, max, hint }: {
  id: string; label: string; value: number; onChange: (v: number) => void; max: number; hint?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-body mb-2">{label}</label>
      <div className="relative">
        <input
          id={id} type="number" inputMode="decimal" min={0} max={max} step={0.1} value={Number.isFinite(value) ? value : ''}
          onChange={(e) => onChange(Math.min(max, Math.max(0, parseFloat(e.target.value) || 0)))}
          className="ui-field w-full px-4 py-3 pr-10 tabular-nums" aria-describedby={hint ? `${id}-hint` : undefined}
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">%</span>
      </div>
      {hint && <p id={`${id}-hint`} className="text-xs text-muted mt-1.5">{hint}</p>}
    </div>
  )
}

export default function RentalYieldCalculator() {
  const t = useTranslations('rentalYield')
  const sp = useSearchParams()
  const [inp, setInp] = useState<RentalInput>(() => fromParams(sp))
  const [target, setTarget] = useState(() => {
    const n = Number(sp.get('tg'))
    return n > 0 && n <= 30 ? n : DEF_TARGET
  })
  const set = <K extends keyof RentalInput>(k: K) => (v: RentalInput[K]) => setInp((s) => ({ ...s, [k]: v }))

  useEffect(() => {
    const q = new URLSearchParams()
    if (inp.type !== DEF.type) q.set('t', inp.type)
    for (const [k, [p]] of Object.entries(NUM) as [NumKey, [string, number]][]) if (inp[k] !== DEF[k]) q.set(p, String(inp[k]))
    if (inp.repay !== DEF.repay) q.set('rm', inp.repay)
    if (inp.type === 'house') {
      if (inp.owner !== DEF.owner) q.set('o', inp.owner)
      if (inp.adjusted) q.set('adj', '1')
      if (inp.over85) q.set('o85', '1')
    }
    if (target !== DEF_TARGET) q.set('tg', String(target))
    const s = q.toString()
    window.history.replaceState(null, '', s ? `?${s}` : window.location.pathname)
  }, [inp, target])

  const r = calcRental(inp)
  const sens = sensitivity(inp)
  const needRent = rentForTarget(inp, target, r.acq)
  const maxPrice = priceForTarget(inp, target)
  const W = t('won')
  const typeLabel = t(`type.${inp.type}`)
  const house = inp.type === 'house'

  const tiles = [
    { key: 'surface', value: pct(r.surface), hint: t('tile.surfaceHint') },
    { key: 'net', value: pct(r.net), hint: t('tile.netHint') },
    { key: 'leveraged', value: pct(r.leveraged), hint: r.cash > 0 ? t('tile.leveragedHint', { cash: won(r.cash) }) : t('tile.leveragedNone') },
    { key: 'cf', value: `${signed(r.monthlyCF)}${W}`, hint: t(inp.repay === 'amortize' && inp.loan > 0 ? 'tile.cfHintAmortize' : 'tile.cfHint') },
  ] as const

  const breakdown: [string, string, boolean?][] = [
    [t('bd.price'), `${won(inp.price)}${W}`],
    [t('bd.tax', { rate: (r.acq.taxRate * 100).toFixed(2).replace(/\.?0+$/, '') }), `+${won(r.acq.tax)}${W}`],
    [t('bd.broker'), `+${won(r.acq.broker)}${W}`],
    [t('bd.misc'), `+${won(r.acq.misc)}${W}`],
    ...(r.acq.extra > 0 ? [[t('bd.extra'), `+${won(r.acq.extra)}${W}`] as [string, string]] : []),
    [t('bd.deposit'), `−${won(inp.deposit)}${W}`],
    [t('bd.base'), `${won(r.base)}${W}`, true],
    [t('bd.loan'), `−${won(inp.loan)}${W}`],
    [t('bd.cash'), `${won(r.cash)}${W}`, true],
  ]
  const yearly: [string, string, boolean?][] = [
    [t('bd.grossRent'), `${won(r.grossRent)}${W}`],
    [t('bd.vacancyLoss', { v: inp.vacancy }), `−${won(r.vacancyLoss)}${W}`],
    [t('bd.opCost'), `−${won(r.opCost)}${W}`],
    [t('bd.noi'), `${won(r.noi)}${W}`, true],
    [t('bd.interest'), `−${won(r.interest)}${W}`],
    [t('bd.profit'), `${won(r.profit)}${W}`, true],
  ]

  const headline = t('share.headline', { net: pct(r.net), cf: signed(r.monthlyCF) })
  const card = {
    tool: t('title'),
    label: t('share.label', { type: typeLabel, price: eokMan(inp.price) || '0' }),
    headline,
    sub: t('share.sub', { deposit: eokMan(inp.deposit) || '0', rent: won(inp.rent) }),
    rows: [
      { label: t('tile.surface'), value: pct(r.surface) },
      { label: t('tile.leveraged'), value: pct(r.leveraged) },
      { label: t('bd.cash'), value: `${won(r.cash)}${W}` },
      { label: t('result.breakEven'), value: r.breakEvenRent == null ? '—' : `${won(r.breakEvenRent)}${W}` },
    ],
  }
  const shareText = t('share.text', { type: typeLabel, price: eokMan(inp.price) || '0', headline })

  const sources = t.raw('guide.sources.items') as { label: string; url: string }[]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <div className="lg:col-span-1 space-y-6">
          <div className="ui-card p-6 space-y-5">
            <div>
              <p className="text-sm font-medium text-body mb-2">{t('in.type')}</p>
              <Segmented label={t('in.type')} options={TYPES} value={inp.type} onChange={set('type')} render={(v) => t(`type.${v}`)} />
              <p className="text-xs text-muted mt-1.5">{t(`in.typeHint.${inp.type}`)}</p>
            </div>
            <Money id="ry-price" label={t('in.price')} value={inp.price} onChange={set('price')} unit={W} />
            <Money id="ry-deposit" label={t('in.deposit')} value={inp.deposit} onChange={set('deposit')} unit={W} />
            <Money id="ry-rent" label={t('in.rent')} value={inp.rent} onChange={set('rent')} unit={W} hint={inp.type === 'store' ? t('in.rentHintStore') : undefined} />

            {house && (
              <div className="bg-subtle rounded-2xl p-4 space-y-3">
                <div>
                  <label htmlFor="ry-owner" className="block text-sm font-medium text-body mb-2">{t('in.owner')}</label>
                  <select id="ry-owner" value={inp.owner} onChange={(e) => set('owner')(e.target.value as HouseCount)} className="ui-field w-full px-4 py-3 min-h-[44px]">
                    {OWNERS.map((o) => <option key={o} value={o}>{t(`in.ownerOpt.${o}`)}</option>)}
                  </select>
                </div>
                <label className="flex items-start gap-3 min-h-[44px] cursor-pointer">
                  <input type="checkbox" checked={inp.adjusted} onChange={(e) => set('adjusted')(e.target.checked)} className="w-5 h-5 mt-0.5 accent-primary shrink-0" />
                  <span className="text-sm text-body">{t('in.adjusted')}</span>
                </label>
                <label className="flex items-start gap-3 min-h-[44px] cursor-pointer">
                  <input type="checkbox" checked={inp.over85} onChange={(e) => set('over85')(e.target.checked)} className="w-5 h-5 mt-0.5 accent-primary shrink-0" />
                  <span className="text-sm text-body">{t('in.over85')}</span>
                </label>
                {r.acq.heavy && <p className="text-xs bg-amber-50 text-amber-800 rounded-lg p-2">{t('in.heavy', { rate: (r.acq.taxRate * 100).toFixed(0) })}</p>}
              </div>
            )}
          </div>

          <div className="ui-card p-6 space-y-5">
            <h2 className="text-base font-semibold text-fg">{t('in.loanTitle')}</h2>
            <Money id="ry-loan" label={t('in.loan')} value={inp.loan} onChange={set('loan')} unit={W} />
            <Rate id="ry-rate" label={t('in.rate')} value={inp.rate} onChange={set('rate')} max={30} />
            <div>
              <p className="text-sm font-medium text-body mb-2">{t('in.repay')}</p>
              <Segmented label={t('in.repay')} options={REPAYS} value={inp.repay} onChange={set('repay')} render={(v) => t(`in.repayOpt.${v}`)} />
            </div>
            {inp.repay === 'amortize' && (
              <div>
                <label htmlFor="ry-years" className="block text-sm font-medium text-body mb-2">{t('in.years')}</label>
                <select id="ry-years" value={inp.years} onChange={(e) => set('years')(Number(e.target.value))} className="ui-field w-full px-4 py-3 min-h-[44px]">
                  {[5, 10, 15, 20, 25, 30, 35, 40].map((y) => <option key={y} value={y}>{t('in.yearsOpt', { y })}</option>)}
                  {![5, 10, 15, 20, 25, 30, 35, 40].includes(inp.years) && <option value={inp.years}>{t('in.yearsOpt', { y: inp.years })}</option>}
                </select>
              </div>
            )}
          </div>

          <div className="ui-card p-6 space-y-5">
            <h2 className="text-base font-semibold text-fg">{t('in.costTitle')}</h2>
            <Rate id="ry-vacancy" label={t('in.vacancy')} value={inp.vacancy} onChange={set('vacancy')} max={100} hint={t('in.vacancyHint')} />
            <Money id="ry-mgmt" label={t('in.mgmt')} value={inp.mgmt} onChange={set('mgmt')} unit={W} hint={t('in.mgmtHint')} />
            <Money id="ry-repair" label={t('in.repair')} value={inp.repair} onChange={set('repair')} unit={W} hint={t('in.repairHint')} />
            <Money
              id="ry-holdtax" label={t('in.holdTax')} value={inp.holdTax} onChange={set('holdTax')} unit={W}
              hint={<>{t('in.holdTaxHint')} <Link href="/comprehensive-property-tax/" className="text-primary hover:underline">{t('in.holdTaxLink')}</Link></>}
            />
            <Money id="ry-extra" label={t('in.extra')} value={inp.extra} onChange={set('extra')} unit={W} hint={t('in.extraHint')} />
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="ui-card p-6 space-y-5">
            <div aria-live="polite">
              <p className="text-sm text-muted">{t('result.label', { type: typeLabel })}</p>
              <p className="text-3xl font-bold text-fg tabular-nums mt-1">{pct(r.net)}</p>
              <p className="text-sm text-sub mt-1">
                {t('result.cfLine')} <span className={`font-semibold tabular-nums ${r.monthlyCF < 0 ? 'text-red-600' : 'text-fg'}`}>{signed(r.monthlyCF)}{W}</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {tiles.map((x) => {
                const hi = x.key === 'net'
                return (
                  <div key={x.key} className={`rounded-2xl p-4 ${hi ? 'bg-primary-soft' : 'bg-subtle'}`}>
                    <p className={`text-sm ${hi ? 'text-primary font-medium' : 'text-muted'}`}>{t(`tile.${x.key}`)}</p>
                    <p className="text-lg sm:text-xl font-bold text-fg tabular-nums mt-1">{x.value}</p>
                    <p className="text-xs text-muted mt-0.5">{x.hint}</p>
                  </div>
                )
              })}
            </div>

            <div className="bg-subtle rounded-2xl p-4 text-sm text-sub space-y-1">
              {r.breakEvenRent == null ? (
                <p>{t('result.breakEvenNone')}</p>
              ) : (
                <p>
                  {t('result.breakEven')} <span className="font-semibold text-fg tabular-nums">{won(r.breakEvenRent)}{W}</span>
                  {inp.rent > 0 && <> · {t('result.breakEvenRatio', { p: Math.round((r.breakEvenRent / inp.rent) * 100) })}</>}
                </p>
              )}
              <p className="text-xs text-muted">{t('result.breakEvenHint')}</p>
            </div>

            <details className="group">
              <summary className="cursor-pointer min-h-[44px] flex items-center text-sm font-medium text-primary">{t('bd.toggle')}</summary>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-2">
                {([['bd.costTitle', breakdown], ['bd.yearTitle', yearly]] as const).map(([title, list]) => (
                  <div key={title}>
                    <h3 className="text-sm font-semibold text-fg mb-2">{t(title)}</h3>
                    <dl className="text-sm divide-y divide-line">
                      {list.map(([k, v, strong]) => (
                        <div key={k} className="flex justify-between gap-3 py-2">
                          <dt className={strong ? 'font-medium text-body' : 'text-sub'}>{k}</dt>
                          <dd className={`tabular-nums text-right ${strong ? 'font-semibold text-fg' : 'text-body'}`}>{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted mt-3">{t('bd.note')}</p>
            </details>

            <ShareResult card={card} text={shareText} fileName="rental-yield" />
          </div>

          {/* 목표 수익률 역산 */}
          <div className="ui-card p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-fg">{t('target.title')}</h2>
              <p className="text-sm text-muted mt-1">{t('target.desc')}</p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              {TARGETS.map((n) => (
                <button
                  key={n} type="button" onClick={() => setTarget(n)} aria-pressed={target === n}
                  className={`min-h-[44px] px-4 py-2 rounded-lg text-sm font-medium transition-colors ${target === n ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}
                >
                  {n}%
                </button>
              ))}
              <div className="w-28">
                <Rate id="ry-target" label={t('target.input')} value={target} onChange={setTarget} max={30} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" aria-live="polite">
              <div className="bg-subtle rounded-2xl p-4">
                <p className="text-sm text-muted">{t('target.rent', { target })}</p>
                <p className="text-xl font-bold text-fg tabular-nums mt-1">{needRent == null ? '—' : `${won(needRent)}${W}`}</p>
                <p className="text-xs text-muted mt-0.5">{needRent == null ? t('target.none') : t('target.rentHint', { diff: signed(needRent - inp.rent) })}</p>
              </div>
              <div className="bg-subtle rounded-2xl p-4">
                <p className="text-sm text-muted">{t('target.price', { target })}</p>
                <p className="text-xl font-bold text-fg tabular-nums mt-1">{maxPrice == null ? '—' : `${won(maxPrice)}${W}`}</p>
                <p className="text-xs text-muted mt-0.5">{maxPrice == null ? t('target.none') : t('target.priceHint', { read: eokMan(maxPrice) || '0', diff: signed(maxPrice - inp.price) })}</p>
              </div>
            </div>
          </div>

          {/* 민감도 */}
          <div className="ui-card p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-fg">{t('sens.title')}</h2>
              <p className="text-sm text-muted mt-1">{t(inp.loan > 0 ? 'sens.desc' : 'sens.descNoLoan')}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm tabular-nums">
                <caption className="sr-only">{t('sens.caption')}</caption>
                <thead>
                  <tr className="border-b border-line text-muted">
                    <th scope="col" className="text-left font-medium py-2 pr-2">{t('sens.colRate')}</th>
                    {SENS_VACANCY.map((v) => <th key={v} scope="col" className="text-right font-medium py-2 px-2">{t('sens.colVacancy', { v })}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {sens.map((row) => (
                    <tr key={row.d} className="border-b border-line">
                      <th scope="row" className={`text-left font-medium py-3 pr-2 ${row.d === 0 ? 'text-primary' : 'text-body'}`}>
                        {t(row.d === 0 ? 'sens.rowNow' : 'sens.row', { rate: +row.rate.toFixed(2), d: row.d > 0 ? `+${row.d}` : row.d })}
                      </th>
                      {row.cells.map((c) => (
                        <td key={c.vacancy} className={`text-right py-3 px-2 ${row.d === 0 && c.vacancy === inp.vacancy ? 'bg-primary-soft' : ''}`}>
                          <span className={`block font-semibold ${c.monthlyCF < 0 ? 'text-red-600' : 'text-fg'}`}>{signed(c.monthlyCF)}</span>
                          <span className="block text-xs text-muted">{pct(c.leveraged)}</span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted">{t('sens.note')}</p>
          </div>

          <p className="text-xs text-faint">{t('disclaimer')}</p>
        </div>
      </div>

      {/* 가이드 */}
      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(['formula', 'costs', 'tax', 'check'] as const).map((sec) => (
            <div key={sec}>
              <h3 className="font-semibold text-fg mb-3">{t(`guide.${sec}.title`)}</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-sub">
                {(t.raw(`guide.${sec}.items`) as string[]).map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>

        <div className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-2">
          <p className="font-medium text-body">{t('guide.sources.title')}</p>
          <ul className="space-y-1">
            {sources.map((s) => (
              <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{s.label}</a></li>
            ))}
          </ul>
          <p className="text-xs text-muted">{t('guide.sources.asOf')}</p>
        </div>

        <div>
          <h3 className="font-semibold text-fg mb-3">{t('guide.links.title')}</h3>
          <div className="flex flex-wrap gap-2">
            {LINKS.map((href) => (
              <Link key={href} href={`/${href}/`} className="ui-btn-soft min-h-[44px] inline-flex items-center px-3 py-2 text-sm">{t(`guide.links.${href}`)}</Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
