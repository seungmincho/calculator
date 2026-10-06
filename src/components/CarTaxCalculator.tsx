'use client'

import { useState, useEffect, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { Save, Check } from 'lucide-react'
import CalculationHistory from './CalculationHistory'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import GuideSection from '@/components/GuideSection'
import { useCalculationHistory } from '@/hooks/useCalculationHistory'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/carTax'
import {
  carAcqTax, bondExempt, reliefAtStake, RELIEF_END,
  type CarType, type Usage, type VanSeats, type MotorcycleSize, type CarAcqInput,
} from '@/utils/carAcquisitionTax'
import { todayKST, daysBetween, ddayLabel } from '@/utils/dday'

type FuelType = 'gasoline' | 'diesel' | 'lpg' | 'hybrid' | 'electric'
type Region = 'seoul' | 'busan' | 'incheon' | 'gyeonggi' | 'other'
const CAR_TYPES: readonly CarType[] = ['passenger', 'compact', 'van', 'truck', 'motorcycle']
const FUELS: readonly FuelType[] = ['gasoline', 'diesel', 'lpg', 'hybrid', 'electric']
const REGIONS: readonly Region[] = ['seoul', 'busan', 'incheon', 'gyeonggi', 'other']
const MAX_PRICE = 10_000_000_000

interface Form {
  carPrice: number
  carType: CarType
  fuelType: FuelType
  displacement: string
  isNew: boolean
  region: Region
  usage: Usage
  vanSeats: VanSeats
  motorcycleSize: MotorcycleSize
  isMultiChild: boolean
  childCount: number
  isDisabled: boolean
  isVeteran: boolean
}
// 첫 화면 기본값 = 예시 '중형 2.0 가솔린'. URL에는 기본값과 다른 항목만 (이름은 예전 공유 링크와 같음)
const DEF: Form = {
  carPrice: 32_000_000, carType: 'passenger', fuelType: 'gasoline', displacement: '1999', isNew: true, region: 'seoul',
  usage: 'personal', vanSeats: '7-10', motorcycleSize: 'small', isMultiChild: false, childCount: 0, isDisabled: false, isVeteran: false,
}
// 예시 — 가격대(부가세 제외)·배기량·차종만, 특정 모델 아님. 라벨 = u.presets.items 순서
const PRESETS: Pick<Form, 'carPrice' | 'carType' | 'fuelType' | 'displacement'>[] = [
  { carPrice: 14_000_000, carType: 'compact', fuelType: 'gasoline', displacement: '998' },
  { carPrice: 25_000_000, carType: 'passenger', fuelType: 'gasoline', displacement: '1598' },
  { carPrice: 32_000_000, carType: 'passenger', fuelType: 'gasoline', displacement: '1999' },
  { carPrice: 38_000_000, carType: 'passenger', fuelType: 'hybrid', displacement: '1598' },
  { carPrice: 45_000_000, carType: 'passenger', fuelType: 'gasoline', displacement: '2497' },
  { carPrice: 50_000_000, carType: 'passenger', fuelType: 'electric', displacement: '' },
]

const noSub = () => () => {}
const won = (n: number) => Math.round(n).toLocaleString('ko-KR')
const oneOf = <T,>(v: unknown, list: readonly T[], def: T): T => (list.includes(v as T) ? (v as T) : def)

/** URL 쿼리(또는 히스토리 입력값) → 폼. 없는 값은 기본값 */
function fromQuery(sp: URLSearchParams): Form {
  const num = (k: string) => (/^\d+$/.test(sp.get(k) ?? '') ? Number(sp.get(k)) : null)
  const bool = (k: keyof Form) => (sp.has(k) ? sp.get(k) === 'true' : (DEF[k] as boolean))
  return {
    carPrice: Math.min(num('carPrice') ?? DEF.carPrice, MAX_PRICE),
    carType: oneOf(sp.get('carType'), CAR_TYPES, DEF.carType),
    fuelType: oneOf(sp.get('fuelType'), FUELS, DEF.fuelType),
    displacement: sp.has('displacement') ? String(Math.min(num('displacement') ?? 0, 99_999) || '') : DEF.displacement,
    isNew: bool('isNew'),
    region: oneOf(sp.get('region'), REGIONS, DEF.region),
    usage: oneOf(sp.get('usage'), ['personal', 'business'] as const, DEF.usage),
    vanSeats: oneOf(sp.get('vanSeats'), ['7-10', '11+'] as const, DEF.vanSeats),
    motorcycleSize: oneOf(sp.get('motorcycleSize'), ['small', 'large'] as const, DEF.motorcycleSize),
    isMultiChild: bool('isMultiChild'),
    childCount: Math.min(num('childCount') ?? 0, 3),
    isDisabled: bool('isDisabled'),
    isVeteran: bool('isVeteran'),
  }
}

function toQuery(f: Form): string {
  const q = new URLSearchParams()
  for (const k of Object.keys(DEF) as (keyof Form)[]) if (f[k] !== DEF[k]) q.set(k, String(f[k]))
  return q.toString()
}

export default function CarTaxCalculator() {
  const t = useTranslations('carTax')
  const sp = useSearchParams()
  const [f, setF] = useState<Form>(() => fromQuery(sp))
  const [saved, setSaved] = useState(false)
  const today = useSyncExternalStore(noSub, todayKST, () => null) // KST, 서버·하이드레이션은 null (첫 렌더 결정적)
  const { histories, saveCalculation, removeHistory, clearHistories, loadFromHistory } = useCalculationHistory('car-tax')
  const set = (p: Partial<Form>) => { setF((prev) => ({ ...prev, ...p })); setSaved(false) }

  useEffect(() => {
    const q = toQuery(f)
    if (q !== window.location.search.slice(1)) window.history.replaceState(null, '', `${q ? `?${q}` : window.location.pathname}${window.location.hash}`)
  }, [f])

  const disp = Number(f.displacement) || 0
  const input: CarAcqInput = {
    price: f.carPrice, carType: f.carType, usage: f.usage, vanSeats: f.vanSeats, motorcycleSize: f.motorcycleSize,
    electric: f.fuelType === 'electric', displacement: disp,
    children: f.isMultiChild ? f.childCount : 0, disabled: f.isDisabled || f.isVeteran,
  }
  const tax = carAcqTax(input)
  // ponytail: 도시철도채권(서울) 매입·즉시매도 부담은 기존 대략값(6% × 30%) 유지 — 매입률·할인율은 조례·시장에 따라 다름
  const bond = f.region === 'seoul' && f.carType !== 'motorcycle' && !bondExempt(input) ? Math.round(f.carPrice * 0.06 * 0.3) : 0
  const bondNote = f.carType === 'motorcycle' ? 'moto' : f.region !== 'seoul' ? 'region' : 'exempt'
  const license = f.carType === 'motorcycle' && f.motorcycleSize === 'large' ? 15_000 : 0
  const total = tax.tax + bond + license
  const benefitName = tax.benefitKey ? t(`u.benefit.${tax.benefitKey === 'disabled' && !f.isDisabled ? 'veteran' : tax.benefitKey}`) : ''
  const bondText = bond > 0 ? `${won(bond)}${t('u.won')}` : t(`u.row.bondNone.${bondNote}`)
  const summary = [
    `${won(f.carPrice)}${t('u.won')}`, t(`u.carType.${f.carType}`), t(`u.fuel.${f.fuelType}`),
    ...(disp ? [`${won(disp)}cc`] : []), t(f.isNew ? 'u.new' : 'u.used'),
  ].join(' · ')

  // 감면 일몰 안내: 전기차(2026.12.31), 비영업용 경차(2027.12.31)
  const seasons = (['electric', 'compact'] as const).filter((k) =>
    k === 'electric' ? input.electric && f.carType !== 'motorcycle' : f.carType === 'compact' && f.usage === 'personal')

  const save = () => {
    saveCalculation(
      { ...f, displacement: disp },
      {
        acquisitionTax: tax.tax, registrationTax: 0, railroadBond: bond, licenseRegistrationTax: license,
        totalTax: total, appliedBenefits: benefitName ? [benefitName] : [],
      },
    )
    setSaved(true)
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
          <p className="text-sm text-muted mt-1">{t('description')}</p>
        </div>
        <CalculationHistory
          histories={histories}
          isLoading={false}
          onLoadHistory={(id) => {
            const x = loadFromHistory(id)
            if (x) set(fromQuery(new URLSearchParams(Object.entries(x).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]))))
          }}
          onRemoveHistory={removeHistory}
          onClearHistories={clearHistories}
          formatResult={(r: Record<string, unknown>) => {
            const n = Number(r.totalTax) || 0
            return n ? t('u.history.total', { amount: won(n) }) : t('u.history.none')
          }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <div className="lg:col-span-1">
          <div className="ui-card p-6 space-y-5">
            {f.carPrice > 0 && <MobileResultLink href="#car-tax-calculator-result" label={t('u.result.label')} value={`${won(total)}${t('u.won')}`} />}
            <div>
              <label htmlFor="ct-price" className="block text-sm font-medium text-body mb-2">{t('u.price')}</label>
              <div className="relative">
                <input
                  id="ct-price" type="text" inputMode="numeric" value={f.carPrice ? won(f.carPrice) : ''}
                  onChange={(e) => set({ carPrice: Math.min(Number(e.target.value.replace(/[^\d]/g, '')) || 0, MAX_PRICE) })}
                  className="ui-field w-full px-4 py-3 pr-14 text-lg tabular-nums"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">{t('u.won')}</span>
              </div>
              <p className="text-xs text-muted mt-1.5">{t('u.priceHint')}</p>
              <div className="flex flex-wrap items-center gap-1.5 mt-3" role="group" aria-label={t('u.presets.label')}>
                <span className="text-xs font-medium text-sub mr-0.5">{t('u.presets.label')}</span>
                {(t.raw('u.presets.items') as string[]).map((label, i) => {
                  const p = PRESETS[i]
                  const on = p.carPrice === f.carPrice && p.carType === f.carType && p.fuelType === f.fuelType && p.displacement === f.displacement
                  return (
                    <button
                      key={label} type="button" onClick={() => set(p)} aria-pressed={on}
                      className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-faint mt-1.5">{t('u.presets.note')}</p>
            </div>

            <Choice label={t('u.carType.label')} options={CAR_TYPES} value={f.carType} onChange={(carType) => set({ carType })} text={(v) => t(`u.carType.${v}`)} cols="grid-cols-3" />
            {f.carType === 'van' && (
              <Choice label={t('u.vanSeats.label')} options={['7-10', '11+'] as const} value={f.vanSeats} onChange={(vanSeats) => set({ vanSeats })} text={(v) => t(`u.vanSeats.${v === '7-10' ? 'small' : 'large'}`)} />
            )}
            {f.carType === 'motorcycle' && (
              <Choice label={t('u.motoSize.label')} options={['small', 'large'] as const} value={f.motorcycleSize} onChange={(motorcycleSize) => set({ motorcycleSize })} text={(v) => t(`u.motoSize.${v}`)} />
            )}
            <Choice label={t('u.fuel.label')} options={FUELS} value={f.fuelType} onChange={(fuelType) => set({ fuelType })} text={(v) => t(`u.fuel.${v}`)} cols="grid-cols-3" />

            <div>
              <label htmlFor="ct-cc" className="block text-sm font-medium text-body mb-2">{t('u.cc')}</label>
              <div className="relative">
                <input
                  id="ct-cc" type="text" inputMode="numeric" value={f.displacement} placeholder="1999"
                  onChange={(e) => set({ displacement: e.target.value.replace(/[^\d]/g, '').slice(0, 5) })}
                  className="ui-field w-full px-4 py-3 pr-12 tabular-nums"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">cc</span>
              </div>
              <p className="text-xs text-muted mt-1.5">{t('u.ccHint')}</p>
            </div>

            <Choice label={t('u.usage.label')} options={['personal', 'business'] as const} value={f.usage} onChange={(usage) => set({ usage })} text={(v) => t(`u.usage.${v}`)} />
            <Choice label={t('u.status')} options={['new', 'used'] as const} value={f.isNew ? 'new' : 'used'} onChange={(v) => set({ isNew: v === 'new' })} text={(v) => t(`u.${v}`)} />

            <div>
              <label htmlFor="ct-region" className="block text-sm font-medium text-body mb-2">{t('u.region.label')}</label>
              <select id="ct-region" value={f.region} onChange={(e) => set({ region: e.target.value as Region })} className="ui-field w-full px-4 py-3">
                {REGIONS.map((r) => <option key={r} value={r}>{t(`u.region.${r}`)}</option>)}
              </select>
              <p className="text-xs text-muted mt-1.5">{t('u.region.hint')}</p>
            </div>

            <fieldset className="border-t border-line pt-5 space-y-3">
              <legend className="text-sm font-semibold text-fg mb-3">{t('u.relief.title')}</legend>
              <CheckItem label={t('u.relief.multiChild')} checked={f.isMultiChild} onChange={(v) => set({ isMultiChild: v, childCount: v && f.childCount < 2 ? 2 : f.childCount })} />
              {f.isMultiChild && (
                <div className="pl-6">
                  <Choice label={t('u.relief.children')} options={[2, 3] as const} value={f.childCount >= 3 ? 3 : 2} onChange={(childCount) => set({ childCount })} text={(v) => t(`u.relief.child${v}`)} cols="grid-cols-1" />
                </div>
              )}
              <CheckItem label={t('u.relief.disabled')} checked={f.isDisabled} onChange={(isDisabled) => set({ isDisabled })} />
              <CheckItem label={t('u.relief.veteran')} checked={f.isVeteran} onChange={(isVeteran) => set({ isVeteran })} />
              <p className="text-xs text-muted">{t('u.relief.note')}</p>
            </fieldset>
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 space-y-6">
          {f.carPrice > 0 ? (
            <div id="car-tax-calculator-result" className="ui-card p-6 space-y-5 scroll-mt-20" aria-live="polite">
              <div>
                <p className="text-sm text-muted">{t('u.result.label')}</p>
                <p className="text-3xl font-bold text-fg tabular-nums mt-1">{won(total)}{t('u.won')}</p>
                <p className="text-sm text-sub mt-1">{summary}</p>
              </div>

              <div className="divide-y divide-line border-y border-line text-sm">
                <Row label={t('u.row.gross', { rate: Math.round(tax.rate * 100) })} value={`${won(tax.gross)}${t('u.won')}`} />
                {tax.benefit > 0 && <Row label={t('u.row.relief', { name: benefitName })} value={`-${won(tax.benefit)}${t('u.won')}`} accent />}
                <Row label={t('u.row.acq')} value={`${won(tax.tax)}${t('u.won')}`} strong />
                <Row label={t('u.row.bond')} value={bondText} />
                {license > 0 && <Row label={t('u.row.license')} value={`${won(license)}${t('u.won')}`} />}
                <Row label={t('u.row.withPrice')} value={`${won(f.carPrice + total)}${t('u.won')}`} strong />
              </div>

              {tax.disabledBlocked && <p className="bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm">{t('u.disabledBlocked')}</p>}
              {f.fuelType === 'hybrid' && <p className="bg-subtle rounded-2xl p-4 text-sm text-sub">{t('u.hybridNote')}</p>}
              <p className="text-xs text-faint">{t('basis')}</p>

              <ShareResult
                card={{
                  tool: t('title'),
                  label: t('u.result.label'),
                  headline: `${won(total)}${t('u.won')}`,
                  sub: summary,
                  rows: [
                    { label: t('u.share.acq'), value: `${won(tax.tax)}${t('u.won')}` },
                    { label: t('u.share.relief'), value: tax.benefit > 0 ? `-${won(tax.benefit)}${t('u.won')}` : t('u.share.none') },
                    { label: t('u.share.bond'), value: bondText },
                  ],
                }}
                text={t('u.share.text', { price: won(f.carPrice), total: won(total) })}
                fileName="car-tax"
              />
              <button type="button" onClick={save} disabled={saved} className="ui-btn-soft px-4 py-2 text-sm inline-flex items-center gap-2 disabled:opacity-60">
                {saved ? <Check className="w-4 h-4" aria-hidden /> : <Save className="w-4 h-4" aria-hidden />}
                {t(saved ? 'u.saved' : 'u.save')}
              </button>
            </div>
          ) : (
            <div className="ui-card p-6 text-center text-sub">{t('u.empty')}</div>
          )}

          {f.carPrice > 0 && seasons.map((k) => {
            const days = today ? daysBetween(today, RELIEF_END[k]) : null
            const stake = reliefAtStake(input, k)
            const ended = days !== null && days < 0
            return (
              <div key={k} className="ui-card p-6 space-y-2" role="note">
                <div className="flex flex-wrap items-center gap-2">
                  {days !== null && (
                    <span className="rounded-lg bg-primary text-white px-2 py-0.5 text-xs font-bold tabular-nums">
                      {ended ? t('u.season.endedBadge') : ddayLabel(days)}
                    </span>
                  )}
                  <h2 className="font-semibold text-fg">{t(`u.season.${k}.title`)}</h2>
                </div>
                {stake > 0 && !ended && (
                  <p className="text-sm text-muted">
                    {t('u.season.stakeLabel')}
                    <span className="block text-2xl font-bold text-primary tabular-nums mt-0.5">{won(stake)}{t('u.won')}</span>
                  </p>
                )}
                <p className="text-sm text-sub">{t(`u.season.${k}.${ended ? 'ended' : stake > 0 ? 'stake' : 'noStake'}`)}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* 취등록세 안내 */}
      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('u.info.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(['taxes', 'reliefs'] as const).map((sec) => (
            <div key={sec}>
              <h3 className="font-semibold text-fg mb-3">{t(`u.info.${sec}.title`)}</h3>
              <ul className="space-y-2 text-sm text-sub">
                {(t.raw(`u.info.${sec}.items`) as string[][]).map(([k, v]) => (
                  <li key={k}><span className="font-medium text-body">{k}</span> — {v}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <Link href="/annual-car-tax/" className="ui-btn-soft inline-block px-4 py-2 text-sm">{t('u.info.annualLink')}</Link>
      </div>

      <GuideSection namespace="carTax" />
    </div>
  )
}

function Choice<T extends string | number>({ label, options, value, onChange, text, cols = 'grid-cols-2' }: {
  label: string; options: readonly T[]; value: T; onChange: (v: T) => void; text: (v: T) => string; cols?: string
}) {
  return (
    <div role="group" aria-label={label}>
      <p className="text-sm font-medium text-body mb-2">{label}</p>
      <div className={`grid ${cols} gap-2`}>
        {options.map((o) => (
          <button
            key={o} type="button" onClick={() => onChange(o)} aria-pressed={value === o}
            className={`px-2 py-2 rounded-lg text-sm font-medium transition-colors ${value === o ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}
          >
            {text(o)}
          </button>
        ))}
      </div>
    </div>
  )
}

function CheckItem({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-2 text-sm text-body cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[var(--primary)]" />
      <span>{label}</span>
    </label>
  )
}

function Row({ label, value, strong, accent }: { label: string; value: string; strong?: boolean; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="text-body">{label}</span>
      <span className={`tabular-nums text-right ${accent ? 'text-primary font-medium' : strong ? 'font-semibold text-fg' : 'text-sub'}`}>{value}</span>
    </div>
  )
}
